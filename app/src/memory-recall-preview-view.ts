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
  source: "local_preview" | "empty";
  previewOnly: true;
  persistenceConnected: false;
  eventWritesEnabled: false;
  frozenPrefixIncluded: false;
};

export type AppSyntheticMemorySummary = {
  memoryId?: string | undefined;
  type?: AppMemoryRecallType | undefined;
  namespace?: string | undefined;
  trustLevel?: string | undefined;
  summary?: string | undefined;
  tags?: string[] | undefined;
  provenanceRefCount?: number | undefined;
  evidenceRefCount?: number | undefined;
  trigger?: string | undefined;
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

const supportedTypes: AppMemoryRecallType[] = [
  "policy",
  "project_fact",
  "pitfall"
];

const typePriority: Record<AppMemoryRecallType, number> = {
  policy: 0,
  project_fact: 1,
  pitfall: 2
};

const policyTrustLevels = new Set([
  "explicit_user",
  "approval_record",
  "repository_rule",
  "workspace_rule"
]);

const highTrustLevels = new Set([
  ...policyTrustLevels,
  "verified_tool_result",
  "user_correction"
]);

const unsafePatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{16,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: /\bAuthorization\s*:/i
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\braw${"Prompt"}\\b`, "i")
  },
  {
    code: "RAW_DOM_MARKER",
    pattern: new RegExp(`\\braw${"Dom"}\\b|raw DOM`, "i")
  },
  {
    code: "RAW_CSV_MARKER",
    pattern: new RegExp(`\\braw${"Csv"}\\b|raw CSV`, "i")
  },
  {
    code: "RAW_SCREENSHOT_MARKER",
    pattern: new RegExp(`\\braw${"Screenshot"}\\b|screenshot`, "i")
  },
  {
    code: "CLIPBOARD_MARKER",
    pattern: new RegExp(`\\bclip${"board"}\\b`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "URL_QUERY_SECRET_MARKER",
    pattern: /https?:\/\/\S+\?(?=\S*(token|key|secret|auth|password)=)/i
  }
];

export function buildMemoryRecallPreviewView(
  input: AppMemoryRecallPreviewInput = {}
): AppMemoryRecallPreviewView {
  const intent = normalizeIntent(
    input.runDraft?.intent ?? input.selectedIntent
  );
  const querySummary = buildQuerySummary(input, intent);
  const baseWarnings = validateMemoryRecallPreviewInput(input).warningCodes;

  if (input.runDraft === undefined || input.runDraft.status === "empty") {
    return emptyPreview(intent, querySummary, baseWarnings);
  }

  if (intent === "unknown") {
    return previewFromItems(
      intent,
      querySummary,
      [],
      [...baseWarnings, "INTENT_UNKNOWN_NEEDS_CLARIFICATION"]
    );
  }

  const queryTokens = queryTokenSet(input, querySummary);
  const normalized = safeArray(input.syntheticMemorySummaries)
    .map((item, index) => normalizeRecallItem(item, index, queryTokens, intent))
    .filter((item): item is AppMemoryRecallItemView => item !== undefined);
  const skippedWarnings = skippedSummaryWarnings(
    input.syntheticMemorySummaries
  );
  const items = normalized.sort(compareRecallItems);

  return previewFromItems(intent, querySummary, items, [
    ...baseWarnings,
    ...skippedWarnings
  ]);
}

export function validateMemoryRecallPreviewInput(
  input: AppMemoryRecallPreviewInput
): { ok: boolean; warningCodes: string[] } {
  const warningCodes = unsafeWarningCodes(
    [
      input.objectiveSummary,
      input.runDraft?.objectiveSummary,
      input.workspaceRoot,
      ...safeArray(input.syntheticMemorySummaries).flatMap((item) =>
        isRecord(item)
          ? [
              item.summary,
              item.namespace,
              safeArray(item.tags).join(" "),
              safeArray(item.reasonCodes).join(" ")
            ]
          : []
      )
    ].join("\n")
  );
  return {
    ok: warningCodes.length === 0,
    warningCodes
  };
}

function emptyPreview(
  intent: AppRunDraftIntent,
  querySummary: AppMemoryRecallQueryPreview,
  warningCodes: readonly string[]
): AppMemoryRecallPreviewView {
  return {
    status: warningCodes.length > 0 ? "warning" : "empty",
    intent,
    querySummary,
    itemCount: 0,
    policyCount: 0,
    projectFactCount: 0,
    pitfallCount: 0,
    highTrustCount: 0,
    volatileTailCount: 0,
    items: [],
    warnings: warningCodes.map((code) => ({ code })),
    nextAction:
      "Preview a local run draft first. Memory recall summaries will appear here before context assembly.",
    source: "empty",
    previewOnly: true,
    persistenceConnected: false,
    eventWritesEnabled: false,
    frozenPrefixIncluded: false
  };
}

function previewFromItems(
  intent: AppRunDraftIntent,
  querySummary: AppMemoryRecallQueryPreview,
  items: readonly AppMemoryRecallItemView[],
  warningCodes: readonly string[]
): AppMemoryRecallPreviewView {
  const warnings = uniqueStrings(warningCodes);
  const status = statusFor(intent, items, warnings);

  return {
    status,
    intent,
    querySummary,
    itemCount: items.length,
    policyCount: items.filter((item) => item.type === "policy").length,
    projectFactCount: items.filter((item) => item.type === "project_fact")
      .length,
    pitfallCount: items.filter((item) => item.type === "pitfall").length,
    highTrustCount: items.filter((item) => highTrustLevels.has(item.trustLevel))
      .length,
    volatileTailCount: items.filter(
      (item) => item.placement === "volatile_tail"
    ).length,
    items: [...items],
    warnings: warnings.map((code) => ({ code })),
    nextAction: nextActionFor(status, items.length),
    source: "local_preview",
    previewOnly: true,
    persistenceConnected: false,
    eventWritesEnabled: false,
    frozenPrefixIncluded: false
  };
}

function normalizeRecallItem(
  item: unknown,
  index: number,
  queryTokens: ReadonlySet<string>,
  intent: AppRunDraftIntent
): AppMemoryRecallItemView | undefined {
  const record = isRecord(item) ? item : {};
  const type = normalizeType(record.type);
  const trustLevel = sanitizeToken(record.trustLevel, "unknown");
  const namespace = sanitizeToken(record.namespace, "default");
  const summaryWarnings = unsafeWarningCodes(
    [
      record.summary,
      namespace,
      safeArray(record.tags).join(" "),
      safeArray(record.reasonCodes).join(" ")
    ].join("\n")
  );

  if (summaryWarnings.length > 0) {
    return undefined;
  }
  if (type === "policy" && !policyTrustLevels.has(trustLevel)) {
    return undefined;
  }

  const provenanceRefCount = finiteNumber(record.provenanceRefCount);
  const evidenceRefCount = finiteNumber(record.evidenceRefCount);
  if (type === "project_fact" && provenanceRefCount + evidenceRefCount <= 0) {
    return undefined;
  }

  const reasonCodes = safeReasonCodes(record.reasonCodes);
  const trigger = safeText(record.trigger, "");
  if (type === "pitfall" && trigger.length === 0 && reasonCodes.length === 0) {
    return undefined;
  }

  const tags = safeTags(record.tags);
  const summary = sanitizeSummary(record.summary);
  const score = recallScore({
    summary,
    tags,
    type,
    trustLevel,
    explicitScore: finiteNumber(record.score),
    queryTokens,
    intent
  });
  if (score <= 0) {
    return undefined;
  }

  return {
    memoryId: safeText(record.memoryId, `memory-preview-${index + 1}`),
    type,
    namespace,
    trustLevel,
    summary,
    score,
    reasonCodes,
    provenanceRefCount,
    evidenceRefCount,
    tags,
    placement: "volatile_tail",
    warningCodes: safeWarningCodes(record.warningCodes)
  };
}

function buildQuerySummary(
  input: AppMemoryRecallPreviewInput,
  intent: AppRunDraftIntent
): AppMemoryRecallQueryPreview {
  const warningCodes = unsafeWarningCodes(
    [
      input.objectiveSummary,
      input.runDraft?.objectiveSummary,
      input.workspaceRoot
    ].join("\n")
  );
  return {
    intent,
    objectiveSummary:
      warningCodes.length > 0
        ? "Query summary withheld by safety policy."
        : safeErrorMessage(
            safeText(
              input.runDraft?.objectiveSummary ?? input.objectiveSummary,
              "No local run draft objective yet."
            )
          ).slice(0, 160),
    acceptanceCriteriaCount:
      input.runDraft?.acceptanceCriteriaCount ??
      finiteNumber(input.acceptanceCriteriaCount),
    workspaceSummary: summarizeWorkspaceRoot(input.workspaceRoot),
    warningCodes
  };
}

function queryTokenSet(
  input: AppMemoryRecallPreviewInput,
  querySummary: AppMemoryRecallQueryPreview
): Set<string> {
  return new Set(
    tokenize(
      [
        querySummary.intent,
        querySummary.objectiveSummary,
        safeArray(input.runDraft?.acceptanceCriteria.summaries).join(" "),
        querySummary.workspaceSummary
      ].join(" ")
    )
  );
}

function recallScore(input: {
  summary: string;
  tags: readonly string[];
  type: AppMemoryRecallType;
  trustLevel: string;
  explicitScore: number;
  queryTokens: ReadonlySet<string>;
  intent: AppRunDraftIntent;
}): number {
  const recallTokens = tokenize(
    [input.summary, input.tags.join(" "), input.type].join(" ")
  );
  const overlap = recallTokens.filter((token) =>
    input.queryTokens.has(token)
  ).length;
  const intentMatch = input.tags.includes(input.intent) ? 2 : 0;
  const trustBoost = highTrustLevels.has(input.trustLevel) ? 2 : 0;
  const explicitBoost = Math.max(0, Math.min(20, input.explicitScore));
  return overlap * 10 + intentMatch * 5 + trustBoost + explicitBoost;
}

function compareRecallItems(
  left: AppMemoryRecallItemView,
  right: AppMemoryRecallItemView
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  if (typePriority[left.type] !== typePriority[right.type]) {
    return typePriority[left.type] - typePriority[right.type];
  }
  return left.memoryId.localeCompare(right.memoryId);
}

function statusFor(
  intent: AppRunDraftIntent,
  items: readonly AppMemoryRecallItemView[],
  warnings: readonly string[]
): AppMemoryRecallStatus {
  if (intent === "unknown") {
    return "needs_clarification";
  }
  if (warnings.some((code) => code.endsWith("_MARKER"))) {
    return "blocked";
  }
  if (items.length === 0) {
    return warnings.length > 0 ? "warning" : "empty";
  }
  return warnings.length > 0 ? "warning" : "preview";
}

function nextActionFor(
  status: AppMemoryRecallStatus,
  itemCount: number
): string {
  if (status === "needs_clarification") {
    return "Clarify the draft intent before memory recall preview can be trusted.";
  }
  if (status === "blocked") {
    return "Remove unsafe markers before reviewing memory recall summaries.";
  }
  if (itemCount === 0) {
    return "Memory Core is available, but desktop persistence is not connected yet.";
  }
  if (status === "warning") {
    return "Review memory recall warning codes. All recalled refs remain volatile_tail only.";
  }
  return "Preview only. Recalled memory refs would enter volatile_tail, not frozen prefix.";
}

function skippedSummaryWarnings(items: unknown[] | undefined): string[] {
  const codes: string[] = [];
  for (const item of safeArray(items)) {
    if (!isRecord(item)) {
      continue;
    }
    if (
      unsafeWarningCodes(
        [
          item.summary,
          item.namespace,
          safeArray(item.tags).join(" "),
          safeArray(item.reasonCodes).join(" ")
        ].join("\n")
      ).length > 0
    ) {
      codes.push("MEMORY_RECALL_ITEM_SKIPPED_FOR_SAFETY");
    }
  }
  return codes;
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9_]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    )
  );
}

function sanitizeSummary(value: unknown): string {
  const text = safeText(value, "Memory summary unavailable.");
  if (unsafeWarningCodes(text).length > 0) {
    return "Memory summary withheld by safety policy.";
  }
  return safeErrorMessage(text).slice(0, 180);
}

function safeTags(value: unknown): string[] {
  return safeArray(value)
    .filter((item): item is string => typeof item === "string")
    .map((item) => sanitizeToken(item, "tag"))
    .filter((item) => item.length > 0)
    .slice(0, 8);
}

function safeReasonCodes(value: unknown): string[] {
  return safeArray(value)
    .filter((item): item is string => typeof item === "string")
    .map((item) => warningCode(item))
    .filter((item) => item.length > 0)
    .slice(0, 8);
}

function safeWarningCodes(value: unknown): string[] {
  return safeArray(value)
    .filter((item): item is string => typeof item === "string")
    .map((item) => warningCode(item))
    .filter((item) => item.length > 0)
    .slice(0, 8);
}

function warningCode(value: string): string {
  const text = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.-]/g, "_");
  return /^[A-Z0-9_.-]{1,80}$/.test(text) ? text : "";
}

function sanitizeToken(value: unknown, fallback: string): string {
  const text = safeErrorMessage(safeText(value, fallback))
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "_")
    .slice(0, 80);
  return text.length > 0 ? text : fallback;
}

function normalizeType(value: unknown): AppMemoryRecallType {
  return supportedTypes.includes(value as AppMemoryRecallType)
    ? (value as AppMemoryRecallType)
    : "project_fact";
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

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
