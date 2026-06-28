import { describe, expect, it } from "vitest";

import {
  buildLiveProposalValidationIntegration,
  summarizeLiveProposalValidationIntegration,
  validateLiveProposalValidationIntegrationInput,
  type LiveDeepSeekProposalAdapterResult
} from "../src/index.js";

function generatedResult(
  overrides: Partial<LiveDeepSeekProposalAdapterResult> = {}
): LiveDeepSeekProposalAdapterResult {
  return {
    status: "generated",
    generationId: "live-generation-1",
    liveMode: "explicit_live_proposal_call",
    providerId: "deepseek",
    modelProfileId: "deepseek-chat",
    requestId: "live-request-1",
    requestHash:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    responseHash:
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    proposalId: "proposal-live-safe",
    proposalSummary: {
      proposalId: "proposal-live-safe",
      title: "Update docs",
      intent: "Generate a structured model_patch_proposal draft.",
      operationCount: 1,
      fileCount: 1,
      pathSummaries: ["docs/live-proposal-validation.md"],
      warningCodes: [],
      hash: "cccccccccccc"
    },
    repairSummary: {
      status: "unchanged_valid",
      repairId: "repair-1",
      sourceKind: "model_response",
      attemptCount: 1,
      operationKinds: [],
      proposalId: "proposal-live-safe",
      blockerCount: 0,
      warningCount: 0,
      findingCount: 0,
      originalHash:
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      source: "runtime_patch_proposal_repair_summary"
    },
    validationSummary: {
      status: "parsed",
      normalizedHash:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      blockerCount: 0,
      warningCount: 0,
      findingCount: 0
    },
    usageSummary: {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30
    },
    droppedReasoningContent: false,
    usedLiveNetwork: true,
    apiKeyResolved: true,
    apiKeyHashPrefix: "abcdef123456",
    findings: [],
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    readiness: {
      canEnterPatchProposalPreview: true,
      canApplyPatch: false,
      canRollback: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false,
      appCanExecute: false
    },
    nextAction: "Enter preview chain.",
    source: "runtime_live_deepseek_proposal_adapter",
    ...overrides
  };
}

