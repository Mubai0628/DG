import { isCapabilityRiskAtMost } from "./risk.js";
import {
  type CapabilityDescriptor,
  type CapabilityInvocationRequest,
  type PermissionLease,
  type PermissionLeaseIssueInput,
  type PermissionLeaseValidationResult
} from "./types.js";

export function issuePermissionLease(
  input: PermissionLeaseIssueInput,
  options: {
    clock?: () => Date;
    idFactory?: () => string;
  } = {}
): PermissionLease {
  const issuedAtDate = options.clock?.() ?? new Date();
  const ttlMs = input.ttlMs ?? 5 * 60 * 1000;
  return {
    leaseId: options.idFactory?.() ?? defaultLeaseId(),
    taskId: input.taskId,
    agentId: input.agentId,
    capabilityId: input.capabilityId,
    target: input.target,
    scope: input.scope,
    riskLevel: input.riskLevel,
    grantedBy: input.grantedBy,
    issuedAt: issuedAtDate.toISOString(),
    expiresAt: new Date(issuedAtDate.getTime() + ttlMs).toISOString(),
    status: "active"
  };
}

export function validatePermissionLease(
  lease: PermissionLease | undefined,
  input: {
    request: CapabilityInvocationRequest;
    descriptor: CapabilityDescriptor;
    now?: Date;
  }
): PermissionLeaseValidationResult {
  if (lease === undefined) {
    return { ok: false, reason: "missing_lease" };
  }
  if (lease.status === "revoked") {
    return { ok: false, reason: "revoked" };
  }
  if (
    lease.status === "expired" ||
    Date.parse(lease.expiresAt) <= nowMs(input.now)
  ) {
    return { ok: false, reason: "expired" };
  }
  if (lease.capabilityId !== input.request.capabilityId) {
    return { ok: false, reason: "wrong_capability" };
  }
  if (
    input.request.agentId !== undefined &&
    lease.agentId !== input.request.agentId
  ) {
    return { ok: false, reason: "wrong_agent" };
  }
  if (
    input.request.taskId !== undefined &&
    lease.taskId !== input.request.taskId
  ) {
    return { ok: false, reason: "wrong_task" };
  }
  if (!isCapabilityRiskAtMost(input.descriptor.riskLevel, lease.riskLevel)) {
    return { ok: false, reason: "risk_escalation" };
  }
  if (
    input.descriptor.executionMode === "MUTATING" &&
    lease.scope.length === 0
  ) {
    return { ok: false, reason: "missing_scope" };
  }
  return { ok: true, lease };
}

export function expirePermissionLease(lease: PermissionLease): PermissionLease {
  return { ...lease, status: "expired" };
}

export function revokePermissionLease(lease: PermissionLease): PermissionLease {
  return { ...lease, status: "revoked" };
}

export function summarizePermissionLease(
  lease: PermissionLease
): Record<string, unknown> {
  return {
    leaseId: lease.leaseId,
    taskId: lease.taskId,
    agentId: lease.agentId,
    capabilityId: lease.capabilityId,
    target: lease.target,
    scope: lease.scope,
    riskLevel: lease.riskLevel,
    grantedBy: lease.grantedBy,
    issuedAt: lease.issuedAt,
    expiresAt: lease.expiresAt,
    status: lease.status
  };
}

function nowMs(now: Date | undefined): number {
  return (now ?? new Date()).getTime();
}

let nextLease = 0;

function defaultLeaseId(): string {
  nextLease += 1;
  return `lease-${nextLease}`;
}
