import { stablePreviewHash } from "./stable-preview-hash.js";

export const APP_LIVE_PROPOSAL_CONFIRMATION = "CALL DEEPSEEK FOR PROPOSAL";

export type AppLiveProposalSessionScope = {
  receiptId: string;
  kind: "live_proposal_generation";
  providerId: "deepseek";
  modelProfileId: string;
  objectiveSummaryHash: string;
  allowedPathRefs: string[];
  contextRefHashes: string[];
  apiKeyPolicyId: string;
  requestBuilderId?: string | undefined;
  expiresAt: string;
  typedConfirmation: string;
  receiptHash: string;
};

export type AppLiveProposalSessionReceiptInput = Partial<
  Omit<AppLiveProposalSessionScope, "kind" | "providerId" | "receiptHash">
> & {
  kind?: "live_proposal_generation" | string | undefined;
  providerId?: "deepseek" | string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type AppLiveProposalSessionStatus = "ready" | "warning" | "blocked";

export type AppLiveProposalSessionFindingKind =
  | "input"
  | "confirmation"
  | "expiry"
  | "provider"
  | "model_profile"
  | "objective"
  | "path"
  | "context"
  | "policy"
  | "request_builder"
  | "secret_marker"
  | "forbidden_field"
  | "readiness";

export type AppLiveProposalSessionSeverity = "blocker" | "warning";

export type AppLiveProposalSessionFinding = {
  findingId: string;
  kind: AppLiveProposalSessionFindingKind;
  severity: AppLiveProposalSessionSeverity;
  code: string;
  safeMessage: string;
  relatedRef?: string | undefined;
};

export type AppLiveProposalSessionReadiness = {
  canProceedToLiveProposalCommand: boolean;
  canReadApiKey: false;
  canCallLiveModel: false;
  canFetchNetwork: false;
  canSendLiveRequest: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type AppLiveProposalSessionReceipt = AppLiveProposalSessionScope & {
  status: AppLiveProposalSessionStatus;
  typedConfirmationAccepted: boolean;
  findings: AppLiveProposalSessionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: AppLiveProposalSessionReadiness;
  nextAction: string;
  summaryOnly: true;
  source: "runtime_app_live_proposal_session_receipt";
};

export type AppLiveProposalSessionValidationResult = {
  ok: boolean;
  status: AppLiveProposalSessionStatus;
  findings: AppLiveProposalSessionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: AppLiveProposalSessionReadiness;
};

type NormalizedSessionInput = {
  receiptId: string;
  kind: "live_proposal_generation";
  providerId: "deepseek";
  modelProfileId: string;
  objectiveSummaryHash: string;
  allowedPathRefs: string[];
  contextRefHashes: string[];
  apiKeyPolicyId: string;
  requestBuilderId?: string | undefined;
  expiresAt: string;
  typedConfirmation: string;
  createdAt: string;
};

const SOURCE = "runtime_app_live_proposal_session_receipt" as const;
const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";
const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const bearerField = ["bear", "er"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const forbiddenFieldNames = new Set(
  [
    apiKeyField,
    "apiKeyValue",
    "secret",
    "token",
    authHeaderField,
    bearerField,
    "rawKey",
    "envValue",
    "processEnvValue",
    "vaultSecretValue",
    "password",
    rawPrefix + "Prompt",
    "promptText",
    rawPrefix + "Request",
    rawPrefix + "Response",
    "responseText",
    "reasoningContent",
    "reasoning_content",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
    "stdout",
    "stderr",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge",
    "tools",
    toolChoiceField
  ].map((field) => field.toLowerCase())
);

const executionReadinessFields = new Set(
  [
    "canReadApiKey",
    "canCallLiveModel",
    "canFetchNetwork",
    "canSendLiveRequest",
    "canWriteFilesystem",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canExecuteGit",
    "canExecuteShell",
    "canIssuePermissionLease",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowEventStoreWrite",
    "allowGit",
    "allowShell",
    "allowAppExecution"
  ].map((field) => field.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: /\braw\s*prompt\b/i
  },
  {
    code: "RAW_RESPONSE_MARKER",
    pattern: /\braw\s*response\b/i
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: /\braw\s*diff\b/i
  },
  {
    code: "REASONING_CONTENT_MARKER",
    pattern: /\breasoning_content\b/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildAppLiveProposalSessionReceipt(
  input: AppLiveProposalSessionReceiptInput = {}
): AppLiveProposalSessionReceipt {
  const normalized = normalizeInput(input);
  const findings = validateNormalizedInput(input, normalized);
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const status: AppLiveProposalSessionStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "ready";
  const receiptHash = stablePreviewHash(
    stableStringify({
      source: SOURCE,
      scope: normalizedForHash(normalized)
    })
  );
  const typedConfirmationAccepted =
    normalized.typedConfirmation === APP_LIVE_PROPOSAL_CONFIRMATION;

  return {
    status,
    receiptId: normalized.receiptId,
    kind: "live_proposal_generation",
    providerId: "deepseek",
    modelProfileId: normalized.modelProfileId,
    objectiveSummaryHash: normalized.objectiveSummaryHash,
    allowedPathRefs: normalized.allowedPathRefs,
    contextRefHashes: normalized.contextRefHashes,
    apiKeyPolicyId: normalized.apiKeyPolicyId,
    ...(normalized.requestBuilderId !== undefined
      ? { requestBuilderId: normalized.requestBuilderId }
      : {}),
    expiresAt: normalized.expiresAt,
    typedConfirmation: typedConfirmationAccepted
      ? normalized.typedConfirmation
      : "[blocked-confirmation]",
    receiptHash,
    typedConfirmationAccepted,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readinessFor(status),
    nextAction: nextActionFor(status),
    summaryOnly: true,
    source: SOURCE
  };
}

export function validateAppLiveProposalSessionReceipt(
  input: AppLiveProposalSessionReceiptInput = {}
): AppLiveProposalSessionValidationResult {
  const receipt = buildAppLiveProposalSessionReceipt(input);
  return {
    ok: receipt.status !== "blocked",
    status: receipt.status,
    findings: receipt.findings,
    blockerCount: receipt.blockerCount,
    warningCount: receipt.warningCount,
    findingCount: receipt.findingCount,
    readiness: receipt.readiness
  };
}

export function summarizeAppLiveProposalSessionReceipt(
  receipt: AppLiveProposalSessionReceipt
): string {
  return [
    `status:${receipt.status}`,
    `receipt:${receipt.receiptId}`,
    `provider:${receipt.providerId}`,
    `model:${receipt.modelProfileId}`,
    `paths:${receipt.allowedPathRefs.length}`,
    `context_refs:${receipt.contextRefHashes.length}`,
    `confirmation:${receipt.typedConfirmationAccepted ? "accepted" : "blocked"}`,
    `blockers:${receipt.blockerCount}`,
    `warnings:${receipt.warningCount}`,
    `hash:${receipt.receiptHash.slice(0, 12)}`,
    "summary_only:true",
    "app_execution:false"
  ].join(" | ");
}

function normalizeInput(
  input: AppLiveProposalSessionReceiptInput
): NormalizedSessionInput {
  const createdAt = safeString(input.createdAt, DEFAULT_CREATED_AT);
  const base = {
    kind: "live_proposal_generation" as const,
    providerId: "deepseek" as const,
    modelProfileId: safeDisplayRef(input.modelProfileId, "unknown-model"),
    objectiveSummaryHash: safeHashRef(
      input.objectiveSummaryHash,
      "missing-objective"
    ),
    allowedPathRefs: normalizePathRefs(input.allowedPathRefs),
    contextRefHashes: normalizeHashRefs(input.contextRefHashes),
    apiKeyPolicyId: safeDisplayRef(input.apiKeyPolicyId, "missing-policy"),
    requestBuilderId: safeOptionalDisplayRef(input.requestBuilderId),
    expiresAt: safeString(input.expiresAt, ""),
    typedConfirmation: safeString(input.typedConfirmation, ""),
    createdAt
  };
  const fallbackReceiptId = `app-live-proposal-session-${stablePreviewHash(
    stableStringify(base)
  ).slice(0, 12)}`;
  return {
    receiptId: safeDisplayRef(
      input.receiptId,
      input.idGenerator?.() ?? fallbackReceiptId
    ),
    ...base
  };
}

function validateNormalizedInput(
  original: unknown,
  input: NormalizedSessionInput
): AppLiveProposalSessionFinding[] {
  const findings: AppLiveProposalSessionFinding[] = [];
  findings.push(...scanForbiddenInput(original));

  const originalRecord = isRecord(original) ? original : {};
  if (originalRecord.kind !== undefined && originalRecord.kind !== input.kind) {
    add(findings, "input", "blocker", "APP_LIVE_SESSION_KIND_INVALID");
  }
  if (
    originalRecord.providerId === undefined ||
    originalRecord.providerId === ""
  ) {
    add(findings, "provider", "blocker", "APP_LIVE_SESSION_PROVIDER_MISSING");
  } else if (originalRecord.providerId !== "deepseek") {
    add(findings, "provider", "blocker", "APP_LIVE_SESSION_PROVIDER_INVALID");
  }
  if (!hasUsableValue(originalRecord.modelProfileId)) {
    add(
      findings,
      "model_profile",
      "blocker",
      "APP_LIVE_SESSION_MODEL_PROFILE_MISSING"
    );
  }
  if (!isSafeModelProfile(input.modelProfileId)) {
    add(
      findings,
      "model_profile",
      "blocker",
      "APP_LIVE_SESSION_MODEL_PROFILE_UNSAFE"
    );
  }
  if (!hasUsableValue(originalRecord.objectiveSummaryHash)) {
    add(
      findings,
      "objective",
      "blocker",
      "APP_LIVE_SESSION_OBJECTIVE_HASH_MISSING"
    );
  }
  if (!hasUsableValue(originalRecord.apiKeyPolicyId)) {
    add(findings, "policy", "blocker", "APP_LIVE_SESSION_POLICY_MISSING");
  }

  if (input.typedConfirmation !== APP_LIVE_PROPOSAL_CONFIRMATION) {
    add(
      findings,
      "confirmation",
      "blocker",
      "APP_LIVE_SESSION_CONFIRMATION_MISMATCH"
    );
  }

  if (!input.expiresAt || !isValidIsoDate(input.expiresAt)) {
    add(findings, "expiry", "blocker", "APP_LIVE_SESSION_EXPIRY_INVALID");
  } else if (Date.parse(input.expiresAt) <= Date.parse(input.createdAt)) {
    add(findings, "expiry", "blocker", "APP_LIVE_SESSION_EXPIRED");
  }

  if (input.allowedPathRefs.length === 0) {
    add(findings, "path", "blocker", "APP_LIVE_SESSION_PATHS_MISSING");
  }
  const uniquePaths = new Set(input.allowedPathRefs);
  if (uniquePaths.size !== input.allowedPathRefs.length) {
    add(findings, "path", "blocker", "APP_LIVE_SESSION_DUPLICATE_PATH");
  }
  for (const pathRef of input.allowedPathRefs) {
    const pathCode = unsafeRelativePathCode(pathRef);
    if (pathCode !== undefined) {
      add(findings, "path", "blocker", pathCode);
    }
  }

  if (input.contextRefHashes.length === 0) {
    add(findings, "context", "warning", "APP_LIVE_SESSION_CONTEXT_REFS_EMPTY");
  }
  if (input.requestBuilderId === undefined) {
    add(
      findings,
      "request_builder",
      "warning",
      "APP_LIVE_SESSION_REQUEST_BUILDER_REF_MISSING"
    );
  }

  return dedupeFindings(findings);
}

function scanForbiddenInput(value: unknown): AppLiveProposalSessionFinding[] {
  const findings: AppLiveProposalSessionFinding[] = [];
  visitUnknown(value, (node, path) => {
    if (isRecord(node)) {
      for (const [key, nested] of Object.entries(node)) {
        const normalizedKey = normalizeFieldName(key);
        if (forbiddenFieldNames.has(normalizedKey)) {
          add(
            findings,
            "forbidden_field",
            "blocker",
            "APP_LIVE_SESSION_FORBIDDEN_FIELD",
            [...path, key].join(".")
          );
        }
        if (executionReadinessFields.has(normalizedKey) && nested === true) {
          add(
            findings,
            "readiness",
            "blocker",
            "APP_LIVE_SESSION_EXECUTION_READINESS_TRUE",
            [...path, key].join(".")
          );
        }
      }
    }
    if (typeof node === "string") {
      for (const code of unsafeMarkerCodes(node)) {
        add(findings, "secret_marker", "blocker", code);
      }
    }
  });
  return dedupeFindings(findings);
}

function add(
  findings: AppLiveProposalSessionFinding[],
  kind: AppLiveProposalSessionFindingKind,
  severity: AppLiveProposalSessionSeverity,
  code: string,
  relatedRef?: string | undefined
): void {
  findings.push({
    findingId: `${code.toLowerCase()}-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage: summaryFor(code),
    ...(relatedRef !== undefined ? { relatedRef } : {})
  });
}

function summaryFor(code: string): string {
  const summaries: Record<string, string> = {
    APP_LIVE_SESSION_KIND_INVALID:
      "Session receipt kind must be live_proposal_generation.",
    APP_LIVE_SESSION_PROVIDER_MISSING: "Provider id is required.",
    APP_LIVE_SESSION_PROVIDER_INVALID:
      "Only the deepseek provider is supported.",
    APP_LIVE_SESSION_MODEL_PROFILE_MISSING: "Model profile id is required.",
    APP_LIVE_SESSION_MODEL_PROFILE_UNSAFE:
      "Model profile id must be a safe display ref.",
    APP_LIVE_SESSION_OBJECTIVE_HASH_MISSING:
      "Objective summary hash is required.",
    APP_LIVE_SESSION_POLICY_MISSING: "API key policy id is required.",
    APP_LIVE_SESSION_CONFIRMATION_MISMATCH:
      "Typed confirmation must exactly match the live proposal phrase.",
    APP_LIVE_SESSION_EXPIRY_INVALID:
      "Session receipt expiry is missing or invalid.",
    APP_LIVE_SESSION_EXPIRED: "Session receipt is expired.",
    APP_LIVE_SESSION_PATHS_MISSING:
      "At least one allowed path ref is required.",
    APP_LIVE_SESSION_DUPLICATE_PATH: "Allowed path refs must be unique.",
    APP_LIVE_SESSION_UNSAFE_PATH:
      "Allowed path ref is outside safe relative workspace policy.",
    APP_LIVE_SESSION_BLOCKED_PATH:
      "Allowed path ref points to a blocked workspace location.",
    APP_LIVE_SESSION_SECRET_PATH:
      "Allowed path ref looks secret-like and must fail closed.",
    APP_LIVE_SESSION_CONTEXT_REFS_EMPTY:
      "No context refs were attached to the receipt.",
    APP_LIVE_SESSION_REQUEST_BUILDER_REF_MISSING:
      "Request builder ref is missing; future command integration should bind it.",
    APP_LIVE_SESSION_FORBIDDEN_FIELD:
      "Receipt input contains a forbidden raw, secret, execution, or tool field.",
    APP_LIVE_SESSION_EXECUTION_READINESS_TRUE:
      "Receipt input attempted to enable execution readiness.",
    API_KEY_MARKER: "Receipt input contains an API-key-like marker.",
    BEARER_TOKEN_MARKER: "Receipt input contains a bearer-token-like marker.",
    AUTHORIZATION_HEADER_MARKER:
      "Receipt input contains an authorization-header-like marker.",
    PRIVATE_KEY_MARKER: "Receipt input contains a private-key-like marker.",
    RAW_PROMPT_MARKER: "Receipt input contains a raw prompt marker.",
    RAW_RESPONSE_MARKER: "Receipt input contains a raw response marker.",
    RAW_DIFF_MARKER: "Receipt input contains a raw diff marker.",
    REASONING_CONTENT_MARKER:
      "Receipt input contains a reasoning_content marker."
  };
  return summaries[code] ?? "Live proposal session receipt finding.";
}

function readinessFor(
  status: AppLiveProposalSessionStatus
): AppLiveProposalSessionReadiness {
  return {
    canProceedToLiveProposalCommand: status !== "blocked",
    canReadApiKey: false,
    canCallLiveModel: false,
    canFetchNetwork: false,
    canSendLiveRequest: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function nextActionFor(status: AppLiveProposalSessionStatus): string {
  switch (status) {
    case "ready":
      return "Session receipt is ready for a future App live proposal command. It does not call DeepSeek or authorize execution.";
    case "warning":
      return "Review receipt warnings before future command integration. No live call is made.";
    case "blocked":
    default:
      return "Fix receipt blockers before any future live proposal command. No live call is made.";
  }
}

function normalizedForHash(input: NormalizedSessionInput): object {
  return {
    receiptId: input.receiptId,
    kind: input.kind,
    providerId: input.providerId,
    modelProfileId: input.modelProfileId,
    objectiveSummaryHash: input.objectiveSummaryHash,
    allowedPathRefs: input.allowedPathRefs,
    contextRefHashes: input.contextRefHashes,
    apiKeyPolicyId: input.apiKeyPolicyId,
    requestBuilderId: input.requestBuilderId,
    expiresAt: input.expiresAt,
    typedConfirmationAccepted:
      input.typedConfirmation === APP_LIVE_PROPOSAL_CONFIRMATION,
    createdAt: input.createdAt
  };
}

function normalizePathRefs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) =>
      unsafeMarkerCodes(item).length > 0
        ? `unsafe-path-ref:${stablePreviewHash(item).slice(0, 12)}`
        : item.slice(0, 160)
    )
    .slice(0, 50);
}

function normalizeHashRefs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => safeHashRef(item, "invalid-ref"))
    .filter((item) => item.length > 0)
    .slice(0, 50);
}

function safeHashRef(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }
  const trimmed = value.trim();
  if (unsafeMarkerCodes(trimmed).length > 0) {
    return `unsafe-ref:${stablePreviewHash(trimmed).slice(0, 12)}`;
  }
  return trimmed.slice(0, 96);
}

function safeDisplayRef(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }
  const trimmed = value.trim();
  if (unsafeMarkerCodes(trimmed).length > 0) {
    return `unsafe-ref:${stablePreviewHash(trimmed).slice(0, 12)}`;
  }
  return trimmed.slice(0, 120);
}

function safeOptionalDisplayRef(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return safeDisplayRef(value, "invalid-ref");
}

function unsafeRelativePathCode(pathRef: string): string | undefined {
  const value = pathRef.trim();
  if (!value) {
    return "APP_LIVE_SESSION_UNSAFE_PATH";
  }
  if (
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.startsWith("//") ||
    value.startsWith("\\\\") ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
    /[\0\r\n]/.test(value)
  ) {
    return "APP_LIVE_SESSION_UNSAFE_PATH";
  }
  const normalized = value.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    return "APP_LIVE_SESSION_UNSAFE_PATH";
  }
  const lowerSegments = segments.map((segment) => segment.toLowerCase());
  if (
    lowerSegments.some((segment) =>
      [".git", ".env", "node_modules", "dist", "target", ".tmp"].includes(
        segment
      )
    )
  ) {
    return "APP_LIVE_SESSION_BLOCKED_PATH";
  }
  if (
    /(^|[/._-])(secret|token|password|credential|api[-_]?key)([/._-]|$)/i.test(
      normalized
    )
  ) {
    return "APP_LIVE_SESSION_SECRET_PATH";
  }
  return undefined;
}

function isSafeModelProfile(value: string): boolean {
  return /^[A-Za-z0-9._:/-]{1,120}$/.test(value);
}

function isValidIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function hasUsableValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function safeString(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function unsafeMarkerCodes(value: string): string[] {
  const codes = unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(value))
    .map(({ code }) => code);
  if (looksLikeLongToken(value)) {
    codes.push("API_KEY_MARKER");
  }
  return Array.from(new Set(codes));
}

function looksLikeLongToken(value: string): boolean {
  return (
    /^[A-Za-z0-9_./+=-]{40,}$/.test(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}

function visitUnknown(
  value: unknown,
  visitor: (value: unknown, path: string[]) => void,
  path: string[] = [],
  seen = new Set<unknown>()
): void {
  visitor(value, path);
  if (typeof value !== "object" || value === null) {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      visitUnknown(item, visitor, [...path, String(index)], seen);
    });
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    visitUnknown(nested, visitor, [...path, key], seen);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFieldName(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function countSeverity(
  findings: AppLiveProposalSessionFinding[],
  severity: AppLiveProposalSessionSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function dedupeFindings(
  findings: AppLiveProposalSessionFinding[]
): AppLiveProposalSessionFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.kind}:${finding.severity}:${finding.code}:${finding.relatedRef ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, nested]) => nested !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
    .join(",")}}`;
}
