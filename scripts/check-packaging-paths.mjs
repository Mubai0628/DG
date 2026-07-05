import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const docsPath = path.join(
  repoRoot,
  "docs",
  "cross-platform-packaging-paths-v0.32.md"
);

function fail(message) {
  console.error(`Packaging path check failed: ${message}`);
  process.exitCode = 1;
}

if (!existsSync(docsPath)) {
  fail("cross-platform packaging paths doc is missing");
} else {
  const doc = readFileSync(docsPath, "utf8");
  const normalizedDoc = doc.replace(/\s+/g, " ");
  const requiredText = [
    "Windows path examples use safe escaping",
    "D:\\\\workspaces\\\\demo",
    "PowerShell `-LiteralPath`",
    "summary-only path refs",
    "no native bridge",
    "no desktop action",
    "no Git/shell execution",
    "no filesystem mutation"
  ];

  for (const text of requiredText) {
    if (!normalizedDoc.includes(text)) {
      fail(`path doc missing: ${text}`);
    }
  }

  if (/D:\\(?!\\)/.test(doc)) {
    fail("path doc contains an unescaped D:\\ Windows path example");
  }
}

if (process.exitCode === undefined) {
  console.log("Packaging path check");
  console.log("status: PASS");
}
