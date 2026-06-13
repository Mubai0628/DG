import { DraftWriter } from "./draft-writer.js";
import { WorkspacePathGuard } from "./path-guard.js";
import {
  type DraftWriterOptions,
  type WorkspacePathGuardOptions
} from "./types.js";

export function createWorkspacePathGuard(
  options: WorkspacePathGuardOptions
): WorkspacePathGuard {
  return new WorkspacePathGuard(options);
}

export function createDraftWriter(options: DraftWriterOptions): DraftWriter {
  return new DraftWriter(options);
}
