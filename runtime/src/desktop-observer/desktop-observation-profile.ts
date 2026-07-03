import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopObservationProfileInput = Record<string, unknown> | unknown;

export type DesktopObservationMode =
  | "disabled"
  | "metadata_only"
  | "screenshot_metadata_only";

export type DesktopObservationScope = {
  includeForegroundWindow: boolean;
  includeWindowList: boolean;
  includeDisplayMetadata: boolean;
  includeScreenshotMetadata: boolean;
};

export type DesktopObservationCapturePolicy = {
  allowDesktopAction: false;
  allowClickTypeSelect: false;
  allowClipboardWrite: false;
  allowClipboardReadByDefault: false;
  allowFileDialogAutomation: false;
  allowHiddenBackgroundCapture: false;
  allowScreenRecording: false;
  allowRawScreenshotPersistence: false;
  allowRawOcrTextPersistence: false;
  sendToModel: false;
};

export type DesktopObservationRedactionPolicy = {
  enabled: boolean;
  redactWindowTitles: boolean;
  redactProcessNames: boolean;
  redactSecretMarkers: true;
  summaryOnly: true;
};

export type DesktopObservationProfileStatus =
  | "disabled"
  | "profile_ready"
  | "warning"
  | "blocked";

export type DesktopObservationFindingKind =
  | "schema"
  | "capture_policy"
  | "redaction_policy"
  | "privacy"
  | "limit"
  | "raw_field"
  | "secret"
  | "readiness";

export type DesktopObservationSeverity = "blocker" | "warning";

