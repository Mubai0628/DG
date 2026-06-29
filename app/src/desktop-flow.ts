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
    workspaceRootRef: string;
    operationCount: number;
    filesCreated: number;
    filesUpdated: number;
    filesDeleted: number;
    bytesWritten: number;
    resultHash: string;
    warningCodes: string[];
    notWritten: true;
  };
  safeMessage: string;
};

export const allowedDesktopCommands = [
  "get_app_version",
  "apply_approved_user_workspace_patch",
  "check_runner_preflight",
  "load_workspace_event_summary",
  "record_control_run_draft_event",
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
    case "apply_approved_user_workspace_patch":
      return normalizeApprovedApplyResult(raw);
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

function normalizeApprovedApplyResult(
  raw: unknown
): ApprovedUserWorkspaceApplyResult {
  const record = isRecord(raw) ? raw : {};
  const eventPreview = isRecord(record.eventPreview)
    ? record.eventPreview
    : {};
  if (
    record.ok !== true ||
    typeof record.applyId !== "string" ||
    typeof record.checkpointId !== "string" ||
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
    eventPreview.notWritten !== true
  ) {
    throw normalizeDesktopCommandError({
      errorCode: "INVALID_RESPONSE",
      safeMessage: "Approved apply response was invalid",
      stage: "normalize_response"
    });
  }
  const warningCodes = Array.isArray(record.warningCodes)
    ? record.warningCodes.filter((value): value is string =>
        typeof value === "string"
      )
    : [];
  const eventWarningCodes = Array.isArray(eventPreview.warningCodes)
    ? eventPreview.warningCodes.filter((value): value is string =>
        typeof value === "string"
      )
    : [];
  return {
    ok: true,
    applyId: safeErrorMessage(record.applyId),
    checkpointId: safeErrorMessage(record.checkpointId),
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
      workspaceRootRef: safeErrorMessage(
        String(eventPreview.workspaceRootRef ?? "")
      ),
      operationCount: Number(eventPreview.operationCount ?? 0),
      filesCreated: Number(eventPreview.filesCreated ?? 0),
      filesUpdated: Number(eventPreview.filesUpdated ?? 0),
      filesDeleted: Number(eventPreview.filesDeleted ?? 0),
      bytesWritten: Number(eventPreview.bytesWritten ?? 0),
      resultHash: safeErrorMessage(String(eventPreview.resultHash ?? "")),
      warningCodes: eventWarningCodes,
      notWritten: true
    },
    safeMessage: safeErrorMessage(record.safeMessage)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
