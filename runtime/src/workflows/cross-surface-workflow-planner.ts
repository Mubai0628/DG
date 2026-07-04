import {
  summarizeCrossSurfaceWorkflowScenario,
  validateCrossSurfaceWorkflowScenario,
  type CrossSurfaceScenarioValidationResult,
  type CrossSurfaceWorkflowScenario,
  type CrossSurfaceWorkflowScenarioInput,
  type CrossSurfaceWorkflowStageKind
} from "../models/cross-surface-workflow-scenario.js";
import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type CrossSurfaceWorkflowPlanStepKind =
  | "objective"
  | "proposal_generation"
  | "agent_route"
  | "knowledge_recall"
  | "mcp_evidence"
  | "plugin_skill_metadata"
  | "desktop_observer"
  | "desktop_proposal"
  | "desktop_action_approval"
  | "workspace_apply_approval"
  | "verification"
  | "rollback_optional"
  | "replay_audit";

export type CrossSurfaceWorkflowPlanStepStatus =
  | "missing"
  | "ready"
  | "warning"
  | "blocked";

export type CrossSurfaceWorkflowPlanStatus =
  | "empty"
  | "plan_ready"
  | "warning"
  | "blocked";

export type CrossSurfaceWorkflowStateKind =
  | "empty"
  | "objective_ready"
  | "proposal_ready"
  | "agent_route_ready"
  | "knowledge_ready"
  | "mcp_evidence_ready"
  | "plugin_skill_ready"
  | "desktop_observer_ready"
  | "desktop_proposal_ready"
  | "desktop_action_approval_ready"
  | "workspace_apply_approval_ready"
  | "verification_ready"
  | "rollback_ready"
  | "replay_ready"
  | "completed"
  | "blocked";

export type CrossSurfaceWorkflowFindingKind =
  | "scenario"
  | "raw_field"
  | "secret"
  | "execution_claim"
  | "route"
  | "stage"
  | "readiness";

export type CrossSurfaceWorkflowFindingSeverity = "blocker" | "warning";

