import { stablePreviewHash } from "../models/stable-preview-hash.js";
import { type FixedAgentRole } from "./fixed-agent-run-plan.js";

export type FixedAgentRoleOutputStatus = "pass" | "warn" | "block";

export type FixedAgentRoleOutputSummaryRef = {
  refId?: string | undefined;
  kind: string;
  hash?: string | undefined;
  status?: string | undefined;
  warningCodes: string[];
  summaryOnly: true;
};

export type FixedAgentRoleOutputInput = {
  role?: FixedAgentRole | string | undefined;
  routeSummary?: unknown;
  taskDecompositionSummary?: unknown;
  expectedArtifacts?: unknown;
  modelProposalImportSummaryRefs?: unknown;
  patchProposalSummary?: unknown;
  validationSummaryRefs?: unknown;
  auditSummaryRefs?: unknown;
  approvalSummaryRefs?: unknown;
  riskNotes?: unknown;
  gitSafeLaneSummaries?: unknown;
  shellSafeLaneSummaries?: unknown;
  evidenceRefs?: unknown;
  status?: FixedAgentRoleOutputStatus | string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type FixedAgentRoleOutput = {
  outputId: string;
  role: FixedAgentRole;
  status: FixedAgentRoleOutputStatus;
  routeSummaryRefs: FixedAgentRoleOutputSummaryRef[];
  taskDecompositionSummaryRefs: FixedAgentRoleOutputSummaryRef[];
  expectedArtifactRefs: FixedAgentRoleOutputSummaryRef[];
  modelProposalImportSummaryRefs: FixedAgentRoleOutputSummaryRef[];
  patchProposalSummaryRefs: FixedAgentRoleOutputSummaryRef[];
  validationAuditApprovalRefs: FixedAgentRoleOutputSummaryRef[];
  riskNotes: string[];
  gitShellSafeLaneRefs: FixedAgentRoleOutputSummaryRef[];
  evidenceRefs: FixedAgentRoleOutputSummaryRef[];
  passWarnBlockSummary: {
    status: FixedAgentRoleOutputStatus;
    warningCount: number;
    blockerCount: number;
    summaryOnly: true;
  };
  warningCodes: string[];
  blockerCodes: string[];
  readiness: FixedAgentRoleOutputReadiness;
  summaryOnly: true;
  outputHash: string;
  source: "runtime_fixed_agent_role_adapter";
};

export type FixedAgentRoleOutputFindingKind =
  | "schema"
  | "role"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "context";

export type FixedAgentRoleOutputSeverity = "blocker" | "warning";

export type FixedAgentRoleOutputFinding = {
  findingId: string;
  kind: FixedAgentRoleOutputFindingKind;
  severity: FixedAgentRoleOutputSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type FixedAgentRoleOutputReadiness = {
  canEnterCapabilityPlanning: boolean;
  canCallModel: false;
  canExecuteTools: false;
  canWriteFiles: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canCallMcpTool: false;
  canRunPlugin: false;
  canRunSkill: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type FixedAgentRoleOutputValidationResult = {
  status: "ready" | "warning" | "blocked";
  output?: FixedAgentRoleOutput | undefined;
  summary: FixedAgentRoleOutputSummary;
  findings: FixedAgentRoleOutputFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  normalizedHash: string;
  readiness: FixedAgentRoleOutputReadiness;
  nextAction: string;
  source: "runtime_fixed_agent_role_adapter_schema";
};

export type FixedAgentRoleOutputSummary = {
  outputId?: string | undefined;
  role?: FixedAgentRole | undefined;
  status: "ready" | "warning" | "blocked";
  roleStatus?: FixedAgentRoleOutputStatus | undefined;
  summaryRefCount: number;
  riskNoteCount: number;
  evidenceRefCount: number;
  warningCodes: string[];
  blockerCodes: string[];
  outputHash?: string | undefined;
  summaryOnly: true;
};

const fixedRoles = [
  "orchestrator",
  "coder",
  "reviewer",
  "verifier"
] as const satisfies readonly FixedAgentRole[];

const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authorizationField = ["Author", "ization"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const forbiddenFieldEntries: Array<[string, FixedAgentRoleOutputFindingKind]> =
  [
    [rawPrefix + "Prompt", "raw_field"],
    [rawPrefix + "Source", "raw_field"],
    [rawPrefix + "Diff", "raw_field"],
    [rawPrefix + "Response", "raw_field"],
    ["promptText", "raw_field"],
    ["sourceText", "raw_field"],
    ["diffText", "raw_field"],
    ["responseText", "raw_field"],
    ["beforeContent", "raw_field"],
    ["afterContent", "raw_field"],
    ["fileContent", "raw_field"],
    ["preimageContent", "raw_field"],
    ["backupContent", "raw_field"],
    [reasoningSnakeField, "raw_field"],
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
    ["tauriCommand", "execution_field"],
    ["toolCall", "execution_field"],
    ["tools", "execution_field"],
    [toolChoiceField, "execution_field"],
    ["applyNow", "execution_field"],
    ["rollbackNow", "execution_field"],
    ["eventStoreWrite", "execution_field"],
    ["permissionLease", "execution_field"],
    ["desktopAction", "execution_field"],
    ["nativeBridge", "execution_field"],
    ["dynamicBidding", "role"],
    ["hiddenContext", "context"],
    ["privateContext", "context"],
    ["rawContext", "context"]
  ];

const forbiddenFieldKinds = new Map<string, FixedAgentRoleOutputFindingKind>(
  forbiddenFieldEntries.map(([key, kind]) => [key.toLowerCase(), kind])
);

const executionAttemptKeys = new Set(
  [
    "appliedPatch",
    "calledGit",
    "calledShell",
    "calledMcp",
    "calledTool",
    "executedCommand",
    "canCallModel",
    "canExecuteTools",
    "canWriteFiles",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "canCallMcpTool",
    "canRunPlugin",
    "canRunSkill",
    "canIssuePermissionLease",
    "appCanExecute"
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
  }
] satisfies Array<{
  code: string;
  kind: FixedAgentRoleOutputFindingKind;
  pattern: RegExp;
}>;

export function buildFixedAgentRoleOutput(
  input: FixedAgentRoleOutputInput = {}
): FixedAgentRoleOutputValidationResult {
  return validateFixedAgentRoleOutputInput(input);
}

export function validateFixedAgentRoleOutputInput(
  input: FixedAgentRoleOutputInput = {}
): FixedAgentRoleOutputValidationResult {
  const findings: FixedAgentRoleOutputFinding[] = [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input)
  ];
  const role = parseRole(input.role);
  if (role === undefined) {
    findings.push(
      finding(
        "role",
        "blocker",
        "UNKNOWN_ROLE",
        "Fixed role adapter input has an unknown role.",
        "role"
      )
    );
  }
  const roleStatus = parseRoleStatus(input.status);
  if (input.status !== undefined && roleStatus === undefined) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "UNKNOWN_ROLE_OUTPUT_STATUS",
        "Fixed role output status is unknown.",
        "status"
      )
    );
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const output =
    blockerCount === 0 && role !== undefined
      ? normalizeOutput(input, role, roleStatus ?? "pass", findings)
      : undefined;
  return resultFrom(output, findings, role);
}

export function summarizeFixedAgentRoleOutput(
  output: FixedAgentRoleOutput
): FixedAgentRoleOutputSummary {
  const summaryRefCount =
    output.routeSummaryRefs.length +
    output.taskDecompositionSummaryRefs.length +
    output.expectedArtifactRefs.length +
    output.modelProposalImportSummaryRefs.length +
    output.patchProposalSummaryRefs.length +
    output.validationAuditApprovalRefs.length +
    output.gitShellSafeLaneRefs.length;
  return {
    outputId: output.outputId,
    role: output.role,
    status: output.warningCodes.length > 0 ? "warning" : "ready",
    roleStatus: output.status,
    summaryRefCount,
    riskNoteCount: output.riskNotes.length,
    evidenceRefCount: output.evidenceRefs.length,
    warningCodes: output.warningCodes,
    blockerCodes: output.blockerCodes,
    outputHash: output.outputHash,
    summaryOnly: true
  };
}

function normalizeOutput(
  input: FixedAgentRoleOutputInput,
  role: FixedAgentRole,
  status: FixedAgentRoleOutputStatus,
  findings: FixedAgentRoleOutputFinding[]
): FixedAgentRoleOutput {
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
  const routeSummaryRefs =
    role === "orchestrator"
      ? refsFrom("route_summary", input.routeSummary)
      : [];
  const taskDecompositionSummaryRefs =
    role === "orchestrator"
      ? refsFrom("task_decomposition", input.taskDecompositionSummary)
      : [];
  const expectedArtifactRefs =
    role === "orchestrator"
      ? refsFrom("expected_artifact", input.expectedArtifacts)
      : [];
  const modelProposalImportSummaryRefs =
    role === "coder"
      ? refsFrom("model_proposal_import", input.modelProposalImportSummaryRefs)
      : [];
  const patchProposalSummaryRefs =
    role === "coder"
      ? refsFrom("patch_proposal", input.patchProposalSummary)
      : [];
  const validationAuditApprovalRefs =
    role === "reviewer"
      ? [
          ...refsFrom("validation", input.validationSummaryRefs),
          ...refsFrom("audit", input.auditSummaryRefs),
          ...refsFrom("approval", input.approvalSummaryRefs)
        ]
      : [];
  const riskNotes = role === "reviewer" ? safeStringArray(input.riskNotes) : [];
  const gitShellSafeLaneRefs =
    role === "verifier"
      ? [
          ...refsFrom("git_safe_lane", input.gitSafeLaneSummaries),
          ...refsFrom("shell_safe_lane", input.shellSafeLaneSummaries)
        ]
      : [];
  const evidenceRefs =
    role === "verifier" ? refsFrom("evidence", input.evidenceRefs) : [];
  const outputId =
    input.idGenerator?.() ??
    `fixed-agent-role-output-${stablePreviewHash(
      stableStringify({
        role,
        status,
        routeSummaryRefs,
        taskDecompositionSummaryRefs,
        expectedArtifactRefs,
        modelProposalImportSummaryRefs,
        patchProposalSummaryRefs,
        validationAuditApprovalRefs,
        riskNotes,
        gitShellSafeLaneRefs,
        evidenceRefs,
        createdAt: input.createdAt
      })
    ).slice(0, 16)}`;
  const outputHash = stablePreviewHash(
    stableStringify({
      outputId,
      role,
      status,
      routeSummaryRefs,
      taskDecompositionSummaryRefs,
      expectedArtifactRefs,
      modelProposalImportSummaryRefs,
      patchProposalSummaryRefs,
      validationAuditApprovalRefs,
      riskNotes,
      gitShellSafeLaneRefs,
      evidenceRefs,
      warningCodes,
      blockerCodes
    })
  );
  return {
    outputId,
    role,
    status,
    routeSummaryRefs,
    taskDecompositionSummaryRefs,
    expectedArtifactRefs,
    modelProposalImportSummaryRefs,
    patchProposalSummaryRefs,
    validationAuditApprovalRefs,
    riskNotes,
    gitShellSafeLaneRefs,
    evidenceRefs,
    passWarnBlockSummary: {
      status,
      warningCount: warningCodes.length,
      blockerCount: blockerCodes.length,
      summaryOnly: true
    },
    warningCodes,
    blockerCodes,
    readiness: readiness(true),
    summaryOnly: true,
    outputHash,
    source: "runtime_fixed_agent_role_adapter"
  };
}

function refsFrom(
  kind: string,
  value: unknown
): FixedAgentRoleOutputSummaryRef[] {
  if (value === undefined) {
    return [];
  }
  const values = Array.isArray(value) ? value : [value];
  return values.map((item, index) => {
    if (!isRecord(item)) {
      return {
        kind,
        refId: typeof item === "string" ? item : `${kind}-${index + 1}`,
        warningCodes: [],
        summaryOnly: true
      };
    }
    return {
      kind,
      refId:
        safeString(item.refId) || safeString(item.id) || `${kind}-${index + 1}`,
      hash:
        safeString(item.hash) ||
        safeString(item.summaryHash) ||
        safeString(item.reportHash) ||
        safeString(item.resultHash) ||
        undefined,
      status: safeString(item.status) || undefined,
      warningCodes: safeStringArray(item.warningCodes),
      summaryOnly: true
    };
  });
}

function resultFrom(
  output: FixedAgentRoleOutput | undefined,
  findings: FixedAgentRoleOutputFinding[],
  role: FixedAgentRole | undefined
): FixedAgentRoleOutputValidationResult {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "ready";
  const summary =
    output === undefined
      ? emptySummary(status, role, findings)
      : summarizeFixedAgentRoleOutput(output);
  return {
    status,
    output,
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
    readiness: readiness(output !== undefined),
    nextAction: nextActionFor(status),
    source: "runtime_fixed_agent_role_adapter_schema"
  };
}

function emptySummary(
  status: "ready" | "warning" | "blocked",
  role: FixedAgentRole | undefined,
  findings: FixedAgentRoleOutputFinding[]
): FixedAgentRoleOutputSummary {
  return {
    role,
    status,
    summaryRefCount: 0,
    riskNoteCount: 0,
    evidenceRefCount: 0,
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

function findForbiddenFields(input: unknown): FixedAgentRoleOutputFinding[] {
  const findings: FixedAgentRoleOutputFinding[] = [];
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
          codeForForbiddenKind(kind, normalizedKey),
          "Fixed role output input contains a forbidden field.",
          "blockedField"
        )
      );
    }
    if (executionAttemptKeys.has(normalizedKey) && value === true) {
      findings.push(
        finding(
          "execution_field",
          "blocker",
          codeForExecutionClaim(normalizedKey),
          "Fixed role output input claims direct execution.",
          "executionClaim"
        )
      );
    }
  });
  return dedupeFindings(findings);
}

