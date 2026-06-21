import { safeArray, safeErrorMessage, safeText } from "./safety.js";
import type { AppControlPlaneProjectionView } from "./control-plane-view.js";
import type { AppMemoryInspectorView } from "./memory-inspector-view.js";
import type { AppRunDraftView } from "./run-draft-view.js";
import type { AppDiffSurfaceView } from "./workbench-surfaces.js";

export type AppContextCartStatus = "empty" | "summary" | "warning" | "error";

export type AppContextCartSource =
  | "empty"
  | "future_context_ledger"
  | "synthetic_summary";

export type AppContextLayerName =
  | "immutable_rules"
  | "workspace_rules"
  | "task_contract"
  | "session_working_set"
  | "volatile_tail"
  | "no_compress_zone";

export type AppContextCartWarning = {
  code: string;
};

export type AppContextLayerView = {
  layer: AppContextLayerName;
  segmentCount: number;
  tokenEstimate: number;
  placement: string;
  hashPrefix: string;
  warningCodes: string[];
  noCompressCount: number;
  volatileOnly: boolean;
};

export type AppContextSegmentSummaryView = {
  segmentId: string;
  layer: AppContextLayerName;
  title: string;
  tokenEstimate: number;
  placement: string;
  source: string;
  hashPrefix: string;
  warningCodes: string[];
};

export type AppContextHashSummaryView = {
  frozenPrefixHash: string;
  workspaceRulesHash: string;
  taskContractHash: string;
  volatileTailHash: string;
  noCompressZoneHash: string;
};

export type AppContextPlacementView = {
  segmentId: string;
  layer: AppContextLayerName;
  placement: string;
  reasonCode: string;
};

export type AppContextCacheBoundaryView = {
  changed: boolean;
  reasonCodes: string[];
};

export type AppContextCartView = {
  status: AppContextCartStatus;
  totalSegments: number;
  totalTokenEstimate: number;
  layers: AppContextLayerView[];
  segmentSummaries: AppContextSegmentSummaryView[];
  hashSummary: AppContextHashSummaryView;
  frozenPrefixHash: string;
  workspaceRulesHash: string;
  taskContractHash: string;
  volatileTailHash: string;
  noCompressZoneHash: string;
  noCompressZoneCount: number;
  placementDecisions: AppContextPlacementView[];
  placementDecisionCount: number;
  cacheBoundary: AppContextCacheBoundaryView;
  cacheBoundaryChanged: boolean;
  warnings: AppContextCartWarning[];
  nextAction: string;
  source: AppContextCartSource;
  readOnly: true;
};

export type AppContextCartInput = {
  contextAssemblyReport?: unknown;
  rulesLedgerSummary?: unknown;
  runDraft?: AppRunDraftView | undefined;
  controlProjection?: AppControlPlaneProjectionView | undefined;
  workspaceIndexRef?: unknown;
  memoryInspector?: AppMemoryInspectorView | undefined;
  patchSurface?: AppDiffSurfaceView | undefined;
  eventSummary?: unknown;
};

const contextLayers: AppContextLayerName[] = [
  "immutable_rules",
  "workspace_rules",
  "task_contract",
  "session_working_set",
  "volatile_tail",
  "no_compress_zone"
];

const volatileLayers = new Set<AppContextLayerName>([
  "session_working_set",
  "volatile_tail",
  "no_compress_zone"
]);

const forbiddenRawKeys = new Set([
  "content",
  "prompt",
  `raw${"Prompt"}`,
  `raw${"Dom"}`,
  `raw${"Csv"}`,
  `raw${"Screenshot"}`,
  `clip${"board"}`,
  "beforeContent",
  "afterContent",
  "rawSource",
  "apiKey",
  "authorization",
  "env"
]);

