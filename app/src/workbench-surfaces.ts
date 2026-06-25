import {
  safeArray,
  safeErrorMessage,
  safeText,
  type DesktopFlowResult,
  type RunnerPreflightSummary,
  type WorkspaceEventSummary
} from "./safety.js";
import {
  type AppControlPlaneProjectionView,
  type AppControlPlaneWarningView
} from "./control-plane-view.js";
import {
  buildPatchProposalSurfaceView,
  type AppPatchProposalSurfaceInput,
  type AppPatchProposalSurfaceView
} from "./patch-proposal-surface-view.js";

export type AppApprovalSurfaceStatus =
  | "empty"
  | "pending"
  | "blocked"
  | "warning";

export type AppApprovalItemView = {
  id: string;
  label: string;
  kind: "capability" | "patch" | "git" | "shell" | "bridge";
  status: "pending" | "blocked" | "dry";
  summary: string;
};

export type AppApprovalSurfaceView = {
  status: AppApprovalSurfaceStatus;
  itemCount: number;
  items: AppApprovalItemView[];
  nextAction: string;
  warnings: string[];
  emptyMessage: string;
};

export type AppDiffSurfaceStatus = "empty" | "summary" | "warning";

export type AppDiffItemView = {
  id: string;
  label: string;
  fileCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
  summary: string;
  proposalId: string;
  taskId: string;
  status: string;
  riskLevel: string;
  requiresApproval: boolean;
  pathSummaries: string[];
  warningCodes: string[];
  hash: string;
  fingerprint: string;
  suggestedNextAction: string;
};

export type AppDiffSurfaceView = {
  status: AppDiffSurfaceStatus;
  fileCount: number;
  linesAdded: number;
  linesRemoved: number;
  items: AppDiffItemView[];
  nextAction: string;
  warnings: string[];
  emptyMessage: string;
};

export type AppAuditSurfaceStatus = "empty" | "summary" | "warning" | "error";

export type AppAuditTimelineView = {
  eventCount: number;
  displayedEventCount: number;
  timelineCount: number;
  lastEventAt: string;
};

export type AppAuditSurfaceView = {
  status: AppAuditSurfaceStatus;
  eventCount: number;
  displayedEventCount: number;
  safetyStatus: "ok" | "warning" | "unknown";
  warningCodes: string[];
  timelineCount: number;
  lastEventAt: string;
  nextAction: string;
};

export type AppWorkbenchSurfaceView = {
  approval: AppApprovalSurfaceView;
  diff: AppDiffSurfaceView;
  audit: AppAuditSurfaceView;
  readOnly: true;
  executionEnabled: false;
};

export type AppWorkbenchApprovalRef = {
  id: string;
  label?: string;
  kind?: AppApprovalItemView["kind"];
  status?: AppApprovalItemView["status"];
  summary?: string;
};

export type AppWorkbenchPatchRef = {
  id: string;
  label?: string;
  fileCount?: number;
  linesAdded?: number;
  linesRemoved?: number;
  summary?: string;
};

export type AppWorkbenchSurfacesInput = {
  eventSummary?: WorkspaceEventSummary | null | undefined;
  controlProjection: AppControlPlaneProjectionView;
  conversionResult?: DesktopFlowResult | undefined;
  conversionError?:
    | { errorCode?: string | undefined; safeMessage?: string | undefined }
    | undefined;
  preflight?: RunnerPreflightSummary | undefined;
  futurePatchRefs?: AppWorkbenchPatchRef[] | undefined;
  patchProposalSummaries?:
    | AppPatchProposalSurfaceInput["patchProposalSummaries"]
    | undefined;
  patchAuditReports?:
    | AppPatchProposalSurfaceInput["patchAuditReports"]
    | undefined;
  workspaceIndexRef?: AppPatchProposalSurfaceInput["workspaceIndexRef"];
  futureApprovalRefs?: AppWorkbenchApprovalRef[] | undefined;
  futureAuditWarningCodes?: string[] | undefined;
};