export type CrossSurfaceWorkflowFinding = {
  findingId: string;
  kind: CrossSurfaceWorkflowFindingKind;
  severity: CrossSurfaceWorkflowFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type CrossSurfaceWorkflowSummaryRef = {
  refId?: string | undefined;
  status?: string | undefined;
  summary?: string | undefined;
  warningCodes?: string[] | undefined;
  blockerCodes?: string[] | undefined;
  warningCount?: number | undefined;
  blockerCount?: number | undefined;
  hashPrefix?: string | undefined;
  readiness?: Record<string, unknown> | undefined;
  [key: string]: unknown;
};

export type CrossSurfaceWorkflowPlanStep = {
  kind: CrossSurfaceWorkflowPlanStepKind;
  scenarioStageKind: CrossSurfaceWorkflowStageKind;
  status: CrossSurfaceWorkflowPlanStepStatus;
  refId?: string | undefined;
  stageId?: string | undefined;
  stateAfter: CrossSurfaceWorkflowStateKind;
  summaryHash?: string | undefined;
  warningCodes: string[];
  blockerCodes: string[];
};

export type CrossSurfaceWorkflowPlannerInput = {
  scenario?:
    | CrossSurfaceWorkflowScenarioInput
    | CrossSurfaceWorkflowScenario
    | CrossSurfaceScenarioValidationResult
    | undefined;
  summaryRefs?:
    | Partial<
        Record<CrossSurfaceWorkflowPlanStepKind, CrossSurfaceWorkflowSummaryRef>
      >
    | undefined;
  objectiveSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  proposalGenerationSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  agentRouteSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  knowledgeRecallSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  mcpEvidenceSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  pluginSkillMetadataSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  desktopObserverSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  desktopProposalSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  desktopActionApprovalSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  workspaceApplyApprovalSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  verificationSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  rollbackSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  replayAuditSummaryRef?: CrossSurfaceWorkflowSummaryRef | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CrossSurfaceWorkflowReadiness = {
  canAdvanceStateMachine: boolean;
  canRunAgents: false;
  canCallDeepSeek: false;
  canInvokeMcpTools: false;
  canInvokePluginRuntime: false;
  canInvokeSkillRuntime: false;
  canExecuteDesktopAction: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type CrossSurfaceWorkflowPlan = {
  planId: string;
  scenarioId?: string | undefined;
  status: CrossSurfaceWorkflowPlanStatus;
  state: CrossSurfaceWorkflowStateKind;
  stepCount: number;
  readyStepCount: number;
  missingStepCount: number;
  blockedStepCount: number;
  warningStepCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  steps: CrossSurfaceWorkflowPlanStep[];
  findings: CrossSurfaceWorkflowFinding[];
  planHash: string;
  readiness: CrossSurfaceWorkflowReadiness;
  nextAction: string;
  source: "runtime_cross_surface_workflow_planner";
};

export type CrossSurfaceWorkflowState = {
  planId: string;
  state: CrossSurfaceWorkflowStateKind;
  nextExpectedState?: CrossSurfaceWorkflowStateKind | undefined;
  currentStep?: CrossSurfaceWorkflowPlanStepKind | undefined;
  nextStep?: CrossSurfaceWorkflowPlanStepKind | undefined;
  completedStepCount: number;
  canAdvanceStateMachine: boolean;
  stateHash: string;
  nextAction: string;
  source: "runtime_cross_surface_workflow_state";
};

export type CrossSurfaceWorkflowStateInput = {
  plan?: CrossSurfaceWorkflowPlan | undefined;
  plannerInput?: CrossSurfaceWorkflowPlannerInput | undefined;
  currentState?: CrossSurfaceWorkflowStateKind | undefined;
};

const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authHeaderField = ["Author", "ization"].join("");
const reasoningCamelField = ["reasoning", "Content"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const fixedStepDefinitions = [
  ["objective", "user_objective", "objective_ready"],
  ["proposal_generation", "live_proposal", "proposal_ready"],
  ["agent_route", "fixed_agent_route", "agent_route_ready"],
  ["knowledge_recall", "project_knowledge_recall", "knowledge_ready"],
  ["mcp_evidence", "mcp_readonly_evidence", "mcp_evidence_ready"],
  [
    "plugin_skill_metadata",
    "plugin_skill_metadata_evidence",
    "plugin_skill_ready"
  ],
  ["desktop_observer", "desktop_observer_evidence", "desktop_observer_ready"],
  ["desktop_proposal", "desktop_action_proposal", "desktop_proposal_ready"],
  [
    "desktop_action_approval",
    "approved_desktop_action_optional",
    "desktop_action_approval_ready"
  ],
  [
    "workspace_apply_approval",
    "approved_workspace_apply",
    "workspace_apply_approval_ready"
  ],
  ["verification", "git_shell_verification", "verification_ready"],
  ["rollback_optional", "rollback_optional", "rollback_ready"],
  ["replay_audit", "unified_replay_audit", "completed"]
] as const satisfies ReadonlyArray<
  readonly [
    CrossSurfaceWorkflowPlanStepKind,
    CrossSurfaceWorkflowStageKind,
    CrossSurfaceWorkflowStateKind
  ]
>;

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    rawPrefix + "Response",
    reasoningCamelField,
    reasoningSnakeField,
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Screenshot",
    rawPrefix + "OcrText",
    "fileContent",
    "preimageContent",
    apiKeyField,
    authHeaderField,
    "bearer",
    "token",
    "secret",
    "command",
    "shellCommand",
    "gitCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "nativeBridge",
    "desktopActionExecution",
    "mcpToolInvoke",
    "pluginRuntime",
    "skillRuntime",
    "tools",
    toolChoiceField,
    "dynamicAgentBidding"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "canRunAgents",
    "canCallDeepSeek",
    "canInvokeMcpTools",
    "canInvokePluginRuntime",
    "canInvokeSkillRuntime",
    "canExecuteDesktopAction",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "canIssuePermissionLease",
    "canUseNativeBridge",
    "appCanExecute",
    "claimsExecution"
  ].map((field) => field.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

const emptyReadiness: CrossSurfaceWorkflowReadiness = {
  canAdvanceStateMachine: false,
  canRunAgents: false,
  canCallDeepSeek: false,
  canInvokeMcpTools: false,
  canInvokePluginRuntime: false,
  canInvokeSkillRuntime: false,
  canExecuteDesktopAction: false,
  canApplyPatch: false,
  canRollback: false,
  canWriteEventStore: false,
  canExecuteGit: false,
  canExecuteShell: false,
  canIssuePermissionLease: false,
  canUseNativeBridge: false,
  appCanExecute: false
};

export function buildCrossSurfaceWorkflowPlan(
  input: CrossSurfaceWorkflowPlannerInput = {}
): CrossSurfaceWorkflowPlan {
  const planId =
    input.idGenerator?.() ??
    `cross-surface-plan-${stablePreviewHash(stableStringify(input)).slice(0, 12)}`;
  const scenarioResult = resolveScenario(input.scenario);
  const findings: CrossSurfaceWorkflowFinding[] = [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input)
  ];

  if (input.scenario === undefined) {
    return buildPlan({
      planId,
      status: "empty",
      state: "empty",
      steps: fixedStepDefinitions.map(
        ([kind, scenarioStageKind, stateAfter]) => ({
          kind,
          scenarioStageKind,
          status: "missing",
          stateAfter,
          warningCodes: [],
          blockerCodes: []
        })
      ),
      findings: [
        ...findings,
        finding("scenario", "warning", "MISSING_SCENARIO")
      ]
    });
  }

  if (
    scenarioResult.status === "blocked" ||
    scenarioResult.scenario === undefined
  ) {
    findings.push(finding("scenario", "blocker", "SCENARIO_BLOCKED"));
  }

  const scenario = scenarioResult.scenario;
  const steps = buildSteps(input, scenario);
  for (const step of steps) {
    if (step.status === "missing") {
      findings.push(
        finding("stage", "warning", "MISSING_STAGE_REF", step.kind)
      );
    }
    for (const code of step.blockerCodes) {
      findings.push(finding("stage", "blocker", code, step.kind));
    }
  }

  const unique = uniqueFindings(findings);
  const status = planStatus(steps, unique, input.scenario === undefined);
  const state = status === "blocked" ? "blocked" : deriveState(steps);

  return buildPlan({
    planId,
    scenarioId: scenario?.scenarioId,
    status,
    state,
    steps,
    findings: unique
  });
}

export function advanceCrossSurfaceWorkflowState(
  input: CrossSurfaceWorkflowStateInput = {}
): CrossSurfaceWorkflowState {
  const plan = input.plan ?? buildCrossSurfaceWorkflowPlan(input.plannerInput);
  if (plan.status === "blocked") {
    return buildState(plan, "blocked");
  }
  if (plan.status === "empty") {
    return buildState(plan, "empty");
  }
  const lastReady = [...plan.steps]
    .reverse()
    .find((step) => step.status === "ready" || step.status === "warning");
  return buildState(
    plan,
    input.currentState ?? lastReady?.stateAfter ?? "empty"
  );
}

export function summarizeCrossSurfaceWorkflowPlan(
  plan: CrossSurfaceWorkflowPlan
): Pick<
  CrossSurfaceWorkflowPlan,
  | "planId"
  | "scenarioId"
  | "status"
  | "state"
  | "stepCount"
  | "readyStepCount"
  | "missingStepCount"
  | "blockedStepCount"
  | "warningStepCount"
  | "blockerCount"
  | "warningCount"
  | "planHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    planId: plan.planId,
    scenarioId: plan.scenarioId,
    status: plan.status,
    state: plan.state,
    stepCount: plan.stepCount,
    readyStepCount: plan.readyStepCount,
    missingStepCount: plan.missingStepCount,
    blockedStepCount: plan.blockedStepCount,
    warningStepCount: plan.warningStepCount,
    blockerCount: plan.blockerCount,
    warningCount: plan.warningCount,
    planHash: plan.planHash,
    readiness: plan.readiness,
    nextAction: plan.nextAction,
    source: plan.source
  };
}

function buildPlan(input: {
  planId: string;
  scenarioId?: string | undefined;
  status: CrossSurfaceWorkflowPlanStatus;
  state: CrossSurfaceWorkflowStateKind;
  steps: CrossSurfaceWorkflowPlanStep[];
  findings: CrossSurfaceWorkflowFinding[];
}): CrossSurfaceWorkflowPlan {
  const readyStepCount = input.steps.filter(
    (step) => step.status === "ready"
  ).length;
  const missingStepCount = input.steps.filter(
    (step) => step.status === "missing"
  ).length;
  const blockedStepCount = input.steps.filter(
    (step) => step.status === "blocked"
  ).length;
  const warningStepCount = input.steps.filter(
    (step) => step.status === "warning"
  ).length;
  const blockerCount = input.findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount =
    input.findings.filter((finding) => finding.severity === "warning").length +
    warningStepCount +
    missingStepCount;
  const planHash = stablePreviewHash(
    stableStringify({
      planId: input.planId,
      scenarioId: input.scenarioId,
      status: input.status,
      state: input.state,
      steps: input.steps.map((step) => ({
        kind: step.kind,
        status: step.status,
        refId: step.refId,
        stageId: step.stageId,
        warningCodes: step.warningCodes,
        blockerCodes: step.blockerCodes
      })),
      findings: input.findings.map((finding) => finding.code)
    })
  );
  return {
    planId: input.planId,
    ...(input.scenarioId !== undefined ? { scenarioId: input.scenarioId } : {}),
    status: input.status,
    state: input.state,
    stepCount: input.steps.length,
    readyStepCount,
    missingStepCount,
    blockedStepCount,
    warningStepCount,
    blockerCount,
    warningCount,
    findingCount: input.findings.length,
    steps: input.steps,
    findings: input.findings,
    planHash,
    readiness: {
      ...emptyReadiness,
      canAdvanceStateMachine:
        input.status !== "blocked" && input.status !== "empty"
    },
    nextAction: nextActionFor(input.status, input.state),
    source: "runtime_cross_surface_workflow_planner"
  };
}

function buildSteps(
  input: CrossSurfaceWorkflowPlannerInput,
  scenario: CrossSurfaceWorkflowScenario | undefined
): CrossSurfaceWorkflowPlanStep[] {
  return fixedStepDefinitions.map(([kind, scenarioStageKind, stateAfter]) => {
    const stage = scenario?.stages.find(
      (item) => item.kind === scenarioStageKind
    );
    const summary = summaryForStep(input, kind);
    const warningCodes = uniqueStrings([
      ...(stage?.warningCodes ?? []),
      ...stringArray(summary?.warningCodes)
    ]);
    const blockerCodes = uniqueStrings([
      ...(stage?.blockerCodes ?? []),
      ...stringArray(summary?.blockerCodes)
    ]);
    const status = stepStatus(stage, summary, blockerCodes, warningCodes);
    return {
      kind,
      scenarioStageKind,
      status,
      refId: safeString(summary?.refId) || undefined,
      stageId: stage?.stageId,
      stateAfter,
      summaryHash: stablePreviewHash(
        stableStringify({
          kind,
          stageId: stage?.stageId,
          summaryRef: summary?.refId,
          warningCodes,
          blockerCodes
        })
      ).slice(0, 16),
      warningCodes,
      blockerCodes
    };
  });
}

function stepStatus(
  stage: CrossSurfaceWorkflowScenario["stages"][number] | undefined,
  summary: CrossSurfaceWorkflowSummaryRef | undefined,
  blockerCodes: string[],
  warningCodes: string[]
): CrossSurfaceWorkflowPlanStepStatus {
  if (stage === undefined) {
    return "missing";
  }
  const statusText = safeString(summary?.status).toLowerCase();
  if (
    blockerCodes.length > 0 ||
    statusText.includes("blocked") ||
    (summary?.blockerCount ?? 0) > 0
  ) {
    return "blocked";
  }
  if (
    warningCodes.length > 0 ||
    statusText.includes("warning") ||
    (summary?.warningCount ?? 0) > 0
  ) {
    return "warning";
  }
  return "ready";
}

function deriveState(
  steps: readonly CrossSurfaceWorkflowPlanStep[]
): CrossSurfaceWorkflowStateKind {
  if (
    steps.every((step) => step.status === "ready" || step.status === "warning")
  ) {
    return "completed";
  }
  const lastReady = [...steps]
    .reverse()
    .find((step) => step.status === "ready" || step.status === "warning");
  return lastReady?.stateAfter ?? "empty";
}

function buildState(
  plan: CrossSurfaceWorkflowPlan,
  state: CrossSurfaceWorkflowStateKind
): CrossSurfaceWorkflowState {
  const currentIndex = plan.steps.findIndex(
    (step) => step.stateAfter === state
  );
  const next = plan.steps.find(
    (step) => step.status === "missing" || step.status === "blocked"
  );
  const completedStepCount = plan.steps.filter(
    (step) => step.status === "ready" || step.status === "warning"
  ).length;
  const stateHash = stablePreviewHash(
    stableStringify({
      planId: plan.planId,
      state,
      nextStep: next?.kind,
      completedStepCount
    })
  );
  return {
    planId: plan.planId,
    state,
    ...(next?.stateAfter !== undefined
      ? { nextExpectedState: next.stateAfter }
      : {}),
    ...(currentIndex >= 0
      ? { currentStep: plan.steps[currentIndex]?.kind }
      : {}),
    ...(next !== undefined ? { nextStep: next.kind } : {}),
    completedStepCount,
    canAdvanceStateMachine: plan.readiness.canAdvanceStateMachine,
    stateHash,
    nextAction: nextActionFor(plan.status, state),
    source: "runtime_cross_surface_workflow_state"
  };
}

function planStatus(
  steps: readonly CrossSurfaceWorkflowPlanStep[],
  findings: readonly CrossSurfaceWorkflowFinding[],
  empty: boolean
): CrossSurfaceWorkflowPlanStatus {
  if (empty) {
    return "empty";
  }
  if (
    findings.some((finding) => finding.severity === "blocker") ||
    steps.some((step) => step.status === "blocked")
  ) {
    return "blocked";
  }
  if (
    findings.some((finding) => finding.severity === "warning") ||
    steps.some((step) => step.status === "missing" || step.status === "warning")
  ) {
    return "warning";
  }
  return "plan_ready";
}

function resolveScenario(
  scenario: CrossSurfaceWorkflowPlannerInput["scenario"]
): CrossSurfaceScenarioValidationResult {
  if (
    isRecord(scenario) &&
    scenario.source === "runtime_cross_surface_workflow_scenario"
  ) {
    return scenario as unknown as CrossSurfaceScenarioValidationResult;
  }
  if (
    isRecord(scenario) &&
    scenario.source === "cross_surface_workflow_scenario"
  ) {
    const normalized = scenario as unknown as CrossSurfaceWorkflowScenario;
    return {
      status: "parsed",
      scenario: normalized,
      summary: summarizeCrossSurfaceWorkflowScenario(normalized),
      findings: [],
      blockerCount: 0,
      warningCount: 0,
      findingCount: 0,
      normalizedHash: normalized.scenarioHash,
      readiness: {
        canEnterWorkflowPreview: true,
        canRunAgents: false,
        canCallDeepSeek: false,
        canInvokeMcpTools: false,
        canInvokePluginRuntime: false,
        canInvokeSkillRuntime: false,
        canExecuteDesktopAction: false,
        canApplyPatch: false,
        canRollback: false,
        canWriteEventStore: false,
        canExecuteGit: false,
        canExecuteShell: false,
        canIssuePermissionLease: false,
        canUseNativeBridge: false,
        appCanExecute: false
      },
      nextAction:
        "Scenario can enter the fixed cross-surface workflow preview.",
      source: "runtime_cross_surface_workflow_scenario"
    };
  }
  return validateCrossSurfaceWorkflowScenario(scenario);
}

function summaryForStep(
  input: CrossSurfaceWorkflowPlannerInput,
  kind: CrossSurfaceWorkflowPlanStepKind
): CrossSurfaceWorkflowSummaryRef | undefined {
  return (
    input.summaryRefs?.[kind] ??
    {
      objective: input.objectiveSummaryRef,
      proposal_generation: input.proposalGenerationSummaryRef,
      agent_route: input.agentRouteSummaryRef,
      knowledge_recall: input.knowledgeRecallSummaryRef,
      mcp_evidence: input.mcpEvidenceSummaryRef,
      plugin_skill_metadata: input.pluginSkillMetadataSummaryRef,
      desktop_observer: input.desktopObserverSummaryRef,
      desktop_proposal: input.desktopProposalSummaryRef,
      desktop_action_approval: input.desktopActionApprovalSummaryRef,
      workspace_apply_approval: input.workspaceApplyApprovalSummaryRef,
      verification: input.verificationSummaryRef,
      rollback_optional: input.rollbackSummaryRef,
      replay_audit: input.replayAuditSummaryRef
    }[kind]
  );
}

function findForbiddenFields(
  value: unknown,
  path = "$"
): CrossSurfaceWorkflowFinding[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenFields(item, `${path}[${index}]`)
    );
  }
  if (!isRecord(value)) {
    return [];
  }
  const findings: CrossSurfaceWorkflowFinding[] = [];
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalized)) {
      findings.push(
        finding(
          "raw_field",
          "blocker",
          forbiddenCodeForKey(key),
          `${path}.${key}`
        )
      );
    }
    if (executionClaimKeys.has(normalized) && child === true) {
      findings.push(
        finding(
          "execution_claim",
          "blocker",
          "EXECUTION_CLAIM_TRUE",
          `${path}.${key}`
        )
      );
    }
    findings.push(...findForbiddenFields(child, `${path}.${key}`));
  }
  return findings;
}