export function buildContextCartView(
  input: AppContextCartInput = {}
): AppContextCartView {
  const summary = summaryRecord(input);
  const rawWarnings = rawFieldWarnings(summary);

  if (summary === undefined) {
    const layers = contextLayers.map((layer) => emptyLayer(layer));
    const hashSummary = emptyHashSummary();
    const warnings = relationshipWarnings(input, rawWarnings);
    return {
      status: warnings.length > 0 ? "warning" : "empty",
      totalSegments: 0,
      totalTokenEstimate: 0,
      layers,
      segmentSummaries: [],
      hashSummary,
      ...hashSummary,
      noCompressZoneCount: 0,
      placementDecisions: [],
      placementDecisionCount: 0,
      cacheBoundary: { changed: false, reasonCodes: [] },
      cacheBoundaryChanged: false,
      warnings,
      nextAction: nextActionForEmpty(input),
      source: "empty",
      readOnly: true
    };
  }

  const hashSummary = normalizeHashSummary(summary);
  const segmentSummaries = normalizeSegmentSummaries(summary, rawWarnings);
  const layers = normalizeLayers(summary, segmentSummaries, hashSummary);
  const placementDecisions = normalizePlacements(summary);
  const cacheBoundary = normalizeCacheBoundary(summary);
  const warnings = relationshipWarnings(input, [
    ...rawWarnings,
    ...warningCodesFrom(summary, "warnings", "warningCodes").map((code) => ({
      code
    }))
  ]);
  const totalSegments =
    finiteNumber(readValue(summary, "totalSegments", "segmentCount")) ||
    layers.reduce((sum, layer) => sum + layer.segmentCount, 0);
  const totalTokenEstimate =
    finiteNumber(readValue(summary, "totalTokenEstimate", "tokenEstimate")) ||
    layers.reduce((sum, layer) => sum + layer.tokenEstimate, 0);

  return {
    status: warnings.length > 0 ? "warning" : "summary",
    totalSegments,
    totalTokenEstimate,
    layers,
    segmentSummaries,
    hashSummary,
    ...hashSummary,
    noCompressZoneCount: noCompressZoneCount(layers, summary),
    placementDecisions,
    placementDecisionCount:
      finiteNumber(readValue(summary, "placementDecisionCount")) ||
      placementDecisions.length,
    cacheBoundary,
    cacheBoundaryChanged: cacheBoundary.changed,
    warnings,
    nextAction: nextActionForSummary(input),
    source: normalizeSource(summary),
    readOnly: true
  };
}

function summaryRecord(
  input: AppContextCartInput
): Record<string, unknown> | undefined {
  const source = input.contextAssemblyReport ?? input.rulesLedgerSummary;
  return isRecord(source) ? source : undefined;
}

function normalizeLayers(
  summary: Record<string, unknown>,
  segments: readonly AppContextSegmentSummaryView[],
  hashes: AppContextHashSummaryView
): AppContextLayerView[] {
  const explicitLayers = safeArray(readValue(summary, "layers"));
  if (explicitLayers.length > 0) {
    const byLayer = new Map<AppContextLayerName, AppContextLayerView>();
    for (const item of explicitLayers) {
      const record = isRecord(item) ? item : {};
      const layer = normalizeLayer(readValue(record, "layer"));
      byLayer.set(layer, {
        layer,
        segmentCount: finiteNumber(readValue(record, "segmentCount", "count")),
        tokenEstimate: finiteNumber(readValue(record, "tokenEstimate")),
        placement: placementForLayer(layer, readValue(record, "placement")),
        hashPrefix: hashPrefixForLayer(
          layer,
          hashes,
          readValue(record, "hash")
        ),
        warningCodes: warningCodesFrom(record, "warningCodes", "warnings"),
        noCompressCount: finiteNumber(readValue(record, "noCompressCount")),
        volatileOnly: volatileLayers.has(layer)
      });
    }
    return contextLayers.map(
      (layer) => byLayer.get(layer) ?? emptyLayer(layer)
    );
  }

  const countByLayer = readRecord(
    readValue(summary, "segmentCountByLayer", "segmentCountsByLayer")
  );
  const tokensByLayer = readRecord(
    readValue(summary, "tokenEstimatesByLayer", "tokenEstimateByLayer")
  );
  return contextLayers.map((layer) => {
    const layerSegments = segments.filter((segment) => segment.layer === layer);
    const segmentCount =
      finiteNumber(readValue(countByLayer, layer)) || layerSegments.length;
    const tokenEstimate =
      finiteNumber(readValue(tokensByLayer, layer)) ||
      layerSegments.reduce((sum, segment) => sum + segment.tokenEstimate, 0);
    return {
      layer,
      segmentCount,
      tokenEstimate,
      placement: placementForLayer(layer),
      hashPrefix: hashPrefixForLayer(layer, hashes),
      warningCodes: [],
      noCompressCount:
        layer === "no_compress_zone"
          ? segmentCount
          : layerSegments.filter(
              (segment) => segment.placement === "no_compress_zone"
            ).length,
      volatileOnly: volatileLayers.has(layer)
    };
  });
}

function normalizeSegmentSummaries(
  summary: Record<string, unknown>,
  inheritedWarnings: readonly AppContextCartWarning[]
): AppContextSegmentSummaryView[] {
  return safeArray(readValue(summary, "segmentSummaries", "segments"))
    .map((item, index) =>
      normalizeSegmentSummary(item, index, inheritedWarnings)
    )
    .slice(0, 24);
}

