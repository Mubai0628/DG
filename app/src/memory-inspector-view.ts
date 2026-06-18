import {
  safeArray,
  safeErrorMessage,
  safeText,
  type WorkspaceEventSummary
} from "./safety.js";
import type { AppControlPlaneProjectionView } from "./control-plane-view.js";

export type AppMemoryInspectorStatus =
  | "empty"
  | "summary"
  | "warning"
  | "error";

export type AppMemoryType = "policy" | "project_fact" | "pitfall";

export type AppMemoryTypeSummaryView = Record<AppMemoryType, number>;

export type AppMemoryStatusView =
  | "candidate"
  | "committed"
  | "recalled"
  | "revoked"
  | "expired"
  | "rejected";

export type AppMemoryInspectorWarning = {
  code: string;
};

export type AppMemoryItemInput = {
  memoryId?: string;
  type?: AppMemoryType;
  status?: AppMemoryStatusView;
  trustLevel?: string;
  namespace?: string;
  summary?: string;
  tags?: string[];
  provenanceRefCount?: number;
  evidenceRefCount?: number;
  createdAt?: string;
  updatedAt?: string;
  warningCodes?: string[];
};

export type AppMemoryCandidateInput = {
  candidateId?: string;
  proposedType?: AppMemoryType;
  status?: AppMemoryStatusView;
  proposedSummary?: string;
  source?: string;
  trustLevel?: string;
  reason?: string;
  warningCodes?: string[];
};

export type AppMemoryRecallInput = AppMemoryItemInput & {
  score?: number;
};

export type AppMemoryCandidateView = {
  candidateId: string;
  proposedType: AppMemoryType;
  status: AppMemoryStatusView;
  proposedSummary: string;
  source: string;
  trustLevel: string;
  reason: string;
  warningCodes: string[];
};

export type AppMemoryRecallView = {
  memoryId: string;
  type: AppMemoryType;
  status: AppMemoryStatusView;
  trustLevel: string;
  namespace: string;
  summary: string;
  tags: string[];
  provenanceRefCount: number;
  evidenceRefCount: number;
  createdAt: string;
  updatedAt: string;
  warningCodes: string[];
};

export type AppMemoryInspectorView = {
  status: AppMemoryInspectorStatus;
  typeCounts: AppMemoryTypeSummaryView;
  candidateCount: number;
  committedCount: number;
  recalledCount: number;
  revokedCount: number;
  expiredCount: number;
  items: AppMemoryRecallView[];
  candidates: AppMemoryCandidateView[];
  warnings: AppMemoryInspectorWarning[];
  nextAction: string;
  source: "empty" | "future_memory_core" | "mocked_view_model";
  readOnly: true;
  persistenceConnected: false;
  emptyMessages: string[];
};

export type AppMemoryInspectorInput = {
  memorySummaries?: AppMemoryItemInput[] | undefined;
  memoryCandidates?: AppMemoryCandidateInput[] | undefined;
  memoryRecallItems?: AppMemoryRecallInput[] | undefined;
  controlProjection?: AppControlPlaneProjectionView | undefined;
  eventSummary?: WorkspaceEventSummary | null | undefined;
  conversionError?:
    | { errorCode?: string | undefined; safeMessage?: string | undefined }
    | undefined;
  currentTaskId?: string | undefined;
};

const emptyMessages = [
  "No memory records are connected to the desktop shell yet.",
  "Runtime Memory Core is available, but this inspector is read-only and not connected to persistence.",
  "Future policy, project_fact, and pitfall memory summaries will appear here after explicit commit gates."
];

const forbiddenSummaryMarkers = [
  `raw${"Prompt"}`,
  `raw${"Dom"}`,
  `raw${"Csv"}`,
  `raw${"CSV"}`,
  `raw${"Screenshot"}`,
  `clip${"board"}`,
  "Authorization",
  "BEGIN PRIVATE KEY"
];

export function buildMemoryInspectorView(
  input: AppMemoryInspectorInput = {}
): AppMemoryInspectorView {
  const items = [
    ...safeArray(input.memorySummaries).map((item, index) =>
      normalizeMemoryItem(item, `memory-${index + 1}`)
    ),
    ...safeArray(input.memoryRecallItems).map((item, index) =>
      normalizeMemoryItem(item, `recall-${index + 1}`, "recalled")
    )
  ];
  const candidates = safeArray(input.memoryCandidates).map((item, index) =>
    normalizeCandidate(item, index)
  );
  const warnings = memoryWarningCodes(input).map((code) => ({ code }));
  const typeCounts = countTypes(items, candidates);
  const status: AppMemoryInspectorStatus =
    warnings.length > 0
      ? "warning"
      : items.length > 0 || candidates.length > 0
        ? "summary"
        : "empty";

  return {
    status,
    typeCounts,
    candidateCount: candidates.length,
    committedCount: countStatus(items, "committed"),
    recalledCount: countStatus(items, "recalled"),
    revokedCount: countStatus(items, "revoked"),
    expiredCount: countStatus(items, "expired"),
    items,
    candidates,
    warnings,
    nextAction: nextAction(input, items.length, candidates.length),
    source:
      items.length > 0 || candidates.length > 0
        ? "future_memory_core"
        : "empty",
    readOnly: true,
    persistenceConnected: false,
    emptyMessages
  };
}

