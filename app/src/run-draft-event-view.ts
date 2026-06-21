import { safeErrorMessage, safeText } from "./safety.js";
import type { AppAgentRoutePreviewView } from "./agent-route-preview-view.js";
import type { AppCapabilityPlanPreviewView } from "./capability-plan-preview-view.js";
import type { AppContextCartView } from "./context-cart-view.js";
import type { AppMemoryRecallPreviewView } from "./memory-recall-preview-view.js";
import type { AppRunDraftIntent, AppRunDraftView } from "./run-draft-view.js";
import type { AppWorkspaceIndexBridgeView } from "./workspace-index-bridge-view.js";

export type AppRunDraftEventWarning = {
  code: string;
};

export type AppRunDraftEventPayload = {
  eventKind: "control.run.draft_recorded";
  draftId: string;
  localTaskId: string;
  intent: AppRunDraftIntent;
  objectiveSummary: string;
  acceptanceCriteriaCount: number;
  workspaceSummary: string;
  workspaceRootHash?: string;
  workspaceIndexRef?: {
    workspaceIndexId?: string;
    fileCount: number;
    indexedFileCount: number;
    skippedFileCount: number;
    warningCount: number;
    hashPrefix?: string;
  };
  contextCartSummary?: {
    status: string;
    totalSegments: number;
    totalTokenEstimate: number;
    warningCount: number;
  };
  agentRouteSummary?: {
    status: string;
    roleCount: number;
    capabilityRefCount: number;
    routeId?: string;
  };
  capabilityPlanSummary?: {
    status: string;
    itemCount: number;
    approvalRequiredCount: number;
    disabledCount: number;
  };
  memoryRecallSummary?: {
    status: string;
    itemCount: number;
    volatileTailCount: number;
  };
  warningCodes: string[];
  createdAt: string;
  schemaVersion: 1;
  previewOnly: true;
  localOnly: true;
  noExecution: true;
};

export type AppRunDraftEventRecordRequest = {
  workspaceRoot: string;
  payload: AppRunDraftEventPayload;
};

export type AppRunDraftEventRecordResult = {
  ok: boolean;
  eventId: string;
  eventType: "control.run.draft_recorded";
  draftId: string;
  eventLogPath: string;
  safeMessage: string;
  warnings: string[];
};

export type AppRunDraftEventPayloadValidationResult =
  | { ok: true; warningCodes: string[] }
  | {
      ok: false;
      errorCode: string;
      safeMessage: string;
      warningCodes: string[];
    };

export type AppRunDraftEventPreview = {
  status: "empty" | "ready" | "blocked";
  canRecord: boolean;
  payload?: AppRunDraftEventPayload;
  warnings: AppRunDraftEventWarning[];
  nextAction: string;
  safeMessage?: string;
};

export type AppRunDraftEventPayloadInput = {
  runDraft?: AppRunDraftView | undefined;
  workspaceRoot?: string | undefined;
  workspaceIndexRef?: AppWorkspaceIndexBridgeView | undefined;
  contextCart?: AppContextCartView | undefined;
  agentRoutePreview?: AppAgentRoutePreviewView | undefined;
  capabilityPlanPreview?: AppCapabilityPlanPreviewView | undefined;
  memoryRecallPreview?: AppMemoryRecallPreviewView | undefined;
  createdAt?: string | undefined;
};

const maxPayloadBytes = 16_384;
const rawPrefix = "raw";
const clipBoardKey = "clip" + "board";
const forbiddenPayloadKeys = new Set(
  [
    "objectiveRaw",
    "acceptanceCriteriaRaw",
    "prompt",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    "beforeContent",
    "afterContent",
    "screenshot",
    clipBoardKey,
    "apiKey",
    "authorization",
    "env",
    "stdout",
    "stderr",
    "content",
    "fullContent",
    "memoryContent"
  ].map((key) => key.toLowerCase())
);

const unsafePayloadPatterns = [
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
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
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
    code: "URL_QUERY_SECRET_MARKER",
    pattern: /https?:\/\/\S+\?(?=\S*(token|key|secret|auth|password)=)/i
  }
];

