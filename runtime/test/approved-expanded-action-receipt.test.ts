import { describe, expect, it } from "vitest";

import {
  buildApprovedExpandedDesktopActionReceipt,
  summarizeApprovedExpandedDesktopActionReceipt,
  validateApprovedExpandedDesktopActionReceipt,
  type ApprovedExpandedDesktopActionKind,
  type ApprovedExpandedDesktopActionReceipt,
  type ApprovedExpandedDesktopActionReceiptInput
} from "../src/desktop-action/index.js";

const confirmations: Record<ApprovedExpandedDesktopActionKind, string> = {
  click_observed_safe_target: "CLICK OBSERVED TARGET",
  type_into_observed_text_field: "TYPE INTO OBSERVED FIELD"
};

function safeInput(
  actionKind: ApprovedExpandedDesktopActionKind = "click_observed_safe_target",
  overrides: Partial<ApprovedExpandedDesktopActionReceiptInput> = {}
): ApprovedExpandedDesktopActionReceiptInput {
  return {
    scope: {
      receiptId: `expanded-receipt-${actionKind}`,
      actionKind,
      observationId: "desktop-observation-1",
      targetId: "target-safe-primary",
      proposalId: "expanded-action-proposal-1",
      riskClassificationId: "expanded-risk-1",
      simulationId: "expanded-simulation-1",
      windowRef: "window-hash-editor",
      appRef: "app-hash-editor",
      displayRef: "display-hash-primary",
      targetHash: "target-hash-safe",
      allowedActionKinds: [actionKind],
      expiresAt: "2026-01-01T00:05:00.000Z",
      typedConfirmation: confirmations[actionKind],
      maxClicks: 1,
      ...(actionKind === "type_into_observed_text_field"
        ? { maxTextLength: 80 }
        : {})
    },
    observationObservedAt: "2026-01-01T00:00:30.000Z",
    createdAt: "2026-01-01T00:01:00.000Z",
    ...(actionKind === "type_into_observed_text_field"
      ? { textLength: 24 }
      : {}),
    ...overrides
  };
}

function codes(receipt: ApprovedExpandedDesktopActionReceipt): string[] {
  return receipt.findings.map((finding) => finding.code);
}

function expectExecutionFlagsFalse(
  receipt: Pick<ApprovedExpandedDesktopActionReceipt, "readiness">
): void {
  expect(receipt.readiness.canEnterFixedTauriCommand).toBe(false);
  expect(receipt.readiness.canExecuteDesktopAction).toBe(false);
  expect(receipt.readiness.canClick).toBe(false);
  expect(receipt.readiness.canType).toBe(false);
  expect(receipt.readiness.canSelect).toBe(false);
  expect(receipt.readiness.canDragDrop).toBe(false);
  expect(receipt.readiness.canWriteClipboard).toBe(false);
  expect(receipt.readiness.canOpenFileDialog).toBe(false);
  expect(receipt.readiness.canWriteEventStore).toBe(false);
  expect(receipt.readiness.canUseNativeBridge).toBe(false);
  expect(receipt.readiness.canExecuteGit).toBe(false);
  expect(receipt.readiness.canExecuteShell).toBe(false);
  expect(receipt.readiness.appCanExecute).toBe(false);
}

