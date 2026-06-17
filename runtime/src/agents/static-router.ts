import { type EventStore } from "../events/index.js";
import { listDeepSeekCapabilityProfiles } from "../models/index.js";

import {
  createDossierHash,
  defaultForbiddenSideEffects,
  defaultRequiredOutputsForRole,
  safeObjectiveSummary,
  summarizeAgentDossier,
  validateAgentDossier
} from "./dossier.js";
import { detectAgentIsolationViolations } from "./isolation.js";
import { defaultAgentModelProfileByRole } from "./roles.js";
import {
  hashRoutingPlanSummary,
  summarizeAgentRoutingPlan
} from "./routing-report.js";
import {
  type AgentContextRef,
  type AgentDossier,
  type AgentEvidenceRef,
  type AgentRequiredOutput,
  type AgentRole,
  type AgentRoutingError,
  type AgentRoutingInput,
  type AgentRoutingPlan,
  type AgentRoutingStep,
  type AgentRoutingWarning,
  type AgentTaskIntent,
  type StaticAgentRouter,
  type StaticAgentRouterOptions
} from "./types.js";

const forbiddenSideEffects = new Set<string>(defaultForbiddenSideEffects);

export class DefaultStaticAgentRouter implements StaticAgentRouter {
  private readonly eventStore: EventStore | undefined;
  private readonly clock: () => Date;
  private readonly routeIdFactory: () => string;

  constructor(options: StaticAgentRouterOptions = {}) {
    this.eventStore = options.eventStore;
    this.clock = options.clock ?? (() => new Date());
    this.routeIdFactory = options.routeIdFactory ?? defaultRouteIdFactory();
  }

  routeAgentTask(input: AgentRoutingInput): AgentRoutingPlan {
    const routeId = this.routeIdFactory();
    const createdAt = input.createdAt ?? this.clock().toISOString();
    const preflight = validateRoutingInput(input);
    const roles =
      preflight.status === "rejected" ? [] : rolesForIntent(input.intent);
    const modelProfileIds = input.modelProfileIds ?? defaultModelProfileIds();
    const requiredCapabilities = input.requiredCapabilities ?? [];
    const warnings: AgentRoutingWarning[] = [...preflight.warnings];
    const errors: AgentRoutingError[] = [...preflight.errors];

    if (
      input.capabilityRegistry !== undefined &&
      requiredCapabilities.some(
        (capabilityId) =>
          input.capabilityRegistry?.get(capabilityId) === undefined
      )
    ) {
      errors.push(error("required_capability_unavailable"));
    }

    if (
      requiredCapabilities.length > 0 &&
      input.capabilityRegistry === undefined
    ) {
      warnings.push(warning("capability_registry_not_provided"));
    }

    if (
      input.riskLevel !== undefined &&
      isHighRisk(input.riskLevel) &&
      input.hasApprovalPolicy !== true
    ) {
      errors.push(error("high_risk_requires_approval_policy"));
    }

    if (
      input.intent === "code_change" &&
      (input.acceptanceCriteria?.length ?? 0) === 0
    ) {
      errors.push(error("code_change_missing_acceptance_criteria"));
    }

    const hasCoder = roles.includes("coder");
    const requiredOutputs = input.requiredOutputs ?? [];
    if (hasCoder && requiredOutputs.length === 0) {
      errors.push(error("coder_requested_without_required_outputs"));
    }

    for (const profileId of modelProfileIdsForRoles(roles, modelProfileIds)) {
      if (!modelProfileIds.includes(profileId)) {
        errors.push(error("unknown_model_profile"));
      }
      if (profileId === "deepseek-chat" || profileId === "deepseek-reasoner") {
        errors.push(error("legacy_model_alias_rejected"));
      }
    }

    const status = decideStatus(input.intent, preflight.status, errors);
    const steps =
      status === "planned"
        ? roles.map((role, index) =>
            createRoutingStep({
              role,
              order: index + 1,
              input,
              routeId,
              createdAt,
              modelProfileIds,
              requiredCapabilities
            })
          )
        : [];

    for (const step of steps) {
      const validation = validateAgentDossier(step.dossier, {
        ...(input.capabilityRegistry !== undefined
          ? { capabilityRegistry: input.capabilityRegistry }
          : {}),
        modelProfileIds
      });
      if (!validation.ok) {
        errors.push(...validation.errors);
        for (const violation of validation.isolationViolations) {
          errors.push({
            code: violation.code,
            safeMessage: violation.safeMessage
          });
        }
      }
    }

    const finalStatus =
      status === "planned" && errors.length > 0 ? "rejected" : status;
    const dossierSummaries = steps.map((step) =>
      summarizeAgentDossier(step.dossier)
    );
    const planWithoutHash = {
      routeId,
      taskId: input.taskId,
      status: finalStatus,
      intent: input.intent,
      roles,
      steps: finalStatus === "planned" ? steps : [],
      dossierSummaries: finalStatus === "planned" ? dossierSummaries : [],
      objectiveSummary: safeObjectiveSummary(input.objective),
      requiredCapabilities,
      warnings,
      errors,
      createdAt
    };
    const hash = hashRoutingPlanSummary({
      routeId,
      taskId: input.taskId,
      status: finalStatus,
      roles,
      dossierSummaries: planWithoutHash.dossierSummaries,
      requiredCapabilities,
      errors: errors.map((item) => item.code)
    });
    const plan: AgentRoutingPlan = {
      ...planWithoutHash,
      hash
    };
    if (input.riskLevel !== undefined) {
      plan.riskLevel = input.riskLevel;
    }

    const eventIds = this.logPlan(plan);
    if (eventIds.length > 0) {
      plan.eventIds = eventIds;
    }
    return plan;
  }

