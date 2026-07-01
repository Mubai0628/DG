import { isHighRiskCapability } from "./risk.js";
import {
  type CapabilityBrokerError,
  type CapabilityCategory,
  type CapabilityDescriptor,
  type CapabilityDescriptorValidationResult,
  type CapabilityExecutionMode,
  type CapabilityInvokePolicy,
  type CapabilityRiskLevel,
  type CapabilitySourceType,
  type CapabilityTrustTier
} from "./types.js";

const sourceTypes: readonly CapabilitySourceType[] = [
  "native",
  "mcp",
  "plugin",
  "skill"
];

const categories: readonly CapabilityCategory[] = [
  "fs",
  "git",
  "shell",
  "browser",
  "desktop",
  "knowledge",
  "memory",
  "bridge",
  "unknown"
];

const riskLevels: readonly CapabilityRiskLevel[] = [
  "A0_observe",
  "A1_read",
  "A2_draft_write",
  "A3_scoped_write",
  "A4_external_effect",
  "A5_sensitive_or_irreversible"
];

const invokePolicies: readonly CapabilityInvokePolicy[] = [
  "AUTO",
  "ASK_FIRST",
  "MANUAL_ONLY",
  "DISABLED"
];

const executionModes: readonly CapabilityExecutionMode[] = [
  "READ_ONLY",
  "SIMULATE",
  "MUTATING"
];

const trustTiers: readonly CapabilityTrustTier[] = [
  "core",
  "trusted",
  "restricted",
  "untrusted"
];

export function validateCapabilityDescriptor(
  descriptor: CapabilityDescriptor
): CapabilityDescriptorValidationResult {
  const errors: CapabilityBrokerError[] = [];

  requireNonEmptyString(descriptor.id, "id", descriptor.id, errors);
  requireNonEmptyString(descriptor.title, "title", descriptor.id, errors);
  requireKnown(
    descriptor.sourceType,
    sourceTypes,
    "unknown_source_type",
    descriptor.id,
    errors
  );
  requireKnown(
    descriptor.category,
    categories,
    "unknown_category",
    descriptor.id,
    errors
  );
  requireKnown(
    descriptor.riskLevel,
    riskLevels,
    "unknown_risk_level",
    descriptor.id,
    errors
  );
  requireKnown(
    descriptor.invokePolicy,
    invokePolicies,
    "unknown_invoke_policy",
    descriptor.id,
    errors
  );
  requireKnown(
    descriptor.executionMode,
    executionModes,
    "unknown_execution_mode",
    descriptor.id,
    errors
  );
  requireKnown(
    descriptor.trustTier,
    trustTiers,
    "unknown_trust_tier",
    descriptor.id,
    errors
  );

  if (!isSafeCapabilityId(descriptor.id)) {
    errors.push(error("invalid_descriptor", "invalid_id", descriptor.id));
  }
  if (!isPlainObject(descriptor.inputSchema)) {
    errors.push(
      error("invalid_descriptor", "invalid_input_schema", descriptor.id)
    );
  }
  if (!isPlainObject(descriptor.outputSchema)) {
    errors.push(
      error("invalid_descriptor", "invalid_output_schema", descriptor.id)
    );
  }
  if (
    descriptor.executionMode === "MUTATING" &&
    descriptor.invokePolicy === "AUTO"
  ) {
    errors.push(
      error("invalid_descriptor", "mutating_auto_rejected", descriptor.id)
    );
  }
  if (
    isHighRiskCapability(descriptor.riskLevel) &&
    descriptor.invokePolicy === "AUTO"
  ) {
    errors.push(
      error("invalid_descriptor", "high_risk_auto_rejected", descriptor.id)
    );
  }
  if (
    descriptor.sourceType !== "native" &&
    descriptor.executionMode === "MUTATING"
  ) {
    errors.push(
      error("invalid_descriptor", "external_mutating_rejected", descriptor.id)
    );
  }
  if (
    descriptor.sourceType !== "native" &&
    descriptor.invokePolicy !== "DISABLED" &&
    !isAllowedExternalDescriptor(descriptor)
  ) {
    errors.push(
      error(
        "invalid_descriptor",
        "external_descriptor_must_simulate",
        descriptor.id
      )
    );
  }
  if (descriptor.canWriteMemory) {
    errors.push(
      error("invalid_descriptor", "memory_write_rejected", descriptor.id)
    );
  }
  if (descriptor.sourceType !== "native" && !descriptor.supportsDryRun) {
    errors.push(
      error("invalid_descriptor", "external_dry_run_required", descriptor.id)
    );
  }
  if (
    descriptor.category === "shell" &&
    descriptor.invokePolicy !== "DISABLED"
  ) {
    errors.push(
      error(
        "invalid_descriptor",
        "shell_capability_disabled_only",
        descriptor.id
      )
    );
  }
  if (
    descriptor.category === "desktop" &&
    descriptor.invokePolicy !== "DISABLED"
  ) {
    errors.push(
      error(
        "invalid_descriptor",
        "desktop_capability_disabled_only",
        descriptor.id
      )
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, descriptor };
}

export function cloneCapabilityDescriptor(
  descriptor: CapabilityDescriptor
): CapabilityDescriptor {
  const clone: CapabilityDescriptor = {
    id: descriptor.id,
    title: descriptor.title,
    sourceType: descriptor.sourceType,
    category: descriptor.category,
    riskLevel: descriptor.riskLevel,
    invokePolicy: descriptor.invokePolicy,
    executionMode: descriptor.executionMode,
    inputSchema: { ...descriptor.inputSchema },
    outputSchema: { ...descriptor.outputSchema },
    supportsDryRun: descriptor.supportsDryRun,
    requiresElicitation: descriptor.requiresElicitation,
    canWriteMemory: descriptor.canWriteMemory,
    trustTier: descriptor.trustTier,
    version: descriptor.version,
    owner: descriptor.owner,
    description: descriptor.description,
    eventTypes: [...descriptor.eventTypes]
  };
  if (descriptor.disabledReason !== undefined) {
    clone.disabledReason = descriptor.disabledReason;
  }
  return clone;
}

function requireNonEmptyString(
  value: unknown,
  field: string,
  capabilityId: string | undefined,
  errors: CapabilityBrokerError[]
): void {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(
      error("invalid_descriptor", `missing_${field}`, capabilityId ?? "")
    );
  }
}

