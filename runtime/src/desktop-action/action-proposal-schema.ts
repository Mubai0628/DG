import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopActionProposalInput =
  | Record<string, unknown>
  | string
  | unknown;

export type DesktopActionKind =
  | "focus_window"
  | "click_target"
  | "type_text"
  | "press_key"
  | "select_menu"
  | "copy_selection"
  | "paste_text"
  | "open_file_dialog"
  | "choose_file"
  | "drag_drop"
  | "scroll";

export type DesktopActionObserverEvidenceRef = {
  evidenceRefId: string;
  observationId?: string | undefined;
  observedAt?: string | undefined;
  summary: string;
  source?: string | undefined;
  warningCodes?: string[] | undefined;
  redactionCodes?: string[] | undefined;
};

export type DesktopActionTargetRef = {
  targetId: string;
  windowIdHash?: string | undefined;
  appIdHash?: string | undefined;
  displayIdHash?: string | undefined;
  boundsSummary?: string | undefined;
  role?: string | undefined;
  labelSummary?: string | undefined;
  sensitiveKind?: string | undefined;
  observerEvidenceRefId: string;
};

export type DesktopActionOperation = {
  operationId: string;
  actionKind: DesktopActionKind;
  targetRef: DesktopActionTargetRef;
  summary: string;
  rationale?: string | undefined;
  expectedVisibleStateChange?: string | undefined;
  inputTextSummary?: string | undefined;
  keyboardShortcutSummary?: string | undefined;
  fileDialogPolicy?: unknown;
  warningCodes?: string[] | undefined;
};

export type DesktopActionProposal = {
  schemaVersion: "desktop_action_proposal.v1";
  proposalId: string;
  title: string;
  intent: string;
  objectiveSummary: string;
  observerEvidenceRefs: DesktopActionObserverEvidenceRef[];
  operations: DesktopActionOperation[];
  riskNotes?: string[] | undefined;
  assumptions?: string[] | undefined;
  createdAt?: string | undefined;
  proposalHash: string;
  source: "runtime_desktop_action_proposal_schema";
};

export type DesktopActionProposalStatus = "parsed" | "warning" | "blocked";

export type DesktopActionProposalFindingKind =
  | "schema"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "evidence"
  | "target"
  | "action_kind"
  | "sensitive_target"
  | "risk"
  | "stale_evidence"
  | "file_dialog"
  | "clipboard"
  | "readiness";

export type DesktopActionProposalSeverity = "blocker" | "warning";

