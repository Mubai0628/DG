import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type {
  DesktopActionProposal,
  DesktopActionProposalValidationResult
} from "./action-proposal-schema.js";
import type { DesktopActionCapabilityPlanningResult } from "./capability-integration.js";
import type { DesktopActionRiskClassification } from "./risk-classifier.js";
import type { DesktopActionSimulationResult } from "./simulated-result.js";
import type { DesktopTargetMetadataValidationResult } from "./target-metadata-validation.js";

export type DesktopActionPrivacyRedactionAuditInput = {
  proposal?: DesktopActionProposal | DesktopActionProposalValidationResult;
  targetValidation?: DesktopTargetMetadataValidationResult | undefined;
  riskClassification?: DesktopActionRiskClassification | undefined;
  simulation?: DesktopActionSimulationResult | undefined;
  capabilityPlanning?: DesktopActionCapabilityPlanningResult | undefined;
  appSummary?: Record<string, unknown> | undefined;
  policy?: DesktopActionPrivacyRedactionPolicy | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type DesktopActionPrivacyRedactionPolicy = {
  forbidRawTargetLabels?: boolean | undefined;
};

export type DesktopActionPrivacyRedactionAuditStatus =
  | "audit_ready"
  | "warning"
  | "blocked";

export type DesktopActionPrivacyRedactionFindingKind =
  | "proposal"
  | "target_validation"
  | "risk"
  | "simulation"
  | "capability_planning"
  | "app_summary"
  | "raw_screenshot"
  | "image_bytes"
  | "raw_ocr"
  | "raw_ui_text"
  | "secret"
  | "api_key"
  | "clipboard"
  | "file_content"
  | "target_label"
  | "execution_field";

export type DesktopActionPrivacyRedactionSeverity = "blocker" | "warning";

export type DesktopActionPrivacyRedactionFinding = {
  findingId: string;
  kind: DesktopActionPrivacyRedactionFindingKind;
  severity: DesktopActionPrivacyRedactionSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionPrivacyRedactionSummary = {
  rawScreenshotDetected: boolean;
  imageBytesDetected: boolean;
  rawOcrTextDetected: boolean;
  rawUiTextDetected: boolean;
  clipboardContentDetected: boolean;
  fileContentDetected: boolean;
  secretMarkerDetected: boolean;
  apiKeyDetected: boolean;
  rawTargetLabelDetected: boolean;
  executeFlagDetected: boolean;
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  sensitiveTargetCount: number;
  summaryOnly: true;
};

export type DesktopActionPrivacyRedactionReadiness = {
  canPersistRawScreenshot: false;
  canPersistRawOcrText: false;
  canPersistRawUiText: false;
  canUseClipboard: false;
  canWriteEventStore: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canOpenFileDialog: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionPrivacyRedactionAudit = {
  status: DesktopActionPrivacyRedactionAuditStatus;
  auditId: string;
  proposalId?: string | undefined;
  redactionSummary: DesktopActionPrivacyRedactionSummary;
  rawLeakBooleans: DesktopActionPrivacyRedactionSummary;
  redactedFieldCount: number;
  sensitiveTargetCount: number;
  warningCount: number;
  blockerCount: number;
  findingCount: number;
  findings: DesktopActionPrivacyRedactionFinding[];
  auditHash: string;
  readiness: DesktopActionPrivacyRedactionReadiness;
  nextAction: string;
  source: "runtime_desktop_action_privacy_redaction_audit";
};

const forbiddenFieldKinds = new Map<
  string,
  {
    kind: DesktopActionPrivacyRedactionFindingKind;
    code: string;
    flag: keyof ScanFlags;
  }
>(
  [
    ["rawscreenshot", ["raw_screenshot", "RAW_SCREENSHOT_FIELD", "rawScreenshotDetected"]],
    ["screenshotbytes", ["image_bytes", "IMAGE_BYTES_FIELD", "imageBytesDetected"]],
    ["imagedata", ["image_bytes", "IMAGE_BYTES_FIELD", "imageBytesDetected"]],
    ["rawocrtext", ["raw_ocr", "RAW_OCR_FIELD", "rawOcrTextDetected"]],
    ["ocrtext", ["raw_ocr", "RAW_OCR_FIELD", "rawOcrTextDetected"]],
    ["rawuitext", ["raw_ui_text", "RAW_UI_TEXT_FIELD", "rawUiTextDetected"]],
    ["rawprompt", ["raw_ui_text", "RAW_PROMPT_FIELD", "rawUiTextDetected"]],
    ["rawresponse", ["raw_ui_text", "RAW_RESPONSE_FIELD", "rawUiTextDetected"]],
    ["apikey", ["api_key", "API_KEY_FIELD", "apiKeyDetected"]],
    ["authorization", ["api_key", "AUTHORIZATION_FIELD", "apiKeyDetected"]],
    ["bearer", ["api_key", "BEARER_FIELD", "apiKeyDetected"]],
    ["secret", ["secret", "SECRET_FIELD", "secretMarkerDetected"]],
    ["clipboardcontent", ["clipboard", "CLIPBOARD_CONTENT_FIELD", "clipboardContentDetected"]],
    ["filecontent", ["file_content", "FILE_CONTENT_FIELD", "fileContentDetected"]],
    ["beforecontent", ["file_content", "FILE_CONTENT_FIELD", "fileContentDetected"]],
    ["aftercontent", ["file_content", "FILE_CONTENT_FIELD", "fileContentDetected"]],
    ["targetlabelraw", ["target_label", "RAW_TARGET_LABEL_FIELD", "rawTargetLabelDetected"]],
    ["rawtargetlabel", ["target_label", "RAW_TARGET_LABEL_FIELD", "rawTargetLabelDetected"]]
  ].map(([key, value]) => {
    const tuple = value as [
      DesktopActionPrivacyRedactionFindingKind,
      string,
      keyof ScanFlags
    ];
    return [
      key as string,
      {
        kind: tuple[0],
        code: tuple[1],
        flag: tuple[2]
      }
    ];
  })
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
  "RAW_UI_TEXT",
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF",
  "CLIPBOARD_CONTENT"
];

type ScanFlags = {
  rawScreenshotDetected: boolean;
  imageBytesDetected: boolean;
  rawOcrTextDetected: boolean;
  rawUiTextDetected: boolean;
  clipboardContentDetected: boolean;
  fileContentDetected: boolean;
  secretMarkerDetected: boolean;
  apiKeyDetected: boolean;
  rawTargetLabelDetected: boolean;
  executeFlagDetected: boolean;
};

function emptyFlags(): ScanFlags {
  return {
    rawScreenshotDetected: false,
    imageBytesDetected: false,
    rawOcrTextDetected: false,
    rawUiTextDetected: false,
    clipboardContentDetected: false,
    fileContentDetected: false,
    secretMarkerDetected: false,
    apiKeyDetected: false,
    rawTargetLabelDetected: false,
    executeFlagDetected: false
  };
}

function emptyReadiness(): DesktopActionPrivacyRedactionReadiness {
  return {
    canPersistRawScreenshot: false,
    canPersistRawOcrText: false,
    canPersistRawUiText: false,
    canUseClipboard: false,
    canWriteEventStore: false,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canOpenFileDialog: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function finding(
  kind: DesktopActionPrivacyRedactionFindingKind,
  severity: DesktopActionPrivacyRedactionSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionPrivacyRedactionFinding {
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
  return (
    isRecord(value) &&
    value.source === "runtime_desktop_action_proposal_schema" &&
    "summary" in value &&
    "status" in value
  );
}

function extractProposal(
  value: DesktopActionPrivacyRedactionAuditInput["proposal"],
  findings: DesktopActionPrivacyRedactionFinding[]
): DesktopActionProposal | undefined {
  if (!value) {
    findings.push(
      finding(
        "proposal",
        "warning",
        "PROPOSAL_MISSING",
        "Privacy audit has no proposal ref."
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
          "PROPOSAL_BLOCKED",
          "Blocked desktop action proposals cannot pass privacy audit."
        )
      );
      return undefined;
    }
    return value.proposal;
  }
  return value;
}

function hasSecretMarker(value: string): boolean {
  return (
    value.startsWith("sk-") ||
    /\ssk-[A-Za-z0-9_-]+/.test(value) ||
    secretMarkers.some((marker) => value.includes(marker))
  );
}

function markRawMarker(value: string, flags: ScanFlags): boolean {
  let detected = false;
  if (value.includes("RAW_SCREENSHOT")) {
    flags.rawScreenshotDetected = true;
    detected = true;
  }
  if (value.includes("SCREENSHOT_BYTES")) {
    flags.imageBytesDetected = true;
    detected = true;
  }
  if (value.includes("RAW_OCR")) {
    flags.rawOcrTextDetected = true;
    detected = true;
  }
  if (
    value.includes("RAW_UI_TEXT") ||
    value.includes("RAW_PROMPT") ||
    value.includes("RAW_RESPONSE") ||
    value.includes("RAW_SOURCE") ||
    value.includes("RAW_DIFF")
  ) {
    flags.rawUiTextDetected = true;
    detected = true;
  }
  if (value.includes("CLIPBOARD_CONTENT")) {
    flags.clipboardContentDetected = true;
    detected = true;
  }
  return detected || rawMarkers.some((marker) => value.includes(marker));
}

function scanUnsafeFields(
  value: unknown,
  findings: DesktopActionPrivacyRedactionFinding[],
  flags: ScanFlags
): void {
  if (typeof value === "string") {
    if (hasSecretMarker(value)) {
      flags.secretMarkerDetected = true;
      if (
        value.startsWith("sk-") ||
        /\ssk-[A-Za-z0-9_-]+/.test(value) ||
        value.includes("Bearer ") ||
        value.includes("Authorization") ||
        value.includes("DEEPSEEK_API_KEY") ||
        value.includes("OPENAI_API_KEY")
      ) {
        flags.apiKeyDetected = true;
      }
      findings.push(
        finding(
          flags.apiKeyDetected ? "api_key" : "secret",
          "blocker",
          flags.apiKeyDetected ? "API_KEY_MARKER" : "SECRET_MARKER",
          "Secret-like desktop audit marker is not allowed.",
          "input.redacted"
        )
      );
    }
    if (markRawMarker(value, flags)) {
      findings.push(
        finding(
          "raw_ui_text",
          "blocker",
          "RAW_MARKER",
          "Raw desktop, prompt, or response marker is not allowed.",
          "input.redacted"
        )
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => scanUnsafeFields(item, findings, flags));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const forbidden = forbiddenFieldKinds.get(normalizedKey);
    if (forbidden) {
      flags[forbidden.flag] = true;
      findings.push(
        finding(
          forbidden.kind,
          "blocker",
          forbidden.code,
          "Forbidden raw desktop audit field is not allowed.",
          "input.forbiddenField"
        )
      );
    }
    if (executionBooleanKeys.has(normalizedKey) && child === true) {
      flags.executeFlagDetected = true;
      findings.push(
        finding(
          "execution_field",
          "blocker",
          "EXECUTION_FLAG_TRUE",
          "Desktop action execution readiness must remain false.",
          "input.executionFlag"
        )
      );
    }
    scanUnsafeFields(child, findings, flags);
  }
}

function countRedactionCodes(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countRedactionCodes(item), 0);
  }
  if (!isRecord(value)) {
    return 0;
  }
  return Object.entries(value).reduce((sum, [key, child]) => {
    if (key === "redactionCodes" && Array.isArray(child)) {
      return sum + child.filter((item) => typeof item === "string").length;
    }
    return sum + countRedactionCodes(child);
  }, 0);
}

function countSensitiveTargets(
  proposal: DesktopActionProposal | undefined
): number {
  if (!proposal) {
    return 0;
  }
  return proposal.operations.filter((operation) =>
    /password|credential|secret|token|api/i.test(
      `${operation.targetRef.sensitiveKind || ""} ${operation.targetRef.labelSummary || ""}`
    )
  ).length;
}

function auditRawTargetLabels(
  proposal: DesktopActionProposal | undefined,
  input: DesktopActionPrivacyRedactionAuditInput,
  findings: DesktopActionPrivacyRedactionFinding[],
  flags: ScanFlags
): void {
  if (!proposal || input.policy?.forbidRawTargetLabels !== true) {
    return;
  }
  for (const operation of proposal.operations) {
    const label = operation.targetRef.labelSummary;
    if (label && !/\b(summary|redacted|hash)\b/i.test(label)) {
      flags.rawTargetLabelDetected = true;
      findings.push(
        finding(
          "target_label",
          "blocker",
          "RAW_TARGET_LABEL_FORBIDDEN",
          "Raw target labels are blocked by privacy policy.",
          "proposal.targetLabel"
        )
      );
    }
  }
}

function upstreamFindings(
  input: DesktopActionPrivacyRedactionAuditInput
): DesktopActionPrivacyRedactionFinding[] {
  const findings: DesktopActionPrivacyRedactionFinding[] = [];
  if (input.targetValidation?.status === "blocked") {
    findings.push(
      finding(
        "target_validation",
        "blocker",
        "TARGET_VALIDATION_BLOCKED",
        "Blocked target validation cannot pass privacy audit."
      )
    );
  }
  if (input.riskClassification?.status === "blocked") {
    findings.push(
      finding(
        "risk",
        "blocker",
        "RISK_CLASSIFICATION_BLOCKED",
        "Blocked risk classification cannot pass privacy audit."
      )
    );
  }
  if (input.simulation?.status === "blocked") {
    findings.push(
      finding(
        "simulation",
        "blocker",
        "SIMULATION_BLOCKED",
        "Blocked simulation cannot pass privacy audit."
      )
    );
  }
  if (input.capabilityPlanning?.status === "blocked") {
    findings.push(
      finding(
        "capability_planning",
        "blocker",
        "CAPABILITY_PLANNING_BLOCKED",
        "Blocked capability planning cannot pass privacy audit."
      )
    );
  }
  if (!input.appSummary) {
    findings.push(
      finding(
        "app_summary",
        "warning",
        "APP_SUMMARY_MISSING",
        "Privacy audit has no App summary ref."
      )
    );
  }
  return findings;
}

export function buildDesktopActionPrivacyRedactionAudit(
  input: DesktopActionPrivacyRedactionAuditInput = {}
): DesktopActionPrivacyRedactionAudit {
  const flags = emptyFlags();
  const findings = upstreamFindings(input);
  scanUnsafeFields(input, findings, flags);
  const proposal = extractProposal(input.proposal, findings);
  auditRawTargetLabels(proposal, input, findings, flags);

  const redactedFieldCount = countRedactionCodes(input);
  const sensitiveTargetCount = countSensitiveTargets(proposal);
  const rawFieldDetectedCount = Object.values(flags).filter(Boolean).length;
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionPrivacyRedactionAuditStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "audit_ready";
  const redactionSummary: DesktopActionPrivacyRedactionSummary = {
    ...flags,
    redactedFieldCount,
    rawFieldDetectedCount,
    sensitiveTargetCount,
    summaryOnly: true
  };
  const auditCore = {
    status,
    proposalId: proposal?.proposalId,
    redactionSummary,
    upstream: {
      targetValidation: input.targetValidation?.status,
      riskClassification: input.riskClassification?.status,
      simulation: input.simulation?.status,
      capabilityPlanning: input.capabilityPlanning?.status
    },
    createdAt: input.createdAt
  };
  const auditHash = stablePreviewHash(JSON.stringify(auditCore));
  const auditId =
    input.idGenerator?.() ||
    `desktop-action-privacy-audit-${auditHash.slice(0, 12)}`;

  return {
    status,
    auditId,
    ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
    redactionSummary,
    rawLeakBooleans: redactionSummary,
    redactedFieldCount,
    sensitiveTargetCount,
    warningCount,
    blockerCount,
    findingCount: findings.length,
    findings,
    auditHash,
    readiness: emptyReadiness(),
    nextAction:
      status === "blocked"
        ? "Remove raw desktop, secret, clipboard, file, or execution fields before smoke."
        : "Privacy audit is summary-only. Desktop action execution remains disabled.",
    source: "runtime_desktop_action_privacy_redaction_audit"
  };
}

export function summarizeDesktopActionPrivacyRedactionAudit(
  audit: DesktopActionPrivacyRedactionAudit
): DesktopActionPrivacyRedactionSummary {
  return audit.redactionSummary;
}
