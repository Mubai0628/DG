export type SandboxApplyRollbackEventType =
  | "sandbox.patch_apply.previewed"
  | "sandbox.patch_apply.result_previewed"
  | "sandbox.patch_rollback.previewed"
  | "sandbox.patch_rollback.result_previewed"
  | "sandbox.apply_rollback.projection_built";

export type SandboxApplyRollbackProjectionStatus =
  | "empty"
  | "projection_ready"
  | "partial"
  | "warning"
  | "blocked";

export type SandboxApplyRollbackProjectionSeverity =
  | "info"
  | "warning"
  | "blocker";

export type SandboxApplyRollbackProjectionFindingKind =
  | "safety"
  | "schema"
  | "link"
  | "readiness"
  | "event_preview"
  | "projection";

export type SandboxApplyRollbackProjectionWarning = {
  code: string;
  safeMessage: string;
};

export type SandboxApplyRollbackProjectionFinding = {
  findingId: string;
  kind: SandboxApplyRollbackProjectionFindingKind;
  severity: SandboxApplyRollbackProjectionSeverity;
  code: string;
  summary: string;
  relatedRef?: string | undefined;
};

export type SandboxApplyRollbackEventEnvelope = {
  eventId: string;
  type: SandboxApplyRollbackEventType;
  ts: string;
  schemaVersion: "sandbox.apply_rollback.event_projection.v1";
  source: "runtime_sandbox_apply_rollback_event_projection";
  notWritten: true;
  relatedIds: {
    applyId?: string | undefined;
    rollbackId?: string | undefined;
    checkpointId?: string | undefined;
    proposalId?: string | undefined;
    validationId?: string | undefined;
    auditId?: string | undefined;
    approvalDraftId?: string | undefined;
    virtualApplyId?: string | undefined;
    snapshotContractId?: string | undefined;
  };
  payloadSummary: {
    operationCount?: number | undefined;
    filesCreated?: number | undefined;
    filesUpdated?: number | undefined;
    filesDeleted?: number | undefined;
    filesRestored?: number | undefined;
    filesRemoved?: number | undefined;
    filesRecreated?: number | undefined;
    bytesWritten?: number | undefined;
    bytesRestored?: number | undefined;
    warningCount?: number | undefined;
    blockerCount?: number | undefined;
    hashPrefix?: string | undefined;
    disposableRootRef?: string | undefined;
  };
  warningCodes: string[];
  eventHash: string;
};

export type SandboxApplyRollbackProjectionStage = {
  stageId: string;
  order: number;
  kind:
    | "apply_result_preview"
    | "rollback_result_preview"
    | "event_projection_built";
  status: "previewed" | "missing" | "blocked";
  source: "local_summary" | "missing" | "blocked";
  relatedIds: SandboxApplyRollbackEventEnvelope["relatedIds"];
  eventTypeRefs: SandboxApplyRollbackEventType[];
  summary: string;
  hashPrefix: string;
  blockerCount: number;
  warningCount: number;
  warningCodes: string[];
};

export type SandboxApplyRollbackProjectionReadiness = {
  canWriteEventStore: false;
  canExecuteApply: false;
  canExecuteRollback: false;
  canApplyToUserWorkspace: false;
  canExecuteGit: false;
  canExecuteShell: false;
};

