import { describe, expect, it, vi } from "vitest";

import {
  buildPluginSkillSandboxContract,
  runBuiltinSafeSkillSimulation,
  type BuiltinSafeSkillSimulationResult
} from "../src/index.js";

function sandboxContract(): ReturnType<typeof buildPluginSkillSandboxContract> {
  return buildPluginSkillSandboxContract({
    mode: "simulated_builtin_safe",
    inputSummaryPolicy: "summary_only",
    outputSummaryPolicy: "summary_only",
    maxInputBytes: 4096,
    maxOutputBytes: 2048,
    timeoutMs: 1000,
    idGenerator: () => "sandbox.contract.test"
  });
}

function baseInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    contract: sandboxContract(),
    simulationKind: "summarize_manifest_risk",
    manifestSummary: {
      id: "plugin.safe.docs",
      kind: "plugin",
      summary: "Read-only docs plugin manifest metadata.",
      riskLevel: "low",
      warningCodes: []
    },
    createdAt: "2026-07-02T00:00:00.000Z",
    ...overrides
  };
}

function findingCodes(result: BuiltinSafeSkillSimulationResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: BuiltinSafeSkillSimulationResult): void {
  expect(result.readiness).toMatchObject({
    canExecuteCustomCode: false,
    canRunSkillRuntime: false,
    canExecutePlugin: false,
    canInstallPackage: false,
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

describe("built-in safe skill simulation", () => {
  it("summarizes manifest risk without arbitrary execution", () => {
    const result = runBuiltinSafeSkillSimulation(baseInput());

    expect(result.status).toBe("simulated");
    expect(result.simulationKind).toBe("summarize_manifest_risk");
    expect(result.summary.source).toBe(
      "runtime_builtin_safe_skill_simulation_summary"
    );
    expect(result.summary.simulatedOnly).toBe(true);
    expect(result.summary.executedCustomCode).toBe(false);
    expect(result.outputSummary.rawOutputPresent).toBe(false);
    expect(result.outputSummary.mutationRequested).toBe(false);
    expect(result.readiness.canEnterDescriptorPreview).toBe(true);
    expectNoExecution(result);
  });

  it("classifies capability risk and warns for high-risk metadata", () => {
    const result = runBuiltinSafeSkillSimulation(
      baseInput({
        simulationKind: "classify_capability_risk",
        manifestSummary: undefined,
        capabilitySummary: {
          id: "plugin.high.risk",
          kind: "capability",
          summary: "Capability requires manual review.",
          riskLevel: "high",
          warningCodes: []
        }
      })
    );

    expect(result.status).toBe("warning");
    expect(result.outputSummary.riskLevel).toBe("high");
    expect(findingCodes(result)).toContain("HIGH_RISK_SUMMARY_WARNING");
    expectNoExecution(result);
  });

  it("validates required input summary", () => {
    const result = runBuiltinSafeSkillSimulation(
      baseInput({
        simulationKind: "validate_required_input_summary",
        manifestSummary: undefined,
        inputSummary: {
          id: "input.summary",
          kind: "task_input",
          summary: "Objective and refs are present.",
          summaryHash: "abc12345",
          warningCodes: []
        }
      })
    );

    expect(result.status).toBe("simulated");
    expect(result.outputSummary.checklistItemCount).toBe(3);
    expectNoExecution(result);
  });

  it("generates documentation checklist from summary refs", () => {
    const result = runBuiltinSafeSkillSimulation(
      baseInput({
        simulationKind: "generate_documentation_checklist",
        manifestSummary: undefined,
        documentationRefs: [
          {
            refId: "docs.runtime",
            kind: "runtime_doc",
            summary: "Runtime doc summary.",
            summaryHash: "def67890"
          }
        ]
      })
    );

    expect(result.status).toBe("simulated");
    expect(result.outputSummary.checklistItemCount).toBeGreaterThanOrEqual(4);
    expectNoExecution(result);
  });

  it("blocks missing or non-simulation-ready contracts", () => {
    const disabledContract = buildPluginSkillSandboxContract({
      mode: "metadata_only",
      inputSummaryPolicy: "summary_only",
      outputSummaryPolicy: "summary_only"
    });
    const result = runBuiltinSafeSkillSimulation(
      baseInput({
        contract: disabledContract
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain(
      "SIMULATED_BUILTIN_SAFE_MODE_REQUIRED"
    );
    expect(findingCodes(result)).toContain(
      "SANDBOX_CONTRACT_NOT_SIMULATION_READY"
    );
    expectNoExecution(result);
  });

  it("blocks unknown simulation kinds and missing summary inputs", () => {
    const unknown = runBuiltinSafeSkillSimulation(
      baseInput({ simulationKind: "run_custom_code" })
    );
    const missing = runBuiltinSafeSkillSimulation(
      baseInput({
        simulationKind: "validate_required_input_summary",
        manifestSummary: undefined
      })
    );

    expect(unknown.status).toBe("blocked");
    expect(findingCodes(unknown)).toContain(
      "UNKNOWN_BUILTIN_SIMULATION_KIND_REJECTED"
    );
    expect(missing.status).toBe("blocked");
    expect(findingCodes(missing)).toContain("INPUT_SUMMARY_REQUIRED");
    expectNoExecution(unknown);
    expectNoExecution(missing);
  });

  it("blocks custom code, external imports, shell, network, filesystem, EventStore, and mutation", () => {
    const result = runBuiltinSafeSkillSimulation(
      baseInput({
        customCode: "function run() { return true; }",
        importExternalPackage: "left-pad",
        shellCommand: "node script.js",
        fetch: "network",
        filesystemWrite: true,
        eventStoreWrite: true,
        mutationRequest: "apply patch"
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("CUSTOM_CODE_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("EXTERNAL_PACKAGE_IMPORT_REJECTED");
    expect(findingCodes(result)).toContain("SHELL_COMMAND_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("FETCH_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("FILESYSTEM_WRITE_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("EVENTSTORE_WRITE_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("MUTATION_REQUEST_FIELD_REJECTED");
    expectNoExecution(result);
  });

  it("blocks raw prompt, raw source, API key markers, and readiness true without echoing secrets", () => {
    const result = runBuiltinSafeSkillSimulation(
      baseInput({
        rawPrompt: "prompt",
        rawSource: "source",
        notes: "sk-fakesimulation000000",
        readiness: {
          canRunSkillRuntime: true
        }
      })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("RAW_SOURCE_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(findingCodes(result)).toContain("EXECUTION_READINESS_TRUE");
    expect(serialized).not.toContain("sk-fakesimulation000000");
    expectNoExecution(result);
  });

  it("does not read process env or call global fetch", () => {
    const original = globalThis.fetch;
    const fetchSpy = vi.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchSpy
    });
    const before = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "sk-fake-env-sentinel-000000";

    try {
      const result = runBuiltinSafeSkillSimulation(baseInput());

      expect(result.status).toBe("simulated");
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toContain(
        "sk-fake-env-sentinel-000000"
      );
    } finally {
      if (before === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = before;
      }
      Object.defineProperty(globalThis, "fetch", {
        configurable: true,
        writable: true,
        value: original
      });
    }
  });
});
