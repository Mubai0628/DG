import {
  normalizeTimelineItem,
  safeArray,
  safeErrorMessage,
  safeText,
  type DesktopFlowResult,
  type RunnerPreflightSummary,
  type WorkspaceEventSummary
} from "./safety.js";

export type AppControlPlaneProjectionStatus =
  | "empty"
  | "projected"
  | "warning"
  | "error";

export type AppControlPlanePhaseView =
  | "intake"
  | "context"
  | "routing"
  | "capability_planning"
  | "approval"
  | "execution_plan"
  | "simulation"
  | "result"
  | "audit";

export type AppControlPlaneArtifactView = {
  id: string;
  label: string;
  relativePath: string;
  source: "conversion_result" | "event_log_summary";
};

export type AppControlPlaneWarningView = {
  code: string;
  source: "event_summary" | "safety_scan" | "conversion_error" | "preflight";
};

export type AppControlPlaneNextAction = {
  label: string;
  severity: "info" | "warning" | "error";
};

export type AppControlPlaneRunCard = {
  runStatus:
    | "created"
    | "planned"
    | "needs_clarification"
    | "awaiting_approval"
    | "approved"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  intent:
    | "web_data_extraction"
    | "code_change"
    | "code_review"
    | "verification"
    | "documentation"
    | "bridge_payload_preview"
    | "unknown";
  phase: AppControlPlanePhaseView;
  taskCount: number;
  completedTaskCount: number;
};

export type AppControlPlaneProjectionView = {
  status: AppControlPlaneProjectionStatus;
  runStatus: AppControlPlaneRunCard["runStatus"];
  intent: AppControlPlaneRunCard["intent"];
  phase: AppControlPlanePhaseView;
  taskCount: number;
  completedTaskCount: number;
  draftCount: number;
  draftEventCount: number;
  latestDraftEventSummary?: string;
  artifactRefs: AppControlPlaneArtifactView[];
  timelineCount: number;
  lastEventAt: string;
  safetyStatus: "ok" | "warning" | "unknown";
  warnings: AppControlPlaneWarningView[];
  nextAction: AppControlPlaneNextAction;
  source: "event_log_summary" | "conversion_result" | "empty";
  safeMessage?: string;
};

export type AppControlPlaneConversionError = {
  errorCode?: string;
  safeMessage?: string;
};

export function buildControlPlaneProjectionView(
  eventSummary: WorkspaceEventSummary | null | undefined,
  result?: DesktopFlowResult,
  preflight?: RunnerPreflightSummary,
  conversionError?: AppControlPlaneConversionError
): AppControlPlaneProjectionView {
  const preflightWarning = preflight?.ok === false;
  const fileExistsWarning =
    conversionError?.errorCode === "FILE_EXISTS" ||
    conversionError?.safeMessage?.includes("FILE_EXISTS") === true ||
    conversionError?.safeMessage?.toLowerCase().includes("file exists") ===
      true;

  if (eventSummary === undefined || eventSummary === null) {
    if (preflightWarning) {
      return emptyProjection({
        status: "warning",
        nextAction: {
          label: "Fix runner preflight before Convert.",
          severity: "warning"
        },
        warnings: [{ code: "PREFLIGHT_FAILED", source: "preflight" }]
      });
    }
    return emptyProjection();
  }

  const eventCount = finiteNumber(eventSummary.eventCount);
  const timeline = safeArray(eventSummary.timeline).map(normalizeTimelineItem);
  const safetyWarnings = safeArray(eventSummary.safetyScan?.warningCodes)
    .filter((warning): warning is string => typeof warning === "string")
    .map((warning) => warningCode(warning))
    .filter((warning) => warning !== undefined)
    .map((code) => ({ code, source: "safety_scan" }) as const);
  const summaryWarnings = safeArray(eventSummary.warnings)
    .filter((warning): warning is string => typeof warning === "string")
    .map((warning) => warningCode(warning))
    .filter((warning) => warning !== undefined)
    .map((code) => ({ code, source: "event_summary" }) as const);
  const conversionWarnings = fileExistsWarning
    ? ([{ code: "FILE_EXISTS", source: "conversion_error" }] as const)
    : [];
  const preflightWarnings = preflightWarning
    ? ([{ code: "PREFLIGHT_FAILED", source: "preflight" }] as const)
    : [];
  const warnings = dedupeWarnings([
    ...summaryWarnings,
    ...safetyWarnings,
    ...conversionWarnings,
    ...preflightWarnings
  ]);
  const artifactRefs = buildArtifactRefs(eventSummary, result);

  if (eventCount === 0 && result === undefined) {
    const emptyOverrides: Partial<AppControlPlaneProjectionView> = {
      status: warnings.length > 0 ? "warning" : "empty",
      warnings
    };
    if (preflightWarning) {
      emptyOverrides.nextAction = {
        label: "Fix runner preflight before Convert.",
        severity: "warning"
      };
    }
    return emptyProjection({
      ...emptyOverrides
    });
  }

  const eventOk = eventSummary.ok !== false;
  const safetyStatus =
    eventSummary.safetyScan?.ok === true
      ? "ok"
      : eventSummary.safetyScan?.findings > 0
        ? "warning"
        : "unknown";
  const status: AppControlPlaneProjectionStatus = !eventOk
    ? "error"
    : warnings.length > 0 || safetyStatus === "warning"
      ? "warning"
      : "projected";
  const completedTaskCount = finiteNumber(eventSummary.completedTaskCount);
  const taskCount = finiteNumber(eventSummary.taskCount);
  const draftCount =
    result?.replaySummary.draftCount ?? finiteNumber(eventSummary.draftCount);
  const draftEventCount = finiteNumber(
    eventSummary.typeCounts?.["control.run.draft_recorded"]
  );
  const latestDraftEventSummary = latestSummaryForType(
    eventSummary,
    "control.run.draft_recorded"
  );
  const phase: AppControlPlanePhaseView =
    status === "error" ? "audit" : completedTaskCount > 0 ? "result" : "audit";
  const runStatus =
    status === "error"
      ? "failed"
      : completedTaskCount > 0 || result !== undefined
        ? "completed"
        : "planned";

  return {
    status,
    runStatus,
    intent: "web_data_extraction",
    phase,
    taskCount,
    completedTaskCount,
    draftCount,
    draftEventCount,
    ...(latestDraftEventSummary !== undefined
      ? { latestDraftEventSummary }
      : {}),
    artifactRefs,
    timelineCount: timeline.length,
    lastEventAt: safeText(eventSummary.lastEventAt, "n/a"),
    safetyStatus,
    warnings,
    nextAction: nextActionFor({
      status,
      runStatus,
      fileExistsWarning,
      preflightWarning,
      eventOk,
      draftEventCount
    }),
    source: result !== undefined ? "conversion_result" : "event_log_summary",
    ...(eventSummary.safeMessage !== undefined
      ? { safeMessage: safeErrorMessage(eventSummary.safeMessage) }
      : {})
  };
}

