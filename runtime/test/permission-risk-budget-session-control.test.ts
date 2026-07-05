import { describe, expect, it } from "vitest";

import {
  buildExecutionRiskBudget,
  buildExecutionSessionControlState,
  evaluateExecutionRiskBudget,
  summarizeExecutionSessionControlState,
  type ExecutionRiskBudget,
  type ExecutionSessionControlState
} from "../src/index.js";

const safeBudgetInput = {
  mode: "approval_mode" as const,
  maxSteps: 5,
  maxDurationMs: 60_000,
  maxCommands: 2,
  maxFileMutations: 1,
  maxBytesChanged: 10_000,
  maxDeletes: 0,
  maxRecursiveDeletes: 0,
  maxGitWrites: 0,
  maxPushes: 0,
  maxDesktopActions: 0,
  maxFailures: 1,
  maxRetries: 1,
  maxCostUsd: 0.01,
  createdAt: "2026-07-06T00:00:00.000Z",
  expiresAt: "2026-07-06T00:30:00.000Z"
};

const safeSessionInput = {
  mode: "approval_mode" as const,
  status: "active" as const,
  killSwitchVisible: true,
  canPause: true,
  canKill: true,
  startedAt: "2026-07-06T00:00:00.000Z",
  expiresAt: "2026-07-06T00:30:00.000Z"
};

function budgetCodes(budget: ExecutionRiskBudget): string[] {
  return budget.findings.map((finding) => finding.code);
}

function sessionCodes(state: ExecutionSessionControlState): string[] {
  return state.findings.map((finding) => finding.code);
}

