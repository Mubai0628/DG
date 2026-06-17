import {
  parseGitBranchSummary,
  parseGitDiffNumstatNameStatus,
  parseGitLogSummary,
  parseGitStatusPorcelainV1
} from "./parsers.js";
import {
  type FakeGitRunnerFixtures,
  type GitCommandPlan,
  type GitParsedSummary,
  type GitRunner,
  type GitRunnerResult,
  type GitSafeLaneIssue,
  type GitSafeLaneOptions
} from "./types.js";

export class FakeGitRunner implements GitRunner {
  constructor(
    private readonly fixtures: FakeGitRunnerFixtures,
    private readonly options: GitSafeLaneOptions = {}
  ) {}

  run(plan: GitCommandPlan): GitRunnerResult {
    if (plan.status !== "planned") {
      return {
        ok: false,
        plan,
        errors: [
          issue(
            "unknown_command",
            "FakeGitRunner only runs planned read-only plans."
          )
        ]
      };
    }

    const output = this.fixtures[plan.commandKind];
    if (output === undefined) {
      return {
        ok: false,
        plan,
        errors: [issue("missing_fixture", "FakeGitRunner fixture is missing.")]
      };
    }

    const summary = parseSummary(plan, output);
    this.options.eventStore?.appendEvent({
      type: "git.summary.produced",
      payload: summarizeGitResult(plan, summary)
    });

    return {
      ok: true,
      plan,
      summary
    };
  }
}

export function createFakeGitRunner(
  fixtures: FakeGitRunnerFixtures,
  options: GitSafeLaneOptions = {}
): FakeGitRunner {
  return new FakeGitRunner(fixtures, options);
}

export function summarizeGitResult(
  plan: GitCommandPlan,
  summary: GitParsedSummary
): Record<string, unknown> {
  const base = {
    commandKind: plan.commandKind,
    lane: plan.lane,
    status: plan.status,
    pathspecCount: plan.pathspecs.length,
    warningCodes: summary.warnings.map((warning) => warning.code),
    hash: plan.hash
  };

  if (summary.kind === "status") {
    return {
      ...base,
      fileCount: summary.fileCount,
      stagedCount: summary.stagedCount,
      unstagedCount: summary.unstagedCount,
      untrackedCount: summary.untrackedCount,
      changedPaths: summary.files.map((file) => file.path)
    };
  }
  if (summary.kind === "diff_summary") {
    return {
      ...base,
      filesChanged: summary.filesChanged,
      additions: summary.additions,
      deletions: summary.deletions,
      changedPaths: summary.files.map((file) => file.path)
    };
  }
  if (summary.kind === "log_summary") {
    return {
      ...base,
      commitCount: summary.commitCount,
      commitHashes: summary.commits.map((commit) => commit.hash)
    };
  }
  return {
    ...base,
    branchCount: summary.branchCount,
    currentBranch: summary.currentBranch
  };
}

function parseSummary(plan: GitCommandPlan, output: string): GitParsedSummary {
  if (plan.commandKind === "status") {
    return parseGitStatusPorcelainV1(output);
  }
  if (plan.commandKind === "diff_summary") {
    return parseGitDiffNumstatNameStatus(output);
  }
  if (plan.commandKind === "log_summary") {
    return parseGitLogSummary(output);
  }
  return parseGitBranchSummary(output);
}

function issue(
  code: GitSafeLaneIssue["code"],
  safeMessage: string
): GitSafeLaneIssue {
  return {
    kind: code === "missing_fixture" ? "missing_fixture" : "unknown_command",
    code,
    safeMessage
  };
}
