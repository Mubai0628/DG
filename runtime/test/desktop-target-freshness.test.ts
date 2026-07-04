import { describe, expect, it } from "vitest";

import {
  summarizeDesktopTargetFreshness,
  validateDesktopTargetFreshness
} from "../src/desktop/index.js";

function baseInput() {
  return {
    observerEvidenceSummary: {
      evidenceRefId: "desktop-evidence-fresh",
      observedAt: "2026-07-04T10:00:00.000Z",
      summary: "Observed target metadata summary.",
      targetHash: "target_hash",
      windowIdHash: "window_hash",
      appIdHash: "app_hash",
      displayIdHash: "display_hash",
      boundsHash: "bounds_hash",
      labelSummary: "Open"
    },
    currentMetadataSummary: {
      capturedAt: "2026-07-04T10:01:00.000Z",
      summary: "Current target metadata summary.",
      targetHash: "target_hash",
      windowIdHash: "window_hash",
      appIdHash: "app_hash",
      displayIdHash: "display_hash",
      boundsHash: "bounds_hash",
      labelSummary: "Open",
      confidence: 0.93,
      windowState: "visible",
      focusState: "focused",
      monitorCount: 1
    },
    actionProposalTargetSummary: {
      targetId: "target-open-button",
      targetKind: "button",
      labelSummary: "Open",
      confidence: 0.93,
      targetHash: "target_hash",
      windowIdHash: "window_hash",
      appIdHash: "app_hash",
      displayIdHash: "display_hash",
      boundsHash: "bounds_hash"
    },
    freshnessThresholdMs: 5 * 60 * 1000,
    targetConfidenceThreshold: 0.75
  };
}

function expectExecutionFlagsFalse(
  result: ReturnType<typeof validateDesktopTargetFreshness>
) {
  expect(result.readiness.canExecuteDesktopAction).toBe(false);
  expect(result.readiness.canClick).toBe(false);
  expect(result.readiness.canType).toBe(false);
  expect(result.readiness.canSelect).toBe(false);
  expect(result.readiness.canWriteClipboard).toBe(false);
  expect(result.readiness.canOpenFileDialog).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("desktop target freshness checks", () => {
  it("passes a fresh target", () => {
    const result = validateDesktopTargetFreshness(baseInput());

    expect(result.status).toBe("fresh");
    expect(result.blockerCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.ageMs).toBe(60_000);
    expect(result.mismatchCounts.windowMismatchCount).toBe(0);
    expect(result.readiness.canEnterSequenceSimulation).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it("blocks stale evidence", () => {
    const result = validateDesktopTargetFreshness({
      ...baseInput(),
      currentMetadataSummary: {
        ...baseInput().currentMetadataSummary,
        capturedAt: "2026-07-04T10:30:01.000Z"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.blockerCodes).toContain("STALE_EVIDENCE");
    expect(result.readiness.canEnterSequenceSimulation).toBe(false);
    expectExecutionFlagsFalse(result);
  });

  it("blocks window mismatch", () => {
    const result = validateDesktopTargetFreshness({
      ...baseInput(),
      currentMetadataSummary: {
        ...baseInput().currentMetadataSummary,
        windowIdHash: "other_window_hash"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.blockerCodes).toContain("WINDOW_MISMATCH");
    expect(result.mismatchCounts.windowMismatchCount).toBe(1);
  });

  it("warns or blocks display mismatch depending on strict mode", () => {
    const warning = validateDesktopTargetFreshness({
      ...baseInput(),
      currentMetadataSummary: {
        ...baseInput().currentMetadataSummary,
        displayIdHash: "other_display_hash"
      }
    });
    const blocked = validateDesktopTargetFreshness({
      ...baseInput(),
      strictDisplayMatch: true,
      currentMetadataSummary: {
        ...baseInput().currentMetadataSummary,
        displayIdHash: "other_display_hash"
      }
    });

    expect(warning.status).toBe("warning");
    expect(warning.warningCodes).toContain("DISPLAY_MISMATCH_WARNING");
    expect(blocked.status).toBe("blocked");
    expect(blocked.blockerCodes).toContain("DISPLAY_MISMATCH");
  });

  it("warns for low confidence", () => {
    const result = validateDesktopTargetFreshness({
      ...baseInput(),
      actionProposalTargetSummary: {
        ...baseInput().actionProposalTargetSummary,
        confidence: 0.4
      }
    });

    expect(result.status).toBe("warning");
    expect(result.warningCodes).toContain("LOW_TARGET_CONFIDENCE");
  });

  it("warns for sensitive target labels", () => {
    const result = validateDesktopTargetFreshness({
      ...baseInput(),
      actionProposalTargetSummary: {
        ...baseInput().actionProposalTargetSummary,
        labelSummary: "Delete credential"
      }
    });

    expect(result.status).toBe("warning");
    expect(result.warningCodes).toContain("SENSITIVE_TARGET_LABEL");
  });

  it("blocks minimized or hidden windows", () => {
    const result = validateDesktopTargetFreshness({
      ...baseInput(),
      currentMetadataSummary: {
        ...baseInput().currentMetadataSummary,
        windowState: "hidden"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.blockerCodes).toContain("WINDOW_NOT_VISIBLE");
  });

  it("blocks raw screenshot and execution fields", () => {
    const result = validateDesktopTargetFreshness({
      ...baseInput(),
      rawScreenshot: "RAW_SCREENSHOT",
      readiness: {
        canClick: true
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(result.blockerCodes).toContain("RAW_MARKER");
    expect(result.blockerCodes).toContain("EXECUTION_FLAG_TRUE");
    expectExecutionFlagsFalse(result);
  });

  it("returns summary-only output without raw screenshot or OCR", () => {
    const result = validateDesktopTargetFreshness(baseInput());
    const summary = summarizeDesktopTargetFreshness(result);
    const serialized = JSON.stringify(summary);

    expect(summary.status).toBe("fresh");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("RAW_OCR");
    expect(serialized).not.toContain("apiKey");
    expectExecutionFlagsFalse(result);
  });
});
