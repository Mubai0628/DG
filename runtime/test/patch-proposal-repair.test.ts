import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  repairModelPatchProposalDraft,
  runPatchProposalDryAdapter,
  summarizePatchProposalRepairResult,
  validatePatchProposalRepairInput,
  type PatchProposalRepairInput
} from "../src/index.js";

const repairFixturesDir = path.join(
  import.meta.dirname,
  "fixtures",
  "model-patch-proposals",
  "repair"
);

const harnessFixturesDir = path.join(
  import.meta.dirname,
  "fixtures",
  "model-patch-proposals",
  "harness"
);

const schemaFixturesDir = path.join(
  import.meta.dirname,
  "fixtures",
  "model-patch-proposals"
);

async function readTextFixture(name: string): Promise<string> {
  return readFile(path.join(repairFixturesDir, name), "utf8");
}

async function readJsonFixture(name: string): Promise<Record<string, unknown>> {
  const text = await readFile(path.join(repairFixturesDir, name), "utf8");
  return JSON.parse(text) as Record<string, unknown>;
}

async function readHarnessFakeResponse(name: string): Promise<unknown> {
  const text = await readFile(path.join(harnessFixturesDir, name), "utf8");
  const fixture = JSON.parse(text) as { fakeResponse: unknown };
  return fixture.fakeResponse;
}

async function readSchemaFixture(
  name: string
): Promise<Record<string, unknown>> {
  const text = await readFile(path.join(schemaFixturesDir, name), "utf8");
  return JSON.parse(text) as Record<string, unknown>;
}

