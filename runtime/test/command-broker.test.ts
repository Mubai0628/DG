import { describe, expect, it } from "vitest";

import {
  buildCommandBrokerPlan,
  buildCommandExecutionPolicy,
  buildCommandExecutionRequest,
  classifyDangerousCommand,
  summarizeCommandBrokerPlan,
  type CommandBrokerInput,
  type CommandBrokerReadiness,
  type CommandExecutionMode
} from "../src/index.js";

function brokerInput(
  mode: CommandExecutionMode,
  commandText: string,
  overrides: Partial<CommandBrokerInput> = {}
): CommandBrokerInput {
  const request = buildCommandExecutionRequest({
    requestId: `request-${mode}`,
    mode,
    sessionLeaseRef: `lease:${mode}`,
    workspaceRootRef: "workspace:demo",
    workingDirectoryRef: "workspace:demo:root",
    commandText,
    argv: commandText.split(/\s+/),
    shellKind: mode === "autonomous_safe" ? "none" : "powershell",
    environmentPolicy: { mode: "empty" },
    transcriptPolicy: "transcript:summary-only",
    timeoutMs: 30_000,
    maxOutputBytes: 32_000,
    allowWorkspaceWrite: mode === "advanced_workspace",
    allowOutsideWorkspaceWrite: false,
    allowGitWrite: false,
    allowDestructive: false,
    allowBackgroundProcess: false,
    allowNetwork: false
  });
  const policy = buildCommandExecutionPolicy({
    mode,
    sessionLeaseRef: `lease:${mode}`,
    workspaceRootRef: "workspace:demo"
  });

  return {
    commandRequest: request,
    policy,
    classifierResult: classifyDangerousCommand({
      commandText,
      shellKind: request.commandSummary.shellKind
    }),
    permissionMode: mode,
    sessionLease: {
      leaseId: `lease:${mode}`,
      status: "valid",
      mode,
      explicitLease: mode === "full_access"
    },
    riskBudget: {
      budgetId: "risk-budget:test",
      status: "valid",
      remainingRiskUnits: 10,
      allowsCommandBroker: true
    },
    killSwitchState: { active: false },
    transcriptPolicyRef: "transcript:summary-only",
    idGenerator: () => `broker-${mode}`,
    ...overrides
  };
}

function codes(result: { findings: { code: string }[] }): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoProcessExecution(readiness: CommandBrokerReadiness): void {
  expect(readiness).toMatchObject({
    canCallTauriCommand: false,
    canExecuteCommand: false,
    canSpawnProcess: false,
    canWriteFilesystem: false,
    canExecuteGitWrite: false,
    canRunBackgroundProcess: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canUseNativeBridge: false,
    canExecuteDesktopAction: false,
    appCanExecute: false
  });
}

describe("runtime command broker planner", () => {
  it("lets approval mode shell reach the receipt-gated execution phase", () => {
    const plan = buildCommandBrokerPlan(
      brokerInput("approval", "node --version")
    );

    // Approval mode no longer blocks the shell kind: execution is gated by
    // the bound approval receipt at the Tauri command, not by the planner.
    expect(plan.decision).toBe("ready_for_tauri_execution");
    expect(codes(plan)).not.toContain("APPROVAL_MODE_ARBITRARY_SHELL_BLOCKED");
    expectNoProcessExecution(plan.readiness);
  });

  it("allows autonomous safe allowlisted verification to reach future Tauri phase", () => {
    const plan = buildCommandBrokerPlan(
      brokerInput("autonomous_safe", "node --version")
    );
    const serialized = JSON.stringify(plan);

    expect(plan.decision).toBe("ready_for_tauri_execution");
    expect(plan.status).toBe("ready");
    expect(plan.readiness.canEnterFutureTauriExecutionPhase).toBe(true);
    expect(serialized).not.toContain("node --version");
    expectNoProcessExecution(plan.readiness);
  });

  it("allows safe advanced workspace shell metadata", () => {
    const plan = buildCommandBrokerPlan(
      brokerInput("advanced_workspace", "node --version")
    );

    expect(plan.decision).toBe("ready_for_tauri_execution");
    expect(plan.workingDirectoryPlan?.workspaceRootRef).toBe("workspace:demo");
    expect(plan.environmentPlan?.rawEnvValuesPresent).toBe(false);
    expectNoProcessExecution(plan.readiness);
  });

  it("blocks destructive commands in advanced workspace mode", () => {
    const plan = buildCommandBrokerPlan(
      brokerInput("advanced_workspace", "rm -rf dist")
    );

    expect(plan.decision).toBe("blocked");
    expect(codes(plan)).toContain("COMMAND_REQUEST_BLOCKED");
    expect(codes(plan)).toContain("DANGEROUS_CATEGORY_BLOCKED");
    expect(plan.classifierSummary?.categories).toContain("recursive_delete");
    expectNoProcessExecution(plan.readiness);
  });

  it("models full access but keeps destructive categories future-blocked", () => {
    const plan = buildCommandBrokerPlan(
      brokerInput("full_access", "Remove-Item dist -Recurse")
    );

    expect(plan.decision).toBe("blocked");
    expect(codes(plan)).toContain("DANGEROUS_CATEGORY_BLOCKED");
    expect(plan.mode).toBe("full_access");
    expectNoProcessExecution(plan.readiness);
  });

  it("blocks every command when kill switch is active", () => {
    const plan = buildCommandBrokerPlan(
      brokerInput("advanced_workspace", "node --version", {
        killSwitchState: { active: true, reasonCode: "manual_stop" }
      })
    );

    expect(plan.decision).toBe("blocked");
    expect(codes(plan)).toContain("KILL_SWITCH_ACTIVE");
    expectNoProcessExecution(plan.readiness);
  });

  it("generates transcript, environment, working-directory, and limit plans", () => {
    const plan = buildCommandBrokerPlan(
      brokerInput("advanced_workspace", "node --version")
    );
    const summary = summarizeCommandBrokerPlan(plan);

    expect(plan.transcriptPlan).toMatchObject({
      transcriptPolicyRef: "transcript:summary-only",
      captureStdout: true,
      captureStderr: true,
      summaryOnly: true,
      rawOutputInline: false
    });
    expect(plan.environmentPlan?.envNameCount).toBe(0);
    expect(plan.workingDirectoryPlan?.workingDirectoryHash).toBeDefined();
    expect(plan.limitPlan?.allowBackgroundProcess).toBe(false);
    expect(summary.findingCodes).toEqual([]);
    expectNoProcessExecution(plan.readiness);
  });

  it("keeps full access safe metadata ready only with explicit lease", () => {
    const missingLease = buildCommandBrokerPlan(
      brokerInput("full_access", "node --version", {
        sessionLease: {
          leaseId: "lease:full_access",
          status: "valid",
          mode: "full_access",
          explicitLease: false
        }
      })
    );
    const explicitLease = buildCommandBrokerPlan(
      brokerInput("full_access", "node --version")
    );

    expect(missingLease.decision).toBe("blocked");
    expect(codes(missingLease)).toContain(
      "FULL_ACCESS_REQUIRES_EXPLICIT_LEASE"
    );
    expect(explicitLease.decision).toBe("ready_for_tauri_execution");
    expectNoProcessExecution(missingLease.readiness);
    expectNoProcessExecution(explicitLease.readiness);
  });
});
