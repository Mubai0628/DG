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
  recordControlRunDraftEvent,
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
  buildRunDraftEventPayload,
  summarizeRunDraftEventResult,
  validateRunDraftEventPayload
} from "../src/run-draft-event-view.js";
import { buildContextCartView } from "../src/context-cart-view.js";
import {
  buildContextAssemblyPreviewView,
  summarizeContextAssemblyPreview,
  validateContextAssemblyPreviewInput
} from "../src/context-assembly-preview-view.js";
import { buildAgentRoutePreviewView } from "../src/agent-route-preview-view.js";
import {
  buildCapabilityPlanPreviewView,
  capabilityPlanApprovalRefs
} from "../src/capability-plan-preview-view.js";
import {
  buildPatchProposalCreationPreviewView,
  parsePatchProposalPathRefsInput,
  patchProposalCreationApprovalRefs,
  patchProposalCreationSurfaceSummaries
} from "../src/patch-proposal-creation-preview-view.js";
import {
  buildPatchProposalValidationPreviewView,
  patchProposalValidationApprovalRefs,
  patchProposalValidationAuditWarningCodes,
  patchProposalValidationSurfaceSummaries
} from "../src/patch-proposal-validation-preview-view.js";
import { buildCapabilityPlanPreview } from "../../runtime/src/capabilities/plan-preview.js";
import { buildMemoryRecallPreviewView } from "../src/memory-recall-preview-view.js";
import {
  buildWorkspaceIndexBridgeView,
  parseWorkspaceIndexSummaryJson,
  validateWorkspaceIndexSummaryInput
} from "../src/workspace-index-bridge-view.js";
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
  buildStaticAgentRoutePreview,
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

function fixedWorkspaceIndexSummary(): Record<string, unknown> {
  return {
    workspaceIndexId: "workspace-index-test-1",
    status: "built",
    fileCount: 3,
    indexedFileCount: 2,
    skippedFileCount: 1,
    totalBytes: 1234,
    totalLines: 88,
    hash: "abcdef1234567890",
    fileSummaries: [
      {
        path: "README.md",
        extension: "md",
        language: "md",
        sizeBytes: 234,
        lineCount: 20,
        hash: "readmehash123456",
        indexed: true,
        warningCodes: [],
        symbolCount: 2
      },
      {
        path: "app/src/App.tsx",
        extension: "tsx",
        language: "tsx",
        sizeBytes: 1000,
        lineCount: 68,
        hash: "apphash123456789",
        indexed: true,
        warningCodes: ["LARGE_COMPONENT_SUMMARY"],
        symbolCount: 5
      },
      {
        path: "docs/private-note.md",
        extension: "md",
        language: "md",
        sizeBytes: 0,
        lineCount: 0,
        hash: "skippedhash123456",
        indexed: false,
        skippedReason: "UNSAFE_CONTENT_SKIPPED",
        warningCodes: ["UNSAFE_CONTENT_SKIPPED"],
        symbolCount: 0
      }
    ],
    directorySummaries: [
      {
        path: "app/src",
        fileCount: 1,
        indexedFileCount: 1,
        skippedFileCount: 0,
        languageCounts: { tsx: 1 },
        warningCodes: []
      },
      {
        path: "docs",
        fileCount: 1,
        indexedFileCount: 0,
        skippedFileCount: 1,
        languageCounts: { md: 1 },
        warningCodes: ["UNSAFE_CONTENT_SKIPPED"]
      }
    ],
    languageSummary: [
      {
        language: "md",
        fileCount: 2,
        indexedFileCount: 1,
        lineCount: 20,
        sizeBytes: 234
      },
      {
        language: "tsx",
        fileCount: 1,
        indexedFileCount: 1,
        lineCount: 68,
        sizeBytes: 1000
      }
    ],
    symbolSummaries: [
      {
        filePath: "README.md",
        name: "Overview",
        kind: "heading",
        language: "md"
      },
      {
        filePath: "app/src/App.tsx",
        name: "DesktopShell",
        kind: "function",
        language: "tsx"
      }
    ],
    warningCodes: ["UNSAFE_CONTENT_SKIPPED"]
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
    expect(isAllowedDesktopCommand("record_control_run_draft_event")).toBe(
      true
    );
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

describe("app run draft event preview", () => {
  it("builds a summary-only draft event payload from a safe local run draft", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a code change plan.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Tests pass\nDiff summary exists",
      workspaceRoot: "D:\\workspace",
      idGenerator: () => "local-draft-event-test"
    });
    const workspaceIndex = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
    const preview = buildRunDraftEventPayload({
      runDraft,
      workspaceRoot: "D:\\workspace",
      workspaceIndexRef: workspaceIndex,
      createdAt: "2026-06-21T00:00:00.000Z"
    });

    expect(preview.status).toBe("ready");
    expect(preview.canRecord).toBe(true);
    expect(preview.payload).toMatchObject({
      eventKind: "control.run.draft_recorded",
      draftId: "local-draft-event-test",
      localTaskId: "local-task-local-draft-event-test",
      intent: "code_change",
      objectiveSummary: "Prepare a code change plan.",
      acceptanceCriteriaCount: 2,
      schemaVersion: 1,
      previewOnly: true,
      localOnly: true,
      noExecution: true
    });
    expect(preview.payload?.workspaceRootHash).toMatch(/^workspace-/);
    expect(preview.payload?.workspaceIndexRef).toMatchObject({
      fileCount: 3,
      indexedFileCount: 2,
      skippedFileCount: 1
    });
    expect(JSON.stringify(preview)).not.toContain("objectiveDraft");
    expect(JSON.stringify(preview)).not.toContain("acceptanceCriteriaDraft");
  });

  it("blocks event payloads for blocked drafts or missing workspace", () => {
    const blockedDraft = buildRunDraftView({
      objectiveDraft: "Keep rawPrompt out of events.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "safe",
      workspaceRoot: "D:\\workspace"
    });
    const blockedPreview = buildRunDraftEventPayload({
      runDraft: blockedDraft,
      workspaceRoot: "D:\\workspace"
    });
    const safeDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local preview.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "safe"
    });
    const missingWorkspace = buildRunDraftEventPayload({ runDraft: safeDraft });

    expect(blockedPreview.status).toBe("blocked");
    expect(blockedPreview.canRecord).toBe(false);
    expect(blockedPreview.warnings.map((warning) => warning.code)).toContain(
      "RAW_PROMPT_MARKER"
    );
    expect(missingWorkspace.status).toBe("blocked");
    expect(missingWorkspace.warnings.map((warning) => warning.code)).toContain(
      "WORKSPACE_ROOT_REQUIRED"
    );
  });

  it("rejects raw fields and secret markers in draft event payloads", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local preview.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "safe",
      workspaceRoot: "D:\\workspace",
      idGenerator: () => "local-draft-safe"
    });
    const preview = buildRunDraftEventPayload({
      runDraft,
      workspaceRoot: "D:\\workspace"
    });
    if (preview.payload === undefined) {
      throw new Error("expected payload");
    }
    const withRawField = {
      ...preview.payload,
      rawPrompt: "do not store"
    } as typeof preview.payload;
    const withSecret = {
      ...preview.payload,
      objectiveSummary: "sk-test1234567890abcdef"
    };

    expect(validateRunDraftEventPayload(withRawField)).toMatchObject({
      ok: false,
      errorCode: "RAW_FIELD_REJECTED"
    });
    expect(validateRunDraftEventPayload(withSecret)).toMatchObject({
      ok: false,
      errorCode: "UNSAFE_MARKER_REJECTED"
    });
  });

  it("records draft events only through the fixed allowlisted desktop command", async () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local preview.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "safe",
      workspaceRoot: "D:\\workspace",
      idGenerator: () => "local-draft-record"
    });
    const preview = buildRunDraftEventPayload({
      runDraft,
      workspaceRoot: "D:\\workspace"
    });
    if (preview.payload === undefined) {
      throw new Error("expected payload");
    }
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("record_control_run_draft_event");
      expect(args?.workspaceRoot).toBe("D:\\workspace");
      expect(typeof args?.payloadJson).toBe("string");
      expect(args?.payloadJson).not.toContain("objectiveDraft");
      return {
        ok: true,
        eventId: "control-run-draft-test",
        eventType: "control.run.draft_recorded",
        draftId: "local-draft-record",
        eventLogPath: "D:\\workspace\\.deepseek-workbench\\events.jsonl",
        safeMessage:
          "Summary-only draft event recorded locally. No run was created.",
        warnings: []
      } as never;
    };
    const result = await recordControlRunDraftEvent(
      {
        workspaceRoot: "D:\\workspace",
        payload: preview.payload
      },
      invoke
    );

    expect(isAllowedDesktopCommand("record_control_run_draft_event")).toBe(
      true
    );
    expect(result.ok).toBe(true);
    expect(summarizeRunDraftEventResult(result)).toContain(
      "No run was created"
    );
  });

  it("projects draft events without marking a run completed", () => {
    const summary = fixedEventSummary({
      eventCount: 1,
      displayedEventCount: 1,
      taskCount: 0,
      completedTaskCount: 0,
      draftCount: 0,
      typeCounts: {
        "control.run.draft_recorded": 1
      },
      timeline: [
        {
          id: "control-run-draft-test",
          ts: "unix-ms-1",
          type: "control.run.draft_recorded",
          taskId: "local-task-local-draft-test",
          summary:
            "draft event recorded: code_change · Prepare a safe plan. · 2 criteria",
          safePayloadKeys: ["draftId", "intent", "objectiveSummary"]
        }
      ]
    });
    const eventPanel = buildEventLogPanelModel(summary);
    const projection = buildControlPlaneProjectionView(summary);

    expect(eventPanel?.eventCount).toBe(1);
    expect(eventPanel?.draftCount).toBe(0);
    expect(projection.draftEventCount).toBe(1);
    expect(projection.completedTaskCount).toBe(0);
    expect(projection.runStatus).toBe("planned");
    expect(projection.nextAction.label).toContain(
      "Real run creation is still disabled"
    );
    expect(JSON.stringify(projection)).not.toContain("rawPrompt");
  });
});

