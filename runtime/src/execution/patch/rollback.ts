import { cloneFiles, createSnapshotFromFiles } from "./virtual-workspace.js";
import {
  type PatchServiceOptions,
  type RollbackCheckpoint,
  type RollbackSimulation,
  type VirtualWorkspaceSnapshot
} from "./types.js";

export function simulateRollback(
  snapshot: VirtualWorkspaceSnapshot,
  checkpoint: RollbackCheckpoint,
  options: PatchServiceOptions = {}
): RollbackSimulation {
  const files = cloneFiles(snapshot.files);
  for (const state of checkpoint.fileStates) {
    if (!state.existed) {
      delete files[state.path];
      continue;
    }
    if (state.file !== undefined) {
      files[state.path] = { ...state.file };
    }
  }

  const restored = createSnapshotFromFiles(
    files,
    options.idFactory?.() ?? `${snapshot.snapshotId}-rollback`,
    options.clock?.() ?? new Date()
  );
  const result: RollbackSimulation = {
    ok: true,
    checkpointId: checkpoint.checkpointId,
    snapshot: restored,
    errors: []
  };

  if (options.eventStore !== undefined) {
    options.eventStore.appendEvent({
      type: "rollback.simulated",
      payload: {
        checkpointId: checkpoint.checkpointId,
        proposalId: checkpoint.proposalId,
        restoredSnapshotHash: restored.hash,
        checkpointHash: checkpoint.hash,
        pathSummaries: checkpoint.pathSummaries
      }
    });
  }

  return result;
}
