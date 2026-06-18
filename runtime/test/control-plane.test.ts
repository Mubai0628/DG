import { describe, expect, it } from "vitest";

import {
  ControlPlaneException,
  InMemoryEventStore,
  InMemoryRunRegistry,
  appendControlPlaneEventSummary,
  capabilityPlanToControlRef,
  createControlPlaneApprovalDecision,
  createControlPlaneApprovalRequest,
  createControlPlaneRun,
  createControlPlaneTask,
  createFakeShellRunner,
  createDefaultShellAllowlist,
  gitSummaryToControlRef,
  memoryRecallToControlRefs,
  parseGitStatusPorcelainV1,
  patchAuditToControlRef,
  planShellCommand,
  projectControlPlaneRunFromEvents,
  projectControlPlaneStateFromEvents,
  shellSummaryToControlRef,
  validateControlPlaneTask,
  validateControlPlaneTransition,
  webTableToCsvReplayToControlProjection
} from "../src/index.js";
import {
  type CapabilityInvocationPlan,
  type DiffAuditReport,
  type MemoryRecallResult
} from "../src/index.js";

const now = "2026-01-01T00:00:00.000Z";

function eventStore(): InMemoryEventStore {
  let id = 0;
  return new InMemoryEventStore({
    clock: () => new Date(now),
    idFactory: () => {
      id += 1;
      return `event-${id}`;
    }
  });
}

describe("Control-plane task and run lifecycle", () => {
  it("creates task and run with deterministic ids and summaries", () => {
    const task = createControlPlaneTask(
      {
        taskId: "task-1",
        intent: "code_change",
        objective: "Add a summary-only control-plane skeleton.",
        createdAt: now
      },
      { clock: () => new Date(now) }
    );
    const run = createControlPlaneRun(task, { runId: "run-1", now });

    expect(validateControlPlaneTask(task).ok).toBe(true);
    expect(task.objectiveSummary).toContain("summary-only");
    expect(run).toMatchObject({
      runId: "run-1",
      taskId: "task-1",
      status: "created",
      phase: "intake",
      approvalState: "none"
    });
  });

  it("maps unknown intent to needs_clarification", () => {
    const task = createControlPlaneTask({
      taskId: "task-unknown",
      intent: "mystery",
      objective: "Do something",
      createdAt: now
    });
    const run = createControlPlaneRun(task, { runId: "run-unknown", now });

    expect(task.intent).toBe("unknown");
    expect(run.status).toBe("needs_clarification");
    expect(task.warnings.map((item) => item.code)).toContain("unknown_intent");
  });

  it("rejects raw prompt, raw DOM, raw CSV, and API key markers", () => {
    for (const objective of [
      "rawPrompt should not enter control state",
      "rawDom should not enter control state",
      "rawCsv should not enter control state",
      "sk-test1234567890abcdef should not enter control state"
    ]) {
      expect(() =>
        createControlPlaneTask({
          taskId: "unsafe",
          intent: "documentation",
          objective
        })
      ).toThrow(ControlPlaneException);
    }
  });

  it("accepts valid transitions and rejects invalid or terminal transitions", () => {
    expect(validateControlPlaneTransition("created", "planned").ok).toBe(true);
    expect(
      validateControlPlaneTransition("planned", "awaiting_approval").ok
    ).toBe(true);
    expect(validateControlPlaneTransition("planned", "completed").ok).toBe(
      false
    );
    expect(validateControlPlaneTransition("completed", "running").ok).toBe(
      false
    );
  });

  it("stores runs in memory and summarizes lifecycle changes", () => {
    const task = createControlPlaneTask({
      taskId: "task-registry",
      intent: "verification",
      objective: "Verify control-plane state.",
      createdAt: now
    });
    const run = createControlPlaneRun(task, { runId: "run-registry", now });
    const registry = new InMemoryRunRegistry();

    registry.putTask(task);
    registry.putRun(run);
    registry.updateRunStatus("run-registry", "planned", now);
    registry.appendRunTimelineItem("run-registry", {
      id: "timeline-1",
      ts: now,
      type: "control.run.planned",
      runId: "run-registry",
      taskId: "task-registry",
      phase: "routing",
      status: "planned",
      summary: "Run planned"
    });

    const summary = registry.summarizeRun("run-registry");
    expect(summary).toMatchObject({
      runId: "run-registry",
      taskId: "task-registry",
      status: "planned",
      phase: "routing",
      timelineCount: 2
    });
  });
});

