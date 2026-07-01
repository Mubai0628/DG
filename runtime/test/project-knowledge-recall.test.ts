import { describe, expect, it } from "vitest";

import {
  buildProjectKnowledgeRecall,
  buildProjectKnowledgeStoreSnapshot,
  summarizeProjectKnowledgeRecall,
  validateProjectKnowledgeEntry,
  type ProjectKnowledgeEntry,
  type ProjectKnowledgeRecallResult,
  type ProjectKnowledgeStoreSnapshot
} from "../src/index.js";

const now = "2026-06-30T00:00:00.000Z";

function evidence(overrides: Record<string, unknown> = {}) {
  return {
    refId: "evidence-1",
    kind: "repo_doc",
    summary:
      "Repository docs describe the summary-only project knowledge fact.",
    hashPrefix: "abc12345",
    warningCodes: [],
    ...overrides
  };
}

function trust(overrides: Record<string, unknown> = {}) {
  return {
    score: 0.92,
    level: "trusted",
    humanReviewed: true,
    reviewedBy: "manual_user_preview",
    ...overrides
  };
}

function provenance(overrides: Record<string, unknown> = {}) {
  return {
    sourceKind: "human_reviewed",
    sourceId: "turn-summary",
    actor: "manual_user_preview",
    summary: "Human-reviewed summary-only provenance.",
    refHashes: ["prov12345"],
    ...overrides
  };
}

function entry(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    entryId: "pk-fact-1",
    type: "project_fact",
    namespace: "deepseek-gui",
    summary:
      "Tauri project knowledge commands use fixed command wrappers and summary-only responses.",
    status: "committed",
    trust: trust(),
    provenance: provenance(),
    evidenceRefs: [evidence()],
    tags: ["p0t", "project-knowledge"],
    createdAt: now,
    updatedAt: now,
    pinned: false,
    entryHash: "entryhash123",
    factKind: "app_boundary",
    ...overrides
  };
}

function validatedEntry(
  overrides: Record<string, unknown> = {}
): ProjectKnowledgeEntry {
  const result = validateProjectKnowledgeEntry(entry(overrides), { now });
  expect(result.status).toBe("valid");
  expect(result.entry).toBeDefined();
  return result.entry!;
}

function recordFrom(entryValue: ProjectKnowledgeEntry, recordId: string) {
  return {
    recordId,
    recordKind: "entry" as const,
    entry: entryValue,
    createdAt: now,
    recordHash: `${recordId}hash`
  };
}

function snapshot(
  entries: ProjectKnowledgeEntry[]
): ProjectKnowledgeStoreSnapshot {
  return buildProjectKnowledgeStoreSnapshot(
    entries.map((item, index) => recordFrom(item, `record-${index + 1}`)),
    { now }
  );
}

