export type DesktopFlowInput = {
  workspaceRoot: string;
  payloadText: string;
  filename?: string;
  allowOverwrite?: boolean;
};

export type DesktopFlowRequest = {
  workspaceRoot: string;
  payloadJson: string;
  filename?: string;
  allowOverwrite?: boolean;
};

export type DesktopFlowResult = {
  draft: {
    relativePath: string;
    absolutePath: string;
    bytes: number;
    sha256: string;
    contentType: "text/csv";
  };
  extraction: {
    rowCount: number;
    columnCount: number;
    warningCount: number;
    injectionRiskCount: number;
    formulaEscapedCount: number;
  };
  events: {
    eventCount: number;
    eventLogPath: string;
  };
  replaySummary: {
    draftCount: number;
  };
};

export type DesktopFlowErrorSummary = {
  ok: false;
  errorCode: string;
  safeMessage: string;
  stage: string;
  exitCode?: number;
  runnerMode?: RunnerMode;
  nodeAvailable?: boolean;
  runnerFound?: boolean;
  stdoutJsonParsed?: boolean;
};

export type EventTimelineItem = {
  id: string;
  ts: string;
  type: string;
  taskId?: string;
  summary: string;
  safePayloadKeys: string[];
};

export type TimelineItemViewModel = {
  id: string;
  key: string;
  ts: string;
  type: string;
  taskId: string;
  taskIdShort: string;
  summary: string;
  safePayloadKeys: string[];
};

export type EventSafetyScan = {
  ok: boolean;
  findings: number;
  warningCodes: string[];
};

export type WorkspaceEventSummary = {
  ok: boolean;
  eventLogPath?: string;
  eventCount: number;
  displayedEventCount: number;
  taskCount: number;
  completedTaskCount: number;
  draftCount: number;
  lastEventAt?: string;
  typeCounts: Record<string, number>;
  timeline: unknown[];
  safetyScan: EventSafetyScan;
  warnings: string[];
  safeMessage?: string;
};

export type RunnerMode =
  | "dev_source_tree"
  | "packaged_with_resources"
  | "packaged_not_supported";

export type RunnerPreflightSummary = {
  ok: boolean;
  mode: RunnerMode;
  runnerFound: boolean;
  nodeAvailable: boolean;
  workspaceValid?: boolean;
  payloadLimitBytes: number;
  warnings: string[];
  statusCode: string;
  errorCode?: string;
  safeMessage?: string;
  runnerStatus: string;
  packagedStandaloneSupport: string;
  nextAction: string;
};

export type ResultPanelModel = {
  draftRelativePath: string;
  draftAbsolutePath: string;
  rows: number;
  columns: number;
  warningCount: number;
  injectionRiskCount: number;
  formulaEscapedCount: number;
  eventsWritten: number;
  replayDraftCount: number;
  eventLogPath: string;
};

export type EventLogPanelModel = {
  eventCount: number;
  displayedEventCount: number;
  taskCount: number;
  completedTaskCount: number;
  draftCount: number;
  lastEventAt?: string;
  safetyOk: boolean;
  safetyFindingCount: number;
  warnings: string[];
  timeline: TimelineItemViewModel[];
  emptyMessage?: string;
  safeMessage?: string;
};

export type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; errorMessage: string };

export type ValidationResult =
  | { ok: true; request: DesktopFlowRequest }
  | { ok: false; errorMessage: string };

export class SafeDesktopCommandError extends Error {
  readonly errorCode: string;
  readonly stage?: string;
  readonly exitCode?: number;
  readonly runnerMode?: RunnerMode;
  readonly nodeAvailable?: boolean;
  readonly runnerFound?: boolean;
  readonly stdoutJsonParsed?: boolean;

