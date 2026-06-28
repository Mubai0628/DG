import type { AppApprovalExecutionDesignView } from "./app-approval-execution-design-view.js";
import type { AppControlledCreationReplayProjectionView } from "./controlled-creation-replay-projection-view.js";
import type { ModelPatchProposalImportView } from "./model-patch-proposal-import-view.js";
import type { AppPatchApprovalDraftView } from "./patch-approval-draft-view.js";
import type { AppPatchDiffAuditPreviewView } from "./patch-diff-audit-preview-view.js";
import type { AppPatchProposalCreationPreviewView } from "./patch-proposal-creation-preview-view.js";
import type { AppPatchProposalValidationPreviewView } from "./patch-proposal-validation-preview-view.js";
import type { AppPatchRollbackCheckpointPreviewView } from "./patch-rollback-checkpoint-preview-view.js";
import type { AppPatchVirtualApplyPreviewView } from "./patch-virtual-apply-preview-view.js";
import { safeArray, safeErrorMessage, safeText } from "./safety.js";
import type { AppUserWorkspaceApplyPrototypeView } from "./user-workspace-apply-prototype-view.js";
import type { AppUserWorkspaceEventWriterView } from "./user-workspace-event-writer-view.js";
import type { AppUserWorkspacePromotionReadinessView } from "./user-workspace-promotion-readiness-view.js";
import type { AppUserWorkspaceRollbackPrototypeView } from "./user-workspace-rollback-prototype-view.js";
import type { AppUserWorkspaceSnapshotBackupView } from "./user-workspace-snapshot-backup-view.js";
import type {
  AppWorkbenchApprovalRef,
  AppWorkbenchSurfacesInput
} from "./workbench-surfaces.js";

export type ModelProposalChainIntegrationStatus =
  | "empty"
  | "chain_ready"
  | "partial"
  | "warning"
  | "blocked";

export type ModelProposalChainStageKind =
  | "model_proposal_import"
  | "patch_proposal_creation_preview"
  | "patch_validation_preview"
  | "patch_diff_audit_preview"
  | "patch_approval_draft"
  | "patch_virtual_apply_preview"
  | "patch_rollback_checkpoint_preview"
  | "controlled_creation_replay_projection"
  | "user_workspace_snapshot_backup_contract"
  | "user_workspace_promotion_readiness"
  | "user_workspace_apply_prototype_disabled"
  | "user_workspace_rollback_prototype_disabled"
  | "user_workspace_event_writer_runtime_only"
  | "app_approval_execution_disabled";

export type ModelProposalChainStageStatus =
  | "completed"
  | "missing"
  | "warning"
  | "blocked"
  | "disabled"
  | "runtime_only";

export type ModelProposalChainStage = {
  stageId: string;
  kind: ModelProposalChainStageKind;
  label: string;
  status: ModelProposalChainStageStatus;
  refId: string;
  summary: string;
  warningCodes: string[];
};

export type ModelProposalChainFinding = {
  code: string;
  severity: "blocker" | "warning";
  stageKind?: ModelProposalChainStageKind | undefined;
  safeMessage: string;
};

export type ModelProposalChainSummary = {
  status: ModelProposalChainIntegrationStatus;
  chainId: string;
  proposalId: string;
  stageCount: number;
  completedStageCount: number;
  missingStageCount: number;
  blockerCount: number;
  warningCount: number;
  chainHash: string;
  nextAction: string;
};

