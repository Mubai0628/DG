import { describe, expect, it } from "vitest";

import {
  buildCrossSurfaceReplayAuditTimeline,
  summarizeCrossSurfaceReplayAuditTimeline,
  type CrossSurfaceReplayAuditTimeline,
  type CrossSurfaceReplayStageInput,
  type CrossSurfaceReplayStageKind
} from "../src/workflows/cross-surface-replay-audit.js";

const stages: CrossSurfaceReplayStageKind[] = [
  "objective",
  "proposal",
  "agent_route",
  "knowledge_recall",
  "mcp_evidence",
  "plugin_skill_metadata",
  "desktop_observer",
  "desktop_proposal",
  "desktop_approved_action",
  "workspace_apply",
  "verification",
  "rollback",
  "final_audit"
];

const safeTimelineRefs: CrossSurfaceReplayStageInput[] = stages.map((stage) => ({
  stage,
  refId: `${stage}-ref`,
  status: "summary_ready",
  summary: `${stage} summary ref`,
  hashPrefix: `${stage.slice(0, 4)}1234`
}));

function expectNoExecution(timeline: CrossSurfaceReplayAuditTimeline): void {
  expect(timeline.readiness.canReplayExecution).toBe(false);
  expect(timeline.readiness.canRerunActions).toBe(false);
  expect(timeline.readiness.canWriteEventStore).toBe(false);
  expect(timeline.readiness.canShowRawContent).toBe(false);
  expect(timeline.readiness.canShowRawScreenshotOrOcr).toBe(false);
  expect(timeline.readiness.canShowRawStdoutStderr).toBe(false);
  expect(timeline.readiness.canApplyPatch).toBe(false);
  expect(timeline.readiness.canRollback).toBe(false);
  expect(timeline.readiness.canExecuteDesktopAction).toBe(false);
  expect(timeline.readiness.canExecuteGit).toBe(false);
  expect(timeline.readiness.canExecuteShell).toBe(false);
  expect(timeline.readiness.appCanExecute).toBe(false);
}

describe("cross-surface replay audit timeline", () => {
  it("renders a safe timeline", () => {
    const timeline = buildCrossSurfaceReplayAuditTimeline({
      timelineRefs: safeTimelineRefs,
      sourceKind: "fixture",
      createdAt: "2026-07-04T00:00:00.000Z",
      idGenerator: () => "cross-surface-replay-test"
    });
    const summary = summarizeCrossSurfaceReplayAuditTimeline(timeline);

    expect(timeline.status).toBe("timeline_ready");
    expect(timeline.timelineId).toBe("cross-surface-replay-test");
    expect(timeline.presentStageCount).toBe(13);
    expect(timeline.missingCriticalStageCount).toBe(0);
    expect(timeline.readiness.canRenderTimeline).toBe(true);
    expect(summary.source).toBe("runtime_cross_surface_replay_audit");
    expectNoExecution(timeline);
  });

  it("blocks raw event content", () => {
    const timeline = buildCrossSurfaceReplayAuditTimeline({
      timelineRefs: [
        {
          stage: "objective",
          refId: "raw-event-ref",
          summary: "Safe objective summary.",
          rawEvent: "do not leak raw event"
        }
      ]
    });
    const serialized = JSON.stringify(timeline);

    expect(timeline.status).toBe("blocked");
    expect(timeline.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_RAW_FIELD"
    );
    expect(serialized).not.toContain("do not leak raw event");
    expectNoExecution(timeline);
  });

  it("warns when a critical stage is missing", () => {
    const timeline = buildCrossSurfaceReplayAuditTimeline({
      timelineRefs: safeTimelineRefs.filter((ref) => ref.stage !== "rollback")
    });

    expect(timeline.status).toBe("warning");
    expect(timeline.missingCriticalStages).toContain("rollback");
    expect(timeline.findings.map((finding) => finding.code)).toContain(
      "MISSING_CRITICAL_STAGE"
    );
    expectNoExecution(timeline);
  });

  it("blocks raw screenshot OCR and stdout stderr", () => {
    const timeline = buildCrossSurfaceReplayAuditTimeline({
      timelineRefs: [
        {
          stage: "desktop_observer",
          refId: "desktop-raw-ref",
          summary: "Desktop observer summary.",
          rawScreenshot: "raw screenshot bytes",
          rawOcrText: "raw OCR text",
          stdout: "raw stdout",
          stderr: "raw stderr"
        }
      ]
    });
    const serialized = JSON.stringify(timeline);

    expect(timeline.status).toBe("blocked");
    expect(serialized).not.toContain("raw screenshot bytes");
    expect(serialized).not.toContain("raw OCR text");
    expect(serialized).not.toContain("raw stdout");
    expect(serialized).not.toContain("raw stderr");
    expectNoExecution(timeline);
  });

  it("blocks execution claims", () => {
    const timeline = buildCrossSurfaceReplayAuditTimeline({
      timelineRefs: [
        {
          stage: "workspace_apply",
          refId: "apply-ref",
          summary: "Apply summary.",
          readiness: {
            canReplayExecution: true
          }
        }
      ]
    });

    expect(timeline.status).toBe("blocked");
    expect(timeline.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_FLAG_TRUE"
    );
    expectNoExecution(timeline);
  });

  it("keeps output summary-only and deterministic", () => {
    const first = buildCrossSurfaceReplayAuditTimeline({
      timelineRefs: safeTimelineRefs,
      idGenerator: () => "deterministic-replay",
      createdAt: "2026-07-04T00:00:00.000Z"
    });
    const second = buildCrossSurfaceReplayAuditTimeline({
      timelineRefs: safeTimelineRefs,
      idGenerator: () => "deterministic-replay",
      createdAt: "2026-07-04T00:00:00.000Z"
    });
    const serialized = JSON.stringify(first);

    expect(first.timelineHash).toBe(second.timelineHash);
    expect(serialized).not.toContain("do not leak raw event");
    expect(serialized).not.toContain("raw screenshot bytes");
    expect(serialized).not.toContain("raw OCR text");
    expect(serialized).not.toContain("raw stdout");
    expect(serialized).not.toContain("raw stderr");
    expectNoExecution(first);
  });
});
