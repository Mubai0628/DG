import {
  type AgentRoutingPlan,
  type AgentRoutingStep
} from "../agents/index.js";
import { type CapabilityInvocationPlan } from "../capabilities/index.js";
import { type MemoryRecallResult } from "../memory/index.js";
import { type DiffAuditReport } from "../execution/patch/index.js";
import { type GitParsedSummary } from "../execution/git/index.js";
import { type ShellOutputSummary } from "../execution/shell/index.js";
import { safeControlSummary } from "./summaries.js";
import {
  type ControlPlaneAgentRouteRef,
  type ControlPlaneCapabilityPlanRef,
  type ControlPlaneGitSummaryRef,
  type ControlPlaneMemoryRef,
  type ControlPlanePatchRef,
  type ControlPlaneShellSummaryRef
} from "./types.js";

export function agentRoutingPlanToControlRefs(
  plan: AgentRoutingPlan
): ControlPlaneAgentRouteRef {
  return {
    id: plan.routeId,
    roles: plan.roles,
    summary: `Agent route ${plan.status}: ${plan.roles.join(" -> ")}`
  };
}

export function capabilityPlanToControlRef(
  plan: CapabilityInvocationPlan
): ControlPlaneCapabilityPlanRef {
  return {
    id: plan.requestId,
    capabilityId: plan.capabilityId,
    status: plan.status,
    summary: `Capability ${plan.capabilityId}: ${plan.status}`
  };
}

export function memoryRecallToControlRefs(
  recall: MemoryRecallResult
): ControlPlaneMemoryRef[] {
  return recall.items.map((item) => ({
    id: item.memoryId,
    kind: "memory_ref",
    summary: safeControlSummary(item.summary)
  }));
}

export function patchAuditToControlRef(
  audit: DiffAuditReport
): ControlPlanePatchRef {
  return {
    id: audit.proposalId,
    decision: audit.decision,
    summary: `Patch audit ${audit.decision}: files=${audit.changedFiles.length}`
  };
}

export function gitSummaryToControlRef(
  summary: GitParsedSummary
): ControlPlaneGitSummaryRef {
  if (summary.kind === "status") {
    return {
      id: "git-status",
      kind: summary.kind,
      summary: `Git status: files=${summary.fileCount}`
    };
  }
  if (summary.kind === "diff_summary") {
    return {
      id: "git-diff-summary",
      kind: summary.kind,
      summary: `Git diff: files=${summary.filesChanged} additions=${summary.additions} deletions=${summary.deletions}`
    };
  }
  if (summary.kind === "log_summary") {
    return {
      id: "git-log-summary",
      kind: summary.kind,
      summary: `Git log: commits=${summary.commitCount}`
    };
  }
  return {
    id: "git-branch-summary",
    kind: summary.kind,
    summary: `Git branches: count=${summary.branchCount}`
  };
}

export function shellSummaryToControlRef(input: {
  commandId: string;
  summary: ShellOutputSummary;
}): ControlPlaneShellSummaryRef {
  return {
    id: `shell-${input.commandId}`,
    commandId: input.commandId,
    summary: `Shell summary: command=${input.commandId} exit=${input.summary.exitCode} findings=${input.summary.findings.length}`
  };
}

export function routingStepIds(steps: readonly AgentRoutingStep[]): string[] {
  return steps.map((step) => step.stepId);
}
