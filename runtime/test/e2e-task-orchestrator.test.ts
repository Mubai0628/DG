import { describe, expect, it } from "vitest";

import {
  buildEndToEndCodingTaskOrchestrator,
  summarizeEndToEndCodingTaskOrchestrator,
  type EndToEndCodingTaskOrchestratorView
} from "../src/index.js";

function summary(refId: string, status = "ready") {
  return {
    refId,
    status,
    summary: `${refId} summary`,
    warningCodes: [],
    blockerCodes: []
  };
}

function happyPathInput() {
  return {
    objectiveSummary: "Create a docs note and verify it.",
    liveProposalGenerationSummary: summary("live-proposal"),
    modelProposalImportSummary: summary("model-import"),
    chainIntegrationSummary: summary("chain-integration"),
    validationAuditApprovalSummary: summary("validation-audit-approval"),
    approvalReceiptSummary: summary("approval-receipt"),
    applyResultSummary: summary("approved-apply"),
    verificationResultSummary: summary("verification-pass"),
    replaySummary: summary("replay")
  };
}

function expectNoExecution(view: EndToEndCodingTaskOrchestratorView): void {
  expect(view.readiness).toMatchObject({
    canCallLiveModel: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canAutoApply: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("end-to-end coding task orchestrator", () => {
  it("projects the normal happy path to completed", () => {
    const view = buildEndToEndCodingTaskOrchestrator({
      ...happyPathInput(),
      taskRunId: "task-run-happy"
    });
    const summaryView = summarizeEndToEndCodingTaskOrchestrator(view);

    expect(view.state).toBe("completed");
    expect(view.completedStageCount).toBe(9);
    expect(view.missingStageCount).toBe(1);
    expect(view.blockerCount).toBe(0);
    expect(view.stageTimeline.map((stage) => stage.kind)).toContain(
      "live_proposal_generation"
    );
    expect(summaryView.state).toBe("completed");
    expectNoExecution(view);
  });

  it("moves verification failure to rollback_ready", () => {
    const view = buildEndToEndCodingTaskOrchestrator({
      ...happyPathInput(),
      verificationResultSummary: {
        ...summary("verification-failed", "warning"),
        warningCodes: ["VERIFICATION_FAILED"]
      },
      replaySummary: undefined,
      taskRunId: "task-run-rollback-ready"
    });

    expect(view.state).toBe("rollback_ready");
    expect(view.warningCount).toBeGreaterThan(0);
    expect(view.nextAction).toContain("rollback");
    expectNoExecution(view);
  });

  it("moves rollback result to rolled_back", () => {
    const view = buildEndToEndCodingTaskOrchestrator({
      ...happyPathInput(),
      verificationResultSummary: {
        ...summary("verification-failed", "warning"),
        warningCodes: ["VERIFICATION_FAILED"]
      },
      rollbackResultSummary: summary("approved-rollback"),
      replaySummary: undefined,
      taskRunId: "task-run-rolled-back"
    });

    expect(view.state).toBe("rolled_back");
    expect(
      view.stageTimeline.find((stage) => stage.kind === "rollback")
    ).toMatchObject({
      status: "completed",
      refId: "approved-rollback"
    });
    expectNoExecution(view);
  });

  it("blocks the chain when a proposal summary is blocked", () => {
    const view = buildEndToEndCodingTaskOrchestrator({
      objectiveSummary: "Blocked proposal.",
      liveProposalGenerationSummary: {
        ...summary("blocked-proposal", "blocked"),
        blockerCodes: ["UNSAFE_PATH"]
      },
      taskRunId: "task-run-blocked"
    });

    expect(view.state).toBe("blocked");
    expect(view.blockerCount).toBeGreaterThan(0);
    expect(view.readiness.canAdvanceStateMachine).toBe(false);
    expect(view.findings.map((finding) => finding.code)).toContain(
      "STAGE_SUMMARY_BLOCKED"
    );
    expectNoExecution(view);
  });

  it("blocks raw content and secret markers without echoing them", () => {
    const view = buildEndToEndCodingTaskOrchestrator({
      ...happyPathInput(),
      liveProposalGenerationSummary: {
        ...summary("unsafe-live-proposal"),
        rawResponse: "raw model response text",
        reasoning_content: "hidden reasoning text",
        summary: "sk-test1234567890abcdef"
      },
      taskRunId: "task-run-raw-blocked"
    });
    const serialized = JSON.stringify(view);

    expect(view.state).toBe("blocked");
    expect(view.findings.map((finding) => finding.code)).toContain(
      "RAW_RESPONSE_FIELD_REJECTED"
    );
    expect(view.findings.map((finding) => finding.code)).toContain(
      "REASONING_CONTENT_FIELD_REJECTED"
    );
    expect(view.findings.map((finding) => finding.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(serialized).not.toContain("raw model response text");
    expect(serialized).not.toContain("hidden reasoning text");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expectNoExecution(view);
  });

  it("blocks execution claims", () => {
    const view = buildEndToEndCodingTaskOrchestrator({
      ...happyPathInput(),
      applyResultSummary: {
        ...summary("bad-apply"),
        canAutoApply: true,
        canExecuteGit: true,
        arbitraryShell: true
      },
      taskRunId: "task-run-execution-claim"
    });

    expect(view.state).toBe("blocked");
    expect(view.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_CLAIM_TRUE"
    );
    expectNoExecution(view);
  });

  it("generates deterministic ids and hashes with injected id", () => {
    const first = buildEndToEndCodingTaskOrchestrator({
      ...happyPathInput(),
      idGenerator: () => "deterministic-task-run"
    });
    const second = buildEndToEndCodingTaskOrchestrator({
      ...happyPathInput(),
      idGenerator: () => "deterministic-task-run"
    });

    expect(first.taskRunId).toBe("deterministic-task-run");
    expect(first.orchestratorHash).toBe(second.orchestratorHash);
    expectNoExecution(first);
  });
});
