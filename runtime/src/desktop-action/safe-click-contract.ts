import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type { ApprovedExpandedDesktopActionReceipt } from "./approved-expanded-action-receipt.js";

export type SafeClickContractStatus = "planned" | "warning" | "blocked";
export type SafeClickContractSeverity = "info" | "warning" | "blocker";
export type SafeClickContractFindingKind =
  | "action_kind"
  | "receipt"
  | "observation"
  | "target"
  | "proposal"
  | "freshness"
  | "risk"
  | "simulation"
  | "click_policy"
  | "forbidden_field"
  | "secret_marker"
  | "raw_field"
  | "readiness";

export type SafeClickContractFinding = {
  findingId: string;
  kind: SafeClickContractFindingKind;
  severity: SafeClickContractSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type SafeClickObservationSummary = {
  observationId?: string | undefined;
  observedAt?: string | undefined;
  windowRef?: string | undefined;
  appRef?: string | undefined;
  displayRef?: string | undefined;
  targetIds?: string[] | undefined;
  targetHash?: string | undefined;
  boundsHash?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type SafeClickTargetSummary = {
  targetId?: string | undefined;
  targetKind?: string | undefined;
  windowRef?: string | undefined;
  appRef?: string | undefined;
  displayRef?: string | undefined;
  targetHash?: string | undefined;
  boundsHash?: string | undefined;
  safeTarget?: boolean | undefined;
  sensitiveTarget?: boolean | undefined;
  destructiveTarget?: boolean | undefined;
  passwordLike?: boolean | undefined;
  apiKeyLike?: boolean | undefined;
  paymentLike?: boolean | undefined;
  deleteSubmitDestructive?: boolean | undefined;
  warningCodes?: string[] | undefined;
};

export type SafeClickProposalSummary = {
  proposalId?: string | undefined;
  actionKind?: string | undefined;
  targetId?: string | undefined;
  windowRef?: string | undefined;
  appRef?: string | undefined;
  displayRef?: string | undefined;
  targetHash?: string | undefined;
  expectedEffectSummary?: string | undefined;
};

export type SafeClickRiskClassificationSummary = {
  riskClassificationId?: string | undefined;
  riskLevel?: string | undefined;
  riskClass?: string | undefined;
  destructiveRisk?: boolean | undefined;
  sensitiveTargetBlocked?: boolean | undefined;
  blockerCodes?: string[] | undefined;
  warningCodes?: string[] | undefined;
};

export type SafeClickSimulationSummary = {
  simulationId?: string | undefined;
  status?: string | undefined;
  safeForClick?: boolean | undefined;
  stepCount?: number | undefined;
  clickCount?: number | undefined;
  doubleClick?: boolean | undefined;
  warningCodes?: string[] | undefined;
  blockerCodes?: string[] | undefined;
};

export type SafeClickPointSummary = {
  pointHash?: string | undefined;
  targetBoundsHash?: string | undefined;
  withinTargetBounds?: boolean | undefined;
};

export type SafeClickFreshnessPolicy = {
  staleThresholdMs?: number | undefined;
};

export type SafeClickContractInput = {
  actionKind?: "click_observed_safe_target" | string | undefined;
  observationSummary?: SafeClickObservationSummary | undefined;
  targetSummary?: SafeClickTargetSummary | undefined;
  proposalSummary?: SafeClickProposalSummary | undefined;
  riskClassification?: SafeClickRiskClassificationSummary | undefined;
  simulationSummary?: SafeClickSimulationSummary | undefined;
  receipt?: ApprovedExpandedDesktopActionReceipt | undefined;
  clickPointSummary?: SafeClickPointSummary | undefined;
  freshnessPolicy?: SafeClickFreshnessPolicy | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type SafeClickContractPlan = {
  contractId: string;
  actionKind: "click_observed_safe_target";
  receiptId?: string | undefined;
  proposalId?: string | undefined;
  observationId?: string | undefined;
  targetRef: string;
  windowRef: string;
  appRef: string;
  displayRef?: string | undefined;
  targetHash?: string | undefined;
  boundsHash: string;
  clickPointHash?: string | undefined;
  freshnessStatus: "fresh" | "warning" | "blocked";
  riskStatus: "safe" | "warning" | "blocked";
  simulationStatus: "safe" | "warning" | "blocked";
  summaryOnly: true;
  contractHash: string;
};

export type SafeClickContractReadiness = {
  canExecuteViaFixedTauriCommand: boolean;
  canCallTauriCommand: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canDoubleClick: false;
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

export type SafeClickContract = {
  status: SafeClickContractStatus;
  contractId: string;
  actionKind: "click_observed_safe_target";
  targetRef: string;
  windowRef: string;
  appRef: string;
  displayRef?: string | undefined;
  boundsHash: string;
  freshnessStatus: "fresh" | "warning" | "blocked";
  riskStatus: "safe" | "warning" | "blocked";
  simulationStatus: "safe" | "warning" | "blocked";
  plan?: SafeClickContractPlan | undefined;
  findings: SafeClickContractFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  contractHash: string;
  readiness: SafeClickContractReadiness;
  nextAction: string;
  source: "runtime_safe_click_contract";
  summaryOnly: true;
};

export type SafeClickContractValidationResult = {
  ok: boolean;
  status: SafeClickContractStatus;
  findings: SafeClickContractFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: SafeClickContractReadiness;
};

type NormalizedSafeClickInput = {
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
  boundsHash: string;
  clickPointHash?: string | undefined;
  pointWithinTargetBounds?: boolean | undefined;
  targetIds: string[];
  targetKind?: string | undefined;
  targetSafe: boolean;
  targetSensitive: boolean;
  targetDestructive: boolean;
  targetPasswordLike: boolean;
  targetApiKeyLike: boolean;
  targetPaymentLike: boolean;
  targetDeleteSubmitDestructive: boolean;
  riskLevel?: string | undefined;
  riskClass?: string | undefined;
  destructiveRisk: boolean;
  sensitiveTargetBlocked: boolean;
  riskBlockerCodes: string[];
  simulationStatus?: string | undefined;
  simulationSafeForClick?: boolean | undefined;
  simulationStepCount?: number | undefined;
  simulationClickCount?: number | undefined;
  simulationDoubleClick: boolean;
  simulationBlockerCodes: string[];
  staleThresholdMs: number;
  createdAt: string;
};

const SOURCE = "runtime_safe_click_contract" as const;
const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";
const DEFAULT_STALE_THRESHOLD_MS = 60 * 1000;
const ACTION_KIND = "click_observed_safe_target" as const;
const REQUIRED_CONFIRMATION = "CLICK OBSERVED TARGET";

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
    "rawCoordinates",
    "coordinates",
    "clickX",
    "clickY",
    "screenX",
    "screenY",
    "clipboardContent",
    "clipboardOperation",
    "writeClipboard",
    "fileDialogOperation",
    "openFileDialog",
    "dragDropOperation",
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
    "canDoubleClick",
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
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF",
  "CLIPBOARD_CONTENT"
];

export function buildSafeClickContract(
  input: SafeClickContractInput = {}
): SafeClickContract {
  const normalized = normalizeInput(input);
  const findings = validateNormalizedInput(input, normalized);
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const status: SafeClickContractStatus =
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
    boundsHash: normalized.boundsHash,
    blockerCodes: findings
      .filter((finding) => finding.severity === "blocker")
      .map((finding) => finding.code),
    warningCodes: findings
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.code)
  });
  const contractId =
    input.idGenerator?.() || `safe-click-contract-${contractHash.slice(0, 12)}`;
  const plan: SafeClickContractPlan = {
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
    boundsHash: normalized.boundsHash,
    ...(normalized.clickPointHash
      ? { clickPointHash: normalized.clickPointHash }
      : {}),
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
    boundsHash: normalized.boundsHash,
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

export function validateSafeClickContractInput(
  input: SafeClickContractInput = {}
): SafeClickContractValidationResult {
  const contract = buildSafeClickContract(input);
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

export function summarizeSafeClickContract(contract: SafeClickContract): string {
  return [
    `status:${contract.status}`,
    `contract:${contract.contractId}`,
    `action:${contract.actionKind}`,
    `target:${contract.targetRef}`,
    `window:${contract.windowRef}`,
    `app:${contract.appRef}`,
    `bounds:${contract.boundsHash}`,
    `freshness:${contract.freshnessStatus}`,
    `risk:${contract.riskStatus}`,
    `simulation:${contract.simulationStatus}`,
    `blockers:${contract.blockerCount}`,
    `warnings:${contract.warningCount}`,
    `hash:${contract.contractHash.slice(0, 12)}`,
    "summary_only:true",
    "tauri_call:false",
    "desktop_execution:false",
    "event_write:false"
  ].join(" | ");
}

function normalizeInput(
  input: SafeClickContractInput
): NormalizedSafeClickInput {
  const observation = isRecord(input.observationSummary)
    ? input.observationSummary
    : {};
  const target = isRecord(input.targetSummary) ? input.targetSummary : {};
  const proposal = isRecord(input.proposalSummary) ? input.proposalSummary : {};
  const risk = isRecord(input.riskClassification)
    ? input.riskClassification
    : {};
  const simulation = isRecord(input.simulationSummary)
    ? input.simulationSummary
    : {};
  const clickPoint = isRecord(input.clickPointSummary)
    ? input.clickPointSummary
    : {};
  const policy = isRecord(input.freshnessPolicy) ? input.freshnessPolicy : {};
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
    boundsHash: safeString(target.boundsHash ?? observation.boundsHash, ""),
    clickPointHash: safeOptionalString(clickPoint.pointHash),
    pointWithinTargetBounds:
      typeof clickPoint.withinTargetBounds === "boolean"
        ? clickPoint.withinTargetBounds
        : undefined,
    targetIds: Array.isArray(observation.targetIds)
      ? observation.targetIds
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
      : [],
    targetKind: safeOptionalString(target.targetKind),
    targetSafe: target.safeTarget === true,
    targetSensitive: target.sensitiveTarget === true,
    targetDestructive: target.destructiveTarget === true,
    targetPasswordLike: target.passwordLike === true,
    targetApiKeyLike: target.apiKeyLike === true,
    targetPaymentLike: target.paymentLike === true,
    targetDeleteSubmitDestructive: target.deleteSubmitDestructive === true,
    riskLevel: safeOptionalString(risk.riskLevel),
    riskClass: safeOptionalString(risk.riskClass),
    destructiveRisk: risk.destructiveRisk === true,
    sensitiveTargetBlocked: risk.sensitiveTargetBlocked === true,
    riskBlockerCodes: safeStringArray(risk.blockerCodes),
    simulationStatus: safeOptionalString(simulation.status),
    simulationSafeForClick:
      typeof simulation.safeForClick === "boolean"
        ? simulation.safeForClick
        : undefined,
    simulationStepCount: safeOptionalPositiveInteger(simulation.stepCount),
    simulationClickCount: safeOptionalNonNegativeInteger(simulation.clickCount),
    simulationDoubleClick: simulation.doubleClick === true,
    simulationBlockerCodes: safeStringArray(simulation.blockerCodes),
    staleThresholdMs: safePositiveInteger(
      policy.staleThresholdMs,
      DEFAULT_STALE_THRESHOLD_MS
    ),
    createdAt: safeString(input.createdAt, DEFAULT_CREATED_AT)
  };
}

function validateNormalizedInput(
  original: SafeClickContractInput,
  input: NormalizedSafeClickInput
): SafeClickContractFinding[] {
  const findings = scanForbiddenInput(original);

  if (input.requestedActionKind !== ACTION_KIND) {
    add(
      findings,
      "action_kind",
      "blocker",
      "SAFE_CLICK_CONTRACT_ACTION_KIND_UNSUPPORTED"
    );
  }
  validateReceipt(original.receipt, input, findings);
  validateObservation(input, findings);
  validateTarget(input, original, findings);
  validateProposal(input, original.proposalSummary, findings);
  validateRisk(input, findings);
  validateSimulation(input, findings);

  return dedupeFindings(findings);
}

function validateReceipt(
  receipt: ApprovedExpandedDesktopActionReceipt | undefined,
  input: NormalizedSafeClickInput,
  findings: SafeClickContractFinding[]
): void {
  if (receipt === undefined) {
    add(findings, "receipt", "blocker", "SAFE_CLICK_CONTRACT_RECEIPT_MISSING");
    return;
  }
  if (receipt.status !== "ready" || receipt.blockerCount > 0) {
    add(
      findings,
      "receipt",
      "blocker",
      "SAFE_CLICK_CONTRACT_RECEIPT_NOT_READY"
    );
  }
  if (receipt.actionKind !== ACTION_KIND) {
    add(
      findings,
      "receipt",
      "blocker",
      "SAFE_CLICK_CONTRACT_RECEIPT_ACTION_MISMATCH"
    );
  }
  if (!receipt.typedConfirmationAccepted) {
    add(
      findings,
      "receipt",
      "blocker",
      "SAFE_CLICK_CONTRACT_RECEIPT_CONFIRMATION_BLOCKED"
    );
  }
  if (receipt.scope.typedConfirmation !== REQUIRED_CONFIRMATION) {
    add(
      findings,
      "receipt",
      "blocker",
      "SAFE_CLICK_CONTRACT_RECEIPT_CONFIRMATION_MISMATCH"
    );
  }
  if (!receipt.readiness.canEnterSafeClickContract) {
    add(
      findings,
      "receipt",
      "blocker",
      "SAFE_CLICK_CONTRACT_RECEIPT_READINESS_BLOCKED"
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
        "SAFE_CLICK_CONTRACT_RECEIPT_SCOPE_MISMATCH",
        label
      );
    }
  }
}

function validateObservation(
  input: NormalizedSafeClickInput,
  findings: SafeClickContractFinding[]
): void {
  if (!input.observationId) {
    add(
      findings,
      "observation",
      "blocker",
      "SAFE_CLICK_CONTRACT_OBSERVATION_MISSING"
    );
  }
  if (input.targetIds.length > 0 && !input.targetIds.includes(input.targetId)) {
    add(
      findings,
      "observation",
      "blocker",
      "SAFE_CLICK_CONTRACT_TARGET_NOT_IN_OBSERVATION"
    );
  }
  if (input.observedAt) {
    const age = ageMs(input.observedAt, input.createdAt);
    if (age === undefined) {
      add(
        findings,
        "freshness",
        "blocker",
        "SAFE_CLICK_CONTRACT_OBSERVATION_TIME_INVALID"
      );
    } else if (age > input.staleThresholdMs) {
      add(
        findings,
        "freshness",
        "blocker",
        "SAFE_CLICK_CONTRACT_OBSERVATION_STALE"
      );
    }
  } else {
    add(
      findings,
      "freshness",
      "warning",
      "SAFE_CLICK_CONTRACT_OBSERVATION_TIME_MISSING"
    );
  }
}

function validateTarget(
  input: NormalizedSafeClickInput,
  original: SafeClickContractInput,
  findings: SafeClickContractFinding[]
): void {
  if (!input.targetId) {
    add(findings, "target", "blocker", "SAFE_CLICK_CONTRACT_TARGET_MISSING");
  }
  if (!input.windowRef) {
    add(findings, "target", "blocker", "SAFE_CLICK_CONTRACT_WINDOW_MISSING");
  }
  if (!input.appRef) {
    add(findings, "target", "blocker", "SAFE_CLICK_CONTRACT_APP_MISSING");
  }
  if (!input.boundsHash) {
    add(findings, "target", "blocker", "SAFE_CLICK_CONTRACT_BOUNDS_MISSING");
  }
  if (!input.targetSafe) {
    add(
      findings,
      "target",
      "blocker",
      "SAFE_CLICK_CONTRACT_TARGET_NOT_MARKED_SAFE"
    );
  }
  if (
    input.targetSensitive ||
    input.targetDestructive ||
    input.targetPasswordLike ||
    input.targetApiKeyLike ||
    input.targetPaymentLike ||
    input.targetDeleteSubmitDestructive ||
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
      "SAFE_CLICK_CONTRACT_SENSITIVE_OR_DESTRUCTIVE_TARGET"
    );
  }
  if (
    input.clickPointHash &&
    original.clickPointSummary?.targetBoundsHash &&
    original.clickPointSummary.targetBoundsHash !== input.boundsHash
  ) {
    add(
      findings,
      "click_policy",
      "blocker",
      "SAFE_CLICK_CONTRACT_CLICK_POINT_BOUNDS_MISMATCH"
    );
  }
  if (input.pointWithinTargetBounds === false) {
    add(
      findings,
      "click_policy",
      "blocker",
      "SAFE_CLICK_CONTRACT_CLICK_POINT_OUTSIDE_TARGET"
    );
  }
}

