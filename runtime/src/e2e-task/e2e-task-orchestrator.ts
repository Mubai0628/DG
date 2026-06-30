import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type EndToEndCodingTaskState =
  | "empty"
  | "objective_ready"
  | "proposal_requested"
  | "proposal_generated"
  | "proposal_imported"
  | "proposal_validated"
  | "approval_ready"
  | "approved"
  | "applied"
  | "verification_requested"
  | "verification_passed"
  | "verification_failed"
  | "rollback_ready"
  | "rolled_back"
  | "completed"
  | "blocked";

export type EndToEndCodingTaskStageKind =
  | "objective"
  | "live_proposal_generation"
  | "model_proposal_import"
  | "chain_integration"
  | "validation_audit_approval"
  | "approval_receipt"
  | "approved_apply"
  | "verification"
  | "rollback"
  | "replay";

export type EndToEndCodingTaskStageStatus =
  | "missing"
  | "completed"
  | "warning"
  | "blocked";

export type EndToEndCodingTaskStage = {
  kind: EndToEndCodingTaskStageKind;
  status: EndToEndCodingTaskStageStatus;
  refId?: string | undefined;
  stateAfter?: EndToEndCodingTaskState | undefined;
  warningCodes: string[];
  blockerCodes: string[];
};

export type EndToEndCodingTaskFindingKind =
  | "raw_field"
  | "secret"
  | "execution_claim"
  | "stage"
  | "readiness";

export type EndToEndCodingTaskFindingSeverity = "blocker" | "warning";

