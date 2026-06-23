import {
  buildStaticAgentRoutePreview,
  validateAgentRoutePreviewInput as validateRuntimeAgentRoutePreviewInput,
  type AgentRoutePreview,
  type AgentRoutePreviewStep
} from "../../runtime/src/agents/route-preview.js";
import type { AppContextCartView } from "./context-cart-view.js";
import type { AppMemoryInspectorView } from "./memory-inspector-view.js";
import type { AppRunDraftIntent, AppRunDraftView } from "./run-draft-view.js";
import type { AppDiffSurfaceView } from "./workbench-surfaces.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type AppAgentRoleView =
  | "orchestrator"
  | "coder"
  | "reviewer"
  | "verifier";

export type AppAgentRouteIntent = AppRunDraftIntent;

export type AppAgentRouteStatus =
  | "empty"
  | "preview"
  | "needs_clarification"
  | "warning"
  | "error";

export type AppAgentRouteWarning = {
  code: string;
};

export type AppAgentRouteModelProfileRef = {
  role: AppAgentRoleView;
  modelProfileId: string;
};

export type AppAgentRouteCapabilityRef = {
  capabilityId: string;
  mode: "display_only";
  note: string;
};

export type AppAgentRouteStepView = {
  stepId: string;
  order: number;
  role: AppAgentRoleView;
  purpose: string;
  expectedOutputs: string[];
  modelProfileId: string;
  allowedCapabilityRefs: AppAgentRouteCapabilityRef[];
  contextRefs: string[];
  memoryRefs: string[];
  evidenceRefs: string[];
  warningCodes: string[];
  dossierPreviewHash: string;
};

export type AppAgentRoutePreviewView = {
  status: AppAgentRouteStatus;
  intent: AppAgentRouteIntent;
  routeId: string;
  steps: AppAgentRouteStepView[];
  roleCount: number;
  capabilityRefCount: number;
  modelProfileIds: string[];
  warnings: AppAgentRouteWarning[];
  nextAction: string;
  source: "runtime_static_router_preview" | "empty";
  previewOnly: true;
  executionEnabled: false;
};

