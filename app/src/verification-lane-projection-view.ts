import {
  normalizeTimelineItem,
  safeArray,
  safeErrorMessage,
  safeText,
  type WorkspaceEventSummary
} from "./safety.js";

export type AppVerificationLaneProjectionStatus =
  | "empty"
  | "projected"
  | "warning"
  | "blocked";

export type AppVerificationLaneEventKind =
  | "git.read_lane.executed"
  | "shell.verification_lane.executed";

export type AppVerificationLaneEvidenceRef = {
  id: string;
  kind: "git" | "shell";
  label: string;
  summary: string;
  hashPrefix: string;
  warningCodes: string[];
};

export type AppVerificationLaneTimelineItem = {
  eventId: string;
  eventType: AppVerificationLaneEventKind;
  ts: string;
  summary: string;
  status: "pass" | "fail" | "summary" | "unknown";
  changedFileCount?: number | undefined;
  exitCode?: number | undefined;
  hashPrefix: string;
};

export type AppVerificationLaneProjectionFinding = {
  code: string;
  severity: "warning" | "blocker";
  summary: string;
};

export type AppVerificationLaneProjectionReadiness = {
  canUseAsEvidenceRef: boolean;
  canShowInReplay: boolean;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canApprove: false;
  canReject: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type AppVerificationLaneProjectionView = {
  status: AppVerificationLaneProjectionStatus;
  projectionId: string;
  eventCount: number;
  gitEventCount: number;
  shellEventCount: number;
  warningCount: number;
  blockerCount: number;
  findingCount: number;
  latestStatus: "pass" | "fail" | "summary" | "unknown";
  latestGitChangedFileCount: number;
  latestShellStatus: "pass" | "fail" | "unknown";
  lastVerificationAt: string;
  evidenceRefCount: number;
  evidenceRefs: AppVerificationLaneEvidenceRef[];
  timeline: AppVerificationLaneTimelineItem[];
  findings: AppVerificationLaneProjectionFinding[];
  warningCodes: string[];
  projectionHash: string;
  hashPrefix: string;
  readiness: AppVerificationLaneProjectionReadiness;
  nextAction: string;
  source: "app_verification_lane_projection";
  summaryOnly: true;
};

const rawPrefix = "raw";
const unsafePatterns = [
  new RegExp(`\\b${rawPrefix}${"Stdout"}\\b|raw stdout`, "i"),
  new RegExp(`\\b${rawPrefix}${"Stderr"}\\b|raw stderr`, "i"),
  new RegExp(`\\b${rawPrefix}${"Diff"}\\b|raw diff`, "i"),
  new RegExp(`\\b${rawPrefix}${"Source"}\\b|raw source`, "i"),
  new RegExp(`\\b${rawPrefix}${"Prompt"}\\b|raw prompt`, "i"),
  /\bAuthorization\s*:/i,
  /\bBearer\s+[A-Za-z0-9._-]{16,}\b/,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/
];

export function buildVerificationLaneProjectionView(
  eventSummary?: WorkspaceEventSummary | null | undefined
): AppVerificationLaneProjectionView {
  if (eventSummary === undefined || eventSummary === null) {
    return emptyProjection();
  }

  const timeline = safeArray(eventSummary.timeline)
    .map(normalizeTimelineItem)
    .filter((item) => isVerificationEventType(item.type))
    .map((item) => verificationTimelineItem(item));
  const gitEventCount = finiteNumber(
    eventSummary.typeCounts?.["git.read_lane.executed"]
  );
  const shellEventCount = finiteNumber(
    eventSummary.typeCounts?.["shell.verification_lane.executed"]
  );
  const eventCount =
    finiteNumber(eventSummary.verificationEventCount) ||
    gitEventCount + shellEventCount ||
    timeline.length;
  const findings = projectionFindings(eventSummary, timeline, eventCount);
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const visibleTimeline =
    blockerCount > 0 &&
    findings.some(
      (finding) => finding.code === "VERIFICATION_RAW_OUTPUT_MARKER"
    )
      ? []
      : timeline;
  const warningCodes = uniqueStrings([
    ...findings.map((finding) => finding.code),
    ...safeStringArray(eventSummary.warnings),
    ...safeStringArray(eventSummary.safetyScan?.warningCodes)
  ]);
  const warningCount = warningCodes.length;
  const latest = visibleTimeline[visibleTimeline.length - 1];
  const latestGit = [...visibleTimeline]
    .reverse()
    .find((item) => item.eventType === "git.read_lane.executed");
  const latestShell = [...visibleTimeline]
    .reverse()
    .find((item) => item.eventType === "shell.verification_lane.executed");
  const evidenceRefs = visibleTimeline
    .slice(-8)
    .map((item, index) => evidenceRefFromTimeline(item, index));
  const projectionHash = hashText(
    JSON.stringify({
      eventCount,
      gitEventCount,
      shellEventCount,
      latestStatus: latest?.status,
      latestGitChangedFileCount: latestGit?.changedFileCount,
      latestShellStatus: latestShell?.status,
      lastVerificationAt: latest?.ts,
      evidenceRefs: evidenceRefs.map((ref) => ref.hashPrefix),
      warningCodes
    })
  );
  const status: AppVerificationLaneProjectionStatus =
    blockerCount > 0
      ? "blocked"
      : eventCount === 0
        ? "empty"
        : warningCount > 0 || visibleTimeline.length < eventCount
          ? "warning"
          : "projected";

  return {
    status,
    projectionId: `verification-projection-${projectionHash.slice(0, 12)}`,
    eventCount,
    gitEventCount,
    shellEventCount,
    warningCount,
    blockerCount,
    findingCount: findings.length,
    latestStatus: latest?.status ?? "unknown",
    latestGitChangedFileCount: latestGit?.changedFileCount ?? 0,
    latestShellStatus:
      latestShell?.status === "pass" || latestShell?.status === "fail"
        ? latestShell.status
        : "unknown",
    lastVerificationAt: safeText(latest?.ts, "n/a"),
    evidenceRefCount: evidenceRefs.length,
    evidenceRefs,
    timeline: visibleTimeline,
    findings,
    warningCodes,
    projectionHash,
    hashPrefix: projectionHash.slice(0, 12),
    readiness: readiness(status),
    nextAction: nextActionFor(status),
    source: "app_verification_lane_projection",
    summaryOnly: true
  };
}

export function summarizeVerificationLaneProjectionView(
  view: AppVerificationLaneProjectionView
): string {
  if (view.status === "empty") {
    return "No verification lane events are available.";
  }
  return [
    `status:${view.status}`,
    `events:${view.eventCount}`,
    `git:${view.gitEventCount}`,
    `shell_events=${view.shellEventCount}`,
    `latest:${view.latestStatus}`,
    `changed:${view.latestGitChangedFileCount}`,
    `shell_status:${view.latestShellStatus}`,
    `evidence:${view.evidenceRefCount}`,
    `hash:${view.hashPrefix}`
  ].join(" | ");
}

export function verificationLaneProjectionWarningCodes(
  view: AppVerificationLaneProjectionView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `VERIFICATION_PROJECTION_STATUS_${view.status.toUpperCase()}`,
    `VERIFICATION_EVENTS_${view.eventCount}`,
    `VERIFICATION_EVIDENCE_REFS_${view.evidenceRefCount}`,
    ...view.warningCodes
  ];
}

