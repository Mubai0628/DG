import { createHash } from "node:crypto";
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
import { afterEach, describe, expect, it } from "vitest";

import {
  buildUserWorkspaceRollbackPlan,
  rollbackUserWorkspaceApplyPrototype,
  summarizeUserWorkspaceRollbackResult,
  validateUserWorkspaceRollbackInput,
  type UserWorkspaceRollbackCheckpoint,
  type UserWorkspaceRollbackOperation,
  type UserWorkspaceRollbackPrototypeInput
} from "../src/execution/user-workspace/user-workspace-rollback-prototype.js";

const testRoots: string[] = [];

function makeUserWorkspaceRoot(name: string): string {
  const root = path.resolve(
    ".tmp",
    "tests",
    `user-workspace-rollback-${process.pid}-${name}-${testRoots.length}`
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
  applyId: "user-apply-1",
  checkpointId: "user-checkpoint-1",
  approvalDraftId: "approval-1",
  expectedUserSnapshotHash: "user-snapshot-hash"
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function writeFixture(root: string, relativePath: string, content: string): void {
  const target = path.join(root, ...relativePath.split("/"));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function targetPath(root: string, relativePath: string): string {
  return path.join(root, ...relativePath.split("/"));
}

function baseOperation(
  overrides: Partial<UserWorkspaceRollbackOperation> = {}
): UserWorkspaceRollbackOperation {
  return {
    operationId: "rollback-create",
    path: "src/new-file.ts",
    changeKind: "create",
    ...overrides
  };
}

function userWorkspaceApplyResult(overrides: Record<string, unknown> = {}) {
  return {
    status: "applied_to_user_workspace_prototype",
    applyId: ids.applyId,
    userWorkspaceRootRef: ids.userWorkspaceRootRef,
    outputSnapshotHash: "user-output-hash",
    eventPreview: {
      notWritten: true,
      type: "user_workspace.patch_apply.prototype_result"
    },
    readiness: {
      appliedToUserWorkspacePrototype: true,
      canCommitGit: false,
      canExecuteShell: false,
      canPushGit: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    ...overrides
  };
}

function userContract(overrides: Record<string, unknown> = {}) {
  return {
    status: "contract_ready",
    contractId: "user-contract-1",
    userWorkspaceRootRef: ids.userWorkspaceRootRef,
    sourceWorkspaceFingerprint: "source-fingerprint-1",
    expectedUserSnapshotHash: ids.expectedUserSnapshotHash,
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
    readinessId: "readiness-1",
    userWorkspaceRootRef: ids.userWorkspaceRootRef,
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

function checkpoint(
  overrides: Partial<UserWorkspaceRollbackCheckpoint> = {}
): UserWorkspaceRollbackCheckpoint {
  return {
    checkpointId: ids.checkpointId,
    checkpointHash: "checkpoint-hash",
    applyId: ids.applyId,
    userWorkspaceRootRef: ids.userWorkspaceRootRef,
    entries: [
      {
        path: "src/new-file.ts",
        existedBefore: false,
        existsAfterApply: true,
        appliedHash: sha256("applied content\n").slice(0, 16),
        appliedBytes: Buffer.byteLength("applied content\n", "utf8"),
        contentEncoding: "utf8",
        changeKind: "create"
      }
    ],
    ...overrides
  };
}

function approvalReceipt(overrides: Record<string, unknown> = {}) {
  return {
    approvalReceiptId: "rollback-receipt-1",
    approvalDraftId: ids.approvalDraftId,
    approvedFor: "user_workspace_rollback_prototype",
    approvedBy: "explicit_user_test_fixture",
    scope: {
      userWorkspaceRootRef: ids.userWorkspaceRootRef,
      applyId: ids.applyId,
      checkpointId: ids.checkpointId,
      maxFiles: 10,
      maxBytes: 10_000,
      allowedRelativePaths: ["src/new-file.ts"]
    },
    receiptHash: "rollback-receipt-hash",
    ...overrides
  };
}

function safeInput(
  root: string,
  overrides: Partial<UserWorkspaceRollbackPrototypeInput> = {}
): UserWorkspaceRollbackPrototypeInput {
  return {
    userWorkspaceRoot: root,
    userWorkspaceRootRef: ids.userWorkspaceRootRef,
    userWorkspaceApplyResult: userWorkspaceApplyResult(),
    userWorkspaceSnapshotBackupContract: userContract(),
    promotionReadiness: promotionReadiness(),
    rollbackCheckpoint: checkpoint(),
    approvalReceipt: approvalReceipt(),
    operations: [baseOperation()],
    rollbackMode: "explicit_user_workspace_rollback_prototype",
    maxFiles: 10,
    maxBytes: 10_000,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides
  };
}

describe("user workspace rollback prototype", () => {
  it("keeps disabled mode from writing", () => {
    const root = makeUserWorkspaceRoot("disabled");
    writeFixture(root, "src/new-file.ts", "applied content\n");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, { rollbackMode: "disabled" })
    );

    expect(result.status).toBe("disabled");
    expect(result.readiness.rolledBackUserWorkspacePrototype).toBe(false);
    expect(readFileSync(targetPath(root, "src/new-file.ts"), "utf8")).toBe(
      "applied content\n"
    );
  });

  it("blocks missing user workspace apply result", () => {
    const root = makeUserWorkspaceRoot("missing-apply");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, { userWorkspaceApplyResult: undefined })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_ROLLBACK_APPLY_RESULT_MISSING"
    );
  });

  it("blocks missing rollback checkpoint", () => {
    const root = makeUserWorkspaceRoot("missing-checkpoint");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, { rollbackCheckpoint: undefined })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_ROLLBACK_CHECKPOINT_MISSING"
    );
  });

  it("blocks missing approval receipt", () => {
    const root = makeUserWorkspaceRoot("missing-receipt");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, { approvalReceipt: undefined })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_ROLLBACK_RECEIPT_MISSING"
    );
  });

  it("blocks mismatched apply id", () => {
    const root = makeUserWorkspaceRoot("mismatch-apply");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, { rollbackCheckpoint: checkpoint({ applyId: "other-apply" }) })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_ROLLBACK_CHECKPOINT_APPLY_ID_MISMATCH"
    );
  });

  it("blocks mismatched user workspace root ref", () => {
    const root = makeUserWorkspaceRoot("mismatch-root-ref");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, {
        rollbackCheckpoint: checkpoint({ userWorkspaceRootRef: "other-root" })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_ROLLBACK_CHECKPOINT_ROOT_REF_MISMATCH"
    );
  });

  it("blocks expired approval receipt", () => {
    const root = makeUserWorkspaceRoot("expired");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, {
        approvalReceipt: approvalReceipt({
          expiresAt: "2026-05-01T00:00:00.000Z"
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_ROLLBACK_RECEIPT_EXPIRED"
    );
  });

  it("blocks approval receipt allowedRelativePaths violations", () => {
    const root = makeUserWorkspaceRoot("allowed-paths");
    const result = rollbackUserWorkspaceApplyPrototype(
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
      "USER_ROLLBACK_SCOPE_PATH_NOT_ALLOWED"
    );
  });

  it("can undo create by removing a user workspace fixture file", () => {
    const root = makeUserWorkspaceRoot("undo-create");
    writeFixture(root, "src/new-file.ts", "applied content\n");
    const result = rollbackUserWorkspaceApplyPrototype(safeInput(root));

    expect(result.status).toBe("rolled_back_user_workspace_prototype");
    expect(existsSync(targetPath(root, "src/new-file.ts"))).toBe(false);
    expect(result.filesRemoved).toBe(1);
  });

  it("can undo update by restoring preimage", () => {
    const root = makeUserWorkspaceRoot("undo-update");
    writeFixture(root, "src/existing.ts", "new value\n");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, {
        rollbackCheckpoint: checkpoint({
          entries: [
            {
              path: "src/existing.ts",
              existedBefore: true,
              existsAfterApply: true,
              preimageContent: "old value\n",
              preimageHash: sha256("old value\n").slice(0, 16),
              appliedHash: sha256("new value\n").slice(0, 16),
              contentEncoding: "utf8",
              changeKind: "update"
            }
          ]
        }),
        operations: [
          baseOperation({
            operationId: "rollback-update",
            path: "src/existing.ts",
            changeKind: "update"
          })
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/existing.ts"]
          }
        })
      })
    );

    expect(result.status).toBe("rolled_back_user_workspace_prototype");
    expect(readFileSync(targetPath(root, "src/existing.ts"), "utf8")).toBe(
      "old value\n"
    );
    expect(result.filesRestored).toBe(1);
  });

  it("can undo delete by recreating preimage", () => {
    const root = makeUserWorkspaceRoot("undo-delete");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, {
        rollbackCheckpoint: checkpoint({
          entries: [
            {
              path: "src/deleted.ts",
              existedBefore: true,
              existsAfterApply: false,
              preimageContent: "deleted value\n",
              preimageHash: sha256("deleted value\n").slice(0, 16),
              contentEncoding: "utf8",
              changeKind: "delete"
            }
          ]
        }),
        operations: [
          baseOperation({
            operationId: "rollback-delete",
            path: "src/deleted.ts",
            changeKind: "delete"
          })
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/deleted.ts"]
          }
        })
      })
    );

    expect(result.status).toBe("rolled_back_user_workspace_prototype");
    expect(readFileSync(targetPath(root, "src/deleted.ts"), "utf8")).toBe(
      "deleted value\n"
    );
    expect(result.filesRecreated).toBe(1);
  });

  it("keeps output and event previews summary-only", () => {
    const root = makeUserWorkspaceRoot("summary-only");
    writeFixture(root, "src/existing.ts", "new private value\n");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, {
        rollbackCheckpoint: checkpoint({
          entries: [
            {
              path: "src/existing.ts",
              existedBefore: true,
              existsAfterApply: true,
              preimageContent: "summary only preimage\n",
              preimageHash: sha256("summary only preimage\n").slice(0, 16),
              appliedHash: sha256("new private value\n").slice(0, 16),
              contentEncoding: "utf8",
              changeKind: "update"
            }
          ]
        }),
        operations: [
          baseOperation({ path: "src/existing.ts", changeKind: "update" })
        ],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/existing.ts"]
          }
        })
      })
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("summary only preimage");
    expect(serialized).not.toContain("preimageContent");
    expect(result.eventPreview.notWritten).toBe(true);
    expect(result.eventPreview.type).toBe(
      "user_workspace.patch_rollback.prototype_result"
    );
  });

  it("is deterministic with injected id and clock", () => {
    const root = makeUserWorkspaceRoot("deterministic");
    writeFixture(root, "src/new-file.ts", "applied content\n");
    const first = buildUserWorkspaceRollbackPlan(
      safeInput(root, { idGenerator: () => "user-rollback-fixed" })
    );
    const second = buildUserWorkspaceRollbackPlan(
      safeInput(root, { idGenerator: () => "user-rollback-fixed" })
    );

    expect(first.rollbackId).toBe("user-rollback-fixed");
    expect(second.resultHash).toBe(first.resultHash);
    expect(summarizeUserWorkspaceRollbackResult(first).hash).toBe(
      summarizeUserWorkspaceRollbackResult(second).hash
    );
  });

  it("blocks traversal paths", () => {
    const root = makeUserWorkspaceRoot("traversal");
    const outside = path.resolve(root, "..", "outside.txt");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, {
        rollbackCheckpoint: checkpoint({
          entries: [
            {
              path: "../outside.txt",
              existedBefore: false,
              existsAfterApply: true,
              contentEncoding: "utf8",
              changeKind: "create"
            }
          ]
        }),
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
      const result = rollbackUserWorkspaceApplyPrototype(
        safeInput(root, {
          rollbackCheckpoint: checkpoint({
            entries: [
              {
                path: unsafePath,
                existedBefore: false,
                existsAfterApply: true,
                contentEncoding: "utf8",
                changeKind: "create"
              }
            ]
          }),
          operations: [baseOperation({ path: unsafePath })]
        })
      );
      expect(result.status).toBe("blocked");
    }
  });

  it("blocks env git generated and dependency paths", () => {
    const root = makeUserWorkspaceRoot("blocked-dirs");
    for (const unsafePath of [
      ".env",
      ".git/config",
      "node_modules/pkg/index.js",
      "dist/app.js",
      "target/debug/app",
      ".tmp/generated.txt"
    ]) {
      const result = rollbackUserWorkspaceApplyPrototype(
        safeInput(root, {
          rollbackCheckpoint: checkpoint({
            entries: [
              {
                path: unsafePath,
                existedBefore: false,
                existsAfterApply: true,
                contentEncoding: "utf8",
                changeKind: "create"
              }
            ]
          }),
          operations: [baseOperation({ path: unsafePath })]
        })
      );
      expect(result.status).toBe("blocked");
    }
  });

  it("blocks symlink parent escape when supported", () => {
    const root = makeUserWorkspaceRoot("symlink");
    const outside = makeUserWorkspaceRoot("symlink-outside");
    const link = targetPath(root, "linked");
    try {
      symlinkSync(outside, link, "dir");
    } catch {
      return;
    }
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, {
        rollbackCheckpoint: checkpoint({
          entries: [
            {
              path: "linked/file.ts",
              existedBefore: true,
              existsAfterApply: false,
              preimageContent: "restore\n",
              preimageHash: sha256("restore\n").slice(0, 16),
              contentEncoding: "utf8",
              changeKind: "delete"
            }
          ]
        }),
        operations: [baseOperation({ path: "linked/file.ts", changeKind: "delete" })],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["linked/file.ts"]
          }
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(existsSync(targetPath(outside, "file.ts"))).toBe(false);
  });

  it("blocks current hash mismatch", () => {
    const root = makeUserWorkspaceRoot("hash-mismatch");
    writeFixture(root, "src/existing.ts", "unexpected\n");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, {
        rollbackCheckpoint: checkpoint({
          entries: [
            {
              path: "src/existing.ts",
              existedBefore: true,
              existsAfterApply: true,
              preimageContent: "old\n",
              preimageHash: sha256("old\n").slice(0, 16),
              appliedHash: sha256("expected applied\n").slice(0, 16),
              contentEncoding: "utf8",
              changeKind: "update"
            }
          ]
        }),
        operations: [baseOperation({ path: "src/existing.ts", changeKind: "update" })],
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
      "USER_ROLLBACK_APPLIED_HASH_MISMATCH"
    );
  });

  it("blocks preimage secret markers", () => {
    const root = makeUserWorkspaceRoot("secret");
    const result = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, {
        rollbackCheckpoint: checkpoint({
          entries: [
            {
              path: "src/secret.ts",
              existedBefore: true,
              existsAfterApply: false,
              preimageContent: "sk-1234567890abcdefghijklmnop\n",
              contentEncoding: "utf8",
              changeKind: "delete"
            }
          ]
        }),
        operations: [baseOperation({ path: "src/secret.ts", changeKind: "delete" })],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/secret.ts"]
          }
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_ROLLBACK_SECRET_MARKER_REJECTED"
    );
  });

  it("blocks rawPrompt rawDom and rawCsv markers in preimage", () => {
    const root = makeUserWorkspaceRoot("raw-markers");
    for (const marker of ["rawPrompt", "rawDom", "rawCsv"]) {
      const result = rollbackUserWorkspaceApplyPrototype(
        safeInput(root, {
          rollbackCheckpoint: checkpoint({
            entries: [
              {
                path: `src/${marker}.ts`,
                existedBefore: true,
                existsAfterApply: false,
                preimageContent: marker,
                contentEncoding: "utf8",
                changeKind: "delete"
              }
            ]
          }),
          operations: [
            baseOperation({ path: `src/${marker}.ts`, changeKind: "delete" })
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

  it("blocks max files and max bytes", () => {
    const root = makeUserWorkspaceRoot("limits");
    const tooMany = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, { maxFiles: 0 })
    );
    const tooLarge = rollbackUserWorkspaceApplyPrototype(
      safeInput(root, {
        maxBytes: 4,
        rollbackCheckpoint: checkpoint({
          entries: [
            {
              path: "src/large.ts",
              existedBefore: true,
              existsAfterApply: false,
              preimageContent: "too large\n",
              contentEncoding: "utf8",
              changeKind: "delete"
            }
          ]
        }),
        operations: [baseOperation({ path: "src/large.ts", changeKind: "delete" })],
        approvalReceipt: approvalReceipt({
          scope: {
            ...approvalReceipt().scope,
            allowedRelativePaths: ["src/large.ts"]
          }
        })
      })
    );

    expect(tooMany.status).toBe("blocked");
    expect(tooLarge.status).toBe("blocked");
  });

  it("does not recursively delete directories", () => {
    const root = makeUserWorkspaceRoot("directory");
    mkdirSync(targetPath(root, "src/new-file.ts"), { recursive: true });
    const result = rollbackUserWorkspaceApplyPrototype(safeInput(root));

    expect(result.status).toBe("blocked");
    expect(existsSync(targetPath(root, "src/new-file.ts"))).toBe(true);
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_ROLLBACK_DIRECTORY_TARGET_REJECTED"
    );
  });

  it("keeps execution readiness flags false", () => {
    const root = makeUserWorkspaceRoot("flags");
    const result = rollbackUserWorkspaceApplyPrototype(safeInput(root));

    expect(result.readiness.canCommitGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(result.readiness.canPushGit).toBe(false);
    expect(result.readiness.canWriteEventStore).toBe(false);
    expect(result.readiness.appCanExecute).toBe(false);
  });

  it("does not import child_process spawn or exec", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        path.resolve(
          "runtime/src/execution/user-workspace/user-workspace-rollback-prototype.ts"
        ),
        "utf8"
      )
    );

    expect(source).not.toContain("child_process");
    expect(source).not.toContain("spawn(");
    expect(source).not.toContain("exec(");
  });

  it("validates input without writing", () => {
    const root = makeUserWorkspaceRoot("validate");
    writeFixture(root, "src/new-file.ts", "applied content\n");
    const validation = validateUserWorkspaceRollbackInput(safeInput(root));
    const plan = buildUserWorkspaceRollbackPlan(safeInput(root));

    expect(validation.ok).toBe(true);
    expect(plan.status).toBe("warning");
    expect(existsSync(targetPath(root, "src/new-file.ts"))).toBe(true);
  });
});
