import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type FixedAgentRole = "orchestrator" | "coder" | "reviewer" | "verifier";

export type FixedAgentIntent =
  | "code_change"
  | "documentation"
  | "code_review"
  | "verification"
  | "unknown";

export type FixedAgentRoute = {
  intent: FixedAgentIntent;
  roles: FixedAgentRole[];
};

export type AgentHandoffEvidenceRef = {
  refId: string;
  kind:
    | "artifact"
    | "event"
    | "test_result"
    | "context_summary"
    | "capability_plan"
    | "manual_note"
    | "memory_ref";
  summary: string;
  hashPrefix?: string | undefined;
  warningCodes: string[];
};

export type AgentHandoffDossier = {
  dossierId: string;
  order: number;
  fromRole: FixedAgentRole;
  toRole: FixedAgentRole;
  intent: FixedAgentIntent;
  objectiveSummary: string;
  summary: string;
  evidenceRefs: AgentHandoffEvidenceRef[];
  capabilityPlanRefs: string[];
  contextRefs: string[];
  memoryRefs: string[];
  warningCodes: string[];
  blockerCodes: string[];
  summaryOnly: true;
  dossierHash: string;
};

export type FixedAgentRunPlanInput = Record<string, unknown> | string | unknown;

export type FixedAgentRunPlan = {
  planId: string;
  intent: Exclude<FixedAgentIntent, "unknown">;
  route: FixedAgentRoute;
  roles: FixedAgentRole[];
  objectiveSummary: string;
  handoffDossiers: AgentHandoffDossier[];
  evidenceRefs: AgentHandoffEvidenceRef[];
  capabilityPlanRefs: string[];
  contextRefs: string[];
  memoryRefs: string[];
  warningCodes: string[];
  blockerCodes: string[];
  readiness: AgentRunPlanReadiness;
  planHash: string;
  source: "runtime_fixed_agent_run_plan";
};

export type AgentRunPlanValidationStatus =
  | "empty"
  | "planned"
  | "needs_clarification"
  | "warning"
  | "blocked";

export type AgentRunPlanFindingKind =
  | "schema"
  | "role"
  | "route"
  | "dossier"
  | "evidence"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "capability"
  | "memory_context";

export type AgentRunPlanSeverity = "blocker" | "warning";