function validateProposal(
  input: NormalizedSafeClickInput,
  proposal: SafeClickProposalSummary | undefined,
  findings: SafeClickContractFinding[]
): void {
  if (!input.proposalId) {
    add(findings, "proposal", "blocker", "SAFE_CLICK_CONTRACT_PROPOSAL_MISSING");
  }
  if (proposal?.actionKind !== undefined && proposal.actionKind !== ACTION_KIND) {
    add(
      findings,
      "proposal",
      "blocker",
      "SAFE_CLICK_CONTRACT_PROPOSAL_ACTION_MISMATCH"
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
        "SAFE_CLICK_CONTRACT_PROPOSAL_SCOPE_MISMATCH",
        label
      );
    }
  }
}

function validateRisk(
  input: NormalizedSafeClickInput,
  findings: SafeClickContractFinding[]
): void {
  if (!input.riskClassificationId) {
    add(findings, "risk", "blocker", "SAFE_CLICK_CONTRACT_RISK_MISSING");
  }
  const riskText = `${input.riskLevel ?? ""} ${input.riskClass ?? ""}`;
  if (
    input.destructiveRisk ||
    input.riskBlockerCodes.length > 0 ||
    /\b(high|blocked|destructive|D5|D4)\b/i.test(riskText)
  ) {
    add(findings, "risk", "blocker", "SAFE_CLICK_CONTRACT_RISK_BLOCKED");
  }
  if (input.sensitiveTargetBlocked) {
    add(
      findings,
      "risk",
      "blocker",
      "SAFE_CLICK_CONTRACT_SENSITIVE_TARGET_BLOCKED"
    );
  }
}

