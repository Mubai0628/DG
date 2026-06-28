import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildPatchProposalDryRequest,
  runPatchProposalDryAdapter,
  summarizePatchProposalDryAdapterResult,
  validatePatchProposalDryAdapterInput,
  type PatchProposalDryAdapterInput,
  type PatchProposalDryModelResponse,
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

function baseInput(
  content: PatchProposalDryModelResponse["content"]
): PatchProposalDryAdapterInput {
  return {
    objectiveSummary: "Generate a summary-only patch proposal draft.",
    intent: "Create a model patch proposal draft for later validation.",
    modelProfileId: "deepseek-v4-pro",
    workspaceIndexRefs: ["workspace-index-summary"],
    contextAssemblyRefs: ["context-assembly-preview"],
    userWorkspaceReadinessRefs: ["promotion-readiness-summary"],
    allowedPathRefs: ["docs/app-shell-preview.md"],
    forbiddenPathPolicy: [".git", ".env", "node_modules", "dist", "target"],
    evidenceRefs: ["workspace-index-summary", "context-assembly-preview"],
    taskContractHash: "task-contract-hash",
    noCompressRef: "no-compress-safety-ref",
    dryClient: {
      generatePatchProposal: () => ({
        content,
        modelProfileId: "deepseek-v4-pro",
        usageSummary: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30
        }
      })
    }
  };
}

function expectExecutionFlagsFalse(value: {
  readiness: Record<string, boolean>;
}): void {
  expect(value.readiness).toMatchObject({
    canApplyPatch: false,
    canWriteFilesystem: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canWriteEventStore: false,
    appCanExecute: false
  });
}

