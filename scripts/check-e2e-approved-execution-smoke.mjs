#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const requiredFiles = [
  "docs/e2e-coding-task-hardening-manual-qa.md",
  "docs/e2e-coding-task-hardening-smoke-plan.md",
  "docs/runtime-e2e-golden-regression-suite-v0.15.md",
  "docs/app-shell-approved-execution-recovery-v0.15.md",
  "docs/app-shell-approved-execution-replay-timeline-v0.15.md",
  "runtime/test/fixtures/e2e-coding-tasks/docs-create-smoke.json",
  "runtime/test/fixtures/e2e-coding-tasks/docs-update-verify-smoke.json",
  "runtime/test/fixtures/e2e-coding-tasks/conflict-stale-snapshot.json",
  "runtime/test/fixtures/e2e-coding-tasks/verification-failure-rollback.json",
  "runtime/test/fixtures/e2e-coding-tasks/blocked-unsafe-path.json",
  "runtime/test/fixtures/e2e-coding-tasks/blocked-secret-marker.json",
  "runtime/test/fixtures/e2e-coding-tasks/blocked-raw-content-marker.json",
  "app/test/fixtures/e2e-coding-task-regression/safe-docs-task.json",
  "app/test/fixtures/e2e-coding-task-regression/verification-failure-task.json",
  "app/test/fixtures/e2e-coding-task-regression/rollback-task.json",
  "app/test/fixtures/e2e-coding-task-regression/expected-event-summary.json",
  "app/src/App.tsx",
  "app/test/desktop-shell.test.ts",
  "docs/README.md"
];

await Promise.all(requiredFiles.map((file) => access(resolve(file))));

const manualQa = await read("docs/e2e-coding-task-hardening-manual-qa.md");
const smokePlan = await read("docs/e2e-coding-task-hardening-smoke-plan.md");
const appSource = await read("app/src/App.tsx");
const tests = await read("app/test/desktop-shell.test.ts");
const docsIndex = await read("docs/README.md");

assertIncludes(manualQa, [
  "Convert",
  "live proposal generation",
  "proposal chain",
  "approved apply",
  "verification lane",
  "rollback",
  "replay",
  "stale conflict",
  "failure recovery",
  "raw content absence"
]);

assertIncludes(smokePlan, [
  "static smoke checker",
  "does not execute apply",
  "does not execute rollback",
  "does not mutate workspace",
  "summary-only",
  "no raw prompt",
  "no raw response",
  "no API key"
]);

assertIncludes(appSource, [
  "End-to-End Apply / Verify / Rollback Sequencer",
  "E2E Task Recovery",
  "Approved Execution Recovery",
  "Approved Execution Replay Timeline",
  "Retry Apply (disabled)",
  "Replay Write Event (disabled)",
  "Execute From Timeline (disabled)"
]);

assertIncludes(appSource, [
  "Call DeepSeek (disabled)",
  "Run Evaluation (disabled)",
  "Apply Approved Patch",
  "Rollback Approved Patch"
]);

assertIncludes(tests, [
  "projects approved execution replay timeline states deterministically",
  "classifies approved execution recovery states without unsafe actions",
  "runs the P0R-007 E2E coding task regression smoke",
  "documents the P0S-006 approved execution smoke hardening checklist"
]);

assertIncludes(docsIndex, [
  "e2e-coding-task-hardening-manual-qa.md",
  "e2e-coding-task-hardening-smoke-plan.md"
]);

console.log("E2E approved execution smoke hardening check");
console.log("status: PASS");

function resolve(file) {
  return path.join(repoRoot, file);
}

async function read(file) {
  return readFile(resolve(file), "utf8");
}

function assertIncludes(text, needles) {
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`Missing required text: ${needle}`);
    }
  }
}
