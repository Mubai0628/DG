import { safeErrorMessage, safeText } from "./safety.js";

export type AppApprovalExecutionDesignStatus =
  | "disabled"
  | "design_ready"
  | "warning"
  | "blocked";

export type AppApprovalExecutionDesignRequirementStatus =
  | "met"
  | "missing"
  | "deferred"
  | "disabled"
  | "blocked";

export type AppApprovalExecutionDesignRequirement = {
  requirementId: string;
  label: string;
  status: AppApprovalExecutionDesignRequirementStatus;
  summary: string;
  relatedRef: string;
};

export type AppApprovalExecutionDesignWarning = {
  code: string;
  safeMessage: string;
};

export type AppApprovalExecutionDesignView = {
  status: AppApprovalExecutionDesignStatus;
  source: "app_approval_execution_design";
  requirements: AppApprovalExecutionDesignRequirement[];
  warnings: AppApprovalExecutionDesignWarning[];
  blockerCount: number;
  warningCount: number;
  disabledActionCount: number;
  nextAction: string;
  readiness: {
    canApprove: false;
    canReject: false;
    canIssuePermissionLease: false;
    canExecuteApply: false;
    canExecuteRollback: false;
    canWriteEventStore: false;
    canExecuteGit: false;
    canExecuteShell: false;
    appCanExecute: false;
  };
};

export type AppApprovalExecutionDesignInput = {
  userWorkspacePromotionReadiness?: unknown;
  userWorkspaceApplyPrototype?: unknown;
  userWorkspaceRollbackPrototype?: unknown;
  userWorkspaceApplyRollbackEventWriter?: unknown;
  approvalDraft?: unknown;
  capabilityPlan?: unknown;
  contextAssembly?: unknown;
  auditSurface?: unknown;
  createdAt?: string | undefined;
};

export function buildAppApprovalExecutionDesignView(
  input: AppApprovalExecutionDesignInput = {}
): AppApprovalExecutionDesignView {
  const requirements = requirementsFrom(input);
  const warnings = warningsFrom(requirements);
  const blockerCount = requirements.filter(
    (requirement) => requirement.status === "blocked"
  ).length;
  const missingCount = requirements.filter(
    (requirement) => requirement.status === "missing"
  ).length;
  const warningCount =
    warnings.length +
    requirements.filter((requirement) => requirement.status === "deferred")
      .length;
  const status: AppApprovalExecutionDesignStatus =
    blockerCount > 0
      ? "blocked"
      : missingCount > 0
        ? "disabled"
        : warningCount > 0
          ? "warning"
          : "design_ready";

  return {
    status,
    source: "app_approval_execution_design",
    requirements,
    warnings,
    blockerCount,
    warningCount,
    disabledActionCount: 8,
    nextAction:
      status === "blocked"
        ? "Resolve source-boundary violations before any future App approval execution design can advance."
        : "Keep App approval execution disabled. Future work must add production PermissionLease design, manual confirmation, replay proof, and explicit release gates before App execution can be considered.",
    readiness: {
      canApprove: false,
      canReject: false,
      canIssuePermissionLease: false,
      canExecuteApply: false,
      canExecuteRollback: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    }
  };
}

export function summarizeAppApprovalExecutionDesignView(
  view: AppApprovalExecutionDesignView
): string {
  return [
    `status:${view.status}`,
    `requirements:${view.requirements.length}`,
    `blockers:${view.blockerCount}`,
    `warnings:${view.warningCount}`,
    `disabled_actions:${view.disabledActionCount}`,
    "app_execution:false"
  ].join(" | ");
}