describe("app context cart rules ledger visualization", () => {
  it("builds an empty read-only context cart skeleton", () => {
    const view = buildContextCartView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.readOnly).toBe(true);
    expect(view.totalSegments).toBe(0);
    expect(view.totalTokenEstimate).toBe(0);
    expect(view.layers).toHaveLength(6);
    expect(view.frozenPrefixHash).toBe("n/a");
    expect(view.volatileTailHash).toBe("n/a");
    expect(view.noCompressZoneCount).toBe(0);
    expect(view.nextAction).toContain("No context assembly report");
  });

  it("maps synthetic context summaries to layer, hash, and placement counts", () => {
    const view = buildContextCartView({
      contextAssemblyReport: {
        source: "synthetic_summary",
        segmentCountByLayer: {
          immutable_rules: 1,
          workspace_rules: 2,
          task_contract: 1,
          volatile_tail: 3,
          no_compress_zone: 2
        },
        tokenEstimatesByLayer: {
          immutable_rules: 10,
          workspace_rules: 20,
          task_contract: 30,
          volatile_tail: 40,
          no_compress_zone: 50
        },
        hashSummary: {
          globalFrozenPrefixHash: "frozenprefix1234567890",
          workspaceRulesHash: "workspacehash1234567890",
          taskContractHash: "taskcontract1234567890",
          volatileTailHash: "volatiletail1234567890",
          noCompressZoneHash: "nocompress1234567890"
        },
        noCompressZoneIds: ["approval-1", "diff-1"],
        placementDecisions: [
          {
            segmentId: "rule-1",
            layer: "immutable_rules",
            placement: "frozen_prefix",
            reasonCode: "IMMUTABLE_RULE"
          },
          {
            segmentId: "memory-1",
            layer: "volatile_tail",
            placement: "volatile_tail",
            reasonCode: "MEMORY_RECALL_VOLATILE"
          }
        ],
        warnings: ["CACHE_BOUNDARY_REVIEW"]
      }
    });

    expect(view.status).toBe("warning");
    expect(view.source).toBe("synthetic_summary");
    expect(view.totalSegments).toBe(9);
    expect(view.totalTokenEstimate).toBe(150);
    expect(view.frozenPrefixHash).toBe("frozenprefix");
    expect(view.workspaceRulesHash).toBe("workspacehas");
    expect(view.taskContractHash).toBe("taskcontract");
    expect(view.volatileTailHash).toBe("volatiletail");
    expect(view.noCompressZoneHash).toBe("nocompress12");
    expect(view.noCompressZoneCount).toBe(2);
    expect(view.placementDecisionCount).toBe(2);
    expect(
      view.layers.find((layer) => layer.layer === "volatile_tail")
    ).toMatchObject({ segmentCount: 3, tokenEstimate: 40, volatileOnly: true });
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "CACHE_BOUNDARY_REVIEW"
    );
  });

  it("drops raw segment content and unsafe marker summaries", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildContextCartView({
      contextAssemblyReport: {
        source: "synthetic_summary",
        segments: [
          {
            id: "segment-raw",
            layer: "task_contract",
            title: `Do not show ${secret}`,
            source: "task",
            content: "rawPrompt should never render"
          }
        ],
        hashSummary: {
          taskContractHash: "taskcontractabcdef"
        }
      }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("warning");
    expect(view.segmentSummaries[0]?.title).toBe(
      "Summary withheld by safety policy."
    );
    expect(view.segmentSummaries[0]?.warningCodes).toContain(
      "RAW_CONTEXT_FIELD_DROPPED"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("should never render");
  });

  it("shows run draft relationship as next action only without assembly", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Preview a code change.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Summary only",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildContextCartView({ runDraft });

    expect(view.status).toBe("warning");
    expect(view.totalSegments).toBe(0);
    expect(view.placementDecisionCount).toBe(0);
    expect(view.nextAction).toContain("derive task_contract");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "RUN_DRAFT_CONTEXT_PENDING"
    );
  });

  it("marks memory recalls as volatile-tail relationship only", () => {
    const memoryInspector = buildMemoryInspectorView({
      memoryRecallItems: [
        {
          memoryId: "memory-1",
          type: "project_fact",
          status: "recalled",
          trustLevel: "verified_tool_result",
          namespace: "workspace",
          summary: "Safe summary only"
        }
      ]
    });
    const view = buildContextCartView({ memoryInspector });

    expect(view.status).toBe("warning");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "MEMORY_RECALL_VOLATILE_TAIL"
    );
    expect(JSON.stringify(view)).not.toContain("full content");
  });
});

describe("app context assembly preview", () => {
  it("builds an empty local preview without prompt assembly", () => {
    const view = buildContextAssemblyPreviewView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.promptAssemblyEnabled).toBe(false);
    expect(view.modelRequestEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.totalSegments).toBe(0);
    expect(view.cacheBoundary.status).toBe("unavailable");
  });

  it("maps a run draft into task_contract without exposing raw objective text", () => {
    const objective = "Implement context assembly from summary refs.";
    const runDraft = buildRunDraftView({
      objectiveDraft: objective,
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "No prompt assembly\nNo model request",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildContextAssemblyPreviewView({ runDraft });
    const taskContract = view.segments.find(
      (segment) => segment.layer === "task_contract"
    );
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("preview");
    expect(taskContract).toMatchObject({
      sourceKind: "run_draft",
      placement: "task_contract",
      noCompress: false
    });
    expect(view.frozenPrefixSegmentCount).toBe(0);
    expect(serialized).not.toContain(objective);
    expect(summarizeContextAssemblyPreview(view)).toContain("preview_only=yes");
  });

  it("places workspace index and memory recall summaries in volatile_tail", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare code change memory recall with workspace index.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Summaries only",
      workspaceRoot: "D:\\workspace"
    });
    const workspaceIndexBridge = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
    const memoryRecallPreview = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-project-fact",
          type: "project_fact",
          trustLevel: "verified_tool_result",
          summary: "Workspace index memory recall supports code change.",
          tags: ["code_change", "workspace"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        }
      ]
    });
    const view = buildContextAssemblyPreviewView({
      runDraft,
      workspaceIndexBridge,
      memoryRecallPreview
    });
    const volatileSegments = view.segments.filter(
      (segment) => segment.placement === "volatile_tail"
    );
    const serialized = JSON.stringify(view);

    expect(
      volatileSegments.some(
        (segment) => segment.sourceKind === "workspace_index"
      )
    ).toBe(true);
    expect(
      volatileSegments.some((segment) => segment.sourceKind === "memory_recall")
    ).toBe(true);
    expect(
      view.layers.find((layer) => layer.layer === "volatile_tail")
    ).toMatchObject({ segmentCount: 2 });
    expect(serialized).not.toContain("Workspace index memory recall supports");
    expect(serialized).not.toContain("source code line");
  });

  it("places patch proposal and approval refs in no_compress_zone", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a patch proposal preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Diff remains summary only",
      workspaceRoot: "D:\\workspace"
    });
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const patchSurface = buildWorkbenchSurfacesView({
      controlProjection,
      patchProposalSummaries: [
        {
          proposalId: "patch-1",
          title: "Update context preview wiring",
          filesChanged: 2,
          linesAdded: 12,
          linesRemoved: 3,
          pathSummaries: ["app/src/App.tsx"],
          requiresApproval: true
        }
      ]
    }).diff;
    const contextCart = buildContextCartView({ runDraft });
    const agentRoutePreview = buildAgentRoutePreviewView({
      runDraft,
      contextCart,
      patchSurface
    });
    const capabilityPlanPreview = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview,
      contextCart,
      patchSurface,
      selectedIntent: "code_change"
    });
    const view = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface,
      capabilityPlanPreview
    });
    const noCompressSegments = view.segments.filter(
      (segment) => segment.placement === "no_compress_zone"
    );

    expect(
      noCompressSegments.some(
        (segment) => segment.sourceKind === "patch_proposal"
      )
    ).toBe(true);
    expect(
      noCompressSegments.some(
        (segment) => segment.sourceKind === "approval_ref"
      )
    ).toBe(true);
    expect(view.noCompressSegmentCount).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(view)).not.toContain("raw diff");
  });

  it("keeps dynamic summaries out of frozen prefix layers", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Keep dynamic context outside frozen prefix.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "Dynamic summaries stay volatile",
      workspaceRoot: "D:\\workspace"
    });
    const workspaceIndexBridge = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
    const view = buildContextAssemblyPreviewView({
      runDraft,
      workspaceIndexBridge
    });

    expect(
      view.segments.filter((segment) => segment.placement === "frozen_prefix")
    ).toHaveLength(0);
    expect(
      view.layers.find((layer) => layer.layer === "immutable_rules")
    ).toMatchObject({ segmentCount: 0, placement: "frozen_prefix" });
    expect(
      view.layers.find((layer) => layer.layer === "workspace_rules")
    ).toMatchObject({ segmentCount: 0, placement: "frozen_prefix" });
  });

  it("uses deterministic token estimates and summary-only hash prefixes", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Estimate context preview tokens deterministically.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "Stable token count",
      workspaceRoot: "D:\\workspace"
    });
    const first = buildContextAssemblyPreviewView({ runDraft });
    const second = buildContextAssemblyPreviewView({ runDraft });

    expect(second.totalTokenEstimate).toBe(first.totalTokenEstimate);
    expect(second.layers.map((layer) => layer.hashPrefix)).toEqual(
      first.layers.map((layer) => layer.hashPrefix)
    );
    expect(
      first.layers.every((layer) => /^[a-f0-9]{8,12}$/.test(layer.hashPrefix))
    ).toBe(true);
  });

  it("marks volatile cache changes separately from frozen prefix changes", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Compare workspace index summaries.",
      selectedIntent: "code_review",
      acceptanceCriteriaDraft: "Volatile cache changes only",
      workspaceRoot: "D:\\workspace"
    });
    const previousWorkspaceIndex = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
    const previous = buildContextAssemblyPreviewView({
      runDraft,
      workspaceIndexBridge: previousWorkspaceIndex
    });
    const nextWorkspaceIndex = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: {
        ...fixedWorkspaceIndexSummary(),
        fileCount: 4,
        indexedFileCount: 3,
        hash: "fedcba6543210000"
      }
    });
    const next = buildContextAssemblyPreviewView({
      runDraft,
      workspaceIndexBridge: nextWorkspaceIndex,
      previousPreview: previous
    });

    expect(next.cacheBoundary.status).toBe("changed");
    expect(next.cacheBoundary.frozenPrefixChanged).toBe(false);
    expect(next.cacheBoundary.taskContractChanged).toBe(false);
    expect(next.cacheBoundary.volatileTailChanged).toBe(true);
    expect(next.cacheBoundary.reasonCodes).toContain("VOLATILE_TAIL_CHANGED");
  });

  it("blocks unsafe markers without retaining raw prompt, DOM, CSV, or API keys", () => {
    const secret = "sk-test1234567890abcdef";
    const safeDraft = buildRunDraftView({
      objectiveDraft: "Safe draft before unsafe override.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "Safe criteria",
      workspaceRoot: "D:\\workspace"
    });
    const unsafeDraft = {
      ...safeDraft,
      objectiveSummary: `rawPrompt rawDom rawCsv ${secret}`,
      rawPrompt: "do not keep"
    } as unknown as typeof safeDraft;
    const validation = validateContextAssemblyPreviewInput({
      runDraft: unsafeDraft
    });
    const view = buildContextAssemblyPreviewView({ runDraft: unsafeDraft });
    const serialized = JSON.stringify(view);

    expect(validation.ok).toBe(false);
    expect(view.status).toBe("blocked");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt rawDom rawCsv");
  });

  it("keeps App UI local-only with no prompt assembly execution path", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );

    expect(appSource).toContain("Context Assembly Preview");
    expect(appSource).toContain("No prompt is assembled");
    expect(appSource).toContain("no model request is sent");
    expect(appSource).toContain("handlePreviewContextAssembly");
    expect(desktopFlowSource).not.toContain("context_assembly");
    expect(appSource).not.toContain("record_context_assembly");
    expect(appSource).not.toContain("localStorage");
    expect(appSource).not.toContain("sessionStorage");
  });
});

