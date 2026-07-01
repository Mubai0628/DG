import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type { ProjectKnowledgeEntrySummary } from "./project-knowledge-store.js";

export type ProjectKnowledgeReplayEventType =
  | "project_knowledge.candidate_committed"
  | "project_knowledge.entry_committed"
  | "project_knowledge.entry_revoked"
  | "project_knowledge.entry_expired"
  | "project_knowledge.recall_used"
  | "project_knowledge.audit_warning";

export type ProjectKnowledgeReplayStatus =
  | "empty"
  | "replay_ready"
  | "warning"
  | "blocked";

export type ProjectKnowledgeReplaySeverity = "blocker" | "warning";

export type ProjectKnowledgeReplayFindingKind =
  | "schema"
  | "corrupt_event"
  | "raw_field"
  | "secret"
  | "execution"
  | "replay"
  | "redaction";

export type ProjectKnowledgeReplayFinding = {
  findingId: string;
  kind: ProjectKnowledgeReplayFindingKind;
  severity: ProjectKnowledgeReplaySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ProjectKnowledgeSummaryEventPayload = {
  entryId?: string | undefined;
  entryStatus?: string | undefined;
  reasonSummary?: string | undefined;
  projectKnowledgeCount?: number | undefined;
  recallSummary?: string | undefined;
  matchedEntryCount?: number | undefined;
  redactionAuditStatus?: string | undefined;
  auditStatus?: string | undefined;
  eventHash?: string | undefined;
  warningCodes: string[];
  summaryOnly: true;
  rawContentIncluded: false;
};

export type ProjectKnowledgeSummaryEvent = {
  schemaVersion: 1;
  id: string;
  ts: string;
  type: ProjectKnowledgeReplayEventType;
  taskId: "project-knowledge";
  payload: ProjectKnowledgeSummaryEventPayload;
  eventHash: string;
  summaryOnly: true;
  rawContentIncluded: false;
  source: "runtime_project_knowledge_events_replay_audit";
};

export type ProjectKnowledgeReplayEntryState = {
  entryId: string;
  status: "committed" | "revoked" | "expired" | "recalled";
  lastEventType: ProjectKnowledgeReplayEventType;
  eventHash?: string | undefined;
  warningCodes: string[];
};

export type ProjectKnowledgeReplayReadiness = {
  canReplayProjectKnowledge: boolean;
  canWriteProjectKnowledgeStore: false;
  canWriteEventStore: false;
  canPersistRawContent: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ProjectKnowledgeReplayProjection = {
  status: ProjectKnowledgeReplayStatus;
  replayId: string;
  eventCount: number;
  displayedEventCount: number;
  projectKnowledgeCount: number;
  committedCount: number;
  revokedCount: number;
  expiredCount: number;
  recallEventCount: number;
  auditWarningCount: number;
  latestSummary?: string | undefined;
  latestRecallSummary?: string | undefined;
  redactionAuditStatus: "ok" | "warning" | "blocked";
  entries: ProjectKnowledgeReplayEntryState[];
  events: ProjectKnowledgeSummaryEvent[];
  findings: ProjectKnowledgeReplayFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  replayHash: string;
  readiness: ProjectKnowledgeReplayReadiness;
  nextAction: string;
  source: "runtime_project_knowledge_events_replay_audit";
};

export type ProjectKnowledgeReplayInput = {
  events?: unknown[] | undefined;
  eventLines?: string | undefined;
  entries?: ProjectKnowledgeEntrySummary[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ProjectKnowledgeRedactionAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type ProjectKnowledgeRedactionAudit = {
  status: ProjectKnowledgeRedactionAuditStatus;
  auditId: string;
  recordCount: number;
  rawFieldDetectedCount: number;
  apiKeyLeakDetected: boolean;
  rawContentDetected: boolean;
  reasoningContentDetected: boolean;
  findings: ProjectKnowledgeReplayFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: ProjectKnowledgeReplayReadiness;
  nextAction: string;
  source: "runtime_project_knowledge_redaction_audit";
};

export type ProjectKnowledgeRedactionAuditInput = {
  snapshot?: unknown;
  events?: unknown[] | undefined;
  eventLines?: string | undefined;
  records?: unknown[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const candidateCommittedType = "project_knowledge.candidate_committed";
const entryCommittedType = "project_knowledge.entry_committed";
const supportedEventTypes = new Set<ProjectKnowledgeReplayEventType>([
  candidateCommittedType,
  entryCommittedType,
  "project_knowledge.entry_revoked",
  "project_knowledge.entry_expired",
  "project_knowledge.recall_used",
  "project_knowledge.audit_warning"
]);

const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authHeaderField = ["Author", "ization"].join("");

const forbiddenFieldNames = new Set(
  [
    rawPrefix + "Prompt",
    "promptText",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Response",
    "reasoningContent",
    "reasoning_content",
    apiKeyField,
    "apiKeyValue",
    authHeaderField,
    "bearer",
    "token",
    "secret",
    "password",
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
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const executionAttemptFieldNames = new Set(
  [
    "canApplyPatch",
    "canRollback",
    "canWriteFilesystem",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowEventStoreWrite",
    "allowGit",
    "allowShell",
    "allowAppExecution",
    "executeNow"
  ].map((key) => key.toLowerCase())
);

const disabledReadiness = (
  canReplayProjectKnowledge = false
): ProjectKnowledgeReplayReadiness => ({
  canReplayProjectKnowledge,
  canWriteProjectKnowledgeStore: false,
  canWriteEventStore: false,
  canPersistRawContent: false,
  canApplyPatch: false,
  canRollback: false,
  canExecuteGit: false,
  canExecuteShell: false,
  appCanExecute: false
});

export function buildProjectKnowledgeSummaryEvent(input: {
  type: ProjectKnowledgeReplayEventType;
  entryId?: string | undefined;
  entryStatus?: string | undefined;
  reasonSummary?: string | undefined;
  projectKnowledgeCount?: number | undefined;
  recallSummary?: string | undefined;
  matchedEntryCount?: number | undefined;
  redactionAuditStatus?: string | undefined;
  auditStatus?: string | undefined;
  warningCodes?: string[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
}): ProjectKnowledgeSummaryEvent {
  const ts = safeString(input.createdAt) || "1970-01-01T00:00:00.000Z";
  const payload: ProjectKnowledgeSummaryEventPayload = {
    ...(safeString(input.entryId)
      ? { entryId: safeString(input.entryId) }
      : {}),
    ...(safeString(input.entryStatus)
      ? { entryStatus: safeString(input.entryStatus) }
      : {}),
    ...(safeString(input.reasonSummary)
      ? { reasonSummary: safeString(input.reasonSummary) }
      : {}),
    ...(typeof input.projectKnowledgeCount === "number"
      ? {
          projectKnowledgeCount: Math.max(
            0,
            Math.floor(input.projectKnowledgeCount)
          )
        }
      : {}),
    ...(safeString(input.recallSummary)
      ? { recallSummary: safeString(input.recallSummary) }
      : {}),
    ...(typeof input.matchedEntryCount === "number"
      ? { matchedEntryCount: Math.max(0, Math.floor(input.matchedEntryCount)) }
      : {}),
    ...(safeString(input.redactionAuditStatus)
      ? { redactionAuditStatus: safeString(input.redactionAuditStatus) }
      : {}),
    ...(safeString(input.auditStatus)
      ? { auditStatus: safeString(input.auditStatus) }
      : {}),
    warningCodes: safeStringArray(input.warningCodes),
    summaryOnly: true,
    rawContentIncluded: false
  };
  const eventHash = stablePreviewHash(
    stableStringify({
      type: input.type,
      ts,
      payload
    })
  );
  return {
    schemaVersion: 1,
    id:
      input.idGenerator?.() ??
      `project-knowledge-event-${eventHash.slice(0, 12)}`,
    ts,
    type: input.type,
    taskId: "project-knowledge",
    payload: {
      ...payload,
      eventHash
    },
    eventHash,
    summaryOnly: true,
    rawContentIncluded: false,
    source: "runtime_project_knowledge_events_replay_audit"
  };
}

export function replayProjectKnowledgeEvents(
  input: ProjectKnowledgeReplayInput = {}
): ProjectKnowledgeReplayProjection {
  const findings: ProjectKnowledgeReplayFinding[] = [];
  const parsedEvents = collectReplayEvents(input, findings);
  findings.push(...findUnsafeInputMarkers(input));

  const events = parsedEvents
    .map((event, index) => normalizeReplayEvent(event, input, index, findings))
    .filter(
      (event): event is ProjectKnowledgeSummaryEvent => event !== undefined
    );
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;

  const entryStates = new Map<string, ProjectKnowledgeReplayEntryState>();
  let latestSummary: string | undefined;
  let latestRecallSummary: string | undefined;
  let auditWarningCount = 0;
  let recallEventCount = 0;

  if (blockerCount === 0) {
    for (const event of events) {
      latestSummary = summarizeProjectedEvent(event);
      if (
        event.type === candidateCommittedType ||
        event.type === entryCommittedType
      ) {
        const entryId = safeString(event.payload.entryId);
        if (entryId) {
          entryStates.set(entryId, {
            entryId,
            status: "committed",
            lastEventType: event.type,
            eventHash: event.eventHash,
            warningCodes: event.payload.warningCodes
          });
        }
      } else if (event.type === "project_knowledge.entry_revoked") {
        const entryId = safeString(event.payload.entryId);
        if (entryId) {
          entryStates.set(entryId, {
            entryId,
            status: "revoked",
            lastEventType: event.type,
            eventHash: event.eventHash,
            warningCodes: event.payload.warningCodes
          });
        }
      } else if (event.type === "project_knowledge.entry_expired") {
        const entryId = safeString(event.payload.entryId);
        if (entryId) {
          entryStates.set(entryId, {
            entryId,
            status: "expired",
            lastEventType: event.type,
            eventHash: event.eventHash,
            warningCodes: event.payload.warningCodes
          });
        }
      } else if (event.type === "project_knowledge.recall_used") {
        recallEventCount += 1;
        latestRecallSummary = summarizeProjectedEvent(event);
      } else if (event.type === "project_knowledge.audit_warning") {
        auditWarningCount += 1;
      }
    }
  }

  const entries = [...entryStates.values()].sort((left, right) =>
    left.entryId.localeCompare(right.entryId)
  );
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: ProjectKnowledgeReplayStatus =
    parsedEvents.length === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0 || auditWarningCount > 0
          ? "warning"
          : "replay_ready";
  const replayHash = stablePreviewHash(
    stableStringify({
      status,
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        eventHash: event.eventHash
      })),
      entries,
      findings: findings.map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        path: finding.path
      }))
    })
  );

  return {
    status,
    replayId:
      input.idGenerator?.() ??
      `project-knowledge-replay-${replayHash.slice(0, 12)}`,
    eventCount: events.length,
    displayedEventCount: events.length,
    projectKnowledgeCount: entries.length,
    committedCount: entries.filter((entry) => entry.status === "committed")
      .length,
    revokedCount: entries.filter((entry) => entry.status === "revoked").length,
    expiredCount: entries.filter((entry) => entry.status === "expired").length,
    recallEventCount,
    auditWarningCount,
    ...(latestSummary !== undefined ? { latestSummary } : {}),
    ...(latestRecallSummary !== undefined ? { latestRecallSummary } : {}),
    redactionAuditStatus:
      blockerCount > 0 ? "blocked" : auditWarningCount > 0 ? "warning" : "ok",
    entries,
    events: blockerCount > 0 ? [] : events,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    replayHash,
    readiness: disabledReadiness(blockerCount === 0 && events.length > 0),
    nextAction: replayNextAction(status),
    source: "runtime_project_knowledge_events_replay_audit"
  };
}

export function summarizeProjectKnowledgeReplayProjection(
  projection: ProjectKnowledgeReplayProjection
) {
  return {
    status: projection.status,
    replayId: projection.replayId,
    eventCount: projection.eventCount,
    projectKnowledgeCount: projection.projectKnowledgeCount,
    recallEventCount: projection.recallEventCount,
    auditWarningCount: projection.auditWarningCount,
    redactionAuditStatus: projection.redactionAuditStatus,
    blockerCount: projection.blockerCount,
    warningCount: projection.warningCount,
    replayHash: projection.replayHash,
    summaryOnly: true,
    source: "runtime_project_knowledge_events_replay_audit_summary" as const
  };
}

export function buildProjectKnowledgeRedactionAudit(
  input: ProjectKnowledgeRedactionAuditInput = {}
): ProjectKnowledgeRedactionAudit {
  const records = collectAuditRecords(input);
  const findings = findUnsafeInputMarkers({
    records,
    eventLines: input.eventLines
  });
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const rawFieldDetectedCount = findings.filter(
    (item) => item.kind === "raw_field"
  ).length;
  const apiKeyLeakDetected = findings.some(
    (item) =>
      item.code.includes("API_KEY") ||
      item.code.includes("AUTHORIZATION") ||
      item.code.includes("BEARER") ||
      item.code.includes("SK_LIKE") ||
      item.code.includes("PRIVATE_KEY")
  );
  const reasoningContentDetected = findings.some((item) =>
    item.code.includes("REASONING")
  );
  const status: ProjectKnowledgeRedactionAuditStatus =
    records.length === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "audit_ready";
  const auditHash = stablePreviewHash(
    stableStringify({
      status,
      recordCount: records.length,
      rawFieldDetectedCount,
      apiKeyLeakDetected,
      reasoningContentDetected,
      findings: findings.map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        path: finding.path
      }))
    })
  );

  return {
    status,
    auditId:
      input.idGenerator?.() ??
      `project-knowledge-redaction-audit-${auditHash.slice(0, 12)}`,
    recordCount: records.length,
    rawFieldDetectedCount,
    apiKeyLeakDetected,
    rawContentDetected: rawFieldDetectedCount > 0,
    reasoningContentDetected,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash,
    readiness: disabledReadiness(false),
    nextAction:
      status === "blocked"
        ? "Block replay until the knowledge event/store summary is redacted."
        : "Use summary-only knowledge events in replay projections.",
    source: "runtime_project_knowledge_redaction_audit"
  };
}

