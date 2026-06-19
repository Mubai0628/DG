import { hashWorkspaceObject, workspaceSha256 } from "./hash.js";
import {
  type WorkspaceContentClassification,
  type WorkspaceFileSummary,
  type WorkspaceSymbolSummary
} from "./types.js";

export function createWorkspaceFileSummary(input: {
  path: string;
  content: string;
  classification: WorkspaceContentClassification;
  symbols: readonly WorkspaceSymbolSummary[];
  indexed: boolean;
  pathWarningCodes?: readonly string[];
}): WorkspaceFileSummary {
  const warningCodes = [
    ...(input.pathWarningCodes ?? []),
    ...input.classification.warningCodes
  ].sort((left, right) => left.localeCompare(right));
  const skippedReason = input.indexed
    ? undefined
    : (input.classification.skippedReason ?? "not_indexed");
  const summaryBase: Omit<
    WorkspaceFileSummary,
    "hash" | "summaryFingerprint" | "skippedReason"
  > = {
    path: input.path,
    extension: input.classification.extension,
    language: input.classification.language,
    sizeBytes: input.classification.sizeBytes,
    lineCount: input.classification.lineCount,
    contentType: input.classification.contentType,
    indexed: input.indexed,
    warningCodes,
    symbolCount: input.symbols.length
  };

  const summary: WorkspaceFileSummary = {
    ...summaryBase,
    hash: workspaceSha256(input.content),
    summaryFingerprint: hashWorkspaceObject(summaryBase)
  };
  if (skippedReason !== undefined) {
    summary.skippedReason = skippedReason;
  }
  return summary;
}

export function createSkippedWorkspaceFileSummary(input: {
  safePath: string;
  code: string;
  content?: string;
}): WorkspaceFileSummary {
  const content = input.content ?? "";
  const summaryBase = {
    path: input.safePath,
    extension: "",
    language: "unknown" as const,
    sizeBytes: 0,
    lineCount: 0,
    contentType: "unknown" as const,
    indexed: false,
    skippedReason: input.code,
    warningCodes: [input.code],
    symbolCount: 0
  };
  return {
    ...summaryBase,
    hash: workspaceSha256(content),
    summaryFingerprint: hashWorkspaceObject(summaryBase)
  };
}
