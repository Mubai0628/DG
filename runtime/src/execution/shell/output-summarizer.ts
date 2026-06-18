import { redactShellText } from "./env-policy.js";
import {
  type ShellFakeRunInput,
  type ShellOutputFinding,
  type ShellOutputPolicy,
  type ShellOutputSummary
} from "./types.js";

const failurePatterns = [
  /\bFAIL\b/i,
  /\bERROR\b/i,
  /\bpanic\b/i,
  /\btest failed\b/i
];
const successPatterns = [/\bPASS\b/i, /\bpassed\b/i, /\bsuccess\b/i];
const typeErrorPattern = /\bTypeError\b/;

export function summarizeShellOutput(
  fixture: ShellFakeRunInput,
  policy: ShellOutputPolicy
): ShellOutputSummary {
  const stdoutLimited = limitText(fixture.stdout, policy.maxStdoutBytes);
  const stderrLimited = limitText(fixture.stderr, policy.maxStderrBytes);
  const stdoutRedacted = redactShellText(stdoutLimited.text);
  const stderrRedacted = redactShellText(stderrLimited.text);
  const safeStdoutPreview = firstLines(
    stdoutRedacted.text,
    policy.includeFirstLines,
    policy.maxLines
  );
  const safeStderrPreview = firstLines(
    stderrRedacted.text,
    policy.includeFirstLines,
    policy.maxLines
  );
  const findings = [
    ...findMarkers(stdoutRedacted.text, "stdout"),
    ...findMarkers(stderrRedacted.text, "stderr")
  ];
  const redactionCount =
    stdoutRedacted.redactionCount + stderrRedacted.redactionCount;
  if (redactionCount > 0) {
    findings.push({
      code: "redaction",
      safeMessage: "Secret-like output markers were redacted."
    });
  }

  return {
    exitCode: fixture.exitCode,
    durationMs: fixture.durationMs,
    timedOut: fixture.timedOut ?? false,
    stdoutBytes: byteLength(fixture.stdout),
    stderrBytes: byteLength(fixture.stderr),
    stdoutLineCount: countLines(fixture.stdout),
    stderrLineCount: countLines(fixture.stderr),
    stdoutTruncated: stdoutLimited.truncated,
    stderrTruncated: stderrLimited.truncated,
    safeStdoutPreview,
    safeStderrPreview,
    findings,
    redactionCount
  };
}

export function summarizeShellOutputForEvent(
  summary: ShellOutputSummary
): Record<string, unknown> {
  return {
    exitCode: summary.exitCode,
    durationMs: summary.durationMs,
    timedOut: summary.timedOut,
    stdoutLineCount: summary.stdoutLineCount,
    stderrLineCount: summary.stderrLineCount,
    stdoutBytes: summary.stdoutBytes,
    stderrBytes: summary.stderrBytes,
    stdoutTruncated: summary.stdoutTruncated,
    stderrTruncated: summary.stderrTruncated,
    findingCodes: summary.findings.map((finding) => finding.code),
    redactionCount: summary.redactionCount
  };
}

function limitText(
  text: string,
  maxBytes: number
): {
  text: string;
  truncated: boolean;
} {
  if (byteLength(text) <= maxBytes) {
    return { text, truncated: false };
  }
  let output = "";
  for (const char of text) {
    if (byteLength(output + char) > maxBytes) {
      break;
    }
    output += char;
  }
  return { text: output, truncated: true };
}

function firstLines(
  text: string,
  includeFirstLines: number,
  maxLines: number
): string[] {
  return text
    .split(/\r?\n/)
    .slice(0, Math.min(includeFirstLines, maxLines))
    .map((line) => line.slice(0, 160));
}

function findMarkers(
  text: string,
  stream: "stdout" | "stderr"
): ShellOutputFinding[] {
  const findings: ShellOutputFinding[] = [];
  if (failurePatterns.some((pattern) => pattern.test(text))) {
    findings.push({
      code: "failure_marker",
      safeMessage: "Failure marker detected in command output.",
      stream
    });
  }
  if (successPatterns.some((pattern) => pattern.test(text))) {
    findings.push({
      code: "success_marker",
      safeMessage: "Success marker detected in command output.",
      stream
    });
  }
  if (/\bpanic\b/i.test(text)) {
    findings.push({
      code: "panic_marker",
      safeMessage: "Panic marker detected in command output.",
      stream
    });
  }
  if (typeErrorPattern.test(text)) {
    findings.push({
      code: "type_error_marker",
      safeMessage: "TypeError marker detected in command output.",
      stream
    });
  }
  return findings;
}

function countLines(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return text.split(/\r?\n/).length;
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}
