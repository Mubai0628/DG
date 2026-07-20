import { describe, expect, it } from "vitest";

import {
  FILE_READ_APPROVAL_CONFIRMATION,
  buildFileReadApprovalReceipt,
  fileReadRequestHash,
  summarizeFileReadApprovalReceipt,
  validateFileReadApprovalReceipt
} from "../src/index.js";

const baseInput = {
  mode: "approval_mode",
  workspaceRootRef: "workspace-ref-test",
  relativePath: ".env",
  expiresAt: "2099-12-31T23:59:59.000Z",
  typedConfirmation: FILE_READ_APPROVAL_CONFIRMATION,
  createdAt: "2026-07-17T00:00:00.000Z",
  idGenerator: () => "file-read-receipt-1"
};

describe("file read approval receipt", () => {
  it("builds a ready receipt for a fully confirmed input", () => {
    const receipt = buildFileReadApprovalReceipt(baseInput);

    expect(receipt.status).toBe("ready");
    expect(receipt.source).toBe("runtime_file_read_approval_receipt");
    expect(receipt.kind).toBe("workspace_file_read");
    expect(receipt.scope.kind).toBe("workspace_file_read");
    expect(receipt.scope.relativePath).toBe(".env");
    expect(receipt.scope.requestHash).toBe(
      fileReadRequestHash({
        mode: baseInput.mode,
        workspaceRootRef: baseInput.workspaceRootRef,
        relativePath: baseInput.relativePath
      })
    );
    expect(receipt.readiness.canReadFile).toBe(false);
    expect(receipt.readiness.appCanExecute).toBe(false);
    expect(receipt.blockerCount).toBe(0);
  });

  it("produces a deterministic request hash bound to mode, ref, and path", () => {
    const base = fileReadRequestHash({
      mode: "approval_mode",
      workspaceRootRef: "ws",
      relativePath: "src/a.ts"
    });

    expect(base).toMatch(/^[0-9a-f]{64}$/);
    expect(
      fileReadRequestHash({
        mode: "approval_mode",
        workspaceRootRef: "ws",
        relativePath: "src/a.ts"
      })
    ).toBe(base);
    expect(
      fileReadRequestHash({
        mode: "approval_mode",
        workspaceRootRef: "ws",
        relativePath: "src/b.ts"
      })
    ).not.toBe(base);
    expect(
      fileReadRequestHash({
        mode: "full_access_mode",
        workspaceRootRef: "ws",
        relativePath: "src/a.ts"
      })
    ).not.toBe(base);
  });

  it("does not gate on the typed confirmation phrase value", () => {
    const receipt = buildFileReadApprovalReceipt({
      ...baseInput,
      typedConfirmation: "read it"
    });

    expect(receipt.status).toBe("ready");
    expect(receipt.findings.map((finding) => finding.code)).not.toContain(
      "FILE_READ_RECEIPT_CONFIRMATION_MISMATCH"
    );
  });

  it("blocks unsafe receipt paths", () => {
    for (const relativePath of [
      "../escape.txt",
      "/abs/path.txt",
      "C:/abs.txt",
      "a/../b.txt"
    ]) {
      const receipt = buildFileReadApprovalReceipt({
        ...baseInput,
        relativePath
      });

      expect(receipt.status).toBe("blocked");
      expect(receipt.findings.map((finding) => finding.code)).toContain(
        "FILE_READ_RECEIPT_PATH_UNSAFE"
      );
    }
  });

  it("blocks expired receipts and forbidden fields", () => {
    const expired = buildFileReadApprovalReceipt({
      ...baseInput,
      expiresAt: "2026-01-01T00:00:00.000Z"
    });
    expect(expired.status).toBe("blocked");
    expect(expired.findings.map((finding) => finding.code)).toContain(
      "FILE_READ_RECEIPT_EXPIRED"
    );

    const forbidden = buildFileReadApprovalReceipt({
      ...baseInput,
      // @ts-expect-error deliberate forbidden field injection
      content: "raw bytes"
    });
    expect(forbidden.status).toBe("blocked");
    expect(forbidden.findings.map((finding) => finding.code)).toContain(
      "FILE_READ_RECEIPT_FORBIDDEN_FIELD"
    );
  });

  it("validates via the aggregate helper and summarizes safely", () => {
    const ok = validateFileReadApprovalReceipt(baseInput);
    const receipt = buildFileReadApprovalReceipt(baseInput);
    const summary = summarizeFileReadApprovalReceipt(receipt);

    expect(ok.ok).toBe(true);
    expect(summary).toContain("kind:workspace_file_read");
    expect(summary).toContain("summary_only:true");
    expect(summary).not.toContain(FILE_READ_APPROVAL_CONFIRMATION);
  });
});
