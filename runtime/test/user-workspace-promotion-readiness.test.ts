import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildUserWorkspacePromotionReadiness,
  buildUserWorkspaceSnapshotBackupContract,
  summarizeUserWorkspacePromotionReadiness,
  validateUserWorkspacePromotionReadinessInput,
  type UserWorkspacePromotionReadinessInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function safeUserContract(overrides: Record<string, unknown> = {}) {
  return buildUserWorkspaceSnapshotBackupContract({
    userWorkspaceRootRef: "user-workspace-ref-p0k-003",
    sourceWorkspaceFingerprint: "workspace-fingerprint-p0k-003",
    disposableApplyResultRef: "apply-1",
    disposableRollbackResultRef: "rollback-1",
    disposableSnapshotContractRef: "snapshot-contract-1",
    expectedDisposableOutputHash: "disposable-output-hash",
    expectedUserSnapshotHash: "user-snapshot-hash",
    files: [
      {
        path: "app/src/App.tsx",
        language: "typescript",
        extension: "tsx",
        sizeBytes: 1200,
        lineCount: 80,
        hashPrefix: "abc12345",
        exists: true,
        plannedMutation: "none",
        backupRequired: false,
        preimageHashRequired: false,
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
        plannedMutation: "none",
        backupRequired: false,
        preimageHashRequired: false,
        lineEnding: "lf"
      }
    ],
    lineEndingPolicy: "lf",
    createdAt,
    ...overrides
  });
}

function backupRequiredUserContract() {
  return buildUserWorkspaceSnapshotBackupContract({
    userWorkspaceRootRef: "user-workspace-ref-p0k-003",
    sourceWorkspaceFingerprint: "workspace-fingerprint-p0k-003",
    disposableApplyResultRef: "apply-1",
    disposableRollbackResultRef: "rollback-1",
    disposableSnapshotContractRef: "snapshot-contract-1",
    expectedDisposableOutputHash: "disposable-output-hash",
    expectedUserSnapshotHash: "user-snapshot-hash",
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
    lineEndingPolicy: "lf",
    createdAt
  });
}

function safeApplyResult(overrides: Record<string, unknown> = {}) {
  return {
    status: "applied_to_disposable",
    applyId: "apply-1",
    disposableRootRef: "disposable-root-ref",
    outputSnapshotHash: "disposable-output-hash",
    resultHash: "apply-result-hash",
    warningCount: 0,
    blockerCount: 0,
    readiness: {
      appliedToDisposable: true,
      canPromoteToUserWorkspace: false,
      canApplyToUserWorkspace: false,
      canCommitGit: false,
      canExecuteShell: false,
      canRollbackReal: false
    },
    source: "runtime_disposable_patch_apply",
    ...overrides
  };
}

function safeRollbackResult(overrides: Record<string, unknown> = {}) {
  return {
    status: "rolled_back_disposable",
    rollbackId: "rollback-1",
    applyId: "apply-1",
    checkpointId: "checkpoint-1",
    disposableRootRef: "disposable-root-ref",
    restoredSnapshotHash: "restored-snapshot-hash",
    resultHash: "rollback-result-hash",
    warningCount: 0,
    blockerCount: 0,
    readiness: {
      rolledBackDisposable: true,
      canRollbackUserWorkspace: false,
      canApplyToUserWorkspace: false,
      canCommitGit: false,
      canExecuteShell: false
    },
    source: "runtime_disposable_patch_rollback",
    ...overrides
  };
}

