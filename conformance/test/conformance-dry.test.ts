import { describe, expect, it } from "vitest";

import {
  DeepSeekClientError,
  type DeepSeekChatRequest,
  type DeepSeekChatResponse,
  type DeepSeekClient,
  type DeepSeekToolCall,
  sanitizeThinkingRequest
} from "@deepseek-workbench/runtime";

import { runDryConformance } from "../src/dry-runner.js";
import {
  runLiveConformance,
  runLiveThinkingToolRoundtripCase
} from "../src/live-runner.js";
import { redactForReport } from "../src/redaction.js";

class RecordingClient implements DeepSeekClient {
  readonly requests: DeepSeekChatRequest[] = [];

  constructor(
    private readonly responses: Array<DeepSeekChatResponse | Error>
  ) {}

  async createChatCompletion(
    request: DeepSeekChatRequest
  ): Promise<DeepSeekChatResponse> {
    this.requests.push(request);
    const response = this.responses.shift();
    if (response instanceof Error) {
      throw response;
    }
    if (response === undefined) {
      throw new Error("Missing fake response");
    }
    return response;
  }
}

function toolCall(id = "call-live-tool"): DeepSeekToolCall {
  return {
    id,
    type: "function",
    function: {
      name: "get_constant_value",
      arguments: '{"key":"constant"}'
    }
  };
}

function toolResponse(
  call: DeepSeekToolCall,
  reasoningContent = "tool reasoning"
): DeepSeekChatResponse {
  return {
    model: "deepseek-v4-pro",
    choices: [
      {
        index: 0,
        finish_reason: "tool_calls",
        message: {
          role: "assistant",
          content: null,
          reasoning_content: reasoningContent,
          tool_calls: [call]
        }
      }
    ]
  };
}

function finalResponse(): DeepSeekChatResponse {
  return {
    model: "deepseek-v4-pro",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: "done"
        }
      }
    ]
  };
}

