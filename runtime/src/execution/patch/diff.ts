import { byteLengthUtf8 } from "./hash.js";
import {
  type DiffHunk,
  type DiffLine,
  type DiffSummary,
  type PatchFileChange
} from "./types.js";

export function generateDiffSummary(
  changes: readonly PatchFileChange[]
): DiffSummary {
  let filesCreated = 0;
  let filesUpdated = 0;
  let filesDeleted = 0;
  let linesAdded = 0;
  let linesRemoved = 0;
  let largestFileBytes = 0;
  const riskWarnings: string[] = [];
  const hunks: DiffHunk[] = [];

  for (const change of changes) {
    if (change.operation === "create") {
      filesCreated += 1;
    } else if (change.operation === "update") {
      filesUpdated += 1;
    } else if (change.operation === "delete") {
      filesDeleted += 1;
    } else {
      riskWarnings.push("RENAME_SIMULATE_ONLY");
    }

    largestFileBytes = Math.max(
      largestFileBytes,
      byteLengthUtf8(change.beforeContent ?? ""),
      byteLengthUtf8(change.afterContent ?? ""),
      change.sizeBytes
    );

    const hunk = createDiffHunk(change);
    for (const line of hunk.lines) {
      if (line.kind === "added") {
        linesAdded += 1;
      }
      if (line.kind === "removed") {
        linesRemoved += 1;
      }
    }
    if (hunk.lines.length > 0) {
      hunks.push(hunk);
    }
  }

  return {
    filesChanged: changes.length,
    filesCreated,
    filesUpdated,
    filesDeleted,
    linesAdded,
    linesRemoved,
    largestFileBytes,
    riskWarnings,
    hunks
  };
}

export function createDiffHunk(change: PatchFileChange): DiffHunk {
  const before = splitLines(change.beforeContent ?? "");
  const after = splitLines(change.afterContent ?? "");
  const lines = lineDiff(before, after);

  return {
    filePath: change.path,
    oldStart: before.length > 0 ? 1 : 0,
    newStart: after.length > 0 ? 1 : 0,
    lines
  };
}

function splitLines(value: string): string[] {
  if (value.length === 0) {
    return [];
  }
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function lineDiff(
  before: readonly string[],
  after: readonly string[]
): DiffLine[] {
  const lcs = buildLcsTable(before, after);
  const lines: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < before.length || newIndex < after.length) {
    const oldLine = before[oldIndex];
    const newLine = after[newIndex];

    if (oldLine !== undefined && newLine !== undefined && oldLine === newLine) {
      lines.push({
        kind: "unchanged",
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
        text: oldLine
      });
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    if (
      newLine !== undefined &&
      (oldLine === undefined ||
        lcs[oldIndex]![newIndex + 1]! >= lcs[oldIndex + 1]![newIndex]!)
    ) {
      lines.push({
        kind: "added",
        newLineNumber: newIndex + 1,
        text: newLine
      });
      newIndex += 1;
      continue;
    }

    if (oldLine !== undefined) {
      lines.push({
        kind: "removed",
        oldLineNumber: oldIndex + 1,
        text: oldLine
      });
      oldIndex += 1;
    }
  }

  return lines;
}

function buildLcsTable(
  before: readonly string[],
  after: readonly string[]
): number[][] {
  const table = Array.from({ length: before.length + 1 }, () =>
    Array.from({ length: after.length + 1 }, () => 0)
  );

  for (let oldIndex = before.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = after.length - 1; newIndex >= 0; newIndex -= 1) {
      table[oldIndex]![newIndex] =
        before[oldIndex] === after[newIndex]
          ? table[oldIndex + 1]![newIndex + 1]! + 1
          : Math.max(
              table[oldIndex + 1]![newIndex]!,
              table[oldIndex]![newIndex + 1]!
            );
    }
  }

  return table;
}
