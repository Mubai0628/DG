import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ExternalCapabilityReplayCompletenessStatus =
  | "replay_ready"
  | "warning"
  | "blocked"
  | "empty";

export type ExternalCapabilityReplayCompletenessSeverity =
  | "blocker"
  | "warning";

export type ExternalCapabilityReplayCompletenessFindingKind =
  | "result"
  | "descriptor"
  | "source"
  | "risk"
  | "policy"
  | "redaction"
  | "event"
  | "replay"
  | "raw_field"
  | "secret"
  | "execution";

export type ExternalCapabilityReplayCompletenessFinding = {
  findingId: string;
  kind: ExternalCapabilityReplayCompletenessFindingKind;
  severity: ExternalCapabilityReplayCompletenessSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ExternalCapabilityReplayResultSummary = {
  resultId?: string | undefined;
  descriptorRef?: string | undefined;
  descriptorId?: string | undefined;
  sourceType?: string | undefined;
  riskSummary?: string | Record<string, unknown> | undefined;
  riskLevel?: string | undefined;
  requiresApproval?: boolean | undefined;
  policySummaryPresent?: boolean | undefined;
  approvalSummaryPresent?: boolean | undefined;
  leaseSummaryPresent?: boolean | undefined;
  redactionSummaryPresent?: boolean | undefined;
  eventWritten?: boolean | undefined;
  eventSummaryPresent?: boolean | undefined;
  replayProjectionIncludesResult?: boolean | undefined;
  warningCodes?: string[] | undefined;
  [key: string]: unknown;
};

export type ExternalCapabilityReplayCompletenessInput = {
  results?: ExternalCapabilityReplayResultSummary[] | undefined;
  replayProjection?: { resultIds?: string[]; [key: string]: unknown } | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  [key: string]: unknown;
};

export type ExternalCapabilityReplayCompletenessReadiness = {
  canReplayExternalCapabilitySummary: boolean;
  canReplayRawOutput: false;
  canExecuteExternalCapability: false;
  canWriteEventStoreRaw: false;
  canPersistRawArgs: false;
  canPersistRawOutput: false;
  canUseNativeBridge: false;
  canExecuteDesktopAction: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ExternalCapabilityReplayCompletenessReport = {
  status: ExternalCapabilityReplayCompletenessStatus;
  completenessId: string;
  source: "runtime_external_capability_replay_completeness";
  resultCount: number;
  descriptorRefCount: number;
  sourceTypeCounts: Record<string, number>;
  approvalRequiredCount: number;
  redactionSummaryCount: number;
  eventSummaryCount: number;
  replayProjectionCount: number;
  missingReplayCount: number;
  findings: ExternalCapabilityReplayCompletenessFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  completenessHash: string;
  readiness: ExternalCapabilityReplayCompletenessReadiness;
  nextAction: string;
};

const forbiddenFieldCodes = new Map<
  string,
  { kind: ExternalCapabilityReplayCompletenessFindingKind; code: string }
>([
  ["rawargs", { kind: "raw_field", code: "RAW_ARGS_FIELD_REJECTED" }],
  ["rawarguments", { kind: "raw_field", code: "RAW_ARGS_FIELD_REJECTED" }],
  ["rawoutput", { kind: "raw_field", code: "RAW_OUTPUT_FIELD_REJECTED" }],
  ["rawtooloutput", { kind: "raw_field", code: "RAW_OUTPUT_FIELD_REJECTED" }],
  ["rawpackagecontent", { kind: "raw_field", code: "RAW_PACKAGE_CONTENT_REJECTED" }],
  ["rawsource", { kind: "raw_field", code: "RAW_SOURCE_FIELD_REJECTED" }],
  ["stdout", { kind: "raw_field", code: "RAW_STDOUT_FIELD_REJECTED" }],
  ["stderr", { kind: "raw_field", code: "RAW_STDERR_FIELD_REJECTED" }],
  ["apikey", { kind: "secret", code: "API_KEY_FIELD_REJECTED" }],
  ["apikeyvalue", { kind: "secret", code: "API_KEY_FIELD_REJECTED" }],
  ["authorization", { kind: "secret", code: "AUTHORIZATION_FIELD_REJECTED" }],
  ["bearer", { kind: "secret", code: "BEARER_FIELD_REJECTED" }],
  ["token", { kind: "secret", code: "TOKEN_FIELD_REJECTED" }],
  ["secret", { kind: "secret", code: "SECRET_FIELD_REJECTED" }],
  ["command", { kind: "execution", code: "COMMAND_FIELD_REJECTED" }],
  ["shellcommand", { kind: "execution", code: "SHELL_COMMAND_FIELD_REJECTED" }],
  ["gitcommand", { kind: "execution", code: "GIT_COMMAND_FIELD_REJECTED" }],
  ["nativebridge", { kind: "execution", code: "NATIVE_BRIDGE_FIELD_REJECTED" }],
  ["desktopaction", { kind: "execution", code: "DESKTOP_ACTION_FIELD_REJECTED" }],
  ["eventstorewrite", { kind: "execution", code: "EVENTSTORE_WRITE_FIELD_REJECTED" }]
]);

const executionReadinessKeys = new Set(
  [
    "canReplayRawOutput",
    "canExecuteExternalCapability",
    "canWriteEventStoreRaw",
    "canPersistRawArgs",
    "canPersistRawOutput",
    "canUseNativeBridge",
    "canExecuteDesktopAction",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute"
  ].map((key) => key.toLowerCase())
);

const secretPatterns = [
  {
    code: "API_KEY_MARKER_REJECTED",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER_REJECTED",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/
  },
  {
    code: "AUTHORIZATION_MARKER_REJECTED",
    pattern: /\bAuthorization\s*[:=]/i
  }
];

export function buildExternalCapabilityReplayCompletenessReport(
  input: ExternalCapabilityReplayCompletenessInput = {}
): ExternalCapabilityReplayCompletenessReport {
  const findings = validateExternalCapabilityReplayCompleteness(input);
  const results = Array.isArray(input.results) ? input.results : [];
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: ExternalCapabilityReplayCompletenessStatus =
    results.length === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "replay_ready";
  const sourceTypeCounts = results.reduce<Record<string, number>>(
    (counts, result) => {
      const sourceType = safeText(result.sourceType) || "unknown";
      counts[sourceType] = (counts[sourceType] ?? 0) + 1;
      return counts;
    },
    {}
  );
  const completenessHash = stablePreviewHash(
    stableStringify({
      status,
      resultRefs: results.map((result) => safeResultRef(result)),
      findingCodes: findings.map((finding) => finding.code).sort()
    })
  );
  const completenessId =
    input.idGenerator?.() ??
    `external-replay-completeness-${completenessHash.slice(0, 12)}`;

  return {
    status,
    completenessId,
    source: "runtime_external_capability_replay_completeness",
    resultCount: results.length,
    descriptorRefCount: new Set(
      results
        .map((result) => descriptorRef(result))
        .filter((ref) => ref.length > 0)
    ).size,
    sourceTypeCounts,
    approvalRequiredCount: results.filter(
      (result) => result.requiresApproval === true
    ).length,
    redactionSummaryCount: results.filter(
      (result) => result.redactionSummaryPresent === true
    ).length,
    eventSummaryCount: results.filter(
      (result) => result.eventSummaryPresent === true
    ).length,
    replayProjectionCount: results.filter((result) =>
      replayIncludesResult(input, result)
    ).length,
    missingReplayCount: results.filter(
      (result) => !replayIncludesResult(input, result)
    ).length,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    completenessHash,
    readiness: readinessFor(status !== "blocked" && status !== "empty"),
    nextAction: nextActionFor(status)
  };
}

export function summarizeExternalCapabilityReplayCompleteness(
  report: ExternalCapabilityReplayCompletenessReport
): Pick<
  ExternalCapabilityReplayCompletenessReport,
  | "status"
  | "completenessId"
  | "resultCount"
  | "descriptorRefCount"
  | "sourceTypeCounts"
  | "approvalRequiredCount"
  | "redactionSummaryCount"
  | "eventSummaryCount"
  | "replayProjectionCount"
  | "missingReplayCount"
  | "blockerCount"
  | "warningCount"
  | "completenessHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: report.status,
    completenessId: report.completenessId,
    resultCount: report.resultCount,
    descriptorRefCount: report.descriptorRefCount,
    sourceTypeCounts: report.sourceTypeCounts,
    approvalRequiredCount: report.approvalRequiredCount,
    redactionSummaryCount: report.redactionSummaryCount,
    eventSummaryCount: report.eventSummaryCount,
    replayProjectionCount: report.replayProjectionCount,
    missingReplayCount: report.missingReplayCount,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    completenessHash: report.completenessHash,
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: report.source
  };
}

