import { describe, expect, it } from "vitest";

import {
  buildMemoryRecallPreview,
  summarizeMemoryRecallPreview,
  validateMemoryRecallPreviewInput,
  type MemoryRecallPreviewInput,
  type SyntheticMemorySummaryForRecallPreview
} from "../src/memory/index.js";

function baseInput(
  memories: SyntheticMemorySummaryForRecallPreview[] = []
): MemoryRecallPreviewInput {
  return {
    intent: "code_change",
    objectiveSummary: "Update workspace index and patch preview safety",
    acceptanceCriteriaCount: 2,
    namespace: "demo",
    tags: ["code_change", "workspace"],
    runDraftRef: "run-draft-preview-1",
    workspaceIndexRef: "workspace-index-summary-1",
    contextSummaryRef: "context-summary-1",
    createdAt: "2026-06-24T00:00:00.000Z",
    syntheticMemorySummaries: memories
  };
}

const validMemories: SyntheticMemorySummaryForRecallPreview[] = [
  {
    memoryId: "mem-policy",
    type: "policy",
    namespace: "demo",
    trustLevel: "workspace_rule",
    summary: "Workspace patch previews must stay summary only.",
    tags: ["code_change", "workspace"],
    provenanceRefCount: 1,
    evidenceRefCount: 1,
    status: "committed",
    updatedAt: "2026-06-23T00:00:00.000Z",
    pinned: true
  },
  {
    memoryId: "mem-fact",
    type: "project_fact",
    namespace: "demo",
    trustLevel: "verified_tool_result",
    summary: "Workspace index summaries connect to patch preview refs.",
    tags: ["workspace"],
    provenanceRefCount: 1,
    evidenceRefCount: 0,
    status: "committed",
    updatedAt: "2026-06-22T00:00:00.000Z"
  },
  {
    memoryId: "mem-pitfall",
    type: "pitfall",
    namespace: "demo",
    trustLevel: "user_correction",
    summary: "Patch preview should not imply file writes.",
    tags: ["patch"],
    provenanceRefCount: 0,
    evidenceRefCount: 1,
    trigger: "patch preview write wording",
    status: "committed",
    updatedAt: "2026-06-21T00:00:00.000Z"
  }
];