export function buildRunDraftEventPayload(
  input: AppRunDraftEventPayloadInput
): AppRunDraftEventPreview {
  const runDraft = input.runDraft;
  if (runDraft === undefined || runDraft.status === "empty") {
    return {
      status: "empty",
      canRecord: false,
      warnings: [],
      nextAction: "Preview a local run draft before recording a draft event."
    };
  }
  if (runDraft.status === "draft_blocked") {
    return {
      status: "blocked",
      canRecord: false,
      warnings: runDraft.warnings.map((warning) => ({ code: warning.code })),
      nextAction: "Remove unsafe markers before recording a draft event.",
      safeMessage: "Run draft is blocked by safety policy."
    };
  }
  if (safeText(input.workspaceRoot, "").length === 0) {
    return {
      status: "blocked",
      canRecord: false,
      warnings: [{ code: "WORKSPACE_ROOT_REQUIRED" }],
      nextAction: "Choose a workspace before recording a local draft event.",
      safeMessage: "Workspace root is required."
    };
  }

  const workspaceIndexRef = summarizeWorkspaceIndex(input.workspaceIndexRef);
  const contextCartSummary =
    input.contextCart === undefined
      ? undefined
      : summarizeContextCart(input.contextCart);
  const agentRouteSummary =
    input.agentRoutePreview === undefined
      ? undefined
      : summarizeAgentRoute(input.agentRoutePreview);
  const capabilityPlanSummary =
    input.capabilityPlanPreview === undefined
      ? undefined
      : summarizeCapabilityPlan(input.capabilityPlanPreview);
  const memoryRecallSummary =
    input.memoryRecallPreview === undefined
      ? undefined
      : summarizeMemoryRecall(input.memoryRecallPreview);
  const payload: AppRunDraftEventPayload = {
    eventKind: "control.run.draft_recorded",
    draftId: runDraft.draftId,
    localTaskId: `local-task-${runDraft.draftId}`,
    intent: runDraft.intent,
    objectiveSummary: safeErrorMessage(runDraft.objectiveSummary).slice(0, 180),
    acceptanceCriteriaCount: runDraft.acceptanceCriteriaCount,
    workspaceSummary: runDraft.workspaceRootSummary,
    workspaceRootHash: hashValue(safeText(input.workspaceRoot, "")),
    ...(workspaceIndexRef === undefined ? {} : { workspaceIndexRef }),
    ...(contextCartSummary === undefined ? {} : { contextCartSummary }),
    ...(agentRouteSummary === undefined ? {} : { agentRouteSummary }),
    ...(capabilityPlanSummary === undefined ? {} : { capabilityPlanSummary }),
    ...(memoryRecallSummary === undefined ? {} : { memoryRecallSummary }),
    warningCodes: collectWarningCodes(input),
    createdAt: safeText(input.createdAt, new Date().toISOString()),
    schemaVersion: 1,
    previewOnly: true,
    localOnly: true,
    noExecution: true
  };
  const validation = validateRunDraftEventPayload(payload);
  if (!validation.ok) {
    return {
      status: "blocked",
      canRecord: false,
      warnings: validation.warningCodes.map((code) => ({ code })),
      nextAction: "Review the safe draft event warning before recording.",
      safeMessage: validation.safeMessage
    };
  }

  return {
    status: "ready",
    canRecord: true,
    payload,
    warnings: validation.warningCodes.map((code) => ({ code })),
    nextAction:
      "Record a summary-only draft event locally. This does not create or execute a run."
  };
}

export function validateRunDraftEventPayload(
  payload: AppRunDraftEventPayload
): AppRunDraftEventPayloadValidationResult {
  const warningCodes = unsafePayloadPatternCodes(JSON.stringify(payload));
  const forbiddenKey = findForbiddenKey(payload);
  if (forbiddenKey !== undefined) {
    return {
      ok: false,
      errorCode: "RAW_FIELD_REJECTED",
      safeMessage: "Draft event payload contains a forbidden raw field.",
      warningCodes: [...warningCodes, "RAW_FIELD_REJECTED", forbiddenKey]
    };
  }
  if (warningCodes.length > 0) {
    return {
      ok: false,
      errorCode: "UNSAFE_MARKER_REJECTED",
      safeMessage: "Draft event payload contains an unsafe marker.",
      warningCodes
    };
  }
  if (payload.eventKind !== "control.run.draft_recorded") {
    return {
      ok: false,
      errorCode: "INVALID_EVENT_KIND",
      safeMessage: "Draft event kind is invalid.",
      warningCodes: ["INVALID_EVENT_KIND"]
    };
  }
  if (payload.previewOnly !== true || payload.localOnly !== true) {
    return {
      ok: false,
      errorCode: "DRAFT_EVENT_NOT_LOCAL_ONLY",
      safeMessage: "Draft event must remain local preview only.",
      warningCodes: ["DRAFT_EVENT_NOT_LOCAL_ONLY"]
    };
  }
  if (payload.noExecution !== true) {
    return {
      ok: false,
      errorCode: "DRAFT_EVENT_EXECUTION_FLAG_INVALID",
      safeMessage: "Draft event must not represent execution.",
      warningCodes: ["DRAFT_EVENT_EXECUTION_FLAG_INVALID"]
    };
  }
  if (encodedBytes(JSON.stringify(payload)) > maxPayloadBytes) {
    return {
      ok: false,
      errorCode: "DRAFT_EVENT_TOO_LARGE",
      safeMessage: "Draft event payload is too large.",
      warningCodes: ["DRAFT_EVENT_TOO_LARGE"]
    };
  }
  return {
    ok: true,
    warningCodes: sanitizeWarningCodes(payload.warningCodes)
  };
}

