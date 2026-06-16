import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  checkDesktopRunnerPreflight,
  invokeAllowedCommand,
  isAllowedDesktopCommand,
  loadWorkspaceEventSummary,
  runDesktopWebTableToCsvFlow,
  safeInvoke,
  type TauriInvoke
} from "../src/desktop-flow.js";
import {
  buildEventLogPanelModel,
  buildBridgeProposalPreviewModel,
  buildResultPanelModel,
  buildUiErrorFallbackMessage,
  canRunWithPreflight,
  importBridgeProposalToPayloadEditor,
  maxPayloadTextBytes,
  normalizeBridgeProposalPreview,
  normalizeDesktopCommandError,
  normalizeDesktopFlowResult,
  normalizeEventSummary,
  normalizeRunnerPreflightSummary,
  normalizeTimelineItem,
  normalizeWorkspaceEventSummary,
  parsePayloadJson,
  rejectBridgeProposal,
  runnerPreflightMessage,
  safeArray,
  safeErrorMessage,
  safeShort,
  safeText,
  validatePayloadTextSize,
  validateDesktopFlowInput,
  type DesktopFlowResult,
  type BridgeProposalPreviewState,
  type RunnerPreflightSummary,
  type WorkspaceEventSummary
} from "../src/safety.js";
import {
  runWebTableToCsvFlow,
  createBridgeProposalPreview,
  type BrowserDomPayload
} from "@deepseek-workbench/runtime";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const appRoot = path.join(repoRoot, "app");
const fixturePath = path.join(
  repoRoot,
  "runtime",
  "test",
  "fixtures",
  "web-table-sample-payload.json"
);
const rootPackagePath = path.join(repoRoot, "package.json");
const appPackagePath = path.join(appRoot, "package.json");
const tauriConfigPath = path.join(appRoot, "src-tauri", "tauri.conf.json");
const viteConfigPath = path.join(appRoot, "vite.config.ts");
const appScriptRunnerPath = path.join(appRoot, "scripts", "run-flow.mjs");
const appPreflightScriptPath = path.join(appRoot, "scripts", "preflight.mjs");
const appQaScriptPath = path.join(appRoot, "scripts", "qa-check.mjs");
const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true }))
  );
});

async function createTempWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "dw-app-test-"));
  tempRoots.push(root);
  return root;
}

async function readFixture(): Promise<BrowserDomPayload> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as BrowserDomPayload;
}

function fixedResult(workspaceRoot: string): DesktopFlowResult {
  return {
    draft: {
      relativePath: "drafts/table.csv",
      absolutePath: path.join(workspaceRoot, "drafts", "table.csv"),
      bytes: 42,
      sha256: "a".repeat(64),
      contentType: "text/csv"
    },
    extraction: {
      rowCount: 4,
      columnCount: 3,
      warningCount: 1,
      injectionRiskCount: 1,
      formulaEscapedCount: 1
    },
    events: {
      eventCount: 9,
      eventLogPath: path.join(
        workspaceRoot,
        ".deepseek-workbench",
        "events.jsonl"
      )
    },
    replaySummary: {
      draftCount: 1
    }
  };
}

function fixedPreflight(
  overrides: Partial<RunnerPreflightSummary> = {}
): RunnerPreflightSummary {
  return {
    ok: true,
    mode: "dev_source_tree",
    runnerFound: true,
    nodeAvailable: true,
    payloadLimitBytes: maxPayloadTextBytes,
    warnings: [],
    statusCode: "DEV_SOURCE_TREE_READY",
    runnerStatus: "Ready",
    packagedStandaloneSupport: "Source-tree runner",
    nextAction: "Run Convert with a sanitized BrowserDomPayload",
    ...overrides
  };
}

function fixedEventSummary(
  overrides: Partial<WorkspaceEventSummary> = {}
): WorkspaceEventSummary {
  return {
    ok: true,
    eventLogPath: "D:\\workspace\\.deepseek-workbench\\events.jsonl",
    eventCount: 2,
    displayedEventCount: 2,
    taskCount: 1,
    completedTaskCount: 1,
    draftCount: 1,
    lastEventAt: "2026-06-16T00:00:01.000Z",
    typeCounts: {
      "task.completed": 1,
      "fs.draft_written": 1
    },
    timeline: [
      {
        id: "event-1",
        ts: "2026-06-16T00:00:00.000Z",
        type: "fs.draft_written",
        taskId: "task-1",
        summary: "draft written: drafts/table.csv · 42 bytes · text/csv",
        safePayloadKeys: ["relativePath", "bytes", "contentType"]
      }
    ],
    safetyScan: {
      ok: true,
      findings: 0,
      warningCodes: []
    },
    warnings: [],
    ...overrides
  };
}

function fixedBridgePreview(
  payload: BrowserDomPayload
): BridgeProposalPreviewState {
  const runtimePreview = createBridgeProposalPreview({
    proposalId: "proposal-1",
    sessionId: "session-1",
    proposal: {
      payload,
      extensionId: "extension-under-test",
      extensionVersion: "0.1.0"
    },
    receivedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T00:05:00.000Z"
  });
  const normalized = normalizeBridgeProposalPreview(runtimePreview);
  if (normalized === undefined) {
    throw new Error("bridge preview fixture did not normalize");
  }
  return normalized;
}

