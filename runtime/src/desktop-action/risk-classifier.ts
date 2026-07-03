import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type {
  DesktopActionKind,
  DesktopActionOperation,
  DesktopActionProposal,
  DesktopActionProposalValidationResult
} from "./action-proposal-schema.js";
import type { DesktopTargetMetadataValidationResult } from "./target-metadata-validation.js";

export type DesktopActionRiskLevel =
  | "D0_INFO"
  | "D1_LOW"
  | "D2_MEDIUM"
  | "D3_HIGH"
  | "D4_CRITICAL"
  | "D5_BLOCKED";

export type DesktopActionRiskClassifierInput = {
  proposal?: DesktopActionProposal | DesktopActionProposalValidationResult;
  targetValidation?: DesktopTargetMetadataValidationResult | undefined;
  observerEvidenceSummary?: Record<string, unknown> | undefined;
  policy?: DesktopActionRiskPolicy | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type DesktopActionRiskPolicy = {
  blockSensitiveTargets?: boolean | undefined;
  blockClipboardActions?: boolean | undefined;
  blockFileDialogActions?: boolean | undefined;
  blockHiddenTargets?: boolean | undefined;
  criticalActionKinds?: DesktopActionKind[] | undefined;
};

export type DesktopActionApprovalMode =
  | "none"
  | "manual_review"
  | "typed_confirmation"
  | "explicit_approval_required"
  | "blocked";

export type DesktopActionRiskClassifierStatus =
  | "classified"
  | "warning"
  | "blocked";

export type DesktopActionRiskFindingKind =
  | "schema"
  | "proposal"
  | "target_validation"
  | "action_kind"
  | "sensitive_target"
  | "hidden_target"
  | "clipboard"
  | "file_dialog"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "policy";

export type DesktopActionRiskSeverity = "blocker" | "warning";

export type DesktopActionRiskFinding = {
  findingId: string;
  kind: DesktopActionRiskFindingKind;
  severity: DesktopActionRiskSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionOperationRiskSummary = {
  operationId: string;
  actionKind: DesktopActionKind;
  riskLevel: DesktopActionRiskLevel;
  requiredApprovalMode: DesktopActionApprovalMode;
  requiresTypedConfirmation: boolean;
  warningCodes: string[];
  blockedReasons: string[];
};

export type DesktopActionCapabilityBrokerRiskMapping = {
  planningLane: "desktop_action_proposal_only";
  riskLevel: DesktopActionRiskLevel;
  canPlan: boolean;
  canExecute: false;
  requiredGate: "desktop_action_approval_draft";
};

export type DesktopActionRiskReadiness = {
  canEnterApprovalDraft: boolean;
  canEnterSimulation: boolean;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canUseClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionRiskSummary = {
  status: DesktopActionRiskClassifierStatus;
  proposalId?: string | undefined;
  riskLevel: DesktopActionRiskLevel;
  riskScore: number;
  requiredApprovalMode: DesktopActionApprovalMode;
  requiresTypedConfirmation: boolean;
  operationCount: number;
  blockedReasons: string[];
  warningCodes: string[];
  classificationHash: string;
  summaryOnly: true;
};

export type DesktopActionRiskClassification = {
  status: DesktopActionRiskClassifierStatus;
  classificationId: string;
  proposalId?: string | undefined;
  riskLevel: DesktopActionRiskLevel;
  riskScore: number;
  requiredApprovalMode: DesktopActionApprovalMode;
  requiresTypedConfirmation: boolean;
  operationRisks: DesktopActionOperationRiskSummary[];
  capabilityBrokerRiskMapping: DesktopActionCapabilityBrokerRiskMapping;
  blockedReasons: string[];
  warningCodes: string[];
  findings: DesktopActionRiskFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  classificationHash: string;
  summary: DesktopActionRiskSummary;
  readiness: DesktopActionRiskReadiness;
  nextAction: string;
  source: "runtime_desktop_action_risk_classifier";
};

const riskRank: Record<DesktopActionRiskLevel, number> = {
  D0_INFO: 0,
  D1_LOW: 1,
  D2_MEDIUM: 2,
  D3_HIGH: 3,
  D4_CRITICAL: 4,
  D5_BLOCKED: 5
};

const riskScore: Record<DesktopActionRiskLevel, number> = {
  D0_INFO: 0,
  D1_LOW: 10,
  D2_MEDIUM: 40,
  D3_HIGH: 70,
  D4_CRITICAL: 90,
  D5_BLOCKED: 100
};

const clipboardKinds = new Set<DesktopActionKind>([
  "copy_selection",
  "paste_text"
]);
const textKinds = new Set<DesktopActionKind>(["type_text", "paste_text"]);
const fileDialogKinds = new Set<DesktopActionKind>([
  "open_file_dialog",
  "choose_file"
]);

const forbiddenFieldKeys = new Set(
  [
    "rawScreenshot",
    "screenshotBytes",
    "rawOcrText",
    "rawUiText",
    "rawPrompt",
    "rawResponse",
    "apiKey",
    "Authorization",
    "bearer",
    "secret",
    "clipboardContent",
    "fileContent",
    "command",
    "shellCommand",
    "gitCommand",
    "nativeBridge",
    "eventStoreWrite",
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
  "CLIPBOARD_CONTENT"
];

function emptyReadiness(
  canEnterApprovalDraft = false
): DesktopActionRiskReadiness {
  return {
    canEnterApprovalDraft,
    canEnterSimulation: canEnterApprovalDraft,
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
  kind: DesktopActionRiskFindingKind,
  severity: DesktopActionRiskSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionRiskFinding {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasProposalResult(
  value: unknown
): value is DesktopActionProposalValidationResult {
  return isRecord(value) && "summary" in value && "source" in value;
}

function extractProposal(
  value: DesktopActionRiskClassifierInput["proposal"],
  findings: DesktopActionRiskFinding[]
): DesktopActionProposal | undefined {
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
          "Blocked desktop action proposals cannot be risk-classified.",
          "proposal"
        )
      );
      return undefined;
    }
    return value.proposal;
  }
  return value;
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopActionRiskFinding[]
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
    scanUnsafeFields(child, path ? `${path}.${key}` : key, findings);
  }
}

function baseRiskForKind(kind: DesktopActionKind): DesktopActionRiskLevel {
  switch (kind) {
    case "focus_window":
      return "D1_LOW";
    case "click_target":
    case "select_menu":
    case "scroll":
      return "D2_MEDIUM";
    case "type_text":
    case "press_key":
    case "copy_selection":
    case "paste_text":
    case "open_file_dialog":
    case "drag_drop":
      return "D3_HIGH";
    case "choose_file":
      return "D4_CRITICAL";
  }
}

function approvalModeFor(
  level: DesktopActionRiskLevel
): DesktopActionApprovalMode {
  if (level === "D5_BLOCKED") {
    return "blocked";
  }
  if (level === "D4_CRITICAL") {
    return "explicit_approval_required";
  }
  if (level === "D3_HIGH") {
    return "typed_confirmation";
  }
  if (level === "D2_MEDIUM") {
    return "manual_review";
  }
  return "none";
}

function highestRisk(levels: DesktopActionRiskLevel[]): DesktopActionRiskLevel {
  return levels.reduce(
    (current, next) => (riskRank[next] > riskRank[current] ? next : current),
    "D0_INFO"
  );
}

function operationRisk(
  operation: DesktopActionOperation,
  policy: DesktopActionRiskPolicy | undefined
): DesktopActionOperationRiskSummary {
  const warnings: string[] = [];
  const blockers: string[] = [];
  let level = baseRiskForKind(operation.actionKind);
  if (operation.actionKind === "click_target") {
    warnings.push("CLICK_TARGET_REQUIRES_REVIEW");
  }
  if (operation.actionKind !== "focus_window" && warnings.length === 0) {
    warnings.push("DESKTOP_ACTION_REQUIRES_REVIEW");
  }
  if (textKinds.has(operation.actionKind)) {
    warnings.push("TEXT_INPUT_REQUIRES_TYPED_CONFIRMATION");
  }
  if (clipboardKinds.has(operation.actionKind)) {
    warnings.push("CLIPBOARD_ACTION_REQUIRES_REVIEW");
    if (policy?.blockClipboardActions) {
      blockers.push("CLIPBOARD_ACTION_BLOCKED");
      level = "D5_BLOCKED";
    }
  }
  if (fileDialogKinds.has(operation.actionKind)) {
    warnings.push("FILE_DIALOG_REQUIRES_REVIEW");
    if (
      operation.actionKind === "choose_file" ||
      policy?.blockFileDialogActions
    ) {
      level = policy?.blockFileDialogActions ? "D5_BLOCKED" : level;
      if (policy?.blockFileDialogActions) {
        blockers.push("FILE_DIALOG_ACTION_BLOCKED");
      }
    }
  }
  if (operation.targetRef.sensitiveKind) {
    warnings.push("SENSITIVE_TARGET");
    if (policy?.blockSensitiveTargets !== false) {
      blockers.push("SENSITIVE_TARGET_BLOCKED");
      level = "D5_BLOCKED";
    } else if (riskRank[level] < riskRank.D3_HIGH) {
      level = "D3_HIGH";
    }
  }
  const targetText = [
    operation.targetRef.role,
    operation.targetRef.labelSummary,
    operation.targetRef.boundsSummary
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/hidden|background|offscreen/.test(targetText)) {
    warnings.push("HIDDEN_OR_BACKGROUND_TARGET");
    if (policy?.blockHiddenTargets !== false) {
      blockers.push("HIDDEN_OR_BACKGROUND_TARGET_BLOCKED");
      level = "D5_BLOCKED";
    }
  }
  if (policy?.criticalActionKinds?.includes(operation.actionKind)) {
    level = highestRisk([level, "D4_CRITICAL"]);
    warnings.push("POLICY_CRITICAL_ACTION_KIND");
  }
  if (blockers.length > 0) {
    level = "D5_BLOCKED";
  }
  const approvalMode = approvalModeFor(level);
  return {
    operationId: operation.operationId,
    actionKind: operation.actionKind,
    riskLevel: level,
    requiredApprovalMode: approvalMode,
    requiresTypedConfirmation:
      approvalMode === "typed_confirmation" ||
      approvalMode === "explicit_approval_required",
    warningCodes: warnings,
    blockedReasons: blockers
  };
}

function result(
  input: DesktopActionRiskClassifierInput,
  proposal: DesktopActionProposal | undefined,
  findings: DesktopActionRiskFinding[],
  operationRisks: DesktopActionOperationRiskSummary[]
): DesktopActionRiskClassification {
  const blockedReasons = operationRisks.flatMap((item) => item.blockedReasons);
  for (const reason of blockedReasons) {
    findings.push(
      finding(
        "policy",
        "blocker",
        reason,
        "Desktop action risk policy blocked this proposal."
      )
    );
  }
  const warningCodes = operationRisks.flatMap((item) => item.warningCodes);
  for (const warning of warningCodes) {
    findings.push(
      finding(
        "action_kind",
        "warning",
        warning,
        "Desktop action proposal requires risk review."
      )
    );
  }
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const riskLevel =
    blockerCount > 0
      ? "D5_BLOCKED"
      : highestRisk(operationRisks.map((item) => item.riskLevel));
  const status: DesktopActionRiskClassifierStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "classified";
  const requiredApprovalMode = approvalModeFor(riskLevel);
  const core = {
    proposalId: proposal?.proposalId,
    riskLevel,
    riskScore: riskScore[riskLevel],
    requiredApprovalMode,
    operationRisks,
    blockedReasons,
    warningCodes,
    createdAt: input.createdAt
  };
  const classificationHash = stablePreviewHash(JSON.stringify(core));
  const classificationId =
    input.idGenerator?.() ||
    `desktop-action-risk-${classificationHash.slice(0, 12)}`;
  const mapping: DesktopActionCapabilityBrokerRiskMapping = {
    planningLane: "desktop_action_proposal_only",
    riskLevel,
    canPlan: status !== "blocked",
    canExecute: false,
    requiredGate: "desktop_action_approval_draft"
  };
  return {
    status,
    classificationId,
    ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
    riskLevel,
    riskScore: riskScore[riskLevel],
    requiredApprovalMode,
    requiresTypedConfirmation:
      requiredApprovalMode === "typed_confirmation" ||
      requiredApprovalMode === "explicit_approval_required",
    operationRisks,
    capabilityBrokerRiskMapping: mapping,
    blockedReasons,
    warningCodes,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    classificationHash,
    summary: {
      status,
      ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
      riskLevel,
      riskScore: riskScore[riskLevel],
      requiredApprovalMode,
      requiresTypedConfirmation:
        requiredApprovalMode === "typed_confirmation" ||
        requiredApprovalMode === "explicit_approval_required",
      operationCount: proposal?.operations.length || 0,
      blockedReasons,
      warningCodes,
      classificationHash,
      summaryOnly: true
    },
    readiness: emptyReadiness(status !== "blocked" && Boolean(proposal)),
    nextAction:
      status === "blocked"
        ? "Fix risk blockers before approval draft or simulation."
        : "Proceed to desktop action approval draft or dry-run simulation.",
    source: "runtime_desktop_action_risk_classifier"
  };
}

export function classifyDesktopActionRisk(
  input: DesktopActionRiskClassifierInput
): DesktopActionRiskClassification {
  const findings: DesktopActionRiskFinding[] = [];
  scanUnsafeFields(input, "", findings);
  const proposal = extractProposal(input.proposal, findings);
  if (!proposal) {
    return result(input, undefined, findings, []);
  }
  if (
    input.targetValidation?.status === "blocked" ||
    (input.targetValidation?.blockerCount || 0) > 0
  ) {
    findings.push(
      finding(
        "target_validation",
        "blocker",
        "TARGET_VALIDATION_BLOCKED",
        "Blocked target metadata validation prevents risk classification.",
        "targetValidation"
      )
    );
  }
  if (!input.targetValidation) {
    findings.push(
      finding(
        "target_validation",
        "warning",
        "TARGET_VALIDATION_MISSING",
        "Risk classification is partial without target metadata validation.",
        "targetValidation"
      )
    );
  }
  const operationRisks = proposal.operations.map((operation) =>
    operationRisk(operation, input.policy)
  );
  return result(input, proposal, findings, operationRisks);
}

export function summarizeDesktopActionRisk(
  classification: DesktopActionRiskClassification
): DesktopActionRiskSummary {
  return classification.summary;
}
