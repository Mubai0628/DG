import {
  normalizeRunDraftEventRecordResult,
  validateRunDraftEventPayload,
  type AppRunDraftEventRecordRequest,
  type AppRunDraftEventRecordResult
} from "./run-draft-event-view.js";
import {
  normalizeDesktopCommandError,
  normalizeDesktopFlowResult,
  normalizeRunnerPreflightSummary,
  normalizeWorkspaceEventSummary,
  safeErrorMessage,
  validateDesktopFlowInput,
  type DesktopFlowInput,
  type DesktopFlowResult,
  type RunnerPreflightSummary,
  type WorkspaceEventSummary
} from "./safety.js";

export type TauriInvoke = <T>(
  command: string,
  args?: Record<string, unknown>
) => Promise<T>;

export type ApprovedUserWorkspaceApplyChangeKind =
  | "create"
  | "update"
  | "delete";

export type ApprovedUserWorkspaceApplyOperation = {
  path: string;
  changeKind: ApprovedUserWorkspaceApplyChangeKind;
  content?: string | undefined;
  expectedBeforeHash?: string | undefined;
  expectedExistsBefore?: boolean | undefined;
};

export type ApprovedUserWorkspaceApplyRequest = {
  workspaceRoot: string;
  workspaceRootRef: string;
  receipt: Record<string, unknown>;
  operations: ApprovedUserWorkspaceApplyOperation[];
  proposalSummary: Record<string, unknown>;
  validationSummary: Record<string, unknown>;
  auditSummary: Record<string, unknown>;
  approvalSummary: Record<string, unknown>;
  maxFiles: number;
  maxBytes: number;
};

export type ApprovedUserWorkspaceApplyResult = {
  ok: true;
  applyId: string;
  checkpointId: string;
  checkpointHash: string;
  workspaceRootRef: string;
  operationCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  bytesWritten: number;
  warningCodes: string[];
  inputSnapshotHash: string;
  outputSnapshotHash: string;
  resultHash: string;
  eventPreview: {
    type: "user_workspace.patch_apply.approved_result";
    applyId: string;
    checkpointId: string;
    checkpointHash: string;
    workspaceRootRef: string;
    operationCount: number;
    filesCreated: number;
    filesUpdated: number;
    filesDeleted: number;
    bytesWritten: number;
    pathSummaries: string[];
    pathSummaryCount: number;
    resultHash: string;
    warningCodes: string[];
    notWritten: true;
  };
  safeMessage: string;
};

export type ApprovedUserWorkspaceRollbackRequest = {
  workspaceRoot: string;
  workspaceRootRef: string;
  receipt: Record<string, unknown>;
  applyId: string;
  checkpointId: string;
  checkpointRef: string;
};

export type ApprovedUserWorkspaceRollbackResult = {
  ok: true;
  rollbackId: string;
  applyId: string;
  checkpointId: string;
  checkpointHash: string;
  workspaceRootRef: string;
  operationCount: number;
  filesRemoved: number;
  filesRestored: number;
  restoredSnapshotHash: string;
  resultHash: string;
  warningCodes: string[];
  eventPreview: {
    type: "user_workspace.patch_rollback.approved_result";
    rollbackId: string;
    applyId: string;
    checkpointId: string;
    checkpointHash: string;
    workspaceRootRef: string;
    operationCount: number;
    filesRemoved: number;
    filesRestored: number;
    pathSummaries: string[];
    pathSummaryCount: number;
    restoredSnapshotHash: string;
    resultHash: string;
    warningCodes: string[];
    notWritten: true;
  };
  safeMessage: string;
};

export type ApprovedUserWorkspaceExecutionEventRequest = {
  workspaceRoot: string;
  eventPreview:
    | ApprovedUserWorkspaceApplyResult["eventPreview"]
    | ApprovedUserWorkspaceRollbackResult["eventPreview"];
};

export type VerificationLaneEventRequest = {
  workspaceRoot: string;
  eventPreview:
    | GitReadLaneResult["eventPreview"]
    | ShellVerificationLaneResult["eventPreview"];
};

export type LiveProposalSummaryEventPreview = {
  type: "model.patch_proposal.live_generated";
  generationId: string;
  requestId: string;
  proposalId: string;
  modelProfileId: string;
  usageSummary?: LiveDeepSeekPatchProposalUsageSummary | undefined;
  repairStatus: string;
  validationStatus: string;
  warningCount: number;
  blockerCount: number;
  proposalHash: string;
  droppedReasoningContent: boolean;
  warningCodes: string[];
  summaryOnly: true;
  noRawPrompt: true;
  noRawResponse: true;
  noReasoningContent: true;
  noApiKey: true;
  contentDraftRawIncluded: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  notWritten: true;
};

export type LiveProposalSummaryEventRequest = {
  workspaceRoot: string;
  eventPreview: LiveProposalSummaryEventPreview;
};

export type ApprovedUserWorkspaceExecutionEventRecordResult = {
  ok: true;
  eventId: string;
  eventType:
    | "user_workspace.patch_apply.app_executed"
    | "user_workspace.patch_rollback.app_executed";
  operationId: string;
  checkpointId: string;
  eventLogPath: string;
  safeMessage: string;
  warnings: string[];
};

export type VerificationLaneEventRecordResult = {
  ok: true;
  eventId: string;
  eventType: "git.read_lane.executed" | "shell.verification_lane.executed";
  laneOrTemplateId: string;
  resultHash: string;
  eventLogPath: string;
  safeMessage: string;
  warnings: string[];
};

export type LiveProposalSummaryEventRecordResult = {
  ok: true;
  eventId: string;
  eventType: "model.patch_proposal.live_generated";
  generationId: string;
  proposalId: string;
  eventLogPath: string;
  safeMessage: string;
  warnings: string[];
};

export type GitReadLane =
  | "status_summary"
  | "diff_summary"
  | "log_summary"
  | "branch_summary";

export type GitReadLaneRequest = {
  workspaceRoot: string;
  workspaceRootRef: string;
  lane: GitReadLane;
  pathspecs?: string[] | undefined;
  timeoutMs?: number | undefined;
  maxOutputBytes?: number | undefined;
};

export type GitReadLaneResult = {
  ok: true;
  lane: GitReadLane;
  status: "clean" | "changed" | "summary" | "warning";
  workspaceRootRef: string;
  branchSummary: string;
  fileCount: number;
  changedFileCount: number;
  addedLineCount: number;
  deletedLineCount: number;
  changedPathSummaries: string[];
  warningCodes: string[];
  commandHash: string;
  outputHash: string;
  durationMs: number;
  truncated: boolean;
  rawDiffIncluded: false;
  rawStdoutIncluded: false;
  rawStderrIncluded: false;
  eventPreview: {
    type: "git.read_lane.executed";
    lane: GitReadLane;
    workspaceRootRef: string;
    commandHash: string;
    resultHash: string;
    changedFileCount: number;
    addedLineCount: number;
    deletedLineCount: number;
    warningCodes: string[];
    durationMs: number;
    truncated: boolean;
    summaryOnly: true;
    notWritten: true;
  };
  safeMessage: string;
};

export type ShellVerificationTemplateId =
  | "pnpm.typecheck"
  | "pnpm.lint"
  | "pnpm.test.scoped"
  | "app.typecheck"
  | "cargo.check_tauri";

export type ShellVerificationLaneRequest = {
  workspaceRoot: string;
  workspaceRootRef: string;
  templateId: ShellVerificationTemplateId;
  safeArgs?: {
    testFilePath?: string | undefined;
  };
  timeoutMs?: number | undefined;
  maxOutputBytes?: number | undefined;
};

export type ShellVerificationLaneResult = {
  ok: true;
  templateId: ShellVerificationTemplateId;
  status: "passed" | "failed";
  exitCode: number | null;
  workspaceRootRef: string;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutLineCount: number;
  stderrLineCount: number;
  warningCodes: string[];
  commandHash: string;
  outputHash: string;
  durationMs: number;
  truncated: boolean;
  rawStdoutIncluded: false;
  rawStderrIncluded: false;
  eventPreview: {
    type: "shell.verification_lane.executed";
    templateId: ShellVerificationTemplateId;
    workspaceRootRef: string;
    commandHash: string;
    resultHash: string;
    exitCode: number | null;
    stdoutBytes: number;
    stderrBytes: number;
    warningCodes: string[];
    durationMs: number;
    truncated: boolean;
    summaryOnly: true;
    notWritten: true;
  };
  safeMessage: string;
};

export const liveProposalAllowedKeySourceRef = ["DEEPSEEK", "API", "KEY"].join(
  "_"
);

export type LiveDeepSeekPatchProposalCommandRequest = {
  sessionReceipt: Record<string, unknown>;
  apiKeySourceRef: string;
  providerId: "deepseek";
  modelProfileId: string;
  requestEnvelope: Record<string, unknown>;
  objectiveSummary: string;
  allowedPathRefs: string[];
  contextRefs: string[];
  maxResponseBytes: number;
  timeoutMs: number;
};

export type LiveDeepSeekPatchProposalUsageSummary = {
  promptTokens?: number | undefined;
  completionTokens?: number | undefined;
  totalTokens?: number | undefined;
};

export type LiveDeepSeekPatchProposalCommandResult = {
  ok: true;
  status: "generated";
  providerId: "deepseek";
  modelProfileId: string;
  requestId: string;
  responseId?: string | undefined;
  proposalCandidate: Record<string, unknown>;
  proposalCandidateHash: string;
  responseHash: string;
  usageSummary?: LiveDeepSeekPatchProposalUsageSummary | undefined;
  droppedReasoningContent: boolean;
  reasoningContentCharCount: number;
  warningCodes: string[];
  summaryOnly: true;
  rawPromptIncluded: false;
  rawResponseIncluded: false;
  rawReasoningContentIncluded: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  safeMessage: string;
};

export type McpReadonlyDiscoverRequest = {
  profile: Record<string, unknown>;
  typedConfirmation: "DISCOVER MCP METADATA" | string;
  maxItems: number;
  timeoutMs: number;
};

export type McpReadonlyDiscoverResult = {
  ok: true;
  discoveryId: string;
  profileId: string;
  serverInfo: {
    serverId: string;
    displayName: string;
    serverVersion: string;
    metadataHash: string;
  };
  resourceCount: number;
  promptCount: number;
  toolCount: number;
  resourceSummaries: Array<Record<string, unknown>>;
  promptSummaries: Array<Record<string, unknown>>;
  toolSummaries: Array<Record<string, unknown>>;
  warningCodes: string[];
  summaryOnly: true;
  rawMetadataIncluded: false;
  rawStdoutIncluded: false;
  rawStderrIncluded: false;
  canCallTool: false;
  canReadResource: false;
  canExecutePrompt: false;
  canMutate: false;
  canWriteEventStore: false;
  resultHash: string;
  safeMessage: string;
};

export type McpReadonlyToolCallCommandRequest = {
  connectionProfileRef: string;
  serverProfile: Record<string, unknown>;
  toolContractSummary: Record<string, unknown>;
  approvalReceipt: Record<string, unknown>;
  argumentSummary: string;
  argumentValues: Record<string, unknown>;
  maxOutputBytes: number;
  timeoutMs: number;
};

export type McpReadonlyToolCallCommandResult = {
  ok: true;
  status: "called";
  callId: string;
  toolId: string;
  connectionProfileRef: string;
  outputSummary: {
    outputHash: string;
    outputBytes: number;
    outputLineCount: number;
    warningCodes: string[];
    rawOutputIncluded: false;
  };
  outputHash: string;
  outputBytes: number;
  redactionCounts: {
    secretMarkerCount: number;
    rawMarkerCount: number;
    mutatingMarkerCount: number;
    truncatedByteCount: number;
  };
  warningCodes: string[];
  eventPreview: {
    type: "mcp.readonly_tool.result";
    callId: string;
    toolId: string;
    connectionProfileRefHash: string;
    outputHash: string;
    outputBytes: number;
    warningCodes: string[];
    summaryOnly: true;
    rawOutputIncluded: false;
    notWritten: true;
  };
  summaryOnly: true;
  calledReadonlyTool: true;
  rawOutputIncluded: false;
  rawArgsIncluded: false;
  canCallMcpTool: false;
  canInvokeMutatingTool: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
  resultHash: string;
  safeMessage: string;
};

