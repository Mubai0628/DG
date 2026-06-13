import { type UsageSummary } from "../events/index.js";

export const deepSeekModelIds = [
  "deepseek-v4-flash",
  "deepseek-v4-pro"
] as const;

export type DeepSeekModelId = (typeof deepSeekModelIds)[number];
export type DeepSeekReasoningEffort = "high" | "max";

export type DeepSeekThinkingConfig = {
  type: "enabled" | "disabled";
  reasoning_effort?: DeepSeekReasoningEffort;
};

export type DeepSeekSystemMessage = {
  role: "system";
  content: string;
};

export type DeepSeekUserMessage = {
  role: "user";
  content: string;
};

export type DeepSeekToolMessage = {
  role: "tool";
  tool_call_id: string;
  content: string;
};

export type DeepSeekToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type DeepSeekAssistantMessage = {
  role: "assistant";
  content: string | null;
  reasoning_content?: string | null;
  tool_calls?: DeepSeekToolCall[];
};

export type DeepSeekMessage =
  | DeepSeekSystemMessage
  | DeepSeekUserMessage
  | DeepSeekAssistantMessage
  | DeepSeekToolMessage;

export type DeepSeekToolDefinition = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type DeepSeekResponseFormat = {
  type: "text" | "json_object";
};

export type DeepSeekChatRequest = {
  model: DeepSeekModelId;
  messages: DeepSeekMessage[];
  thinking?: DeepSeekThinkingConfig;
  tools?: DeepSeekToolDefinition[];
  response_format?: DeepSeekResponseFormat;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: false;
};

export type DeepSeekFinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "error";

export type DeepSeekChoice = {
  index: number;
  message: DeepSeekAssistantMessage;
  finish_reason: DeepSeekFinishReason | null;
};

export type DeepSeekUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  reasoning_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
  total_tokens?: number;
};

export type DeepSeekChatResponse = {
  id?: string;
  object?: string;
  created?: number;
  model: DeepSeekModelId | string;
  choices: DeepSeekChoice[];
  usage?: DeepSeekUsage;
  usageSummary?: UsageSummary;
};

export type DeepSeekClient = {
  createChatCompletion(
    request: DeepSeekChatRequest
  ): Promise<DeepSeekChatResponse>;
};

export type DeepSeekClientCall = {
  model: DeepSeekModelId;
  messageCount: number;
  toolCount: number;
  hasThinking: boolean;
  responseFormatType?: DeepSeekResponseFormat["type"];
};
