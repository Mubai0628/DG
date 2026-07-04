import { describe, expect, it } from "vitest";

import {
  buildApprovedExpandedDesktopActionReceipt,
  buildSafeClickContract,
  summarizeSafeClickContract,
  validateSafeClickContractInput,
  type ApprovedExpandedDesktopActionReceipt,
  type SafeClickContract,
  type SafeClickContractInput
} from "../src/desktop-action/index.js";

function receipt(): ApprovedExpandedDesktopActionReceipt {
  return buildApprovedExpandedDesktopActionReceipt({
    scope: {
      receiptId: "approved-expanded-click-receipt-1",
      actionKind: "click_observed_safe_target",
      observationId: "desktop-observation-1",
      targetId: "target-safe-primary",
      proposalId: "expanded-action-proposal-1",
      riskClassificationId: "expanded-risk-1",
      simulationId: "expanded-simulation-1",
      windowRef: "window-hash-editor",
      appRef: "app-hash-editor",
      displayRef: "display-hash-primary",
      targetHash: "target-hash-safe",
      allowedActionKinds: ["click_observed_safe_target"],
      expiresAt: "2026-01-01T00:05:00.000Z",
      typedConfirmation: "CLICK OBSERVED TARGET",
      maxClicks: 1
    },
    observationObservedAt: "2026-01-01T00:00:30.000Z",
    createdAt: "2026-01-01T00:01:00.000Z"
  });
}

function safeInput(
  overrides: Partial<SafeClickContractInput> = {}
): SafeClickContractInput {
  return {
    actionKind: "click_observed_safe_target",
    receipt: receipt(),
    observationSummary: {
      observationId: "desktop-observation-1",
      observedAt: "2026-01-01T00:00:30.000Z",
      windowRef: "window-hash-editor",
      appRef: "app-hash-editor",
      displayRef: "display-hash-primary",
      targetIds: ["target-safe-primary"],
      targetHash: "target-hash-safe",
      boundsHash: "bounds-hash-safe"
    },
    targetSummary: {
      targetId: "target-safe-primary",
      targetKind: "button",
      windowRef: "window-hash-editor",
      appRef: "app-hash-editor",
      displayRef: "display-hash-primary",
      targetHash: "target-hash-safe",
      boundsHash: "bounds-hash-safe",
      safeTarget: true
    },
    proposalSummary: {
      proposalId: "expanded-action-proposal-1",
      actionKind: "click_observed_safe_target",
      targetId: "target-safe-primary",
      windowRef: "window-hash-editor",
      appRef: "app-hash-editor",
      displayRef: "display-hash-primary",
      targetHash: "target-hash-safe",
      expectedEffectSummary: "The safe target would be clicked once."
    },
    riskClassification: {
      riskClassificationId: "expanded-risk-1",
      riskLevel: "low",
      riskClass: "safe",
      destructiveRisk: false,
      sensitiveTargetBlocked: false
    },
    simulationSummary: {
      simulationId: "expanded-simulation-1",
      status: "safe",
      safeForClick: true,
      stepCount: 1,
      clickCount: 1,
      doubleClick: false
    },
    clickPointSummary: {
      pointHash: "point-hash-target-center",
      targetBoundsHash: "bounds-hash-safe",
      withinTargetBounds: true
    },
    freshnessPolicy: {
      staleThresholdMs: 60 * 1000
    },
    createdAt: "2026-01-01T00:01:00.000Z",
    idGenerator: () => "safe-click-contract-test-1",
    ...overrides
  };
}

function codes(contract: SafeClickContract): string[] {
  return contract.findings.map((finding) => finding.code);
}