export type ProjectKnowledgeEvidenceRef = {
  refId: string;
  kind: string;
  summary: string;
  hashPrefix: string;
  warningCodes?: string[] | undefined;
};

export type ProjectKnowledgeCandidate = {
  type: "policy" | "project_fact" | "pitfall";
  namespace: string;
  summary: string;
  trust: {
    score: number;
    level: "low" | "medium" | "high" | "trusted";
    humanReviewed: boolean;
    reviewedBy?: string | undefined;
  };
  provenance: {
    sourceKind:
      | "human_reviewed"
      | "repo_doc_summary"
      | "manual_import_summary"
      | "model_suggested"
      | "tool_output_summary"
      | "external_summary";
    sourceId?: string | undefined;
    actor?: string | undefined;
    summary: string;
    refHashes?: string[] | undefined;
  };
  evidenceRefs: ProjectKnowledgeEvidenceRef[];
  tags?: string[] | undefined;
  policyScope?: string | undefined;
  sourceKind?: "human_reviewed" | "repo_doc_summary" | "manual_import_summary";
  factKind?: string | undefined;
  triggerSummary?: string | undefined;
  mitigationSummary?: string | undefined;
  severity?: "low" | "medium" | "high" | undefined;
  expiresAt?: string | undefined;
  pinned?: boolean | undefined;
};

export type ProjectKnowledgeEntrySummary = {
  entryId: string;
  type: "policy" | "project_fact" | "pitfall";
  namespace: string;
  summary: string;
  status: string;
  evidenceRefCount: number;
  tagCount: number;
  entryHash: string;
  warningCodes: string[];
  summaryOnly: true;
};

export type ProjectKnowledgeSnapshotResult = {
  ok: true;
  status: "empty" | "ready" | "warning";
  storePath: string;
  entriesPath: string;
  eventsPath: string;
  indexPath: string;
  entryCount: number;
  activeEntryCount: number;
  revokedEntryCount: number;
  expiredEntryCount: number;
  entries: ProjectKnowledgeEntrySummary[];
  warnings: string[];
  snapshotHash: string;
  summaryOnly: true;
  rawContentIncluded: false;
  safeMessage: string;
};

export type ProjectKnowledgeCommitResult = {
  ok: true;
  entry: ProjectKnowledgeEntrySummary;
  eventId: string;
  storePath: string;
  entryCount: number;
  indexHash: string;
  summaryOnly: true;
  rawContentIncluded: false;
  safeMessage: string;
  warnings: string[];
};

export type ProjectKnowledgeLifecycleResult = {
  ok: true;
  entryId: string;
  status: "revoked" | "expired";
  eventId: string;
  storePath: string;
  indexHash: string;
  summaryOnly: true;
  rawContentIncluded: false;
  safeMessage: string;
  warnings: string[];
};

export type DesktopObservationCommandRequest = {
  profile: Record<string, unknown>;
  requestId: string;
  userTriggered: true;
  includeForegroundWindow: boolean;
  includeWindowList: boolean;
  includeDisplayMetadata: boolean;
  includeScreenshotMetadata: boolean;
};

export type DesktopObservationCommandSummaryItem = {
  [key: string]: unknown;
  redactionCodes?: string[] | undefined;
};

export type DesktopObservationCommandResult = {
  ok: true;
  status: "observed" | "warning";
  requestId: string;
  observationId: string;
  profileId?: string | undefined;
  windowCount: number;
  appCount: number;
  displayCount: number;
  screenshotMetadataIncluded: boolean;
  windows: DesktopObservationCommandSummaryItem[];
  apps: DesktopObservationCommandSummaryItem[];
  displays: DesktopObservationCommandSummaryItem[];
  screenshotMetadata?: DesktopObservationCommandSummaryItem | undefined;
  warningCodes: string[];
  summaryOnly: true;
  rawScreenshotPersisted: false;
  rawOcrTextPersisted: false;
  rawClipboardIncluded: false;
  canDesktopAction: false;
  canClickTypeSelect: false;
  canWriteClipboard: false;
  canSendToModel: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
  resultHash: string;
  safeMessage: string;
};

export type ApprovedDesktopActionKind =
  | "focus_observed_window"
  | "raise_observed_window"
  | "activate_observed_window";

export type ApprovedDesktopActionCommandRequest = {
  receipt: Record<string, unknown>;
  actionKind: ApprovedDesktopActionKind | string;
  targetWindowRef: string;
  targetAppRef: string;
  targetDisplayRef?: string | undefined;
  observerEvidenceId: string;
  desktopActionProposalId: string;
  riskClassificationId: string;
  typedConfirmation: string;
};

export type ApprovedDesktopActionCommandEventPreview = {
  type: "desktop_action.approved_result";
  actionId: string;
  actionKind: ApprovedDesktopActionKind;
  targetWindowRef: string;
  targetAppRef: string;
  targetDisplayRef?: string | undefined;
  observerEvidenceId: string;
  desktopActionProposalId: string;
  riskClassificationId: string;
  status: "executed" | "unsupported_platform" | "blocked";
  resultHash: string;
  warningCodes: string[];
  notWritten: true;
  summaryOnly: true;
};

export type ApprovedDesktopActionCommandResult = {
  ok: true;
  status: "executed" | "unsupported_platform" | "blocked";
  actionId: string;
  actionKind: ApprovedDesktopActionKind;
  targetWindowRef: string;
  targetAppRef: string;
  targetDisplayRef?: string | undefined;
  observerEvidenceId: string;
  desktopActionProposalId: string;
  riskClassificationId: string;
  warningCodes: string[];
  resultHash: string;
  eventPreview: ApprovedDesktopActionCommandEventPreview;
  summaryOnly: true;
  rawScreenshotPersisted: false;
  rawOcrTextPersisted: false;
  rawWindowContentIncluded: false;
  canClickTypeSelect: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canUseNativeBridge: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
  safeMessage: string;
};

export const allowedDesktopCommands = [
  "get_app_version",
  "apply_approved_user_workspace_patch",
  "rollback_approved_user_workspace_patch",
  "check_runner_preflight",
  "load_workspace_event_summary",
  "record_approved_user_workspace_execution_event",
  "record_control_run_draft_event",
  "record_verification_lane_event",
  "record_live_proposal_summary_event",
  "mcp_readonly_discover",
  "call_mcp_readonly_tool",
  "generate_live_deepseek_patch_proposal",
  "project_knowledge_list",
  "project_knowledge_commit_candidate",
  "project_knowledge_revoke",
  "project_knowledge_expire",
  "run_git_read_lane",
  "run_shell_verification_lane",
  "observe_desktop_metadata",
  "execute_approved_desktop_action",
  "run_web_table_to_csv_flow"
] as const;

export type AllowedDesktopCommand = (typeof allowedDesktopCommands)[number];

export function isAllowedDesktopCommand(
  command: string
): command is AllowedDesktopCommand {
  return allowedDesktopCommands.includes(command as AllowedDesktopCommand);
}

export async function runDesktopWebTableToCsvFlow(
  input: DesktopFlowInput,
  invokeImpl?: TauriInvoke
): Promise<DesktopFlowResult> {
  const validation = validateDesktopFlowInput(input);
  if (!validation.ok) {
    throw new Error(validation.errorMessage);
  }

  const preflight = await checkDesktopRunnerPreflight(
    input.workspaceRoot,
    invokeImpl
  );
  if (!preflight.ok) {
    throw new Error(preflight.safeMessage ?? "Runner preflight failed");
  }

  return invokeAllowedCommand<DesktopFlowResult>(
    "run_web_table_to_csv_flow",
    validation.request,
    invokeImpl
  );
}

export async function checkDesktopRunnerPreflight(
  workspaceRoot?: string,
  invokeImpl?: TauriInvoke
): Promise<RunnerPreflightSummary> {
  return invokeAllowedCommand<RunnerPreflightSummary>(
    "check_runner_preflight",
    workspaceRoot?.trim()
      ? {
          workspaceRoot
        }
      : {},
    invokeImpl
  );
}

export async function getDesktopAppVersion(
  invokeImpl?: TauriInvoke
): Promise<string> {
  return invokeAllowedCommand<string>("get_app_version", {}, invokeImpl);
}

export async function loadWorkspaceEventSummary(
  workspaceRoot: string,
  maxEvents = 50,
  invokeImpl?: TauriInvoke
): Promise<WorkspaceEventSummary> {
  if (workspaceRoot.trim().length === 0) {
    throw new Error("Workspace root is required");
  }

  return invokeAllowedCommand<WorkspaceEventSummary>(
    "load_workspace_event_summary",
    {
      workspaceRoot,
      maxEvents
    },
    invokeImpl
  );
}

export async function recordControlRunDraftEvent(
  request: AppRunDraftEventRecordRequest,
  invokeImpl?: TauriInvoke
): Promise<AppRunDraftEventRecordResult> {
  if (request.workspaceRoot.trim().length === 0) {
    throw new Error("Workspace root is required");
  }
  const validation = validateRunDraftEventPayload(request.payload);
  if (!validation.ok) {
    throw new Error(validation.safeMessage);
  }

  return invokeAllowedCommand<AppRunDraftEventRecordResult>(
    "record_control_run_draft_event",
    {
      workspaceRoot: request.workspaceRoot,
      payloadJson: JSON.stringify(request.payload)
    },
    invokeImpl
  );
}

export async function applyApprovedUserWorkspacePatch(
  request: ApprovedUserWorkspaceApplyRequest,
  invokeImpl?: TauriInvoke
): Promise<ApprovedUserWorkspaceApplyResult> {
  validateApprovedApplyRequest(request);
  return invokeAllowedCommand<ApprovedUserWorkspaceApplyResult>(
    "apply_approved_user_workspace_patch",
    { request },
    invokeImpl
  );
}

export async function rollbackApprovedUserWorkspacePatch(
  request: ApprovedUserWorkspaceRollbackRequest,
  invokeImpl?: TauriInvoke
): Promise<ApprovedUserWorkspaceRollbackResult> {
  validateApprovedRollbackRequest(request);
  return invokeAllowedCommand<ApprovedUserWorkspaceRollbackResult>(
    "rollback_approved_user_workspace_patch",
    { request },
    invokeImpl
  );
}

export async function recordApprovedUserWorkspaceExecutionEvent(
  request: ApprovedUserWorkspaceExecutionEventRequest,
  invokeImpl?: TauriInvoke
): Promise<ApprovedUserWorkspaceExecutionEventRecordResult> {
  validateApprovedExecutionEventRequest(request);
  return invokeAllowedCommand<ApprovedUserWorkspaceExecutionEventRecordResult>(
    "record_approved_user_workspace_execution_event",
    {
      workspaceRoot: request.workspaceRoot,
      eventPreview: request.eventPreview
    },
    invokeImpl
  );
}

export async function recordVerificationLaneEvent(
  request: VerificationLaneEventRequest,
  invokeImpl?: TauriInvoke
): Promise<VerificationLaneEventRecordResult> {
  validateVerificationLaneEventRequest(request);
  return invokeAllowedCommand<VerificationLaneEventRecordResult>(
    "record_verification_lane_event",
    {
      workspaceRoot: request.workspaceRoot,
      eventPreview: request.eventPreview
    },
    invokeImpl
  );
}

export async function recordLiveProposalSummaryEvent(
  request: LiveProposalSummaryEventRequest,
  invokeImpl?: TauriInvoke
): Promise<LiveProposalSummaryEventRecordResult> {
  validateLiveProposalSummaryEventRequest(request);
  return invokeAllowedCommand<LiveProposalSummaryEventRecordResult>(
    "record_live_proposal_summary_event",
    {
      workspaceRoot: request.workspaceRoot,
      eventPreview: request.eventPreview
    },
    invokeImpl
  );
}

export async function runGitReadLane(
  request: GitReadLaneRequest,
  invokeImpl?: TauriInvoke
): Promise<GitReadLaneResult> {
  validateGitReadLaneRequest(request);
  return invokeAllowedCommand<GitReadLaneResult>(
    "run_git_read_lane",
    { request },
    invokeImpl
  );
}

export async function runShellVerificationLane(
  request: ShellVerificationLaneRequest,
  invokeImpl?: TauriInvoke
): Promise<ShellVerificationLaneResult> {
  validateShellVerificationLaneRequest(request);
  return invokeAllowedCommand<ShellVerificationLaneResult>(
    "run_shell_verification_lane",
    { request },
    invokeImpl
  );
}

