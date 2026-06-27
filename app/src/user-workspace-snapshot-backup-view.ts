import {
  buildUserWorkspaceSnapshotBackupContract,
  type UserWorkspaceBackupRequirement,
  type UserWorkspaceDirectorySummary,
  type UserWorkspaceFileSummary,
  type UserWorkspaceSnapshotBackupContract,
  type UserWorkspaceSnapshotFinding,
  type UserWorkspaceSnapshotPolicy,
  type UserWorkspaceSnapshotReadiness,
  type UserWorkspaceSnapshotStatus
} from "../../runtime/src/execution/user-workspace/user-workspace-snapshot-backup-contract.js";
import { safeArray, safeErrorMessage, safeText } from "./safety.js";
import type { AppWorkspaceIndexBridgeView } from "./workspace-index-bridge-view.js";

export type AppUserWorkspaceSnapshotStatus = UserWorkspaceSnapshotStatus;

export type AppUserWorkspaceSnapshotFindingView = {
  findingId: string;
  kind: UserWorkspaceSnapshotFinding["kind"];
  severity: UserWorkspaceSnapshotFinding["severity"];
  code: string;
  summary: string;
  path?: string | undefined;
};

export type AppUserWorkspaceSnapshotBackupView = {
  status: AppUserWorkspaceSnapshotStatus;
  contractId: string;
  userWorkspaceRootRef: string;
  sourceWorkspaceFingerprint: string;
  disposableApplyResultRef?: string | undefined;
  disposableRollbackResultRef?: string | undefined;
  disposableSnapshotContractRef?: string | undefined;
  expectedDisposableOutputHash?: string | undefined;
  expectedUserSnapshotHash?: string | undefined;
  fileCount: number;
  directoryCount: number;
  totalBytes: number;
  plannedMutationCount: number;
  backupRequiredCount: number;
  preimageHashRequiredCount: number;
  generatedFileCount: number;
  binaryFileCount: number;
  symlinkLikeCount: number;
  files: UserWorkspaceFileSummary[];
  directories: UserWorkspaceDirectorySummary[];
  backupRequirements: UserWorkspaceBackupRequirement[];
  policy: UserWorkspaceSnapshotPolicy;
  findings: AppUserWorkspaceSnapshotFindingView[];
  warningCodes: string[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: UserWorkspaceSnapshotReadiness;
  contractHash: string;
  nextAction: string;
  source: "runtime_user_workspace_snapshot_backup_contract" | "empty";
  metadataOnly: true;
  applyEnabled: false;
  rollbackEnabled: false;
  backupFileCreationEnabled: false;
  preimageCaptureEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type AppUserWorkspaceSnapshotBackupInput = {
  userWorkspaceRootRef?: string | undefined;
  sourceWorkspaceFingerprint?: string | undefined;
  fileSummaryJsonText?: string | undefined;
  workspaceIndexRef?: AppWorkspaceIndexBridgeView | undefined;
  disposableApplyResultRef?: string | undefined;
  disposableRollbackResultRef?: string | undefined;
  disposableSnapshotContractRef?: string | undefined;
  expectedDisposableOutputHash?: string | undefined;
  expectedUserSnapshotHash?: string | undefined;
};

export function buildUserWorkspaceSnapshotBackupView(
  input: AppUserWorkspaceSnapshotBackupInput = {}
): AppUserWorkspaceSnapshotBackupView {
  const hasJsonText = (input.fileSummaryJsonText?.trim().length ?? 0) > 0;
  const hasUserWorkspaceRoot =
    (input.userWorkspaceRootRef?.trim().length ?? 0) > 0;
  const hasSourceFingerprint =
    (input.sourceWorkspaceFingerprint?.trim().length ?? 0) > 0;
  if (
    input.workspaceIndexRef === undefined &&
    !hasJsonText &&
    !hasUserWorkspaceRoot &&
    !hasSourceFingerprint
  ) {
    return appViewFromRuntimeContract(
      buildUserWorkspaceSnapshotBackupContract(),
      true
    );
  }
  return appViewFromRuntimeContract(
    buildUserWorkspaceSnapshotBackupContract(runtimeInputFromApp(input)),
    false
  );
}

export function userWorkspaceSnapshotBackupWarningCodes(
  view: AppUserWorkspaceSnapshotBackupView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `USER_WORKSPACE_CONTRACT_STATUS_${view.status.toUpperCase()}`,
    `USER_WORKSPACE_CONTRACT_FINDINGS_${view.findingCount}`,
    `USER_WORKSPACE_CONTRACT_BLOCKERS_${view.blockerCount}`,
    `USER_WORKSPACE_CONTRACT_WARNINGS_${view.warningCount}`,
    ...view.warningCodes
  ];
}

function runtimeInputFromApp(
  input: AppUserWorkspaceSnapshotBackupInput
): Parameters<typeof buildUserWorkspaceSnapshotBackupContract>[0] &
  Record<string, unknown> {
  const parsed = parseFileSummaryJson(input.fileSummaryJsonText);
  const workspaceFiles = filesFromWorkspaceIndex(input.workspaceIndexRef);
  const workspaceDirectories = directoriesFromWorkspaceIndex(
    input.workspaceIndexRef
  );
  const files = parsed.files ?? workspaceFiles ?? [];
  const directories = parsed.directories ?? workspaceDirectories ?? [];
  const sourceWorkspaceFingerprint =
    safeText(input.sourceWorkspaceFingerprint, "").trim() ||
    input.workspaceIndexRef?.hashPrefix ||
    safeText(parsed.sourceWorkspaceFingerprint, "");

  return {
    userWorkspaceRootRef:
      safeText(input.userWorkspaceRootRef, "").trim() ||
      safeText(parsed.userWorkspaceRootRef, ""),
    sourceWorkspaceFingerprint,
    disposableApplyResultRef:
      safeText(input.disposableApplyResultRef, "").trim() ||
      safeText(parsed.disposableApplyResultRef, ""),
    disposableRollbackResultRef:
      safeText(input.disposableRollbackResultRef, "").trim() ||
      safeText(parsed.disposableRollbackResultRef, ""),
    disposableSnapshotContractRef:
      safeText(input.disposableSnapshotContractRef, "").trim() ||
      safeText(parsed.disposableSnapshotContractRef, ""),
    expectedDisposableOutputHash:
      safeText(input.expectedDisposableOutputHash, "").trim() ||
      safeText(parsed.expectedDisposableOutputHash, ""),
    expectedUserSnapshotHash:
      safeText(input.expectedUserSnapshotHash, "").trim() ||
      input.workspaceIndexRef?.hashPrefix ||
      safeText(parsed.expectedUserSnapshotHash, ""),
    files,
    directories,
    allowedRelativePaths: files.map((file) =>
      safeText(isRecord(file) ? file.path : "", "")
    ),
    deniedRelativePaths: [
      ".git",
      ".env",
      "node_modules",
      "dist",
      "target",
      ".tmp"
    ],
    lineEndingPolicy: safeText(parsed.lineEndingPolicy, "unknown"),
    pastedSummaryEnvelope:
      input.fileSummaryJsonText?.trim().length === 0 ? undefined : parsed
  };
}

function appViewFromRuntimeContract(
  contract: UserWorkspaceSnapshotBackupContract,
  forceEmpty: boolean
): AppUserWorkspaceSnapshotBackupView {
  const findings = contract.findings.map((finding) => ({
    findingId: finding.findingId,
    kind: finding.kind,
    severity: finding.severity,
    code: finding.code,
    summary: safeErrorMessage(finding.summary),
    path: finding.path
  }));
  return {
    status: contract.status,
    contractId: contract.contractId,
    userWorkspaceRootRef: contract.userWorkspaceRootRef,
    sourceWorkspaceFingerprint: contract.sourceWorkspaceFingerprint,
    disposableApplyResultRef: contract.disposableApplyResultRef,
    disposableRollbackResultRef: contract.disposableRollbackResultRef,
    disposableSnapshotContractRef: contract.disposableSnapshotContractRef,
    expectedDisposableOutputHash: contract.expectedDisposableOutputHash,
    expectedUserSnapshotHash: contract.expectedUserSnapshotHash,
    fileCount: contract.fileCount,
    directoryCount: contract.directoryCount,
    totalBytes: contract.totalBytes,
    plannedMutationCount: contract.plannedMutationCount,
    backupRequiredCount: contract.backupRequiredCount,
    preimageHashRequiredCount: contract.preimageHashRequiredCount,
    generatedFileCount: contract.generatedFileCount,
    binaryFileCount: contract.binaryFileCount,
    symlinkLikeCount: contract.symlinkLikeCount,
    files: contract.files.map((file) => ({
      ...file,
      warningCodes: [...file.warningCodes]
    })),
    directories: contract.directories.map((directory) => ({
      ...directory,
      warningCodes: [...directory.warningCodes]
    })),
    backupRequirements: contract.backupRequirements.map((requirement) => ({
      ...requirement,
      warningCodes: [...requirement.warningCodes]
    })),
    policy: { ...contract.policy },
    findings,
    warningCodes: findings.map((finding) => finding.code),
    blockerCount: contract.blockerCount,
    warningCount: contract.warningCount,
    findingCount: contract.findingCount,
    readiness: { ...contract.readiness },
    contractHash: contract.contractHash,
    nextAction: contract.nextAction,
    source:
      forceEmpty || contract.status === "empty"
        ? "empty"
        : "runtime_user_workspace_snapshot_backup_contract",
    metadataOnly: true,
    applyEnabled: false,
    rollbackEnabled: false,
    backupFileCreationEnabled: false,
    preimageCaptureEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function parseFileSummaryJson(text: string | undefined): Record<
  string,
  unknown
> & {
  files?: unknown[] | undefined;
  directories?: unknown[] | undefined;
} {
  if (text === undefined || text.trim().length === 0) {
    return {};
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return { files: parsed };
    }
    if (isRecord(parsed)) {
      return {
        ...parsed,
        files: safeArray(parsed.files),
        directories: safeArray(parsed.directories)
      };
    }
  } catch {
    return {
      files: [
        {
          path: "invalid-user-workspace-summary-json",
          sizeBytes: 0,
          hashPrefix: "invalid",
          exists: false,
          warningCodes: ["USER_WORKSPACE_JSON_INVALID"]
        }
      ]
    };
  }
  return {};
}

function filesFromWorkspaceIndex(
  view: AppWorkspaceIndexBridgeView | undefined
): unknown[] | undefined {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "rejected"
  ) {
    return undefined;
  }
  return view.topFiles
    .filter((file) => file.indexed)
    .map((file) => ({
      path: file.path,
      language: file.language,
      extension: file.extension,
      sizeBytes: file.sizeBytes,
      lineCount: file.lineCount,
      hashPrefix: file.hashPrefix,
      exists: true,
      plannedMutation: "none",
      backupRequired: false,
      preimageHashRequired: false,
      warningCodes: file.warningCodes
    }));
}

function directoriesFromWorkspaceIndex(
  view: AppWorkspaceIndexBridgeView | undefined
): unknown[] | undefined {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "rejected"
  ) {
    return undefined;
  }
  return view.topDirectories.map((directory) => ({
    path: directory.path,
    fileCount: directory.fileCount,
    totalBytes: 0,
    warningCodes: directory.warningCodes
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
