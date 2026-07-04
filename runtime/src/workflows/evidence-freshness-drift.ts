import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type EvidenceFreshnessDriftStatus =
  | "empty"
  | "fresh"
  | "warning"
  | "blocked";

export type EvidenceFreshnessDriftSeverity = "blocker" | "warning";

export type EvidenceFreshnessFinding = {
  findingId: string;
  severity: EvidenceFreshnessDriftSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type EvidenceFreshnessCategory =
  | "workspace_index"
  | "project_knowledge"
  | "memory_recall"
  | "mcp_metadata"
  | "mcp_tool_result"
  | "plugin_skill_metadata"
  | "desktop_observation"
  | "desktop_action_target"
  | "git_status_diff"
  | "shell_verification"
  | "agent_handoff_dossier";

export type EvidenceFreshnessRefInput = {
  refId?: string | undefined;
  category?: EvidenceFreshnessCategory | string | undefined;
  summary?: string | undefined;
  observedAt?: string | undefined;
  validatedAt?: string | undefined;
  expectedHashPrefix?: string | undefined;
  currentHashPrefix?: string | undefined;
  sourceType?: string | undefined;
  expectedSourceType?: string | undefined;
  applyCompletedAt?: string | undefined;
  contextRefPresent?: boolean | undefined;
  warningCodes?: string[] | undefined;
  readiness?: Record<string, unknown> | undefined;
  [key: string]: unknown;
};

export type EvidenceFreshnessRefSummary = {
  refId: string;
  category: EvidenceFreshnessCategory;
  summaryHash: string;
  stale: boolean;
  drifted: boolean;
  warningCodes: string[];
  blockerCodes: string[];
};

export type EvidenceFreshnessReadiness = {
  canUseForWorkflowReview: boolean;
  canReadRawEvidence: false;
  canRefreshEvidence: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canInvokeMcpTool: false;
  canExecutePluginRuntime: false;
  canTriggerDesktopObserver: false;
  canExecuteDesktopAction: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type EvidenceFreshnessDriftInput = {
  evidenceRefs?: EvidenceFreshnessRefInput[] | undefined;
  staleThresholdMs?: number | undefined;
  desktopObservationStaleThresholdMs?: number | undefined;
  createdAt?: string | undefined;
  sourceKind?: "runtime" | "app_preview" | "fixture" | "manual_test";
  idGenerator?: (() => string) | undefined;
  [key: string]: unknown;
};

export type EvidenceFreshnessDriftReport = {
  status: EvidenceFreshnessDriftStatus;
  freshnessId: string;
  source: "runtime_evidence_freshness_drift";
  sourceKind: "runtime" | "app_preview" | "fixture" | "manual_test";
  evidenceCount: number;
  staleCount: number;
  driftCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  categoryCounts: Record<EvidenceFreshnessCategory, number>;
  refs: EvidenceFreshnessRefSummary[];
  findings: EvidenceFreshnessFinding[];
  freshnessHash: string;
  readiness: EvidenceFreshnessReadiness;
  nextAction: string;
};

const categories: EvidenceFreshnessCategory[] = [
  "workspace_index",
  "project_knowledge",
  "memory_recall",
  "mcp_metadata",
  "mcp_tool_result",
  "plugin_skill_metadata",
  "desktop_observation",
  "desktop_action_target",
  "git_status_diff",
  "shell_verification",
  "agent_handoff_dossier"
];

const categorySet = new Set<string>(categories);

const emptyReadiness: EvidenceFreshnessReadiness = {
  canUseForWorkflowReview: false,
  canReadRawEvidence: false,
  canRefreshEvidence: false,
  canWriteEventStore: false,
  canApplyPatch: false,
  canRollback: false,
  canInvokeMcpTool: false,
  canExecutePluginRuntime: false,
  canTriggerDesktopObserver: false,
  canExecuteDesktopAction: false,
  canExecuteGit: false,
  canExecuteShell: false,
  appCanExecute: false
};

const forbiddenFieldKeys = new Set(
  [
    "raw" + "Evidence",
    "raw" + "Content",
    "raw" + "Prompt",
    "raw" + "Response",
    "raw" + "Source",
    "raw" + "Diff",
    "raw" + "Screenshot",
    "raw" + "Ocr",
    "fileContent",
    "resourceContent",
    "toolOutput",
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
    "desktopActionExecute",
    "nativeBridge",
    "tools",
    "tool_choice"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "canReadRawEvidence",
    "canRefreshEvidence",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canInvokeMcpTool",
    "canExecutePluginRuntime",
    "canTriggerDesktopObserver",
    "canExecuteDesktopAction",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "claimsExecution"
  ].map((field) => field.toLowerCase())
);

export function buildEvidenceFreshnessDriftReport(
  input: EvidenceFreshnessDriftInput = {}
): EvidenceFreshnessDriftReport {
  const freshnessId =
    input.idGenerator?.() ??
    `evidence-freshness-${stablePreviewHash(stableStringify(input)).slice(0, 12)}`;
  const findings = validateEvidenceFreshnessDriftInput(input);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const refs =
    blockerCount > 0 ? [] : normalizeRefs(input.evidenceRefs ?? [], input);

  if ((input.evidenceRefs ?? []).length === 0) {
    return buildReport({
      freshnessId,
      sourceKind: input.sourceKind ?? "runtime",
      status: blockerCount > 0 ? "blocked" : "empty",
      refs,
      findings: [...findings, finding("warning", "MISSING_EVIDENCE_REFS")]
    });
  }

  const refWarning = refs.some((ref) => ref.warningCodes.length > 0);
  const refBlocked = refs.some((ref) => ref.blockerCodes.length > 0);
  return buildReport({
    freshnessId,
    sourceKind: input.sourceKind ?? "runtime",
    status:
      blockerCount > 0 || refBlocked
        ? "blocked"
        : refWarning
          ? "warning"
          : "fresh",
    refs,
    findings
  });
}

export function summarizeEvidenceFreshnessDriftReport(
  report: EvidenceFreshnessDriftReport
): Pick<
  EvidenceFreshnessDriftReport,
  | "status"
  | "freshnessId"
  | "evidenceCount"
  | "staleCount"
  | "driftCount"
  | "blockerCount"
  | "warningCount"
  | "categoryCounts"
  | "freshnessHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: report.status,
    freshnessId: report.freshnessId,
    evidenceCount: report.evidenceCount,
    staleCount: report.staleCount,
    driftCount: report.driftCount,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    categoryCounts: report.categoryCounts,
    freshnessHash: report.freshnessHash,
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: report.source
  };
}

