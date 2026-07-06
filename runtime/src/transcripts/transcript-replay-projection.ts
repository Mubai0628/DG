export const transcriptReplayEventTypes = [
  "transcript.record.created",
  "transcript.record.deleted",
  "transcript.record.exported_summary"
] as const;

export type TranscriptReplayEventType = (typeof transcriptReplayEventTypes)[number];

export type TranscriptReplayProjectionStatus =
  | "empty"
  | "projected"
  | "warning"
  | "blocked";

export type TranscriptReplayFindingSeverity = "blocker" | "warning";

export type TranscriptReplayFindingKind =
  | "schema"
  | "event"
  | "redaction"
  | "retention"
  | "raw_output"
  | "secret"
  | "execution";

export type TranscriptReplayFinding = {
  findingId: string;
  kind: TranscriptReplayFindingKind;
  severity: TranscriptReplayFindingSeverity;
  code: string;
  safeMessage: string;
};

export type TranscriptReplayEventSummary = {
  eventId: string;
  eventType: TranscriptReplayEventType;
  transcriptId: string;
  sourceKind?: string | undefined;
  chunkCount: number;
  byteCount: number;
  lineCount: number;
  redactedFieldCount: number;
  secretMarkerCount: number;
  retainDays?: number | undefined;
  rawRetentionDays?: number | undefined;
  exportAllowed?: boolean | undefined;
  deleteAllowed?: boolean | undefined;
  tombstoneOnDelete?: boolean | undefined;
  hashPrefix?: string | undefined;
  warningCodes: string[];
  summaryOnly: true;
  rawContentIncluded: false;
};

export type TranscriptReplayReadiness = {
  canProjectTranscriptReplay: boolean;
  canReplayCommand: false;
  canViewRawOutput: false;
  canWriteEventStore: false;
  canExecuteCommand: false;
  canRunShell: false;
  canExecuteGit: false;
  canApplyPatch: false;
  canRollback: false;
  appCanExecute: false;
};

