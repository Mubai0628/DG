import { constants } from "node:fs";
import { access, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  DraftWriter,
  InMemoryEventStore,
  ToolBroker,
  createDemoEvents,
  createToolCallRequestFromDeepSeekToolCall,
  decideToolPermission,
  replay,
  type DeepSeekToolCall,
  type EventStore,
  type ToolCallRequest,
  type ToolDefinitionRuntime
} from "../src/index.js";

const tempRoots: string[] = [];

async function createTempWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "dw-tool-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true }))
  );
});

function createEventStore(): InMemoryEventStore {
  let id = 0;
  return new InMemoryEventStore({
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    idFactory: () => {
      id += 1;
      return `event-${id}`;
    }
  });
}

function createBroker(options: {
  root: string;
  eventStore?: EventStore;
  requireApproval?: boolean;
  deny?: boolean;
}): ToolBroker {
  const draftWriterOptions = {
    policy: { rootPath: options.root },
    ...(options.eventStore !== undefined
      ? { eventStore: options.eventStore }
      : {})
  };
  return new ToolBroker({
    draftWriter: new DraftWriter(draftWriterOptions),
    ...(options.eventStore !== undefined
      ? { eventStore: options.eventStore }
      : {}),
    permissionPolicy: {
      ...(options.requireApproval
        ? { requireApprovalFor: ["fs.write_draft"] }
        : {}),
      ...(options.deny ? { denyTools: ["fs.write_draft"] } : {})
    },
    clock: () => new Date("2026-01-01T00:00:00.000Z")
  });
}

