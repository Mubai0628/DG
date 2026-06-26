import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  applyPatchToDisposableWorkspace,
  buildDisposablePatchRollbackPlan,
  buildDisposableWorkspaceSnapshotContract,
  rollbackDisposablePatchApply,
  summarizeDisposablePatchRollbackResult,
  validateDisposablePatchRollbackInput,
  type DisposablePatchApplyInput,
  type DisposablePatchApplyResult,
  type DisposablePatchRollbackCheckpointEntry,
  type DisposablePatchRollbackInput
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
    `disposable-patch-rollback-${process.pid}-${name}-${testRoots.length}`
  );
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  testRoots.push(root);
  return root;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
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
        path: "docs/new.md",
        language: "markdown",
        extension: "md",
        sizeBytes: 0,
        lineCount: 0,
        hashPrefix: "newhash",
        exists: false,
        plannedMutation: "create"
      },
      {
        path: "docs/existing.md",
        language: "markdown",
        extension: "md",
        sizeBytes: 10,
        lineCount: 1,
        hashPrefix: "existinghash",
        exists: true,
        plannedMutation: "update"
      },
      {
        path: "docs/delete-me.md",
        language: "markdown",
        extension: "md",
        sizeBytes: 11,
        lineCount: 1,
        hashPrefix: "deletehash",
        exists: true,
        plannedMutation: "delete"
      }
    ],
    directories: [{ path: "docs", fileCount: 3, totalBytes: 21 }],
    allowedRelativePaths: [
      "docs/new.md",
      "docs/existing.md",
      "docs/delete-me.md"
    ],
    deniedRelativePaths: ["node_modules"],
    lineEndingPolicy: "lf",
    createdAt
  });
}

function safeApplyInput(
  disposableRoot: string,
  operation: NonNullable<DisposablePatchApplyInput["operations"]>[number]
): DisposablePatchApplyInput {
  return {
    disposableRoot,
    disposableRootRef: "disposable-root-ref",
    snapshotContract: safeSnapshotContract(),
    patchProposalPreview: {
      proposalId: "proposal-disposable-rollback",
      status: "preview",
      proposalHash: "proposalhash"
    },
    patchValidationPreview: {
      validationId: "validation-disposable-rollback",
      status: "validation_ready",
      validationHash: "validationhash",
      readiness: { canApplyPatch: false }
    },
    patchDiffAuditPreview: {
      auditId: "audit-disposable-rollback",
      status: "audit_ready",
      auditHash: "audithash",
      readiness: { canApplyPatch: false }
    },
    patchApprovalDraft: {
      approvalDraftId: "approval-disposable-rollback",
      status: "draft_ready",
      approvalDraftHash: "approvalhash",
      readiness: { canApplyPatch: false, canApprove: false, canReject: false }
    },
    patchVirtualApplyPreview: {
      virtualApplyId: "virtual-disposable-rollback",
      status: "preview_ready",
      virtualApplyHash: "virtualhash",
      inputSnapshotHash: "snapshot-input-hash",
      readiness: { canApplyPatch: false, canWriteFilesystem: false }
    },
    patchRollbackCheckpointPreview: {
      checkpointPreviewId: "checkpoint-disposable-rollback",
      status: "checkpoint_preview_ready",
      checkpointHash: "checkpointhash",
      readiness: { canRollbackReal: false, canApplyPatch: false }
    },
    operations: [operation],
    applyMode: "explicit_disposable_apply",
    maxFiles: 5,
    maxBytes: 1000,
    createdAt
  };
}

