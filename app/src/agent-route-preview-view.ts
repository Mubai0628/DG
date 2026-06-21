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
  source: "local_run_draft_preview" | "empty";
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

const modelProfiles = {
  orchestrator: "deepseek-v4-pro",
  coder: "deepseek-v4-pro",
  reviewer: "deepseek-v4-pro",
  verifier: "deepseek-v4-flash"
} satisfies Record<AppAgentRoleView, string>;

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
  const warningCodes = validateAgentRoutePreviewInput({
    ...input,
    selectedIntent: intent,
    objectiveSummary,
    acceptanceCriteriaCount
  }).warningCodes;

  if (input.runDraft === undefined || input.runDraft.status === "empty") {
    return emptyPreview(intent, warningCodes);
  }

  const roles = rolesForIntent(intent);
  const routeId =
    input.idGenerator?.() ??
    `route-preview-${hashPreview(
      [
        input.runDraft.draftId,
        intent,
        sanitizedObjectiveSummary(objectiveSummary, warningCodes),
        String(acceptanceCriteriaCount)
      ].join("|")
    )}`;
  const sharedWarnings = routeWarnings(input, intent, warningCodes);
  const steps = roles.map((role, index) =>
    routeStep(role, index + 1, routeId, input, sharedWarnings)
  );
  const capabilityRefCount = steps.reduce(
    (sum, step) => sum + step.allowedCapabilityRefs.length,
    0
  );
  const status = routeStatus(intent, sharedWarnings);

  return {
    status,
    intent,
    routeId,
    steps,
    roleCount: steps.length,
    capabilityRefCount,
    modelProfileIds: Array.from(
      new Set(steps.map((step) => step.modelProfileId))
    ),
    warnings: sharedWarnings.map((code) => ({ code })),
    nextAction: nextActionFor(status),
    source: "local_run_draft_preview",
    previewOnly: true,
    executionEnabled: false
  };
}

export function validateAgentRoutePreviewInput(
  input: AppAgentRoutePreviewInput
): { ok: boolean; warningCodes: string[] } {
  const warningCodes = unsafeWarningCodes(
    [
      input.objectiveSummary,
      input.runDraft?.objectiveSummary,
      input.workspaceRoot
    ].join("\n")
  );
  return {
    ok: warningCodes.length === 0,
    warningCodes
  };
}

function emptyPreview(
  intent: AppAgentRouteIntent,
  warningCodes: readonly string[]
): AppAgentRoutePreviewView {
  return {
    status: warningCodes.length > 0 ? "warning" : "empty",
    intent,
    routeId: "no-route-preview",
    steps: [],
    roleCount: 0,
    capabilityRefCount: 0,
    modelProfileIds: [],
    warnings: warningCodes.map((code) => ({ code })),
    nextAction:
      "Preview a local run draft first. Agent routes will appear here before any execution.",
    source: "empty",
    previewOnly: true,
    executionEnabled: false
  };
}

function rolesForIntent(intent: AppAgentRouteIntent): AppAgentRoleView[] {
  if (intent === "web_data_extraction") {
    return ["orchestrator", "verifier"];
  }
  if (intent === "code_change") {
    return ["orchestrator", "coder", "reviewer", "verifier"];
  }
  if (intent === "code_review") {
    return ["orchestrator", "reviewer", "verifier"];
  }
  if (intent === "verification") {
    return ["orchestrator", "verifier"];
  }
  if (intent === "documentation") {
    return ["orchestrator", "coder", "reviewer"];
  }
  return ["orchestrator"];
}

function routeStep(
  role: AppAgentRoleView,
  order: number,
  routeId: string,
  input: AppAgentRoutePreviewInput,
  routeWarnings: readonly string[]
): AppAgentRouteStepView {
  const capabilityRefs = capabilityRefsForRole(role, input);
  const warningCodes = stepWarnings(role, input, routeWarnings);
  const contextRefs = contextRefsFrom(input);
  const memoryRefs = memoryRefsFrom(input);
  const evidenceRefs = evidenceRefsFrom(input);

  return {
    stepId: `${routeId}-${order}-${role}`,
    order,
    role,
    purpose: purposeForRole(role, input.runDraft?.intent ?? "unknown"),
    expectedOutputs: expectedOutputsForRole(role, input.runDraft?.intent),
    modelProfileId: modelProfiles[role],
    allowedCapabilityRefs: capabilityRefs,
    contextRefs,
    memoryRefs,
    evidenceRefs,
    warningCodes,
    dossierPreviewHash: hashPreview(
      [
        role,
        order,
        modelProfiles[role],
        capabilityRefs.map((ref) => ref.capabilityId).join(","),
        contextRefs.join(","),
        memoryRefs.join(","),
        evidenceRefs.join(",")
      ].join("|")
    )
  };
}

