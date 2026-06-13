import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ConversationEngine,
  DeepSeekClientError,
  HttpDeepSeekClient,
  type DeepSeekClient,
  type DeepSeekChatResponse
} from "@deepseek-workbench/runtime";

import { liveCaseIds } from "./cases.js";
import {
  formatSummary,
  summarizeResults,
  writeRedactedSummary
} from "./report.js";
import {
  type ConformanceCaseResult,
  type ConformanceSummary,
  type LiveFailureCategory,
  type LiveToolRoundtripDiagnostics
} from "./types.js";
import { sanitizeDiagnosticMessage } from "./redaction.js";

type LiveEnv = {
  DEEPSEEK_CONFORMANCE_LIVE?: string | undefined;
  DEEPSEEK_API_KEY?: string | undefined;
};

export type LiveConformanceOptions = {
  args?: string[];
  env?: LiveEnv;
  now?: () => Date;
};

export async function runLiveConformance(
  options: LiveConformanceOptions = {}
): Promise<ConformanceSummary> {
  const args = options.args ?? [];
  const env = options.env ?? {};
  const hasLiveArg = args.includes("--live");
  const hasLiveEnv = env.DEEPSEEK_CONFORMANCE_LIVE === "1";
  const apiKey = env.DEEPSEEK_API_KEY;

  if (
    !hasLiveArg ||
    !hasLiveEnv ||
    apiKey === undefined ||
    apiKey.length === 0
  ) {
    return summarizeResults("live", [
      {
        caseId: "SKIPPED_LIVE_CONFORMANCE",
        status: "SKIPPED",
        note: "Live conformance requires --live, DEEPSEEK_CONFORMANCE_LIVE=1, and DEEPSEEK_API_KEY."
      }
    ]);
  }

  const client = new HttpDeepSeekClient({ apiKey });
  const results: ConformanceCaseResult[] = [];

  for (const caseId of liveCaseIds) {
    const startedAt = Date.now();
    try {
      if (caseId === "CASE-LIVE-001") {
        results.push(
          summarizeResponse(caseId, await basicFlashProbe(client), startedAt)
        );
      } else if (caseId === "CASE-LIVE-002") {
        results.push(
          summarizeResponse(caseId, await proThinkingProbe(client), startedAt)
        );
      } else if (caseId === "CASE-LIVE-003") {
        results.push(await runLiveThinkingToolRoundtripCase(client, startedAt));
      } else if (caseId === "CASE-LIVE-004") {
        results.push(
          summarizeResponse(caseId, await cacheProbe(client), startedAt)
        );
      } else if (caseId === "CASE-LIVE-005") {
        results.push(
          summarizeResponse(caseId, await cacheBustProbe(client), startedAt)
        );
      }
    } catch (error) {
      results.push({
        caseId,
        status: "FAIL",
        errorKind: error instanceof Error ? error.name : "unknown",
        note: "Live case failed with redacted error summary."
      });
    }
  }

  const summary = summarizeResults("live", results);
  const stamp = (options.now?.() ?? new Date())
    .toISOString()
    .replace(/[:.]/g, "-");
  writeRedactedSummary(
    join("conformance", "results", `live-${stamp}.json`),
    summary
  );
  return summary;
}

async function basicFlashProbe(
  client: HttpDeepSeekClient
): Promise<DeepSeekChatResponse> {
  return client.createChatCompletion({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: "Reply with OK." }],
    thinking: { type: "disabled" },
    max_tokens: 8
  });
}

async function proThinkingProbe(
  client: HttpDeepSeekClient
): Promise<DeepSeekChatResponse> {
  return client.createChatCompletion({
    model: "deepseek-v4-pro",
    messages: [
      { role: "user", content: "Reply with OK after thinking briefly." }
    ],
    thinking: { type: "enabled", reasoning_effort: "high" },
    max_tokens: 16
  });
}

