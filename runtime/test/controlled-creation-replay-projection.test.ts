import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildControlledCreationReplayProjection,
  summarizeControlledCreationReplayProjection
} from "../src/control-plane/replay-projection-preview.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

function runDraftEventSummary(): Record<string, unknown> {
  return {
    eventCount: 1,
    typeCounts: {
      "control.run.draft_recorded": 1
    },
    timeline: [
      {
        id: "event-run-draft-1",
        type: "control.run.draft_recorded",
        summary: "Run draft recorded as a summary-only event."
      }
    ]
  };
}

function safeChain(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const proposalId = "patch-preview-1";
  const validationId = "patch-validation-1";
  const auditId = "patch-audit-1";
  const approvalDraftId = "patch-approval-1";
  const virtualApplyId = "patch-virtual-1";
  return {
    eventSummary: runDraftEventSummary(),
    patchProposalCreationPreview: {
      status: "preview",
      proposalId,
      title: "Update docs summary",
      proposalHash: "proposalhash001"
    },
    patchValidationPreview: {
      status: "valid",
      proposalId,
      validationId,
      validationHash: "validationhash001"
    },
    patchDiffAuditPreview: {
      status: "audit_ready",
      proposalId,
      validationId,
      auditId,
      auditHash: "audithash001"
    },
    patchApprovalDraft: {
      status: "approval_draft_ready",
      proposalId,
      validationId,
      auditId,
      approvalDraftId,
      approvalDraftHash: "approvalhash001"
    },
    patchVirtualApplyPreview: {
      status: "preview_ready",
      proposalId,
      validationId,
      auditId,
      approvalDraftId,
      virtualApplyId,
      virtualApplyHash: "virtualhash001",
      readiness: {
        canProceedToRollbackCheckpointPreview: true,
        canApplyPatch: false,
        canWriteFilesystem: false,
        canExecuteGit: false,
        canExecuteShell: false
      }
    },
    patchRollbackCheckpointPreview: {
      status: "checkpoint_preview_ready",
      proposalId,
      validationId,
      auditId,
      approvalDraftId,
      virtualApplyId,
      checkpointPreviewId: "patch-checkpoint-1",
      checkpointHash: "checkpointhash001",
      readiness: {
        canProceedToReplayProjectionPreview: true,
        canRollbackReal: false,
        rollbackExecuted: false,
        canWriteFilesystem: false,
        canApplyPatch: false,
        canExecuteGit: false,
        canExecuteShell: false
      }
    },
    contextAssemblyPreview: {
      status: "preview",
      totalSegments: 4
    },
    controlProjection: {
      status: "projected",
      eventCount: 1
    },
    ...overrides
  };
}