  constructor(summary: DesktopFlowErrorSummary) {
    super(formatDesktopErrorSummary(summary));
    this.name = "SafeDesktopCommandError";
    this.errorCode = summary.errorCode;
    this.stage = summary.stage;
    if (summary.exitCode !== undefined) {
      this.exitCode = summary.exitCode;
    }
    if (summary.runnerMode !== undefined) {
      this.runnerMode = summary.runnerMode;
    }
    if (summary.nodeAvailable !== undefined) {
      this.nodeAvailable = summary.nodeAvailable;
    }
    if (summary.runnerFound !== undefined) {
      this.runnerFound = summary.runnerFound;
    }
    if (summary.stdoutJsonParsed !== undefined) {
      this.stdoutJsonParsed = summary.stdoutJsonParsed;
    }
  }
}

const secretLikePatterns = [
  /\bBearer\s+[A-Za-z0-9._-]{8,}\b/gi,
  /\bsk-[A-Za-z0-9_-]{8,}\b/gi,
  /\bAuthorization\s*:\s*[^\r\n]+/gi
];

export const maxPayloadTextBytes = 2_000_000;

export function parsePayloadJson(payloadText: string): ParseResult {
  if (payloadText.trim().length === 0) {
    return { ok: false, errorMessage: "Payload JSON is required" };
  }
  const sizeError = validatePayloadTextSize(payloadText);
  if (sizeError !== undefined) {
    return { ok: false, errorMessage: sizeError };
  }

  try {
    return { ok: true, value: JSON.parse(payloadText) };
  } catch {
    return { ok: false, errorMessage: "Payload JSON is not valid JSON" };
  }
}

export function validatePayloadTextSize(text: string): string | undefined {
  if (new TextEncoder().encode(text).byteLength > maxPayloadTextBytes) {
    return "Payload JSON is too large";
  }
  return undefined;
}

export function validateDesktopFlowInput(
  input: DesktopFlowInput
): ValidationResult {
  if (input.workspaceRoot.trim().length === 0) {
    return { ok: false, errorMessage: "Workspace root is required" };
  }

  const parsed = parsePayloadJson(input.payloadText);
  if (!parsed.ok) {
    return parsed;
  }
  if (!looksLikeBrowserDomPayload(parsed.value)) {
    return {
      ok: false,
      errorMessage: "Payload must be a sanitized BrowserDomPayload object"
    };
  }

  const filename = input.filename?.trim();
  if (filename !== undefined && filename.length > 0) {
    const filenameError = validateFilenameForUi(filename);
    if (filenameError !== undefined) {
      return { ok: false, errorMessage: filenameError };
    }
  }

  return {
    ok: true,
    request: {
      workspaceRoot: input.workspaceRoot.trim(),
      payloadJson: JSON.stringify(parsed.value),
      ...(filename !== undefined && filename.length > 0 ? { filename } : {}),
      allowOverwrite: input.allowOverwrite ?? false
    }
  };
}

export function buildResultPanelModel(
  result: DesktopFlowResult
): ResultPanelModel {
  return {
    draftRelativePath: result.draft.relativePath,
    draftAbsolutePath: result.draft.absolutePath,
    rows: result.extraction.rowCount,
    columns: result.extraction.columnCount,
    warningCount: result.extraction.warningCount,
    injectionRiskCount: result.extraction.injectionRiskCount,
    formulaEscapedCount: result.extraction.formulaEscapedCount,
    eventsWritten: result.events.eventCount,
    replayDraftCount: result.replaySummary.draftCount,
    eventLogPath: result.events.eventLogPath
  };
}