export type AgentRunPlanFinding = {
  findingId: string;
  kind: AgentRunPlanFindingKind;
  severity: AgentRunPlanSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type AgentRunPlanReadiness = {
  canEnterAgentRunPlanPreview: boolean;
  canRequestCapabilityBroker: boolean;
  canExecuteAgents: false;
  canInvokeCapability: false;
  canWriteFiles: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canInvokeMcpTool: false;
  canRunPlugin: false;
  canRunSkill: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type FixedAgentRunPlanSummary = {
  planId?: string | undefined;
  status: AgentRunPlanValidationStatus;
  intent?: FixedAgentIntent | undefined;
  roles: FixedAgentRole[];
  route: FixedAgentRole[];
  dossierCount: number;
  evidenceRefCount: number;
  capabilityPlanRefCount: number;
  contextRefCount: number;
  memoryRefCount: number;
  warningCodes: string[];
  blockerCodes: string[];
  planHash?: string | undefined;
  summaryOnly: true;
};

export type AgentRunPlanValidationResult = {
  status: AgentRunPlanValidationStatus;
  plan?: FixedAgentRunPlan | undefined;
  summary: FixedAgentRunPlanSummary;
  findings: AgentRunPlanFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  normalizedHash: string;
  readiness: AgentRunPlanReadiness;
  nextAction: string;
  source: "runtime_fixed_agent_run_plan_schema";
};

export type FixedAgentRunPlanOptions = {
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const fixedRoles = [
  "orchestrator",
  "coder",
  "reviewer",
  "verifier"
] as const satisfies readonly FixedAgentRole[];

const fixedIntents = [
  "code_change",
  "documentation",
  "code_review",
  "verification",
  "unknown"
] as const satisfies readonly FixedAgentIntent[];

const fixedRoutes = {
  code_change: ["orchestrator", "coder", "reviewer", "verifier"],
  documentation: ["orchestrator", "coder", "reviewer"],
  code_review: ["orchestrator", "reviewer", "verifier"],
  verification: ["orchestrator", "verifier"]
} as const satisfies Record<
  Exclude<FixedAgentIntent, "unknown">,
  readonly FixedAgentRole[]
>;

const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authorizationField = ["Author", "ization"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");
const reasoningCamelField = ["reasoning", "Content"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");

const forbiddenFieldEntries: Array<[string, AgentRunPlanFindingKind]> = [
  [rawPrefix + "Prompt", "raw_field"],
  [rawPrefix + "Source", "raw_field"],
  [rawPrefix + "Diff", "raw_field"],
  [rawPrefix + "Response", "raw_field"],
  [rawPrefix + "ModelResponse", "raw_field"],
  [rawPrefix + "Output", "raw_field"],
  ["promptText", "raw_field"],
  ["sourceText", "raw_field"],
  ["diffText", "raw_field"],
  ["responseText", "raw_field"],
  ["beforeContent", "raw_field"],
  ["afterContent", "raw_field"],
  ["fileContent", "raw_field"],
  ["preimageContent", "raw_field"],
  ["backupContent", "raw_field"],
  [reasoningCamelField, "raw_field"],
  [reasoningSnakeField, "raw_field"],
  [apiKeyField, "secret"],
  [["api", "Key", "Value"].join(""), "secret"],
  [authorizationField, "secret"],
  [bearerField, "secret"],
  [tokenField, "secret"],
  ["secret", "secret"],
  ["password", "secret"],
  ["env", "secret"],
  ["envValue", "secret"],
  ["processEnvValue", "secret"],
  ["command", "execution_field"],
  ["shellCommand", "execution_field"],
  ["gitCommand", "execution_field"],
  ["tauriCommand", "execution_field"],
  ["toolCall", "execution_field"],
  ["toolExecution", "execution_field"],
  ["tools", "execution_field"],
  [toolChoiceField, "execution_field"],
  ["applyNow", "execution_field"],
  ["rollbackNow", "execution_field"],
  ["eventStoreWrite", "execution_field"],
  ["permissionLease", "execution_field"],
  ["desktopAction", "execution_field"],
  ["nativeBridge", "execution_field"],
  ["dynamicBidding", "route"],
  ["bidding", "route"],
  ["bid", "route"],
  ["agentId", "role"],
  ["agentIds", "role"],
  ["workerId", "role"],
  ["arbitraryAgent", "role"],
  ["capabilityInvocation", "capability"],
  ["invokeCapability", "capability"],
  ["callCapability", "capability"],
  ["hiddenContext", "memory_context"],
  ["privateContext", "memory_context"],
  ["memoryRawContent", "memory_context"],
  ["rawMemory", "memory_context"]
];

const forbiddenFieldKinds = new Map<string, AgentRunPlanFindingKind>(
  forbiddenFieldEntries.map(([key, kind]) => [key.toLowerCase(), kind])
);

const executionAttemptKeys = new Set(
  [
    "canExecuteAgents",
    "canInvokeCapability",
    "canWriteFiles",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "canInvokeMcpTool",
    "canRunPlugin",
    "canRunSkill",
    "canIssuePermissionLease",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowEventStoreWrite",
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
    code: "PRIVATE_KEY_MARKER",
    kind: "secret",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_PROMPT_MARKER",
    kind: "raw_field",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b|raw prompt`, "i")
  },
  {
    code: "RAW_SOURCE_MARKER",
    kind: "raw_field",
    pattern: new RegExp(`\\b${rawPrefix}${"Source"}\\b|raw source`, "i")
  },
  {
    code: "RAW_DIFF_MARKER",
    kind: "raw_field",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b|raw diff`, "i")
  },
  {
    code: "REASONING_CONTENT_MARKER",
    kind: "raw_field",
    pattern: /reasoning text|reasoning_content/i
  }
] satisfies Array<{
  code: string;
  kind: AgentRunPlanFindingKind;
  pattern: RegExp;
}>;

export function buildFixedAgentRunPlan(
  input: FixedAgentRunPlanInput,
  options: FixedAgentRunPlanOptions = {}
): AgentRunPlanValidationResult {
  return validateFixedAgentRunPlan(input, options);
}

export function validateFixedAgentRunPlan(
  input: FixedAgentRunPlanInput,
  options: FixedAgentRunPlanOptions = {}
): AgentRunPlanValidationResult {
  const findings: AgentRunPlanFinding[] = [];
  const parsed = parseInput(input, findings);
  if (!isRecord(parsed)) {
    return resultFrom(undefined, findings, undefined);
  }

  findings.push(...findForbiddenFields(parsed));
  findings.push(...findUnsafeStringMarkers(parsed));

  const intent = parseIntent(parsed.intent);
  const objectiveSummary = safeString(parsed.objectiveSummary);

  if (intent === undefined) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "UNKNOWN_INTENT",
        "Unknown fixed agent intent.",
        "intent"
      )
    );
  } else if (intent === "unknown") {
    findings.push(
      finding(
        "schema",
        "warning",
        "INTENT_UNKNOWN_NEEDS_CLARIFICATION",
        "Intent is unknown and needs clarification before a fixed route can be planned.",
        "intent"
      )
    );
  }

  if (objectiveSummary.length === 0 && intent !== undefined) {
    findings.push(
      finding(
        "schema",
        "warning",
        "OBJECTIVE_SUMMARY_EMPTY",
        "Objective summary is empty; dossier summaries will be incomplete.",
        "objectiveSummary"
      )
    );
  }

  const routeFindings = validateRouteFields(parsed, intent);
  findings.push(...routeFindings);
  findings.push(...validateDossierFields(parsed, intent));

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const canBuildPlan =
    blockerCount === 0 &&
    intent !== undefined &&
    intent !== "unknown" &&
    objectiveSummary.length > 0;
  const plan = canBuildPlan
    ? normalizePlan(parsed, intent, objectiveSummary, findings, options)
    : undefined;
  return resultFrom(plan, findings, intent);
}

export function summarizeFixedAgentRunPlan(
  plan: FixedAgentRunPlan
): FixedAgentRunPlanSummary {
  return {
    planId: plan.planId,
    status: plan.warningCodes.length > 0 ? "warning" : "planned",
    intent: plan.intent,
    roles: plan.roles,
    route: plan.route.roles,
    dossierCount: plan.handoffDossiers.length,
    evidenceRefCount: plan.evidenceRefs.length,
    capabilityPlanRefCount: plan.capabilityPlanRefs.length,
    contextRefCount: plan.contextRefs.length,
    memoryRefCount: plan.memoryRefs.length,
    warningCodes: plan.warningCodes,
    blockerCodes: plan.blockerCodes,
    planHash: plan.planHash,
    summaryOnly: true
  };
}

function parseInput(
  input: FixedAgentRunPlanInput,
  findings: AgentRunPlanFinding[]
): unknown {
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as unknown;
    } catch {
      findings.push(
        finding(
          "schema",
          "blocker",
          "INVALID_JSON",
          "Run plan input JSON could not be parsed."
        )
      );
      return undefined;
    }
  }
  if (isRecord(input)) {
    return input;
  }
  if (input === undefined || input === null) {
    return {};
  }
  findings.push(
    finding(
      "schema",
      "blocker",
      "INVALID_INPUT",
      "Run plan input must be an object or JSON string."
    )
  );
  return undefined;
}