function expectNoExecution(result: {
  readiness: Record<string, boolean>;
}): void {
  expect(result.readiness).toMatchObject({
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

describe("live proposal validation integration", () => {
  it("returns empty safely when no live adapter result is present", () => {
    const result = buildLiveProposalValidationIntegration();

    expect(result.status).toBe("empty");
    expect(result.blockerCount).toBe(1);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "MISSING_LIVE_ADAPTER_RESULT"
    );
    expect(result.usedLiveNetwork).toBe(false);
    expectNoExecution(result);
  });

  it("integrates a generated live adapter result as ready", () => {
    const result = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult(),
      expectedRequestId: "live-request-1",
      expectedModelProfileId: "deepseek-chat",
      idGenerator: () => "integration-id"
    });
    const summary = summarizeLiveProposalValidationIntegration(result);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("integration_ready");
    expect(result.integrationId).toBe("integration-id");
    expect(result.proposalId).toBe("proposal-live-safe");
    expect(result.gates).toHaveLength(10);
    expect(result.readiness.canEnterPatchProposalImport).toBe(true);
    expect(result.readiness.canEnterPatchProposalPreview).toBe(true);
    expect(result.apiKeyHashPrefix).toBe("abcdef123456");
    expect(summary.proposalId).toBe("proposal-live-safe");
    expect(serialized).not.toContain("test-live-key-value");
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("reasoning secret");
    expectNoExecution(result);
  });

  it("keeps warning live adapter results as warning integrations", () => {
    const result = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({
        status: "warning",
        droppedReasoningContent: true,
        droppedReasoningContentLength: 48
      })
    });

    expect(result.status).toBe("warning");
    expect(result.droppedReasoningContent).toBe(true);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "LIVE_ADAPTER_WARNING"
    );
    expect(result.findings.map((finding) => finding.code)).toContain(
      "REASONING_CONTENT_DROPPED"
    );
  });

  it("blocks blocked live adapter results", () => {
    const result = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({
        status: "blocked",
        blockerCount: 1,
        readiness: {
          ...generatedResult().readiness,
          canEnterPatchProposalPreview: false
        }
      })
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "LIVE_ADAPTER_BLOCKED"
    );
    expect(result.readiness.canEnterPatchProposalPreview).toBe(false);
  });

  it("warns on dry_run and blocks dry_run when generated status is required", () => {
    const dryRun = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({
        status: "dry_run",
        usedLiveNetwork: false,
        apiKeyResolved: false,
        apiKeyHashPrefix: undefined
      })
    });
    const required = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({
        status: "dry_run",
        usedLiveNetwork: false,
        apiKeyResolved: false,
        apiKeyHashPrefix: undefined
      }),
      requireGeneratedStatus: true
    });

    expect(dryRun.status).toBe("warning");
    expect(dryRun.findings.map((finding) => finding.code)).toContain(
      "LIVE_ADAPTER_DRY_RUN"
    );
    expect(required.status).toBe("blocked");
    expect(required.findings.map((finding) => finding.code)).toContain(
      "GENERATED_STATUS_REQUIRED"
    );
  });

  it("blocks expected request and model profile mismatches", () => {
    const requestMismatch = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult(),
      expectedRequestId: "different-request"
    });
    const modelMismatch = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult(),
      expectedModelProfileId: "deepseek-reasoner"
    });

    expect(requestMismatch.status).toBe("blocked");
    expect(requestMismatch.findings.map((finding) => finding.code)).toContain(
      "REQUEST_ID_MISMATCH"
    );
    expect(modelMismatch.status).toBe("blocked");
    expect(modelMismatch.findings.map((finding) => finding.code)).toContain(
      "MODEL_PROFILE_MISMATCH"
    );
  });

  it("blocks missing or blocked validation and repair summaries", () => {
    const missingValidation = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({ validationSummary: undefined })
    });
    const blockedValidation = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({
        validationSummary: {
          status: "blocked",
          normalizedHash: "blockedhash",
          blockerCount: 1,
          warningCount: 0,
          findingCount: 1
        }
      })
    });
    const blockedRepair = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({
        repairSummary: {
          ...generatedResult().repairSummary!,
          status: "blocked",
          blockerCount: 1,
          findingCount: 1
        }
      })
    });

    expect(missingValidation.status).toBe("blocked");
    expect(missingValidation.findings.map((finding) => finding.code)).toContain(
      "MISSING_VALIDATION_SUMMARY"
    );
    expect(blockedValidation.status).toBe("blocked");
    expect(blockedValidation.findings.map((finding) => finding.code)).toContain(
      "SCHEMA_VALIDATION_BLOCKED"
    );
    expect(blockedRepair.status).toBe("blocked");
    expect(blockedRepair.findings.map((finding) => finding.code)).toContain(
      "REPAIR_BLOCKED"
    );
  });

  it("blocks raw response, reasoningContent, API key marker, and raw usage fields", () => {
    const rawResponse = buildLiveProposalValidationIntegration({
      liveAdapterResult: {
        ...generatedResult(),
        rawResponse: "raw model response text"
      } as unknown as LiveDeepSeekProposalAdapterResult
    });
    const reasoningContent = buildLiveProposalValidationIntegration({
      liveAdapterResult: {
        ...generatedResult(),
        reasoningContent: "reasoning secret"
      } as unknown as LiveDeepSeekProposalAdapterResult
    });
    const apiKeyMarker = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({
        proposalSummary: {
          ...generatedResult().proposalSummary!,
          title: "sk-test1234567890abcdef"
        }
      })
    });
    const rawUsage = buildLiveProposalValidationIntegration({
      liveAdapterResult: {
        ...generatedResult(),
        usageSummary: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
          rawText: "raw usage text"
        }
      } as unknown as LiveDeepSeekProposalAdapterResult
    });
    const serialized = JSON.stringify({
      rawResponse,
      reasoningContent,
      apiKeyMarker,
      rawUsage
    });

    expect(rawResponse.status).toBe("blocked");
    expect(reasoningContent.status).toBe("blocked");
    expect(apiKeyMarker.status).toBe("blocked");
    expect(rawUsage.status).toBe("blocked");
    expect(rawResponse.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_FIELD"
    );
    expect(reasoningContent.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_FIELD"
    );
    expect(apiKeyMarker.findings.map((finding) => finding.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(rawUsage.findings.map((finding) => finding.code)).toContain(
      "UNSAFE_USAGE_SUMMARY"
    );
    expect(serialized).not.toContain("reasoning secret");
    expect(serialized).not.toContain("sk-test1234567890abcdef");
  });

  it("blocks execution readiness and unsafe key/network summaries", () => {
    const execution = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({
        readiness: {
          ...generatedResult().readiness,
          canWriteEventStore: true as false
        }
      })
    });
    const networkWithoutKey = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({
        usedLiveNetwork: true,
        apiKeyResolved: false
      })
    });
    const missingHash = buildLiveProposalValidationIntegration({
      liveAdapterResult: generatedResult({
        apiKeyResolved: true,
        apiKeyHashPrefix: undefined
      })
    });

    expect(execution.status).toBe("blocked");
    expect(execution.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_READINESS_REJECTED"
    );
    expect(networkWithoutKey.status).toBe("blocked");
    expect(networkWithoutKey.findings.map((finding) => finding.code)).toContain(
      "NETWORK_WITHOUT_KEY_RESOLUTION"
    );
    expect(missingHash.status).toBe("blocked");
    expect(missingHash.findings.map((finding) => finding.code)).toContain(
      "MISSING_API_KEY_HASH_PREFIX"
    );
  });

  it("validates input without calling fetch or reading process env", () => {
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
      const findings = validateLiveProposalValidationIntegrationInput({
        liveAdapterResult: generatedResult()
      });
      const result = buildLiveProposalValidationIntegration({
        liveAdapterResult: generatedResult()
      });
      const serialized = JSON.stringify({ findings, result });

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
