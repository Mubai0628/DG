import { describe, expect, it } from "vitest";

import {
  buildLiveProposalApiKeyPolicy,
  summarizeLiveProposalApiKeyPolicy,
  validateLiveProposalApiKeyPolicyInput,
  type LiveProposalApiKeyPolicyInput
} from "../src/index.js";

function baseInput(
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

describe("live proposal api key policy", () => {
  it("returns disabled mode without reading a key", () => {
    const policy = buildLiveProposalApiKeyPolicy(
      baseInput({
        keySource: {
          type: "disabled",
          keyPresenceProof: "not_checked"
        },
        optInGate: {
          mode: "disabled",
          scope: "proposal_generation_only",
          allowApply: false,
          allowRollback: false,
          allowEventStoreWrite: false,
          allowGit: false,
          allowShell: false,
          allowAppExecution: false
        }
      })
    );

    expect(policy.status).toBe("disabled");
    expect(policy.keySourceSummary.rawKeyPresent).toBe(false);
    expect(policy.readiness.canProceedToLiveRequestBuilder).toBe(false);
    expectNoExecution(policy);
  });

  it("returns dry config ready while keeping live calls disabled", () => {
    const policy = buildLiveProposalApiKeyPolicy(
      baseInput({
        optInGate: {
          mode: "dry_config_check",
          scope: "proposal_generation_only",
          allowApply: false,
          allowRollback: false,
          allowEventStoreWrite: false,
          allowGit: false,
          allowShell: false,
          allowAppExecution: false
        }
      })
    );

    expect(policy.status).toBe("dry_config_ready");
    expect(policy.warningCount).toBeGreaterThan(0);
    expect(policy.readiness.canProceedToLiveRequestBuilder).toBe(false);
    expectNoExecution(policy);
  });

  it("marks explicit opt-in with allowed env ref as policy ready only", () => {
    const policy = buildLiveProposalApiKeyPolicy(baseInput());
    const summary = summarizeLiveProposalApiKeyPolicy(policy);
    const serialized = JSON.stringify(policy);

    expect(policy.status).toBe("policy_ready");
    expect(policy.keySourceSummary.type).toBe("env_var_ref");
    expect(policy.keySourceSummary.refNameHash).toHaveLength(16);
    expect(policy.keySourceSummary.rawKeyPresent).toBe(false);
    expect(policy.readiness.canProceedToLiveRequestBuilder).toBe(true);
    expect(summary).toContain("canReadApiKey=no");
    expect(summary).toContain("canCallLiveModel=no");
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("Authorization");
    expectNoExecution(policy);
  });

  it("blocks non-allowlisted key source refs", () => {
    const envPolicy = buildLiveProposalApiKeyPolicy(
      baseInput({
        keySource: {
          type: "env_var_ref",
          refName: "UNAPPROVED_KEY_REF",
          keyPresenceProof: "not_checked"
        }
      })
    );
    const vaultPolicy = buildLiveProposalApiKeyPolicy(
      baseInput({
        keySource: {
          type: "vault_ref",
          refName: "vault://other/provider/key",
          keyPresenceProof: "not_checked"
        }
      })
    );

    expect(envPolicy.status).toBe("blocked");
    expect(envPolicy.findings.map((finding) => finding.code)).toContain(
      "ENV_REF_NOT_ALLOWLISTED"
    );
    expect(vaultPolicy.status).toBe("blocked");
    expect(vaultPolicy.findings.map((finding) => finding.code)).toContain(
      "VAULT_REF_NOT_ALLOWLISTED"
    );
  });

  it("blocks raw key, authorization, bearer, and private key markers", () => {
    const cases = [
      "sk-test1234567890abcdef",
      "Bearer abcdefghijklmnopqrstuvwxyz",
      "Authorization: Bearer hidden",
      "-----BEGIN PRIVATE KEY-----"
    ];

    for (const refName of cases) {
      const policy = buildLiveProposalApiKeyPolicy(
        baseInput({
          keySource: {
            type: "env_var_ref",
            refName,
            keyPresenceProof: "not_checked"
          },
          allowedEnvVarNames: [refName]
        })
      );

      expect(policy.status, refName).toBe("blocked");
      expect(policy.findings.map((finding) => finding.code)).toContain(
        "RAW_KEY_REF_REJECTED"
      );
    }
  });

  it("blocks invalid opt-in scope and execution permissions", () => {
    const invalidScope = buildLiveProposalApiKeyPolicy(
      baseInput({
        optInGate: {
          mode: "explicit_live_proposal_opt_in",
          scope: "workspace_apply" as "proposal_generation_only",
          allowApply: false,
          allowRollback: false,
          allowEventStoreWrite: false,
          allowGit: false,
          allowShell: false,
          allowAppExecution: false
        }
      })
    );
    const allowApply = buildLiveProposalApiKeyPolicy(
      baseInput({
        optInGate: {
          mode: "explicit_live_proposal_opt_in",
          scope: "proposal_generation_only",
          allowApply: true as false,
          allowRollback: false,
          allowEventStoreWrite: false,
          allowGit: false,
          allowShell: false,
          allowAppExecution: false
        }
      })
    );

    expect(invalidScope.status).toBe("blocked");
    expect(invalidScope.findings.map((finding) => finding.code)).toContain(
      "INVALID_OPT_IN_SCOPE"
    );
    expect(allowApply.status).toBe("blocked");
    expect(allowApply.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_PERMISSION_REJECTED"
    );
  });

  it("blocks rollback, event, git, shell, and app execution permissions", () => {
    const keys = [
      "allowRollback",
      "allowEventStoreWrite",
      "allowGit",
      "allowShell",
      "allowAppExecution"
    ] as const;

    for (const key of keys) {
      const policy = buildLiveProposalApiKeyPolicy(
        baseInput({
          optInGate: {
            mode: "explicit_live_proposal_opt_in",
            scope: "proposal_generation_only",
            allowApply: false,
            allowRollback: false,
            allowEventStoreWrite: false,
            allowGit: false,
            allowShell: false,
            allowAppExecution: false,
            [key]: true
          } as LiveProposalApiKeyPolicyInput["optInGate"]
        })
      );

      expect(policy.status, key).toBe("blocked");
      expect(policy.findings.map((finding) => finding.code)).toContain(
        "EXECUTION_PERMISSION_REJECTED"
      );
    }
  });

  it("blocks expired opt-in and warns when expiry is missing", () => {
    const expired = buildLiveProposalApiKeyPolicy(
      baseInput({
        optInGate: {
          mode: "explicit_live_proposal_opt_in",
          scope: "proposal_generation_only",
          allowApply: false,
          allowRollback: false,
          allowEventStoreWrite: false,
          allowGit: false,
          allowShell: false,
          allowAppExecution: false,
          expiresAt: "2020-01-01T00:00:00.000Z"
        }
      })
    );
    const missingExpiry = buildLiveProposalApiKeyPolicy(
      baseInput({
        optInGate: {
          mode: "explicit_live_proposal_opt_in",
          scope: "proposal_generation_only",
          allowApply: false,
          allowRollback: false,
          allowEventStoreWrite: false,
          allowGit: false,
          allowShell: false,
          allowAppExecution: false,
          requestedBy: "test_fixture",
          reasonSummary: "No expiry warning case."
        }
      })
    );

    expect(expired.status).toBe("blocked");
    expect(expired.findings.map((finding) => finding.code)).toContain(
      "OPT_IN_EXPIRED"
    );
    expect(missingExpiry.status).toBe("warning");
    expect(missingExpiry.findings.map((finding) => finding.code)).toContain(
      "MISSING_OPT_IN_EXPIRY"
    );
  });

  it("blocks forbidden input fields and readiness attempts", () => {
    const findings = validateLiveProposalApiKeyPolicyInput({
      ...baseInput(),
      apiKeyValue: "forbidden",
      canReadApiKey: true,
      canCallLiveModel: true
    } as unknown as LiveProposalApiKeyPolicyInput);
    const codes = findings.map((finding) => finding.code);

    expect(codes).toContain("FORBIDDEN_POLICY_FIELD");
    expect(codes).toContain("LIVE_READINESS_ATTEMPT_REJECTED");
  });

  it("does not read env, call fetch, or expose env sentinel", () => {
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
      const policy = buildLiveProposalApiKeyPolicy(baseInput());
      const serialized = JSON.stringify(policy);

      expect(policy.status).toBe("policy_ready");
      expect(fetchCalled).toBe(false);
      expect(serialized).not.toContain(sentinel);
      expectNoExecution(policy);
    } finally {
      globalThis.fetch = previousFetch;
      if (previousEnv === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = previousEnv;
      }
    }
  });

  it("produces deterministic policy id and hash with injected id and clock", () => {
    const policy = buildLiveProposalApiKeyPolicy(
      baseInput({
        createdAt: "2026-06-28T12:00:00.000Z",
        idGenerator: () => "policy-fixed-id"
      })
    );

    expect(policy.policyId).toBe("policy-fixed-id");
    expect(policy.policyHash).toHaveLength(64);
    expect(buildLiveProposalApiKeyPolicy(baseInput()).policyHash).toBe(
      buildLiveProposalApiKeyPolicy(baseInput()).policyHash
    );
  });
});
