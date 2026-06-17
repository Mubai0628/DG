import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ContextLedgerV2,
  InMemoryEventStore,
  createInMemoryMemoryStore,
  evaluateMemoryCandidate,
  memoryRecallToContextSegments,
  summarizeMemoryRefsForDossier,
  type MemoryCandidate,
  type MemoryRecord
} from "../src/index.js";

const now = "2026-01-01T00:00:00.000Z";

function eventStore(): InMemoryEventStore {
  let id = 0;
  return new InMemoryEventStore({
    clock: () => new Date(now),
    idFactory: () => {
      id += 1;
      return `event-${id}`;
    }
  });
}

function memoryStore() {
  let memoryId = 0;
  let candidateId = 0;
  return createInMemoryMemoryStore({
    eventStore: eventStore(),
    clock: () => new Date(now),
    memoryIdFactory: () => {
      memoryId += 1;
      return `mem-${memoryId}`;
    },
    candidateIdFactory: () => {
      candidateId += 1;
      return `candidate-${candidateId}`;
    }
  });
}

function candidate(overrides: Partial<MemoryCandidate> = {}): MemoryCandidate {
  return {
    candidateId: "candidate-1",
    proposedType: "policy",
    proposedContent: "Keep bridge transport disabled by default.",
    proposedSummary: "Bridge transport remains disabled by default.",
    proposedBy: "user",
    source: "user",
    trustLevel: "explicit_user",
    namespace: "deepseek-gui",
    scope: { kind: "workspace", id: "D:/DeskTopGUI/DeepSeekGUI" },
    evidenceRefs: [],
    contextRefs: [],
    reason: "User confirmed release boundary",
    createdAt: now,
    sensitivity: "internal",
    provenance: {
      source: "user",
      actor: "user",
      refs: ["turn-1"]
    },
    ...overrides
  };
}

function commit(store = memoryStore(), input = candidate()): MemoryRecord {
  const stored = store.putCandidate(input);
  return store.commitCandidate(stored.candidateId);
}

describe("Memory Core commit gate", () => {
  it("commits user-confirmed policy candidates", () => {
    const store = memoryStore();
    const record = commit(store);

    expect(record).toMatchObject({
      memoryId: "mem-1",
      type: "policy",
      status: "committed",
      trustLevel: "explicit_user",
      namespace: "deepseek-gui"
    });
    expect(store.getMemory(record.memoryId)?.summary).toBe(
      "Bridge transport remains disabled by default."
    );
  });

  it("rejects model-suggested policy candidates", () => {
    const decision = evaluateMemoryCandidate(
      candidate({
        source: "model",
        trustLevel: "model_suggested",
        provenance: { source: "model", refs: ["assistant-summary"] }
      })
    );

    expect(decision.status).toBe("rejected");
    expect(decision.reasonCodes).toEqual(
      expect.arrayContaining([
        "policy_source_rejected",
        "policy_trust_rejected"
      ])
    );
  });

  it("rejects browser and external-untrusted policy candidates", () => {
    const decision = evaluateMemoryCandidate(
      candidate({
        source: "browser",
        trustLevel: "external_untrusted",
        provenance: { source: "browser", refs: ["tab-1"] }
      })
    );

    expect(decision.status).toBe("rejected");
    expect(decision.reasonCodes).toEqual(
      expect.arrayContaining([
        "policy_source_rejected",
        "policy_trust_rejected"
      ])
    );
  });

  it("rejects project facts without evidence or context refs", () => {
    const decision = evaluateMemoryCandidate(
      candidate({
        proposedType: "project_fact",
        proposedContent: "The desktop shell has a preflight command.",
        proposedSummary: "Desktop shell has a preflight command.",
        source: "repository",
        trustLevel: "repository_rule",
        provenance: { source: "repository", refs: ["docs-index"] }
      })
    );

    expect(decision.status).toBe("rejected");
    expect(decision.reasonCodes).toContain("project_fact_requires_evidence");
  });

  it("rejects pitfalls without trigger or mitigation", () => {
    const decision = evaluateMemoryCandidate(
      candidate({
        proposedType: "pitfall",
        proposedContent: "Parallel pnpm tests can overlap.",
        proposedSummary: "Parallel pnpm tests can overlap.",
        source: "eval",
        trustLevel: "eval_failure",
        evidenceRefs: ["test-run-1"],
        provenance: { source: "eval", refs: ["test-run-1"] }
      })
    );

    expect(decision.status).toBe("rejected");
    expect(decision.reasonCodes).toEqual(
      expect.arrayContaining([
        "pitfall_requires_trigger",
        "pitfall_requires_mitigation"
      ])
    );
  });

  it("allows verified project facts and tool/eval pitfalls with evidence", () => {
    const projectFact = evaluateMemoryCandidate(
      candidate({
        proposedType: "project_fact",
        proposedContent: "Agent dossiers carry memory references only.",
        proposedSummary: "Agent dossiers carry memory references only.",
        source: "repository",
        trustLevel: "repository_rule",
        contextRefs: ["agent-dossier-doc"],
        provenance: { source: "repository", refs: ["agent-dossier-doc"] }
      })
    );
    const pitfall = evaluateMemoryCandidate(
      candidate({
        proposedType: "pitfall",
        proposedContent: "A stale generated report can confuse QA.",
        proposedSummary: "Generated reports can confuse QA if not ignored.",
        source: "eval",
        trustLevel: "eval_failure",
        evidenceRefs: ["eval-report"],
        trigger: "Generated eval report appears in status",
        mitigation: "Keep eval reports ignored and summarize only",
        provenance: { source: "eval", refs: ["eval-report"] }
      })
    );

    expect(projectFact.status).toBe("approved");
    expect(pitfall.status).toBe("approved");
  });

  it("keeps model-suggested project facts as approval-required candidates", () => {
    const decision = evaluateMemoryCandidate(
      candidate({
        proposedType: "project_fact",
        proposedContent: "A model observed that app QA exists.",
        proposedSummary: "App QA exists.",
        source: "model",
        trustLevel: "model_suggested",
        evidenceRefs: ["qa-log"],
        provenance: { source: "model", refs: ["qa-log"] }
      })
    );

    expect(decision.status).toBe("approval_required");
    expect(decision.reasonCodes).toContain("explicit_approval_required");
  });

  it("rejects duplicate committed memory", () => {
    const store = memoryStore();
    const first = commit(store);
    const duplicate = evaluateMemoryCandidate(candidate(), {
      existingMemories: [first]
    });

    expect(duplicate.status).toBe("rejected");
    expect(duplicate.reasonCodes).toContain("duplicate_memory");
  });

  it("rejects sensitive markers and API-key-like content", () => {
    const rawMarker = evaluateMemoryCandidate(
      candidate({
        proposedContent: "rawPrompt should never be memorized.",
        proposedSummary: "Rejected raw prompt marker."
      })
    );
    const apiKeyMarker = evaluateMemoryCandidate(
      candidate({
        proposedContent: "Never store sk-test1234567890abcdef in memory.",
        proposedSummary: "Rejected API key marker."
      })
    );

    expect(rawMarker.reasonCodes).toContain("sensitive_marker_rejected");
    expect(apiKeyMarker.reasonCodes).toContain("sensitive_marker_rejected");
  });

  it("rejects candidates that try to write frozen prefix directly", () => {
    const decision = evaluateMemoryCandidate(
      candidate({
        reason: "set frozen_prefix immutable_rules directly"
      })
    );

    expect(decision.status).toBe("rejected");
    expect(decision.reasonCodes).toContain("frozen_prefix_write_rejected");
  });
});

