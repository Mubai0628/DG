export type TranscriptInput = Record<string, unknown> | string | unknown;

export type TranscriptChunkKind =
  | "stdout"
  | "stderr"
  | "command_summary"
  | "model_summary"
  | "tool_summary"
  | "file_operation_summary"
  | "redaction_notice";

export type TranscriptSourceKind =
  | "shell_safe_lane"
  | "git_safe_lane"
  | "approved_apply"
  | "approved_rollback"
  | "mcp_readonly_tool"
  | "desktop_action"
  | "future_arbitrary_shell"
  | "manual_test";

export type TranscriptVisibility =
  | "summary_only"
  | "redacted_preview"
  | "raw_available_gated";

export type TranscriptSessionRef = {
  sessionId: string;
  mode: string;
  workspaceRootRef?: string | undefined;
};

export type TranscriptChunk = {
  chunkId: string;
  kind: TranscriptChunkKind;
  summary: string;
  byteCount: number;
  lineCount: number;
  redacted: boolean;
  rawAvailable: boolean;
  hashPrefix?: string | undefined;
  warningCodes: string[];
};

export type TranscriptRedactionSummary = {
  scanned: boolean;
  redactedFieldCount: number;
  secretMarkerCount: number;
  controlCharCount: number;
  binaryChunkCount: number;
  warningCodes: string[];
};

export type TranscriptRetentionPolicy = {
  retainDays: number;
  rawRetentionDays?: number | undefined;
  exportAllowed: boolean;
  deleteAllowed: boolean;
  tombstoneOnDelete: boolean;
};

export type TranscriptHashes = {
  recordHash: string;
  redactedOutputHash: string;
};

export type TranscriptRecord = {
  schemaVersion: "transcript_record.v1";
  transcriptId: string;
  sessionId: string;
  sessionRef: TranscriptSessionRef;
  workspaceRootRef?: string | undefined;
  mode: string;
  sourceKind: TranscriptSourceKind;
  visibility: TranscriptVisibility;
  rawOptIn: boolean;
  chunks: TranscriptChunk[];
  redactionSummary: TranscriptRedactionSummary;
  retentionPolicy: TranscriptRetentionPolicy;
  hashes: TranscriptHashes;
  createdAt: string;
  source: "runtime_transcript_store_schema";
};

export type TranscriptFindingSeverity = "blocker" | "warning";

export type TranscriptFindingKind =
  | "schema"
  | "raw_field"
  | "secret"
  | "redaction"
  | "retention"
  | "chunk"
  | "readiness";

