import { describe, expect, it } from "vitest";

import {
  buildPatchDiffAuditPreview,
  buildPatchProposalValidationPreview,
  summarizePatchDiffAuditPreview,
  validatePatchDiffAuditPreviewInput,
  type PatchDiffAuditPreviewInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function safeProposalSummary(): PatchDiffAuditPreviewInput["proposalPreview"] {
  return {
    proposalId: "patch-preview-safe",
    intent: "documentation",
    title: "Update summary refs",
    fileCount: 1,
    filesCreated: 0,
    filesUpdated: 1,
    filesDeleted: 0,
    linesAdded: 12,
    linesRemoved: 2,
    riskLevel: "A2_draft_write",
    requiresApproval: false,
    pathSummaries: ["update:examples/summary.txt"],
    proposalHash: "proposalhashsafe"
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

function safeAuditInput(): PatchDiffAuditPreviewInput {
  return {
    proposalPreview: safeProposalSummary(),
    validationPreview: safeValidationPreview(),
    workspaceIndexRef: "workspace-index-1",
    contextSummaryRef: "context-summary-1",
    agentRouteRef: "agent-route-1",
    capabilityPlanRef: "capability-plan-1",
    createdAt
  };
}

describe("patch diff audit preview helper", () => {
  it("audits a safe summary-only proposal without generating raw diff or enabling apply", () => {
    const preview = buildPatchDiffAuditPreview(safeAuditInput());
    const serialized = JSON.stringify(preview);

    expect(preview.source).toBe("runtime_patch_diff_audit_preview");
    expect(preview.status).toBe("audit_ready");
    expect(preview.previewOnly).toBe(true);
    expect(preview.diffGenerated).toBe(false);
    expect(preview.applyEnabled).toBe(false);
    expect(preview.virtualApplyEnabled).toBe(false);
    expect(preview.fileReadEnabled).toBe(false);
    expect(preview.fileWriteEnabled).toBe(false);
    expect(preview.eventWritesEnabled).toBe(false);
    expect(preview.readiness.canProceedToApprovalDraftPreview).toBe(true);
    expect(preview.readiness.canProceedToVirtualApplyPreview).toBe(false);
    expect(preview.readiness.canApplyPatch).toBe(false);
    expect(preview.noCompressRequired).toBe(true);
    expect(preview.contextPlacement).toBe("no_compress_zone");
    expect(preview.pathCategorySummary.unknown).toBe(1);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toContain("function App");
  });

  it("produces deterministic audit ids and hashes", () => {
    const first = buildPatchDiffAuditPreview({
      ...safeAuditInput(),
      idGenerator: () => "patch-diff-audit-fixed"
    });
    const second = buildPatchDiffAuditPreview({
      ...safeAuditInput(),
      idGenerator: () => "patch-diff-audit-fixed"
    });

    expect(first.auditId).toBe("patch-diff-audit-fixed");
    expect(first).toEqual(second);
    expect(summarizePatchDiffAuditPreview(first)).toEqual(
      summarizePatchDiffAuditPreview(second)
    );
  });

  it("blocks audit preview when validation has blockers", () => {
    const blockedValidation = buildPatchProposalValidationPreview({
      proposalId: "patch-preview-blocked",
      intent: "code_change",
      pathSummaries: ["update:.env.local"],
      fileCount: 1,
      riskLevel: "A2_draft_write",
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });
    const preview = buildPatchDiffAuditPreview({
      proposalPreview: {
        proposalId: "patch-preview-blocked",
        intent: "code_change",
        pathSummaries: ["update:.env.local"],
        fileCount: 1,
        riskLevel: "A2_draft_write",
        proposalHash: "hash"
      },
      validationPreview: blockedValidation
    });

    expect(blockedValidation.status).toBe("blocked");
    expect(preview.status).toBe("blocked");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_DIFF_AUDIT_VALIDATION_BLOCKED",
        "PATCH_DIFF_AUDIT_VALIDATION_NOT_READY"
      ])
    );
    expect(preview.readiness.canProceedToApprovalDraftPreview).toBe(false);
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
      const preview = buildPatchDiffAuditPreview({
        proposalId: `proposal-${unsafePath.length}`,
        validationId: `validation-${unsafePath.length}`,
        intent: "code_change",
        pathSummaries: [`update:${unsafePath}`],
        fileCount: 1,
        riskLevel: "A2_draft_write",
        derivedRiskLevel: "A2_draft_write",
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
      proposalId: "proposal-unsafe",
      validationId: "validation-unsafe",
      intent: "code_change",
      pathSummaries: ["update:app/src/App.tsx"],
      beforeContent: "do not keep",
      rawPrompt: `rawPrompt rawDom rawCsv ${secret}`
    } as unknown as PatchDiffAuditPreviewInput & Record<string, unknown>;
    const validation = validatePatchDiffAuditPreviewInput(unsafeInput);
    const preview = buildPatchDiffAuditPreview(unsafeInput);
    const serialized = JSON.stringify(preview);

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_DIFF_AUDIT_RAW_FIELD_REJECTED",
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

  it("warns for source updates without test paths", () => {
    const validationPreview = buildPatchProposalValidationPreview({
      proposalId: "proposal-source",
      intent: "code_change",
      pathSummaries: ["update:runtime/src/index.ts"],
      fileCount: 1,
      linesAdded: 10,
      linesRemoved: 2,
      riskLevel: "A3_scoped_write",
      requiresApproval: true,
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });
    const preview = buildPatchDiffAuditPreview({
      proposalPreview: {
        proposalId: "proposal-source",
        intent: "code_change",
        pathSummaries: ["update:runtime/src/index.ts"],
        fileCount: 1,
        linesAdded: 10,
        linesRemoved: 2,
        riskLevel: "A3_scoped_write",
        requiresApproval: true,
        proposalHash: "hash"
      },
      validationPreview,
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });

    expect(preview.status).toBe("needs_approval");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_DIFF_AUDIT_SOURCE_REQUIRES_APPROVAL",
        "PATCH_DIFF_AUDIT_TEST_PATH_MISSING",
        "PATCH_DIFF_AUDIT_APPROVAL_REF_MISSING"
      ])
    );
    expect(preview.pathCategorySummary.source).toBe(1);
  });

  it("flags delete, config, build, and missing approval refs as approval risk", () => {
    const validationPreview = buildPatchProposalValidationPreview({
      proposalId: "proposal-risky",
      intent: "code_change",
      pathSummaries: [
        "delete:README.md",
        "update:package.json",
        "test:runtime/test/index.test.ts"
      ],
      fileCount: 3,
      filesDeleted: 1,
      linesAdded: 10,
      linesRemoved: 20,
      riskLevel: "A3_scoped_write",
      requiresApproval: true,
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });
    const preview = buildPatchDiffAuditPreview({
      proposalPreview: {
        proposalId: "proposal-risky",
        intent: "code_change",
        pathSummaries: [
          "delete:README.md",
          "update:package.json",
          "test:runtime/test/index.test.ts"
        ],
        fileCount: 3,
        filesDeleted: 1,
        linesAdded: 10,
        linesRemoved: 20,
        riskLevel: "A3_scoped_write",
        requiresApproval: true,
        proposalHash: "hash"
      },
      validationPreview,
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });

    expect(preview.status).toBe("needs_approval");
    expect(preview.derivedRiskLevel).toBe("A3_scoped_write");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_DIFF_AUDIT_DELETE_REQUIRES_APPROVAL",
        "PATCH_DIFF_AUDIT_CONFIG_REQUIRES_APPROVAL",
        "PATCH_DIFF_AUDIT_APPROVAL_REF_MISSING"
      ])
    );
    expect(preview.pathCategorySummary.deletes).toBe(1);
    expect(preview.pathCategorySummary.config).toBe(1);
  });

  it("warns for missing refs, large line deltas, many files, and unknown intent", () => {
    const preview = buildPatchDiffAuditPreview({
      proposalId: "proposal-warnings",
      validationId: "validation-warnings",
      intent: "unknown",
      pathSummaries: [
        "update:examples/a.txt",
        "update:examples/b.txt",
        "update:examples/c.txt",
        "update:examples/d.txt",
        "update:examples/e.txt",
        "update:examples/f.txt"
      ],
      fileCount: 6,
      linesAdded: 500,
      linesRemoved: 0,
      riskLevel: "A2_draft_write",
      derivedRiskLevel: "A2_draft_write"
    });

    expect(preview.status).toBe("blocked");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_DIFF_AUDIT_MANY_FILES",
        "PATCH_DIFF_AUDIT_LARGE_LINE_DELTA",
        "PATCH_DIFF_AUDIT_WORKSPACE_INDEX_MISSING",
        "PATCH_DIFF_AUDIT_CONTEXT_SUMMARY_MISSING",
        "PATCH_DIFF_AUDIT_CAPABILITY_PLAN_MISSING",
        "PATCH_DIFF_AUDIT_AGENT_ROUTE_MISSING",
        "PATCH_DIFF_AUDIT_UNKNOWN_INTENT",
        "PATCH_DIFF_AUDIT_VALIDATION_NOT_READY"
      ])
    );
  });

  it("keeps approval readiness true only when no blockers exist", () => {
    const ready = buildPatchDiffAuditPreview(safeAuditInput());
    const blocked = buildPatchDiffAuditPreview({
      ...safeAuditInput(),
      pathSummaries: ["update:.env.local"]
    });

    expect(ready.readiness.canProceedToApprovalDraftPreview).toBe(true);
    expect(blocked.status).toBe("blocked");
    expect(blocked.readiness.canProceedToApprovalDraftPreview).toBe(false);
  });

  it("blocks attempts to mark patch or virtual apply as available", () => {
    const preview = buildPatchDiffAuditPreview({
      ...safeAuditInput(),
      canApplyPatch: true,
      applyEnabled: true,
      virtualApplyEnabled: true,
      readiness: {
        canProceedToVirtualApplyPreview: true
      }
    } as unknown as PatchDiffAuditPreviewInput & Record<string, unknown>);

    expect(preview.status).toBe("blocked");
    expect(preview.findings.map((finding) => finding.code)).toContain(
      "PATCH_DIFF_AUDIT_APPLY_ATTEMPT_REJECTED"
    );
    expect(preview.applyEnabled).toBe(false);
    expect(preview.virtualApplyEnabled).toBe(false);
    expect(preview.readiness.canApplyPatch).toBe(false);
    expect(preview.readiness.canProceedToVirtualApplyPreview).toBe(false);
  });

  it("never emits raw source, raw diff, API keys, stdout, or stderr", () => {
    const preview = buildPatchDiffAuditPreview(safeAuditInput());
    const serialized = JSON.stringify(preview);

    expect(preview.diffGenerated).toBe(false);
    expect(preview.readiness.canApplyPatch).toBe(false);
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPatch");
    expect(serialized).not.toContain("stdout");
    expect(serialized).not.toContain("stderr");
    expect(serialized).not.toContain("sk-test");
  });
});
