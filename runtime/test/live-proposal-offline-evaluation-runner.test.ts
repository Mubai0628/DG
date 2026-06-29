import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  runLiveProposalOfflineEvaluation,
  runLiveProposalOfflineEvaluationCase,
  summarizeLiveProposalOfflineEvaluationReport,
  validateLiveProposalOfflineEvaluationInput,
  type LiveProposalOfflineEvaluationCaseInput,
  type LiveProposalOfflineEvaluationReport,
  type ModelPatchProposalInput
} from "../src/index.js";

const goldenCaseRoot = new URL(
  "./fixtures/live-proposal-golden-cases/",
  import.meta.url
);
const evaluationFixtureUrl = new URL(
  "./fixtures/live-proposal-evaluation/offline-evaluation-cases.json",
  import.meta.url
);

type EvaluationFixtureCase = {
  caseId: string;
  goldenCaseFixture: string;
  expectedStatus?: "pass" | "warning" | "blocked";
  expectedFailureCategories?: string[];
  fakeResponse?: ModelPatchProposalInput | undefined;
};

async function readJson<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, "utf8")) as T;
}

async function goldenCase(name: string): Promise<Record<string, unknown>> {
  return readJson(new URL(name, goldenCaseRoot));
}

async function evaluationCases(): Promise<
  LiveProposalOfflineEvaluationCaseInput[]
> {
  const fixture = await readJson<{ cases: EvaluationFixtureCase[] }>(
    evaluationFixtureUrl
  );
  const cases = [];
  for (const item of fixture.cases) {
    cases.push({
      goldenCase: await readJson(
        new URL(item.goldenCaseFixture, evaluationFixtureUrl)
      ),
      fakeResponse: item.fakeResponse,
      expectedStatus: item.expectedStatus,
      expectedFailureCategories: item.expectedFailureCategories as
        | LiveProposalOfflineEvaluationCaseInput["expectedFailureCategories"]
        | undefined
    });
  }
  return cases;
}

function safeProposal(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    schemaVersion: "model_patch_proposal.v1",
    proposalId: "proposal-offline-safe",
    title: "Document offline evaluation",
    intent: "documentation_update",
    objectiveSummary: "Document offline evaluation boundaries.",
    operations: [
      {
        operationId: "op-offline-doc",
        path: "docs/runtime-live-proposal-offline-evaluation-runner-v0.9.md",
        changeKind: "documentation",
        summary: "Document fake/dry offline evaluation.",
        estimatedLinesAdded: 10,
        estimatedLinesRemoved: 0,
        warningCodes: []
      }
    ],
    pathSummaries: [
      {
        path: "docs/runtime-live-proposal-offline-evaluation-runner-v0.9.md",
        changeKind: "documentation",
        summary: "Documentation summary."
      }
    ],
    evidenceRefs: [
      {
        refId: "evidence-offline-eval",
        kind: "manual_note",
        summary: "Offline evaluation evidence summary.",
        hashPrefix: "offeval"
      }
    ],
    riskNotes: [
      {
        code: "DRAFT_ONLY",
        severity: "info",
        summary: "Evaluation-only draft."
      }
    ],
    validationHints: ["Offline evaluation only."],
    modelProfileId: "offline-fake-model",
    ...overrides
  };
}

