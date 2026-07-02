import {
  type CapabilityCategory,
  type CapabilityDescriptor,
  type CapabilityExecutionMode,
  type CapabilityInvokePolicy,
  type CapabilityRiskLevel,
  type CapabilitySourceType
} from "../capabilities/index.js";
import { stablePreviewHash } from "../models/stable-preview-hash.js";
import { type FixedAgentRoleOutput } from "./fixed-agent-role-adapters.js";
import {
  type FixedAgentRunPlan,
  type FixedAgentRole
} from "./fixed-agent-run-plan.js";

export type AgentCapabilityPlanInput = {
  fixedRunPlan?: FixedAgentRunPlan | { plan?: FixedAgentRunPlan | undefined };
  roleOutput?:
    | FixedAgentRoleOutput
    | { output?: FixedAgentRoleOutput | undefined };
  requestedCapabilityRefs?: unknown;
  capabilityDescriptors?: CapabilityDescriptor[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type AgentCapabilityPlanStatus = "ready" | "warning" | "blocked";

export type AgentCapabilityPlanRef = {
  capabilityId: string;
  role: FixedAgentRole;
  allowed: boolean;
  riskLevel: CapabilityRiskLevel;
  sourceType: CapabilitySourceType;
  category: CapabilityCategory;
  invokePolicy: CapabilityInvokePolicy;
  executionMode: CapabilityExecutionMode;
  approvalRequired: boolean;
  disabledReasons: string[];
  summaryOnly: true;
};

export type AgentCapabilityPlanFindingKind =
  | "schema"
  | "role"
  | "capability"
  | "raw_field"
  | "secret"
  | "execution_field";

export type AgentCapabilityPlanSeverity = "blocker" | "warning";

export type AgentCapabilityPlanFinding = {
  findingId: string;
  kind: AgentCapabilityPlanFindingKind;
  severity: AgentCapabilityPlanSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type AgentCapabilityPlanReadiness = {
  canEnterCapabilityBrokerPreview: boolean;
  canInvokeCapability: false;
  canCallMcpTool: false;
  canRunPlugin: false;
  canRunSkill: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canWriteFiles: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type AgentCapabilityPlan = {
  status: AgentCapabilityPlanStatus;
  planId: string;
  role?: FixedAgentRole | undefined;
  runPlanId?: string | undefined;
  roleOutputId?: string | undefined;
  allowedRefs: AgentCapabilityPlanRef[];
  blockedRefs: AgentCapabilityPlanRef[];
  riskLevels: CapabilityRiskLevel[];
  approvalRequirements: string[];
  disabledReasons: string[];
  findings: AgentCapabilityPlanFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: AgentCapabilityPlanReadiness;
  planHash: string;
  nextAction: string;
  source: "runtime_agent_capability_plan";
};

const allowedCapabilityIdsByRole = {
  orchestrator: new Set([
    "runtime.context.assembly",
    "runtime.agent.route_preview",
    "runtime.evidence.summary",
    "native.workspace.index"
  ]),
  coder: new Set([
    "runtime.model_proposal.import",
    "runtime.patch_proposal.preview",
    "runtime.patch_proposal.creation"
  ]),
  reviewer: new Set([
    "runtime.patch.validation_preview",
    "runtime.patch.diff_audit_preview",
    "runtime.patch.approval_draft_preview"
  ]),
  verifier: new Set([
    "native.git.status",
    "native.git.diff_summary",
    "runtime.shell.scoped_test_summary",
    "runtime.verification.summary"
  ])
} satisfies Record<FixedAgentRole, Set<string>>;

const riskRank: Record<CapabilityRiskLevel, number> = {
  A0_observe: 0,
  A1_read: 1,
  A2_draft_write: 2,
  A3_scoped_write: 3,
  A4_external_effect: 4,
  A5_sensitive_or_irreversible: 5
};

const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authorizationField = ["Author", "ization"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const forbiddenFieldEntries: Array<[string, AgentCapabilityPlanFindingKind]> = [
  [rawPrefix + "Prompt", "raw_field"],
  [rawPrefix + "Source", "raw_field"],
  [rawPrefix + "Diff", "raw_field"],
  [rawPrefix + "Response", "raw_field"],
  ["promptText", "raw_field"],
  ["sourceText", "raw_field"],
  ["diffText", "raw_field"],
  ["responseText", "raw_field"],
  ["fileContent", "raw_field"],
  [apiKeyField, "secret"],
  [["api", "Key", "Value"].join(""), "secret"],
  [authorizationField, "secret"],
  [bearerField, "secret"],
  [tokenField, "secret"],
  ["secret", "secret"],
  ["password", "secret"],
  ["command", "execution_field"],
  ["shellCommand", "execution_field"],
  ["gitCommand", "execution_field"],
  ["toolCall", "execution_field"],
  ["tools", "execution_field"],
  [toolChoiceField, "execution_field"],
  ["applyNow", "execution_field"],
  ["rollbackNow", "execution_field"],
  ["eventStoreWrite", "execution_field"],
  ["permissionLease", "execution_field"],
  ["desktopAction", "execution_field"],
  ["nativeBridge", "execution_field"],
  ["dynamicCapabilityEscalation", "capability"]
];

const forbiddenFieldKinds = new Map<string, AgentCapabilityPlanFindingKind>(
  forbiddenFieldEntries.map(([key, kind]) => [key.toLowerCase(), kind])
);

const executionAttemptKeys = new Set(
  [
    "canInvokeCapability",
    "canCallMcpTool",
    "canRunPlugin",
    "canRunSkill",
    "canExecuteGit",
    "canExecuteShell",
    "canWriteFiles",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canIssuePermissionLease",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowGit",
    "allowShell",
    "allowAppExecution"
  ].map((key) => key.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    kind: "secret",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    kind: "secret",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    kind: "secret",
    pattern: new RegExp(`\\b${authorizationField}\\s*[:=]`, "i")
  },
  {
    code: "RAW_PROMPT_MARKER",
    kind: "raw_field",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b|raw prompt`, "i")
  }
] satisfies Array<{
  code: string;
  kind: AgentCapabilityPlanFindingKind;
  pattern: RegExp;
}>;

export function buildAgentCapabilityPlan(
  input: AgentCapabilityPlanInput = {}
): AgentCapabilityPlan {
  return validateAgentCapabilityPlanInput(input);
}

export function validateAgentCapabilityPlanInput(
  input: AgentCapabilityPlanInput = {}
): AgentCapabilityPlan {
  const findings: AgentCapabilityPlanFinding[] = [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input)
  ];
  const runPlan = extractRunPlan(input.fixedRunPlan);
  const roleOutput = extractRoleOutput(input.roleOutput);
  const role = roleOutput?.role;
  if (runPlan === undefined) {
    findings.push(
      finding(
        "schema",
        "warning",
        "FIXED_RUN_PLAN_MISSING",
        "Fixed run plan summary is missing."
      )
    );
  }
  if (roleOutput === undefined) {
    findings.push(
      finding(
        "role",
        "blocker",
        "ROLE_OUTPUT_MISSING",
        "Fixed role output is required."
      )
    );
  }
  if (
    role !== undefined &&
    runPlan !== undefined &&
    !runPlan.roles.includes(role)
  ) {
    findings.push(
      finding(
        "role",
        "blocker",
        "ROLE_NOT_IN_RUN_PLAN",
        "Role output role is not part of the fixed run plan."
      )
    );
  }

  const descriptors = descriptorMap(input.capabilityDescriptors);
  const requestedRefs = requestedCapabilityIds(input.requestedCapabilityRefs);
  const refs =
    role === undefined
      ? []
      : requestedRefs.map((capabilityId) =>
          planRefFor(role, capabilityId, descriptors.get(capabilityId))
        );
  for (const ref of refs) {
    if (!ref.allowed) {
      findings.push(
        finding(
          "capability",
          "blocker",
          ref.disabledReasons[0] ?? "CAPABILITY_BLOCKED",
          "Capability request is blocked for this fixed role.",
          "capabilityRef"
        )
      );
    }
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const allowedRefs = refs.filter((ref) => ref.allowed);
  const blockedRefs = refs.filter((ref) => !ref.allowed);
  const status: AgentCapabilityPlanStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "ready";
  const planId =
    input.idGenerator?.() ??
    `agent-capability-plan-${stablePreviewHash(
      stableStringify({
        role,
        runPlanId: runPlan?.planId,
        roleOutputId: roleOutput?.outputId,
        requestedRefs,
        createdAt: input.createdAt
      })
    ).slice(0, 16)}`;
  const planHash = stablePreviewHash(
    stableStringify({
      planId,
      status,
      role,
      runPlanId: runPlan?.planId,
      roleOutputId: roleOutput?.outputId,
      allowedRefs,
      blockedRefs,
      findingCodes: findings.map((item) => item.code)
    })
  );
  return {
    status,
    planId,
    role,
    runPlanId: runPlan?.planId,
    roleOutputId: roleOutput?.outputId,
    allowedRefs,
    blockedRefs,
    riskLevels: uniqueStrings(
      refs.map((ref) => ref.riskLevel)
    ) as CapabilityRiskLevel[],
    approvalRequirements: uniqueStrings(
      refs.filter((ref) => ref.approvalRequired).map((ref) => ref.capabilityId)
    ),
    disabledReasons: uniqueStrings(
      blockedRefs.flatMap((ref) => ref.disabledReasons)
    ),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(blockerCount === 0 && roleOutput !== undefined),
    planHash,
    nextAction: nextActionFor(status),
    source: "runtime_agent_capability_plan"
  };
}

export function summarizeAgentCapabilityPlan(plan: AgentCapabilityPlan): {
  planId: string;
  status: AgentCapabilityPlanStatus;
  role?: FixedAgentRole | undefined;
  allowedCount: number;
  blockedCount: number;
  approvalRequirementCount: number;
  disabledReasons: string[];
  blockerCount: number;
  warningCount: number;
  planHash: string;
  summaryOnly: true;
} {
  return {
    planId: plan.planId,
    status: plan.status,
    role: plan.role,
    allowedCount: plan.allowedRefs.length,
    blockedCount: plan.blockedRefs.length,
    approvalRequirementCount: plan.approvalRequirements.length,
    disabledReasons: plan.disabledReasons,
    blockerCount: plan.blockerCount,
    warningCount: plan.warningCount,
    planHash: plan.planHash,
    summaryOnly: true
  };
}

function planRefFor(
  role: FixedAgentRole,
  capabilityId: string,
  descriptor: CapabilityDescriptor | undefined
): AgentCapabilityPlanRef {
  const summary = descriptorSummary(capabilityId, descriptor);
  const disabledReasons = disabledReasonsForCapability(
    role,
    capabilityId,
    summary
  );
  return {
    capabilityId,
    role,
    allowed: disabledReasons.length === 0,
    riskLevel: summary.riskLevel,
    sourceType: summary.sourceType,
    category: summary.category,
    invokePolicy: summary.invokePolicy,
    executionMode: summary.executionMode,
    approvalRequired:
      summary.invokePolicy === "ASK_FIRST" ||
      summary.invokePolicy === "MANUAL_ONLY" ||
      riskRank[summary.riskLevel] >= riskRank.A2_draft_write,
    disabledReasons,
    summaryOnly: true
  };
}

function descriptorSummary(
  capabilityId: string,
  descriptor: CapabilityDescriptor | undefined
): {
  riskLevel: CapabilityRiskLevel;
  sourceType: CapabilitySourceType;
  category: CapabilityCategory;
  invokePolicy: CapabilityInvokePolicy;
  executionMode: CapabilityExecutionMode;
} {
  return {
    riskLevel: descriptor?.riskLevel ?? "A1_read",
    sourceType: descriptor?.sourceType ?? inferSourceType(capabilityId),
    category: descriptor?.category ?? inferCategory(capabilityId),
    invokePolicy: descriptor?.invokePolicy ?? "MANUAL_ONLY",
    executionMode: descriptor?.executionMode ?? "SIMULATE"
  };
}

function disabledReasonsForCapability(
  role: FixedAgentRole,
  capabilityId: string,
  summary: ReturnType<typeof descriptorSummary>
): string[] {
  const reasons: string[] = [];
  if (!allowedCapabilityIdsByRole[role].has(capabilityId)) {
    reasons.push("DYNAMIC_CAPABILITY_ESCALATION_BLOCKED");
  }
  if (summary.sourceType === "mcp" && summary.executionMode === "MUTATING") {
    reasons.push("MCP_MUTATING_TOOL_BLOCKED");
  }
  if (
    (summary.sourceType === "plugin" || summary.sourceType === "skill") &&
    summary.executionMode !== "SIMULATE"
  ) {
    reasons.push("PLUGIN_SKILL_RUNTIME_BLOCKED");
  }
  if (summary.category === "desktop" || capabilityId.includes("desktop")) {
    reasons.push("DESKTOP_ACTION_BLOCKED");
  }
  if (summary.category === "bridge" || capabilityId.includes("native.bridge")) {
    reasons.push("NATIVE_BRIDGE_BLOCKED");
  }
  if (
    capabilityId.includes("git.push") ||
    capabilityId.includes("git.commit") ||
    capabilityId.includes("git.write")
  ) {
    reasons.push("GIT_WRITE_BLOCKED");
  }
  if (
    summary.category === "shell" &&
    capabilityId !== "runtime.shell.scoped_test_summary"
  ) {
    reasons.push("SHELL_ARBITRARY_COMMAND_BLOCKED");
  }
  if (capabilityId.includes("apply") || capabilityId.includes("rollback")) {
    reasons.push("DIRECT_APPLY_ROLLBACK_BLOCKED");
  }
  if (
    capabilityId.includes("permission_lease") ||
    capabilityId.includes("permissionLease")
  ) {
    reasons.push("PERMISSION_LEASE_ISSUING_BLOCKED");
  }
  return uniqueStrings(reasons);
}

function descriptorMap(
  descriptors: CapabilityDescriptor[] | undefined
): Map<string, CapabilityDescriptor> {
  return new Map(
    (descriptors ?? []).map((descriptor) => [descriptor.id, descriptor])
  );
}

function requestedCapabilityIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (isRecord(item)) {
          return safeString(item.capabilityId) || safeString(item.id);
        }
        return "";
      })
      .filter((item) => item.length > 0)
  );
}

function inferSourceType(capabilityId: string): CapabilitySourceType {
  if (capabilityId.startsWith("mcp.")) {
    return "mcp";
  }
  if (capabilityId.startsWith("plugin.")) {
    return "plugin";
  }
  if (capabilityId.startsWith("skill.")) {
    return "skill";
  }
  return "native";
}

function inferCategory(capabilityId: string): CapabilityCategory {
  if (capabilityId.includes("git.")) {
    return "git";
  }
  if (capabilityId.includes("shell.")) {
    return "shell";
  }
  if (capabilityId.includes("desktop")) {
    return "desktop";
  }
  if (capabilityId.includes("bridge")) {
    return "bridge";
  }
  if (capabilityId.includes("fs.")) {
    return "fs";
  }
  return "unknown";
}

function extractRunPlan(
  value: AgentCapabilityPlanInput["fixedRunPlan"]
): FixedAgentRunPlan | undefined {
  if (value === undefined) {
    return undefined;
  }
  if ("plan" in value && value.plan !== undefined) {
    return value.plan;
  }
  if ("planId" in value && "roles" in value) {
    return value as FixedAgentRunPlan;
  }
  return undefined;
}

function extractRoleOutput(
  value: AgentCapabilityPlanInput["roleOutput"]
): FixedAgentRoleOutput | undefined {
  if (value === undefined) {
    return undefined;
  }
  if ("output" in value && value.output !== undefined) {
    return value.output;
  }
  if ("outputId" in value && "role" in value) {
    return value as FixedAgentRoleOutput;
  }
  return undefined;
}

function findForbiddenFields(input: unknown): AgentCapabilityPlanFinding[] {
  const findings: AgentCapabilityPlanFinding[] = [];
  visit(input, [], (path, value) => {
    const key = path.at(-1);
    if (key === undefined) {
      return;
    }
    const normalizedKey = key.toLowerCase();
    const kind = forbiddenFieldKinds.get(normalizedKey);
    if (kind !== undefined) {
      findings.push(
        finding(
          kind,
          "blocker",
          codeForForbiddenKind(kind),
          "Agent capability plan input contains a forbidden field.",
          "blockedField"
        )
      );
    }
    if (executionAttemptKeys.has(normalizedKey) && value === true) {
      findings.push(
        finding(
          "execution_field",
          "blocker",
          "EXECUTION_READINESS_ATTEMPT",
          "Agent capability plan input attempts to enable execution readiness.",
          "readiness"
        )
      );
    }
  });
  return dedupeFindings(findings);
}

function findUnsafeStringMarkers(input: unknown): AgentCapabilityPlanFinding[] {
  const findings: AgentCapabilityPlanFinding[] = [];
  visit(input, [], (_path, value) => {
    if (typeof value !== "string") {
      return;
    }
    for (const item of unsafeTextPatterns) {
      if (item.pattern.test(value)) {
        findings.push(
          finding(
            item.kind,
            "blocker",
            item.code,
            "Agent capability plan input contains an unsafe marker.",
            "blockedMarker"
          )
        );
      }
    }
  });
  return dedupeFindings(findings);
}

function codeForForbiddenKind(kind: AgentCapabilityPlanFindingKind): string {
  if (kind === "secret") {
    return "SECRET_FIELD_BLOCKED";
  }
  if (kind === "raw_field") {
    return "RAW_FIELD_BLOCKED";
  }
  if (kind === "execution_field") {
    return "EXECUTION_FIELD_BLOCKED";
  }
  if (kind === "capability") {
    return "DYNAMIC_CAPABILITY_ESCALATION_BLOCKED";
  }
  return "FORBIDDEN_FIELD_BLOCKED";
}

function nextActionFor(status: AgentCapabilityPlanStatus): string {
  if (status === "blocked") {
    return "Remove blocked capability refs or execution claims before planning can continue.";
  }
  if (status === "warning") {
    return "Review warnings. Capability planning is still summary-only and does not invoke capabilities.";
  }
  return "Capability plan is summary-only. No capability was invoked.";
}

function readiness(
  canEnterCapabilityBrokerPreview: boolean
): AgentCapabilityPlanReadiness {
  return {
    canEnterCapabilityBrokerPreview,
    canInvokeCapability: false,
    canCallMcpTool: false,
    canRunPlugin: false,
    canRunSkill: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canWriteFiles: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function finding(
  kind: AgentCapabilityPlanFindingKind,
  severity: AgentCapabilityPlanSeverity,
  code: string,
  safeMessage: string,
  path?: string | undefined
): AgentCapabilityPlanFinding {
  return {
    findingId: `agent-capability-plan-finding-${stablePreviewHash(
      [kind, severity, code, path ?? ""].join("|")
    ).slice(0, 12)}`,
    kind,
    severity,
    code,
    safeMessage,
    path
  };
}

function dedupeFindings(
  findings: AgentCapabilityPlanFinding[]
): AgentCapabilityPlanFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = [item.kind, item.severity, item.code, item.path ?? ""].join(
      "|"
    );
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
    value.forEach((item, index) =>
      visit(item, [...path, String(index)], visitor)
    );
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (typeof nested === "function") {
      continue;
    }
    visit(nested, [...path, key], visitor);
  }
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueStrings<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (!isRecord(value)) {
    return typeof value === "function" ? "[function]" : value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nested]) => typeof nested !== "function")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortValue(nested)])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
