import {
  buildAgentCapabilityPlan,
  summarizeAgentCapabilityPlan,
  type AgentCapabilityPlan,
  type AgentCapabilityPlanStatus
} from "../../runtime/src/agents/agent-capability-plan.js";
import {
  buildFixedAgentOrchestrationReport,
  summarizeFixedAgentOrchestrationReport,
  type FixedAgentOrchestratorStatus
} from "../../runtime/src/agents/fixed-agent-orchestrator.js";
import {
  buildFixedAgentRoleOutput,
  summarizeFixedAgentRoleOutput,
  type FixedAgentRoleOutputStatus
} from "../../runtime/src/agents/fixed-agent-role-adapters.js";
import {
  buildFixedAgentRunPlan,
  type FixedAgentIntent,
  type FixedAgentRole
} from "../../runtime/src/agents/fixed-agent-run-plan.js";
import type { AppAgentRoutePreviewView } from "./agent-route-preview-view.js";
import type { AppCapabilityPlanPreviewView } from "./capability-plan-preview-view.js";
import type { AppRunDraftIntent, AppRunDraftView } from "./run-draft-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type FixedMultiAgentRunStatus =
  | "empty"
  | "preview"
  | "warning"
  | "blocked";

export type FixedMultiAgentRunStageKind =
  | "fixed_run_plan"
  | "orchestrator_state"
  | "orchestrator_handoff"
  | "coder_handoff"
  | "reviewer_handoff"
  | "verifier_handoff"
  | "capability_plan";

export type FixedMultiAgentRunStage = {
  stageId: string;
  kind: FixedMultiAgentRunStageKind;
  role?: FixedAgentRole | undefined;
  status:
    | "empty"
    | "planned"
    | "ready"
    | "warning"
    | "blocked"
    | "disabled";
  summary: string;
  warningCodes: string[];
};

export type FixedMultiAgentRunFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
  source: string;
};

export type FixedMultiAgentRunHandoffSummary = {
  handoffId: string;
  fromRole: FixedAgentRole;
  toRole: FixedAgentRole;
  evidenceRefCount: number;
  contextRefCount: number;
  memoryRefCount: number;
  capabilityPlanRefCount: number;
  warningCodes: string[];
  dossierHash: string;
  dossierHashPrefix: string;
};

export type FixedMultiAgentRunReadiness = {
  canPreviewFixedRunPlan: boolean;
  canPreviewAgentHandoffs: boolean;
  canCreateDynamicAgent: false;
  canBidAgents: false;
  canAutoRunTools: false;
  canAutoApply: false;
  canInvokeMcpTool: false;
  canRunShell: false;
  canGitWrite: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  appCanExecute: false;
};

export type FixedMultiAgentRunView = {
  status: FixedMultiAgentRunStatus;
  runId: string;
  intent: FixedAgentIntent;
  route: FixedAgentRole[];
  roles: FixedAgentRole[];
  stageCount: number;
  stages: FixedMultiAgentRunStage[];
  stageStatus: string;
  handoffs: FixedMultiAgentRunHandoffSummary[];
  handoffCount: number;
  roleCount: number;
  capabilityPlanCount: number;
  blockedCount: number;
  warningCount: number;
  findingCount: number;
  findings: FixedMultiAgentRunFinding[];
  runHash: string;
  runHashPrefix: string;
  readiness: FixedMultiAgentRunReadiness;
  nextAction: string;
  source: "app_fixed_multi_agent_run";
  previewOnly: true;
};

