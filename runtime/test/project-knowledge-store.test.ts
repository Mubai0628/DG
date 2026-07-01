import { describe, expect, it } from "vitest";

import {
  buildProjectKnowledgeStoreSnapshot,
  summarizeProjectKnowledgeEntry,
  summarizeProjectKnowledgeStoreSnapshot,
  validateProjectKnowledgeCandidate,
  validateProjectKnowledgeEntry,
  type ProjectKnowledgeEntry,
  type ProjectKnowledgeEntryValidationResult,
  type ProjectKnowledgeStoreSnapshot
} from "../src/index.js";

const now = "2026-06-30T00:00:00.000Z";

function evidence(overrides: Record<string, unknown> = {}) {
  return {
    refId: "evidence-1",
    kind: "repo_doc",
    summary: "Repository documentation records the project knowledge rule.",
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
    summary: "Human-reviewed summary only provenance.",
    refHashes: ["prov12345"],
    ...overrides
  };
}

function entry(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    entryId: "pk-policy-1",
    type: "policy",
    namespace: "deepseek-gui",
    summary: "Project knowledge entries stay summary-only until reviewed.",
    status: "committed",
    trust: trust(),
    provenance: provenance(),
    evidenceRefs: [evidence()],
    tags: ["p0t", "memory"],
    createdAt: now,
    updatedAt: now,
    pinned: false,
    entryHash: "placeholderhash",
    policyScope: "workspace",
    sourceKind: "human_reviewed",
    ...overrides
  };
}

