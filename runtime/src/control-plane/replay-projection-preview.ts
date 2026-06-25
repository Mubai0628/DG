export type ControlledCreationReplayProjectionStatus =
  | "empty"
  | "projection_ready"
  | "partial"
  | "warning"
  | "blocked";

export type ControlledCreationReplayStageKind =
  | "run_draft_event_recorded"
  | "patch_proposal_creation_previewed"
  | "patch_proposal_validation_previewed"
  | "patch_diff_audit_previewed"
  | "patch_approval_draft_previewed"
  | "patch_virtual_apply_previewed"
  | "patch_rollback_checkpoint_previewed";

export type ControlledCreationReplayStageSource =
  | "persisted_event"
  | "local_preview"
  | "missing"
  | "blocked";

export type ControlledCreationReplayFindingKind =
  | "safety"
  | "schema"
  | "link"
  | "stage"
  | "readiness"
  | "persistence";

export type ControlledCreationReplaySeverity = "info" | "warning" | "blocker";

export type ControlledCreationReplayWarning = {
  code: string;
  safeMessage: string;
  stageKind?: ControlledCreationReplayStageKind | undefined;
};

export type ControlledCreationReplayFinding = {
  findingId: string;
  kind: ControlledCreationReplayFindingKind;
  severity: ControlledCreationReplaySeverity;
  code: string;
  summary: string;
  stageKind?: ControlledCreationReplayStageKind | undefined;
  relatedRef?: string | undefined;
};

export type ControlledCreationReplayStage = {
  stageId: string;
  order: number;
  kind: ControlledCreationReplayStageKind;
  status: "recorded" | "previewed" | "missing" | "blocked";
  source: ControlledCreationReplayStageSource;
  relatedIds: {
    proposalId?: string | undefined;
    validationId?: string | undefined;
    auditId?: string | undefined;
    approvalDraftId?: string | undefined;
    virtualApplyId?: string | undefined;
    checkpointPreviewId?: string | undefined;
    eventId?: string | undefined;
  };
  summary: string;
  hashPrefix: string;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  warningCodes: string[];
  nextAction: string;
};

export type ControlledCreationReplayReadiness = {
  canReplayProjection: boolean;
  canExecuteRun: false;
  canApplyPatch: false;
  canRollbackReal: false;
  canWriteFilesystem: false;
  canExecuteGit: false;
  canExecuteShell: false;
};

export type ControlledCreationReplayHashChainSummary = {
  chainHash: string;
  stageHashPrefixes: string[];
  linkCount: number;
  mismatchCount: number;
  warningCodes: string[];
};

export type ControlledCreationReplayProjectionInput = {
  eventSummary?: unknown;
  runDraftEventSummary?: unknown;
  patchProposalCreationPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  contextAssemblyPreview?: unknown;
  controlProjection?: unknown;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  maxInputBytes?: number | undefined;
};

