import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type AgentHandoffStateReviewStatus =
  | "empty"
  | "review_ready"
  | "warning"
  | "blocked";

export type AgentHandoffStateSeverity = "blocker" | "warning";

export type AgentHandoffRole =
  | "orchestrator"
  | "coder"
  | "reviewer"
  | "verifier";

export type AgentHandoffStageStatus =
  | "pending"
  | "running"
  | "completed"
  | "warning"
  | "blocked"
  | "interrupted";

export type AgentHandoffStateFinding = {
  findingId: string;
  severity: AgentHandoffStateSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type AgentHandoffStageInput = {
  stageId?: string | undefined;
  role?: AgentHandoffRole | string | undefined;
  status?: AgentHandoffStageStatus | string | undefined;
  summary?: string | undefined;
  outputRef?: string | undefined;
  proposalId?: string | undefined;
  verificationSummaryRef?: string | undefined;
  dossierHash?: string | undefined;
  expectedDossierHash?: string | undefined;
  evidenceRefs?: string[] | undefined;
  contextRefs?: string[] | undefined;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  nextAction?: string | undefined;
  warningCodes?: string[] | undefined;
  readiness?: Record<string, unknown> | undefined;
  [key: string]: unknown;
};

export type AgentHandoffStageSummary = {
  stageId: string;
  role: AgentHandoffRole;
  status: AgentHandoffStageStatus;
  summaryHash: string;
  hasOutput: boolean;
  evidenceRefCount: number;
  contextRefCount: number;
  warningCodes: string[];
  blockerCodes: string[];
};

export type AgentHandoffStateReadiness = {
  canReviewHandoffState: boolean;
  canRerunAgent: false;
  canCreateDynamicAgent: false;
  canBidAgents: false;
  canInvokeTools: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type AgentHandoffStateReviewInput = {
  stages?: AgentHandoffStageInput[] | undefined;
  expectedRoleOrder?: AgentHandoffRole[] | undefined;
  staleThresholdMs?: number | undefined;
  createdAt?: string | undefined;
  sourceKind?: "runtime" | "app_preview" | "fixture" | "manual_test";
  idGenerator?: (() => string) | undefined;
  [key: string]: unknown;
};

export type AgentHandoffStateReviewReport = {
  status: AgentHandoffStateReviewStatus;
  reviewId: string;
  source: "runtime_agent_handoff_state_review";
  sourceKind: "runtime" | "app_preview" | "fixture" | "manual_test";
  stageCount: number;
  completedStageCount: number;
  missingRoleOutputCount: number;
  staleStageCount: number;
  skippedRoleCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  roleOrder: AgentHandoffRole[];
  stageSummaries: AgentHandoffStageSummary[];
  findings: AgentHandoffStateFinding[];
  reviewHash: string;
  readiness: AgentHandoffStateReadiness;
  nextAction: string;
};

const roles: AgentHandoffRole[] = [
  "orchestrator",
  "coder",
  "reviewer",
  "verifier"
];

const roleSet = new Set<string>(roles);
const statusSet = new Set<string>([
  "pending",
  "running",
  "completed",
  "warning",
  "blocked",
  "interrupted"
]);

const emptyReadiness: AgentHandoffStateReadiness = {
  canReviewHandoffState: false,
  canRerunAgent: false,
  canCreateDynamicAgent: false,
  canBidAgents: false,
  canInvokeTools: false,
  canApplyPatch: false,
  canRollback: false,
  canWriteEventStore: false,
  canExecuteGit: false,
  canExecuteShell: false,
  appCanExecute: false
};

const forbiddenFieldKeys = new Set(
  [
    "raw" + "Prompt",
    "raw" + "Source",
    "raw" + "Diff",
    "raw" + "Response",
    "raw" + "Output",
    "fileContent",
    "stdout",
    "stderr",
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
    "dynamicBidding",
    "agentRuntime",
    "desktopActionExecute",
    "nativeBridge",
    "tools",
    "tool_choice"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "canRerunAgent",
    "canCreateDynamicAgent",
    "canBidAgents",
    "canInvokeTools",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "claimsExecution"
  ].map((field) => field.toLowerCase())
);

export function buildAgentHandoffStateReviewReport(
  input: AgentHandoffStateReviewInput = {}
): AgentHandoffStateReviewReport {
  const reviewId =
    input.idGenerator?.() ??
    `agent-handoff-review-${stablePreviewHash(stableStringify(input)).slice(0, 12)}`;
  const findings = validateAgentHandoffStateReviewInput(input);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const stageSummaries =
    blockerCount > 0 ? [] : normalizeStages(input.stages ?? [], input);

  if ((input.stages ?? []).length === 0) {
    return buildReport({
      reviewId,
      sourceKind: input.sourceKind ?? "runtime",
      status: blockerCount > 0 ? "blocked" : "empty",
      stageSummaries,
      findings: [...findings, finding("warning", "MISSING_HANDOFF_STAGES")]
    });
  }

  const stageBlocked = stageSummaries.some(
    (stage) => stage.blockerCodes.length > 0
  );
  const stageWarning = stageSummaries.some(
    (stage) => stage.warningCodes.length > 0
  );

  return buildReport({
    reviewId,
    sourceKind: input.sourceKind ?? "runtime",
    status:
      blockerCount > 0 || stageBlocked
        ? "blocked"
        : stageWarning
          ? "warning"
          : "review_ready",
    stageSummaries,
    findings
  });
}

export function summarizeAgentHandoffStateReviewReport(
  report: AgentHandoffStateReviewReport
): Pick<
  AgentHandoffStateReviewReport,
  | "status"
  | "reviewId"
  | "stageCount"
  | "completedStageCount"
  | "missingRoleOutputCount"
  | "staleStageCount"
  | "skippedRoleCount"
  | "blockerCount"
  | "warningCount"
  | "reviewHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: report.status,
    reviewId: report.reviewId,
    stageCount: report.stageCount,
    completedStageCount: report.completedStageCount,
    missingRoleOutputCount: report.missingRoleOutputCount,
    staleStageCount: report.staleStageCount,
    skippedRoleCount: report.skippedRoleCount,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    reviewHash: report.reviewHash,
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: report.source
  };
}

