import type { LiveProposalOptInGateView } from "./live-proposal-opt-in-gate-view.js";
import type { LiveProposalRequestBuilderView } from "./live-proposal-request-builder-view.js";
import type { LiveProposalValidationIntegrationView } from "./live-proposal-validation-integration-view.js";
import type { ModelPatchProposalImportView } from "./model-patch-proposal-import-view.js";
import type { ModelProposalChainIntegrationView } from "./model-proposal-chain-integration-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type LiveProposalPreviewGateStatus =
  | "empty"
  | "gate_ready"
  | "warning"
  | "blocked";

export type LiveProposalPreviewGateStageKind =
  | "api_key_policy_metadata_only"
  | "request_builder_summary_only"
  | "runtime_adapter_explicit_opt_in_only"
  | "validation_integration_summary_only"
  | "model_import_preview_only"
  | "chain_integration_preview_only"
  | "app_live_call_disabled"
  | "app_apply_rollback_disabled"
  | "app_event_write_disabled"
  | "app_approval_execution_disabled"
  | "no_api_key_input"
  | "no_fetch_network"
  | "no_tauri_command"
  | "no_raw_prompt_response";

export type LiveProposalPreviewGateStageStatus =
  | "satisfied"
  | "warning"
  | "blocked"
  | "missing"
  | "disabled"
  | "runtime_only";

export type LiveProposalPreviewGateRequirement = {
  requirementId: string;
  stageKind: LiveProposalPreviewGateStageKind;
  label: string;
  satisfied: boolean;
  summary: string;
  warningCodes: string[];
};

export type LiveProposalPreviewGateFinding = {
  code: string;
  severity: "blocker" | "warning";
  stageKind?: LiveProposalPreviewGateStageKind | undefined;
  safeMessage: string;
};

export type LiveProposalPreviewGateStage = {
  stageId: string;
  kind: LiveProposalPreviewGateStageKind;
  label: string;
  status: LiveProposalPreviewGateStageStatus;
  summary: string;
  warningCodes: string[];
};