describe("Control-plane approvals and projection", () => {
  it("stores approval request and decision refs only", () => {
    const request = createControlPlaneApprovalRequest({
      approvalId: "approval-1",
      runId: "run-1",
      taskId: "task-1",
      requestedAt: now,
      capabilityPlanRefs: ["cap-1"],
      patchProposalRefs: ["patch-1"],
      gitIntentRefs: ["git-intent-1"],
      shellIntentRefs: ["shell-intent-1"],
      bridgeProposalRefs: ["bridge-1"],
      safeSummary: "Approve summarized patch and shell plan."
    });
    const decision = createControlPlaneApprovalDecision({
      approvalId: "approval-1",
      runId: "run-1",
      taskId: "task-1",
      decision: "approved",
      decidedAt: now,
      safeSummary: "Approved summarized refs."
    });
    const serialized = JSON.stringify({ request, decision });

    expect(serialized).toContain("patch-1");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("@@");
  });

  it("projects run state from control events", () => {
    const events = eventStore();
    appendControlPlaneEventSummary(events, {
      type: "control.task.created",
      taskId: "task-1",
      runId: "run-1",
      status: "created",
      phase: "intake",
      safeSummary: "Create task"
    });
    appendControlPlaneEventSummary(events, {
      type: "control.run.created",
      taskId: "task-1",
      runId: "run-1",
      status: "created",
      phase: "intake",
      safeSummary: "Create run"
    });
    appendControlPlaneEventSummary(events, {
      type: "control.run.status_changed",
      taskId: "task-1",
      runId: "run-1",
      status: "planned",
      phase: "routing",
      safeSummary: "Run planned"
    });

    const projection = projectControlPlaneStateFromEvents(events.listEvents());
    expect(projection.runs["run-1"]?.status).toBe("planned");
    expect(projection.timeline.length).toBe(3);
  });

  it("projects existing web_table_to_csv events without behavior changes", () => {
    const events = eventStore();
    events.appendEvent({
      type: "task.created",
      taskId: "task-web",
      payload: { title: "Export table" }
    });
    events.appendEvent({
      type: "task.started",
      taskId: "task-web",
      payload: { title: "Start export" }
    });
    events.appendEvent({
      type: "fs.draft_written",
      taskId: "task-web",
      payload: { relativePath: "drafts/web-table-export.csv", bytes: 132 }
    });
    events.appendEvent({
      type: "tool.executed",
      taskId: "task-web",
      payload: { toolName: "fs.write_draft", ok: true }
    });
    events.appendEvent({
      type: "task.completed",
      taskId: "task-web",
      payload: { title: "Completed" }
    });

    const projection = webTableToCsvReplayToControlProjection(
      events.listEvents()
    );
    const run = projection.runs["run-task-web"];

    expect(run?.status).toBe("completed");
    expect(projection.draftCount).toBe(1);
    expect(run?.artifactRefs[0]?.id).toBe("drafts/web-table-export.csv");
  });

  it("handles missing optional events and duplicate ids safely", () => {
    const events = eventStore();
    events.appendEvent({
      type: "task.created",
      taskId: "task-dup",
      payload: { title: "Only task event" }
    });
    const list = events.listEvents();
    const projection = projectControlPlaneStateFromEvents([list[0]!, list[0]!]);

    expect(projection.runCount).toBe(1);
    expect(projection.warnings.map((item) => item.code)).toContain(
      "duplicate_event_skipped"
    );
  });

  it("keeps event payloads summary-only and redacts unsafe summaries", () => {
    const events = eventStore();
    appendControlPlaneEventSummary(events, {
      type: "control.run.failed",
      taskId: "task-safe",
      runId: "run-safe",
      status: "failed",
      phase: "audit",
      safeSummary: "Failed with sk-test1234567890abcdef in raw text"
    });
    const serialized = JSON.stringify(events.listEvents());

    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
  });
});

describe("Control-plane integration helpers", () => {
  it("returns capability, memory, patch, git, and shell refs only", () => {
    const capabilityRef = capabilityPlanToControlRef({
      requestId: "req-1",
      capabilityId: "native.git.status",
      status: "dry_run_available",
      decision: "approval_required",
      dryRunAvailable: true,
      reasons: []
    } as CapabilityInvocationPlan);
    const memoryRefs = memoryRecallToControlRefs({
      querySummary: {
        namespace: "runtime",
        typeCount: 1,
        tagCount: 0,
        maxResults: 5
      },
      items: [
        {
          memoryId: "mem-1",
          type: "pitfall",
          summary: "Use summary only",
          score: 1,
          provenanceRefs: [],
          trustLevel: "verified_tool_result",
          namespace: "runtime",
          tags: [],
          volatilePlacement: true
        }
      ],
      warnings: []
    } as MemoryRecallResult);
    const patchRef = patchAuditToControlRef({
      auditId: "audit-1",
      proposalId: "patch-1",
      decision: "needs_approval",
      reasons: [],
      riskLevel: "A3_scoped_write",
      pathWarnings: [],
      contentWarnings: [],
      beforeHashes: {},
      afterHashes: {},
      changedFiles: [],
      requiresApproval: true,
      noCompressZoneRefs: [],
      suggestedNextAction: "approve",
      hash: "hash"
    } as DiffAuditReport);
    const gitRef = gitSummaryToControlRef(
      parseGitStatusPorcelainV1("## main\n?? docs/file.md")
    );
    const shellPlan = planShellCommand(
      { commandId: "pnpm.test" },
      createDefaultShellAllowlist()
    );
    const shellResult = createFakeShellRunner({
      "pnpm.test": {
        exitCode: 0,
        stdout: "PASS",
        stderr: "",
        durationMs: 10
      }
    }).run(shellPlan);

    expect(shellResult.ok).toBe(true);
    if (!shellResult.ok) {
      throw new Error("expected shell result");
    }
    const shellRef = shellSummaryToControlRef({
      commandId: "pnpm.test",
      summary: shellResult.summary
    });
    const serialized = JSON.stringify({
      capabilityRef,
      memoryRefs,
      patchRef,
      gitRef,
      shellRef
    });

    expect(serialized).toContain("native.git.status");
    expect(serialized).toContain("mem-1");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
  });

  it("can project a single run by id", () => {
    const events = eventStore();
    appendControlPlaneEventSummary(events, {
      type: "control.run.created",
      taskId: "task-1",
      runId: "run-1",
      status: "created",
      phase: "intake",
      safeSummary: "Run"
    });

    const run = projectControlPlaneRunFromEvents("run-1", events.listEvents());
    expect(run?.runId).toBe("run-1");
  });
});
