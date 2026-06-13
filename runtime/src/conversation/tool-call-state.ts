import { type DeepSeekToolCall } from "../deepseek/index.js";

import {
  type ConversationTurnId,
  type PendingToolCall,
  type ToolResultInput
} from "./types.js";

export class ToolCallStateMachine {
  private readonly pendingToolCalls: PendingToolCall[] = [];

  addAssistantToolCalls(
    assistantTurnId: ConversationTurnId,
    toolCalls: readonly DeepSeekToolCall[]
  ): PendingToolCall[] {
    const added = toolCalls.map((toolCall) => ({
      id: toolCall.id,
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
      assistantTurnId,
      completed: false
    }));

    this.pendingToolCalls.push(...added);
    return added.map((toolCall) => ({ ...toolCall }));
  }

  validateToolResult(input: ToolResultInput): PendingToolCall {
    const pending = this.pendingToolCalls.find(
      (toolCall) => toolCall.id === input.toolCallId
    );
    if (pending === undefined) {
      throw new Error(`Unknown pending tool_call_id: ${input.toolCallId}`);
    }
    if (pending.completed) {
      throw new Error(`Tool result already submitted: ${input.toolCallId}`);
    }

    return pending;
  }

  markToolResultSubmitted(
    toolCallId: string,
    resultTurnId: ConversationTurnId
  ): void {
    const pending = this.validateToolResult({
      toolCallId,
      content: ""
    });
    pending.completed = true;
    pending.resultTurnId = resultTurnId;
  }

  hasIncompleteToolCalls(): boolean {
    return this.pendingToolCalls.some((toolCall) => !toolCall.completed);
  }

  listPendingToolCalls(): PendingToolCall[] {
    return this.pendingToolCalls.map((toolCall) => ({ ...toolCall }));
  }
}
