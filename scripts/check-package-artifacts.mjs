import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const gitignore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8");

const artifactRules = [
  {
    path: "app/dist",
    requiredPattern: "app/dist/",
    disposition: "ignored build output"
  },
  {
    path: "app/src-tauri/target",
    requiredPattern: "app/src-tauri/target/",
    disposition: "ignored Rust build output"
  },
  {
    path: "runtime/dist",
    requiredPattern: "dist/",
    disposition: "ignored package build output"
  },
  {
    path: "browser-extension/dist",
    requiredPattern: "browser-extension/dist/",
    disposition: "ignored extension build output"
  },
  {
    path: "conformance/results",
    requiredPattern: "conformance/results/",
    disposition: "ignored conformance output"
  },
  {
    path: ".tmp",
    requiredPattern: ".tmp/",
    disposition: "ignored temporary output"
  },
  {
    path: "node_modules",
    requiredPattern: "node_modules/",
    disposition: "ignored dependency tree"
  },
  {
    path: "coverage",
    requiredPattern: "coverage/",
    disposition: "ignored coverage output"
  }
];

const releaseReviewOnly = ["release zips", "logs", "screenshots"].map(
  (pathLabel) => ({
    path: pathLabel,
    disposition: "release-review only; not packaged without checklist approval"
  })
);

const hasPattern = (pattern) =>
  gitignore
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .includes(pattern);

const checked = artifactRules.map((rule) => ({
  ...rule,
  ignored: hasPattern(rule.requiredPattern)
}));

const missing = checked.filter((rule) => !rule.ignored);

const report = {
  status: missing.length === 0 ? "PASS" : "FAIL",
  source: "check_package_artifacts",
  summaryOnly: true,
  checkedCount: checked.length,
  missingIgnoreRuleCount: missing.length,
  checked,
  releaseReviewOnly,
  noDelete: true,
  noUpload: true,
  noNetwork: true,
  noWriteOutsideStdout: true
};

console.log(JSON.stringify(report, null, 2));

if (missing.length > 0) {
  process.exitCode = 1;
}
