import { describe, expect, it } from "vitest";

import {
  buildAgentHandoffStateReviewReport,
  summarizeAgentHandoffStateReviewReport,
  type AgentHandoffStageInput,
  type AgentHandoffStateReviewReport
} from "../src/workflows/agent-handoff-state-review.js";

const safeStages: AgentHandoffStageInput[] = [
  {
    stageId: "orchestrator-stage",
    role: "orchestrator",
    status: "completed",
    summary: "Orchestrator route summary.",
    outputRef: "orchestrator-output",
    dossierHash: "hash-orchestrator",
    expectedDossierHash: "hash-orchestrator",
    evidenceRefs: ["objective-ref"],
    contextRefs: ["context-ref"]
  },
  {
    stageId: "coder-stage",
    role: "coder",
    status: "completed",
    summary: "Coder proposal summary.",
    outputRef: "coder-output",
    proposalId: "proposal-1",
    dossierHash: "hash-coder",
    expectedDossierHash: "hash-coder",
    evidenceRefs: ["proposal-ref"],
    contextRefs: ["context-ref"]
  },
  {
    stageId: "reviewer-stage",
    role: "reviewer",
    status: "completed",
    summary: "Reviewer validation summary.",
    outputRef: "reviewer-output",
    dossierHash: "hash-reviewer",
    expectedDossierHash: "hash-reviewer",
    evidenceRefs: ["validation-ref"],
    contextRefs: ["context-ref"]
  },
  {
    stageId: "verifier-stage",
    role: "verifier",
    status: "completed",
    summary: "Verifier result summary.",
    outputRef: "verifier-output",
    verificationSummaryRef: "verification-ref",
    dossierHash: "hash-verifier",
    expectedDossierHash: "hash-verifier",
    evidenceRefs: ["verification-ref"],
    contextRefs: ["context-ref"]
  }
];

function safeStage(index: number): AgentHandoffStageInput {
  const stage = safeStages[index];
  if (stage === undefined) {
    throw new Error(`Missing safe stage fixture at index ${index}`);
  }
  return stage;
}

function expectNoExecution(report: AgentHandoffStateReviewReport): void {
  expect(report.readiness.canRerunAgent).toBe(false);
  expect(report.readiness.canCreateDynamicAgent).toBe(false);
  expect(report.readiness.canBidAgents).toBe(false);
  expect(report.readiness.canInvokeTools).toBe(false);
  expect(report.readiness.canApplyPatch).toBe(false);
  expect(report.readiness.canRollback).toBe(false);
  expect(report.readiness.canWriteEventStore).toBe(false);
  expect(report.readiness.canExecuteGit).toBe(false);
  expect(report.readiness.canExecuteShell).toBe(false);
  expect(report.readiness.appCanExecute).toBe(false);
}

describe("agent handoff state review", () => {
  it("marks safe handoff stages review ready", () => {
    const report = buildAgentHandoffStateReviewReport({
      stages: safeStages,
      idGenerator: () => "agent-handoff-review-test"
    });
    const summary = summarizeAgentHandoffStateReviewReport(report);

    expect(report.status).toBe("review_ready");
    expect(report.reviewId).toBe("agent-handoff-review-test");
    expect(report.stageCount).toBe(4);
    expect(report.completedStageCount).toBe(4);
    expect(report.missingRoleOutputCount).toBe(0);
    expect(report.readiness.canReviewHandoffState).toBe(true);
    expect(summary.source).toBe("runtime_agent_handoff_state_review");
    expectNoExecution(report);
  });

  it("blocks role order mismatch and skipped reviewer or verifier", () => {
    const report = buildAgentHandoffStateReviewReport({
      stages: [safeStage(1), safeStage(0)]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "ROLE_ORDER_MISMATCH",
        "REVIEWER_OR_VERIFIER_SKIPPED"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks missing outputs, stale dossier hashes, missing evidence, and role-specific refs", () => {
    const report = buildAgentHandoffStateReviewReport({
      stages: [
        {
          ...safeStage(1),
          outputRef: "",
          proposalId: "",
          dossierHash: "new-hash",
          expectedDossierHash: "old-hash",
          evidenceRefs: []
        },
        {
          ...safeStage(3),
          verificationSummaryRef: ""
        },
        safeStage(2),
        safeStage(0)
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "MISSING_ROLE_OUTPUT",
        "STALE_DOSSIER_HASH",
        "MISSING_EVIDENCE_REF",
        "CODER_OUTPUT_MISSING_PROPOSAL_ID",
        "VERIFIER_MISSING_VERIFICATION_SUMMARY",
        "ROLE_ORDER_MISMATCH"
      ])
    );
    expectNoExecution(report);
  });

  it("warns for stale long-running stages", () => {
    const report = buildAgentHandoffStateReviewReport({
      stages: [
        {
          ...safeStage(0),
          status: "running",
          startedAt: "2026-07-05T00:00:00.000Z"
        },
        safeStage(1),
        safeStage(2),
        safeStage(3)
      ],
      staleThresholdMs: 60_000,
      createdAt: "2026-07-05T00:02:00.000Z"
    });

    expect(report.status).toBe("warning");
    expect(report.staleStageCount).toBe(1);
    expect(report.findings.map((finding) => finding.code)).toContain(
      "LONG_RUNNING_STAGE_STALE"
    );
    expectNoExecution(report);
  });

  it("blocks interrupted recovery without nextAction", () => {
    const report = buildAgentHandoffStateReviewReport({
      stages: [
        {
          ...safeStage(0),
          status: "interrupted",
          nextAction: ""
        },
        safeStage(1),
        safeStage(2),
        safeStage(3)
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "INTERRUPTED_RECOVERY_MISSING_NEXT_ACTION"
    );
    expectNoExecution(report);
  });

  it("blocks raw fields, API key markers, and execution claims without leaking raw text", () => {
    const report = buildAgentHandoffStateReviewReport({
      stages: [
        {
          ...safeStage(0),
          summary: "Bearer abcdefghijklmnop",
          rawPrompt: "do not leak raw prompt",
          readiness: {
            canRerunAgent: true
          }
        },
        safeStage(1),
        safeStage(2),
        safeStage(3)
      ]
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "FORBIDDEN_RAW_HANDOFF_FIELD",
        "BEARER_TOKEN_MARKER",
        "EXECUTION_FLAG_TRUE"
      ])
    );
    expect(serialized).not.toContain("do not leak raw prompt");
    expect(serialized).not.toContain("Bearer abcdefghijklmnop");
    expectNoExecution(report);
  });

  it("keeps output deterministic and summary-only", () => {
    const first = buildAgentHandoffStateReviewReport({
      stages: safeStages,
      idGenerator: () => "agent-handoff-deterministic"
    });
    const second = buildAgentHandoffStateReviewReport({
      stages: safeStages,
      idGenerator: () => "agent-handoff-deterministic"
    });
    const serialized = JSON.stringify(first);

    expect(first.reviewHash).toBe(second.reviewHash);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("apiKey");
    expectNoExecution(first);
  });
});
