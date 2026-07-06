import { describe, expect, it } from "vitest";

import {
  buildTranscriptRedactionAudit,
  buildTranscriptReplayProjection,
  summarizeTranscriptRedactionAudit,
  type TranscriptRedactionAudit
} from "../src/index.js";

function safeProjection() {
  return buildTranscriptReplayProjection({
    events: [
      {
        id: "transcript-event-1",
        type: "transcript.record.created",
        payload: {
          transcriptId: "transcript-audit-safe",
          sourceKind: "shell_safe_lane",
          chunkCount: 1,
          byteCount: 128,
          lineCount: 2,
          redactedFieldCount: 1,
          secretMarkerCount: 0,
          retainDays: 14,
          exportAllowed: true,
          deleteAllowed: true,
          tombstoneOnDelete: true,
          transcriptHash: "transcript-audit-hash",
          warningCodes: [],
          summaryOnly: true,
          rawContentIncluded: false,
          noRawOutput: true
        }
      }
    ]
  });
}

function expectNoExecution(audit: TranscriptRedactionAudit): void {
  expect(audit.readiness).toMatchObject({
    canPersistRawOutput: false,
    canReplayCommand: false,
    canWriteEventStore: false,
    canExecuteCommand: false,
    canRunShell: false,
    canExecuteGit: false,
    canApplyPatch: false,
    canRollback: false,
    appCanExecute: false
  });
}

describe("transcript redaction audit", () => {
  it("passes safe transcript replay summaries", () => {
    const audit = buildTranscriptRedactionAudit({
      projection: safeProjection(),
      idGenerator: () => "transcript-audit-test"
    });
    const summary = summarizeTranscriptRedactionAudit(audit);
    const serialized = JSON.stringify(audit);

    expect(audit.status).toBe("audit_ready");
    expect(audit.auditId).toBe("transcript-audit-test");
    expect(audit.scannedRecordCount).toBe(1);
    expect(audit.redactedFieldCount).toBe(1);
    expect(summary.rawOutputDetected).toBe(false);
    expect(serialized).not.toContain("raw output body");
    expect(serialized).not.toContain("Authorization:");
    expect(serialized).not.toContain("sk-");
    expectNoExecution(audit);
  });

  it("blocks raw stdout and stderr fields", () => {
    const audit = buildTranscriptRedactionAudit({
      artifacts: [
        { stdout: "synthetic raw stdout", stderr: "synthetic raw stderr" }
      ]
    });

    expect(audit.status).toBe("blocked");
    expect(audit.rawOutputDetected).toBe(true);
    expect(audit.findings.map((finding) => finding.code)).toContain(
      "stdout_FIELD_REJECTED"
    );
    expect(JSON.stringify(audit)).not.toContain("synthetic raw stdout");
    expectNoExecution(audit);
  });

  it("blocks API key and Authorization markers", () => {
    const audit = buildTranscriptRedactionAudit({
      artifacts: [
        {
          summary: "Synthetic sk-test1234567890 and Authorization: secret"
        }
      ]
    });

    expect(audit.status).toBe("blocked");
    expect(audit.apiKeyDetected).toBe(true);
    expect(audit.authorizationDetected).toBe(true);
    expect(JSON.stringify(audit)).not.toContain("sk-test1234567890");
    expect(JSON.stringify(audit)).not.toContain("Authorization: secret");
    expectNoExecution(audit);
  });

  it("blocks raw prompt response reasoning source diff and binary markers", () => {
    const audit = buildTranscriptRedactionAudit({
      artifacts: [
        {
          rawPrompt: "synthetic raw prompt",
          rawResponse: "synthetic raw response",
          reasoning_content: "synthetic reasoning",
          rawSource: "synthetic source",
          rawDiff: "synthetic diff",
          binaryOutput: true
        }
      ]
    });

    expect(audit.status).toBe("blocked");
    expect(audit.rawPromptDetected).toBe(true);
    expect(audit.rawResponseDetected).toBe(true);
    expect(audit.reasoningContentDetected).toBe(true);
    expect(audit.binaryOutputDetected).toBe(true);
    expect(JSON.stringify(audit)).not.toContain("synthetic raw prompt");
    expectNoExecution(audit);
  });

  it("warns when replay summaries report redacted secret markers", () => {
    const projection = safeProjection();
    const firstEvent = projection.events[0];
    if (firstEvent === undefined) {
      throw new Error("expected safe projection event");
    }
    projection.events[0] = {
      ...firstEvent,
      secretMarkerCount: 1
    };
    const audit = buildTranscriptRedactionAudit({ projection });

    expect(audit.status).toBe("warning");
    expect(audit.secretMarkerCount).toBe(1);
    expect(audit.findings.map((finding) => finding.code)).toContain(
      "TRANSCRIPT_SECRET_MARKERS_REDACTED"
    );
    expectNoExecution(audit);
  });

  it("returns empty safely without input", () => {
    const audit = buildTranscriptRedactionAudit();

    expect(audit.status).toBe("empty");
    expect(audit.scannedRecordCount).toBe(0);
    expectNoExecution(audit);
  });
});
