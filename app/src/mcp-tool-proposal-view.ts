import type { AppWorkbenchApprovalRef } from "./workbench-surfaces.js";
import { safeText } from "./safety.js";

export type McpToolProposalStatus =
  | "empty"
  | "proposal_ready"
  | "warning"
  | "blocked";

export type McpToolProposalFindingSeverity = "blocker" | "warning";

export type McpToolProposalFinding = {
  code: string;
  severity: McpToolProposalFindingSeverity;
  safeMessage: string;
};

export type McpToolProposalReadiness = {
  canDisplayProposal: boolean;
  canInvokeMcpTool: false;
  canApproveToolInvocation: false;
  canCallTool: false;
  canReadMcpResourceContent: false;
  canExecuteMcpPrompt: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canIssuePermissionLease: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type McpToolProposalView = {
  status: McpToolProposalStatus;
  source: "app_mcp_tool_proposal_surface";
  proposalViewId: string;
  sourceKind: "paste" | "fixture" | "manual_test";
  proposalId?: string | undefined;
  serverRef?: string | undefined;
  toolName?: string | undefined;
  riskLevel: string;
  inputSchemaSummary: string;
  argumentSummaryHash: string;
  approvalRequired: boolean;
  simulatedResultSummary: string;
  brokerPlanningSummary: string;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: McpToolProposalFinding[];
  proposalHashPrefix?: string | undefined;
  readiness: McpToolProposalReadiness;
  nextAction: string;
};

export type McpToolProposalViewInput = {
  summaryJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

type ParseResult =
  | {
      ok: true;
      value: Record<string, unknown>;
      findings: McpToolProposalFinding[];
    }
  | {
      ok: false;
      status: "empty" | "blocked";
      findings: McpToolProposalFinding[];
    };

const rawPrefix = "raw";

const forbiddenFieldNames = new Set(
  [
    rawPrefix + "Args",
    rawPrefix + "Arguments",
    rawPrefix + "Input",
    rawPrefix + "Output",
    rawPrefix + "ToolOutput",
    rawPrefix + "ResourceContent",
    "resourceContent",
    "toolArgs",
    "toolArguments",
    rawPrefix + "Prompt",
    rawPrefix + "Response",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    "fileContent",
    "beforeContent",
    "afterContent",
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
    "toolCall",
    "callTool",
    "tools/call",
    "resources/read"
  ].map((key) => key.toLowerCase())
);

const executionFlagNames = new Set(
  [
    "canInvokeMcpTool",
    "canApproveToolInvocation",
    "canCallTool",
    "canReadMcpResourceContent",
    "canExecuteMcpPrompt",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canIssuePermissionLease",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "toolInvocationEnabled",
    "approvalExecutionEnabled",
    "eventWriteEnabled",
    "fetchEnabled",
    "networkEnabled"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`, "i")
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/i
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i
  },
  {
    code: "PASSWORD_VALUE_MARKER",
    pattern: /\bPASSWORD_VALUE_MARKER\b/i
  },
  {
    code: "RAW_ARGUMENT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}(Args|Arguments|Input)\\b`, "i")
  },
  {
    code: "RAW_OUTPUT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}(Output|ToolOutput|Response)\\b`, "i")
  },
  {
    code: "MCP_TOOL_CALL_MARKER",
    pattern: /tools\/call|callTool/i
  }
];

export function buildMcpToolProposalView(
  input: McpToolProposalViewInput = {}
): McpToolProposalView {
  const sourceKind = input.sourceKind ?? "paste";
  const parsed = parseSummaryJson(safeText(input.summaryJsonText, ""));
  if (!parsed.ok) {
    const hash = hashText(
      stableStringify({
        status: parsed.status,
        sourceKind,
        createdAt: input.createdAt ?? "not-provided"
      })
    );
    return viewFrom({
      status: parsed.status,
      sourceKind,
      hash,
      findings: parsed.findings,
      riskLevel: "n/a",
      inputSchemaSummary: "n/a",
      argumentSummaryHash: "n/a",
      approvalRequired: false,
      simulatedResultSummary: "n/a",
      brokerPlanningSummary: "n/a",
      nextAction:
        parsed.status === "empty"
          ? "Paste summary-only MCP tool proposal JSON to preview approval and risk status."
          : "Provide valid summary-only MCP tool proposal JSON."
    });
  }

  const findings = [...parsed.findings];
  scanSummary(parsed.value, findings);
  addProposalWarnings(parsed.value, findings, sourceKind);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const hash = hashText(
    stableStringify({
      summary: safeSummarySeed(parsed.value),
      sourceKind,
      blockerCount
    })
  );
  const status: McpToolProposalStatus =
    blockerCount > 0
      ? "blocked"
      : findings.some((findingItem) => findingItem.severity === "warning")
        ? "warning"
        : "proposal_ready";

  return viewFrom({
    status,
    sourceKind,
    hash,
    findings,
    proposalId: readString(parsed.value, [
      "proposalId",
      "proposalSummary.proposalId"
    ]),
    serverRef: readString(parsed.value, [
      "serverRef",
      "serverRefHash",
      "proposalSummary.serverRef",
      "proposalSummary.serverRefHash",
      "mcpServerRefHash"
    ]),
    toolName: readString(parsed.value, [
      "toolName",
      "proposalSummary.toolName",
      "tool.name"
    ]),
    riskLevel:
      readString(parsed.value, [
        "riskLevel",
        "riskReportSummary.riskLevel",
        "toolRiskLevel"
      ]) ?? "unknown",
    inputSchemaSummary:
      readString(parsed.value, [
        "inputSchemaSummary",
        "toolInputSchemaSummaryHash",
        "riskReportSummary.inputSchemaHash",
        "schemaHash",
        "inputSchemaHash"
      ]) ?? "n/a",
    argumentSummaryHash:
      readString(parsed.value, [
        "argumentSummaryHash",
        "argsSummaryHash",
        "argumentHash",
        "proposalSummary.argumentSummaryHash"
      ]) ?? "n/a",
    approvalRequired:
      readBoolean(parsed.value, [
        "approvalRequired",
        "proposalSummary.approvalRequired",
        "brokerPlanningSummary.approvalRequired"
      ]) ?? true,
    simulatedResultSummary: summarizeNested(parsed.value, [
      "simulatedResultSummary",
      "simulationSummary",
      "dryRunSummary"
    ]),
    brokerPlanningSummary: summarizeNested(parsed.value, [
      "brokerPlanningSummary",
      "capabilityBrokerPlanningSummary",
      "brokerSummary"
    ]),
    nextAction: nextActionFor(status)
  });
}

export function summarizeMcpToolProposalView(
  view: McpToolProposalView
): {
  status: McpToolProposalStatus;
  proposalViewId: string;
  proposalId?: string | undefined;
  serverRef?: string | undefined;
  toolName?: string | undefined;
  riskLevel: string;
  inputSchemaSummary: string;
  argumentSummaryHash: string;
  approvalRequired: boolean;
  simulatedResultSummary: string;
  brokerPlanningSummary: string;
  blockerCount: number;
  warningCount: number;
  proposalHashPrefix?: string | undefined;
  nextAction: string;
  source: "app_mcp_tool_proposal_surface";
} {
  return {
    status: view.status,
    proposalViewId: view.proposalViewId,
    proposalId: view.proposalId,
    serverRef: view.serverRef,
    toolName: view.toolName,
    riskLevel: view.riskLevel,
    inputSchemaSummary: view.inputSchemaSummary,
    argumentSummaryHash: view.argumentSummaryHash,
    approvalRequired: view.approvalRequired,
    simulatedResultSummary: view.simulatedResultSummary,
    brokerPlanningSummary: view.brokerPlanningSummary,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    proposalHashPrefix: view.proposalHashPrefix,
    nextAction: view.nextAction,
    source: view.source
  };
}

export function mcpToolProposalApprovalRefs(
  view: McpToolProposalView
): AppWorkbenchApprovalRef[] {
  if (view.status === "empty") {
    return [];
  }
  return [
    {
      id: view.proposalViewId,
      label: `MCP tool proposal: ${view.toolName ?? "unknown tool"}`,
      kind: "capability",
      status: view.status === "blocked" ? "blocked" : "dry",
      summary: [
        view.status,
        `server:${view.serverRef ?? "n/a"}`,
        `risk:${view.riskLevel}`,
        `approval:${view.approvalRequired ? "required" : "not-required"}`,
        `invoke:no`
      ].join(" | ")
    }
  ];
}

export function mcpToolProposalWarningCodes(
  view: McpToolProposalView
): string[] {
  if (view.status === "empty") {
    return [];
  }
  return view.findings.map((findingItem) => findingItem.code);
}

function parseSummaryJson(text: string): ParseResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, status: "empty", findings: [] };
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isRecord(parsed)) {
      return {
        ok: false,
        status: "blocked",
        findings: [
          finding(
            "MALFORMED_MCP_TOOL_PROPOSAL_JSON",
            "blocker",
            "MCP tool proposal JSON must be an object."
          )
        ]
      };
    }
    return { ok: true, value: parsed, findings: [] };
  } catch {
    return {
      ok: false,
      status: "blocked",
      findings: [
        finding(
          "MALFORMED_MCP_TOOL_PROPOSAL_JSON",
          "blocker",
          "MCP tool proposal JSON could not be parsed."
        )
      ]
    };
  }
}

