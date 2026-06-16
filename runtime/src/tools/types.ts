import { type EventStore } from "../events/index.js";
import {
  type DraftWriteRequest,
  type DraftWriteResult
} from "../workspace/index.js";

export type ToolName = "fs.write_draft" | (string & {});

export type ToolRiskLevel =
  | "A0_observe"
  | "A1_read"
  | "A2_draft_write"
  | "A3_scoped_write"
  | "A4_external_effect"
  | "A5_sensitive_or_irreversible";

export type ToolCallSource = {
  kind: "llm_tool_call" | "manual" | "test";
  model?: string;
  conversationId?: string;
  turnId?: string;
  toolCallId?: string;
};

export type ToolCallRequest = {
  id: string;
  name: string;
  rawArguments: string;
  source?: ToolCallSource;
  taskId?: string;
  agentId?: string;
};

export type ToolExecutionStatus =
  | "executed"
  | "rejected"
  | "approval_required"
  | "failed";

export type ToolBrokerErrorKind =
  | "unknown_tool"
  | "invalid_arguments_json"
  | "invalid_arguments_shape"
  | "unsupported_content_type"
  | "invalid_workspace_root"
  | "path_escape"
  | "absolute_path_rejected"
  | "parent_traversal_rejected"
  | "denied_path"
  | "unsupported_extension"
  | "invalid_filename"
  | "draft_too_large"
  | "file_exists"
  | "symlink_escape"
  | "permission_denied"
  | "approval_required"
  | "secret_like_content_rejected"
  | "tool_execution_failed"
  | "unsafe_result_blocked"
  | "internal_error";

export type ToolArgumentSummary = {
  filename?: string;
  contentType?: string;
  contentBytes?: number;
  source?: {
    kind?: string;
    urlHost?: string;
  };
  metadata?: {
    rowCount?: number;
    columnCount?: number;
  };
};

export type ToolCallResult = {
  id: string;
  name: string;
  status: ToolExecutionStatus;
  riskLevel: ToolRiskLevel;
  approved: boolean;
  resultSummary?: Record<string, unknown>;
  errorKind?: ToolBrokerErrorKind;
  errorMessage?: string;
  eventIds?: string[];
  createdAt: string;
};

export type ToolValidationResult =
  | {
      ok: true;
      value: DraftWriteRequest;
      argumentSummary: ToolArgumentSummary;
    }
  | {
      ok: false;
      errorKind: ToolBrokerErrorKind;
      message: string;
      argumentSummary?: ToolArgumentSummary;
    };

export type ToolDefinitionRuntime = {
  name: ToolName;
  riskLevel: ToolRiskLevel;
  validateArguments(value: Record<string, unknown>): ToolValidationResult;
  execute(argumentsValue: DraftWriteRequest): Promise<Record<string, unknown>>;
};

export type ToolPermissionPolicy = {
  autoApproveRiskMax?: ToolRiskLevel;
  requireApprovalFor?: ToolName[];
  denyTools?: ToolName[];
};

export type ToolPermissionDecision = {
  status: "approved" | "rejected" | "approval_required";
  approved: boolean;
  decision: "auto_approved" | "denied_by_policy" | "approval_required";
  errorKind?: ToolBrokerErrorKind;
};

export type ToolBrokerOptions = {
  draftWriter: {
    writeDraft(request: DraftWriteRequest): Promise<DraftWriteResult>;
  };
  registry?: {
    get(name: string): ToolDefinitionRuntime | undefined;
    list(): ToolDefinitionRuntime[];
  };
  permissionPolicy?: ToolPermissionPolicy;
  eventStore?: EventStore;
  clock?: () => Date;
};
