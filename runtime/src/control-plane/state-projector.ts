import { replay } from "../events/replay.js";
import { type EventRecord } from "../events/index.js";
import { createControlPlaneRun } from "./run.js";
import { createControlPlaneTask } from "./task.js";
import {
  createControlHash,
  safeControlSummary,
  timelineItem,
  warning
} from "./summaries.js";
import {
  type ControlPlaneRun,
  type ControlPlaneRunStatus,
  type ControlPlaneStateProjection,
  type ControlPlaneTask,
  type ControlPlaneTaskIntent,
  type ControlPlaneProjectorOptions
} from "./types.js";
import { phaseForStatus } from "./lifecycle.js";

const controlStatusByType: Partial<Record<string, ControlPlaneRunStatus>> = {
  "control.run.created": "created",
  "control.run.planned": "planned",
  "control.run.needs_clarification": "needs_clarification",
  "control.run.completed": "completed",
  "control.run.failed": "failed",
  "control.run.cancelled": "cancelled"
};

const taskStatusByType: Partial<Record<string, ControlPlaneRunStatus>> = {
  "task.created": "created",
  "task.started": "running",
  "task.completed": "completed",
  "task.failed": "failed"
};

export function projectControlPlaneStateFromEvents(
  events: readonly EventRecord[],
  options: ControlPlaneProjectorOptions = {}
): ControlPlaneStateProjection {
  const projection = emptyProjection();
  const seen = new Set<string>();

  for (const event of events) {
    if (seen.has(event.id)) {
      projection.warnings.push(
        warning("duplicate_event_skipped", "Duplicate event was skipped.")
      );
      continue;
    }
    seen.add(event.id);
    applyEvent(projection, event, options);
  }

  projection.taskCount = Object.keys(projection.tasks).length;
  projection.runCount = Object.keys(projection.runs).length;
  projection.completedRunCount = Object.values(projection.runs).filter(
    (run) => run.status === "completed"
  ).length;
  projection.eventCount = seen.size;
  return projection;
}

export function projectControlPlaneRunFromEvents(
  runId: string,
  events: readonly EventRecord[],
  options: ControlPlaneProjectorOptions = {}
): ControlPlaneRun | undefined {
  return projectControlPlaneStateFromEvents(events, options).runs[runId];
}

export function webTableToCsvReplayToControlProjection(
  events: readonly EventRecord[]
): ControlPlaneStateProjection {
  const projection = projectControlPlaneStateFromEvents(events);
  const replayState = replay(events);
  projection.draftCount = replayState.draftCount;
  projection.eventCount = replayState.eventCount;
  return projection;
}

function emptyProjection(): ControlPlaneStateProjection {
  return {
    tasks: {},
    runs: {},
    timeline: [],
    taskCount: 0,
    runCount: 0,
    completedRunCount: 0,
    draftCount: 0,
    eventCount: 0,
    warnings: []
  };
}

function applyEvent(
  projection: ControlPlaneStateProjection,
  event: EventRecord,
  options: ControlPlaneProjectorOptions
): void {
  const payload = asRecord(event.payload);
  const taskId =
    event.taskId ?? stringField(payload, "taskId") ?? "task-default";
  const runId =
    stringField(payload, "runId") ??
    options.runIdFactory?.(taskId) ??
    `run-${taskId}`;
  const intent =
    (stringField(payload, "intent") as ControlPlaneTaskIntent | undefined) ??
    "unknown";
  const summary = safeControlSummary(
    stringField(payload, "safeSummary") ??
      stringField(payload, "title") ??
      stringField(payload, "summary") ??
      event.type
  );
  const task = ensureTask(projection, taskId, intent, summary, event.ts);
  const run = ensureRun(projection, runId, task, event.ts);

  const status = statusForEvent(event, payload);
  if (status !== undefined) {
    setRunStatus(run, status, event.ts);
  }
  collectRefs(run, event, payload, projection);
  const item = timelineItem({
    id: event.id,
    ts: event.ts,
    type: event.type,
    taskId,
    runId,
    phase: run.phase,
    status: run.status,
    summary
  });
  run.timeline.push(item);
  projection.timeline.push(item);
  run.hash = createControlHash({
    runId: run.runId,
    status: run.status,
    timeline: run.timeline.map((entry) => entry.id),
    artifactRefs: run.artifactRefs.map((ref) => ref.id)
  });
}

function statusForEvent(
  event: EventRecord,
  payload: Record<string, unknown>
): ControlPlaneRunStatus | undefined {
  if (event.type === "control.run.status_changed") {
    const status = stringField(payload, "status");
    return isRunStatus(status) ? status : undefined;
  }
  if (event.type === "control.approval.requested") {
    return "awaiting_approval";
  }
  if (event.type === "control.approval.recorded") {
    const decision = stringField(payload, "decision");
    return decision === "approved" ? "approved" : "rejected";
  }
  return controlStatusByType[event.type] ?? taskStatusByType[event.type];
}

