import { hashPatchObject } from "../patch/hash.js";
import {
  buildPermissionModePolicy,
  highRiskV034BlockedCapabilityFlags,
  isPermissionMode,
  permissionCapabilityFlags,
  type PermissionCapabilityFlag,
  type PermissionMode,
  type PermissionModeFinding,
  type PermissionModeValidationResult,
  type PermissionModeReadiness,
  type PermissionModeSeverity,
  type PermissionModeStatus
} from "./mode-policy.js";

export type PermissionSessionLease = {
  status: PermissionModeStatus;
  leaseId: string;
  mode: PermissionMode;
  workspaceRootRef: string;
  scopeSummary: string;
  requestedBy: "manual_user_preview" | "test_fixture";
  reasonSummary: string;
  allowedCapabilityFlags: PermissionCapabilityFlag[];
  expiresAt: string;
  createdAt: string;
  typedConfirmation?: string | undefined;
  leaseHash: string;
  findings: PermissionModeFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: PermissionModeReadiness;
  nextAction: string;
  source: "runtime_permission_session_lease";
  summaryOnly: true;
};

export type PermissionSessionLeaseInput = {
  leaseId?: string | undefined;
  mode?: PermissionMode | string | undefined;
  workspaceRootRef?: string | undefined;
  scopeSummary?: string | undefined;
  requestedBy?: "manual_user_preview" | "test_fixture" | string | undefined;
  reasonSummary?: string | undefined;
  allowedCapabilityFlags?: PermissionCapabilityFlag[] | string[] | undefined;
  expiresAt?: string | undefined;
  createdAt?: string | undefined;
  typedConfirmation?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export const ADVANCED_WORKSPACE_CONFIRMATION = "ENABLE ADVANCED WORKSPACE MODE";
export const FULL_ACCESS_CONFIRMATION = "ENABLE FULL ACCESS FOR THIS WORKSPACE";

const DEFAULT_CREATED_AT = "2026-07-06T00:00:00.000Z";
const DEFAULT_EXPIRES_AT = "2026-07-06T00:30:00.000Z";

export function buildPermissionSessionLease(
  input: PermissionSessionLeaseInput = {}
): PermissionSessionLease {
  const mode = isPermissionMode(input.mode) ? input.mode : "approval_mode";
  const createdAt = safeText(input.createdAt, DEFAULT_CREATED_AT);
  const expiresAt = safeText(input.expiresAt, DEFAULT_EXPIRES_AT);
  const allowedCapabilityFlags = normalizeCapabilityList(
    input.allowedCapabilityFlags
  );
  const leaseHash = hashPatchObject({
    mode,
    workspaceRootRef: safeText(input.workspaceRootRef, ""),
    scopeSummary: safeText(input.scopeSummary, ""),
    requestedBy: normalizeRequestedBy(input.requestedBy),
    reasonSummary: safeText(input.reasonSummary, ""),
    allowedCapabilityFlags,
    expiresAt,
    createdAt,
    typedConfirmation: safeOptionalText(input.typedConfirmation)
  });
  const findings = validatePermissionSessionLease(input).findings;
  const blockerCount = count(findings, "blocker");
  const warningCount = count(findings, "warning");
  const status: PermissionModeStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "valid";
  const policy = buildPermissionModePolicy({ mode });

  return {
    status,
    leaseId:
      safeOptionalText(input.leaseId) ??
      input.idGenerator?.() ??
      `permission-session-lease-${leaseHash.slice(0, 12)}`,
    mode,
    workspaceRootRef: safeText(input.workspaceRootRef, ""),
    scopeSummary: safeText(input.scopeSummary, ""),
    requestedBy: normalizeRequestedBy(input.requestedBy),
    reasonSummary: safeText(input.reasonSummary, ""),
    allowedCapabilityFlags,
    expiresAt,
    createdAt,
    typedConfirmation: safeOptionalText(input.typedConfirmation),
    leaseHash,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: {
      ...policy.readiness,
      canPreviewPolicy: blockerCount === 0,
      canCreateMetadataLease: blockerCount === 0 && mode !== "break_glass_mode"
    },
    nextAction: nextActionFor(status, mode),
    source: "runtime_permission_session_lease",
    summaryOnly: true
  };
}

export function validatePermissionSessionLease(
  input: PermissionSessionLeaseInput = {}
): PermissionModeValidationResult {
  const mode = isPermissionMode(input.mode) ? input.mode : "approval_mode";
  const policyValidation = buildPermissionModePolicy({ mode });
  const findings: PermissionModeFinding[] = [...policyValidation.findings];
  const add = (
    kind: PermissionModeFinding["kind"],
    severity: PermissionModeSeverity,
    code: string,
    safeMessage: string,
    relatedCapability?: PermissionCapabilityFlag
  ) => {
    findings.push({
      findingId: `${code.toLowerCase()}-${findings.length + 1}`,
      kind,
      severity,
      code,
      safeMessage,
      relatedCapability
    });
  };

  scanForbidden(input, add);

  if (input.mode === undefined || input.mode === "") {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_MODE_MISSING",
      "Mode is required."
    );
  } else if (!isPermissionMode(input.mode)) {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_MODE_UNKNOWN",
      "Permission lease mode is not recognized."
    );
  }

  const createdAt = safeText(input.createdAt, DEFAULT_CREATED_AT);
  const expiresAt = safeText(input.expiresAt, DEFAULT_EXPIRES_AT);
  if (!isValidIsoDate(createdAt)) {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_CREATED_AT_INVALID",
      "Lease createdAt must be a valid ISO timestamp."
    );
  }
  if (!isValidIsoDate(expiresAt)) {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_EXPIRES_AT_INVALID",
      "Lease expiresAt must be a valid ISO timestamp."
    );
  } else if (Date.parse(expiresAt) <= Date.parse(createdAt)) {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_EXPIRED",
      "Permission session lease is expired."
    );
  }

  if (!hasText(input.workspaceRootRef)) {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_WORKSPACE_ROOT_MISSING",
      "Workspace root ref is required."
    );
  }
  if (!hasText(input.scopeSummary)) {
    add(
      "mode",
      "warning",
      "PERMISSION_LEASE_SCOPE_SUMMARY_MISSING",
      "Scope summary should explain the preview lease boundary."
    );
  }
  if (!hasText(input.reasonSummary)) {
    add(
      "mode",
      "warning",
      "PERMISSION_LEASE_REASON_SUMMARY_MISSING",
      "Reason summary should explain why the mode was previewed."
    );
  }
  if (
    input.requestedBy !== undefined &&
    input.requestedBy !== "manual_user_preview" &&
    input.requestedBy !== "test_fixture"
  ) {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_REQUESTER_UNKNOWN",
      "Lease requester is not recognized."
    );
  }

  if (
    mode === "advanced_workspace_mode" &&
    input.typedConfirmation !== ADVANCED_WORKSPACE_CONFIRMATION
  ) {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_ADVANCED_CONFIRMATION_MISMATCH",
      "Advanced Workspace Mode preview requires exact typed confirmation."
    );
  }
  if (
    mode === "full_access_mode" &&
    input.typedConfirmation !== FULL_ACCESS_CONFIRMATION
  ) {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_FULL_ACCESS_CONFIRMATION_MISMATCH",
      "Full Access Mode preview requires exact typed confirmation."
    );
  }
  if (mode === "full_access_mode" && !hasText(input.expiresAt)) {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_FULL_ACCESS_EXPIRY_REQUIRED",
      "Full Access Mode preview requires an explicit expiry."
    );
  }
  if (mode === "full_access_mode" && !hasText(input.workspaceRootRef)) {
    add(
      "mode",
      "blocker",
      "PERMISSION_LEASE_FULL_ACCESS_WORKSPACE_REQUIRED",
      "Full Access Mode preview requires a workspace root ref."
    );
  }

  const policy = buildPermissionModePolicy({ mode });
  if (
    input.allowedCapabilityFlags !== undefined &&
    !Array.isArray(input.allowedCapabilityFlags)
  ) {
    add(
      "capability",
      "blocker",
      "PERMISSION_LEASE_CAPABILITY_LIST_INVALID",
      "Allowed capability flags must be a list of capability names."
    );
  }
  const rawCapabilityFlags = Array.isArray(input.allowedCapabilityFlags)
    ? input.allowedCapabilityFlags
    : [];
  for (const rawCapability of rawCapabilityFlags) {
    if (
      !permissionCapabilityFlags.includes(
        rawCapability as PermissionCapabilityFlag
      )
    ) {
      add(
        "capability",
        "blocker",
        "PERMISSION_LEASE_CAPABILITY_UNKNOWN",
        "Allowed capability flag is not recognized."
      );
      continue;
    }
    const capability = rawCapability as PermissionCapabilityFlag;
    if (!policy.capabilityFlags[capability]) {
      add(
        "capability",
        "blocker",
        "PERMISSION_LEASE_CAPABILITY_NOT_ALLOWED_FOR_MODE",
        "Lease requested a capability not allowed by the selected mode.",
        capability
      );
    }
    if (
      (
        highRiskV034BlockedCapabilityFlags as readonly PermissionCapabilityFlag[]
      ).includes(capability)
    ) {
      add(
        "capability",
        "blocker",
        "PERMISSION_LEASE_HIGH_RISK_CAPABILITY_DISABLED_V034",
        "High-risk lease capability remains disabled in v0.34.",
        capability
      );
    }
  }

  const blockerCount = count(findings, "blocker");
  const warningCount = count(findings, "warning");
  const status: PermissionModeStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "valid";

  return {
    ok: blockerCount === 0,
    status,
    findings,
    blockerCount,
    warningCount,
    readiness: {
      ...policy.readiness,
      canPreviewPolicy: blockerCount === 0,
      canCreateMetadataLease: blockerCount === 0 && mode !== "break_glass_mode"
    }
  };
}