export function validateExternalCapabilityReplayCompleteness(
  input: ExternalCapabilityReplayCompletenessInput = {}
): ExternalCapabilityReplayCompletenessFinding[] {
  const findings: ExternalCapabilityReplayCompletenessFinding[] = [];
  scanUnsafeInput(input, findings);
  const results = Array.isArray(input.results) ? input.results : [];
  if (results.length === 0) {
    addFinding(
      findings,
      "result",
      "warning",
      "RESULT_SUMMARY_MISSING",
      "No external capability result summaries were provided."
    );
  }
  const seenResultIds = new Set<string>();
  results.forEach((result, index) => {
    validateResult(input, result, index, findings, seenResultIds);
  });
  return dedupeFindings(findings);
}

function validateResult(
  input: ExternalCapabilityReplayCompletenessInput,
  result: ExternalCapabilityReplayResultSummary,
  index: number,
  findings: ExternalCapabilityReplayCompletenessFinding[],
  seenResultIds: Set<string>
): void {
  const path = `results.${index}`;
  const resultId = safeText(result.resultId);
  if (resultId.length === 0) {
    addFinding(
      findings,
      "result",
      "blocker",
      "RESULT_ID_MISSING",
      "External capability result summary requires a result id.",
      `${path}.resultId`
    );
  } else if (seenResultIds.has(resultId)) {
    addFinding(
      findings,
      "result",
      "blocker",
      "DUPLICATE_RESULT_ID",
      "External capability result ids must be unique.",
      `${path}.resultId`
    );
  }
  seenResultIds.add(resultId);

  if (descriptorRef(result).length === 0) {
    addFinding(
      findings,
      "descriptor",
      "blocker",
      "DESCRIPTOR_REF_MISSING",
      "External capability result summary requires a descriptor ref.",
      `${path}.descriptorRef`
    );
  }
  if (safeText(result.sourceType).length === 0) {
    addFinding(
      findings,
      "source",
      "blocker",
      "SOURCE_TYPE_MISSING",
      "External capability result summary requires a source type.",
      `${path}.sourceType`
    );
  }
  if (!riskSummaryPresent(result)) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "RISK_SUMMARY_MISSING",
      "External capability result summary requires a risk summary.",
      `${path}.riskSummary`
    );
  }
  if (result.requiresApproval === true) {
    if (result.policySummaryPresent !== true) {
      addFinding(
        findings,
        "policy",
        "blocker",
        "POLICY_SUMMARY_MISSING",
        "Approval-required results require policy summary evidence.",
        `${path}.policySummaryPresent`
      );
    }
    if (result.approvalSummaryPresent !== true) {
      addFinding(
        findings,
        "policy",
        "blocker",
        "APPROVAL_SUMMARY_MISSING",
        "Approval-required results require approval summary evidence.",
        `${path}.approvalSummaryPresent`
      );
    }
    if (result.leaseSummaryPresent !== true) {
      addFinding(
        findings,
        "policy",
        "blocker",
        "LEASE_SUMMARY_MISSING",
        "Approval-required results require PermissionLease summary evidence.",
        `${path}.leaseSummaryPresent`
      );
    }
  }
  if (result.redactionSummaryPresent !== true) {
    addFinding(
      findings,
      "redaction",
      "blocker",
      "REDACTION_SUMMARY_MISSING",
      "External capability result summary requires redaction summary evidence.",
      `${path}.redactionSummaryPresent`
    );
  }
  if (result.eventWritten === true && result.eventSummaryPresent !== true) {
    addFinding(
      findings,
      "event",
      "blocker",
      "EVENT_SUMMARY_MISSING_FOR_WRITTEN_EVENT",
      "Written external capability events require summary evidence.",
      `${path}.eventSummaryPresent`
    );
  }
  if (!replayIncludesResult(input, result)) {
    addFinding(
      findings,
      "replay",
      "blocker",
      "REPLAY_PROJECTION_MISSING_RESULT",
      "Replay projection must include the external capability result summary.",
      `${path}.replayProjectionIncludesResult`
    );
  }
}

