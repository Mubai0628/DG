import { type EventStore } from "../events/index.js";
import { safeControlSummary } from "./summaries.js";
import { type ControlPlaneLifecycleEvent } from "./types.js";

export function appendControlPlaneEventSummary(
  eventStore: EventStore,
  event: ControlPlaneLifecycleEvent
): void {
  const payload = {
    taskId: event.taskId,
    runId: event.runId,
    status: event.status,
    phase: event.phase,
    safeSummary: safeControlSummary(event.safeSummary),
    warningCodes: event.warningCodes ?? [],
    errorCodes: event.errorCodes ?? [],
    refs: event.refs ?? []
  };
  eventStore.appendEvent({
    type: event.type,
    payload,
    ...(event.taskId !== undefined ? { taskId: event.taskId } : {})
  });
}
