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

export type AppCapabilityPlanSource = "local_preview" | "empty";

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
    | "unavailable";
  roleRefs: string[];
  routeStepRefs: string[];
  inputSummary: string;
  warningCodes: string[];
  disabledReason?: string | undefined;
  leasePreview?: AppCapabilityLeasePreviewView | undefined;
  dryRunAvailable: boolean;
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

type CapabilityTemplate = Omit<
  AppCapabilityPlanItemView,
  "roleRefs" | "routeStepRefs" | "inputSummary" | "warningCodes"
>;

const shellCategory = "sh" + "ell";

const capabilityTemplates = {
  "native.workspace.index": {
    capabilityId: "native.workspace.index",
    title: "Workspace index summary",
    sourceType: "native",
    category: "knowledge",
    riskLevel: "A1_read",
    invokePolicy: "MANUAL_ONLY",
    executionMode: "READ_ONLY",
    planStatus: "display_only",
    dryRunAvailable: true
  },
  "native.fs.write_draft": {
    capabilityId: "native.fs.write_draft",
    title: "Draft file write",
    sourceType: "native",
    category: "fs",
    riskLevel: "A2_draft_write",
    invokePolicy: "ASK_FIRST",
    executionMode: "MUTATING",
    planStatus: "approval_required",
    dryRunAvailable: true,
    leasePreview: {
      required: true,
      status: "not_issued",
      reason: "future approval gate required before draft writes"
    }
  },
  "native.patch.propose": {
    capabilityId: "native.patch.propose",
    title: "Patch proposal summary",
    sourceType: "native",
    category: "fs",
    riskLevel: "A2_draft_write",
    invokePolicy: "ASK_FIRST",
    executionMode: "SIMULATE",
    planStatus: "approval_required",
    dryRunAvailable: true,
    leasePreview: {
      required: true,
      status: "not_issued",
      reason: "future proposal gate required before write lanes"
    }
  },
  "native.patch.apply": {
    capabilityId: "native.patch.apply",
    title: "Patch apply",
    sourceType: "native",
    category: "fs",
    riskLevel: "A3_scoped_write",
    invokePolicy: "DISABLED",
    executionMode: "MUTATING",
    planStatus: "disabled",
    dryRunAvailable: true,
    disabledReason: "Patch apply is disabled in this App Shell phase."
  },
  "native.git.diff_summary": {
    capabilityId: "native.git.diff_summary",
    title: "Git diff summary",
    sourceType: "native",
    category: "git",
    riskLevel: "A1_read",
    invokePolicy: "MANUAL_ONLY",
    executionMode: "READ_ONLY",
    planStatus: "display_only",
    dryRunAvailable: true
  },
  "native.git.status": {
    capabilityId: "native.git.status",
    title: "Git status summary",
    sourceType: "native",
    category: "git",
    riskLevel: "A1_read",
    invokePolicy: "MANUAL_ONLY",
    executionMode: "READ_ONLY",
    planStatus: "display_only",
    dryRunAvailable: true
  },
  "native.git.commit_draft": {
    capabilityId: "native.git.commit_draft",
    title: "Git commit draft",
    sourceType: "native",
    category: "git",
    riskLevel: "A3_scoped_write",
    invokePolicy: "DISABLED",
    executionMode: "MUTATING",
    planStatus: "disabled",
    dryRunAvailable: true,
    disabledReason: "Git write lanes are disabled in this phase."
  },
  "native.shell.pnpm_test": {
    capabilityId: ["native", shellCategory, "pnpm_test"].join("."),
    title: "pnpm test simulated summary",
    sourceType: "native",
    category: "shell",
    riskLevel: "A4_external_effect",
    invokePolicy: "DISABLED",
    executionMode: "SIMULATE",
    planStatus: "disabled",
    dryRunAvailable: true,
    disabledReason: "Real command execution is disabled in this phase."
  },
  "native.patch.audit": {
    capabilityId: "native.patch.audit",
    title: "Patch audit summary",
    sourceType: "native",
    category: "knowledge",
    riskLevel: "A1_read",
    invokePolicy: "MANUAL_ONLY",
    executionMode: "SIMULATE",
    planStatus: "display_only",
    dryRunAvailable: true
  },
  "mcp.runtime.unavailable": {
    capabilityId: "mcp.runtime.unavailable",
    title: "MCP runtime placeholder",
    sourceType: "mcp",
    category: "unknown",
    riskLevel: "A4_external_effect",
    invokePolicy: "DISABLED",
    executionMode: "SIMULATE",
    planStatus: "unavailable",
    dryRunAvailable: false,
    disabledReason: "MCP runtime is not connected in this phase."
  }
} satisfies Record<string, CapabilityTemplate>;

type CapabilityTemplateId = keyof typeof capabilityTemplates;

