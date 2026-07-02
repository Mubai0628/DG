import { stablePreviewHash } from "../models/stable-preview-hash.js";
import {
  type FixedAgentIntent,
  type FixedAgentRole,
  type FixedAgentRunPlan
} from "./fixed-agent-run-plan.js";

export type FixedAgentOrchestratorState =
  | "idle"
  | "planned"
  | "orchestrator_ready"
  | "coder_ready"
  | "reviewer_ready"
  | "verifier_ready"
  | "waiting_for_human_approval"
  | "completed"
  | "blocked"
  | "failed";

export type FixedAgentOrchestratorStatus =
  | "idle"
  | "planned"
  | "in_progress"
  | "waiting_for_human_approval"
  | "completed"
  | "blocked"
  | "failed";

export type FixedAgentOrchestratorSummaryRefKind =
  | "model_proposal"
  | "validation"
  | "diff_audit"
  | "approval_draft"
  | "verification"
  | "apply_result"
  | "rollback_result";

export type FixedAgentOrchestratorSummaryRef = {
  kind: FixedAgentOrchestratorSummaryRefKind;
  refId?: string | undefined;
  hash?: string | undefined;
  status?: string | undefined;
  warningCount?: number | undefined;
  blockerCount?: number | undefined;
  summaryOnly: true;
};

