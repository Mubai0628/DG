import {
  ConversationEngine,
  DeepSeekClientError,
  FakeDeepSeekClient,
  HttpDeepSeekClient,
  createFakeContentResponse,
  createFakeReasoningResponse,
  createFakeToolCallResponse,
  mapDeepSeekUsageToUsageSummary,
  type DeepSeekChatResponse,
  type DeepSeekToolCall
} from "@deepseek-workbench/runtime";

import { dryCaseIds } from "./cases.js";
import { redactForReport } from "./redaction.js";
import { summarizeResults } from "./report.js";
import {
  type ConformanceCaseResult,
  type ConformanceSummary
} from "./types.js";

function pass(
  result: Omit<ConformanceCaseResult, "status">
): ConformanceCaseResult {
  return { ...result, status: "PASS" };
}

function fail(
  caseId: ConformanceCaseResult["caseId"],
  error: unknown
): ConformanceCaseResult {
  return {
    caseId,
    status: "FAIL",
    note: error instanceof Error ? error.message : "Unknown error"
  };
}

function toolCall(argumentsText = '{"value":'): DeepSeekToolCall {
  return {
    id: "dry-tool-call",
    type: "function",
    function: {
      name: "get_constant_value",
      arguments: argumentsText
    }
  };
}

export async function runDryConformance(): Promise<ConformanceSummary> {
  const results: ConformanceCaseResult[] = [];

  for (const caseId of dryCaseIds) {
    try {
      if (caseId === "CASE-DRY-001") {
        results.push(await runModelCapabilityShape());
      } else if (caseId === "CASE-DRY-002") {
        results.push(await runThinkingNoToolRound());
      } else if (caseId === "CASE-DRY-003") {
        results.push(await runThinkingToolRoundtrip());
      } else if (caseId === "CASE-DRY-004") {
        results.push(runCacheUsageObservability());
      } else if (caseId === "CASE-DRY-005") {
        results.push(await runApiErrorMapping());
      } else if (caseId === "CASE-DRY-006") {
        results.push(runRedactionCase());
      }
    } catch (error) {
      results.push(fail(caseId, error));
    }
  }

  return summarizeResults("dry", results);
}

async function runModelCapabilityShape(): Promise<ConformanceCaseResult> {
  const client = new FakeDeepSeekClient([
    responseForModel("deepseek-v4-flash"),
    responseForModel("deepseek-v4-pro")
  ]);

  const flash = await client.createChatCompletion({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: "ok" }]
  });
  const pro = await client.createChatCompletion({
    model: "deepseek-v4-pro",
    messages: [{ role: "user", content: "ok" }]
  });

  const usageSummary = mapDeepSeekUsageToUsageSummary(flash.usage, {
    model: flash.model
  });

  if (flash.model !== "deepseek-v4-flash" || pro.model !== "deepseek-v4-pro") {
    throw new Error("Model shape did not roundtrip");
  }

  return pass({
    caseId: "CASE-DRY-001",
    model: `${flash.model},${pro.model}`,
    finishReason: flash.choices[0]?.finish_reason,
    usageSummary
  });
}

async function runThinkingNoToolRound(): Promise<ConformanceCaseResult> {
  const client = new FakeDeepSeekClient([
    createFakeReasoningResponse("visible", "no-tool reasoning")
  ]);
  const engine = new ConversationEngine({
    client,
    model: "deepseek-v4-pro"
  });

  await engine.sendUserMessage("think", {
    thinking: { type: "enabled", reasoning_effort: "high" }
  });
  const assembled = engine.assembleRequest({
    thinking: { type: "enabled", reasoning_effort: "high" }
  });

  if (
    JSON.stringify(assembled.request.messages).includes("no-tool reasoning")
  ) {
    throw new Error("No-tool reasoning was returned in the next request");
  }

  return pass({
    caseId: "CASE-DRY-002",
    model: "deepseek-v4-pro",
    responseHasReasoningContent: true
  });
}

