import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopActionExpansionProposalInput =
  | Record<string, unknown>
  | string
  | unknown;

export type DesktopActionKind =
  | "click_target"
  | "type_text"
  | "select_option"
  | "keyboard_shortcut"
  | "clipboard_write"
  | "file_dialog_select"
  | "drag_drop"
  | "scroll"
  | "wait_for_state";

export type DesktopActionObserverEvidenceRef = {
  evidenceRefId: string;
  observedAt: string;
  summary: string;
  windowIdHash?: string | undefined;
  appIdHash?: string | undefined;
  displayIdHash?: string | undefined;
  targetHash?: string | undefined;
  warningCodes?: string[] | undefined;
  redactionCodes?: string[] | undefined;
};

export type DesktopActionTargetSummary = {
  targetId: string;
  targetKind:
    | "window"
    | "control"
    | "button"
    | "text_field"
    | "menu_item"
    | "screen_region"
    | "dialog"
    | "file_dialog"
    | "clipboard";
  labelSummary?: string | undefined;
  appNameSummary?: string | undefined;
  windowTitleSummary?: string | undefined;
  role?: string | undefined;
  confidence?: number | undefined;
  windowIdHash?: string | undefined;
  appIdHash?: string | undefined;
  displayIdHash?: string | undefined;
  boundsHash?: string | undefined;
  boundsSummary?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type DesktopActionExpectedEffect = {
  summary: string;
  visibleStateChangeSummary?: string | undefined;
  successConditionSummary?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type DesktopActionProposalFindingSeverity = "blocker" | "warning";

export type DesktopActionProposalFindingKind =
  | "schema"
  | "action_kind"
  | "observer_evidence"
  | "target"
  | "expected_effect"
  | "risk"
  | "stale_evidence"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "clipboard"
  | "file_dialog"
  | "readiness";

export type DesktopActionProposalFinding = {
  findingId: string;
  kind: DesktopActionProposalFindingKind;
  severity: DesktopActionProposalFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionProposalReadiness = {
  canEnterFreshnessValidation: boolean;
  canEnterRiskClassification: boolean;
  canEnterSequenceSimulation: boolean;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canSelect: false;
  canUseKeyboardShortcut: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canDragDrop: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionExpansionProposal = {
  schemaVersion: "desktop_action_expansion_proposal.v1";
  proposalId: string;
  actionKind: DesktopActionKind;
  objectiveSummary: string;
  observerEvidenceRef: DesktopActionObserverEvidenceRef;
  targetSummary: DesktopActionTargetSummary;
  expectedEffect: DesktopActionExpectedEffect;
  riskNotes: string[];
  createdAt: string;
  proposalHash: string;
  source: "runtime_desktop_action_expansion_proposal";
};

export type DesktopActionExpansionProposalStatus =
  | "parsed"
  | "warning"
  | "blocked";

export type DesktopActionExpansionProposalSummary = {
  status: DesktopActionExpansionProposalStatus;
  proposalId?: string | undefined;
  actionKind?: DesktopActionKind | undefined;
  objectiveSummary?: string | undefined;
  observerEvidenceRefId?: string | undefined;
  targetId?: string | undefined;
  targetKind?: DesktopActionTargetSummary["targetKind"] | undefined;
  expectedEffectSummary?: string | undefined;
  riskNoteCount: number;
  warningCodes: string[];
  blockerCodes: string[];
  proposalHash?: string | undefined;
  summaryOnly: true;
};

export type DesktopActionExpansionProposalValidationResult = {
  status: DesktopActionExpansionProposalStatus;
  proposal?: DesktopActionExpansionProposal | undefined;
  summary: DesktopActionExpansionProposalSummary;
  findings: DesktopActionProposalFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  proposalHash?: string | undefined;
  readiness: DesktopActionProposalReadiness;
  nextAction: string;
  source: "runtime_desktop_action_expansion_proposal";
};

type IdGenerator = () => string;

const actionKinds = new Set<DesktopActionKind>([
  "click_target",
  "type_text",
  "select_option",
  "keyboard_shortcut",
  "clipboard_write",
  "file_dialog_select",
  "drag_drop",
  "scroll",
  "wait_for_state"
]);

const targetKinds = new Set<DesktopActionTargetSummary["targetKind"]>([
  "window",
  "control",
  "button",
  "text_field",
  "menu_item",
  "screen_region",
  "dialog",
  "file_dialog",
  "clipboard"
]);

const forbiddenFieldKeys = new Set(
  [
    "rawScreenshot",
    "screenshotBytes",
    "rawOcrText",
    "rawPrompt",
    "rawResponse",
    "rawSource",
    "rawDiff",
    "apiKey",
    "Authorization",
    "bearer",
    "token",
    "password",
    "secret",
    "clipboardContent",
    "fileContent",
    "desktopCommand",
    "nativeBridge",
    "clickNow",
    "typeNow",
    "executeNow",
    "eventStoreWrite",
    "shellCommand",
    "gitCommand"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canSelect",
    "canUseKeyboardShortcut",
    "canWriteClipboard",
    "canOpenFileDialog",
    "canDragDrop",
    "canWriteEventStore",
    "canUseNativeBridge",
    "appCanExecute",
    "clickNow",
    "typeNow",
    "executeNow"
  ].map((key) => key.toLowerCase())
);

const secretMarkers = [
  "sk-",
  "Bearer ",
  "Authorization",
  "BEGIN PRIVATE KEY",
  "PASSWORD_VALUE_MARKER",
  "DEEPSEEK_API_KEY",
  "OPENAI_API_KEY"
];

const rawMarkers = [
  "RAW_SCREENSHOT",
  "SCREENSHOT_BYTES",
  "RAW_OCR",
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF",
  "CLIPBOARD_CONTENT"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value
    .map((item) => readString(item))
    .filter((item): item is string => Boolean(item));
  return strings.length > 0 ? strings : undefined;
}

function readIdGenerator(value: unknown): IdGenerator | undefined {
  return typeof value === "function" ? (value as IdGenerator) : undefined;
}

function finding(
  kind: DesktopActionProposalFindingKind,
  severity: DesktopActionProposalFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionProposalFinding {
  return {
    findingId: stablePreviewHash(
      JSON.stringify({ kind, severity, code, path: path || "" })
    ).slice(0, 16),
    kind,
    severity,
    code,
    safeMessage,
    ...(path ? { path } : {})
  };
}

function readiness(
  canEnterPreview: boolean
): DesktopActionProposalReadiness {
  return {
    canEnterFreshnessValidation: canEnterPreview,
    canEnterRiskClassification: canEnterPreview,
    canEnterSequenceSimulation: canEnterPreview,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canSelect: false,
    canUseKeyboardShortcut: false,
    canWriteClipboard: false,
    canOpenFileDialog: false,
    canDragDrop: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function parseInput(input: DesktopActionExpansionProposalInput): {
  record?: Record<string, unknown>;
  findings: DesktopActionProposalFinding[];
} {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (!isRecord(parsed)) {
        return {
          findings: [
            finding(
              "schema",
              "blocker",
              "JSON_NOT_OBJECT",
              "Desktop action expansion proposal JSON must be an object."
            )
          ]
        };
      }
      return { record: parsed, findings: [] };
    } catch {
      return {
        findings: [
          finding(
            "schema",
            "blocker",
            "MALFORMED_JSON",
            "Desktop action expansion proposal JSON could not be parsed."
          )
        ]
      };
    }
  }

  if (!isRecord(input)) {
    return {
      findings: [
        finding(
          "schema",
          "blocker",
          "INPUT_NOT_OBJECT",
          "Desktop action expansion proposal input must be an object."
        )
      ]
    };
  }

  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopActionProposalFinding[]
): void {
  if (typeof value === "string") {
    if (secretMarkers.some((marker) => value.includes(marker))) {
      findings.push(
        finding(
          "secret",
          "blocker",
          "SECRET_MARKER",
          "Secret-like marker is not allowed.",
          path
        )
      );
    }
    if (rawMarkers.some((marker) => value.includes(marker))) {
      findings.push(
        finding(
          "raw_field",
          "blocker",
          "RAW_MARKER",
          "Raw screenshot, OCR, prompt, response, source, diff, or clipboard marker is not allowed.",
          path
        )
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeFields(item, `${path}[${index}]`, findings)
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const normalizedKey = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalizedKey)) {
      findings.push(
        finding(
          normalizedKey.includes("clipboard")
            ? "clipboard"
            : normalizedKey.includes("click") ||
                normalizedKey.includes("type") ||
                normalizedKey.includes("execute")
              ? "execution_field"
              : "raw_field",
          "blocker",
          "FORBIDDEN_FIELD",
          "Forbidden raw, secret, clipboard, native bridge, or execution field is not allowed.",
          childPath
        )
      );
    }
    if (executionBooleanKeys.has(normalizedKey) && child === true) {
      findings.push(
        finding(
          "execution_field",
          "blocker",
          "EXECUTION_FLAG_TRUE",
          "Expanded desktop action readiness flags must remain false.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function isDesktopActionKind(value: unknown): value is DesktopActionKind {
  return (
    typeof value === "string" && actionKinds.has(value as DesktopActionKind)
  );
}

function isTargetKind(
  value: unknown
): value is DesktopActionTargetSummary["targetKind"] {
  return (
    typeof value === "string" &&
    targetKinds.has(value as DesktopActionTargetSummary["targetKind"])
  );
}

function isUnsafePath(value: string): boolean {
  return (
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.startsWith("/") ||
    value.startsWith("\\\\") ||
    value.includes("..") ||
    /(^|[\\/])\.git([\\/]|$)/i.test(value) ||
    /(^|[\\/])\.env($|[\\/])/i.test(value) ||
    /(^|[\\/])(node_modules|dist|target|\.tmp)([\\/]|$)/i.test(value)
  );
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

function isVagueExpectedEffect(summary: string): boolean {
  return /^(do it|works?|changes?|updates?|clicks?|types?)\.?$/i.test(
    summary.trim()
  );
}

function hasMultiStepText(value: string): boolean {
  return /\bthen\b|\bafter that\b|\band then\b|;/.test(value.toLowerCase());
}

function hasSensitiveAppName(value: string | undefined): boolean {
  return Boolean(value && /bank|wallet|password|security|payment/i.test(value));
}

function hasPasswordLikeLabel(value: string | undefined): boolean {
  return Boolean(value && /password|passcode|secret|token|api key/i.test(value));
}

function hasDestructiveLabel(value: string | undefined): boolean {
  return Boolean(value && /delete|remove|wipe|reset|destroy|discard/i.test(value));
}

function isStaleEvidence(
  observedAt: string,
  createdAt: string,
  freshnessThresholdMs: number
): boolean {
  const observed = Date.parse(observedAt);
  const created = Date.parse(createdAt);
  if (!Number.isFinite(observed) || !Number.isFinite(created)) {
    return false;
  }
  return created - observed > freshnessThresholdMs;
}

function normalizeObserverEvidenceRef(
  value: unknown,
  findings: DesktopActionProposalFinding[]
): DesktopActionObserverEvidenceRef | undefined {
  if (!isRecord(value)) {
    findings.push(
      finding(
        "observer_evidence",
        "blocker",
        "MISSING_OBSERVER_EVIDENCE",
        "Observer evidence ref is required.",
        "observerEvidenceRef"
      )
    );
    return undefined;
  }

  const evidenceRefId =
    readString(value.evidenceRefId) || readString(value.refId);
  const observedAt = readString(value.observedAt);
  const summary = readString(value.summary);
  if (!evidenceRefId) {
    findings.push(
      finding(
        "observer_evidence",
        "blocker",
        "MISSING_OBSERVER_EVIDENCE_ID",
        "Observer evidence ref requires an id.",
        "observerEvidenceRef.evidenceRefId"
      )
    );
  }
  if (!observedAt) {
    findings.push(
      finding(
        "observer_evidence",
        "blocker",
        "MISSING_OBSERVED_AT",
        "Observer evidence ref requires observedAt.",
        "observerEvidenceRef.observedAt"
      )
    );
  }
  if (!summary) {
    findings.push(
      finding(
        "observer_evidence",
        "blocker",
        "MISSING_OBSERVER_EVIDENCE_SUMMARY",
        "Observer evidence ref requires a summary.",
        "observerEvidenceRef.summary"
      )
    );
  }
  if (!evidenceRefId || !observedAt || !summary) {
    return undefined;
  }

  return {
    evidenceRefId,
    observedAt,
    summary,
    ...(readString(value.windowIdHash)
      ? { windowIdHash: readString(value.windowIdHash) }
      : {}),
    ...(readString(value.appIdHash)
      ? { appIdHash: readString(value.appIdHash) }
      : {}),
    ...(readString(value.displayIdHash)
      ? { displayIdHash: readString(value.displayIdHash) }
      : {}),
    ...(readString(value.targetHash)
      ? { targetHash: readString(value.targetHash) }
      : {}),
    ...(readStringArray(value.warningCodes)
      ? { warningCodes: readStringArray(value.warningCodes) }
      : {}),
    ...(readStringArray(value.redactionCodes)
      ? { redactionCodes: readStringArray(value.redactionCodes) }
      : {})
  };
}

function normalizeTargetSummary(
  value: unknown,
  findings: DesktopActionProposalFinding[]
): DesktopActionTargetSummary | undefined {
  if (!isRecord(value)) {
    findings.push(
      finding(
        "target",
        "blocker",
        "MISSING_TARGET_SUMMARY",
        "Target summary is required.",
        "targetSummary"
      )
    );
    return undefined;
  }

  const targetId = readString(value.targetId);
  const targetKind = readString(value.targetKind);
  if (!targetId) {
    findings.push(
      finding(
        "target",
        "blocker",
        "MISSING_TARGET_ID",
        "Target summary requires targetId.",
        "targetSummary.targetId"
      )
    );
  }
  if (!isTargetKind(targetKind)) {
    findings.push(
      finding(
        "target",
        "blocker",
        "UNSUPPORTED_TARGET_KIND",
        "Target kind is not supported for expanded desktop action proposals.",
        "targetSummary.targetKind"
      )
    );
  }
  if (!targetId || !isTargetKind(targetKind)) {
    return undefined;
  }

  const confidence = readNumber(value.confidence);
  const labelSummary = readString(value.labelSummary);
  const appNameSummary = readString(value.appNameSummary);

  if (!readString(value.displayIdHash)) {
    findings.push(
      finding(
        "target",
        "warning",
        "MISSING_DISPLAY_ID",
        "Target summary should include display id hash.",
        "targetSummary.displayIdHash"
      )
    );
  }
  if (!readString(value.windowIdHash)) {
    findings.push(
      finding(
        "target",
        "warning",
        "MISSING_WINDOW_ID",
        "Target summary should include window id hash.",
        "targetSummary.windowIdHash"
      )
    );
  }
  if (!readString(value.appIdHash)) {
    findings.push(
      finding(
        "target",
        "warning",
        "MISSING_APP_ID",
        "Target summary should include app id hash.",
        "targetSummary.appIdHash"
      )
    );
  }
  if (confidence !== undefined && confidence < 0.75) {
    findings.push(
      finding(
        "target",
        "warning",
        "LOW_TARGET_CONFIDENCE",
        "Target confidence is below threshold.",
        "targetSummary.confidence"
      )
    );
  }
  if (hasSensitiveAppName(appNameSummary)) {
    findings.push(
      finding(
        "risk",
        "warning",
        "SENSITIVE_APP_NAME",
        "Sensitive app names require risk review.",
        "targetSummary.appNameSummary"
      )
    );
  }
  if (hasPasswordLikeLabel(labelSummary)) {
    findings.push(
      finding(
        "risk",
        "warning",
        "PASSWORD_LIKE_TARGET_LABEL",
        "Password-like target labels require risk review.",
        "targetSummary.labelSummary"
      )
    );
  }
  if (hasDestructiveLabel(labelSummary)) {
    findings.push(
      finding(
        "risk",
        "warning",
        "DESTRUCTIVE_TARGET_LABEL",
        "Destructive target labels require risk review.",
        "targetSummary.labelSummary"
      )
    );
  }

  return {
    targetId,
    targetKind,
    ...(labelSummary ? { labelSummary } : {}),
    ...(appNameSummary ? { appNameSummary } : {}),
    ...(readString(value.windowTitleSummary)
      ? { windowTitleSummary: readString(value.windowTitleSummary) }
      : {}),
    ...(readString(value.role) ? { role: readString(value.role) } : {}),
    ...(confidence !== undefined ? { confidence } : {}),
    ...(readString(value.windowIdHash)
      ? { windowIdHash: readString(value.windowIdHash) }
      : {}),
    ...(readString(value.appIdHash)
      ? { appIdHash: readString(value.appIdHash) }
      : {}),
    ...(readString(value.displayIdHash)
      ? { displayIdHash: readString(value.displayIdHash) }
      : {}),
    ...(readString(value.boundsHash)
      ? { boundsHash: readString(value.boundsHash) }
      : {}),
    ...(readString(value.boundsSummary)
      ? { boundsSummary: readString(value.boundsSummary) }
      : {}),
    ...(readStringArray(value.warningCodes)
      ? { warningCodes: readStringArray(value.warningCodes) }
      : {})
  };
}

function normalizeExpectedEffect(
  value: unknown,
  findings: DesktopActionProposalFinding[]
): DesktopActionExpectedEffect | undefined {
  if (!isRecord(value)) {
    findings.push(
      finding(
        "expected_effect",
        "blocker",
        "MISSING_EXPECTED_EFFECT",
        "Expected visible effect summary is required.",
        "expectedEffect"
      )
    );
    return undefined;
  }

  const summary = readString(value.summary);
  if (!summary) {
    findings.push(
      finding(
        "expected_effect",
        "blocker",
        "MISSING_EXPECTED_EFFECT_SUMMARY",
        "Expected effect requires a summary.",
        "expectedEffect.summary"
      )
    );
    return undefined;
  }
  if (isVagueExpectedEffect(summary)) {
    findings.push(
      finding(
        "expected_effect",
        "warning",
        "VAGUE_EXPECTED_EFFECT",
        "Expected effect summary is too vague.",
        "expectedEffect.summary"
      )
    );
  }
  if (hasMultiStepText(summary)) {
    findings.push(
      finding(
        "risk",
        "warning",
        "MULTI_STEP_ACTION_EMBEDDED",
        "Single desktop action proposal appears to embed multiple steps.",
        "expectedEffect.summary"
      )
    );
  }

  return {
    summary,
    ...(readString(value.visibleStateChangeSummary)
      ? {
          visibleStateChangeSummary: readString(
            value.visibleStateChangeSummary
          )
        }
      : {}),
    ...(readString(value.successConditionSummary)
      ? { successConditionSummary: readString(value.successConditionSummary) }
      : {}),
    ...(readStringArray(value.warningCodes)
      ? { warningCodes: readStringArray(value.warningCodes) }
      : {})
  };
}

function buildSummary(
  status: DesktopActionExpansionProposalStatus,
  proposal: DesktopActionExpansionProposal | undefined,
  findings: DesktopActionProposalFinding[]
): DesktopActionExpansionProposalSummary {
  return {
    status,
    ...(proposal
      ? {
          proposalId: proposal.proposalId,
          actionKind: proposal.actionKind,
          objectiveSummary: proposal.objectiveSummary,
          observerEvidenceRefId: proposal.observerEvidenceRef.evidenceRefId,
          targetId: proposal.targetSummary.targetId,
          targetKind: proposal.targetSummary.targetKind,
          expectedEffectSummary: proposal.expectedEffect.summary,
          proposalHash: proposal.proposalHash
        }
      : {}),
    riskNoteCount: proposal?.riskNotes.length || 0,
    warningCodes: findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    blockerCodes: findings
      .filter((item) => item.severity === "blocker")
      .map((item) => item.code),
    summaryOnly: true
  };
}

function buildResult(
  proposal: DesktopActionExpansionProposal | undefined,
  findings: DesktopActionProposalFinding[]
): DesktopActionExpansionProposalValidationResult {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionExpansionProposalStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const safeProposal = status === "blocked" ? undefined : proposal;
  return {
    status,
    ...(safeProposal
      ? { proposal: safeProposal, proposalHash: safeProposal.proposalHash }
      : {}),
    summary: buildSummary(status, safeProposal, findings),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(status !== "blocked" && Boolean(safeProposal)),
    nextAction:
      status === "blocked"
        ? "Fix blocked expanded desktop action proposal fields before preview."
        : "Proceed to freshness validation, risk classification, and simulation preview.",
    source: "runtime_desktop_action_expansion_proposal"
  };
}

export function validateDesktopActionExpansionProposal(
  input: DesktopActionExpansionProposalInput
): DesktopActionExpansionProposalValidationResult {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  if (!parsed.record) {
    return buildResult(undefined, findings);
  }

  scanUnsafeFields(parsed.record, "", findings);

  const schemaVersion = readString(parsed.record.schemaVersion);
  if (
    schemaVersion &&
    schemaVersion !== "desktop_action_expansion_proposal.v1"
  ) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "UNSUPPORTED_SCHEMA_VERSION",
        "Unsupported expanded desktop action proposal schema version.",
        "schemaVersion"
      )
    );
  }

  const idGenerator = readIdGenerator(parsed.record.idGenerator);
  const proposalId =
    readString(parsed.record.proposalId) || idGenerator?.() || undefined;
  const actionKind = readString(parsed.record.actionKind);
  const objectiveSummary = readString(parsed.record.objectiveSummary);
  const createdAt = readString(parsed.record.createdAt);
  const riskNotes = readStringArray(parsed.record.riskNotes);
  const freshnessThresholdMs =
    readNumber(parsed.record.freshnessThresholdMs) || 5 * 60 * 1000;

  if (!proposalId) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_PROPOSAL_ID",
        "Proposal id is required.",
        "proposalId"
      )
    );
  }
  if (!isDesktopActionKind(actionKind)) {
    findings.push(
      finding(
        "action_kind",
        "blocker",
        "UNKNOWN_ACTION_KIND",
        "Expanded desktop action kind is not supported.",
        "actionKind"
      )
    );
  }
  if (!objectiveSummary) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_OBJECTIVE_SUMMARY",
        "Objective summary is required.",
        "objectiveSummary"
      )
    );
  }
  if (!createdAt) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_CREATED_AT",
        "Created timestamp is required.",
        "createdAt"
      )
    );
  }
  if (!riskNotes || riskNotes.length === 0) {
    findings.push(
      finding(
        "risk",
        "blocker",
        "MISSING_RISK_NOTES",
        "Risk notes are required.",
        "riskNotes"
      )
    );
  }

  const observerEvidenceRef = normalizeObserverEvidenceRef(
    parsed.record.observerEvidenceRef,
    findings
  );
  const targetSummary = normalizeTargetSummary(
    parsed.record.targetSummary,
    findings
  );
  const expectedEffect = normalizeExpectedEffect(
    parsed.record.expectedEffect,
    findings
  );

  if (observerEvidenceRef && createdAt) {
    if (
      isStaleEvidence(
        observerEvidenceRef.observedAt,
        createdAt,
        freshnessThresholdMs
      )
    ) {
      findings.push(
        finding(
          "stale_evidence",
          "blocker",
          "STALE_EVIDENCE",
          "Observer evidence is stale for this proposal.",
          "observerEvidenceRef.observedAt"
        )
      );
    }
  }

  if (actionKind === "file_dialog_select") {
    const candidatePaths = collectStrings(parsed.record).filter((value) =>
      /[\\/]/.test(value)
    );
    if (candidatePaths.some(isUnsafePath)) {
      findings.push(
        finding(
          "file_dialog",
          "blocker",
          "UNSAFE_FILE_DIALOG_PATH",
          "File dialog proposals cannot include absolute or unsafe paths.",
          "targetSummary"
        )
      );
    }
  }

  if (actionKind === "clipboard_write") {
    findings.push(
      finding(
        "clipboard",
        "warning",
        "CLIPBOARD_WRITE_PROPOSAL_ONLY",
        "Clipboard write remains proposal-only.",
        "actionKind"
      )
    );
  }

  if (actionKind && actionKind !== "wait_for_state" && actionKind !== "scroll") {
    findings.push(
      finding(
        "risk",
        "warning",
        "EXPANDED_ACTION_PROPOSAL_ONLY",
        "Expanded desktop action kind is proposal-only and requires risk review.",
        "actionKind"
      )
    );
  }

  if (
    !proposalId ||
    !isDesktopActionKind(actionKind) ||
    !objectiveSummary ||
    !createdAt ||
    !riskNotes ||
    !observerEvidenceRef ||
    !targetSummary ||
    !expectedEffect
  ) {
    return buildResult(undefined, findings);
  }

  const proposalCore = {
    schemaVersion: "desktop_action_expansion_proposal.v1" as const,
    proposalId,
    actionKind,
    objectiveSummary,
    observerEvidenceRef,
    targetSummary,
    expectedEffect,
    riskNotes,
    createdAt,
    source: "runtime_desktop_action_expansion_proposal" as const
  };
  const proposal: DesktopActionExpansionProposal = {
    ...proposalCore,
    proposalHash: stablePreviewHash(JSON.stringify(proposalCore))
  };
  return buildResult(proposal, findings);
}

export function parseDesktopActionExpansionProposal(
  input: DesktopActionExpansionProposalInput
): DesktopActionExpansionProposalValidationResult {
  return validateDesktopActionExpansionProposal(input);
}

export function summarizeDesktopActionExpansionProposal(
  proposal: DesktopActionExpansionProposal
): DesktopActionExpansionProposalSummary {
  return buildSummary("parsed", proposal, []);
}
