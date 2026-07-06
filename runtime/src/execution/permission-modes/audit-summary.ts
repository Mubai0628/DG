import { hashPatchObject } from "../patch/hash.js";
import type { ExecutionRiskLevel } from "./execution-policy-engine.js";
import type { ExecutionRiskBudget } from "./risk-budget.js";
import type { ExecutionSessionControlState } from "./session-control.js";
import type { PermissionSessionLease } from "./session-lease.js";
import type {
  PermissionCapabilityFlag,
  PermissionMode,
  PermissionModePolicy,
  PermissionModeSeverity
} from "./mode-policy.js";

export type PermissionModeAuditEventKind =
  | "permission.mode.previewed"
  | "permission.session.lease_previewed"
  | "permission.policy.evaluated"
  | "permission.risk_budget.previewed"
  | "permission.kill_switch.previewed";

export type PermissionModeAuditStatus =
  | "empty"
  | "valid"
  | "warning"
  | "blocked";

export type PermissionModeReplayStatus =
  | "empty"
  | "ready"
  | "warning"
  | "blocked";

export type PermissionModeAuditFindingKind =
  | "input"
  | "forbidden_field"
  | "secret_marker"
  | "readiness"
  | "event_preview";

export type PermissionModeAuditFinding = {
  findingId: string;
  kind: PermissionModeAuditFindingKind;
  severity: PermissionModeSeverity;
  code: string;
  safeMessage: string;
};

export type PermissionModeAuditEventPreview = {
  eventId: string;
  eventKind: PermissionModeAuditEventKind;
  status: "previewed" | "warning" | "blocked";
  mode?: PermissionMode | undefined;
  sourceRef?: string | undefined;
  capabilityKind?: string | undefined;
  riskLevel?: ExecutionRiskLevel | undefined;
  blockerCount: number;
  warningCount: number;
  hashPrefix: string;
  notWritten: true;
  summaryOnly: true;
};

export type PermissionModeReplayProjection = {
  status: PermissionModeReplayStatus;
  modePreviewCount: number;
  leasePreviewCount: number;
  policyDecisionCount: number;
  riskBudgetPreviewCount: number;
  killSwitchPreviewCount: number;
  blockedCapabilityCount: number;
  highRiskFutureCapabilityCount: number;
  killSwitchVisible: boolean;
  killSwitchTriggered: boolean;
  notWrittenCount: number;
  projectionHash: string;
  summaryOnly: true;
};

