import {
  buildDisposableWorkspaceSnapshotContract,
  type DisposableWorkspaceSnapshotContract,
  type DisposableWorkspaceSnapshotDirectorySummary,
  type DisposableWorkspaceSnapshotFileSummary,
  type DisposableWorkspaceSnapshotFinding,
  type DisposableWorkspaceSnapshotPolicy,
  type DisposableWorkspaceSnapshotReadiness,
  type DisposableWorkspaceSnapshotStatus
} from "../../runtime/src/execution/sandbox/disposable-workspace-snapshot.js";
import { safeArray, safeErrorMessage, safeText } from "./safety.js";
import type { AppWorkspaceIndexBridgeView } from "./workspace-index-bridge-view.js";

export type AppDisposableWorkspaceSnapshotStatus =
  DisposableWorkspaceSnapshotStatus;

export type AppDisposableWorkspaceSnapshotFindingView = {
  findingId: string;
  kind: DisposableWorkspaceSnapshotFinding["kind"];
  severity: DisposableWorkspaceSnapshotFinding["severity"];
  code: string;
  summary: string;
  path?: string | undefined;
};

export type AppDisposableWorkspaceSnapshotView = {
  status: AppDisposableWorkspaceSnapshotStatus;
  contractId: string;
  sourceWorkspaceFingerprint: string;
  disposableRootRef: string;
  workspaceIndexRef?: string | undefined;
  sourceSnapshotHash: string;
  expectedInputHash?: string | undefined;
  fileCount: number;
  directoryCount: number;
  totalBytes: number;
  allowedPathCount: number;
  deniedPathCount: number;
  generatedFileCount: number;
  binaryFileCount: number;
  symlinkLikeCount: number;
  plannedMutationCount: number;
  files: DisposableWorkspaceSnapshotFileSummary[];
  directories: DisposableWorkspaceSnapshotDirectorySummary[];
  policy: DisposableWorkspaceSnapshotPolicy;
  findings: AppDisposableWorkspaceSnapshotFindingView[];
  warningCodes: string[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DisposableWorkspaceSnapshotReadiness;
  contractHash: string;
  nextAction: string;
  source: "runtime_disposable_workspace_snapshot_contract" | "empty";
  metadataOnly: true;
  applyEnabled: false;
  rollbackEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type AppDisposableWorkspaceSnapshotInput = {
  disposableRootRef?: string | undefined;
  sourceWorkspaceFingerprint?: string | undefined;
  fileSummaryJsonText?: string | undefined;
  workspaceIndexRef?: AppWorkspaceIndexBridgeView | undefined;
};

export function buildDisposableWorkspaceSnapshotView(
  input: AppDisposableWorkspaceSnapshotInput = {}
): AppDisposableWorkspaceSnapshotView {
  const hasJsonText = (input.fileSummaryJsonText?.trim().length ?? 0) > 0;
  const hasDisposableRoot = (input.disposableRootRef?.trim().length ?? 0) > 0;
  const hasSourceFingerprint =
    (input.sourceWorkspaceFingerprint?.trim().length ?? 0) > 0;
  if (
    input.workspaceIndexRef === undefined &&
    !hasJsonText &&
    !hasDisposableRoot &&
    !hasSourceFingerprint
  ) {
    return appViewFromRuntimeContract(
      buildDisposableWorkspaceSnapshotContract(),
      true
    );
  }
  const runtimeInput = runtimeInputFromApp(input);
  return appViewFromRuntimeContract(
    buildDisposableWorkspaceSnapshotContract(runtimeInput),
    false
  );
}

export function disposableWorkspaceSnapshotWarningCodes(
  view: AppDisposableWorkspaceSnapshotView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `DISPOSABLE_SNAPSHOT_STATUS_${view.status.toUpperCase()}`,
    `DISPOSABLE_SNAPSHOT_FINDINGS_${view.findingCount}`,
    `DISPOSABLE_SNAPSHOT_BLOCKERS_${view.blockerCount}`,
    `DISPOSABLE_SNAPSHOT_WARNINGS_${view.warningCount}`,
    ...view.warningCodes
  ];
}

function runtimeInputFromApp(
  input: AppDisposableWorkspaceSnapshotInput
): Parameters<typeof buildDisposableWorkspaceSnapshotContract>[0] &
  Record<string, unknown> {
  const parsed = parseFileSummaryJson(input.fileSummaryJsonText);
  const workspaceFiles = filesFromWorkspaceIndex(input.workspaceIndexRef);
  const workspaceDirectories = directoriesFromWorkspaceIndex(
    input.workspaceIndexRef
  );
  const files = parsed.files ?? workspaceFiles ?? [];
  const directories = parsed.directories ?? workspaceDirectories ?? [];
  const workspaceFingerprint =
    safeText(input.sourceWorkspaceFingerprint, "").trim() ||
    input.workspaceIndexRef?.hashPrefix ||
    safeText(parsed.sourceWorkspaceFingerprint, "");
  const disposableRootRef =
    safeText(input.disposableRootRef, "").trim() ||
    safeText(parsed.disposableRootRef, "");

  return {
    sourceWorkspaceFingerprint: workspaceFingerprint,
    disposableRootRef,
    workspaceIndexRef:
      input.workspaceIndexRef?.workspaceIndexId ??
      (input.workspaceIndexRef?.hashPrefix !== undefined
        ? `workspace-index:${input.workspaceIndexRef.hashPrefix}`
        : safeText(parsed.workspaceIndexRef, "")),
    sourceSnapshotHash:
      input.workspaceIndexRef?.hashPrefix ||
      safeText(parsed.sourceSnapshotHash, ""),
    expectedInputHash:
      input.workspaceIndexRef?.hashPrefix ||
      safeText(parsed.expectedInputHash, ""),
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
  contract: DisposableWorkspaceSnapshotContract,
  forceEmpty: boolean
): AppDisposableWorkspaceSnapshotView {
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
    sourceWorkspaceFingerprint: contract.sourceWorkspaceFingerprint,
    disposableRootRef: contract.disposableRootRef,
    workspaceIndexRef: contract.workspaceIndexRef,
    sourceSnapshotHash: contract.sourceSnapshotHash,
    expectedInputHash: contract.expectedInputHash,
    fileCount: contract.fileCount,
    directoryCount: contract.directoryCount,
    totalBytes: contract.totalBytes,
    allowedPathCount: contract.allowedPathCount,
    deniedPathCount: contract.deniedPathCount,
    generatedFileCount: contract.generatedFileCount,
    binaryFileCount: contract.binaryFileCount,
    symlinkLikeCount: contract.symlinkLikeCount,
    plannedMutationCount: contract.plannedMutationCount,
    files: contract.files.map((file) => ({
      ...file,
      warningCodes: [...file.warningCodes]
    })),
    directories: contract.directories.map((directory) => ({
      ...directory,
      warningCodes: [...directory.warningCodes]
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
        : "runtime_disposable_workspace_snapshot_contract",
    metadataOnly: true,
    applyEnabled: false,
    rollbackEnabled: false,
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
          path: "invalid-summary-json",
          sizeBytes: 0,
          hashPrefix: "invalid",
          exists: false,
          warningCodes: ["DISPOSABLE_SNAPSHOT_JSON_INVALID"]
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
  return view.topFiles.map((file) => ({
    path: file.path,
    language: file.language,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    lineCount: file.lineCount,
    hashPrefix: file.hashPrefix,
    exists: file.indexed,
    plannedMutation: "none",
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