function validateSimulation(
  input: NormalizedSafeClickInput,
  findings: SafeClickContractFinding[]
): void {
  if (!input.simulationId) {
    add(
      findings,
      "simulation",
      "blocker",
      "SAFE_CLICK_CONTRACT_SIMULATION_MISSING"
    );
  }
  if (
    input.simulationBlockerCodes.length > 0 ||
    input.simulationSafeForClick === false ||
    /\b(blocked|unsafe|failed)\b/i.test(input.simulationStatus ?? "")
  ) {
    add(
      findings,
      "simulation",
      "blocker",
      "SAFE_CLICK_CONTRACT_SIMULATION_BLOCKED"
    );
  }
  if (input.simulationStepCount !== undefined && input.simulationStepCount > 1) {
    add(
      findings,
      "simulation",
      "blocker",
      "SAFE_CLICK_CONTRACT_MULTI_STEP_BLOCKED"
    );
  }
  if (input.simulationClickCount !== undefined && input.simulationClickCount !== 1) {
    add(
      findings,
      "click_policy",
      "blocker",
      "SAFE_CLICK_CONTRACT_SINGLE_CLICK_REQUIRED"
    );
  }
  if (input.simulationDoubleClick) {
    add(
      findings,
      "click_policy",
      "blocker",
      "SAFE_CLICK_CONTRACT_DOUBLE_CLICK_BLOCKED"
    );
  }
}