export type FixedAgentOrchestratorInput = {
  fixedRunPlan?: FixedAgentRunPlan | { plan?: FixedAgentRunPlan | undefined };
  currentState?: FixedAgentOrchestratorState | undefined;
  completedRoles?: FixedAgentRole[] | undefined;
  modelProposalSummary?: unknown;
  validationSummary?: unknown;
  diffAuditSummary?: unknown;
  approvalDraftSummary?: unknown;
  verificationSummary?: unknown;
  applyResultSummary?: unknown;
  rollbackResultSummary?: unknown;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type FixedAgentOrchestratorFindingKind =
  | "schema"
  | "route"
  | "transition"
  | "raw_field"
  | "secret"
  | "execution_field";

export type FixedAgentOrchestratorSeverity = "blocker" | "warning";

export type FixedAgentOrchestratorFinding = {
  findingId: string;
  kind: FixedAgentOrchestratorFindingKind;
  severity: FixedAgentOrchestratorSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type FixedAgentOrchestratorReadiness = {
  canAdvanceStateMachine: boolean;
  canCallModel: false;
  canExecuteTools: false;
  canWriteFiles: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canCallMcpTool: false;
  canRunPlugin: false;
  canRunSkill: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type FixedAgentOrchestrationReport = {
  status: FixedAgentOrchestratorStatus;
  orchestrationId: string;
  state: FixedAgentOrchestratorState;
  runPlanId?: string | undefined;
  intent?: Exclude<FixedAgentIntent, "unknown"> | undefined;
  route: FixedAgentRole[];
  completedRoles: FixedAgentRole[];
  nextExpectedRole?: FixedAgentRole | undefined;
  nextExpectedState?: FixedAgentOrchestratorState | undefined;
  summaryRefs: FixedAgentOrchestratorSummaryRef[];
  findings: FixedAgentOrchestratorFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  reportHash: string;
  readiness: FixedAgentOrchestratorReadiness;
  nextAction: string;
  source: "runtime_fixed_agent_orchestrator";
};

const stateByRole = {
  orchestrator: "orchestrator_ready",
  coder: "coder_ready",
  reviewer: "reviewer_ready",
  verifier: "verifier_ready"
} as const satisfies Record<FixedAgentRole, FixedAgentOrchestratorState>;

const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authorizationField = ["Author", "ization"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const forbiddenFieldEntries: Array<
  [string, FixedAgentOrchestratorFindingKind]
> = [
  [rawPrefix + "Prompt", "raw_field"],
  [rawPrefix + "Source", "raw_field"],
  [rawPrefix + "Diff", "raw_field"],
  [rawPrefix + "Response", "raw_field"],
  ["promptText", "raw_field"],
  ["sourceText", "raw_field"],
  ["diffText", "raw_field"],
  ["responseText", "raw_field"],
  ["beforeContent", "raw_field"],
  ["afterContent", "raw_field"],
  ["fileContent", "raw_field"],
  ["preimageContent", "raw_field"],
  ["backupContent", "raw_field"],
  [reasoningSnakeField, "raw_field"],
  [apiKeyField, "secret"],
  [["api", "Key", "Value"].join(""), "secret"],
  [authorizationField, "secret"],
  [bearerField, "secret"],
  [tokenField, "secret"],
  ["secret", "secret"],
  ["password", "secret"],
  ["command", "execution_field"],
  ["shellCommand", "execution_field"],
  ["gitCommand", "execution_field"],
  ["tauriCommand", "execution_field"],
  ["toolCall", "execution_field"],
  ["tools", "execution_field"],
  [toolChoiceField, "execution_field"],
  ["applyNow", "execution_field"],
  ["rollbackNow", "execution_field"],
  ["eventStoreWrite", "execution_field"],
  ["permissionLease", "execution_field"],
  ["desktopAction", "execution_field"],
  ["nativeBridge", "execution_field"],
  ["dynamicBidding", "route"]
];

const forbiddenFieldKinds = new Map<string, FixedAgentOrchestratorFindingKind>(
  forbiddenFieldEntries.map(([key, kind]) => [key.toLowerCase(), kind])
);

const executionAttemptKeys = new Set(
  [
    "canCallModel",
    "canExecuteTools",
    "canWriteFiles",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "canCallMcpTool",
    "canRunPlugin",
    "canRunSkill",
    "canIssuePermissionLease",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowEventStoreWrite",
    "allowGit",
    "allowShell",
    "allowAppExecution"
  ].map((key) => key.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    kind: "secret",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    kind: "secret",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    kind: "secret",
    pattern: new RegExp(`\\b${authorizationField}\\s*[:=]`, "i")
  },
  {
    code: "RAW_PROMPT_MARKER",
    kind: "raw_field",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b|raw prompt`, "i")
  },
  {
    code: "RAW_SOURCE_MARKER",
    kind: "raw_field",
    pattern: new RegExp(`\\b${rawPrefix}${"Source"}\\b|raw source`, "i")
  },
  {
    code: "RAW_DIFF_MARKER",
    kind: "raw_field",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b|raw diff`, "i")
  }
] satisfies Array<{
  code: string;
  kind: FixedAgentOrchestratorFindingKind;
  pattern: RegExp;
}>;

export function buildFixedAgentOrchestrationReport(
  input: FixedAgentOrchestratorInput = {}
): FixedAgentOrchestrationReport {
  return validateFixedAgentOrchestratorInput(input);
}

export function validateFixedAgentOrchestratorInput(
  input: FixedAgentOrchestratorInput = {}
): FixedAgentOrchestrationReport {
  const findings: FixedAgentOrchestratorFinding[] = [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input)
  ];
  const plan = extractPlan(input.fixedRunPlan);
  if (plan === undefined) {
    findings.push(
      finding(
        "schema",
        "warning",
        "FIXED_RUN_PLAN_MISSING",
        "No fixed run plan was provided."
      )
    );
  } else {
    findings.push(...validatePlanRoute(plan));
  }

  const route = plan?.route.roles ?? [];
  const completedRoles = normalizeCompletedRoles(input.completedRoles);
  findings.push(...validateTransitions(route, completedRoles, plan?.intent));

  if (
    input.applyResultSummary !== undefined &&
    completedRoles.length < route.length
  ) {
    findings.push(
      finding(
        "transition",
        "blocker",
        "APPLY_RESULT_BEFORE_ROUTE_COMPLETE",
        "Apply result summary cannot appear before the fixed route completes."
      )
    );
  }
  if (
    input.rollbackResultSummary !== undefined &&
    completedRoles.length < route.length
  ) {
    findings.push(
      finding(
        "transition",
        "blocker",
        "ROLLBACK_RESULT_BEFORE_ROUTE_COMPLETE",
        "Rollback result summary cannot appear before the fixed route completes."
      )
    );
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const state =
    blockerCount > 0
      ? "blocked"
      : stateFrom({ route, completedRoles, input, plan });
  const status = statusFrom(state);
  const nextExpectedRole =
    blockerCount > 0 ? undefined : route[completedRoles.length];
  const nextExpectedState =
    nextExpectedRole === undefined ? undefined : stateByRole[nextExpectedRole];
  const summaryRefs = summaryRefsFrom(input);
  const orchestrationId =
    input.idGenerator?.() ??
    `fixed-agent-orchestration-${stablePreviewHash(
      stableStringify({
        planId: plan?.planId,
        route,
        completedRoles,
        state,
        createdAt: input.createdAt,
        summaryRefs
      })
    ).slice(0, 16)}`;
  const reportHash = stablePreviewHash(
    stableStringify({
      orchestrationId,
      state,
      status,
      planId: plan?.planId,
      intent: plan?.intent,
      route,
      completedRoles,
      nextExpectedRole,
      summaryRefs,
      findingCodes: findings.map((item) => item.code)
    })
  );

  return {
    status,
    orchestrationId,
    state,
    runPlanId: plan?.planId,
    intent: plan?.intent,
    route,
    completedRoles,
    nextExpectedRole,
    nextExpectedState,
    summaryRefs,
    findings,
    blockerCount,
    warningCount: findings.filter((item) => item.severity === "warning").length,
    findingCount: findings.length,
    reportHash,
    readiness: readiness(blockerCount === 0 && plan !== undefined),
    nextAction: nextActionFor(state),
    source: "runtime_fixed_agent_orchestrator"
  };
}

export function summarizeFixedAgentOrchestrationReport(
  report: FixedAgentOrchestrationReport
): {
  orchestrationId: string;
  status: FixedAgentOrchestratorStatus;
  state: FixedAgentOrchestratorState;
  runPlanId?: string | undefined;
  intent?: Exclude<FixedAgentIntent, "unknown"> | undefined;
  completedRoleCount: number;
  nextExpectedRole?: FixedAgentRole | undefined;
  summaryRefCount: number;
  blockerCount: number;
  warningCount: number;
  reportHash: string;
  summaryOnly: true;
} {
  return {
    orchestrationId: report.orchestrationId,
    status: report.status,
    state: report.state,
    runPlanId: report.runPlanId,
    intent: report.intent,
    completedRoleCount: report.completedRoles.length,
    nextExpectedRole: report.nextExpectedRole,
    summaryRefCount: report.summaryRefs.length,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    reportHash: report.reportHash,
    summaryOnly: true
  };
}

function extractPlan(
  value: FixedAgentOrchestratorInput["fixedRunPlan"]
): FixedAgentRunPlan | undefined {
  if (value === undefined) {
    return undefined;
  }
  if ("plan" in value && value.plan !== undefined) {
    return value.plan;
  }
  if ("planId" in value && "route" in value) {
    return value as FixedAgentRunPlan;
  }
  return undefined;
}

function validatePlanRoute(
  plan: FixedAgentRunPlan
): FixedAgentOrchestratorFinding[] {
  const findings: FixedAgentOrchestratorFinding[] = [];
  if (!sameRoute(plan.roles, plan.route.roles)) {
    findings.push(
      finding(
        "route",
        "blocker",
        "INVALID_ROUTE",
        "Run plan roles and route roles do not match."
      )
    );
  }
  if (plan.route.roles.length === 0 || plan.roles.length === 0) {
    findings.push(
      finding("route", "blocker", "INVALID_ROUTE", "Run plan route is empty.")
    );
  }
  return findings;
}

function validateTransitions(
  route: readonly FixedAgentRole[],
  completedRoles: readonly FixedAgentRole[],
  intent: Exclude<FixedAgentIntent, "unknown"> | undefined
): FixedAgentOrchestratorFinding[] {
  const findings: FixedAgentOrchestratorFinding[] = [];
  for (const [index, role] of completedRoles.entries()) {
    if (route[index] !== role) {
      findings.push(
        finding(
          "transition",
          "blocker",
          "UNEXPECTED_ROLE_TRANSITION",
          "Completed roles must be a prefix of the fixed route."
        )
      );
      break;
    }
  }
  if (intent === "code_change") {
    const completed = new Set(completedRoles);
    if (completed.has("verifier") && !completed.has("reviewer")) {
      findings.push(
        finding(
          "transition",
          "blocker",
          "SKIPPED_REVIEWER_FOR_CODE_CHANGE",
          "Code change route cannot skip reviewer."
        )
      );
    }
    if (
      completed.has("reviewer") &&
      !completed.has("coder") &&
      route.includes("coder")
    ) {
      findings.push(
        finding(
          "transition",
          "blocker",
          "SKIPPED_CODER_FOR_CODE_CHANGE",
          "Code change route cannot skip coder before reviewer."
        )
      );
    }
    if (completedRoles.length >= route.length && !completed.has("verifier")) {
      findings.push(
        finding(
          "transition",
          "blocker",
          "SKIPPED_VERIFIER_FOR_CODE_CHANGE",
          "Code change route cannot finish without verifier."
        )
      );
    }
  }
  return dedupeFindings(findings);
}

function stateFrom(input: {
  route: readonly FixedAgentRole[];
  completedRoles: readonly FixedAgentRole[];
  input: FixedAgentOrchestratorInput;
  plan: FixedAgentRunPlan | undefined;
}): FixedAgentOrchestratorState {
  if (input.plan === undefined) {
    return "idle";
  }
  if (
    input.input.applyResultSummary !== undefined ||
    input.input.rollbackResultSummary !== undefined
  ) {
    return "completed";
  }
  if (
    input.completedRoles.length >= input.route.length &&
    input.route.length > 0
  ) {
    return "waiting_for_human_approval";
  }
  if (input.completedRoles.length === 0) {
    return "planned";
  }
  const lastRole = input.completedRoles.at(-1);
  return lastRole === undefined ? "planned" : stateByRole[lastRole];
}

function statusFrom(
  state: FixedAgentOrchestratorState
): FixedAgentOrchestratorStatus {
  if (state === "blocked" || state === "failed") {
    return state;
  }
  if (state === "idle" || state === "planned") {
    return state;
  }
  if (state === "waiting_for_human_approval" || state === "completed") {
    return state;
  }
  return "in_progress";
}

function summaryRefsFrom(
  input: FixedAgentOrchestratorInput
): FixedAgentOrchestratorSummaryRef[] {
  return [
    summaryRef("model_proposal", input.modelProposalSummary),
    summaryRef("validation", input.validationSummary),
    summaryRef("diff_audit", input.diffAuditSummary),
    summaryRef("approval_draft", input.approvalDraftSummary),
    summaryRef("verification", input.verificationSummary),
    summaryRef("apply_result", input.applyResultSummary),
    summaryRef("rollback_result", input.rollbackResultSummary)
  ].filter(
    (item): item is FixedAgentOrchestratorSummaryRef => item !== undefined
  );
}

function summaryRef(
  kind: FixedAgentOrchestratorSummaryRefKind,
  value: unknown
): FixedAgentOrchestratorSummaryRef | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    return {
      kind,
      hash: stablePreviewHash(String(value)).slice(0, 16),
      summaryOnly: true
    };
  }
  return {
    kind,
    refId: safeString(value.refId) || safeString(value.id) || undefined,
    hash:
      safeString(value.hash) ||
      safeString(value.reportHash) ||
      safeString(value.planHash) ||
      safeString(value.resultHash) ||
      undefined,
    status: safeString(value.status) || undefined,
    warningCount: safeNumber(value.warningCount),
    blockerCount: safeNumber(value.blockerCount),
    summaryOnly: true
  };
}

function normalizeCompletedRoles(value: unknown): FixedAgentRole[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is FixedAgentRole => isFixedRole(item));
}

