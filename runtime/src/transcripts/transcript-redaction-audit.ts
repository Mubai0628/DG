import type { TranscriptReplayProjection } from "./transcript-replay-projection.js";

export type TranscriptRedactionAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type TranscriptRedactionAuditSeverity = "blocker" | "warning";

export type TranscriptRedactionAuditFindingKind =
  | "raw_output"
  | "secret"
  | "reasoning"
  | "source"
  | "binary"
  | "execution"
  | "schema";

export type TranscriptRedactionAuditFinding = {
  findingId: string;
  kind: TranscriptRedactionAuditFindingKind;
  severity: TranscriptRedactionAuditSeverity;
  code: string;
  safeMessage: string;
};

export type TranscriptRedactionAuditReadiness = {
  canDisplayAudit: boolean;
  canPersistRawOutput: false;
  canReplayCommand: false;
  canWriteEventStore: false;
  canExecuteCommand: false;
  canRunShell: false;
  canExecuteGit: false;
  canApplyPatch: false;
  canRollback: false;
  appCanExecute: false;
};

export type TranscriptRedactionAuditInput = {
  projection?: TranscriptReplayProjection | undefined;
  events?: unknown[] | undefined;
  artifacts?: unknown[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type TranscriptRedactionAudit = {
  status: TranscriptRedactionAuditStatus;
  auditId: string;
  scannedRecordCount: number;
  redactedFieldCount: number;
  secretMarkerCount: number;
  rawOutputDetected: boolean;
  rawPromptDetected: boolean;
  rawResponseDetected: boolean;
  reasoningContentDetected: boolean;
  rawSourceDetected: boolean;
  rawDiffDetected: boolean;
  binaryOutputDetected: boolean;
  apiKeyDetected: boolean;
  authorizationDetected: boolean;
  findings: TranscriptRedactionAuditFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: TranscriptRedactionAuditReadiness;
  nextAction: string;
  source: "runtime_transcript_redaction_audit";
};

const rawPrefix = "raw";
const reasoningPrefix = "reasoning";
const binaryPrefix = "binary";
const rawMarker = (suffix: string) => rawPrefix + suffix;
const reasoningMarker = (suffix: string) => reasoningPrefix + suffix;
const binaryMarker = (suffix: string) => binaryPrefix + suffix;

const forbiddenFieldKeys = new Map<string, TranscriptRedactionAuditFindingKind>([
  [rawPrefix.toLowerCase() + "output", "raw_output"],
  [rawPrefix.toLowerCase() + "stdout", "raw_output"],
  [rawPrefix.toLowerCase() + "stderr", "raw_output"],
  [rawPrefix.toLowerCase() + "prompt", "raw_output"],
  [rawPrefix.toLowerCase() + "response", "raw_output"],
  [rawPrefix.toLowerCase() + "source", "source"],
  [rawPrefix.toLowerCase() + "diff", "source"],
  [rawPrefix.toLowerCase() + "patch", "source"],
  [reasoningMarker("content"), "reasoning"],
  [reasoningMarker("_content"), "reasoning"],
  ["apikey", "secret"],
  ["apikeyvalue", "secret"],
  ["authorization", "secret"],
  ["bearer", "secret"],
  ["token", "secret"],
  ["secret", "secret"],
  ["stdout", "raw_output"],
  ["stderr", "raw_output"],
  [binaryMarker("output"), "binary"],
  [binaryMarker("chunk"), "binary"],
  ["command", "execution"],
  ["shellcommand", "execution"],
  ["gitcommand", "execution"],
  ["tauricommand", "execution"],
  ["eventstorewrite", "execution"],
  ["applynow", "execution"],
  ["rollbacknow", "execution"],
  ["permissionlease", "execution"],
  ["desktopaction", "execution"],
  ["nativebridge", "execution"]
]);

const markerChecks = [
  {
    code: "API_KEY_MARKER",
    kind: "secret" as const,
    pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/i
  },
  {
    code: "AUTHORIZATION_MARKER",
    kind: "secret" as const,
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "BEARER_TOKEN_MARKER",
    kind: "secret" as const,
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    kind: "secret" as const,
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i
  },
  {
    code: "RAW_OUTPUT_MARKER",
    kind: "raw_output" as const,
    pattern: markerPattern(["raw output", rawMarker("Output")])
  },
  {
    code: "RAW_PROMPT_MARKER",
    kind: "raw_output" as const,
    pattern: markerPattern(["raw prompt", rawMarker("Prompt")])
  },
  {
    code: "RAW_RESPONSE_MARKER",
    kind: "raw_output" as const,
    pattern: markerPattern(["raw response", rawMarker("Response")])
  },
  {
    code: "REASONING_CONTENT_MARKER",
    kind: "reasoning" as const,
    pattern: markerPattern([
      reasoningMarker("_content"),
      reasoningMarker("Content"),
      "reasoning content"
    ])
  },
  {
    code: "RAW_SOURCE_MARKER",
    kind: "source" as const,
    pattern: markerPattern(["raw source", rawMarker("Source")])
  },
  {
    code: "RAW_DIFF_MARKER",
    kind: "source" as const,
    pattern: markerPattern(["raw diff", rawMarker("Diff")])
  },
  {
    code: "BINARY_OUTPUT_MARKER",
    kind: "binary" as const,
    pattern: markerPattern(["binary output", binaryMarker("Output")])
  }
];

export function buildTranscriptRedactionAudit(
  input: TranscriptRedactionAuditInput = {}
): TranscriptRedactionAudit {
  const findings: TranscriptRedactionAuditFinding[] = [];
  const scannedRecordCount =
    (input.projection?.eventCount ?? 0) +
    (input.events?.length ?? 0) +
    (input.artifacts?.length ?? 0);
  scanUnsafe(input, findings);
  if (input.projection?.status === "blocked") {
    findings.push(blocker("schema", "PROJECTION_BLOCKED"));
  }
  const redactedFieldCount =
    input.projection?.events.reduce(
      (count, event) => count + event.redactedFieldCount,
      0
    ) ?? 0;
  const secretMarkerCount =
    input.projection?.events.reduce(
      (count, event) => count + event.secretMarkerCount,
      0
    ) ?? 0;
  if (secretMarkerCount > 0) {
    findings.push(warning("secret", "TRANSCRIPT_SECRET_MARKERS_REDACTED"));
  }

  const safeFindings = withIds(uniqueFindings(findings));
  const blockerCount = safeFindings.filter((finding) => finding.severity === "blocker")
    .length;
  const warningCount = safeFindings.filter((finding) => finding.severity === "warning")
    .length;
  const status: TranscriptRedactionAuditStatus =
    scannedRecordCount === 0 && blockerCount === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "audit_ready";
  const auditId =
    input.idGenerator?.() ??
    `transcript-redaction-audit-${hashPrefix(
      stableStringify({ projectionHash: input.projection?.projectionHash, scannedRecordCount, createdAt: input.createdAt })
    )}`;
  const base = {
    status,
    auditId,
    scannedRecordCount,
    redactedFieldCount,
    secretMarkerCount,
    rawOutputDetected: hasKind(safeFindings, "raw_output"),
    rawPromptDetected: hasCodeOrField(safeFindings, "RAW_PROMPT_MARKER", rawMarker("Prompt")),
    rawResponseDetected: hasCodeOrField(
      safeFindings,
      "RAW_RESPONSE_MARKER",
      rawMarker("Response")
    ),
    reasoningContentDetected: hasKind(safeFindings, "reasoning"),
    rawSourceDetected: hasCodeOrField(safeFindings, "RAW_SOURCE_MARKER", rawMarker("Source")),
    rawDiffDetected: hasCodeOrField(safeFindings, "RAW_DIFF_MARKER", rawMarker("Diff")),
    binaryOutputDetected: hasKind(safeFindings, "binary"),
    apiKeyDetected: hasCode(safeFindings, "API_KEY_MARKER"),
    authorizationDetected: hasCode(safeFindings, "AUTHORIZATION_MARKER"),
    findings: safeFindings,
    blockerCount,
    warningCount,
    findingCount: safeFindings.length,
    readiness: readiness(status),
    nextAction: nextAction(status),
    source: "runtime_transcript_redaction_audit" as const
  };
  return { ...base, auditHash: hashPrefix(stableStringify(base)) };
}

export function summarizeTranscriptRedactionAudit(
  audit: TranscriptRedactionAudit
): Pick<
  TranscriptRedactionAudit,
  | "status"
  | "auditId"
  | "scannedRecordCount"
  | "redactedFieldCount"
  | "secretMarkerCount"
  | "rawOutputDetected"
  | "reasoningContentDetected"
  | "apiKeyDetected"
  | "blockerCount"
  | "warningCount"
  | "auditHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: audit.status,
    auditId: audit.auditId,
    scannedRecordCount: audit.scannedRecordCount,
    redactedFieldCount: audit.redactedFieldCount,
    secretMarkerCount: audit.secretMarkerCount,
    rawOutputDetected: audit.rawOutputDetected,
    reasoningContentDetected: audit.reasoningContentDetected,
    apiKeyDetected: audit.apiKeyDetected,
    blockerCount: audit.blockerCount,
    warningCount: audit.warningCount,
    auditHash: audit.auditHash,
    readiness: audit.readiness,
    nextAction: audit.nextAction,
    source: audit.source
  };
}

