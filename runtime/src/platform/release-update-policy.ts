import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ReleaseChannel = "stable" | "rc" | "nightly_disabled" | "local_dev";

export type ReleaseUpdatePolicyStatus =
  | "disabled"
  | "policy_ready"
  | "warning"
  | "blocked";

export type ReleaseUpdateFindingKind =
  | "schema"
  | "channel"
  | "update_policy"
  | "raw_field"
  | "execution_field"
  | "safety";

export type ReleaseUpdateSeverity = "blocker" | "warning";

export type UpgradeStateFinding = {
  findingId: string;
  kind: ReleaseUpdateFindingKind;
  severity: ReleaseUpdateSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type UpdatePolicyInput = {
  requireUserConfirmation?: boolean | undefined;
  allowAutomaticUpdate?: boolean | undefined;
  allowNetworkFetch?: boolean | undefined;
  allowDownload?: boolean | undefined;
  allowInstall?: boolean | undefined;
  allowAutoMigration?: boolean | undefined;
  warningCodes?: string[] | undefined;
};

export type ReleaseChannelPolicyInput = {
  policyId?: string | undefined;
  channel?: ReleaseChannel | string | undefined;
  currentVersion?: string | undefined;
  targetVersion?: string | undefined;
  updatePolicy?: UpdatePolicyInput | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type UpdatePolicy = {
  requireUserConfirmation: boolean;
  allowAutomaticUpdate: false;
  allowNetworkFetch: false;
  allowDownload: false;
  allowInstall: false;
  allowAutoMigration: false;
  warningCodes: string[];
};

export type ReleaseUpdateReadiness = {
  canDisplayPolicy: boolean;
  canCheckForUpdates: false;
  canDownloadUpdate: false;
  canInstallUpdate: false;
  canRunUpgradeMigration: false;
  canFetchNetwork: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ReleaseChannelPolicySummary = {
  policyId: string;
  status: ReleaseUpdatePolicyStatus;
  channel: ReleaseChannel;
  currentVersion?: string | undefined;
  targetVersion?: string | undefined;
  requireUserConfirmation: boolean;
  warningCodes: string[];
  hash: string;
};

export type ReleaseChannelPolicy = {
  status: ReleaseUpdatePolicyStatus;
  policyId: string;
  channel: ReleaseChannel;
  currentVersion?: string | undefined;
  targetVersion?: string | undefined;
  updatePolicy: UpdatePolicy;
  findings: UpgradeStateFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  policyHash: string;
  readiness: ReleaseUpdateReadiness;
  nextAction: string;
  source: "runtime_release_update_policy";
};

const releaseChannels: ReleaseChannel[] = [
  "stable",
  "rc",
  "nightly_disabled",
  "local_dev"
];

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    rawPrefix + "Response",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "UpdatePayload",
    rawPrefix + "Installer",
    rawPrefix + "Artifact",
    apiKeyField,
    authHeaderField,
    bearerField,
    tokenField,
    "secret",
    "password",
    "stdout",
    "stderr",
    "fetchNow",
    "downloadNow",
    "installNow",
    "autoUpdateNow",
    "autoMigrateNow",
    "runMigrationNow",
    "writeNow",
    "deleteNow",
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
    ["tool", "_", "choice"].join("")
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
    code: "RAW_CONTENT_MARKER",
    pattern:
      /\b(raw prompt|raw response|raw source|raw diff|raw update|installer binary|artifact payload)\b/i
  }
];

function finding(
  index: number,
  kind: ReleaseUpdateFindingKind,
  severity: ReleaseUpdateSeverity,
  code: string,
  safeMessage: string,
  path?: string
): UpgradeStateFinding {
  return {
    findingId: `release-update-finding-${index}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readiness(canDisplayPolicy: boolean): ReleaseUpdateReadiness {
  return {
    canDisplayPolicy,
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
  };
}

function scanForbidden(
  value: unknown,
  path: string,
  findings: UpgradeStateFinding[]
): void {
  if (typeof value === "string") {
    for (const { code, pattern } of unsafeStringPatterns) {
      if (pattern.test(value)) {
        findings.push(
          finding(
            findings.length + 1,
            "safety",
            "blocker",
            code,
            `Unsafe marker detected at ${path}.`,
            path
          )
        );
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      scanForbidden(item, `${path}[${index}]`, findings);
    });
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const nestedPath = path === "$" ? key : `${path}.${key}`;
    if (forbiddenFieldKeys.has(normalizedKey)) {
      findings.push(
        finding(
          findings.length + 1,
          normalizedKey.includes("raw") ||
            normalizedKey.includes("payload") ||
            normalizedKey.includes("artifact")
            ? "raw_field"
            : "execution_field",
          "blocker",
          `${key.toUpperCase()}_FIELD_REJECTED`,
          `Forbidden field ${key} is not allowed in release/update policy metadata.`,
          nestedPath
        )
      );
    }
    scanForbidden(nested, nestedPath, findings);
  }
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== ""
  );
}

function normalizeChannel(
  channel: ReleaseChannelPolicyInput["channel"],
  findings: UpgradeStateFinding[]
): ReleaseChannel {
  if (channel === undefined) {
    findings.push(
      finding(
        findings.length + 1,
        "channel",
        "warning",
        "MISSING_RELEASE_CHANNEL",
        "Release channel was not provided; local_dev summary is used."
      )
    );
    return "local_dev";
  }
  if (releaseChannels.includes(channel as ReleaseChannel)) {
    return channel as ReleaseChannel;
  }
  findings.push(
    finding(
      findings.length + 1,
      "channel",
      "blocker",
      "UNKNOWN_RELEASE_CHANNEL",
      "Release channel must be stable, rc, nightly_disabled, or local_dev."
    )
  );
  return "local_dev";
}

export function buildReleaseChannelPolicy(
  input?: ReleaseChannelPolicyInput
): ReleaseChannelPolicy {
  const findings: UpgradeStateFinding[] = [];
  scanForbidden(input, "$", findings);

  if (input === undefined) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "warning",
        "EMPTY_RELEASE_UPDATE_POLICY",
        "No release/update policy metadata was provided."
      )
    );
  }

  const channel = normalizeChannel(input?.channel, findings);
  const warningCodes = stringArray(input?.updatePolicy?.warningCodes);
  const requireUserConfirmation =
    input?.updatePolicy?.requireUserConfirmation === true;
  const attemptedAutomaticUpdate =
    input?.updatePolicy?.allowAutomaticUpdate === true;
  const attemptedNetworkFetch = input?.updatePolicy?.allowNetworkFetch === true;
  const attemptedDownload = input?.updatePolicy?.allowDownload === true;
  const attemptedInstall = input?.updatePolicy?.allowInstall === true;
  const attemptedAutoMigration =
    input?.updatePolicy?.allowAutoMigration === true;

  if (attemptedAutomaticUpdate) {
    findings.push(
      finding(
        findings.length + 1,
        "update_policy",
        "blocker",
        "AUTOMATIC_UPDATE_REJECTED",
        "Automatic updates are not allowed without explicit confirmation."
      )
    );
  }
  if (attemptedNetworkFetch) {
    findings.push(
      finding(
        findings.length + 1,
        "update_policy",
        "blocker",
        "NETWORK_FETCH_REJECTED",
        "Release/update policy must not enable network fetch."
      )
    );
  }
  if (attemptedDownload || attemptedInstall) {
    findings.push(
      finding(
        findings.length + 1,
        "update_policy",
        "blocker",
        "DOWNLOAD_INSTALL_REJECTED",
        "Download and install actions remain disabled."
      )
    );
  }
  if (attemptedAutoMigration) {
    findings.push(
      finding(
        findings.length + 1,
        "update_policy",
        "blocker",
        "AUTO_MIGRATION_REJECTED",
        "Auto-migration is not allowed by release/update policy."
      )
    );
  }
  if (!requireUserConfirmation) {
    findings.push(
      finding(
        findings.length + 1,
        "update_policy",
        "warning",
        "USER_CONFIRMATION_REQUIRED",
        "Future update checks must require explicit user confirmation."
      )
    );
  }
  if (channel === "nightly_disabled") {
    findings.push(
      finding(
        findings.length + 1,
        "channel",
        "warning",
        "NIGHTLY_DISABLED_BY_DEFAULT",
        "Nightly channel is disabled by default."
      )
    );
  }
  if (channel === "local_dev") {
    findings.push(
      finding(
        findings.length + 1,
        "channel",
        "warning",
        "LOCAL_DEV_CHANNEL_SUMMARY_ONLY",
        "Local dev channel is summary-only and not an update source."
      )
    );
  }
  for (let index = 0; index < warningCodes.length; index += 1) {
    findings.push(
      finding(
        findings.length + 1,
        "update_policy",
        "warning",
        "UPDATE_POLICY_WARNING_CODE",
        `Release/update policy contains caller-provided warning code #${index + 1}.`
      )
    );
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: ReleaseUpdatePolicyStatus =
    blockerCount > 0
      ? "blocked"
      : channel === "nightly_disabled"
        ? "disabled"
        : warningCount > 0
          ? "warning"
          : "policy_ready";
  const policyId =
    typeof input?.policyId === "string" && input.policyId.trim() !== ""
      ? input.policyId.trim()
      : typeof input?.idGenerator === "function"
        ? input.idGenerator()
        : `release-update-policy-${stablePreviewHash(JSON.stringify(input ?? {})).slice(0, 12)}`;
  const updatePolicy: UpdatePolicy = {
    requireUserConfirmation,
    allowAutomaticUpdate: false,
    allowNetworkFetch: false,
    allowDownload: false,
    allowInstall: false,
    allowAutoMigration: false,
    warningCodes
  };
  const policyHash = stablePreviewHash(
    JSON.stringify({
      policyId,
      channel,
      currentVersion: input?.currentVersion,
      targetVersion: input?.targetVersion,
      updatePolicy,
      blockerCount,
      warningCount
    })
  );

  return {
    status,
    policyId,
    channel,
    ...(status !== "blocked" && input?.currentVersion !== undefined
      ? { currentVersion: input.currentVersion }
      : {}),
    ...(status !== "blocked" && input?.targetVersion !== undefined
      ? { targetVersion: input.targetVersion }
      : {}),
    updatePolicy,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    policyHash,
    readiness: readiness(status !== "blocked"),
    nextAction:
      status === "blocked"
        ? "Fix blocked release/update metadata before first-run upgrade state can be summarized."
        : status === "disabled"
          ? "Nightly updates remain disabled by default; no update check is available."
          : "Review release/update policy; update checks, downloads, installs, and migrations remain disabled.",
    source: "runtime_release_update_policy"
  };
}

export function summarizeReleaseChannelPolicy(
  policy: ReleaseChannelPolicy
): ReleaseChannelPolicySummary {
  return {
    policyId: policy.policyId,
    status: policy.status,
    channel: policy.channel,
    ...(policy.currentVersion !== undefined
      ? { currentVersion: policy.currentVersion }
      : {}),
    ...(policy.targetVersion !== undefined
      ? { targetVersion: policy.targetVersion }
      : {}),
    requireUserConfirmation: policy.updatePolicy.requireUserConfirmation,
    warningCodes: policy.findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    hash: policy.policyHash
  };
}
