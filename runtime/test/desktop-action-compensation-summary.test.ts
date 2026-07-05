import { describe, expect, it } from "vitest";

import {
  buildDesktopActionCompensationSummary,
  summarizeDesktopActionCompensationSummary
} from "../src/desktop/index.js";

function baseInput() {
  return {
    actionId: "desktop-action-compensation",
    proposalId: "desktop-proposal-compensation",
    interruptionRecoveryId: "interruption-recovery-summary",
    mismatchRecoveryId: "mismatch-recovery-summary",
    manualReviewRequired: true
  };
}

function expectReadinessFalse(
  report: ReturnType<typeof buildDesktopActionCompensationSummary>
) {
  expect(report.readiness.canRunUndoAction).toBe(false);
  expect(report.readiness.canRunCompensatingAction).toBe(false);
  expect(report.readiness.canRefocusWindow).toBe(false);
  expect(report.readiness.canRestoreSelection).toBe(false);
  expect(report.readiness.canClearTextInput).toBe(false);
  expect(report.readiness.canApplyPatch).toBe(false);
  expect(report.readiness.canRollback).toBe(false);
  expect(report.readiness.canExecuteDesktopAction).toBe(false);
  expect(report.readiness.canClick).toBe(false);
  expect(report.readiness.canType).toBe(false);
  expect(report.readiness.canWriteClipboard).toBe(false);
  expect(report.readiness.canOpenFileDialog).toBe(false);
  expect(report.readiness.canReplayExecute).toBe(false);
  expect(report.readiness.canWriteEventStore).toBe(false);
  expect(report.readiness.canUseNativeBridge).toBe(false);
  expect(report.readiness.appCanExecute).toBe(false);
}

describe("desktop action compensation summary", () => {
  it("summarizes no safe undo without enabling undo", () => {
    const report = buildDesktopActionCompensationSummary({
      ...baseInput(),
      compensationKinds: ["no_safe_undo"]
    });

    expect(report.status).toBe("warning");
    expect(report.warningCodes).toContain("NO_SAFE_UNDO");
    expect(report.compensationItems[0]?.requiresManualReview).toBe(true);
    expect(report.compensationItems[0]?.summaryOnly).toBe(true);
    expectReadinessFalse(report);
  });

  it("summarizes refocus previous window as proposal only", () => {
    const report = buildDesktopActionCompensationSummary({
      ...baseInput(),
      compensationKinds: ["refocus_previous_window"]
    });

    expect(report.status).toBe("summary_ready");
    expect(report.compensationItems[0]).toEqual(
      expect.objectContaining({
        kind: "refocus_previous_window",
        riskLevel: "low",
        summaryOnly: true
      })
    );
    expect(report.readiness.canRefocusWindow).toBe(false);
  });

  it("summarizes clear pending text input as proposal only", () => {
    const report = buildDesktopActionCompensationSummary({
      ...baseInput(),
      compensationKinds: ["clear_pending_text_input"]
    });

    expect(report.status).toBe("summary_ready");
    expect(report.compensationItems[0]).toEqual(
      expect.objectContaining({
        kind: "clear_pending_text_input",
        riskLevel: "low",
        summaryOnly: true
      })
    );
    expect(report.readiness.canClearTextInput).toBe(false);
  });

  it("requires manual review for manual review compensation", () => {
    const report = buildDesktopActionCompensationSummary({
      ...baseInput(),
      compensationKinds: ["manual_user_review_required"]
    });

    expect(report.status).toBe("summary_ready");
    expect(report.compensationItems[0]?.requiresManualReview).toBe(true);
    expect(report.compensationItems[0]?.riskLevel).toBe("high");
  });

  it("keeps linked workspace rollback summary only", () => {
    const report = buildDesktopActionCompensationSummary({
      ...baseInput(),
      compensationKinds: ["rollback_workspace_action_if_linked"]
    });

    expect(report.status).toBe("warning");
    expect(report.warningCodes).toContain("WORKSPACE_ROLLBACK_SUMMARY_ONLY");
    expect(report.compensationItems[0]?.summary).toContain(
      "do not execute rollback here"
    );
    expect(report.readiness.canRollback).toBe(false);
    expect(report.readiness.canApplyPatch).toBe(false);
  });

  it("blocks raw and secret inputs", () => {
    const report = buildDesktopActionCompensationSummary({
      ...baseInput(),
      compensationKinds: ["refocus_previous_window"],
      rawScreenshot: "RAW_SCREENSHOT",
      nested: {
        rawOcr: "RAW_OCR",
        note: "PASSWORD_VALUE_MARKER"
      },
      readiness: {
        canRunUndoAction: true,
        canRollback: true
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
    const report = buildDesktopActionCompensationSummary(
      JSON.stringify({
        ...baseInput(),
        compensationKinds: [
          "refocus_previous_window",
          "restore_previous_selection"
        ]
      })
    );
    const summary = summarizeDesktopActionCompensationSummary(report);
    const serialized = JSON.stringify(summary);

    expect(summary.status).toBe("summary_ready");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("RAW_OCR");
    expect(serialized).not.toContain("DEEPSEEK_API_KEY");
    expect(serialized).not.toContain("apiKey");
    expectReadinessFalse(report);
  });
});
