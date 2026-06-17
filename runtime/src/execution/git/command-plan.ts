import { hashPatchObject } from "../patch/index.js";
import { validateGitPathSpec } from "./pathspec-guard.js";
import {
  type GitCommandPlan,
  type GitCommandPlanInput,
  type GitSafeCommandKind,
  type GitSafeLaneIssue,
  type GitSafeLaneOptions
} from "./types.js";

const readOnlyCommands: readonly GitSafeCommandKind[] = [
  "status",
  "diff_summary",
  "log_summary",
  "branch_summary"
];

const disabledWriteCommands: readonly GitSafeCommandKind[] = [
  "add",
  "commit",
  "push",
  "checkout",
  "merge",
  "rebase",
  "reset",
  "clean",
  "stash",
  "tag",
  "remote",
  "apply_patch"
];

export function planGitSafeCommand(
  input: GitCommandPlanInput,
  options: GitSafeLaneOptions = {}
): GitCommandPlan {
  const now = (options.clock?.() ?? new Date()).toISOString();
  const planId = input.planId ?? options.idFactory?.() ?? "git-plan-1";
  const commandKind = input.commandKind as GitSafeCommandKind;
  const pathspecResult = normalizePathspecs(input.pathspecs ?? []);
  const reasons: string[] = [];
  const warnings: GitSafeLaneIssue[] = [...pathspecResult.warnings];
  let status: GitCommandPlan["status"] = "planned";
  let lane: GitCommandPlan["lane"] = "read_only";
  let argv: string[] = [];
  let riskLevel: GitCommandPlan["riskLevel"] = "A1_read";

  if (!isKnownCommand(commandKind)) {
    status = "unknown_command";
    lane = "write_disabled";
    riskLevel = "A3_disabled_write";
    reasons.push("unknown_command");
  } else if (disabledWriteCommands.includes(commandKind)) {
    status = "disabled";
    lane = "write_disabled";
    riskLevel = "A3_disabled_write";
    reasons.push("git write lanes are disabled in this phase");
  } else if (!pathspecResult.ok) {
    status = "rejected";
    lane = "read_only";
    reasons.push("unsafe_pathspec");
  } else if (commandKind === "log_summary" && !isValidLimit(input.limit)) {
    status = "rejected";
    lane = "read_only";
    reasons.push("invalid_limit");
  } else {
    argv = buildReadOnlyArgv(
      commandKind,
      pathspecResult.pathspecs,
      input.limit
    );
    riskLevel = commandKind === "branch_summary" ? "A0_observe" : "A1_read";
  }

  const planWithoutHash = {
    planId,
    commandKind,
    lane,
    status,
    argv,
    pathspecs: pathspecResult.pathspecs,
    riskLevel,
    reasons,
    warnings,
    createdAt: now
  } satisfies Omit<GitCommandPlan, "hash">;
  const plan: GitCommandPlan = {
    ...planWithoutHash,
    hash: hashPatchObject(planWithoutHash)
  };

  appendPlanEvent(options, plan);
  return plan;
}

export function isReadOnlyGitCommand(
  commandKind: string
): commandKind is (typeof readOnlyCommands)[number] {
  return readOnlyCommands.includes(commandKind as GitSafeCommandKind);
}

export function isDisabledGitWriteCommand(
  commandKind: string
): commandKind is (typeof disabledWriteCommands)[number] {
  return disabledWriteCommands.includes(commandKind as GitSafeCommandKind);
}

function normalizePathspecs(pathspecs: readonly string[]): {
  ok: boolean;
  pathspecs: GitCommandPlan["pathspecs"];
  warnings: GitSafeLaneIssue[];
  errors: GitSafeLaneIssue[];
} {
  const normalized: GitCommandPlan["pathspecs"] = [];
  const warnings: GitSafeLaneIssue[] = [];
  const errors: GitSafeLaneIssue[] = [];

  for (const pathspec of pathspecs) {
    const result = validateGitPathSpec(pathspec);
    warnings.push(...result.warnings);
    if (result.ok) {
      normalized.push(result.pathspec);
    } else {
      errors.push(...result.errors);
    }
  }

  return {
    ok: errors.length === 0,
    pathspecs: normalized,
    warnings: [...warnings, ...errors],
    errors
  };
}

function isKnownCommand(commandKind: GitSafeCommandKind): boolean {
  return (
    readOnlyCommands.includes(commandKind) ||
    disabledWriteCommands.includes(commandKind)
  );
}

function isValidLimit(limit: number | undefined): boolean {
  return (
    limit === undefined ||
    (Number.isInteger(limit) && limit > 0 && limit <= 100)
  );
}

function buildReadOnlyArgv(
  commandKind: GitSafeCommandKind,
  pathspecs: GitCommandPlan["pathspecs"],
  limit: number | undefined
): string[] {
  if (commandKind === "status") {
    return ["git", "status", "--porcelain=v1", "--branch"];
  }
  if (commandKind === "diff_summary") {
    return [
      "git",
      "diff",
      "--numstat",
      "--name-status",
      "--",
      ...pathspecs.map((pathspec) => pathspec.path)
    ];
  }
  if (commandKind === "log_summary") {
    return [
      "git",
      "log",
      "--pretty=format:%H%x09%ct%x09%an%x09%s",
      "-n",
      String(limit ?? 20)
    ];
  }
  if (commandKind === "branch_summary") {
    return ["git", "branch", "--format=%(refname:short)"];
  }
  return [];
}

function appendPlanEvent(
  options: GitSafeLaneOptions,
  plan: GitCommandPlan
): void {
  if (options.eventStore === undefined) {
    return;
  }
  const payload = {
    commandKind: plan.commandKind,
    lane: plan.lane,
    status: plan.status,
    argvSummary: plan.argv,
    pathspecCount: plan.pathspecs.length,
    warningCodes: plan.warnings.map((warning) => warning.code),
    reasons: plan.reasons,
    riskLevel: plan.riskLevel,
    hash: plan.hash
  };
  options.eventStore.appendEvent({
    type:
      plan.status === "planned"
        ? "git.command.planned"
        : "git.command.rejected",
    payload
  });
}
