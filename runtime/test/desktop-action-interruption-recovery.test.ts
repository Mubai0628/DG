import { describe, expect, it } from "vitest";

import {
  buildDesktopActionInterruptionRecoveryReport,
  summarizeDesktopActionInterruptionRecoveryReport
} from "../src/desktop/index.js";

function baseInput() {
  return {
    actionId: "desktop-action-type-summary",
    proposalId: "desktop-proposal-interruption",
    approvalReceiptId: "approval-receipt-summary",
    evidenceRefId: "desktop-evidence-interruption",
    platformResultStatus: "known",
    beforeActionFocusState: "focused",
    afterActionFocusState: "focused",
    windowState: "visible",
    appState: "running",
    permissionState: "active",
    userInterrupted: false,
    timedOut: false,
    targetBecameSensitive: false,
    privacyBoundaryTriggered: false
  };
}

function expectReadinessFalse(
  report: ReturnType<typeof buildDesktopActionInterruptionRecoveryReport>
) {
  expect(report.readiness.canRetryDesktopAction).toBe(false);
  expect(report.readiness.canReplayExecute).toBe(false);
  expect(report.readiness.canExecuteDesktopAction).toBe(false);
  expect(report.readiness.canClick).toBe(false);
  expect(report.readiness.canType).toBe(false);
  expect(report.readiness.canSelect).toBe(false);
  expect(report.readiness.canWriteClipboard).toBe(false);
  expect(report.readiness.canOpenFileDialog).toBe(false);
  expect(report.readiness.canWriteEventStore).toBe(false);
  expect(report.readiness.canUseNativeBridge).toBe(false);
  expect(report.readiness.appCanExecute).toBe(false);
}

describe("desktop action interruption recovery", () => {
  it("summarizes no interruption without retry or execution readiness", () => {
    const report = buildDesktopActionInterruptionRecoveryReport(baseInput());

    expect(report.status).toBe("no_interruption");
    expect(report.interruptionKinds).toEqual([]);
    expect(report.noAutomaticRetry).toBe(true);
    expect(report.noReplayReexecution).toBe(true);
    expect(report.actionUncertaintySummary.level).toBe("none");
    expect(report.recommendations[0]?.kind).toBe("no_recovery_needed");
    expectReadinessFalse(report);
  });

  it("blocks focus lost before action", () => {
    const report = buildDesktopActionInterruptionRecoveryReport({
      ...baseInput(),
      beforeActionFocusState: "lost"
    });

    expect(report.status).toBe("blocked");
    expect(report.interruptionKinds).toContain("focus_lost_before_action");
    expect(report.blockerCodes).toContain("FOCUS_LOST_BEFORE_ACTION");
    expect(report.actionUncertaintySummary.focusKnown).toBe(false);
  });

  it("blocks focus lost after action", () => {
    const report = buildDesktopActionInterruptionRecoveryReport({
      ...baseInput(),
      afterActionFocusState: "lost"
    });

    expect(report.status).toBe("blocked");
    expect(report.interruptionKinds).toContain("focus_lost_after_action");
    expect(report.blockerCodes).toContain("FOCUS_LOST_AFTER_ACTION");
  });

  it("blocks timeout", () => {
    const report = buildDesktopActionInterruptionRecoveryReport({
      ...baseInput(),
      timedOut: true
    });

    expect(report.status).toBe("blocked");
    expect(report.interruptionKinds).toContain("timeout");
    expect(report.blockerCodes).toContain("TIMEOUT");
  });

  it("blocks window closed", () => {
    const report = buildDesktopActionInterruptionRecoveryReport({
      ...baseInput(),
      windowState: "closed"
    });

    expect(report.status).toBe("blocked");
    expect(report.interruptionKinds).toContain("window_closed");
    expect(report.actionUncertaintySummary.level).toBe("high");
  });

  it("blocks target became sensitive", () => {
    const report = buildDesktopActionInterruptionRecoveryReport({
      ...baseInput(),
      targetBecameSensitive: true
    });

    expect(report.status).toBe("blocked");
    expect(report.interruptionKinds).toContain("target_became_sensitive");
    expect(report.recommendations[0]?.kind).toBe("privacy_review");
  });

  it("blocks unknown platform result", () => {
    const report = buildDesktopActionInterruptionRecoveryReport({
      ...baseInput(),
      platformResultStatus: "unknown"
    });

    expect(report.status).toBe("blocked");
    expect(report.interruptionKinds).toContain("platform_result_unknown");
    expect(report.actionUncertaintySummary.resultKnown).toBe(false);
  });

  it("blocks raw and secret inputs", () => {
    const report = buildDesktopActionInterruptionRecoveryReport({
      ...baseInput(),
      rawScreenshot: "RAW_SCREENSHOT",
      nested: {
        rawOcr: "RAW_OCR",
        note: "PASSWORD_VALUE_MARKER"
      },
      readiness: {
        canRetryDesktopAction: true
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(report.blockerCodes).toContain("RAW_MARKER");
    expect(report.blockerCodes).toContain("SECRET_MARKER");
    expect(report.blockerCodes).toContain("EXECUTION_FLAG_TRUE");
    expectReadinessFalse(report);
  });

  it("returns summary-only output without raw evidence or API key", () => {
    const report = buildDesktopActionInterruptionRecoveryReport(
      JSON.stringify({
        ...baseInput(),
        interruptionKinds: ["user_interrupted"]
      })
    );
    const summary = summarizeDesktopActionInterruptionRecoveryReport(report);
    const serialized = JSON.stringify(summary);

    expect(summary.status).toBe("blocked");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("RAW_OCR");
    expect(serialized).not.toContain("DEEPSEEK_API_KEY");
    expect(serialized).not.toContain("apiKey");
    expectReadinessFalse(report);
  });
});