function writeDraftCall(
  args: Record<string, unknown>,
  extra: Partial<ToolCallRequest> = {}
): ToolCallRequest {
  return {
    id: "call-1",
    name: "fs.write_draft",
    rawArguments: JSON.stringify(args),
    source: { kind: "test", toolCallId: "call-1" },
    ...extra
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe("ToolRegistry and unknown tools", () => {
  it("registers only fs.write_draft by default and rejects non-whitelisted tools", async () => {
    const root = await createTempWorkspace();
    const broker = createBroker({ root });

    expect(broker.listTools().map((tool) => tool.name)).toEqual([
      "fs.write_draft"
    ]);

    for (const name of [
      "browser.read_dom",
      "fs.write",
      "shell.run",
      "mcp.call",
      "desktop.click"
    ]) {
      const result = await broker.executeToolCall({
        id: `call-${name}`,
        name,
        rawArguments: "{}",
        source: { kind: "test" }
      });
      expect(result.status).toBe("rejected");
      expect(result.errorKind).toBe("unknown_tool");
    }
  });

  it("creates requests from DeepSeek tool calls without parsing or rewriting raw arguments", () => {
    const toolCall: DeepSeekToolCall = {
      id: "tool-call-1",
      type: "function",
      function: {
        name: "fs.write_draft",
        arguments: '{"filename":'
      }
    };

    const request = createToolCallRequestFromDeepSeekToolCall(toolCall, {
      source: {
        kind: "llm_tool_call",
        model: "deepseek-v4-pro",
        turnId: "turn-1"
      }
    });

    expect(request.name).toBe("fs.write_draft");
    expect(request.rawArguments).toBe('{"filename":');
    expect(request.source?.toolCallId).toBe("tool-call-1");
  });
});

describe("ToolBroker argument parsing", () => {
  it("rejects invalid JSON and never writes rawArguments to events or errors", async () => {
    const root = await createTempWorkspace();
    const eventStore = createEventStore();
    const broker = createBroker({ root, eventStore });
    const rawArguments =
      '{"filename":"table.csv","content":"name,value\\nalpha,1\\n"';

    const result = await broker.executeToolCall({
      id: "call-invalid",
      name: "fs.write_draft",
      rawArguments
    });
    const serializedEvents = JSON.stringify(eventStore.listEvents());

    expect(result.status).toBe("rejected");
    expect(result.errorKind).toBe("invalid_arguments_json");
    expect(result.errorMessage).not.toContain(rawArguments);
    expect(serializedEvents).not.toContain(rawArguments);
    expect(serializedEvents).not.toContain("alpha,1");
  });

  it("rejects non-object JSON arguments", async () => {
    const root = await createTempWorkspace();
    const broker = createBroker({ root });

    await expect(
      broker.executeToolCall({
        id: "array",
        name: "fs.write_draft",
        rawArguments: "[]"
      })
    ).resolves.toMatchObject({
      status: "rejected",
      errorKind: "invalid_arguments_shape"
    });
    await expect(
      broker.executeToolCall({
        id: "string",
        name: "fs.write_draft",
        rawArguments: '"hello"'
      })
    ).resolves.toMatchObject({
      status: "rejected",
      errorKind: "invalid_arguments_shape"
    });
  });

  it("rejects missing required fields and unsupported contentType", async () => {
    const root = await createTempWorkspace();
    const broker = createBroker({ root });

    await expect(
      broker.executeToolCall(
        writeDraftCall({ content: "a\n1\n", contentType: "text/csv" })
      )
    ).resolves.toMatchObject({
      status: "rejected",
      errorKind: "invalid_arguments_shape"
    });
    await expect(
      broker.executeToolCall(
        writeDraftCall({ filename: "table.csv", contentType: "text/csv" })
      )
    ).resolves.toMatchObject({
      status: "rejected",
      errorKind: "invalid_arguments_shape"
    });
    await expect(
      broker.executeToolCall(
        writeDraftCall({
          filename: "table.csv",
          content: "{}",
          contentType: "application/json"
        })
      )
    ).resolves.toMatchObject({
      status: "rejected",
      errorKind: "unsupported_content_type"
    });
  });
});

describe("ToolBroker permission policy", () => {
  it("auto-approves fs.write_draft by default and writes tool.approved", async () => {
    const root = await createTempWorkspace();
    const eventStore = createEventStore();
    const broker = createBroker({ root, eventStore });

    const result = await broker.executeToolCall(
      writeDraftCall({
        filename: "table.csv",
        content: "name,value\nalpha,1\n",
        contentType: "text/csv"
      })
    );

    expect(result.status).toBe("executed");
    expect(result.approved).toBe(true);
    expect(eventStore.listEvents().map((event) => event.type)).toEqual([
      "tool.proposed",
      "tool.approved",
      "fs.draft_written",
      "tool.executed"
    ]);
  });

  it("returns approval_required without writing files when configured", async () => {
    const root = await createTempWorkspace();
    const broker = createBroker({ root, requireApproval: true });

    const result = await broker.executeToolCall(
      writeDraftCall({
        filename: "table.csv",
        content: "name,value\nalpha,1\n",
        contentType: "text/csv"
      })
    );

    expect(result.status).toBe("approval_required");
    expect(result.errorKind).toBe("approval_required");
    expect(
      await fileExists(path.join(await realpath(root), "drafts", "table.csv"))
    ).toBe(false);
  });

  it("rejects denied tools without writing files", async () => {
    const root = await createTempWorkspace();
    const broker = createBroker({ root, deny: true });

    const result = await broker.executeToolCall(
      writeDraftCall({
        filename: "table.csv",
        content: "name,value\nalpha,1\n",
        contentType: "text/csv"
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.errorKind).toBe("permission_denied");
    expect(
      await fileExists(path.join(await realpath(root), "drafts", "table.csv"))
    ).toBe(false);
  });

  it("requires approval for A3+ risk by default", () => {
    const definition: ToolDefinitionRuntime = {
      name: "fake.scoped_write",
      riskLevel: "A3_scoped_write",
      validateArguments: () => ({
        ok: false,
        errorKind: "invalid_arguments_shape",
        message: "not used"
      }),
      execute: async () => ({})
    };

    expect(decideToolPermission(definition)).toMatchObject({
      status: "approval_required",
      errorKind: "approval_required"
    });
  });
});

describe("ToolBroker fs.write_draft execution", () => {
  it("writes through DraftWriter and returns safe result summaries", async () => {
    const root = await createTempWorkspace();
    const eventStore = createEventStore();
    const broker = createBroker({ root, eventStore });

    const result = await broker.executeToolCall(
      writeDraftCall({
        filename: "table.csv",
        content: "name,value\nalpha,1\n",
        contentType: "text/csv",
        source: {
          kind: "browser.dom",
          url: "https://example.com/table?token=secret"
        },
        metadata: { rowCount: 1, columnCount: 2 }
      })
    );
    const serialized = JSON.stringify({
      result,
      events: eventStore.listEvents()
    });

    expect(result.status).toBe("executed");
    expect(result.resultSummary).toMatchObject({
      relativePath: "drafts/table.csv",
      contentType: "text/csv",
      overwritten: false
    });
    expect(result.resultSummary).not.toHaveProperty("content");
    expect(
      await fileExists(path.join(await realpath(root), "drafts", "table.csv"))
    ).toBe(true);
    expect(serialized).not.toContain("alpha,1");
    expect(serialized).not.toContain("rawArguments");
    expect(serialized).not.toContain("token=secret");
    expect(serialized).toContain("example.com");
  });

  it("fails safely when DraftWriter rejects path escape and existing files", async () => {
    const root = await createTempWorkspace();
    const broker = createBroker({ root });

    await expect(
      broker.executeToolCall(
        writeDraftCall({
          filename: "../evil.csv",
          content: "a\n1\n",
          contentType: "text/csv"
        })
      )
    ).resolves.toMatchObject({
      status: "failed",
      errorKind: "parent_traversal_rejected"
    });

    await broker.executeToolCall(
      writeDraftCall({
        filename: "table.csv",
        content: "a\n1\n",
        contentType: "text/csv"
      })
    );
    await expect(
      broker.executeToolCall(
        writeDraftCall({
          filename: "table.csv",
          content: "a\n2\n",
          contentType: "text/csv"
        })
      )
    ).resolves.toMatchObject({
      status: "failed",
      errorKind: "file_exists"
    });
  });

  it("rejects secret-like content without leaking fake secrets to events or errors", async () => {
    const root = await createTempWorkspace();
    const eventStore = createEventStore();
    const broker = createBroker({ root, eventStore });
    const bearer = "Bear" + "er abcdefghijklmnop";
    const key = "s" + "k-1234567890abcdef";

    const result = await broker.executeToolCall(
      writeDraftCall({
        filename: "table.csv",
        content: `name,value\nbearer,${bearer}\nkey,${key}\n`,
        contentType: "text/csv"
      })
    );
    const serialized = JSON.stringify({
      result,
      events: eventStore.listEvents()
    });

    expect(result.status).toBe("failed");
    expect(result.errorKind).toBe("secret_like_content_rejected");
    expect(result.errorMessage).not.toContain("abcdefghijklmnop");
    expect(serialized).not.toContain("abcdefghijklmnop");
    expect(serialized).not.toContain("1234567890abcdef");
    expect(eventStore.listEvents({ type: "fs.draft_written" })).toHaveLength(0);
  });

  it("keeps unsafe payload fields out of tool events and does not break replay", async () => {
    const root = await createTempWorkspace();
    const eventStore = createEventStore();
    const rawPromptKey = "raw" + "Prompt";
    const rawDomKey = "raw" + "Dom";
    const broker = createBroker({ root, eventStore });

    await broker.executeToolCall(
      writeDraftCall({
        filename: "table.csv",
        content: "name,value\nalpha,1\n",
        contentType: "text/csv",
        source: {
          kind: "browser.dom",
          url: "https://example.com/table?secret=query",
          [rawDomKey]: "<table>alpha</table>"
        },
        metadata: {
          rowCount: 1,
          columnCount: 2,
          [rawPromptKey]: "extract this"
        }
      })
    );
    const toolEvents = eventStore
      .listEvents()
      .filter((event) => event.type.startsWith("tool."));
    const serialized = JSON.stringify(toolEvents);

    expect(serialized).not.toContain("alpha,1");
    expect(serialized).not.toContain("rawArguments");
    expect(serialized).not.toContain("<table>");
    expect(serialized).not.toContain("extract this");
    expect(serialized).not.toContain("secret=query");
    expect(replay(createDemoEvents()).draftCount).toBe(1);
  });
});
