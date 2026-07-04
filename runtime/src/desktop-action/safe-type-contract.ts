import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type { ApprovedExpandedDesktopActionReceipt } from "./approved-expanded-action-receipt.js";

export type SafeTypeContractStatus = "planned" | "warning" | "blocked";
export type SafeTypeContractSeverity = "info" | "warning" | "blocker";
export type SafeTypeContractFindingKind =
  | "action_kind"
  | "receipt"
  | "observation"
  | "target"
  | "text_policy"
  | "proposal"
  | "freshness"
  | "risk"
  | "simulation"
  | "forbidden_field"
  | "secret_marker"
  | "raw_field"
  | "readiness";

export type SafeTypeContractFinding = {
  findingId: string;
  kind: SafeTypeContractFindingKind;
  severity: SafeTypeContractSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type SafeTypeObservationSummary = {
  observationId?: string | undefined;
  observedAt?: string | undefined;
  windowRef?: string | undefined;
  appRef?: string | undefined;
  displayRef?: string | undefined;
  targetIds?: string[] | undefined;
  targetHash?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type SafeTypeTargetSummary = {
  targetId?: string | undefined;
  targetKind?: string | undefined;
  windowRef?: string | undefined;
  appRef?: string | undefined;
  displayRef?: string | undefined;
  targetHash?: string | undefined;
  safeTarget?: boolean | undefined;
  textField?: boolean | undefined;
  passwordField?: boolean | undefined;
  apiKeyField?: boolean | undefined;
  paymentField?: boolean | undefined;
  hiddenField?: boolean | undefined;
  destructiveConfirmationField?: boolean | undefined;
  securityPrompt?: boolean | undefined;
  warningCodes?: string[] | undefined;
};

export type SafeTypeTextSummary = {
  textHash?: string | undefined;
  textLength?: number | undefined;
  textValue?: string | undefined;
  multiline?: boolean | undefined;
  allowMultiline?: boolean | undefined;
  containsControlCharacters?: boolean | undefined;
  containsSecretMarker?: boolean | undefined;
  passwordLike?: boolean | undefined;
  shellCommandLike?: boolean | undefined;
  warningCodes?: string[] | undefined;
};

export type SafeTypeProposalSummary = {
  proposalId?: string | undefined;
  actionKind?: string | undefined;
  targetId?: string | undefined;
  windowRef?: string | undefined;
  appRef?: string | undefined;
  displayRef?: string | undefined;
  targetHash?: string | undefined;
  expectedEffectSummary?: string | undefined;
};

export type SafeTypeRiskClassificationSummary = {
  riskClassificationId?: string | undefined;
  riskLevel?: string | undefined;
  riskClass?: string | undefined;
  destructiveRisk?: boolean | undefined;
  sensitiveTargetBlocked?: boolean | undefined;
  blockerCodes?: string[] | undefined;
  warningCodes?: string[] | undefined;
};

export type SafeTypeSimulationSummary = {
  simulationId?: string | undefined;
  status?: string | undefined;
  safeForType?: boolean | undefined;
  stepCount?: number | undefined;
  typeCount?: number | undefined;
  warningCodes?: string[] | undefined;
  blockerCodes?: string[] | undefined;
};

export type SafeTypeFreshnessPolicy = {
  staleThresholdMs?: number | undefined;
};

export type SafeTypeContractInput = {
  actionKind?: "type_into_observed_text_field" | string | undefined;
  observationSummary?: SafeTypeObservationSummary | undefined;
  targetSummary?: SafeTypeTargetSummary | undefined;
  textSummary?: SafeTypeTextSummary | undefined;
  proposalSummary?: SafeTypeProposalSummary | undefined;
  riskClassification?: SafeTypeRiskClassificationSummary | undefined;
  simulationSummary?: SafeTypeSimulationSummary | undefined;
  receipt?: ApprovedExpandedDesktopActionReceipt | undefined;
  freshnessPolicy?: SafeTypeFreshnessPolicy | undefined;
  maxTextLength?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type SafeTypeContractPlan = {
  contractId: string;
  actionKind: "type_into_observed_text_field";
  receiptId?: string | undefined;
  proposalId?: string | undefined;
  observationId?: string | undefined;
  targetRef: string;
  windowRef: string;
  appRef: string;
  displayRef?: string | undefined;
  targetHash?: string | undefined;
  textHash: string;
  textLength: number;
  freshnessStatus: "fresh" | "warning" | "blocked";
  riskStatus: "safe" | "warning" | "blocked";
  simulationStatus: "safe" | "warning" | "blocked";
  summaryOnly: true;
  contractHash: string;
};

export type SafeTypeContractReadiness = {
  canExecuteViaFixedTauriCommand: boolean;
  canCallTauriCommand: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canSelect: false;
  canDragDrop: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type SafeTypeContract = {
  status: SafeTypeContractStatus;
  contractId: string;
  actionKind: "type_into_observed_text_field";
  targetRef: string;
  windowRef: string;
  appRef: string;
  displayRef?: string | undefined;
  textHash: string;
  textLength: number;
  freshnessStatus: "fresh" | "warning" | "blocked";
  riskStatus: "safe" | "warning" | "blocked";
  simulationStatus: "safe" | "warning" | "blocked";
  plan?: SafeTypeContractPlan | undefined;
  findings: SafeTypeContractFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  contractHash: string;
  readiness: SafeTypeContractReadiness;
  nextAction: string;
  source: "runtime_safe_type_contract";
  summaryOnly: true;
};

export type SafeTypeContractValidationResult = {
  ok: boolean;
  status: SafeTypeContractStatus;
  findings: SafeTypeContractFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: SafeTypeContractReadiness;
};

type NormalizedSafeTypeInput = {
  requestedActionKind: string;
  observationId: string;
  observedAt?: string | undefined;
  targetId: string;
  proposalId: string;
  riskClassificationId: string;
  simulationId: string;
  windowRef: string;
  appRef: string;
  displayRef?: string | undefined;
  targetHash?: string | undefined;
  targetIds: string[];
  targetKind?: string | undefined;
  targetSafe: boolean;
  textField: boolean;
  passwordField: boolean;
  apiKeyField: boolean;
  paymentField: boolean;
  hiddenField: boolean;
  destructiveConfirmationField: boolean;
  securityPrompt: boolean;
  textHash: string;
  textLength: number;
  textValue?: string | undefined;
  multiline: boolean;
  allowMultiline: boolean;
  containsControlCharacters: boolean;
  containsSecretMarker: boolean;
  passwordLike: boolean;
  shellCommandLike: boolean;
  maxTextLength: number;
  riskLevel?: string | undefined;
  riskClass?: string | undefined;
  destructiveRisk: boolean;
  sensitiveTargetBlocked: boolean;
  riskBlockerCodes: string[];
  simulationStatus?: string | undefined;
  simulationSafeForType?: boolean | undefined;
  simulationStepCount?: number | undefined;
  simulationTypeCount?: number | undefined;
  simulationBlockerCodes: string[];
  staleThresholdMs: number;
  createdAt: string;
};

const SOURCE = "runtime_safe_type_contract" as const;
const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";
const DEFAULT_STALE_THRESHOLD_MS = 60 * 1000;
const DEFAULT_MAX_TEXT_LENGTH = 80;
const ACTION_KIND = "type_into_observed_text_field" as const;
const REQUIRED_CONFIRMATION = "TYPE INTO OBSERVED FIELD";

const forbiddenFieldNames = new Set(
  [
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "env",
    "envValue",
    "processEnvValue",
    "vaultSecretValue",
    "password",
    "rawKey",
    "rawPrompt",
    "promptText",
    "rawResponse",
    "responseText",
    "reasoningContent",
    "reasoning_content",
    "rawSource",
    "rawDiff",
    "rawPatch",
    "rawDom",
    "rawCsv",
    "rawScreenshot",
    "screenshotBytes",
    "rawOcr",
    "rawOcrText",
    "ocrText",
    "rawTargetText",
    "targetText",
    "rawText",
    "clipboardContent",
    "clipboardOperation",
    "writeClipboard",
    "fileDialogOperation",
    "openFileDialog",
    "dragDropOperation",
    "rawCoordinates",
    "coordinates",
    "clickX",
    "clickY",
    "screenX",
    "screenY",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
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
    "clickNow",
    "typeNow",
    "executeNow"
  ].map(normalizeFieldName)
);

const executionReadinessFields = new Set(
  [
    "canCallTauriCommand",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canSelect",
    "canDragDrop",
    "canWriteClipboard",
    "canOpenFileDialog",
    "canWriteEventStore",
    "canUseNativeBridge",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "desktopActionExecute",
    "clickNow",
    "typeNow",
    "executeNow"
  ].map(normalizeFieldName)
);

const rawMarkers = [
  "RAW_SCREENSHOT",
  "SCREENSHOT_BYTES",
  "RAW_OCR",
  "RAW_UI_TEXT",
  "RAW_TARGET_TEXT",
  "RAW_TEXT",
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF",
  "CLIPBOARD_CONTENT"
];

export function buildSafeTypeContract(
  input: SafeTypeContractInput = {}
): SafeTypeContract {
  const normalized = normalizeInput(input);
  const findings = validateNormalizedInput(input, normalized);
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const status: SafeTypeContractStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "planned";
  const freshnessStatus = freshnessStatusFor(findings);
  const riskStatus = riskStatusFor(findings);
  const simulationStatus = simulationStatusFor(findings);
  const contractHash = stableHash({
    source: SOURCE,
    status,
    actionKind: ACTION_KIND,
    receiptId: input.receipt?.receiptId,
    proposalId: normalized.proposalId,
    observationId: normalized.observationId,
    targetId: normalized.targetId,
    windowRef: normalized.windowRef,
    appRef: normalized.appRef,
    displayRef: normalized.displayRef,
    targetHash: normalized.targetHash,
    textHash: normalized.textHash,
    textLength: normalized.textLength,
    blockerCodes: findings
      .filter((finding) => finding.severity === "blocker")
      .map((finding) => finding.code),
    warningCodes: findings
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.code)
  });
  const contractId =
    input.idGenerator?.() || `safe-type-contract-${contractHash.slice(0, 12)}`;
  const plan: SafeTypeContractPlan = {
    contractId,
    actionKind: ACTION_KIND,
    ...(input.receipt?.receiptId ? { receiptId: input.receipt.receiptId } : {}),
    ...(normalized.proposalId ? { proposalId: normalized.proposalId } : {}),
    ...(normalized.observationId
      ? { observationId: normalized.observationId }
      : {}),
    targetRef: normalized.targetId,
    windowRef: normalized.windowRef,
    appRef: normalized.appRef,
    ...(normalized.displayRef ? { displayRef: normalized.displayRef } : {}),
    ...(normalized.targetHash ? { targetHash: normalized.targetHash } : {}),
    textHash: normalized.textHash,
    textLength: normalized.textLength,
    freshnessStatus,
    riskStatus,
    simulationStatus,
    summaryOnly: true,
    contractHash
  };

  return {
    status,
    contractId,
    actionKind: ACTION_KIND,
    targetRef: normalized.targetId,
    windowRef: normalized.windowRef,
    appRef: normalized.appRef,
    ...(normalized.displayRef ? { displayRef: normalized.displayRef } : {}),
    textHash: normalized.textHash,
    textLength: normalized.textLength,
    freshnessStatus,
    riskStatus,
    simulationStatus,
    ...(status !== "blocked" ? { plan } : {}),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    contractHash,
    readiness: disabledReadiness(status !== "blocked"),
    nextAction: nextActionFor(status),
    source: SOURCE,
    summaryOnly: true
  };
}

export function validateSafeTypeContractInput(
  input: SafeTypeContractInput = {}
): SafeTypeContractValidationResult {
  const contract = buildSafeTypeContract(input);
  return {
    ok: contract.status !== "blocked",
    status: contract.status,
    findings: contract.findings,
    blockerCount: contract.blockerCount,
    warningCount: contract.warningCount,
    findingCount: contract.findingCount,
    readiness: contract.readiness
  };
}

export function summarizeSafeTypeContract(contract: SafeTypeContract): string {
  return [
    `status:${contract.status}`,
    `contract:${contract.contractId}`,
    `action:${contract.actionKind}`,
    `target:${contract.targetRef}`,
    `text_hash:${contract.textHash.slice(0, 12)}`,
    `text_length:${contract.textLength}`,
    `freshness:${contract.freshnessStatus}`,
    `risk:${contract.riskStatus}`,
    `simulation:${contract.simulationStatus}`,
    `blockers:${contract.blockerCount}`,
    `warnings:${contract.warningCount}`,
    `hash:${contract.contractHash.slice(0, 12)}`,
    "summary_only:true",
    "raw_text:false",
    "tauri_call:false",
    "desktop_execution:false",
    "event_write:false"
  ].join(" | ");
}

function normalizeInput(
  input: SafeTypeContractInput
): NormalizedSafeTypeInput {
  const observation = isRecord(input.observationSummary)
    ? input.observationSummary
    : {};
  const target = isRecord(input.targetSummary) ? input.targetSummary : {};
  const text = isRecord(input.textSummary) ? input.textSummary : {};
  const proposal = isRecord(input.proposalSummary) ? input.proposalSummary : {};
  const risk = isRecord(input.riskClassification)
    ? input.riskClassification
    : {};
  const simulation = isRecord(input.simulationSummary)
    ? input.simulationSummary
    : {};
  const textValue = safeOptionalString(text.textValue);
  const textLength =
    safeOptionalNonNegativeInteger(text.textLength) ?? textValue?.length ?? 0;
  const textHash =
    safeOptionalString(text.textHash) ??
    stableHash({ textValue: textValue ?? "", textLength }).slice(0, 32);
  const maxTextLength =
    safeOptionalPositiveInteger(input.maxTextLength) ??
    safeOptionalPositiveInteger(input.receipt?.scope.maxTextLength) ??
    DEFAULT_MAX_TEXT_LENGTH;
  return {
    requestedActionKind: safeString(input.actionKind, ""),
    observationId: safeString(
      input.receipt?.scope.observationId ?? observation.observationId,
      ""
    ),
    observedAt: safeOptionalString(observation.observedAt),
    targetId: safeString(
      input.receipt?.scope.targetId ?? target.targetId ?? proposal.targetId,
      ""
    ),
    proposalId: safeString(
      input.receipt?.scope.proposalId ?? proposal.proposalId,
      ""
    ),
    riskClassificationId: safeString(
      input.receipt?.scope.riskClassificationId ??
        risk.riskClassificationId,
      ""
    ),
    simulationId: safeString(
      input.receipt?.scope.simulationId ?? simulation.simulationId,
      ""
    ),
    windowRef: safeString(
      input.receipt?.scope.windowRef ?? target.windowRef ?? proposal.windowRef,
      ""
    ),
    appRef: safeString(
      input.receipt?.scope.appRef ?? target.appRef ?? proposal.appRef,
      ""
    ),
    displayRef: safeOptionalString(
      input.receipt?.scope.displayRef ??
        target.displayRef ??
        proposal.displayRef
    ),
    targetHash: safeOptionalString(
      input.receipt?.scope.targetHash ?? target.targetHash ?? proposal.targetHash
    ),
    targetIds: Array.isArray(observation.targetIds)
      ? observation.targetIds
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
      : [],
    targetKind: safeOptionalString(target.targetKind),
    targetSafe: target.safeTarget === true,
    textField: target.textField === true || target.targetKind === "text_field",
    passwordField: target.passwordField === true,
    apiKeyField: target.apiKeyField === true,
    paymentField: target.paymentField === true,
    hiddenField: target.hiddenField === true,
    destructiveConfirmationField: target.destructiveConfirmationField === true,
    securityPrompt: target.securityPrompt === true,
    textHash,
    textLength,
    textValue,
    multiline: text.multiline === true || /\r|\n/.test(textValue ?? ""),
    allowMultiline: text.allowMultiline === true,
    containsControlCharacters:
      text.containsControlCharacters === true ||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(textValue ?? ""),
    containsSecretMarker:
      text.containsSecretMarker === true ||
      containsSecretLikeMarker(textValue ?? ""),
    passwordLike:
      text.passwordLike === true || containsPasswordLikeText(textValue ?? ""),
    shellCommandLike:
      text.shellCommandLike === true || looksLikeShellCommand(textValue ?? ""),
    maxTextLength,
    riskLevel: safeOptionalString(risk.riskLevel),
    riskClass: safeOptionalString(risk.riskClass),
    destructiveRisk: risk.destructiveRisk === true,
    sensitiveTargetBlocked: risk.sensitiveTargetBlocked === true,
    riskBlockerCodes: safeStringArray(risk.blockerCodes),
    simulationStatus: safeOptionalString(simulation.status),
    simulationSafeForType:
      typeof simulation.safeForType === "boolean"
        ? simulation.safeForType
        : undefined,
    simulationStepCount: safeOptionalPositiveInteger(simulation.stepCount),
    simulationTypeCount: safeOptionalNonNegativeInteger(simulation.typeCount),
    simulationBlockerCodes: safeStringArray(simulation.blockerCodes),
    staleThresholdMs: safePositiveInteger(
      input.freshnessPolicy?.staleThresholdMs,
      DEFAULT_STALE_THRESHOLD_MS
    ),
    createdAt: safeString(input.createdAt, DEFAULT_CREATED_AT)
  };
}

function validateNormalizedInput(
  original: SafeTypeContractInput,
  input: NormalizedSafeTypeInput
): SafeTypeContractFinding[] {
  const findings = scanForbiddenInput(original);
  if (input.requestedActionKind !== ACTION_KIND) {
    add(
      findings,
      "action_kind",
      "blocker",
      "SAFE_TYPE_CONTRACT_ACTION_KIND_UNSUPPORTED"
    );
  }
  validateReceipt(original.receipt, input, findings);
  validateObservation(input, findings);
  validateTarget(input, original, findings);
  validateText(input, findings);
  validateProposal(input, original.proposalSummary, findings);
  validateRisk(input, findings);
  validateSimulation(input, findings);
  return dedupeFindings(findings);
}

function validateReceipt(
  receipt: ApprovedExpandedDesktopActionReceipt | undefined,
  input: NormalizedSafeTypeInput,
  findings: SafeTypeContractFinding[]
): void {
  if (receipt === undefined) {
    add(findings, "receipt", "blocker", "SAFE_TYPE_CONTRACT_RECEIPT_MISSING");
    return;
  }
  if (receipt.status !== "ready" || receipt.blockerCount > 0) {
    add(findings, "receipt", "blocker", "SAFE_TYPE_CONTRACT_RECEIPT_NOT_READY");
  }
  if (receipt.actionKind !== ACTION_KIND) {
    add(
      findings,
      "receipt",
      "blocker",
      "SAFE_TYPE_CONTRACT_RECEIPT_ACTION_MISMATCH"
    );
  }
  if (!receipt.typedConfirmationAccepted) {
    add(
      findings,
      "receipt",
      "blocker",
      "SAFE_TYPE_CONTRACT_RECEIPT_CONFIRMATION_BLOCKED"
    );
  }
  if (receipt.scope.typedConfirmation !== REQUIRED_CONFIRMATION) {
    add(
      findings,
      "receipt",
      "blocker",
      "SAFE_TYPE_CONTRACT_RECEIPT_CONFIRMATION_MISMATCH"
    );
  }
  if (!receipt.readiness.canEnterSafeTypeContract) {
    add(
      findings,
      "receipt",
      "blocker",
      "SAFE_TYPE_CONTRACT_RECEIPT_READINESS_BLOCKED"
    );
  }
  for (const [label, value, expected] of [
    ["receipt observation", receipt.scope.observationId, input.observationId],
    ["receipt target", receipt.scope.targetId, input.targetId],
    ["receipt proposal", receipt.scope.proposalId, input.proposalId],
    ["receipt risk", receipt.scope.riskClassificationId, input.riskClassificationId],
    ["receipt simulation", receipt.scope.simulationId, input.simulationId],
    ["receipt window", receipt.scope.windowRef, input.windowRef],
    ["receipt app", receipt.scope.appRef, input.appRef],
    ["receipt display", receipt.scope.displayRef, input.displayRef],
    ["receipt target hash", receipt.scope.targetHash, input.targetHash]
  ] as const) {
    if (value && expected && value !== expected) {
      add(
        findings,
        "receipt",
        "blocker",
        "SAFE_TYPE_CONTRACT_RECEIPT_SCOPE_MISMATCH",
        label
      );
    }
  }
}

function validateObservation(
  input: NormalizedSafeTypeInput,
  findings: SafeTypeContractFinding[]
): void {
  if (!input.observationId) {
    add(findings, "observation", "blocker", "SAFE_TYPE_CONTRACT_OBSERVATION_MISSING");
  }
  if (input.targetIds.length > 0 && !input.targetIds.includes(input.targetId)) {
    add(
      findings,
      "observation",
      "blocker",
      "SAFE_TYPE_CONTRACT_TARGET_NOT_IN_OBSERVATION"
    );
  }
  if (input.observedAt) {
    const age = ageMs(input.observedAt, input.createdAt);
    if (age === undefined) {
      add(
        findings,
        "freshness",
        "blocker",
        "SAFE_TYPE_CONTRACT_OBSERVATION_TIME_INVALID"
      );
    } else if (age > input.staleThresholdMs) {
      add(findings, "freshness", "blocker", "SAFE_TYPE_CONTRACT_OBSERVATION_STALE");
    }
  } else {
    add(
      findings,
      "freshness",
      "warning",
      "SAFE_TYPE_CONTRACT_OBSERVATION_TIME_MISSING"
    );
  }
}

function validateTarget(
  input: NormalizedSafeTypeInput,
  original: SafeTypeContractInput,
  findings: SafeTypeContractFinding[]
): void {
  if (!input.targetId) {
    add(findings, "target", "blocker", "SAFE_TYPE_CONTRACT_TARGET_MISSING");
  }
  if (!input.windowRef) {
    add(findings, "target", "blocker", "SAFE_TYPE_CONTRACT_WINDOW_MISSING");
  }
  if (!input.appRef) {
    add(findings, "target", "blocker", "SAFE_TYPE_CONTRACT_APP_MISSING");
  }
  if (!input.targetSafe || !input.textField) {
    add(
      findings,
      "target",
      "blocker",
      "SAFE_TYPE_CONTRACT_TARGET_NOT_SAFE_TEXT_FIELD"
    );
  }
  if (
    input.passwordField ||
    input.apiKeyField ||
    input.paymentField ||
    input.hiddenField ||
    input.destructiveConfirmationField ||
    input.securityPrompt ||
    containsSensitiveTargetMarker(
      [
        original.targetSummary?.targetKind,
        original.targetSummary?.warningCodes?.join(" ")
      ].join(" ")
    )
  ) {
    add(
      findings,
      "target",
      "blocker",
      "SAFE_TYPE_CONTRACT_SENSITIVE_TEXT_FIELD"
    );
  }
}

function validateText(
  input: NormalizedSafeTypeInput,
  findings: SafeTypeContractFinding[]
): void {
  if (!input.textHash) {
    add(findings, "text_policy", "blocker", "SAFE_TYPE_CONTRACT_TEXT_HASH_MISSING");
  }
  if (input.textLength <= 0) {
    add(findings, "text_policy", "blocker", "SAFE_TYPE_CONTRACT_TEXT_EMPTY");
  }
  if (input.textLength > input.maxTextLength) {
    add(findings, "text_policy", "blocker", "SAFE_TYPE_CONTRACT_TEXT_TOO_LONG");
  }
  if (input.multiline && !input.allowMultiline) {
    add(
      findings,
      "text_policy",
      "blocker",
      "SAFE_TYPE_CONTRACT_MULTILINE_BLOCKED"
    );
  }
  if (input.containsControlCharacters) {
    add(
      findings,
      "text_policy",
      "blocker",
      "SAFE_TYPE_CONTRACT_CONTROL_CHARACTERS_BLOCKED"
    );
  }
  if (input.containsSecretMarker || input.passwordLike) {
    add(
      findings,
      "text_policy",
      "blocker",
      "SAFE_TYPE_CONTRACT_SECRET_OR_PASSWORD_TEXT_BLOCKED"
    );
  }
  if (
    input.shellCommandLike &&
    (input.destructiveRisk || /high|blocked|destructive|D5|D4/i.test(input.riskLevel ?? ""))
  ) {
    add(
      findings,
      "text_policy",
      "blocker",
      "SAFE_TYPE_CONTRACT_SHELL_TEXT_BLOCKED_FOR_RISKY_TARGET"
    );
  }
}

function validateProposal(
  input: NormalizedSafeTypeInput,
  proposal: SafeTypeProposalSummary | undefined,
  findings: SafeTypeContractFinding[]
): void {
  if (!input.proposalId) {
    add(findings, "proposal", "blocker", "SAFE_TYPE_CONTRACT_PROPOSAL_MISSING");
  }
  if (proposal?.actionKind !== undefined && proposal.actionKind !== ACTION_KIND) {
    add(
      findings,
      "proposal",
      "blocker",
      "SAFE_TYPE_CONTRACT_PROPOSAL_ACTION_MISMATCH"
    );
  }
  for (const [label, value, expected] of [
    ["proposal target", proposal?.targetId, input.targetId],
    ["proposal window", proposal?.windowRef, input.windowRef],
    ["proposal app", proposal?.appRef, input.appRef],
    ["proposal display", proposal?.displayRef, input.displayRef],
    ["proposal target hash", proposal?.targetHash, input.targetHash]
  ] as const) {
    if (value && expected && value !== expected) {
      add(
        findings,
        "proposal",
        "blocker",
        "SAFE_TYPE_CONTRACT_PROPOSAL_SCOPE_MISMATCH",
        label
      );
    }
  }
}

function validateRisk(
  input: NormalizedSafeTypeInput,
  findings: SafeTypeContractFinding[]
): void {
  if (!input.riskClassificationId) {
    add(findings, "risk", "blocker", "SAFE_TYPE_CONTRACT_RISK_MISSING");
  }
  const riskText = `${input.riskLevel ?? ""} ${input.riskClass ?? ""}`;
  if (
    input.destructiveRisk ||
    input.riskBlockerCodes.length > 0 ||
    /\b(high|blocked|destructive|D5|D4)\b/i.test(riskText)
  ) {
    add(findings, "risk", "blocker", "SAFE_TYPE_CONTRACT_RISK_BLOCKED");
  }
  if (input.sensitiveTargetBlocked) {
    add(
      findings,
      "risk",
      "blocker",
      "SAFE_TYPE_CONTRACT_SENSITIVE_TARGET_BLOCKED"
    );
  }
}

function validateSimulation(
  input: NormalizedSafeTypeInput,
  findings: SafeTypeContractFinding[]
): void {
  if (!input.simulationId) {
    add(findings, "simulation", "blocker", "SAFE_TYPE_CONTRACT_SIMULATION_MISSING");
  }
  if (
    input.simulationBlockerCodes.length > 0 ||
    input.simulationSafeForType === false ||
    /\b(blocked|unsafe|failed)\b/i.test(input.simulationStatus ?? "")
  ) {
    add(findings, "simulation", "blocker", "SAFE_TYPE_CONTRACT_SIMULATION_BLOCKED");
  }
  if (input.simulationStepCount !== undefined && input.simulationStepCount > 1) {
    add(findings, "simulation", "blocker", "SAFE_TYPE_CONTRACT_MULTI_STEP_BLOCKED");
  }
  if (input.simulationTypeCount !== undefined && input.simulationTypeCount !== 1) {
    add(findings, "simulation", "blocker", "SAFE_TYPE_CONTRACT_SINGLE_TYPE_REQUIRED");
  }
}

function scanForbiddenInput(value: unknown): SafeTypeContractFinding[] {
  const findings: SafeTypeContractFinding[] = [];
  visitUnknown(value, (node, path) => {
    if (isRecord(node)) {
      for (const [key, nested] of Object.entries(node)) {
        const normalizedKey = normalizeFieldName(key);
        if (forbiddenFieldNames.has(normalizedKey)) {
          add(
            findings,
            "forbidden_field",
            "blocker",
            "SAFE_TYPE_CONTRACT_FORBIDDEN_FIELD",
            safePath([...path, key].join("."))
          );
        }
        if (executionReadinessFields.has(normalizedKey) && nested === true) {
          add(
            findings,
            "readiness",
            "blocker",
            "SAFE_TYPE_CONTRACT_EXECUTION_READINESS_TRUE",
            safePath([...path, key].join("."))
          );
        }
      }
    }
    if (typeof node === "string") {
      if (containsSecretLikeMarker(node)) {
        add(findings, "secret_marker", "blocker", "SAFE_TYPE_CONTRACT_SECRET_MARKER");
      }
      if (rawMarkers.some((marker) => node.includes(marker))) {
        add(findings, "raw_field", "blocker", "SAFE_TYPE_CONTRACT_RAW_MARKER");
      }
    }
  });
  return dedupeFindings(findings);
}

function freshnessStatusFor(
  findings: SafeTypeContractFinding[]
): SafeTypeContractPlan["freshnessStatus"] {
  if (
    findings.some(
      (finding) => finding.kind === "freshness" && finding.severity === "blocker"
    )
  ) {
    return "blocked";
  }
  if (findings.some((finding) => finding.kind === "freshness")) {
    return "warning";
  }
  return "fresh";
}

function riskStatusFor(
  findings: SafeTypeContractFinding[]
): SafeTypeContractPlan["riskStatus"] {
  if (
    findings.some(
      (finding) => finding.kind === "risk" && finding.severity === "blocker"
    )
  ) {
    return "blocked";
  }
  if (findings.some((finding) => finding.kind === "risk")) {
    return "warning";
  }
  return "safe";
}

function simulationStatusFor(
  findings: SafeTypeContractFinding[]
): SafeTypeContractPlan["simulationStatus"] {
  if (
    findings.some(
      (finding) =>
        finding.kind === "simulation" && finding.severity === "blocker"
    )
  ) {
    return "blocked";
  }
  if (findings.some((finding) => finding.kind === "simulation")) {
    return "warning";
  }
  return "safe";
}

function add(
  findings: SafeTypeContractFinding[],
  kind: SafeTypeContractFindingKind,
  severity: SafeTypeContractSeverity,
  code: string,
  path?: string
): void {
  findings.push({
    findingId: stableHash({ kind, severity, code, path: path || "" }).slice(
      0,
      16
    ),
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code),
    ...(path ? { path } : {})
  });
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    SAFE_TYPE_CONTRACT_ACTION_KIND_UNSUPPORTED:
      "Safe type contracts only support type_into_observed_text_field.",
    SAFE_TYPE_CONTRACT_RECEIPT_MISSING:
      "Safe type contract requires an approved expanded action receipt.",
    SAFE_TYPE_CONTRACT_RECEIPT_NOT_READY:
      "Receipt is not ready for safe type contract handoff.",
    SAFE_TYPE_CONTRACT_RECEIPT_ACTION_MISMATCH:
      "Receipt action kind does not match the safe type contract.",
    SAFE_TYPE_CONTRACT_RECEIPT_CONFIRMATION_BLOCKED:
      "Receipt typed confirmation is not accepted.",
    SAFE_TYPE_CONTRACT_RECEIPT_CONFIRMATION_MISMATCH:
      "Receipt typed confirmation must match TYPE INTO OBSERVED FIELD.",
    SAFE_TYPE_CONTRACT_RECEIPT_READINESS_BLOCKED:
      "Receipt readiness does not allow safe type contract handoff.",
    SAFE_TYPE_CONTRACT_RECEIPT_SCOPE_MISMATCH:
      "Receipt scope does not match observation, target, proposal, risk, or simulation summaries.",
    SAFE_TYPE_CONTRACT_OBSERVATION_MISSING:
      "Observation summary is required.",
    SAFE_TYPE_CONTRACT_TARGET_NOT_IN_OBSERVATION:
      "Target id does not appear in the observation summary.",
    SAFE_TYPE_CONTRACT_OBSERVATION_TIME_INVALID:
      "Observation timestamp is invalid.",
    SAFE_TYPE_CONTRACT_OBSERVATION_STALE:
      "Observation is stale for the safe type contract.",
    SAFE_TYPE_CONTRACT_OBSERVATION_TIME_MISSING:
      "Observation timestamp is missing; freshness is warning-only.",
    SAFE_TYPE_CONTRACT_TARGET_MISSING: "Target id is required.",
    SAFE_TYPE_CONTRACT_WINDOW_MISSING: "Window ref is required.",
    SAFE_TYPE_CONTRACT_APP_MISSING: "App ref is required.",
    SAFE_TYPE_CONTRACT_TARGET_NOT_SAFE_TEXT_FIELD:
      "Target must be an observed safe text field.",
    SAFE_TYPE_CONTRACT_SENSITIVE_TEXT_FIELD:
      "Password, API-key, payment, hidden, destructive, or security prompt fields are blocked.",
    SAFE_TYPE_CONTRACT_TEXT_HASH_MISSING:
      "Text hash is required for summary-only type planning.",
    SAFE_TYPE_CONTRACT_TEXT_EMPTY: "Text length must be greater than zero.",
    SAFE_TYPE_CONTRACT_TEXT_TOO_LONG:
      "Text length exceeds the maximum approved length.",
    SAFE_TYPE_CONTRACT_MULTILINE_BLOCKED:
      "Multiline text is blocked unless the policy explicitly allows it.",
    SAFE_TYPE_CONTRACT_CONTROL_CHARACTERS_BLOCKED:
      "Control characters are blocked.",
    SAFE_TYPE_CONTRACT_SECRET_OR_PASSWORD_TEXT_BLOCKED:
      "Secret, token, key, Authorization, Bearer, private-key, or password-like text is blocked.",
    SAFE_TYPE_CONTRACT_SHELL_TEXT_BLOCKED_FOR_RISKY_TARGET:
      "Shell-looking text is blocked for risky targets.",
    SAFE_TYPE_CONTRACT_PROPOSAL_MISSING: "Proposal summary is required.",
    SAFE_TYPE_CONTRACT_PROPOSAL_ACTION_MISMATCH:
      "Proposal action kind must match type_into_observed_text_field.",
    SAFE_TYPE_CONTRACT_PROPOSAL_SCOPE_MISMATCH:
      "Proposal summary does not match target refs.",
    SAFE_TYPE_CONTRACT_RISK_MISSING:
      "Risk classification summary is required.",
    SAFE_TYPE_CONTRACT_RISK_BLOCKED:
      "High or destructive risk blocks safe type contract planning.",
    SAFE_TYPE_CONTRACT_SENSITIVE_TARGET_BLOCKED:
      "Risk classification blocked the target as sensitive.",
    SAFE_TYPE_CONTRACT_SIMULATION_MISSING:
      "Simulation summary is required.",
    SAFE_TYPE_CONTRACT_SIMULATION_BLOCKED:
      "Simulation summary is blocked or unsafe for typing.",
    SAFE_TYPE_CONTRACT_MULTI_STEP_BLOCKED:
      "Safe type contracts allow only a single-step plan.",
    SAFE_TYPE_CONTRACT_SINGLE_TYPE_REQUIRED:
      "Safe type contracts require exactly one type operation.",
    SAFE_TYPE_CONTRACT_FORBIDDEN_FIELD:
      "Safe type input contains a forbidden raw, secret, command, clipboard, file dialog, coordinate, event, or execution field.",
    SAFE_TYPE_CONTRACT_EXECUTION_READINESS_TRUE:
      "Safe type input attempted to enable broad execution readiness.",
    SAFE_TYPE_CONTRACT_SECRET_MARKER:
      "Safe type input contains a secret-like marker.",
    SAFE_TYPE_CONTRACT_RAW_MARKER:
      "Safe type input contains a raw desktop, prompt, text, source, diff, response, or clipboard marker."
  };
  return messages[code] ?? "Safe type contract finding.";
}

function nextActionFor(status: SafeTypeContractStatus): string {
  if (status === "blocked") {
    return "Fix safe type contract blockers before a future fixed Tauri command can consume it.";
  }
  if (status === "warning") {
    return "Review warnings; contract remains summary-only and does not call Tauri.";
  }
  return "Safe type contract is ready for a future fixed Tauri command boundary; this helper does not call Tauri.";
}

function disabledReadiness(
  canExecuteViaFixedTauriCommand: boolean
): SafeTypeContractReadiness {
  return {
    canExecuteViaFixedTauriCommand,
    canCallTauriCommand: false,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canSelect: false,
    canDragDrop: false,
    canWriteClipboard: false,
    canOpenFileDialog: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function ageMs(
  observedAt: string | undefined,
  createdAt: string | undefined
): number | undefined {
  if (!observedAt || !createdAt) {
    return undefined;
  }
  const observed = Date.parse(observedAt);
  const current = Date.parse(createdAt);
  if (!Number.isFinite(observed) || !Number.isFinite(current)) {
    return undefined;
  }
  return current - observed;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function safePositiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;
}

function safeOptionalPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

function safeOptionalNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
    : [];
}

function containsSecretLikeMarker(value: string): boolean {
  return (
    /\bsk-[A-Za-z0-9_-]{6,}/.test(value) ||
    /\bBearer\s+[A-Za-z0-9._-]+/i.test(value) ||
    /\bAuthorization\b/i.test(value) ||
    /\b(DEEPSEEK_API_KEY|OPENAI_API_KEY|PASSWORD_VALUE_MARKER)\b/.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
  );
}

function containsPasswordLikeText(value: string): boolean {
  return /\b(password|passphrase|secret|private key)\b/i.test(value);
}

function looksLikeShellCommand(value: string): boolean {
  return /\b(rm\s+-rf|curl\s+|powershell\s+|cmd\.exe|git\s+push|chmod\s+|sudo\s+)\b/i.test(
    value
  );
}

function containsSensitiveTargetMarker(value: string): boolean {
  return /\b(password|api key|token field|payment|credit card|delete|submit|send|transfer|security prompt|destructive|hidden)\b/i.test(
    value
  );
}

function visitUnknown(
  value: unknown,
  visitor: (value: unknown, path: string[]) => void,
  path: string[] = []
): void {
  visitor(value, path);
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      visitUnknown(item, visitor, [...path, String(index)])
    );
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      visitUnknown(nested, visitor, [...path, key]);
    }
  }
}

function dedupeFindings(
  findings: SafeTypeContractFinding[]
): SafeTypeContractFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.code}:${finding.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function countSeverity(
  findings: SafeTypeContractFinding[],
  severity: SafeTypeContractSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function stableHash(value: unknown): string {
  return stablePreviewHash(stableStringify(value));
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
  if (typeof value === "function") {
    return JSON.stringify("[function]");
  }
  return JSON.stringify(value);
}

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function safePath(value: string): string {
  return value.replace(/[^\w.[\]-]/g, "_");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
