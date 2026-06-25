import {
  buildMemoryRecallPreview,
  type MemoryRecallPreview,
  type SyntheticMemorySummaryForRecallPreview
} from "../../runtime/src/memory/recall-preview.js";
import type { AppContextCartView } from "./context-cart-view.js";
import type { AppMemoryInspectorView } from "./memory-inspector-view.js";
import type { AppRunDraftIntent, AppRunDraftView } from "./run-draft-view.js";
import { safeArray, safeErrorMessage, safeText } from "./safety.js";

export type AppMemoryRecallType = "policy" | "project_fact" | "pitfall";

export type AppMemoryRecallStatus =
  | "empty"
  | "preview"
  | "needs_clarification"
  | "warning"
  | "blocked";

export type AppMemoryRecallWarning = {
  code: string;
};

export type AppMemoryRecallPlacementView = "volatile_tail";

export type AppMemoryRecallQueryPreview = {
  intent: AppRunDraftIntent;
  objectiveSummary: string;
  acceptanceCriteriaCount: number;
  workspaceSummary: string;
  warningCodes: string[];
};

export type AppMemoryRecallItemView = {
  memoryId: string;
  type: AppMemoryRecallType;
  namespace: string;
  trustLevel: string;
  summary: string;
  score: number;
  reasonCodes: string[];
  provenanceRefCount: number;
  evidenceRefCount: number;
  tags: string[];
  placement: AppMemoryRecallPlacementView;
  warningCodes: string[];
};

export type AppMemoryRecallPreviewView = {
  status: AppMemoryRecallStatus;
  intent: AppRunDraftIntent;
  querySummary: AppMemoryRecallQueryPreview;
  itemCount: number;
  policyCount: number;
  projectFactCount: number;
  pitfallCount: number;
  highTrustCount: number;
  volatileTailCount: number;
  items: AppMemoryRecallItemView[];
  warnings: AppMemoryRecallWarning[];
  nextAction: string;
  source: "runtime_memory_core_preview" | "empty";
  previewOnly: true;
  persistenceConnected: false;
  eventWritesEnabled: false;
  frozenPrefixIncluded: false;
};

export type AppSyntheticMemorySummary =
  SyntheticMemorySummaryForRecallPreview & {
    reasonCodes?: string[] | undefined;
    warningCodes?: string[] | undefined;
    score?: number | undefined;
  };

