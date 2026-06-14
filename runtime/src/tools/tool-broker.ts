import { type DeepSeekToolCall } from "../deepseek/index.js";
import { type EventStore } from "../events/index.js";
import { WorkspaceFsError } from "../workspace/index.js";

import { createFsWriteDraftTool } from "./builtin-fs-write-draft.js";
import { ToolBrokerError } from "./errors.js";
import { decideToolPermission } from "./permission-policy.js";
import { parseToolArgumentsSafely } from "./tool-argument-parser.js";
import { ToolRegistry } from "./tool-registry.js";
import {
  type ToolArgumentSummary,
  type ToolBrokerErrorKind,
  type ToolBrokerOptions,
  type ToolCallRequest,
  type ToolCallResult,
  type ToolCallSource,
  type ToolDefinitionRuntime,
  type ToolPermissionDecision,
  type ToolRiskLevel
} from "./types.js";

export class ToolBroker {
  private readonly registry: ToolRegistry;
  private readonly eventStore: EventStore | undefined;
  private readonly permissionPolicy: ToolBrokerOptions["permissionPolicy"];
  private readonly clock: () => Date;

  constructor(options: ToolBrokerOptions) {
    this.registry = new ToolRegistry();
    for (const definition of options.registry?.list() ?? [
      createFsWriteDraftTool(options.draftWriter)
    ]) {
      this.registry.register(definition);
    }
    this.eventStore = options.eventStore;
    this.permissionPolicy = options.permissionPolicy;
    this.clock = options.clock ?? (() => new Date());
  }

  listTools(): ToolDefinitionRuntime[] {
    return this.registry.list();
  }

  async executeToolCall(request: ToolCallRequest): Promise<ToolCallResult> {
    const eventIds: string[] = [];
    const definition = this.registry.get(request.name);
    const riskLevel = definition?.riskLevel ?? "A5_sensitive_or_irreversible";
    const createdAt = this.clock().toISOString();

    if (definition === undefined) {
      eventIds.push(
        ...this.appendToolEvent("tool.proposed", request, riskLevel, {
          decision: "proposed"
        })
      );
      eventIds.push(
        ...this.appendToolEvent("tool.rejected", request, riskLevel, {
          decision: "rejected",
          errorKind: "unknown_tool"
        })
      );
      return result({
        request,
        status: "rejected",
        riskLevel,
        approved: false,
        errorKind: "unknown_tool",
        errorMessage: "Tool is not registered",
        eventIds,
        createdAt
      });
    }

    const parsed = parseToolArgumentsSafely(request.rawArguments);
    if (!parsed.ok) {
      eventIds.push(
        ...this.appendToolEvent("tool.proposed", request, riskLevel, {
          decision: "proposed"
        })
      );
      eventIds.push(
        ...this.appendToolEvent("tool.rejected", request, riskLevel, {
          decision: "rejected",
          errorKind: parsed.errorKind
        })
      );
      return result({
        request,
        status: "rejected",
        riskLevel,
        approved: false,
        errorKind: parsed.errorKind,
        errorMessage: "Tool arguments are invalid",
        eventIds,
        createdAt
      });
    }

    const validation = definition.validateArguments(parsed.value);
    eventIds.push(
      ...this.appendToolEvent("tool.proposed", request, riskLevel, {
        decision: "proposed",
        ...(validation.argumentSummary !== undefined
          ? { argumentSummary: validation.argumentSummary }
          : {})
      })
    );

    if (!validation.ok) {
      eventIds.push(
        ...this.appendToolEvent("tool.rejected", request, riskLevel, {
          decision: "rejected",
          ...(validation.argumentSummary !== undefined
            ? { argumentSummary: validation.argumentSummary }
            : {}),
          errorKind: validation.errorKind
        })
      );
      return result({
        request,
        status: "rejected",
        riskLevel,
        approved: false,
        errorKind: validation.errorKind,
        errorMessage: validation.message,
        eventIds,
        createdAt
      });
    }

    const argumentSummary = validation.argumentSummary;
    const permission = decideToolPermission(definition, this.permissionPolicy);
    if (permission.status !== "approved") {
      const rejectedPayload = {
        decision: permission.decision,
        argumentSummary,
        ...(permission.errorKind !== undefined
          ? { errorKind: permission.errorKind }
          : {})
      };
      eventIds.push(
        ...this.appendToolEvent(
          "tool.rejected",
          request,
          riskLevel,
          rejectedPayload
        )
      );
      const safeErrorKind = permission.errorKind ?? "permission_denied";
      return result({
        request,
        status: permission.status,
        riskLevel,
        approved: false,
        errorKind: safeErrorKind,
        errorMessage:
          permission.status === "approval_required"
            ? "Tool approval is required"
            : "Tool permission denied",
        eventIds,
        createdAt
      });
    }

    eventIds.push(
      ...this.appendApprovedEvent(
        request,
        riskLevel,
        permission,
        argumentSummary
      )
    );

    try {
      const resultSummary = await definition.execute(validation.value);
      eventIds.push(
        ...this.appendToolEvent("tool.executed", request, riskLevel, {
          decision: "executed",
          argumentSummary,
          resultSummary
        })
      );
      return result({
        request,
        status: "executed",
        riskLevel,
        approved: true,
        resultSummary,
        eventIds,
        createdAt
      });
    } catch (error) {
      const errorKind = normalizeExecutionErrorKind(error);
      eventIds.push(
        ...this.appendToolEvent("tool.failed", request, riskLevel, {
          decision: "failed",
          argumentSummary,
          errorKind
        })
      );
      return result({
        request,
        status: "failed",
        riskLevel,
        approved: true,
        errorKind,
        errorMessage: "Tool execution failed",
        eventIds,
        createdAt
      });
    }
  }