describe("app agent route preview", () => {
  it("builds an empty preview until a local run draft exists", () => {
    const view = buildAgentRoutePreviewView({
      selectedIntent: "code_change"
    });

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.executionEnabled).toBe(false);
    expect(view.steps).toHaveLength(0);
    expect(view.nextAction).toContain("Preview a local run draft first");
  });

  it("routes web data extraction through orchestrator and verifier only", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Export the selected web table to CSV.",
      selectedIntent: "web_data_extraction",
      acceptanceCriteriaDraft: "CSV draft exists",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildAgentRoutePreviewView({
      runDraft,
      contextCart: buildContextCartView({
        contextAssemblyReport: {
          source: "synthetic_summary",
          segmentCountByLayer: { volatile_tail: 1 }
        }
      })
    });

    expect(view.status).toBe("preview");
    expect(view.source).toBe("runtime_static_router_preview");
    expect(view.steps.map((step) => step.role)).toEqual([
      "orchestrator",
      "verifier"
    ]);
    expect(view.steps.map((step) => step.role)).not.toContain("coder");
    expect(view.nextAction).toContain("No agent is executed");
  });

  it("uses the runtime static router helper output shape", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a runtime backed route preview.",
      selectedIntent: "code_review",
      acceptanceCriteriaDraft: "Reviewer summary exists",
      workspaceRoot: "D:\\workspace"
    });
    const runtimePreview = buildStaticAgentRoutePreview({
      intent: runDraft.intent,
      objectiveSummary: runDraft.objectiveSummary,
      acceptanceCriteriaCount: runDraft.acceptanceCriteriaCount,
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => "route-runtime"
    });
    const appPreview = buildAgentRoutePreviewView({
      runDraft,
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => "route-runtime"
    });

    expect(appPreview.source).toBe("runtime_static_router_preview");
    expect(appPreview.routeId).toBe(runtimePreview.routeId);
    expect(appPreview.steps.map((step) => step.role)).toEqual(
      runtimePreview.steps.map((step) => step.role)
    );
    expect(appPreview.modelProfileIds).toEqual(runtimePreview.modelProfileIds);
    expect(appPreview.capabilityRefCount).toBe(
      runtimePreview.capabilityRefCount
    );
  });

  it("routes code changes through orchestrator coder reviewer verifier", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a small UI patch proposal.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Patch summary exists\nTests are described",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildAgentRoutePreviewView({
      runDraft,
      contextCart: buildContextCartView({
        contextAssemblyReport: {
          source: "synthetic_summary",
          segmentCountByLayer: { task_contract: 1 }
        }
      })
    });

    expect(view.steps.map((step) => step.role)).toEqual([
      "orchestrator",
      "coder",
      "reviewer",
      "verifier"
    ]);
    expect(view.status).toBe("warning");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "PATCH_CAPABILITY_NOT_CONNECTED"
    );
    expect(
      view.steps.find((step) => step.role === "coder")?.expectedOutputs
    ).toContain("patch proposal summary");
  });

  it("marks unknown intent as needing clarification", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Plan this later.",
      selectedIntent: "unknown",
      acceptanceCriteriaDraft: "Preview only",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildAgentRoutePreviewView({ runDraft });

    expect(view.status).toBe("needs_clarification");
    expect(view.steps.map((step) => step.role)).toEqual(["orchestrator"]);
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "INTENT_UNKNOWN_NEEDS_CLARIFICATION"
    );
  });

  it("includes display-only model profile ids and capability refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Review a proposed code diff.",
      selectedIntent: "code_review",
      acceptanceCriteriaDraft: "Reviewer summary exists",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildAgentRoutePreviewView({ runDraft });
    const serialized = JSON.stringify(view);

    expect(view.modelProfileIds).toContain("deepseek-v4-pro");
    expect(view.modelProfileIds).toContain("deepseek-v4-flash");
    expect(view.capabilityRefCount).toBeGreaterThan(0);
    for (const step of view.steps) {
      for (const capability of step.allowedCapabilityRefs) {
        expect(capability.mode).toBe("display_only");
      }
    }
    expect(serialized).toContain("native.workspace.index");
    expect(serialized).toContain("native.git.diff_summary");
  });

  it("does not expose unsafe objective markers in route summaries", () => {
    const secret = "sk-test1234567890abcdef";
    const runDraft = buildRunDraftView({
      objectiveDraft: `Route a draft containing ${secret} and rawDom.`,
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "warning codes only",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildAgentRoutePreviewView({ runDraft });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("error");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "RAW_DOM_MARKER"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawDom");
    expect(serialized).not.toContain("Route a draft containing");
  });
});

describe("app capability plan preview", () => {
  it("builds an empty capability plan until a run draft and route exist", () => {
    const view = buildCapabilityPlanPreviewView({
      selectedIntent: "code_change"
    });

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.planningOnly).toBe(true);
    expect(view.executionEnabled).toBe(false);
    expect(view.leaseIssued).toBe(false);
    expect(view.items).toHaveLength(0);
    expect(view.nextAction).toContain("Preview a local run draft");
  });

  it("uses runtime Capability Broker preview helper output shape", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local code change preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Patch proposal summary exists",
      workspaceRoot: "D:\\workspace"
    });
    const agentRoutePreview = buildAgentRoutePreviewView({ runDraft });
    const runtimePreview = buildCapabilityPlanPreview({
      intent: "code_change",
      routePreview: {
        routeId: agentRoutePreview.routeId,
        status: agentRoutePreview.status,
        roleRefs: agentRoutePreview.steps.map((step) => step.role),
        routeStepRefs: agentRoutePreview.steps.map((step) => step.stepId),
        capabilityRefs: agentRoutePreview.steps.flatMap((step) =>
          step.allowedCapabilityRefs.map((ref) => ref.capabilityId)
        )
      },
      runDraftSummary: `${runDraft.objectiveSummary} criteria:${runDraft.acceptanceCriteriaCount}`
    });
    const appPreview = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview
    });

    expect(appPreview.source).toBe("runtime_capability_broker_preview");
    expect(appPreview.itemCount).toBe(runtimePreview.itemCount);
    expect(appPreview.items.map((item) => item.capabilityId)).toEqual(
      runtimePreview.items.map((item) => item.capabilityId)
    );
    expect(appPreview.approvalRequiredCount).toBe(
      runtimePreview.approvalRequiredCount
    );
    expect(appPreview.leaseRequiredCount).toBe(
      runtimePreview.leaseRequiredCount
    );
    expect(
      appPreview.items.every((item) => item.descriptorHash.length > 0)
    ).toBe(true);
  });

  it("maps web data extraction to display-only workspace and draft-write descriptors", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Export a web table to CSV.",
      selectedIntent: "web_data_extraction",
      acceptanceCriteriaDraft: "CSV exists",
      workspaceRoot: "D:\\workspace"
    });
    const agentRoutePreview = buildAgentRoutePreviewView({ runDraft });
    const view = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview
    });

    expect(view.source).toBe("runtime_capability_broker_preview");
    expect(view.itemCount).toBe(2);
    expect(view.items.map((item) => item.capabilityId)).toContain(
      "native.workspace.index"
    );
    expect(view.items.map((item) => item.capabilityId)).toContain(
      "native.fs.write_draft"
    );
    expect(
      view.items.find((item) => item.capabilityId === "native.workspace.index")
        ?.planStatus
    ).toBe("display_only");
    expect(
      view.items.find((item) => item.capabilityId === "native.fs.write_draft")
        ?.planStatus
    ).toBe("approval_required");
    expect(view.leaseRequiredCount).toBe(1);
    expect(JSON.stringify(view)).not.toContain("rawDom");
  });

  it("maps code change to workspace, patch, git, and disabled command refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local code change preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Patch proposal summary exists",
      workspaceRoot: "D:\\workspace"
    });
    const patchSurface = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: [
        {
          proposalId: "patch-1",
          title: "Safe patch summary",
          filesChanged: 1,
          linesAdded: 2,
          linesRemoved: 1
        }
      ]
    }).diff;
    const agentRoutePreview = buildAgentRoutePreviewView({
      runDraft,
      patchSurface
    });
    const view = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview,
      patchSurface
    });
    const ids = view.items.map((item) => item.capabilityId);

    expect(ids).toContain("native.workspace.index");
    expect(ids).toContain("native.patch.propose");
    expect(ids).toContain("native.git.diff_summary");
    expect(ids).toContain("native.git.status");
    expect(ids).toContain("native.shell.pnpm_test");
    expect(ids).toContain("native.patch.apply");
    expect(ids).toContain("native.git.commit_draft");
    expect(view.highRiskCount).toBeGreaterThanOrEqual(3);
    expect(view.disabledCount).toBeGreaterThanOrEqual(3);
    expect(
      view.items.find((item) => item.capabilityId === "native.patch.apply")
        ?.planStatus
    ).toBe("disabled");
    expect(
      view.items.find((item) => item.capabilityId === "native.git.commit_draft")
        ?.planStatus
    ).toBe("disabled");
    expect(
      view.items.find((item) => item.capabilityId === "native.shell.pnpm_test")
        ?.invokePolicy
    ).toBe("DISABLED");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "PATCH_APPLY_DISABLED"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "GIT_WRITE_DISABLED"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "SHELL_EXECUTION_DISABLED"
    );
  });

  it("returns needs clarification for unknown intent", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Clarify this task later.",
      selectedIntent: "unknown",
      acceptanceCriteriaDraft: "Preview only",
      workspaceRoot: "D:\\workspace"
    });
    const agentRoutePreview = buildAgentRoutePreviewView({ runDraft });
    const view = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview
    });

    expect(view.status).toBe("needs_clarification");
    expect(view.itemCount).toBe(0);
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "INTENT_UNKNOWN_NEEDS_CLARIFICATION"
    );
  });

  it("strips raw arguments and unsafe markers from the view model", () => {
    const secret = "sk-test1234567890abcdef";
    const runDraft = buildRunDraftView({
      objectiveDraft: `Plan with ${secret} and rawDom markers.`,
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "warning codes only",
      workspaceRoot: "D:\\workspace"
    });
    const agentRoutePreview = buildAgentRoutePreviewView({ runDraft });
    const view = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview,
      conversionError: {
        safeMessage: "rawCsv should be warning-only"
      }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("blocked");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "RAW_DOM_MARKER"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "RAW_CSV_MARKER"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawDom");
    expect(serialized).not.toContain("rawCsv");
    expect(serialized).not.toContain("Plan with");
  });

  it("passes capability approvals to the existing approval surface as read-only dry refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Export a web table to CSV.",
      selectedIntent: "web_data_extraction",
      acceptanceCriteriaDraft: "CSV exists",
      workspaceRoot: "D:\\workspace"
    });
    const agentRoutePreview = buildAgentRoutePreviewView({ runDraft });
    const capabilityPlan = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      futureApprovalRefs: capabilityPlanApprovalRefs(capabilityPlan)
    });

    expect(surfaces.approval.status).toBe("pending");
    expect(surfaces.approval.itemCount).toBe(1);
    expect(surfaces.approval.items[0]).toMatchObject({
      kind: "capability",
      status: "dry"
    });
    expect(JSON.stringify(surfaces.approval)).not.toContain("raw");
  });
});

