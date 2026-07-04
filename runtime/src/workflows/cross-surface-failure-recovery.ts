import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type CrossSurfaceFailureKind =
  | "proposal_generation_failed"
  | "schema_repair_failed"
  | "validation_blocked"
  | "approval_missing"
  | "apply_failed"
  | "verification_failed"
  | "rollback_required"
  | "rollback_failed"
  | "mcp_evidence_stale"
  | "plugin_skill_metadata_stale"
  | "desktop_observer_stale"
  | "desktop_action_blocked"
  | "agent_handoff_failed"
  | "replay_incomplete"
  | "policy_mismatch";

export type CrossSurfaceRecoveryAction =
  | "retry_proposal_generation"
  | "refresh_workspace_index"
  | "refresh_project_knowledge"
  | "refresh_mcp_metadata"
  | "refresh_plugin_skill_metadata"
  | "refresh_desktop_observation"
  | "request_human_approval"
  | "run_rollback"
  | "rerun_verification"
  | "inspect_replay_gap"
  | "stop_and_report";

export type CrossSurfaceRecoveryStatus =
  | "empty"
  | "recovery_ready"
  | "warning"
  | "blocked";

export type CrossSurfaceRecoverySeverity = "blocker" | "warning";

export type CrossSurfaceRecoveryFinding = {
  findingId: string;
  severity: CrossSurfaceRecoverySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type CrossSurfaceFailureInput = {
  failureId?: string | undefined;
  kind?: CrossSurfaceFailureKind | string | undefined;
  stageRef?: string | undefined;
  summary?: string | undefined;
  warningCodes?: string[] | undefined;
  blockerCodes?: string[] | undefined;
  [key: string]: unknown;
};

export type CrossSurfaceRecoveryActionSummary = {
  failureKind: CrossSurfaceFailureKind;
  action: CrossSurfaceRecoveryAction;
  advisoryOnly: true;
};

export type CrossSurfaceFailureSummary = {
  failureId: string;
  kind: CrossSurfaceFailureKind;
  stageRef?: string | undefined;
  summaryHash: string;
  recommendedAction: CrossSurfaceRecoveryAction;
  warningCodes: string[];
  blockerCodes: string[];
};

export type CrossSurfaceRecoveryReadiness = {
  canExecuteRecoveryAction: false;
  canAutoRetryModel: false;
  canAutoRollback: false;
  canAutoApply: false;
  canWriteEventStore: false;
  canExecuteDesktopAction: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canCallModel: false;
  appCanExecute: false;
};

export type CrossSurfaceFailureRecoveryInput = {
  failures?: CrossSurfaceFailureInput[] | undefined;
  sourceKind?: "runtime" | "app_preview" | "fixture" | "manual_test";
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  [key: string]: unknown;
};

export type CrossSurfaceFailureRecoveryPlan = {
  status: CrossSurfaceRecoveryStatus;
  recoveryPlanId: string;
  source: "runtime_cross_surface_failure_recovery";
  sourceKind: "runtime" | "app_preview" | "fixture" | "manual_test";
  failureCount: number;
  failureKindCounts: Record<CrossSurfaceFailureKind, number>;
  actionSummaries: CrossSurfaceRecoveryActionSummary[];
  failureSummaries: CrossSurfaceFailureSummary[];
  recommendedNextAction: CrossSurfaceRecoveryAction | "none";
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: CrossSurfaceRecoveryFinding[];
  recoveryHash: string;
  readiness: CrossSurfaceRecoveryReadiness;
  nextAction: string;
};

const failureKinds: CrossSurfaceFailureKind[] = [
  "proposal_generation_failed",
  "schema_repair_failed",
  "validation_blocked",
  "approval_missing",
  "apply_failed",
  "verification_failed",
  "rollback_required",
  "rollback_failed",
  "mcp_evidence_stale",
  "plugin_skill_metadata_stale",
  "desktop_observer_stale",
  "desktop_action_blocked",
  "agent_handoff_failed",
  "replay_incomplete",
  "policy_mismatch"
];

const failureKindSet = new Set<string>(failureKinds);

const readiness: CrossSurfaceRecoveryReadiness = {
  canExecuteRecoveryAction: false,
  canAutoRetryModel: false,
  canAutoRollback: false,
  canAutoApply: false,
  canWriteEventStore: false,
  canExecuteDesktopAction: false,
  canExecuteGit: false,
  canExecuteShell: false,
  canCallModel: false,
  appCanExecute: false
};

const forbiddenFieldKeys = new Set(
  [
    "raw" + "Source",
    "raw" + "Diff",
    "raw" + "Prompt",
    "raw" + "Response",
    "raw" + "Content",
    "reasoningContent",
    "reasoning_content",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "writeEventStore",
    "autoRetry",
    "autoRetryModel",
    "autoRollback",
    "autoApply",
    "applyNow",
    "rollbackNow",
    "desktopActionExecution",
    "executeDesktopAction",
    "hiddenBackgroundAction",
    "remoteControl",
    "permissionLease",
    "tools",
    "tool_choice"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "canExecuteRecoveryAction",
    "canAutoRetryModel",
    "canAutoRollback",
    "canAutoApply",
    "canWriteEventStore",
    "canExecuteDesktopAction",
    "canExecuteGit",
    "canExecuteShell",
    "canCallModel",
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
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function validateCrossSurfaceFailureRecoveryInput(
  input: CrossSurfaceFailureRecoveryInput = {}
): CrossSurfaceRecoveryFinding[] {
  return [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input),
    ...findExecutionClaims(input),
    ...validateFailures(input.failures ?? [])
  ];
}

export function buildCrossSurfaceFailureRecoveryPlan(
  input: CrossSurfaceFailureRecoveryInput = {}
): CrossSurfaceFailureRecoveryPlan {
  const recoveryPlanId =
    input.idGenerator?.() ??
    `cross-surface-recovery-${stablePreviewHash(stableStringify(input)).slice(0, 12)}`;
  const findings = validateCrossSurfaceFailureRecoveryInput(input);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const failures =
    blockerCount > 0 ? [] : normalizeFailures(input.failures ?? []);

  if ((input.failures ?? []).length === 0) {
    return buildPlan({
      recoveryPlanId,
      sourceKind: input.sourceKind ?? "runtime",
      status: blockerCount > 0 ? "blocked" : "empty",
      failureSummaries: failures,
      findings: [...findings, finding("warning", "MISSING_FAILURE_SUMMARIES")]
    });
  }

  const status =
    blockerCount > 0 ||
    failures.some((failure) => failure.kind === "policy_mismatch")
      ? "blocked"
      : failures.some(
            (failure) =>
              failure.warningCodes.length > 0 || failure.blockerCodes.length > 0
          )
        ? "warning"
        : "recovery_ready";

  return buildPlan({
    recoveryPlanId,
    sourceKind: input.sourceKind ?? "runtime",
    status,
    failureSummaries: failures,
    findings:
      failures.some((failure) => failure.kind === "policy_mismatch") &&
      blockerCount === 0
        ? [...findings, finding("blocker", "POLICY_MISMATCH_BLOCKS_AUTOMATION")]
        : findings
  });
}

export function summarizeCrossSurfaceFailureRecoveryPlan(
  plan: CrossSurfaceFailureRecoveryPlan
): Pick<
  CrossSurfaceFailureRecoveryPlan,
  | "status"
  | "recoveryPlanId"
  | "failureCount"
  | "failureKindCounts"
  | "recommendedNextAction"
  | "blockerCount"
  | "warningCount"
  | "recoveryHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: plan.status,
    recoveryPlanId: plan.recoveryPlanId,
    failureCount: plan.failureCount,
    failureKindCounts: plan.failureKindCounts,
    recommendedNextAction: plan.recommendedNextAction,
    blockerCount: plan.blockerCount,
    warningCount: plan.warningCount,
    recoveryHash: plan.recoveryHash,
    readiness: plan.readiness,
    nextAction: plan.nextAction,
    source: plan.source
  };
}

