#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
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
const requiredDocs = [
  path.join(repoRoot, "docs", "desktop-shell-smoke-v0.1.md"),
  path.join(repoRoot, "docs", "web-table-to-csv-acceptance.md"),
  path.join(repoRoot, "docs", "threat-model-v0.1.md")
];

await Promise.all([fixturePath, ...requiredDocs].map((file) => access(file)));

const workspaceRoot = await mkdtemp(
  path.join(tmpdir(), "dw-app-manual-smoke-")
);

try {
  const result = await runNode([
    path.join(appRoot, "scripts", "run-flow.mjs"),
    "--workspace",
    workspaceRoot,
    "--payload",
    fixturePath,
    "--filename",
    "manual-smoke-check.csv"
  ]);
  const summary = JSON.parse(result.stdout);

  assert(summary.draft.relativePath === "drafts/manual-smoke-check.csv");
  assert(summary.extraction.rowCount > 0);
  assert(summary.events.eventCount > 0);
  assert(summary.replaySummary.draftCount >= 1);
  assert(!JSON.stringify(summary).includes("csvContent"));

  console.log("Desktop manual smoke check");
  console.log("status: PASS");
} finally {
  await rm(workspaceRoot, { recursive: true, force: true });
}

function runNode(args) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: repoRoot,
        timeout: 120_000,
        env: sanitizedEnv()
      },
      (error, stdout, stderr) => {
        if (error !== null) {
          reject(
            new Error(`manual smoke check failed: ${stderr.slice(0, 400)}`)
          );
          return;
        }
        resolve({ stdout });
      }
    );
  });
}

function sanitizedEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !isSensitiveEnvKey(key))
  );
}

function isSensitiveEnvKey(key) {
  return /API_KEY|TOKEN|AUTH|SECRET|PASSWORD|CREDENTIAL|BEARER/i.test(key);
}

function assert(condition) {
  if (!condition) {
    throw new Error("Desktop manual smoke assertion failed");
  }
}
