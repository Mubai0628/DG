import { hashPatchObject } from "../patch/hash.js";
import {
  isPermissionMode,
  type PermissionMode,
  type PermissionModeSeverity
} from "./mode-policy.js";

export type ExecutionRiskBudgetInput = {
  mode?: PermissionMode | string | undefined;
  maxSteps?: number | undefined;
  maxDurationMs?: number | undefined;
  maxCommands?: number | undefined;
  maxFileMutations?: number | undefined;
  maxBytesChanged?: number | undefined;
  maxDeletes?: number | undefined;
  maxRecursiveDeletes?: number | undefined;
  maxGitWrites?: number | undefined;
  maxPushes?: number | undefined;
  maxDesktopActions?: number | undefined;
  maxFailures?: number | undefined;
  maxRetries?: number | undefined;
  maxCostUsd?: number | undefined;
  expiresAt?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ExecutionRiskBudgetStatus = "valid" | "warning" | "blocked";

export type ExecutionRiskBudgetFindingKind =
  | "mode"
  | "budget"
  | "expiry"
  | "forbidden_field"
  | "secret_marker"
  | "readiness";

export type ExecutionRiskBudgetFinding = {
  findingId: string;
  kind: ExecutionRiskBudgetFindingKind;
  severity: PermissionModeSeverity;
  code: string;
  safeMessage: string;
};

export type ExecutionRiskBudgetReadiness = {
  canTrackBudgetMetadata: boolean;
  canUseAsExecutionGrant: false;
  canRunArbitraryShell: false;
  canRecursiveDelete: false;
  canGitPush: false;
  canAutonomousLoop: false;
  canPersistRawOutput: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ExecutionRiskBudget = {
  status: ExecutionRiskBudgetStatus;
  budgetId: string;
  mode: PermissionMode;
  maxSteps: number;
  maxDurationMs: number;
  maxCommands: number;
  maxFileMutations: number;
  maxBytesChanged: number;
  maxDeletes: number;
  maxRecursiveDeletes: number;
  maxGitWrites: number;
  maxPushes: number;
  maxDesktopActions: number;
  maxFailures: number;
  maxRetries: number;
  maxCostUsd?: number | undefined;
  expiresAt?: string | undefined;
  createdAt: string;
  findings: ExecutionRiskBudgetFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  budgetHash: string;
  readiness: ExecutionRiskBudgetReadiness;
  nextAction: string;
  source: "runtime_execution_risk_budget";
  summaryOnly: true;
};

export type ExecutionBudgetDecision = {
  status: ExecutionRiskBudgetStatus;
  budgetId: string;
  mode: PermissionMode;
  blockerCount: number;
  warningCount: number;
  budgetHash: string;
  readiness: ExecutionRiskBudgetReadiness;
  nextAction: string;
  source: "runtime_execution_budget_decision";
  summaryOnly: true;
};

const DEFAULT_CREATED_AT = "2026-07-06T00:00:00.000Z";
const numericBudgetFields = [
  "maxSteps",
  "maxDurationMs",
  "maxCommands",
  "maxFileMutations",
  "maxBytesChanged",
  "maxDeletes",
  "maxRecursiveDeletes",
  "maxGitWrites",
  "maxPushes",
  "maxDesktopActions",
  "maxFailures",
  "maxRetries",
  "maxCostUsd"
] as const satisfies readonly (keyof ExecutionRiskBudgetInput)[];

const forbiddenFieldNames = new Set([
  "apikey",
  "apikeyvalue",
  "authorization",
  "bearer",
  "token",
  "secret",
  "password",
  "rawkey",
  "rawoutput",
  "rawprompt",
  "rawresponse",
  "rawsource",
  "rawdiff",
  "rawpatch",
  "reasoningcontent",
  "reasoning_content",
  "stdout",
  "stderr",
  "command",
  "shellcommand",
  "gitcommand",
  "tauricommand",
  "eventstorewrite",
  "applynow",
  "rollbacknow",
  "nativebridge",
  "desktopaction"
]);

export function buildExecutionRiskBudget(
  input: ExecutionRiskBudgetInput = {}
): ExecutionRiskBudget {
  const findings = validateBudget(input);
  const blockerCount = count(findings, "blocker");
  const warningCount = count(findings, "warning");
  const status: ExecutionRiskBudgetStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "valid";
  const mode = isPermissionMode(input.mode) ? input.mode : "approval_mode";
  const createdAt = safeIso(input.createdAt, DEFAULT_CREATED_AT);
  const budget = normalizedBudget(input);
  const budgetHash = hashPatchObject({
    mode,
    ...budget,
    expiresAt: safeOptionalIso(input.expiresAt),
    createdAt
  });

  return {
    status,
    budgetId:
      input.idGenerator?.() ??
      `execution-risk-budget-${budgetHash.slice(0, 12)}`,
    mode,
    ...budget,
    expiresAt: safeOptionalIso(input.expiresAt),
    createdAt,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    budgetHash,
    readiness: readinessForBudget(blockerCount === 0),
    nextAction: nextActionFor(status),
    source: "runtime_execution_risk_budget",
    summaryOnly: true
  };
}

export function evaluateExecutionRiskBudget(
  input: ExecutionRiskBudgetInput = {}
): ExecutionBudgetDecision {
  const budget = buildExecutionRiskBudget(input);
  return {
    status: budget.status,
    budgetId: budget.budgetId,
    mode: budget.mode,
    blockerCount: budget.blockerCount,
    warningCount: budget.warningCount,
    budgetHash: budget.budgetHash,
    readiness: budget.readiness,
    nextAction: budget.nextAction,
    source: "runtime_execution_budget_decision",
    summaryOnly: true
  };
}

function validateBudget(
  input: ExecutionRiskBudgetInput
): ExecutionRiskBudgetFinding[] {
  const findings: ExecutionRiskBudgetFinding[] = [];
  const add = (
    kind: ExecutionRiskBudgetFindingKind,
    severity: PermissionModeSeverity,
    code: string,
    safeMessage: string
  ) => {
    findings.push({
      findingId: `${code.toLowerCase()}-${findings.length + 1}`,
      kind,
      severity,
      code,
      safeMessage
    });
  };

  scanForbidden(input, add);

  if (input.mode !== undefined && !isPermissionMode(input.mode)) {
    add(
      "mode",
      "blocker",
      "RISK_BUDGET_MODE_UNKNOWN",
      "Mode is not recognized."
    );
  }
  for (const field of numericBudgetFields) {
    const value = input[field];
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      add(
        "budget",
        "blocker",
        "RISK_BUDGET_NEGATIVE_VALUE",
        "Risk budget values must be non-negative numbers."
      );
    }
  }
  if ((input.maxRecursiveDeletes ?? 0) > 0) {
    add(
      "budget",
      "blocker",
      "RISK_BUDGET_RECURSIVE_DELETE_DISABLED_V034",
      "Recursive delete budget remains disabled in v0.34."
    );
  }
  if ((input.maxPushes ?? 0) > 0) {
    add(
      "budget",
      "blocker",
      "RISK_BUDGET_GIT_PUSH_DISABLED_V034",
      "Git push budget remains disabled in v0.34."
    );
  }
  if (input.mode === "full_access_mode" && !hasText(input.expiresAt)) {
    add(
      "expiry",
      "blocker",
      "RISK_BUDGET_FULL_ACCESS_EXPIRY_REQUIRED",
      "Full Access budget metadata requires an explicit expiry."
    );
  }
  if (input.mode === "full_access_mode") {
    add(
      "mode",
      "warning",
      "RISK_BUDGET_FULL_ACCESS_PLANNED_ONLY",
      "Full Access budget is planned metadata only in v0.34."
    );
  }
  if (input.maxCostUsd === undefined) {
    add(
      "budget",
      "warning",
      "RISK_BUDGET_COST_MISSING",
      "Cost budget is not specified."
    );
  }
  if (input.maxDurationMs === undefined || input.maxDurationMs === 0) {
    add(
      "budget",
      "warning",
      "RISK_BUDGET_DURATION_MISSING",
      "Duration budget is not specified."
    );
  }
  if (
    (input.maxCommands ?? 0) > 20 ||
    (input.maxFileMutations ?? 0) > 20 ||
    (input.maxBytesChanged ?? 0) > 1_000_000 ||
    (input.maxDesktopActions ?? 0) > 10 ||
    (input.maxRetries ?? 0) > 5
  ) {
    add(
      "budget",
      "warning",
      "RISK_BUDGET_LARGE",
      "Risk budget is large and should be reviewed before future execution work."
    );
  }
  return findings;
}

function normalizedBudget(input: ExecutionRiskBudgetInput) {
  return {
    maxSteps: normalizeNumber(input.maxSteps),
    maxDurationMs: normalizeNumber(input.maxDurationMs),
    maxCommands: normalizeNumber(input.maxCommands),
    maxFileMutations: normalizeNumber(input.maxFileMutations),
    maxBytesChanged: normalizeNumber(input.maxBytesChanged),
    maxDeletes: normalizeNumber(input.maxDeletes),
    maxRecursiveDeletes: normalizeNumber(input.maxRecursiveDeletes),
    maxGitWrites: normalizeNumber(input.maxGitWrites),
    maxPushes: normalizeNumber(input.maxPushes),
    maxDesktopActions: normalizeNumber(input.maxDesktopActions),
    maxFailures: normalizeNumber(input.maxFailures),
    maxRetries: normalizeNumber(input.maxRetries),
    maxCostUsd:
      input.maxCostUsd !== undefined
        ? normalizeNumber(input.maxCostUsd)
        : undefined
  };
}

function readinessForBudget(noBlockers: boolean): ExecutionRiskBudgetReadiness {
  return {
    canTrackBudgetMetadata: noBlockers,
    canUseAsExecutionGrant: false,
    canRunArbitraryShell: false,
    canRecursiveDelete: false,
    canGitPush: false,
    canAutonomousLoop: false,
    canPersistRawOutput: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionFor(status: ExecutionRiskBudgetStatus): string {
  if (status === "blocked") {
    return "Fix risk budget blockers before using this metadata.";
  }
  if (status === "warning") {
    return "Review risk budget warnings; no execution is enabled.";
  }
  return "Risk budget metadata is valid; no execution is enabled.";
}

function scanForbidden(
  value: unknown,
  add: (
    kind: ExecutionRiskBudgetFindingKind,
    severity: PermissionModeSeverity,
    code: string,
    safeMessage: string
  ) => void,
  seen = new Set<unknown>()
): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    if (containsSecretLikeMarker(value)) {
      add(
        "secret_marker",
        "blocker",
        "RISK_BUDGET_SECRET_MARKER_REJECTED",
        "Input contains a secret-like marker."
      );
    }
    return;
  }
  if (typeof value !== "object" || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>
  )) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (forbiddenFieldNames.has(normalizedKey)) {
      add(
        "forbidden_field",
        "blocker",
        "RISK_BUDGET_FORBIDDEN_FIELD_REJECTED",
        "Input contains a forbidden raw, secret, execution, or command field."
      );
    }
    if (
      [
        "canRunArbitraryShell",
        "canRecursiveDelete",
        "canGitPush",
        "canAutonomousLoop",
        "canPersistRawOutput",
        "canWriteEventStore",
        "canExecuteGit",
        "canExecuteShell",
        "appCanExecute"
      ].includes(key) &&
      nested === true
    ) {
      add(
        "readiness",
        "blocker",
        "RISK_BUDGET_READINESS_TRUE_REJECTED",
        "Risk budget input cannot enable execution readiness in v0.34."
      );
    }
    scanForbidden(nested, add, seen);
  }
}

function normalizeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function safeIso(value: unknown, fallback: string): string {
  return typeof value === "string" &&
    hasText(value) &&
    Number.isFinite(Date.parse(value))
    ? value
    : fallback;
}

function safeOptionalIso(value: unknown): string | undefined {
  return typeof value === "string" &&
    hasText(value) &&
    Number.isFinite(Date.parse(value))
    ? value
    : undefined;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function containsSecretLikeMarker(value: string): boolean {
  return (
    /\bsk-[A-Za-z0-9_-]{6,}/.test(value) ||
    /\bBearer\s+[A-Za-z0-9._-]+/i.test(value) ||
    /\bAuthorization\b/i.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
  );
}

function count(
  findings: ExecutionRiskBudgetFinding[],
  severity: PermissionModeSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}