function emptyProjection(): AppVerificationLaneProjectionView {
  return {
    status: "empty",
    projectionId: "verification-projection-empty",
    eventCount: 0,
    gitEventCount: 0,
    shellEventCount: 0,
    warningCount: 0,
    blockerCount: 0,
    findingCount: 0,
    latestStatus: "unknown",
    latestGitChangedFileCount: 0,
    latestShellStatus: "unknown",
    lastVerificationAt: "n/a",
    evidenceRefCount: 0,
    evidenceRefs: [],
    timeline: [],
    findings: [],
    warningCodes: [],
    projectionHash: "empty",
    hashPrefix: "empty",
    readiness: readiness("empty"),
    nextAction: nextActionFor("empty"),
    source: "app_verification_lane_projection",
    summaryOnly: true
  };
}

function verificationTimelineItem(
  item: ReturnType<typeof normalizeTimelineItem>
): AppVerificationLaneTimelineItem {
  const changedFileCount = parseCount(item.summary, /(\d+)\s+changed files/i);
  const exitCode = parseCount(item.summary, /(-?\d+)\s+exit/i);
  const status =
    item.type === "shell.verification_lane.executed"
      ? exitCode === undefined
        ? "unknown"
        : exitCode === 0
          ? "pass"
          : "fail"
      : "summary";
  return {
    eventId: item.id,
    eventType: item.type as AppVerificationLaneEventKind,
    ts: item.ts,
    summary: safeErrorMessage(item.summary),
    status,
    ...(changedFileCount !== undefined ? { changedFileCount } : {}),
    ...(exitCode !== undefined ? { exitCode } : {}),
    hashPrefix: hashText(
      `${item.id}|${item.type}|${item.ts}|${item.summary}`
    ).slice(0, 12)
  };
}

