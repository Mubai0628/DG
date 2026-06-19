import {
  type WorkspaceIndex,
  type WorkspaceIndexEventSummary,
  type WorkspaceLanguage
} from "./types.js";

export function createWorkspaceIndexEventSummary(
  index: WorkspaceIndex
): WorkspaceIndexEventSummary {
  const languageCounts: Partial<Record<WorkspaceLanguage, number>> = {};
  for (const summary of index.languageSummary) {
    languageCounts[summary.language] = summary.fileCount;
  }

  return {
    workspaceIndexId: index.workspaceIndexId,
    workspaceId: index.workspaceId,
    status: index.status,
    fileCount: index.fileCount,
    indexedFileCount: index.indexedFileCount,
    skippedFileCount: index.skippedFileCount,
    directoryCount: index.directories.length,
    languageCounts,
    warningCodes: index.warningCodes,
    errorCodes: index.errors.map((error) => error.code),
    safePaths: [...index.files, ...index.skippedFiles]
      .map((file) => file.path)
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 50),
    hash: index.hash
  };
}
