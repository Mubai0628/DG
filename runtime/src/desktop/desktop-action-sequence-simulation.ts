import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopActionSequenceSimulationInput =
  | Record<string, unknown>
  | string
  | unknown;

export type DesktopActionSequenceSimulationStatus =
  | "simulated"
  | "warning"
  | "blocked";

export type DesktopActionSequenceStepStatus =
  | "simulated"
  | "warning"
  | "blocked"
  | "skipped";

export type DesktopActionSequenceSimulationSeverity = "blocker" | "warning";

export type DesktopActionSequenceSimulationFindingKind =
  | "schema"
  | "sequence_policy"
  | "freshness"
  | "risk"
  | "proposal"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "readiness";

export type DesktopActionSequenceSimulationFinding = {
  findingId: string;
  kind: DesktopActionSequenceSimulationFindingKind;
  severity: DesktopActionSequenceSimulationSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionSequenceStepInput = {
  stepId?: string | undefined;
  proposalSummary: {
    proposalId: string;
    actionKind: string;
    targetId?: string | undefined;
    targetKind?: string | undefined;
    expectedEffectSummary?: string | undefined;
    proposalHash?: string | undefined;
  };
  freshnessResult?: {
    status: "fresh" | "warning" | "blocked";
    blockerCodes?: string[] | undefined;
    warningCodes?: string[] | undefined;
    targetHash?: string | undefined;
  };
  riskSummary?: {
    riskClass?: "low" | "medium" | "high" | "blocked" | undefined;
    riskFactors?: string[] | undefined;
    warningCodes?: string[] | undefined;
    blockerCodes?: string[] | undefined;
  };
  preconditionSummary?: string | undefined;
  postconditionSummary?: string | undefined;
};

export type DesktopActionSequencePolicy = {
  maxSteps?: number | undefined;
  blockClipboardActions?: boolean | undefined;
  blockFileDialogActions?: boolean | undefined;
  blockSensitiveUi?: boolean | undefined;
  blockDestructiveActions?: boolean | undefined;
};

type DesktopActionSequenceNormalizedPolicy = {
  maxSteps: number;
  blockClipboardActions: boolean;
  blockFileDialogActions: boolean;
  blockSensitiveUi: boolean;
  blockDestructiveActions: boolean;
};

export type DesktopActionSequenceStepSummary = {
  stepId: string;
  proposalId: string;
  actionKind: string;
  status: DesktopActionSequenceStepStatus;
  targetId?: string | undefined;
  targetKind?: string | undefined;
  expectedEffectSummary?: string | undefined;
  preconditionSummary?: string | undefined;
  postconditionSummary?: string | undefined;
  blockerCodes: string[];
  warningCodes: string[];
  stepHash: string;
};

export type DesktopActionSequenceSimulationReadiness = {
  canEnterApprovalDraft: boolean;
  canEnterPrivacyAudit: boolean;
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

export type DesktopActionSequenceSimulation = {
  simulationId: string;
  status: DesktopActionSequenceSimulationStatus;
  stepCount: number;
  simulatedStepCount: number;
  blockedStepCount: number;
  warningStepCount: number;
  skippedStepCount: number;
  stepSummaries: DesktopActionSequenceStepSummary[];
  expectedFinalStateSummary: string;
  findings: DesktopActionSequenceSimulationFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DesktopActionSequenceSimulationReadiness;
  simulationHash: string;
  source: "runtime_desktop_action_sequence_simulation";
};

const forbiddenFieldKeys = new Set(
  [
    "rawScreenshot",
    "screenshotBytes",
    "rawOcrText",
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
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF",
  "CLIPBOARD_CONTENT",
  "FILE_CONTENT"
];

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

function finding(
  kind: DesktopActionSequenceSimulationFindingKind,
  severity: DesktopActionSequenceSimulationSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionSequenceSimulationFinding {
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
): DesktopActionSequenceSimulationReadiness {
  return {
    canEnterApprovalDraft: canEnterPreview,
    canEnterPrivacyAudit: canEnterPreview,
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

function parseInput(input: DesktopActionSequenceSimulationInput): {
  record?: Record<string, unknown>;
  findings: DesktopActionSequenceSimulationFinding[];
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
              "Desktop action sequence simulation JSON must be an object."
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
            "Desktop action sequence simulation JSON could not be parsed."
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
          "Desktop action sequence simulation input must be an object."
        )
      ]
    };
  }
  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopActionSequenceSimulationFinding[]
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
          "Raw screenshot, OCR, prompt, response, source, diff, clipboard, or file content markers are not allowed.",
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
          "Sequence simulation cannot enable desktop execution.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function normalizePolicy(
  value: unknown
): DesktopActionSequenceNormalizedPolicy {
  const record = isRecord(value) ? value : {};
  const maxSteps =
    typeof record.maxSteps === "number" && Number.isFinite(record.maxSteps)
      ? Math.max(1, Math.floor(record.maxSteps))
      : 20;
  return {
    maxSteps,
    blockClipboardActions: record.blockClipboardActions !== false,
    blockFileDialogActions: record.blockFileDialogActions !== false,
    blockSensitiveUi: record.blockSensitiveUi !== false,
    blockDestructiveActions: record.blockDestructiveActions !== false
  };
}

function readProposalSummary(
  value: unknown,
  path: string,
  findings: DesktopActionSequenceSimulationFinding[]
): DesktopActionSequenceStepInput["proposalSummary"] | undefined {
  if (!isRecord(value)) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_PROPOSAL_SUMMARY",
        "Each sequence step requires a proposal summary.",
        path
      )
    );
    return undefined;
  }
  const proposalId = readString(value.proposalId);
  const actionKind = readString(value.actionKind);
  if (!proposalId) {
    findings.push(
      finding(
        "proposal",
        "blocker",
        "MISSING_PROPOSAL_ID",
        "Sequence step proposal summary requires proposal id.",
        `${path}.proposalId`
      )
    );
  }
  if (!actionKind) {
    findings.push(
      finding(
        "proposal",
        "blocker",
        "MISSING_ACTION_KIND",
        "Sequence step proposal summary requires action kind.",
        `${path}.actionKind`
      )
    );
  }
  if (!proposalId || !actionKind) {
    return undefined;
  }
  return {
    proposalId,
    actionKind,
    ...(readString(value.targetId)
      ? { targetId: readString(value.targetId) }
      : {}),
    ...(readString(value.targetKind)
      ? { targetKind: readString(value.targetKind) }
      : {}),
    ...(readString(value.expectedEffectSummary)
      ? { expectedEffectSummary: readString(value.expectedEffectSummary) }
      : {}),
    ...(readString(value.proposalHash)
      ? { proposalHash: readString(value.proposalHash) }
      : {})
  };
}

