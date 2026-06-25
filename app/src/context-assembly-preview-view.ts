import type { AppAgentRoutePreviewView } from "./agent-route-preview-view.js";
import type { AppCapabilityPlanPreviewView } from "./capability-plan-preview-view.js";
import type { AppControlPlaneProjectionView } from "./control-plane-view.js";
import type { AppMemoryRecallPreviewView } from "./memory-recall-preview-view.js";
import type { AppRunDraftView } from "./run-draft-view.js";
import {
  safeArray,
  safeErrorMessage,
  safeText,
  type WorkspaceEventSummary
} from "./safety.js";
import type { AppDiffSurfaceView } from "./workbench-surfaces.js";
import type { AppWorkspaceIndexBridgeView } from "./workspace-index-bridge-view.js";

export type AppContextAssemblyStatus =
  | "empty"
  | "preview"
  | "warning"
  | "blocked";

export type AppContextAssemblyLayerName =
  | "immutable_rules"
  | "workspace_rules"
  | "task_contract"
  | "session_working_set"
  | "volatile_tail"
  | "no_compress_zone";

export type AppContextAssemblyPlacement =
  | "frozen_prefix"
  | "task_contract"
  | "volatile_tail"
  | "no_compress_zone";

export type AppContextAssemblySourceRef = {
  sourceKind:
    | "static_boundary"
    | "run_draft"
    | "run_draft_event"
    | "workspace_index"
    | "memory_recall"
    | "patch_proposal"
    | "approval_ref"
    | "agent_route"
    | "capability_plan"
    | "event_evidence"
    | "control_projection";
  sourceRefId: string;
  summary: string;
};

export type AppContextAssemblyWarning = {
  code: string;
};

export type AppContextAssemblySegmentView = {
  segmentId: string;
  layer: AppContextAssemblyLayerName;
  title: string;
  sourceKind: AppContextAssemblySourceRef["sourceKind"];
  sourceRefId: string;
  tokenEstimate: number;
  placement: AppContextAssemblyPlacement;
  hashPrefix: string;
  warningCodes: string[];
  noCompress: boolean;
};

export type AppContextAssemblyLayerView = {
  layer: AppContextAssemblyLayerName;
  segmentCount: number;
  tokenEstimate: number;
  placement: AppContextAssemblyPlacement;
  hashPrefix: string;
  sourceRefCount: number;
  warningCodes: string[];
};

export type AppContextAssemblyCacheBoundaryView = {
  status: "unavailable" | "unchanged" | "changed";
  frozenPrefixChanged: boolean;
  taskContractChanged: boolean;
  volatileTailChanged: boolean;
  noCompressZoneChanged: boolean;
  reasonCodes: string[];
};

export type AppContextAssemblyPreviewView = {
  status: AppContextAssemblyStatus;
  totalSegments: number;
  totalTokenEstimate: number;
  frozenPrefixSegmentCount: number;
  volatileTailSegmentCount: number;
  noCompressSegmentCount: number;
  layers: AppContextAssemblyLayerView[];
  segments: AppContextAssemblySegmentView[];
  cacheBoundary: AppContextAssemblyCacheBoundaryView;
  warnings: AppContextAssemblyWarning[];
  nextAction: string;
  source: "local_preview" | "empty";
  previewOnly: true;
  promptAssemblyEnabled: false;
  modelRequestEnabled: false;
  eventWritesEnabled: false;
};