function expectExecutionFlagsFalse(
  contract: Pick<SafeClickContract, "readiness">
): void {
  expect(contract.readiness.canCallTauriCommand).toBe(false);
  expect(contract.readiness.canExecuteDesktopAction).toBe(false);
  expect(contract.readiness.canClick).toBe(false);
  expect(contract.readiness.canDoubleClick).toBe(false);
  expect(contract.readiness.canType).toBe(false);
  expect(contract.readiness.canSelect).toBe(false);
  expect(contract.readiness.canDragDrop).toBe(false);
  expect(contract.readiness.canWriteClipboard).toBe(false);
  expect(contract.readiness.canOpenFileDialog).toBe(false);
  expect(contract.readiness.canWriteEventStore).toBe(false);
  expect(contract.readiness.canUseNativeBridge).toBe(false);
  expect(contract.readiness.canExecuteGit).toBe(false);
  expect(contract.readiness.canExecuteShell).toBe(false);
  expect(contract.readiness.appCanExecute).toBe(false);
}

describe("safe click contract", () => {
  it("builds a summary-only safe click contract", () => {
    const contract = buildSafeClickContract(safeInput());

    expect(contract.status).toBe("planned");
    expect(contract.contractId).toBe("safe-click-contract-test-1");
    expect(contract.actionKind).toBe("click_observed_safe_target");
    expect(contract.targetRef).toBe("target-safe-primary");
    expect(contract.boundsHash).toBe("bounds-hash-safe");
    expect(contract.freshnessStatus).toBe("fresh");
    expect(contract.riskStatus).toBe("safe");
    expect(contract.simulationStatus).toBe("safe");
    expect(contract.plan?.summaryOnly).toBe(true);
    expect(contract.readiness.canExecuteViaFixedTauriCommand).toBe(true);
    expect(summarizeSafeClickContract(contract)).toContain("tauri_call:false");
    expectExecutionFlagsFalse(contract);
  });

  it("blocks missing receipt and unsupported action kinds", () => {
    const missingReceipt = buildSafeClickContract(
      safeInput({ receipt: undefined })
    );
    const unsupportedAction = buildSafeClickContract(
      safeInput({ actionKind: "type_into_observed_text_field" })
    );

    expect(missingReceipt.status).toBe("blocked");
    expect(codes(missingReceipt)).toContain(
      "SAFE_CLICK_CONTRACT_RECEIPT_MISSING"
    );
    expect(unsupportedAction.status).toBe("blocked");
    expect(codes(unsupportedAction)).toContain(
      "SAFE_CLICK_CONTRACT_ACTION_KIND_UNSUPPORTED"
    );
    expectExecutionFlagsFalse(unsupportedAction);
  });

  it("blocks receipt scope and proposal mismatches", () => {
    const contract = buildSafeClickContract(
      safeInput({
        proposalSummary: {
          ...safeInput().proposalSummary,
          targetId: "target-other",
          actionKind: "click_observed_safe_target"
        },
        targetSummary: {
          ...safeInput().targetSummary,
          targetId: "target-other",
          safeTarget: true
        }
      })
    );

    expect(contract.status).toBe("blocked");
    expect(codes(contract)).toContain(
      "SAFE_CLICK_CONTRACT_PROPOSAL_SCOPE_MISMATCH"
    );
  });

  it("blocks stale observations and targets missing bounds", () => {
    const stale = buildSafeClickContract(
      safeInput({
        observationSummary: {
          ...safeInput().observationSummary,
          observedAt: "2026-01-01T00:00:00.000Z"
        },
        createdAt: "2026-01-01T00:20:00.000Z"
      })
    );
    const missingBounds = buildSafeClickContract(
      safeInput({
        targetSummary: {
          ...safeInput().targetSummary,
          boundsHash: undefined,
          safeTarget: true
        },
        observationSummary: {
          ...safeInput().observationSummary,
          boundsHash: undefined
        }
      })
    );

    expect(stale.status).toBe("blocked");
    expect(codes(stale)).toContain("SAFE_CLICK_CONTRACT_OBSERVATION_STALE");
    expect(missingBounds.status).toBe("blocked");
    expect(codes(missingBounds)).toContain("SAFE_CLICK_CONTRACT_BOUNDS_MISSING");
  });

  it("blocks sensitive targets and high risk classification", () => {
    const sensitive = buildSafeClickContract(
      safeInput({
        targetSummary: {
          ...safeInput().targetSummary,
          safeTarget: true,
          passwordLike: true
        }
      })
    );
    const highRisk = buildSafeClickContract(
      safeInput({
        riskClassification: {
          riskClassificationId: "expanded-risk-1",
          riskLevel: "high",
          riskClass: "D5_BLOCKED",
          destructiveRisk: true,
          sensitiveTargetBlocked: false
        }
      })
    );

    expect(sensitive.status).toBe("blocked");
    expect(codes(sensitive)).toContain(
      "SAFE_CLICK_CONTRACT_SENSITIVE_OR_DESTRUCTIVE_TARGET"
    );
    expect(highRisk.status).toBe("blocked");
    expect(codes(highRisk)).toContain("SAFE_CLICK_CONTRACT_RISK_BLOCKED");
  });

  it("blocks unsafe simulation, double click, and click point outside target", () => {
    const simulation = buildSafeClickContract(
      safeInput({
        simulationSummary: {
          simulationId: "expanded-simulation-1",
          status: "blocked",
          safeForClick: false,
          stepCount: 2,
          clickCount: 2,
          doubleClick: true
        },
        clickPointSummary: {
          pointHash: "point-hash-outside",
          targetBoundsHash: "bounds-hash-safe",
          withinTargetBounds: false
        }
      })
    );

    expect(simulation.status).toBe("blocked");
    expect(codes(simulation)).toEqual(
      expect.arrayContaining([
        "SAFE_CLICK_CONTRACT_SIMULATION_BLOCKED",
        "SAFE_CLICK_CONTRACT_MULTI_STEP_BLOCKED",
        "SAFE_CLICK_CONTRACT_SINGLE_CLICK_REQUIRED",
        "SAFE_CLICK_CONTRACT_DOUBLE_CLICK_BLOCKED",
        "SAFE_CLICK_CONTRACT_CLICK_POINT_OUTSIDE_TARGET"
      ])
    );
  });

  it("blocks raw, secret, coordinate, clipboard, and execution fields", () => {
    const fakeKeyMarker = ["sk", "fake-safe-click-marker"].join("-");
    const contract = buildSafeClickContract({
      ...safeInput(),
      targetSummary: {
        ...safeInput().targetSummary,
        rawScreenshot: "RAW_SCREENSHOT_BYTES",
        rawOcrText: "RAW_OCR",
        clickX: 10,
        clipboardContent: "CLIPBOARD_CONTENT",
        note: fakeKeyMarker,
        readiness: {
          canClick: true,
          canCallTauriCommand: true,
          canWriteEventStore: true,
          appCanExecute: true
        }
      } as unknown as SafeClickContractInput["targetSummary"]
    });
    const serialized = JSON.stringify(contract);

    expect(contract.status).toBe("blocked");
    expect(codes(contract)).toContain("SAFE_CLICK_CONTRACT_FORBIDDEN_FIELD");
    expect(codes(contract)).toContain("SAFE_CLICK_CONTRACT_RAW_MARKER");
    expect(codes(contract)).toContain("SAFE_CLICK_CONTRACT_SECRET_MARKER");
    expect(codes(contract)).toContain(
      "SAFE_CLICK_CONTRACT_EXECUTION_READINESS_TRUE"
    );
    expect(serialized).not.toContain("RAW_SCREENSHOT_BYTES");
    expect(serialized).not.toContain("RAW_OCR");
    expect(serialized).not.toContain("CLIPBOARD_CONTENT");
    expect(serialized).not.toContain(fakeKeyMarker);
    expectExecutionFlagsFalse(contract);
  });

  it("validates input and keeps output deterministic", () => {
    const first = buildSafeClickContract(safeInput());
    const second = buildSafeClickContract(safeInput());
    const validation = validateSafeClickContractInput(safeInput());
    const serialized = JSON.stringify(first);

    expect(validation.ok).toBe(true);
    expect(validation.status).toBe("planned");
    expect(first.contractHash).toBe(second.contractHash);
    expect(first.plan?.contractHash).toBe(first.contractHash);
    expect(serialized).not.toContain("rawScreenshot");
    expect(serialized).not.toContain("rawOcr");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("eventStoreWrite");
    expectExecutionFlagsFalse(first);
  });
});
