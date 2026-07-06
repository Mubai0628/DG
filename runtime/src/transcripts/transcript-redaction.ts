import {
  parseTranscriptRecord,
  type TranscriptChunkKind,
  type TranscriptRecord,
  type TranscriptSourceKind,
  type TranscriptValidationResult,
  type TranscriptVisibility
} from "./transcript-schema.js";

export type TranscriptRedactionInput =
  | string
  | {
      text: string;
      maxSummaryLength?: number | undefined;
    };

export type TranscriptRedactionFindingSeverity = "blocker" | "warning";

export type TranscriptRedactionFindingKind =
  | "secret"
  | "control"
  | "binary"
  | "size"
  | "path"
  | "stacktrace"
  | "command_echo"
  | "execution";

export type TranscriptRedactionFinding = {
  findingId: string;
  kind: TranscriptRedactionFindingKind;
  severity: TranscriptRedactionFindingSeverity;
  code: string;
  safeMessage: string;
};

export type TranscriptRedactionReadiness = {
  canPersistRedactedSummary: boolean;
  canPersistRawOutput: false;
  canExecuteCommand: false;
  canRunShell: false;
  canApplyPatch: false;
  canDeleteFiles: false;
  canCommitGit: false;
  canPushGit: false;
  canStartAutonomousLoop: false;
  canWriteEventStore: false;
  canFetchNetwork: false;
  appCanExecute: false;
};

export type TranscriptRedactionResult = {
  status: "redacted" | "warning" | "blocked";
  redactedText: string;
  lineCount: number;
  byteCount: number;
  hashPrefix: string;
  redactedMarkerCount: number;
  secretMarkerCount: number;
  controlCharCount: number;
  binaryLike: boolean;
  truncated: boolean;
  stacktraceDetected: boolean;
  commandEchoDetected: boolean;
  windowsPathWarning: boolean;
  warningCodes: string[];
  findings: TranscriptRedactionFinding[];
  blockerCount: number;
  warningCount: number;
  readiness: TranscriptRedactionReadiness;
  source: "runtime_transcript_redaction_pipeline";
};

export type TranscriptCaptureInput = {
  transcriptId?: string | undefined;
  sessionId: string;
  workspaceRootRef?: string | undefined;
  mode: string;
  sourceKind: TranscriptSourceKind;
  streamKind: Extract<TranscriptChunkKind, "stdout" | "stderr">;
  outputText: string;
  visibility?: TranscriptVisibility | undefined;
  rawOptIn?: boolean | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  maxSummaryLength?: number | undefined;
  canExecuteCommand?: boolean | undefined;
  canRunShell?: boolean | undefined;
  canApplyPatch?: boolean | undefined;
  canCommitGit?: boolean | undefined;
  canPushGit?: boolean | undefined;
};

export type TranscriptCaptureValidationResult = {
  status: "valid" | "blocked";
  findings: TranscriptRedactionFinding[];
  blockerCount: number;
};

export type TranscriptCaptureResult = {
  status: "captured" | "warning" | "blocked";
  transcript?: TranscriptRecord | undefined;
  transcriptValidation: TranscriptValidationResult;
  redaction: TranscriptRedactionResult;
  summary: ReturnType<typeof summarizeTranscriptRedaction>;
  findings: TranscriptRedactionFinding[];
  blockerCount: number;
  warningCount: number;
  readiness: TranscriptRedactionReadiness;
  source: "runtime_transcript_redaction_pipeline";
};

const authHeader = ["Author", "ization"].join("");
const bearerWord = ["Bear", "er"].join("");
const privateKeyMarker = ["-----BEGIN", " PRIVATE KEY-----"].join("");
const tokenQueryPattern =
  /([?&](?:token|key|api_key|access_token|secret)=)[^&\s]+/gi;
