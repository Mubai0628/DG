import { describe, expect, it } from "vitest";

import {
  buildDesktopActionMismatchRecoveryReport,
  summarizeDesktopActionMismatchRecoveryReport
} from "../src/desktop/index.js";

function baseInput() {
  return {
    observerEvidenceSummary: {
      evidenceRefId: "desktop-evidence-recovery",
      summary: "Summary-only observed target metadata.",
      observedAt: "2026-07-05T00:00:00.000Z"
    },
    desktopActionProposalSummary: {
      proposalId: "desktop-action-proposal-recovery",
      expectedVisibleEffectHash: "visible_effect_hash",
      summary: "Summary-only proposal."
    },
    approvalReceiptSummary: {
      approvalReceiptId: "approval-receipt-recovery",
      typedConfirmationMatched: true
    },
    executionResultSummary: {
      actionId: "desktop-action-result-recovery",
      proposalId: "desktop-action-proposal-recovery",
      resultStatus: "completed"
    },
    expectedTargetSummary: {
      windowIdHash: "window_hash",
      appIdHash: "app_hash",
      boundsHash: "bounds_hash",
      monitorTopologyHash: "monitor_hash"
    },
    observedAfterActionTargetSummary: {
      windowPresent: true,
      windowIdHash: "window_hash",
      appIdHash: "app_hash",
      boundsHash: "bounds_hash",
      monitorTopologyHash: "monitor_hash",
      focusState: "focused",
      visibleEffectHash: "visible_effect_hash"
    }
  };
}

function expectExecutionFlagsFalse(
  report: ReturnType<typeof buildDesktopActionMismatchRecoveryReport>
) {
  expect(report.readiness.canRetryDesktopAction).toBe(false);
  expect(report.readiness.canRunUndoAction).toBe(false);
  expect(report.readiness.canExecuteDesktopAction).toBe(false);
  expect(report.readiness.canClick).toBe(false);
  expect(report.readiness.canType).toBe(false);
  expect(report.readiness.canSelect).toBe(false);
  expect(report.readiness.canWriteClipboard).toBe(false);
  expect(report.readiness.canOpenFileDialog).toBe(false);
  expect(report.readiness.canReplayExecute).toBe(false);
  expect(report.readiness.canWriteEventStore).toBe(false);
  expect(report.readiness.canUseNativeBridge).toBe(false);
  expect(report.readiness.appCanExecute).toBe(false);
}

describe("desktop action mismatch recovery", () => {
  it("returns empty safely", () => {
    const report = buildDesktopActionMismatchRecoveryReport(undefined);

    expect(report.status).toBe("empty");
    expect(report.mismatchCount).toBe(0);
    expect(report.readiness.canEnterRecoveryReview).toBe(false);
    expectExecutionFlagsFalse(report);
  });

  it("passes with no mismatch", () => {
    const report = buildDesktopActionMismatchRecoveryReport(baseInput());

    expect(report.status).toBe("recovery_ready");
    expect(report.mismatchCount).toBe(0);
    expect(report.recommendations[0]?.kind).toBe("no_recovery_needed");
    expect(report.readiness.canEnterRecoveryReview).toBe(true);
    expectExecutionFlagsFalse(report);
  });

  it("blocks target window missing", () => {
    const report = buildDesktopActionMismatchRecoveryReport({
      ...baseInput(),
      observedAfterActionTargetSummary: {
        ...baseInput().observedAfterActionTargetSummary,
        windowPresent: false
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.mismatchKinds).toContain("target_window_missing");
    expect(report.blockerCodes).toContain("TARGET_WINDOW_MISSING");
    expectExecutionFlagsFalse(report);
  });

  it("blocks focus lost", () => {
    const report = buildDesktopActionMismatchRecoveryReport({
      ...baseInput(),
      observedAfterActionTargetSummary: {
        ...baseInput().observedAfterActionTargetSummary,
        focusState: "not_focused"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.mismatchKinds).toContain("focus_lost");
    expect(report.blockerCodes).toContain("FOCUS_LOST");
  });

  it("warns for bounds changed", () => {
    const report = buildDesktopActionMismatchRecoveryReport({
      ...baseInput(),
      observedAfterActionTargetSummary: {
        ...baseInput().observedAfterActionTargetSummary,
        boundsHash: "other_bounds_hash"
      }
    });

    expect(report.status).toBe("warning");
    expect(report.mismatchKinds).toContain("bounds_changed");
    expect(report.warningCodes).toContain("BOUNDS_CHANGED");
  });

  it("blocks screen topology changed", () => {
    const report = buildDesktopActionMismatchRecoveryReport({
      ...baseInput(),
      observedAfterActionTargetSummary: {
        ...baseInput().observedAfterActionTargetSummary,
        monitorTopologyHash: "other_monitor_hash"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.mismatchKinds).toContain("screen_topology_changed");
    expect(report.blockerCodes).toContain("SCREEN_TOPOLOGY_CHANGED");
  });

  it("blocks unsupported platform", () => {
    const report = buildDesktopActionMismatchRecoveryReport({
      ...baseInput(),
      executionResultSummary: {
        ...baseInput().executionResultSummary,
        platformStatus: "unsupported"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.mismatchKinds).toContain("unsupported_platform");
    expect(report.blockerCodes).toContain("UNSUPPORTED_PLATFORM");
  });

  it("blocks raw screenshot and OCR", () => {
    const report = buildDesktopActionMismatchRecoveryReport({
      ...baseInput(),
      rawScreenshot: "RAW_SCREENSHOT",
      observedAfterActionTargetSummary: {
        ...baseInput().observedAfterActionTargetSummary,
        rawOcrText: "RAW_OCR"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(report.blockerCodes).toContain("RAW_MARKER");
  });

  it("blocks API key markers", () => {
    const report = buildDesktopActionMismatchRecoveryReport({
      ...baseInput(),
      observerEvidenceSummary: {
        ...baseInput().observerEvidenceSummary,
        summary: "contains sk-obvious-fake-key"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.blockerCodes).toContain("SECRET_MARKER");
  });

  it("blocks execution readiness flags", () => {
    const report = buildDesktopActionMismatchRecoveryReport({
      ...baseInput(),
      readiness: {
        canRetryDesktopAction: true,
        canRunUndoAction: true
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.blockerCodes).toContain("EXECUTION_FLAG_TRUE");
    expectExecutionFlagsFalse(report);
  });

  it("returns summary-only output without raw content", () => {
    const report = buildDesktopActionMismatchRecoveryReport(
      JSON.stringify(baseInput())
    );
    const summary = summarizeDesktopActionMismatchRecoveryReport(report);
    const serialized = JSON.stringify(summary);

    expect(summary.status).toBe("recovery_ready");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("RAW_OCR");
    expect(serialized).not.toContain("apiKey");
    expectExecutionFlagsFalse(report);
  });
});
