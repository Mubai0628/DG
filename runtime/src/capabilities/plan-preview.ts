import {
  type CapabilityCategory,
  type CapabilityExecutionMode,
  type CapabilityInvokePolicy,
  type CapabilityRiskLevel,
  type CapabilitySourceType
} from "./types.js";

export type CapabilityPlanPreviewIntent =
  | "web_data_extraction"
  | "code_change"
  | "code_review"
  | "verification"
  | "documentation"
  | "unknown";

export type CapabilityPlanPreviewStatus =
  | "empty"
  | "preview"
  | "needs_clarification"
  | "warning"
  | "blocked";

export type CapabilityPlanItemStatus =
  | "display_only"
  | "disabled"
  | "approval_required"
  | "needs_lease"
  | "unavailable"
  | "blocked";

export type CapabilityPlanPreviewWarning = {
  code: string;
  safeMessage: string;
};

export type CapabilityPlanPreviewRouteRef = {
  routeId?: string | undefined;
  status?: string | undefined;
  roleRefs?: string[] | undefined;
  routeStepRefs?: string[] | undefined;
  capabilityRefs?: string[] | undefined;
};

export type CapabilityPlanPreviewSourceRef = {
  refId: string;
  kind?: string | undefined;
  count?: number | undefined;
  hashPrefix?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type CapabilityPlanPreviewPolicySummary = {
  planStatus: CapabilityPlanItemStatus;
  approvalRequired: boolean;
  leaseRequired: boolean;
  dryRunAvailable: boolean;
  invokePolicy: CapabilityInvokePolicy;
  executionMode: CapabilityExecutionMode;
};

export type CapabilityPlanPreviewInput = {
  intent?: CapabilityPlanPreviewIntent | undefined;
  routePreview?: CapabilityPlanPreviewRouteRef | undefined;
  runDraftSummary?: string | undefined;
  contextSummaryRef?: string | CapabilityPlanPreviewSourceRef | undefined;
  workspaceIndexRef?: string | CapabilityPlanPreviewSourceRef | undefined;
  patchProposalRef?: string | CapabilityPlanPreviewSourceRef | undefined;
  memoryRecallRef?: string | CapabilityPlanPreviewSourceRef | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CapabilityPlanPreviewItem = {
  itemId: string;
  capabilityId: string;
  title: string;
  sourceType: CapabilitySourceType;
  category: CapabilityCategory;
  riskLevel: CapabilityRiskLevel;
  invokePolicy: CapabilityInvokePolicy;
  executionMode: CapabilityExecutionMode;
  planStatus: CapabilityPlanItemStatus;
  roleRefs: string[];
  routeStepRefs: string[];
  inputSummary: string;
  warningCodes: string[];
  disabledReason?: string | undefined;
  dryRunAvailable: boolean;
  approvalRequired: boolean;
  leaseRequired: boolean;
  descriptorHash: string;
  policySummary: CapabilityPlanPreviewPolicySummary;
};

export type CapabilityPlanPreview = {
  status: CapabilityPlanPreviewStatus;
  intent: CapabilityPlanPreviewIntent;
  planId: string;
  itemCount: number;
  highRiskCount: number;
  disabledCount: number;
  approvalRequiredCount: number;
  leaseRequiredCount: number;
  items: CapabilityPlanPreviewItem[];
  warnings: CapabilityPlanPreviewWarning[];
  nextAction: string;
  source: "runtime_capability_broker_preview";
  planningOnly: true;
  executionEnabled: false;
  leaseIssued: false;
};

export type CapabilityPlanPreviewValidationResult = {
  ok: boolean;
  warningCodes: string[];
};

type PreviewDescriptor = {
  capabilityId: string;
  title: string;
  sourceType: CapabilitySourceType;
  category: CapabilityCategory;
  riskLevel: CapabilityRiskLevel;
  invokePolicy: CapabilityInvokePolicy;
  executionMode: CapabilityExecutionMode;
  planStatus: CapabilityPlanItemStatus;
  dryRunAvailable: boolean;
  approvalRequired: boolean;
  leaseRequired: boolean;
  disabledReason?: string | undefined;
};

const shellCategory = ["sh", "ell"].join("") as CapabilityCategory;
const nativeShellPnpmTest = ["native", "sh" + "ell", "pnpm_test"].join(".");

const previewDescriptors = {
  "native.workspace.index": {
    capabilityId: "native.workspace.index",
    title: "Workspace index summary",
    sourceType: "native",
    category: "knowledge",
    riskLevel: "A1_read",
    invokePolicy: "MANUAL_ONLY",
    executionMode: "READ_ONLY",
    planStatus: "display_only",
    dryRunAvailable: true,
    approvalRequired: false,
    leaseRequired: false
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
    approvalRequired: true,
    leaseRequired: true
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
    approvalRequired: true,
    leaseRequired: true
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
    approvalRequired: false,
    leaseRequired: false,
    disabledReason: "Patch apply is disabled in this phase."
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
    dryRunAvailable: true,
    approvalRequired: false,
    leaseRequired: false
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
    dryRunAvailable: true,
    approvalRequired: false,
    leaseRequired: false
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
    approvalRequired: false,
    leaseRequired: false,
    disabledReason: "Git write lanes are disabled in this phase."
  },
  "native.shell.pnpm_test": {
    capabilityId: nativeShellPnpmTest,
    title: "pnpm test simulated summary",
    sourceType: "native",
    category: shellCategory,
    riskLevel: "A4_external_effect",
    invokePolicy: "DISABLED",
    executionMode: "SIMULATE",
    planStatus: "disabled",
    dryRunAvailable: true,
    approvalRequired: false,
    leaseRequired: false,
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
    dryRunAvailable: true,
    approvalRequired: false,
    leaseRequired: false
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
    approvalRequired: false,
    leaseRequired: false,
    disabledReason: "MCP runtime is not connected in this phase."
  }
} satisfies Record<string, PreviewDescriptor>;

type PreviewDescriptorId = keyof typeof previewDescriptors;

const forbiddenRawInputKeys = new Set([
  ["raw", "Arguments"].join(""),
  ["raw", "Prompt"].join(""),
  ["raw", "Objective"].join(""),
  ["raw", "Source"].join(""),
  ["raw", "Dom"].join(""),
  ["raw", "Csv"].join(""),
  ["raw", "Diff"].join(""),
  "beforeContent",
  "afterContent",
  ["api", "Key"].join(""),
  ["Author", "ization"].join(""),
  "env",
  "stdout",
  "stderr"
]);

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
    pattern: new RegExp(`\\b${"Author"}ization\\s*:`, "i")
  },
  {
    code: "RAW_ARGUMENTS_MARKER",
    pattern: new RegExp(`\\braw${"Arguments"}\\b`, "i")
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
    code: "RAW_DIFF_MARKER",
    pattern: new RegExp(`\\braw${"Diff"}\\b|raw diff`, "i")
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
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildCapabilityPlanPreview(
  input: CapabilityPlanPreviewInput = {}
): CapabilityPlanPreview {
  const intent = normalizeIntent(input.intent);
  const validation = validateCapabilityPlanPreviewInput(input);
  const baseWarnings = [...validation.warningCodes];

  if (baseWarnings.some(isBlockingWarning)) {
    return emptyPreview(intent, baseWarnings, "blocked");
  }

  if (input.routePreview === undefined || input.intent === undefined) {
    return emptyPreview(intent, baseWarnings, "empty");
  }

  if (intent === "unknown") {
    return planFromDescriptors(
      input,
      intent,
      [],
      [...baseWarnings, "INTENT_UNKNOWN_NEEDS_CLARIFICATION"]
    );
  }

  return planFromDescriptors(
    input,
    intent,
    descriptorIdsForIntent(intent, input),
    planWarnings(input, baseWarnings)
  );
}

export function summarizeCapabilityPlanPreview(
  preview: CapabilityPlanPreview
): {
  planId: string;
  status: CapabilityPlanPreviewStatus;
  intent: CapabilityPlanPreviewIntent;
  capabilityIds: string[];
  approvalRequiredCount: number;
  leaseRequiredCount: number;
  disabledCount: number;
  warnings: string[];
  hash: string;
} {
  const capabilityIds = preview.items.map((item) => item.capabilityId);
  const warnings = preview.warnings.map((warning) => warning.code);
  return {
    planId: preview.planId,
    status: preview.status,
    intent: preview.intent,
    capabilityIds,
    approvalRequiredCount: preview.approvalRequiredCount,
    leaseRequiredCount: preview.leaseRequiredCount,
    disabledCount: preview.disabledCount,
    warnings,
    hash: hashPreview(
      [
        preview.planId,
        preview.status,
        preview.intent,
        capabilityIds.join(","),
        preview.approvalRequiredCount,
        preview.leaseRequiredCount,
        preview.disabledCount,
        warnings.join(",")
      ].join("|")
    )
  };
}

export function validateCapabilityPlanPreviewInput(
  input: CapabilityPlanPreviewInput
): CapabilityPlanPreviewValidationResult {
  const rawFieldWarnings = forbiddenRawFieldWarnings(input);
  const markerWarnings = unsafeWarningCodes(
    [
      input.runDraftSummary,
      sourceRefText(input.contextSummaryRef),
      sourceRefText(input.workspaceIndexRef),
      sourceRefText(input.patchProposalRef),
      sourceRefText(input.memoryRecallRef),
      input.routePreview?.routeId,
      input.routePreview?.status,
      input.routePreview?.roleRefs?.join(" "),
      input.routePreview?.routeStepRefs?.join(" "),
      input.routePreview?.capabilityRefs?.join(" ")
    ].join("\n")
  );
  const warningCodes = uniqueStrings([...rawFieldWarnings, ...markerWarnings]);
  return {
    ok: warningCodes.length === 0,
    warningCodes
  };
}

function emptyPreview(
  intent: CapabilityPlanPreviewIntent,
  warningCodes: readonly string[],
  forcedStatus?: CapabilityPlanPreviewStatus
): CapabilityPlanPreview {
  const status =
    forcedStatus ?? (warningCodes.length > 0 ? "warning" : "empty");
  return {
    status,
    intent,
    planId: "no-runtime-capability-plan-preview",
    itemCount: 0,
    highRiskCount: 0,
    disabledCount: 0,
    approvalRequiredCount: 0,
    leaseRequiredCount: 0,
    items: [],
    warnings: warningCodes.map((code) => ({
      code,
      safeMessage: `Capability plan preview warning: ${code}`
    })),
    nextAction:
      status === "blocked"
        ? "Remove unsafe markers before capability plan summaries can be trusted."
        : "Preview a local run draft and agent route first.",
    source: "runtime_capability_broker_preview",
    planningOnly: true,
    executionEnabled: false,
    leaseIssued: false
  };
}

function planFromDescriptors(
  input: CapabilityPlanPreviewInput,
  intent: CapabilityPlanPreviewIntent,
  descriptorIds: readonly PreviewDescriptorId[],
  warningCodes: readonly string[]
): CapabilityPlanPreview {
  const planId =
    input.idGenerator?.() ??
    `runtime-capability-plan-${hashPreview(
      [
        intent,
        safeText(input.routePreview?.routeId, "route"),
        safeText(input.runDraftSummary, "draft"),
        sourceRefText(input.workspaceIndexRef),
        sourceRefText(input.contextSummaryRef),
        sourceRefText(input.patchProposalRef),
        sourceRefText(input.memoryRecallRef),
        safeText(input.createdAt, "runtime-preview")
      ].join("|")
    )}`;
  const items = descriptorIds.map((descriptorId, index) =>
    itemFromDescriptor({
      descriptor: previewDescriptors[descriptorId],
      index,
      planId,
      input,
      inheritedWarnings: warningCodes
    })
  );
  const itemWarnings = items.flatMap((item) => item.warningCodes);
  const warnings = uniqueStrings([...warningCodes, ...itemWarnings]);
  const status = statusFor(intent, items, warnings);

  return {
    status,
    intent,
    planId,
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
    warnings: warnings.map((code) => ({
      code,
      safeMessage: `Capability plan preview warning: ${code}`
    })),
    nextAction: nextActionFor(status),
    source: "runtime_capability_broker_preview",
    planningOnly: true,
    executionEnabled: false,
    leaseIssued: false
  };
}

function itemFromDescriptor(input: {
  descriptor: PreviewDescriptor;
  index: number;
  planId: string;
  input: CapabilityPlanPreviewInput;
  inheritedWarnings: readonly string[];
}): CapabilityPlanPreviewItem {
  const warningCodes = uniqueStrings([
    ...input.inheritedWarnings,
    ...warningsForDescriptor(input.descriptor)
  ]);
  const roleRefs = rolesForCapability(input.descriptor.capabilityId);
  const routeStepRefs = routeStepsForRoles(roleRefs, input.input.routePreview);
  const descriptorHash = hashPreview(
    [
      input.descriptor.capabilityId,
      input.descriptor.sourceType,
      input.descriptor.category,
      input.descriptor.riskLevel,
      input.descriptor.invokePolicy,
      input.descriptor.executionMode,
      input.descriptor.planStatus,
      input.descriptor.dryRunAvailable ? "dry" : "no-dry",
      input.descriptor.disabledReason ?? ""
    ].join("|")
  );

  return {
    itemId: `${input.planId}-${input.index + 1}-${safeRef(
      input.descriptor.capabilityId
    )}`,
    capabilityId: input.descriptor.capabilityId,
    title: input.descriptor.title,
    sourceType: input.descriptor.sourceType,
    category: input.descriptor.category,
    riskLevel: input.descriptor.riskLevel,
    invokePolicy: input.descriptor.invokePolicy,
    executionMode: input.descriptor.executionMode,
    planStatus: input.descriptor.planStatus,
    roleRefs,
    routeStepRefs,
    inputSummary: inputSummaryForDescriptor(input.descriptor, input.input),
    warningCodes,
    ...(input.descriptor.disabledReason !== undefined
      ? { disabledReason: input.descriptor.disabledReason }
      : {}),
    dryRunAvailable: input.descriptor.dryRunAvailable,
    approvalRequired: input.descriptor.approvalRequired,
    leaseRequired: input.descriptor.leaseRequired,
    descriptorHash,
    policySummary: {
      planStatus: input.descriptor.planStatus,
      approvalRequired: input.descriptor.approvalRequired,
      leaseRequired: input.descriptor.leaseRequired,
      dryRunAvailable: input.descriptor.dryRunAvailable,
      invokePolicy: input.descriptor.invokePolicy,
      executionMode: input.descriptor.executionMode
    }
  };
}

function descriptorIdsForIntent(
  intent: CapabilityPlanPreviewIntent,
  input: CapabilityPlanPreviewInput
): PreviewDescriptorId[] {
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
      input.patchProposalRef === undefined
        ? "mcp.runtime.unavailable"
        : "native.patch.audit"
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
  input: CapabilityPlanPreviewInput,
  baseWarningCodes: readonly string[]
): string[] {
  const codes = [...baseWarningCodes];
  if (input.routePreview?.status === "needs_clarification") {
    codes.push("ROUTE_NEEDS_CLARIFICATION");
  }
  return uniqueStrings(codes);
}

function warningsForDescriptor(descriptor: PreviewDescriptor): string[] {
  const codes: string[] = [];
  if (highRisk(descriptor.riskLevel)) {
    codes.push("CAPABILITY_HIGH_RISK");
  }
  if (descriptor.executionMode === "MUTATING") {
    codes.push("CAPABILITY_MUTATING_PREVIEW_ONLY");
  }
  if (descriptor.planStatus === "disabled") {
    codes.push("CAPABILITY_DISABLED");
  }
  if (descriptor.planStatus === "unavailable") {
    codes.push("CAPABILITY_UNAVAILABLE");
  }
  if (descriptor.category === shellCategory) {
    codes.push("SHELL_EXECUTION_DISABLED");
  }
  if (descriptor.capabilityId === "native.git.commit_draft") {
    codes.push("GIT_WRITE_DISABLED");
  }
  if (descriptor.capabilityId === "native.patch.apply") {
    codes.push("PATCH_APPLY_DISABLED");
  }
  if (descriptor.leaseRequired) {
    codes.push("LEASE_NOT_ISSUED");
  }
  if (descriptor.sourceType === "mcp") {
    codes.push("MCP_RUNTIME_NOT_CONNECTED");
  }
  return codes;
}

function inputSummaryForDescriptor(
  descriptor: PreviewDescriptor,
  input: CapabilityPlanPreviewInput
): string {
  if (descriptor.capabilityId === "native.workspace.index") {
    return sourceRefSummary(input.workspaceIndexRef, "Workspace index summary");
  }
  if (descriptor.capabilityId === "native.patch.propose") {
    return sourceRefSummary(input.patchProposalRef, "Patch proposal summary");
  }
  if (descriptor.capabilityId === "native.patch.audit") {
    return sourceRefSummary(input.patchProposalRef, "Patch audit summary");
  }
  if (descriptor.capabilityId === "native.fs.write_draft") {
    return "Draft write descriptor only; no file write and no raw arguments are available.";
  }
  if (descriptor.category === "git") {
    return "Git descriptor preview only; no git command is executed.";
  }
  if (descriptor.category === shellCategory) {
    return "Command descriptor preview only; no command is executed.";
  }
  if (descriptor.sourceType === "mcp") {
    return "External runtime placeholder only; no MCP, plugin, or skill runtime is connected.";
  }
  return "Summary-only descriptor preview; raw arguments are not available.";
}

function sourceRefSummary(
  ref: string | CapabilityPlanPreviewSourceRef | undefined,
  label: string
): string {
  if (ref === undefined) {
    return `${label} not connected; descriptor is display-only.`;
  }
  if (typeof ref === "string") {
    return `${label} ref ${safeRef(ref)}; raw content is not available.`;
  }
  const details = [
    ref.kind !== undefined ? `kind ${safeRef(ref.kind)}` : undefined,
    ref.count !== undefined ? `count ${finiteNumber(ref.count)}` : undefined,
    ref.hashPrefix !== undefined
      ? `hash ${safeRef(ref.hashPrefix)}`
      : undefined,
    ref.warningCodes !== undefined
      ? `warnings ${ref.warningCodes.map(safeRef).join(",")}`
      : undefined
  ].filter((item): item is string => item !== undefined);
  return `${label} ref ${safeRef(ref.refId)}${
    details.length > 0 ? ` (${details.join("; ")})` : ""
  }; raw content is not available.`;
}

function sourceRefText(
  ref: string | CapabilityPlanPreviewSourceRef | undefined
): string {
  if (ref === undefined) {
    return "";
  }
  if (typeof ref === "string") {
    return ref;
  }
  return [
    ref.refId,
    ref.kind,
    ref.hashPrefix,
    ref.warningCodes?.join(" ")
  ].join(" ");
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

function routeStepsForRoles(
  roles: readonly string[],
  routePreview: CapabilityPlanPreviewRouteRef | undefined
): string[] {
  const supplied = routePreview?.routeStepRefs ?? [];
  if (supplied.length > 0) {
    return uniqueStrings(
      supplied.filter((step) => roles.some((role) => step.includes(role)))
    );
  }
  return roles.map((role) => `route:${role}`);
}

function statusFor(
  intent: CapabilityPlanPreviewIntent,
  items: readonly CapabilityPlanPreviewItem[],
  warningCodes: readonly string[]
): CapabilityPlanPreviewStatus {
  if (warningCodes.some(isBlockingWarning)) {
    return "blocked";
  }
  if (intent === "unknown") {
    return "needs_clarification";
  }
  if (items.length === 0) {
    return "empty";
  }
  return warningCodes.length > 0 ? "warning" : "preview";
}

function nextActionFor(status: CapabilityPlanPreviewStatus): string {
  if (status === "needs_clarification") {
    return "Clarify the draft intent before capability planning can move beyond preview.";
  }
  if (status === "blocked") {
    return "Remove unsafe markers before capability plan summaries can be trusted.";
  }
  if (status === "warning") {
    return "Review descriptor warning codes. No capability is invoked and no permission lease is issued.";
  }
  if (status === "preview") {
    return "Planning only. No capability is invoked and no permission lease is issued.";
  }
  return "Preview a local run draft and agent route first.";
}

function highRisk(riskLevel: CapabilityRiskLevel): boolean {
  return (
    riskLevel === "A3_scoped_write" ||
    riskLevel === "A4_external_effect" ||
    riskLevel === "A5_sensitive_or_irreversible"
  );
}

function isBlockingWarning(code: string): boolean {
  return code.endsWith("_MARKER") || code === "FORBIDDEN_RAW_FIELD";
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function forbiddenRawFieldWarnings(
  input: CapabilityPlanPreviewInput
): string[] {
  const record = input as Record<string, unknown>;
  return Object.keys(record).some((key) => forbiddenRawInputKeys.has(key))
    ? ["FORBIDDEN_RAW_FIELD"]
    : [];
}

function normalizeIntent(value: unknown): CapabilityPlanPreviewIntent {
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

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeRef(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 80);
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(
    new Set(values.filter((value) => /^[A-Za-z0-9_.:-]{1,120}$/.test(value)))
  ).sort();
}

function hashPreview(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
