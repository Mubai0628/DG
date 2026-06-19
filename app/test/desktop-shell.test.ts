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
import { buildControlPlaneProjectionView } from "../src/control-plane-view.js";
import { buildWorkbenchSurfacesView } from "../src/workbench-surfaces.js";
import { buildPatchProposalSurfaceView } from "../src/patch-proposal-surface-view.js";
import { buildMemoryInspectorView } from "../src/memory-inspector-view.js";
import { buildChatRunCanvasView } from "../src/chat-run-canvas-view.js";
import { buildRunDraftView, summarizeRunDraft } from "../src/run-draft-view.js";
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

    expect(model.status).toBe("disabled");
    expect(model.emptyMessage).toContain("No live bridge is enabled");
    expect(model.emptyMessage).toContain(
      "Future extension-to-desktop proposals will appear here for preview"
    );
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

describe("app control-plane projection view", () => {
  it("builds an empty read-only projection for no event summary", () => {
    const view = buildControlPlaneProjectionView(undefined);

    expect(view).toMatchObject({
      status: "empty",
      runStatus: "created",
      intent: "web_data_extraction",
      phase: "intake",
      source: "empty"
    });
    expect(view.nextAction.label).toBe(
      "Run Convert first, then refresh events."
    );
  });

  it("projects a successful conversion event summary as completed web extraction", () => {
    const result = fixedResult("D:\\workspace");
    const view = buildControlPlaneProjectionView(
      fixedEventSummary(),
      result,
      fixedPreflight()
    );

    expect(view.status).toBe("projected");
    expect(view.runStatus).toBe("completed");
    expect(view.intent).toBe("web_data_extraction");
    expect(view.phase).toBe("result");
    expect(view.draftCount).toBe(1);
    expect(view.artifactRefs).toContainEqual(
      expect.objectContaining({
        relativePath: "drafts/table.csv",
        source: "conversion_result"
      })
    );
  });

  it("preserves the previous projection shape for FILE_EXISTS and gives safe next action", () => {
    const view = buildControlPlaneProjectionView(
      fixedEventSummary(),
      undefined,
      fixedPreflight(),
      {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists: drafts/table.csv. Choose a new draft filename or remove the existing file."
      }
    );

    expect(view.status).toBe("warning");
    expect(view.runStatus).toBe("completed");
    expect(view.artifactRefs).toContainEqual(
      expect.objectContaining({ relativePath: "drafts/table.csv" })
    );
    expect(view.nextAction.label).toBe(
      "Choose a new draft filename or remove the existing file."
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "FILE_EXISTS"
    );
  });

  it("handles malformed event summaries without throwing", () => {
    const view = buildControlPlaneProjectionView({
      ok: true,
      eventCount: Number.NaN,
      displayedEventCount: Number.NaN,
      taskCount: Number.NaN,
      completedTaskCount: Number.NaN,
      draftCount: Number.NaN,
      typeCounts: null,
      timeline: null,
      safetyScan: null,
      warnings: null
    } as unknown as WorkspaceEventSummary);

    expect(view.timelineCount).toBe(0);
    expect(view.taskCount).toBe(0);
    expect(view.completedTaskCount).toBe(0);
    expect(view.nextAction.label).toContain("Convert");
  });

  it("shows safety warning codes only and redacts unsafe messages", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildControlPlaneProjectionView(
      fixedEventSummary({
        ok: false,
        safeMessage: `Event summary failed ${secret}`,
        safetyScan: {
          ok: false,
          findings: 1,
          warningCodes: ["PASSWORD_VALUE_MARKER", `raw match ${secret}`]
        }
      })
    );
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("error");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "PASSWORD_VALUE_MARKER"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "EVENT_SUMMARY_WARNING"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("raw match");
  });

  it("keeps projection summaries free of raw CSV, raw payload, and API keys", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildControlPlaneProjectionView(
      fixedEventSummary({
        warnings: ["MALFORMED_EVENT_SUMMARY"],
        timeline: [
          {
            id: "event-1",
            ts: "2026-06-16T00:00:00.000Z",
            type: "fs.draft_written",
            taskId: "task-1",
            summary: "draft written: drafts/table.csv · 42 bytes · text/csv",
            safePayloadKeys: ["relativePath"]
          }
        ],
        safeMessage: `Safe message with ${secret}`
      })
    );
    const serialized = JSON.stringify(view);

    expect(serialized).toContain("drafts/table.csv");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("csvContent");
    expect(serialized).not.toContain("rawPayload");
    expect(serialized).not.toContain("rawDom");
  });
});

