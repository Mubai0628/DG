import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  buildLiveProposalApiKeyPolicy,
  runLiveProposalEvaluation,
  summarizeLiveProposalEvaluationReport,
  validateLiveProposalEvaluationInput,
  type LiveDeepSeekApiKeyResolver,
  type LiveDeepSeekProposalTransport,
  type LiveProposalApiKeyPolicyInput,
  type LiveProposalEvaluationReport
} from "../src/index.js";

const goldenCaseRoot = new URL(
  "./fixtures/live-proposal-golden-cases/",
  import.meta.url
);

async function readJson<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, "utf8")) as T;
}

async function goldenCase(name: string): Promise<Record<string, unknown>> {
  return readJson(new URL(name, goldenCaseRoot));
}

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
    createdAt: "2026-06-29T00:00:00.000Z",
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

function safeTransport(
  content: unknown = safeProposal()
): LiveDeepSeekProposalTransport {
  return {
    send: () => ({
      content,
      usageSummary: {
        inputTokens: 101,
        outputTokens: 55,
        totalTokens: 156
      },
      modelProfileId: "deepseek-chat",
      responseId: "response-summary-ref"
    })
  };
}

function safeProposal(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    schemaVersion: "model_patch_proposal.v1",
    proposalId: "proposal-live-eval-safe",
    title: "Document live evaluation",
    intent: "documentation_update",
    objectiveSummary: "Document live evaluation boundaries.",
    operations: [
      {
        operationId: "op-live-eval-doc",
        path: "docs/runtime-live-proposal-evaluation-runner-v0.9.md",
        changeKind: "documentation",
        summary: "Document explicit opt-in live evaluation.",
        estimatedLinesAdded: 12,
        estimatedLinesRemoved: 0,
        warningCodes: []
      }
    ],
    pathSummaries: [
      {
        path: "docs/runtime-live-proposal-evaluation-runner-v0.9.md",
        changeKind: "documentation",
        summary: "Documentation summary."
      }
    ],
    evidenceRefs: [
      {
        refId: "evidence-live-eval",
        kind: "manual_note",
        summary: "Live evaluation test fixture evidence summary.",
        hashPrefix: "liveeval"
      }
    ],
    riskNotes: [
      {
        code: "DRAFT_ONLY",
        severity: "info",
        summary: "Evaluation-only draft."
      }
    ],
    validationHints: ["Summary-only evaluation."],
    modelProfileId: "deepseek-chat",
    ...overrides
  };
}

async function baseReport(
  overrides: Parameters<typeof runLiveProposalEvaluation>[0] = {}
): Promise<LiveProposalEvaluationReport> {
  return runLiveProposalEvaluation({
    evaluationMode: "explicit_live_eval",
    apiKeyPolicy: buildLiveProposalApiKeyPolicy(policyInput()),
    apiKeyResolver: safeResolver(),
    transport: safeTransport(),
    allowLiveNetwork: true,
    allowApiKeyResolution: true,
    cases: [
      {
        goldenCase: await goldenCase("safe-docs-smoke.json"),
        expectedStatus: "pass"
      }
    ],
    createdAt: "2026-06-29T00:00:00.000Z",
    ...overrides
  });
}

