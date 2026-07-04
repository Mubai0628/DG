import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ReplayAuditCompletenessStatus =
  | "empty"
  | "complete"
  | "warning"
  | "blocked";

export type ReplayAuditCompletenessSeverity = "blocker" | "warning";

export type ReplayAuditCompletenessFinding = {
  findingId: string;
  severity: ReplayAuditCompletenessSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ReplayAuditEventKind =
  | "task_run_draft"
  | "model_proposal"
  | "repair_schema_validation"
  | "approval_receipt"
  | "apply_result"
  | "verification_result"
  | "rollback_checkpoint"
  | "rollback_result"
  | "mcp_evidence"
  | "mcp_tool_approval"
  | "mcp_tool_result"
  | "plugin_skill_evidence"
  | "desktop_observation"
  | "desktop_action_proposal"
  | "desktop_action_execution"
  | "agent_route_handoff"
  | "policy_enforcement"
  | "redaction_audit";

export type ReplayAuditEventInput = {
  eventId?: string | undefined;
  kind?: ReplayAuditEventKind | string | undefined;
  occurredAt?: string | undefined;
  status?: string | undefined;
  summary?: string | undefined;
  hashPrefix?: string | undefined;
  approvalRef?: string | undefined;
  checkpointRef?: string | undefined;
  observerEvidenceRef?: string | undefined;
  resultRef?: string | undefined;
  claimsExecution?: boolean | undefined;
  warningCodes?: string[] | undefined;
  blockerCodes?: string[] | undefined;
  readiness?: Record<string, unknown> | undefined;
  [key: string]: unknown;
};

export type ReplayAuditEventSummary = {
  eventId: string;
  kind: ReplayAuditEventKind;
  status: string;
  summaryHash: string;
  orderIndex: number;
  warningCodes: string[];
  blockerCodes: string[];
};

export type ReplayAuditCompletenessReadiness = {
  canRenderCompletenessReport: boolean;
  canReplayExecution: false;
  canRerunActions: false;
  canWriteEventStore: false;
  canShowRawContent: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteDesktopAction: false;
  canInvokeMcpTool: false;
  canExecutePluginRuntime: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ReplayAuditCompletenessInput = {
  events?: ReplayAuditEventInput[] | undefined;
  requiredKinds?: ReplayAuditEventKind[] | undefined;
  rollbackOccurred?: boolean | undefined;
  mcpReferenced?: boolean | undefined;
  pluginSkillReferenced?: boolean | undefined;
  desktopActionReferenced?: boolean | undefined;
  desktopActionOccurred?: boolean | undefined;
  sourceKind?: "runtime" | "app_preview" | "fixture" | "manual_test";
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  [key: string]: unknown;
};

export type ReplayAuditCompletenessReport = {
  status: ReplayAuditCompletenessStatus;
  completenessId: string;
  source: "runtime_replay_audit_completeness";
  sourceKind: "runtime" | "app_preview" | "fixture" | "manual_test";
  eventCount: number;
  requiredEventCount: number;
  presentRequiredEventCount: number;
  missingRequiredEventCount: number;
  outOfOrderCount: number;
  duplicateConflictCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  eventSummaries: ReplayAuditEventSummary[];
  missingRequiredKinds: ReplayAuditEventKind[];
  findings: ReplayAuditCompletenessFinding[];
  completenessHash: string;
  readiness: ReplayAuditCompletenessReadiness;
  nextAction: string;
};

const eventKinds: ReplayAuditEventKind[] = [
  "task_run_draft",
  "model_proposal",
  "repair_schema_validation",
  "approval_receipt",
  "apply_result",
  "verification_result",
  "rollback_checkpoint",
  "rollback_result",
  "mcp_evidence",
  "mcp_tool_approval",
  "mcp_tool_result",
  "plugin_skill_evidence",
  "desktop_observation",
  "desktop_action_proposal",
  "desktop_action_execution",
  "agent_route_handoff",
  "policy_enforcement",
  "redaction_audit"
];

const expectedOrder: ReplayAuditEventKind[] = [
  "task_run_draft",
  "model_proposal",
  "repair_schema_validation",
  "policy_enforcement",
  "approval_receipt",
  "mcp_tool_approval",
  "mcp_evidence",
  "mcp_tool_result",
  "plugin_skill_evidence",
  "desktop_observation",
  "desktop_action_proposal",
  "desktop_action_execution",
  "agent_route_handoff",
  "apply_result",
  "verification_result",
  "rollback_checkpoint",
  "rollback_result",
  "redaction_audit"
];

const baseRequiredKinds: ReplayAuditEventKind[] = [
  "task_run_draft",
  "model_proposal",
  "repair_schema_validation",
  "approval_receipt",
  "apply_result",
  "verification_result",
  "policy_enforcement",
  "redaction_audit"
];

const eventKindSet = new Set<string>(eventKinds);
const expectedOrderIndex = new Map(
  expectedOrder.map((kind, index) => [kind, index])
);

const emptyReadiness: ReplayAuditCompletenessReadiness = {
  canRenderCompletenessReport: false,
  canReplayExecution: false,
  canRerunActions: false,
  canWriteEventStore: false,
  canShowRawContent: false,
  canApplyPatch: false,
  canRollback: false,
  canExecuteDesktopAction: false,
  canInvokeMcpTool: false,
  canExecutePluginRuntime: false,
  canExecuteGit: false,
  canExecuteShell: false,
  appCanExecute: false
};

const forbiddenFieldKeys = new Set(
  [
    "raw" + "Content",
    "raw" + "Event",
    "raw" + "Prompt",
    "raw" + "Response",
    "raw" + "Source",
    "raw" + "Diff",
    "raw" + "Patch",
    "raw" + "Screenshot",
    "raw" + "Ocr",
    "raw" + "Stdout",
    "raw" + "Stderr",
    "stdout",
    "stderr",
    "fileContent",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "desktopActionExecute",
    "nativeBridge",
    "tools",
    "tool_choice"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "canReplayExecution",
    "canRerunActions",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canExecuteDesktopAction",
    "canInvokeMcpTool",
    "canExecutePluginRuntime",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "claimsExecution"
  ].map((field) => field.toLowerCase())
);

export function buildReplayAuditCompletenessReport(
  input: ReplayAuditCompletenessInput = {}
): ReplayAuditCompletenessReport {
  const completenessId =
    input.idGenerator?.() ??
    `replay-audit-completeness-${stablePreviewHash(
      stableStringify(input)
    ).slice(0, 12)}`;
  const findings = validateReplayAuditCompletenessInput(input);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const eventSummaries =
    blockerCount > 0 ? [] : normalizeEvents(input.events ?? []);
  const requiredKinds = requiredKindsFor(input);
  const presentKinds = new Set(eventSummaries.map((event) => event.kind));
  const missingRequiredKinds =
    blockerCount > 0
      ? []
      : requiredKinds.filter((kind) => !presentKinds.has(kind));

  if ((input.events ?? []).length === 0) {
    return buildReport({
      completenessId,
      sourceKind: input.sourceKind ?? "runtime",
      status: blockerCount > 0 ? "blocked" : "empty",
      eventSummaries,
      requiredKinds,
      missingRequiredKinds,
      findings: [...findings, finding("warning", "MISSING_REPLAY_EVENTS")]
    });
  }

  return buildReport({
    completenessId,
    sourceKind: input.sourceKind ?? "runtime",
    status:
      blockerCount > 0
        ? "blocked"
        : missingRequiredKinds.length > 0 ||
            eventSummaries.some((event) => event.warningCodes.length > 0)
          ? "warning"
          : "complete",
    eventSummaries,
    requiredKinds,
    missingRequiredKinds,
    findings
  });
}

export function summarizeReplayAuditCompletenessReport(
  report: ReplayAuditCompletenessReport
): Pick<
  ReplayAuditCompletenessReport,
  | "status"
  | "completenessId"
  | "eventCount"
  | "requiredEventCount"
  | "presentRequiredEventCount"
  | "missingRequiredEventCount"
  | "outOfOrderCount"
  | "duplicateConflictCount"
  | "blockerCount"
  | "warningCount"
  | "completenessHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: report.status,
    completenessId: report.completenessId,
    eventCount: report.eventCount,
    requiredEventCount: report.requiredEventCount,
    presentRequiredEventCount: report.presentRequiredEventCount,
    missingRequiredEventCount: report.missingRequiredEventCount,
    outOfOrderCount: report.outOfOrderCount,
    duplicateConflictCount: report.duplicateConflictCount,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    completenessHash: report.completenessHash,
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: report.source
  };
}

