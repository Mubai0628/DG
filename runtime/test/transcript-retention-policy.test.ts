import { describe, expect, it } from "vitest";

import {
  buildTranscriptDeletePlan,
  buildTranscriptExportPlan,
  buildTranscriptRetentionPlan,
  summarizeTranscriptRetentionPlan,
  type TranscriptRecord,
  type TranscriptRetentionPlan
} from "../src/index.js";

function transcript(
  transcriptId: string,
  createdAt: string,
  overrides: Partial<TranscriptRecord> = {}
): TranscriptRecord {
  return {
    schemaVersion: "transcript_record.v1",
    transcriptId,
    sessionId: `session-${transcriptId}`,
    sessionRef: {
      sessionId: `session-${transcriptId}`,
      mode: "approval_mode",
      workspaceRootRef: "workspace:demo"
    },
    workspaceRootRef: "workspace:demo",
    mode: "approval_mode",
    sourceKind: "shell_safe_lane",
    visibility: "summary_only",
    rawOptIn: false,
    chunks: [
      {
        chunkId: `${transcriptId}-chunk-1`,
        kind: "command_summary",
        summary: "Fixed command completed with summary-only transcript output.",
        byteCount: 128,
        lineCount: 2,
        redacted: true,
        rawAvailable: false,
        warningCodes: []
      }
    ],
    redactionSummary: {
      scanned: true,
      redactedFieldCount: 1,
      secretMarkerCount: 0,
      controlCharCount: 0,
      binaryChunkCount: 0,
      warningCodes: []
    },
    retentionPolicy: {
      retainDays: 14,
      exportAllowed: true,
      deleteAllowed: true,
      tombstoneOnDelete: true
    },
    hashes: {
      recordHash: `${transcriptId}-hash`,
      redactedOutputHash: `${transcriptId}-redacted-hash`
    },
    createdAt,
    source: "runtime_transcript_store_schema",
    ...overrides
  };
}

function expectNoExecution(plan: TranscriptRetentionPlan): void {
  expect(plan.readiness).toMatchObject({
    canExecuteBulkDelete: false,
    canRecursiveDelete: false,
    canDeleteOutsideTranscriptStore: false,
    canExportRawTranscript: false,
    canUploadCloud: false,
    canUploadTelemetry: false,
    canWriteEventStore: false,
    canWriteWorkspace: false,
    canExecuteCommand: false,
    canRunShell: false,
    canApplyPatch: false,
    canRollback: false,
    canCommitGit: false,
    canPushGit: false,
    appCanExecute: false
  });
}

function codes(plan: TranscriptRetentionPlan): string[] {
  return plan.findings.map((finding) => finding.code);
}