export async function runMcpReadonlyDiscovery(
  request: McpReadonlyDiscoverRequest,
  invokeImpl?: TauriInvoke
): Promise<McpReadonlyDiscoverResult> {
  validateMcpReadonlyDiscoverRequest(request);
  return invokeAllowedCommand<McpReadonlyDiscoverResult>(
    "mcp_readonly_discover",
    { request },
    invokeImpl
  );
}

export async function callMcpReadonlyTool(
  request: McpReadonlyToolCallCommandRequest,
  invokeImpl?: TauriInvoke
): Promise<McpReadonlyToolCallCommandResult> {
  validateMcpReadonlyToolCallRequest(request);
  return invokeAllowedCommand<McpReadonlyToolCallCommandResult>(
    "call_mcp_readonly_tool",
    { request },
    invokeImpl
  );
}

export async function generateLiveDeepSeekPatchProposal(
  request: LiveDeepSeekPatchProposalCommandRequest,
  invokeImpl?: TauriInvoke
): Promise<LiveDeepSeekPatchProposalCommandResult> {
  validateLiveDeepSeekPatchProposalRequest(request);
  return invokeAllowedCommand<LiveDeepSeekPatchProposalCommandResult>(
    "generate_live_deepseek_patch_proposal",
    { request },
    invokeImpl
  );
}

export async function listProjectKnowledge(
  workspaceRoot: string,
  invokeImpl?: TauriInvoke
): Promise<ProjectKnowledgeSnapshotResult> {
  validateProjectKnowledgeWorkspace(workspaceRoot);
  return invokeAllowedCommand<ProjectKnowledgeSnapshotResult>(
    "project_knowledge_list",
    { workspaceRoot },
    invokeImpl
  );
}

export async function commitProjectKnowledgeCandidate(
  request: {
    workspaceRoot: string;
    candidate: ProjectKnowledgeCandidate;
  },
  invokeImpl?: TauriInvoke
): Promise<ProjectKnowledgeCommitResult> {
  validateProjectKnowledgeWorkspace(request.workspaceRoot);
  validateProjectKnowledgeCandidate(request.candidate);
  return invokeAllowedCommand<ProjectKnowledgeCommitResult>(
    "project_knowledge_commit_candidate",
    {
      workspaceRoot: request.workspaceRoot,
      candidate: request.candidate
    },
    invokeImpl
  );
}

export async function revokeProjectKnowledgeEntry(
  request: {
    workspaceRoot: string;
    entryId: string;
    typedConfirmation: "REVOKE PROJECT KNOWLEDGE" | string;
  },
  invokeImpl?: TauriInvoke
): Promise<ProjectKnowledgeLifecycleResult> {
  validateProjectKnowledgeWorkspace(request.workspaceRoot);
  if (request.entryId.trim().length === 0) {
    throw new Error("Project knowledge entry id is required");
  }
  if (request.typedConfirmation !== "REVOKE PROJECT KNOWLEDGE") {
    throw new Error("Project knowledge revoke confirmation is required");
  }
  return invokeAllowedCommand<ProjectKnowledgeLifecycleResult>(
    "project_knowledge_revoke",
    {
      workspaceRoot: request.workspaceRoot,
      entryId: request.entryId,
      typedConfirmation: request.typedConfirmation
    },
    invokeImpl
  );
}

export async function expireProjectKnowledgeEntry(
  request: {
    workspaceRoot: string;
    entryId: string;
    reasonSummary: string;
  },
  invokeImpl?: TauriInvoke
): Promise<ProjectKnowledgeLifecycleResult> {
  validateProjectKnowledgeWorkspace(request.workspaceRoot);
  if (request.entryId.trim().length === 0) {
    throw new Error("Project knowledge entry id is required");
  }
  if (request.reasonSummary.trim().length === 0) {
    throw new Error("Project knowledge expire reason summary is required");
  }
  return invokeAllowedCommand<ProjectKnowledgeLifecycleResult>(
    "project_knowledge_expire",
    {
      workspaceRoot: request.workspaceRoot,
      entryId: request.entryId,
      reasonSummary: request.reasonSummary
    },
    invokeImpl
  );
}

export async function observeDesktopMetadata(
  request: DesktopObservationCommandRequest,
  invokeImpl?: TauriInvoke
): Promise<DesktopObservationCommandResult> {
  validateDesktopObservationCommandRequest(request);
  return invokeAllowedCommand<DesktopObservationCommandResult>(
    "observe_desktop_metadata",
    { request },
    invokeImpl
  );
}

export async function executeApprovedDesktopAction(
  request: ApprovedDesktopActionCommandRequest,
  invokeImpl?: TauriInvoke
): Promise<ApprovedDesktopActionCommandResult> {
  validateApprovedDesktopActionCommandRequest(request);
  return invokeAllowedCommand<ApprovedDesktopActionCommandResult>(
    "execute_approved_desktop_action",
    { request },
    invokeImpl
  );
}

export async function invokeAllowedCommand<T>(
  command: string,
  args: Record<string, unknown>,
  invokeImpl?: TauriInvoke
): Promise<T> {
  if (!isAllowedDesktopCommand(command)) {
    throw new Error("Desktop command is not allowed");
  }

  const raw = await safeInvoke(command, args, invokeImpl);
  return normalizeAllowedCommandResponse(command, raw) as T;
}

export async function safeInvoke(
  command: AllowedDesktopCommand,
  args: Record<string, unknown>,
  invokeImpl?: TauriInvoke
): Promise<unknown> {
  const invoke = invokeImpl ?? (await import("@tauri-apps/api/core")).invoke;
  try {
    return await invoke<unknown>(command, args);
  } catch (error) {
    throw normalizeDesktopCommandError(error);
  }
}

function normalizeAllowedCommandResponse(
  command: AllowedDesktopCommand,
  raw: unknown
): unknown {
  switch (command) {
    case "get_app_version":
      if (typeof raw !== "string") {
        throw normalizeDesktopCommandError({
          errorCode: "INVALID_RESPONSE",
          safeMessage: "App version response was invalid",
          stage: "normalize_response"
        });
      }
      return raw;
    case "check_runner_preflight":
      return normalizeRunnerPreflightSummary(raw);
    case "load_workspace_event_summary":
      return normalizeWorkspaceEventSummary(raw);
    case "record_control_run_draft_event":
      return normalizeRunDraftEventRecordResult(raw);
    case "record_approved_user_workspace_execution_event":
      return normalizeApprovedExecutionEventRecordResult(raw);
    case "record_verification_lane_event":
      return normalizeVerificationLaneEventRecordResult(raw);
    case "record_live_proposal_summary_event":
      return normalizeLiveProposalSummaryEventRecordResult(raw);
    case "mcp_readonly_discover":
      return normalizeMcpReadonlyDiscoverResult(raw);
    case "call_mcp_readonly_tool":
      return normalizeMcpReadonlyToolCallResult(raw);
    case "run_git_read_lane":
      return normalizeGitReadLaneResult(raw);
    case "run_shell_verification_lane":
      return normalizeShellVerificationLaneResult(raw);
    case "observe_desktop_metadata":
      return normalizeDesktopObservationCommandResult(raw);
    case "execute_approved_desktop_action":
      return normalizeApprovedDesktopActionCommandResult(raw);
    case "apply_approved_user_workspace_patch":
      return normalizeApprovedApplyResult(raw);
    case "rollback_approved_user_workspace_patch":
      return normalizeApprovedRollbackResult(raw);
    case "generate_live_deepseek_patch_proposal":
      return normalizeLiveDeepSeekPatchProposalResult(raw);
    case "project_knowledge_list":
      return normalizeProjectKnowledgeSnapshotResult(raw);
    case "project_knowledge_commit_candidate":
      return normalizeProjectKnowledgeCommitResult(raw);
    case "project_knowledge_revoke":
    case "project_knowledge_expire":
      return normalizeProjectKnowledgeLifecycleResult(raw);
    case "run_web_table_to_csv_flow":
      return normalizeDesktopFlowResult(raw);
    default:
      throw new Error(safeErrorMessage("Desktop command is not allowed"));
  }
}

function validateMcpReadonlyDiscoverRequest(
  request: McpReadonlyDiscoverRequest
): void {
  if (!isRecord(request.profile)) {
    throw new Error("MCP readonly discovery profile is required");
  }
  if (request.typedConfirmation !== "DISCOVER MCP METADATA") {
    throw new Error("MCP readonly discovery confirmation is required");
  }
  if (!Number.isFinite(request.maxItems) || request.maxItems <= 0) {
    throw new Error("MCP readonly discovery maxItems must be positive");
  }
  if (!Number.isFinite(request.timeoutMs) || request.timeoutMs <= 0) {
    throw new Error("MCP readonly discovery timeoutMs must be positive");
  }
  if (containsForbiddenLiveProposalValue(request)) {
    throw new Error("MCP readonly discovery request contains unsafe fields");
  }
}

function validateMcpReadonlyToolCallRequest(
  request: McpReadonlyToolCallCommandRequest
): void {
  if (request.connectionProfileRef.trim().length === 0) {
    throw new Error("MCP readonly tool connectionProfileRef is required");
  }
  if (!isRecord(request.serverProfile)) {
    throw new Error("MCP readonly tool serverProfile is required");
  }
  if (!isRecord(request.toolContractSummary)) {
    throw new Error("MCP readonly tool contract summary is required");
  }
  if (!isRecord(request.approvalReceipt)) {
    throw new Error("MCP readonly tool approval receipt is required");
  }
  if (!isRecord(request.argumentValues)) {
    throw new Error("MCP readonly tool argument values are required");
  }
  if (request.argumentSummary.trim().length === 0) {
    throw new Error("MCP readonly tool argument summary is required");
  }
  if (!Number.isFinite(request.maxOutputBytes) || request.maxOutputBytes <= 0) {
    throw new Error("MCP readonly tool maxOutputBytes must be positive");
  }
  if (!Number.isFinite(request.timeoutMs) || request.timeoutMs <= 0) {
    throw new Error("MCP readonly tool timeoutMs must be positive");
  }
  if (
    request.serverProfile.serverKind !== "mcp" ||
    request.serverProfile.transportKind !== "injected_test_transport"
  ) {
    throw new Error("MCP readonly tool requires fixed injected MCP profile");
  }
  if (request.toolContractSummary.declaredReadOnly !== true) {
    throw new Error("MCP readonly tool contract must be read-only");
  }
  if (request.approvalReceipt.typedConfirmation !== "CALL READONLY MCP TOOL") {
    throw new Error("MCP readonly tool typed confirmation is required");
  }
  if (containsForbiddenLiveProposalValue(request)) {
    throw new Error("MCP readonly tool request contains unsafe fields");
  }
}

function validateApprovedApplyRequest(
  request: ApprovedUserWorkspaceApplyRequest
): void {
  if (request.workspaceRoot.trim().length === 0) {
    throw new Error("Workspace root is required");
  }
  if (request.workspaceRootRef.trim().length === 0) {
    throw new Error("Workspace root ref is required");
  }
  if (!Array.isArray(request.operations) || request.operations.length === 0) {
    throw new Error("Approved apply operations are required");
  }
  if (request.maxFiles <= 0 || request.operations.length > request.maxFiles) {
    throw new Error("Approved apply operation count exceeds maxFiles");
  }
  if (request.maxBytes <= 0) {
    throw new Error("Approved apply maxBytes must be positive");
  }
}

function validateApprovedRollbackRequest(
  request: ApprovedUserWorkspaceRollbackRequest
): void {
  if (request.workspaceRoot.trim().length === 0) {
    throw new Error("Workspace root is required");
  }
  if (request.workspaceRootRef.trim().length === 0) {
    throw new Error("Workspace root ref is required");
  }
  if (request.applyId.trim().length === 0) {
    throw new Error("Approved rollback applyId is required");
  }
  if (request.checkpointId.trim().length === 0) {
    throw new Error("Approved rollback checkpointId is required");
  }
  if (request.checkpointRef.trim().length === 0) {
    throw new Error("Approved rollback checkpointRef is required");
  }
}

