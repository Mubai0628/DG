import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  applyWithDisposableApprovalGate,
  buildApprovalGatedDisposableApplyPlan,
  buildDisposableWorkspaceSnapshotContract,
  summarizeApprovalGatedDisposableApplyResult,
  validateApprovalGatedDisposableApplyInput,
  type ApprovalGatedDisposableApplyInput,
  type DisposableApplyApprovalReceipt,
  type DisposablePatchApplyInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";
const testRoots: string[] = [];

afterEach(() => {
  for (const root of testRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeDisposableRoot(name: string): string {
  const root = path.resolve(
    ".tmp",
    "tests",
    `approval-gated-disposable-apply-${process.pid}-${name}-${testRoots.length}`
  );
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  testRoots.push(root);
  return root;
}

function safeSnapshotContract() {
  return buildDisposableWorkspaceSnapshotContract({
    sourceWorkspaceFingerprint: "source-workspace-fingerprint",
    disposableRootRef: "disposable-root-ref",
    workspaceIndexRef: "workspace-index-ref",
    sourceSnapshotHash: "snapshot-input-hash",
    expectedInputHash: "expected-input-hash",
    files: [
      {
        path: "docs/approved.md",
        language: "markdown",
        extension: "md",
        sizeBytes: 0,
        lineCount: 0,
        hashPrefix: "approvedhash",
        exists: false,
        plannedMutation: "create"
      }
    ],
    directories: [{ path: "docs", fileCount: 1, totalBytes: 0 }],
    allowedRelativePaths: ["docs/approved.md"],
    deniedRelativePaths: ["node_modules"],
    lineEndingPolicy: "lf",
    createdAt
  });
}

function patchProposalPreview() {
  return {
    proposalId: "proposal-gated-apply",
    status: "preview",
    proposalHash: "proposalhash"
  };
}

function patchValidationPreview() {
  return {
    validationId: "validation-gated-apply",
    status: "validation_ready",
    validationHash: "validationhash",
    readiness: { canApplyPatch: false }
  };
}

function patchDiffAuditPreview() {
  return {
    auditId: "audit-gated-apply",
    status: "audit_ready",
    auditHash: "audithash",
    readiness: { canApplyPatch: false }
  };
}

function patchApprovalDraft() {
  return {
    approvalDraftId: "approval-gated-apply",
    status: "draft_ready",
    approvalDraftHash: "approvalhash",
    readiness: {
      canApprove: false,
      canReject: false,
      canIssueLease: false,
      canApplyPatch: false
    }
  };
}

function patchVirtualApplyPreview() {
  return {
    virtualApplyId: "virtual-gated-apply",
    status: "preview_ready",
    virtualApplyHash: "virtualhash",
    inputSnapshotHash: "snapshot-input-hash",
    readiness: { canApplyPatch: false, canWriteFilesystem: false }
  };
}

function patchRollbackCheckpointPreview() {
  return {
    checkpointPreviewId: "checkpoint-gated-apply",
    status: "checkpoint_preview_ready",
    checkpointHash: "checkpointhash",
    readiness: { canRollbackReal: false, canApplyPatch: false }
  };
}

function safeDisposableApplyInput(
  disposableRoot: string,
  overrides: Partial<DisposablePatchApplyInput> = {}
): DisposablePatchApplyInput {
  return {
    disposableRoot,
    disposableRootRef: "disposable-root-ref",
    snapshotContract: safeSnapshotContract(),
    patchProposalPreview: patchProposalPreview(),
    patchValidationPreview: patchValidationPreview(),
    patchDiffAuditPreview: patchDiffAuditPreview(),
    patchApprovalDraft: patchApprovalDraft(),
    patchVirtualApplyPreview: patchVirtualApplyPreview(),
    patchRollbackCheckpointPreview: patchRollbackCheckpointPreview(),
    operations: [
      {
        operationId: "create-approved-doc",
        path: "docs/approved.md",
        changeKind: "create",
        content: "approved disposable content\n",
        contentEncoding: "utf8",
        expectedExistsBefore: false
      }
    ],
    applyMode: "explicit_disposable_apply",
    maxFiles: 5,
    maxBytes: 1000,
    createdAt,
    ...overrides
  };
}

function safeApprovalReceipt(
  overrides: Partial<DisposableApplyApprovalReceipt> = {}
): DisposableApplyApprovalReceipt {
  return {
    approvalReceiptId: "receipt-gated-apply",
    approvalDraftId: "approval-gated-apply",
    approvedFor: "disposable_apply_only",
    approvedBy: "explicit_user_test_fixture",
    scope: {
      disposableRootRef: "disposable-root-ref",
      proposalId: "proposal-gated-apply",
      validationId: "validation-gated-apply",
      auditId: "audit-gated-apply",
      approvalDraftId: "approval-gated-apply",
      virtualApplyId: "virtual-gated-apply",
      checkpointPreviewId: "checkpoint-gated-apply",
      maxFiles: 2,
      maxBytes: 1000,
      allowedRelativePaths: ["docs/approved.md"]
    },
    expiresAt: "2026-01-02T00:00:00.000Z",
    receiptHash: "receipthash",
    warningCodes: [],
    ...overrides
  };
}

function safeInput(
  disposableRoot: string,
  overrides: Partial<ApprovalGatedDisposableApplyInput> = {}
): ApprovalGatedDisposableApplyInput {
  return {
    disposableRoot,
    disposableRootRef: "disposable-root-ref",
    approvalReceipt: safeApprovalReceipt(),
    snapshotContract: safeSnapshotContract(),
    patchProposalPreview: patchProposalPreview(),
    patchValidationPreview: patchValidationPreview(),
    patchDiffAuditPreview: patchDiffAuditPreview(),
    patchApprovalDraft: patchApprovalDraft(),
    patchVirtualApplyPreview: patchVirtualApplyPreview(),
    patchRollbackCheckpointPreview: patchRollbackCheckpointPreview(),
    disposableApplyInput: safeDisposableApplyInput(disposableRoot),
    gateMode: "explicit_approval_gated_disposable_apply",
    createdAt,
    ...overrides
  };
}

describe("approval-gated disposable apply", () => {
  it("keeps default disabled mode from writing", () => {
    const root = makeDisposableRoot("disabled");
    const target = path.join(root, "docs", "approved.md");
    const result = applyWithDisposableApprovalGate(
      safeInput(root, { gateMode: "disabled" })
    );

    expect(result.status).toBe("disabled");
    expect(result.readiness.approvalGateSatisfied).toBe(false);
    expect(result.readiness.appliedToDisposable).toBe(false);
    expect(existsSync(target)).toBe(false);
    expect(result.eventPreview.notWritten).toBe(true);
  });

  it("blocks missing approval receipt", () => {
    const root = makeDisposableRoot("missing-receipt");
    const result = applyWithDisposableApprovalGate(
      safeInput(root, { approvalReceipt: undefined })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "APPROVAL_GATED_APPLY_RECEIPT_MISSING"
    );
  });

  it("blocks mismatched approvalDraftId and disposableRootRef", () => {
    const root = makeDisposableRoot("mismatch");
    const approvalMismatch = applyWithDisposableApprovalGate(
      safeInput(root, {
        approvalReceipt: safeApprovalReceipt({
          approvalDraftId: "other-approval"
        })
      })
    );
    const rootMismatch = applyWithDisposableApprovalGate(
      safeInput(root, {
        approvalReceipt: safeApprovalReceipt({
          scope: {
            ...safeApprovalReceipt().scope,
            disposableRootRef: "other-root-ref"
          }
        })
      })
    );

    expect(approvalMismatch.status).toBe("blocked");
    expect(approvalMismatch.findings.map((finding) => finding.code)).toContain(
      "APPROVAL_GATED_APPLY_APPROVAL_DRAFT_ID_MISMATCH"
    );
    expect(rootMismatch.status).toBe("blocked");
    expect(rootMismatch.findings.map((finding) => finding.code)).toContain(
      "APPROVAL_GATED_APPLY_ROOT_REF_MISMATCH"
    );
  });

  it("blocks expired receipts", () => {
    const root = makeDisposableRoot("expired");
    const result = applyWithDisposableApprovalGate(
      safeInput(root, {
        approvalReceipt: safeApprovalReceipt({
          expiresAt: "2025-12-31T00:00:00.000Z"
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "APPROVAL_GATED_APPLY_RECEIPT_EXPIRED"
    );
  });

  it("blocks approval receipt scope allowedRelativePaths violations", () => {
    const root = makeDisposableRoot("scope-path");
    const result = applyWithDisposableApprovalGate(
      safeInput(root, {
        approvalReceipt: safeApprovalReceipt({
          scope: {
            ...safeApprovalReceipt().scope,
            allowedRelativePaths: ["docs/other.md"]
          }
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "APPROVAL_GATED_APPLY_SCOPE_PATH_NOT_ALLOWED"
    );
  });

  it("blocks approval receipt maxFiles and maxBytes violations", () => {
    const root = makeDisposableRoot("scope-limits");
    const tooMany = applyWithDisposableApprovalGate(
      safeInput(root, {
        approvalReceipt: safeApprovalReceipt({
          scope: {
            ...safeApprovalReceipt().scope,
            maxFiles: 1,
            allowedRelativePaths: ["docs/approved.md", "docs/second.md"]
          }
        }),
        disposableApplyInput: safeDisposableApplyInput(root, {
          operations: [
            {
              operationId: "create-approved-doc",
              path: "docs/approved.md",
              changeKind: "create",
              content: "approved disposable content\n",
              contentEncoding: "utf8",
              expectedExistsBefore: false
            },
            {
              operationId: "create-second-doc",
              path: "docs/second.md",
              changeKind: "create",
              content: "second disposable content\n",
              contentEncoding: "utf8",
              expectedExistsBefore: false
            }
          ]
        })
      })
    );
    const tooLarge = applyWithDisposableApprovalGate(
      safeInput(root, {
        approvalReceipt: safeApprovalReceipt({
          scope: { ...safeApprovalReceipt().scope, maxBytes: 1 }
        })
      })
    );

    expect(tooMany.status).toBe("blocked");
    expect(tooMany.findings.map((finding) => finding.code)).toContain(
      "APPROVAL_GATED_APPLY_SCOPE_MAX_FILES_EXCEEDED"
    );
    expect(tooLarge.status).toBe("blocked");
    expect(tooLarge.findings.map((finding) => finding.code)).toContain(
      "APPROVAL_GATED_APPLY_SCOPE_MAX_BYTES_EXCEEDED"
    );
  });

  it("creates a file in explicit approval-gated disposable mode", () => {
    const root = makeDisposableRoot("apply");
    const target = path.join(root, "docs", "approved.md");
    const result = applyWithDisposableApprovalGate(
      safeInput(root, { idGenerator: () => "gated-apply-fixed" })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("applied_to_disposable");
    expect(result.gatedApplyId).toBe("gated-apply-fixed");
    expect(result.applyId).toBeDefined();
    expect(result.filesCreated).toBe(1);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(readFileSync(target, "utf8")).toBe("approved disposable content\n");
    expect(result.readiness.approvalGateSatisfied).toBe(true);
    expect(result.readiness.appliedToDisposable).toBe(true);
    expect(result.eventPreview.notWritten).toBe(true);
    expect(result.eventPreview.disposableApplyEventPreview?.notWritten).toBe(
      true
    );
    expect(serialized).not.toContain("approved disposable content");
    expect(serialized).not.toContain(root);
    expect(
      summarizeApprovalGatedDisposableApplyResult(result).gatedApplyId
    ).toBe("gated-apply-fixed");
  });

  it("returns a gate-ready plan without writing", () => {
    const root = makeDisposableRoot("plan");
    const target = path.join(root, "docs", "approved.md");
    const result = buildApprovalGatedDisposableApplyPlan(safeInput(root));

    expect(result.status).toBe("gate_ready");
    expect(result.readiness.approvalGateSatisfied).toBe(true);
    expect(result.readiness.appliedToDisposable).toBe(false);
    expect(existsSync(target)).toBe(false);
  });

  it("blocks raw and secret marker operation content without retaining values", () => {
    const root = makeDisposableRoot("secret");
    const secret = "sk-test1234567890abcdef";
    const result = applyWithDisposableApprovalGate(
      safeInput(root, {
        disposableApplyInput: safeDisposableApplyInput(root, {
          operations: [
            {
              operationId: "secret-content",
              path: "docs/approved.md",
              changeKind: "create",
              content: `rawPrompt rawDom rawCsv ${secret}`,
              contentEncoding: "utf8",
              expectedExistsBefore: false
            }
          ]
        })
      })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "API_KEY_MARKER",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER"
      ])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt rawDom rawCsv");
  });

  it("keeps user workspace, lease, git, and shell readiness disabled", () => {
    const root = makeDisposableRoot("readiness");
    const result = applyWithDisposableApprovalGate(safeInput(root));
    const summary = summarizeApprovalGatedDisposableApplyResult(result);

    expect(result.readiness.canApplyToUserWorkspace).toBe(false);
    expect(result.readiness.canPromoteToUserWorkspace).toBe(false);
    expect(result.readiness.canIssuePermissionLease).toBe(false);
    expect(result.readiness.canCommitGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(summary.canApplyToUserWorkspace).toBe(false);
    expect(summary.canPromoteToUserWorkspace).toBe(false);
    expect(summary.canIssuePermissionLease).toBe(false);
    expect(summary.canCommitGit).toBe(false);
    expect(summary.canExecuteShell).toBe(false);
  });

  it("blocks approval draft execution flags", () => {
    const root = makeDisposableRoot("approval-flags");
    const validation = validateApprovalGatedDisposableApplyInput(
      safeInput(root, {
        patchApprovalDraft: {
          ...patchApprovalDraft(),
          readiness: {
            canApprove: true,
            canIssueLease: true,
            canApplyPatch: true
          }
        }
      })
    );

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toEqual(
      expect.arrayContaining([
        "APPROVAL_GATED_APPLY_APPROVE_ENABLED_REJECTED",
        "APPROVAL_GATED_APPLY_LEASE_ENABLED_REJECTED",
        "APPROVAL_GATED_APPLY_PATCH_ENABLED_REJECTED"
      ])
    );
  });
});