function riskSummaryPresent(
  result: ExternalCapabilityReplayResultSummary
): boolean {
  if (safeText(result.riskLevel).length > 0) {
    return true;
  }
  if (typeof result.riskSummary === "string") {
    return result.riskSummary.trim().length > 0;
  }
  return isRecord(result.riskSummary) && Object.keys(result.riskSummary).length > 0;
}

function replayIncludesResult(
  input: ExternalCapabilityReplayCompletenessInput,
  result: ExternalCapabilityReplayResultSummary
): boolean {
  if (result.replayProjectionIncludesResult === true) {
    return true;
  }
  const resultId = safeText(result.resultId);
  return (
    resultId.length > 0 &&
    Array.isArray(input.replayProjection?.resultIds) &&
    input.replayProjection.resultIds.includes(resultId)
  );
}

function descriptorRef(result: ExternalCapabilityReplayResultSummary): string {
  return safeText(result.descriptorRef) || safeText(result.descriptorId);
}

function safeResultRef(
  result: ExternalCapabilityReplayResultSummary
): Record<string, unknown> {
  return {
    resultId: result.resultId,
    descriptorRef: descriptorRef(result),
    sourceType: result.sourceType,
    riskLevel: result.riskLevel,
    warningCodes: Array.isArray(result.warningCodes)
      ? result.warningCodes.slice().sort()
      : []
  };
}

