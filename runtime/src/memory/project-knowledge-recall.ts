import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type {
  ProjectKnowledgeEntrySummary,
  ProjectKnowledgeEntryType,
  ProjectKnowledgeStatus,
  ProjectKnowledgeStoreSnapshot
} from "./project-knowledge-store.js";

export type ProjectKnowledgeRecallStatus =
  | "empty"
  | "recall_ready"
  | "warning"
  | "blocked";

export type ProjectKnowledgeRecallPlacement =
  | "volatile_tail"
  | "workspace_rules_summary";

export type ProjectKnowledgeRecallSeverity = "blocker" | "warning";

export type ProjectKnowledgeRecallFinding = {
  findingId: string;
  severity: ProjectKnowledgeRecallSeverity;
  code: string;
  safeMessage: string;
  entryId?: string | undefined;
};

export type ProjectKnowledgeRecallMatchedEntry = {
  entryId: string;
  type: ProjectKnowledgeEntryType;
  namespace: string;
  summary: string;
  status: ProjectKnowledgeStatus;
  score: number;
  reasonCodes: string[];
  placement: ProjectKnowledgeRecallPlacement;
  evidenceRefCount: number;
  tagCount: number;
  warningCodes: string[];
  entryHash?: string | undefined;
};

export type ProjectKnowledgeRecallContextSegmentRef = {
  segmentId: string;
  entryId: string;
  layer: "volatile_tail" | "workspace_rules";
  placement: ProjectKnowledgeRecallPlacement;
  sourceRefId: string;
  summary: string;
  hashPrefix: string;
  warningCodes: string[];
  noCompress: false;
};

