import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  runEndToEndGoldenRegression,
  runEndToEndGoldenRegressionCase,
  summarizeEndToEndGoldenRegressionReport,
  validateEndToEndGoldenRegressionInput,
  type EndToEndGoldenRegressionCaseInput,
  type EndToEndGoldenRegressionReport
} from "../src/index.js";

const fixtureRoot = new URL("./fixtures/e2e-coding-tasks/", import.meta.url);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

async function caseFromFixture(
  name: string,
  overrides: Partial<EndToEndGoldenRegressionCaseInput> = {}
): Promise<EndToEndGoldenRegressionCaseInput> {
  return {
    fixture: await readFixture(name),
    ...overrides
  };
}

async function goldenCases(): Promise<EndToEndGoldenRegressionCaseInput[]> {
  return [
    await caseFromFixture("docs-create-smoke.json"),
    await caseFromFixture("docs-update-verify-smoke.json"),
    await caseFromFixture("conflict-stale-snapshot.json"),
    await caseFromFixture("verification-failure-rollback.json"),
    await caseFromFixture("blocked-unsafe-path.json", {
      expectedFailureCategories: ["unsafe_path"]
    }),
    await caseFromFixture("blocked-secret-marker.json", {
      expectedFailureCategories: ["secret_marker"]
    }),
    await caseFromFixture("blocked-raw-content-marker.json")
  ];
}

function expectNoExecution(report: EndToEndGoldenRegressionReport): void {
  expect(report.readiness).toMatchObject({
    canCallLiveModel: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canAutoApply: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("e2e golden regression suite", () => {
  it("returns empty safely without cases", () => {
    const report = runEndToEndGoldenRegression();

    expect(report.status).toBe("empty");
    expect(report.caseCount).toBe(0);
    expect(report.reportHash).toBeTruthy();
    expectNoExecution(report);
  });

  it("passes a successful docs-only create regression", async () => {
    const result = runEndToEndGoldenRegressionCase(
      await caseFromFixture("docs-create-smoke.json")
    );

    expect(result.status).toBe("passed");
    expect(result.actualOutcome).toBe("pass");
    expect(result.proposalSummary.refId).toBe("proposal:docs-create");
    expect(result.approvalSummary.status).toBe("ready");
    expect(result.applySummary.status).toBe("ready");
    expect(result.eventReplaySummary.eventCount).toBe(2);
    expect(result.readiness.canApplyPatch).toBe(false);
  });

  it("passes a successful docs-only update regression", async () => {
    const result = runEndToEndGoldenRegressionCase(
      await caseFromFixture("docs-update-verify-smoke.json")
    );

    expect(result.status).toBe("passed");
    expect(result.actualOutcome).toBe("pass");
    expect(result.applySummary.pathCount).toBe(1);
    expect(result.verificationSummary.refId).toBe("verify:docs-update");
  });

  it("captures verification failure and rollback summary-only", async () => {
    const result = runEndToEndGoldenRegressionCase(
      await caseFromFixture("verification-failure-rollback.json")
    );

    expect(result.status).toBe("passed");
    expect(result.actualOutcome).toBe("rollback_required");
    expect(result.rollbackSummary?.refId).toBe("rollback:verification-failure");
    expect(result.rollbackSummary?.status).toBe("ready");
    expect(result.warningCodes).toContain("VERIFICATION_FAILED");
    expect(result.orchestratorSummary?.state).toBe("rolled_back");
  });

  it("blocks stale conflict regression safely", async () => {
    const result = runEndToEndGoldenRegressionCase(
      await caseFromFixture("conflict-stale-snapshot.json")
    );

    expect(result.status).toBe("blocked");
    expect(result.actualOutcome).toBe("blocked");
    expect(result.failureCategories).toContain("stale_snapshot");
    expect(result.failureCategories).toContain("apply_conflict");
    expect(result.applySummary.blockerCodes).toContain("STALE_SNAPSHOT");
    expect(result.applySummary.blockerCodes).toContain("APPLY_CONFLICT");
  });

  it("blocks unsafe path regression", async () => {
    const result = runEndToEndGoldenRegressionCase(
      await caseFromFixture("blocked-unsafe-path.json", {
        expectedFailureCategories: ["unsafe_path"]
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.actualOutcome).toBe("blocked");
    expect(result.failureCategories).toContain("unsafe_path");
    expect(result.blockerCodes).toContain("FIXTURE_PARENT_TRAVERSAL_REJECTED");
  });

  it("blocks raw content marker regression without raw output", async () => {
    const result = runEndToEndGoldenRegressionCase(
      await caseFromFixture("blocked-raw-content-marker.json")
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.actualOutcome).toBe("blocked");
    expect(result.failureCategories).toContain("raw_content_leak");
    expect(serialized).not.toContain("fileContent");
    expect(serialized).not.toContain("preimageContent");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("rawResponse");
  });

  it("keeps blocked secret marker regression summary-only", async () => {
    const result = runEndToEndGoldenRegressionCase(
      await caseFromFixture("blocked-secret-marker.json", {
        expectedFailureCategories: ["secret_marker"]
      })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.failureCategories).toContain("secret_marker");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
  });

  it("aggregates the golden suite deterministically", async () => {
    const report = runEndToEndGoldenRegression({
      suiteId: "p0s-golden-suite",
      cases: await goldenCases()
    });
    const summary = summarizeEndToEndGoldenRegressionReport(report);

    expect(report.status).toBe("passed");
    expect(report.caseCount).toBe(7);
    expect(report.passedCount).toBe(3);
    expect(report.blockedCount).toBe(4);
    expect(report.failedRegressionCount).toBe(0);
    expect(report.rollbackRegressionCount).toBe(1);
    expect(report.taxonomySummary.unsafe_path).toBeGreaterThan(0);
    expect(report.taxonomySummary.secret_marker).toBeGreaterThan(0);
    expect(report.taxonomySummary.raw_content_leak).toBeGreaterThan(0);
    expect(summary.suiteId).toBe("p0s-golden-suite");
    expectNoExecution(report);
  });

  it("marks expected outcome mismatches as failed", async () => {
    const result = runEndToEndGoldenRegressionCase(
      await caseFromFixture("docs-create-smoke.json", {
        expectedOutcome: "blocked",
        expectedFailureCategories: ["unsafe_path"]
      })
    );

    expect(result.status).toBe("failed");
    expect(result.matchedExpectation).toBe(false);
    expect(result.blockerCodes).toContain("EXPECTED_OUTCOME_MISMATCH");
  });

  it("keeps reports free of raw content and secret marker values", async () => {
    const report = runEndToEndGoldenRegression({
      cases: await goldenCases()
    });
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("reasoning_content");
    expect(serialized).not.toContain("preimageContent");
    expectNoExecution(report);
  });

  it("keeps hashes deterministic with injected suite id", async () => {
    const cases = await goldenCases();
    const first = runEndToEndGoldenRegression({
      suiteId: "deterministic-suite",
      cases
    });
    const second = runEndToEndGoldenRegression({
      suiteId: "deterministic-suite",
      cases
    });

    expect(first.reportHash).toBe(second.reportHash);
    expect(first.cases.map((item) => item.caseHash)).toEqual(
      second.cases.map((item) => item.caseHash)
    );
  });

  it("blocks execution readiness claims in suite input", () => {
    const findings = validateEndToEndGoldenRegressionInput({
      cases: [],
      canApplyPatch: true
    } as never);

    expect(findings.map((finding) => finding.code)).toContain(
      "EXECUTION_READINESS_TRUE"
    );
  });
});