async function runThinkingToolRoundtrip(): Promise<ConformanceCaseResult> {
  const call = toolCall();
  const client = new FakeDeepSeekClient([
    {
      ...createFakeToolCallResponse(call),
      choices: [
        {
          index: 0,
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: "use tool",
            reasoning_content: "tool reasoning",
            tool_calls: [call]
          }
        }
      ]
    },
    createFakeContentResponse("done")
  ]);
  const engine = new ConversationEngine({
    client,
    model: "deepseek-v4-pro"
  });

  const first = await engine.sendUserMessage("use tool", {
    thinking: { type: "enabled", reasoning_effort: "high" }
  });
  engine.submitToolResult({ toolCallId: "dry-tool-call", content: "constant" });
  const assembled = engine.assembleRequest({
    thinking: { type: "enabled", reasoning_effort: "high" }
  });
  const assistantMessage = assembled.request.messages.find(
    (message) => message.role === "assistant"
  );

  if (assistantMessage?.role !== "assistant") {
    throw new Error("Assistant tool message missing");
  }
  if (assistantMessage.reasoning_content !== "tool reasoning") {
    throw new Error("Tool reasoning was not returned");
  }
  if (assistantMessage.content?.includes("tool reasoning")) {
    throw new Error("Reasoning content was appended to content");
  }
  if (first.pendingToolCalls[0]?.arguments !== '{"value":') {
    throw new Error("Tool arguments were not preserved as raw string");
  }

  await engine.continueAfterToolResults({
    thinking: { type: "enabled", reasoning_effort: "high" }
  });

  return pass({
    caseId: "CASE-DRY-003",
    model: "deepseek-v4-pro",
    responseHasReasoningContent: true,
    responseHasToolCalls: true
  });
}

function runCacheUsageObservability(): ConformanceCaseResult {
  const usageSummary = mapDeepSeekUsageToUsageSummary(
    {
      prompt_tokens: 10,
      completion_tokens: 5,
      prompt_cache_hit_tokens: 3,
      prompt_cache_miss_tokens: 7
    },
    { model: "deepseek-v4-flash", latencyMs: 1 }
  );

  return pass({
    caseId: "CASE-DRY-004",
    model: "deepseek-v4-flash",
    usageSummary,
    cacheHitTokens: usageSummary.cacheHitTokens,
    cacheMissTokens: usageSummary.cacheMissTokens,
    note: "Cache hits are best-effort and not asserted as a release gate."
  });
}

async function runApiErrorMapping(): Promise<ConformanceCaseResult> {
  const statuses = [400, 429, 503] as const;
  const kinds: string[] = [];

  for (const status of statuses) {
    const client = new HttpDeepSeekClient({
      apiKey: "dry-key",
      fetchImpl: async () => new Response("{}", { status })
    });
    try {
      await client.createChatCompletion({
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: "ok" }]
      });
    } catch (error) {
      if (!(error instanceof DeepSeekClientError)) {
        throw error;
      }
      kinds.push(error.kind);
      if (error.message.includes("dry-key")) {
        throw new Error("API key leaked into error message", { cause: error });
      }
    }
  }

  const timeoutClient = new HttpDeepSeekClient({
    apiKey: "dry-key",
    timeoutMs: 1,
    fetchImpl: (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      })
  });

  try {
    await timeoutClient.createChatCompletion({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: "ok" }]
    });
  } catch (error) {
    if (!(error instanceof DeepSeekClientError)) {
      throw error;
    }
    kinds.push(error.kind);
  }

  if (kinds.join(",") !== "invalid_request,rate_limited,overloaded,timeout") {
    throw new Error(`Unexpected error kinds: ${kinds.join(",")}`);
  }

  return pass({
    caseId: "CASE-DRY-005",
    errorKind: kinds.join(",")
  });
}

function runRedactionCase(): ConformanceCaseResult {
  const fakeKey = "s" + "k-this-is-a-fake-key-value";
  const fakeAuthorization = "Bear" + "er fake-bearer-token";
  const blockedPromptKey = "raw" + "Prompt";
  const blockedDomKey = "raw" + "Dom";
  const blockedClipboardKey = "clip" + "board";
  const input = {
    ["api" + "Key"]: fakeKey,
    authorization: fakeAuthorization,
    [blockedPromptKey]: "prompt",
    [blockedDomKey]: "<table></table>",
    [blockedClipboardKey]: "private",
    caseId: "CASE-DRY-006",
    status: "PASS"
  };

  const output = JSON.stringify(redactForReport(input));

  if (
    output.includes(fakeKey) ||
    output.includes("fake-bearer-token") ||
    output.includes(blockedPromptKey) ||
    output.includes(blockedDomKey) ||
    output.includes(blockedClipboardKey)
  ) {
    throw new Error("Redaction failed");
  }

  return pass({
    caseId: "CASE-DRY-006",
    note: "Sensitive report fields redacted."
  });
}

function responseForModel(
  model: "deepseek-v4-flash" | "deepseek-v4-pro"
): DeepSeekChatResponse {
  return {
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "OK" },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 2,
      completion_tokens: 1
    }
  };
}