describe("app approval diff audit surfaces", () => {
  it("builds empty read-only approval and diff surfaces", () => {
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({ controlProjection });

    expect(surfaces.readOnly).toBe(true);
    expect(surfaces.executionEnabled).toBe(false);
    expect(surfaces.approval.status).toBe("empty");
    expect(surfaces.approval.emptyMessage).toBe(
      "No approvals yet. Future patch, capability, git, and shell proposals will appear here as summaries before any execution gate."
    );
    expect(surfaces.diff.status).toBe("empty");
    expect(surfaces.diff.emptyMessage).toBe(
      "No patch proposals yet. Future code changes will appear here as reviewable diffs before apply."
    );
  });

  it("maps event summary counts into the audit surface", () => {
    const eventSummary = fixedEventSummary();
    const controlProjection = buildControlPlaneProjectionView(eventSummary);
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection
    });

    expect(surfaces.audit.status).toBe("summary");
    expect(surfaces.audit.eventCount).toBe(2);
    expect(surfaces.audit.displayedEventCount).toBe(2);
    expect(surfaces.audit.timelineCount).toBe(1);
    expect(surfaces.audit.safetyStatus).toBe("ok");
    expect(surfaces.audit.lastEventAt).toBe("2026-06-16T00:00:01.000Z");
  });

  it("updates audit surface from conversion result and event summary", () => {
    const eventSummary = fixedEventSummary({ eventCount: 3 });
    const result = fixedResult("D:\\workspace");
    const controlProjection = buildControlPlaneProjectionView(
      eventSummary,
      result
    );
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      conversionResult: result
    });

    expect(controlProjection.runStatus).toBe("completed");
    expect(surfaces.audit.status).toBe("summary");
    expect(surfaces.audit.eventCount).toBe(3);
    expect(surfaces.audit.nextAction).toContain("Event Log / Replay");
  });

  it("keeps prior surface state for FILE_EXISTS with actionable next action", () => {
    const eventSummary = fixedEventSummary();
    const controlProjection = buildControlPlaneProjectionView(
      eventSummary,
      undefined,
      fixedPreflight(),
      {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists: drafts/table.csv. Choose a new draft filename or remove the existing file."
      }
    );
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      conversionError: {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists: drafts/table.csv. Choose a new draft filename or remove the existing file."
      }
    });

    expect(controlProjection.runStatus).toBe("completed");
    expect(surfaces.audit.eventCount).toBe(2);
    expect(surfaces.audit.warningCodes).toContain("FILE_EXISTS");
    expect(surfaces.audit.nextAction).toBe(
      "Choose a new draft filename or remove the existing file."
    );
  });

  it("summarizes future refs without raw source or secrets", () => {
    const secret = "sk-test1234567890abcdef";
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection,
      futureApprovalRefs: [
        {
          id: "approval-1",
          kind: "patch",
          status: "pending",
          summary: `Approve summary with ${secret}`
        }
      ],
      futurePatchRefs: [
        {
          id: "patch-1",
          fileCount: 1,
          linesAdded: 2,
          linesRemoved: 1,
          summary: `Diff summary with raw source ${secret}`
        }
      ]
    });
    const serialized = JSON.stringify(surfaces);

    expect(surfaces.approval.status).toBe("pending");
    expect(surfaces.diff.status).toBe("summary");
    expect(surfaces.diff.fileCount).toBe(1);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPayload");
    expect(serialized).not.toContain("csvContent");
    expect(serialized).not.toContain("rawDom");
  });

  it("keeps web table conversion from creating patch proposals in diff surface", () => {
    const eventSummary = fixedEventSummary();
    const result = fixedResult("D:\\workspace");
    const controlProjection = buildControlPlaneProjectionView(
      eventSummary,
      result
    );
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      conversionResult: result
    });

    expect(surfaces.diff.status).toBe("empty");
    expect(surfaces.diff.items).toHaveLength(0);
    expect(surfaces.diff.fileCount).toBe(0);
    expect(surfaces.diff.nextAction).toBe(
      "No patch proposals yet. Future code changes will appear here as reviewable diffs before apply."
    );
  });

  it("maps synthetic patch proposal summaries into the diff surface", () => {
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection,
      patchProposalSummaries: [
        {
          proposalId: "proposal-1",
          taskId: "task-1",
          title: "Update parser summary",
          status: "simulated",
          riskLevel: "A2_draft_write",
          requiresApproval: true,
          filesChanged: 2,
          filesCreated: 1,
          filesUpdated: 1,
          filesDeleted: 0,
          linesAdded: 14,
          linesRemoved: 3,
          pathSummaries: ["app/src/App.tsx", "app/src/workbench-surfaces.ts"],
          hash: "patch-hash-1",
          fingerprint: "patch-fingerprint-1",
          suggestedNextAction: "Patch apply is not enabled."
        }
      ]
    });

    expect(surfaces.diff.status).toBe("summary");
    expect(surfaces.diff.fileCount).toBe(2);
    expect(surfaces.diff.linesAdded).toBe(14);
    expect(surfaces.diff.linesRemoved).toBe(3);
    expect(surfaces.diff.items[0]?.proposalId).toBe("proposal-1");
    expect(surfaces.diff.items[0]?.requiresApproval).toBe(true);
    expect(surfaces.diff.items[0]?.pathSummaries).toEqual([
      "app/src/App.tsx",
      "app/src/workbench-surfaces.ts"
    ]);
  });

  it("maps synthetic patch audit warnings as warning codes only", () => {
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection,
      patchAuditReports: [
        {
          auditId: "audit-1",
          proposalId: "proposal-1",
          decision: "needs_approval",
          riskLevel: "A2_draft_write",
          pathWarnings: ["secret_marker:app/src/App.tsx"],
          contentWarnings: ["raw_marker"],
          hash: "audit-hash-1",
          suggestedNextAction: "request_changes"
        }
      ]
    });
    const serialized = JSON.stringify(surfaces);

    expect(surfaces.diff.status).toBe("warning");
    expect(surfaces.diff.warnings).toContain("SECRET_MARKER");
    expect(surfaces.diff.warnings).toContain("RAW_MARKER");
    expect(serialized).not.toContain("app/src/App.tsx");
    expect(serialized).not.toContain("secret_marker:app/src/App.tsx");
  });

  it("strips raw patch content fields from patch proposal surface view", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildPatchProposalSurfaceView({
      patchProposalSummaries: [
        {
          proposalId: "proposal-raw",
          taskId: "task-raw",
          title: `raw source ${secret}`,
          beforeContent: "const beforeSecret = true;",
          afterContent: `const token = "${secret}";`,
          rawPatch: "raw patch body",
          filesChanged: 1,
          linesAdded: 1,
          linesRemoved: 1,
          pathSummaries: ["runtime/src/index.ts"],
          hash: "hash-raw"
        }
      ]
    });
    const serialized = JSON.stringify(view);

    expect(view.items[0]?.title).toContain("[redacted-raw]");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("const beforeSecret");
    expect(serialized).not.toContain("raw patch body");
  });
});

