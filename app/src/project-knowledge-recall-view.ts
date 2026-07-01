import {
  buildProjectKnowledgeRecall,
  summarizeProjectKnowledgeRecall,
  type ProjectKnowledgeEntrySummary as RuntimeProjectKnowledgeEntrySummary,
  type ProjectKnowledgeRecallContextSegmentRef,
  type ProjectKnowledgeRecallFinding,
  type ProjectKnowledgeRecallInput,
  type ProjectKnowledgeRecallMatchedEntry,
  type ProjectKnowledgeRecallReadiness,
  type ProjectKnowledgeRecallStatus,
  type ProjectKnowledgeStoreSnapshot
} from "../../runtime/src/memory/index.js";
import type {
  ProjectKnowledgeEntrySummary,
  ProjectKnowledgeSnapshotResult
} from "./desktop-flow.js";
import type { ProjectKnowledgeReviewView } from "./project-knowledge-view.js";
import { safeText } from "./safety.js";

export type AppProjectKnowledgeRecallView = {
  status: ProjectKnowledgeRecallStatus;
  source: "app_project_knowledge_recall_integration";
  recallId: string;
  matchedEntryCount: number;
  policyCount: number;
  projectFactCount: number;
  pitfallCount: number;
  volatileTailCount: number;
  workspaceRulesSummaryCount: number;
  snapshotEntryCount: number;
  includeEntryIds: string[];
  excludeEntryIds: string[];
  policyRecallEnabled: boolean;
  querySummary: {
    objectiveHash: string;
    intent: string;
    workspaceRefCount: number;
    tagCount: number;
  };
  matchedEntries: ProjectKnowledgeRecallMatchedEntry[];
  contextSegmentRefs: ProjectKnowledgeRecallContextSegmentRef[];
  findings: ProjectKnowledgeRecallFinding[];
  warningCount: number;
  blockerCount: number;
  findingCount: number;
  recallHash: string;
  hashPrefix: string;
  readiness: ProjectKnowledgeRecallReadiness & {
    canPreviewRecall: boolean;
  };
  nextAction: string;
};

