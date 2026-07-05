import { describe, expect, it } from "vitest";

import {
  ADVANCED_WORKSPACE_CONFIRMATION,
  FULL_ACCESS_CONFIRMATION,
  buildPermissionModePolicy,
  buildPermissionSessionLease,
  summarizePermissionSessionLease,
  validatePermissionModePolicy,
  validatePermissionSessionLease,
  type PermissionModeReadiness
} from "../src/index.js";

const baseLeaseInput = {
  workspaceRootRef: "workspace:demo",
  scopeSummary: "Preview permission metadata for the demo workspace.",
  requestedBy: "test_fixture" as const,
  reasonSummary: "Focused P1L-002 permission mode session lease test.",
  createdAt: "2026-07-06T00:00:00.000Z",
  expiresAt: "2026-07-06T00:30:00.000Z"
};

function expectHighRiskReadinessFalse(
  readiness: PermissionModeReadiness
): void {
  expect(readiness.canRunArbitraryShell).toBe(false);
  expect(readiness.canRecursiveDelete).toBe(false);
  expect(readiness.canGitPush).toBe(false);
  expect(readiness.canAutonomousLoop).toBe(false);
  expect(readiness.canPersistRawOutput).toBe(false);
  expect(readiness.canEnableFullAccessExecution).toBe(false);
  expect(readiness.canWriteEventStore).toBe(false);
  expect(readiness.appCanExecute).toBe(false);
}

function codes(result: { findings: { code: string }[] }): string[] {
  return result.findings.map((finding) => finding.code);
}

