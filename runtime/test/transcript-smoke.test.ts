import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildTranscriptDeletePlan,
  buildTranscriptExportPlan,
  buildTranscriptRedactionAudit,
  buildTranscriptReplayProjection,
  buildTranscriptRetentionPlan,
  parseTranscriptRecord,
  summarizeTranscriptRecord,
  validateTranscriptRecord,
  type TranscriptRecord
} from "../src/index.js";

type SmokeFixture = {
  schemaVersion: "transcript_smoke.v1";
  safeTranscripts: Record<string, unknown>[];
  blockedTranscripts: Array<{
    name: string;
    record: Record<string, unknown>;
  }>;
};

const fixturePath = path.join(
  import.meta.dirname,
  "fixtures",
  "transcripts",
  "transcript-smoke.json"
);

async function loadFixture(): Promise<SmokeFixture> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as SmokeFixture;
}

function expectNoExecution(readiness: Record<string, unknown>): void {
  for (const key of [
    "canReplayCommand",
    "canViewRawOutput",
    "canWriteEventStore",
    "canExecuteCommand",
    "canRunShell",
    "canExecuteGit",
    "canApplyPatch",
    "canRollback",
    "canDeleteFiles",
    "canCommitGit",
    "canPushGit",
    "canStartAutonomousLoop",
    "canRecursiveDelete",
    "canExecuteBulkDelete",
    "canUploadCloud",
    "canUploadTelemetry",
    "appCanExecute"
  ]) {
    if (key in readiness) {
      expect(readiness[key]).toBe(false);
    }
  }
}

function replayEvent(
  record: TranscriptRecord,
  type: string
): Record<string, unknown> {
  const summary = summarizeTranscriptRecord(record);
  return {
    id: `${summary.transcriptId}-${type}`,
    type,
    ts: record.createdAt,
    payload: {
      transcriptId: summary.transcriptId,
      sourceKind: summary.sourceKind,
      chunkCount: summary.chunkCount,
      byteCount: summary.byteCount,
      lineCount: summary.lineCount,
      redactedFieldCount: summary.redactedFieldCount,
      secretMarkerCount: summary.secretMarkerCount,
      retainDays: summary.retainDays,
      rawRetentionDays: summary.rawRetentionDays,
      exportAllowed: summary.exportAllowed,
      deleteAllowed: summary.deleteAllowed,
      tombstoneOnDelete: summary.tombstoneOnDelete,
      transcriptHash: record.hashes.recordHash,
      warningCodes: summary.warningCodes,
      summaryOnly: true,
      rawContentIncluded: false,
      noRawOutput: true
    }
  };
}

describe("transcript persistence smoke", () => {
  it("parses all safe smoke fixtures", async () => {
    const fixture = await loadFixture();
    const parsed = fixture.safeTranscripts.map((record) =>
      parseTranscriptRecord(record)
    );

    expect(fixture.schemaVersion).toBe("transcript_smoke.v1");
    expect(parsed).toHaveLength(6);
    expect(parsed.map((result) => result.status)).toEqual([
      "parsed",
      "parsed",
      "parsed",
      "parsed",
      "parsed",
      "parsed"
    ]);
    expect(parsed.map((result) => result.summary.sourceKind)).toEqual([
      "shell_safe_lane",
      "git_safe_lane",
      "approved_apply",
      "approved_rollback",
      "mcp_readonly_tool",
      "desktop_action"
    ]);
    parsed.forEach((result) => expectNoExecution(result.readiness));
  });

  it("passes redaction audit for safe smoke transcript replay", async () => {
    const fixture = await loadFixture();
    const transcripts = fixture.safeTranscripts.map((record) => {
      const result = parseTranscriptRecord(record);
      if (result.transcript === undefined) {
        throw new Error("expected safe smoke transcript to parse");
      }
      return result.transcript;
    });
    const projection = buildTranscriptReplayProjection({
      events: transcripts.flatMap((record) => [
        replayEvent(record, "transcript.record.created"),
        replayEvent(record, "transcript.record.exported_summary")
      ]),
      idGenerator: () => "transcript-smoke-replay"
    });
    const audit = buildTranscriptRedactionAudit({
      projection,
      idGenerator: () => "transcript-smoke-redaction-audit"
    });
    const serialized = JSON.stringify({ projection, audit });

    expect(projection.status).toBe("projected");
    expect(projection.eventCount).toBe(12);
    expect(projection.exportedSummaryCount).toBe(6);
    expect(audit.status).toBe("audit_ready");
    expect(audit.rawOutputDetected).toBe(false);
    expect(audit.apiKeyDetected).toBe(false);
    expect(serialized).not.toContain("Synthetic raw prompt fixture");
    expect(serialized).not.toContain("obvious-fake-key-fixture");
    expectNoExecution(projection.readiness);
    expectNoExecution(audit.readiness);
  });

  it("blocks raw and secret smoke fixtures without echoing unsafe values", async () => {
    const fixture = await loadFixture();
    const results = fixture.blockedTranscripts.map(({ record }) =>
      validateTranscriptRecord(record)
    );
    const serialized = JSON.stringify(results);

    expect(results.map((result) => result.status)).toEqual([
      "blocked",
      "blocked"
    ]);
    expect(results[0]?.findings.map((finding) => finding.code)).toContain(
      "RAW_PROMPT_FIELD_REJECTED"
    );
    expect(results[1]?.findings.map((finding) => finding.code)).toContain(
      "API_KEY_FIELD_REJECTED"
    );
    expect(serialized).not.toContain("Synthetic raw prompt fixture");
    expect(serialized).not.toContain("obvious-fake-key-fixture");
    results.forEach((result) => expectNoExecution(result.readiness));
  });

  it("computes retention export and delete dry-run summaries", async () => {
    const fixture = await loadFixture();
    const transcripts = fixture.safeTranscripts.map((record) => {
      const result = parseTranscriptRecord(record);
      if (result.transcript === undefined) {
        throw new Error("expected safe smoke transcript to parse");
      }
      return result.transcript;
    });
    const requestedTranscriptIds = transcripts
      .slice(0, 2)
      .map((record) => record.transcriptId);
    const retention = buildTranscriptRetentionPlan({
      now: "2026-08-01T00:00:00.000Z",
      transcripts
    });
    const exportPlan = buildTranscriptExportPlan({
      now: "2026-08-01T00:00:00.000Z",
      requestedTranscriptIds,
      transcripts
    });
    const deletePlan = buildTranscriptDeletePlan({
      now: "2026-08-01T00:00:00.000Z",
      requestedTranscriptIds,
      transcripts
    });

    expect(retention.status).toBe("ready");
    expect(retention.eligibleDeleteIds).toHaveLength(6);
    expect(exportPlan.status).toBe("ready");
    expect(new Set(exportPlan.exportSummaryIds)).toEqual(
      new Set(requestedTranscriptIds)
    );
    expect(exportPlan.rawExportIncluded).toBe(false);
    expect(deletePlan.status).toBe("ready");
    expect(deletePlan.deleteDryRunOnly).toBe(true);
    expect(deletePlan.bulkDeleteDisabled).toBe(true);
    expectNoExecution(retention.readiness);
    expectNoExecution(exportPlan.readiness);
    expectNoExecution(deletePlan.readiness);
  });
});