  private appendApprovedEvent(
    request: ToolCallRequest,
    riskLevel: ToolRiskLevel,
    permission: ToolPermissionDecision,
    argumentSummary: ToolArgumentSummary
  ): string[] {
    return this.appendToolEvent("tool.approved", request, riskLevel, {
      decision: permission.decision,
      argumentSummary,
      policy: "auto_approved"
    });
  }

  private appendToolEvent(
    type:
      | "tool.proposed"
      | "tool.approved"
      | "tool.rejected"
      | "tool.executed"
      | "tool.failed",
    request: ToolCallRequest,
    riskLevel: ToolRiskLevel,
    payload: {
      decision: string;
      argumentSummary?: ToolArgumentSummary;
      resultSummary?: Record<string, unknown>;
      errorKind?: ToolBrokerErrorKind;
      policy?: string;
    }
  ): string[] {
    if (this.eventStore === undefined) {
      return [];
    }

    const record = this.eventStore.appendEvent({
      type,
      ...(request.taskId !== undefined ? { taskId: request.taskId } : {}),
      ...(request.agentId !== undefined ? { agentId: request.agentId } : {}),
      payload: {
        toolName: request.name,
        riskLevel,
        ...(request.taskId !== undefined ? { taskId: request.taskId } : {}),
        ...(request.agentId !== undefined ? { agentId: request.agentId } : {}),
        ...(summarizeToolCallSource(request.source) !== undefined
          ? { sourceSummary: summarizeToolCallSource(request.source) }
          : {}),
        ...payload
      }
    });

    return [record.id];
  }
}

export function createToolCallRequestFromDeepSeekToolCall(
  toolCall: DeepSeekToolCall,
  context: Omit<ToolCallRequest, "id" | "name" | "rawArguments"> = {}
): ToolCallRequest {
  return {
    ...context,
    id: context.source?.toolCallId ?? toolCall.id,
    name: toolCall.function.name,
    rawArguments: toolCall.function.arguments,
    source: {
      ...context.source,
      kind: context.source?.kind ?? "llm_tool_call",
      toolCallId: context.source?.toolCallId ?? toolCall.id
    }
  };
}

function result(input: {
  request: ToolCallRequest;
  status: ToolCallResult["status"];
  riskLevel: ToolRiskLevel;
  approved: boolean;
  resultSummary?: Record<string, unknown>;
  errorKind?: ToolBrokerErrorKind;
  errorMessage?: string;
  eventIds: string[];
  createdAt: string;
}): ToolCallResult {
  const output: ToolCallResult = {
    id: input.request.id,
    name: input.request.name,
    status: input.status,
    riskLevel: input.riskLevel,
    approved: input.approved,
    createdAt: input.createdAt
  };
  if (input.resultSummary !== undefined) {
    output.resultSummary = input.resultSummary;
  }
  if (input.errorKind !== undefined) {
    output.errorKind = input.errorKind;
  }
  if (input.errorMessage !== undefined) {
    output.errorMessage = input.errorMessage;
  }
  if (input.eventIds.length > 0) {
    output.eventIds = input.eventIds;
  }
  return output;
}

function normalizeExecutionErrorKind(error: unknown): ToolBrokerErrorKind {
  if (error instanceof ToolBrokerError) {
    return error.kind;
  }
  if (error instanceof WorkspaceFsError) {
    if (error.kind === "secret_like_content_rejected") {
      return "secret_like_content_rejected";
    }
    if (error.kind === "unsupported_content_type") {
      return "unsupported_content_type";
    }
    return "tool_execution_failed";
  }
  return "tool_execution_failed";
}

function summarizeToolCallSource(
  source: ToolCallSource | undefined
): Record<string, unknown> | undefined {
  if (source === undefined) {
    return undefined;
  }

  const summary: Record<string, unknown> = {
    kind: source.kind
  };
  if (source.model !== undefined) {
    summary.model = source.model;
  }
  if (source.conversationId !== undefined) {
    summary.conversationId = source.conversationId;
  }
  if (source.turnId !== undefined) {
    summary.turnId = source.turnId;
  }
  if (source.toolCallId !== undefined) {
    summary.toolCallId = source.toolCallId;
  }

  return summary;
}