export type EndToEndCodingTaskFinding = {
  findingId: string;
  kind: EndToEndCodingTaskFindingKind;
  severity: EndToEndCodingTaskFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type EndToEndCodingTaskSummaryRef = {
  refId?: string | undefined;
  status?: string | undefined;
  summary?: string | undefined;
  warningCodes?: string[] | undefined;
  blockerCodes?: string[] | undefined;
  blockerCount?: number | undefined;
  warningCount?: number | undefined;
  readiness?: Record<string, unknown> | undefined;
  [key: string]: unknown;
};

export type EndToEndCodingTaskOrchestratorInput = {
  objectiveSummary?: string | undefined;
  taskRunId?: string | undefined;
  liveProposalGenerationSummary?: EndToEndCodingTaskSummaryRef | undefined;
  modelProposalImportSummary?: EndToEndCodingTaskSummaryRef | undefined;
  chainIntegrationSummary?: EndToEndCodingTaskSummaryRef | undefined;
  validationAuditApprovalSummary?: EndToEndCodingTaskSummaryRef | undefined;
  approvalReceiptSummary?: EndToEndCodingTaskSummaryRef | undefined;
  applyResultSummary?: EndToEndCodingTaskSummaryRef | undefined;
  verificationResultSummary?: EndToEndCodingTaskSummaryRef | undefined;
  rollbackResultSummary?: EndToEndCodingTaskSummaryRef | undefined;
  replaySummary?: EndToEndCodingTaskSummaryRef | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type EndToEndCodingTaskOrchestratorReadiness = {
  canAdvanceStateMachine: boolean;
  canCallLiveModel: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canAutoApply: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type EndToEndCodingTaskOrchestratorView = {
  taskRunId: string;
  state: EndToEndCodingTaskState;
  completedStageCount: number;
  missingStageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  stageTimeline: EndToEndCodingTaskStage[];
  findings: EndToEndCodingTaskFinding[];
  orchestratorHash: string;
  readiness: EndToEndCodingTaskOrchestratorReadiness;
  nextAction: string;
  source: "runtime_e2e_coding_task_orchestrator";
};

const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authHeaderField = ["Author", "ization"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    rawPrefix + "Response",
    reasoningSnakeField,
    apiKeyField,
    authHeaderField,
    rawPrefix + "Source",
    rawPrefix + "Diff",
    "preimageContent",
    "fileContent",
    "eventPayloadRawContent",
    "rawEventPayload"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "autoApply",
    "canAutoApply",
    "appCanAutoApply",
    "appCanExecute",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "arbitraryGit",
    "arbitraryShell",
    "allowArbitraryGit",
    "allowArbitraryShell"
  ].map((field) => field.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

const orderedStageDefinitions = [
  ["objective", "objective_ready"],
  ["live_proposal_generation", "proposal_generated"],
  ["model_proposal_import", "proposal_imported"],
  ["chain_integration", "proposal_validated"],
  ["validation_audit_approval", "approval_ready"],
  ["approval_receipt", "approved"],
  ["approved_apply", "applied"],
  ["verification", "verification_passed"],
  ["rollback", "rolled_back"],
  ["replay", "completed"]
] as const satisfies ReadonlyArray<
  readonly [EndToEndCodingTaskStageKind, EndToEndCodingTaskState]
>;

export function buildEndToEndCodingTaskOrchestrator(
  input: EndToEndCodingTaskOrchestratorInput = {}
): EndToEndCodingTaskOrchestratorView {
  const taskRunId =
    input.taskRunId ?? input.idGenerator?.() ?? "e2e-task-run-preview";
  const findings = [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input)
  ];
  const stageTimeline = buildStageTimeline(input, findings);
  const stageFindings = stageTimeline.flatMap((stage) =>
    stage.blockerCodes.map((code) =>
      finding("stage", "blocker", code, stage.kind)
    )
  );
  findings.push(...stageFindings);

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount =
    findings.filter((finding) => finding.severity === "warning").length +
    stageTimeline.filter((stage) => stage.status === "warning").length;
  const state =
    blockerCount > 0 ? "blocked" : deriveState(input, stageTimeline);
  const completedStageCount = stageTimeline.filter(
    (stage) => stage.status === "completed" || stage.status === "warning"
  ).length;
  const missingStageCount = stageTimeline.filter(
    (stage) => stage.status === "missing"
  ).length;
  const orchestratorHash = stablePreviewHash(
    stableStringify({
      taskRunId,
      state,
      completedStageCount,
      missingStageCount,
      stages: stageTimeline.map((stage) => ({
        kind: stage.kind,
        status: stage.status,
        refId: stage.refId,
        warningCodes: stage.warningCodes,
        blockerCodes: stage.blockerCodes
      })),
      findingCodes: findings.map((finding) => finding.code)
    })
  );

  return {
    taskRunId,
    state,
    completedStageCount,
    missingStageCount,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    stageTimeline,
    findings,
    orchestratorHash,
    readiness: {
      canAdvanceStateMachine: state !== "blocked",
      canCallLiveModel: false,
      canReadApiKey: false,
      canFetchNetwork: false,
      canAutoApply: false,
      canApplyPatch: false,
      canRollback: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionForState(state),
    source: "runtime_e2e_coding_task_orchestrator"
  };
}

export function summarizeEndToEndCodingTaskOrchestrator(
  view: EndToEndCodingTaskOrchestratorView
): Pick<
  EndToEndCodingTaskOrchestratorView,
  | "taskRunId"
  | "state"
  | "completedStageCount"
  | "missingStageCount"
  | "blockerCount"
  | "warningCount"
  | "orchestratorHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    taskRunId: view.taskRunId,
    state: view.state,
    completedStageCount: view.completedStageCount,
    missingStageCount: view.missingStageCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    orchestratorHash: view.orchestratorHash,
    readiness: view.readiness,
    nextAction: view.nextAction,
    source: view.source
  };
}

function buildStageTimeline(
  input: EndToEndCodingTaskOrchestratorInput,
  findings: EndToEndCodingTaskFinding[]
): EndToEndCodingTaskStage[] {
  return orderedStageDefinitions.map(([kind, stateAfter]) => {
    const summary = summaryForKind(input, kind);
    const present =
      kind === "objective"
        ? safeString(input.objectiveSummary) !== ""
        : summary !== undefined;
    if (!present) {
      return {
        kind,
        status: "missing",
        stateAfter,
        warningCodes: [],
        blockerCodes: []
      };
    }
    if (kind === "verification" && isVerificationFailed(summary)) {
      return stageFromSummary(kind, summary, "warning", "verification_failed");
    }
    const status = statusForSummary(summary);
    if (status === "blocked") {
      findings.push(finding("stage", "blocker", "STAGE_SUMMARY_BLOCKED", kind));
    }
    return stageFromSummary(kind, summary, status, stateAfter);
  });
}

function deriveState(
  input: EndToEndCodingTaskOrchestratorInput,
  stages: EndToEndCodingTaskStage[]
): EndToEndCodingTaskState {
  const verification = summaryForKind(input, "verification");
  if (isVerificationFailed(verification)) {
    return summaryForKind(input, "rollback") !== undefined
      ? "rolled_back"
      : "rollback_ready";
  }
  const replay = summaryForKind(input, "replay");
  if (
    statusForSummary(replay) !== "missing" &&
    allRequiredBeforeReplay(stages)
  ) {
    return "completed";
  }
  const lastCompleted = [...stages]
    .reverse()
    .find(
      (stage) => stage.status === "completed" || stage.status === "warning"
    );
  return lastCompleted?.stateAfter ?? "empty";
}

function allRequiredBeforeReplay(stages: EndToEndCodingTaskStage[]): boolean {
  return stages
    .filter((stage) => stage.kind !== "rollback")
    .filter((stage) => stage.kind !== "replay")
    .every(
      (stage) => stage.status === "completed" || stage.status === "warning"
    );
}

function stageFromSummary(
  kind: EndToEndCodingTaskStageKind,
  summary: EndToEndCodingTaskSummaryRef | undefined,
  status: EndToEndCodingTaskStageStatus,
  stateAfter: EndToEndCodingTaskState
): EndToEndCodingTaskStage {
  return {
    kind,
    status,
    refId: safeString(summary?.refId) || undefined,
    stateAfter,
    warningCodes: stringArray(summary?.warningCodes),
    blockerCodes: stringArray(summary?.blockerCodes)
  };
}

function summaryForKind(
  input: EndToEndCodingTaskOrchestratorInput,
  kind: EndToEndCodingTaskStageKind
): EndToEndCodingTaskSummaryRef | undefined {
  switch (kind) {
    case "objective":
      return safeString(input.objectiveSummary) === ""
        ? undefined
        : { refId: "objective", status: "ready" };
    case "live_proposal_generation":
      return input.liveProposalGenerationSummary;
    case "model_proposal_import":
      return input.modelProposalImportSummary;
    case "chain_integration":
      return input.chainIntegrationSummary;
    case "validation_audit_approval":
      return input.validationAuditApprovalSummary;
    case "approval_receipt":
      return input.approvalReceiptSummary;
    case "approved_apply":
      return input.applyResultSummary;
    case "verification":
      return input.verificationResultSummary;
    case "rollback":
      return input.rollbackResultSummary;
    case "replay":
      return input.replaySummary;
  }
}

function statusForSummary(
  summary: EndToEndCodingTaskSummaryRef | undefined
): EndToEndCodingTaskStageStatus {
  if (summary === undefined) {
    return "missing";
  }
  const status = safeString(summary.status).toLowerCase();
  if (status.includes("blocked") || (summary.blockerCount ?? 0) > 0) {
    return "blocked";
  }
  if (status.includes("warning") || (summary.warningCount ?? 0) > 0) {
    return "warning";
  }
  return "completed";
}

function isVerificationFailed(
  summary: EndToEndCodingTaskSummaryRef | undefined
): boolean {
  if (summary === undefined) {
    return false;
  }
  const text = [
    summary.status,
    summary.summary,
    ...stringArray(summary.warningCodes),
    ...stringArray(summary.blockerCodes)
  ]
    .join(" ")
    .toLowerCase();
  return text.includes("verification_failed") || text.includes("failed");
}

function findForbiddenFields(
  value: unknown,
  path = "$"
): EndToEndCodingTaskFinding[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenFields(item, `${path}[${index}]`)
    );
  }
  if (!isRecord(value)) {
    return [];
  }
  const findings: EndToEndCodingTaskFinding[] = [];
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalized)) {
      findings.push(
        finding(
          "raw_field",
          "blocker",
          forbiddenCodeForKey(key),
          `${path}.${key}`
        )
      );
    }
    if (executionClaimKeys.has(normalized) && child === true) {
      findings.push(
        finding(
          "execution_claim",
          "blocker",
          "EXECUTION_CLAIM_TRUE",
          `${path}.${key}`
        )
      );
    }
    findings.push(...findForbiddenFields(child, `${path}.${key}`));
  }
  return findings;
}