function normalizeMemoryItem(
  item: unknown,
  fallbackId: string,
  fallbackStatus: AppMemoryStatusView = "committed"
): AppMemoryRecallView {
  const record = isRecord(item) ? item : {};
  return {
    memoryId: safeText(record.memoryId, fallbackId),
    type: normalizeMemoryType(record.type),
    status: normalizeStatus(record.status, fallbackStatus),
    trustLevel: safeSummary(record.trustLevel, "unknown"),
    namespace: safeSummary(record.namespace, "default"),
    summary: safeSummary(record.summary, "Summary unavailable"),
    tags: safeStringList(record.tags),
    provenanceRefCount: finiteNumber(record.provenanceRefCount),
    evidenceRefCount: finiteNumber(record.evidenceRefCount),
    createdAt: safeText(record.createdAt, "n/a"),
    updatedAt: safeText(record.updatedAt, "n/a"),
    warningCodes: safeWarningCodes(record.warningCodes)
  };
}

function normalizeCandidate(
  item: unknown,
  index: number
): AppMemoryCandidateView {
  const record = isRecord(item) ? item : {};
  return {
    candidateId: safeText(record.candidateId, `candidate-${index + 1}`),
    proposedType: normalizeMemoryType(record.proposedType),
    status: normalizeStatus(record.status, "candidate"),
    proposedSummary: safeSummary(
      record.proposedSummary,
      "Candidate summary unavailable"
    ),
    source: safeSummary(record.source, "unknown"),
    trustLevel: safeSummary(record.trustLevel, "unknown"),
    reason: safeSummary(record.reason, "Commit gate UI is not enabled"),
    warningCodes: safeWarningCodes(record.warningCodes)
  };
}

function countTypes(
  items: AppMemoryRecallView[],
  candidates: AppMemoryCandidateView[]
): AppMemoryTypeSummaryView {
  const counts: AppMemoryTypeSummaryView = {
    policy: 0,
    project_fact: 0,
    pitfall: 0
  };
  for (const item of items) {
    counts[item.type] += 1;
  }
  for (const candidate of candidates) {
    counts[candidate.proposedType] += 1;
  }
  return counts;
}

function countStatus(
  items: AppMemoryRecallView[],
  status: AppMemoryStatusView
): number {
  return items.filter((item) => item.status === status).length;
}

function memoryWarningCodes(input: AppMemoryInspectorInput): string[] {
  const conversionWarning =
    input.conversionError?.errorCode === "FILE_EXISTS" ? ["FILE_EXISTS"] : [];
  const eventWarning =
    input.eventSummary !== null &&
    input.eventSummary !== undefined &&
    input.eventSummary.ok === false
      ? ["EVENT_SUMMARY_UNAVAILABLE"]
      : [];
  return Array.from(new Set([...conversionWarning, ...eventWarning]));
}

function nextAction(
  input: AppMemoryInspectorInput,
  itemCount: number,
  candidateCount: number
): string {
  if (input.conversionError?.errorCode === "FILE_EXISTS") {
    return "Choose a new draft filename or remove the existing file.";
  }
  if (candidateCount > 0) {
    return "Review candidate summaries only. Commit gate UI is not enabled in this phase.";
  }
  if (itemCount > 0) {
    return "Review memory summaries only. Persistence and mutation controls are disabled.";
  }
  return "Memory Inspector is read-only. Future committed memory summaries and candidates will appear here.";
}

function normalizeMemoryType(value: unknown): AppMemoryType {
  return value === "policy" || value === "project_fact" || value === "pitfall"
    ? value
    : "project_fact";
}

function normalizeStatus(
  value: unknown,
  fallback: AppMemoryStatusView
): AppMemoryStatusView {
  return value === "candidate" ||
    value === "committed" ||
    value === "recalled" ||
    value === "revoked" ||
    value === "expired" ||
    value === "rejected"
    ? value
    : fallback;
}

function safeSummary(value: unknown, fallback: string): string {
  const text = safeText(value, fallback);
  if (
    forbiddenSummaryMarkers.some((marker) =>
      text.toLowerCase().includes(marker.toLowerCase())
    )
  ) {
    return "Summary withheld by safety policy.";
  }
  return safeErrorMessage(text);
}

function safeStringList(value: unknown): string[] {
  return safeArray(value)
    .filter((item): item is string => typeof item === "string")
    .map((item) => safeSummary(item, "tag"))
    .slice(0, 8);
}

function safeWarningCodes(value: unknown): string[] {
  return safeArray(value)
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => /^[A-Z0-9_.-]{1,64}$/.test(item));
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