function runNodeScript(args: string[]): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}>;
function runNodeScript(
  args: string[],
  options: { cwd?: string }
): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}>;
function runNodeScript(
  args: string[],
  options: { cwd?: string } = {}
): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: options.cwd ?? repoRoot,
        timeout: 120_000,
        env: sanitizedTestEnv()
      },
      (error, stdout, stderr) => {
        if (error !== null && "code" in error) {
          resolve({ code: error.code as number, stdout, stderr });
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

function parseRunnerError(stderr: string): Record<string, unknown> {
  const lines = stderr.trim().split(/\r?\n/).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? "{}";
  return JSON.parse(lastLine) as Record<string, unknown>;
}

function sanitizedTestEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !/API_KEY|TOKEN|AUTH|SECRET|PASSWORD|CREDENTIAL|BEARER/i.test(key)
    )
  );
}

describe("desktop shell safety helpers", () => {
  it("validates payload JSON before invoking the flow", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();

    const validation = validateDesktopFlowInput({
      workspaceRoot,
      payloadText: JSON.stringify(payload),
      filename: "table.csv"
    });

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.request.workspaceRoot).toBe(workspaceRoot);
      expect(JSON.parse(validation.request.payloadJson)).toMatchObject({
        schemaVersion: payload.schemaVersion
      });
    }
  });

  it("returns a safe validation error for invalid payload text", async () => {
    const secret = "sk-test1234567890abcdef";
    const parsed = parsePayloadJson(`{"leaked":"${secret}"`);
    const message = safeErrorMessage(new Error(`bad payload ${secret}`));

    expect(parsed.ok).toBe(false);
    expect(message).not.toContain(secret);
  });

  it("rejects oversized pasted payload text", () => {
    const oversized = "x".repeat(maxPayloadTextBytes + 1);

    expect(validatePayloadTextSize(oversized)).toBe(
      "Payload JSON is too large"
    );
    expect(
      validateDesktopFlowInput({
        workspaceRoot: "D:\\workspace",
        payloadText: oversized
      })
    ).toMatchObject({
      ok: false,
      errorMessage: "Payload JSON is too large"
    });
  });

  it("requires a workspace path", () => {
    const validation = validateDesktopFlowInput({
      workspaceRoot: " ",
      payloadText: "{}"
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errorMessage).toContain("Workspace root is required");
    }
  });

  it("lets the existing flow reject traversal filenames without writing a draft", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();

    await expect(
      runWebTableToCsvFlow({
        workspaceRoot,
        payload,
        filename: "../evil.csv"
      })
    ).rejects.toThrow();
    await expect(
      access(path.join(workspaceRoot, "drafts", "evil.csv"))
    ).rejects.toThrow();
  });

  it("builds a result panel model without CSV content", async () => {
    const workspaceRoot = await createTempWorkspace();
    const model = buildResultPanelModel(fixedResult(workspaceRoot));

    expect(model.draftRelativePath).toBe("drafts/table.csv");
    expect(JSON.stringify(model)).not.toContain("name,amount");
    expect(JSON.stringify(model)).not.toContain("=SUM(A1:A2)");
  });

  it("normalizes real Rust-style camelCase desktop flow responses", async () => {
    const workspaceRoot = await createTempWorkspace();
    const normalized = normalizeDesktopFlowResult(fixedResult(workspaceRoot));

    expect(normalized.draft.relativePath).toBe("drafts/table.csv");
    expect(normalized.events.eventLogPath).toContain(".deepseek-workbench");
    expect(normalized.replaySummary.draftCount).toBe(1);
  });

  it("normalizes legacy snake_case desktop flow responses safely", async () => {
    const workspaceRoot = await createTempWorkspace();
    const normalized = normalizeDesktopFlowResult({
      draft: {
        relative_path: "drafts/table.csv",
        absolute_path: path.join(workspaceRoot, "drafts", "table.csv"),
        bytes: 42,
        sha256: "a".repeat(64),
        content_type: "text/csv"
      },
      extraction: {
        row_count: 4,
        column_count: 3,
        warning_count: 1,
        injection_risk_count: 1,
        formula_escaped_count: 1
      },
      events: {
        event_count: 9,
        event_log_path: path.join(
          workspaceRoot,
          ".deepseek-workbench",
          "events.jsonl"
        )
      },
      replay_summary: {
        draft_count: 1
      }
    });

    expect(normalized.draft.relativePath).toBe("drafts/table.csv");
    expect(normalized.replaySummary.draftCount).toBe(1);
  });

  it("turns malformed desktop flow success into a safe invalid response error", () => {
    expect(() => normalizeDesktopFlowResult({ ok: true })).toThrow(
      "Desktop flow draft summary was invalid"
    );
  });

  it("normalizes bridge proposal previews without raw payload in the panel model", async () => {
    const payload = await readFixture();
    const preview = fixedBridgePreview(payload);
    const model = buildBridgeProposalPreviewModel(preview);
    const serializedModel = JSON.stringify(model);

    expect(model).toMatchObject({
      proposalId: "proposal-1",
      sessionId: "session-1",
      source: "example.com/reports/table",
      tableSummary: "1 table(s), 4 row(s), 3 column(s)",
      warningSummary: "1 warning(s), 1 injection risk(s)",
      importDisabled: false,
      rejectDisabled: false
    });
    expect(serializedModel).not.toContain("Product");
    expect(serializedModel).not.toContain("北京");
    expect(serializedModel).not.toContain("ignore previous");
    expect(serializedModel).not.toContain("token=");
  });

  it("imports bridge proposals only into payload editor state", async () => {
    const payload = await readFixture();
    const preview = fixedBridgePreview(payload);

    const decision = importBridgeProposalToPayloadEditor(
      preview,
      "2026-01-01T00:00:00.000Z"
    );

    expect(decision).toMatchObject({
      ok: true,
      autoConvert: false,
      fileWritten: false,
      eventWritten: false
    });
    expect(
      decision.ok ? JSON.parse(decision.payloadText).schemaVersion : 0
    ).toBe(1);
    expect(decision.ok ? decision.preview.status : "blocked").toBe("imported");
  });

  it("blocks expired and rejected bridge proposal imports", async () => {
    const payload = await readFixture();
    const preview = fixedBridgePreview(payload);
    const expired = {
      ...preview,
      expiresAt: "2026-01-01T00:00:01.000Z"
    };

    expect(
      importBridgeProposalToPayloadEditor(expired, "2026-01-01T00:00:02.000Z")
    ).toMatchObject({
      ok: false,
      autoConvert: false,
      fileWritten: false,
      eventWritten: false
    });

    const rejected = rejectBridgeProposal(preview);
    expect(rejected).toMatchObject({
      status: "rejected",
      sanitizedPayloadJson: ""
    });
    expect(
      importBridgeProposalToPayloadEditor(rejected, "2026-01-01T00:00:00.000Z")
    ).toMatchObject({
      ok: false,
      safeMessage: "Bridge proposal was rejected"
    });
  });

  it("renders empty bridge preview gate as disabled dry UX", () => {
    const model = buildBridgeProposalPreviewModel(undefined);

    expect(model.emptyMessage).toContain("No live bridge is enabled");
    expect(model.importDisabled).toBe(true);
    expect(model.rejectDisabled).toBe(true);
    expect(JSON.stringify(model)).not.toContain("rawDom");
  });
});

