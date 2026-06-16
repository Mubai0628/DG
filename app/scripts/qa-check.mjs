#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
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
const requiredDocs = [
  "desktop-shell-smoke-v0.1.md",
  "desktop-event-log-smoke-v0.1.md",
  "desktop-manual-qa-v0.1.md",
  "desktop-rc-checklist-v0.1.md",
  "desktop-troubleshooting-v0.1.md",
  "desktop-packaging-strategy-v0.1.md",
  "threat-model-v0.1.md"
].map((file) => path.join(repoRoot, "docs", file));

await Promise.all(
  [runnerPath, fixturePath, ...requiredDocs].map((file) => access(file))
);
await runPnpm(["app:preflight"]);
await runPnpm(["app:smoke"]);

const workspaceRoot = await mkdtemp(path.join(tmpdir(), "dw-app-qa-"));

try {
  const result = await runNode([
    runnerPath,
    "--workspace",
    workspaceRoot,
    "--payload",
    fixturePath,
    "--filename",
    "desktop-qa.csv"
  ]);
  const summary = JSON.parse(result.stdout);
  const eventLogPath = path.join(
    workspaceRoot,
    ".deepseek-workbench",
    "events.jsonl"
  );
  await access(eventLogPath);
  const eventLog = await readFile(eventLogPath, "utf8");
  const leakFindings = scanEventLogForLeaks(eventLog);

  assert(summary.draft.relativePath === "drafts/desktop-qa.csv");
  assert(summary.extraction.rowCount > 0);
  assert(summary.events.eventCount > 0);
  assert(summary.replaySummary.draftCount >= 1);
  assert(leakFindings.length === 0);

  console.log("Desktop QA check");
  console.log("status: PASS");
} finally {
  await rm(workspaceRoot, { recursive: true, force: true });
}

function runPnpm(args) {
  const executable = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const executableArgs =
    process.platform === "win32" ? ["/c", "pnpm.cmd", ...args] : args;
  return runProcess(executable, executableArgs, "desktop QA pnpm command");
}

function runNode(args) {
  return runProcess(process.execPath, args, "desktop QA node command");
}

function runProcess(command, args, label) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: repoRoot,
        timeout: 180_000,
        env: sanitizedEnv()
      },
      (error, stdout, stderr) => {
        if (error !== null) {
          reject(new Error(`${label} failed: ${stderr.slice(0, 400)}`));
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

function scanEventLogForLeaks(text) {
  const checks = [
    ["CSV_CONTENT_MARKER", /csvContent|Product,Region,Value/i],
    ["RAW_DOM_MARKER", /"rawDom"\s*:|raw DOM|innerHTML|outerHTML/i],
    ["RAW_PROMPT_MARKER", /rawPrompt/i],
    ["SCREENSHOT_MARKER", /rawScreenshot|screenshot/i],
    ["CLIPBOARD_MARKER", /clipboard/i],
    ["AUTHORIZATION_MARKER", /Authorization\s*:/i],
    ["BEARER_MARKER", /\bBearer\s+[A-Za-z0-9._-]{8,}/i],
    ["SK_MARKER", /\bsk-[A-Za-z0-9_-]{8,}/i],
    ["FULL_QUERY_MARKER", /[?&](token|session|secret|password)=/i]
  ];
  return checks
    .filter(([, pattern]) => pattern.test(text))
    .map(([code]) => code);
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
    throw new Error("Desktop QA assertion failed");
  }
}
