import { type EventStore } from "../../events/index.js";

export type GitSafeLane = "read_only" | "write_disabled";

export type GitSafeCommandKind =
  | "status"
  | "diff_summary"
  | "log_summary"
  | "branch_summary"
  | "add"
  | "commit"
  | "push"
  | "checkout"
  | "merge"
  | "rebase"
  | "reset"
  | "clean"
  | "stash"
  | "tag"
  | "remote"
  | "apply_patch";

export type GitCommandPlanStatus =
  | "planned"
  | "rejected"
  | "disabled"
  | "unknown_command";

export type GitCommandRiskLevel =
  | "A0_observe"
  | "A1_read"
  | "A3_disabled_write";

export type GitPathSpec = {
  path: string;
};

export type GitSafeLaneErrorKind =
  | "unknown_command"
  | "write_command_disabled"
  | "unsafe_pathspec"
  | "invalid_limit"
  | "missing_fixture"
  | "parse_warning";

export type GitSafeLaneIssue = {
  kind: GitSafeLaneErrorKind | GitPathSpecErrorKind;
  code: string;
  safeMessage: string;
  path?: string;
};

export type GitPathSpecErrorKind =
  | "empty_path"
  | "absolute_path"
  | "drive_letter_path"
  | "unc_path"
  | "parent_traversal"
  | "git_control_path"
  | "generated_artifact_path"
  | "secret_path"
  | "shell_metacharacter"
  | "newline_or_null"
  | "url_or_query_path";

export type GitPathSpecValidationResult =
  | {
      ok: true;
      pathspec: GitPathSpec;
      warnings: GitSafeLaneIssue[];
    }
  | {
      ok: false;
      pathspec?: GitPathSpec;
      errors: GitSafeLaneIssue[];
      warnings: GitSafeLaneIssue[];
    };

export type GitCommandPlan = {
  planId: string;
  commandKind: GitSafeCommandKind;
  lane: GitSafeLane;
  status: GitCommandPlanStatus;
  argv: string[];
  pathspecs: GitPathSpec[];
  riskLevel: GitCommandRiskLevel;
  reasons: string[];
  warnings: GitSafeLaneIssue[];
  createdAt: string;
  hash: string;
};

export type GitCommandPlanInput = {
  planId?: string;
  commandKind: GitSafeCommandKind | string;
  pathspecs?: string[];
  limit?: number;
};

export type GitStatusFile = {
  path: string;
  indexStatus: string;
  worktreeStatus: string;
  oldPath?: string;
};

export type GitStatusSummary = {
  kind: "status";
  branch?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  clean: boolean;
  fileCount: number;
  stagedCount: number;
  unstagedCount: number;
  untrackedCount: number;
  files: GitStatusFile[];
  warnings: GitSafeLaneIssue[];
};

export type GitDiffFileSummary = {
  path: string;
  status?: string;
  additions: number;
  deletions: number;
  binary: boolean;
};

export type GitDiffSummary = {
  kind: "diff_summary";
  filesChanged: number;
  additions: number;
  deletions: number;
  binaryFiles: number;
  files: GitDiffFileSummary[];
  warnings: GitSafeLaneIssue[];
};

export type GitCommitSummary = {
  hash: string;
  unixTime: number;
  author: string;
  subject: string;
};

export type GitLogSummary = {
  kind: "log_summary";
  commitCount: number;
  commits: GitCommitSummary[];
  warnings: GitSafeLaneIssue[];
};

export type GitBranchSummary = {
  kind: "branch_summary";
  currentBranch?: string;
  branchCount: number;
  branches: string[];
  warnings: GitSafeLaneIssue[];
};

export type GitParsedSummary =
  | GitStatusSummary
  | GitDiffSummary
  | GitLogSummary
  | GitBranchSummary;

export type GitWriteIntentStatus = "disabled";

export type GitWriteIntent = {
  intentId: string;
  commandKind:
    | "add"
    | "commit"
    | "push"
    | "checkout"
    | "branch_create"
    | "branch_delete"
    | "reset"
    | "clean"
    | "stash"
    | "tag";
  status: GitWriteIntentStatus;
  reason: string;
  summary?: string;
  patchProposalRefs: string[];
  auditReportRefs: string[];
  requiresApproval: true;
};

export type GitSafeLaneAuditReport = {
  auditId: string;
  commandKind: GitSafeCommandKind;
  decision: GitCommandPlanStatus;
  lane: GitSafeLane;
  riskLevel: GitCommandRiskLevel;
  pathspecCount: number;
  warningCodes: string[];
  reasons: string[];
  hash: string;
};

export type GitRunnerResult =
  | {
      ok: true;
      plan: GitCommandPlan;
      summary: GitParsedSummary;
    }
  | {
      ok: false;
      plan: GitCommandPlan;
      errors: GitSafeLaneIssue[];
    };

export type GitRunner = {
  run(plan: GitCommandPlan): GitRunnerResult;
};

export type FakeGitRunnerFixtures = Partial<Record<GitSafeCommandKind, string>>;

export type GitSafeLaneOptions = {
  clock?: () => Date;
  idFactory?: () => string;
  eventStore?: EventStore;
};

export type GitSummaryEvidenceInput = {
  summary: GitParsedSummary;
  id?: string;
};
