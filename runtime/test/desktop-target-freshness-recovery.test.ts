import { describe, expect, it } from "vitest";

import {
  buildDesktopTargetFreshnessRecoveryReport,
  summarizeDesktopTargetFreshnessRecoveryReport
} from "../src/desktop/index.js";

function baseInput() {
  return {
    actionId: "desktop-action-open-settings",
    proposalId: "desktop-proposal-freshness",
    observerEvidenceSummary: {
      evidenceRefId: "desktop-evidence-freshness",
      observedAt: "2026-07-04T10:00:00.000Z",
      windowIdHash: "window_hash",
      appIdHash: "app_hash",
      titleHash: "title_hash",
      boundsHash: "bounds_hash",
      displayIdHash: "display_hash",
      monitorTopologyHash: "monitor_hash",
      foregroundFocusHash: "focus_hash",
      screenshotMetadataHash: "screenshot_meta_hash",
      targetMetadataHash: "target_meta_hash"
    },
    currentTargetSummary: {
      capturedAt: "2026-07-04T10:01:00.000Z",
      windowIdHash: "window_hash",
      appIdHash: "app_hash",
      titleHash: "title_hash",
      boundsHash: "bounds_hash",
      displayIdHash: "display_hash",
      monitorTopologyHash: "monitor_hash",
      foregroundFocusHash: "focus_hash",
      screenshotMetadataHash: "screenshot_meta_hash",
      targetMetadataHash: "target_meta_hash",
      focusState: "focused"
    },
    actionProposalTargetSummary: {
      targetId: "target-settings-button",
      windowIdHash: "window_hash",
      appIdHash: "app_hash",
      titleHash: "title_hash",
      boundsHash: "bounds_hash",
      displayIdHash: "display_hash",
      monitorTopologyHash: "monitor_hash",
      foregroundFocusHash: "focus_hash",
      targetMetadataHash: "target_meta_hash"
    },
    staleThresholdMs: 5 * 60 * 1000
  };
}

function expectReadinessFalse(
  report: ReturnType<typeof buildDesktopTargetFreshnessRecoveryReport>
) {
  expect(report.readiness.canUseFreshnessForExecution).toBe(false);
  expect(report.readiness.canRetryDesktopAction).toBe(false);
  expect(report.readiness.canRefreshAutomatically).toBe(false);
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

describe("desktop target freshness recovery", () => {
  it("passes a fresh target without granting execution readiness", () => {
    const report = buildDesktopTargetFreshnessRecoveryReport(baseInput());

    expect(report.status).toBe("fresh");
    expect(report.blockerCount).toBe(0);
    expect(report.warningCount).toBe(0);
    expect(report.ageSummary.ageMs).toBe(60_000);
    expect(report.staleReasonCodes).toEqual([]);
    expect(report.recoveryRecommendation.kind).toBe("no_recovery_needed");
    expectReadinessFalse(report);
  });

  it("blocks a stale observation", () => {
    const report = buildDesktopTargetFreshnessRecoveryReport({
      ...baseInput(),
      currentTargetSummary: {
        ...baseInput().currentTargetSummary,
        capturedAt: "2026-07-04T10:06:01.000Z"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.staleReasonCodes).toContain("OBSERVATION_TOO_OLD");
    expect(report.blockerCodes).toContain("OBSERVATION_TOO_OLD");
    expect(report.recoveryRecommendation.kind).toBe("stop_and_reobserve");
    expectReadinessFalse(report);
  });

  it("blocks a window id mismatch", () => {
    const report = buildDesktopTargetFreshnessRecoveryReport({
      ...baseInput(),
      currentTargetSummary: {
        ...baseInput().currentTargetSummary,
        windowIdHash: "other_window_hash"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.staleReasonCodes).toContain("WINDOW_ID_MISMATCH");
    expect(report.hashComparisons).toContainEqual(
      expect.objectContaining({ kind: "window_id", status: "mismatch" })
    );
  });

  it("blocks an app mismatch", () => {
    const report = buildDesktopTargetFreshnessRecoveryReport({
      ...baseInput(),
      currentTargetSummary: {
        ...baseInput().currentTargetSummary,
        appIdHash: "other_app_hash"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.staleReasonCodes).toContain("APP_ID_MISMATCH");
    expect(report.blockerCodes).toContain("APP_ID_MISMATCH");
  });

  it("warns or blocks bounds drift depending on policy", () => {
    const warning = buildDesktopTargetFreshnessRecoveryReport({
      ...baseInput(),
      currentTargetSummary: {
        ...baseInput().currentTargetSummary,
        boundsHash: "other_bounds_hash"
      }
    });
    const blocked = buildDesktopTargetFreshnessRecoveryReport({
      ...baseInput(),
      boundsDriftPolicy: "block",
      currentTargetSummary: {
        ...baseInput().currentTargetSummary,
        boundsHash: "other_bounds_hash"
      }
    });

    expect(warning.status).toBe("warning");
    expect(warning.warningCodes).toContain("BOUNDS_HASH_MISMATCH");
    expect(blocked.status).toBe("blocked");
    expect(blocked.blockerCodes).toContain("BOUNDS_HASH_MISMATCH");
  });

  it("blocks focus mismatch", () => {
    const report = buildDesktopTargetFreshnessRecoveryReport({
      ...baseInput(),
      currentTargetSummary: {
        ...baseInput().currentTargetSummary,
        foregroundFocusHash: "other_focus_hash",
        focusState: "not_focused"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.staleReasonCodes).toContain("FOREGROUND_FOCUS_MISMATCH");
    expect(report.blockerCodes).toContain("FOREGROUND_FOCUS_MISMATCH");
  });

  it("blocks raw screenshot and OCR input", () => {
    const report = buildDesktopTargetFreshnessRecoveryReport({
      ...baseInput(),
      rawScreenshot: "RAW_SCREENSHOT",
      nested: {
        rawOcr: "RAW_OCR"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(report.blockerCodes).toContain("RAW_MARKER");
    expectReadinessFalse(report);
  });

  it("blocks secret markers", () => {
    const report = buildDesktopTargetFreshnessRecoveryReport({
      ...baseInput(),
      note: "PASSWORD_VALUE_MARKER"
    });

    expect(report.status).toBe("blocked");
    expect(report.blockerCodes).toContain("SECRET_MARKER");
  });

  it("returns summary-only output without raw screenshot OCR or API key", () => {
    const report = buildDesktopTargetFreshnessRecoveryReport(
      JSON.stringify(baseInput())
    );
    const summary = summarizeDesktopTargetFreshnessRecoveryReport(report);
    const serialized = JSON.stringify(summary);

    expect(summary.status).toBe("fresh");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("RAW_OCR");
    expect(serialized).not.toContain("DEEPSEEK_API_KEY");
    expect(serialized).not.toContain("apiKey");
    expectReadinessFalse(report);
  });
});