export type ModelProposalChainIntegrationView = {
  status: ModelProposalChainIntegrationStatus;
  chainId: string;
  proposalId?: string | undefined;
  stageCount: number;
  completedStageCount: number;
  missingStageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  stages: ModelProposalChainStage[];
  findings: ModelProposalChainFinding[];
  chainHash: string;
  readiness: {
    canEnterExistingPreviewChain: boolean;
    canExecuteApply: false;
    canExecuteRollback: false;
    canWriteFilesystem: false;
    canWriteEventStore: false;
    canApprove: false;
    canIssuePermissionLease: false;
    canExecuteGit: false;
    canExecuteShell: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "app_model_proposal_chain_integration";
};

export type ModelProposalChainIntegrationInput = {
  modelImportView?: ModelPatchProposalImportView | undefined;
  patchProposalCreationPreview?:
    | AppPatchProposalCreationPreviewView
    | undefined;
  patchValidationPreview?: AppPatchProposalValidationPreviewView | undefined;
  patchDiffAuditPreview?: AppPatchDiffAuditPreviewView | undefined;
  patchApprovalDraft?: AppPatchApprovalDraftView | undefined;
  patchVirtualApplyPreview?: AppPatchVirtualApplyPreviewView | undefined;
  patchRollbackCheckpointPreview?:
    | AppPatchRollbackCheckpointPreviewView
    | undefined;
  controlledCreationReplayProjection?:
    | AppControlledCreationReplayProjectionView
    | undefined;
  userWorkspaceSnapshotBackupContract?:
    | AppUserWorkspaceSnapshotBackupView
    | undefined;
  userWorkspacePromotionReadiness?:
    | AppUserWorkspacePromotionReadinessView
    | undefined;
  userWorkspaceApplyPrototype?: AppUserWorkspaceApplyPrototypeView | undefined;
  userWorkspaceRollbackPrototype?:
    | AppUserWorkspaceRollbackPrototypeView
    | undefined;
  userWorkspaceApplyRollbackEventWriter?:
    | AppUserWorkspaceEventWriterView
    | undefined;
  appApprovalExecutionDesign?: AppApprovalExecutionDesignView | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const rawPrefix = "raw";
const forbiddenKeys = new Set(
  [
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
    "contentDraft",
    "apiKey",
    "Authorization",
    "env",
    "stdout",
    "stderr"
  ].map((key) => key.toLowerCase())
);

const executionReadinessKeys = new Set(
  [
    "canApplyPatch",
    "canExecuteApply",
    "canExecuteRollback",
    "canWriteFilesystem",
    "canWriteEventStore",
    "canApprove",
    "canReject",
    "canIssuePermissionLease",
    "canIssueLease",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "applyButtonEnabled",
    "rollbackButtonEnabled",
    "eventWriteButtonEnabled",
    "approvalExecutionEnabled",
    "appExecutionConnected",
    "userWorkspaceMutationEnabled"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
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
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  }
];

export function buildModelProposalChainIntegrationView(
  input: ModelProposalChainIntegrationInput = {}
): ModelProposalChainIntegrationView {
  const inputFindings = inputFindingsFrom(input);
  const modelImport = input.modelImportView;
  const proposalId = modelImport?.preview?.proposalId;
  const downstreamProposalId = firstDownstreamProposalId(input) ?? proposalId;

  if (modelImport === undefined || modelImport.status === "empty") {
    return resultFrom({
      proposalId,
      stages: [],
      findings: inputFindings,
      importCanEnterChain: false,
      forcedStatus: inputFindings.some(
        (finding) => finding.severity === "blocker"
      )
        ? "blocked"
        : "empty"
    });
  }

  if (
    modelImport.status === "blocked" ||
    !modelImport.readiness.canImportToPatchPreview
  ) {
    const importStage = stage({
      kind: "model_proposal_import",
      label: "Model proposal import",
      status: "blocked",
      refId: modelImport.importId,
      summary:
        "Blocked model proposal import. Chain integration does not advance.",
      warningCodes: modelImport.findings.map((finding) => finding.code)
    });
    return resultFrom({
      proposalId,
      stages: [importStage],
      findings: [
        ...inputFindings,
        finding(
          "MODEL_IMPORT_BLOCKED",
          "blocker",
          "Blocked model proposal import cannot enter chain integration.",
          "model_proposal_import"
        )
      ],
      importCanEnterChain: false
    });
  }

  const stages = buildStages(input, downstreamProposalId ?? "n/a");
  const findings = [
    ...inputFindings,
    ...missingStageFindings(stages),
    ...idMismatchFindings(stages, downstreamProposalId),
    ...blockedStageFindings(stages)
  ];

  return resultFrom({
    proposalId,
    stages,
    findings,
    importCanEnterChain: true
  });
}

export function summarizeModelProposalChainIntegrationView(
  view: ModelProposalChainIntegrationView
): ModelProposalChainSummary {
  return {
    status: view.status,
    chainId: view.chainId,
    proposalId: view.proposalId ?? "n/a",
    stageCount: view.stageCount,
    completedStageCount: view.completedStageCount,
    missingStageCount: view.missingStageCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    chainHash: view.chainHash,
    nextAction: view.nextAction
  };
}

export function modelProposalChainIntegrationSurfaceSummaries(
  view: ModelProposalChainIntegrationView | undefined
): AppWorkbenchSurfacesInput["patchProposalSummaries"] {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "blocked"
  ) {
    return [];
  }
  return [
    {
      proposalId: view.proposalId ?? view.chainId,
      title: "Model proposal chain integration",
      status: view.status,
      riskLevel:
        view.warningCount > 0 || view.missingStageCount > 0
          ? "A2_model_chain_warning"
          : "A1_model_chain",
      requiresApproval: true,
      filesChanged: view.stageCount,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      linesAdded: 0,
      linesRemoved: 0,
      pathSummaries: view.stages.map((item) => `${item.kind}:${item.status}`),
      warningCodes: modelProposalChainIntegrationWarningCodes(view),
      hash: view.chainHash,
      fingerprint: view.chainHash,
      suggestedNextAction:
        "Review model proposal chain summary only. App execution is disabled."
    }
  ];
}

export function modelProposalChainIntegrationApprovalRefs(
  view: ModelProposalChainIntegrationView | undefined
): AppWorkbenchApprovalRef[] {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "blocked"
  ) {
    return [];
  }
  return [
    {
      id: `model-chain-${view.proposalId ?? view.chainId}`,
      label: "Model proposal chain",
      kind: "patch",
      status: "dry",
      summary:
        "Model proposal chain is read-only. Approval execution remains disabled."
    }
  ];
}

