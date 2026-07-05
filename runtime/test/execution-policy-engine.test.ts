import { describe, expect, it } from "vitest";

import {
  evaluateExecutionPolicy,
  executionCapabilityKinds,
  summarizeExecutionPolicyDecision,
  type ExecutionCapabilityKind,
  type ExecutionPolicyDecision,
  type PermissionMode
} from "../src/index.js";

function expectNoHighRiskReadiness(decision: ExecutionPolicyDecision): void {
  expect(decision.readiness).toMatchObject({
    canExecuteNow: false,
    canRunArbitraryShell: false,
    canRecursiveDelete: false,
    canGitPush: false,
    canAutonomousLoop: false,
    canPersistRawOutput: false,
    canEnableFullAccessExecution: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

function codes(decision: ExecutionPolicyDecision): string[] {
  return decision.findings.map((finding) => finding.code);
}

describe("execution policy engine", () => {
  it("covers each capability kind at least once", () => {
    const expectedApprovalStatuses = new Map<
      ExecutionCapabilityKind,
      ExecutionPolicyDecision["status"]
    >([
      ["workspace_read", "allowed"],
      ["workspace_write", "requires_approval"],
      ["patch_apply", "requires_approval"],
      ["patch_rollback", "requires_approval"],
      ["shell_allowlisted", "requires_approval"],
      ["shell_arbitrary", "blocked"],
      ["raw_output_persistence", "blocked"],
      ["file_delete", "blocked"],
      ["folder_delete", "blocked"],
      ["recursive_delete", "blocked"],
      ["git_read", "allowed"],
      ["git_commit", "blocked"],
      ["git_push", "blocked"],
      ["live_model_call", "requires_approval"],
      ["autonomous_loop", "blocked"],
      ["mcp_readonly_tool", "allowed"],
      ["mcp_mutating_tool", "blocked"],
      ["plugin_code_execution", "blocked"],
      ["skill_code_execution", "blocked"],
      ["desktop_observe", "allowed"],
      ["desktop_action_proposal", "allowed"],
      ["desktop_action_execute", "requires_approval"],
      ["clipboard_write", "blocked"],
      ["file_dialog_automation", "blocked"],
      ["native_bridge", "blocked"]
    ]);

    for (const capabilityKind of executionCapabilityKinds) {
      const decision = evaluateExecutionPolicy({
        mode: "approval_mode",
        capabilityKind,
        approvedLane: "existing_approved_lane",
        fixedVerificationLane: true,
        createdAt: "2026-07-06T00:00:00.000Z"
      });

      expect(decision.status).toBe(
        expectedApprovalStatuses.get(capabilityKind)
      );
      expect(decision.capabilityKind).toBe(capabilityKind);
      expect(decision.summaryOnly).toBe(true);
      expectNoHighRiskReadiness(decision);
    }
  });

  it("blocks arbitrary shell in approval mode", () => {
    const decision = evaluateExecutionPolicy({
      mode: "approval_mode",
      capabilityKind: "shell_arbitrary"
    });

    expect(decision.status).toBe("blocked");
    expect(decision.riskLevel).toBe("critical");
    expect(codes(decision)).toContain(
      "EXECUTION_POLICY_CAPABILITY_NOT_ALLOWED_FOR_MODE"
    );
    expectNoHighRiskReadiness(decision);
  });

  it("keeps arbitrary shell future-mode-only in advanced and full access modes", () => {
    const advanced = evaluateExecutionPolicy({
      mode: "advanced_workspace_mode",
      capabilityKind: "shell_arbitrary"
    });
    const full = evaluateExecutionPolicy({
      mode: "full_access_mode",
      capabilityKind: "shell_arbitrary"
    });

    expect(advanced.status).toBe("future_mode_only");
    expect(full.status).toBe("future_mode_only");
    expectNoHighRiskReadiness(advanced);
    expectNoHighRiskReadiness(full);
  });

  it("keeps recursive delete blocked or future-mode-only", () => {
    const approval = evaluateExecutionPolicy({
      mode: "approval_mode",
      capabilityKind: "recursive_delete"
    });
    const advanced = evaluateExecutionPolicy({
      mode: "advanced_workspace_mode",
      capabilityKind: "recursive_delete"
    });
    const full = evaluateExecutionPolicy({
      mode: "full_access_mode",
      capabilityKind: "recursive_delete"
    });

    expect(approval.status).toBe("blocked");
    expect(advanced.status).toBe("future_mode_only");
    expect(full.status).toBe("future_mode_only");
    expectNoHighRiskReadiness(approval);
    expectNoHighRiskReadiness(advanced);
    expectNoHighRiskReadiness(full);
  });

  it("keeps Git push blocked or future-mode-only", () => {
    const approval = evaluateExecutionPolicy({
      mode: "approval_mode",
      capabilityKind: "git_push"
    });
    const full = evaluateExecutionPolicy({
      mode: "full_access_mode",
      capabilityKind: "git_push"
    });

    expect(approval.status).toBe("blocked");
    expect(full.status).toBe("future_mode_only");
    expectNoHighRiskReadiness(approval);
    expectNoHighRiskReadiness(full);
  });

  it("allows desktop action execution only through the existing approved lane", () => {
    const broad = evaluateExecutionPolicy({
      mode: "approval_mode",
      capabilityKind: "desktop_action_execute",
      approvedLane: "broad_lane"
    });
    const existing = evaluateExecutionPolicy({
      mode: "approval_mode",
      capabilityKind: "desktop_action_execute",
      approvedLane: "existing_approved_lane"
    });

    expect(broad.status).toBe("blocked");
    expect(codes(broad)).toContain(
      "EXECUTION_POLICY_DESKTOP_ACTION_BROAD_LANE_BLOCKED"
    );
    expect(existing.status).toBe("requires_approval");
    expect(existing.existingApprovedLaneRequired).toBe(true);
    expectNoHighRiskReadiness(broad);
    expectNoHighRiskReadiness(existing);
  });

  it("blocks native bridge in every mode", () => {
    const modes: PermissionMode[] = [
      "read_only_preview",
      "approval_mode",
      "autonomous_safe_mode",
      "advanced_workspace_mode",
      "full_access_mode",
      "break_glass_mode"
    ];

    for (const mode of modes) {
      const decision = evaluateExecutionPolicy({
        mode,
        capabilityKind: "native_bridge"
      });

      expect(decision.status).toBe("blocked");
      expect(codes(decision)).toContain(
        "EXECUTION_POLICY_CAPABILITY_BLOCKED_V034"
      );
      expectNoHighRiskReadiness(decision);
    }
  });

  it("returns metadata-only for autonomous safe automation features", () => {
    const decision = evaluateExecutionPolicy({
      mode: "autonomous_safe_mode",
      capabilityKind: "autonomous_loop"
    });

    expect(decision.status).toBe("metadata_only");
    expect(decision.riskLevel).toBe("critical");
    expect(decision.nextAction).toContain("metadata-only");
    expectNoHighRiskReadiness(decision);
  });

  it("requires fixed verification lane approval for allowlisted shell", () => {
    const decision = evaluateExecutionPolicy({
      mode: "approval_mode",
      capabilityKind: "shell_allowlisted",
      fixedVerificationLane: true
    });

    expect(decision.status).toBe("requires_approval");
    expect(decision.approvalRequired).toBe(true);
    expect(decision.fixedVerificationLaneRequired).toBe(true);
    expectNoHighRiskReadiness(decision);
  });

  it("blocks raw or secret policy input safely", () => {
    const decision = evaluateExecutionPolicy({
      mode: "approval_mode",
      capabilityKind: "workspace_read",
      reasonSummary: "fake sk-test1234567890abcdef marker"
    });
    const serialized = JSON.stringify(decision);

    expect(decision.status).toBe("blocked");
    expect(codes(decision)).toContain(
      "EXECUTION_POLICY_SECRET_MARKER_REJECTED"
    );
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expectNoHighRiskReadiness(decision);
  });

  it("blocks execution readiness attempts in input", () => {
    const decision = evaluateExecutionPolicy({
      mode: "approval_mode",
      capabilityKind: "workspace_read",
      canExecuteShell: true,
      appCanExecute: true
    } as unknown as Parameters<typeof evaluateExecutionPolicy>[0]);

    expect(decision.status).toBe("blocked");
    expect(codes(decision)).toContain(
      "EXECUTION_POLICY_READINESS_TRUE_REJECTED"
    );
    expectNoHighRiskReadiness(decision);
  });

  it("produces deterministic summaries and hashes", () => {
    const input = {
      mode: "approval_mode" as const,
      capabilityKind: "patch_apply" as const,
      approvedLane: "existing_approved_lane" as const,
      createdAt: "2026-07-06T00:00:00.000Z",
      idGenerator: () => "execution-policy-fixed"
    };
    const first = evaluateExecutionPolicy(input);
    const second = evaluateExecutionPolicy(input);
    const summary = summarizeExecutionPolicyDecision(first);

    expect(first.status).toBe("requires_approval");
    expect(first.decisionId).toBe("execution-policy-fixed");
    expect(first.decisionHash).toBe(second.decisionHash);
    expect(summary).toContain("status:requires_approval");
    expect(summary).toContain(`hash:${first.decisionHash.slice(0, 12)}`);
    expectNoHighRiskReadiness(first);
  });
});
