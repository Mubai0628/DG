import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type {
  DesktopActionKind,
  DesktopActionOperation,
  DesktopActionProposal,
  DesktopActionProposalValidationResult
} from "./action-proposal-schema.js";
import type {
  DesktopActionRiskClassification,
  DesktopActionRiskLevel
} from "./risk-classifier.js";
import type { DesktopTargetMetadataValidationResult } from "./target-metadata-validation.js";

export type DesktopActionSimulationInput = {
  proposal?: DesktopActionProposal | DesktopActionProposalValidationResult;
  targetValidation?: DesktopTargetMetadataValidationResult | undefined;
  riskClassification?: DesktopActionRiskClassification | undefined;
  policy?: DesktopActionSimulationPolicy | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type DesktopActionSimulationPolicy = {
  blockHighRisk?: boolean | undefined;
  blockCriticalRisk?: boolean | undefined;
  requireTargetValidation?: boolean | undefined;
  requireRiskClassification?: boolean | undefined;
};

export type DesktopActionSimulationStatus = "simulated" | "warning" | "blocked";

export type DesktopActionSimulationFindingKind =
  | "schema"
  | "proposal"
  | "target_validation"
  | "risk"
  | "operation"
  | "missing_target"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "event_preview";

export type DesktopActionSimulationSeverity = "blocker" | "warning";

export type DesktopActionSimulationFinding = {
  findingId: string;
  kind: DesktopActionSimulationFindingKind;
  severity: DesktopActionSimulationSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionOperationSimulationResult = {
  operationId: string;
  actionKind: DesktopActionKind;
  targetId: string;
  status: "simulated" | "warning" | "blocked";
  predictedStateSummary: string;
  requiredApprovalMode?: string | undefined;
  riskLevel?: DesktopActionRiskLevel | undefined;
  warningCodes: string[];
  blockedReasons: string[];
};

export type DesktopActionSimulationEventPreview = {
  notWritten: true;
  wouldWriteSummaryEvent: false;
  eventKind: "desktop_action_simulation_summary";
  actionArgsIncluded: false;
  desktopCaptureIncluded: false;
};

export type DesktopActionSimulationReadiness = {
  canEnterCapabilityPlanning: boolean;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canUseClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionSimulationSummary = {
  status: DesktopActionSimulationStatus;
  proposalId?: string | undefined;
  operationCount: number;
  blockedOperationCount: number;
  warningOperationCount: number;
  predictedStateSummary: string;
  eventNotWritten: true;
  simulationHash: string;
  summaryOnly: true;
};

export type DesktopActionSimulationResult = {
  status: DesktopActionSimulationStatus;
  simulationId: string;
  proposalId?: string | undefined;
  operationResults: DesktopActionOperationSimulationResult[];
  blockedOperationCount: number;
  warningOperationCount: number;
  predictedStateSummary: string;
  eventPreview: DesktopActionSimulationEventPreview;
  findings: DesktopActionSimulationFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  simulationHash: string;
  summary: DesktopActionSimulationSummary;
  readiness: DesktopActionSimulationReadiness;
  nextAction: string;
  source: "runtime_desktop_action_simulated_result";
};

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

function hasSecretMarker(value: string): boolean {
  return secretMarkers.some((marker) => {
    if (marker === "sk-") {
      return value.startsWith("sk-") || /\ssk-[A-Za-z0-9_-]+/.test(value);
    }
    return value.includes(marker);
  });
}

function emptyReadiness(
  canEnterCapabilityPlanning = false
): DesktopActionSimulationReadiness {
  return {
    canEnterCapabilityPlanning,
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
  kind: DesktopActionSimulationFindingKind,
  severity: DesktopActionSimulationSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionSimulationFinding {
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
  value: DesktopActionSimulationInput["proposal"],
  findings: DesktopActionSimulationFinding[]
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
          "Blocked desktop action proposals cannot be simulated.",
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
  findings: DesktopActionSimulationFinding[]
): void {
  if (typeof value === "string") {
    if (hasSecretMarker(value)) {
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

function predictedSummary(operation: DesktopActionOperation): string {
  switch (operation.actionKind) {
    case "focus_window":
      return "Would focus the referenced window in a future approved execution phase.";
    case "click_target":
      return "Would click the referenced target in a future approved execution phase.";
    case "type_text":
      return "Would type summarized text into the referenced target in a future approved execution phase.";
    case "press_key":
      return "Would press a summarized key sequence in a future approved execution phase.";
    case "select_menu":
      return "Would select the referenced menu item in a future approved execution phase.";
    case "copy_selection":
      return "Would copy from the referenced selection in a future approved execution phase.";
    case "paste_text":
      return "Would paste summarized text in a future approved execution phase.";
    case "open_file_dialog":
      return "Would open a file dialog in a future approved execution phase.";
    case "choose_file":
      return "Would choose an allowed file ref in a future approved execution phase.";
    case "drag_drop":
      return "Would drag between referenced targets in a future approved execution phase.";
    case "scroll":
      return "Would scroll the referenced target in a future approved execution phase.";
  }
}

function buildOperationResult(
  operation: DesktopActionOperation,
  risk: DesktopActionRiskClassification | undefined,
  policy: DesktopActionSimulationPolicy | undefined
): DesktopActionOperationSimulationResult {
  const operationRisk = risk?.operationRisks.find(
    (item) => item.operationId === operation.operationId
  );
  const warningCodes = [...(operationRisk?.warningCodes || [])];
  const blockedReasons = [...(operationRisk?.blockedReasons || [])];
  const riskLevel = operationRisk?.riskLevel;
  if (
    (policy?.blockCriticalRisk && riskLevel === "D4_CRITICAL") ||
    (policy?.blockHighRisk &&
      (riskLevel === "D3_HIGH" || riskLevel === "D4_CRITICAL"))
  ) {
    blockedReasons.push("SIMULATION_POLICY_BLOCKED_HIGH_RISK");
  }
  const status =
    blockedReasons.length > 0
      ? "blocked"
      : warningCodes.length > 0 ||
          riskLevel === "D3_HIGH" ||
          riskLevel === "D4_CRITICAL"
        ? "warning"
        : "simulated";
  return {
    operationId: operation.operationId,
    actionKind: operation.actionKind,
    targetId: operation.targetRef.targetId,
    status,
    predictedStateSummary:
      operation.expectedVisibleStateChange || predictedSummary(operation),
    requiredApprovalMode: operationRisk?.requiredApprovalMode,
    riskLevel,
    warningCodes,
    blockedReasons
  };
}

function result(
  input: DesktopActionSimulationInput,
  proposal: DesktopActionProposal | undefined,
  findings: DesktopActionSimulationFinding[],
  operationResults: DesktopActionOperationSimulationResult[]
): DesktopActionSimulationResult {
  for (const operation of operationResults) {
    for (const reason of operation.blockedReasons) {
      findings.push(
        finding(
          "operation",
          "blocker",
          reason,
          "Desktop action simulation blocked this operation."
        )
      );
    }
    for (const warning of operation.warningCodes) {
      findings.push(
        finding(
          "operation",
          "warning",
          warning,
          "Desktop action simulation requires review."
        )
      );
    }
  }
  const blockedOperationCount = operationResults.filter(
    (item) => item.status === "blocked"
  ).length;
  const warningOperationCount = operationResults.filter(
    (item) => item.status === "warning"
  ).length;
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionSimulationStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "simulated";
  const predictedStateSummary =
    operationResults.length === 0
      ? "No desktop action simulation was produced."
      : operationResults
          .map((item) => `${item.operationId}: ${item.predictedStateSummary}`)
          .join(" ");
  const core = {
    proposalId: proposal?.proposalId,
    operationResults,
    predictedStateSummary,
    blockedOperationCount,
    warningOperationCount,
    createdAt: input.createdAt
  };
  const simulationHash = stablePreviewHash(JSON.stringify(core));
  const simulationId =
    input.idGenerator?.() ||
    `desktop-action-simulation-${simulationHash.slice(0, 12)}`;
  const eventPreview: DesktopActionSimulationEventPreview = {
    notWritten: true,
    wouldWriteSummaryEvent: false,
    eventKind: "desktop_action_simulation_summary",
    actionArgsIncluded: false,
    desktopCaptureIncluded: false
  };
  return {
    status,
    simulationId,
    ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
    operationResults,
    blockedOperationCount,
    warningOperationCount,
    predictedStateSummary,
    eventPreview,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    simulationHash,
    summary: {
      status,
      ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
      operationCount: operationResults.length,
      blockedOperationCount,
      warningOperationCount,
      predictedStateSummary,
      eventNotWritten: true,
      simulationHash,
      summaryOnly: true
    },
    readiness: emptyReadiness(status !== "blocked" && Boolean(proposal)),
    nextAction:
      status === "blocked"
        ? "Fix simulation blockers before capability planning."
        : "Proceed to desktop action capability planning preview.",
    source: "runtime_desktop_action_simulated_result"
  };
}

export function simulateDesktopActionProposal(
  input: DesktopActionSimulationInput
): DesktopActionSimulationResult {
  const findings: DesktopActionSimulationFinding[] = [];
  scanUnsafeFields(input, "", findings);
  const proposal = extractProposal(input.proposal, findings);
  if (!proposal) {
    return result(input, undefined, findings, []);
  }
  if (
    input.policy?.requireTargetValidation !== false &&
    !input.targetValidation
  ) {
    findings.push(
      finding(
        "target_validation",
        "blocker",
        "TARGET_VALIDATION_REQUIRED",
        "Target metadata validation is required for simulation.",
        "targetValidation"
      )
    );
  }
  if (input.targetValidation?.status === "blocked") {
    findings.push(
      finding(
        "target_validation",
        "blocker",
        "TARGET_VALIDATION_BLOCKED",
        "Blocked target validation prevents simulation.",
        "targetValidation"
      )
    );
  }
  if (
    input.policy?.requireRiskClassification !== false &&
    !input.riskClassification
  ) {
    findings.push(
      finding(
        "risk",
        "blocker",
        "RISK_CLASSIFICATION_REQUIRED",
        "Risk classification is required for simulation.",
        "riskClassification"
      )
    );
  }
  if (input.riskClassification?.status === "blocked") {
    findings.push(
      finding(
        "risk",
        "blocker",
        "RISK_CLASSIFICATION_BLOCKED",
        "Blocked risk classification prevents simulation.",
        "riskClassification"
      )
    );
  }
  const targetCount = input.targetValidation?.targetCount;
  if (targetCount !== undefined && targetCount < proposal.operations.length) {
    findings.push(
      finding(
        "missing_target",
        "blocker",
        "MISSING_TARGET",
        "Simulation requires one validated target per operation.",
        "targetValidation.targetCount"
      )
    );
  }
  const operationResults = proposal.operations.map((operation) =>
    buildOperationResult(operation, input.riskClassification, input.policy)
  );
  return result(input, proposal, findings, operationResults);
}

export function summarizeDesktopActionSimulation(
  simulation: DesktopActionSimulationResult
): DesktopActionSimulationSummary {
  return simulation.summary;
}
