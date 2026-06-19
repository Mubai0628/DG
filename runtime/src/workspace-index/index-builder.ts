import { classifyWorkspaceFileContent } from "./content-classifier.js";
import { createWorkspaceIndexEventSummary } from "./event-summary.js";
import { workspaceIndexError, workspaceIndexWarning } from "./errors.js";
import { hashWorkspaceObject } from "./hash.js";
import {
  createSkippedWorkspaceFileSummary,
  createWorkspaceFileSummary
} from "./file-summary.js";
import { validateWorkspaceIndexPath } from "./path-guard.js";
import { extractWorkspaceSymbolSummaries } from "./symbol-summary.js";
import {
  buildWorkspaceDirectorySummaries,
  createWorkspaceTreeSummary
} from "./tree-summary.js";
import {
  type WorkspaceIndexedFile,
  type WorkspaceIndex,
  type WorkspaceIndexBuildOptions,
  type WorkspaceIndexBuildResult,
  type WorkspaceIndexError,
  type WorkspaceIndexInput,
  type WorkspaceIndexStatus,
  type WorkspaceIndexWarning,
  type WorkspaceFileSummary,
  type WorkspaceLanguage,
  type WorkspaceLanguageSummary
} from "./types.js";

const DEFAULT_MAX_FILES = 1_000;
const DEFAULT_MAX_TOTAL_BYTES = 2 * 1024 * 1024;

export function buildWorkspaceIndex(
  input: WorkspaceIndexInput,
  options: WorkspaceIndexBuildOptions = {}
): WorkspaceIndexBuildResult {
  const workspaceId = sanitizeIdentifier(input.workspaceId ?? "virtual");
  const rootLabel = sanitizeLabel(input.rootLabel ?? "virtual-workspace");
  const now = options.now ?? new Date().toISOString();
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  const warnings: WorkspaceIndexWarning[] = [];
  const errors: WorkspaceIndexError[] = [];
  const indexedFiles: WorkspaceIndexedFile[] = [];
  const skippedFiles: WorkspaceFileSummary[] = [];
  let totalBytesSeen = 0;

  options.eventStore?.appendEvent({
    type: "workspace.index.proposed",
    payload: {
      workspaceId,
      rootLabel,
      fileCount: input.files.length,
      maxFiles,
      maxTotalBytes
    }
  });

  const files = [...input.files].sort((left, right) =>
    left.path.localeCompare(right.path)
  );

  for (const [index, file] of files.entries()) {
    if (index >= maxFiles) {
      const guard = validateWorkspaceIndexPath(
        file.path,
        pathGuardOptions(options)
      );
      const safePath = guard.ok ? guard.path : guard.safePath;
      const warning = workspaceIndexWarning({
        code: "max_files_exceeded",
        path: safePath
      });
      warnings.push(warning);
      skippedFiles.push(
        createSkippedWorkspaceFileSummary({
          safePath,
          code: warning.code
        })
      );
      continue;
    }

    const guard = validateWorkspaceIndexPath(
      file.path,
      pathGuardOptions(options)
    );
    if (!guard.ok) {
      const error = workspaceIndexError({
        kind: "unsafe_path",
        code: guard.code,
        path: guard.safePath,
        safeMessage: guard.safeMessage
      });
      errors.push(error);
      warnings.push(
        workspaceIndexWarning({
          code: guard.code,
          path: guard.safePath,
          safeMessage: guard.safeMessage
        })
      );
      skippedFiles.push(
        createSkippedWorkspaceFileSummary({
          safePath: guard.safePath,
          code: guard.code
        })
      );
      if (options.failFast === true) {
        break;
      }
      continue;
    }

    const classification = classifyWorkspaceFileContent(
      file,
      classifierOptions(options)
    );
    totalBytesSeen += classification.sizeBytes;
    if (totalBytesSeen > maxTotalBytes) {
      const warning = workspaceIndexWarning({
        code: "max_total_bytes_exceeded",
        path: guard.path
      });
      warnings.push(warning);
      const summary = createWorkspaceFileSummary({
        path: guard.path,
        content: file.content,
        classification: {
          ...classification,
          skippedReason: warning.code,
          warningCodes: [...classification.warningCodes, warning.code]
        },
        symbols: [],
        indexed: false,
        pathWarningCodes: guard.warningCodes
      });
      skippedFiles.push(summary);
      continue;
    }

    if (classification.skippedReason !== undefined) {
      warnings.push(
        workspaceIndexWarning({
          code: classification.skippedReason,
          path: guard.path
        })
      );
      const summary = createWorkspaceFileSummary({
        path: guard.path,
        content: file.content,
        classification,
        symbols: [],
        indexed: false,
        pathWarningCodes: guard.warningCodes
      });
      skippedFiles.push(summary);
      logFileSummary(options, summary);
      continue;
    }

    const symbols = extractWorkspaceSymbolSummaries(
      {
        path: guard.path,
        content: file.content,
        language: classification.language
      },
      symbolOptions(options)
    );
    const summary = createWorkspaceFileSummary({
      path: guard.path,
      content: file.content,
      classification,
      symbols,
      indexed: true,
      pathWarningCodes: guard.warningCodes
    });
    indexedFiles.push({
      path: guard.path,
      summary,
      symbols
    });
    logFileSummary(options, summary);
  }

  const directories = buildWorkspaceDirectorySummaries({
    indexedFiles,
    skippedFiles: skippedFiles.map((summary) => ({
      path: summary.path,
      language: summary.language
    }))
  });
  const languageSummary = buildLanguageSummary(indexedFiles, skippedFiles);
  const treeSummary = createWorkspaceTreeSummary(directories);
  const status = decideStatus(indexedFiles.length, errors.length, warnings);
  const warningCodes = uniqueSorted([
    ...warnings.map((warning) => warning.code),
    ...indexedFiles.flatMap((file) => file.summary.warningCodes),
    ...skippedFiles.flatMap((file) => file.warningCodes)
  ]);

  const indexSeed = {
    workspaceId,
    rootLabel,
    status,
    files: indexedFiles.map((file) => ({
      path: file.path,
      summaryFingerprint: file.summary.summaryFingerprint,
      symbols: file.symbols.map((symbol) => [symbol.kind, symbol.name])
    })),
    skippedFiles: skippedFiles.map((file) => ({
      path: file.path,
      summaryFingerprint: file.summaryFingerprint
    })),
    languageSummary,
    warningCodes,
    errorCodes: errors.map((error) => error.code)
  };
  const hash = hashWorkspaceObject(indexSeed);
  const indexObject: WorkspaceIndex = {
    workspaceIndexId: options.indexId ?? `workspace-index-${hash.slice(0, 12)}`,
    workspaceId,
    rootLabel,
    status,
    files: indexedFiles,
    skippedFiles,
    directories,
    languageSummary,
    treeSummary,
    fileCount: indexedFiles.length + skippedFiles.length,
    indexedFileCount: indexedFiles.length,
    skippedFileCount: skippedFiles.length,
    totalBytes: sumBy(indexedFiles, (file) => file.summary.sizeBytes),
    totalLines: sumBy(indexedFiles, (file) => file.summary.lineCount),
    warningCodes,
    warnings,
    errors,
    hash,
    createdAt: now
  };

  const eventSummary = createWorkspaceIndexEventSummary(indexObject);
  options.eventStore?.appendEvent({
    type:
      status === "rejected"
        ? "workspace.index.rejected"
        : "workspace.index.built",
    payload: eventSummary
  });

  return {
    ok: status !== "rejected",
    index: indexObject,
    warnings,
    errors
  };
}

