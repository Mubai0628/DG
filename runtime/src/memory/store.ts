import { expireMemoryRecord, revokeMemoryRecord } from "./aging.js";
import {
  cloneMemoryCandidate,
  cloneMemoryRecord,
  createMemoryCandidate,
  memoryRecordFromCandidate
} from "./candidate.js";
import { evaluateMemoryCandidate, isMemoryType } from "./commit-gate.js";
import { MemoryCoreException } from "./errors.js";
import { recallMemories as recallFromRecords } from "./recall.js";
import {
  candidateEventPayload,
  memoryEventPayload,
  summarizeMemory
} from "./summary.js";
import {
  type MemoryCandidate,
  type MemoryCommitDecision,
  type MemoryRecallQuery,
  type MemoryRecallResult,
  type MemoryRecord,
  type MemoryStore,
  type MemoryStoreOptions,
  type MemorySummary
} from "./types.js";

export class InMemoryMemoryStore implements MemoryStore {
  private readonly candidates = new Map<string, MemoryCandidate>();
  private readonly memories = new Map<string, MemoryRecord>();
  private readonly clock: () => Date;
  private readonly candidateIdFactory: () => string;
  private readonly memoryIdFactory: () => string;

  constructor(private readonly options: MemoryStoreOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.candidateIdFactory =
      options.candidateIdFactory ?? defaultCandidateIdFactory();
    this.memoryIdFactory = options.memoryIdFactory ?? defaultMemoryIdFactory();
  }

  putCandidate(candidate: MemoryCandidate): MemoryCandidate {
    const normalized = createMemoryCandidate(candidate, {
      candidateId: candidate.candidateId ?? this.candidateIdFactory(),
      now: candidate.createdAt ?? this.now()
    });
    this.candidates.set(
      normalized.candidateId,
      cloneMemoryCandidate(normalized)
    );
    this.options.eventStore?.appendEvent({
      type: "memory.candidate.proposed",
      payload: candidateEventPayload(normalized, "candidate")
    });
    return cloneMemoryCandidate(normalized);
  }

  commitCandidate(
    candidateId: string,
    decision?: MemoryCommitDecision
  ): MemoryRecord {
    const candidate = this.candidates.get(candidateId);
    if (candidate === undefined) {
      throw new MemoryCoreException({
        kind: "candidate_not_found",
        code: "candidate_not_found",
        safeMessage: "Memory candidate was not found",
        candidateId
      });
    }

    const evaluated =
      decision ??
      evaluateMemoryCandidate(candidate, {
        existingMemories: this.listMemories(),
        ...(this.options.maxContentChars !== undefined
          ? { maxContentChars: this.options.maxContentChars }
          : {})
      });

    if (
      evaluated.status !== "approved" ||
      evaluated.proposedType === undefined
    ) {
      this.options.eventStore?.appendEvent({
        type: "memory.candidate.rejected",
        payload: candidateEventPayload(
          candidate,
          "rejected",
          evaluated.reasonCodes
        )
      });
      throw new MemoryCoreException({
        kind: "candidate_rejected",
        code:
          evaluated.status === "approval_required"
            ? "candidate_requires_approval"
            : "candidate_rejected",
        safeMessage: evaluated.safeMessage,
        candidateId
      });
    }

    if (!isMemoryType(candidate.proposedType)) {
      throw new MemoryCoreException({
        kind: "invalid_memory",
        code: "unsupported_memory_type",
        safeMessage: "Memory candidate type is unsupported",
        candidateId
      });
    }

    const record = memoryRecordFromCandidate(candidate, {
      memoryId: this.memoryIdFactory(),
      type: evaluated.proposedType,
      now: this.now()
    });
    this.memories.set(record.memoryId, cloneMemoryRecord(record));
    this.options.eventStore?.appendEvent({
      type: "memory.committed",
      payload: memoryEventPayload(record)
    });
    return cloneMemoryRecord(record);
  }

