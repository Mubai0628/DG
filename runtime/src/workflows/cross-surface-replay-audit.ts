import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type CrossSurfaceReplayStageKind =
  | "objective"
  | "proposal"
  | "agent_route"
  | "knowledge_recall"
  | "mcp_evidence"
  | "plugin_skill_metadata"
  | "desktop_observer"
  | "desktop_proposal"
  | "desktop_approved_action"
  | "workspace_apply"
  | "verification"
  | "rollback"
  | "final_audit";

export type CrossSurfaceReplayAuditStatus =
  | "empty"
  | "timeline_ready"
  | "warning"
  | "blocked";

export type CrossSurfaceReplayAuditSeverity = "blocker" | "warning";

export type CrossSurfaceReplayAuditFinding = {
  findingId: string;
  severity: CrossSurfaceReplayAuditSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type CrossSurfaceReplayStageInput = {
  stage?: CrossSurfaceReplayStageKind | string | undefined;
  refId?: string | undefined;
  status?: string | undefined;
  summary?: string | undefined;
  hashPrefix?: string | undefined;
  warningCodes?: string[] | undefined;
  blockerCodes?: string[] | undefined;
  [key: string]: unknown;
};

export type CrossSurfaceReplayTimelineItem = {
  stage: CrossSurfaceReplayStageKind;
  refId: string;
  status: string;
  summaryHash: string;
  warningCodes: string[];
  blockerCodes: string[];
};

export type CrossSurfaceReplayAuditReadiness = {
  canRenderTimeline: boolean;
  canReplayExecution: false;
  canRerunActions: false;
  canWriteEventStore: false;
  canShowRawContent: false;
  canShowRawScreenshotOrOcr: false;
  canShowRawStdoutStderr: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteDesktopAction: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type CrossSurfaceReplayAuditInput = {
  timelineRefs?: CrossSurfaceReplayStageInput[] | undefined;
  sourceKind?: "runtime" | "app_preview" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CrossSurfaceReplayAuditTimeline = {
  status: CrossSurfaceReplayAuditStatus;
  timelineId: string;
  source: "runtime_cross_surface_replay_audit";
  sourceKind: "runtime" | "app_preview" | "fixture" | "manual_test";
  stageCount: number;
  presentStageCount: number;
  missingCriticalStageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  items: CrossSurfaceReplayTimelineItem[];
  missingCriticalStages: CrossSurfaceReplayStageKind[];
  findings: CrossSurfaceReplayAuditFinding[];
  timelineHash: string;
  readiness: CrossSurfaceReplayAuditReadiness;
  nextAction: string;
};

const stageKinds: CrossSurfaceReplayStageKind[] = [
  "objective",
  "proposal",
  "agent_route",
  "knowledge_recall",
  "mcp_evidence",
  "plugin_skill_metadata",
  "desktop_observer",
  "desktop_proposal",
  "desktop_approved_action",
  "workspace_apply",
  "verification",
  "rollback",
  "final_audit"
];

const stageKindSet = new Set<string>(stageKinds);

const emptyReadiness: CrossSurfaceReplayAuditReadiness = {
  canRenderTimeline: false,
  canReplayExecution: false,
  canRerunActions: false,
  canWriteEventStore: false,
  canShowRawContent: false,
  canShowRawScreenshotOrOcr: false,
  canShowRawStdoutStderr: false,
  canApplyPatch: false,
  canRollback: false,
  canExecuteDesktopAction: false,
  canExecuteGit: false,
  canExecuteShell: false,
  appCanExecute: false
};

const forbiddenFieldKeys = new Set(
  [
    "raw" + "Content",
    "raw" + "Event",
    "raw" + "Prompt",
    "raw" + "Response",
    "raw" + "Source",
    "raw" + "Diff",
    "raw" + "Patch",
    "raw" + "Screenshot",
    "raw" + "Ocr",
    "raw" + "OcrText",
    "raw" + "Stdout",
    "raw" + "Stderr",
    "stdout",
    "stderr",
    "fileContent",
    "apiKey",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "command",
    "shellCommand",
    "gitCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "desktopAction",
    "nativeBridge",
    "tools",
    "tool_choice"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "canReplayExecution",
    "canRerunActions",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canExecuteDesktopAction",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "claimsExecution"
  ].map((field) => field.toLowerCase())
);

export function validateCrossSurfaceReplayAuditInput(
  input: CrossSurfaceReplayAuditInput = {}
): CrossSurfaceReplayAuditFinding[] {
  return [
    ...findForbiddenFields(input),
    ...findUnsafeMarkers(input),
    ...findExecutionClaims(input),
    ...validateTimelineRefs(input.timelineRefs ?? [])
  ];
}

export function buildCrossSurfaceReplayAuditTimeline(
  input: CrossSurfaceReplayAuditInput = {}
): CrossSurfaceReplayAuditTimeline {
  const timelineId =
    input.idGenerator?.() ??
    `cross-surface-replay-${stablePreviewHash(stableStringify(input)).slice(0, 12)}`;
  const findings = validateCrossSurfaceReplayAuditInput(input);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const items = blockerCount > 0 ? [] : normalizeItems(input.timelineRefs ?? []);
  const missingCriticalStages =
    blockerCount > 0 ? [] : stageKinds.filter((stage) => !items.some((item) => item.stage === stage));

  if ((input.timelineRefs ?? []).length === 0) {
    return buildTimeline({
      timelineId,
      sourceKind: input.sourceKind ?? "runtime",
      status: blockerCount > 0 ? "blocked" : "empty",
      items,
      missingCriticalStages,
      findings: [...findings, finding("warning", "MISSING_TIMELINE_REFS")]
    });
  }

  return buildTimeline({
    timelineId,
    sourceKind: input.sourceKind ?? "runtime",
    status:
      blockerCount > 0
        ? "blocked"
        : missingCriticalStages.length > 0 ||
            items.some((item) => item.warningCodes.length > 0)
          ? "warning"
          : "timeline_ready",
    items,
    missingCriticalStages,
    findings
  });
}

export function summarizeCrossSurfaceReplayAuditTimeline(
  timeline: CrossSurfaceReplayAuditTimeline
): Pick<
  CrossSurfaceReplayAuditTimeline,
  | "status"
  | "timelineId"
  | "stageCount"
  | "presentStageCount"
  | "missingCriticalStageCount"
  | "blockerCount"
  | "warningCount"
  | "timelineHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: timeline.status,
    timelineId: timeline.timelineId,
    stageCount: timeline.stageCount,
    presentStageCount: timeline.presentStageCount,
    missingCriticalStageCount: timeline.missingCriticalStageCount,
    blockerCount: timeline.blockerCount,
    warningCount: timeline.warningCount,
    timelineHash: timeline.timelineHash,
    readiness: timeline.readiness,
    nextAction: timeline.nextAction,
    source: timeline.source
  };
}

function buildTimeline(input: {
  timelineId: string;
  sourceKind: CrossSurfaceReplayAuditTimeline["sourceKind"];
  status: CrossSurfaceReplayAuditStatus;
  items: CrossSurfaceReplayTimelineItem[];
  missingCriticalStages: CrossSurfaceReplayStageKind[];
  findings: CrossSurfaceReplayAuditFinding[];
}): CrossSurfaceReplayAuditTimeline {
  const missingFindings = input.missingCriticalStages.map((stage) =>
    finding("warning", "MISSING_CRITICAL_STAGE", `stage:${stage}`)
  );
  const allFindings = dedupeFindings([...input.findings, ...missingFindings]);
  const blockerCount = allFindings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount =
    allFindings.filter((findingItem) => findingItem.severity === "warning")
      .length +
    input.items.reduce((count, item) => count + item.warningCodes.length, 0);
  const timelineHash = stablePreviewHash(
    stableStringify({
      timelineId: input.timelineId,
      sourceKind: input.sourceKind,
      status: input.status,
      items: input.items,
      missingCriticalStages: input.missingCriticalStages,
      findingCodes: allFindings.map((findingItem) => findingItem.code)
    })
  );
  return {
    status: input.status,
    timelineId: input.timelineId,
    source: "runtime_cross_surface_replay_audit",
    sourceKind: input.sourceKind,
    stageCount: stageKinds.length,
    presentStageCount: input.items.length,
    missingCriticalStageCount: input.missingCriticalStages.length,
    blockerCount,
    warningCount,
    findingCount: allFindings.length,
    items: input.items,
    missingCriticalStages: input.missingCriticalStages,
    findings: allFindings,
    timelineHash,
    readiness: {
      ...emptyReadiness,
      canRenderTimeline:
        input.status !== "blocked" && input.status !== "empty"
    },
    nextAction: nextActionFor(input.status)
  };
}

function normalizeItems(
  refs: CrossSurfaceReplayStageInput[]
): CrossSurfaceReplayTimelineItem[] {
  return refs.map((ref, index) => {
    const stage = safeText(ref.stage) as CrossSurfaceReplayStageKind;
    const refId = safeText(ref.refId, `timeline-ref-${index + 1}`);
    const summary = safeText(ref.summary, `${stage} summary`);
    return {
      stage,
      refId,
      status: safeText(ref.status, "summary_ready"),
      summaryHash: stablePreviewHash(
        stableStringify({
          stage,
          refId,
          status: ref.status,
          summary,
          hashPrefix: ref.hashPrefix
        })
      ).slice(0, 16),
      warningCodes: safeStringArray(ref.warningCodes),
      blockerCodes: safeStringArray(ref.blockerCodes)
    };
  });
}

function validateTimelineRefs(
  refs: CrossSurfaceReplayStageInput[]
): CrossSurfaceReplayAuditFinding[] {
  const findings: CrossSurfaceReplayAuditFinding[] = [];
  const seen = new Set<string>();
  refs.forEach((ref, index) => {
    const path = `timelineRefs.${index}`;
    const stage = safeText(ref.stage);
    const refId = safeText(ref.refId);
    const summary = safeText(ref.summary);
    if (!stageKindSet.has(stage)) {
      findings.push(finding("blocker", "UNKNOWN_TIMELINE_STAGE", path));
    }
    if (refId.length === 0) {
      findings.push(finding("blocker", "MISSING_REF_ID", path));
    } else if (seen.has(refId)) {
      findings.push(finding("blocker", "DUPLICATE_TIMELINE_REF", path));
    } else {
      seen.add(refId);
    }
    if (summary.length === 0) {
      findings.push(finding("blocker", "MISSING_STAGE_SUMMARY", path));
    }
  });
  return findings;
}

function findForbiddenFields(value: unknown): CrossSurfaceReplayAuditFinding[] {
  const findings: CrossSurfaceReplayAuditFinding[] = [];
  visit(value, (entry) => {
    if (forbiddenFieldKeys.has(entry.key.toLowerCase())) {
      findings.push(finding("blocker", "FORBIDDEN_RAW_FIELD", entry.path));
    }
  });
  return findings;
}

function findExecutionClaims(value: unknown): CrossSurfaceReplayAuditFinding[] {
  const findings: CrossSurfaceReplayAuditFinding[] = [];
  visit(value, (entry) => {
    if (
      executionClaimKeys.has(entry.key.toLowerCase()) &&
      entry.value === true
    ) {
      findings.push(finding("blocker", "EXECUTION_FLAG_TRUE", entry.path));
    }
  });
  return findings;
}

function findUnsafeMarkers(value: unknown): CrossSurfaceReplayAuditFinding[] {
  const findings: CrossSurfaceReplayAuditFinding[] = [];
  visit(value, (entry) => {
    if (typeof entry.value !== "string") {
      return;
    }
    if (/\bBearer\s+[A-Za-z0-9._-]{12,}\b/.test(entry.value)) {
      findings.push(finding("blocker", "BEARER_TOKEN_MARKER", entry.path));
    }
    if (new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`).test(entry.value)) {
      findings.push(finding("blocker", "API_KEY_MARKER", entry.path));
    }
  });
  return findings;
}

function visit(
  value: unknown,
  callback: (entry: { key: string; value: unknown; path: string }) => void,
  path = "$"
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, callback, `${path}.${index}`));
    return;
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    callback({ key, value: child, path: childPath });
    visit(child, callback, childPath);
  }
}

function finding(
  severity: CrossSurfaceReplayAuditSeverity,
  code: string,
  path?: string
): CrossSurfaceReplayAuditFinding {
  return {
    findingId: `cross-surface-replay-${severity}-${code.toLowerCase()}-${stablePreviewHash(
      `${path ?? "root"}:${code}`
    ).slice(0, 12)}`,
    severity,
    code,
    safeMessage: safeMessageFor(code),
    ...(path !== undefined ? { path } : {})
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    MISSING_TIMELINE_REFS: "No replay/audit timeline refs were provided.",
    MISSING_CRITICAL_STAGE: "A critical cross-surface timeline stage is missing.",
    UNKNOWN_TIMELINE_STAGE: "Timeline stage kind is not allowed.",
    MISSING_REF_ID: "Timeline refs must include safe ref ids.",
    DUPLICATE_TIMELINE_REF: "Timeline refs must not reuse the same ref id.",
    MISSING_STAGE_SUMMARY: "Timeline refs must include summary text.",
    FORBIDDEN_RAW_FIELD:
      "Raw content, screenshot/OCR, stdout/stderr, command, or execution fields are not allowed.",
    EXECUTION_FLAG_TRUE: "Replay/audit timeline must not claim execution.",
    BEARER_TOKEN_MARKER: "Bearer token marker detected.",
    API_KEY_MARKER: "Secret-like API key marker detected."
  };
  return messages[code] ?? "Cross-surface replay/audit timeline finding.";
}

function nextActionFor(status: CrossSurfaceReplayAuditStatus): string {
  if (status === "empty") {
    return "Provide summary-only replay/audit timeline refs.";
  }
  if (status === "blocked") {
    return "Remove raw event/content and execution blockers before rendering the timeline.";
  }
  if (status === "warning") {
    return "Review missing critical stages. Timeline remains read-only.";
  }
  return "Review the summary-only replay/audit timeline.";
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/[^A-Z0-9_.-]/gi, "_").slice(0, 80))
    .filter((item) => item.length > 0);
}

function dedupeFindings(
  findings: CrossSurfaceReplayAuditFinding[]
): CrossSurfaceReplayAuditFinding[] {
  const seen = new Set<string>();
  return findings.filter((findingItem) => {
    const key = `${findingItem.severity}:${findingItem.code}:${findingItem.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .filter((key) => key !== "idGenerator")
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