describe("app patch proposal creation preview", () => {
  it("builds an empty local preview before path refs are entered", () => {
    const view = buildPatchProposalCreationPreviewView({
      selectedIntent: "code_change"
    });

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.applyEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.items).toHaveLength(0);
  });

  it("creates a local summary-only proposal from safe path refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local patch proposal preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Diff surface shows summary only",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildPatchProposalCreationPreviewView({
      titleDraft: "Update patch preview wiring",
      changeDescriptionSummary: "Connect safe path refs to summary surfaces.",
      pathRefsText: "app/src/App.tsx\ndocs/app-preview.md",
      defaultChangeKind: "update",
      estimatedLinesAdded: 10,
      estimatedLinesRemoved: 2,
      selectedIntent: "code_change",
      runDraft
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("warning");
    expect(view.source).toBe("runtime_patch_creation_preview");
    expect(view.fileCount).toBe(2);
    expect(view.linesAdded).toBe(20);
    expect(view.linesRemoved).toBe(4);
    expect(view.pathSummaries).toEqual([
      "update:app/src/App.tsx",
      "update:docs/app-preview.md"
    ]);
    expect(view.requiresApproval).toBe(true);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("rawDiff");
  });

  it("rejects raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const rawFieldParsed = parsePatchProposalPathRefsInput(
      JSON.stringify([
        {
          path: "app/src/App.tsx",
          changeKind: "update",
          beforeContent: "do not keep"
        }
      ])
    );
    const markerView = buildPatchProposalCreationPreviewView({
      pathRefsText: `docs/file.md ${secret}`,
      selectedIntent: "code_change"
    });
    const serialized = JSON.stringify(markerView);

    expect(rawFieldParsed.ok).toBe(false);
    if (!rawFieldParsed.ok) {
      expect(rawFieldParsed.errorCode).toBe("PATCH_PREVIEW_RAW_FIELD_REJECTED");
    }
    expect(markerView.status).toBe("blocked");
    expect(markerView.warningCodes).toContain("API_KEY_MARKER");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("feeds Diff Surface and Approval Surface with summary-only refs", () => {
    const view = buildPatchProposalCreationPreviewView({
      titleDraft: "Delete obsolete doc",
      changeDescriptionSummary: "Delete requires approval summary.",
      pathRefsText: "README.md",
      defaultChangeKind: "delete",
      estimatedLinesAdded: 0,
      estimatedLinesRemoved: 3,
      selectedIntent: "code_change"
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: patchProposalCreationSurfaceSummaries(view),
      futureApprovalRefs: patchProposalCreationApprovalRefs(view)
    });
    const serialized = JSON.stringify(surfaces);

    expect(view.requiresApproval).toBe(true);
    expect(surfaces.diff.status).toBe("warning");
    expect(surfaces.diff.items).toHaveLength(1);
    expect(surfaces.diff.items[0]?.proposalId).toBe(view.proposalId);
    expect(surfaces.diff.items[0]?.suggestedNextAction).toContain(
      "Apply is disabled"
    );
    expect(surfaces.approval.status).toBe("pending");
    expect(surfaces.approval.items[0]).toMatchObject({
      kind: "patch",
      status: "dry"
    });
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("places created patch proposals into context no_compress_zone and capability refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare local patch creation preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Patch proposal summary appears",
      workspaceRoot: "D:\\workspace"
    });
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update route preview",
      changeDescriptionSummary: "Summary-only patch proposal preview.",
      pathRefsText: "app/src/agent-route-preview-view.ts",
      defaultChangeKind: "update",
      estimatedLinesAdded: 6,
      estimatedLinesRemoved: 1,
      selectedIntent: "code_change",
      runDraft
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries:
        patchProposalCreationSurfaceSummaries(proposalView)
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface: surfaces.diff
    });
    const agentRoutePreview = buildAgentRoutePreviewView({
      runDraft,
      patchSurface: surfaces.diff
    });
    const capabilityPlan = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview,
      patchSurface: surfaces.diff,
      selectedIntent: "code_change"
    });

    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceKind === "patch_proposal" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(
      capabilityPlan.items.find(
        (item) => item.capabilityId === "native.patch.propose"
      )?.inputSummary
    ).toContain("patch-surface-summary");
    expect(JSON.stringify(contextPreview)).not.toContain(
      "Summary-only patch proposal preview."
    );
  });

  it("keeps App UI preview-only without patch apply or execution handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "patch-proposal-creation-preview-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Patch Proposal Creation Preview");
    expect(appSource).toContain("Preview only / no apply");
    expect(appSource).toContain("handlePreviewPatchProposal");
    expect(appSource).toContain("files are read or written");
    expect(appSource).toContain("no patch is applied");
    expect(combined).not.toContain("handleApplyPatch");
    expect(combined).not.toContain("applyPatch");
    expect(combined).not.toContain("approvePatch");
    expect(combined).not.toContain("rejectPatch");
    expect(combined).not.toContain("executePatch");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("patch_proposal_creation");
  });
});

describe("app patch proposal validation preview", () => {
  it("builds an empty validation preview until a patch proposal exists", () => {
    const view = buildPatchProposalValidationPreviewView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.validationOnly).toBe(true);
    expect(view.applyEnabled).toBe(false);
    expect(view.virtualApplyEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
  });

  it("validates a safe patch proposal creation preview through the runtime helper", () => {
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update docs and tests",
      changeDescriptionSummary: "Summary-only validation preview.",
      pathRefsText: "docs/validation.md\nruntime/test/validation.test.ts",
      defaultChangeKind: "documentation",
      estimatedLinesAdded: 4,
      estimatedLinesRemoved: 1,
      selectedIntent: "documentation"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const serialized = JSON.stringify(validationView);

    expect(validationView.source).toBe("runtime_patch_validation_preview");
    expect(validationView.status).toBe("needs_approval");
    expect(validationView.proposalId).toBe(proposalView.proposalId);
    expect(validationView.readiness.canProceedToDiffAuditPreview).toBe(true);
    expect(validationView.readiness.canApplyPatch).toBe(false);
    expect(validationView.noCompressRequired).toBe(true);
    expect(validationView.contextPlacement).toBe("no_compress_zone");
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("rawDiff");
  });

  it("rejects unsafe raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const rawFieldProposal = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe proposal",
      pathRefsText: JSON.stringify([
        {
          path: "app/src/App.tsx",
          changeKind: "update",
          beforeContent: "do not keep"
        }
      ]),
      selectedIntent: "code_change"
    });
    const markerProposal = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe marker proposal",
      pathRefsText: `app/src/App.tsx ${secret}`,
      selectedIntent: "code_change"
    });
    const rawFieldValidation = buildPatchProposalValidationPreviewView({
      proposalPreview: rawFieldProposal
    });
    const markerValidation = buildPatchProposalValidationPreviewView({
      proposalPreview: markerProposal
    });
    const serialized = JSON.stringify({
      rawFieldValidation,
      markerValidation
    });

    expect(rawFieldProposal.status).toBe("blocked");
    expect(rawFieldValidation.status).toBe("blocked");
    expect(rawFieldValidation.warningCodes).toEqual(
      expect.arrayContaining(["PATCH_PREVIEW_RAW_FIELD_REJECTED"])
    );
    expect(markerProposal.status).toBe("blocked");
    expect(markerValidation.status).toBe("blocked");
    expect(markerValidation.warningCodes).toEqual(
      expect.arrayContaining(["API_KEY_MARKER"])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("feeds Diff, Approval, Audit, and Context Assembly surfaces with summary refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Validate a local patch proposal preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Validation summary appears",
      workspaceRoot: "D:\\workspace"
    });
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update app validation panel",
      changeDescriptionSummary: "Summary-only validation preview.",
      pathRefsText: "app/src/App.tsx\nruntime/test/app.test.ts",
      defaultChangeKind: "update",
      estimatedLinesAdded: 6,
      estimatedLinesRemoved: 1,
      selectedIntent: "code_change",
      runDraft
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: [
        ...(patchProposalCreationSurfaceSummaries(proposalView) ?? []),
        ...(patchProposalValidationSurfaceSummaries(validationView) ?? [])
      ],
      futureApprovalRefs: [
        ...patchProposalCreationApprovalRefs(proposalView),
        ...patchProposalValidationApprovalRefs(validationView)
      ],
      futureAuditWarningCodes:
        patchProposalValidationAuditWarningCodes(validationView)
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface: surfaces.diff
    });
    const serialized = JSON.stringify({
      surfaces,
      contextPreview
    });

    expect(surfaces.diff.items).toHaveLength(2);
    expect(
      surfaces.diff.items.some((item) => item.status.startsWith("validation_"))
    ).toBe(true);
    expect(surfaces.approval.items.some((item) => item.kind === "patch")).toBe(
      true
    );
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `PATCH_VALIDATION_FINDINGS_${validationView.findingCount}`,
        `PATCH_VALIDATION_WARNINGS_${validationView.warningCount}`
      ])
    );
    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceRefId === "patch-validation-preview-surface" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps App UI validation-only without Tauri, EventStore, fs, or execution handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "patch-proposal-validation-preview-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Patch Proposal Validation Preview");
    expect(appSource).toContain("Validation only / no apply");
    expect(appSource).toContain("handleValidatePatchProposal");
    expect(appSource).toContain("Validation");
    expect(appSource).toContain("diff/audit preview");
    expect(combined).not.toContain("handleApplyPatch");
    expect(combined).not.toContain("applyPatch");
    expect(combined).not.toContain("approvePatch");
    expect(combined).not.toContain("rejectPatch");
    expect(combined).not.toContain("executePatch");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("patch_proposal_validation");
  });
});

