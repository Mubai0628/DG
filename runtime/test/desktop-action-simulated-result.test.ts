import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type DesktopActionKind,
  type DesktopActionProposal,
  classifyDesktopActionRisk,
  simulateDesktopActionProposal,
  validateDesktopActionProposal,
  validateDesktopActionTargets
} from "../src/desktop-action/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(
  __dirname,
  "fixtures",
  "desktop-action-proposals"
);

async function fixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(path.join(fixtureRoot, name), "utf8")
  ) as Record<string, unknown>;
}

async function proposalFor(
  kind: DesktopActionKind
): Promise<DesktopActionProposal> {
  const base = validateDesktopActionProposal(
    await fixture("safe-focus-window.json")
  ).proposal!;
  return {
    ...base,
    operations: [
      {
        operationId: `desktop-action-operation-${kind}`,
        actionKind: kind,
        targetRef: {
          targetId: `target-${kind}`,
          windowIdHash: "win_hash_editor",
          appIdHash: "app_hash_editor",
          displayIdHash: "display_hash_primary",
          boundsSummary: "x:100 y:100 w:320 h:80",
          role: kind === "focus_window" ? "window" : "button",
          labelSummary: `${kind} target summary`,
          observerEvidenceRefId: "desktop-evidence-editor-1"
        },
        summary: `Future ${kind} proposal only.`,
        expectedVisibleStateChange: `${kind} visible state prediction.`,
        ...(kind === "type_text" || kind === "paste_text"
          ? { inputTextSummary: "Text summary only." }
          : {}),
        ...(kind === "open_file_dialog" || kind === "choose_file"
          ? { fileDialogPolicy: { allowedPathRef: "workspace-docs" } }
          : {})
      }
    ],
    riskNotes: [`${kind} simulation fixture.`]
  };
}

async function chainFor(proposal: DesktopActionProposal) {
  const targetValidation = validateDesktopActionTargets({
    proposal,
    observerSummary: {
      evidenceRefs: [
        {
          evidenceRefId: "desktop-evidence-editor-1",
          observedAt: "2026-07-03T05:00:00.000Z"
        }
      ],
      windows: [
        {
          windowIdHash: "win_hash_editor",
          appIdHash: "app_hash_editor",
          displayIdHash: "display_hash_primary",
          boundsSummary: "x:100 y:100 w:1200 h:800",
          titleSummary: "Editor window summary"
        }
      ],
      displays: [
        {
          displayIdHash: "display_hash_primary",
          sizeSummary: "1920x1080",
          primary: true
        }
      ]
    },
    currentMetadataSummary: {
      observedAt: "2026-07-03T05:05:00.000Z",
      targets: proposal.operations.map((operation) => ({
        targetId: operation.targetRef.targetId,
        windowIdHash: "win_hash_editor",
        appIdHash: "app_hash_editor",
        displayIdHash: "display_hash_primary",
        boundsSummary: operation.targetRef.boundsSummary,
        labelSummary: operation.targetRef.labelSummary,
        confidence: 0.9,
        candidateCount: 1
      })),
      displays: [
        {
          displayIdHash: "display_hash_primary",
          sizeSummary: "1920x1080",
          primary: true
        }
      ]
    },
    createdAt: "2026-07-03T05:05:00.000Z"
  });
  const riskClassification = classifyDesktopActionRisk({
    proposal,
    targetValidation
  });
  return { targetValidation, riskClassification };
}

function expectExecutionFlagsFalse(
  result: ReturnType<typeof simulateDesktopActionProposal>
) {
  expect(result.readiness.canExecuteDesktopAction).toBe(false);
  expect(result.readiness.canClick).toBe(false);
  expect(result.readiness.canType).toBe(false);
  expect(result.readiness.canUseClipboard).toBe(false);
  expect(result.readiness.canOpenFileDialog).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
  expect(result.eventPreview.notWritten).toBe(true);
  expect(result.eventPreview.wouldWriteSummaryEvent).toBe(false);
}

describe("desktop action simulated result", () => {
  it("simulates a safe focus proposal without execution", async () => {
    const proposal = await proposalFor("focus_window");
    const chain = await chainFor(proposal);
    const result = simulateDesktopActionProposal({
      proposal,
      ...chain
    });

    expect(result.status).toBe("simulated");
    expect(result.operationResults[0]?.status).toBe("simulated");
    expect(result.summary.eventNotWritten).toBe(true);
    expect(result.readiness.canEnterCapabilityPlanning).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it("simulates click proposals with review warnings", async () => {
    const proposal = await proposalFor("click_target");
    const chain = await chainFor(proposal);
    const result = simulateDesktopActionProposal({
      proposal,
      ...chain
    });

    expect(result.status).toBe("warning");
    expect(result.operationResults[0]?.warningCodes).toContain(
      "CLICK_TARGET_REQUIRES_REVIEW"
    );
    expect(result.operationResults[0]?.predictedStateSummary).toContain(
      "visible state prediction"
    );
    expectExecutionFlagsFalse(result);
  });

  it("simulates type proposals with typed-confirmation warnings", async () => {
    const proposal = await proposalFor("type_text");
    const chain = await chainFor(proposal);
    const result = simulateDesktopActionProposal({
      proposal,
      ...chain
    });

    expect(result.status).toBe("warning");
    expect(result.operationResults[0]?.warningCodes).toContain(
      "TEXT_INPUT_REQUIRES_TYPED_CONFIRMATION"
    );
    expectExecutionFlagsFalse(result);
  });

  it("blocks missing target simulations", async () => {
    const proposal = await proposalFor("focus_window");
    const chain = await chainFor(proposal);
    const result = simulateDesktopActionProposal({
      proposal,
      targetValidation: {
        ...chain.targetValidation,
        targetCount: 0,
        status: "warning"
      },
      riskClassification: chain.riskClassification
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "MISSING_TARGET"
    );
    expectExecutionFlagsFalse(result);
  });

  it("blocks sensitive proposals through risk classification", async () => {
    const proposal = await proposalFor("type_text");
    proposal.operations[0]!.targetRef.sensitiveKind = "password";
    const chain = await chainFor(proposal);
    const riskClassification = classifyDesktopActionRisk({
      proposal,
      targetValidation: chain.targetValidation,
      policy: { blockSensitiveTargets: true }
    });
    const result = simulateDesktopActionProposal({
      proposal,
      targetValidation: chain.targetValidation,
      riskClassification
    });

    expect(riskClassification.status).toBe("blocked");
    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "RISK_CLASSIFICATION_BLOCKED"
    );
    expectExecutionFlagsFalse(result);
  });

  it("blocks raw fields and keeps output summary-only", async () => {
    const proposal = await proposalFor("focus_window");
    const chain = await chainFor(proposal);
    const result = simulateDesktopActionProposal({
      proposal,
      ...chain,
      observerEvidenceSummary: {
        rawScreenshot: "RAW_SCREENSHOT_BYTES",
        marker: "sk-test-obvious-fake"
      },
      executeNow: true
    } as never);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "FORBIDDEN_FIELD"
    );
    expect(result.findings.map((item) => item.code)).toContain("RAW_MARKER");
    expect(result.findings.map((item) => item.code)).toContain("SECRET_MARKER");
    expect(result.findings.map((item) => item.code)).toContain(
      "EXECUTION_FLAG_TRUE"
    );
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("rawScreenshot");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("executeNow");
    expectExecutionFlagsFalse(result);
  });
});
