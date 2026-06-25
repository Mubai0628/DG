import { describe, expect, it } from "vitest";

import {
  buildPatchApprovalDraft,
  buildPatchDiffAuditPreview,
  buildPatchProposalValidationPreview,
  buildPatchRollbackCheckpointPreview,
  buildPatchVirtualApplyPreview,
  summarizePatchRollbackCheckpointPreview,
  validatePatchRollbackCheckpointInput,
  type PatchRollbackCheckpointPreviewInput,
  type PatchVirtualApplyPreviewInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function safeProposalSummary(): PatchVirtualApplyPreviewInput["proposalPreview"] {
  return {
    proposalId: "patch-rollback-safe",
    intent: "documentation",
    title: "Update rollback checkpoint summary",
    fileCount: 1,
    filesCreated: 0,
    filesUpdated: 1,
    filesDeleted: 0,
    linesAdded: 8,
    linesRemoved: 1,
    riskLevel: "A2_draft_write",
    requiresApproval: false,
    pathSummaries: ["update:examples/summary.txt"],
    proposalHash: "proposalhashrollback",
    items: [
      {
        path: "examples/summary.txt",
        changeKind: "update",
        language: "unknown",
        extension: "txt",
        estimatedLinesAdded: 8,
        estimatedLinesRemoved: 1,
        warningCodes: []
      }
    ]
  };
}

function safeValidationPreview() {
  return buildPatchProposalValidationPreview({
    proposalPreview: safeProposalSummary(),
    workspaceIndexRef: "workspace-index-1",
    contextSummaryRef: "context-summary-1",
    agentRouteRef: "agent-route-1",
    capabilityPlanRef: "capability-plan-1",
    createdAt
  });
}

function safeAuditPreview() {
  return buildPatchDiffAuditPreview({
    proposalPreview: safeProposalSummary(),
    validationPreview: safeValidationPreview(),
    workspaceIndexRef: "workspace-index-1",
    contextSummaryRef: "context-summary-1",
    agentRouteRef: "agent-route-1",
    capabilityPlanRef: "capability-plan-1",
    approvalRef: "approval-ref-1",
    createdAt
  });
}

function safeApprovalDraft() {
  return buildPatchApprovalDraft({
    proposalPreview: safeProposalSummary(),
    validationPreview: safeValidationPreview(),
    diffAuditPreview: safeAuditPreview(),
    workspaceIndexRef: "workspace-index-1",
    contextSummaryRef: "context-summary-1",
    agentRouteRef: "agent-route-1",
    capabilityPlanRef: "capability-plan-1",
    createdAt
  });
}

function safeSnapshot(): PatchVirtualApplyPreviewInput["virtualWorkspaceSnapshot"] {
  return {
    snapshotId: "snapshot-rollback-1",
    snapshotHash: "rollbackinputhash",
    directoryCount: 1,
    files: [
      {
        path: "examples/summary.txt",
        language: "unknown",
        extension: "txt",
        sizeBytes: 120,
        lineCount: 12,
        hashPrefix: "abc12345",
        exists: true
      }
    ],
    warningCodes: []
  };
}

function safeVirtualApplyPreview() {
  return buildPatchVirtualApplyPreview({
    proposalPreview: safeProposalSummary(),
    validationPreview: safeValidationPreview(),
    diffAuditPreview: safeAuditPreview(),
    approvalDraft: safeApprovalDraft(),
    virtualWorkspaceSnapshot: safeSnapshot(),
    workspaceIndexRef: "workspace-index-1",
    contextSummaryRef: "context-summary-1",
    agentRouteRef: "agent-route-1",
    capabilityPlanRef: "capability-plan-1",
    createdAt
  });
}

function safeRollbackInput(): PatchRollbackCheckpointPreviewInput {
  return {
    virtualApplyPreview: safeVirtualApplyPreview(),
    approvalDraft: safeApprovalDraft(),
    workspaceIndexRef: "workspace-index-1",
    contextSummaryRef: "context-summary-1",
    agentRouteRef: "agent-route-1",
    capabilityPlanRef: "capability-plan-1",
    createdAt
  };
}

describe("patch rollback checkpoint preview helper", () => {
  it("creates a checkpoint-preview-ready metadata-only rollback summary", () => {
    const preview = buildPatchRollbackCheckpointPreview(safeRollbackInput());
    const serialized = JSON.stringify(preview);

    expect(preview.source).toBe("runtime_patch_rollback_checkpoint_preview");
    expect(preview.status).toBe("checkpoint_preview_ready");
    expect(preview.previewOnly).toBe(true);
    expect(preview.metadataOnly).toBe(true);
    expect(preview.virtualApplyId).toBe(
      safeVirtualApplyPreview().virtualApplyId
    );
    expect(preview.inputSnapshot.snapshotHash).toBe("rollbackinputhash");
    expect(preview.outputSnapshot.snapshotHash).not.toBe("rollbackinputhash");
    expect(preview.operationSummaries).toHaveLength(1);
    expect(preview.restoreScope.metadataOnly).toBe(true);
    expect(preview.restoreScope.filesToRestore).toEqual([
      "examples/summary.txt"
    ]);
    expect(preview.readiness.canProceedToReplayProjectionPreview).toBe(true);
    expect(preview.readiness.canRollbackReal).toBe(false);
    expect(preview.readiness.rollbackExecuted).toBe(false);
    expect(preview.readiness.canWriteFilesystem).toBe(false);
    expect(preview.readiness.canApplyPatch).toBe(false);
    expect(preview.readiness.canExecuteGit).toBe(false);
    expect(preview.readiness.canExecuteShell).toBe(false);
    expect(preview.checkpointFileWriteEnabled).toBe(false);
    expect(preview.fileReadEnabled).toBe(false);
    expect(preview.fileWriteEnabled).toBe(false);
    expect(preview.eventWritesEnabled).toBe(false);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toContain("function App");
  });

  it("produces deterministic checkpoint ids and hashes", () => {
    const first = buildPatchRollbackCheckpointPreview({
      ...safeRollbackInput(),
      idGenerator: () => "patch-rollback-fixed"
    });
    const second = buildPatchRollbackCheckpointPreview({
      ...safeRollbackInput(),
      idGenerator: () => "patch-rollback-fixed"
    });

    expect(first.checkpointPreviewId).toBe("patch-rollback-fixed");
    expect(first).toEqual(second);
    expect(summarizePatchRollbackCheckpointPreview(first)).toEqual(
      summarizePatchRollbackCheckpointPreview(second)
    );
  });

  it("blocks when virtual apply preview is blocked or not ready", () => {
    const blockedVirtual = buildPatchVirtualApplyPreview({
      proposalId: "rollback-blocked",
      validationId: "validation-blocked",
      auditId: "audit-blocked",
      approvalDraftId: "approval-blocked",
      pathSummaries: ["update:.env.local"],
      proposedOperations: [{ path: ".env.local", changeKind: "update" }],
      virtualWorkspaceSnapshot: safeSnapshot()
    });
    const preview = buildPatchRollbackCheckpointPreview({
      virtualApplyPreview: blockedVirtual,
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });

    expect(preview.status).toBe("blocked");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_ROLLBACK_VIRTUAL_APPLY_BLOCKED",
        "PATCH_ROLLBACK_VIRTUAL_APPLY_NOT_READY"
      ])
    );
    expect(preview.readiness.canProceedToReplayProjectionPreview).toBe(false);
  });

  it("blocks unsafe paths, secret paths, generated dirs, and query-like paths", () => {
    const unsafePaths = [
      "/abs/file.ts",
      "C:/repo/file.ts",
      "//server/share/file.ts",
      "../escape.ts",
      ".git/config",
      ".env.local",
      "node_modules/pkg/index.js",
      "runtime/dist/index.js",
      "app/src-tauri/target/debug/app.exe",
      ".tmp/out.txt",
      "src/file.ts?token=secret",
      "src/file.ts;rm"
    ];

    for (const unsafePath of unsafePaths) {
      const preview = buildPatchRollbackCheckpointPreview({
        virtualApplyId: `virtual-${unsafePath.length}`,
        proposalId: `proposal-${unsafePath.length}`,
        validationId: `validation-${unsafePath.length}`,
        auditId: `audit-${unsafePath.length}`,
        approvalDraftId: `approval-${unsafePath.length}`,
        inputSnapshot: { snapshotHash: "inputhash" },
        outputSnapshot: { snapshotHash: "outputhash" },
        operations: [{ path: unsafePath, changeKind: "update" }],
        workspaceIndexRef: "workspace-index-1",
        contextSummaryRef: "context-summary-1",
        agentRouteRef: "agent-route-1",
        capabilityPlanRef: "capability-plan-1"
      });

      expect(preview.status).toBe("blocked");
      expect(
        preview.findings.some((finding) => finding.code.includes("REJECTED"))
      ).toBe(true);
    }
  });

  it("blocks raw fields and unsafe markers without retaining raw values", () => {
    const secret = "sk-test1234567890abcdef";
    const unsafeInput = {
      ...safeRollbackInput(),
      checkpointFilePath: "D:/workspace/checkpoint.json",
      beforeContent: "do not keep",
      rawPrompt: `rawPrompt rawDom rawCsv ${secret}`
    } as unknown as PatchRollbackCheckpointPreviewInput &
      Record<string, unknown>;
    const validation = validatePatchRollbackCheckpointInput(unsafeInput);
    const preview = buildPatchRollbackCheckpointPreview(unsafeInput);
    const serialized = JSON.stringify(preview);

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_ROLLBACK_RAW_FIELD_REJECTED",
        "API_KEY_MARKER",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER"
      ])
    );
    expect(preview.status).toBe("blocked");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
    expect(serialized).not.toContain("rawPrompt rawDom rawCsv");
    expect(serialized).not.toContain("D:/workspace/checkpoint.json");
  });

  it("blocks attempts to rollback, write, apply, git, shell, or issue checkpoint files", () => {
    const preview = buildPatchRollbackCheckpointPreview({
      ...safeRollbackInput(),
      canRollbackReal: true,
      rollbackExecuted: true,
      canWriteFilesystem: true,
      canApplyPatch: true,
      canExecuteGit: true,
      canExecuteShell: true,
      checkpointFileWriteEnabled: true,
      action: "rollback apply"
    } as unknown as PatchRollbackCheckpointPreviewInput &
      Record<string, unknown>);

    expect(preview.status).toBe("blocked");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_ROLLBACK_EXECUTION_ATTEMPT_REJECTED",
        "PATCH_ROLLBACK_EXECUTION_ACTION_REJECTED"
      ])
    );
    expect(preview.readiness.canRollbackReal).toBe(false);
    expect(preview.readiness.rollbackExecuted).toBe(false);
    expect(preview.readiness.canWriteFilesystem).toBe(false);
    expect(preview.readiness.canApplyPatch).toBe(false);
  });

  it("warns for delete, config, source, many files, and unchanged output snapshot", () => {
    const preview = buildPatchRollbackCheckpointPreview({
      virtualApplyId: "virtual-risk",
      proposalId: "proposal-risk",
      validationId: "validation-risk",
      auditId: "audit-risk",
      approvalDraftId: "approval-risk",
      intent: "code_change",
      riskLevel: "A3_scoped_write",
      derivedRiskLevel: "A3_scoped_write",
      requiresApproval: true,
      inputSnapshot: { snapshotHash: "samehash", fileCount: 6 },
      outputSnapshot: { snapshotHash: "samehash", fileCount: 6 },
      operations: [
        { path: "README.md", changeKind: "delete" },
        { path: "package.json", changeKind: "update" },
        { path: "runtime/src/index.ts", changeKind: "update" },
        { path: "docs/a.md", changeKind: "update" },
        { path: "docs/b.md", changeKind: "update" },
        { path: "docs/c.md", changeKind: "update" }
      ],
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });

    expect(preview.status).toBe("warning");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_ROLLBACK_MANY_FILES",
        "PATCH_ROLLBACK_DELETE_RESTORE_SCOPE",
        "PATCH_ROLLBACK_CONFIG_RESTORE_SCOPE",
        "PATCH_ROLLBACK_SOURCE_RESTORE_SCOPE",
        "PATCH_ROLLBACK_OUTPUT_SNAPSHOT_UNCHANGED"
      ])
    );
  });

  it("never emits raw source, raw diff, API keys, stdout, stderr, or real rollback", () => {
    const preview = buildPatchRollbackCheckpointPreview(safeRollbackInput());
    const serialized = JSON.stringify(preview);

    expect(preview.readiness.canRollbackReal).toBe(false);
    expect(preview.readiness.rollbackExecuted).toBe(false);
    expect(preview.checkpointFileWriteEnabled).toBe(false);
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPatch");
    expect(serialized).not.toContain("stdout");
    expect(serialized).not.toContain("stderr");
    expect(serialized).not.toContain("sk-test");
  });
});
