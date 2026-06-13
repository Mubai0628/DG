import {
  type DeepSeekChatRequest,
  type DeepSeekClient,
  type DeepSeekModelId,
  type DeepSeekThinkingConfig,
  type DeepSeekToolCall,
  type DeepSeekToolDefinition,
  type DeepSeekMessage,
  type DeepSeekResponseFormat
} from "../deepseek/index.js";
import { type EventStore, type UsageSummary } from "../events/index.js";

export type ConversationTurnId = string;
export type ThinkingMode = "enabled" | "disabled";
export type CacheBoundaryReason =
  | "thinking_changed"
  | "tools_changed"
  | "model_changed";

export type ConversationTurnRole = "system" | "user" | "assistant" | "tool";

export type ConversationTurn = {
  id: ConversationTurnId;
  role: ConversationTurnRole;
  content: string | null;
  reasoningContent?: string | null;
  toolCalls?: DeepSeekToolCall[];
  toolCallId?: string;
  hasToolCall: boolean;
  thinkingEnabled: boolean;
  includeReasoningInNextRequest: boolean;
  createdAt: string;
  model?: DeepSeekModelId;
  usage?: UsageSummary;
};

export type PendingToolCall = {
  id: string;
  name: string;
  arguments: string;
  assistantTurnId: ConversationTurnId;
  completed: boolean;
  resultTurnId?: ConversationTurnId;
};

export type ToolResultInput = {
  toolCallId: string;
  content: string;
};

export type ConversationInput = {
  content: string;
};

export type ConversationRequestOptions = {
  model?: DeepSeekModelId;
  thinking?: DeepSeekThinkingConfig;
  tools?: DeepSeekToolDefinition[];
  response_format?: DeepSeekResponseFormat;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
};

export type ConversationEngineOptions = {
  client: DeepSeekClient;
  eventStore?: EventStore;
  model: DeepSeekModelId;
  thinking?: DeepSeekThinkingConfig;
  tools?: DeepSeekToolDefinition[];
  clock?: () => Date;
  idFactory?: () => string;
};

export type ConversationState = {
  turns: ConversationTurn[];
  pendingToolCalls: PendingToolCall[];
  model: DeepSeekModelId;
  thinking?: DeepSeekThinkingConfig;
  tools: DeepSeekToolDefinition[];
};

export type ReasoningContentStore = {
  put(turnId: ConversationTurnId, reasoningContent: string): void;
  get(turnId: ConversationTurnId): string | undefined;
  has(turnId: ConversationTurnId): boolean;
  listTurnIds(): ConversationTurnId[];
  clear(): void;
};

export type AssembledRequest = {
  request: DeepSeekChatRequest;
  messages: DeepSeekMessage[];
  requestSummary: Record<string, unknown>;
  cacheBoundaryReason?: CacheBoundaryReason;
};

export type ConversationOutput = {
  assistantTurn: ConversationTurn;
  pendingToolCalls: PendingToolCall[];
  usage?: UsageSummary;
  requestSummary: Record<string, unknown>;
  responseSummary: Record<string, unknown>;
};