function buildPlan(input: {
  recoveryPlanId: string;
  sourceKind: CrossSurfaceFailureRecoveryPlan["sourceKind"];
  status: CrossSurfaceRecoveryStatus;
  failureSummaries: CrossSurfaceFailureSummary[];
  findings: CrossSurfaceRecoveryFinding[];
}): CrossSurfaceFailureRecoveryPlan {
  const actionSummaries = uniqueActions(
    input.failureSummaries.map((failure) => ({
      failureKind: failure.kind,
      action: failure.recommendedAction,
      advisoryOnly: true as const
    }))
  );
  const allFindings = dedupeFindings(input.findings);
  const blockerCount = allFindings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount =
    allFindings.filter((findingItem) => findingItem.severity === "warning")
      .length +
    input.failureSummaries.reduce(
      (count, failure) =>
        count + failure.warningCodes.length + failure.blockerCodes.length,
      0
    );
  const recommendedNextAction =
    actionSummaries.find((action) => action.action === "stop_and_report")
      ?.action ??
    actionSummaries[0]?.action ??
    "none";
  const recoveryHash = stablePreviewHash(
    stableStringify({
      recoveryPlanId: input.recoveryPlanId,
      sourceKind: input.sourceKind,
      status: input.status,
      failures: input.failureSummaries,
      actions: actionSummaries,
      findings: allFindings.map((findingItem) => findingItem.code)
    })
  );

  return {
    status: input.status,
    recoveryPlanId: input.recoveryPlanId,
    source: "runtime_cross_surface_failure_recovery",
    sourceKind: input.sourceKind,
    failureCount: input.failureSummaries.length,
    failureKindCounts: countFailureKinds(input.failureSummaries),
    actionSummaries,
    failureSummaries: input.failureSummaries,
    recommendedNextAction,
    blockerCount,
    warningCount,
    findingCount: allFindings.length,
    findings: allFindings,
    recoveryHash,
    readiness,
    nextAction: nextActionFor(input.status)
  };
}