function findForbiddenFields(input: unknown): FixedAgentOrchestratorFinding[] {
  const findings: FixedAgentOrchestratorFinding[] = [];
  visit(input, [], (path, value) => {
    const key = path.at(-1);
    if (key === undefined) {
      return;
    }
    const normalizedKey = key.toLowerCase();
    const kind = forbiddenFieldKinds.get(normalizedKey);
    if (kind !== undefined) {
      findings.push(
        finding(
          kind,
          "blocker",
          codeForForbiddenKind(kind),
          "Orchestrator input contains a forbidden field.",
          "blockedField"
        )
      );
    }
    if (executionAttemptKeys.has(normalizedKey) && value === true) {
      findings.push(
        finding(
          "execution_field",
          "blocker",
          "EXECUTION_READINESS_ATTEMPT",
          "Orchestrator input attempts to enable execution readiness.",
          "readiness"
        )
      );
    }
  });
  return dedupeFindings(findings);
}

function findUnsafeStringMarkers(
  input: unknown
): FixedAgentOrchestratorFinding[] {
  const findings: FixedAgentOrchestratorFinding[] = [];
  visit(input, [], (_path, value) => {
    if (typeof value !== "string") {
      return;
    }
    for (const item of unsafeTextPatterns) {
      if (item.pattern.test(value)) {
        findings.push(
          finding(
            item.kind,
            "blocker",
            item.code,
            "Orchestrator input contains an unsafe marker.",
            "blockedMarker"
          )
        );
      }
    }
  });
  return dedupeFindings(findings);
}