  private logPlan(plan: AgentRoutingPlan): string[] {
    if (this.eventStore === undefined) {
      return [];
    }
    const summary = summarizeAgentRoutingPlan(plan);
    const eventIds: string[] = [];

    const routeType =
      plan.status === "rejected"
        ? "agent.route.rejected"
        : plan.status === "needs_clarification"
          ? "agent.route.needs_clarification"
          : "agent.route.planned";
    eventIds.push(
      this.eventStore.appendEvent({
        type: routeType,
        taskId: plan.taskId,
        payload: {
          ...summary,
          riskLevel: plan.riskLevel
        }
      }).id
    );

    for (const dossier of plan.dossierSummaries) {
      eventIds.push(
        this.eventStore.appendEvent({
          type: "agent.dossier.created",
          taskId: plan.taskId,
          agentId: dossier.agentId,
          payload: {
            routeId: plan.routeId,
            taskId: plan.taskId,
            agentId: dossier.agentId,
            role: dossier.role,
            capabilityIds: dossier.allowedCapabilities,
            contextRefIds: dossier.contextRefIds,
            memoryRefIds: dossier.memoryRefIds,
            capabilityLeaseRefs: dossier.capabilityLeaseRefs,
            modelProfileId: dossier.modelProfileId,
            hash: dossier.hash
          }
        }).id
      );
    }

    return eventIds;
  }
}

export function createStaticAgentRouter(
  options: StaticAgentRouterOptions = {}
): StaticAgentRouter {
  return new DefaultStaticAgentRouter(options);
}

export function routeAgentTask(
  router: StaticAgentRouter,
  input: AgentRoutingInput
): AgentRoutingPlan {
  return router.routeAgentTask(input);
}

export function createAgentDossierForStep(
  step: Pick<AgentRoutingStep, "role" | "agentId" | "order">,
  input: AgentRoutingInput
): AgentDossier {
  return createDossier({
    role: step.role,
    agentId: step.agentId,
    order: step.order,
    input,
    routeId: "manual",
    createdAt:
      input.createdAt ?? new Date("2026-01-01T00:00:00.000Z").toISOString(),
    modelProfileIds: input.modelProfileIds ?? defaultModelProfileIds(),
    requiredCapabilities: input.requiredCapabilities ?? []
  });
}