export async function runLiveThinkingToolRoundtripCase(
  client: DeepSeekClient,
  startedAt = Date.now()
): Promise<ConformanceCaseResult> {
  const toolCallName = "get_constant_value";
  const toolChoiceFirstRequest = "omitted";
  const toolChoiceContinuation = "omitted";
  const engine = new ConversationEngine({
    client,
    model: "deepseek-v4-pro",
    thinking: { type: "enabled", reasoning_effort: "high" },
    tools: [
      {
        type: "function",
        function: {
          name: toolCallName,
          description:
            "Return a harmless constant. This has no external side effects.",
          parameters: {
            type: "object",
            properties: {
              key: {
                type: "string",
                enum: ["constant"],
                description: "Always use constant."
              }
            },
            required: ["key"],
            additionalProperties: false
          }
        }
      }
    ]
  });

  let output;
  try {
    output = await engine.sendUserMessage(
      "You must call the provided get_constant_value tool once before answering. Use key=constant. After receiving the tool result, answer with the word DONE."
    );
  } catch (error) {
    return failLiveToolRoundtrip(error, {
      failureCategory: classifyInitialToolRequestFailure(error),
      toolChoiceFirstRequest,
      toolChoiceContinuation,
      thinkingEnabled: true,
      toolChoicePresentFirstRequest: false,
      toolChoicePresentContinuation: false,
      toolChoiceWasStrippedForThinking: false
    });
  }

  const pending = output.pendingToolCalls[0];
  const toolCallCount = output.assistantTurn.toolCalls?.length ?? 0;

  if (pending === undefined) {
    return {
      caseId: "CASE-LIVE-003",
      status: "INCONCLUSIVE",
      model: "deepseek-v4-pro",
      responseHasToolCalls: false,
      responseHasReasoningContent:
        output.assistantTurn.reasoningContent !== undefined &&
        output.assistantTurn.reasoningContent !== null,
      latencyMs: Date.now() - startedAt,
      failureCategory: "NO_TOOL_CALL_INCONCLUSIVE",
      toolCallCount,
      pendingToolCallCount: 0,
      toolChoiceFirstRequest,
      toolChoiceContinuation,
      thinkingEnabled: true,
      toolChoicePresentFirstRequest: false,
      toolChoicePresentContinuation: false,
      toolChoiceWasStrippedForThinking: false,
      note: "Model did not call the harmless tool."
    };
  }

  engine.submitToolResult({ toolCallId: pending.id, content: "constant" });
  const continuation = engine.assembleRequest({
    thinking: { type: "enabled", reasoning_effort: "high" }
  });
  const assistantToolCallContentWasNull = engine
    .getState()
    .turns.some(
      (turn) =>
        turn.role === "assistant" &&
        (turn.toolCalls?.length ?? 0) > 0 &&
        turn.content === null
    );
  const continuationDiagnostics = inspectContinuationRequest(
    continuation,
    assistantToolCallContentWasNull
  );

  try {
    const final = await engine.continueAfterToolResults({
      thinking: { type: "enabled", reasoning_effort: "high" }
    });

    const finalToolCallCount = final.assistantTurn.toolCalls?.length ?? 0;
    if (finalToolCallCount > 0) {
      return {
        caseId: "CASE-LIVE-003",
        status: "PASS",
        model: "deepseek-v4-pro",
        responseHasToolCalls: true,
        responseHasReasoningContent:
          final.assistantTurn.reasoningContent !== undefined &&
          final.assistantTurn.reasoningContent !== null,
        usageSummary: final.usage,
        latencyMs: Date.now() - startedAt,
        toolCallCount: finalToolCallCount,
        pendingToolCallCount: final.pendingToolCalls.length,
        toolChoiceFirstRequest,
        toolChoiceContinuation,
        ...continuationDiagnostics,
        note: "Continuation succeeded and returned additional tool calls; reasoning roundtrip did not 400."
      };
    }

    return {
      caseId: "CASE-LIVE-003",
      status: "PASS",
      model: "deepseek-v4-pro",
      responseHasToolCalls: true,
      responseHasReasoningContent:
        final.assistantTurn.reasoningContent !== undefined &&
        final.assistantTurn.reasoningContent !== null,
      usageSummary: final.usage,
      latencyMs: Date.now() - startedAt,
      toolCallCount,
      pendingToolCallCount: final.pendingToolCalls.length,
      toolChoiceFirstRequest,
      toolChoiceContinuation,
      ...continuationDiagnostics
    };
  } catch (error) {
    return failLiveToolRoundtrip(error, {
      failureCategory: classifyContinuationFailure(error),
      toolCallCount,
      pendingToolCallCount: output.pendingToolCalls.length,
      continuationHttpStatus:
        error instanceof DeepSeekClientError ? error.status : undefined,
      toolChoiceFirstRequest,
      toolChoiceContinuation,
      ...continuationDiagnostics
    });
  }
}