function emptyProjection(
  overrides: Partial<AppControlPlaneProjectionView> = {}
): AppControlPlaneProjectionView {
  return {
    status: "empty",
    runStatus: "created",
    intent: "web_data_extraction",
    phase: "intake",
    taskCount: 0,
    completedTaskCount: 0,
    draftCount: 0,
    draftEventCount: 0,
    artifactRefs: [],
    timelineCount: 0,
    lastEventAt: "n/a",
    safetyStatus: "unknown",
    warnings: [],
    nextAction: {
      label: "Run Convert first, then refresh events.",
      severity: "info"
    },
    source: "empty",
    ...overrides
  };
}

function buildArtifactRefs(
  eventSummary: WorkspaceEventSummary,
  result?: DesktopFlowResult
): AppControlPlaneArtifactView[] {
  const refs: AppControlPlaneArtifactView[] = [];
  if (result !== undefined) {
    refs.push({
      id: `draft-${result.draft.relativePath}`,
      label: "Draft CSV",
      relativePath: result.draft.relativePath,
      source: "conversion_result"
    });
  }

  for (const [index, item] of safeArray(eventSummary.timeline).entries()) {
    const timeline = normalizeTimelineItem(item, index);
    const relativePath = extractDraftPath(timeline.summary);
    if (relativePath !== undefined) {
      refs.push({
        id: `event-draft-${index}-${relativePath}`,
        label: "Draft CSV",
        relativePath,
        source: "event_log_summary"
      });
    }
  }

  const deduped = new Map<string, AppControlPlaneArtifactView>();
  for (const ref of refs) {
    if (!deduped.has(ref.relativePath)) {
      deduped.set(ref.relativePath, ref);
    }
  }
  return Array.from(deduped.values());
}

function extractDraftPath(summary: string): string | undefined {
  const match = /\bdrafts\/[A-Za-z0-9._/-]+\.csv\b/.exec(summary);
  return match?.[0];
}

function latestSummaryForType(
  eventSummary: WorkspaceEventSummary,
  eventType: string
): string | undefined {
  const items = safeArray(eventSummary.timeline).map(normalizeTimelineItem);
  return [...items].reverse().find((item) => item.type === eventType)?.summary;
}

function warningCode(value: string): string | undefined {
  const text = safeText(value, "").trim();
  if (text.length === 0) {
    return undefined;
  }
  if (!/^[A-Z0-9_.-]{1,64}$/.test(text)) {
    return "EVENT_SUMMARY_WARNING";
  }
  return text;
}

function dedupeWarnings(
  warnings: readonly AppControlPlaneWarningView[]
): AppControlPlaneWarningView[] {
  return Array.from(
    new Map(warnings.map((warning) => [warning.code, warning])).values()
  );
}

function nextActionFor(input: {
  status: AppControlPlaneProjectionStatus;
  runStatus: AppControlPlaneRunCard["runStatus"];
  fileExistsWarning: boolean;
  preflightWarning: boolean;
  eventOk: boolean;
  draftEventCount: number;
}): AppControlPlaneNextAction {
  if (input.preflightWarning) {
    return {
      label: "Fix runner preflight before Convert.",
      severity: "warning"
    };
  }
  if (input.fileExistsWarning) {
    return {
      label: "Choose a new draft filename or remove the existing file.",
      severity: "warning"
    };
  }
  if (!input.eventOk || input.status === "error") {
    return {
      label: "Review the safe event summary message and refresh events.",
      severity: "error"
    };
  }
  if (input.runStatus === "completed") {
    return {
      label: "Review the draft CSV and Event Log / Replay summary.",
      severity: "info"
    };
  }
  if (input.draftEventCount > 0) {
    return {
      label: "Draft event recorded. Real run creation is still disabled.",
      severity: "info"
    };
  }
  return {
    label: "Refresh events after Convert completes.",
    severity: "info"
  };
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
