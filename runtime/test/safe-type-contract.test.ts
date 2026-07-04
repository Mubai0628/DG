import { describe, expect, it } from "vitest";

import {
  buildApprovedExpandedDesktopActionReceipt,
  buildSafeTypeContract,
  summarizeSafeTypeContract,
  validateSafeTypeContractInput,
  type ApprovedExpandedDesktopActionReceipt,
  type SafeTypeContract,
  type SafeTypeContractInput
} from "../src/desktop-action/index.js";

function receipt(): ApprovedExpandedDesktopActionReceipt {
  return buildApprovedExpandedDesktopActionReceipt({
    scope: {
      receiptId: "approved-expanded-type-receipt-1",
      actionKind: "type_into_observed_text_field",
      observationId: "desktop-observation-1",
      targetId: "target-safe-text-field",
      proposalId: "expanded-action-proposal-1",
      riskClassificationId: "expanded-risk-1",
      simulationId: "expanded-simulation-1",
      windowRef: "window-hash-editor",
      appRef: "app-hash-editor",
      displayRef: "display-hash-primary",
      targetHash: "target-hash-safe-text",
      allowedActionKinds: ["type_into_observed_text_field"],
      expiresAt: "2026-01-01T00:05:00.000Z",
      typedConfirmation: "TYPE INTO OBSERVED FIELD",
      maxClicks: 1,
      maxTextLength: 40
    },
    observationObservedAt: "2026-01-01T00:00:30.000Z",
    textLength: 11,
    createdAt: "2026-01-01T00:01:00.000Z"
  });
}

function safeInput(
  overrides: Partial<SafeTypeContractInput> = {}
): SafeTypeContractInput {
  return {
    actionKind: "type_into_observed_text_field",
    receipt: receipt(),
    observationSummary: {
      observationId: "desktop-observation-1",
      observedAt: "2026-01-01T00:00:30.000Z",
      windowRef: "window-hash-editor",
      appRef: "app-hash-editor",
      displayRef: "display-hash-primary",
      targetIds: ["target-safe-text-field"],
      targetHash: "target-hash-safe-text"
    },
    targetSummary: {
      targetId: "target-safe-text-field",
      targetKind: "text_field",
      windowRef: "window-hash-editor",
      appRef: "app-hash-editor",
      displayRef: "display-hash-primary",
      targetHash: "target-hash-safe-text",
      safeTarget: true,
      textField: true
    },
    textSummary: {
      textHash: "text-hash-safe",
      textLength: 11,
      textValue: "hello world",
      multiline: false,
      allowMultiline: false
    },
    proposalSummary: {
      proposalId: "expanded-action-proposal-1",
      actionKind: "type_into_observed_text_field",
      targetId: "target-safe-text-field",
      windowRef: "window-hash-editor",
      appRef: "app-hash-editor",
      displayRef: "display-hash-primary",
      targetHash: "target-hash-safe-text",
      expectedEffectSummary: "A short safe text value would be typed."
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
      safeForType: true,
      stepCount: 1,
      typeCount: 1
    },
    freshnessPolicy: {
      staleThresholdMs: 60 * 1000
    },
    maxTextLength: 40,
    createdAt: "2026-01-01T00:01:00.000Z",
    idGenerator: () => "safe-type-contract-test-1",
    ...overrides
  };
}

function codes(contract: SafeTypeContract): string[] {
  return contract.findings.map((finding) => finding.code);
}