export type ProjectKnowledgeRecallReadiness = {
  canEnterContextAssembly: boolean;
  canMutateProjectKnowledge: false;
  canCommitMemory: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ProjectKnowledgeRecallInput = {
  snapshot?: Pick<
    ProjectKnowledgeStoreSnapshot,
    "status" | "entries" | "warningCount" | "blockerCount" | "snapshotHash"
  >;
  taskObjective?: string | undefined;
  intent?: string | undefined;
  workspaceRefs?: string[] | undefined;
  tags?: string[] | undefined;
  maxEntries?: number | undefined;
  trustThreshold?: number | undefined;
  includeEntryIds?: string[] | undefined;
  excludeEntryIds?: string[] | undefined;
  policyRecallEnabled?: boolean | undefined;
  humanReviewedPolicyEntryIds?: string[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ProjectKnowledgeRecallSummary = {
  status: ProjectKnowledgeRecallStatus;
  recallId: string;
  matchedEntryCount: number;
  policyCount: number;
  projectFactCount: number;
  pitfallCount: number;
  volatileTailCount: number;
  workspaceRulesSummaryCount: number;
  warningCount: number;
  blockerCount: number;
  recallHash: string;
  summaryOnly: true;
  source: "runtime_project_knowledge_recall_summary";
};

export type ProjectKnowledgeRecallResult = {
  status: ProjectKnowledgeRecallStatus;
  recallId: string;
  querySummary: {
    intent: string;
    objectiveHash: string;
    workspaceRefCount: number;
    tagCount: number;
    maxEntries: number;
    trustThreshold: number;
    policyRecallEnabled: boolean;
  };
  matchedEntries: ProjectKnowledgeRecallMatchedEntry[];
  contextSegmentRefs: ProjectKnowledgeRecallContextSegmentRef[];
  findings: ProjectKnowledgeRecallFinding[];
  warningCount: number;
  blockerCount: number;
  findingCount: number;
  recallHash: string;
  readiness: ProjectKnowledgeRecallReadiness;
  nextAction: string;
  source: "runtime_project_knowledge_recall_integration";
};

const defaultMaxEntries = 6;
const defaultTrustThreshold = 0.5;
const activeStatuses = new Set<ProjectKnowledgeStatus>([
  "committed",
  "recalled",
  "reviewed"
]);
const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authHeaderField = ["Author", "ization"].join("");

const forbiddenFieldNames = new Set(
  [
    rawPrefix + "Prompt",
    "promptText",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Response",
    "reasoningContent",
    "reasoning_content",
    apiKeyField,
    "apiKeyValue",
    authHeaderField,
    "token",
    "secret",
    "command",
    "shellCommand",
    "gitCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow"
  ].map((key) => key.toLowerCase())
);

const executionAttemptFieldNames = new Set(
  [
    "canApplyPatch",
    "canRollback",
    "canWriteFilesystem",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowEventStoreWrite",
    "allowGit",
    "allowShell",
    "allowAppExecution",
    "executeNow"
  ].map((key) => key.toLowerCase())
);

const unsafePatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`, "i")
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/i
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i
  },
  {
    code: "RAW_CONTENT_MARKER",
    pattern: /raw content|workspace dump|file content/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildProjectKnowledgeRecall(
  input: ProjectKnowledgeRecallInput = {}
): ProjectKnowledgeRecallResult {
  const findings = [
    ...findForbiddenFields(input),
    ...findUnsafeMarkers(input)
  ];
  const snapshot = input.snapshot;
  const maxEntries = clampPositive(input.maxEntries, defaultMaxEntries, 25);
  const trustThreshold = clampThreshold(input.trustThreshold);
  const policyRecallEnabled = input.policyRecallEnabled === true;
  const queryTokens = tokenSet([
    input.taskObjective,
    input.intent,
    ...(input.tags ?? []),
    ...(input.workspaceRefs ?? [])
  ]);
  const includeEntryIds = new Set(input.includeEntryIds ?? []);
  const excludeEntryIds = new Set(input.excludeEntryIds ?? []);
  const humanReviewedPolicyEntryIds = new Set(
    input.humanReviewedPolicyEntryIds ?? []
  );

  if (snapshot === undefined || snapshot.entries.length === 0) {
    return resultFromMatches({
      input,
      maxEntries,
      trustThreshold,
      policyRecallEnabled,
      matches: [],
      findings,
      statusOverride:
        findings.some((finding) => finding.severity === "blocker")
          ? "blocked"
          : "empty",
      nextAction: "Commit project knowledge before recall can produce refs."
    });
  }

  if (snapshot.blockerCount > 0 || snapshot.status === "blocked") {
    findings.push(finding("SNAPSHOT_BLOCKED", "blocker"));
  }
  if (snapshot.warningCount > 0 || snapshot.status === "warning") {
    findings.push(finding("SNAPSHOT_WARNING", "warning"));
  }

  if (findings.some((finding) => finding.severity === "blocker")) {
    return resultFromMatches({
      input,
      maxEntries,
      trustThreshold,
      policyRecallEnabled,
      matches: [],
      findings,
      statusOverride: "blocked",
      nextAction: "Remove unsafe project knowledge recall input before context assembly."
    });
  }

  const matches = snapshot.entries
    .map((entry) =>
      matchEntry({
        entry,
        queryTokens,
        includeEntryIds,
        excludeEntryIds,
        trustThreshold,
        policyRecallEnabled,
        humanReviewedPolicyEntryIds,
        findings
      })
    )
    .filter((entry): entry is ProjectKnowledgeRecallMatchedEntry =>
      entry !== undefined
    )
    .sort(compareMatches)
    .slice(0, maxEntries);

  return resultFromMatches({
    input,
    maxEntries,
    trustThreshold,
    policyRecallEnabled,
    matches,
    findings,
    nextAction:
      matches.length === 0
        ? "No committed project knowledge matched this task summary."
        : undefined
  });
}

export function summarizeProjectKnowledgeRecall(
  result: ProjectKnowledgeRecallResult
): ProjectKnowledgeRecallSummary {
  return {
    status: result.status,
    recallId: result.recallId,
    matchedEntryCount: result.matchedEntries.length,
    policyCount: result.matchedEntries.filter((entry) => entry.type === "policy")
      .length,
    projectFactCount: result.matchedEntries.filter(
      (entry) => entry.type === "project_fact"
    ).length,
    pitfallCount: result.matchedEntries.filter((entry) => entry.type === "pitfall")
      .length,
    volatileTailCount: result.contextSegmentRefs.filter(
      (ref) => ref.placement === "volatile_tail"
    ).length,
    workspaceRulesSummaryCount: result.contextSegmentRefs.filter(
      (ref) => ref.placement === "workspace_rules_summary"
    ).length,
    warningCount: result.warningCount,
    blockerCount: result.blockerCount,
    recallHash: result.recallHash,
    summaryOnly: true,
    source: "runtime_project_knowledge_recall_summary"
  };
}

function matchEntry(input: {
  entry: ProjectKnowledgeEntrySummary;
  queryTokens: Set<string>;
  includeEntryIds: Set<string>;
  excludeEntryIds: Set<string>;
  trustThreshold: number;
  policyRecallEnabled: boolean;
  humanReviewedPolicyEntryIds: Set<string>;
  findings: ProjectKnowledgeRecallFinding[];
}): ProjectKnowledgeRecallMatchedEntry | undefined {
  const entryId = input.entry.entryId ?? "";
  if (entryId.length === 0 || input.excludeEntryIds.has(entryId)) {
    return undefined;
  }
  const status = input.entry.status ?? "candidate";
  if (!activeStatuses.has(status)) {
    return undefined;
  }
  const trustScore = input.entry.trustScore ?? 0;
  if (trustScore < input.trustThreshold && !input.includeEntryIds.has(entryId)) {
    return undefined;
  }
  const type = input.entry.type;
  if (type === undefined || input.entry.namespace === undefined) {
    return undefined;
  }
  if (type === "policy") {
    if (!input.policyRecallEnabled) {
      input.findings.push(
        finding("POLICY_RECALL_EXPLICIT_ENABLE_REQUIRED", "warning", entryId)
      );
      return undefined;
    }
    if (!input.humanReviewedPolicyEntryIds.has(entryId)) {
      input.findings.push(
        finding("POLICY_RECALL_HUMAN_REVIEW_REQUIRED", "warning", entryId)
      );
      return undefined;
    }
  }
  const summary = input.entry.summary ?? "";
  const entryTokens = tokenSet([
    summary,
    input.entry.namespace,
    type,
    ...(input.entry.warningCodes ?? [])
  ]);
  const overlap = [...entryTokens].filter((token) =>
    input.queryTokens.has(token)
  );
  const included = input.includeEntryIds.has(entryId);
  if (overlap.length === 0 && !included) {
    return undefined;
  }
  const score =
    overlap.length * 10 +
    trustScore * 20 +
    (included ? 100 : 0) +
    (type === "pitfall" ? 3 : 0);
  return {
    entryId,
    type,
    namespace: input.entry.namespace,
    summary: safeSummary(summary),
    status,
    score,
    reasonCodes: included
      ? ["explicit_include", ...overlap.map((token) => `matched:${token}`)]
      : overlap.map((token) => `matched:${token}`),
    placement:
      type === "policy" ? "workspace_rules_summary" : "volatile_tail",
    evidenceRefCount: input.entry.evidenceRefCount,
    tagCount: input.entry.tagCount,
    warningCodes: [...input.entry.warningCodes],
    ...(input.entry.entryHash !== undefined
      ? { entryHash: input.entry.entryHash }
      : {})
  };
}

function resultFromMatches(input: {
  input: ProjectKnowledgeRecallInput;
  maxEntries: number;
  trustThreshold: number;
  policyRecallEnabled: boolean;
  matches: ProjectKnowledgeRecallMatchedEntry[];
  findings: ProjectKnowledgeRecallFinding[];
  statusOverride?: ProjectKnowledgeRecallStatus | undefined;
  nextAction?: string | undefined;
}): ProjectKnowledgeRecallResult {
  const blockerCount = input.findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = input.findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const contextSegmentRefs = input.matches.map((entry) =>
    contextSegmentRef(entry)
  );
  const status =
    input.statusOverride ??
    (blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : input.matches.length === 0
          ? "empty"
          : "recall_ready");
  const recallHash = stablePreviewHash(
    JSON.stringify({
      source: "runtime_project_knowledge_recall_integration",
      status,
      snapshotHash: input.input.snapshot?.snapshotHash,
      matches: input.matches.map((entry) => ({
        entryId: entry.entryId,
        score: entry.score,
        placement: entry.placement
      })),
      findings: input.findings.map((finding) => finding.code)
    })
  );
  return {
    status,
    recallId:
      input.input.idGenerator?.() ??
      `project-knowledge-recall-${recallHash.slice(0, 12)}`,
    querySummary: {
      intent: safeToken(input.input.intent, "unknown"),
      objectiveHash: stablePreviewHash(input.input.taskObjective ?? "").slice(
        0,
        16
      ),
      workspaceRefCount: input.input.workspaceRefs?.length ?? 0,
      tagCount: input.input.tags?.length ?? 0,
      maxEntries: input.maxEntries,
      trustThreshold: input.trustThreshold,
      policyRecallEnabled: input.policyRecallEnabled
    },
    matchedEntries: input.matches,
    contextSegmentRefs,
    findings: input.findings,
    warningCount,
    blockerCount,
    findingCount: input.findings.length,
    recallHash,
    readiness: {
      canEnterContextAssembly: blockerCount === 0 && input.matches.length > 0,
      canMutateProjectKnowledge: false,
      canCommitMemory: false,
      canApplyPatch: false,
      canRollback: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: input.nextAction ?? nextActionFor(status),
    source: "runtime_project_knowledge_recall_integration"
  };
}

function contextSegmentRef(
  entry: ProjectKnowledgeRecallMatchedEntry
): ProjectKnowledgeRecallContextSegmentRef {
  const hashPrefix = stablePreviewHash(
    JSON.stringify({
      entryId: entry.entryId,
      placement: entry.placement,
      summary: entry.summary
    })
  ).slice(0, 16);
  return {
    segmentId: `project-knowledge-${entry.entryId}`,
    entryId: entry.entryId,
    layer:
      entry.placement === "workspace_rules_summary"
        ? "workspace_rules"
        : "volatile_tail",
    placement: entry.placement,
    sourceRefId: `project-knowledge:${entry.entryId}`,
    summary: `${entry.type}:${entry.namespace}:${entry.summary}`,
    hashPrefix,
    warningCodes: [...entry.warningCodes],
    noCompress: false
  };
}

function compareMatches(
  left: ProjectKnowledgeRecallMatchedEntry,
  right: ProjectKnowledgeRecallMatchedEntry
): number {
  return right.score - left.score || left.entryId.localeCompare(right.entryId);
}

function findForbiddenFields(value: unknown): ProjectKnowledgeRecallFinding[] {
  const findings: ProjectKnowledgeRecallFinding[] = [];
  visit(value, (key, item) => {
    if (forbiddenFieldNames.has(key.toLowerCase())) {
      findings.push(finding(`${key.toUpperCase()}_FIELD_REJECTED`, "blocker"));
    }
    if (executionAttemptFieldNames.has(key.toLowerCase()) && item === true) {
      findings.push(finding("EXECUTION_READINESS_TRUE", "blocker"));
    }
  });
  return uniqueFindings(findings);
}

function findUnsafeMarkers(value: unknown): ProjectKnowledgeRecallFinding[] {
  const serialized = JSON.stringify(toSafeScanValue(value));
  return unsafePatterns
    .filter(({ pattern }) => pattern.test(serialized))
    .map(({ code }) => finding(code, "blocker"));
}

function toSafeScanValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 1_000 ? value.slice(0, 1_000) : value;
  }
  if (Array.isArray(value)) {
    return value.map(toSafeScanValue);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toSafeScanValue(item)])
    );
  }
  return value;
}

function visit(value: unknown, callback: (key: string, item: unknown) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      visit(item, callback);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    callback(key, item);
    visit(item, callback);
  }
}

function tokenSet(values: Array<string | undefined>): Set<string> {
  const tokens = new Set<string>();
  for (const value of values) {
    for (const token of (value ?? "").toLowerCase().split(/[^a-z0-9_]+/)) {
      if (token.length >= 3) {
        tokens.add(token);
      }
    }
  }
  return tokens;
}

function safeSummary(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 320);
}

function safeToken(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function clampPositive(
  value: number | undefined,
  fallback: number,
  max: number
): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(Math.floor(value), max)
    : fallback;
}

function clampThreshold(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : defaultTrustThreshold;
}

function nextActionFor(status: ProjectKnowledgeRecallStatus): string {
  switch (status) {
    case "recall_ready":
      return "Review matched project knowledge refs before context assembly.";
    case "warning":
      return "Review recall warnings before including project knowledge refs.";
    case "blocked":
      return "Remove unsafe recall input before context assembly.";
    case "empty":
      return "No project knowledge recall refs are available for this task.";
  }
}

function finding(
  code: string,
  severity: ProjectKnowledgeRecallSeverity,
  entryId?: string
): ProjectKnowledgeRecallFinding {
  return {
    findingId: `${code.toLowerCase()}-${stablePreviewHash(
      `${code}:${entryId ?? "global"}`
    ).slice(0, 8)}`,
    severity,
    code,
    safeMessage: code.toLowerCase().replace(/_/g, " "),
    ...(entryId !== undefined ? { entryId } : {})
  };
}

function uniqueFindings(
  findings: ProjectKnowledgeRecallFinding[]
): ProjectKnowledgeRecallFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.code}:${item.severity}:${item.entryId ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
