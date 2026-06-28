import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createFakePatchProposalModel,
  runPatchProposalHarness,
  runPatchProposalHarnessCase,
  summarizePatchProposalHarnessReport,
  type PatchProposalHarnessCase
} from "../src/index.js";

const fixturesDir = path.join(
  import.meta.dirname,
  "fixtures",
  "model-patch-proposals",
  "harness"
);

async function readCase(name: string): Promise<PatchProposalHarnessCase> {
  const text = await readFile(path.join(fixturesDir, name), "utf8");
  return JSON.parse(text) as PatchProposalHarnessCase;
}

function expectAllExecutionFlagsFalse(value: {
  readiness: Record<string, boolean>;
}): void {
  expect(value.readiness).toMatchObject({
    canCallLiveModel: false,
    canReadApiKey: false,
    canUseNetwork: false,
    canApplyPatch: false,
    canWriteFilesystem: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canWriteEventStore: false,
    appCanExecute: false
  });
}

describe("offline fake model patch proposal harness", () => {
  it("passes a safe fake response through schema validation without blockers", async () => {
    const result = await runPatchProposalHarnessCase(
      await readCase("case-safe-basic.json")
    );

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.proposalId).toBe("model-proposal-harness-safe-basic");
    expect(result.normalizedHash).toHaveLength(64);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "SCHEMA_EVIDENCE_REFS_SUMMARY_ONLY"
    );
    expectAllExecutionFlagsFalse(result);
  });

  it("passes a JSON string fake response through the same offline harness", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const result = await runPatchProposalHarnessCase({
      ...safeCase,
      caseId: "safe-json-string",
      fakeResponse: JSON.stringify(safeCase.fakeResponse)
    });

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.proposalId).toBe("model-proposal-harness-safe-basic");
  });

  it("returns warning when contentDraft is present but not written", async () => {
    const result = await runPatchProposalHarnessCase(
      await readCase("case-warning-content-draft.json")
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "SCHEMA_CONTENT_DRAFT_PRESENT"
    );
    expect(serialized).not.toContain("Offline fixture draft text");
  });

  it("blocks unsafe paths, secret markers, execution fields, and malformed JSON", async () => {
    const caseNames = [
      "case-rejected-unsafe-path.json",
      "case-rejected-secret-marker.json",
      "case-rejected-execution-field.json",
      "case-malformed-json.json"
    ];

    for (const caseName of caseNames) {
      const result = await runPatchProposalHarnessCase(
        await readCase(caseName)
      );

      expect(result.status, caseName).toBe("blocked");
      expect(result.blockerCount, caseName).toBeGreaterThan(0);
      expectAllExecutionFlagsFalse(result);
    }
  });

  it("aggregates harness report counts and keeps deterministic hashes", async () => {
    const cases = await Promise.all([
      readCase("case-safe-basic.json"),
      readCase("case-warning-content-draft.json"),
      readCase("case-rejected-unsafe-path.json")
    ]);
    const first = await runPatchProposalHarness(cases);
    const second = await runPatchProposalHarness(cases);
    const summary = summarizePatchProposalHarnessReport(first);

    expect(first.status).toBe("blocked");
    expect(first.caseCount).toBe(3);
    expect(first.warningCount).toBeGreaterThan(0);
    expect(first.blocked).toBe(1);
    expect(first.reportHash).toBe(second.reportHash);
    expect(first.reportId).toBe(second.reportId);
    expect(summary.caseSummaries).toHaveLength(3);
    expectAllExecutionFlagsFalse(first);
  });

  it("does not read API key environment sentinels", async () => {
    const secret = "sk-test1234567890abcdef";
    const previousDeepSeekKey = process.env.DEEPSEEK_API_KEY;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;

    process.env.DEEPSEEK_API_KEY = secret;
    process.env.OPENAI_API_KEY = secret;
    try {
      const result = await runPatchProposalHarnessCase(
        await readCase("case-safe-basic.json")
      );

      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(secret);
      expect(serialized).not.toContain("DEEPSEEK_API_KEY");
      expect(serialized).not.toContain("OPENAI_API_KEY");
      expect(result.readiness.canReadApiKey).toBe(false);
    } finally {
      if (previousDeepSeekKey === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = previousDeepSeekKey;
      }
      if (previousOpenAiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = previousOpenAiKey;
      }
    }
  });

  it("does not call global fetch while running fake model cases", async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network should not be used by fake harness");
    }) as typeof fetch;
    try {
      const result = await runPatchProposalHarnessCase(
        await readCase("case-safe-basic.json")
      );

      expect(result.blockerCount).toBe(0);
      expect(result.readiness.canUseNetwork).toBe(false);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("uses deterministic fake model responses without DeepSeek client imports", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const model = createFakePatchProposalModel([
      {
        caseId: safeCase.caseId,
        output: safeCase.fakeResponse
      }
    ]);
    const result = await runPatchProposalHarnessCase({
      ...safeCase,
      fakeModel: model
    });
    const source = await readFile(
      path.join(
        import.meta.dirname,
        "..",
        "src",
        "models",
        "patch-proposal-fake-harness.ts"
      ),
      "utf8"
    );

    expect(result.blockerCount).toBe(0);
    expect(source).not.toMatch(/deepseek.*client/i);
    expect(source).not.toContain("globalThis.fetch");
    expect(source).not.toContain("process.env");
  });

  it("blocks unsafe request fields before fake model output is parsed", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const result = await runPatchProposalHarnessCase({
      ...safeCase,
      rawSource: "forbidden request field"
    } as unknown as PatchProposalHarnessCase);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_REQUEST_FIELD"
    );
  });

  it("blocks fake model errors containing secret-like content without retaining it", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const secret = "sk-test1234567890abcdef";
    const result = await runPatchProposalHarnessCase({
      ...safeCase,
      expectedStatus: "blocked",
      fakeModel: () => {
        throw new Error(`synthetic unsafe error ${secret}`);
      }
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["FAKE_MODEL_THROW", "FAKE_MODEL_API_KEY_MARKER"])
    );
    expect(serialized).not.toContain(secret);
  });

  it("keeps output reports summary-only with no raw content or API key", async () => {
    const report = await runPatchProposalHarness([
      await readCase("case-warning-content-draft.json"),
      await readCase("case-rejected-secret-marker.json")
    ]);
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("Offline fixture draft text");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPrompt");
    expectAllExecutionFlagsFalse(report);
  });
});
