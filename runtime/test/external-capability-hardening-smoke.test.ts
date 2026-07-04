import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildExternalCapabilityRedactionAudit,
  buildExternalCapabilityReplayCompletenessReport,
  buildPluginSkillSandboxEscapeReport,
  runWebTableToCsvFlow,
  type BrowserDomPayload,
  type ExternalCapabilityReplayResultSummary
} from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const fixtureRoot = path.join(
  repoRoot,
  "runtime",
  "test",
  "fixtures",
  "external-capability-hardening"
);
const webTableFixturePath = path.join(
  repoRoot,
  "runtime",
  "test",
  "fixtures",
  "web-table-sample-payload.json"
);
const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true }))
  );
});

async function readFixture<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(path.join(fixtureRoot, name), "utf8")) as T;
}

async function createTempWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "dw-p1h-smoke-"));
  tempRoots.push(root);
  return root;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function expectNoReplayExecution(
  result: ReturnType<typeof buildExternalCapabilityReplayCompletenessReport>
): void {
  expect(result.readiness.canReplayRawOutput).toBe(false);
  expect(result.readiness.canExecuteExternalCapability).toBe(false);
  expect(result.readiness.canWriteEventStoreRaw).toBe(false);
  expect(result.readiness.canExecuteGit).toBe(false);
  expect(result.readiness.canExecuteShell).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("external capability hardening smoke", () => {
  it("keeps MCP read-only result replay complete and non-executable", async () => {
    const resultSummary =
      await readFixture<ExternalCapabilityReplayResultSummary>(
        "mcp-readonly-replay-complete.json"
      );
    const report = buildExternalCapabilityReplayCompletenessReport({
      results: [resultSummary],
      idGenerator: () => "p1h-smoke-replay"
    });

    expect(report.status).toBe("replay_ready");
    expect(report.resultCount).toBe(1);
    expect(report.missingReplayCount).toBe(0);
    expect(report.sourceTypeCounts.mcp_readonly_tool).toBe(1);
    expectNoReplayExecution(report);
  });

  it("blocks plugin metadata with lifecycle scripts", async () => {
    const plugin = await readFixture<Record<string, unknown>>(
      "plugin-with-script.json"
    );
    const report = buildPluginSkillSandboxEscapeReport({
      packages: [plugin]
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.blockedSignalCodes).toContain("POSTINSTALL_REJECTED");
    expect(serialized).not.toContain("synthetic-postinstall");
    expect(report.readiness.canLoadPluginCode).toBe(false);
    expect(report.readiness.canRunSkillRuntime).toBe(false);
    expect(report.readiness.appCanExecute).toBe(false);
  });

  it("blocks skill metadata that claims runtime execution", async () => {
    const skill = await readFixture<Record<string, unknown>>(
      "skill-runtime-execution.json"
    );
    const report = buildPluginSkillSandboxEscapeReport({
      packages: [skill]
    });

    expect(report.status).toBe("blocked");
    expect(report.blockedSignalCodes).toEqual(
      expect.arrayContaining([
        "SKILL_RUNTIME_REJECTED",
        "RUNTIME_EXECUTION_REJECTED"
      ])
    );
    expect(report.readiness.canRunSkillRuntime).toBe(false);
    expect(report.readiness.canExecuteCustomCode).toBe(false);
  });

  it("blocks raw output in external capability redaction audit", async () => {
    const fixture = await readFixture<Record<string, unknown>>(
      "redaction-raw-output.json"
    );
    const audit = buildExternalCapabilityRedactionAudit(fixture);
    const serialized = JSON.stringify(audit);

    expect(audit.status).toBe("blocked");
    expect(audit.rawLeakBooleans.rawToolOutputDetected).toBe(true);
    expect(audit.findings.map((finding) => finding.code)).toContain(
      "RAW_TOOL_OUTPUT_FIELD_REJECTED"
    );
    expect(serialized).not.toContain("RAW_TOOL_OUTPUT_SMOKE_SENTINEL");
    expect(audit.readiness.canInvokeCapability).toBe(false);
    expect(audit.readiness.canWriteEventStore).toBe(false);
  });

  it("keeps the App external capability audit surface read-only in source", async () => {
    const appSource = await readFile(
      path.join(repoRoot, "app", "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(
        repoRoot,
        "app",
        "src",
        "external-capability-audit-surface-view.ts"
      ),
      "utf8"
    );

    expect(appSource).toContain("External Capability Audit");
    expect(appSource).toContain("Invoke External Capability (disabled)");
    expect(appSource).toContain("Run Plugin (disabled)");
    expect(appSource).toContain("Run Skill (disabled)");
    expect(appSource).toContain("Execute Mutating MCP Tool (disabled)");
    expect(appSource).not.toMatch(/>\s*Invoke External Capability\s*</);
    expect(viewSource).not.toMatch(/\bfetch\s*\(/);
    expect(viewSource).not.toMatch(/\binvoke\s*\(/);
    expect(viewSource).toContain("canUseTauri: false");
    expect(viewSource).toContain("appCanExecute: false");
  });

  it("keeps the v0.1 web_table_to_csv Convert flow unaffected", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = JSON.parse(
      await readFile(webTableFixturePath, "utf8")
    ) as BrowserDomPayload;
    const result = await runWebTableToCsvFlow({
      workspaceRoot,
      payload,
      filename: "p1h-smoke.csv",
      clock: () => new Date("2026-01-01T00:00:00.000Z")
    });

    expect(result.draft.relativePath).toBe("drafts/p1h-smoke.csv");
    expect(result.extraction.rowCount).toBe(4);
    expect(result.extraction.columnCount).toBe(3);
    expect(result.replaySummary.draftCount).toBe(1);
    expect(await fileExists(result.draft.absolutePath)).toBe(true);
  });
});
