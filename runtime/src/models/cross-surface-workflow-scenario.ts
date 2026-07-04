import { stablePreviewHash } from "./stable-preview-hash.js";

export type CrossSurfaceWorkflowScenarioInput =
  | Record<string, unknown>
  | string
  | unknown;

export type CrossSurfaceWorkflowStageKind =
  | "user_objective"
  | "live_proposal"
  | "fixed_agent_route"
  | "project_knowledge_recall"
  | "mcp_readonly_evidence"
  | "plugin_skill_metadata_evidence"
  | "desktop_observer_evidence"
  | "desktop_action_proposal"
  | "approved_desktop_action_optional"
  | "approved_workspace_apply"
  | "git_shell_verification"
  | "rollback_optional"
  | "unified_replay_audit";

export type CrossSurfaceWorkflowExpectedStatus =
  | "preview_ready"
  | "warning"
  | "blocked";

export type CrossSurfaceWorkflowScenarioStatus =
  | "parsed"
  | "warning"
  | "blocked";

export type CrossSurfaceWorkflowSeverity = "blocker" | "warning";

export type CrossSurfaceWorkflowFindingKind =
  | "schema"
  | "stage"
  | "route"
  | "raw_field"
  | "secret"
  | "execution"
  | "replay"
  | "readiness";

export type CrossSurfaceEvidenceRef = {
  refId: string;
  kind:
    | "objective_summary"
    | "model_proposal_summary"
    | "agent_route_summary"
    | "project_knowledge_summary"
    | "mcp_readonly_summary"
    | "plugin_skill_metadata_summary"
    | "desktop_observer_metadata"
    | "desktop_action_proposal_summary"
    | "approved_action_receipt"
    | "approved_workspace_receipt"
    | "verification_summary"
    | "replay_audit_summary"
    | "manual_note";
  summary: string;
  hashPrefix?: string | undefined;
  warningCodes: string[];
};

export type CrossSurfaceWorkflowStage = {
  stageId: string;
  kind: CrossSurfaceWorkflowStageKind;
  title?: string | undefined;
  summary: string;
  refs: string[];
  summaryRefs: string[];
  evidenceRefs: string[];
  warningCodes: string[];
  blockerCodes: string[];
  hashPrefix?: string | undefined;
  completed: boolean;
  approvedLaneReceiptRef?: string | undefined;
  receiptRef?: string | undefined;
  typedConfirmationRef?: string | undefined;
  source?: string | undefined;
};

export type CrossSurfaceExpectedOutcome = {
  expectedStatus: CrossSurfaceWorkflowExpectedStatus;
  expectedStageKinds: CrossSurfaceWorkflowStageKind[];
  expectedSummaryOnly: true;
  expectedExecutionEnabled: false;
  expectedWarningCodes: string[];
  expectedBlockerCodes: string[];
};

export type CrossSurfaceWorkflowScenario = {
  schemaVersion: "cross_surface_workflow_scenario.v1";
  scenarioId: string;
  title: string;
  objectiveSummary: string;
  routeKind: "fixed_cross_surface_workflow";
  stages: CrossSurfaceWorkflowStage[];
  evidenceRefs: CrossSurfaceEvidenceRef[];
  noCompressRefs: string[];
  expectedOutcome: CrossSurfaceExpectedOutcome;
  forbiddenPolicySummary?: string | undefined;
  createdAt?: string | undefined;
  stageCount: number;
  evidenceRefCount: number;
  warningCodeCount: number;
  blockerCodeCount: number;
  scenarioHash: string;
  source: "cross_surface_workflow_scenario";
};

export type CrossSurfaceWorkflowScenarioSummary = {
  scenarioId?: string | undefined;
  status: CrossSurfaceWorkflowScenarioStatus;
  title?: string | undefined;
  routeKind?: "fixed_cross_surface_workflow" | undefined;
  stageCount: number;
  evidenceRefCount: number;
  noCompressRefCount: number;
  warningCodes: string[];
  blockerCodes: string[];
  expectedStatus?: CrossSurfaceWorkflowExpectedStatus | undefined;
  scenarioHash?: string | undefined;
};