function readFreshnessResult(
  value: unknown
): DesktopActionSequenceStepInput["freshnessResult"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const status = readString(value.status);
  if (!["fresh", "warning", "blocked"].includes(status ?? "")) {
    return undefined;
  }
  return {
    status: status as "fresh" | "warning" | "blocked",
    ...(readStringArray(value.blockerCodes)
      ? { blockerCodes: readStringArray(value.blockerCodes) }
      : {}),
    ...(readStringArray(value.warningCodes)
      ? { warningCodes: readStringArray(value.warningCodes) }
      : {}),
    ...(readString(value.targetHash)
      ? { targetHash: readString(value.targetHash) }
      : {})
  };
}

function readRiskSummary(
  value: unknown
): DesktopActionSequenceStepInput["riskSummary"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const riskClass = readString(value.riskClass);
  return {
    ...(riskClass && ["low", "medium", "high", "blocked"].includes(riskClass)
      ? { riskClass: riskClass as "low" | "medium" | "high" | "blocked" }
      : {}),
    ...(readStringArray(value.riskFactors)
      ? { riskFactors: readStringArray(value.riskFactors) }
      : {}),
    ...(readStringArray(value.warningCodes)
      ? { warningCodes: readStringArray(value.warningCodes) }
      : {}),
    ...(readStringArray(value.blockerCodes)
      ? { blockerCodes: readStringArray(value.blockerCodes) }
      : {})
  };
}

function isClipboardAction(actionKind: string): boolean {
  return actionKind.startsWith("clipboard_");
}

function isFileDialogAction(actionKind: string): boolean {
  return (
    actionKind.startsWith("file_dialog_") || actionKind === "file_dialog_select"
  );
}

