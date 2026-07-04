import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type CrossSurfaceApprovedLaneKind =
  | "approved_workspace_apply"
  | "git_shell_verification"
  | "approved_desktop_action"
  | "approved_rollback"
  | "summary_event_replay";

export type CrossSurfaceApprovedDesktopActionKind =
  | "focus_window"
  | "raise_window"
  | "activate_window"
  | "click_observed_safe_target"
  | "type_into_observed_text_field";

export type CrossSurfaceApprovedSequencerStatus =
  | "empty"
  | "sequence_ready"
  | "warning"
  | "blocked";

export type CrossSurfaceApprovedSequencerSeverity = "blocker" | "warning";

export type CrossSurfaceApprovedSequencerFindingKind =
  | "lane"
  | "approval"
  | "raw_field"
  | "secret"
  | "execution_claim";

export type CrossSurfaceApprovedSequencerFinding = {
  findingId: string;
  kind: CrossSurfaceApprovedSequencerFindingKind;
  severity: CrossSurfaceApprovedSequencerSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type CrossSurfaceApprovedLaneInput = {
  laneId?: string | undefined;
  kind?: CrossSurfaceApprovedLaneKind | string | undefined;
  status?: string | undefined;
  summary?: string | undefined;
  approvalReceiptRef?: string | undefined;
  typedConfirmationRef?: string | undefined;
  verificationTemplateRef?: string | undefined;
  desktopActionKind?:
    | CrossSurfaceApprovedDesktopActionKind
    | string
    | undefined;
  rollbackCheckpointRef?: string | undefined;
  replaySummaryRef?: string | undefined;
  warningCodes?: string[] | undefined;
  blockerCodes?: string[] | undefined;
  readiness?: Record<string, unknown> | undefined;
  [key: string]: unknown;
};

export type CrossSurfaceApprovedLaneSummary = {
  laneId: string;
  kind: CrossSurfaceApprovedLaneKind;
  status: string;
  summaryHash: string;
  requiredReceiptRefs: string[];
  missingApprovalCodes: string[];
  warningCodes: string[];
  blockerCodes: string[];
};

export type CrossSurfaceApprovedSequencerReadiness = {
  canExecuteNow: boolean;
  sequencerExecutes: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteDesktopAction: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canBypassReceipt: false;
  canBypassTypedConfirmation: false;
  appCanExecute: false;
};

export type CrossSurfaceApprovedSequencerInput = {
  lanes?: CrossSurfaceApprovedLaneInput[] | undefined;
  sourceKind?:
    | "runtime"
    | "app_preview"
    | "fixture"
    | "manual_test"
    | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CrossSurfaceApprovedSequence = {
  status: CrossSurfaceApprovedSequencerStatus;
  sequenceId: string;
  source: "runtime_cross_surface_approved_sequencer";
  sourceKind: "runtime" | "app_preview" | "fixture" | "manual_test";
  laneCount: number;
  readyLaneCount: number;
  blockedLaneCount: number;
  warningLaneCount: number;
  requiredReceipts: string[];
  missingApprovals: string[];
  laneSummaries: CrossSurfaceApprovedLaneSummary[];
  findings: CrossSurfaceApprovedSequencerFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  sequenceHash: string;
  readiness: CrossSurfaceApprovedSequencerReadiness;
  nextAction: string;
};

const allowedLaneKinds = new Set<CrossSurfaceApprovedLaneKind>([
  "approved_workspace_apply",
  "git_shell_verification",
  "approved_desktop_action",
  "approved_rollback",
  "summary_event_replay"
]);

const approvedDesktopActionKinds =
  new Set<CrossSurfaceApprovedDesktopActionKind>([
    "focus_window",
    "raise_window",
    "activate_window",
    "click_observed_safe_target",
    "type_into_observed_text_field"
  ]);

const emptyReadiness: CrossSurfaceApprovedSequencerReadiness = {
  canExecuteNow: false,
  sequencerExecutes: false,
  canWriteEventStore: false,
  canApplyPatch: false,
  canRollback: false,
  canExecuteDesktopAction: false,
  canExecuteGit: false,
  canExecuteShell: false,
  canBypassReceipt: false,
  canBypassTypedConfirmation: false,
  appCanExecute: false
};

const forbiddenFieldKeys = new Set(
  [
    "raw" + "Prompt",
    "raw" + "Response",
    "reasoningContent",
    "reasoning_content",
    "raw" + "Source",
    "raw" + "Diff",
    "raw" + "Patch",
    "raw" + "Screenshot",
    "raw" + "McpOutput",
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
    "permissionLease",
    "nativeBridge",
    "desktopActionExecution",
    "mcpToolInvoke",
    "pluginRuntime",
    "skillRuntime",
    "dynamicAction",
    "dynamicAgentBidding",
    "tools",
    "tool_choice"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canExecuteDesktopAction",
    "canExecuteGit",
    "canExecuteShell",
    "canBypassReceipt",
    "canBypassTypedConfirmation",
    "appCanExecute",
    "claimsExecution"
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
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function validateCrossSurfaceApprovedSequencerInput(
  input: CrossSurfaceApprovedSequencerInput = {}
): CrossSurfaceApprovedSequencerFinding[] {
  return [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input),
    ...findExecutionClaims(input),
    ...validateLanes(input.lanes ?? [])
  ];
}

export function buildCrossSurfaceApprovedSequence(
  input: CrossSurfaceApprovedSequencerInput = {}
): CrossSurfaceApprovedSequence {
  const sequenceId =
    input.idGenerator?.() ??
    `cross-surface-sequence-${stablePreviewHash(stableStringify(input)).slice(0, 12)}`;
  const findings = validateCrossSurfaceApprovedSequencerInput(input);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const lanes = blockerCount > 0 ? [] : normalizeLanes(input.lanes ?? []);

  if ((input.lanes ?? []).length === 0) {
    return buildSequence({
      sequenceId,
      sourceKind: input.sourceKind ?? "runtime",
      status: blockerCount > 0 ? "blocked" : "empty",
      lanes,
      findings: [
        ...findings,
        finding("lane", "warning", "MISSING_SEQUENCE_LANES")
      ]
    });
  }

  const status =
    blockerCount > 0
      ? "blocked"
      : lanes.some((lane) => lane.missingApprovalCodes.length > 0)
        ? "blocked"
        : lanes.some((lane) => lane.warningCodes.length > 0)
          ? "warning"
          : "sequence_ready";

  return buildSequence({
    sequenceId,
    sourceKind: input.sourceKind ?? "runtime",
    status,
    lanes,
    findings
  });
}

export function summarizeCrossSurfaceApprovedSequence(
  sequence: CrossSurfaceApprovedSequence
): Pick<
  CrossSurfaceApprovedSequence,
  | "status"
  | "sequenceId"
  | "laneCount"
  | "readyLaneCount"
  | "blockedLaneCount"
  | "warningLaneCount"
  | "requiredReceipts"
  | "missingApprovals"
  | "sequenceHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: sequence.status,
    sequenceId: sequence.sequenceId,
    laneCount: sequence.laneCount,
    readyLaneCount: sequence.readyLaneCount,
    blockedLaneCount: sequence.blockedLaneCount,
    warningLaneCount: sequence.warningLaneCount,
    requiredReceipts: sequence.requiredReceipts,
    missingApprovals: sequence.missingApprovals,
    sequenceHash: sequence.sequenceHash,
    readiness: sequence.readiness,
    nextAction: sequence.nextAction,
    source: sequence.source
  };
}

function buildSequence(input: {
  sequenceId: string;
  sourceKind: CrossSurfaceApprovedSequence["sourceKind"];
  status: CrossSurfaceApprovedSequencerStatus;
  lanes: CrossSurfaceApprovedLaneSummary[];
  findings: CrossSurfaceApprovedSequencerFinding[];
}): CrossSurfaceApprovedSequence {
  const missingApprovals = unique([
    ...input.lanes.flatMap((lane) => lane.missingApprovalCodes),
    ...input.findings
      .map((findingItem) => findingItem.code)
      .filter((code) => code.startsWith("MISSING_"))
  ]);
  const requiredReceipts = unique(
    input.lanes.flatMap((lane) => lane.requiredReceiptRefs)
  );
  const blockerCount = input.findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount =
    input.findings.filter((findingItem) => findingItem.severity === "warning")
      .length +
    input.lanes.reduce(
      (count, lane) =>
        count + lane.warningCodes.length + lane.missingApprovalCodes.length,
      0
    );
  const sequenceHash = stablePreviewHash(
    stableStringify({
      sequenceId: input.sequenceId,
      sourceKind: input.sourceKind,
      lanes: input.lanes,
      missingApprovals,
      requiredReceipts,
      findingCodes: input.findings.map((findingItem) => findingItem.code),
      status: input.status
    })
  );

  return {
    status: input.status,
    sequenceId: input.sequenceId,
    source: "runtime_cross_surface_approved_sequencer",
    sourceKind: input.sourceKind,
    laneCount: input.lanes.length,
    readyLaneCount: input.lanes.filter(
      (lane) => lane.missingApprovalCodes.length === 0
    ).length,
    blockedLaneCount:
      input.status === "blocked"
        ? Math.max(
            1,
            input.lanes.filter((lane) => lane.blockerCodes.length > 0).length
          )
        : 0,
    warningLaneCount: input.lanes.filter((lane) => lane.warningCodes.length > 0)
      .length,
    requiredReceipts,
    missingApprovals: unique(missingApprovals),
    laneSummaries: input.lanes,
    findings: dedupeFindings(input.findings),
    blockerCount,
    warningCount,
    findingCount: input.findings.length,
    sequenceHash,
    readiness: {
      ...emptyReadiness,
      canExecuteNow: input.status === "sequence_ready" && input.lanes.length > 0
    },
    nextAction: nextActionFor(input.status)
  };
}

function normalizeLanes(
  lanes: CrossSurfaceApprovedLaneInput[]
): CrossSurfaceApprovedLaneSummary[] {
  return lanes.map((lane, index) => {
    const kind = safeText(lane.kind) as CrossSurfaceApprovedLaneKind;
    const laneId = safeText(lane.laneId, `approved-lane-${index + 1}`);
    const missingApprovalCodes = missingApprovalCodesFor(lane);
    const requiredReceiptRefs = requiredReceiptRefsFor(lane);
    const summary = safeText(lane.summary, `${kind} summary`);
    return {
      laneId,
      kind,
      status: safeText(lane.status, "summary_ready"),
      summaryHash: stablePreviewHash(
        stableStringify({
          laneId,
          kind,
          status: lane.status,
          summary,
          approvalReceiptRef: lane.approvalReceiptRef,
          typedConfirmationRef: lane.typedConfirmationRef,
          rollbackCheckpointRef: lane.rollbackCheckpointRef,
          replaySummaryRef: lane.replaySummaryRef
        })
      ).slice(0, 16),
      requiredReceiptRefs,
      missingApprovalCodes,
      warningCodes: safeStringArray(lane.warningCodes),
      blockerCodes: safeStringArray(lane.blockerCodes)
    };
  });
}

function validateLanes(
  lanes: CrossSurfaceApprovedLaneInput[]
): CrossSurfaceApprovedSequencerFinding[] {
  const findings: CrossSurfaceApprovedSequencerFinding[] = [];
  lanes.forEach((lane, index) => {
    const path = `lanes.${index}`;
    const kind = safeText(lane.kind);
    if (!allowedLaneKinds.has(kind as CrossSurfaceApprovedLaneKind)) {
      findings.push(finding("lane", "blocker", "UNKNOWN_LANE_KIND", path));
      return;
    }
    if (safeText(lane.summary).length === 0) {
      findings.push(finding("lane", "blocker", "MISSING_LANE_SUMMARY", path));
    }
    for (const code of missingApprovalCodesFor(lane)) {
      findings.push(finding("approval", "blocker", code, path));
    }
    if (kind === "approved_desktop_action") {
      const actionKind = safeText(lane.desktopActionKind);
      if (
        !approvedDesktopActionKinds.has(
          actionKind as CrossSurfaceApprovedDesktopActionKind
        )
      ) {
        findings.push(
          finding("lane", "blocker", "UNAPPROVED_DESKTOP_ACTION_KIND", path)
        );
      }
    }
  });
  return findings;
}

function missingApprovalCodesFor(
  lane: CrossSurfaceApprovedLaneInput
): string[] {
  const kind = safeText(lane.kind);
  const missing: string[] = [];
  if (
    kind === "approved_workspace_apply" ||
    kind === "approved_desktop_action" ||
    kind === "approved_rollback"
  ) {
    if (safeText(lane.approvalReceiptRef).length === 0) {
      missing.push("MISSING_APPROVAL_RECEIPT");
    }
    if (safeText(lane.typedConfirmationRef).length === 0) {
      missing.push("MISSING_TYPED_CONFIRMATION");
    }
  }
  if (kind === "git_shell_verification") {
    if (safeText(lane.verificationTemplateRef).length === 0) {
      missing.push("MISSING_VERIFICATION_TEMPLATE_REF");
    }
  }
  if (kind === "approved_rollback") {
    if (safeText(lane.rollbackCheckpointRef).length === 0) {
      missing.push("MISSING_ROLLBACK_CHECKPOINT_REF");
    }
  }
  if (kind === "summary_event_replay") {
    if (safeText(lane.replaySummaryRef).length === 0) {
      missing.push("MISSING_REPLAY_SUMMARY_REF");
    }
  }
  return unique(missing);
}

function requiredReceiptRefsFor(lane: CrossSurfaceApprovedLaneInput): string[] {
  return unique(
    [
      lane.approvalReceiptRef,
      lane.typedConfirmationRef,
      lane.verificationTemplateRef,
      lane.rollbackCheckpointRef,
      lane.replaySummaryRef
    ].filter((ref): ref is string => typeof ref === "string" && ref.length > 0)
  );
}

function findForbiddenFields(
  value: unknown
): CrossSurfaceApprovedSequencerFinding[] {
  const findings: CrossSurfaceApprovedSequencerFinding[] = [];
  visit(value, (entry) => {
    if (forbiddenFieldKeys.has(entry.key.toLowerCase())) {
      findings.push(
        finding("raw_field", "blocker", "FORBIDDEN_FIELD", entry.path)
      );
    }
  });
  return findings;
}

function findExecutionClaims(
  value: unknown
): CrossSurfaceApprovedSequencerFinding[] {
  const findings: CrossSurfaceApprovedSequencerFinding[] = [];
  visit(value, (entry) => {
    if (
      executionClaimKeys.has(entry.key.toLowerCase()) &&
      entry.value === true
    ) {
      findings.push(
        finding("execution_claim", "blocker", "EXECUTION_FLAG_TRUE", entry.path)
      );
    }
  });
  return findings;
}

function findUnsafeStringMarkers(
  value: unknown
): CrossSurfaceApprovedSequencerFinding[] {
  const findings: CrossSurfaceApprovedSequencerFinding[] = [];
  visit(value, (entry) => {
    if (typeof entry.value !== "string") {
      return;
    }
    for (const pattern of unsafeTextPatterns) {
      if (pattern.pattern.test(entry.value)) {
        findings.push(finding("secret", "blocker", pattern.code, entry.path));
      }
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
  kind: CrossSurfaceApprovedSequencerFindingKind,
  severity: CrossSurfaceApprovedSequencerSeverity,
  code: string,
  path?: string
): CrossSurfaceApprovedSequencerFinding {
  return {
    findingId: `cross-surface-sequence-${severity}-${code.toLowerCase()}-${stablePreviewHash(
      `${path ?? "root"}:${kind}:${code}`
    ).slice(0, 12)}`,
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code),
    ...(path !== undefined ? { path } : {})
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    MISSING_SEQUENCE_LANES:
      "No approved lane summaries were provided for sequencing.",
    UNKNOWN_LANE_KIND: "Only existing approved lanes can be sequenced.",
    MISSING_LANE_SUMMARY: "Each approved lane must include a summary.",
    MISSING_APPROVAL_RECEIPT:
      "Approved apply, rollback, and desktop action lanes require receipt refs.",
    MISSING_TYPED_CONFIRMATION:
      "Approved apply, rollback, and desktop action lanes require typed confirmation refs.",
    MISSING_VERIFICATION_TEMPLATE_REF:
      "Verification lanes must reference an existing fixed template summary.",
    MISSING_ROLLBACK_CHECKPOINT_REF:
      "Rollback lanes must reference an existing rollback checkpoint summary.",
    MISSING_REPLAY_SUMMARY_REF:
      "Replay lanes must reference an existing summary event replay ref.",
    UNAPPROVED_DESKTOP_ACTION_KIND:
      "Desktop action lane kind is outside existing approved lanes.",
    FORBIDDEN_FIELD:
      "Raw, command, dynamic action, or execution fields are not allowed.",
    EXECUTION_FLAG_TRUE: "Sequencer inputs must not claim execution readiness.",
    API_KEY_MARKER: "Secret-like API key marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization header marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected."
  };
  return messages[code] ?? "Cross-surface approved sequencer finding.";
}

function nextActionFor(status: CrossSurfaceApprovedSequencerStatus): string {
  if (status === "empty") {
    return "Provide existing approved lane summaries before sequencing.";
  }
  if (status === "blocked") {
    return "Resolve missing receipts, typed confirmations, and lane blockers before using existing lane buttons.";
  }
  if (status === "warning") {
    return "Review warning lanes. Sequencer still does not execute actions.";
  }
  return "Sequence is ready for human review. Use existing individual lane controls only.";
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

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function dedupeFindings(
  findings: CrossSurfaceApprovedSequencerFinding[]
): CrossSurfaceApprovedSequencerFinding[] {
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