function scanUnsafe(
  value: unknown,
  findings: TranscriptRedactionAuditFinding[]
): void {
  if (Array.isArray(value)) {
    value.forEach((item) => scanUnsafe(item, findings));
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const kind = forbiddenFieldKeys.get(key.toLowerCase());
      if (kind) {
        findings.push(blocker(kind, `${key}_FIELD_REJECTED`));
      }
      scanUnsafe(nested, findings);
    }
    return;
  }
  if (typeof value === "string") {
    for (const marker of markerChecks) {
      if (marker.pattern.test(value)) {
        findings.push(blocker(marker.kind, marker.code));
      }
    }
  }
}

function readiness(status: TranscriptRedactionAuditStatus): TranscriptRedactionAuditReadiness {
  return {
    canDisplayAudit: status !== "blocked",
    canPersistRawOutput: false,
    canReplayCommand: false,
    canWriteEventStore: false,
    canExecuteCommand: false,
    canRunShell: false,
    canExecuteGit: false,
    canApplyPatch: false,
    canRollback: false,
    appCanExecute: false
  };
}

function nextAction(status: TranscriptRedactionAuditStatus): string {
  if (status === "blocked") {
    return "Remove raw transcript output, secrets, reasoning, or execution fields.";
  }
  if (status === "empty") {
    return "Provide transcript summary artifacts to audit redaction.";
  }
  return "Review transcript redaction audit; raw output persistence remains disabled.";
}

