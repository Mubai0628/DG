import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ApprovalConsistencyStatus =
  | "empty"
  | "consistent"
  | "warning"
  | "blocked";

export type ApprovalConsistencySeverity = "blocker" | "warning";

export type ApprovalConsistencyFinding = {
  findingId: string;
  severity: ApprovalConsistencySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ApprovalConsistencyScopeKind =
  | "user_workspace_apply_receipt"
  | "rollback_receipt"
  | "mcp_readonly_tool_approval"
  | "desktop_action_approval"
  | "model_proposal_session_receipt"
  | "live_proposal_opt_in_policy"
  | "capability_plan_preview"
  | "broker_preview"
  | "workflow_stage";

export type ApprovalConsistencyStageKind =
  | "workspace_apply"
  | "workspace_rollback"
  | "mcp_readonly_tool"
  | "desktop_action"
  | "model_proposal"
  | "live_proposal"
  | "capability_plan"
  | "broker_preview"
  | "workflow_stage"
  | "plugin_skill_runtime";

export type ApprovalConsistencyScope = {
  scopeId?: string | undefined;
  kind?: ApprovalConsistencyScopeKind | string | undefined;
  stageKind?: ApprovalConsistencyStageKind | string | undefined;
  taskId?: string | undefined;
  workflowScenarioId?: string | undefined;
  workspaceRootRef?: string | undefined;
  proposalId?: string | undefined;
  allowedPathRefs?: string[] | undefined;
  targetRef?: string | undefined;
  expiresAt?: string | undefined;
  typedConfirmationPresent?: boolean | undefined;
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  broadLease?: boolean | undefined;
  status?: string | undefined;
  summary?: string | undefined;
  readiness?: Record<string, unknown> | undefined;
  [key: string]: unknown;
};

export type ApprovalConsistencyScopeSummary = {
  scopeId: string;
  kind: ApprovalConsistencyScopeKind;
  stageKind: ApprovalConsistencyStageKind;
  status: string;
  summaryHash: string;
  typedConfirmationPresent: boolean;
  expiresAt?: string | undefined;
  warningCodes: string[];
  blockerCodes: string[];
};

export type ApprovalConsistencyReadiness = {
  canUseForAdvisoryReview: boolean;
  canApprove: false;
  canReject: false;
  canApplyPatch: false;
  canRollback: false;
  canIssuePermissionLease: false;
  canWriteEventStore: false;
  canExecuteDesktopAction: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ApprovalConsistencyInput = {
  scopes?: ApprovalConsistencyScope[] | undefined;
  expectedTaskId?: string | undefined;
  expectedWorkflowScenarioId?: string | undefined;
  expectedWorkspaceRootRef?: string | undefined;
  expectedProposalId?: string | undefined;
  createdAt?: string | undefined;
  sourceKind?: "runtime" | "app_preview" | "fixture" | "manual_test";
  idGenerator?: (() => string) | undefined;
  [key: string]: unknown;
};

export type ApprovalConsistencyReport = {
  status: ApprovalConsistencyStatus;
  consistencyId: string;
  source: "runtime_approval_consistency_check";
  sourceKind: "runtime" | "app_preview" | "fixture" | "manual_test";
  scopeCount: number;
  consistentScopeCount: number;
  inconsistentScopeCount: number;
  warningScopeCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  scopeSummaries: ApprovalConsistencyScopeSummary[];
  findings: ApprovalConsistencyFinding[];
  consistencyHash: string;
  readiness: ApprovalConsistencyReadiness;
  nextAction: string;
};

const scopeKinds: ApprovalConsistencyScopeKind[] = [
  "user_workspace_apply_receipt",
  "rollback_receipt",
  "mcp_readonly_tool_approval",
  "desktop_action_approval",
  "model_proposal_session_receipt",
  "live_proposal_opt_in_policy",
  "capability_plan_preview",
  "broker_preview",
  "workflow_stage"
];

const stageKinds: ApprovalConsistencyStageKind[] = [
  "workspace_apply",
  "workspace_rollback",
  "mcp_readonly_tool",
  "desktop_action",
  "model_proposal",
  "live_proposal",
  "capability_plan",
  "broker_preview",
  "workflow_stage",
  "plugin_skill_runtime"
];

const scopeKindSet = new Set<string>(scopeKinds);
const stageKindSet = new Set<string>(stageKinds);

const emptyReadiness: ApprovalConsistencyReadiness = {
  canUseForAdvisoryReview: false,
  canApprove: false,
  canReject: false,
  canApplyPatch: false,
  canRollback: false,
  canIssuePermissionLease: false,
  canWriteEventStore: false,
  canExecuteDesktopAction: false,
  canExecuteGit: false,
  canExecuteShell: false,
  appCanExecute: false
};

const forbiddenFieldKeys = new Set(
  [
    "raw" + "Prompt",
    "raw" + "Response",
    "raw" + "Source",
    "raw" + "Diff",
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
    "applyNow",
    "rollbackNow",
    "approveNow",
    "rejectNow",
    "issuePermissionLease",
    "desktopActionExecution",
    "nativeBridge",
    "tools",
    "tool_choice"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "canApprove",
    "canReject",
    "canApplyPatch",
    "canRollback",
    "canIssuePermissionLease",
    "canWriteEventStore",
    "canExecuteDesktopAction",
    "canExecuteGit",
    "canExecuteShell",
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

export function buildApprovalConsistencyReport(
  input: ApprovalConsistencyInput = {}
): ApprovalConsistencyReport {
  const consistencyId =
    input.idGenerator?.() ??
    `approval-consistency-${stablePreviewHash(stableStringify(input)).slice(0, 12)}`;
  const findings = validateApprovalConsistencyInput(input);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const scopeSummaries =
    blockerCount > 0 ? [] : normalizeScopes(input.scopes ?? []);

  if ((input.scopes ?? []).length === 0) {
    return buildReport({
      consistencyId,
      sourceKind: input.sourceKind ?? "runtime",
      status: blockerCount > 0 ? "blocked" : "empty",
      scopeSummaries,
      findings: [...findings, finding("warning", "MISSING_SCOPES")]
    });
  }

  const scopeWarningCount = scopeSummaries.reduce(
    (count, scope) => count + scope.warningCodes.length,
    0
  );

  return buildReport({
    consistencyId,
    sourceKind: input.sourceKind ?? "runtime",
    status:
      blockerCount > 0
        ? "blocked"
        : scopeWarningCount > 0
          ? "warning"
          : "consistent",
    scopeSummaries,
    findings
  });
}

export function summarizeApprovalConsistencyReport(
  report: ApprovalConsistencyReport
): Pick<
  ApprovalConsistencyReport,
  | "status"
  | "consistencyId"
  | "scopeCount"
  | "consistentScopeCount"
  | "inconsistentScopeCount"
  | "warningScopeCount"
  | "blockerCount"
  | "warningCount"
  | "consistencyHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: report.status,
    consistencyId: report.consistencyId,
    scopeCount: report.scopeCount,
    consistentScopeCount: report.consistentScopeCount,
    inconsistentScopeCount: report.inconsistentScopeCount,
    warningScopeCount: report.warningScopeCount,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    consistencyHash: report.consistencyHash,
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: report.source
  };
}

export function validateApprovalConsistencyInput(
  input: ApprovalConsistencyInput = {}
): ApprovalConsistencyFinding[] {
  return [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input),
    ...findExecutionClaims(input),
    ...validateScopes(input)
  ];
}

function buildReport(input: {
  consistencyId: string;
  sourceKind: ApprovalConsistencyReport["sourceKind"];
  status: ApprovalConsistencyStatus;
  scopeSummaries: ApprovalConsistencyScopeSummary[];
  findings: ApprovalConsistencyFinding[];
}): ApprovalConsistencyReport {
  const allFindings = dedupeFindings(input.findings);
  const blockerCount = allFindings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount =
    allFindings.filter((findingItem) => findingItem.severity === "warning")
      .length +
    input.scopeSummaries.reduce(
      (count, scope) =>
        count + scope.warningCodes.length + scope.blockerCodes.length,
      0
    );
  const inconsistentScopeCount =
    input.status === "blocked"
      ? Math.max(
          1,
          input.scopeSummaries.filter((scope) => scope.blockerCodes.length > 0)
            .length
        )
      : 0;
  const warningScopeCount = input.scopeSummaries.filter(
    (scope) => scope.warningCodes.length > 0
  ).length;
  const consistencyHash = stablePreviewHash(
    stableStringify({
      consistencyId: input.consistencyId,
      sourceKind: input.sourceKind,
      status: input.status,
      scopes: input.scopeSummaries,
      findingCodes: allFindings.map((findingItem) => findingItem.code)
    })
  );

  return {
    status: input.status,
    consistencyId: input.consistencyId,
    source: "runtime_approval_consistency_check",
    sourceKind: input.sourceKind,
    scopeCount: input.scopeSummaries.length,
    consistentScopeCount:
      input.status === "blocked"
        ? 0
        : input.scopeSummaries.length - warningScopeCount,
    inconsistentScopeCount,
    warningScopeCount,
    blockerCount,
    warningCount,
    findingCount: allFindings.length,
    scopeSummaries: input.scopeSummaries,
    findings: allFindings,
    consistencyHash,
    readiness: {
      ...emptyReadiness,
      canUseForAdvisoryReview:
        input.status === "consistent" || input.status === "warning"
    },
    nextAction: nextActionFor(input.status)
  };
}

function normalizeScopes(
  scopes: ApprovalConsistencyScope[]
): ApprovalConsistencyScopeSummary[] {
  return scopes.map((scope, index) => {
    const kind = safeText(scope.kind) as ApprovalConsistencyScopeKind;
    const stageKind = safeText(scope.stageKind) as ApprovalConsistencyStageKind;
    const scopeId = safeText(scope.scopeId, `approval-scope-${index + 1}`);
    const summary = safeText(scope.summary, `${kind} summary`);
    return {
      scopeId,
      kind,
      stageKind,
      status: safeText(scope.status, "summary_ready"),
      summaryHash: stablePreviewHash(
        stableStringify({
          scopeId,
          kind,
          stageKind,
          taskId: scope.taskId,
          workflowScenarioId: scope.workflowScenarioId,
          workspaceRootRef: scope.workspaceRootRef,
          proposalId: scope.proposalId,
          allowedPathRefs: scope.allowedPathRefs,
          targetRef: scope.targetRef,
          expiresAt: scope.expiresAt,
          typedConfirmationPresent: scope.typedConfirmationPresent,
          maxFiles: scope.maxFiles,
          maxBytes: scope.maxBytes,
          summary
        })
      ).slice(0, 16),
      typedConfirmationPresent: scope.typedConfirmationPresent === true,
      ...(safeText(scope.expiresAt).length > 0
        ? { expiresAt: safeText(scope.expiresAt) }
        : {}),
      warningCodes: scopeWarnings(scope),
      blockerCodes: scopeBlockers(scope)
    };
  });
}

function validateScopes(
  input: ApprovalConsistencyInput
): ApprovalConsistencyFinding[] {
  const findings: ApprovalConsistencyFinding[] = [];
  const nowMs = Date.parse(input.createdAt ?? new Date().toISOString());
  (input.scopes ?? []).forEach((scope, index) => {
    const path = `scopes.${index}`;
    const kind = safeText(scope.kind);
    const stageKind = safeText(scope.stageKind);
    if (!scopeKindSet.has(kind)) {
      findings.push(finding("blocker", "UNKNOWN_SCOPE_KIND", path));
    }
    if (!stageKindSet.has(stageKind)) {
      findings.push(finding("blocker", "UNKNOWN_STAGE_KIND", path));
    }
    if (safeText(scope.summary).length === 0) {
      findings.push(finding("blocker", "MISSING_SCOPE_SUMMARY", path));
    }
    if (
      input.expectedTaskId !== undefined &&
      scope.taskId !== undefined &&
      scope.taskId !== input.expectedTaskId
    ) {
      findings.push(finding("blocker", "TASK_ID_MISMATCH", path));
    }
    if (
      input.expectedWorkflowScenarioId !== undefined &&
      scope.workflowScenarioId !== undefined &&
      scope.workflowScenarioId !== input.expectedWorkflowScenarioId
    ) {
      findings.push(finding("blocker", "WORKFLOW_SCENARIO_ID_MISMATCH", path));
    }
    if (
      input.expectedWorkspaceRootRef !== undefined &&
      scope.workspaceRootRef !== undefined &&
      scope.workspaceRootRef !== input.expectedWorkspaceRootRef
    ) {
      findings.push(finding("blocker", "WORKSPACE_ROOT_REF_MISMATCH", path));
    }
    if (
      input.expectedProposalId !== undefined &&
      scope.proposalId !== undefined &&
      scope.proposalId !== input.expectedProposalId
    ) {
      findings.push(finding("blocker", "PROPOSAL_ID_MISMATCH", path));
    }
    if (safeText(scope.expiresAt).length > 0) {
      const expiresMs = Date.parse(safeText(scope.expiresAt));
      if (Number.isFinite(expiresMs) && expiresMs <= nowMs) {
        findings.push(finding("blocker", "EXPIRED_RECEIPT", path));
      }
    }
    for (const code of scopeBlockers(scope)) {
      findings.push(finding("blocker", code, path));
    }
    for (const code of scopeWarnings(scope)) {
      findings.push(finding("warning", code, path));
    }
  });
  return findings;
}

function scopeBlockers(scope: ApprovalConsistencyScope): string[] {
  const kind = safeText(scope.kind);
  const stageKind = safeText(scope.stageKind);
  const blockers: string[] = [];
  if (
    kind === "user_workspace_apply_receipt" &&
    stageKind === "desktop_action"
  ) {
    blockers.push("APPLY_RECEIPT_USED_FOR_DESKTOP_ACTION");
  }
  if (kind === "desktop_action_approval" && stageKind === "workspace_apply") {
    blockers.push("DESKTOP_RECEIPT_USED_FOR_WORKSPACE_APPLY");
  }
  if (
    kind === "mcp_readonly_tool_approval" &&
    stageKind === "plugin_skill_runtime"
  ) {
    blockers.push("MCP_APPROVAL_USED_FOR_PLUGIN_SKILL_ACTION");
  }
  if (scope.broadLease === true) {
    blockers.push("BROAD_PERMISSION_LEASE");
  }
  if (
    Array.isArray(scope.allowedPathRefs) &&
    scope.allowedPathRefs.some(
      (pathRef) => pathRef === "*" || pathRef === "**/*"
    )
  ) {
    blockers.push("BROAD_WILDCARD_SCOPE");
  }
  if (
    requiresTypedConfirmation(kind) &&
    scope.typedConfirmationPresent !== true
  ) {
    blockers.push("MISSING_TYPED_CONFIRMATION");
  }
  return unique(blockers);
}

function scopeWarnings(scope: ApprovalConsistencyScope): string[] {
  const warnings: string[] = [];
  if (safeText(scope.expiresAt).length === 0) {
    warnings.push("MISSING_EXPIRATION");
  }
  if (
    !Array.isArray(scope.allowedPathRefs) ||
    scope.allowedPathRefs.length === 0
  ) {
    warnings.push("MISSING_ALLOWED_PATH_REFS");
  }
  return warnings;
}

function requiresTypedConfirmation(kind: string): boolean {
  return (
    kind === "user_workspace_apply_receipt" ||
    kind === "rollback_receipt" ||
    kind === "desktop_action_approval"
  );
}

function findForbiddenFields(value: unknown): ApprovalConsistencyFinding[] {
  const findings: ApprovalConsistencyFinding[] = [];
  visit(value, (entry) => {
    if (forbiddenFieldKeys.has(entry.key.toLowerCase())) {
      findings.push(finding("blocker", "FORBIDDEN_FIELD", entry.path));
    }
  });
  return findings;
}

function findExecutionClaims(value: unknown): ApprovalConsistencyFinding[] {
  const findings: ApprovalConsistencyFinding[] = [];
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

function findUnsafeStringMarkers(value: unknown): ApprovalConsistencyFinding[] {
  const findings: ApprovalConsistencyFinding[] = [];
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
  severity: ApprovalConsistencySeverity,
  code: string,
  path?: string
): ApprovalConsistencyFinding {
  return {
    findingId: `approval-consistency-${severity}-${code.toLowerCase()}-${stablePreviewHash(
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
    MISSING_SCOPES: "No approval or receipt scope summaries were provided.",
    UNKNOWN_SCOPE_KIND: "Approval scope kind is not allowed.",
    UNKNOWN_STAGE_KIND: "Approval stage kind is not allowed.",
    MISSING_SCOPE_SUMMARY: "Approval scope requires summary-only text.",
    TASK_ID_MISMATCH: "Approval receipt task id does not match.",
    WORKFLOW_SCENARIO_ID_MISMATCH:
      "Approval receipt workflow scenario id does not match.",
    WORKSPACE_ROOT_REF_MISMATCH:
      "Approval receipt workspace root ref does not match.",
    PROPOSAL_ID_MISMATCH: "Approval receipt proposal id does not match.",
    EXPIRED_RECEIPT: "Approval receipt or policy is expired.",
    APPLY_RECEIPT_USED_FOR_DESKTOP_ACTION:
      "Workspace apply receipt cannot authorize a desktop action.",
    DESKTOP_RECEIPT_USED_FOR_WORKSPACE_APPLY:
      "Desktop action receipt cannot authorize workspace apply.",
    MCP_APPROVAL_USED_FOR_PLUGIN_SKILL_ACTION:
      "MCP approval cannot authorize plugin or skill runtime action.",
    BROAD_PERMISSION_LEASE: "Broad PermissionLease scope is blocked.",
    BROAD_WILDCARD_SCOPE: "Wildcard approval scope is blocked.",
    MISSING_TYPED_CONFIRMATION:
      "This approval scope requires typed confirmation.",
    MISSING_EXPIRATION: "Approval scope does not include an expiration.",
    MISSING_ALLOWED_PATH_REFS:
      "Approval scope does not include allowed path refs.",
    FORBIDDEN_FIELD:
      "Raw, secret, command, approval execution, EventStore, or lease-issuing fields are not allowed.",
    EXECUTION_FLAG_TRUE:
      "Approval consistency report must not claim execution readiness.",
    API_KEY_MARKER: "Secret-like API key marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization header marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected."
  };
  return messages[code] ?? "Approval consistency finding.";
}

function nextActionFor(status: ApprovalConsistencyStatus): string {
  if (status === "empty") {
    return "Provide summary-only approval and receipt scope refs.";
  }
  if (status === "blocked") {
    return "Resolve approval, receipt, lease, and scope blockers before claiming readiness.";
  }
  if (status === "warning") {
    return "Review missing expiration or path warnings. Report remains advisory.";
  }
  return "Approval and receipt summaries are consistent for advisory review.";
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function dedupeFindings(
  findings: ApprovalConsistencyFinding[]
): ApprovalConsistencyFinding[] {
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