export type DesktopActionProposalFinding = {
  findingId: string;
  kind: DesktopActionProposalFindingKind;
  severity: DesktopActionProposalSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionProposalReadiness = {
  canEnterRiskClassification: boolean;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canUseClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionProposalSummary = {
  status: DesktopActionProposalStatus;
  proposalId?: string | undefined;
  title?: string | undefined;
  intent?: string | undefined;
  objectiveSummary?: string | undefined;
  operationCount: number;
  targetCount: number;
  observerEvidenceRefCount: number;
  actionKinds: DesktopActionKind[];
  warningCodes: string[];
  blockerCodes: string[];
  proposalHash?: string | undefined;
  summaryOnly: true;
};

export type DesktopActionProposalValidationResult = {
  status: DesktopActionProposalStatus;
  proposal?: DesktopActionProposal | undefined;
  summary: DesktopActionProposalSummary;
  findings: DesktopActionProposalFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  proposalHash?: string | undefined;
  readiness: DesktopActionProposalReadiness;
  nextAction: string;
  source: "runtime_desktop_action_proposal_schema";
};

type IdGenerator = () => string;

const actionKinds = new Set<DesktopActionKind>([
  "focus_window",
  "click_target",
  "type_text",
  "press_key",
  "select_menu",
  "copy_selection",
  "paste_text",
  "open_file_dialog",
  "choose_file",
  "drag_drop",
  "scroll"
]);

const highRiskActionKinds = new Set<DesktopActionKind>([
  "click_target",
  "type_text",
  "press_key",
  "select_menu",
  "copy_selection",
  "paste_text",
  "open_file_dialog",
  "choose_file",
  "drag_drop",
  "scroll"
]);

const textInputActionKinds = new Set<DesktopActionKind>([
  "type_text",
  "paste_text"
]);

const fileDialogActionKinds = new Set<DesktopActionKind>([
  "open_file_dialog",
  "choose_file"
]);

const clipboardActionKinds = new Set<DesktopActionKind>([
  "copy_selection",
  "paste_text"
]);

const forbiddenFieldKeys = new Set(
  [
    "rawScreenshot",
    "screenshotBytes",
    "imageData",
    "rawOcrText",
    "rawDom",
    "rawPrompt",
    "rawResponse",
    "reasoning_content",
    "apiKey",
    "Authorization",
    "bearer",
    "password",
    "secret",
    "clipboardContent",
    "fileContent",
    "rawSource",
    "rawDiff",
    "command",
    "shellCommand",
    "gitCommand",
    "nativeBridge",
    "desktopActionExecute",
    "clickNow",
    "typeNow",
    "executeNow"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canUseClipboard",
    "canOpenFileDialog",
    "canWriteEventStore",
    "canUseNativeBridge",
    "appCanExecute",
    "desktopActionExecute",
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
  "RAW_OCR",
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF",
  "SCREENSHOT_BYTES",
  "CLIPBOARD_CONTENT"
];

function emptyReadiness(
  canEnterRiskClassification = false
): DesktopActionProposalReadiness {
  return {
    canEnterRiskClassification,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canUseClipboard: false,
    canOpenFileDialog: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function finding(
  kind: DesktopActionProposalFindingKind,
  severity: DesktopActionProposalSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionProposalFinding {
  return {
    findingId: stablePreviewHash(
      JSON.stringify({
        kind,
        severity,
        code,
        path: path || ""
      })
    ).slice(0, 16),
    kind,
    severity,
    code,
    safeMessage,
    ...(path ? { path } : {})
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
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

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readIdGenerator(value: unknown): IdGenerator | undefined {
  return typeof value === "function" ? (value as IdGenerator) : undefined;
}

function parseInput(input: DesktopActionProposalInput): {
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
              "Proposal JSON must be an object."
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
            "Proposal JSON could not be parsed."
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
          "Proposal input must be an object."
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
          "Raw desktop or prompt marker is not allowed.",
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
          "raw_field",
          "blocker",
          "FORBIDDEN_FIELD",
          "Forbidden raw or execution field is not allowed.",
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
          "Execution readiness flags must remain false.",
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

function isSensitiveKind(value: string | undefined): boolean {
  return Boolean(value && /password|api|secret|token|credential/i.test(value));
}

function isAbsoluteOrUnsafePath(value: string): boolean {
  return (
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.startsWith("/") ||
    value.startsWith("\\\\") ||
    value.includes("..") ||
    /(^|[\\/])\.git([\\/]|$)/i.test(value) ||
    /(^|[\\/])\.env($|[\\/])/i.test(value)
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

function isStale(
  observedAt: string | undefined,
  createdAt: string | undefined
): boolean {
  if (!observedAt || !createdAt) {
    return false;
  }
  const observed = Date.parse(observedAt);
  const created = Date.parse(createdAt);
  if (!Number.isFinite(observed) || !Number.isFinite(created)) {
    return false;
  }
  return created - observed > 15 * 60 * 1000;
}

function buildSummary(
  status: DesktopActionProposalStatus,
  proposal: DesktopActionProposal | undefined,
  findings: DesktopActionProposalFinding[]
): DesktopActionProposalSummary {
  return {
    status,
    ...(proposal
      ? {
          proposalId: proposal.proposalId,
          title: proposal.title,
          intent: proposal.intent,
          objectiveSummary: proposal.objectiveSummary,
          proposalHash: proposal.proposalHash
        }
      : {}),
    operationCount: proposal?.operations.length || 0,
    targetCount: proposal
      ? new Set(
          proposal.operations.map((operation) => operation.targetRef.targetId)
        ).size
      : 0,
    observerEvidenceRefCount: proposal?.observerEvidenceRefs.length || 0,
    actionKinds: proposal
      ? Array.from(
          new Set(proposal.operations.map((operation) => operation.actionKind))
        )
      : [],
    warningCodes: findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    blockerCodes: findings
      .filter((item) => item.severity === "blocker")
      .map((item) => item.code),
    summaryOnly: true
  };
}

function result(
  proposal: DesktopActionProposal | undefined,
  findings: DesktopActionProposalFinding[]
): DesktopActionProposalValidationResult {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionProposalStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const safeProposal = blockerCount > 0 ? undefined : proposal;
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
    readiness: emptyReadiness(status !== "blocked" && Boolean(safeProposal)),
    nextAction:
      status === "blocked"
        ? "Fix blocked proposal fields before risk classification."
        : "Proceed to desktop action risk classification preview.",
    source: "runtime_desktop_action_proposal_schema"
  };
}

function normalizeEvidenceRefs(
  records: Record<string, unknown>[],
  findings: DesktopActionProposalFinding[]
): DesktopActionObserverEvidenceRef[] {
  const refs: DesktopActionObserverEvidenceRef[] = [];
  const seen = new Set<string>();
  for (const [index, record] of records.entries()) {
    const evidenceRefId =
      readString(record.evidenceRefId) || readString(record.refId);
    if (!evidenceRefId) {
      findings.push(
        finding(
          "evidence",
          "blocker",
          "MISSING_EVIDENCE_REF_ID",
          "Observer evidence ref requires an id.",
          `observerEvidenceRefs[${index}]`
        )
      );
      continue;
    }
    if (seen.has(evidenceRefId)) {
      findings.push(
        finding(
          "evidence",
          "blocker",
          "DUPLICATE_EVIDENCE_REF",
          "Observer evidence refs must be unique.",
          `observerEvidenceRefs[${index}]`
        )
      );
      continue;
    }
    seen.add(evidenceRefId);
    const summary = readString(record.summary);
    if (!summary) {
      findings.push(
        finding(
          "evidence",
          "blocker",
          "MISSING_EVIDENCE_SUMMARY",
          "Observer evidence ref requires a summary.",
          `observerEvidenceRefs[${index}].summary`
        )
      );
    }
    refs.push({
      evidenceRefId,
      ...(readString(record.observationId)
        ? { observationId: readString(record.observationId) }
        : {}),
      ...(readString(record.observedAt)
        ? { observedAt: readString(record.observedAt) }
        : {}),
      summary: summary || "missing evidence summary",
      ...(readString(record.source)
        ? { source: readString(record.source) }
        : {}),
      ...(readStringArray(record.warningCodes)
        ? { warningCodes: readStringArray(record.warningCodes) }
        : {}),
      ...(readStringArray(record.redactionCodes)
        ? { redactionCodes: readStringArray(record.redactionCodes) }
        : {})
    });
  }
  return refs;
}

function normalizeTargetRef(
  record: Record<string, unknown>,
  path: string,
  evidenceIds: Set<string>,
  findings: DesktopActionProposalFinding[]
): DesktopActionTargetRef | undefined {
  const targetId = readString(record.targetId);
  const observerEvidenceRefId = readString(record.observerEvidenceRefId);
  if (!targetId) {
    findings.push(
      finding(
        "target",
        "blocker",
        "MISSING_TARGET_ID",
        "Desktop action target requires targetId.",
        `${path}.targetId`
      )
    );
  }
  if (!observerEvidenceRefId) {
    findings.push(
      finding(
        "target",
        "blocker",
        "MISSING_TARGET_EVIDENCE",
        "Desktop action target requires observer evidence ref.",
        `${path}.observerEvidenceRefId`
      )
    );
  } else if (!evidenceIds.has(observerEvidenceRefId)) {
    findings.push(
      finding(
        "target",
        "blocker",
        "UNKNOWN_TARGET_EVIDENCE",
        "Target references unknown observer evidence.",
        `${path}.observerEvidenceRefId`
      )
    );
  }
  if (!targetId || !observerEvidenceRefId) {
    return undefined;
  }
  return {
    targetId,
    ...(readString(record.windowIdHash)
      ? { windowIdHash: readString(record.windowIdHash) }
      : {}),
    ...(readString(record.appIdHash)
      ? { appIdHash: readString(record.appIdHash) }
      : {}),
    ...(readString(record.displayIdHash)
      ? { displayIdHash: readString(record.displayIdHash) }
      : {}),
    ...(readString(record.boundsSummary)
      ? { boundsSummary: readString(record.boundsSummary) }
      : {}),
    ...(readString(record.role) ? { role: readString(record.role) } : {}),
    ...(readString(record.labelSummary)
      ? { labelSummary: readString(record.labelSummary) }
      : {}),
    ...(readString(record.sensitiveKind)
      ? { sensitiveKind: readString(record.sensitiveKind) }
      : {}),
    observerEvidenceRefId
  };
}

function normalizeOperation(
  record: Record<string, unknown>,
  index: number,
  evidenceIds: Set<string>,
  idGenerator: IdGenerator | undefined,
  findings: DesktopActionProposalFinding[]
): DesktopActionOperation | undefined {
  const path = `operations[${index}]`;
  const operationId =
    readString(record.operationId) ||
    idGenerator?.() ||
    `operation-${index + 1}`;
  const actionKindValue = readString(record.actionKind);
  if (!isDesktopActionKind(actionKindValue)) {
    findings.push(
      finding(
        "action_kind",
        "blocker",
        "UNKNOWN_ACTION_KIND",
        "Action kind is not allowed.",
        `${path}.actionKind`
      )
    );
  }
  const targetRecord = isRecord(record.targetRef)
    ? record.targetRef
    : undefined;
  if (!targetRecord) {
    findings.push(
      finding(
        "target",
        "blocker",
        "MISSING_TARGET_REF",
        "Operation requires a targetRef.",
        `${path}.targetRef`
      )
    );
  }
  const summary = readString(record.summary);
  if (!summary) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_OPERATION_SUMMARY",
        "Operation requires a summary.",
        `${path}.summary`
      )
    );
  }

  if (!isDesktopActionKind(actionKindValue) || !targetRecord || !summary) {
    return undefined;
  }

  const targetRef = normalizeTargetRef(
    targetRecord,
    `${path}.targetRef`,
    evidenceIds,
    findings
  );
  if (!targetRef) {
    return undefined;
  }

  const operation: DesktopActionOperation = {
    operationId,
    actionKind: actionKindValue,
    targetRef,
    summary,
    ...(readString(record.rationale)
      ? { rationale: readString(record.rationale) }
      : {}),
    ...(readString(record.expectedVisibleStateChange)
      ? {
          expectedVisibleStateChange: readString(
            record.expectedVisibleStateChange
          )
        }
      : {}),
    ...(readString(record.inputTextSummary)
      ? { inputTextSummary: readString(record.inputTextSummary) }
      : {}),
    ...(readString(record.keyboardShortcutSummary)
      ? { keyboardShortcutSummary: readString(record.keyboardShortcutSummary) }
      : {}),
    ...(record.fileDialogPolicy !== undefined
      ? { fileDialogPolicy: record.fileDialogPolicy }
      : {}),
    ...(readStringArray(record.warningCodes)
      ? { warningCodes: readStringArray(record.warningCodes) }
      : {})
  };

  if (highRiskActionKinds.has(operation.actionKind)) {
    findings.push(
      finding(
        "risk",
        "warning",
        "HIGH_RISK_ACTION_KIND",
        "Action kind requires risk classification.",
        `${path}.actionKind`
      )
    );
  }
  if (textInputActionKinds.has(operation.actionKind)) {
    findings.push(
      finding(
        "risk",
        "warning",
        "TEXT_INPUT_ACTION",
        "Text input proposals require high scrutiny.",
        `${path}.actionKind`
      )
    );
  }
  if (fileDialogActionKinds.has(operation.actionKind)) {
    findings.push(
      finding(
        "file_dialog",
        "warning",
        "FILE_DIALOG_ACTION",
        "File dialog proposals require high scrutiny.",
        `${path}.actionKind`
      )
    );
    if (
      collectStrings(operation.fileDialogPolicy).some(isAbsoluteOrUnsafePath)
    ) {
      findings.push(
        finding(
          "file_dialog",
          "blocker",
          "UNSAFE_FILE_DIALOG_PATH",
          "File dialog proposal cannot include absolute or unsafe paths.",
          `${path}.fileDialogPolicy`
        )
      );
    }
  }
  if (clipboardActionKinds.has(operation.actionKind)) {
    findings.push(
      finding(
        "clipboard",
        "warning",
        "CLIPBOARD_ACTION",
        "Clipboard proposals require high scrutiny.",
        `${path}.actionKind`
      )
    );
  }
  if (isSensitiveKind(operation.targetRef.sensitiveKind)) {
    findings.push(
      finding(
        "sensitive_target",
        "warning",
        "SENSITIVE_TARGET",
        "Sensitive desktop targets require risk review.",
        `${path}.targetRef.sensitiveKind`
      )
    );
    if (textInputActionKinds.has(operation.actionKind)) {
      findings.push(
        finding(
          "sensitive_target",
          "blocker",
          "SENSITIVE_TEXT_INPUT_BLOCKED",
          "Type or paste action against sensitive target is blocked.",
          `${path}.actionKind`
        )
      );
    }
  }
  if (!operation.expectedVisibleStateChange) {
    findings.push(
      finding(
        "risk",
        "warning",
        "MISSING_EXPECTED_VISIBLE_STATE_CHANGE",
        "Expected visible state change should be summarized.",
        path
      )
    );
  }
  if (operation.warningCodes?.some((code) => /cross[-_]?app/i.test(code))) {
    findings.push(
      finding(
        "target",
        "warning",
        "CROSS_APP_TARGET",
        "Cross-app targets require risk review.",
        path
      )
    );
  }

  return operation;
}

export function validateDesktopActionProposal(
  input: DesktopActionProposalInput
): DesktopActionProposalValidationResult {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  if (!parsed.record) {
    return result(undefined, findings);
  }
  scanUnsafeFields(parsed.record, "", findings);

  const idGenerator = readIdGenerator(parsed.record.idGenerator);
  const schemaVersion = readString(parsed.record.schemaVersion);
  if (schemaVersion && schemaVersion !== "desktop_action_proposal.v1") {
    findings.push(
      finding(
        "schema",
        "blocker",
        "UNSUPPORTED_SCHEMA_VERSION",
        "Unsupported desktop action proposal schema version.",
        "schemaVersion"
      )
    );
  }
  const title = readString(parsed.record.title);
  const intent = readString(parsed.record.intent);
  const objectiveSummary = readString(parsed.record.objectiveSummary);
  if (!title) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_TITLE",
        "Proposal title is required.",
        "title"
      )
    );
  }
  if (!intent) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_INTENT",
        "Proposal intent is required.",
        "intent"
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

  const observerEvidenceRefs = normalizeEvidenceRefs(
    readRecordArray(parsed.record.observerEvidenceRefs),
    findings
  );
  if (observerEvidenceRefs.length === 0) {
    findings.push(
      finding(
        "evidence",
        "blocker",
        "MISSING_OBSERVER_EVIDENCE_REFS",
        "Observer evidence refs are required.",
        "observerEvidenceRefs"
      )
    );
  }

  const evidenceIds = new Set(
    observerEvidenceRefs.map((item) => item.evidenceRefId)
  );
  const operationRecords = readRecordArray(parsed.record.operations);
  if (operationRecords.length === 0) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_OPERATIONS",
        "At least one desktop action operation is required.",
        "operations"
      )
    );
  }
  const operations = operationRecords
    .map((record, index) =>
      normalizeOperation(record, index, evidenceIds, idGenerator, findings)
    )
    .filter((operation): operation is DesktopActionOperation =>
      Boolean(operation)
    );

  const operationIds = new Set<string>();
  for (const [index, operation] of operations.entries()) {
    if (operationIds.has(operation.operationId)) {
      findings.push(
        finding(
          "schema",
          "blocker",
          "DUPLICATE_OPERATION_ID",
          "Operation ids must be unique.",
          `operations[${index}].operationId`
        )
      );
    }
    operationIds.add(operation.operationId);
  }

  const riskNotes = readStringArray(parsed.record.riskNotes);
  if (!riskNotes || riskNotes.length === 0) {
    findings.push(
      finding(
        "risk",
        "warning",
        "MISSING_RISK_NOTES",
        "Risk notes should summarize desktop action risks.",
        "riskNotes"
      )
    );
  }
  if (operations.length > 5) {
    findings.push(
      finding(
        "risk",
        "warning",
        "MANY_OPERATIONS",
        "Large desktop action proposals require extra review.",
        "operations"
      )
    );
  }

  const createdAt = readString(parsed.record.createdAt);
  for (const [index, evidence] of observerEvidenceRefs.entries()) {
    if (isStale(evidence.observedAt, createdAt)) {
      findings.push(
        finding(
          "stale_evidence",
          "warning",
          "STALE_EVIDENCE",
          "Observer evidence may be stale.",
          `observerEvidenceRefs[${index}].observedAt`
        )
      );
    }
  }

  if (
    !title ||
    !intent ||
    !objectiveSummary ||
    observerEvidenceRefs.length === 0 ||
    operations.length === 0
  ) {
    return result(undefined, findings);
  }

  const proposalCore = {
    schemaVersion: "desktop_action_proposal.v1" as const,
    proposalId:
      readString(parsed.record.proposalId) ||
      idGenerator?.() ||
      `desktop-action-proposal-${stablePreviewHash(
        JSON.stringify({
          title,
          intent,
          objectiveSummary,
          observerEvidenceRefs,
          operations
        })
      ).slice(0, 12)}`,
    title,
    intent,
    objectiveSummary,
    observerEvidenceRefs,
    operations,
    ...(riskNotes ? { riskNotes } : {}),
    ...(readStringArray(parsed.record.assumptions)
      ? { assumptions: readStringArray(parsed.record.assumptions) }
      : {}),
    ...(createdAt ? { createdAt } : {}),
    source: "runtime_desktop_action_proposal_schema" as const
  };
  const proposalHash = stablePreviewHash(JSON.stringify(proposalCore));
  const proposal: DesktopActionProposal = {
    ...proposalCore,
    proposalHash
  };
  return result(proposal, findings);
}

export function parseDesktopActionProposal(
  input: DesktopActionProposalInput
): DesktopActionProposalValidationResult {
  return validateDesktopActionProposal(input);
}

export function normalizeDesktopActionProposal(
  input: DesktopActionProposalInput
): DesktopActionProposal | undefined {
  return validateDesktopActionProposal(input).proposal;
}

export function summarizeDesktopActionProposal(
  proposal: DesktopActionProposal
): DesktopActionProposalSummary {
  return buildSummary("parsed", proposal, []);
}