function expectNoExecution(report: LiveProposalOfflineEvaluationReport): void {
  expect(report.readiness).toMatchObject({
    canEnterLiveEvaluation: false,
    canCallLiveModel: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("live proposal offline evaluation runner", () => {
  it("returns empty safely without cases", async () => {
    const report = await runLiveProposalOfflineEvaluation();

    expect(report.status).toBe("empty");
    expect(report.caseCount).toBe(0);
    expect(report.reportHash).toBeTruthy();
    expectNoExecution(report);
  });

  it("passes a safe golden case with a safe fake response", async () => {
    const result = await runLiveProposalOfflineEvaluationCase({
      goldenCase: await goldenCase("safe-docs-smoke.json"),
      fakeResponse: safeProposal(),
      expectedStatus: "pass"
    });

    expect(result.status).toBe("passed");
    expect(result.actualStatus).toBe("pass");
    expect(result.matchedExpectation).toBe(true);
    expect(result.schemaPassed).toBe(true);
    expect(result.repairSucceeded).toBe(true);
    expect(result.failureCategories).not.toContain("raw_content_leak");
  });

  it("returns warning for a missing-test golden case and fake response", async () => {
    const cases = await evaluationCases();
    const warningCase = cases.find(
      (item) =>
        (item.goldenCase as Record<string, unknown>).caseId ===
        "golden-warning-missing-tests"
    );
    expect(warningCase).toBeDefined();

    const result = await runLiveProposalOfflineEvaluationCase(warningCase!);

    expect(result.status).toBe("warning");
    expect(result.actualStatus).toBe("warning");
    expect(result.failureCategories).toContain("missing_test_plan");
  });

  it("maps a blocked unsafe path golden case to unsafe_path", async () => {
    const result = await runLiveProposalOfflineEvaluationCase({
      goldenCase: await goldenCase("blocked-unsafe-path.json"),
      expectedStatus: "blocked",
      expectedFailureCategories: ["unsafe_path"]
    });

    expect(result.status).toBe("blocked");
    expect(result.actualStatus).toBe("blocked");
    expect(result.failureCategories).toContain("unsafe_path");
    expect(result.unsafeBlocked).toBe(true);
  });

  it("maps a blocked secret marker golden case to secret_marker", async () => {
    const result = await runLiveProposalOfflineEvaluationCase({
      goldenCase: await goldenCase("blocked-secret-marker.json"),
      expectedStatus: "blocked",
      expectedFailureCategories: ["secret_marker"]
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.failureCategories).toContain("secret_marker");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
  });

  it("maps malformed fake responses to malformed_json or repair_failed", async () => {
    const result = await runLiveProposalOfflineEvaluationCase({
      goldenCase: await goldenCase("safe-docs-smoke.json"),
      fakeResponse: "{ not valid json",
      expectedStatus: "blocked",
      expectedFailureCategories: ["malformed_json"]
    });

    expect(result.status).toBe("blocked");
    expect(result.failureCategories).toContain("malformed_json");
    expect(result.failureCategories).toContain("repair_failed");
  });

  it("marks expected mismatches as failed expectations", async () => {
    const result = await runLiveProposalOfflineEvaluationCase({
      goldenCase: await goldenCase("safe-docs-smoke.json"),
      fakeResponse: safeProposal(),
      expectedStatus: "blocked",
      expectedFailureCategories: ["unsafe_path"]
    });

    expect(result.status).toBe("failed");
    expect(result.matchedExpectation).toBe(false);
  });

  it("aggregates counts, schema pass rate, repair success rate, and taxonomy", async () => {
    const cases = (await evaluationCases()).slice(0, 3);
    const report = await runLiveProposalOfflineEvaluation({
      evaluatorMode: "offline_fake",
      cases,
      idGenerator: () => "offline-eval-report"
    });
    const summary = summarizeLiveProposalOfflineEvaluationReport(report);

    expect(report.status).toBe("warning");
    expect(report.caseCount).toBe(3);
    expect(report.passedCount).toBe(1);
    expect(report.warningCount).toBe(1);
    expect(report.blockedCount).toBe(1);
    expect(report.schemaPassRate).toBeGreaterThan(0);
    expect(report.repairSuccessRate).toBeGreaterThan(0);
    expect(report.taxonomySummary.categories.unsafe_path).toBeGreaterThan(0);
    expect(report.metrics.map((metric) => metric.metricId)).toContain(
      "schemaPassRate"
    );
    expect(summary.reportId).toBe("offline-eval-report");
    expectNoExecution(report);
  });

  it("supports offline_dry with an injected dry client only", async () => {
    const report = await runLiveProposalOfflineEvaluation({
      evaluatorMode: "offline_dry",
      cases: [
        {
          goldenCase: await goldenCase("safe-docs-smoke.json"),
          expectedStatus: "warning"
        }
      ],
      dryClient: {
        generatePatchProposal: () => ({
          content: safeProposal({
            proposalId: "proposal-offline-dry"
          }),
          modelProfileId: "deepseek-offline-dry",
          usageSummary: {
            inputTokens: 11,
            outputTokens: 13,
            totalTokens: 24
          }
        })
      }
    });

    expect(report.caseCount).toBe(1);
    expect(report.usageSummaryCaseCount).toBe(1);
    expect(report.cases[0]?.usageSummary?.totalTokens).toBe(24);
    expectNoExecution(report);
  });

  it("does not call global fetch or read process env sentinels", async () => {
    const previousFetch = globalThis.fetch;
    const previousSentinel = process.env.DEEPSEEK_API_KEY;
    let fetchCalled = false;
    globalThis.fetch = (() => {
      fetchCalled = true;
      throw new Error("fetch should not be called");
    }) as typeof fetch;
    process.env.DEEPSEEK_API_KEY = "sk-envsentinel1234567890";
    try {
      const report = await runLiveProposalOfflineEvaluation({
        evaluatorMode: "offline_fake",
        cases: [
          {
            goldenCase: await goldenCase("safe-docs-smoke.json"),
            fakeResponse: safeProposal(),
            expectedStatus: "pass"
          }
        ]
      });
      const serialized = JSON.stringify(report);

      expect(fetchCalled).toBe(false);
      expect(serialized).not.toContain("sk-envsentinel1234567890");
      expectNoExecution(report);
    } finally {
      if (previousFetch === undefined) {
        delete (globalThis as { fetch?: typeof fetch }).fetch;
      } else {
        globalThis.fetch = previousFetch;
      }
      if (previousSentinel === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = previousSentinel;
      }
    }
  });

  it("keeps raw prompt, raw response, reasoning, and API key markers out of output", async () => {
    const result = await runLiveProposalOfflineEvaluationCase({
      goldenCase: await goldenCase("safe-docs-smoke.json"),
      fakeResponse: {
        rawPrompt: "model prompt text",
        rawResponse: "model response text",
        reasoning_content: "reasoning text",
        title: "sk-test1234567890abcdef"
      },
      expectedStatus: "blocked",
      expectedFailureCategories: ["raw_content_leak", "secret_marker"]
    });
    const serialized = JSON.stringify(result);

    expect(result.actualStatus).toBe("blocked");
    expect(result.failureCategories).toContain("raw_content_leak");
    expect(result.failureCategories).toContain("reasoning_content_leak");
    expect(result.failureCategories).toContain("secret_marker");
    expect(serialized).not.toContain("model prompt text");
    expect(serialized).not.toContain("model response text");
    expect(serialized).not.toContain("reasoning text");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
  });

  it("returns deterministic hashes with injected ids", async () => {
    const cases = (await evaluationCases()).slice(0, 2);
    const first = await runLiveProposalOfflineEvaluation({
      evaluatorMode: "offline_fake",
      cases,
      createdAt: "2026-06-29T00:00:00.000Z",
      idGenerator: () => "offline-eval-fixed"
    });
    const second = await runLiveProposalOfflineEvaluation({
      evaluatorMode: "offline_fake",
      cases,
      createdAt: "2026-06-29T00:00:00.000Z",
      idGenerator: () => "offline-eval-fixed"
    });

    expect(first.reportHash).toBe(second.reportHash);
    expect(first.cases.map((item) => item.caseHash)).toEqual(
      second.cases.map((item) => item.caseHash)
    );
  });

  it("validates blocked offline evaluation input safely", () => {
    const findings = validateLiveProposalOfflineEvaluationInput({
      evaluatorMode: "offline_dry",
      cases: [],
      dryClient: undefined
    });

    expect(findings.map((finding) => finding.code)).toContain(
      "MISSING_DRY_CLIENT"
    );
  });
});