function validateApprovedExecutionEventRequest(
  request: ApprovedUserWorkspaceExecutionEventRequest
): void {
  if (request.workspaceRoot.trim().length === 0) {
    throw new Error("Workspace root is required");
  }
  const preview: Record<string, unknown> = isRecord(request.eventPreview)
    ? request.eventPreview
    : {};
  if (
    preview.notWritten !== true ||
    (preview.type !== "user_workspace.patch_apply.approved_result" &&
      preview.type !== "user_workspace.patch_rollback.approved_result")
  ) {
    throw new Error("Approved execution event preview is required");
  }
}

function validateVerificationLaneEventRequest(
  request: VerificationLaneEventRequest
): void {
  if (request.workspaceRoot.trim().length === 0) {
    throw new Error("Workspace root is required");
  }
  const preview: Record<string, unknown> = isRecord(request.eventPreview)
    ? request.eventPreview
    : {};
  if (
    preview.notWritten !== true ||
    preview.summaryOnly !== true ||
    (preview.type !== "git.read_lane.executed" &&
      preview.type !== "shell.verification_lane.executed")
  ) {
    throw new Error("Verification lane event preview is required");
  }
}

function validateLiveProposalSummaryEventRequest(
  request: LiveProposalSummaryEventRequest
): void {
  if (request.workspaceRoot.trim().length === 0) {
    throw new Error("Workspace root is required");
  }
  const preview: Record<string, unknown> = isRecord(request.eventPreview)
    ? request.eventPreview
    : {};
  if (
    preview.type !== "model.patch_proposal.live_generated" ||
    preview.notWritten !== true ||
    preview.summaryOnly !== true ||
    preview.noRawPrompt !== true ||
    preview.noRawResponse !== true ||
    preview.noReasoningContent !== true ||
    preview.noApiKey !== true ||
    preview.contentDraftRawIncluded !== false ||
    preview.canApplyPatch !== false ||
    preview.canRollback !== false ||
    preview.canWriteEventStore !== false
  ) {
    throw new Error("Live proposal summary event preview is required");
  }
  if (containsForbiddenLiveProposalValue(preview)) {
    throw new Error(
      "Live proposal summary event preview contains unsafe fields"
    );
  }
}

function validateGitReadLaneRequest(request: GitReadLaneRequest): void {
  if (request.workspaceRoot.trim().length === 0) {
    throw new Error("Workspace root is required");
  }
  if (request.workspaceRootRef.trim().length === 0) {
    throw new Error("Workspace root ref is required");
  }
  if (
    request.lane !== "status_summary" &&
    request.lane !== "diff_summary" &&
    request.lane !== "log_summary" &&
    request.lane !== "branch_summary"
  ) {
    throw new Error("Git read lane is not allowed");
  }
  if (request.pathspecs !== undefined) {
    if (!Array.isArray(request.pathspecs)) {
      throw new Error("Git pathspecs must be a list");
    }
    for (const pathspec of request.pathspecs) {
      if (typeof pathspec !== "string" || pathspec.trim().length === 0) {
        throw new Error("Git pathspecs must be non-empty strings");
      }
    }
  }
}