function viewFrom(args: {
  status: McpToolProposalStatus;
  sourceKind: "paste" | "fixture" | "manual_test";
  hash: string;
  findings: McpToolProposalFinding[];
  proposalId?: string | undefined;
  serverRef?: string | undefined;
  toolName?: string | undefined;
  riskLevel: string;
  inputSchemaSummary: string;
  argumentSummaryHash: string;
  approvalRequired: boolean;
  simulatedResultSummary: string;
  brokerPlanningSummary: string;
  nextAction: string;
}): McpToolProposalView {
  const blockerCount = args.findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount = args.findings.filter(
    (findingItem) => findingItem.severity === "warning"
  ).length;
  return {
    status: args.status,
    source: "app_mcp_tool_proposal_surface",
    proposalViewId: `mcp-tool-proposal-${args.hash.slice(0, 12)}`,
    sourceKind: args.sourceKind,
    proposalId: args.proposalId,
    serverRef: args.serverRef,
    toolName: args.toolName,
    riskLevel: args.riskLevel,
    inputSchemaSummary: args.inputSchemaSummary,
    argumentSummaryHash: args.argumentSummaryHash,
    approvalRequired: args.approvalRequired,
    simulatedResultSummary: args.simulatedResultSummary,
    brokerPlanningSummary: args.brokerPlanningSummary,
    blockerCount,
    warningCount,
    findingCount: args.findings.length,
    findings: args.findings,
    proposalHashPrefix: args.hash.slice(0, 12),
    readiness: readinessFor(args.status !== "empty" && blockerCount === 0),
    nextAction: args.nextAction
  };
}

