import { describe, expect, it } from "vitest";

import {
  buildApprovalConsistencyReport,
  summarizeApprovalConsistencyReport,
  type ApprovalConsistencyReport,
  type ApprovalConsistencyScope
} from "../src/workflows/approval-consistency-check.js";

const safeScopes: ApprovalConsistencyScope[] = [
  {
    scopeId: "apply-receipt-1",
    kind: "user_workspace_apply_receipt",
    stageKind: "workspace_apply",
    taskId: "task-1",
    workflowScenarioId: "scenario-1",
    workspaceRootRef: "workspace-ref",
    proposalId: "proposal-1",
    allowedPathRefs: ["docs/example.md"],
    expiresAt: "2026-07-06T00:00:00.000Z",
    typedConfirmationPresent: true,
    maxFiles: 2,
    maxBytes: 4096,
    summary: "Apply receipt summary."
  },
  {
    scopeId: "desktop-receipt-1",
    kind: "desktop_action_approval",
    stageKind: "desktop_action",
    taskId: "task-1",
    workflowScenarioId: "scenario-1",
    workspaceRootRef: "workspace-ref",
    proposalId: "proposal-1",
    allowedPathRefs: ["desktop-target:button"],
    targetRef: "desktop-target:button",
    expiresAt: "2026-07-06T00:00:00.000Z",
    typedConfirmationPresent: true,
    summary: "Desktop action approval summary."
  }
];

function expectNoExecution(report: ApprovalConsistencyReport): void {
  expect(report.readiness.canApprove).toBe(false);
  expect(report.readiness.canReject).toBe(false);
  expect(report.readiness.canApplyPatch).toBe(false);
  expect(report.readiness.canRollback).toBe(false);
  expect(report.readiness.canIssuePermissionLease).toBe(false);
  expect(report.readiness.canWriteEventStore).toBe(false);
  expect(report.readiness.canExecuteDesktopAction).toBe(false);
  expect(report.readiness.canExecuteGit).toBe(false);
  expect(report.readiness.canExecuteShell).toBe(false);
  expect(report.readiness.appCanExecute).toBe(false);
}

describe("approval consistency check", () => {
  it("marks matching receipts consistent", () => {
    const report = buildApprovalConsistencyReport({
      scopes: safeScopes,
      expectedTaskId: "task-1",
      expectedWorkflowScenarioId: "scenario-1",
      expectedWorkspaceRootRef: "workspace-ref",
      expectedProposalId: "proposal-1",
      createdAt: "2026-07-05T00:00:00.000Z",
      idGenerator: () => "approval-consistency-test"
    });
    const summary = summarizeApprovalConsistencyReport(report);

    expect(report.status).toBe("consistent");
    expect(report.consistencyId).toBe("approval-consistency-test");
    expect(report.scopeCount).toBe(2);
    expect(report.consistentScopeCount).toBe(2);
    expect(summary.source).toBe("runtime_approval_consistency_check");
    expect(report.readiness.canUseForAdvisoryReview).toBe(true);
    expectNoExecution(report);
  });

  it("blocks expired receipts and mismatched refs", () => {
    const report = buildApprovalConsistencyReport({
      scopes: [
        {
          ...safeScopes[0],
          taskId: "other-task",
          workspaceRootRef: "other-workspace",
          proposalId: "other-proposal",
          expiresAt: "2026-07-04T00:00:00.000Z"
        }
      ],
      expectedTaskId: "task-1",
      expectedWorkspaceRootRef: "workspace-ref",
      expectedProposalId: "proposal-1",
      createdAt: "2026-07-05T00:00:00.000Z"
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "EXPIRED_RECEIPT",
        "TASK_ID_MISMATCH",
        "WORKSPACE_ROOT_REF_MISMATCH",
        "PROPOSAL_ID_MISMATCH"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks cross-lane receipt misuse and broad leases", () => {
    const report = buildApprovalConsistencyReport({
      scopes: [
        {
          ...safeScopes[0],
          stageKind: "desktop_action",
          broadLease: true,
          allowedPathRefs: ["*"]
        },
        {
          ...safeScopes[1],
          stageKind: "workspace_apply"
        },
        {
          scopeId: "mcp-approval-1",
          kind: "mcp_readonly_tool_approval",
          stageKind: "plugin_skill_runtime",
          allowedPathRefs: ["mcp:docs.search"],
          expiresAt: "2026-07-06T00:00:00.000Z",
          summary: "MCP approval summary."
        }
      ],
      createdAt: "2026-07-05T00:00:00.000Z"
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "APPLY_RECEIPT_USED_FOR_DESKTOP_ACTION",
        "DESKTOP_RECEIPT_USED_FOR_WORKSPACE_APPLY",
        "MCP_APPROVAL_USED_FOR_PLUGIN_SKILL_ACTION",
        "BROAD_PERMISSION_LEASE",
        "BROAD_WILDCARD_SCOPE"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks missing typed confirmation where required", () => {
    const report = buildApprovalConsistencyReport({
      scopes: [
        {
          ...safeScopes[0],
          typedConfirmationPresent: false
        }
      ],
      createdAt: "2026-07-05T00:00:00.000Z"
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "MISSING_TYPED_CONFIRMATION"
    );
    expectNoExecution(report);
  });

  it("blocks raw fields, API key markers, and execution readiness", () => {
    const report = buildApprovalConsistencyReport({
      scopes: [
        {
          ...safeScopes[0],
          rawPrompt: "do not leak raw prompt",
          summary: "Bearer abcdefghijklmnop",
          readiness: {
            canApplyPatch: true
          }
        }
      ],
      createdAt: "2026-07-05T00:00:00.000Z"
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "FORBIDDEN_FIELD",
        "BEARER_TOKEN_MARKER",
        "EXECUTION_FLAG_TRUE"
      ])
    );
    expect(serialized).not.toContain("do not leak raw prompt");
    expect(serialized).not.toContain("Bearer abcdefghijklmnop");
    expectNoExecution(report);
  });

  it("keeps output deterministic and summary-only", () => {
    const first = buildApprovalConsistencyReport({
      scopes: safeScopes,
      createdAt: "2026-07-05T00:00:00.000Z",
      idGenerator: () => "approval-consistency-deterministic"
    });
    const second = buildApprovalConsistencyReport({
      scopes: safeScopes,
      createdAt: "2026-07-05T00:00:00.000Z",
      idGenerator: () => "approval-consistency-deterministic"
    });
    const serialized = JSON.stringify(first);

    expect(first.consistencyHash).toBe(second.consistencyHash);
    expect(serialized).not.toContain("raw prompt");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("apiKey");
    expectNoExecution(first);
  });
});