function collectReplayEvents(
  input: ProjectKnowledgeReplayInput,
  findings: ProjectKnowledgeReplayFinding[]
): unknown[] {
  const events = Array.isArray(input.events) ? [...input.events] : [];
  if (typeof input.eventLines === "string") {
    for (const [index, line] of input.eventLines.split(/\r?\n/).entries()) {
      if (line.trim().length === 0) {
        continue;
      }
      try {
        events.push(JSON.parse(line));
      } catch {
        findings.push(
          finding(
            "corrupt_event",
            "warning",
            "PARSE_ERROR_LINE_SKIPPED",
            `eventLines[${index}]`
          )
        );
      }
    }
  }
  return events;
}

function normalizeReplayEvent(
  raw: unknown,
  input: ProjectKnowledgeReplayInput,
  index: number,
  findings: ProjectKnowledgeReplayFinding[]
): ProjectKnowledgeSummaryEvent | undefined {
  if (!isRecord(raw)) {
    findings.push(finding("schema", "warning", "EVENT_NOT_OBJECT"));
    return undefined;
  }
  const markers = findUnsafeInputMarkers(raw);
  findings.push(...markers);
  if (markers.some((item) => item.severity === "blocker")) {
    return undefined;
  }

  const type = safeString(
    raw.type ?? raw.eventType
  ) as ProjectKnowledgeReplayEventType;
  if (!supportedEventTypes.has(type)) {
    findings.push(finding("schema", "warning", "UNKNOWN_EVENT_TYPE", "type"));
    return undefined;
  }

  const payload = isRecord(raw.payload) ? raw.payload : raw;
  return buildProjectKnowledgeSummaryEvent({
    type,
    entryId: safeString(payload.entryId),
    entryStatus: safeString(payload.entryStatus ?? payload.status),
    reasonSummary: safeString(payload.reasonSummary),
    projectKnowledgeCount: numberValue(payload.projectKnowledgeCount),
    recallSummary: safeString(payload.recallSummary),
    matchedEntryCount: numberValue(payload.matchedEntryCount),
    redactionAuditStatus: safeString(payload.redactionAuditStatus),
    auditStatus: safeString(payload.auditStatus),
    warningCodes: safeStringArray(payload.warningCodes),
    createdAt:
      safeString(raw.ts) ||
      safeString(raw.createdAt) ||
      input.createdAt ||
      "1970-01-01T00:00:00.000Z",
    idGenerator:
      index === 0 && raw.id === undefined && raw.eventId === undefined
        ? input.idGenerator
        : () =>
            safeString(raw.id) ||
            safeString(raw.eventId) ||
            `project-knowledge-event-${index + 1}`
  });
}