export function normalizeDesktopFlowResult(value: unknown): DesktopFlowResult {
  const root = expectRecord(value, "Desktop flow response was invalid");
  const draft = expectRecord(
    root.draft,
    "Desktop flow draft summary was invalid"
  );
  const extraction = expectRecord(
    root.extraction,
    "Desktop flow extraction summary was invalid"
  );
  const events = expectRecord(
    root.events,
    "Desktop flow event summary was invalid"
  );
  const replaySummary = expectRecord(
    readValue(root, "replaySummary", "replay_summary"),
    "Desktop flow replay summary was invalid"
  );

  return {
    draft: {
      relativePath: readRequiredString(draft, "relativePath", "relative_path"),
      absolutePath: readRequiredString(draft, "absolutePath", "absolute_path"),
      bytes: readRequiredNumber(draft, "bytes"),
      sha256: readRequiredString(draft, "sha256"),
      contentType: readRequiredContentType(draft)
    },
    extraction: {
      rowCount: readRequiredNumber(extraction, "rowCount", "row_count"),
      columnCount: readRequiredNumber(
        extraction,
        "columnCount",
        "column_count"
      ),
      warningCount: readRequiredNumber(
        extraction,
        "warningCount",
        "warning_count"
      ),
      injectionRiskCount: readRequiredNumber(
        extraction,
        "injectionRiskCount",
        "injection_risk_count"
      ),
      formulaEscapedCount: readRequiredNumber(
        extraction,
        "formulaEscapedCount",
        "formula_escaped_count"
      )
    },
    events: {
      eventCount: readRequiredNumber(events, "eventCount", "event_count"),
      eventLogPath: readRequiredString(events, "eventLogPath", "event_log_path")
    },
    replaySummary: {
      draftCount: readRequiredNumber(replaySummary, "draftCount", "draft_count")
    }
  };
}

export function normalizeRunnerPreflightSummary(
  value: unknown
): RunnerPreflightSummary {
  const root = expectRecord(value, "Runner preflight response was invalid");
  const mode = readString(root, "mode");
  const workspaceValid = readBoolean(root, "workspaceValid", "workspace_valid");
  const errorCode = readString(root, "errorCode", "error_code");
  const safeMessage = readString(root, "safeMessage", "safe_message");
  const normalizedMode =
    mode === "dev_source_tree" ||
    mode === "packaged_with_resources" ||
    mode === "packaged_not_supported"
      ? mode
      : "packaged_not_supported";

  return {
    ok: readBoolean(root, "ok") === true,
    mode: normalizedMode,
    runnerFound: readBoolean(root, "runnerFound", "runner_found") === true,
    nodeAvailable:
      readBoolean(root, "nodeAvailable", "node_available") === true,
    ...(workspaceValid !== undefined ? { workspaceValid } : {}),
    payloadLimitBytes: readNumber(
      root,
      "payloadLimitBytes",
      "payload_limit_bytes"
    ),
    warnings: readStringArray(root, "warnings"),
    statusCode: readString(root, "statusCode", "status_code") ?? "UNKNOWN",
    ...(errorCode !== undefined ? { errorCode } : {}),
    ...(safeMessage !== undefined ? { safeMessage } : {}),
    runnerStatus:
      readString(root, "runnerStatus", "runner_status") ?? "Preflight unknown",
    packagedStandaloneSupport:
      readString(
        root,
        "packagedStandaloneSupport",
        "packaged_standalone_support"
      ) ?? "Unknown",
    nextAction:
      readString(root, "nextAction", "next_action") ??
      "Review the safe preflight message and retry"
  };
}

export function normalizeWorkspaceEventSummary(
  value: unknown
): WorkspaceEventSummary {
  if (!isRecord(value)) {
    return invalidWorkspaceEventSummary("Event summary response was invalid");
  }

  const safetyScan = isRecord(readValue(value, "safetyScan", "safety_scan"))
    ? (readValue(value, "safetyScan", "safety_scan") as Record<string, unknown>)
    : undefined;
  const timeline = safeArray(value.timeline);
  const eventLogPath = readString(value, "eventLogPath", "event_log_path");
  const lastEventAt = readString(value, "lastEventAt", "last_event_at");
  const safeMessage = readString(value, "safeMessage", "safe_message");
  const warnings = Array.isArray(value.warnings)
    ? readStringArray(value, "warnings")
    : ["MALFORMED_EVENT_SUMMARY"];

  return {
    ok: readBoolean(value, "ok") !== false,
    ...(eventLogPath !== undefined ? { eventLogPath } : {}),
    eventCount: finiteNumber(readValue(value, "eventCount", "event_count")),
    displayedEventCount: finiteNumber(
      readValue(value, "displayedEventCount", "displayed_event_count"),
      timeline.length
    ),
    taskCount: finiteNumber(readValue(value, "taskCount", "task_count")),
    completedTaskCount: finiteNumber(
      readValue(value, "completedTaskCount", "completed_task_count")
    ),
    draftCount: finiteNumber(readValue(value, "draftCount", "draft_count")),
    ...(lastEventAt !== undefined ? { lastEventAt } : {}),
    typeCounts: isRecord(readValue(value, "typeCounts", "type_counts"))
      ? Object.fromEntries(
          Object.entries(
            readValue(value, "typeCounts", "type_counts") as Record<
              string,
              unknown
            >
          ).map(([key, count]) => [key, finiteNumber(count)])
        )
      : {},
    timeline,
    safetyScan: {
      ok: safetyScan?.ok === true,
      findings: finiteNumber(safetyScan?.findings),
      warningCodes: readStringArray(safetyScan, "warningCodes", "warning_codes")
    },
    warnings,
    ...(safeMessage !== undefined ? { safeMessage } : {})
  };
}