export type AppContextAssemblyPreviewInput = {
  runDraft?: AppRunDraftView | undefined;
  runDraftEventSummary?: unknown;
  workspaceIndexBridge?: AppWorkspaceIndexBridgeView | undefined;
  memoryRecallPreview?: AppMemoryRecallPreviewView | undefined;
  patchSurface?: AppDiffSurfaceView | undefined;
  agentRoutePreview?: AppAgentRoutePreviewView | undefined;
  capabilityPlanPreview?: AppCapabilityPlanPreviewView | undefined;
  controlProjection?: AppControlPlaneProjectionView | undefined;
  eventSummary?: WorkspaceEventSummary | undefined;
  previousPreview?: AppContextAssemblyPreviewView | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const layers: AppContextAssemblyLayerName[] = [
  "immutable_rules",
  "workspace_rules",
  "task_contract",
  "session_working_set",
  "volatile_tail",
  "no_compress_zone"
];

const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const forbiddenRawKeys = new Set(
  [
    "content",
    "fullContent",
    "memoryContent",
    "objectiveRaw",
    "acceptanceCriteriaRaw",
    "prompt",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Screenshot",
    privatePasteField,
    "beforeContent",
    "afterContent",
    "apiKey",
    "authorization",
    "env",
    "stdout",
    "stderr"
  ].map((key) => key.toLowerCase())
);

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

export function buildContextAssemblyPreviewView(
  input: AppContextAssemblyPreviewInput = {}
): AppContextAssemblyPreviewView {
  const validation = validateContextAssemblyPreviewInput(input);
  const warningCodes = uniqueStrings(validation.warningCodes);

  if (
    input.runDraft === undefined ||
    input.runDraft.status === "empty" ||
    input.runDraft.status === "draft_blocked"
  ) {
    return emptyPreview(input, warningCodes);
  }

  if (!validation.ok) {
    return viewFromSegments(input, [], warningCodes, "blocked");
  }

  const segments = buildSegments(input, warningCodes);
  if (segments.length === 0) {
    return emptyPreview(input, warningCodes);
  }

  const status: AppContextAssemblyStatus =
    warningCodes.length > 0 ||
    input.runDraft.warnings.length > 0 ||
    input.workspaceIndexBridge?.warnings.length
      ? "warning"
      : "preview";
  return viewFromSegments(input, segments, warningCodes, status);
}

export function validateContextAssemblyPreviewInput(
  input: AppContextAssemblyPreviewInput
): { ok: boolean; warningCodes: string[] } {
  const warningCodes = uniqueStrings([
    ...unsafeWarningCodes(input.runDraft?.objectiveSummary),
    ...unsafeWarningCodes(input.runDraft?.workspaceRootSummary),
    ...unsafeWarningCodes(
      input.workspaceIndexBridge?.topFiles.map((file) => file.path).join(" ")
    ),
    ...unsafeWarningCodes(
      input.memoryRecallPreview?.querySummary.objectiveSummary
    ),
    ...unsafeWarningCodes(
      input.patchSurface?.items.map((item) => item.label).join(" ")
    ),
    ...rawKeyWarnings(input.runDraft),
    ...rawKeyWarnings(input.workspaceIndexBridge),
    ...rawKeyWarnings(input.memoryRecallPreview),
    ...rawKeyWarnings(input.patchSurface)
  ]);
  return {
    ok: !warningCodes.some(
      (code) => code.endsWith("_MARKER") || code === "RAW_FIELD_REJECTED"
    ),
    warningCodes
  };
}

export function summarizeContextAssemblyPreview(
  view: AppContextAssemblyPreviewView
): string {
  return [
    `status=${view.status}`,
    `segments=${view.totalSegments}`,
    `tokens=${view.totalTokenEstimate}`,
    `frozen=${view.frozenPrefixSegmentCount}`,
    `volatile=${view.volatileTailSegmentCount}`,
    `no_compress=${view.noCompressSegmentCount}`,
    `cache=${view.cacheBoundary.status}`,
    `preview_only=${view.previewOnly ? "yes" : "no"}`
  ].join("; ");
}

function buildSegments(
  input: AppContextAssemblyPreviewInput,
  inheritedWarnings: readonly string[]
): AppContextAssemblySegmentView[] {
  const segments: AppContextAssemblySegmentView[] = [];
  const runDraft = input.runDraft;
  if (runDraft !== undefined && runDraft.status !== "empty") {
    segments.push(
      segment({
        layer: "task_contract",
        title: "Run draft task contract summary",
        sourceKind: "run_draft",
        sourceRefId: runDraft.draftId,
        summary: [
          runDraft.intent,
          runDraft.objectiveSummary,
          `${runDraft.acceptanceCriteriaCount} criteria`
        ].join(" | "),
        warningCodes: [
          ...runDraft.warnings.map((warning) => warning.code),
          ...inheritedWarnings
        ]
      })
    );
    segments.push(
      segment({
        layer: "session_working_set",
        title: "Local run draft working set",
        sourceKind: "run_draft",
        sourceRefId: runDraft.draftId,
        summary: [
          `intent:${runDraft.intent}`,
          `phases:${runDraft.proposedPhases.length}`,
          `surfaces:${runDraft.expectedSurfaces.length}`
        ].join(" | "),
        warningCodes: runDraft.warnings.map((warning) => warning.code)
      })
    );
  }

  const draftEventSegment = draftEventSummarySegment(
    input.runDraftEventSummary
  );
  if (draftEventSegment !== undefined) {
    segments.push(draftEventSegment);
  }

  if (
    input.agentRoutePreview !== undefined &&
    input.agentRoutePreview.status !== "empty"
  ) {
    segments.push(
      segment({
        layer: "session_working_set",
        title: "Agent route preview summary",
        sourceKind: "agent_route",
        sourceRefId: input.agentRoutePreview.routeId,
        summary: [
          `roles:${input.agentRoutePreview.roleCount}`,
          `capability_refs:${input.agentRoutePreview.capabilityRefCount}`,
          input.agentRoutePreview.modelProfileIds.join(",")
        ].join(" | "),
        warningCodes: input.agentRoutePreview.warnings.map(
          (warning) => warning.code
        )
      })
    );
  }

  if (
    input.capabilityPlanPreview !== undefined &&
    input.capabilityPlanPreview.status !== "empty"
  ) {
    segments.push(
      segment({
        layer: "session_working_set",
        title: "Capability plan preview summary",
        sourceKind: "capability_plan",
        sourceRefId: `capability-plan-${input.capabilityPlanPreview.intent}`,
        summary: [
          `items:${input.capabilityPlanPreview.itemCount}`,
          `approval:${input.capabilityPlanPreview.approvalRequiredCount}`,
          `disabled:${input.capabilityPlanPreview.disabledCount}`
        ].join(" | "),
        warningCodes: input.capabilityPlanPreview.warnings.map(
          (warning) => warning.code
        )
      })
    );
    if (input.capabilityPlanPreview.approvalRequiredCount > 0) {
      segments.push(
        segment({
          layer: "no_compress_zone",
          title: "Capability approval refs summary",
          sourceKind: "approval_ref",
          sourceRefId: `capability-approval-${input.capabilityPlanPreview.intent}`,
          summary: `approval_required:${input.capabilityPlanPreview.approvalRequiredCount}`,
          warningCodes: ["APPROVAL_REFS_NO_COMPRESS"]
        })
      );
    }
  }

  if (
    input.workspaceIndexBridge !== undefined &&
    input.workspaceIndexBridge.status !== "empty" &&
    input.workspaceIndexBridge.status !== "rejected"
  ) {
    segments.push(
      segment({
        layer: "volatile_tail",
        title: "Workspace index summary refs",
        sourceKind: "workspace_index",
        sourceRefId:
          input.workspaceIndexBridge.workspaceIndexId ??
          "workspace-index-summary",
        summary: [
          `files:${input.workspaceIndexBridge.fileCount}`,
          `indexed:${input.workspaceIndexBridge.indexedFileCount}`,
          `skipped:${input.workspaceIndexBridge.skippedFileCount}`,
          `languages:${input.workspaceIndexBridge.languageCount}`,
          `hash:${input.workspaceIndexBridge.hashPrefix}`
        ].join(" | "),
        warningCodes: input.workspaceIndexBridge.warnings.map(
          (warning) => warning.code
        )
      })
    );
  }

  if (
    input.memoryRecallPreview !== undefined &&
    input.memoryRecallPreview.status !== "empty"
  ) {
    segments.push(
      segment({
        layer: "volatile_tail",
        title: "Memory recall volatile refs",
        sourceKind: "memory_recall",
        sourceRefId: `memory-recall-${input.memoryRecallPreview.intent}`,
        summary: [
          `items:${input.memoryRecallPreview.itemCount}`,
          `policy:${input.memoryRecallPreview.policyCount}`,
          `project_fact:${input.memoryRecallPreview.projectFactCount}`,
          `pitfall:${input.memoryRecallPreview.pitfallCount}`,
          `volatile_tail:${input.memoryRecallPreview.volatileTailCount}`
        ].join(" | "),
        warningCodes: input.memoryRecallPreview.warnings.map(
          (warning) => warning.code
        )
      })
    );
  }

  if (input.eventSummary !== undefined && input.eventSummary.eventCount > 0) {
    segments.push(
      segment({
        layer: "volatile_tail",
        title: "Event evidence summary refs",
        sourceKind: "event_evidence",
        sourceRefId: "event-log-summary",
        summary: [
          `events:${input.eventSummary.eventCount}`,
          `drafts:${input.eventSummary.draftCount}`,
          `timeline:${input.eventSummary.timeline.length}`
        ].join(" | "),
        warningCodes: input.eventSummary.warnings
      })
    );
  }

  if (
    input.controlProjection !== undefined &&
    input.controlProjection.status !== "empty"
  ) {
    segments.push(
      segment({
        layer: "volatile_tail",
        title: "Control projection evidence summary",
        sourceKind: "control_projection",
        sourceRefId: "control-plane-projection",
        summary: [
          input.controlProjection.runStatus,
          input.controlProjection.intent,
          `artifacts:${input.controlProjection.artifactRefs.length}`
        ].join(" | "),
        warningCodes: input.controlProjection.warnings.map(
          (warning) => warning.code
        )
      })
    );
  }

  if (
    input.patchSurface !== undefined &&
    patchItemCount(input.patchSurface) > 0
  ) {
    const hasDiffAuditRef = input.patchSurface.items.some((item) =>
      item.status.startsWith("diff_audit_")
    );
    const hasApprovalDraftRef = input.patchSurface.items.some((item) =>
      item.status.startsWith("approval_draft_")
    );
    const hasValidationRef = input.patchSurface.items.some((item) =>
      item.status.startsWith("validation_")
    );
    segments.push(
      segment({
        layer: "no_compress_zone",
        title: hasApprovalDraftRef
          ? "Patch approval draft summaries"
          : hasDiffAuditRef
            ? "Patch diff audit preview summaries"
            : hasValidationRef
              ? "Patch proposal validation summaries"
              : "Patch proposal summaries",
        sourceKind: hasApprovalDraftRef ? "approval_ref" : "patch_proposal",
        sourceRefId: hasApprovalDraftRef
          ? "patch-approval-draft-preview-surface"
          : hasDiffAuditRef
            ? "patch-diff-audit-preview-surface"
            : hasValidationRef
              ? "patch-validation-preview-surface"
              : "patch-proposal-surface",
        summary: [
          `items:${patchItemCount(input.patchSurface)}`,
          `files:${input.patchSurface.fileCount}`,
          `added:${input.patchSurface.linesAdded}`,
          `removed:${input.patchSurface.linesRemoved}`
        ].join(" | "),
        warningCodes: [
          ...input.patchSurface.warnings,
          ...(hasApprovalDraftRef ? ["PATCH_APPROVAL_DRAFT_NO_COMPRESS"] : []),
          ...(hasDiffAuditRef ? ["PATCH_DIFF_AUDIT_NO_COMPRESS"] : []),
          ...(hasValidationRef ? ["PATCH_VALIDATION_NO_COMPRESS"] : [])
        ]
      })
    );
  }

  const warningSegmentCodes = uniqueStrings(
    segments.flatMap((item) => item.warningCodes)
  );
  if (warningSegmentCodes.length > 0) {
    segments.push(
      segment({
        layer: "no_compress_zone",
        title: "Safety warning code summary",
        sourceKind: "approval_ref",
        sourceRefId: "context-safety-warnings",
        summary: `warnings:${warningSegmentCodes.join(",")}`,
        warningCodes: warningSegmentCodes
      })
    );
  }

  return segments.sort((left, right) => {
    const layerCompare =
      layers.indexOf(left.layer) - layers.indexOf(right.layer);
    return layerCompare === 0
      ? left.segmentId.localeCompare(right.segmentId)
      : layerCompare;
  });
}

function viewFromSegments(
  input: AppContextAssemblyPreviewInput,
  segments: readonly AppContextAssemblySegmentView[],
  warningCodes: readonly string[],
  status: AppContextAssemblyStatus
): AppContextAssemblyPreviewView {
  const layerViews = layers.map((layer) => layerView(layer, segments));
  const cacheBoundary = cacheBoundaryView(input.previousPreview, layerViews);
  const totalSegments = segments.length;
  const totalTokenEstimate = segments.reduce(
    (sum, item) => sum + item.tokenEstimate,
    0
  );
  const allWarnings = uniqueStrings([
    ...warningCodes,
    ...segments.flatMap((item) => item.warningCodes)
  ]);

  return {
    status,
    totalSegments,
    totalTokenEstimate,
    frozenPrefixSegmentCount: segments.filter(
      (item) => item.placement === "frozen_prefix"
    ).length,
    volatileTailSegmentCount: segments.filter(
      (item) => item.placement === "volatile_tail"
    ).length,
    noCompressSegmentCount: segments.filter((item) => item.noCompress).length,
    layers: layerViews,
    segments: [...segments],
    cacheBoundary,
    warnings: allWarnings.map((code) => ({ code })),
    nextAction: nextActionFor(status, segments),
    source: segments.length > 0 ? "local_preview" : "empty",
    previewOnly: true,
    promptAssemblyEnabled: false,
    modelRequestEnabled: false,
    eventWritesEnabled: false
  };
}

function emptyPreview(
  input: AppContextAssemblyPreviewInput,
  warningCodes: readonly string[]
): AppContextAssemblyPreviewView {
  return viewFromSegments(
    input,
    [],
    warningCodes,
    warningCodes.length > 0 ? "warning" : "empty"
  );
}

function layerView(
  layer: AppContextAssemblyLayerName,
  segments: readonly AppContextAssemblySegmentView[]
): AppContextAssemblyLayerView {
  const ownSegments = segments.filter((item) => item.layer === layer);
  return {
    layer,
    segmentCount: ownSegments.length,
    tokenEstimate: ownSegments.reduce(
      (sum, item) => sum + item.tokenEstimate,
      0
    ),
    placement: placementForLayer(layer),
    hashPrefix: hashPrefix(
      JSON.stringify(
        ownSegments.map((item) => ({
          segmentId: item.segmentId,
          sourceKind: item.sourceKind,
          sourceRefId: item.sourceRefId,
          tokenEstimate: item.tokenEstimate,
          warnings: item.warningCodes
        }))
      )
    ),
    sourceRefCount: new Set(ownSegments.map((item) => item.sourceRefId)).size,
    warningCodes: uniqueStrings(
      ownSegments.flatMap((item) => item.warningCodes)
    )
  };
}

function segment(input: {
  layer: AppContextAssemblyLayerName;
  title: string;
  sourceKind: AppContextAssemblySourceRef["sourceKind"];
  sourceRefId: string;
  summary: string;
  warningCodes?: readonly string[];
}): AppContextAssemblySegmentView {
  const placement = placementForLayer(input.layer);
  const warningCodes = sanitizeWarningCodes(input.warningCodes ?? []);
  return {
    segmentId: `${input.layer}-${input.sourceKind}-${hashPrefix(
      `${input.sourceRefId}|${input.summary}`
    )}`,
    layer: input.layer,
    title: sanitizeTitle(input.title),
    sourceKind: input.sourceKind,
    sourceRefId: safeIdentifier(input.sourceRefId, "summary-ref"),
    tokenEstimate: estimateTokens(input.title, input.summary, warningCodes),
    placement,
    hashPrefix: hashPrefix(
      JSON.stringify({
        layer: input.layer,
        sourceKind: input.sourceKind,
        sourceRefId: input.sourceRefId,
        summary: input.summary,
        warnings: warningCodes
      })
    ),
    warningCodes,
    noCompress: placement === "no_compress_zone"
  };
}

function draftEventSummarySegment(
  value: unknown
): AppContextAssemblySegmentView | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const draftId = safeIdentifier(readValue(value, "draftId", "draft_id"), "");
  if (draftId.length === 0) {
    return undefined;
  }
  return segment({
    layer: "session_working_set",
    title: "Run draft event summary",
    sourceKind: "run_draft_event",
    sourceRefId: draftId,
    summary: [
      safeIdentifier(readValue(value, "intent"), "unknown"),
      `criteria:${finiteNumber(readValue(value, "acceptanceCriteriaCount"))}`
    ].join(" | "),
    warningCodes: safeArray(readValue(value, "warningCodes")).map((item) =>
      warningCode(safeText(item, "DRAFT_EVENT_WARNING"))
    )
  });
}