function expectBudgetReadinessFalse(budget: ExecutionRiskBudget): void {
  expect(budget.readiness).toMatchObject({
    canUseAsExecutionGrant: false,
    canRunArbitraryShell: false,
    canRecursiveDelete: false,
    canGitPush: false,
    canAutonomousLoop: false,
    canPersistRawOutput: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

function expectSessionReadinessFalse(
  state: ExecutionSessionControlState
): void {
  expect(state.readiness).toMatchObject({
    canUseAsExecutionGrant: false,
    canRunArbitraryShell: false,
    canRecursiveDelete: false,
    canGitPush: false,
    canAutonomousLoop: false,
    canPersistRawOutput: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("permission risk budget and session control", () => {
  it("builds valid risk budget metadata", () => {
    const budget = buildExecutionRiskBudget({
      ...safeBudgetInput,
      idGenerator: () => "risk-budget-valid"
    });
    const decision = evaluateExecutionRiskBudget({
      ...safeBudgetInput,
      idGenerator: () => "risk-budget-valid"
    });

    expect(budget.status).toBe("valid");
    expect(budget.budgetId).toBe("risk-budget-valid");
    expect(budget.maxRecursiveDeletes).toBe(0);
    expect(budget.maxPushes).toBe(0);
    expect(budget.readiness.canTrackBudgetMetadata).toBe(true);
    expect(decision.status).toBe("valid");
    expect(decision.source).toBe("runtime_execution_budget_decision");
    expectBudgetReadinessFalse(budget);
  });

  it("blocks negative budget values", () => {
    const budget = buildExecutionRiskBudget({
      ...safeBudgetInput,
      maxCommands: -1
    });

    expect(budget.status).toBe("blocked");
    expect(budgetCodes(budget)).toContain("RISK_BUDGET_NEGATIVE_VALUE");
    expectBudgetReadinessFalse(budget);
  });

  it("blocks recursive delete and Git push budgets in v0.34", () => {
    const budget = buildExecutionRiskBudget({
      ...safeBudgetInput,
      maxRecursiveDeletes: 1,
      maxPushes: 1
    });

    expect(budget.status).toBe("blocked");
    expect(budgetCodes(budget)).toContain(
      "RISK_BUDGET_RECURSIVE_DELETE_DISABLED_V034"
    );
    expect(budgetCodes(budget)).toContain("RISK_BUDGET_GIT_PUSH_DISABLED_V034");
    expectBudgetReadinessFalse(budget);
  });

  it("blocks full access budget metadata without expiry", () => {
    const budget = buildExecutionRiskBudget({
      ...safeBudgetInput,
      mode: "full_access_mode",
      expiresAt: undefined
    });

    expect(budget.status).toBe("blocked");
    expect(budgetCodes(budget)).toContain(
      "RISK_BUDGET_FULL_ACCESS_EXPIRY_REQUIRED"
    );
    expectBudgetReadinessFalse(budget);
  });

  it("warns for large budget, full access planning, missing cost, and missing duration", () => {
    const budget = buildExecutionRiskBudget({
      ...safeBudgetInput,
      mode: "full_access_mode",
      maxCommands: 50,
      maxFileMutations: 25,
      maxBytesChanged: 2_000_000,
      maxCostUsd: undefined,
      maxDurationMs: undefined
    });

    expect(budget.status).toBe("warning");
    expect(budgetCodes(budget)).toContain(
      "RISK_BUDGET_FULL_ACCESS_PLANNED_ONLY"
    );
    expect(budgetCodes(budget)).toContain("RISK_BUDGET_COST_MISSING");
    expect(budgetCodes(budget)).toContain("RISK_BUDGET_DURATION_MISSING");
    expect(budgetCodes(budget)).toContain("RISK_BUDGET_LARGE");
    expectBudgetReadinessFalse(budget);
  });

  it("blocks raw secret budget input and keeps output redacted", () => {
    const budget = buildExecutionRiskBudget({
      ...safeBudgetInput,
      rawPrompt: "fake raw prompt",
      reasonSummary: "fake sk-test1234567890abcdef marker"
    } as unknown as Parameters<typeof buildExecutionRiskBudget>[0]);
    const serialized = JSON.stringify(budget);

    expect(budget.status).toBe("blocked");
    expect(budgetCodes(budget)).toContain(
      "RISK_BUDGET_FORBIDDEN_FIELD_REJECTED"
    );
    expect(budgetCodes(budget)).toContain("RISK_BUDGET_SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(serialized).not.toContain("fake raw prompt");
    expectBudgetReadinessFalse(budget);
  });

  it("builds active session control metadata with visible kill switch", () => {
    const state = buildExecutionSessionControlState({
      ...safeSessionInput,
      sessionId: "session-valid"
    });

    expect(state.stateStatus).toBe("valid");
    expect(state.sessionId).toBe("session-valid");
    expect(state.killSwitchVisible).toBe(true);
    expect(state.canPause).toBe(true);
    expect(state.canResume).toBe(false);
    expect(state.canKill).toBe(true);
    expect(state.killSwitch.visible).toBe(true);
    expect(state.killSwitch.canKill).toBe(true);
    expectSessionReadinessFalse(state);
  });

  it("allows resume metadata only for paused metadata sessions", () => {
    const state = buildExecutionSessionControlState({
      ...safeSessionInput,
      mode: "advanced_workspace_mode",
      status: "paused",
      metadataOnly: true,
      canResume: true,
      sessionId: "session-paused-metadata"
    });

    expect(state.stateStatus).toBe("valid");
    expect(state.status).toBe("paused");
    expect(state.metadataOnly).toBe(true);
    expect(state.canResume).toBe(true);
    expect(state.readiness.canResume).toBe(true);
    expectSessionReadinessFalse(state);
  });

  it("blocks resume for non-metadata execution sessions", () => {
    const state = buildExecutionSessionControlState({
      ...safeSessionInput,
      status: "paused",
      metadataOnly: false,
      canResume: true
    });

    expect(state.stateStatus).toBe("blocked");
    expect(sessionCodes(state)).toContain(
      "SESSION_CONTROL_RESUME_EXECUTION_DISABLED_V034"
    );
    expect(state.canResume).toBe(false);
    expectSessionReadinessFalse(state);
  });

  it("blocks hidden kill switch and missing kill control", () => {
    const state = buildExecutionSessionControlState({
      ...safeSessionInput,
      killSwitchVisible: false,
      canKill: false
    });

    expect(state.stateStatus).toBe("blocked");
    expect(sessionCodes(state)).toContain(
      "SESSION_CONTROL_KILL_SWITCH_REQUIRED"
    );
    expect(sessionCodes(state)).toContain("SESSION_CONTROL_CAN_KILL_REQUIRED");
    expect(state.killSwitchVisible).toBe(true);
    expect(state.canKill).toBe(true);
    expectSessionReadinessFalse(state);
  });

  it("blocks expired sessions", () => {
    const state = buildExecutionSessionControlState({
      ...safeSessionInput,
      startedAt: "2026-07-06T01:00:00.000Z",
      expiresAt: "2026-07-06T00:30:00.000Z"
    });

    expect(state.stateStatus).toBe("blocked");
    expect(sessionCodes(state)).toContain("SESSION_CONTROL_EXPIRED");
    expectSessionReadinessFalse(state);
  });

  it("keeps killed session summary-only and deterministic", () => {
    const input = {
      ...safeSessionInput,
      status: "killed" as const,
      sessionId: undefined,
      idGenerator: () => "session-deterministic"
    };
    const first = buildExecutionSessionControlState(input);
    const second = buildExecutionSessionControlState(input);
    const summary = summarizeExecutionSessionControlState(first);

    expect(first.stateStatus).toBe("valid");
    expect(first.status).toBe("killed");
    expect(first.killSwitch.killed).toBe(true);
    expect(first.sessionId).toBe("session-deterministic");
    expect(first.sessionHash).toBe(second.sessionHash);
    expect(summary).toContain("kill_switch:visible");
    expect(summary).toContain(`hash:${first.sessionHash.slice(0, 12)}`);
    expectSessionReadinessFalse(first);
  });

  it("blocks raw secret session input and readiness attempts", () => {
    const state = buildExecutionSessionControlState({
      ...safeSessionInput,
      sessionId: "sk-test1234567890abcdef",
      rawOutput: "fake raw output",
      appCanExecute: true
    } as unknown as Parameters<typeof buildExecutionSessionControlState>[0]);
    const serialized = JSON.stringify(state);

    expect(state.stateStatus).toBe("blocked");
    expect(sessionCodes(state)).toContain(
      "SESSION_CONTROL_FORBIDDEN_FIELD_REJECTED"
    );
    expect(sessionCodes(state)).toContain(
      "SESSION_CONTROL_SECRET_MARKER_REJECTED"
    );
    expect(sessionCodes(state)).toContain(
      "SESSION_CONTROL_READINESS_TRUE_REJECTED"
    );
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(serialized).not.toContain("fake raw output");
    expectSessionReadinessFalse(state);
  });
});
