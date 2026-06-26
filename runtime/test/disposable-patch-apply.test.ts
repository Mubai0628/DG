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
  buildDisposablePatchApplyPlan,
  buildDisposableWorkspaceSnapshotContract,
  summarizeDisposablePatchApplyResult,
  validateDisposablePatchApplyInput,
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
    `disposable-patch-apply-${process.pid}-${name}-${testRoots.length}`
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
        path: "docs/existing.md",
        language: "markdown",
        extension: "md",
        sizeBytes: 9,
        lineCount: 1,
        hashPrefix: "existinghash",
        exists: true,
        plannedMutation: "update"
      },
      {
        path: "docs/delete-me.md",
        language: "markdown",
        extension: "md",
        sizeBytes: 7,
        lineCount: 1,
        hashPrefix: "deletehash",
        exists: true,
        plannedMutation: "delete"
      },
      {
        path: "docs/new.md",
        language: "markdown",
        extension: "md",
        sizeBytes: 0,
        lineCount: 0,
        hashPrefix: "newhash",
        exists: false,
        plannedMutation: "create"
      }
    ],
    directories: [{ path: "docs", fileCount: 3, totalBytes: 16 }],
    allowedRelativePaths: [
      "docs/existing.md",
      "docs/delete-me.md",
      "docs/new.md"
    ],
    deniedRelativePaths: ["node_modules"],
    lineEndingPolicy: "lf",
    createdAt
  });
}

