import { isRiskAtMost } from "./risk.js";
import {
  type ToolDefinitionRuntime,
  type ToolName,
  type ToolPermissionDecision,
  type ToolPermissionPolicy,
  type ToolRiskLevel
} from "./types.js";

const defaultAutoApproveRiskMax: ToolRiskLevel = "A2_draft_write";

export function decideToolPermission(
  definition: ToolDefinitionRuntime,
  policy: ToolPermissionPolicy = {}
): ToolPermissionDecision {
  if (toolListIncludes(policy.denyTools, definition.name)) {
    return {
      status: "rejected",
      approved: false,
      decision: "denied_by_policy",
      errorKind: "permission_denied"
    };
  }

  if (toolListIncludes(policy.requireApprovalFor, definition.name)) {
    return {
      status: "approval_required",
      approved: false,
      decision: "approval_required",
      errorKind: "approval_required"
    };
  }

  if (
    isRiskAtMost(
      definition.riskLevel,
      policy.autoApproveRiskMax ?? defaultAutoApproveRiskMax
    )
  ) {
    return {
      status: "approved",
      approved: true,
      decision: "auto_approved"
    };
  }

  return {
    status: "approval_required",
    approved: false,
    decision: "approval_required",
    errorKind: "approval_required"
  };
}

function toolListIncludes(
  tools: readonly ToolName[] | undefined,
  name: ToolName
): boolean {
  return tools?.includes(name) ?? false;
}