function scanForbiddenInput(value: unknown): SafeClickContractFinding[] {
  const findings: SafeClickContractFinding[] = [];
  visitUnknown(value, (node, path) => {
    if (isRecord(node)) {
      for (const [key, nested] of Object.entries(node)) {
        const normalizedKey = normalizeFieldName(key);
        if (forbiddenFieldNames.has(normalizedKey)) {
          add(
            findings,
            "forbidden_field",
            "blocker",
            "SAFE_CLICK_CONTRACT_FORBIDDEN_FIELD",
            safePath([...path, key].join("."))
          );
        }
        if (executionReadinessFields.has(normalizedKey) && nested === true) {
          add(
            findings,
            "readiness",
            "blocker",
            "SAFE_CLICK_CONTRACT_EXECUTION_READINESS_TRUE",
            safePath([...path, key].join("."))
          );
        }
      }
    }
    if (typeof node === "string") {
      if (containsSecretLikeMarker(node)) {
        add(
          findings,
          "secret_marker",
          "blocker",
          "SAFE_CLICK_CONTRACT_SECRET_MARKER"
        );
      }
      if (rawMarkers.some((marker) => node.includes(marker))) {
        add(findings, "raw_field", "blocker", "SAFE_CLICK_CONTRACT_RAW_MARKER");
      }
      if (containsSensitiveTargetMarker(node)) {
        add(
          findings,
          "target",
          "blocker",
          "SAFE_CLICK_CONTRACT_SENSITIVE_OR_DESTRUCTIVE_TARGET"
        );
      }
    }
  });
  return dedupeFindings(findings);
}

