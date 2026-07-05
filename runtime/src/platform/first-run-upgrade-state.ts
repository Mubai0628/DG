import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type {
  ReleaseChannelPolicy,
  ReleaseUpdateFindingKind,
  ReleaseUpdateSeverity,
  UpgradeStateFinding
} from "./release-update-policy.js";

export type FirstRunUpgradeStateStatus =
  | "empty"
  | "state_ready"
  | "warning"
  | "blocked";

export type FirstRunUpgradeStateInput = {
  stateId?: string | undefined;
  currentVersion?: string | undefined;
  previousVersion?: string | undefined;
  firstRun?: boolean | undefined;
  releaseChannelPolicy?: ReleaseChannelPolicy | undefined;
  migrationPlanStatus?: string | undefined;
  backupPlanStatus?: string | undefined;
  schemaVersions?: string[] | undefined;
  manualReviewRequired?: boolean | undefined;
  autoMigrationRequested?: boolean | undefined;
  networkFetchRequested?: boolean | undefined;
  warningCodes?: string[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type FirstRunUpgradeReadiness = {
  canDisplayState: boolean;
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

export type FirstRunUpgradeStateSummary = {
  stateId: string;
  status: FirstRunUpgradeStateStatus;
  channel?: string | undefined;
  currentVersion?: string | undefined;
  previousVersion?: string | undefined;
  firstRun: boolean;
  upgradeDetected: boolean;
  manualReviewRequired: boolean;
  schemaVersionCount: number;
  warningCodes: string[];
  hash: string;
};

export type FirstRunUpgradeState = {
  status: FirstRunUpgradeStateStatus;
  stateId: string;
  currentVersion?: string | undefined;
  previousVersion?: string | undefined;
  firstRun: boolean;
  upgradeDetected: boolean;
  releaseChannel?: string | undefined;
  migrationPlanStatus?: string | undefined;
  backupPlanStatus?: string | undefined;
  schemaVersions: string[];
  manualReviewRequired: boolean;
  findings: UpgradeStateFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  stateHash: string;
  readiness: FirstRunUpgradeReadiness;
  nextAction: string;
  source: "runtime_first_run_upgrade_state";
};

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
    rawPrefix + "UpgradePayload",
    rawPrefix + "MigrationPayload",
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
      /\b(raw prompt|raw response|raw source|raw diff|raw upgrade|raw migration)\b/i
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
    findingId: `first-run-upgrade-finding-${index}`,
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

function readiness(canDisplayState: boolean): FirstRunUpgradeReadiness {
  return {
    canDisplayState,
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
          `Forbidden field ${key} is not allowed in first-run upgrade state metadata.`,
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

function versionChanged(
  previousVersion: string | undefined,
  currentVersion: string | undefined
): boolean {
  return (
    previousVersion !== undefined &&
    currentVersion !== undefined &&
    previousVersion.trim() !== "" &&
    currentVersion.trim() !== "" &&
    previousVersion !== currentVersion
  );
}

export function buildFirstRunUpgradeState(
  input?: FirstRunUpgradeStateInput
): FirstRunUpgradeState {
  const findings: UpgradeStateFinding[] = [];
  scanForbidden(input, "$", findings);

  if (input === undefined) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "warning",
        "EMPTY_FIRST_RUN_UPGRADE_STATE",
        "No first-run upgrade state metadata was provided."
      )
    );
  }

  const policy = input?.releaseChannelPolicy;
  if (policy === undefined) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "warning",
        "MISSING_RELEASE_POLICY",
        "First-run upgrade state has no release/update policy summary."
      )
    );
  } else if (policy.status === "blocked" || policy.blockerCount > 0) {
    findings.push(
      finding(
        findings.length + 1,
        "update_policy",
        "blocker",
        "RELEASE_POLICY_BLOCKED",
        "First-run upgrade state cannot proceed with a blocked release/update policy."
      )
    );
  }

  if (input?.autoMigrationRequested === true) {
    findings.push(
      finding(
        findings.length + 1,
        "update_policy",
        "blocker",
        "AUTO_MIGRATION_REJECTED",
        "First-run upgrade state must not request auto-migration."
      )
    );
  }
  if (input?.networkFetchRequested === true) {
    findings.push(
      finding(
        findings.length + 1,
        "update_policy",
        "blocker",
        "NETWORK_FETCH_REJECTED",
        "First-run upgrade state must not request network fetch."
      )
    );
  }
  const policyReadiness = policy?.readiness as
    | Record<string, unknown>
    | undefined;
  if (policyReadiness?.canFetchNetwork === true) {
    findings.push(
      finding(
        findings.length + 1,
        "safety",
        "blocker",
        "POLICY_FETCH_READINESS_REJECTED",
        "Release/update policy must not report fetch readiness."
      )
    );
  }
  if (policyReadiness?.canRunUpgradeMigration === true) {
    findings.push(
      finding(
        findings.length + 1,
        "safety",
        "blocker",
        "POLICY_MIGRATION_READINESS_REJECTED",
        "Release/update policy must not report migration execution readiness."
      )
    );
  }

  const schemaVersions = stringArray(input?.schemaVersions).sort();
  const warningCodes = stringArray(input?.warningCodes);
  const upgradeDetected = versionChanged(
    input?.previousVersion,
    input?.currentVersion
  );
  const firstRun = input?.firstRun === true;
  const manualReviewRequired =
    input?.manualReviewRequired === true || upgradeDetected || firstRun;

  if (firstRun) {
    findings.push(
      finding(
        findings.length + 1,
        "safety",
        "warning",
        "FIRST_RUN_SUMMARY_ONLY",
        "First-run upgrade state is summary-only; no migration runs."
      )
    );
  }
  if (
    input?.previousVersion === undefined ||
    input?.currentVersion === undefined
  ) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "warning",
        "MISSING_VERSION_SUMMARY",
        "First-run upgrade state should include previous and current version summaries."
      )
    );
  }
  if (schemaVersions.length === 0) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "warning",
        "MISSING_SCHEMA_VERSION_SUMMARY",
        "First-run upgrade state has no schema version summary."
      )
    );
  }
  if (input?.migrationPlanStatus === undefined) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "warning",
        "MISSING_MIGRATION_DRY_RUN_STATUS",
        "First-run upgrade state has no migration dry-run status summary."
      )
    );
  }
  if (input?.backupPlanStatus === undefined) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "warning",
        "MISSING_BACKUP_PLAN_STATUS",
        "First-run upgrade state has no backup/restore plan status summary."
      )
    );
  }
  for (let index = 0; index < warningCodes.length; index += 1) {
    findings.push(
      finding(
        findings.length + 1,
        "safety",
        "warning",
        "UPGRADE_STATE_WARNING_CODE",
        `First-run upgrade state contains caller-provided warning code #${index + 1}.`
      )
    );
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: FirstRunUpgradeStateStatus =
    blockerCount > 0
      ? "blocked"
      : input === undefined
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "state_ready";
  const stateId =
    typeof input?.stateId === "string" && input.stateId.trim() !== ""
      ? input.stateId.trim()
      : typeof input?.idGenerator === "function"
        ? input.idGenerator()
        : `first-run-upgrade-${stablePreviewHash(JSON.stringify(input ?? {})).slice(0, 12)}`;
  const stateHash = stablePreviewHash(
    JSON.stringify({
      stateId,
      currentVersion: input?.currentVersion,
      previousVersion: input?.previousVersion,
      firstRun,
      releaseChannel: policy?.channel,
      migrationPlanStatus: input?.migrationPlanStatus,
      backupPlanStatus: input?.backupPlanStatus,
      schemaVersions,
      manualReviewRequired,
      blockerCount,
      warningCount
    })
  );

  return {
    status,
    stateId,
    ...(status !== "blocked" && input?.currentVersion !== undefined
      ? { currentVersion: input.currentVersion }
      : {}),
    ...(status !== "blocked" && input?.previousVersion !== undefined
      ? { previousVersion: input.previousVersion }
      : {}),
    firstRun,
    upgradeDetected,
    ...(policy?.channel !== undefined
      ? { releaseChannel: policy.channel }
      : {}),
    ...(input?.migrationPlanStatus !== undefined
      ? { migrationPlanStatus: input.migrationPlanStatus }
      : {}),
    ...(input?.backupPlanStatus !== undefined
      ? { backupPlanStatus: input.backupPlanStatus }
      : {}),
    schemaVersions: status === "blocked" ? [] : schemaVersions,
    manualReviewRequired,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    stateHash,
    readiness: readiness(status !== "blocked"),
    nextAction:
      status === "blocked"
        ? "Fix blocked first-run upgrade state metadata before upgrade readiness can be summarized."
        : status === "empty"
          ? "Provide summary-only first-run upgrade state metadata."
          : "Review first-run upgrade state; update checks, installs, and migrations remain disabled.",
    source: "runtime_first_run_upgrade_state"
  };
}

export function summarizeUpgradeState(
  state: FirstRunUpgradeState
): FirstRunUpgradeStateSummary {
  return {
    stateId: state.stateId,
    status: state.status,
    ...(state.releaseChannel !== undefined
      ? { channel: state.releaseChannel }
      : {}),
    ...(state.currentVersion !== undefined
      ? { currentVersion: state.currentVersion }
      : {}),
    ...(state.previousVersion !== undefined
      ? { previousVersion: state.previousVersion }
      : {}),
    firstRun: state.firstRun,
    upgradeDetected: state.upgradeDetected,
    manualReviewRequired: state.manualReviewRequired,
    schemaVersionCount: state.schemaVersions.length,
    warningCodes: state.findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    hash: state.stateHash
  };
}