function findUnsafeStringMarkers(
  input: unknown
): FixedAgentRoleOutputFinding[] {
  const findings: FixedAgentRoleOutputFinding[] = [];
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
            "Fixed role output input contains an unsafe marker.",
            "blockedMarker"
          )
        );
      }
    }
  });
  return dedupeFindings(findings);
}

function codeForForbiddenKind(
  kind: FixedAgentRoleOutputFindingKind,
  key: string
): string {
  if (kind === "secret") {
    return "SECRET_FIELD_BLOCKED";
  }
  if (kind === "raw_field") {
    return "RAW_FIELD_BLOCKED";
  }
  if (kind === "execution_field") {
    return key === "applynow" || key === "rollbacknow"
      ? "APPLY_ROLLBACK_CLAIM_BLOCKED"
      : "EXECUTION_FIELD_BLOCKED";
  }
  if (kind === "context") {
    return "HIDDEN_RAW_CONTEXT_BLOCKED";
  }
  if (kind === "role") {
    return "DYNAMIC_BIDDING_BLOCKED";
  }
  return "FORBIDDEN_FIELD_BLOCKED";
}

function codeForExecutionClaim(key: string): string {
  if (key === "appliedpatch") {
    return "APPLIED_PATCH_CLAIM_BLOCKED";
  }
  if (key === "calledgit" || key === "calledshell" || key === "calledmcp") {
    return "DIRECT_TOOL_CALL_CLAIM_BLOCKED";
  }
  return "EXECUTION_READINESS_ATTEMPT";
}

