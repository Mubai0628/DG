import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type {
  DesktopObservationProfile,
  DesktopObservationProfileValidationResult
} from "./desktop-observation-profile.js";

export type DesktopObservationInput = Record<string, unknown> | unknown;

export type DesktopObservationStatus =
  | "empty"
  | "observed"
  | "warning"
  | "blocked";

export type DesktopObservationFindingKind =
  | "schema"
  | "profile"
  | "window"
  | "display"
  | "screenshot_metadata"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "limit";

export type DesktopObservationSeverity = "blocker" | "warning";

export type DesktopObservationFinding = {
  findingId: string;
  kind: DesktopObservationFindingKind;
  severity: DesktopObservationSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopWindowSummary = {
  windowIdHash: string;
  titleSummary: string;
  appNameSummary: string;
  pidHash?: string | undefined;
  boundsSummary?: string | undefined;
  focused: boolean;
  displayIdHash?: string | undefined;
  redactionCodes: string[];
};

export type DesktopAppSummary = {
  appIdHash: string;
  appNameSummary: string;
  windowCount: number;
  redactionCodes: string[];
};

export type DesktopDisplaySummary = {
  displayIdHash: string;
  sizeSummary: string;
  scaleFactor?: number | undefined;
  primary: boolean;
  redactionCodes: string[];
};

export type DesktopScreenshotMetadataSummary = {
  screenshotHash?: string | undefined;
  width: number;
  height: number;
  byteEstimate?: number | undefined;
  redactionCodes: string[];
  rawScreenshotPersisted: false;
};

export type DesktopObservationReadiness = {
  canUseAsContextEvidence: boolean;
  canEnterAgentDossier: boolean;
  canPersistRawScreenshot: false;
  canPersistRawOcrText: false;
  canReadClipboard: false;
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

export type DesktopObservationSummary = {
  status: DesktopObservationStatus;
  observationId?: string | undefined;
  profileId?: string | undefined;
  observedAt?: string | undefined;
  windowCount: number;
  appCount: number;
  displayCount: number;
  screenshotMetadataIncluded: boolean;
  windows: DesktopWindowSummary[];
  apps: DesktopAppSummary[];
  displays: DesktopDisplaySummary[];
  screenshotMetadata?: DesktopScreenshotMetadataSummary | undefined;
  findings: DesktopObservationFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  observationHash?: string | undefined;
  readiness: DesktopObservationReadiness;
  nextAction: string;
  source: "runtime_desktop_observation_summary";
};

export type DesktopObservationSafeSummary = {
  status: DesktopObservationStatus;
  observationId?: string | undefined;
  profileId?: string | undefined;
  windowCount: number;
  appCount: number;
  displayCount: number;
  screenshotMetadataIncluded: boolean;
  warningCodes: string[];
  blockerCodes: string[];
  observationHash?: string | undefined;
  summaryOnly: true;
};

type IdGenerator = () => string;

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
    "select",
    "tools",
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "allowDesktopAction",
    "allowClickTypeSelect",
    "allowClipboardWrite",
    "allowClipboardRead",
    "allowFileDialogAutomation",
    "allowHiddenBackgroundCapture",
    "allowScreenRecording",
    "allowRawScreenshotPersistence",
    "allowRawOcrTextPersistence",
    "sendToModel",
    "rawScreenshotPersisted",
    "canDesktopAction",
    "canClickTypeSelect",
    "canWriteClipboard",
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
  "raw ocr",
  "reasoning_content",
  "screenshotBase64"
];

export function buildDesktopObservationSummary(
  input: DesktopObservationInput
): DesktopObservationSummary {
  const record = isRecord(input) ? input : {};
  const findings: DesktopObservationFinding[] = [];
  const addFinding = (
    kind: DesktopObservationFindingKind,
    severity: DesktopObservationSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ): void => {
    findings.push({
      findingId: `desktop-observation-finding-${findings.length + 1}`,
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
      "Desktop observation summary input must be an object."
    );
  }

  scanUnsafeFields(input, addFinding);

  const profile = resolveProfile(record.profile, addFinding);
  const windowsInput = readArray(record.windows);
  const displaysInput = readArray(record.displays);
  const appsInput = readArray(record.apps);
  const idGenerator = readIdGenerator(record.idGenerator);
  const observedAt = readString(record.observedAt);

  if (!profile) {
    addFinding(
      "profile",
      "blocker",
      "missing_profile",
      "Desktop observation summary requires a valid observation profile."
    );
  }

  if (
    profile &&
    windowsInput.length > profile.maxWindowCount &&
    profile.maxWindowCount >= 0
  ) {
    addFinding(
      "limit",
      "blocker",
      "too_many_windows",
      "Desktop observation input exceeds the profile window count limit."
    );
  }

  if (
    profile &&
    displaysInput.length > profile.maxDisplayCount &&
    profile.maxDisplayCount >= 0
  ) {
    addFinding(
      "limit",
      "blocker",
      "too_many_displays",
      "Desktop observation input exceeds the profile display count limit."
    );
  }

  if (
    windowsInput.length === 0 &&
    displaysInput.length === 0 &&
    appsInput.length === 0
  ) {
    addFinding(
      "schema",
      "warning",
      "empty_observation_metadata",
      "Desktop observation input does not include window, app, or display metadata."
    );
  }

  const windows = windowsInput.map((windowRecord, index) =>
    summarizeWindow(windowRecord, index, addFinding)
  );
  const displays = displaysInput.map((displayRecord, index) =>
    summarizeDisplay(displayRecord, index, addFinding)
  );
  const apps = buildAppSummaries(appsInput, windows, addFinding);
  const screenshotMetadata = summarizeScreenshotMetadata(
    record.screenshotMetadata,
    addFinding
  );

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status = determineStatus(blockerCount, warningCount, {
    windows,
    apps,
    displays,
    screenshotMetadata
  });

  const observationId =
    blockerCount === 0
      ? readString(record.observationId) ||
        idGenerator?.() ||
        `desktop-observation-${stablePreviewHash(
          stableStringify({
            profileId: profile?.profileId,
            windows,
            apps,
            displays,
            screenshotMetadata,
            observedAt
          })
        ).slice(0, 12)}`
      : undefined;

  const summaryWithoutHash = {
    status,
    observationId,
    profileId: blockerCount === 0 ? profile?.profileId : undefined,
    observedAt,
    windowCount: blockerCount === 0 ? windows.length : 0,
    appCount: blockerCount === 0 ? apps.length : 0,
    displayCount: blockerCount === 0 ? displays.length : 0,
    screenshotMetadataIncluded:
      blockerCount === 0 && Boolean(screenshotMetadata),
    windows: blockerCount === 0 ? windows : [],
    apps: blockerCount === 0 ? apps : [],
    displays: blockerCount === 0 ? displays : [],
    ...(blockerCount === 0 && screenshotMetadata ? { screenshotMetadata } : {})
  };
  const observationHash =
    blockerCount === 0
      ? stablePreviewHash(stableStringify(summaryWithoutHash))
      : undefined;

  return {
    ...summaryWithoutHash,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    observationHash,
    readiness: buildReadiness(status),
    nextAction: nextActionFor(status),
    source: "runtime_desktop_observation_summary"
  };
}

export function validateDesktopObservationInput(
  input: DesktopObservationInput
): DesktopObservationSummary {
  return buildDesktopObservationSummary(input);
}

export function summarizeDesktopObservation(
  summary: DesktopObservationSummary
): DesktopObservationSafeSummary {
  return {
    status: summary.status,
    observationId: summary.observationId,
    profileId: summary.profileId,
    windowCount: summary.windowCount,
    appCount: summary.appCount,
    displayCount: summary.displayCount,
    screenshotMetadataIncluded: summary.screenshotMetadataIncluded,
    warningCodes: summary.findings
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.code),
    blockerCodes: summary.findings
      .filter((finding) => finding.severity === "blocker")
      .map((finding) => finding.code),
    observationHash: summary.observationHash,
    summaryOnly: true
  };
}

function resolveProfile(
  value: unknown,
  addFinding: (
    kind: DesktopObservationFindingKind,
    severity: DesktopObservationSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ) => void
): DesktopObservationProfile | undefined {
  if (isProfileValidationResult(value)) {
    if (value.status === "blocked") {
      addFinding(
        "profile",
        "blocker",
        "profile_blocked",
        "Desktop observation profile validation is blocked."
      );
    }
    if (value.status === "disabled") {
      addFinding(
        "profile",
        "blocker",
        "profile_disabled",
        "Desktop observation profile is disabled."
      );
    }
    return value.profile;
  }
  if (isProfile(value)) {
    if (value.observationMode === "disabled") {
      addFinding(
        "profile",
        "blocker",
        "profile_disabled",
        "Desktop observation profile is disabled."
      );
    }
    return value;
  }
  return undefined;
}

function summarizeWindow(
  value: unknown,
  index: number,
  addFinding: (
    kind: DesktopObservationFindingKind,
    severity: DesktopObservationSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ) => void
): DesktopWindowSummary {
  const record = isRecord(value) ? value : {};
  const title = readString(record.title) ?? "";
  const appName = readString(record.appName) ?? "unknown_app";
  const titleRedactionCodes = redactionCodesForText(title);
  const appRedactionCodes = redactionCodesForText(appName);

  if (titleRedactionCodes.includes("secret_marker")) {
    addFinding(
      "secret",
      "blocker",
      "window_title_secret_marker",
      "Desktop observation window title contains a secret-like marker.",
      `windows[${index}].title`
    );
  }
  if (appRedactionCodes.includes("secret_marker")) {
    addFinding(
      "secret",
      "blocker",
      "window_app_secret_marker",
      "Desktop observation app name contains a secret-like marker.",
      `windows[${index}].appName`
    );
  }

  return {
    windowIdHash: hashRef(readString(record.windowId) ?? `window-${index}`),
    titleSummary: safeTextSummary(title, "window-title"),
    appNameSummary: safeTextSummary(appName, "app-name"),
    pidHash: record.pid === undefined ? undefined : hashRef(String(record.pid)),
    boundsSummary: summarizeBounds(record.bounds),
    focused: readBoolean(record.focused, false),
    displayIdHash:
      record.displayId === undefined
        ? undefined
        : hashRef(String(record.displayId)),
    redactionCodes: unique([...titleRedactionCodes, ...appRedactionCodes])
  };
}

function summarizeDisplay(
  value: unknown,
  index: number,
  addFinding: (
    kind: DesktopObservationFindingKind,
    severity: DesktopObservationSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ) => void
): DesktopDisplaySummary {
  const record = isRecord(value) ? value : {};
  const displayId = readString(record.displayId) ?? `display-${index}`;
  const width = readNumber(record.width);
  const height = readNumber(record.height);
  if (width === undefined || height === undefined) {
    addFinding(
      "display",
      "warning",
      "display_size_missing",
      "Desktop observation display metadata is missing width or height.",
      `displays[${index}]`
    );
  }
  return {
    displayIdHash: hashRef(displayId),
    sizeSummary:
      width !== undefined && height !== undefined
        ? `${width}x${height}`
        : "unknown_size",
    scaleFactor: readNumber(record.scaleFactor),
    primary: readBoolean(record.primary, false),
    redactionCodes: []
  };
}

function buildAppSummaries(
  appsInput: unknown[],
  windows: DesktopWindowSummary[],
  addFinding: (
    kind: DesktopObservationFindingKind,
    severity: DesktopObservationSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ) => void
): DesktopAppSummary[] {
  if (appsInput.length > 0) {
    return appsInput.map((value, index) => {
      const record = isRecord(value) ? value : {};
      const appName = readString(record.appName) ?? `app-${index}`;
      const redactionCodes = redactionCodesForText(appName);
      if (redactionCodes.includes("secret_marker")) {
        addFinding(
          "secret",
          "blocker",
          "app_secret_marker",
          "Desktop observation app metadata contains a secret-like marker.",
          `apps[${index}].appName`
        );
      }
      return {
        appIdHash: hashRef(readString(record.appId) ?? appName),
        appNameSummary: safeTextSummary(appName, "app-name"),
        windowCount: readNumber(record.windowCount) ?? 0,
        redactionCodes
      };
    });
  }

  const byApp = new Map<string, DesktopAppSummary>();
  for (const window of windows) {
    const key = window.appNameSummary;
    const current = byApp.get(key);
    if (current) {
      current.windowCount += 1;
      current.redactionCodes = unique([
        ...current.redactionCodes,
        ...window.redactionCodes
      ]);
    } else {
      byApp.set(key, {
        appIdHash: hashRef(key),
        appNameSummary: key,
        windowCount: 1,
        redactionCodes: window.redactionCodes
      });
    }
  }
  return [...byApp.values()];
}

function summarizeScreenshotMetadata(
  value: unknown,
  addFinding: (
    kind: DesktopObservationFindingKind,
    severity: DesktopObservationSeverity,
    code: string,
    safeMessage: string,
    path?: string
  ) => void
): DesktopScreenshotMetadataSummary | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    addFinding(
      "screenshot_metadata",
      "blocker",
      "invalid_screenshot_metadata",
      "Desktop observation screenshot metadata must be an object."
    );
    return undefined;
  }

  if (value.rawScreenshotPersisted === true) {
    addFinding(
      "screenshot_metadata",
      "blocker",
      "raw_screenshot_persisted",
      "Desktop observation cannot persist raw screenshots by default."
    );
  }

  const width = readNumber(value.width);
  const height = readNumber(value.height);
  if (width === undefined || height === undefined) {
    addFinding(
      "screenshot_metadata",
      "blocker",
      "screenshot_dimensions_missing",
      "Desktop observation screenshot metadata requires width and height."
    );
  }

  return {
    screenshotHash: readString(value.screenshotHash),
    width: width ?? 0,
    height: height ?? 0,
    byteEstimate: readNumber(value.byteEstimate),
    redactionCodes: readStringArray(value.redactionCodes),
    rawScreenshotPersisted: false
  };
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
        "Desktop observation input contains a secret-like marker.",
        path
      );
    }
    if (rawMarkers.some((marker) => value.includes(marker))) {
      addFinding(
        "raw_field",
        "blocker",
        "raw_marker_detected",
        "Desktop observation input contains raw-content marker text.",
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
    if (path === "$" && key === "profile") {
      continue;
    }
    if (forbiddenFieldKeys.has(normalizedKey)) {
      addFinding(
        "raw_field",
        "blocker",
        "forbidden_field",
        "Desktop observation input contains a forbidden field.",
        childPath
      );
    }
    if (executionBooleanKeys.has(normalizedKey) && child === true) {
      addFinding(
        "execution_field",
        "blocker",
        "execution_field_true",
        "Desktop observation input cannot enable execution or raw persistence.",
        childPath
      );
    }
    scanUnsafeFields(child, addFinding, childPath);
  }
}

