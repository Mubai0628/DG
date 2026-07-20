import {
  mapDeepSeekUsageToUsageSummary,
  validateDeepSeekChatRequest,
  type DeepSeekChatRequest,
  type DeepSeekChatResponse,
  type DeepSeekThinkingConfig,
  type DeepSeekToolDefinition
} from "../deepseek/index.js";
import { type EventStore, type UsageSummary } from "../events/index.js";

import { MessageAssembler } from "./message-assembler.js";
import { InMemoryReasoningContentStore } from "./reasoning-store.js";
import {
  detectCacheBoundaryReason,
  sanitizeThinkingRequest
} from "./thinking-guard.js";
import { ToolCallStateMachine } from "./tool-call-state.js";
import {
  type AssembledRequest,
  type CacheBoundaryReason,
  type ConversationEngineOptions,
  type ConversationOutput,
  type ConversationRequestOptions,
  type ConversationState,
  type ConversationTurn,
  type ReasoningContentStore,
  type ToolResultInput
} from "./types.js";

type RequestShape = {
  model: ConversationEngineOptions["model"];
  thinking?: DeepSeekThinkingConfig;
  tools?: DeepSeekToolDefinition[];
};

export class ConversationEngine {
  private readonly options: ConversationEngineOptions;
  private readonly reasoningStore: ReasoningContentStore;
  private readonly messageAssembler: MessageAssembler;
  private readonly toolCallState = new ToolCallStateMachine();
  private readonly eventStore: EventStore | undefined;
  private readonly idFactory: () => string;
  private readonly clock: () => Date;
  private readonly state: ConversationState;
  private lastRequestShape: RequestShape | undefined;

  constructor(options: ConversationEngineOptions) {
    this.options = options;
    this.eventStore = options.eventStore;
    this.idFactory = options.idFactory ?? defaultIdFactory();
    this.clock = options.clock ?? (() => new Date());
    this.reasoningStore = new InMemoryReasoningContentStore();
    this.messageAssembler = new MessageAssembler(this.reasoningStore);
    this.state = {
      turns: [],
      pendingToolCalls: [],
      model: options.model,
      tools: options.tools ?? []
    };

    if (options.thinking !== undefined) {
      this.state.thinking = options.thinking;
    }

    // Optional system prompt: injected as the first turn so the assembler
    // carries it into every request. Provided at construction because the
    // engine intentionally has no public addSystemMessage API.
    if (options.systemPrompt !== undefined && options.systemPrompt !== "") {
      this.addTurn({
        role: "system",
        content: options.systemPrompt,
        hasToolCall: false,
        thinkingEnabled: false,
        includeReasoningInNextRequest: false
      });
    }
  }

  getReasoningStore(): ReasoningContentStore {
    return this.reasoningStore;
  }

  addUserMessage(content: string): ConversationTurn {
    this.assertNoIncompleteToolCalls();
    return this.addTurn({
      role: "user",
      content,
      hasToolCall: false,
      thinkingEnabled: false,
      includeReasoningInNextRequest: false
    });
  }

  async sendUserMessage(
    content: string,
    options: ConversationRequestOptions = {}
  ): Promise<ConversationOutput> {
    this.addUserMessage(content);
    return this.requestAssistant(options);
  }

  submitToolResult(input: ToolResultInput): ConversationTurn {
    const pending = this.toolCallState.validateToolResult(input);
    const turn = this.addTurn({
      role: "tool",
      content: input.content,
      toolCallId: input.toolCallId,
      hasToolCall: false,
      thinkingEnabled: false,
      includeReasoningInNextRequest: false
    });

    this.toolCallState.markToolResultSubmitted(pending.id, turn.id);
    this.syncPendingToolCalls();
    return turn;
  }

  async continueAfterToolResults(
    options: ConversationRequestOptions = {}
  ): Promise<ConversationOutput> {
    if (this.toolCallState.hasIncompleteToolCalls()) {
      throw new Error(
        "Cannot continue while pending tool calls are incomplete"
      );
    }

    return this.requestAssistant(options);
  }

  getState(): ConversationState {
    return {
      turns: this.state.turns.map((turn) => cloneTurn(turn)),
      pendingToolCalls: this.toolCallState.listPendingToolCalls(),
      model: this.state.model,
      tools: [...this.state.tools],
      ...(this.state.thinking !== undefined
        ? { thinking: { ...this.state.thinking } }
        : {})
    };
  }

