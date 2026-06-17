import { type CapabilityRiskLevel } from "../../capabilities/index.js";
import { type EventStore } from "../../events/index.js";

export type PatchOperation = "create" | "update" | "delete" | "rename";

export type PatchProposalStatus =
  | "proposed"
  | "validated"
  | "simulated"
  | "rejected"
  | "approved";

export type PatchProposalSource =
  | "agent"
  | "user"
  | "model"
  | "tool"
  | "system"
  | "unknown";

export type PatchSensitivity =
  | "public"
  | "internal"
  | "sensitive"
  | "secret_blocked";

export type PatchContentType =
  | "text/plain"
  | "text/markdown"
  | "text/typescript"
  | "application/json"
  | "unknown";

export type PatchFileChange = {
  operation: PatchOperation;
  path: string;
  oldPath?: string;
  beforeHash?: string;
  afterHash?: string;
  beforeContent?: string;
  afterContent?: string;
  contentType: PatchContentType | string;
  encoding: "utf8";
  sizeBytes: number;
  reason: string;
  sourceRefs: string[];
  noCompress?: boolean;
  sensitivity: PatchSensitivity;
};

export type PatchValidationErrorKind =
  | "empty_path"
  | "absolute_path"
  | "drive_letter_path"
  | "unc_path"
  | "parent_traversal"
  | "hidden_control_path"
  | "secret_path"
  | "generated_artifact_path"
  | "unsupported_operation"
  | "missing_content"
  | "binary_content"
  | "file_too_large"
  | "patch_too_large"
  | "secret_marker"
  | "raw_marker"
  | "full_url_query_secret"
  | "suspicious_executable_path"
  | "direct_shell_command"
  | "before_hash_mismatch"
  | "file_exists"
  | "file_missing";

export type PatchValidationIssue = {
  kind: PatchValidationErrorKind;
  path?: string;
  safeMessage: string;
};

export type PatchValidationResult = {
  ok: boolean;
  errors: PatchValidationIssue[];
  warnings: PatchValidationIssue[];
};

export type DiffLineKind = "added" | "removed" | "unchanged";

export type DiffLine = {
  kind: DiffLineKind;
  oldLineNumber?: number;
  newLineNumber?: number;
  text: string;
};

export type DiffHunk = {
  filePath: string;
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
};

export type DiffSummary = {
  filesChanged: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
  largestFileBytes: number;
  riskWarnings: string[];
  hunks: DiffHunk[];
};

export type DiffAuditDecision = "valid" | "invalid" | "needs_approval";

export type ChangedFileSummary = {
  path: string;
  operation: PatchOperation;
  beforeHash?: string;
  afterHash?: string;
  sizeBytes: number;
};

export type DiffAuditReport = {
  auditId: string;
  proposalId: string;
  decision: DiffAuditDecision;
  reasons: string[];
  riskLevel: CapabilityRiskLevel;
  pathWarnings: string[];
  contentWarnings: string[];
  beforeHashes: Record<string, string>;
  afterHashes: Record<string, string>;
  changedFiles: ChangedFileSummary[];
  requiresApproval: boolean;
  noCompressZoneRefs: string[];
  suggestedNextAction: "approve" | "reject" | "request_changes";
  hash: string;
};

export type PatchProposal = {
  proposalId: string;
  taskId: string;
  agentId?: string;
  source: PatchProposalSource;
  title: string;
  description: string;
  changes: PatchFileChange[];
  createdAt: string;
  status: PatchProposalStatus;
  riskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  validation: PatchValidationResult;
  diffSummary: DiffSummary;
  auditReport: DiffAuditReport;
  hash: string;
};

export type VirtualWorkspaceFile = {
  path: string;
  content: string;
  contentType: string;
  encoding: "utf8";
  sizeBytes: number;
  hash: string;
};

export type VirtualWorkspaceSnapshot = {
  snapshotId: string;
  createdAt: string;
  files: Record<string, VirtualWorkspaceFile>;
  hash: string;
};

export type RollbackCheckpointFileState = {
  path: string;
  existed: boolean;
  file?: VirtualWorkspaceFile;
};

export type RollbackCheckpoint = {
  checkpointId: string;
  proposalId: string;
  createdAt: string;
  snapshotHash: string;
  fileStates: RollbackCheckpointFileState[];
  pathSummaries: string[];
  hash: string;
};

export type PatchApplySimulation = {
  ok: boolean;
  proposalId: string;
  snapshotBeforeHash: string;
  snapshotAfter?: VirtualWorkspaceSnapshot;
  checkpoint?: RollbackCheckpoint;
  changedFileSummaries: ChangedFileSummary[];
  errors: PatchValidationIssue[];
  eventIds?: string[];
};

export type RollbackSimulation = {
  ok: boolean;
  checkpointId: string;
  snapshot?: VirtualWorkspaceSnapshot;
  errors: PatchValidationIssue[];
  eventIds?: string[];
};

export type PatchApprovalDecision = "approved" | "rejected" | "needs_changes";

export type PatchEventSummary = {
  proposalId: string;
  taskId?: string;
  agentId?: string;
  operationCounts: Record<PatchOperation, number>;
  paths: string[];
  hashes: Record<string, string>;
  riskLevel: CapabilityRiskLevel;
  decision: string;
  warningCodes: string[];
  reasonCodes: string[];
};

export type PatchServiceOptions = {
  clock?: () => Date;
  idFactory?: () => string;
  maxFileBytes?: number;
  maxPatchBytes?: number;
  allowHiddenControlPaths?: boolean;
  eventStore?: EventStore;
};

export type PatchProposalInput = {
  proposalId?: string;
  taskId: string;
  agentId?: string;
  source: PatchProposalSource;
  title: string;
  description: string;
  changes: PatchFileChange[];
  createdAt?: string;
  riskLevel?: CapabilityRiskLevel;
  requiresApproval?: boolean;
  noCompressZoneRefs?: string[];
};
