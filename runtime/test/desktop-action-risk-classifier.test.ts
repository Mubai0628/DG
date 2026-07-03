import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type DesktopActionKind,
  type DesktopActionProposal,
  classifyDesktopActionRisk,
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

async function baseProposal(): Promise<DesktopActionProposal> {
  const result = validateDesktopActionProposal(
    await fixture("safe-focus-window.json")
  );
  return result.proposal!;
}

async function proposalFor(
  kind: DesktopActionKind
): Promise<DesktopActionProposal> {
  const base = await baseProposal();
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
          boundsSummary: "x:100 y:100 w:300 h:80",
          role: kind === "focus_window" ? "window" : "button",
          labelSummary: `${kind} target summary`,
          observerEvidenceRefId: "desktop-evidence-editor-1"
        },
        summary: `Future ${kind} proposal only.`,
        expectedVisibleStateChange: "No execution in this phase.",
        ...(kind === "type_text" || kind === "paste_text"
          ? { inputTextSummary: "Summary of text only." }
          : {}),
        ...(kind === "open_file_dialog" || kind === "choose_file"
          ? { fileDialogPolicy: { allowedPathRef: "workspace-docs" } }
          : {})
      }
    ],
    riskNotes: [`${kind} risk classifier fixture.`]
  };
}

async function targetValidation(proposal: DesktopActionProposal) {
  return validateDesktopActionTargets({
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
}

function expectExecutionFlagsFalse(
  result: ReturnType<typeof classifyDesktopActionRisk>
) {
  expect(result.readiness.canExecuteDesktopAction).toBe(false);
  expect(result.readiness.canClick).toBe(false);
  expect(result.readiness.canType).toBe(false);
  expect(result.readiness.canUseClipboard).toBe(false);
  expect(result.readiness.canOpenFileDialog).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
  expect(result.capabilityBrokerRiskMapping.canExecute).toBe(false);
}

describe("desktop action risk classifier", () => {
  it("classifies focus_window as low risk", async () => {
    const proposal = await proposalFor("focus_window");
    const result = classifyDesktopActionRisk({
      proposal,
      targetValidation: await targetValidation(proposal)
    });

    expect(result.status).toBe("classified");
    expect(result.riskLevel).toBe("D1_LOW");
    expect(result.requiredApprovalMode).toBe("none");
    expect(result.readiness.canEnterApprovalDraft).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it.each([
    ["click_target", "D2_MEDIUM"],
    ["select_menu", "D2_MEDIUM"],
    ["scroll", "D2_MEDIUM"],
    ["type_text", "D3_HIGH"],
    ["press_key", "D3_HIGH"],
    ["copy_selection", "D3_HIGH"],
    ["paste_text", "D3_HIGH"],
    ["open_file_dialog", "D3_HIGH"],
    ["drag_drop", "D3_HIGH"],
    ["choose_file", "D4_CRITICAL"]
  ] as Array<[DesktopActionKind, string]>)(
    "classifies %s with the expected base level",
    async (kind, expectedRisk) => {
      const proposal = await proposalFor(kind);
      const result = classifyDesktopActionRisk({
        proposal,
        targetValidation: await targetValidation(proposal)
      });

      expect(result.status).toBe("warning");
      expect(result.riskLevel).toBe(expectedRisk);
      expect(result.operationRisks[0]?.actionKind).toBe(kind);
      expectExecutionFlagsFalse(result);
    }
  );

  it("blocks sensitive targets by policy", async () => {
    const proposal = await proposalFor("type_text");
    proposal.operations[0]!.targetRef.sensitiveKind = "password";

    const result = classifyDesktopActionRisk({
      proposal,
      targetValidation: await targetValidation(proposal),
      policy: { blockSensitiveTargets: true }
    });

    expect(result.status).toBe("blocked");
    expect(result.riskLevel).toBe("D5_BLOCKED");
    expect(result.blockedReasons).toContain("SENSITIVE_TARGET_BLOCKED");
    expect(result.requiredApprovalMode).toBe("blocked");
    expectExecutionFlagsFalse(result);
  });

  it("blocks hidden or background targets", async () => {
    const proposal = await proposalFor("click_target");
    proposal.operations[0]!.targetRef.labelSummary = "hidden background target";

    const result = classifyDesktopActionRisk({
      proposal,
      targetValidation: await targetValidation(proposal),
      policy: { blockHiddenTargets: true }
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain(
      "HIDDEN_OR_BACKGROUND_TARGET_BLOCKED"
    );
    expectExecutionFlagsFalse(result);
  });

  it("blocks when target validation is blocked", async () => {
    const proposal = await proposalFor("focus_window");
    const result = classifyDesktopActionRisk({
      proposal,
      targetValidation: {
        ...(await targetValidation(proposal)),
        status: "blocked",
        blockerCount: 1
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockedReasons).toEqual([]);
    expect(result.summary.warningCodes).toEqual([]);
    expect(result.findings.map((item) => item.code)).toContain(
      "TARGET_VALIDATION_BLOCKED"
    );
    expectExecutionFlagsFalse(result);
  });

  it("blocks raw fields, secret markers, and execution flags", async () => {
    const proposal = await proposalFor("focus_window");
    const result = classifyDesktopActionRisk({
      proposal,
      targetValidation: await targetValidation(proposal),
      observerEvidenceSummary: {
        rawScreenshot: "RAW_SCREENSHOT_BYTES",
        marker: "sk-test-obvious-fake"
      },
      canExecuteDesktopAction: true
    } as never);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "FORBIDDEN_FIELD"
    );
    expect(result.findings.map((item) => item.code)).toContain("RAW_MARKER");
    expect(result.findings.map((item) => item.code)).toContain("SECRET_MARKER");
    expect(result.findings.map((item) => item.code)).toContain(
      "EXECUTION_FLAG_TRUE"
    );
    expectExecutionFlagsFalse(result);
  });

  it("keeps output summary-only", async () => {
    const proposal = await proposalFor("click_target");
    const result = classifyDesktopActionRisk({
      proposal,
      targetValidation: await targetValidation(proposal)
    });
    const serialized = JSON.stringify(result);

    expect(result.summary.summaryOnly).toBe(true);
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("rawScreenshot");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("executeNow");
    expectExecutionFlagsFalse(result);
  });
});