export function validateEvidenceFreshnessDriftInput(
  input: EvidenceFreshnessDriftInput = {}
): EvidenceFreshnessFinding[] {
  return [
    ...findForbiddenFields(input),
    ...findUnsafeMarkers(input),
    ...findExecutionClaims(input),
    ...validateRefs(input)
  ];
}

function buildReport(input: {
  freshnessId: string;
  sourceKind: EvidenceFreshnessDriftReport["sourceKind"];
  status: EvidenceFreshnessDriftStatus;
  refs: EvidenceFreshnessRefSummary[];
  findings: EvidenceFreshnessFinding[];
}): EvidenceFreshnessDriftReport {
  const allFindings = dedupeFindings(input.findings);
  const blockerCount = allFindings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount =
    allFindings.filter((findingItem) => findingItem.severity === "warning")
      .length +
    input.refs.reduce((count, ref) => count + ref.warningCodes.length, 0);
  const freshnessHash = stablePreviewHash(
    stableStringify({
      freshnessId: input.freshnessId,
      sourceKind: input.sourceKind,
      status: input.status,
      refs: input.refs,
      findingCodes: allFindings.map((findingItem) => findingItem.code)
    })
  );
  return {
    status: input.status,
    freshnessId: input.freshnessId,
    source: "runtime_evidence_freshness_drift",
    sourceKind: input.sourceKind,
    evidenceCount: input.refs.length,
    staleCount: input.refs.filter((ref) => ref.stale).length,
    driftCount: input.refs.filter((ref) => ref.drifted).length,
    blockerCount,
    warningCount,
    findingCount: allFindings.length,
    categoryCounts: countCategories(input.refs),
    refs: input.refs,
    findings: allFindings,
    freshnessHash,
    readiness: {
      ...emptyReadiness,
      canUseForWorkflowReview:
        input.status === "fresh" || input.status === "warning"
    },
    nextAction: nextActionFor(input.status)
  };
}