function inspectContinuationRequest(
  continuation: ReturnType<ConversationEngine["assembleRequest"]>,
  assistantToolCallContentWasNull: boolean
): LiveToolRoundtripDiagnostics {
  const continuationIncludesReasoningContent =
    continuation.request.messages.some(
      (message) =>
        message.role === "assistant" &&
        message.reasoning_content !== undefined &&
        message.reasoning_content !== null
    );
  const continuationIncludesAssistantToolCalls =
    continuation.request.messages.some(
      (message) =>
        message.role === "assistant" && (message.tool_calls?.length ?? 0) > 0
    );
  const continuationIncludesToolMessage = continuation.request.messages.some(
    (message) => message.role === "tool" && message.tool_call_id.length > 0
  );
  const assistantToolCallContentNormalized =
    assistantToolCallContentWasNull &&
    continuation.request.messages.some(
      (message) =>
        message.role === "assistant" &&
        (message.tool_calls?.length ?? 0) > 0 &&
        message.content === ""
    );

  return {
    continuationRequestMessageCount: continuation.request.messages.length,
    continuationIncludesToolRoundReasoning:
      continuationIncludesReasoningContent,
    continuationIncludesReasoningContent,
    continuationIncludesAssistantToolCalls,
    continuationIncludesToolMessages: continuationIncludesToolMessage,
    continuationIncludesToolMessage,
    thinkingEnabled: continuation.request.thinking?.type === "enabled",
    toolChoicePresentFirstRequest: false,
    toolChoicePresentContinuation:
      continuation.request.tool_choice !== undefined,
    toolChoiceWasStrippedForThinking: false,
    assistantToolCallContentWasNull,
    assistantToolCallContentNormalized
  };
}

function failLiveToolRoundtrip(
  error: unknown,
  diagnostics: LiveToolRoundtripDiagnostics
): ConformanceCaseResult {
  return {
    caseId: "CASE-LIVE-003",
    status: "FAIL",
    model: "deepseek-v4-pro",
    errorKind:
      error instanceof DeepSeekClientError
        ? error.kind
        : error instanceof Error
          ? error.name
          : "unknown",
    httpStatus: error instanceof DeepSeekClientError ? error.status : undefined,
    sanitizedErrorMessage:
      error instanceof Error
        ? sanitizeDiagnosticMessage(error.message)
        : "Unknown live failure",
    liveFailureCategory: diagnostics.failureCategory,
    ...diagnostics,
    note: "Live thinking+tool roundtrip failed with redacted diagnostics."
  };
}

function classifyInitialToolRequestFailure(
  error: unknown
): LiveFailureCategory {
  if (isToolChoiceUnsupportedInThinking(error)) {
    return "TOOL_CHOICE_UNSUPPORTED_IN_THINKING";
  }
  if (error instanceof DeepSeekClientError) {
    if (
      error.kind === "rate_limited" ||
      error.kind === "overloaded" ||
      error.kind === "network_error" ||
      error.kind === "timeout"
    ) {
      return "NETWORK_OR_RATE_LIMIT";
    }
    if (error.status === 400 || error.status === 422) {
      return "STRICT_SCHEMA_OR_BETA_ERROR";
    }
  }

  return "UNKNOWN_LIVE_FAILURE";
}

