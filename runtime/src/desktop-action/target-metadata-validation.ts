import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type {
  DesktopActionKind,
  DesktopActionOperation,
  DesktopActionProposal,
  DesktopActionProposalValidationResult
} from "./action-proposal-schema.js";

export type DesktopTargetMetadataValidationInput = {
  proposal?: DesktopActionProposal | DesktopActionProposalValidationResult;
  observerSummary?: DesktopTargetObserverSummary | undefined;
  currentMetadataSummary?: DesktopCurrentMetadataSummary | undefined;
  staleThresholdMs?: number | undefined;
  allowedAppRefs?: string[] | undefined;
  deniedAppRefs?: string[] | undefined;
  sensitiveTargetPolicy?: DesktopSensitiveTargetPolicy | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type DesktopTargetObserverSummary = {
  observationId?: string | undefined;
  observedAt?: string | undefined;
  status?: string | undefined;
  windows?: DesktopWindowMetadataSummary[] | undefined;
  apps?: DesktopAppMetadataSummary[] | undefined;
  displays?: DesktopDisplayMetadataSummary[] | undefined;
  evidenceRefs?: DesktopObserverEvidenceMetadataSummary[] | undefined;
  warningCodes?: string[] | undefined;
  blockerCount?: number | undefined;
  readiness?: Record<string, unknown> | undefined;
};

export type DesktopCurrentMetadataSummary = {
  observedAt?: string | undefined;
  windows?: DesktopWindowMetadataSummary[] | undefined;
  apps?: DesktopAppMetadataSummary[] | undefined;
  displays?: DesktopDisplayMetadataSummary[] | undefined;
  targets?: DesktopTargetMetadataSummary[] | undefined;
  warningCodes?: string[] | undefined;
  readiness?: Record<string, unknown> | undefined;
};

export type DesktopWindowMetadataSummary = {
  windowIdHash: string;
  appIdHash?: string | undefined;
  appNameSummary?: string | undefined;
  displayIdHash?: string | undefined;
  boundsSummary?: string | undefined;
  focused?: boolean | undefined;
  titleSummary?: string | undefined;
  targetIds?: string[] | undefined;
  warningCodes?: string[] | undefined;
};

export type DesktopAppMetadataSummary = {
  appIdHash: string;
  appNameSummary?: string | undefined;
  windowCount?: number | undefined;
  warningCodes?: string[] | undefined;
};

export type DesktopDisplayMetadataSummary = {
  displayIdHash: string;
  sizeSummary?: string | undefined;
  primary?: boolean | undefined;
  warningCodes?: string[] | undefined;
};

export type DesktopTargetMetadataSummary = {
  targetId: string;
  windowIdHash?: string | undefined;
  appIdHash?: string | undefined;
  displayIdHash?: string | undefined;
  boundsSummary?: string | undefined;
  labelSummary?: string | undefined;
  confidence?: number | undefined;
  candidateCount?: number | undefined;
  warningCodes?: string[] | undefined;
};

export type DesktopObserverEvidenceMetadataSummary = {
  evidenceRefId: string;
  observationId?: string | undefined;
  observedAt?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type DesktopSensitiveTargetPolicy = {
  sensitiveKinds?: string[] | undefined;
  blockTextInput?: boolean | undefined;
  blockClipboard?: boolean | undefined;
  blockFileDialog?: boolean | undefined;
};

export type DesktopTargetMetadataValidationStatus =
  | "validated"
  | "warning"
  | "blocked";

export type DesktopTargetValidationFindingKind =
  | "schema"
  | "proposal"
  | "evidence"
  | "stale_evidence"
  | "metadata"
  | "target"
  | "app"
  | "window"
  | "display"
  | "bounds"
  | "sensitive_target"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "risk";

export type DesktopTargetValidationSeverity = "blocker" | "warning";

export type DesktopTargetValidationFinding = {
  findingId: string;
  kind: DesktopTargetValidationFindingKind;
  severity: DesktopTargetValidationSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopTargetValidationGate = {
  gateId: string;
  label: string;
  status: "passed" | "warning" | "blocked";
  summary: string;
};

export type DesktopTargetValidationReadiness = {
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

export type DesktopTargetMetadataValidationSummary = {
  status: DesktopTargetMetadataValidationStatus;
  proposalId?: string | undefined;
  operationCount: number;
  targetCount: number;
  evidenceRefCount: number;
  gateCount: number;
  warningCodes: string[];
  blockerCodes: string[];
  validationHash?: string | undefined;
  summaryOnly: true;
};

export type DesktopTargetMetadataValidationResult = {
  status: DesktopTargetMetadataValidationStatus;
  validationId: string;
  proposalId?: string | undefined;
  operationCount: number;
  targetCount: number;
  evidenceRefCount: number;
  gates: DesktopTargetValidationGate[];
  findings: DesktopTargetValidationFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  validationHash: string;
  summary: DesktopTargetMetadataValidationSummary;
  readiness: DesktopTargetValidationReadiness;
  nextAction: string;
  source: "runtime_desktop_target_metadata_validation";
};

const textActionKinds = new Set<DesktopActionKind>(["type_text", "paste_text"]);
const clipboardActionKinds = new Set<DesktopActionKind>([
  "copy_selection",
  "paste_text"
]);
const fileDialogActionKinds = new Set<DesktopActionKind>([
  "open_file_dialog",
  "choose_file"
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

const forbiddenFieldKeys = new Set(
  [
    "rawScreenshot",
    "screenshotBytes",
    "screenshotBase64",
    "rawOcr",
    "rawOcrText",
    "ocrText",
    "rawUiText",
    "rawDom",
    "rawPrompt",
    "rawResponse",
    "reasoningContent",
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
    "tauriCommand",
    "eventStoreWrite",
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
  "RAW_UI_TEXT",
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF",
  "SCREENSHOT_BYTES",
  "CLIPBOARD_CONTENT"
];

function emptyReadiness(
  canEnterRiskClassification = false
): DesktopTargetValidationReadiness {
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
  kind: DesktopTargetValidationFindingKind,
  severity: DesktopTargetValidationSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopTargetValidationFinding {
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

function gate(
  gateId: string,
  label: string,
  status: DesktopTargetValidationGate["status"],
  summary: string
): DesktopTargetValidationGate {
  return { gateId, label, status, summary };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasProposalResult(
  value: unknown
): value is DesktopActionProposalValidationResult {
  return isRecord(value) && "source" in value && "summary" in value;
}

function extractProposal(
  input: DesktopTargetMetadataValidationInput,
  findings: DesktopTargetValidationFinding[]
): DesktopActionProposal | undefined {
  const value = input.proposal;
  if (!value) {
    findings.push(
      finding(
        "proposal",
        "blocker",
        "MISSING_PROPOSAL",
        "Desktop action proposal is required.",
        "proposal"
      )
    );
    return undefined;
  }

  if (hasProposalResult(value)) {
    if (value.status === "blocked" || value.blockerCount > 0) {
      findings.push(
        finding(
          "proposal",
          "blocker",
          "BLOCKED_PROPOSAL",
          "Blocked desktop action proposals cannot enter target validation.",
          "proposal"
        )
      );
      return undefined;
    }
    return value.proposal;
  }

  return value as DesktopActionProposal;
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopTargetValidationFinding[]
): void {
  if (typeof value === "string") {
    if (secretMarkers.some((marker) => value.includes(marker))) {
      findings.push(
        finding(
          "secret",
          "blocker",
          "SECRET_MARKER",
          "Secret-like marker is not allowed.",
          path ? "input.redacted" : undefined
        )
      );
    }
    if (rawMarkers.some((marker) => value.includes(marker))) {
      findings.push(
        finding(
          "raw_field",
          "blocker",
          "RAW_MARKER",
          "Raw desktop, prompt, or response marker is not allowed.",
          path ? "input.redacted" : undefined
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
          "input.forbiddenField"
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
          "input.executionFlag"
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function ageMs(observedAt: string | undefined, now: string | undefined) {
  if (!observedAt || !now) {
    return undefined;
  }
  const observed = Date.parse(observedAt);
  const current = Date.parse(now);
  if (!Number.isFinite(observed) || !Number.isFinite(current)) {
    return undefined;
  }
  return current - observed;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function bounds(
  value: string | undefined
): { x: number; y: number; w: number; h: number } | undefined {
  if (!value) {
    return undefined;
  }
  const pairs = [...value.matchAll(/\b([xywh]):\s*(-?\d+(?:\.\d+)?)/gi)];
  if (pairs.length < 4) {
    return undefined;
  }
  const map = new Map(pairs.map((item) => [item[1]!.toLowerCase(), item[2]!]));
  const x = Number(map.get("x"));
  const y = Number(map.get("y"));
  const w = Number(map.get("w"));
  const h = Number(map.get("h"));
  if (![x, y, w, h].every(Number.isFinite)) {
    return undefined;
  }
  return { x, y, w, h };
}

function displaySize(
  value: string | undefined
): { width: number; height: number } | undefined {
  if (!value) {
    return undefined;
  }
  const match = value.match(/\b(\d{2,5})x(\d{2,5})\b/);
  if (!match) {
    return undefined;
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

function isSensitiveTarget(
  operation: DesktopActionOperation,
  policy: DesktopSensitiveTargetPolicy | undefined
): boolean {
  const sensitiveKind = operation.targetRef.sensitiveKind;
  if (!sensitiveKind) {
    return false;
  }
  const policyKinds = policy?.sensitiveKinds || [
    "password",
    "api_key",
    "secret",
    "token",
    "credential",
    "payment"
  ];
  return policyKinds.some((kind) =>
    sensitiveKind.toLowerCase().includes(kind.toLowerCase())
  );
}

function shouldBlockSensitiveAction(
  operation: DesktopActionOperation,
  policy: DesktopSensitiveTargetPolicy | undefined
): boolean {
  const blockText = policy?.blockTextInput !== false;
  const blockClipboard = policy?.blockClipboard !== false;
  const blockFileDialog = policy?.blockFileDialog !== false;
  return (
    (blockText && textActionKinds.has(operation.actionKind)) ||
    (blockClipboard && clipboardActionKinds.has(operation.actionKind)) ||
    (blockFileDialog && fileDialogActionKinds.has(operation.actionKind))
  );
}

function findTarget(
  operation: DesktopActionOperation,
  current: DesktopCurrentMetadataSummary | undefined,
  observer: DesktopTargetObserverSummary | undefined
): DesktopTargetMetadataSummary | undefined {
  const target = current?.targets?.find(
    (item) => item.targetId === operation.targetRef.targetId
  );
  if (target) {
    return target;
  }
  const currentWindow = current?.windows?.find(
    (item) => item.windowIdHash === operation.targetRef.windowIdHash
  );
  if (currentWindow) {
    return {
      targetId: operation.targetRef.targetId,
      windowIdHash: currentWindow.windowIdHash,
      appIdHash: currentWindow.appIdHash,
      displayIdHash: currentWindow.displayIdHash,
      boundsSummary: currentWindow.boundsSummary,
      labelSummary: currentWindow.titleSummary
    };
  }
  if (current) {
    return undefined;
  }
  const observerWindow = observer?.windows?.find(
    (item) => item.windowIdHash === operation.targetRef.windowIdHash
  );
  return observerWindow
    ? {
        targetId: operation.targetRef.targetId,
        windowIdHash: observerWindow.windowIdHash,
        appIdHash: observerWindow.appIdHash,
        displayIdHash: observerWindow.displayIdHash,
        boundsSummary: observerWindow.boundsSummary,
        labelSummary: observerWindow.titleSummary
      }
    : undefined;
}

function buildGates(
  findings: DesktopTargetValidationFinding[]
): DesktopTargetValidationGate[] {
  const has = (code: string) => findings.some((item) => item.code === code);
  const warningHas = (code: string) =>
    findings.some((item) => item.code === code && item.severity === "warning");
  return [
    gate(
      "proposal_available",
      "Proposal available",
      has("MISSING_PROPOSAL") || has("BLOCKED_PROPOSAL") ? "blocked" : "passed",
      "Desktop action proposal is present and not already blocked."
    ),
    gate(
      "observer_evidence",
      "Observer evidence",
      has("MISSING_OBSERVER_EVIDENCE") || has("UNKNOWN_TARGET_EVIDENCE")
        ? "blocked"
        : warningHas("OBSERVER_SUMMARY_MISSING")
          ? "warning"
          : "passed",
      "Observer evidence refs are summary-only and match proposal targets."
    ),
    gate(
      "metadata_match",
      "Window/app/display metadata",
      has("TARGET_METADATA_MISSING") ||
        has("TARGET_APP_MISMATCH") ||
        has("TARGET_WINDOW_MISMATCH") ||
        has("TARGET_DISPLAY_MISMATCH")
        ? "blocked"
        : warningHas("WINDOW_MOVED") || warningHas("APP_CHANGED")
          ? "warning"
          : "passed",
      "Target hashes line up with current window, app, and display summaries."
    ),
    gate(
      "sensitive_target_policy",
      "Sensitive target policy",
      has("SENSITIVE_TARGET_BLOCKED") ? "blocked" : "passed",
      "Sensitive text, clipboard, and file-dialog actions stay blocked."
    ),
    gate(
      "screen_bounds",
      "Screen bounds",
      has("IMPOSSIBLE_SCREEN_BOUNDS") ? "blocked" : "passed",
      "Bounds summaries are plausible for the target display."
    ),
    gate(
      "execution_disabled",
      "Execution disabled",
      has("EXECUTION_FLAG_TRUE") ? "blocked" : "passed",
      "Target validation does not enable desktop action execution."
    )
  ];
}

function makeResult(
  input: DesktopTargetMetadataValidationInput,
  proposal: DesktopActionProposal | undefined,
  findings: DesktopTargetValidationFinding[],
  idGenerator: (() => string) | undefined
): DesktopTargetMetadataValidationResult {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopTargetMetadataValidationStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "validated";
  const gates = buildGates(findings);
  const targetCount = proposal
    ? new Set(proposal.operations.map((item) => item.targetRef.targetId)).size
    : 0;
  const evidenceRefCount = proposal?.observerEvidenceRefs.length || 0;
  const core = {
    proposalId: proposal?.proposalId,
    operationCount: proposal?.operations.length || 0,
    targetCount,
    evidenceRefCount,
    blockerCodes: findings
      .filter((item) => item.severity === "blocker")
      .map((item) => item.code),
    warningCodes: findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    gateStatuses: gates.map((item) => `${item.gateId}:${item.status}`),
    createdAt: input.createdAt
  };
  const validationHash = stablePreviewHash(JSON.stringify(core));
  const validationId =
    idGenerator?.() ||
    `desktop-target-validation-${validationHash.slice(0, 12)}`;
  return {
    status,
    validationId,
    ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
    operationCount: proposal?.operations.length || 0,
    targetCount,
    evidenceRefCount,
    gates,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    validationHash,
    summary: {
      status,
      ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
      operationCount: proposal?.operations.length || 0,
      targetCount,
      evidenceRefCount,
      gateCount: gates.length,
      warningCodes: core.warningCodes,
      blockerCodes: core.blockerCodes,
      validationHash,
      summaryOnly: true
    },
    readiness: emptyReadiness(status !== "blocked" && Boolean(proposal)),
    nextAction:
      status === "blocked"
        ? "Fix target metadata blockers before risk classification."
        : "Proceed to desktop action risk classification preview.",
    source: "runtime_desktop_target_metadata_validation"
  };
}

export function validateDesktopActionTargets(
  input: DesktopTargetMetadataValidationInput
): DesktopTargetMetadataValidationResult {
  const findings: DesktopTargetValidationFinding[] = [];
  scanUnsafeFields(input, "", findings);
  const proposal = extractProposal(input, findings);
  const observer = input.observerSummary;
  const current = input.currentMetadataSummary;
  const now =
    input.createdAt ||
    current?.observedAt ||
    proposal?.createdAt ||
    new Date(0).toISOString();

  if (!observer) {
    findings.push(
      finding(
        "evidence",
        "warning",
        "OBSERVER_SUMMARY_MISSING",
        "Observer metadata summary is missing; target validation is partial.",
        "observerSummary"
      )
    );
  }
  if (!current) {
    findings.push(
      finding(
        "metadata",
        "warning",
        "CURRENT_METADATA_MISSING",
        "Current desktop metadata summary is missing; target validation is partial.",
        "currentMetadataSummary"
      )
    );
  }

  if (!proposal) {
    return makeResult(input, undefined, findings, input.idGenerator);
  }

  if (proposal.observerEvidenceRefs.length === 0) {
    findings.push(
      finding(
        "evidence",
        "blocker",
        "MISSING_OBSERVER_EVIDENCE",
        "Proposal must include observer evidence refs.",
        "proposal.observerEvidenceRefs"
      )
    );
  }

  const evidenceIds = new Set(
    proposal.observerEvidenceRefs.map((item) => item.evidenceRefId)
  );
  const observerEvidenceIds = new Set(
    observer?.evidenceRefs?.map((item) => item.evidenceRefId) || evidenceIds
  );
  const staleThresholdMs = input.staleThresholdMs ?? 15 * 60 * 1000;

  for (const [
    evidenceIndex,
    evidence
  ] of proposal.observerEvidenceRefs.entries()) {
    if (!observerEvidenceIds.has(evidence.evidenceRefId)) {
      findings.push(
        finding(
          "evidence",
          "blocker",
          "MISSING_OBSERVER_EVIDENCE",
          "Observer summary does not include the proposal evidence ref.",
          `proposal.observerEvidenceRefs[${evidenceIndex}]`
        )
      );
    }
    const evidenceAge = ageMs(evidence.observedAt, now);
    if (evidenceAge !== undefined && evidenceAge > staleThresholdMs) {
      findings.push(
        finding(
          "stale_evidence",
          "blocker",
          "STALE_EVIDENCE_OVER_THRESHOLD",
          "Observer evidence is older than the allowed target validation threshold.",
          `proposal.observerEvidenceRefs[${evidenceIndex}].observedAt`
        )
      );
    }
  }

  for (const [index, operation] of proposal.operations.entries()) {
    const path = `proposal.operations[${index}]`;
    if (!evidenceIds.has(operation.targetRef.observerEvidenceRefId)) {
      findings.push(
        finding(
          "evidence",
          "blocker",
          "UNKNOWN_TARGET_EVIDENCE",
          "Operation target references unknown observer evidence.",
          `${path}.targetRef.observerEvidenceRefId`
        )
      );
    }

    if (highRiskActionKinds.has(operation.actionKind)) {
      findings.push(
        finding(
          "risk",
          "warning",
          "HIGH_RISK_ACTION_KIND",
          "Target validation sees a desktop action kind that requires risk classification.",
          `${path}.actionKind`
        )
      );
    }

    if (!operation.targetRef.labelSummary) {
      findings.push(
        finding(
          "target",
          "warning",
          "TARGET_LABEL_MISSING",
          "Target label summary is missing.",
          `${path}.targetRef.labelSummary`
        )
      );
    }

    const target = findTarget(operation, current, observer);
    if (!target) {
      findings.push(
        finding(
          "target",
          "blocker",
          "TARGET_METADATA_MISSING",
          "Target is not present in current or observer metadata summaries.",
          `${path}.targetRef`
        )
      );
      continue;
    }

    if (
      operation.targetRef.windowIdHash &&
      target.windowIdHash &&
      operation.targetRef.windowIdHash !== target.windowIdHash
    ) {
      findings.push(
        finding(
          "window",
          "blocker",
          "TARGET_WINDOW_MISMATCH",
          "Target window hash does not match current metadata.",
          `${path}.targetRef.windowIdHash`
        )
      );
    }

    if (
      operation.targetRef.appIdHash &&
      target.appIdHash &&
      operation.targetRef.appIdHash !== target.appIdHash
    ) {
      findings.push(
        finding(
          "app",
          "blocker",
          "TARGET_APP_MISMATCH",
          "Target app hash does not match current metadata.",
          `${path}.targetRef.appIdHash`
        )
      );
    }

    if (
      operation.targetRef.displayIdHash &&
      target.displayIdHash &&
      operation.targetRef.displayIdHash !== target.displayIdHash
    ) {
      findings.push(
        finding(
          "display",
          "blocker",
          "TARGET_DISPLAY_MISMATCH",
          "Target display hash does not match current metadata.",
          `${path}.targetRef.displayIdHash`
        )
      );
    }

    if (target.candidateCount !== undefined && target.candidateCount > 1) {
      findings.push(
        finding(
          "target",
          "warning",
          "MULTIPLE_CANDIDATE_TARGETS",
          "Current metadata has multiple candidate targets for this action.",
          `${path}.targetRef.targetId`
        )
      );
    }

    if (target.confidence !== undefined && target.confidence < 0.6) {
      findings.push(
        finding(
          "bounds",
          "warning",
          "LOW_CONFIDENCE_BOUNDS",
          "Target bounds confidence is low.",
          `${path}.targetRef.boundsSummary`
        )
      );
    }

    if (
      operation.targetRef.boundsSummary &&
      target.boundsSummary &&
      operation.targetRef.boundsSummary !== target.boundsSummary
    ) {
      findings.push(
        finding(
          "window",
          "warning",
          "WINDOW_MOVED",
          "Current target bounds differ from the observation summary.",
          `${path}.targetRef.boundsSummary`
        )
      );
    }

    const parsedBounds = bounds(
      target.boundsSummary || operation.targetRef.boundsSummary
    );
    const display = current?.displays?.find(
      (item) =>
        item.displayIdHash ===
        (target.displayIdHash || operation.targetRef.displayIdHash)
    );
    const size = displaySize(display?.sizeSummary);
    if (
      parsedBounds &&
      (parsedBounds.x < 0 ||
        parsedBounds.y < 0 ||
        parsedBounds.w <= 0 ||
        parsedBounds.h <= 0 ||
        (size &&
          (parsedBounds.x + parsedBounds.w > size.width ||
            parsedBounds.y + parsedBounds.h > size.height)))
    ) {
      findings.push(
        finding(
          "bounds",
          "blocker",
          "IMPOSSIBLE_SCREEN_BOUNDS",
          "Target bounds are impossible for the current display summary.",
          `${path}.targetRef.boundsSummary`
        )
      );
    }

    if (
      current?.displays &&
      current.displays.length > 1 &&
      operation.targetRef.displayIdHash &&
      !current.displays.find(
        (item) => item.displayIdHash === operation.targetRef.displayIdHash
      )
    ) {
      findings.push(
        finding(
          "display",
          "warning",
          "CROSS_DISPLAY_TARGET",
          "Target references a display outside the current primary display set.",
          `${path}.targetRef.displayIdHash`
        )
      );
    }

    if (isSensitiveTarget(operation, input.sensitiveTargetPolicy)) {
      findings.push(
        finding(
          "sensitive_target",
          "warning",
          "SENSITIVE_TARGET",
          "Target metadata marks this target as sensitive.",
          `${path}.targetRef.sensitiveKind`
        )
      );
      if (shouldBlockSensitiveAction(operation, input.sensitiveTargetPolicy)) {
        findings.push(
          finding(
            "sensitive_target",
            "blocker",
            "SENSITIVE_TARGET_BLOCKED",
            "Sensitive targets cannot receive text, clipboard, or file-dialog action proposals.",
            `${path}.actionKind`
          )
        );
      }
    }
  }

  const allowed = input.allowedAppRefs
    ? new Set(input.allowedAppRefs)
    : undefined;
  const denied = new Set(input.deniedAppRefs || []);
  const proposalApps = unique(
    proposal.operations
      .map((item) => item.targetRef.appIdHash)
      .filter((item): item is string => Boolean(item))
  );
  for (const appIdHash of proposalApps) {
    if (denied.has(appIdHash)) {
      findings.push(
        finding(
          "app",
          "blocker",
          "DENIED_APP_REF",
          "Desktop action proposal targets a denied app ref.",
          "deniedAppRefs"
        )
      );
    }
    if (allowed && !allowed.has(appIdHash)) {
      findings.push(
        finding(
          "app",
          "blocker",
          "APP_REF_NOT_ALLOWED",
          "Desktop action proposal targets an app ref outside the allowed list.",
          "allowedAppRefs"
        )
      );
    }
  }

  if (observer?.warningCodes?.includes("APP_CHANGED")) {
    findings.push(
      finding(
        "app",
        "warning",
        "APP_CHANGED",
        "Observer metadata reports that the app changed since observation.",
        "observerSummary.warningCodes"
      )
    );
  }

  return makeResult(input, proposal, findings, input.idGenerator);
}

export function summarizeDesktopTargetValidation(
  result: DesktopTargetMetadataValidationResult
): DesktopTargetMetadataValidationSummary {
  return result.summary;
}
