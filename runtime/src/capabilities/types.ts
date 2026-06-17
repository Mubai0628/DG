import { type EventStore } from "../events/index.js";

export type CapabilitySourceType = "native" | "mcp" | "plugin" | "skill";

export type CapabilityCategory =
  | "fs"
  | "git"
  | "shell"
  | "browser"
  | "desktop"
  | "knowledge"
  | "memory"
  | "bridge"
  | "unknown";

export type CapabilityRiskLevel =
  | "A0_observe"
  | "A1_read"
  | "A2_draft_write"
  | "A3_scoped_write"
  | "A4_external_effect"
  | "A5_sensitive_or_irreversible";

export type CapabilityInvokePolicy =
  | "AUTO"
  | "ASK_FIRST"
  | "MANUAL_ONLY"
  | "DISABLED";

export type CapabilityExecutionMode = "READ_ONLY" | "SIMULATE" | "MUTATING";

export type CapabilityTrustTier =
  | "core"
  | "trusted"
  | "restricted"
  | "untrusted";

export type CapabilityJsonSchema = Record<string, unknown>;

export type CapabilityDescriptor = {
  id: string;
  title: string;
  sourceType: CapabilitySourceType;
  category: CapabilityCategory;
  riskLevel: CapabilityRiskLevel;
  invokePolicy: CapabilityInvokePolicy;
  executionMode: CapabilityExecutionMode;
  inputSchema: CapabilityJsonSchema;
  outputSchema: CapabilityJsonSchema;
  supportsDryRun: boolean;
  requiresElicitation: boolean;
  canWriteMemory: boolean;
  trustTier: CapabilityTrustTier;
  version: string;
  owner: string;
  description: string;
  eventTypes: string[];
  disabledReason?: string;
};

export type CapabilityRegistry = {
  register(descriptor: CapabilityDescriptor): void;
  list(): CapabilityDescriptor[];
  get(id: string): CapabilityDescriptor | undefined;
  findByCategory(category: CapabilityCategory): CapabilityDescriptor[];
  findBySourceType(sourceType: CapabilitySourceType): CapabilityDescriptor[];
};

export type CapabilityArgumentSummary = {
  keyCount: number;
  keys: string[];
  filename?: string;
  contentType?: string;
  contentBytes?: number;
};

export type CapabilityInvocationRequest = {
  id: string;
  capabilityId: string;
  input: unknown;
  taskId?: string;
  agentId?: string;
  lease?: PermissionLease;
};

export type CapabilityInvocationStatus =
  | "allowed"
  | "denied"
  | "approval_required"
  | "dry_run_available"
  | "disabled"
  | "unknown_capability";

export type CapabilityInvocationDecision =
  | "allowed_by_policy"
  | "approval_required"
  | "manual_only"
  | "disabled"
  | "denied_by_policy"
  | "unknown_capability"
  | "invalid_input"
  | "lease_invalid";

export type CapabilityDryRunResult = {
  ok: boolean;
  capabilityId: string;
  argumentSummary: CapabilityArgumentSummary;
  wouldExecute: false;
  warnings: string[];
};

export type CapabilityInvocationPlan = {
  requestId: string;
  capabilityId: string;
  status: CapabilityInvocationStatus;
  decision: CapabilityInvocationDecision;
  riskLevel?: CapabilityRiskLevel;
  sourceType?: CapabilitySourceType;
  category?: CapabilityCategory;
  invokePolicy?: CapabilityInvokePolicy;
  executionMode?: CapabilityExecutionMode;
  dryRunAvailable: boolean;
  dryRunResult?: CapabilityDryRunResult;
  leaseId?: string;
  reasons: string[];
  eventIds?: string[];
};

export type PermissionLeaseStatus = "active" | "expired" | "revoked";

export type PermissionLease = {
  leaseId: string;
  taskId: string;
  agentId: string;
  capabilityId: string;
  target: string;
  scope: string;
  riskLevel: CapabilityRiskLevel;
  grantedBy: "user" | "policy";
  issuedAt: string;
  expiresAt: string;
  status: PermissionLeaseStatus;
};

export type PermissionLeaseValidationResult =
  | {
      ok: true;
      lease: PermissionLease;
    }
  | {
      ok: false;
      reason:
        | "missing_lease"
        | "expired"
        | "revoked"
        | "wrong_capability"
        | "wrong_agent"
        | "wrong_task"
        | "risk_escalation"
        | "missing_scope";
    };

export type PermissionLeaseIssueInput = {
  taskId: string;
  agentId: string;
  capabilityId: string;
  target: string;
  scope: string;
  riskLevel: CapabilityRiskLevel;
  grantedBy: "user" | "policy";
  ttlMs?: number;
};

export type CapabilityBrokerV2Options = {
  registry?: CapabilityRegistry;
  eventStore?: EventStore;
  clock?: () => Date;
  leaseIdFactory?: () => string;
};

export type CapabilityDescriptorValidationResult =
  | {
      ok: true;
      descriptor: CapabilityDescriptor;
    }
  | {
      ok: false;
      errors: CapabilityBrokerError[];
    };

export type CapabilityBrokerErrorKind =
  | "invalid_descriptor"
  | "duplicate_descriptor"
  | "unknown_capability"
  | "invalid_invocation_input"
  | "permission_denied"
  | "lease_invalid";

export type CapabilityBrokerError = {
  kind: CapabilityBrokerErrorKind;
  code: string;
  safeMessage: string;
  capabilityId?: string;
};