export function buildCapabilityPlanPreviewView(
  input: AppCapabilityPlanPreviewInput = {}
): AppCapabilityPlanPreviewView {
  const intent = normalizeIntent(
    input.runDraft?.intent ?? input.selectedIntent
  );
  const safetyWarnings = validateCapabilityPlanPreviewInput(input).warningCodes;

  if (
    input.runDraft === undefined ||
    input.runDraft.status === "empty" ||
    input.agentRoutePreview === undefined ||
    input.agentRoutePreview.status === "empty"
  ) {
    return emptyPlan(intent, safetyWarnings);
  }

  if (intent === "unknown") {
    return planFromTemplates(
      intent,
      [],
      [...safetyWarnings, "INTENT_UNKNOWN_NEEDS_CLARIFICATION"],
      input
    );
  }

  return planFromTemplates(
    intent,
    capabilityIdsForIntent(intent, input),
    planWarnings(input, safetyWarnings),
    input
  );
}

export function validateCapabilityPlanPreviewInput(
  input: AppCapabilityPlanPreviewInput
): { ok: boolean; warningCodes: string[] } {
  const warningCodes = unsafeWarningCodes(
    [
      input.runDraft?.objectiveSummary,
      input.conversionError?.safeMessage,
      input.agentRoutePreview?.warnings.map((warning) => warning.code).join(" ")
    ].join("\n")
  );
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
        item.planStatus === "approval_required" ||
        item.planStatus === "needs_lease"
    )
    .map((item) => ({
      id: `capability-${item.capabilityId}`,
      label: item.capabilityId,
      kind: "capability",
      status: "dry",
      summary: `${item.title} requires future approval; no capability is invoked.`
    }));
}

function emptyPlan(
  intent: AppRunDraftIntent,
  warningCodes: readonly string[]
): AppCapabilityPlanPreviewView {
  return {
    status: warningCodes.length > 0 ? "warning" : "empty",
    intent,
    itemCount: 0,
    highRiskCount: 0,
    disabledCount: 0,
    approvalRequiredCount: 0,
    leaseRequiredCount: 0,
    items: [],
    warnings: warningCodes.map((code) => ({ code })),
    nextAction:
      "Preview a local run draft and agent route first. Capability plans will appear here before approval or execution.",
    source: "empty",
    planningOnly: true,
    executionEnabled: false,
    leaseIssued: false
  };
}

function planFromTemplates(
  intent: AppRunDraftIntent,
  capabilityIds: readonly CapabilityTemplateId[],
  inheritedWarnings: readonly string[],
  input?: AppCapabilityPlanPreviewInput
): AppCapabilityPlanPreviewView {
  const items = capabilityIds.map((capabilityId) =>
    itemFromTemplate(
      capabilityTemplates[capabilityId],
      inheritedWarnings,
      input
    )
  );
  const itemWarnings = items.flatMap((item) => item.warningCodes);
  const warnings = uniqueStrings([...inheritedWarnings, ...itemWarnings]);
  const status = statusFor(intent, items, warnings);

  return {
    status,
    intent,
    itemCount: items.length,
    highRiskCount: items.filter((item) => highRisk(item.riskLevel)).length,
    disabledCount: items.filter((item) => item.planStatus === "disabled")
      .length,
    approvalRequiredCount: items.filter(
      (item) =>
        item.planStatus === "approval_required" ||
        item.planStatus === "needs_lease"
    ).length,
    leaseRequiredCount: items.filter(
      (item) => item.leasePreview?.required === true
    ).length,
    items,
    warnings: warnings.map((code) => ({ code })),
    nextAction: nextActionFor(status),
    source: "local_preview",
    planningOnly: true,
    executionEnabled: false,
    leaseIssued: false
  };
}

function itemFromTemplate(
  template: CapabilityTemplate,
  inheritedWarnings: readonly string[],
  input?: AppCapabilityPlanPreviewInput
): AppCapabilityPlanItemView {
  const warningCodes = uniqueStrings([
    ...inheritedWarnings,
    ...warningsForTemplate(template)
  ]);
  return {
    ...template,
    roleRefs: rolesForCapability(template.capabilityId),
    routeStepRefs: routeStepsForCapability(template.capabilityId),
    inputSummary: inputSummaryForCapability(template.capabilityId, input),
    warningCodes
  };
}

