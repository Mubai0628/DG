import { describe, expect, it } from "vitest";

import {
  buildLiveProposalApiKeyPolicy,
  buildLiveProposalRequest,
  summarizeLiveProposalRequestBuild,
  type LiveProposalApiKeyPolicy,
  type LiveProposalApiKeyPolicyInput,
  type LiveProposalRequestBuilderInput
} from "../src/index.js";

function policyInput(
  overrides: Partial<LiveProposalApiKeyPolicyInput> = {}
): LiveProposalApiKeyPolicyInput {
  return {
    providerId: "deepseek",
    modelProfileId: "deepseek-chat",
    keySource: {
      type: "env_var_ref",
      refName: "DEEPSEEK_API_KEY",
      displayName: "DeepSeek environment variable ref",
      keyPresenceProof: "declared_by_test_fixture"
    },
    optInGate: {
      mode: "explicit_live_proposal_opt_in",
      scope: "proposal_generation_only",
      allowApply: false,
      allowRollback: false,
      allowEventStoreWrite: false,
      allowGit: false,
      allowShell: false,
      allowAppExecution: false,
      expiresAt: "2030-01-01T00:00:00.000Z",
      requestedBy: "test_fixture",
      reasonSummary: "Test fixture policy metadata only."
    },
    allowedEnvVarNames: ["DEEPSEEK_API_KEY"],
    allowedVaultRefPrefixes: ["vault://deepseek/"],
    allowedTestFixtureRefs: ["test-fixture:deepseek-api-key-ref"],
    createdAt: "2026-06-28T00:00:00.000Z",
    ...overrides
  };
}

function readyPolicy(): LiveProposalApiKeyPolicy {
  return buildLiveProposalApiKeyPolicy(policyInput());
}

function baseInput(
  overrides: Partial<LiveProposalRequestBuilderInput> = {}
): LiveProposalRequestBuilderInput {
  return {
    apiKeyPolicy: readyPolicy(),
    objectiveSummary: "Create a summary-only docs update proposal.",
    intent: "Generate a structured model_patch_proposal draft.",
    modelProfileId: "deepseek-chat",
    workspaceIndexRefs: ["workspace-index:summary:abc123"],
    contextAssemblyRefs: ["context-assembly:summary:def456"],
    userWorkspaceReadinessRefs: ["user-workspace-readiness:summary:ghi789"],
    allowedPathRefs: ["docs/live-proposal-request-builder.md"],
    forbiddenPathPolicy: [
      "no absolute paths",
      "no traversal",
      "no secret files",
      "no generated artifacts"
    ],
    evidenceRefs: ["manual-note:p0m-003"],
    taskContractHash: "task-contract-hash-prefix",
    noCompressRefs: ["approval-boundary:p0m-003"],
    promptMode: "summary_only",
    thinkingMode: "off",
    createdAt: "2026-06-28T00:00:00.000Z",
    ...overrides
  };
}