export type TranscriptFinding = {
  findingId: string;
  kind: TranscriptFindingKind;
  severity: TranscriptFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type TranscriptReadiness = {
  canPersistTranscript: boolean;
  canViewRawTranscript: boolean;
  canExportRawTranscript: boolean;
  canExecuteCommand: false;
  canRunShell: false;
  canApplyPatch: false;
  canDeleteFiles: false;
  canCommitGit: false;
  canPushGit: false;
  canStartAutonomousLoop: false;
  appCanExecute: false;
};

export type TranscriptValidationStatus = "parsed" | "warning" | "blocked";

export type TranscriptSummary = {
  transcriptId?: string | undefined;
  status: TranscriptValidationStatus;
  sourceKind?: TranscriptSourceKind | undefined;
  visibility?: TranscriptVisibility | undefined;
  mode?: string | undefined;
  chunkCount: number;
  rawAvailableChunkCount: number;
  byteCount: number;
  lineCount: number;
  redactedFieldCount: number;
  secretMarkerCount: number;
  controlCharCount: number;
  binaryChunkCount: number;
  retainDays?: number | undefined;
  rawRetentionDays?: number | undefined;
  exportAllowed: boolean;
  deleteAllowed: boolean;
  tombstoneOnDelete: boolean;
  warningCodes: string[];
  hash?: string | undefined;
};

export type TranscriptValidationResult = {
  status: TranscriptValidationStatus;
  transcript?: TranscriptRecord | undefined;
  summary: TranscriptSummary;
  findings: TranscriptFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  normalizedHash: string;
  readiness: TranscriptReadiness;
  nextAction: string;
  source: "runtime_transcript_store_schema";
};

export type TranscriptValidationOptions = {
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const supportedSchemaVersion = "transcript_record.v1" as const;
const maxChunkSummaryLength = 5000;
const maxChunkByteCount = 1_000_000;
const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authHeaderField = ["Author", "ization"].join("");
const reasoningCamelField = ["reasoning", "Content"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");

const allowedSourceKinds = new Set<TranscriptSourceKind>([
  "shell_safe_lane",
  "git_safe_lane",
  "approved_apply",
  "approved_rollback",
  "mcp_readonly_tool",
  "desktop_action",
  "future_arbitrary_shell",
  "manual_test"
]);

const allowedVisibilities = new Set<TranscriptVisibility>([
  "summary_only",
  "redacted_preview",
  "raw_available_gated"
]);

const allowedChunkKinds = new Set<TranscriptChunkKind>([
  "stdout",
  "stderr",
  "command_summary",
  "model_summary",
  "tool_summary",
  "file_operation_summary",
  "redaction_notice"
]);

const forbiddenFieldKeys = new Set(
  [
    apiKeyField,
    authHeaderField,
    "bearer",
    "token",
    "secret",
    "password",
    rawPrefix + "Prompt",
    rawPrefix + "Response",
    reasoningCamelField,
    reasoningSnakeField,
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    "clipboardContent",
    "privateKey",
    "envValue",
    "processEnvValue"
  ].map((key) => key.toLowerCase())
);

const executionAttemptKeys = new Set(
  [
    "canExecuteCommand",
    "canRunShell",
    "canApplyPatch",
    "canDeleteFiles",
    "canCommitGit",
    "canPushGit",
    "canStartAutonomousLoop",
    "appCanExecute",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "applyNow",
    "rollbackNow",
    "deleteFiles",
    "recursiveDelete",
    "autonomousLoop",
    "fullAccessExecution"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  { code: "API_KEY_MARKER", pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/ },
  { code: "AUTHORIZATION_MARKER", pattern: /\bAuthorization\s*[:=]/i },
  { code: "BEARER_TOKEN_MARKER", pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/ },
  { code: "PRIVATE_KEY_MARKER", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { code: "RAW_PROMPT_MARKER", pattern: /\brawPrompt\b|raw prompt/i },
  { code: "RAW_RESPONSE_MARKER", pattern: /\brawResponse\b|raw response/i },
  {
    code: "REASONING_CONTENT_MARKER",
    pattern: /\breasoning_content\b|\breasoningContent\b|reasoning content/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

// eslint-disable-next-line no-control-regex
const controlCharPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
// eslint-disable-next-line no-control-regex
const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/;

export function parseTranscriptRecord(
  input: TranscriptInput,
  options: TranscriptValidationOptions = {}
): TranscriptValidationResult {
  return validateTranscriptRecord(input, options);
}

export function validateTranscriptRecord(
  input: TranscriptInput,
  options: TranscriptValidationOptions = {}
): TranscriptValidationResult {
  const findings: TranscriptFinding[] = [];
  const parsed = parseInput(input, findings);
  if (!isRecord(parsed)) {
    return resultFrom(undefined, findings);
  }

  findings.push(...findForbiddenFields(parsed));
  findings.push(...findUnsafeStringMarkers(parsed));
  findings.push(...validateTopLevel(parsed));
  findings.push(...validateExecutionAttempts(parsed));

  const provisional = buildTranscript(parsed, options);
  if (provisional) {
    findings.push(...validateChunks(provisional));
    findings.push(...validateRetention(provisional));
    findings.push(...validateRawGate(provisional));
  }

  if (hasBlockers(findings) || !provisional) {
    return resultFrom(undefined, findings);
  }

  return resultFrom(finalizeTranscript(provisional), findings);
}

export function normalizeTranscriptRecord(
  input: TranscriptInput,
  options: TranscriptValidationOptions = {}
): TranscriptRecord {
  const result = validateTranscriptRecord(input, options);
  if (!result.transcript) {
    throw new Error("Transcript record is blocked");
  }
  return result.transcript;
}

export function summarizeTranscriptRecord(
  record: TranscriptRecord
): TranscriptSummary {
  const totals = record.chunks.reduce(
    (summary, chunk) => ({
      byteCount: summary.byteCount + chunk.byteCount,
      lineCount: summary.lineCount + chunk.lineCount,
      rawAvailableChunkCount:
        summary.rawAvailableChunkCount + (chunk.rawAvailable ? 1 : 0)
    }),
    { byteCount: 0, lineCount: 0, rawAvailableChunkCount: 0 }
  );

  return {
    transcriptId: record.transcriptId,
    status: "parsed",
    sourceKind: record.sourceKind,
    visibility: record.visibility,
    mode: record.mode,
    chunkCount: record.chunks.length,
    rawAvailableChunkCount: totals.rawAvailableChunkCount,
    byteCount: totals.byteCount,
    lineCount: totals.lineCount,
    redactedFieldCount: record.redactionSummary.redactedFieldCount,
    secretMarkerCount: record.redactionSummary.secretMarkerCount,
    controlCharCount: record.redactionSummary.controlCharCount,
    binaryChunkCount: record.redactionSummary.binaryChunkCount,
    retainDays: record.retentionPolicy.retainDays,
    rawRetentionDays: record.retentionPolicy.rawRetentionDays,
    exportAllowed: record.retentionPolicy.exportAllowed,
    deleteAllowed: record.retentionPolicy.deleteAllowed,
    tombstoneOnDelete: record.retentionPolicy.tombstoneOnDelete,
    warningCodes: unique([
      ...record.redactionSummary.warningCodes,
      ...record.chunks.flatMap((chunk) => chunk.warningCodes)
    ]),
    hash: record.hashes.recordHash
  };
}

function buildTranscript(
  value: Record<string, unknown>,
  options: TranscriptValidationOptions
): TranscriptRecord | undefined {
  const chunksInput = asArray(value.chunks);
  const redactionInput = asRecord(value.redactionSummary);
  const retentionInput = asRecord(value.retentionPolicy);
  if (!chunksInput || !redactionInput || !retentionInput) {
    return undefined;
  }

  const transcriptId =
    asString(value.transcriptId) ??
    options.idGenerator?.() ??
    `transcript-${hashPrefix(stableStringify(value), 12)}`;
  const createdAt =
    asString(value.createdAt) ??
    options.createdAt ??
    "1970-01-01T00:00:00.000Z";
  const workspaceRootRef = asString(value.workspaceRootRef);
  const mode = asString(value.mode) ?? "";
  const sessionId = asString(value.sessionId) ?? "";

  const chunks = chunksInput
    .map((chunk, index) => normalizeChunk(chunk, index))
    .filter((chunk): chunk is TranscriptChunk => Boolean(chunk));

  return {
    schemaVersion: supportedSchemaVersion,
    transcriptId,
    sessionId,
    sessionRef: { sessionId, mode, workspaceRootRef },
    workspaceRootRef,
    mode,
    sourceKind: asString(value.sourceKind) as TranscriptSourceKind,
    visibility: asString(value.visibility) as TranscriptVisibility,
    rawOptIn: Boolean(value.rawOptIn),
    chunks,
    redactionSummary: {
      scanned: Boolean(redactionInput.scanned),
      redactedFieldCount: asNumber(redactionInput.redactedFieldCount) ?? 0,
      secretMarkerCount: asNumber(redactionInput.secretMarkerCount) ?? 0,
      controlCharCount: asNumber(redactionInput.controlCharCount) ?? 0,
      binaryChunkCount: asNumber(redactionInput.binaryChunkCount) ?? 0,
      warningCodes: asStringArray(redactionInput.warningCodes)
    },
    retentionPolicy: {
      retainDays: asNumber(retentionInput.retainDays) ?? Number.NaN,
      rawRetentionDays: asNumber(retentionInput.rawRetentionDays),
      exportAllowed: Boolean(retentionInput.exportAllowed),
      deleteAllowed: Boolean(retentionInput.deleteAllowed),
      tombstoneOnDelete: Boolean(retentionInput.tombstoneOnDelete)
    },
    hashes: { recordHash: "", redactedOutputHash: "" },
    createdAt,
    source: "runtime_transcript_store_schema"
  };
}

function normalizeChunk(
  value: unknown,
  index: number
): TranscriptChunk | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const originalSummary = asString(value.summary) ?? "";
  const summary = sanitizeSummary(originalSummary);
  const warningCodes = asStringArray(value.warningCodes);
  if (containsControlOrAnsi(originalSummary)) {
    warningCodes.push("CONTROL_CHARS_REDACTED");
  }
  if (value.binary === true) {
    warningCodes.push("BINARY_OUTPUT_SUMMARY_ONLY");
  }
  return {
    chunkId: asString(value.chunkId) ?? `chunk-${index + 1}`,
    kind: asString(value.kind) as TranscriptChunkKind,
    summary,
    byteCount: asNumber(value.byteCount) ?? summary.length,
    lineCount: asNumber(value.lineCount) ?? countLines(summary),
    redacted: value.redacted !== false,
    rawAvailable: Boolean(value.rawAvailable),
    hashPrefix: asString(value.hashPrefix),
    warningCodes: unique(warningCodes)
  };
}

function finalizeTranscript(record: TranscriptRecord): TranscriptRecord {
  const redactedOutputHash = hashPrefix(
    stableStringify(
      record.chunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        kind: chunk.kind,
        summary: chunk.summary,
        byteCount: chunk.byteCount,
        lineCount: chunk.lineCount,
        warningCodes: chunk.warningCodes
      }))
    )
  );
  const recordHash = hashPrefix(
    stableStringify({
      ...record,
      hashes: { recordHash: "", redactedOutputHash }
    })
  );
  return { ...record, hashes: { recordHash, redactedOutputHash } };
}

function validateTopLevel(value: Record<string, unknown>): TranscriptFinding[] {
  const findings: TranscriptFinding[] = [];
  if (value.schemaVersion !== supportedSchemaVersion) {
    findings.push(blocker("schema", "UNSUPPORTED_SCHEMA_VERSION"));
  }
  if (!asString(value.transcriptId)) {
    findings.push(warning("schema", "MISSING_TRANSCRIPT_ID"));
  }
  if (!asString(value.sessionId)) {
    findings.push(blocker("schema", "MISSING_SESSION_ID"));
  }
  if (!asString(value.mode)) {
    findings.push(blocker("schema", "MISSING_MODE"));
  }
  if (
    !allowedSourceKinds.has(asString(value.sourceKind) as TranscriptSourceKind)
  ) {
    findings.push(blocker("schema", "UNKNOWN_SOURCE_KIND"));
  }
  if (
    !allowedVisibilities.has(asString(value.visibility) as TranscriptVisibility)
  ) {
    findings.push(blocker("schema", "UNKNOWN_VISIBILITY"));
  }
  if (!Array.isArray(value.chunks) || value.chunks.length === 0) {
    findings.push(blocker("chunk", "MISSING_CHUNKS"));
  }
  if (!isRecord(value.redactionSummary)) {
    findings.push(blocker("redaction", "MISSING_REDACTION_SUMMARY"));
  }
  if (!isRecord(value.retentionPolicy)) {
    findings.push(blocker("retention", "MISSING_RETENTION_POLICY"));
  }
  return findings;
}

function validateChunks(record: TranscriptRecord): TranscriptFinding[] {
  const findings: TranscriptFinding[] = [];
  for (const chunk of record.chunks) {
    const path = `chunks.${chunk.chunkId}`;
    if (!allowedChunkKinds.has(chunk.kind)) {
      findings.push(blocker("chunk", "UNKNOWN_CHUNK_KIND", path));
    }
    if (!chunk.summary.trim()) {
      findings.push(blocker("chunk", "EMPTY_CHUNK_SUMMARY", path));
    }
    if (chunk.summary.length > maxChunkSummaryLength) {
      findings.push(blocker("chunk", "HUGE_CHUNK_SUMMARY", path));
    }
    if (chunk.byteCount > maxChunkByteCount) {
      findings.push(blocker("chunk", "HUGE_CHUNK_BYTES", path));
    }
    if (chunk.warningCodes.includes("CONTROL_CHARS_REDACTED")) {
      findings.push(warning("chunk", "CONTROL_CHARS_REDACTED", path));
    }
    if (chunk.warningCodes.includes("BINARY_OUTPUT_SUMMARY_ONLY")) {
      findings.push(warning("chunk", "BINARY_OUTPUT_SUMMARY_ONLY", path));
    }
  }
  return findings;
}

function validateRetention(record: TranscriptRecord): TranscriptFinding[] {
  const findings: TranscriptFinding[] = [];
  if (!Number.isFinite(record.retentionPolicy.retainDays)) {
    findings.push(blocker("retention", "MISSING_RETAIN_DAYS"));
  } else if (record.retentionPolicy.retainDays < 0) {
    findings.push(blocker("retention", "NEGATIVE_RETAIN_DAYS"));
  }
  if (
    record.retentionPolicy.rawRetentionDays !== undefined &&
    record.retentionPolicy.rawRetentionDays < 0
  ) {
    findings.push(blocker("retention", "NEGATIVE_RAW_RETAIN_DAYS"));
  }
  if (!record.retentionPolicy.deleteAllowed) {
    findings.push(warning("retention", "DELETE_POLICY_DISABLED"));
  }
  return findings;
}

function validateRawGate(record: TranscriptRecord): TranscriptFinding[] {
  const findings: TranscriptFinding[] = [];
  const hasRawAvailable =
    record.visibility === "raw_available_gated" ||
    record.chunks.some((chunk) => chunk.rawAvailable || !chunk.redacted);
  if (!hasRawAvailable) {
    return findings;
  }
  if (record.visibility !== "raw_available_gated") {
    findings.push(blocker("raw_field", "RAW_CHUNK_REQUIRES_RAW_VISIBILITY"));
  }
  if (!record.rawOptIn) {
    findings.push(blocker("raw_field", "RAW_AVAILABLE_REQUIRES_OPT_IN"));
  }
  if (!record.redactionSummary.scanned) {
    findings.push(blocker("redaction", "RAW_AVAILABLE_REQUIRES_SCAN"));
  }
  if (record.retentionPolicy.rawRetentionDays === undefined) {
    findings.push(blocker("retention", "RAW_AVAILABLE_REQUIRES_RAW_RETENTION"));
  }
  return findings;
}

function validateExecutionAttempts(value: unknown): TranscriptFinding[] {
  const findings: TranscriptFinding[] = [];
  walk(value, (key, nested, path) => {
    if (executionAttemptKeys.has(key.toLowerCase()) && nested === true) {
      findings.push(blocker("readiness", "EXECUTION_READINESS_REJECTED", path));
    }
  });
  return findings;
}

function findForbiddenFields(value: unknown): TranscriptFinding[] {
  const findings: TranscriptFinding[] = [];
  walk(value, (key, _nested, path) => {
    if (forbiddenFieldKeys.has(key.toLowerCase())) {
      findings.push(
        blocker("raw_field", `${toCode(key)}_FIELD_REJECTED`, path)
      );
    }
  });
  return findings;
}

function findUnsafeStringMarkers(value: unknown): TranscriptFinding[] {
  const findings: TranscriptFinding[] = [];
  walk(value, (_key, nested, path) => {
    if (typeof nested !== "string") {
      return;
    }
    for (const { code, pattern } of unsafeStringPatterns) {
      if (pattern.test(nested)) {
        findings.push(blocker("secret", code, path));
      }
    }
  });
  return findings;
}

function parseInput(
  input: TranscriptInput,
  findings: TranscriptFinding[]
): unknown {
  if (typeof input !== "string") {
    return input;
  }
  try {
    return JSON.parse(input);
  } catch {
    findings.push(blocker("schema", "INVALID_JSON"));
    return undefined;
  }
}

function resultFrom(
  transcript: TranscriptRecord | undefined,
  findings: TranscriptFinding[]
): TranscriptValidationResult {
  const safe = safeFindings(findings);
  const blockerCount = safe.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = safe.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: TranscriptValidationStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const summary = transcript
    ? { ...summarizeTranscriptRecord(transcript), status }
    : emptySummary(status, safe);
  const normalizedHash = transcript
    ? transcript.hashes.recordHash
    : hashPrefix(stableStringify({ status, findings: safe }));

  return {
    status,
    transcript,
    summary,
    findings: safe,
    blockerCount,
    warningCount,
    findingCount: safe.length,
    normalizedHash,
    readiness: {
      canPersistTranscript: Boolean(transcript) && blockerCount === 0,
      canViewRawTranscript:
        Boolean(transcript) &&
        blockerCount === 0 &&
        transcript?.visibility === "raw_available_gated" &&
        transcript.rawOptIn,
      canExportRawTranscript:
        Boolean(transcript) &&
        blockerCount === 0 &&
        transcript?.visibility === "raw_available_gated" &&
        transcript.rawOptIn &&
        transcript.retentionPolicy.exportAllowed,
      canExecuteCommand: false,
      canRunShell: false,
      canApplyPatch: false,
      canDeleteFiles: false,
      canCommitGit: false,
      canPushGit: false,
      canStartAutonomousLoop: false,
      appCanExecute: false
    },
    nextAction:
      status === "blocked"
        ? "Fix transcript schema blockers before persistence."
        : status === "warning"
          ? "Review transcript warnings before persistence."
          : "Transcript schema is ready for redacted-by-default storage.",
    source: "runtime_transcript_store_schema"
  };
}

function emptySummary(
  status: TranscriptValidationStatus,
  findings: TranscriptFinding[]
): TranscriptSummary {
  return {
    status,
    chunkCount: 0,
    rawAvailableChunkCount: 0,
    byteCount: 0,
    lineCount: 0,
    redactedFieldCount: 0,
    secretMarkerCount: 0,
    controlCharCount: 0,
    binaryChunkCount: 0,
    exportAllowed: false,
    deleteAllowed: false,
    tombstoneOnDelete: false,
    warningCodes: findings
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.code)
  };
}

function safeFindings(findings: TranscriptFinding[]): TranscriptFinding[] {
  return findings.map((finding, index) => ({
    ...finding,
    findingId: finding.findingId || `transcript-finding-${index + 1}`,
    safeMessage: finding.safeMessage || finding.code
  }));
}

function blocker(
  kind: TranscriptFindingKind,
  code: string,
  path?: string
): TranscriptFinding {
  return finding(kind, "blocker", code, path);
}

function warning(
  kind: TranscriptFindingKind,
  code: string,
  path?: string
): TranscriptFinding {
  return finding(kind, "warning", code, path);
}

function finding(
  kind: TranscriptFindingKind,
  severity: TranscriptFindingSeverity,
  code: string,
  path?: string
): TranscriptFinding {
  return {
    findingId: "",
    kind,
    severity,
    code,
    safeMessage: code
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/^\w/, (match) => match.toUpperCase()),
    path
  };
}

function walk(
  value: unknown,
  visitor: (key: string, nested: unknown, path: string) => void,
  path = ""
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, `${path}.${index}`));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    visitor(key, nested, nextPath);
    walk(nested, visitor, nextPath);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function hasBlockers(findings: TranscriptFinding[]): boolean {
  return findings.some((finding) => finding.severity === "blocker");
}

function sanitizeSummary(value: string): string {
  return value.replace(ansiPattern, "").replace(controlCharPattern, "");
}

function containsControlOrAnsi(value: string): boolean {
  return ansiPattern.test(value) || controlCharPattern.test(value);
}

function countLines(value: string): number {
  return value.length === 0 ? 0 : value.split(/\r\n|\r|\n/).length;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function toCode(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .toUpperCase();
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
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  return seeds
    .map((seed) => hashChunk(value, seed))
    .join("")
    .slice(0, length);
}

function hashChunk(value: string, seed: number): string {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
    hash ^= hash >>> 13;
  }
  hash ^= value.length;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 16;
  return (hash >>> 0).toString(16).padStart(8, "0");
}
