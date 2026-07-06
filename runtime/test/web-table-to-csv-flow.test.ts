import { constants } from "node:fs";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  JsonlEventStore,
  replay,
  runWebTableToCsvFlow,
  type BrowserDomPayload
} from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const pnpmScriptLockPath = path.join(
  tmpdir(),
  "deepseek-workbench-web-table-cli-build.lock"
);
const fixturePath = path.join(
  repoRoot,
  "runtime",
  "test",
  "fixtures",
  "web-table-sample-payload.json"
);
const tempRoots: string[] = [];

async function createTempWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "dw-flow-"));
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

async function readFixture(): Promise<BrowserDomPayload> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as BrowserDomPayload;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function safeClock(): Date {
  return new Date("2026-01-01T00:00:00.000Z");
}

describe("WebTableToCsvFlow", () => {
  it("writes a CSV draft and replayable event log from a sanitized payload", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();
    let id = 0;

    const result = await runWebTableToCsvFlow({
      workspaceRoot,
      payload,
      filename: "orders.csv",
      clock: safeClock,
      idFactory: () => {
        id += 1;
        return `event-${id}`;
      }
    });
    const csvContent = await readFile(result.draft.absolutePath, "utf8");
    const eventLogText = await readFile(result.events.eventLogPath, "utf8");
    const events = new JsonlEventStore(result.events.eventLogPath).listEvents();
    const replayState = replay(events);

    expect(result.draft.relativePath).toBe("drafts/orders.csv");
    expect(result.draft.contentType).toBe("text/csv");
    expect(result.extraction).toMatchObject({
      sourceHost: "example.com",
      sourcePathWithoutQuery: "/reports/table",
      tableId: "orders",
      rowCount: 4,
      columnCount: 3,
      injectionRiskCount: 1,
      formulaEscapedCount: 1
    });
    expect(result.events.eventCount).toBe(9);
    expect(result.replaySummary.draftCount).toBe(1);
    expect(Object.values(result.replaySummary.tasks)).toEqual(["completed"]);
    expect(replayState.draftCount).toBe(1);
    expect(Object.values(replayState.tasks)).toEqual(["completed"]);
    expect(csvContent).toContain("'=SUM(A1:A2)");
    expect(csvContent).toContain("北京");
    expect(csvContent).toContain("ignore previous instructions");
    expect(eventLogText).not.toContain(csvContent);
    expect(eventLogText).not.toContain("'=SUM(A1:A2)");
    expect(eventLogText).not.toContain("ignore previous instructions");
    expect(eventLogText).not.toContain("raw prompt");
    expect(eventLogText).not.toContain("token=secret");
    expect(eventLogText).not.toContain("api key");
  });

  it("strips URL query data from event payloads even if the input URL has one", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();
    payload.source.url = "https://example.com/reports/table?token=secret#frag";

    const result = await runWebTableToCsvFlow({
      workspaceRoot,
      payload,
      filename: "orders.csv",
      clock: safeClock
    });
    const eventLogText = await readFile(result.events.eventLogPath, "utf8");

    expect(eventLogText).toContain("example.com");
    expect(eventLogText).toContain("/reports/table");
    expect(eventLogText).not.toContain("token=secret");
    expect(result.extraction.sourcePathWithoutQuery).toBe("/reports/table");
  });

  it("rejects unsupported payloads without writing a draft", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();
    payload.source.url = "file:///tmp/table.html";

    await expect(
      runWebTableToCsvFlow({
        workspaceRoot,
        payload,
        filename: "orders.csv",
        clock: safeClock
      })
    ).rejects.toThrow();
    expect(
      await fileExists(path.join(workspaceRoot, "drafts", "orders.csv"))
    ).toBe(false);
  });

  it("returns a safe actionable error when the draft already exists", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();

    await runWebTableToCsvFlow({
      workspaceRoot,
      payload,
      filename: "orders.csv",
      clock: safeClock
    });

    await expect(
      runWebTableToCsvFlow({
        workspaceRoot,
        payload,
        filename: "orders.csv",
        clock: safeClock
      })
    ).rejects.toThrow(
      "Draft already exists: drafts/orders.csv. Choose a new draft filename or remove the existing file."
    );
  });
});