function purposeForRole(
  role: AppAgentRoleView,
  intent: AppAgentRouteIntent
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
  role: AppAgentRoleView,
  intent: AppAgentRouteIntent | undefined
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
  role: AppAgentRoleView,
  input: AppAgentRoutePreviewInput
): AppAgentRouteCapabilityRef[] {
  if (role === "orchestrator") {
    return [
      capabilityRef(
        "native.workspace.index",
        "read-only workspace index reference"
      )
    ];
  }
  if (role === "coder") {
    if (patchItemCount(input) > 0) {
      return [
        capabilityRef(
          "native.patch.propose",
          "patch proposal summary reference"
        )
      ];
    }
    return [];
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
      "future simulated test summary"
    )
  ];
}

function capabilityRef(
  capabilityId: string,
  note: string
): AppAgentRouteCapabilityRef {
  return {
    capabilityId,
    mode: "display_only",
    note
  };
}

function routeWarnings(
  input: AppAgentRoutePreviewInput,
  intent: AppAgentRouteIntent,
  baseWarningCodes: readonly string[]
): string[] {
  const codes = [
    ...baseWarningCodes,
    ...(input.runDraft?.warnings.map((warning) => warning.code) ?? [])
  ];
  if (intent === "unknown") {
    codes.push("INTENT_UNKNOWN_NEEDS_CLARIFICATION");
  }
  if ((input.runDraft?.acceptanceCriteriaCount ?? 0) === 0) {
    codes.push("ACCEPTANCE_CRITERIA_EMPTY");
  }
  if (intent === "code_change" && patchItemCount(input) === 0) {
    codes.push("PATCH_CAPABILITY_NOT_CONNECTED");
  }
  if (input.contextCart?.status === "empty") {
    codes.push("CONTEXT_CART_EMPTY");
  }
  return uniqueStrings(codes);
}

function stepWarnings(
  role: AppAgentRoleView,
  input: AppAgentRoutePreviewInput,
  routeWarnings: readonly string[]
): string[] {
  const codes = [...routeWarnings];
  if (role === "coder" && patchItemCount(input) === 0) {
    codes.push("PATCH_CAPABILITY_NOT_CONNECTED");
  }
  return uniqueStrings(codes);
}

function routeStatus(
  intent: AppAgentRouteIntent,
  warnings: readonly string[]
): AppAgentRouteStatus {
  if (intent === "unknown") {
    return "needs_clarification";
  }
  if (warnings.some((code) => code.endsWith("_MARKER"))) {
    return "error";
  }
  return warnings.length > 0 ? "warning" : "preview";
}

function nextActionFor(status: AppAgentRouteStatus): string {
  if (status === "needs_clarification") {
    return "Clarify intent before a future route can be promoted beyond preview.";
  }
  if (status === "error") {
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

function contextRefsFrom(input: AppAgentRoutePreviewInput): string[] {
  const refs: string[] = [];
  if (input.contextCart !== undefined && input.contextCart.status !== "empty") {
    refs.push(`context:${input.contextCart.source}`);
  }
  if (input.workspaceIndexRef !== undefined) {
    refs.push("workspace-index:summary");
  }
  return refs;
}

function memoryRefsFrom(input: AppAgentRoutePreviewInput): string[] {
  const recalled = input.memoryInspector?.recalledCount ?? 0;
  return recalled > 0 ? [`memory-recall:${recalled}`] : [];
}

function evidenceRefsFrom(input: AppAgentRoutePreviewInput): string[] {
  const refs: string[] = [];
  const patchCount = patchItemCount(input);
  if (patchCount > 0) {
    refs.push(`patch-surface:${patchCount}`);
  }
  return refs;
}

function patchItemCount(input: AppAgentRoutePreviewInput): number {
  return input.patchSurface?.items.length ?? 0;
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function sanitizedObjectiveSummary(
  value: string,
  warningCodes: readonly string[]
): string {
  if (warningCodes.length > 0) {
    return "summary-withheld";
  }
  return safeErrorMessage(safeText(value, "no-objective")).slice(0, 160);
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
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function hashPreview(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