export function modelProposalChainIntegrationWarningCodes(
  view: ModelProposalChainIntegrationView | undefined
): string[] {
  if (view === undefined) {
    return [];
  }
  return uniqueStrings([
    ...view.findings.map((finding) => finding.code),
    ...view.stages.flatMap((stage) => stage.warningCodes)
  ]);
}

function buildStages(
  input: ModelProposalChainIntegrationInput,
  expectedProposalId: string
): ModelProposalChainStage[] {
  return [
    modelImportStage(input.modelImportView),
    previewStage(
      "patch_proposal_creation_preview",
      "Patch Proposal Creation Preview",
      input.patchProposalCreationPreview,
      "proposalId",
      expectedProposalId
    ),
    previewStage(
      "patch_validation_preview",
      "Patch Proposal Validation Preview",
      input.patchValidationPreview,
      "validationId",
      expectedProposalId
    ),
    previewStage(
      "patch_diff_audit_preview",
      "Patch Diff Audit Preview",
      input.patchDiffAuditPreview,
      "auditId",
      expectedProposalId
    ),
    previewStage(
      "patch_approval_draft",
      "Patch Approval Draft",
      input.patchApprovalDraft,
      "approvalDraftId",
      expectedProposalId
    ),
    previewStage(
      "patch_virtual_apply_preview",
      "Patch Virtual Apply Preview",
      input.patchVirtualApplyPreview,
      "virtualApplyId",
      expectedProposalId
    ),
    previewStage(
      "patch_rollback_checkpoint_preview",
      "Patch Rollback Checkpoint Preview",
      input.patchRollbackCheckpointPreview,
      "checkpointPreviewId",
      expectedProposalId
    ),
    previewStage(
      "controlled_creation_replay_projection",
      "Controlled Creation Replay Projection",
      input.controlledCreationReplayProjection,
      "projectionId",
      expectedProposalId
    ),
    previewStage(
      "user_workspace_snapshot_backup_contract",
      "User Workspace Snapshot / Backup Contract",
      input.userWorkspaceSnapshotBackupContract,
      "contractId",
      expectedProposalId
    ),
    previewStage(
      "user_workspace_promotion_readiness",
      "User Workspace Promotion Readiness",
      input.userWorkspacePromotionReadiness,
      "readinessId",
      expectedProposalId
    ),
    disabledStage(
      "user_workspace_apply_prototype_disabled",
      "User Workspace Apply Prototype",
      input.userWorkspaceApplyPrototype,
      "readinessId"
    ),
    disabledStage(
      "user_workspace_rollback_prototype_disabled",
      "User Workspace Rollback Prototype",
      input.userWorkspaceRollbackPrototype,
      "checkpointId"
    ),
    disabledStage(
      "user_workspace_event_writer_runtime_only",
      "User Workspace Apply / Rollback Event Writer",
      input.userWorkspaceApplyRollbackEventWriter,
      "source"
    ),
    disabledStage(
      "app_approval_execution_disabled",
      "App Approval Execution Design",
      input.appApprovalExecutionDesign,
      "source"
    )
  ];
}