export type LiveProposalPreviewGateReadiness = {
  canPreviewGate: boolean;
  canCallDeepSeekFromApp: false;
  canReadApiKeyFromApp: false;
  canFetchNetworkFromApp: false;
  canSendLiveRequest: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canApprove: false;
  canReject: false;
  canIssuePermissionLease: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type LiveProposalPreviewGateView = {
  status: LiveProposalPreviewGateStatus;
  gateId: string;
  stageCount: number;
  satisfiedStageCount: number;
  warningStageCount: number;
  blockedStageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  requirements: LiveProposalPreviewGateRequirement[];
  stages: LiveProposalPreviewGateStage[];
  findings: LiveProposalPreviewGateFinding[];
  gateHash: string;
  gateHashPrefix: string;
  readiness: LiveProposalPreviewGateReadiness;
  nextAction: string;
  source: "app_live_proposal_preview_gate";
};

export type LiveProposalPreviewGateInput = {
  liveProposalApiKeyPolicyView?: LiveProposalOptInGateView | undefined;
  liveProposalRequestBuilderView?:
    | LiveProposalRequestBuilderView
    | undefined;
  liveDeepSeekProposalAdapterSummary?: unknown;
  liveProposalValidationIntegrationView?:
    | LiveProposalValidationIntegrationView
    | undefined;
  modelPatchProposalImportView?: ModelPatchProposalImportView | undefined;
  modelProposalChainIntegrationView?:
    | ModelProposalChainIntegrationView
    | undefined;
  contextAssemblyPreview?: unknown;
  auditSurface?: unknown;
  createdAt?: string | undefined;
};

const rawFieldPrefix = "raw";

const forbiddenFieldNames = new Set(
  [
    "apiKey",
    "apiKeyValue",
    "secret",
    "token",
    "Authorization",
    "bearer",
    rawFieldPrefix + "Key",
    "envValue",
    "processEnvValue",
    "vaultSecretValue",
    "password",
    rawFieldPrefix + "Prompt",
    rawFieldPrefix + "Response",
    rawFieldPrefix + "Source",
    rawFieldPrefix + "Diff",
    rawFieldPrefix + "Patch",
    rawFieldPrefix + "Dom",
    rawFieldPrefix + "Csv",
    rawFieldPrefix + "Screenshot",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
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
    "tools",
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const executionFlagNames = new Set(
  [
    "canCallDeepSeekFromApp",
    "canReadApiKeyFromApp",
    "canFetchNetworkFromApp",
    "canSendLiveRequest",
    "canApplyPatch",
    "canRollback",
    "canExecuteApply",
    "canExecuteRollback",
    "canWriteFilesystem",
    "canWriteEventStore",
    "canApprove",
    "canReject",
    "canIssuePermissionLease",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "fetchEnabled",
    "networkEnabled",
    "liveCallEnabled",
    "sendRequestEnabled",
    "apiKeyReadEnabled",
    "appExecutionEnabled"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{16,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/
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
    pattern: new RegExp(`\\braw${"Prompt"}\\b`, "i")
  },
  {
    code: "RAW_RESPONSE_MARKER",
    pattern: new RegExp(`\\braw${"Response"}\\b`, "i")
  }
];

export function buildLiveProposalPreviewGateView(
  input: LiveProposalPreviewGateInput = {}
): LiveProposalPreviewGateView {
  const inputFindings = inputFindingsFrom(input);
  const stages = hasAnySummary(input)
    ? buildStages(input)
    : inputFindings.some((finding) => finding.severity === "blocker")
      ? buildDisabledStages()
      : [];
  const stageFindings = findingsFromStages(stages);
  const findings = uniqueFindings([...inputFindings, ...stageFindings]);
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningFindingCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const warningStageCount = stages.filter((item) =>
    ["warning", "missing", "runtime_only"].includes(item.status)
  ).length;
  const blockedStageCount = stages.filter(
    (item) => item.status === "blocked"
  ).length;
  const warningCount = warningFindingCount + warningStageCount;
  const satisfiedStageCount = stages.filter((item) =>
    ["satisfied", "disabled"].includes(item.status)
  ).length;
  const gateHash = hashText(
    JSON.stringify({
      stages: stages.map((item) => [item.kind, item.status, item.summary]),
      blockers: blockerCount,
      warnings: warningCount
    })
  );
  const status = statusFrom({
    hasSummary: hasAnySummary(input),
    blockerCount,
    warningCount
  });

  return {
    status,
    gateId: `live-proposal-preview-gate-${gateHash.slice(0, 12)}`,
    stageCount: stages.length,
    satisfiedStageCount,
    warningStageCount,
    blockedStageCount,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    requirements: stages.map(requirementFromStage),
    stages,
    findings,
    gateHash,
    gateHashPrefix: gateHash.slice(0, 12),
    readiness: {
      canPreviewGate: stages.length > 0 && blockerCount === 0,
      canCallDeepSeekFromApp: false,
      canReadApiKeyFromApp: false,
      canFetchNetworkFromApp: false,
      canSendLiveRequest: false,
      canApplyPatch: false,
      canRollback: false,
      canWriteEventStore: false,
      canApprove: false,
      canReject: false,
      canIssuePermissionLease: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status),
    source: "app_live_proposal_preview_gate"
  };
}

export function summarizeLiveProposalPreviewGateView(
  view: LiveProposalPreviewGateView
): {
  status: LiveProposalPreviewGateStatus;
  gateId: string;
  stageCount: number;
  satisfiedStageCount: number;
  warningStageCount: number;
  blockedStageCount: number;
  blockerCount: number;
  warningCount: number;
  gateHash: string;
  gateHashPrefix: string;
  nextAction: string;
} {
  return {
    status: view.status,
    gateId: view.gateId,
    stageCount: view.stageCount,
    satisfiedStageCount: view.satisfiedStageCount,
    warningStageCount: view.warningStageCount,
    blockedStageCount: view.blockedStageCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    gateHash: view.gateHash,
    gateHashPrefix: view.gateHashPrefix,
    nextAction: view.nextAction
  };
}

function buildStages(
  input: LiveProposalPreviewGateInput
): LiveProposalPreviewGateStage[] {
  return [
    apiKeyPolicyStage(input.liveProposalApiKeyPolicyView),
    requestBuilderStage(input.liveProposalRequestBuilderView),
    runtimeAdapterStage(input.liveDeepSeekProposalAdapterSummary),
    validationIntegrationStage(input.liveProposalValidationIntegrationView),
    modelImportStage(input.modelPatchProposalImportView),
    chainIntegrationStage(input.modelProposalChainIntegrationView),
    fixedStage(
      "app_live_call_disabled",
      "App live call disabled",
      "The App Shell has no live DeepSeek call path."
    ),
    fixedStage(
      "app_apply_rollback_disabled",
      "App apply and rollback disabled",
      "The App Shell cannot apply patches or rollback."
    ),
    fixedStage(
      "app_event_write_disabled",
      "App event write disabled",
      "The App Shell cannot write live proposal, apply, or rollback events."
    ),
    fixedStage(
      "app_approval_execution_disabled",
      "App approval execution disabled",
      "The App Shell cannot approve, reject, or issue leases."
    ),
    fixedStage(
      "no_api_key_input",
      "No key value field",
      "The gate displays refs and hashes only; no key value is accepted."
    ),
    fixedStage(
      "no_fetch_network",
      "No fetch or network",
      "The App Shell does not fetch network or send live proposal requests."
    ),
    fixedStage(
      "no_tauri_command",
      "No Tauri command",
      "No Tauri command is added for live proposal calls."
    ),
    fixedStage(
      "no_raw_prompt_response",
      "No raw prompt or response",
      "Raw prompt, raw response, raw source, raw diff, and keys are not displayed."
    )
  ];
}

function buildDisabledStages(): LiveProposalPreviewGateStage[] {
  return [
    fixedStage(
      "app_live_call_disabled",
      "App live call disabled",
      "The App Shell has no live DeepSeek call path."
    ),
    fixedStage(
      "no_raw_prompt_response",
      "No raw prompt or response",
      "Raw prompt, raw response, raw source, raw diff, and keys are not displayed."
    )
  ];
}

function apiKeyPolicyStage(
  view: LiveProposalOptInGateView | undefined
): LiveProposalPreviewGateStage {
  if (view === undefined) {
    return stage(
      "api_key_policy_metadata_only",
      "Live Proposal Opt-in Gate",
      "missing",
      "Policy metadata summary is not previewed yet.",
      ["LIVE_PROPOSAL_POLICY_MISSING"]
    );
  }
  if (
    view.status === "blocked" ||
    view.readiness.canReadApiKey ||
    view.readiness.canCallLiveModel ||
    view.readiness.canFetchNetwork
  ) {
    return stage(
      "api_key_policy_metadata_only",
      "Live Proposal Opt-in Gate",
      "blocked",
      "Policy summary is blocked or claims key/model/network access.",
      ["LIVE_PROPOSAL_POLICY_BLOCKED"]
    );
  }
  const status: LiveProposalPreviewGateStageStatus =
    view.status === "disabled" ? "warning" : "satisfied";
  return stage(
    "api_key_policy_metadata_only",
    "Live Proposal Opt-in Gate",
    status,
    `status:${view.status} | source:${view.keySourceType} | mode:${view.optInMode}`,
    view.status === "disabled" ? ["LIVE_PROPOSAL_POLICY_DISABLED"] : []
  );
}

function requestBuilderStage(
  view: LiveProposalRequestBuilderView | undefined
): LiveProposalPreviewGateStage {
  if (view === undefined) {
    return stage(
      "request_builder_summary_only",
      "Live Proposal Request Builder",
      "missing",
      "Request boundary summary is not previewed yet.",
      ["LIVE_PROPOSAL_REQUEST_MISSING"]
    );
  }
  if (
    view.status === "blocked" ||
    !view.summaryOnly ||
    !view.noExecution ||
    !view.toolChoiceOmitted ||
    view.readiness.canReadApiKey ||
    view.readiness.canCallLiveModel ||
    view.readiness.canFetchNetwork
  ) {
    return stage(
      "request_builder_summary_only",
      "Live Proposal Request Builder",
      "blocked",
      "Request summary is blocked or claims key/model/network/tool access.",
      ["LIVE_PROPOSAL_REQUEST_BLOCKED"]
    );
  }
  const status: LiveProposalPreviewGateStageStatus =
    view.status === "request_ready" ? "satisfied" : "warning";
  return stage(
    "request_builder_summary_only",
    "Live Proposal Request Builder",
    status,
    `status:${view.status} | summary:${view.summaryOnly ? "yes" : "no"} | tools:${view.toolChoiceOmitted ? "omitted" : "present"}`,
    status === "warning" ? ["LIVE_PROPOSAL_REQUEST_NOT_READY"] : []
  );
}

function runtimeAdapterStage(
  value: unknown
): LiveProposalPreviewGateStage {
  if (value === undefined) {
    return stage(
      "runtime_adapter_explicit_opt_in_only",
      "Live DeepSeek Proposal Adapter",
      "runtime_only",
      "Runtime helper exists but is not callable from the App Shell.",
      ["LIVE_PROPOSAL_ADAPTER_RUNTIME_ONLY"]
    );
  }
  if (executionClaimFindings(value).length > 0 || rawFieldFindings(value).length > 0) {
    return stage(
      "runtime_adapter_explicit_opt_in_only",
      "Live DeepSeek Proposal Adapter",
      "blocked",
      "Adapter summary contains unsafe raw fields or execution claims.",
      ["LIVE_PROPOSAL_ADAPTER_SUMMARY_BLOCKED"]
    );
  }
  return stage(
    "runtime_adapter_explicit_opt_in_only",
    "Live DeepSeek Proposal Adapter",
    "runtime_only",
    "Adapter summary is runtime-only and still unavailable to App execution.",
    ["LIVE_PROPOSAL_ADAPTER_RUNTIME_ONLY"]
  );
}

function validationIntegrationStage(
  view: LiveProposalValidationIntegrationView | undefined
): LiveProposalPreviewGateStage {
  if (view === undefined) {
    return stage(
      "validation_integration_summary_only",
      "Live Proposal Validation Integration",
      "missing",
      "Validation integration summary is not available yet.",
      ["LIVE_PROPOSAL_VALIDATION_MISSING"]
    );
  }
  if (
    view.status === "blocked" ||
    view.readiness.canApplyPatch ||
    view.readiness.canWriteFilesystem ||
    view.readiness.canWriteEventStore ||
    view.readiness.canExecuteGit ||
    view.readiness.canExecuteShell ||
    view.readiness.appCanExecute
  ) {
    return stage(
      "validation_integration_summary_only",
      "Live Proposal Validation Integration",
      "blocked",
      "Validation integration is blocked or claims execution readiness.",
      ["LIVE_PROPOSAL_VALIDATION_BLOCKED"]
    );
  }
  const status: LiveProposalPreviewGateStageStatus =
    view.status === "integration_ready" ? "satisfied" : "warning";
  return stage(
    "validation_integration_summary_only",
    "Live Proposal Validation Integration",
    status,
    `status:${view.status} | gates:${view.passedGateCount}/${view.gateCount}`,
    status === "warning" ? ["LIVE_PROPOSAL_VALIDATION_NOT_READY"] : []
  );
}

function modelImportStage(
  view: ModelPatchProposalImportView | undefined
): LiveProposalPreviewGateStage {
  if (view === undefined || view.status === "empty") {
    return stage(
      "model_import_preview_only",
      "Model Patch Proposal Import",
      "missing",
      "No imported model proposal is connected to the gate yet.",
      ["MODEL_PROPOSAL_IMPORT_MISSING"]
    );
  }
  if (
    view.status === "blocked" ||
    view.readiness.canApplyPatch ||
    view.readiness.canWriteFilesystem ||
    view.readiness.canWriteEventStore ||
    view.readiness.canExecuteGit ||
    view.readiness.canExecuteShell ||
    view.readiness.appCanExecute
  ) {
    return stage(
      "model_import_preview_only",
      "Model Patch Proposal Import",
      "blocked",
      "Blocked model import cannot enter the live proposal gate.",
      ["MODEL_PROPOSAL_IMPORT_BLOCKED"]
    );
  }
  const status: LiveProposalPreviewGateStageStatus =
    view.status === "warning" ? "warning" : "satisfied";
  return stage(
    "model_import_preview_only",
    "Model Patch Proposal Import",
    status,
    `status:${view.status} | proposal:${view.preview?.proposalId ?? "n/a"}`,
    view.findings.map((finding) => finding.code)
  );
}

function chainIntegrationStage(
  view: ModelProposalChainIntegrationView | undefined
): LiveProposalPreviewGateStage {
  if (view === undefined || view.status === "empty") {
    return stage(
      "chain_integration_preview_only",
      "Model Proposal Chain Integration",
      "missing",
      "No model proposal chain summary is connected to the gate yet.",
      ["MODEL_PROPOSAL_CHAIN_MISSING"]
    );
  }
  if (
    view.status === "blocked" ||
    view.readiness.canExecuteApply ||
    view.readiness.canExecuteRollback ||
    view.readiness.canWriteFilesystem ||
    view.readiness.canWriteEventStore ||
    view.readiness.canApprove ||
    view.readiness.canIssuePermissionLease ||
    view.readiness.canExecuteGit ||
    view.readiness.canExecuteShell ||
    view.readiness.appCanExecute
  ) {
    return stage(
      "chain_integration_preview_only",
      "Model Proposal Chain Integration",
      "blocked",
      "Model proposal chain is blocked or claims execution readiness.",
      ["MODEL_PROPOSAL_CHAIN_BLOCKED"]
    );
  }
  const status: LiveProposalPreviewGateStageStatus =
    view.status === "chain_ready" ? "satisfied" : "warning";
  return stage(
    "chain_integration_preview_only",
    "Model Proposal Chain Integration",
    status,
    `status:${view.status} | stages:${view.completedStageCount}/${view.stageCount}`,
    view.findings.map((finding) => finding.code)
  );
}

function fixedStage(
  kind: LiveProposalPreviewGateStageKind,
  label: string,
  summary: string
): LiveProposalPreviewGateStage {
  return stage(kind, label, "disabled", summary, []);
}

function stage(
  kind: LiveProposalPreviewGateStageKind,
  label: string,
  status: LiveProposalPreviewGateStageStatus,
  summary: string,
  warningCodes: readonly string[]
): LiveProposalPreviewGateStage {
  return {
    stageId: `${kind}-${hashText(`${status}:${summary}`).slice(0, 10)}`,
    kind,
    label,
    status,
    summary: safeErrorMessage(summary).slice(0, 240),
    warningCodes: uniqueStrings(warningCodes.map(safeCode))
  };
}

function requirementFromStage(
  stageItem: LiveProposalPreviewGateStage
): LiveProposalPreviewGateRequirement {
  return {
    requirementId: `${stageItem.kind}-requirement`,
    stageKind: stageItem.kind,
    label: stageItem.label,
    satisfied: ["satisfied", "disabled", "runtime_only"].includes(
      stageItem.status
    ),
    summary: stageItem.summary,
    warningCodes: stageItem.warningCodes
  };
}

function findingsFromStages(
  stages: readonly LiveProposalPreviewGateStage[]
): LiveProposalPreviewGateFinding[] {
  return stages.flatMap((stageItem) => {
    if (stageItem.status === "blocked") {
      return [
        finding(
          `LIVE_PROPOSAL_GATE_${stageItem.kind.toUpperCase()}_BLOCKED`,
          "blocker",
          `${stageItem.label} is blocked.`,
          stageItem.kind
        )
      ];
    }
    if (
      stageItem.status === "missing" ||
      stageItem.status === "warning" ||
      stageItem.status === "runtime_only"
    ) {
      return [
        finding(
          `LIVE_PROPOSAL_GATE_${stageItem.kind.toUpperCase()}_${stageItem.status.toUpperCase()}`,
          "warning",
          `${stageItem.label} is ${stageItem.status}.`,
          stageItem.kind
        )
      ];
    }
    return [];
  });
}

function inputFindingsFrom(
  input: LiveProposalPreviewGateInput
): LiveProposalPreviewGateFinding[] {
  return uniqueFindings([
    ...rawFieldFindings(input),
    ...unsafeStringFindings(input),
    ...executionClaimFindings(input)
  ]);
}

function rawFieldFindings(value: unknown): LiveProposalPreviewGateFinding[] {
  const findings: LiveProposalPreviewGateFinding[] = [];
  walk(value, (key) => {
    if (key !== undefined && forbiddenFieldNames.has(key.toLowerCase())) {
      findings.push(
        finding(
          "LIVE_PROPOSAL_GATE_FORBIDDEN_RAW_FIELD",
          "blocker",
          "Raw, secret-like, command, tool, or execution fields are not allowed in the App live proposal preview gate."
        )
      );
    }
  });
  return uniqueFindings(findings);
}

function unsafeStringFindings(value: unknown): LiveProposalPreviewGateFinding[] {
  const findings: LiveProposalPreviewGateFinding[] = [];
  walk(value, (_key, nested) => {
    if (typeof nested !== "string") {
      return;
    }
    for (const { code, pattern } of unsafeStringPatterns) {
      if (pattern.test(nested)) {
        findings.push(
          finding(
            `LIVE_PROPOSAL_GATE_${code}`,
            "blocker",
            "Unsafe string marker detected in App live proposal preview gate input."
          )
        );
      }
    }
  });
  return uniqueFindings(findings);
}

function executionClaimFindings(
  value: unknown
): LiveProposalPreviewGateFinding[] {
  const findings: LiveProposalPreviewGateFinding[] = [];
  walk(value, (key, nested) => {
    if (
      key !== undefined &&
      executionFlagNames.has(key.toLowerCase()) &&
      nested === true
    ) {
      findings.push(
        finding(
          "LIVE_PROPOSAL_GATE_EXECUTION_FLAG_TRUE",
          "blocker",
          "Execution, network, API key, or App live-call readiness flags must remain false."
        )
      );
    }
  });
  return uniqueFindings(findings);
}

function hasAnySummary(input: LiveProposalPreviewGateInput): boolean {
  return (
    input.liveProposalApiKeyPolicyView !== undefined ||
    input.liveProposalRequestBuilderView !== undefined ||
    input.liveDeepSeekProposalAdapterSummary !== undefined ||
    input.liveProposalValidationIntegrationView !== undefined ||
    input.modelPatchProposalImportView !== undefined ||
    input.modelProposalChainIntegrationView !== undefined
  );
}

function statusFrom(args: {
  hasSummary: boolean;
  blockerCount: number;
  warningCount: number;
}): LiveProposalPreviewGateStatus {
  if (args.blockerCount > 0) {
    return "blocked";
  }
  if (!args.hasSummary) {
    return "empty";
  }
  if (args.warningCount > 0) {
    return "warning";
  }
  return "gate_ready";
}

function nextActionFor(status: LiveProposalPreviewGateStatus): string {
  if (status === "empty") {
    return "Preview the live proposal policy or request summaries before reviewing the App gate.";
  }
  if (status === "blocked") {
    return "Resolve blocker finding codes. The App Shell must not call DeepSeek, read keys, fetch network, execute, or write events.";
  }
  if (status === "warning") {
    return "Review warning stage summaries. A ready gate is still preview-only and cannot send a live request from the App.";
  }
  return "Review the gate summary. Future live proposal work remains runtime-only and App execution stays disabled.";
}

function finding(
  code: string,
  severity: "blocker" | "warning",
  safeMessage: string,
  stageKind?: LiveProposalPreviewGateStageKind
): LiveProposalPreviewGateFinding {
  const base = {
    code: safeCode(code),
    severity,
    safeMessage: safeErrorMessage(safeMessage)
  };
  return stageKind === undefined ? base : { ...base, stageKind };
}

function walk(
  value: unknown,
  visitor: (key: string | undefined, value: unknown) => void,
  key?: string
): void {
  visitor(key, value);
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visitor);
    }
    return;
  }
  if (isRecord(value)) {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      walk(nestedValue, visitor, nestedKey);
    }
  }
}

function safeCode(value: string): string {
  const code = safeText(value, "LIVE_PROPOSAL_GATE_WARNING")
    .trim()
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .toUpperCase();
  return /^[A-Z0-9_.-]{1,140}$/.test(code)
    ? code
    : "LIVE_PROPOSAL_GATE_WARNING";
}

function uniqueFindings(
  findings: readonly LiveProposalPreviewGateFinding[]
): LiveProposalPreviewGateFinding[] {
  const byKey = new Map<string, LiveProposalPreviewGateFinding>();
  for (const item of findings) {
    byKey.set(`${item.severity}:${item.code}:${item.stageKind ?? ""}`, item);
  }
  return [...byKey.values()];
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0)
    .toString(16)
    .padStart(12, "0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