function scanSummary(
  value: unknown,
  findings: McpToolProposalFinding[],
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    for (const { code, pattern } of unsafeStringPatterns) {
      if (pattern.test(value)) {
        findings.push(finding(code, "blocker", safeMessageFor(code)));
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => {
      scanSummary(item, findings, seen);
    });
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (forbiddenFieldNames.has(normalizedKey)) {
      findings.push(
        finding(
          `${key.replace(/[^a-z0-9]/gi, "_").toUpperCase()}_FIELD_REJECTED`,
          "blocker",
          "Forbidden MCP tool proposal field was rejected."
        )
      );
    }
    if (executionFlagNames.has(normalizedKey) && nestedValue === true) {
      findings.push(
        finding(
          "MCP_TOOL_PROPOSAL_EXECUTION_FLAG_TRUE",
          "blocker",
          "MCP tool proposal cannot claim invocation, approval execution, or mutation readiness."
        )
      );
    }
    scanSummary(nestedValue, findings, seen);
  }
}

function addProposalWarnings(
  value: Record<string, unknown>,
  findings: McpToolProposalFinding[],
  sourceKind: "paste" | "fixture" | "manual_test"
): void {
  if (
    readString(value, [
      "argumentSummaryHash",
      "argsSummaryHash",
      "proposalSummary.argumentSummaryHash"
    ]) === undefined
  ) {
    findings.push(
      finding(
        "ARGUMENT_SUMMARY_HASH_MISSING",
        "warning",
        "MCP tool proposal is missing an argument summary hash."
      )
    );
  }
  if (
    readString(value, [
      "inputSchemaSummary",
      "toolInputSchemaSummaryHash",
      "riskReportSummary.inputSchemaHash"
    ]) === undefined
  ) {
    findings.push(
      finding(
        "INPUT_SCHEMA_SUMMARY_MISSING",
        "warning",
        "MCP tool proposal is missing an input schema summary."
      )
    );
  }
  if (summarizeNested(value, ["simulatedResultSummary"]) === "n/a") {
    findings.push(
      finding(
        "SIMULATED_RESULT_SUMMARY_MISSING",
        "warning",
        "MCP tool proposal has no simulated result summary."
      )
    );
  }
  if (sourceKind === "manual_test") {
    findings.push(
      finding(
        "MANUAL_TEST_SOURCE",
        "warning",
        "Manual MCP tool proposal summaries should be reviewed before sharing."
      )
    );
  }
}