function findUnsafeStringMarkers(
  value: unknown,
  path = "$"
): CrossSurfaceWorkflowFinding[] {
  if (typeof value === "string") {
    return unsafeTextPatterns
      .filter(({ pattern }) => pattern.test(value))
      .map(({ code }) => finding("secret", "blocker", code, path));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findUnsafeStringMarkers(item, `${path}[${index}]`)
    );
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    findUnsafeStringMarkers(child, `${path}.${key}`)
  );
}

function forbiddenCodeForKey(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.includes("dynamicagentbidding")) {
    return "DYNAMIC_BIDDING_FIELD_REJECTED";
  }
  if (normalized.includes("prompt")) {
    return "RAW_PROMPT_FIELD_REJECTED";
  }
  if (normalized.includes("response")) {
    return "RAW_RESPONSE_FIELD_REJECTED";
  }
  if (normalized.includes("reasoning")) {
    return "REASONING_CONTENT_FIELD_REJECTED";
  }
  if (normalized.includes("source")) {
    return "RAW_SOURCE_FIELD_REJECTED";
  }
  if (normalized.includes("diff")) {
    return "RAW_DIFF_FIELD_REJECTED";
  }
  if (normalized.includes("key") || normalized.includes("authorization")) {
    return "API_KEY_FIELD_REJECTED";
  }
  return "EXECUTION_FIELD_REJECTED";
}

