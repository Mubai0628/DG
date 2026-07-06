import { describe, expect, it } from "vitest";

import {
  FULL_ACCESS_CONFIRMATION,
  buildAppApprovedExecutionReceipt,
  buildPermissionModePolicy,
  buildPermissionSessionLease,
  createDefaultShellAllowlist,
  evaluateExecutionPolicy,
  planGitSafeCommand,
  planShellCommand,
  type ExecutionCapabilityKind,
  type ExecutionPolicyDecision
} from "../src/index.js";

const createdAt = "2026-07-06T00:00:00.000Z";
const expiresAt = "2026-07-06T00:30:00.000Z";

function expectNoExecutionReadiness(decision: ExecutionPolicyDecision): void {
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

function decision(capabilityKind: ExecutionCapabilityKind): ExecutionPolicyDecision {
  return evaluateExecutionPolicy({
    mode: "approval_mode",
    capabilityKind,
    approvedLane: "existing_approved_lane",
    fixedVerificationLane: true,
    createdAt
  });
}

describe("high privilege boundary smoke", () => {
  it("blocks high-privilege execution capabilities in approval mode", () => {
    const blockedCapabilities: ExecutionCapabilityKind[] = [
      "shell_arbitrary",
      "recursive_delete",
      "git_commit",
      "git_push",
      "autonomous_loop",
      "raw_output_persistence",
      "native_bridge",
      "mcp_mutating_tool",
      "plugin_code_execution",
      "skill_code_execution"
    ];

    for (const capabilityKind of blockedCapabilities) {
      const result = decision(capabilityKind);

      expect(result.status).toBe("blocked");
      expect(result.summaryOnly).toBe(true);
      expectNoExecutionReadiness(result);
    }
  });

  it("blocks custom shell commands while fixed verification lanes remain planned", () => {
    const allowlist = createDefaultShellAllowlist();
    const custom = planShellCommand(
      {
        commandId: "pnpm.typecheck",
        command: "pnpm typecheck && echo unsafe",
        planId: "custom-shell"
      },
      allowlist,
      { clock: () => new Date(createdAt), idFactory: () => "custom-shell" }
    );
    const fixed = planShellCommand(
      { commandId: "pnpm.typecheck", planId: "fixed-shell" },
      allowlist,
      { clock: () => new Date(createdAt), idFactory: () => "fixed-shell" }
    );

    expect(custom.status).toBe("rejected");
    expect(custom.warnings.map((warning) => warning.code)).toContain(
      "arbitrary_command_string"
    );
    expect(custom.argv).toHaveLength(0);
    expect(fixed.status).toBe("planned");
    expect(fixed.executionMode).toBe("SIMULATE");
    expect(fixed.argv).toEqual(["pnpm", "typecheck"]);
  });

  it("blocks auto apply outside existing approved path while approved receipts remain ready", () => {
    const patchApply = evaluateExecutionPolicy({
      mode: "read_only_preview",
      capabilityKind: "patch_apply"
    });
    const unsafeReceipt = buildAppApprovedExecutionReceipt({
      scope: {
        receiptId: "receipt-unsafe-apply",
        kind: "apply",
        workspaceRootRef: "workspace:demo",
        proposalId: "proposal-1",
        validationId: "validation-1",
        auditId: "audit-1",
        approvalDraftId: "approval-1",
        allowedRelativePaths: ["../outside.ts"],
        maxFiles: 1,
        maxBytes: 10_000,
        expiresAt,
        typedConfirmation: "APPLY TO USER WORKSPACE"
      },
      createdAt
    });
    const approvedApply = buildAppApprovedExecutionReceipt({
      scope: {
        receiptId: "receipt-approved-apply",
        kind: "apply",
        workspaceRootRef: "workspace:demo",
        proposalId: "proposal-1",
        validationId: "validation-1",
        auditId: "audit-1",
        approvalDraftId: "approval-1",
        allowedRelativePaths: ["docs/safe.md"],
        maxFiles: 1,
        maxBytes: 10_000,
        expiresAt,
        typedConfirmation: "APPLY TO USER WORKSPACE"
      },
      createdAt
    });
    const approvedRollback = buildAppApprovedExecutionReceipt({
      scope: {
        receiptId: "receipt-approved-rollback",
        kind: "rollback",
        workspaceRootRef: "workspace:demo",
        proposalId: "proposal-1",
        validationId: "validation-1",
        auditId: "audit-1",
        approvalDraftId: "approval-1",
        checkpointId: "checkpoint-1",
        allowedRelativePaths: ["docs/safe.md"],
        maxFiles: 1,
        maxBytes: 10_000,
        expiresAt,
        typedConfirmation: "ROLLBACK USER WORKSPACE"
      },
      createdAt
    });

    expect(patchApply.status).toBe("blocked");
    expectNoExecutionReadiness(patchApply);
    expect(unsafeReceipt.status).toBe("blocked");
    expect(unsafeReceipt.findings.map((finding) => finding.code)).toContain(
      "APP_APPROVED_RECEIPT_UNSAFE_PATH"
    );
    expect(approvedApply.status).toBe("ready");
    expect(approvedRollback.status).toBe("ready");
    expect(approvedApply.readiness.canApplyPatch).toBe(false);
    expect(approvedRollback.readiness.canRollback).toBe(false);
  });

  it("keeps Git write lanes disabled while read-only lanes remain planned", () => {
    const statusPlan = planGitSafeCommand({
      commandKind: "status",
      planId: "git-status"
    });
    const commitPlan = planGitSafeCommand({
      commandKind: "commit",
      planId: "git-commit"
    });
    const pushPlan = planGitSafeCommand({
      commandKind: "push",
      planId: "git-push"
    });

    expect(statusPlan.status).toBe("planned");
    expect(statusPlan.lane).toBe("read_only");
    expect(commitPlan.status).toBe("disabled");
    expect(commitPlan.lane).toBe("write_disabled");
    expect(pushPlan.status).toBe("disabled");
    expect(pushPlan.lane).toBe("write_disabled");
  });

  it("keeps Full Access as metadata preview only", () => {
    const policy = buildPermissionModePolicy({
      mode: "full_access_mode",
      createdAt,
      idGenerator: () => "policy-full-access-smoke"
    });
    const lease = buildPermissionSessionLease({
      mode: "full_access_mode",
      workspaceRootRef: "workspace:demo",
      scopeSummary: "Full Access metadata smoke.",
      requestedBy: "test_fixture",
      reasonSummary: "Verify Full Access remains metadata-only in v0.34.",
      typedConfirmation: FULL_ACCESS_CONFIRMATION,
      createdAt,
      expiresAt,
      idGenerator: () => "lease-full-access-smoke"
    });

    expect(policy.status).toBe("valid");
    expect(policy.futureAllowedCapabilityFlags).toContain("canRunArbitraryShell");
    expect(policy.readiness.canEnableFullAccessExecution).toBe(false);
    expect(policy.readiness.canRunArbitraryShell).toBe(false);
    expect(policy.readiness.canGitPush).toBe(false);
    expect(policy.readiness.appCanExecute).toBe(false);
    expect(lease.status).toBe("valid");
    expect(lease.readiness.canEnableFullAccessExecution).toBe(false);
    expect(lease.readiness.appCanExecute).toBe(false);
  });

  it("blocks broad desktop automation while existing approved lane requires approval", () => {
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
    expect(broad.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_POLICY_DESKTOP_ACTION_BROAD_LANE_BLOCKED"
    );
    expect(existing.status).toBe("requires_approval");
    expect(existing.readiness.canExecuteNow).toBe(false);
    expectNoExecutionReadiness(broad);
    expectNoExecutionReadiness(existing);
  });
});