export type TranscriptReplayProjectionInput = {
  events?: unknown[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type TranscriptReplayProjection = {
  status: TranscriptReplayProjectionStatus;
  projectionId: string;
  eventCount: number;
  createdCount: number;
  deletedCount: number;
  exportedSummaryCount: number;
  transcriptIds: string[];
  latestTranscriptSummary?: string | undefined;
  events: TranscriptReplayEventSummary[];
  findings: TranscriptReplayFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  projectionHash: string;
  readiness: TranscriptReplayReadiness;
  nextAction: string;
  source: "runtime_transcript_replay_projection";
};

const eventTypeSet = new Set<string>(transcriptReplayEventTypes);
const rawPrefix = "raw";
const reasoningPrefix = "reasoning";
const rawMarker = (suffix: string) => rawPrefix + suffix;
const reasoningMarker = (suffix: string) => reasoningPrefix + suffix;

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Output",
    rawPrefix + "Stdout",
    rawPrefix + "Stderr",
    rawPrefix + "Prompt",
    rawPrefix + "Response",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    reasoningMarker("Content"),
    reasoningMarker("_content"),
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
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
    "nativeBridge"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  { code: "API_KEY_MARKER", pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/i },
  { code: "AUTHORIZATION_MARKER", pattern: /\bAuthorization\s*[:=]/i },
  { code: "BEARER_TOKEN_MARKER", pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/i },
  { code: "PRIVATE_KEY_MARKER", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
  {
    code: "RAW_OUTPUT_MARKER",
    pattern: markerPattern(["raw output", rawMarker("Output")])
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: markerPattern(["raw prompt", rawMarker("Prompt")])
  },
  {
    code: "RAW_RESPONSE_MARKER",
    pattern: markerPattern(["raw response", rawMarker("Response")])
  },
  {
    code: "REASONING_CONTENT_MARKER",
    pattern: markerPattern([
      reasoningMarker("_content"),
      reasoningMarker("Content"),
      "reasoning content"
    ])
  }
];

export function buildTranscriptReplayProjection(
  input: TranscriptReplayProjectionInput = {}
): TranscriptReplayProjection {
  const findings: TranscriptReplayFinding[] = [];
  scanUnsafe(input, findings);
  const events = (input.events ?? [])
    .map((event) => normalizeEvent(event, findings))
    .filter((event): event is TranscriptReplayEventSummary => Boolean(event));
  const createdCount = events.filter(
    (event) => event.eventType === "transcript.record.created"
  ).length;
  const deletedCount = events.filter(
    (event) => event.eventType === "transcript.record.deleted"
  ).length;
  const exportedSummaryCount = events.filter(
    (event) => event.eventType === "transcript.record.exported_summary"
  ).length;
  const safeFindings = withIds(uniqueFindings(findings));
  const blockerCount = safeFindings.filter((finding) => finding.severity === "blocker")
    .length;
  const warningCount = safeFindings.filter((finding) => finding.severity === "warning")
    .length;
  const status: TranscriptReplayProjectionStatus =
    (input.events?.length ?? 0) === 0 && blockerCount === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "projected";
  const transcriptIds = unique(events.map((event) => event.transcriptId));
  const projectionId =
    input.idGenerator?.() ??
    `transcript-replay-${hashPrefix(
      stableStringify({ events, createdAt: input.createdAt })
    )}`;
  const base = {
    status,
    projectionId,
    eventCount: status === "blocked" ? 0 : events.length,
    createdCount: status === "blocked" ? 0 : createdCount,
    deletedCount: status === "blocked" ? 0 : deletedCount,
    exportedSummaryCount: status === "blocked" ? 0 : exportedSummaryCount,
    transcriptIds: status === "blocked" ? [] : transcriptIds,
    ...(status !== "blocked" && events.length > 0
      ? { latestTranscriptSummary: summarizeTranscriptEvent(events.at(-1) as TranscriptReplayEventSummary) }
      : {}),
    events: status === "blocked" ? [] : events,
    findings: safeFindings,
    blockerCount,
    warningCount,
    findingCount: safeFindings.length,
    readiness: readiness(status),
    nextAction: nextAction(status),
    source: "runtime_transcript_replay_projection" as const
  };
  return { ...base, projectionHash: hashPrefix(stableStringify(base)) };
}

export function summarizeTranscriptReplayProjection(
  projection: TranscriptReplayProjection
): Pick<
  TranscriptReplayProjection,
  | "status"
  | "projectionId"
  | "eventCount"
  | "createdCount"
  | "deletedCount"
  | "exportedSummaryCount"
  | "latestTranscriptSummary"
  | "blockerCount"
  | "warningCount"
  | "projectionHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: projection.status,
    projectionId: projection.projectionId,
    eventCount: projection.eventCount,
    createdCount: projection.createdCount,
    deletedCount: projection.deletedCount,
    exportedSummaryCount: projection.exportedSummaryCount,
    ...(projection.latestTranscriptSummary !== undefined
      ? { latestTranscriptSummary: projection.latestTranscriptSummary }
      : {}),
    blockerCount: projection.blockerCount,
    warningCount: projection.warningCount,
    projectionHash: projection.projectionHash,
    readiness: projection.readiness,
    nextAction: projection.nextAction,
    source: projection.source
  };
}

function normalizeEvent(
  value: unknown,
  findings: TranscriptReplayFinding[]
): TranscriptReplayEventSummary | undefined {
  if (!isRecord(value)) {
    findings.push(blocker("schema", "EVENT_NOT_OBJECT"));
    return undefined;
  }
  const eventType = asString(value.type ?? value.eventType);
  if (!eventType || !eventTypeSet.has(eventType)) {
    findings.push(blocker("event", "UNSUPPORTED_TRANSCRIPT_EVENT"));
    return undefined;
  }
  const payload = isRecord(value.payload) ? value.payload : value;
  if (payload.summaryOnly !== true) {
    findings.push(blocker("event", "TRANSCRIPT_EVENT_NOT_SUMMARY_ONLY"));
  }
  if (payload.rawContentIncluded !== false) {
    findings.push(blocker("raw_output", "RAW_CONTENT_FLAG_NOT_FALSE"));
  }
  const transcriptId = asString(payload.transcriptId);
  if (!transcriptId) {
    findings.push(blocker("event", "MISSING_TRANSCRIPT_ID"));
    return undefined;
  }
  const warningCodes = stringArray(payload.warningCodes);
  if (warningCodes.length > 0) {
    findings.push(warning("event", "TRANSCRIPT_EVENT_WARNINGS_PRESENT"));
  }
  return {
    eventId: asString(value.id ?? payload.eventId) ?? `event-${hashPrefix(transcriptId, 8)}`,
    eventType: eventType as TranscriptReplayEventType,
    transcriptId,
    sourceKind: asString(payload.sourceKind),
    chunkCount: asNumber(payload.chunkCount) ?? 0,
    byteCount: asNumber(payload.byteCount) ?? 0,
    lineCount: asNumber(payload.lineCount) ?? 0,
    redactedFieldCount: asNumber(payload.redactedFieldCount) ?? 0,
    secretMarkerCount: asNumber(payload.secretMarkerCount) ?? 0,
    retainDays: asNumber(payload.retainDays),
    rawRetentionDays: asNumber(payload.rawRetentionDays),
    exportAllowed: asBoolean(payload.exportAllowed),
    deleteAllowed: asBoolean(payload.deleteAllowed),
    tombstoneOnDelete: asBoolean(payload.tombstoneOnDelete),
    hashPrefix: asString(payload.transcriptHash ?? payload.hashPrefix ?? payload.exportHash),
    warningCodes,
    summaryOnly: true,
    rawContentIncluded: false
  };
}

