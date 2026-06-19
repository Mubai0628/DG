import {
  safeArray,
  safeErrorMessage,
  safeText,
  type DesktopFlowResult,
  type WorkspaceEventSummary
} from "./safety.js";
import { type AppControlPlaneProjectionView } from "./control-plane-view.js";

export type AppPatchProposalSurfaceStatus = "empty" | "summary" | "warning";

export type AppPatchSurfaceWarning = {
  code: string;
};

export type AppPatchDiffSummaryView = {
  filesChanged: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
};

export type AppPatchProposalItemView = AppPatchDiffSummaryView & {
  proposalId: string;
  taskId: string;
  title: string;
  status: string;
  riskLevel: string;
  requiresApproval: boolean;
  pathSummaries: string[];
  warningCodes: string[];
  hash: string;
  fingerprint: string;
  suggestedNextAction: string;
};

export type AppPatchAuditView = {
  auditId: string;
  proposalId: string;
  decision: string;
  riskLevel: string;
  warningCodes: string[];
  hash: string;
  suggestedNextAction: string;
};

export type AppPatchProposalSurfaceInput = {
  patchProposalSummaries?: unknown[] | undefined;
  patchAuditReports?: unknown[] | undefined;
  controlProjection?: AppControlPlaneProjectionView | undefined;
  workspaceIndexRef?: unknown;
  conversionResult?: DesktopFlowResult | undefined;
  conversionError?:
    | { errorCode?: string | undefined; safeMessage?: string | undefined }
    | undefined;
  eventSummary?: WorkspaceEventSummary | null | undefined;
};

export type AppPatchProposalSurfaceView = {
  status: AppPatchProposalSurfaceStatus;
  itemCount: number;
  items: AppPatchProposalItemView[];
  auditReports: AppPatchAuditView[];
  diffSummary: AppPatchDiffSummaryView;
  warnings: AppPatchSurfaceWarning[];
  nextAction: string;
  emptyMessage: string;
  readOnly: true;
  executionEnabled: false;
};

export const emptyPatchProposalMessage =
  "No patch proposals yet. Future code changes will appear here as reviewable diffs before apply.";

export function buildPatchProposalSurfaceView(
  input: AppPatchProposalSurfaceInput = {}
): AppPatchProposalSurfaceView {
  const items = safeArray(input.patchProposalSummaries).map((item, index) =>
    normalizePatchProposalItem(item, index)
  );
  const auditReports = safeArray(input.patchAuditReports).map((item, index) =>
    normalizePatchAudit(item, index)
  );
  const warningCodes = Array.from(
    new Set([
      ...items.flatMap((item) => item.warningCodes),
      ...auditReports.flatMap((audit) => audit.warningCodes)
    ])
  );
  const diffSummary = summarizePatchItems(items);
  const status: AppPatchProposalSurfaceStatus =
    items.length > 0
      ? warningCodes.length > 0
        ? "warning"
        : "summary"
      : warningCodes.length > 0
        ? "warning"
        : "empty";

  return {
    status,
    itemCount: items.length,
    items,
    auditReports,
    diffSummary,
    warnings: warningCodes.map((code) => ({ code })),
    nextAction: patchNextAction(items.length, warningCodes.length),
    emptyMessage: emptyPatchProposalMessage,
    readOnly: true,
    executionEnabled: false
  };
}

function normalizePatchProposalItem(
  item: unknown,
  index: number
): AppPatchProposalItemView {
  const record = isRecord(item) ? item : {};
  const diffSummary = isRecord(record.diffSummary) ? record.diffSummary : {};
  const auditReport = isRecord(record.auditReport) ? record.auditReport : {};
  const paths = pathSummariesFrom(record, diffSummary, auditReport);
  const filesChanged = readNumber(
    record,
    "filesChanged",
    readNumber(
      record,
      "fileCount",
      readNumber(diffSummary, "filesChanged", paths.length)
    )
  );
  const filesCreated = readNumber(
    record,
    "filesCreated",
    readNumber(diffSummary, "filesCreated")
  );
  const filesUpdated = readNumber(
    record,
    "filesUpdated",
    readNumber(diffSummary, "filesUpdated")
  );
  const filesDeleted = readNumber(
    record,
    "filesDeleted",
    readNumber(diffSummary, "filesDeleted")
  );
  const linesAdded = readNumber(
    record,
    "linesAdded",
    readNumber(diffSummary, "linesAdded")
  );
  const linesRemoved = readNumber(
    record,
    "linesRemoved",
    readNumber(diffSummary, "linesRemoved")
  );
  const warningCodes = Array.from(
    new Set([
      ...warningCodesFrom(record.warningCodes),
      ...warningCodesFrom(diffSummary.riskWarnings),
      ...warningCodesFrom(auditReport.pathWarnings),
      ...warningCodesFrom(auditReport.contentWarnings)
    ])
  );
  const id = safeSurfaceText(
    record.proposalId ?? record.id,
    `patch-proposal-${index + 1}`
  );
  const hash = safeSurfaceText(record.hash, "no-hash");

  return {
    proposalId: id,
    taskId: safeSurfaceText(record.taskId, "no-task"),
    title: safeSurfaceText(record.title ?? record.label, "Patch proposal"),
    status: safeSurfaceText(record.status, "proposed"),
    riskLevel: safeSurfaceText(record.riskLevel, "A2_draft_write"),
    requiresApproval: record.requiresApproval === true,
    filesChanged,
    filesCreated,
    filesUpdated,
    filesDeleted,
    linesAdded,
    linesRemoved,
    pathSummaries: paths,
    warningCodes,
    hash,
    fingerprint: safeSurfaceText(record.fingerprint, hash),
    suggestedNextAction: safeSurfaceText(
      record.suggestedNextAction ?? auditReport.suggestedNextAction,
      "Patch apply is not enabled."
    )
  };
}