function expectNoExecution(report: LiveProposalEvaluationReport): void {
  expect(report.readiness).toMatchObject({
    canCallLiveModelByDefault: false,
    canRunFromApp: false,
    canReadApiKeyByDefault: false,
    canFetchNetworkByDefault: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("live proposal evaluation runner", () => {
  it("keeps disabled mode from calling resolver or transport", async () => {
    let resolverCalled = false;
    let transportCalled = false;
    const report = await runLiveProposalEvaluation({
      evaluationMode: "disabled",
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
      },
      cases: [{ goldenCase: await goldenCase("safe-docs-smoke.json") }]
    });

    expect(report.status).toBe("disabled");
    expect(report.caseCount).toBe(0);
    expect(resolverCalled).toBe(false);
    expect(transportCalled).toBe(false);
    expect(report.usedLiveNetwork).toBe(false);
    expectNoExecution(report);
  });

  it("keeps dry_run from calling resolver or transport", async () => {
    let resolverCalled = false;
    let transportCalled = false;
    const report = await runLiveProposalEvaluation({
      evaluationMode: "dry_run",
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
      },
      cases: [{ goldenCase: await goldenCase("safe-docs-smoke.json") }]
    });

    expect(report.status).toBe("dry_run_ready");
    expect(report.caseCount).toBe(1);
    expect(resolverCalled).toBe(false);
    expect(transportCalled).toBe(false);
    expect(report.usedLiveNetwork).toBe(false);
  });

  it("blocks explicit_live_eval without resolver, transport, or allow flags", async () => {
    const noResolver = await runLiveProposalEvaluation({
      evaluationMode: "explicit_live_eval",
      apiKeyPolicy: buildLiveProposalApiKeyPolicy(policyInput()),
      transport: safeTransport(),
      allowLiveNetwork: true,
      allowApiKeyResolution: true,
      cases: [{ goldenCase: await goldenCase("safe-docs-smoke.json") }]
    });
    const noTransport = await runLiveProposalEvaluation({
      evaluationMode: "explicit_live_eval",
      apiKeyPolicy: buildLiveProposalApiKeyPolicy(policyInput()),
      apiKeyResolver: safeResolver(),
      allowLiveNetwork: true,
      allowApiKeyResolution: true,
      cases: [{ goldenCase: await goldenCase("safe-docs-smoke.json") }]
    });
    const noAllowFlags = await runLiveProposalEvaluation({
      evaluationMode: "explicit_live_eval",
      apiKeyPolicy: buildLiveProposalApiKeyPolicy(policyInput()),
      apiKeyResolver: safeResolver(),
      transport: safeTransport(),
      allowLiveNetwork: false,
      allowApiKeyResolution: false,
      cases: [{ goldenCase: await goldenCase("safe-docs-smoke.json") }]
    });

    expect(noResolver.status).toBe("blocked");
    expect(noResolver.findings.map((finding) => finding.code)).toContain(
      "MISSING_API_KEY_RESOLVER"
    );
    expect(noTransport.findings.map((finding) => finding.code)).toContain(
      "MISSING_TRANSPORT"
    );
    expect(noAllowFlags.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "LIVE_NETWORK_NOT_ALLOWED",
        "API_KEY_RESOLUTION_NOT_ALLOWED"
      ])
    );
  });

  it("produces evaluation_ready with safe explicit fake resolver and transport", async () => {
    const report = await baseReport({
      idGenerator: () => "live-eval-report"
    });
    const summary = summarizeLiveProposalEvaluationReport(report);

    expect(report.status).toBe("evaluation_ready");
    expect(report.caseCount).toBe(1);
    expect(report.passedCount).toBe(1);
    expect(report.liveCallCaseCount).toBe(1);
    expect(report.usedLiveNetwork).toBe(true);
    expect(report.schemaPassRate).toBe(1);
    expect(report.repairSuccessRate).toBe(1);
    expect(report.usageSummary).toMatchObject({
      inputTokens: 101,
      outputTokens: 55,
      totalTokens: 156,
      requestCount: 1,
      responseCount: 1
    });
    expect(summary.reportId).toBe("live-eval-report");
    expectNoExecution(report);
  });

  it("maps unsafe transport proposal responses to unsafe_path", async () => {
    const report = await baseReport({
      transport: safeTransport(
        safeProposal({
          operations: [
            {
              operationId: "op-unsafe",
              path: "../outside.txt",
              changeKind: "documentation",
              summary: "Unsafe traversal summary.",
              estimatedLinesAdded: 1,
              estimatedLinesRemoved: 0
            }
          ],
          pathSummaries: [
            {
              path: "../outside.txt",
              changeKind: "documentation",
              summary: "Unsafe traversal summary."
            }
          ]
        })
      ),
      cases: [
        {
          goldenCase: await goldenCase("safe-docs-smoke.json"),
          expectedStatus: "blocked",
          expectedFailureCategories: ["unsafe_path"]
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.caseResults[0]?.failureCategories).toContain("unsafe_path");
    expect(report.caseResults[0]?.unsafeBlocked).toBe(true);
  });

  it("maps secret marker responses to secret_marker without leaking the marker", async () => {
    const fakeSecret = "sk-test1234567890abcdef";
    const report = await baseReport({
      transport: safeTransport(
        safeProposal({
          validationHints: [fakeSecret]
        })
      ),
      cases: [
        {
          goldenCase: await goldenCase("safe-docs-smoke.json"),
          expectedStatus: "blocked",
          expectedFailureCategories: ["secret_marker"]
        }
      ]
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.caseResults[0]?.failureCategories).toContain("secret_marker");
    expect(serialized).not.toContain(fakeSecret);
  });

  it("maps malformed responses to malformed_json or repair_failed", async () => {
    const report = await baseReport({
      transport: safeTransport("{ not valid json"),
      cases: [
        {
          goldenCase: await goldenCase("safe-docs-smoke.json"),
          expectedStatus: "blocked",
          expectedFailureCategories: ["malformed_json"]
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.caseResults[0]?.failureCategories).toContain(
      "malformed_json"
    );
    expect(report.caseResults[0]?.failureCategories).toContain("repair_failed");
  });

  it("marks expectation mismatches as failed expectations", async () => {
    const report = await baseReport({
      cases: [
        {
          goldenCase: await goldenCase("safe-docs-smoke.json"),
          expectedStatus: "blocked",
          expectedFailureCategories: ["unsafe_path"]
        }
      ]
    });

    expect(report.status).toBe("failed");
    expect(report.failedExpectationCount).toBe(1);
    expect(report.caseResults[0]?.matchedExpectation).toBe(false);
  });

  it("blocks raw response attempts through telemetry and taxonomy", async () => {
    const report = await baseReport({
      transport: safeTransport({
        rawResponse: "redacted test marker"
      }),
      cases: [
        {
          goldenCase: await goldenCase("safe-docs-smoke.json"),
          expectedStatus: "blocked",
          expectedFailureCategories: ["raw_content_leak"]
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.caseResults[0]?.failureCategories).toContain(
      "raw_content_leak"
    );
    expect(report.findings.map((finding) => finding.code).join(" ")).toMatch(
      /RAW/i
    );
  });

  it("keeps output summary-only without raw key, response, reasoning, or API key", async () => {
    const report = await baseReport({
      transport: safeTransport({
        ...safeProposal(),
        reasoningContent: "this field is nested in content and must block"
      }),
      cases: [
        {
          goldenCase: await goldenCase("safe-docs-smoke.json"),
          expectedStatus: "blocked",
          expectedFailureCategories: ["reasoning_content_leak"]
        }
      ]
    });
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("test-live-key-value");
    expect(serialized).not.toContain("raw prompt");
    expect(serialized).not.toContain("raw response");
    expect(serialized).not.toContain("this field is nested");
    expect(serialized).not.toContain("DEEPSEEK_API_KEY=");
    expect(report.caseResults[0]?.failureCategories).toContain(
      "reasoning_content_leak"
    );
  });

  it("does not call global fetch or read process.env sentinels", async () => {
    const originalFetch = globalThis.fetch;
    const originalEnv = process.env.DEEPSEEK_API_KEY;
    let fetchCalled = false;
    globalThis.fetch = (() => {
      fetchCalled = true;
      throw new Error("fetch should not be called");
    }) as typeof fetch;
    process.env.DEEPSEEK_API_KEY = "env-sentinel-not-read";
    try {
      const report = await baseReport();
      const serialized = JSON.stringify(report);

      expect(fetchCalled).toBe(false);
      expect(serialized).not.toContain("env-sentinel-not-read");
      expect(report.status).toBe("evaluation_ready");
    } finally {
      globalThis.fetch = originalFetch;
      if (originalEnv === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = originalEnv;
      }
    }
  });

  it("keeps deterministic report hash with injected id and clock", async () => {
    const first = await baseReport({
      idGenerator: () => "deterministic-live-eval",
      createdAt: "2026-06-29T00:00:00.000Z"
    });
    const second = await baseReport({
      idGenerator: () => "deterministic-live-eval",
      createdAt: "2026-06-29T00:00:00.000Z"
    });

    expect(first.reportId).toBe("deterministic-live-eval");
    expect(first.reportHash).toBe(second.reportHash);
  });

  it("validates raw fields and max case violations before running", async () => {
    const findings = validateLiveProposalEvaluationInput({
      evaluationMode: "explicit_live_eval",
      allowLiveNetwork: true,
      allowApiKeyResolution: true,
      apiKeyPolicy: buildLiveProposalApiKeyPolicy(policyInput()),
      apiKeyResolver: safeResolver(),
      transport: safeTransport(),
      maxCases: 1,
      cases: [
        { goldenCase: { rawPrompt: "blocked" } as Record<string, unknown> },
        { goldenCase: { title: "extra" } as Record<string, unknown> }
      ]
    });

    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["RAWPROMPT_FIELD_REJECTED", "MAX_CASES_EXCEEDED"])
    );
  });

  it("keeps all execution readiness flags false", async () => {
    const report = await baseReport();

    expectNoExecution(report);
  });
});
