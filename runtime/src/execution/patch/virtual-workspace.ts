import { generatePatchAuditReport, summarizeChangedFile } from "./audit.js";
import { byteLengthUtf8, hashPatchObject, patchSha256 } from "./hash.js";
import { normalizePatchPath } from "./path-guard.js";
import { createPatchEventSummary } from "./proposal.js";
import {
  type PatchApplySimulation,
  type PatchFileChange,
  type PatchProposal,
  type PatchServiceOptions,
  type PatchValidationIssue,
  type RollbackCheckpoint,
  type RollbackCheckpointFileState,
  type VirtualWorkspaceFile,
  type VirtualWorkspaceSnapshot
} from "./types.js";

export type VirtualWorkspaceFileInput = {
  path: string;
  content: string;
  contentType?: string;
  encoding?: "utf8";
};

export function createVirtualWorkspaceSnapshot(
  files: readonly VirtualWorkspaceFileInput[],
  options: PatchServiceOptions = {}
): VirtualWorkspaceSnapshot {
  const normalizedFiles: Record<string, VirtualWorkspaceFile> = {};
  for (const file of files) {
    const pathResult = normalizePatchPath(file.path, options);
    if (!pathResult.ok) {
      throw new Error(
        `Invalid virtual workspace path: ${pathResult.errors[0]?.kind}`
      );
    }
    normalizedFiles[pathResult.path] = createVirtualFile({
      path: pathResult.path,
      content: file.content,
      contentType: file.contentType ?? "text/plain",
      encoding: file.encoding ?? "utf8"
    });
  }

  return createSnapshotFromFiles(
    normalizedFiles,
    options.idFactory?.() ?? "virtual-snapshot-1",
    options.clock?.() ?? new Date()
  );
}

export function simulatePatchApply(
  snapshot: VirtualWorkspaceSnapshot,
  proposal: PatchProposal,
  options: PatchServiceOptions = {}
): PatchApplySimulation {
  const errors: PatchValidationIssue[] = [...proposal.validation.errors];
  const nextFiles = cloneFiles(snapshot.files);
  const fileStates: RollbackCheckpointFileState[] = [];
  const changedFileSummaries = proposal.changes.map(summarizeChangedFile);

  if (proposal.validation.ok) {
    for (const change of proposal.changes) {
      const existing = nextFiles[change.path];
      fileStates.push({
        path: change.path,
        existed: existing !== undefined,
        ...(existing !== undefined ? { file: cloneVirtualFile(existing) } : {})
      });
      applyVirtualChange(nextFiles, change, errors);
    }
  }

  if (errors.length > 0) {
    const failed: PatchApplySimulation = {
      ok: false,
      proposalId: proposal.proposalId,
      snapshotBeforeHash: snapshot.hash,
      changedFileSummaries,
      errors: uniqueIssues(errors)
    };
    appendSimulationEvent(options, proposal, failed);
    return failed;
  }

  const checkpoint = createRollbackCheckpoint({
    proposal,
    fileStates,
    snapshotHash: snapshot.hash,
    options
  });
  const snapshotAfter = createSnapshotFromFiles(
    nextFiles,
    options.idFactory?.() ?? `${snapshot.snapshotId}-after`,
    options.clock?.() ?? new Date()
  );
  const simulation: PatchApplySimulation = {
    ok: true,
    proposalId: proposal.proposalId,
    snapshotBeforeHash: snapshot.hash,
    snapshotAfter,
    checkpoint,
    changedFileSummaries,
    errors: []
  };
  appendSimulationEvent(options, proposal, simulation);
  appendCheckpointEvent(options, proposal, checkpoint);

  proposal.auditReport = generatePatchAuditReport({
    proposalId: proposal.proposalId,
    riskLevel: proposal.riskLevel,
    requiresApproval: proposal.requiresApproval,
    changes: proposal.changes,
    validationErrors: [],
    validationWarnings: proposal.validation.warnings,
    noCompressZoneRefs: proposal.auditReport.noCompressZoneRefs,
    simulation
  });
  proposal.status = "simulated";

  return simulation;
}

export function createVirtualFile(input: {
  path: string;
  content: string;
  contentType: string;
  encoding: "utf8";
}): VirtualWorkspaceFile {
  return {
    path: input.path,
    content: input.content,
    contentType: input.contentType,
    encoding: input.encoding,
    sizeBytes: byteLengthUtf8(input.content),
    hash: patchSha256(input.content)
  };
}

export function cloneVirtualFile(
  file: VirtualWorkspaceFile
): VirtualWorkspaceFile {
  return { ...file };
}

export function createSnapshotFromFiles(
  files: Record<string, VirtualWorkspaceFile>,
  snapshotId: string,
  createdAt: Date
): VirtualWorkspaceSnapshot {
  const cloned = cloneFiles(files);
  const summary = Object.values(cloned)
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((file) => ({
      path: file.path,
      hash: file.hash,
      sizeBytes: file.sizeBytes,
      contentType: file.contentType
    }));
  return {
    snapshotId,
    createdAt: createdAt.toISOString(),
    files: cloned,
    hash: hashPatchObject(summary)
  };
}

