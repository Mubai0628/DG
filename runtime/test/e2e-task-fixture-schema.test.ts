import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  parseEndToEndCodingTaskFixture,
  summarizeEndToEndCodingTaskFixture,
  validateEndToEndCodingTaskFixture,
  type EndToEndCodingTaskFixtureValidationResult
} from "../src/index.js";

const fixtureRoot = new URL("./fixtures/e2e-coding-tasks/", import.meta.url);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

function findingCodes(
  result: EndToEndCodingTaskFixtureValidationResult
): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(
  result: EndToEndCodingTaskFixtureValidationResult
): void {
  expect(result.readiness).toMatchObject({
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

describe("end-to-end coding task fixture schema", () => {
  it("parses a safe docs create fixture", async () => {
    const fixture = await readFixture("docs-create-smoke.json");
    const result = parseEndToEndCodingTaskFixture(fixture);

    expect(result.status).toBe("parsed");
    expect(result.fixture?.taskId).toBe("e2e-docs-create-smoke");
    expect(result.summary.allowedPathCount).toBe(1);
    expect(result.summary.expectedEventCount).toBe(2);
    expect(result.readiness.canEnterOrchestrator).toBe(true);
    expectNoExecution(result);
  });

  it("parses a safe docs update fixture and summarizes it", async () => {
    const fixture = await readFixture("docs-update-verify-smoke.json");
    const result = validateEndToEndCodingTaskFixture(fixture);

    expect(result.status).toBe("parsed");
    expect(result.fixture?.objective.intent).toBe("docs_update");
    expect(result.fixture?.expectedArtifacts.length).toBeGreaterThanOrEqual(5);
    expect(result.fixture).toBeDefined();

    const summary = summarizeEndToEndCodingTaskFixture(result.fixture!);
    expect(summary.summaryOnly).toBe(true);
    expect(summary.expectedStatus).toBe("pass");
    expect(summary.hash).toBe(result.fixture?.fixtureHash);
    expectNoExecution(result);
  });

  it("parses JSON string input", async () => {
    const fixture = await readFixture("docs-create-smoke.json");
    const result = parseEndToEndCodingTaskFixture(JSON.stringify(fixture));

    expect(result.status).toBe("parsed");
    expect(result.summary.taskId).toBe("e2e-docs-create-smoke");
    expectNoExecution(result);
  });

  it("blocks unsafe path fixtures", async () => {
    const fixture = await readFixture("blocked-unsafe-path.json");
    const result = validateEndToEndCodingTaskFixture(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("PARENT_TRAVERSAL_REJECTED");
    expect(result.fixture).toBeUndefined();
    expect(result.readiness.canEnterOrchestrator).toBe(false);
    expectNoExecution(result);
  });

  it("blocks secret markers without echoing the marker", async () => {
    const fixture = await readFixture("blocked-secret-marker.json");
    const result = validateEndToEndCodingTaskFixture(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("API_KEY_MARKER");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expectNoExecution(result);
  });

  it("blocks raw fields", async () => {
    const fixture = {
      ...(await readFixture("docs-create-smoke.json")),
      rawPrompt: "Synthetic raw prompt text must not persist.",
      rawResponse: "Synthetic raw response text must not persist.",
      reasoning_content: "Synthetic reasoning text must not persist."
    };
    const result = validateEndToEndCodingTaskFixture(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("RAW_RESPONSE_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("REASONING_CONTENT_FIELD_REJECTED");
    expect(serialized).not.toContain("Synthetic raw prompt text");
    expect(serialized).not.toContain("Synthetic raw response text");
    expect(serialized).not.toContain("Synthetic reasoning text");
    expectNoExecution(result);
  });

  it("blocks missing expected events", async () => {
    const fixture = {
      ...(await readFixture("docs-create-smoke.json")),
      expectedEvents: []
    };
    const result = validateEndToEndCodingTaskFixture(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("MISSING_EXPECTED_EVENTS");
    expectNoExecution(result);
  });

  it("blocks duplicate task IDs where a batch is supplied", async () => {
    const fixture = await readFixture("docs-create-smoke.json");
    const result = validateEndToEndCodingTaskFixture([fixture, fixture]);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("DUPLICATE_TASK_ID");
    expectNoExecution(result);
  });

  it("blocks execution fields", async () => {
    const fixture = {
      ...(await readFixture("docs-create-smoke.json")),
      applyNow: true,
      gitCommand: "status"
    };
    const result = validateEndToEndCodingTaskFixture(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("EXECUTION_FIELD_REJECTED");
    expectNoExecution(result);
  });

  it("keeps blocked output summary-only", async () => {
    const fixture = {
      ...(await readFixture("docs-create-smoke.json")),
      rawPrompt: "model prompt text",
      objectiveSummary: "sk-test1234567890abcdef"
    };
    const result = validateEndToEndCodingTaskFixture(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(serialized).not.toContain("model prompt text");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(result.summary.summaryOnly).toBe(true);
    expect(result.summary.allowedPathCount).toBe(0);
    expectNoExecution(result);
  });

  it("keeps every execution readiness flag false", async () => {
    const fixture = await readFixture("verification-failure-rollback.json");
    const result = validateEndToEndCodingTaskFixture(fixture);

    expect(result.status).toBe("parsed");
    expect(result.fixture?.expectedFlow.rollbackRequired).toBe(true);
    expect(result.readiness.canEnterOrchestrator).toBe(true);
    expectNoExecution(result);
  });
});
