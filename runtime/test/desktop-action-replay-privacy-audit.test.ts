import { describe, expect, it } from "vitest";

import {
  buildDesktopActionReplayPrivacyAudit,
  summarizeDesktopActionReplayPrivacyAudit
} from "../src/desktop/index.js";

function baseInput() {
  return {
    observerEventSummary: {
      evidenceRefId: "desktop-evidence-replay"
    },
    actionProposalEventSummary: {
      proposalId: "desktop-action-proposal-replay"
    },
    approvalReceiptSummary: {
      approvalReceiptId: "approval-receipt-replay"
    },
    executionResultSummary: {
      executionResultId: "execution-result-replay"
    },
    recoverySummary: {
      recoveryId: "desktop-recovery-summary"
    },
    requiresRecoverySummary: true
  };
}

function expectReadinessFalse(
  report: ReturnType<typeof buildDesktopActionReplayPrivacyAudit>
) {
  expect(report.readiness.canReplayExecuteAction).toBe(false);
  expect(report.readiness.canExecuteDesktopAction).toBe(false);
  expect(report.readiness.canClick).toBe(false);
  expect(report.readiness.canType).toBe(false);
  expect(report.readiness.canWriteClipboard).toBe(false);
  expect(report.readiness.canOpenFileDialog).toBe(false);
  expect(report.readiness.canWriteEventStore).toBe(false);
  expect(report.readiness.canUseNativeBridge).toBe(false);
  expect(report.readiness.appCanExecute).toBe(false);
}

describe("desktop action replay privacy audit", () => {
  it("passes a complete summary-only replay chain", () => {
    const report = buildDesktopActionReplayPrivacyAudit(baseInput());

    expect(report.status).toBe("replay_ready");
    expect(report.missingEventRefs).toEqual([]);
    expect(report.privacyLeakCounts.rawFieldCount).toBe(0);
    expect(report.redactionSummary.summaryOnly).toBe(true);
    expect(report.redactionSummary.replayCanReexecute).toBe(false);
    expect(report.readiness.canReplayForAudit).toBe(true);
    expectReadinessFalse(report);
  });

  it("blocks missing observer evidence ref", () => {
    const report = buildDesktopActionReplayPrivacyAudit({
      ...baseInput(),
      observerEventSummary: {}
    });

    expect(report.status).toBe("blocked");
    expect(report.blockerCodes).toContain("MISSING_OBSERVER_EVIDENCE_REF");
    expect(report.missingEventRefs.map((item) => item.kind)).toContain(
      "observer_evidence_ref"
    );
  });

  it("blocks missing proposal id and execution result", () => {
    const report = buildDesktopActionReplayPrivacyAudit({
      ...baseInput(),
      actionProposalEventSummary: {},
      executionResultSummary: undefined
    });

    expect(report.status).toBe("blocked");
    expect(report.blockerCodes).toContain("MISSING_ACTION_PROPOSAL_ID");
    expect(report.blockerCodes).toContain("MISSING_EXECUTION_RESULT_SUMMARY");
  });

  it("blocks missing recovery summary when mismatch or interruption requires it", () => {
    const report = buildDesktopActionReplayPrivacyAudit({
      ...baseInput(),
      recoverySummary: undefined,
      recoveryReason: "interruption"
    });

    expect(report.status).toBe("blocked");
    expect(report.blockerCodes).toContain("MISSING_RECOVERY_SUMMARY");
  });

  it("blocks raw screenshot OCR target text clipboard and API key markers", () => {
    const report = buildDesktopActionReplayPrivacyAudit({
      ...baseInput(),
      rawScreenshot: "RAW_SCREENSHOT",
      rawOcr: "RAW_OCR",
      rawTargetText: "RAW_TARGET_TEXT",
      rawClipboard: "RAW_CLIPBOARD",
      note: "PASSWORD_VALUE_MARKER"
    });

    expect(report.status).toBe("blocked");
    expect(report.privacyLeakCounts.rawScreenshotCount).toBeGreaterThan(0);
    expect(report.privacyLeakCounts.rawOcrCount).toBeGreaterThan(0);
    expect(report.privacyLeakCounts.rawTargetTextCount).toBeGreaterThan(0);
    expect(report.privacyLeakCounts.rawClipboardCount).toBeGreaterThan(0);
    expect(report.privacyLeakCounts.apiKeyMarkerCount).toBeGreaterThan(0);
    expect(report.redactionSummary.privacyLeakDetected).toBe(true);
    expect(report.redactionSummary.apiKeyLeakDetected).toBe(true);
  });

  it("blocks replay re-execution attempts", () => {
    const report = buildDesktopActionReplayPrivacyAudit({
      ...baseInput(),
      readiness: {
        canReplayExecuteAction: true,
        canClick: true
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.blockerCodes).toContain("REPLAY_EXECUTION_FLAG_TRUE");
    expectReadinessFalse(report);
  });

  it("returns summary-only output without raw privacy content", () => {
    const report = buildDesktopActionReplayPrivacyAudit(
      JSON.stringify(baseInput())
    );
    const summary = summarizeDesktopActionReplayPrivacyAudit(report);
    const serialized = JSON.stringify(summary);

    expect(summary.status).toBe("replay_ready");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("RAW_OCR");
    expect(serialized).not.toContain("RAW_TARGET_TEXT");
    expect(serialized).not.toContain("RAW_CLIPBOARD");
    expect(serialized).not.toContain("DEEPSEEK_API_KEY");
    expectReadinessFalse(report);
  });
});
