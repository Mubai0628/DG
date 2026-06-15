#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const repoRoot = path.resolve(appRoot, "..");
const runnerPath = path.join(appRoot, "scripts", "run-flow.mjs");
const fixturePath = path.join(
  repoRoot,
  "runtime",
  "test",
  "fixtures",
  "web-table-sample-payload.json"
);

await access(runnerPath);
await runNode(["--version"]);

const workspaceRoot = await mkdtemp(path.join(tmpdir(), "dw-app-preflight-"));

try {
  const success = await runNode([
    runnerPath,
    "--workspace",
    workspaceRoot,
    "--payload",
    fixturePath,
    "--filename",
    "preflight.csv"
  ]);
  const summary = JSON.parse(success.stdout);
  assert(summary.draft.relativePath === "drafts/preflight.csv");
  assert(summary.replaySummary.draftCount >= 1);

  const invalidPayloadPath = path.join(workspaceRoot, "invalid-payload.json");
  const fakeSecret = "sk-test1234567890abcdef";
  await writeFile(
    invalidPayloadPath,
    `{"schemaVersion":1,"leak":"${fakeSecret}"`,
    "utf8"
  );
  const failure = await runNodeAllowFailure([
    runnerPath,
    "--workspace",
    workspaceRoot,
    "--payload",
    invalidPayloadPath
  ]);
  assert(failure.code !== 0);
  assert(!failure.stderr.includes(fakeSecret));
  assert(failure.stdout.length === 0);

  console.log("Desktop runner preflight");
  console.log("status: PASS");
} finally {
  await rm(workspaceRoot, { recursive: true, force: true });
}

function runNode(args) {
  return runNodeAllowFailure(args).then((result) => {
    if (result.code !== 0) {
      throw new Error("desktop preflight command failed");
    }
    return result;
  });
}

function runNodeAllowFailure(args) {
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
        if (error !== null && "code" in error) {
          resolve({ code: error.code ?? 1, stdout, stderr });
          return;
        }
        if (error !== null) {
          reject(error);
          return;
        }
        resolve({ code: 0, stdout, stderr });
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
    throw new Error("Desktop preflight assertion failed");
  }
}