function cacheBoundaryView(
  previous: AppContextAssemblyPreviewView | undefined,
  layerViews: readonly AppContextAssemblyLayerView[]
): AppContextAssemblyCacheBoundaryView {
  if (previous === undefined || previous.source === "empty") {
    return {
      status: "unavailable",
      frozenPrefixChanged: false,
      taskContractChanged: false,
      volatileTailChanged: false,
      noCompressZoneChanged: false,
      reasonCodes: ["CACHE_BOUNDARY_UNAVAILABLE"]
    };
  }

  const previousHashes = layerHashMap(previous.layers);
  const currentHashes = layerHashMap(layerViews);
  const frozenPrefixChanged =
    previousHashes.get("immutable_rules") !==
      currentHashes.get("immutable_rules") ||
    previousHashes.get("workspace_rules") !==
      currentHashes.get("workspace_rules");
  const taskContractChanged =
    previousHashes.get("task_contract") !== currentHashes.get("task_contract");
  const volatileTailChanged =
    previousHashes.get("session_working_set") !==
      currentHashes.get("session_working_set") ||
    previousHashes.get("volatile_tail") !== currentHashes.get("volatile_tail");
  const noCompressZoneChanged =
    previousHashes.get("no_compress_zone") !==
    currentHashes.get("no_compress_zone");
  const reasonCodes = uniqueStrings([
    ...(frozenPrefixChanged ? ["FROZEN_PREFIX_CHANGED"] : []),
    ...(taskContractChanged ? ["TASK_CONTRACT_CHANGED"] : []),
    ...(volatileTailChanged ? ["VOLATILE_TAIL_CHANGED"] : []),
    ...(noCompressZoneChanged ? ["NO_COMPRESS_ZONE_CHANGED"] : [])
  ]);

  return {
    status: reasonCodes.length > 0 ? "changed" : "unchanged",
    frozenPrefixChanged,
    taskContractChanged,
    volatileTailChanged,
    noCompressZoneChanged,
    reasonCodes
  };
}

