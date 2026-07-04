import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  advanceCrossSurfaceWorkflowState,
  buildCrossSurfaceWorkflowPlan,
  parseCrossSurfaceWorkflowScenario,
  summarizeCrossSurfaceWorkflowPlan,
  type CrossSurfaceWorkflowPlan
} from "../src/index.js";

const fixtureRoot = new URL(
  "./fixtures/cross-surface-workflows/",
  import.meta.url
);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

function expectNoExecution(plan: CrossSurfaceWorkflowPlan): void {
  expect(plan.readiness).toMatchObject({
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

describe("cross-surface workflow planner", () => {
  it("builds a deterministic golden demo plan", async () => {
    const scenario = parseCrossSurfaceWorkflowScenario(
      await readFixture("golden-demo-docs-task.json")
    ).scenario!;

    const first = buildCrossSurfaceWorkflowPlan({
      scenario,
      idGenerator: () => "cross-plan-test"
    });
    const second = buildCrossSurfaceWorkflowPlan({
      scenario,
      idGenerator: () => "cross-plan-test"
    });

    expect(first.status).toBe("plan_ready");
    expect(first.state).toBe("completed");
    expect(first.stepCount).toBe(13);
    expect(first.planHash).toBe(second.planHash);
    expect(first.steps.map((step) => step.kind)).toEqual([
      "objective",
      "proposal_generation",
      "agent_route",
      "knowledge_recall",
      "mcp_evidence",
      "plugin_skill_metadata",
      "desktop_observer",
      "desktop_proposal",
      "desktop_action_approval",
      "workspace_apply_approval",
      "verification",
      "rollback_optional",
      "replay_audit"
    ]);
    expectNoExecution(first);
  });

  it("blocks when the scenario is blocked", async () => {
    const scenario = parseCrossSurfaceWorkflowScenario(
      await readFixture("blocked-raw-prompt.json")
    );
    const plan = buildCrossSurfaceWorkflowPlan({ scenario });

    expect(plan.status).toBe("blocked");
    expect(plan.findings.map((finding) => finding.code)).toContain(
      "SCENARIO_BLOCKED"
    );
    expectNoExecution(plan);
  });

  it("warns when fixed evidence stages are missing", async () => {
    const fixture = await readFixture("golden-demo-docs-task.json");
    fixture.stages = (fixture.stages as Record<string, unknown>[]).filter(
      (stage) => stage.kind !== "mcp_readonly_evidence"
    );
    const scenario = parseCrossSurfaceWorkflowScenario(fixture).scenario!;
    const plan = buildCrossSurfaceWorkflowPlan({ scenario });

    expect(plan.status).toBe("warning");
    expect(
      plan.steps.find((step) => step.kind === "mcp_evidence")?.status
    ).toBe("missing");
    expect(plan.findings.map((finding) => finding.code)).toContain(
      "MISSING_STAGE_REF"
    );
    expectNoExecution(plan);
  });

  it("blocks dynamic bidding fields", async () => {
    const scenario = parseCrossSurfaceWorkflowScenario(
      await readFixture("golden-demo-docs-task.json")
    ).scenario!;
    const plan = buildCrossSurfaceWorkflowPlan({
      scenario,
      summaryRefs: {
        agent_route: {
          refId: "route-ref",
          dynamicAgentBidding: true
        }
      }
    });

    expect(plan.status).toBe("blocked");
    expect(plan.findings.map((finding) => finding.code)).toContain(
      "DYNAMIC_BIDDING_FIELD_REJECTED"
    );
    expectNoExecution(plan);
  });

  it("blocks execution readiness claims", async () => {
    const scenario = parseCrossSurfaceWorkflowScenario(
      await readFixture("golden-demo-docs-task.json")
    ).scenario!;
    const plan = buildCrossSurfaceWorkflowPlan({
      scenario,
      summaryRefs: {
        desktop_proposal: {
          refId: "desktop-ref",
          readiness: { canExecuteDesktopAction: true }
        }
      }
    });

    expect(plan.status).toBe("blocked");
    expect(plan.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_CLAIM_TRUE"
    );
    expectNoExecution(plan);
  });

  it("keeps output summary-only", async () => {
    const scenario = parseCrossSurfaceWorkflowScenario(
      await readFixture("golden-demo-docs-task.json")
    ).scenario!;
    const plan = buildCrossSurfaceWorkflowPlan({
      scenario,
      summaryRefs: {
        objective: {
          refId: "objective-ref",
          rawPrompt: "prompt text must not persist"
        }
      }
    });
    const serialized = JSON.stringify(plan);

    expect(plan.status).toBe("blocked");
    expect(serialized).not.toContain("prompt text must not persist");
    expectNoExecution(plan);
  });

  it("advances the state machine from a fixed plan", async () => {
    const scenario = parseCrossSurfaceWorkflowScenario(
      await readFixture("golden-demo-docs-task.json")
    ).scenario!;
    const plan = buildCrossSurfaceWorkflowPlan({
      scenario,
      idGenerator: () => "cross-plan-state"
    });
    const state = advanceCrossSurfaceWorkflowState({ plan });

    expect(state.state).toBe("completed");
    expect(state.completedStepCount).toBe(13);
    expect(state.canAdvanceStateMachine).toBe(true);
    expect(state.stateHash).toHaveLength(64);
  });

  it("summarizes plans without raw details", async () => {
    const scenario = parseCrossSurfaceWorkflowScenario(
      await readFixture("golden-demo-docs-task.json")
    ).scenario!;
    const plan = buildCrossSurfaceWorkflowPlan({ scenario });
    const summary = summarizeCrossSurfaceWorkflowPlan(plan);

    expect(summary.status).toBe("plan_ready");
    expect(JSON.stringify(summary)).not.toContain("objectiveSummary");
    expect(summary.readiness.canExecuteShell).toBe(false);
  });
});
