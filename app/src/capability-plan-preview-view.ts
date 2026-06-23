import {
  buildCapabilityPlanPreview,
  validateCapabilityPlanPreviewInput as validateRuntimeCapabilityPlanPreviewInput,
  type CapabilityPlanPreviewInput,
  type CapabilityPlanPreviewItem
} from "../../runtime/src/capabilities/plan-preview.js";
import type { AppAgentRoutePreviewView } from "./agent-route-preview-view.js";
import type { AppContextCartView } from "./context-cart-view.js";
import type { AppMemoryInspectorView } from "./memory-inspector-view.js";
import type { AppRunDraftIntent, AppRunDraftView } from "./run-draft-view.js";
import {
  safeErrorMessage,
  safeText,
  type DesktopFlowResult
} from "./safety.js";
import type {
  AppDiffSurfaceView,
  AppWorkbenchApprovalRef
} from "./workbench-surfaces.js";
import type { AppWorkspaceIndexBridgeView } from "./workspace-index-bridge-view.js";

export type AppCapabilityPlanStatus =
  | "empty"
  | "preview"
  | "needs_clarification"
  | "warning"
  | "blocked";

export type AppCapabilityPlanSource =
  | "runtime_capability_broker_preview"
  | "empty";

export type AppCapabilityRiskView =
  | "A0_observe"
  | "A1_read"
  | "A2_draft_write"
  | "A3_scoped_write"
  | "A4_external_effect"
  | "A5_sensitive_or_irreversible";

export type AppCapabilityPlanWarning = {
  code: string;
};

export type AppCapabilityLeasePreviewView = {
  required: boolean;
  status: "not_issued";
  reason: string;
};

export type AppCapabilityPlanItemView = {
  itemId: string;
  capabilityId: string;
  title: string;
  sourceType: "native" | "mcp" | "plugin" | "skill";
  category:
    | "fs"
    | "git"
    | "shell"
    | "browser"
    | "desktop"
    | "knowledge"
    | "memory"
    | "bridge"
    | "unknown";
  riskLevel: AppCapabilityRiskView;
  invokePolicy: "AUTO" | "ASK_FIRST" | "MANUAL_ONLY" | "DISABLED";
  executionMode: "READ_ONLY" | "SIMULATE" | "MUTATING";
  planStatus:
    | "display_only"
    | "disabled"
    | "approval_required"
    | "needs_lease"
    | "unavailable"
    | "blocked";
  roleRefs: string[];
  routeStepRefs: string[];
  inputSummary: string;
  warningCodes: string[];
  disabledReason?: string | undefined;
  leasePreview?: AppCapabilityLeasePreviewView | undefined;
  dryRunAvailable: boolean;
  approvalRequired: boolean;
  leaseRequired: boolean;
  descriptorHash: string;
};

export type AppCapabilityPlanPreviewView = {
  status: AppCapabilityPlanStatus;
  intent: AppRunDraftIntent;
  itemCount: number;
  highRiskCount: number;
  disabledCount: number;
  approvalRequiredCount: number;
  leaseRequiredCount: number;
  items: AppCapabilityPlanItemView[];
  warnings: AppCapabilityPlanWarning[];
  nextAction: string;
  source: AppCapabilityPlanSource;
  planningOnly: true;
  executionEnabled: false;
  leaseIssued: false;
};

export type AppCapabilityPlanPreviewInput = {
  runDraft?: AppRunDraftView | undefined;
  agentRoutePreview?: AppAgentRoutePreviewView | undefined;
  contextCart?: AppContextCartView | undefined;
  patchSurface?: AppDiffSurfaceView | undefined;
  workspaceIndexRef?: AppWorkspaceIndexBridgeView | undefined;
  memoryInspector?: AppMemoryInspectorView | undefined;
  selectedIntent?: AppRunDraftIntent | undefined;
  conversionResult?: DesktopFlowResult | undefined;
  conversionError?:
    | { errorCode?: string | undefined; safeMessage?: string | undefined }
    | undefined;
};

export function buildCapabilityPlanPreviewView(
  input: AppCapabilityPlanPreviewInput = {}
): AppCapabilityPlanPreviewView {
  const intent = normalizeIntent(
    input.runDraft?.intent ?? input.selectedIntent
  );
  const runtimePreview = buildCapabilityPlanPreview(
    runtimeInputFor(input, intent)
  );
  const warningCodes = capabilityWarnings(input, runtimePreview);
  const source =
    input.runDraft === undefined ||
    input.runDraft.status === "empty" ||
    input.agentRoutePreview === undefined ||
    input.agentRoutePreview.status === "empty"
      ? "empty"
      : "runtime_capability_broker_preview";
  const status = appStatus(source, runtimePreview.status, warningCodes);
  const items = runtimePreview.items.map((item) =>
    appItemFromRuntimeItem(item, input)
  );

  return {
    status,
    intent: runtimePreview.intent,
    itemCount: items.length,
    highRiskCount: items.filter((item) => highRisk(item.riskLevel)).length,
    disabledCount: items.filter(
      (item) =>
        item.planStatus === "disabled" ||
        item.planStatus === "unavailable" ||
        item.planStatus === "blocked"
    ).length,
    approvalRequiredCount: items.filter((item) => item.approvalRequired).length,
    leaseRequiredCount: items.filter((item) => item.leaseRequired).length,
    items,
    warnings: warningCodes.map((code) => ({ code })),
    nextAction: appNextAction(status, runtimePreview.nextAction),
    source,
    planningOnly: true,
    executionEnabled: false,
    leaseIssued: false
  };
}

