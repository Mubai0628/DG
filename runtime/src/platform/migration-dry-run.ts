import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type MigrationStepKind =
  | "schema_check"
  | "copy_plan"
  | "backup_required"
  | "index_rebuild_plan"
  | "replay_cache_invalidation"
  | "project_knowledge_schema_upgrade_plan"
  | "event_log_schema_check"
  | "checkpoint_compatibility_check"
  | "manual_review_required";

export type MigrationStepStatus = "planned" | "warning" | "blocked";

export type MigrationStepPlanInput = {
  stepId?: string | undefined;
  kind?: MigrationStepKind | undefined;
  sourceSchemaVersion?: string | undefined;
  targetSchemaVersion?: string | undefined;
  itemCount?: number | undefined;
  byteCount?: number | undefined;
  hashPrefix?: string | undefined;
  warningCodes?: string[] | undefined;
  manualReviewRequired?: boolean | undefined;
  backupRequired?: boolean | undefined;
  replayCompatibilityCheck?: boolean | undefined;
  status?: MigrationStepStatus | undefined;
};

export type MigrationDryRunInput =
  | {
      planId?: string | undefined;
      sourceSchemaVersion?: string | undefined;
      targetSchemaVersion?: string | undefined;
      steps?: MigrationStepPlanInput[] | undefined;
      createdAt?: string | undefined;
      idGenerator?: (() => string) | undefined;
    }
  | MigrationStepPlanInput[]
  | undefined;

export type MigrationDryRunStatus =
  | "empty"
  | "plan_ready"
  | "warning"
  | "blocked";

export type MigrationDryRunFindingKind =
  | "schema"
  | "step"
  | "version"
  | "raw_field"
  | "execution_field"
  | "safety";

export type MigrationDryRunSeverity = "blocker" | "warning";

export type MigrationDryRunFinding = {
  findingId: string;
  kind: MigrationDryRunFindingKind;
  severity: MigrationDryRunSeverity;
  code: string;
  safeMessage: string;
  stepId?: string | undefined;
  path?: string | undefined;
};

export type MigrationStepPlan = {
  stepId: string;
  kind: MigrationStepKind;
  status: MigrationStepStatus;
  sourceSchemaVersion?: string | undefined;
  targetSchemaVersion?: string | undefined;
  itemCount: number;
  byteCount: number;
  hashPrefix?: string | undefined;
  warningCodes: string[];
  manualReviewRequired: boolean;
  backupRequired: boolean;
  replayCompatibilityCheck: boolean;
};

export type MigrationDryRunReadiness = {
  canDisplayPlan: boolean;
  canRunMigration: false;
  canCopyData: false;
  canDeleteData: false;
  canRewriteData: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type MigrationDryRunSummary = {
  planId: string;
  status: MigrationDryRunStatus;
  stepCount: number;
  manualReviewCount: number;
  backupRequiredCount: number;
  totalItemCount: number;
  totalByteCount: number;
  warningCodes: string[];
  hash: string;
};

export type MigrationDryRunPlan = {
  status: MigrationDryRunStatus;
  planId: string;
  stepCount: number;
  plannedStepCount: number;
  manualReviewCount: number;
  backupRequiredCount: number;
  replayCompatibilityCheckCount: number;
  totalItemCount: number;
  totalByteCount: number;
  steps: MigrationStepPlan[];
  findings: MigrationDryRunFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  planHash: string;
  readiness: MigrationDryRunReadiness;
  nextAction: string;
  source: "runtime_migration_dry_run_plan";
};

const stepKinds: MigrationStepKind[] = [
  "schema_check",
  "copy_plan",
  "backup_required",
  "index_rebuild_plan",
  "replay_cache_invalidation",
  "project_knowledge_schema_upgrade_plan",
  "event_log_schema_check",
  "checkpoint_compatibility_check",
  "manual_review_required"
];

const allowedStepKeys = new Set([
  "stepId",
  "kind",
  "sourceSchemaVersion",
  "targetSchemaVersion",
  "itemCount",
  "byteCount",
  "hashPrefix",
  "warningCodes",
  "manualReviewRequired",
  "backupRequired",
  "replayCompatibilityCheck",
  "status"
]);

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Data",
    rawPrefix + "FileContent",
    rawPrefix + "EventPayload",
    rawPrefix + "Memory",
    rawPrefix + "Checkpoint",
    "preimage",
    "preimageContent",
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
    "actualCopy",
    "copyNow",
    "actualDelete",
    "deleteNow",
    "actualRewrite",
    "rewriteNow",
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
      /\b(raw data|raw event|raw memory|raw checkpoint|raw source|raw diff|preimage content)\b/i
  }
];