describe("runtime memory recall preview helper", () => {
  it("returns empty before a local run draft summary exists", () => {
    const preview = buildMemoryRecallPreview();

    expect(preview.status).toBe("empty");
    expect(preview.itemCount).toBe(0);
    expect(preview.source).toBe("runtime_memory_core_preview");
    expect(preview.nextAction).toContain("Preview a local run draft first");
    expect(preview.persistenceConnected).toBe(false);
    expect(preview.eventWritesEnabled).toBe(false);
    expect(preview.memoryWritesEnabled).toBe(false);
  });

  it("returns zero preview when persistence is not connected", () => {
    const preview = buildMemoryRecallPreview(baseInput());

    expect(preview.status).toBe("empty");
    expect(preview.itemCount).toBe(0);
    expect(preview.nextAction).toContain(
      "desktop persistence is not connected"
    );
    expect(preview.previewOnly).toBe(true);
  });

  it("recalls valid policy, project_fact, and pitfall summaries", () => {
    const preview = buildMemoryRecallPreview(baseInput(validMemories));

    expect(preview.status).toBe("preview");
    expect(preview.itemCount).toBe(3);
    expect(preview.policyCount).toBe(1);
    expect(preview.projectFactCount).toBe(1);
    expect(preview.pitfallCount).toBe(1);
    expect(preview.highTrustCount).toBe(3);
    expect(preview.volatileTailCount).toBe(3);
    expect(
      preview.items.every((item) => item.placement === "volatile_tail")
    ).toBe(true);
    expect(JSON.stringify(preview)).not.toContain("full content");
  });

  it("filters policy trust, project_fact evidence, pitfall trigger, and revoked statuses", () => {
    const preview = buildMemoryRecallPreview(
      baseInput([
        {
          memoryId: "bad-policy",
          type: "policy",
          namespace: "demo",
          trustLevel: "external_untrusted",
          summary: "Untrusted policy should not appear.",
          status: "committed"
        },
        {
          memoryId: "bad-fact",
          type: "project_fact",
          namespace: "demo",
          trustLevel: "verified_tool_result",
          summary: "Fact without evidence should not appear.",
          status: "committed"
        },
        {
          memoryId: "bad-pitfall",
          type: "pitfall",
          namespace: "demo",
          trustLevel: "user_correction",
          summary: "Pitfall without trigger should not appear.",
          evidenceRefCount: 1,
          status: "committed"
        },
        {
          memoryId: "revoked",
          type: "project_fact",
          namespace: "demo",
          trustLevel: "verified_tool_result",
          summary: "Revoked memory should not appear.",
          evidenceRefCount: 1,
          status: "revoked"
        },
        ...validMemories
      ])
    );

    expect(preview.items.map((item) => item.memoryId)).toEqual([
      "mem-policy",
      "mem-fact",
      "mem-pitfall"
    ]);
  });

  it("allows candidate_preview only when explicitly allowed", () => {
    const memory: SyntheticMemorySummaryForRecallPreview = {
      memoryId: "candidate-preview",
      type: "project_fact",
      namespace: "demo",
      trustLevel: "verified_tool_result",
      summary: "Candidate preview has evidence and remains volatile.",
      evidenceRefCount: 1,
      status: "candidate_preview"
    };

    expect(buildMemoryRecallPreview(baseInput([memory])).itemCount).toBe(0);
    const allowed = buildMemoryRecallPreview({
      ...baseInput([memory]),
      allowCandidatePreview: true
    });
    expect(allowed.itemCount).toBe(1);
    expect(allowed.items[0]?.warningCodes).toContain(
      "MEMORY_RECALL_CANDIDATE_PREVIEW"
    );
  });

  it("sorts deterministically by score, type priority, and memory id", () => {
    const first = buildMemoryRecallPreview(
      baseInput([
        {
          memoryId: "mem-z",
          type: "project_fact",
          namespace: "demo",
          trustLevel: "verified_tool_result",
          summary: "workspace index patch preview",
          evidenceRefCount: 1,
          status: "committed"
        },
        {
          memoryId: "mem-a",
          type: "policy",
          namespace: "demo",
          trustLevel: "workspace_rule",
          summary: "workspace index patch preview",
          evidenceRefCount: 1,
          status: "committed"
        }
      ])
    );
    const second = buildMemoryRecallPreview(
      baseInput([
        ...(first.items.map((item) => ({
          memoryId: item.memoryId,
          type: item.type,
          namespace: item.namespace,
          trustLevel: item.trustLevel,
          summary: item.summary,
          evidenceRefCount: item.evidenceRefCount,
          status: "committed"
        })) as SyntheticMemorySummaryForRecallPreview[])
      ])
    );

    expect(first.items.map((item) => item.memoryId)).toEqual([
      "mem-a",
      "mem-z"
    ]);
    expect(second.items.map((item) => item.memoryId)).toEqual([
      "mem-a",
      "mem-z"
    ]);
    expect(summarizeMemoryRecallPreview(first).hash).toBe(
      summarizeMemoryRecallPreview(second).hash
    );
  });

  it("blocks raw fields, API keys, and raw markers without returning them", () => {
    const secret = "sk-test1234567890abcdef";
    const unsafeMemory = {
      memoryId: "unsafe",
      type: "project_fact",
      namespace: "demo",
      trustLevel: "verified_tool_result",
      summary: `rawPrompt rawDom rawCsv ${secret}`,
      evidenceRefCount: 1,
      status: "committed",
      content: "do not keep"
    } as unknown as SyntheticMemorySummaryForRecallPreview;
    const unsafe = {
      ...baseInput([unsafeMemory]),
      rawMemory: "do not keep"
    } as unknown as MemoryRecallPreviewInput & Record<string, unknown>;

    const validation = validateMemoryRecallPreviewInput(unsafe);
    const preview = buildMemoryRecallPreview(unsafe);
    const serialized = JSON.stringify(preview);

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toEqual(
      expect.arrayContaining(["MEMORY_RECALL_RAW_FIELD_REJECTED"])
    );
    expect(preview.status).toBe("blocked");
    expect(preview.warnings.map((warning) => warning.code)).toContain(
      "MEMORY_RECALL_ITEM_SKIPPED_FOR_SAFETY"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt rawDom rawCsv");
    expect(serialized).not.toContain("do not keep");
  });

  it("keeps output summary-only and never connects persistence or events", () => {
    const preview = buildMemoryRecallPreview(baseInput(validMemories));
    const serialized = JSON.stringify(preview);

    expect(serialized).not.toContain("proposedContent");
    expect(serialized).not.toContain("content");
    expect(preview.persistenceConnected).toBe(false);
    expect(preview.eventWritesEnabled).toBe(false);
    expect(preview.memoryWritesEnabled).toBe(false);
    expect(preview.frozenPrefixIncluded).toBe(false);
  });
});