const apiKeyPattern = /\bsk-[A-Za-z0-9_-]{8,}\b/g;
const bearerPattern = new RegExp(
  `\\b${bearerWord}\\s+[A-Za-z0-9._-]{12,}\\b`,
  "g"
);
const authPattern = new RegExp(`\\b${authHeader}\\s*[:=]\\s*[^\\r\\n]+`, "gi");
const tokenLikePattern = /\b[A-Za-z0-9_-]{32,}\b/g;
// eslint-disable-next-line no-control-regex
const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/g;
// eslint-disable-next-line no-control-regex
const controlCharPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const windowsPathPattern = /\b[A-Za-z]:\\[^\r\n]+/;
const stacktracePattern =
  /\bat\s+[\w.$<>]+\s*\(|Traceback \(most recent call last\):/;
const commandEchoPattern = /^(?:\$|>|PS [^>]+>)\s+/m;
const defaultMaxSummaryLength = 4000;

export function redactTranscriptText(
  input: TranscriptRedactionInput
): TranscriptRedactionResult {
  const text = typeof input === "string" ? input : input.text;
  const maxSummaryLength =
    typeof input === "string"
      ? defaultMaxSummaryLength
      : (input.maxSummaryLength ?? defaultMaxSummaryLength);
  const findings: TranscriptRedactionFinding[] = [];
  const originalByteCount = byteCount(text);
  const binaryLike = text.includes("\u0000");

  if (binaryLike) {
    findings.push(blocker("binary", "BINARY_OUTPUT_BLOCKED"));
  }
  if (text.includes(privateKeyMarker)) {
    findings.push(blocker("secret", "PRIVATE_KEY_MARKER_BLOCKED"));
  }

  let redactedText = text.replace(ansiPattern, () => {
    findings.push(warning("control", "ANSI_STRIPPED"));
    return "";
  });
  redactedText = redactedText.replace(controlCharPattern, () => {
    findings.push(warning("control", "CONTROL_CHAR_STRIPPED"));
    return "";
  });

  redactedText = replaceAndCount(
    redactedText,
    authPattern,
    "[REDACTED_AUTH]",
    () => findings.push(warning("secret", "AUTHORIZATION_REDACTED"))
  );
  redactedText = replaceAndCount(
    redactedText,
    bearerPattern,
    "[REDACTED_BEARER]",
    () => findings.push(warning("secret", "BEARER_REDACTED"))
  );
  redactedText = replaceAndCount(
    redactedText,
    apiKeyPattern,
    "[REDACTED_API_KEY]",
    () => findings.push(warning("secret", "API_KEY_REDACTED"))
  );
  redactedText = replaceAndCount(
    redactedText,
    tokenQueryPattern,
    "$1[REDACTED_QUERY_SECRET]",
    () => findings.push(warning("secret", "URL_QUERY_SECRET_REDACTED"))
  );
  redactedText = replaceAndCount(
    redactedText,
    tokenLikePattern,
    "[REDACTED_TOKEN]",
    () => findings.push(warning("secret", "TOKEN_LIKE_VALUE_REDACTED"))
  );

  if (windowsPathPattern.test(redactedText)) {
    findings.push(warning("path", "WINDOWS_PATH_SUMMARY_WARNING"));
  }
  if (stacktracePattern.test(redactedText)) {
    findings.push(warning("stacktrace", "STACKTRACE_SUMMARIZED"));
  }
  if (commandEchoPattern.test(redactedText)) {
    findings.push(warning("command_echo", "COMMAND_ECHO_SUMMARIZED"));
  }

  let truncated = false;
  if (redactedText.length > maxSummaryLength) {
    redactedText = `${redactedText.slice(0, maxSummaryLength)}\n[TRUNCATED]`;
    truncated = true;
    findings.push(warning("size", "OUTPUT_TRUNCATED"));
  }

  const safeFindings = withIds(uniqueFindings(findings));
  const blockerCount = safeFindings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = safeFindings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const warningCodes = safeFindings
    .filter((finding) => finding.severity === "warning")
    .map((finding) => finding.code);
  const secretMarkerCount = safeFindings.filter(
    (finding) => finding.kind === "secret"
  ).length;

  return {
    status:
      blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "redacted",
    redactedText: blockerCount > 0 ? "" : redactedText,
    lineCount: countLines(text),
    byteCount: originalByteCount,
    hashPrefix: hashPrefix(redactedText),
    redactedMarkerCount: countRedactionMarkers(redactedText),
    secretMarkerCount,
    controlCharCount: countMatches(text, controlCharPattern),
    binaryLike,
    truncated,
    stacktraceDetected: stacktracePattern.test(text),
    commandEchoDetected: commandEchoPattern.test(text),
    windowsPathWarning: windowsPathPattern.test(text),
    warningCodes,
    findings: safeFindings,
    blockerCount,
    warningCount,
    readiness: readiness(blockerCount === 0),
    source: "runtime_transcript_redaction_pipeline"
  };
}

export function validateTranscriptCaptureInput(
  input: TranscriptCaptureInput
): TranscriptCaptureValidationResult {
  const findings: TranscriptRedactionFinding[] = [];
  if (!input.sessionId) {
    findings.push(blocker("execution", "MISSING_SESSION_ID"));
  }
  if (!input.mode) {
    findings.push(blocker("execution", "MISSING_MODE"));
  }
  if (!input.outputText) {
    findings.push(blocker("execution", "MISSING_OUTPUT_TEXT"));
  }
  if (
    input.canExecuteCommand ||
    input.canRunShell ||
    input.canApplyPatch ||
    input.canCommitGit ||
    input.canPushGit
  ) {
    findings.push(blocker("execution", "EXECUTION_READINESS_REJECTED"));
  }
  const safeFindings = withIds(findings);
  const blockerCount = safeFindings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  return {
    status: blockerCount > 0 ? "blocked" : "valid",
    findings: safeFindings,
    blockerCount
  };
}

export function buildTranscriptFromOutput(
  input: TranscriptCaptureInput
): TranscriptCaptureResult {
  const validation = validateTranscriptCaptureInput(input);
  const redaction = redactTranscriptText({
    text: input.outputText,
    maxSummaryLength: input.maxSummaryLength
  });
  const findings = [...validation.findings, ...redaction.findings];
  let transcriptValidation = parseTranscriptRecord(
    {
      schemaVersion: "transcript_record.v1",
      sessionId: input.sessionId,
      mode: input.mode,
      sourceKind: input.sourceKind,
      visibility: "summary_only",
      chunks: [],
      redactionSummary: { scanned: true },
      retentionPolicy: { retainDays: 14 }
    },
    { idGenerator: input.idGenerator, createdAt: input.createdAt }
  );

  if (validation.status === "blocked" || redaction.status === "blocked") {
    return captureResult(undefined, redaction, findings);
  }

  transcriptValidation = parseTranscriptRecord(
    {
      schemaVersion: "transcript_record.v1",
      transcriptId: input.transcriptId,
      sessionId: input.sessionId,
      workspaceRootRef: input.workspaceRootRef,
      mode: input.mode,
      sourceKind: input.sourceKind,
      visibility: input.visibility ?? "summary_only",
      rawOptIn: Boolean(input.rawOptIn),
      chunks: [
        {
          chunkId: "output-1",
          kind: input.streamKind,
          summary: redaction.redactedText,
          byteCount: redaction.byteCount,
          lineCount: redaction.lineCount,
          redacted: true,
          rawAvailable: false,
          hashPrefix: redaction.hashPrefix,
          warningCodes: redaction.warningCodes
        }
      ],
      redactionSummary: {
        scanned: true,
        redactedFieldCount: redaction.redactedMarkerCount,
        secretMarkerCount: redaction.secretMarkerCount,
        controlCharCount: redaction.controlCharCount,
        binaryChunkCount: redaction.binaryLike ? 1 : 0,
        warningCodes: redaction.warningCodes
      },
      retentionPolicy: {
        retainDays: 14,
        exportAllowed: true,
        deleteAllowed: true,
        tombstoneOnDelete: true
      },
      hashes: {},
      createdAt: input.createdAt
    },
    {
      createdAt: input.createdAt,
      idGenerator: input.idGenerator
    }
  );

  if (
    !transcriptValidation.transcript ||
    transcriptValidation.status === "blocked"
  ) {
    return captureResult(undefined, redaction, [
      ...findings,
      ...transcriptValidation.findings.map((finding) => ({
        findingId: finding.findingId,
        kind: "execution" as const,
        severity: finding.severity,
        code: finding.code,
        safeMessage: finding.safeMessage
      }))
    ]);
  }

  return captureResult(transcriptValidation.transcript, redaction, findings);

  function captureResult(
    transcript: TranscriptRecord | undefined,
    redactionResult: TranscriptRedactionResult,
    captureFindings: TranscriptRedactionFinding[]
  ): TranscriptCaptureResult {
    const safeFindings = withIds(uniqueFindings(captureFindings));
    const blockers = safeFindings.filter(
      (finding) => finding.severity === "blocker"
    ).length;
    const warnings = safeFindings.filter(
      (finding) => finding.severity === "warning"
    ).length;
    const summary = summarizeTranscriptRedaction(redactionResult);
    return {
      status: blockers > 0 ? "blocked" : warnings > 0 ? "warning" : "captured",
      transcript,
      transcriptValidation,
      redaction: redactionResult,
      summary,
      findings: safeFindings,
      blockerCount: blockers,
      warningCount: warnings,
      readiness: readiness(blockers === 0),
      source: "runtime_transcript_redaction_pipeline"
    };
  }
}

export function summarizeTranscriptRedaction(
  result: TranscriptRedactionResult
): Omit<TranscriptRedactionResult, "redactedText" | "findings" | "readiness"> {
  return {
    status: result.status,
    lineCount: result.lineCount,
    byteCount: result.byteCount,
    hashPrefix: result.hashPrefix,
    redactedMarkerCount: result.redactedMarkerCount,
    secretMarkerCount: result.secretMarkerCount,
    controlCharCount: result.controlCharCount,
    binaryLike: result.binaryLike,
    truncated: result.truncated,
    stacktraceDetected: result.stacktraceDetected,
    commandEchoDetected: result.commandEchoDetected,
    windowsPathWarning: result.windowsPathWarning,
    warningCodes: result.warningCodes,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    source: result.source
  };
}

function readiness(
  canPersistRedactedSummary: boolean
): TranscriptRedactionReadiness {
  return {
    canPersistRedactedSummary,
    canPersistRawOutput: false,
    canExecuteCommand: false,
    canRunShell: false,
    canApplyPatch: false,
    canDeleteFiles: false,
    canCommitGit: false,
    canPushGit: false,
    canStartAutonomousLoop: false,
    canWriteEventStore: false,
    canFetchNetwork: false,
    appCanExecute: false
  };
}

function replaceAndCount(
  value: string,
  pattern: RegExp,
  replacement: string,
  onMatch: () => void
): string {
  let matched = false;
  const next = value.replace(pattern, () => {
    matched = true;
    return replacement;
  });
  if (matched) {
    onMatch();
  }
  return next;
}

function blocker(
  kind: TranscriptRedactionFindingKind,
  code: string
): TranscriptRedactionFinding {
  return finding(kind, "blocker", code);
}

function warning(
  kind: TranscriptRedactionFindingKind,
  code: string
): TranscriptRedactionFinding {
  return finding(kind, "warning", code);
}

function finding(
  kind: TranscriptRedactionFindingKind,
  severity: TranscriptRedactionFindingSeverity,
  code: string
): TranscriptRedactionFinding {
  return {
    findingId: "",
    kind,
    severity,
    code,
    safeMessage: code
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/^\w/, (match) => match.toUpperCase())
  };
}

function withIds(
  findings: TranscriptRedactionFinding[]
): TranscriptRedactionFinding[] {
  return findings.map((finding, index) => ({
    ...finding,
    findingId: finding.findingId || `transcript-redaction-${index + 1}`
  }));
}

function uniqueFindings(
  findings: TranscriptRedactionFinding[]
): TranscriptRedactionFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.kind}:${finding.severity}:${finding.code}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function byteCount(value: string): number {
  return new TextEncoder().encode(value).length;
}

function countLines(value: string): number {
  return value.length === 0 ? 0 : value.split(/\r\n|\r|\n/).length;
}

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(new RegExp(pattern.source, "g"))].length;
}

function countRedactionMarkers(value: string): number {
  return (value.match(/\[REDACTED_[A-Z_]+\]/g) ?? []).length;
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
