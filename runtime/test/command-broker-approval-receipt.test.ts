import { describe, expect, it } from "vitest";

import {
  COMMAND_BROKER_APPROVAL_CONFIRMATION,
  buildCommandBrokerApprovalReceipt,
  commandBrokerRequestHash,
  summarizeCommandBrokerApprovalReceipt,
  validateCommandBrokerApprovalReceipt
} from "../src/index.js";

const baseInput = {
  mode: "advanced_workspace",
  workspaceRootRef: "workspace-ref-command-broker",
  sessionLeaseRef: "session-lease-command-broker",
  shellKind: "powershell",
  workingDirectory: ".",
  commandText: "node --version",
  argv: [] as string[],
  expiresAt: "2099-12-31T23:59:59.000Z",
  typedConfirmation: COMMAND_BROKER_APPROVAL_CONFIRMATION,
  createdAt: "2026-07-17T00:00:00.000Z",
  idGenerator: () => "receipt-test-1"
};

describe("command broker approval receipt", () => {
  it("builds a ready receipt for a fully confirmed input", () => {
    const receipt = buildCommandBrokerApprovalReceipt(baseInput);

    expect(receipt.status).toBe("ready");
    expect(receipt.source).toBe("runtime_command_broker_approval_receipt");
    expect(receipt.summaryOnly).toBe(true);
    expect(receipt.kind).toBe("command_broker_execution");
    expect(receipt.scope.kind).toBe("command_broker_execution");
    expect(receipt.scope.mode).toBe("advanced_workspace");
    expect(receipt.scope.requestHash).toBe(
      commandBrokerRequestHash({
        mode: baseInput.mode,
        workspaceRootRef: baseInput.workspaceRootRef,
        shellKind: baseInput.shellKind,
        workingDirectory: baseInput.workingDirectory,
        commandText: baseInput.commandText,
        argv: baseInput.argv
      })
    );
    expect(receipt.readiness.canExecuteCommand).toBe(false);
    expect(receipt.readiness.appCanExecute).toBe(false);
    expect(receipt.blockerCount).toBe(0);
  });

  it("produces a deterministic request hash bound to every command field", () => {
    const base = commandBrokerRequestHash({
      mode: "advanced_workspace",
      workspaceRootRef: "ws",
      shellKind: "bash",
      workingDirectory: ".",
      commandText: "echo hello",
      argv: []
    });

    expect(base).toMatch(/^[0-9a-f]{64}$/);
    expect(
      commandBrokerRequestHash({
        mode: "advanced_workspace",
        workspaceRootRef: "ws",
        shellKind: "bash",
        workingDirectory: ".",
        commandText: "echo hello",
        argv: []
      })
    ).toBe(base);
    expect(
      commandBrokerRequestHash({
        mode: "advanced_workspace",
        workspaceRootRef: "ws",
        shellKind: "bash",
        workingDirectory: ".",
        commandText: "echo goodbye",
        argv: []
      })
    ).not.toBe(base);
    expect(
      commandBrokerRequestHash({
        mode: "full_access",
        workspaceRootRef: "ws",
        shellKind: "bash",
        workingDirectory: ".",
        commandText: "echo hello",
        argv: []
      })
    ).not.toBe(base);
    expect(
      commandBrokerRequestHash({
        mode: "advanced_workspace",
        workspaceRootRef: "ws",
        shellKind: "bash",
        workingDirectory: ".",
        commandText: "",
        argv: ["echo", "hello"]
      })
    ).not.toBe(base);
  });

  it("does not gate on the typed confirmation phrase value", () => {
    const receipt = buildCommandBrokerApprovalReceipt({
      ...baseInput,
      typedConfirmation: "execute please"
    });

    // The phrase value is metadata only: the receipt's gate is scope
    // binding (requestHash), not a typed phrase.
    expect(receipt.status).toBe("ready");
    expect(receipt.findings.map((finding) => finding.code)).not.toContain(
      "BROKER_RECEIPT_CONFIRMATION_MISMATCH"
    );
  });

  it("blocks when scope metadata is missing", () => {
    const receipt = buildCommandBrokerApprovalReceipt({
      ...baseInput,
      workspaceRootRef: "",
      sessionLeaseRef: ""
    });
    const codes = receipt.findings.map((finding) => finding.code);

    expect(receipt.status).toBe("blocked");
    expect(codes).toContain("BROKER_RECEIPT_WORKSPACE_ROOT_MISSING");
    expect(codes).toContain("BROKER_RECEIPT_SESSION_LEASE_MISSING");
  });

  it("blocks expired and invalid expiry receipts", () => {
    const expired = buildCommandBrokerApprovalReceipt({
      ...baseInput,
      expiresAt: "2026-01-01T00:00:00.000Z"
    });
    const invalid = buildCommandBrokerApprovalReceipt({
      ...baseInput,
      expiresAt: "not-a-date"
    });

    expect(expired.status).toBe("blocked");
    expect(expired.findings.map((finding) => finding.code)).toContain(
      "BROKER_RECEIPT_EXPIRED"
    );
    expect(invalid.status).toBe("blocked");
    expect(invalid.findings.map((finding) => finding.code)).toContain(
      "BROKER_RECEIPT_EXPIRY_INVALID"
    );
  });

  it("blocks forbidden fields and execution readiness claims", () => {
    const receipt = buildCommandBrokerApprovalReceipt({
      ...baseInput,
      // @ts-expect-error deliberate forbidden field injection for validation coverage
      apiKey: "synthetic",
      readiness: { canExecuteCommand: true }
    });
    const codes = receipt.findings.map((finding) => finding.code);

    expect(receipt.status).toBe("blocked");
    expect(codes).toContain("BROKER_RECEIPT_FORBIDDEN_FIELD");
    expect(codes).toContain("BROKER_RECEIPT_EXECUTION_READINESS_TRUE");
  });

  it("validates via the aggregate helper and summarizes without raw content", () => {
    const ok = validateCommandBrokerApprovalReceipt(baseInput);
    const receipt = buildCommandBrokerApprovalReceipt(baseInput);
    const summary = summarizeCommandBrokerApprovalReceipt(receipt);

    expect(ok.ok).toBe(true);
    expect(ok.status).toBe("ready");
    expect(summary).toContain("kind:command_broker_execution");
    expect(summary).toContain("summary_only:true");
    expect(summary).not.toContain(baseInput.commandText);
  });
});
