import type {
  TranscriptRecord,
  TranscriptRetentionPolicy,
  TranscriptSourceKind,
  TranscriptSummary,
  TranscriptVisibility
} from "./transcript-schema.js";
import { summarizeTranscriptRecord } from "./transcript-schema.js";

export type TranscriptRetentionPlanKind = "retention" | "export" | "delete";

export type TranscriptRetentionPlanStatus =
  | "empty"
  | "ready"
  | "warning"
  | "blocked";

export type TranscriptRetentionFindingSeverity = "blocker" | "warning";

export type TranscriptRetentionFindingKind =
  | "schema"
  | "retention"
  | "export"
  | "delete"
  | "path"
  | "secret"
  | "execution"
  | "upload";

export type TranscriptRetentionFinding = {
  findingId: string;
  kind: TranscriptRetentionFindingKind;
  severity: TranscriptRetentionFindingSeverity;
  code: string;
  safeMessage: string;
  transcriptId?: string | undefined;
};

export type TranscriptRetentionReadiness = {
  canPreviewRetentionPlan: boolean;
  canPreviewExportSummary: boolean;
  canPreviewDeletePlan: boolean;
  canRequestSingleTranscriptDelete: boolean;
  canExecuteBulkDelete: false;
  canRecursiveDelete: false;
  canDeleteOutsideTranscriptStore: false;
  canExportRawTranscript: false;
  canUploadCloud: false;
  canUploadTelemetry: false;
  canWriteEventStore: false;
  canWriteWorkspace: false;
  canExecuteCommand: false;
  canRunShell: false;
  canApplyPatch: false;
  canRollback: false;
  canCommitGit: false;
  canPushGit: false;
  appCanExecute: false;
};

export type TranscriptRetentionRecordSummary = {
  transcriptId: string;
  sessionId?: string | undefined;
  sourceKind?: TranscriptSourceKind | undefined;
  visibility?: TranscriptVisibility | undefined;
  createdAt?: string | undefined;
  ageDays?: number | undefined;
  chunkCount: number;
  byteCount: number;
  lineCount: number;
  rawAvailableChunkCount: number;
  redactedFieldCount: number;
  secretMarkerCount: number;
  retainDays: number;
  rawRetentionDays?: number | undefined;
  redactedRetentionDays?: number | undefined;
  exportAllowed: boolean;
  deleteAllowed: boolean;
  tombstoneOnDelete: boolean;
  protected: boolean;
  eligibleForDelete: boolean;
  eligibleForSummaryExport: boolean;
  warningCodes: string[];
  hashPrefix?: string | undefined;
};

export type TranscriptRetentionPlanInputRecord =
  | TranscriptRecord
  | (Partial<TranscriptSummary> & {
      transcriptId: string;
      sessionId?: string | undefined;
      createdAt?: string | undefined;
      protected?: boolean | undefined;
      retentionPolicy?: Partial<TranscriptRetentionPolicy> | undefined;
      redactedRetentionDays?: number | undefined;
      transcriptHash?: string | undefined;
      hashPrefix?: string | undefined;
      summaryOnly?: boolean | undefined;
      rawContentIncluded?: boolean | undefined;
    });

export type TranscriptRetentionPlanInput = {
  transcripts?: TranscriptRetentionPlanInputRecord[] | undefined;
  now?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  maxRetainDays?: number | undefined;
  protectedTranscriptIds?: string[] | undefined;
  requestedTranscriptIds?: string[] | undefined;
  exportMode?: "summary_only" | "raw" | undefined;
  dryRunOnly?: boolean | undefined;
  allowBulkDeleteExecution?: boolean | undefined;
  recursiveDelete?: boolean | undefined;
  deletePath?: string | undefined;
  exportPath?: string | undefined;
  cloudUploadTarget?: string | undefined;
  telemetryUploadTarget?: string | undefined;
};

