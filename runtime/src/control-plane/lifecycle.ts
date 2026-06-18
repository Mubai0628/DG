import { type ControlPlaneError, type ControlPlaneRunStatus } from "./types.js";
import { controlPlaneError } from "./errors.js";

const terminalStatuses = new Set<ControlPlaneRunStatus>([
  "completed",
  "failed",
  "rejected",
  "cancelled"
]);

const allowedTransitions: Record<
  ControlPlaneRunStatus,
  ControlPlaneRunStatus[]
> = {
  created: ["planned", "needs_clarification", "cancelled"],
  planned: ["awaiting_approval", "running", "rejected", "cancelled"],
  needs_clarification: ["planned", "cancelled"],
  awaiting_approval: ["approved", "rejected", "cancelled"],
  approved: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  rejected: [],
  cancelled: []
};

export function validateControlPlaneTransition(
  from: ControlPlaneRunStatus,
  to: ControlPlaneRunStatus,
  refs: {
    taskId?: string;
    runId?: string;
  } = {}
): { ok: true } | { ok: false; error: ControlPlaneError } {
  if (from === to) {
    return { ok: true };
  }
  if (terminalStatuses.has(from)) {
    return {
      ok: false,
      error: controlPlaneError(
        "invalid_transition",
        "terminal_transition_rejected",
        "Terminal control-plane run status cannot transition.",
        refs
      )
    };
  }
  if (!allowedTransitions[from].includes(to)) {
    return {
      ok: false,
      error: controlPlaneError(
        "invalid_transition",
        "invalid_transition",
        `Invalid control-plane transition: ${from} -> ${to}.`,
        refs
      )
    };
  }
  return { ok: true };
}

export function phaseForStatus(
  status: ControlPlaneRunStatus
): "intake" | "routing" | "approval" | "execution_plan" | "result" | "audit" {
  if (status === "created" || status === "needs_clarification") {
    return "intake";
  }
  if (status === "planned") {
    return "routing";
  }
  if (
    status === "awaiting_approval" ||
    status === "approved" ||
    status === "rejected"
  ) {
    return "approval";
  }
  if (status === "running") {
    return "execution_plan";
  }
  if (status === "completed") {
    return "result";
  }
  return "audit";
}