function normalizePatchAudit(item: unknown, index: number): AppPatchAuditView {
  const record = isRecord(item) ? item : {};
  const warningCodes = Array.from(
    new Set([
      ...warningCodesFrom(record.warningCodes),
      ...warningCodesFrom(record.pathWarnings),
      ...warningCodesFrom(record.contentWarnings),
      ...warningCodesFrom(record.reasons)
    ])
  );

  return {
    auditId: safeSurfaceText(
      record.auditId ?? record.id,
      `patch-audit-${index + 1}`
    ),
    proposalId: safeSurfaceText(record.proposalId, "no-proposal"),
    decision: safeSurfaceText(record.decision ?? record.status, "unknown"),
    riskLevel: safeSurfaceText(record.riskLevel, "A2_draft_write"),
    warningCodes,
    hash: safeSurfaceText(record.hash, "no-hash"),
    suggestedNextAction: safeSurfaceText(
      record.suggestedNextAction,
      "Patch apply is not enabled."
    )
  };
}

function summarizePatchItems(
  items: readonly AppPatchProposalItemView[]
): AppPatchDiffSummaryView {
  return items.reduce<AppPatchDiffSummaryView>(
    (acc, item) => ({
      filesChanged: acc.filesChanged + item.filesChanged,
      filesCreated: acc.filesCreated + item.filesCreated,
      filesUpdated: acc.filesUpdated + item.filesUpdated,
      filesDeleted: acc.filesDeleted + item.filesDeleted,
      linesAdded: acc.linesAdded + item.linesAdded,
      linesRemoved: acc.linesRemoved + item.linesRemoved
    }),
    {
      filesChanged: 0,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      linesAdded: 0,
      linesRemoved: 0
    }
  );
}

function pathSummariesFrom(
  record: Record<string, unknown>,
  diffSummary: Record<string, unknown>,
  auditReport: Record<string, unknown>
): string[] {
  const candidates = [
    ...safeArray(record.pathSummaries),
    ...safeArray(record.paths),
    ...safeArray(diffSummary.pathSummaries),
    ...safeArray(auditReport.changedFiles),
    ...safeArray(record.changedFiles)
  ];
  const paths = candidates
    .map(pathSummaryFrom)
    .filter((path): path is string => path !== undefined);
  return Array.from(new Set(paths)).slice(0, 20);
}

function pathSummaryFrom(value: unknown): string | undefined {
  if (typeof value === "string") {
    return safePathSummary(value);
  }
  if (isRecord(value)) {
    const path = safePathSummary(value.path);
    if (path === undefined) {
      return undefined;
    }
    const operation = safeSurfaceText(value.operation, "");
    return operation.length > 0 ? `${operation}:${path}` : path;
  }
  return undefined;
}

function safePathSummary(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const text = value.trim().replace(/[?#].*$/, "");
  if (text.length === 0 || text.length > 200) {
    return undefined;
  }
  if (!/^[A-Za-z0-9._/@+\- ]+$/.test(text)) {
    return "path.summary.redacted";
  }
  return safeSurfaceText(text, "path.summary.redacted");
}

function warningCodesFrom(value: unknown): string[] {
  return safeArray(value)
    .map((item) => warningCode(item))
    .filter((item): item is string => item !== undefined);
}

function warningCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const code = value.trim();
  if (code.length === 0) {
    return undefined;
  }
  const normalized = code
    .replace(/:[^:]*$/, "")
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .toUpperCase();
  return /^[A-Z0-9_.-]{1,80}$/.test(normalized)
    ? normalized
    : "PATCH_SURFACE_WARNING";
}

function patchNextAction(itemCount: number, warningCount: number): string {
  if (itemCount > 0) {
    return warningCount > 0
      ? "Review patch proposal warning codes only. Patch apply is not enabled."
      : "Review patch proposal summaries only. Patch apply is not enabled.";
  }
  if (warningCount > 0) {
    return "Review patch audit warning codes only. Patch apply is not enabled.";
  }
  return emptyPatchProposalMessage;
}

function safeSurfaceText(value: unknown, fallback: string): string {
  return redactRawMarkers(safeErrorMessage(safeText(value, fallback))).slice(
    0,
    240
  );
}

function redactRawMarkers(text: string): string {
  const privatePasteField = "clip" + "board";
  const rawFieldPattern = new RegExp(
    `\\b(csvContent|${privatePasteField}|stdout|stderr|env)\\b`,
    "gi"
  );
  return text
    .replace(/\b(beforeContent|afterContent)\b/gi, "[redacted-field]")
    .replace(
      /\braw(?:\s|-|_)*(patch|source|code|prompt|dom|csv|payload|screenshot)\b/gi,
      "[redacted-raw]"
    )
    .replace(rawFieldPattern, "[redacted-field]")
    .replace(/\b(api[_ -]?key|authorization)\b/gi, "[redacted-secret]");
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
  fallback = 0
): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