export function validateAgentHandoffStateReviewInput(
  input: AgentHandoffStateReviewInput = {}
): AgentHandoffStateFinding[] {
  return [
    ...findForbiddenFields(input),
    ...findUnsafeMarkers(input),
    ...findExecutionClaims(input),
    ...validateStages(input)
  ];
}

function buildReport(input: {
  reviewId: string;
  sourceKind: AgentHandoffStateReviewReport["sourceKind"];
  status: AgentHandoffStateReviewStatus;
  stageSummaries: AgentHandoffStageSummary[];
  findings: AgentHandoffStateFinding[];
}): AgentHandoffStateReviewReport {
  const allFindings = dedupeFindings(input.findings);
  const blockerCount = allFindings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount =
    allFindings.filter((findingItem) => findingItem.severity === "warning")
      .length +
    input.stageSummaries.reduce(
      (count, stage) => count + stage.warningCodes.length,
      0
    );
  const reviewHash = stablePreviewHash(
    stableStringify({
      reviewId: input.reviewId,
      sourceKind: input.sourceKind,
      status: input.status,
      stages: input.stageSummaries,
      findingCodes: allFindings.map((findingItem) => findingItem.code)
    })
  );
  return {
    status: input.status,
    reviewId: input.reviewId,
    source: "runtime_agent_handoff_state_review",
    sourceKind: input.sourceKind,
    stageCount: input.stageSummaries.length,
    completedStageCount: input.stageSummaries.filter(
      (stage) => stage.status === "completed"
    ).length,
    missingRoleOutputCount: input.stageSummaries.filter(
      (stage) => !stage.hasOutput
    ).length,
    staleStageCount: input.stageSummaries.filter((stage) =>
      stage.warningCodes.includes("LONG_RUNNING_STAGE_STALE")
    ).length,
    skippedRoleCount: allFindings.filter(
      (findingItem) => findingItem.code === "REVIEWER_OR_VERIFIER_SKIPPED"
    ).length,
    blockerCount,
    warningCount,
    findingCount: allFindings.length,
    roleOrder: input.stageSummaries.map((stage) => stage.role),
    stageSummaries: input.stageSummaries,
    findings: allFindings,
    reviewHash,
    readiness: {
      ...emptyReadiness,
      canReviewHandoffState:
        input.status === "review_ready" || input.status === "warning"
    },
    nextAction: nextActionFor(input.status)
  };
}