function safeInput(
  disposableRoot: string,
  overrides: Partial<DisposablePatchApplyInput> = {}
): DisposablePatchApplyInput {
  return {
    disposableRoot,
    disposableRootRef: "disposable-root-ref",
    snapshotContract: safeSnapshotContract(),
    patchProposalPreview: {
      proposalId: "proposal-disposable-apply",
      status: "preview",
      proposalHash: "proposalhash"
    },
    patchValidationPreview: {
      validationId: "validation-disposable-apply",
      status: "validation_ready",
      validationHash: "validationhash",
      readiness: { canApplyPatch: false }
    },
    patchDiffAuditPreview: {
      auditId: "audit-disposable-apply",
      status: "audit_ready",
      auditHash: "audithash",
      readiness: { canApplyPatch: false }
    },
    patchApprovalDraft: {
      approvalDraftId: "approval-disposable-apply",
      status: "draft_ready",
      approvalDraftHash: "approvalhash",
      readiness: { canApplyPatch: false, canApprove: false, canReject: false }
    },
    patchVirtualApplyPreview: {
      virtualApplyId: "virtual-disposable-apply",
      status: "preview_ready",
      virtualApplyHash: "virtualhash",
      inputSnapshotHash: "snapshot-input-hash",
      readiness: { canApplyPatch: false, canWriteFilesystem: false }
    },
    patchRollbackCheckpointPreview: {
      checkpointPreviewId: "checkpoint-disposable-apply",
      status: "checkpoint_preview_ready",
      checkpointHash: "checkpointhash",
      readiness: { canRollbackReal: false, canApplyPatch: false }
    },
    operations: [
      {
        operationId: "create-doc",
        path: "docs/new.md",
        changeKind: "create",
        content: "Created in disposable root\n",
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

describe("disposable patch apply prototype", () => {
  it("keeps default mode disabled and does not write", () => {
    const root = makeDisposableRoot("disabled");
    const target = path.join(root, "docs", "new.md");
    const result = applyPatchToDisposableWorkspace(
      safeInput(root, { applyMode: "disabled" })
    );

    expect(result.status).toBe("disabled");
    expect(result.readiness.appliedToDisposable).toBe(false);
    expect(existsSync(target)).toBe(false);
    expect(result.eventPreview.notWritten).toBe(true);
  });

  it("explicit disposable apply can create a file under disposableRoot", () => {
    const root = makeDisposableRoot("create");
    const result = applyPatchToDisposableWorkspace(
      safeInput(root, {
        idGenerator: () => "apply-create-fixed"
      })
    );
    const target = path.join(root, "docs", "new.md");
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("applied_to_disposable");
    expect(result.applyId).toBe("apply-create-fixed");
    expect(result.filesCreated).toBe(1);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(readFileSync(target, "utf8")).toBe("Created in disposable root\n");
    expect(result.readiness.appliedToDisposable).toBe(true);
    expect(result.readiness.canApplyToUserWorkspace).toBe(false);
    expect(result.readiness.canPromoteToUserWorkspace).toBe(false);
    expect(result.readiness.canCommitGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(result.readiness.canRollbackReal).toBe(false);
    expect(result.eventPreview.notWritten).toBe(true);
    expect(serialized).not.toContain("Created in disposable root");
    expect(summarizeDisposablePatchApplyResult(result).applyId).toBe(
      "apply-create-fixed"
    );
  });

  it("explicit disposable apply can update a file under disposableRoot", () => {
    const root = makeDisposableRoot("update");
    const target = path.join(root, "docs", "existing.md");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, "old value\n", "utf8");
    const result = applyPatchToDisposableWorkspace(
      safeInput(root, {
        operations: [
          {
            operationId: "update-doc",
            path: "docs/existing.md",
            changeKind: "update",
            content: "new value\n",
            contentEncoding: "utf8",
            expectedExistsBefore: true
          }
        ]
      })
    );

    expect(result.status).toBe("applied_to_disposable");
    expect(result.filesUpdated).toBe(1);
    expect(readFileSync(target, "utf8")).toBe("new value\n");
    expect(JSON.stringify(result)).not.toContain("new value");
  });

  it("explicit disposable apply can delete a file under disposableRoot", () => {
    const root = makeDisposableRoot("delete");
    const target = path.join(root, "docs", "delete-me.md");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, "remove\n", "utf8");
    const result = applyPatchToDisposableWorkspace(
      safeInput(root, {
        operations: [
          {
            operationId: "delete-doc",
            path: "docs/delete-me.md",
            changeKind: "delete",
            contentEncoding: "utf8",
            expectedExistsBefore: true
          }
        ]
      })
    );

    expect(result.status).toBe("applied_to_disposable");
    expect(result.filesDeleted).toBe(1);
    expect(result.bytesDeletedEstimate).toBeGreaterThan(0);
    expect(existsSync(target)).toBe(false);
  });

  it("returns a disabled plan without writing even when operations are explicit", () => {
    const root = makeDisposableRoot("plan");
    const target = path.join(root, "docs", "new.md");
    const result = buildDisposablePatchApplyPlan(safeInput(root));

    expect(result.status).toBe("warning");
    expect(result.operationResults[0]?.status).toBe("planned");
    expect(result.readiness.appliedToDisposable).toBe(false);
    expect(existsSync(target)).toBe(false);
  });

  it("blocks traversal, absolute, drive-like, UNC-like, dependency, generated, and secret paths", () => {
    const root = makeDisposableRoot("paths");
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
      const result = applyPatchToDisposableWorkspace(
        safeInput(root, {
          operations: [
            {
              operationId: `unsafe-${unsafePath.length}`,
              path: unsafePath,
              changeKind: "create",
              content: "safe",
              contentEncoding: "utf8"
            }
          ]
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

    const result = applyPatchToDisposableWorkspace(
      safeInput(root, {
        operations: [
          {
            operationId: "symlink-escape",
            path: "link/escape.md",
            changeKind: "create",
            content: "safe",
            contentEncoding: "utf8"
          }
        ]
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_PATCH_SYMLINK_PARENT_REJECTED"
    );
  });

  it("blocks create existing, update/delete missing, hash mismatch, directory delete, and limits", () => {
    const root = makeDisposableRoot("preconditions");
    const existing = path.join(root, "docs", "existing.md");
    const alreadyCreated = path.join(root, "docs", "new.md");
    mkdirSync(path.dirname(existing), { recursive: true });
    writeFileSync(existing, "old\n", "utf8");
    writeFileSync(alreadyCreated, "already here\n", "utf8");

    const createExisting = applyPatchToDisposableWorkspace(safeInput(root));
    const updateMissing = applyPatchToDisposableWorkspace(
      safeInput(root, {
        operations: [
          {
            operationId: "missing-update",
            path: "docs/missing.md",
            changeKind: "update",
            content: "safe",
            contentEncoding: "utf8",
            expectedExistsBefore: true
          }
        ]
      })
    );
    const hashMismatch = applyPatchToDisposableWorkspace(
      safeInput(root, {
        operations: [
          {
            operationId: "hash-mismatch",
            path: "docs/existing.md",
            changeKind: "update",
            content: "safe",
            contentEncoding: "utf8",
            expectedBeforeHashPrefix: "00000000"
          }
        ]
      })
    );
    const deleteDirectory = applyPatchToDisposableWorkspace(
      safeInput(root, {
        operations: [
          {
            operationId: "delete-dir",
            path: "docs",
            changeKind: "delete",
            contentEncoding: "utf8"
          }
        ]
      })
    );
    const tooMany = applyPatchToDisposableWorkspace(
      safeInput(root, {
        maxFiles: 1,
        operations: [
          {
            operationId: "one",
            path: "docs/a.md",
            changeKind: "create",
            content: "a",
            contentEncoding: "utf8"
          },
          {
            operationId: "two",
            path: "docs/b.md",
            changeKind: "create",
            content: "b",
            contentEncoding: "utf8"
          }
        ]
      })
    );
    const tooLarge = applyPatchToDisposableWorkspace(
      safeInput(root, {
        maxBytes: 1,
        operations: [
          {
            operationId: "large",
            path: "docs/large.md",
            changeKind: "create",
            content: "too large",
            contentEncoding: "utf8"
          }
        ]
      })
    );

    expect(createExisting.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_PATCH_CREATE_TARGET_EXISTS"
    );
    expect(updateMissing.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_PATCH_TARGET_MISSING"
    );
    expect(hashMismatch.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_PATCH_EXPECTED_HASH_MISMATCH"
    );
    expect(deleteDirectory.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_PATCH_DIRECTORY_TARGET_REJECTED"
    );
    expect(tooMany.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_PATCH_TOO_MANY_OPERATIONS"
    );
    expect(tooLarge.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_PATCH_TOO_MANY_BYTES"
    );
  });

  it("blocks secret and raw marker content without retaining raw values", () => {
    const root = makeDisposableRoot("secret");
    const secret = "sk-test1234567890abcdef";
    const result = applyPatchToDisposableWorkspace(
      safeInput(root, {
        operations: [
          {
            operationId: "secret-content",
            path: "docs/secret.md",
            changeKind: "create",
            content: `rawPrompt rawDom rawCsv ${secret}`,
            contentEncoding: "utf8"
          }
        ]
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

  it("blocks unsafe preview state and never enables user workspace, git, shell, or rollback readiness", () => {
    const root = makeDisposableRoot("readiness");
    const result = applyPatchToDisposableWorkspace(
      safeInput(root, {
        patchVirtualApplyPreview: {
          virtualApplyId: "virtual-unsafe",
          status: "preview_ready",
          readiness: { canApplyPatch: true }
        }
      } as Partial<DisposablePatchApplyInput>)
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_PATCH_EXECUTION_FLAG_REJECTED"
    );
    expect(result.readiness.canApplyToUserWorkspace).toBe(false);
    expect(result.readiness.canPromoteToUserWorkspace).toBe(false);
    expect(result.readiness.canCommitGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(result.readiness.canRollbackReal).toBe(false);
    expect(result.eventWritesEnabled).toBe(false);
    expect(result.gitExecutionEnabled).toBe(false);
    expect(result.shellExecutionEnabled).toBe(false);
  });

  it("validates without child process, raw output, or user workspace mutation", () => {
    const root = makeDisposableRoot("validation");
    const validation = validateDisposablePatchApplyInput(safeInput(root));
    const result = applyPatchToDisposableWorkspace(safeInput(root));
    const serialized = JSON.stringify(result);

    expect(validation.ok).toBe(true);
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPatch");
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain(root);
  });
});