function nextActionFor(status: "ready" | "warning" | "blocked"): string {
  if (status === "blocked") {
    return "Remove raw, secret, dynamic, or direct execution claims before role output can continue.";
  }
  if (status === "warning") {
    return "Review role output warning codes before capability planning.";
  }
  return "Role output is summary-only and may enter future capability planning. No tools were executed.";
}

function readiness(
  canEnterCapabilityPlanning: boolean
): FixedAgentRoleOutputReadiness {
  return {
    canEnterCapabilityPlanning,
    canCallModel: false,
    canExecuteTools: false,
    canWriteFiles: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canCallMcpTool: false,
    canRunPlugin: false,
    canRunSkill: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function finding(
  kind: FixedAgentRoleOutputFindingKind,
  severity: FixedAgentRoleOutputSeverity,
  code: string,
  safeMessage: string,
  path?: string | undefined
): FixedAgentRoleOutputFinding {
  return {
    findingId: `fixed-agent-role-output-finding-${stablePreviewHash(
      [kind, severity, code, path ?? ""].join("|")
    ).slice(0, 12)}`,
    kind,
    severity,
    code,
    safeMessage,
    path
  };
}

function parseRole(value: unknown): FixedAgentRole | undefined {
  return fixedRoles.includes(value as FixedAgentRole)
    ? (value as FixedAgentRole)
    : undefined;
}

function parseRoleStatus(
  value: unknown
): FixedAgentRoleOutputStatus | undefined {
  return value === "pass" || value === "warn" || value === "block"
    ? value
    : undefined;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(value.map(safeString).filter((item) => item.length > 0));
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function dedupeFindings(
  findings: FixedAgentRoleOutputFinding[]
): FixedAgentRoleOutputFinding[] {
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
