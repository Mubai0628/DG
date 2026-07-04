import { describe, expect, it } from "vitest";

import {
  simulateDesktopActionSequence,
  summarizeDesktopActionSequenceSimulation
} from "../src/desktop/index.js";

function step(actionKind: string, index = 1) {
  return {
    stepId: `step-${index}`,
    proposalSummary: {
      proposalId: `proposal-${index}`,
      actionKind,
      targetId: `target-${index}`,
      targetKind: actionKind === "type_text" ? "text_field" : "button",
      expectedEffectSummary: `Expected effect ${index}.`,
      proposalHash: `proposal_hash_${index}`
    },
    freshnessResult: {
      status: "fresh",
      targetHash: `target_hash_${index}`
    },
    riskSummary: {
      riskClass: "low",
      riskFactors: [],
      warningCodes: [],
      blockerCodes: []
    },
    preconditionSummary: `Precondition ${index}.`,
    postconditionSummary: `Postcondition ${index}.`
  };
}

function expectExecutionFlagsFalse(
  result: ReturnType<typeof simulateDesktopActionSequence>
) {
  expect(result.readiness.canExecuteDesktopAction).toBe(false);
  expect(result.readiness.canClick).toBe(false);
  expect(result.readiness.canType).toBe(false);
  expect(result.readiness.canSelect).toBe(false);
  expect(result.readiness.canWriteClipboard).toBe(false);
  expect(result.readiness.canOpenFileDialog).toBe(false);
  expect(result.readiness.canDragDrop).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("desktop action sequence simulation", () => {
  it("simulates a simple click/type sequence", () => {
    const result = simulateDesktopActionSequence({
      steps: [step("click_target", 1), step("type_text", 2)],
      sequencePolicy: {
        maxSteps: 5
      }
    });

    expect(result.status).toBe("simulated");
    expect(result.stepCount).toBe(2);
    expect(result.simulatedStepCount).toBe(2);
    expect(result.blockerCount).toBe(0);
    expect(result.expectedFinalStateSummary).toContain("summary-only");
    expectExecutionFlagsFalse(result);
  });

  it("blocks a stale first step and skips the next step", () => {
    const result = simulateDesktopActionSequence({
      steps: [
        {
          ...step("click_target", 1),
          freshnessResult: {
            status: "blocked",
            blockerCodes: ["STALE_EVIDENCE"]
          }
        },
        step("type_text", 2)
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.stepSummaries[0]?.status).toBe("blocked");
    expect(result.stepSummaries[1]?.status).toBe("skipped");
    expect(result.blockedStepCount).toBe(1);
    expect(result.skippedStepCount).toBe(1);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "STALE_EVIDENCE"
    );
  });

  it("blocks sensitive UI steps", () => {
    const result = simulateDesktopActionSequence({
      steps: [
        {
          ...step("click_target", 1),
          riskSummary: {
            riskClass: "high",
            riskFactors: ["sensitive_ui"]
          }
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.stepSummaries[0]?.blockerCodes).toContain(
      "SENSITIVE_UI_STOPS_SEQUENCE"
    );
  });

  it("keeps clipboard write proposal-only", () => {
    const result = simulateDesktopActionSequence({
      steps: [step("clipboard_write", 1)]
    });

    expect(result.status).toBe("blocked");
    expect(result.stepSummaries[0]?.blockerCodes).toContain(
      "CLIPBOARD_ACTION_PROPOSAL_ONLY"
    );
    expectExecutionFlagsFalse(result);
  });

  it("keeps file dialog proposal-only", () => {
    const result = simulateDesktopActionSequence({
      steps: [step("file_dialog_select", 1)]
    });

    expect(result.status).toBe("blocked");
    expect(result.stepSummaries[0]?.blockerCodes).toContain(
      "FILE_DIALOG_ACTION_PROPOSAL_ONLY"
    );
  });

  it("blocks execution flags", () => {
    const result = simulateDesktopActionSequence({
      steps: [step("click_target", 1)],
      readiness: {
        canClick: true
      },
      clickNow: true
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_FLAG_TRUE"
    );
    expectExecutionFlagsFalse(result);
  });

  it("returns summary-only output", () => {
    const result = simulateDesktopActionSequence({
      steps: [step("click_target", 1)]
    });
    const summary = summarizeDesktopActionSequenceSimulation(result);
    const serialized = JSON.stringify(summary);

    expect(summary.status).toBe("simulated");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("CLIPBOARD_CONTENT");
    expect(serialized).not.toContain("apiKey");
    expectExecutionFlagsFalse(result);
  });
});
