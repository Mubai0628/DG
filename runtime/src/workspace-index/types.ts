import { type AgentEvidenceRef } from "../agents/index.js";
import { type CapabilityDescriptor } from "../capabilities/index.js";
import { type ContextSegmentV2Input } from "../context/index.js";
import { type EventStore } from "../events/index.js";

export type WorkspaceIndexStatus = "built" | "partial" | "rejected";

export type WorkspaceIndexSource =
  | "virtual"
  | "fixture"
  | "user_supplied"
  | "unknown";

export type WorkspaceFileContentType = "text" | "binary" | "unknown";

export type WorkspaceLanguage =
  | "ts"
  | "tsx"
  | "js"
  | "jsx"
  | "md"
  | "json"
  | "java"
  | "rs"
  | "yaml"
  | "css"
  | "html"
  | "unknown";

export type WorkspaceSymbolKind =
  | "function"
  | "class"
  | "interface"
  | "enum"
  | "const"
  | "method"
  | "heading"
  | "json_key"
  | "struct";

export type WorkspaceIndexErrorKind =
  | "unsafe_path"
  | "unsafe_content"
  | "too_many_files"
  | "too_large"
  | "invalid_input";

export type WorkspaceIndexWarning = {
  code: string;
  path?: string;
  safeMessage: string;
};

export type WorkspaceIndexError = {
  kind: WorkspaceIndexErrorKind;
  code: string;
  path?: string;
  safeMessage: string;
};

export type WorkspaceVirtualFile = {
  path: string;
  content: string;
  contentType?: WorkspaceFileContentType | string;
  encoding?: "utf8" | string;
  sizeBytes?: number;
  source?: WorkspaceIndexSource;
  updatedAt?: string;
};

export type WorkspaceIndexInput = {
  workspaceId?: string;
  rootLabel?: string;
  files: WorkspaceVirtualFile[];
};

export type WorkspacePathGuardResult =
  | {
      ok: true;
      path: string;
      segments: string[];
      warningCodes: string[];
    }
  | {
      ok: false;
      code: string;
      safePath: string;
      safeMessage: string;
    };

export type WorkspaceContentClassification = {
  contentType: WorkspaceFileContentType;
  extension: string;
  language: WorkspaceLanguage;
  sizeBytes: number;
  lineCount: number;
  secretRisk: boolean;
  rawMarkerRisk: boolean;
  tooLarge: boolean;
  skippedReason?: string;
  warningCodes: string[];
};

export type WorkspaceFileSummary = {
  path: string;
  extension: string;
  language: WorkspaceLanguage;
  sizeBytes: number;
  lineCount: number;
  hash: string;
  contentType: WorkspaceFileContentType;
  indexed: boolean;
  skippedReason?: string;
  warningCodes: string[];
  symbolCount: number;
  summaryFingerprint: string;
};

export type WorkspaceSymbolSummary = {
  filePath: string;
  name: string;
  kind: WorkspaceSymbolKind;
  language: WorkspaceLanguage;
};

export type WorkspaceIndexedFile = {
  path: string;
  summary: WorkspaceFileSummary;
  symbols: WorkspaceSymbolSummary[];
};

export type WorkspaceDirectorySummary = {
  path: string;
  fileCount: number;
  indexedFileCount: number;
  skippedFileCount: number;
  languageCounts: Partial<Record<WorkspaceLanguage, number>>;
  warningCodes: string[];
};

export type WorkspaceLanguageSummary = {
  language: WorkspaceLanguage;
  fileCount: number;
  indexedFileCount: number;
  lineCount: number;
  sizeBytes: number;
};

export type WorkspaceTreeSummary = {
  rootDirectoryCount: number;
  topDirectories: WorkspaceDirectorySummary[];
  totalDirectoryCount: number;
  warningCodes: string[];
};

export type WorkspaceIndex = {
  workspaceIndexId: string;
  workspaceId: string;
  rootLabel: string;
  status: WorkspaceIndexStatus;
  files: WorkspaceIndexedFile[];
  skippedFiles: WorkspaceFileSummary[];
  directories: WorkspaceDirectorySummary[];
  languageSummary: WorkspaceLanguageSummary[];
  treeSummary: WorkspaceTreeSummary;
  fileCount: number;
  indexedFileCount: number;
  skippedFileCount: number;
  totalBytes: number;
  totalLines: number;
  warningCodes: string[];
  warnings: WorkspaceIndexWarning[];
  errors: WorkspaceIndexError[];
  hash: string;
  createdAt: string;
};

export type WorkspaceIndexBuildOptions = {
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
  maxPathLength?: number;
  maxSymbolsPerFile?: number;
  failFast?: boolean;
  now?: string;
  indexId?: string;
  eventStore?: EventStore;
};

export type WorkspaceIndexBuildResult = {
  ok: boolean;
  index: WorkspaceIndex;
  warnings: WorkspaceIndexWarning[];
  errors: WorkspaceIndexError[];
};

export type WorkspaceIndexEventSummary = {
  workspaceIndexId: string;
  workspaceId: string;
  status: WorkspaceIndexStatus;
  fileCount: number;
  indexedFileCount: number;
  skippedFileCount: number;
  directoryCount: number;
  languageCounts: Partial<Record<WorkspaceLanguage, number>>;
  warningCodes: string[];
  errorCodes: string[];
  safePaths: string[];
  hash: string;
};

export type WorkspaceIndexRef = {
  workspaceIndexId: string;
  fileCount: number;
  indexedFileCount: number;
  skippedFileCount: number;
  languageSummary: WorkspaceLanguageSummary[];
  warningCount: number;
  hash: string;
};

export type WorkspaceIndexIntegrationRefs = {
  contextSegments: ContextSegmentV2Input[];
  evidenceRefs: AgentEvidenceRef[];
  controlRef: WorkspaceIndexRef;
  descriptor: CapabilityDescriptor;
};
