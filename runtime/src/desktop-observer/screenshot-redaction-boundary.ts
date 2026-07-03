import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ScreenshotMetadataBoundaryInput = Record<string, unknown> | unknown;

export type ScreenshotMetadataBoundaryStatus =
  | "empty"
  | "boundary_ready"
  | "warning"
  | "blocked";

export type ScreenshotRedactionSeverity = "blocker" | "warning";

export type ScreenshotRedactionFinding = {
  findingId: string;
  severity: ScreenshotRedactionSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ScreenshotMetadataBoundaryReadiness = {
  canUseScreenshotMetadata: boolean;
  canPersistRawScreenshot: false;
  canPersistRawOcrText: false;
  canSendToModel: false;
  canCaptureRawScreenshot: false;
  canDesktopAction: false;
  canClickTypeSelect: false;
  canWriteClipboard: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ScreenshotMetadataBoundary = {
  status: ScreenshotMetadataBoundaryStatus;
  boundaryId?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  displayCount: number;
  pixelCountEstimate?: number | undefined;
  hashPrefix?: string | undefined;
  captureMode: "metadata_only";
  rawPersisted: false;
  ocrPersisted: false;
  modelSent: false;
  redactionCodes: string[];
  findings: ScreenshotRedactionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  boundaryHash?: string | undefined;
  readiness: ScreenshotMetadataBoundaryReadiness;
  nextAction: string;
  source: "runtime_screenshot_redaction_boundary";
};

export type ScreenshotMetadataBoundarySummary = {
  status: ScreenshotMetadataBoundaryStatus;
  boundaryId?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  displayCount: number;
  pixelCountEstimate?: number | undefined;
  hashPrefix?: string | undefined;
  captureMode: "metadata_only";
  rawPersisted: false;
  ocrPersisted: false;
  modelSent: false;
  redactionCodes: string[];
  warningCodes: string[];
  blockerCodes: string[];
  boundaryHash?: string | undefined;
  summaryOnly: true;
};

type IdGenerator = () => string;

const forbiddenFieldKeys = new Set(
  [
    ["raw", "Screenshot"].join(""),
    "screenshotBytes",
    "screenshotBase64",
    "imageBase64",
    "base64Image",
    "pixelBuffer",
    "bytes",
    "rawScreenshotPath",
    "screenshotPath",
    ["raw", "Ocr"].join(""),
    ["raw", "OcrText"].join(""),
    "ocrText",
    ["raw", "Dom"].join(""),
    ["raw", "Csv"].join(""),
    ["raw", "Prompt"].join(""),
    "promptText",
    ["raw", "Response"].join(""),
    "responseText",
    ["raw", "Source"].join(""),
    ["raw", "Diff"].join(""),
    ["raw", "Patch"].join(""),
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "env",
    "clipboard",
    "clipboardText",
    "command",
    ["shell", "Command"].join(""),
    ["git", "Command"].join(""),
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge",
    "click",
    "type",
    "select",
    "tools",
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "rawPersisted",
    "rawScreenshotPersisted",
    "ocrPersisted",
    "rawOcrTextPersisted",
    "modelSent",
    "sendToModel",
    "canPersistRawScreenshot",
    "canPersistRawOcrText",
    "canSendToModel",
    "canCaptureRawScreenshot",
    "canDesktopAction",
    "canClickTypeSelect",
    "canWriteClipboard",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute"
  ].map((key) => key.toLowerCase())
);

const secretMarkers = [
  "sk-",
  "Bearer ",
  "Authorization",
  "BEGIN PRIVATE KEY",
  "PASSWORD_VALUE_MARKER",
  "DEEPSEEK_API_KEY",
  "OPENAI_API_KEY"
];

const rawMarkers = [
  "raw screenshot",
  "raw ocr",
  "raw prompt",
  "raw response",
  "raw source",
  "raw diff",
  "raw dom",
  "raw csv",
  "data:image",
  "base64,"
];

export function buildScreenshotMetadataBoundary(
  input: ScreenshotMetadataBoundaryInput
): ScreenshotMetadataBoundary {
  const record = unwrapMetadataRecord(input);
  const idGenerator = readIdGenerator(input);
  const findings: ScreenshotRedactionFinding[] = [];
  const addFinding = (
    severity: ScreenshotRedactionSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ) => {
    findings.push({
      findingId: `screenshot-redaction-${code}-${findings.length + 1}`,
      severity,
      code,
      safeMessage,
      ...(path ? { path } : {})
    });
  };

  if (!record) {
    addFinding(
      "warning",
      "metadata_missing",
      "Screenshot metadata boundary has no metadata to summarize."
    );
  } else {
    scanUnsafeFields(record, addFinding);
  }

  const captureMode = readString(record?.captureMode) ?? "metadata_only";
  if (captureMode !== "metadata_only") {
    addFinding(
      "blocker",
      "capture_mode_not_metadata_only",
      "Screenshot boundary only permits metadata_only capture mode.",
      "$.captureMode"
    );
  }
  if (
    record?.rawPersisted === true ||
    record?.rawScreenshotPersisted === true
  ) {
    addFinding(
      "blocker",
      "raw_screenshot_persisted",
      "Screenshot boundary cannot persist raw screenshots by default.",
      "$.rawPersisted"
    );
  }
  if (record?.ocrPersisted === true || record?.rawOcrTextPersisted === true) {
    addFinding(
      "blocker",
      "raw_ocr_persisted",
      "Screenshot boundary cannot persist raw OCR text by default.",
      "$.ocrPersisted"
    );
  }
  if (record?.modelSent === true || record?.sendToModel === true) {
    addFinding(
      "blocker",
      "model_sent",
      "Screenshot boundary cannot send desktop observations to a model automatically.",
      "$.modelSent"
    );
  }

  const width = readNumber(record?.width);
  const height = readNumber(record?.height);
  const displayCount = readInteger(record?.displayCount) ?? 0;
  if (record && (width === undefined || height === undefined)) {
    addFinding(
      "warning",
      "dimensions_missing",
      "Screenshot metadata boundary is missing width or height."
    );
  }
  if (record && displayCount <= 0) {
    addFinding(
      "warning",
      "display_count_missing",
      "Screenshot metadata boundary is missing display count."
    );
  }

  const pixelCountEstimate =
    width !== undefined && height !== undefined && displayCount > 0
      ? width * height * displayCount
      : readNumber(record?.pixelCountEstimate);
  const hashPrefix = normalizeHashPrefix(readString(record?.hashPrefix));
  if (record?.hashPrefix !== undefined && hashPrefix === undefined) {
    addFinding(
      "blocker",
      "unsafe_hash_prefix",
      "Screenshot metadata hash prefix is not safe summary text.",
      "$.hashPrefix"
    );
  }

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status = determineStatus(Boolean(record), blockerCount, warningCount);
  const redactionCodes = unique(readStringArray(record?.redactionCodes));
  const boundaryId =
    blockerCount === 0 && record
      ? readString(record.boundaryId) ||
        idGenerator?.() ||
        `screenshot-boundary-${stablePreviewHash(
          stableStringify({
            width,
            height,
            displayCount,
            pixelCountEstimate,
            hashPrefix,
            redactionCodes
          })
        ).slice(0, 12)}`
      : undefined;
  const boundaryWithoutHash = {
    status,
    boundaryId,
    width: blockerCount === 0 ? width : undefined,
    height: blockerCount === 0 ? height : undefined,
    displayCount: blockerCount === 0 ? displayCount : 0,
    pixelCountEstimate: blockerCount === 0 ? pixelCountEstimate : undefined,
    hashPrefix: blockerCount === 0 ? hashPrefix : undefined,
    captureMode: "metadata_only" as const,
    rawPersisted: false as const,
    ocrPersisted: false as const,
    modelSent: false as const,
    redactionCodes: blockerCount === 0 ? redactionCodes : []
  };
  const boundaryHash =
    blockerCount === 0 && record
      ? stablePreviewHash(stableStringify(boundaryWithoutHash))
      : undefined;

  return {
    ...boundaryWithoutHash,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    boundaryHash,
    readiness: buildReadiness(status),
    nextAction: nextActionFor(status),
    source: "runtime_screenshot_redaction_boundary"
  };
}

export function summarizeScreenshotMetadataBoundary(
  boundary: ScreenshotMetadataBoundary
): ScreenshotMetadataBoundarySummary {
  return {
    status: boundary.status,
    boundaryId: boundary.boundaryId,
    width: boundary.width,
    height: boundary.height,
    displayCount: boundary.displayCount,
    pixelCountEstimate: boundary.pixelCountEstimate,
    hashPrefix: boundary.hashPrefix,
    captureMode: "metadata_only",
    rawPersisted: false,
    ocrPersisted: false,
    modelSent: false,
    redactionCodes: boundary.redactionCodes,
    warningCodes: boundary.findings
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.code),
    blockerCodes: boundary.findings
      .filter((finding) => finding.severity === "blocker")
      .map((finding) => finding.code),
    boundaryHash: boundary.boundaryHash,
    summaryOnly: true
  };
}

function unwrapMetadataRecord(
  input: ScreenshotMetadataBoundaryInput
): Record<string, unknown> | undefined {
  if (!isRecord(input)) {
    return undefined;
  }
  if (isRecord(input.screenshotMetadata)) {
    return {
      ...input.screenshotMetadata,
      displayCount: input.displayCount ?? input.screenshotMetadata.displayCount
    };
  }
  return input;
}

function scanUnsafeFields(
  value: unknown,
  addFinding: (
    severity: ScreenshotRedactionSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ) => void,
  path = "$"
): void {
  if (typeof value === "string") {
    if (secretMarkers.some((marker) => value.includes(marker))) {
      addFinding(
        "blocker",
        "secret_marker_detected",
        "Screenshot metadata boundary input contains a secret-like marker.",
        path
      );
    }
    if (rawMarkers.some((marker) => value.toLowerCase().includes(marker))) {
      addFinding(
        "blocker",
        "raw_marker_detected",
        "Screenshot metadata boundary input contains raw-content marker text.",
        path
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeFields(item, addFinding, `${path}[${index}]`)
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const childPath = `${path}.${key}`;
    if (forbiddenFieldKeys.has(normalizedKey)) {
      addFinding(
        "blocker",
        "forbidden_field",
        "Screenshot metadata boundary input contains a forbidden raw or execution field.",
        childPath
      );
    }
    if (executionBooleanKeys.has(normalizedKey) && child === true) {
      addFinding(
        "blocker",
        "execution_field_true",
        "Screenshot metadata boundary input cannot enable persistence, model send, or action.",
        childPath
      );
    }
    scanUnsafeFields(child, addFinding, childPath);
  }
}

function determineStatus(
  hasRecord: boolean,
  blockerCount: number,
  warningCount: number
): ScreenshotMetadataBoundaryStatus {
  if (!hasRecord) {
    return "empty";
  }
  if (blockerCount > 0) {
    return "blocked";
  }
  if (warningCount > 0) {
    return "warning";
  }
  return "boundary_ready";
}

function buildReadiness(
  status: ScreenshotMetadataBoundaryStatus
): ScreenshotMetadataBoundaryReadiness {
  return {
    canUseScreenshotMetadata:
      status === "boundary_ready" || status === "warning",
    canPersistRawScreenshot: false,
    canPersistRawOcrText: false,
    canSendToModel: false,
    canCaptureRawScreenshot: false,
    canDesktopAction: false,
    canClickTypeSelect: false,
    canWriteClipboard: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionFor(status: ScreenshotMetadataBoundaryStatus): string {
  if (status === "blocked") {
    return "Reject this screenshot boundary until raw screenshot, OCR, secret, model-send, and action blockers are removed.";
  }
  if (status === "empty") {
    return "Provide summary-only screenshot metadata before using the boundary.";
  }
  if (status === "warning") {
    return "Review screenshot metadata warnings before attaching this boundary to desktop observation evidence.";
  }
  return "Screenshot metadata boundary is summary-only; no raw screenshot persistence, OCR persistence, model send, or desktop action is enabled.";
}

function normalizeHashPrefix(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > 64 ||
    /[^a-zA-Z0-9_-]/.test(trimmed) ||
    secretMarkers.some((marker) => trimmed.includes(marker))
  ) {
    return undefined;
  }
  return trimmed;
}

function readIdGenerator(value: unknown): IdGenerator | undefined {
  return isRecord(value) && typeof value.idGenerator === "function"
    ? (value.idGenerator as IdGenerator)
    : undefined;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function readInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
