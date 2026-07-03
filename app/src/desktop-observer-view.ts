import {
  buildDesktopObservationProfile,
  buildDesktopObserverRedactionAudit,
  type DesktopObservationProfileInput,
  type DesktopObservationProfileSummary,
  type DesktopObserverRedactionAuditReport
} from "../../runtime/src/desktop-observer/index.js";

import {
  buildScreenshotRedactionBoundaryView,
  type ScreenshotRedactionBoundaryView
} from "./screenshot-redaction-boundary-view.js";
import type {
  DesktopObservationCommandRequest,
  DesktopObservationCommandResult
} from "./desktop-flow.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type DesktopObserverViewStatus =
  | "profile_ready"
  | "observing"
  | "observed"
  | "warning"
  | "blocked";

export type DesktopObserverViewReadiness = {
  canPreviewProfile: boolean;
  canObserveMetadata: boolean;
  canDesktopAction: false;
  canClickTypeSelect: false;
  canControlWindows: false;
  canReadClipboard: false;
  canWriteClipboard: false;
  canPersistRawImage: false;
  canPersistOcrText: false;
  canSendToModel: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type DesktopObserverView = {
  status: DesktopObserverViewStatus;
  profileSummary: DesktopObservationProfileSummary;
  safeRequest?: DesktopObservationCommandRequest | undefined;
  observationId?: string | undefined;
  windowCount: number;
  appCount: number;
  displayCount: number;
  focusedWindowSummary: string;
  redactionWarnings: string[];
  screenshotBoundary?: ScreenshotRedactionBoundaryView | undefined;
  warningCount: number;
  blockerCount: number;
  redactionAudit: DesktopObserverRedactionAuditReport;
  resultHash?: string | undefined;
  safeMessage: string;
  readiness: DesktopObserverViewReadiness;
  nextAction: string;
  source: "app_desktop_observer_surface";
};

export type DesktopObservationEvidenceRef = {
  kind: "desktop_observation_summary";
  placement: "volatile_tail" | "no_compress_zone";
  refId: string;
  observationId: string;
  summary: string;
  windowCount: number;
  appCount: number;
  displayCount: number;
  hashPrefix: string;
  redactionCodes: string[];
  summaryOnly: true;
  source: "desktop_observer";
};

export type DesktopObserverViewInput = {
  profileInput?: DesktopObservationProfileInput | undefined;
  observationResult?: DesktopObservationCommandResult | undefined;
  observeStatus?: "idle" | "observing" | "observed" | "failed" | undefined;
  observeError?: string | undefined;
};

const defaultProfileInput = {
  profileId: "desktop-observer-profile-app",
  displayName: "Desktop Observer metadata preview",
  observationMode: "metadata_only",
  includeWindowTitles: false,
  includeProcessNames: false,
  includeDisplayMetadata: true,
  includeScreenshotMetadata: true,
  maxWindowCount: 5,
  maxDisplayCount: 2,
  scope: {
    includeForegroundWindow: true,
    includeWindowList: true,
    includeDisplayMetadata: true,
    includeScreenshotMetadata: true
  },
  capturePolicy: {
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
  },
  redactionPolicy: {
    enabled: true,
    redactWindowTitles: true,
    redactProcessNames: true,
    redactSecretMarkers: true,
    summaryOnly: true
  },
  idGenerator: () => "desktop-observer-profile-app"
};

export function buildDesktopObserverView(
  input: DesktopObserverViewInput = {}
): DesktopObserverView {
  const profileResult = buildDesktopObservationProfile(
    input.profileInput ?? defaultProfileInput
  );
  const profileSummary = profileResult.summary;
  const observation = input.observationResult;
  const screenshotBoundary =
    observation?.screenshotMetadata === undefined
      ? undefined
      : buildScreenshotRedactionBoundaryView({
          metadata: {
            screenshotMetadata: observation.screenshotMetadata,
            displayCount: observation.displayCount
          }
        });
  const redactionWarnings = collectRedactionWarnings(
    observation,
    screenshotBoundary
  );
  const blockerCount =
    profileResult.blockerCount + (screenshotBoundary?.blockerCount ?? 0);
  const warningCount =
    profileResult.warningCount +
    (observation?.warningCodes.length ?? 0) +
    (screenshotBoundary?.warningCount ?? 0);
  const redactionAudit = buildDesktopObserverRedactionAudit({
    profileSummary,
    observationSummary:
      observation === undefined
        ? undefined
        : {
            observationId: observation.observationId,
            windowCount: observation.windowCount,
            appCount: observation.appCount,
            displayCount: observation.displayCount,
            screenshotMetadataIncluded: observation.screenshotMetadataIncluded,
            warningCodes: observation.warningCodes,
            summaryOnly: observation.summaryOnly,
            rawScreenshotPersisted: observation.rawScreenshotPersisted,
            rawOcrTextPersisted: observation.rawOcrTextPersisted,
            rawClipboardIncluded: observation.rawClipboardIncluded,
            canDesktopAction: observation.canDesktopAction,
            canClickTypeSelect: observation.canClickTypeSelect,
            canWriteClipboard: observation.canWriteClipboard,
            canSendToModel: observation.canSendToModel,
            canWriteEventStore: observation.canWriteEventStore,
            canApplyPatch: observation.canApplyPatch,
            canRollback: observation.canRollback,
            canExecuteGit: observation.canExecuteGit,
            canExecuteShell: observation.canExecuteShell,
            appCanExecute: observation.appCanExecute
          },
    screenshotBoundary:
      screenshotBoundary === undefined
        ? undefined
        : {
            status: screenshotBoundary.status,
            displayCount: screenshotBoundary.displayCount,
            captureMode: screenshotBoundary.captureMode,
            rawPersisted: screenshotBoundary.rawPersisted,
            ocrPersisted: screenshotBoundary.ocrPersisted,
            modelSent: screenshotBoundary.modelSent,
            redactionCodes: screenshotBoundary.redactionCodes,
            warningCodes: screenshotBoundary.warningCodes,
            blockerCodes: screenshotBoundary.blockerCodes,
            summaryOnly: screenshotBoundary.summaryOnly
          },
    source: "app_desktop_observer_surface"
  });
  const safeRequest: DesktopObservationCommandRequest | undefined =
    profileResult.profile === undefined
      ? undefined
      : {
          requestId: `desktop-observation-${profileResult.profileHash?.slice(0, 12) ?? "request"}`,
          userTriggered: true as const,
          includeForegroundWindow:
            profileResult.profile.scope.includeForegroundWindow,
          includeWindowList: profileResult.profile.scope.includeWindowList,
          includeDisplayMetadata:
            profileResult.profile.scope.includeDisplayMetadata,
          includeScreenshotMetadata:
            profileResult.profile.scope.includeScreenshotMetadata,
          profile: profileResult.profile as unknown as Record<string, unknown>
        };
  const status = determineStatus({
    profileStatus: profileResult.status,
    observeStatus: input.observeStatus ?? "idle",
    hasObservation: observation !== undefined,
    blockerCount,
    warningCount,
    observeError: input.observeError
  });

  return {
    status,
    profileSummary,
    safeRequest,
    observationId: observation?.observationId,
    windowCount: observation?.windowCount ?? 0,
    appCount: observation?.appCount ?? 0,
    displayCount: observation?.displayCount ?? 0,
    focusedWindowSummary: focusedWindowSummary(observation),
    redactionWarnings,
    screenshotBoundary,
    warningCount,
    blockerCount,
    redactionAudit,
    resultHash: observation?.resultHash,
    safeMessage:
      input.observeError !== undefined
        ? safeErrorMessage(input.observeError)
        : (observation?.safeMessage ??
          "Desktop Observer is ready to preview metadata only."),
    readiness: {
      canPreviewProfile: profileResult.blockerCount === 0,
      canObserveMetadata:
        safeRequest !== undefined &&
        blockerCount === 0 &&
        input.observeStatus !== "observing",
      canDesktopAction: false,
      canClickTypeSelect: false,
      canControlWindows: false,
      canReadClipboard: false,
      canWriteClipboard: false,
      canPersistRawImage: false,
      canPersistOcrText: false,
      canSendToModel: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status),
    source: "app_desktop_observer_surface"
  };
}

export function summarizeDesktopObserverView(view: DesktopObserverView): {
  status: DesktopObserverViewStatus;
  profileId?: string | undefined;
  observationId?: string | undefined;
  windowCount: number;
  appCount: number;
  displayCount: number;
  warningCount: number;
  blockerCount: number;
  redactionAuditStatus: string;
  resultHash?: string | undefined;
  nextAction: string;
} {
  return {
    status: view.status,
    profileId: view.profileSummary.profileId,
    observationId: view.observationId,
    windowCount: view.windowCount,
    appCount: view.appCount,
    displayCount: view.displayCount,
    warningCount: view.warningCount,
    blockerCount: view.blockerCount,
    redactionAuditStatus: view.redactionAudit.status,
    resultHash: view.resultHash,
    nextAction: view.nextAction
  };
}

export function desktopObserverEvidenceRefs(
  view: DesktopObserverView
): DesktopObservationEvidenceRef[] {
  if (
    view.observationId === undefined ||
    view.blockerCount > 0 ||
    (view.status !== "observed" && view.status !== "warning")
  ) {
    return [];
  }

  const hashPrefix = safeHashPrefix(view.resultHash, view.observationId);
  const redactionCodes = uniqueCodes(view.redactionWarnings);
  const refs: DesktopObservationEvidenceRef[] = [
    {
      kind: "desktop_observation_summary",
      placement: "volatile_tail",
      refId: `desktop-observation-summary-${hashPrefix}`,
      observationId: safeIdentifier(view.observationId, "desktop-observation"),
      summary: [
        "metadata summary only",
        `windows:${view.windowCount}`,
        `apps:${view.appCount}`,
        `displays:${view.displayCount}`,
        `redactions:${redactionCodes.length}`,
        `hash:${hashPrefix}`
      ].join(" | "),
      windowCount: view.windowCount,
      appCount: view.appCount,
      displayCount: view.displayCount,
      hashPrefix,
      redactionCodes,
      summaryOnly: true,
      source: "desktop_observer"
    }
  ];

  if (view.screenshotBoundary !== undefined) {
    const boundaryHash = safeHashPrefix(
      view.screenshotBoundary.boundaryHash ?? view.screenshotBoundary.hashPrefix,
      view.screenshotBoundary.boundaryId ?? view.observationId
    );
    const boundaryCodes = uniqueCodes([
      ...view.screenshotBoundary.redactionCodes,
      ...view.screenshotBoundary.warningCodes,
      ...view.screenshotBoundary.blockerCodes
    ]);
    refs.push({
      kind: "desktop_observation_summary",
      placement: "no_compress_zone",
      refId: `desktop-observation-screenshot-boundary-${boundaryHash}`,
      observationId: safeIdentifier(view.observationId, "desktop-observation"),
      summary: [
        "screen metadata privacy boundary",
        `status:${view.screenshotBoundary.status}`,
        `capture:${view.screenshotBoundary.captureMode}`,
        `raw:${view.screenshotBoundary.rawPersisted ? "yes" : "no"}`,
        `ocr:${view.screenshotBoundary.ocrPersisted ? "yes" : "no"}`,
        `model:${view.screenshotBoundary.modelSent ? "yes" : "no"}`,
        `redactions:${boundaryCodes.length}`,
        `hash:${boundaryHash}`
      ].join(" | "),
      windowCount: view.windowCount,
      appCount: view.appCount,
      displayCount: view.displayCount,
      hashPrefix: boundaryHash,
      redactionCodes: boundaryCodes,
      summaryOnly: true,
      source: "desktop_observer"
    });
  }

  return refs;
}

function determineStatus(args: {
  profileStatus: string;
  observeStatus: "idle" | "observing" | "observed" | "failed";
  hasObservation: boolean;
  blockerCount: number;
  warningCount: number;
  observeError?: string | undefined;
}): DesktopObserverViewStatus {
  if (
    args.blockerCount > 0 ||
    args.profileStatus === "blocked" ||
    args.observeStatus === "failed" ||
    args.observeError !== undefined
  ) {
    return "blocked";
  }
  if (args.observeStatus === "observing") {
    return "observing";
  }
  if (args.hasObservation) {
    return args.warningCount > 0 ? "warning" : "observed";
  }
  return args.warningCount > 0 ? "warning" : "profile_ready";
}

function focusedWindowSummary(
  observation: DesktopObservationCommandResult | undefined
): string {
  const focused =
    observation?.windows.find((item) => item.focused === true) ??
    observation?.windows[0];
  if (focused === undefined) {
    return "No focused window metadata available.";
  }
  const title = safeRecordText(focused, "titleSummary", "title redacted");
  const app = safeRecordText(focused, "appNameSummary", "app redacted");
  return `${title} / ${app}`;
}

function collectRedactionWarnings(
  observation: DesktopObservationCommandResult | undefined,
  screenshotBoundary: ScreenshotRedactionBoundaryView | undefined
): string[] {
  const warnings = new Set<string>();
  for (const code of observation?.warningCodes ?? []) {
    warnings.add(safeCode(code));
  }
  for (const item of [
    ...(observation?.windows ?? []),
    ...(observation?.apps ?? []),
    ...(observation?.displays ?? []),
    ...(observation?.screenshotMetadata === undefined
      ? []
      : [observation.screenshotMetadata])
  ]) {
    for (const code of readRedactionCodes(item)) {
      warnings.add(safeCode(code));
    }
  }
  for (const code of screenshotBoundary?.warningCodes ?? []) {
    warnings.add(safeCode(code));
  }
  for (const code of screenshotBoundary?.blockerCodes ?? []) {
    warnings.add(safeCode(code));
  }
  return [...warnings].filter((code) => code.length > 0);
}

function readRedactionCodes(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.redactionCodes)) {
    return [];
  }
  return value.redactionCodes.filter(
    (item): item is string => typeof item === "string"
  );
}

