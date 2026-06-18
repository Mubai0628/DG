import { phaseForStatus } from "./lifecycle.js";
import { createControlHash, timelineItem } from "./summaries.js";
import {
  type ControlPlaneRun,
  type ControlPlaneRunOptions,
  type ControlPlaneRunStatus,
  type ControlPlaneTask
} from "./types.js";

export function createControlPlaneRun(
  task: ControlPlaneTask,
  options: ControlPlaneRunOptions = {}
): ControlPlaneRun {
  const now = options.now ?? new Date().toISOString();
  const runId = options.runId ?? `run-${task.taskId}`;
  const status: ControlPlaneRunStatus =
    task.intent === "unknown" ? "needs_clarification" : "created";
  const runWithoutHash = {
    runId,
    taskId: task.taskId,
    status,
    phase: phaseForStatus(status),
    createdAt: now,
    updatedAt: now,
    approvalState: "none",
    timeline: [
      timelineItem({
        id: `${runId}:created`,
        ts: now,
        type: "control.run.created",
        runId,
        taskId: task.taskId,
        phase: phaseForStatus(status),
        status,
        summary:
          status === "needs_clarification"
            ? "Run needs clarification before planning."
            : "Run created."
      })
    ],
    artifactRefs: [],
    evidenceRefs: [],
    capabilityPlanRefs: [],
    agentRouteRefs: [],
    contextRefs: [],
    memoryRefs: [],
    patchRefs: [],
    gitSummaryRefs: [],
    shellSummaryRefs: [],
    warnings: [...task.warnings],
    errors: []
  } satisfies Omit<ControlPlaneRun, "hash">;

  return {
    ...runWithoutHash,
    hash: createControlHash(runWithoutHash)
  };
}

export function summarizeControlPlaneRun(
  run: ControlPlaneRun
): Record<string, unknown> {
  return {
    runId: run.runId,
    taskId: run.taskId,
    status: run.status,
    phase: run.phase,
    approvalState: run.approvalState,
    timelineCount: run.timeline.length,
    artifactCount: run.artifactRefs.length,
    capabilityPlanCount: run.capabilityPlanRefs.length,
    warningCodes: run.warnings.map((item) => item.code),
    errorCodes: run.errors.map((item) => item.code),
    hash: run.hash
  };
}
