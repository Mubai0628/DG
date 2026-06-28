import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  normalizeModelPatchProposalDraft,
  parseModelPatchProposalDraft,
  summarizeModelPatchProposalDraft,
  validateModelPatchProposalDraft,
  type ModelPatchProposalInput
} from "../src/index.js";

const fixturesDir = path.join(
  import.meta.dirname,
  "fixtures",
  "model-patch-proposals"
);

async function readFixture(name: string): Promise<ModelPatchProposalInput> {
  const text = await readFile(path.join(fixturesDir, name), "utf8");
  return JSON.parse(text) as ModelPatchProposalInput;
}

function baseProposal(): Record<string, unknown> {
  return {
    schemaVersion: "model_patch_proposal.v1",
    proposalId: "model-proposal-base",
    title: "Update summary-only proposal docs",
    intent: "Create a draft proposal for documentation copy.",
    objectiveSummary: "Represent model output as a draft only.",
    operations: [
      {
        operationId: "op-doc",
        path: "docs/model-proposal.md",
        changeKind: "documentation",
        summary: "Document draft-only model proposal behavior.",
        estimatedLinesAdded: 4,
        estimatedLinesRemoved: 0,
        warningCodes: []
      },
      {
        operationId: "op-test",
        path: "runtime/test/model-patch-proposal-schema.test.ts",
        changeKind: "test",
        summary: "Cover schema validator behavior.",
        estimatedLinesAdded: 8,
        estimatedLinesRemoved: 0,
        warningCodes: []
      }
    ],
    evidenceRefs: [
      {
        refId: "context-preview",
        kind: "context_assembly",
        summary: "Context assembly summary ref.",
        hashPrefix: "abc12345"
      }
    ],
    validationHints: ["Run validation preview before audit."],
    modelProfileId: "deepseek-v4-pro",
    createdAt: "2026-06-28T00:00:00.000Z"
  };
}