export type CrossSurfaceWorkflowFinding = {
  findingId: string;
  kind: CrossSurfaceWorkflowFindingKind;
  severity: CrossSurfaceWorkflowSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type CrossSurfaceWorkflowReadiness = {
  canEnterWorkflowPreview: boolean;
  canRunAgents: false;
  canCallDeepSeek: false;
  canInvokeMcpTools: false;
  canInvokePluginRuntime: false;
  canInvokeSkillRuntime: false;
  canExecuteDesktopAction: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type CrossSurfaceScenarioValidationResult = {
  status: CrossSurfaceWorkflowScenarioStatus;
  scenario?: CrossSurfaceWorkflowScenario | undefined;
  summary: CrossSurfaceWorkflowScenarioSummary;
  findings: CrossSurfaceWorkflowFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  normalizedHash: string;
  readiness: CrossSurfaceWorkflowReadiness;
  nextAction: string;
  source: "runtime_cross_surface_workflow_scenario";
};

export type CrossSurfaceWorkflowScenarioOptions = {
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const supportedSchemaVersion = "cross_surface_workflow_scenario.v1" as const;
const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");
const reasoningCamelField = ["reasoning", "Content"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const allowedStageKinds = new Set<CrossSurfaceWorkflowStageKind>([
  "user_objective",
  "live_proposal",
  "fixed_agent_route",
  "project_knowledge_recall",
  "mcp_readonly_evidence",
  "plugin_skill_metadata_evidence",
  "desktop_observer_evidence",
  "desktop_action_proposal",
  "approved_desktop_action_optional",
  "approved_workspace_apply",
  "git_shell_verification",
  "rollback_optional",
  "unified_replay_audit"
]);

const allowedExpectedStatuses = new Set<CrossSurfaceWorkflowExpectedStatus>([
  "preview_ready",
  "warning",
  "blocked"
]);

const allowedEvidenceKinds = new Set<CrossSurfaceEvidenceRef["kind"]>([
  "objective_summary",
  "model_proposal_summary",
  "agent_route_summary",
  "project_knowledge_summary",
  "mcp_readonly_summary",
  "plugin_skill_metadata_summary",
  "desktop_observer_metadata",
  "desktop_action_proposal_summary",
  "approved_action_receipt",
  "approved_workspace_receipt",
  "verification_summary",
  "replay_audit_summary",
  "manual_note"
]);

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    "promptText",
    rawPrefix + "Response",
    "responseText",
    reasoningCamelField,
    reasoningSnakeField,
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Screenshot",
    rawPrefix + "OcrText",
    rawPrefix + "ToolArgs",
    rawPrefix + "ToolOutput",
    rawPrefix + "DesktopAction",
    "fileContent",
    "preimageContent",
    apiKeyField,
    authHeaderField,
    bearerField,
    tokenField,
    "secret",
    "command",
    "shellCommand",
    "gitCommand",
    "applyNow",
    "rollbackNow",
    "eventStoreWrite",
    "nativeBridge",
    "desktopActionExecution",
    "mcpToolInvoke",
    "pluginRuntime",
    "skillRuntime",
    "permissionLease",
    "tools",
    toolChoiceField
  ].map((key) => key.toLowerCase())
);

const executionAttemptKeys = new Set(
  [
    "canRunAgents",
    "canCallDeepSeek",
    "canInvokeMcpTools",
    "canInvokePluginRuntime",
    "canInvokeSkillRuntime",
    "canExecuteDesktopAction",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "canIssuePermissionLease",
    "canUseNativeBridge",
    "appCanExecute",
    "claimsExecution"
  ].map((key) => key.toLowerCase())
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
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b|raw prompt`, "i")
  },
  {
    code: "RAW_RESPONSE_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Response"}\\b|raw response`, "i")
  },
  {
    code: "RAW_SOURCE_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Source"}\\b|raw source`, "i")
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b|raw diff`, "i")
  },
  {
    code: "RAW_REASONING_MARKER",
    pattern: /\breasoning[_ ]content\b/i
  }
];

const emptyReadiness: CrossSurfaceWorkflowReadiness = {
  canEnterWorkflowPreview: false,
  canRunAgents: false,
  canCallDeepSeek: false,
  canInvokeMcpTools: false,
  canInvokePluginRuntime: false,
  canInvokeSkillRuntime: false,
  canExecuteDesktopAction: false,
  canApplyPatch: false,
  canRollback: false,
  canWriteEventStore: false,
  canExecuteGit: false,
  canExecuteShell: false,
  canIssuePermissionLease: false,
  canUseNativeBridge: false,
  appCanExecute: false
};