function layerHashMap(
  layerViews: readonly AppContextAssemblyLayerView[]
): Map<AppContextAssemblyLayerName, string> {
  return new Map(layerViews.map((layer) => [layer.layer, layer.hashPrefix]));
}

function patchItemCount(view: AppDiffSurfaceView): number {
  return view.items.length;
}

function placementForLayer(
  layer: AppContextAssemblyLayerName
): AppContextAssemblyPlacement {
  if (layer === "immutable_rules" || layer === "workspace_rules") {
    return "frozen_prefix";
  }
  if (layer === "task_contract") {
    return "task_contract";
  }
  if (layer === "no_compress_zone") {
    return "no_compress_zone";
  }
  return "volatile_tail";
}

function nextActionFor(
  status: AppContextAssemblyStatus,
  segments: readonly AppContextAssemblySegmentView[]
): string {
  if (status === "blocked") {
    return "Remove unsafe markers before previewing context assembly summaries.";
  }
  if (segments.length === 0) {
    return "Preview a local run draft and optional Workspace Index summary before context assembly preview.";
  }
  if (status === "warning") {
    return "Review warning codes. No prompt is assembled and no model request is sent.";
  }
  return "Preview only. Dynamic summaries remain in task_contract, volatile_tail, or no_compress_zone; no prompt is assembled.";
}