function resultCodes(
  result: ProjectKnowledgeEntryValidationResult | ProjectKnowledgeStoreSnapshot
): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(
  result: ProjectKnowledgeEntryValidationResult | ProjectKnowledgeStoreSnapshot
): void {
  expect(result.readiness).toMatchObject({
    canWriteStore: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
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

describe("project knowledge store contract", () => {
  it("accepts valid policy entries", () => {
    const result = validateProjectKnowledgeEntry(entry());

    expect(result.status).toBe("valid");
    expect(result.entry?.type).toBe("policy");
    expect(
      (result.entry as { sourceKind?: string } | undefined)?.sourceKind
    ).toBe("human_reviewed");
    expect(result.summary.summaryOnly).toBe(true);
    expect(result.summary.evidenceRefCount).toBe(1);
    expect(result.readiness.canEnterRecallIndex).toBe(true);
    expect(resultCodes(result)).not.toContain("ENTRY_HASH_GENERATED");
    expectNoExecution(result);
  });

  it("accepts valid project_fact entries with evidence", () => {
    const result = validateProjectKnowledgeEntry(
      entry({
        entryId: "pk-fact-1",
        type: "project_fact",
        summary: "The App Shell keeps project knowledge review separate.",
        factKind: "app_boundary",
        entryHash: "facthash123"
      })
    );

    expect(result.status).toBe("valid");
    expect(result.entry?.type).toBe("project_fact");
    expect(result.summary.evidenceRefCount).toBe(1);
    expectNoExecution(result);
  });

  it("accepts valid pitfall entries with trigger and mitigation", () => {
    const result = validateProjectKnowledgeEntry(
      entry({
        entryId: "pk-pitfall-1",
        type: "pitfall",
        summary: "Committing unreviewed memory can pollute future recall.",
        triggerSummary: "A model proposes long-term memory without review.",
        mitigationSummary: "Keep the candidate pending until explicit review.",
        severity: "medium",
        entryHash: "pitfallhash123"
      })
    );

    expect(result.status).toBe("valid");
    expect(result.entry?.type).toBe("pitfall");
    expectNoExecution(result);
  });

  it("blocks policy entries from model, tool, or external unreviewed sources", () => {
    const result = validateProjectKnowledgeEntry(
      entry({
        provenance: provenance({ sourceKind: "model_suggested" })
      })
    );

    expect(result.status).toBe("blocked");
    expect(resultCodes(result)).toContain("POLICY_UNREVIEWED_SOURCE_REJECTED");
    expect(result.entry).toBeUndefined();
    expectNoExecution(result);
  });

  it("blocks project facts without evidence refs", () => {
    const result = validateProjectKnowledgeEntry(
      entry({
        type: "project_fact",
        factKind: "missing_evidence",
        evidenceRefs: []
      })
    );

    expect(result.status).toBe("blocked");
    expect(resultCodes(result)).toContain("PROJECT_FACT_REQUIRES_EVIDENCE");
    expectNoExecution(result);
  });

  it("blocks pitfalls without trigger and mitigation", () => {
    const result = validateProjectKnowledgeEntry(
      entry({
        type: "pitfall",
        severity: "high"
      })
    );

    expect(result.status).toBe("blocked");
    expect(resultCodes(result)).toContain("PITFALL_REQUIRES_TRIGGER");
    expect(resultCodes(result)).toContain("PITFALL_REQUIRES_MITIGATION");
    expectNoExecution(result);
  });

  it("blocks forbidden raw fields without echoing raw content", () => {
    const result = validateProjectKnowledgeEntry({
      ...entry(),
      rawPrompt: "Synthetic raw prompt text must not appear in output."
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(resultCodes(result)).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(serialized).not.toContain(
      "Synthetic raw prompt text must not appear in output."
    );
    expectNoExecution(result);
  });

  it("blocks fake API key markers without echoing the marker", () => {
    const fakeKey = ["s", "k-fake-project-knowledge-secret"].join("");
    const result = validateProjectKnowledgeEntry(
      entry({
        summary: `Rejected fake key marker ${fakeKey}`
      })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(resultCodes(result)).toContain("API_KEY_MARKER");
    expect(serialized).not.toContain(fakeKey);
    expectNoExecution(result);
  });

  it("blocks duplicate entry ids in snapshots", () => {
    const first = validateProjectKnowledgeEntry(
      entry({ entryHash: "entryhash123" })
    ).entry;
    const second = validateProjectKnowledgeEntry(
      entry({ entryHash: "entryhash456" })
    ).entry;

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const snapshot = buildProjectKnowledgeStoreSnapshot([
      recordFrom(first!, "record-1"),
      recordFrom(second!, "record-2")
    ]);

    expect(snapshot.status).toBe("blocked");
    expect(resultCodes(snapshot)).toContain("DUPLICATE_ENTRY_ID");
    expect(snapshot.logicalFiles.entriesJsonl).toBe(
      ".deepseek-workbench/project-knowledge/entries.jsonl"
    );
    expectNoExecution(snapshot);
  });

  it("handles revoked and expired lifecycle states", () => {
    const revokedActive = validateProjectKnowledgeEntry(
      entry({
        entryHash: "revokedactive",
        revokedAt: now
      })
    );
    const expiredActive = validateProjectKnowledgeEntry(
      entry({
        entryHash: "expiredactive",
        expiresAt: "2026-01-01T00:00:00.000Z"
      }),
      { now }
    );
    const pinnedExpired = validateProjectKnowledgeEntry(
      entry({
        entryHash: "pinnedexpired",
        expiresAt: "2026-01-01T00:00:00.000Z",
        pinned: true
      }),
      { now }
    );

    expect(revokedActive.status).toBe("blocked");
    expect(resultCodes(revokedActive)).toContain("REVOKED_ACTIVE_STATUS");
    expect(expiredActive.status).toBe("blocked");
    expect(resultCodes(expiredActive)).toContain("EXPIRED_ACTIVE_STATUS");
    expect(pinnedExpired.status).toBe("valid");
    expectNoExecution(pinnedExpired);
  });

  it("keeps summaries summary-only", () => {
    const validated = validateProjectKnowledgeEntry(
      entry({
        entryHash: "summaryhash123"
      })
    );
    const summary = summarizeProjectKnowledgeEntry(validated.entry!);
    const snapshot = buildProjectKnowledgeStoreSnapshot([
      recordFrom(validated.entry!, "record-summary")
    ]);
    const snapshotSummary = summarizeProjectKnowledgeStoreSnapshot(snapshot);
    const serialized = JSON.stringify({ summary, snapshotSummary });

    expect(summary.summaryOnly).toBe(true);
    expect(snapshotSummary.summaryOnly).toBe(true);
    expect(serialized).toContain("Project knowledge entries stay summary-only");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("Authorization");
    expectNoExecution(snapshot);
  });

  it("keeps every execution readiness flag false", () => {
    const result = validateProjectKnowledgeEntry(
      entry({ entryHash: "readinesshash123" })
    );

    expect(result.readiness.canEnterRecallIndex).toBe(true);
    expectNoExecution(result);
  });

  it("generates deterministic candidate id and hash with injected id and clock", () => {
    const input = {
      ...entry({
        type: "project_fact",
        factKind: "deterministic_candidate",
        entryId: undefined,
        status: undefined,
        entryHash: undefined
      })
    };
    const options = {
      idGenerator: () => "candidate-generated",
      createdAt: now
    };
    const first = validateProjectKnowledgeCandidate(input, options);
    const second = validateProjectKnowledgeCandidate(input, options);

    expect(first.status).toBe("warning");
    expect(first.candidate?.candidateId).toBe("candidate-generated");
    expect(first.candidate?.candidateHash).toBe(
      second.candidate?.candidateHash
    );
    expect(first.normalizedHash).toBe(second.normalizedHash);
    expect(first.summary.summaryOnly).toBe(true);
    expect(first.readiness).toMatchObject({
      canWriteStore: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    });
  });
});