function findUnsafeStringMarkers(
  value: unknown,
  path = "$"
): EndToEndCodingTaskFinding[] {
  if (typeof value === "string") {
    return unsafeTextPatterns
      .filter(({ pattern }) => pattern.test(value))
      .map(({ code }) => finding("secret", "blocker", code, path));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findUnsafeStringMarkers(item, `${path}[${index}]`)
    );
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    findUnsafeStringMarkers(child, `${path}.${key}`)
  );
}

function forbiddenCodeForKey(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.includes("prompt")) {
    return "RAW_PROMPT_FIELD_REJECTED";
  }
  if (normalized.includes("response")) {
    return "RAW_RESPONSE_FIELD_REJECTED";
  }
  if (normalized.includes("reasoning")) {
    return "REASONING_CONTENT_FIELD_REJECTED";
  }
  if (normalized.includes("source")) {
    return "RAW_SOURCE_FIELD_REJECTED";
  }
  if (normalized.includes("diff")) {
    return "RAW_DIFF_FIELD_REJECTED";
  }
  if (normalized.includes("preimage") || normalized.includes("filecontent")) {
    return "RAW_PREIMAGE_FIELD_REJECTED";
  }
  if (normalized.includes("key") || normalized.includes("authorization")) {
    return "API_KEY_FIELD_REJECTED";
  }
  return "RAW_EVENT_PAYLOAD_FIELD_REJECTED";
}

