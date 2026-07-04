import {
  buildCrossSurfaceReplayAuditTimeline,
  type CrossSurfaceReplayAuditTimeline,
  type CrossSurfaceReplayTimelineItem
} from "../../runtime/src/workflows/cross-surface-replay-audit.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type CrossSurfaceReplayTimelineViewStatus =
  | "empty"
  | "timeline_ready"
  | "warning"
  | "blocked";

export type CrossSurfaceReplayTimelineView = {
  status: CrossSurfaceReplayTimelineViewStatus;
  timelineId: string;
  stageCount: number;
  presentStageCount: number;
  missingCriticalStageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  items: CrossSurfaceReplayTimelineItem[];
  findingCodes: string[];
  hashPrefix?: string | undefined;
  readiness: CrossSurfaceReplayAuditTimeline["readiness"];
  nextAction: string;
  source: "app_cross_surface_replay_timeline";
};

export type CrossSurfaceReplayTimelineViewSummary = {
  status: CrossSurfaceReplayTimelineViewStatus;
  timelineId: string;
  stageCount: number;
  presentStageCount: number;
  missingCriticalStageCount: number;
  blockerCount: number;
  warningCount: number;
  hashPrefix: string;
  nextAction: string;
  source: "app_cross_surface_replay_timeline";
};

export type CrossSurfaceReplayTimelineViewInput = {
  timelineJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildCrossSurfaceReplayTimelineView(
  input: CrossSurfaceReplayTimelineViewInput = {}
): CrossSurfaceReplayTimelineView {
  const text = input.timelineJsonText ?? "";
  if (text.trim().length === 0) {
    return fromTimeline(buildCrossSurfaceReplayAuditTimeline(), "empty");
  }
  const parsed = parseTimelineJson(text);
  if (!parsed.ok) {
    const empty = buildCrossSurfaceReplayAuditTimeline();
    return {
      ...fromTimeline(empty, "blocked"),
      timelineId: "cross-surface-replay-parse-blocked",
      blockerCount: 1,
      findingCount: 1,
      findingCodes: ["INVALID_TIMELINE_JSON"],
      nextAction: parsed.safeMessage
    };
  }
  const timeline = buildCrossSurfaceReplayAuditTimeline({
    timelineRefs: Array.isArray(parsed.value)
      ? parsed.value
      : Array.isArray(parsed.value.timelineRefs)
        ? parsed.value.timelineRefs
        : [],
    sourceKind:
      input.sourceKind === "paste" ? "app_preview" : (input.sourceKind ?? "app_preview"),
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  return fromTimeline(timeline);
}

export function summarizeCrossSurfaceReplayTimelineView(
  view: CrossSurfaceReplayTimelineView
): CrossSurfaceReplayTimelineViewSummary {
  return {
    status: view.status,
    timelineId: view.timelineId,
    stageCount: view.stageCount,
    presentStageCount: view.presentStageCount,
    missingCriticalStageCount: view.missingCriticalStageCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix ?? "n/a",
    nextAction: view.nextAction,
    source: "app_cross_surface_replay_timeline"
  };
}

function fromTimeline(
  timeline: CrossSurfaceReplayAuditTimeline,
  forcedStatus?: CrossSurfaceReplayTimelineViewStatus
): CrossSurfaceReplayTimelineView {
  return {
    status: forcedStatus ?? timeline.status,
    timelineId: timeline.timelineId,
    stageCount: timeline.stageCount,
    presentStageCount: timeline.presentStageCount,
    missingCriticalStageCount: timeline.missingCriticalStageCount,
    blockerCount: timeline.blockerCount,
    warningCount: timeline.warningCount,
    findingCount: timeline.findingCount,
    items: timeline.items,
    findingCodes: timeline.findings.map((finding) =>
      safeCode(finding.code)
    ),
    hashPrefix: timeline.timelineHash.slice(0, 16),
    readiness: timeline.readiness,
    nextAction: timeline.nextAction,
    source: "app_cross_surface_replay_timeline"
  };
}

function parseTimelineJson(text: string):
  | { ok: true; value: Record<string, unknown> | Record<string, unknown>[] }
  | { ok: false; safeMessage: string } {
  try {
    const value = JSON.parse(text) as unknown;
    if (
      Array.isArray(value) ||
      (value !== null && typeof value === "object")
    ) {
      return {
        ok: true,
        value: value as Record<string, unknown> | Record<string, unknown>[]
      };
    }
    return {
      ok: false,
      safeMessage: "Replay timeline JSON must be an object or array."
    };
  } catch (caught) {
    return { ok: false, safeMessage: safeErrorMessage(caught) };
  }
}

function safeCode(value: string): string {
  return safeErrorMessage(safeText(value, "")).replace(/[^A-Z0-9_.-]/gi, "_");
}