export type TranscriptRetentionPlan = {
  planKind: TranscriptRetentionPlanKind;
  status: TranscriptRetentionPlanStatus;
  planId: string;
  transcriptCount: number;
  eligibleDeleteIds: string[];
  protectedTranscriptIds: string[];
  exportSummaryIds: string[];
  deleteRequestedIds: string[];
  deleteDryRunOnly: true;
  bulkDeleteDisabled: true;
  singleTranscriptDeleteCommand: "tauri_delete_transcript_record";
  singleTranscriptDeleteCommandAvailable: boolean;
  summaryOnly: true;
  rawExportIncluded: false;
  cloudUploadIncluded: false;
  telemetryUploadIncluded: false;
  records: TranscriptRetentionRecordSummary[];
  findings: TranscriptRetentionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  planHash: string;
  readiness: TranscriptRetentionReadiness;
  nextAction: string;
  source: "runtime_transcript_retention_policy";
};

export type TranscriptRetentionPlanSummary = {
  planKind: TranscriptRetentionPlanKind;
  status: TranscriptRetentionPlanStatus;
  planId: string;
  transcriptCount: number;
  eligibleDeleteCount: number;
  exportSummaryCount: number;
  protectedCount: number;
  blockerCount: number;
  warningCount: number;
  planHash: string;
  readiness: TranscriptRetentionReadiness;
  nextAction: string;
  source: "runtime_transcript_retention_policy";
};

const maxDefaultRetainDays = 3650;
const millisecondsPerDay = 86_400_000;
const rawPrefix = "raw";

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    "promptText",
    rawPrefix + "Response",
    "responseText",
    "reasoningContent",
    "reasoning_content",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "env",
    "stdout",
    "stderr",
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
    "tools",
    "tool_choice",
    "path",
    "filePath",
    "directoryPath",
    "targetPath",
    "deletePath",
    "exportPath",
    "recursiveDelete"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  { code: "API_KEY_MARKER", pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/i },
  { code: "AUTHORIZATION_MARKER", pattern: /\bAuthorization\s*[:=]/i },
  { code: "BEARER_TOKEN_MARKER", pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/i },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i
  },
  { code: "RAW_PROMPT_MARKER", pattern: /\brawPrompt\b|raw prompt/i },
  { code: "RAW_RESPONSE_MARKER", pattern: /\brawResponse\b|raw response/i },
  {
    code: "REASONING_CONTENT_MARKER",
    pattern: /\breasoning_content\b|\breasoningContent\b|reasoning content/i
  }
];

export function buildTranscriptRetentionPlan(
  input: TranscriptRetentionPlanInput = {}
): TranscriptRetentionPlan {
  return buildPlan("retention", input);
}

export function buildTranscriptExportPlan(
  input: TranscriptRetentionPlanInput = {}
): TranscriptRetentionPlan {
  return buildPlan("export", input);
}

export function buildTranscriptDeletePlan(
  input: TranscriptRetentionPlanInput = {}
): TranscriptRetentionPlan {
  return buildPlan("delete", input);
}

export function summarizeTranscriptRetentionPlan(
  plan: TranscriptRetentionPlan
): TranscriptRetentionPlanSummary {
  return {
    planKind: plan.planKind,
    status: plan.status,
    planId: plan.planId,
    transcriptCount: plan.transcriptCount,
    eligibleDeleteCount: plan.eligibleDeleteIds.length,
    exportSummaryCount: plan.exportSummaryIds.length,
    protectedCount: plan.protectedTranscriptIds.length,
    blockerCount: plan.blockerCount,
    warningCount: plan.warningCount,
    planHash: plan.planHash,
    readiness: plan.readiness,
    nextAction: plan.nextAction,
    source: plan.source
  };
}