function normalizeSegmentSummary(
  item: unknown,
  index: number,
  inheritedWarnings: readonly AppContextCartWarning[]
): AppContextSegmentSummaryView {
  const record = isRecord(item) ? item : {};
  const layer = normalizeLayer(readValue(record, "layer"));
  const rawWarnings = rawFieldWarnings(record).map((warning) => warning.code);
  return {
    segmentId: safeText(
      readValue(record, "segmentId", "id"),
      `segment-${index + 1}`
    ),
    layer,
    title: sanitizeDisplayText(readValue(record, "title"), "Context segment"),
    tokenEstimate: finiteNumber(readValue(record, "tokenEstimate")),
    placement: placementForLayer(layer, readValue(record, "placement")),
    source: sanitizeDisplayText(readValue(record, "source"), "unknown"),
    hashPrefix: hashPrefix(readValue(record, "hash")),
    warningCodes: uniqueStrings([
      ...warningCodesFrom(record, "warningCodes", "warnings"),
      ...rawWarnings,
      ...inheritedWarnings.map((warning) => warning.code)
    ])
  };
}

function normalizeHashSummary(
  summary: Record<string, unknown>
): AppContextHashSummaryView {
  const hashRecord = readRecord(readValue(summary, "hashSummary", "hashes"));
  return {
    frozenPrefixHash: hashPrefix(
      readValue(summary, "frozenPrefixHash", "globalFrozenPrefixHash") ??
        readValue(hashRecord, "frozenPrefixHash", "globalFrozenPrefixHash")
    ),
    workspaceRulesHash: hashPrefix(
      readValue(summary, "workspaceRulesHash") ??
        readValue(hashRecord, "workspaceRulesHash")
    ),
    taskContractHash: hashPrefix(
      readValue(summary, "taskContractHash") ??
        readValue(hashRecord, "taskContractHash")
    ),
    volatileTailHash: hashPrefix(
      readValue(summary, "volatileTailHash") ??
        readValue(hashRecord, "volatileTailHash")
    ),
    noCompressZoneHash: hashPrefix(
      readValue(summary, "noCompressZoneHash") ??
        readValue(hashRecord, "noCompressZoneHash")
    )
  };
}

function normalizePlacements(
  summary: Record<string, unknown>
): AppContextPlacementView[] {
  return safeArray(readValue(summary, "placementDecisions", "placements"))
    .map((item, index) => {
      const record = isRecord(item) ? item : {};
      const layer = normalizeLayer(readValue(record, "layer"));
      return {
        segmentId: safeText(
          readValue(record, "segmentId", "id"),
          `placement-${index + 1}`
        ),
        layer,
        placement: placementForLayer(layer, readValue(record, "placement")),
        reasonCode: warningCode(
          safeText(
            readValue(record, "reason", "reasonCode"),
            "PLACEMENT_RECORDED"
          )
        )
      };
    })
    .slice(0, 24);
}

function normalizeCacheBoundary(
  summary: Record<string, unknown>
): AppContextCacheBoundaryView {
  const reasonCodes = uniqueStrings([
    ...warningCodesFrom(summary, "cacheBoundaryChangedReasons"),
    ...safeArray(readValue(summary, "cacheBoundaryReasons")).map((item) =>
      warningCode(safeText(item, "CACHE_BOUNDARY_RECORDED"))
    )
  ]);
  return {
    changed:
      readValue(summary, "cacheBoundaryChanged") === true ||
      reasonCodes.length > 0,
    reasonCodes
  };
}

function relationshipWarnings(
  input: AppContextCartInput,
  baseWarnings: readonly AppContextCartWarning[]
): AppContextCartWarning[] {
  const codes = baseWarnings.map((warning) => warning.code);
  if (
    input.runDraft !== undefined &&
    input.runDraft.status !== "empty" &&
    input.contextAssemblyReport === undefined &&
    input.rulesLedgerSummary === undefined
  ) {
    codes.push("RUN_DRAFT_CONTEXT_PENDING");
  }
  if (finiteNumber(input.memoryInspector?.recalledCount) > 0) {
    codes.push("MEMORY_RECALL_VOLATILE_TAIL");
  }
  return uniqueStrings(codes).map((code) => ({ code }));
}

function rawFieldWarnings(value: unknown): AppContextCartWarning[] {
  if (!isRecord(value)) {
    return [];
  }
  const codes: string[] = [];
  for (const key of Object.keys(value)) {
    if (forbiddenRawKeys.has(key)) {
      codes.push("RAW_CONTEXT_FIELD_DROPPED");
    }
  }
  for (const item of safeArray(
    readValue(value, "segmentSummaries", "segments")
  )) {
    if (isRecord(item)) {
      for (const key of Object.keys(item)) {
        if (forbiddenRawKeys.has(key)) {
          codes.push("RAW_CONTEXT_FIELD_DROPPED");
        }
      }
    }
  }
  return uniqueStrings(codes).map((code) => ({ code }));
}

function nextActionForEmpty(input: AppContextCartInput): string {
  if (input.runDraft !== undefined && input.runDraft.status !== "empty") {
    return "Future context assembly will derive task_contract and volatile_tail summaries from this draft.";
  }
  return "No context assembly report is connected yet. Future run drafts will show context placement here before model execution.";
}

