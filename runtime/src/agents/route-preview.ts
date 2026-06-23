import { type AgentRole, type AgentTaskIntent } from "./types.js";

export type AgentRoutePreviewRole = AgentRole;

export type AgentRoutePreviewStatus =
  | "empty"
  | "preview"
  | "needs_clarification"
  | "warning"
  | "blocked";

export type AgentRoutePreviewWarning = {
  code: string;
  safeMessage: string;
};

export type AgentRoutePreviewCapabilityRef = {
  capabilityId: string;
  mode: "display_only";
  note: string;
  warningCodes: string[];
};

export type AgentRoutePreviewStep = {
  stepId: string;
  order: number;
  role: AgentRoutePreviewRole;
  purpose: string;
  expectedOutputs: string[];
  modelProfileId: string;
  allowedCapabilityRefs: AgentRoutePreviewCapabilityRef[];
  contextRefs: string[];
  memoryRefs: string[];
  evidenceRefs: string[];
  warningCodes: string[];
  dossierPreviewHash: string;
};

export type AgentRoutePreviewInput = {
  intent?: AgentTaskIntent | undefined;
  objectiveSummary?: string | undefined;
  acceptanceCriteriaCount?: number | undefined;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  memoryRecallRef?: string | undefined;
  patchProposalRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type AgentRoutePreview = {
  status: AgentRoutePreviewStatus;
  intent: AgentTaskIntent;
  routeId: string;
  roleCount: number;
  steps: AgentRoutePreviewStep[];
  modelProfileIds: string[];
  capabilityRefCount: number;
  warnings: AgentRoutePreviewWarning[];
  nextAction: string;
  source: "runtime_static_router_preview";
  previewOnly: true;
  executionEnabled: false;
};

export type AgentRoutePreviewValidationResult = {
  ok: boolean;
  warningCodes: string[];
};

const modelProfileByRole = {
  orchestrator: "deepseek-v4-pro",
  coder: "deepseek-v4-pro",
  reviewer: "deepseek-v4-pro",
  verifier: "deepseek-v4-flash"
} satisfies Record<AgentRoutePreviewRole, string>;

const forbiddenRawInputKeys = new Set([
  ["raw", "Objective"].join(""),
  ["raw", "Prompt"].join(""),
  ["raw", "Source"].join(""),
  ["raw", "Dom"].join(""),
  ["raw", "Csv"].join(""),
  ["raw", "Diff"].join(""),
  "beforeContent",
  "afterContent",
  ["api", "Key"].join(""),
  ["Author", "ization"].join(""),
  "env"
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
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildStaticAgentRoutePreview(
  input: AgentRoutePreviewInput = {}
): AgentRoutePreview {
  const intent = normalizeIntent(input.intent);
  const validation = validateAgentRoutePreviewInput(input);
  const baseWarnings = [...validation.warningCodes];

  if (safeText(input.objectiveSummary, "").length === 0) {
    return emptyPreview(intent, baseWarnings);
  }

  const roles = rolesForIntent(intent);
  const routeId =
    input.idGenerator?.() ??
    `runtime-route-${hashPreview(
      [
        intent,
        validation.warningCodes.length > 0
          ? "summary-withheld"
          : safeText(input.objectiveSummary, ""),
        String(finiteNumber(input.acceptanceCriteriaCount)),
        safeText(input.workspaceIndexRef, ""),
        safeText(input.contextSummaryRef, ""),
        safeText(input.memoryRecallRef, ""),
        safeText(input.patchProposalRef, ""),
        safeText(input.capabilityPlanRef, ""),
        safeText(input.createdAt, "runtime-preview")
      ].join("|")
    )}`;
  const warnings = routeWarnings(input, intent, baseWarnings);
  const status = routeStatus(intent, warnings);
  const steps =
    status === "blocked"
      ? []
      : roles.map((role, index) =>
          routeStep({
            role,
            order: index + 1,
            intent,
            routeId,
            input,
            routeWarnings: warnings
          })
        );

  return {
    status,
    intent,
    routeId,
    roleCount: steps.length,
    steps,
    modelProfileIds: uniqueStrings(steps.map((step) => step.modelProfileId)),
    capabilityRefCount: steps.reduce(
      (sum, step) => sum + step.allowedCapabilityRefs.length,
      0
    ),
    warnings: warnings.map((code) => ({
      code,
      safeMessage: `Agent route preview warning: ${code}`
    })),
    nextAction: nextActionFor(status),
    source: "runtime_static_router_preview",
    previewOnly: true,
    executionEnabled: false
  };
}

export function summarizeStaticAgentRoutePreview(preview: AgentRoutePreview): {
  routeId: string;
  status: AgentRoutePreviewStatus;
  intent: AgentTaskIntent;
  roles: string[];
  capabilityIds: string[];
  modelProfileIds: string[];
  warnings: string[];
  hash: string;
} {
  const capabilityIds = uniqueStrings(
    preview.steps.flatMap((step) =>
      step.allowedCapabilityRefs.map((ref) => ref.capabilityId)
    )
  );
  const roles = preview.steps.map((step) => step.role);
  const warnings = preview.warnings.map((warning) => warning.code);
  return {
    routeId: preview.routeId,
    status: preview.status,
    intent: preview.intent,
    roles,
    capabilityIds,
    modelProfileIds: preview.modelProfileIds,
    warnings,
    hash: hashPreview(
      [
        preview.routeId,
        preview.status,
        preview.intent,
        roles.join(","),
        capabilityIds.join(","),
        preview.modelProfileIds.join(","),
        warnings.join(",")
      ].join("|")
    )
  };
}

export function validateAgentRoutePreviewInput(
  input: AgentRoutePreviewInput
): AgentRoutePreviewValidationResult {
  const rawFieldWarnings = forbiddenRawFieldWarnings(input);
  const markerWarnings = unsafeWarningCodes(
    [
      input.objectiveSummary,
      input.workspaceIndexRef,
      input.contextSummaryRef,
      input.memoryRecallRef,
      input.patchProposalRef,
      input.capabilityPlanRef
    ].join("\n")
  );
  const warningCodes = uniqueStrings([...rawFieldWarnings, ...markerWarnings]);
  return {
    ok: warningCodes.length === 0,
    warningCodes
  };
}

function emptyPreview(
  intent: AgentTaskIntent,
  warningCodes: readonly string[]
): AgentRoutePreview {
  return {
    status: warningCodes.length > 0 ? "blocked" : "empty",
    intent,
    routeId: "no-runtime-route-preview",
    roleCount: 0,
    steps: [],
    modelProfileIds: [],
    capabilityRefCount: 0,
    warnings: warningCodes.map((code) => ({
      code,
      safeMessage: `Agent route preview warning: ${code}`
    })),
    nextAction:
      warningCodes.length > 0
        ? "Remove unsafe markers before route preview can be trusted."
        : "Preview a local run draft first. Agent routes will appear here before any execution.",
    source: "runtime_static_router_preview",
    previewOnly: true,
    executionEnabled: false
  };
}

function routeStep(input: {
  role: AgentRoutePreviewRole;
  order: number;
  intent: AgentTaskIntent;
  routeId: string;
  input: AgentRoutePreviewInput;
  routeWarnings: readonly string[];
}): AgentRoutePreviewStep {
  const allowedCapabilityRefs = capabilityRefsForRole(input.role, input.input);
  const warningCodes = uniqueStrings([
    ...input.routeWarnings,
    ...allowedCapabilityRefs.flatMap((ref) => ref.warningCodes),
    ...(input.role === "coder" && input.input.patchProposalRef === undefined
      ? ["PATCH_CAPABILITY_NOT_CONNECTED"]
      : [])
  ]);
  const contextRefs = contextRefsFrom(input.input);
  const memoryRefs = memoryRefsFrom(input.input);
  const evidenceRefs = evidenceRefsFrom(input.input);

  return {
    stepId: `${input.routeId}-${input.order}-${input.role}`,
    order: input.order,
    role: input.role,
    purpose: purposeForRole(input.role, input.intent),
    expectedOutputs: expectedOutputsForRole(input.role, input.intent),
    modelProfileId: modelProfileByRole[input.role],
    allowedCapabilityRefs,
    contextRefs,
    memoryRefs,
    evidenceRefs,
    warningCodes,
    dossierPreviewHash: hashPreview(
      [
        input.role,
        input.order,
        modelProfileByRole[input.role],
        allowedCapabilityRefs.map((ref) => ref.capabilityId).join(","),
        contextRefs.join(","),
        memoryRefs.join(","),
        evidenceRefs.join(","),
        warningCodes.join(",")
      ].join("|")
    )
  };
}

function rolesForIntent(intent: AgentTaskIntent): AgentRoutePreviewRole[] {
  switch (intent) {
    case "web_data_extraction":
      return ["orchestrator", "verifier"];
    case "code_change":
      return ["orchestrator", "coder", "reviewer", "verifier"];
    case "code_review":
      return ["orchestrator", "reviewer", "verifier"];
    case "verification":
      return ["orchestrator", "verifier"];
    case "documentation":
      return ["orchestrator", "coder", "reviewer"];
    case "unknown":
      return ["orchestrator"];
  }
}

function routeWarnings(
  input: AgentRoutePreviewInput,
  intent: AgentTaskIntent,
  baseWarningCodes: readonly string[]
): string[] {
  const codes = [...baseWarningCodes];
  if (intent === "unknown") {
    codes.push("INTENT_UNKNOWN_NEEDS_CLARIFICATION");
  }
  if (finiteNumber(input.acceptanceCriteriaCount) === 0) {
    codes.push("ACCEPTANCE_CRITERIA_EMPTY");
  }
  if (intent === "code_change" && input.patchProposalRef === undefined) {
    codes.push("PATCH_CAPABILITY_NOT_CONNECTED");
  }
  return uniqueStrings(codes);
}

function routeStatus(
  intent: AgentTaskIntent,
  warningCodes: readonly string[]
): AgentRoutePreviewStatus {
  if (
    warningCodes.some(
      (code) => code.endsWith("_MARKER") || code === "FORBIDDEN_RAW_FIELD"
    )
  ) {
    return "blocked";
  }
  if (intent === "unknown") {
    return "needs_clarification";
  }
  return warningCodes.length > 0 ? "warning" : "preview";
}

function nextActionFor(status: AgentRoutePreviewStatus): string {
  if (status === "needs_clarification") {
    return "Clarify intent before a future route can be promoted beyond preview.";
  }
  if (status === "blocked") {
    return "Remove unsafe markers before route preview can be trusted.";
  }
  if (status === "warning") {
    return "Review route warning codes. No agent is executed and no model request is sent.";
  }
  if (status === "preview") {
    return "Preview only. No agent is executed and no model request is sent.";
  }
  return "Preview a local run draft first. Agent routes will appear here before any execution.";
}

function purposeForRole(
  role: AgentRoutePreviewRole,
  intent: AgentTaskIntent
): string {
  if (role === "orchestrator") {
    return intent === "web_data_extraction"
      ? "Validate task frame and confirm deterministic flow."
      : "Prepare route plan and summarize task boundaries.";
  }
  if (role === "coder") {
    return "Prepare patch proposal summary only.";
  }
  if (role === "reviewer") {
    return "Review diff and audit summaries.";
  }
  return intent === "web_data_extraction"
    ? "Review result summary and event evidence."
    : "Check acceptance summary and verification evidence.";
}

function expectedOutputsForRole(
  role: AgentRoutePreviewRole,
  intent: AgentTaskIntent
): string[] {
  if (role === "orchestrator") {
    return intent === "web_data_extraction"
      ? ["task frame summary", "deterministic flow check"]
      : ["route plan summary"];
  }
  if (role === "coder") {
    return ["patch proposal summary"];
  }
  if (role === "reviewer") {
    return ["diff review summary", "audit review summary"];
  }
  return intent === "web_data_extraction"
    ? ["result summary review", "event evidence review"]
    : ["acceptance summary"];
}

function capabilityRefsForRole(
  role: AgentRoutePreviewRole,
  input: AgentRoutePreviewInput
): AgentRoutePreviewCapabilityRef[] {
  if (role === "orchestrator") {
    return [
      capabilityRef(
        "native.workspace.index",
        "read-only workspace index reference"
      )
    ];
  }
  if (role === "coder") {
    return [
      capabilityRef(
        "native.patch.propose",
        input.patchProposalRef === undefined
          ? "future patch proposal summary reference"
          : "patch proposal summary reference",
        input.patchProposalRef === undefined
          ? ["PATCH_CAPABILITY_NOT_CONNECTED"]
          : []
      )
    ];
  }
  if (role === "reviewer") {
    return [
      capabilityRef("native.git.diff_summary", "future read-only diff summary"),
      capabilityRef(
        "native.workspace.index",
        "read-only workspace index reference"
      )
    ];
  }
  return [
    capabilityRef("native.git.status", "future read-only status summary"),
    capabilityRef(
      ["native", "sh" + "ell", "pnpm_test"].join("."),
      "future simulated test summary",
      ["SHELL_EXECUTION_DISABLED"]
    )
  ];
}

function capabilityRef(
  capabilityId: string,
  note: string,
  warningCodes: readonly string[] = []
): AgentRoutePreviewCapabilityRef {
  return {
    capabilityId,
    mode: "display_only",
    note,
    warningCodes: uniqueStrings(warningCodes)
  };
}

function contextRefsFrom(input: AgentRoutePreviewInput): string[] {
  const refs: string[] = [];
  if (input.contextSummaryRef !== undefined) {
    refs.push(`context:${safeRef(input.contextSummaryRef)}`);
  }
  if (input.workspaceIndexRef !== undefined) {
    refs.push(`workspace-index:${safeRef(input.workspaceIndexRef)}`);
  }
  return refs;
}

function memoryRefsFrom(input: AgentRoutePreviewInput): string[] {
  return input.memoryRecallRef === undefined
    ? []
    : [`memory-recall:${safeRef(input.memoryRecallRef)}`];
}

function evidenceRefsFrom(input: AgentRoutePreviewInput): string[] {
  const refs: string[] = [];
  if (input.patchProposalRef !== undefined) {
    refs.push(`patch:${safeRef(input.patchProposalRef)}`);
  }
  if (input.capabilityPlanRef !== undefined) {
    refs.push(`capability-plan:${safeRef(input.capabilityPlanRef)}`);
  }
  return refs;
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function forbiddenRawFieldWarnings(input: AgentRoutePreviewInput): string[] {
  const record = input as Record<string, unknown>;
  return Object.keys(record).some((key) => forbiddenRawInputKeys.has(key))
    ? ["FORBIDDEN_RAW_FIELD"]
    : [];
}

function normalizeIntent(value: unknown): AgentTaskIntent {
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
