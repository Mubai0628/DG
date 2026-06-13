import {
  type EventRecord,
  type EventType,
  type ReplayState,
  type ReplayTimelineItem,
  type ReplayTaskStatus,
  type UsageSummary,
  type UsageTotals
} from "./types.js";

function emptyUsageTotals(): UsageTotals {
  return {
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    retryCount: 0,
    latencyMs: 0
  };
}

function addUsage(totals: UsageTotals, usage?: UsageSummary): void {
  if (usage === undefined) {
    return;
  }

  totals.inputTokens += usage.inputTokens ?? 0;
  totals.outputTokens += usage.outputTokens ?? 0;
  totals.reasoningTokens += usage.reasoningTokens ?? 0;
  totals.cacheHitTokens += usage.cacheHitTokens ?? 0;
  totals.cacheMissTokens += usage.cacheMissTokens ?? 0;
  totals.retryCount += usage.retryCount ?? 0;
  totals.latencyMs += usage.latencyMs ?? 0;
}

function taskStatusFor(type: EventType): ReplayTaskStatus | undefined {
  switch (type) {
    case "task.created":
      return "created";
    case "task.started":
      return "started";
    case "task.completed":
      return "completed";
    case "task.failed":
      return "failed";
    default:
      return undefined;
  }
}

function payloadField(payload: unknown, key: string): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function summarizeEvent(event: EventRecord): string {
  const title = payloadField(event.payload, "title");
  if (title !== undefined) {
    return `${event.type}: ${title}`;
  }

  const path = payloadField(event.payload, "path");
  if (path !== undefined) {
    return `${event.type}: ${path}`;
  }

  return event.type;
}

function timelineItem(event: EventRecord): ReplayTimelineItem {
  const item: ReplayTimelineItem = {
    id: event.id,
    ts: event.ts,
    type: event.type,
    summary: summarizeEvent(event)
  };

  if (event.taskId !== undefined) {
    item.taskId = event.taskId;
  }
  if (event.agentId !== undefined) {
    item.agentId = event.agentId;
  }

  return item;
}

export function replay(events: readonly EventRecord[]): ReplayState {
  const tasks: Record<string, ReplayTaskStatus> = {};
  const timeline: ReplayTimelineItem[] = [];
  const usageTotals = emptyUsageTotals();
  let draftCount = 0;

  for (const event of events) {
    timeline.push(timelineItem(event));
    addUsage(usageTotals, event.usage);

    if (event.taskId !== undefined) {
      const status = taskStatusFor(event.type);
      if (status !== undefined) {
        tasks[event.taskId] = status;
      }
    }

    if (event.type === "fs.draft_written") {
      draftCount += 1;
    }
  }

  return {
    tasks,
    timeline,
    usageTotals,
    draftCount,
    eventCount: events.length
  };
}
