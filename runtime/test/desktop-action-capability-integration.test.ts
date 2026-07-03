import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildDesktopActionCapabilityPlanning,
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

async function safeChain() {
  const proposal = validateDesktopActionProposal(
    await fixture("safe-focus-window.json")
  ).proposal!;
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
      targets: [
        {
          targetId: "target-editor-window",
          windowIdHash: "win_hash_editor",
          appIdHash: "app_hash_editor",
          displayIdHash: "display_hash_primary",
          boundsSummary: "x:100 y:100 w:1200 h:800",
          labelSummary: "Editor window summary",
          confidence: 0.95,
          candidateCount: 1
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
    createdAt: "2026-07-03T05:05:00.000Z"
  });
  const riskClassification = classifyDesktopActionRisk({
    proposal,
    targetValidation
  });
  const simulation = simulateDesktopActionProposal({
    proposal,
    targetValidation,
    riskClassification
  });
  return { proposal, targetValidation, riskClassification, simulation };
}

function expectExecutionFlagsFalse(
  result: ReturnType<typeof buildDesktopActionCapabilityPlanning>
) {
  expect(result.readiness.canIssuePermissionLease).toBe(false);
  expect(result.readiness.canExecuteDesktopAction).toBe(false);
  expect(result.readiness.canClick).toBe(false);
  expect(result.readiness.canType).toBe(false);
  expect(result.readiness.canUseClipboard).toBe(false);
  expect(result.readiness.canOpenFileDialog).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("desktop action capability integration", () => {
  it("builds a summary-only planning result", async () => {
    const chain = await safeChain();
    const result = buildDesktopActionCapabilityPlanning(chain);

    expect(result.status).toBe("planned");
    expect(result.summary.summaryOnly).toBe(true);
    expect(result.planningRefs.map((item) => item.refKind)).toEqual([
      "proposal",
      "target_validation",
      "risk",
      "simulation"
    ]);
    expect(result.readiness.canEnterAppReadOnlySurface).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it("keeps execute descriptor disabled manual-only and not automatic", async () => {
    const result = buildDesktopActionCapabilityPlanning(await safeChain());
    const execute = result.descriptors.find(
      (item) => item.descriptorId === "native.desktop.action.execute"
    );

    expect(execute?.mode).toBe("DISABLED");
    expect(execute?.executionPolicy).toBe("MANUAL_ONLY");
    expect(execute?.autoAllowed).toBe(false);
    expect(execute?.manualOnly).toBe(true);
    expect(result.summary.executionDescriptorMode).toBe("DISABLED");
    expect(result.summary.executionDescriptorManualOnly).toBe(true);
  });

  it("includes proposal and simulation descriptors without tool execution", async () => {
    const result = buildDesktopActionCapabilityPlanning(await safeChain());

    expect(result.descriptors.map((item) => item.descriptorId)).toEqual([
      "native.desktop.action.propose",
      "native.desktop.action.simulate",
      "native.desktop.action.execute"
    ]);
    expect(result.descriptors.every((item) => item.autoAllowed === false)).toBe(
      true
    );
    expect(
      result.descriptors.every(
        (item) => (item as Record<string, unknown>).canExecute === undefined
      )
    ).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it("blocks when upstream simulation is blocked", async () => {
    const chain = await safeChain();
    const result = buildDesktopActionCapabilityPlanning({
      ...chain,
      simulation: { ...chain.simulation, status: "blocked" }
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "SIMULATION_BLOCKED"
    );
    expect(result.readiness.canEnterAppReadOnlySurface).toBe(false);
    expectExecutionFlagsFalse(result);
  });

  it("blocks lease issuance and execution attempts", async () => {
    const result = buildDesktopActionCapabilityPlanning({
      ...(await safeChain()),
      issuePermissionLease: true,
      canExecuteDesktopAction: true
    } as never);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "FORBIDDEN_FIELD"
    );
    expect(result.findings.map((item) => item.code)).toContain(
      "EXECUTION_FLAG_TRUE"
    );
    expectExecutionFlagsFalse(result);
  });

  it("keeps output summary-only without raw or secret content", async () => {
    const result = buildDesktopActionCapabilityPlanning({
      ...(await safeChain()),
      rawScreenshot: "RAW_SCREENSHOT_BYTES",
      marker: "sk-test-obvious-fake"
    } as never);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("rawScreenshot");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("executeNow");
    expectExecutionFlagsFalse(result);
  });
});
