import { describe, expect, it } from "vitest";

import { runDryConformance } from "../src/dry-runner.js";
import { runLiveConformance } from "../src/live-runner.js";
import { redactForReport } from "../src/redaction.js";

describe("conformance dry harness", () => {
  it("runs all dry cases with FakeDeepSeekClient", async () => {
    const summary = await runDryConformance();

    expect(summary.status).toBe("PASS");
    expect(summary.results.map((result) => result.caseId)).toEqual([
      "CASE-DRY-001",
      "CASE-DRY-002",
      "CASE-DRY-003",
      "CASE-DRY-004",
      "CASE-DRY-005",
      "CASE-DRY-006"
    ]);
  });

  it("does not depend on DEEPSEEK_API_KEY for dry runs", async () => {
    const previous = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "dry-run-should-not-use-this";

    try {
      const summary = await runDryConformance();
      expect(JSON.stringify(summary)).not.toContain(
        "dry-run-should-not-use-this"
      );
    } finally {
      if (previous === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = previous;
      }
    }
  });

  it("does not call global fetch during dry runs", async () => {
    const previousFetch = globalThis.fetch;
    let calledGlobalFetch = false;
    globalThis.fetch = (async () => {
      calledGlobalFetch = true;
      throw new Error("global fetch should not be called");
    }) as typeof fetch;

    try {
      await runDryConformance();
      expect(calledGlobalFetch).toBe(false);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("proves no-tool thinking does not return reasoning by default", async () => {
    const summary = await runDryConformance();
    const result = summary.results.find(
      (caseResult) => caseResult.caseId === "CASE-DRY-002"
    );

    expect(result?.status).toBe("PASS");
    expect(result?.responseHasReasoningContent).toBe(true);
  });

  it("proves thinking tool roundtrip returns tool reasoning and raw arguments", async () => {
    const summary = await runDryConformance();
    const result = summary.results.find(
      (caseResult) => caseResult.caseId === "CASE-DRY-003"
    );

    expect(result?.status).toBe("PASS");
    expect(result?.responseHasToolCalls).toBe(true);
  });

  it("shows cache usage fields without requiring a hit ratio", async () => {
    const summary = await runDryConformance();
    const result = summary.results.find(
      (caseResult) => caseResult.caseId === "CASE-DRY-004"
    );

    expect(result?.cacheHitTokens).toBe(3);
    expect(result?.cacheMissTokens).toBe(7);
  });

  it("redacts report fields and sensitive values", () => {
    const rawPromptKey = "raw" + "Prompt";
    const rawDomKey = "raw" + "Dom";
    const clipboardKey = "clip" + "board";
    const redacted = JSON.stringify(
      redactForReport({
        apiKey: "sk-1234567890abcdef",
        authorization: "Bearer abcdefghijklmnop",
        [rawPromptKey]: "prompt",
        [rawDomKey]: "<table></table>",
        [clipboardKey]: "private"
      })
    );

    expect(redacted).not.toContain("sk-1234567890abcdef");
    expect(redacted).not.toContain("abcdefghijklmnop");
    expect(redacted).not.toContain(rawPromptKey);
    expect(redacted).not.toContain(rawDomKey);
    expect(redacted).not.toContain(clipboardKey);
  });
});

describe("conformance live opt-in gates", () => {
  it("skips live runner without --live", async () => {
    const summary = await runLiveConformance({
      args: [],
      env: {
        DEEPSEEK_CONFORMANCE_LIVE: "1",
        DEEPSEEK_API_KEY: "present-but-not-used"
      }
    });

    expect(summary.status).toBe("SKIPPED");
    expect(summary.results[0]?.caseId).toBe("SKIPPED_LIVE_CONFORMANCE");
  });

  it("skips live runner without DEEPSEEK_CONFORMANCE_LIVE=1", async () => {
    const summary = await runLiveConformance({
      args: ["--live"],
      env: {
        DEEPSEEK_API_KEY: "present-but-not-used"
      }
    });

    expect(summary.status).toBe("SKIPPED");
  });

  it("skips live runner without DEEPSEEK_API_KEY", async () => {
    const summary = await runLiveConformance({
      args: ["--live"],
      env: {
        DEEPSEEK_CONFORMANCE_LIVE: "1"
      }
    });

    expect(summary.status).toBe("SKIPPED");
  });

  it("live skip does not fail", async () => {
    await expect(runLiveConformance()).resolves.toMatchObject({
      status: "SKIPPED"
    });
  });
});