function buildPlan(
  planKind: TranscriptRetentionPlanKind,
  input: TranscriptRetentionPlanInput
): TranscriptRetentionPlan {
  const findings: TranscriptRetentionFinding[] = [];
  scanUnsafe(input, findings);
  validateGlobalPolicy(input, findings);

  const now = parseDate(input.now) ?? new Date("1970-01-01T00:00:00.000Z");
  const protectedSet = new Set(input.protectedTranscriptIds ?? []);
  const requestedIds = unique(input.requestedTranscriptIds ?? []);
  const records = normalizeRecords(input.transcripts ?? [], {
    findings,
    now,
    protectedSet,
    maxRetainDays: input.maxRetainDays ?? maxDefaultRetainDays
  });

  const eligibleDeleteIds = records
    .filter((record) => record.eligibleForDelete)
    .map((record) => record.transcriptId);
  const exportSummaryIds = records
    .filter(
      (record) =>
        (requestedIds.length === 0 ||
          requestedIds.includes(record.transcriptId)) &&
        record.eligibleForSummaryExport
    )
    .map((record) => record.transcriptId);
  const protectedTranscriptIds = records
    .filter((record) => record.protected)
    .map((record) => record.transcriptId);
  if (planKind === "delete") {
    validateDeleteRequest(records, requestedIds, findings);
  }
  if (planKind === "export") {
    validateExportRequest(records, requestedIds, findings);
  }

  const safeFindings = withIds(uniqueFindings(findings));
  const blockerCount = safeFindings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = safeFindings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: TranscriptRetentionPlanStatus =
    records.length === 0 && blockerCount === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "ready";
  const planId =
    input.idGenerator?.() ??
    `${planKind}-transcript-plan-${hashPrefix(
      stableStringify({
        planKind,
        records,
        requestedIds,
        createdAt: input.createdAt
      })
    )}`;
  const readiness = buildReadiness({
    status,
    planKind,
    requestedIds,
    exportSummaryIds
  });
  const planBase = {
    planKind,
    status,
    planId,
    transcriptCount: records.length,
    eligibleDeleteIds: status === "blocked" ? [] : eligibleDeleteIds,
    protectedTranscriptIds,
    exportSummaryIds: status === "blocked" ? [] : exportSummaryIds,
    deleteRequestedIds: requestedIds,
    deleteDryRunOnly: true as const,
    bulkDeleteDisabled: true as const,
    singleTranscriptDeleteCommand: "tauri_delete_transcript_record" as const,
    singleTranscriptDeleteCommandAvailable:
      planKind === "delete" &&
      status !== "blocked" &&
      requestedIds.length === 1 &&
      eligibleDeleteIds.includes(requestedIds[0] ?? ""),
    summaryOnly: true as const,
    rawExportIncluded: false as const,
    cloudUploadIncluded: false as const,
    telemetryUploadIncluded: false as const,
    records: status === "blocked" ? [] : records,
    findings: safeFindings,
    blockerCount,
    warningCount,
    findingCount: safeFindings.length,
    readiness,
    nextAction: nextAction(planKind, status),
    source: "runtime_transcript_retention_policy" as const
  };
  const planHash = hashPrefix(stableStringify(planBase));
  return { ...planBase, planHash };
}

function normalizeRecords(
  inputs: TranscriptRetentionPlanInputRecord[],
  context: {
    findings: TranscriptRetentionFinding[];
    now: Date;
    protectedSet: Set<string>;
    maxRetainDays: number;
  }
): TranscriptRetentionRecordSummary[] {
  const seen = new Set<string>();
  const records: TranscriptRetentionRecordSummary[] = [];
  for (const input of inputs) {
    const record = normalizeRecord(input, context);
    if (!record) {
      continue;
    }
    if (seen.has(record.transcriptId)) {
      context.findings.push(
        blocker("schema", "DUPLICATE_TRANSCRIPT_ID", record.transcriptId)
      );
      continue;
    }
    seen.add(record.transcriptId);
    records.push(record);
  }
  return records.sort((a, b) => a.transcriptId.localeCompare(b.transcriptId));
}

