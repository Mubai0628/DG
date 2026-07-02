import { describe, expect, it } from "vitest";

import {
  buildPluginSkillSandboxContract,
  summarizePluginSkillSandboxContract,
  type PluginSkillSandboxContract
} from "../src/index.js";

function baseContract(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    mode: "simulated_builtin_safe",
    inputSummaryPolicy: "summary_only",
    outputSummaryPolicy: "summary_only",
    maxInputBytes: 4096,
    maxOutputBytes: 2048,
    timeoutMs: 1000,
    createdAt: "2026-07-02T00:00:00.000Z",
    ...overrides
  };
}

function findingCodes(result: PluginSkillSandboxContract): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: PluginSkillSandboxContract): void {
  expect(result.readiness).toMatchObject({
    canInstallPackage: false,
    canLoadPluginCode: false,
    canRunSkillRuntime: false,
    canExecuteCustomCode: false,
    canImportExternalPackage: false,
    canUseNetwork: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canExecuteShell: false,
    canExecuteGit: false,
    canUseNativeBridge: false,
    canUseDesktopAction: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("plugin skill sandbox contract", () => {
  it("builds a simulated built-in safe sandbox contract", () => {
    const result = buildPluginSkillSandboxContract(baseContract());
    const summary = summarizePluginSkillSandboxContract(result);

    expect(result.status).toBe("simulation_ready");
    expect(result.mode).toBe("simulated_builtin_safe");
    expect(result.readiness.canEnterBuiltinSafeSimulation).toBe(true);
    expect(summary.source).toBe(
      "runtime_plugin_skill_sandbox_contract_summary"
    );
    expect(summary.inputSummaryPolicy).toBe("summary_only");
    expect(summary.outputSummaryPolicy).toBe("summary_only");
    expect(summary.allowedSimulationKinds).toContain("summarize_manifest_risk");
    expectNoExecution(result);
  });

  it("supports disabled and metadata-only contracts without execution readiness", () => {
    const disabled = buildPluginSkillSandboxContract(
      baseContract({ mode: "disabled" })
    );
    const metadata = buildPluginSkillSandboxContract(
      baseContract({ mode: "metadata_only" })
    );

    expect(disabled.status).toBe("disabled");
    expect(disabled.readiness.canEnterBuiltinSafeSimulation).toBe(false);
    expect(metadata.status).toBe("metadata_only");
    expect(metadata.readiness.canRegisterMetadata).toBe(true);
    expect(metadata.readiness.canEnterBuiltinSafeSimulation).toBe(false);
    expectNoExecution(disabled);
    expectNoExecution(metadata);
  });

  it("parses JSON string input and keeps deterministic id/hash with injected id", () => {
    const result = buildPluginSkillSandboxContract(
      JSON.stringify(baseContract({ idGenerator: undefined }))
    );
    const injected = buildPluginSkillSandboxContract(
      baseContract({
        idGenerator: () => "sandbox.contract.fixed"
      })
    );
    const injectedAgain = buildPluginSkillSandboxContract(
      baseContract({
        idGenerator: () => "sandbox.contract.fixed"
      })
    );

    expect(result.status).toBe("simulation_ready");
    expect(injected.contractId).toBe("sandbox.contract.fixed");
    expect(injected.contractHash).toBe(injectedAgain.contractHash);
  });

  it("blocks denied execution modes", () => {
    for (const mode of [
      "arbitrary_code",
      "package_runtime",
      "shell",
      "native",
      "desktop"
    ]) {
      const result = buildPluginSkillSandboxContract(baseContract({ mode }));
      expect(result.status).toBe("blocked");
      expect(findingCodes(result)).toContain("DENIED_SANDBOX_MODE_REJECTED");
      expectNoExecution(result);
    }
  });

  it("blocks custom code, eval, function constructor, and external imports", () => {
    const result = buildPluginSkillSandboxContract(
      baseContract({
        customCode: "function run() { return true; }",
        eval: "eval blocked",
        functionConstructor: "Function blocked",
        importExternalPackage: "left-pad"
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("CUSTOM_CODE_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("EVAL_FIELD_REJECTED");
    expect(findingCodes(result)).toContain(
      "FUNCTION_CONSTRUCTOR_FIELD_REJECTED"
    );
    expect(findingCodes(result)).toContain("EXTERNAL_PACKAGE_IMPORT_REJECTED");
    expectNoExecution(result);
  });

  it("blocks shell, process, network, filesystem, EventStore, and mutation requests", () => {
    const result = buildPluginSkillSandboxContract(
      baseContract({
        shellCommand: "node script.js",
        process: "spawn",
        network: true,
        filesystemWrite: true,
        eventStoreWrite: true,
        mutationRequest: "apply patch"
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SHELL_COMMAND_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("PROCESS_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("NETWORK_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("FILESYSTEM_WRITE_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("EVENTSTORE_WRITE_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("MUTATION_REQUEST_FIELD_REJECTED");
    expectNoExecution(result);
  });

  it("blocks raw source, raw prompt, API key markers, and readiness true", () => {
    const result = buildPluginSkillSandboxContract(
      baseContract({
        rawSource: "source",
        rawPrompt: "prompt",
        notes: "sk-fakesandbox000000",
        readiness: {
          canExecuteCustomCode: true
        }
      })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAW_SOURCE_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(findingCodes(result)).toContain("EXECUTION_READINESS_TRUE");
    expect(serialized).not.toContain("sk-fakesandbox000000");
    expectNoExecution(result);
  });

  it("blocks oversized budgets and unknown simulation kinds", () => {
    const result = buildPluginSkillSandboxContract(
      baseContract({
        maxInputBytes: 99_999,
        maxOutputBytes: 99_999,
        timeoutMs: 99_999,
        allowedSimulationKinds: ["summarize_manifest_risk", "run_custom_code"]
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("MAX_INPUT_BYTES_REJECTED");
    expect(findingCodes(result)).toContain("MAX_OUTPUT_BYTES_REJECTED");
    expect(findingCodes(result)).toContain("TIMEOUT_MS_REJECTED");
    expect(findingCodes(result)).toContain("UNKNOWN_SIMULATION_KIND_REJECTED");
    expectNoExecution(result);
  });
});
