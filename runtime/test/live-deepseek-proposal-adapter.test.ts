import { describe, expect, it } from "vitest";

import {
  buildLiveProposalApiKeyPolicy,
  buildLiveProposalRequest,
  runLiveDeepSeekProposalAdapter,
  summarizeLiveDeepSeekProposalAdapterResult,
  type LiveDeepSeekApiKeyResolver,
  type LiveDeepSeekProposalAdapterInput,
  type LiveDeepSeekProposalTransport,
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

function requestInput(
  overrides: Partial<LiveProposalRequestBuilderInput> = {}
): LiveProposalRequestBuilderInput {
  return {
    apiKeyPolicy: buildLiveProposalApiKeyPolicy(policyInput()),
    objectiveSummary: "Create a summary-only docs update proposal.",
    intent: "Generate a structured model_patch_proposal draft.",
    modelProfileId: "deepseek-chat",
    workspaceIndexRefs: ["workspace-index:summary:abc123"],
    contextAssemblyRefs: ["context-assembly:summary:def456"],
    userWorkspaceReadinessRefs: ["user-workspace-readiness:summary:ghi789"],
    allowedPathRefs: ["docs/live-deepseek-proposal-adapter.md"],
    forbiddenPathPolicy: ["no absolute paths", "no traversal"],
    evidenceRefs: ["manual-note:p0m-004"],
    noCompressRefs: ["approval-boundary:p0m-004"],
    promptMode: "summary_only",
    thinkingMode: "off",
    createdAt: "2026-06-28T00:00:00.000Z",
    ...overrides
  };
}

function baseInput(
  overrides: Partial<LiveDeepSeekProposalAdapterInput> = {}
): LiveDeepSeekProposalAdapterInput {
  const apiKeyPolicy = buildLiveProposalApiKeyPolicy(policyInput());
  const requestBuildResult = buildLiveProposalRequest(
    requestInput({ apiKeyPolicy })
  );
  return {
    liveMode: "explicit_live_proposal_call",
    apiKeyPolicy,
    requestBuildResult,
    apiKeyResolver: safeResolver(),
    transport: safeTransport(),
    endpointRef: "deepseek-chat-completions:summary-ref",
    allowLiveNetwork: true,
    allowApiKeyResolution: true,
    createdAt: "2026-06-28T00:00:00.000Z",
    ...overrides
  };
}

function safeResolver(): LiveDeepSeekApiKeyResolver {
  return {
    resolveApiKey: () => ({
      status: "resolved",
      key: "test-live-key-value",
      keyHash: "abcdef1234567890"
    })
  };
}

function safeTransport(): LiveDeepSeekProposalTransport {
  return {
    send: () => ({
      content: safeProposal(),
      usageSummary: {
        inputTokens: 100,
        outputTokens: 80,
        totalTokens: 180
      },
      modelProfileId: "deepseek-chat",
      responseId: "response-summary-ref"
    })
  };
}

function safeProposal(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    schemaVersion: "model_patch_proposal.v1",
    proposalId: "proposal-live-safe",
    title: "Update live adapter docs",
    intent: "Generate a structured model_patch_proposal draft.",
    objectiveSummary: "Create a summary-only docs update proposal.",
    operations: [
      {
        operationId: "op-docs",
        path: "docs/live-deepseek-proposal-adapter.md",
        changeKind: "documentation",
        summary: "Document the runtime-only live adapter boundary.",
        estimatedLinesAdded: 12,
        estimatedLinesRemoved: 0,
        warningCodes: []
      }
    ],
    pathSummaries: [
      {
        path: "docs/live-deepseek-proposal-adapter.md",
        changeKind: "documentation",
        operationIds: ["op-docs"],
        warningCodes: []
      }
    ],
    evidenceRefs: [
      {
        refId: "manual-note:p0m-004",
        kind: "manual_note",
        summary: "P0M-004 runtime-only adapter test fixture."
      }
    ],
    riskNotes: [],
    assumptions: [],
    validationHints: ["summary-only"],
    modelProfileId: "deepseek-chat",
    source: "model_patch_proposal_draft",
    ...overrides
  };
}

