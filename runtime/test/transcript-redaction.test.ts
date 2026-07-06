import { describe, expect, it } from "vitest";

import {
  buildTranscriptFromOutput,
  redactTranscriptText,
  summarizeTranscriptRedaction,
  validateTranscriptCaptureInput,
  type TranscriptCaptureResult,
  type TranscriptRedactionResult
} from "../src/index.js";

function expectNoExecution(
  result: TranscriptRedactionResult | TranscriptCaptureResult
): void {
  expect(result.readiness).toMatchObject({
    canPersistRawOutput: false,
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

describe("transcript redaction pipeline", () => {
  it("redacts stdout into a transcript summary", () => {
    const result = buildTranscriptFromOutput({
      transcriptId: "stdout-transcript",
      sessionId: "session-redaction",
      mode: "approval_mode",
      sourceKind: "shell_safe_lane",
      streamKind: "stdout",
      outputText: "PASS\n2 tests completed",
      createdAt: "2026-07-06T00:00:00.000Z"
    });

    expect(result.status).toBe("captured");
    expect(result.transcript?.chunks[0]?.kind).toBe("stdout");
    expect(result.summary.lineCount).toBe(2);
    expect(result.summary.byteCount).toBeGreaterThan(0);
    expect(result.summary.hashPrefix).toHaveLength(16);
    expectNoExecution(result);
  });

  it("redacts stderr into a warning transcript summary", () => {
    const result = buildTranscriptFromOutput({
      transcriptId: "stderr-transcript",
      sessionId: "session-redaction",
      mode: "approval_mode",
      sourceKind: "shell_safe_lane",
      streamKind: "stderr",
      outputText: "Error: failed\n    at runner (index.js:1:1)",
      createdAt: "2026-07-06T00:00:00.000Z"
    });

    expect(result.status).toBe("warning");
    expect(result.transcript?.chunks[0]?.kind).toBe("stderr");
    expect(result.summary.stacktraceDetected).toBe(true);
    expect(result.summary.warningCodes).toContain("STACKTRACE_SUMMARIZED");
    expectNoExecution(result);
  });

  it("redacts fake API key, Authorization, Bearer, URL query, and token-like values", () => {
    const result = redactTranscriptText(
      [
        "sk-test1234567890",
        "Authorization: super-secret-header",
        "Bearer abcdefghijklmnopqrstuvwxyz123456",
        "https://example.test/path?token=secret-query-value",
        "abcdefghijklmnopqrstuvwxyz1234567890TOKEN"
      ].join("\n")
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("warning");
    expect(result.redactedMarkerCount).toBeGreaterThanOrEqual(4);
    expect(result.warningCodes).toContain("API_KEY_REDACTED");
    expect(result.warningCodes).toContain("AUTHORIZATION_REDACTED");
    expect(result.warningCodes).toContain("BEARER_REDACTED");
    expect(result.warningCodes).toContain("URL_QUERY_SECRET_REDACTED");
    expect(result.warningCodes).toContain("TOKEN_LIKE_VALUE_REDACTED");
    expect(serialized).not.toContain("sk-test1234567890");
    expect(serialized).not.toContain("super-secret-header");
    expect(serialized).not.toContain("secret-query-value");
    expect(serialized).not.toContain(
      "abcdefghijklmnopqrstuvwxyz1234567890TOKEN"
    );
    expectNoExecution(result);
  });

  it("blocks private key markers", () => {
    const result = redactTranscriptText(
      "-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----"
    );

    expect(result.status).toBe("blocked");
    expect(result.redactedText).toBe("");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "PRIVATE_KEY_MARKER_BLOCKED"
    );
    expectNoExecution(result);
  });

  it("strips ANSI and terminal control characters", () => {
    const result = redactTranscriptText("safe\u001b[31m red\u001f text");

    expect(result.status).toBe("warning");
    expect(result.redactedText).toBe("safe red text");
    expect(result.controlCharCount).toBe(2);
    expect(result.warningCodes).toContain("ANSI_STRIPPED");
    expect(result.warningCodes).toContain("CONTROL_CHAR_STRIPPED");
    expect(JSON.stringify(result)).not.toContain("\u001b[31m");
    expectNoExecution(result);
  });

  it("summarizes huge output", () => {
    const result = redactTranscriptText({
      text: Array.from({ length: 1000 }, () => "word").join(" "),
      maxSummaryLength: 100
    });

    expect(result.status).toBe("warning");
    expect(result.truncated).toBe(true);
    expect(result.redactedText).toContain("[TRUNCATED]");
    expect(result.warningCodes).toContain("OUTPUT_TRUNCATED");
    expectNoExecution(result);
  });

  it("blocks binary-looking output", () => {
    const result = redactTranscriptText("binary\u0000payload");

    expect(result.status).toBe("blocked");
    expect(result.binaryLike).toBe(true);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "BINARY_OUTPUT_BLOCKED"
    );
    expectNoExecution(result);
  });

  it("summarizes command echo and Windows path warnings", () => {
    const result = redactTranscriptText(
      "PS C:\\workspaces\\demo> pnpm test\nopened C:\\Users\\demo\\project"
    );

    expect(result.status).toBe("warning");
    expect(result.commandEchoDetected).toBe(true);
    expect(result.windowsPathWarning).toBe(true);
    expect(result.warningCodes).toContain("COMMAND_ECHO_SUMMARIZED");
    expect(result.warningCodes).toContain("WINDOWS_PATH_SUMMARY_WARNING");
    expectNoExecution(result);
  });

  it("validates capture input without allowing execution flags", () => {
    const result = validateTranscriptCaptureInput({
      sessionId: "session-redaction",
      mode: "approval_mode",
      sourceKind: "shell_safe_lane",
      streamKind: "stdout",
      outputText: "safe",
      canExecuteCommand: true
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_READINESS_REJECTED"
    );
  });

  it("returns summary without raw redacted text", () => {
    const result = redactTranscriptText("Authorization: secret-value");
    const summary = summarizeTranscriptRedaction(result);

    expect(summary).not.toHaveProperty("redactedText");
    expect(JSON.stringify(summary)).not.toContain("secret-value");
    expect(summary.warningCodes).toContain("AUTHORIZATION_REDACTED");
  });
});