describe("app memory inspector skeleton", () => {
  it("builds an empty read-only memory inspector view", () => {
    const view = buildMemoryInspectorView();

    expect(view.status).toBe("empty");
    expect(view.readOnly).toBe(true);
    expect(view.persistenceConnected).toBe(false);
    expect(view.typeCounts).toEqual({
      policy: 0,
      project_fact: 0,
      pitfall: 0
    });
    expect(view.candidateCount).toBe(0);
    expect(view.committedCount).toBe(0);
    expect(view.emptyMessages).toContain(
      "No memory records are connected to the desktop shell yet."
    );
    expect(view.emptyMessages).toContain(
      "Runtime Memory Core is available, but this inspector is read-only and not connected to persistence."
    );
  });

  it("counts policy project_fact and pitfall summaries", () => {
    const view = buildMemoryInspectorView({
      memorySummaries: [
        {
          memoryId: "mem-policy",
          type: "policy",
          status: "committed",
          summary: "Always keep bridge transport disabled by default."
        },
        {
          memoryId: "mem-pitfall",
          type: "pitfall",
          status: "revoked",
          summary: "Stale dry harness docs can confuse release state."
        }
      ],
      memoryRecallItems: [
        {
          memoryId: "mem-fact",
          type: "project_fact",
          status: "recalled",
          summary: "Desktop shell uses manual payload import."
        }
      ],
      memoryCandidates: [
        {
          candidateId: "candidate-pitfall",
          proposedType: "pitfall",
          proposedSummary: "Candidate summary only."
        }
      ]
    });

    expect(view.status).toBe("summary");
    expect(view.typeCounts).toEqual({
      policy: 1,
      project_fact: 1,
      pitfall: 2
    });
    expect(view.committedCount).toBe(1);
    expect(view.recalledCount).toBe(1);
    expect(view.revokedCount).toBe(1);
    expect(view.candidateCount).toBe(1);
  });

  it("keeps memory candidates summary-only and commit-gated", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildMemoryInspectorView({
      memoryCandidates: [
        {
          candidateId: "candidate-1",
          proposedType: "project_fact",
          status: "candidate",
          proposedSummary: `rawPrompt should not appear ${secret}`,
          source: "model",
          trustLevel: "model_suggested",
          reason: "Future candidate only"
        }
      ]
    });
    const serialized = JSON.stringify(view);

    expect(view.candidates[0]?.proposedSummary).toBe(
      "Summary withheld by safety policy."
    );
    expect(view.nextAction).toContain("Commit gate UI is not enabled");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("full content");
  });

  it("keeps memory item summaries free of raw content markers", () => {
    const view = buildMemoryInspectorView({
      memorySummaries: [
        {
          memoryId: "memory-1",
          type: "policy",
          status: "committed",
          trustLevel: "explicit_user",
          namespace: "desktop",
          summary: "Authorization header and clipboard details must not render",
          tags: ["safe", "rawDom marker"],
          provenanceRefCount: 1,
          evidenceRefCount: 2
        }
      ]
    });
    const serialized = JSON.stringify(view);

    expect(view.items[0]?.summary).toBe("Summary withheld by safety policy.");
    expect(view.items[0]?.tags).toContain("Summary withheld by safety policy.");
    expect(serialized).not.toContain("Authorization header");
    expect(serialized).not.toContain("clipboard");
    expect(serialized).not.toContain("rawDom");
  });

  it("preserves memory inspector state around refresh and FILE_EXISTS", () => {
    const eventSummary = fixedEventSummary({ eventCount: 4 });
    const empty = buildMemoryInspectorView({ eventSummary });
    const fileExists = buildMemoryInspectorView({
      eventSummary,
      conversionError: {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists. Choose a new draft filename or remove the existing file."
      }
    });

    expect(empty.status).toBe("empty");
    expect(empty.typeCounts.policy).toBe(0);
    expect(fileExists.status).toBe("warning");
    expect(fileExists.typeCounts.policy).toBe(0);
    expect(fileExists.warnings.map((warning) => warning.code)).toContain(
      "FILE_EXISTS"
    );
    expect(fileExists.nextAction).toBe(
      "Choose a new draft filename or remove the existing file."
    );
  });
});