function validateShellVerificationLaneRequest(
  request: ShellVerificationLaneRequest
): void {
  if (request.workspaceRoot.trim().length === 0) {
    throw new Error("Workspace root is required");
  }
  if (request.workspaceRootRef.trim().length === 0) {
    throw new Error("Workspace root ref is required");
  }
  if (
    request.templateId !== "pnpm.typecheck" &&
    request.templateId !== "pnpm.lint" &&
    request.templateId !== "pnpm.test.scoped" &&
    request.templateId !== "app.typecheck" &&
    request.templateId !== "cargo.check_tauri"
  ) {
    throw new Error("Shell verification template is not allowed");
  }
  if (request.safeArgs?.testFilePath !== undefined) {
    const testFilePath = request.safeArgs.testFilePath.trim();
    if (
      testFilePath.length === 0 ||
      /[;&|$`()<>]/.test(testFilePath) ||
      testFilePath.includes("..") ||
      testFilePath.includes("\\") ||
      (!testFilePath.startsWith("runtime/test/") &&
        !testFilePath.startsWith("app/test/")) ||
      (!testFilePath.endsWith(".test.ts") &&
        !testFilePath.endsWith(".test.tsx") &&
        !testFilePath.endsWith(".spec.ts") &&
        !testFilePath.endsWith(".spec.tsx"))
    ) {
      throw new Error("Shell verification test file path is not allowed");
    }
  }
}

function validateLiveDeepSeekPatchProposalRequest(
  request: LiveDeepSeekPatchProposalCommandRequest
): void {
  if (!isRecord(request.sessionReceipt)) {
    throw new Error("Live proposal session receipt is required");
  }
  if (
    request.sessionReceipt.source !==
    "runtime_app_live_proposal_session_receipt"
  ) {
    throw new Error("Live proposal session receipt source is invalid");
  }
  if (request.sessionReceipt.typedConfirmationAccepted !== true) {
    throw new Error("Live proposal session receipt confirmation is required");
  }
  if (request.apiKeySourceRef !== liveProposalAllowedKeySourceRef) {
    throw new Error("Live proposal credential ref is not allowed");
  }
  if (request.providerId !== "deepseek") {
    throw new Error("Live proposal provider is not allowed");
  }
  if (request.modelProfileId.trim().length === 0) {
    throw new Error("Live proposal model profile is required");
  }
  if (request.objectiveSummary.trim().length === 0) {
    throw new Error("Live proposal objective summary is required");
  }
  if (
    !Array.isArray(request.allowedPathRefs) ||
    request.allowedPathRefs.length === 0
  ) {
    throw new Error("Live proposal allowed path refs are required");
  }
  for (const pathRef of request.allowedPathRefs) {
    validateLiveProposalRelativePath(pathRef);
  }
  if (!Array.isArray(request.contextRefs)) {
    throw new Error("Live proposal context refs are required");
  }
  if (!isRecord(request.requestEnvelope)) {
    throw new Error("Live proposal request envelope is required");
  }
  if (request.requestEnvelope.summaryOnly !== true) {
    throw new Error("Live proposal request envelope must be summary-only");
  }
  if (request.requestEnvelope.noExecution !== true) {
    throw new Error("Live proposal request envelope must disable execution");
  }
  if (
    request.requestEnvelope.noFileWrite !== true ||
    request.requestEnvelope.noApply !== true ||
    request.requestEnvelope.noRollback !== true ||
    request.requestEnvelope.noEventStoreWrite !== true ||
    request.requestEnvelope.noGitShell !== true
  ) {
    throw new Error(
      "Live proposal request envelope must keep write paths disabled"
    );
  }
  if (
    request.requestEnvelope.noTools !== true ||
    request.requestEnvelope.toolChoiceOmitted !== true
  ) {
    throw new Error("Live proposal request envelope must omit tools");
  }
  if (request.requestEnvelope.responseFormat !== "model_patch_proposal") {
    throw new Error("Live proposal response format is not allowed");
  }
  if (
    !Number.isInteger(request.maxResponseBytes) ||
    request.maxResponseBytes < 256 ||
    request.maxResponseBytes > 1_000_000 ||
    !Number.isInteger(request.timeoutMs) ||
    request.timeoutMs < 1_000 ||
    request.timeoutMs > 120_000
  ) {
    throw new Error("Live proposal limits are outside the allowed range");
  }
  if (containsForbiddenLiveProposalValue(request)) {
    throw new Error("Live proposal request contains unsafe fields");
  }
}

function validateProjectKnowledgeWorkspace(workspaceRoot: string): void {
  if (workspaceRoot.trim().length === 0) {
    throw new Error("Workspace root is required");
  }
}

function validateProjectKnowledgeCandidate(
  candidate: ProjectKnowledgeCandidate
): void {
  if (containsForbiddenLiveProposalValue(candidate)) {
    throw new Error("Project knowledge candidate contains unsafe fields");
  }
  if (
    candidate.type !== "policy" &&
    candidate.type !== "project_fact" &&
    candidate.type !== "pitfall"
  ) {
    throw new Error("Project knowledge type is unsupported");
  }
  if (candidate.namespace.trim().length === 0) {
    throw new Error("Project knowledge namespace is required");
  }
  if (candidate.summary.trim().length === 0) {
    throw new Error("Project knowledge summary is required");
  }
  if (!Array.isArray(candidate.evidenceRefs)) {
    throw new Error("Project knowledge evidence refs are required");
  }
  if (
    candidate.type === "project_fact" &&
    candidate.evidenceRefs.length === 0
  ) {
    throw new Error("Project facts require evidence refs");
  }
  if (candidate.type === "policy" && candidate.sourceKind === undefined) {
    throw new Error("Policy project knowledge requires a source kind");
  }
  if (
    candidate.type === "pitfall" &&
    (candidate.triggerSummary?.trim().length ?? 0) === 0
  ) {
    throw new Error("Pitfalls require a trigger summary");
  }
  if (
    candidate.type === "pitfall" &&
    (candidate.mitigationSummary?.trim().length ?? 0) === 0
  ) {
    throw new Error("Pitfalls require a mitigation summary");
  }
}

function validateDesktopObservationCommandRequest(
  request: DesktopObservationCommandRequest
): void {
  if (!isRecord(request.profile)) {
    throw new Error("Desktop observation profile is required");
  }
  if (request.requestId.trim().length === 0) {
    throw new Error("Desktop observation requestId is required");
  }
  if (request.userTriggered !== true) {
    throw new Error("Desktop observation must be user-triggered");
  }
  if (
    typeof request.includeForegroundWindow !== "boolean" ||
    typeof request.includeWindowList !== "boolean" ||
    typeof request.includeDisplayMetadata !== "boolean" ||
    typeof request.includeScreenshotMetadata !== "boolean"
  ) {
    throw new Error("Desktop observation include flags are required");
  }
  if (containsForbiddenDesktopObservationValue(request)) {
    throw new Error("Desktop observation request contains unsafe fields");
  }
}

function validateApprovedDesktopActionCommandRequest(
  request: ApprovedDesktopActionCommandRequest
): void {
  if (!isApprovedDesktopActionKind(request.actionKind)) {
    throw new Error("Approved desktop action kind is not allowlisted");
  }
  const actionKind = request.actionKind;
  const requiredRefs: Array<[string, string]> = [
    ["targetWindowRef", request.targetWindowRef],
    ["targetAppRef", request.targetAppRef],
    ["observerEvidenceId", request.observerEvidenceId],
    ["desktopActionProposalId", request.desktopActionProposalId],
    ["riskClassificationId", request.riskClassificationId]
  ];
  for (const [label, value] of requiredRefs) {
    validateApprovedDesktopActionSafeRef(value, label);
  }
  if (request.targetDisplayRef !== undefined) {
    validateApprovedDesktopActionSafeRef(
      request.targetDisplayRef,
      "targetDisplayRef"
    );
  }
  if (
    request.typedConfirmation !== approvedDesktopActionConfirmation(actionKind)
  ) {
    throw new Error("Approved desktop action confirmation is required");
  }
  if (!isRecord(request.receipt)) {
    throw new Error("Approved desktop action receipt is required");
  }
  if (containsApprovedDesktopActionExecutionTrue(request.receipt)) {
    throw new Error(
      "Approved desktop action receipt attempted broad execution"
    );
  }
  if (containsForbiddenApprovedDesktopActionValue(request)) {
    throw new Error("Approved desktop action request contains unsafe fields");
  }
}

function normalizeDesktopObservationCommandResult(
  raw: unknown
): DesktopObservationCommandResult {
  const record = isRecord(raw) ? raw : {};
  if (
    record.ok !== true ||
    (record.status !== "observed" && record.status !== "warning") ||
    typeof record.requestId !== "string" ||
    typeof record.observationId !== "string" ||
    typeof record.windowCount !== "number" ||
    typeof record.appCount !== "number" ||
    typeof record.displayCount !== "number" ||
    typeof record.screenshotMetadataIncluded !== "boolean" ||
    !Array.isArray(record.windows) ||
    !Array.isArray(record.apps) ||
    !Array.isArray(record.displays) ||
    !Array.isArray(record.warningCodes) ||
    record.summaryOnly !== true ||
    record.rawScreenshotPersisted !== false ||
    record.rawOcrTextPersisted !== false ||
    record.rawClipboardIncluded !== false ||
    record.canDesktopAction !== false ||
    record.canClickTypeSelect !== false ||
    record.canWriteClipboard !== false ||
    record.canSendToModel !== false ||
    record.canWriteEventStore !== false ||
    record.canApplyPatch !== false ||
    record.canRollback !== false ||
    record.canExecuteGit !== false ||
    record.canExecuteShell !== false ||
    record.appCanExecute !== false ||
    typeof record.resultHash !== "string" ||
    typeof record.safeMessage !== "string"
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Desktop observation response was invalid",
      stage: "normalize_response"
    });
  }
  if (containsForbiddenDesktopObservationValue(record)) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Desktop observation response contained unsafe fields",
      stage: "normalize_response"
    });
  }
  return {
    ok: true,
    status: record.status,
    requestId: safeErrorMessage(record.requestId),
    observationId: safeErrorMessage(record.observationId),
    ...(typeof record.profileId === "string"
      ? { profileId: safeErrorMessage(record.profileId) }
      : {}),
    windowCount: record.windowCount,
    appCount: record.appCount,
    displayCount: record.displayCount,
    screenshotMetadataIncluded: record.screenshotMetadataIncluded,
    windows: record.windows.filter(isRecord),
    apps: record.apps.filter(isRecord),
    displays: record.displays.filter(isRecord),
    ...(isRecord(record.screenshotMetadata)
      ? { screenshotMetadata: record.screenshotMetadata }
      : {}),
    warningCodes: record.warningCodes.filter(
      (value): value is string => typeof value === "string"
    ),
    summaryOnly: true,
    rawScreenshotPersisted: false,
    rawOcrTextPersisted: false,
    rawClipboardIncluded: false,
    canDesktopAction: false,
    canClickTypeSelect: false,
    canWriteClipboard: false,
    canSendToModel: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false,
    resultHash: safeErrorMessage(record.resultHash),
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function normalizeApprovedDesktopActionCommandResult(
  raw: unknown
): ApprovedDesktopActionCommandResult {
  const record = isRecord(raw) ? raw : {};
  const eventPreview = isRecord(record.eventPreview) ? record.eventPreview : {};
  if (
    record.ok !== true ||
    !isApprovedDesktopActionResultStatus(record.status) ||
    typeof record.actionId !== "string" ||
    !isApprovedDesktopActionKind(record.actionKind) ||
    typeof record.targetWindowRef !== "string" ||
    typeof record.targetAppRef !== "string" ||
    typeof record.observerEvidenceId !== "string" ||
    typeof record.desktopActionProposalId !== "string" ||
    typeof record.riskClassificationId !== "string" ||
    !Array.isArray(record.warningCodes) ||
    typeof record.resultHash !== "string" ||
    eventPreview.type !== "desktop_action.approved_result" ||
    typeof eventPreview.actionId !== "string" ||
    !isApprovedDesktopActionKind(eventPreview.actionKind) ||
    typeof eventPreview.targetWindowRef !== "string" ||
    typeof eventPreview.targetAppRef !== "string" ||
    typeof eventPreview.observerEvidenceId !== "string" ||
    typeof eventPreview.desktopActionProposalId !== "string" ||
    typeof eventPreview.riskClassificationId !== "string" ||
    !isApprovedDesktopActionResultStatus(eventPreview.status) ||
    typeof eventPreview.resultHash !== "string" ||
    !Array.isArray(eventPreview.warningCodes) ||
    eventPreview.notWritten !== true ||
    eventPreview.summaryOnly !== true ||
    record.summaryOnly !== true ||
    record.rawScreenshotPersisted !== false ||
    record.rawOcrTextPersisted !== false ||
    record.rawWindowContentIncluded !== false ||
    record.canClickTypeSelect !== false ||
    record.canWriteClipboard !== false ||
    record.canOpenFileDialog !== false ||
    record.canUseNativeBridge !== false ||
    record.canWriteEventStore !== false ||
    record.canExecuteGit !== false ||
    record.canExecuteShell !== false ||
    record.appCanExecute !== false ||
    typeof record.safeMessage !== "string"
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Approved desktop action response was invalid",
      stage: "normalize_response"
    });
  }
  if (containsForbiddenApprovedDesktopActionValue(record)) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Approved desktop action response contained unsafe fields",
      stage: "normalize_response"
    });
  }
  const warningCodes = record.warningCodes.filter(
    (value): value is string => typeof value === "string"
  );
  const eventWarningCodes = eventPreview.warningCodes.filter(
    (value): value is string => typeof value === "string"
  );
  return {
    ok: true,
    status: record.status,
    actionId: safeErrorMessage(record.actionId),
    actionKind: record.actionKind,
    targetWindowRef: safeErrorMessage(record.targetWindowRef),
    targetAppRef: safeErrorMessage(record.targetAppRef),
    ...(typeof record.targetDisplayRef === "string"
      ? { targetDisplayRef: safeErrorMessage(record.targetDisplayRef) }
      : {}),
    observerEvidenceId: safeErrorMessage(record.observerEvidenceId),
    desktopActionProposalId: safeErrorMessage(record.desktopActionProposalId),
    riskClassificationId: safeErrorMessage(record.riskClassificationId),
    warningCodes,
    resultHash: safeErrorMessage(record.resultHash),
    eventPreview: {
      type: "desktop_action.approved_result",
      actionId: safeErrorMessage(eventPreview.actionId),
      actionKind: eventPreview.actionKind,
      targetWindowRef: safeErrorMessage(eventPreview.targetWindowRef),
      targetAppRef: safeErrorMessage(eventPreview.targetAppRef),
      ...(typeof eventPreview.targetDisplayRef === "string"
        ? { targetDisplayRef: safeErrorMessage(eventPreview.targetDisplayRef) }
        : {}),
      observerEvidenceId: safeErrorMessage(eventPreview.observerEvidenceId),
      desktopActionProposalId: safeErrorMessage(
        eventPreview.desktopActionProposalId
      ),
      riskClassificationId: safeErrorMessage(eventPreview.riskClassificationId),
      status: eventPreview.status,
      resultHash: safeErrorMessage(eventPreview.resultHash),
      warningCodes: eventWarningCodes,
      notWritten: true,
      summaryOnly: true
    },
    summaryOnly: true,
    rawScreenshotPersisted: false,
    rawOcrTextPersisted: false,
    rawWindowContentIncluded: false,
    canClickTypeSelect: false,
    canWriteClipboard: false,
    canOpenFileDialog: false,
    canUseNativeBridge: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false,
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function normalizeProjectKnowledgeSnapshotResult(
  raw: unknown
): ProjectKnowledgeSnapshotResult {
  const record = isRecord(raw) ? raw : {};
  if (
    record.ok !== true ||
    (record.status !== "empty" &&
      record.status !== "ready" &&
      record.status !== "warning") ||
    typeof record.storePath !== "string" ||
    typeof record.entriesPath !== "string" ||
    typeof record.eventsPath !== "string" ||
    typeof record.indexPath !== "string" ||
    typeof record.entryCount !== "number" ||
    typeof record.activeEntryCount !== "number" ||
    typeof record.revokedEntryCount !== "number" ||
    typeof record.expiredEntryCount !== "number" ||
    !Array.isArray(record.entries) ||
    !Array.isArray(record.warnings) ||
    typeof record.snapshotHash !== "string" ||
    record.summaryOnly !== true ||
    record.rawContentIncluded !== false ||
    typeof record.safeMessage !== "string"
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Project knowledge snapshot response was invalid",
      stage: "normalize_response"
    });
  }
  if (containsForbiddenLiveProposalValue(record)) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage:
        "Project knowledge snapshot response contained unsafe fields",
      stage: "normalize_response"
    });
  }
  return {
    ok: true,
    status: record.status,
    storePath: safeErrorMessage(record.storePath),
    entriesPath: safeErrorMessage(record.entriesPath),
    eventsPath: safeErrorMessage(record.eventsPath),
    indexPath: safeErrorMessage(record.indexPath),
    entryCount: record.entryCount,
    activeEntryCount: record.activeEntryCount,
    revokedEntryCount: record.revokedEntryCount,
    expiredEntryCount: record.expiredEntryCount,
    entries: record.entries.map(normalizeProjectKnowledgeEntrySummary),
    warnings: record.warnings.filter(
      (value): value is string => typeof value === "string"
    ),
    snapshotHash: safeErrorMessage(record.snapshotHash),
    summaryOnly: true,
    rawContentIncluded: false,
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function normalizeProjectKnowledgeCommitResult(
  raw: unknown
): ProjectKnowledgeCommitResult {
  const record = isRecord(raw) ? raw : {};
  if (
    record.ok !== true ||
    !isRecord(record.entry) ||
    typeof record.eventId !== "string" ||
    typeof record.storePath !== "string" ||
    typeof record.entryCount !== "number" ||
    typeof record.indexHash !== "string" ||
    record.summaryOnly !== true ||
    record.rawContentIncluded !== false ||
    typeof record.safeMessage !== "string" ||
    !Array.isArray(record.warnings)
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Project knowledge commit response was invalid",
      stage: "normalize_response"
    });
  }
  if (containsForbiddenLiveProposalValue(record)) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Project knowledge commit response contained unsafe fields",
      stage: "normalize_response"
    });
  }
  return {
    ok: true,
    entry: normalizeProjectKnowledgeEntrySummary(record.entry),
    eventId: safeErrorMessage(record.eventId),
    storePath: safeErrorMessage(record.storePath),
    entryCount: record.entryCount,
    indexHash: safeErrorMessage(record.indexHash),
    summaryOnly: true,
    rawContentIncluded: false,
    safeMessage: safeErrorMessage(record.safeMessage),
    warnings: record.warnings.filter(
      (value): value is string => typeof value === "string"
    )
  };
}

function normalizeProjectKnowledgeLifecycleResult(
  raw: unknown
): ProjectKnowledgeLifecycleResult {
  const record = isRecord(raw) ? raw : {};
  if (
    record.ok !== true ||
    typeof record.entryId !== "string" ||
    (record.status !== "revoked" && record.status !== "expired") ||
    typeof record.eventId !== "string" ||
    typeof record.storePath !== "string" ||
    typeof record.indexHash !== "string" ||
    record.summaryOnly !== true ||
    record.rawContentIncluded !== false ||
    typeof record.safeMessage !== "string" ||
    !Array.isArray(record.warnings)
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Project knowledge lifecycle response was invalid",
      stage: "normalize_response"
    });
  }
  if (containsForbiddenLiveProposalValue(record)) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage:
        "Project knowledge lifecycle response contained unsafe fields",
      stage: "normalize_response"
    });
  }
  return {
    ok: true,
    entryId: safeErrorMessage(record.entryId),
    status: record.status,
    eventId: safeErrorMessage(record.eventId),
    storePath: safeErrorMessage(record.storePath),
    indexHash: safeErrorMessage(record.indexHash),
    summaryOnly: true,
    rawContentIncluded: false,
    safeMessage: safeErrorMessage(record.safeMessage),
    warnings: record.warnings.filter(
      (value): value is string => typeof value === "string"
    )
  };
}

function normalizeProjectKnowledgeEntrySummary(
  value: unknown
): ProjectKnowledgeEntrySummary {
  const record = isRecord(value) ? value : {};
  if (
    typeof record.entryId !== "string" ||
    (record.type !== "policy" &&
      record.type !== "project_fact" &&
      record.type !== "pitfall") ||
    typeof record.namespace !== "string" ||
    typeof record.summary !== "string" ||
    typeof record.status !== "string" ||
    typeof record.evidenceRefCount !== "number" ||
    typeof record.tagCount !== "number" ||
    typeof record.entryHash !== "string" ||
    !Array.isArray(record.warningCodes) ||
    record.summaryOnly !== true
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Project knowledge entry summary was invalid",
      stage: "normalize_response"
    });
  }
  return {
    entryId: safeErrorMessage(record.entryId),
    type: record.type,
    namespace: safeErrorMessage(record.namespace),
    summary: safeErrorMessage(record.summary),
    status: safeErrorMessage(record.status),
    evidenceRefCount: record.evidenceRefCount,
    tagCount: record.tagCount,
    entryHash: safeErrorMessage(record.entryHash),
    warningCodes: record.warningCodes.filter(
      (item): item is string => typeof item === "string"
    ),
    summaryOnly: true
  };
}

function normalizeLiveDeepSeekPatchProposalResult(
  raw: unknown
): LiveDeepSeekPatchProposalCommandResult {
  const record = isRecord(raw) ? raw : {};
  const proposalCandidate = isRecord(record.proposalCandidate)
    ? record.proposalCandidate
    : {};
  if (
    record.ok !== true ||
    record.status !== "generated" ||
    record.providerId !== "deepseek" ||
    typeof record.modelProfileId !== "string" ||
    typeof record.requestId !== "string" ||
    typeof record.proposalCandidateHash !== "string" ||
    typeof record.responseHash !== "string" ||
    typeof record.droppedReasoningContent !== "boolean" ||
    typeof record.reasoningContentCharCount !== "number" ||
    !Array.isArray(record.warningCodes) ||
    record.summaryOnly !== true ||
    record.rawPromptIncluded !== false ||
    record.rawResponseIncluded !== false ||
    record.rawReasoningContentIncluded !== false ||
    record.canApplyPatch !== false ||
    record.canRollback !== false ||
    record.canWriteEventStore !== false ||
    record.canExecuteGit !== false ||
    record.canExecuteShell !== false ||
    typeof record.safeMessage !== "string" ||
    (record.usageSummary !== undefined &&
      !isLiveProposalUsageSummary(record.usageSummary))
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Live proposal command response was invalid",
      stage: "normalize_response"
    });
  }
  if (containsForbiddenLiveProposalValue(record)) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Live proposal command response contained unsafe fields",
      stage: "normalize_response"
    });
  }
  return {
    ok: true,
    status: "generated",
    providerId: "deepseek",
    modelProfileId: safeErrorMessage(record.modelProfileId),
    requestId: safeErrorMessage(record.requestId),
    ...(typeof record.responseId === "string"
      ? { responseId: safeErrorMessage(record.responseId) }
      : {}),
    proposalCandidate,
    proposalCandidateHash: safeErrorMessage(record.proposalCandidateHash),
    responseHash: safeErrorMessage(record.responseHash),
    ...(isLiveProposalUsageSummary(record.usageSummary)
      ? { usageSummary: record.usageSummary }
      : {}),
    droppedReasoningContent: record.droppedReasoningContent,
    reasoningContentCharCount: record.reasoningContentCharCount,
    warningCodes: record.warningCodes.filter(
      (value): value is string => typeof value === "string"
    ),
    summaryOnly: true,
    rawPromptIncluded: false,
    rawResponseIncluded: false,
    rawReasoningContentIncluded: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function normalizeMcpReadonlyDiscoverResult(
  raw: unknown
): McpReadonlyDiscoverResult {
  const record = isRecord(raw) ? raw : {};
  const serverInfo = isRecord(record.serverInfo) ? record.serverInfo : {};
  if (
    record.ok !== true ||
    typeof record.discoveryId !== "string" ||
    typeof record.profileId !== "string" ||
    typeof serverInfo.serverId !== "string" ||
    typeof serverInfo.displayName !== "string" ||
    typeof serverInfo.serverVersion !== "string" ||
    typeof serverInfo.metadataHash !== "string" ||
    typeof record.resourceCount !== "number" ||
    typeof record.promptCount !== "number" ||
    typeof record.toolCount !== "number" ||
    !Array.isArray(record.resourceSummaries) ||
    !Array.isArray(record.promptSummaries) ||
    !Array.isArray(record.toolSummaries) ||
    !Array.isArray(record.warningCodes) ||
    record.summaryOnly !== true ||
    record.rawMetadataIncluded !== false ||
    record.rawStdoutIncluded !== false ||
    record.rawStderrIncluded !== false ||
    record.canCallTool !== false ||
    record.canReadResource !== false ||
    record.canExecutePrompt !== false ||
    record.canMutate !== false ||
    record.canWriteEventStore !== false ||
    typeof record.resultHash !== "string" ||
    typeof record.safeMessage !== "string"
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "MCP readonly discovery response was invalid",
      stage: "normalize_response"
    });
  }
  if (containsForbiddenLiveProposalValue(record)) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "MCP readonly discovery response contained unsafe fields",
      stage: "normalize_response"
    });
  }
  return {
    ok: true,
    discoveryId: safeErrorMessage(record.discoveryId),
    profileId: safeErrorMessage(record.profileId),
    serverInfo: {
      serverId: safeErrorMessage(serverInfo.serverId),
      displayName: safeErrorMessage(serverInfo.displayName),
      serverVersion: safeErrorMessage(serverInfo.serverVersion),
      metadataHash: safeErrorMessage(serverInfo.metadataHash)
    },
    resourceCount: record.resourceCount,
    promptCount: record.promptCount,
    toolCount: record.toolCount,
    resourceSummaries: record.resourceSummaries.filter(isRecord),
    promptSummaries: record.promptSummaries.filter(isRecord),
    toolSummaries: record.toolSummaries.filter(isRecord),
    warningCodes: record.warningCodes.filter(
      (value): value is string => typeof value === "string"
    ),
    summaryOnly: true,
    rawMetadataIncluded: false,
    rawStdoutIncluded: false,
    rawStderrIncluded: false,
    canCallTool: false,
    canReadResource: false,
    canExecutePrompt: false,
    canMutate: false,
    canWriteEventStore: false,
    resultHash: safeErrorMessage(record.resultHash),
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function normalizeMcpReadonlyToolCallResult(
  raw: unknown
): McpReadonlyToolCallCommandResult {
  const record = isRecord(raw) ? raw : {};
  const outputSummary = isRecord(record.outputSummary)
    ? record.outputSummary
    : {};
  const redactionCounts = isRecord(record.redactionCounts)
    ? record.redactionCounts
    : {};
  const eventPreview = isRecord(record.eventPreview) ? record.eventPreview : {};
  if (
    record.ok !== true ||
    record.status !== "called" ||
    typeof record.callId !== "string" ||
    typeof record.toolId !== "string" ||
    typeof record.connectionProfileRef !== "string" ||
    typeof outputSummary.outputHash !== "string" ||
    typeof outputSummary.outputBytes !== "number" ||
    typeof outputSummary.outputLineCount !== "number" ||
    !Array.isArray(outputSummary.warningCodes) ||
    outputSummary.rawOutputIncluded !== false ||
    typeof record.outputHash !== "string" ||
    typeof record.outputBytes !== "number" ||
    typeof redactionCounts.secretMarkerCount !== "number" ||
    typeof redactionCounts.rawMarkerCount !== "number" ||
    typeof redactionCounts.mutatingMarkerCount !== "number" ||
    typeof redactionCounts.truncatedByteCount !== "number" ||
    !Array.isArray(record.warningCodes) ||
    eventPreview.type !== "mcp.readonly_tool.result" ||
    typeof eventPreview.callId !== "string" ||
    typeof eventPreview.toolId !== "string" ||
    typeof eventPreview.connectionProfileRefHash !== "string" ||
    typeof eventPreview.outputHash !== "string" ||
    typeof eventPreview.outputBytes !== "number" ||
    !Array.isArray(eventPreview.warningCodes) ||
    eventPreview.summaryOnly !== true ||
    eventPreview.rawOutputIncluded !== false ||
    eventPreview.notWritten !== true ||
    record.summaryOnly !== true ||
    record.calledReadonlyTool !== true ||
    record.rawOutputIncluded !== false ||
    record.rawArgsIncluded !== false ||
    record.canCallMcpTool !== false ||
    record.canInvokeMutatingTool !== false ||
    record.canWriteEventStore !== false ||
    record.canExecuteGit !== false ||
    record.canExecuteShell !== false ||
    record.canIssuePermissionLease !== false ||
    record.appCanExecute !== false ||
    typeof record.resultHash !== "string" ||
    typeof record.safeMessage !== "string"
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "MCP readonly tool call response was invalid",
      stage: "normalize_response"
    });
  }
  if (containsForbiddenLiveProposalValue(record)) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "MCP readonly tool call response contained unsafe fields",
      stage: "normalize_response"
    });
  }
  const warningCodes = record.warningCodes.filter(
    (value): value is string => typeof value === "string"
  );
  const outputWarningCodes = outputSummary.warningCodes.filter(
    (value): value is string => typeof value === "string"
  );
  const eventWarningCodes = eventPreview.warningCodes.filter(
    (value): value is string => typeof value === "string"
  );
  return {
    ok: true,
    status: "called",
    callId: safeErrorMessage(record.callId),
    toolId: safeErrorMessage(record.toolId),
    connectionProfileRef: safeErrorMessage(record.connectionProfileRef),
    outputSummary: {
      outputHash: safeErrorMessage(outputSummary.outputHash),
      outputBytes: outputSummary.outputBytes,
      outputLineCount: outputSummary.outputLineCount,
      warningCodes: outputWarningCodes,
      rawOutputIncluded: false
    },
    outputHash: safeErrorMessage(record.outputHash),
    outputBytes: record.outputBytes,
    redactionCounts: {
      secretMarkerCount: redactionCounts.secretMarkerCount,
      rawMarkerCount: redactionCounts.rawMarkerCount,
      mutatingMarkerCount: redactionCounts.mutatingMarkerCount,
      truncatedByteCount: redactionCounts.truncatedByteCount
    },
    warningCodes,
    eventPreview: {
      type: "mcp.readonly_tool.result",
      callId: safeErrorMessage(eventPreview.callId),
      toolId: safeErrorMessage(eventPreview.toolId),
      connectionProfileRefHash: safeErrorMessage(
        eventPreview.connectionProfileRefHash
      ),
      outputHash: safeErrorMessage(eventPreview.outputHash),
      outputBytes: eventPreview.outputBytes,
      warningCodes: eventWarningCodes,
      summaryOnly: true,
      rawOutputIncluded: false,
      notWritten: true
    },
    summaryOnly: true,
    calledReadonlyTool: true,
    rawOutputIncluded: false,
    rawArgsIncluded: false,
    canCallMcpTool: false,
    canInvokeMutatingTool: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false,
    resultHash: safeErrorMessage(record.resultHash),
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function normalizeApprovedApplyResult(
  raw: unknown
): ApprovedUserWorkspaceApplyResult {
  const record = isRecord(raw) ? raw : {};
  const eventPreview = isRecord(record.eventPreview) ? record.eventPreview : {};
  if (
    record.ok !== true ||
    typeof record.applyId !== "string" ||
    typeof record.checkpointId !== "string" ||
    typeof record.checkpointHash !== "string" ||
    typeof record.workspaceRootRef !== "string" ||
    typeof record.operationCount !== "number" ||
    typeof record.filesCreated !== "number" ||
    typeof record.filesUpdated !== "number" ||
    typeof record.filesDeleted !== "number" ||
    typeof record.bytesWritten !== "number" ||
    typeof record.inputSnapshotHash !== "string" ||
    typeof record.outputSnapshotHash !== "string" ||
    typeof record.resultHash !== "string" ||
    typeof record.safeMessage !== "string" ||
    eventPreview.type !== "user_workspace.patch_apply.approved_result" ||
    eventPreview.notWritten !== true ||
    !Array.isArray(eventPreview.pathSummaries)
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Approved apply response was invalid",
      stage: "normalize_response"
    });
  }
  const warningCodes = Array.isArray(record.warningCodes)
    ? record.warningCodes.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const eventWarningCodes = Array.isArray(eventPreview.warningCodes)
    ? eventPreview.warningCodes.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const pathSummaries = eventPreview.pathSummaries.filter(
    (value): value is string => typeof value === "string"
  );
  return {
    ok: true,
    applyId: safeErrorMessage(record.applyId),
    checkpointId: safeErrorMessage(record.checkpointId),
    checkpointHash: safeErrorMessage(record.checkpointHash),
    workspaceRootRef: safeErrorMessage(record.workspaceRootRef),
    operationCount: record.operationCount,
    filesCreated: record.filesCreated,
    filesUpdated: record.filesUpdated,
    filesDeleted: record.filesDeleted,
    bytesWritten: record.bytesWritten,
    warningCodes,
    inputSnapshotHash: safeErrorMessage(record.inputSnapshotHash),
    outputSnapshotHash: safeErrorMessage(record.outputSnapshotHash),
    resultHash: safeErrorMessage(record.resultHash),
    eventPreview: {
      type: "user_workspace.patch_apply.approved_result",
      applyId: safeErrorMessage(String(eventPreview.applyId ?? "")),
      checkpointId: safeErrorMessage(String(eventPreview.checkpointId ?? "")),
      checkpointHash: safeErrorMessage(
        String(eventPreview.checkpointHash ?? "")
      ),
      workspaceRootRef: safeErrorMessage(
        String(eventPreview.workspaceRootRef ?? "")
      ),
      operationCount: Number(eventPreview.operationCount ?? 0),
      filesCreated: Number(eventPreview.filesCreated ?? 0),
      filesUpdated: Number(eventPreview.filesUpdated ?? 0),
      filesDeleted: Number(eventPreview.filesDeleted ?? 0),
      bytesWritten: Number(eventPreview.bytesWritten ?? 0),
      pathSummaries,
      pathSummaryCount: Number(
        eventPreview.pathSummaryCount ?? pathSummaries.length
      ),
      resultHash: safeErrorMessage(String(eventPreview.resultHash ?? "")),
      warningCodes: eventWarningCodes,
      notWritten: true
    },
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function normalizeGitReadLaneResult(raw: unknown): GitReadLaneResult {
  const record = isRecord(raw) ? raw : {};
  const eventPreview = isRecord(record.eventPreview) ? record.eventPreview : {};
  if (
    record.ok !== true ||
    (record.lane !== "status_summary" &&
      record.lane !== "diff_summary" &&
      record.lane !== "log_summary" &&
      record.lane !== "branch_summary") ||
    (record.status !== "clean" &&
      record.status !== "changed" &&
      record.status !== "summary" &&
      record.status !== "warning") ||
    typeof record.workspaceRootRef !== "string" ||
    typeof record.branchSummary !== "string" ||
    typeof record.fileCount !== "number" ||
    typeof record.changedFileCount !== "number" ||
    typeof record.addedLineCount !== "number" ||
    typeof record.deletedLineCount !== "number" ||
    !Array.isArray(record.changedPathSummaries) ||
    !Array.isArray(record.warningCodes) ||
    typeof record.commandHash !== "string" ||
    typeof record.outputHash !== "string" ||
    typeof record.durationMs !== "number" ||
    typeof record.truncated !== "boolean" ||
    record.rawDiffIncluded !== false ||
    record.rawStdoutIncluded !== false ||
    record.rawStderrIncluded !== false ||
    typeof record.safeMessage !== "string" ||
    eventPreview.type !== "git.read_lane.executed" ||
    eventPreview.notWritten !== true ||
    eventPreview.summaryOnly !== true ||
    typeof eventPreview.durationMs !== "number"
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Git read lane response was invalid",
      stage: "normalize_response"
    });
  }
  const changedPathSummaries = record.changedPathSummaries.filter(
    (value): value is string => typeof value === "string"
  );
  const warningCodes = record.warningCodes.filter(
    (value): value is string => typeof value === "string"
  );
  const eventWarningCodes = Array.isArray(eventPreview.warningCodes)
    ? eventPreview.warningCodes.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  return {
    ok: true,
    lane: record.lane,
    status: record.status,
    workspaceRootRef: safeErrorMessage(record.workspaceRootRef),
    branchSummary: safeErrorMessage(record.branchSummary),
    fileCount: record.fileCount,
    changedFileCount: record.changedFileCount,
    addedLineCount: record.addedLineCount,
    deletedLineCount: record.deletedLineCount,
    changedPathSummaries,
    warningCodes,
    commandHash: safeErrorMessage(record.commandHash),
    outputHash: safeErrorMessage(record.outputHash),
    durationMs: record.durationMs,
    truncated: record.truncated,
    rawDiffIncluded: false,
    rawStdoutIncluded: false,
    rawStderrIncluded: false,
    eventPreview: {
      type: "git.read_lane.executed",
      lane: record.lane,
      workspaceRootRef: safeErrorMessage(
        String(eventPreview.workspaceRootRef ?? "")
      ),
      commandHash: safeErrorMessage(String(eventPreview.commandHash ?? "")),
      resultHash: safeErrorMessage(String(eventPreview.resultHash ?? "")),
      changedFileCount: Number(eventPreview.changedFileCount ?? 0),
      addedLineCount: Number(eventPreview.addedLineCount ?? 0),
      deletedLineCount: Number(eventPreview.deletedLineCount ?? 0),
      warningCodes: eventWarningCodes,
      durationMs: Number(eventPreview.durationMs ?? 0),
      truncated: Boolean(eventPreview.truncated),
      summaryOnly: true,
      notWritten: true
    },
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function normalizeShellVerificationLaneResult(
  raw: unknown
): ShellVerificationLaneResult {
  const record = isRecord(raw) ? raw : {};
  const eventPreview = isRecord(record.eventPreview) ? record.eventPreview : {};
  if (
    record.ok !== true ||
    (record.templateId !== "pnpm.typecheck" &&
      record.templateId !== "pnpm.lint" &&
      record.templateId !== "pnpm.test.scoped" &&
      record.templateId !== "app.typecheck" &&
      record.templateId !== "cargo.check_tauri") ||
    (record.status !== "passed" && record.status !== "failed") ||
    !(
      typeof record.exitCode === "number" ||
      record.exitCode === null ||
      record.exitCode === undefined
    ) ||
    typeof record.workspaceRootRef !== "string" ||
    typeof record.stdoutBytes !== "number" ||
    typeof record.stderrBytes !== "number" ||
    typeof record.stdoutLineCount !== "number" ||
    typeof record.stderrLineCount !== "number" ||
    !Array.isArray(record.warningCodes) ||
    typeof record.commandHash !== "string" ||
    typeof record.outputHash !== "string" ||
    typeof record.durationMs !== "number" ||
    typeof record.truncated !== "boolean" ||
    record.rawStdoutIncluded !== false ||
    record.rawStderrIncluded !== false ||
    typeof record.safeMessage !== "string" ||
    eventPreview.type !== "shell.verification_lane.executed" ||
    eventPreview.notWritten !== true ||
    eventPreview.summaryOnly !== true ||
    typeof eventPreview.durationMs !== "number"
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Shell verification lane response was invalid",
      stage: "normalize_response"
    });
  }
  const warningCodes = record.warningCodes.filter(
    (value): value is string => typeof value === "string"
  );
  const eventWarningCodes = Array.isArray(eventPreview.warningCodes)
    ? eventPreview.warningCodes.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  return {
    ok: true,
    templateId: record.templateId,
    status: record.status,
    exitCode: typeof record.exitCode === "number" ? record.exitCode : null,
    workspaceRootRef: safeErrorMessage(record.workspaceRootRef),
    stdoutBytes: record.stdoutBytes,
    stderrBytes: record.stderrBytes,
    stdoutLineCount: record.stdoutLineCount,
    stderrLineCount: record.stderrLineCount,
    warningCodes,
    commandHash: safeErrorMessage(record.commandHash),
    outputHash: safeErrorMessage(record.outputHash),
    durationMs: record.durationMs,
    truncated: record.truncated,
    rawStdoutIncluded: false,
    rawStderrIncluded: false,
    eventPreview: {
      type: "shell.verification_lane.executed",
      templateId: record.templateId,
      workspaceRootRef: safeErrorMessage(
        String(eventPreview.workspaceRootRef ?? "")
      ),
      commandHash: safeErrorMessage(String(eventPreview.commandHash ?? "")),
      resultHash: safeErrorMessage(String(eventPreview.resultHash ?? "")),
      exitCode:
        typeof eventPreview.exitCode === "number"
          ? eventPreview.exitCode
          : null,
      stdoutBytes: Number(eventPreview.stdoutBytes ?? 0),
      stderrBytes: Number(eventPreview.stderrBytes ?? 0),
      warningCodes: eventWarningCodes,
      durationMs: Number(eventPreview.durationMs ?? 0),
      truncated: Boolean(eventPreview.truncated),
      summaryOnly: true,
      notWritten: true
    },
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function normalizeVerificationLaneEventRecordResult(
  raw: unknown
): VerificationLaneEventRecordResult {
  const record = isRecord(raw) ? raw : {};
  if (
    record.ok !== true ||
    (record.eventType !== "git.read_lane.executed" &&
      record.eventType !== "shell.verification_lane.executed") ||
    typeof record.eventId !== "string" ||
    typeof record.laneOrTemplateId !== "string" ||
    typeof record.resultHash !== "string" ||
    typeof record.eventLogPath !== "string" ||
    typeof record.safeMessage !== "string" ||
    !Array.isArray(record.warnings)
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Verification lane event response was invalid",
      stage: "normalize_response"
    });
  }
  return {
    ok: true,
    eventId: safeErrorMessage(record.eventId),
    eventType: record.eventType,
    laneOrTemplateId: safeErrorMessage(record.laneOrTemplateId),
    resultHash: safeErrorMessage(record.resultHash),
    eventLogPath: safeErrorMessage(record.eventLogPath),
    safeMessage: safeErrorMessage(record.safeMessage),
    warnings: record.warnings.filter(
      (value): value is string => typeof value === "string"
    )
  };
}

function normalizeLiveProposalSummaryEventRecordResult(
  raw: unknown
): LiveProposalSummaryEventRecordResult {
  const record = isRecord(raw) ? raw : {};
  if (
    record.ok !== true ||
    record.eventType !== "model.patch_proposal.live_generated" ||
    typeof record.eventId !== "string" ||
    typeof record.generationId !== "string" ||
    typeof record.proposalId !== "string" ||
    typeof record.eventLogPath !== "string" ||
    typeof record.safeMessage !== "string" ||
    !Array.isArray(record.warnings)
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Live proposal summary event response was invalid",
      stage: "normalize_response"
    });
  }
  if (containsForbiddenLiveProposalValue(record)) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage:
        "Live proposal summary event response contained unsafe fields",
      stage: "normalize_response"
    });
  }
  return {
    ok: true,
    eventId: safeErrorMessage(record.eventId),
    eventType: "model.patch_proposal.live_generated",
    generationId: safeErrorMessage(record.generationId),
    proposalId: safeErrorMessage(record.proposalId),
    eventLogPath: safeErrorMessage(record.eventLogPath),
    safeMessage: safeErrorMessage(record.safeMessage),
    warnings: record.warnings.filter(
      (value): value is string => typeof value === "string"
    )
  };
}

function normalizeApprovedRollbackResult(
  raw: unknown
): ApprovedUserWorkspaceRollbackResult {
  const record = isRecord(raw) ? raw : {};
  const eventPreview = isRecord(record.eventPreview) ? record.eventPreview : {};
  if (
    record.ok !== true ||
    typeof record.rollbackId !== "string" ||
    typeof record.applyId !== "string" ||
    typeof record.checkpointId !== "string" ||
    typeof record.checkpointHash !== "string" ||
    typeof record.workspaceRootRef !== "string" ||
    typeof record.operationCount !== "number" ||
    typeof record.filesRemoved !== "number" ||
    typeof record.filesRestored !== "number" ||
    typeof record.restoredSnapshotHash !== "string" ||
    typeof record.resultHash !== "string" ||
    typeof record.safeMessage !== "string" ||
    eventPreview.type !== "user_workspace.patch_rollback.approved_result" ||
    eventPreview.notWritten !== true ||
    !Array.isArray(eventPreview.pathSummaries)
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Approved rollback response was invalid",
      stage: "normalize_response"
    });
  }
  const warningCodes = Array.isArray(record.warningCodes)
    ? record.warningCodes.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const eventWarningCodes = Array.isArray(eventPreview.warningCodes)
    ? eventPreview.warningCodes.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const pathSummaries = eventPreview.pathSummaries.filter(
    (value): value is string => typeof value === "string"
  );
  return {
    ok: true,
    rollbackId: safeErrorMessage(record.rollbackId),
    applyId: safeErrorMessage(record.applyId),
    checkpointId: safeErrorMessage(record.checkpointId),
    checkpointHash: safeErrorMessage(record.checkpointHash),
    workspaceRootRef: safeErrorMessage(record.workspaceRootRef),
    operationCount: record.operationCount,
    filesRemoved: record.filesRemoved,
    filesRestored: record.filesRestored,
    restoredSnapshotHash: safeErrorMessage(record.restoredSnapshotHash),
    resultHash: safeErrorMessage(record.resultHash),
    warningCodes,
    eventPreview: {
      type: "user_workspace.patch_rollback.approved_result",
      rollbackId: safeErrorMessage(String(eventPreview.rollbackId ?? "")),
      applyId: safeErrorMessage(String(eventPreview.applyId ?? "")),
      checkpointId: safeErrorMessage(String(eventPreview.checkpointId ?? "")),
      checkpointHash: safeErrorMessage(
        String(eventPreview.checkpointHash ?? "")
      ),
      workspaceRootRef: safeErrorMessage(
        String(eventPreview.workspaceRootRef ?? "")
      ),
      operationCount: Number(eventPreview.operationCount ?? 0),
      filesRemoved: Number(eventPreview.filesRemoved ?? 0),
      filesRestored: Number(eventPreview.filesRestored ?? 0),
      pathSummaries,
      pathSummaryCount: Number(
        eventPreview.pathSummaryCount ?? pathSummaries.length
      ),
      restoredSnapshotHash: safeErrorMessage(
        String(eventPreview.restoredSnapshotHash ?? "")
      ),
      resultHash: safeErrorMessage(String(eventPreview.resultHash ?? "")),
      warningCodes: eventWarningCodes,
      notWritten: true
    },
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function normalizeApprovedExecutionEventRecordResult(
  raw: unknown
): ApprovedUserWorkspaceExecutionEventRecordResult {
  const record = isRecord(raw) ? raw : {};
  if (
    record.ok !== true ||
    typeof record.eventId !== "string" ||
    (record.eventType !== "user_workspace.patch_apply.app_executed" &&
      record.eventType !== "user_workspace.patch_rollback.app_executed") ||
    typeof record.operationId !== "string" ||
    typeof record.checkpointId !== "string" ||
    typeof record.eventLogPath !== "string" ||
    typeof record.safeMessage !== "string"
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Approved execution event record response was invalid",
      stage: "normalize_response"
    });
  }
  const warnings = Array.isArray(record.warnings)
    ? record.warnings.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  return {
    ok: true,
    eventId: safeErrorMessage(record.eventId),
    eventType: record.eventType,
    operationId: safeErrorMessage(record.operationId),
    checkpointId: safeErrorMessage(record.checkpointId),
    eventLogPath: safeErrorMessage(record.eventLogPath),
    safeMessage: safeErrorMessage(record.safeMessage),
    warnings
  };
}

function validateLiveProposalRelativePath(pathRef: string): void {
  const value = pathRef.trim();
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[A-Za-z]:/.test(value) ||
    value.includes("\0") ||
    value.includes("\n") ||
    value.includes("\r") ||
    /[?&#|;<>*`$]/.test(value)
  ) {
    throw new Error("Live proposal path ref is not allowed");
  }
  const normalized = value.replace(/\\/g, "/");
  if (normalized.includes("://")) {
    throw new Error("Live proposal path ref is not allowed");
  }
  for (const segment of normalized.split("/")) {
    const lower = segment.toLowerCase();
    if (
      segment === "." ||
      segment === ".." ||
      lower === ".git" ||
      lower === ".env" ||
      lower === "node_modules" ||
      lower === "dist" ||
      lower === "target" ||
      lower === ".tmp" ||
      lower === "coverage" ||
      lower === "build" ||
      lower === ".next" ||
      lower === "out" ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("password") ||
      lower.includes("credential") ||
      lower.includes("apikey") ||
      lower.includes("api-key") ||
      lower.includes("api_key")
    ) {
      throw new Error("Live proposal path ref is not allowed");
    }
  }
}

function isApprovedDesktopActionKind(
  value: unknown
): value is ApprovedDesktopActionKind {
  return (
    value === "focus_observed_window" ||
    value === "raise_observed_window" ||
    value === "activate_observed_window"
  );
}

function isApprovedDesktopActionResultStatus(
  value: unknown
): value is ApprovedDesktopActionCommandResult["status"] {
  return (
    value === "executed" ||
    value === "unsupported_platform" ||
    value === "blocked"
  );
}

function approvedDesktopActionConfirmation(
  actionKind: ApprovedDesktopActionKind
): string {
  switch (actionKind) {
    case "focus_observed_window":
      return "FOCUS OBSERVED WINDOW";
    case "raise_observed_window":
      return "RAISE OBSERVED WINDOW";
    case "activate_observed_window":
      return "ACTIVATE OBSERVED WINDOW";
  }
}

function validateApprovedDesktopActionSafeRef(
  value: string,
  label: string
): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > 160 ||
    /[\0\r\n"'<>|;`$]/.test(value) ||
    containsUnsafeDesktopObservationText(value)
  ) {
    throw new Error(`Approved desktop action ${label} is unsafe`);
  }
}

function containsForbiddenLiveProposalValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsForbiddenLiveProposalValue);
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (liveForbiddenFieldNames.has(key.toLowerCase())) {
        return true;
      }
      if (liveExecutionFieldNames.has(key.toLowerCase()) && nested === true) {
        return true;
      }
      if (containsForbiddenLiveProposalValue(nested)) {
        return true;
      }
    }
    return false;
  }
  if (typeof value === "string") {
    return containsUnsafeLiveProposalText(value);
  }
  return false;
}

function containsForbiddenApprovedDesktopActionValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsForbiddenApprovedDesktopActionValue);
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (approvedDesktopActionForbiddenFieldNames.has(lowerKey)) {
        return true;
      }
      if (
        approvedDesktopActionExecutionFieldNames.has(lowerKey) &&
        nested === true
      ) {
        return true;
      }
      if (containsForbiddenApprovedDesktopActionValue(nested)) {
        return true;
      }
    }
    return false;
  }
  if (typeof value === "string") {
    return containsUnsafeDesktopObservationText(value);
  }
  return false;
}

function containsApprovedDesktopActionExecutionTrue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsApprovedDesktopActionExecutionTrue);
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (
        approvedDesktopActionExecutionFieldNames.has(key.toLowerCase()) &&
        nested === true
      ) {
        return true;
      }
      if (containsApprovedDesktopActionExecutionTrue(nested)) {
        return true;
      }
    }
  }
  return false;
}

function containsForbiddenDesktopObservationValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsForbiddenDesktopObservationValue);
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (desktopObservationForbiddenFieldNames.has(lowerKey)) {
        return true;
      }
      if (
        desktopObservationExecutionFieldNames.has(lowerKey) &&
        nested === true
      ) {
        return true;
      }
      if (containsForbiddenDesktopObservationValue(nested)) {
        return true;
      }
    }
    return false;
  }
  if (typeof value === "string") {
    return containsUnsafeDesktopObservationText(value);
  }
  return false;
}

function containsUnsafeLiveProposalText(value: string): boolean {
  return (
    /\bsk-[A-Za-z0-9_-]{8,}\b/.test(value) ||
    /\bBearer\s+[A-Za-z0-9._-]{12,}\b/.test(value) ||
    /\bAuthorization\s*[:=]/i.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value) ||
    /\braw\s*prompt\b/i.test(value) ||
    /\braw\s*response\b/i.test(value) ||
    /\braw\s*source\b/i.test(value) ||
    /\braw\s*diff\b/i.test(value)
  );
}

function containsUnsafeDesktopObservationText(value: string): boolean {
  return (
    containsUnsafeLiveProposalText(value) ||
    /\braw\s*screenshot\b/i.test(value) ||
    /\braw\s*ocr\b/i.test(value) ||
    /\bclipboard\s*(text|value|write)\b/i.test(value) ||
    /\b(click|type|select)\s+desktop\b/i.test(value)
  );
}

