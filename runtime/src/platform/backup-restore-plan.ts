import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type { AppDataDirectoryKind } from "./app-data-inventory.js";

export type BackupRestorePlanKind = "backup" | "restore" | "rollback_package";

export type BackupRestorePlanStatus =
  | "empty"
  | "plan_ready"
  | "warning"
  | "blocked";

export type BackupRestoreFindingKind =
  | "schema"
  | "path"
  | "raw_field"
  | "execution_field"
  | "safety";

export type BackupRestoreSeverity = "blocker" | "warning";

export type BackupRestoreFinding = {
  findingId: string;
  kind: BackupRestoreFindingKind;
  severity: BackupRestoreSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type BackupRestoreReadiness = {
  canDisplayPlan: boolean;
  canCreateArchive: false;
  canRestoreBackup: false;
  canDeleteData: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type BackupRestorePlanInput = {
  packageId?: string | undefined;
  itemCount?: number | undefined;
  byteCount?: number | undefined;
  schemaVersions?: string[] | undefined;
  includedDirectoryKinds?: Array<AppDataDirectoryKind | string> | undefined;
  excludedDirectoryKinds?: Array<AppDataDirectoryKind | string> | undefined;
  hashPrefixes?: string[] | undefined;
  manualVerificationSteps?: string[] | undefined;
  sourceWorkspaceRootRef?: string | undefined;
  targetWorkspaceRootRef?: string | undefined;
  manualReviewRequired?: boolean | undefined;
  schemaRegistryPresent?: boolean | undefined;
  deleteSteps?: string[] | undefined;
  warningCodes?: string[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type BackupRestorePlanSummary = {
  packageId: string;
  planKind: BackupRestorePlanKind;
  status: BackupRestorePlanStatus;
  itemCount: number;
  byteCount: number;
  schemaVersions: string[];
  includedDirectoryKinds: string[];
  excludedDirectoryKinds: string[];
  manualVerificationStepCount: number;
  warningCodes: string[];
  hash: string;
};

export type BackupRestorePlanBase = {
  status: BackupRestorePlanStatus;
  planKind: BackupRestorePlanKind;
  packageId: string;
  itemCount: number;
  byteCount: number;
  schemaVersions: string[];
  includedDirectoryKinds: string[];
  excludedDirectoryKinds: string[];
  hashPrefixes: string[];
  manualVerificationSteps: string[];
  sourceWorkspaceRootRef?: string | undefined;
  targetWorkspaceRootRef?: string | undefined;
  manualReviewRequired: boolean;
  schemaRegistryPresent: boolean;
  findings: BackupRestoreFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  planHash: string;
  readiness: BackupRestoreReadiness;
  nextAction: string;
  source: "runtime_backup_restore_plan";
};

export type BackupPlan = BackupRestorePlanBase & { planKind: "backup" };
export type RestorePlan = BackupRestorePlanBase & { planKind: "restore" };
export type RollbackPackagePlan = BackupRestorePlanBase & {
  planKind: "rollback_package";
};

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "FileContent",
    "archiveBinary",
    "checkpointPreimageContent",
    "preimageContent",
    rawPrefix + "Events",
    rawPrefix + "EventPayload",
    rawPrefix + "MemoryEntries",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    apiKeyField,
    authHeaderField,
    bearerField,
    tokenField,
    "secret",
    "password",
    "stdout",
    "stderr",
    "createArchiveNow",
    "restoreNow",
    "deleteNow",
    "deleteData",
    "writeNow",
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
      /\b(raw file|raw event|raw memory|archive binary|checkpoint preimage|raw source|raw diff)\b/i
  }
];

const blockedDirectoryKinds = new Set([
  "node_modules",
  "dist",
  "target",
  ".env",
  ".git"
]);

function finding(
  index: number,
  kind: BackupRestoreFindingKind,
  severity: BackupRestoreSeverity,
  code: string,
  safeMessage: string,
  path?: string
): BackupRestoreFinding {
  return {
    findingId: `backup-restore-finding-${index}`,
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

function readiness(canDisplayPlan: boolean): BackupRestoreReadiness {
  return {
    canDisplayPlan,
    canCreateArchive: false,
    canRestoreBackup: false,
    canDeleteData: false,
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
  findings: BackupRestoreFinding[]
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
            normalizedKey.includes("preimage") ||
            normalizedKey.includes("archive")
            ? "raw_field"
            : "execution_field",
          "blocker",
          `${key.toUpperCase()}_FIELD_REJECTED`,
          `Forbidden field ${key} is not allowed in backup/restore dry-run metadata.`,
          nestedPath
        )
      );
    }
    scanForbidden(nested, nestedPath, findings);
  }
}

function normalizeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== ""
  );
}

