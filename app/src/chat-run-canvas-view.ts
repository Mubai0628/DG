import type { AppControlPlaneProjectionView } from "./control-plane-view.js";
import type { AppMemoryInspectorView } from "./memory-inspector-view.js";
import type { AppWorkbenchSurfaceView } from "./workbench-surfaces.js";
import {
  safeErrorMessage,
  safeText,
  type DesktopFlowResult,
  type RunnerPreflightSummary,
  type WorkspaceEventSummary
} from "./safety.js";

export type AppChatRunCanvasStatus =
  | "empty"
  | "draft"
  | "blocked"
  | "ready_preview";

export type AppRunCanvasIntent =
  | "web_data_extraction"
  | "code_change"
  | "code_review"
  | "verification"
  | "documentation"
  | "unknown";

export type AppRunCanvasAcceptanceView = {
  count: number;
  summary: string;
};

export type AppRunCanvasContextHint = {
  id: string;
  label: string;
  value: string;
};

export type AppRunCanvasNextAction = {
  label: string;
  severity: "info" | "warning" | "blocked";
};

export type AppChatDraftView = {
  intent: AppRunCanvasIntent;
  objectiveSummary: string;
  acceptanceCriteria: AppRunCanvasAcceptanceView;
  contextHints: AppRunCanvasContextHint[];
  warningCodes: string[];
};

export type AppRunCanvasView = {
  runStatus: string;
  phase: string;
  artifactCount: number;
  eventCount: number;
  auditStatus: string;
  approvalStatus: string;
  diffStatus: string;
  memoryStatus: string;
  latestResult: string;
  nextAction: AppRunCanvasNextAction;
};

export type AppChatRunCanvasView = {
  status: AppChatRunCanvasStatus;
  intent: AppRunCanvasIntent;
  objectiveSummary: string;
  acceptanceCriteriaCount: number;
  contextHintCount: number;
  canCreateRun: false;
  canSendToModel: false;
  warnings: string[];
  nextAction: AppRunCanvasNextAction;
  source: "local_state_only";
  chatDraft: AppChatDraftView;
  runCanvas: AppRunCanvasView;
};

export type AppChatRunCanvasInput = {
  objectiveDraft?: string | undefined;
  selectedIntent?: AppRunCanvasIntent | undefined;
  acceptanceCriteriaDraft?: string | undefined;
  workspaceRoot?: string | undefined;
  controlProjection: AppControlPlaneProjectionView;
  eventSummary?: WorkspaceEventSummary | null | undefined;
  conversionResult?: DesktopFlowResult | undefined;
  conversionError?:
    | { errorCode?: string | undefined; safeMessage?: string | undefined }
    | undefined;
  preflight?: RunnerPreflightSummary | undefined;
  memoryInspector: AppMemoryInspectorView;
  approvalDiffAuditSurfaces: AppWorkbenchSurfaceView;
};

const dangerousDraftPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{16,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/
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
];

export function buildChatRunCanvasView(
  input: AppChatRunCanvasInput
): AppChatRunCanvasView {
  const intent = normalizeIntent(input.selectedIntent);
  const objective = safeText(input.objectiveDraft, "");
  const criteria = acceptanceCriteria(input.acceptanceCriteriaDraft);
  const warnings = draftWarnings(
    [input.objectiveDraft, input.acceptanceCriteriaDraft].join("\n")
  );
  const blocked = input.preflight?.ok === false;
  const hasDraft = objective.length > 0 || criteria.count > 0;
  const status: AppChatRunCanvasStatus = blocked
    ? "blocked"
    : hasDraft && criteria.count > 0
      ? "ready_preview"
      : hasDraft
        ? "draft"
        : "empty";
  const nextAction = nextActionFor(status, input.conversionError);
  const contextHints = contextHintsFrom(input);

  return {
    status,
    intent,
    objectiveSummary: summarizeDraftText(objective, "No objective draft yet."),
    acceptanceCriteriaCount: criteria.count,
    contextHintCount: contextHints.length,
    canCreateRun: false,
    canSendToModel: false,
    warnings,
    nextAction,
    source: "local_state_only",
    chatDraft: {
      intent,
      objectiveSummary: summarizeDraftText(
        objective,
        "No objective draft yet."
      ),
      acceptanceCriteria: criteria,
      contextHints,
      warningCodes: warnings
    },
    runCanvas: {
      runStatus: input.controlProjection.runStatus,
      phase: input.controlProjection.phase,
      artifactCount: input.controlProjection.artifactRefs.length,
      eventCount: finiteNumber(input.eventSummary?.eventCount),
      auditStatus: input.approvalDiffAuditSurfaces.audit.status,
      approvalStatus: input.approvalDiffAuditSurfaces.approval.status,
      diffStatus: input.approvalDiffAuditSurfaces.diff.status,
      memoryStatus: input.memoryInspector.status,
      latestResult: latestResultSummary(input.conversionResult),
      nextAction
    }
  };
}