function safeRollbackInput(
  disposableRoot: string,
  applyResult: DisposablePatchApplyResult,
  entry: DisposablePatchRollbackCheckpointEntry,
  overrides: Partial<DisposablePatchRollbackInput> = {}
): DisposablePatchRollbackInput {
  return {
    disposableRoot,
    disposableRootRef: "disposable-root-ref",
    snapshotContract: safeSnapshotContract(),
    disposablePatchApplyResult: applyResult,
    rollbackCheckpointPreview: {
      checkpointPreviewId: "checkpoint-disposable-rollback",
      status: "checkpoint_preview_ready",
      checkpointHash: "checkpointhash",
      readiness: { canRollbackReal: false, canApplyPatch: false }
    },
    checkpoint: {
      checkpointId: "checkpoint-rollback-1",
      checkpointHash: "checkpointrollbackhash",
      applyId: applyResult.applyId,
      disposableRootRef: "disposable-root-ref",
      entries: [entry]
    },
    rollbackMode: "explicit_disposable_rollback",
    maxFiles: 5,
    maxBytes: 1000,
    createdAt,
    ...overrides
  };
}

function applyCreate(root: string): DisposablePatchApplyResult {
  return applyPatchToDisposableWorkspace(
    safeApplyInput(root, {
      operationId: "create-doc",
      path: "docs/new.md",
      changeKind: "create",
      content: "created disposable file\n",
      contentEncoding: "utf8",
      expectedExistsBefore: false
    })
  );
}