function estimateTokens(
  title: string,
  summary: string,
  warningCodes: readonly string[]
): number {
  const words = `${title} ${summary}`
    .split(/[^A-Za-z0-9_:-]+/)
    .filter((part) => part.length > 0).length;
  return Math.max(4, words + warningCodes.length * 2 + 3);
}

function sanitizeTitle(value: unknown): string {
  const text = safeErrorMessage(safeText(value, "Context summary"));
  return unsafeWarningCodes(text).length > 0
    ? "Context summary withheld by safety policy."
    : text.slice(0, 120);
}

function safeIdentifier(value: unknown, fallback: string): string {
  const text = safeText(value, fallback)
    .replace(/[^A-Za-z0-9_.:-]/g, "")
    .slice(0, 96);
  return text.length > 0 ? text : fallback;
}

function hashPrefix(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 12);
}

function unsafeWarningCodes(value: unknown): string[] {
  const text = safeText(value, "");
  if (text.length === 0) {
    return [];
  }
  return unsafePatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function rawKeyWarnings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap(rawKeyWarnings));
  }
  if (!isRecord(value)) {
    return [];
  }
  const codes: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenRawKeys.has(key.toLowerCase())) {
      codes.push("RAW_FIELD_REJECTED");
    }
    codes.push(...rawKeyWarnings(nested));
  }
  return uniqueStrings(codes);
}

function sanitizeWarningCodes(values: readonly string[]): string[] {
  return uniqueStrings(
    values
      .map((value) => warningCode(value))
      .filter((value) => value.length > 0)
  );
}

function warningCode(value: string): string {
  const code = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.-]/g, "_");
  return /^[A-Z0-9_.-]{1,80}$/.test(code) ? code : "";
}

function readValue(
  record: Record<string, unknown>,
  key: string,
  fallbackKey?: string
): unknown {
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    return record[key];
  }
  if (
    fallbackKey !== undefined &&
    Object.prototype.hasOwnProperty.call(record, fallbackKey)
  ) {
    return record[fallbackKey];
  }
  return undefined;
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