const emptyApprovalMessage =
  "No approvals yet. Future patch, capability, git, and shell proposals will appear here as summaries before any execution gate.";

export function buildWorkbenchSurfacesView(
  input: AppWorkbenchSurfacesInput
): AppWorkbenchSurfaceView {
  const warnings = warningCodesFrom(input);
  return {
    approval: buildApprovalSurface(input, warnings),
    diff: buildDiffSurface(input, warnings),
    audit: buildAuditSurface(input, warnings),
    readOnly: true,
    executionEnabled: false
  };
}

function buildApprovalSurface(
  input: AppWorkbenchSurfacesInput,
  warnings: string[]
): AppApprovalSurfaceView {
  const items = safeArray(input.futureApprovalRefs).map((item, index) =>
    normalizeApprovalItem(item, index)
  );
  const preflightBlocked = input.preflight?.ok === false;
  const status: AppApprovalSurfaceStatus =
    items.length > 0 ? "pending" : preflightBlocked ? "blocked" : "empty";

  return {
    status,
    itemCount: items.length,
    items,
    nextAction: preflightBlocked
      ? "Fix runner preflight before future approvals can be reviewed."
      : items.length > 0
        ? "Review proposal summaries only. Execution remains disabled."
        : emptyApprovalMessage,
    warnings,
    emptyMessage: emptyApprovalMessage
  };
}

function buildDiffSurface(
  input: AppWorkbenchSurfacesInput,
  warnings: string[]
): AppDiffSurfaceView {
  const patchSurface = buildPatchProposalSurfaceView({
    patchProposalSummaries: [
      ...safeArray(input.patchProposalSummaries),
      ...safeArray(input.futurePatchRefs)
    ],
    patchAuditReports: input.patchAuditReports,
    controlProjection: input.controlProjection,
    workspaceIndexRef: input.workspaceIndexRef,
    conversionResult: input.conversionResult,
    conversionError: input.conversionError,
    eventSummary: input.eventSummary
  });
  const items = patchSurface.items.map(patchItemToDiffItem);
  const warningCodes = Array.from(
    new Set([
      ...warnings,
      ...patchSurface.warnings.map((warning) => warning.code)
    ])
  );

  return {
    status: patchSurface.status,
    fileCount: patchSurface.diffSummary.filesChanged,
    linesAdded: patchSurface.diffSummary.linesAdded,
    linesRemoved: patchSurface.diffSummary.linesRemoved,
    items,
    nextAction: patchSurface.nextAction,
    warnings: warningCodes,
    emptyMessage: patchSurface.emptyMessage
  };
}

function buildAuditSurface(
  input: AppWorkbenchSurfacesInput,
  warnings: string[]
): AppAuditSurfaceView {
  const summary = input.eventSummary;
  if (summary === undefined || summary === null) {
    return {
      status: warnings.length > 0 ? "warning" : "empty",
      eventCount: 0,
      displayedEventCount: 0,
      safetyStatus: "unknown",
      warningCodes: warnings,
      timelineCount: 0,
      lastEventAt: "n/a",
      nextAction: "Run Convert first, then refresh events."
    };
  }

  const eventOk = summary.ok !== false;
  const safetyStatus =
    summary.safetyScan?.ok === true
      ? "ok"
      : finiteNumber(summary.safetyScan?.findings) > 0
        ? "warning"
        : "unknown";
  const warningCodes = Array.from(
    new Set([
      ...warnings,
      ...safeWarningCodes(summary.safetyScan?.warningCodes)
    ])
  );

  return {
    status: !eventOk
      ? "error"
      : warningCodes.length > 0 || safetyStatus === "warning"
        ? "warning"
        : "summary",
    eventCount: finiteNumber(summary.eventCount),
    displayedEventCount: finiteNumber(summary.displayedEventCount),
    safetyStatus,
    warningCodes,
    timelineCount: safeArray(summary.timeline).length,
    lastEventAt: safeText(summary.lastEventAt, "n/a"),
    nextAction: auditNextAction(input, eventOk)
  };
}

