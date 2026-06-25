import { describe, expect, it } from "vitest";

import {
  buildPatchApprovalDraft,
  buildPatchDiffAuditPreview,
  buildPatchProposalValidationPreview,
  summarizePatchApprovalDraft,
  validatePatchApprovalDraftInput,
  type PatchApprovalDraftInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function safeProposalSummary(): PatchApprovalDraftInput["proposalPreview"] {
  return {
    proposalId: "patch-approval-safe",
    intent: "documentation",
    title: "Update approval summary docs",
    fileCount: 1,
    filesCreated: 0,
    filesUpdated: 1,
    filesDeleted: 0,
    linesAdded: 8,
    linesRemoved: 1,
    riskLevel: "A2_draft_write",
    requiresApproval: false,
    pathSummaries: ["documentation:docs/approval-summary.md"],
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

function safeAuditPreview() {
  return buildPatchDiffAuditPreview({
    proposalPreview: safeProposalSummary(),
    validationPreview: safeValidationPreview(),
    workspaceIndexRef: "workspace-index-1",
    contextSummaryRef: "context-summary-1",
    agentRouteRef: "agent-route-1",
    capabilityPlanRef: "capability-plan-1",
    createdAt
  });
}

function safeApprovalInput(): PatchApprovalDraftInput {
  return {
    proposalPreview: safeProposalSummary(),
    validationPreview: safeValidationPreview(),
    diffAuditPreview: safeAuditPreview(),
    workspaceIndexRef: "workspace-index-1",
    contextSummaryRef: "context-summary-1",
    agentRouteRef: "agent-route-1",
    capabilityPlanRef: "capability-plan-1",
    createdAt
  };
}

describe("patch approval draft helper", () => {
  it("creates a draft-ready approval gate from safe summary previews", () => {
    const draft = buildPatchApprovalDraft(safeApprovalInput());
    const serialized = JSON.stringify(draft);

    expect(draft.source).toBe("runtime_patch_approval_draft");
    expect(draft.status).toBe("draft_ready");
    expect(draft.draftOnly).toBe(true);
    expect(draft.readiness.canProceedToApprovalReviewPreview).toBe(true);
    expect(draft.readiness.canApprove).toBe(false);
    expect(draft.readiness.canReject).toBe(false);
    expect(draft.readiness.canIssueLease).toBe(false);
    expect(draft.readiness.canProceedToVirtualApplyPreview).toBe(false);
    expect(draft.readiness.canApplyPatch).toBe(false);
    expect(draft.approvalExecutionEnabled).toBe(false);
    expect(draft.rejectionExecutionEnabled).toBe(false);
    expect(draft.permissionLeaseIssuingEnabled).toBe(false);
    expect(draft.applyEnabled).toBe(false);
    expect(draft.virtualApplyEnabled).toBe(false);
    expect(draft.fileReadEnabled).toBe(false);
    expect(draft.fileWriteEnabled).toBe(false);
    expect(draft.eventWritesEnabled).toBe(false);
    expect(draft.contextPlacement).toBe("no_compress_zone");
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toContain("function App");
  });

  it("produces deterministic approval draft ids and hashes", () => {
    const first = buildPatchApprovalDraft({
      ...safeApprovalInput(),
      idGenerator: () => "patch-approval-fixed"
    });
    const second = buildPatchApprovalDraft({
      ...safeApprovalInput(),
      idGenerator: () => "patch-approval-fixed"
    });

    expect(first.approvalDraftId).toBe("patch-approval-fixed");
    expect(first).toEqual(second);
    expect(summarizePatchApprovalDraft(first)).toEqual(
      summarizePatchApprovalDraft(second)
    );
  });

  it("blocks approval draft readiness when validation has blockers", () => {
    const validation = buildPatchProposalValidationPreview({
      proposalId: "patch-approval-validation-blocked",
      intent: "code_change",
      pathSummaries: ["update:.env.local"],
      fileCount: 1,
      riskLevel: "A2_draft_write",
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });
    const audit = buildPatchDiffAuditPreview({
      proposalPreview: {
        proposalId: "patch-approval-validation-blocked",
        intent: "code_change",
        pathSummaries: ["update:.env.local"],
        fileCount: 1,
        riskLevel: "A2_draft_write",
        proposalHash: "hash"
      },
      validationPreview: validation
    });
    const draft = buildPatchApprovalDraft({
      proposalPreview: {
        proposalId: "patch-approval-validation-blocked",
        pathSummaries: ["update:.env.local"]
      },
      validationPreview: validation,
      diffAuditPreview: audit
    });

    expect(validation.status).toBe("blocked");
    expect(draft.status).toBe("blocked");
    expect(draft.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_APPROVAL_VALIDATION_BLOCKED",
        "PATCH_APPROVAL_AUDIT_BLOCKED"
      ])
    );
    expect(draft.readiness.canProceedToApprovalReviewPreview).toBe(false);
  });

  it("blocks approval draft readiness when audit has blockers", () => {
    const draft = buildPatchApprovalDraft({
      ...safeApprovalInput(),
      diffAuditPreview: {
        ...safeAuditPreview(),
        status: "blocked",
        readiness: {
          canProceedToApprovalDraftPreview: false,
          canProceedToVirtualApplyPreview: false,
          canApplyPatch: false
        }
      }
    });

    expect(draft.status).toBe("blocked");
    expect(draft.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_APPROVAL_AUDIT_BLOCKED",
        "PATCH_APPROVAL_AUDIT_NOT_READY"
      ])
    );
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
      const draft = buildPatchApprovalDraft({
        proposalId: `proposal-${unsafePath.length}`,
        validationId: `validation-${unsafePath.length}`,
        auditId: `audit-${unsafePath.length}`,
        intent: "code_change",
        pathSummaries: [`update:${unsafePath}`],
        fileCount: 1,
        riskLevel: "A2_draft_write",
        derivedRiskLevel: "A2_draft_write",
        workspaceIndexRef: "workspace-index-1",
        contextSummaryRef: "context-summary-1",
        agentRouteRef: "agent-route-1",
        capabilityPlanRef: "capability-plan-1",
        diffAuditPreview: {
          auditId: `audit-${unsafePath.length}`,
          proposalId: `proposal-${unsafePath.length}`,
          validationId: `validation-${unsafePath.length}`,
          status: "audit_ready",
          readiness: {
            canProceedToApprovalDraftPreview: true
          }
        }
      });

      expect(draft.status).toBe("blocked");
      expect(
        draft.findings.some((finding) => finding.code.includes("REJECTED"))
      ).toBe(true);
    }
  });

  it("blocks raw fields and unsafe markers without retaining raw values", () => {
    const secret = "sk-test1234567890abcdef";
    const unsafeInput = {
      proposalId: "proposal-unsafe",
      validationId: "validation-unsafe",
      auditId: "audit-unsafe",
      intent: "code_change",
      pathSummaries: ["update:app/src/App.tsx"],
      beforeContent: "do not keep",
      rawPrompt: `rawPrompt rawDom rawCsv ${secret}`,
      diffAuditPreview: {
        status: "audit_ready",
        readiness: {
          canProceedToApprovalDraftPreview: true
        }
      }
    } as unknown as PatchApprovalDraftInput & Record<string, unknown>;
    const validation = validatePatchApprovalDraftInput(unsafeInput);
    const draft = buildPatchApprovalDraft(unsafeInput);
    const serialized = JSON.stringify(draft);

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_APPROVAL_RAW_FIELD_REJECTED",
        "API_KEY_MARKER",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER"
      ])
    );
    expect(draft.status).toBe("blocked");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
    expect(serialized).not.toContain("rawPrompt rawDom rawCsv");
  });

  it("blocks approve, reject, lease, apply, and execute markers", () => {
    const draft = buildPatchApprovalDraft({
      ...safeApprovalInput(),
      approved: true,
      canReject: true,
      permissionLeaseId: "lease-123",
      canApplyPatch: true,
      action: "execute apply"
    } as unknown as PatchApprovalDraftInput & Record<string, unknown>);

    expect(draft.status).toBe("blocked");
    expect(draft.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_APPROVAL_EXECUTION_ATTEMPT_REJECTED",
        "PATCH_APPROVAL_EXECUTION_ACTION_REJECTED"
      ])
    );
    expect(draft.readiness.canApprove).toBe(false);
    expect(draft.readiness.canReject).toBe(false);
    expect(draft.readiness.canIssueLease).toBe(false);
    expect(draft.readiness.canApplyPatch).toBe(false);
  });

  it("requires manual review for source updates and delete/config/build paths", () => {
    const validation = buildPatchProposalValidationPreview({
      proposalId: "patch-approval-risky",
      intent: "code_change",
      pathSummaries: [
        "update:runtime/src/index.ts",
        "delete:README.md",
        "update:package.json",
        "test:runtime/test/index.test.ts"
      ],
      fileCount: 4,
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
    const audit = buildPatchDiffAuditPreview({
      proposalPreview: {
        proposalId: "patch-approval-risky",
        intent: "code_change",
        pathSummaries: [
          "update:runtime/src/index.ts",
          "delete:README.md",
          "update:package.json",
          "test:runtime/test/index.test.ts"
        ],
        fileCount: 4,
        filesDeleted: 1,
        linesAdded: 10,
        linesRemoved: 20,
        riskLevel: "A3_scoped_write",
        requiresApproval: true,
        proposalHash: "hash"
      },
      validationPreview: validation,
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });
    const draft = buildPatchApprovalDraft({
      proposalPreview: {
        proposalId: "patch-approval-risky",
        intent: "code_change",
        pathSummaries: [
          "update:runtime/src/index.ts",
          "delete:README.md",
          "update:package.json",
          "test:runtime/test/index.test.ts"
        ],
        riskLevel: "A3_scoped_write",
        requiresApproval: true
      },
      validationPreview: validation,
      diffAuditPreview: audit,
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });

    expect(draft.status).toBe("needs_manual_review");
    expect(draft.derivedRiskLevel).toBe("A3_scoped_write");
    expect(draft.requiredApprovalReasons).toEqual(
      expect.arrayContaining([
        "PATCH_APPROVAL_SOURCE_REQUIRES_APPROVAL",
        "PATCH_APPROVAL_DELETE_REQUIRES_APPROVAL",
        "PATCH_APPROVAL_CONFIG_REQUIRES_APPROVAL"
      ])
    );
  });

  it("keeps decision options disabled and readiness execution flags false", () => {
    const draft = buildPatchApprovalDraft(safeApprovalInput());

    expect(draft.decisionOptions).toHaveLength(4);
    expect(
      draft.decisionOptions.every((option) => option.enabled === false)
    ).toBe(true);
    expect(draft.decisionOptions.map((option) => option.optionId)).toEqual([
      "approve_later_requires_user_action",
      "request_changes_later_requires_user_action",
      "reject_later_requires_user_action",
      "defer_later_requires_user_action"
    ]);
    expect(draft.readiness.canApprove).toBe(false);
    expect(draft.readiness.canReject).toBe(false);
    expect(draft.readiness.canIssueLease).toBe(false);
    expect(draft.readiness.canProceedToVirtualApplyPreview).toBe(false);
    expect(draft.readiness.canApplyPatch).toBe(false);
  });

  it("never emits raw source, raw diff, API keys, stdout, stderr, or lease ids", () => {
    const draft = buildPatchApprovalDraft(safeApprovalInput());
    const serialized = JSON.stringify(draft);

    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPatch");
    expect(serialized).not.toContain("stdout");
    expect(serialized).not.toContain("stderr");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("permissionLeaseId");
  });
});