function createRoutingStep(input: {
  role: AgentRole;
  order: number;
  routeId: string;
  createdAt: string;
  input: AgentRoutingInput;
  modelProfileIds: readonly string[];
  requiredCapabilities: readonly string[];
}): AgentRoutingStep {
  const agentId = `${input.input.taskId}:${input.role}`;
  return {
    stepId: `${input.routeId}:step-${input.order}`,
    order: input.order,
    role: input.role,
    agentId,
    dossier: createDossier({
      role: input.role,
      agentId,
      order: input.order,
      input: input.input,
      routeId: input.routeId,
      createdAt: input.createdAt,
      modelProfileIds: input.modelProfileIds,
      requiredCapabilities: input.requiredCapabilities
    })
  };
}

function createDossier(input: {
  role: AgentRole;
  agentId: string;
  order: number;
  routeId: string;
  createdAt: string;
  input: AgentRoutingInput;
  modelProfileIds: readonly string[];
  requiredCapabilities: readonly string[];
}): AgentDossier {
  const requiredOutputs = outputsForRole(
    input.role,
    input.input.requiredOutputs
  );
  const modelProfileId = modelProfileForRole(input.role, input.modelProfileIds);
  const dossierWithoutHash: Omit<AgentDossier, "hash"> = {
    agentId: input.agentId,
    role: input.role,
    taskId: input.input.taskId,
    objective: input.input.objective,
    acceptedFacts: [...(input.input.acceptedFacts ?? [])],
    activeConstraints: [...(input.input.constraints ?? [])],
    allowedCapabilities: [...input.requiredCapabilities].sort(),
    requiredOutputs,
    forbiddenSideEffects: [
      ...(input.input.forbiddenSideEffects ?? defaultForbiddenSideEffects)
    ],
    evidenceRefs: evidenceRefsForRole(
      input.role,
      input.input.evidenceRefs ?? []
    ),
    contextRefs: contextRefsFromReport(input.input.contextReport),
    memoryRefs: [...(input.input.memoryRefs ?? [])],
    capabilityLeaseRefs: [...(input.input.capabilityLeaseRefs ?? [])],
    modelProfileId,
    createdAt: input.createdAt,
    sensitivity: "internal",
    provenance: {
      routeId: input.routeId,
      order: input.order,
      intent: input.input.intent,
      requestedSideEffects: input.input.requestedSideEffects ?? []
    }
  };
  return {
    ...dossierWithoutHash,
    hash: createDossierHash(dossierWithoutHash)
  };
}

function validateRoutingInput(input: AgentRoutingInput): {
  status: "ok" | "needs_clarification" | "rejected";
  warnings: AgentRoutingWarning[];
  errors: AgentRoutingError[];
} {
  const warnings: AgentRoutingWarning[] = [];
  const errors: AgentRoutingError[] = [];

  if (input.taskId.length === 0) {
    errors.push(error("missing_task_id"));
  }
  if (input.objective.trim().length === 0) {
    errors.push(error("missing_objective"));
  }
  if (detectAgentIsolationViolations(input).length > 0) {
    errors.push(error("forbidden_raw_marker"));
  }
  if (input.bypassCapabilityBroker === true) {
    errors.push(error("capability_broker_bypass_rejected"));
  }
  for (const effect of input.requestedSideEffects ?? []) {
    if (forbiddenSideEffects.has(effect)) {
      errors.push(error("forbidden_side_effect_requested"));
    }
  }
  if (input.intent === "unknown" && input.objective.trim().length < 16) {
    warnings.push(warning("unknown_intent_needs_clarification"));
  }

  if (errors.length > 0) {
    return { status: "rejected", warnings, errors };
  }
  if (
    warnings.some((item) => item.code === "unknown_intent_needs_clarification")
  ) {
    return { status: "needs_clarification", warnings, errors };
  }
  return { status: "ok", warnings, errors };
}