export function validateReplayAuditCompletenessInput(
  input: ReplayAuditCompletenessInput = {}
): ReplayAuditCompletenessFinding[] {
  const events = input.events ?? [];
  return [
    ...findForbiddenFields(input),
    ...findUnsafeMarkers(input),
    ...findExecutionClaims(input),
    ...validateEvents(events),
    ...validateEventRelations(events)
  ];
}

function buildReport(input: {
  completenessId: string;
  sourceKind: ReplayAuditCompletenessReport["sourceKind"];
  status: ReplayAuditCompletenessStatus;
  eventSummaries: ReplayAuditEventSummary[];
  requiredKinds: ReplayAuditEventKind[];
  missingRequiredKinds: ReplayAuditEventKind[];
  findings: ReplayAuditCompletenessFinding[];
}): ReplayAuditCompletenessReport {
  const missingFindings = input.missingRequiredKinds.map((kind) =>
    finding("warning", "MISSING_REQUIRED_EVENT", `kind:${kind}`)
  );
  const allFindings = dedupeFindings([...input.findings, ...missingFindings]);
  const blockerCount = allFindings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount =
    allFindings.filter((findingItem) => findingItem.severity === "warning")
      .length +
    input.eventSummaries.reduce(
      (count, event) => count + event.warningCodes.length,
      0
    );
  const completenessHash = stablePreviewHash(
    stableStringify({
      completenessId: input.completenessId,
      sourceKind: input.sourceKind,
      status: input.status,
      events: input.eventSummaries,
      missingRequiredKinds: input.missingRequiredKinds,
      findingCodes: allFindings.map((findingItem) => findingItem.code)
    })
  );
  return {
    status: input.status,
    completenessId: input.completenessId,
    source: "runtime_replay_audit_completeness",
    sourceKind: input.sourceKind,
    eventCount: input.eventSummaries.length,
    requiredEventCount: input.requiredKinds.length,
    presentRequiredEventCount:
      input.requiredKinds.length - input.missingRequiredKinds.length,
    missingRequiredEventCount: input.missingRequiredKinds.length,
    outOfOrderCount: allFindings.filter(
      (findingItem) => findingItem.code === "OUT_OF_ORDER_EVENT"
    ).length,
    duplicateConflictCount: allFindings.filter(
      (findingItem) => findingItem.code === "DUPLICATE_CONFLICTING_EVENT_ID"
    ).length,
    blockerCount,
    warningCount,
    findingCount: allFindings.length,
    eventSummaries: input.eventSummaries,
    missingRequiredKinds: input.missingRequiredKinds,
    findings: allFindings,
    completenessHash,
    readiness: {
      ...emptyReadiness,
      canRenderCompletenessReport:
        input.status === "complete" || input.status === "warning"
    },
    nextAction: nextActionFor(input.status)
  };
}

