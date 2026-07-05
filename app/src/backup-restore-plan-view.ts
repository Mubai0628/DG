import {
  buildBackupPlan,
  buildRestorePlan,
  buildRollbackPackagePlan,
  summarizeBackupRestorePlan,
  type BackupPlan,
  type BackupRestorePlanInput
} from "../../runtime/src/platform/index.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type BackupRestorePlanView = {
  status: "empty" | "plan_ready" | "warning" | "blocked";
  source: "runtime_backup_restore_plan";
  packageCount: number;
  itemCount: number;
  byteCount: number;
  schemaVersionCount: number;
  includedDirectoryKinds: string[];
  excludedDirectoryKinds: string[];
  manualVerificationStepCount: number;
  blockerCount: number;
  warningCount: number;
  planHashPrefixes: string[];
  readiness: BackupPlan["readiness"];
  packageSummaries: Array<
    ReturnType<typeof summarizeBackupRestorePlan> & { hashPrefix: string }
  >;
  findings: Array<{
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }>;
  nextAction: string;
};

export type BackupRestorePlanViewInput = {
  backupPlan?: BackupRestorePlanInput | undefined;
  restorePlan?: BackupRestorePlanInput | undefined;
  rollbackPackagePlan?: BackupRestorePlanInput | undefined;
};

export function buildBackupRestorePlanView(
  input: BackupRestorePlanViewInput = {}
): BackupRestorePlanView {
  const backup = buildBackupPlan(input.backupPlan);
  const restore = buildRestorePlan(input.restorePlan);
  const rollback = buildRollbackPackagePlan(input.rollbackPackagePlan);
  const plans = [backup, restore, rollback];
  const blockerCount = plans.reduce((sum, plan) => sum + plan.blockerCount, 0);
  const warningCount = plans.reduce((sum, plan) => sum + plan.warningCount, 0);
  const status =
    blockerCount > 0
      ? "blocked"
      : plans.every((plan) => plan.status === "empty")
        ? "empty"
        : warningCount > 0 || plans.some((plan) => plan.status === "empty")
          ? "warning"
          : "plan_ready";

  return {
    status,
    source: "runtime_backup_restore_plan",
    packageCount: plans.filter((plan) => plan.status !== "empty").length,
    itemCount: plans.reduce((sum, plan) => sum + plan.itemCount, 0),
    byteCount: plans.reduce((sum, plan) => sum + plan.byteCount, 0),
    schemaVersionCount: new Set(plans.flatMap((plan) => plan.schemaVersions))
      .size,
    includedDirectoryKinds: [
      ...new Set(
        plans.flatMap((plan) =>
          plan.includedDirectoryKinds.map((kind) => safeText(kind, "unknown"))
        )
      )
    ],
    excludedDirectoryKinds: [
      ...new Set(
        plans.flatMap((plan) =>
          plan.excludedDirectoryKinds.map((kind) => safeText(kind, "unknown"))
        )
      )
    ],
    manualVerificationStepCount: plans.reduce(
      (sum, plan) => sum + plan.manualVerificationSteps.length,
      0
    ),
    blockerCount,
    warningCount,
    planHashPrefixes: plans.map((plan) => plan.planHash.slice(0, 12)),
    readiness: {
      canDisplayPlan: status !== "blocked",
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
    },
    packageSummaries: plans.map((plan) => ({
      ...summarizeBackupRestorePlan(plan),
      hashPrefix: plan.planHash.slice(0, 12)
    })),
    findings: plans.flatMap((plan) =>
      plan.findings.map((finding) => ({
        code: safeText(finding.code, "BACKUP_RESTORE_FINDING"),
        severity: finding.severity,
        safeMessage: safeErrorMessage(finding.safeMessage)
      }))
    ),
    nextAction: safeErrorMessage(
      status === "blocked"
        ? "Fix blocked backup/restore package metadata before dry-run planning can continue."
        : status === "empty"
          ? "Provide summary-only backup, restore, and rollback package metadata."
          : "Review dry-run package plans; archive creation, restore, and deletion remain disabled."
    )
  };
}

export function summarizeBackupRestorePlanView(
  view: BackupRestorePlanView
): Pick<
  BackupRestorePlanView,
  | "status"
  | "packageCount"
  | "itemCount"
  | "schemaVersionCount"
  | "manualVerificationStepCount"
  | "blockerCount"
  | "warningCount"
  | "planHashPrefixes"
  | "nextAction"
> {
  return {
    status: view.status,
    packageCount: view.packageCount,
    itemCount: view.itemCount,
    schemaVersionCount: view.schemaVersionCount,
    manualVerificationStepCount: view.manualVerificationStepCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    planHashPrefixes: view.planHashPrefixes,
    nextAction: view.nextAction
  };
}