function normalizeRecord(
  input: TranscriptRetentionPlanInputRecord,
  context: {
    findings: TranscriptRetentionFinding[];
    now: Date;
    protectedSet: Set<string>;
    maxRetainDays: number;
  }
): TranscriptRetentionRecordSummary | undefined {
  const raw = input as Record<string, unknown>;
  const summary = isTranscriptRecord(input)
    ? summarizeTranscriptRecord(input)
    : (input as Partial<TranscriptSummary>);
  const transcriptId = asString(summary.transcriptId ?? raw.transcriptId);
  if (!transcriptId) {
    context.findings.push(blocker("schema", "MISSING_TRANSCRIPT_ID"));
    return undefined;
  }
  const retentionPolicy = isRecord(raw.retentionPolicy)
    ? (raw.retentionPolicy as Partial<TranscriptRetentionPolicy>)
    : undefined;
  const retainDays = asNumber(
    summary.retainDays ?? retentionPolicy?.retainDays
  );
  const exportAllowed = asBoolean(
    summary.exportAllowed ?? retentionPolicy?.exportAllowed
  );
  const deleteAllowed = asBoolean(
    summary.deleteAllowed ?? retentionPolicy?.deleteAllowed
  );
  const tombstoneOnDelete = asBoolean(
    summary.tombstoneOnDelete ?? retentionPolicy?.tombstoneOnDelete
  );
  const rawRetentionDays = asNumber(
    summary.rawRetentionDays ?? retentionPolicy?.rawRetentionDays
  );
  const redactedRetentionDays = asNumber(raw.redactedRetentionDays);
  if (retainDays === undefined || !Number.isFinite(retainDays)) {
    context.findings.push(
      blocker("retention", "MISSING_RETAIN_DAYS", transcriptId)
    );
    return undefined;
  }
  if (
    retainDays < 0 ||
    (rawRetentionDays !== undefined && rawRetentionDays < 0)
  ) {
    context.findings.push(
      blocker("retention", "NEGATIVE_RETENTION_DAYS", transcriptId)
    );
  }
  if (retainDays > context.maxRetainDays) {
    context.findings.push(
      blocker("retention", "RETENTION_DAYS_TOO_LARGE", transcriptId)
    );
  }
  if (
    exportAllowed === undefined ||
    deleteAllowed === undefined ||
    tombstoneOnDelete === undefined
  ) {
    context.findings.push(
      blocker("retention", "INCOMPLETE_RETENTION_POLICY", transcriptId)
    );
  }

  const createdAt = isTranscriptRecord(input)
    ? input.createdAt
    : asString(raw.createdAt);
  const ageDays = computeAgeDays(createdAt, context.now);
  if (createdAt !== undefined && ageDays === undefined) {
    context.findings.push(
      warning("retention", "INVALID_CREATED_AT", transcriptId)
    );
  }
  const warningCodes = unique([
    ...(summary.warningCodes ?? []),
    ...stringArray(raw.warningCodes)
  ]);
  const protectedTranscript =
    Boolean(raw.protected) || context.protectedSet.has(transcriptId);
  if (protectedTranscript) {
    context.findings.push(
      warning("delete", "PROTECTED_TRANSCRIPT_SKIPPED", transcriptId)
    );
  }
  const eligibleForDelete =
    !protectedTranscript &&
    deleteAllowed === true &&
    ageDays !== undefined &&
    ageDays >= retainDays;

  return {
    transcriptId,
    sessionId: asString(raw.sessionId),
    sourceKind: summary.sourceKind,
    visibility: summary.visibility,
    createdAt,
    ageDays,
    chunkCount: asNumber(summary.chunkCount) ?? 0,
    byteCount: asNumber(summary.byteCount) ?? 0,
    lineCount: asNumber(summary.lineCount) ?? 0,
    rawAvailableChunkCount: asNumber(summary.rawAvailableChunkCount) ?? 0,
    redactedFieldCount: asNumber(summary.redactedFieldCount) ?? 0,
    secretMarkerCount: asNumber(summary.secretMarkerCount) ?? 0,
    retainDays,
    ...(rawRetentionDays !== undefined ? { rawRetentionDays } : {}),
    ...(redactedRetentionDays !== undefined ? { redactedRetentionDays } : {}),
    exportAllowed: exportAllowed === true,
    deleteAllowed: deleteAllowed === true,
    tombstoneOnDelete: tombstoneOnDelete === true,
    protected: protectedTranscript,
    eligibleForDelete,
    eligibleForSummaryExport: exportAllowed === true,
    warningCodes,
    hashPrefix:
      asString(summary.hash) ??
      asString(raw.transcriptHash) ??
      asString(raw.hashPrefix)
  };
}

