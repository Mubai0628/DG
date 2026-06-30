import {
  buildLiveProposalApiKeyPolicy,
  buildLiveProposalRequest,
  summarizeLiveProposalRequestBuild,
  type LiveProposalApiKeySource,
  type LiveProposalRequestBuildResult,
  type LiveProposalRequestBuildStatus,
  type LiveProposalThinkingMode
} from "../../runtime/src/models/index.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type LiveProposalRequestBuilderView = {
  status: LiveProposalRequestBuildStatus | "empty";
  source: "runtime_live_proposal_request_builder";
  requestId: string;
  modelProfileId: string;
  summaryOnly: boolean;
  noExecution: boolean;
  toolChoiceOmitted: boolean;
  keySourceRefHash: string;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: Array<{
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }>;
  requestHash?: string | undefined;
  requestHashPrefix?: string | undefined;
  requestEnvelope: LiveProposalRequestBuildResult["request"] | undefined;
  readiness: LiveProposalRequestBuildResult["readiness"];
  summary: ReturnType<typeof summarizeLiveProposalRequestBuild>;
  nextAction: string;
};

export type LiveProposalRequestBuilderInput = {
  objectiveSummary?: string | undefined;
  intent?: string | undefined;
  modelProfileId?: string | undefined;
  keySourceRef?: string | undefined;
  optInMode?: "disabled" | "dry_config_check" | "explicit_live_proposal_opt_in";
  allowedPathRefsText?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const allowedEnvVarNames = ["DEEPSEEK_API_KEY"];
const allowedVaultRefPrefixes = ["vault://deepseek/", "vault:deepseek:"];
const allowedTestFixtureRefs = ["test-fixture:deepseek-api-key-ref"];

const defaultForbiddenPathPolicy = [
  "no absolute paths",
  "no traversal",
  "no secret files",
  "no generated artifacts"
];

export function buildLiveProposalRequestBuilderView(
  input: LiveProposalRequestBuilderInput = {}
): LiveProposalRequestBuilderView {
  const objectiveSummary = safeText(input.objectiveSummary, "").trim();
  const modelProfileId = safeText(input.modelProfileId, "deepseek-chat");
  const keySourceRef = safeText(input.keySourceRef, "").trim();
  const optInMode = input.optInMode ?? "disabled";
  const policy = buildLiveProposalApiKeyPolicy({
    providerId: "deepseek",
    modelProfileId,
    keySource: keySourceFromRef(keySourceRef),
    optInGate: {
      mode: optInMode,
      scope: "proposal_generation_only",
      allowApply: false,
      allowRollback: false,
      allowEventStoreWrite: false,
      allowGit: false,
      allowShell: false,
      allowAppExecution: false,
      requestedBy:
        optInMode === "explicit_live_proposal_opt_in"
          ? "manual_user_preview"
          : undefined,
      reasonSummary:
        optInMode === "explicit_live_proposal_opt_in"
          ? "Preview future live request metadata only."
          : undefined
    },
    allowedEnvVarNames,
    allowedVaultRefPrefixes,
    allowedTestFixtureRefs,
    createdAt: input.createdAt
  });
  const result = buildLiveProposalRequest({
    apiKeyPolicy: policy,
    objectiveSummary,
    intent: safeText(
      input.intent,
      "Generate a structured model_patch_proposal draft."
    ),
    modelProfileId,
    workspaceIndexRefs:
      objectiveSummary.length === 0 ? [] : ["workspace-index:app-summary-ref"],
    contextAssemblyRefs:
      objectiveSummary.length === 0 ? [] : ["context-assembly:app-summary-ref"],
    userWorkspaceReadinessRefs:
      objectiveSummary.length === 0
        ? []
        : ["user-workspace-readiness:app-summary-ref"],
    allowedPathRefs: parseAllowedPathRefs(input.allowedPathRefsText),
    forbiddenPathPolicy: defaultForbiddenPathPolicy,
    evidenceRefs:
      objectiveSummary.length === 0 ? [] : ["manual-preview:app-user-input"],
    taskContractHash: "app-live-proposal-request-builder-preview",
    noCompressRefs:
      objectiveSummary.length === 0
        ? []
        : ["live-proposal-request:no-compress-summary-ref"],
    promptMode: "summary_only",
    thinkingMode: "off" satisfies LiveProposalThinkingMode,
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  const request = result.request;
  const summary = summarizeLiveProposalRequestBuild(result);
  const isEmpty = objectiveSummary.length === 0;

  return {
    status: isEmpty ? "empty" : result.status,
    source: result.source,
    requestId: result.requestId,
    modelProfileId,
    summaryOnly: request?.summaryOnly ?? true,
    noExecution: request?.noExecution ?? true,
    toolChoiceOmitted: request?.toolChoiceOmitted ?? true,
    keySourceRefHash:
      request?.apiKeyPolicyRef.refNameHash ??
      policy.keySourceSummary.refNameHash,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    findingCount: result.findingCount,
    findings: result.findings.map((finding) => ({
      code: safeText(finding.code, "UNKNOWN_REQUEST_FINDING"),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    requestHash: result.requestHash,
    requestHashPrefix: result.requestHash?.slice(0, 12),
    requestEnvelope: request,
    readiness: result.readiness,
    summary,
    nextAction: isEmpty
      ? "Enter an objective summary to preview a request envelope. No network call is made."
      : result.nextAction
  };
}

export function summarizeLiveProposalRequestBuilderView(
  view: LiveProposalRequestBuilderView
): Omit<LiveProposalRequestBuilderView["summary"], "status"> & {
  status: LiveProposalRequestBuilderView["status"];
  requestHashPrefix?: string | undefined;
} {
  return {
    ...view.summary,
    status: view.status,
    requestHashPrefix: view.requestHashPrefix
  };
}

function keySourceFromRef(ref: string): LiveProposalApiKeySource {
  if (ref.length === 0) {
    return {
      type: "disabled",
      keyPresenceProof: "not_checked",
      displayName: "disabled"
    };
  }
  if (
    ref.startsWith("vault://deepseek/") ||
    ref.startsWith("vault:deepseek:")
  ) {
    return {
      type: "vault_ref",
      refName: ref,
      displayName: "DeepSeek vault ref",
      keyPresenceProof: "not_checked"
    };
  }
  if (ref.startsWith("test-fixture:")) {
    return {
      type: "test_fixture_ref",
      refName: ref,
      displayName: "DeepSeek test fixture ref",
      keyPresenceProof: "declared_by_test_fixture"
    };
  }
  return {
    type: "env_var_ref",
    refName: ref,
    displayName: "DeepSeek environment variable ref",
    keyPresenceProof: "not_checked"
  };
}

function parseAllowedPathRefs(value: string | undefined): string[] {
  return safeText(value, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 20);
}