describe("permission mode policy and session lease", () => {
  it("builds a valid approval mode policy and session lease", () => {
    const policy = buildPermissionModePolicy({
      mode: "approval_mode",
      requestedCapabilityFlags: {
        canApplyPatch: true,
        canRollback: true,
        canRunAllowlistedShell: true
      },
      createdAt: "2026-07-06T00:00:00.000Z",
      idGenerator: () => "policy-approval"
    });
    const lease = buildPermissionSessionLease({
      ...baseLeaseInput,
      mode: "approval_mode",
      allowedCapabilityFlags: [
        "canApplyPatch",
        "canRollback",
        "canRunAllowlistedShell"
      ],
      idGenerator: () => "lease-approval"
    });

    expect(policy.status).toBe("valid");
    expect(policy.level).toBe("L1");
    expect(policy.capabilityFlags.canRunArbitraryShell).toBe(false);
    expect(policy.capabilityFlags.canGitPush).toBe(false);
    expect(policy.capabilityFlags.canAutonomousLoop).toBe(false);
    expect(policy.capabilityFlags.canPersistRawOutput).toBe(false);
    expect(lease.status).toBe("valid");
    expect(lease.leaseId).toBe("lease-approval");
    expect(lease.readiness.canUseExistingApprovedApplyRollback).toBe(true);
    expect(lease.readiness.canUseFixedVerificationLanes).toBe(true);
    expectHighRiskReadinessFalse(lease.readiness);
  });

  it("keeps autonomous safe mode metadata valid while execution readiness is false", () => {
    const policy = buildPermissionModePolicy({
      mode: "autonomous_safe_mode",
      idGenerator: () => "policy-autonomous"
    });
    const lease = buildPermissionSessionLease({
      ...baseLeaseInput,
      mode: "autonomous_safe_mode",
      idGenerator: () => "lease-autonomous"
    });

    expect(policy.status).toBe("valid");
    expect(policy.level).toBe("L2");
    expect(policy.futureAllowedCapabilityFlags).toContain("canAutonomousLoop");
    expect(policy.readiness.canAutonomousLoop).toBe(false);
    expect(lease.status).toBe("valid");
    expect(lease.readiness.canCreateMetadataLease).toBe(true);
    expect(lease.readiness.canUseExistingApprovedApplyRollback).toBe(false);
    expectHighRiskReadinessFalse(lease.readiness);
  });

  it("requires exact advanced workspace typed confirmation", () => {
    const blocked = validatePermissionSessionLease({
      ...baseLeaseInput,
      mode: "advanced_workspace_mode",
      typedConfirmation: "enable advanced workspace mode"
    });
    const valid = buildPermissionSessionLease({
      ...baseLeaseInput,
      mode: "advanced_workspace_mode",
      typedConfirmation: ADVANCED_WORKSPACE_CONFIRMATION,
      idGenerator: () => "lease-advanced"
    });

    expect(blocked.status).toBe("blocked");
    expect(codes(blocked)).toContain(
      "PERMISSION_LEASE_ADVANCED_CONFIRMATION_MISMATCH"
    );
    expect(valid.status).toBe("valid");
    expect(valid.leaseId).toBe("lease-advanced");
    expect(valid.typedConfirmation).toBe(ADVANCED_WORKSPACE_CONFIRMATION);
    expect(valid.readiness.canCreateMetadataLease).toBe(true);
    expectHighRiskReadinessFalse(valid.readiness);
  });

  it("requires exact full access confirmation and explicit expiry", () => {
    const missingExpiry = validatePermissionSessionLease({
      ...baseLeaseInput,
      mode: "full_access_mode",
      expiresAt: undefined,
      typedConfirmation: FULL_ACCESS_CONFIRMATION
    });
    const wrongConfirmation = validatePermissionSessionLease({
      ...baseLeaseInput,
      mode: "full_access_mode",
      typedConfirmation: "ENABLE FULL ACCESS"
    });
    const valid = buildPermissionSessionLease({
      ...baseLeaseInput,
      mode: "full_access_mode",
      typedConfirmation: FULL_ACCESS_CONFIRMATION,
      idGenerator: () => "lease-full-access"
    });

    expect(missingExpiry.status).toBe("blocked");
    expect(codes(missingExpiry)).toContain(
      "PERMISSION_LEASE_FULL_ACCESS_EXPIRY_REQUIRED"
    );
    expect(wrongConfirmation.status).toBe("blocked");
    expect(codes(wrongConfirmation)).toContain(
      "PERMISSION_LEASE_FULL_ACCESS_CONFIRMATION_MISMATCH"
    );
    expect(valid.status).toBe("valid");
    expect(valid.mode).toBe("full_access_mode");
    expect(valid.typedConfirmation).toBe(FULL_ACCESS_CONFIRMATION);
    expectHighRiskReadinessFalse(valid.readiness);
  });

  it("blocks expired leases", () => {
    const result = validatePermissionSessionLease({
      ...baseLeaseInput,
      mode: "approval_mode",
      createdAt: "2026-07-06T01:00:00.000Z",
      expiresAt: "2026-07-06T00:30:00.000Z"
    });

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain("PERMISSION_LEASE_EXPIRED");
    expectHighRiskReadinessFalse(result.readiness);
  });

  it("blocks dangerous capability flags in v0.34", () => {
    const policy = validatePermissionModePolicy({
      mode: "approval_mode",
      requestedCapabilityFlags: {
        canRunArbitraryShell: true,
        canGitPush: true,
        canAutonomousLoop: true,
        canPersistRawOutput: true
      }
    });
    const lease = validatePermissionSessionLease({
      ...baseLeaseInput,
      mode: "approval_mode",
      allowedCapabilityFlags: [
        "canRunArbitraryShell",
        "canGitPush",
        "canAutonomousLoop",
        "canPersistRawOutput"
      ]
    });

    expect(policy.status).toBe("blocked");
    expect(codes(policy)).toContain(
      "PERMISSION_HIGH_RISK_CAPABILITY_DISABLED_V034"
    );
    expect(lease.status).toBe("blocked");
    expect(codes(lease)).toContain(
      "PERMISSION_LEASE_HIGH_RISK_CAPABILITY_DISABLED_V034"
    );
    expectHighRiskReadinessFalse(lease.readiness);
  });

  it("blocks unknown capability flags instead of dropping them silently", () => {
    const policy = validatePermissionModePolicy({
      mode: "approval_mode",
      requestedCapabilityFlags: {
        canApplyPatch: true,
        canInventCapability: true
      } as never
    });
    const lease = validatePermissionSessionLease({
      ...baseLeaseInput,
      mode: "approval_mode",
      allowedCapabilityFlags: ["canInventCapability"]
    });

    expect(policy.status).toBe("blocked");
    expect(codes(policy)).toContain("PERMISSION_CAPABILITY_UNKNOWN");
    expect(lease.status).toBe("blocked");
    expect(codes(lease)).toContain("PERMISSION_LEASE_CAPABILITY_UNKNOWN");
    expectHighRiskReadinessFalse(lease.readiness);
  });

  it("blocks raw secret markers and keeps output summary-only", () => {
    const result = buildPermissionSessionLease({
      ...baseLeaseInput,
      mode: "approval_mode",
      reasonSummary: "fake sk-test1234567890abcdef marker",
      typedConfirmation: "Bearer fake-token-marker",
      idGenerator: () => "lease-secret"
    });
    const summary = summarizePermissionSessionLease(result);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain("PERMISSION_LEASE_SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(serialized).not.toContain("Bearer fake-token-marker");
    expect(summary).not.toContain("sk-test1234567890abcdef");
    expect(summary).not.toContain("Bearer fake-token-marker");
    expectHighRiskReadinessFalse(result.readiness);
  });

  it("blocks execution readiness attempts", () => {
    const result = validatePermissionSessionLease({
      ...baseLeaseInput,
      mode: "full_access_mode",
      typedConfirmation: FULL_ACCESS_CONFIRMATION,
      canRunArbitraryShell: true,
      appCanExecute: true
    } as unknown as Parameters<typeof validatePermissionSessionLease>[0]);

    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain(
      "PERMISSION_LEASE_EXECUTION_READINESS_TRUE_REJECTED"
    );
    expectHighRiskReadinessFalse(result.readiness);
  });

  it("produces deterministic lease hashes with injected id and clock", () => {
    const input = {
      ...baseLeaseInput,
      mode: "approval_mode" as const,
      idGenerator: () => "lease-deterministic"
    };
    const first = buildPermissionSessionLease(input);
    const second = buildPermissionSessionLease(input);

    expect(first.status).toBe("valid");
    expect(first.leaseId).toBe("lease-deterministic");
    expect(second.leaseId).toBe("lease-deterministic");
    expect(first.leaseHash).toBe(second.leaseHash);
    expect(summarizePermissionSessionLease(first)).toContain(
      `hash:${first.leaseHash.slice(0, 12)}`
    );
    expectHighRiskReadinessFalse(first.readiness);
  });
});