function normalizeRefs(
  refs: EvidenceFreshnessRefInput[],
  input: EvidenceFreshnessDriftInput
): EvidenceFreshnessRefSummary[] {
  return refs.map((ref, index) => {
    const category = safeText(ref.category) as EvidenceFreshnessCategory;
    const refId = safeText(ref.refId, `evidence-ref-${index + 1}`);
    const summary = safeText(ref.summary, `${category} summary`);
    const warningCodes = refWarnings(ref, input);
    const blockerCodes = refBlockers(ref);
    return {
      refId,
      category,
      summaryHash: stablePreviewHash(
        stableStringify({
          refId,
          category,
          summary,
          observedAt: ref.observedAt,
          validatedAt: ref.validatedAt,
          expectedHashPrefix: ref.expectedHashPrefix,
          currentHashPrefix: ref.currentHashPrefix,
          sourceType: ref.sourceType,
          expectedSourceType: ref.expectedSourceType
        })
      ).slice(0, 16),
      stale: warningCodes.some((code) => code.includes("STALE")),
      drifted: blockerCodes.some(
        (code) => code.includes("MISMATCH") || code.includes("CHANGED")
      ),
      warningCodes,
      blockerCodes
    };
  });
}

function validateRefs(
  input: EvidenceFreshnessDriftInput
): EvidenceFreshnessFinding[] {
  const findings: EvidenceFreshnessFinding[] = [];
  const seen = new Set<string>();
  (input.evidenceRefs ?? []).forEach((ref, index) => {
    const path = `evidenceRefs.${index}`;
    const refId = safeText(ref.refId);
    const category = safeText(ref.category);
    if (refId.length === 0) {
      findings.push(finding("blocker", "MISSING_EVIDENCE_REF", path));
    } else if (seen.has(refId)) {
      findings.push(finding("blocker", "DUPLICATE_EVIDENCE_REF", path));
    } else {
      seen.add(refId);
    }
    if (!categorySet.has(category)) {
      findings.push(finding("blocker", "UNKNOWN_EVIDENCE_CATEGORY", path));
    }
    if (safeText(ref.summary).length === 0) {
      findings.push(finding("blocker", "MISSING_EVIDENCE_SUMMARY", path));
    }
    for (const code of refBlockers(ref)) {
      findings.push(finding("blocker", code, path));
    }
    for (const code of refWarnings(ref, input)) {
      findings.push(finding("warning", code, path));
    }
  });
  return findings;
}

function refWarnings(
  ref: EvidenceFreshnessRefInput,
  input: EvidenceFreshnessDriftInput
): string[] {
  const warnings: string[] = [];
  const category = safeText(ref.category);
  const ageMs = evidenceAgeMs(ref.observedAt, input.createdAt);
  const staleThresholdMs = Math.max(input.staleThresholdMs ?? 86_400_000, 1);
  const desktopThresholdMs = Math.max(
    input.desktopObservationStaleThresholdMs ?? 300_000,
    1
  );
  if (ageMs !== undefined && ageMs > staleThresholdMs) {
    warnings.push("STALE_EVIDENCE");
  }
  if (
    category === "workspace_index" &&
    ageMs !== undefined &&
    ageMs > staleThresholdMs
  ) {
    warnings.push("WORKSPACE_SNAPSHOT_OUTDATED");
  }
  if (
    category === "desktop_observation" &&
    ageMs !== undefined &&
    ageMs > desktopThresholdMs
  ) {
    warnings.push("DESKTOP_OBSERVATION_TOO_OLD");
  }
  return unique([...warnings, ...safeStringArray(ref.warningCodes)]);
}

function refBlockers(ref: EvidenceFreshnessRefInput): string[] {
  const blockers: string[] = [];
  const category = safeText(ref.category);
  const expectedHash = safeText(ref.expectedHashPrefix);
  const currentHash = safeText(ref.currentHashPrefix);
  if (
    expectedHash.length > 0 &&
    currentHash.length > 0 &&
    expectedHash !== currentHash
  ) {
    blockers.push(codeForHashDrift(category));
  }
  if (
    safeText(ref.expectedSourceType).length > 0 &&
    safeText(ref.sourceType).length > 0 &&
    ref.expectedSourceType !== ref.sourceType
  ) {
    blockers.push("SOURCE_TYPE_MISMATCH");
  }
  if (category === "shell_verification" && verificationOlderThanApply(ref)) {
    blockers.push("VERIFICATION_OLDER_THAN_APPLY");
  }
  if (category === "agent_handoff_dossier" && ref.contextRefPresent !== true) {
    blockers.push("AGENT_HANDOFF_MISSING_CONTEXT");
  }
  return unique(blockers);
}

function codeForHashDrift(category: string): string {
  if (category === "mcp_metadata") {
    return "MCP_DESCRIPTOR_CHANGED";
  }
  if (category === "plugin_skill_metadata") {
    return "PLUGIN_SKILL_METADATA_CHANGED";
  }
  if (category === "git_status_diff") {
    return "GIT_DIFF_CHANGED_AFTER_VALIDATION";
  }
  return "HASH_MISMATCH";
}

