import { describe, expect, it } from "vitest";

import {
  normalizeTranscriptRecord,
  parseTranscriptRecord,
  summarizeTranscriptRecord,
  validateTranscriptRecord,
  type TranscriptValidationResult
} from "../src/index.js";

function baseTranscript(): Record<string, unknown> {
  return {
    schemaVersion: "transcript_record.v1",
    transcriptId: "transcript-safe-summary",
    sessionId: "session-v0-35",
    workspaceRootRef: "workspace:demo",
    mode: "approval_mode",
    sourceKind: "shell_safe_lane",
    visibility: "summary_only",
    rawOptIn: false,
    chunks: [
      {
        chunkId: "chunk-1",
        kind: "command_summary",
        summary: "Fixed verification command completed with safe summary.",
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
    hashes: {},
    createdAt: "2026-07-06T00:00:00.000Z"
  };
}

function codes(result: TranscriptValidationResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: TranscriptValidationResult): void {
  expect(result.readiness).toMatchObject({
    canExecuteCommand: false,
    canRunShell: false,
    canApplyPatch: false,
    canDeleteFiles: false,
    canCommitGit: false,
    canPushGit: false,
    canStartAutonomousLoop: false,
    appCanExecute: false
  });
}

describe("transcript store schema", () => {
  it("parses a safe summary transcript", () => {
    const result = parseTranscriptRecord(baseTranscript());

    expect(result.status).toBe("parsed");
    expect(result.transcript?.transcriptId).toBe("transcript-safe-summary");
    expect(result.summary.chunkCount).toBe(1);
    expect(result.summary.exportAllowed).toBe(true);
    expect(result.readiness.canPersistTranscript).toBe(true);
    expectNoExecution(result);
  });

  it("parses a redacted preview transcript", () => {
    const input = {
      ...baseTranscript(),
      transcriptId: "transcript-redacted-preview",
      visibility: "redacted_preview",
      sourceKind: "git_safe_lane"
    };
    const normalized = normalizeTranscriptRecord(input);
    const summary = summarizeTranscriptRecord(normalized);

    expect(normalized.visibility).toBe("redacted_preview");
    expect(summary.sourceKind).toBe("git_safe_lane");
    expect(summary.warningCodes).toEqual([]);
  });

  it("parses JSON string input", () => {
    const result = parseTranscriptRecord(JSON.stringify(baseTranscript()));

    expect(result.status).toBe("parsed");
    expect(result.summary.transcriptId).toBe("transcript-safe-summary");
    expectNoExecution(result);
  });

  it("requires raw opt-in for raw_available_gated visibility", () => {
    const input = {
      ...baseTranscript(),
      visibility: "raw_available_gated",
      rawOptIn: false,
      chunks: [
        {
          chunkId: "chunk-raw-ref",
          kind: "stdout",
          summary: "Raw output is gated by policy and not displayed here.",
          byteCount: 64,
          lineCount: 1,
          redacted: true,
          rawAvailable: true,
          warningCodes: []
        }
      ],
      retentionPolicy: {
        retainDays: 14,
        rawRetentionDays: 1,
        exportAllowed: true,
        deleteAllowed: true,
        tombstoneOnDelete: true
      }
    };
    const result = validateTranscriptRecord(input);

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain("RAW_AVAILABLE_REQUIRES_OPT_IN");
    expect(result.readiness.canViewRawTranscript).toBe(false);
    expectNoExecution(result);
  });

  it("allows gated raw availability metadata when all gates are present", () => {
    const input = {
      ...baseTranscript(),
      visibility: "raw_available_gated",
      rawOptIn: true,
      chunks: [
        {
          chunkId: "chunk-raw-ref",
          kind: "stdout",
          summary: "Raw output is gated by policy and not displayed here.",
          byteCount: 64,
          lineCount: 1,
          redacted: true,
          rawAvailable: true,
          warningCodes: []
        }
      ],
      retentionPolicy: {
        retainDays: 14,
        rawRetentionDays: 1,
        exportAllowed: true,
        deleteAllowed: true,
        tombstoneOnDelete: true
      }
    };
    const result = validateTranscriptRecord(input);

    expect(result.status).toBe("parsed");
    expect(result.summary.rawAvailableChunkCount).toBe(1);
    expect(result.readiness.canViewRawTranscript).toBe(true);
    expect(result.readiness.canExportRawTranscript).toBe(true);
    expectNoExecution(result);
  });

  it("blocks secret markers without echoing them", () => {
    const input = baseTranscript();
    input.chunks = [
      {
        chunkId: "chunk-secret",
        kind: "stdout",
        summary: "Synthetic key sk-test1234567890 must be blocked.",
        byteCount: 64,
        lineCount: 1,
        redacted: true,
        rawAvailable: false,
        warningCodes: []
      }
    ];
    const result = validateTranscriptRecord(input);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain("API_KEY_MARKER");
    expect(serialized).not.toContain("sk-test1234567890");
    expectNoExecution(result);
  });

  it("blocks raw prompt and response fields", () => {
    const rawPromptResult = validateTranscriptRecord({
      ...baseTranscript(),
      rawPrompt: "Synthetic raw prompt must not persist."
    });
    const rawResponseResult = validateTranscriptRecord({
      ...baseTranscript(),
      rawResponse: "Synthetic raw response must not persist."
    });

    expect(rawPromptResult.status).toBe("blocked");
    expect(rawResponseResult.status).toBe("blocked");
    expect(codes(rawPromptResult)).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(codes(rawResponseResult)).toContain("RAW_RESPONSE_FIELD_REJECTED");
    expect(
      JSON.stringify({ rawPromptResult, rawResponseResult })
    ).not.toContain("Synthetic raw");
    expectNoExecution(rawPromptResult);
    expectNoExecution(rawResponseResult);
  });

  it("blocks reasoning_content fields", () => {
    const result = validateTranscriptRecord({
      ...baseTranscript(),
      reasoning_content: "Synthetic reasoning text must not persist."
    });

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain("REASONING_CONTENT_FIELD_REJECTED");
    expect(JSON.stringify(result)).not.toContain("Synthetic reasoning");
    expectNoExecution(result);
  });

  it("redacts and warns on ANSI or control characters", () => {
    const input = baseTranscript();
    input.chunks = [
      {
        chunkId: "chunk-ansi",
        kind: "stderr",
        summary: "safe\u001b[31m warning\u001f",
        byteCount: 20,
        lineCount: 1,
        redacted: true,
        rawAvailable: false,
        warningCodes: []
      }
    ];
    const result = validateTranscriptRecord(input);

    expect(result.status).toBe("warning");
    expect(codes(result)).toContain("CONTROL_CHARS_REDACTED");
    expect(result.transcript?.chunks[0]?.summary).toBe("safe warning");
    expect(JSON.stringify(result)).not.toContain("\u001b[31m");
    expectNoExecution(result);
  });

  it("warns on binary-looking chunks", () => {
    const input = baseTranscript();
    input.chunks = [
      {
        chunkId: "chunk-binary",
        kind: "stdout",
        summary: "Binary output omitted; hash only.",
        byteCount: 1024,
        lineCount: 1,
        redacted: true,
        rawAvailable: false,
        binary: true,
        warningCodes: []
      }
    ];
    const result = validateTranscriptRecord(input);

    expect(result.status).toBe("warning");
    expect(result.summary.warningCodes).toContain("BINARY_OUTPUT_SUMMARY_ONLY");
    expectNoExecution(result);
  });

  it("blocks huge chunks", () => {
    const input = baseTranscript();
    input.chunks = [
      {
        chunkId: "chunk-huge",
        kind: "stdout",
        summary: "x".repeat(5001),
        byteCount: 5001,
        lineCount: 1,
        redacted: true,
        rawAvailable: false,
        warningCodes: []
      }
    ];
    const result = validateTranscriptRecord(input);

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain("HUGE_CHUNK_SUMMARY");
    expectNoExecution(result);
  });

  it("validates retention policy", () => {
    const input = {
      ...baseTranscript(),
      retentionPolicy: {
        retainDays: -1,
        exportAllowed: true,
        deleteAllowed: false,
        tombstoneOnDelete: true
      }
    };
    const result = validateTranscriptRecord(input);

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain("NEGATIVE_RETAIN_DAYS");
    expectNoExecution(result);
  });

  it("summarizes export and delete policy", () => {
    const input = {
      ...baseTranscript(),
      retentionPolicy: {
        retainDays: 7,
        exportAllowed: false,
        deleteAllowed: true,
        tombstoneOnDelete: true
      }
    };
    const result = validateTranscriptRecord(input);

    expect(result.status).toBe("parsed");
    expect(result.summary.retainDays).toBe(7);
    expect(result.summary.exportAllowed).toBe(false);
    expect(result.summary.deleteAllowed).toBe(true);
    expect(result.summary.tombstoneOnDelete).toBe(true);
    expectNoExecution(result);
  });

  it("keeps all execution readiness flags false", () => {
    const result = validateTranscriptRecord(baseTranscript());

    expectNoExecution(result);
  });

  it("produces deterministic hashes with injected id and clock", () => {
    const input = baseTranscript();
    delete input.transcriptId;

    const first = validateTranscriptRecord(input, {
      createdAt: "2026-07-06T01:00:00.000Z",
      idGenerator: () => "generated-transcript"
    });
    const second = validateTranscriptRecord(input, {
      createdAt: "2026-07-06T01:00:00.000Z",
      idGenerator: () => "generated-transcript"
    });

    expect(first.status).toBe("warning");
    expect(codes(first)).toContain("MISSING_TRANSCRIPT_ID");
    expect(first.transcript?.transcriptId).toBe("generated-transcript");
    expect(first.normalizedHash).toBe(second.normalizedHash);
    expect(first.summary.hash).toBe(second.summary.hash);
    expectNoExecution(first);
  });
});