function actionRiskBlocks(
  step: DesktopActionSequenceStepInput,
  policy: DesktopActionSequenceNormalizedPolicy
): string[] {
  const codes: string[] = [];
  const actionKind = step.proposalSummary.actionKind;
  const riskFactors = step.riskSummary?.riskFactors ?? [];
  if (policy.blockClipboardActions && isClipboardAction(actionKind)) {
    codes.push("CLIPBOARD_ACTION_PROPOSAL_ONLY");
  }
  if (policy.blockFileDialogActions && isFileDialogAction(actionKind)) {
    codes.push("FILE_DIALOG_ACTION_PROPOSAL_ONLY");
  }
  if (step.freshnessResult?.status === "blocked") {
    codes.push(...(step.freshnessResult.blockerCodes ?? ["FRESHNESS_BLOCKED"]));
  }
  if (step.riskSummary?.riskClass === "blocked") {
    codes.push(...(step.riskSummary.blockerCodes ?? ["RISK_BLOCKED"]));
  }
  if (policy.blockSensitiveUi && riskFactors.includes("sensitive_ui")) {
    codes.push("SENSITIVE_UI_STOPS_SEQUENCE");
  }
  if (
    policy.blockDestructiveActions &&
    riskFactors.includes("destructive_action")
  ) {
    codes.push("DESTRUCTIVE_ACTION_STOPS_SEQUENCE");
  }
  return [...new Set(codes)];
}

function actionWarnings(step: DesktopActionSequenceStepInput): string[] {
  const codes = [
    ...(step.freshnessResult?.warningCodes ?? []),
    ...(step.riskSummary?.warningCodes ?? [])
  ];
  if (step.freshnessResult?.status === "warning") {
    codes.push("FRESHNESS_WARNING");
  }
  if (
    step.riskSummary?.riskClass === "medium" ||
    step.riskSummary?.riskClass === "high"
  ) {
    codes.push("RISK_REVIEW_REQUIRED");
  }
  return [...new Set(codes)];
}

function buildSimulation(
  stepSummaries: DesktopActionSequenceStepSummary[],
  findings: DesktopActionSequenceSimulationFinding[],
  expectedFinalStateSummary: string
): DesktopActionSequenceSimulation {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const blockedStepCount = stepSummaries.filter(
    (step) => step.status === "blocked"
  ).length;
  const warningStepCount = stepSummaries.filter(
    (step) => step.status === "warning"
  ).length;
  const skippedStepCount = stepSummaries.filter(
    (step) => step.status === "skipped"
  ).length;
  const simulatedStepCount = stepSummaries.filter(
    (step) => step.status === "simulated"
  ).length;
  const status: DesktopActionSequenceSimulationStatus =
    blockerCount > 0 || blockedStepCount > 0
      ? "blocked"
      : warningCount > 0 || warningStepCount > 0
        ? "warning"
        : "simulated";
  const simulationCore = {
    status,
    stepCount: stepSummaries.length,
    simulatedStepCount,
    blockedStepCount,
    warningStepCount,
    skippedStepCount,
    stepSummaries,
    expectedFinalStateSummary
  };
  const simulationHash = stablePreviewHash(JSON.stringify(simulationCore));
  return {
    simulationId: simulationHash.slice(0, 16),
    ...simulationCore,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(status !== "blocked"),
    simulationHash,
    source: "runtime_desktop_action_sequence_simulation"
  };
}