function validateRouteFields(
  input: Record<string, unknown>,
  intent: FixedAgentIntent | undefined
): AgentRunPlanFinding[] {
  const findings: AgentRunPlanFinding[] = [];
  const expectedRoute =
    intent !== undefined && intent !== "unknown"
      ? fixedRoutes[intent]
      : undefined;

  const routeRoles = readRoleList(input.route, "route", findings);
  const explicitRoles = readRoleList(input.roles, "roles", findings);
  const routeToCheck = routeRoles.length > 0 ? routeRoles : explicitRoles;

  if (expectedRoute !== undefined && routeToCheck.length > 0) {
    if (!sameRoute(routeToCheck, expectedRoute)) {
      findings.push(
        finding(
          "route",
          "blocker",
          "FIXED_ROUTE_MISMATCH",
          "Route does not match the fixed route for this intent.",
          routeRoles.length > 0 ? "route" : "roles"
        )
      );
    }
  }
  if (intent === "unknown" && routeToCheck.length > 0) {
    findings.push(
      finding(
        "route",
        "blocker",
        "UNKNOWN_INTENT_ROUTE_NOT_ALLOWED",
        "Unknown intent cannot supply a fixed execution route.",
        routeRoles.length > 0 ? "route" : "roles"
      )
    );
  }
  return findings;
}

