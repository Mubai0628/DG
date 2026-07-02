import { describe, expect, it } from "vitest";

import {
  buildFixedAgentRoleOutput,
  summarizeFixedAgentRoleOutput,
  type FixedAgentRoleOutputValidationResult
} from "../src/index.js";

function expectExecutionReadinessFalse(
  result: FixedAgentRoleOutputValidationResult
): void {
  expect(result.readiness.canCallModel).toBe(false);
  expect(result.readiness.canExecuteTools).toBe(false);
  expect(result.readiness.canWriteFiles).toBe(false);
  expect(result.readiness.canApplyPatch).toBe(false);
  expect(result.readiness.canRollback).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canExecuteGit).toBe(false);
  expect(result.readiness.canExecuteShell).toBe(false);
  expect(result.readiness.canCallMcpTool).toBe(false);
  expect(result.readiness.canRunPlugin).toBe(false);
  expect(result.readiness.canRunSkill).toBe(false);
  expect(result.readiness.canIssuePermissionLease).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("fixed agent role adapters", () => {
  it("builds orchestrator summary output", () => {
    const result = buildFixedAgentRoleOutput({
      role: "orchestrator",
      routeSummary: {
        refId: "route-summary",
        hash: "routehash",
        status: "planned"
      },
      taskDecompositionSummary: {
        refId: "task-decomposition",
        hash: "decompositionhash"
      },
      expectedArtifacts: [
        {
          refId: "expected-doc",
          hash: "artifacthash"
        }
      ]
    });

    expect(result.status).toBe("ready");
    expect(result.output?.role).toBe("orchestrator");
    expect(result.output?.routeSummaryRefs).toHaveLength(1);
    expect(result.output?.taskDecompositionSummaryRefs).toHaveLength(1);
    expect(result.output?.expectedArtifactRefs).toHaveLength(1);
    expect(result.output?.summaryOnly).toBe(true);
    expectExecutionReadinessFalse(result);
  });

  it("builds coder summary output", () => {
    const result = buildFixedAgentRoleOutput({
      role: "coder",
      modelProposalImportSummaryRefs: [
        {
          refId: "model-import-summary",
          hash: "modelimporthash",
          status: "imported"
        }
      ],
      patchProposalSummary: {
        refId: "patch-proposal-summary",
        hash: "patchhash",
        status: "preview"
      }
    });

    expect(result.status).toBe("ready");
    expect(result.output?.modelProposalImportSummaryRefs).toHaveLength(1);
    expect(result.output?.patchProposalSummaryRefs).toHaveLength(1);
  });

  it("builds reviewer summary output", () => {
    const result = buildFixedAgentRoleOutput({
      role: "reviewer",
      validationSummaryRefs: [{ refId: "validation", hash: "validationhash" }],
      auditSummaryRefs: [{ refId: "audit", hash: "audithash" }],
      approvalSummaryRefs: [{ refId: "approval", hash: "approvalhash" }],
      riskNotes: ["Review path scope and approval blockers."]
    });

    expect(result.status).toBe("ready");
    expect(result.output?.validationAuditApprovalRefs).toHaveLength(3);
    expect(result.output?.riskNotes).toEqual([
      "Review path scope and approval blockers."
    ]);
  });

  it("builds verifier summary output", () => {
    const result = buildFixedAgentRoleOutput({
      role: "verifier",
      status: "warn",
      gitSafeLaneSummaries: [{ refId: "git-status", hash: "githash" }],
      shellSafeLaneSummaries: [{ refId: "scoped-test", hash: "shellhash" }],
      evidenceRefs: [{ refId: "test-evidence", hash: "evidencehash" }]
    });

    expect(result.status).toBe("ready");
    expect(result.output?.status).toBe("warn");
    expect(result.output?.gitShellSafeLaneRefs).toHaveLength(2);
    expect(result.output?.evidenceRefs).toHaveLength(1);
    expect(result.output?.passWarnBlockSummary).toMatchObject({
      status: "warn",
      summaryOnly: true
    });
  });

  it("blocks unknown roles", () => {
    const result = buildFixedAgentRoleOutput({
      role: "planner"
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("UNKNOWN_ROLE");
  });

  it("blocks raw fields and secret markers", () => {
    const result = buildFixedAgentRoleOutput({
      role: "coder",
      rawPrompt: "do not expose",
      rawSource: "const secret = true",
      apiKey: "sk-fake-not-real-000000"
    } as never);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("RAW_FIELD_BLOCKED");
    expect(result.summary.blockerCodes).toContain("SECRET_FIELD_BLOCKED");
    expect(serialized).not.toContain("do not expose");
    expect(serialized).not.toContain("const secret = true");
    expect(serialized).not.toContain("sk-fake");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("apiKey");
  });

  it("blocks direct execution claims", () => {
    const result = buildFixedAgentRoleOutput({
      role: "verifier",
      appliedPatch: true,
      calledGit: true,
      shellCommand: "pnpm test",
      readiness: {
        appCanExecute: true
      }
    } as never);

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain(
      "APPLIED_PATCH_CLAIM_BLOCKED"
    );
    expect(result.summary.blockerCodes).toContain(
      "DIRECT_TOOL_CALL_CLAIM_BLOCKED"
    );
    expect(result.summary.blockerCodes).toContain("EXECUTION_FIELD_BLOCKED");
    expect(result.summary.blockerCodes).toContain(
      "EXECUTION_READINESS_ATTEMPT"
    );
    expectExecutionReadinessFalse(result);
  });

  it("blocks dynamic bidding and hidden raw context", () => {
    const result = buildFixedAgentRoleOutput({
      role: "orchestrator",
      dynamicBidding: true,
      hiddenContext: "private raw context"
    } as never);

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("DYNAMIC_BIDDING_BLOCKED");
    expect(result.summary.blockerCodes).toContain("HIDDEN_RAW_CONTEXT_BLOCKED");
  });

  it("keeps output summary-only", () => {
    const result = buildFixedAgentRoleOutput({
      role: "reviewer",
      validationSummaryRefs: [{ refId: "validation", hash: "validationhash" }],
      riskNotes: ["Risk note summary only."]
    });
    const output = result.output!;
    const summary = summarizeFixedAgentRoleOutput(output);
    const serialized = JSON.stringify({ result, summary });

    expect(output.summaryOnly).toBe(true);
    expect(summary.summaryOnly).toBe(true);
    expect(serialized).not.toContain("raw prompt");
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("sk-fake");
    expectExecutionReadinessFalse(result);
  });

  it("uses deterministic output ids and hashes with injected id", () => {
    const input = {
      role: "verifier",
      evidenceRefs: [{ refId: "evidence", hash: "evidencehash" }],
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "fixed-role-output-test"
    };
    const first = buildFixedAgentRoleOutput(input);
    const second = buildFixedAgentRoleOutput(input);

    expect(first.output?.outputId).toBe("fixed-role-output-test");
    expect(first.output?.outputHash).toBe(second.output?.outputHash);
    expect(first.normalizedHash).toBe(second.normalizedHash);
  });
});
