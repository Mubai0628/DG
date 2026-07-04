import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type CapabilityPolicyEnforcementStatus =
  | "empty"
  | "policy_ready"
  | "warning"
  | "blocked";

export type CapabilityPolicyEnforcementSeverity = "blocker" | "warning";

export type CapabilityPolicyFinding = {
  findingId: string;
  severity: CapabilityPolicyEnforcementSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type CapabilityPolicyCategory =
  | "capability_descriptor"
  | "broker_plan_preview"
  | "mcp_descriptor"
  | "plugin_skill_descriptor"
  | "desktop_action_proposal"
  | "git_shell_lane_summary"
  | "approval_consistency_report";

export type CapabilityPolicyRiskLevel = "low" | "medium" | "high" | "critical";

export type CapabilityPolicyMode =
  | "disabled"
  | "read_only"
  | "manual_only"
  | "approved_lane"
  | "unsupported";

export type CapabilityPolicyItemInput = {
  capabilityId?: string | undefined;
  category?: CapabilityPolicyCategory | string | undefined;
  mode?: CapabilityPolicyMode | string | undefined;
  riskLevel?: CapabilityPolicyRiskLevel | string | undefined;
  summary?: string | undefined;
  canMutate?: boolean | undefined;
  manualApprovalPresent?: boolean | undefined;
  runtimeExecutionRequested?: boolean | undefined;
  actionKind?: string | undefined;
  allowlisted?: boolean | undefined;
  laneKind?: string | undefined;
  fixedTemplate?: boolean | undefined;
  broadLease?: boolean | undefined;
  readiness?: Record<string, unknown> | undefined;
  warningCodes?: string[] | undefined;
  [key: string]: unknown;
};

export type CapabilityPolicyItemSummary = {
  capabilityId: string;
  category: CapabilityPolicyCategory;
  mode: CapabilityPolicyMode;
  riskLevel: CapabilityPolicyRiskLevel;
  summaryHash: string;
  allowed: boolean;
  warningCodes: string[];
  blockerCodes: string[];
};

export type CapabilityPolicyReadiness = {
  canUseForPolicyReview: boolean;
  canExecuteCapability: false;
  canApprove: false;
  canApplyPatch: false;
  canRollback: false;
  canIssuePermissionLease: false;
  canInvokeMcpTool: false;
  canExecutePluginRuntime: false;
  canExecuteDesktopAction: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type CapabilityPolicyEnforcementInput = {
  capabilities?: CapabilityPolicyItemInput[] | undefined;
  riskPolicy?: {
    allowHighRiskWithManualApproval?: boolean | undefined;
    allowedDesktopActionKinds?: string[] | undefined;
  };
  sourceKind?: "runtime" | "app_preview" | "fixture" | "manual_test";
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  [key: string]: unknown;
};

export type CapabilityPolicyEnforcementReport = {
  status: CapabilityPolicyEnforcementStatus;
  policyId: string;
  source: "runtime_capability_policy_enforcement";
  sourceKind: "runtime" | "app_preview" | "fixture" | "manual_test";
  capabilityCount: number;
  allowedCount: number;
  blockedCount: number;
  warningCount: number;
  blockerCount: number;
  findingCount: number;
  categoryCounts: Record<CapabilityPolicyCategory, number>;
  riskCounts: Record<CapabilityPolicyRiskLevel, number>;
  itemSummaries: CapabilityPolicyItemSummary[];
  findings: CapabilityPolicyFinding[];
  enforcementHash: string;
  readiness: CapabilityPolicyReadiness;
  nextAction: string;
};

const categories: CapabilityPolicyCategory[] = [
  "capability_descriptor",
  "broker_plan_preview",
  "mcp_descriptor",
  "plugin_skill_descriptor",
  "desktop_action_proposal",
  "git_shell_lane_summary",
  "approval_consistency_report"
];

const riskLevels: CapabilityPolicyRiskLevel[] = [
  "low",
  "medium",
  "high",
  "critical"
];

const modes: CapabilityPolicyMode[] = [
  "disabled",
  "read_only",
  "manual_only",
  "approved_lane",
  "unsupported"
];

const categorySet = new Set<string>(categories);
const riskSet = new Set<string>(riskLevels);
const modeSet = new Set<string>(modes);

const defaultDesktopActionKinds = new Set([
  "focus_window",
  "raise_window",
  "activate_window",
  "click_observed_safe_target",
  "type_into_observed_text_field"
]);

const readiness: CapabilityPolicyReadiness = {
  canUseForPolicyReview: false,
  canExecuteCapability: false,
  canApprove: false,
  canApplyPatch: false,
  canRollback: false,
  canIssuePermissionLease: false,
  canInvokeMcpTool: false,
  canExecutePluginRuntime: false,
  canExecuteDesktopAction: false,
  canExecuteGit: false,
  canExecuteShell: false,
  appCanExecute: false
};

const forbiddenFieldKeys = new Set(
  [
    "raw" + "Args",
    "raw" + "Output",
    "raw" + "Prompt",
    "raw" + "Response",
    "raw" + "Source",
    "raw" + "Diff",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "approveNow",
    "desktopActionExecution",
    "nativeBridge",
    "tools",
    "tool_choice"
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "canExecuteCapability",
    "canApprove",
    "canApplyPatch",
    "canRollback",
    "canIssuePermissionLease",
    "canInvokeMcpTool",
    "canExecutePluginRuntime",
    "canExecuteDesktopAction",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "claimsExecution",
    "appReadinessClaimsExecution"
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
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildCapabilityPolicyEnforcementReport(
  input: CapabilityPolicyEnforcementInput = {}
): CapabilityPolicyEnforcementReport {
  const policyId =
    input.idGenerator?.() ??
    `capability-policy-${stablePreviewHash(stableStringify(input)).slice(0, 12)}`;
  const findings = validateCapabilityPolicyEnforcementInput(input);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const itemSummaries =
    blockerCount > 0 ? [] : normalizeItems(input.capabilities ?? [], input);

  if ((input.capabilities ?? []).length === 0) {
    return buildReport({
      policyId,
      sourceKind: input.sourceKind ?? "runtime",
      status: blockerCount > 0 ? "blocked" : "empty",
      itemSummaries,
      findings: [...findings, finding("warning", "MISSING_CAPABILITIES")]
    });
  }

  const itemBlocked = itemSummaries.some((item) => item.blockerCodes.length > 0);
  const itemWarning = itemSummaries.some((item) => item.warningCodes.length > 0);

  return buildReport({
    policyId,
    sourceKind: input.sourceKind ?? "runtime",
    status:
      blockerCount > 0 || itemBlocked
        ? "blocked"
        : itemWarning
          ? "warning"
          : "policy_ready",
    itemSummaries,
    findings
  });
}

export function summarizeCapabilityPolicyEnforcementReport(
  report: CapabilityPolicyEnforcementReport
): Pick<
  CapabilityPolicyEnforcementReport,
  | "status"
  | "policyId"
  | "capabilityCount"
  | "allowedCount"
  | "blockedCount"
  | "warningCount"
  | "categoryCounts"
  | "riskCounts"
  | "enforcementHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: report.status,
    policyId: report.policyId,
    capabilityCount: report.capabilityCount,
    allowedCount: report.allowedCount,
    blockedCount: report.blockedCount,
    warningCount: report.warningCount,
    categoryCounts: report.categoryCounts,
    riskCounts: report.riskCounts,
    enforcementHash: report.enforcementHash,
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: report.source
  };
}

export function validateCapabilityPolicyEnforcementInput(
  input: CapabilityPolicyEnforcementInput = {}
): CapabilityPolicyFinding[] {
  return [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input),
    ...findExecutionClaims(input),
    ...validateItems(input)
  ];
}

function buildReport(input: {
  policyId: string;
  sourceKind: CapabilityPolicyEnforcementReport["sourceKind"];
  status: CapabilityPolicyEnforcementStatus;
  itemSummaries: CapabilityPolicyItemSummary[];
  findings: CapabilityPolicyFinding[];
}): CapabilityPolicyEnforcementReport {
  const allFindings = dedupeFindings(input.findings);
  const blockerCount = allFindings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningFindingCount = allFindings.filter(
    (findingItem) => findingItem.severity === "warning"
  ).length;
  const blockedCount =
    input.status === "blocked"
      ? Math.max(
          1,
          input.itemSummaries.filter((item) => item.blockerCodes.length > 0)
            .length
        )
      : 0;
  const warningCount =
    warningFindingCount +
    input.itemSummaries.filter((item) => item.warningCodes.length > 0).length;
  const enforcementHash = stablePreviewHash(
    stableStringify({
      policyId: input.policyId,
      sourceKind: input.sourceKind,
      status: input.status,
      items: input.itemSummaries,
      findingCodes: allFindings.map((findingItem) => findingItem.code)
    })
  );

  return {
    status: input.status,
    policyId: input.policyId,
    source: "runtime_capability_policy_enforcement",
    sourceKind: input.sourceKind,
    capabilityCount: input.itemSummaries.length,
    allowedCount: input.itemSummaries.filter((item) => item.allowed).length,
    blockedCount,
    warningCount,
    blockerCount,
    findingCount: allFindings.length,
    categoryCounts: countCategories(input.itemSummaries),
    riskCounts: countRisks(input.itemSummaries),
    itemSummaries: input.itemSummaries,
    findings: allFindings,
    enforcementHash,
    readiness: {
      ...readiness,
      canUseForPolicyReview:
        input.status === "policy_ready" || input.status === "warning"
    },
    nextAction: nextActionFor(input.status)
  };
}

function normalizeItems(
  items: CapabilityPolicyItemInput[],
  input: CapabilityPolicyEnforcementInput
): CapabilityPolicyItemSummary[] {
  return items.map((item, index) => {
    const category = safeText(item.category) as CapabilityPolicyCategory;
    const mode = safeText(item.mode, "unsupported") as CapabilityPolicyMode;
    const riskLevel = safeText(item.riskLevel, "medium") as CapabilityPolicyRiskLevel;
    const capabilityId = safeText(item.capabilityId, `capability-${index + 1}`);
    const summary = safeText(item.summary, `${category} summary`);
    const blockerCodes = itemBlockers(item, input);
    const warningCodes = itemWarnings(item);
    return {
      capabilityId,
      category,
      mode,
      riskLevel,
      summaryHash: stablePreviewHash(
        stableStringify({
          capabilityId,
          category,
          mode,
          riskLevel,
          actionKind: item.actionKind,
          laneKind: item.laneKind,
          summary
        })
      ).slice(0, 16),
      allowed: blockerCodes.length === 0,
      warningCodes,
      blockerCodes
    };
  });
}

function validateItems(
  input: CapabilityPolicyEnforcementInput
): CapabilityPolicyFinding[] {
  const findings: CapabilityPolicyFinding[] = [];
  (input.capabilities ?? []).forEach((item, index) => {
    const path = `capabilities.${index}`;
    if (!categorySet.has(safeText(item.category))) {
      findings.push(finding("blocker", "UNKNOWN_CAPABILITY_CATEGORY", path));
    }
    if (!modeSet.has(safeText(item.mode))) {
      findings.push(finding("blocker", "UNKNOWN_CAPABILITY_MODE", path));
    }
    if (!riskSet.has(safeText(item.riskLevel))) {
      findings.push(finding("blocker", "UNKNOWN_RISK_LEVEL", path));
    }
    if (safeText(item.summary).length === 0) {
      findings.push(finding("blocker", "MISSING_CAPABILITY_SUMMARY", path));
    }
    for (const code of itemBlockers(item, input)) {
      findings.push(finding("blocker", code, path));
    }
    for (const code of itemWarnings(item)) {
      findings.push(finding("warning", code, path));
    }
  });
  return findings;
}

function itemBlockers(
  item: CapabilityPolicyItemInput,
  input: CapabilityPolicyEnforcementInput
): string[] {
  const blockers: string[] = [];
  const category = safeText(item.category);
  const mode = safeText(item.mode);
  const laneKind = safeText(item.laneKind);
  const actionKind = safeText(item.actionKind);
  const allowedDesktopActionKinds = new Set(
    input.riskPolicy?.allowedDesktopActionKinds ?? [...defaultDesktopActionKinds]
  );
  if (mode === "disabled" && itemClaimsExecution(item)) {
    blockers.push("DISABLED_CAPABILITY_CLAIMS_EXECUTION");
  }
  if (mode === "manual_only" && item.manualApprovalPresent !== true) {
    blockers.push("MANUAL_ONLY_MISSING_APPROVAL");
  }
  if (mode === "read_only" && item.canMutate === true) {
    blockers.push("READ_ONLY_MUTATION");
  }
  if (category === "mcp_descriptor" && item.canMutate === true) {
    blockers.push("MCP_MUTATING_TOOL_BLOCKED");
  }
  if (
    category === "plugin_skill_descriptor" &&
    item.runtimeExecutionRequested === true
  ) {
    blockers.push("PLUGIN_SKILL_RUNTIME_BLOCKED");
  }
  if (
    category === "desktop_action_proposal" &&
    !allowedDesktopActionKinds.has(actionKind)
  ) {
    blockers.push("DESKTOP_ACTION_OUTSIDE_ALLOWLIST");
  }
  if (
    category === "git_shell_lane_summary" &&
    (laneKind === "arbitrary_git" ||
      laneKind === "arbitrary_shell" ||
      item.fixedTemplate !== true)
  ) {
    blockers.push("ARBITRARY_GIT_SHELL_BLOCKED");
  }
  if (item.broadLease === true) {
    blockers.push("BROAD_PERMISSION_LEASE");
  }
  if (itemClaimsExecution(item)) {
    blockers.push("APP_READINESS_CLAIMS_EXECUTION");
  }
  return unique(blockers);
}

function itemWarnings(item: CapabilityPolicyItemInput): string[] {
  const warnings: string[] = [];
  if (safeText(item.riskLevel) === "high" || safeText(item.riskLevel) === "critical") {
    warnings.push("HIGH_RISK_CAPABILITY");
  }
  if (!Array.isArray(item.warningCodes) && safeText(item.summary).length > 0) {
    warnings.push("NO_UPSTREAM_WARNING_CODES");
  }
  return unique(warnings);
}

function itemClaimsExecution(item: CapabilityPolicyItemInput): boolean {
  if (
    item.runtimeExecutionRequested === true ||
    item.readiness?.appCanExecute === true
  ) {
    return true;
  }
  return Object.entries(item.readiness ?? {}).some(
    ([key, value]) =>
      executionClaimKeys.has(key.toLowerCase()) && value === true
  );
}

function countCategories(
  items: CapabilityPolicyItemSummary[]
): Record<CapabilityPolicyCategory, number> {
  return Object.fromEntries(
    categories.map((category) => [
      category,
      items.filter((item) => item.category === category).length
    ])
  ) as Record<CapabilityPolicyCategory, number>;
}

function countRisks(
  items: CapabilityPolicyItemSummary[]
): Record<CapabilityPolicyRiskLevel, number> {
  return Object.fromEntries(
    riskLevels.map((risk) => [
      risk,
      items.filter((item) => item.riskLevel === risk).length
    ])
  ) as Record<CapabilityPolicyRiskLevel, number>;
}

function findForbiddenFields(value: unknown): CapabilityPolicyFinding[] {
  const findings: CapabilityPolicyFinding[] = [];
  visit(value, (entry) => {
    if (forbiddenFieldKeys.has(entry.key.toLowerCase())) {
      findings.push(finding("blocker", "FORBIDDEN_FIELD", entry.path));
    }
  });
  return findings;
}

function findExecutionClaims(value: unknown): CapabilityPolicyFinding[] {
  const findings: CapabilityPolicyFinding[] = [];
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

function findUnsafeStringMarkers(value: unknown): CapabilityPolicyFinding[] {
  const findings: CapabilityPolicyFinding[] = [];
  visit(value, (entry) => {
    if (typeof entry.value !== "string") {
      return;
    }
    for (const pattern of unsafeTextPatterns) {
      if (pattern.pattern.test(entry.value)) {
        findings.push(finding("blocker", pattern.code, entry.path));
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
  severity: CapabilityPolicyEnforcementSeverity,
  code: string,
  path?: string
): CapabilityPolicyFinding {
  return {
    findingId: `capability-policy-${severity}-${code.toLowerCase()}-${stablePreviewHash(
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
    MISSING_CAPABILITIES:
      "No capability summaries were provided for policy enforcement.",
    UNKNOWN_CAPABILITY_CATEGORY: "Capability category is not allowed.",
    UNKNOWN_CAPABILITY_MODE: "Capability mode is not allowed.",
    UNKNOWN_RISK_LEVEL: "Capability risk level is not allowed.",
    MISSING_CAPABILITY_SUMMARY:
      "Capability entries must include summary-only text.",
    DISABLED_CAPABILITY_CLAIMS_EXECUTION:
      "Disabled capability must not claim execution.",
    MANUAL_ONLY_MISSING_APPROVAL:
      "Manual-only capability requires explicit approval.",
    READ_ONLY_MUTATION: "Read-only capability cannot mutate.",
    MCP_MUTATING_TOOL_BLOCKED: "MCP mutating tools are blocked.",
    PLUGIN_SKILL_RUNTIME_BLOCKED:
      "Plugin/skill runtime execution is blocked.",
    DESKTOP_ACTION_OUTSIDE_ALLOWLIST:
      "Desktop action proposal is outside the allowlist.",
    ARBITRARY_GIT_SHELL_BLOCKED: "Arbitrary Git/shell execution is blocked.",
    BROAD_PERMISSION_LEASE: "Broad PermissionLease is blocked.",
    APP_READINESS_CLAIMS_EXECUTION:
      "App readiness text cannot enable execution.",
    HIGH_RISK_CAPABILITY: "High-risk capability requires human review.",
    NO_UPSTREAM_WARNING_CODES:
      "Capability summary does not include upstream warning codes.",
    FORBIDDEN_FIELD:
      "Raw args/output, command, EventStore, approval execution, or secret fields are not allowed.",
    EXECUTION_FLAG_TRUE: "Policy report must not claim execution readiness.",
    API_KEY_MARKER: "Secret-like API key marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization header marker detected."
  };
  return messages[code] ?? "Capability policy finding.";
}

function nextActionFor(status: CapabilityPolicyEnforcementStatus): string {
  if (status === "empty") {
    return "Provide summary-only capability refs for policy review.";
  }
  if (status === "blocked") {
    return "Resolve policy blockers before presenting capability readiness.";
  }
  if (status === "warning") {
    return "Review high-risk and missing-warning capability summaries.";
  }
  return "Capability policy is ready for read-only review.";
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function dedupeFindings(
  findings: CapabilityPolicyFinding[]
): CapabilityPolicyFinding[] {
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