function validateDossierFields(
  input: Record<string, unknown>,
  intent: FixedAgentIntent | undefined
): AgentRunPlanFinding[] {
  const findings: AgentRunPlanFinding[] = [];
  if (!Array.isArray(input.handoffDossiers)) {
    return findings;
  }
  const expectedRoute =
    intent !== undefined && intent !== "unknown"
      ? fixedRoutes[intent]
      : undefined;
  for (const [index, item] of input.handoffDossiers.entries()) {
    if (!isRecord(item)) {
      findings.push(
        finding(
          "dossier",
          "blocker",
          "DOSSIER_INVALID",
          "Handoff dossier must be an object.",
          `handoffDossiers.${index}`
        )
      );
      continue;
    }
    const fromRole = parseRole(item.fromRole);
    const toRole = parseRole(item.toRole);
    if (fromRole === undefined) {
      findings.push(
        finding(
          "role",
          "blocker",
          "UNKNOWN_ROLE",
          "Handoff dossier has an unknown fromRole.",
          `handoffDossiers.${index}.fromRole`
        )
      );
    }
    if (toRole === undefined) {
      findings.push(
        finding(
          "role",
          "blocker",
          "UNKNOWN_ROLE",
          "Handoff dossier has an unknown toRole.",
          `handoffDossiers.${index}.toRole`
        )
      );
    }
    if (
      expectedRoute !== undefined &&
      fromRole !== undefined &&
      toRole !== undefined
    ) {
      const expectedRoles: FixedAgentRole[] = [...expectedRoute];
      const fromIndex = expectedRoles.indexOf(fromRole);
      const toIndex = expectedRoles.indexOf(toRole);
      if (fromIndex < 0 || toIndex !== fromIndex + 1) {
        findings.push(
          finding(
            "route",
            "blocker",
            "DOSSIER_ROUTE_MISMATCH",
            "Handoff dossier roles do not follow the fixed route order.",
            `handoffDossiers.${index}`
          )
        );
      }
    }
  }
  return findings;
}

function normalizePlan(
  input: Record<string, unknown>,
  intent: Exclude<FixedAgentIntent, "unknown">,
  objectiveSummary: string,
  findings: AgentRunPlanFinding[],
  options: FixedAgentRunPlanOptions
): FixedAgentRunPlan {
  const roles = [...fixedRoutes[intent]];
  const evidenceRefs = normalizeEvidenceRefs(input.evidenceRefs);
  const capabilityPlanRefs = safeStringArray(input.capabilityPlanRefs);
  const contextRefs = safeStringArray(input.contextRefs);
  const memoryRefs = safeStringArray(input.memoryRefs);
  const warningCodes = uniqueStrings(
    findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code)
  );
  const blockerCodes = uniqueStrings(
    findings
      .filter((item) => item.severity === "blocker")
      .map((item) => item.code)
  );
  const planSeed = stableStringify({
    intent,
    roles,
    objectiveSummary,
    evidenceRefs,
    capabilityPlanRefs,
    contextRefs,
    memoryRefs,
    createdAt: options.createdAt ?? safeString(input.createdAt)
  });
  const planId =
    safeString(input.planId) ||
    options.idGenerator?.() ||
    `fixed-agent-plan-${stablePreviewHash(planSeed).slice(0, 16)}`;
  const route: FixedAgentRoute = {
    intent,
    roles: [...roles]
  };
  const handoffDossiers = normalizeDossiers({
    input,
    planId,
    intent,
    roles,
    objectiveSummary,
    evidenceRefs,
    capabilityPlanRefs,
    contextRefs,
    memoryRefs,
    warningCodes
  });
  const planHash = stablePreviewHash(
    stableStringify({
      planId,
      intent,
      roles,
      objectiveSummary,
      handoffDossiers,
      evidenceRefs,
      capabilityPlanRefs,
      contextRefs,
      memoryRefs,
      warningCodes,
      blockerCodes
    })
  );
  return {
    planId,
    intent,
    route,
    roles: [...roles],
    objectiveSummary,
    handoffDossiers,
    evidenceRefs,
    capabilityPlanRefs,
    contextRefs,
    memoryRefs,
    warningCodes,
    blockerCodes,
    readiness: readiness(true),
    planHash,
    source: "runtime_fixed_agent_run_plan"
  };
}