function verificationOlderThanApply(ref: EvidenceFreshnessRefInput): boolean {
  const validationMs = Date.parse(ref.validatedAt ?? ref.observedAt ?? "");
  const applyMs = Date.parse(ref.applyCompletedAt ?? "");
  return (
    Number.isFinite(validationMs) &&
    Number.isFinite(applyMs) &&
    validationMs < applyMs
  );
}

function evidenceAgeMs(
  observedAt: string | undefined,
  createdAt: string | undefined
): number | undefined {
  const observedMs = Date.parse(observedAt ?? "");
  const nowMs = Date.parse(createdAt ?? new Date(0).toISOString());
  if (!Number.isFinite(observedMs) || !Number.isFinite(nowMs)) {
    return undefined;
  }
  return Math.max(0, nowMs - observedMs);
}

function countCategories(
  refs: EvidenceFreshnessRefSummary[]
): Record<EvidenceFreshnessCategory, number> {
  return Object.fromEntries(
    categories.map((category) => [
      category,
      refs.filter((ref) => ref.category === category).length
    ])
  ) as Record<EvidenceFreshnessCategory, number>;
}

function findForbiddenFields(value: unknown): EvidenceFreshnessFinding[] {
  const findings: EvidenceFreshnessFinding[] = [];
  visit(value, (entry) => {
    if (forbiddenFieldKeys.has(entry.key.toLowerCase())) {
      findings.push(
        finding("blocker", "FORBIDDEN_RAW_EVIDENCE_FIELD", entry.path)
      );
    }
  });
  return findings;
}

function findExecutionClaims(value: unknown): EvidenceFreshnessFinding[] {
  const findings: EvidenceFreshnessFinding[] = [];
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

function findUnsafeMarkers(value: unknown): EvidenceFreshnessFinding[] {
  const findings: EvidenceFreshnessFinding[] = [];
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
  severity: EvidenceFreshnessDriftSeverity,
  code: string,
  path?: string
): EvidenceFreshnessFinding {
  return {
    findingId: `evidence-freshness-${severity}-${code.toLowerCase()}-${stablePreviewHash(
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
    MISSING_EVIDENCE_REFS: "No evidence refs were provided.",
    MISSING_EVIDENCE_REF: "Evidence ref id is missing.",
    DUPLICATE_EVIDENCE_REF: "Evidence ref id is duplicated.",
    UNKNOWN_EVIDENCE_CATEGORY: "Evidence category is not allowed.",
    MISSING_EVIDENCE_SUMMARY: "Evidence ref summary is missing.",
    STALE_EVIDENCE: "Evidence timestamp is stale.",
    WORKSPACE_SNAPSHOT_OUTDATED: "Workspace snapshot is outdated.",
    DESKTOP_OBSERVATION_TOO_OLD: "Desktop observation is too old.",
    HASH_MISMATCH: "Evidence hash does not match current summary.",
    MCP_DESCRIPTOR_CHANGED: "MCP descriptor changed after validation.",
    PLUGIN_SKILL_METADATA_CHANGED:
      "Plugin/skill metadata changed after validation.",
    GIT_DIFF_CHANGED_AFTER_VALIDATION: "Git diff changed after validation.",
    SOURCE_TYPE_MISMATCH: "Evidence source type does not match expectation.",
    VERIFICATION_OLDER_THAN_APPLY:
      "Verification result is older than apply result.",
    AGENT_HANDOFF_MISSING_CONTEXT:
      "Agent handoff dossier references missing context.",
    FORBIDDEN_RAW_EVIDENCE_FIELD:
      "Raw evidence, command, secret, or execution fields are not allowed.",
    EXECUTION_FLAG_TRUE:
      "Evidence freshness report must not claim execution readiness.",
    BEARER_TOKEN_MARKER: "Bearer token marker detected.",
    API_KEY_MARKER: "Secret-like API key marker detected."
  };
  return messages[code] ?? "Evidence freshness/drift finding.";
}

function nextActionFor(status: EvidenceFreshnessDriftStatus): string {
  if (status === "empty") {
    return "Provide summary-only evidence refs for freshness and drift review.";
  }
  if (status === "blocked") {
    return "Refresh or replace drifted evidence refs before workflow review.";
  }
  if (status === "warning") {
    return "Review stale evidence refs before relying on the workflow preview.";
  }
  return "Evidence refs are fresh for summary-only workflow review.";
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
  findings: EvidenceFreshnessFinding[]
): EvidenceFreshnessFinding[] {
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
