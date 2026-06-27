export const eventTypes = [
  "task.created",
  "task.started",
  "task.completed",
  "task.failed",
  "llm.requested",
  "llm.completed",
  "llm.repair",
  "cache.boundary.changed",
  "context.assembled",
  "context.rule.activated",
  "capability.invocation.proposed",
  "capability.invocation.planned",
  "capability.invocation.rejected",
  "capability.lease.issued",
  "capability.lease.revoked",
  "agent.route.planned",
  "agent.dossier.created",
  "agent.route.rejected",
  "agent.route.needs_clarification",
  "tool.proposed",
  "tool.approved",
  "tool.rejected",
  "tool.executed",
  "tool.failed",
  "browser.dom.capture_requested",
  "browser.dom.captured",
  "frame.redacted",
  "fs.draft_written",
  "memory.candidate.proposed",
  "memory.candidate.rejected",
  "memory.committed",
  "memory.rejected",
  "memory.recalled",
  "memory.revoked",
  "memory.expired",
  "patch.proposed",
  "patch.validated",
  "patch.simulated",
  "patch.rejected",
  "rollback.checkpoint.created",
  "rollback.simulated",
  "git.command.planned",
  "git.command.rejected",
  "git.summary.produced",
  "git.write_intent.disabled",
  "shell.command.planned",
  "shell.command.rejected",
  "shell.command.simulated",
  "shell.output.summarized",
  "workspace.index.proposed",
  "workspace.index.built",
  "workspace.index.rejected",
  "workspace.file.summarized",
  "control.task.created",
  "control.run.created",
  "control.run.draft_recorded",
  "control.run.planned",
  "control.run.status_changed",
  "control.run.needs_clarification",
  "control.approval.requested",
  "control.approval.recorded",
  "control.run.completed",
  "control.run.failed",
  "control.run.cancelled",
  "user_workspace.patch_apply.proposed",
  "user_workspace.patch_apply.validated",
  "user_workspace.patch_apply.executed",
  "user_workspace.patch_apply.result",
  "user_workspace.patch_rollback.proposed",
  "user_workspace.patch_rollback.executed",
  "user_workspace.patch_rollback.result",
  "ambiguity.detected",
  "ambiguity.question.asked",
  "ambiguity.resolved",
  "eval.case.started",
  "eval.case.passed",
  "eval.case.failed"
] as const;

export type EventType = (typeof eventTypes)[number];

export type UsageSummary = {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheHitTokens?: number;
  cacheMissTokens?: number;
  retryCount?: number;
  latencyMs?: number;
  model?: string;
};

export type EventRecord = {
  id: string;
  ts: string;
  type: EventType;
  payload: unknown;
  schemaVersion: number;
  taskId?: string;
  agentId?: string;
  usage?: UsageSummary;
};

export type NewEventInput = {
  type: EventType;
  payload: unknown;
  taskId?: string;
  agentId?: string;
  usage?: UsageSummary;
};

export type EventFilter = {
  taskId?: string;
  agentId?: string;
  type?: EventType | readonly EventType[];
};

export type EventStore = {
  appendEvent(input: NewEventInput): EventRecord;
  listEvents(filter?: EventFilter): EventRecord[];
  clear?(): void;
  close?(): void;
};

export type ReplayTaskStatus = "created" | "started" | "completed" | "failed";

export type ReplayTimelineItem = {
  id: string;
  ts: string;
  type: EventType;
  summary: string;
  taskId?: string;
  agentId?: string;
};

export type UsageTotals = {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  retryCount: number;
  latencyMs: number;
};

export type ReplayState = {
  tasks: Record<string, ReplayTaskStatus>;
  timeline: ReplayTimelineItem[];
  usageTotals: UsageTotals;
  draftCount: number;
  eventCount: number;
};

const eventTypeSet = new Set<string>(eventTypes);

export function isEventType(value: string): value is EventType {
  return eventTypeSet.has(value);
}