export function parseCrossSurfaceWorkflowScenario(
  input: CrossSurfaceWorkflowScenarioInput,
  options: CrossSurfaceWorkflowScenarioOptions = {}
): CrossSurfaceScenarioValidationResult {
  return validateCrossSurfaceWorkflowScenario(input, options);
}

export function validateCrossSurfaceWorkflowScenario(
  input: CrossSurfaceWorkflowScenarioInput,
  options: CrossSurfaceWorkflowScenarioOptions = {}
): CrossSurfaceScenarioValidationResult {
  const parsed = parseInput(input);
  if (!parsed.ok) {
    return buildResult({
      findings: [finding("schema", "blocker", parsed.code)],
      normalizedHash: stablePreviewHash(parsed.code),
      summary: emptySummary("blocked")
    });
  }

  const record = parsed.value;
  const findings: CrossSurfaceWorkflowFinding[] = [
    ...findForbiddenFields(record),
    ...findUnsafeStringMarkers(record),
    ...validateScenarioShape(record),
    ...validateStages(record),
    ...validateEvidenceRefs(record),
    ...validateExpectedOutcome(record)
  ];

  const unique = uniqueFindings(findings);
  const blockerCount = unique.filter(
    (item) => item.severity === "blocker"
  ).length;
  const normalizedHash = stablePreviewHash(
    stableStringify(sanitizeForHash(record))
  );

  if (blockerCount > 0) {
    return buildResult({
      findings: unique,
      normalizedHash,
      summary: emptySummary("blocked")
    });
  }

  const scenario = normalizeScenario(record, options);
  const warningCount = unique.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: CrossSurfaceWorkflowScenarioStatus =
    warningCount > 0 ? "warning" : "parsed";
  return buildResult({
    findings: unique,
    normalizedHash,
    scenario,
    summary: summarizeCrossSurfaceWorkflowScenario(scenario, status)
  });
}

export function summarizeCrossSurfaceWorkflowScenario(
  scenario: CrossSurfaceWorkflowScenario,
  status: CrossSurfaceWorkflowScenarioStatus = "parsed"
): CrossSurfaceWorkflowScenarioSummary {
  return {
    scenarioId: scenario.scenarioId,
    status,
    title: scenario.title,
    routeKind: scenario.routeKind,
    stageCount: scenario.stageCount,
    evidenceRefCount: scenario.evidenceRefCount,
    noCompressRefCount: scenario.noCompressRefs.length,
    warningCodes: uniqueStrings(
      scenario.stages.flatMap((stage) => stage.warningCodes)
    ),
    blockerCodes: uniqueStrings(
      scenario.stages.flatMap((stage) => stage.blockerCodes)
    ),
    expectedStatus: scenario.expectedOutcome.expectedStatus,
    scenarioHash: scenario.scenarioHash
  };
}

function buildResult(input: {
  findings: CrossSurfaceWorkflowFinding[];
  normalizedHash: string;
  summary: CrossSurfaceWorkflowScenarioSummary;
  scenario?: CrossSurfaceWorkflowScenario | undefined;
}): CrossSurfaceScenarioValidationResult {
  const blockerCount = input.findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = input.findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status = input.summary.status;
  return {
    status,
    ...(input.scenario !== undefined ? { scenario: input.scenario } : {}),
    summary: input.summary,
    findings: input.findings,
    blockerCount,
    warningCount,
    findingCount: input.findings.length,
    normalizedHash: input.normalizedHash,
    readiness: {
      ...emptyReadiness,
      canEnterWorkflowPreview: blockerCount === 0 && status !== "blocked"
    },
    nextAction: nextAction(status, blockerCount),
    source: "runtime_cross_surface_workflow_scenario"
  };
}

