import {
  type DeepSeekAssistantMessage,
  type DeepSeekMessage
} from "../deepseek/index.js";

import { type ConversationState, type ReasoningContentStore } from "./types.js";

export class MessageAssembler {
  constructor(private readonly reasoningStore: ReasoningContentStore) {}

  assembleMessages(state: ConversationState): DeepSeekMessage[] {
    return state.turns.map((turn) => {
      switch (turn.role) {
        case "system":
          return { role: "system", content: turn.content ?? "" };
        case "user":
          return { role: "user", content: turn.content ?? "" };
        case "tool":
          if (turn.toolCallId === undefined || turn.toolCallId.length === 0) {
            throw new Error("Tool message requires tool_call_id");
          }
          return {
            role: "tool",
            tool_call_id: turn.toolCallId,
            content: turn.content ?? ""
          };
        case "assistant": {
          const toolCalls = turn.toolCalls ?? [];
          const hasToolCalls = toolCalls.length > 0;
          const message: DeepSeekAssistantMessage = {
            role: "assistant",
            content: hasToolCalls ? (turn.content ?? "") : turn.content
          };

          if (hasToolCalls) {
            message.tool_calls = toolCalls;
          }

          if (turn.includeReasoningInNextRequest) {
            const reasoningContent = this.reasoningStore.get(turn.id);
            if (reasoningContent !== undefined) {
              message.reasoning_content = reasoningContent;
            }
          }

          return message;
        }
      }
    });
  }
}