function logFileSummary(
  options: WorkspaceIndexBuildOptions,
  summary: WorkspaceIndexedFile["summary"]
): void {
  options.eventStore?.appendEvent({
    type: "workspace.file.summarized",
    payload: {
      path: summary.path,
      extension: summary.extension,
      language: summary.language,
      sizeBytes: summary.sizeBytes,
      lineCount: summary.lineCount,
      indexed: summary.indexed,
      skippedReason: summary.skippedReason,
      warningCodes: summary.warningCodes,
      symbolCount: summary.symbolCount,
      hash: summary.hash,
      summaryFingerprint: summary.summaryFingerprint
    }
  });
}

function buildLanguageSummary(
  indexedFiles: readonly WorkspaceIndexedFile[],
  skippedFiles: readonly WorkspaceIndexedFile["summary"][]
): WorkspaceLanguageSummary[] {
  const summaries = new Map<WorkspaceLanguage, WorkspaceLanguageSummary>();
  for (const summary of [
    ...indexedFiles.map((file) => file.summary),
    ...skippedFiles
  ]) {
    const current =
      summaries.get(summary.language) ??
      ({
        language: summary.language,
        fileCount: 0,
        indexedFileCount: 0,
        lineCount: 0,
        sizeBytes: 0
      } satisfies WorkspaceLanguageSummary);
    current.fileCount += 1;
    if (summary.indexed) {
      current.indexedFileCount += 1;
      current.lineCount += summary.lineCount;
      current.sizeBytes += summary.sizeBytes;
    }
    summaries.set(summary.language, current);
  }

  return [...summaries.values()].sort((left, right) =>
    left.language.localeCompare(right.language)
  );
}

function decideStatus(
  indexedCount: number,
  errorCount: number,
  warnings: readonly WorkspaceIndexWarning[]
): WorkspaceIndexStatus {
  if (indexedCount === 0 && errorCount > 0) {
    return "rejected";
  }
  if (errorCount > 0 || warnings.length > 0) {
    return "partial";
  }
  return "built";
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 80);
  return sanitized.length > 0 ? sanitized : "virtual";
}

function sanitizeLabel(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}\b/gi, "[redacted]")
    .replace(/[?].*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sumBy<T>(items: readonly T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}

function pathGuardOptions(options: WorkspaceIndexBuildOptions): {
  maxPathLength?: number;
} {
  return options.maxPathLength === undefined
    ? {}
    : { maxPathLength: options.maxPathLength };
}

function classifierOptions(options: WorkspaceIndexBuildOptions): {
  maxFileBytes?: number;
} {
  return options.maxFileBytes === undefined
    ? {}
    : { maxFileBytes: options.maxFileBytes };
}

function symbolOptions(options: WorkspaceIndexBuildOptions): {
  maxSymbolsPerFile?: number;
} {
  return options.maxSymbolsPerFile === undefined
    ? {}
    : { maxSymbolsPerFile: options.maxSymbolsPerFile };
}
