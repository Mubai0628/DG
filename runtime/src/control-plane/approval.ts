import { ControlPlaneException } from "./errors.js";
import {
  safeControlSummary,
  validateNoUnsafeControlText
} from "./summaries.js";
import {
  type ControlPlaneApprovalDecision,
  type ControlPlaneApprovalRequest
} from "./types.js";

export function createControlPlaneApprovalRequest(input: {
  approvalId?: string;
  runId: string;
  taskId: string;
  requestedAt?: string;
  capabilityPlanRefs?: string[];
  patchProposalRefs?: string[];
  gitIntentRefs?: string[];
  shellIntentRefs?: string[];
  bridgeProposalRefs?: string[];
  safeSummary: string;
}): ControlPlaneApprovalRequest {
  const errors = validateNoUnsafeControlText(input.safeSummary, {
    taskId: input.taskId,
    runId: input.runId
  });
  if (errors.length > 0) {
    throw new ControlPlaneException(errors[0]!);
  }
  return {
    approvalId: input.approvalId ?? `approval-${input.runId}`,
    runId: input.runId,
    taskId: input.taskId,
    requestedAt: input.requestedAt ?? new Date(0).toISOString(),
    capabilityPlanRefs: [...(input.capabilityPlanRefs ?? [])],
    patchProposalRefs: [...(input.patchProposalRefs ?? [])],
    gitIntentRefs: [...(input.gitIntentRefs ?? [])],
    shellIntentRefs: [...(input.shellIntentRefs ?? [])],
    bridgeProposalRefs: [...(input.bridgeProposalRefs ?? [])],
    safeSummary: safeControlSummary(input.safeSummary)
  };
}

export function createControlPlaneApprovalDecision(input: {
  approvalId: string;
  runId: string;
  taskId: string;
  decision: "approved" | "rejected";
  decidedAt?: string;
  safeSummary: string;
}): ControlPlaneApprovalDecision {
  const errors = validateNoUnsafeControlText(input.safeSummary, {
    taskId: input.taskId,
    runId: input.runId
  });
  if (errors.length > 0) {
    throw new ControlPlaneException(errors[0]!);
  }
  return {
    approvalId: input.approvalId,
    runId: input.runId,
    taskId: input.taskId,
    decision: input.decision,
    decidedAt: input.decidedAt ?? new Date(0).toISOString(),
    safeSummary: safeControlSummary(input.safeSummary)
  };
}