export function safeText(value: unknown, fallback = "—"): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function safeShort(value: unknown, max = 12, fallback = "—"): string {
  const text = safeText(value, fallback);
  return text.slice(0, Math.max(0, max));
}

export function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeTimelineItem(
  raw: unknown,
  index = 0
): TimelineItemViewModel {
  const record = isRecord(raw) ? raw : {};
  const type = safeText(readValue(record, "type"), "unknown.event");
  const id = safeText(readValue(record, "id"), `event-${index + 1}`);
  const taskId = safeText(readValue(record, "taskId", "task_id"), "no task");
  const summary = safeText(readValue(record, "summary"), `${type} event`);
  const safePayloadKeys = safeArray(
    readValue(record, "safePayloadKeys", "safe_payload_keys")
  )
    .filter((item): item is string => typeof item === "string")
    .map((item) => safeText(item))
    .filter((item) => item !== "—");

  return {
    id,
    key: `${id}-${index}`,
    ts: safeText(readValue(record, "ts"), "unknown time"),
    type,
    taskId,
    taskIdShort: safeShort(taskId, 18, "no task"),
    summary,
    safePayloadKeys
  };
}

export function normalizeEventSummary(raw: unknown): WorkspaceEventSummary {
  return normalizeWorkspaceEventSummary(raw);
}

export function normalizeDesktopCommandError(
  error: unknown
): SafeDesktopCommandError {
  if (error instanceof SafeDesktopCommandError) {
    return error;
  }
  const summary = toDesktopErrorSummary(error);
  return new SafeDesktopCommandError(summary);
}

export function buildEventLogPanelModel(
  summary: WorkspaceEventSummary | null | undefined
): EventLogPanelModel | undefined {
  if (summary === undefined || summary === null) {
    return undefined;
  }
  const safetyScan = isRecord(summary.safetyScan)
    ? summary.safetyScan
    : undefined;
  const timeline = safeArray(summary.timeline).map(normalizeTimelineItem);
  const warningCodes = safeArray(safetyScan?.warningCodes)
    .filter((warning): warning is string => typeof warning === "string")
    .map((warning) => safeText(warning))
    .filter((warning) => warning !== "—");
  const warnings = safeArray(summary.warnings)
    .filter((warning): warning is string => typeof warning === "string")
    .map((warning) => safeText(warning))
    .filter((warning) => warning !== "—");
  const mergedWarnings = [...warnings, ...warningCodes];
  if (!Array.isArray(summary.warnings)) {
    mergedWarnings.push("MALFORMED_EVENT_SUMMARY");
  }
  const eventCount = finiteNumber(summary.eventCount);

  return {
    eventCount,
    displayedEventCount: finiteNumber(
      summary.displayedEventCount,
      timeline.length
    ),
    taskCount: finiteNumber(summary.taskCount),
    completedTaskCount: finiteNumber(summary.completedTaskCount),
    draftCount: finiteNumber(summary.draftCount),
    ...(typeof summary.lastEventAt === "string"
      ? { lastEventAt: summary.lastEventAt }
      : {}),
    safetyOk: safetyScan?.ok === true,
    safetyFindingCount: finiteNumber(safetyScan?.findings),
    warnings: Array.from(new Set(mergedWarnings)),
    timeline,
    ...(eventCount === 0
      ? { emptyMessage: "No events yet. Run a conversion first." }
      : {}),
    ...(typeof summary.safeMessage === "string"
      ? { safeMessage: summary.safeMessage }
      : {})
  };
}