function evidenceRefFromTimeline(
  item: AppVerificationLaneTimelineItem,
  index: number
): AppVerificationLaneEvidenceRef {
  const kind = item.eventType === "git.read_lane.executed" ? "git" : "shell";
  return {
    id: `verification-evidence-${item.eventId || index + 1}`,
    kind,
    label:
      kind === "git"
        ? "Git read lane verification summary"
        : "Shell verification lane summary",
    summary: item.summary,
    hashPrefix: item.hashPrefix,
    warningCodes:
      item.status === "fail"
        ? ["VERIFICATION_SHELL_EXIT_NONZERO"]
        : item.status === "unknown"
          ? ["VERIFICATION_STATUS_UNKNOWN"]
          : []
  };
}

function projectionFindings(
  eventSummary: WorkspaceEventSummary,
  timeline: readonly AppVerificationLaneTimelineItem[],
  eventCount: number
): AppVerificationLaneProjectionFinding[] {
  const findings: AppVerificationLaneProjectionFinding[] = [];
  const serialized = JSON.stringify({
    latestVerificationSummary: eventSummary.latestVerificationSummary,
    timeline: timeline.map((item) => ({
      eventType: item.eventType,
      summary: item.summary
    }))
  });
  if (unsafePatterns.some((pattern) => pattern.test(serialized))) {
    findings.push({
      code: "VERIFICATION_RAW_OUTPUT_MARKER",
      severity: "blocker",
      summary: "Verification projection detected a raw output or secret marker."
    });
  }
  if (eventSummary.ok === false) {
    findings.push({
      code: "VERIFICATION_EVENT_SUMMARY_UNAVAILABLE",
      severity: "warning",
      summary: "Event summary is unavailable or malformed."
    });
  }
  if (eventSummary.safetyScan?.ok === false) {
    findings.push({
      code: "VERIFICATION_EVENT_SAFETY_WARNING",
      severity: "warning",
      summary: "Event safety scan reported findings."
    });
  }
  if (eventCount > 0 && timeline.length === 0) {
    findings.push({
      code: "VERIFICATION_TIMELINE_MISSING",
      severity: "warning",
      summary:
        "Verification event counts exist but displayed timeline is missing."
    });
  }
  for (const item of timeline) {
    if (item.status === "fail") {
      findings.push({
        code: "VERIFICATION_SHELL_EXIT_NONZERO",
        severity: "warning",
        summary: "A shell verification lane returned a non-zero exit code."
      });
    }
    if (item.status === "unknown") {
      findings.push({
        code: "VERIFICATION_STATUS_UNKNOWN",
        severity: "warning",
        summary:
          "A verification event summary did not expose enough status metadata."
      });
    }
  }
  return findings;
}

function readiness(
  status: AppVerificationLaneProjectionStatus
): AppVerificationLaneProjectionReadiness {
  return {
    canUseAsEvidenceRef: status === "projected" || status === "warning",
    canShowInReplay: status !== "blocked",
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canApprove: false,
    canReject: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionFor(status: AppVerificationLaneProjectionStatus): string {
  if (status === "empty") {
    return "Run a fixed Git or shell verification lane, then refresh events.";
  }
  if (status === "blocked") {
    return "Remove raw output or secret markers before using verification summaries as evidence.";
  }
  if (status === "warning") {
    return "Review verification warning codes. Evidence remains summary-only and execution stays disabled.";
  }
  return "Use verification summaries as volatile evidence refs. No raw output or execution is enabled.";
}

function isVerificationEventType(
  value: string
): value is AppVerificationLaneEventKind {
  return (
    value === "git.read_lane.executed" ||
    value === "shell.verification_lane.executed"
  );
}

function parseCount(summary: string, pattern: RegExp): number | undefined {
  const match = pattern.exec(summary);
  if (match?.[1] === undefined) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeStringArray(value: unknown): string[] {
  return safeArray(value)
    .filter((item): item is string => typeof item === "string")
    .map((item) => safeText(item, ""))
    .filter((item) => item.length > 0);
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