describe("web-table-to-csv CLI", () => {
  it("prints help without payload content", async () => {
    const result = await runPnpm(["run", "web-table-to-csv", "--", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Web table to CSV");
    expect(result.stdout).toContain("--workspace <path>");
    expect(result.stdout).not.toContain("=SUM(A1:A2)");
  }, 120_000);

  it("requires workspace and payload arguments", async () => {
    const result = await runPnpm([
      "run",
      "web-table-to-csv",
      "--",
      "--payload",
      fixturePath
    ]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("Missing required");
  }, 120_000);

  it("writes a draft for the fixture and does not print CSV content", async () => {
    const workspaceRoot = await createTempWorkspace();

    const first = await runPnpm([
      "run",
      "web-table-to-csv",
      "--",
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--filename",
      "cli-orders.csv"
    ]);
    const second = await runPnpm([
      "run",
      "web-table-to-csv",
      "--",
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--filename",
      "cli-orders.csv"
    ]);
    const overwrite = await runPnpm([
      "run",
      "web-table-to-csv",
      "--",
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--filename",
      "cli-orders.csv",
      "--allow-overwrite"
    ]);

    expect(first.exitCode).toBe(0);
    expect(first.stdout).toContain("draft: drafts/cli-orders.csv");
    expect(first.stdout).toContain("replay draft count: 1");
    expect(first.stdout).not.toContain("=SUM(A1:A2)");
    expect(first.stdout).not.toContain("ignore previous instructions");
    expect(second.exitCode).not.toBe(0);
    expect(second.stderr).toContain("Web table to CSV failed");
    expect(overwrite.exitCode).toBe(0);
    expect(
      await fileExists(path.join(workspaceRoot, "drafts", "cli-orders.csv"))
    ).toBe(true);
  }, 120_000);

  it("returns non-zero for invalid payloads with a safe error", async () => {
    const workspaceRoot = await createTempWorkspace();
    const invalidPayloadPath = path.join(workspaceRoot, "invalid-payload.json");
    const payload = await readFixture();
    payload.source.url = "chrome://extensions";
    await writeFile(invalidPayloadPath, JSON.stringify(payload), "utf8");

    const result = await runPnpm([
      "run",
      "web-table-to-csv",
      "--",
      "--workspace",
      workspaceRoot,
      "--payload",
      invalidPayloadPath,
      "--filename",
      "invalid.csv"
    ]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("Web table to CSV failed");
    expect(result.stderr).not.toContain("raw DOM");
    expect(result.stderr).not.toContain("api key");
    expect(
      await fileExists(path.join(workspaceRoot, "drafts", "invalid.csv"))
    ).toBe(false);
  }, 120_000);
});

function runPnpm(args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const commandArgs =
    process.platform === "win32" ? ["/c", "pnpm.cmd", ...args] : args;

  return withPnpmScriptBuildLock(
    () =>
      new Promise((resolve) => {
        execFile(
          command,
          commandArgs,
          {
            cwd: repoRoot,
            timeout: 120_000
          },
          (error, stdout, stderr) => {
            const code = (error as NodeJS.ErrnoException | null)?.code;
            resolve({
              exitCode:
                error === null ? 0 : typeof code === "number" ? code : 1,
              stdout,
              stderr
            });
          }
        );
      })
  );
}

async function withPnpmScriptBuildLock<T>(task: () => Promise<T>): Promise<T> {
  await acquirePnpmScriptBuildLock();
  try {
    return await task();
  } finally {
    await rm(pnpmScriptLockPath, { recursive: true, force: true });
  }
}

async function acquirePnpmScriptBuildLock(): Promise<void> {
  const startedAt = Date.now();

  while (true) {
    try {
      await mkdir(pnpmScriptLockPath);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      if (Date.now() - startedAt > 180_000) {
        await rm(pnpmScriptLockPath, { recursive: true, force: true });
        continue;
      }
      await delay(100);
    }
  }
}