function determineStatus(
  blockerCount: number,
  warningCount: number,
  observed: {
    windows: DesktopWindowSummary[];
    apps: DesktopAppSummary[];
    displays: DesktopDisplaySummary[];
    screenshotMetadata: DesktopScreenshotMetadataSummary | undefined;
  }
): DesktopObservationStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (
    observed.windows.length === 0 &&
    observed.apps.length === 0 &&
    observed.displays.length === 0 &&
    !observed.screenshotMetadata
  ) {
    return "empty";
  }
  if (warningCount > 0) {
    return "warning";
  }
  return "observed";
}

function buildReadiness(
  status: DesktopObservationStatus
): DesktopObservationReadiness {
  const canUse = status === "observed" || status === "warning";
  return {
    canUseAsContextEvidence: canUse,
    canEnterAgentDossier: canUse,
    canPersistRawScreenshot: false,
    canPersistRawOcrText: false,
    canReadClipboard: false,
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

function nextActionFor(status: DesktopObservationStatus): string {
  if (status === "blocked") {
    return "Reject this desktop observation metadata until raw, secret, profile, and execution blockers are removed.";
  }
  if (status === "empty") {
    return "Provide bounded manual/test window, app, display, or screenshot metadata before using this summary.";
  }
  if (status === "warning") {
    return "Review privacy warnings before using this summary as context evidence.";
  }
  return "Observation metadata is summary-only and may be used as future context evidence; no desktop action is enabled.";
}

function safeTextSummary(value: string, label: string): string {
  if (!value) {
    return `empty_${label}`;
  }
  if (redactionCodesForText(value).length > 0) {
    return `redacted_${label}_${stablePreviewHash(value).slice(0, 8)}`;
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 57)}...`;
}

function redactionCodesForText(value: string): string[] {
  const codes: string[] = [];
  if (secretMarkers.some((marker) => value.includes(marker))) {
    codes.push("secret_marker");
  }
  if (value.includes("@")) {
    codes.push("email_like");
  }
  if (value.length > 60) {
    codes.push("long_text");
  }
  return codes;
}

function summarizeBounds(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const width = readNumber(value.width);
  const height = readNumber(value.height);
  if (width === undefined || height === undefined) {
    return undefined;
  }
  const x = readNumber(value.x) ?? 0;
  const y = readNumber(value.y) ?? 0;
  return `${width}x${height}+${x}+${y}`;
}

function hashRef(value: string): string {
  return stablePreviewHash(value).slice(0, 16);
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readIdGenerator(value: unknown): IdGenerator | undefined {
  return typeof value === "function" ? (value as IdGenerator) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProfile(value: unknown): value is DesktopObservationProfile {
  return (
    isRecord(value) &&
    value.source === "runtime_desktop_observation_profile" &&
    typeof value.profileId === "string" &&
    typeof value.maxWindowCount === "number" &&
    typeof value.maxDisplayCount === "number"
  );
}

function isProfileValidationResult(
  value: unknown
): value is DesktopObservationProfileValidationResult {
  return (
    isRecord(value) &&
    value.source === "runtime_desktop_observation_profile" &&
    typeof value.status === "string" &&
    ("profile" in value || "summary" in value)
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
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
