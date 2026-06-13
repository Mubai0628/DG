import { type EventStore } from "../events/index.js";

export type WorkspaceRoot = string;

export type DraftContentType = "text/csv";

export type WorkspaceFsErrorKind =
  | "invalid_workspace_root"
  | "path_escape"
  | "absolute_path_rejected"
  | "parent_traversal_rejected"
  | "denied_path"
  | "unsupported_extension"
  | "unsupported_content_type"
  | "invalid_filename"
  | "draft_too_large"
  | "file_exists"
  | "symlink_escape"
  | "io_error"
  | "secret_like_content_rejected";

export type WorkspacePolicy = {
  rootPath: WorkspaceRoot;
  draftsDirName?: string;
  allowedDraftExtensions?: string[];
  maxDraftBytes?: number;
  denyGlobs?: string[];
  allowOverwrite?: boolean;
};

export type NormalizedWorkspacePolicy = {
  rootPath: string;
  draftsDirName: string;
  allowedDraftExtensions: string[];
  maxDraftBytes: number;
  denyGlobs: string[];
  allowOverwrite: boolean;
};

export type GuardedDraftPath = {
  workspaceRoot: string;
  draftsDir: string;
  filename: string;
  relativePath: string;
  absolutePath: string;
  existed: boolean;
};

export type WorkspacePathGuardOptions = {
  policy: WorkspacePolicy;
};

export type DraftWriteRequest = {
  filename: string;
  content: string;
  contentType: DraftContentType;
  source?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type DraftWriteResult = {
  workspaceRoot: string;
  relativePath: string;
  absolutePath: string;
  bytes: number;
  sha256: string;
  contentType: DraftContentType;
  createdAt: string;
  overwritten: boolean;
};

export type DraftWriterOptions = {
  policy: WorkspacePolicy;
  eventStore?: EventStore;
  clock?: () => Date;
  idFactory?: () => string;
};

export type DraftWrittenEventPayload = {
  relativePath: string;
  bytes: number;
  sha256: string;
  contentType: DraftContentType;
  overwritten: boolean;
  sourceSummary?: Record<string, unknown>;
  metadataSummary?: Record<string, unknown>;
};
