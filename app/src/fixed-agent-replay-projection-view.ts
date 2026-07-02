import type {
  FixedMultiAgentRunView,
  FixedMultiAgentRunStatus
} from "./fixed-multi-agent-run-view.js";
import {
  normalizeTimelineItem,
  safeArray,
  safeErrorMessage,
  safeText,
  type WorkspaceEventSummary
} from "./safety.js";

export type FixedAgentEventType =
  | "agent.run.planned"
  | "agent.stage.completed"
  | "agent.handoff.created"
  | "agent.review.completed"
  | "agent.verify.completed"
  | "agent.run.completed"
  | "agent.run.blocked";

export type FixedAgentReplayProjectionStatus =
  | "empty"
  | "projected"
  | "warning"
  | "blocked";

export type FixedAgentReplayEventSummary = {
  eventId: string;
  eventType: FixedAgentEventType;
  role?: string | undefined;
  stage: string;
  summary: string;
  artifactRefCount: number;
  findingCount: number;
  warningCodes: string[];
  hashPrefix: string;
  summaryOnly: true;
};

export type FixedAgentReplayRoleStage = {
  stageId: string;
  role: string;
  status: "planned" | "completed" | "warning" | "blocked";
  summary: string;
  warningCodes: string[];
};

export type FixedAgentReplayFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type FixedAgentReplayProjectionView = {
  status: FixedAgentReplayProjectionStatus;
  projectionId: string;
  agentRunCount: number;
  persistedAgentEventCount: number;
  virtualAgentEventCount: number;
  latestRoute: string[];
  roleStageTimeline: FixedAgentReplayRoleStage[];
  eventTimeline: FixedAgentReplayEventSummary[];
  summaryRefs: string[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: FixedAgentReplayFinding[];
  projectionHash: string;
  projectionHashPrefix: string;
  readiness: {
    canPreviewReplay: boolean;
    canWriteEventStore: false;
    canExecuteAgents: false;
    canInvokeTools: false;
    canApplyPatch: false;
    canRollback: false;
    canExecuteGit: false;
    canExecuteShell: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "app_fixed_agent_replay_projection";
  previewOnly: true;
  eventWritesEnabled: false;
};

export type FixedAgentReplayProjectionInput = {
  fixedMultiAgentRun?: FixedMultiAgentRunView | undefined;
  eventSummary?: WorkspaceEventSummary | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const rawPrefix = "raw";
const authorizationField = ["Author", "ization"].join("");
const forbiddenFieldNames = new Set(
  [
    rawPrefix + "Prompt",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Response",
    rawPrefix + "ModelResponse",
    rawPrefix + "Output",
    rawPrefix + "ToolOutput",
    "promptText",
    "sourceText",
    "diffText",
    "responseText",
    "reasoning" + "_content",
    "reasoningContent",
    "stdout",
    "stderr",
    "fileContent",
    "api" + "Key",
    authorizationField,
    "bear" + "er",
    "to" + "ken",
    "secret",
    "password",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge",
    "tools",
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authorizationField}\\s*[:=]`, "i")
  },
  {
    code: "RAW_CONTENT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}(Prompt|Source|Diff|Response)\\b`, "i")
  },
  {
    code: "REASONING_CONTENT_MARKER",
    pattern: /reasoning_content/i
  }
];

const agentEventTypes = new Set<FixedAgentEventType>([
  "agent.run.planned",
  "agent.stage.completed",
  "agent.handoff.created",
  "agent.review.completed",
  "agent.verify.completed",
  "agent.run.completed",
  "agent.run.blocked"
]);

export function buildFixedAgentReplayProjectionView(
  input: FixedAgentReplayProjectionInput = {}
): FixedAgentReplayProjectionView {
  const inputFindings = inputFindingsFrom(input);
  const fixedRun = input.fixedMultiAgentRun;
  const persistedEvents = persistedAgentEvents(input.eventSummary);
  const virtualEvents =
    fixedRun === undefined || fixedRun.status === "empty"
      ? []
      : virtualEventsFrom(fixedRun);
  const roleStageTimeline =
    fixedRun === undefined || fixedRun.status === "empty"
      ? []
      : fixedRun.stages
          .filter((stage) => stage.role !== undefined)
          .map((stage) => ({
            stageId: stage.stageId,
            role: stage.role ?? "unknown",
            status: roleStageStatus(stage.status),
            summary: safeErrorMessage(stage.summary),
            warningCodes: stage.warningCodes
          }));
  const findings = uniqueFindings([
    ...inputFindings,
    ...(fixedRun?.findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      safeMessage: finding.safeMessage
    })) ?? [])
  ]);
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningFindingCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const warningCount =
    warningFindingCount + (fixedRun?.warningCount ?? 0) + persistedEvents.length;
  const projectionHash = hashText(
    stableStringify({
      fixedRun: fixedRun?.runHash,
      persisted: persistedEvents.map((event) => [
        event.eventType,
        event.hashPrefix
      ]),
      virtual: virtualEvents.map((event) => [event.eventType, event.hashPrefix]),
      findings: findings.map((finding) => [finding.code, finding.severity])
    })
  );
  const hasInput =
    fixedRun !== undefined ||
    persistedEvents.length > 0 ||
    inputFindings.length > 0;
  const status = statusFrom({
    hasInput,
    fixedRunStatus: fixedRun?.status,
    blockerCount,
    warningCount
  });

  return {
    status,
    projectionId:
      input.idGenerator?.() ??
      `fixed-agent-replay-${projectionHash.slice(0, 12)}`,
    agentRunCount:
      (fixedRun !== undefined && fixedRun.status !== "empty" ? 1 : 0) +
      finiteNumber(input.eventSummary?.typeCounts?.["agent.run.planned"]),
    persistedAgentEventCount: persistedEvents.length,
    virtualAgentEventCount: virtualEvents.length,
    latestRoute: fixedRun?.route ?? [],
    roleStageTimeline,
    eventTimeline: [...virtualEvents, ...persistedEvents],
    summaryRefs: summaryRefsFrom(fixedRun, persistedEvents),
    blockerCount,
    warningCount,
    findingCount: findings.length,
    findings,
    projectionHash,
    projectionHashPrefix: projectionHash.slice(0, 12),
    readiness: readiness(status !== "empty" && blockerCount === 0),
    nextAction: nextActionFor(status),
    source: "app_fixed_agent_replay_projection",
    previewOnly: true,
    eventWritesEnabled: false
  };
}

