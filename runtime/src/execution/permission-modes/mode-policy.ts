import { hashPatchObject } from "../patch/hash.js";

export type PermissionMode =
  | "read_only_preview"
  | "approval_mode"
  | "autonomous_safe_mode"
  | "advanced_workspace_mode"
  | "full_access_mode"
  | "break_glass_mode";

export type PermissionModeLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export type PermissionCapabilityFlag =
  | "canReadWorkspace"
  | "canReadSensitiveFile"
  | "canWriteWorkspace"
  | "canApplyPatch"
  | "canRollback"
  | "canRunAllowlistedShell"
  | "canRunArbitraryShell"
  | "canPersistRawOutput"
  | "canDeleteFile"
  | "canDeleteDirectory"
  | "canRecursiveDelete"
  | "canGitRead"
  | "canGitCommit"
  | "canGitPush"
  | "canCallLiveModel"
  | "canAutonomousLoop"
  | "canInvokeMcpReadonlyTool"
  | "canInvokeMcpMutatingTool"
  | "canRunPluginCode"
  | "canRunSkillCode"
  | "canObserveDesktop"
  | "canProposeDesktopAction"
  | "canExecuteDesktopAction"
  | "canUseClipboardWrite"
  | "canUseFileDialogAutomation"
  | "canUseNativeBridge";

export type PermissionCapabilityFlags = Record<
  PermissionCapabilityFlag,
  boolean
>;

export type PermissionModeStatus = "valid" | "warning" | "blocked";

export type PermissionModeFindingKind =
  | "mode"
  | "capability"
  | "forbidden_field"
  | "secret_marker"
  | "readiness";

export type PermissionModeSeverity = "warning" | "blocker";

export type PermissionModeFinding = {
  findingId: string;
  kind: PermissionModeFindingKind;
  severity: PermissionModeSeverity;
  code: string;
  safeMessage: string;
  relatedCapability?: PermissionCapabilityFlag | undefined;
};

export type PermissionModeReadiness = {
  canPreviewPolicy: boolean;
  canCreateMetadataLease: boolean;
  canUseExistingApprovedApplyRollback: boolean;
  canUseFixedVerificationLanes: boolean;
  canRunArbitraryShell: false;
  canRecursiveDelete: false;
  canGitPush: false;
  canAutonomousLoop: false;
  canPersistRawOutput: false;
  canEnableFullAccessExecution: false;
  canWriteEventStore: false;
  appCanExecute: false;
};

