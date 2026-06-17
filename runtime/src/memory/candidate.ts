import { createMemoryHash } from "./summary.js";
import {
  type MemoryCandidate,
  type MemoryProvenance,
  type MemoryRecord,
  type MemorySource,
  type MemoryTrustLevel,
  type MemoryType
} from "./types.js";

export function createMemoryCandidate(
  input: Omit<MemoryCandidate, "candidateId" | "createdAt"> & {
    candidateId?: string;
    createdAt?: string;
  },
  defaults: {
    candidateId: string;
    now: string;
  }
): MemoryCandidate {
  const candidate: MemoryCandidate = {
    candidateId: input.candidateId ?? defaults.candidateId,
    proposedType: input.proposedType,
    proposedContent: input.proposedContent,
    proposedSummary: input.proposedSummary,
    proposedBy: input.proposedBy,
    source: input.source,
    trustLevel: input.trustLevel,
    namespace: input.namespace,
    scope: { ...input.scope },
    evidenceRefs: [...input.evidenceRefs],
    contextRefs: [...input.contextRefs],
    reason: input.reason,
    createdAt: input.createdAt ?? defaults.now,
    sensitivity: input.sensitivity
  };

  if (input.trigger !== undefined) {
    candidate.trigger = input.trigger;
  }
  if (input.mitigation !== undefined) {
    candidate.mitigation = input.mitigation;
  }
  if (input.agentRefs !== undefined) {
    candidate.agentRefs = [...input.agentRefs];
  }
  if (input.expiresAt !== undefined) {
    candidate.expiresAt = input.expiresAt;
  }
  if (input.tags !== undefined) {
    candidate.tags = [...input.tags].sort();
  }
  if (input.pinned !== undefined) {
    candidate.pinned = input.pinned;
  }
  if (input.provenance !== undefined) {
    candidate.provenance = cloneProvenance(input.provenance);
  }

  return candidate;
}

export function memoryRecordFromCandidate(
  candidate: MemoryCandidate,
  input: {
    memoryId: string;
    type: MemoryType;
    now: string;
  }
): MemoryRecord {
  const provenance =
    candidate.provenance ??
    ({
      source: candidate.source,
      actor: candidate.proposedBy,
      refs: []
    } as MemoryProvenance);
  const hash = createMemoryHash({
    type: input.type,
    namespace: candidate.namespace,
    scope: candidate.scope,
    content: candidate.proposedContent,
    summary: candidate.proposedSummary,
    trustLevel: candidate.trustLevel as MemoryTrustLevel,
    provenance
  });
  const record: MemoryRecord = {
    memoryId: input.memoryId,
    type: input.type,
    namespace: candidate.namespace,
    scope: { ...candidate.scope },
    content: candidate.proposedContent,
    summary: candidate.proposedSummary,
    provenance: cloneProvenance(provenance),
    trustLevel: candidate.trustLevel as MemoryTrustLevel,
    status: "committed",
    pinned: candidate.pinned ?? false,
    createdAt: input.now,
    tags: [...(candidate.tags ?? [])].sort(),
    evidenceRefs: [...candidate.evidenceRefs].sort(),
    contextRefs: [...candidate.contextRefs].sort(),
    agentRefs: [...(candidate.agentRefs ?? [])].sort(),
    hash,
    sensitivity: candidate.sensitivity
  };

  if (candidate.trigger !== undefined) {
    record.trigger = candidate.trigger;
  }
  if (candidate.mitigation !== undefined) {
    record.mitigation = candidate.mitigation;
  }
  if (candidate.expiresAt !== undefined) {
    record.expiresAt = candidate.expiresAt;
  }

  return record;
}

export function cloneMemoryCandidate(
  candidate: MemoryCandidate
): MemoryCandidate {
  return createMemoryCandidate(candidate, {
    candidateId: candidate.candidateId,
    now: candidate.createdAt
  });
}

export function cloneMemoryRecord(record: MemoryRecord): MemoryRecord {
  const clone: MemoryRecord = {
    memoryId: record.memoryId,
    type: record.type,
    namespace: record.namespace,
    scope: { ...record.scope },
    content: record.content,
    summary: record.summary,
    provenance: cloneProvenance(record.provenance),
    trustLevel: record.trustLevel,
    status: record.status,
    pinned: record.pinned,
    createdAt: record.createdAt,
    tags: [...record.tags],
    evidenceRefs: [...record.evidenceRefs],
    contextRefs: [...record.contextRefs],
    agentRefs: [...record.agentRefs],
    hash: record.hash,
    sensitivity: record.sensitivity
  };

  if (record.trigger !== undefined) {
    clone.trigger = record.trigger;
  }
  if (record.mitigation !== undefined) {
    clone.mitigation = record.mitigation;
  }
  if (record.updatedAt !== undefined) {
    clone.updatedAt = record.updatedAt;
  }
  if (record.expiresAt !== undefined) {
    clone.expiresAt = record.expiresAt;
  }
  if (record.revokedAt !== undefined) {
    clone.revokedAt = record.revokedAt;
  }
  if (record.supersedes !== undefined) {
    clone.supersedes = [...record.supersedes];
  }
  if (record.supersededBy !== undefined) {
    clone.supersededBy = record.supersededBy;
  }

  return clone;
}

function cloneProvenance(provenance: MemoryProvenance): MemoryProvenance {
  const clone: MemoryProvenance = {
    source: provenance.source as MemorySource,
    refs: [...provenance.refs]
  };
  if (provenance.sourceId !== undefined) {
    clone.sourceId = provenance.sourceId;
  }
  if (provenance.actor !== undefined) {
    clone.actor = provenance.actor;
  }
  return clone;
}
