import { describe, expect, it } from "vitest";

import {
  buildExecutionRiskBudget,
  buildExecutionSessionControlState,
  buildPermissionModeAuditReport,
  buildPermissionModePolicy,
  buildPermissionSessionLease,
  evaluateExecutionPolicy,
  summarizePermissionModeAuditReport,
  type PermissionModeAuditReport
} from "../src/index.js";

const createdAt = "2026-07-06T00:00:00.000Z";
const expiresAt = "2026-07-06T00:30:00.000Z";

function buildSafeAuditReport(): PermissionModeAuditReport {
  const modePolicy = buildPermissionModePolicy({
    mode: "approval_mode",
    createdAt,
    idGenerator: () => "policy-audit-safe"
  });
  const sessionLease = buildPermissionSessionLease({
    mode: "approval_mode",
    workspaceRootRef: "workspace:demo",
    scopeSummary: "Audit preview fixture.",
    requestedBy: "test_fixture",
    reasonSummary: "Verify permission mode audit summaries.",
    createdAt,
    expiresAt,
    idGenerator: () => "lease-audit-safe"
  });
  const riskBudget = buildExecutionRiskBudget({
    mode: "approval_mode",
    maxSteps: 5,
    maxDurationMs: 60_000,
    maxCommands: 1,
    maxFileMutations: 1,
    maxBytesChanged: 10_000,
    maxDeletes: 0,
    maxRecursiveDeletes: 0,
    maxGitWrites: 0,
    maxPushes: 0,
    maxDesktopActions: 0,
    maxFailures: 1,
    maxRetries: 1,
    maxCostUsd: 0.01,
    createdAt,
    expiresAt,
    idGenerator: () => "budget-audit-safe"
  });
  const sessionControl = buildExecutionSessionControlState({
    mode: "approval_mode",
    status: "active",
    killSwitchVisible: true,
    canPause: true,
    canKill: true,
    startedAt: createdAt,
    expiresAt,
    sessionId: "session-audit-safe"
  });
  const policyDecisions = [
    evaluateExecutionPolicy({
      mode: "approval_mode",
      capabilityKind: "workspace_read",
      createdAt,
      idGenerator: () => "decision-workspace-read"
    }),
    evaluateExecutionPolicy({
      mode: "approval_mode",
      capabilityKind: "patch_apply",
      approvedLane: "existing_approved_lane",
      fixedVerificationLane: true,
      createdAt,
      idGenerator: () => "decision-patch-apply"
    })
  ];

  return buildPermissionModeAuditReport({
    modePolicy,
    sessionLease,
    riskBudget,
    sessionControl,
    policyDecisions,
    createdAt,
    idGenerator: () => "permission-audit-safe"
  });
}

function expectExecutionReadinessFalse(report: PermissionModeAuditReport): void {
  expect(report.readiness).toMatchObject({
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canRunArbitraryShell: false,
    canRecursiveDelete: false,
    canGitPush: false,
    canAutonomousLoop: false,
    canPersistRawOutput: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("permission mode audit summary", () => {
  it("builds summary-only audit report and replay projection", () => {
    const report = buildSafeAuditReport();
    const summary = summarizePermissionModeAuditReport(report);

    expect(report.status).toBe("valid");
    expect(report.auditId).toBe("permission-audit-safe");
    expect(report.source).toBe("runtime_permission_mode_audit_summary");
    expect(report.latestModePreview?.mode).toBe("approval_mode");
    expect(report.latestLeasePreview?.leaseId).toBe("lease-audit-safe");
    expect(report.eventPreviews).toHaveLength(6);
    expect(report.replayProjection.status).toBe("ready");
    expect(report.replayProjection.modePreviewCount).toBe(1);
    expect(report.replayProjection.leasePreviewCount).toBe(1);
    expect(report.replayProjection.policyDecisionCount).toBe(2);
    expect(report.replayProjection.riskBudgetPreviewCount).toBe(1);
    expect(report.replayProjection.killSwitchPreviewCount).toBe(1);
    expect(summary).toContain("eventstore_write:no");
    expectExecutionReadinessFalse(report);
  });

  it("marks all event previews as not written and summary-only", () => {
    const report = buildSafeAuditReport();

    expect(report.eventPreviews.every((event) => event.notWritten)).toBe(true);
    expect(report.eventPreviews.every((event) => event.summaryOnly)).toBe(true);
    expect(report.replayProjection.notWrittenCount).toBe(
      report.eventPreviews.length
    );
  });

  it("reports blocked capability counts from policy decisions", () => {
    const report = buildPermissionModeAuditReport({
      policyDecisions: [
        evaluateExecutionPolicy({
          mode: "approval_mode",
          capabilityKind: "shell_arbitrary",
          createdAt,
          idGenerator: () => "decision-shell-arbitrary"
        })
      ],
      idGenerator: () => "permission-audit-blocked-capability"
    });

    expect(report.status).toBe("blocked");
    expect(report.blockedCapabilityCount).toBe(1);
    expect(report.replayProjection.blockedCapabilityCount).toBe(1);
    expect(
      report.findings.map((finding) => finding.code)
    ).toContain("PERMISSION_MODE_AUDIT_BLOCKED_EVENT_PREVIEW");
    expectExecutionReadinessFalse(report);
  });

  it("reports high-risk future capability counts", () => {
    const report = buildPermissionModeAuditReport({
      modePolicy: buildPermissionModePolicy({
        mode: "full_access_mode",
        createdAt,
        idGenerator: () => "policy-full-access-preview"
      })
    });

    expect(report.highRiskFutureCapabilityCount).toBeGreaterThan(0);
    expect(report.replayProjection.highRiskFutureCapabilityCount).toBe(
      report.highRiskFutureCapabilityCount
    );
    expectExecutionReadinessFalse(report);
  });

  it("shows kill switch preview and triggered state", () => {
    const report = buildPermissionModeAuditReport({
      sessionControl: buildExecutionSessionControlState({
        mode: "approval_mode",
        status: "killed",
        killSwitchVisible: true,
        canPause: true,
        canKill: true,
        startedAt: createdAt,
        expiresAt,
        sessionId: "session-killed"
      })
    });

    expect(report.killSwitchVisible).toBe(true);
    expect(report.killSwitchTriggered).toBe(true);
    expect(report.replayProjection.killSwitchPreviewCount).toBe(1);
    expectExecutionReadinessFalse(report);
  });

  it("blocks raw fields and secret markers without echoing raw values", () => {
    const report = buildPermissionModeAuditReport({
      rawPrompt: "fake raw prompt",
      note: "fake sk-test1234567890abcdef marker",
      readiness: {
        canWriteEventStore: true
      }
    } as unknown as Parameters<typeof buildPermissionModeAuditReport>[0]);
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.eventPreviews).toHaveLength(0);
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "PERMISSION_MODE_AUDIT_FORBIDDEN_FIELD_REJECTED",
        "PERMISSION_MODE_AUDIT_SECRET_MARKER_REJECTED",
        "PERMISSION_MODE_AUDIT_READINESS_TRUE_REJECTED"
      ])
    );
    expect(serialized).not.toContain("fake raw prompt");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expectExecutionReadinessFalse(report);
  });

  it("keeps deterministic hash with injected id and unchanged input", () => {
    const first = buildSafeAuditReport();
    const second = buildSafeAuditReport();

    expect(first.auditId).toBe(second.auditId);
    expect(first.auditHash).toBe(second.auditHash);
    expect(first.replayProjection.projectionHash).toBe(
      second.replayProjection.projectionHash
    );
  });
});
