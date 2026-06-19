import {
  type WorkspaceDirectorySummary,
  type WorkspaceIndexedFile,
  type WorkspaceLanguage,
  type WorkspaceTreeSummary
} from "./types.js";

export function buildWorkspaceDirectorySummaries(input: {
  indexedFiles: readonly WorkspaceIndexedFile[];
  skippedFiles: readonly { path: string; language: WorkspaceLanguage }[];
}): WorkspaceDirectorySummary[] {
  const byDirectory = new Map<string, WorkspaceDirectorySummary>();

  const visit = (
    path: string,
    language: WorkspaceLanguage,
    indexed: boolean,
    warningCodes: readonly string[]
  ): void => {
    for (const directory of directoriesForPath(path)) {
      const current =
        byDirectory.get(directory) ??
        ({
          path: directory,
          fileCount: 0,
          indexedFileCount: 0,
          skippedFileCount: 0,
          languageCounts: {},
          warningCodes: []
        } satisfies WorkspaceDirectorySummary);
      current.fileCount += 1;
      if (indexed) {
        current.indexedFileCount += 1;
      } else {
        current.skippedFileCount += 1;
      }
      current.languageCounts[language] =
        (current.languageCounts[language] ?? 0) + 1;
      current.warningCodes = uniqueSorted([
        ...current.warningCodes,
        ...warningCodes
      ]);
      byDirectory.set(directory, current);
    }
  };

  for (const file of input.indexedFiles) {
    visit(file.path, file.summary.language, true, file.summary.warningCodes);
  }
  for (const file of input.skippedFiles) {
    visit(file.path, file.language, false, []);
  }

  return [...byDirectory.values()].sort((left, right) =>
    left.path.localeCompare(right.path)
  );
}

export function createWorkspaceTreeSummary(
  directories: readonly WorkspaceDirectorySummary[]
): WorkspaceTreeSummary {
  const topDirectories = directories
    .filter((directory) => directory.path !== ".")
    .filter((directory) => !directory.path.includes("/"))
    .sort((left, right) => {
      const countDelta = right.fileCount - left.fileCount;
      if (countDelta !== 0) {
        return countDelta;
      }
      return left.path.localeCompare(right.path);
    })
    .slice(0, 12);

  return {
    rootDirectoryCount: topDirectories.length,
    topDirectories,
    totalDirectoryCount: directories.length,
    warningCodes: uniqueSorted(
      directories.flatMap((directory) => directory.warningCodes)
    )
  };
}

function directoriesForPath(path: string): string[] {
  const segments = path.split("/");
  if (segments.length <= 1) {
    return ["."];
  }

  const directories = ["."];
  for (let index = 1; index < segments.length; index += 1) {
    directories.push(segments.slice(0, index).join("/"));
  }
  return directories;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
