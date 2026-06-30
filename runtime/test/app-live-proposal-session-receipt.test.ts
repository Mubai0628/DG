import { describe, expect, it } from "vitest";

import {
  APP_LIVE_PROPOSAL_CONFIRMATION,
  buildAppLiveProposalSessionReceipt,
  summarizeAppLiveProposalSessionReceipt,
  validateAppLiveProposalSessionReceipt,
  type AppLiveProposalSessionReceipt,
  type AppLiveProposalSessionReceiptInput
} from "../src/index.js";

function safeInput(
  overrides: Partial<AppLiveProposalSessionReceiptInput> = {}
): AppLiveProposalSessionReceiptInput {
  return {
    receiptId: "app-live-session-test-1",
    kind: "live_proposal_generation",
    providerId: "deepseek",
    modelProfileId: "deepseek-chat",
    objectiveSummaryHash: "objective-summary-hash-1",
    allowedPathRefs: ["docs/live-proposal.md", "app/src/App.tsx"],
    contextRefHashes: ["context-hash-1", "no-compress-hash-1"],
    apiKeyPolicyId: "policy-test-1",
    requestBuilderId: "request-builder-test-1",
    expiresAt: "2026-01-02T00:00:00.000Z",
    typedConfirmation: APP_LIVE_PROPOSAL_CONFIRMATION,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function findingCodes(receipt: AppLiveProposalSessionReceipt): string[] {
  return receipt.findings.map((finding) => finding.code);
}

function expectExecutionFlagsFalse(
  receipt: AppLiveProposalSessionReceipt
): void {
  expect(receipt.readiness).toMatchObject({
    canReadApiKey: false,
    canCallLiveModel: false,
    canFetchNetwork: false,
    canSendLiveRequest: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("app live proposal session receipt", () => {
  it("builds a valid summary-only receipt", () => {
    const receipt = buildAppLiveProposalSessionReceipt(safeInput());

    expect(receipt.status).toBe("ready");
    expect(receipt.receiptId).toBe("app-live-session-test-1");
    expect(receipt.kind).toBe("live_proposal_generation");
    expect(receipt.providerId).toBe("deepseek");
    expect(receipt.typedConfirmationAccepted).toBe(true);
    expect(receipt.allowedPathRefs).toEqual([
      "docs/live-proposal.md",
      "app/src/App.tsx"
    ]);
    expect(receipt.blockerCount).toBe(0);
    expect(receipt.summaryOnly).toBe(true);
    expect(receipt.readiness.canProceedToLiveProposalCommand).toBe(true);
    expect(summarizeAppLiveProposalSessionReceipt(receipt)).toContain(
      "app_execution:false"
    );
    expectExecutionFlagsFalse(receipt);
  });

  it("blocks missing or wrong typed confirmation", () => {
    const missing = buildAppLiveProposalSessionReceipt(
      safeInput({ typedConfirmation: "" })
    );
    const wrong = buildAppLiveProposalSessionReceipt(
      safeInput({ typedConfirmation: "CALL MODEL" })
    );

    expect(missing.status).toBe("blocked");
    expect(wrong.status).toBe("blocked");
    expect(findingCodes(missing)).toContain(
      "APP_LIVE_SESSION_CONFIRMATION_MISMATCH"
    );
    expect(findingCodes(wrong)).toContain(
      "APP_LIVE_SESSION_CONFIRMATION_MISMATCH"
    );
    expect(wrong.typedConfirmation).toBe("[blocked-confirmation]");
    expect(wrong.readiness.canProceedToLiveProposalCommand).toBe(false);
  });

  it("blocks expired receipts", () => {
    const validation = validateAppLiveProposalSessionReceipt(
      safeInput({ expiresAt: "2025-12-31T00:00:00.000Z" })
    );

    expect(validation.ok).toBe(false);
    expect(validation.status).toBe("blocked");
    expect(validation.findings.map((finding) => finding.code)).toContain(
      "APP_LIVE_SESSION_EXPIRED"
    );
    expect(validation.readiness.canCallLiveModel).toBe(false);
  });

  it("blocks unsafe allowed paths", () => {
    const receipt = buildAppLiveProposalSessionReceipt(
      safeInput({
        allowedPathRefs: [
          "../escape.ts",
          "C:/workspace/file.ts",
          ".git/config",
          ".env",
          "src/api-key.txt"
        ]
      })
    );

    expect(receipt.status).toBe("blocked");
    expect(findingCodes(receipt)).toContain("APP_LIVE_SESSION_UNSAFE_PATH");
    expect(findingCodes(receipt)).toContain("APP_LIVE_SESSION_BLOCKED_PATH");
    expect(findingCodes(receipt)).toContain("APP_LIVE_SESSION_SECRET_PATH");
    expectExecutionFlagsFalse(receipt);
  });

  it("blocks missing required model, provider, objective, policy, and paths", () => {
    const receipt = buildAppLiveProposalSessionReceipt({
      typedConfirmation: APP_LIVE_PROPOSAL_CONFIRMATION,
      expiresAt: "2026-01-02T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    expect(receipt.status).toBe("blocked");
    expect(findingCodes(receipt)).toEqual(
      expect.arrayContaining([
        "APP_LIVE_SESSION_PROVIDER_MISSING",
        "APP_LIVE_SESSION_MODEL_PROFILE_MISSING",
        "APP_LIVE_SESSION_OBJECTIVE_HASH_MISSING",
        "APP_LIVE_SESSION_POLICY_MISSING",
        "APP_LIVE_SESSION_PATHS_MISSING"
      ])
    );
  });

  it("blocks raw fields, API key markers, and execution readiness attempts", () => {
    const fakeKeyMarker = ["sk", "fake-session-marker"].join("-");
    const receipt = buildAppLiveProposalSessionReceipt({
      ...safeInput(),
      rawPrompt: "raw prompt should not remain",
      nested: {
        Authorization: `Bearer ${"A".repeat(16)}`,
        note: fakeKeyMarker,
        readiness: { canApplyPatch: true }
      }
    } as unknown as AppLiveProposalSessionReceiptInput);
    const serialized = JSON.stringify(receipt);

    expect(receipt.status).toBe("blocked");
    expect(findingCodes(receipt)).toContain("APP_LIVE_SESSION_FORBIDDEN_FIELD");
    expect(findingCodes(receipt)).toContain("API_KEY_MARKER");
    expect(findingCodes(receipt)).toContain("BEARER_TOKEN_MARKER");
    expect(findingCodes(receipt)).toContain(
      "APP_LIVE_SESSION_EXECUTION_READINESS_TRUE"
    );
    expect(serialized).not.toContain("raw prompt should not remain");
    expect(serialized).not.toContain(fakeKeyMarker);
    expect(serialized).not.toContain("Bearer");
    expectExecutionFlagsFalse(receipt);
  });

  it("blocks duplicate paths and warns on missing optional refs", () => {
    const receipt = buildAppLiveProposalSessionReceipt(
      safeInput({
        allowedPathRefs: ["docs/live-proposal.md", "docs/live-proposal.md"],
        contextRefHashes: [],
        requestBuilderId: undefined
      })
    );

    expect(receipt.status).toBe("blocked");
    expect(findingCodes(receipt)).toContain("APP_LIVE_SESSION_DUPLICATE_PATH");
    expect(findingCodes(receipt)).toContain(
      "APP_LIVE_SESSION_CONTEXT_REFS_EMPTY"
    );
    expect(findingCodes(receipt)).toContain(
      "APP_LIVE_SESSION_REQUEST_BUILDER_REF_MISSING"
    );
  });

  it("uses deterministic receipt id and hash with injected id and clock", () => {
    const firstInput = safeInput({
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => "session-generated-id"
    });
    const secondInput = safeInput({
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => "session-generated-id"
    });
    delete firstInput.receiptId;
    delete secondInput.receiptId;
    const first = buildAppLiveProposalSessionReceipt(firstInput);
    const second = buildAppLiveProposalSessionReceipt(secondInput);

    expect(first.receiptId).toBe("session-generated-id");
    expect(second.receiptId).toBe("session-generated-id");
    expect(first.receiptHash).toBe(second.receiptHash);
    expect(first.receiptHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
