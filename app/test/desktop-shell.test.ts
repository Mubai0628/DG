import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  invokeAllowedCommand,
  isAllowedDesktopCommand,
  runDesktopWebTableToCsvFlow,
  type TauriInvoke
} from "../src/desktop-flow.js";
import {
  buildResultPanelModel,
  parsePayloadJson,
  safeErrorMessage,
  validateDesktopFlowInput,
  type DesktopFlowResult
} from "../src/safety.js";
import {
  runWebTableToCsvFlow,
  type BrowserDomPayload
} from "@deepseek-workbench/runtime";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const appRoot = path.join(repoRoot, "app");
const fixturePath = path.join(
  repoRoot,
  "runtime",
  "test",
  "fixtures",
  "web-table-sample-payload.json"
);
const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true }))
  );
});

async function createTempWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "dw-app-test-"));
  tempRoots.push(root);
  return root;
}

async function readFixture(): Promise<BrowserDomPayload> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as BrowserDomPayload;
}

function fixedResult(workspaceRoot: string): DesktopFlowResult {
  return {
    draft: {
      relativePath: "drafts/table.csv",
      absolutePath: path.join(workspaceRoot, "drafts", "table.csv"),
      bytes: 42,
      sha256: "a".repeat(64),
      contentType: "text/csv"
    },
    extraction: {
      sourceHost: "example.com",
      sourcePathWithoutQuery: "/reports/table",
      tableId: "orders",
      rowCount: 4,
      columnCount: 3,
      warningCount: 1,
      injectionRiskCount: 1,
      formulaEscapedCount: 1
    },
    events: {
      eventCount: 9,
      eventLogPath: path.join(
        workspaceRoot,
        ".deepseek-workbench",
        "events.jsonl"
      )
    },
    replaySummary: {
      eventCount: 9,
      draftCount: 1,
      tasks: {
        "task-1": "completed"
      }
    }
  };
}

describe("desktop shell safety helpers", () => {
  it("validates payload JSON before invoking the flow", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();

    const validation = validateDesktopFlowInput({
      workspaceRoot,
      payloadText: JSON.stringify(payload),
      filename: "table.csv"
    });

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.request.workspaceRoot).toBe(workspaceRoot);
      expect(JSON.parse(validation.request.payloadJson)).toMatchObject({
        schemaVersion: payload.schemaVersion
      });
    }
  });

  it("returns a safe validation error for invalid payload text", async () => {
    const secret = "sk-test1234567890abcdef";
    const parsed = parsePayloadJson(`{"leaked":"${secret}"`);
    const message = safeErrorMessage(new Error(`bad payload ${secret}`));

    expect(parsed.ok).toBe(false);
    expect(message).not.toContain(secret);
  });

  it("requires a workspace path", () => {
    const validation = validateDesktopFlowInput({
      workspaceRoot: " ",
      payloadText: "{}"
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errorMessage).toContain("Workspace root is required");
    }
  });

  it("lets the existing flow reject traversal filenames without writing a draft", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();

    await expect(
      runWebTableToCsvFlow({
        workspaceRoot,
        payload,
        filename: "../evil.csv"
      })
    ).rejects.toThrow();
    await expect(
      access(path.join(workspaceRoot, "drafts", "evil.csv"))
    ).rejects.toThrow();
  });

  it("builds a result panel model without CSV content", async () => {
    const workspaceRoot = await createTempWorkspace();
    const model = buildResultPanelModel(fixedResult(workspaceRoot));

    expect(model.draftRelativePath).toBe("drafts/table.csv");
    expect(JSON.stringify(model)).not.toContain("name,amount");
    expect(JSON.stringify(model)).not.toContain("=SUM(A1:A2)");
  });
});

describe("desktop command wrapper", () => {
  it("refuses unknown command names", async () => {
    await expect(invokeAllowedCommand("unknown_command", {})).rejects.toThrow(
      "not allowed"
    );
    expect(isAllowedDesktopCommand("run_web_table_to_csv_flow")).toBe(true);
  });

  it("invokes the fixed flow command without exposing env key values", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();
    const secret = "sk-test1234567890abcdef";
    const keyName = ["DEEPSEEK", "API", "KEY"].join("_");
    process.env[keyName] = secret;

    const calls: Array<{ command: string; args?: Record<string, unknown> }> =
      [];
    const invoke: TauriInvoke = async (command, args) => {
      calls.push(args === undefined ? { command } : { command, args });
      return fixedResult(workspaceRoot) as never;
    };

    const result = await runDesktopWebTableToCsvFlow(
      {
        workspaceRoot,
        payloadText: JSON.stringify(payload),
        filename: "table.csv"
      },
      invoke
    );

    expect(result.draft.relativePath).toBe("drafts/table.csv");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe("run_web_table_to_csv_flow");
    expect(JSON.stringify(calls)).not.toContain(secret);

    delete process.env[keyName];
  });
});

describe("desktop flow integration", () => {
  it("runs the runtime flow for a fixture and writes under workspace/drafts", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();

    const result = await runWebTableToCsvFlow({
      workspaceRoot,
      payload,
      filename: "desktop-table.csv"
    });

    expect(result.draft.relativePath).toBe("drafts/desktop-table.csv");
    expect(result.extraction.rowCount).toBeGreaterThan(0);
    expect(result.replaySummary.draftCount).toBe(1);
    await expect(access(result.draft.absolutePath)).resolves.toBeUndefined();
  });
});

describe("desktop source boundaries", () => {
  it("does not include native bridge or arbitrary shell plugin references in app source", async () => {
    const sourceFiles = [
      "src/App.tsx",
      "src/desktop-flow.ts",
      "src/safety.ts",
      "src-tauri/src/main.rs",
      "src-tauri/src/commands.rs",
      "src-tauri/tauri.conf.json",
      "src-tauri/capabilities/default.json"
    ];
    const combined = (
      await Promise.all(
        sourceFiles.map((file) => readFile(path.join(appRoot, file), "utf8"))
      )
    ).join("\n");

    expect(combined).not.toContain("nativeMessaging");
    expect(combined).not.toContain("@tauri-apps/plugin-shell");
    expect(combined).not.toContain("Command::new(command");
    expect(combined).toContain('join("run-flow.mjs")');
  });
});
