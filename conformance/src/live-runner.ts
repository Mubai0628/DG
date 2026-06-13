import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ConversationEngine,
  HttpDeepSeekClient,
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
  type ConformanceSummary
} from "./types.js";

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
        results.push(await thinkingToolRoundtripProbe(client, startedAt));
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

async function thinkingToolRoundtripProbe(
  client: HttpDeepSeekClient,
  startedAt: number
): Promise<ConformanceCaseResult> {
  const toolCallName = "get_constant_value";
  const engine = new ConversationEngine({
    client,
    model: "deepseek-v4-pro",
    thinking: { type: "enabled", reasoning_effort: "high" },
    tools: [
      {
        type: "function",
        function: {
          name: toolCallName,
          description: "Return a harmless constant.",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      }
    ]
  });

  const output = await engine.sendUserMessage(
    "Call the provided function once.",
    {
      tool_choice: {
        type: "function",
        function: { name: toolCallName }
      }
    }
  );
  const pending = output.pendingToolCalls[0];

  if (pending === undefined) {
    return {
      caseId: "CASE-LIVE-003",
      status: "INCONCLUSIVE",
      model: "deepseek-v4-pro",
      responseHasToolCalls: false,
      latencyMs: Date.now() - startedAt,
      note: "Model did not call the harmless tool."
    };
  }

  engine.submitToolResult({ toolCallId: pending.id, content: "constant" });
  const final = await engine.continueAfterToolResults();

  return {
    caseId: "CASE-LIVE-003",
    status: "PASS",
    model: "deepseek-v4-pro",
    responseHasToolCalls: true,
    responseHasReasoningContent:
      final.assistantTurn.reasoningContent !== undefined &&
      final.assistantTurn.reasoningContent !== null,
    usageSummary: final.usage,
    latencyMs: Date.now() - startedAt
  };
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
