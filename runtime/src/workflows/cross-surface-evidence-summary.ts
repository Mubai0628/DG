import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type CrossSurfaceEvidenceKind =
  | "project_knowledge"
  | "mcp_readonly_metadata"
  | "mcp_readonly_tool_summary"
  | "plugin_metadata"
  | "skill_metadata"
  | "desktop_observer_metadata"
  | "desktop_action_proposal_summary";

export type CrossSurfaceEvidenceSummaryStatus =
  | "empty"
  | "summary_ready"
  | "warning"
  | "blocked";

export type CrossSurfaceEvidenceSummarySeverity = "blocker" | "warning";

export type CrossSurfaceEvidenceFindingKind =
  | "schema"
  | "raw_field"
  | "secret"
  | "execution_claim"
  | "duplicate_ref"
  | "evidence";

export type CrossSurfaceEvidenceFinding = {
  findingId: string;
  kind: CrossSurfaceEvidenceFindingKind;
  severity: CrossSurfaceEvidenceSummarySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type CrossSurfaceEvidenceRefInput = {
  refId?: string | undefined;
  kind?: CrossSurfaceEvidenceKind | string | undefined;
  status?: string | undefined;
  summary?: string | undefined;
  hashPrefix?: string | undefined;
  warningCodes?: string[] | undefined;
  blockerCodes?: string[] | undefined;
  warningCount?: number | undefined;
  blockerCount?: number | undefined;
  summaryOnly?: boolean | undefined;
  readiness?: Record<string, unknown> | undefined;
  [key: string]: unknown;
};

export type CrossSurfaceEvidenceSummaryRef = {
  refId: string;
  kind: CrossSurfaceEvidenceKind;
  status: string;
  summaryHash: string;
  warningCodes: string[];
  blockerCodes: string[];
};

export type CrossSurfaceEvidenceWorkflowSummaryRef = {
  stepKind:
    | "knowledge_recall"
    | "mcp_evidence"
    | "plugin_skill_metadata"
    | "desktop_observer"
    | "desktop_proposal";
  refId: string;
  status: string;
  summary: string;
  warningCodes: string[];
  blockerCodes: string[];
  hashPrefix: string;
};

export type CrossSurfaceEvidenceReadiness = {
  canAttachToWorkflowPreview: boolean;
  canReadProjectRawMemory: false;
  canReadMcpResourceContent: false;
  canCallMcpTool: false;
  canExecutePluginRuntime: false;
  canExecuteSkillRuntime: false;
  canTriggerDesktopObserver: false;
  canExecuteDesktopAction: false;
  canCallDeepSeek: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type CrossSurfaceEvidenceSummaryInput = {
  evidenceRefs?: CrossSurfaceEvidenceRefInput[] | undefined;
  sourceKind?: "runtime" | "app_paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CrossSurfaceEvidenceSummary = {
  status: CrossSurfaceEvidenceSummaryStatus;
  evidenceSummaryId: string;
  source: "runtime_cross_surface_evidence_summary";
  sourceKind: "runtime" | "app_paste" | "fixture" | "manual_test";
  evidenceCount: number;
  kindCounts: Record<CrossSurfaceEvidenceKind, number>;
  warningCount: number;
  blockerCount: number;
  findingCount: number;
  refs: CrossSurfaceEvidenceSummaryRef[];
  workflowSummaryRefs: CrossSurfaceEvidenceWorkflowSummaryRef[];
  findings: CrossSurfaceEvidenceFinding[];
  evidenceHash: string;
  readiness: CrossSurfaceEvidenceReadiness;
  nextAction: string;
};

const evidenceKinds: CrossSurfaceEvidenceKind[] = [
  "project_knowledge",
  "mcp_readonly_metadata",
  "mcp_readonly_tool_summary",
  "plugin_metadata",
  "skill_metadata",
  "desktop_observer_metadata",
  "desktop_action_proposal_summary"
];

const evidenceKindSet = new Set<string>(evidenceKinds);

const emptyReadiness: CrossSurfaceEvidenceReadiness = {
  canAttachToWorkflowPreview: false,
  canReadProjectRawMemory: false,
  canReadMcpResourceContent: false,
  canCallMcpTool: false,
  canExecutePluginRuntime: false,
  canExecuteSkillRuntime: false,
  canTriggerDesktopObserver: false,
  canExecuteDesktopAction: false,
  canCallDeepSeek: false,
  canWriteEventStore: false,
  canApplyPatch: false,
  canRollback: false,
  canExecuteGit: false,
  canExecuteShell: false,
  appCanExecute: false
};

const rawPrefix = "raw";
const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    "promptText",
    rawPrefix + "Response",
    "responseText",
    "reasoningContent",
    "reasoning_content",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    rawPrefix + "OcrText",
    "rawMcpOutput",
    "resourceContent",
    "toolOutput",
    "rawDesktopScreenshot",
    "screenshotBytes",
    "rawPluginPackage",
    "packageContent",
    "fileContent",
    "preimageContent",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "env",
    "stdout",
    "stderr",
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
    "mcpToolInvoke",
    "pluginRuntime",
    "skillRuntime",
    "tools",
    "tool_choice"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "canReadProjectRawMemory",
    "canReadMcpResourceContent",
    "canCallMcpTool",
    "canExecutePluginRuntime",
    "canExecuteSkillRuntime",
    "canTriggerDesktopObserver",
    "canExecuteDesktopAction",
    "canCallDeepSeek",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "claimsExecution"
  ].map((field) => field.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: /\braw prompt\b|\brawPrompt\b/i
  },
  {
    code: "RAW_MCP_OUTPUT_MARKER",
    pattern: /\braw MCP output\b|\brawMcpOutput\b/i
  },
  {
    code: "RAW_SCREENSHOT_MARKER",
    pattern: /\braw screenshot\b|\brawDesktopScreenshot\b/i
  },
  {
    code: "PLUGIN_RAW_PACKAGE_MARKER",
    pattern: /\braw plugin package\b|\brawPluginPackage\b/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function validateCrossSurfaceEvidenceSummaryInput(
  input: CrossSurfaceEvidenceSummaryInput = {}
): CrossSurfaceEvidenceFinding[] {
  return [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input),
    ...findExecutionClaims(input),
    ...validateEvidenceRefs(input.evidenceRefs ?? [])
  ];
}

export function buildCrossSurfaceEvidenceSummary(
  input: CrossSurfaceEvidenceSummaryInput = {}
): CrossSurfaceEvidenceSummary {
  const evidenceSummaryId =
    input.idGenerator?.() ??
    `cross-surface-evidence-${stablePreviewHash(stableStringify(input)).slice(0, 12)}`;
  const findings = validateCrossSurfaceEvidenceSummaryInput(input);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningFindingCount = findings.filter(
    (findingItem) => findingItem.severity === "warning"
  ).length;

  if ((input.evidenceRefs ?? []).length === 0) {
    return buildSummary({
      evidenceSummaryId,
      sourceKind: input.sourceKind ?? "runtime",
      refs: [],
      workflowSummaryRefs: [],
      findings: [
        ...findings,
        finding("evidence", "warning", "MISSING_EVIDENCE_REFS")
      ],
      status: blockerCount > 0 ? "blocked" : "empty"
    });
  }

  const refs =
    blockerCount > 0 ? [] : normalizeEvidenceRefs(input.evidenceRefs ?? []);
  const workflowSummaryRefs = refs.map(toWorkflowSummaryRef);
  const status =
    blockerCount > 0
      ? "blocked"
      : warningFindingCount > 0 ||
          refs.some((ref) => ref.warningCodes.length > 0)
        ? "warning"
        : "summary_ready";

  return buildSummary({
    evidenceSummaryId,
    sourceKind: input.sourceKind ?? "runtime",
    refs,
    workflowSummaryRefs,
    findings,
    status
  });
}

export function summarizeCrossSurfaceEvidenceSummary(
  summary: CrossSurfaceEvidenceSummary
): Pick<
  CrossSurfaceEvidenceSummary,
  | "status"
  | "evidenceSummaryId"
  | "evidenceCount"
  | "kindCounts"
  | "warningCount"
  | "blockerCount"
  | "evidenceHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: summary.status,
    evidenceSummaryId: summary.evidenceSummaryId,
    evidenceCount: summary.evidenceCount,
    kindCounts: summary.kindCounts,
    warningCount: summary.warningCount,
    blockerCount: summary.blockerCount,
    evidenceHash: summary.evidenceHash,
    readiness: summary.readiness,
    nextAction: summary.nextAction,
    source: summary.source
  };
}