export function validateCapabilityPlanPreviewInput(
  input: AppCapabilityPlanPreviewInput
): { ok: boolean; warningCodes: string[] } {
  const intent = normalizeIntent(
    input.runDraft?.intent ?? input.selectedIntent
  );
  const runtimeValidation = validateRuntimeCapabilityPlanPreviewInput(
    runtimeInputFor(input, intent)
  );
  const warningCodes = uniqueStrings([
    ...runtimeValidation.warningCodes,
    ...(input.runDraft?.warnings.map((warning) => warning.code) ?? []),
    ...(input.agentRoutePreview?.warnings.map((warning) => warning.code) ?? [])
  ]);
  return {
    ok: warningCodes.length === 0,
    warningCodes
  };
}

export function capabilityPlanApprovalRefs(
  view: AppCapabilityPlanPreviewView
): AppWorkbenchApprovalRef[] {
  return view.items
    .filter(
      (item) =>
        item.approvalRequired ||
        item.leaseRequired ||
        item.planStatus === "approval_required" ||
        item.planStatus === "needs_lease"
    )
    .map((item) => ({
      id: `capability-${item.capabilityId}`,
      label: item.capabilityId,
      kind: "capability",
      status: "dry",
      summary: `${item.title} requires future approval or lease review; runtime preview only, no capability is invoked.`
    }));
}

function runtimeInputFor(
  input: AppCapabilityPlanPreviewInput,
  intent: AppRunDraftIntent
): CapabilityPlanPreviewInput {
  return {
    intent,
    ...(routePreviewFrom(input.agentRoutePreview) !== undefined
      ? { routePreview: routePreviewFrom(input.agentRoutePreview) }
      : {}),
    ...(input.runDraft !== undefined && input.runDraft.status !== "empty"
      ? {
          runDraftSummary: [
            input.runDraft.objectiveSummary,
            `criteria:${input.runDraft.acceptanceCriteriaCount}`,
            input.conversionError?.safeMessage
          ]
            .filter((value): value is string => value !== undefined)
            .join(" ")
        }
      : input.conversionError?.safeMessage !== undefined
        ? { runDraftSummary: input.conversionError.safeMessage }
        : {}),
    ...(contextSummaryRefFrom(input.contextCart) !== undefined
      ? { contextSummaryRef: contextSummaryRefFrom(input.contextCart) }
      : {}),
    ...(workspaceIndexRefFrom(input.workspaceIndexRef) !== undefined
      ? { workspaceIndexRef: workspaceIndexRefFrom(input.workspaceIndexRef) }
      : {}),
    ...(patchProposalRefFrom(input.patchSurface) !== undefined
      ? { patchProposalRef: patchProposalRefFrom(input.patchSurface) }
      : {}),
    ...(memoryRecallRefFrom(input.memoryInspector) !== undefined
      ? { memoryRecallRef: memoryRecallRefFrom(input.memoryInspector) }
      : {})
  };
}

function appItemFromRuntimeItem(
  item: CapabilityPlanPreviewItem,
  input: AppCapabilityPlanPreviewInput
): AppCapabilityPlanItemView {
  return {
    itemId: item.itemId,
    capabilityId: item.capabilityId,
    title: item.title,
    sourceType: item.sourceType,
    category: item.category,
    riskLevel: item.riskLevel,
    invokePolicy: item.invokePolicy,
    executionMode: item.executionMode,
    planStatus: item.planStatus,
    roleRefs: item.roleRefs,
    routeStepRefs: item.routeStepRefs,
    inputSummary: inputSummaryForItem(item, input),
    warningCodes: item.warningCodes,
    ...(item.disabledReason !== undefined
      ? { disabledReason: item.disabledReason }
      : {}),
    ...(item.leaseRequired
      ? {
          leasePreview: {
            required: true,
            status: "not_issued",
            reason:
              "runtime preview only; PermissionLease is not issued in this phase"
          }
        }
      : {}),
    dryRunAvailable: item.dryRunAvailable,
    approvalRequired: item.approvalRequired,
    leaseRequired: item.leaseRequired,
    descriptorHash: item.descriptorHash
  };
}

function routePreviewFrom(
  view: AppAgentRoutePreviewView | undefined
): CapabilityPlanPreviewInput["routePreview"] {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    routeId: view.routeId,
    status: view.status,
    roleRefs: view.steps.map((step) => step.role),
    routeStepRefs: view.steps.map((step) => step.stepId),
    capabilityRefs: view.steps.flatMap((step) =>
      step.allowedCapabilityRefs.map((ref) => ref.capabilityId)
    )
  };
}

