import { execFile } from "node:child_process";
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
import { setTimeout as delay } from "node:timers/promises";

import { afterEach, describe, expect, it } from "vitest";

import { scanEventLogForLeaks } from "../../evals/web-table-to-csv/leak-scanner.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const pnpmScriptLockPath = path.join(
  tmpdir(),
  "deepseek-workbench-web-table-cli-build.lock"
);
const tempRoots = [];

async function createTempRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "dw-eval-"));
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

describe("web table to CSV eval harness", () => {
  it("runs all bundled cases and writes a redacted report", async () => {
    const root = await createTempRoot();
    const outputRoot = path.join(root, "workspaces");
    const reportPath = path.join(root, "report.json");
    const result = await runPnpm([
      "eval:web-table-to-csv",
      "--",
      "--output-root",
      outputRoot,
      "--report-path",
      reportPath
    ]);

    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain("Web table to CSV eval");
    expect(result.stdout).toContain("status: PASS");
    expect(result.stdout).not.toContain("Alpha,North,10");

    const reportText = await readFile(reportPath, "utf8");
    const report = JSON.parse(reportText);
    expect(report.totalCases).toBe(8);
    expect(report.failed).toBe(0);
    expect(report.rejectedExpected).toBe(2);
    expect(report.draftsWritten).toBe(6);
    expect(report.leakageFailures).toBe(0);
    expect(report.totalInjectionRisks).toBeGreaterThan(0);
    expect(report.totalFormulaEscaped).toBeGreaterThan(0);
    expect(reportText).not.toContain("Alpha,North,10");
    expect(reportText).not.toContain("secret raw dom");
    expect(reportText).not.toContain("token=abc123");
    expect(reportText).not.toContain("ignore previous instructions");
    expect(
      await fileExists(path.join(outputRoot, "CASE-WTTC-008", "drafts"))
    ).toBe(false);
  }, 180_000);

  it("returns non-zero and a failed summary when an expected pass case fails", async () => {
    const root = await createTempRoot();
    const casesDir = path.join(root, "cases");
    const reportPath = path.join(root, "failed-report.json");
    await mkdir(casesDir, { recursive: true });

    const sourceCasePath = path.join(
      repoRoot,
      "evals",
      "web-table-to-csv",
      "cases",
      "case-001-basic-table.json"
    );
    const brokenCase = JSON.parse(await readFile(sourceCasePath, "utf8"));
    brokenCase.id = "CASE-WTTC-BROKEN";
    brokenCase.expected.rowCount = 999;
    await writeFile(
      path.join(casesDir, "broken.json"),
      `${JSON.stringify(brokenCase, null, 2)}\n`,
      "utf8"
    );
    await writeFile(
      path.join(casesDir, "index.json"),
      `${JSON.stringify({ files: ["broken.json"] }, null, 2)}\n`,
      "utf8"
    );

    const result = await runPnpm([
      "eval:web-table-to-csv",
      "--",
      "--cases-dir",
      casesDir,
      "--output-root",
      path.join(root, "output"),
      "--report-path",
      reportPath
    ]);
    const report = JSON.parse(await readFile(reportPath, "utf8"));

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toContain("status: FAIL");
    expect(report.failed).toBe(1);
    expect(report.cases[0].safeReason).toContain("row count mismatch");
  }, 180_000);

  it("leakage scanner catches unsafe event markers without printing raw values", () => {
    const secretKey = "s" + "k-1234567890abcdef";
    const bearer = "Bear" + "er abcdefghijklmnop";
    const result = scanEventLogForLeaks(
      `{"rawDom":"x","url":"https://example.com/path?token=secret","auth":"${bearer}","key":"${secretKey}"}`
    );

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.kind)).toContain(
      "raw_dom_marker"
    );
    expect(result.findings.map((finding) => finding.kind)).toContain(
      "url_query_token"
    );
    expect(result.findings.map((finding) => finding.kind)).toContain(
      "bearer_token"
    );
    expect(JSON.stringify(result)).not.toContain("abcdefghijklmnop");
    expect(JSON.stringify(result)).not.toContain("1234567890abcdef");
  });

  it("keeps the eval runner on the runtime flow path and exposes verify script", async () => {
    const runnerText = await readFile(
      path.join(repoRoot, "evals", "web-table-to-csv", "eval-runner.mjs"),
      "utf8"
    );
    const packageJson = JSON.parse(
      await readFile(path.join(repoRoot, "package.json"), "utf8")
    );

    expect(runnerText).toContain("runWebTableToCsvFlow");
    expect(runnerText).not.toContain("webTableToCsv(");
    expect(packageJson.scripts["verify:v0.1-slice"]).toContain(
      "eval:web-table-to-csv"
    );
  });
});

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function runPnpm(args) {
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
            timeout: 180_000
          },
          (error, stdout, stderr) => {
            const code = error?.code;
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

async function withPnpmScriptBuildLock(task) {
  await acquirePnpmScriptBuildLock();
  try {
    return await task();
  } finally {
    await rm(pnpmScriptLockPath, { recursive: true, force: true });
  }
}

async function acquirePnpmScriptBuildLock() {
  const startedAt = Date.now();

  while (true) {
    try {
      await mkdir(pnpmScriptLockPath);
      return;
    } catch (error) {
      if (error?.code !== "EEXIST") {
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