describe("Memory store events and recall", () => {
  it("keeps committed memory events summary-only", () => {
    const events = eventStore();
    const store = createInMemoryMemoryStore({
      eventStore: events,
      clock: () => new Date(now),
      memoryIdFactory: () => "mem-1",
      candidateIdFactory: () => "candidate-1"
    });
    const record = commit(
      store,
      candidate({
        proposedContent: "Private full content for event redaction.",
        proposedSummary: "Safe memory summary."
      })
    );
    const serialized = JSON.stringify(events.listEvents());

    expect(record.content).toContain("Private full content");
    expect(serialized).toContain("mem-1");
    expect(serialized).toContain("memory.committed");
    expect(serialized).not.toContain("Private full content");
    expect(serialized).not.toContain("Safe memory summary.");
  });

  it("recalls summaries and references without full content", () => {
    const store = memoryStore();
    commit(
      store,
      candidate({
        proposedContent: "Full memory content about preflight internals.",
        proposedSummary: "Preflight should remain explicit.",
        tags: ["preflight"]
      })
    );

    const recall = store.recallMemories({
      namespace: "deepseek-gui",
      text: "preflight explicit",
      maxResults: 5,
      now
    });
    const serialized = JSON.stringify(recall);

    expect(recall.items).toHaveLength(1);
    expect(recall.items[0]).toMatchObject({
      memoryId: "mem-1",
      summary: "Preflight should remain explicit.",
      volatilePlacement: true
    });
    expect(serialized).not.toContain("Full memory content");
  });

  it("excludes expired and revoked memories by default", () => {
    const store = memoryStore();
    const expired = commit(
      store,
      candidate({
        candidateId: "candidate-expired",
        proposedContent: "Expired memory content.",
        proposedSummary: "Expired memory summary."
      })
    );
    const revoked = commit(
      store,
      candidate({
        candidateId: "candidate-revoked",
        proposedContent: "Revoked memory content.",
        proposedSummary: "Revoked memory summary."
      })
    );

    store.expireMemory(expired.memoryId, now);
    store.revokeMemory(revoked.memoryId, "superseded");

    const recall = store.recallMemories({
      namespace: "deepseek-gui",
      now,
      maxResults: 10
    });

    expect(recall.items).toEqual([]);
  });

  it("boosts pinned memory and keeps deterministic recall order", () => {
    const store = memoryStore();
    commit(
      store,
      candidate({
        candidateId: "candidate-pinned",
        proposedContent: "Pinned preflight policy content.",
        proposedSummary: "Pinned preflight policy summary.",
        pinned: true,
        tags: ["preflight"]
      })
    );
    commit(
      store,
      candidate({
        candidateId: "candidate-normal",
        proposedContent: "Normal preflight policy content.",
        proposedSummary: "Normal preflight policy summary.",
        tags: ["preflight"]
      })
    );

    const first = store.recallMemories({
      namespace: "deepseek-gui",
      text: "preflight policy",
      now,
      maxResults: 10
    });
    const second = store.recallMemories({
      namespace: "deepseek-gui",
      text: "preflight policy",
      now,
      maxResults: 10
    });

    expect(first.items.map((item) => item.memoryId)).toEqual([
      "mem-1",
      "mem-2"
    ]);
    expect(second.items.map((item) => item.memoryId)).toEqual(
      first.items.map((item) => item.memoryId)
    );
    expect(first.items[0]!.score).toBeGreaterThan(first.items[1]!.score);
  });

  it("updates status when revoking and expiring memories", () => {
    const store = memoryStore();
    const revoked = commit(
      store,
      candidate({ candidateId: "candidate-revoke" })
    );
    const expired = commit(
      store,
      candidate({
        candidateId: "candidate-expire",
        proposedContent: "Temporary policy content.",
        proposedSummary: "Temporary policy summary."
      })
    );

    expect(store.revokeMemory(revoked.memoryId, "manual").status).toBe(
      "revoked"
    );
    expect(store.expireMemory(expired.memoryId, now).status).toBe("expired");
  });
});