function firstDownstreamProposalId(
  input: ModelProposalChainIntegrationInput
): string | undefined {
  for (const value of [
    input.patchProposalCreationPreview,
    input.patchValidationPreview,
    input.patchDiffAuditPreview,
    input.patchApprovalDraft,
    input.patchVirtualApplyPreview,
    input.patchRollbackCheckpointPreview,
    input.controlledCreationReplayProjection
  ]) {
    if (!isRecord(value)) {
      continue;
    }
    const proposalId = safeRef(value, "proposalId");
    if (proposalId.length > 0) {
      return proposalId;
    }
  }
  return undefined;
}

function modelImportStage(
  view: ModelPatchProposalImportView | undefined
): ModelProposalChainStage {
  if (view === undefined || view.status === "empty") {
    return missingStage("model_proposal_import", "Model proposal import");
  }
  return stage({
    kind: "model_proposal_import",
    label: "Model proposal import",
    status: view.status === "warning" ? "warning" : "completed",
    refId: view.importId,
    summary: [
      view.status,
      `proposal:${view.preview?.proposalId ?? "n/a"}`,
      `operations:${view.preview?.operationCount ?? 0}`,
      `files:${view.preview?.fileCount ?? 0}`
    ].join(" | "),
    warningCodes: [
      ...view.findings.map((finding) => finding.code),
      ...(view.preview?.warningCodes ?? [])
    ]
  });
}

function previewStage(
  kind: ModelProposalChainStageKind,
  label: string,
  value: unknown,
  refKey: string,
  expectedProposalId: string
): ModelProposalChainStage {
  if (!isPresentStage(value)) {
    return missingStage(kind, label);
  }
  const record = isRecord(value) ? value : {};
  const rawStatus = safeText(record.status, "summary");
  const status =
    rawStatus === "blocked"
      ? "blocked"
      : rawStatus === "warning"
        ? "warning"
        : "completed";
  const refId = safeRef(record, refKey) || safeRef(record, "proposalId");
  const proposalId = safeRef(record, "proposalId");
  const warningCodes = warningCodesFrom(record);
  return stage({
    kind,
    label,
    status,
    refId: refId || `${kind}-summary`,
    summary: [
      `status:${rawStatus}`,
      `proposal:${proposalId || expectedProposalId}`,
      `ref:${refId || "n/a"}`
    ].join(" | "),
    warningCodes
  });
}

function disabledStage(
  kind: ModelProposalChainStageKind,
  label: string,
  value: unknown,
  refKey: string
): ModelProposalChainStage {
  if (!isRecord(value)) {
    return missingStage(kind, label);
  }
  const blocked = executionClaimFindings(value).length > 0;
  const status: ModelProposalChainStageStatus = blocked
    ? "blocked"
    : kind === "user_workspace_event_writer_runtime_only"
      ? "runtime_only"
      : "disabled";
  return stage({
    kind,
    label,
    status,
    refId: safeRef(value, refKey) || safeRef(value, "source") || kind,
    summary: blocked
      ? "Execution claim detected; stage is blocked."
      : "Runtime-only or disabled App surface. No execution control is connected.",
    warningCodes: warningCodesFrom(value)
  });
}

function missingStage(
  kind: ModelProposalChainStageKind,
  label: string
): ModelProposalChainStage {
  return stage({
    kind,
    label,
    status: "missing",
    refId: "n/a",
    summary: "Stage summary is not connected yet.",
    warningCodes: [`MODEL_CHAIN_${kind.toUpperCase()}_MISSING`]
  });
}

function stage(args: {
  kind: ModelProposalChainStageKind;
  label: string;
  status: ModelProposalChainStageStatus;
  refId: string;
  summary: string;
  warningCodes: string[];
}): ModelProposalChainStage {
  return {
    stageId: `${args.kind}-${hashText(
      `${args.status}:${args.refId}:${args.summary}`
    ).slice(0, 10)}`,
    kind: args.kind,
    label: args.label,
    status: args.status,
    refId: safeErrorMessage(args.refId).slice(0, 120),
    summary: safeErrorMessage(args.summary).slice(0, 240),
    warningCodes: uniqueStrings(args.warningCodes.map(safeCode))
  };
}

