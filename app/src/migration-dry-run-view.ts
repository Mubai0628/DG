import {
  buildMigrationDryRunPlan,
  summarizeMigrationDryRunPlan,
  type MigrationDryRunInput,
  type MigrationDryRunPlan,
  type MigrationDryRunStatus
} from "../../runtime/src/platform/index.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type MigrationDryRunView = {
  status: MigrationDryRunStatus;
  source: "runtime_migration_dry_run_plan";
  planId: string;
  stepCount: number;
  plannedStepCount: number;
  manualReviewCount: number;
  backupRequiredCount: number;
  replayCompatibilityCheckCount: number;
  totalItemCount: number;
  totalByteCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  planHashPrefix: string;
  readiness: MigrationDryRunPlan["readiness"];
  findings: Array<{
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }>;
  steps: Array<{
    stepId: string;
    kind: string;
    status: string;
    sourceSchemaVersion?: string | undefined;
    targetSchemaVersion?: string | undefined;
    manualReviewRequired: boolean;
    backupRequired: boolean;
    replayCompatibilityCheck: boolean;
  }>;
  nextAction: string;
  summary: ReturnType<typeof summarizeMigrationDryRunPlan>;
};

export type MigrationDryRunViewInput = {
  plan?: MigrationDryRunInput | undefined;
};

export function buildMigrationDryRunView(
  input: MigrationDryRunViewInput = {}
): MigrationDryRunView {
  const plan = buildMigrationDryRunPlan(input.plan);

  return {
    status: plan.status,
    source: plan.source,
    planId: safeText(plan.planId, "migration-dry-run-plan"),
    stepCount: plan.stepCount,
    plannedStepCount: plan.plannedStepCount,
    manualReviewCount: plan.manualReviewCount,
    backupRequiredCount: plan.backupRequiredCount,
    replayCompatibilityCheckCount: plan.replayCompatibilityCheckCount,
    totalItemCount: plan.totalItemCount,
    totalByteCount: plan.totalByteCount,
    blockerCount: plan.blockerCount,
    warningCount: plan.warningCount,
    findingCount: plan.findingCount,
    planHashPrefix: plan.planHash.slice(0, 12),
    readiness: plan.readiness,
    findings: plan.findings.map((finding) => ({
      code: safeText(finding.code, "MIGRATION_DRY_RUN_FINDING"),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    steps: plan.steps.map((step) => ({
      stepId: safeText(step.stepId, "migration-step"),
      kind: safeText(step.kind, "schema_check"),
      status: safeText(step.status, "planned"),
      ...(step.sourceSchemaVersion !== undefined
        ? {
            sourceSchemaVersion: safeText(step.sourceSchemaVersion, "unknown")
          }
        : {}),
      ...(step.targetSchemaVersion !== undefined
        ? {
            targetSchemaVersion: safeText(step.targetSchemaVersion, "unknown")
          }
        : {}),
      manualReviewRequired: step.manualReviewRequired,
      backupRequired: step.backupRequired,
      replayCompatibilityCheck: step.replayCompatibilityCheck
    })),
    nextAction: safeErrorMessage(plan.nextAction),
    summary: summarizeMigrationDryRunPlan(plan)
  };
}

export function summarizeMigrationDryRunView(
  view: MigrationDryRunView
): MigrationDryRunView["summary"] & { planHashPrefix: string } {
  return {
    ...view.summary,
    planHashPrefix: view.planHashPrefix
  };
}