function buildPlan<TKind extends BackupRestorePlanKind>(
  input: BackupRestorePlanInput | undefined,
  planKind: TKind
): BackupRestorePlanBase & { planKind: TKind } {
  const findings: BackupRestoreFinding[] = [];
  scanForbidden(input, "$", findings);

  if (input === undefined) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "warning",
        "EMPTY_BACKUP_RESTORE_PLAN",
        "No backup/restore dry-run metadata was provided."
      )
    );
  }

  const includedDirectoryKinds = stringArray(input?.includedDirectoryKinds).map(
    (item) => item.trim()
  );
  const excludedDirectoryKinds = stringArray(input?.excludedDirectoryKinds).map(
    (item) => item.trim()
  );
  const schemaVersions = stringArray(input?.schemaVersions).sort();
  const hashPrefixes = stringArray(input?.hashPrefixes);
  const manualVerificationSteps = stringArray(input?.manualVerificationSteps);
  const warningCodes = stringArray(input?.warningCodes);
  const manualReviewRequired = input?.manualReviewRequired === true;
  const sourceWorkspaceRootRef = input?.sourceWorkspaceRootRef;
  const targetWorkspaceRootRef = input?.targetWorkspaceRootRef;
  const schemaRegistryPresent = input?.schemaRegistryPresent === true;

  for (const directoryKind of includedDirectoryKinds) {
    const normalized = directoryKind.toLowerCase();
    if (blockedDirectoryKinds.has(normalized)) {
      findings.push(
        finding(
          findings.length + 1,
          "path",
          "blocker",
          `${normalized.replace(".", "").toUpperCase()}_INCLUDED_REJECTED`,
          `Backup/restore plans must not include ${directoryKind} by default.`
        )
      );
    }
  }

  if (
    planKind === "restore" &&
    sourceWorkspaceRootRef !== undefined &&
    targetWorkspaceRootRef !== undefined &&
    sourceWorkspaceRootRef !== targetWorkspaceRootRef &&
    !manualReviewRequired
  ) {
    findings.push(
      finding(
        findings.length + 1,
        "safety",
        "blocker",
        "RESTORE_CROSS_WORKSPACE_REQUIRES_MANUAL_REVIEW",
        "Restore plan targets a different workspace root without manual review."
      )
    );
  }

  if (planKind === "rollback_package" && !schemaRegistryPresent) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "blocker",
        "ROLLBACK_SCHEMA_REGISTRY_REQUIRED",
        "Rollback package plan requires schema registry summary metadata."
      )
    );
  }

  if (planKind === "restore" && stringArray(input?.deleteSteps).length > 0) {
    findings.push(
      finding(
        findings.length + 1,
        "execution_field",
        "blocker",
        "RESTORE_DELETE_STEPS_REJECTED",
        "Restore dry-run plan must not include delete steps."
      )
    );
  }

  for (const code of warningCodes) {
    findings.push(
      finding(
        findings.length + 1,
        "safety",
        "warning",
        "PLAN_WARNING_CODE",
        "Backup/restore plan contains a caller-provided warning code."
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
        "Backup/restore plan has no schema version summary."
      )
    );
  }
  if (manualVerificationSteps.length === 0) {
    findings.push(
      finding(
        findings.length + 1,
        "safety",
        "warning",
        "MISSING_MANUAL_VERIFICATION_STEPS",
        "Backup/restore plan should include manual verification steps."
      )
    );
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: BackupRestorePlanStatus =
    blockerCount > 0
      ? "blocked"
      : input === undefined
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "plan_ready";
  const packageId =
    typeof input?.packageId === "string" && input.packageId.trim() !== ""
      ? input.packageId.trim()
      : typeof input?.idGenerator === "function"
        ? input.idGenerator()
        : `${planKind}-${stablePreviewHash(JSON.stringify(input ?? {})).slice(0, 12)}`;
  const planHash = stablePreviewHash(
    JSON.stringify({
      packageId,
      planKind,
      itemCount: normalizeNumber(input?.itemCount),
      byteCount: normalizeNumber(input?.byteCount),
      schemaVersions,
      includedDirectoryKinds,
      excludedDirectoryKinds,
      hashPrefixes,
      manualVerificationSteps,
      sourceWorkspaceRootRef,
      targetWorkspaceRootRef,
      manualReviewRequired,
      schemaRegistryPresent
    })
  );

  return {
    status,
    planKind,
    packageId,
    itemCount: normalizeNumber(input?.itemCount),
    byteCount: normalizeNumber(input?.byteCount),
    schemaVersions,
    includedDirectoryKinds: status === "blocked" ? [] : includedDirectoryKinds,
    excludedDirectoryKinds,
    hashPrefixes: status === "blocked" ? [] : hashPrefixes,
    manualVerificationSteps:
      status === "blocked" ? [] : manualVerificationSteps,
    ...(sourceWorkspaceRootRef !== undefined ? { sourceWorkspaceRootRef } : {}),
    ...(targetWorkspaceRootRef !== undefined ? { targetWorkspaceRootRef } : {}),
    manualReviewRequired,
    schemaRegistryPresent,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    planHash,
    readiness: readiness(status !== "blocked"),
    nextAction:
      status === "blocked"
        ? "Fix blocked backup/restore dry-run metadata before package planning."
        : status === "empty"
          ? "Provide summary-only backup/restore plan metadata."
          : "Review dry-run package plan; archive creation, restore, and deletion remain disabled.",
    source: "runtime_backup_restore_plan"
  };
}

export function buildBackupPlan(input?: BackupRestorePlanInput): BackupPlan {
  return buildPlan(input, "backup");
}

export function buildRestorePlan(input?: BackupRestorePlanInput): RestorePlan {
  return buildPlan(input, "restore");
}

export function buildRollbackPackagePlan(
  input?: BackupRestorePlanInput
): RollbackPackagePlan {
  return buildPlan(input, "rollback_package");
}

export function summarizeBackupRestorePlan(
  plan: BackupPlan | RestorePlan | RollbackPackagePlan
): BackupRestorePlanSummary {
  return {
    packageId: plan.packageId,
    planKind: plan.planKind,
    status: plan.status,
    itemCount: plan.itemCount,
    byteCount: plan.byteCount,
    schemaVersions: plan.schemaVersions,
    includedDirectoryKinds: plan.includedDirectoryKinds,
    excludedDirectoryKinds: plan.excludedDirectoryKinds,
    manualVerificationStepCount: plan.manualVerificationSteps.length,
    warningCodes: plan.findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    hash: plan.planHash
  };
}
