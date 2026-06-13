import { describe, expect, it } from "vitest";

import {
  DeepSeekClientError,
  FakeDeepSeekClient,
  HttpDeepSeekClient,
  createFakeReasoningResponse,
  createFakeToolCallResponse,
  mapDeepSeekUsageToUsageSummary,
  parseToolArgumentsSafely,
  validateDeepSeekChatRequest,
  type DeepSeekChatRequest,
  type DeepSeekToolCall
} from "../src/index.js";

const basicRequest: DeepSeekChatRequest = {
  model: "deepseek-v4-flash",
  messages: [{ role: "user", content: "Extract the visible table." }]
};

describe("DeepSeek client adapter", () => {
  it("FakeDeepSeekClient returns a default assistant response", async () => {
    const client = new FakeDeepSeekClient();

    const response = await client.createChatCompletion(basicRequest);

    expect(response.choices[0]?.message.content).toBe("Fake DeepSeek response");
  });

  it("FakeDeepSeekClient records sanitized call summaries", async () => {
    const client = new FakeDeepSeekClient();

    await client.createChatCompletion({
      ...basicRequest,
      tools: [
        {
          type: "function",
          function: { name: "write_draft" }
        }
      ],
      response_format: { type: "json_object" }
    });

    expect(client.calls).toEqual([
      {
        model: "deepseek-v4-flash",
        messageCount: 1,
        toolCount: 1,
        hasThinking: false,
        responseFormatType: "json_object"
      }
    ]);
    expect(JSON.stringify(client.calls)).not.toContain(
      "Extract the visible table"
    );
  });

  it("FakeDeepSeekClient can return reasoning_content", async () => {
    const client = new FakeDeepSeekClient([
      createFakeReasoningResponse("done", "private reasoning placeholder")
    ]);

    const response = await client.createChatCompletion({
      ...basicRequest,
      model: "deepseek-v4-pro",
      thinking: { type: "enabled", reasoning_effort: "high" }
    });

    expect(response.choices[0]?.message.reasoning_content).toBe(
      "private reasoning placeholder"
    );
  });

  it("FakeDeepSeekClient preserves raw tool call arguments", async () => {
    const toolCall: DeepSeekToolCall = {
      id: "call-1",
      type: "function",
      function: {
        name: "extract_table",
        arguments: '{"tableId":'
      }
    };
    const client = new FakeDeepSeekClient([
      createFakeToolCallResponse(toolCall)
    ]);

    const response = await client.createChatCompletion(basicRequest);

    expect(
      response.choices[0]?.message.tool_calls?.[0]?.function.arguments
    ).toBe('{"tableId":');
    expect(parseToolArgumentsSafely(toolCall.function.arguments).ok).toBe(
      false
    );
  });

  it("validateDeepSeekChatRequest rejects unsupported model", () => {
    expect(() =>
      validateDeepSeekChatRequest({
        ...basicRequest,
        model: "other-model" as DeepSeekChatRequest["model"]
      })
    ).toThrow("Unsupported model");
  });

  it("validateDeepSeekChatRequest rejects empty messages", () => {
    expect(() =>
      validateDeepSeekChatRequest({ ...basicRequest, messages: [] })
    ).toThrow("At least one message is required");
  });

  it("validateDeepSeekChatRequest allows assistant reasoning_content", () => {
    expect(() =>
      validateDeepSeekChatRequest({
        model: "deepseek-v4-pro",
        messages: [
          {
            role: "assistant",
            content: null,
            reasoning_content: "stored for later state-machine replay"
          }
        ]
      })
    ).not.toThrow();
  });

  it("validateDeepSeekChatRequest rejects invalid reasoning_effort", () => {
    expect(() =>
      validateDeepSeekChatRequest({
        ...basicRequest,
        thinking: {
          type: "enabled",
          reasoning_effort: "medium" as "high"
        }
      })
    ).toThrow("reasoning_effort must be high or max");
  });

  it("mapDeepSeekUsageToUsageSummary maps cache hit and miss tokens", () => {
    expect(
      mapDeepSeekUsageToUsageSummary(
        {
          prompt_tokens: 100,
          completion_tokens: 30,
          completion_tokens_details: { reasoning_tokens: 12 },
          prompt_cache_hit_tokens: 80,
          prompt_cache_miss_tokens: 20
        },
        { latencyMs: 44, model: "deepseek-v4-pro" }
      )
    ).toEqual({
      inputTokens: 100,
      outputTokens: 30,
      reasoningTokens: 12,
      cacheHitTokens: 80,
      cacheMissTokens: 20,
      retryCount: 0,
      latencyMs: 44,
      model: "deepseek-v4-pro"
    });
  });

  it("mapDeepSeekUsageToUsageSummary does not produce NaN", () => {
    const summary = mapDeepSeekUsageToUsageSummary(undefined);

    expect(Object.values(summary).some((value) => Number.isNaN(value))).toBe(
      false
    );
    expect(summary.inputTokens).toBe(0);
  });

  it("HttpDeepSeekClient uses injected fetchImpl and sends authorization", async () => {
    const apiKey = "test-api-key";
    let authorizationHeader: string | undefined;
    let requestBody = "";
    const client = new HttpDeepSeekClient({
      apiKey,
      fetchImpl: async (_input, init) => {
        authorizationHeader = (init?.headers as Record<string, string>)
          .authorization;
        requestBody = String(init?.body);
        return new Response(
          JSON.stringify({
            model: "deepseek-v4-flash",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "ok" },
                finish_reason: "stop"
              }
            ],
            usage: {
              prompt_tokens: 2,
              completion_tokens: 3
            }
          }),
          { status: 200 }
        );
      }
    });

    const response = await client.createChatCompletion({
      ...basicRequest,
      thinking: { type: "enabled", reasoning_effort: "high" },
      temperature: 0.9
    });

    expect(authorizationHeader).toBe(`Bearer ${apiKey}`);
    expect(requestBody).not.toContain("temperature");
    expect(response.usageSummary?.inputTokens).toBe(2);
  });

  it("HttpDeepSeekClient does not leak apiKey in HTTP errors", async () => {
    const apiKey = "test-api-key";
    const client = new HttpDeepSeekClient({
      apiKey,
      fetchImpl: async () => new Response("rate limit", { status: 429 })
    });

    await expect(
      client.createChatCompletion(basicRequest)
    ).rejects.toMatchObject({
      kind: "rate_limited",
      status: 429
    });
    await expect(client.createChatCompletion(basicRequest)).rejects.not.toThrow(
      apiKey
    );
  });

  it("HttpDeepSeekClient maps HTTP 503 to overloaded", async () => {
    const client = new HttpDeepSeekClient({
      apiKey: "test-api-key",
      fetchImpl: async () => new Response("busy", { status: 503 })
    });

    await expect(
      client.createChatCompletion(basicRequest)
    ).rejects.toMatchObject({
      kind: "overloaded",
      status: 503
    });
  });

  it("HttpDeepSeekClient maps timeout", async () => {
    const client = new HttpDeepSeekClient({
      apiKey: "test-api-key",
      timeoutMs: 1,
      fetchImpl: (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        })
    });

    await expect(
      client.createChatCompletion(basicRequest)
    ).rejects.toMatchObject({
      kind: "timeout"
    });
  });

  it("HttpDeepSeekClient maps invalid JSON response without leaking SyntaxError", async () => {
    const client = new HttpDeepSeekClient({
      apiKey: "test-api-key",
      fetchImpl: async () => new Response("not json", { status: 200 })
    });

    await expect(
      client.createChatCompletion(basicRequest)
    ).rejects.toMatchObject({
      kind: "invalid_response"
    });
    await expect(client.createChatCompletion(basicRequest)).rejects.not.toThrow(
      SyntaxError
    );
  });

  it("FakeDeepSeekClient can simulate an API error", async () => {
    const client = new FakeDeepSeekClient([
      new DeepSeekClientError("server_error", "Fake failure", { status: 500 })
    ]);

    await expect(
      client.createChatCompletion(basicRequest)
    ).rejects.toMatchObject({
      kind: "server_error",
      status: 500
    });
  });
});