function normalizeApprovalItem(
  item: unknown,
  index: number
): AppApprovalItemView {
  const record = isRecord(item) ? item : {};
  return {
    id: safeText(record.id, `approval-${index + 1}`),
    label: safeText(record.label, "Future proposal"),
    kind: normalizeApprovalKind(record.kind),
    status: normalizeApprovalStatus(record.status),
    summary: safeErrorMessage(safeText(record.summary, "Summary pending"))
  };
}

function patchItemToDiffItem(
  item: AppPatchProposalSurfaceView["items"][number]
): AppDiffItemView {
  return {
    id: item.proposalId,
    label: item.title,
    fileCount: item.filesChanged,
    filesCreated: item.filesCreated,
    filesUpdated: item.filesUpdated,
    filesDeleted: item.filesDeleted,
    linesAdded: item.linesAdded,
    linesRemoved: item.linesRemoved,
    summary: safeErrorMessage(
      `${item.filesChanged} file(s), ${item.linesAdded} added, ${item.linesRemoved} removed.`
    ),
    proposalId: item.proposalId,
    taskId: item.taskId,
    status: item.status,
    riskLevel: item.riskLevel,
    requiresApproval: item.requiresApproval,
    pathSummaries: item.pathSummaries,
    warningCodes: item.warningCodes,
    hash: item.hash,
    fingerprint: item.fingerprint,
    suggestedNextAction: item.suggestedNextAction
  };
}

function warningCodesFrom(input: AppWorkbenchSurfacesInput): string[] {
  const conversionWarning =
    input.conversionError?.errorCode === "FILE_EXISTS" ||
    input.conversionError?.safeMessage?.includes("FILE_EXISTS") === true ||
    input.conversionError?.safeMessage
      ?.toLowerCase()
      .includes("file exists") === true
      ? ["FILE_EXISTS"]
      : [];
  const preflightWarning =
    input.preflight?.ok === false ? ["PREFLIGHT_FAILED"] : [];
  const controlWarnings = safeArray(input.controlProjection.warnings)
    .filter(isControlWarning)
    .map((warning) => warning.code);
  const summaryWarnings = safeWarningCodes(input.eventSummary?.warnings);
  const futureAuditWarnings = safeWarningCodes(input.futureAuditWarningCodes);
  return Array.from(
    new Set([
      ...conversionWarning,
      ...preflightWarning,
      ...controlWarnings,
      ...summaryWarnings,
      ...futureAuditWarnings
    ])
  );
}

function safeWarningCodes(value: unknown): string[] {
  return safeArray(value)
    .filter((item): item is string => typeof item === "string")
    .map((item) => warningCode(item))
    .filter((item) => item !== undefined);
}

function warningCode(value: string): string | undefined {
  const text = safeText(value, "").trim();
  if (text.length === 0) {
    return undefined;
  }
  return /^[A-Z0-9_.-]{1,64}$/.test(text) ? text : "EVENT_SUMMARY_WARNING";
}

function auditNextAction(
  input: AppWorkbenchSurfacesInput,
  eventOk: boolean
): string {
  if (input.conversionError?.errorCode === "FILE_EXISTS") {
    return "Choose a new draft filename or remove the existing file.";
  }
  if (input.preflight?.ok === false) {
    return "Fix runner preflight before Convert.";
  }
  if (!eventOk) {
    return "Review the safe event summary message and refresh events.";
  }
  if (input.controlProjection.runStatus === "completed") {
    return "Review the Event Log / Replay and Control Plane Projection summaries.";
  }
  return "Refresh events after Convert completes.";
}

function normalizeApprovalKind(value: unknown): AppApprovalItemView["kind"] {
  return value === "capability" ||
    value === "patch" ||
    value === "git" ||
    value === "shell" ||
    value === "bridge"
    ? value
    : "capability";
}

function normalizeApprovalStatus(
  value: unknown
): AppApprovalItemView["status"] {
  return value === "pending" || value === "blocked" || value === "dry"
    ? value
    : "dry";
}

function isControlWarning(value: unknown): value is AppControlPlaneWarningView {
  return isRecord(value) && typeof value.code === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