function expectNoExecution(result: ProjectKnowledgeRecallResult): void {
  expect(result.readiness).toMatchObject({
    canMutateProjectKnowledge: false,
    canCommitMemory: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("project knowledge recall integration", () => {
  it("recalls project facts by task objective into volatile_tail", () => {
    const storeSnapshot = snapshot([validatedEntry()]);
    const result = buildProjectKnowledgeRecall({
      snapshot: storeSnapshot,
      taskObjective: "Use Tauri project knowledge command wrappers safely.",
      intent: "code_change",
      workspaceRefs: ["app/src/App.tsx"],
      tags: ["project-knowledge"]
    });

    expect(result.status).toBe("recall_ready");
    expect(result.matchedEntries).toHaveLength(1);
    expect(result.matchedEntries[0]?.type).toBe("project_fact");
    expect(result.matchedEntries[0]?.placement).toBe("volatile_tail");
    expect(result.contextSegmentRefs[0]).toMatchObject({
      layer: "volatile_tail",
      placement: "volatile_tail"
    });
    expect(result.readiness.canEnterContextAssembly).toBe(true);
    expectNoExecution(result);
  });

  it("recalls pitfalls by trigger summary", () => {
    const storeSnapshot = snapshot([
      validatedEntry({
        entryId: "pk-pitfall-1",
        type: "pitfall",
        summary:
          "Pitfall: committing model-proposed project knowledge without review pollutes future recall.",
        triggerSummary: "A model proposes long-term project knowledge.",
        mitigationSummary: "Keep the candidate pending until human review.",
        severity: "medium",
        entryHash: "pitfallhash123"
      })
    ]);
    const result = buildProjectKnowledgeRecall({
      snapshot: storeSnapshot,
      taskObjective: "Avoid project knowledge pollution from model proposals.",
      intent: "code_change",
      tags: ["pitfall"]
    });

    expect(result.status).toBe("recall_ready");
    expect(result.matchedEntries[0]?.type).toBe("pitfall");
    expect(result.matchedEntries[0]?.reasonCodes.join(",")).toContain(
      "matched:project"
    );
    expectNoExecution(result);
  });

  it("requires explicit human-reviewed policy recall before workspace rules placement", () => {
    const storeSnapshot = snapshot([
      validatedEntry({
        entryId: "pk-policy-1",
        type: "policy",
        summary:
          "Policy: project knowledge recall may only add summary refs to workspace rules.",
        policyScope: "project",
        sourceKind: "human_reviewed",
        entryHash: "policyhash123"
      })
    ]);
    const missingReview = buildProjectKnowledgeRecall({
      snapshot: storeSnapshot,
      taskObjective:
        "Apply project knowledge recall policy in context assembly.",
      intent: "code_change",
      policyRecallEnabled: true
    });
    const reviewed = buildProjectKnowledgeRecall({
      snapshot: storeSnapshot,
      taskObjective:
        "Apply project knowledge recall policy in context assembly.",
      intent: "code_change",
      policyRecallEnabled: true,
      humanReviewedPolicyEntryIds: ["pk-policy-1"]
    });

    expect(missingReview.status).toBe("warning");
    expect(missingReview.matchedEntries).toHaveLength(0);
    expect(missingReview.findings.map((finding) => finding.code)).toContain(
      "POLICY_RECALL_HUMAN_REVIEW_REQUIRED"
    );
    expect(reviewed.status).toBe("recall_ready");
    expect(reviewed.matchedEntries[0]?.placement).toBe(
      "workspace_rules_summary"
    );
    expect(reviewed.contextSegmentRefs[0]).toMatchObject({
      layer: "workspace_rules",
      placement: "workspace_rules_summary"
    });
    expectNoExecution(reviewed);
  });

  it("does not recall revoked or expired entries", () => {
    const storeSnapshot = snapshot([
      validatedEntry({
        entryId: "pk-revoked-1",
        status: "revoked",
        revokedAt: now,
        entryHash: "revokedhash123"
      }),
      validatedEntry({
        entryId: "pk-expired-1",
        status: "expired",
        expiresAt: now,
        entryHash: "expiredhash123"
      })
    ]);
    const result = buildProjectKnowledgeRecall({
      snapshot: storeSnapshot,
      taskObjective: "Use Tauri project knowledge command wrappers safely.",
      intent: "code_change",
      tags: ["project-knowledge"]
    });

    expect(result.status).toBe("empty");
    expect(result.matchedEntries).toHaveLength(0);
    expectNoExecution(result);
  });

  it("recalls pinned entries even when their expiry timestamp has passed", () => {
    const storeSnapshot = snapshot([
      validatedEntry({
        entryId: "pk-pinned-1",
        summary:
          "Pinned project knowledge for command wrappers remains recallable.",
        expiresAt: "2026-01-01T00:00:00.000Z",
        pinned: true,
        entryHash: "pinnedhash123"
      })
    ]);
    const result = buildProjectKnowledgeRecall({
      snapshot: storeSnapshot,
      taskObjective: "Reuse pinned project knowledge command wrapper guidance.",
      intent: "code_change"
    });

    expect(result.status).toBe("recall_ready");
    expect(result.matchedEntries[0]?.entryId).toBe("pk-pinned-1");
    expectNoExecution(result);
  });

  it("blocks raw content input without echoing it", () => {
    const rawKey = ["raw", "Prompt"].join("");
    const secretText = "Synthetic raw project knowledge recall text.";
    const storeSnapshot = snapshot([validatedEntry()]);
    const result = buildProjectKnowledgeRecall({
      snapshot: storeSnapshot,
      taskObjective: "Use project knowledge command wrappers.",
      [rawKey]: secretText
    } as unknown as Parameters<typeof buildProjectKnowledgeRecall>[0]);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.matchedEntries).toHaveLength(0);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "RAWPROMPT_FIELD_REJECTED"
    );
    expect(serialized).not.toContain(secretText);
    expectNoExecution(result);
  });

  it("summarizes recall without raw content and keeps deterministic ids", () => {
    const storeSnapshot = snapshot([validatedEntry()]);
    const input = {
      snapshot: storeSnapshot,
      taskObjective: "Use Tauri project knowledge command wrappers safely.",
      intent: "code_change",
      tags: ["project-knowledge"],
      idGenerator: () => "project-knowledge-recall-fixed"
    };
    const first = buildProjectKnowledgeRecall(input);
    const second = buildProjectKnowledgeRecall(input);
    const summary = summarizeProjectKnowledgeRecall(first);
    const serialized = JSON.stringify({ first, summary });

    expect(first.recallId).toBe("project-knowledge-recall-fixed");
    expect(first.recallHash).toBe(second.recallHash);
    expect(summary.summaryOnly).toBe(true);
    expect(summary.matchedEntryCount).toBe(1);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("Authorization");
    expectNoExecution(first);
  });
});
