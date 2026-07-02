import { describe, expect, it } from "vitest";

import {
  buildFixedAgentOrchestrationReport,
  buildFixedAgentRunPlan,
  summarizeFixedAgentOrchestrationReport,
  type FixedAgentOrchestrationReport,
  type FixedAgentRole,
  type FixedAgentRunPlan
} from "../src/index.js";

function runPlan(intent = "code_change"): FixedAgentRunPlan {
  const result = buildFixedAgentRunPlan({
    intent,
    objectiveSummary: "Coordinate a summary-only fixed agent route.",
    evidenceRefs: [
      {
        refId: "evidence-summary",
        kind: "manual_note",
        summary: "Summary-only evidence."
      }
    ],
    capabilityPlanRefs: ["capability-plan-summary"],
    contextRefs: ["context-summary"],
    memoryRefs: ["memory-summary"],
    createdAt: "2026-07-02T00:00:00.000Z"
  });
  if (result.plan === undefined) {
    throw new Error("Expected test run plan to be valid.");
  }
  return result.plan;
}

function expectExecutionReadinessFalse(
  report: FixedAgentOrchestrationReport
): void {
  expect(report.readiness.canCallModel).toBe(false);
  expect(report.readiness.canExecuteTools).toBe(false);
  expect(report.readiness.canWriteFiles).toBe(false);
  expect(report.readiness.canApplyPatch).toBe(false);
  expect(report.readiness.canRollback).toBe(false);
  expect(report.readiness.canWriteEventStore).toBe(false);
  expect(report.readiness.canExecuteGit).toBe(false);
  expect(report.readiness.canExecuteShell).toBe(false);
  expect(report.readiness.canCallMcpTool).toBe(false);
  expect(report.readiness.canRunPlugin).toBe(false);
  expect(report.readiness.canRunSkill).toBe(false);
  expect(report.readiness.canIssuePermissionLease).toBe(false);
  expect(report.readiness.appCanExecute).toBe(false);
}