function normalizeStages(
  stages: AgentHandoffStageInput[],
  input: AgentHandoffStateReviewInput
): AgentHandoffStageSummary[] {
  return stages.map((stage, index) => {
    const role = safeText(stage.role) as AgentHandoffRole;
    const stageId = safeText(stage.stageId, `${role}-stage-${index + 1}`);
    const summary = safeText(stage.summary, `${role} handoff summary`);
    const warningCodes = stageWarnings(stage, input);
    const blockerCodes = stageBlockers(stage);
    return {
      stageId,
      role,
      status: safeStatus(stage.status),
      summaryHash: stablePreviewHash(
        stableStringify({
          stageId,
          role,
          status: stage.status,
          summary,
          outputRef: stage.outputRef,
          proposalId: stage.proposalId,
          verificationSummaryRef: stage.verificationSummaryRef,
          dossierHash: stage.dossierHash,
          expectedDossierHash: stage.expectedDossierHash
        })
      ).slice(0, 16),
      hasOutput: safeText(stage.outputRef).length > 0,
      evidenceRefCount: safeStringArray(stage.evidenceRefs).length,
      contextRefCount: safeStringArray(stage.contextRefs).length,
      warningCodes,
      blockerCodes
    };
  });
}

function validateStages(
  input: AgentHandoffStateReviewInput
): AgentHandoffStateFinding[] {
  const findings: AgentHandoffStateFinding[] = [];
  const stages = input.stages ?? [];
  const seenRoles = new Set<string>();
  const expected = input.expectedRoleOrder ?? roles;
  stages.forEach((stage, index) => {
    const path = `stages.${index}`;
    const role = safeText(stage.role);
    if (!roleSet.has(role)) {
      findings.push(finding("blocker", "UNKNOWN_AGENT_ROLE", path));
    } else {
      seenRoles.add(role);
    }
    if (!statusSet.has(safeText(stage.status, "pending"))) {
      findings.push(finding("blocker", "UNKNOWN_STAGE_STATUS", path));
    }
    if (safeText(stage.summary).length === 0) {
      findings.push(finding("blocker", "MISSING_STAGE_SUMMARY", path));
    }
    for (const code of stageBlockers(stage)) {
      findings.push(finding("blocker", code, path));
    }
    for (const code of stageWarnings(stage, input)) {
      findings.push(finding("warning", code, path));
    }
  });

  const actualOrder = stages
    .map((stage) => safeText(stage.role))
    .filter((role): role is AgentHandoffRole => roleSet.has(role));
  if (
    actualOrder.length > 0 &&
    actualOrder.join("/") !== expected.slice(0, actualOrder.length).join("/")
  ) {
    findings.push(finding("blocker", "ROLE_ORDER_MISMATCH", "stages"));
  }
  for (const role of ["reviewer", "verifier"] satisfies AgentHandoffRole[]) {
    if (!seenRoles.has(role)) {
      findings.push(
        finding("blocker", "REVIEWER_OR_VERIFIER_SKIPPED", `role:${role}`)
      );
    }
  }
  return findings;
}

function stageBlockers(stage: AgentHandoffStageInput): string[] {
  const blockers: string[] = [];
  const role = safeText(stage.role);
  if (safeText(stage.outputRef).length === 0) {
    blockers.push("MISSING_ROLE_OUTPUT");
  }
  if (safeStringArray(stage.evidenceRefs).length === 0) {
    blockers.push("MISSING_EVIDENCE_REF");
  }
  if (
    safeText(stage.expectedDossierHash).length > 0 &&
    safeText(stage.dossierHash).length > 0 &&
    stage.expectedDossierHash !== stage.dossierHash
  ) {
    blockers.push("STALE_DOSSIER_HASH");
  }
  if (role === "coder" && safeText(stage.proposalId).length === 0) {
    blockers.push("CODER_OUTPUT_MISSING_PROPOSAL_ID");
  }
  if (
    role === "verifier" &&
    safeText(stage.verificationSummaryRef).length === 0
  ) {
    blockers.push("VERIFIER_MISSING_VERIFICATION_SUMMARY");
  }
  if (safeStatus(stage.status) === "interrupted" && safeText(stage.nextAction).length === 0) {
    blockers.push("INTERRUPTED_RECOVERY_MISSING_NEXT_ACTION");
  }
  return unique(blockers);
}

function stageWarnings(
  stage: AgentHandoffStageInput,
  input: AgentHandoffStateReviewInput
): string[] {
  const warnings: string[] = [];
  const ageMs = stageAgeMs(stage, input.createdAt);
  const threshold = Math.max(input.staleThresholdMs ?? 3_600_000, 1);
  if (
    (safeStatus(stage.status) === "running" ||
      safeStatus(stage.status) === "pending") &&
    ageMs !== undefined &&
    ageMs > threshold
  ) {
    warnings.push("LONG_RUNNING_STAGE_STALE");
  }
  return unique([...warnings, ...safeStringArray(stage.warningCodes)]);
}