export type AppMemoryRecallPreviewInput = {
  runDraft?: AppRunDraftView | undefined;
  objectiveSummary?: string | undefined;
  selectedIntent?: AppRunDraftIntent | undefined;
  acceptanceCriteriaCount?: number | undefined;
  workspaceRoot?: string | undefined;
  memoryInspector?: AppMemoryInspectorView | undefined;
  contextCart?: AppContextCartView | undefined;
  workspaceIndexRef?: unknown;
  syntheticMemorySummaries?: AppSyntheticMemorySummary[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const highTrustLevels = new Set([
  "explicit_user",
  "approval_record",
  "repository_rule",
  "workspace_rule",
  "verified_tool_result",
  "user_correction"
]);

export function buildMemoryRecallPreviewView(
  input: AppMemoryRecallPreviewInput = {}
): AppMemoryRecallPreviewView {
  const noRunDraft =
    input.runDraft === undefined || input.runDraft.status === "empty";
  const intent = normalizeIntent(
    input.runDraft?.intent ?? input.selectedIntent
  );
  const runtimePreview = buildMemoryRecallPreview({
    intent,
    objectiveSummary:
      input.runDraft?.objectiveSummary ?? input.objectiveSummary,
    acceptanceCriteriaCount:
      input.runDraft?.acceptanceCriteriaCount ??
      finiteNumber(input.acceptanceCriteriaCount),
    namespace: "desktop",
    tags: [
      intent,
      ...safeArray(input.runDraft?.acceptanceCriteria.summaries).map((item) =>
        safeText(item, "")
      )
    ],
    syntheticMemorySummaries: normalizeSyntheticSummaries(
      input.syntheticMemorySummaries
    ),
    runDraftRef: noRunDraft
      ? undefined
      : (input.runDraft?.draftId ?? `local-run-draft-${intent}`),
    workspaceIndexRef: summarizeWorkspaceIndexRef(input.workspaceIndexRef),
    contextSummaryRef: input.contextCart?.source ?? undefined,
    createdAt: input.createdAt ?? input.runDraft?.createdAt,
    idGenerator: input.idGenerator,
    allowCandidatePreview: true
  });

  return runtimePreviewToAppView(runtimePreview, input, intent, noRunDraft);
}

function runtimePreviewToAppView(
  preview: MemoryRecallPreview,
  input: AppMemoryRecallPreviewInput,
  intent: AppRunDraftIntent,
  noRunDraft: boolean
): AppMemoryRecallPreviewView {
  return {
    status: normalizeStatus(preview.status),
    intent,
    querySummary: {
      intent,
      objectiveSummary: summarizeObjective(input, preview),
      acceptanceCriteriaCount: preview.querySummary.acceptanceCriteriaCount,
      workspaceSummary: summarizeWorkspaceRoot(input.workspaceRoot),
      warningCodes: [...preview.querySummary.warningCodes]
    },
    itemCount: preview.itemCount,
    policyCount: preview.policyCount,
    projectFactCount: preview.projectFactCount,
    pitfallCount: preview.pitfallCount,
    highTrustCount: preview.items.filter((item) =>
      highTrustLevels.has(item.trustLevel)
    ).length,
    volatileTailCount: preview.volatileTailCount,
    items: preview.items.map((item) => ({
      memoryId: item.memoryId,
      type: item.type,
      namespace: item.namespace,
      trustLevel: item.trustLevel,
      summary: item.summary,
      score: item.score,
      reasonCodes: [...item.reasonCodes],
      provenanceRefCount: item.provenanceRefCount,
      evidenceRefCount: item.evidenceRefCount,
      tags: [...item.tags],
      placement: item.placement,
      warningCodes: [...item.warningCodes]
    })),
    warnings: preview.warnings.map((warning) => ({ code: warning.code })),
    nextAction: preview.nextAction,
    source: noRunDraft ? "empty" : "runtime_memory_core_preview",
    previewOnly: true,
    persistenceConnected: false,
    eventWritesEnabled: false,
    frozenPrefixIncluded: false
  };
}

function normalizeSyntheticSummaries(
  summaries: AppSyntheticMemorySummary[] | undefined
): SyntheticMemorySummaryForRecallPreview[] {
  return (Array.isArray(summaries) ? summaries : []).map((item) => ({
    memoryId: optionalString(item.memoryId),
    type: item.type,
    namespace: item.namespace,
    trustLevel: item.trustLevel,
    summary: item.summary,
    tags: safeArray(item.tags).filter(
      (tag): tag is string => typeof tag === "string"
    ),
    provenanceRefCount: finiteNumber(item.provenanceRefCount),
    evidenceRefCount: finiteNumber(item.evidenceRefCount),
    trigger: item.trigger,
    mitigation: item.mitigation,
    reasonCodes: safeArray(item.reasonCodes).filter(
      (code): code is string => typeof code === "string"
    ),
    status: item.status ?? "committed",
    updatedAt: item.updatedAt,
    pinned: item.pinned
  }));
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function summarizeObjective(
  input: AppMemoryRecallPreviewInput,
  preview: MemoryRecallPreview
): string {
  if (preview.querySummary.warningCodes.length > 0) {
    return "Query summary withheld by safety policy.";
  }
  return safeErrorMessage(
    safeText(
      input.runDraft?.objectiveSummary ?? input.objectiveSummary,
      "No local run draft objective yet."
    )
  ).slice(0, 160);
}

function summarizeWorkspaceRoot(value: unknown): string {
  const text = safeText(value, "");
  if (text.length === 0) {
    return "No workspace selected.";
  }
  const normalized = text.replace(/\\/g, "/").replace(/[?#].*$/, "");
  const parts = normalized.split("/").filter((part) => part.length > 0);
  const last = parts.at(-1);
  return last === undefined ? "Workspace selected." : `.../${last}`;
}

function summarizeWorkspaceIndexRef(value: unknown): string | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "workspaceIndexId" in value &&
    typeof value.workspaceIndexId === "string"
  ) {
    return value.workspaceIndexId;
  }
  const text = safeText(value, "");
  return text.length > 0 ? text.slice(0, 120) : undefined;
}

function normalizeIntent(value: unknown): AppRunDraftIntent {
  return value === "web_data_extraction" ||
    value === "code_change" ||
    value === "code_review" ||
    value === "verification" ||
    value === "documentation" ||
    value === "unknown"
    ? value
    : "unknown";
}

function normalizeStatus(value: MemoryRecallPreview["status"]) {
  return value;
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