function requiredKindsFor(
  input: ReplayAuditCompletenessInput
): ReplayAuditEventKind[] {
  const required = new Set<ReplayAuditEventKind>(
    input.requiredKinds ?? baseRequiredKinds
  );
  if (input.rollbackOccurred === true) {
    required.add("rollback_checkpoint");
    required.add("rollback_result");
  }
  if (input.mcpReferenced === true) {
    required.add("mcp_evidence");
  }
  if (input.pluginSkillReferenced === true) {
    required.add("plugin_skill_evidence");
  }
  if (input.desktopActionReferenced === true) {
    required.add("desktop_observation");
    required.add("desktop_action_proposal");
  }
  if (input.desktopActionOccurred === true) {
    required.add("desktop_observation");
    required.add("desktop_action_proposal");
    required.add("desktop_action_execution");
  }
  return [...required];
}

function normalizeEvents(
  events: ReplayAuditEventInput[]
): ReplayAuditEventSummary[] {
  return events.map((event, index) => {
    const kind = safeText(event.kind) as ReplayAuditEventKind;
    const eventId = safeText(event.eventId, `replay-event-${index + 1}`);
    const summary = safeText(event.summary, `${kind} summary`);
    return {
      eventId,
      kind,
      status: safeText(event.status, "summary_ready"),
      summaryHash: stablePreviewHash(
        stableStringify({
          eventId,
          kind,
          status: event.status,
          occurredAt: event.occurredAt,
          summary,
          hashPrefix: event.hashPrefix,
          approvalRef: event.approvalRef,
          checkpointRef: event.checkpointRef,
          observerEvidenceRef: event.observerEvidenceRef,
          resultRef: event.resultRef
        })
      ).slice(0, 16),
      orderIndex: expectedOrderIndex.get(kind) ?? 999,
      warningCodes: safeStringArray(event.warningCodes),
      blockerCodes: safeStringArray(event.blockerCodes)
    };
  });
}

