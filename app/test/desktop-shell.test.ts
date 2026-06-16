import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  checkDesktopRunnerPreflight,
  invokeAllowedCommand,
  isAllowedDesktopCommand,
  runDesktopWebTableToCsvFlow,
  type TauriInvoke
} from "../src/desktop-flow.js";
import {
  buildResultPanelModel,
  canRunWithPreflight,
  maxPayloadTextBytes,
  parsePayloadJson,
  runnerPreflightMessage,
  safeErrorMessage,
  validatePayloadTextSize,
  validateDesktopFlowInput,
  type DesktopFlowResult,
  type RunnerPreflightSummary
} from "../src/safety.js";
import {
  runWebTableToCsvFlow,
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

function runNodeScript(args: string[]): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: repoRoot,
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
});

describe("desktop command wrapper", () => {
  it("refuses unknown command names", async () => {
    await expect(invokeAllowedCommand("unknown_command", {})).rejects.toThrow(
      "not allowed"
    );
    expect(isAllowedDesktopCommand("check_runner_preflight")).toBe(true);
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
    expect(result.stderr).not.toContain("csvContent");
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
    const combined = (
      await Promise.all(
        sourceFiles.map((file) => readFile(path.join(appRoot, file), "utf8"))
      )
    ).join("\n");

    expect(combined).not.toContain("nativeMessaging");
    expect(combined).not.toContain("@tauri-apps/plugin-shell");
    expect(combined).not.toContain("Command::new(command");
    expect(combined).not.toContain("localStorage");
    expect(combined).not.toContain("sessionStorage");
    expect(combined).not.toContain("shell:allow");
    expect(combined).toContain(".args(args)");
    expect(combined).toContain("env_clear()");
    expect(combined).toContain("sanitize_env_vars");
    expect(combined).toContain("RUNNER_TIMEOUT");
    expect(combined).toContain('join("run-flow.mjs")');
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