function classifyContinuationFailure(error: unknown): LiveFailureCategory {
  if (isToolChoiceUnsupportedInThinking(error)) {
    return "TOOL_CHOICE_UNSUPPORTED_IN_THINKING";
  }
  if (error instanceof DeepSeekClientError) {
    if (error.status === 400) {
      return "API_400_REASONING_ROUNDTRIP";
    }
    if (error.status === 422) {
      return "INVALID_TOOL_MESSAGE_SHAPE";
    }
    if (
      error.kind === "rate_limited" ||
      error.kind === "overloaded" ||
      error.kind === "network_error" ||
      error.kind === "timeout"
    ) {
      return "NETWORK_OR_RATE_LIMIT";
    }
  }

  return "UNKNOWN_LIVE_FAILURE";
}

function isToolChoiceUnsupportedInThinking(error: unknown): boolean {
  if (!(error instanceof DeepSeekClientError) || error.status !== 400) {
    return false;
  }

  const message = sanitizeDiagnosticMessage(error.message).toLowerCase();
  const mentionsToolChoice =
    message.includes("tool_choice") || message.includes("tool choice");
  const mentionsUnsupported =
    message.includes("invalid") ||
    message.includes("unsupported") ||
    message.includes("not allowed") ||
    message.includes("not support") ||
    message.includes("reject") ||
    message.includes("disallow");

  return mentionsToolChoice && mentionsUnsupported;
}

async function cacheProbe(
  client: HttpDeepSeekClient
): Promise<DeepSeekChatResponse> {
  await client.createChatCompletion({
    model: "deepseek-v4-flash",
    messages: [
      { role: "user", content: "Stable prefix cache probe. Reply OK." }
    ],
    thinking: { type: "disabled" },
    max_tokens: 8
  });

  return client.createChatCompletion({
    model: "deepseek-v4-flash",
    messages: [
      { role: "user", content: "Stable prefix cache probe. Reply OK." }
    ],
    thinking: { type: "disabled" },
    max_tokens: 8
  });
}

async function cacheBustProbe(
  client: HttpDeepSeekClient
): Promise<DeepSeekChatResponse> {
  return client.createChatCompletion({
    model: "deepseek-v4-flash",
    messages: [
      { role: "user", content: "Stable prefix cache probe changed. Reply OK." }
    ],
    thinking: { type: "disabled" },
    max_tokens: 8
  });
}

function summarizeResponse(
  caseId: ConformanceCaseResult["caseId"],
  response: DeepSeekChatResponse,
  startedAt: number
): ConformanceCaseResult {
  const message = response.choices[0]?.message;
  const usageSummary = response.usageSummary;
  const cacheObserved =
    response.usage?.prompt_cache_hit_tokens !== undefined ||
    response.usage?.prompt_cache_miss_tokens !== undefined;

  return {
    caseId,
    status: "PASS",
    model: response.model,
    finishReason: response.choices[0]?.finish_reason,
    responseHasReasoningContent:
      message?.reasoning_content !== undefined &&
      message.reasoning_content !== null,
    responseHasToolCalls: (message?.tool_calls?.length ?? 0) > 0,
    usageSummary,
    latencyMs: Date.now() - startedAt,
    cacheHitTokens: usageSummary?.cacheHitTokens,
    cacheMissTokens: usageSummary?.cacheMissTokens,
    note: cacheObserved
      ? "Cache usage fields observed."
      : "API_RESPONSE_MISSING_CACHE_FIELDS"
  };
}

async function main(): Promise<void> {
  const summary = await runLiveConformance({
    args: process.argv.slice(2),
    env: {
      DEEPSEEK_CONFORMANCE_LIVE: process.env.DEEPSEEK_CONFORMANCE_LIVE,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY
    }
  });

  if (summary.status === "SKIPPED") {
    console.log("SKIPPED_LIVE_CONFORMANCE");
  }
  console.log(formatSummary(summary));

  if (summary.status === "FAIL") {
    process.exitCode = 1;
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
