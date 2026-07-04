import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopActionExpansionRiskInput =
  | Record<string, unknown>
  | string
  | unknown;

export type DesktopActionExpansionRiskClass =
  | "low"
  | "medium"
  | "high"
  | "blocked";

export type DesktopActionExpansionRiskSeverity = "blocker" | "warning";

export type DesktopActionExpansionRiskFindingKind =
  | "schema"
  | "proposal"
  | "freshness"
  | "sensitive_target"
  | "destructive_target"
  | "clipboard"
  | "file_dialog"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "readiness";

export type DesktopActionExpansionRiskFinding = {
  findingId: string;
  kind: DesktopActionExpansionRiskFindingKind;
  severity: DesktopActionExpansionRiskSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionExpansionRiskTargetSummary = {
  targetId?: string | undefined;
  targetKind?: string | undefined;
  labelSummary?: string | undefined;
  appNameSummary?: string | undefined;
  windowTitleSummary?: string | undefined;
  confidence?: number | undefined;
};

export type DesktopActionExpansionRiskProposalSummary = {
  proposalId: string;
  actionKind: string;
  objectiveSummary: string;
  targetSummary?: DesktopActionExpansionRiskTargetSummary | undefined;
  expectedEffectSummary?: string | undefined;
  proposalHash?: string | undefined;
};

export type DesktopActionExpansionRiskReadiness = {
  canEnterApprovalDraft: boolean;
  canEnterSequenceSimulation: boolean;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canSelect: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canDragDrop: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionExpansionRiskClassification = {
  status: "classified" | "warning" | "blocked";
  classificationId: string;
  proposalId?: string | undefined;
  actionKind?: string | undefined;
  riskClass: DesktopActionExpansionRiskClass;
  riskScore: number;
  requiredApprovals: string[];
  blockedReasons: string[];
  warningCodes: string[];
  riskFactors: string[];
  findings: DesktopActionExpansionRiskFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DesktopActionExpansionRiskReadiness;
  classificationHash: string;
  summary: {
    status: "classified" | "warning" | "blocked";
    proposalId?: string | undefined;
    actionKind?: string | undefined;
    riskClass: DesktopActionExpansionRiskClass;
    riskScore: number;
    requiredApprovals: string[];
    blockedReasons: string[];
    warningCodes: string[];
    riskFactors: string[];
    classificationHash: string;
    summaryOnly: true;
  };
  nextAction: string;
  source: "runtime_desktop_action_expansion_risk_classifier";
};

const riskScores: Record<DesktopActionExpansionRiskClass, number> = {
  low: 10,
  medium: 40,
  high: 75,
  blocked: 100
};

const forbiddenFieldKeys = new Set(
  [
    "rawScreenshot",
    "screenshotBytes",
    "rawOcrText",
    "rawTargetText",
    "rawPrompt",
    "rawResponse",
    "rawSource",
    "rawDiff",
    "clipboardContent",
    "fileContent",
    "apiKey",
    "Authorization",
    "bearer",
    "token",
    "password",
    "secret",
    "clickNow",
    "typeNow",
    "selectNow",
    "dragNow",
    "openDialogNow",
    "writeClipboardNow",
    "executeNow",
    "eventStoreWrite",
    "nativeBridge",
    "shellCommand",
    "gitCommand"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "clickNow",
    "typeNow",
    "selectNow",
    "dragNow",
    "openDialogNow",
    "writeClipboardNow",
    "executeNow",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canSelect",
    "canWriteClipboard",
    "canOpenFileDialog",
    "canDragDrop",
    "canWriteEventStore",
    "canUseNativeBridge",
    "appCanExecute"
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
  "RAW_TARGET_TEXT",
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF",
  "CLIPBOARD_CONTENT",
  "FILE_CONTENT"
];

function containsSecretMarker(value: string): boolean {
  return (
    /\bsk-[A-Za-z0-9_-]{8,}\b/.test(value) ||
    secretMarkers
      .filter((marker) => marker !== "sk-")
      .some((marker) => value.includes(marker))
  );
}

const passwordWords = ["password", "credential", "secret", "token", "key"];
const paymentWords = ["payment", "billing", "invoice", "bank", "finance"];
const destructiveWords = ["delete", "remove", "wipe", "reset", "destroy"];
const systemWords = ["settings", "system", "security", "permission", "admin"];
const sendWords = ["send", "post", "upload", "publish", "share"];

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

function finding(
  kind: DesktopActionExpansionRiskFindingKind,
  severity: DesktopActionExpansionRiskSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionExpansionRiskFinding {
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
): DesktopActionExpansionRiskReadiness {
  return {
    canEnterApprovalDraft: canEnterPreview,
    canEnterSequenceSimulation: canEnterPreview,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canSelect: false,
    canWriteClipboard: false,
    canOpenFileDialog: false,
    canDragDrop: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function parseInput(input: DesktopActionExpansionRiskInput): {
  record?: Record<string, unknown>;
  findings: DesktopActionExpansionRiskFinding[];
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
              "Desktop action risk classifier JSON must be an object."
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
            "Desktop action risk classifier JSON could not be parsed."
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
          "Desktop action risk classifier input must be an object."
        )
      ]
    };
  }
  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopActionExpansionRiskFinding[]
): void {
  if (typeof value === "string") {
    if (containsSecretMarker(value)) {
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
          "Raw screenshot, OCR, target text, prompt, response, source, diff, clipboard, or file content markers are not allowed.",
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
          executionBooleanKeys.has(normalizedKey)
            ? "execution_field"
            : normalizedKey.includes("secret") ||
                normalizedKey.includes("password") ||
                normalizedKey.includes("token")
              ? "secret"
              : "raw_field",
          "blocker",
          "FORBIDDEN_FIELD",
          "Forbidden raw, secret, or execution field is not allowed.",
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
          "Desktop action risk classifier cannot enable execution.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function hasWord(values: Array<string | undefined>, words: string[]): boolean {
  return values.some((value) => {
    const lowered = value?.toLowerCase() ?? "";
    return words.some((word) => lowered.includes(word));
  });
}

function readProposalSummary(
  value: unknown,
  findings: DesktopActionExpansionRiskFinding[]
): DesktopActionExpansionRiskProposalSummary | undefined {
  if (!isRecord(value)) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_PROPOSAL_SUMMARY",
        "Desktop action risk classifier requires a proposal summary.",
        "proposalSummary"
      )
    );
    return undefined;
  }
  const proposalId = readString(value.proposalId);
  const actionKind = readString(value.actionKind);
  const objectiveSummary = readString(value.objectiveSummary);
  const targetRecord = isRecord(value.targetSummary)
    ? value.targetSummary
    : undefined;
  if (!proposalId) {
    findings.push(
      finding(
        "proposal",
        "blocker",
        "MISSING_PROPOSAL_ID",
        "Proposal id is required.",
        "proposalSummary.proposalId"
      )
    );
  }
  if (!actionKind) {
    findings.push(
      finding(
        "proposal",
        "blocker",
        "MISSING_ACTION_KIND",
        "Action kind is required.",
        "proposalSummary.actionKind"
      )
    );
  }
  if (!objectiveSummary) {
    findings.push(
      finding(
        "proposal",
        "blocker",
        "MISSING_OBJECTIVE_SUMMARY",
        "Objective summary is required.",
        "proposalSummary.objectiveSummary"
      )
    );
  }
  if (!proposalId || !actionKind || !objectiveSummary) {
    return undefined;
  }
  const targetSummary = targetRecord
    ? {
        ...(readString(targetRecord.targetId)
          ? { targetId: readString(targetRecord.targetId) }
          : {}),
        ...(readString(targetRecord.targetKind)
          ? { targetKind: readString(targetRecord.targetKind) }
          : {}),
        ...(readString(targetRecord.labelSummary)
          ? { labelSummary: readString(targetRecord.labelSummary) }
          : {}),
        ...(readString(targetRecord.appNameSummary)
          ? { appNameSummary: readString(targetRecord.appNameSummary) }
          : {}),
        ...(readString(targetRecord.windowTitleSummary)
          ? { windowTitleSummary: readString(targetRecord.windowTitleSummary) }
          : {}),
        ...(readNumber(targetRecord.confidence) !== undefined
          ? { confidence: readNumber(targetRecord.confidence) }
          : {})
      }
    : undefined;
  return {
    proposalId,
    actionKind,
    objectiveSummary,
    ...(targetSummary ? { targetSummary } : {}),
    ...(readString(value.expectedEffectSummary)
      ? { expectedEffectSummary: readString(value.expectedEffectSummary) }
      : {}),
    ...(readString(value.proposalHash)
      ? { proposalHash: readString(value.proposalHash) }
      : {})
  };
}

function escalate(
  current: DesktopActionExpansionRiskClass,
  next: DesktopActionExpansionRiskClass
): DesktopActionExpansionRiskClass {
  const order: DesktopActionExpansionRiskClass[] = [
    "low",
    "medium",
    "high",
    "blocked"
  ];
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

function approvalsFor(riskClass: DesktopActionExpansionRiskClass): string[] {
  if (riskClass === "low") {
    return [];
  }
  if (riskClass === "medium") {
    return ["manual_review"];
  }
  if (riskClass === "high") {
    return ["typed_confirmation", "explicit_approval_required"];
  }
  return ["blocked"];
}

function classifyActionKind(
  actionKind: string
): DesktopActionExpansionRiskClass {
  if (actionKind === "wait_for_state" || actionKind === "scroll") {
    return "low";
  }
  if (
    ["click_target", "select_option", "keyboard_shortcut"].includes(actionKind)
  ) {
    return "medium";
  }
  if (actionKind === "type_text" || actionKind === "drag_drop") {
    return "high";
  }
  if (
    actionKind.startsWith("clipboard_") ||
    actionKind.startsWith("file_dialog_")
  ) {
    return "blocked";
  }
  return "medium";
}

function buildResult(
  proposal: DesktopActionExpansionRiskProposalSummary | undefined,
  riskClass: DesktopActionExpansionRiskClass,
  riskFactors: string[],
  findings: DesktopActionExpansionRiskFinding[]
): DesktopActionExpansionRiskClassification {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const finalRisk = blockerCount > 0 ? "blocked" : riskClass;
  const status: "classified" | "warning" | "blocked" =
    finalRisk === "blocked"
      ? "blocked"
      : warningCount > 0 || finalRisk !== "low"
        ? "warning"
        : "classified";
  const blockedReasons = findings
    .filter((item) => item.severity === "blocker")
    .map((item) => item.code);
  const warningCodes = findings
    .filter((item) => item.severity === "warning")
    .map((item) => item.code);
  const classificationCore = {
    status,
    proposalId: proposal?.proposalId,
    actionKind: proposal?.actionKind,
    riskClass: finalRisk,
    riskScore: riskScores[finalRisk],
    requiredApprovals: approvalsFor(finalRisk),
    blockedReasons,
    warningCodes,
    riskFactors
  };
  const classificationHash = stablePreviewHash(
    JSON.stringify(classificationCore)
  );
  return {
    classificationId: classificationHash.slice(0, 16),
    ...classificationCore,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(status !== "blocked"),
    classificationHash,
    summary: {
      ...classificationCore,
      classificationHash,
      summaryOnly: true
    },
    nextAction:
      status === "blocked"
        ? "Resolve blocked sensitive or destructive desktop action risks before preview."
        : "Proceed to sequence simulation or approval draft preview.",
    source: "runtime_desktop_action_expansion_risk_classifier"
  };
}

export function classifyDesktopActionExpansionRisk(
  input: DesktopActionExpansionRiskInput
): DesktopActionExpansionRiskClassification {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  if (!parsed.record) {
    return buildResult(undefined, "blocked", [], findings);
  }

  scanUnsafeFields(parsed.record, "", findings);
  const proposal = readProposalSummary(parsed.record.proposalSummary, findings);
  if (!proposal) {
    return buildResult(undefined, "blocked", [], findings);
  }

  let riskClass = classifyActionKind(proposal.actionKind);
  const riskFactors = new Set<string>();
  const target = proposal.targetSummary;
  const labelValues = [
    proposal.objectiveSummary,
    proposal.expectedEffectSummary,
    target?.labelSummary,
    target?.appNameSummary,
    target?.windowTitleSummary
  ];

  if (hasWord(labelValues, passwordWords)) {
    riskClass = "blocked";
    riskFactors.add("password_or_credential_field");
    findings.push(
      finding(
        "sensitive_target",
        "blocker",
        "PASSWORD_TARGET_BLOCKED",
        "Password or credential targets are blocked.",
        "proposalSummary.targetSummary.labelSummary"
      )
    );
  }
  if (hasWord(labelValues, destructiveWords)) {
    riskClass = "blocked";
    riskFactors.add("destructive_action");
    findings.push(
      finding(
        "destructive_target",
        "blocker",
        "DESTRUCTIVE_TARGET_BLOCKED",
        "Delete, remove, wipe, or reset targets are blocked.",
        "proposalSummary"
      )
    );
  }
  if (hasWord(labelValues, paymentWords)) {
    riskClass = escalate(riskClass, "high");
    riskFactors.add("payment_or_finance");
    findings.push(
      finding(
        "sensitive_target",
        "warning",
        "PAYMENT_OR_FINANCE_REVIEW",
        "Payment or finance targets require high-risk review.",
        "proposalSummary"
      )
    );
  }
  if (hasWord(labelValues, systemWords)) {
    riskClass = escalate(riskClass, "high");
    riskFactors.add("system_or_security_prompt");
    findings.push(
      finding(
        "sensitive_target",
        "warning",
        "SYSTEM_OR_SECURITY_REVIEW",
        "System settings or security prompts require high-risk review.",
        "proposalSummary"
      )
    );
  }
  if (hasWord(labelValues, sendWords)) {
    riskClass = escalate(riskClass, "high");
    riskFactors.add("external_send_post_upload");
    findings.push(
      finding(
        "sensitive_target",
        "warning",
        "EXTERNAL_SEND_REVIEW",
        "External send, post, upload, or share actions require review.",
        "proposalSummary"
      )
    );
  }
  if (proposal.actionKind.startsWith("clipboard_")) {
    riskFactors.add("clipboard_write");
    findings.push(
      finding(
        "clipboard",
        "blocker",
        "CLIPBOARD_ACTION_BLOCKED",
        "Clipboard actions remain blocked in expanded proposal preview.",
        "proposalSummary.actionKind"
      )
    );
  }
  if (
    proposal.actionKind.startsWith("file_dialog_") ||
    proposal.actionKind === "file_dialog_select"
  ) {
    riskFactors.add("file_dialog");
    findings.push(
      finding(
        "file_dialog",
        "blocker",
        "FILE_DIALOG_ACTION_BLOCKED",
        "File dialog actions remain blocked in expanded proposal preview.",
        "proposalSummary.actionKind"
      )
    );
  }
  if (target && target.confidence !== undefined && target.confidence < 0.75) {
    riskClass = escalate(riskClass, "medium");
    riskFactors.add("low_confidence_target");
    findings.push(
      finding(
        "proposal",
        "warning",
        "LOW_CONFIDENCE_TARGET",
        "Low confidence targets require review.",
        "proposalSummary.targetSummary.confidence"
      )
    );
  }
  if (!target?.appNameSummary || !target?.windowTitleSummary) {
    riskClass = escalate(riskClass, "medium");
    riskFactors.add("unknown_app_or_window");
    findings.push(
      finding(
        "proposal",
        "warning",
        "UNKNOWN_APP_OR_WINDOW",
        "Unknown app or window summaries require review.",
        "proposalSummary.targetSummary"
      )
    );
  }

  const freshness = isRecord(parsed.record.freshnessResult)
    ? parsed.record.freshnessResult
    : undefined;
  if (freshness?.status === "blocked") {
    riskClass = "blocked";
    riskFactors.add("stale_evidence");
    findings.push(
      finding(
        "freshness",
        "blocker",
        "STALE_OR_BLOCKED_TARGET",
        "Blocked target freshness result blocks risk classification.",
        "freshnessResult"
      )
    );
  } else if (freshness?.status === "warning") {
    riskClass = escalate(riskClass, "medium");
    riskFactors.add("freshness_warning");
    findings.push(
      finding(
        "freshness",
        "warning",
        "FRESHNESS_WARNING",
        "Target freshness warning escalates risk.",
        "freshnessResult"
      )
    );
  }

  const sequenceStepCount = readNumber(parsed.record.sequenceStepCount);
  if (sequenceStepCount !== undefined && sequenceStepCount > 1) {
    riskClass = escalate(riskClass, "medium");
    riskFactors.add("multi_step_sequence");
    findings.push(
      finding(
        "proposal",
        "warning",
        "MULTI_STEP_SEQUENCE_REVIEW",
        "Multi-step desktop action sequences require review.",
        "sequenceStepCount"
      )
    );
  }

  return buildResult(proposal, riskClass, [...riskFactors], findings);
}

export function summarizeDesktopActionExpansionRisk(
  classification: DesktopActionExpansionRiskClassification
): DesktopActionExpansionRiskClassification["summary"] {
  return classification.summary;
}