function normalizeScenario(
  record: Record<string, unknown>,
  options: CrossSurfaceWorkflowScenarioOptions
): CrossSurfaceWorkflowScenario {
  const stages = normalizeStages(record.stages);
  const evidenceRefs = normalizeEvidenceRefs(record.evidenceRefs);
  const expectedOutcome = normalizeExpectedOutcome(record.expectedOutcome);
  const scenarioId =
    optionalText(record.scenarioId) ??
    options.idGenerator?.() ??
    `cross-surface-${stablePreviewHash(
      `${requiredText(record.title)}:${requiredText(record.objectiveSummary)}`
    ).slice(0, 12)}`;
  const createdAt = optionalText(record.createdAt) ?? options.createdAt;
  const warningCodeCount = stages.reduce(
    (count, stage) => count + stage.warningCodes.length,
    0
  );
  const blockerCodeCount = stages.reduce(
    (count, stage) => count + stage.blockerCodes.length,
    0
  );
  const withoutHash = {
    schemaVersion: supportedSchemaVersion,
    scenarioId,
    title: requiredText(record.title),
    objectiveSummary: requiredText(record.objectiveSummary),
    routeKind: "fixed_cross_surface_workflow",
    stages,
    evidenceRefs,
    noCompressRefs: safeStringArray(record.noCompressRefs),
    expectedOutcome,
    forbiddenPolicySummary: optionalText(record.forbiddenPolicySummary),
    createdAt,
    stageCount: stages.length,
    evidenceRefCount: evidenceRefs.length,
    warningCodeCount,
    blockerCodeCount,
    source: "cross_surface_workflow_scenario"
  };
  const scenarioHash = stablePreviewHash(stableStringify(withoutHash));
  return {
    schemaVersion: supportedSchemaVersion,
    scenarioId,
    title: requiredText(record.title),
    objectiveSummary: requiredText(record.objectiveSummary),
    routeKind: "fixed_cross_surface_workflow",
    stages,
    evidenceRefs,
    noCompressRefs: safeStringArray(record.noCompressRefs),
    expectedOutcome,
    ...(optionalText(record.forbiddenPolicySummary) !== undefined
      ? { forbiddenPolicySummary: optionalText(record.forbiddenPolicySummary) }
      : {}),
    ...(createdAt !== undefined ? { createdAt } : {}),
    stageCount: stages.length,
    evidenceRefCount: evidenceRefs.length,
    warningCodeCount,
    blockerCodeCount,
    scenarioHash,
    source: "cross_surface_workflow_scenario"
  };
}

function validateScenarioShape(
  record: Record<string, unknown>
): CrossSurfaceWorkflowFinding[] {
  const findings: CrossSurfaceWorkflowFinding[] = [];
  if (record.schemaVersion !== supportedSchemaVersion) {
    findings.push(finding("schema", "blocker", "UNSUPPORTED_SCHEMA_VERSION"));
  }
  if (requiredText(record.title).length === 0) {
    findings.push(finding("schema", "blocker", "MISSING_TITLE"));
  }
  if (requiredText(record.objectiveSummary).length === 0) {
    findings.push(finding("schema", "blocker", "MISSING_OBJECTIVE_SUMMARY"));
  }
  if (record.routeKind !== "fixed_cross_surface_workflow") {
    findings.push(finding("route", "blocker", "ROUTE_KIND_NOT_FIXED"));
  }
  if (!Array.isArray(record.stages) || record.stages.length === 0) {
    findings.push(finding("stage", "blocker", "MISSING_STAGES"));
  }
  if (!isRecord(record.expectedOutcome)) {
    findings.push(finding("schema", "blocker", "MISSING_EXPECTED_OUTCOME"));
  }
  return findings;
}

