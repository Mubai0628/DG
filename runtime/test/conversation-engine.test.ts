import { describe, expect, it } from "vitest";

import {
  ConversationEngine,
  FakeDeepSeekClient,
  InMemoryEventStore,
  createDemoEvents,
  createFakeContentResponse,
  createFakeReasoningResponse,
  createFakeToolCallResponse,
  replay,
  sanitizeThinkingRequest,
  validateDeepSeekChatRequest,
  type ConversationEngineOptions,
  type DeepSeekToolCall
} from "../src/index.js";

function deterministicOptions(
  client: FakeDeepSeekClient,
  extra: Partial<ConversationEngineOptions> = {}
): ConversationEngineOptions {
  let id = 0;
  return {
    client,
    model: "deepseek-v4-pro",
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    idFactory: () => {
      id += 1;
      return `turn-${id}`;
    },
    ...extra
  };
}

function tableToolCall(
  argumentsText = '{"tableId":"visible"}'
): DeepSeekToolCall {
  return {
    id: "call-table",
    type: "function",
    function: {
      name: "extract_table",
      arguments: argumentsText
    }
  };
}

describe("ConversationEngine invariants", () => {
  it("sendUserMessage calls FakeDeepSeekClient, stores assistant content, usage, and events", async () => {
    const eventStore = new InMemoryEventStore({
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      idFactory: () => "event-1"
    });
    const client = new FakeDeepSeekClient([createFakeContentResponse("ok")]);
    const engine = new ConversationEngine(
      deterministicOptions(client, { eventStore })
    );

    const output = await engine.sendUserMessage("make csv");

    expect(client.calls).toHaveLength(1);
    expect(output.assistantTurn.content).toBe("ok");
    expect(engine.getState().turns.at(-1)?.usage?.inputTokens).toBe(1);
    expect(eventStore.listEvents().map((event) => event.type)).toEqual([
      "context.assembled",
      "llm.requested",
      "llm.completed"
    ]);
  });

  it("stores non-tool reasoning_content but does not include it in the next request", async () => {
    const client = new FakeDeepSeekClient([
      createFakeReasoningResponse("visible answer", "hidden reasoning")
    ]);
    const engine = new ConversationEngine(deterministicOptions(client));

    await engine.sendUserMessage("think", {
      thinking: { type: "enabled", reasoning_effort: "high" }
    });
    const assistantTurn = engine.getState().turns.at(-1);
    const assembled = engine.assembleRequest({
      thinking: { type: "enabled", reasoning_effort: "high" }
    });

    expect(assistantTurn?.content).toBe("visible answer");
    expect(engine.getReasoningStore().has("turn-2")).toBe(true);
    expect(JSON.stringify(assembled.request.messages)).not.toContain(
      "hidden reasoning"
    );
  });

  it("includes tool-call reasoning_content in the next request without appending it to content", async () => {
    const toolCall = tableToolCall();
    const client = new FakeDeepSeekClient([
      {
        ...createFakeToolCallResponse(toolCall),
        choices: [
          {
            index: 0,
            finish_reason: "tool_calls",
            message: {
              role: "assistant",
              content: "call tool",
              reasoning_content: "tool reasoning",
              tool_calls: [toolCall]
            }
          }
        ]
      }
    ]);
    const engine = new ConversationEngine(deterministicOptions(client));

    await engine.sendUserMessage("extract", {
      thinking: { type: "enabled", reasoning_effort: "high" }
    });
    const assembled = engine.assembleRequest({
      thinking: { type: "enabled", reasoning_effort: "high" }
    });
    const assistantMessage = assembled.request.messages.find(
      (message) => message.role === "assistant"
    );

    expect(assistantMessage).toMatchObject({
      role: "assistant",
      content: "call tool",
      reasoning_content: "tool reasoning"
    });
    expect(assistantMessage?.content).not.toContain("tool reasoning");
  });

  it("does not put reasoning_content into event payloads", async () => {
    const eventStore = new InMemoryEventStore({
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      idFactory: () => "event-1"
    });
    const client = new FakeDeepSeekClient([
      createFakeReasoningResponse("done", "sensitive reasoning")
    ]);
    const engine = new ConversationEngine(
      deterministicOptions(client, { eventStore })
    );

    await engine.sendUserMessage("think", {
      thinking: { type: "enabled", reasoning_effort: "high" }
    });

    expect(JSON.stringify(eventStore.listEvents())).not.toContain(
      "sensitive reasoning"
    );
  });

  it("returns pending tool calls and preserves raw argument strings", async () => {
    const client = new FakeDeepSeekClient([
      createFakeToolCallResponse(tableToolCall('{"tableId":'))
    ]);
    const engine = new ConversationEngine(deterministicOptions(client));

    const output = await engine.sendUserMessage("extract");

    expect(output.pendingToolCalls).toHaveLength(1);
    expect(output.pendingToolCalls[0]?.arguments).toBe('{"tableId":');
  });

  it("rejects a normal user message while tool calls are pending", async () => {
    const client = new FakeDeepSeekClient([
      createFakeToolCallResponse(tableToolCall())
    ]);
    const engine = new ConversationEngine(deterministicOptions(client));

    await engine.sendUserMessage("extract");

    expect(() => engine.addUserMessage("new task")).toThrow(
      "Cannot add user message while tool calls are pending"
    );
    await expect(engine.sendUserMessage("new task")).rejects.toThrow(
      "Cannot add user message while tool calls are pending"
    );
  });

  it("validates tool result ids and rejects duplicate results", async () => {
    const client = new FakeDeepSeekClient([
      createFakeToolCallResponse(tableToolCall())
    ]);
    const engine = new ConversationEngine(deterministicOptions(client));

    await engine.sendUserMessage("extract");

    expect(() =>
      engine.submitToolResult({ toolCallId: "missing", content: "[]" })
    ).toThrow("Unknown pending tool_call_id");

    const toolTurn = engine.submitToolResult({
      toolCallId: "call-table",
      content: "a,b"
    });

    expect(toolTurn.toolCallId).toBe("call-table");
    expect(() =>
      engine.submitToolResult({ toolCallId: "call-table", content: "again" })
    ).toThrow("Tool result already submitted");
  });

  it("continues after all tool results are submitted", async () => {
    const client = new FakeDeepSeekClient([
      createFakeToolCallResponse(tableToolCall()),
      createFakeContentResponse("verified")
    ]);
    const engine = new ConversationEngine(deterministicOptions(client));

    await engine.sendUserMessage("extract");
    engine.submitToolResult({ toolCallId: "call-table", content: "a,b" });
    const output = await engine.continueAfterToolResults();

    expect(output.assistantTurn.content).toBe("verified");
    expect(client.calls).toHaveLength(2);
    expect(engine.getState().turns.some((turn) => turn.role === "tool")).toBe(
      true
    );
  });

  it("rejects continueAfterToolResults while tool results are incomplete", async () => {
    const client = new FakeDeepSeekClient([
      createFakeToolCallResponse(tableToolCall())
    ]);
    const engine = new ConversationEngine(deterministicOptions(client));

    await engine.sendUserMessage("extract");

    await expect(engine.continueAfterToolResults()).rejects.toThrow(
      "Cannot continue while pending tool calls are incomplete"
    );
  });

  it("sanitizes sampling parameters when thinking is enabled", () => {
    const request = sanitizeThinkingRequest({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: "think" }],
      thinking: { type: "enabled", reasoning_effort: "high" },
      temperature: 0.5,
      top_p: 0.9
    });

    expect(request.temperature).toBeUndefined();
    expect(request.top_p).toBeUndefined();
  });

  it("emits cache.boundary.changed when thinking mode changes", async () => {
    const eventStore = new InMemoryEventStore();
    const client = new FakeDeepSeekClient([
      createFakeContentResponse("one"),
      createFakeContentResponse("two")
    ]);
    const engine = new ConversationEngine(
      deterministicOptions(client, { eventStore })
    );

    await engine.sendUserMessage("one", { thinking: { type: "disabled" } });
    await engine.sendUserMessage("two", {
      thinking: { type: "enabled", reasoning_effort: "high" }
    });

    expect(
      eventStore
        .listEvents({ type: "cache.boundary.changed" })
        .map((event) => event.payload)
    ).toContainEqual({ cacheBoundaryReason: "thinking_changed" });
  });

  it("emits cache.boundary.changed when tools change", async () => {
    const eventStore = new InMemoryEventStore();
    const client = new FakeDeepSeekClient([
      createFakeContentResponse("one"),
      createFakeContentResponse("two")
    ]);
    const engine = new ConversationEngine(
      deterministicOptions(client, { eventStore })
    );

    await engine.sendUserMessage("one");
    await engine.sendUserMessage("two", {
      tools: [{ type: "function", function: { name: "extract_table" } }]
    });

    expect(
      eventStore
        .listEvents({ type: "cache.boundary.changed" })
        .map((event) => event.payload)
    ).toContainEqual({ cacheBoundaryReason: "tools_changed" });
  });

  it("emits cache.boundary.changed when model changes", async () => {
    const eventStore = new InMemoryEventStore();
    const client = new FakeDeepSeekClient([
      createFakeContentResponse("one"),
      createFakeContentResponse("two")
    ]);
    const engine = new ConversationEngine(
      deterministicOptions(client, { eventStore, model: "deepseek-v4-flash" })
    );

    await engine.sendUserMessage("one");
    await engine.sendUserMessage("two", { model: "deepseek-v4-pro" });

    expect(
      eventStore
        .listEvents({ type: "cache.boundary.changed" })
        .map((event) => event.payload)
    ).toContainEqual({ cacheBoundaryReason: "model_changed" });
  });

  it("cache boundary events do not include prompt content", async () => {
    const eventStore = new InMemoryEventStore();
    const client = new FakeDeepSeekClient([
      createFakeContentResponse("one"),
      createFakeContentResponse("two")
    ]);
    const engine = new ConversationEngine(
      deterministicOptions(client, { eventStore })
    );

    await engine.sendUserMessage("user secret text");
    await engine.sendUserMessage("second text", {
      thinking: { type: "enabled", reasoning_effort: "high" }
    });

    expect(
      JSON.stringify(eventStore.listEvents({ type: "cache.boundary.changed" }))
    ).not.toContain("user secret text");
  });

  it("assembleRequest output validates with DeepSeek request validation", async () => {
    const client = new FakeDeepSeekClient([createFakeContentResponse("ok")]);
    const engine = new ConversationEngine(deterministicOptions(client));

    engine.addUserMessage("hello");
    const assembled = engine.assembleRequest();

    expect(() => validateDeepSeekChatRequest(assembled.request)).not.toThrow();
  });

  it("uses deterministic ids and timestamps when injected", async () => {
    const client = new FakeDeepSeekClient([createFakeContentResponse("ok")]);
    const engine = new ConversationEngine(deterministicOptions(client));

    await engine.sendUserMessage("hello");

    expect(engine.getState().turns.map((turn) => turn.id)).toEqual([
      "turn-1",
      "turn-2"
    ]);
    expect(engine.getState().turns[0]?.createdAt).toBe(
      "2026-01-01T00:00:00.000Z"
    );
  });

  it("does not break replay demo", () => {
    expect(replay(createDemoEvents()).tasks["demo-task"]).toBe("completed");
  });
});
