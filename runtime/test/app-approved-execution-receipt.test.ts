import { describe, expect, it } from "vitest";

import {
  buildAppApprovedExecutionReceipt,
  summarizeAppApprovedExecutionReceipt,
  validateAppApprovedExecutionReceipt,
  type AppApprovedExecutionReceipt,
  type AppApprovedExecutionReceiptInput
} from "../src/index.js";

function safeApplyInput(
  overrides: Partial<AppApprovedExecutionReceiptInput> = {}
): AppApprovedExecutionReceiptInput {
  return {
    scope: {
      kind: "apply",
      workspaceRootRef: "workspace-ref-demo",
      proposalId: "proposal-1",
      validationId: "validation-1",
      auditId: "audit-1",
      approvalDraftId: "approval-1",
      allowedRelativePaths: ["src/safe-file.ts"],
      maxFiles: 2,
      maxBytes: 4096,
      expiresAt: "2026-01-02T00:00:00.000Z",
      typedConfirmation: "APPLY TO USER WORKSPACE"
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    idGenerator: () => "receipt-test-1",
    ...overrides
  };
}

function safeRollbackInput(
  overrides: Partial<AppApprovedExecutionReceiptInput> = {}
): AppApprovedExecutionReceiptInput {
  return {
    scope: {
      kind: "rollback",
      workspaceRootRef: "workspace-ref-demo",
      proposalId: "proposal-1",
      validationId: "validation-1",
      auditId: "audit-1",
      approvalDraftId: "approval-1",
      checkpointId: "checkpoint-1",
      allowedRelativePaths: ["src/safe-file.ts"],
      maxFiles: 2,
      maxBytes: 4096,
      expiresAt: "2026-01-02T00:00:00.000Z",
      typedConfirmation: "ROLLBACK USER WORKSPACE"
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    idGenerator: () => "receipt-rollback-1",
    ...overrides
  };
}

function findingCodes(receipt: AppApprovedExecutionReceipt): string[] {
  return receipt.findings.map((finding) => finding.code);
}

function expectExecutionFlagsFalse(
  receipt: Pick<AppApprovedExecutionReceipt, "readiness">
): void {
  expect(receipt.readiness).toMatchObject({
    canApplyPatch: false,
    canRollback: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("app approved execution receipt", () => {
  it("builds a valid apply receipt without enabling execution", () => {
    const receipt = buildAppApprovedExecutionReceipt(safeApplyInput());

    expect(receipt.status).toBe("ready");
    expect(receipt.kind).toBe("apply");
    expect(receipt.receiptId).toBe("receipt-test-1");
    expect(receipt.scope.allowedRelativePaths).toEqual(["src/safe-file.ts"]);
    expect(receipt.scope.receiptHash).toBe(receipt.receiptHash);
    expect(receipt.blockerCount).toBe(0);
    expect(receipt.summaryOnly).toBe(true);
    expect(summarizeAppApprovedExecutionReceipt(receipt)).toContain(
      "app_execution:false"
    );
    expectExecutionFlagsFalse(receipt);
  });

  it("builds a valid rollback receipt with a checkpoint", () => {
    const receipt = buildAppApprovedExecutionReceipt(safeRollbackInput());

    expect(receipt.status).toBe("ready");
    expect(receipt.kind).toBe("rollback");
    expect(receipt.scope.checkpointId).toBe("checkpoint-1");
    expect(receipt.blockerCount).toBe(0);
    expectExecutionFlagsFalse(receipt);
  });

  it("blocks wrong typed confirmation", () => {
    const receipt = buildAppApprovedExecutionReceipt(
      safeApplyInput({
        scope: {
          ...safeApplyInput().scope,
          typedConfirmation: "apply"
        }
      })
    );

    expect(receipt.status).toBe("blocked");
    expect(findingCodes(receipt)).toContain(
      "APP_APPROVED_RECEIPT_CONFIRMATION_MISMATCH"
    );
  });

  it("blocks expired receipts", () => {
    const validation = validateAppApprovedExecutionReceipt(
      safeApplyInput({
        scope: {
          ...safeApplyInput().scope,
          expiresAt: "2025-12-31T00:00:00.000Z"
        }
      })
    );

    expect(validation.ok).toBe(false);
    expect(validation.status).toBe("blocked");
    expect(validation.findings.map((finding) => finding.code)).toContain(
      "APP_APPROVED_RECEIPT_EXPIRED"
    );
    expect(validation.readiness.canWriteFilesystem).toBe(false);
  });

  it("blocks unsafe and blocked paths", () => {
    const receipt = buildAppApprovedExecutionReceipt(
      safeApplyInput({
        scope: {
          ...safeApplyInput().scope,
          allowedRelativePaths: [
            "../escape.ts",
            "C:/workspace/file.ts",
            ".git/config",
            ".env",
            "src/api-key.txt"
          ],
          maxFiles: 10
        }
      })
    );

    expect(receipt.status).toBe("blocked");
    expect(findingCodes(receipt)).toContain("APP_APPROVED_RECEIPT_UNSAFE_PATH");
    expect(findingCodes(receipt)).toContain("APP_APPROVED_RECEIPT_BLOCKED_PATH");
    expect(findingCodes(receipt)).toContain("APP_APPROVED_RECEIPT_SECRET_PATH");
  });

  it("blocks maxFiles exceeded", () => {
    const receipt = buildAppApprovedExecutionReceipt(
      safeApplyInput({
        scope: {
          ...safeApplyInput().scope,
          allowedRelativePaths: ["src/a.ts", "src/b.ts"],
          maxFiles: 1
        }
      })
    );

    expect(receipt.status).toBe("blocked");
    expect(findingCodes(receipt)).toContain(
      "APP_APPROVED_RECEIPT_MAX_FILES_EXCEEDED"
    );
  });

  it("blocks raw content, API key markers, and execution readiness attempts", () => {
    const fakeKeyMarker = ["sk", "fake-receipt-marker"].join("-");
    const receipt = buildAppApprovedExecutionReceipt({
      ...safeApplyInput(),
      scope: {
        ...safeApplyInput().scope,
        rawSource: "do not keep",
        note: fakeKeyMarker,
        readiness: { canApplyPatch: true }
      } as unknown as AppApprovedExecutionReceiptInput["scope"]
    });
    const serialized = JSON.stringify(receipt);

    expect(receipt.status).toBe("blocked");
    expect(findingCodes(receipt)).toContain(
      "APP_APPROVED_RECEIPT_FORBIDDEN_FIELD"
    );
    expect(findingCodes(receipt)).toContain(
      "APP_APPROVED_RECEIPT_SECRET_MARKER"
    );
    expect(findingCodes(receipt)).toContain(
      "APP_APPROVED_RECEIPT_EXECUTION_READINESS_TRUE"
    );
    expect(serialized).not.toContain("do not keep");
    expect(serialized).not.toContain(fakeKeyMarker);
    expectExecutionFlagsFalse(receipt);
  });

  it("blocks missing scope fail-closed", () => {
    const receipt = buildAppApprovedExecutionReceipt({
      kind: "apply",
      typedConfirmation: "APPLY TO USER WORKSPACE",
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => "receipt-missing-scope"
    });

    expect(receipt.status).toBe("blocked");
    expect(findingCodes(receipt)).toContain(
      "APP_APPROVED_RECEIPT_SCOPE_MISSING"
    );
  });

  it("is deterministic with injected id and clock", () => {
    const first = buildAppApprovedExecutionReceipt(safeApplyInput());
    const second = buildAppApprovedExecutionReceipt(safeApplyInput());

    expect(first.receiptId).toBe(second.receiptId);
    expect(first.receiptHash).toBe(second.receiptHash);
  });
});