function finding(
  kind: CrossSurfaceWorkflowFindingKind,
  severity: CrossSurfaceWorkflowFindingSeverity,
  code: string,
  path?: string | undefined
): CrossSurfaceWorkflowFinding {
  return {
    findingId: `cross-surface-plan-${severity}-${kind}-${code.toLowerCase()}-${stablePreviewHash(
      `${kind}:${severity}:${code}:${path ?? "$"}`
    ).slice(0, 10)}`,
    kind,
    severity,
    code,
    safeMessage: safeMessageForCode(code),
    ...(path !== undefined ? { path } : {})
  };
}

function safeMessageForCode(code: string): string {
  const messages: Record<string, string> = {
    MISSING_SCENARIO: "A cross-surface scenario is required to build the plan.",
    SCENARIO_BLOCKED: "The scenario validation result is blocked.",
    MISSING_STAGE_REF: "A fixed workflow step is missing a scenario stage.",
    DYNAMIC_BIDDING_FIELD_REJECTED:
      "Dynamic agent bidding fields are not allowed.",
    RAW_PROMPT_FIELD_REJECTED: "Raw prompt fields are not allowed.",
    RAW_RESPONSE_FIELD_REJECTED: "Raw response fields are not allowed.",
    REASONING_CONTENT_FIELD_REJECTED:
      "Reasoning content fields are not allowed.",
    RAW_SOURCE_FIELD_REJECTED: "Raw source fields are not allowed.",
    RAW_DIFF_FIELD_REJECTED: "Raw diff fields are not allowed.",
    API_KEY_FIELD_REJECTED: "API key fields are not allowed.",
    EXECUTION_FIELD_REJECTED:
      "Execution fields are not allowed in the workflow planner.",
    EXECUTION_CLAIM_TRUE: "Execution readiness claims must remain false.",
    API_KEY_MARKER: "API key-like marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token-like marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected."
  };
  return messages[code] ?? "Cross-surface workflow plan requires review.";
}

function nextActionFor(
  status: CrossSurfaceWorkflowPlanStatus,
  state: CrossSurfaceWorkflowStateKind
): string {
  if (status === "empty") {
    return "Provide a validated cross-surface workflow scenario.";
  }
  if (status === "blocked" || state === "blocked") {
    return "Resolve scenario, raw-field, and execution blockers before planning.";
  }
  if (status === "warning") {
    return "Review missing or warning stages; no execution capability is enabled.";
  }
  return "Plan is ready for summary-only App preview.";
}

function uniqueFindings(
  findings: readonly CrossSurfaceWorkflowFinding[]
): CrossSurfaceWorkflowFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueStrings<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter((item): item is string => typeof item === "string")
        )
      ]
    : [];
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortForStableHash(value));
}

function sortForStableHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForStableHash);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortForStableHash(child)])
    );
  }
  return value;
}