export function summarizeFixedAgentReplayProjectionView(
  view: FixedAgentReplayProjectionView
): string {
  return [
    `status=${view.status}`,
    `agent_runs=${view.agentRunCount}`,
    `virtual_events=${view.virtualAgentEventCount}`,
    `persisted_events=${view.persistedAgentEventCount}`,
    `blockers=${view.blockerCount}`,
    `warnings=${view.warningCount}`,
    `hash=${view.projectionHashPrefix}`
  ].join(" ");
}

function virtualEventsFrom(
  fixedRun: FixedMultiAgentRunView
): FixedAgentReplayEventSummary[] {
  const planned = replayEventSummary({
    eventType: "agent.run.planned",
    stage: "planned",
    summary: `fixed route:${fixedRun.route.join("/")}`,
    warningCodes: fixedRun.findings.map((finding) => finding.code),
    ref: fixedRun.runId
  });
  const handoffs = fixedRun.handoffs.map((handoff) =>
    replayEventSummary({
      eventType: "agent.handoff.created",
      role: handoff.toRole,
      stage: `${handoff.fromRole}_to_${handoff.toRole}`,
      summary: `handoff refs:${handoff.evidenceRefCount}`,
      artifactRefCount: handoff.evidenceRefCount,
      warningCodes: handoff.warningCodes,
      ref: handoff.handoffId
    })
  );
  const review =
    fixedRun.roles.includes("reviewer")
      ? [
          replayEventSummary({
            eventType: "agent.review.completed",
            role: "reviewer",
            stage: "reviewer",
            summary: "review summary projected; approval execution disabled",
            warningCodes: fixedRun.findings.map((finding) => finding.code),
            ref: `${fixedRun.runId}-review`
          })
        ]
      : [];
  const verify =
    fixedRun.roles.includes("verifier")
      ? [
          replayEventSummary({
            eventType: "agent.verify.completed",
            role: "verifier",
            stage: "verifier",
            summary: "verification summary projected; Git/shell execution disabled",
            warningCodes: fixedRun.findings.map((finding) => finding.code),
            ref: `${fixedRun.runId}-verify`
          })
        ]
      : [];
  const finalEvent = replayEventSummary({
    eventType:
      fixedRun.status === "blocked" ? "agent.run.blocked" : "agent.run.completed",
    stage: fixedRun.status === "blocked" ? "blocked" : "completed",
    summary: `fixed run projection:${fixedRun.status}`,
    findingCount: fixedRun.findingCount,
    warningCodes: fixedRun.findings.map((finding) => finding.code),
    ref: `${fixedRun.runId}-final`
  });
  return [planned, ...handoffs, ...review, ...verify, finalEvent];
}

