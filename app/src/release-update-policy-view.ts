import {
  buildFirstRunUpgradeState,
  buildReleaseChannelPolicy,
  summarizeReleaseChannelPolicy,
  summarizeUpgradeState,
  type FirstRunUpgradeStateInput,
  type ReleaseChannelPolicyInput,
  type ReleaseUpdatePolicyStatus,
  type ReleaseUpdateReadiness
} from "../../runtime/src/platform/index.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type ReleaseUpdatePolicyView = {
  status: ReleaseUpdatePolicyStatus | "state_ready" | "empty";
  source: "runtime_release_update_policy";
  policyId: string;
  stateId: string;
  channel: string;
  currentVersion?: string | undefined;
  targetVersion?: string | undefined;
  previousVersion?: string | undefined;
  firstRun: boolean;
  upgradeDetected: boolean;
  manualReviewRequired: boolean;
  schemaVersionCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  policyHashPrefix: string;
  stateHashPrefix: string;
  readiness: ReleaseUpdateReadiness;
  policySummary: ReturnType<typeof summarizeReleaseChannelPolicy>;
  upgradeStateSummary: ReturnType<typeof summarizeUpgradeState>;
  findings: Array<{
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }>;
  nextAction: string;
};

export type ReleaseUpdatePolicyViewInput = {
  releaseChannelPolicy?: ReleaseChannelPolicyInput | undefined;
  firstRunUpgradeState?: Omit<
    FirstRunUpgradeStateInput,
    "releaseChannelPolicy"
  >;
};

export function buildReleaseUpdatePolicyView(
  input: ReleaseUpdatePolicyViewInput = {}
): ReleaseUpdatePolicyView {
  const policy = buildReleaseChannelPolicy(input.releaseChannelPolicy);
  const upgradeState = buildFirstRunUpgradeState({
    ...input.firstRunUpgradeState,
    releaseChannelPolicy: policy
  });
  const blockerCount = policy.blockerCount + upgradeState.blockerCount;
  const warningCount = policy.warningCount + upgradeState.warningCount;
  const status =
    blockerCount > 0
      ? "blocked"
      : upgradeState.status === "state_ready" &&
          policy.status === "policy_ready"
        ? "state_ready"
        : policy.status === "disabled" || upgradeState.status === "empty"
          ? policy.status
          : warningCount > 0
            ? "warning"
            : policy.status;

  return {
    status,
    source: "runtime_release_update_policy",
    policyId: safeText(policy.policyId, "release-update-policy"),
    stateId: safeText(upgradeState.stateId, "first-run-upgrade-state"),
    channel: safeText(policy.channel, "local_dev"),
    ...(policy.currentVersion !== undefined
      ? { currentVersion: safeText(policy.currentVersion, "unknown") }
      : {}),
    ...(policy.targetVersion !== undefined
      ? { targetVersion: safeText(policy.targetVersion, "unknown") }
      : {}),
    ...(upgradeState.previousVersion !== undefined
      ? { previousVersion: safeText(upgradeState.previousVersion, "unknown") }
      : {}),
    firstRun: upgradeState.firstRun,
    upgradeDetected: upgradeState.upgradeDetected,
    manualReviewRequired: upgradeState.manualReviewRequired,
    schemaVersionCount: upgradeState.schemaVersions.length,
    blockerCount,
    warningCount,
    findingCount: policy.findingCount + upgradeState.findingCount,
    policyHashPrefix: policy.policyHash.slice(0, 12),
    stateHashPrefix: upgradeState.stateHash.slice(0, 12),
    readiness: {
      canDisplayPolicy: status !== "blocked",
      canCheckForUpdates: false,
      canDownloadUpdate: false,
      canInstallUpdate: false,
      canRunUpgradeMigration: false,
      canFetchNetwork: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    policySummary: summarizeReleaseChannelPolicy(policy),
    upgradeStateSummary: summarizeUpgradeState(upgradeState),
    findings: [...policy.findings, ...upgradeState.findings].map((finding) => ({
      code: safeText(finding.code, "RELEASE_UPDATE_FINDING"),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    nextAction: safeErrorMessage(
      status === "blocked"
        ? "Fix blocked release/update or first-run metadata before readiness can be summarized."
        : "Review release/update and first-run upgrade summaries; update checks, installs, and migrations remain disabled."
    )
  };
}

export function summarizeReleaseUpdatePolicyView(
  view: ReleaseUpdatePolicyView
): Pick<
  ReleaseUpdatePolicyView,
  | "status"
  | "channel"
  | "firstRun"
  | "upgradeDetected"
  | "manualReviewRequired"
  | "schemaVersionCount"
  | "blockerCount"
  | "warningCount"
  | "policyHashPrefix"
  | "stateHashPrefix"
  | "nextAction"
> {
  return {
    status: view.status,
    channel: view.channel,
    firstRun: view.firstRun,
    upgradeDetected: view.upgradeDetected,
    manualReviewRequired: view.manualReviewRequired,
    schemaVersionCount: view.schemaVersionCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    policyHashPrefix: view.policyHashPrefix,
    stateHashPrefix: view.stateHashPrefix,
    nextAction: view.nextAction
  };
}
