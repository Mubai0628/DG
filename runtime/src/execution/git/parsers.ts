import { validateGitPathSpec } from "./pathspec-guard.js";
import {
  type GitBranchSummary,
  type GitCommitSummary,
  type GitDiffFileSummary,
  type GitDiffSummary,
  type GitLogSummary,
  type GitSafeLaneIssue,
  type GitStatusFile,
  type GitStatusSummary
} from "./types.js";

const secretLikePattern =
  /sk-[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9_-]{8,}|Authorization\s*[:=]|api[_-]?key/i;

export function parseGitStatusPorcelainV1(output: string): GitStatusSummary {
  const files: GitStatusFile[] = [];
  const warnings: GitSafeLaneIssue[] = [];
  let branch: string | undefined;
  let upstream: string | undefined;
  let ahead: number | undefined;
  let behind: number | undefined;

  for (const line of output.split(/\r?\n/)) {
    if (line.length === 0) {
      continue;
    }
    if (line.startsWith("## ")) {
      const parsed = parseBranchHeader(line.slice(3));
      branch = parsed.branch;
      upstream = parsed.upstream;
      ahead = parsed.ahead;
      behind = parsed.behind;
      continue;
    }
    if (line.length < 4) {
      warnings.push(parseWarning("status_malformed_line"));
      continue;
    }
    const indexStatus = line.slice(0, 1);
    const worktreeStatus = line.slice(1, 2);
    const rawPath = line.slice(3);
    const renameParts = rawPath.split(" -> ");
    const outputPath = renameParts.at(-1) ?? rawPath;
    const pathResult = validateGitPathSpec(outputPath);
    if (!pathResult.ok) {
      warnings.push(parseWarning("status_unsafe_path"));
      continue;
    }
    const file: GitStatusFile = {
      path: pathResult.pathspec.path,
      indexStatus,
      worktreeStatus
    };
    const oldPath = renameParts.length > 1 ? renameParts[0] : undefined;
    if (oldPath !== undefined) {
      const oldPathResult = validateGitPathSpec(oldPath);
      if (oldPathResult.ok) {
        file.oldPath = oldPathResult.pathspec.path;
      }
    }
    files.push(file);
  }

  const stagedCount = files.filter(
    (file) => file.indexStatus !== " " && file.indexStatus !== "?"
  ).length;
  const unstagedCount = files.filter(
    (file) => file.worktreeStatus !== " " && file.worktreeStatus !== "?"
  ).length;
  const untrackedCount = files.filter(
    (file) => file.indexStatus === "?" && file.worktreeStatus === "?"
  ).length;
  const summary: GitStatusSummary = {
    kind: "status",
    clean: files.length === 0,
    fileCount: files.length,
    stagedCount,
    unstagedCount,
    untrackedCount,
    files,
    warnings
  };
  if (branch !== undefined) {
    summary.branch = branch;
  }
  if (upstream !== undefined) {
    summary.upstream = upstream;
  }
  if (ahead !== undefined) {
    summary.ahead = ahead;
  }
  if (behind !== undefined) {
    summary.behind = behind;
  }
  return summary;
}

export function parseGitDiffNumstatNameStatus(output: string): GitDiffSummary {
  const files = new Map<string, GitDiffFileSummary>();
  const warnings: GitSafeLaneIssue[] = [];

  for (const line of output.split(/\r?\n/)) {
    if (line.length === 0) {
      continue;
    }
    const parts = line.split("\t");
    if (parts.length >= 3 && isNumstat(parts[0]!, parts[1]!)) {
      const path = parts.slice(2).join("\t");
      const pathResult = validateGitPathSpec(path);
      if (!pathResult.ok) {
        warnings.push(parseWarning("diff_unsafe_path"));
        continue;
      }
      const additions = parts[0] === "-" ? 0 : Number(parts[0]);
      const deletions = parts[1] === "-" ? 0 : Number(parts[1]);
      const existing = files.get(pathResult.pathspec.path);
      const file: GitDiffFileSummary = {
        path: pathResult.pathspec.path,
        additions,
        deletions,
        binary: parts[0] === "-" || parts[1] === "-"
      };
      if (existing?.status !== undefined) {
        file.status = existing.status;
      }
      files.set(pathResult.pathspec.path, file);
      continue;
    }
    if (parts.length >= 2 && /^[AMDRC?]$/.test(parts[0]!)) {
      const path = parts.at(-1)!;
      const pathResult = validateGitPathSpec(path);
      if (!pathResult.ok) {
        warnings.push(parseWarning("diff_unsafe_path"));
        continue;
      }
      const existing = files.get(pathResult.pathspec.path);
      const file: GitDiffFileSummary = {
        path: pathResult.pathspec.path,
        additions: existing?.additions ?? 0,
        deletions: existing?.deletions ?? 0,
        binary: existing?.binary ?? false
      };
      file.status = parts[0]!;
      files.set(pathResult.pathspec.path, file);
      continue;
    }
    warnings.push(parseWarning("diff_malformed_line"));
  }

  const fileList = [...files.values()].sort((left, right) =>
    left.path.localeCompare(right.path)
  );
  return {
    kind: "diff_summary",
    filesChanged: fileList.length,
    additions: fileList.reduce((sum, file) => sum + file.additions, 0),
    deletions: fileList.reduce((sum, file) => sum + file.deletions, 0),
    binaryFiles: fileList.filter((file) => file.binary).length,
    files: fileList,
    warnings
  };
}