function buildSummary(input: {
  evidenceSummaryId: string;
  sourceKind: CrossSurfaceEvidenceSummary["sourceKind"];
  refs: CrossSurfaceEvidenceSummaryRef[];
  workflowSummaryRefs: CrossSurfaceEvidenceWorkflowSummaryRef[];
  findings: CrossSurfaceEvidenceFinding[];
  status: CrossSurfaceEvidenceSummaryStatus;
}): CrossSurfaceEvidenceSummary {
  const kindCounts = evidenceKinds.reduce(
    (counts, kind) => {
      counts[kind] = input.refs.filter((ref) => ref.kind === kind).length;
      return counts;
    },
    {} as Record<CrossSurfaceEvidenceKind, number>
  );
  const blockerCount = input.findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount =
    input.findings.filter((findingItem) => findingItem.severity === "warning")
      .length +
    input.refs.reduce(
      (count, ref) => count + ref.warningCodes.length + ref.blockerCodes.length,
      0
    );
  const evidenceHash = stablePreviewHash(
    stableStringify({
      evidenceSummaryId: input.evidenceSummaryId,
      sourceKind: input.sourceKind,
      refs: input.refs,
      workflowSummaryRefs: input.workflowSummaryRefs,
      findingCodes: input.findings.map((findingItem) => findingItem.code),
      status: input.status
    })
  );

  return {
    status: input.status,
    evidenceSummaryId: input.evidenceSummaryId,
    source: "runtime_cross_surface_evidence_summary",
    sourceKind: input.sourceKind,
    evidenceCount: input.refs.length,
    kindCounts,
    warningCount,
    blockerCount,
    findingCount: input.findings.length,
    refs: input.refs,
    workflowSummaryRefs: input.workflowSummaryRefs,
    findings: dedupeFindings(input.findings),
    evidenceHash,
    readiness: {
      ...emptyReadiness,
      canAttachToWorkflowPreview:
        input.status !== "blocked" && input.status !== "empty"
    },
    nextAction: nextActionFor(input.status)
  };
}