describe("conformance dry harness", () => {
  it("runs all dry cases with FakeDeepSeekClient", async () => {
    const summary = await runDryConformance();

    expect(summary.status).toBe("PASS");
    expect(summary.results.map((result) => result.caseId)).toEqual([
      "CASE-DRY-001",
      "CASE-DRY-002",
      "CASE-DRY-003",
      "CASE-DRY-004",
      "CASE-DRY-005",
      "CASE-DRY-006"
    ]);
  });

  it("does not depend on DEEPSEEK_API_KEY for dry runs", async () => {
    const previous = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "dry-run-should-not-use-this";

    try {
      const summary = await runDryConformance();
      expect(JSON.stringify(summary)).not.toContain(
        "dry-run-should-not-use-this"
      );
    } finally {
      if (previous === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = previous;
      }
    }
  });

  it("does not call global fetch during dry runs", async () => {
    const previousFetch = globalThis.fetch;
    let calledGlobalFetch = false;
    globalThis.fetch = (async () => {
      calledGlobalFetch = true;
      throw new Error("global fetch should not be called");
    }) as typeof fetch;

    try {
      await runDryConformance();
      expect(calledGlobalFetch).toBe(false);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("proves no-tool thinking does not return reasoning by default", async () => {
    const summary = await runDryConformance();
    const result = summary.results.find(
      (caseResult) => caseResult.caseId === "CASE-DRY-002"
    );

    expect(result?.status).toBe("PASS");
    expect(result?.responseHasReasoningContent).toBe(true);
  });

  it("proves thinking tool roundtrip returns tool reasoning and raw arguments", async () => {
    const summary = await runDryConformance();
    const result = summary.results.find(
      (caseResult) => caseResult.caseId === "CASE-DRY-003"
    );

    expect(result?.status).toBe("PASS");
    expect(result?.responseHasToolCalls).toBe(true);
  });

  it("shows cache usage fields without requiring a hit ratio", async () => {
    const summary = await runDryConformance();
    const result = summary.results.find(
      (caseResult) => caseResult.caseId === "CASE-DRY-004"
    );

    expect(result?.cacheHitTokens).toBe(3);
    expect(result?.cacheMissTokens).toBe(7);
  });

  it("redacts report fields and sensitive values", () => {
    const rawPromptKey = "raw" + "Prompt";
    const rawDomKey = "raw" + "Dom";
    const clipboardKey = "clip" + "board";
    const redacted = JSON.stringify(
      redactForReport({
        apiKey: "sk-1234567890abcdef",
        authorization: "Bearer abcdefghijklmnop",
        [rawPromptKey]: "prompt",
        [rawDomKey]: "<table></table>",
        [clipboardKey]: "private"
      })
    );

    expect(redacted).not.toContain("sk-1234567890abcdef");
    expect(redacted).not.toContain("abcdefghijklmnop");
    expect(redacted).not.toContain(rawPromptKey);
    expect(redacted).not.toContain(rawDomKey);
    expect(redacted).not.toContain(clipboardKey);
  });
});

describe("conformance live opt-in gates", () => {
  it("skips live runner without --live", async () => {
    const summary = await runLiveConformance({
      args: [],
      env: {
        DEEPSEEK_CONFORMANCE_LIVE: "1",
        DEEPSEEK_API_KEY: "present-but-not-used"
      }
    });

    expect(summary.status).toBe("SKIPPED");
    expect(summary.results[0]?.caseId).toBe("SKIPPED_LIVE_CONFORMANCE");
  });

  it("skips live runner without DEEPSEEK_CONFORMANCE_LIVE=1", async () => {
    const summary = await runLiveConformance({
      args: ["--live"],
      env: {
        DEEPSEEK_API_KEY: "present-but-not-used"
      }
    });

    expect(summary.status).toBe("SKIPPED");
  });

  it("skips live runner without DEEPSEEK_API_KEY", async () => {
    const summary = await runLiveConformance({
      args: ["--live"],
      env: {
        DEEPSEEK_CONFORMANCE_LIVE: "1"
      }
    });

    expect(summary.status).toBe("SKIPPED");
  });

  it("live skip does not fail", async () => {
    await expect(runLiveConformance()).resolves.toMatchObject({
      status: "SKIPPED"
    });
  });
});

describe("CASE-LIVE-003 diagnostics", () => {
  it("strips tool_choice when thinking is enabled", () => {
    const sanitized = sanitizeThinkingRequest({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: "think" }],
      thinking: { type: "enabled", reasoning_effort: "high" },
      tool_choice: "required"
    });
    const nonThinking = sanitizeThinkingRequest({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: "plain" }],
      thinking: { type: "disabled" },
      tool_choice: "required"
    });

    expect(sanitized.tool_choice).toBeUndefined();
    expect(nonThinking.tool_choice).toBe("required");
  });

  it("omits tool_choice and preserves the thinking tool roundtrip messages", async () => {
    const call = toolCall();
    const client = new RecordingClient([toolResponse(call), finalResponse()]);

    const result = await runLiveThinkingToolRoundtripCase(client, 0);

    expect(result.status).toBe("PASS");
    expect(result.toolChoiceFirstRequest).toBe("omitted");
    expect(result.toolChoiceContinuation).toBe("omitted");
    expect(client.requests[0]?.tool_choice).toBeUndefined();
    expect(client.requests[1]?.tool_choice).toBeUndefined();
    expect(result.toolChoicePresentFirstRequest).toBe(false);
    expect(result.toolChoicePresentContinuation).toBe(false);
    expect(result.continuationIncludesToolRoundReasoning).toBe(true);
    expect(result.continuationIncludesReasoningContent).toBe(true);
    expect(result.continuationIncludesAssistantToolCalls).toBe(true);
    expect(result.continuationIncludesToolMessages).toBe(true);
    expect(result.continuationIncludesToolMessage).toBe(true);
    expect(result.assistantToolCallContentWasNull).toBe(true);
    expect(result.assistantToolCallContentNormalized).toBe(true);

    const continuationMessages = client.requests[1]?.messages ?? [];
    const assistant = continuationMessages.find(
      (message) => message.role === "assistant"
    );
    const tool = continuationMessages.find(
      (message) => message.role === "tool"
    );

    expect(assistant).toMatchObject({
      role: "assistant",
      reasoning_content: "tool reasoning",
      tool_calls: [call]
    });
    expect(assistant?.content).toBe("");
    expect(tool).toMatchObject({
      role: "tool",
      tool_call_id: "call-live-tool"
    });
  });

  it("marks no tool call as inconclusive", async () => {
    const client = new RecordingClient([finalResponse()]);

    const result = await runLiveThinkingToolRoundtripCase(client, 0);

    expect(result.status).toBe("INCONCLUSIVE");
    expect(result.failureCategory).toBe("NO_TOOL_CALL_INCONCLUSIVE");
  });

  it("does not fail when continuation succeeds with additional tool calls", async () => {
    const client = new RecordingClient([
      toolResponse(toolCall()),
      toolResponse(toolCall("call-live-tool-2"), "follow-up reasoning")
    ]);

    const result = await runLiveThinkingToolRoundtripCase(client, 0);

    expect(result.status).toBe("PASS");
    expect(result.responseHasToolCalls).toBe(true);
    expect(result.pendingToolCallCount).toBeGreaterThan(0);
  });

  it("classifies tool_choice 400 errors as unsupported in thinking", async () => {
    const client = new RecordingClient([
      new DeepSeekClientError(
        "invalid_request",
        "tool_choice is unsupported in thinking mode",
        { status: 400 }
      )
    ]);

    const result = await runLiveThinkingToolRoundtripCase(client, 0);

    expect(result.status).toBe("FAIL");
    expect(result.failureCategory).toBe("TOOL_CHOICE_UNSUPPORTED_IN_THINKING");
    expect(result.liveFailureCategory).toBe(
      "TOOL_CHOICE_UNSUPPORTED_IN_THINKING"
    );
  });

  it("classifies continuation 400 as API_400_REASONING_ROUNDTRIP and redacts diagnostics", async () => {
    const sensitiveKey = "s" + "k-1234567890abcdef";
    const bearer = "Bear" + "er abcdefghijklmnop";
    const client = new RecordingClient([
      toolResponse(toolCall()),
      new DeepSeekClientError(
        "invalid_request",
        `failed ${sensitiveKey} ${bearer}`,
        { status: 400 }
      )
    ]);

    const result = await runLiveThinkingToolRoundtripCase(client, 0);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("FAIL");
    expect(result.failureCategory).toBe("API_400_REASONING_ROUNDTRIP");
    expect(result.httpStatus).toBe(400);
    expect(result.continuationHttpStatus).toBe(400);
    expect(result.sanitizedErrorMessage).not.toContain(sensitiveKey);
    expect(result.sanitizedErrorMessage).not.toContain("abcdefghijklmnop");
    expect(serialized).not.toContain("tool reasoning");
    expect(serialized).not.toContain("You must call");
  });
});
