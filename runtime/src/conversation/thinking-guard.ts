import {
  sanitizeDeepSeekChatRequest,
  type DeepSeekChatRequest,
  type DeepSeekModelId,
  type DeepSeekThinkingConfig,
  type DeepSeekToolDefinition
} from "../deepseek/index.js";

import { type CacheBoundaryReason } from "./types.js";

type RequestShape = {
  model: DeepSeekModelId;
  thinking?: DeepSeekThinkingConfig;
  tools?: DeepSeekToolDefinition[];
};

function thinkingMode(thinking?: DeepSeekThinkingConfig): string {
  return thinking?.type ?? "disabled";
}

function toolNames(tools?: DeepSeekToolDefinition[]): string {
  return (tools ?? [])
    .map((tool) => tool.function.name)
    .sort()
    .join(",");
}

export function sanitizeThinkingRequest(
  request: DeepSeekChatRequest
): DeepSeekChatRequest {
  return sanitizeDeepSeekChatRequest(request);
}

export function detectCacheBoundaryReason(
  previous: RequestShape | undefined,
  next: RequestShape
): CacheBoundaryReason | undefined {
  if (previous === undefined) {
    return undefined;
  }

  if (previous.model !== next.model) {
    return "model_changed";
  }
  if (thinkingMode(previous.thinking) !== thinkingMode(next.thinking)) {
    return "thinking_changed";
  }
  if (toolNames(previous.tools) !== toolNames(next.tools)) {
    return "tools_changed";
  }

  return undefined;
}