function safeRecordText(
  value: unknown,
  key: string,
  fallback: string
): string {
  if (!isRecord(value)) {
    return fallback;
  }
  return safeText(String(value[key] ?? ""), fallback);
}

function safeCode(value: string): string {
  return safeText(value, "DESKTOP_OBSERVER_WARNING")
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .slice(0, 120);
}

function uniqueCodes(values: readonly string[]): string[] {
  return Array.from(new Set(values.map(safeCode).filter((code) => code.length > 0)));
}

function safeHashPrefix(value: string | undefined, fallbackSeed: string): string {
  const safeValue = safeText(value ?? "", "");
  if (/^[A-Za-z0-9_.-]{6,128}$/.test(safeValue)) {
    return safeValue.slice(0, 16);
  }
  return hashPrefix(fallbackSeed);
}

function safeIdentifier(value: string, fallback: string): string {
  const safeValue = safeText(value, fallback).replace(/[^A-Za-z0-9_.-]/g, "-");
  return safeValue.length > 0 ? safeValue.slice(0, 120) : fallback;
}

function hashPrefix(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 12);
}

function nextActionFor(status: DesktopObserverViewStatus): string {
  if (status === "blocked") {
    return "Resolve Desktop Observer blockers before observing metadata.";
  }
  if (status === "observing") {
    return "Waiting for metadata-only desktop observation.";
  }
  if (status === "warning") {
    return "Review redaction warnings. Desktop action, raw screenshot persistence, OCR persistence, clipboard access, EventStore writes, and model send remain disabled.";
  }
  if (status === "observed") {
    return "Desktop metadata is summarized. It can be reviewed as read-only evidence only.";
  }
  return "Preview the profile or observe desktop metadata on explicit user request.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