describe("desktop command wrapper", () => {
  it("refuses unknown command names", async () => {
    await expect(invokeAllowedCommand("unknown_command", {})).rejects.toThrow(
      "not allowed"
    );
    expect(isAllowedDesktopCommand("check_runner_preflight")).toBe(true);
    expect(isAllowedDesktopCommand("load_workspace_event_summary")).toBe(true);
    expect(isAllowedDesktopCommand("run_web_table_to_csv_flow")).toBe(true);
  });

  it("reads runner preflight through the fixed command", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("check_runner_preflight");
      expect(args).toMatchObject({ workspaceRoot: "D:\\workspace" });
      return fixedPreflight({ workspaceValid: true }) as never;
    };

    const preflight = await checkDesktopRunnerPreflight(
      "D:\\workspace",
      invoke
    );

    expect(preflight.ok).toBe(true);
    expect(runnerPreflightMessage(preflight)).toContain("Ready");
    expect(preflight.statusCode).toBe("DEV_SOURCE_TREE_READY");
    expect(canRunWithPreflight(preflight)).toBe(true);
  });

  it("reports node-missing preflight as a safe error", async () => {
    const secret = "sk-test1234567890abcdef";
    const invoke: TauriInvoke = async () =>
      fixedPreflight({
        ok: false,
        nodeAvailable: false,
        statusCode: "NODE_RUNTIME_NOT_FOUND",
        errorCode: "NODE_RUNTIME_NOT_FOUND",
        safeMessage: `Node runtime was not found ${secret}`,
        runnerStatus: "Node missing",
        nextAction: "Install Node.js and rerun preflight"
      }) as never;

    const preflight = await checkDesktopRunnerPreflight(undefined, invoke);

    expect(preflight.ok).toBe(false);
    expect(preflight.errorCode).toBe("NODE_RUNTIME_NOT_FOUND");
    expect(safeErrorMessage(preflight.safeMessage)).not.toContain(secret);
  });

  it("normalizes runner preflight and event summaries from Rust response shapes", () => {
    const preflight = normalizeRunnerPreflightSummary(
      fixedPreflight({ workspaceValid: true })
    );
    const eventSummary = normalizeWorkspaceEventSummary(fixedEventSummary());

    expect(preflight.statusCode).toBe("DEV_SOURCE_TREE_READY");
    expect(preflight.runnerFound).toBe(true);
    expect(eventSummary.displayedEventCount).toBe(2);
    expect(eventSummary.timeline).toHaveLength(1);
  });

  it("safeInvoke catches string, object, Error, and malformed success responses", async () => {
    await expect(
      safeInvoke("run_web_table_to_csv_flow", {}, async () => {
        throw "Desktop flow failed with exit code 1";
      })
    ).rejects.toThrow("Desktop flow failed with exit code 1");

    await expect(
      safeInvoke("run_web_table_to_csv_flow", {}, async () => {
        throw {
          ok: false,
          errorCode: "FILE_EXISTS",
          safeMessage:
            "Draft already exists: drafts/web-table-export.csv. Choose a new draft filename or remove the existing file.",
          stage: "write_draft",
          exitCode: 1,
          stdoutJsonParsed: true
        };
      })
    ).rejects.toMatchObject({
      errorCode: "FILE_EXISTS",
      stage: "write_draft",
      exitCode: 1,
      stdoutJsonParsed: true
    });

    await expect(
      safeInvoke("load_workspace_event_summary", {}, async () => {
        throw new Error("Event summary failed safely");
      })
    ).rejects.toThrow("Event summary failed safely");

    await expect(
      invokeAllowedCommand(
        "run_web_table_to_csv_flow",
        {},
        async () => ({ ok: true }) as never
      )
    ).rejects.toMatchObject({
      errorCode: "INVALID_RESPONSE"
    });
  });

  it("normalizes object command errors without leaking raw input", () => {
    const secret = "sk-test1234567890abcdef";
    const error = normalizeDesktopCommandError({
      errorCode: "INVALID_PAYLOAD",
      safeMessage: `Payload JSON is not valid JSON ${secret}`,
      stage: "load_payload",
      runnerFound: true,
      nodeAvailable: true
    });

    expect(error.errorCode).toBe("INVALID_PAYLOAD");
    expect(error.runnerFound).toBe(true);
    expect(safeErrorMessage(error)).not.toContain(secret);
  });

  it("reports runner-missing preflight as a safe error", async () => {
    const invoke: TauriInvoke = async () =>
      fixedPreflight({
        ok: false,
        runnerFound: false,
        statusCode: "RUNNER_NOT_FOUND",
        errorCode: "RUNNER_NOT_FOUND",
        safeMessage: "Desktop runner could not be found",
        runnerStatus: "Runner missing",
        nextAction:
          "Run from the repository source tree or restore app/scripts/run-flow.mjs"
      }) as never;

    const preflight = await checkDesktopRunnerPreflight(undefined, invoke);

    expect(preflight.ok).toBe(false);
    expect(preflight.runnerFound).toBe(false);
    expect(runnerPreflightMessage(preflight)).toBe(
      "Desktop runner could not be found"
    );
  });

  it("does not treat packaged mode as supported without a bundled runner", () => {
    const preflight = fixedPreflight({
      ok: false,
      mode: "packaged_not_supported",
      statusCode: "PACKAGED_MODE_REQUIRES_SOURCE_TREE",
      errorCode: "PACKAGED_MODE_REQUIRES_SOURCE_TREE",
      safeMessage: "Packaged mode requires the source-tree runner in v0.1",
      runnerStatus: "Ready",
      packagedStandaloneSupport: "Source-tree required",
      nextAction: "Use pnpm app:dev or keep the source-tree runner available"
    });

    expect(canRunWithPreflight(preflight)).toBe(false);
    expect(runnerPreflightMessage(preflight)).toContain("Packaged mode");
    expect(preflight.packagedStandaloneSupport).toBe("Source-tree required");
    expect(preflight.nextAction).toContain("pnpm app:dev");
  });

  it("renders packaged limitation details without raw input", () => {
    const secret = "sk-test1234567890abcdef";
    const preflight = fixedPreflight({
      ok: false,
      mode: "packaged_with_resources",
      statusCode: "PACKAGED_RUNNER_NOT_BUNDLED",
      errorCode: "PACKAGED_RUNNER_NOT_BUNDLED",
      safeMessage: "Packaged runner resources are not bundled in v0.1",
      packagedStandaloneSupport: "Not bundled",
      nextAction: `Use pnpm app:dev from the source tree for v0.1 ${secret}`
    });
    const uiText = safeErrorMessage(
      `${runnerPreflightMessage(preflight)} ${preflight.nextAction}`
    );

    expect(canRunWithPreflight(preflight)).toBe(false);
    expect(preflight.statusCode).toBe("PACKAGED_RUNNER_NOT_BUNDLED");
    expect(uiText).toContain("Packaged runner resources");
    expect(uiText).not.toContain(secret);
  });

  it("invokes the fixed flow command without exposing env key values", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();
    const secret = "sk-test1234567890abcdef";
    const keyName = ["DEEPSEEK", "API", "KEY"].join("_");
    process.env[keyName] = secret;

    const calls: Array<{ command: string; args?: Record<string, unknown> }> =
      [];
    const invoke: TauriInvoke = async (command, args) => {
      calls.push(args === undefined ? { command } : { command, args });
      if (command === "check_runner_preflight") {
        return fixedPreflight({ workspaceValid: true }) as never;
      }
      return fixedResult(workspaceRoot) as never;
    };

    const result = await runDesktopWebTableToCsvFlow(
      {
        workspaceRoot,
        payloadText: JSON.stringify(payload),
        filename: "table.csv"
      },
      invoke
    );

    expect(result.draft.relativePath).toBe("drafts/table.csv");
    expect(calls).toHaveLength(2);
    expect(calls[0]?.command).toBe("check_runner_preflight");
    expect(calls[1]?.command).toBe("run_web_table_to_csv_flow");
    expect(JSON.stringify(calls)).not.toContain(secret);

    delete process.env[keyName];
  });

  it("blocks conversion when preflight fails", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();
    const calls: string[] = [];
    const invoke: TauriInvoke = async (command) => {
      calls.push(command);
      return fixedPreflight({
        ok: false,
        runnerFound: false,
        statusCode: "RUNNER_NOT_FOUND",
        errorCode: "RUNNER_NOT_FOUND",
        safeMessage: "Desktop runner could not be found",
        runnerStatus: "Runner missing",
        nextAction:
          "Run from the repository source tree or restore app/scripts/run-flow.mjs"
      }) as never;
    };

    await expect(
      runDesktopWebTableToCsvFlow(
        {
          workspaceRoot,
          payloadText: JSON.stringify(payload),
          filename: "table.csv"
        },
        invoke
      )
    ).rejects.toThrow("Desktop runner could not be found");
    expect(calls).toEqual(["check_runner_preflight"]);
  });

  it("loads event summaries only through the fixed workspace command", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("load_workspace_event_summary");
      expect(args).toEqual({
        workspaceRoot: "D:\\workspace",
        maxEvents: 25
      });
      return fixedEventSummary() as never;
    };

    const summary = await loadWorkspaceEventSummary(
      "D:\\workspace",
      25,
      invoke
    );

    expect(summary.ok).toBe(true);
    expect(summary.draftCount).toBe(1);
    expect(JSON.stringify(summary)).not.toContain("csvContent");
  });

  it("builds a safe no-events model", () => {
    const model = buildEventLogPanelModel(
      fixedEventSummary({
        eventCount: 0,
        displayedEventCount: 0,
        taskCount: 0,
        completedTaskCount: 0,
        draftCount: 0,
        typeCounts: {},
        timeline: []
      })
    );

    expect(model?.emptyMessage).toBe(
      "No events yet. Run Convert first, then refresh."
    );
    expect(JSON.stringify(model)).not.toContain("rawDom");
    expect(JSON.stringify(model)).not.toContain("csvContent");
  });

  it("renders undefined and malformed event summaries without throwing", () => {
    expect(buildEventLogPanelModel(undefined)).toBeUndefined();
    expect(buildEventLogPanelModel(null)).toBeUndefined();

    const malformed = {
      ok: true,
      eventCount: Number.NaN,
      displayedEventCount: undefined,
      taskCount: undefined,
      completedTaskCount: undefined,
      draftCount: undefined,
      safetyScan: undefined,
      warnings: undefined,
      timeline: [{ id: "bad" }]
    } as unknown as WorkspaceEventSummary;
    const model = buildEventLogPanelModel(malformed);

    expect(model).toMatchObject({
      eventCount: 0,
      displayedEventCount: 1,
      taskCount: 0,
      completedTaskCount: 0,
      draftCount: 0,
      safetyOk: false,
      safetyFindingCount: 0,
      warnings: ["MALFORMED_EVENT_SUMMARY"],
      timeline: [
        {
          id: "bad",
          taskId: "no task",
          summary: "unknown.event event"
        }
      ]
    });
  });

  it("normalizes null timeline fields without throwing", () => {
    expect(safeText(null)).toBe("—");
    expect(safeShort(null)).toBe("—");
    expect(safeArray(null)).toEqual([]);

    const item = normalizeTimelineItem(
      {
        id: null,
        ts: null,
        type: null,
        taskId: null,
        summary: null,
        safePayloadKeys: null
      },
      0
    );

    expect(item).toMatchObject({
      id: "event-1",
      key: "event-1-0",
      ts: "unknown time",
      type: "unknown.event",
      taskId: "no task",
      taskIdShort: "no task",
      summary: "unknown.event event",
      safePayloadKeys: []
    });
  });

  it("renders event timeline items with null taskId/id/summary safely", () => {
    const summary = {
      ok: true,
      eventCount: 1,
      displayedEventCount: 1,
      taskCount: 0,
      completedTaskCount: 0,
      draftCount: 1,
      lastEventAt: null,
      typeCounts: null,
      timeline: [
        {
          id: null,
          ts: "2026-06-16T00:00:00.000Z",
          type: "fs.draft_written",
          taskId: null,
          summary: null,
          safePayloadKeys: null
        }
      ],
      safetyScan: null,
      warnings: null
    } as unknown as WorkspaceEventSummary;
    const model = buildEventLogPanelModel(summary);

    expect(model?.timeline).toHaveLength(1);
    expect(model?.timeline[0]).toMatchObject({
      id: "event-1",
      taskId: "no task",
      taskIdShort: "no task",
      summary: "fs.draft_written event",
      safePayloadKeys: []
    });
    expect(model?.warnings).toContain("MALFORMED_EVENT_SUMMARY");
    expect(model?.safetyOk).toBe(false);
  });

  it("normalizes event summary null timeline and warning codes safely", () => {
    const summary = normalizeEventSummary({
      ok: true,
      eventCount: 2,
      displayedEventCount: 2,
      taskCount: 1,
      completedTaskCount: 1,
      draftCount: 1,
      typeCounts: null,
      timeline: null,
      safetyScan: {
        ok: false,
        findings: 1,
        warningCodes: null
      },
      warnings: null
    });
    const model = buildEventLogPanelModel(summary);

    expect(summary.timeline).toEqual([]);
    expect(model?.timeline).toEqual([]);
    expect(model?.warnings).toContain("MALFORMED_EVENT_SUMMARY");
    expect(model?.safetyFindingCount).toBe(1);
  });

  it("models refresh and convert event summaries with null taskId without ErrorBoundary fallback", async () => {
    const summary = normalizeWorkspaceEventSummary({
      ok: true,
      eventCount: 1,
      displayedEventCount: 1,
      taskCount: 0,
      completedTaskCount: 0,
      draftCount: 1,
      typeCounts: {},
      timeline: [
        {
          id: "event-1",
          ts: "2026-06-16T00:00:00.000Z",
          type: "fs.draft_written",
          taskId: null,
          summary: "draft written",
          safePayloadKeys: null
        }
      ],
      safetyScan: {
        ok: true,
        findings: 0,
        warningCodes: null
      },
      warnings: []
    });
    const model = buildEventLogPanelModel(summary);
    const serialized = JSON.stringify(model);

    expect(model?.timeline[0]?.taskId).toBe("no task");
    expect(model?.timeline[0]?.summary).toBe("draft written");
    expect(serialized).not.toContain("Desktop shell recovered");
    expect(serialized).not.toContain("rawDom");
  });

  it("builds safe UI error fallback copy without raw payload values", () => {
    const secret = "sk-test1234567890abcdef";
    const message = buildUiErrorFallbackMessage(
      new Error(`render failed with raw payload ${secret}`)
    );

    expect(message).toBe("Desktop shell recovered from a UI error.");
    expect(message).not.toContain(secret);
  });

  it("keeps event panel model on safe summaries only", () => {
    const secret = "sk-test1234567890abcdef";
    const model = buildEventLogPanelModel(
      fixedEventSummary({
        safetyScan: {
          ok: false,
          findings: 2,
          warningCodes: ["CSV_CONTENT_MARKER", "RAW_DOM_MARKER"]
        },
        warnings: ["CSV_CONTENT_MARKER", "RAW_DOM_MARKER"],
        timeline: [
          {
            id: "event-2",
            ts: "2026-06-16T00:00:02.000Z",
            type: "tool.executed",
            summary: "tool.executed: fs.write_draft · drafts/table.csv",
            safePayloadKeys: ["toolName", "resultSummary"]
          }
        ],
        safeMessage: `safe message ${secret}`
      })
    );
    const serialized = safeErrorMessage(JSON.stringify(model));

    expect(model?.safetyOk).toBe(false);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("name,value");
  });
});