function nextActionForSummary(input: AppContextCartInput): string {
  if (input.runDraft !== undefined && input.runDraft.status !== "empty") {
    return "Review summary-only context placement. Future assembly can derive task_contract and volatile_tail summaries from this draft.";
  }
  return "Review summary-only context placement, cache boundary changes, and no-compress zone references.";
}

function noCompressZoneCount(
  layers: readonly AppContextLayerView[],
  summary: Record<string, unknown>
): number {
  return (
    safeArray(readValue(summary, "noCompressZoneIds")).length ||
    layers.find((layer) => layer.layer === "no_compress_zone")?.segmentCount ||
    0
  );
}

function normalizeSource(
  summary: Record<string, unknown>
): AppContextCartSource {
  return readValue(summary, "source") === "synthetic_summary"
    ? "synthetic_summary"
    : "future_context_ledger";
}

function emptyLayer(layer: AppContextLayerName): AppContextLayerView {
  return {
    layer,
    segmentCount: 0,
    tokenEstimate: 0,
    placement: placementForLayer(layer),
    hashPrefix: "n/a",
    warningCodes: [],
    noCompressCount: 0,
    volatileOnly: volatileLayers.has(layer)
  };
}

function emptyHashSummary(): AppContextHashSummaryView {
  return {
    frozenPrefixHash: "n/a",
    workspaceRulesHash: "n/a",
    taskContractHash: "n/a",
    volatileTailHash: "n/a",
    noCompressZoneHash: "n/a"
  };
}

function placementForLayer(
  layer: AppContextLayerName,
  value?: unknown
): string {
  const explicit = safeText(value, "");
  if (explicit.length > 0) {
    return sanitizePlacement(explicit);
  }
  if (layer === "immutable_rules" || layer === "workspace_rules") {
    return "frozen_prefix";
  }
  if (layer === "task_contract") {
    return "task_stable_prefix";
  }
  if (layer === "no_compress_zone") {
    return "no_compress_zone";
  }
  return "volatile_tail";
}

function hashPrefixForLayer(
  layer: AppContextLayerName,
  hashes: AppContextHashSummaryView,
  explicit?: unknown
): string {
  const ownHash = hashPrefix(explicit);
  if (ownHash !== "n/a") {
    return ownHash;
  }
  if (layer === "immutable_rules") {
    return hashes.frozenPrefixHash;
  }
  if (layer === "workspace_rules") {
    return hashes.workspaceRulesHash;
  }
  if (layer === "task_contract") {
    return hashes.taskContractHash;
  }
  if (layer === "no_compress_zone") {
    return hashes.noCompressZoneHash;
  }
  return hashes.volatileTailHash;
}

function hashPrefix(value: unknown): string {
  const text = safeText(value, "n/a").replace(/[^A-Za-z0-9._:-]/g, "");
  return text === "n/a" ? text : text.slice(0, 12);
}

function sanitizeDisplayText(value: unknown, fallback: string): string {
  const rawText = safeText(value, fallback);
  if (unsafeText(rawText)) {
    return "Summary withheld by safety policy.";
  }
  const text = safeErrorMessage(rawText);
  return text.slice(0, 120);
}

function sanitizePlacement(value: string): string {
  return /^[a-z0-9_.-]{1,64}$/.test(value) ? value : "placement_recorded";
}

function unsafeText(value: string): boolean {
  return [
    new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{16,}\\b`),
    /\bBearer\s+[A-Za-z0-9._-]{16,}\b/,
    /\bAuthorization\s*:/i,
    new RegExp(`\\braw${"Prompt"}\\b`, "i"),
    new RegExp(`\\braw${"Dom"}\\b`, "i"),
    new RegExp(`\\braw${"Csv"}\\b`, "i"),
    new RegExp(`\\braw${"Screenshot"}\\b`, "i"),
    new RegExp(`\\bclip${"board"}\\b`, "i")
  ].some((pattern) => pattern.test(value));
}

function warningCodesFrom(
  record: Record<string, unknown>,
  ...keys: string[]
): string[] {
  return uniqueStrings(
    keys.flatMap((key) =>
      safeArray(readValue(record, key)).map((item) =>
        warningCode(safeText(item, "CONTEXT_WARNING"))
      )
    )
  );
}

function warningCode(value: string): string {
  return /^[A-Z0-9_.-]{1,72}$/.test(value) ? value : "CONTEXT_WARNING";
}

function normalizeLayer(value: unknown): AppContextLayerName {
  return contextLayers.includes(value as AppContextLayerName)
    ? (value as AppContextLayerName)
    : "volatile_tail";
}

function readValue(
  record: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }
  return undefined;
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0
      )
    )
  );
}