function normalizeDossiers(input: {
  input: Record<string, unknown>;
  planId: string;
  intent: Exclude<FixedAgentIntent, "unknown">;
  roles: readonly FixedAgentRole[];
  objectiveSummary: string;
  evidenceRefs: AgentHandoffEvidenceRef[];
  capabilityPlanRefs: string[];
  contextRefs: string[];
  memoryRefs: string[];
  warningCodes: string[];
}): AgentHandoffDossier[] {
  if (Array.isArray(input.input.handoffDossiers)) {
    const normalized = input.input.handoffDossiers
      .filter(isRecord)
      .map((item, index) => {
        const fromRole = parseRole(item.fromRole);
        const toRole = parseRole(item.toRole);
        if (fromRole === undefined || toRole === undefined) {
          return undefined;
        }
        return dossierFrom({
          planId: input.planId,
          order: index + 1,
          fromRole,
          toRole,
          intent: input.intent,
          objectiveSummary: input.objectiveSummary,
          summary:
            safeString(item.summary) ||
            `${fromRole} to ${toRole} handoff summary.`,
          evidenceRefs: normalizeEvidenceRefs(
            item.evidenceRefs,
            input.evidenceRefs
          ),
          capabilityPlanRefs: safeStringArray(
            item.capabilityPlanRefs,
            input.capabilityPlanRefs
          ),
          contextRefs: safeStringArray(item.contextRefs, input.contextRefs),
          memoryRefs: safeStringArray(item.memoryRefs, input.memoryRefs),
          warningCodes: uniqueStrings([
            ...input.warningCodes,
            ...safeStringArray(item.warningCodes)
          ]),
          blockerCodes: safeStringArray(item.blockerCodes)
        });
      })
      .filter((item): item is AgentHandoffDossier => item !== undefined);
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return input.roles.slice(0, -1).map((fromRole, index) =>
    dossierFrom({
      planId: input.planId,
      order: index + 1,
      fromRole,
      toRole: input.roles[index + 1]!,
      intent: input.intent,
      objectiveSummary: input.objectiveSummary,
      summary: `${fromRole} to ${input.roles[index + 1]} summary-only handoff.`,
      evidenceRefs: input.evidenceRefs,
      capabilityPlanRefs: input.capabilityPlanRefs,
      contextRefs: input.contextRefs,
      memoryRefs: input.memoryRefs,
      warningCodes: input.warningCodes,
      blockerCodes: []
    })
  );
}

function dossierFrom(input: {
  planId: string;
  order: number;
  fromRole: FixedAgentRole;
  toRole: FixedAgentRole;
  intent: Exclude<FixedAgentIntent, "unknown">;
  objectiveSummary: string;
  summary: string;
  evidenceRefs: AgentHandoffEvidenceRef[];
  capabilityPlanRefs: string[];
  contextRefs: string[];
  memoryRefs: string[];
  warningCodes: string[];
  blockerCodes: string[];
}): AgentHandoffDossier {
  const dossierHash = stablePreviewHash(
    stableStringify({
      planId: input.planId,
      order: input.order,
      fromRole: input.fromRole,
      toRole: input.toRole,
      intent: input.intent,
      objectiveSummary: input.objectiveSummary,
      summary: input.summary,
      evidenceRefs: input.evidenceRefs,
      capabilityPlanRefs: input.capabilityPlanRefs,
      contextRefs: input.contextRefs,
      memoryRefs: input.memoryRefs,
      warningCodes: input.warningCodes,
      blockerCodes: input.blockerCodes
    })
  );
  return {
    dossierId: `${input.planId}-dossier-${input.order}`,
    order: input.order,
    fromRole: input.fromRole,
    toRole: input.toRole,
    intent: input.intent,
    objectiveSummary: input.objectiveSummary,
    summary: input.summary,
    evidenceRefs: input.evidenceRefs,
    capabilityPlanRefs: input.capabilityPlanRefs,
    contextRefs: input.contextRefs,
    memoryRefs: input.memoryRefs,
    warningCodes: input.warningCodes,
    blockerCodes: input.blockerCodes,
    summaryOnly: true,
    dossierHash
  };
}

function normalizeEvidenceRefs(
  value: unknown,
  fallback: AgentHandoffEvidenceRef[] = []
): AgentHandoffEvidenceRef[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter(isRecord).map((item, index) => {
    const refId =
      safeString(item.refId) || safeString(item.id) || `evidence-${index + 1}`;
    const kind = normalizeEvidenceKind(item.kind);
    const summary = safeString(item.summary) || "Evidence summary unavailable.";
    return {
      refId,
      kind,
      summary,
      hashPrefix: safeString(item.hashPrefix) || undefined,
      warningCodes: safeStringArray(item.warningCodes)
    };
  });
}

function normalizeEvidenceKind(
  value: unknown
): AgentHandoffEvidenceRef["kind"] {
  const text = safeString(value);
  if (
    text === "artifact" ||
    text === "event" ||
    text === "test_result" ||
    text === "context_summary" ||
    text === "capability_plan" ||
    text === "manual_note" ||
    text === "memory_ref"
  ) {
    return text;
  }
  return "manual_note";
}

function readRoleList(
  value: unknown,
  path: string,
  findings: AgentRunPlanFinding[]
): FixedAgentRole[] {
  const rolesValue =
    isRecord(value) && Array.isArray(value.roles) ? value.roles : value;
  if (!Array.isArray(rolesValue)) {
    return [];
  }
  const roles: FixedAgentRole[] = [];
  for (const [index, item] of rolesValue.entries()) {
    const role = parseRole(item);
    if (role === undefined) {
      findings.push(
        finding(
          "role",
          "blocker",
          "UNKNOWN_ROLE",
          "Run plan contains an unknown fixed agent role.",
          `${path}.${index}`
        )
      );
    } else {
      roles.push(role);
    }
  }
  return roles;
}

function findForbiddenFields(input: unknown): AgentRunPlanFinding[] {
  const findings: AgentRunPlanFinding[] = [];
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
          "Run plan input contains a forbidden field.",
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
          "Run plan input attempts to enable execution readiness.",
          "readiness"
        )
      );
    }
  });
  return dedupeFindings(findings);
}