export type DesktopObservationFinding = {
  findingId: string;
  kind: DesktopObservationFindingKind;
  severity: DesktopObservationSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopObservationReadiness = {
  canUseForDesktopObservation: boolean;
  canCaptureScreenshotMetadata: boolean;
  canCaptureRawScreenshot: false;
  canPersistRawScreenshot: false;
  canPersistRawOcrText: false;
  canReadClipboardByDefault: false;
  canWriteClipboard: false;
  canDesktopAction: false;
  canClickTypeSelect: false;
  canFileDialogAutomation: false;
  canHiddenBackgroundCapture: false;
  canScreenRecord: false;
  canSendToModel: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type DesktopObservationProfile = {
  schemaVersion: "desktop_observation_profile.v1";
  profileId: string;
  displayName: string;
  observationMode: DesktopObservationMode;
  scope: DesktopObservationScope;
  capturePolicy: DesktopObservationCapturePolicy;
  redactionPolicy: DesktopObservationRedactionPolicy;
  maxWindowCount: number;
  maxDisplayCount: number;
  includeWindowTitles: boolean;
  includeProcessNames: boolean;
  includeDisplayMetadata: boolean;
  includeScreenshotMetadata: boolean;
  createdAt?: string | undefined;
  profileHash: string;
  source: "runtime_desktop_observation_profile";
};

export type DesktopObservationProfileSummary = {
  profileId?: string | undefined;
  status: DesktopObservationProfileStatus;
  displayName?: string | undefined;
  observationMode?: DesktopObservationMode | undefined;
  includeWindowTitles: boolean;
  includeProcessNames: boolean;
  includeDisplayMetadata: boolean;
  includeScreenshotMetadata: boolean;
  maxWindowCount: number;
  maxDisplayCount: number;
  warningCodes: string[];
  blockerCodes: string[];
  profileHash?: string | undefined;
  summaryOnly: true;
};

export type DesktopObservationProfileValidationResult = {
  status: DesktopObservationProfileStatus;
  profile?: DesktopObservationProfile | undefined;
  summary: DesktopObservationProfileSummary;
  findings: DesktopObservationFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  profileHash?: string | undefined;
  readiness: DesktopObservationReadiness;
  nextAction: string;
  source: "runtime_desktop_observation_profile";
};

type IdGenerator = () => string;

const allowedModes = new Set<DesktopObservationMode>([
  "disabled",
  "metadata_only",
  "screenshot_metadata_only"
]);

const forbiddenFieldKeys = new Set(
  [
    "rawPrompt",
    "promptText",
    "rawResponse",
    "responseText",
    "reasoningContent",
    "reasoning_content",
    "rawSource",
    "rawDiff",
    "rawPatch",
    "rawDom",
    "rawCsv",
    "rawScreenshot",
    "screenshotBytes",
    "screenshotBase64",
    "pixelBuffer",
    "rawOcr",
    "rawOcrText",
    "ocrText",
    "clipboard",
    "clipboardText",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "env",
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
    "click",
    "type",
    "select"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "allowDesktopAction",
    "allowClickTypeSelect",
    "allowClipboardWrite",
    "allowClipboardRead",
    "allowClipboardReadByDefault",
    "allowFileDialogAutomation",
    "allowHiddenBackgroundCapture",
    "allowScreenRecording",
    "allowRawScreenshotPersistence",
    "allowRawOcrTextPersistence",
    "sendToModel",
    "canDesktopAction",
    "canClickTypeSelect",
    "canWriteClipboard",
    "canReadClipboardByDefault",
    "canPersistRawScreenshot",
    "canPersistRawOcrText",
    "canSendToModel",
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
  "raw prompt",
  "raw response",
  "raw source",
  "raw diff",
  "raw screenshot",
  "reasoning_content",
  "screenshotBase64"
];

export function buildDesktopObservationProfile(
  input: DesktopObservationProfileInput
): DesktopObservationProfileValidationResult {
  const record = isRecord(input) ? input : {};
  const idGenerator = readIdGenerator(record.idGenerator);
  const findings: DesktopObservationFinding[] = [];

  const addFinding = (
    kind: DesktopObservationFindingKind,
    severity: DesktopObservationSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ): void => {
    findings.push({
      findingId: `desktop-observation-profile-finding-${findings.length + 1}`,
      kind,
      severity,
      code,
      safeMessage,
      path
    });
  };

  if (!isRecord(input)) {
    addFinding(
      "schema",
      "blocker",
      "input_not_object",
      "Desktop observation profile input must be an object."
    );
  }

  scanUnsafeFields(input, addFinding);

  const displayName = readString(record.displayName);
  if (!displayName) {
    addFinding(
      "schema",
      "blocker",
      "missing_display_name",
      "Desktop observation profile requires a displayName."
    );
  }

  const mode = readString(record.observationMode);
  const observationMode = allowedModes.has(mode as DesktopObservationMode)
    ? (mode as DesktopObservationMode)
    : undefined;
  if (!observationMode) {
    addFinding(
      "schema",
      "blocker",
      "unknown_observation_mode",
      "Desktop observation profile mode is missing or unsupported."
    );
  }

  const includeWindowTitles = readBoolean(record.includeWindowTitles, false);
  const includeProcessNames = readBoolean(record.includeProcessNames, false);
  const includeDisplayMetadata = readBoolean(
    record.includeDisplayMetadata,
    true
  );
  const includeScreenshotMetadata = readBoolean(
    record.includeScreenshotMetadata,
    observationMode === "screenshot_metadata_only"
  );
  const maxWindowCount = readBoundedInteger(record.maxWindowCount, 5);
  const maxDisplayCount = readBoundedInteger(record.maxDisplayCount, 2);

  if (maxWindowCount < 0 || maxWindowCount > 20) {
    addFinding(
      "limit",
      "blocker",
      "max_window_count_out_of_range",
      "Desktop observation profile maxWindowCount must be between 0 and 20."
    );
  } else if (maxWindowCount > 10) {
    addFinding(
      "limit",
      "warning",
      "max_window_count_high",
      "Desktop observation profile includes a high window count limit."
    );
  }

  if (maxDisplayCount < 0 || maxDisplayCount > 8) {
    addFinding(
      "limit",
      "blocker",
      "max_display_count_out_of_range",
      "Desktop observation profile maxDisplayCount must be between 0 and 8."
    );
  } else if (maxDisplayCount > 4) {
    addFinding(
      "limit",
      "warning",
      "max_display_count_high",
      "Desktop observation profile includes a high display count limit."
    );
  }

  if (includeWindowTitles) {
    addFinding(
      "privacy",
      "warning",
      "window_titles_included",
      "Window titles may contain private user context and require redaction."
    );
  }

  if (includeProcessNames) {
    addFinding(
      "privacy",
      "warning",
      "process_names_included",
      "Process names may reveal private app context and require redaction."
    );
  }

  if (observationMode === "screenshot_metadata_only") {
    addFinding(
      "privacy",
      "warning",
      "screenshot_metadata_mode",
      "Screenshot metadata mode remains metadata-only and cannot persist raw screenshots."
    );
  }

  const redactionRecord = isRecord(record.redactionPolicy)
    ? record.redactionPolicy
    : undefined;
  if (!redactionRecord) {
    addFinding(
      "redaction_policy",
      "warning",
      "redaction_policy_missing",
      "Desktop observation profile should include an explicit redaction policy."
    );
  }

  const captureRecord = isRecord(record.capturePolicy)
    ? record.capturePolicy
    : {};
  const scopeRecord = isRecord(record.scope) ? record.scope : {};

  blockTrueFlag(
    captureRecord,
    "allowDesktopAction",
    "desktop_action_allowed",
    "Desktop observation profile cannot allow desktop action.",
    addFinding
  );
  blockTrueFlag(
    captureRecord,
    "allowClickTypeSelect",
    "click_type_select_allowed",
    "Desktop observation profile cannot allow click/type/select.",
    addFinding
  );
  blockTrueFlag(
    captureRecord,
    "allowClipboardWrite",
    "clipboard_write_allowed",
    "Desktop observation profile cannot allow clipboard write.",
    addFinding
  );
  blockTrueFlag(
    captureRecord,
    "allowClipboardReadByDefault",
    "clipboard_read_default_allowed",
    "Desktop observation profile cannot allow default clipboard read.",
    addFinding
  );
  blockTrueFlag(
    captureRecord,
    "allowFileDialogAutomation",
    "file_dialog_automation_allowed",
    "Desktop observation profile cannot allow file dialog automation.",
    addFinding
  );
  blockTrueFlag(
    captureRecord,
    "allowHiddenBackgroundCapture",
    "hidden_background_capture_allowed",
    "Desktop observation profile cannot allow hidden background capture.",
    addFinding
  );
  blockTrueFlag(
    captureRecord,
    "allowScreenRecording",
    "screen_recording_allowed",
    "Desktop observation profile cannot allow screen recording.",
    addFinding
  );
  blockTrueFlag(
    captureRecord,
    "allowRawScreenshotPersistence",
    "raw_screenshot_persistence_allowed",
    "Desktop observation profile cannot allow raw screenshot persistence.",
    addFinding
  );
  blockTrueFlag(
    captureRecord,
    "allowRawOcrTextPersistence",
    "raw_ocr_persistence_allowed",
    "Desktop observation profile cannot allow raw OCR text persistence.",
    addFinding
  );
  blockTrueFlag(
    captureRecord,
    "sendToModel",
    "send_to_model_allowed",
    "Desktop observation profile cannot send desktop observation to a model.",
    addFinding
  );

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;

  const profile =
    blockerCount === 0 && displayName && observationMode
      ? normalizeProfile({
          record,
          displayName,
          observationMode,
          includeWindowTitles,
          includeProcessNames,
          includeDisplayMetadata,
          includeScreenshotMetadata,
          maxWindowCount,
          maxDisplayCount,
          captureRecord,
          scopeRecord,
          redactionRecord,
          idGenerator
        })
      : undefined;

  const status = determineStatus(observationMode, blockerCount, warningCount);
  const profileHash = profile?.profileHash;
  const readiness = buildReadiness(status, profile);
  const summary = buildSummary({
    status,
    profile,
    displayName,
    observationMode,
    includeWindowTitles,
    includeProcessNames,
    includeDisplayMetadata,
    includeScreenshotMetadata,
    maxWindowCount,
    maxDisplayCount,
    findings
  });

  return {
    status,
    profile,
    summary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    profileHash,
    readiness,
    nextAction: nextActionFor(status),
    source: "runtime_desktop_observation_profile"
  };
}

export function validateDesktopObservationProfileInput(
  input: DesktopObservationProfileInput
): DesktopObservationProfileValidationResult {
  return buildDesktopObservationProfile(input);
}

export function summarizeDesktopObservationProfile(
  profileOrResult:
    | DesktopObservationProfile
    | DesktopObservationProfileValidationResult
): DesktopObservationProfileSummary {
  if ("summary" in profileOrResult) {
    return profileOrResult.summary;
  }
  return {
    profileId: profileOrResult.profileId,
    status:
      profileOrResult.observationMode === "disabled"
        ? "disabled"
        : "profile_ready",
    displayName: profileOrResult.displayName,
    observationMode: profileOrResult.observationMode,
    includeWindowTitles: profileOrResult.includeWindowTitles,
    includeProcessNames: profileOrResult.includeProcessNames,
    includeDisplayMetadata: profileOrResult.includeDisplayMetadata,
    includeScreenshotMetadata: profileOrResult.includeScreenshotMetadata,
    maxWindowCount: profileOrResult.maxWindowCount,
    maxDisplayCount: profileOrResult.maxDisplayCount,
    warningCodes: [],
    blockerCodes: [],
    profileHash: profileOrResult.profileHash,
    summaryOnly: true
  };
}

function normalizeProfile(input: {
  record: Record<string, unknown>;
  displayName: string;
  observationMode: DesktopObservationMode;
  includeWindowTitles: boolean;
  includeProcessNames: boolean;
  includeDisplayMetadata: boolean;
  includeScreenshotMetadata: boolean;
  maxWindowCount: number;
  maxDisplayCount: number;
  captureRecord: Record<string, unknown>;
  scopeRecord: Record<string, unknown>;
  redactionRecord: Record<string, unknown> | undefined;
  idGenerator: IdGenerator | undefined;
}): DesktopObservationProfile {
  const profileId = readString(input.record.profileId) || input.idGenerator?.();
  const stableProfileId =
    profileId ||
    `desktop-observation-profile-${stablePreviewHash(
      JSON.stringify({
        displayName: input.displayName,
        observationMode: input.observationMode,
        maxWindowCount: input.maxWindowCount,
        maxDisplayCount: input.maxDisplayCount
      })
    ).slice(0, 12)}`;

  const createdAt = readString(input.record.createdAt);
  const scope: DesktopObservationScope = {
    includeForegroundWindow: readBoolean(
      input.scopeRecord.includeForegroundWindow,
      true
    ),
    includeWindowList: readBoolean(input.scopeRecord.includeWindowList, true),
    includeDisplayMetadata: input.includeDisplayMetadata,
    includeScreenshotMetadata: input.includeScreenshotMetadata
  };

  const capturePolicy: DesktopObservationCapturePolicy = {
    allowDesktopAction: false,
    allowClickTypeSelect: false,
    allowClipboardWrite: false,
    allowClipboardReadByDefault: false,
    allowFileDialogAutomation: false,
    allowHiddenBackgroundCapture: false,
    allowScreenRecording: false,
    allowRawScreenshotPersistence: false,
    allowRawOcrTextPersistence: false,
    sendToModel: false
  };

  const redactionPolicy: DesktopObservationRedactionPolicy = {
    enabled: readBoolean(input.redactionRecord?.enabled, true),
    redactWindowTitles: readBoolean(
      input.redactionRecord?.redactWindowTitles,
      true
    ),
    redactProcessNames: readBoolean(
      input.redactionRecord?.redactProcessNames,
      true
    ),
    redactSecretMarkers: true,
    summaryOnly: true
  };

  const profileWithoutHash = {
    schemaVersion: "desktop_observation_profile.v1" as const,
    profileId: stableProfileId,
    displayName: input.displayName,
    observationMode: input.observationMode,
    scope,
    capturePolicy,
    redactionPolicy,
    maxWindowCount: input.maxWindowCount,
    maxDisplayCount: input.maxDisplayCount,
    includeWindowTitles: input.includeWindowTitles,
    includeProcessNames: input.includeProcessNames,
    includeDisplayMetadata: input.includeDisplayMetadata,
    includeScreenshotMetadata: input.includeScreenshotMetadata,
    ...(createdAt ? { createdAt } : {}),
    source: "runtime_desktop_observation_profile" as const
  };
  const profileHash = stablePreviewHash(stableStringify(profileWithoutHash));
  return {
    ...profileWithoutHash,
    profileHash
  };
}

function buildSummary(input: {
  status: DesktopObservationProfileStatus;
  profile: DesktopObservationProfile | undefined;
  displayName: string | undefined;
  observationMode: DesktopObservationMode | undefined;
  includeWindowTitles: boolean;
  includeProcessNames: boolean;
  includeDisplayMetadata: boolean;
  includeScreenshotMetadata: boolean;
  maxWindowCount: number;
  maxDisplayCount: number;
  findings: DesktopObservationFinding[];
}): DesktopObservationProfileSummary {
  return {
    profileId: input.profile?.profileId,
    status: input.status,
    displayName:
      input.status === "blocked"
        ? undefined
        : (input.profile?.displayName ?? input.displayName),
    observationMode: input.profile?.observationMode ?? input.observationMode,
    includeWindowTitles: input.includeWindowTitles,
    includeProcessNames: input.includeProcessNames,
    includeDisplayMetadata: input.includeDisplayMetadata,
    includeScreenshotMetadata: input.includeScreenshotMetadata,
    maxWindowCount: input.maxWindowCount,
    maxDisplayCount: input.maxDisplayCount,
    warningCodes: input.findings
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.code),
    blockerCodes: input.findings
      .filter((finding) => finding.severity === "blocker")
      .map((finding) => finding.code),
    profileHash: input.profile?.profileHash,
    summaryOnly: true
  };
}

function determineStatus(
  observationMode: DesktopObservationMode | undefined,
  blockerCount: number,
  warningCount: number
): DesktopObservationProfileStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (observationMode === "disabled") {
    return "disabled";
  }
  if (warningCount > 0) {
    return "warning";
  }
  return "profile_ready";
}

function buildReadiness(
  status: DesktopObservationProfileStatus,
  profile: DesktopObservationProfile | undefined
): DesktopObservationReadiness {
  return {
    canUseForDesktopObservation:
      (status === "profile_ready" || status === "warning") &&
      profile?.observationMode !== "disabled",
    canCaptureScreenshotMetadata:
      Boolean(profile?.includeScreenshotMetadata) &&
      profile?.observationMode === "screenshot_metadata_only",
    canCaptureRawScreenshot: false,
    canPersistRawScreenshot: false,
    canPersistRawOcrText: false,
    canReadClipboardByDefault: false,
    canWriteClipboard: false,
    canDesktopAction: false,
    canClickTypeSelect: false,
    canFileDialogAutomation: false,
    canHiddenBackgroundCapture: false,
    canScreenRecord: false,
    canSendToModel: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function nextActionFor(status: DesktopObservationProfileStatus): string {
  if (status === "blocked") {
    return "Reject this desktop observation profile until schema, privacy, raw content, and execution blockers are removed.";
  }
  if (status === "disabled") {
    return "Keep desktop observation disabled or choose a metadata-only profile in a future user-triggered flow.";
  }
  if (status === "warning") {
    return "Review privacy warnings before using this profile in the future desktop observer metadata path.";
  }
  return "Profile metadata is ready for the future desktop observation metadata model; no observation has run.";
}

function blockTrueFlag(
  record: Record<string, unknown>,
  key: string,
  code: string,
  safeMessage: string,
  addFinding: (
    kind: DesktopObservationFindingKind,
    severity: DesktopObservationSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ) => void
): void {
  if (record[key] === true) {
    addFinding("capture_policy", "blocker", code, safeMessage, key);
  }
}

function scanUnsafeFields(
  value: unknown,
  addFinding: (
    kind: DesktopObservationFindingKind,
    severity: DesktopObservationSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ) => void,
  path = "$"
): void {
  if (typeof value === "string") {
    if (secretMarkers.some((marker) => value.includes(marker))) {
      addFinding(
        "secret",
        "blocker",
        "secret_marker_detected",
        "Desktop observation profile contains a secret-like marker.",
        path
      );
    }
    if (rawMarkers.some((marker) => value.includes(marker))) {
      addFinding(
        "raw_field",
        "blocker",
        "raw_marker_detected",
        "Desktop observation profile contains raw-content marker text.",
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
        normalizedKey === "sendtomodel" ? "capture_policy" : "raw_field",
        "blocker",
        "forbidden_field",
        "Desktop observation profile contains a forbidden field.",
        childPath
      );
    }
    if (executionBooleanKeys.has(normalizedKey) && child === true) {
      addFinding(
        "readiness",
        "blocker",
        "execution_readiness_true",
        "Desktop observation profile cannot set execution readiness true.",
        childPath
      );
    }
    scanUnsafeFields(child, addFinding, childPath);
  }
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readBoundedInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : fallback;
}

function readIdGenerator(value: unknown): IdGenerator | undefined {
  return typeof value === "function" ? (value as IdGenerator) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
