import { describe, expect, it } from "vitest";

import type { TauriInvoke } from "../src/desktop-flow.js";
import { createTauriChatClient } from "../src/shell/chat/engine-client.js";

const fixedChatResult = {
  ok: true,
  status: "completed",
  model: "deepseek-v4-flash",
  content: "Hello from the lane",
  toolCalls: undefined,
  usage: { promptTokens: 3, completionTokens: 5, totalTokens: 8 },
  reasoningIncluded: false,
  summaryOnly: true,
  safeMessage: "ok"
};

describe("createTauriChatClient", () => {
  it("relays chat requests through the fixed Tauri command and maps the response", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("chat_deepseek_completion");
      expect(args).toMatchObject({
        request: {
          model: "deepseek-v4-flash",
          messages: [
            { role: "system", content: "sys" },
            { role: "user", content: "hi" },
            { role: "tool", content: "result", toolCallId: "call-1" }
          ]
        }
      });
      return fixedChatResult as never;
    };
    const client = createTauriChatClient(invoke);

    const response = await client.createChatCompletion({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "hi" },
        { role: "tool", tool_call_id: "call-1", content: "result" }
      ]
    });

    expect(response.choices[0]?.message.role).toBe("assistant");
    expect(response.choices[0]?.message.content).toBe("Hello from the lane");
    expect(response.usage?.total_tokens).toBe(8);
  });

  it("maps assistant tool-call messages with nullable content", async () => {
    const invoke: TauriInvoke = async (_command, args) => {
      const request = (args as { request: { messages: unknown[] } }).request;
      expect(request.messages[1]).toMatchObject({
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "call-9",
            type: "function",
            function: { name: "workspace_file_read", arguments: "{}" }
          }
        ]
      });
      return fixedChatResult as never;
    };
    const client = createTauriChatClient(invoke);

    await client.createChatCompletion({
      model: "deepseek-v4-flash",
      messages: [
        { role: "user", content: "read it" },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call-9",
              type: "function",
              function: { name: "workspace_file_read", arguments: "{}" }
            }
          ]
        }
      ]
    });
  });
});