function expectExecutionFlagsFalse(
  contract: Pick<SafeTypeContract, "readiness">
): void {
  expect(contract.readiness.canCallTauriCommand).toBe(false);
  expect(contract.readiness.canExecuteDesktopAction).toBe(false);
  expect(contract.readiness.canClick).toBe(false);
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

describe("safe type contract", () => {
  it("builds a summary-only safe type contract", () => {
    const contract = buildSafeTypeContract(safeInput());

    expect(contract.status).toBe("planned");
    expect(contract.contractId).toBe("safe-type-contract-test-1");
    expect(contract.actionKind).toBe("type_into_observed_text_field");
    expect(contract.targetRef).toBe("target-safe-text-field");
    expect(contract.textHash).toBe("text-hash-safe");
    expect(contract.textLength).toBe(11);
    expect(contract.plan?.summaryOnly).toBe(true);
    expect(contract.readiness.canExecuteViaFixedTauriCommand).toBe(true);
    expect(summarizeSafeTypeContract(contract)).toContain("raw_text:false");
    expect(JSON.stringify(contract)).not.toContain("hello world");
    expectExecutionFlagsFalse(contract);
  });

  it("blocks missing receipt and unsupported action kinds", () => {
    const missingReceipt = buildSafeTypeContract(
      safeInput({ receipt: undefined })
    );
    const unsupportedAction = buildSafeTypeContract(
      safeInput({ actionKind: "click_observed_safe_target" })
    );

    expect(missingReceipt.status).toBe("blocked");
    expect(codes(missingReceipt)).toContain(
      "SAFE_TYPE_CONTRACT_RECEIPT_MISSING"
    );
    expect(unsupportedAction.status).toBe("blocked");
    expect(codes(unsupportedAction)).toContain(
      "SAFE_TYPE_CONTRACT_ACTION_KIND_UNSUPPORTED"
    );
    expectExecutionFlagsFalse(unsupportedAction);
  });

  it("blocks non-text and sensitive target fields", () => {
    const nonText = buildSafeTypeContract(
      safeInput({
        targetSummary: {
          ...safeInput().targetSummary,
          targetKind: "button",
          textField: false,
          safeTarget: true
        }
      })
    );
    const password = buildSafeTypeContract(
      safeInput({
        targetSummary: {
          ...safeInput().targetSummary,
          safeTarget: true,
          textField: true,
          passwordField: true
        }
      })
    );

    expect(nonText.status).toBe("blocked");
    expect(codes(nonText)).toContain(
      "SAFE_TYPE_CONTRACT_TARGET_NOT_SAFE_TEXT_FIELD"
    );
    expect(password.status).toBe("blocked");
    expect(codes(password)).toContain(
      "SAFE_TYPE_CONTRACT_SENSITIVE_TEXT_FIELD"
    );
  });

  it("blocks stale observation and receipt/proposal mismatches", () => {
    const stale = buildSafeTypeContract(
      safeInput({
        observationSummary: {
          ...safeInput().observationSummary,
          observedAt: "2026-01-01T00:00:00.000Z"
        },
        createdAt: "2026-01-01T00:20:00.000Z"
      })
    );
    const mismatch = buildSafeTypeContract(
      safeInput({
        proposalSummary: {
          ...safeInput().proposalSummary,
          targetId: "target-other"
        }
      })
    );

    expect(stale.status).toBe("blocked");
    expect(codes(stale)).toContain("SAFE_TYPE_CONTRACT_OBSERVATION_STALE");
    expect(mismatch.status).toBe("blocked");
    expect(codes(mismatch)).toContain(
      "SAFE_TYPE_CONTRACT_PROPOSAL_SCOPE_MISMATCH"
    );
  });

  it("blocks excessive, multiline, control-character, secret, and password text", () => {
    const fakeKeyMarker = ["sk", "fake-safe-type-marker"].join("-");
    const unsafe = buildSafeTypeContract(
      safeInput({
        textSummary: {
          textHash: "text-hash-unsafe",
          textLength: 120,
          textValue: `${fakeKeyMarker}\npassword\u0001`,
          multiline: true,
          allowMultiline: false
        },
        maxTextLength: 40
      })
    );
    const serialized = JSON.stringify(unsafe);

    expect(unsafe.status).toBe("blocked");
    expect(codes(unsafe)).toEqual(
      expect.arrayContaining([
        "SAFE_TYPE_CONTRACT_TEXT_TOO_LONG",
        "SAFE_TYPE_CONTRACT_MULTILINE_BLOCKED",
        "SAFE_TYPE_CONTRACT_CONTROL_CHARACTERS_BLOCKED",
        "SAFE_TYPE_CONTRACT_SECRET_OR_PASSWORD_TEXT_BLOCKED"
      ])
    );
    expect(serialized).not.toContain(fakeKeyMarker);
  });

  it("blocks shell-looking text for risky targets", () => {
    const contract = buildSafeTypeContract(
      safeInput({
        textSummary: {
          textHash: "text-hash-shell",
          textLength: 9,
          textValue: "rm -rf /",
          shellCommandLike: true
        },
        riskClassification: {
          riskClassificationId: "expanded-risk-1",
          riskLevel: "high",
          riskClass: "D4_HIGH",
          destructiveRisk: true,
          sensitiveTargetBlocked: false
        }
      })
    );

    expect(contract.status).toBe("blocked");
    expect(codes(contract)).toContain(
      "SAFE_TYPE_CONTRACT_SHELL_TEXT_BLOCKED_FOR_RISKY_TARGET"
    );
    expect(codes(contract)).toContain("SAFE_TYPE_CONTRACT_RISK_BLOCKED");
  });

  it("blocks unsafe simulation and raw/execution fields", () => {
    const contract = buildSafeTypeContract({
      ...safeInput({
        simulationSummary: {
          simulationId: "expanded-simulation-1",
          status: "blocked",
          safeForType: false,
          stepCount: 2,
          typeCount: 2
        }
      }),
      targetSummary: {
        ...safeInput().targetSummary,
        rawOcrText: "RAW_OCR",
        rawText: "RAW_TEXT",
        clipboardContent: "CLIPBOARD_CONTENT",
        readiness: {
          canType: true,
          canCallTauriCommand: true,
          canWriteEventStore: true,
          appCanExecute: true
        }
      } as unknown as SafeTypeContractInput["targetSummary"]
    });
    const serialized = JSON.stringify(contract);

    expect(contract.status).toBe("blocked");
    expect(codes(contract)).toEqual(
      expect.arrayContaining([
        "SAFE_TYPE_CONTRACT_SIMULATION_BLOCKED",
        "SAFE_TYPE_CONTRACT_MULTI_STEP_BLOCKED",
        "SAFE_TYPE_CONTRACT_SINGLE_TYPE_REQUIRED",
        "SAFE_TYPE_CONTRACT_FORBIDDEN_FIELD",
        "SAFE_TYPE_CONTRACT_RAW_MARKER",
        "SAFE_TYPE_CONTRACT_EXECUTION_READINESS_TRUE"
      ])
    );
    expect(serialized).not.toContain("RAW_OCR");
    expect(serialized).not.toContain("RAW_TEXT");
    expect(serialized).not.toContain("CLIPBOARD_CONTENT");
    expectExecutionFlagsFalse(contract);
  });

  it("validates input and keeps output deterministic", () => {
    const first = buildSafeTypeContract(safeInput());
    const second = buildSafeTypeContract(safeInput());
    const validation = validateSafeTypeContractInput(safeInput());
    const serialized = JSON.stringify(first);

    expect(validation.ok).toBe(true);
    expect(validation.status).toBe("planned");
    expect(first.contractHash).toBe(second.contractHash);
    expect(first.plan?.contractHash).toBe(first.contractHash);
    expect(serialized).not.toContain("textValue");
    expect(serialized).not.toContain("hello world");
    expect(serialized).not.toContain("rawText");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("eventStoreWrite");
    expectExecutionFlagsFalse(first);
  });
});