function summarizeTranscriptEvent(event: TranscriptReplayEventSummary): string {
  const label =
    event.eventType === "transcript.record.created"
      ? "transcript record created"
      : event.eventType === "transcript.record.deleted"
        ? "transcript record deleted"
        : "transcript summary exported";
  return [
    `${label}: ${event.transcriptId}`,
    `${event.chunkCount} chunks`,
    `${event.redactedFieldCount} redactions`,
    event.hashPrefix !== undefined ? `hash ${event.hashPrefix.slice(0, 12)}` : undefined
  ]
    .filter((part): part is string => typeof part === "string")
    .join(" · ");
}

function readiness(status: TranscriptReplayProjectionStatus): TranscriptReplayReadiness {
  return {
    canProjectTranscriptReplay: status !== "blocked",
    canReplayCommand: false,
    canViewRawOutput: false,
    canWriteEventStore: false,
    canExecuteCommand: false,
    canRunShell: false,
    canExecuteGit: false,
    canApplyPatch: false,
    canRollback: false,
    appCanExecute: false
  };
}

function nextAction(status: TranscriptReplayProjectionStatus): string {
  if (status === "blocked") {
    return "Remove unsafe transcript event payload fields before replay projection.";
  }
  if (status === "empty") {
    return "Provide transcript summary events to project replay state.";
  }
  return "Review transcript summary replay; command replay remains disabled.";
}

function scanUnsafe(
  value: unknown,
  findings: TranscriptReplayFinding[]
): void {
  if (Array.isArray(value)) {
    value.forEach((item) => scanUnsafe(item, findings));
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const lower = key.toLowerCase();
      if (forbiddenFieldKeys.has(lower)) {
        findings.push(blocker(classifyForbiddenKey(lower), `${key}_FIELD_REJECTED`));
      }
      scanUnsafe(nested, findings);
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

function classifyForbiddenKey(key: string): TranscriptReplayFindingKind {
  if (key.includes("raw") || key === "stdout" || key === "stderr") {
    return "raw_output";
  }
  if (key.includes("secret") || key.includes("token") || key.includes("key")) {
    return "secret";
  }
  if (
    key.includes("command") ||
    key.includes("apply") ||
    key.includes("rollback") ||
    key.includes("permission") ||
    key.includes("desktop") ||
    key.includes("native")
  ) {
    return "execution";
  }
  return "schema";
}

function markerPattern(values: string[]): RegExp {
  return new RegExp(values.map(escapeRegExp).join("|"), "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map(safeText)
    : [];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function uniqueFindings(findings: TranscriptReplayFinding[]): TranscriptReplayFinding[] {
  const seen = new Set<string>();
  const out: TranscriptReplayFinding[] = [];
  for (const finding of findings) {
    const key = `${finding.kind}:${finding.severity}:${finding.code}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(finding);
    }
  }
  return out;
}

function withIds(findings: TranscriptReplayFinding[]): TranscriptReplayFinding[] {
  return findings.map((finding, index) => ({
    ...finding,
    findingId: `transcript-replay-finding-${index + 1}`
  }));
}

function blocker(
  kind: TranscriptReplayFindingKind,
  code: string
): TranscriptReplayFinding {
  return {
    findingId: "",
    kind,
    severity: "blocker",
    code: safeText(code),
    safeMessage: safeMessage(code)
  };
}

function warning(
  kind: TranscriptReplayFindingKind,
  code: string
): TranscriptReplayFinding {
  return {
    findingId: "",
    kind,
    severity: "warning",
    code: safeText(code),
    safeMessage: safeMessage(code)
  };
}

function safeMessage(code: string): string {
  return code.toLowerCase().replace(/_/g, " ");
}

function safeText(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\bAuthorization\s*[:=]\s*[^\r\n]+/gi, "Authorization: [REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{12,}\b/gi, "Bearer [REDACTED]")
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