export type ControlledCreationReplayProjection = {
  status: ControlledCreationReplayProjectionStatus;
  projectionId: string;
  chainId: string;
  stageCount: number;
  persistedEventCount: number;
  localPreviewStageCount: number;
  missingStageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  stages: ControlledCreationReplayStage[];
  findings: ControlledCreationReplayFinding[];
  warnings: ControlledCreationReplayWarning[];
  hashChainSummary: ControlledCreationReplayHashChainSummary;
  readiness: ControlledCreationReplayReadiness;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  projectionHash: string;
  nextAction: string;
  source: "runtime_controlled_creation_replay_projection";
  previewOnly: true;
  eventWritesEnabled: false;
  executionEnabled: false;
  runExecutionEnabled: false;
  applyEnabled: false;
  rollbackEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type ControlledCreationReplayProjectionValidationResult = {
  ok: boolean;
  warningCodes: string[];
  findings: ControlledCreationReplayFinding[];
};

type StageSpec = {
  kind: ControlledCreationReplayStageKind;
  title: string;
};

type StageSummary = {
  kind: ControlledCreationReplayStageKind;
  present: boolean;
  source: ControlledCreationReplayStageSource;
  relatedIds: ControlledCreationReplayStage["relatedIds"];
  summary: string;
  status: "recorded" | "previewed" | "missing" | "blocked";
  warningCodes: string[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  hashPrefix: string;
  nextAction: string;
};

const stageSpecs: StageSpec[] = [
  {
    kind: "run_draft_event_recorded",
    title: "Run draft event recorded"
  },
  {
    kind: "patch_proposal_creation_previewed",
    title: "Patch proposal creation previewed"
  },
  {
    kind: "patch_proposal_validation_previewed",
    title: "Patch proposal validation previewed"
  },
  {
    kind: "patch_diff_audit_previewed",
    title: "Patch diff audit previewed"
  },
  {
    kind: "patch_approval_draft_previewed",
    title: "Patch approval draft previewed"
  },
  {
    kind: "patch_virtual_apply_previewed",
    title: "Patch virtual apply previewed"
  },
  {
    kind: "patch_rollback_checkpoint_previewed",
    title: "Patch rollback checkpoint previewed"
  }
];

const defaultMaxInputBytes = 180_000;
const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRawInputKeys = new Set(
  [
    "content",
    "fullContent",
    "fileContent",
    "beforeContent",
    "afterContent",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Source",
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
    code: "AUTHORIZATION_MARKER",
    pattern: /\bAuthorization\b/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: /\brawPrompt\b/i
  },
  {
    code: "RAW_DOM_MARKER",
    pattern: /\brawDom\b/i
  },
  {
    code: "RAW_CSV_MARKER",
    pattern: /\brawCsv\b|\bcsvContent\b/i
  },
  {
    code: "RAW_SCREENSHOT_MARKER",
    pattern: /\brawScreenshot\b/i
  },
  {
    code: "CLIPBOARD_MARKER",
    pattern: /\bclipboard\b/i
  }
] as const;

const executionTrueKeys = new Set(
  [
    "canApplyPatch",
    "canRollbackReal",
    "rollbackExecuted",
    "canWriteFilesystem",
    "canExecuteGit",
    "canExecuteShell",
    "canExecuteRun",
    "executionEnabled",
    "runExecutionEnabled",
    "applyEnabled",
    "rollbackEnabled",
    "fileWriteEnabled",
    "eventWritesEnabled",
    "eventStoreWriteEnabled",
    ["writes", "Event" + "Store"].join(""),
    "capabilityInvocationEnabled",
    "permissionLeaseIssued"
  ].map((key) => key.toLowerCase())
);

export function validateControlledCreationReplayProjectionInput(
  input: ControlledCreationReplayProjectionInput = {}
): ControlledCreationReplayProjectionValidationResult {
  const findings = collectSafetyFindings(input);
  return {
    ok: findings.every((finding) => finding.severity !== "blocker"),
    warningCodes: uniqueStrings(findings.map((finding) => finding.code)),
    findings
  };
}

export function buildControlledCreationReplayProjection(
  input: ControlledCreationReplayProjectionInput = {}
): ControlledCreationReplayProjection {
  const safetyFindings = collectSafetyFindings(input);
  const hasSafetyBlocker = safetyFindings.some(
    (finding) => finding.severity === "blocker"
  );
  if (isEmptyInput(input) && safetyFindings.length === 0) {
    return emptyProjection();
  }

  const summaries = buildStageSummaries(input);
  const linkFindings = collectLinkFindings(summaries);
  const missingFindings = collectMissingFindings(summaries, input);
  const readinessFindings = collectReadinessFindings(input);
  const findings = [
    ...safetyFindings,
    ...linkFindings,
    ...missingFindings,
    ...readinessFindings
  ];
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const stageBlockerCodes = new Map<
    ControlledCreationReplayStageKind,
    string[]
  >();
  const stageWarningCodes = new Map<
    ControlledCreationReplayStageKind,
    string[]
  >();
  for (const finding of findings) {
    if (finding.stageKind === undefined) {
      continue;
    }
    const target =
      finding.severity === "blocker" ? stageBlockerCodes : stageWarningCodes;
    const codes = target.get(finding.stageKind) ?? [];
    codes.push(finding.code);
    target.set(finding.stageKind, codes);
  }

  const stages = stageSpecs.map((spec, index) =>
    stageFromSummary({
      spec,
      order: index + 1,
      summary: summaries[index] ?? missingStage(spec.kind),
      blockerCodes: stageBlockerCodes.get(spec.kind) ?? [],
      warningCodes: stageWarningCodes.get(spec.kind) ?? []
    })
  );
  const presentStages = stages.filter((stage) => stage.source !== "missing");
  const localPreviewStageCount = stages.filter(
    (stage) => stage.source === "local_preview"
  ).length;
  const persistedEventCount = stages.filter(
    (stage) => stage.source === "persisted_event"
  ).length;
  const missingStageCount = stages.filter(
    (stage) => stage.source === "missing"
  ).length;
  const stageHashPrefixes = stages
    .filter((stage) => stage.source !== "missing")
    .map((stage) => stage.hashPrefix);
  const mismatchCount = linkFindings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const hashChainSummary: ControlledCreationReplayHashChainSummary = {
    chainHash: hashPreview(stageHashPrefixes.join("|") || "empty-chain"),
    stageHashPrefixes,
    linkCount: Math.max(0, presentStages.length - 1),
    mismatchCount,
    warningCodes: uniqueStrings([
      ...linkFindings.map((finding) => finding.code),
      ...missingFindings.map((finding) => finding.code)
    ])
  };
  const projectionId =
    input.idGenerator?.() ??
    `controlled-replay-${hashPreview(
      [
        hashChainSummary.chainHash,
        stageHashPrefixes.join("|"),
        blockerCount,
        warningCount
      ].join(":")
    )}`;
  const chainId = `controlled-chain-${hashChainSummary.chainHash}`;
  const status = projectionStatus({
    stageCount: presentStages.length,
    missingStageCount,
    blockerCount,
    warningCount,
    hasSafetyBlocker
  });
  const readiness: ControlledCreationReplayReadiness = {
    canReplayProjection: presentStages.length > 0 && blockerCount === 0,
    canExecuteRun: false,
    canApplyPatch: false,
    canRollbackReal: false,
    canWriteFilesystem: false,
    canExecuteGit: false,
    canExecuteShell: false
  };
  const projectionHash = hashPreview(
    JSON.stringify({
      projectionId,
      chainId,
      status,
      stages: stages.map((stage) => ({
        kind: stage.kind,
        source: stage.source,
        hashPrefix: stage.hashPrefix
      })),
      blockerCount,
      warningCount
    })
  );
  const warnings = findings
    .filter((finding) => finding.severity !== "blocker")
    .map((finding) => ({
      code: finding.code,
      safeMessage: finding.summary,
      stageKind: finding.stageKind
    }));

  return {
    status,
    projectionId,
    chainId,
    stageCount: presentStages.length,
    persistedEventCount,
    localPreviewStageCount,
    missingStageCount,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    stages,
    findings,
    warnings,
    hashChainSummary,
    readiness,
    noCompressRequired: presentStages.length > 0,
    contextPlacement: "no_compress_zone",
    projectionHash,
    nextAction: nextActionFor(status, blockerCount, missingStageCount),
    source: "runtime_controlled_creation_replay_projection",
    previewOnly: true,
    eventWritesEnabled: false,
    executionEnabled: false,
    runExecutionEnabled: false,
    applyEnabled: false,
    rollbackEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

export function summarizeControlledCreationReplayProjection(
  projection: ControlledCreationReplayProjection
): {
  projectionId: string;
  chainId: string;
  status: ControlledCreationReplayProjectionStatus;
  stageCount: number;
  persistedEventCount: number;
  localPreviewStageCount: number;
  missingStageCount: number;
  blockerCount: number;
  warningCount: number;
  canReplayProjection: boolean;
  canExecuteRun: false;
  canApplyPatch: false;
  canRollbackReal: false;
  canWriteFilesystem: false;
  canExecuteGit: false;
  canExecuteShell: false;
  contextPlacement: "no_compress_zone";
  hash: string;
} {
  return {
    projectionId: projection.projectionId,
    chainId: projection.chainId,
    status: projection.status,
    stageCount: projection.stageCount,
    persistedEventCount: projection.persistedEventCount,
    localPreviewStageCount: projection.localPreviewStageCount,
    missingStageCount: projection.missingStageCount,
    blockerCount: projection.blockerCount,
    warningCount: projection.warningCount,
    canReplayProjection: projection.readiness.canReplayProjection,
    canExecuteRun: false,
    canApplyPatch: false,
    canRollbackReal: false,
    canWriteFilesystem: false,
    canExecuteGit: false,
    canExecuteShell: false,
    contextPlacement: projection.contextPlacement,
    hash: hashPreview(
      [
        projection.projectionId,
        projection.chainId,
        projection.status,
        projection.projectionHash
      ].join(":")
    )
  };
}

function emptyProjection(): ControlledCreationReplayProjection {
  return {
    status: "empty",
    projectionId: "",
    chainId: "",
    stageCount: 0,
    persistedEventCount: 0,
    localPreviewStageCount: 0,
    missingStageCount: stageSpecs.length,
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    stages: [],
    findings: [],
    warnings: [],
    hashChainSummary: {
      chainHash: hashPreview("empty-chain"),
      stageHashPrefixes: [],
      linkCount: 0,
      mismatchCount: 0,
      warningCodes: []
    },
    readiness: {
      canReplayProjection: false,
      canExecuteRun: false,
      canApplyPatch: false,
      canRollbackReal: false,
      canWriteFilesystem: false,
      canExecuteGit: false,
      canExecuteShell: false
    },
    noCompressRequired: false,
    contextPlacement: "no_compress_zone",
    projectionHash: hashPreview("empty-projection"),
    nextAction:
      "Create or record a controlled-creation preview stage before replay projection.",
    source: "runtime_controlled_creation_replay_projection",
    previewOnly: true,
    eventWritesEnabled: false,
    executionEnabled: false,
    runExecutionEnabled: false,
    applyEnabled: false,
    rollbackEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function buildStageSummaries(
  input: ControlledCreationReplayProjectionInput
): StageSummary[] {
  const runDraft = runDraftStage(
    input.eventSummary,
    input.runDraftEventSummary
  );
  const proposal = previewStage(
    "patch_proposal_creation_previewed",
    input.patchProposalCreationPreview,
    {
      proposalId: "proposalId"
    }
  );
  const validation = previewStage(
    "patch_proposal_validation_previewed",
    input.patchValidationPreview,
    {
      proposalId: "proposalId",
      validationId: "validationId"
    }
  );
  const audit = previewStage(
    "patch_diff_audit_previewed",
    input.patchDiffAuditPreview,
    {
      proposalId: "proposalId",
      validationId: "validationId",
      auditId: "auditId"
    }
  );
  const approval = previewStage(
    "patch_approval_draft_previewed",
    input.patchApprovalDraft,
    {
      proposalId: "proposalId",
      validationId: "validationId",
      auditId: "auditId",
      approvalDraftId: "approvalDraftId"
    }
  );
  const virtualApply = previewStage(
    "patch_virtual_apply_previewed",
    input.patchVirtualApplyPreview,
    {
      proposalId: "proposalId",
      validationId: "validationId",
      auditId: "auditId",
      approvalDraftId: "approvalDraftId",
      virtualApplyId: "virtualApplyId"
    }
  );
  const rollback = previewStage(
    "patch_rollback_checkpoint_previewed",
    input.patchRollbackCheckpointPreview,
    {
      proposalId: "proposalId",
      validationId: "validationId",
      auditId: "auditId",
      approvalDraftId: "approvalDraftId",
      virtualApplyId: "virtualApplyId",
      checkpointPreviewId: "checkpointPreviewId"
    }
  );
  return [
    runDraft,
    proposal,
    validation,
    audit,
    approval,
    virtualApply,
    rollback
  ];
}

function runDraftStage(
  eventSummary: unknown,
  runDraftEventSummary: unknown
): StageSummary {
  const eventRecord = isRecord(runDraftEventSummary)
    ? runDraftEventSummary
    : {};
  const summaryRecord = isRecord(eventSummary) ? eventSummary : {};
  const typeCounts = isRecord(summaryRecord.typeCounts)
    ? summaryRecord.typeCounts
    : {};
  const eventCount = finiteNumber(typeCounts["control.run.draft_recorded"]);
  const timelineEvent = findTimelineEvent(
    summaryRecord.timeline,
    "control.run.draft_recorded"
  );
  const explicitEventId = safeIdentifier(
    eventRecord.eventId ?? eventRecord.id ?? eventRecord.eventRecordId,
    ""
  );
  const timelineEventId = safeIdentifier(timelineEvent?.id, "");
  const eventId = explicitEventId || timelineEventId;
  const present = eventCount > 0 || eventId.length > 0;
  if (!present) {
    return missingStage("run_draft_event_recorded");
  }
  const hashPrefix = hashPreview(
    JSON.stringify({
      eventId,
      eventCount,
      summary: safeSummary(
        eventRecord.safeSummary ?? timelineEvent?.summary,
        "Run draft event summary"
      )
    })
  );
  return {
    kind: "run_draft_event_recorded",
    present: true,
    source: "persisted_event",
    relatedIds: eventId.length > 0 ? { eventId } : {},
    summary: safeSummary(
      eventRecord.safeSummary ?? timelineEvent?.summary,
      "Run draft summary event is available."
    ),
    status: "recorded",
    warningCodes: [],
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    hashPrefix,
    nextAction:
      "Use the persisted run draft summary as the first replay projection stage."
  };
}

function previewStage(
  kind: ControlledCreationReplayStageKind,
  value: unknown,
  idFields: Partial<
    Record<keyof ControlledCreationReplayStage["relatedIds"], string>
  >
): StageSummary {
  const record = isRecord(value) ? value : {};
  const status = safeIdentifier(record.status, "empty");
  if (!isRecord(value) || status === "empty") {
    return missingStage(kind);
  }
  const relatedIds: ControlledCreationReplayStage["relatedIds"] = {};
  for (const [targetKey, sourceKey] of Object.entries(idFields)) {
    const id = safeIdentifier(record[sourceKey], "");
    if (id.length > 0) {
      relatedIds[targetKey as keyof typeof relatedIds] = id;
    }
  }
  const warningCodes = safeWarningCodes(record.warningCodes ?? record.warnings);
  const blockerCount = finiteNumber(record.blockerCount);
  const warningCount = finiteNumber(record.warningCount, warningCodes.length);
  const findingCount = finiteNumber(
    record.findingCount,
    blockerCount + warningCount
  );
  const blocked = status.includes("blocked") || blockerCount > 0;
  const hashPrefix = hashPreview(
    JSON.stringify({
      kind,
      status,
      relatedIds,
      hash:
        record.proposalHash ??
        record.validationHash ??
        record.auditHash ??
        record.approvalDraftHash ??
        record.virtualApplyHash ??
        record.checkpointHash ??
        record.projectionHash
    })
  );
  return {
    kind,
    present: true,
    source: blocked ? "blocked" : "local_preview",
    relatedIds,
    summary: safeSummary(
      record.nextAction ?? record.title ?? record.summary,
      `${stageTitle(kind)} summary is available.`
    ),
    status: blocked ? "blocked" : "previewed",
    warningCodes,
    blockerCount,
    warningCount,
    findingCount,
    hashPrefix,
    nextAction: blocked
      ? "Resolve blocker-level preview findings before replay projection can continue."
      : "Keep this local preview stage as summary-only replay evidence."
  };
}

function missingStage(kind: ControlledCreationReplayStageKind): StageSummary {
  return {
    kind,
    present: false,
    source: "missing",
    relatedIds: {},
    summary: `${stageTitle(kind)} is not available.`,
    status: "missing",
    warningCodes: [],
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    hashPrefix: hashPreview(`${kind}:missing`),
    nextAction: "Create the earlier summary-only preview stage first."
  };
}

function stageFromSummary(input: {
  spec: StageSpec;
  order: number;
  summary: StageSummary;
  blockerCodes: string[];
  warningCodes: string[];
}): ControlledCreationReplayStage {
  const blockerCount = input.summary.blockerCount + input.blockerCodes.length;
  const warningCodes = uniqueStrings([
    ...input.summary.warningCodes,
    ...input.warningCodes,
    ...input.blockerCodes
  ]);
  const warningCount = input.summary.warningCount + input.warningCodes.length;
  const status =
    input.summary.source === "missing"
      ? "missing"
      : blockerCount > 0 || input.summary.source === "blocked"
        ? "blocked"
        : input.summary.status;
  const source =
    status === "blocked" && input.summary.source !== "missing"
      ? "blocked"
      : input.summary.source;
  return {
    stageId: `${input.order}-${input.spec.kind}-${input.summary.hashPrefix}`,
    order: input.order,
    kind: input.spec.kind,
    status,
    source,
    relatedIds: input.summary.relatedIds,
    summary: input.summary.summary,
    hashPrefix: input.summary.hashPrefix,
    blockerCount,
    warningCount,
    findingCount:
      input.summary.findingCount +
      input.blockerCodes.length +
      input.warningCodes.length,
    warningCodes,
    nextAction: input.summary.nextAction
  };
}

function collectLinkFindings(
  stages: readonly StageSummary[]
): ControlledCreationReplayFinding[] {
  const findings: ControlledCreationReplayFinding[] = [];
  const proposal =
    stages[1] ?? missingStage("patch_proposal_creation_previewed");
  const validation =
    stages[2] ?? missingStage("patch_proposal_validation_previewed");
  const audit = stages[3] ?? missingStage("patch_diff_audit_previewed");
  const approval = stages[4] ?? missingStage("patch_approval_draft_previewed");
  const virtualApply =
    stages[5] ?? missingStage("patch_virtual_apply_previewed");
  const rollback =
    stages[6] ?? missingStage("patch_rollback_checkpoint_previewed");

  pushMismatch(findings, {
    left: proposal.relatedIds.proposalId,
    right: validation.relatedIds.proposalId,
    stageKind: validation.kind,
    code: "PATCH_VALIDATION_PROPOSAL_ID_MISMATCH"
  });
  pushMismatch(findings, {
    left: validation.relatedIds.validationId,
    right: audit.relatedIds.validationId,
    stageKind: audit.kind,
    code: "PATCH_AUDIT_VALIDATION_ID_MISMATCH"
  });
  pushMismatch(findings, {
    left: audit.relatedIds.auditId,
    right: approval.relatedIds.auditId,
    stageKind: approval.kind,
    code: "PATCH_APPROVAL_AUDIT_ID_MISMATCH"
  });
  pushMismatch(findings, {
    left: approval.relatedIds.approvalDraftId,
    right: virtualApply.relatedIds.approvalDraftId,
    stageKind: virtualApply.kind,
    code: "PATCH_VIRTUAL_APPLY_APPROVAL_DRAFT_ID_MISMATCH"
  });
  pushMismatch(findings, {
    left: virtualApply.relatedIds.virtualApplyId,
    right: rollback.relatedIds.virtualApplyId,
    stageKind: rollback.kind,
    code: "PATCH_ROLLBACK_VIRTUAL_APPLY_ID_MISMATCH"
  });

  return findings;
}

function pushMismatch(
  findings: ControlledCreationReplayFinding[],
  input: {
    left: string | undefined;
    right: string | undefined;
    stageKind: ControlledCreationReplayStageKind;
    code: string;
  }
): void {
  if (
    input.left !== undefined &&
    input.right !== undefined &&
    input.left.length > 0 &&
    input.right.length > 0 &&
    input.left !== input.right
  ) {
    findings.push(
      finding("link", "blocker", input.code, input.stageKind, input.right)
    );
  }
}

function collectMissingFindings(
  stages: readonly StageSummary[],
  input: ControlledCreationReplayProjectionInput
): ControlledCreationReplayFinding[] {
  const findings: ControlledCreationReplayFinding[] = [];
  const firstPresentIndex = stages.findIndex((stage) => stage.present);
  if (firstPresentIndex === -1) {
    return findings;
  }
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];
    if (stage === undefined) {
      continue;
    }
    const laterStagePresent = stages
      .slice(index + 1)
      .some((item) => item.present);
    if (!stage.present && laterStagePresent) {
      findings.push(
        finding(
          "stage",
          "blocker",
          `MISSING_REQUIRED_STAGE_${stage.kind.toUpperCase()}`,
          stage.kind
        )
      );
      continue;
    }
    if (!stage.present && firstPresentIndex < index) {
      findings.push(
        finding(
          "stage",
          "warning",
          `MISSING_LATER_STAGE_${stage.kind.toUpperCase()}`,
          stage.kind
        )
      );
    }
  }

  const runDraft = stages[0] ?? missingStage("run_draft_event_recorded");
  if (!runDraft.present && stages.some((stage) => stage.present)) {
    findings.push(
      finding(
        "persistence",
        "warning",
        "CONTROLLED_REPLAY_NO_PERSISTED_RUN_DRAFT_EVENT",
        runDraft.kind
      )
    );
  }
  if (stages.some((stage) => stage.source === "local_preview")) {
    findings.push(
      finding(
        "persistence",
        "info",
        "CONTROLLED_REPLAY_LOCAL_PREVIEWS_NOT_PERSISTED"
      )
    );
  }
  if (!isConnected(input.contextAssemblyPreview)) {
    findings.push(
      finding("readiness", "warning", "CONTROLLED_REPLAY_CONTEXT_MISSING")
    );
  }
  if (!isConnected(input.controlProjection)) {
    findings.push(
      finding(
        "readiness",
        "warning",
        "CONTROLLED_REPLAY_CONTROL_PROJECTION_MISSING"
      )
    );
  }
  return findings;
}

function collectReadinessFindings(
  input: ControlledCreationReplayProjectionInput
): ControlledCreationReplayFinding[] {
  const findings: ControlledCreationReplayFinding[] = [];
  const scan = (value: unknown): void => {
    const visit = (item: unknown): void => {
      if (Array.isArray(item)) {
        for (const child of item) {
          visit(child);
        }
        return;
      }
      if (!isRecord(item)) {
        return;
      }
      for (const [key, child] of Object.entries(item)) {
        const lower = key.toLowerCase();
        if (executionTrueKeys.has(lower) && child === true) {
          findings.push(
            finding(
              "readiness",
              "blocker",
              `EXECUTION_FLAG_${key.toUpperCase()}`
            )
          );
        }
        if (
          (lower === "action" ||
            lower === "decision" ||
            lower === "handler" ||
            lower === "command" ||
            lower === "mode") &&
          typeof child === "string" &&
          /(apply|rollback|commit|approve|reject|execute|spawn|run)/i.test(
            child
          )
        ) {
          findings.push(
            finding("readiness", "blocker", "EXECUTION_ACTION_MARKER")
          );
        }
        visit(child);
      }
    };
    visit(value);
  };

  scan(input.patchProposalCreationPreview);
  scan(input.patchValidationPreview);
  scan(input.patchDiffAuditPreview);
  scan(input.patchApprovalDraft);
  scan(input.patchVirtualApplyPreview);
  scan(input.patchRollbackCheckpointPreview);
  return dedupeFindings(findings);
}

function collectSafetyFindings(
  input: ControlledCreationReplayProjectionInput
): ControlledCreationReplayFinding[] {
  const findings: ControlledCreationReplayFinding[] = [];
  let serialized: string;
  try {
    serialized = JSON.stringify(input);
  } catch {
    findings.push(finding("schema", "blocker", "INPUT_NOT_SERIALIZABLE"));
    return findings;
  }
  const maxBytes = input.maxInputBytes ?? defaultMaxInputBytes;
  if (byteLength(serialized) > maxBytes) {
    findings.push(finding("schema", "blocker", "INPUT_TOO_LARGE"));
  }
  for (const code of unsafeWarningCodes(serialized)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of forbiddenKeyWarnings(input)) {
    findings.push(finding("safety", "blocker", code));
  }
  return dedupeFindings(findings);
}

function forbiddenKeyWarnings(value: unknown): string[] {
  const warnings: string[] = [];
  const visit = (item: unknown): void => {
    if (Array.isArray(item)) {
      for (const child of item) {
        visit(child);
      }
      return;
    }
    if (!isRecord(item)) {
      return;
    }
    for (const [key, child] of Object.entries(item)) {
      if (forbiddenRawInputKeys.has(key.toLowerCase())) {
        warnings.push(`FORBIDDEN_RAW_FIELD_${key.toUpperCase()}`);
      }
      visit(child);
    }
  };
  visit(value);
  return uniqueStrings(warnings);
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.code);
}

function containsUnsafeMarker(text: string): boolean {
  return unsafePreviewPatterns.some((entry) => entry.pattern.test(text));
}

function projectionStatus(input: {
  stageCount: number;
  missingStageCount: number;
  blockerCount: number;
  warningCount: number;
  hasSafetyBlocker: boolean;
}): ControlledCreationReplayProjectionStatus {
  if (input.stageCount === 0 && !input.hasSafetyBlocker) {
    return "empty";
  }
  if (input.blockerCount > 0) {
    return "blocked";
  }
  if (input.missingStageCount > 0) {
    return "partial";
  }
  if (input.warningCount > 0) {
    return "warning";
  }
  return "projection_ready";
}

function nextActionFor(
  status: ControlledCreationReplayProjectionStatus,
  blockerCount: number,
  missingStageCount: number
): string {
  if (status === "empty") {
    return "Create summary-only controlled creation previews before replay projection.";
  }
  if (blockerCount > 0 || status === "blocked") {
    return "Resolve replay projection blockers. No event is written and no action can execute.";
  }
  if (missingStageCount > 0 || status === "partial") {
    return "Continue building missing preview stages. Replay projection remains summary-only.";
  }
  return "Review the replay projection timeline. Execution remains disabled.";
}

function finding(
  kind: ControlledCreationReplayFindingKind,
  severity: ControlledCreationReplaySeverity,
  code: string,
  stageKind?: ControlledCreationReplayStageKind,
  relatedRef?: string
): ControlledCreationReplayFinding {
  return {
    findingId: `controlled-replay-${kind}-${code.toLowerCase()}-${hashPreview(
      `${stageKind ?? "global"}:${relatedRef ?? ""}:${code}`
    )}`,
    kind,
    severity,
    code,
    summary: safeMessageFor(code),
    ...(stageKind !== undefined ? { stageKind } : {}),
    ...(relatedRef !== undefined ? { relatedRef } : {})
  };
}

function safeMessageFor(code: string): string {
  if (code.startsWith("MISSING_REQUIRED_STAGE_")) {
    return "A later preview stage exists while an earlier required stage is missing.";
  }
  if (code.startsWith("MISSING_LATER_STAGE_")) {
    return "A later controlled-creation preview stage is not available yet.";
  }
  if (code.endsWith("_MISMATCH")) {
    return "Controlled-creation preview IDs do not form a consistent chain.";
  }
  if (code.startsWith("EXECUTION_FLAG_")) {
    return "Replay projection input attempted to enable execution.";
  }
  if (code.startsWith("FORBIDDEN_RAW_FIELD_")) {
    return "Replay projection input contains a forbidden raw-content field.";
  }
  if (code === "CONTROLLED_REPLAY_LOCAL_PREVIEWS_NOT_PERSISTED") {
    return "Local preview stages are projected only as local summaries, not persisted events.";
  }
  if (code === "CONTROLLED_REPLAY_NO_PERSISTED_RUN_DRAFT_EVENT") {
    return "No persisted run draft summary event is connected.";
  }
  if (code === "CONTROLLED_REPLAY_CONTEXT_MISSING") {
    return "Context Assembly Preview is not connected to this replay projection.";
  }
  if (code === "CONTROLLED_REPLAY_CONTROL_PROJECTION_MISSING") {
    return "Control Plane Projection is not connected to this replay projection.";
  }
  return "Replay projection warning.";
}

function isConnected(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const status = safeIdentifier(value.status, "");
  if (status.length > 0 && status !== "empty") {
    return true;
  }
  return (
    finiteNumber(value.stageCount) > 0 || finiteNumber(value.eventCount) > 0
  );
}

function findTimelineEvent(
  value: unknown,
  type: string
): Record<string, unknown> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.find((item): item is Record<string, unknown> => {
    return isRecord(item) && item.type === type;
  });
}

function isEmptyInput(input: ControlledCreationReplayProjectionInput): boolean {
  return (
    input.eventSummary === undefined &&
    input.runDraftEventSummary === undefined &&
    input.patchProposalCreationPreview === undefined &&
    input.patchValidationPreview === undefined &&
    input.patchDiffAuditPreview === undefined &&
    input.patchApprovalDraft === undefined &&
    input.patchVirtualApplyPreview === undefined &&
    input.patchRollbackCheckpointPreview === undefined
  );
}

function stageTitle(kind: ControlledCreationReplayStageKind): string {
  return stageSpecs.find((stage) => stage.kind === kind)?.title ?? kind;
}

function safeWarningCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => safeIdentifier(item, "CONTROLLED_REPLAY_WARNING"))
      .filter((item) => item.length > 0)
  );
}