export type PermissionModePolicyInput = {
  mode?: PermissionMode | string | undefined;
  requestedCapabilityFlags?: Partial<PermissionCapabilityFlags> | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type PermissionModePolicy = {
  status: PermissionModeStatus;
  policyId: string;
  mode: PermissionMode;
  level: PermissionModeLevel;
  displayName: string;
  description: string;
  capabilityFlags: PermissionCapabilityFlags;
  futureAllowedCapabilityFlags: PermissionCapabilityFlag[];
  findings: PermissionModeFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  policyHash: string;
  readiness: PermissionModeReadiness;
  nextAction: string;
  source: "runtime_permission_mode_policy";
  summaryOnly: true;
};

export type PermissionModeValidationResult = {
  ok: boolean;
  status: PermissionModeStatus;
  findings: PermissionModeFinding[];
  blockerCount: number;
  warningCount: number;
  readiness: PermissionModeReadiness;
};

export const permissionCapabilityFlags = [
  "canReadWorkspace",
  "canReadSensitiveFile",
  "canWriteWorkspace",
  "canApplyPatch",
  "canRollback",
  "canRunAllowlistedShell",
  "canRunArbitraryShell",
  "canPersistRawOutput",
  "canDeleteFile",
  "canDeleteDirectory",
  "canRecursiveDelete",
  "canGitRead",
  "canGitCommit",
  "canGitPush",
  "canCallLiveModel",
  "canAutonomousLoop",
  "canInvokeMcpReadonlyTool",
  "canInvokeMcpMutatingTool",
  "canRunPluginCode",
  "canRunSkillCode",
  "canObserveDesktop",
  "canProposeDesktopAction",
  "canExecuteDesktopAction",
  "canUseClipboardWrite",
  "canUseFileDialogAutomation",
  "canUseNativeBridge"
] as const satisfies readonly PermissionCapabilityFlag[];

export const highRiskV034BlockedCapabilityFlags = [
  "canRunArbitraryShell",
  "canPersistRawOutput",
  "canDeleteFile",
  "canDeleteDirectory",
  "canRecursiveDelete",
  "canGitCommit",
  "canGitPush",
  "canAutonomousLoop",
  "canInvokeMcpMutatingTool",
  "canRunPluginCode",
  "canRunSkillCode",
  "canUseClipboardWrite",
  "canUseFileDialogAutomation",
  "canUseNativeBridge"
] as const satisfies readonly PermissionCapabilityFlag[];

const modeLevels: Record<PermissionMode, PermissionModeLevel> = {
  read_only_preview: "L0",
  approval_mode: "L1",
  autonomous_safe_mode: "L2",
  advanced_workspace_mode: "L3",
  full_access_mode: "L4",
  break_glass_mode: "L5"
};

const modeDisplayNames: Record<PermissionMode, string> = {
  read_only_preview: "Read-only / Preview",
  approval_mode: "Approval Mode",
  autonomous_safe_mode: "Autonomous Safe Mode",
  advanced_workspace_mode: "Advanced Workspace Mode",
  full_access_mode: "Full Access Mode",
  break_glass_mode: "Break-glass Mode"
};

const forbiddenFieldNames = new Set([
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
]);

const readinessFields = new Set([
  "canRunArbitraryShell",
  "canRecursiveDelete",
  "canGitPush",
  "canAutonomousLoop",
  "canPersistRawOutput",
  "canEnableFullAccessExecution",
  "canWriteEventStore",
  "appCanExecute"
]);

export function buildPermissionModePolicy(
  input: PermissionModePolicyInput = {}
): PermissionModePolicy {
  const mode = isPermissionMode(input.mode) ? input.mode : "approval_mode";
  const findings = validatePermissionModePolicy(input).findings;
  const blockerCount = count(findings, "blocker");
  const warningCount = count(findings, "warning");
  const capabilityFlags = {
    ...defaultCapabilityFlagsForMode(mode),
    ...safeRequestedCapabilityFlags(input.requestedCapabilityFlags)
  };
  const policyHash = hashPatchObject({
    mode,
    capabilityFlags,
    futureAllowedCapabilityFlags: futureAllowedForMode(mode),
    createdAt: input.createdAt
  });
  const status: PermissionModeStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "valid";

  return {
    status,
    policyId:
      input.idGenerator?.() ??
      `permission-mode-policy-${policyHash.slice(0, 12)}`,
    mode,
    level: modeLevels[mode],
    displayName: modeDisplayNames[mode],
    description: descriptionForMode(mode),
    capabilityFlags,
    futureAllowedCapabilityFlags: futureAllowedForMode(mode),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    policyHash,
    readiness: readinessForMode(mode, blockerCount === 0),
    nextAction: nextActionFor(status, mode),
    source: "runtime_permission_mode_policy",
    summaryOnly: true
  };
}

export function validatePermissionModePolicy(
  input: PermissionModePolicyInput = {}
): PermissionModeValidationResult {
  const findings: PermissionModeFinding[] = [];
  const add = (
    kind: PermissionModeFindingKind,
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
    add("mode", "blocker", "PERMISSION_MODE_MISSING", "Mode is required.");
  } else if (!isPermissionMode(input.mode)) {
    add(
      "mode",
      "blocker",
      "PERMISSION_MODE_UNKNOWN",
      "Permission mode is not recognized."
    );
  }

  const mode = isPermissionMode(input.mode) ? input.mode : "approval_mode";
  if (
    input.requestedCapabilityFlags !== undefined &&
    (input.requestedCapabilityFlags === null ||
      typeof input.requestedCapabilityFlags !== "object" ||
      Array.isArray(input.requestedCapabilityFlags))
  ) {
    add(
      "capability",
      "blocker",
      "PERMISSION_CAPABILITY_FLAGS_INVALID",
      "Requested capability flags must be a capability boolean map."
    );
  }
  if (
    input.requestedCapabilityFlags !== undefined &&
    input.requestedCapabilityFlags !== null &&
    typeof input.requestedCapabilityFlags === "object" &&
    !Array.isArray(input.requestedCapabilityFlags)
  ) {
    for (const capability of Object.keys(input.requestedCapabilityFlags)) {
      if (
        !permissionCapabilityFlags.includes(
          capability as PermissionCapabilityFlag
        )
      ) {
        add(
          "capability",
          "blocker",
          "PERMISSION_CAPABILITY_UNKNOWN",
          "Requested capability flag is not recognized."
        );
      }
    }
  }

  const requested = safeRequestedCapabilityFlags(
    input.requestedCapabilityFlags
  );
  for (const capability of Object.keys(
    requested
  ) as PermissionCapabilityFlag[]) {
    if (
      requested[capability] === true &&
      !defaultCapabilityFlagsForMode(mode)[capability]
    ) {
      add(
        "capability",
        "blocker",
        "PERMISSION_CAPABILITY_NOT_ALLOWED_FOR_MODE",
        "Requested capability is not allowed for the selected mode in v0.34.",
        capability
      );
    }
    if (
      requested[capability] === true &&
      (
        highRiskV034BlockedCapabilityFlags as readonly PermissionCapabilityFlag[]
      ).includes(capability)
    ) {
      add(
        "capability",
        "blocker",
        "PERMISSION_HIGH_RISK_CAPABILITY_DISABLED_V034",
        "High-risk capability remains disabled in v0.34.",
        capability
      );
    }
  }

  if (mode === "break_glass_mode") {
    add(
      "mode",
      "blocker",
      "PERMISSION_MODE_BREAK_GLASS_DISABLED",
      "Break-glass mode is design-only and disabled in v0.34."
    );
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
    readiness: readinessForMode(mode, blockerCount === 0)
  };
}

export function summarizePermissionModePolicy(
  policy: PermissionModePolicy
): string {
  return [
    `status:${policy.status}`,
    `mode:${policy.mode}`,
    `level:${policy.level}`,
    `blockers:${policy.blockerCount}`,
    `warnings:${policy.warningCount}`,
    `approved_apply:${policy.readiness.canUseExistingApprovedApplyRollback ? "yes" : "no"}`,
    `fixed_lanes:${policy.readiness.canUseFixedVerificationLanes ? "yes" : "no"}`,
    `arbitrary_shell:${policy.readiness.canRunArbitraryShell ? "yes" : "no"}`,
    `git_push:${policy.readiness.canGitPush ? "yes" : "no"}`,
    `autonomous_loop:${policy.readiness.canAutonomousLoop ? "yes" : "no"}`,
    `raw_output:${policy.readiness.canPersistRawOutput ? "yes" : "no"}`,
    `hash:${policy.policyHash.slice(0, 12)}`
  ].join(" | ");
}

export function defaultCapabilityFlagsForMode(
  mode: PermissionMode
): PermissionCapabilityFlags {
  const flags = disabledCapabilityFlags();
  switch (mode) {
    case "read_only_preview":
      return {
        ...flags,
        canReadWorkspace: true,
        canGitRead: true,
        canInvokeMcpReadonlyTool: true,
        canObserveDesktop: true,
        canProposeDesktopAction: true
      };
    case "approval_mode":
      return enableCapabilityFlags(flags, [
        "canReadWorkspace",
        "canWriteWorkspace",
        "canApplyPatch",
        "canRollback",
        "canRunAllowlistedShell",
        "canGitRead",
        "canInvokeMcpReadonlyTool",
        "canObserveDesktop",
        "canProposeDesktopAction"
      ]);
    case "autonomous_safe_mode":
      return {
        ...flags,
        canReadWorkspace: true,
        canGitRead: true,
        canInvokeMcpReadonlyTool: true,
        canObserveDesktop: true,
        canProposeDesktopAction: true
      };
    case "advanced_workspace_mode":
    case "full_access_mode":
      return {
        ...flags,
        canReadWorkspace: true,
        canGitRead: true,
        canInvokeMcpReadonlyTool: true,
        canObserveDesktop: true,
        canProposeDesktopAction: true
      };
    case "break_glass_mode":
    default:
      return flags;
  }
}

export function disabledCapabilityFlags(): PermissionCapabilityFlags {
  return Object.fromEntries(
    permissionCapabilityFlags.map((capability) => [capability, false])
  ) as PermissionCapabilityFlags;
}

function enableCapabilityFlags(
  flags: PermissionCapabilityFlags,
  enabled: PermissionCapabilityFlag[]
): PermissionCapabilityFlags {
  const result = { ...flags };
  for (const capability of enabled) {
    result[capability] = true;
  }
  return result;
}

export function isPermissionMode(value: unknown): value is PermissionMode {
  return (
    value === "read_only_preview" ||
    value === "approval_mode" ||
    value === "autonomous_safe_mode" ||
    value === "advanced_workspace_mode" ||
    value === "full_access_mode" ||
    value === "break_glass_mode"
  );
}

function futureAllowedForMode(
  mode: PermissionMode
): PermissionCapabilityFlag[] {
  if (mode === "advanced_workspace_mode") {
    return [
      "canRunArbitraryShell",
      "canApplyPatch",
      "canPersistRawOutput",
      "canGitCommit"
    ];
  }
  if (mode === "full_access_mode") {
    return [
      ...highRiskV034BlockedCapabilityFlags
    ] as PermissionCapabilityFlag[];
  }
  if (mode === "autonomous_safe_mode") {
    return ["canAutonomousLoop", "canRunAllowlistedShell"];
  }
  return [];
}

function readinessForMode(
  mode: PermissionMode,
  noBlockers: boolean
): PermissionModeReadiness {
  return {
    canPreviewPolicy: noBlockers,
    canCreateMetadataLease: noBlockers && mode !== "break_glass_mode",
    canUseExistingApprovedApplyRollback: noBlockers && mode === "approval_mode",
    canUseFixedVerificationLanes: noBlockers && mode === "approval_mode",
    canRunArbitraryShell: false,
    canRecursiveDelete: false,
    canGitPush: false,
    canAutonomousLoop: false,
    canPersistRawOutput: false,
    canEnableFullAccessExecution: false,
    canWriteEventStore: false,
    appCanExecute: false
  };
}

function descriptionForMode(mode: PermissionMode): string {
  switch (mode) {
    case "read_only_preview":
      return "Read-only preview mode. No mutation or broad execution.";
    case "approval_mode":
      return "Default mode. Existing approved lanes still require user approval and receipts.";
    case "autonomous_safe_mode":
      return "Preview-only autonomous safe policy metadata. No loop execution in v0.34.";
    case "advanced_workspace_mode":
      return "Preview-only advanced workspace policy metadata. No arbitrary shell or auto apply in v0.34.";
    case "full_access_mode":
      return "Preview-only full access policy metadata. Full access execution remains disabled in v0.34.";
    case "break_glass_mode":
      return "Design-only break-glass mode. Disabled in v0.34.";
  }
}

function nextActionFor(
  status: PermissionModeStatus,
  mode: PermissionMode
): string {
  if (status === "blocked") {
    return "Fix permission mode blockers before creating a metadata lease.";
  }
  if (mode === "approval_mode") {
    return "Continue using existing approved apply/rollback and fixed verification lanes with human approval.";
  }
  return "Review preview-only policy metadata. High-risk execution remains disabled in v0.34.";
}

function safeRequestedCapabilityFlags(
  value: Partial<PermissionCapabilityFlags> | undefined
): Partial<PermissionCapabilityFlags> {
  if (value === undefined || value === null || typeof value !== "object") {
    return {};
  }
  const result: Partial<PermissionCapabilityFlags> = {};
  for (const capability of permissionCapabilityFlags) {
    const flagValue = (value as Partial<PermissionCapabilityFlags>)[capability];
    if (typeof flagValue === "boolean") {
      result[capability] = flagValue;
    }
  }
  return result;
}

function scanForbidden(
  value: unknown,
  add: (
    kind: PermissionModeFindingKind,
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
        "PERMISSION_SECRET_MARKER_REJECTED",
        "Input contains a secret-like marker."
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
    if (forbiddenFieldNames.has(normalizedKey)) {
      add(
        "forbidden_field",
        "blocker",
        "PERMISSION_FORBIDDEN_FIELD_REJECTED",
        "Input contains a forbidden raw, secret, execution, or command field."
      );
    }
    if (readinessFields.has(key) && nested === true) {
      add(
        "readiness",
        "blocker",
        "PERMISSION_EXECUTION_READINESS_TRUE_REJECTED",
        "Input cannot enable high-risk execution readiness in v0.34."
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