describe("approved expanded desktop action receipt", () => {
  it.each<ApprovedExpandedDesktopActionKind>([
    "click_observed_safe_target",
    "type_into_observed_text_field"
  ])("builds a valid %s receipt without broad execution", (actionKind) => {
    const receipt = buildApprovedExpandedDesktopActionReceipt(
      safeInput(actionKind)
    );

    expect(receipt.status).toBe("ready");
    expect(receipt.actionKind).toBe(actionKind);
    expect(receipt.scope.allowedActionKinds).toEqual([actionKind]);
    expect(receipt.typedConfirmationAccepted).toBe(true);
    expect(receipt.blockerCount).toBe(0);
    expect(receipt.summaryOnly).toBe(true);
    expect(receipt.readiness.canEnterSafeClickContract).toBe(
      actionKind === "click_observed_safe_target"
    );
    expect(receipt.readiness.canEnterSafeTypeContract).toBe(
      actionKind === "type_into_observed_text_field"
    );
    expect(summarizeApprovedExpandedDesktopActionReceipt(receipt)).toContain(
      "desktop_execution:false"
    );
    expectExecutionFlagsFalse(receipt);
  });

  it("blocks missing scope and unsupported action kinds", () => {
    const missingScope = buildApprovedExpandedDesktopActionReceipt({
      actionKind: "click_observed_safe_target"
    });
    const unsupported = buildApprovedExpandedDesktopActionReceipt(
      safeInput("click_observed_safe_target", {
        scope: {
          ...safeInput().scope,
          actionKind: "clipboard_write" as never,
          allowedActionKinds: ["clipboard_write" as never],
          typedConfirmation: "WRITE CLIPBOARD"
        }
      })
    );

    expect(missingScope.status).toBe("blocked");
    expect(codes(missingScope)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_SCOPE_MISSING"
    );
    expect(unsupported.status).toBe("blocked");
    expect(codes(unsupported)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_UNSUPPORTED_ACTION"
    );
    expect(codes(unsupported)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_ALLOWED_ACTION_UNSUPPORTED"
    );
    expectExecutionFlagsFalse(unsupported);
  });

  it("blocks expired receipts and wrong typed confirmations", () => {
    const expired = validateApprovedExpandedDesktopActionReceipt(
      safeInput("click_observed_safe_target", {
        scope: {
          ...safeInput().scope,
          expiresAt: "2025-12-31T23:59:00.000Z"
        }
      })
    );
    const wrongConfirmation = buildApprovedExpandedDesktopActionReceipt(
      safeInput("type_into_observed_text_field", {
        scope: {
          ...safeInput("type_into_observed_text_field").scope,
          typedConfirmation: "TYPE TEXT"
        }
      })
    );

    expect(expired.ok).toBe(false);
    expect(expired.status).toBe("blocked");
    expect(expired.findings.map((finding) => finding.code)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_EXPIRED"
    );
    expect(wrongConfirmation.status).toBe("blocked");
    expect(wrongConfirmation.typedConfirmationAccepted).toBe(false);
    expect(codes(wrongConfirmation)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_CONFIRMATION_MISMATCH"
    );
  });

  it("blocks stale observation and target mismatches", () => {
    const stale = buildApprovedExpandedDesktopActionReceipt(
      safeInput("click_observed_safe_target", {
        observationObservedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:20:00.000Z",
        staleObservationThresholdMs: 60 * 1000
      })
    );
    const mismatch = buildApprovedExpandedDesktopActionReceipt(
      safeInput("click_observed_safe_target", {
        currentWindowRef: "window-hash-other",
        currentAppRef: "app-hash-other",
        currentDisplayRef: "display-hash-other",
        currentTargetHash: "target-hash-other"
      })
    );

    expect(stale.status).toBe("blocked");
    expect(codes(stale)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_STALE_OBSERVATION"
    );
    expect(mismatch.status).toBe("blocked");
    expect(codes(mismatch)).toEqual(
      expect.arrayContaining([
        "APPROVED_EXPANDED_ACTION_RECEIPT_WINDOW_MISMATCH",
        "APPROVED_EXPANDED_ACTION_RECEIPT_APP_MISMATCH",
        "APPROVED_EXPANDED_ACTION_RECEIPT_DISPLAY_MISMATCH",
        "APPROVED_EXPANDED_ACTION_RECEIPT_TARGET_HASH_MISMATCH"
      ])
    );
  });

  it("blocks maxClicks, text length, and risky target fields", () => {
    const clickCount = buildApprovedExpandedDesktopActionReceipt(
      safeInput("click_observed_safe_target", {
        scope: {
          ...safeInput().scope,
          maxClicks: 2
        } as unknown as ApprovedExpandedDesktopActionReceiptInput["scope"]
      })
    );
    const longText = buildApprovedExpandedDesktopActionReceipt(
      safeInput("type_into_observed_text_field", {
        textLength: 100,
        scope: {
          ...safeInput("type_into_observed_text_field").scope,
          maxTextLength: 20
        }
      })
    );
    const risky = buildApprovedExpandedDesktopActionReceipt(
      safeInput("click_observed_safe_target", {
        targetSensitive: true,
        targetDestructive: true,
        targetPasswordLike: true,
        targetApiKeyLike: true,
        targetPaymentLike: true,
        targetSecurityPrompt: true
      })
    );

    expect(codes(clickCount)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_MAX_CLICKS_NOT_ONE"
    );
    expect(codes(longText)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_TEXT_TOO_LONG"
    );
    expect(codes(risky)).toEqual(
      expect.arrayContaining([
        "APPROVED_EXPANDED_ACTION_RECEIPT_SENSITIVE_TARGET",
        "APPROVED_EXPANDED_ACTION_RECEIPT_DESTRUCTIVE_TARGET",
        "APPROVED_EXPANDED_ACTION_RECEIPT_PASSWORD_FIELD",
        "APPROVED_EXPANDED_ACTION_RECEIPT_API_KEY_FIELD",
        "APPROVED_EXPANDED_ACTION_RECEIPT_PAYMENT_FIELD",
        "APPROVED_EXPANDED_ACTION_RECEIPT_SECURITY_PROMPT"
      ])
    );
  });

  it("blocks clipboard, file dialog, drag/drop, raw, secret, and execution fields", () => {
    const fakeKeyMarker = ["sk", "fake-expanded-receipt-marker"].join("-");
    const receipt = buildApprovedExpandedDesktopActionReceipt({
      ...safeInput(),
      scope: {
        ...safeInput().scope,
        rawScreenshot: "RAW_SCREENSHOT_BYTES",
        rawOcrText: "RAW_OCR",
        clipboardOperation: "write",
        openFileDialog: true,
        dragDropOperation: "drag",
        note: fakeKeyMarker,
        readiness: {
          canClick: true,
          canType: true,
          canWriteClipboard: true,
          appCanExecute: true
        }
      } as unknown as ApprovedExpandedDesktopActionReceiptInput["scope"]
    });
    const serialized = JSON.stringify(receipt);

    expect(receipt.status).toBe("blocked");
    expect(codes(receipt)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_FORBIDDEN_FIELD"
    );
    expect(codes(receipt)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_RAW_MARKER"
    );
    expect(codes(receipt)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_SECRET_MARKER"
    );
    expect(codes(receipt)).toContain(
      "APPROVED_EXPANDED_ACTION_RECEIPT_EXECUTION_READINESS_TRUE"
    );
    expect(serialized).not.toContain("RAW_SCREENSHOT_BYTES");
    expect(serialized).not.toContain("RAW_OCR");
    expect(serialized).not.toContain(fakeKeyMarker);
    expectExecutionFlagsFalse(receipt);
  });

  it("keeps output summary-only and deterministic", () => {
    const first = buildApprovedExpandedDesktopActionReceipt(
      safeInput("click_observed_safe_target")
    );
    const second = buildApprovedExpandedDesktopActionReceipt(
      safeInput("click_observed_safe_target")
    );
    const serialized = JSON.stringify(first);

    expect(first.status).toBe("ready");
    expect(first.scope.receiptHash).toBe(first.receiptHash);
    expect(first.receiptId).toBe(second.receiptId);
    expect(first.receiptHash).toBe(second.receiptHash);
    expect(serialized).not.toContain("rawScreenshot");
    expect(serialized).not.toContain("rawOcr");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("executeNow");
    expectExecutionFlagsFalse(first);
  });
});