function scanUnsafeInput(
  value: unknown,
  findings: ExternalCapabilityReplayCompletenessFinding[],
  path = "$",
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    for (const { code, pattern } of secretPatterns) {
      if (pattern.test(value)) {
        addFinding(
          findings,
          "secret",
          "blocker",
          code,
          "Secret-like marker is not allowed in replay completeness inputs.",
          path
        );
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeInput(item, findings, `${path}.${index}`, seen)
    );
    return;
  }
  if (!isRecord(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    const normalizedKey = key.toLowerCase();
    const forbidden = forbiddenFieldCodes.get(normalizedKey);
    if (forbidden !== undefined) {
      addFinding(
        findings,
        forbidden.kind,
        "blocker",
        forbidden.code,
        "Raw payload, command, EventStore, or secret fields are not allowed.",
        childPath
      );
    }
    if (executionReadinessKeys.has(normalizedKey) && child === true) {
      addFinding(
        findings,
        "execution",
        "blocker",
        "EXECUTION_READINESS_FLAG_TRUE",
        "Replay completeness input cannot claim execution readiness.",
        childPath
      );
    }
    scanUnsafeInput(child, findings, childPath, seen);
  }
}

function readinessFor(
  canReplaySummary: boolean
): ExternalCapabilityReplayCompletenessReadiness {
  return {
    canReplayExternalCapabilitySummary: canReplaySummary,
    canReplayRawOutput: false,
    canExecuteExternalCapability: false,
    canWriteEventStoreRaw: false,
    canPersistRawArgs: false,
    canPersistRawOutput: false,
    canUseNativeBridge: false,
    canExecuteDesktopAction: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionFor(
  status: ExternalCapabilityReplayCompletenessStatus
): string {
  if (status === "blocked") {
    return "Resolve replay completeness blockers before external capability audit.";
  }
  if (status === "warning") {
    return "Review replay completeness warnings; raw replay remains disabled.";
  }
  if (status === "empty") {
    return "Provide external capability result summaries before replay completeness review.";
  }
  return "External capability summaries are ready for replay/audit projection.";
}

function addFinding(
  findings: ExternalCapabilityReplayCompletenessFinding[],
  kind: ExternalCapabilityReplayCompletenessFindingKind,
  severity: ExternalCapabilityReplayCompletenessSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `external-replay-${severity}-${code.toLowerCase()}-${stablePreviewHash(
      `${path ?? "root"}:${code}`
    ).slice(0, 12)}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined && path.length > 0 ? { path } : {})
  });
}

function dedupeFindings(
  findings: ExternalCapabilityReplayCompletenessFinding[]
): ExternalCapabilityReplayCompletenessFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.severity}:${finding.kind}:${finding.code}:${finding.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => key !== "idGenerator")
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