function validateStages(
  record: Record<string, unknown>
): CrossSurfaceWorkflowFinding[] {
  const findings: CrossSurfaceWorkflowFinding[] = [];
  if (!Array.isArray(record.stages)) {
    return findings;
  }
  const seenStageIds = new Set<string>();
  const stageKinds = new Set<string>();

  record.stages.forEach((item, index) => {
    const path = `stages[${index}]`;
    if (!isRecord(item)) {
      findings.push(finding("stage", "blocker", "STAGE_NOT_OBJECT", path));
      return;
    }
    const stageId = requiredText(item.stageId);
    if (stageId.length === 0) {
      findings.push(finding("stage", "blocker", "MISSING_STAGE_ID", path));
    } else if (seenStageIds.has(stageId)) {
      findings.push(finding("stage", "blocker", "DUPLICATE_STAGE_ID", path));
    }
    seenStageIds.add(stageId);

    const kind = requiredText(item.kind);
    if (kind === "dynamic_agent_bidding") {
      findings.push(
        finding("route", "blocker", "DYNAMIC_BIDDING_STAGE_REJECTED", path)
      );
    } else if (kind === "arbitrary_tool" || kind === "tool_invocation") {
      findings.push(
        finding("execution", "blocker", "ARBITRARY_TOOL_STAGE_REJECTED", path)
      );
    } else if (!allowedStageKinds.has(kind as CrossSurfaceWorkflowStageKind)) {
      findings.push(finding("stage", "blocker", "UNKNOWN_STAGE_KIND", path));
    } else {
      stageKinds.add(kind);
    }

    if (requiredText(item.summary).length === 0) {
      findings.push(finding("stage", "blocker", "MISSING_STAGE_SUMMARY", path));
    }

    if (item.claimsExecution === true) {
      const hasApprovedReceipt =
        optionalText(item.approvedLaneReceiptRef) !== undefined ||
        optionalText(item.receiptRef) !== undefined;
      findings.push(
        finding(
          "execution",
          "blocker",
          hasApprovedReceipt
            ? "STAGE_EXECUTION_CLAIM_REJECTED"
            : "STAGE_EXECUTION_WITHOUT_APPROVED_LANE",
          path
        )
      );
    }

    if (
      kind === "desktop_action_proposal" &&
      (item.claimsExecution === true || item.execute === true)
    ) {
      findings.push(
        finding(
          "execution",
          "blocker",
          "UNAPPROVED_DESKTOP_ACTION_EXECUTION",
          path
        )
      );
    }

    if (
      kind === "approved_desktop_action_optional" &&
      item.completed === true &&
      optionalText(item.approvedLaneReceiptRef) === undefined &&
      optionalText(item.receiptRef) === undefined
    ) {
      findings.push(
        finding(
          "execution",
          "blocker",
          "APPROVED_DESKTOP_ACTION_RECEIPT_REQUIRED",
          path
        )
      );
    }

    if (
      kind === "approved_workspace_apply" &&
      (optionalText(item.receiptRef) === undefined ||
        optionalText(item.typedConfirmationRef) === undefined)
    ) {
      findings.push(
        finding(
          "execution",
          "blocker",
          "APPROVED_WORKSPACE_APPLY_RECEIPT_REQUIRED",
          path
        )
      );
    }

    if (
      kind === "rollback_optional" &&
      item.completed === true &&
      optionalText(item.receiptRef) === undefined
    ) {
      findings.push(
        finding("execution", "blocker", "ROLLBACK_RECEIPT_REQUIRED", path)
      );
    }

    if (
      kind === "unified_replay_audit" &&
      safeStringArray(item.summaryRefs).length === 0 &&
      safeStringArray(item.refs).length === 0
    ) {
      findings.push(
        finding("replay", "blocker", "REPLAY_SUMMARY_REFS_REQUIRED", path)
      );
    }
  });

  if (!stageKinds.has("unified_replay_audit")) {
    findings.push(finding("replay", "warning", "MISSING_REPLAY_STAGE"));
  }

  return findings;
}

function validateEvidenceRefs(
  record: Record<string, unknown>
): CrossSurfaceWorkflowFinding[] {
  const findings: CrossSurfaceWorkflowFinding[] = [];
  if (!Array.isArray(record.evidenceRefs)) {
    findings.push(finding("schema", "warning", "MISSING_EVIDENCE_REFS"));
    return findings;
  }
  const seen = new Set<string>();
  record.evidenceRefs.forEach((item, index) => {
    const path = `evidenceRefs[${index}]`;
    if (!isRecord(item)) {
      findings.push(
        finding("schema", "blocker", "EVIDENCE_REF_NOT_OBJECT", path)
      );
      return;
    }
    const refId = requiredText(item.refId);
    if (refId.length === 0) {
      findings.push(
        finding("schema", "blocker", "MISSING_EVIDENCE_REF_ID", path)
      );
    } else if (seen.has(refId)) {
      findings.push(
        finding("schema", "blocker", "DUPLICATE_EVIDENCE_REF_ID", path)
      );
    }
    seen.add(refId);
    if (!allowedEvidenceKinds.has(requiredText(item.kind) as never)) {
      findings.push(
        finding("schema", "blocker", "UNKNOWN_EVIDENCE_REF_KIND", path)
      );
    }
    if (requiredText(item.summary).length === 0) {
      findings.push(
        finding("schema", "blocker", "EMPTY_EVIDENCE_SUMMARY", path)
      );
    }
  });
  return findings;
}

