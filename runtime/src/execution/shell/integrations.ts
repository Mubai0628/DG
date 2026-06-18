import { type AgentEvidenceRef } from "../../agents/index.js";
import { type ContextSegmentV2Input } from "../../context/index.js";
import { type MemoryCandidate } from "../../memory/index.js";
import {
  type ShellOutputSummary,
  type ShellSummaryEvidenceInput
} from "./types.js";

export function shellSummaryToAgentEvidenceRef(
  input: ShellSummaryEvidenceInput
): AgentEvidenceRef {
  return {
    id: input.id ?? `shell-${input.commandId}`,
    kind: "artifact",
    untrusted: false,
    summary: summarizeShellResult(input.commandId, input.summary)
  };
}

export function shellSummaryToVolatileContextSegment(
  input: ShellSummaryEvidenceInput
): ContextSegmentV2Input {
  return {
    id: input.id ?? `shell-context-${input.commandId}`,
    layer: "volatile_tail",
    title: "Shell allowlist summary",
    content: summarizeShellResult(input.commandId, input.summary),
    source: "tool_result",
    provenance: {
      commandId: input.commandId
    },
    sensitivity: "internal",
    placement: "volatile_tail"
  };
}

export function shellFailureToPitfallCandidate(input: {
  commandId: string;
  summary: ShellOutputSummary;
  candidateId?: string;
  now?: string;
  namespace?: string;
}): MemoryCandidate | undefined {
  if (input.summary.exitCode === 0 && !input.summary.timedOut) {
    return undefined;
  }
  const findingCodes = input.summary.findings
    .map((finding) => finding.code)
    .join(",");
  const trigger = `Shell allowlist simulation failed for ${input.commandId}`;
  const mitigation =
    input.summary.timedOut || findingCodes.includes("failure_marker")
      ? "Review the summarized failure markers and rerun through an approved future shell lane."
      : "Review the simulated exit code before proposing a real execution lane.";

  return {
    candidateId: input.candidateId ?? `shell-pitfall-${input.commandId}`,
    proposedType: "pitfall",
    proposedContent: `${trigger}. Exit code ${input.summary.exitCode}. Findings: ${findingCodes || "none"}.`,
    proposedSummary: `${input.commandId} simulated failure: exit=${input.summary.exitCode}`,
    proposedBy: "shell-allowlist",
    source: "tool_result",
    trustLevel: "verified_tool_result",
    namespace: input.namespace ?? "runtime",
    scope: { kind: "project" },
    trigger,
    mitigation,
    evidenceRefs: [`shell-command-${input.commandId}`],
    contextRefs: [],
    reason: "candidate_only_shell_failure_summary",
    createdAt: input.now ?? new Date(0).toISOString(),
    sensitivity: "internal",
    provenance: {
      source: "tool_result",
      actor: "shell-allowlist",
      refs: [`shell-command-${input.commandId}`]
    }
  };
}

export function summarizeShellResult(
  commandId: string,
  summary: ShellOutputSummary
): string {
  const findingCodes = summary.findings
    .map((finding) => finding.code)
    .join(",");
  return `Shell allowlist summary: command=${commandId} exit=${summary.exitCode} durationMs=${summary.durationMs} stdoutLines=${summary.stdoutLineCount} stderrLines=${summary.stderrLineCount} findings=${findingCodes || "none"}`;
}