export type AppAgentRoutePreviewInput = {
  runDraft?: AppRunDraftView | undefined;
  selectedIntent?: AppAgentRouteIntent | undefined;
  objectiveSummary?: string | undefined;
  acceptanceCriteriaCount?: number | undefined;
  workspaceRoot?: string | undefined;
  contextCart?: AppContextCartView | undefined;
  workspaceIndexRef?: unknown;
  patchSurface?: AppDiffSurfaceView | undefined;
  memoryInspector?: AppMemoryInspectorView | undefined;
  capabilitySummary?: unknown;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildAgentRoutePreviewView(
  input: AppAgentRoutePreviewInput = {}
): AppAgentRoutePreviewView {
  const intent = normalizeIntent(
    input.runDraft?.intent ?? input.selectedIntent
  );
  const objectiveSummary =
    input.runDraft?.objectiveSummary ?? safeText(input.objectiveSummary, "");
  const acceptanceCriteriaCount =
    input.runDraft?.acceptanceCriteriaCount ??
    finiteNumber(input.acceptanceCriteriaCount);
  const runtimePreview = buildStaticAgentRoutePreview({
    intent,
    objectiveSummary:
      input.runDraft === undefined || input.runDraft.status === "empty"
        ? undefined
        : objectiveSummary,
    acceptanceCriteriaCount,
    workspaceIndexRef:
      input.workspaceIndexRef === undefined ? undefined : "summary",
    contextSummaryRef: contextSummaryRefFrom(input.contextCart),
    memoryRecallRef: memoryRecallRefFrom(input.memoryInspector),
    patchProposalRef: patchProposalRefFrom(input.patchSurface),
    capabilityPlanRef:
      input.capabilitySummary === undefined ? undefined : "summary",
    ...(input.createdAt !== undefined ? { createdAt: input.createdAt } : {}),
    ...(input.idGenerator !== undefined
      ? { idGenerator: input.idGenerator }
      : {})
  });
  const warningCodes = routeWarnings(input, runtimePreview);
  const status = appStatus(input, runtimePreview, warningCodes);

  return {
    status,
    intent: runtimePreview.intent,
    routeId: runtimePreview.routeId,
    steps: runtimePreview.steps.map(appStepFromRuntimeStep),
    roleCount: runtimePreview.steps.length,
    capabilityRefCount: runtimePreview.steps.reduce(
      (sum, step) => sum + step.allowedCapabilityRefs.length,
      0
    ),
    modelProfileIds: runtimePreview.modelProfileIds,
    warnings: warningCodes.map((code) => ({ code })),
    nextAction: nextActionFor(status),
    source:
      input.runDraft === undefined || input.runDraft.status === "empty"
        ? "empty"
        : "runtime_static_router_preview",
    previewOnly: true,
    executionEnabled: false
  };
}

export function validateAgentRoutePreviewInput(
  input: AppAgentRoutePreviewInput
): { ok: boolean; warningCodes: string[] } {
  const runtimeValidation = validateRuntimeAgentRoutePreviewInput({
    intent: normalizeIntent(input.runDraft?.intent ?? input.selectedIntent),
    objectiveSummary:
      input.runDraft?.objectiveSummary ?? safeText(input.objectiveSummary, ""),
    acceptanceCriteriaCount:
      input.runDraft?.acceptanceCriteriaCount ??
      finiteNumber(input.acceptanceCriteriaCount),
    workspaceIndexRef:
      input.workspaceIndexRef === undefined ? undefined : "summary",
    contextSummaryRef: contextSummaryRefFrom(input.contextCart),
    memoryRecallRef: memoryRecallRefFrom(input.memoryInspector),
    patchProposalRef: patchProposalRefFrom(input.patchSurface),
    capabilityPlanRef:
      input.capabilitySummary === undefined ? undefined : "summary"
  });
  const warningCodes = uniqueStrings([
    ...runtimeValidation.warningCodes,
    ...(input.runDraft?.warnings.map((warning) => warning.code) ?? [])
  ]);
  return {
    ok: warningCodes.length === 0,
    warningCodes
  };
}

function appStepFromRuntimeStep(
  step: AgentRoutePreviewStep
): AppAgentRouteStepView {
  return {
    stepId: step.stepId,
    order: step.order,
    role: step.role,
    purpose: step.purpose,
    expectedOutputs: step.expectedOutputs,
    modelProfileId: step.modelProfileId,
    allowedCapabilityRefs: step.allowedCapabilityRefs.map((ref) => ({
      capabilityId: ref.capabilityId,
      mode: "display_only",
      note: ref.note
    })),
    contextRefs: step.contextRefs,
    memoryRefs: step.memoryRefs,
    evidenceRefs: step.evidenceRefs,
    warningCodes: step.warningCodes,
    dossierPreviewHash: step.dossierPreviewHash
  };
}

function routeWarnings(
  input: AppAgentRoutePreviewInput,
  runtimePreview: AgentRoutePreview
): string[] {
  const codes = [
    ...runtimePreview.warnings.map((warning) => warning.code),
    ...(input.runDraft?.warnings.map((warning) => warning.code) ?? [])
  ];
  if (input.contextCart?.status === "empty") {
    codes.push("CONTEXT_CART_EMPTY");
  }
  return uniqueStrings(codes);
}

function appStatus(
  input: AppAgentRoutePreviewInput,
  runtimePreview: AgentRoutePreview,
  warningCodes: readonly string[]
): AppAgentRouteStatus {
  if (input.runDraft === undefined || input.runDraft.status === "empty") {
    return warningCodes.length > 0 ? "error" : "empty";
  }
  if (
    runtimePreview.status === "blocked" ||
    warningCodes.some(
      (code) => code.endsWith("_MARKER") || code === "FORBIDDEN_RAW_FIELD"
    )
  ) {
    return "error";
  }
  if (runtimePreview.status === "needs_clarification") {
    return "needs_clarification";
  }
  return warningCodes.length > 0 ? "warning" : "preview";
}

function nextActionFor(status: AppAgentRouteStatus): string {
  if (status === "needs_clarification") {
    return "Clarify intent before a future route can be promoted beyond preview.";
  }
  if (status === "error") {
    return "Remove unsafe markers before route preview can be trusted.";
  }
  if (status === "warning") {
    return "Review route warning codes. Route generated from runtime static router helper. No agent is executed and no model request is sent.";
  }
  if (status === "preview") {
    return "Route generated from runtime static router helper. Preview only. No agent is executed and no model request is sent.";
  }
  return "Preview a local run draft first. Agent routes will appear here before any execution.";
}

function contextSummaryRefFrom(
  contextCart: AppContextCartView | undefined
): string | undefined {
  if (contextCart === undefined || contextCart.status === "empty") {
    return undefined;
  }
  return `context:${contextCart.source}`;
}

function memoryRecallRefFrom(
  memoryInspector: AppMemoryInspectorView | undefined
): string | undefined {
  const recalled = memoryInspector?.recalledCount ?? 0;
  return recalled > 0 ? `memory-recall:${recalled}` : undefined;
}

function patchProposalRefFrom(
  patchSurface: AppDiffSurfaceView | undefined
): string | undefined {
  const count = patchSurface?.items.length ?? 0;
  return count > 0 ? `patch-surface:${count}` : undefined;
}

function normalizeIntent(value: unknown): AppAgentRouteIntent {
  return value === "web_data_extraction" ||
    value === "code_change" ||
    value === "code_review" ||
    value === "verification" ||
    value === "documentation" ||
    value === "unknown"
    ? value
    : "unknown";
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => safeErrorMessage(safeText(value, "")))
        .filter((value) => /^[A-Z0-9_.-]{1,80}$/.test(value))
    )
  );
}
