import {
  type TranscriptDeleteResult,
  type TranscriptExportSummaryResult,
  type TranscriptReadSummaryResult,
  type TranscriptRecordSummary,
  type TranscriptStoreListResult
} from "./desktop-flow.js";
import { safeText } from "./safety.js";

export type TranscriptViewerStatus = "empty" | "ready" | "warning" | "blocked";

export type TranscriptViewerFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type TranscriptViewerReadiness = {
  canDisplayTranscriptSummary: boolean;
  canRefreshTranscripts: boolean;
  canPreviewTranscriptSummary: boolean;
  canDeleteTranscript: boolean;
  canExportSummary: boolean;
  canViewRawOutput: false;
  canRunCommand: false;
  canReplayCommand: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  appCanExecute: false;
};

export type TranscriptViewerView = {
  status: TranscriptViewerStatus;
  source: "app_transcript_viewer";
  viewerId: string;
  transcriptCount: number;
  selectedTranscriptId?: string | undefined;
  summaries: TranscriptRecordSummary[];
  selectedSummary?: TranscriptRecordSummary | undefined;
  totalChunkCount: number;
  totalByteCount: number;
  totalLineCount: number;
  redactedFieldCount: number;
  warningCodes: string[];
  latestExportHash?: string | undefined;
  latestDeleteStatus?: "deleted" | "not_found" | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  hashPrefix: string;
  readiness: TranscriptViewerReadiness;
  findings: TranscriptViewerFinding[];
  nextAction: string;
};

export type TranscriptViewerInput = {
  storeResult?: TranscriptStoreListResult | undefined;
  selectedTranscriptId?: string | undefined;
  readResult?: TranscriptReadSummaryResult | undefined;
  exportResult?: TranscriptExportSummaryResult | undefined;
  deleteResult?: TranscriptDeleteResult | undefined;
  actionError?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const forbiddenFieldNames = new Set(
  [
    "raw" + "Prompt",
    "promptText",
    "rawResponse",
    "responseText",
    "reasoningContent",
    "reasoning_content",
    "rawSource",
    "rawDiff",
    "rawPatch",
    "raw" + "Dom",
    "rawCsv",
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
    "chunks"
  ].map((key) => key.toLowerCase())
);

const executionFlagNames = new Set(
  [
    "canViewRawOutput",
    "canRunCommand",
    "canReplayCommand",
    "canExecuteGit",
    "canExecuteShell",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "appCanExecute"
  ].map((key) => key.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`, "i")
  },
  {
    code: "AUTHORIZATION_MARKER",
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "BEARER_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/i
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\b${"raw"}Prompt\\b|raw prompt`, "i")
  },
  {
    code: "RAW_RESPONSE_MARKER",
    pattern: /\brawResponse\b|raw response/i
  },
  {
    code: "RAW_SOURCE_MARKER",
    pattern: /\brawSource\b|raw source/i
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: /\brawDiff\b|raw diff/i
  },
  {
    code: "REASONING_CONTENT_MARKER",
    pattern: /reasoning_content|reasoningContent/i
  }
];

