import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  parseCrossSurfaceWorkflowScenario,
  summarizeCrossSurfaceWorkflowScenario,
  validateCrossSurfaceWorkflowScenario,
  type CrossSurfaceScenarioValidationResult
} from "../src/index.js";

const fixtureRoot = new URL(
  "./fixtures/cross-surface-workflows/",
  import.meta.url
);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

function findingCodes(result: CrossSurfaceScenarioValidationResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: CrossSurfaceScenarioValidationResult): void {
  expect(result.readiness).toMatchObject({
    canRunAgents: false,
    canCallDeepSeek: false,
    canInvokeMcpTools: false,
    canInvokePluginRuntime: false,
    canInvokeSkillRuntime: false,
    canExecuteDesktopAction: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    canUseNativeBridge: false,
    appCanExecute: false
  });
}

describe("cross-surface workflow scenario schema", () => {
  it("parses the safe golden demo", async () => {
    const fixture = await readFixture("golden-demo-docs-task.json");
    const result = parseCrossSurfaceWorkflowScenario(fixture);
    const summary = summarizeCrossSurfaceWorkflowScenario(result.scenario!);

    expect(result.status).toBe("parsed");
    expect(result.scenario?.scenarioId).toBe("cross-surface-golden-docs-task");
    expect(result.summary.stageCount).toBe(13);
    expect(summary.expectedStatus).toBe("preview_ready");
    expect(result.readiness.canEnterWorkflowPreview).toBe(true);
    expectNoExecution(result);
  });

  it("parses JSON string input", async () => {
    const fixture = await readFixture("golden-demo-docs-task.json");
    const result = validateCrossSurfaceWorkflowScenario(
      JSON.stringify(fixture)
    );

    expect(result.status).toBe("parsed");
    expect(result.scenario?.stageCount).toBe(13);
    expectNoExecution(result);
  });

  it("blocks raw prompt fields without echoing them", async () => {
    const fixture = await readFixture("blocked-raw-prompt.json");
    const result = validateCrossSurfaceWorkflowScenario(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(serialized).not.toContain("Synthetic prompt body");
    expect(result.scenario).toBeUndefined();
    expectNoExecution(result);
  });

  it("blocks raw source markers", async () => {
    const fixture = await readFixture("golden-demo-docs-task.json");
    fixture.rawSource = "Synthetic source body that must not persist.";
    const result = validateCrossSurfaceWorkflowScenario(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAW_SOURCE_FIELD_REJECTED");
    expect(serialized).not.toContain("Synthetic source body");
    expectNoExecution(result);
  });

  it("blocks unapproved desktop action execution", async () => {
    const fixture = await readFixture("blocked-unapproved-action.json");
    const result = validateCrossSurfaceWorkflowScenario(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain(
      "UNAPPROVED_DESKTOP_ACTION_EXECUTION"
    );
    expect(findingCodes(result)).toContain(
      "STAGE_EXECUTION_WITHOUT_APPROVED_LANE"
    );
    expectNoExecution(result);
  });

  it("blocks dynamic bidding stages", async () => {
    const fixture = await readFixture("golden-demo-docs-task.json");
    fixture.stages = [
      ...(fixture.stages as unknown[]),
      {
        stageId: "stage-dynamic",
        kind: "dynamic_agent_bidding",
        summary: "Dynamic route selection should block."
      }
    ];
    const result = validateCrossSurfaceWorkflowScenario(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("DYNAMIC_BIDDING_STAGE_REJECTED");
    expectNoExecution(result);
  });

  it("blocks arbitrary tool stages", async () => {
    const fixture = await readFixture("golden-demo-docs-task.json");
    fixture.stages = [
      ...(fixture.stages as unknown[]),
      {
        stageId: "stage-tool",
        kind: "arbitrary_tool",
        summary: "Arbitrary tool invocation should block."
      }
    ];
    const result = validateCrossSurfaceWorkflowScenario(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("ARBITRARY_TOOL_STAGE_REJECTED");
    expectNoExecution(result);
  });

  it("blocks replay stage without summary refs", async () => {
    const fixture = await readFixture("golden-demo-docs-task.json");
    fixture.stages = (fixture.stages as Record<string, unknown>[]).map(
      (stage) =>
        stage.kind === "unified_replay_audit"
          ? { ...stage, summaryRefs: [], refs: [] }
          : stage
    );
    const result = validateCrossSurfaceWorkflowScenario(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("REPLAY_SUMMARY_REFS_REQUIRED");
    expectNoExecution(result);
  });

  it("warns when the unified replay stage is missing", async () => {
    const fixture = await readFixture("golden-demo-docs-task.json");
    fixture.stages = (fixture.stages as Record<string, unknown>[]).filter(
      (stage) => stage.kind !== "unified_replay_audit"
    );
    const result = validateCrossSurfaceWorkflowScenario(fixture);

    expect(result.status).toBe("warning");
    expect(findingCodes(result)).toContain("MISSING_REPLAY_STAGE");
    expect(result.readiness.canEnterWorkflowPreview).toBe(true);
    expectNoExecution(result);
  });

  it("keeps blocked output summary-only", async () => {
    const fixture = {
      ...(await readFixture("golden-demo-docs-task.json")),
      rawPrompt: "raw prompt body",
      rawResponse: "raw response body",
      objectiveSummary: "sk-fake-cross-surface-secret-000000"
    };
    const result = validateCrossSurfaceWorkflowScenario(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(serialized).not.toContain("raw prompt body");
    expect(serialized).not.toContain("raw response body");
    expect(serialized).not.toContain("sk-fake-cross-surface-secret-000000");
    expect(result.summary.stageCount).toBe(0);
    expectNoExecution(result);
  });

  it("keeps every execution readiness flag false", async () => {
    const fixture = await readFixture("golden-demo-docs-task.json");
    const result = validateCrossSurfaceWorkflowScenario(fixture);

    expectNoExecution(result);
  });

  it("uses deterministic ids and hashes with injected id and clock", async () => {
    const fixture = await readFixture("golden-demo-docs-task.json");
    delete fixture.scenarioId;
    delete fixture.createdAt;

    const first = validateCrossSurfaceWorkflowScenario(fixture, {
      createdAt: "2026-07-04T00:00:00.000Z",
      idGenerator: () => "generated-cross-surface-scenario"
    });
    const second = validateCrossSurfaceWorkflowScenario(fixture, {
      createdAt: "2026-07-04T00:00:00.000Z",
      idGenerator: () => "generated-cross-surface-scenario"
    });

    expect(first.status).toBe("parsed");
    expect(first.scenario?.scenarioId).toBe("generated-cross-surface-scenario");
    expect(first.scenario?.scenarioHash).toBe(second.scenario?.scenarioHash);
    expect(first.normalizedHash).toBe(second.normalizedHash);
    expectNoExecution(first);
  });
});
