import { describe, expect, it } from "vitest";

import {
  buildCrossSurfaceFailureRecoveryPlan,
  summarizeCrossSurfaceFailureRecoveryPlan,
  type CrossSurfaceFailureInput,
  type CrossSurfaceFailureKind,
  type CrossSurfaceFailureRecoveryPlan,
  type CrossSurfaceRecoveryAction
} from "../src/workflows/cross-surface-failure-recovery.js";

const expectedActions: Record<
  CrossSurfaceFailureKind,
  CrossSurfaceRecoveryAction
> = {
  proposal_generation_failed: "retry_proposal_generation",
  schema_repair_failed: "stop_and_report",
  validation_blocked: "stop_and_report",
  approval_missing: "request_human_approval",
  apply_failed: "run_rollback",
  verification_failed: "rerun_verification",
  rollback_required: "run_rollback",
  rollback_failed: "stop_and_report",
  mcp_evidence_stale: "refresh_mcp_metadata",
  plugin_skill_metadata_stale: "refresh_plugin_skill_metadata",
  desktop_observer_stale: "refresh_desktop_observation",
  desktop_action_blocked: "refresh_desktop_observation",
  agent_handoff_failed: "stop_and_report",
  replay_incomplete: "inspect_replay_gap",
  policy_mismatch: "stop_and_report"
};

const failureKinds = Object.keys(expectedActions) as CrossSurfaceFailureKind[];

function failure(kind: CrossSurfaceFailureKind): CrossSurfaceFailureInput {
  return {
    failureId: `${kind}-id`,
    kind,
    stageRef: `${kind}-stage`,
    summary: `${kind} summary`
  };
}

function expectNoExecution(plan: CrossSurfaceFailureRecoveryPlan): void {
  expect(plan.readiness.canExecuteRecoveryAction).toBe(false);
  expect(plan.readiness.canAutoRetryModel).toBe(false);
  expect(plan.readiness.canAutoRollback).toBe(false);
  expect(plan.readiness.canAutoApply).toBe(false);
  expect(plan.readiness.canWriteEventStore).toBe(false);
  expect(plan.readiness.canExecuteDesktopAction).toBe(false);
  expect(plan.readiness.canExecuteGit).toBe(false);
  expect(plan.readiness.canExecuteShell).toBe(false);
  expect(plan.readiness.canCallModel).toBe(false);
  expect(plan.readiness.appCanExecute).toBe(false);
}

describe("cross-surface failure recovery", () => {
  it("maps every failure kind to an advisory action", () => {
    const plan = buildCrossSurfaceFailureRecoveryPlan({
      failures: failureKinds.map(failure),
      sourceKind: "fixture",
      idGenerator: () => "recovery-all-kinds"
    });

    expect(plan.status).toBe("blocked");
    for (const kind of failureKinds) {
      expect(plan.failureKindCounts[kind]).toBe(1);
      expect(plan.actionSummaries).toContainEqual({
        failureKind: kind,
        action: expectedActions[kind],
        advisoryOnly: true
      });
    }
    expect(plan.findings.map((finding) => finding.code)).toContain(
      "POLICY_MISMATCH_BLOCKS_AUTOMATION"
    );
    expectNoExecution(plan);
  });

  it("recommends rollback for rollback_required without executing it", () => {
    const plan = buildCrossSurfaceFailureRecoveryPlan({
      failures: [failure("rollback_required")]
    });

    expect(plan.status).toBe("recovery_ready");
    expect(plan.recommendedNextAction).toBe("run_rollback");
    expect(plan.actionSummaries[0]?.advisoryOnly).toBe(true);
    expectNoExecution(plan);
  });

  it("recommends replay inspection for replay_incomplete", () => {
    const plan = buildCrossSurfaceFailureRecoveryPlan({
      failures: [failure("replay_incomplete")]
    });

    expect(plan.status).toBe("recovery_ready");
    expect(plan.recommendedNextAction).toBe("inspect_replay_gap");
    expectNoExecution(plan);
  });

  it("blocks policy mismatch automation", () => {
    const plan = buildCrossSurfaceFailureRecoveryPlan({
      failures: [failure("policy_mismatch")]
    });

    expect(plan.status).toBe("blocked");
    expect(plan.findings.map((finding) => finding.code)).toContain(
      "POLICY_MISMATCH_BLOCKS_AUTOMATION"
    );
    expect(plan.recommendedNextAction).toBe("stop_and_report");
    expectNoExecution(plan);
  });

  it("blocks raw fields, API key markers, and execution claims", () => {
    const plan = buildCrossSurfaceFailureRecoveryPlan({
      failures: [
        {
          ...failure("apply_failed"),
          rawPrompt: "do not echo raw prompt",
          summary: "Bearer abcdefghijklmnop",
          readiness: {
            canExecuteGit: true
          }
        }
      ],
      autoRollback: true
    });
    const serialized = JSON.stringify(plan);

    expect(plan.status).toBe("blocked");
    expect(plan.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "FORBIDDEN_FIELD",
        "BEARER_TOKEN_MARKER",
        "EXECUTION_FLAG_TRUE"
      ])
    );
    expect(serialized).not.toContain("do not echo raw prompt");
    expect(serialized).not.toContain("Bearer abcdefghijklmnop");
    expectNoExecution(plan);
  });

  it("keeps summary output deterministic", () => {
    const first = buildCrossSurfaceFailureRecoveryPlan({
      failures: [failure("approval_missing"), failure("verification_failed")],
      createdAt: "2026-07-05T00:00:00.000Z",
      idGenerator: () => "deterministic-recovery"
    });
    const second = buildCrossSurfaceFailureRecoveryPlan({
      failures: [failure("approval_missing"), failure("verification_failed")],
      createdAt: "2026-07-05T00:00:00.000Z",
      idGenerator: () => "deterministic-recovery"
    });
    const summary = summarizeCrossSurfaceFailureRecoveryPlan(first);
    const serialized = JSON.stringify(summary);

    expect(first.status).toBe("recovery_ready");
    expect(first.recoveryHash).toBe(second.recoveryHash);
    expect(summary.source).toBe("runtime_cross_surface_failure_recovery");
    expect(serialized).not.toContain("raw prompt");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("apiKey");
    expectNoExecution(first);
  });
});
