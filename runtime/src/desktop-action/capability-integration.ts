import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type {
  DesktopActionProposal,
  DesktopActionProposalValidationResult
} from "./action-proposal-schema.js";
import type { DesktopActionRiskClassification } from "./risk-classifier.js";
import type { DesktopActionSimulationResult } from "./simulated-result.js";
import type { DesktopTargetMetadataValidationResult } from "./target-metadata-validation.js";

export type DesktopActionCapabilityPlanningInput = {
  proposal?: DesktopActionProposal | DesktopActionProposalValidationResult;
  targetValidation?: DesktopTargetMetadataValidationResult | undefined;
  riskClassification?: DesktopActionRiskClassification | undefined;
  simulation?: DesktopActionSimulationResult | undefined;
  approvalDraftRef?: DesktopActionPlanningRef | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type DesktopActionDescriptorMode = "ENABLED_FOR_PLANNING" | "DISABLED";

export type DesktopActionExecutionPolicy = "PROPOSAL_ONLY" | "MANUAL_ONLY";

export type DesktopActionCapabilityDescriptor = {
  descriptorId:
    | "native.desktop.action.propose"
    | "native.desktop.action.simulate"
    | "native.desktop.action.execute";
  mode: DesktopActionDescriptorMode;
  executionPolicy: DesktopActionExecutionPolicy;
  autoAllowed: false;
  manualOnly: boolean;
  riskLevel: string;
  summary: string;
};

export type DesktopActionPlanningRef = {
  refKind:
    | "proposal"
    | "target_validation"
    | "risk"
    | "simulation"
    | "approval_draft";
  refId: string;
  refHash?: string | undefined;
  status?: string | undefined;
  summaryOnly: true;
};

export type DesktopActionCapabilityPlanningStatus =
  | "planned"
  | "warning"
  | "blocked";

export type DesktopActionCapabilityFindingKind =
  | "schema"
  | "proposal"
  | "target_validation"
  | "risk"
  | "simulation"
  | "descriptor"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "permission_lease";

export type DesktopActionCapabilitySeverity = "blocker" | "warning";

export type DesktopActionCapabilityFinding = {
  findingId: string;
  kind: DesktopActionCapabilityFindingKind;
  severity: DesktopActionCapabilitySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionCapabilityPlanningReadiness = {
  canEnterAppReadOnlySurface: boolean;
  canIssuePermissionLease: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canUseClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionCapabilityPlanningSummary = {
  status: DesktopActionCapabilityPlanningStatus;
  proposalId?: string | undefined;
  descriptorCount: number;
  planningRefCount: number;
  executionDescriptorMode: "DISABLED";
  executionDescriptorManualOnly: true;
  planningHash: string;
  summaryOnly: true;
};

export type DesktopActionCapabilityPlanningResult = {
  status: DesktopActionCapabilityPlanningStatus;
  planningId: string;
  proposalId?: string | undefined;
  descriptors: DesktopActionCapabilityDescriptor[];
  planningRefs: DesktopActionPlanningRef[];
  findings: DesktopActionCapabilityFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  planningHash: string;
  summary: DesktopActionCapabilityPlanningSummary;
  readiness: DesktopActionCapabilityPlanningReadiness;
  nextAction: string;
  source: "runtime_desktop_action_capability_integration";
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
    "issuePermissionLease",
    "permissionLease",
    "desktopActionExecute",
    "clickNow",
    "typeNow",
    "executeNow"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "canIssuePermissionLease",
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
  canEnterAppReadOnlySurface = false
): DesktopActionCapabilityPlanningReadiness {
  return {
    canEnterAppReadOnlySurface,
    canIssuePermissionLease: false,
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
  kind: DesktopActionCapabilityFindingKind,
  severity: DesktopActionCapabilitySeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionCapabilityFinding {
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
  value: DesktopActionCapabilityPlanningInput["proposal"],
  findings: DesktopActionCapabilityFinding[]
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
          "Blocked desktop action proposals cannot enter capability planning.",
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
  findings: DesktopActionCapabilityFinding[]
): void {
  if (typeof value === "string") {
    if (
      secretMarkers.some((marker) => value.includes(marker)) ||
      value.startsWith("sk-") ||
      /\ssk-[A-Za-z0-9_-]+/.test(value)
    ) {
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
          normalizedKey.includes("permissionlease")
            ? "permission_lease"
            : "raw_field",
          "blocker",
          "FORBIDDEN_FIELD",
          "Forbidden raw, lease, or execution field is not allowed.",
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

function descriptors(riskLevel: string): DesktopActionCapabilityDescriptor[] {
  return [
    {
      descriptorId: "native.desktop.action.propose",
      mode: "ENABLED_FOR_PLANNING",
      executionPolicy: "PROPOSAL_ONLY",
      autoAllowed: false,
      manualOnly: false,
      riskLevel,
      summary: "Desktop action proposal planning descriptor only."
    },
    {
      descriptorId: "native.desktop.action.simulate",
      mode: "ENABLED_FOR_PLANNING",
      executionPolicy: "PROPOSAL_ONLY",
      autoAllowed: false,
      manualOnly: false,
      riskLevel,
      summary: "Desktop action simulation planning descriptor only."
    },
    {
      descriptorId: "native.desktop.action.execute",
      mode: "DISABLED",
      executionPolicy: "MANUAL_ONLY",
      autoAllowed: false,
      manualOnly: true,
      riskLevel,
      summary:
        "Desktop action execution descriptor is disabled, manual-only, and never automatic in P1B."
    }
  ];
}

function ref(
  refKind: DesktopActionPlanningRef["refKind"],
  refId: string | undefined,
  refHash: string | undefined,
  status: string | undefined
): DesktopActionPlanningRef | undefined {
  if (!refId) {
    return undefined;
  }
  return {
    refKind,
    refId,
    ...(refHash ? { refHash } : {}),
    ...(status ? { status } : {}),
    summaryOnly: true
  };
}

function refs(
  proposal: DesktopActionProposal | undefined,
  input: DesktopActionCapabilityPlanningInput
): DesktopActionPlanningRef[] {
  return [
    ref("proposal", proposal?.proposalId, proposal?.proposalHash, "parsed"),
    ref(
      "target_validation",
      input.targetValidation?.validationId,
      input.targetValidation?.validationHash,
      input.targetValidation?.status
    ),
    ref(
      "risk",
      input.riskClassification?.classificationId,
      input.riskClassification?.classificationHash,
      input.riskClassification?.status
    ),
    ref(
      "simulation",
      input.simulation?.simulationId,
      input.simulation?.simulationHash,
      input.simulation?.status
    ),
    input.approvalDraftRef
  ].filter((item): item is DesktopActionPlanningRef => Boolean(item));
}

export function buildDesktopActionCapabilityPlanning(
  input: DesktopActionCapabilityPlanningInput
): DesktopActionCapabilityPlanningResult {
  const findings: DesktopActionCapabilityFinding[] = [];
  scanUnsafeFields(input, "", findings);
  const proposal = extractProposal(input.proposal, findings);
  if (input.targetValidation?.status === "blocked") {
    findings.push(
      finding(
        "target_validation",
        "blocker",
        "TARGET_VALIDATION_BLOCKED",
        "Blocked target validation cannot enter capability planning."
      )
    );
  }
  if (input.riskClassification?.status === "blocked") {
    findings.push(
      finding(
        "risk",
        "blocker",
        "RISK_CLASSIFICATION_BLOCKED",
        "Blocked risk classification cannot enter capability planning."
      )
    );
  }
  if (input.simulation?.status === "blocked") {
    findings.push(
      finding(
        "simulation",
        "blocker",
        "SIMULATION_BLOCKED",
        "Blocked simulation cannot enter capability planning."
      )
    );
  }
  if (!input.targetValidation) {
    findings.push(
      finding(
        "target_validation",
        "warning",
        "TARGET_VALIDATION_MISSING",
        "Capability planning lacks target validation ref."
      )
    );
  }
  if (!input.riskClassification) {
    findings.push(
      finding(
        "risk",
        "warning",
        "RISK_CLASSIFICATION_MISSING",
        "Capability planning lacks risk classification ref."
      )
    );
  }
  if (!input.simulation) {
    findings.push(
      finding(
        "simulation",
        "warning",
        "SIMULATION_MISSING",
        "Capability planning lacks simulation ref."
      )
    );
  }
  const riskLevel = input.riskClassification?.riskLevel || "D5_BLOCKED";
  const descriptorList = descriptors(riskLevel);
  const planningRefs = refs(proposal, input);
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionCapabilityPlanningStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "planned";
  const core = {
    proposalId: proposal?.proposalId,
    descriptors: descriptorList,
    planningRefs,
    createdAt: input.createdAt
  };
  const planningHash = stablePreviewHash(JSON.stringify(core));
  const planningId =
    input.idGenerator?.() ||
    `desktop-action-capability-${planningHash.slice(0, 12)}`;
  return {
    status,
    planningId,
    ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
    descriptors: descriptorList,
    planningRefs,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    planningHash,
    summary: {
      status,
      ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
      descriptorCount: descriptorList.length,
      planningRefCount: planningRefs.length,
      executionDescriptorMode: "DISABLED",
      executionDescriptorManualOnly: true,
      planningHash,
      summaryOnly: true
    },
    readiness: emptyReadiness(status !== "blocked" && Boolean(proposal)),
    nextAction:
      status === "blocked"
        ? "Fix capability planning blockers before App read-only preview."
        : "Proceed to App read-only desktop action proposal surface.",
    source: "runtime_desktop_action_capability_integration"
  };
}

export function summarizeDesktopActionCapabilityPlanning(
  result: DesktopActionCapabilityPlanningResult
): DesktopActionCapabilityPlanningSummary {
  return result.summary;
}