function normalizeIntent(value: unknown): AppRunCanvasIntent {
  return value === "web_data_extraction" ||
    value === "code_change" ||
    value === "code_review" ||
    value === "verification" ||
    value === "documentation" ||
    value === "unknown"
    ? value
    : "unknown";
}

function acceptanceCriteria(value: unknown): AppRunCanvasAcceptanceView {
  const lines = safeText(value, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const sanitized = lines
    .slice(0, 3)
    .map((line) => summarizeDraftText(line, "criterion"))
    .join("; ");
  return {
    count: lines.length,
    summary: sanitized.length > 0 ? sanitized : "No acceptance criteria yet."
  };
}

function contextHintsFrom(
  input: AppChatRunCanvasInput
): AppRunCanvasContextHint[] {
  const hints: AppRunCanvasContextHint[] = [
    {
      id: "workspace",
      label: "Workspace",
      value: safeText(input.workspaceRoot, "not selected")
    },
    {
      id: "projection",
      label: "Projection",
      value: `${input.controlProjection.runStatus} / ${input.controlProjection.phase}`
    },
    {
      id: "artifacts",
      label: "Artifacts",
      value: String(input.controlProjection.artifactRefs.length)
    },
    {
      id: "audit",
      label: "Audit",
      value: input.approvalDiffAuditSurfaces.audit.status
    },
    {
      id: "memory",
      label: "Memory",
      value: input.memoryInspector.status
    }
  ];
  return hints;
}

function draftWarnings(text: string): string[] {
  return dangerousDraftPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function summarizeDraftText(text: string, fallback: string): string {
  const clean = safeText(text, fallback);
  if (draftWarnings(clean).length > 0) {
    return "Draft summary withheld by safety policy.";
  }
  return safeErrorMessage(clean).slice(0, 160);
}

function latestResultSummary(result: DesktopFlowResult | undefined): string {
  if (result === undefined) {
    return "No conversion result yet.";
  }
  return `${result.draft.relativePath} · ${result.extraction.rowCount} row(s) · ${result.extraction.columnCount} column(s)`;
}

function nextActionFor(
  status: AppChatRunCanvasStatus,
  conversionError:
    | { errorCode?: string | undefined; safeMessage?: string | undefined }
    | undefined
): AppRunCanvasNextAction {
  const fileExists =
    conversionError?.errorCode === "FILE_EXISTS" ||
    conversionError?.safeMessage?.includes("FILE_EXISTS") === true ||
    conversionError?.safeMessage?.toLowerCase().includes("file exists") ===
      true;
  if (fileExists) {
    return {
      label: "Choose a new draft filename or remove the existing file.",
      severity: "warning"
    };
  }
  if (status === "blocked") {
    return {
      label: "Fix runner preflight before future run creation can be designed.",
      severity: "blocked"
    };
  }
  if (status === "ready_preview") {
    return {
      label:
        "Review the local draft preview. Create Run is disabled until execution gates are implemented.",
      severity: "info"
    };
  }
  if (status === "draft") {
    return {
      label:
        "Add acceptance criteria to complete the local preview. No LLM request is sent.",
      severity: "info"
    };
  }
  return {
    label:
      "Draft an objective locally. No LLM request is sent and no run is created.",
    severity: "info"
  };
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