function freshnessStatusFor(
  findings: SafeClickContractFinding[]
): SafeClickContractPlan["freshnessStatus"] {
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
  findings: SafeClickContractFinding[]
): SafeClickContractPlan["riskStatus"] {
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
  findings: SafeClickContractFinding[]
): SafeClickContractPlan["simulationStatus"] {
  if (
    findings.some(
      (finding) =>
        (finding.kind === "simulation" || finding.kind === "click_policy") &&
        finding.severity === "blocker"
    )
  ) {
    return "blocked";
  }
  if (
    findings.some(
      (finding) =>
        finding.kind === "simulation" || finding.kind === "click_policy"
    )
  ) {
    return "warning";
  }
  return "safe";
}

function add(
  findings: SafeClickContractFinding[],
  kind: SafeClickContractFindingKind,
  severity: SafeClickContractSeverity,
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
    SAFE_CLICK_CONTRACT_ACTION_KIND_UNSUPPORTED:
      "Safe click contracts only support click_observed_safe_target.",
    SAFE_CLICK_CONTRACT_RECEIPT_MISSING:
      "Safe click contract requires an approved expanded action receipt.",
    SAFE_CLICK_CONTRACT_RECEIPT_NOT_READY:
      "Receipt is not ready for safe click contract handoff.",
    SAFE_CLICK_CONTRACT_RECEIPT_ACTION_MISMATCH:
      "Receipt action kind does not match the safe click contract.",
    SAFE_CLICK_CONTRACT_RECEIPT_CONFIRMATION_BLOCKED:
      "Receipt typed confirmation is not accepted.",
    SAFE_CLICK_CONTRACT_RECEIPT_CONFIRMATION_MISMATCH:
      "Receipt typed confirmation must match CLICK OBSERVED TARGET.",
    SAFE_CLICK_CONTRACT_RECEIPT_READINESS_BLOCKED:
      "Receipt readiness does not allow safe click contract handoff.",
    SAFE_CLICK_CONTRACT_RECEIPT_SCOPE_MISMATCH:
      "Receipt scope does not match observation, target, proposal, risk, or simulation summaries.",
    SAFE_CLICK_CONTRACT_OBSERVATION_MISSING:
      "Observation summary is required.",
    SAFE_CLICK_CONTRACT_TARGET_NOT_IN_OBSERVATION:
      "Target id does not appear in the observation summary.",
    SAFE_CLICK_CONTRACT_OBSERVATION_TIME_INVALID:
      "Observation timestamp is invalid.",
    SAFE_CLICK_CONTRACT_OBSERVATION_STALE:
      "Observation is stale for the safe click contract.",
    SAFE_CLICK_CONTRACT_OBSERVATION_TIME_MISSING:
      "Observation timestamp is missing; freshness is warning-only.",
    SAFE_CLICK_CONTRACT_TARGET_MISSING: "Target id is required.",
    SAFE_CLICK_CONTRACT_WINDOW_MISSING: "Window ref is required.",
    SAFE_CLICK_CONTRACT_APP_MISSING: "App ref is required.",
    SAFE_CLICK_CONTRACT_BOUNDS_MISSING:
      "Target bounds hash is required for safe click planning.",
    SAFE_CLICK_CONTRACT_TARGET_NOT_MARKED_SAFE:
      "Target summary must be marked safe.",
    SAFE_CLICK_CONTRACT_SENSITIVE_OR_DESTRUCTIVE_TARGET:
      "Sensitive or destructive targets are blocked.",
    SAFE_CLICK_CONTRACT_CLICK_POINT_BOUNDS_MISMATCH:
      "Click point summary does not match the target bounds hash.",
    SAFE_CLICK_CONTRACT_CLICK_POINT_OUTSIDE_TARGET:
      "Click point summary is outside the observed target bounds.",
    SAFE_CLICK_CONTRACT_PROPOSAL_MISSING: "Proposal summary is required.",
    SAFE_CLICK_CONTRACT_PROPOSAL_ACTION_MISMATCH:
      "Proposal action kind must match click_observed_safe_target.",
    SAFE_CLICK_CONTRACT_PROPOSAL_SCOPE_MISMATCH:
      "Proposal summary does not match target refs.",
    SAFE_CLICK_CONTRACT_RISK_MISSING:
      "Risk classification summary is required.",
    SAFE_CLICK_CONTRACT_RISK_BLOCKED:
      "High or destructive risk blocks safe click contract planning.",
    SAFE_CLICK_CONTRACT_SENSITIVE_TARGET_BLOCKED:
      "Risk classification blocked the target as sensitive.",
    SAFE_CLICK_CONTRACT_SIMULATION_MISSING:
      "Simulation summary is required.",
    SAFE_CLICK_CONTRACT_SIMULATION_BLOCKED:
      "Simulation summary is blocked or unsafe for click.",
    SAFE_CLICK_CONTRACT_MULTI_STEP_BLOCKED:
      "Safe click contracts allow only a single-step plan.",
    SAFE_CLICK_CONTRACT_SINGLE_CLICK_REQUIRED:
      "Safe click contracts require exactly one click.",
    SAFE_CLICK_CONTRACT_DOUBLE_CLICK_BLOCKED:
      "Double-click actions are blocked.",
    SAFE_CLICK_CONTRACT_FORBIDDEN_FIELD:
      "Safe click input contains a forbidden raw, secret, command, clipboard, file dialog, coordinate, event, or execution field.",
    SAFE_CLICK_CONTRACT_EXECUTION_READINESS_TRUE:
      "Safe click input attempted to enable broad execution readiness.",
    SAFE_CLICK_CONTRACT_SECRET_MARKER:
      "Safe click input contains a secret-like marker.",
    SAFE_CLICK_CONTRACT_RAW_MARKER:
      "Safe click input contains a raw desktop, prompt, source, diff, response, or clipboard marker."
  };
  return messages[code] ?? "Safe click contract finding.";
}

function nextActionFor(status: SafeClickContractStatus): string {
  if (status === "blocked") {
    return "Fix safe click contract blockers before a future fixed Tauri command can consume it.";
  }
  if (status === "warning") {
    return "Review warnings; contract remains summary-only and does not call Tauri.";
  }
  return "Safe click contract is ready for a future fixed Tauri command boundary; this helper does not call Tauri.";
}

function disabledReadiness(
  canExecuteViaFixedTauriCommand: boolean
): SafeClickContractReadiness {
  return {
    canExecuteViaFixedTauriCommand,
    canCallTauriCommand: false,
    canExecuteDesktopAction: false,
    canClick: false,
    canDoubleClick: false,
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

function containsSensitiveTargetMarker(value: string): boolean {
  return /\b(password|api key|token field|payment|credit card|delete|submit|send|transfer|security prompt|destructive)\b/i.test(
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
  findings: SafeClickContractFinding[]
): SafeClickContractFinding[] {
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
  findings: SafeClickContractFinding[],
  severity: SafeClickContractSeverity
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
