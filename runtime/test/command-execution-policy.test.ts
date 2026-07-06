import { describe, expect, it } from "vitest";

import {
  buildCommandExecutionPolicy,
  buildCommandExecutionRequest,
  summarizeCommandExecutionRequest,
  validateCommandExecutionRequest,
  type CommandExecutionReadiness,
  type CommandExecutionRequestInput
} from "../src/index.js";

function safeRequest(
  overrides: Partial<CommandExecutionRequestInput> = {}
): CommandExecutionRequestInput {
  return {
    requestId: "command-request-safe",
    mode: "advanced_workspace",
    sessionLeaseRef: "lease:command-broker:test",
    workspaceRootRef: "workspace:demo",
    workingDirectoryRef: "workspace:demo:root",
    commandText: "pnpm --filter runtime typecheck",
    argv: ["pnpm", "--filter", "runtime", "typecheck"],
    shellKind: "powershell",
    environmentPolicy: {
      mode: "allowlist_names",
      allowedEnvNames: ["CI"]
    },
    transcriptPolicy: "transcript:summary-only",
    timeoutMs: 60_000,
    maxOutputBytes: 64_000,
    allowBackgroundProcess: false,
    allowNetwork: false,
    allowWorkspaceWrite: true,
    allowOutsideWorkspaceWrite: false,
    allowGitWrite: false,
    allowDestructive: false,
    createdAt: "2026-07-06T00:00:00.000Z",
    ...overrides
  };
}

function codes(result: { findings: { code: string }[] }): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(readiness: CommandExecutionReadiness): void {
  expect(readiness).toMatchObject({
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
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("command execution policy schema", () => {
  it("builds a fixed safe lane policy", () => {
    const policy = buildCommandExecutionPolicy({
      mode: "approval",
      sessionLeaseRef: "lease:fixed-safe-lane",
      workspaceRootRef: "workspace:demo",
      idGenerator: () => "policy-fixed-safe-lane"
    });

    expect(policy.status).toBe("valid");
    expect(policy.policyId).toBe("policy-fixed-safe-lane");
    expect(policy.allowedScopes).toContain("fixed_safe_lane");
    expect(policy.allowedScopes).not.toContain("outside_workspace_write");
    expect(policy.summaryOnly).toBe(true);
    expectNoExecution(policy.readiness);
  });

  it("builds an advanced workspace shell request as summary-only metadata", () => {
    const request = buildCommandExecutionRequest(safeRequest());
    const summary = summarizeCommandExecutionRequest(request);
    const serialized = JSON.stringify({ request, summary });

    expect(request.status).toBe("valid");
    expect(request.readiness.canEnterFutureCommandBroker).toBe(true);
    expect(request.commandSummary.argvCount).toBe(4);
    expect(request.capabilityRequests.allowWorkspaceWrite).toBe(true);
    expect(summary.source).toBe(
      "runtime_command_execution_request_summary"
    );
    expect(serialized).not.toContain("pnpm --filter runtime typecheck");
    expect(serialized).not.toContain("workspace:demo:root");
    expectNoExecution(request.readiness);
  });

  it("models full access but keeps execution disabled", () => {
    const request = buildCommandExecutionRequest(
      safeRequest({
        mode: "full_access",
        allowOutsideWorkspaceWrite: true,
        idGenerator: () => "request-full-access-modeled"
      })
    );

    expect(request.status).toBe("warning");
    expect(codes(request)).toContain(
      "HIGH_PRIVILEGE_MODE_MODELED_NO_EXECUTION"
    );
    expect(request.readiness.canEnterFutureCommandBroker).toBe(true);
    expectNoExecution(request.readiness);
  });

  it("blocks unsafe environment names", () => {
    const request = buildCommandExecutionRequest(
      safeRequest({
        environmentPolicy: {
          mode: "allowlist_names",
          allowedEnvNames: ["DEEPSEEK_API_KEY"]
        }
      })
    );

    expect(request.status).toBe("blocked");
    expect(codes(request)).toContain("SECRET_ENV_NAME_REJECTED");
    expectNoExecution(request.readiness);
  });

  it("blocks background processes", () => {
    const request = buildCommandExecutionRequest(
      safeRequest({ allowBackgroundProcess: true })
    );

    expect(request.status).toBe("blocked");
    expect(codes(request)).toContain("BACKGROUND_PROCESS_REJECTED");
    expectNoExecution(request.readiness);
  });

  it("blocks too-long timeouts", () => {
    const request = buildCommandExecutionRequest(
      safeRequest({ timeoutMs: 120_001 })
    );

    expect(request.status).toBe("blocked");
    expect(codes(request)).toContain("TIMEOUT_TOO_HIGH");
    expectNoExecution(request.readiness);
  });

  it("blocks raw token markers without echoing them", () => {
    const fakeToken = ["s", "k-fakeCOMMANDTOKEN0000"].join("");
    const request = buildCommandExecutionRequest(
      safeRequest({ commandText: `node script.js ${fakeToken}` })
    );
    const serialized = JSON.stringify(request);

    expect(request.status).toBe("blocked");
    expect(codes(request)).toContain("API_KEY_MARKER");
    expect(serialized).not.toContain(fakeToken);
    expectNoExecution(request.readiness);
  });

  it("blocks git write flags", () => {
    const request = buildCommandExecutionRequest(
      safeRequest({ allowGitWrite: true })
    );

    expect(request.status).toBe("blocked");
    expect(codes(request)).toContain("GIT_WRITE_REJECTED");
    expectNoExecution(request.readiness);
  });

  it("blocks destructive flags and destructive command markers", () => {
    const flagRequest = buildCommandExecutionRequest(
      safeRequest({ allowDestructive: true })
    );
    const commandRequest = buildCommandExecutionRequest(
      safeRequest({ commandText: "rm -rf dist" })
    );

    expect(flagRequest.status).toBe("blocked");
    expect(commandRequest.status).toBe("blocked");
    expect(codes(flagRequest)).toContain("DESTRUCTIVE_COMMAND_REJECTED");
    expect(codes(commandRequest)).toContain("DESTRUCTIVE_COMMAND_MARKER");
    expectNoExecution(flagRequest.readiness);
    expectNoExecution(commandRequest.readiness);
  });

  it("blocks missing transcript policy and kill-chain metadata", () => {
    const request = buildCommandExecutionRequest(
      safeRequest({
        transcriptPolicy: undefined,
        sessionLeaseRef: undefined
      })
    );

    expect(request.status).toBe("blocked");
    expect(codes(request)).toContain("MISSING_TRANSCRIPT_POLICY");
    expect(codes(request)).toContain("MISSING_SESSION_LEASE_REF");
    expectNoExecution(request.readiness);
  });

  it("blocks readiness claims that attempt execution", () => {
    const findings = validateCommandExecutionRequest({
      ...safeRequest(),
      readiness: { canExecuteCommand: true }
    } as unknown as CommandExecutionRequestInput);

    expect(codes({ findings })).toContain("READINESS_EXECUTION_TRUE");
  });

  it("creates deterministic request hashes", () => {
    const first = buildCommandExecutionRequest(
      safeRequest({ requestId: undefined, idGenerator: () => "fixed-command" })
    );
    const second = buildCommandExecutionRequest(
      safeRequest({ requestId: undefined, idGenerator: () => "fixed-command" })
    );

    expect(first.requestId).toBe("fixed-command");
    expect(first.requestHash).toBe(second.requestHash);
    expectNoExecution(first.readiness);
  });
});
