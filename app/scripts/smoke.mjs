#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const repoRoot = path.resolve(appRoot, "..");
const fixturePath = path.join(
  repoRoot,
  "runtime",
  "test",
  "fixtures",
  "web-table-sample-payload.json"
);

const workspaceRoot = await mkdtemp(path.join(tmpdir(), "dw-app-smoke-"));

try {
  const result = await runNode([
    path.join(appRoot, "scripts", "run-flow.mjs"),
    "--workspace",
    workspaceRoot,
    "--payload",
    fixturePath,
    "--filename",
    "desktop-smoke.csv"
  ]);
  const summary = JSON.parse(result.stdout);

  assert(summary.draft.relativePath === "drafts/desktop-smoke.csv");
  assert(summary.extraction.rowCount > 0);
  assert(summary.events.eventCount > 0);
  assert(summary.replaySummary.draftCount >= 1);

  console.log("Desktop shell smoke");
  console.log("status: PASS");
} finally {
  await rm(workspaceRoot, { recursive: true, force: true });
}

function runNode(args) {
  const executable = process.execPath;
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      args,
      {
        cwd: repoRoot,
        timeout: 120_000,
        env: sanitizedEnv()
      },
      (error, stdout, stderr) => {
        if (error !== null) {
          reject(new Error(`desktop smoke failed: ${stderr.slice(0, 400)}`));
          return;
        }
        resolve({ stdout });
      }
    );
  });
}

function sanitizedEnv() {
  const nextEnv = { ...process.env };
  delete nextEnv[["DEEPSEEK", "API", "KEY"].join("_")];
  delete nextEnv[["OPENAI", "API", "KEY"].join("_")];
  return nextEnv;
}

function assert(condition) {
  if (!condition) {
    throw new Error("Desktop smoke assertion failed");
  }
}