function collectRefs(
  run: ControlPlaneRun,
  event: EventRecord,
  payload: Record<string, unknown>,
  projection: ControlPlaneStateProjection
): void {
  if (event.type === "fs.draft_written") {
    projection.draftCount += 1;
    pushUnique(run.artifactRefs, {
      id: stringField(payload, "relativePath") ?? event.id,
      kind: "draft",
      summary: safeControlSummary(
        stringField(payload, "relativePath") ?? "Draft written"
      )
    });
  }
  if (event.type === "context.assembled") {
    pushUnique(run.contextRefs, {
      id: stringField(payload, "reportId") ?? event.id,
      kind: "context_report",
      summary: "Context assembled"
    });
  }
  if (event.type === "agent.route.planned") {
    pushUnique(run.agentRouteRefs, {
      id: stringField(payload, "routeId") ?? event.id,
      roles: arrayField(payload, "roles"),
      summary: "Agent route planned"
    });
  }
  if (event.type.startsWith("capability.invocation.")) {
    const capabilityId = stringField(payload, "capabilityId") ?? "unknown";
    pushUnique(run.capabilityPlanRefs, {
      id: stringField(payload, "requestId") ?? event.id,
      capabilityId,
      status: stringField(payload, "status") ?? event.type,
      summary: `Capability ${capabilityId}`
    });
  }
  if (event.type.startsWith("patch.")) {
    pushUnique(run.patchRefs, {
      id: stringField(payload, "proposalId") ?? event.id,
      decision: stringField(payload, "decision") ?? event.type,
      summary: "Patch event"
    });
  }
  if (event.type === "git.summary.produced") {
    pushUnique(run.gitSummaryRefs, {
      id: event.id,
      kind: stringField(payload, "commandKind") ?? "git",
      summary: "Git summary produced"
    });
  }
  if (event.type === "shell.command.simulated") {
    const commandId = stringField(payload, "commandId") ?? "unknown";
    pushUnique(run.shellSummaryRefs, {
      id: event.id,
      commandId,
      summary: `Shell summary ${commandId}`
    });
  }
  if (event.type.startsWith("memory.")) {
    pushUnique(run.memoryRefs, {
      id:
        stringField(payload, "memoryId") ??
        stringField(payload, "candidateId") ??
        event.id,
      kind: "memory_ref",
      summary: "Memory event"
    });
  }
}

function ensureTask(
  projection: ControlPlaneStateProjection,
  taskId: string,
  intent: ControlPlaneTaskIntent,
  summary: string,
  ts: string
): ControlPlaneTask {
  const existing = projection.tasks[taskId];
  if (existing !== undefined) {
    return existing;
  }
  const task = createControlPlaneTask({
    taskId,
    intent,
    objective: summary,
    createdAt: ts
  });
  projection.tasks[taskId] = task;
  return task;
}

function ensureRun(
  projection: ControlPlaneStateProjection,
  runId: string,
  task: ControlPlaneTask,
  ts: string
): ControlPlaneRun {
  const existing = projection.runs[runId];
  if (existing !== undefined) {
    return existing;
  }
  const run = createControlPlaneRun(task, { runId, now: ts });
  projection.runs[runId] = run;
  return run;
}

function setRunStatus(
  run: ControlPlaneRun,
  status: ControlPlaneRunStatus,
  ts: string
): void {
  run.status = status;
  run.phase = phaseForStatus(status);
  run.updatedAt = ts;
  if (status === "awaiting_approval") {
    run.approvalState = "requested";
  } else if (status === "approved") {
    run.approvalState = "approved";
  } else if (status === "rejected") {
    run.approvalState = "rejected";
  }
}

function pushUnique<T extends { id: string }>(items: T[], item: T): void {
  if (!items.some((existing) => existing.id === item.id)) {
    items.push(item);
  }
}

function asRecord(payload: unknown): Record<string, unknown> {
  return typeof payload === "object" && payload !== null
    ? (payload as Record<string, unknown>)
    : {};
}

function stringField(
  payload: Record<string, unknown>,
  key: string
): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function arrayField(payload: Record<string, unknown>, key: string): string[] {
  const value = payload[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isRunStatus(
  value: string | undefined
): value is ControlPlaneRunStatus {
  return (
    value === "created" ||
    value === "planned" ||
    value === "needs_clarification" ||
    value === "awaiting_approval" ||
    value === "approved" ||
    value === "rejected" ||
    value === "running" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
  );
}
