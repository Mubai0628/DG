import { createHash } from "node:crypto";

import { type CapabilityRegistry } from "../capabilities/index.js";
import { listDeepSeekCapabilityProfiles } from "../models/index.js";

import { assertDossierIsolation } from "./isolation.js";
import { agentRoles, isAgentRole } from "./roles.js";
import {
  type AgentDossier,
  type AgentDossierSummary,
  type AgentDossierValidationResult,
  type AgentForbiddenSideEffect,
  type AgentRequiredOutput,
  type AgentRoutingError
} from "./types.js";

const forbiddenRequestedSideEffects = new Set<string>([
  "desktop_action",
  "shell_execution",
  "mcp_execution",
  "plugin_execution",
  "skill_execution",
  "patch_apply",
  "memory_write",
  "native_bridge_transport",
  "auto_convert",
  "file_write_from_bridge"
]);

export const defaultForbiddenSideEffects: readonly AgentForbiddenSideEffect[] =
  [
    "desktop_action",
    "shell_execution",
    "mcp_execution",
    "plugin_execution",
    "skill_execution",
    "memory_write",
    "patch_apply",
    "native_bridge_transport",
    "auto_convert",
    "file_write_from_bridge",
    "real_deepseek_api"
  ];

export function createDossierHash(dossier: Omit<AgentDossier, "hash">): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        agentId: dossier.agentId,
        role: dossier.role,
        taskId: dossier.taskId,
        objective: dossier.objective,
        acceptedFacts: dossier.acceptedFacts,
        activeConstraints: dossier.activeConstraints,
        allowedCapabilities: dossier.allowedCapabilities,
        requiredOutputs: dossier.requiredOutputs,
        forbiddenSideEffects: dossier.forbiddenSideEffects,
        evidenceRefs: dossier.evidenceRefs.map((ref) => ref.id),
        contextRefs: dossier.contextRefs.map((ref) => ref.id),
        memoryRefs: dossier.memoryRefs.map((ref) => ref.id),
        capabilityLeaseRefs: dossier.capabilityLeaseRefs,
        modelProfileId: dossier.modelProfileId,
        createdAt: dossier.createdAt
      })
    )
    .digest("hex");
}

export function validateAgentDossier(
  dossier: AgentDossier,
  options: {
    capabilityRegistry?: CapabilityRegistry;
    modelProfileIds?: readonly string[];
  } = {}
): AgentDossierValidationResult {
  const errors: AgentRoutingError[] = [];

  if (dossier.agentId.length === 0) {
    errors.push(error("missing_agent_id"));
  }
  if (!isAgentRole(dossier.role)) {
    errors.push(error("unknown_role"));
  }
  if (dossier.taskId.length === 0) {
    errors.push(error("missing_task_id"));
  }
  if (dossier.objective.length === 0) {
    errors.push(error("missing_objective"));
  }

  const modelIds =
    options.modelProfileIds ??
    listDeepSeekCapabilityProfiles().map((profile) => profile.modelId);
  if (!modelIds.includes(dossier.modelProfileId)) {
    errors.push(error("unknown_model_profile"));
  }

  if (options.capabilityRegistry !== undefined) {
    for (const capabilityId of dossier.allowedCapabilities) {
      if (options.capabilityRegistry.get(capabilityId) === undefined) {
        errors.push(error("unknown_capability_id"));
      }
    }
  }

  if (dossier.role === "coder" && dossier.forbiddenSideEffects.length === 0) {
    errors.push(error("coder_requires_forbidden_side_effects"));
  }
  if (
    (dossier.role === "coder" ||
      dossier.role === "reviewer" ||
      dossier.role === "verifier") &&
    dossier.requiredOutputs.length === 0
  ) {
    errors.push(error("required_outputs_missing"));
  }

  for (const sideEffect of requestedSideEffects(dossier.provenance)) {
    if (forbiddenRequestedSideEffects.has(sideEffect)) {
      errors.push(error("forbidden_side_effect_requested"));
    }
  }

  const isolationViolations = assertDossierIsolation(dossier);

  if (errors.length > 0 || isolationViolations.length > 0) {
    return {
      ok: false,
      errors,
      isolationViolations
    };
  }
  return { ok: true, dossier };
}

export function summarizeAgentDossier(
  dossier: AgentDossier
): AgentDossierSummary {
  return {
    agentId: dossier.agentId,
    role: dossier.role,
    taskId: dossier.taskId,
    objectiveSummary: safeObjectiveSummary(dossier.objective),
    allowedCapabilities: [...dossier.allowedCapabilities].sort(),
    requiredOutputIds: dossier.requiredOutputs
      .map((output) => output.id)
      .sort(),
    forbiddenSideEffects: [...dossier.forbiddenSideEffects].sort(),
    evidenceRefIds: dossier.evidenceRefs.map((ref) => ref.id).sort(),
    contextRefIds: dossier.contextRefs.map((ref) => ref.id).sort(),
    memoryRefIds: dossier.memoryRefs.map((ref) => ref.id).sort(),
    capabilityLeaseRefs: [...dossier.capabilityLeaseRefs].sort(),
    modelProfileId: dossier.modelProfileId,
    hash: dossier.hash
  };
}

export function defaultRequiredOutputsForRole(
  role: AgentDossier["role"]
): AgentRequiredOutput[] {
  switch (role) {
    case "coder":
      return [
        {
          id: "implementation-plan",
          title: "Implementation plan or patch summary",
          format: "patch_plan"
        }
      ];
    case "reviewer":
      return [
        {
          id: "review-findings",
          title: "Review findings",
          format: "review_findings"
        }
      ];
    case "verifier":
      return [
        {
          id: "verification-report",
          title: "Verification report",
          format: "verification_report"
        }
      ];
    case "orchestrator":
      return [
        {
          id: "routing-summary",
          title: "Routing summary",
          format: "summary"
        }
      ];
  }
}

export function safeObjectiveSummary(objective: string): string {
  const compact = objective.replace(/\s+/g, " ").trim();
  return compact.length > 96 ? `${compact.slice(0, 93)}...` : compact;
}

export function isKnownAgentRole(value: string): boolean {
  return (agentRoles as readonly string[]).includes(value);
}

function requestedSideEffects(provenance: Record<string, unknown>): string[] {
  const value = provenance.requestedSideEffects;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function error(code: string): AgentRoutingError {
  return {
    code,
    safeMessage: `Agent dossier rejected: ${code}`
  };
}