describe("model patch proposal schema", () => {
  it("parses a safe object proposal as a summary-only draft", async () => {
    const result = validateModelPatchProposalDraft(
      await readFixture("safe-basic.json")
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.readiness.canEnterPatchProposalPreview).toBe(true);
    expect(result.proposal?.source).toBe("model_patch_proposal_draft");
    expect(result.proposal?.operationCount).toBe(2);
    expect(result.summary.patchProposalCreationPreviewInput).toMatchObject({
      intent: "Update read-only copy for a disabled App preview surface.",
      title: "Clarify disabled App copy"
    });
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("sk-test");
  });

  it("parses a safe JSON string proposal", async () => {
    const fixture = await readFile(
      path.join(fixturesDir, "safe-basic.json"),
      "utf8"
    );
    const result = parseModelPatchProposalDraft(fixture);

    expect(result.blockerCount).toBe(0);
    expect(result.proposal?.proposalId).toBe("model-proposal-safe-basic");
    expect(result.normalizedHash).toHaveLength(64);
  });

  it("generates deterministic proposal ids, operation ids, and hashes", () => {
    const input = baseProposal();
    delete input.proposalId;
    input.operations = [
      {
        path: "docs/generated-id.md",
        changeKind: "documentation",
        summary: "Use deterministic generated identifiers.",
        estimatedLinesAdded: 2,
        estimatedLinesRemoved: 0
      }
    ];

    const first = validateModelPatchProposalDraft(input);
    const second = validateModelPatchProposalDraft(input);

    expect(first.proposal?.proposalId).toMatch(/^model-proposal-/);
    expect(first.proposal?.operations[0]?.operationId).toMatch(
      /^model-operation-1-/
    );
    expect(first.proposal).toEqual(second.proposal);
    expect(first.normalizedHash).toBe(second.normalizedHash);
    expect(first.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "MISSING_PROPOSAL_ID",
        "MISSING_OPERATION_ID"
      ])
    );
  });

  it("rejects unsafe paths including absolute, drive, UNC, and traversal paths", () => {
    const unsafePaths = [
      "/abs/file.ts",
      "C:/repo/file.ts",
      "//server/share/file.ts",
      "../escape.ts",
      "src/file.ts?token=secret",
      "src/file.ts;rm",
      "src/file.ts\nnext"
    ];

    for (const unsafePath of unsafePaths) {
      const result = validateModelPatchProposalDraft({
        ...baseProposal(),
        operations: [
          {
            operationId: "op-unsafe",
            path: unsafePath,
            changeKind: "documentation",
            summary: "Unsafe path should block."
          }
        ]
      });

      expect(result.status, unsafePath).toBe("blocked");
      expect(result.findings.map((finding) => finding.kind)).toContain("path");
    }
  });

  it("rejects secret, dependency, generated, and temporary paths", () => {
    const unsafePaths = [
      ".env",
      ".env.local",
      ".git/config",
      "node_modules/pkg/index.js",
      "dist/index.js",
      "target/debug/app",
      ".tmp/output.txt",
      "docs/private-key.pem",
      "config/secrets/service.json"
    ];

    for (const unsafePath of unsafePaths) {
      const result = validateModelPatchProposalDraft({
        ...baseProposal(),
        operations: [
          {
            operationId: "op-unsafe",
            path: unsafePath,
            changeKind: "documentation",
            summary: "Unsafe path should block."
          }
        ]
      });

      expect(result.status, unsafePath).toBe("blocked");
      expect(
        result.findings.some(
          (finding) =>
            finding.code === "GENERATED_PATH_REJECTED" ||
            finding.code === "SECRET_PATH_REJECTED"
        )
      ).toBe(true);
    }
  });

  it("blocks rejected path fixtures", async () => {
    const result = validateModelPatchProposalDraft(
      await readFixture("rejected-unsafe-path.json")
    );

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "PARENT_TRAVERSAL_REJECTED"
    );
  });

  it("rejects raw source, diff, prompt, DOM, and CSV fields", async () => {
    const fixtureResult = validateModelPatchProposalDraft(
      await readFixture("rejected-raw-source.json")
    );
    const inlineResult = validateModelPatchProposalDraft({
      ...baseProposal(),
      operations: [
        {
          operationId: "op-raw",
          path: "docs/file.md",
          changeKind: "documentation",
          summary: "Unsafe raw fields.",
          rawDiff: "synthetic diff",
          rawPrompt: "synthetic prompt",
          rawDom: "synthetic DOM",
          rawCsv: "synthetic CSV"
        }
      ]
    } as unknown as ModelPatchProposalInput);

    expect(fixtureResult.status).toBe("blocked");
    expect(inlineResult.status).toBe("blocked");
    expect(inlineResult.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_RAW_FIELD"
    );
  });

  it("rejects command, shell, git, Tauri, EventStore, apply, and rollback fields", () => {
    const executionFields = [
      "command",
      "shellCommand",
      "gitCommand",
      "tauriCommand",
      "eventStoreWrite",
      "applyNow",
      "rollbackNow",
      "permissionLease",
      "desktopAction",
      "nativeBridge"
    ];

    for (const field of executionFields) {
      const result = validateModelPatchProposalDraft({
        ...baseProposal(),
        [field]: "forbidden"
      });

      expect(result.status, field).toBe("blocked");
      expect(result.findings.map((finding) => finding.code)).toContain(
        "FORBIDDEN_EXECUTION_FIELD"
      );
    }
  });

  it("rejects fake API key, Bearer, and private key markers", async () => {
    const fixtureResult = validateModelPatchProposalDraft(
      await readFixture("rejected-secret-marker.json")
    );
    const bearerResult = validateModelPatchProposalDraft({
      ...baseProposal(),
      operations: [
        {
          operationId: "op-secret",
          path: "docs/file.md",
          changeKind: "documentation",
          summary: "Bearer abcdefghijklmnop"
        }
      ]
    });
    const privateKeyResult = validateModelPatchProposalDraft({
      ...baseProposal(),
      operations: [
        {
          operationId: "op-secret",
          path: "docs/file.md",
          changeKind: "documentation",
          summary: "-----BEGIN PRIVATE KEY-----"
        }
      ]
    });

    expect(fixtureResult.status).toBe("blocked");
    expect(bearerResult.status).toBe("blocked");
    expect(privateKeyResult.status).toBe("blocked");
  });

  it("warns for contentDraft on safe create/update and never returns raw content", async () => {
    const input = await readFixture("warning-content-draft.json");
    const result = validateModelPatchProposalDraft(input);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.proposal?.operations[0]?.contentDraftSummary).toMatchObject({
      present: true
    });
    expect(serialized).not.toContain(
      "Model-generated documentation draft. This is not written"
    );
    expect(result.findings.map((finding) => finding.code)).toContain(
      "CONTENT_DRAFT_PRESENT"
    );
  });

  it("blocks contentDraft on delete operations", () => {
    const result = validateModelPatchProposalDraft({
      ...baseProposal(),
      operations: [
        {
          operationId: "op-delete",
          path: "docs/file.md",
          changeKind: "delete",
          summary: "Delete with content draft must block.",
          contentDraft: "not allowed on delete",
          warningCodes: ["DELETE_REQUIRES_APPROVAL"]
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "CONTENT_DRAFT_ON_DELETE"
    );
  });

  it("blocks negative line estimates", () => {
    const result = validateModelPatchProposalDraft({
      ...baseProposal(),
      operations: [
        {
          operationId: "op-negative",
          path: "docs/file.md",
          changeKind: "documentation",
          summary: "Negative estimates block.",
          estimatedLinesAdded: -1,
          estimatedLinesRemoved: 0
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "NEGATIVE_OR_INVALID_LINES_ADDED"
    );
  });

  it("blocks missing evidence refs", () => {
    const result = validateModelPatchProposalDraft({
      ...baseProposal(),
      evidenceRefs: []
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "MISSING_EVIDENCE_REFS"
    );
  });

  it("blocks delete and config operations without required risk markers", () => {
    const deleteResult = validateModelPatchProposalDraft({
      ...baseProposal(),
      operations: [
        {
          operationId: "op-delete",
          path: "docs/file.md",
          changeKind: "delete",
          summary: "Delete without explicit high risk warning."
        }
      ]
    });
    const configResult = validateModelPatchProposalDraft({
      ...baseProposal(),
      operations: [
        {
          operationId: "op-config",
          path: "config/app.json",
          changeKind: "config",
          summary: "Config without approval risk note."
        }
      ]
    });

    expect(deleteResult.status).toBe("blocked");
    expect(deleteResult.findings.map((finding) => finding.code)).toContain(
      "DELETE_REQUIRES_HIGH_RISK_WARNING"
    );
    expect(configResult.status).toBe("blocked");
    expect(configResult.findings.map((finding) => finding.code)).toContain(
      "CONFIG_REQUIRES_APPROVAL_RISK_NOTE"
    );
  });

  it("allows delete and config drafts only when explicit risk markers exist", () => {
    const result = validateModelPatchProposalDraft({
      ...baseProposal(),
      operations: [
        {
          operationId: "op-delete",
          path: "docs/old-file.md",
          changeKind: "delete",
          summary: "Delete obsolete docs after approval.",
          warningCodes: ["DELETE_REQUIRES_APPROVAL"]
        },
        {
          operationId: "op-config",
          path: "config/app.json",
          changeKind: "config",
          summary: "Update config draft.",
          rationale: "Approval required before any future config change.",
          warningCodes: ["CONFIG_APPROVAL_REQUIRED"]
        }
      ]
    });

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "DELETE_OPERATION_PRESENT",
        "CONFIG_OPERATION_PRESENT"
      ])
    );
  });

  it("warns when source mutation lacks a test operation", () => {
    const result = validateModelPatchProposalDraft({
      ...baseProposal(),
      operations: [
        {
          operationId: "op-source",
          path: "runtime/src/models/patch-proposal-schema.ts",
          changeKind: "update",
          summary: "Update runtime schema code.",
          estimatedLinesAdded: 10,
          estimatedLinesRemoved: 2
        }
      ]
    });

    expect(result.status).toBe("warning");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "SOURCE_MUTATION_WITHOUT_TEST_OPERATION"
    );
  });

  it("blocks unsupported schemas, missing structure, and unknown change kinds", () => {
    const unsupported = validateModelPatchProposalDraft({
      ...baseProposal(),
      schemaVersion: "model_patch_proposal.v999"
    });
    const missing = validateModelPatchProposalDraft({
      schemaVersion: "model_patch_proposal.v1",
      title: "",
      intent: "",
      operations: []
    });
    const unknownKind = validateModelPatchProposalDraft({
      ...baseProposal(),
      operations: [
        {
          operationId: "op-kind",
          path: "docs/file.md",
          changeKind: "execute",
          summary: "Unsupported change kind."
        }
      ]
    });

    expect(unsupported.status).toBe("blocked");
    expect(unsupported.findings.map((finding) => finding.code)).toContain(
      "UNSUPPORTED_SCHEMA_VERSION"
    );
    expect(missing.status).toBe("blocked");
    expect(missing.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "MISSING_TITLE",
        "MISSING_INTENT",
        "EMPTY_OPERATIONS",
        "MISSING_EVIDENCE_REFS"
      ])
    );
    expect(unknownKind.status).toBe("blocked");
    expect(unknownKind.findings.map((finding) => finding.code)).toContain(
      "UNKNOWN_CHANGE_KIND"
    );
  });

  it("keeps output summaries free of raw content and API keys", () => {
    const result = validateModelPatchProposalDraft(baseProposal());
    const summary = summarizeModelPatchProposalDraft(
      normalizeModelPatchProposalDraft(baseProposal())
    );
    const serialized = JSON.stringify({ result, summary });

    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("Authorization:");
  });

  it("keeps all execution readiness flags false", () => {
    const result = validateModelPatchProposalDraft(baseProposal());

    expect(result.readiness.canEnterPatchProposalPreview).toBe(true);
    expect(result.readiness.canApplyPatch).toBe(false);
    expect(result.readiness.canWriteFilesystem).toBe(false);
    expect(result.readiness.canExecuteGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(result.readiness.canWriteEventStore).toBe(false);
    expect(result.readiness.appCanExecute).toBe(false);
  });

  it("produces a summary compatible with patch proposal creation preview input shape", () => {
    const proposal = normalizeModelPatchProposalDraft(baseProposal());
    const summary = summarizeModelPatchProposalDraft(proposal);

    expect(summary.patchProposalCreationPreviewInput).toMatchObject({
      intent: "Create a draft proposal for documentation copy.",
      title: "Update summary-only proposal docs",
      changeDescriptionSummary: "Represent model output as a draft only."
    });
    expect(
      summary.patchProposalCreationPreviewInput?.proposedChanges.map(
        (change) => ({
          path: change.path,
          changeKind: change.changeKind,
          reasonSummary: change.reasonSummary
        })
      )
    ).toEqual([
      {
        path: "docs/model-proposal.md",
        changeKind: "documentation",
        reasonSummary: "Document draft-only model proposal behavior."
      },
      {
        path: "runtime/test/model-patch-proposal-schema.test.ts",
        changeKind: "test",
        reasonSummary: "Cover schema validator behavior."
      }
    ]);
  });
});