function persistedAgentEvents(
  eventSummary: WorkspaceEventSummary | undefined
): FixedAgentReplayEventSummary[] {
  return safeArray(eventSummary?.timeline)
    .map(normalizeTimelineItem)
    .filter((item) => agentEventTypes.has(item.type as FixedAgentEventType))
    .map((item) =>
      replayEventSummary({
        eventType: item.type as FixedAgentEventType,
        stage: item.type.replace("agent.", ""),
        summary: safeErrorMessage(item.summary).slice(0, 160),
        warningCodes: item.safePayloadKeys.filter((key) =>
          key.toLowerCase().includes("warning")
        ),
        ref: item.id
      })
    );
}

function replayEventSummary(input: {
  eventType: FixedAgentEventType;
  role?: string | undefined;
  stage: string;
  summary: string;
  artifactRefCount?: number | undefined;
  findingCount?: number | undefined;
  warningCodes: string[];
  ref: string;
}): FixedAgentReplayEventSummary {
  const hashPrefix = hashText(
    stableStringify({
      eventType: input.eventType,
      role: input.role,
      stage: input.stage,
      summary: input.summary,
      warningCodes: input.warningCodes,
      ref: input.ref
    })
  ).slice(0, 12);
  return {
    eventId: `${input.eventType}:${input.ref}`,
    eventType: input.eventType,
    ...(input.role !== undefined ? { role: input.role } : {}),
    stage: input.stage,
    summary: safeErrorMessage(input.summary).slice(0, 160),
    artifactRefCount: finiteNumber(input.artifactRefCount),
    findingCount: finiteNumber(input.findingCount),
    warningCodes: uniqueStrings(input.warningCodes),
    hashPrefix,
    summaryOnly: true
  };
}

function roleStageStatus(
  status: string
): FixedAgentReplayRoleStage["status"] {
  if (status === "blocked") {
    return "blocked";
  }
  if (status === "warning") {
    return "warning";
  }
  if (status === "ready") {
    return "completed";
  }
  return "planned";
}

function summaryRefsFrom(
  fixedRun: FixedMultiAgentRunView | undefined,
  persistedEvents: readonly FixedAgentReplayEventSummary[]
): string[] {
  return uniqueStrings([
    ...(fixedRun === undefined || fixedRun.status === "empty"
      ? []
      : [fixedRun.runId, fixedRun.runHashPrefix]),
    ...persistedEvents.map((event) => event.hashPrefix)
  ]);
}

function inputFindingsFrom(input: unknown): FixedAgentReplayFinding[] {
  const findings: FixedAgentReplayFinding[] = [];
  visit(input, [], (path, value) => {
    const key = path.at(-1);
    if (key !== undefined && forbiddenFieldNames.has(key.toLowerCase())) {
      findings.push({
        code: "FIXED_AGENT_REPLAY_FORBIDDEN_FIELD",
        severity: "blocker",
        safeMessage: "Fixed agent replay input contains a forbidden field."
      });
    }
    if (typeof value === "string") {
      for (const pattern of unsafeStringPatterns) {
        if (pattern.pattern.test(value)) {
          findings.push({
            code: pattern.code,
            severity: "blocker",
            safeMessage: "Fixed agent replay input contains an unsafe marker."
          });
        }
      }
    }
  });
  return uniqueFindings(findings);
}

function statusFrom(input: {
  hasInput: boolean;
  fixedRunStatus?: FixedMultiAgentRunStatus | undefined;
  blockerCount: number;
  warningCount: number;
}): FixedAgentReplayProjectionStatus {
  if (!input.hasInput) {
    return "empty";
  }
  if (input.blockerCount > 0 || input.fixedRunStatus === "blocked") {
    return "blocked";
  }
  if (input.warningCount > 0 || input.fixedRunStatus === "warning") {
    return "warning";
  }
  return "projected";
}

function nextActionFor(status: FixedAgentReplayProjectionStatus): string {
  if (status === "projected") {
    return "Review the fixed agent replay projection. No event is written and no agent is executed.";
  }
  if (status === "warning") {
    return "Review warning codes before using this replay summary downstream.";
  }
  if (status === "blocked") {
    return "Remove raw, secret, or execution fields before projecting agent replay.";
  }
  return "Preview a fixed multi-agent run before replay projection.";
}

function readiness(canPreview: boolean): FixedAgentReplayProjectionView["readiness"] {
  return {
    canPreviewReplay: canPreview,
    canWriteEventStore: false,
    canExecuteAgents: false,
    canInvokeTools: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function uniqueFindings(
  findings: readonly FixedAgentReplayFinding[]
): FixedAgentReplayFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.code}:${finding.severity}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function visit(
  value: unknown,
  path: string[],
  visitor: (path: string[], value: unknown) => void
): void {
  visitor(path, value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, [...path, String(index)], visitor));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      visit(child, [...path, key], visitor);
    }
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