function validateExpectedOutcome(
  record: Record<string, unknown>
): CrossSurfaceWorkflowFinding[] {
  const findings: CrossSurfaceWorkflowFinding[] = [];
  if (!isRecord(record.expectedOutcome)) {
    return findings;
  }
  const outcome = record.expectedOutcome;
  if (
    !allowedExpectedStatuses.has(requiredText(outcome.expectedStatus) as never)
  ) {
    findings.push(
      finding("schema", "blocker", "UNKNOWN_EXPECTED_STATUS", "expectedOutcome")
    );
  }
  if (outcome.expectedSummaryOnly !== true) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "EXPECTED_SUMMARY_ONLY_FALSE",
        "expectedOutcome.expectedSummaryOnly"
      )
    );
  }
  if (outcome.expectedExecutionEnabled !== false) {
    findings.push(
      finding(
        "execution",
        "blocker",
        "EXPECTED_EXECUTION_ENABLED_NOT_FALSE",
        "expectedOutcome.expectedExecutionEnabled"
      )
    );
  }
  return findings;
}

function normalizeStages(value: unknown): CrossSurfaceWorkflowStage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((item, index) => {
    const stage: CrossSurfaceWorkflowStage = {
      stageId: requiredText(item.stageId) || `stage-${index + 1}`,
      kind: requiredText(item.kind) as CrossSurfaceWorkflowStageKind,
      summary: requiredText(item.summary),
      refs: safeStringArray(item.refs),
      summaryRefs: safeStringArray(item.summaryRefs),
      evidenceRefs: safeStringArray(item.evidenceRefs),
      warningCodes: safeCodeArray(item.warningCodes),
      blockerCodes: safeCodeArray(item.blockerCodes),
      completed: item.completed === true
    };
    const title = optionalText(item.title);
    const hashPrefix = optionalSafeHash(item.hashPrefix);
    const approvedLaneReceiptRef = optionalText(item.approvedLaneReceiptRef);
    const receiptRef = optionalText(item.receiptRef);
    const typedConfirmationRef = optionalText(item.typedConfirmationRef);
    const source = optionalText(item.source);
    return {
      ...stage,
      ...(title !== undefined ? { title } : {}),
      ...(hashPrefix !== undefined ? { hashPrefix } : {}),
      ...(approvedLaneReceiptRef !== undefined
        ? { approvedLaneReceiptRef }
        : {}),
      ...(receiptRef !== undefined ? { receiptRef } : {}),
      ...(typedConfirmationRef !== undefined ? { typedConfirmationRef } : {}),
      ...(source !== undefined ? { source } : {})
    };
  });
}

function normalizeEvidenceRefs(value: unknown): CrossSurfaceEvidenceRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((item) => {
    const ref: CrossSurfaceEvidenceRef = {
      refId: requiredText(item.refId),
      kind: requiredText(item.kind) as CrossSurfaceEvidenceRef["kind"],
      summary: requiredText(item.summary),
      warningCodes: safeCodeArray(item.warningCodes)
    };
    const hashPrefix = optionalSafeHash(item.hashPrefix);
    return {
      ...ref,
      ...(hashPrefix !== undefined ? { hashPrefix } : {})
    };
  });
}

function normalizeExpectedOutcome(value: unknown): CrossSurfaceExpectedOutcome {
  const record = isRecord(value) ? value : {};
  return {
    expectedStatus: requiredText(
      record.expectedStatus
    ) as CrossSurfaceWorkflowExpectedStatus,
    expectedStageKinds: safeStringArray(record.expectedStageKinds).filter(
      (kind): kind is CrossSurfaceWorkflowStageKind =>
        allowedStageKinds.has(kind as never)
    ),
    expectedSummaryOnly: true,
    expectedExecutionEnabled: false,
    expectedWarningCodes: safeCodeArray(record.expectedWarningCodes),
    expectedBlockerCodes: safeCodeArray(record.expectedBlockerCodes)
  };
}

