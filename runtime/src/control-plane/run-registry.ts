import { validateControlPlaneTransition, phaseForStatus } from "./lifecycle.js";
import { createControlHash } from "./summaries.js";
import {
  type ControlPlaneRegistrySummary,
  type ControlPlaneRun,
  type ControlPlaneRunStatus,
  type ControlPlaneTask,
  type ControlPlaneTimelineItem
} from "./types.js";
import { ControlPlaneException, controlPlaneError } from "./errors.js";
import { summarizeControlPlaneRun } from "./run.js";

export class InMemoryRunRegistry {
  private readonly tasks = new Map<string, ControlPlaneTask>();
  private readonly runs = new Map<string, ControlPlaneRun>();

  putTask(task: ControlPlaneTask): ControlPlaneTask {
    this.tasks.set(task.taskId, cloneTask(task));
    return cloneTask(task);
  }

  putRun(run: ControlPlaneRun): ControlPlaneRun {
    this.runs.set(run.runId, cloneRun(run));
    return cloneRun(run);
  }

  getTask(taskId: string): ControlPlaneTask | undefined {
    const task = this.tasks.get(taskId);
    return task === undefined ? undefined : cloneTask(task);
  }

  getRun(runId: string): ControlPlaneRun | undefined {
    const run = this.runs.get(runId);
    return run === undefined ? undefined : cloneRun(run);
  }

  listRuns(): ControlPlaneRun[] {
    return [...this.runs.values()].map((run) => cloneRun(run));
  }

  updateRunStatus(
    runId: string,
    status: ControlPlaneRunStatus,
    now = new Date().toISOString()
  ): ControlPlaneRun {
    const run = this.runs.get(runId);
    if (run === undefined) {
      throw new ControlPlaneException(
        controlPlaneError(
          "run_not_found",
          "run_not_found",
          "Control-plane run was not found.",
          { runId }
        )
      );
    }
    const transition = validateControlPlaneTransition(run.status, status, {
      taskId: run.taskId,
      runId
    });
    if (!transition.ok) {
      throw new ControlPlaneException(transition.error);
    }
    const updated = cloneRun({
      ...run,
      status,
      phase: phaseForStatus(status),
      updatedAt: now
    });
    updated.hash = createControlHash({
      runId: updated.runId,
      taskId: updated.taskId,
      status: updated.status,
      phase: updated.phase,
      updatedAt: updated.updatedAt,
      timelineCount: updated.timeline.length
    });
    this.runs.set(runId, updated);
    return cloneRun(updated);
  }

  appendRunTimelineItem(
    runId: string,
    item: ControlPlaneTimelineItem
  ): ControlPlaneRun {
    const run = this.runs.get(runId);
    if (run === undefined) {
      throw new ControlPlaneException(
        controlPlaneError(
          "run_not_found",
          "run_not_found",
          "Control-plane run was not found.",
          { runId }
        )
      );
    }
    const updated = cloneRun({
      ...run,
      timeline: [...run.timeline, { ...item }],
      updatedAt: item.ts
    });
    updated.hash = createControlHash({
      runId: updated.runId,
      taskId: updated.taskId,
      status: updated.status,
      phase: updated.phase,
      timeline: updated.timeline.map((entry) => entry.id)
    });
    this.runs.set(runId, updated);
    return cloneRun(updated);
  }

  summarizeRun(runId: string): ControlPlaneRegistrySummary | undefined {
    const run = this.runs.get(runId);
    if (run === undefined) {
      return undefined;
    }
    return summarizeControlPlaneRun(run) as ControlPlaneRegistrySummary;
  }
}

function cloneTask(task: ControlPlaneTask): ControlPlaneTask {
  return {
    ...task,
    warnings: task.warnings.map((item) => ({ ...item }))
  };
}

function cloneRun(run: ControlPlaneRun): ControlPlaneRun {
  return {
    ...run,
    timeline: run.timeline.map((item) => ({ ...item })),
    artifactRefs: run.artifactRefs.map((item) => ({ ...item })),
    evidenceRefs: run.evidenceRefs.map((item) => ({ ...item })),
    capabilityPlanRefs: run.capabilityPlanRefs.map((item) => ({ ...item })),
    agentRouteRefs: run.agentRouteRefs.map((item) => ({
      ...item,
      roles: [...item.roles]
    })),
    contextRefs: run.contextRefs.map((item) => ({ ...item })),
    memoryRefs: run.memoryRefs.map((item) => ({ ...item })),
    patchRefs: run.patchRefs.map((item) => ({ ...item })),
    gitSummaryRefs: run.gitSummaryRefs.map((item) => ({ ...item })),
    shellSummaryRefs: run.shellSummaryRefs.map((item) => ({ ...item })),
    warnings: run.warnings.map((item) => ({ ...item })),
    errors: run.errors.map((item) => ({ ...item }))
  };
}