describe("app memory recall preview", () => {
  it("builds an empty recall preview until a run draft exists", () => {
    const view = buildMemoryRecallPreviewView({
      selectedIntent: "code_change"
    });

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.persistenceConnected).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.frozenPrefixIncluded).toBe(false);
    expect(view.items).toHaveLength(0);
    expect(view.nextAction).toContain("Preview a local run draft first");
  });

  it("keeps run draft recall empty when desktop memory persistence is not connected", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a code change with review safeguards.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Review summary exists",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildMemoryRecallPreviewView({ runDraft });

    expect(view.status).toBe("empty");
    expect(view.itemCount).toBe(0);
    expect(view.nextAction).toContain(
      "desktop persistence is not connected yet"
    );
    expect(view.querySummary.intent).toBe("code_change");
  });

  it("maps synthetic policy, project_fact, and pitfall summaries to volatile_tail items", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare code change review for workspace patch safety.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Patch review exists",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-policy-1",
          type: "policy",
          namespace: "repo",
          trustLevel: "repository_rule",
          summary: "Code change patches require review before apply.",
          tags: ["code_change", "patch"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        },
        {
          memoryId: "mem-fact-1",
          type: "project_fact",
          namespace: "workspace",
          trustLevel: "verified_tool_result",
          summary: "Workspace patch summaries are shown in Diff Surface.",
          tags: ["workspace", "patch"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        },
        {
          memoryId: "mem-pitfall-1",
          type: "pitfall",
          namespace: "workspace",
          trustLevel: "user_correction",
          summary: "Patch previews must not imply apply execution.",
          tags: ["code_change"],
          trigger: "preview wording",
          reasonCodes: ["PATCH_APPLY_DISABLED"]
        }
      ]
    });

    expect(view.status).toBe("preview");
    expect(view.source).toBe("runtime_memory_core_preview");
    expect(view.itemCount).toBe(3);
    expect(view.policyCount).toBe(1);
    expect(view.projectFactCount).toBe(1);
    expect(view.pitfallCount).toBe(1);
    expect(view.highTrustCount).toBe(3);
    expect(view.volatileTailCount).toBe(3);
    expect(view.items.every((item) => item.placement === "volatile_tail")).toBe(
      true
    );
    expect(JSON.stringify(view)).not.toContain("content");
  });

  it("filters policy trust, project facts without evidence, and pitfall without trigger", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Review workspace policy and project fact summaries.",
      selectedIntent: "code_review",
      acceptanceCriteriaDraft: "No unsafe recall",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-policy-external",
          type: "policy",
          trustLevel: "external_untrusted",
          summary: "External policy should not appear.",
          tags: ["code_review"]
        },
        {
          memoryId: "mem-fact-no-evidence",
          type: "project_fact",
          trustLevel: "external_untrusted",
          summary: "Fact without evidence should not appear.",
          tags: ["code_review"]
        },
        {
          memoryId: "mem-pitfall-no-trigger",
          type: "pitfall",
          trustLevel: "external_untrusted",
          summary: "Pitfall without trigger should not appear.",
          tags: ["code_review"]
        },
        {
          memoryId: "mem-fact-low-trust",
          type: "project_fact",
          trustLevel: "external_untrusted",
          summary: "Code review has an external summary with evidence.",
          tags: ["code_review"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        }
      ]
    });

    expect(view.items.map((item) => item.memoryId)).toEqual([
      "mem-fact-low-trust"
    ]);
    expect(view.projectFactCount).toBe(1);
    expect(view.policyCount).toBe(0);
    expect(view.pitfallCount).toBe(0);
    expect(view.highTrustCount).toBe(0);
  });

  it("sorts recall items deterministically by score, type priority, and id", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Verify deterministic review memory summaries.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "Order is stable",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-z",
          type: "pitfall",
          trustLevel: "user_correction",
          summary: "Verification memory summary.",
          tags: ["verification"],
          trigger: "verification",
          score: 1
        },
        {
          memoryId: "mem-a",
          type: "project_fact",
          trustLevel: "verified_tool_result",
          summary: "Verification memory summary.",
          tags: ["verification"],
          provenanceRefCount: 1,
          evidenceRefCount: 1,
          score: 1
        },
        {
          memoryId: "mem-policy",
          type: "policy",
          trustLevel: "workspace_rule",
          summary: "Verification memory summary.",
          tags: ["verification"],
          score: 1
        }
      ]
    });

    expect(view.items.map((item) => item.memoryId)).toEqual([
      "mem-policy",
      "mem-a",
      "mem-z"
    ]);
  });

  it("skips unsafe memory summaries and never exposes raw markers or fake keys", () => {
    const secret = "sk-test1234567890abcdef";
    const runDraft = buildRunDraftView({
      objectiveDraft: "Review memory recall warning handling.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "warning codes only",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-safe",
          type: "project_fact",
          trustLevel: "verified_tool_result",
          summary: "Memory recall warning handling has safe evidence.",
          tags: ["verification"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        },
        {
          memoryId: "mem-secret",
          type: "project_fact",
          trustLevel: "verified_tool_result",
          summary: `rawPrompt and rawDom should stay hidden ${secret}`,
          tags: ["verification"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        }
      ]
    });
    const serialized = JSON.stringify(view);

    expect(view.items.map((item) => item.memoryId)).toEqual(["mem-safe"]);
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "MEMORY_RECALL_ITEM_SKIPPED_FOR_SAFETY"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("rawDom");
  });

  it("lets Context Cart show memory recall as volatile_tail relation only", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare code change memory recall.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Memory relation is visible",
      workspaceRoot: "D:\\workspace"
    });
    const memoryRecallPreview = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-policy-1",
          type: "policy",
          trustLevel: "repository_rule",
          summary: "Code change memory recall belongs in volatile tail.",
          tags: ["code_change"],
          provenanceRefCount: 1
        }
      ]
    });
    const contextCart = buildContextCartView({
      runDraft,
      memoryRecallPreview
    });

    expect(contextCart.warnings.map((warning) => warning.code)).toContain(
      "MEMORY_RECALL_VOLATILE_TAIL"
    );
    expect(contextCart.nextAction).toContain("volatile_tail");
    expect(JSON.stringify(contextCart)).not.toContain("Code change memory");
  });
});

describe("app workspace index bridge", () => {
  it("builds an empty read-only bridge state", () => {
    const view = buildWorkspaceIndexBridgeView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.readOnly).toBe(true);
    expect(view.filesystemCrawlEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.nextAction).toContain("Raw file content is not accepted");
  });

  it("parses safe summary JSON and renders counts without raw content", () => {
    const parsed = parseWorkspaceIndexSummaryJson(
      JSON.stringify(fixedWorkspaceIndexSummary())
    );
    expect(parsed.ok).toBe(true);
    const view = parsed.ok
      ? buildWorkspaceIndexBridgeView(parsed.input)
      : buildWorkspaceIndexBridgeView({
          parseErrorCode: parsed.errorCode,
          parseErrorMessage: parsed.safeMessage
        });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("warning");
    expect(view.workspaceIndexId).toBe("workspace-index-test-1");
    expect(view.fileCount).toBe(3);
    expect(view.indexedFileCount).toBe(2);
    expect(view.skippedFileCount).toBe(1);
    expect(view.directoryCount).toBe(2);
    expect(view.languageCount).toBe(2);
    expect(view.symbolCount).toBe(2);
    expect(view.totalBytes).toBe(1234);
    expect(view.totalLines).toBe(88);
    expect(view.hashPrefix).toBe("abcdef123456");
    expect(view.languages.map((language) => language.language)).toEqual([
      "md",
      "tsx"
    ]);
    expect(view.topDirectories.map((directory) => directory.path)).toContain(
      "app/src"
    );
    expect(view.topFiles.map((file) => file.path)).toContain("app/src/App.tsx");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "UNSAFE_CONTENT_SKIPPED"
    );
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("source code line");
  });

  it("rejects raw content fields and raw diff fields", () => {
    const rawContent = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: {
        ...fixedWorkspaceIndexSummary(),
        fileSummaries: [
          {
            path: "src/index.ts",
            content: "source code line",
            beforeContent: "before",
            afterContent: "after",
            rawDiff: "@@ hidden"
          }
        ]
      }
    });

    expect(rawContent.status).toBe("rejected");
    expect(rawContent.warnings.map((warning) => warning.code)).toContain(
      "WORKSPACE_INDEX_RAW_FIELD_REJECTED"
    );
    expect(JSON.stringify(rawContent)).not.toContain("source code line");
  });

  it("rejects fake secrets and authorization markers in summary JSON", () => {
    const secretJson = JSON.stringify({
      ...fixedWorkspaceIndexSummary(),
      note: "Bearer abcdefghijklmnopqrstuvwxyz"
    });
    const parsed = parseWorkspaceIndexSummaryJson(secretJson);
    const authorization = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: {
        ...fixedWorkspaceIndexSummary(),
        warningCodes: ["Authorization: token"]
      }
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errorCode).toBe("WORKSPACE_INDEX_UNSAFE_MARKER");
    }
    expect(authorization.status).toBe("rejected");
    expect(JSON.stringify(authorization)).not.toContain("Authorization: token");
  });

  it("rejects unsafe paths and generated directories", () => {
    const unsafePaths = [
      "C:/repo/src/App.tsx",
      "//server/share/file.ts",
      "../src/App.tsx",
      ".env",
      ".git/config",
      "node_modules/pkg/index.js",
      "runtime/dist/index.js",
      "app/src-tauri/target/debug/app.exe",
      ".tmp/cache.json",
      "src/App.tsx?token=secret",
      "src/App$(bad).tsx"
    ];

    for (const unsafePath of unsafePaths) {
      const view = buildWorkspaceIndexBridgeView({
        source: "synthetic_summary",
        summary: {
          ...fixedWorkspaceIndexSummary(),
          fileSummaries: [
            {
              path: unsafePath,
              language: "ts",
              extension: "ts",
              indexed: true
            }
          ]
        }
      });

      expect(view.status, unsafePath).toBe("rejected");
      expect(view.warnings.map((warning) => warning.code)).toContain(
        "WORKSPACE_INDEX_UNSAFE_PATH"
      );
    }
  });

  it("rejects too-large JSON and too many file summaries", () => {
    const parsed = parseWorkspaceIndexSummaryJson("x".repeat(64), {
      maxJsonBytes: 12
    });
    const tooManyFiles = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      maxFileSummaries: 1,
      summary: fixedWorkspaceIndexSummary()
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errorCode).toBe("WORKSPACE_INDEX_JSON_TOO_LARGE");
    }
    expect(tooManyFiles.status).toBe("rejected");
    expect(tooManyFiles.warnings.map((warning) => warning.code)).toContain(
      "WORKSPACE_INDEX_TOO_MANY_FILES"
    );
  });

  it("validates summary inputs without accepting unsafe schema", () => {
    expect(
      validateWorkspaceIndexSummaryInput({
        source: "synthetic_summary",
        summary: fixedWorkspaceIndexSummary()
      }).ok
    ).toBe(true);
    expect(
      validateWorkspaceIndexSummaryInput({
        source: "synthetic_summary",
        summary: { fileSummaries: [{ path: "http://example.test/file.ts" }] }
      })
    ).toMatchObject({
      ok: false,
      errorCode: "WORKSPACE_INDEX_UNSAFE_PATH"
    });
  });

  it("feeds Run Canvas, Context Cart, Agent Route, and Capability Plan with summary refs only", () => {
    const workspaceIndexBridge = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a code change with workspace index summaries.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Workspace index summary visible",
      workspaceRoot: "D:\\workspace",
      workspaceIndexRef: workspaceIndexBridge
    });
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection
    });
    const memoryInspector = buildMemoryInspectorView();
    const chatCanvas = buildChatRunCanvasView({
      objectiveDraft: "Prepare a code change with workspace index summaries.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Workspace index summary visible",
      workspaceRoot: "D:\\workspace",
      controlProjection,
      memoryInspector,
      approvalDiffAuditSurfaces: surfaces,
      workspaceIndexBridge
    });
    const contextCart = buildContextCartView({
      runDraft,
      workspaceIndexRef: workspaceIndexBridge
    });
    const agentRoutePreview = buildAgentRoutePreviewView({
      runDraft,
      contextCart,
      workspaceIndexRef: workspaceIndexBridge
    });
    const capabilityPlan = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview,
      contextCart,
      workspaceIndexRef: workspaceIndexBridge,
      selectedIntent: "code_change"
    });
    const serialized = JSON.stringify({
      chatCanvas,
      contextCart,
      agentRoutePreview,
      capabilityPlan
    });

    expect(
      chatCanvas.chatDraft.contextHints.find(
        (hint) => hint.id === "workspace-index"
      )?.value
    ).toContain("2/3 indexed");
    expect(contextCart.nextAction).toContain("Workspace index summary");
    expect(
      agentRoutePreview.steps
        .flatMap((step) => step.contextRefs)
        .includes("workspace-index:summary")
    ).toBe(true);
    expect(
      capabilityPlan.items.find(
        (item) => item.capabilityId === "native.workspace.index"
      )?.inputSummary
    ).toContain("2/3 indexed");
    expect(serialized).not.toContain("source code line");
    expect(serialized).not.toContain("rawDiff");
  });
});

