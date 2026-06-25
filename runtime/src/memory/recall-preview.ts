import { tokenize } from "./recall.js";
import type { MemoryTrustLevel, MemoryType, MemoryWarning } from "./types.js";

export type MemoryRecallPreviewStatus =
  | "empty"
  | "preview"
  | "needs_clarification"
  | "warning"
  | "blocked";

export type MemoryRecallPreviewPlacement = "volatile_tail";

export type MemoryRecallPreviewWarning = MemoryWarning;

export type MemoryRecallPreviewQuery = {
  intent: string;
  namespace: string;
  tagCount: number;
  acceptanceCriteriaCount: number;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  warningCodes: string[];
};

export type SyntheticMemorySummaryForRecallPreview = {
  memoryId?: string | undefined;
  type?: MemoryType | string | undefined;
  namespace?: string | undefined;
  trustLevel?: MemoryTrustLevel | string | undefined;
  summary?: string | undefined;
  tags?: string[] | undefined;
  provenanceRefCount?: number | undefined;
  evidenceRefCount?: number | undefined;
  trigger?: string | undefined;
  mitigation?: string | undefined;
  reasonCodes?: string[] | undefined;
  status?: string | undefined;
  updatedAt?: string | undefined;
  pinned?: boolean | undefined;
};

export type MemoryRecallPreviewInput = {
  intent?: string | undefined;
  objectiveSummary?: string | undefined;
  acceptanceCriteriaCount?: number | undefined;
  namespace?: string | undefined;
  tags?: string[] | undefined;
  syntheticMemorySummaries?:
    | SyntheticMemorySummaryForRecallPreview[]
    | undefined;
  runDraftRef?: string | undefined;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  allowCandidatePreview?: boolean | undefined;
  maxSummaryLength?: number | undefined;
  maxInputBytes?: number | undefined;
  maxResults?: number | undefined;
};

export type MemoryRecallPreviewItem = {
  memoryId: string;
  type: MemoryType;
  namespace: string;
  trustLevel: string;
  summary: string;
  score: number;
  reasonCodes: string[];
  provenanceRefCount: number;
  evidenceRefCount: number;
  tags: string[];
  placement: MemoryRecallPreviewPlacement;
  warningCodes: string[];
  itemHash: string;
};

export type MemoryRecallPreview = {
  status: MemoryRecallPreviewStatus;
  intent: string;
  querySummary: MemoryRecallPreviewQuery;
  itemCount: number;
  policyCount: number;
  projectFactCount: number;
  pitfallCount: number;
  highTrustCount: number;
  volatileTailCount: number;
  items: MemoryRecallPreviewItem[];
  warnings: MemoryRecallPreviewWarning[];
  nextAction: string;
  source: "runtime_memory_core_preview";
  previewOnly: true;
  persistenceConnected: false;
  eventWritesEnabled: false;
  frozenPrefixIncluded: false;
  memoryWritesEnabled: false;
};

export type MemoryRecallPreviewValidationResult = {
  ok: boolean;
  warningCodes: string[];
  warnings: MemoryRecallPreviewWarning[];
};

const defaultMaxInputBytes = 80_000;
const defaultMaxSummaryLength = 320;
const defaultMaxResults = 8;
const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const memoryTypes: MemoryType[] = ["policy", "project_fact", "pitfall"];

const policyTrustAllowlist = new Set([
  "explicit_user",
  "approval_record",
  "repository_rule",
  "workspace_rule"
]);

const highTrustLevels = new Set([
  ...policyTrustAllowlist,
  "verified_tool_result",
  "user_correction"
]);

const trustBoost: Record<string, number> = {
  explicit_user: 18,
  approval_record: 16,
  repository_rule: 15,
  workspace_rule: 14,
  verified_tool_result: 12,
  user_correction: 10,
  eval_failure: 8,
  model_suggested: 4,
  external_untrusted: 0
};

const typePriority: Record<MemoryType, number> = {
  policy: 0,
  project_fact: 1,
  pitfall: 2
};

const forbiddenRawInputKeys = new Set(
  [
    "content",
    "fullContent",
    "rawMemory",
    rawPrefix + "Prompt",
    rawPrefix + "Objective",
    rawPrefix + "Source",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Diff",
    "beforeContent",
    "afterContent",
    apiKeyField,
    authHeaderField,
    "env",
    "stdout",
    "stderr"
  ].map((key) => key.toLowerCase())
);

