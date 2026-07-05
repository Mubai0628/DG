import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const generatedPathSamples = [
  "app/dist/index.html",
  "runtime/dist/index.js",
  "browser-extension/dist/manifest.json",
  "app/src-tauri/target/debug/deepseek-workbench.exe",
  "conformance/results/latest.json",
  ".tmp/packaging-smoke.json",
  "node_modules/.pnpm/lock.yaml"
];

const stagedGeneratedPrefixes = [
  "app/dist/",
  "runtime/dist/",
  "browser-extension/dist/",
  "app/src-tauri/target/",
  "conformance/results/",
  ".tmp/",
  "node_modules/"
];

const requiredDocs = [
  "docs/v0.32-packaging-update-migration-qa-prompts.md",
  "docs/p1j-packaging-update-migration-qa-roadmap.md",
  "docs/packaging-artifact-hygiene-v0.32.md",
  "docs/cross-platform-packaging-paths-v0.32.md"
];

function fail(message) {
  console.error(`Artifact hygiene check failed: ${message}`);
  process.exitCode = 1;
}

function git(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function gitCheckIgnored(samplePath) {
  try {
    execFileSync("git", ["check-ignore", "-q", samplePath], {
      cwd: repoRoot,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}

for (const sample of generatedPathSamples) {
  if (!gitCheckIgnored(sample)) {
    fail(`${sample} is not ignored`);
  }
}

const staged = git(["diff", "--cached", "--name-only"])
  .split(/\r?\n/)
  .map((line) => line.trim().replace(/\\/g, "/"))
  .filter(Boolean);

for (const stagedPath of staged) {
  if (stagedGeneratedPrefixes.some((prefix) => stagedPath.startsWith(prefix))) {
    fail(`generated artifact is staged: ${stagedPath}`);
  }
}

for (const docPath of requiredDocs) {
  if (!existsSync(path.join(repoRoot, docPath))) {
    fail(`required docs source is missing: ${docPath}`);
  }
}

const docsDir = path.join(repoRoot, "docs");
const docs = readdirSync(docsDir);
if (!docs.some((name) => /manual-(qa|smoke)|manual-qa/i.test(name))) {
  fail("manual QA documentation is missing");
}
if (!docs.some((name) => /rc-checklist/i.test(name))) {
  fail("RC checklist documentation is missing");
}

const hygieneDoc = readFileSync(
  path.join(repoRoot, "docs", "packaging-artifact-hygiene-v0.32.md"),
  "utf8"
);

for (const requiredText of [
  "Tauri bundle identifier warning",
  "Vite chunk-size warning",
  "no generated artifacts staged",
  "app/dist ignored",
  "runtime/dist ignored",
  "browser-extension/dist ignored",
  "app/src-tauri/target ignored",
  "conformance/results ignored",
  ".tmp ignored",
  "node_modules ignored"
]) {
  if (!hygieneDoc.includes(requiredText)) {
    fail(`artifact hygiene doc missing: ${requiredText}`);
  }
}

if (process.exitCode === undefined) {
  console.log("Artifact hygiene check");
  console.log("status: PASS");
  console.log(`ignored samples: ${generatedPathSamples.length}`);
  console.log(`staged files checked: ${staged.length}`);
}