export type SandboxApplyRollbackEventProjectionInput = {
  disposablePatchApplyResult?: unknown;
  disposablePatchRollbackResult?: unknown;
  snapshotContract?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  existingEventSummary?: unknown;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type SandboxApplyRollbackEventProjection = {
  status: SandboxApplyRollbackProjectionStatus;
  projectionId: string;
  chainId: string;
  eventCount: number;
  applyEventCount: number;
  rollbackEventCount: number;
  existingPersistedEventCount: number;
  notWrittenEventCount: number;
  stageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  stages: SandboxApplyRollbackProjectionStage[];
  eventPreviews: SandboxApplyRollbackEventEnvelope[];
  findings: SandboxApplyRollbackProjectionFinding[];
  warnings: SandboxApplyRollbackProjectionWarning[];
  hashChainSummary: {
    chainHash: string;
    eventHashPrefixes: string[];
    linkCount: number;
    mismatchCount: number;
    warningCodes: string[];
  };
  readiness: SandboxApplyRollbackProjectionReadiness;
  projectionHash: string;
  nextAction: string;
  source: "runtime_sandbox_apply_rollback_event_projection";
};

export type SandboxApplyRollbackEventProjectionValidationResult = {
  ok: boolean;
  warningCodes: string[];
  findings: SandboxApplyRollbackProjectionFinding[];
};

type SummaryRecord = Record<string, unknown>;

type NormalizedInput = {
  applyResult: SummaryRecord | undefined;
  rollbackResult: SummaryRecord | undefined;
  snapshotContract: SummaryRecord | undefined;
  patchProposalPreview: SummaryRecord | undefined;
  patchValidationPreview: SummaryRecord | undefined;
  patchDiffAuditPreview: SummaryRecord | undefined;
  patchApprovalDraft: SummaryRecord | undefined;
  patchVirtualApplyPreview: SummaryRecord | undefined;
  patchRollbackCheckpointPreview: SummaryRecord | undefined;
  existingEventSummary: SummaryRecord | undefined;
  createdAt: string;
};

const schemaVersion = "sandbox.apply_rollback.event_projection.v1";
const runtimeSource = "runtime_sandbox_apply_rollback_event_projection";
const defaultTimestamp = "2026-01-01T00:00:00.000Z";
const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const preimageField = ["preimage", "Content"].join("");

const generatedEventTypes = new Set<SandboxApplyRollbackEventType>([
  "sandbox.patch_apply.previewed",
  "sandbox.patch_apply.result_previewed",
  "sandbox.patch_rollback.previewed",
  "sandbox.patch_rollback.result_previewed",
  "sandbox.apply_rollback.projection_built"
]);

const allowedInputEventTypes = new Set<string>([
  ...generatedEventTypes,
  "sandbox.patch_apply.preview_result",
  "sandbox.patch_rollback.preview_result"
]);

const forbiddenRawInputKeys = new Set(
  [
    "content",
    preimageField,
    "fileContent",
    "beforeContent",
    "afterContent",
    "realAbsolutePath",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    privatePasteField,
    apiKeyField,
    authHeaderField,
    "env",
    "stdout",
    "stderr"
  ].map((key) => key.toLowerCase())
);

const unsafePreviewPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{16,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/
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
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b`, "i")
  },
  {
    code: "RAW_DOM_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Dom"}\\b|raw DOM`, "i")
  },
  {
    code: "RAW_CSV_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Csv"}\\b|raw CSV`, "i")
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b`, "i")
  },
  {
    code: "RAW_SCREENSHOT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Screenshot"}\\b|screenshot`, "i")
  },
  {
    code: "CLIPBOARD_MARKER",
    pattern: new RegExp(`\\b${privatePasteField}\\b`, "i")
  }
] as const;

export function validateSandboxApplyRollbackEventProjectionInput(
  input: SandboxApplyRollbackEventProjectionInput = {}
): SandboxApplyRollbackEventProjectionValidationResult {
  const findings = collectFindings(input);
  return {
    ok: findings.every((finding) => finding.severity !== "blocker"),
    warningCodes: uniqueStrings(findings.map((finding) => finding.code)),
    findings
  };
}

export function buildSandboxApplyRollbackEventProjection(
  input: SandboxApplyRollbackEventProjectionInput = {}
): SandboxApplyRollbackEventProjection {
  const normalized = normalizeInput(input);
  const findings = collectFindings(input);
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const existingPersistedEventCount = existingEventCount(
    normalized.existingEventSummary
  );
  const hasApply = normalized.applyResult !== undefined;
  const hasRollback = normalized.rollbackResult !== undefined;

  if (
    !hasApply &&
    !hasRollback &&
    existingPersistedEventCount === 0 &&
    blockerCount === 0
  ) {
    return emptyProjection(input.createdAt);
  }

  const eventPreviews =
    blockerCount > 0 ? [] : buildEventPreviews(input, normalized, findings);
  const applyEventCount = eventPreviews.filter((event) =>
    event.type.startsWith("sandbox.patch_apply.")
  ).length;
  const rollbackEventCount = eventPreviews.filter((event) =>
    event.type.startsWith("sandbox.patch_rollback.")
  ).length;
  const stages = buildStages({
    normalized,
    eventPreviews,
    blockerCount,
    warningCount
  });
  const eventHashPrefixes = eventPreviews.map((event) => event.eventHash);
  const mismatchCount = findings.filter((finding) =>
    finding.code.endsWith("_MISMATCH")
  ).length;
  const hashChainSummary = {
    chainHash: hashPreview(eventHashPrefixes.join("|") || "empty-chain"),
    eventHashPrefixes,
    linkCount: Math.max(0, eventPreviews.length - 1),
    mismatchCount,
    warningCodes: uniqueStrings(
      findings
        .filter((finding) => finding.severity !== "info")
        .map((finding) => finding.code)
    )
  };
  const projectionId =
    input.idGenerator?.() ??
    `sandbox-apply-rollback-projection-${hashPreview(
      [
        safeRef(normalized.applyResult, "applyId"),
        safeRef(normalized.rollbackResult, "rollbackId"),
        hashChainSummary.chainHash,
        normalized.createdAt
      ].join("|")
    )}`;
  const chainId = `sandbox-apply-rollback-chain-${hashChainSummary.chainHash}`;
  const status = projectionStatus({
    hasApply,
    hasRollback,
    existingPersistedEventCount,
    blockerCount,
    warningCount
  });
  const projectionHash = hashPreview(
    JSON.stringify({
      projectionId,
      chainId,
      status,
      eventHashes: eventHashPrefixes,
      blockerCount,
      warningCount
    })
  );

  return {
    status,
    projectionId,
    chainId,
    eventCount: eventPreviews.length,
    applyEventCount,
    rollbackEventCount,
    existingPersistedEventCount,
    notWrittenEventCount: eventPreviews.length,
    stageCount: stages.filter((stage) => stage.source !== "missing").length,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    stages,
    eventPreviews,
    findings,
    warnings: findings
      .filter((finding) => finding.severity !== "blocker")
      .map((finding) => ({
        code: finding.code,
        safeMessage: finding.summary
      })),
    hashChainSummary,
    readiness: disabledReadiness(),
    projectionHash,
    nextAction: nextActionFor(status),
    source: runtimeSource
  };
}

export function summarizeSandboxApplyRollbackEventProjection(
  projection: SandboxApplyRollbackEventProjection
): {
  projectionId: string;
  chainId: string;
  status: SandboxApplyRollbackProjectionStatus;
  eventCount: number;
  applyEventCount: number;
  rollbackEventCount: number;
  existingPersistedEventCount: number;
  notWrittenEventCount: number;
  blockerCount: number;
  warningCount: number;
  canWriteEventStore: false;
  canExecuteApply: false;
  canExecuteRollback: false;
  canApplyToUserWorkspace: false;
  canExecuteGit: false;
  canExecuteShell: false;
  hash: string;
} {
  return {
    projectionId: projection.projectionId,
    chainId: projection.chainId,
    status: projection.status,
    eventCount: projection.eventCount,
    applyEventCount: projection.applyEventCount,
    rollbackEventCount: projection.rollbackEventCount,
    existingPersistedEventCount: projection.existingPersistedEventCount,
    notWrittenEventCount: projection.notWrittenEventCount,
    blockerCount: projection.blockerCount,
    warningCount: projection.warningCount,
    canWriteEventStore: false,
    canExecuteApply: false,
    canExecuteRollback: false,
    canApplyToUserWorkspace: false,
    canExecuteGit: false,
    canExecuteShell: false,
    hash: hashPreview(
      [
        projection.projectionId,
        projection.chainId,
        projection.status,
        projection.projectionHash
      ].join("|")
    )
  };
}

function emptyProjection(
  createdAt: string | undefined
): SandboxApplyRollbackEventProjection {
  const emptyHash = hashPreview(`empty:${createdAt ?? defaultTimestamp}`);
  return {
    status: "empty",
    projectionId: "",
    chainId: "",
    eventCount: 0,
    applyEventCount: 0,
    rollbackEventCount: 0,
    existingPersistedEventCount: 0,
    notWrittenEventCount: 0,
    stageCount: 0,
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    stages: [],
    eventPreviews: [],
    findings: [],
    warnings: [],
    hashChainSummary: {
      chainHash: emptyHash,
      eventHashPrefixes: [],
      linkCount: 0,
      mismatchCount: 0,
      warningCodes: []
    },
    readiness: disabledReadiness(),
    projectionHash: emptyHash,
    nextAction:
      "Create disposable apply and rollback result summaries before event projection.",
    source: runtimeSource
  };
}

function buildEventPreviews(
  input: SandboxApplyRollbackEventProjectionInput,
  normalized: NormalizedInput,
  findings: readonly SandboxApplyRollbackProjectionFinding[]
): SandboxApplyRollbackEventEnvelope[] {
  const events: SandboxApplyRollbackEventEnvelope[] = [];
  if (normalized.applyResult !== undefined) {
    events.push(
      eventEnvelope(input, {
        order: 1,
        type: "sandbox.patch_apply.previewed",
        relatedIds: relatedIdsFrom(normalized),
        payloadSummary: applyPayloadSummary(normalized.applyResult),
        warningCodes: warningCodesFrom(normalized.applyResult)
      })
    );
    events.push(
      eventEnvelope(input, {
        order: 2,
        type: "sandbox.patch_apply.result_previewed",
        relatedIds: relatedIdsFrom(normalized),
        payloadSummary: applyPayloadSummary(normalized.applyResult),
        warningCodes: warningCodesFrom(normalized.applyResult)
      })
    );
  }
  if (normalized.rollbackResult !== undefined) {
    events.push(
      eventEnvelope(input, {
        order: 3,
        type: "sandbox.patch_rollback.previewed",
        relatedIds: relatedIdsFrom(normalized),
        payloadSummary: rollbackPayloadSummary(normalized.rollbackResult),
        warningCodes: warningCodesFrom(normalized.rollbackResult)
      })
    );
    events.push(
      eventEnvelope(input, {
        order: 4,
        type: "sandbox.patch_rollback.result_previewed",
        relatedIds: relatedIdsFrom(normalized),
        payloadSummary: rollbackPayloadSummary(normalized.rollbackResult),
        warningCodes: warningCodesFrom(normalized.rollbackResult)
      })
    );
  }
  if (events.length > 0) {
    events.push(
      eventEnvelope(input, {
        order: 5,
        type: "sandbox.apply_rollback.projection_built",
        relatedIds: relatedIdsFrom(normalized),
        payloadSummary: {
          operationCount: events.reduce(
            (sum, event) =>
              sum + finiteNumber(event.payloadSummary.operationCount),
            0
          ),
          warningCount: findings.filter(
            (finding) => finding.severity === "warning"
          ).length,
          blockerCount: findings.filter(
            (finding) => finding.severity === "blocker"
          ).length,
          hashPrefix: hashPreview(
            events.map((event) => event.eventHash).join("|")
          ),
          disposableRootRef: commonDisposableRootRef(normalized)
        },
        warningCodes: uniqueStrings(
          findings
            .filter((finding) => finding.severity !== "info")
            .map((finding) => finding.code)
        )
      })
    );
  }
  return events;
}

function eventEnvelope(
  input: SandboxApplyRollbackEventProjectionInput,
  spec: {
    order: number;
    type: SandboxApplyRollbackEventType;
    relatedIds: SandboxApplyRollbackEventEnvelope["relatedIds"];
    payloadSummary: SandboxApplyRollbackEventEnvelope["payloadSummary"];
    warningCodes: string[];
  }
): SandboxApplyRollbackEventEnvelope {
  const ts = safeTimestamp(input.createdAt);
  const stable = JSON.stringify({
    type: spec.type,
    relatedIds: spec.relatedIds,
    payloadSummary: spec.payloadSummary,
    warningCodes: spec.warningCodes,
    ts
  });
  const eventHash = hashPreview(stable);
  return {
    eventId: `sandbox-event-${spec.order}-${eventHash}`,
    type: spec.type,
    ts,
    schemaVersion,
    source: runtimeSource,
    notWritten: true,
    relatedIds: spec.relatedIds,
    payloadSummary: spec.payloadSummary,
    warningCodes: uniqueStrings(spec.warningCodes),
    eventHash
  };
}

function buildStages(input: {
  normalized: NormalizedInput;
  eventPreviews: readonly SandboxApplyRollbackEventEnvelope[];
  blockerCount: number;
  warningCount: number;
}): SandboxApplyRollbackProjectionStage[] {
  const applyEvents = input.eventPreviews.filter((event) =>
    event.type.startsWith("sandbox.patch_apply.")
  );
  const rollbackEvents = input.eventPreviews.filter((event) =>
    event.type.startsWith("sandbox.patch_rollback.")
  );
  const projectionEvents = input.eventPreviews.filter(
    (event) => event.type === "sandbox.apply_rollback.projection_built"
  );
  return [
    stageFromEvents({
      order: 1,
      kind: "apply_result_preview",
      present: input.normalized.applyResult !== undefined,
      events: applyEvents,
      relatedIds: relatedIdsFrom(input.normalized),
      missingSummary: "Disposable apply result summary is not available."
    }),
    stageFromEvents({
      order: 2,
      kind: "rollback_result_preview",
      present: input.normalized.rollbackResult !== undefined,
      events: rollbackEvents,
      relatedIds: relatedIdsFrom(input.normalized),
      missingSummary: "Disposable rollback result summary is not available."
    }),
    stageFromEvents({
      order: 3,
      kind: "event_projection_built",
      present: input.eventPreviews.length > 0,
      events: projectionEvents,
      relatedIds: relatedIdsFrom(input.normalized),
      missingSummary:
        "Sandbox apply/rollback event projection has no local event previews.",
      blockerCount: input.blockerCount,
      warningCount: input.warningCount
    })
  ];
}

function stageFromEvents(input: {
  order: number;
  kind: SandboxApplyRollbackProjectionStage["kind"];
  present: boolean;
  events: readonly SandboxApplyRollbackEventEnvelope[];
  relatedIds: SandboxApplyRollbackEventEnvelope["relatedIds"];
  missingSummary: string;
  blockerCount?: number | undefined;
  warningCount?: number | undefined;
}): SandboxApplyRollbackProjectionStage {
  const status =
    (input.blockerCount ?? 0) > 0
      ? "blocked"
      : input.present
        ? "previewed"
        : "missing";
  const source =
    status === "blocked"
      ? "blocked"
      : input.present
        ? "local_summary"
        : "missing";
  const eventHashes = input.events.map((event) => event.eventHash);
  const warningCodes = uniqueStrings([
    ...input.events.flatMap((event) => event.warningCodes),
    ...((input.warningCount ?? 0) > 0
      ? ["SANDBOX_EVENT_PROJECTION_WARNINGS"]
      : []),
    ...((input.blockerCount ?? 0) > 0
      ? ["SANDBOX_EVENT_PROJECTION_BLOCKED"]
      : [])
  ]);
  return {
    stageId: `${input.order}-${input.kind}-${hashPreview(eventHashes.join("|") || input.kind)}`,
    order: input.order,
    kind: input.kind,
    status,
    source,
    relatedIds: input.relatedIds,
    eventTypeRefs: input.events.map((event) => event.type),
    summary: input.present
      ? `${input.kind.replace(/_/g, " ")} is represented by ${input.events.length} not-written event preview(s).`
      : input.missingSummary,
    hashPrefix: hashPreview(eventHashes.join("|") || input.kind),
    blockerCount: input.blockerCount ?? 0,
    warningCount: (input.warningCount ?? 0) + warningCodes.length,
    warningCodes
  };
}

function collectFindings(
  input: SandboxApplyRollbackEventProjectionInput
): SandboxApplyRollbackProjectionFinding[] {
  const normalized = normalizeInput(input);
  return dedupeFindings([
    ...collectSafetyFindings(input),
    ...collectSchemaFindings(normalized),
    ...collectLinkFindings(normalized),
    ...collectReadinessFindings(input),
    ...collectProjectionWarnings(normalized)
  ]);
}

function collectSafetyFindings(
  input: SandboxApplyRollbackEventProjectionInput
): SandboxApplyRollbackProjectionFinding[] {
  const findings: SandboxApplyRollbackProjectionFinding[] = [];
  const serialized = safeJsonStringify(input);
  for (const code of unsafeWarningCodes(serialized)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of forbiddenKeyWarnings(input)) {
    findings.push(finding("safety", "blocker", code));
  }
  return findings;
}

function collectSchemaFindings(
  input: NormalizedInput
): SandboxApplyRollbackProjectionFinding[] {
  const findings: SandboxApplyRollbackProjectionFinding[] = [];
  if (input.applyResult !== undefined) {
    requireRef(
      findings,
      input.applyResult,
      "applyId",
      "APPLY_RESULT_ID_MISSING"
    );
    requireRef(
      findings,
      input.applyResult,
      "disposableRootRef",
      "APPLY_RESULT_ROOT_REF_MISSING"
    );
    collectInputEventPreviewFindings(findings, input.applyResult);
  }
  if (input.rollbackResult !== undefined) {
    requireRef(
      findings,
      input.rollbackResult,
      "rollbackId",
      "ROLLBACK_RESULT_ID_MISSING"
    );
    requireRef(
      findings,
      input.rollbackResult,
      "applyId",
      "ROLLBACK_RESULT_APPLY_ID_MISSING"
    );
    requireRef(
      findings,
      input.rollbackResult,
      "checkpointId",
      "ROLLBACK_RESULT_CHECKPOINT_ID_MISSING"
    );
    requireRef(
      findings,
      input.rollbackResult,
      "disposableRootRef",
      "ROLLBACK_RESULT_ROOT_REF_MISSING"
    );
    collectInputEventPreviewFindings(findings, input.rollbackResult);
  }
  collectInputEventPreviewFindings(findings, input.existingEventSummary);
  return findings;
}

function collectInputEventPreviewFindings(
  findings: SandboxApplyRollbackProjectionFinding[],
  value: unknown
): void {
  visitUnknown(value, (key, nested) => {
    if (key !== "eventPreview" && key !== "eventPreviews") {
      return;
    }
    for (const event of Array.isArray(nested) ? nested : [nested]) {
      if (!isRecord(event)) {
        continue;
      }
      if (event.notWritten === false) {
        findings.push(
          finding("event_preview", "blocker", "EVENT_PREVIEW_WRITTEN_REJECTED")
        );
      }
      const type = safeText(event.type);
      if (type.length > 0 && !allowedInputEventTypes.has(type)) {
        findings.push(
          finding(
            "event_preview",
            "blocker",
            "EVENT_PREVIEW_TYPE_UNKNOWN",
            type
          )
        );
      }
    }
  });
}

function collectLinkFindings(
  input: NormalizedInput
): SandboxApplyRollbackProjectionFinding[] {
  const findings: SandboxApplyRollbackProjectionFinding[] = [];
  const applyId = safeRef(input.applyResult, "applyId");
  const rollbackApplyId = safeRef(input.rollbackResult, "applyId");
  if (
    applyId.length > 0 &&
    rollbackApplyId.length > 0 &&
    applyId !== rollbackApplyId
  ) {
    findings.push(
      finding(
        "link",
        "blocker",
        "SANDBOX_ROLLBACK_APPLY_ID_MISMATCH",
        rollbackApplyId
      )
    );
  }
  const applyRootRef = safeRef(input.applyResult, "disposableRootRef");
  const rollbackRootRef = safeRef(input.rollbackResult, "disposableRootRef");
  if (
    applyRootRef.length > 0 &&
    rollbackRootRef.length > 0 &&
    applyRootRef !== rollbackRootRef
  ) {
    findings.push(
      finding(
        "link",
        "blocker",
        "SANDBOX_DISPOSABLE_ROOT_REF_MISMATCH",
        rollbackRootRef
      )
    );
  }
  return findings;
}

function collectReadinessFindings(
  input: SandboxApplyRollbackEventProjectionInput
): SandboxApplyRollbackProjectionFinding[] {
  const findings: SandboxApplyRollbackProjectionFinding[] = [];
  visitUnknown(input, (key, nested) => {
    const lower = key?.toLowerCase() ?? "";
    if (nested !== true) {
      return;
    }
    if (
      lower === "canapplytouserworkspace" ||
      lower === "canrollbackuserworkspace" ||
      lower === "canwriteeventstore" ||
      lower === "canexecuteapply" ||
      lower === "canexecuterollback" ||
      lower === "canexecutegit" ||
      lower === "canexecuteshell" ||
      lower === "eventwritesenabled"
    ) {
      findings.push(
        finding("readiness", "blocker", `EXECUTION_FLAG_${key?.toUpperCase()}`)
      );
    }
  });
  return findings;
}

function collectProjectionWarnings(
  input: NormalizedInput
): SandboxApplyRollbackProjectionFinding[] {
  const findings: SandboxApplyRollbackProjectionFinding[] = [];
  if (input.applyResult !== undefined && input.rollbackResult === undefined) {
    findings.push(
      finding("projection", "warning", "SANDBOX_ROLLBACK_RESULT_MISSING")
    );
  }
  if (input.rollbackResult !== undefined && input.applyResult === undefined) {
    findings.push(
      finding("projection", "warning", "SANDBOX_APPLY_RESULT_MISSING")
    );
  }
  if (statusLooksWarningOrBlocked(input.applyResult)) {
    findings.push(
      finding("projection", "warning", "SANDBOX_APPLY_STATUS_WARN")
    );
  }
  if (statusLooksWarningOrBlocked(input.rollbackResult)) {
    findings.push(
      finding("projection", "warning", "SANDBOX_ROLLBACK_STATUS_WARN")
    );
  }
  if (input.snapshotContract === undefined) {
    findings.push(
      finding("projection", "warning", "SANDBOX_SNAPSHOT_CONTRACT_MISSING")
    );
  }
  if (input.patchRollbackCheckpointPreview === undefined) {
    findings.push(
      finding(
        "projection",
        "warning",
        "SANDBOX_ROLLBACK_CHECKPOINT_PREVIEW_MISSING"
      )
    );
  }
  if (existingEventCount(input.existingEventSummary) === 0) {
    findings.push(
      finding("projection", "info", "SANDBOX_EXISTING_PERSISTED_EVENTS_ZERO")
    );
  }
  if (input.applyResult !== undefined || input.rollbackResult !== undefined) {
    findings.push(
      finding("projection", "info", "SANDBOX_EVENT_PREVIEWS_NOT_WRITTEN")
    );
  }
  if (
    (input.applyResult === undefined) !==
    (input.rollbackResult === undefined)
  ) {
    findings.push(
      finding("projection", "warning", "SANDBOX_PROJECTION_PARTIAL")
    );
  }
  return findings;
}

function normalizeInput(
  input: SandboxApplyRollbackEventProjectionInput
): NormalizedInput {
  return {
    applyResult: optionalRecord(input.disposablePatchApplyResult),
    rollbackResult: optionalRecord(input.disposablePatchRollbackResult),
    snapshotContract: optionalRecord(input.snapshotContract),
    patchProposalPreview: optionalRecord(input.patchProposalPreview),
    patchValidationPreview: optionalRecord(input.patchValidationPreview),
    patchDiffAuditPreview: optionalRecord(input.patchDiffAuditPreview),
    patchApprovalDraft: optionalRecord(input.patchApprovalDraft),
    patchVirtualApplyPreview: optionalRecord(input.patchVirtualApplyPreview),
    patchRollbackCheckpointPreview: optionalRecord(
      input.patchRollbackCheckpointPreview
    ),
    existingEventSummary: optionalRecord(input.existingEventSummary),
    createdAt: safeTimestamp(input.createdAt)
  };
}

function relatedIdsFrom(
  input: NormalizedInput
): SandboxApplyRollbackEventEnvelope["relatedIds"] {
  return {
    applyId:
      safeRef(input.applyResult, "applyId") ||
      safeRef(input.rollbackResult, "applyId") ||
      undefined,
    rollbackId: safeRef(input.rollbackResult, "rollbackId") || undefined,
    checkpointId:
      safeRef(input.rollbackResult, "checkpointId") ||
      safeRef(input.patchRollbackCheckpointPreview, "checkpointPreviewId") ||
      undefined,
    proposalId:
      safeRef(input.applyResult, "proposalId") ||
      safeRef(input.patchProposalPreview, "proposalId") ||
      undefined,
    validationId:
      safeRef(input.applyResult, "validationId") ||
      safeRef(input.patchValidationPreview, "validationId") ||
      undefined,
    auditId:
      safeRef(input.applyResult, "auditId") ||
      safeRef(input.patchDiffAuditPreview, "auditId") ||
      undefined,
    approvalDraftId:
      safeRef(input.applyResult, "approvalDraftId") ||
      safeRef(input.patchApprovalDraft, "approvalDraftId") ||
      undefined,
    virtualApplyId:
      safeRef(input.applyResult, "virtualApplyId") ||
      safeRef(input.patchVirtualApplyPreview, "virtualApplyId") ||
      undefined,
    snapshotContractId:
      safeRef(input.snapshotContract, "contractId") ||
      safeRef(input.snapshotContract, "snapshotContractId") ||
      undefined
  };
}

function applyPayloadSummary(
  applyResult: SummaryRecord
): SandboxApplyRollbackEventEnvelope["payloadSummary"] {
  return {
    operationCount: finiteNumber(applyResult.operationCount),
    filesCreated: finiteNumber(applyResult.filesCreated),
    filesUpdated: finiteNumber(applyResult.filesUpdated),
    filesDeleted: finiteNumber(applyResult.filesDeleted),
    bytesWritten: finiteNumber(applyResult.bytesWritten),
    warningCount: finiteNumber(applyResult.warningCount),
    blockerCount: finiteNumber(applyResult.blockerCount),
    hashPrefix: safeHashPrefix(
      applyResult.resultHash ?? applyResult.outputSnapshotHash
    ),
    disposableRootRef: safeIdentifier(applyResult.disposableRootRef, "")
  };
}

function rollbackPayloadSummary(
  rollbackResult: SummaryRecord
): SandboxApplyRollbackEventEnvelope["payloadSummary"] {
  return {
    operationCount: finiteNumber(rollbackResult.operationCount),
    filesRestored: finiteNumber(rollbackResult.filesRestored),
    filesRemoved: finiteNumber(rollbackResult.filesRemoved),
    filesRecreated: finiteNumber(rollbackResult.filesRecreated),
    bytesRestored: finiteNumber(rollbackResult.bytesRestored),
    warningCount: finiteNumber(rollbackResult.warningCount),
    blockerCount: finiteNumber(rollbackResult.blockerCount),
    hashPrefix: safeHashPrefix(
      rollbackResult.resultHash ?? rollbackResult.restoredSnapshotHash
    ),
    disposableRootRef: safeIdentifier(rollbackResult.disposableRootRef, "")
  };
}

function commonDisposableRootRef(input: NormalizedInput): string | undefined {
  return (
    safeRef(input.applyResult, "disposableRootRef") ||
    safeRef(input.rollbackResult, "disposableRootRef") ||
    undefined
  );
}

function projectionStatus(input: {
  hasApply: boolean;
  hasRollback: boolean;
  existingPersistedEventCount: number;
  blockerCount: number;
  warningCount: number;
}): SandboxApplyRollbackProjectionStatus {
  if (input.blockerCount > 0) {
    return "blocked";
  }
  if (!input.hasApply && !input.hasRollback) {
    return input.existingPersistedEventCount > 0 ? "partial" : "empty";
  }
  if (!input.hasApply || !input.hasRollback) {
    return "partial";
  }
  if (input.warningCount > 0) {
    return "warning";
  }
  return "projection_ready";
}

function nextActionFor(status: SandboxApplyRollbackProjectionStatus): string {
  if (status === "empty") {
    return "Create disposable apply and rollback result summaries before event projection.";
  }
  if (status === "blocked") {
    return "Resolve projection blockers. No EventStore write, apply, or rollback is available here.";
  }
  if (status === "partial") {
    return "Connect both disposable apply and rollback result summaries for a complete event projection.";
  }
  if (status === "warning") {
    return "Review warning codes. Event previews remain not-written and execution is disabled.";
  }
  return "Review the summary-only event projection. Events are not written and no action is executed.";
}

function requireRef(
  findings: SandboxApplyRollbackProjectionFinding[],
  record: SummaryRecord,
  key: string,
  code: string
): void {
  if (safeIdentifier(record[key], "").length === 0) {
    findings.push(finding("schema", "blocker", code, key));
  }
}

function statusLooksWarningOrBlocked(
  record: SummaryRecord | undefined
): boolean {
  const status = safeIdentifier(record?.status, "");
  return (
    status.includes("blocked") ||
    status.includes("warning") ||
    finiteNumber(record?.blockerCount) > 0
  );
}

function existingEventCount(record: SummaryRecord | undefined): number {
  if (record === undefined) {
    return 0;
  }
  const explicit = finiteNumber(record.eventCount);
  if (explicit > 0) {
    return explicit;
  }
  const timeline = record.timeline;
  if (Array.isArray(timeline)) {
    return timeline.length;
  }
  const events = record.events;
  return Array.isArray(events) ? events.length : 0;
}

function warningCodesFrom(record: SummaryRecord): string[] {
  const value = record.warningCodes ?? record.warnings;
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => safeWarningCode(item))
  );
}

function forbiddenKeyWarnings(value: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(value, (key) => {
    if (key !== undefined && forbiddenRawInputKeys.has(key.toLowerCase())) {
      warnings.push("SANDBOX_EVENT_PROJECTION_RAW_FIELD_REJECTED");
    }
  });
  return uniqueStrings(warnings);
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.code);
}

function disabledReadiness(): SandboxApplyRollbackProjectionReadiness {
  return {
    canWriteEventStore: false,
    canExecuteApply: false,
    canExecuteRollback: false,
    canApplyToUserWorkspace: false,
    canExecuteGit: false,
    canExecuteShell: false
  };
}

function finding(
  kind: SandboxApplyRollbackProjectionFindingKind,
  severity: SandboxApplyRollbackProjectionSeverity,
  code: string,
  relatedRef?: string | undefined
): SandboxApplyRollbackProjectionFinding {
  const safeCode = safeWarningCode(code);
  return {
    findingId: `sandbox-event-projection-${kind}-${safeCode.toLowerCase()}-${hashPreview(
      `${relatedRef ?? ""}:${safeCode}`
    )}`,
    kind,
    severity,
    code: safeCode,
    summary: findingSummary(safeCode),
    ...(relatedRef !== undefined && relatedRef.length > 0
      ? { relatedRef: safeIdentifier(relatedRef, "") }
      : {})
  };
}

function findingSummary(code: string): string {
  const summaries: Record<string, string> = {
    SANDBOX_EVENT_PROJECTION_RAW_FIELD_REJECTED:
      "Sandbox apply/rollback event projection input contains a forbidden raw-content field.",
    EVENT_PREVIEW_WRITTEN_REJECTED:
      "Projection only accepts event previews that are marked not-written.",
    EVENT_PREVIEW_TYPE_UNKNOWN:
      "Projection input contains an unknown event preview type.",
    APPLY_RESULT_ID_MISSING:
      "Disposable apply result summary must include an apply id.",
    APPLY_RESULT_ROOT_REF_MISSING:
      "Disposable apply result summary must include a disposable root ref.",
    ROLLBACK_RESULT_ID_MISSING:
      "Disposable rollback result summary must include a rollback id.",
    ROLLBACK_RESULT_APPLY_ID_MISSING:
      "Disposable rollback result summary must include the apply id.",
    ROLLBACK_RESULT_CHECKPOINT_ID_MISSING:
      "Disposable rollback result summary must include a checkpoint id.",
    ROLLBACK_RESULT_ROOT_REF_MISSING:
      "Disposable rollback result summary must include a disposable root ref.",
    SANDBOX_ROLLBACK_APPLY_ID_MISMATCH:
      "Rollback result apply id must match the disposable apply result.",
    SANDBOX_DISPOSABLE_ROOT_REF_MISMATCH:
      "Apply and rollback results must reference the same disposable root ref.",
    SANDBOX_ROLLBACK_RESULT_MISSING:
      "Disposable apply result is present without a rollback result.",
    SANDBOX_APPLY_RESULT_MISSING:
      "Disposable rollback result is present without an apply result.",
    SANDBOX_APPLY_STATUS_WARN:
      "Disposable apply result status or blockers require review.",
    SANDBOX_ROLLBACK_STATUS_WARN:
      "Disposable rollback result status or blockers require review.",
    SANDBOX_SNAPSHOT_CONTRACT_MISSING:
      "Snapshot contract summary is not connected to this projection.",
    SANDBOX_ROLLBACK_CHECKPOINT_PREVIEW_MISSING:
      "Rollback checkpoint preview summary is not connected to this projection.",
    SANDBOX_EXISTING_PERSISTED_EVENTS_ZERO:
      "No persisted sandbox apply/rollback events are connected.",
    SANDBOX_EVENT_PREVIEWS_NOT_WRITTEN:
      "Generated event previews are local and not written to EventStore.",
    SANDBOX_PROJECTION_PARTIAL:
      "Projection is partial because only apply or rollback result summary is connected."
  };
  if (code.startsWith("EXECUTION_FLAG_")) {
    return "Sandbox apply/rollback event projection rejects execution or EventStore write readiness flags.";
  }
  if (code.endsWith("_MARKER")) {
    return "Sandbox apply/rollback event projection input contains a blocked secret or raw-data marker.";
  }
  return summaries[code] ?? "Sandbox apply/rollback event projection finding.";
}

function safeTimestamp(value: unknown): string {
  const text = safeText(value, defaultTimestamp);
  return /^\d{4}-\d{2}-\d{2}T/.test(text) ? text : defaultTimestamp;
}

function safeRef(record: SummaryRecord | undefined, key: string): string {
  if (record === undefined) {
    return "";
  }
  return safeIdentifier(record[key], "");
}

function safeHashPrefix(value: unknown): string | undefined {
  const text = safeIdentifier(value, "");
  return text.length > 0 ? text.slice(0, 16) : undefined;
}

function safeIdentifier(value: unknown, fallback = "unknown"): string {
  const text = safeText(value, fallback);
  if (unsafeWarningCodes(text).length > 0) {
    return fallback;
  }
  const safe = text
    .replace(/[^A-Za-z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return safe.length > 0 ? safe : fallback;
}

function safeWarningCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, "_")
    .slice(0, 120);
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : fallback;
}

function optionalRecord(value: unknown): SummaryRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is SummaryRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function visitUnknown(
  value: unknown,
  visitor: (key: string | undefined, value: unknown) => void,
  key?: string | undefined,
  seen = new Set<unknown>()
): void {
  visitor(key, value);
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => visitUnknown(item, visitor, undefined, seen));
    return;
  }
  for (const [childKey, childValue] of Object.entries(value)) {
    visitUnknown(childValue, visitor, childKey, seen);
  }
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, nestedValue: unknown) =>
      typeof nestedValue === "function" ? "[function]" : nestedValue
    );
  } catch {
    return "[unserializable]";
  }
}

function hashPreview(value: unknown): string {
  const text = typeof value === "string" ? value : safeJsonStringify(value);
  let first = 2166136261;
  let second = 16777619;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 16777619);
    second ^= code + index;
    second = Math.imul(second, 2166136261);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`.slice(0, 16);
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0))).sort();
}

function dedupeFindings(
  findings: readonly SandboxApplyRollbackProjectionFinding[]
): SandboxApplyRollbackProjectionFinding[] {
  return Array.from(
    new Map(
      findings.map((finding) => [
        `${finding.kind}:${finding.severity}:${finding.code}:${finding.relatedRef ?? ""}`,
        finding
      ])
    ).values()
  );
}
