import { describe, expect, it } from "vitest";

import {
  buildTranscriptReplayProjection,
  summarizeTranscriptReplayProjection,
  type TranscriptReplayProjection
} from "../src/index.js";

function event(type: string, transcriptId: string): Record<string, unknown> {
  return {
    id: `${transcriptId}-${type}`,
    type,
    ts: "2026-07-06T00:00:00.000Z",
    payload: {
      transcriptId,
      sourceKind: "shell_safe_lane",
      chunkCount: 2,
      byteCount: 256,
      lineCount: 4,
      redactedFieldCount: 2,
      secretMarkerCount: 0,
      retainDays: 14,
      exportAllowed: true,
      deleteAllowed: true,
      tombstoneOnDelete: true,
      transcriptHash: `${transcriptId}-hash`,
      warningCodes: [],
      summaryOnly: true,
      rawContentIncluded: false,
      noRawOutput: true
    }
  };
}

function expectNoExecution(projection: TranscriptReplayProjection): void {
  expect(projection.readiness).toMatchObject({
    canReplayCommand: false,
    canViewRawOutput: false,
    canWriteEventStore: false,
    canExecuteCommand: false,
    canRunShell: false,
    canExecuteGit: false,
    canApplyPatch: false,
    canRollback: false,
    appCanExecute: false
  });
}

describe("transcript replay projection", () => {
  it("projects transcript created deleted and exported summary events", () => {
    const projection = buildTranscriptReplayProjection({
      events: [
        event("transcript.record.created", "transcript-1"),
        event("transcript.record.deleted", "transcript-1"),
        event("transcript.record.exported_summary", "transcript-1")
      ],
      idGenerator: () => "transcript-replay-test"
    });
    const summary = summarizeTranscriptReplayProjection(projection);
    const serialized = JSON.stringify(projection);

    expect(projection.status).toBe("projected");
    expect(projection.projectionId).toBe("transcript-replay-test");
    expect(projection.eventCount).toBe(3);
    expect(projection.createdCount).toBe(1);
    expect(projection.deletedCount).toBe(1);
    expect(projection.exportedSummaryCount).toBe(1);
    expect(projection.transcriptIds).toEqual(["transcript-1"]);
    expect(summary.latestTranscriptSummary).toContain("transcript summary exported");
    expect(serialized).not.toContain("raw output body");
    expect(serialized).not.toContain("Authorization:");
    expect(serialized).not.toContain("sk-");
    expectNoExecution(projection);
  });

  it("blocks raw transcript event payloads", () => {
    const baseEvent = event("transcript.record.created", "transcript-raw");
    const projection = buildTranscriptReplayProjection({
      events: [
        {
          ...baseEvent,
          payload: {
            ...(baseEvent.payload as Record<string, unknown>),
            rawOutput: "synthetic raw output body"
          }
        }
      ]
    });

    expect(projection.status).toBe("blocked");
    expect(projection.findings.map((finding) => finding.code)).toContain(
      "rawOutput_FIELD_REJECTED"
    );
    expect(JSON.stringify(projection)).not.toContain("synthetic raw output body");
    expectNoExecution(projection);
  });

  it("blocks unsupported transcript events", () => {
    const projection = buildTranscriptReplayProjection({
      events: [event("transcript.record.raw_exported", "transcript-unsupported")]
    });

    expect(projection.status).toBe("blocked");
    expect(projection.findings.map((finding) => finding.code)).toContain(
      "UNSUPPORTED_TRANSCRIPT_EVENT"
    );
    expectNoExecution(projection);
  });

  it("returns empty safely without events", () => {
    const projection = buildTranscriptReplayProjection();

    expect(projection.status).toBe("empty");
    expect(projection.eventCount).toBe(0);
    expectNoExecution(projection);
  });

  it("keeps deterministic hashes with injected ids", () => {
    const first = buildTranscriptReplayProjection({
      events: [event("transcript.record.created", "transcript-deterministic")],
      createdAt: "2026-07-06T00:00:00.000Z",
      idGenerator: () => "transcript-replay-deterministic"
    });
    const second = buildTranscriptReplayProjection({
      events: [event("transcript.record.created", "transcript-deterministic")],
      createdAt: "2026-07-06T00:00:00.000Z",
      idGenerator: () => "transcript-replay-deterministic"
    });

    expect(first.projectionHash).toBe(second.projectionHash);
    expectNoExecution(first);
  });
});
