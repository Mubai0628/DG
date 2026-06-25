import { describe, expect, it } from "vitest";

import {
  buildPatchApprovalDraft,
  buildPatchDiffAuditPreview,
  buildPatchProposalValidationPreview,
  buildPatchVirtualApplyPreview,
  summarizePatchVirtualApplyPreview,
  validatePatchVirtualApplyPreviewInput,
  type PatchVirtualApplyPreviewInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function safeProposalSummary(): PatchVirtualApplyPreviewInput["proposalPreview"] {
  return {
    proposalId: "patch-virtual-safe",
    intent: "documentation",
    title: "Update virtual apply summary",
    fileCount: 1,
    filesCreated: 0,
    filesUpdated: 1,
    filesDeleted: 0,
    linesAdded: 8,
    linesRemoved: 1,
    riskLevel: "A2_draft_write",
    requiresApproval: false,
    pathSummaries: ["update:examples/summary.txt"],
    proposalHash: "proposalhashsafe",
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
    snapshotId: "snapshot-1",
    snapshotHash: "snapshothash1",
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

function safeVirtualInput(): PatchVirtualApplyPreviewInput {
  return {
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
  };
}

describe("patch virtual apply preview helper", () => {
  it("creates a preview-ready in-memory apply summary from safe summaries and snapshot", () => {
    const preview = buildPatchVirtualApplyPreview(safeVirtualInput());
    const serialized = JSON.stringify(preview);

    expect(preview.source).toBe("runtime_patch_virtual_apply_preview");
    expect(preview.status).toBe("preview_ready");
    expect(preview.previewOnly).toBe(true);
    expect(preview.inMemoryOnly).toBe(true);
    expect(preview.inputSnapshot.snapshotId).toBe("snapshot-1");
    expect(preview.outputSnapshot.snapshotId).toBe("snapshot-1-predicted");
    expect(preview.operations).toHaveLength(1);
    expect(preview.operations[0]?.existsBefore).toBe(true);
    expect(preview.operations[0]?.existsAfter).toBe(true);
    expect(preview.filesUpdated).toBe(1);
    expect(preview.readiness.canProceedToRollbackCheckpointPreview).toBe(true);
    expect(preview.readiness.canWriteFilesystem).toBe(false);
    expect(preview.readiness.canApplyPatch).toBe(false);
    expect(preview.readiness.canExecuteGit).toBe(false);
    expect(preview.readiness.canExecuteShell).toBe(false);
    expect(preview.rollbackPreview.canRollbackReal).toBe(false);
    expect(preview.rollbackPreview.rollbackExecuted).toBe(false);
    expect(preview.fileReadEnabled).toBe(false);
    expect(preview.fileWriteEnabled).toBe(false);
    expect(preview.eventWritesEnabled).toBe(false);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toContain("function App");
  });

  it("produces deterministic virtual apply ids and hashes", () => {
    const first = buildPatchVirtualApplyPreview({
      ...safeVirtualInput(),
      idGenerator: () => "patch-virtual-fixed"
    });
    const second = buildPatchVirtualApplyPreview({
      ...safeVirtualInput(),
      idGenerator: () => "patch-virtual-fixed"
    });

    expect(first.virtualApplyId).toBe("patch-virtual-fixed");
    expect(first).toEqual(second);
    expect(summarizePatchVirtualApplyPreview(first)).toEqual(
      summarizePatchVirtualApplyPreview(second)
    );
  });

  it("blocks when validation, audit, or approval draft is blocked", () => {
    const blockedValidation = buildPatchProposalValidationPreview({
      proposalId: "patch-virtual-blocked",
      intent: "code_change",
      pathSummaries: ["update:.env.local"],
      fileCount: 1,
      riskLevel: "A2_draft_write",
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });
    const blockedAudit = buildPatchDiffAuditPreview({
      proposalPreview: {
        proposalId: "patch-virtual-blocked",
        pathSummaries: ["update:.env.local"],
        proposalHash: "hash"
      },
      validationPreview: blockedValidation
    });
    const blockedApproval = buildPatchApprovalDraft({
      proposalPreview: {
        proposalId: "patch-virtual-blocked",
        pathSummaries: ["update:.env.local"]
      },
      validationPreview: blockedValidation,
      diffAuditPreview: blockedAudit
    });
    const preview = buildPatchVirtualApplyPreview({
      proposalPreview: {
        proposalId: "patch-virtual-blocked",
        pathSummaries: ["update:.env.local"]
      },
      validationPreview: blockedValidation,
      diffAuditPreview: blockedAudit,
      approvalDraft: blockedApproval,
      virtualWorkspaceSnapshot: safeSnapshot()
    });

    expect(preview.status).toBe("blocked");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_VIRTUAL_APPLY_VALIDATION_BLOCKED",
        "PATCH_VIRTUAL_APPLY_AUDIT_BLOCKED",
        "PATCH_VIRTUAL_APPLY_APPROVAL_BLOCKED"
      ])
    );
    expect(preview.readiness.canProceedToRollbackCheckpointPreview).toBe(false);
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
      const preview = buildPatchVirtualApplyPreview({
        proposalId: `proposal-${unsafePath.length}`,
        validationId: `validation-${unsafePath.length}`,
        auditId: `audit-${unsafePath.length}`,
        approvalDraftId: `approval-${unsafePath.length}`,
        intent: "code_change",
        pathSummaries: [`update:${unsafePath}`],
        proposedOperations: [{ path: unsafePath, changeKind: "update" }],
        virtualWorkspaceSnapshot: safeSnapshot(),
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
      ...safeVirtualInput(),
      beforeContent: "do not keep",
      rawPrompt: `rawPrompt rawDom rawCsv ${secret}`
    } as unknown as PatchVirtualApplyPreviewInput & Record<string, unknown>;
    const validation = validatePatchVirtualApplyPreviewInput(unsafeInput);
    const preview = buildPatchVirtualApplyPreview(unsafeInput);
    const serialized = JSON.stringify(preview);

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_VIRTUAL_APPLY_RAW_FIELD_REJECTED",
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
  });

  it("blocks create-existing and update/delete-missing snapshot conflicts", () => {
    const createExisting = buildPatchVirtualApplyPreview({
      ...safeVirtualInput(),
      proposedOperations: [
        {
          path: "examples/summary.txt",
          changeKind: "create",
          estimatedLinesAdded: 1
        }
      ]
    });
    const updateMissing = buildPatchVirtualApplyPreview({
      ...safeVirtualInput(),
      proposedOperations: [
        {
          path: "examples/missing.txt",
          changeKind: "update",
          estimatedLinesAdded: 1
        }
      ]
    });
    const deleteMissing = buildPatchVirtualApplyPreview({
      ...safeVirtualInput(),
      proposedOperations: [
        {
          path: "examples/missing.txt",
          changeKind: "delete",
          estimatedLinesRemoved: 1
        }
      ]
    });

    expect(createExisting.status).toBe("blocked");
    expect(createExisting.findings.map((finding) => finding.code)).toContain(
      "PATCH_VIRTUAL_APPLY_CREATE_TARGET_EXISTS"
    );
    expect(updateMissing.status).toBe("blocked");
    expect(deleteMissing.status).toBe("blocked");
    expect(updateMissing.findings.map((finding) => finding.code)).toContain(
      "PATCH_VIRTUAL_APPLY_TARGET_MISSING"
    );
  });

  it("warns for delete, config/build, and source changes without tests", () => {
    const preview = buildPatchVirtualApplyPreview({
      proposalId: "proposal-risky",
      validationId: "validation-risky",
      auditId: "audit-risky",
      approvalDraftId: "approval-risky",
      intent: "code_change",
      riskLevel: "A3_scoped_write",
      derivedRiskLevel: "A3_scoped_write",
      requiresApproval: true,
      pathSummaries: [
        "delete:README.md",
        "update:package.json",
        "update:runtime/src/index.ts"
      ],
      proposedOperations: [
        { path: "README.md", changeKind: "delete", estimatedLinesRemoved: 4 },
        { path: "package.json", changeKind: "update", estimatedLinesAdded: 2 },
        {
          path: "runtime/src/index.ts",
          changeKind: "update",
          estimatedLinesAdded: 2
        }
      ],
      virtualWorkspaceSnapshot: {
        snapshotId: "snapshot-risky",
        snapshotHash: "snaprisk",
        files: [
          { path: "README.md", exists: true, hashPrefix: "readme" },
          { path: "package.json", exists: true, hashPrefix: "pkg" },
          { path: "runtime/src/index.ts", exists: true, hashPrefix: "idx" }
        ]
      },
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });

    expect(preview.status).toBe("needs_approval");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_VIRTUAL_APPLY_DELETE_REQUIRES_APPROVAL",
        "PATCH_VIRTUAL_APPLY_CONFIG_REQUIRES_APPROVAL",
        "PATCH_VIRTUAL_APPLY_SOURCE_REQUIRES_APPROVAL",
        "PATCH_VIRTUAL_APPLY_SOURCE_WITHOUT_TEST_PATH"
      ])
    );
  });

  it("blocks attempts to write, apply, rollback, git, shell, or issue lease", () => {
    const preview = buildPatchVirtualApplyPreview({
      ...safeVirtualInput(),
      canWriteFilesystem: true,
      canApplyPatch: true,
      canExecuteGit: true,
      canExecuteShell: true,
      rollbackExecuted: true,
      permissionLeaseId: "lease-123",
      action: "rollback apply"
    } as unknown as PatchVirtualApplyPreviewInput & Record<string, unknown>);

    expect(preview.status).toBe("blocked");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_VIRTUAL_APPLY_EXECUTION_ATTEMPT_REJECTED",
        "PATCH_VIRTUAL_APPLY_EXECUTION_ACTION_REJECTED"
      ])
    );
    expect(preview.readiness.canWriteFilesystem).toBe(false);
    expect(preview.readiness.canApplyPatch).toBe(false);
    expect(preview.readiness.canExecuteGit).toBe(false);
    expect(preview.readiness.canExecuteShell).toBe(false);
  });

  it("never emits raw source, raw diff, API keys, stdout, stderr, or real rollback", () => {
    const preview = buildPatchVirtualApplyPreview(safeVirtualInput());
    const serialized = JSON.stringify(preview);

    expect(preview.rollbackPreview.canRollbackReal).toBe(false);
    expect(preview.rollbackPreview.rollbackExecuted).toBe(false);
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPatch");
    expect(serialized).not.toContain("stdout");
    expect(serialized).not.toContain("stderr");
    expect(serialized).not.toContain("sk-test");
  });
});