describe("app chat run canvas skeleton", () => {
  it("builds empty draft-only chat run canvas view", () => {
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({ controlProjection });
    const memoryInspector = buildMemoryInspectorView();
    const view = buildChatRunCanvasView({
      controlProjection,
      memoryInspector,
      approvalDiffAuditSurfaces: surfaces
    });

    expect(view.status).toBe("empty");
    expect(view.source).toBe("local_state_only");
    expect(view.canCreateRun).toBe(false);
    expect(view.canSendToModel).toBe(false);
    expect(view.intent).toBe("unknown");
    expect(view.objectiveSummary).toBe("No objective draft yet.");
    expect(view.acceptanceCriteriaCount).toBe(0);
    expect(view.nextAction.label).toContain("No LLM request is sent");
  });

  it("builds local draft preview without enabling run or model send", () => {
    const eventSummary = fixedEventSummary({ eventCount: 5 });
    const result = fixedResult("D:\\workspace");
    const controlProjection = buildControlPlaneProjectionView(
      eventSummary,
      result
    );
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      conversionResult: result
    });
    const memoryInspector = buildMemoryInspectorView({ eventSummary });
    const view = buildChatRunCanvasView({
      objectiveDraft: "Export the visible table and inspect the summaries.",
      selectedIntent: "web_data_extraction",
      acceptanceCriteriaDraft: "CSV exists\nEvent summary updates",
      workspaceRoot: "D:\\workspace",
      controlProjection,
      eventSummary,
      conversionResult: result,
      memoryInspector,
      approvalDiffAuditSurfaces: surfaces
    });

    expect(view.status).toBe("ready_preview");
    expect(view.intent).toBe("web_data_extraction");
    expect(view.acceptanceCriteriaCount).toBe(2);
    expect(view.contextHintCount).toBeGreaterThan(0);
    expect(view.canCreateRun).toBe(false);
    expect(view.canSendToModel).toBe(false);
    expect(view.runCanvas.runStatus).toBe("completed");
    expect(view.runCanvas.eventCount).toBe(5);
    expect(view.runCanvas.auditStatus).toBe("summary");
    expect(view.runCanvas.memoryStatus).toBe("empty");
  });

  it("warns on fake API key and raw data markers without exposing summary", () => {
    const secret = "sk-test1234567890abcdef";
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({ controlProjection });
    const memoryInspector = buildMemoryInspectorView();
    const view = buildChatRunCanvasView({
      objectiveDraft: `Inspect rawDom and raw CSV without keeping ${secret}`,
      acceptanceCriteriaDraft: "rawPrompt is withheld",
      controlProjection,
      memoryInspector,
      approvalDiffAuditSurfaces: surfaces
    });
    const serialized = JSON.stringify(view);

    expect(view.warnings).toContain("API_KEY_MARKER");
    expect(view.warnings).toContain("RAW_DOM_MARKER");
    expect(view.warnings).toContain("RAW_CSV_MARKER");
    expect(view.warnings).toContain("RAW_PROMPT_MARKER");
    expect(view.objectiveSummary).toBe(
      "Draft summary withheld by safety policy."
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawDom");
    expect(serialized).not.toContain("rawPrompt");
  });

  it("keeps FILE_EXISTS actionable without creating a run", () => {
    const eventSummary = fixedEventSummary();
    const controlProjection = buildControlPlaneProjectionView(eventSummary);
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      conversionError: {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists. Choose a new draft filename or remove the existing file."
      }
    });
    const memoryInspector = buildMemoryInspectorView({ eventSummary });
    const view = buildChatRunCanvasView({
      objectiveDraft: "Try another file name.",
      selectedIntent: "web_data_extraction",
      controlProjection,
      eventSummary,
      conversionError: {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists. Choose a new draft filename or remove the existing file."
      },
      memoryInspector,
      approvalDiffAuditSurfaces: surfaces
    });

    expect(view.canCreateRun).toBe(false);
    expect(view.nextAction.label).toBe(
      "Choose a new draft filename or remove the existing file."
    );
    expect(view.runCanvas.auditStatus).toBe("warning");
  });
});

