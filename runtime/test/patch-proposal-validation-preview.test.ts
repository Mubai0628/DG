import { describe, expect, it } from "vitest";

import {
  buildPatchProposalValidationPreview,
  summarizePatchProposalValidationPreview,
  validatePatchProposalValidationInput,
  type PatchProposalValidationPreviewInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function safeValidationInput(): PatchProposalValidationPreviewInput {
  return {
    proposalId: "patch-preview-safe",
    intent: "documentation",
    title: "Update docs preview summary",
    fileCount: 2,
    linesAdded: 14,
    linesRemoved: 1,
    riskLevel: "A2_draft_write",
    requiresApproval: false,
    pathSummaries: [
      "documentation:docs/preview.md",
      "test:runtime/test/preview.test.ts"
    ],
    proposalHash: "proposalhashsafe",
    workspaceIndexRef: "workspace-index-1",
    contextSummaryRef: "context-summary-1",
    agentRouteRef: "agent-route-1",
    capabilityPlanRef: "capability-plan-1",
    createdAt
  };
}

describe("patch proposal validation preview helper", () => {
  it("validates a safe summary-only proposal without enabling apply", () => {
    const preview = buildPatchProposalValidationPreview(safeValidationInput());
    const serialized = JSON.stringify(preview);

    expect(preview.source).toBe("runtime_patch_validation_preview");
    expect(preview.status).toBe("valid");
    expect(preview.validationOnly).toBe(true);
    expect(preview.applyEnabled).toBe(false);
    expect(preview.virtualApplyEnabled).toBe(false);
    expect(preview.fileReadEnabled).toBe(false);
    expect(preview.fileWriteEnabled).toBe(false);
    expect(preview.eventWritesEnabled).toBe(false);
    expect(preview.readiness.canProceedToDiffAuditPreview).toBe(true);
    expect(preview.readiness.canProceedToVirtualApplyPreview).toBe(false);
    expect(preview.readiness.canApplyPatch).toBe(false);
    expect(preview.noCompressRequired).toBe(true);
    expect(preview.contextPlacement).toBe("no_compress_zone");
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toContain("function App");
  });

  it("produces deterministic validation ids and hashes", () => {
    const first = buildPatchProposalValidationPreview({
      ...safeValidationInput(),
      idGenerator: () => "patch-validation-fixed"
    });
    const second = buildPatchProposalValidationPreview({
      ...safeValidationInput(),
      idGenerator: () => "patch-validation-fixed"
    });

    expect(first.validationId).toBe("patch-validation-fixed");
    expect(first).toEqual(second);
    expect(summarizePatchProposalValidationPreview(first)).toEqual(
      summarizePatchProposalValidationPreview(second)
    );
  });

  it("blocks missing proposal id and path summaries when a malformed summary is supplied", () => {
    const preview = buildPatchProposalValidationPreview({
      title: "Malformed proposal",
      intent: "code_change"
    });

    expect(preview.status).toBe("blocked");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_VALIDATION_MISSING_PROPOSAL_ID",
        "PATCH_VALIDATION_MISSING_PATH_SUMMARIES"
      ])
    );
    expect(preview.readiness.canProceedToDiffAuditPreview).toBe(false);
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
      const preview = buildPatchProposalValidationPreview({
        proposalId: `proposal-${unsafePath.length}`,
        intent: "code_change",
        pathSummaries: [`update:${unsafePath}`],
        fileCount: 1,
        riskLevel: "A2_draft_write",
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
      intent: "code_change",
      pathSummaries: ["update:app/src/App.tsx"],
      beforeContent: "do not keep",
      rawPrompt: `rawPrompt rawDom rawCsv ${secret}`
    } as unknown as PatchProposalValidationPreviewInput &
      Record<string, unknown>;
    const validation = validatePatchProposalValidationInput(unsafeInput);
    const preview = buildPatchProposalValidationPreview(unsafeInput);
    const serialized = JSON.stringify(preview);

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_VALIDATION_RAW_FIELD_REJECTED",
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

  it("requires approval for source, config, and delete summaries", () => {
    const preview = buildPatchProposalValidationPreview({
      proposalId: "proposal-risky",
      intent: "code_change",
      pathSummaries: [
        "update:runtime/src/index.ts",
        "update:package.json",
        "delete:README.md",
        "test:runtime/test/index.test.ts"
      ],
      fileCount: 4,
      filesDeleted: 1,
      linesAdded: 4,
      linesRemoved: 20,
      riskLevel: "A1_read",
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });

    expect(preview.status).toBe("needs_approval");
    expect(preview.requiresApproval).toBe(true);
    expect(preview.derivedRiskLevel).toBe("A3_scoped_write");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_VALIDATION_SOURCE_REQUIRES_APPROVAL",
        "PATCH_VALIDATION_CONFIG_REQUIRES_APPROVAL",
        "PATCH_VALIDATION_DELETE_REQUIRES_APPROVAL",
        "PATCH_VALIDATION_PROTECTED_DELETE_REQUIRES_APPROVAL",
        "PATCH_VALIDATION_DECLARED_RISK_TOO_LOW"
      ])
    );
    expect(preview.readiness.canProceedToApprovalDraftPreview).toBe(true);
  });

  it("warns for missing refs, docs-only code changes, high line estimates, and unknown intent", () => {
    const preview = buildPatchProposalValidationPreview({
      proposalId: "proposal-warnings",
      intent: "unknown",
      pathSummaries: ["documentation:docs/only.md"],
      fileCount: 1,
      linesAdded: 500,
      riskLevel: "A2_draft_write"
    });

    expect(preview.status).toBe("warning");
    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_VALIDATION_WORKSPACE_INDEX_MISSING",
        "PATCH_VALIDATION_CONTEXT_SUMMARY_MISSING",
        "PATCH_VALIDATION_CAPABILITY_PLAN_MISSING",
        "PATCH_VALIDATION_AGENT_ROUTE_MISSING",
        "PATCH_VALIDATION_NO_COMPRESS_REF_MISSING",
        "PATCH_VALIDATION_HIGH_LINE_ESTIMATE",
        "PATCH_VALIDATION_UNKNOWN_INTENT"
      ])
    );
    expect(preview.readiness.canProceedToDiffAuditPreview).toBe(true);
  });

  it("warns when code_change lacks tests or only touches docs", () => {
    const preview = buildPatchProposalValidationPreview({
      proposalId: "proposal-docs-only-code-change",
      intent: "code_change",
      pathSummaries: ["documentation:docs/only.md"],
      fileCount: 1,
      riskLevel: "A2_draft_write",
      workspaceIndexRef: "workspace-index-1",
      contextSummaryRef: "context-summary-1",
      agentRouteRef: "agent-route-1",
      capabilityPlanRef: "capability-plan-1"
    });

    expect(preview.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PATCH_VALIDATION_TEST_PATH_MISSING",
        "PATCH_VALIDATION_DOCS_ONLY_CODE_CHANGE"
      ])
    );
  });

  it("always keeps patch application unavailable", () => {
    const preview = buildPatchProposalValidationPreview(safeValidationInput());
    const serialized = JSON.stringify(preview);

    expect(preview.readiness.canApplyPatch).toBe(false);
    expect(preview.applyEnabled).toBe(false);
    expect(preview.virtualApplyEnabled).toBe(false);
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPatch");
    expect(serialized).not.toContain("stdout");
    expect(serialized).not.toContain("stderr");
    expect(serialized).not.toContain("sk-test");
  });
});
