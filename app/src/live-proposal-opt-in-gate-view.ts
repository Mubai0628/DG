import {
  buildLiveProposalApiKeyPolicy,
  summarizeLiveProposalApiKeyPolicy,
  type LiveProposalApiKeyPolicy,
  type LiveProposalApiKeySource,
  type LiveProposalApiKeyPolicyStatus,
  type LiveProposalApiKeySourceType,
  type LiveProposalOptInGate
} from "../../runtime/src/models/live-proposal-api-key-policy.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type LiveProposalOptInGateView = {
  status: LiveProposalApiKeyPolicyStatus;
  source: "runtime_live_proposal_api_key_policy";
  policyId: string;
  providerId: "deepseek";
  modelProfileId: string;
  keySourceType: LiveProposalApiKeySourceType;
  keySourceRefHash: string;
  keySourceDisplayName?: string | undefined;
  optInMode: LiveProposalOptInGate["mode"];
  optInScope: "proposal_generation_only";
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: Array<{
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }>;
  policyHash: string;
  readiness: LiveProposalApiKeyPolicy["readiness"];
  summary: string;
  nextAction: string;
};

export type LiveProposalOptInGateInput = {
  providerId?: "deepseek" | undefined;
  modelProfileId?: string | undefined;
  keySourceRef?: string | undefined;
  optInMode?: LiveProposalOptInGate["mode"] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const allowedEnvVarNames = ["DEEPSEEK_API_KEY"];
const allowedVaultRefPrefixes = ["vault://deepseek/", "vault:deepseek:"];
const allowedTestFixtureRefs = ["test-fixture:deepseek-api-key-ref"];

export function buildLiveProposalOptInGateView(
  input: LiveProposalOptInGateInput = {}
): LiveProposalOptInGateView {
  const keySourceRef = safeText(input.keySourceRef, "").trim();
  const optInMode = input.optInMode ?? "disabled";
  const policy = buildLiveProposalApiKeyPolicy({
    providerId: input.providerId ?? "deepseek",
    modelProfileId: safeText(input.modelProfileId, "deepseek-chat"),
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
          ? "Preview future live proposal policy metadata only."
          : undefined
    },
    allowedEnvVarNames,
    allowedVaultRefPrefixes,
    allowedTestFixtureRefs,
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });

  return {
    status: policy.status,
    source: policy.source,
    policyId: policy.policyId,
    providerId: policy.providerId,
    modelProfileId: policy.modelProfileId,
    keySourceType: policy.keySourceSummary.type,
    keySourceRefHash: policy.keySourceSummary.refNameHash,
    keySourceDisplayName: policy.keySourceSummary.displayName,
    optInMode: policy.optInSummary.mode,
    optInScope: policy.optInSummary.scope,
    blockerCount: policy.blockerCount,
    warningCount: policy.warningCount,
    findingCount: policy.findingCount,
    findings: policy.findings.map((finding) => ({
      code: safeText(finding.code, "UNKNOWN_POLICY_FINDING"),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    policyHash: policy.policyHash,
    readiness: policy.readiness,
    summary: summarizeLiveProposalApiKeyPolicy(policy),
    nextAction: policy.nextAction
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