export type PermissionModeAuditReadiness = {
  canPreviewAudit: boolean;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canRunArbitraryShell: false;
  canRecursiveDelete: false;
  canGitPush: false;
  canAutonomousLoop: false;
  canPersistRawOutput: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type PermissionModePolicyDecisionSummary = {
  decisionId?: string | undefined;
  capabilityKind: string;
  status: string;
  riskLevel: ExecutionRiskLevel;
  blockerCount?: number | undefined;
  warningCount?: number | undefined;
  decisionHash?: string | undefined;
};

export type PermissionModeAuditInput = {
  modePolicy?: PermissionModePolicy | undefined;
  sessionLease?: PermissionSessionLease | undefined;
  policyDecisions?: readonly PermissionModePolicyDecisionSummary[] | undefined;
  riskBudget?:
    | (Pick<
        ExecutionRiskBudget,
        "status" | "budgetId" | "mode" | "blockerCount" | "warningCount"
      > & { budgetHash?: string | undefined; hashPrefix?: string | undefined })
    | undefined;
  sessionControl?:
    | (Pick<
        ExecutionSessionControlState,
        | "stateStatus"
        | "status"
        | "sessionId"
        | "mode"
        | "killSwitchVisible"
        | "canKill"
        | "blockerCount"
        | "warningCount"
      > & { sessionHash?: string | undefined; hashPrefix?: string | undefined })
    | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type PermissionModeAuditReport = {
  status: PermissionModeAuditStatus;
  auditId: string;
  latestModePreview?:
    | {
        mode: PermissionMode;
        status: PermissionModeAuditStatus;
        policyId: string;
        hashPrefix: string;
      }
    | undefined;
  latestLeasePreview?:
    | {
        mode: PermissionMode;
        status: PermissionModeAuditStatus;
        leaseId: string;
        hashPrefix: string;
      }
    | undefined;
  blockedCapabilityCount: number;
  highRiskFutureCapabilityCount: number;
  killSwitchVisible: boolean;
  killSwitchTriggered: boolean;
  eventPreviews: PermissionModeAuditEventPreview[];
  replayProjection: PermissionModeReplayProjection;
  findings: PermissionModeAuditFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: PermissionModeAuditReadiness;
  nextAction: string;
  source: "runtime_permission_mode_audit_summary";
  summaryOnly: true;
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
  "canWriteEventStore",
  "canRunArbitraryShell",
  "canRecursiveDelete",
  "canGitPush",
  "canAutonomousLoop",
  "canPersistRawOutput",
  "canExecuteGit",
  "canExecuteShell",
  "appCanExecute"
]);

export function buildPermissionModeAuditReport(
  input: PermissionModeAuditInput = {}
): PermissionModeAuditReport {
  const findings: PermissionModeAuditFinding[] = [];
  const add = (
    kind: PermissionModeAuditFindingKind,
    severity: PermissionModeSeverity,
    code: string,
    safeMessage: string
  ) => {
    findings.push({
      findingId: `${code.toLowerCase()}-${findings.length + 1}`,
      kind,
      severity,
      code,
      safeMessage
    });
  };

  scanForbidden(input, add);

  const eventPreviews = findings.some(
    (finding) => finding.severity === "blocker"
  )
    ? []
    : buildEventPreviews(input);
  if (eventPreviews.length === 0) {
    add(
      "event_preview",
      "warning",
      "PERMISSION_MODE_AUDIT_NO_PREVIEWS",
      "No permission mode audit previews were supplied."
    );
  }

  const eventBlockerCount = eventPreviews.filter(
    (event) => event.status === "blocked"
  ).length;
  if (eventBlockerCount > 0) {
    add(
      "event_preview",
      "blocker",
      "PERMISSION_MODE_AUDIT_BLOCKED_EVENT_PREVIEW",
      "One or more audit event previews are blocked."
    );
  }

  const blockerCount = count(findings, "blocker");
  const warningCount = count(findings, "warning");
  const status: PermissionModeAuditStatus =
    eventPreviews.length === 0 && blockerCount === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "valid";
  const replayProjection = buildReplayProjection(
    eventPreviews,
    input.modePolicy?.futureAllowedCapabilityFlags ?? [],
    input.sessionControl
  );
  const auditHash = hashPatchObject({
    status,
    modePolicy: input.modePolicy
      ? {
          policyId: input.modePolicy.policyId,
          mode: input.modePolicy.mode,
          hash: input.modePolicy.policyHash
        }
      : undefined,
    sessionLease: input.sessionLease
      ? {
          leaseId: input.sessionLease.leaseId,
          mode: input.sessionLease.mode,
          hash: input.sessionLease.leaseHash
        }
      : undefined,
    eventPreviews: eventPreviews.map((event) => ({
      eventKind: event.eventKind,
      status: event.status,
      mode: event.mode,
      capabilityKind: event.capabilityKind,
      riskLevel: event.riskLevel,
      hashPrefix: event.hashPrefix
    })),
    replayProjection,
    createdAt: input.createdAt
  });

  return {
    status,
    auditId:
      input.idGenerator?.() ?? `permission-audit-${auditHash.slice(0, 12)}`,
    latestModePreview: input.modePolicy
      ? {
          mode: input.modePolicy.mode,
          status: input.modePolicy.status,
          policyId: input.modePolicy.policyId,
          hashPrefix: input.modePolicy.policyHash.slice(0, 12)
        }
      : undefined,
    latestLeasePreview: input.sessionLease
      ? {
          mode: input.sessionLease.mode,
          status: input.sessionLease.status,
          leaseId: input.sessionLease.leaseId,
          hashPrefix: input.sessionLease.leaseHash.slice(0, 12)
        }
      : undefined,
    blockedCapabilityCount: replayProjection.blockedCapabilityCount,
    highRiskFutureCapabilityCount:
      replayProjection.highRiskFutureCapabilityCount,
    killSwitchVisible: replayProjection.killSwitchVisible,
    killSwitchTriggered: replayProjection.killSwitchTriggered,
    eventPreviews,
    replayProjection,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash,
    readiness: readinessForAudit(blockerCount === 0),
    nextAction: nextActionFor(status),
    source: "runtime_permission_mode_audit_summary",
    summaryOnly: true
  };
}

export function summarizePermissionModeAuditReport(
  report: PermissionModeAuditReport
): string {
  return [
    `status:${report.status}`,
    `events:${report.eventPreviews.length}`,
    `mode:${report.latestModePreview?.mode ?? "none"}`,
    `lease:${report.latestLeasePreview?.leaseId ?? "none"}`,
    `blocked_capabilities:${report.blockedCapabilityCount}`,
    `future_high_risk:${report.highRiskFutureCapabilityCount}`,
    `kill_switch:${report.killSwitchVisible ? "visible" : "missing"}`,
    `kill_triggered:${report.killSwitchTriggered ? "yes" : "no"}`,
    `eventstore_write:no`,
    `hash:${report.auditHash.slice(0, 12)}`
  ].join(" | ");
}

function buildEventPreviews(
  input: PermissionModeAuditInput
): PermissionModeAuditEventPreview[] {
  const events: PermissionModeAuditEventPreview[] = [];
  const push = (
    eventKind: PermissionModeAuditEventKind,
    item: {
      status?: string | undefined;
      mode?: PermissionMode | undefined;
      sourceRef?: string | undefined;
      capabilityKind?: string | undefined;
      riskLevel?: ExecutionRiskLevel | undefined;
      blockerCount?: number | undefined;
      warningCount?: number | undefined;
      hashPrefix?: string | undefined;
    }
  ) => {
    const hashPrefix = safeHashPrefix(item.hashPrefix, {
      eventKind,
      mode: item.mode,
      sourceRef: item.sourceRef,
      capabilityKind: item.capabilityKind,
      riskLevel: item.riskLevel,
      status: item.status,
      blockerCount: item.blockerCount ?? 0,
      warningCount: item.warningCount ?? 0
    });
    events.push({
      eventId: `${eventKind}-${hashPrefix}`,
      eventKind,
      status: eventStatus(
        item.status,
        item.blockerCount ?? 0,
        item.warningCount ?? 0
      ),
      mode: item.mode,
      sourceRef: item.sourceRef,
      capabilityKind: item.capabilityKind,
      riskLevel: item.riskLevel,
      blockerCount: item.blockerCount ?? 0,
      warningCount: item.warningCount ?? 0,
      hashPrefix,
      notWritten: true,
      summaryOnly: true
    });
  };

  if (input.modePolicy) {
    push("permission.mode.previewed", {
      status: input.modePolicy.status,
      mode: input.modePolicy.mode,
      sourceRef: input.modePolicy.policyId,
      blockerCount: input.modePolicy.blockerCount,
      warningCount: input.modePolicy.warningCount,
      hashPrefix: input.modePolicy.policyHash
    });
  }
  if (input.sessionLease) {
    push("permission.session.lease_previewed", {
      status: input.sessionLease.status,
      mode: input.sessionLease.mode,
      sourceRef: input.sessionLease.leaseId,
      blockerCount: input.sessionLease.blockerCount,
      warningCount: input.sessionLease.warningCount,
      hashPrefix: input.sessionLease.leaseHash
    });
  }
  for (const decision of input.policyDecisions ?? []) {
    push("permission.policy.evaluated", {
      status: decision.status,
      sourceRef: decision.decisionId,
      capabilityKind: decision.capabilityKind,
      riskLevel: decision.riskLevel,
      blockerCount: decision.blockerCount,
      warningCount: decision.warningCount,
      hashPrefix: decision.decisionHash
    });
  }
  if (input.riskBudget) {
    push("permission.risk_budget.previewed", {
      status: input.riskBudget.status,
      mode: input.riskBudget.mode,
      sourceRef: input.riskBudget.budgetId,
      blockerCount: input.riskBudget.blockerCount,
      warningCount: input.riskBudget.warningCount,
      hashPrefix: input.riskBudget.budgetHash ?? input.riskBudget.hashPrefix
    });
  }
  if (input.sessionControl) {
    push("permission.kill_switch.previewed", {
      status: input.sessionControl.stateStatus,
      mode: input.sessionControl.mode,
      sourceRef: input.sessionControl.sessionId,
      blockerCount: input.sessionControl.blockerCount,
      warningCount: input.sessionControl.warningCount,
      hashPrefix:
        input.sessionControl.sessionHash ?? input.sessionControl.hashPrefix
    });
  }
  return events;
}

function buildReplayProjection(
  events: readonly PermissionModeAuditEventPreview[],
  futureAllowedCapabilityFlags: readonly PermissionCapabilityFlag[],
  sessionControl: PermissionModeAuditInput["sessionControl"]
): PermissionModeReplayProjection {
  const blockedCapabilityCount = events.filter(
    (event) =>
      event.eventKind === "permission.policy.evaluated" &&
      event.status === "blocked"
  ).length;
  const highRiskFutureCapabilityCount = futureAllowedCapabilityFlags.length;
  const killSwitchVisible = sessionControl?.killSwitchVisible === true;
  const killSwitchTriggered = sessionControl?.status === "killed";
  const blockedCount = events.filter(
    (event) => event.status === "blocked"
  ).length;
  const warningCount = events.filter(
    (event) => event.status === "warning"
  ).length;
  const status: PermissionModeReplayStatus =
    events.length === 0
      ? "empty"
      : blockedCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "ready";
  const projectionHash = hashPatchObject({
    status,
    eventKinds: events.map((event) => event.eventKind),
    blockedCapabilityCount,
    highRiskFutureCapabilityCount,
    killSwitchVisible,
    killSwitchTriggered
  });

  return {
    status,
    modePreviewCount: countEvents(events, "permission.mode.previewed"),
    leasePreviewCount: countEvents(
      events,
      "permission.session.lease_previewed"
    ),
    policyDecisionCount: countEvents(events, "permission.policy.evaluated"),
    riskBudgetPreviewCount: countEvents(
      events,
      "permission.risk_budget.previewed"
    ),
    killSwitchPreviewCount: countEvents(
      events,
      "permission.kill_switch.previewed"
    ),
    blockedCapabilityCount,
    highRiskFutureCapabilityCount,
    killSwitchVisible,
    killSwitchTriggered,
    notWrittenCount: events.filter((event) => event.notWritten).length,
    projectionHash,
    summaryOnly: true
  };
}

function readinessForAudit(noBlockers: boolean): PermissionModeAuditReadiness {
  return {
    canPreviewAudit: noBlockers,
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
  };
}

function eventStatus(
  status: string | undefined,
  blockerCount: number,
  warningCount: number
): PermissionModeAuditEventPreview["status"] {
  if (blockerCount > 0 || status === "blocked") {
    return "blocked";
  }
  if (
    warningCount > 0 ||
    status === "warning" ||
    status === "future_mode_only" ||
    status === "metadata_only"
  ) {
    return "warning";
  }
  return "previewed";
}

function nextActionFor(status: PermissionModeAuditStatus): string {
  if (status === "blocked") {
    return "Fix audit blockers before using this replay projection.";
  }
  if (status === "warning") {
    return "Review audit warnings. EventStore write and execution remain disabled.";
  }
  if (status === "empty") {
    return "Preview a permission mode before reviewing audit projection.";
  }
  return "Audit preview is summary-only and ready for replay inspection.";
}

function scanForbidden(
  value: unknown,
  add: (
    kind: PermissionModeAuditFindingKind,
    severity: PermissionModeSeverity,
    code: string,
    safeMessage: string
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
        "PERMISSION_MODE_AUDIT_SECRET_MARKER_REJECTED",
        "Audit input contains a secret-like marker."
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
        "PERMISSION_MODE_AUDIT_FORBIDDEN_FIELD_REJECTED",
        "Audit input contains a forbidden raw, secret, execution, or command field."
      );
    }
    if (readinessFields.has(key) && nested === true) {
      add(
        "readiness",
        "blocker",
        "PERMISSION_MODE_AUDIT_READINESS_TRUE_REJECTED",
        "Audit input cannot enable execution or EventStore readiness."
      );
    }
    scanForbidden(nested, add, seen);
  }
}

function safeHashPrefix(value: unknown, fallback: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().slice(0, 12);
  }
  return hashPatchObject(fallback).slice(0, 12);
}

function containsSecretLikeMarker(value: string): boolean {
  return (
    /\bsk-[A-Za-z0-9_-]{6,}/.test(value) ||
    /\bBearer\s+[A-Za-z0-9._-]+/i.test(value) ||
    /\bAuthorization\b/i.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
  );
}

function countEvents(
  events: readonly PermissionModeAuditEventPreview[],
  eventKind: PermissionModeAuditEventKind
): number {
  return events.filter((event) => event.eventKind === eventKind).length;
}

function count(
  findings: readonly PermissionModeAuditFinding[],
  severity: PermissionModeSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}