function summarizeNested(
  value: Record<string, unknown>,
  paths: string[]
): string {
  const nested = paths
    .map((path) => readPath(value, path))
    .find((candidate) => candidate !== undefined);
  if (nested === undefined) {
    return "n/a";
  }
  if (typeof nested === "string") {
    return safeText(nested, "summary");
  }
  if (typeof nested === "boolean" || typeof nested === "number") {
    return String(nested);
  }
  if (!isRecord(nested)) {
    return "summary";
  }
  const status = stringValue(nested, "status");
  const resultHash =
    stringValue(nested, "resultHash") ??
    stringValue(nested, "hash") ??
    stringValue(nested, "simulationHash") ??
    stringValue(nested, "planningHash");
  const warningCount =
    numberValue(nested, "warningCount") ??
    arrayValue(nested, "warningCodes")?.length ??
    0;
  return [
    status ?? "summary",
    resultHash !== undefined ? `hash:${safeText(resultHash, "hash")}` : "",
    `warnings:${warningCount}`
  ]
    .filter((part) => part.length > 0)
    .join(" | ");
}

function safeSummarySeed(value: Record<string, unknown>): Record<string, unknown> {
  return {
    proposalId: readString(value, ["proposalId", "proposalSummary.proposalId"]),
    serverRef: readString(value, [
      "serverRef",
      "serverRefHash",
      "proposalSummary.serverRefHash"
    ]),
    toolName: readString(value, ["toolName", "proposalSummary.toolName"]),
    riskLevel: readString(value, ["riskLevel", "riskReportSummary.riskLevel"]),
    inputSchemaSummary: readString(value, [
      "inputSchemaSummary",
      "toolInputSchemaSummaryHash",
      "riskReportSummary.inputSchemaHash"
    ]),
    argumentSummaryHash: readString(value, [
      "argumentSummaryHash",
      "argsSummaryHash",
      "proposalSummary.argumentSummaryHash"
    ]),
    approvalRequired: readBoolean(value, [
      "approvalRequired",
      "proposalSummary.approvalRequired"
    ]),
    simulatedResultSummary: summarizeNested(value, ["simulatedResultSummary"]),
    brokerPlanningSummary: summarizeNested(value, ["brokerPlanningSummary"])
  };
}

function readString(
  value: Record<string, unknown>,
  paths: string[]
): string | undefined {
  for (const path of paths) {
    const candidate = readPath(value, path);
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return safeText(candidate, "summary");
    }
  }
  return undefined;
}

function readBoolean(
  value: Record<string, unknown>,
  paths: string[]
): boolean | undefined {
  for (const path of paths) {
    const candidate = readPath(value, path);
    if (typeof candidate === "boolean") {
      return candidate;
    }
  }
  return undefined;
}

function readPath(value: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }
    return current[key];
  }, value);
}

function nextActionFor(status: McpToolProposalStatus): string {
  switch (status) {
    case "proposal_ready":
      return "Review the summary-only MCP tool proposal in preview surfaces. Tool invocation remains disabled.";
    case "warning":
      return "Review MCP tool proposal warnings before any future approval design step.";
    case "blocked":
      return "Reject the MCP tool proposal summary and provide safe summary-only metadata.";
    case "empty":
    default:
      return "Paste summary-only MCP tool proposal JSON to preview.";
  }
}

function readinessFor(canDisplayProposal: boolean): McpToolProposalReadiness {
  return {
    canDisplayProposal,
    canInvokeMcpTool: false,
    canApproveToolInvocation: false,
    canCallTool: false,
    canReadMcpResourceContent: false,
    canExecuteMcpPrompt: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canIssuePermissionLease: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function safeMessageFor(code: string): string {
  switch (code) {
    case "API_KEY_MARKER":
    case "BEARER_TOKEN_MARKER":
    case "AUTHORIZATION_HEADER_MARKER":
    case "PRIVATE_KEY_MARKER":
    case "PASSWORD_VALUE_MARKER":
      return "MCP tool proposal summary contains a secret-like marker.";
    case "RAW_ARGUMENT_MARKER":
      return "MCP tool proposal summary cannot include raw tool arguments.";
    case "RAW_OUTPUT_MARKER":
      return "MCP tool proposal summary cannot include raw tool output.";
    case "MCP_TOOL_CALL_MARKER":
      return "MCP tool proposal summary cannot include a real tool call marker.";
    default:
      return "Unsafe MCP tool proposal content was rejected.";
  }
}

function finding(
  code: string,
  severity: McpToolProposalFindingSeverity,
  safeMessage: string
): McpToolProposalFinding {
  return { code, severity, safeMessage };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(
  value: Record<string, unknown>,
  key: string
): string | undefined {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim().length > 0
    ? safeText(candidate, "summary")
    : undefined;
}

function numberValue(
  value: Record<string, unknown>,
  key: string
): number | undefined {
  const candidate = value[key];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : undefined;
}

function arrayValue(
  value: Record<string, unknown>,
  key: string
): unknown[] | undefined {
  const candidate = value[key];
  return Array.isArray(candidate) ? candidate : undefined;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
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