function findUnsafeStringMarkers(input: unknown): AgentRunPlanFinding[] {
  const findings: AgentRunPlanFinding[] = [];
  visit(input, [], (path, value) => {
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
            "Run plan input contains an unsafe marker.",
            "blockedMarker"
          )
        );
      }
    }
  });
  return dedupeFindings(findings);
}

function resultFrom(
  plan: FixedAgentRunPlan | undefined,
  findings: AgentRunPlanFinding[],
  intent: FixedAgentIntent | undefined
): AgentRunPlanValidationResult {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status = statusFrom(plan, intent, blockerCount, warningCount);
  const summary =
    plan === undefined
      ? emptySummary(status, intent, findings)
      : summarizeFixedAgentRunPlan(plan);
  return {
    status,
    plan,
    summary: {
      ...summary,
      status
    },
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    normalizedHash: stablePreviewHash(
      stableStringify({
        summary,
        findingCodes: findings.map((item) => item.code)
      })
    ),
    readiness: readiness(plan !== undefined),
    nextAction: nextActionFor(status),
    source: "runtime_fixed_agent_run_plan_schema"
  };
}

function emptySummary(
  status: AgentRunPlanValidationStatus,
  intent: FixedAgentIntent | undefined,
  findings: AgentRunPlanFinding[]
): FixedAgentRunPlanSummary {
  return {
    status,
    intent,
    roles: [],
    route: [],
    dossierCount: 0,
    evidenceRefCount: 0,
    capabilityPlanRefCount: 0,
    contextRefCount: 0,
    memoryRefCount: 0,
    warningCodes: uniqueStrings(
      findings
        .filter((item) => item.severity === "warning")
        .map((item) => item.code)
    ),
    blockerCodes: uniqueStrings(
      findings
        .filter((item) => item.severity === "blocker")
        .map((item) => item.code)
    ),
    summaryOnly: true
  };
}

