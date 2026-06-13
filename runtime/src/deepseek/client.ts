import { DeepSeekClientError } from "./errors.js";
import {
  deepSeekModelIds,
  type DeepSeekChatRequest,
  type DeepSeekMessage
} from "./types.js";

const reasoningEfforts = new Set(["high", "max"]);
const thinkingTypes = new Set(["enabled", "disabled"]);
const responseFormatTypes = new Set(["text", "json_object"]);
const toolChoiceStrings = new Set(["auto", "none", "required"]);

export type ParsedToolArguments =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export function parseToolArgumentsSafely(
  argumentsText: string
): ParsedToolArguments {
  try {
    return { ok: true, value: JSON.parse(argumentsText) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { ok: false, error: message };
  }
}

function validateMessage(message: DeepSeekMessage): void {
  if (message.role === "tool" && message.tool_call_id.length === 0) {
    throw new DeepSeekClientError(
      "invalid_request",
      "Tool message requires tool_call_id"
    );
  }

  if (message.role === "assistant") {
    for (const toolCall of message.tool_calls ?? []) {
      if (toolCall.type !== "function") {
        throw new DeepSeekClientError(
          "invalid_request",
          "Tool calls must use type=function"
        );
      }
      if (typeof toolCall.function.arguments !== "string") {
        throw new DeepSeekClientError(
          "invalid_request",
          "Tool call arguments must remain a raw string"
        );
      }
    }
  }
}

export function validateDeepSeekChatRequest(
  request: DeepSeekChatRequest
): void {
  if (!deepSeekModelIds.includes(request.model)) {
    throw new DeepSeekClientError("invalid_request", "Unsupported model");
  }

  if (!Array.isArray(request.messages) || request.messages.length === 0) {
    throw new DeepSeekClientError(
      "invalid_request",
      "At least one message is required"
    );
  }

  for (const message of request.messages) {
    validateMessage(message);
  }

  if (request.thinking !== undefined) {
    if (!thinkingTypes.has(request.thinking.type)) {
      throw new DeepSeekClientError(
        "invalid_request",
        "thinking.type must be enabled or disabled"
      );
    }
    if (
      request.thinking.reasoning_effort !== undefined &&
      !reasoningEfforts.has(request.thinking.reasoning_effort)
    ) {
      throw new DeepSeekClientError(
        "invalid_request",
        "reasoning_effort must be high or max"
      );
    }
  }

  if (
    request.response_format !== undefined &&
    !responseFormatTypes.has(request.response_format.type)
  ) {
    throw new DeepSeekClientError(
      "invalid_request",
      "response_format.type must be text or json_object"
    );
  }

  for (const tool of request.tools ?? []) {
    if (tool.type !== "function") {
      throw new DeepSeekClientError(
        "invalid_request",
        "Tools must use type=function"
      );
    }
  }

  if (request.tool_choice !== undefined) {
    if (typeof request.tool_choice === "string") {
      if (!toolChoiceStrings.has(request.tool_choice)) {
        throw new DeepSeekClientError(
          "invalid_request",
          "tool_choice must be auto, none, required, or a function choice"
        );
      }
    } else if (
      request.tool_choice.type !== "function" ||
      request.tool_choice.function.name.length === 0
    ) {
      throw new DeepSeekClientError(
        "invalid_request",
        "tool_choice function requires a name"
      );
    }
  }
}

export function sanitizeDeepSeekChatRequest(
  request: DeepSeekChatRequest
): DeepSeekChatRequest {
  validateDeepSeekChatRequest(request);

  if (request.thinking?.type !== "enabled") {
    return { ...request, messages: [...request.messages] };
  }

  const sanitized = { ...request, messages: [...request.messages] };
  delete sanitized.temperature;
  delete sanitized.top_p;
  delete sanitized.tool_choice;

  return sanitized;
}