  getMemory(memoryId: string): MemoryRecord | undefined {
    const memory = this.memories.get(memoryId);
    return memory === undefined ? undefined : cloneMemoryRecord(memory);
  }

  listMemories(): MemoryRecord[] {
    return [...this.memories.values()]
      .sort((left, right) => left.memoryId.localeCompare(right.memoryId))
      .map((memory) => cloneMemoryRecord(memory));
  }

  revokeMemory(memoryId: string, reason: string): MemoryRecord {
    const memory = this.requireMemory(memoryId);
    const next = revokeMemoryRecord(memory, {
      reason,
      now: this.now()
    });
    this.memories.set(memoryId, cloneMemoryRecord(next));
    this.options.eventStore?.appendEvent({
      type: "memory.revoked",
      payload: memoryEventPayload(next, { reasonCode: "revoked" })
    });
    return cloneMemoryRecord(next);
  }

  expireMemory(memoryId: string, now?: string | Date): MemoryRecord {
    const memory = this.requireMemory(memoryId);
    const next = expireMemoryRecord(memory, {
      now: toIso(now ?? this.clock())
    });
    this.memories.set(memoryId, cloneMemoryRecord(next));
    this.options.eventStore?.appendEvent({
      type: "memory.expired",
      payload: memoryEventPayload(next, { reasonCode: "expired" })
    });
    return cloneMemoryRecord(next);
  }

  recallMemories(query: MemoryRecallQuery): MemoryRecallResult {
    const result = recallFromRecords(this.listMemories(), query);
    this.options.eventStore?.appendEvent({
      type: "memory.recalled",
      payload: {
        namespace: query.namespace,
        typeCount: query.types?.length ?? 0,
        trustLevelCount: query.trustLevels?.length ?? 0,
        recallCount: result.items.length,
        memoryIds: result.items.map((item) => item.memoryId),
        warningCodes: result.warnings.map((warning) => warning.code)
      }
    });
    return result;
  }

  summarizeMemory(memoryId: string): MemorySummary | undefined {
    const memory = this.memories.get(memoryId);
    return memory === undefined ? undefined : summarizeMemory(memory);
  }

  private requireMemory(memoryId: string): MemoryRecord {
    const memory = this.memories.get(memoryId);
    if (memory === undefined) {
      throw new MemoryCoreException({
        kind: "memory_not_found",
        code: "memory_not_found",
        safeMessage: "Memory record was not found",
        memoryId
      });
    }
    return cloneMemoryRecord(memory);
  }

  private now(): string {
    return this.clock().toISOString();
  }
}

export function createInMemoryMemoryStore(
  options: MemoryStoreOptions = {}
): InMemoryMemoryStore {
  return new InMemoryMemoryStore(options);
}

export function commitMemoryCandidate(
  candidate: MemoryCandidate,
  input: {
    store: MemoryStore;
    decision?: MemoryCommitDecision;
  }
): MemoryRecord {
  const stored = input.store.putCandidate(candidate);
  return input.store.commitCandidate(
    stored.candidateId,
    ...(input.decision !== undefined ? [input.decision] : [])
  );
}

export function recallMemories(
  query: MemoryRecallQuery,
  store: Pick<MemoryStore, "recallMemories">
): MemoryRecallResult {
  return store.recallMemories(query);
}

export function revokeMemory(
  memoryId: string,
  reason: string,
  store: Pick<MemoryStore, "revokeMemory">
): MemoryRecord {
  return store.revokeMemory(memoryId, reason);
}

export function expireMemory(
  memoryId: string,
  store: Pick<MemoryStore, "expireMemory">,
  now?: string | Date
): MemoryRecord {
  return store.expireMemory(memoryId, now);
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function defaultCandidateIdFactory(): () => string {
  let nextId = 0;
  return () => {
    nextId += 1;
    return `mem-candidate-${nextId}`;
  };
}

function defaultMemoryIdFactory(): () => string {
  let nextId = 0;
  return () => {
    nextId += 1;
    return `mem-${nextId}`;
  };
}
