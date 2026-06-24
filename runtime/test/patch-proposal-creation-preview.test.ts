import { describe, expect, it } from "vitest";

import {
  buildPatchProposalCreationPreview,
  summarizePatchProposalCreationPreview,
  validatePatchProposalCreationInput,
  type PatchProposalCreationPreviewInput
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function safeInput(): PatchProposalCreationPreviewInput {
  return {
    intent: "code_change",
    title: "Update summary-only App Shell preview",
    changeDescriptionSummary:
      "Wire a local patch proposal summary into read-only surfaces.",
    selectedPathRefs: [
      {
        path: "app/src/App.tsx",
        changeKind: "update",
        language: "tsx",
        extension: "tsx",
        reasonSummary: "Show preview counts in App Shell.",
        estimatedLinesAdded: 12,
        estimatedLinesRemoved: 3
      },
      {
        path: "docs/app-shell-preview.md",
        changeKind: "documentation",
        language: "md",
        extension: "md",
        reasonSummary: "Document preview-only behavior.",
        estimatedLinesAdded: 20,
        estimatedLinesRemoved: 0
      }
    ],
    runDraftRef: "run-draft-1",
    workspaceIndexRef: "workspace-index-1",
    contextSummaryRef: "context-summary-1",
    createdAt
  };
}

describe("patch proposal creation preview helper", () => {
  it("builds a safe create/update proposal preview without source content", () => {
    const preview = buildPatchProposalCreationPreview(safeInput());
    const serialized = JSON.stringify(preview);

    expect(preview.source).toBe("runtime_patch_creation_preview");
    expect(preview.previewOnly).toBe(true);
    expect(preview.applyEnabled).toBe(false);
    expect(preview.fileReadEnabled).toBe(false);
    expect(preview.fileWriteEnabled).toBe(false);
    expect(preview.eventWritesEnabled).toBe(false);
    expect(preview.fileCount).toBe(2);
    expect(preview.filesUpdated).toBe(2);
    expect(preview.linesAdded).toBe(32);
    expect(preview.linesRemoved).toBe(3);
    expect(preview.pathSummaries).toEqual([
      "update:app/src/App.tsx",
      "documentation:docs/app-shell-preview.md"
    ]);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toContain("function DesktopShell");
  });

  it("produces deterministic proposal ids and summary hashes", () => {
    const first = buildPatchProposalCreationPreview({
      ...safeInput(),
      idGenerator: () => "patch-preview-fixed"
    });
    const second = buildPatchProposalCreationPreview({
      ...safeInput(),
      idGenerator: () => "patch-preview-fixed"
    });

    expect(first.proposalId).toBe("patch-preview-fixed");
    expect(first).toEqual(second);
    expect(summarizePatchProposalCreationPreview(first)).toEqual(
      summarizePatchProposalCreationPreview(second)
    );
  });

  it("rejects unsafe paths and generated artifact directories", () => {
    const unsafePaths = [
      "/abs/file.ts",
      "C:/repo/file.ts",
      "//server/share/file.ts",
      "../escape.ts",
      ".git/config",
      ".env.local",
      "node_modules/pkg/index.js",
      "runtime/dist/index.js",
      "app/src-tauri/target/debug/app.exe",
      ".tmp/out.txt",
      "src/file.ts?token=secret",
      "src/file.ts;rm"
    ];

    for (const unsafePath of unsafePaths) {
      const preview = buildPatchProposalCreationPreview({
        ...safeInput(),
        selectedPathRefs: [
          {
            path: unsafePath,
            changeKind: "update",
            estimatedLinesAdded: 1,
            estimatedLinesRemoved: 0
          }
        ]
      });

      expect(preview.status).toBe("blocked");
      expect(
        preview.warningCodes.some((code) => code.includes("REJECTED"))
      ).toBe(true);
    }
  });

  it("rejects raw content fields and unsafe markers without retaining them", () => {
    const secret = "sk-test1234567890abcdef";
    const unsafeInput = {
      ...safeInput(),
      changeDescriptionSummary: `rawPrompt rawDom rawCsv ${secret}`,
      beforeContent: "do not keep",
      selectedPathRefs: [
        {
          path: "app/src/App.tsx",
          changeKind: "update",
          afterContent: "do not keep either",
          estimatedLinesAdded: 1,
          estimatedLinesRemoved: 0
        }
      ]
    } as unknown as PatchProposalCreationPreviewInput & Record<string, unknown>;

    const validation = validatePatchProposalCreationInput(unsafeInput);
    const preview = buildPatchProposalCreationPreview(unsafeInput);
    const serialized = JSON.stringify(preview);

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_PREVIEW_RAW_FIELD_REJECTED",
        "API_KEY_MARKER",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER"
      ])
    );
    expect(preview.status).toBe("blocked");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
    expect(serialized).not.toContain("rawPrompt rawDom rawCsv");
  });

  it("marks delete, protected, source, and config file previews as approval-required", () => {
    const preview = buildPatchProposalCreationPreview({
      intent: "code_change",
      title: "High risk patch summary",
      changeDescriptionSummary: "Delete and config changes require approval.",
      selectedPathRefs: [
        {
          path: "README.md",
          changeKind: "delete",
          estimatedLinesAdded: 0,
          estimatedLinesRemoved: 8
        },
        {
          path: "package.json",
          changeKind: "update",
          estimatedLinesAdded: 1,
          estimatedLinesRemoved: 1
        },
        {
          path: "runtime/src/index.ts",
          changeKind: "update",
          estimatedLinesAdded: 2,
          estimatedLinesRemoved: 0
        }
      ],
      createdAt
    });

    expect(preview.status).toBe("warning");
    expect(preview.riskLevel).toBe("A3_scoped_write");
    expect(preview.requiresApproval).toBe(true);
    expect(preview.filesDeleted).toBe(1);
    expect(preview.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_PREVIEW_DELETE_REQUIRES_APPROVAL",
        "PATCH_PREVIEW_PROTECTED_DELETE_REQUIRES_APPROVAL",
        "PATCH_PREVIEW_CONFIG_REQUIRES_APPROVAL",
        "PATCH_PREVIEW_SOURCE_REQUIRES_APPROVAL"
      ])
    );
  });

  it("warns on many files and rejects negative line estimates", () => {
    const manyFilesPreview = buildPatchProposalCreationPreview({
      intent: "documentation",
      title: "Many docs",
      changeDescriptionSummary: "Update docs summaries.",
      selectedPathRefs: Array.from({ length: 6 }, (_, index) => ({
        path: `docs/file-${index}.md`,
        changeKind: "documentation" as const,
        estimatedLinesAdded: 1,
        estimatedLinesRemoved: 0
      })),
      createdAt
    });
    const negativePreview = buildPatchProposalCreationPreview({
      ...safeInput(),
      selectedPathRefs: [
        {
          path: "docs/file.md",
          changeKind: "documentation",
          estimatedLinesAdded: -1,
          estimatedLinesRemoved: 0
        }
      ]
    });

    expect(manyFilesPreview.status).toBe("warning");
    expect(manyFilesPreview.warningCodes).toContain("PATCH_PREVIEW_MANY_FILES");
    expect(negativePreview.status).toBe("blocked");
    expect(negativePreview.warningCodes).toContain(
      "PATCH_PREVIEW_NEGATIVE_LINE_ESTIMATE"
    );
  });

  it("rejects oversized input and too many file refs", () => {
    const tooMany = buildPatchProposalCreationPreview({
      ...safeInput(),
      selectedPathRefs: Array.from({ length: 13 }, (_, index) => ({
        path: `docs/file-${index}.md`,
        changeKind: "documentation" as const
      }))
    });
    const tooLong = buildPatchProposalCreationPreview({
      ...safeInput(),
      changeDescriptionSummary: "x".repeat(700)
    });

    expect(tooMany.status).toBe("blocked");
    expect(tooMany.warningCodes).toContain("PATCH_PREVIEW_TOO_MANY_FILES");
    expect(tooLong.status).toBe("blocked");
    expect(tooLong.warningCodes).toContain(
      "PATCH_PREVIEW_DESCRIPTION_TOO_LONG"
    );
  });

  it("never returns raw source, raw diff, API keys, or apply instructions", () => {
    const preview = buildPatchProposalCreationPreview(safeInput());
    const serialized = JSON.stringify(preview);

    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("rawPatch");
    expect(serialized).not.toContain("stdout");
    expect(serialized).not.toContain("stderr");
    expect(preview.applyEnabled).toBe(false);
    expect(preview.nextAction).toContain("Apply is disabled");
  });
});
