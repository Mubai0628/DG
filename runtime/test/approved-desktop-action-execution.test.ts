import { describe, expect, it } from "vitest";

import {
  buildApprovedDesktopActionExecutionPlan,
  buildApprovedDesktopActionReceipt,
  summarizeApprovedDesktopActionExecutionResult,
  validateApprovedDesktopActionExecutionInput,
  type ApprovedDesktopActionExecutionInput,
  type ApprovedDesktopActionExecutionResult,
  type ApprovedDesktopActionKind,
  type ApprovedDesktopActionReceipt
} from "../src/desktop-action/index.js";

const confirmations: Record<ApprovedDesktopActionKind, string> = {
  focus_observed_window: "FOCUS OBSERVED WINDOW",
  raise_observed_window: "RAISE OBSERVED WINDOW",
  activate_observed_window: "ACTIVATE OBSERVED WINDOW"
};

function receiptFor(
  actionKind: ApprovedDesktopActionKind = "focus_observed_window"
): ApprovedDesktopActionReceipt {
  return buildApprovedDesktopActionReceipt({
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
    idGenerator: () => `receipt-${actionKind}`
  });
}

function safeInput(
  overrides: Partial<ApprovedDesktopActionExecutionInput> = {}
): ApprovedDesktopActionExecutionInput {
  const receipt = receiptFor();
  return {
    receipt,
    desktopActionProposalSummary: {
      proposalId: "desktop-action-proposal-1",
      actionKind: "focus_observed_window",
      targetWindowRef: "window-hash-editor",
      targetAppRef: "app-hash-editor",
      targetDisplayRef: "display-hash-primary",
      observerEvidenceId: "desktop-observer-evidence-1"
    },
    targetMetadata: {
      targetWindowRef: "window-hash-editor",
      targetAppRef: "app-hash-editor",
      targetDisplayRef: "display-hash-primary",
      observedAt: "2026-01-01T00:00:45.000Z"
    },
    observerEvidenceSummary: {
      observerEvidenceId: "desktop-observer-evidence-1",
      observedAt: "2026-01-01T00:00:30.000Z"
    },
    riskSummary: {
      riskClassificationId: "desktop-action-risk-1",
      actionKind: "focus_observed_window",
      riskLevel: "D1_LOW",
      sensitiveTargetBlocked: false
    },
    executionMode: "explicit_approved_desktop_action",
    createdAt: "2026-01-01T00:01:00.000Z",
    idGenerator: () => "approved-desktop-action-test-1",
    ...overrides
  };
}

function codes(result: ApprovedDesktopActionExecutionResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectExecutionFlagsFalse(
  result: Pick<ApprovedDesktopActionExecutionResult, "readiness">
): void {
  expect(result.readiness.canCallTauriCommand).toBe(false);
  expect(result.readiness.canExecuteDesktopAction).toBe(false);
  expect(result.readiness.canClick).toBe(false);
  expect(result.readiness.canType).toBe(false);
  expect(result.readiness.canSelect).toBe(false);
  expect(result.readiness.canDragDrop).toBe(false);
  expect(result.readiness.canUseClipboard).toBe(false);
  expect(result.readiness.canOpenFileDialog).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.canExecuteGit).toBe(false);
  expect(result.readiness.canExecuteShell).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("approved desktop action execution contract", () => {
  it("returns disabled mode safely without receipt or target refs", () => {
    const result = buildApprovedDesktopActionExecutionPlan({
      executionMode: "disabled",
      createdAt: "2026-01-01T00:01:00.000Z",
      idGenerator: () => "disabled-action"
    });

    expect(result.status).toBe("disabled");
    expect(result.blockerCount).toBe(0);
    expect(result.eventPreview.notWritten).toBe(true);
    expect(result.readiness.canEnterFixedDesktopActionCommand).toBe(false);
    expectExecutionFlagsFalse(result);
  });

  it("builds a dry-run summary without Tauri or event writes", () => {
    const result = buildApprovedDesktopActionExecutionPlan(
      safeInput({ executionMode: "dry_run" })
    );

    expect(result.status).toBe("dry_run");
    expect(result.eventPreview.wouldWriteSummaryEvent).toBe(false);
    expect(result.plannedOnly).toBe(true);
    expect(summarizeApprovedDesktopActionExecutionResult(result)).toContain(
      "tauri_call:false"
    );
    expectExecutionFlagsFalse(result);
  });

  it("builds an explicit approved desktop action plan", () => {
    const result = buildApprovedDesktopActionExecutionPlan(safeInput());

    expect(result.status).toBe("planned");
    expect(result.actionId).toBe("approved-desktop-action-test-1");
    expect(result.actionKind).toBe("focus_observed_window");
    expect(result.plan?.targetWindowRef).toBe("window-hash-editor");
    expect(result.plan?.summaryOnly).toBe(true);
    expect(result.eventPreview.rawMetadataIncluded).toBe(false);
    expect(result.readiness.canEnterFixedDesktopActionCommand).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it("blocks explicit mode without a ready receipt", () => {
    const result = buildApprovedDesktopActionExecutionPlan(
      safeInput({ receipt: undefined })
    );

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain(
      "APPROVED_DESKTOP_ACTION_EXECUTION_RECEIPT_MISSING"
    );
    expect(result.plan).toBeUndefined();
  });

  it("blocks mismatched target refs", () => {
    const result = buildApprovedDesktopActionExecutionPlan(
      safeInput({
        targetMetadata: {
          targetWindowRef: "window-hash-other",
          targetAppRef: "app-hash-editor",
          targetDisplayRef: "display-hash-primary",
          observedAt: "2026-01-01T00:00:45.000Z"
        }
      })
    );

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain(
      "APPROVED_DESKTOP_ACTION_EXECUTION_TARGET_MISMATCH"
    );
  });

  it("blocks stale target metadata", () => {
    const result = buildApprovedDesktopActionExecutionPlan(
      safeInput({
        targetMetadata: {
          targetWindowRef: "window-hash-editor",
          targetAppRef: "app-hash-editor",
          targetDisplayRef: "display-hash-primary",
          observedAt: "2026-01-01T00:00:00.000Z"
        },
        createdAt: "2026-01-01T00:30:00.000Z",
        staleTargetThresholdMs: 60 * 1000
      })
    );

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain(
      "APPROVED_DESKTOP_ACTION_EXECUTION_STALE_TARGET"
    );
  });

  it("blocks sensitive targets", () => {
    const result = buildApprovedDesktopActionExecutionPlan(
      safeInput({
        targetMetadata: {
          targetWindowRef: "window-hash-editor",
          targetAppRef: "app-hash-editor",
          targetDisplayRef: "display-hash-primary",
          observedAt: "2026-01-01T00:00:45.000Z",
          sensitiveKind: "password_window"
        },
        riskSummary: {
          riskClassificationId: "desktop-action-risk-1",
          actionKind: "focus_observed_window",
          riskLevel: "D5_BLOCKED",
          sensitiveTargetBlocked: false
        }
      })
    );

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain(
      "APPROVED_DESKTOP_ACTION_EXECUTION_SENSITIVE_TARGET_BLOCKED"
    );
  });

  it("blocks unsupported and broad action kinds", () => {
    const result = buildApprovedDesktopActionExecutionPlan({
      ...safeInput({ receipt: undefined }),
      desktopActionProposalSummary: {
        proposalId: "desktop-action-proposal-1",
        actionKind: "click_target",
        targetWindowRef: "window-hash-editor",
        targetAppRef: "app-hash-editor"
      },
      riskSummary: {
        riskClassificationId: "desktop-action-risk-1",
        actionKind: "click_target"
      }
    });

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain(
      "APPROVED_DESKTOP_ACTION_EXECUTION_UNSUPPORTED_ACTION"
    );
    expect(codes(result)).toContain(
      "APPROVED_DESKTOP_ACTION_EXECUTION_BROAD_ACTION_BLOCKED"
    );
  });

  it("blocks raw screenshot fields, API key markers, and event write attempts", () => {
    const fakeKeyMarker = ["sk", "fake-desktop-execution-marker"].join("-");
    const result = buildApprovedDesktopActionExecutionPlan({
      ...safeInput(),
      targetMetadata: {
        ...safeInput().targetMetadata,
        rawScreenshot: "RAW_SCREENSHOT_BYTES",
        note: fakeKeyMarker,
        readiness: {
          canCallTauriCommand: true,
          canClick: true,
          canWriteEventStore: true,
          appCanExecute: true
        },
        eventStoreWrite: true
      } as never
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain(
      "APPROVED_DESKTOP_ACTION_EXECUTION_FORBIDDEN_FIELD"
    );
    expect(codes(result)).toContain(
      "APPROVED_DESKTOP_ACTION_EXECUTION_RAW_MARKER"
    );
    expect(codes(result)).toContain(
      "APPROVED_DESKTOP_ACTION_EXECUTION_SECRET_MARKER"
    );
    expect(codes(result)).toContain(
      "APPROVED_DESKTOP_ACTION_EXECUTION_READINESS_TRUE"
    );
    expect(serialized).not.toContain("RAW_SCREENSHOT_BYTES");
    expect(serialized).not.toContain(fakeKeyMarker);
    expectExecutionFlagsFalse(result);
  });

  it("keeps event preview summary-only", () => {
    const result = buildApprovedDesktopActionExecutionPlan(safeInput());
    const serialized = JSON.stringify(result);

    expect(result.eventPreview).toMatchObject({
      notWritten: true,
      wouldWriteSummaryEvent: false,
      rawMetadataIncluded: false,
      rawDesktopCaptureIncluded: false,
      actionArgsIncluded: false
    });
    expect(serialized).not.toContain("rawScreenshot");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("eventStoreWrite");
    expectExecutionFlagsFalse(result);
  });

  it("validates input and keeps broad readiness false", () => {
    const validation = validateApprovedDesktopActionExecutionInput(safeInput());

    expect(validation.ok).toBe(true);
    expect(validation.status).toBe("planned");
    expect(validation.readiness.canEnterFixedDesktopActionCommand).toBe(true);
    expect(validation.readiness.canCallTauriCommand).toBe(false);
    expect(validation.readiness.canExecuteDesktopAction).toBe(false);
  });
});