describe("Memory integration", () => {
  it("converts recall results to volatile-tail context segments", () => {
    const store = memoryStore();
    commit(
      store,
      candidate({
        proposedContent: "Full content about volatile memory placement.",
        proposedSummary: "Memory recall stays volatile.",
        tags: ["context"]
      })
    );
    const recall = store.recallMemories({
      namespace: "deepseek-gui",
      text: "volatile memory",
      now
    });

    const segments = memoryRecallToContextSegments(recall);

    expect(segments).toEqual([
      expect.objectContaining({
        layer: "volatile_tail",
        source: "memory_recall",
        placement: "volatile_tail",
        content: "policy: Memory recall stays volatile."
      })
    ]);
    expect(JSON.stringify(segments)).not.toContain("Full content");
  });

  it("does not change the global frozen prefix hash when recalled memory is assembled", () => {
    const ledger = new ContextLedgerV2({
      clock: () => new Date(now)
    });
    ledger.addSegment({
      id: "immutable-rule",
      layer: "immutable_rules",
      title: "Immutable rule",
      content: "Stable system rule",
      source: "system",
      immutable: true
    });
    const before = ledger.assemble({ logEvents: false });
    const store = memoryStore();
    commit(
      store,
      candidate({
        proposedContent: "Full content about context placement.",
        proposedSummary: "Context placement remains volatile.",
        tags: ["context"]
      })
    );
    const [segment] = memoryRecallToContextSegments(
      store.recallMemories({
        namespace: "deepseek-gui",
        text: "context placement",
        now
      })
    );
    ledger.addSegment(segment!);
    const after = ledger.assemble({ previousReport: before, logEvents: false });

    expect(after.hashSummary.globalFrozenPrefixHash).toBe(
      before.hashSummary.globalFrozenPrefixHash
    );
    expect(after.segmentCountByLayer.volatile_tail).toBe(1);
  });

  it("returns memory refs and summaries for dossiers without raw content", () => {
    const store = memoryStore();
    const record = commit(
      store,
      candidate({
        proposedContent: "Full content that should not enter a dossier.",
        proposedSummary: "Safe dossier memory summary."
      })
    );

    const dossierMemory = summarizeMemoryRefsForDossier(
      [record.memoryId],
      store
    );
    const serialized = JSON.stringify(dossierMemory);

    expect(dossierMemory.memoryRefs).toEqual([
      { id: "mem-1", kind: "memory_ref" }
    ]);
    expect(serialized).toContain("Safe dossier memory summary.");
    expect(serialized).not.toContain("Full content");
  });

  it("does not use filesystem or network APIs in runtime memory source", () => {
    const repoRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      ".."
    );
    const memoryDir = path.join(repoRoot, "src", "memory");
    const source = readdirSync(memoryDir)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => readFileSync(path.join(memoryDir, file), "utf8"))
      .join("\n");

    expect(source).not.toMatch(/from "node:fs"|from 'node:fs'/);
    expect(source).not.toMatch(
      /fetch\s*\(|XMLHttpRequest|createServer|listen\(/
    );
    expect(source).not.toMatch(/sqlite|vector|embedding/i);
  });
});