function finding(
  kind: EndToEndCodingTaskFindingKind,
  severity: EndToEndCodingTaskFindingSeverity,
  code: string,
  path?: string
): EndToEndCodingTaskFinding {
  return {
    findingId: `${severity}:${kind}:${code}:${path ?? "$"}`,
    kind,
    severity,
    code,
    safeMessage: safeMessageForCode(code),
    path
  };
}

function safeMessageForCode(code: string): string {
  const messages: Record<string, string> = {
    RAW_PROMPT_FIELD_REJECTED: "Raw prompt fields are not allowed.",
    RAW_RESPONSE_FIELD_REJECTED: "Raw response fields are not allowed.",
    REASONING_CONTENT_FIELD_REJECTED:
      "Reasoning content fields are not allowed.",
    RAW_SOURCE_FIELD_REJECTED: "Raw source fields are not allowed.",
    RAW_DIFF_FIELD_REJECTED: "Raw diff fields are not allowed.",
    RAW_PREIMAGE_FIELD_REJECTED:
      "Raw source, file, or checkpoint preimage fields are not allowed.",
    API_KEY_FIELD_REJECTED: "API key fields are not allowed.",
    RAW_EVENT_PAYLOAD_FIELD_REJECTED:
      "Raw event payload fields are not allowed.",
    EXECUTION_CLAIM_TRUE: "Execution claims must remain false.",
    STAGE_SUMMARY_BLOCKED: "A stage summary reported a blocker.",
    API_KEY_MARKER: "API key-like marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token-like marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected."
  };
  return messages[code] ?? "End-to-end task summary failed a safety check.";
}

function nextActionForState(state: EndToEndCodingTaskState): string {
  const nextActions: Record<EndToEndCodingTaskState, string> = {
    empty: "Provide an objective summary.",
    objective_ready: "Request a live proposal through the gated App flow.",
    proposal_requested: "Wait for proposal generation summary.",
    proposal_generated:
      "Import proposal into the model proposal preview chain.",
    proposal_imported: "Run chain integration and validation summaries.",
    proposal_validated: "Prepare approval draft.",
    approval_ready:
      "Collect human approval receipt and exact typed confirmation.",
    approved: "Run approved apply through existing execution gates.",
    applied: "Run fixed Git/shell verification safe lanes.",
    verification_requested: "Wait for verification summary.",
    verification_passed: "Record replay summary and complete the task.",
    verification_failed: "Prepare rollback from checkpoint.",
    rollback_ready: "Collect rollback confirmation and run approved rollback.",
    rolled_back: "Record rollback replay summary.",
    completed: "Task is complete and replayable.",
    blocked: "Resolve blockers before advancing the state machine."
  };
  return nextActions[state];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter((item): item is string => typeof item === "string")
        )
      ]
    : [];
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortForStableHash(value));
}

function sortForStableHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForStableHash);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortForStableHash(child)])
    );
  }
  return value;
}