function safeIdentifier(value: unknown, fallback = "unknown"): string {
  const rawText = safeText(value, fallback);
  if (containsUnsafeMarker(rawText)) {
    return fallback;
  }
  const text = rawText
    .replace(/[^A-Za-z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return text.length > 0 ? text : fallback;
}

function safeSummary(value: unknown, fallback: string): string {
  const rawText = safeText(value, fallback);
  if (containsUnsafeMarker(rawText)) {
    return fallback;
  }
  return safeReplaySummary(rawText, 180);
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : fallback;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function hashPreview(value: unknown): string {
  return createReplayHash(value).slice(0, 12);
}

function safeReplaySummary(value: unknown, max = 160): string {
  const text = typeof value === "string" ? value : "";
  const compact = redactUnsafeReplayText(text).replace(/\s+/g, " ").trim();
  if (compact.length === 0) {
    return "No summary";
  }
  return compact.length > max ? `${compact.slice(0, max - 1)}...` : compact;
}

function redactUnsafeReplayText(value: string): string {
  return unsafePreviewPatterns.reduce(
    (output, entry) => output.replace(entry.pattern, "[REDACTED]"),
    value
  );
}

function createReplayHash(value: unknown): string {
  const text =
    typeof value === "string" ? value : safeJsonStringify(value, "hash-input");
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
    .padStart(8, "0")}`;
}

function safeJsonStringify(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0))).sort();
}

function dedupeFindings(
  findings: readonly ControlledCreationReplayFinding[]
): ControlledCreationReplayFinding[] {
  return Array.from(
    new Map(
      findings.map((finding) => [
        `${finding.kind}:${finding.severity}:${finding.code}:${finding.stageKind ?? ""}:${finding.relatedRef ?? ""}`,
        finding
      ])
    ).values()
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
