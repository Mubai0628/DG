import { createHash } from "node:crypto";

import {
  type MemoryCandidate,
  type MemoryRecord,
  type MemorySummary
} from "./types.js";

export function createMemoryHash(input: {
  type: string;
  namespace: string;
  scope: unknown;
  content: string;
  summary: string;
  trustLevel: string;
  provenance: unknown;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        type: input.type,
        namespace: input.namespace,
        scope: input.scope,
        content: input.content,
        summary: input.summary,
        trustLevel: input.trustLevel,
        provenance: input.provenance
      })
    )
    .digest("hex");
}

export function summarizeMemory(record: MemoryRecord): MemorySummary {
  return {
    memoryId: record.memoryId,
    type: record.type,
    namespace: record.namespace,
    scope: { ...record.scope },
    summary: record.summary,
    trustLevel: record.trustLevel,
    status: record.status,
    pinned: record.pinned,
    tags: [...record.tags].sort(),
    evidenceRefs: [...record.evidenceRefs].sort(),
    contextRefs: [...record.contextRefs].sort(),
    agentRefs: [...record.agentRefs].sort(),
    hash: record.hash
  };
}

export function candidateEventPayload(
  candidate: MemoryCandidate,
  status: "candidate" | "rejected",
  reasonCodes: readonly string[] = []
): Record<string, unknown> {
  return {
    candidateId: candidate.candidateId,
    type: candidate.proposedType,
    namespace: candidate.namespace,
    trustLevel: candidate.trustLevel,
    status,
    source: candidate.source,
    provenanceRefs: candidate.provenance?.refs ?? [],
    evidenceRefs: candidate.evidenceRefs,
    contextRefs: candidate.contextRefs,
    reasonCodes
  };
}

export function memoryEventPayload(
  record: MemoryRecord,
  extras: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    memoryId: record.memoryId,
    type: record.type,
    namespace: record.namespace,
    trustLevel: record.trustLevel,
    status: record.status,
    source: record.provenance.source,
    provenanceRefs: record.provenance.refs,
    evidenceRefs: record.evidenceRefs,
    contextRefs: record.contextRefs,
    hash: record.hash,
    ...extras
  };
}

export function safeMemoryFingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
