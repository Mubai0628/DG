import { cloneMemoryRecord } from "./candidate.js";
import { type MemoryRecord } from "./types.js";

export function revokeMemoryRecord(
  record: MemoryRecord,
  input: {
    reason: string;
    now: string;
  }
): MemoryRecord {
  const next = cloneMemoryRecord(record);
  next.status = "revoked";
  next.revokedAt = input.now;
  next.updatedAt = input.now;
  return next;
}

export function expireMemoryRecord(
  record: MemoryRecord,
  input: {
    now: string;
  }
): MemoryRecord {
  const next = cloneMemoryRecord(record);
  next.status = "expired";
  next.updatedAt = input.now;
  return next;
}
