import { type AgentEvidenceRef } from "../../agents/index.js";
import { type ContextSegmentV2Input } from "../../context/index.js";
import {
  type GitParsedSummary,
  type GitSummaryEvidenceInput
} from "./types.js";

export function gitSummaryToAgentEvidenceRef(
  input: GitSummaryEvidenceInput
): AgentEvidenceRef {
  return {
    id: input.id ?? `git-${input.summary.kind}`,
    kind: "artifact",
    untrusted: false,
    summary: summarizeGitParsedSummary(input.summary)
  };
}

export function gitSummaryToVolatileContextSegment(
  input: GitSummaryEvidenceInput
): ContextSegmentV2Input {
  return {
    id: input.id ?? `git-context-${input.summary.kind}`,
    layer: "volatile_tail",
    title: "Git safe lane summary",
    content: summarizeGitParsedSummary(input.summary),
    source: "tool_result",
    provenance: {
      kind: input.summary.kind
    },
    sensitivity: "internal",
    placement: "volatile_tail"
  };
}

export function summarizeGitParsedSummary(summary: GitParsedSummary): string {
  if (summary.kind === "status") {
    return `Git status: branch=${summary.branch ?? "unknown"} files=${summary.fileCount} staged=${summary.stagedCount} unstaged=${summary.unstagedCount} untracked=${summary.untrackedCount}`;
  }
  if (summary.kind === "diff_summary") {
    return `Git diff summary: files=${summary.filesChanged} additions=${summary.additions} deletions=${summary.deletions}`;
  }
  if (summary.kind === "log_summary") {
    return `Git log summary: commits=${summary.commitCount} hashes=${summary.commits
      .map((commit) => commit.hash.slice(0, 12))
      .join(",")}`;
  }
  return `Git branches: count=${summary.branchCount} current=${summary.currentBranch ?? "unknown"}`;
}