function expectNoExecution(value: {
  readiness: Record<string, boolean>;
}): void {
  expect(value.readiness).toMatchObject({
    canApplyPatch: false,
    canRollback: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("live deepseek proposal adapter", () => {
  it("keeps disabled mode from calling resolver or transport", async () => {
    let resolverCalled = false;
    let transportCalled = false;
    const result = await runLiveDeepSeekProposalAdapter({
      liveMode: "disabled",
      apiKeyResolver: {
        resolveApiKey: () => {
          resolverCalled = true;
          return { status: "resolved", key: "test-live-key-value" };
        }
      },
      transport: {
        send: () => {
          transportCalled = true;
          return { content: safeProposal() };
        }
      }
    });

    expect(result.status).toBe("disabled");
    expect(resolverCalled).toBe(false);
    expect(transportCalled).toBe(false);
    expect(result.apiKeyResolved).toBe(false);
    expect(result.usedLiveNetwork).toBe(false);
    expectNoExecution(result);
  });

  it("keeps dry_run from calling resolver or transport", async () => {
    let resolverCalled = false;
    let transportCalled = false;
    const result = await runLiveDeepSeekProposalAdapter(
      baseInput({
        liveMode: "dry_run",
        apiKeyResolver: {
          resolveApiKey: () => {
            resolverCalled = true;
            return { status: "resolved", key: "test-live-key-value" };
          }
        },
        transport: {
          send: () => {
            transportCalled = true;
            return { content: safeProposal() };
          }
        }
      })
    );

    expect(result.status).toBe("dry_run");
    expect(resolverCalled).toBe(false);
    expect(transportCalled).toBe(false);
    expect(result.apiKeyResolved).toBe(false);
    expect(result.usedLiveNetwork).toBe(false);
  });

  it("blocks explicit mode without resolver, transport, or allow flags", async () => {
    const noResolver = await runLiveDeepSeekProposalAdapter(
      baseInput({ apiKeyResolver: undefined })
    );
    const noTransport = await runLiveDeepSeekProposalAdapter(
      baseInput({ transport: undefined })
    );
    const noAllowFlags = await runLiveDeepSeekProposalAdapter(
      baseInput({ allowLiveNetwork: false, allowApiKeyResolution: false })
    );

    expect(noResolver.status).toBe("blocked");
    expect(noResolver.findings.map((finding) => finding.code)).toContain(
      "MISSING_API_KEY_RESOLVER"
    );
    expect(noTransport.status).toBe("blocked");
    expect(noTransport.findings.map((finding) => finding.code)).toContain(
      "MISSING_TRANSPORT"
    );
    expect(noAllowFlags.status).toBe("blocked");
    expect(noAllowFlags.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "LIVE_NETWORK_NOT_ALLOWED",
        "API_KEY_RESOLUTION_NOT_ALLOWED"
      ])
    );
  });

  it("blocks blocked policy and blocked request builder result", async () => {
    const blockedPolicy = buildLiveProposalApiKeyPolicy(
      policyInput({
        keySource: {
          type: "env_var_ref",
          refName: "UNAPPROVED_KEY_REF",
          keyPresenceProof: "not_checked"
        }
      })
    );
    const blockedRequest = buildLiveProposalRequest(
      requestInput({ objectiveSummary: "" })
    );
    const policyResult = await runLiveDeepSeekProposalAdapter(
      baseInput({ apiKeyPolicy: blockedPolicy })
    );
    const requestResult = await runLiveDeepSeekProposalAdapter(
      baseInput({ requestBuildResult: blockedRequest })
    );

    expect(policyResult.status).toBe("blocked");
    expect(policyResult.findings.map((finding) => finding.code)).toContain(
      "API_KEY_POLICY_NOT_READY"
    );
    expect(requestResult.status).toBe("blocked");
    expect(requestResult.findings.map((finding) => finding.code)).toContain(
      "REQUEST_NOT_READY"
    );
  });

  it("blocks request envelopes with tool fields", async () => {
    const safeRequest = buildLiveProposalRequest(requestInput());
    const withTools = {
      ...safeRequest,
      request: {
        ...safeRequest.request,
        tools: []
      }
    } as unknown as typeof safeRequest;
    const withToolChoice = {
      ...safeRequest,
      request: {
        ...safeRequest.request,
        tool_choice: "auto"
      }
    } as unknown as typeof safeRequest;

    const toolsResult = await runLiveDeepSeekProposalAdapter(
      baseInput({ requestBuildResult: withTools })
    );
    const toolChoiceResult = await runLiveDeepSeekProposalAdapter(
      baseInput({ requestBuildResult: withToolChoice })
    );

    expect(toolsResult.status).toBe("blocked");
    expect(toolChoiceResult.status).toBe("blocked");
    expect(toolsResult.findings.map((finding) => finding.code)).toContain(
      "REQUEST_TOOL_FIELDS_REJECTED"
    );
    expect(toolChoiceResult.findings.map((finding) => finding.code)).toContain(
      "REQUEST_TOOL_FIELDS_REJECTED"
    );
  });

  it("redacts resolver and transport secret-like errors", async () => {
    const resolverError = await runLiveDeepSeekProposalAdapter(
      baseInput({
        apiKeyResolver: {
          resolveApiKey: () => {
            throw new Error("sk-secret1234567890abcdef");
          }
        }
      })
    );
    const transportError = await runLiveDeepSeekProposalAdapter(
      baseInput({
        transport: {
          send: () => {
            throw new Error("Bearer abcdefghijklmnopqrstuvwxyz");
          }
        }
      })
    );
    const serialized = JSON.stringify({ resolverError, transportError });

    expect(resolverError.status).toBe("blocked");
    expect(resolverError.findings.map((finding) => finding.code)).toContain(
      "RESOLVER_API_KEY_MARKER"
    );
    expect(transportError.status).toBe("blocked");
    expect(transportError.findings.map((finding) => finding.code)).toContain(
      "TRANSPORT_BEARER_TOKEN_MARKER"
    );
    expect(serialized).not.toContain("sk-secret1234567890abcdef");
    expect(serialized).not.toContain("Bearer abcdefghijklmnopqrstuvwxyz");
  });

  it("generates a summary-only proposal through explicit fake transport", async () => {
    const result = await runLiveDeepSeekProposalAdapter(baseInput());
    const summary = summarizeLiveDeepSeekProposalAdapterResult(result);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("generated");
    expect(result.proposalId).toBe("proposal-live-safe");
    expect(result.proposalSummary?.operationCount).toBe(1);
    expect(result.repairSummary?.status).toBe("unchanged_valid");
    expect(result.validationSummary?.status).toBe("warning");
    expect(result.validationSummary?.blockerCount).toBe(0);
    expect(result.usedLiveNetwork).toBe(true);
    expect(result.apiKeyResolved).toBe(true);
    expect(result.apiKeyHashPrefix).toBe("abcdef123456");
    expect(result.readiness.canEnterPatchProposalPreview).toBe(true);
    expect(summary.proposalId).toBe("proposal-live-safe");
    expect(serialized).not.toContain("test-live-key-value");
    expect(serialized).not.toContain("reasoning secret");
    expect(serialized).not.toContain("rawSource");
    expectNoExecution(result);
  });

  it("drops reasoning content without persisting it", async () => {
    const result = await runLiveDeepSeekProposalAdapter(
      baseInput({
        transport: {
          send: () => ({
            content: safeProposal(),
            reasoningContent: "reasoning_content should never be output",
            usageSummary: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            modelProfileId: "deepseek-chat"
          })
        }
      })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("warning");
    expect(result.droppedReasoningContent).toBe(true);
    expect(result.droppedReasoningContentLength).toBeGreaterThan(0);
    expect(serialized).not.toContain(
      "reasoning_content should never be output"
    );
  });

  it("blocks unsafe response path, secret marker response, and malformed response", async () => {
    const unsafePath = await runLiveDeepSeekProposalAdapter(
      baseInput({
        transport: {
          send: () => ({
            content: safeProposal({
              operations: [
                {
                  operationId: "op-bad",
                  path: "../escape.ts",
                  changeKind: "documentation",
                  summary: "Unsafe path.",
                  warningCodes: []
                }
              ]
            }),
            usageSummary: { totalTokens: 1 },
            modelProfileId: "deepseek-chat"
          })
        }
      })
    );
    const secret = await runLiveDeepSeekProposalAdapter(
      baseInput({
        transport: {
          send: () => ({
            content: safeProposal({ title: "sk-test1234567890abcdef" }),
            usageSummary: { totalTokens: 1 },
            modelProfileId: "deepseek-chat"
          })
        }
      })
    );
    const malformed = await runLiveDeepSeekProposalAdapter(
      baseInput({
        transport: {
          send: () => ({
            content: "{ not valid json",
            usageSummary: { totalTokens: 1 },
            modelProfileId: "deepseek-chat"
          })
        }
      })
    );

    expect(unsafePath.status).toBe("blocked");
    expect(unsafePath.findings.map((finding) => finding.code)).toContain(
      "PROPOSAL_REPAIR_BLOCKED"
    );
    expect(secret.status).toBe("blocked");
    expect(secret.findings.map((finding) => finding.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(malformed.status).toBe("blocked");
    expect(malformed.findings.map((finding) => finding.code)).toContain(
      "PROPOSAL_REPAIR_BLOCKED"
    );
  });

  it("does not call global fetch or read process env in default tests", async () => {
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
      const result = await runLiveDeepSeekProposalAdapter(baseInput());
      const serialized = JSON.stringify(result);

      expect(result.status).toBe("generated");
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
});
