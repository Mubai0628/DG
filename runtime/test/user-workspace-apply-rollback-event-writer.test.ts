import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildUserWorkspaceApplyRollbackEvents,
  summarizeUserWorkspaceApplyRollbackEventWrite,
  validateUserWorkspaceApplyRollbackEventWriteInput,
  writeUserWorkspaceApplyRollbackEvents,
  type UserWorkspaceApplyRollbackEventWriteInput
} from "../src/execution/user-workspace/apply-rollback-event-writer.js";

const testRoots: string[] = [];

function makeRoot(name: string): string {
  const root = path.resolve(
    ".tmp",
    "tests",
    `user-workspace-event-writer-${process.pid}-${name}-${testRoots.length}`
  );
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  testRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of testRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const ids = {
  userWorkspaceRootRef: "user-root-ref",
  applyId: "user-apply-1",
  rollbackId: "user-rollback-1",
  checkpointId: "user-checkpoint-1",
  readinessId: "readiness-1",
  contractId: "contract-1",
  proposalId: "proposal-1",
  validationId: "validation-1",
  auditId: "audit-1",
  approvalDraftId: "approval-1",
  virtualApplyId: "virtual-1"
};

function eventLogPath(root: string): string {
  return path.join(root, ".deepseek-workbench", "events.jsonl");
}

function applyResult(overrides: Record<string, unknown> = {}) {
  return {
    status: "applied_to_user_workspace_prototype",
    applyId: ids.applyId,
    userWorkspaceRootRef: ids.userWorkspaceRootRef,
    readinessId: ids.readinessId,
    proposalId: ids.proposalId,
    validationId: ids.validationId,
    auditId: ids.auditId,
    approvalDraftId: ids.approvalDraftId,
    virtualApplyId: ids.virtualApplyId,
    checkpointPreviewId: ids.checkpointId,
    operationCount: 1,
    filesCreated: 1,
    filesUpdated: 0,
    filesDeleted: 0,
    bytesWritten: 24,
    bytesDeletedEstimate: 0,
    blockerCount: 0,
    warningCount: 0,
    inputSnapshotHash: "input-snapshot-hash",
    outputSnapshotHash: "output-snapshot-hash",
    resultHash: "apply-result-hash",
    eventPreview: {
      type: "user_workspace.patch_apply.prototype_result",
      applyId: ids.applyId,
      userWorkspaceRootRef: ids.userWorkspaceRootRef,
      notWritten: true
    },
    readiness: {
      appliedToUserWorkspacePrototype: true,
      canCommitGit: false,
      canExecuteShell: false,
      canPushGit: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    ...overrides
  };
}

function rollbackResult(overrides: Record<string, unknown> = {}) {
  return {
    status: "rolled_back_user_workspace_prototype",
    rollbackId: ids.rollbackId,
    applyId: ids.applyId,
    checkpointId: ids.checkpointId,
    userWorkspaceRootRef: ids.userWorkspaceRootRef,
    operationCount: 1,
    filesRestored: 0,
    filesRemoved: 1,
    filesRecreated: 0,
    bytesRestored: 0,
    bytesRemovedEstimate: 24,
    blockerCount: 0,
    warningCount: 0,
    restoredSnapshotHash: "restored-snapshot-hash",
    resultHash: "rollback-result-hash",
    eventPreview: {
      type: "user_workspace.patch_rollback.prototype_result",
      rollbackId: ids.rollbackId,
      applyId: ids.applyId,
      checkpointId: ids.checkpointId,
      userWorkspaceRootRef: ids.userWorkspaceRootRef,
      notWritten: true
    },
    readiness: {
      rolledBackUserWorkspacePrototype: true,
      canCommitGit: false,
      canExecuteShell: false,
      canPushGit: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    ...overrides
  };
}

function safeInput(
  root: string,
  overrides: Partial<UserWorkspaceApplyRollbackEventWriteInput> = {}
): UserWorkspaceApplyRollbackEventWriteInput {
  return {
    eventLogPath: eventLogPath(root),
    eventStoreRef: "event-log-ref",
    recordMode: "explicit_summary_event_write",
    userWorkspaceApplyResult: applyResult(),
    userWorkspaceRollbackResult: rollbackResult(),
    promotionReadiness: {
      status: "readiness_ready",
      readinessId: ids.readinessId,
      blockerCount: 0,
      readiness: {
        canProceedToUserWorkspaceApplyPrototype: true,
        canApplyToUserWorkspace: false,
        canWriteFilesystem: false,
        canRollbackUserWorkspace: false,
        canExecuteGit: false,
        canExecuteShell: false,
        canIssuePermissionLease: false,
        appCanExecute: false
      }
    },
    userWorkspaceSnapshotBackupContract: {
      status: "contract_ready",
      contractId: ids.contractId,
      userWorkspaceRootRef: ids.userWorkspaceRootRef
    },
    patchProposalPreview: { proposalId: ids.proposalId },
    patchValidationPreview: { validationId: ids.validationId },
    patchDiffAuditPreview: { auditId: ids.auditId },
    patchApprovalDraft: { approvalDraftId: ids.approvalDraftId },
    patchVirtualApplyPreview: { virtualApplyId: ids.virtualApplyId },
    patchRollbackCheckpointPreview: {
      checkpointPreviewId: ids.checkpointId
    },
    approvalReceiptSummary: {
      approvalReceiptId: "receipt-1",
      approvalDraftId: ids.approvalDraftId
    },
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides
  };
}

function readEventLines(root: string): string[] {
  const filePath = eventLogPath(root);
  return existsSync(filePath)
    ? readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean)
    : [];
}

describe("user workspace apply rollback event writer", () => {
  it("keeps disabled mode from writing", () => {
    const root = makeRoot("disabled");
    const result = writeUserWorkspaceApplyRollbackEvents(
      safeInput(root, { recordMode: "disabled" })
    );

    expect(result.status).toBe("disabled");
    expect(result.eventCount).toBe(0);
    expect(result.readiness.wroteSummaryEvents).toBe(false);
    expect(existsSync(eventLogPath(root))).toBe(false);
  });

  it("returns dry-run event previews without writing", () => {
    const root = makeRoot("dry-run");
    const result = writeUserWorkspaceApplyRollbackEvents(
      safeInput(root, { recordMode: "dry_run" })
    );

    expect(result.status).toBe("dry_run");
    expect(result.eventCount).toBe(7);
    expect(result.writtenEventIds).toEqual([]);
    expect(
      result.eventPreviews.every((event) => event.payload.summaryOnly)
    ).toBe(true);
    expect(existsSync(eventLogPath(root))).toBe(false);
  });

  it("writes summary-only apply events in explicit mode", () => {
    const root = makeRoot("apply-only");
    const result = writeUserWorkspaceApplyRollbackEvents(
      safeInput(root, { userWorkspaceRollbackResult: undefined })
    );
    const eventText = readFileSync(eventLogPath(root), "utf8");

    expect(result.status).toBe("events_written");
    expect(result.applyEventCount).toBe(4);
    expect(result.rollbackEventCount).toBe(0);
    expect(result.writtenEventIds).toHaveLength(4);
    expect(eventText).toContain("user_workspace.patch_apply.result");
    expect(eventText).toContain('"summaryOnly":true');
  });

  it("writes summary-only rollback events in explicit mode", () => {
    const root = makeRoot("rollback-only");
    const result = writeUserWorkspaceApplyRollbackEvents(
      safeInput(root, { userWorkspaceApplyResult: undefined })
    );
    const eventText = readFileSync(eventLogPath(root), "utf8");

    expect(result.status).toBe("events_written");
    expect(result.applyEventCount).toBe(0);
    expect(result.rollbackEventCount).toBe(3);
    expect(result.writtenEventIds).toHaveLength(3);
    expect(eventText).toContain("user_workspace.patch_rollback.result");
    expect(eventText).toContain('"summaryOnly":true');
  });

  it("writes an apply and rollback chain when ids match", () => {
    const root = makeRoot("chain");
    const result = writeUserWorkspaceApplyRollbackEvents(safeInput(root));
    const lines = readEventLines(root);

    expect(result.status).toBe("events_written");
    expect(result.eventCount).toBe(7);
    expect(result.applyEventCount).toBe(4);
    expect(result.rollbackEventCount).toBe(3);
    expect(lines).toHaveLength(7);
    expect(lines.every((line) => JSON.parse(line).payload.summaryOnly)).toBe(
      true
    );
  });

  it("blocks rollback and apply id mismatch", () => {
    const root = makeRoot("id-mismatch");
    const result = writeUserWorkspaceApplyRollbackEvents(
      safeInput(root, {
        userWorkspaceRollbackResult: rollbackResult({ applyId: "other-apply" })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_EVENT_WRITE_APPLY_ID_MISMATCH"
    );
    expect(existsSync(eventLogPath(root))).toBe(false);
  });

  it("blocks event previews that are already written", () => {
    const root = makeRoot("not-written-false");
    const result = writeUserWorkspaceApplyRollbackEvents(
      safeInput(root, {
        userWorkspaceApplyResult: applyResult({
          eventPreview: {
            type: "user_workspace.patch_apply.prototype_result",
            notWritten: false
          }
        })
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toContain(
      "USER_EVENT_WRITE_PREVIEW_ALREADY_WRITTEN"
    );
  });

  it("blocks raw content fields", () => {
    const root = makeRoot("raw-field");
    const validation = validateUserWorkspaceApplyRollbackEventWriteInput({
      ...safeInput(root),
      userWorkspaceApplyResult: {
        ...applyResult(),
        content: "not allowed"
      }
    });

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toContain(
      "USER_EVENT_WRITE_RAW_FIELD_REJECTED"
    );
  });

  it("blocks fake API key and raw marker summaries", () => {
    const root = makeRoot("markers");
    const result = buildUserWorkspaceApplyRollbackEvents({
      ...safeInput(root, { recordMode: "dry_run" }),
      approvalReceiptSummary: {
        note: "sk-1234567890abcdef rawPrompt rawDom rawCsv"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "USER_EVENT_WRITE_API_KEY_MARKER_REJECTED",
        "USER_EVENT_WRITE_RAW_PROMPT_MARKER_REJECTED",
        "USER_EVENT_WRITE_RAW_DOM_MARKER_REJECTED",
        "USER_EVENT_WRITE_RAW_CSV_MARKER_REJECTED"
      ])
    );
  });

  it("keeps event log and output summary-only", () => {
    const root = makeRoot("summary-only");
    const result = writeUserWorkspaceApplyRollbackEvents(safeInput(root));
    const serializedResult = JSON.stringify(result);
    const eventText = readFileSync(eventLogPath(root), "utf8");

    expect(serializedResult).not.toMatch(
      /preimageContent|rawSource|rawDiff|apiKey/
    );
    expect(eventText).not.toMatch(/preimageContent|rawSource|rawDiff|apiKey/);
    expect(eventText).not.toContain("secret fixture");
    expect(
      result.eventPreviews.every((event) => event.payload.summaryOnly)
    ).toBe(true);
  });

  it("keeps execution readiness flags false", () => {
    const root = makeRoot("readiness");
    const result = writeUserWorkspaceApplyRollbackEvents(safeInput(root));

    expect(result.readiness.canExecuteApply).toBe(false);
    expect(result.readiness.canExecuteRollback).toBe(false);
    expect(result.readiness.canWriteRawContent).toBe(false);
    expect(result.readiness.canExecuteGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(result.readiness.appCanExecute).toBe(false);
    expect(
      summarizeUserWorkspaceApplyRollbackEventWrite(result).appCanExecute
    ).toBe(false);
  });

  it("does not execute apply or rollback while writing events", () => {
    const root = makeRoot("no-execution");
    const workspaceFile = path.join(root, "src", "file.ts");
    mkdirSync(path.dirname(workspaceFile), { recursive: true });
    writeFileSync(workspaceFile, "unchanged fixture\n", "utf8");

    const result = writeUserWorkspaceApplyRollbackEvents(safeInput(root));

    expect(result.status).toBe("events_written");
    expect(readFileSync(workspaceFile, "utf8")).toBe("unchanged fixture\n");
  });
});