export function parseGitLogSummary(output: string): GitLogSummary {
  const commits: GitCommitSummary[] = [];
  const warnings: GitSafeLaneIssue[] = [];

  for (const line of output.split(/\r?\n/)) {
    if (line.length === 0) {
      continue;
    }
    const [hash, unixTimeRaw, authorRaw, ...subjectParts] = line.split("\t");
    if (
      hash === undefined ||
      unixTimeRaw === undefined ||
      authorRaw === undefined ||
      subjectParts.length === 0
    ) {
      warnings.push(parseWarning("log_malformed_line"));
      continue;
    }
    const unixTime = Number(unixTimeRaw);
    if (!/^[a-f0-9]{7,64}$/i.test(hash) || !Number.isFinite(unixTime)) {
      warnings.push(parseWarning("log_malformed_line"));
      continue;
    }
    commits.push({
      hash,
      unixTime,
      author: sanitizeText(authorRaw, 64),
      subject: sanitizeText(subjectParts.join(" "), 120)
    });
  }

  return {
    kind: "log_summary",
    commitCount: commits.length,
    commits,
    warnings
  };
}

export function parseGitBranchSummary(output: string): GitBranchSummary {
  const branches: string[] = [];
  const warnings: GitSafeLaneIssue[] = [];
  let currentBranch: string | undefined;

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const isCurrent = trimmed.startsWith("* ");
    const branch = sanitizeBranch(
      isCurrent ? trimmed.slice(2).trim() : trimmed
    );
    if (branch.length === 0) {
      warnings.push(parseWarning("branch_malformed_line"));
      continue;
    }
    branches.push(branch);
    if (isCurrent) {
      currentBranch = branch;
    }
  }

  const uniqueBranches = [...new Set(branches)].sort((left, right) =>
    left.localeCompare(right)
  );
  const summary: GitBranchSummary = {
    kind: "branch_summary",
    branchCount: uniqueBranches.length,
    branches: uniqueBranches,
    warnings
  };
  if (currentBranch !== undefined) {
    summary.currentBranch = currentBranch;
  }
  return summary;
}

function parseBranchHeader(value: string): {
  branch?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
} {
  const metaMatch = value.match(/ \[([^\]]+)\]$/);
  const meta = metaMatch?.[1] ?? "";
  const withoutMeta =
    metaMatch?.index !== undefined ? value.slice(0, metaMatch.index) : value;
  const [rawBranch, rawUpstream] = withoutMeta.split("...");
  const result: {
    branch?: string;
    upstream?: string;
    ahead?: number;
    behind?: number;
  } = {};
  const branch = sanitizeBranch(rawBranch?.trim() ?? "");
  if (branch.length > 0) {
    result.branch = branch;
  }
  const upstream = sanitizeBranch(rawUpstream?.trim() ?? "");
  if (upstream.length > 0) {
    result.upstream = upstream;
  }
  const aheadMatch = meta.match(/ahead (\d+)/);
  const behindMatch = meta.match(/behind (\d+)/);
  if (aheadMatch?.[1] !== undefined) {
    result.ahead = Number(aheadMatch[1]);
  }
  if (behindMatch?.[1] !== undefined) {
    result.behind = Number(behindMatch[1]);
  }
  return result;
}

function isNumstat(left: string, right: string): boolean {
  return (
    (left === "-" || /^\d+$/.test(left)) &&
    (right === "-" || /^\d+$/.test(right))
  );
}

function sanitizeText(value: string, maxLength: number): string {
  const cleaned = value
    .replace(secretLikePattern, "[redacted]")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length <= maxLength
    ? cleaned
    : `${cleaned.slice(0, maxLength - 1)}…`;
}

function sanitizeBranch(value: string): string {
  return value
    .replace(/[\0\r\n\t]/g, "")
    .trim()
    .slice(0, 120);
}

function parseWarning(code: string): GitSafeLaneIssue {
  return {
    kind: "parse_warning",
    code,
    safeMessage: `Git summary parser skipped a line: ${code}`
  };
}
