import { describe, expect, it } from "vitest";

import {
  buildDisposableWorkspaceSnapshotContract,
  summarizeDisposableWorkspaceSnapshotContract,
  validateDisposableWorkspaceSnapshotContractInput,
  type DisposableWorkspaceSnapshotContractInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function safeInput(
  overrides: Partial<DisposableWorkspaceSnapshotContractInput> = {}
): DisposableWorkspaceSnapshotContractInput {
  return {
    sourceWorkspaceFingerprint: "workspace-fingerprint-001",
    disposableRootRef: "sandbox-ref-p0j-001",
    workspaceIndexRef: "workspace-index-summary-001",
    sourceSnapshotHash: "sourcesnap001",
    expectedInputHash: "expectedinput001",
    files: [
      {
        path: "app/src/App.tsx",
        language: "typescript",
        extension: "tsx",
        sizeBytes: 1200,
        lineCount: 80,
        hashPrefix: "abc12345",
        exists: true,
        plannedMutation: "update"
      },
      {
        path: "app/test/desktop-shell.test.ts",
        language: "typescript",
        extension: "ts",
        sizeBytes: 900,
        lineCount: 60,
        hashPrefix: "def67890",
        exists: true,
        plannedMutation: "test"
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

describe("disposable workspace snapshot contract helper", () => {
  it("creates a metadata-only contract-ready summary from safe input", () => {
    const contract = buildDisposableWorkspaceSnapshotContract(safeInput());
    const serialized = JSON.stringify(contract);

    expect(contract.source).toBe(
      "runtime_disposable_workspace_snapshot_contract"
    );
    expect(contract.status).toBe("contract_ready");
    expect(contract.metadataOnly).toBe(true);
    expect(contract.fileCount).toBe(2);
    expect(contract.directoryCount).toBe(1);
    expect(contract.totalBytes).toBe(2100);
    expect(contract.plannedMutationCount).toBe(2);
    expect(contract.readiness.canProceedToSandboxApplyPrototype).toBe(true);
    expect(contract.readiness.canReadFilesystem).toBe(false);
    expect(contract.readiness.canWriteFilesystem).toBe(false);
    expect(contract.readiness.canApplyPatch).toBe(false);
    expect(contract.readiness.canRollbackReal).toBe(false);
    expect(contract.readiness.canExecuteGit).toBe(false);
    expect(contract.readiness.canExecuteShell).toBe(false);
    expect(contract.fileReadEnabled).toBe(false);
    expect(contract.fileWriteEnabled).toBe(false);
    expect(contract.applyEnabled).toBe(false);
    expect(contract.rollbackEnabled).toBe(false);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toContain("function App");
  });

  it("produces deterministic contract ids and hashes with an injected id", () => {
    const first = buildDisposableWorkspaceSnapshotContract(
      safeInput({ idGenerator: () => "snapshot-contract-fixed" })
    );
    const second = buildDisposableWorkspaceSnapshotContract(
      safeInput({ idGenerator: () => "snapshot-contract-fixed" })
    );

    expect(first.contractId).toBe("snapshot-contract-fixed");
    expect(first).toEqual(second);
    expect(summarizeDisposableWorkspaceSnapshotContract(first)).toEqual(
      summarizeDisposableWorkspaceSnapshotContract(second)
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
      const contract = buildDisposableWorkspaceSnapshotContract(
        safeInput({
          files: [
            {
              path: unsafePath,
              sizeBytes: 1,
              hashPrefix: "abc12345",
              exists: true,
              plannedMutation: "update"
            }
          ]
        })
      );

      expect(contract.status).toBe("blocked");
      expect(contract.blockerCount).toBeGreaterThan(0);
      expect(contract.readiness.canProceedToSandboxApplyPrototype).toBe(false);
    }
  });

  it("blocks generated artifact planned mutations", () => {
    const contract = buildDisposableWorkspaceSnapshotContract(
      safeInput({
        files: [
          {
            path: "runtime/dist/index.js",
            sizeBytes: 10,
            hashPrefix: "abc12345",
            exists: true,
            plannedMutation: "update",
            isGenerated: true
          }
        ]
      })
    );

    expect(contract.status).toBe("blocked");
    expect(contract.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "DISPOSABLE_SNAPSHOT_BLOCKED_DIRECTORY_REJECTED",
        "DISPOSABLE_SNAPSHOT_GENERATED_MUTATION_DENIED"
      ])
    );
  });

  it("blocks raw fields and unsafe markers without retaining raw values", () => {
    const secret = "sk-test1234567890abcdef";
    const unsafeInput = {
      ...safeInput(),
      files: [
        {
          path: "docs/unsafe.md",
          sizeBytes: 1,
          hashPrefix: "abc12345",
          exists: true,
          beforeContent: "do not keep"
        }
      ],
      rawPrompt: `rawPrompt rawDom rawCsv ${secret}`
    } as DisposableWorkspaceSnapshotContractInput & Record<string, unknown>;

    const validation =
      validateDisposableWorkspaceSnapshotContractInput(unsafeInput);
    const contract = buildDisposableWorkspaceSnapshotContract(unsafeInput);
    const serialized = JSON.stringify(contract);

    expect(validation.ok).toBe(false);
    expect(contract.status).toBe("blocked");
    expect(contract.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "DISPOSABLE_SNAPSHOT_RAW_FIELD_REJECTED",
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
    const contract = buildDisposableWorkspaceSnapshotContract(
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
        "DISPOSABLE_SNAPSHOT_SYMLINK_DENIED",
        "DISPOSABLE_SNAPSHOT_REPARSE_POINT_DENIED"
      ])
    );
  });

  it("blocks duplicate paths, too many files, and too many bytes", () => {
    const contract = buildDisposableWorkspaceSnapshotContract(
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
        "DISPOSABLE_SNAPSHOT_DUPLICATE_PATH",
        "DISPOSABLE_SNAPSHOT_TOO_MANY_FILES",
        "DISPOSABLE_SNAPSHOT_TOO_MANY_BYTES"
      ])
    );
  });

  it("warns for binary files and source mutations without test summaries", () => {
    const contract = buildDisposableWorkspaceSnapshotContract(
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
            isBinary: true
          }
        ]
      })
    );

    expect(contract.status).toBe("warning");
    expect(contract.binaryFileCount).toBe(1);
    expect(contract.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "DISPOSABLE_SNAPSHOT_BINARY_FILE",
        "DISPOSABLE_SNAPSHOT_SOURCE_WITHOUT_TEST_SUMMARY"
      ])
    );
    expect(contract.readiness.canProceedToSandboxApplyPrototype).toBe(true);
  });

  it("blocks attempts to enable filesystem, patch, or rollback execution flags", () => {
    const contract = buildDisposableWorkspaceSnapshotContract({
      ...safeInput(),
      canReadFilesystem: true,
      nested: {
        canWriteFilesystem: true,
        canApplyPatch: true
      }
    } as DisposableWorkspaceSnapshotContractInput & Record<string, unknown>);

    expect(contract.status).toBe("blocked");
    expect(contract.findings.map((finding) => finding.code)).toContain(
      "DISPOSABLE_SNAPSHOT_EXECUTION_FLAG_REJECTED"
    );
    expect(contract.readiness.canReadFilesystem).toBe(false);
    expect(contract.readiness.canWriteFilesystem).toBe(false);
    expect(contract.readiness.canApplyPatch).toBe(false);
    expect(contract.readiness.canRollbackReal).toBe(false);
    expect(contract.readiness.canExecuteGit).toBe(false);
    expect(contract.readiness.canExecuteShell).toBe(false);
  });
});