function safeEventProjection(overrides: Record<string, unknown> = {}) {
  return {
    status: "projection_ready",
    projectionId: "projection-1",
    chainId: "chain-1",
    blockerCount: 0,
    warningCount: 0,
    projectionHash: "projection-hash",
    eventPreviews: [
      {
        eventId: "event-1",
        type: "sandbox.patch_apply.result_previewed",
        notWritten: true,
        eventHash: "event-hash"
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
    source: "runtime_sandbox_apply_rollback_event_projection",
    ...overrides
  };
}

function safeInput(
  overrides: Partial<UserWorkspacePromotionReadinessInput> = {}
): UserWorkspacePromotionReadinessInput {
  return {
    userWorkspaceSnapshotBackupContract: safeUserContract(),
    disposablePatchApplyResult: safeApplyResult(),
    disposablePatchRollbackResult: safeRollbackResult(),
    sandboxApplyRollbackEventProjection: safeEventProjection(),
    patchProposalPreview: { status: "preview", proposalId: "proposal-1" },
    patchValidationPreview: {
      status: "preview",
      validationId: "validation-1"
    },
    patchDiffAuditPreview: { status: "preview", auditId: "audit-1" },
    patchApprovalDraft: {
      status: "preview",
      approvalDraftId: "approval-1"
    },
    patchVirtualApplyPreview: {
      status: "preview_ready",
      virtualApplyId: "virtual-1"
    },
    patchRollbackCheckpointPreview: {
      status: "checkpoint_preview_ready",
      checkpointPreviewId: "checkpoint-preview-1"
    },
    approvalGatedDisposableApplyResult: {
      status: "applied_to_disposable",
      gatedApplyId: "gated-apply-1",
      resultHash: "gated-result-hash",
      readiness: {
        canApplyToUserWorkspace: false,
        canPromoteToUserWorkspace: false,
        canIssuePermissionLease: false,
        canCommitGit: false,
        canExecuteShell: false
      }
    },
    createdAt,
    ...overrides
  };
}

describe("user workspace promotion readiness helper", () => {
  it("returns empty for empty input", () => {
    const readiness = buildUserWorkspacePromotionReadiness();

    expect(readiness.status).toBe("empty");
    expect(readiness.gateCount).toBe(12);
    expect(readiness.readiness.canApplyToUserWorkspace).toBe(false);
    expect(readiness.readiness.canWriteFilesystem).toBe(false);
    expect(readiness.readiness.appCanExecute).toBe(false);
  });

  it("returns readiness_ready for a safe metadata summary chain", () => {
    const readiness = buildUserWorkspacePromotionReadiness(safeInput());
    const serialized = JSON.stringify(readiness);

    expect(readiness.source).toBe("runtime_user_workspace_promotion_readiness");
    expect(readiness.status).toBe("readiness_ready");
    expect(readiness.gateCount).toBeGreaterThanOrEqual(12);
    expect(readiness.blockedGateCount).toBe(0);
    expect(readiness.warningGateCount).toBe(0);
    expect(readiness.missingArtifactCount).toBe(0);
    expect(readiness.readiness.canProceedToUserWorkspaceApplyPrototype).toBe(
      true
    );
    expect(readiness.readiness.canApplyToUserWorkspace).toBe(false);
    expect(readiness.readiness.canWriteFilesystem).toBe(false);
    expect(readiness.readiness.canRollbackUserWorkspace).toBe(false);
    expect(readiness.readiness.canExecuteGit).toBe(false);
    expect(readiness.readiness.canExecuteShell).toBe(false);
    expect(readiness.readiness.canIssuePermissionLease).toBe(false);
    expect(readiness.readiness.appCanExecute).toBe(false);
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toMatch(/"content"\s*:/);
    expect(serialized).not.toMatch(/"preimageContent"\s*:/);
  });

  it("is deterministic with injected id and clock", () => {
    const first = buildUserWorkspacePromotionReadiness(
      safeInput({ idGenerator: () => "promotion-readiness-fixed" })
    );
    const second = buildUserWorkspacePromotionReadiness(
      safeInput({ idGenerator: () => "promotion-readiness-fixed" })
    );

    expect(first.readinessId).toBe("promotion-readiness-fixed");
    expect(first).toEqual(second);
    expect(summarizeUserWorkspacePromotionReadiness(first)).toEqual(
      summarizeUserWorkspacePromotionReadiness(second)
    );
  });

  it("blocks a missing or blocked user workspace snapshot contract", () => {
    const missing = buildUserWorkspacePromotionReadiness(
      safeInput({ userWorkspaceSnapshotBackupContract: undefined })
    );
    const blocked = buildUserWorkspacePromotionReadiness(
      safeInput({
        userWorkspaceSnapshotBackupContract: {
          ...safeUserContract(),
          status: "blocked",
          readiness: { canProceedToPromotionReadinessCheck: false }
        }
      })
    );

    expect(missing.status).toBe("blocked");
    expect(missing.findings.map((finding) => finding.code)).toContain(
      "PROMOTION_USER_CONTRACT_MISSING"
    );
    expect(blocked.status).toBe("blocked");
    expect(blocked.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PROMOTION_USER_CONTRACT_BLOCKED",
        "PROMOTION_USER_CONTRACT_NOT_READY"
      ])
    );
  });

  it("blocks missing disposable apply and rollback summaries", () => {
    const missingApply = buildUserWorkspacePromotionReadiness(
      safeInput({ disposablePatchApplyResult: undefined })
    );
    const missingRollback = buildUserWorkspacePromotionReadiness(
      safeInput({ disposablePatchRollbackResult: undefined })
    );

    expect(missingApply.status).toBe("blocked");
    expect(missingApply.findings.map((finding) => finding.code)).toContain(
      "PROMOTION_DISPOSABLE_APPLY_MISSING"
    );
    expect(missingRollback.status).toBe("blocked");
    expect(missingRollback.findings.map((finding) => finding.code)).toContain(
      "PROMOTION_DISPOSABLE_ROLLBACK_MISSING"
    );
  });

  it("blocks apply rollback id and disposable root mismatches", () => {
    const readiness = buildUserWorkspacePromotionReadiness(
      safeInput({
        disposablePatchRollbackResult: safeRollbackResult({
          applyId: "other-apply",
          disposableRootRef: "other-root"
        })
      })
    );

    expect(readiness.status).toBe("blocked");
    expect(readiness.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PROMOTION_APPLY_ROLLBACK_ID_MISMATCH",
        "PROMOTION_DISPOSABLE_ROOT_REF_MISMATCH"
      ])
    );
  });

  it("blocks event projections with written event previews", () => {
    const readiness = buildUserWorkspacePromotionReadiness(
      safeInput({
        sandboxApplyRollbackEventProjection: safeEventProjection({
          eventPreviews: [{ eventId: "event-1", notWritten: false }]
        })
      })
    );

    expect(readiness.status).toBe("blocked");
    expect(readiness.findings.map((finding) => finding.code)).toContain(
      "PROMOTION_EVENT_PREVIEW_WRITTEN_REJECTED"
    );
  });

  it("blocks missing expected hashes", () => {
    const contract = buildUserWorkspaceSnapshotBackupContract({
      userWorkspaceRootRef: "user-workspace-ref-p0k-003",
      sourceWorkspaceFingerprint: "workspace-fingerprint-p0k-003",
      files: [],
      lineEndingPolicy: "lf",
      createdAt
    });
    const readiness = buildUserWorkspacePromotionReadiness(
      safeInput({ userWorkspaceSnapshotBackupContract: contract })
    );

    expect(readiness.status).toBe("blocked");
    expect(readiness.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PROMOTION_USER_SNAPSHOT_HASH_MISSING",
        "PROMOTION_DISPOSABLE_OUTPUT_HASH_MISSING"
      ])
    );
  });

  it("blocks raw content and preimage fields without retaining raw values", () => {
    const secret = "sk-test1234567890abcdef";
    const input = {
      ...safeInput(),
      patchValidationPreview: {
        status: "preview",
        validationId: "validation-1",
        preimageContent: "do not keep"
      },
      rawPrompt: `rawPrompt rawDom rawCsv ${secret}`
    } as UserWorkspacePromotionReadinessInput & Record<string, unknown>;
    const validation = validateUserWorkspacePromotionReadinessInput(input);
    const readiness = buildUserWorkspacePromotionReadiness(input);
    const serialized = JSON.stringify(readiness);

    expect(validation.ok).toBe(false);
    expect(readiness.status).toBe("blocked");
    expect(readiness.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PROMOTION_RAW_FIELD_REJECTED",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER",
        "API_KEY_MARKER"
      ])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("warns when approval-gated disposable apply is missing", () => {
    const readiness = buildUserWorkspacePromotionReadiness(
      safeInput({ approvalGatedDisposableApplyResult: undefined })
    );

    expect(readiness.status).toBe("warning");
    expect(readiness.findings.map((finding) => finding.code)).toContain(
      "PROMOTION_APPROVAL_GATED_DISPOSABLE_APPLY_MISSING"
    );
    expect(readiness.readiness.canProceedToUserWorkspaceApplyPrototype).toBe(
      true
    );
  });

  it("warns when backup requirements exist while preimage capture remains deferred", () => {
    const readiness = buildUserWorkspacePromotionReadiness(
      safeInput({ userWorkspaceSnapshotBackupContract: backupRequiredUserContract() })
    );

    expect(readiness.status).toBe("warning");
    expect(readiness.findings.map((finding) => finding.code)).toContain(
      "PROMOTION_PREIMAGE_CAPTURE_DEFERRED_FOR_BACKUP_REQUIREMENTS"
    );
    expect(
      readiness.gates.find((gate) => gate.name === "backup_preimage_requirement")
        ?.status
    ).toBe("warning");
  });

  it("blocks attempts to enable user apply, filesystem, rollback, lease, git, shell, or app execution", () => {
    const readiness = buildUserWorkspacePromotionReadiness({
      ...safeInput(),
      canApplyToUserWorkspace: true,
      nested: {
        canWriteFilesystem: true,
        canRollbackUserWorkspace: true,
        canExecuteGit: true,
        canExecuteShell: true,
        canIssuePermissionLease: true,
        appCanExecute: true
      }
    } as UserWorkspacePromotionReadinessInput & Record<string, unknown>);

    expect(readiness.status).toBe("blocked");
    expect(readiness.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PROMOTION_EXECUTION_FLAG_REJECTED",
        "PROMOTION_APP_EXECUTION_ENABLED_REJECTED"
      ])
    );
    expect(readiness.readiness.canApplyToUserWorkspace).toBe(false);
    expect(readiness.readiness.canWriteFilesystem).toBe(false);
    expect(readiness.readiness.canRollbackUserWorkspace).toBe(false);
    expect(readiness.readiness.canExecuteGit).toBe(false);
    expect(readiness.readiness.canExecuteShell).toBe(false);
    expect(readiness.readiness.canIssuePermissionLease).toBe(false);
    expect(readiness.readiness.appCanExecute).toBe(false);
  });

  it("does not import filesystem helpers in the readiness helper", () => {
    const source = readFileSync(
      "runtime/src/execution/user-workspace/promotion-readiness-checker.ts",
      "utf8"
    );

    expect(source).not.toContain("node:fs");
    expect(source).not.toContain("writeFile");
    expect(source).not.toContain("readFile");
    expect(source).not.toContain("child_process");
  });
});