describe("desktop source boundaries", () => {
  it("keeps refresh events and docs actions from navigating or resetting UI state", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const agentRouteSource = await readFile(
      path.join(appRoot, "src", "agent-route-preview-view.ts"),
      "utf8"
    );
    const capabilityPlanSource = await readFile(
      path.join(appRoot, "src", "capability-plan-preview-view.ts"),
      "utf8"
    );
    const memoryRecallSource = await readFile(
      path.join(appRoot, "src", "memory-recall-preview-view.ts"),
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
    expect(appSource).toContain("Read-only skeleton. No execution controls.");
    expect(appSource).toContain("No approval, apply, or");
    expect(appSource).toContain("Approval Surface");
    expect(appSource).toContain("Diff Surface");
    expect(appSource).toContain("Audit Surface");
    expect(appSource).toContain("workbenchSurfaces");
    expect(appSource).toContain("item.pathSummaries");
    expect(appSource).toContain("item.warningCodes");
    expect(appSource).toContain(
      "No patch apply. Raw source and raw diff are not displayed."
    );
    expect(appSource).toContain("Memory Inspector");
    expect(appSource).toContain("memoryInspector");
    expect(appSource).toContain(
      "Read-only skeleton. Not connected to persistence."
    );
    expect(appSource).toContain("not connected to persistence");
    expect(appSource).toContain("Commit gate UI is not enabled");
    expect(appSource).toContain("Chat / Run Canvas");
    expect(appSource).toContain("Draft only. No LLM request is sent.");
    expect(appSource).toContain("No LLM request is sent");
    expect(appSource).toContain("Create Run is disabled.");
    expect(appSource).toContain("Create Run (disabled)");
    expect(appSource).toContain("Preview Draft Run");
    expect(appSource).toContain("Run Draft Preview");
    expect(appSource).toContain("Record Draft Event (local)");
    expect(appSource).toContain("Local-only opt-in.");
    expect(appSource).toContain("recordControlRunDraftEvent");
    expect(appSource).toContain("handleRecordRunDraftEvent");
    expect(appSource).toContain("create or execute a run");
    expect(appSource).toContain("summary-only draft event");
    expect(appSource).toContain("Context Cart / Rules Ledger");
    expect(appSource).toContain("Read-only summary");
    expect(appSource).toContain(
      "Raw prompt and segment content are not displayed."
    );
    expect(appSource).toContain("buildContextCartView");
    expect(appSource).toContain("contextCart");
    expect(appSource).toContain("No context assembly report is connected yet");
    expect(appSource).toContain("Agent Route Preview");
    expect(appSource).toContain("Runtime static router preview");
    expect(appSource).toContain("runtime static router helper");
    expect(appSource).toContain("No agent");
    expect(appSource).toContain("no model request is sent");
    expect(agentRouteSource).toContain("buildStaticAgentRoutePreview");
    expect(appSource).toContain("buildAgentRoutePreviewView");
    expect(appSource).toContain("agentRoutePreview");
    expect(appSource).toContain(
      "Preview a local run draft first. Agent routes will appear here"
    );
    expect(appSource).toContain("Capability Plan Preview");
    expect(appSource).toContain("Runtime Capability Broker preview");
    expect(appSource).toContain("Capability Broker preview helper");
    expect(appSource).toContain("No capability");
    expect(appSource).toContain("permission lease is issued");
    expect(capabilityPlanSource).toContain("buildCapabilityPlanPreview");
    expect(capabilityPlanSource).toContain("runtime_capability_broker_preview");
    expect(appSource).toContain("buildCapabilityPlanPreviewView");
    expect(appSource).toContain("capabilityPlanPreview");
    expect(appSource).toContain("capabilityPlanApprovalRefs");
    expect(appSource).toContain(
      "Preview a local run draft and agent route first"
    );
    expect(appSource).toContain("Memory Recall Preview");
    expect(appSource).toContain("Runtime Memory Core preview");
    expect(appSource).toContain("summary-only memory refs");
    expect(appSource).toContain("runtime Memory Core preview helper");
    expect(appSource).toContain("Recall refs would enter volatile_tail.");
    expect(appSource).toContain("No memory is");
    expect(appSource).toContain("committed or persisted here");
    expect(appSource).toContain("buildMemoryRecallPreviewView");
    expect(appSource).toContain("memoryRecallPreview");
    expect(memoryRecallSource).toContain("buildMemoryRecallPreview");
    expect(memoryRecallSource).toContain("runtime_memory_core_preview");
    expect(memoryRecallSource).not.toContain("safeInvoke");
    expect(memoryRecallSource).not.toContain("EventStore");
    expect(memoryRecallSource).not.toContain("new InMemoryMemoryStore");
    expect(memoryRecallSource).not.toContain("createInMemoryMemoryStore");
    expect(memoryRecallSource).not.toContain("commitCandidate");
    expect(memoryRecallSource).not.toContain("revokeMemory");
    expect(memoryRecallSource).not.toContain("expireMemory");
    expect(appSource).toContain(
      "Preview a local run draft first. Memory recall summaries will"
    );
    expect(appSource).toContain("Workspace Index");
    expect(appSource).toContain("Read-only summary");
    expect(appSource).toContain("Preview Workspace Index");
    expect(appSource).toContain("buildWorkspaceIndexBridgeView");
    expect(appSource).toContain("parseWorkspaceIndexSummaryJson");
    expect(appSource).toContain("handlePreviewWorkspaceIndex");
    expect(appSource).toContain("handleWorkspaceIndexSummaryFile");
    expect(appSource).toContain("Raw file content");
    expect(appSource).toContain("does not crawl the workspace");
    expect(appSource).toContain("No filesystem crawl is performed.");
    expect(appSource).toContain("workspaceIndexBridge");
    expect(appSource).toContain("loadedWorkspaceIndexRef");
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
    expect(appSource).not.toContain("handleRecallMemory");
    expect(appSource).not.toContain("handleCreateRun");
    expect(appSource).not.toContain("handleSendChat");
    expect(appSource).not.toContain("handleRunCanvas");
    expect(appSource).not.toContain("handleRouteAgent");
    expect(appSource).not.toContain("handleSpawnAgent");
    expect(appSource).not.toContain("handleInvokeCapability");
    expect(appSource).not.toContain("handleIssueLease");
    expect(appSource).not.toContain("handleDryRunCapability");
    expect(appSource).not.toContain("handleSendToDeepSeek");
    expect(appSource).not.toContain("handleRunGit");
    expect(appSource).not.toContain("handleRunShell");
    expect(appSource).not.toContain("handleEnableBridge");
    expect(appSource).not.toContain("Send to DeepSeek");
    expect(appSource).not.toContain("Create Run</button>");
    expect(appSource).not.toContain("Run Agent");
    expect(appSource).not.toContain("Execute Agent");
    expect(appSource).not.toContain("Spawn Agent");
    expect(appSource).not.toContain("Send Agent");
    expect(appSource).not.toContain("Invoke Capability");
    expect(appSource).not.toContain("Issue Lease");
    expect(appSource).not.toContain("Execute Capability");
    expect(appSource).not.toContain("Apply Patch");
    expect(appSource).not.toContain("Run Git");
    expect(appSource).not.toContain("Run Shell");
    expect(appSource).not.toContain("Enable native bridge");
    expect(appSource).not.toContain("Native bridge enabled");
    expect(appSource).not.toContain("Approve and execute");
    expect(appSource).not.toContain("Memory commit enabled");
    expect(appSource).not.toContain("Memory recall event written");
    expect(appSource).not.toContain("commit_memory_command");
    expect(appSource).not.toContain("revoke_memory_command");
    expect(appSource).not.toContain("expire_memory_command");
    expect(appSource).not.toContain("recall_memory_command");
    expect(appSource).not.toContain("workspace_index_command");
    expect(appSource).not.toContain("scan_workspace_command");
    expect(appSource).not.toContain("crawl_workspace_command");
    expect(appSource).not.toContain("load_workspace_index_summary");
    expect(appSource).not.toContain("new InMemoryMemoryStore");
    expect(appSource).not.toContain("MemoryStore");
    expect(appSource).not.toContain("create_run_command");
    expect(appSource).not.toContain("send_chat_command");
    expect(appSource).not.toContain("run_canvas_command");
    expect(appSource).not.toContain("createControlPlaneRun");
    expect(appSource).not.toContain("createControlPlaneTask");
    expect(appSource).not.toContain("routeAgentTask");
    expect(appSource).not.toContain("planCapabilityInvocation");
    expect(appSource).not.toContain("issuePermissionLease");
    expect(appSource).not.toContain("assemblePrompt");
    expect(appSource).not.toContain("assembleContext");
    expect(appSource).not.toContain("ContextLedger");
    expect(appSource).not.toContain("ContextLedgerV2");
    expect(appSource).not.toContain("PromptAssembler");
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
      "src/memory-recall-preview-view.ts",
      "src/workspace-index-bridge-view.ts",
      "src/chat-run-canvas-view.ts",
      "src/run-draft-view.ts",
      "src/run-draft-event-view.ts",
      "src/context-cart-view.ts",
      "src/agent-route-preview-view.ts",
      "src/capability-plan-preview-view.ts",
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

  it("documents app context cart as read-only and summary-only", async () => {
    const docs = await Promise.all(
      ["app-shell-context-cart-v0.2.md", "README.md"].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("App Shell Context Cart v0.2");
    expect(combined).toContain("read-only visualization");
    expect(combined).toContain("immutable_rules");
    expect(combined).toContain("workspace_rules");
    expect(combined).toContain("task_contract");
    expect(combined).toContain("session_working_set");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("raw prompt text");
    expect(combined).toContain("raw segment content");
    expect(combined).toContain("warning codes only");
    expect(combined).toContain("frozen prefix");
    expect(combined).toContain("volatile tail");
    expect(combined).toContain("no-compress zone");
    expect(combined).toContain("No model call");
    expect(combined).toContain("No prompt assembly");
    expect(combined).toContain("No EventStore writes");
    expect(combined).toContain("No persistent context store");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("app-shell-context-cart-v0.2.md");
  });

  it("documents app agent route preview as preview-only", async () => {
    const docs = await Promise.all(
      ["app-shell-agent-route-preview-v0.2.md", "README.md"].map(
        async (file) => ({
          file,
          text: await readFile(path.join(repoRoot, "docs", file), "utf8")
        })
      )
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("App Shell Agent Route Preview v0.2");
    expect(combined).toContain("fixed roles before dynamic bidding");
    expect(combined).toContain("orchestrator -> verifier");
    expect(combined).toContain("orchestrator -> coder -> reviewer -> verifier");
    expect(combined).toContain("deepseek-v4-pro");
    expect(combined).toContain("deepseek-v4-flash");
    expect(combined).toContain("capability ids as refs only");
    expect(combined).toContain("raw objective text");
    expect(combined).toContain("warning codes only");
    expect(combined).toContain("No dynamic bidding");
    expect(combined).toContain("No real multi-agent execution");
    expect(combined).toContain("No model request");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No patch, Git, or shell execution");
    expect(combined).toContain("app-shell-agent-route-preview-v0.2.md");
  });

  it("documents runtime static agent route preview helper as pure preview-only", async () => {
    const docs = await Promise.all(
      ["runtime-static-agent-route-preview-v0.3.md", "README.md"].map(
        async (file) => ({
          file,
          text: await readFile(path.join(repoRoot, "docs", file), "utf8")
        })
      )
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("Runtime Static Agent Route Preview v0.3");
    expect(combined).toContain("pure runtime static router preview helper");
    expect(combined).toContain("runtime_static_router_preview");
    expect(combined).toContain("orchestrator -> verifier");
    expect(combined).toContain("orchestrator -> coder -> reviewer -> verifier");
    expect(combined).toContain("No dynamic bidding");
    expect(combined).toContain("No agent execution");
    expect(combined).toContain("No model call");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("runtime-static-agent-route-preview-v0.3.md");
  });

  it("documents app capability plan preview as planning-only", async () => {
    const docs = await Promise.all(
      [
        "app-shell-capability-plan-preview-v0.2.md",
        "runtime-capability-plan-preview-v0.3.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("App Shell Capability Plan Preview v0.2");
    expect(combined).toContain("Runtime Capability Plan Preview v0.3");
    expect(combined).toContain("pure runtime Capability Broker preview helper");
    expect(combined).toContain("runtime-capability-plan-preview-v0.3.md");
    expect(combined).toContain("planning-only");
    expect(combined).toContain("descriptor-style capability needs");
    expect(combined).toContain("does not invoke tools");
    expect(combined).toContain("does not issue permission leases");
    expect(combined).toContain("native.workspace.index");
    expect(combined).toContain("native.fs.write_draft");
    expect(combined).toContain("native.patch.apply` as disabled");
    expect(combined).toContain("native.git.commit_draft` as disabled");
    expect(combined).toContain("shell descriptors remain disabled");
    expect(combined).toContain("Approval Surface");
    expect(combined).toContain("No capability execution");
    expect(combined).toContain("No permission lease issuing");
    expect(combined).toContain("No real dry-run execution");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No patch, Git, or shell execution");
    expect(combined).toContain("app-shell-capability-plan-preview-v0.2.md");
  });

  it("documents patch proposal creation preview as no-apply summary-only", async () => {
    const docs = await Promise.all(
      [
        "app-shell-patch-proposal-creation-preview-v0.3.md",
        "runtime-patch-proposal-creation-preview-v0.3.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain(
      "App Shell Patch Proposal Creation Preview v0.3"
    );
    expect(combined).toContain("Runtime Patch Proposal Creation Preview v0.3");
    expect(combined).toContain("preview only");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No filesystem read or write");
    expect(combined).toContain(
      "No raw source, raw diff, or patch body display"
    );
    expect(combined).toContain("summary-only path refs");
    expect(combined).toContain("Patch and Diff Audit");
    expect(combined).toContain("Diff Surface");
    expect(combined).toContain("Approval Surface");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain("Capability Plan Preview");
    expect(combined).toContain("proposal validation");
    expect(combined).toContain("explicit approval");
    expect(combined).toContain("virtual apply");
    expect(combined).toContain("real apply");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain(
      "app-shell-patch-proposal-creation-preview-v0.3.md"
    );
    expect(combined).toContain(
      "runtime-patch-proposal-creation-preview-v0.3.md"
    );
  });

  it("documents patch proposal validation preview as validation-only and no-apply", async () => {
    const docs = await Promise.all(
      [
        "app-shell-patch-proposal-validation-preview-v0.4.md",
        "runtime-patch-proposal-validation-preview-v0.4.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const combined = `${docs.map((doc) => doc.text).join("\n")}\n${appReadme}`;

    expect(combined).toContain("Patch Proposal Validation Preview");
    expect(combined).toContain("validation preview only");
    expect(combined).toContain("no apply");
    expect(combined).toContain("No filesystem read or write");
    expect(combined).toContain("no raw source/diff display");
    expect(combined).toContain("path/schema/risk/approval/readiness");
    expect(combined).toContain("Patch Proposal Creation Preview");
    expect(combined).toContain("Diff Audit Preview");
    expect(combined).toContain("Approval Gate Draft");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain(
      "runtime-patch-proposal-validation-preview-v0.4.md"
    );
    expect(combined).toContain(
      "app-shell-patch-proposal-validation-preview-v0.4.md"
    );
  });

  it("documents app and runtime memory recall preview as volatile-tail preview only", async () => {
    const docs = await Promise.all(
      [
        "app-shell-memory-recall-preview-v0.2.md",
        "runtime-memory-recall-preview-v0.3.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("App Shell Memory Recall Preview v0.2");
    expect(combined).toContain("Runtime Memory Recall Preview v0.3");
    expect(combined).toContain("pure, browser-safe summary helper");
    expect(combined).toContain("in-memory memory summaries");
    expect(combined).toContain("runtime_memory_core_preview");
    expect(combined).toContain("preview-only");
    expect(combined).toContain("does not connect the desktop shell to memory");
    expect(combined).toContain("policy`, `project_fact`, and `pitfall");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("do not enter frozen prefix");
    expect(combined).toContain("No MemoryStore persistence connection");
    expect(combined).toContain("No persistent DB");
    expect(combined).toContain("No vector DB");
    expect(combined).toContain("No memory commit, revoke, or expire UI");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No prompt assembly");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("app-shell-memory-recall-preview-v0.2.md");
    expect(combined).toContain("runtime-memory-recall-preview-v0.3.md");
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
    expect(appReadme).toContain("draft-only, read-only, preview-only, or");
    expect(appReadme).toContain("planning-only summaries");
    expect(appReadme).toContain("no real chat, run creation");
  });

  it("documents the v0.3 coding workflow preview RC without enabling execution", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.3.0-coding-workflow-preview-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "app-shell-coding-workflow-manual-qa.md"),
      "utf8"
    );
    const checklist = await readFile(
      path.join(repoRoot, "docs", "app-shell-coding-workflow-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${releaseNotes}\n${manualQa}\n${checklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(combined).toContain("v0.3.0-coding-workflow-preview-rc.1");
    expect(combined).toContain(
      "Coding workflow preview surfaces, no execution"
    );
    expect(combined).toContain("P0F control-plane foundation");
    expect(combined).toContain("Workspace Read / Index skeleton");
    expect(combined).toContain("Patch Proposal UI Bridge");
    expect(combined).toContain("local Run Draft Preview");
    expect(combined).toContain("Context Cart / Rules Ledger visualization");
    expect(combined).toContain("Agent Route Preview");
    expect(combined).toContain("Capability Plan Preview");
    expect(combined).toContain("Memory Recall Preview");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("No real DeepSeek chat");
    expect(combined).toContain("No real ControlPlaneRun creation from UI");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No PermissionLease issuance");
    expect(combined).toContain("No memory commit, revoke, or expire UI");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No `nativeMessaging` or live bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("pnpm app:dev");
    expect(combined).toContain("D:\\workspaces\\demo");
    expect(combined).toContain("web-table-export-p0g.csv");
    expect(combined).toContain("FILE_EXISTS");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain(
      "release-notes-v0.3.0-coding-workflow-preview-rc.1.md"
    );
    expect(combined).toContain("app-shell-coding-workflow-manual-qa.md");
    expect(combined).toContain("app-shell-coding-workflow-rc-checklist.md");
  });

  it("documents the v0.4 controlled creation preview RC without enabling execution", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.4.0-controlled-creation-preview-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "app-shell-controlled-creation-manual-qa.md"),
      "utf8"
    );
    const checklist = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-controlled-creation-rc-checklist.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${releaseNotes}\n${manualQa}\n${checklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(combined).toContain("v0.4.0-controlled-creation-preview-rc.1");
    expect(combined).toContain(
      "Controlled creation preview, summary-only side effects"
    );
    expect(combined).toContain("v0.3 coding workflow preview surfaces");
    expect(combined).toContain("Workspace Index summary bridge");
    expect(combined).toContain("Run Draft summary event");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain("runtime static Agent Route Preview helper");
    expect(combined).toContain("runtime Capability Plan Preview helper");
    expect(combined).toContain("Patch Proposal Creation Preview");
    expect(combined).toContain("runtime Memory Recall Preview helper");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain("one summary-only local draft event");
    expect(combined).toContain("No real DeepSeek chat");
    expect(combined).toContain("No real ControlPlaneRun execution");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No PermissionLease issuance");
    expect(combined).toContain("No memory commit, revoke, or expire UI");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No `nativeMessaging` or live bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("pnpm app:dev");
    expect(combined).toContain("D:\\workspaces\\demo");
    expect(combined).toContain("web-table-export-p0h.csv");
    expect(combined).toContain("FILE_EXISTS");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain(
      "release-notes-v0.4.0-controlled-creation-preview-rc.1.md"
    );
    expect(combined).toContain("app-shell-controlled-creation-manual-qa.md");
    expect(combined).toContain("app-shell-controlled-creation-rc-checklist.md");
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

  it("documents the v0.3 post-release review and P0H roadmap lock", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.3-coding-workflow-preview-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0h-coding-workflow-controlled-creation-roadmap.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain("v0.3.0-coding-workflow-preview-rc.1");
    expect(combined).toContain(
      "Coding workflow preview surfaces, no execution"
    );
    expect(combined).toContain("Tag: `v0.3.0-coding-workflow-preview-rc.1`");
    expect(combined).toContain("Commit: `cbb89b9`");
    expect(combined).toContain("published pre-release");
    expect(combined).toContain("P0G is complete");
    expect(combined).toContain("P0H Coding");
    expect(combined).toContain("Workflow Controlled Creation MVP");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("Local Run Draft Preview");
    expect(combined).toContain("Context Cart / Rules Ledger visualization");
    expect(combined).toContain("Agent Route Preview");
    expect(combined).toContain("Capability Plan Preview");
    expect(combined).toContain("Patch Proposal UI Bridge");
    expect(combined).toContain("Memory Recall Preview");
    expect(combined).toContain("Bridge Proposal Preview");
    expect(combined).toContain("Real DeepSeek chat");
    expect(combined).toContain("Real ControlPlaneRun creation");
    expect(combined).toContain("Patch apply");
    expect(combined).toContain("Git execution");
    expect(combined).toContain("Shell execution");
    expect(combined).toContain("Capability invocation");
    expect(combined).toContain("PermissionLease issuing");
    expect(combined).toContain("Memory commit, revoke, or expire UI");
    expect(combined).toContain("MCP, plugin, or skills runtime");
    expect(combined).toContain("Native bridge");
    expect(combined).toContain("Desktop action");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("manual GUI QA");
    expect(combined).toContain("GitHub Actions warning");
    expect(combined).toContain("Tauri bundle identifier warning");
    expect(combined).toContain("No raw payload uploads");
    expect(combined).toContain("No raw CSV uploads");
    expect(combined).toContain("No raw source uploads");
    expect(combined).toContain("No raw prompt uploads");
    expect(combined).toContain("No API key uploads");
    expect(combined).toContain("No ignored `conformance/results/`");
    expect(combined).toContain("P0H-001 Workspace Index To App Bridge");
    expect(combined).toContain(
      "P0H-002 Run Draft To Control Plane Draft Event"
    );
    expect(combined).toContain("P0H-003 Context Cart From Run Draft");
    expect(combined).toContain("P0H-004 Static Agent Route Preview");
    expect(combined).toContain("P0H-005 Capability Plan Preview");
    expect(combined).toContain("P0H-006 Patch Proposal Creation Preview");
    expect(combined).toContain("P0H-007 Memory Recall Preview");
    expect(combined).toContain(
      "P0H-008 Coding Workflow Controlled Creation RC"
    );
    expect(combined).toContain("controlled creation MVP");
    expect(combined).toContain("still does not allow arbitrary execution");
    expect(combined).toContain("Do not crawl the real filesystem by default");
    expect(combined).toContain(
      "v0.3-coding-workflow-preview-postrelease-review.md"
    );
    expect(combined).toContain(
      "p0h-coding-workflow-controlled-creation-roadmap.md"
    );
  });

  it("documents the v0.4 post-release review and P0I roadmap lock", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.4-controlled-creation-preview-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0i-validation-approval-virtual-apply-roadmap.md"
      ),
      "utf8"
    );
    const plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0i-001-patch-proposal-validation-preview-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${plan}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain("v0.4.0-controlled-creation-preview-rc.1");
    expect(combined).toContain(
      "Controlled creation preview, summary-only side effects"
    );
    expect(combined).toContain(
      "Tag: `v0.4.0-controlled-creation-preview-rc.1`"
    );
    expect(combined).toContain("Commit: `7a1ac07`");
    expect(combined).toContain("release tag CI succeeded");
    expect(combined).toContain("P0H is complete");
    expect(combined).toContain("P0I Validation / Approval / Virtual Apply");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("Workspace Index summary bridge");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain("Runtime Agent Route Preview helper");
    expect(combined).toContain("Runtime Capability Plan Preview helper");
    expect(combined).toContain("Patch Proposal Creation Preview");
    expect(combined).toContain("Patch Proposal / Diff UI Bridge");
    expect(combined).toContain("Approval / Diff / Audit Surfaces");
    expect(combined).toContain("Runtime Memory Recall Preview helper");
    expect(combined).toContain("Bridge Proposal Preview");
    expect(combined).toContain("Real DeepSeek chat");
    expect(combined).toContain("Real run execution");
    expect(combined).toContain("Patch apply");
    expect(combined).toContain("Git execution");
    expect(combined).toContain("Shell execution");
    expect(combined).toContain("Capability invocation");
    expect(combined).toContain("PermissionLease issuing");
    expect(combined).toContain("Memory commit, revoke, or expire UI");
    expect(combined).toContain("MCP, plugin, or skills runtime");
    expect(combined).toContain("Native bridge");
    expect(combined).toContain("Desktop action");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("manual GUI QA");
    expect(combined).toContain("GitHub Actions Node warning");
    expect(combined).toContain("Tauri bundle identifier warning");
    expect(combined).toContain("No raw payload uploads");
    expect(combined).toContain("No raw CSV uploads");
    expect(combined).toContain("No raw source uploads");
    expect(combined).toContain("No raw prompt uploads");
    expect(combined).toContain("No API key uploads");
    expect(combined).toContain("No ignored `conformance/results/`");
    expect(combined).toContain("P0I-001 Patch Proposal Validation Preview");
    expect(combined).toContain("P0I-002 Patch Diff Audit Preview");
    expect(combined).toContain("P0I-003 Approval Gate Draft");
    expect(combined).toContain("P0I-004 Virtual Apply Preview");
    expect(combined).toContain("P0I-005 Rollback Checkpoint Preview");
    expect(combined).toContain("P0I-006 Replay Projection");
    expect(combined).toContain(
      "P0I-007 App Shell Validation / Approval / Virtual Apply RC Polish"
    );
    expect(combined).toContain("P0I-008 Post-Release Review");
    expect(combined).toContain("Do not implement this plan in P0H-009");
    expect(combined).toContain("Input Model");
    expect(combined).toContain("Validation Rules");
    expect(combined).toContain("Risk Output");
    expect(combined).toContain("App UI Summary Mapping");
    expect(combined).toContain(
      "v0.4-controlled-creation-preview-postrelease-review.md"
    );
    expect(combined).toContain(
      "p0i-validation-approval-virtual-apply-roadmap.md"
    );
    expect(combined).toContain(
      "p0i-001-patch-proposal-validation-preview-plan.md"
    );
  });

  it("documents P0H-001 as a read-only Workspace Index to App bridge plan", async () => {
    const plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0h-001-workspace-index-to-app-bridge-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(plan).toContain("Do not implement this plan in P0G-009");
    expect(plan).toContain("Scope");
    expect(plan).toContain("Non-Goals");
    expect(plan).toContain("Data Model");
    expect(plan).toContain("Source Of Workspace Index Summaries");
    expect(plan).toContain("Path And Secret Safety");
    expect(plan).toContain("Summary-Only UI Mapping");
    expect(plan).toContain("Tests");
    expect(plan).toContain("Commands To Run");
    expect(plan).toContain("Completion Report Format");
    expect(plan).toContain("AppWorkspaceIndexBridgeView");
    expect(plan).toContain("synthetic fixture summaries");
    expect(plan).toContain("explicit app-local safe summary input");
    expect(plan).toContain("No raw file content display");
    expect(plan).toContain("No filesystem crawling by default");
    expect(plan).toContain("No `.env`");
    expect(plan).toContain("No patch apply");
    expect(plan).toContain("No Git execution");
    expect(plan).toContain("No shell execution");
    expect(plan).toContain("No DeepSeek call");
    expect(plan).toContain("No real ControlPlaneRun creation");
    expect(plan).toContain("No capability invocation");
    expect(plan).toContain("No PermissionLease issuing");
    expect(plan).toContain("no EventStore write");
    expect(plan).toContain("no Tauri invoke added");
    expect(plan).toContain("DW-P0H-001");
    expect(plan).toContain("DW-P0H-002 Run Draft -> Control Plane Draft Event");
    expect(docsIndex).toContain(
      "p0h-001-workspace-index-to-app-bridge-plan.md"
    );
  });

  it("documents the App Shell Workspace Index bridge without enabling scanning", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "app-shell-workspace-index-bridge-v0.3.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${doc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("Workspace Index Bridge v0.3");
    expect(combined).toContain("read-only App Shell surface");
    expect(combined).toContain("summary-only `WorkspaceIndex` JSON");
    expect(combined).toContain("not a workspace scanner");
    expect(combined).toContain("No real workspace scanner");
    expect(combined).toContain("No filesystem crawling");
    expect(combined).toContain("No `.env`");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("app-shell-workspace-index-bridge-v0.3.md");
    expect(appReadme).toContain("Workspace Index summary bridge");
    expect(appReadme).toContain("summary-only JSON previews");
  });

  it("documents the App Shell Run Draft Event bridge as local-only opt-in", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "app-shell-run-draft-event-v0.3.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${doc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("Run Draft Event v0.3");
    expect(combined).toContain("local, summary-only");
    expect(combined).toContain("Record Draft Event (local)");
    expect(combined).toContain("control.run.draft_recorded");
    expect(combined).toContain(".deepseek-workbench/events.jsonl");
    expect(combined).toContain("not run creation");
    expect(combined).toContain("No real ControlPlaneRun creation");
    expect(combined).toContain("No execution");
    expect(combined).toContain("No PermissionLease issuing");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No native bridge");
    expect(docsIndex).toContain("app-shell-run-draft-event-v0.3.md");
    expect(appReadme).toContain("summary-only Run Draft Event");
  });

  it("documents the App Shell Context Assembly Preview as local-only and prompt-free", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "app-shell-context-assembly-preview-v0.3.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${doc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("Context Assembly Preview v0.3");
    expect(combined).toContain("local App Shell view model");
    expect(combined).toContain("does not assemble a real prompt");
    expect(combined).toContain("call DeepSeek");
    expect(combined).toContain("write events");
    expect(combined).toContain("frozen prefix");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("Workspace Index refs");
    expect(combined).toContain("Memory Recall refs");
    expect(combined).toContain("Patch proposal summaries");
    expect(combined).toContain("No actual prompt generation");
    expect(combined).toContain("No DeepSeek request");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No raw content display");
    expect(docsIndex).toContain("app-shell-context-assembly-preview-v0.3.md");
    expect(appReadme).toContain("Context Assembly Preview");
    expect(appReadme).toContain("no App Shell prompt assembly");
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
