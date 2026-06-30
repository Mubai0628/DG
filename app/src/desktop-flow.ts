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
    truncated: boolean;
    summaryOnly: true;
    notWritten: true;
  };
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
  "run_git_read_lane",
  "run_shell_verification_lane",
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
    case "run_git_read_lane":
      return normalizeGitReadLaneResult(raw);
    case "run_shell_verification_lane":
      return normalizeShellVerificationLaneResult(raw);
    case "apply_approved_user_workspace_patch":
      return normalizeApprovedApplyResult(raw);
    case "rollback_approved_user_workspace_patch":
      return normalizeApprovedRollbackResult(raw);
    case "run_web_table_to_csv_flow":
      return normalizeDesktopFlowResult(raw);
    default:
      throw new Error(safeErrorMessage("Desktop command is not allowed"));
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
    eventPreview.summaryOnly !== true
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
    eventPreview.summaryOnly !== true
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
      truncated: Boolean(eventPreview.truncated),
      summaryOnly: true,
      notWritten: true
    },
    safeMessage: safeErrorMessage(record.safeMessage)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
