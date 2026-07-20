import type {
  DeepSeekChatRequest,
  DeepSeekChatResponse,
  DeepSeekClient,
  DeepSeekMessage,
  DeepSeekToolCall
} from "../../../../runtime/src/deepseek/types.js";
import {
  chatDeepseekCompletion,
  type ChatCompletionCommandMessage,
  type TauriInvoke
} from "../../desktop-flow.js";

/**
 * DeepSeekClient adapter that relays through the fixed Tauri chat lane.
 * The API key never enters the frontend process; message content is
 * validated and scanned server-side on every call.
 */
export function createTauriChatClient(
  invokeImpl?: TauriInvoke
): DeepSeekClient {
  return {
    async createChatCompletion(
      request: DeepSeekChatRequest
    ): Promise<DeepSeekChatResponse> {
      const result = await chatDeepseekCompletion(
        {
          messages: request.messages.map(mapMessage),
          model: request.model,
          ...(request.tools !== undefined ? { tools: request.tools } : {})
        },
        invokeImpl
      );
      return {
        model: result.model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: result.content,
              ...(result.toolCalls !== undefined
                ? { tool_calls: result.toolCalls as DeepSeekToolCall[] }
                : {})
            },
            finish_reason: "stop"
          }
        ],
        usage: {
          prompt_tokens: result.usage.promptTokens,
          completion_tokens: result.usage.completionTokens,
          total_tokens: result.usage.totalTokens
        }
      };
    }
  };
}

function mapMessage(message: DeepSeekMessage): ChatCompletionCommandMessage {
  if (message.role === "assistant") {
    return {
      role: "assistant",
      content: message.content ?? "",
      ...(message.tool_calls !== undefined
        ? { toolCalls: message.tool_calls }
        : {})
    };
  }
  if (message.role === "tool") {
    return {
      role: "tool",
      content: message.content,
      toolCallId: message.tool_call_id
    };
  }
  return { role: message.role, content: message.content };
}