export function simulateDesktopActionSequence(
  input: DesktopActionSequenceSimulationInput
): DesktopActionSequenceSimulation {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  if (!parsed.record) {
    return buildSimulation([], findings, "No sequence simulated.");
  }

  scanUnsafeFields(parsed.record, "", findings);

  const policy = normalizePolicy(parsed.record.sequencePolicy);
  const rawSteps = Array.isArray(parsed.record.steps)
    ? parsed.record.steps
    : [];
  if (!Array.isArray(parsed.record.steps)) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_SEQUENCE_STEPS",
        "Sequence simulation requires a steps array.",
        "steps"
      )
    );
  }
  if (rawSteps.length > policy.maxSteps) {
    findings.push(
      finding(
        "sequence_policy",
        "blocker",
        "MAX_STEPS_EXCEEDED",
        "Sequence exceeds max step policy.",
        "steps"
      )
    );
  }

  const stepSummaries: DesktopActionSequenceStepSummary[] = [];
  let sequenceStopped = false;

  rawSteps.slice(0, policy.maxSteps).forEach((rawStep, index) => {
    const path = `steps[${index}]`;
    const record = isRecord(rawStep) ? rawStep : {};
    if (!isRecord(rawStep)) {
      findings.push(
        finding(
          "schema",
          "blocker",
          "STEP_NOT_OBJECT",
          "Sequence step must be an object.",
          path
        )
      );
    }
    const proposalSummary = readProposalSummary(
      record.proposalSummary,
      `${path}.proposalSummary`,
      findings
    );
    if (!proposalSummary) {
      return;
    }
    const freshnessResult = readFreshnessResult(record.freshnessResult);
    const riskSummary = readRiskSummary(record.riskSummary);
    const preconditionSummary = readString(record.preconditionSummary);
    const postconditionSummary = readString(record.postconditionSummary);
    const step: DesktopActionSequenceStepInput = {
      stepId: readString(record.stepId) ?? `step-${index + 1}`,
      proposalSummary,
      ...(freshnessResult ? { freshnessResult } : {}),
      ...(riskSummary ? { riskSummary } : {}),
      ...(preconditionSummary ? { preconditionSummary } : {}),
      ...(postconditionSummary ? { postconditionSummary } : {})
    };
    const blockerCodes = sequenceStopped
      ? ["SEQUENCE_STOPPED_AFTER_BLOCKER"]
      : actionRiskBlocks(step, policy);
    const warningCodes = sequenceStopped ? [] : actionWarnings(step);
    const status: DesktopActionSequenceStepStatus =
      blockerCodes.length > 0
        ? sequenceStopped
          ? "skipped"
          : "blocked"
        : warningCodes.length > 0
          ? "warning"
          : "simulated";
    const stepCore = {
      stepId: step.stepId ?? `step-${index + 1}`,
      proposalId: step.proposalSummary.proposalId,
      actionKind: step.proposalSummary.actionKind,
      status,
      targetId: step.proposalSummary.targetId,
      targetKind: step.proposalSummary.targetKind,
      expectedEffectSummary: step.proposalSummary.expectedEffectSummary,
      preconditionSummary: step.preconditionSummary,
      postconditionSummary: step.postconditionSummary,
      blockerCodes,
      warningCodes
    };
    stepSummaries.push({
      ...stepCore,
      stepHash: stablePreviewHash(JSON.stringify(stepCore)).slice(0, 16)
    });

    for (const code of blockerCodes) {
      findings.push(
        finding(
          code === "SEQUENCE_STOPPED_AFTER_BLOCKER"
            ? "sequence_policy"
            : code.includes("FRESHNESS") || code.includes("STALE")
              ? "freshness"
              : code.includes("RISK") ||
                  code.includes("SENSITIVE") ||
                  code.includes("DESTRUCTIVE")
                ? "risk"
                : "proposal",
          "blocker",
          code,
          "Sequence step cannot proceed in simulation preview.",
          path
        )
      );
    }
    for (const code of warningCodes) {
      findings.push(
        finding(
          code.includes("FRESHNESS") ? "freshness" : "risk",
          "warning",
          code,
          "Sequence step needs review before execution can ever be considered.",
          path
        )
      );
    }
    if (status === "blocked") {
      sequenceStopped = true;
    }
  });

  const expectedFinalStateSummary =
    stepSummaries.length === 0
      ? "No sequence simulated."
      : stepSummaries.some((step) => step.status === "blocked")
        ? "Sequence stops before desktop execution; no state changes are performed."
        : "All proposed steps are simulated as summary-only expected state transitions.";

  return buildSimulation(stepSummaries, findings, expectedFinalStateSummary);
}

export function summarizeDesktopActionSequenceSimulation(
  simulation: DesktopActionSequenceSimulation
): Pick<
  DesktopActionSequenceSimulation,
  | "simulationId"
  | "status"
  | "stepCount"
  | "simulatedStepCount"
  | "blockedStepCount"
  | "warningStepCount"
  | "skippedStepCount"
  | "stepSummaries"
  | "expectedFinalStateSummary"
  | "blockerCount"
  | "warningCount"
  | "readiness"
  | "simulationHash"
  | "source"
> {
  return {
    simulationId: simulation.simulationId,
    status: simulation.status,
    stepCount: simulation.stepCount,
    simulatedStepCount: simulation.simulatedStepCount,
    blockedStepCount: simulation.blockedStepCount,
    warningStepCount: simulation.warningStepCount,
    skippedStepCount: simulation.skippedStepCount,
    stepSummaries: simulation.stepSummaries,
    expectedFinalStateSummary: simulation.expectedFinalStateSummary,
    blockerCount: simulation.blockerCount,
    warningCount: simulation.warningCount,
    readiness: simulation.readiness,
    simulationHash: simulation.simulationHash,
    source: simulation.source
  };
}