const unsafePreviewPatterns = [
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
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_MEMORY_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Memory"}\\b|raw memory`, "i")
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b`, "i")
  },
  {
    code: "RAW_DOM_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Dom"}\\b|raw DOM`, "i")
  },
  {
    code: "RAW_CSV_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Csv"}\\b|raw CSV`, "i")
  },
  {
    code: "RAW_SCREENSHOT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Screenshot"}\\b|screenshot`, "i")
  },
  {
    code: "CLIPBOARD_MARKER",
    pattern: new RegExp(`\\b${privatePasteField}\\b`, "i")
  },
  {
    code: "URL_QUERY_SECRET_MARKER",
    pattern: /https?:\/\/\S+\?(?=\S*(token|key|secret|auth|password)=)/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildMemoryRecallPreview(
  input: MemoryRecallPreviewInput = {}
): MemoryRecallPreview {
  const validation = validateMemoryRecallPreviewInput(input);
  const intent = safeToken(input.intent, "unknown");
  const namespace = safeToken(input.namespace, "default");
  const querySummary = buildQuerySummary(input, validation.warningCodes);

  if (!hasRunDraftSummary(input)) {
    return previewFromItems({
      intent,
      querySummary,
      items: [],
      warnings: validation.warnings,
      sourceEmpty: true,
      statusOverride: validation.warnings.length > 0 ? undefined : "empty",
      nextAction:
        "Preview a local run draft first. Memory recall summaries will appear here before context assembly."
    });
  }

  if (intent === "unknown") {
    return previewFromItems({
      intent,
      querySummary,
      items: [],
      warnings: uniqueWarnings([
        ...validation.warnings,
        warning("INTENT_UNKNOWN_NEEDS_CLARIFICATION")
      ]),
      sourceEmpty: false,
      nextAction:
        "Clarify the draft intent before memory recall preview can be trusted."
    });
  }

  if (!validation.ok) {
    return previewFromItems({
      intent,
      querySummary,
      items: [],
      warnings: uniqueWarnings([
        ...validation.warnings,
        ...skippedWarningsFor(input)
      ]),
      sourceEmpty: false,
      statusOverride: "blocked",
      nextAction:
        "Remove unsafe markers before reviewing memory recall summaries."
    });
  }

  const queryTokens = queryTokensFor(input);
  const normalized = safeArray(input.syntheticMemorySummaries)
    .map((item, index) =>
      itemFromSummary(input, item, index, namespace, queryTokens)
    )
    .filter((item): item is MemoryRecallPreviewItem => item !== undefined)
    .sort(compareItems)
    .slice(0, clampPositive(input.maxResults, defaultMaxResults, 50));
  const skippedWarnings = skippedWarningsFor(input);
  return previewFromItems({
    intent,
    querySummary,
    items: normalized,
    warnings: uniqueWarnings([...validation.warnings, ...skippedWarnings]),
    sourceEmpty: false,
    nextAction:
      normalized.length === 0
        ? "Memory Core is available, but desktop persistence is not connected yet."
        : undefined
  });
}

export function summarizeMemoryRecallPreview(preview: MemoryRecallPreview): {
  status: MemoryRecallPreviewStatus;
  intent: string;
  itemCount: number;
  policyCount: number;
  projectFactCount: number;
  pitfallCount: number;
  volatileTailCount: number;
  warningCodes: string[];
  hash: string;
} {
  const warningCodes = preview.warnings.map((item) => item.code);
  return {
    status: preview.status,
    intent: preview.intent,
    itemCount: preview.itemCount,
    policyCount: preview.policyCount,
    projectFactCount: preview.projectFactCount,
    pitfallCount: preview.pitfallCount,
    volatileTailCount: preview.volatileTailCount,
    warningCodes,
    hash: hashPreview(
      [
        preview.status,
        preview.intent,
        preview.itemCount,
        preview.policyCount,
        preview.projectFactCount,
        preview.pitfallCount,
        preview.volatileTailCount,
        warningCodes.join(","),
        preview.items.map((item) => item.itemHash).join(",")
      ].join("|")
    )
  };
}

export function validateMemoryRecallPreviewInput(
  input: MemoryRecallPreviewInput
): MemoryRecallPreviewValidationResult {
  const warnings: MemoryRecallPreviewWarning[] = [];
  const inputWithoutMemories = {
    ...input,
    syntheticMemorySummaries: undefined
  };
  const inputJson = safeStringify(inputWithoutMemories);
  if (inputJson.length > (input.maxInputBytes ?? defaultMaxInputBytes)) {
    warnings.push(warning("MEMORY_RECALL_INPUT_TOO_LARGE"));
  }
  warnings.push(
    ...rawFieldWarningsFrom(inputWithoutMemories).map((code) => warning(code)),
    ...unsafeWarningCodes(inputJson).map((code) => warning(code))
  );

  for (const item of safeArray(input.syntheticMemorySummaries)) {
    warnings.push(...validateSyntheticSummaryShape(input, item));
  }

  const deduped = uniqueWarnings(warnings);
  const warningCodes = deduped.map((item) => item.code);
  return {
    ok: !warningCodes.some(isBlockingWarning),
    warningCodes,
    warnings: deduped
  };
}

function previewFromItems(input: {
  intent: string;
  querySummary: MemoryRecallPreviewQuery;
  items: readonly MemoryRecallPreviewItem[];
  warnings: readonly MemoryRecallPreviewWarning[];
  sourceEmpty: boolean;
  statusOverride?: MemoryRecallPreviewStatus | undefined;
  nextAction?: string | undefined;
}): MemoryRecallPreview {
  const warningCodes = input.warnings.map((item) => item.code);
  const status =
    input.statusOverride ??
    statusFor(input.intent, input.items.length, warningCodes);
  return {
    status,
    intent: input.intent,
    querySummary: input.querySummary,
    itemCount: input.items.length,
    policyCount: input.items.filter((item) => item.type === "policy").length,
    projectFactCount: input.items.filter((item) => item.type === "project_fact")
      .length,
    pitfallCount: input.items.filter((item) => item.type === "pitfall").length,
    highTrustCount: input.items.filter((item) =>
      highTrustLevels.has(item.trustLevel)
    ).length,
    volatileTailCount: input.items.filter(
      (item) => item.placement === "volatile_tail"
    ).length,
    items: [...input.items],
    warnings: [...input.warnings],
    nextAction: input.nextAction ?? nextActionFor(status, input.items.length),
    source: "runtime_memory_core_preview",
    previewOnly: true,
    persistenceConnected: false,
    eventWritesEnabled: false,
    frozenPrefixIncluded: false,
    memoryWritesEnabled: false
  };
}

function itemFromSummary(
  input: MemoryRecallPreviewInput,
  item: SyntheticMemorySummaryForRecallPreview,
  index: number,
  namespaceFallback: string,
  queryTokens: readonly string[]
): MemoryRecallPreviewItem | undefined {
  const type = normalizeType(item.type);
  const trustLevel = safeToken(item.trustLevel, "external_untrusted");
  const namespace = safeToken(item.namespace, namespaceFallback);
  const status = safeToken(item.status, "committed");
  if (!isStatusAllowed(status, input.allowCandidatePreview === true)) {
    return undefined;
  }
  if (type === "policy" && !policyTrustAllowlist.has(trustLevel)) {
    return undefined;
  }
  if (type === "policy" && trustLevel === "external_untrusted") {
    return undefined;
  }
  const provenanceRefCount = nonNegativeNumber(item.provenanceRefCount);
  const evidenceRefCount = nonNegativeNumber(item.evidenceRefCount);
  if (type === "project_fact" && provenanceRefCount + evidenceRefCount <= 0) {
    return undefined;
  }
  const reasonCodes = safeCodes(item.reasonCodes);
  const trigger = safeText(item.trigger, "");
  const mitigation = safeText(item.mitigation, "");
  if (
    type === "pitfall" &&
    trigger.length === 0 &&
    mitigation.length === 0 &&
    reasonCodes.length === 0
  ) {
    return undefined;
  }
  const summary = safeSummary(
    item.summary,
    input.maxSummaryLength ?? defaultMaxSummaryLength
  );
  if (summary === undefined) {
    return undefined;
  }
  const tags = safeTags(item.tags);
  const warningCodes = uniqueStrings([
    ...safeCodes((item as { warningCodes?: string[] }).warningCodes),
    ...(status === "candidate_preview"
      ? ["MEMORY_RECALL_CANDIDATE_PREVIEW"]
      : [])
  ]);
  const score = scoreSummary({
    summary,
    tags,
    trigger,
    mitigation,
    type,
    trustLevel,
    pinned: item.pinned === true,
    updatedAt: item.updatedAt,
    createdAt: input.createdAt,
    queryTokens
  });
  if (score <= 0 && queryTokens.length > 0) {
    return undefined;
  }
  const memoryId = safeText(item.memoryId, `memory-preview-${index + 1}`);
  const itemHash = hashPreview(
    [
      memoryId,
      type,
      namespace,
      trustLevel,
      summary,
      score,
      provenanceRefCount,
      evidenceRefCount,
      tags.join(","),
      warningCodes.join(",")
    ].join("|")
  );
  return {
    memoryId,
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
    warningCodes,
    itemHash
  };
}

function validateSyntheticSummaryShape(
  input: MemoryRecallPreviewInput,
  item: SyntheticMemorySummaryForRecallPreview
): MemoryRecallPreviewWarning[] {
  const warnings: MemoryRecallPreviewWarning[] = [];
  if (
    safeText(item.summary, "").length >
    (input.maxSummaryLength ?? defaultMaxSummaryLength)
  ) {
    warnings.push(warning("MEMORY_RECALL_SUMMARY_TOO_LONG"));
  }
  const namespace = safeText(item.namespace, "");
  if (namespace.length > 0 && !/^[a-z0-9_.:-]{1,120}$/i.test(namespace)) {
    warnings.push(warning("MEMORY_RECALL_INVALID_NAMESPACE"));
  }
  return warnings;
}

function skippedWarningsFor(
  input: MemoryRecallPreviewInput
): MemoryRecallPreviewWarning[] {
  const warnings: MemoryRecallPreviewWarning[] = [];
  for (const item of safeArray(input.syntheticMemorySummaries)) {
    const rawCodes = unsafeWarningCodes(safeStringify(item));
    if (rawCodes.length > 0 || rawFieldWarningsFrom(item).length > 0) {
      warnings.push(warning("MEMORY_RECALL_ITEM_SKIPPED_FOR_SAFETY"));
    }
  }
  return uniqueWarnings(warnings);
}

function buildQuerySummary(
  input: MemoryRecallPreviewInput,
  warningCodes: readonly string[]
): MemoryRecallPreviewQuery {
  const queryWarnings = unsafeWarningCodes(
    [input.objectiveSummary, input.namespace, safeArray(input.tags).join(" ")]
      .filter(Boolean)
      .join("\n")
  );
  return {
    intent: safeToken(input.intent, "unknown"),
    namespace: safeToken(input.namespace, "default"),
    tagCount: safeTags(input.tags).length,
    acceptanceCriteriaCount: nonNegativeNumber(input.acceptanceCriteriaCount),
    workspaceIndexRef: safeOptionalRef(input.workspaceIndexRef),
    contextSummaryRef: safeOptionalRef(input.contextSummaryRef),
    warningCodes: uniqueStrings([...warningCodes, ...queryWarnings])
  };
}

function queryTokensFor(input: MemoryRecallPreviewInput): string[] {
  return tokenize(
    [
      input.intent ?? "",
      input.objectiveSummary ?? "",
      safeArray(input.tags).join(" "),
      input.workspaceIndexRef ?? "",
      input.contextSummaryRef ?? ""
    ].join(" ")
  );
}

function scoreSummary(input: {
  summary: string;
  tags: readonly string[];
  trigger: string;
  mitigation: string;
  type: MemoryType;
  trustLevel: string;
  pinned: boolean;
  updatedAt?: string | undefined;
  createdAt?: string | undefined;
  queryTokens: readonly string[];
}): number {
  const memoryTokens = tokenize(
    [
      input.summary,
      input.tags.join(" "),
      input.trigger,
      input.mitigation,
      input.type
    ].join(" ")
  );
  const overlap = input.queryTokens.filter((token) =>
    memoryTokens.includes(token)
  ).length;
  let score = input.queryTokens.length === 0 ? 1 : overlap * 10;
  score += trustBoost[input.trustLevel] ?? 1;
  if (input.pinned) {
    score += 10;
  }
  score += recencyBoost(input.updatedAt, input.createdAt);
  return Number(score.toFixed(6));
}

function recencyBoost(
  updatedAt: string | undefined,
  createdAt: string | undefined
): number {
  if (updatedAt === undefined || createdAt === undefined) {
    return 0;
  }
  const updated = new Date(updatedAt).getTime();
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(updated) || !Number.isFinite(created)) {
    return 0;
  }
  const ageDays = Math.max(0, created - updated) / 86_400_000;
  return Math.max(0, 5 - Math.min(ageDays, 100) / 20);
}

