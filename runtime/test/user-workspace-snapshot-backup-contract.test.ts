import { describe, expect, it } from "vitest";

import {
  buildUserWorkspaceSnapshotBackupContract,
  summarizeUserWorkspaceSnapshotBackupContract,
  validateUserWorkspaceSnapshotBackupContractInput,
  type UserWorkspaceSnapshotBackupContractInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function safeInput(
  overrides: Partial<UserWorkspaceSnapshotBackupContractInput> = {}
): UserWorkspaceSnapshotBackupContractInput {
  return {
    userWorkspaceRootRef: "user-workspace-ref-p0k-001",
    sourceWorkspaceFingerprint: "workspace-fingerprint-001",
    disposableApplyResultRef: "disposable-apply-result-001",
    disposableRollbackResultRef: "disposable-rollback-result-001",
    disposableSnapshotContractRef: "disposable-snapshot-contract-001",
    expectedDisposableOutputHash: "disposableout001",
    expectedUserSnapshotHash: "usersnapshot001",
    files: [
      {
        path: "app/src/App.tsx",
        language: "typescript",
        extension: "tsx",
        sizeBytes: 1200,
        lineCount: 80,
        hashPrefix: "abc12345",
        exists: true,
        plannedMutation: "update",
        backupRequired: true,
        preimageHashRequired: true,
        lineEnding: "lf"
      },
      {
        path: "app/test/desktop-shell.test.ts",
        language: "typescript",
        extension: "ts",
        sizeBytes: 900,
        lineCount: 60,
        hashPrefix: "def67890",
        exists: true,
        plannedMutation: "test",
        backupRequired: true,
        preimageHashRequired: false,
        lineEnding: "lf"
      }
    ],
    directories: [
      {
        path: "app/src",
        fileCount: 1,
        totalBytes: 1200
      }
    ],
    allowedRelativePaths: ["app/src/App.tsx"],
    deniedRelativePaths: ["node_modules"],
    lineEndingPolicy: "lf",
    createdAt,
    ...overrides
  };
}

describe("user workspace snapshot backup contract helper", () => {
  it("creates a metadata-only contract-ready summary from safe input", () => {
    const contract = buildUserWorkspaceSnapshotBackupContract(safeInput());
    const serialized = JSON.stringify(contract);

    expect(contract.source).toBe(
      "runtime_user_workspace_snapshot_backup_contract"
    );
    expect(contract.status).toBe("contract_ready");
    expect(contract.metadataOnly).toBe(true);
    expect(contract.fileCount).toBe(2);
    expect(contract.directoryCount).toBe(1);
    expect(contract.totalBytes).toBe(2100);
    expect(contract.plannedMutationCount).toBe(2);
    expect(contract.backupRequiredCount).toBe(2);
    expect(contract.preimageHashRequiredCount).toBe(1);
    expect(contract.backupRequirements).toHaveLength(2);
    expect(contract.backupRequirements[0]?.backupStorage).toBe("deferred");
    expect(contract.backupFileCreationEnabled).toBe(false);
    expect(contract.preimageCaptureEnabled).toBe(false);
    expect(contract.readiness.canProceedToPromotionReadinessCheck).toBe(true);
    expect(contract.readiness.canReadFilesystem).toBe(false);
    expect(contract.readiness.canWriteFilesystem).toBe(false);
    expect(contract.readiness.canApplyToUserWorkspace).toBe(false);
    expect(contract.readiness.canRollbackUserWorkspace).toBe(false);
    expect(contract.readiness.canExecuteGit).toBe(false);
    expect(contract.readiness.canExecuteShell).toBe(false);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toMatch(/"preimageContent"\s*:/);
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toContain("function App");
  });

  it("produces deterministic contract ids and hashes with an injected id", () => {
    const first = buildUserWorkspaceSnapshotBackupContract(
      safeInput({ idGenerator: () => "user-workspace-contract-fixed" })
    );
    const second = buildUserWorkspaceSnapshotBackupContract(
      safeInput({ idGenerator: () => "user-workspace-contract-fixed" })
    );

    expect(first.contractId).toBe("user-workspace-contract-fixed");
    expect(first).toEqual(second);
    expect(summarizeUserWorkspaceSnapshotBackupContract(first)).toEqual(
      summarizeUserWorkspaceSnapshotBackupContract(second)
    );
  });

  it("blocks absolute, drive, UNC, traversal, dependency, generated, and query-like paths", () => {
    const unsafePaths = [
      "/abs/file.ts",
      "C:/repo/file.ts",
      "//server/share/file.ts",
      "../escape.ts",
      ".git/config",
      ".env.local",
      "node_modules/pkg/index.js",
      "dist/app.js",
      "target/debug/app.exe",
      ".tmp/out.txt",
      "src/file.ts?token=secret",
      "src/file.ts;rm"
    ];

    for (const unsafePath of unsafePaths) {
      const contract = buildUserWorkspaceSnapshotBackupContract(
        safeInput({
          files: [
            {
              path: unsafePath,
              sizeBytes: 1,
              hashPrefix: "abc12345",
              exists: true,
              plannedMutation: "update",
              backupRequired: true,
              preimageHashRequired: true
            }
          ]
        })
      );

      expect(contract.status).toBe("blocked");
      expect(contract.blockerCount).toBeGreaterThan(0);
      expect(contract.readiness.canProceedToPromotionReadinessCheck).toBe(
        false
      );
    }
  });

  it("blocks generated artifact planned mutations", () => {
    const contract = buildUserWorkspaceSnapshotBackupContract(
      safeInput({
        files: [
          {
            path: "runtime/dist/index.js",
            sizeBytes: 10,
            hashPrefix: "abc12345",
            exists: true,
            plannedMutation: "update",
            backupRequired: true,
            preimageHashRequired: true,
            isGenerated: true
          }
        ]
      })
    );

    expect(contract.status).toBe("blocked");
    expect(contract.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "USER_WORKSPACE_BLOCKED_DIRECTORY_REJECTED",
        "USER_WORKSPACE_GENERATED_MUTATION_DENIED"
      ])
    );
  });

  it("blocks raw content and preimage fields without retaining raw values", () => {
    const secret = "sk-test1234567890abcdef";
    const unsafeInput = {
      ...safeInput(),
      files: [
        {
          path: "docs/unsafe.md",
          sizeBytes: 1,
          hashPrefix: "abc12345",
          exists: true,
          plannedMutation: "update",
          backupRequired: true,
          preimageHashRequired: true,
          preimageContent: "do not keep"
        }
      ],
      rawPrompt: `rawPrompt rawDom rawCsv ${secret}`
    } as UserWorkspaceSnapshotBackupContractInput & Record<string, unknown>;

    const validation =
      validateUserWorkspaceSnapshotBackupContractInput(unsafeInput);
    const contract = buildUserWorkspaceSnapshotBackupContract(unsafeInput);
    const serialized = JSON.stringify(contract);

    expect(validation.ok).toBe(false);
    expect(contract.status).toBe("blocked");
    expect(contract.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "USER_WORKSPACE_RAW_FIELD_REJECTED",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER",
        "API_KEY_MARKER"
      ])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("blocks symlink, junction, and reparse point summaries under deny policy", () => {
    const contract = buildUserWorkspaceSnapshotBackupContract(
      safeInput({
        files: [
          {
            path: "app/src/link.ts",
            sizeBytes: 1,
            hashPrefix: "abc12345",
            exists: true,
            isSymlink: true,
            isJunction: true,
            isReparsePoint: true
          }
        ]
      })
    );

    expect(contract.status).toBe("blocked");
    expect(contract.symlinkLikeCount).toBe(1);
    expect(contract.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "USER_WORKSPACE_SYMLINK_DENIED",
        "USER_WORKSPACE_REPARSE_POINT_DENIED"
      ])
    );
  });

  it("blocks duplicate paths, too many files, and too many bytes", () => {
    const contract = buildUserWorkspaceSnapshotBackupContract(
      safeInput({
        maxFiles: 1,
        maxBytes: 10,
        files: [
          {
            path: "docs/a.md",
            sizeBytes: 20,
            hashPrefix: "abc12345",
            exists: true
          },
          {
            path: "docs/a.md",
            sizeBytes: 20,
            hashPrefix: "def67890",
            exists: true
          }
        ]
      })
    );

    expect(contract.status).toBe("blocked");
    expect(contract.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "USER_WORKSPACE_DUPLICATE_PATH",
        "USER_WORKSPACE_TOO_MANY_FILES",
        "USER_WORKSPACE_TOO_MANY_BYTES"
      ])
    );
  });

  it("blocks planned mutation without backup and update/delete without preimage hash", () => {
    const contract = buildUserWorkspaceSnapshotBackupContract(
      safeInput({
        files: [
          {
            path: "app/src/App.tsx",
            sizeBytes: 20,
            hashPrefix: "abc12345",
            exists: true,
            plannedMutation: "update",
            backupRequired: false,
            preimageHashRequired: false
          },
          {
            path: "docs/remove.md",
            sizeBytes: 20,
            hashPrefix: "def67890",
            exists: true,
            plannedMutation: "delete",
            backupRequired: true,
            preimageHashRequired: false
          }
        ]
      })
    );

    expect(contract.status).toBe("blocked");
    expect(contract.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "USER_WORKSPACE_BACKUP_REQUIRED_FOR_MUTATION",
        "USER_WORKSPACE_PREIMAGE_HASH_REQUIRED"
      ])
    );
  });

  it("warns for binary files and source mutations without test summaries", () => {
    const contract = buildUserWorkspaceSnapshotBackupContract(
      safeInput({
        files: [
          {
            path: "app/src/App.tsx",
            language: "typescript",
            extension: "tsx",
            sizeBytes: 1200,
            lineCount: 80,
            hashPrefix: "abc12345",
            exists: true,
            plannedMutation: "update",
            backupRequired: true,
            preimageHashRequired: true,
            isBinary: true
          }
        ]
      })
    );

    expect(contract.status).toBe("warning");
    expect(contract.binaryFileCount).toBe(1);
    expect(contract.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "USER_WORKSPACE_BINARY_FILE",
        "USER_WORKSPACE_SOURCE_WITHOUT_TEST_SUMMARY"
      ])
    );
    expect(contract.readiness.canProceedToPromotionReadinessCheck).toBe(true);
  });

  it("blocks attempts to enable filesystem, user apply, rollback, git, or shell flags", () => {
    const contract = buildUserWorkspaceSnapshotBackupContract({
      ...safeInput(),
      canReadFilesystem: true,
      nested: {
        canWriteFilesystem: true,
        canApplyToUserWorkspace: true,
        canRollbackUserWorkspace: true,
        canExecuteGit: true,
        canExecuteShell: true
      }
    } as UserWorkspaceSnapshotBackupContractInput & Record<string, unknown>);

    expect(contract.status).toBe("blocked");
    expect(contract.findings.map((finding) => finding.code)).toContain(
      "USER_WORKSPACE_EXECUTION_FLAG_REJECTED"
    );
    expect(contract.readiness.canReadFilesystem).toBe(false);
    expect(contract.readiness.canWriteFilesystem).toBe(false);
    expect(contract.readiness.canApplyToUserWorkspace).toBe(false);
    expect(contract.readiness.canRollbackUserWorkspace).toBe(false);
    expect(contract.readiness.canExecuteGit).toBe(false);
    expect(contract.readiness.canExecuteShell).toBe(false);
  });
});