describe("transcript retention policy", () => {
  it("computes retention eligible transcript ids", () => {
    const plan = buildTranscriptRetentionPlan({
      now: "2026-07-06T00:00:00.000Z",
      transcripts: [
        transcript("transcript-old", "2026-06-01T00:00:00.000Z"),
        transcript("transcript-new", "2026-07-01T00:00:00.000Z")
      ]
    });

    expect(plan.status).toBe("ready");
    expect(plan.eligibleDeleteIds).toEqual(["transcript-old"]);
    expect(plan.records).toHaveLength(2);
    expectNoExecution(plan);
  });

  it("builds summary-only export plans", () => {
    const plan = buildTranscriptExportPlan({
      now: "2026-07-06T00:00:00.000Z",
      requestedTranscriptIds: ["transcript-export"],
      transcripts: [transcript("transcript-export", "2026-06-01T00:00:00.000Z")]
    });
    const summary = summarizeTranscriptRetentionPlan(plan);
    const serialized = JSON.stringify(plan);

    expect(plan.status).toBe("ready");
    expect(plan.exportSummaryIds).toEqual(["transcript-export"]);
    expect(plan.rawExportIncluded).toBe(false);
    expect(summary.exportSummaryCount).toBe(1);
    expect(serialized).not.toContain("raw output body");
    expect(serialized).not.toContain("Authorization:");
    expect(serialized).not.toContain("sk-");
    expectNoExecution(plan);
  });

  it("builds dry-run delete plans without bulk execution", () => {
    const plan = buildTranscriptDeletePlan({
      now: "2026-07-06T00:00:00.000Z",
      requestedTranscriptIds: ["transcript-delete"],
      transcripts: [transcript("transcript-delete", "2026-06-01T00:00:00.000Z")]
    });

    expect(plan.status).toBe("ready");
    expect(plan.deleteDryRunOnly).toBe(true);
    expect(plan.bulkDeleteDisabled).toBe(true);
    expect(plan.singleTranscriptDeleteCommandAvailable).toBe(true);
    expect(plan.readiness.canRequestSingleTranscriptDelete).toBe(true);
    expectNoExecution(plan);
  });

  it("blocks raw export by default", () => {
    const plan = buildTranscriptExportPlan({
      exportMode: "raw",
      transcripts: [transcript("transcript-raw", "2026-06-01T00:00:00.000Z")]
    });

    expect(plan.status).toBe("blocked");
    expect(codes(plan)).toContain("RAW_EXPORT_BLOCKED");
    expect(plan.exportSummaryIds).toEqual([]);
    expectNoExecution(plan);
  });

  it("blocks negative retention days", () => {
    const plan = buildTranscriptRetentionPlan({
      transcripts: [
        transcript("transcript-negative", "2026-06-01T00:00:00.000Z", {
          retentionPolicy: {
            retainDays: -1,
            exportAllowed: true,
            deleteAllowed: true,
            tombstoneOnDelete: true
          }
        })
      ]
    });

    expect(plan.status).toBe("blocked");
    expect(codes(plan)).toContain("NEGATIVE_RETENTION_DAYS");
    expectNoExecution(plan);
  });

  it("blocks protected transcript delete requests", () => {
    const plan = buildTranscriptDeletePlan({
      now: "2026-07-06T00:00:00.000Z",
      requestedTranscriptIds: ["transcript-protected"],
      protectedTranscriptIds: ["transcript-protected"],
      transcripts: [transcript("transcript-protected", "2026-06-01T00:00:00.000Z")]
    });

    expect(plan.status).toBe("blocked");
    expect(codes(plan)).toContain("PROTECTED_TRANSCRIPT_BLOCKED");
    expect(plan.eligibleDeleteIds).toEqual([]);
    expectNoExecution(plan);
  });

  it("blocks path-based delete and export operations", () => {
    const deletePlan = buildTranscriptDeletePlan({
      deletePath: "../outside/transcript.json",
      transcripts: [transcript("transcript-path", "2026-06-01T00:00:00.000Z")]
    });
    const exportPlan = buildTranscriptExportPlan({
      exportPath: "D:/outside/export.json",
      transcripts: [transcript("transcript-export-path", "2026-06-01T00:00:00.000Z")]
    });

    expect(deletePlan.status).toBe("blocked");
    expect(exportPlan.status).toBe("blocked");
    expect(codes(deletePlan)).toContain("deletePath_FIELD_REJECTED");
    expect(codes(exportPlan)).toContain("exportPath_FIELD_REJECTED");
    expect(codes(deletePlan)).toContain("PATH_BASED_OPERATION_BLOCKED");
    expectNoExecution(deletePlan);
    expectNoExecution(exportPlan);
  });

  it("blocks recursive and bulk delete execution attempts", () => {
    const plan = buildTranscriptDeletePlan({
      recursiveDelete: true,
      allowBulkDeleteExecution: true,
      transcripts: [transcript("transcript-recursive", "2026-06-01T00:00:00.000Z")]
    });

    expect(plan.status).toBe("blocked");
    expect(codes(plan)).toContain("recursiveDelete_FIELD_REJECTED");
    expect(codes(plan)).toContain("RECURSIVE_DELETE_BLOCKED");
    expect(codes(plan)).toContain("BULK_DELETE_EXECUTION_BLOCKED");
    expectNoExecution(plan);
  });

  it("returns empty safely without transcripts", () => {
    const plan = buildTranscriptRetentionPlan();

    expect(plan.status).toBe("empty");
    expect(plan.transcriptCount).toBe(0);
    expect(plan.eligibleDeleteIds).toEqual([]);
    expectNoExecution(plan);
  });

  it("produces deterministic ids and hashes with injected id and clock", () => {
    const first = buildTranscriptRetentionPlan({
      now: "2026-07-06T00:00:00.000Z",
      createdAt: "2026-07-06T00:00:00.000Z",
      idGenerator: () => "retention-plan-test",
      transcripts: [transcript("transcript-deterministic", "2026-06-01T00:00:00.000Z")]
    });
    const second = buildTranscriptRetentionPlan({
      now: "2026-07-06T00:00:00.000Z",
      createdAt: "2026-07-06T00:00:00.000Z",
      idGenerator: () => "retention-plan-test",
      transcripts: [transcript("transcript-deterministic", "2026-06-01T00:00:00.000Z")]
    });

    expect(first.planId).toBe("retention-plan-test");
    expect(first.planHash).toBe(second.planHash);
    expectNoExecution(first);
  });
});
