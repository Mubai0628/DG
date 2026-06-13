import { DeepSeekClientError } from "./errors.js";
import { validateDeepSeekChatRequest } from "./client.js";
import {
  type DeepSeekChatRequest,
  type DeepSeekChatResponse,
  type DeepSeekClient,
  type DeepSeekClientCall,
  type DeepSeekToolCall
} from "./types.js";

export type FakeDeepSeekQueuedResult =
  | DeepSeekChatResponse
  | DeepSeekClientError;

function summarizeCall(request: DeepSeekChatRequest): DeepSeekClientCall {
  const summary: DeepSeekClientCall = {
    model: request.model,
    messageCount: request.messages.length,
    toolCount: request.tools?.length ?? 0,
    hasThinking: request.thinking?.type === "enabled"
  };

  if (request.response_format?.type !== undefined) {
    summary.responseFormatType = request.response_format.type;
  }

  return summary;
}

export function createFakeContentResponse(
  content = "Fake DeepSeek response"
): DeepSeekChatResponse {
  return {
    id: "fake-response",
    model: "deepseek-v4-flash",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content
        },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 1,
      completion_tokens: 1
    }
  };
}

export function createFakeReasoningResponse(
  content: string | null,
  reasoningContent: string
): DeepSeekChatResponse {
  return {
    id: "fake-reasoning-response",
    model: "deepseek-v4-pro",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
          reasoning_content: reasoningContent
        },
        finish_reason: "stop"
      }
    ]
  };
}

export function createFakeToolCallResponse(
  toolCall: DeepSeekToolCall
): DeepSeekChatResponse {
  return {
    id: "fake-tool-call-response",
    model: "deepseek-v4-pro",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: null,
          tool_calls: [toolCall]
        },
        finish_reason: "tool_calls"
      }
    ]
  };
}

export function createFakeApiError(
  kind: DeepSeekClientError["kind"] = "server_error",
  status = 500
): DeepSeekClientError {
  return new DeepSeekClientError(kind, "Fake DeepSeek API error", { status });
}

export class FakeDeepSeekClient implements DeepSeekClient {
  readonly calls: DeepSeekClientCall[] = [];
  private readonly queue: FakeDeepSeekQueuedResult[];

  constructor(responses: FakeDeepSeekQueuedResult[] = []) {
    this.queue = [...responses];
  }

  enqueueResponse(response: DeepSeekChatResponse): void {
    this.queue.push(response);
  }

  enqueueError(error: DeepSeekClientError): void {
    this.queue.push(error);
  }

  async createChatCompletion(
    request: DeepSeekChatRequest
  ): Promise<DeepSeekChatResponse> {
    validateDeepSeekChatRequest(request);
    this.calls.push(summarizeCall(request));

    const next = this.queue.shift();
    if (next instanceof DeepSeekClientError) {
      throw next;
    }

    return next ?? createFakeContentResponse();
  }
}