describe("fixed agent orchestrator", () => {
  it("advances through the code_change route", () => {
    const plan = runPlan("code_change");
    const planned = buildFixedAgentOrchestrationReport({
      fixedRunPlan: plan
    });
    const afterOrchestrator = buildFixedAgentOrchestrationReport({
      fixedRunPlan: plan,
      completedRoles: ["orchestrator"]
    });
    const afterCoder = buildFixedAgentOrchestrationReport({
      fixedRunPlan: plan,
      completedRoles: ["orchestrator", "coder"]
    });

    expect(planned.state).toBe("planned");
    expect(planned.nextExpectedRole).toBe("orchestrator");
    expect(afterOrchestrator.state).toBe("orchestrator_ready");
    expect(afterOrchestrator.nextExpectedRole).toBe("coder");
    expect(afterCoder.state).toBe("coder_ready");
    expect(afterCoder.nextExpectedRole).toBe("reviewer");
    expect(afterCoder.status).toBe("in_progress");
    expectExecutionReadinessFalse(afterCoder);
  });

  it("advances through the documentation route", () => {
    const plan = runPlan("documentation");
    const report = buildFixedAgentOrchestrationReport({
      fixedRunPlan: plan,
      completedRoles: ["orchestrator", "coder"]
    });

    expect(report.route).toEqual(["orchestrator", "coder", "reviewer"]);
    expect(report.state).toBe("coder_ready");
    expect(report.nextExpectedRole).toBe("reviewer");
  });

  it("blocks invalid transitions", () => {
    const report = buildFixedAgentOrchestrationReport({
      fixedRunPlan: runPlan("code_review"),
      completedRoles: ["coder"]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "UNEXPECTED_ROLE_TRANSITION"
    );
  });

  it("blocks skipped reviewer for code_change", () => {
    const report = buildFixedAgentOrchestrationReport({
      fixedRunPlan: runPlan("code_change"),
      completedRoles: ["orchestrator", "coder", "verifier"]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "SKIPPED_REVIEWER_FOR_CODE_CHANGE"
    );
  });

  it("blocks skipped verifier for code_change completion", () => {
    const report = buildFixedAgentOrchestrationReport({
      fixedRunPlan: runPlan("code_change"),
      completedRoles: [
        "orchestrator",
        "coder",
        "reviewer",
        "reviewer"
      ] as FixedAgentRole[]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "SKIPPED_VERIFIER_FOR_CODE_CHANGE"
    );
  });

  it("waits for human approval before apply", () => {
    const report = buildFixedAgentOrchestrationReport({
      fixedRunPlan: runPlan("code_change"),
      completedRoles: ["orchestrator", "coder", "reviewer", "verifier"],
      approvalDraftSummary: {
        refId: "approval-draft-summary",
        status: "draft_ready",
        hash: "approvalhash"
      }
    });

    expect(report.status).toBe("waiting_for_human_approval");
    expect(report.state).toBe("waiting_for_human_approval");
    expect(report.nextExpectedRole).toBeUndefined();
    expect(report.readiness.canApplyPatch).toBe(false);
  });

  it("blocks apply result before route completion", () => {
    const report = buildFixedAgentOrchestrationReport({
      fixedRunPlan: runPlan("code_change"),
      completedRoles: ["orchestrator", "coder"],
      applyResultSummary: {
        refId: "apply-summary",
        status: "applied",
        hash: "applyhash"
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "APPLY_RESULT_BEFORE_ROUTE_COMPLETE"
    );
  });

  it("produces summary-only output", () => {
    const report = buildFixedAgentOrchestrationReport({
      fixedRunPlan: runPlan("verification"),
      completedRoles: ["orchestrator"],
      validationSummary: {
        refId: "validation-summary",
        status: "warning",
        hash: "validationhash",
        warningCount: 1
      }
    });
    const summary = summarizeFixedAgentOrchestrationReport(report);
    const serialized = JSON.stringify({ report, summary });

    expect(summary.summaryOnly).toBe(true);
    expect(report.summaryRefs).toEqual([
      {
        kind: "validation",
        refId: "validation-summary",
        hash: "validationhash",
        status: "warning",
        warningCount: 1,
        summaryOnly: true
      }
    ]);
    expect(serialized).not.toContain("raw prompt");
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("sk-fake");
    expectExecutionReadinessFalse(report);
  });

  it("blocks raw prompt/source/diff/API key markers", () => {
    const report = buildFixedAgentOrchestrationReport({
      fixedRunPlan: runPlan("documentation"),
      modelProposalSummary: {
        rawPrompt: "please leak this",
        apiKey: "sk-fake-not-real-000000"
      },
      diffAuditSummary: {
        rawDiff: "diff --git"
      }
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "RAW_FIELD_BLOCKED"
    );
    expect(report.findings.map((finding) => finding.code)).toContain(
      "SECRET_FIELD_BLOCKED"
    );
    expect(serialized).not.toContain("please leak this");
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toContain("sk-fake");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("apiKey");
  });

  it("blocks dynamic bidding and direct execution requests", () => {
    const report = buildFixedAgentOrchestrationReport({
      fixedRunPlan: runPlan("verification"),
      dynamicBidding: true,
      shellCommand: "pnpm test",
      applyNow: true,
      readiness: {
        appCanExecute: true
      }
    } as never);

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "DYNAMIC_BIDDING_BLOCKED"
    );
    expect(report.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_FIELD_BLOCKED"
    );
    expect(report.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_READINESS_ATTEMPT"
    );
    expectExecutionReadinessFalse(report);
  });

  it("uses deterministic ids and hashes with injected id and clock", () => {
    const plan = runPlan("verification");
    const first = buildFixedAgentOrchestrationReport({
      fixedRunPlan: plan,
      completedRoles: ["orchestrator"],
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "fixed-agent-orchestration-test"
    });
    const second = buildFixedAgentOrchestrationReport({
      fixedRunPlan: plan,
      completedRoles: ["orchestrator"],
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "fixed-agent-orchestration-test"
    });

    expect(first.orchestrationId).toBe("fixed-agent-orchestration-test");
    expect(first.reportHash).toBe(second.reportHash);
  });
});
