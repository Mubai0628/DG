import { validatePermissionLease } from "./permission-lease.js";
import {
  type CapabilityDescriptor,
  type CapabilityInvocationDecision,
  type CapabilityInvocationRequest,
  type CapabilityInvocationStatus
} from "./types.js";

export function decideCapabilityInvocation(input: {
  request: CapabilityInvocationRequest;
  descriptor: CapabilityDescriptor;
  now?: Date;
}): {
  status: CapabilityInvocationStatus;
  decision: CapabilityInvocationDecision;
  reasons: string[];
  leaseId?: string;
} {
  const { request, descriptor } = input;

  if (descriptor.invokePolicy === "DISABLED") {
    return {
      status: "disabled",
      decision: "disabled",
      reasons: [descriptor.disabledReason ?? "capability_disabled"]
    };
  }

  if (descriptor.invokePolicy === "MANUAL_ONLY") {
    return {
      status: "approval_required",
      decision: "manual_only",
      reasons: ["manual_only_capability"]
    };
  }

  if (descriptor.invokePolicy === "ASK_FIRST") {
    const leaseInput: Parameters<typeof validatePermissionLease>[1] = {
      request,
      descriptor
    };
    if (input.now !== undefined) {
      leaseInput.now = input.now;
    }
    const lease = validatePermissionLease(request.lease, {
      ...leaseInput
    });
    if (lease.ok) {
      return {
        status: "allowed",
        decision: "allowed_by_policy",
        reasons: ["valid_permission_lease"],
        leaseId: lease.lease.leaseId
      };
    }
    return {
      status: "approval_required",
      decision: "approval_required",
      reasons: [`lease_${lease.reason}`]
    };
  }

  return {
    status: "allowed",
    decision: "allowed_by_policy",
    reasons: ["auto_policy"]
  };
}
