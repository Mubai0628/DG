import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import type {
  LiveDeepSeekPatchProposalCommandResult
} from "./desktop-flow.js";
import type { AppLiveProposalSessionReceiptView } from "./app-live-proposal-session-receipt-view.js";
import type { LiveProposalRequestBuilderView } from "./live-proposal-request-builder-view.js";
import type { LiveProposalOptInGateView } from "./live-proposal-opt-in-gate-view.js";
import type { ModelPatchProposalImportView } from "./model-patch-proposal-import-view.js";
import type { ModelProposalChainIntegrationView } from "./model-proposal-chain-integration-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type LiveDeepSeekProposalGenerationStatus =
  | "empty"
  | "ready"
  | "generating"
  | "generated"
  | "warning"
  | "blocked";

export type LiveDeepSeekProposalGenerationFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type LiveDeepSeekProposalGenerationReadiness = {
  canGenerateLiveProposal: boolean;
  canEnterModelImport: boolean;
  canEnterProposalChain: boolean;
  canApplyPatch: false;
  canRollback: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canApprove: false;
  canReject: false;
  canIssuePermissionLease: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type LiveDeepSeekProposalGenerationView = {
  status: LiveDeepSeekProposalGenerationStatus;
  flowId: string;
  requestId: string;
  responseId: string;
  proposalId: string;
  repairStatus: string;
  schemaValidationStatus: string;
  importStatus: ModelPatchProposalImportView["status"] | "empty";
  chainStatus: ModelProposalChainIntegrationView["status"] | "empty";
  usageSummary: {
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
  } | undefined;
  droppedReasoningContent: boolean;
  reasoningContentCharCount: number;
  warningCodes: string[];
  findings: LiveDeepSeekProposalGenerationFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  generationHash: string;
  readiness: LiveDeepSeekProposalGenerationReadiness;
  nextAction: string;
  source: "app_live_deepseek_proposal_generation_flow";
};

export type LiveDeepSeekProposalGenerationInput = {
  liveProposalOptInGateView?: LiveProposalOptInGateView | undefined;
  sessionReceiptView?: AppLiveProposalSessionReceiptView | undefined;
  requestBuilderView?: LiveProposalRequestBuilderView | undefined;
  keySourceRef?: string | undefined;
  expectedKeySourceRef?: string | undefined;
  commandResult?: LiveDeepSeekPatchProposalCommandResult | undefined;
  modelImportView?: ModelPatchProposalImportView | undefined;
  modelProposalChainIntegrationView?:
    | ModelProposalChainIntegrationView
    | undefined;
  isGenerating?: boolean | undefined;
  errorMessage?: string | undefined;
};

export function buildLiveDeepSeekProposalGenerationView(
  input: LiveDeepSeekProposalGenerationInput = {}
): LiveDeepSeekProposalGenerationView {
  const findings = buildFindings(input);
  const commandResult = input.commandResult;
  const modelImport = input.modelImportView;
  const chain = input.modelProposalChainIntegrationView;
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount =
    findings.filter((finding) => finding.severity === "warning").length +
    (commandResult?.warningCodes.length ?? 0) +
    (modelImport?.warningCount ?? 0) +
    (chain?.warningCount ?? 0);
  const canGenerateLiveProposal =
    blockerCount === 0 &&
    commandResult === undefined &&
    input.isGenerating !== true &&
    input.liveProposalOptInGateView?.readiness
      .canProceedToLiveRequestBuilder === true &&
    input.sessionReceiptView?.readiness.canProceedToLiveProposalCommand ===
      true &&
    input.requestBuilderView?.readiness.canProceedToLiveAdapter === true;
  const canEnterModelImport =
    commandResult !== undefined &&
    modelImport !== undefined &&
    modelImport.readiness.canImportToPatchPreview;
  const canEnterProposalChain =
    canEnterModelImport &&
    chain !== undefined &&
    chain.readiness.canEnterExistingPreviewChain;
  const status = statusFor({
    input,
    blockerCount,
    warningCount,
    canGenerateLiveProposal,
    canEnterProposalChain
  });
  const requestId =
    commandResult?.requestId ?? input.requestBuilderView?.requestId ?? "n/a";
  const proposalId =
    modelImport?.preview?.proposalId ?? chain?.proposalId ?? "n/a";
  const generationHash = stablePreviewHash(
    JSON.stringify({
      source: "app_live_deepseek_proposal_generation_flow",
      status,
      requestId,
      responseId: commandResult?.responseId,
      proposalCandidateHash: commandResult?.proposalCandidateHash,
      importId: modelImport?.importId,
      chainId: chain?.chainId
    })
  );

  return {
    status,
    flowId: `app-live-deepseek-proposal-generation-${generationHash.slice(0, 12)}`,
    requestId,
    responseId: commandResult?.responseId ?? "n/a",
    proposalId,
    repairStatus: modelImport?.repairStatus ?? "empty",
    schemaValidationStatus: schemaValidationStatusFor(modelImport),
    importStatus: modelImport?.status ?? "empty",
    chainStatus: chain?.status ?? "empty",
    usageSummary: numericUsageSummary(commandResult),
    droppedReasoningContent: commandResult?.droppedReasoningContent ?? false,
    reasoningContentCharCount: commandResult?.reasoningContentCharCount ?? 0,
    warningCodes: Array.from(
      new Set([
        ...(commandResult?.warningCodes ?? []),
        ...(modelImport?.findings
          .filter((finding) => finding.severity === "warning")
          .map((finding) => finding.code) ?? []),
        ...(chain?.findings
          .filter((finding) => finding.severity === "warning")
          .map((finding) => finding.code) ?? [])
      ])
    ),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    generationHash,
    readiness: {
      canGenerateLiveProposal,
      canEnterModelImport,
      canEnterProposalChain,
      canApplyPatch: false,
      canRollback: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      canApprove: false,
      canReject: false,
      canIssuePermissionLease: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status),
    source: "app_live_deepseek_proposal_generation_flow"
  };
}

function buildFindings(
  input: LiveDeepSeekProposalGenerationInput
): LiveDeepSeekProposalGenerationFinding[] {
  const findings: LiveDeepSeekProposalGenerationFinding[] = [];
  const hasAnyGateInput =
    input.liveProposalOptInGateView !== undefined ||
    input.sessionReceiptView !== undefined ||
    input.requestBuilderView !== undefined ||
    input.commandResult !== undefined ||
    input.modelImportView !== undefined ||
    input.modelProposalChainIntegrationView !== undefined ||
    input.errorMessage !== undefined;
  if (!hasAnyGateInput) {
    return findings;
  }
  const add = (
    code: string,
    severity: "blocker" | "warning",
    message: string
  ) => {
    findings.push({
      code,
      severity,
      safeMessage: safeErrorMessage(message)
    });
  };

  const keySourceRef = safeText(input.keySourceRef, "").trim();
  const expectedKeySourceRef = safeText(input.expectedKeySourceRef, "").trim();
  if (input.sessionReceiptView === undefined) {
    add("LIVE_PROPOSAL_SESSION_RECEIPT_MISSING", "blocker", "Preview a live proposal session receipt before generation.");
  } else {
    if (input.sessionReceiptView.status === "empty") {
      add("LIVE_PROPOSAL_SESSION_RECEIPT_EMPTY", "blocker", "Live proposal session receipt is empty.");
    }
    if (!input.sessionReceiptView.typedConfirmationAccepted) {
      add("LIVE_PROPOSAL_CONFIRMATION_MISSING", "blocker", "Typed confirmation must match the live proposal phrase.");
    }
    if (
      !input.sessionReceiptView.readiness.canProceedToLiveProposalCommand ||
      input.sessionReceiptView.readiness.canReadApiKey ||
      input.sessionReceiptView.readiness.canCallLiveModel ||
      input.sessionReceiptView.readiness.canFetchNetwork ||
      input.sessionReceiptView.readiness.canApplyPatch ||
      input.sessionReceiptView.readiness.canRollback ||
      input.sessionReceiptView.readiness.canWriteEventStore ||
      input.sessionReceiptView.readiness.canExecuteGit ||
      input.sessionReceiptView.readiness.canExecuteShell ||
      input.sessionReceiptView.readiness.appCanExecute
    ) {
      add("LIVE_PROPOSAL_SESSION_RECEIPT_NOT_READY", "blocker", "Live proposal session receipt is not ready for the fixed command.");
    }
    if (input.sessionReceiptView.allowedPathCount <= 0) {
      add("LIVE_PROPOSAL_ALLOWED_PATHS_MISSING", "blocker", "Allowed path refs are required.");
    }
  }

  if (input.liveProposalOptInGateView === undefined) {
    add("LIVE_PROPOSAL_POLICY_MISSING", "blocker", "Preview the live proposal opt-in policy before generation.");
  } else if (
    !input.liveProposalOptInGateView.readiness
      .canProceedToLiveRequestBuilder ||
    input.liveProposalOptInGateView.readiness.canReadApiKey ||
    input.liveProposalOptInGateView.readiness.canCallLiveModel ||
    input.liveProposalOptInGateView.readiness.canFetchNetwork ||
    input.liveProposalOptInGateView.readiness.canApplyPatch ||
    input.liveProposalOptInGateView.readiness.canRollback ||
    input.liveProposalOptInGateView.readiness.canWriteEventStore ||
    input.liveProposalOptInGateView.readiness.canExecuteGit ||
    input.liveProposalOptInGateView.readiness.canExecuteShell ||
    input.liveProposalOptInGateView.readiness.appCanExecute
  ) {
    add("LIVE_PROPOSAL_POLICY_NOT_READY", "blocker", "Live proposal opt-in policy is not ready.");
  }

  if (input.requestBuilderView === undefined) {
    add("LIVE_PROPOSAL_REQUEST_MISSING", "blocker", "Preview a summary-only live proposal request before generation.");
  } else {
    if (input.requestBuilderView.status === "empty") {
      add("LIVE_PROPOSAL_REQUEST_EMPTY", "blocker", "Live proposal request preview is empty.");
    }
    if (
      !input.requestBuilderView.readiness.canProceedToLiveAdapter ||
      input.requestBuilderView.readiness.canReadApiKey ||
      input.requestBuilderView.readiness.canCallLiveModel ||
      input.requestBuilderView.readiness.canFetchNetwork ||
      input.requestBuilderView.readiness.canApplyPatch ||
      input.requestBuilderView.readiness.canRollback ||
      input.requestBuilderView.readiness.canWriteEventStore ||
      input.requestBuilderView.readiness.canExecuteGit ||
      input.requestBuilderView.readiness.canExecuteShell ||
      input.requestBuilderView.readiness.appCanExecute
    ) {
      add("LIVE_PROPOSAL_REQUEST_NOT_READY", "blocker", "Live proposal request preview is not ready.");
    }
    if (input.requestBuilderView.requestEnvelope === undefined) {
      add("LIVE_PROPOSAL_REQUEST_ENVELOPE_MISSING", "blocker", "Live proposal request envelope is missing.");
    }
  }

  if (expectedKeySourceRef.length > 0 && keySourceRef !== expectedKeySourceRef) {
    add("LIVE_PROPOSAL_KEY_SOURCE_REF_BLOCKED", "blocker", "Live proposal key source must be the allowlisted reference name.");
  }

  if (input.errorMessage !== undefined && input.errorMessage.length > 0) {
    add("LIVE_PROPOSAL_COMMAND_ERROR", "blocker", input.errorMessage);
  }

  if (input.commandResult !== undefined) {
    const result = input.commandResult;
    if (
      result.summaryOnly !== true ||
      result.rawPromptIncluded !== false ||
      result.rawResponseIncluded !== false ||
      result.rawReasoningContentIncluded !== false ||
      result.canApplyPatch !== false ||
      result.canRollback !== false ||
      result.canWriteEventStore !== false ||
      result.canExecuteGit !== false ||
      result.canExecuteShell !== false
    ) {
      add("LIVE_PROPOSAL_COMMAND_RESULT_UNSAFE", "blocker", "Live proposal command result was not summary-only and execution-disabled.");
    }
    if (result.droppedReasoningContent) {
      add("LIVE_PROPOSAL_REASONING_DROPPED", "warning", "Reasoning content was dropped and only a length summary is retained.");
    }
    if (input.modelImportView === undefined) {
      add("LIVE_PROPOSAL_IMPORT_MISSING", "blocker", "Generated proposal candidate has not entered model proposal import preview.");
    } else if (
      input.modelImportView.status === "blocked" ||
      !input.modelImportView.readiness.canImportToPatchPreview
    ) {
      add("LIVE_PROPOSAL_IMPORT_BLOCKED", "blocker", "Generated proposal candidate was blocked by repair or schema validation.");
    }
    if (input.modelProposalChainIntegrationView === undefined) {
      add("LIVE_PROPOSAL_CHAIN_PREVIEW_MISSING", "warning", "Generated proposal has not entered chain integration preview yet.");
    } else if (
      input.modelProposalChainIntegrationView.status === "blocked" ||
      !input.modelProposalChainIntegrationView.readiness
        .canEnterExistingPreviewChain
    ) {
      add("LIVE_PROPOSAL_CHAIN_PREVIEW_BLOCKED", "blocker", "Generated proposal could not enter the existing preview chain.");
    }
  }

  return findings;
}

function statusFor(input: {
  input: LiveDeepSeekProposalGenerationInput;
  blockerCount: number;
  warningCount: number;
  canGenerateLiveProposal: boolean;
  canEnterProposalChain: boolean;
}): LiveDeepSeekProposalGenerationStatus {
  if (input.input.isGenerating === true) {
    return "generating";
  }
  if (input.blockerCount > 0) {
    return "blocked";
  }
  if (input.input.commandResult !== undefined) {
    return input.warningCount > 0 || !input.canEnterProposalChain
      ? "warning"
      : "generated";
  }
  if (input.canGenerateLiveProposal) {
    return input.warningCount > 0 ? "warning" : "ready";
  }
  return "empty";
}

function schemaValidationStatusFor(
  view: ModelPatchProposalImportView | undefined
): string {
  if (view === undefined || view.status === "empty") {
    return "empty";
  }
  if (view.status === "blocked") {
    return "blocked";
  }
  return view.warningCount > 0 ? "warning" : "passed";
}

function numericUsageSummary(
  result: LiveDeepSeekPatchProposalCommandResult | undefined
): LiveDeepSeekProposalGenerationView["usageSummary"] {
  if (result?.usageSummary === undefined) {
    return undefined;
  }
  return {
    ...(typeof result.usageSummary.promptTokens === "number"
      ? { promptTokens: result.usageSummary.promptTokens }
      : {}),
    ...(typeof result.usageSummary.completionTokens === "number"
      ? { completionTokens: result.usageSummary.completionTokens }
      : {}),
    ...(typeof result.usageSummary.totalTokens === "number"
      ? { totalTokens: result.usageSummary.totalTokens }
      : {})
  };
}

function nextActionFor(status: LiveDeepSeekProposalGenerationStatus): string {
  switch (status) {
    case "empty":
      return "Preview policy, request, and session receipt before live proposal generation.";
    case "ready":
      return "Generate a live proposal only if the user wants the explicit opt-in runtime call.";
    case "generating":
      return "Waiting for the fixed Tauri command. No App apply or event write is performed.";
    case "generated":
      return "Review the generated proposal through import and chain previews. Apply remains disabled.";
    case "warning":
      return "Review warnings before continuing through the preview chain. Apply remains disabled.";
    case "blocked":
      return "Fix blocker findings before live proposal generation can continue.";
  }
}