export function summarizePermissionSessionLease(
  lease: PermissionSessionLease
): string {
  return [
    `status:${lease.status}`,
    `mode:${lease.mode}`,
    `lease:${lease.leaseId}`,
    `workspace:${lease.workspaceRootRef ? "set" : "missing"}`,
    `capabilities:${lease.allowedCapabilityFlags.length}`,
    `blockers:${lease.blockerCount}`,
    `warnings:${lease.warningCount}`,
    `arbitrary_shell:${lease.readiness.canRunArbitraryShell ? "yes" : "no"}`,
    `recursive_delete:${lease.readiness.canRecursiveDelete ? "yes" : "no"}`,
    `git_push:${lease.readiness.canGitPush ? "yes" : "no"}`,
    `autonomous_loop:${lease.readiness.canAutonomousLoop ? "yes" : "no"}`,
    `raw_output:${lease.readiness.canPersistRawOutput ? "yes" : "no"}`,
    `hash:${lease.leaseHash.slice(0, 12)}`
  ].join(" | ");
}

function normalizeCapabilityList(
  values: PermissionSessionLeaseInput["allowedCapabilityFlags"]
): PermissionCapabilityFlag[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const result: PermissionCapabilityFlag[] = [];
  for (const value of values) {
    if (permissionCapabilityFlags.includes(value as PermissionCapabilityFlag)) {
      result.push(value as PermissionCapabilityFlag);
    }
  }
  return result;
}