function requirementsFrom(
  input: AppApprovalExecutionDesignInput
): AppApprovalExecutionDesignRequirement[] {
  return [
    requirement(
      "promotion_readiness",
      "Promotion readiness must pass",
      hasReadyStatus(input.userWorkspacePromotionReadiness, "readiness_ready")
        ? "met"
        : "missing",
      "Future App approval execution requires a ready promotion summary.",
      safeRef(input.userWorkspacePromotionReadiness, "readinessId")
    ),
    requirement(
      "snapshot_backup_contract",
      "User workspace snapshot / backup contract must pass",
      hasRef(input.userWorkspacePromotionReadiness, "readinessId")
        ? "met"
        : "missing",
      "Snapshot and backup readiness must be proven before App execution.",
      safeRef(input.userWorkspacePromotionReadiness, "userWorkspaceRootRef")
    ),
    requirement(
      "apply_prototype_runtime_only",
      "Apply prototype must remain runtime-only",
      disabledRuntimeRequirement(input.userWorkspaceApplyPrototype, "apply"),
      "The App Shell must not connect user workspace apply controls.",
      safeRef(input.userWorkspaceApplyPrototype, "readinessId")
    ),
    requirement(
      "rollback_prototype_runtime_only",
      "Rollback prototype must remain runtime-only",
      disabledRuntimeRequirement(
        input.userWorkspaceRollbackPrototype,
        "rollback"
      ),
      "The App Shell must not connect user workspace rollback controls.",
      safeRef(input.userWorkspaceRollbackPrototype, "checkpointId")
    ),
    requirement(
      "event_writer_runtime_only",
      "EventStore writer must remain runtime-only",
      eventWriterRequirement(input.userWorkspaceApplyRollbackEventWriter),
      "The App Shell must not persist apply/rollback EventStore records.",
      safeRef(input.userWorkspaceApplyRollbackEventWriter, "source")
    ),
    requirement(
      "approval_draft_read_only",
      "Approval draft must remain read-only",
      approvalDraftRequirement(input.approvalDraft),
      "Approval draft refs may be displayed, but App approve/reject controls stay disabled.",
      safeRef(input.approvalDraft, "approvalDraftId")
    ),
    requirement(
      "capability_plan_no_lease",
      "Capability plan cannot issue leases",
      capabilityPlanRequirement(input.capabilityPlan),
      "Capability planning stays display-only and cannot issue a PermissionLease.",
      safeRef(input.capabilityPlan, "planId")
    ),
    requirement(
      "context_replay_evidence",
      "Replay projection must reconstruct state before future execution",
      hasRef(input.contextAssembly, "previewId") ||
        hasRef(input.contextAssembly, "assemblyId")
        ? "met"
        : "missing",
      "Context and replay evidence are prerequisites for a later approval execution gate.",
      safeRef(input.contextAssembly, "previewId") ||
        safeRef(input.contextAssembly, "assemblyId")
    ),
    requirement(
      "production_permission_lease_design",
      "Production PermissionLease design is required",
      "deferred",
      "This task does not issue production PermissionLease objects.",
      ""
    ),
    requirement(
      "manual_confirmation_required",
      "Manual user confirmation is required in a future phase",
      "deferred",
      "A later phase must design explicit confirmation before execution.",
      safeRef(input.auditSurface, "source")
    ),
    requirement(
      "app_approval_execution_disabled",
      "App approval execution remains disabled",
      "disabled",
      "Approve, reject, issue lease, apply, rollback, write events, commit, and execute controls are disabled.",
      ""
    )
  ];
}

function requirement(
  requirementId: string,
  label: string,
  status: AppApprovalExecutionDesignRequirementStatus,
  summary: string,
  relatedRef: string
): AppApprovalExecutionDesignRequirement {
  return {
    requirementId,
    label,
    status,
    summary,
    relatedRef: safeErrorMessage(relatedRef)
  };
}

function warningsFrom(
  requirements: readonly AppApprovalExecutionDesignRequirement[]
): AppApprovalExecutionDesignWarning[] {
  return requirements
    .filter(
      (requirement) =>
        requirement.status === "missing" ||
        requirement.status === "deferred" ||
        requirement.status === "disabled"
    )
    .map((requirement) => ({
      code: `APP_APPROVAL_EXECUTION_${requirement.status.toUpperCase()}_${requirement.requirementId.toUpperCase()}`,
      safeMessage: requirement.summary
    }));
}

function disabledRuntimeRequirement(
  value: unknown,
  kind: "apply" | "rollback"
): AppApprovalExecutionDesignRequirementStatus {
  if (!isRecord(value)) {
    return "missing";
  }
  const buttonKey =
    kind === "apply" ? "applyButtonEnabled" : "rollbackButtonEnabled";
  if (
    value.appExecutionConnected === true ||
    value.userWorkspaceMutationEnabled === true ||
    value[buttonKey] === true
  ) {
    return "blocked";
  }
  return value.runtimePrototypeOnly === true ? "met" : "missing";
}

function eventWriterRequirement(
  value: unknown
): AppApprovalExecutionDesignRequirementStatus {
  if (!isRecord(value)) {
    return "missing";
  }
  if (
    value.appWriteConnected === true ||
    value.eventWriteButtonEnabled === true ||
    value.eventPayloadInputEnabled === true
  ) {
    return "blocked";
  }
  return value.runtimeOnly === true ? "met" : "missing";
}

function approvalDraftRequirement(
  value: unknown
): AppApprovalExecutionDesignRequirementStatus {
  if (!isRecord(value)) {
    return "missing";
  }
  const readiness = isRecord(value.readiness) ? value.readiness : {};
  if (
    readiness.canApprove === true ||
    readiness.canReject === true ||
    readiness.canIssueLease === true ||
    readiness.canApplyPatch === true
  ) {
    return "blocked";
  }
  return hasRef(value, "approvalDraftId") ? "met" : "missing";
}

function capabilityPlanRequirement(
  value: unknown
): AppApprovalExecutionDesignRequirementStatus {
  if (!isRecord(value)) {
    return "missing";
  }
  const readiness = isRecord(value.readiness) ? value.readiness : {};
  if (
    readiness.canIssuePermissionLease === true ||
    value.permissionLeaseIssuingEnabled === true ||
    value.executionEnabled === true
  ) {
    return "blocked";
  }
  return "met";
}

function hasReadyStatus(value: unknown, status: string): boolean {
  return (
    isRecord(value) &&
    value.status === status &&
    (typeof value.blockerCount !== "number" || value.blockerCount === 0)
  );
}

function hasRef(value: unknown, key: string): boolean {
  return safeRef(value, key).length > 0;
}

function safeRef(value: unknown, key: string): string {
  const record = isRecord(value) ? value : {};
  return safeErrorMessage(safeText(record[key], ""));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
