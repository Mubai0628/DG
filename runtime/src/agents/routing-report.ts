import { createHash } from "node:crypto";

import { type AgentDossierSummary, type AgentRoutingPlan } from "./types.js";

export function summarizeAgentRoutingPlan(plan: AgentRoutingPlan): {
  routeId: string;
  taskId: string;
  status: AgentRoutingPlan["status"];
  intent: AgentRoutingPlan["intent"];
  roles: string[];
  dossierIds: string[];
  capabilityIds: string[];
  modelProfileIds: string[];
  warnings: string[];
  errors: string[];
  hash: string;
} {
  return {
    routeId: plan.routeId,
    taskId: plan.taskId,
    status: plan.status,
    intent: plan.intent,
    roles: plan.roles,
    dossierIds: plan.dossierSummaries.map((summary) => summary.agentId),
    capabilityIds: [...plan.requiredCapabilities].sort(),
    modelProfileIds: unique(
      plan.dossierSummaries.map((summary) => summary.modelProfileId)
    ),
    warnings: plan.warnings.map((warning) => warning.code),
    errors: plan.errors.map((error) => error.code),
    hash: plan.hash
  };
}

export function hashRoutingPlanSummary(input: {
  routeId: string;
  taskId: string;
  status: string;
  roles: readonly string[];
  dossierSummaries: readonly AgentDossierSummary[];
  requiredCapabilities: readonly string[];
  errors: readonly string[];
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        routeId: input.routeId,
        taskId: input.taskId,
        status: input.status,
        roles: input.roles,
        dossierHashes: input.dossierSummaries.map((summary) => summary.hash),
        requiredCapabilities: input.requiredCapabilities,
        errors: input.errors
      })
    )
    .digest("hex");
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