export type AppProjectKnowledgeRecallInput = {
  projectKnowledgeReview?: ProjectKnowledgeReviewView | undefined;
  taskObjective?: string | undefined;
  intent?: string | undefined;
  workspaceRefs?: string[] | undefined;
  tagsText?: string | undefined;
  maxEntries?: number | undefined;
  trustThreshold?: number | undefined;
  includeEntryIdsText?: string | undefined;
  excludeEntryIdsText?: string | undefined;
  policyRecallEnabled?: boolean | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const allowedStatuses = new Set<RuntimeProjectKnowledgeEntrySummary["status"]>([
  "candidate",
  "reviewed",
  "committed",
  "recalled",
  "revoked",
  "expired"
]);

export function buildProjectKnowledgeRecallView(
  input: AppProjectKnowledgeRecallInput = {}
): AppProjectKnowledgeRecallView {
  const snapshot = normalizeSnapshot(input.projectKnowledgeReview?.snapshot);
  const includeEntryIds = splitList(input.includeEntryIdsText);
  const excludeEntryIds = splitList(input.excludeEntryIdsText);
  const policyRecallEnabled = input.policyRecallEnabled === true;
  const humanReviewedPolicyEntryIds = policyRecallEnabled
    ? snapshot?.entries
        .filter((entry) => entry.type === "policy" && entry.entryId !== undefined)
        .map((entry) => entry.entryId!)
    : [];
  const recallInput: ProjectKnowledgeRecallInput = {
    taskObjective: safeText(input.taskObjective, ""),
    intent: safeText(input.intent, "unknown"),
    workspaceRefs: input.workspaceRefs ?? [],
    tags: splitList(input.tagsText),
    maxEntries: input.maxEntries,
    trustThreshold: input.trustThreshold,
    includeEntryIds,
    excludeEntryIds,
    policyRecallEnabled,
    humanReviewedPolicyEntryIds,
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  };
  if (snapshot !== undefined) {
    recallInput.snapshot = snapshot;
  }
  const result = buildProjectKnowledgeRecall(recallInput);
  const summary = summarizeProjectKnowledgeRecall(result);

  return {
    status: result.status,
    source: "app_project_knowledge_recall_integration",
    recallId: result.recallId,
    matchedEntryCount: summary.matchedEntryCount,
    policyCount: summary.policyCount,
    projectFactCount: summary.projectFactCount,
    pitfallCount: summary.pitfallCount,
    volatileTailCount: summary.volatileTailCount,
    workspaceRulesSummaryCount: summary.workspaceRulesSummaryCount,
    snapshotEntryCount: snapshot?.entries.length ?? 0,
    includeEntryIds,
    excludeEntryIds,
    policyRecallEnabled,
    querySummary: {
      objectiveHash: result.querySummary.objectiveHash,
      intent: result.querySummary.intent,
      workspaceRefCount: result.querySummary.workspaceRefCount,
      tagCount: result.querySummary.tagCount
    },
    matchedEntries: result.matchedEntries,
    contextSegmentRefs: result.contextSegmentRefs,
    findings: result.findings,
    warningCount: result.warningCount,
    blockerCount: result.blockerCount,
    findingCount: result.findingCount,
    recallHash: result.recallHash,
    hashPrefix: result.recallHash.slice(0, 12),
    readiness: {
      ...result.readiness,
      canPreviewRecall: snapshot !== undefined
    },
    nextAction: result.nextAction
  };
}

export function summarizeProjectKnowledgeRecallView(
  view: AppProjectKnowledgeRecallView
): {
  status: ProjectKnowledgeRecallStatus;
  matchedEntryCount: number;
  volatileTailCount: number;
  workspaceRulesSummaryCount: number;
  blockerCount: number;
  warningCount: number;
  hashPrefix: string;
  summaryOnly: true;
  source: "app_project_knowledge_recall_integration_summary";
} {
  return {
    status: view.status,
    matchedEntryCount: view.matchedEntryCount,
    volatileTailCount: view.volatileTailCount,
    workspaceRulesSummaryCount: view.workspaceRulesSummaryCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix,
    summaryOnly: true,
    source: "app_project_knowledge_recall_integration_summary"
  };
}

function normalizeSnapshot(
  snapshot: ProjectKnowledgeSnapshotResult | undefined
):
  | Pick<
      ProjectKnowledgeStoreSnapshot,
      "status" | "entries" | "warningCount" | "blockerCount" | "snapshotHash"
    >
  | undefined {
  if (snapshot === undefined) {
    return undefined;
  }
  return {
    status: snapshot.status,
    entries: snapshot.entries.map(normalizeEntry),
    warningCount: snapshot.warnings.length,
    blockerCount: 0,
    snapshotHash: snapshot.snapshotHash
  };
}

function normalizeEntry(
  entry: ProjectKnowledgeEntrySummary
): RuntimeProjectKnowledgeEntrySummary {
  const status = allowedStatuses.has(
    entry.status as RuntimeProjectKnowledgeEntrySummary["status"]
  )
    ? (entry.status as RuntimeProjectKnowledgeEntrySummary["status"])
    : "committed";
  return {
    entryId: safeText(entry.entryId, ""),
    type: entry.type,
    namespace: safeText(entry.namespace, ""),
    summary: safeText(entry.summary, ""),
    status,
    trustScore: 0.9,
    evidenceRefCount: entry.evidenceRefCount,
    tagCount: entry.tagCount,
    warningCodes: [...entry.warningCodes],
    entryHash: safeText(entry.entryHash, ""),
    summaryOnly: true
  };
}

function splitList(value: string | undefined): string[] {
  return safeText(value, "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