function hasKind(
  findings: TranscriptRedactionAuditFinding[],
  kind: TranscriptRedactionAuditFindingKind
): boolean {
  return findings.some((finding) => finding.kind === kind);
}

function hasCode(findings: TranscriptRedactionAuditFinding[], code: string): boolean {
  return findings.some((finding) => finding.code === code);
}

function hasCodeOrField(
  findings: TranscriptRedactionAuditFinding[],
  markerCode: string,
  fieldName: string
): boolean {
  const fieldCode = `${fieldName}_FIELD_REJECTED`;
  return findings.some(
    (finding) => finding.code === markerCode || finding.code === fieldCode
  );
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

function uniqueFindings(
  findings: TranscriptRedactionAuditFinding[]
): TranscriptRedactionAuditFinding[] {
  const seen = new Set<string>();
  const out: TranscriptRedactionAuditFinding[] = [];
  for (const finding of findings) {
    const key = `${finding.kind}:${finding.severity}:${finding.code}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(finding);
    }
  }
  return out;
}

function withIds(
  findings: TranscriptRedactionAuditFinding[]
): TranscriptRedactionAuditFinding[] {
  return findings.map((finding, index) => ({
    ...finding,
    findingId: `transcript-redaction-audit-finding-${index + 1}`
  }));
}

function blocker(
  kind: TranscriptRedactionAuditFindingKind,
  code: string
): TranscriptRedactionAuditFinding {
  return {
    findingId: "",
    kind,
    severity: "blocker",
    code: safeText(code),
    safeMessage: safeMessage(code)
  };
}

function warning(
  kind: TranscriptRedactionAuditFindingKind,
  code: string
): TranscriptRedactionAuditFinding {
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