function collectAuditRecords(
  input: ProjectKnowledgeRedactionAuditInput
): unknown[] {
  const records: unknown[] = [];
  if (input.snapshot !== undefined) {
    records.push(input.snapshot);
  }
  if (Array.isArray(input.events)) {
    records.push(...input.events);
  }
  if (Array.isArray(input.records)) {
    records.push(...input.records);
  }
  if (typeof input.eventLines === "string") {
    records.push({ eventLineCount: input.eventLines.split(/\r?\n/).length });
    for (const line of input.eventLines.split(/\r?\n/)) {
      if (line.trim().length === 0) {
        continue;
      }
      try {
        records.push(JSON.parse(line));
      } catch {
        records.push({ parseWarning: "PARSE_ERROR_LINE_SKIPPED" });
      }
    }
  }
  return records;
}

function findUnsafeInputMarkers(
  value: unknown
): ProjectKnowledgeReplayFinding[] {
  const findings: ProjectKnowledgeReplayFinding[] = [];
  visit(value, "$", findings);
  return uniqueFindings(findings);
}

function visit(
  value: unknown,
  path: string,
  findings: ProjectKnowledgeReplayFinding[]
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${path}[${index}]`, findings));
    return;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      const normalized = key.toLowerCase();
      const childPath = `${path}.${key}`;
      if (forbiddenFieldNames.has(normalized)) {
        const safePath = `${path}.[blockedField]`;
        findings.push(
          finding(
            normalized.includes("reasoning")
              ? "raw_field"
              : executionAttemptFieldNames.has(normalized)
                ? "execution"
                : "raw_field",
            "blocker",
            `${key.replace(/[^a-z0-9]/gi, "_").toUpperCase()}_FIELD_REJECTED`,
            safePath
          )
        );
      }
      if (executionAttemptFieldNames.has(normalized) && child === true) {
        findings.push(
          finding(
            "execution",
            "blocker",
            "EXECUTION_FLAG_REJECTED",
            `${path}.[blockedField]`
          )
        );
      }
      visit(child, childPath, findings);
    }
    return;
  }
  if (typeof value === "string") {
    const code = unsafeStringCode(value);
    if (code !== undefined) {
      findings.push(
        finding(
          code.includes("KEY") || code.includes("AUTHORIZATION")
            ? "secret"
            : "raw_field",
          "blocker",
          code,
          `${path.replace(/\.[^.[]+$/u, "")}.[blockedValue]`
        )
      );
    }
  }
}

function unsafeStringCode(value: string): string | undefined {
  const checks: Array<[string, string]> = [
    ["RAW_PROMPT_MARKER", rawPrefix + "Prompt"],
    ["RAW_RESPONSE_MARKER", rawPrefix + "Response"],
    ["RAW_SOURCE_MARKER", rawPrefix + "Source"],
    ["RAW_DIFF_MARKER", rawPrefix + "Diff"],
    ["REASONING_CONTENT_MARKER", "reasoning_content"],
    ["AUTHORIZATION_MARKER", "Authorization"],
    ["BEARER_TOKEN_MARKER", "Bearer "],
    ["PRIVATE_KEY_MARKER", "BEGIN PRIVATE KEY"],
    ["API_KEY_MARKER", "apiKey"],
    ["SK_LIKE_KEY_MARKER", "sk-"]
  ];
  return checks.find(([, marker]) => value.includes(marker))?.[0];
}

function summarizeProjectedEvent(event: ProjectKnowledgeSummaryEvent): string {
  if (event.type === "project_knowledge.recall_used") {
    return formatParts("project knowledge recall used", [
      event.payload.recallSummary,
      displayCount(event.payload.matchedEntryCount, "matches"),
      displayWarnings(event.payload.warningCodes)
    ]);
  }
  if (event.type === "project_knowledge.audit_warning") {
    return formatParts("project knowledge audit warning", [
      event.payload.redactionAuditStatus ?? event.payload.auditStatus,
      displayWarnings(event.payload.warningCodes)
    ]);
  }
  return formatParts(
    event.type === "project_knowledge.entry_revoked"
      ? "project knowledge entry revoked"
      : event.type === "project_knowledge.entry_expired"
        ? "project knowledge entry expired"
        : "project knowledge candidate committed",
    [
      event.payload.entryId,
      event.payload.entryStatus,
      event.payload.reasonSummary,
      displayWarnings(event.payload.warningCodes)
    ]
  );
}

function replayNextAction(status: ProjectKnowledgeReplayStatus): string {
  if (status === "empty") {
    return "Append summary-only project knowledge events before replay.";
  }
  if (status === "blocked") {
    return "Remove raw or secret-bearing project knowledge event data before replay.";
  }
  if (status === "warning") {
    return "Review replay warnings before using project knowledge recall summaries.";
  }
  return "Project knowledge event replay is ready for summary-only projections.";
}

function finding(
  kind: ProjectKnowledgeReplayFindingKind,
  severity: ProjectKnowledgeReplaySeverity,
  code: string,
  path?: string
): ProjectKnowledgeReplayFinding {
  return {
    findingId: stablePreviewHash(
      `${kind}:${severity}:${code}:${path ?? ""}`
    ).slice(0, 16),
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code),
    ...(path !== undefined ? { path } : {})
  };
}

function safeMessageFor(code: string): string {
  if (code === "PARSE_ERROR_LINE_SKIPPED") {
    return "A corrupt project knowledge event line was skipped.";
  }
  if (code.includes("EXECUTION")) {
    return "Execution flags are not allowed in project knowledge replay data.";
  }
  if (
    code.includes("KEY") ||
    code.includes("AUTHORIZATION") ||
    code.includes("BEARER")
  ) {
    return "Secret-like markers are not allowed in project knowledge replay data.";
  }
  return "Raw or unsupported project knowledge replay data was blocked.";
}

function uniqueFindings(
  findings: ProjectKnowledgeReplayFinding[]
): ProjectKnowledgeReplayFinding[] {
  return [
    ...new Map(
      findings.map((finding) => [
        `${finding.code}:${finding.path ?? ""}:${finding.severity}`,
        finding
      ])
    ).values()
  ];
}

function formatParts(label: string, parts: Array<string | undefined>): string {
  const safeParts = parts.filter(
    (part): part is string => part !== undefined && part.trim().length > 0
  );
  return safeParts.length === 0 ? label : `${label}: ${safeParts.join(" · ")}`;
}

function displayCount(
  value: number | undefined,
  label: string
): string | undefined {
  return typeof value === "number" ? `${value} ${label}` : undefined;
}

function displayWarnings(value: string[]): string | undefined {
  return value.length > 0 ? `${value.length} warning codes` : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : undefined;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