export function summarizeRunDraftEventResult(
  result: AppRunDraftEventRecordResult | undefined
): string {
  if (result === undefined) {
    return "No draft event has been recorded.";
  }
  if (!result.ok) {
    return "Draft event was not recorded.";
  }
  return `Draft event recorded locally: ${result.draftId} (${result.eventId}). No run was created.`;
}

export function normalizeRunDraftEventRecordResult(
  raw: unknown
): AppRunDraftEventRecordResult {
  const value = isRecord(raw) ? raw : {};
  const eventType = readString(value, "eventType", "event_type");
  return {
    ok: readBoolean(value, "ok") === true,
    eventId: safeText(readValue(value, "eventId", "event_id"), "unknown-event"),
    eventType:
      eventType === "control.run.draft_recorded"
        ? "control.run.draft_recorded"
        : "control.run.draft_recorded",
    draftId: safeText(readValue(value, "draftId", "draft_id"), "unknown-draft"),
    eventLogPath: safeText(readValue(value, "eventLogPath", "event_log_path")),
    safeMessage: safeErrorMessage(
      readValue(value, "safeMessage", "safe_message") ??
        "Draft event recorded locally."
    ),
    warnings: readStringArray(value, "warnings")
  };
}

function summarizeWorkspaceIndex(
  view: AppWorkspaceIndexBridgeView | undefined
): AppRunDraftEventPayload["workspaceIndexRef"] | undefined {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "rejected"
  ) {
    return undefined;
  }
  return {
    ...(view.workspaceIndexId !== undefined
      ? { workspaceIndexId: view.workspaceIndexId }
      : {}),
    fileCount: view.fileCount,
    indexedFileCount: view.indexedFileCount,
    skippedFileCount: view.skippedFileCount,
    warningCount: view.warnings.length,
    ...(view.hashPrefix !== undefined ? { hashPrefix: view.hashPrefix } : {})
  };
}

function summarizeContextCart(view: AppContextCartView) {
  return {
    status: view.status,
    totalSegments: view.totalSegments,
    totalTokenEstimate: view.totalTokenEstimate,
    warningCount: view.warnings.length
  };
}

function summarizeAgentRoute(view: AppAgentRoutePreviewView) {
  return {
    status: view.status,
    roleCount: view.roleCount,
    capabilityRefCount: view.capabilityRefCount,
    ...(view.routeId !== undefined ? { routeId: view.routeId } : {})
  };
}

function summarizeCapabilityPlan(view: AppCapabilityPlanPreviewView) {
  return {
    status: view.status,
    itemCount: view.itemCount,
    approvalRequiredCount: view.approvalRequiredCount,
    disabledCount: view.disabledCount
  };
}

function summarizeMemoryRecall(view: AppMemoryRecallPreviewView) {
  return {
    status: view.status,
    itemCount: view.itemCount,
    volatileTailCount: view.volatileTailCount
  };
}

function collectWarningCodes(input: AppRunDraftEventPayloadInput): string[] {
  return sanitizeWarningCodes([
    ...(input.runDraft?.warnings.map((warning) => warning.code) ?? []),
    ...(input.contextCart?.warnings.map((warning) => warning.code) ?? []),
    ...(input.agentRoutePreview?.warnings.map((warning) => warning.code) ?? []),
    ...(input.capabilityPlanPreview?.warnings.map((warning) => warning.code) ??
      []),
    ...(input.memoryRecallPreview?.warnings.map((warning) => warning.code) ??
      []),
    ...(input.workspaceIndexRef?.warnings.map((warning) => warning.code) ?? [])
  ]);
}

function sanitizeWarningCodes(codes: readonly string[]): string[] {
  return Array.from(
    new Set(
      codes
        .map((code) => safeText(code, ""))
        .filter((code) => /^[A-Z0-9_.-]{1,64}$/.test(code))
    )
  ).sort();
}

function unsafePayloadPatternCodes(text: string): string[] {
  return unsafePayloadPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function findForbiddenKey(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenKey(item);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (forbiddenPayloadKeys.has(key.toLowerCase())) {
      return `FORBIDDEN_FIELD_${key.toUpperCase()}`;
    }
    const found = findForbiddenKey(nestedValue);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

function hashValue(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `workspace-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function encodedBytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readValue(
  record: Record<string, unknown>,
  key: string,
  fallbackKey?: string
): unknown {
  if (key in record) {
    return record[key];
  }
  if (fallbackKey !== undefined && fallbackKey in record) {
    return record[fallbackKey];
  }
  return undefined;
}

function readString(
  record: Record<string, unknown>,
  key: string,
  fallbackKey?: string
): string | undefined {
  const value = readValue(record, key, fallbackKey);
  return typeof value === "string" ? value : undefined;
}

function readBoolean(
  record: Record<string, unknown>,
  key: string,
  fallbackKey?: string
): boolean | undefined {
  const value = readValue(record, key, fallbackKey);
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
  fallbackKey?: string
): string[] {
  const value = readValue(record, key, fallbackKey);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