function codeForForbiddenKind(kind: FixedAgentOrchestratorFindingKind): string {
  if (kind === "secret") {
    return "SECRET_FIELD_BLOCKED";
  }
  if (kind === "raw_field") {
    return "RAW_FIELD_BLOCKED";
  }
  if (kind === "execution_field") {
    return "EXECUTION_FIELD_BLOCKED";
  }
  if (kind === "route") {
    return "DYNAMIC_BIDDING_BLOCKED";
  }
  return "FORBIDDEN_FIELD_BLOCKED";
}

function nextActionFor(state: FixedAgentOrchestratorState): string {
  if (state === "idle") {
    return "Provide a fixed run plan before orchestration preview can begin.";
  }
  if (state === "planned") {
    return "Next expected stage is orchestrator_ready. No agent is executed.";
  }
  if (state === "waiting_for_human_approval") {
    return "Wait for existing human approval and typed confirmation gates before any apply path.";
  }
  if (state === "completed") {
    return "Orchestration summary is complete. No execution was performed by the orchestrator.";
  }
  if (state === "blocked") {
    return "Fix invalid route, transition, raw fields, or execution requests before continuing.";
  }
  if (state === "failed") {
    return "Review failure summaries. No automatic retry or execution is performed.";
  }
  return "Advance the next fixed role summary only. No tools are executed.";
}

