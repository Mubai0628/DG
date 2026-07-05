import { hashPatchObject } from "../patch/hash.js";
import {
  isPermissionMode,
  type PermissionMode,
  type PermissionModeSeverity
} from "./mode-policy.js";

export type ExecutionSessionControlStatus =
  | "active"
  | "paused"
  | "killed"
  | "expired"
  | "completed";

export type ExecutionSessionControlInput = {
  sessionId?: string | undefined;
  mode?: PermissionMode | string | undefined;
  status?: ExecutionSessionControlStatus | string | undefined;
  killSwitchVisible?: boolean | undefined;
  canPause?: boolean | undefined;
  canResume?: boolean | undefined;
  canKill?: boolean | undefined;
  metadataOnly?: boolean | undefined;
  startedAt?: string | undefined;
  expiresAt?: string | undefined;
  lastHeartbeatAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ExecutionKillSwitchState = {
  visible: true;
  canKill: true;
  killed: boolean;
  reasonCode: "not_triggered" | "killed" | "expired" | "completed";
};

export type ExecutionSessionControlFindingKind =
  | "mode"
  | "session"
  | "time"
  | "kill_switch"
  | "forbidden_field"
  | "secret_marker"
  | "readiness";

export type ExecutionSessionControlFinding = {
  findingId: string;
  kind: ExecutionSessionControlFindingKind;
  severity: PermissionModeSeverity;
  code: string;
  safeMessage: string;
};

export type ExecutionSessionControlReadiness = {
  canTrackSessionMetadata: boolean;
  canPause: boolean;
  canResume: boolean;
  canKill: boolean;
  canUseAsExecutionGrant: false;
  canRunArbitraryShell: false;
  canRecursiveDelete: false;
  canGitPush: false;
  canAutonomousLoop: false;
  canPersistRawOutput: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ExecutionSessionControlState = {
  status: ExecutionSessionControlStatus;
  stateStatus: "valid" | "warning" | "blocked";
  sessionId: string;
  mode: PermissionMode;
  killSwitchVisible: true;
  canPause: boolean;
  canResume: boolean;
  canKill: true;
  metadataOnly: boolean;
  startedAt: string;
  expiresAt: string;
  lastHeartbeatAt?: string | undefined;
  killSwitch: ExecutionKillSwitchState;
  findings: ExecutionSessionControlFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  sessionHash: string;
  readiness: ExecutionSessionControlReadiness;
  nextAction: string;
  source: "runtime_execution_session_control";
  summaryOnly: true;
};

const DEFAULT_STARTED_AT = "2026-07-06T00:00:00.000Z";
const DEFAULT_EXPIRES_AT = "2026-07-06T00:30:00.000Z";

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

export function buildExecutionSessionControlState(
  input: ExecutionSessionControlInput = {}
): ExecutionSessionControlState {
  const findings = validateSession(input);
  const blockerCount = count(findings, "blocker");
  const warningCount = count(findings, "warning");
  const stateStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "valid";
  const mode = isPermissionMode(input.mode) ? input.mode : "approval_mode";
  const status = isSessionStatus(input.status) ? input.status : "active";
  const startedAt = safeIso(input.startedAt, DEFAULT_STARTED_AT);
  const expiresAt = safeIso(input.expiresAt, DEFAULT_EXPIRES_AT);
  const metadataOnly = input.metadataOnly === true || mode !== "approval_mode";
  const canResume = status === "paused" && metadataOnly && blockerCount === 0;
  const sessionHash = hashPatchObject({
    sessionId: safeOptionalText(input.sessionId),
    mode,
    status,
    killSwitchVisible: true,
    canPause: true,
    canResume,
    canKill: true,
    metadataOnly,
    startedAt,
    expiresAt,
    lastHeartbeatAt: safeOptionalIso(input.lastHeartbeatAt)
  });

  return {
    status,
    stateStatus,
    sessionId:
      safeOptionalText(input.sessionId) ??
      input.idGenerator?.() ??
      `execution-session-${sessionHash.slice(0, 12)}`,
    mode,
    killSwitchVisible: true,
    canPause: status === "active" || status === "paused",
    canResume,
    canKill: true,
    metadataOnly,
    startedAt,
    expiresAt,
    lastHeartbeatAt: safeOptionalIso(input.lastHeartbeatAt),
    killSwitch: {
      visible: true,
      canKill: true,
      killed: status === "killed",
      reasonCode: killSwitchReason(status)
    },
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    sessionHash,
    readiness: readinessForSession(stateStatus, status, canResume),
    nextAction: nextActionFor(stateStatus, status),
    source: "runtime_execution_session_control",
    summaryOnly: true
  };
}

export function summarizeExecutionSessionControlState(
  state: ExecutionSessionControlState
): string {
  return [
    `state:${state.stateStatus}`,
    `status:${state.status}`,
    `mode:${state.mode}`,
    `session:${state.sessionId}`,
    `kill_switch:${state.killSwitchVisible ? "visible" : "hidden"}`,
    `pause:${state.canPause ? "available" : "unavailable"}`,
    `resume:${state.canResume ? "metadata_only" : "disabled"}`,
    `kill:${state.canKill ? "available" : "unavailable"}`,
    `blockers:${state.blockerCount}`,
    `warnings:${state.warningCount}`,
    `hash:${state.sessionHash.slice(0, 12)}`
  ].join(" | ");
}

function validateSession(
  input: ExecutionSessionControlInput
): ExecutionSessionControlFinding[] {
  const findings: ExecutionSessionControlFinding[] = [];
  const add = (
    kind: ExecutionSessionControlFindingKind,
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

  if (input.mode !== undefined && !isPermissionMode(input.mode)) {
    add(
      "mode",
      "blocker",
      "SESSION_CONTROL_MODE_UNKNOWN",
      "Mode is not recognized."
    );
  }
  if (input.status !== undefined && !isSessionStatus(input.status)) {
    add(
      "session",
      "blocker",
      "SESSION_CONTROL_STATUS_UNKNOWN",
      "Session control status is not recognized."
    );
  }
  if (input.killSwitchVisible !== true) {
    add(
      "kill_switch",
      "blocker",
      "SESSION_CONTROL_KILL_SWITCH_REQUIRED",
      "Kill switch must remain visible."
    );
  }
  if (input.canKill === false) {
    add(
      "kill_switch",
      "blocker",
      "SESSION_CONTROL_CAN_KILL_REQUIRED",
      "Kill control must remain available."
    );
  }
  if (input.canPause === false) {
    add(
      "session",
      "warning",
      "SESSION_CONTROL_CAN_PAUSE_DISABLED",
      "Pause control should remain available."
    );
  }
  if (input.canResume === true && input.metadataOnly !== true) {
    add(
      "session",
      "blocker",
      "SESSION_CONTROL_RESUME_EXECUTION_DISABLED_V034",
      "Resume is disabled in v0.34 unless the session is metadata-only."
    );
  }

  const startedAt = safeIso(input.startedAt, DEFAULT_STARTED_AT);
  const expiresAt = safeIso(input.expiresAt, DEFAULT_EXPIRES_AT);
  if (Date.parse(expiresAt) <= Date.parse(startedAt)) {
    add(
      "time",
      "blocker",
      "SESSION_CONTROL_EXPIRED",
      "Session expiry must be after start time."
    );
  }
  if (
    input.lastHeartbeatAt !== undefined &&
    !safeOptionalIso(input.lastHeartbeatAt)
  ) {
    add(
      "time",
      "warning",
      "SESSION_CONTROL_HEARTBEAT_INVALID",
      "Last heartbeat timestamp is invalid and ignored."
    );
  }

  return findings;
}

function readinessForSession(
  stateStatus: ExecutionSessionControlState["stateStatus"],
  status: ExecutionSessionControlStatus,
  canResume: boolean
): ExecutionSessionControlReadiness {
  const noBlockers = stateStatus !== "blocked";
  return {
    canTrackSessionMetadata: noBlockers,
    canPause: noBlockers && (status === "active" || status === "paused"),
    canResume: noBlockers && canResume,
    canKill: noBlockers,
    canUseAsExecutionGrant: false,
    canRunArbitraryShell: false,
    canRecursiveDelete: false,
    canGitPush: false,
    canAutonomousLoop: false,
    canPersistRawOutput: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionFor(
  stateStatus: ExecutionSessionControlState["stateStatus"],
  status: ExecutionSessionControlStatus
): string {
  if (stateStatus === "blocked") {
    return "Fix session control blockers before using this metadata.";
  }
  if (status === "killed") {
    return "Session is killed. Do not resume execution.";
  }
  if (status === "expired") {
    return "Session is expired. Create a new metadata session if needed.";
  }
  if (status === "paused") {
    return "Session is paused. Resume remains metadata-only in v0.34.";
  }
  return "Session control metadata is valid; no execution is enabled.";
}

function isSessionStatus(
  value: unknown
): value is ExecutionSessionControlStatus {
  return (
    value === "active" ||
    value === "paused" ||
    value === "killed" ||
    value === "expired" ||
    value === "completed"
  );
}

function killSwitchReason(
  status: ExecutionSessionControlStatus
): ExecutionKillSwitchState["reasonCode"] {
  if (status === "killed") {
    return "killed";
  }
  if (status === "expired") {
    return "expired";
  }
  if (status === "completed") {
    return "completed";
  }
  return "not_triggered";
}

function scanForbidden(
  value: unknown,
  add: (
    kind: ExecutionSessionControlFindingKind,
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
        "SESSION_CONTROL_SECRET_MARKER_REJECTED",
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
        "SESSION_CONTROL_FORBIDDEN_FIELD_REJECTED",
        "Input contains a forbidden raw, secret, execution, or command field."
      );
    }
    if (
      [
        "canRunArbitraryShell",
        "canRecursiveDelete",
        "canGitPush",
        "canAutonomousLoop",
        "canPersistRawOutput",
        "canWriteEventStore",
        "canExecuteGit",
        "canExecuteShell",
        "appCanExecute"
      ].includes(key) &&
      nested === true
    ) {
      add(
        "readiness",
        "blocker",
        "SESSION_CONTROL_READINESS_TRUE_REJECTED",
        "Session control input cannot enable execution readiness in v0.34."
      );
    }
    scanForbidden(nested, add, seen);
  }
}

function safeOptionalText(value: unknown): string | undefined {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    !containsSecretLikeMarker(value)
    ? value.trim().slice(0, 160)
    : undefined;
}

function safeIso(value: unknown, fallback: string): string {
  return typeof value === "string" &&
    hasText(value) &&
    Number.isFinite(Date.parse(value))
    ? value
    : fallback;
}

function safeOptionalIso(value: unknown): string | undefined {
  return typeof value === "string" &&
    hasText(value) &&
    Number.isFinite(Date.parse(value))
    ? value
    : undefined;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
  findings: ExecutionSessionControlFinding[],
  severity: PermissionModeSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}