export function runnerPreflightMessage(
  preflight: RunnerPreflightSummary | undefined
): string {
  if (preflight === undefined) {
    return "Runner preflight has not run";
  }
  if (preflight.ok) {
    return `${preflight.runnerStatus} (${preflight.mode})`;
  }
  return preflight.safeMessage ?? "Runner preflight failed";
}

export function canRunWithPreflight(
  preflight: RunnerPreflightSummary
): boolean {
  return preflight.ok;
}

export function defaultDraftFilename(): string {
  return "web-table-export.csv";
}

export function safeErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : isRecord(error) && typeof error.safeMessage === "string"
          ? formatDesktopErrorSummary(toDesktopErrorSummary(error))
          : "Unknown desktop flow error";
  return redactSecrets(message).slice(0, 400);
}

export function buildUiErrorFallbackMessage(error: unknown): string {
  const message = safeErrorMessage(error);
  if (
    message === "Unknown desktop flow error" ||
    message.includes("raw payload") ||
    message.includes("raw CSV")
  ) {
    return "Desktop shell recovered from a UI error.";
  }
  return "Desktop shell recovered from a UI error.";
}

function validateFilenameForUi(filename: string): string | undefined {
  if (filename.includes("..")) {
    return "Filename cannot contain parent traversal";
  }
  if (filename.includes("/") || filename.includes("\\")) {
    return "Filename cannot contain path separators";
  }
  if (!filename.toLowerCase().endsWith(".csv")) {
    return "Filename must end with .csv";
  }
  return undefined;
}

function looksLikeBrowserDomPayload(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.schemaVersion !== "number") {
    return false;
  }
  if (!isRecord(value.source) || !Array.isArray(value.tables)) {
    return false;
  }
  if (!isRecord(value.redaction)) {
    return false;
  }
  return value.tables.length > 0;
}

function redactSecrets(text: string): string {
  return secretLikePatterns.reduce(
    (current, pattern) => current.replace(pattern, "[redacted]"),
    text
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectRecord(
  value: unknown,
  message: string
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new SafeDesktopCommandError({
      ok: false,
      errorCode: "INVALID_RESPONSE",
      safeMessage: message,
      stage: "normalize_response"
    });
  }
  return value;
}

function readValue(
  record: Record<string, unknown> | undefined,
  key: string,
  fallbackKey?: string
): unknown {
  if (record === undefined) {
    return undefined;
  }
  if (key in record) {
    return record[key];
  }
  if (fallbackKey !== undefined && fallbackKey in record) {
    return record[fallbackKey];
  }
  return undefined;
}

function readString(
  record: Record<string, unknown> | undefined,
  key: string,
  fallbackKey?: string
): string | undefined {
  const value = readValue(record, key, fallbackKey);
  return typeof value === "string" ? value : undefined;
}

function readBoolean(
  record: Record<string, unknown> | undefined,
  key: string,
  fallbackKey?: string
): boolean | undefined {
  const value = readValue(record, key, fallbackKey);
  return typeof value === "boolean" ? value : undefined;
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
  fallbackKey?: string
): number {
  return finiteNumber(readValue(record, key, fallbackKey));
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  fallbackKey?: string
): string {
  const value = readString(record, key, fallbackKey);
  if (value === undefined) {
    throw new SafeDesktopCommandError({
      ok: false,
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Desktop flow returned an invalid summary",
      stage: "normalize_response"
    });
  }
  return value;
}

function readRequiredNumber(
  record: Record<string, unknown>,
  key: string,
  fallbackKey?: string
): number {
  const value = readValue(record, key, fallbackKey);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SafeDesktopCommandError({
      ok: false,
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Desktop flow returned an invalid summary",
      stage: "normalize_response"
    });
  }
  return value;
}