function resultFrom(args: {
  proposalId?: string | undefined;
  stages: readonly ModelProposalChainStage[];
  findings: readonly ModelProposalChainFinding[];
  importCanEnterChain: boolean;
  forcedStatus?: ModelProposalChainIntegrationStatus | undefined;
}): ModelProposalChainIntegrationView {
  const findings = uniqueFindings(args.findings);
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningFindingCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const stageWarningCount = args.stages.filter(
    (stageItem) =>
      stageItem.status === "warning" ||
      stageItem.status === "missing" ||
      stageItem.warningCodes.length > 0
  ).length;
  const missingStageCount = args.stages.filter(
    (stageItem) => stageItem.status === "missing"
  ).length;
  const completedStageCount = args.stages.filter(
    (stageItem) =>
      stageItem.status !== "missing" && stageItem.status !== "blocked"
  ).length;
  const warningCount = warningFindingCount + stageWarningCount;
  const chainHash = hashText(
    JSON.stringify({
      proposalId: args.proposalId,
      stages: args.stages.map((stageItem) => [
        stageItem.kind,
        stageItem.status,
        stageItem.refId
      ]),
      blockers: blockerCount,
      warnings: warningCount
    })
  );
  const status =
    args.forcedStatus ??
    statusFrom({
      stageCount: args.stages.length,
      blockerCount,
      missingStageCount,
      warningCount
    });

  return {
    status,
    chainId: `model-proposal-chain-${chainHash.slice(0, 12)}`,
    proposalId: args.proposalId,
    stageCount: args.stages.length,
    completedStageCount,
    missingStageCount,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    stages: [...args.stages],
    findings,
    chainHash,
    readiness: {
      canEnterExistingPreviewChain:
        args.importCanEnterChain && blockerCount === 0,
      canExecuteApply: false,
      canExecuteRollback: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      canApprove: false,
      canIssuePermissionLease: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status),
    source: "app_model_proposal_chain_integration"
  };
}

function statusFrom(args: {
  stageCount: number;
  blockerCount: number;
  missingStageCount: number;
  warningCount: number;
}): ModelProposalChainIntegrationStatus {
  if (args.blockerCount > 0) {
    return "blocked";
  }
  if (args.stageCount === 0) {
    return "empty";
  }
  if (args.missingStageCount > 0) {
    return "partial";
  }
  if (args.warningCount > 0) {
    return "warning";
  }
  return "chain_ready";
}

function nextActionFor(status: ModelProposalChainIntegrationStatus): string {
  if (status === "empty") {
    return "Import a model_patch_proposal draft before previewing chain integration.";
  }
  if (status === "blocked") {
    return "Resolve blocker finding codes before the model proposal can enter the preview chain.";
  }
  if (status === "partial") {
    return "Preview remaining validation, audit, approval, rollback, replay, and readiness stages. No execution is enabled.";
  }
  if (status === "warning") {
    return "Review chain warning codes. The App Shell still cannot execute approval, apply, rollback, or event writes.";
  }
  return "Review the complete summary chain. Execution remains disabled.";
}

function missingStageFindings(
  stages: readonly ModelProposalChainStage[]
): ModelProposalChainFinding[] {
  return stages
    .filter((stageItem) => stageItem.status === "missing")
    .map((stageItem) =>
      finding(
        `MODEL_CHAIN_${stageItem.kind.toUpperCase()}_MISSING`,
        "warning",
        `${stageItem.label} is not connected yet.`,
        stageItem.kind
      )
    );
}

function blockedStageFindings(
  stages: readonly ModelProposalChainStage[]
): ModelProposalChainFinding[] {
  return stages
    .filter((stageItem) => stageItem.status === "blocked")
    .map((stageItem) =>
      finding(
        `MODEL_CHAIN_${stageItem.kind.toUpperCase()}_BLOCKED`,
        "blocker",
        `${stageItem.label} is blocked.`,
        stageItem.kind
      )
    );
}

function idMismatchFindings(
  stages: readonly ModelProposalChainStage[],
  expectedProposalId: string | undefined
): ModelProposalChainFinding[] {
  if (expectedProposalId === undefined || expectedProposalId.length === 0) {
    return [];
  }
  return stages.flatMap((stageItem) => {
    if (stageItem.kind === "model_proposal_import") {
      return [];
    }
    const match = stageItem.summary.match(/proposal:([^|]+)/);
    const proposalId = match?.[1]?.trim();
    if (
      proposalId === undefined ||
      proposalId === "n/a" ||
      proposalId === expectedProposalId
    ) {
      return [];
    }
    return [
      finding(
        "MODEL_CHAIN_PROPOSAL_ID_MISMATCH",
        "blocker",
        `${stageItem.label} proposal id does not match the imported model proposal.`,
        stageItem.kind
      )
    ];
  });
}