function validateEvents(
  events: ReplayAuditEventInput[]
): ReplayAuditCompletenessFinding[] {
  const findings: ReplayAuditCompletenessFinding[] = [];
  const seenById = new Map<string, string>();
  let highestOrder = -1;
  events.forEach((event, index) => {
    const path = `events.${index}`;
    const eventId = safeText(event.eventId);
    const kind = safeText(event.kind);
    const summary = safeText(event.summary);
    if (!eventKindSet.has(kind)) {
      findings.push(finding("blocker", "UNKNOWN_EVENT_KIND", path));
    }
    if (eventId.length === 0) {
      findings.push(finding("blocker", "MISSING_EVENT_ID", path));
    }
    if (summary.length === 0) {
      findings.push(finding("blocker", "MISSING_EVENT_SUMMARY", path));
    }
    if (eventId.length > 0) {
      const comparable = stablePreviewHash(
        stableStringify({
          kind,
          status: event.status,
          summary,
          hashPrefix: event.hashPrefix
        })
      );
      const previous = seenById.get(eventId);
      if (previous !== undefined && previous !== comparable) {
        findings.push(
          finding("blocker", "DUPLICATE_CONFLICTING_EVENT_ID", path)
        );
      }
      if (previous === undefined) {
        seenById.set(eventId, comparable);
      }
    }
    const orderIndex =
      expectedOrderIndex.get(kind as ReplayAuditEventKind) ?? 999;
    if (orderIndex < highestOrder) {
      findings.push(finding("blocker", "OUT_OF_ORDER_EVENT", path));
    }
    highestOrder = Math.max(highestOrder, orderIndex);
    if (
      event.claimsExecution === true &&
      safeText(event.resultRef).length === 0
    ) {
      findings.push(finding("blocker", "EXECUTION_CLAIM_WITHOUT_RESULT", path));
    }
  });
  return findings;
}

function validateEventRelations(
  events: ReplayAuditEventInput[]
): ReplayAuditCompletenessFinding[] {
  const findings: ReplayAuditCompletenessFinding[] = [];
  const kinds = new Set(events.map((event) => safeText(event.kind)));
  events.forEach((event, index) => {
    const path = `events.${index}`;
    const kind = safeText(event.kind);
    if (kind === "apply_result" && !kinds.has("approval_receipt")) {
      findings.push(finding("blocker", "APPLY_WITHOUT_APPROVAL", path));
    }
    if (kind === "rollback_result" && !kinds.has("rollback_checkpoint")) {
      findings.push(finding("blocker", "ROLLBACK_WITHOUT_CHECKPOINT", path));
    }
    if (
      (kind === "desktop_action_proposal" ||
        kind === "desktop_action_execution") &&
      !kinds.has("desktop_observation")
    ) {
      findings.push(
        finding("blocker", "DESKTOP_ACTION_WITHOUT_OBSERVER", path)
      );
    }
    if (kind === "mcp_tool_result" && !kinds.has("mcp_tool_approval")) {
      findings.push(
        finding("blocker", "MCP_TOOL_RESULT_WITHOUT_APPROVAL", path)
      );
    }
  });
  return findings;
}

function findForbiddenFields(value: unknown): ReplayAuditCompletenessFinding[] {
  const findings: ReplayAuditCompletenessFinding[] = [];
  visit(value, (entry) => {
    if (forbiddenFieldKeys.has(entry.key.toLowerCase())) {
      findings.push(
        finding("blocker", "FORBIDDEN_RAW_EVENT_FIELD", entry.path)
      );
    }
  });
  return findings;
}