function readRequiredContentType(record: Record<string, unknown>): "text/csv" {
  const value = readString(record, "contentType", "content_type");
  if (value !== "text/csv") {
    throw new SafeDesktopCommandError({
      ok: false,
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Desktop flow returned an invalid content type",
      stage: "normalize_response"
    });
  }
  return value;
}

function readStringArray(
  record: Record<string, unknown> | undefined,
  key: string,
  fallbackKey?: string
): string[] {
  const value = readValue(record, key, fallbackKey);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toDesktopErrorSummary(error: unknown): DesktopFlowErrorSummary {
  if (isRecord(error)) {
    const safeMessage =
      readString(error, "safeMessage", "safe_message") ??
      readString(error, "message") ??
      "Desktop flow failed safely";
    return {
      ok: false,
      errorCode:
        readString(error, "errorCode", "error_code") ??
        "DESKTOP_COMMAND_FAILED",
      safeMessage,
      stage: readString(error, "stage") ?? "run_flow",
      ...(typeof readValue(error, "exitCode", "exit_code") === "number"
        ? { exitCode: readValue(error, "exitCode", "exit_code") as number }
        : {}),
      ...(readString(error, "runnerMode", "runner_mode") !== undefined
        ? {
            runnerMode: readString(
              error,
              "runnerMode",
              "runner_mode"
            ) as RunnerMode
          }
        : {}),
      ...(readBoolean(error, "nodeAvailable", "node_available") !== undefined
        ? {
            nodeAvailable:
              readBoolean(error, "nodeAvailable", "node_available") === true
          }
        : {}),
      ...(readBoolean(error, "runnerFound", "runner_found") !== undefined
        ? {
            runnerFound:
              readBoolean(error, "runnerFound", "runner_found") === true
          }
        : {}),
      ...(readBoolean(error, "stdoutJsonParsed", "stdout_json_parsed") !==
      undefined
        ? {
            stdoutJsonParsed:
              readBoolean(error, "stdoutJsonParsed", "stdout_json_parsed") ===
              true
          }
        : {})
    };
  }
  if (error instanceof Error) {
    return {
      ok: false,
      errorCode: "DESKTOP_COMMAND_FAILED",
      safeMessage: error.message,
      stage: "run_flow"
    };
  }
  if (typeof error === "string") {
    return {
      ok: false,
      errorCode: "DESKTOP_COMMAND_FAILED",
      safeMessage: error,
      stage: "run_flow"
    };
  }
  return {
    ok: false,
    errorCode: "DESKTOP_COMMAND_FAILED",
    safeMessage: "Desktop flow failed safely",
    stage: "run_flow"
  };
}

function formatDesktopErrorSummary(summary: DesktopFlowErrorSummary): string {
  const details = [
    `code ${summary.errorCode}`,
    `stage ${summary.stage}`,
    summary.exitCode !== undefined ? `exit ${summary.exitCode}` : undefined,
    summary.runnerMode !== undefined ? `mode ${summary.runnerMode}` : undefined,
    summary.nodeAvailable !== undefined
      ? `node ${summary.nodeAvailable ? "available" : "missing"}`
      : undefined,
    summary.runnerFound !== undefined
      ? `runner ${summary.runnerFound ? "found" : "missing"}`
      : undefined,
    summary.stdoutJsonParsed !== undefined
      ? `stdoutJsonParsed ${summary.stdoutJsonParsed ? "yes" : "no"}`
      : undefined
  ].filter((part): part is string => part !== undefined);
  return `${summary.safeMessage} (${details.join(", ")})`;
}

function invalidWorkspaceEventSummary(message: string): WorkspaceEventSummary {
  return {
    ok: false,
    eventCount: 0,
    displayedEventCount: 0,
    taskCount: 0,
    completedTaskCount: 0,
    draftCount: 0,
    typeCounts: {},
    timeline: [],
    safetyScan: {
      ok: false,
      findings: 0,
      warningCodes: ["MALFORMED_EVENT_SUMMARY"]
    },
    warnings: ["MALFORMED_EVENT_SUMMARY"],
    safeMessage: message
  };
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