function rolesForIntent(intent: AgentTaskIntent): AgentRole[] {
  switch (intent) {
    case "web_data_extraction":
      return ["orchestrator", "verifier"];
    case "code_change":
      return ["orchestrator", "coder", "reviewer", "verifier"];
    case "code_review":
      return ["orchestrator", "reviewer", "verifier"];
    case "verification":
      return ["orchestrator", "verifier"];
    case "documentation":
      return ["orchestrator", "coder", "reviewer"];
    case "unknown":
      return ["orchestrator"];
  }
}

function decideStatus(
  intent: AgentTaskIntent,
  preflightStatus: "ok" | "needs_clarification" | "rejected",
  errors: readonly AgentRoutingError[]
): AgentRoutingPlan["status"] {
  if (preflightStatus === "rejected") {
    return "rejected";
  }
  if (errors.some((item) => item.code === "forbidden_side_effect_requested")) {
    return "rejected";
  }
  if (errors.some((item) => item.code === "unknown_model_profile")) {
    return "rejected";
  }
  if (errors.length > 0 || preflightStatus === "needs_clarification") {
    return "needs_clarification";
  }
  if (intent === "unknown") {
    return "needs_clarification";
  }
  return "planned";
}

function outputsForRole(
  role: AgentRole,
  requested: readonly AgentRequiredOutput[] | undefined
): AgentRequiredOutput[] {
  if (role === "orchestrator") {
    return defaultRequiredOutputsForRole(role);
  }
  return requested !== undefined && requested.length > 0
    ? [...requested]
    : defaultRequiredOutputsForRole(role);
}

function evidenceRefsForRole(
  role: AgentRole,
  refs: readonly AgentEvidenceRef[]
): AgentEvidenceRef[] {
  if (role !== "verifier") {
    return refs.map((ref) => ({ ...ref }));
  }
  return refs.map((ref) => ({
    id: ref.id,
    kind: ref.kind,
    untrusted: ref.untrusted,
    ...(ref.summary !== undefined ? { summary: ref.summary } : {})
  }));
}

function contextRefsFromReport(
  report: AgentRoutingInput["contextReport"]
): AgentContextRef[] {
  if (report === undefined) {
    return [];
  }
  const refs: AgentContextRef[] = [
    {
      id: "context.globalFrozenPrefixHash",
      kind: "hash",
      hash: report.hashSummary.globalFrozenPrefixHash
    },
    {
      id: "context.taskContractHash",
      kind: "hash",
      hash: report.hashSummary.taskContractHash
    }
  ];
  for (const id of report.activeRuleIds) {
    refs.push({ id, kind: "active_rule" });
  }
  for (const id of report.noCompressZoneIds) {
    refs.push({ id, kind: "no_compress_zone" });
  }
  return refs;
}

function modelProfileForRole(
  role: AgentRole,
  modelProfileIds: readonly string[]
): string {
  const preferred = defaultAgentModelProfileByRole[role];
  return modelProfileIds.includes(preferred) ? preferred : preferred;
}

function modelProfilesIdsIncludes(
  role: AgentRole,
  modelProfileIds: readonly string[]
): string {
  return modelProfileForRole(role, modelProfileIds);
}

function modelProfileIdsForRoles(
  roles: readonly AgentRole[],
  modelProfileIds: readonly string[]
): string[] {
  return roles.map((role) => modelProfilesIdsIncludes(role, modelProfileIds));
}

function defaultModelProfileIds(): string[] {
  return listDeepSeekCapabilityProfiles().map((profile) => profile.modelId);
}

function isHighRisk(riskLevel: string): boolean {
  return (
    riskLevel === "A4_external_effect" ||
    riskLevel === "A5_sensitive_or_irreversible"
  );
}

function error(code: string): AgentRoutingError {
  return {
    code,
    safeMessage: `Agent routing rejected: ${code}`
  };
}

function warning(code: string): AgentRoutingWarning {
  return {
    code,
    safeMessage: `Agent routing warning: ${code}`
  };
}

function defaultRouteIdFactory(): () => string {
  let nextRoute = 0;
  return () => {
    nextRoute += 1;
    return `route-${nextRoute}`;
  };
}