describe("desktop runner sidecar safety", () => {
  it("rejects oversized payload files with a safe error", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payloadPath = path.join(workspaceRoot, "payload.json");
    const secret = "sk-test1234567890abcdef";
    await writeFile(
      payloadPath,
      `${"x".repeat(maxPayloadTextBytes + 1)}${secret}`,
      "utf8"
    );

    const result = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      payloadPath
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Payload file is too large");
    expect(parseRunnerError(result.stderr)).toMatchObject({
      ok: false,
      errorCode: "INVALID_PAYLOAD",
      errorKind: "invalid_payload",
      safeMessage: "Payload file is too large",
      stage: "load_payload"
    });
    expect(result.stderr).not.toContain(secret);
    expect(result.stdout).toBe("");
  });

  it("returns safe errors for unsupported runner arguments", async () => {
    const workspaceRoot = await createTempWorkspace();
    const result = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--unknown"
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unsupported desktop runner argument");
    expect(parseRunnerError(result.stderr)).toMatchObject({
      ok: false,
      errorCode: "INVALID_ARGUMENTS",
      errorKind: "invalid_arguments",
      stage: "parse_args"
    });
    expect(result.stderr).not.toContain("csvContent");
    expect(result.stdout).toBe("");
  });

  it("returns a structured safe error when a draft already exists", async () => {
    const workspaceRoot = await createTempWorkspace();
    const first = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--filename",
      "existing.csv"
    ]);
    const second = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--filename",
      "existing.csv"
    ]);
    const error = parseRunnerError(second.stderr);

    expect(first.code).toBe(0);
    expect(second.code).toBe(1);
    expect(error).toMatchObject({
      ok: false,
      errorCode: "FILE_EXISTS",
      errorKind: "file_exists",
      safeMessage:
        "Draft already exists: drafts/existing.csv. Choose a new draft filename or remove the existing file.",
      stage: "write_draft"
    });
    expect(second.stderr).not.toContain("Desktop flow failed with exit code 1");
    expect(second.stderr).not.toContain("北京");
    expect(second.stderr).not.toContain("ignore previous instructions");
    expect(second.stderr).not.toContain("csvContent");
    expect(second.stdout).toBe("");
  });

  it("returns a structured safe error for invalid payload JSON", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payloadPath = path.join(workspaceRoot, "invalid-payload.json");
    const secret = "sk-test1234567890abcdef";
    await writeFile(payloadPath, `{"leaked":"${secret}"`, "utf8");

    const result = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      payloadPath
    ]);
    const error = parseRunnerError(result.stderr);

    expect(result.code).toBe(1);
    expect(error).toMatchObject({
      ok: false,
      errorCode: "INVALID_PAYLOAD",
      errorKind: "invalid_payload",
      safeMessage: "Payload JSON is not valid JSON",
      stage: "load_payload"
    });
    expect(result.stderr).not.toContain(secret);
    expect(result.stdout).toBe("");
  });

  it("prints only the safe desktop summary contract", async () => {
    const workspaceRoot = await createTempWorkspace();
    const result = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--filename",
      "runner-contract.csv"
    ]);
    const summary = JSON.parse(result.stdout) as Record<string, unknown>;
    const serialized = JSON.stringify(summary);

    expect(result.code).toBe(0);
    expect(summary).toHaveProperty("draft");
    expect(summary).toHaveProperty("extraction");
    expect(summary).toHaveProperty("events");
    expect(summary).toHaveProperty("replaySummary");
    expect(serialized).not.toContain("csvContent");
    expect(serialized).not.toContain("rawDom");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("?token=");
    expect(
      (summary.extraction as Record<string, unknown>).sourceHost
    ).toBeUndefined();
    expect(
      (summary.replaySummary as Record<string, unknown>).tasks
    ).toBeUndefined();
  });

  it("runs the sidecar successfully from the Tauri-like cwd with absolute args", async () => {
    const workspaceRoot = await createTempWorkspace();
    const result = await runNodeScript(
      [
        appScriptRunnerPath,
        "--workspace",
        workspaceRoot,
        "--payload",
        fixturePath,
        "--filename",
        "tauri-cwd.csv"
      ],
      {
        cwd: path.join(appRoot, "src-tauri")
      }
    );
    const summary = JSON.parse(result.stdout) as DesktopFlowResult;

    expect(result.code).toBe(0);
    expect(summary.draft.relativePath).toBe("drafts/tauri-cwd.csv");
    expect(summary.replaySummary.draftCount).toBe(1);
    expect(result.stderr).toBe("");
  });

  it("runs the offline app preflight script", async () => {
    const result = await runNodeScript([appPreflightScriptPath]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Desktop runner preflight");
    expect(result.stdout).toContain("status: PASS");
    expect(result.stdout).not.toContain("csvContent");
    expect(result.stderr).toBe("");
  });
});

