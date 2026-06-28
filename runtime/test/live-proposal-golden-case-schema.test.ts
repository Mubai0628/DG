import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  normalizeLiveProposalGoldenCase,
  parseLiveProposalGoldenCase,
  summarizeLiveProposalGoldenCase,
  validateLiveProposalGoldenCase,
  type LiveProposalGoldenCaseValidationResult
} from "../src/index.js";

const fixtureRoot = new URL(
  "./fixtures/live-proposal-golden-cases/",
  import.meta.url
);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

function findingCodes(
  result: LiveProposalGoldenCaseValidationResult
): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(
  result: LiveProposalGoldenCaseValidationResult
): void {
  expect(result.readiness).toMatchObject({
    canEnterLiveEvaluation: false,
    canCallLiveModel: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("live proposal golden case schema", () => {
  it("parses the safe docs smoke fixture", async () => {
    const fixture = await readFixture("safe-docs-smoke.json");
    const result = parseLiveProposalGoldenCase(fixture);

    expect(result.status).toBe("parsed");
    expect(result.goldenCase?.caseId).toBe("golden-docs-smoke");
    expect(result.summary.workspaceRefCount).toBe(1);
    expect(result.summary.expectedStatus).toBe("pass");
    expect(result.readiness.canEnterOfflineEvaluation).toBe(true);
    expectNoExecution(result);
  });

  it("parses the safe code standard fixture", async () => {
    const fixture = await readFixture("safe-code-standard.json");
    const result = validateLiveProposalGoldenCase(fixture);
    const normalized = normalizeLiveProposalGoldenCase(fixture);
    const summary = summarizeLiveProposalGoldenCase(normalized);

    expect(result.status).toBe("parsed");
    expect(normalized.intent).toBe("code_change");
    expect(normalized.workspaceRefCount).toBe(2);
    expect(summary.expectedMetricSummary.metricIds).toContain(
      "test_coverage_hint"
    );
    expect(findingCodes(result)).not.toContain(
      "CODE_CHANGE_WITHOUT_TEST_SUMMARY"
    );
    expectNoExecution(result);
  });

  it("parses JSON string input", async () => {
    const fixture = await readFixture("safe-docs-smoke.json");
    const result = parseLiveProposalGoldenCase(JSON.stringify(fixture));

    expect(result.status).toBe("parsed");
    expect(result.summary.caseId).toBe("golden-docs-smoke");
    expectNoExecution(result);
  });

  it("generates a deterministic case id when missing", async () => {
    const fixture = await readFixture("safe-docs-smoke.json");
    delete fixture.caseId;

    const first = validateLiveProposalGoldenCase(fixture, {
      createdAt: "2026-06-29T00:00:00.000Z",
      idGenerator: () => "generated-golden-case"
    });
    const second = validateLiveProposalGoldenCase(fixture, {
      createdAt: "2026-06-29T00:00:00.000Z",
      idGenerator: () => "generated-golden-case"
    });

    expect(first.status).toBe("warning");
    expect(findingCodes(first)).toContain("MISSING_CASE_ID");
    expect(first.goldenCase?.caseId).toBe("generated-golden-case");
    expect(first.goldenCase?.caseHash).toBe(second.goldenCase?.caseHash);
    expect(first.normalizedHash).toBe(second.normalizedHash);
    expectNoExecution(first);
  });

  it("warns when a code-change fixture lacks test summary evidence", async () => {
    const fixture = await readFixture("warning-missing-tests.json");
    const result = validateLiveProposalGoldenCase(fixture);

    expect(result.status).toBe("warning");
    expect(findingCodes(result)).toContain("CODE_CHANGE_WITHOUT_TEST_SUMMARY");
    expect(result.readiness.canEnterOfflineEvaluation).toBe(true);
    expectNoExecution(result);
  });

  it("blocks unsafe paths", async () => {
    const fixture = await readFixture("blocked-unsafe-path.json");
    const result = validateLiveProposalGoldenCase(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("PARENT_TRAVERSAL_REJECTED");
    expect(result.goldenCase).toBeUndefined();
    expect(result.readiness.canEnterOfflineEvaluation).toBe(false);
    expectNoExecution(result);
  });

  it("blocks secret markers", async () => {
    const fixture = await readFixture("blocked-secret-marker.json");
    const result = validateLiveProposalGoldenCase(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("API_KEY_MARKER");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expectNoExecution(result);
  });

  it("blocks rawPrompt and rawResponse fields", async () => {
    const rawPrompt = await readFixture("blocked-raw-prompt.json");
    const rawResponse = {
      ...(await readFixture("safe-docs-smoke.json")),
      rawResponse: "Synthetic raw response text must not persist."
    };
    const promptResult = validateLiveProposalGoldenCase(rawPrompt);
    const responseResult = validateLiveProposalGoldenCase(rawResponse);
    const serialized = JSON.stringify({ promptResult, responseResult });

    expect(promptResult.status).toBe("blocked");
    expect(responseResult.status).toBe("blocked");
    expect(findingCodes(promptResult)).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(findingCodes(responseResult)).toContain(
      "RAW_RESPONSE_FIELD_REJECTED"
    );
    expect(serialized).not.toContain(
      "This synthetic raw prompt text must not be persisted."
    );
    expect(serialized).not.toContain(
      "Synthetic raw response text must not persist."
    );
    expectNoExecution(promptResult);
    expectNoExecution(responseResult);
  });

  it("blocks reasoning_content fields", async () => {
    const fixture = await readFixture("blocked-reasoning-content.json");
    const result = validateLiveProposalGoldenCase(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("REASONING_CONTENT_FIELD_REJECTED");
    expect(serialized).not.toContain(
      "Synthetic reasoning text must not be persisted."
    );
    expectNoExecution(result);
  });

  it("blocks forbidden execution fields", async () => {
    const fixture = await readFixture("adversarial-forbidden-field.json");
    const result = validateLiveProposalGoldenCase(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("EXECUTION_FIELD_REJECTED");
    expectNoExecution(result);
  });

  it("blocks duplicate refs", async () => {
    const fixture = await readFixture("safe-docs-smoke.json");
    fixture.evidenceRefs = [
      {
        refId: "workspace-docs-schema",
        kind: "manual_note",
        summary: "Duplicate ref id should block."
      }
    ];
    const result = validateLiveProposalGoldenCase(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("DUPLICATE_REF_ID");
    expectNoExecution(result);
  });

  it("blocks when expectedSummaryOnly is false", async () => {
    const fixture = await readFixture("safe-docs-smoke.json");
    fixture.expectedOutcome = {
      ...(fixture.expectedOutcome as Record<string, unknown>),
      expectedSummaryOnly: false
    };
    const result = validateLiveProposalGoldenCase(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("EXPECTED_SUMMARY_ONLY_FALSE");
    expectNoExecution(result);
  });

  it("blocks unknown failure categories", async () => {
    const fixture = await readFixture("safe-docs-smoke.json");
    fixture.expectedFailureCategories = ["unexpected_failure"];
    const result = validateLiveProposalGoldenCase(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("UNKNOWN_FAILURE_CATEGORY");
    expectNoExecution(result);
  });

  it("warns when expected changed paths are outside allowed path refs", async () => {
    const fixture = await readFixture("safe-docs-smoke.json");
    fixture.expectedOutcome = {
      ...(fixture.expectedOutcome as Record<string, unknown>),
      expectedChangedPaths: ["docs/not-in-allowed-paths.md"]
    };
    const result = validateLiveProposalGoldenCase(fixture);

    expect(result.status).toBe("warning");
    expect(findingCodes(result)).toContain("EXPECTED_CHANGED_PATH_NOT_ALLOWED");
    expect(result.readiness.canEnterOfflineEvaluation).toBe(true);
    expectNoExecution(result);
  });

  it("keeps blocked output summary-only", async () => {
    const fixture = {
      ...(await readFixture("safe-docs-smoke.json")),
      rawPrompt: "model prompt text",
      rawResponse: "model response text",
      objectiveSummary: "sk-test1234567890abcdef"
    };
    const result = validateLiveProposalGoldenCase(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(serialized).not.toContain("model prompt text");
    expect(serialized).not.toContain("model response text");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(result.summary.workspaceRefCount).toBe(0);
    expectNoExecution(result);
  });

  it("keeps every execution readiness flag false", async () => {
    const fixture = await readFixture("safe-code-standard.json");
    const result = validateLiveProposalGoldenCase(fixture);

    expect(result.readiness.canEnterOfflineEvaluation).toBe(true);
    expectNoExecution(result);
  });
});
