import { describe, expect, it } from "vitest";

import {
  buildMigrationDryRunPlan,
  summarizeMigrationDryRunPlan,
  validateMigrationDryRunPlan,
  type MigrationDryRunInput,
  type MigrationDryRunPlan
} from "../src/index.js";

function safePlanInput(): MigrationDryRunInput {
  return {
    planId: "migration-plan-safe",
    sourceSchemaVersion: "event_log.v1",
    targetSchemaVersion: "event_log.v2",
    steps: [
      {
        stepId: "schema-check",
        kind: "schema_check",
        sourceSchemaVersion: "event_log.v1",
        targetSchemaVersion: "event_log.v2",
        itemCount: 2,
        byteCount: 128,
        hashPrefix: "schema-check"
      },
      {
        stepId: "copy-plan",
        kind: "copy_plan",
        sourceSchemaVersion: "project_knowledge.v1",
        targetSchemaVersion: "project_knowledge.v2",
        itemCount: 1,
        byteCount: 64,
        hashPrefix: "copy-plan"
      },
      {
        stepId: "checkpoint-check",
        kind: "checkpoint_compatibility_check",
        sourceSchemaVersion: "checkpoint.v1",
        targetSchemaVersion: "checkpoint.v1",
        backupRequired: true,
        itemCount: 1,
        byteCount: 32,
        hashPrefix: "checkpoint"
      },
      {
        stepId: "event-log-check",
        kind: "event_log_schema_check",
        sourceSchemaVersion: "event_log.v1",
        targetSchemaVersion: "event_log.v2",
        replayCompatibilityCheck: true,
        itemCount: 1,
        byteCount: 32,
        hashPrefix: "event-log"
      }
    ]
  };
}

function findingCodes(plan: MigrationDryRunPlan): string[] {
  return plan.findings.map((finding) => finding.code);
}

function expectNoExecution(plan: MigrationDryRunPlan): void {
  expect(plan.readiness).toMatchObject({
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
  });
}

describe("migration dry-run planner", () => {
  it("builds a safe summary-only dry-run plan", () => {
    const plan = buildMigrationDryRunPlan(safePlanInput());
    const summary = summarizeMigrationDryRunPlan(plan);

    expect(plan.status).toBe("plan_ready");
    expect(plan.stepCount).toBe(4);
    expect(plan.backupRequiredCount).toBe(1);
    expect(plan.replayCompatibilityCheckCount).toBe(1);
    expect(summary.totalItemCount).toBe(5);
    expect(summary.totalByteCount).toBe(256);
    expect(plan.readiness.canDisplayPlan).toBe(true);
    expectNoExecution(plan);
  });

  it("blocks unknown source versions without manual review", () => {
    const plan = validateMigrationDryRunPlan({
      steps: [
        {
          stepId: "unknown-source",
          kind: "schema_check",
          sourceSchemaVersion: "unknown",
          targetSchemaVersion: "event_log.v2"
        }
      ]
    });

    expect(plan.status).toBe("blocked");
    expect(findingCodes(plan)).toContain(
      "UNKNOWN_SOURCE_WITHOUT_MANUAL_REVIEW"
    );
    expectNoExecution(plan);
  });

  it("allows unknown source version only when manual review is explicit", () => {
    const plan = validateMigrationDryRunPlan({
      steps: [
        {
          stepId: "manual-review",
          kind: "manual_review_required",
          sourceSchemaVersion: "unknown",
          targetSchemaVersion: "event_log.v2",
          manualReviewRequired: true
        }
      ]
    });

    expect(plan.status).toBe("plan_ready");
    expect(plan.manualReviewCount).toBe(1);
    expectNoExecution(plan);
  });

  it("blocks target downgrades unless the step is already blocked", () => {
    const plan = validateMigrationDryRunPlan({
      steps: [
        {
          stepId: "downgrade",
          kind: "schema_check",
          sourceSchemaVersion: "event_log.v2",
          targetSchemaVersion: "event_log.v1"
        }
      ]
    });
    const blockedDowngrade = validateMigrationDryRunPlan({
      steps: [
        {
          stepId: "blocked-downgrade",
          kind: "schema_check",
          sourceSchemaVersion: "event_log.v2",
          targetSchemaVersion: "event_log.v1",
          status: "blocked"
        }
      ]
    });

    expect(plan.status).toBe("blocked");
    expect(findingCodes(plan)).toContain("TARGET_DOWNGRADE_REJECTED");
    expect(blockedDowngrade.status).toBe("plan_ready");
    expectNoExecution(blockedDowngrade);
  });

  it("blocks checkpoint and event log plans missing required safety checks", () => {
    const plan = validateMigrationDryRunPlan({
      steps: [
        {
          stepId: "checkpoint-missing-backup",
          kind: "checkpoint_compatibility_check",
          sourceSchemaVersion: "checkpoint.v1",
          targetSchemaVersion: "checkpoint.v2"
        },
        {
          stepId: "event-log-missing-replay",
          kind: "event_log_schema_check",
          sourceSchemaVersion: "event_log.v1",
          targetSchemaVersion: "event_log.v2"
        }
      ]
    });

    expect(plan.status).toBe("blocked");
    expect(findingCodes(plan)).toContain("CHECKPOINT_BACKUP_REQUIRED");
    expect(findingCodes(plan)).toContain("EVENT_LOG_REPLAY_CHECK_REQUIRED");
    expectNoExecution(plan);
  });

  it("blocks actual delete write rewrite and raw content fields", () => {
    const plan = validateMigrationDryRunPlan({
      steps: [
        {
          stepId: "unsafe",
          kind: "copy_plan",
          sourceSchemaVersion: "event_log.v1",
          targetSchemaVersion: "event_log.v2",
          deleteNow: true,
          writeNow: true,
          rawEventPayload: "raw event payload"
        }
      ]
    } as unknown as MigrationDryRunInput);

    expect(plan.status).toBe("blocked");
    expect(findingCodes(plan)).toContain("DELETENOW_FIELD_REJECTED");
    expect(findingCodes(plan)).toContain("WRITENOW_FIELD_REJECTED");
    expect(findingCodes(plan)).toContain("RAWEVENTPAYLOAD_FIELD_REJECTED");
    expect(findingCodes(plan)).toContain("UNKNOWN_STEP_FIELD");
    expectNoExecution(plan);
  });

  it("blocks secret markers and does not echo the marker", () => {
    const plan = validateMigrationDryRunPlan({
      steps: [
        {
          stepId: "secret-marker",
          kind: "schema_check",
          sourceSchemaVersion: "event_log.v1",
          targetSchemaVersion: "event_log.v2",
          hashPrefix: "Bearer fake-test-token"
        }
      ]
    });
    const output = JSON.stringify(plan);

    expect(plan.status).toBe("blocked");
    expect(findingCodes(plan)).toContain("BEARER_TOKEN_MARKER");
    expect(output).not.toContain("fake-test-token");
    expectNoExecution(plan);
  });

  it("keeps deterministic plan ids and hashes with injected id", () => {
    const first = buildMigrationDryRunPlan({
      ...safePlanInput(),
      planId: undefined,
      idGenerator: () => "migration-plan-generated"
    });
    const second = buildMigrationDryRunPlan({
      ...safePlanInput(),
      planId: undefined,
      idGenerator: () => "migration-plan-generated"
    });

    expect(first.planId).toBe("migration-plan-generated");
    expect(first.planHash).toBe(second.planHash);
    expectNoExecution(first);
  });
});