function stageAgeMs(
  stage: AgentHandoffStageInput,
  createdAt: string | undefined
): number | undefined {
  const startMs = Date.parse(stage.startedAt ?? "");
  const nowMs = Date.parse(createdAt ?? new Date(0).toISOString());
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs)) {
    return undefined;
  }
  return Math.max(0, nowMs - startMs);
}

function findForbiddenFields(value: unknown): AgentHandoffStateFinding[] {
  const findings: AgentHandoffStateFinding[] = [];
  visit(value, (entry) => {
    if (forbiddenFieldKeys.has(entry.key.toLowerCase())) {
      findings.push(finding("blocker", "FORBIDDEN_RAW_HANDOFF_FIELD", entry.path));
    }
  });
  return findings;
}

function findExecutionClaims(value: unknown): AgentHandoffStateFinding[] {
  const findings: AgentHandoffStateFinding[] = [];
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

function findUnsafeMarkers(value: unknown): AgentHandoffStateFinding[] {
  const findings: AgentHandoffStateFinding[] = [];
  visit(value, (entry) => {
    if (typeof entry.value !== "string") {
      return;
    }
    if (/\bBearer\s+[A-Za-z0-9._-]{12,}\b/.test(entry.value)) {
      findings.push(finding("blocker", "BEARER_TOKEN_MARKER", entry.path));
    }
    if (new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`).test(entry.value)) {
      findings.push(finding("blocker", "API_KEY_MARKER", entry.path));
    }
    if (/\braw prompt\b|\braw source\b|\braw diff\b/i.test(entry.value)) {
      findings.push(finding("blocker", "RAW_CONTENT_MARKER", entry.path));
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
  severity: AgentHandoffStateSeverity,
  code: string,
  path?: string
): AgentHandoffStateFinding {
  return {
    findingId: `agent-handoff-${severity}-${code.toLowerCase()}-${stablePreviewHash(
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
    MISSING_HANDOFF_STAGES: "No agent handoff stages were provided.",
    UNKNOWN_AGENT_ROLE: "Agent role is not allowed.",
    UNKNOWN_STAGE_STATUS: "Agent stage status is not allowed.",
    MISSING_STAGE_SUMMARY: "Agent stage summary is missing.",
    MISSING_ROLE_OUTPUT: "Agent role output ref is missing.",
    ROLE_ORDER_MISMATCH: "Agent handoff role order does not match.",
    STALE_DOSSIER_HASH: "Agent handoff dossier hash is stale.",
    MISSING_EVIDENCE_REF: "Agent handoff evidence ref is missing.",
    REVIEWER_OR_VERIFIER_SKIPPED: "Reviewer or verifier stage was skipped.",
    CODER_OUTPUT_MISSING_PROPOSAL_ID:
      "Coder output is missing a proposal id.",
    VERIFIER_MISSING_VERIFICATION_SUMMARY:
      "Verifier result is missing a verification summary.",
    LONG_RUNNING_STAGE_STALE: "Long-running agent stage is stale.",
    INTERRUPTED_RECOVERY_MISSING_NEXT_ACTION:
      "Interrupted workflow recovery is missing nextAction.",
    FORBIDDEN_RAW_HANDOFF_FIELD:
      "Raw prompt/source/diff, command, secret, or execution fields are not allowed.",
    EXECUTION_FLAG_TRUE:
      "Agent handoff state review must not claim execution readiness.",
    BEARER_TOKEN_MARKER: "Bearer token marker detected.",
    API_KEY_MARKER: "Secret-like API key marker detected.",
    RAW_CONTENT_MARKER: "Raw prompt/source/diff marker detected."
  };
  return messages[code] ?? "Agent handoff state review finding.";
}

function nextActionFor(status: AgentHandoffStateReviewStatus): string {
  if (status === "empty") {
    return "Provide summary-only agent handoff stage refs.";
  }
  if (status === "blocked") {
    return "Resolve handoff blockers before using the long-running state review.";
  }
  if (status === "warning") {
    return "Review stale long-running stage warnings before continuing.";
  }
  return "Agent handoff state is ready for read-only review.";
}

function safeStatus(value: unknown): AgentHandoffStageStatus {
  return statusSet.has(safeText(value)) ? (safeText(value) as AgentHandoffStageStatus) : "pending";
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

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function dedupeFindings(
  findings: AgentHandoffStateFinding[]
): AgentHandoffStateFinding[] {
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