function inputFindingsFrom(
  input: ModelProposalChainIntegrationInput
): ModelProposalChainFinding[] {
  return [
    ...rawFieldFindings(input),
    ...unsafeStringFindings(input),
    ...executionClaimFindings(input)
  ];
}

function rawFieldFindings(value: unknown): ModelProposalChainFinding[] {
  const findings: ModelProposalChainFinding[] = [];
  walk(value, (key, nested) => {
    if (key !== undefined && forbiddenKeys.has(key.toLowerCase())) {
      findings.push(
        finding(
          "MODEL_CHAIN_FORBIDDEN_RAW_FIELD",
          "blocker",
          "Raw or secret-like fields are not allowed in model proposal chain integration."
        )
      );
    }
    if (typeof nested === "string") {
      for (const { code, pattern } of unsafeStringPatterns) {
        if (pattern.test(nested)) {
          findings.push(
            finding(
              `MODEL_CHAIN_${code}`,
              "blocker",
              "Unsafe string marker detected in model proposal chain input."
            )
          );
        }
      }
    }
  });
  return uniqueFindings(findings);
}

function unsafeStringFindings(value: unknown): ModelProposalChainFinding[] {
  const findings: ModelProposalChainFinding[] = [];
  walk(value, (_key, nested) => {
    if (typeof nested !== "string") {
      return;
    }
    for (const { code, pattern } of unsafeStringPatterns) {
      if (pattern.test(nested)) {
        findings.push(
          finding(
            `MODEL_CHAIN_${code}`,
            "blocker",
            "Unsafe string marker detected in model proposal chain input."
          )
        );
      }
    }
  });
  return uniqueFindings(findings);
}

function executionClaimFindings(value: unknown): ModelProposalChainFinding[] {
  const findings: ModelProposalChainFinding[] = [];
  walk(value, (key, nested) => {
    if (
      key !== undefined &&
      executionReadinessKeys.has(key.toLowerCase()) &&
      nested === true
    ) {
      findings.push(
        finding(
          "MODEL_CHAIN_EXECUTION_FLAG_TRUE",
          "blocker",
          "Execution readiness flags must remain false in model proposal chain integration."
        )
      );
    }
  });
  return uniqueFindings(findings);
}

function isPresentStage(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const status = safeText(value.status, "");
  return status.length > 0 && status !== "empty";
}

function warningCodesFrom(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }
  return uniqueStrings([
    ...safeArray(value.warningCodes).map((item) =>
      safeCode(safeText(item, ""))
    ),
    ...safeArray(value.warnings).map((item) =>
      isRecord(item)
        ? safeCode(safeText(item.code, ""))
        : safeCode(safeText(item, ""))
    )
  ]).filter((code) => code.length > 0);
}

function safeRef(record: Record<string, unknown>, key: string): string {
  return safeErrorMessage(safeText(record[key], "")).slice(0, 120);
}

function finding(
  code: string,
  severity: "blocker" | "warning",
  safeMessage: string,
  stageKind?: ModelProposalChainStageKind
): ModelProposalChainFinding {
  const base = {
    code: safeCode(code),
    severity,
    safeMessage: safeErrorMessage(safeMessage)
  };
  return stageKind === undefined ? base : { ...base, stageKind };
}

function safeCode(value: string): string {
  const code = value
    .trim()
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .toUpperCase();
  return /^[A-Z0-9_.-]{1,120}$/.test(code) ? code : "MODEL_CHAIN_WARNING";
}

function walk(
  value: unknown,
  visitor: (key: string | undefined, value: unknown) => void,
  key?: string
): void {
  visitor(key, value);
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visitor);
    }
    return;
  }
  if (isRecord(value)) {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      walk(nestedValue, visitor, nestedKey);
    }
  }
}

function uniqueFindings(
  findings: readonly ModelProposalChainFinding[]
): ModelProposalChainFinding[] {
  const byKey = new Map<string, ModelProposalChainFinding>();
  for (const item of findings) {
    byKey.set(`${item.severity}:${item.code}:${item.stageKind ?? ""}`, item);
  }
  return [...byKey.values()];
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0)
    .toString(16)
    .padStart(12, "0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
