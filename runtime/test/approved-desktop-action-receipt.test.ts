import { describe, expect, it } from "vitest";

import {
  buildApprovedDesktopActionReceipt,
  summarizeApprovedDesktopActionReceipt,
  validateApprovedDesktopActionReceipt,
  type ApprovedDesktopActionKind,
  type ApprovedDesktopActionReceipt,
  type ApprovedDesktopActionReceiptInput
} from "../src/desktop-action/index.js";

const confirmations: Record<ApprovedDesktopActionKind, string> = {
  focus_observed_window: "FOCUS OBSERVED WINDOW",
  raise_observed_window: "RAISE OBSERVED WINDOW",
  activate_observed_window: "ACTIVATE OBSERVED WINDOW"
};

function safeInput(
  actionKind: ApprovedDesktopActionKind = "focus_observed_window",
  overrides: Partial<ApprovedDesktopActionReceiptInput> = {}
): ApprovedDesktopActionReceiptInput {
  return {
    scope: {
      actionKind,
      observerEvidenceId: "desktop-observer-evidence-1",
      desktopActionProposalId: "desktop-action-proposal-1",
      targetWindowRef: "window-hash-editor",
      targetAppRef: "app-hash-editor",
      targetDisplayRef: "display-hash-primary",
      riskClassificationId: "desktop-action-risk-1",
      allowedActionKinds: [actionKind],
      expiresAt: "2026-01-01T00:05:00.000Z",
      typedConfirmation: confirmations[actionKind]
    },
    observerEvidenceObservedAt: "2026-01-01T00:00:30.000Z",
    createdAt: "2026-01-01T00:01:00.000Z",
    idGenerator: () => `receipt-${actionKind}`,
    ...overrides
  };
}

function codes(receipt: ApprovedDesktopActionReceipt): string[] {
  return receipt.findings.map((finding) => finding.code);
}

function expectExecutionFlagsFalse(
  receipt: Pick<ApprovedDesktopActionReceipt, "readiness">
): void {
  expect(receipt.readiness.canExecuteDesktopAction).toBe(false);
  expect(receipt.readiness.canClick).toBe(false);
  expect(receipt.readiness.canType).toBe(false);
  expect(receipt.readiness.canSelect).toBe(false);
  expect(receipt.readiness.canDragDrop).toBe(false);
  expect(receipt.readiness.canUseClipboard).toBe(false);
  expect(receipt.readiness.canOpenFileDialog).toBe(false);
  expect(receipt.readiness.canWriteEventStore).toBe(false);
  expect(receipt.readiness.canUseNativeBridge).toBe(false);
  expect(receipt.readiness.canExecuteGit).toBe(false);
  expect(receipt.readiness.canExecuteShell).toBe(false);
  expect(receipt.readiness.appCanExecute).toBe(false);
}

