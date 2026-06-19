import {
  safeErrorMessage,
  safeText,
  type WorkspaceEventSummary
} from "./safety.js";
import type { AppControlPlaneProjectionView } from "./control-plane-view.js";

export type AppRunDraftIntent =
  | "web_data_extraction"
  | "code_change"
  | "code_review"
  | "verification"
  | "documentation"
  | "unknown";

export type AppRunDraftStatus =
  | "empty"
  | "draft_ready"
  | "draft_blocked"
  | "warning";

export type AppRunDraftWarning = {
  code: string;
};

export type AppRunDraftSafetyResult = {
  ok: boolean;
  blocked: boolean;
  summaryWithheld: boolean;
  warningCodes: string[];
};

export type AppRunDraftPhaseView = {
  id: string;
  label: string;
};

export type AppRunDraftAcceptanceView = {
  count: number;
  summaries: string[];
};

export type AppRunDraftInput = {
  objectiveDraft?: string | undefined;
  acceptanceCriteriaDraft?: string | undefined;
  selectedIntent?: AppRunDraftIntent | undefined;
  workspaceRoot?: string | undefined;
  controlProjection?: AppControlPlaneProjectionView | undefined;
  workspaceIndexRef?: unknown;
  patchProposalRefs?: unknown[] | undefined;
  memorySummary?: unknown;
  eventSummary?: WorkspaceEventSummary | null | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type AppRunDraftView = {
  draftId: string;
  status: AppRunDraftStatus;
  mode: "local_draft";
  previewOnly: true;
  canPreview: boolean;
  canCreateRun: false;
  canSendToModel: false;
  intent: AppRunDraftIntent;
  objectiveSummary: string;
  acceptanceCriteria: AppRunDraftAcceptanceView;
  acceptanceCriteriaCount: number;
  workspaceRootSummary: string;
  proposedPhases: AppRunDraftPhaseView[];
  expectedSurfaces: string[];
  safety: AppRunDraftSafetyResult;
  warnings: AppRunDraftWarning[];
  nextAction: string;
  createdAt: string;
  source: "local_state_only";
};

const unsafeDraftPatterns = [
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

export function buildRunDraftView(input: AppRunDraftInput): AppRunDraftView {
  const intent = normalizeIntent(input.selectedIntent);
  const objective = safeText(input.objectiveDraft, "");
  const criteria = acceptanceCriteria(input.acceptanceCriteriaDraft);
  const safety = validateRunDraftInput(input);
  const warnings = draftWarnings(input, safety);
  const status = draftStatus(objective, safety, warnings);
  const canPreview = status === "draft_ready" || status === "warning";
  const draftId =
    input.idGenerator?.() ??
    `local-draft-${hashDraft(
      [
        intent,
        objective,
        criteria.summaries.join("|"),
        safeText(input.workspaceRoot, "")
      ].join("|")
    )}`;

  return {
    draftId,
    status,
    mode: "local_draft",
    previewOnly: true,
    canPreview,
    canCreateRun: false,
    canSendToModel: false,
    intent,
    objectiveSummary: summarizeDraftText(
      objective,
      "No objective draft yet.",
      safety
    ),
    acceptanceCriteria: criteria,
    acceptanceCriteriaCount: criteria.count,
    workspaceRootSummary: summarizeWorkspaceRoot(input.workspaceRoot),
    proposedPhases: phasesForIntent(intent),
    expectedSurfaces: expectedSurfacesForIntent(intent),
    safety,
    warnings,
    nextAction: nextActionFor(status, warnings),
    createdAt: safeText(input.createdAt, "local-preview"),
    source: "local_state_only"
  };
}

export function validateRunDraftInput(
  input: AppRunDraftInput
): AppRunDraftSafetyResult {
  const warningCodes = safetyWarningCodes(
    [input.objectiveDraft, input.acceptanceCriteriaDraft].join("\n")
  );
  return {
    ok: warningCodes.length === 0,
    blocked: warningCodes.length > 0,
    summaryWithheld: warningCodes.length > 0,
    warningCodes
  };
}

export function summarizeRunDraft(view: AppRunDraftView): string {
  return [
    `draft=${view.draftId}`,
    `status=${view.status}`,
    `intent=${view.intent}`,
    `criteria=${view.acceptanceCriteriaCount}`,
    `phases=${view.proposedPhases.map((phase) => phase.id).join(">")}`,
    `preview_only=${view.previewOnly ? "yes" : "no"}`
  ].join("; ");
}

function draftStatus(
  objective: string,
  safety: AppRunDraftSafetyResult,
  warnings: readonly AppRunDraftWarning[]
): AppRunDraftStatus {
  if (objective.length === 0) {
    return "empty";
  }
  if (safety.blocked) {
    return "draft_blocked";
  }
  return warnings.length > 0 ? "warning" : "draft_ready";
}

function draftWarnings(
  input: AppRunDraftInput,
  safety: AppRunDraftSafetyResult
): AppRunDraftWarning[] {
  const objective = safeText(input.objectiveDraft, "");
  if (objective.length === 0) {
    return safety.warningCodes.map((code) => ({ code }));
  }

  const codes = [...safety.warningCodes];
  if (acceptanceCriteria(input.acceptanceCriteriaDraft).count === 0) {
    codes.push("ACCEPTANCE_CRITERIA_EMPTY");
  }
  if (normalizeIntent(input.selectedIntent) === "unknown") {
    codes.push("INTENT_UNKNOWN_NEEDS_CLARIFICATION");
  }
  if (safeText(input.workspaceRoot, "").length === 0) {
    codes.push("WORKSPACE_ROOT_EMPTY");
  }
  return Array.from(new Set(codes)).map((code) => ({ code }));
}

function safetyWarningCodes(text: string): string[] {
  return unsafeDraftPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function acceptanceCriteria(value: unknown): AppRunDraftAcceptanceView {
  const clean = safeText(value, "");
  const safety = validateRunDraftInput({ acceptanceCriteriaDraft: clean });
  const lines = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return {
    count: lines.length,
    summaries: safety.summaryWithheld
      ? ["Acceptance criteria summary withheld by safety policy."]
      : lines.map((line) => safeErrorMessage(line).slice(0, 120)).slice(0, 6)
  };
}

function phasesForIntent(intent: AppRunDraftIntent): AppRunDraftPhaseView[] {
  const phaseIds = {
    web_data_extraction: [
      "intake",
      "context",
      "execution_plan",
      "result",
      "audit"
    ],
    code_change: [
      "intake",
      "context",
      "routing",
      "capability_planning",
      "approval",
      "diff",
      "audit"
    ],
    code_review: ["intake", "context", "routing", "review", "audit"],
    verification: ["intake", "context", "verification", "audit"],
    documentation: ["intake", "context", "draft", "review"],
    unknown: ["intake", "clarification"]
  } satisfies Record<AppRunDraftIntent, string[]>;
  return phaseIds[intent].map((id) => ({
    id,
    label: id.replace(/_/g, " ")
  }));
}

function expectedSurfacesForIntent(intent: AppRunDraftIntent): string[] {
  const common = ["Control Plane Projection", "Audit Surface"];
  if (intent === "code_change") {
    return [
      ...common,
      "Agent Route Preview",
      "Capability Plan Preview",
      "Approval Surface",
      "Diff Surface",
      "Memory Inspector"
    ];
  }
  if (intent === "web_data_extraction") {
    return [...common, "Event Log / Replay", "Result Panel"];
  }
  if (intent === "unknown") {
    return ["Chat / Run Canvas", "Control Plane Projection"];
  }
  return [...common, "Memory Inspector"];
}

function nextActionFor(
  status: AppRunDraftStatus,
  warnings: readonly AppRunDraftWarning[]
): string {
  if (status === "empty") {
    return "Draft an objective locally. No run is created and no LLM request is sent.";
  }
  if (status === "draft_blocked") {
    return "Remove unsafe markers before previewing a local run draft.";
  }
  if (warnings.length > 0) {
    return "Preview can be reviewed locally. Warning codes must be resolved before any future real run creation.";
  }
  return "Preview only. No run is created and no LLM request is sent.";
}

function summarizeDraftText(
  text: string,
  fallback: string,
  safety: AppRunDraftSafetyResult
): string {
  if (safety.summaryWithheld) {
    return "Draft summary withheld by safety policy.";
  }
  return safeErrorMessage(safeText(text, fallback)).slice(0, 180);
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

function hashDraft(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