function contextSummaryRefFrom(
  contextCart: AppContextCartView | undefined
): string | undefined {
  if (contextCart === undefined || contextCart.status === "empty") {
    return undefined;
  }
  return `context:${contextCart.source}`;
}

function workspaceIndexRefFrom(
  view: AppWorkspaceIndexBridgeView | undefined
): CapabilityPlanPreviewInput["workspaceIndexRef"] {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    refId: view.workspaceIndexId ?? "workspace-index-summary",
    kind: view.source,
    count: view.indexedFileCount,
    hashPrefix: view.hashPrefix,
    warningCodes: view.warnings.map((warning) => warning.code)
  };
}

function patchProposalRefFrom(
  patchSurface: AppDiffSurfaceView | undefined
): CapabilityPlanPreviewInput["patchProposalRef"] {
  const count = patchSurface?.items.length ?? 0;
  return count > 0
    ? {
        refId: "patch-surface-summary",
        kind: patchSurface?.status,
        count,
        warningCodes: patchSurface?.warnings
      }
    : undefined;
}

function memoryRecallRefFrom(
  memoryInspector: AppMemoryInspectorView | undefined
): CapabilityPlanPreviewInput["memoryRecallRef"] {
  const recalled = memoryInspector?.recalledCount ?? 0;
  return recalled > 0
    ? {
        refId: "memory-recall-summary",
        kind: memoryInspector?.source,
        count: recalled,
        warningCodes: memoryInspector?.warnings.map((warning) => warning.code)
      }
    : undefined;
}

function capabilityWarnings(
  input: AppCapabilityPlanPreviewInput,
  runtimePreview: ReturnType<typeof buildCapabilityPlanPreview>
): string[] {
  const validation = validateCapabilityPlanPreviewInput(input);
  const codes = [
    ...runtimePreview.warnings.map((warning) => warning.code),
    ...validation.warningCodes,
    ...(input.runDraft?.warnings.map((warning) => warning.code) ?? []),
    ...(input.agentRoutePreview?.warnings.map((warning) => warning.code) ?? [])
  ];
  if (input.contextCart?.status === "empty") {
    codes.push("CONTEXT_CART_EMPTY");
  }
  if (input.conversionError?.errorCode === "FILE_EXISTS") {
    codes.push("FILE_EXISTS");
  }
  return uniqueStrings(codes);
}

function inputSummaryForItem(
  item: CapabilityPlanPreviewItem,
  input: AppCapabilityPlanPreviewInput
): string {
  if (
    item.capabilityId === "native.workspace.index" &&
    workspaceIndexLoaded(input.workspaceIndexRef)
  ) {
    const view = input.workspaceIndexRef;
    return `Workspace index summary loaded: ${view.indexedFileCount}/${view.fileCount} indexed file(s), ${view.warnings.length} warning(s). Raw file content is not available.`;
  }
  return item.inputSummary;
}

function workspaceIndexLoaded(
  view: AppWorkspaceIndexBridgeView | undefined
): view is AppWorkspaceIndexBridgeView {
  return view?.status === "loaded" || view?.status === "warning";
}

function appStatus(
  source: AppCapabilityPlanSource,
  runtimeStatus: AppCapabilityPlanStatus,
  warningCodes: readonly string[]
): AppCapabilityPlanStatus {
  if (warningCodes.some(isBlockingWarning)) {
    return "blocked";
  }
  if (source === "empty") {
    return warningCodes.length > 0 ? "warning" : "empty";
  }
  if (runtimeStatus === "needs_clarification") {
    return "needs_clarification";
  }
  if (runtimeStatus === "blocked") {
    return "blocked";
  }
  return warningCodes.length > 0 ? "warning" : runtimeStatus;
}

function appNextAction(
  status: AppCapabilityPlanStatus,
  runtimeNextAction: string
): string {
  if (status === "warning" || status === "preview") {
    return `${runtimeNextAction} Plan generated from runtime Capability Broker preview helper.`;
  }
  if (status === "blocked") {
    return "Remove unsafe markers before reviewing capability plan summaries.";
  }
  if (status === "needs_clarification") {
    return "Clarify the draft intent before capability planning can move beyond preview.";
  }
  return "Preview a local run draft and agent route first. Capability plans will appear here before approval or execution.";
}

function highRisk(riskLevel: AppCapabilityRiskView): boolean {
  return (
    riskLevel === "A3_scoped_write" ||
    riskLevel === "A4_external_effect" ||
    riskLevel === "A5_sensitive_or_irreversible"
  );
}

function isBlockingWarning(code: string): boolean {
  return code.endsWith("_MARKER") || code === "FORBIDDEN_RAW_FIELD";
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

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => safeErrorMessage(safeText(value, "")))
        .filter((value) => /^[A-Z0-9_.:-]{1,120}$/.test(value))
    )
  ).sort();
}