describe("desktop flow integration", () => {
  it("runs the runtime flow for a fixture and writes under workspace/drafts", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();

    const result = await runWebTableToCsvFlow({
      workspaceRoot,
      payload,
      filename: "desktop-table.csv"
    });

    expect(result.draft.relativePath).toBe("drafts/desktop-table.csv");
    expect(result.extraction.rowCount).toBeGreaterThan(0);
    expect(result.replaySummary.draftCount).toBe(1);
    await expect(access(result.draft.absolutePath)).resolves.toBeUndefined();
  });
});

describe("desktop source boundaries", () => {
  it("keeps refresh events and docs actions from navigating or resetting UI state", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );

    expect(appSource).toContain("Local web-table-to-CSV workflow");
    expect(appSource).toContain("Source-tree mode / Preflight OK");
    expect(appSource).toContain("No native bridge");
    expect(appSource).toContain("workspace/drafts/");
    expect(appSource).toContain(
      "No events yet. Run Convert first, then refresh."
    );
    expect(appSource).toContain("summary-only check of events.jsonl");
    expect(appSource).toContain("docs/desktop-event-log-smoke-v0.1.md");
    expect(appSource).toContain("Local docs path:");
    expect(appSource).toContain("DesktopErrorBoundary");
    expect(appSource).toContain("Reset UI state");
    expect(appSource).toContain("Event log events");
    expect(appSource).toContain("Bridge Proposal Preview (dry)");
    expect(appSource).toContain("Import to Payload Editor");
    expect(appSource).toContain("Reject Proposal");
    expect(appSource).toContain("No live bridge is enabled");
    expect(appSource).toContain("Convert still requires a separate click");
    expect(appSource).not.toContain("Events written");
    expect(appSource).not.toContain(".slice(");
    expect(appSource).not.toContain(
      'href="../docs/desktop-event-log-smoke-v0.1.md"'
    );
    expect(appSource).not.toContain("<a href=");
    expect(appSource).not.toContain("setEventSummary(undefined);");
    expect(appSource).toContain("event.preventDefault();");
    expect(appSource).toContain("event.stopPropagation();");
    expect(appSource).toContain("void refreshEvents();");
    expect(appSource).toContain(
      'setDocMessage("docs/desktop-event-log-smoke-v0.1.md")'
    );
  });

  it("does not include native bridge or arbitrary shell plugin references in app source", async () => {
    const sourceFiles = [
      "src/App.tsx",
      "src/desktop-flow.ts",
      "src/safety.ts",
      "scripts/preflight.mjs",
      "scripts/run-flow.mjs",
      "src-tauri/src/main.rs",
      "src-tauri/src/commands.rs",
      "src-tauri/tauri.conf.json",
      "src-tauri/capabilities/default.json"
    ];
    const sources = await Promise.all(
      sourceFiles.map(async (file) => ({
        file,
        text: await readFile(path.join(appRoot, file), "utf8")
      }))
    );
    const combined = sources.map((source) => source.text).join("\n");
    const nonCommandSource = sources
      .filter((source) => source.file !== "src-tauri/src/commands.rs")
      .map((source) => source.text)
      .join("\n");
    const commandSource = sources.find(
      (source) => source.file === "src-tauri/src/commands.rs"
    )?.text;

    expect(combined).not.toContain("nativeMessaging");
    expect(combined).not.toContain("@tauri-apps/plugin-shell");
    expect(combined).not.toContain("Command::new(command");
    expect(nonCommandSource).not.toContain("localStorage");
    expect(nonCommandSource).not.toContain("sessionStorage");
    expect(combined).not.toContain("shell:allow");
    expect(combined).toContain(".current_dir(cwd)");
    expect(combined).toContain(".args(args)");
    expect(combined).toContain("env_clear()");
    expect(combined).toContain("sanitize_env_vars");
    expect(combined).toContain("RUNNER_TIMEOUT");
    expect(combined).toContain('join("run-flow.mjs")');
    expect(commandSource).toContain("LOCAL_STORAGE_MARKER");
    expect(commandSource).toContain("SESSION_STORAGE_MARKER");
  });

  it("keeps desktop QA docs and RC copy aligned with safety boundaries", async () => {
    const docs = await Promise.all(
      [
        "desktop-manual-qa-v0.1.md",
        "desktop-rc-checklist-v0.1.md",
        "desktop-troubleshooting-v0.1.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("nativeMessaging");
    expect(combined).toContain("desktop action");
    expect(combined).toContain("raw browser DOM");
    expect(combined).toContain("raw CSV");
    expect(combined).toContain("MCP");
    expect(combined).toContain("No `nativeMessaging`");
    expect(combined).toContain("API keys");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain(
      "Get-Content D:\\workspaces\\demo\\.deepseek-workbench\\events.jsonl -TotalCount 5"
    );
    expect(combined).not.toMatch(/fully standalone packaged runner is ready/i);
    expect(combined).not.toMatch(
      /automatic extension-to-app bridge is supported/i
    );
  });

  it("documents bridge transport choice and implementation gate without enabling transport", async () => {
    const docs = await Promise.all(
      [
        "adr/0003-bridge-transport-choice.md",
        "bridge-implementation-gate-v0.1.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("Native Messaging");
    expect(combined).toMatch(/localhost loopback HTTP/i);
    expect(combined).toMatch(/local drop folder/i);
    expect(combined).toMatch(/custom URL protocol/i);
    expect(combined).toContain("manual import");
    expect(combined).toContain("Recommended Next Implementation Path");
    expect(combined).toContain("No auto Convert");
    expect(combined).toContain("No file write from bridge");
    expect(combined).toContain("Boundary checker updated");
    expect(combined).toContain("Rollback Strategy");
    expect(combined).toContain("adr/0003-bridge-transport-choice.md");
    expect(combined).toContain("bridge-implementation-gate-v0.1.md");
    expect(combined).toContain("localhost server enabled by default");
    expect(combined).not.toMatch(/localhost server is supported/i);
    expect(combined).not.toMatch(/automatic Convert is supported/i);
  });

  it("configures the offline desktop QA check without GUI or DeepSeek calls", async () => {
    const rootPackage = JSON.parse(
      await readFile(rootPackagePath, "utf8")
    ) as PackageJson;
    const appPackage = JSON.parse(
      await readFile(appPackagePath, "utf8")
    ) as PackageJson;
    const script = await readFile(appQaScriptPath, "utf8");

    expect(rootPackage.scripts["app:qa:check"]).toContain("qa:check");
    expect(appPackage.scripts["qa:check"]).toBe("node scripts/qa-check.mjs");
    expect(script).toContain("Desktop QA check");
    expect(script).toContain("app:preflight");
    expect(script).toContain("app:smoke");
    expect(script).toContain("events.jsonl");
    expect(script).toContain("scanEventLogForLeaks");
    expect(script).not.toContain("app:dev");
    expect(script).not.toContain("DEEPSEEK_API_KEY");
    expect(script).not.toContain("OPENAI_API_KEY");
  });
});

describe("desktop dev scripts", () => {
  it("keeps frontend dev separate from Tauri dev", async () => {
    const appPackage = JSON.parse(
      await readFile(appPackagePath, "utf8")
    ) as PackageJson;
    const rootPackage = JSON.parse(
      await readFile(rootPackagePath, "utf8")
    ) as PackageJson;

    expect(appPackage.scripts.dev).toContain("vite");
    expect(appPackage.scripts.dev).toContain("--port 5179");
    expect(appPackage.scripts.dev).toContain("--strictPort");
    expect(appPackage.scripts.dev).not.toContain("tauri dev");
    expect(appPackage.scripts["tauri:dev"]).toBe("tauri dev");
    expect(rootPackage.scripts["app:dev"]).toContain("tauri:dev");
    expect(rootPackage.scripts["app:dev"]).not.toMatch(/\bapp dev\b/);
  });

  it("keeps Tauri before commands pointed at frontend scripts", async () => {
    const tauriConfig = JSON.parse(
      await readFile(tauriConfigPath, "utf8")
    ) as TauriConfig;

    expect(tauriConfig.build.devUrl).toBe("http://localhost:5179");
    expect(tauriConfig.build.beforeDevCommand).toBe("pnpm dev");
    expect(tauriConfig.build.beforeBuildCommand).toBe("pnpm build");
    expect(tauriConfig.build.beforeDevCommand).not.toContain("tauri");
    expect(tauriConfig.build.beforeBuildCommand).not.toContain("tauri");
  });

  it("uses the same strict local port in Vite and Tauri config", async () => {
    const viteConfig = await readFile(viteConfigPath, "utf8");

    expect(viteConfig).toContain('host: "127.0.0.1"');
    expect(viteConfig).toContain("port: 5179");
    expect(viteConfig).toContain("strictPort: true");
  });
});

type PackageJson = {
  scripts: Record<string, string>;
};

type TauriConfig = {
  build: {
    beforeDevCommand: string;
    beforeBuildCommand: string;
    devUrl: string;
  };
};