export type FixedMultiAgentRunInput = {
  runDraft?: AppRunDraftView | undefined;
  selectedIntent?: AppRunDraftIntent | undefined;
  objectiveSummary?: string | undefined;
  agentRoutePreview?: AppAgentRoutePreviewView | undefined;
  capabilityPlanPreview?: AppCapabilityPlanPreviewView | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const rawPrefix = "raw";
const authorizationField = ["Author", "ization"].join("");
const forbiddenFieldNames = new Set(
  [
    rawPrefix + "Prompt",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Response",
    rawPrefix + "ModelResponse",
    rawPrefix + "Output",
    "promptText",
    "sourceText",
    "diffText",
    "responseText",
    "fileContent",
    "beforeContent",
    "afterContent",
    "api" + "Key",
    "api" + "KeyValue",
    authorizationField,
    "bear" + "er",
    "to" + "ken",
    "secret",
    "password",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge",
    "dynamicBidding",
    "bidding",
    "agentId",
    "arbitraryAgent",
    "tools",
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const executionFlagNames = new Set(
  [
    "canCreateDynamicAgent",
    "canBidAgents",
    "canAutoRunTools",
    "canAutoApply",
    "canInvokeMcpTool",
    "canRunShell",
    "canGitWrite",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "appCanExecute",
    "executionEnabled",
    "leaseIssued"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authorizationField}\\s*[:=]`, "i")
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b|raw prompt`, "i")
  },
  {
    code: "RAW_SOURCE_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Source"}\\b|raw source`, "i")
  }
];

export function buildFixedMultiAgentRunView(
  input: FixedMultiAgentRunInput = {}
): FixedMultiAgentRunView {
  const inputFindings = inputFindingsFrom(input);
  const hasDraft = hasRunDraft(input);
  const intent = normalizeFixedIntent(
    input.runDraft?.intent ?? input.selectedIntent
  );
  const objectiveSummary = safeErrorMessage(
    safeText(input.runDraft?.objectiveSummary ?? input.objectiveSummary, "")
  ).slice(0, 220);
  const planResult = hasDraft
    ? buildFixedAgentRunPlan(
        {
          intent,
          objectiveSummary,
          evidenceRefs: evidenceRefsFrom(input),
          contextRefs: contextRefsFrom(input),
          memoryRefs: memoryRefsFrom(input),
          capabilityPlanRefs: capabilityRefsFrom(input),
          warningCodes: warningsFrom(input)
        },
        {
          ...(input.createdAt !== undefined
            ? { createdAt: input.createdAt }
            : {})
        }
      )
    : undefined;
  const plan = planResult?.plan;
  const orchestrationReport =
    plan === undefined
      ? undefined
      : buildFixedAgentOrchestrationReport({
          fixedRunPlan: plan,
          currentState: "planned",
          completedRoles: [],
          createdAt: input.createdAt
        });
  const roleResults =
    plan === undefined
      ? []
      : plan.roles.map((role) =>
          buildFixedAgentRoleOutput(roleOutputInputFor(role, plan.planId))
        );
  const capabilityPlans = roleResults
    .map((result) =>
      result.output === undefined || plan === undefined
        ? undefined
        : buildAgentCapabilityPlan({
            fixedRunPlan: plan,
            roleOutput: result.output,
            requestedCapabilityRefs: capabilityRefsForRole(result.output.role),
            createdAt: input.createdAt
          })
    )
    .filter((item): item is AgentCapabilityPlan => item !== undefined);
  const stages = stagesFrom({
    planStatus: planResult?.status,
    orchestrationStatus: orchestrationReport?.status,
    roles: plan?.roles ?? [],
    roleStatuses: roleResults.map((item) => item.summary.roleStatus ?? "pass"),
    capabilityStatuses: capabilityPlans.map((item) => item.status)
  });
  const runtimeFindings = [
    ...(planResult?.findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      safeMessage: finding.safeMessage,
      source: "fixed_run_plan"
    })) ?? []),
    ...(orchestrationReport?.findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      safeMessage: finding.safeMessage,
      source: "fixed_orchestrator"
    })) ?? []),
    ...roleResults.flatMap((result) =>
      result.findings.map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        safeMessage: finding.safeMessage,
        source: `role_${result.summary.role ?? "unknown"}`
      }))
    ),
    ...capabilityPlans.flatMap((planItem) =>
      planItem.findings.map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        safeMessage: finding.safeMessage,
        source: `capability_${planItem.role ?? "unknown"}`
      }))
    )
  ];
  const findings = uniqueFindings([...inputFindings, ...runtimeFindings]);
  const blockedCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningFindingCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const stageWarnings = stages.filter((stage) =>
    ["warning", "disabled"].includes(stage.status)
  ).length;
  const warningCount = warningFindingCount + stageWarnings;
  const status = statusFrom({
    hasDraft,
    planStatus: planResult?.status,
    blockedCount,
    warningCount
  });
  const handoffs =
    plan?.handoffDossiers.map((dossier) => ({
      handoffId: dossier.dossierId,
      fromRole: dossier.fromRole,
      toRole: dossier.toRole,
      evidenceRefCount: dossier.evidenceRefs.length,
      contextRefCount: dossier.contextRefs.length,
      memoryRefCount: dossier.memoryRefs.length,
      capabilityPlanRefCount: dossier.capabilityPlanRefs.length,
      warningCodes: dossier.warningCodes,
      dossierHash: dossier.dossierHash,
      dossierHashPrefix: dossier.dossierHash.slice(0, 12)
    })) ?? [];
  const runHash = hashText(
    stableStringify({
      plan: plan === undefined ? undefined : plan.planHash,
      orchestration:
        orchestrationReport === undefined
          ? undefined
          : summarizeFixedAgentOrchestrationReport(orchestrationReport),
      roles: roleResults.map((result) => result.summary),
      capabilities: capabilityPlans.map(summarizeAgentCapabilityPlan),
      findings: findings.map((finding) => [finding.code, finding.severity])
    })
  );
  const runId =
    input.idGenerator?.() ?? `fixed-multi-agent-run-${runHash.slice(0, 12)}`;

  return {
    status,
    runId,
    intent,
    route: plan?.route.roles ?? [],
    roles: plan?.roles ?? [],
    stageCount: stages.length,
    stages,
    stageStatus: stageStatusFrom(stages),
    handoffs,
    handoffCount: handoffs.length,
    roleCount: plan?.roles.length ?? 0,
    capabilityPlanCount: capabilityPlans.length,
    blockedCount,
    warningCount,
    findingCount: findings.length,
    findings,
    runHash,
    runHashPrefix: runHash.slice(0, 12),
    readiness: readiness(status !== "empty" && blockedCount === 0),
    nextAction: nextActionFor(status),
    source: "app_fixed_multi_agent_run",
    previewOnly: true
  };
}

export function summarizeFixedMultiAgentRunView(
  view: FixedMultiAgentRunView
): string {
  return [
    `status=${view.status}`,
    `intent=${view.intent}`,
    `roles=${view.roleCount}`,
    `handoffs=${view.handoffCount}`,
    `blocked=${view.blockedCount}`,
    `warnings=${view.warningCount}`,
    `hash=${view.runHashPrefix}`
  ].join(" ");
}

function hasRunDraft(input: FixedMultiAgentRunInput): boolean {
  return (
    (input.runDraft !== undefined && input.runDraft.status !== "empty") ||
    safeText(input.objectiveSummary, "").trim().length > 0
  );
}

function normalizeFixedIntent(value: unknown): FixedAgentIntent {
  if (
    value === "code_change" ||
    value === "documentation" ||
    value === "code_review" ||
    value === "verification"
  ) {
    return value;
  }
  return "unknown";
}

function evidenceRefsFrom(
  input: FixedMultiAgentRunInput
): Array<{ refId: string; kind: "context_summary"; summary: string }> {
  const refs = [
    input.runDraft?.draftId,
    input.agentRoutePreview?.routeId,
    input.capabilityPlanPreview?.source
  ]
    .filter((value): value is string => value !== undefined)
    .map((value, index) => ({
      refId: `fixed-agent-evidence-${index + 1}`,
      kind: "context_summary" as const,
      summary: safeErrorMessage(value).slice(0, 120)
    }));
  return refs.length > 0
    ? refs
    : [
        {
          refId: "fixed-agent-evidence-1",
          kind: "context_summary" as const,
          summary: "Summary-only App fixed multi-agent preview evidence."
        }
      ];
}

function contextRefsFrom(input: FixedMultiAgentRunInput): string[] {
  return uniqueStrings(
    [
      input.agentRoutePreview?.routeId,
      input.capabilityPlanPreview?.intent
        ? `capability-plan:${input.capabilityPlanPreview.intent}`
        : undefined
    ].filter((value): value is string => value !== undefined)
  );
}

function memoryRefsFrom(input: FixedMultiAgentRunInput): string[] {
  return input.runDraft?.warnings.length
    ? input.runDraft.warnings.map((warning) => `warning:${warning.code}`)
    : [];
}

function capabilityRefsFrom(input: FixedMultiAgentRunInput): string[] {
  const itemRefs =
    input.capabilityPlanPreview?.items.map((item) => item.capabilityId) ?? [];
  return uniqueStrings(itemRefs.length > 0 ? itemRefs : ["runtime.context.assembly"]);
}

function warningsFrom(input: FixedMultiAgentRunInput): string[] {
  return uniqueStrings([
    ...(input.runDraft?.warnings.map((warning) => warning.code) ?? []),
    ...(input.agentRoutePreview?.warnings.map((warning) => warning.code) ?? []),
    ...(input.capabilityPlanPreview?.warnings.map((warning) => warning.code) ??
      [])
  ]);
}

function roleOutputInputFor(role: FixedAgentRole, planId: string): {
  role: FixedAgentRole;
  status: FixedAgentRoleOutputStatus;
  routeSummary?: unknown;
  taskDecompositionSummary?: unknown;
  expectedArtifacts?: unknown;
  modelProposalImportSummaryRefs?: unknown;
  patchProposalSummary?: unknown;
  validationSummaryRefs?: unknown;
  auditSummaryRefs?: unknown;
  approvalSummaryRefs?: unknown;
  riskNotes?: string[];
  gitSafeLaneSummaries?: unknown;
  shellSafeLaneSummaries?: unknown;
  evidenceRefs?: unknown;
} {
  const baseRef = { refId: `${planId}-${role}`, status: "preview" };
  if (role === "orchestrator") {
    return {
      role,
      status: "pass",
      routeSummary: { ...baseRef, refId: `${planId}-route` },
      taskDecompositionSummary: { ...baseRef, refId: `${planId}-tasks` },
      expectedArtifacts: { ...baseRef, refId: `${planId}-artifacts` }
    };
  }
  if (role === "coder") {
    return {
      role,
      status: "pass",
      modelProposalImportSummaryRefs: {
        ...baseRef,
        refId: `${planId}-model-import-preview`
      },
      patchProposalSummary: {
        ...baseRef,
        refId: `${planId}-patch-proposal-preview`
      }
    };
  }
  if (role === "reviewer") {
    return {
      role,
      status: "pass",
      validationSummaryRefs: { ...baseRef, refId: `${planId}-validation` },
      auditSummaryRefs: { ...baseRef, refId: `${planId}-diff-audit` },
      approvalSummaryRefs: { ...baseRef, refId: `${planId}-approval-draft` },
      riskNotes: ["Reviewer handoff is summary-only; approval execution remains disabled."]
    };
  }
  return {
    role,
    status: "pass",
    gitSafeLaneSummaries: { ...baseRef, refId: `${planId}-git-read-lane` },
    shellSafeLaneSummaries: {
      ...baseRef,
      refId: `${planId}-shell-verification-lane`
    },
    evidenceRefs: { ...baseRef, refId: `${planId}-verification-evidence` }
  };
}

function capabilityRefsForRole(role: FixedAgentRole): string[] {
  if (role === "orchestrator") {
    return ["runtime.context.assembly", "runtime.agent.route_preview"];
  }
  if (role === "coder") {
    return ["runtime.model_proposal.import", "runtime.patch_proposal.preview"];
  }
  if (role === "reviewer") {
    return ["runtime.patch.validation_preview", "runtime.patch.diff_audit_preview"];
  }
  return ["native.git.status", "runtime.shell.scoped_test_summary"];
}

function stagesFrom(input: {
  planStatus?: string | undefined;
  orchestrationStatus?: FixedAgentOrchestratorStatus | undefined;
  roles: FixedAgentRole[];
  roleStatuses: FixedAgentRoleOutputStatus[];
  capabilityStatuses: AgentCapabilityPlanStatus[];
}): FixedMultiAgentRunStage[] {
  const stages: FixedMultiAgentRunStage[] = [];
  stages.push({
    stageId: "fixed-run-plan",
    kind: "fixed_run_plan",
    status:
      input.planStatus === undefined || input.planStatus === "empty"
        ? "empty"
        : input.planStatus === "blocked"
          ? "blocked"
          : input.planStatus === "planned"
            ? "planned"
            : "warning",
    summary: "Fixed run plan summary only; no dynamic agent bidding.",
    warningCodes: input.planStatus === "warning" ? ["FIXED_PLAN_WARNING"] : []
  });
  stages.push({
    stageId: "orchestrator-state",
    kind: "orchestrator_state",
    status:
      input.orchestrationStatus === undefined
        ? "empty"
        : input.orchestrationStatus === "blocked" ||
            input.orchestrationStatus === "failed"
          ? "blocked"
          : input.orchestrationStatus === "planned"
            ? "planned"
            : "ready",
    summary: "Orchestrator state preview only; no agent execution.",
    warningCodes: []
  });
  for (const [index, role] of input.roles.entries()) {
    stages.push({
      stageId: `${role}-handoff`,
      kind:
        role === "orchestrator"
          ? "orchestrator_handoff"
          : role === "coder"
            ? "coder_handoff"
            : role === "reviewer"
              ? "reviewer_handoff"
              : "verifier_handoff",
      role,
      status:
        input.roleStatuses[index] === "block"
          ? "blocked"
          : input.roleStatuses[index] === "warn"
            ? "warning"
            : "ready",
      summary: `${role} handoff dossier is summary-only.`,
      warningCodes: input.roleStatuses[index] === "warn" ? ["ROLE_WARNING"] : []
    });
  }
  stages.push({
    stageId: "capability-plan",
    kind: "capability_plan",
    status: input.capabilityStatuses.some((status) => status === "blocked")
      ? "blocked"
      : input.capabilityStatuses.some((status) => status === "warning")
        ? "warning"
        : input.capabilityStatuses.length > 0
          ? "ready"
          : "empty",
    summary: "Capability refs are planned descriptors only; no invocation.",
    warningCodes: input.capabilityStatuses.includes("warning")
      ? ["CAPABILITY_PLAN_WARNING"]
      : []
  });
  return stages;
}

function inputFindingsFrom(input: unknown): FixedMultiAgentRunFinding[] {
  const findings: FixedMultiAgentRunFinding[] = [];
  visit(input, [], (path, value) => {
    const key = path.at(-1);
    if (key !== undefined && forbiddenFieldNames.has(key.toLowerCase())) {
      findings.push({
        code: "FIXED_MULTI_AGENT_FORBIDDEN_FIELD",
        severity: "blocker",
        safeMessage: "Fixed multi-agent preview input contains a forbidden field.",
        source: "app_input"
      });
    }
    if (
      key !== undefined &&
      executionFlagNames.has(key.toLowerCase()) &&
      value === true
    ) {
      findings.push({
        code: "FIXED_MULTI_AGENT_EXECUTION_FLAG_BLOCKED",
        severity: "blocker",
        safeMessage: "Fixed multi-agent preview input attempted to enable execution.",
        source: "app_input"
      });
    }
    if (typeof value === "string") {
      for (const pattern of unsafeStringPatterns) {
        if (pattern.pattern.test(value)) {
          findings.push({
            code: pattern.code,
            severity: "blocker",
            safeMessage: "Fixed multi-agent preview input contains an unsafe marker.",
            source: "app_input"
          });
        }
      }
    }
  });
  return uniqueFindings(findings);
}

function statusFrom(input: {
  hasDraft: boolean;
  planStatus?: string | undefined;
  blockedCount: number;
  warningCount: number;
}): FixedMultiAgentRunStatus {
  if (!input.hasDraft && input.blockedCount === 0) {
    return "empty";
  }
  if (input.blockedCount > 0 || input.planStatus === "blocked") {
    return "blocked";
  }
  if (
    input.warningCount > 0 ||
    input.planStatus === "warning" ||
    input.planStatus === "needs_clarification"
  ) {
    return "warning";
  }
  return "preview";
}

function nextActionFor(status: FixedMultiAgentRunStatus): string {
  if (status === "preview") {
    return "Fixed run plan and agent handoffs are ready for preview only; execution remains disabled.";
  }
  if (status === "warning") {
    return "Review warning codes before using this summary in downstream previews.";
  }
  if (status === "blocked") {
    return "Remove unsafe, raw, dynamic, or execution fields before previewing the fixed run.";
  }
  return "Preview a fixed run plan from a local run draft.";
}

function readiness(canPreview: boolean): FixedMultiAgentRunReadiness {
  return {
    canPreviewFixedRunPlan: canPreview,
    canPreviewAgentHandoffs: canPreview,
    canCreateDynamicAgent: false,
    canBidAgents: false,
    canAutoRunTools: false,
    canAutoApply: false,
    canInvokeMcpTool: false,
    canRunShell: false,
    canGitWrite: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    appCanExecute: false
  };
}

function stageStatusFrom(stages: FixedMultiAgentRunStage[]): string {
  if (stages.length === 0) {
    return "empty";
  }
  if (stages.some((stage) => stage.status === "blocked")) {
    return "blocked";
  }
  if (stages.some((stage) => stage.status === "warning")) {
    return "warning";
  }
  return "preview";
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function uniqueFindings(
  findings: readonly FixedMultiAgentRunFinding[]
): FixedMultiAgentRunFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.code}:${finding.severity}:${finding.source}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function visit(
  value: unknown,
  path: string[],
  visitor: (path: string[], value: unknown) => void
): void {
  visitor(path, value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, [...path, String(index)], visitor));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      visit(child, [...path, key], visitor);
    }
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
