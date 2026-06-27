import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import {
  applyPatchToUserWorkspacePrototype,
  buildUserWorkspaceApplyPlan,
  summarizeUserWorkspaceApplyResult,
  validateUserWorkspaceApplyInput,
  type UserWorkspaceApplyOperation,
  type UserWorkspaceApplyPrototypeInput
} from "../src/execution/user-workspace/user-workspace-apply-prototype.js";

const testRoots: string[] = [];

function makeUserWorkspaceRoot(name: string): string {
  const root = path.resolve(
    ".tmp",
    "tests",
    `user-workspace-apply-${process.pid}-${name}-${testRoots.length}`
  );
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  testRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of testRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const ids = {
  userWorkspaceRootRef: "user-root-ref",
  proposalId: "proposal-1",
  validationId: "validation-1",
  auditId: "audit-1",
  approvalDraftId: "approval-1",
  virtualApplyId: "virtual-1",
  checkpointPreviewId: "checkpoint-1",
  readinessId: "readiness-1",
  disposableApplyId: "disposable-apply-1",
  disposableRootRef: "disposable-root-ref",
  expectedUserSnapshotHash: "user-snapshot-hash",
  expectedDisposableOutputHash: "disposable-output-hash"
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function baseOperation(
  overrides: Partial<UserWorkspaceApplyOperation> = {}
): UserWorkspaceApplyOperation {
  return {
    operationId: "op-create",
    path: "src/new-file.ts",
    changeKind: "create",
    content: "export const created = true;\n",
    contentEncoding: "utf8",
    ...overrides
  };
}

function userContract(overrides: Record<string, unknown> = {}) {
  return {
    status: "contract_ready",
    contractId: "user-contract-1",
    userWorkspaceRootRef: ids.userWorkspaceRootRef,
    sourceWorkspaceFingerprint: "source-fingerprint-1",
    expectedDisposableOutputHash: ids.expectedDisposableOutputHash,
    expectedUserSnapshotHash: ids.expectedUserSnapshotHash,
    backupRequiredCount: 1,
    binaryFileCount: 0,
    warningCount: 0,
    readiness: {
      canProceedToPromotionReadinessCheck: true,
      canReadFilesystem: false,
      canWriteFilesystem: false,
      canApplyToUserWorkspace: false,
      canRollbackUserWorkspace: false,
      canExecuteGit: false,
      canExecuteShell: false
    },
    ...overrides
  };
}

function promotionReadiness(overrides: Record<string, unknown> = {}) {
  return {
    status: "readiness_ready",
    readinessId: ids.readinessId,
    userWorkspaceRootRef: ids.userWorkspaceRootRef,
    sourceWorkspaceFingerprint: "source-fingerprint-1",
    expectedDisposableOutputHash: ids.expectedDisposableOutputHash,
    expectedUserSnapshotHash: ids.expectedUserSnapshotHash,
    blockerCount: 0,
    readiness: {
      canProceedToUserWorkspaceApplyPrototype: true,
      canApplyToUserWorkspace: false,
      canWriteFilesystem: false,
      canRollbackUserWorkspace: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false,
      appCanExecute: false
    },
    ...overrides
  };
}

function disposableApply(overrides: Record<string, unknown> = {}) {
  return {
    status: "applied_to_disposable",
    applyId: ids.disposableApplyId,
    disposableRootRef: ids.disposableRootRef,
    outputSnapshotHash: ids.expectedDisposableOutputHash,
    warningCount: 0,
    readiness: {
      appliedToDisposable: true,
      canApplyToUserWorkspace: false,
      canPromoteToUserWorkspace: false,
      canCommitGit: false,
      canExecuteShell: false
    },
    ...overrides
  };
}

function disposableRollback(overrides: Record<string, unknown> = {}) {
  return {
    status: "rolled_back_disposable",
    rollbackId: "disposable-rollback-1",
    applyId: ids.disposableApplyId,
    disposableRootRef: ids.disposableRootRef,
    warningCount: 0,
    readiness: {
      rolledBackDisposable: true,
      canApplyToUserWorkspace: false,
      canRollbackUserWorkspace: false,
      canCommitGit: false,
      canExecuteShell: false
    },
    ...overrides
  };
}

function eventProjection(overrides: Record<string, unknown> = {}) {
  return {
    status: "projection_ready",
    projectionId: "projection-1",
    blockerCount: 0,
    warningCount: 0,
    eventPreviews: [
      {
        eventId: "event-1",
        type: "sandbox.patch_apply.result_previewed",
        notWritten: true
      }
    ],
    readiness: {
      canWriteEventStore: false,
      canExecuteApply: false,
      canExecuteRollback: false,
      canApplyToUserWorkspace: false,
      canExecuteGit: false,
      canExecuteShell: false
    },
    ...overrides
  };
}

function patchRefs() {
  return {
    patchProposalPreview: {
      status: "preview",
      proposalId: ids.proposalId,
      proposalHash: "proposal-hash"
    },
    patchValidationPreview: {
      status: "validation_ready",
      validationId: ids.validationId,
      validationHash: "validation-hash"
    },
    patchDiffAuditPreview: {
      status: "audit_ready",
      auditId: ids.auditId,
      auditHash: "audit-hash"
    },
    patchApprovalDraft: {
      status: "approval_ready",
      approvalDraftId: ids.approvalDraftId,
      approvalDraftHash: "approval-hash",
      readiness: {
        canApprove: false,
        canIssueLease: false,
        canApplyPatch: false
      }
    },
    patchVirtualApplyPreview: {
      status: "preview_ready",
      virtualApplyId: ids.virtualApplyId,
      virtualApplyHash: "virtual-hash"
    },
    patchRollbackCheckpointPreview: {
      status: "checkpoint_preview_ready",
      checkpointPreviewId: ids.checkpointPreviewId,
      checkpointHash: "checkpoint-hash"
    }
  };
}

function approvalReceipt(overrides: Record<string, unknown> = {}) {
  return {
    approvalReceiptId: "receipt-1",
    approvalDraftId: ids.approvalDraftId,
    approvedFor: "user_workspace_apply_prototype",
    approvedBy: "explicit_user_test_fixture",
    scope: {
      userWorkspaceRootRef: ids.userWorkspaceRootRef,
      proposalId: ids.proposalId,
      validationId: ids.validationId,
      auditId: ids.auditId,
      approvalDraftId: ids.approvalDraftId,
      virtualApplyId: ids.virtualApplyId,
      checkpointPreviewId: ids.checkpointPreviewId,
      readinessId: ids.readinessId,
      maxFiles: 10,
      maxBytes: 10_000,
      allowedRelativePaths: ["src/new-file.ts"]
    },
    receiptHash: "receipt-hash",
    ...overrides
  };
}

function safeInput(
  root: string,
  overrides: Partial<UserWorkspaceApplyPrototypeInput> = {}
): UserWorkspaceApplyPrototypeInput {
  return {
    userWorkspaceRoot: root,
    userWorkspaceRootRef: ids.userWorkspaceRootRef,
    promotionReadiness: promotionReadiness(),
    userWorkspaceSnapshotBackupContract: userContract(),
    disposablePatchApplyResult: disposableApply(),
    disposablePatchRollbackResult: disposableRollback(),
    sandboxApplyRollbackEventProjection: eventProjection(),
    ...patchRefs(),
    approvalReceipt: approvalReceipt(),
    backupEntries: [],
    operations: [baseOperation()],
    applyMode: "explicit_user_workspace_apply_prototype",
    maxFiles: 10,
    maxBytes: 10_000,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides
  };
}

describe("user workspace apply prototype", () => {
  it("keeps disabled mode from writing", () => {
    const root = makeUserWorkspaceRoot("disabled");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, { applyMode: "disabled" })
    );

    expect(result.status).toBe("disabled");
    expect(result.readiness.appliedToUserWorkspacePrototype).toBe(false);
    expect(existsSync(path.join(root, "src", "new-file.ts"))).toBe(false);
  });

  it("blocks missing promotion readiness", () => {
    const root = makeUserWorkspaceRoot("missing-readiness");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, { promotionReadiness: undefined })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_APPLY_PROMOTION_READINESS_MISSING"
    );
  });

  it("blocks missing user workspace snapshot and backup contract", () => {
    const root = makeUserWorkspaceRoot("missing-contract");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, { userWorkspaceSnapshotBackupContract: undefined })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_APPLY_SNAPSHOT_BACKUP_CONTRACT_MISSING"
    );
  });

  it("blocks missing approval receipt", () => {
    const root = makeUserWorkspaceRoot("missing-receipt");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, { approvalReceipt: undefined })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_APPLY_RECEIPT_MISSING"
    );
  });

  it("blocks mismatched approval draft id", () => {
    const root = makeUserWorkspaceRoot("mismatch-approval");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        approvalReceipt: approvalReceipt({ approvalDraftId: "other-approval" })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_APPLY_APPROVAL_DRAFT_ID_MISMATCH"
    );
  });

  it("blocks expired approval receipt", () => {
    const root = makeUserWorkspaceRoot("expired-receipt");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        approvalReceipt: approvalReceipt({
          expiresAt: "2026-05-01T00:00:00.000Z"
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_APPLY_RECEIPT_EXPIRED"
    );
  });

  it("blocks approval receipt allowedRelativePaths violations", () => {
    const root = makeUserWorkspaceRoot("allowed-paths");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/other.ts"]
          }
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_APPLY_SCOPE_PATH_NOT_ALLOWED"
    );
  });

  it("can create a file inside an explicit user workspace fixture root", () => {
    const root = makeUserWorkspaceRoot("create");
    const result = applyPatchToUserWorkspacePrototype(safeInput(root));

    expect(result.status).toBe("applied_to_user_workspace_prototype");
    expect(readFileSync(path.join(root, "src", "new-file.ts"), "utf8")).toBe(
      "export const created = true;\n"
    );
    expect(result.filesCreated).toBe(1);
    expect(result.eventPreview.notWritten).toBe(true);
  });

  it("can update a file with a backup entry", () => {
    const root = makeUserWorkspaceRoot("update");
    const target = path.join(root, "src", "existing.ts");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, "old value\n", "utf8");
    const beforeHash = sha256("old value\n").slice(0, 16);
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [
          baseOperation({
            operationId: "op-update",
            path: "src/existing.ts",
            changeKind: "update",
            content: "new value\n",
            expectedExistsBefore: true,
            expectedBeforeHashPrefix: beforeHash
          })
        ],
        backupEntries: [
          {
            path: "src/existing.ts",
            existedBefore: true,
            preimageContent: "old value\n",
            preimageHash: beforeHash,
            preimageBytes: Buffer.byteLength("old value\n", "utf8"),
            preimageLineCount: 1,
            contentEncoding: "utf8"
          }
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/existing.ts"]
          }
        })
      })
    );

    expect(result.status).toBe("applied_to_user_workspace_prototype");
    expect(readFileSync(target, "utf8")).toBe("new value\n");
    expect(result.filesUpdated).toBe(1);
  });

  it("can delete a file with a backup entry", () => {
    const root = makeUserWorkspaceRoot("delete");
    const target = path.join(root, "src", "delete-me.ts");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, "remove me\n", "utf8");
    const beforeHash = sha256("remove me\n").slice(0, 16);
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [
          baseOperation({
            operationId: "op-delete",
            path: "src/delete-me.ts",
            changeKind: "delete",
            content: undefined,
            expectedExistsBefore: true,
            expectedBeforeHashPrefix: beforeHash
          })
        ],
        backupEntries: [
          {
            path: "src/delete-me.ts",
            existedBefore: true,
            preimageContent: "remove me\n",
            preimageHash: beforeHash,
            contentEncoding: "utf8"
          }
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/delete-me.ts"]
          }
        })
      })
    );

    expect(result.status).toBe("applied_to_user_workspace_prototype");
    expect(existsSync(target)).toBe(false);
    expect(result.filesDeleted).toBe(1);
  });

  it("keeps output and event previews summary-only", () => {
    const root = makeUserWorkspaceRoot("summary-only");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [
          baseOperation({
            content: "summary only content\n"
          })
        ]
      })
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("summary only content");
    expect(serialized).not.toContain("preimageContent");
    expect(result.eventPreview.notWritten).toBe(true);
    expect(result.eventPreview.type).toBe(
      "user_workspace.patch_apply.prototype_result"
    );
  });

  it("is deterministic with injected id and clock", () => {
    const root = makeUserWorkspaceRoot("deterministic");
    const first = buildUserWorkspaceApplyPlan(
      safeInput(root, { idGenerator: () => "user-apply-fixed" })
    );
    const second = buildUserWorkspaceApplyPlan(
      safeInput(root, { idGenerator: () => "user-apply-fixed" })
    );

    expect(first.applyId).toBe("user-apply-fixed");
    expect(second.resultHash).toBe(first.resultHash);
    expect(summarizeUserWorkspaceApplyResult(first).hash).toBe(
      summarizeUserWorkspaceApplyResult(second).hash
    );
  });

  it("blocks traversal paths", () => {
    const root = makeUserWorkspaceRoot("traversal");
    const outside = path.resolve(root, "..", "outside.txt");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [baseOperation({ path: "../outside.txt" })]
      })
    );

    expect(result.status).toBe("blocked");
    expect(existsSync(outside)).toBe(false);
  });

  it("blocks absolute drive and UNC operation paths", () => {
    const root = makeUserWorkspaceRoot("absolute");
    for (const unsafePath of [
      path.join(root, "absolute.ts"),
      "C:/temp/file.ts",
      "//server/share/file.ts"
    ]) {
      const result = applyPatchToUserWorkspacePrototype(
        safeInput(root, {
          operations: [baseOperation({ path: unsafePath })]
        })
      );
      expect(result.status).toBe("blocked");
    }
  });

  it("blocks protected directories and generated paths", () => {
    const root = makeUserWorkspaceRoot("blocked-dirs");
    for (const unsafePath of [
      ".env",
      ".git/config",
      "node_modules/pkg/index.js",
      "dist/out.js",
      "target/out.bin",
      ".tmp/cache.txt"
    ]) {
      const result = applyPatchToUserWorkspacePrototype(
        safeInput(root, {
          operations: [baseOperation({ path: unsafePath })]
        })
      );
      expect(result.status).toBe("blocked");
    }
  });

  it("blocks symlink parent escapes when the platform allows symlink creation", () => {
    const root = makeUserWorkspaceRoot("symlink");
    const outside = makeUserWorkspaceRoot("symlink-outside");
    const link = path.join(root, "linked");
    try {
      symlinkSync(outside, link, "dir");
    } catch {
      return;
    }
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [
          baseOperation({
            operationId: "op-symlink",
            path: "linked/escape.ts"
          })
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["linked/escape.ts"]
          }
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(existsSync(path.join(outside, "escape.ts"))).toBe(false);
  });

  it("blocks create existing and update or delete missing targets", () => {
    const root = makeUserWorkspaceRoot("existing-missing");
    const existing = path.join(root, "src", "new-file.ts");
    mkdirSync(path.dirname(existing), { recursive: true });
    writeFileSync(existing, "already\n", "utf8");

    const createExisting = applyPatchToUserWorkspacePrototype(safeInput(root));
    const updateMissing = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [
          baseOperation({
            operationId: "op-update-missing",
            path: "src/missing.ts",
            changeKind: "update",
            content: "new\n",
            expectedExistsBefore: true
          })
        ],
        backupEntries: [
          {
            path: "src/missing.ts",
            existedBefore: true,
            preimageContent: "old\n",
            contentEncoding: "utf8"
          }
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/missing.ts"]
          }
        })
      })
    );
    const deleteMissing = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [
          baseOperation({
            operationId: "op-delete-missing",
            path: "src/missing-delete.ts",
            changeKind: "delete",
            content: undefined,
            expectedExistsBefore: true
          })
        ],
        backupEntries: [
          {
            path: "src/missing-delete.ts",
            existedBefore: true,
            preimageContent: "old\n",
            contentEncoding: "utf8"
          }
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/missing-delete.ts"]
          }
        })
      })
    );

    expect(createExisting.status).toBe("blocked");
    expect(updateMissing.status).toBe("blocked");
    expect(deleteMissing.status).toBe("blocked");
  });

  it("blocks before-hash mismatches", () => {
    const root = makeUserWorkspaceRoot("hash-mismatch");
    const target = path.join(root, "src", "existing.ts");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, "actual\n", "utf8");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [
          baseOperation({
            operationId: "op-update",
            path: "src/existing.ts",
            changeKind: "update",
            content: "new\n",
            expectedBeforeHashPrefix: "deadbeef"
          })
        ],
        backupEntries: [
          {
            path: "src/existing.ts",
            existedBefore: true,
            preimageContent: "actual\n",
            contentEncoding: "utf8"
          }
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/existing.ts"]
          }
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_APPLY_EXPECTED_HASH_MISMATCH"
    );
  });

  it("blocks secret markers in operation content", () => {
    const root = makeUserWorkspaceRoot("secret-content");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [
          baseOperation({
            content: "const token = 'sk-1234567890abcdef';\n"
          })
        ]
      })
    );

    expect(result.status).toBe("blocked");
    expect(JSON.stringify(result)).not.toContain("sk-1234567890abcdef");
  });

  it("blocks secret markers in backup preimage content", () => {
    const root = makeUserWorkspaceRoot("secret-preimage");
    const target = path.join(root, "src", "existing.ts");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, "old\n", "utf8");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [
          baseOperation({
            operationId: "op-update",
            path: "src/existing.ts",
            changeKind: "update",
            content: "new\n"
          })
        ],
        backupEntries: [
          {
            path: "src/existing.ts",
            existedBefore: true,
            preimageContent: "Bearer abcdefghijklmnop",
            contentEncoding: "utf8"
          }
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/existing.ts"]
          }
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(JSON.stringify(result)).not.toContain("abcdefghijklmnop");
  });

  it("blocks raw prompt DOM and CSV markers in content", () => {
    const root = makeUserWorkspaceRoot("raw-markers");
    for (const marker of ["rawPrompt", "rawDom", "rawCsv"]) {
      const result = applyPatchToUserWorkspacePrototype(
        safeInput(root, {
          operations: [
            baseOperation({
              operationId: `op-${marker}`,
              path: `src/${marker}.ts`,
              content: marker
            })
          ],
          approvalReceipt: approvalReceipt({
            scope: {
              ...approvalReceipt().scope,
              allowedRelativePaths: [`src/${marker}.ts`]
            }
          })
        })
      );
      expect(result.status).toBe("blocked");
    }
  });

  it("blocks max files and max bytes violations", () => {
    const root = makeUserWorkspaceRoot("limits");
    const tooMany = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        maxFiles: 1,
        operations: [
          baseOperation({ operationId: "one", path: "src/one.ts" }),
          baseOperation({ operationId: "two", path: "src/two.ts" })
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            maxFiles: 1,
            allowedRelativePaths: ["src/one.ts", "src/two.ts"]
          }
        })
      })
    );
    const tooLarge = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        maxBytes: 4,
        operations: [baseOperation({ content: "larger than four" })],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            maxBytes: 4
          }
        })
      })
    );

    expect(tooMany.status).toBe("blocked");
    expect(tooLarge.status).toBe("blocked");
  });

  it("blocks directory delete and does not recursively remove directories", () => {
    const root = makeUserWorkspaceRoot("directory-delete");
    const dir = path.join(root, "src", "folder");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "child.ts"), "child\n", "utf8");
    const result = applyPatchToUserWorkspacePrototype(
      safeInput(root, {
        operations: [
          baseOperation({
            operationId: "op-delete-dir",
            path: "src/folder",
            changeKind: "delete",
            content: undefined,
            expectedExistsBefore: true
          })
        ],
        backupEntries: [
          {
            path: "src/folder",
            existedBefore: true,
            preimageContent: "not-used",
            contentEncoding: "utf8"
          }
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/folder"]
          }
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(lstatSync(dir).isDirectory()).toBe(true);
    expect(existsSync(path.join(dir, "child.ts"))).toBe(true);
  });

  it("keeps execution readiness flags false", () => {
    const root = makeUserWorkspaceRoot("readiness");
    const result = applyPatchToUserWorkspacePrototype(safeInput(root));

    expect(result.readiness.appliedToUserWorkspacePrototype).toBe(true);
    expect(result.readiness.canCommitGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(result.readiness.canPushGit).toBe(false);
    expect(result.readiness.canWriteEventStore).toBe(false);
    expect(result.readiness.appCanExecute).toBe(false);
    expect(result.eventWritesEnabled).toBe(false);
    expect(result.gitExecutionEnabled).toBe(false);
    expect(result.shellExecutionEnabled).toBe(false);
  });

  it("does not import child process helpers", () => {
    const source = readFileSync(
      path.resolve(
        "runtime/src/execution/user-workspace/user-workspace-apply-prototype.ts"
      ),
      "utf8"
    );

    expect(source).not.toContain("child_process");
    expect(source).not.toContain("spawn(");
    expect(source).not.toContain("exec(");
  });

  it("validates without writing when using the plan builder", () => {
    const root = makeUserWorkspaceRoot("plan");
    const validation = validateUserWorkspaceApplyInput(safeInput(root));
    const plan = buildUserWorkspaceApplyPlan(safeInput(root));

    expect(validation.ok).toBe(true);
    expect(plan.status).toBe("warning");
    expect(existsSync(path.join(root, "src", "new-file.ts"))).toBe(false);
  });
});