function statusFrom(
  plan: FixedAgentRunPlan | undefined,
  intent: FixedAgentIntent | undefined,
  blockerCount: number,
  warningCount: number
): AgentRunPlanValidationStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (intent === "unknown") {
    return "needs_clarification";
  }
  if (plan === undefined && intent === undefined && warningCount === 0) {
    return "empty";
  }
  if (plan === undefined) {
    return warningCount > 0 ? "warning" : "empty";
  }
  return warningCount > 0 ? "warning" : "planned";
}

function nextActionFor(status: AgentRunPlanValidationStatus): string {
  if (status === "planned") {
    return "Run plan schema is valid. Future orchestration remains disabled until P0Z-003.";
  }
  if (status === "warning") {
    return "Review warning codes before a future orchestrator consumes this summary-only plan.";
  }
  if (status === "needs_clarification") {
    return "Clarify intent before a fixed agent route can be planned.";
  }
  if (status === "blocked") {
    return "Remove unsafe, dynamic, raw, or execution fields before planning.";
  }
  return "Provide a summary-only objective and fixed intent to build a run plan.";
}

function readiness(
  canEnterAgentRunPlanPreview: boolean
): AgentRunPlanReadiness {
  return {
    canEnterAgentRunPlanPreview,
    canRequestCapabilityBroker: canEnterAgentRunPlanPreview,
    canExecuteAgents: false,
    canInvokeCapability: false,
    canWriteFiles: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canInvokeMcpTool: false,
    canRunPlugin: false,
    canRunSkill: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function parseIntent(value: unknown): FixedAgentIntent | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return fixedIntents.includes(value as FixedAgentIntent)
    ? (value as FixedAgentIntent)
    : undefined;
}

function parseRole(value: unknown): FixedAgentRole | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return fixedRoles.includes(value as FixedAgentRole)
    ? (value as FixedAgentRole)
    : undefined;
}

function sameRoute(
  actual: readonly FixedAgentRole[],
  expected: readonly FixedAgentRole[]
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((role, index) => role === expected[index])
  );
}

function codeForForbiddenKind(kind: AgentRunPlanFindingKind): string {
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
    return "DIRECT_CAPABILITY_INVOCATION_BLOCKED";
  }
  if (kind === "memory_context") {
    return "HIDDEN_CONTEXT_OR_MEMORY_BLOCKED";
  }
  if (kind === "route") {
    return "DYNAMIC_BIDDING_BLOCKED";
  }
  if (kind === "role") {
    return "ARBITRARY_AGENT_BLOCKED";
  }
  return "FORBIDDEN_FIELD_BLOCKED";
}

function finding(
  kind: AgentRunPlanFindingKind,
  severity: AgentRunPlanSeverity,
  code: string,
  safeMessage: string,
  path?: string | undefined
): AgentRunPlanFinding {
  const findingId = `agent-run-plan-finding-${stablePreviewHash(
    [kind, severity, code, path ?? ""].join("|")
  ).slice(0, 12)}`;
  return {
    findingId,
    kind,
    severity,
    code,
    safeMessage,
    path
  };
}

function dedupeFindings(
  findings: AgentRunPlanFinding[]
): AgentRunPlanFinding[] {
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

function safeStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return uniqueStrings(value.map(safeString).filter((item) => item.length > 0));
}

function uniqueStrings(values: readonly string[]): string[] {
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
