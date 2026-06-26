import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildSandboxApplyRollbackEventProjection,
  summarizeSandboxApplyRollbackEventProjection,
  validateSandboxApplyRollbackEventProjectionInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function safeApplyResult(overrides: Record<string, unknown> = {}) {
  return {
    status: "applied_to_disposable",
    applyId: "apply-1",
    disposableRootRef: "disposable-root-ref",
    proposalId: "proposal-1",
    validationId: "validation-1",
    auditId: "audit-1",
    approvalDraftId: "approval-1",
    virtualApplyId: "virtual-1",
    checkpointPreviewId: "checkpoint-preview-1",
    operationCount: 2,
    filesCreated: 1,
    filesUpdated: 1,
    filesDeleted: 0,
    bytesWritten: 42,
    bytesDeletedEstimate: 0,
    blockerCount: 0,
    warningCount: 0,
    inputSnapshotHash: "input-snapshot-hash",
    outputSnapshotHash: "output-snapshot-hash",
    resultHash: "apply-result-hash",
    warningCodes: [],
    eventPreview: {
      type: "sandbox.patch_apply.preview_result",
      applyId: "apply-1",
      disposableRootRef: "disposable-root-ref",
      operationCount: 2,
      filesCreated: 1,
      filesUpdated: 1,
      filesDeleted: 0,
      bytesWritten: 42,
      inputSnapshotHash: "input-snapshot-hash",
      outputSnapshotHash: "output-snapshot-hash",
      resultHash: "apply-result-hash",
      warningCodes: [],
      notWritten: true
    },
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
    operationCount: 2,
    filesRestored: 1,
    filesRemoved: 1,
    filesRecreated: 0,
    bytesRestored: 24,
    bytesRemovedEstimate: 18,
    blockerCount: 0,
    warningCount: 0,
    inputSnapshotHash: "output-snapshot-hash",
    restoredSnapshotHash: "restored-snapshot-hash",
    resultHash: "rollback-result-hash",
    warningCodes: [],
    eventPreview: {
      type: "sandbox.patch_rollback.preview_result",
      rollbackId: "rollback-1",
      applyId: "apply-1",
      checkpointId: "checkpoint-1",
      disposableRootRef: "disposable-root-ref",
      operationCount: 2,
      filesRestored: 1,
      filesRemoved: 1,
      filesRecreated: 0,
      bytesRestored: 24,
      restoredSnapshotHash: "restored-snapshot-hash",
      resultHash: "rollback-result-hash",
      warningCodes: [],
      notWritten: true
    },
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

function safeSnapshotContract() {
  return {
    status: "contract_ready",
    contractId: "snapshot-contract-1",
    disposableRootRef: "disposable-root-ref",
    sourceWorkspaceFingerprint: "source-workspace-fingerprint",
    contractHash: "snapshot-contract-hash",
    readiness: {
      canReadFilesystem: false,
      canWriteFilesystem: false,
      canApplyPatch: false,
      canRollbackReal: false,
      canExecuteGit: false,
      canExecuteShell: false
    }
  };
}

function safeInput() {
  return {
    disposablePatchApplyResult: safeApplyResult(),
    disposablePatchRollbackResult: safeRollbackResult(),
    snapshotContract: safeSnapshotContract(),
    patchProposalPreview: { proposalId: "proposal-1" },
    patchValidationPreview: { validationId: "validation-1" },
    patchDiffAuditPreview: { auditId: "audit-1" },
    patchApprovalDraft: { approvalDraftId: "approval-1" },
    patchVirtualApplyPreview: { virtualApplyId: "virtual-1" },
    patchRollbackCheckpointPreview: { checkpointPreviewId: "checkpoint-1" },
    existingEventSummary: { eventCount: 0 },
    createdAt
  };
}

describe("sandbox apply rollback event projection", () => {
  it("returns an empty projection for empty input", () => {
    const projection = buildSandboxApplyRollbackEventProjection();

    expect(projection.status).toBe("empty");
    expect(projection.eventCount).toBe(0);
    expect(projection.readiness.canWriteEventStore).toBe(false);
    expect(projection.readiness.canExecuteApply).toBe(false);
    expect(projection.readiness.canExecuteRollback).toBe(false);
  });

  it("returns partial when only apply result summary is present", () => {
    const projection = buildSandboxApplyRollbackEventProjection({
      disposablePatchApplyResult: safeApplyResult(),
      snapshotContract: safeSnapshotContract(),
      createdAt
    });

    expect(projection.status).toBe("partial");
    expect(projection.applyEventCount).toBe(2);
    expect(projection.rollbackEventCount).toBe(0);
    expect(projection.eventPreviews.every((event) => event.notWritten)).toBe(
      true
    );
    expect(projection.findings.map((finding) => finding.code)).toContain(
      "SANDBOX_ROLLBACK_RESULT_MISSING"
    );
  });

  it("returns projection_ready for matching apply and rollback summaries", () => {
    const projection = buildSandboxApplyRollbackEventProjection({
      ...safeInput(),
      existingEventSummary: { eventCount: 1 }
    });

    expect(projection.status).toBe("projection_ready");
    expect(projection.eventCount).toBe(5);
    expect(projection.applyEventCount).toBe(2);
    expect(projection.rollbackEventCount).toBe(2);
    expect(projection.notWrittenEventCount).toBe(5);
    expect(projection.existingPersistedEventCount).toBe(1);
    expect(projection.eventPreviews.map((event) => event.type)).toContain(
      "sandbox.apply_rollback.projection_built"
    );
    expect(JSON.stringify(projection)).not.toContain("secret disposable file");
  });

  it("blocks rollback applyId and disposableRootRef mismatches", () => {
    const mismatchApply = buildSandboxApplyRollbackEventProjection({
      ...safeInput(),
      disposablePatchRollbackResult: safeRollbackResult({
        applyId: "different-apply"
      })
    });
    const mismatchRoot = buildSandboxApplyRollbackEventProjection({
      ...safeInput(),
      disposablePatchRollbackResult: safeRollbackResult({
        disposableRootRef: "other-root"
      })
    });

    expect(mismatchApply.status).toBe("blocked");
    expect(mismatchApply.findings.map((finding) => finding.code)).toContain(
      "SANDBOX_ROLLBACK_APPLY_ID_MISMATCH"
    );
    expect(mismatchRoot.status).toBe("blocked");
    expect(mismatchRoot.findings.map((finding) => finding.code)).toContain(
      "SANDBOX_DISPOSABLE_ROOT_REF_MISMATCH"
    );
  });

  it("blocks event preview envelopes that are already marked written", () => {
    const projection = buildSandboxApplyRollbackEventProjection({
      ...safeInput(),
      disposablePatchApplyResult: safeApplyResult({
        eventPreview: {
          type: "sandbox.patch_apply.preview_result",
          notWritten: false
        }
      })
    });

    expect(projection.status).toBe("blocked");
    expect(projection.findings.map((finding) => finding.code)).toContain(
      "EVENT_PREVIEW_WRITTEN_REJECTED"
    );
  });

  it("blocks raw content fields and secret markers without retaining values", () => {
    const secret = "sk-test1234567890abcdef";
    const projection = buildSandboxApplyRollbackEventProjection({
      ...safeInput(),
      disposablePatchApplyResult: {
        ...safeApplyResult(),
        content: `rawPrompt rawDom rawCsv ${secret}`
      }
    });
    const serialized = JSON.stringify(projection);

    expect(projection.status).toBe("blocked");
    expect(projection.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "SANDBOX_EVENT_PROJECTION_RAW_FIELD_REJECTED",
        "API_KEY_MARKER",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER"
      ])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt rawDom rawCsv");
  });

  it("keeps generated event previews summary-only and notWritten", () => {
    const projection = buildSandboxApplyRollbackEventProjection(safeInput());

    expect(projection.eventPreviews.length).toBeGreaterThan(0);
    for (const event of projection.eventPreviews) {
      expect(event.notWritten).toBe(true);
      expect(event.source).toBe(
        "runtime_sandbox_apply_rollback_event_projection"
      );
      expect(JSON.stringify(event)).not.toContain("content");
      expect(JSON.stringify(event)).not.toContain("preimageContent");
      expect(JSON.stringify(event)).not.toContain("rawDiff");
      expect(JSON.stringify(event)).not.toContain("apiKey");
    }
  });

  it("always keeps execution and EventStore readiness disabled", () => {
    const projection = buildSandboxApplyRollbackEventProjection(safeInput());
    const summary = summarizeSandboxApplyRollbackEventProjection(projection);

    expect(projection.readiness.canWriteEventStore).toBe(false);
    expect(projection.readiness.canExecuteApply).toBe(false);
    expect(projection.readiness.canExecuteRollback).toBe(false);
    expect(projection.readiness.canApplyToUserWorkspace).toBe(false);
    expect(projection.readiness.canExecuteGit).toBe(false);
    expect(projection.readiness.canExecuteShell).toBe(false);
    expect(summary.canWriteEventStore).toBe(false);
    expect(summary.canExecuteApply).toBe(false);
    expect(summary.canExecuteRollback).toBe(false);
  });

  it("rejects execution readiness flags in input", () => {
    const validation = validateSandboxApplyRollbackEventProjectionInput({
      ...safeInput(),
      disposablePatchRollbackResult: safeRollbackResult({
        readiness: {
          rolledBackDisposable: true,
          canRollbackUserWorkspace: true
        }
      })
    });

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toContain(
      "EXECUTION_FLAG_CANROLLBACKUSERWORKSPACE"
    );
  });

  it("uses deterministic ids and hash chain with injected id and clock", () => {
    const first = buildSandboxApplyRollbackEventProjection({
      ...safeInput(),
      idGenerator: () => "projection-fixed",
      createdAt
    });
    const second = buildSandboxApplyRollbackEventProjection({
      ...safeInput(),
      idGenerator: () => "projection-fixed",
      createdAt
    });

    expect(first.projectionId).toBe("projection-fixed");
    expect(second.projectionId).toBe("projection-fixed");
    expect(first.projectionHash).toBe(second.projectionHash);
    expect(first.hashChainSummary.chainHash).toBe(
      second.hashChainSummary.chainHash
    );
  });

  it("does not import filesystem or process execution APIs in the projection helper", () => {
    const source = readFileSync(
      "runtime/src/execution/sandbox/apply-rollback-event-projection.ts",
      "utf8"
    );

    expect(source).not.toContain("node:fs");
    expect(source).not.toContain("child_process");
    expect(source).not.toContain("spawn(");
    expect(source).not.toContain("exec(");
  });
});