function expectNoExecution(value: {
  readiness: Record<string, boolean>;
}): void {
  expect(value.readiness).toMatchObject({
    canReadApiKey: false,
    canCallLiveModel: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("live proposal request builder", () => {
  it("builds a summary-only request from safe policy and summaries", () => {
    const result = buildLiveProposalRequest(baseInput());
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("request_ready");
    expect(result.request).toBeDefined();
    expect(result.request?.responseFormat).toBe("model_patch_proposal");
    expect(result.request?.summaryOnly).toBe(true);
    expect(result.request?.noExecution).toBe(true);
    expect(result.request?.noFileWrite).toBe(true);
    expect(result.request?.noApply).toBe(true);
    expect(result.request?.noRollback).toBe(true);
    expect(result.request?.noEventStoreWrite).toBe(true);
    expect(result.request?.noGitShell).toBe(true);
    expect(result.request?.noTools).toBe(true);
    expect(result.request?.toolChoiceOmitted).toBe(true);
    expect(result.request?.apiKeyPolicyRef.rawKeyIncluded).toBe(false);
    expect(result.request?.apiKeyPolicyRef.refNameHash).toHaveLength(16);
    expect(result.readiness.canProceedToLiveAdapter).toBe(true);
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("process.env");
    expect(serialized).not.toContain('"tools"');
    expect(serialized).not.toContain("tool_choice");
    expectNoExecution(result);
  });

  it("blocks missing and blocked api key policy", () => {
    const missing = buildLiveProposalRequest(
      baseInput({ apiKeyPolicy: undefined })
    );
    const blockedPolicy = buildLiveProposalApiKeyPolicy(
      policyInput({
        keySource: {
          type: "env_var_ref",
          refName: "UNAPPROVED_KEY_REF",
          keyPresenceProof: "not_checked"
        }
      })
    );
    const blocked = buildLiveProposalRequest(
      baseInput({ apiKeyPolicy: blockedPolicy })
    );

    expect(missing.status).toBe("blocked");
    expect(missing.findings.map((finding) => finding.code)).toContain(
      "MISSING_API_KEY_POLICY"
    );
    expect(blocked.status).toBe("blocked");
    expect(blocked.findings.map((finding) => finding.code)).toContain(
      "API_KEY_POLICY_BLOCKED"
    );
  });

  it("blocks policy readiness attempts to read keys or call network", () => {
    const unsafePolicy = {
      ...readyPolicy(),
      readiness: {
        ...readyPolicy().readiness,
        canReadApiKey: true,
        canCallLiveModel: true,
        canFetchNetwork: true
      }
    } as unknown as LiveProposalApiKeyPolicy;
    const result = buildLiveProposalRequest(
      baseInput({ apiKeyPolicy: unsafePolicy })
    );
    const codes = result.findings.map((finding) => finding.code);

    expect(result.status).toBe("blocked");
    expect(codes).toContain("POLICY_READ_KEY_REJECTED");
    expect(codes).toContain("POLICY_CALL_MODEL_REJECTED");
    expect(codes).toContain("POLICY_FETCH_NETWORK_REJECTED");
  });

  it("blocks missing objective and invalid prompt mode", () => {
    const result = buildLiveProposalRequest(
      baseInput({
        objectiveSummary: "",
        promptMode: "raw_prompt" as "summary_only"
      })
    );
    const codes = result.findings.map((finding) => finding.code);

    expect(result.status).toBe("blocked");
    expect(codes).toContain("MISSING_OBJECTIVE_SUMMARY");
    expect(codes).toContain("PROMPT_MODE_NOT_SUMMARY_ONLY");
  });

  it("blocks raw source diff prompt and secret markers", () => {
    const cases: Array<Partial<LiveProposalRequestBuilderInput>> = [
      {
        rawSource: "source"
      } as unknown as Partial<LiveProposalRequestBuilderInput>,
      { objectiveSummary: "rawDiff marker" },
      { objectiveSummary: "rawPrompt marker" },
      { objectiveSummary: "sk-test1234567890abcdef" },
      { objectiveSummary: "Bearer abcdefghijklmnopqrstuvwxyz" },
      { objectiveSummary: "Authorization: Bearer hidden" },
      { objectiveSummary: "-----BEGIN PRIVATE KEY-----" }
    ];

    for (const override of cases) {
      const result = buildLiveProposalRequest(baseInput(override));

      expect(result.status, JSON.stringify(override)).toBe("blocked");
      expect(result.request).toBeUndefined();
    }
  });

  it("blocks unsafe allowed path refs", () => {
    const cases = [
      "/absolute/path.ts",
      "C:/repo/file.ts",
      "//server/share/file.ts",
      "../escape.ts",
      "docs/file.ts?download=1",
      "docs/file.ts;rm",
      ".git/config",
      ".env",
      "node_modules/pkg/index.js",
      "dist/output.js",
      "target/debug/app",
      ".tmp/cache.json",
      "keys/private.pem"
    ];

    for (const pathRef of cases) {
      const result = buildLiveProposalRequest(
        baseInput({ allowedPathRefs: [pathRef] })
      );

      expect(result.status, pathRef).toBe("blocked");
      expect(result.findings.map((finding) => finding.code)).toContain(
        "UNSAFE_ALLOWED_PATH_REF"
      );
    }
  });

  it("blocks tools and tool choice fields", () => {
    const tools = buildLiveProposalRequest({
      ...baseInput(),
      tools: []
    } as unknown as LiveProposalRequestBuilderInput);
    const toolChoice = buildLiveProposalRequest({
      ...baseInput(),
      tool_choice: "auto"
    } as unknown as LiveProposalRequestBuilderInput);

    expect(tools.status).toBe("blocked");
    expect(toolChoice.status).toBe("blocked");
    expect(tools.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_REQUEST_FIELD"
    );
    expect(toolChoice.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_REQUEST_FIELD"
    );
  });

  it("warns for missing context refs and thinking mode while omitting tool choice", () => {
    const result = buildLiveProposalRequest(
      baseInput({
        workspaceIndexRefs: [],
        contextAssemblyRefs: [],
        userWorkspaceReadinessRefs: [],
        allowedPathRefs: [],
        evidenceRefs: [],
        noCompressRefs: [],
        thinkingMode: "on_summary_only"
      })
    );
    const codes = result.findings.map((finding) => finding.code);

    expect(result.status).toBe("warning");
    expect(result.request).toBeDefined();
    expect(result.request?.toolChoiceOmitted).toBe(true);
    expect(JSON.stringify(result.request)).not.toContain("tool_choice");
    expect(codes).toContain("WORKSPACE_INDEX_REFS_MISSING");
    expect(codes).toContain("CONTEXT_ASSEMBLY_REFS_MISSING");
    expect(codes).toContain("USER_WORKSPACE_READINESS_REFS_MISSING");
    expect(codes).toContain("ALLOWED_PATH_REFS_MISSING");
    expect(codes).toContain("EVIDENCE_REFS_MISSING");
    expect(codes).toContain("NO_COMPRESS_REFS_MISSING");
    expect(codes).toContain("THINKING_MODE_SUMMARY_ONLY");
  });

  it("does not read env or call fetch", () => {
    const sentinel = "sk-envsentinel1234567890";
    const previousFetch = globalThis.fetch;
    const previousEnv = process.env.DEEPSEEK_API_KEY;
    let fetchCalled = false;
    globalThis.fetch = (() => {
      fetchCalled = true;
      throw new Error("fetch must not be called");
    }) as typeof fetch;
    process.env.DEEPSEEK_API_KEY = sentinel;
    try {
      const result = buildLiveProposalRequest(baseInput());
      const serialized = JSON.stringify(result);

      expect(result.status).toBe("request_ready");
      expect(fetchCalled).toBe(false);
      expect(serialized).not.toContain(sentinel);
      expect(serialized).not.toContain("process.env");
      expectNoExecution(result);
    } finally {
      globalThis.fetch = previousFetch;
      if (previousEnv === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = previousEnv;
      }
    }
  });

  it("produces deterministic request id/hash with injected id and clock", () => {
    const result = buildLiveProposalRequest(
      baseInput({
        createdAt: "2026-06-28T12:00:00.000Z",
        idGenerator: () => "live-request-fixed-id"
      })
    );
    const second = buildLiveProposalRequest(
      baseInput({
        createdAt: "2026-06-28T12:00:00.000Z",
        idGenerator: () => "live-request-fixed-id"
      })
    );
    const summary = summarizeLiveProposalRequestBuild(result);

    expect(result.requestId).toBe("live-request-fixed-id");
    expect(result.requestHash).toHaveLength(64);
    expect(result.requestHash).toBe(second.requestHash);
    expect(summary.requestHash).toBe(result.requestHash);
    expect(summary.canProceedToLiveAdapter).toBe(true);
  });
});
