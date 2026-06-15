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
    sourceHost: string;
    sourcePathWithoutQuery: string;
    tableId: string;
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
    eventCount: number;
    draftCount: number;
    tasks: Record<string, string>;
  };
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

export type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; errorMessage: string };

export type ValidationResult =
  | { ok: true; request: DesktopFlowRequest }
  | { ok: false; errorMessage: string };

const secretLikePatterns = [
  /\bBearer\s+[A-Za-z0-9._-]{8,}\b/gi,
  /\bsk-[A-Za-z0-9_-]{8,}\b/gi,
  /\bAuthorization\s*:\s*[^\r\n]+/gi
];

export function parsePayloadJson(payloadText: string): ParseResult {
  if (payloadText.trim().length === 0) {
    return { ok: false, errorMessage: "Payload JSON is required" };
  }

  try {
    return { ok: true, value: JSON.parse(payloadText) };
  } catch {
    return { ok: false, errorMessage: "Payload JSON is not valid JSON" };
  }
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

export function defaultDraftFilename(): string {
  return "web-table-export.csv";
}

export function safeErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown desktop flow error";
  return redactSecrets(message).slice(0, 400);
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