describe("controlled creation replay projection helper", () => {
  it("returns empty when no summary stages are provided", () => {
    const projection = buildControlledCreationReplayProjection();

    expect(projection.status).toBe("empty");
    expect(projection.stageCount).toBe(0);
    expect(projection.readiness.canReplayProjection).toBe(false);
    expect(projection.eventWritesEnabled).toBe(false);
    expect(projection.executionEnabled).toBe(false);
  });

  it("projects a complete safe chain as summary-only replay timeline", () => {
    const projection = buildControlledCreationReplayProjection(safeChain());

    expect(projection.status).toBe("projection_ready");
    expect(projection.stageCount).toBe(7);
    expect(projection.persistedEventCount).toBe(1);
    expect(projection.localPreviewStageCount).toBe(6);
    expect(projection.missingStageCount).toBe(0);
    expect(projection.stages.map((stage) => stage.kind)).toEqual([
      "run_draft_event_recorded",
      "patch_proposal_creation_previewed",
      "patch_proposal_validation_previewed",
      "patch_diff_audit_previewed",
      "patch_approval_draft_previewed",
      "patch_virtual_apply_previewed",
      "patch_rollback_checkpoint_previewed"
    ]);
    expect(projection.contextPlacement).toBe("no_compress_zone");
    expect(projection.readiness.canReplayProjection).toBe(true);
    expect(projection.readiness.canExecuteRun).toBe(false);
    expect(projection.readiness.canApplyPatch).toBe(false);
    expect(projection.readiness.canRollbackReal).toBe(false);
    expect(projection.readiness.canWriteFilesystem).toBe(false);
    expect(projection.readiness.canExecuteGit).toBe(false);
    expect(projection.readiness.canExecuteShell).toBe(false);
  });

  it("marks a partial chain with missing later stages", () => {
    const projection = buildControlledCreationReplayProjection({
      eventSummary: runDraftEventSummary(),
      patchProposalCreationPreview: {
        status: "preview",
        proposalId: "patch-preview-1"
      },
      contextAssemblyPreview: { status: "preview" },
      controlProjection: { status: "projected" }
    });

    expect(projection.status).toBe("partial");
    expect(projection.stageCount).toBe(2);
    expect(projection.missingStageCount).toBe(5);
    expect(projection.findings.map((finding) => finding.code)).toContain(
      "MISSING_LATER_STAGE_PATCH_PROPOSAL_VALIDATION_PREVIEWED"
    );
  });

  it("blocks stage ID mismatches", () => {
    const projection = buildControlledCreationReplayProjection(
      safeChain({
        patchValidationPreview: {
          status: "valid",
          proposalId: "different-proposal",
          validationId: "patch-validation-1"
        }
      })
    );

    expect(projection.status).toBe("blocked");
    expect(projection.blockerCount).toBeGreaterThan(0);
    expect(projection.findings.map((finding) => finding.code)).toContain(
      "PATCH_VALIDATION_PROPOSAL_ID_MISMATCH"
    );
  });

  it("blocks a later stage when a required earlier stage is missing", () => {
    const projection = buildControlledCreationReplayProjection({
      eventSummary: runDraftEventSummary(),
      patchValidationPreview: {
        status: "valid",
        proposalId: "patch-preview-1",
        validationId: "patch-validation-1"
      },
      contextAssemblyPreview: { status: "preview" },
      controlProjection: { status: "projected" }
    });

    expect(projection.status).toBe("blocked");
    expect(projection.findings.map((finding) => finding.code)).toContain(
      "MISSING_REQUIRED_STAGE_PATCH_PROPOSAL_CREATION_PREVIEWED"
    );
  });

  it("blocks raw fields and secret-like markers without retaining raw values", () => {
    const secret = "sk-test1234567890abcdef";
    const projection = buildControlledCreationReplayProjection(
      safeChain({
        patchProposalCreationPreview: {
          status: "preview",
          proposalId: "patch-preview-1",
          rawPrompt: `do not keep rawPrompt rawDom rawCsv ${secret}`
        }
      })
    );
    const serialized = JSON.stringify(projection);

    expect(projection.status).toBe("blocked");
    expect(projection.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "API_KEY_MARKER",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER",
        "FORBIDDEN_RAW_FIELD_RAWPROMPT"
      ])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
    expect(serialized).not.toContain("rawPrompt rawDom rawCsv");
  });

  it("blocks execution readiness flags", () => {
    const projection = buildControlledCreationReplayProjection(
      safeChain({
        patchVirtualApplyPreview: {
          status: "preview_ready",
          proposalId: "patch-preview-1",
          validationId: "patch-validation-1",
          auditId: "patch-audit-1",
          approvalDraftId: "patch-approval-1",
          virtualApplyId: "patch-virtual-1",
          readiness: {
            canApplyPatch: true,
            canWriteFilesystem: true,
            canExecuteGit: true,
            canExecuteShell: true
          }
        },
        patchRollbackCheckpointPreview: {
          status: "checkpoint_preview_ready",
          proposalId: "patch-preview-1",
          validationId: "patch-validation-1",
          auditId: "patch-audit-1",
          approvalDraftId: "patch-approval-1",
          virtualApplyId: "patch-virtual-1",
          checkpointPreviewId: "patch-checkpoint-1",
          readiness: {
            canRollbackReal: true,
            rollbackExecuted: true
          }
        }
      })
    );

    expect(projection.status).toBe("blocked");
    expect(projection.readiness.canApplyPatch).toBe(false);
    expect(projection.readiness.canRollbackReal).toBe(false);
    expect(projection.readiness.canWriteFilesystem).toBe(false);
    expect(projection.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "EXECUTION_FLAG_CANAPPLYPATCH",
        "EXECUTION_FLAG_CANROLLBACKREAL",
        "EXECUTION_FLAG_CANWRITEFILESYSTEM"
      ])
    );
  });

  it("is deterministic with injected id and stable hash chain", () => {
    const first = buildControlledCreationReplayProjection({
      ...safeChain(),
      idGenerator: () => "controlled-replay-fixed"
    });
    const second = buildControlledCreationReplayProjection({
      ...safeChain(),
      idGenerator: () => "controlled-replay-fixed"
    });

    expect(first.projectionId).toBe("controlled-replay-fixed");
    expect(second.projectionId).toBe("controlled-replay-fixed");
    expect(first.chainId).toBe(second.chainId);
    expect(first.projectionHash).toBe(second.projectionHash);
    expect(summarizeControlledCreationReplayProjection(first)).toMatchObject({
      projectionId: "controlled-replay-fixed",
      canApplyPatch: false,
      canRollbackReal: false,
      canWriteFilesystem: false
    });
  });

  it("does not import filesystem writers, EventStore, or execution APIs", async () => {
    const source = await readFile(
      path.join(
        repoRoot,
        "runtime",
        "src",
        "control-plane",
        "replay-projection-preview.ts"
      ),
      "utf8"
    );

    expect(source).not.toMatch(/EventStore|writeFile|readFile|safeInvoke/);
    expect(source).not.toMatch(/child_process|spawn\(|exec\(/);
    expect(source).not.toMatch(/fetch\(|XMLHttpRequest|localStorage/);
    expect(source).not.toMatch(/sessionStorage|createServer|listen\(/);
  });
});