function validateGlobalPolicy(
  input: TranscriptRetentionPlanInput,
  findings: TranscriptRetentionFinding[]
): void {
  if (input.exportMode === "raw") {
    findings.push(blocker("export", "RAW_EXPORT_BLOCKED"));
  }
  if (input.allowBulkDeleteExecution) {
    findings.push(blocker("delete", "BULK_DELETE_EXECUTION_BLOCKED"));
  }
  if (input.recursiveDelete) {
    findings.push(blocker("delete", "RECURSIVE_DELETE_BLOCKED"));
  }
  if (input.deletePath || input.exportPath) {
    findings.push(blocker("path", "PATH_BASED_OPERATION_BLOCKED"));
  }
  if (input.cloudUploadTarget) {
    findings.push(blocker("upload", "CLOUD_UPLOAD_BLOCKED"));
  }
  if (input.telemetryUploadTarget) {
    findings.push(blocker("upload", "TELEMETRY_UPLOAD_BLOCKED"));
  }
}

function validateDeleteRequest(
  records: TranscriptRetentionRecordSummary[],
  requestedIds: string[],
  findings: TranscriptRetentionFinding[]
): void {
  if (requestedIds.length === 0) {
    findings.push(warning("delete", "DELETE_PLAN_DRY_RUN_ONLY"));
  }
  const byId = new Map(records.map((record) => [record.transcriptId, record]));
  for (const id of requestedIds) {
    const record = byId.get(id);
    if (!record) {
      findings.push(blocker("delete", "DELETE_TRANSCRIPT_NOT_FOUND", id));
      continue;
    }
    if (record.protected) {
      findings.push(blocker("delete", "PROTECTED_TRANSCRIPT_BLOCKED", id));
    }
    if (!record.deleteAllowed) {
      findings.push(blocker("delete", "DELETE_NOT_ALLOWED", id));
    }
  }
}

function validateExportRequest(
  records: TranscriptRetentionRecordSummary[],
  requestedIds: string[],
  findings: TranscriptRetentionFinding[]
): void {
  const byId = new Map(records.map((record) => [record.transcriptId, record]));
  for (const id of requestedIds) {
    const record = byId.get(id);
    if (!record) {
      findings.push(blocker("export", "EXPORT_TRANSCRIPT_NOT_FOUND", id));
      continue;
    }
    if (!record.exportAllowed) {
      findings.push(blocker("export", "EXPORT_NOT_ALLOWED", id));
    }
  }
}

function buildReadiness(input: {
  status: TranscriptRetentionPlanStatus;
  planKind: TranscriptRetentionPlanKind;
  requestedIds: string[];
  exportSummaryIds: string[];
}): TranscriptRetentionReadiness {
  const safe = input.status !== "blocked";
  return {
    canPreviewRetentionPlan: safe,
    canPreviewExportSummary:
      safe && input.planKind === "export" && input.exportSummaryIds.length > 0,
    canPreviewDeletePlan: safe && input.planKind === "delete",
    canRequestSingleTranscriptDelete:
      safe && input.planKind === "delete" && input.requestedIds.length === 1,
    canExecuteBulkDelete: false,
    canRecursiveDelete: false,
    canDeleteOutsideTranscriptStore: false,
    canExportRawTranscript: false,
    canUploadCloud: false,
    canUploadTelemetry: false,
    canWriteEventStore: false,
    canWriteWorkspace: false,
    canExecuteCommand: false,
    canRunShell: false,
    canApplyPatch: false,
    canRollback: false,
    canCommitGit: false,
    canPushGit: false,
    appCanExecute: false
  };
}

function nextAction(
  planKind: TranscriptRetentionPlanKind,
  status: TranscriptRetentionPlanStatus
): string {
  if (status === "blocked") {
    return "Fix blocked retention/export/delete policy inputs before preview.";
  }
  if (status === "empty") {
    return "Provide transcript summaries to build a retention policy preview.";
  }
  if (planKind === "export") {
    return "Review summary-only export plan; raw export remains disabled.";
  }
  if (planKind === "delete") {
    return "Review dry-run delete plan; bulk delete execution remains disabled.";
  }
  return "Review eligible transcript ids and retention policy summary.";
}