function isLiveProposalUsageSummary(
  value: unknown
): value is LiveDeepSeekPatchProposalUsageSummary {
  if (!isRecord(value)) {
    return false;
  }
  const allowedKeys = new Set([
    "promptTokens",
    "completionTokens",
    "totalTokens"
  ]);
  return Object.entries(value).every(
    ([key, nested]) =>
      allowedKeys.has(key) &&
      (nested === undefined || typeof nested === "number")
  );
}

const liveForbiddenFieldNames = new Set(
  [
    "apiKey",
    "apiKeyValue",
    "secret",
    "token",
    "Authorization",
    "bearer",
    "rawKey",
    "envValue",
    "processEnvValue",
    "vaultSecretValue",
    "password",
    ["raw", "Prompt"].join(""),
    "promptText",
    ["raw", "Request"].join(""),
    ["raw", "Response"].join(""),
    "responseText",
    "reasoningContent",
    "reasoning_content",
    ["raw", "Source"].join(""),
    ["raw", "Diff"].join(""),
    ["raw", "Patch"].join(""),
    ["raw", "Dom"].join(""),
    ["raw", "Csv"].join(""),
    ["raw", "Screenshot"].join(""),
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
    "stdout",
    "stderr",
    "command",
    ["shell", "Command"].join(""),
    ["git", "Command"].join(""),
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge",
    "tools",
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const liveExecutionFieldNames = new Set(
  [
    "canApplyPatch",
    "canRollback",
    "canReadApiKey",
    "canCallLiveModel",
    "canFetchNetwork",
    "canSendLiveRequest",
    "canWriteFilesystem",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "canIssuePermissionLease",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowEventStoreWrite",
    "allowGit",
    "allowShell",
    "allowAppExecution"
  ].map((key) => key.toLowerCase())
);

const desktopObservationForbiddenFieldNames = new Set(
  [
    ["raw", "Prompt"].join(""),
    "promptText",
    ["raw", "Response"].join(""),
    "responseText",
    "reasoningContent",
    "reasoning_content",
    ["raw", "Source"].join(""),
    ["raw", "Diff"].join(""),
    ["raw", "Patch"].join(""),
    ["raw", "Dom"].join(""),
    ["raw", "Csv"].join(""),
    ["raw", "Screenshot"].join(""),
    "screenshotBytes",
    "screenshotBase64",
    "pixelBuffer",
    ["raw", "Ocr"].join(""),
    ["raw", "OcrText"].join(""),
    "ocrText",
    "clipboard",
    "clipboardText",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "env",
    "stdout",
    "stderr",
    "command",
    ["shell", "Command"].join(""),
    ["git", "Command"].join(""),
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge",
    "click",
    "type",
    "select",
    "tools",
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const desktopObservationExecutionFieldNames = new Set(
  [
    "allowDesktopAction",
    "allowClickTypeSelect",
    "allowClipboardWrite",
    "allowClipboardRead",
    "allowClipboardReadByDefault",
    "allowFileDialogAutomation",
    "allowHiddenBackgroundCapture",
    "allowScreenRecording",
    "allowRawScreenshotPersistence",
    "allowRawOcrTextPersistence",
    "sendToModel",
    "rawScreenshotPersisted",
    "rawOcrTextPersisted",
    "rawClipboardIncluded",
    "canDesktopAction",
    "canClickTypeSelect",
    "canWriteClipboard",
    "canReadClipboard",
    "canReadClipboardByDefault",
    "canPersistRawScreenshot",
    "canPersistRawOcrText",
    "canSendToModel",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canExecuteGit",
    "canExecuteShell",
    "canIssuePermissionLease",
    "appCanExecute"
  ].map((key) => key.toLowerCase())
);

const approvedDesktopActionForbiddenFieldNames = new Set(
  [
    ["raw", "Prompt"].join(""),
    "promptText",
    ["raw", "Response"].join(""),
    "responseText",
    "reasoningContent",
    "reasoning_content",
    ["raw", "Source"].join(""),
    ["raw", "Diff"].join(""),
    ["raw", "Patch"].join(""),
    ["raw", "Dom"].join(""),
    ["raw", "Csv"].join(""),
    ["raw", "Screenshot"].join(""),
    "screenshotBytes",
    "screenshotBase64",
    "pixelBuffer",
    ["raw", "Ocr"].join(""),
    ["raw", "OcrText"].join(""),
    "ocrText",
    ["raw", "WindowContent"].join(""),
    "windowContent",
    "clipboard",
    "clipboardText",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "env",
    "stdout",
    "stderr",
    "command",
    ["shell", "Command"].join(""),
    ["git", "Command"].join(""),
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "nativeBridge",
    "click",
    "select",
    "dragDrop",
    "tools",
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const approvedDesktopActionExecutionFieldNames = new Set(
  [
    "canCallTauriCommand",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canSelect",
    "canDragDrop",
    "canUseClipboard",
    "canOpenFileDialog",
    "canWriteEventStore",
    "canUseNativeBridge",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "allowDesktopAction",
    "allowClickTypeSelect",
    "allowClipboardWrite",
    "allowFileDialogAutomation",
    "allowNativeBridge"
  ].map((key) => key.toLowerCase())
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