export function cloneFiles(
  files: Record<string, VirtualWorkspaceFile>
): Record<string, VirtualWorkspaceFile> {
  return Object.fromEntries(
    Object.entries(files).map(([path, file]) => [path, cloneVirtualFile(file)])
  );
}

function applyVirtualChange(
  files: Record<string, VirtualWorkspaceFile>,
  change: PatchFileChange,
  errors: PatchValidationIssue[]
): void {
  const existing = files[change.path];

  if (change.operation === "rename") {
    errors.push(
      issue("unsupported_operation", change.path, "Rename is simulate-only.")
    );
    return;
  }
  if (change.operation === "create") {
    if (existing !== undefined) {
      errors.push(
        issue("file_exists", change.path, "Create target already exists.")
      );
      return;
    }
    files[change.path] = createVirtualFile({
      path: change.path,
      content: change.afterContent ?? "",
      contentType: change.contentType,
      encoding: "utf8"
    });
    return;
  }
  if (existing === undefined) {
    errors.push(issue("file_missing", change.path, "Patch target is missing."));
    return;
  }
  if (change.beforeHash !== undefined && change.beforeHash !== existing.hash) {
    errors.push(
      issue(
        "before_hash_mismatch",
        change.path,
        "Patch beforeHash does not match the virtual workspace."
      )
    );
    return;
  }
  if (change.operation === "delete") {
    delete files[change.path];
    return;
  }
  files[change.path] = createVirtualFile({
    path: change.path,
    content: change.afterContent ?? "",
    contentType: change.contentType,
    encoding: "utf8"
  });
}

function createRollbackCheckpoint(input: {
  proposal: PatchProposal;
  fileStates: RollbackCheckpointFileState[];
  snapshotHash: string;
  options: PatchServiceOptions;
}): RollbackCheckpoint {
  const checkpointWithoutHash = {
    checkpointId:
      input.options.idFactory?.() ?? `${input.proposal.proposalId}-checkpoint`,
    proposalId: input.proposal.proposalId,
    createdAt: (input.options.clock?.() ?? new Date()).toISOString(),
    snapshotHash: input.snapshotHash,
    fileStates: input.fileStates.map((state) => ({
      path: state.path,
      existed: state.existed,
      ...(state.file !== undefined
        ? { file: cloneVirtualFile(state.file) }
        : {})
    })),
    pathSummaries: input.fileStates.map((state) => state.path).sort()
  };
  return {
    ...checkpointWithoutHash,
    hash: hashPatchObject({
      checkpointId: checkpointWithoutHash.checkpointId,
      proposalId: checkpointWithoutHash.proposalId,
      snapshotHash: checkpointWithoutHash.snapshotHash,
      pathSummaries: checkpointWithoutHash.pathSummaries,
      fileHashes: checkpointWithoutHash.fileStates.map((state) => ({
        path: state.path,
        existed: state.existed,
        hash: state.file?.hash
      }))
    })
  };
}

function appendSimulationEvent(
  options: PatchServiceOptions,
  proposal: PatchProposal,
  simulation: PatchApplySimulation
): void {
  if (options.eventStore === undefined) {
    return;
  }
  const payload = {
    ...createPatchEventSummary(
      proposal,
      simulation.ok ? "simulated" : "rejected"
    ),
    simulationOk: simulation.ok,
    snapshotBeforeHash: simulation.snapshotBeforeHash,
    snapshotAfterHash: simulation.snapshotAfter?.hash,
    errorCodes: simulation.errors.map((error) => error.kind)
  };
  const input = {
    type: "patch.simulated" as const,
    taskId: proposal.taskId,
    payload
  };
  if (proposal.agentId !== undefined) {
    options.eventStore.appendEvent({ ...input, agentId: proposal.agentId });
    return;
  }
  options.eventStore.appendEvent(input);
}

function appendCheckpointEvent(
  options: PatchServiceOptions,
  proposal: PatchProposal,
  checkpoint: RollbackCheckpoint
): void {
  if (options.eventStore === undefined) {
    return;
  }
  const payload = {
    proposalId: proposal.proposalId,
    checkpointId: checkpoint.checkpointId,
    snapshotHash: checkpoint.snapshotHash,
    pathSummaries: checkpoint.pathSummaries,
    hash: checkpoint.hash
  };
  const input = {
    type: "rollback.checkpoint.created" as const,
    taskId: proposal.taskId,
    payload
  };
  if (proposal.agentId !== undefined) {
    options.eventStore.appendEvent({ ...input, agentId: proposal.agentId });
    return;
  }
  options.eventStore.appendEvent(input);
}

function issue(
  kind: PatchValidationIssue["kind"],
  path: string,
  safeMessage: string
): PatchValidationIssue {
  return { kind, path, safeMessage };
}

function uniqueIssues(issues: PatchValidationIssue[]): PatchValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.kind}:${item.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