describe("patch proposal dry adapter", () => {
  it("builds a summary-only request without tools or tool_choice", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const request = buildPatchProposalDryRequest(baseInput(safeCase.fakeResponse));
    const serialized = JSON.stringify(request);

    expect(request.responseFormat).toBe("model_patch_proposal");
    expect(request.noToolChoice).toBe(true);
    expect(request.noExecution).toBe(true);
    expect(request.summaryOnly).toBe(true);
    expect(request.safetyInstructions).toMatchObject({
      noFileWrite: true,
      noApply: true,
      noRollback: true,
      noGitShell: true,
      noRawSecrets: true,
      mustReturnJson: true
    });
    expect(serialized).not.toContain("tool_choice");
    expect(serialized).not.toContain("tools");
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawPrompt");
  });

  it("generates a proposal from a safe injected dry client response", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const result = await runPatchProposalDryAdapter(baseInput(safeCase.fakeResponse));
    const summary = summarizePatchProposalDryAdapterResult(result);

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.proposalId).toBe("model-proposal-harness-safe-basic");
    expect(result.requestHash).toHaveLength(64);
    expect(result.responseHash).toHaveLength(64);
    expect(result.proposalValidation?.normalizedHash).toHaveLength(64);
    expect(result.proposalSummary?.operationCount).toBe(2);
    expect(result.readiness.canEnterPatchProposalPreview).toBe(true);
    expect(summary.proposalId).toBe("model-proposal-harness-safe-basic");
    expectExecutionFlagsFalse(result);
  });

  it("generates a proposal from a JSON string dry response", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const result = await runPatchProposalDryAdapter(
      baseInput(JSON.stringify(safeCase.fakeResponse))
    );

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.proposalId).toBe("model-proposal-harness-safe-basic");
  });

  it("blocks missing dry client and missing objective summary", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const missingClient = {
      ...baseInput(safeCase.fakeResponse),
      dryClient: undefined
    };
    const missingObjective = {
      ...baseInput(safeCase.fakeResponse),
      objectiveSummary: ""
    };

    expect(
      validatePatchProposalDryAdapterInput(missingClient).map(
        (finding) => finding.code
      )
    ).toContain("MISSING_DRY_CLIENT");
    const result = await runPatchProposalDryAdapter(missingObjective);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "MISSING_OBJECTIVE_SUMMARY"
    );
  });

  it("blocks raw forbidden input before calling the dry client", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    let called = false;
    const result = await runPatchProposalDryAdapter({
      ...baseInput(safeCase.fakeResponse),
      rawSource: "forbidden raw field",
      dryClient: {
        generatePatchProposal: () => {
          called = true;
          return {
            content: safeCase.fakeResponse
          };
        }
      }
    } as unknown as PatchProposalDryAdapterInput);

    expect(result.status).toBe("blocked");
    expect(called).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_INPUT_FIELD"
    );
  });

  it("blocks unsafe path, secret marker, execution field, and malformed responses", async () => {
    const caseNames = [
      "case-rejected-unsafe-path.json",
      "case-rejected-secret-marker.json",
      "case-rejected-execution-field.json",
      "case-malformed-json.json"
    ];

    for (const caseName of caseNames) {
      const harnessCase = await readCase(caseName);
      const result = await runPatchProposalDryAdapter(
        baseInput(harnessCase.fakeResponse)
      );

      expect(result.status, caseName).toBe("blocked");
      expect(result.blockerCount, caseName).toBeGreaterThan(0);
      expectExecutionFlagsFalse(result);
    }
  });

  it("blocks top-level execution fields returned by the dry client", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const result = await runPatchProposalDryAdapter({
      ...baseInput(safeCase.fakeResponse),
      dryClient: {
        generatePatchProposal: () =>
          ({
            content: safeCase.fakeResponse,
            command: "forbidden"
          }) as unknown as PatchProposalDryModelResponse
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_RESPONSE_FIELD"
    );
  });

  it("redacts and blocks dry client errors with secret-like content", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const secret = "sk-test1234567890abcdef";
    const result = await runPatchProposalDryAdapter({
      ...baseInput(safeCase.fakeResponse),
      dryClient: {
        generatePatchProposal: () => {
          throw new Error(`synthetic dry client error ${secret}`);
        }
      }
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["DRY_CLIENT_THROW", "DRY_CLIENT_API_KEY_MARKER"])
    );
    expect(serialized).not.toContain(secret);
  });

  it("drops reasoningContent and keeps only safe usage numbers", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const result = await runPatchProposalDryAdapter({
      ...baseInput(safeCase.fakeResponse),
      dryClient: {
        generatePatchProposal: () => ({
          content: safeCase.fakeResponse,
          reasoningContent: "private dry reasoning should never persist",
          usageSummary: {
            inputTokens: 1,
            outputTokens: 2,
            totalTokens: 3
          }
        })
      }
    });
    const serialized = JSON.stringify(result);

    expect(result.droppedReasoningContent).toBe(true);
    expect(result.usageSummary).toEqual({
      inputTokens: 1,
      outputTokens: 2,
      totalTokens: 3
    });
    expect(result.findings.map((finding) => finding.code)).toContain(
      "REASONING_CONTENT_DROPPED"
    );
    expect(serialized).not.toContain("private dry reasoning");
  });

  it("omits tool_choice even when a thinking mode flag is supplied", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const request = buildPatchProposalDryRequest({
      ...baseInput(safeCase.fakeResponse),
      thinkingMode: "summary_only"
    } as unknown as PatchProposalDryAdapterInput);
    const serialized = JSON.stringify(request);

    expect(serialized).not.toContain("tool_choice");
    expect(serialized).not.toContain("tools");
  });

  it("does not call global fetch while running dry generation", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network should not be used by dry adapter");
    }) as typeof fetch;
    try {
      const result = await runPatchProposalDryAdapter(baseInput(safeCase.fakeResponse));

      expect(result.blockerCount).toBe(0);
      expect(result.responseHash).toHaveLength(64);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("does not read API key environment sentinels", async () => {
    const safeCase = await readCase("case-safe-basic.json");
    const secret = "sk-test1234567890abcdef";
    const previousDeepSeekKey = process.env.DEEPSEEK_API_KEY;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;

    process.env.DEEPSEEK_API_KEY = secret;
    process.env.OPENAI_API_KEY = secret;
    try {
      const result = await runPatchProposalDryAdapter(baseInput(safeCase.fakeResponse));
      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain(secret);
      expect(serialized).not.toContain("DEEPSEEK_API_KEY");
      expect(serialized).not.toContain("OPENAI_API_KEY");
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

  it("does not import or construct a live DeepSeek client", async () => {
    const source = await readFile(
      path.join(
        import.meta.dirname,
        "..",
        "src",
        "models",
        "patch-proposal-dry-adapter.ts"
      ),
      "utf8"
    );

    expect(source).not.toMatch(/DeepSeekClient/);
    expect(source).not.toMatch(/deepseek.*client/i);
    expect(source).not.toContain("globalThis.fetch");
    expect(source).not.toContain("process.env");
  });

  it("keeps dry adapter output summary-only", async () => {
    const contentDraftCase = await readCase("case-warning-content-draft.json");
    const secretCase = await readCase("case-rejected-secret-marker.json");
    const contentDraftResult = await runPatchProposalDryAdapter(
      baseInput(contentDraftCase.fakeResponse)
    );
    const secretResult = await runPatchProposalDryAdapter(
      baseInput(secretCase.fakeResponse)
    );
    const serialized = JSON.stringify({ contentDraftResult, secretResult });

    expect(serialized).not.toContain("Offline fixture draft text");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPrompt");
    expectExecutionFlagsFalse(contentDraftResult);
    expectExecutionFlagsFalse(secretResult);
  });
});
