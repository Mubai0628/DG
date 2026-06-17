import {
  type MemoryRecallItem,
  type MemoryRecallQuery,
  type MemoryRecallResult,
  type MemoryRecord,
  type MemoryWarning
} from "./types.js";

const defaultMaxResults = 5;

export function recallMemories(
  memories: readonly MemoryRecord[],
  query: MemoryRecallQuery
): MemoryRecallResult {
  const now = normalizeNow(query.now);
  const maxResults = Math.max(
    1,
    Math.min(query.maxResults ?? defaultMaxResults, 50)
  );
  const queryTokens = tokenize(
    [query.text ?? "", ...(query.tags ?? [])].join(" ")
  );
  const warnings: MemoryWarning[] = [];

  const items = memories
    .filter((memory) => isRecallable(memory, query, now))
    .map((memory) => ({
      item: toRecallItem(memory, scoreMemory(memory, queryTokens, now)),
      sortKey: stableSortKey(memory)
    }))
    .filter(({ item }) => item.score > 0 || queryTokens.length === 0)
    .sort((left, right) => {
      if (right.item.score !== left.item.score) {
        return right.item.score - left.item.score;
      }
      return left.sortKey.localeCompare(right.sortKey);
    })
    .slice(0, maxResults)
    .map(({ item }) => item);

  return {
    querySummary: {
      namespace: query.namespace,
      typeCount: query.types?.length ?? 0,
      tagCount: query.tags?.length ?? 0,
      maxResults
    },
    items,
    warnings
  };
}

export function tokenize(value: string): string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9_]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
    )
  ].sort();
}

function isRecallable(
  memory: MemoryRecord,
  query: MemoryRecallQuery,
  now: Date
): boolean {
  if (memory.namespace !== query.namespace) {
    return false;
  }
  if (query.scope !== undefined && !scopeMatches(memory.scope, query.scope)) {
    return false;
  }
  if (query.types !== undefined && !query.types.includes(memory.type)) {
    return false;
  }
  if (
    query.trustLevels !== undefined &&
    !query.trustLevels.includes(memory.trustLevel)
  ) {
    return false;
  }
  const statuses = query.statuses ?? ["committed"];
  if (!statuses.includes(memory.status)) {
    return false;
  }
  if (
    query.tags !== undefined &&
    query.tags.length > 0 &&
    !query.tags.some((tag) => memory.tags.includes(tag))
  ) {
    return false;
  }
  if (memory.status === "revoked") {
    return false;
  }
  if (isExpired(memory, now) && query.includeExpired !== true) {
    return false;
  }
  return true;
}

function scopeMatches(
  left: MemoryRecord["scope"],
  right: MemoryRecord["scope"]
): boolean {
  return (
    left.kind === right.kind && (right.id === undefined || left.id === right.id)
  );
}

function scoreMemory(
  memory: MemoryRecord,
  queryTokens: readonly string[],
  now: Date
): number {
  let score = 1;
  if (queryTokens.length > 0) {
    const memoryTokens = tokenize(
      [
        memory.summary,
        memory.trigger ?? "",
        memory.mitigation ?? "",
        memory.tags.join(" ")
      ].join(" ")
    );
    const overlap = queryTokens.filter((token) => memoryTokens.includes(token));
    score = overlap.length / queryTokens.length;
  }
  if (memory.pinned) {
    score += 0.25;
  }
  score += recencyBoost(memory, now);
  return Number(score.toFixed(6));
}

function toRecallItem(memory: MemoryRecord, score: number): MemoryRecallItem {
  const item: MemoryRecallItem = {
    memoryId: memory.memoryId,
    type: memory.type,
    summary: memory.summary,
    score,
    provenanceRefs: [...memory.provenance.refs].sort(),
    trustLevel: memory.trustLevel,
    namespace: memory.namespace,
    tags: [...memory.tags].sort(),
    volatilePlacement: true
  };
  if (memory.trigger !== undefined) {
    item.trigger = memory.trigger;
  }
  if (memory.mitigation !== undefined) {
    item.mitigation = memory.mitigation;
  }
  return item;
}

function recencyBoost(memory: MemoryRecord, now: Date): number {
  const createdAt = new Date(memory.createdAt);
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
  const ageDays = ageMs / 86_400_000;
  return Math.max(0, 0.1 - Math.min(ageDays, 100) / 1_000);
}

function stableSortKey(memory: MemoryRecord): string {
  return [memory.createdAt, memory.type, memory.summary, memory.memoryId].join(
    "\0"
  );
}

export function isExpired(memory: MemoryRecord, now: Date): boolean {
  if (memory.expiresAt === undefined) {
    return false;
  }
  if (memory.pinned) {
    return false;
  }
  return new Date(memory.expiresAt).getTime() <= now.getTime();
}

function normalizeNow(value: string | Date | undefined): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    return new Date(value);
  }
  return new Date();
}