function normalizeEvidenceRefs(
  refs: CrossSurfaceEvidenceRefInput[]
): CrossSurfaceEvidenceSummaryRef[] {
  return refs.map((ref, index) => {
    const summary = safeText(ref.summary);
    const refId = safeText(ref.refId, `evidence-ref-${index + 1}`);
    return {
      refId,
      kind: ref.kind as CrossSurfaceEvidenceKind,
      status: safeText(ref.status, "summary_ready"),
      summaryHash: stablePreviewHash(
        stableStringify({
          refId,
          kind: ref.kind,
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

function toWorkflowSummaryRef(
  ref: CrossSurfaceEvidenceSummaryRef
): CrossSurfaceEvidenceWorkflowSummaryRef {
  return {
    stepKind: workflowStepFor(ref.kind),
    refId: ref.refId,
    status: ref.status,
    summary: `${ref.kind} evidence summary`,
    warningCodes: ref.warningCodes,
    blockerCodes: ref.blockerCodes,
    hashPrefix: ref.summaryHash
  };
}

function workflowStepFor(
  kind: CrossSurfaceEvidenceKind
): CrossSurfaceEvidenceWorkflowSummaryRef["stepKind"] {
  if (kind === "project_knowledge") {
    return "knowledge_recall";
  }
  if (
    kind === "mcp_readonly_metadata" ||
    kind === "mcp_readonly_tool_summary"
  ) {
    return "mcp_evidence";
  }
  if (kind === "plugin_metadata" || kind === "skill_metadata") {
    return "plugin_skill_metadata";
  }
  if (kind === "desktop_observer_metadata") {
    return "desktop_observer";
  }
  return "desktop_proposal";
}

function validateEvidenceRefs(
  refs: CrossSurfaceEvidenceRefInput[]
): CrossSurfaceEvidenceFinding[] {
  const findings: CrossSurfaceEvidenceFinding[] = [];
  const seen = new Set<string>();
  refs.forEach((ref, index) => {
    const path = `evidenceRefs.${index}`;
    const refId = safeText(ref.refId, "");
    const kind = safeText(ref.kind, "");
    const summary = safeText(ref.summary, "");
    if (refId.length === 0) {
      findings.push(finding("schema", "blocker", "MISSING_REF_ID", path));
    } else if (seen.has(refId)) {
      findings.push(finding("duplicate_ref", "blocker", "DUPLICATE_REF", path));
    } else {
      seen.add(refId);
    }
    if (!evidenceKindSet.has(kind)) {
      findings.push(
        finding("schema", "blocker", "UNKNOWN_EVIDENCE_KIND", path)
      );
    }
    if (summary.length === 0) {
      findings.push(finding("schema", "blocker", "MISSING_SUMMARY", path));
    }
    if (ref.summaryOnly === false) {
      findings.push(
        finding("raw_field", "blocker", "SUMMARY_ONLY_REQUIRED", path)
      );
    }
  });
  return findings;
}

function findForbiddenFields(value: unknown): CrossSurfaceEvidenceFinding[] {
  const findings: CrossSurfaceEvidenceFinding[] = [];
  visit(value, (entry) => {
    if (forbiddenFieldKeys.has(entry.key.toLowerCase())) {
      findings.push(
        finding("raw_field", "blocker", "FORBIDDEN_FIELD", entry.path)
      );
    }
  });
  return findings;
}

function findExecutionClaims(value: unknown): CrossSurfaceEvidenceFinding[] {
  const findings: CrossSurfaceEvidenceFinding[] = [];
  visit(value, (entry) => {
    if (
      executionClaimKeys.has(entry.key.toLowerCase()) &&
      entry.value === true
    ) {
      findings.push(
        finding("execution_claim", "blocker", "EXECUTION_FLAG_TRUE", entry.path)
      );
    }
  });
  return findings;
}

function findUnsafeStringMarkers(
  value: unknown
): CrossSurfaceEvidenceFinding[] {
  const findings: CrossSurfaceEvidenceFinding[] = [];
  visit(value, (entry) => {
    if (typeof entry.value !== "string") {
      return;
    }
    for (const pattern of unsafeTextPatterns) {
      if (pattern.pattern.test(entry.value)) {
        findings.push(
          finding(
            pattern.code.includes("KEY") ||
              pattern.code.includes("TOKEN") ||
              pattern.code.includes("AUTHORIZATION") ||
              pattern.code.includes("PRIVATE")
              ? "secret"
              : "raw_field",
            "blocker",
            pattern.code,
            entry.path
          )
        );
      }
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
  kind: CrossSurfaceEvidenceFindingKind,
  severity: CrossSurfaceEvidenceSummarySeverity,
  code: string,
  path?: string
): CrossSurfaceEvidenceFinding {
  return {
    findingId: `cross-surface-evidence-${severity}-${code.toLowerCase()}-${stablePreviewHash(
      `${path ?? "root"}:${kind}:${code}`
    ).slice(0, 12)}`,
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code),
    ...(path !== undefined ? { path } : {})
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    MISSING_EVIDENCE_REFS:
      "No cross-surface evidence refs were provided for aggregation.",
    MISSING_REF_ID: "Each evidence ref must include a safe refId.",
    DUPLICATE_REF: "Evidence refs must not reuse the same refId.",
    UNKNOWN_EVIDENCE_KIND: "Evidence ref kind is not allowed.",
    MISSING_SUMMARY: "Each evidence ref must include a summary.",
    SUMMARY_ONLY_REQUIRED: "Evidence refs must be summary-only.",
    FORBIDDEN_FIELD: "Raw, secret, command, or execution fields are not allowed.",
    EXECUTION_FLAG_TRUE:
      "Evidence summary refs must not claim execution readiness.",
    API_KEY_MARKER: "Secret-like API key marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization header marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected.",
    RAW_PROMPT_MARKER: "Raw prompt marker detected.",
    RAW_MCP_OUTPUT_MARKER: "Raw MCP output marker detected.",
    RAW_SCREENSHOT_MARKER: "Raw screenshot marker detected.",
    PLUGIN_RAW_PACKAGE_MARKER: "Raw plugin package marker detected."
  };
  return messages[code] ?? "Cross-surface evidence summary validation finding.";
}

function nextActionFor(status: CrossSurfaceEvidenceSummaryStatus): string {
  if (status === "empty") {
    return "Provide summary-only cross-surface evidence refs.";
  }
  if (status === "blocked") {
    return "Reject evidence refs until raw fields, secrets, and execution claims are removed.";
  }
  if (status === "warning") {
    return "Review warning refs before attaching them to the workflow preview.";
  }
  return "Attach summary-only evidence refs to the cross-surface workflow preview.";
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
  findings: CrossSurfaceEvidenceFinding[]
): CrossSurfaceEvidenceFinding[] {
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