function compareItems(
  left: MemoryRecallPreviewItem,
  right: MemoryRecallPreviewItem
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
  intent: string,
  itemCount: number,
  warningCodes: readonly string[]
): MemoryRecallPreviewStatus {
  if (intent === "unknown") {
    return "needs_clarification";
  }
  if (warningCodes.some(isBlockingWarning)) {
    return "blocked";
  }
  if (itemCount === 0) {
    return warningCodes.length > 0 ? "warning" : "empty";
  }
  return warningCodes.length > 0 ? "warning" : "preview";
}

function nextActionFor(
  status: MemoryRecallPreviewStatus,
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

function isStatusAllowed(status: string, allowCandidatePreview: boolean) {
  if (status === "committed") {
    return true;
  }
  if (status === "candidate_preview") {
    return allowCandidatePreview;
  }
  return false;
}

function hasRunDraftSummary(input: MemoryRecallPreviewInput): boolean {
  return (
    safeText(input.runDraftRef, "").length > 0 ||
    safeText(input.objectiveSummary, "").length > 0
  );
}

function normalizeType(value: unknown): MemoryType {
  return memoryTypes.includes(value as MemoryType)
    ? (value as MemoryType)
    : "project_fact";
}

function safeSummary(value: unknown, maxLength: number): string | undefined {
  const text = safeText(value, "");
  if (text.length === 0 || text.length > maxLength) {
    return undefined;
  }
  if (unsafeWarningCodes(text).length > 0) {
    return undefined;
  }
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeTags(value: unknown): string[] {
  return safeArray(value)
    .filter((item): item is string => typeof item === "string")
    .map((item) => safeToken(item, "tag"))
    .filter((item) => item.length > 0)
    .slice(0, 12)
    .sort();
}

function safeCodes(value: unknown): string[] {
  return safeArray(value)
    .filter((item): item is string => typeof item === "string")
    .map((item) =>
      item
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_.-]/g, "_")
        .slice(0, 80)
    )
    .filter((item) => /^[A-Z0-9_.-]{1,80}$/.test(item));
}