function nextActionFor(
  status: PermissionModeStatus,
  mode: PermissionMode
): string {
  if (status === "blocked") {
    return "Fix lease blockers before using this metadata in policy previews.";
  }
  if (mode === "approval_mode") {
    return "Metadata lease is ready for preview. Existing approved lanes still require separate receipts.";
  }
  return "Metadata lease is preview-only. High-risk execution remains disabled in v0.34.";
}

function normalizeRequestedBy(
  value: PermissionSessionLeaseInput["requestedBy"]
): PermissionSessionLease["requestedBy"] {
  return value === "test_fixture" ? "test_fixture" : "manual_user_preview";
}

function scanForbidden(
  value: unknown,
  add: (
    kind: PermissionModeFinding["kind"],
    severity: PermissionModeSeverity,
    code: string,
    safeMessage: string,
    relatedCapability?: PermissionCapabilityFlag
  ) => void,
  seen = new Set<unknown>()
): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    if (containsSecretLikeMarker(value)) {
      add(
        "secret_marker",
        "blocker",
        "PERMISSION_LEASE_SECRET_MARKER_REJECTED",
        "Lease input contains a secret-like marker."
      );
    }
    return;
  }
  if (typeof value !== "object" || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>
  )) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (
      [
        "apikey",
        "apikeyvalue",
        "authorization",
        "bearer",
        "token",
        "secret",
        "password",
        "rawkey",
        "rawoutput",
        "rawprompt",
        "rawresponse",
        "rawsource",
        "rawdiff",
        "rawpatch",
        "reasoningcontent",
        "reasoning_content",
        "stdout",
        "stderr",
        "command",
        "shellcommand",
        "gitcommand",
        "tauricommand",
        "eventstorewrite",
        "applynow",
        "rollbacknow",
        "nativebridge",
        "desktopaction"
      ].includes(normalizedKey)
    ) {
      add(
        "forbidden_field",
        "blocker",
        "PERMISSION_LEASE_FORBIDDEN_FIELD_REJECTED",
        "Lease input contains a forbidden raw, secret, execution, or command field."
      );
    }
    if (
      [
        "canRunArbitraryShell",
        "canRecursiveDelete",
        "canGitPush",
        "canAutonomousLoop",
        "canPersistRawOutput",
        "canEnableFullAccessExecution",
        "canWriteEventStore",
        "appCanExecute"
      ].includes(key) &&
      nested === true
    ) {
      add(
        "readiness",
        "blocker",
        "PERMISSION_LEASE_EXECUTION_READINESS_TRUE_REJECTED",
        "Lease input cannot enable high-risk execution readiness in v0.34."
      );
    }
    scanForbidden(nested, add, seen);
  }
}

function containsSecretLikeMarker(value: string): boolean {
  return (
    /\bsk-[A-Za-z0-9_-]{6,}/.test(value) ||
    /\bBearer\s+[A-Za-z0-9._-]+/i.test(value) ||
    /\bAuthorization\b/i.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
  );
}

function count(
  findings: PermissionModeFinding[],
  severity: PermissionModeSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    !containsSecretLikeMarker(value)
    ? value.trim().slice(0, 160)
    : fallback;
}

function safeOptionalText(value: unknown): string | undefined {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    !containsSecretLikeMarker(value)
    ? value.trim().slice(0, 160)
    : undefined;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
