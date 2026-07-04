import { describe, expect, it } from "vitest";

import {
  buildCrossSurfaceApprovedSequence,
  summarizeCrossSurfaceApprovedSequence,
  validateCrossSurfaceApprovedSequencerInput,
  type CrossSurfaceApprovedLaneInput,
  type CrossSurfaceApprovedSequence
} from "../src/workflows/cross-surface-approved-sequencer.js";

const safeLanes: CrossSurfaceApprovedLaneInput[] = [
  {
    laneId: "apply-lane",
    kind: "approved_workspace_apply",
    status: "summary_ready",
    summary: "Approved workspace apply summary.",
    approvalReceiptRef: "apply-receipt-ref",
    typedConfirmationRef: "typed-confirm-apply"
  },
  {
    laneId: "verify-lane",
    kind: "git_shell_verification",
    status: "summary_ready",
    summary: "Fixed Git/shell verification summary.",
    verificationTemplateRef: "shell-template.app.typecheck"
  },
  {
    laneId: "desktop-lane",
    kind: "approved_desktop_action",
    status: "summary_ready",
    summary: "Approved desktop action summary.",
    desktopActionKind: "click_observed_safe_target",
    approvalReceiptRef: "desktop-receipt-ref",
    typedConfirmationRef: "typed-confirm-desktop"
  },
  {
    laneId: "rollback-lane",
    kind: "approved_rollback",
    status: "summary_ready",
    summary: "Approved rollback summary.",
    approvalReceiptRef: "rollback-receipt-ref",
    typedConfirmationRef: "typed-confirm-rollback",
    rollbackCheckpointRef: "rollback-checkpoint-ref"
  },
  {
    laneId: "replay-lane",
    kind: "summary_event_replay",
    status: "summary_ready",
    summary: "Summary event replay ref.",
    replaySummaryRef: "replay-summary-ref"
  }
];

function expectNoExecution(sequence: CrossSurfaceApprovedSequence): void {
  expect(sequence.readiness.sequencerExecutes).toBe(false);
  expect(sequence.readiness.canWriteEventStore).toBe(false);
  expect(sequence.readiness.canApplyPatch).toBe(false);
  expect(sequence.readiness.canRollback).toBe(false);
  expect(sequence.readiness.canExecuteDesktopAction).toBe(false);
  expect(sequence.readiness.canExecuteGit).toBe(false);
  expect(sequence.readiness.canExecuteShell).toBe(false);
  expect(sequence.readiness.canBypassReceipt).toBe(false);
  expect(sequence.readiness.canBypassTypedConfirmation).toBe(false);
  expect(sequence.readiness.appCanExecute).toBe(false);
}

describe("cross-surface approved sequencer", () => {
  it("blocks missing receipts", () => {
    const sequence = buildCrossSurfaceApprovedSequence({
      lanes: [
        {
          laneId: "apply-lane",
          kind: "approved_workspace_apply",
          summary: "Apply summary.",
          typedConfirmationRef: "typed-confirm-apply"
        }
      ]
    });

    expect(sequence.status).toBe("blocked");
    expect(sequence.missingApprovals).toContain("MISSING_APPROVAL_RECEIPT");
    expect(sequence.findings.map((finding) => finding.code)).toContain(
      "MISSING_APPROVAL_RECEIPT"
    );
    expectNoExecution(sequence);
  });

  it("blocks missing typed confirmation", () => {
    const sequence = buildCrossSurfaceApprovedSequence({
      lanes: [
        {
          laneId: "desktop-lane",
          kind: "approved_desktop_action",
          summary: "Desktop action summary.",
          desktopActionKind: "focus_window",
          approvalReceiptRef: "desktop-receipt-ref"
        }
      ]
    });

    expect(sequence.status).toBe("blocked");
    expect(sequence.missingApprovals).toContain("MISSING_TYPED_CONFIRMATION");
    expectNoExecution(sequence);
  });

  it("blocks desktop actions outside approved lanes", () => {
    const sequence = buildCrossSurfaceApprovedSequence({
      lanes: [
        {
          laneId: "desktop-lane",
          kind: "approved_desktop_action",
          summary: "Unsafe desktop action summary.",
          desktopActionKind: "drag_and_drop_file",
          approvalReceiptRef: "desktop-receipt-ref",
          typedConfirmationRef: "typed-confirm-desktop"
        }
      ]
    });

    expect(sequence.status).toBe("blocked");
    expect(sequence.findings.map((finding) => finding.code)).toContain(
      "UNAPPROVED_DESKTOP_ACTION_KIND"
    );
    expectNoExecution(sequence);
  });

  it("blocks arbitrary shell fields", () => {
    const sequence = buildCrossSurfaceApprovedSequence({
      lanes: [
        {
          laneId: "shell-lane",
          kind: "git_shell_verification",
          summary: "Verification summary.",
          verificationTemplateRef: "shell-template.app.typecheck",
          shellCommand: "rm -rf workspace"
        }
      ]
    });
    const serialized = JSON.stringify(sequence);

    expect(sequence.status).toBe("blocked");
    expect(sequence.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_FIELD"
    );
    expect(serialized).not.toContain("rm -rf workspace");
    expectNoExecution(sequence);
  });

  it("blocks dynamic action fields", () => {
    const findings = validateCrossSurfaceApprovedSequencerInput({
      lanes: [
        {
          laneId: "dynamic-lane",
          kind: "approved_desktop_action",
          summary: "Dynamic action attempt.",
          desktopActionKind: "click_observed_safe_target",
          approvalReceiptRef: "desktop-receipt-ref",
          typedConfirmationRef: "typed-confirm-desktop",
          dynamicAction: true
        }
      ]
    });

    expect(findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_FIELD"
    );
  });

  it("produces safe sequence summary ready", () => {
    const sequence = buildCrossSurfaceApprovedSequence({
      lanes: safeLanes,
      sourceKind: "fixture",
      createdAt: "2026-07-04T00:00:00.000Z",
      idGenerator: () => "cross-surface-sequence-test"
    });
    const summary = summarizeCrossSurfaceApprovedSequence(sequence);

    expect(sequence.status).toBe("sequence_ready");
    expect(sequence.sequenceId).toBe("cross-surface-sequence-test");
    expect(sequence.laneCount).toBe(5);
    expect(sequence.readyLaneCount).toBe(5);
    expect(sequence.missingApprovals).toEqual([]);
    expect(sequence.requiredReceipts).toContain("apply-receipt-ref");
    expect(sequence.requiredReceipts).toContain("typed-confirm-desktop");
    expect(sequence.readiness.canExecuteNow).toBe(true);
    expect(summary.source).toBe("runtime_cross_surface_approved_sequencer");
    expectNoExecution(sequence);
  });

  it("sequencer never executes and output remains summary-only", () => {
    const first = buildCrossSurfaceApprovedSequence({
      lanes: safeLanes,
      idGenerator: () => "deterministic-sequence",
      createdAt: "2026-07-04T00:00:00.000Z"
    });
    const second = buildCrossSurfaceApprovedSequence({
      lanes: safeLanes,
      idGenerator: () => "deterministic-sequence",
      createdAt: "2026-07-04T00:00:00.000Z"
    });
    const serialized = JSON.stringify(first);

    expect(first.sequenceHash).toBe(second.sequenceHash);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("Authorization");
    expectNoExecution(first);
  });
});