describe("app control plane run draft preview", () => {
  it("returns an empty local draft when the objective is empty", () => {
    const view = buildRunDraftView({
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Tests pass",
      workspaceRoot: "D:\\workspace"
    });

    expect(view.status).toBe("empty");
    expect(view.mode).toBe("local_draft");
    expect(view.previewOnly).toBe(true);
    expect(view.canPreview).toBe(false);
    expect(view.canCreateRun).toBe(false);
    expect(view.canSendToModel).toBe(false);
    expect(view.objectiveSummary).toBe("No objective draft yet.");
  });

  it("builds a safe local run draft preview without creating a real run", () => {
    const eventSummary = fixedEventSummary({ eventCount: 4 });
    const controlProjection = buildControlPlaneProjectionView(eventSummary);
    const view = buildRunDraftView({
      objectiveDraft: "Prepare a small parser refactor plan.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Tests pass\nDiff summary is safe",
      workspaceRoot: "D:\\workspace\\demo",
      controlProjection,
      eventSummary,
      idGenerator: () => "local-draft-test"
    });
    const summary = summarizeRunDraft(view);

    expect(view.draftId).toBe("local-draft-test");
    expect(view.status).toBe("draft_ready");
    expect(view.canPreview).toBe(true);
    expect(view.intent).toBe("code_change");
    expect(view.acceptanceCriteriaCount).toBe(2);
    expect(view.workspaceRootSummary).toBe(".../demo");
    expect(view.warnings).toHaveLength(0);
    expect(summary).toContain("preview_only=yes");
    expect(summary).toContain("intent=code_change");
  });

  it("uses warning codes for fake API key markers without exposing raw values", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildRunDraftView({
      objectiveDraft: `Review a draft that includes ${secret}`,
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "Summary is safe",
      workspaceRoot: "D:\\workspace"
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("draft_blocked");
    expect(view.canPreview).toBe(false);
    expect(view.safety.warningCodes).toContain("API_KEY_MARKER");
    expect(view.objectiveSummary).toBe(
      "Draft summary withheld by safety policy."
    );
    expect(serialized).not.toContain(secret);
  });

  it("detects raw prompt, DOM, CSV, screenshot, and clipboard markers", () => {
    const view = buildRunDraftView({
      objectiveDraft:
        "Inspect rawPrompt, rawDom, rawCsv, rawScreenshot, and clipboard markers.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "warning codes only",
      workspaceRoot: "D:\\workspace"
    });
    const warningCodes = view.warnings.map((warning) => warning.code);
    const serialized = JSON.stringify(view);

    expect(warningCodes).toContain("RAW_PROMPT_MARKER");
    expect(warningCodes).toContain("RAW_DOM_MARKER");
    expect(warningCodes).toContain("RAW_CSV_MARKER");
    expect(warningCodes).toContain("RAW_SCREENSHOT_MARKER");
    expect(warningCodes).toContain("CLIPBOARD_MARKER");
    expect(serialized).not.toContain("rawPrompt, rawDom");
  });

  it("summarizes unsafe acceptance criteria without copying raw values", () => {
    const view = buildRunDraftView({
      objectiveDraft: "Preview a verification task.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft:
        "Keep rawPrompt and Authorization: Bearer hidden from summaries",
      workspaceRoot: "D:\\workspace"
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("draft_blocked");
    expect(view.safety.warningCodes).toContain("AUTHORIZATION_HEADER_MARKER");
    expect(view.safety.warningCodes).toContain("RAW_PROMPT_MARKER");
    expect(view.acceptanceCriteria.summaries).toEqual([
      "Acceptance criteria summary withheld by safety policy."
    ]);
    expect(serialized).not.toContain("Authorization: Bearer");
    expect(serialized).not.toContain("rawPrompt");
  });

  it("allows preview with clarification warnings for unknown intent", () => {
    const view = buildRunDraftView({
      objectiveDraft: "Plan the next local-only step.",
      selectedIntent: "unknown",
      acceptanceCriteriaDraft: "Preview exists",
      workspaceRoot: "D:\\workspace"
    });
    const warningCodes = view.warnings.map((warning) => warning.code);

    expect(view.status).toBe("warning");
    expect(view.canPreview).toBe(true);
    expect(warningCodes).toContain("INTENT_UNKNOWN_NEEDS_CLARIFICATION");
    expect(view.proposedPhases.map((phase) => phase.id)).toEqual([
      "intake",
      "clarification"
    ]);
  });

  it("warns but still previews when acceptance criteria or workspace are empty", () => {
    const view = buildRunDraftView({
      objectiveDraft: "Draft a local documentation task.",
      selectedIntent: "documentation"
    });
    const warningCodes = view.warnings.map((warning) => warning.code);

    expect(view.status).toBe("warning");
    expect(view.canPreview).toBe(true);
    expect(warningCodes).toContain("ACCEPTANCE_CRITERIA_EMPTY");
    expect(warningCodes).toContain("WORKSPACE_ROOT_EMPTY");
  });

  it("plans code_change future phases without execution", () => {
    const view = buildRunDraftView({
      objectiveDraft: "Prepare a code change draft.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Diff summary exists",
      workspaceRoot: "D:\\workspace"
    });

    expect(view.proposedPhases.map((phase) => phase.id)).toEqual([
      "intake",
      "context",
      "routing",
      "capability_planning",
      "approval",
      "diff",
      "audit"
    ]);
    expect(view.expectedSurfaces).toContain("Diff Surface");
    expect(view.nextAction).toContain("No run is created");
  });

  it("plans web data extraction phases without coder execution", () => {
    const view = buildRunDraftView({
      objectiveDraft: "Export a table to CSV.",
      selectedIntent: "web_data_extraction",
      acceptanceCriteriaDraft: "CSV exists",
      workspaceRoot: "D:\\workspace"
    });
    const phases = view.proposedPhases.map((phase) => phase.id);
    const serialized = JSON.stringify(view);

    expect(phases).toEqual([
      "intake",
      "context",
      "execution_plan",
      "result",
      "audit"
    ]);
    expect(phases).not.toContain("routing");
    expect(serialized).not.toContain("coder");
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
    expect(appSource).toContain("Disabled - no live bridge is enabled.");
    expect(appSource).toContain("Control Plane Projection");
    expect(appSource).toContain("Read-only projection from event summaries");
    expect(appSource).toContain("No execution is");
    expect(appSource).toContain("buildControlPlaneProjectionView");
    expect(appSource).toContain("Approval / Diff / Audit Surfaces");
    expect(appSource).toContain("Read-only skeleton - no execution controls");
    expect(appSource).toContain("No approval, apply, or");
    expect(appSource).toContain("Approval Surface");
    expect(appSource).toContain("Diff Surface");
    expect(appSource).toContain("Audit Surface");
    expect(appSource).toContain("workbenchSurfaces");
    expect(appSource).toContain("item.pathSummaries");
    expect(appSource).toContain("item.warningCodes");
    expect(appSource).toContain("Memory Inspector");
    expect(appSource).toContain("memoryInspector");
    expect(appSource).toContain(
      "Read-only skeleton - not connected to persistence"
    );
    expect(appSource).toContain("not connected to persistence");
    expect(appSource).toContain("Commit gate UI is not enabled");
    expect(appSource).toContain("Chat / Run Canvas");
    expect(appSource).toContain("Draft only - no LLM request is sent.");
    expect(appSource).toContain("No LLM request is sent");
    expect(appSource).toContain("Create Run (disabled)");
    expect(appSource).toContain("Preview Draft Run");
    expect(appSource).toContain("Run Draft Preview");
    expect(appSource).toContain("displayedRunDraft");
    expect(appSource).toContain("runDraftCandidate");
    expect(appSource).toContain("setRunDraftPreview");
    expect(appSource).toContain("handlePreviewDraftRun");
    expect(appSource).toContain(
      "Preview only. No run is created and no LLM request is sent."
    );
    expect(appSource).toContain('aria-disabled="true"');
    expect(appSource).toContain("chatRunCanvas");
    expect(appSource).toContain("Objective summary:");
    expect(appSource).toContain("Acceptance preview:");
    expect(appSource).toContain("No live bridge is enabled");
    expect(appSource).toContain("Future extension-to-desktop proposals");
    expect(appSource).toContain("bridgeActionsVisible");
    expect(appSource).toContain('bridgePanel.status === "pending"');
    expect(appSource).toContain("Convert still requires a separate click");
    expect(appSource).not.toContain("Events written");
    expect(appSource).not.toContain("auto approval");
    expect(appSource).not.toContain("Auto Convert");
    expect(appSource).not.toContain("handleApprove");
    expect(appSource).not.toContain("handleApply");
    expect(appSource).not.toContain("handleExecute");
    expect(appSource).not.toContain("handleCommitMemory");
    expect(appSource).not.toContain("handleRevokeMemory");
    expect(appSource).not.toContain("handleExpireMemory");
    expect(appSource).not.toContain("handleCreateRun");
    expect(appSource).not.toContain("handleSendChat");
    expect(appSource).not.toContain("handleRunCanvas");
    expect(appSource).not.toContain("handleSendToDeepSeek");
    expect(appSource).not.toContain("handleRunGit");
    expect(appSource).not.toContain("handleRunShell");
    expect(appSource).not.toContain("handleEnableBridge");
    expect(appSource).not.toContain("Send to DeepSeek");
    expect(appSource).not.toContain("Create Run</button>");
    expect(appSource).not.toContain("Apply Patch");
    expect(appSource).not.toContain("Run Git");
    expect(appSource).not.toContain("Run Shell");
    expect(appSource).not.toContain("Enable native bridge");
    expect(appSource).not.toContain("Native bridge enabled");
    expect(appSource).not.toContain("Approve and execute");
    expect(appSource).not.toContain("Memory commit enabled");
    expect(appSource).not.toContain("commit_memory_command");
    expect(appSource).not.toContain("revoke_memory_command");
    expect(appSource).not.toContain("expire_memory_command");
    expect(appSource).not.toContain("create_run_command");
    expect(appSource).not.toContain("send_chat_command");
    expect(appSource).not.toContain("run_canvas_command");
    expect(appSource).not.toContain("createControlPlaneRun");
    expect(appSource).not.toContain("createControlPlaneTask");
    expect(appSource).not.toContain("routeAgentTask");
    expect(appSource).not.toContain("planCapabilityInvocation");
    expect(appSource).not.toContain("EventStore");
    expect(appSource).not.toContain("writeEvent");
    expect(appSource).not.toContain("git_execute_command");
    expect(appSource).not.toContain("shell_execute_command");
    expect(appSource).not.toContain("native_bridge_command");
    expect(appSource).not.toContain(".slice(");
    expect(appSource).not.toContain(
      'href="../docs/desktop-event-log-smoke-v0.1.md"'
    );
    expect(appSource).not.toContain("<a href=");
    expect(appSource).not.toContain("setEventSummary(undefined);");
    expect(appSource).toContain("event.preventDefault();");
    expect(appSource).toContain("event.stopPropagation();");
    expect(appSource).toContain("void refreshEvents();");
    expect(appSource).toContain("await refreshEvents(workspaceRoot);");
    expect(appSource).toContain("[error, eventSummary, preflight, result]");
    expect(appSource).toContain(
      'setDocMessage("docs/desktop-event-log-smoke-v0.1.md")'
    );

    const diffSurfaceSource = appSource.slice(
      appSource.indexOf('aria-label="Diff Surface"'),
      appSource.indexOf('aria-label="Audit Surface"')
    );
    expect(diffSurfaceSource).not.toContain("<button");
    expect(diffSurfaceSource).not.toContain("Apply Patch");
    expect(diffSurfaceSource).not.toContain("Approve");
    expect(diffSurfaceSource).not.toContain("Reject");
    expect(diffSurfaceSource).not.toContain("Execute");
    expect(diffSurfaceSource).not.toContain("Write files");
  });

  it("keeps bridge preview empty state inactive at the visual layer", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const safetySource = await readFile(
      path.join(appRoot, "src", "safety.ts"),
      "utf8"
    );
    const styles = await readFile(
      path.join(appRoot, "src", "styles.css"),
      "utf8"
    );

    expect(safetySource).toContain('status: "disabled"');
    expect(safetySource).toContain(
      "Future extension-to-desktop proposals will appear here for preview."
    );
    expect(appSource).toContain("bridgeActionsVisible ? (");
    expect(appSource).toContain('bridgePanel.status === "pending"');
    expect(appSource).toContain("aria-disabled={bridgePanel.importDisabled}");
    expect(appSource).toContain("aria-disabled={bridgePanel.rejectDisabled}");
    expect(
      appSource.indexOf("setPayloadText(decision.payloadText)")
    ).toBeGreaterThan(appSource.indexOf("if (bridgePreview === undefined)"));
    expect(styles).toMatch(
      /\.secondary:disabled\s*{[^}]*cursor:\s*not-allowed;/s
    );
    expect(styles).not.toMatch(
      /\.secondary:disabled\s*{[^}]*cursor:\s*(wait|progress);/s
    );
  });

  it("does not include native bridge or arbitrary shell plugin references in app source", async () => {
    const sourceFiles = [
      "src/App.tsx",
      "src/desktop-flow.ts",
      "src/safety.ts",
      "src/control-plane-view.ts",
      "src/workbench-surfaces.ts",
      "src/patch-proposal-surface-view.ts",
      "src/memory-inspector-view.ts",
      "src/chat-run-canvas-view.ts",
      "src/run-draft-view.ts",
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
    expect(combined).not.toContain("approve_surface_command");
    expect(combined).not.toContain("apply_patch_command");
    expect(combined).not.toContain("execute_surface_command");
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

  it("documents app approval diff audit surfaces as read-only skeletons", async () => {
    const docs = await Promise.all(
      ["app-shell-approval-diff-audit-surfaces-v0.2.md", "README.md"].map(
        async (file) => ({
          file,
          text: await readFile(path.join(repoRoot, "docs", file), "utf8")
        })
      )
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("read-only skeleton");
    expect(combined).toMatch(/do not execute any side\s+effect/);
    expect(combined).toContain(
      "There are no approve or reject execution controls"
    );
    expect(combined).toContain("does not apply patches");
    expect(combined).toContain("Git execution");
    expect(combined).toContain("shell execution");
    expect(combined).toContain("real DeepSeek calls");
    expect(combined).toContain(
      "app-shell-approval-diff-audit-surfaces-v0.2.md"
    );
  });

  it("documents app memory inspector as a read-only skeleton", async () => {
    const docs = await Promise.all(
      ["app-shell-memory-inspector-v0.2.md", "README.md"].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("read-only skeleton");
    expect(combined).toContain("not connected to desktop persistence");
    expect(combined).toContain("policy");
    expect(combined).toContain("project_fact");
    expect(combined).toContain("pitfall");
    expect(combined).toContain("There are no commit");
    expect(combined).toContain("No persistent database");
    expect(combined).toContain("No vector database");
    expect(combined).toContain("No real DeepSeek calls");
    expect(combined).toContain("No raw memory content display");
    expect(combined).toContain("app-shell-memory-inspector-v0.2.md");
  });

  it("documents app chat run canvas as draft-only and non-executing", async () => {
    const docs = await Promise.all(
      ["app-shell-chat-run-canvas-v0.2.md", "README.md"].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("draft-only skeleton");
    expect(combined).toContain("does not send chat requests");
    expect(combined).toContain("No LLM request is sent");
    expect(combined).toContain("No run is created");
    expect(combined).toContain("not written to EventStore");
    expect(combined).toContain("localStorage");
    expect(combined).toContain("sessionStorage");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No patch, Git, or shell execution");
    expect(combined).toContain("app-shell-chat-run-canvas-v0.2.md");
  });

  it("documents app run draft as local preview only", async () => {
    const docs = await Promise.all(
      ["app-shell-run-draft-v0.2.md", "README.md"].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("App Shell Run Draft v0.2");
    expect(combined).toContain("local-only Control Plane run preview");
    expect(combined).toContain("local_draft");
    expect(combined).toContain("preview_only");
    expect(combined).toContain("No real ControlPlaneRun is created");
    expect(combined).toContain("No EventStore entry is written");
    expect(combined).toContain("No Tauri command is added or invoked");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain(
      "No agent, capability, patch, Git, or shell execution"
    );
    expect(combined).toContain("No persistence is used");
    expect(combined).toContain("localStorage");
    expect(combined).toContain("sessionStorage");
    expect(combined).toContain("warning codes only");
    expect(combined).toContain("Workspace Index");
    expect(combined).toContain("Patch Proposal UI Bridge");
    expect(combined).toContain("Agent Dossier");
    expect(combined).toContain("Capability Broker");
    expect(combined).toContain("app-shell-run-draft-v0.2.md");
  });

  it("documents the v0.2 App Shell RC release notes without enabling execution", async () => {
    const docs = await Promise.all(
      ["release-notes-v0.2.0-app-shell-rc.1.md", "README.md"].map(
        async (file) => ({
          file,
          text: await readFile(path.join(repoRoot, "docs", file), "utf8")
        })
      )
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${docs.map((doc) => doc.text).join("\n")}\n${rootReadme}`;

    expect(combined).toContain("v0.2.0-app-shell-rc.1");
    expect(combined).toContain("v0.2 Control Plane foundation");
    expect(combined).toContain("Model capability profiles");
    expect(combined).toContain("Rules Ledger v2");
    expect(combined).toContain("Capability Broker v2 skeleton");
    expect(combined).toContain("Agent Dossier static router");
    expect(combined).toContain("Memory Core v1");
    expect(combined).toContain("Patch/Diff Audit foundation");
    expect(combined).toContain("Git Safe Lanes");
    expect(combined).toContain("Shell Allowlist");
    expect(combined).toContain("Control Plane Task/Run skeleton");
    expect(combined).toContain("App Shell Chat / Run Canvas");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("No real chat or LLM execution");
    expect(combined).toContain("No real control-plane run creation");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No MCP, plugin, or skills runtime");
    expect(combined).toContain("No `nativeMessaging`");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("release-notes-v0.2.0-app-shell-rc.1.md");
  });

  it("documents the v0.2 App Shell manual QA flow", async () => {
    const qaDoc = await readFile(
      path.join(repoRoot, "docs", "app-shell-v0.2-manual-qa.md"),
      "utf8"
    );

    expect(qaDoc).toContain("pnpm verify:ci");
    expect(qaDoc).toContain("pnpm release:smoke");
    expect(qaDoc).toContain("pnpm app:qa:check");
    expect(qaDoc).toContain("git status --short");
    expect(qaDoc).toContain("pnpm app:dev");
    expect(qaDoc).toContain("D:\\workspaces\\demo");
    expect(qaDoc).toContain("web-table-export-v02.csv");
    expect(qaDoc).toContain("Chat / Run Canvas");
    expect(qaDoc).toContain("Control Plane Projection");
    expect(qaDoc).toContain("Approval Surface");
    expect(qaDoc).toContain("Diff Surface");
    expect(qaDoc).toContain("Audit Surface");
    expect(qaDoc).toContain("Memory Inspector");
    expect(qaDoc).toContain("Bridge Proposal Preview");
    expect(qaDoc).toContain("Refresh events");
    expect(qaDoc).toContain("FILE_EXISTS");
    expect(qaDoc).toContain("PASSWORD_VALUE_MARKER");
    expect(qaDoc).toContain("No DeepSeek chat execution");
    expect(qaDoc).toContain("No patch, Git, or shell execution");
    expect(qaDoc).toContain("No native bridge");
  });

  it("documents the v0.2 App Shell RC checklist and generated artifact boundaries", async () => {
    const checklist = await readFile(
      path.join(repoRoot, "docs", "app-shell-v0.2-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");

    expect(checklist).toContain("pnpm verify:ci");
    expect(checklist).toContain("pnpm release:smoke");
    expect(checklist).toContain("pnpm app:qa:check");
    expect(checklist).toContain("GitHub Actions");
    expect(checklist).toContain("v0.2.0-app-shell-rc.1");
    expect(checklist).toContain("runtime/dist/");
    expect(checklist).toContain("browser-extension/dist/");
    expect(checklist).toContain("app/src-tauri/target/");
    expect(checklist).toContain("No real chat or LLM execution");
    expect(checklist).toContain("No `nativeMessaging` or live bridge");
    expect(checklist).toContain("release-notes-v0.2.0-app-shell-rc.1.md");
    expect(docsIndex).toContain("release-notes-v0.2.0-app-shell-rc.1.md");
    expect(docsIndex).toContain("app-shell-v0.2-manual-qa.md");
    expect(docsIndex).toContain("app-shell-v0.2-rc-checklist.md");
    expect(appReadme).toContain("draft-only or read-only summaries");
    expect(appReadme).toContain("no real chat, run creation");
  });

  it("documents the v0.2 App Shell RC post-release review and locks P0F", async () => {
    const review = await readFile(
      path.join(repoRoot, "docs", "v0.2-app-shell-rc-postrelease-review.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(review).toContain("v0.2.0-app-shell-rc.1");
    expect(review).toContain("Control plane foundation");
    expect(review).toContain("release tag checks passed");
    expect(review).toContain("Tag: TODO");
    expect(review).toContain("Commit: TODO");
    expect(review).toContain("P0F is complete");
    expect(review).toContain("web_table_to_csv");
    expect(review).toContain("Event Log / Replay");
    expect(review).toContain("Control Plane Projection");
    expect(review).toContain("Chat / Run Canvas");
    expect(review).toContain("Approval / Diff / Audit");
    expect(review).toContain("Memory Inspector");
    expect(review).toContain("Bridge Proposal Preview");
    expect(review).toContain("Real chat / LLM execution");
    expect(review).toContain("Real run creation");
    expect(review).toContain("Patch apply");
    expect(review).toContain("Git execution");
    expect(review).toContain("Shell execution");
    expect(review).toContain("MCP, plugin, or skills runtime");
    expect(review).toContain("Native bridge");
    expect(review).toContain("Memory persistence UI");
    expect(review).toContain("pnpm verify:ci");
    expect(review).toContain("pnpm release:smoke");
    expect(review).toContain("pnpm app:qa:check");
    expect(review).toContain("manual GUI QA");
    expect(review).toContain("GitHub Actions Node runtime warning");
    expect(review).toContain("Tauri bundle identifier warning");
    expect(review).toContain("No raw payload uploads");
    expect(review).toContain("No raw CSV uploads");
    expect(review).toContain("No API key uploads");
    expect(review).toContain("No ignored `conformance/results/`");
    expect(docsIndex).toContain("v0.2-app-shell-rc-postrelease-review.md");
  });

  it("documents the P0G Coding Workflow roadmap without enabling execution", async () => {
    const roadmap = await readFile(
      path.join(repoRoot, "docs", "p0g-coding-workflow-roadmap.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${roadmap}\n${rootReadme}\n${docsIndex}`;

    expect(combined).toContain("P0G Coding Workflow Roadmap");
    expect(combined).toContain("coding workflow MVP");
    expect(combined).toContain("read-only workspace intelligence");
    expect(combined).toContain("patch proposal UI");
    expect(combined).toContain("P0G-001 Workspace Read / Index Skeleton");
    expect(combined).toContain("P0G-002 Patch Proposal UI Bridge");
    expect(combined).toContain("P0G-003 Control Plane Run Draft");
    expect(combined).toContain("P0G-004 Context Cart / Rules Ledger");
    expect(combined).toContain("P0G-005 Agent Route Preview");
    expect(combined).toContain("P0G-006 Capability Plan Preview");
    expect(combined).toContain("P0G-007 Memory Recall Preview");
    expect(combined).toContain("P0G-008 App Shell RC Polish");
    expect(combined).toContain("Patch apply");
    expect(combined).toContain("Real Git execution");
    expect(combined).toContain("Real shell execution");
    expect(combined).toContain("Real DeepSeek chat");
    expect(combined).toContain("MCP, plugin, or skills runtime");
    expect(combined).toContain("Native bridge");
    expect(combined).toContain("Desktop action");
    expect(combined).toContain("p0g-coding-workflow-roadmap.md");
    expect(combined).toContain("P0F is complete");
  });

  it("documents P0G-001 as a read-only workspace index plan", async () => {
    const plan = await readFile(
      path.join(repoRoot, "docs", "p0g-001-workspace-read-index-plan.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(plan).toContain("Do not implement this plan in P0F-015");
    expect(plan).toContain("Scope");
    expect(plan).toContain("Non-Goals");
    expect(plan).toContain("Suggested Data Model");
    expect(plan).toContain("Path Guard Rules");
    expect(plan).toContain("Read-Only File Summary Model");
    expect(plan).toContain("Virtual / In-Memory Fixtures");
    expect(plan).toContain("Event Summary Policy");
    expect(plan).toContain("Tests");
    expect(plan).toContain("Commands To Run");
    expect(plan).toContain("Completion Report Format");
    expect(plan).toContain("WorkspaceIndex");
    expect(plan).toContain("WorkspacePathGuardResult");
    expect(plan).toContain("absolute paths");
    expect(plan).toContain("Windows drive-letter paths");
    expect(plan).toContain("parent traversal");
    expect(plan).toContain("node_modules");
    expect(plan).toContain("No Git execution");
    expect(plan).toContain("No shell execution");
    expect(plan).toContain("No DeepSeek call");
    expect(plan).toContain("pnpm test -- workspace-index");
    expect(plan).toContain("DW-P0G-001");
    expect(plan).toContain("DW-P0G-002 Patch Proposal UI bridge");
    expect(docsIndex).toContain("p0g-001-workspace-read-index-plan.md");
  });

  it("documents the P0G-002 patch proposal UI bridge without enabling apply", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "patch-proposal-ui-bridge-v0.2.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${doc}\n${docsIndex}`;

    expect(combined).toContain("Patch Proposal UI Bridge v0.2");
    expect(combined).toContain("summary-only preview path");
    expect(combined).toContain("does not apply patches");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No filesystem write");
    expect(combined).toContain("No real Git execution");
    expect(combined).toContain("No real shell execution");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("no raw source code");
    expect(combined).toContain("Patch and Diff Audit");
    expect(combined).toContain("Control Plane");
    expect(combined).toContain("Approval Surface");
    expect(combined).toContain("Agent Dossier");
    expect(docsIndex).toContain("patch-proposal-ui-bridge-v0.2.md");
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