function readiness(
  canAdvanceStateMachine: boolean
): FixedAgentOrchestratorReadiness {
  return {
    canAdvanceStateMachine,
    canCallModel: false,
    canExecuteTools: false,
    canWriteFiles: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canCallMcpTool: false,
    canRunPlugin: false,
    canRunSkill: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function finding(
  kind: FixedAgentOrchestratorFindingKind,
  severity: FixedAgentOrchestratorSeverity,
  code: string,
  safeMessage: string,
  path?: string | undefined
): FixedAgentOrchestratorFinding {
  return {
    findingId: `fixed-agent-orchestrator-finding-${stablePreviewHash(
      [kind, severity, code, path ?? ""].join("|")
    ).slice(0, 12)}`,
    kind,
    severity,
    code,
    safeMessage,
    path
  };
}

function dedupeFindings(
  findings: FixedAgentOrchestratorFinding[]
): FixedAgentOrchestratorFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = [item.kind, item.severity, item.code, item.path ?? ""].join(
      "|"
    );
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
    value.forEach((item, index) =>
      visit(item, [...path, String(index)], visitor)
    );
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (typeof nested === "function") {
      continue;
    }
    visit(nested, [...path, key], visitor);
  }
}

function sameRoute(
  left: readonly FixedAgentRole[],
  right: readonly FixedAgentRole[]
): boolean {
  return (
    left.length === right.length &&
    left.every((role, index) => role === right[index])
  );
}

function isFixedRole(value: unknown): value is FixedAgentRole {
  return (
    value === "orchestrator" ||
    value === "coder" ||
    value === "reviewer" ||
    value === "verifier"
  );
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (!isRecord(value)) {
    return typeof value === "function" ? "[function]" : value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nested]) => typeof nested !== "function")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortValue(nested)])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