function normalizeFailures(
  failures: CrossSurfaceFailureInput[]
): CrossSurfaceFailureSummary[] {
  return failures.map((failure, index) => {
    const kind = safeText(failure.kind) as CrossSurfaceFailureKind;
    const failureId = safeText(failure.failureId, `failure-${index + 1}`);
    const summary = safeText(failure.summary, `${kind} summary`);
    return {
      failureId,
      kind,
      ...(safeText(failure.stageRef).length > 0
        ? { stageRef: safeText(failure.stageRef) }
        : {}),
      summaryHash: stablePreviewHash(
        stableStringify({
          failureId,
          kind,
          stageRef: failure.stageRef,
          summary
        })
      ).slice(0, 16),
      recommendedAction: actionFor(kind),
      warningCodes: safeStringArray(failure.warningCodes),
      blockerCodes: safeStringArray(failure.blockerCodes)
    };
  });
}

function validateFailures(
  failures: CrossSurfaceFailureInput[]
): CrossSurfaceRecoveryFinding[] {
  const findings: CrossSurfaceRecoveryFinding[] = [];
  const seen = new Set<string>();
  failures.forEach((failure, index) => {
    const path = `failures.${index}`;
    const kind = safeText(failure.kind);
    const failureId = safeText(failure.failureId);
    if (!failureKindSet.has(kind)) {
      findings.push(finding("blocker", "UNKNOWN_FAILURE_KIND", path));
    }
    if (failureId.length === 0) {
      findings.push(finding("warning", "MISSING_FAILURE_ID", path));
    } else if (seen.has(failureId)) {
      findings.push(finding("blocker", "DUPLICATE_FAILURE_ID", path));
    } else {
      seen.add(failureId);
    }
    if (safeText(failure.summary).length === 0) {
      findings.push(finding("blocker", "MISSING_FAILURE_SUMMARY", path));
    }
  });
  return findings;
}

function actionFor(kind: CrossSurfaceFailureKind): CrossSurfaceRecoveryAction {
  const actions: Record<CrossSurfaceFailureKind, CrossSurfaceRecoveryAction> = {
    proposal_generation_failed: "retry_proposal_generation",
    schema_repair_failed: "stop_and_report",
    validation_blocked: "stop_and_report",
    approval_missing: "request_human_approval",
    apply_failed: "run_rollback",
    verification_failed: "rerun_verification",
    rollback_required: "run_rollback",
    rollback_failed: "stop_and_report",
    mcp_evidence_stale: "refresh_mcp_metadata",
    plugin_skill_metadata_stale: "refresh_plugin_skill_metadata",
    desktop_observer_stale: "refresh_desktop_observation",
    desktop_action_blocked: "refresh_desktop_observation",
    agent_handoff_failed: "stop_and_report",
    replay_incomplete: "inspect_replay_gap",
    policy_mismatch: "stop_and_report"
  };
  return actions[kind];
}