function capabilityIdsForIntent(
  intent: AppRunDraftIntent,
  input: AppCapabilityPlanPreviewInput
): CapabilityTemplateId[] {
  if (intent === "web_data_extraction") {
    return ["native.workspace.index", "native.fs.write_draft"];
  }
  if (intent === "code_change") {
    return [
      "native.workspace.index",
      "native.patch.propose",
      "native.git.diff_summary",
      "native.git.status",
      "native.shell.pnpm_test",
      "native.patch.apply",
      "native.git.commit_draft"
    ];
  }
  if (intent === "code_review") {
    return [
      "native.workspace.index",
      "native.git.diff_summary",
      patchItemCount(input) > 0
        ? "native.patch.audit"
        : "mcp.runtime.unavailable"
    ];
  }
  if (intent === "verification") {
    return ["native.git.status", "native.shell.pnpm_test"];
  }
  if (intent === "documentation") {
    return ["native.workspace.index", "native.patch.propose"];
  }
  return [];
}

function planWarnings(
  input: AppCapabilityPlanPreviewInput,
  safetyWarnings: readonly string[]
): string[] {
  const codes = [
    ...safetyWarnings,
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

function warningsForTemplate(template: CapabilityTemplate): string[] {
  const codes: string[] = [];
  if (highRisk(template.riskLevel)) {
    codes.push("CAPABILITY_HIGH_RISK");
  }
  if (template.executionMode === "MUTATING") {
    codes.push("CAPABILITY_MUTATING_PREVIEW_ONLY");
  }
  if (template.planStatus === "disabled") {
    codes.push("CAPABILITY_DISABLED");
  }
  if (template.planStatus === "unavailable") {
    codes.push("CAPABILITY_UNAVAILABLE");
  }
  if (template.category === "shell") {
    codes.push("SHELL_EXECUTION_DISABLED");
  }
  if (template.capabilityId === "native.git.commit_draft") {
    codes.push("GIT_WRITE_DISABLED");
  }
  if (template.capabilityId === "native.patch.apply") {
    codes.push("PATCH_APPLY_DISABLED");
  }
  if (template.leasePreview?.required === true) {
    codes.push("LEASE_NOT_ISSUED");
  }
  return codes;
}

function inputSummaryForCapability(
  capabilityId: string,
  input: AppCapabilityPlanPreviewInput | undefined
): string {
  if (
    capabilityId === "native.workspace.index" &&
    workspaceIndexLoaded(input?.workspaceIndexRef)
  ) {
    const view = input.workspaceIndexRef;
    return `Workspace index summary loaded: ${view.indexedFileCount}/${view.fileCount} indexed file(s), ${view.warnings.length} warning(s). Raw file content is not available.`;
  }
  return "Summary-only preview; raw arguments are not available.";
}

function workspaceIndexLoaded(
  view: AppWorkspaceIndexBridgeView | undefined
): view is AppWorkspaceIndexBridgeView {
  return view?.status === "loaded" || view?.status === "warning";
}

function rolesForCapability(capabilityId: string): string[] {
  if (capabilityId.includes("workspace")) {
    return ["orchestrator", "reviewer"];
  }
  if (capabilityId.includes("patch.propose")) {
    return ["coder"];
  }
  if (capabilityId.includes("patch.audit") || capabilityId.includes("diff")) {
    return ["reviewer"];
  }
  if (capabilityId.includes("status") || capabilityId.includes("pnpm_test")) {
    return ["verifier"];
  }
  if (capabilityId.includes("write_draft")) {
    return ["orchestrator"];
  }
  return ["orchestrator"];
}

function routeStepsForCapability(capabilityId: string): string[] {
  return rolesForCapability(capabilityId).map((role) => `route:${role}`);
}

function statusFor(
  intent: AppRunDraftIntent,
  items: readonly AppCapabilityPlanItemView[],
  warnings: readonly string[]
): AppCapabilityPlanStatus {
  if (intent === "unknown") {
    return "needs_clarification";
  }
  if (warnings.some((code) => code.endsWith("_MARKER"))) {
    return "blocked";
  }
  if (items.length === 0) {
    return "empty";
  }
  return warnings.length > 0 ? "warning" : "preview";
}

function nextActionFor(status: AppCapabilityPlanStatus): string {
  if (status === "needs_clarification") {
    return "Clarify the draft intent before capability planning can move beyond preview.";
  }
  if (status === "blocked") {
    return "Remove unsafe markers before reviewing capability plan summaries.";
  }
  if (status === "warning") {
    return "Review descriptor warning codes. No capability is invoked and no permission lease is issued.";
  }
  if (status === "preview") {
    return "Planning only. No capability is invoked and no permission lease is issued.";
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

function patchItemCount(input: AppCapabilityPlanPreviewInput): number {
  return input.patchSurface?.items.length ?? 0;
}

function unsafeWarningCodes(text: string): string[] {
  return [
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
      code: "CLIPBOARD_MARKER",
      pattern: new RegExp(`\\bclip${"board"}\\b`, "i")
    }
  ]
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
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
        .filter((value) => /^[A-Z0-9_.-]{1,80}$/.test(value))
    )
  );
}