function repairInput(rawCandidate: unknown): PatchProposalRepairInput {
  return {
    rawCandidate,
    sourceKind: "fixture",
    maxAttempts: 8
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

function operationKinds(result: {
  operations: Array<{ kind: string }>;
}): string[] {
  return result.operations.map((operation) => operation.kind);
}

describe("patch proposal repair loop", () => {
  it("passes an unchanged valid proposal without repair operations", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readSchemaFixture("safe-basic.json"))
    );

    expect(result.status).toBe("unchanged_valid");
    expect(result.blockerCount).toBe(0);
    expect(result.operations).toEqual([]);
    expect(result.proposalSummary?.proposalId).toBe(
      "model-proposal-safe-basic"
    );
    expect(result.readiness.canEnterPatchProposalPreview).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it("repairs markdown fenced JSON", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readTextFixture("markdown-fenced-json.txt"))
    );

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(operationKinds(result)).toEqual(
      expect.arrayContaining([
        "strip_markdown_fence",
        "generate_missing_proposal_id",
        "generate_missing_operation_ids",
        "derive_path_summaries"
      ])
    );
    expect(result.proposalSummary?.proposalId).toMatch(
      /^model-proposal-repaired-/
    );
  });

  it("repairs leading and trailing explanatory text around JSON", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readTextFixture("json-with-leading-trailing-text.txt"))
    );

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(operationKinds(result)).toEqual(
      expect.arrayContaining(["extract_json_object", "trim_trailing_noise"])
    );
    expect(result.proposalSummary?.proposalId).toBe(
      "model-proposal-leading-trailing"
    );
  });

  it("generates missing proposal and operation ids deterministically", async () => {
    const input = repairInput(await readJsonFixture("missing-ids.json"));
    const first = repairModelPatchProposalDraft(input);
    const second = repairModelPatchProposalDraft(input);
    const summary = summarizePatchProposalRepairResult(first);

    expect(first.status).toBe("warning");
    expect(first.blockerCount).toBe(0);
    expect(operationKinds(first)).toEqual(
      expect.arrayContaining([
        "generate_missing_proposal_id",
        "generate_missing_operation_ids"
      ])
    );
    expect(first.repairId).toBe(second.repairId);
    expect(first.repairedHash).toBe(second.repairedHash);
    expect(summary.operationKinds).toContain("generate_missing_proposal_id");
  });

  it("derives missing path summaries", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readJsonFixture("missing-path-summaries.json"))
    );

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(operationKinds(result)).toContain("derive_path_summaries");
    expect(result.proposalSummary?.pathSummaries).toContain(
      "documentation:docs/path-summary.md"
    );
  });

  it("normalizes safe changeKind casing", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readJsonFixture("change-kind-case.json"))
    );

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(operationKinds(result)).toContain("normalize_change_kind_case");
    expect(result.proposalSummary?.pathSummaries).toContain(
      "documentation:docs/change-kind-case.md"
    );
  });

  it("repairs a single missing trailing brace", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readTextFixture("truncated-safe-json.txt"))
    );

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(operationKinds(result)).toContain("close_truncated_brace");
    expect(result.proposalSummary?.proposalId).toBe(
      "model-proposal-truncated-safe"
    );
  });

  it("blocks unrecoverable malformed JSON", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readTextFixture("malformed-unrecoverable.txt"))
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "INVALID_JSON_UNRECOVERABLE"
    );
  });

  it("blocks unsafe path without repairing it", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readJsonFixture("unsafe-path.json"))
    );

    expect(result.status).toBe("blocked");
    expect(operationKinds(result)).toContain("reject_unsafe_path");
    expect(operationKinds(result)).not.toContain("derive_path_summaries");
  });

  it("blocks execution fields without removing them", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readJsonFixture("execution-field.json"))
    );

    expect(result.status).toBe("blocked");
    expect(operationKinds(result)).toContain("reject_execution_fields");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_EXECUTION_FIELD"
    );
  });

  it("blocks secret markers without removing them", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readJsonFixture("secret-marker.json"))
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(operationKinds(result)).toContain("reject_secret_marker");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
  });

  it("blocks raw source, diff, and prompt fields", async () => {
    const rawSourceResult = repairModelPatchProposalDraft(
      repairInput(await readJsonFixture("raw-source-field.json"))
    );
    const rawDiffResult = repairModelPatchProposalDraft({
      ...repairInput(await readHarnessFakeResponse("case-safe-basic.json")),
      rawDiff: "synthetic diff"
    } as unknown as PatchProposalRepairInput);
    const rawPromptResult = repairModelPatchProposalDraft({
      ...repairInput(await readHarnessFakeResponse("case-safe-basic.json")),
      rawPrompt: "synthetic prompt"
    } as unknown as PatchProposalRepairInput);

    expect(rawSourceResult.status).toBe("blocked");
    expect(operationKinds(rawSourceResult)).toContain("reject_unsafe_content");
    expect(rawDiffResult.status).toBe("blocked");
    expect(rawPromptResult.status).toBe("blocked");
  });

  it("preserves contentDraft only as summary output", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(
        await readHarnessFakeResponse("case-warning-content-draft.json")
      )
    );
    const serialized = JSON.stringify(result);

    expect(result.blockerCount).toBe(0);
    expect(result.proposalValidation?.summary.operationCount).toBe(1);
    expect(serialized).not.toContain("Offline fixture draft text");
    expect(serialized).not.toContain("contentDraft");
    expectExecutionFlagsFalse(result);
  });

  it("blocks when max repair attempts are exceeded", async () => {
    const result = repairModelPatchProposalDraft({
      rawCandidate: await readTextFixture("markdown-fenced-json.txt"),
      sourceKind: "fixture",
      maxAttempts: 1
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "MAX_ATTEMPTS_EXCEEDED"
    );
  });

  it("repairs safe candidate data associated with a dry adapter result", async () => {
    const rawCandidate = await readJsonFixture("missing-ids.json");
    const dryResult = await runPatchProposalDryAdapter({
      objectiveSummary: "Generate a summary-only patch proposal draft.",
      intent: "Create a model patch proposal draft for later validation.",
      modelProfileId: "deepseek-v4-pro",
      workspaceIndexRefs: ["workspace-index-summary"],
      contextAssemblyRefs: ["context-assembly-preview"],
      userWorkspaceReadinessRefs: ["promotion-readiness-summary"],
      allowedPathRefs: ["docs/missing-ids.md"],
      forbiddenPathPolicy: [".git", ".env", "node_modules"],
      evidenceRefs: ["manual-note"],
      dryClient: {
        generatePatchProposal: () => ({
          content: rawCandidate,
          usageSummary: {
            inputTokens: 1,
            outputTokens: 2,
            totalTokens: 3
          }
        })
      }
    });
    const result = repairModelPatchProposalDraft({
      rawCandidate,
      sourceKind: "dry_adapter_response",
      dryAdapterResult: dryResult
    });

    expect(dryResult.status).toBe("warning");
    expect(result.status).toBe("warning");
    expect(operationKinds(result)).toContain("generate_missing_proposal_id");
  });

  it("keeps output summary-only with execution readiness disabled", async () => {
    const result = repairModelPatchProposalDraft(
      repairInput(await readTextFixture("markdown-fenced-json.txt"))
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(result.readiness.canEnterPatchProposalPreview).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it("does not import live model, network, env, or filesystem write APIs", async () => {
    const source = await readFile(
      path.join(
        import.meta.dirname,
        "..",
        "src",
        "models",
        "patch-proposal-repair.ts"
      ),
      "utf8"
    );

    expect(source).not.toMatch(/DeepSeekClient/);
    expect(source).not.toMatch(/deepseek.*client/i);
    expect(source).not.toContain("globalThis.fetch");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("writeFile");
  });

  it("validates repair input shape fail-closed", () => {
    const findings = validatePatchProposalRepairInput({
      sourceKind: "fixture",
      maxAttempts: 0
    });

    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["MISSING_RAW_CANDIDATE", "INVALID_MAX_ATTEMPTS"])
    );
  });
});