function scanUnsafe(
  value: unknown,
  findings: TranscriptRetentionFinding[],
  path: string[] = []
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafe(item, findings, [...path, String(index)])
    );
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const lower = key.toLowerCase();
      if (forbiddenFieldKeys.has(lower)) {
        findings.push(
          blocker(classifyForbiddenKey(lower), `${key}_FIELD_REJECTED`)
        );
      }
      scanUnsafe(nested, findings, [...path, key]);
    }
    return;
  }
  if (typeof value === "string") {
    for (const marker of unsafeStringPatterns) {
      if (marker.pattern.test(value)) {
        findings.push(blocker("secret", marker.code));
      }
    }
  }
}

function classifyForbiddenKey(key: string): TranscriptRetentionFindingKind {
  if (key.includes("path")) {
    return "path";
  }
  if (key.includes("secret") || key.includes("token") || key.includes("key")) {
    return "secret";
  }
  if (key.includes("upload")) {
    return "upload";
  }
  if (
    key.includes("command") ||
    key.includes("apply") ||
    key.includes("rollback") ||
    key.includes("permission") ||
    key.includes("native") ||
    key.includes("desktop") ||
    key.includes("tools")
  ) {
    return "execution";
  }
  if (key.includes("raw")) {
    return "export";
  }
  return "schema";
}

function isTranscriptRecord(value: unknown): value is TranscriptRecord {
  return (
    isRecord(value) &&
    value.schemaVersion === "transcript_record.v1" &&
    Array.isArray(value.chunks) &&
    isRecord(value.retentionPolicy) &&
    isRecord(value.redactionSummary)
  );
}

function computeAgeDays(
  createdAt: string | undefined,
  now: Date
): number | undefined {
  const created = parseDate(createdAt);
  if (!created) {
    return undefined;
  }
  return Math.floor((now.getTime() - created.getTime()) / millisecondsPerDay);
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? safeText(value)
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map(safeText)
    : [];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function uniqueFindings(
  findings: TranscriptRetentionFinding[]
): TranscriptRetentionFinding[] {
  const seen = new Set<string>();
  const uniqueValues: TranscriptRetentionFinding[] = [];
  for (const finding of findings) {
    const key = `${finding.kind}:${finding.severity}:${finding.code}:${
      finding.transcriptId ?? ""
    }`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueValues.push(finding);
  }
  return uniqueValues;
}

function withIds(
  findings: TranscriptRetentionFinding[]
): TranscriptRetentionFinding[] {
  return findings.map((finding, index) => ({
    ...finding,
    findingId: `transcript-retention-finding-${index + 1}`
  }));
}

function blocker(
  kind: TranscriptRetentionFindingKind,
  code: string,
  transcriptId?: string | undefined
): TranscriptRetentionFinding {
  return {
    findingId: "",
    kind,
    severity: "blocker",
    code: safeText(code),
    safeMessage: safeMessage(code),
    ...(transcriptId !== undefined
      ? { transcriptId: safeText(transcriptId) }
      : {})
  };
}

function warning(
  kind: TranscriptRetentionFindingKind,
  code: string,
  transcriptId?: string | undefined
): TranscriptRetentionFinding {
  return {
    findingId: "",
    kind,
    severity: "warning",
    code: safeText(code),
    safeMessage: safeMessage(code),
    ...(transcriptId !== undefined
      ? { transcriptId: safeText(transcriptId) }
      : {})
  };
}

function safeMessage(code: string): string {
  return code
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function safeText(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\bAuthorization\s*[:=]\s*[^\r\n]+/gi, "Authorization: [REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{12,}\b/gi, "Bearer [REDACTED]")
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi,
      "[REDACTED_PRIVATE_KEY]"
    )
    .slice(0, 500);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashPrefix(value: string, length = 16): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").repeat(2).slice(0, length);
}