describe("disposable patch rollback prototype", () => {
  it("keeps default mode disabled and does not write", () => {
    const root = makeDisposableRoot("disabled");
    const applyResult = applyCreate(root);
    const target = path.join(root, "docs", "new.md");
    const result = rollbackDisposablePatchApply(
      safeRollbackInput(
        root,
        applyResult,
        {
          path: "docs/new.md",
          existedBefore: false,
          existsAfterApply: true,
          appliedHash: sha256("created disposable file\n").slice(0, 16),
          appliedBytes: 24,
          contentEncoding: "utf8",
          changeKind: "create"
        },
        { rollbackMode: "disabled" }
      )
    );

    expect(result.status).toBe("disabled");
    expect(result.readiness.rolledBackDisposable).toBe(false);
    expect(existsSync(target)).toBe(true);
    expect(result.eventPreview.notWritten).toBe(true);
  });

  it("explicit disposable rollback can undo create by removing a disposable file", () => {
    const root = makeDisposableRoot("undo-create");
    const applyResult = applyCreate(root);
    const target = path.join(root, "docs", "new.md");
    const result = rollbackDisposablePatchApply(
      safeRollbackInput(
        root,
        applyResult,
        {
          path: "docs/new.md",
          existedBefore: false,
          existsAfterApply: true,
          appliedHash: sha256("created disposable file\n").slice(0, 16),
          appliedBytes: Buffer.byteLength("created disposable file\n"),
          contentEncoding: "utf8",
          changeKind: "create"
        },
        { idGenerator: () => "rollback-create-fixed" }
      )
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("rolled_back_disposable");
    expect(result.rollbackId).toBe("rollback-create-fixed");
    expect(result.filesRemoved).toBe(1);
    expect(result.bytesRemovedEstimate).toBeGreaterThan(0);
    expect(existsSync(target)).toBe(false);
    expect(result.readiness.rolledBackDisposable).toBe(true);
    expect(result.readiness.canRollbackUserWorkspace).toBe(false);
    expect(result.readiness.canApplyToUserWorkspace).toBe(false);
    expect(result.readiness.canCommitGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(result.eventPreview.notWritten).toBe(true);
    expect(serialized).not.toContain("created disposable file");
    expect(serialized).not.toContain(root);
    expect(summarizeDisposablePatchRollbackResult(result).rollbackId).toBe(
      "rollback-create-fixed"
    );
  });

  it("explicit disposable rollback can undo update by restoring preimage", () => {
    const root = makeDisposableRoot("undo-update");
    const target = path.join(root, "docs", "existing.md");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, "old value\n", "utf8");
    const applyResult = applyPatchToDisposableWorkspace(
      safeApplyInput(root, {
        operationId: "update-doc",
        path: "docs/existing.md",
        changeKind: "update",
        content: "new value\n",
        contentEncoding: "utf8",
        expectedExistsBefore: true
      })
    );
    const result = rollbackDisposablePatchApply(
      safeRollbackInput(root, applyResult, {
        path: "docs/existing.md",
        existedBefore: true,
        existsAfterApply: true,
        preimageContent: "old value\n",
        preimageHash: sha256("old value\n").slice(0, 16),
        preimageBytes: Buffer.byteLength("old value\n"),
        preimageLineCount: 1,
        appliedHash: sha256("new value\n").slice(0, 16),
        appliedBytes: Buffer.byteLength("new value\n"),
        contentEncoding: "utf8",
        changeKind: "update"
      })
    );

    expect(result.status).toBe("rolled_back_disposable");
    expect(result.filesRestored).toBe(1);
    expect(result.bytesRestored).toBeGreaterThan(0);
    expect(readFileSync(target, "utf8")).toBe("old value\n");
    expect(JSON.stringify(result)).not.toContain("old value");
  });

  it("explicit disposable rollback can undo delete by recreating preimage", () => {
    const root = makeDisposableRoot("undo-delete");
    const target = path.join(root, "docs", "delete-me.md");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, "delete me\n", "utf8");
    const applyResult = applyPatchToDisposableWorkspace(
      safeApplyInput(root, {
        operationId: "delete-doc",
        path: "docs/delete-me.md",
        changeKind: "delete",
        contentEncoding: "utf8",
        expectedExistsBefore: true
      })
    );
    const result = rollbackDisposablePatchApply(
      safeRollbackInput(root, applyResult, {
        path: "docs/delete-me.md",
        existedBefore: true,
        existsAfterApply: false,
        preimageContent: "delete me\n",
        preimageHash: sha256("delete me\n").slice(0, 16),
        preimageBytes: Buffer.byteLength("delete me\n"),
        preimageLineCount: 1,
        contentEncoding: "utf8",
        changeKind: "delete"
      })
    );

    expect(result.status).toBe("rolled_back_disposable");
    expect(result.filesRecreated).toBe(1);
    expect(readFileSync(target, "utf8")).toBe("delete me\n");
    expect(JSON.stringify(result.eventPreview)).not.toContain("delete me");
  });

  it("returns a non-writing plan for explicit rollback inputs", () => {
    const root = makeDisposableRoot("plan");
    const applyResult = applyCreate(root);
    const target = path.join(root, "docs", "new.md");
    const result = buildDisposablePatchRollbackPlan(
      safeRollbackInput(root, applyResult, {
        path: "docs/new.md",
        existedBefore: false,
        existsAfterApply: true,
        appliedHash: sha256("created disposable file\n").slice(0, 16),
        appliedBytes: Buffer.byteLength("created disposable file\n"),
        contentEncoding: "utf8",
        changeKind: "create"
      })
    );

    expect(result.status).toBe("warning");
    expect(result.operationResults[0]?.status).toBe("planned");
    expect(result.readiness.rolledBackDisposable).toBe(false);
    expect(existsSync(target)).toBe(true);
  });

  it("blocks traversal, absolute, drive-like, UNC-like, dependency, generated, and secret paths", () => {
    const root = makeDisposableRoot("paths");
    const applyResult = applyCreate(root);
    const unsafePaths = [
      "../escape.md",
      "/abs/file.md",
      "C:/repo/file.md",
      "//server/share/file.md",
      ".env.local",
      ".git/config",
      "node_modules/pkg/index.js",
      "dist/app.js",
      "target/debug/app.exe",
      ".tmp/out.txt",
      "runtime/dist/index.js",
      "docs/file.md?token=secret",
      "docs/file.md;rm"
    ];

    for (const unsafePath of unsafePaths) {
      const result = rollbackDisposablePatchApply(
        safeRollbackInput(root, applyResult, {
          path: unsafePath,
          existedBefore: false,
          existsAfterApply: true,
          contentEncoding: "utf8",
          changeKind: "create"
        })
      );

      expect(result.status).toBe("blocked");
      expect(result.blockerCount).toBeGreaterThan(0);
    }
  });

  it("blocks symlink parent escapes when the platform allows symlink creation", () => {
    const root = makeDisposableRoot("symlink");
    const outside = makeDisposableRoot("outside");
    const link = path.join(root, "link");
    try {
      symlinkSync(outside, link, "dir");
    } catch {
      expect(true).toBe(true);
      return;
    }
    const applyResult = {
      ...applyCreate(root),
      applyId: "apply-symlink",
      status: "applied_to_disposable"
    };

    const result = rollbackDisposablePatchApply(
      safeRollbackInput(root, applyResult as DisposablePatchApplyResult, {
        path: "link/escape.md",
        existedBefore: false,
        existsAfterApply: true,
        contentEncoding: "utf8",
        changeKind: "create"
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_ROLLBACK_SYMLINK_PARENT_REJECTED"
    );
  });

  it("blocks checkpoint mismatches, hash mismatch, target mismatch, limits, and directory delete", () => {
    const root = makeDisposableRoot("preconditions");
    const applyResult = applyCreate(root);
    const target = path.join(root, "docs", "new.md");
    const mismatchApply = rollbackDisposablePatchApply(
      safeRollbackInput(
        root,
        applyResult,
        {
          path: "docs/new.md",
          existedBefore: false,
          existsAfterApply: true,
          contentEncoding: "utf8",
          changeKind: "create"
        },
        {
          checkpoint: {
            checkpointId: "checkpoint-mismatch",
            checkpointHash: "hash",
            applyId: "different-apply",
            disposableRootRef: "disposable-root-ref",
            entries: [
              {
                path: "docs/new.md",
                existedBefore: false,
                existsAfterApply: true,
                contentEncoding: "utf8",
                changeKind: "create"
              }
            ]
          }
        }
      )
    );
    const mismatchRootRef = rollbackDisposablePatchApply(
      safeRollbackInput(
        root,
        applyResult,
        {
          path: "docs/new.md",
          existedBefore: false,
          existsAfterApply: true,
          contentEncoding: "utf8",
          changeKind: "create"
        },
        {
          checkpoint: {
            checkpointId: "checkpoint-root-mismatch",
            checkpointHash: "hash",
            applyId: applyResult.applyId,
            disposableRootRef: "other-root-ref",
            entries: [
              {
                path: "docs/new.md",
                existedBefore: false,
                existsAfterApply: true,
                contentEncoding: "utf8",
                changeKind: "create"
              }
            ]
          }
        }
      )
    );
    const hashMismatch = rollbackDisposablePatchApply(
      safeRollbackInput(root, applyResult, {
        path: "docs/new.md",
        existedBefore: false,
        existsAfterApply: true,
        appliedHash: "00000000",
        contentEncoding: "utf8",
        changeKind: "create"
      })
    );
    const tooMany = rollbackDisposablePatchApply(
      safeRollbackInput(
        root,
        applyResult,
        {
          path: "docs/new.md",
          existedBefore: false,
          existsAfterApply: true,
          contentEncoding: "utf8",
          changeKind: "create"
        },
        {
          maxFiles: 1,
          operations: [
            { operationId: "one", path: "docs/new.md", changeKind: "create" },
            { operationId: "two", path: "docs/other.md", changeKind: "create" }
          ]
        }
      )
    );
    const tooLarge = rollbackDisposablePatchApply(
      safeRollbackInput(
        root,
        applyResult,
        {
          path: "docs/new.md",
          existedBefore: true,
          existsAfterApply: true,
          preimageContent: "too large",
          preimageHash: sha256("too large").slice(0, 16),
          contentEncoding: "utf8",
          changeKind: "update"
        },
        { maxBytes: 1 }
      )
    );
    const deleteDirectory = rollbackDisposablePatchApply(
      safeRollbackInput(root, applyResult, {
        path: "docs",
        existedBefore: false,
        existsAfterApply: true,
        contentEncoding: "utf8",
        changeKind: "create"
      })
    );
    rmSync(target, { force: true });
    const missingCreatedTarget = rollbackDisposablePatchApply(
      safeRollbackInput(root, applyResult, {
        path: "docs/new.md",
        existedBefore: false,
        existsAfterApply: true,
        contentEncoding: "utf8",
        changeKind: "create"
      })
    );

    expect(mismatchApply.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_ROLLBACK_CHECKPOINT_APPLY_ID_MISMATCH"
    );
    expect(mismatchRootRef.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_ROLLBACK_CHECKPOINT_ROOT_REF_MISMATCH"
    );
    expect(hashMismatch.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_ROLLBACK_APPLIED_HASH_MISMATCH"
    );
    expect(tooMany.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_ROLLBACK_TOO_MANY_OPERATIONS"
    );
    expect(tooLarge.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_ROLLBACK_TOO_MANY_BYTES"
    );
    expect(deleteDirectory.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_ROLLBACK_DIRECTORY_TARGET_REJECTED"
    );
    expect(
      missingCreatedTarget.findings.map((finding) => finding.code)
    ).toContain("DISPOSABLE_ROLLBACK_CREATED_TARGET_MISSING");
  });

  it("blocks secret and raw marker preimage without retaining raw values", () => {
    const root = makeDisposableRoot("secret");
    const target = path.join(root, "docs", "existing.md");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, "new value\n", "utf8");
    const applyResult = {
      ...applyCreate(root),
      applyId: "apply-secret",
      status: "applied_to_disposable"
    };
    const secret = "sk-test1234567890abcdef";
    const result = rollbackDisposablePatchApply(
      safeRollbackInput(root, applyResult as DisposablePatchApplyResult, {
        path: "docs/existing.md",
        existedBefore: true,
        existsAfterApply: true,
        preimageContent: `rawPrompt rawDom rawCsv ${secret}`,
        preimageHash: sha256(`rawPrompt rawDom rawCsv ${secret}`).slice(0, 16),
        contentEncoding: "utf8",
        changeKind: "update"
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

  it("blocks unsafe preview state and never enables user workspace, git, or shell readiness", () => {
    const root = makeDisposableRoot("readiness");
    const applyResult = applyCreate(root);
    const result = rollbackDisposablePatchApply(
      safeRollbackInput(
        root,
        applyResult,
        {
          path: "docs/new.md",
          existedBefore: false,
          existsAfterApply: true,
          contentEncoding: "utf8",
          changeKind: "create"
        },
        {
          rollbackCheckpointPreview: {
            checkpointPreviewId: "checkpoint-unsafe",
            status: "checkpoint_preview_ready",
            readiness: { canRollbackReal: true }
          }
        } as Partial<DisposablePatchRollbackInput>
      )
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_ROLLBACK_EXECUTION_FLAG_REJECTED"
    );
    expect(result.readiness.canRollbackUserWorkspace).toBe(false);
    expect(result.readiness.canApplyToUserWorkspace).toBe(false);
    expect(result.readiness.canCommitGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(result.eventWritesEnabled).toBe(false);
    expect(result.gitExecutionEnabled).toBe(false);
    expect(result.shellExecutionEnabled).toBe(false);
  });

  it("validates without child process, raw output, or user workspace mutation", () => {
    const root = makeDisposableRoot("validation");
    const applyResult = applyCreate(root);
    const input = safeRollbackInput(root, applyResult, {
      path: "docs/new.md",
      existedBefore: false,
      existsAfterApply: true,
      appliedHash: sha256("created disposable file\n").slice(0, 16),
      appliedBytes: Buffer.byteLength("created disposable file\n"),
      contentEncoding: "utf8",
      changeKind: "create"
    });
    const validation = validateDisposablePatchRollbackInput(input);
    const result = rollbackDisposablePatchApply(input);
    const serialized = JSON.stringify(result);

    expect(validation.ok).toBe(true);
    expect(result.status).toBe("rolled_back_disposable");
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPatch");
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain(root);
  });
});