function requireKnown<T extends string>(
  value: unknown,
  allowed: readonly T[],
  code: string,
  capabilityId: string,
  errors: CapabilityBrokerError[]
): void {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    errors.push(error("invalid_descriptor", code, capabilityId));
  }
}

function isSafeCapabilityId(value: string): boolean {
  return (
    /^[a-z0-9][a-z0-9._:-]*$/.test(value) &&
    !value.includes("..") &&
    !/[\\/\s;&|`$<>]/.test(value)
  );
}

function isAllowedExternalDescriptor(
  descriptor: CapabilityDescriptor
): boolean {
  if (
    descriptor.invokePolicy === "MANUAL_ONLY" &&
    descriptor.executionMode === "SIMULATE"
  ) {
    return true;
  }
  return isMcpReadonlyToolDescriptor(descriptor);
}

function isMcpReadonlyToolDescriptor(
  descriptor: CapabilityDescriptor
): boolean {
  return (
    descriptor.sourceType === "mcp" &&
    descriptor.id.startsWith("mcp.readonly_tool.") &&
    (descriptor.invokePolicy === "ASK_FIRST" ||
      descriptor.invokePolicy === "MANUAL_ONLY") &&
    descriptor.executionMode === "READ_ONLY" &&
    (descriptor.riskLevel === "A0_observe" ||
      descriptor.riskLevel === "A1_read") &&
    descriptor.supportsDryRun &&
    descriptor.requiresElicitation &&
    descriptor.eventTypes.includes("mcp.readonly_tool.proposed") &&
    descriptor.eventTypes.includes("mcp.readonly_tool.result")
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function error(
  kind: CapabilityBrokerError["kind"],
  code: string,
  capabilityId: string
): CapabilityBrokerError {
  return {
    kind,
    code,
    safeMessage: `Capability descriptor rejected: ${code}`,
    capabilityId
  };
}