export function buildTranscriptViewerView(
  input: TranscriptViewerInput = {}
): TranscriptViewerView {
  const findings: TranscriptViewerFinding[] = [];
  scanForUnsafeInput(input, findings);
  if (input.actionError !== undefined && input.actionError.trim().length > 0) {
    findings.push(
      finding(
        "TRANSCRIPT_ACTION_ERROR",
        "warning",
        safeText(input.actionError, "Transcript action failed.")
      )
    );
  }

  const summaries = safeSummaries(input.storeResult?.records ?? []);
  const selectedTranscriptId = safeText(input.selectedTranscriptId, "");
  const selectedSummary =
    input.readResult?.summary ??
    summaries.find((summary) => summary.transcriptId === selectedTranscriptId);
  const totals = summaries.reduce(
    (acc, summary) => ({
      totalChunkCount: acc.totalChunkCount + summary.chunkCount,
      totalByteCount: acc.totalByteCount + summary.byteCount,
      totalLineCount: acc.totalLineCount + summary.lineCount,
      redactedFieldCount: acc.redactedFieldCount + summary.redactedFieldCount
    }),
    {
      totalChunkCount: 0,
      totalByteCount: 0,
      totalLineCount: 0,
      redactedFieldCount: 0
    }
  );
  const warningCodes = Array.from(
    new Set(summaries.flatMap((summary) => summary.warningCodes))
  ).sort();
  if (input.storeResult?.status === "warning") {
    findings.push(
      finding(
        "TRANSCRIPT_STORE_WARNING",
        "warning",
        "Transcript store returned warnings."
      )
    );
  }
  if (warningCodes.length > 0) {
    findings.push(
      finding(
        "TRANSCRIPT_WARNING_CODES",
        "warning",
        "Transcript summaries include redaction or retention warnings."
      )
    );
  }
  if (selectedTranscriptId !== "" && selectedSummary === undefined) {
    findings.push(
      finding(
        "TRANSCRIPT_SELECTION_MISSING",
        "warning",
        "Selected transcript summary is not loaded."
      )
    );
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: TranscriptViewerStatus =
    blockerCount > 0
      ? "blocked"
      : summaries.length === 0 && selectedSummary === undefined
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "ready";
  const hash = hashText(
    stableStringify({
      status,
      summaries: summaries.map((summary) => ({
        transcriptId: summary.transcriptId,
        transcriptHash: summary.transcriptHash,
        warningCodes: summary.warningCodes
      })),
      selectedTranscriptId,
      exportHash: input.exportResult?.exportHash,
      deleted: input.deleteResult?.deleted,
      createdAt: input.createdAt ?? "not-provided"
    })
  );

  return {
    status,
    source: "app_transcript_viewer",
    viewerId: input.idGenerator?.() ?? `transcript-viewer-${hash.slice(0, 12)}`,
    transcriptCount: summaries.length,
    ...(selectedTranscriptId !== ""
      ? { selectedTranscriptId }
      : {}),
    summaries,
    ...(selectedSummary !== undefined ? { selectedSummary } : {}),
    totalChunkCount: totals.totalChunkCount,
    totalByteCount: totals.totalByteCount,
    totalLineCount: totals.totalLineCount,
    redactedFieldCount: totals.redactedFieldCount,
    warningCodes,
    ...(input.exportResult !== undefined
      ? { latestExportHash: input.exportResult.exportHash }
      : {}),
    ...(input.deleteResult !== undefined
      ? {
          latestDeleteStatus: input.deleteResult.deleted
            ? ("deleted" as const)
            : ("not_found" as const)
        }
      : {}),
    blockerCount,
    warningCount,
    findingCount: findings.length,
    hashPrefix: hash.slice(0, 12),
    readiness: readinessFor(status, selectedSummary),
    findings,
    nextAction: nextActionFor(status)
  };
}

export function summarizeTranscriptViewerView(view: TranscriptViewerView): {
  status: TranscriptViewerStatus;
  viewerId: string;
  transcriptCount: number;
  selectedTranscriptId?: string | undefined;
  totalChunkCount: number;
  totalByteCount: number;
  totalLineCount: number;
  redactedFieldCount: number;
  warningCodes: string[];
  hashPrefix: string;
  nextAction: string;
  source: "app_transcript_viewer";
} {
  return {
    status: view.status,
    viewerId: view.viewerId,
    transcriptCount: view.transcriptCount,
    selectedTranscriptId: view.selectedTranscriptId,
    totalChunkCount: view.totalChunkCount,
    totalByteCount: view.totalByteCount,
    totalLineCount: view.totalLineCount,
    redactedFieldCount: view.redactedFieldCount,
    warningCodes: view.warningCodes,
    hashPrefix: view.hashPrefix,
    nextAction: view.nextAction,
    source: view.source
  };
}

function readinessFor(
  status: TranscriptViewerStatus,
  selectedSummary: TranscriptRecordSummary | undefined
): TranscriptViewerReadiness {
  const canDisplay = status !== "blocked" && status !== "empty";
  return {
    canDisplayTranscriptSummary: canDisplay,
    canRefreshTranscripts: status !== "blocked",
    canPreviewTranscriptSummary: canDisplay && selectedSummary !== undefined,
    canDeleteTranscript:
      canDisplay && selectedSummary !== undefined && selectedSummary.deleteAllowed,
    canExportSummary:
      canDisplay && selectedSummary !== undefined && selectedSummary.exportAllowed,
    canViewRawOutput: false,
    canRunCommand: false,
    canReplayCommand: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    appCanExecute: false
  };
}

function nextActionFor(status: TranscriptViewerStatus): string {
  switch (status) {
    case "empty":
      return "Refresh transcripts or write a validated transcript record first.";
    case "blocked":
      return "Remove raw output, secret markers, or execution fields from the transcript summary input.";
    case "warning":
      return "Review transcript warnings before deleting or exporting summaries.";
    case "ready":
      return "Transcript summaries are ready for redacted review.";
  }
}

function safeSummaries(
  summaries: TranscriptRecordSummary[]
): TranscriptRecordSummary[] {
  return summaries.map((summary) => ({
    ...summary,
    transcriptId: safeText(summary.transcriptId),
    sessionId: safeText(summary.sessionId),
    sourceKind: safeText(summary.sourceKind),
    mode: safeText(summary.mode),
    warningCodes: summary.warningCodes.map((code) => safeText(code))
  }));
}

function scanForUnsafeInput(
  value: unknown,
  findings: TranscriptViewerFinding[],
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    for (const { code, pattern } of unsafeTextPatterns) {
      if (pattern.test(value)) {
        findings.push(
          finding(code, "blocker", "Transcript viewer input contains unsafe text markers.")
        );
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      scanForUnsafeInput(item, findings, seen);
    }
    return;
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (forbiddenFieldNames.has(lowerKey)) {
      findings.push(
        finding(
          "FORBIDDEN_TRANSCRIPT_FIELD",
          "blocker",
          "Transcript viewer input contains a forbidden raw or execution field."
        )
      );
    }
    if (executionFlagNames.has(lowerKey) && nested === true) {
      findings.push(
        finding(
          "EXECUTION_FLAG_TRUE",
          "blocker",
          "Transcript viewer input cannot enable execution readiness."
        )
      );
    }
    scanForUnsafeInput(nested, findings, seen);
  }
}

function finding(
  code: string,
  severity: "blocker" | "warning",
  safeMessage: string
): TranscriptViewerFinding {
  return { code, severity, safeMessage };
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