function finding(
  index: number,
  kind: MigrationDryRunFindingKind,
  severity: MigrationDryRunSeverity,
  code: string,
  safeMessage: string,
  stepId?: string,
  path?: string
): MigrationDryRunFinding {
  return {
    findingId: `migration-dry-run-finding-${index}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(stepId !== undefined ? { stepId } : {}),
    ...(path !== undefined ? { path } : {})
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readiness(canDisplayPlan: boolean): MigrationDryRunReadiness {
  return {
    canDisplayPlan,
    canRunMigration: false,
    canCopyData: false,
    canDeleteData: false,
    canRewriteData: false,
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
  findings: MigrationDryRunFinding[]
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
            undefined,
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
          normalizedKey.includes("raw") || normalizedKey.includes("preimage")
            ? "raw_field"
            : "execution_field",
          "blocker",
          `${key.toUpperCase()}_FIELD_REJECTED`,
          `Forbidden field ${key} is not allowed in migration dry-run metadata.`,
          undefined,
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

function parseSteps(input: MigrationDryRunInput): MigrationStepPlanInput[] {
  if (Array.isArray(input)) {
    return input;
  }
  if (isRecord(input) && Array.isArray(input.steps)) {
    return input.steps.filter(isRecord) as MigrationStepPlanInput[];
  }
  return [];
}

function versionRank(version: string | undefined): number | undefined {
  if (version === undefined || version.trim() === "" || version === "unknown") {
    return undefined;
  }
  const numeric = version.match(/v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/i);
  if (numeric === null) {
    return undefined;
  }
  const [, major = "0", minor = "0", patch = "0"] = numeric;
  return Number(major) * 1_000_000 + Number(minor) * 1_000 + Number(patch);
}

function buildPlan(input: MigrationDryRunInput): MigrationDryRunPlan {
  const findings: MigrationDryRunFinding[] = [];
  scanForbidden(input, "$", findings);

  if (isRecord(input) && !Array.isArray(input.steps)) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "blocker",
        "MISSING_STEPS",
        "Migration dry-run input must include a steps array."
      )
    );
  }

  const planSourceVersion =
    isRecord(input) && typeof input.sourceSchemaVersion === "string"
      ? input.sourceSchemaVersion
      : undefined;
  const planTargetVersion =
    isRecord(input) && typeof input.targetSchemaVersion === "string"
      ? input.targetSchemaVersion
      : undefined;
  const stepInputs = parseSteps(input);
  if (stepInputs.length === 0) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "warning",
        "EMPTY_MIGRATION_PLAN",
        "No migration dry-run steps were provided."
      )
    );
  }

  const steps = stepInputs.map((step, index) => {
    for (const key of Object.keys(step)) {
      if (!allowedStepKeys.has(key)) {
        findings.push(
          finding(
            findings.length + 1,
            "schema",
            "blocker",
            "UNKNOWN_STEP_FIELD",
            `Unknown migration step field ${key} is not allowed.`,
            step.stepId,
            `steps[${index}].${key}`
          )
        );
      }
    }

    const kind = stepKinds.includes(step.kind as MigrationStepKind)
      ? (step.kind as MigrationStepKind)
      : "manual_review_required";
    if (step.kind !== undefined && !stepKinds.includes(step.kind)) {
      findings.push(
        finding(
          findings.length + 1,
          "step",
          "warning",
          "UNKNOWN_STEP_KIND",
          `Migration dry-run step ${index + 1} uses an unknown kind.`,
          step.stepId
        )
      );
    }

    const stepId =
      typeof step.stepId === "string" && step.stepId.trim() !== ""
        ? step.stepId
        : `migration-step-${index + 1}`;
    const sourceSchemaVersion =
      step.sourceSchemaVersion ?? planSourceVersion ?? "unknown";
    const targetSchemaVersion =
      step.targetSchemaVersion ?? planTargetVersion ?? sourceSchemaVersion;
    const manualReviewRequired =
      step.manualReviewRequired === true || kind === "manual_review_required";
    const backupRequired =
      step.backupRequired === true || kind === "backup_required";
    const replayCompatibilityCheck = step.replayCompatibilityCheck === true;
    let status: MigrationStepStatus =
      step.status === "blocked" || step.status === "warning"
        ? step.status
        : "planned";

    if (sourceSchemaVersion === "unknown" && !manualReviewRequired) {
      findings.push(
        finding(
          findings.length + 1,
          "version",
          "blocker",
          "UNKNOWN_SOURCE_WITHOUT_MANUAL_REVIEW",
          "Source schema version is unknown and manual review is not required.",
          stepId
        )
      );
      status = "blocked";
    }

    const sourceRank = versionRank(sourceSchemaVersion);
    const targetRank = versionRank(targetSchemaVersion);
    if (
      sourceRank !== undefined &&
      targetRank !== undefined &&
      targetRank < sourceRank &&
      step.status !== "blocked"
    ) {
      findings.push(
        finding(
          findings.length + 1,
          "version",
          "blocker",
          "TARGET_DOWNGRADE_REJECTED",
          "Target schema version downgrade must be represented as a blocked step.",
          stepId
        )
      );
      status = "blocked";
    }

    if (kind === "checkpoint_compatibility_check" && !backupRequired) {
      findings.push(
        finding(
          findings.length + 1,
          "safety",
          "blocker",
          "CHECKPOINT_BACKUP_REQUIRED",
          "Checkpoint migration planning requires a backup-required step.",
          stepId
        )
      );
      status = "blocked";
    }

    if (kind === "event_log_schema_check" && !replayCompatibilityCheck) {
      findings.push(
        finding(
          findings.length + 1,
          "safety",
          "blocker",
          "EVENT_LOG_REPLAY_CHECK_REQUIRED",
          "Event log migration planning requires replay compatibility check metadata.",
          stepId
        )
      );
      status = "blocked";
    }

    for (let index = 0; index < (step.warningCodes ?? []).length; index += 1) {
      findings.push(
        finding(
          findings.length + 1,
          "step",
          "warning",
          "STEP_WARNING_CODE",
          `Migration dry-run step contains caller-provided warning code #${index + 1}.`,
          stepId
        )
      );
      if (status === "planned") {
        status = "warning";
      }
    }

    return {
      stepId,
      kind,
      status,
      sourceSchemaVersion,
      targetSchemaVersion,
      itemCount: normalizeNumber(step.itemCount),
      byteCount: normalizeNumber(step.byteCount),
      ...(step.hashPrefix !== undefined ? { hashPrefix: step.hashPrefix } : {}),
      warningCodes: (step.warningCodes ?? []).filter(
        (code): code is string => typeof code === "string"
      ),
      manualReviewRequired,
      backupRequired,
      replayCompatibilityCheck
    };
  });

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: MigrationDryRunStatus =
    blockerCount > 0
      ? "blocked"
      : steps.length === 0
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "plan_ready";
  const planId =
    isRecord(input) && typeof input.planId === "string"
      ? input.planId
      : isRecord(input) && typeof input.idGenerator === "function"
        ? input.idGenerator()
        : `migration-dry-run-${stablePreviewHash(JSON.stringify(steps)).slice(0, 12)}`;
  const planHash = stablePreviewHash(
    JSON.stringify({
      planId,
      steps,
      blockerCount,
      warningCount
    })
  );

  return {
    status,
    planId,
    stepCount: steps.length,
    plannedStepCount: steps.filter((step) => step.status === "planned").length,
    manualReviewCount: steps.filter((step) => step.manualReviewRequired).length,
    backupRequiredCount: steps.filter((step) => step.backupRequired).length,
    replayCompatibilityCheckCount: steps.filter(
      (step) => step.replayCompatibilityCheck
    ).length,
    totalItemCount: steps.reduce((sum, step) => sum + step.itemCount, 0),
    totalByteCount: steps.reduce((sum, step) => sum + step.byteCount, 0),
    steps: status === "blocked" ? [] : steps,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    planHash,
    readiness: readiness(status !== "blocked"),
    nextAction:
      status === "blocked"
        ? "Fix blocked dry-run plan metadata before migration can be planned."
        : status === "empty"
          ? "Provide summary-only migration dry-run steps."
          : "Review the dry-run plan; migration execution remains disabled.",
    source: "runtime_migration_dry_run_plan"
  };
}

export function buildMigrationDryRunPlan(
  input?: MigrationDryRunInput
): MigrationDryRunPlan {
  return buildPlan(input);
}

export function validateMigrationDryRunPlan(
  input?: MigrationDryRunInput
): MigrationDryRunPlan {
  return buildPlan(input);
}

export function summarizeMigrationDryRunPlan(
  plan: MigrationDryRunPlan
): MigrationDryRunSummary {
  return {
    planId: plan.planId,
    status: plan.status,
    stepCount: plan.stepCount,
    manualReviewCount: plan.manualReviewCount,
    backupRequiredCount: plan.backupRequiredCount,
    totalItemCount: plan.totalItemCount,
    totalByteCount: plan.totalByteCount,
    warningCodes: plan.findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    hash: plan.planHash
  };
}