function findExecutionClaims(value: unknown): ReplayAuditCompletenessFinding[] {
  const findings: ReplayAuditCompletenessFinding[] = [];
  visit(value, (entry) => {
    if (
      executionClaimKeys.has(entry.key.toLowerCase()) &&
      entry.value === true
    ) {
      findings.push(finding("blocker", "EXECUTION_FLAG_TRUE", entry.path));
    }
  });
  return findings;
}

function findUnsafeMarkers(value: unknown): ReplayAuditCompletenessFinding[] {
  const findings: ReplayAuditCompletenessFinding[] = [];
  visit(value, (entry) => {
    if (typeof entry.value !== "string") {
      return;
    }
    if (/\bBearer\s+[A-Za-z0-9._-]{12,}\b/.test(entry.value)) {
      findings.push(finding("blocker", "BEARER_TOKEN_MARKER", entry.path));
    }
    if (new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`).test(entry.value)) {
      findings.push(finding("blocker", "API_KEY_MARKER", entry.path));
    }
  });
  return findings;
}

function visit(
  value: unknown,
  callback: (entry: { key: string; value: unknown; path: string }) => void,
  path = "$"
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, callback, `${path}.${index}`));
    return;
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    callback({ key, value: child, path: childPath });
    visit(child, callback, childPath);
  }
}

function finding(
  severity: ReplayAuditCompletenessSeverity,
  code: string,
  path?: string
): ReplayAuditCompletenessFinding {
  return {
    findingId: `replay-audit-${severity}-${code.toLowerCase()}-${stablePreviewHash(
      `${path ?? "root"}:${code}`
    ).slice(0, 12)}`,
    severity,
    code,
    safeMessage: safeMessageFor(code),
    ...(path !== undefined ? { path } : {})
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    MISSING_REPLAY_EVENTS: "No replay/audit summary events were provided.",
    MISSING_REQUIRED_EVENT: "A required replay/audit summary event is missing.",
    UNKNOWN_EVENT_KIND: "Replay/audit event kind is not allowed.",
    MISSING_EVENT_ID: "Replay/audit events must include safe event ids.",
    MISSING_EVENT_SUMMARY: "Replay/audit events must include summary text.",
    DUPLICATE_CONFLICTING_EVENT_ID:
      "Duplicate event ids must not point at conflicting summaries.",
    OUT_OF_ORDER_EVENT: "Replay/audit summary event order is invalid.",
    APPLY_WITHOUT_APPROVAL: "Apply result is missing an approval receipt.",
    ROLLBACK_WITHOUT_CHECKPOINT:
      "Rollback result is missing a rollback checkpoint.",
    DESKTOP_ACTION_WITHOUT_OBSERVER:
      "Desktop action summary is missing observer evidence.",
    MCP_TOOL_RESULT_WITHOUT_APPROVAL:
      "MCP tool result is missing an approval summary.",
    EXECUTION_CLAIM_WITHOUT_RESULT:
      "Replay claims execution but does not include a result summary ref.",
    FORBIDDEN_RAW_EVENT_FIELD:
      "Raw event/content, command, secret, or execution fields are not allowed.",
    EXECUTION_FLAG_TRUE:
      "Replay/audit completeness report must not claim execution readiness.",
    BEARER_TOKEN_MARKER: "Bearer token marker detected.",
    API_KEY_MARKER: "Secret-like API key marker detected."
  };
  return messages[code] ?? "Replay/audit completeness finding.";
}

function nextActionFor(status: ReplayAuditCompletenessStatus): string {
  if (status === "empty") {
    return "Provide summary-only replay/audit events.";
  }
  if (status === "blocked") {
    return "Resolve replay ordering, approval, raw content, and execution blockers.";
  }
  if (status === "warning") {
    return "Review missing required replay/audit summaries.";
  }
  return "Replay/audit completeness is ready for read-only review.";
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/[^A-Z0-9_.-]/gi, "_").slice(0, 80))
    .filter((item) => item.length > 0);
}

function dedupeFindings(
  findings: ReplayAuditCompletenessFinding[]
): ReplayAuditCompletenessFinding[] {
  const seen = new Set<string>();
  return findings.filter((findingItem) => {
    const key = `${findingItem.severity}:${findingItem.code}:${findingItem.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .filter((key) => key !== "idGenerator")
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
