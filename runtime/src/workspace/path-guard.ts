import { constants } from "node:fs";
import { access, lstat, mkdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { WorkspaceFsError } from "./errors.js";
import {
  type GuardedDraftPath,
  type NormalizedWorkspacePolicy,
  type WorkspacePathGuardOptions,
  type WorkspacePolicy
} from "./types.js";

const defaultDenyGlobs = [
  ".env",
  ".git/**",
  "secrets/**",
  "*.pem",
  "*.pem.*",
  "*.key",
  "*.key.*",
  "id_rsa",
  "id_rsa.*",
  "id_ed25519",
  "id_ed25519.*"
];

export class WorkspacePathGuard {
  readonly policy: NormalizedWorkspacePolicy;

  constructor(options: WorkspacePathGuardOptions) {
    this.policy = normalizePolicy(options.policy);
  }

  async resolveDraftPath(filename: string): Promise<GuardedDraftPath> {
    validateDraftFilename(filename, this.policy);

    const rootPath = path.resolve(this.policy.rootPath);
    const rootStats = await stat(rootPath).catch(() => undefined);
    if (rootStats === undefined || !rootStats.isDirectory()) {
      throw new WorkspaceFsError(
        "invalid_workspace_root",
        "Workspace root must exist and be a directory"
      );
    }

    const workspaceRoot = await realpath(rootPath);
    const draftsDir = path.join(workspaceRoot, this.policy.draftsDirName);
    await ensureDraftsDirectory(workspaceRoot, draftsDir);

    const targetPath = path.resolve(draftsDir, filename);
    if (!isPathInside(targetPath, draftsDir)) {
      throw new WorkspaceFsError(
        "path_escape",
        "Draft path must stay inside the drafts directory"
      );
    }

    const existingTarget = await lstat(targetPath).catch(() => undefined);
    if (existingTarget?.isSymbolicLink()) {
      throw new WorkspaceFsError(
        "symlink_escape",
        "Draft target must not be a symlink"
      );
    }
    if (
      existingTarget !== undefined &&
      !existingTarget.isFile() &&
      !existingTarget.isSymbolicLink()
    ) {
      throw new WorkspaceFsError("io_error", "Draft target is not a file");
    }

    return {
      workspaceRoot,
      draftsDir,
      filename,
      relativePath: path.posix.join("drafts", filename),
      absolutePath: targetPath,
      existed: existingTarget !== undefined
    };
  }
}

export function normalizePolicy(
  policy: WorkspacePolicy
): NormalizedWorkspacePolicy {
  const draftsDirName = policy.draftsDirName ?? "drafts";
  if (!isSimplePathPart(draftsDirName) || draftsDirName.startsWith(".")) {
    throw new WorkspaceFsError(
      "invalid_workspace_root",
      "Drafts directory name must be a simple directory name"
    );
  }

  return {
    rootPath: policy.rootPath,
    draftsDirName,
    allowedDraftExtensions: (policy.allowedDraftExtensions ?? [".csv"]).map(
      (extension) => extension.toLowerCase()
    ),
    maxDraftBytes: policy.maxDraftBytes ?? 1_000_000,
    denyGlobs: [...defaultDenyGlobs, ...(policy.denyGlobs ?? [])],
    allowOverwrite: policy.allowOverwrite ?? false
  };
}

function validateDraftFilename(
  filename: string,
  policy: NormalizedWorkspacePolicy
): void {
  if (filename.length === 0 || filename.trim().length === 0) {
    throw new WorkspaceFsError(
      "invalid_filename",
      "Draft filename is required"
    );
  }
  if (
    path.isAbsolute(filename) ||
    path.win32.isAbsolute(filename) ||
    path.posix.isAbsolute(filename) ||
    /^[A-Za-z]:/.test(filename) ||
    filename.startsWith("\\\\")
  ) {
    throw new WorkspaceFsError(
      "absolute_path_rejected",
      "Draft filename must be relative"
    );
  }
  if (filename === ".." || filename.includes("..")) {
    throw new WorkspaceFsError(
      "parent_traversal_rejected",
      "Draft filename must not contain parent traversal"
    );
  }
  if (!isSimplePathPart(filename)) {
    throw new WorkspaceFsError(
      "invalid_filename",
      "Draft filename must not contain path separators"
    );
  }
  if (filename.startsWith(".")) {
    throw new WorkspaceFsError(
      "invalid_filename",
      "Draft filename must not be hidden"
    );
  }

  const extension = path.extname(filename).toLowerCase();
  if (!policy.allowedDraftExtensions.includes(extension)) {
    throw new WorkspaceFsError(
      "unsupported_extension",
      "Draft extension is not supported"
    );
  }

  if (matchesDeniedPath(filename, policy.denyGlobs)) {
    throw new WorkspaceFsError("denied_path", "Draft filename is denied");
  }
}

async function ensureDraftsDirectory(
  workspaceRoot: string,
  draftsDir: string
): Promise<void> {
  if (!isPathInside(draftsDir, workspaceRoot)) {
    throw new WorkspaceFsError(
      "path_escape",
      "Drafts directory must stay inside workspace root"
    );
  }

  const existingDrafts = await lstat(draftsDir).catch(() => undefined);
  if (existingDrafts?.isSymbolicLink()) {
    throw new WorkspaceFsError(
      "symlink_escape",
      "Drafts directory must not be a symlink"
    );
  }

  if (existingDrafts === undefined) {
    await mkdir(draftsDir);
  } else if (!existingDrafts.isDirectory()) {
    throw new WorkspaceFsError("io_error", "Drafts path is not a directory");
  }

  const draftsRealPath = await realpath(draftsDir);
  if (!isPathInside(draftsRealPath, workspaceRoot)) {
    throw new WorkspaceFsError(
      "symlink_escape",
      "Drafts directory resolves outside workspace root"
    );
  }

  await access(draftsRealPath, constants.W_OK);
}

function matchesDeniedPath(filename: string, denyGlobs: string[]): boolean {
  const lower = filename.toLowerCase();
  return denyGlobs.some((pattern) => matchesSimpleGlob(lower, pattern));
}

function matchesSimpleGlob(filename: string, pattern: string): boolean {
  const lowerPattern = pattern.toLowerCase();
  if (lowerPattern.endsWith("/**")) {
    return filename === lowerPattern.slice(0, -3);
  }
  const escaped = lowerPattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}$`).test(filename);
}

function isSimplePathPart(value: string): boolean {
  return (
    value.length > 0 &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !value.includes(path.sep === "/" ? "\\" : "/")
  );
}

function isPathInside(candidate: string, parent: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative.length === 0 ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