  assembleRequest(options: ConversationRequestOptions = {}): AssembledRequest {
    const shape = this.resolveRequestShape(options);
    const messages = this.messageAssembler.assembleMessages(this.state);
    const request: DeepSeekChatRequest = sanitizeThinkingRequest({
      model: shape.model,
      messages,
      ...(shape.thinking !== undefined ? { thinking: shape.thinking } : {}),
      ...(shape.tools !== undefined && shape.tools.length > 0
        ? { tools: shape.tools }
        : {}),
      ...(options.tool_choice !== undefined
        ? { tool_choice: options.tool_choice }
        : {}),
      ...(options.response_format !== undefined
        ? { response_format: options.response_format }
        : {}),
      ...(options.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
      ...(options.top_p !== undefined ? { top_p: options.top_p } : {}),
      ...(options.max_tokens !== undefined
        ? { max_tokens: options.max_tokens }
        : {})
    });
    validateDeepSeekChatRequest(request);

    const cacheBoundaryReason = detectCacheBoundaryReason(
      this.lastRequestShape,
      shape
    );
    const requestSummary = {
      messageCount: request.messages.length,
      hasTools: (request.tools?.length ?? 0) > 0,
      toolCount: request.tools?.length ?? 0,
      thinkingEnabled: request.thinking?.type === "enabled",
      model: request.model,
      cacheBoundaryReason
    };

    return {
      request,
      messages,
      requestSummary,
      ...(cacheBoundaryReason !== undefined ? { cacheBoundaryReason } : {})
    };
  }

  private async requestAssistant(
    options: ConversationRequestOptions
  ): Promise<ConversationOutput> {
    const assembled = this.assembleRequest(options);
    this.logContextAssembled(assembled);
    this.logCacheBoundary(assembled.cacheBoundaryReason);
    this.logLlmRequested(assembled);

    const response = await this.options.client.createChatCompletion(
      assembled.request
    );
    const assistantTurn = this.addAssistantTurn(response, assembled.request);
    this.lastRequestShape = this.resolveRequestShape(options);
    this.syncPendingToolCalls();

    const usage = assistantTurn.usage;
    const responseSummary = summarizeResponse(response, usage);
    this.eventStore?.appendEvent({
      type: "llm.completed",
      payload: responseSummary,
      ...(usage !== undefined ? { usage } : {})
    });

    return {
      assistantTurn: cloneTurn(assistantTurn),
      pendingToolCalls: this.toolCallState.listPendingToolCalls(),
      ...(usage !== undefined ? { usage } : {}),
      requestSummary: assembled.requestSummary,
      responseSummary
    };
  }

  private addAssistantTurn(
    response: DeepSeekChatResponse,
    request: DeepSeekChatRequest
  ): ConversationTurn {
    const choice = response.choices[0];
    if (choice === undefined) {
      throw new Error("DeepSeek response did not include a choice");
    }

    const toolCalls = choice.message.tool_calls ?? [];
    const hasToolCall = toolCalls.length > 0;
    const reasoningContent = choice.message.reasoning_content;
    const usage =
      response.usageSummary ??
      mapDeepSeekUsageToUsageSummary(response.usage, { model: response.model });
    const turn = this.addTurn({
      role: "assistant",
      content: choice.message.content,
      ...(reasoningContent !== undefined ? { reasoningContent } : {}),
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      hasToolCall,
      thinkingEnabled: request.thinking?.type === "enabled",
      includeReasoningInNextRequest:
        hasToolCall &&
        reasoningContent !== undefined &&
        reasoningContent !== null,
      model: request.model,
      usage
    });

    if (reasoningContent !== undefined && reasoningContent !== null) {
      this.reasoningStore.put(turn.id, reasoningContent);
    }
    if (toolCalls.length > 0) {
      this.toolCallState.addAssistantToolCalls(turn.id, toolCalls);
    }

    return turn;
  }

  private addTurn(
    input: Omit<ConversationTurn, "id" | "createdAt">
  ): ConversationTurn {
    const turn: ConversationTurn = {
      id: this.idFactory(),
      createdAt: this.clock().toISOString(),
      ...input
    };

    this.state.turns.push(turn);
    return turn;
  }

  private resolveRequestShape(
    options: ConversationRequestOptions
  ): RequestShape {
    const shape: RequestShape = {
      model: options.model ?? this.options.model,
      tools: options.tools ?? this.options.tools ?? []
    };

    const thinking = options.thinking ?? this.options.thinking;
    if (thinking !== undefined) {
      shape.thinking = thinking;
    }

    return shape;
  }

  private syncPendingToolCalls(): void {
    this.state.pendingToolCalls = this.toolCallState.listPendingToolCalls();
  }

  private assertNoIncompleteToolCalls(): void {
    if (this.toolCallState.hasIncompleteToolCalls()) {
      throw new Error("Cannot add user message while tool calls are pending");
    }
  }

  private logContextAssembled(assembled: AssembledRequest): void {
    this.eventStore?.appendEvent({
      type: "context.assembled",
      payload: {
        messageCount: assembled.request.messages.length,
        hasTools: (assembled.request.tools?.length ?? 0) > 0,
        thinkingEnabled: assembled.request.thinking?.type === "enabled",
        model: assembled.request.model,
        promptStorage: "disabled"
      }
    });
  }

  private logLlmRequested(assembled: AssembledRequest): void {
    this.eventStore?.appendEvent({
      type: "llm.requested",
      payload: assembled.requestSummary
    });
  }

  private logCacheBoundary(reason: CacheBoundaryReason | undefined): void {
    if (reason === undefined) {
      return;
    }

    this.eventStore?.appendEvent({
      type: "cache.boundary.changed",
      payload: {
        cacheBoundaryReason: reason
      }
    });
  }
}

let fallbackId = 0;

function defaultIdFactory(): () => string {
  return () => {
    fallbackId += 1;
    return `turn-${fallbackId}`;
  };
}

function cloneTurn(turn: ConversationTurn): ConversationTurn {
  return {
    ...turn,
    ...(turn.toolCalls !== undefined ? { toolCalls: [...turn.toolCalls] } : {}),
    ...(turn.usage !== undefined ? { usage: { ...turn.usage } } : {})
  };
}

function summarizeResponse(
  response: DeepSeekChatResponse,
  usage: UsageSummary | undefined
): Record<string, unknown> {
  const message = response.choices[0]?.message;

  return {
    model: response.model,
    responseHasToolCalls: (message?.tool_calls?.length ?? 0) > 0,
    pendingToolCallCount: message?.tool_calls?.length ?? 0,
    responseHasReasoningContent:
      message?.reasoning_content !== undefined &&
      message.reasoning_content !== null,
    hasUsage: usage !== undefined
  };
}