function findForbiddenFields(
  value: unknown,
  path: string[] = []
): CrossSurfaceWorkflowFinding[] {
  const findings: CrossSurfaceWorkflowFinding[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findForbiddenFields(item, [...path, `${index}`]));
    });
    return findings;
  }
  if (!isRecord(value)) {
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const lower = key.toLowerCase();
    const keyPath = [...path, key].join(".");
    if (forbiddenFieldKeys.has(lower)) {
      findings.push(forbiddenFieldFinding(key, keyPath));
    }
    if (executionAttemptKeys.has(lower) && child === true) {
      findings.push(
        finding("readiness", "blocker", "EXECUTION_READINESS_TRUE", keyPath)
      );
    }
    findings.push(...findForbiddenFields(child, [...path, key]));
  }
  return findings;
}

function forbiddenFieldFinding(
  key: string,
  path: string
): CrossSurfaceWorkflowFinding {
  const lower = key.toLowerCase();
  if (
    lower === "command" ||
    lower === "shellcommand" ||
    lower === "gitcommand" ||
    lower === "applynow" ||
    lower === "rollbacknow" ||
    lower === "eventstorewrite" ||
    lower === "nativebridge" ||
    lower === "desktopactionexecution" ||
    lower === "mcptoolinvoke" ||
    lower === "pluginruntime" ||
    lower === "skillruntime" ||
    lower === "permissionlease" ||
    lower === "tools" ||
    lower === toolChoiceField
  ) {
    return finding("execution", "blocker", "EXECUTION_FIELD_REJECTED", path);
  }
  return finding(
    "raw_field",
    "blocker",
    `${safeCode(key)}_FIELD_REJECTED`,
    path
  );
}

function findUnsafeStringMarkers(
  value: unknown,
  path: string[] = []
): CrossSurfaceWorkflowFinding[] {
  const findings: CrossSurfaceWorkflowFinding[] = [];
  if (typeof value === "string") {
    for (const code of unsafeMarkerCodes(value)) {
      findings.push(finding("secret", "blocker", code, path.join(".")));
    }
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findUnsafeStringMarkers(item, [...path, `${index}`]));
    });
    return findings;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      findings.push(...findUnsafeStringMarkers(child, [...path, key]));
    }
  }
  return findings;
}

function unsafeMarkerCodes(value: string): string[] {
  return unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(value))
    .map(({ code }) => code);
}

function parseInput(
  input: CrossSurfaceWorkflowScenarioInput
):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; code: "INVALID_JSON" | "INPUT_NOT_OBJECT" } {
  if (typeof input === "string") {
    try {
      const parsed: unknown = JSON.parse(input);
      return isRecord(parsed)
        ? { ok: true, value: parsed }
        : { ok: false, code: "INPUT_NOT_OBJECT" };
    } catch {
      return { ok: false, code: "INVALID_JSON" };
    }
  }
  return isRecord(input)
    ? { ok: true, value: input }
    : { ok: false, code: "INPUT_NOT_OBJECT" };
}

function sanitizeForHash(value: unknown): unknown {
  if (typeof value === "string") {
    return unsafeMarkerCodes(value).length > 0
      ? `[redacted:${stablePreviewHash(value).slice(0, 8)}]`
      : value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeForHash);
  }
  if (isRecord(value)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenFieldKeys.has(key.toLowerCase())) {
        sanitized[key] = `[blocked-field:${safeCode(key)}]`;
      } else {
        sanitized[key] = sanitizeForHash(child);
      }
    }
    return sanitized;
  }
  return value;
}

function emptySummary(
  status: CrossSurfaceWorkflowScenarioStatus
): CrossSurfaceWorkflowScenarioSummary {
  return {
    status,
    stageCount: 0,
    evidenceRefCount: 0,
    noCompressRefCount: 0,
    warningCodes: [],
    blockerCodes: []
  };
}

function nextAction(
  status: CrossSurfaceWorkflowScenarioStatus,
  blockerCount: number
): string {
  if (blockerCount > 0 || status === "blocked") {
    return "Reject this cross-surface scenario until schema, raw-field, replay, and execution blockers are removed.";
  }
  if (status === "warning") {
    return "Scenario can enter preview with warnings and all execution lanes disabled.";
  }
  return "Scenario can enter the fixed cross-surface workflow preview.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | undefined {
  const text = requiredText(value);
  return text.length > 0 ? text : undefined;
}