function countFailureKinds(
  failures: CrossSurfaceFailureSummary[]
): Record<CrossSurfaceFailureKind, number> {
  return Object.fromEntries(
    failureKinds.map((kind) => [
      kind,
      failures.filter((failure) => failure.kind === kind).length
    ])
  ) as Record<CrossSurfaceFailureKind, number>;
}

function findForbiddenFields(value: unknown): CrossSurfaceRecoveryFinding[] {
  const findings: CrossSurfaceRecoveryFinding[] = [];
  visit(value, (entry) => {
    if (forbiddenFieldKeys.has(entry.key.toLowerCase())) {
      findings.push(finding("blocker", "FORBIDDEN_FIELD", entry.path));
    }
  });
  return findings;
}

function findExecutionClaims(value: unknown): CrossSurfaceRecoveryFinding[] {
  const findings: CrossSurfaceRecoveryFinding[] = [];
  visit(value, (entry) => {
    if (
      executionClaimKeys.has(entry.key.toLowerCase()) &&
      entry.value === true
    ) {
      findings.push(finding("blocker", "EXECUTION_FLAG_TRUE", entry.path));
    }
  });
  return findings;
}

function findUnsafeStringMarkers(
  value: unknown
): CrossSurfaceRecoveryFinding[] {
  const findings: CrossSurfaceRecoveryFinding[] = [];
  visit(value, (entry) => {
    if (typeof entry.value !== "string") {
      return;
    }
    for (const pattern of unsafeTextPatterns) {
      if (pattern.pattern.test(entry.value)) {
        findings.push(finding("blocker", pattern.code, entry.path));
      }
    }
  });
  return findings;
}

function visit(
  value: unknown,
  callback: (entry: { key: string; value: unknown; path: string }) => void,
  path = "$"
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, callback, `${path}.${index}`));
    return;
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    callback({ key, value: child, path: childPath });
    visit(child, callback, childPath);
  }
}

function finding(
  severity: CrossSurfaceRecoverySeverity,
  code: string,
  path?: string
): CrossSurfaceRecoveryFinding {
  return {
    findingId: `cross-surface-recovery-${severity}-${code.toLowerCase()}-${stablePreviewHash(
      `${path ?? "root"}:${code}`
    ).slice(0, 12)}`,
    severity,
    code,
    safeMessage: safeMessageFor(code),
    ...(path !== undefined ? { path } : {})
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    MISSING_FAILURE_SUMMARIES:
      "No cross-surface failure summaries were provided.",
    UNKNOWN_FAILURE_KIND: "Failure kind is not part of the fixed taxonomy.",
    MISSING_FAILURE_ID:
      "Failure id is missing; a deterministic display id will be used.",
    DUPLICATE_FAILURE_ID: "Failure ids must be unique.",
    MISSING_FAILURE_SUMMARY:
      "Failure entries must include a summary-only description.",
    POLICY_MISMATCH_BLOCKS_AUTOMATION:
      "Policy mismatch blocks automation and requires stop-and-report.",
    FORBIDDEN_FIELD:
      "Raw content, execution, auto-run, command, EventStore, or secret fields are not allowed.",
    EXECUTION_FLAG_TRUE:
      "Failure recovery plans must not claim execution readiness.",
    API_KEY_MARKER: "Secret-like API key marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization header marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected."
  };
  return messages[code] ?? "Cross-surface failure recovery finding.";
}

function nextActionFor(status: CrossSurfaceRecoveryStatus): string {
  if (status === "empty") {
    return "Provide summary-only failure refs before building recovery guidance.";
  }
  if (status === "blocked") {
    return "Stop and report blockers. Do not execute recovery automatically.";
  }
  if (status === "warning") {
    return "Review advisory recovery actions and warning codes manually.";
  }
  return "Review advisory recovery actions. No action is executed automatically.";
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/[^A-Z0-9_.-]/gi, "_").slice(0, 80))
    .filter((item) => item.length > 0);
}

function uniqueActions(
  actions: CrossSurfaceRecoveryActionSummary[]
): CrossSurfaceRecoveryActionSummary[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.failureKind}:${action.action}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupeFindings(
  findings: CrossSurfaceRecoveryFinding[]
): CrossSurfaceRecoveryFinding[] {
  const seen = new Set<string>();
  return findings.filter((findingItem) => {
    const key = `${findingItem.severity}:${findingItem.code}:${findingItem.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .filter((key) => key !== "idGenerator")
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
