import { describe, expect, it } from "vitest";

import {
  buildLiveProposalTelemetryRedactionAudit,
  buildLiveProposalValidationIntegration,
  summarizeLiveProposalTelemetryRedactionAudit,
  validateLiveProposalTelemetryRedactionAuditInput,
  type LiveDeepSeekProposalAdapterResult
} from "../src/index.js";

function generatedResult(
  overrides: Partial<LiveDeepSeekProposalAdapterResult> = {}
): LiveDeepSeekProposalAdapterResult {
  return {
    status: "generated",
    generationId: "live-generation-telemetry-1",
    liveMode: "explicit_live_proposal_call",
    providerId: "deepseek",
    modelProfileId: "deepseek-chat",
    requestId: "live-request-telemetry-1",
    requestHash:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    responseHash:
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    proposalId: "proposal-live-telemetry-safe",
    proposalSummary: {
      proposalId: "proposal-live-telemetry-safe",
      title: "Update docs",
      intent: "Generate a structured model_patch_proposal draft.",
      operationCount: 1,
      fileCount: 1,
      pathSummaries: ["docs/live-proposal-telemetry.md"],
      warningCodes: [],
      hash: "cccccccccccc"
    },
    repairSummary: {
      status: "unchanged_valid",
      repairId: "repair-telemetry-1",
      sourceKind: "model_response",
      attemptCount: 1,
      operationKinds: [],
      proposalId: "proposal-live-telemetry-safe",
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
    usedLiveNetwork: false,
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
    canWriteTelemetryEvent: false,
    canPersistRawPrompt: false,
    canPersistRawResponse: false,
    canPersistReasoningContent: false,
    canReadApiKey: false,
    canCallLiveModel: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("live proposal telemetry redaction audit", () => {
  it("returns empty safely without summary artifacts", () => {
    const result = buildLiveProposalTelemetryRedactionAudit();

    expect(result.status).toBe("empty");
    expect(result.recordCount).toBe(0);
    expect(result.rawFieldDetectedCount).toBe(0);
    expect(result.apiKeyLeakDetected).toBe(false);
    expectNoExecution(result);
  });

  it("builds audit_ready from safe summary artifacts", () => {
    const liveAdapterResult = generatedResult();
    const validationIntegration = buildLiveProposalValidationIntegration({
      liveAdapterResult
    });
    const result = buildLiveProposalTelemetryRedactionAudit({
      telemetryMode: "summary_only_audit",
      liveAdapterResult,
      validationIntegration,
      usageSummary: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30
      },
      idGenerator: () => "audit-id"
    });
    const summary = summarizeLiveProposalTelemetryRedactionAudit(result);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("audit_ready");
    expect(result.auditId).toBe("audit-id");
    expect(result.recordCount).toBeGreaterThan(0);
    expect(result.usageSummary?.totalTokens).toBe(30);
    expect(result.rawFieldDetectedCount).toBe(0);
    expect(result.apiKeyLeakDetected).toBe(false);
    expect(result.rawPromptDetected).toBe(false);
    expect(result.rawResponseDetected).toBe(false);
    expect(result.reasoningContentPersisted).toBe(false);
    expect(summary.auditId).toBe("audit-id");
    expect(serialized).not.toContain("test-live-key-value");
    expect(serialized).not.toContain("model response text");
    expect(serialized).not.toContain("reasoning secret");
    expectNoExecution(result);
  });

  it("blocks raw prompt, raw response, and reasoning content fields", () => {
    const rawPrompt = buildLiveProposalTelemetryRedactionAudit({
      requestBuildResult: {
        rawPrompt: "model prompt text"
      }
    });
    const rawResponse = buildLiveProposalTelemetryRedactionAudit({
      liveAdapterResult: {
        rawResponse: "model response text"
      }
    });
    const reasoningContent = buildLiveProposalTelemetryRedactionAudit({
      liveAdapterResult: {
        reasoningContent: "reasoning secret"
      }
    });
    const serialized = JSON.stringify({
      rawPrompt,
      rawResponse,
      reasoningContent
    });

    expect(rawPrompt.status).toBe("blocked");
    expect(rawPrompt.rawPromptDetected).toBe(true);
    expect(rawResponse.status).toBe("blocked");
    expect(rawResponse.rawResponseDetected).toBe(true);
    expect(reasoningContent.status).toBe("blocked");
    expect(reasoningContent.reasoningContentPersisted).toBe(true);
    expect(serialized).not.toContain("model prompt text");
    expect(serialized).not.toContain("model response text");
    expect(serialized).not.toContain("reasoning secret");
  });

  it("blocks API key markers and raw usage text", () => {
    const apiKeyMarker = buildLiveProposalTelemetryRedactionAudit({
      liveAdapterResult: generatedResult({
        proposalSummary: {
          ...generatedResult().proposalSummary!,
          title: "sk-test1234567890abcdef"
        }
      })
    });
    const rawUsage = buildLiveProposalTelemetryRedactionAudit({
      usageSummary: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        rawText: "usage text should not persist"
      }
    });
    const serialized = JSON.stringify({ apiKeyMarker, rawUsage });

    expect(apiKeyMarker.status).toBe("blocked");
    expect(apiKeyMarker.apiKeyLeakDetected).toBe(true);
    expect(apiKeyMarker.findings.map((finding) => finding.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(rawUsage.status).toBe("blocked");
    expect(rawUsage.findings.map((finding) => finding.code)).toContain(
      "UNSAFE_USAGE_SUMMARY"
    );
    expect(rawUsage.findings.map((finding) => finding.code)).toContain(
      "USAGE_SUMMARY_RAW_TEXT"
    );
    expect(serialized).not.toContain("sk-test1234567890abcdef");
    expect(serialized).not.toContain("usage text should not persist");
  });

  it("blocks request tools and tool_choice fields", () => {
    const tools = buildLiveProposalTelemetryRedactionAudit({
      requestBuildResult: {
        request: {
          tools: []
        }
      }
    });
    const toolChoice = buildLiveProposalTelemetryRedactionAudit({
      requestBuildResult: {
        request: {
          tool_choice: "auto"
        }
      }
    });

    expect(tools.status).toBe("blocked");
    expect(tools.findings.map((finding) => finding.code)).toContain(
      "REQUEST_TOOLS_REJECTED"
    );
    expect(toolChoice.status).toBe("blocked");
    expect(toolChoice.findings.map((finding) => finding.code)).toContain(
      "REQUEST_TOOL_CHOICE_REJECTED"
    );
  });

  it("warns for live network and dropped reasoning summaries", () => {
    const result = buildLiveProposalTelemetryRedactionAudit({
      telemetryMode: "summary_only_audit",
      liveAdapterResult: generatedResult({
        usedLiveNetwork: true,
        droppedReasoningContent: true,
        droppedReasoningContentLength: 42
      }),
      usageSummary: {
        totalTokens: 12
      }
    });

    expect(result.status).toBe("warning");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "LIVE_NETWORK_USED"
    );
    expect(result.findings.map((finding) => finding.code)).toContain(
      "REASONING_CONTENT_DROPPED"
    );
    expect(result.records.map((record) => record.kind)).toContain(
      "reasoning_content_drop_summary"
    );
    expect(result.reasoningContentPersisted).toBe(false);
  });

  it("blocks execution readiness and unknown telemetry record kinds", () => {
    const execution = buildLiveProposalTelemetryRedactionAudit({
      appPreviewGate: {
        readiness: {
          appCanExecute: true
        }
      }
    });
    const unknownRecord = buildLiveProposalTelemetryRedactionAudit({
      records: [{ kind: "raw_prompt_record" }]
    } as unknown as Parameters<
      typeof buildLiveProposalTelemetryRedactionAudit
    >[0]);

    expect(execution.status).toBe("blocked");
    expect(execution.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_READINESS_REJECTED"
    );
    expect(unknownRecord.status).toBe("blocked");
    expect(unknownRecord.findings.map((finding) => finding.code)).toContain(
      "UNKNOWN_TELEMETRY_RECORD_KIND"
    );
  });

  it("is deterministic with injected id and does not read env or call fetch", () => {
    const previousFetch = globalThis.fetch;
    const previousEnv = process.env.DEEPSEEK_API_KEY;
    const sentinel = "sk-envsentinel1234567890";
    let fetchCalled = false;
    globalThis.fetch = (() => {
      fetchCalled = true;
      throw new Error("fetch must not be called");
    }) as typeof fetch;
    process.env.DEEPSEEK_API_KEY = sentinel;
    try {
      const result = buildLiveProposalTelemetryRedactionAudit({
        telemetryMode: "summary_only_audit",
        liveAdapterResult: generatedResult(),
        usageSummary: {
          totalTokens: 1
        },
        idGenerator: () => "deterministic-audit-id"
      });
      const repeat = buildLiveProposalTelemetryRedactionAudit({
        telemetryMode: "summary_only_audit",
        liveAdapterResult: generatedResult(),
        usageSummary: {
          totalTokens: 1
        },
        idGenerator: () => "deterministic-audit-id"
      });
      const findings = validateLiveProposalTelemetryRedactionAuditInput({
        telemetryMode: "summary_only_audit",
        liveAdapterResult: generatedResult()
      });
      const serialized = JSON.stringify({ result, findings });

      expect(fetchCalled).toBe(false);
      expect(result.auditId).toBe("deterministic-audit-id");
      expect(result.auditHash).toBe(repeat.auditHash);
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
