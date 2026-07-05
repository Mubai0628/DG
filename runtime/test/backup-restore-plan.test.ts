import { describe, expect, it } from "vitest";

import {
  buildBackupPlan,
  buildRestorePlan,
  buildRollbackPackagePlan,
  summarizeBackupRestorePlan,
  type BackupPlan,
  type BackupRestorePlanInput,
  type RestorePlan,
  type RollbackPackagePlan
} from "../src/index.js";

function safeInput(): BackupRestorePlanInput {
  return {
    packageId: "backup-package-safe",
    itemCount: 3,
    byteCount: 256,
    schemaVersions: ["event_log.v1", "project_knowledge.v1"],
    includedDirectoryKinds: ["event_log", "project_knowledge_store"],
    excludedDirectoryKinds: ["node_modules", "dist", "target", ".git"],
    hashPrefixes: ["abc123"],
    manualVerificationSteps: ["Confirm summary counts before execution."],
    sourceWorkspaceRootRef: "workspace-root-ref",
    targetWorkspaceRootRef: "workspace-root-ref",
    schemaRegistryPresent: true
  };
}

function findingCodes(
  plan: BackupPlan | RestorePlan | RollbackPackagePlan
): string[] {
  return plan.findings.map((finding) => finding.code);
}

function expectNoExecution(
  plan: BackupPlan | RestorePlan | RollbackPackagePlan
): void {
  expect(plan.readiness).toMatchObject({
    canCreateArchive: false,
    canRestoreBackup: false,
    canDeleteData: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("backup restore dry-run plans", () => {
  it("builds safe backup restore and rollback package summaries", () => {
    const backup = buildBackupPlan(safeInput());
    const restore = buildRestorePlan(safeInput());
    const rollback = buildRollbackPackagePlan({
      ...safeInput(),
      packageId: "rollback-package-safe",
      includedDirectoryKinds: ["checkpoint_dir"],
      schemaVersions: ["checkpoint.v1"]
    });
    const summary = summarizeBackupRestorePlan(backup);

    expect(backup.status).toBe("plan_ready");
    expect(restore.status).toBe("plan_ready");
    expect(rollback.status).toBe("plan_ready");
    expect(summary.itemCount).toBe(3);
    expect(summary.manualVerificationStepCount).toBe(1);
    expect(backup.includedDirectoryKinds).toContain("event_log");
    expect(backup.excludedDirectoryKinds).toContain("node_modules");
    expectNoExecution(backup);
    expectNoExecution(restore);
    expectNoExecution(rollback);
  });

  it("blocks backup plans that include generated or private directories by default", () => {
    const backup = buildBackupPlan({
      ...safeInput(),
      includedDirectoryKinds: [
        "event_log",
        "node_modules",
        "dist",
        "target",
        ".git",
        ".env"
      ]
    });

    expect(backup.status).toBe("blocked");
    expect(findingCodes(backup)).toContain("NODE_MODULES_INCLUDED_REJECTED");
    expect(findingCodes(backup)).toContain("DIST_INCLUDED_REJECTED");
    expect(findingCodes(backup)).toContain("TARGET_INCLUDED_REJECTED");
    expect(findingCodes(backup)).toContain("GIT_INCLUDED_REJECTED");
    expect(findingCodes(backup)).toContain("ENV_INCLUDED_REJECTED");
    expectNoExecution(backup);
  });

  it("blocks restore to a different workspace root without manual review", () => {
    const restore = buildRestorePlan({
      ...safeInput(),
      sourceWorkspaceRootRef: "workspace-a",
      targetWorkspaceRootRef: "workspace-b",
      manualReviewRequired: false
    });
    const reviewed = buildRestorePlan({
      ...safeInput(),
      sourceWorkspaceRootRef: "workspace-a",
      targetWorkspaceRootRef: "workspace-b",
      manualReviewRequired: true
    });

    expect(restore.status).toBe("blocked");
    expect(findingCodes(restore)).toContain(
      "RESTORE_CROSS_WORKSPACE_REQUIRES_MANUAL_REVIEW"
    );
    expect(reviewed.status).toBe("plan_ready");
    expectNoExecution(reviewed);
  });

  it("blocks rollback package plans without schema registry summary", () => {
    const rollback = buildRollbackPackagePlan({
      ...safeInput(),
      schemaRegistryPresent: false
    });

    expect(rollback.status).toBe("blocked");
    expect(findingCodes(rollback)).toContain(
      "ROLLBACK_SCHEMA_REGISTRY_REQUIRED"
    );
    expectNoExecution(rollback);
  });

  it("blocks restore plans with delete steps", () => {
    const restore = buildRestorePlan({
      ...safeInput(),
      deleteSteps: ["delete-old-event-log"]
    });

    expect(restore.status).toBe("blocked");
    expect(findingCodes(restore)).toContain("RESTORE_DELETE_STEPS_REJECTED");
    expectNoExecution(restore);
  });

  it("blocks raw content and archive binary fields", () => {
    const backup = buildBackupPlan({
      ...safeInput(),
      rawFileContent: "raw file content",
      archiveBinary: "archive binary"
    } as unknown as BackupRestorePlanInput);

    expect(backup.status).toBe("blocked");
    expect(findingCodes(backup)).toContain("RAWFILECONTENT_FIELD_REJECTED");
    expect(findingCodes(backup)).toContain("ARCHIVEBINARY_FIELD_REJECTED");
    expectNoExecution(backup);
  });

  it("blocks secret markers without echoing the marker", () => {
    const backup = buildBackupPlan({
      ...safeInput(),
      hashPrefixes: ["Bearer fake-test-token"]
    });
    const output = JSON.stringify(backup);

    expect(backup.status).toBe("blocked");
    expect(findingCodes(backup)).toContain("BEARER_TOKEN_MARKER");
    expect(output).not.toContain("fake-test-token");
    expectNoExecution(backup);
  });

  it("keeps deterministic package ids and hashes with injected id", () => {
    const first = buildBackupPlan({
      ...safeInput(),
      packageId: undefined,
      idGenerator: () => "backup-generated"
    });
    const second = buildBackupPlan({
      ...safeInput(),
      packageId: undefined,
      idGenerator: () => "backup-generated"
    });

    expect(first.packageId).toBe("backup-generated");
    expect(first.planHash).toBe(second.planHash);
    expectNoExecution(first);
  });
});