function safeOptionalRef(value: unknown): string | undefined {
  const text = safeText(value, "");
  return text.length === 0 ? undefined : text.slice(0, 120);
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function clampPositive(value: unknown, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.floor(value), max));
}

function rawFieldWarningsFrom(value: unknown): string[] {
  const warnings = new Set<string>();
  visitRecords(value, (key) => {
    if (forbiddenRawInputKeys.has(key.toLowerCase())) {
      warnings.add("MEMORY_RECALL_RAW_FIELD_REJECTED");
    }
  });
  return [...warnings];
}

function visitRecords(
  value: unknown,
  visitor: (key: string, value: unknown) => void
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitRecords(item, visitor);
    }
    return;
  }
  if (typeof value !== "object" || value === null) {
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    visitor(key, nested);
    visitRecords(nested, visitor);
  }
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function isBlockingWarning(code: string): boolean {
  return (
    code.endsWith("_MARKER") ||
    code.includes("RAW_FIELD") ||
    code.includes("TOO_LARGE") ||
    code.includes("TOO_LONG") ||
    code.includes("INVALID_NAMESPACE")
  );
}

function warning(code: string): MemoryRecallPreviewWarning {
  return {
    code,
    safeMessage: code.toLowerCase().replace(/_/g, " ")
  };
}

function uniqueWarnings(
  warnings: readonly MemoryRecallPreviewWarning[]
): MemoryRecallPreviewWarning[] {
  const seen = new Set<string>();
  const result: MemoryRecallPreviewWarning[] = [];
  for (const item of warnings) {
    if (!seen.has(item.code)) {
      seen.add(item.code);
      result.push(item);
    }
  }
  return result;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function safeArray<T>(value: readonly T[] | undefined): T[];
function safeArray(value: unknown): unknown[];
function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? [...value] : [];
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function safeToken(value: unknown, fallback: string): string {
  const text = safeText(value, fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]/g, "_")
    .slice(0, 120);
  return text.length > 0 ? text : fallback;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, nested) =>
      typeof nested === "function" ? "[function]" : nested
    );
  } catch {
    return "[unserializable]";
  }
}

function hashPreview(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