describe("approved desktop action receipt", () => {
  it.each<ApprovedDesktopActionKind>([
    "focus_observed_window",
    "raise_observed_window",
    "activate_observed_window"
  ])("builds a valid %s receipt without broad execution", (actionKind) => {
    const receipt = buildApprovedDesktopActionReceipt(safeInput(actionKind));

    expect(receipt.status).toBe("ready");
    expect(receipt.actionKind).toBe(actionKind);
    expect(receipt.scope.allowedActionKinds).toEqual([actionKind]);
    expect(receipt.typedConfirmationAccepted).toBe(true);
    expect(receipt.blockerCount).toBe(0);
    expect(receipt.summaryOnly).toBe(true);
    expect(receipt.readiness.canEnterApprovedDesktopActionCommand).toBe(true);
    expect(summarizeApprovedDesktopActionReceipt(receipt)).toContain(
      "desktop_execution:false"
    );
    expectExecutionFlagsFalse(receipt);
  });

  it("blocks unsupported and broad action kinds", () => {
    const unsupported = buildApprovedDesktopActionReceipt(
      safeInput("focus_observed_window", {
        scope: {
          ...safeInput().scope,
          actionKind: "click_target" as never,
          allowedActionKinds: ["click_target" as never],
          typedConfirmation: "CLICK TARGET"
        }
      })
    );

    expect(unsupported.status).toBe("blocked");
    expect(codes(unsupported)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_UNSUPPORTED_ACTION"
    );
    expect(codes(unsupported)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_BROAD_ACTION_BLOCKED"
    );
    expect(codes(unsupported)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_ALLOWED_ACTION_UNSUPPORTED"
    );
    expectExecutionFlagsFalse(unsupported);
  });

  it("blocks expired receipts", () => {
    const validation = validateApprovedDesktopActionReceipt(
      safeInput("focus_observed_window", {
        scope: {
          ...safeInput().scope,
          expiresAt: "2025-12-31T23:59:00.000Z"
        }
      })
    );

    expect(validation.ok).toBe(false);
    expect(validation.status).toBe("blocked");
    expect(validation.findings.map((finding) => finding.code)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_EXPIRED"
    );
    expect(validation.readiness.canEnterApprovedDesktopActionCommand).toBe(
      false
    );
  });

  it("blocks wrong typed confirmation", () => {
    const receipt = buildApprovedDesktopActionReceipt(
      safeInput("raise_observed_window", {
        scope: {
          ...safeInput("raise_observed_window").scope,
          typedConfirmation: "RAISE WINDOW"
        }
      })
    );

    expect(receipt.status).toBe("blocked");
    expect(receipt.typedConfirmationAccepted).toBe(false);
    expect(codes(receipt)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_CONFIRMATION_MISMATCH"
    );
  });

  it("blocks stale evidence", () => {
    const receipt = buildApprovedDesktopActionReceipt(
      safeInput("activate_observed_window", {
        observerEvidenceObservedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:20:00.000Z",
        staleEvidenceThresholdMs: 60 * 1000
      })
    );

    expect(receipt.status).toBe("blocked");
    expect(codes(receipt)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_STALE_EVIDENCE"
    );
  });

  it("blocks sensitive targets that were not explicitly blocked upstream", () => {
    const receipt = buildApprovedDesktopActionReceipt(
      safeInput("focus_observed_window", {
        targetSensitiveKind: "password_manager_window"
      })
    );

    expect(receipt.status).toBe("blocked");
    expect(codes(receipt)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_SENSITIVE_TARGET_BLOCKED"
    );
  });

  it("blocks raw screenshot fields, API key markers, and readiness attempts", () => {
    const fakeKeyMarker = ["sk", "fake-desktop-receipt-marker"].join("-");
    const receipt = buildApprovedDesktopActionReceipt({
      ...safeInput(),
      scope: {
        ...safeInput().scope,
        rawScreenshot: "RAW_SCREENSHOT_BYTES",
        note: fakeKeyMarker,
        readiness: {
          canClick: true,
          canUseClipboard: true,
          appCanExecute: true
        }
      } as unknown as ApprovedDesktopActionReceiptInput["scope"]
    });
    const serialized = JSON.stringify(receipt);

    expect(receipt.status).toBe("blocked");
    expect(codes(receipt)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_FORBIDDEN_FIELD"
    );
    expect(codes(receipt)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_RAW_MARKER"
    );
    expect(codes(receipt)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_SECRET_MARKER"
    );
    expect(codes(receipt)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_EXECUTION_READINESS_TRUE"
    );
    expect(serialized).not.toContain("RAW_SCREENSHOT_BYTES");
    expect(serialized).not.toContain(fakeKeyMarker);
    expectExecutionFlagsFalse(receipt);
  });

  it("blocks missing target window and app refs", () => {
    const receipt = buildApprovedDesktopActionReceipt(
      safeInput("focus_observed_window", {
        scope: {
          ...safeInput().scope,
          targetWindowRef: "",
          targetAppRef: ""
        }
      })
    );

    expect(receipt.status).toBe("blocked");
    expect(codes(receipt)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_TARGET_WINDOW_MISSING"
    );
    expect(codes(receipt)).toContain(
      "APPROVED_DESKTOP_ACTION_RECEIPT_TARGET_APP_MISSING"
    );
  });

  it("keeps output summary-only", () => {
    const receipt = buildApprovedDesktopActionReceipt(safeInput());
    const serialized = JSON.stringify(receipt);

    expect(receipt.status).toBe("ready");
    expect(receipt.scope.receiptHash).toBe(receipt.receiptHash);
    expect(serialized).not.toContain("rawScreenshot");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("executeNow");
    expectExecutionFlagsFalse(receipt);
  });

  it("is deterministic with injected id and clock", () => {
    const first = buildApprovedDesktopActionReceipt(safeInput());
    const second = buildApprovedDesktopActionReceipt(safeInput());

    expect(first.receiptId).toBe(second.receiptId);
    expect(first.receiptHash).toBe(second.receiptHash);
  });
});