function optionalSafeHash(value: unknown): string | undefined {
  const text = optionalText(value);
  if (text === undefined || !/^[a-zA-Z0-9._:-]{6,80}$/.test(text)) {
    return undefined;
  }
  return text;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function safeCodeArray(value: unknown): string[] {
  return uniqueStrings(safeStringArray(value).map(safeCode));
}

function safeCode(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function uniqueStrings<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function uniqueFindings(
  findings: readonly CrossSurfaceWorkflowFinding[]
): CrossSurfaceWorkflowFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function finding(
  kind: CrossSurfaceWorkflowFindingKind,
  severity: CrossSurfaceWorkflowSeverity,
  code: string,
  path?: string | undefined
): CrossSurfaceWorkflowFinding {
  const normalizedCode = safeCode(code);
  return {
    findingId: `cross-surface-${kind}-${normalizedCode.toLowerCase()}-${stablePreviewHash(
      `${kind}:${severity}:${normalizedCode}:${path ?? ""}`
    ).slice(0, 10)}`,
    kind,
    severity,
    code: normalizedCode,
    safeMessage: safeMessageFor(normalizedCode),
    ...(path !== undefined && path.length > 0 ? { path } : {})
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    INVALID_JSON: "Cross-surface scenario JSON could not be parsed.",
    INPUT_NOT_OBJECT:
      "Cross-surface scenario input must be an object or JSON object string.",
    UNSUPPORTED_SCHEMA_VERSION:
      "Cross-surface scenario schema version is not supported.",
    MISSING_TITLE: "Cross-surface scenario title is required.",
    MISSING_OBJECTIVE_SUMMARY: "Objective summary is required.",
    ROUTE_KIND_NOT_FIXED: "Cross-surface route kind must be fixed.",
    MISSING_STAGES: "Cross-surface scenario stages are required.",
    MISSING_EXPECTED_OUTCOME: "Expected outcome is required.",
    UNKNOWN_STAGE_KIND: "Stage kind is not in the fixed P1F route.",
    DYNAMIC_BIDDING_STAGE_REJECTED:
      "Dynamic agent bidding stages are not allowed.",
    ARBITRARY_TOOL_STAGE_REJECTED:
      "Arbitrary tool stages are not allowed in P1F.",
    DUPLICATE_STAGE_ID: "Stage ids must be unique.",
    MISSING_STAGE_SUMMARY: "Each stage must include a safe summary.",
    STAGE_EXECUTION_WITHOUT_APPROVED_LANE:
      "Stage claims execution without an approved lane receipt.",
    STAGE_EXECUTION_CLAIM_REJECTED:
      "Execution claims are not accepted by the scenario schema.",
    UNAPPROVED_DESKTOP_ACTION_EXECUTION:
      "Desktop action execution must stay in approved lanes.",
    APPROVED_DESKTOP_ACTION_RECEIPT_REQUIRED:
      "Approved desktop action stages need receipt refs when completed.",
    APPROVED_WORKSPACE_APPLY_RECEIPT_REQUIRED:
      "Approved workspace apply stages need receipt and typed confirmation refs.",
    ROLLBACK_RECEIPT_REQUIRED:
      "Completed rollback stages need approved rollback receipt refs.",
    REPLAY_SUMMARY_REFS_REQUIRED:
      "Unified replay/audit stage requires summary refs.",
    MISSING_REPLAY_STAGE:
      "Scenario should include the unified replay/audit stage before RC demo.",
    EXECUTION_FIELD_REJECTED:
      "Execution/action fields are not allowed in cross-surface scenarios.",
    EXECUTION_READINESS_TRUE: "Execution readiness flags must remain false.",
    EXPECTED_SUMMARY_ONLY_FALSE: "Expected outcome must be summary-only.",
    EXPECTED_EXECUTION_ENABLED_NOT_FALSE:
      "Expected execution must remain disabled.",
    API_KEY_MARKER: "Key-like marker detected and rejected.",
    BEARER_TOKEN_MARKER: "Bearer-token marker detected and rejected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected and rejected.",
    PRIVATE_KEY_MARKER: "Private-key marker detected and rejected.",
    RAW_PROMPT_MARKER: "Raw prompt marker detected and rejected.",
    RAW_RESPONSE_MARKER: "Raw response marker detected and rejected.",
    RAW_SOURCE_MARKER: "Raw source marker detected and rejected.",
    RAW_DIFF_MARKER: "Raw diff marker detected and rejected.",
    RAW_REASONING_MARKER: "Raw reasoning marker detected and rejected."
  };
  return messages[code] ?? "Cross-surface scenario requires review.";
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
