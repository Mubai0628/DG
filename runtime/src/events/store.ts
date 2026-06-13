import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync
} from "node:fs";
import { dirname } from "node:path";

import {
  type EventFilter,
  type EventRecord,
  type EventStore,
  type EventType,
  type NewEventInput,
  isEventType
} from "./types.js";

export type EventStoreOptions = {
  clock?: () => Date;
  idFactory?: () => string;
  schemaVersion?: number;
};

let fallbackIdCounter = 0;

function defaultIdFactory(): string {
  fallbackIdCounter += 1;
  return `evt-${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}`;
}

function cloneRecord(record: EventRecord): EventRecord {
  const copy: EventRecord = {
    id: record.id,
    ts: record.ts,
    type: record.type,
    payload: record.payload,
    schemaVersion: record.schemaVersion
  };

  if (record.taskId !== undefined) {
    copy.taskId = record.taskId;
  }
  if (record.agentId !== undefined) {
    copy.agentId = record.agentId;
  }
  if (record.usage !== undefined) {
    copy.usage = { ...record.usage };
  }

  return copy;
}

function matchesFilter(record: EventRecord, filter?: EventFilter): boolean {
  if (filter?.taskId !== undefined && record.taskId !== filter.taskId) {
    return false;
  }
  if (filter?.agentId !== undefined && record.agentId !== filter.agentId) {
    return false;
  }
  if (filter?.type !== undefined) {
    const allowedTypes = Array.isArray(filter.type)
      ? filter.type
      : [filter.type];
    if (!allowedTypes.includes(record.type)) {
      return false;
    }
  }

  return true;
}

export function createEventRecord(
  input: NewEventInput,
  options: EventStoreOptions = {}
): EventRecord {
  const unsafeInput = input as { type?: unknown; payload?: unknown };

  if (typeof unsafeInput.type !== "string" || !isEventType(unsafeInput.type)) {
    throw new Error("Invalid event type");
  }
  if (
    !Object.prototype.hasOwnProperty.call(unsafeInput, "payload") ||
    unsafeInput.payload === undefined
  ) {
    throw new Error("Event payload is required");
  }

  const record: EventRecord = {
    id: options.idFactory?.() ?? defaultIdFactory(),
    ts: (options.clock?.() ?? new Date()).toISOString(),
    type: unsafeInput.type as EventType,
    payload: unsafeInput.payload,
    schemaVersion: options.schemaVersion ?? 1
  };

  if (input.taskId !== undefined) {
    record.taskId = input.taskId;
  }
  if (input.agentId !== undefined) {
    record.agentId = input.agentId;
  }
  if (input.usage !== undefined) {
    record.usage = { ...input.usage };
  }

  return record;
}

export class InMemoryEventStore implements EventStore {
  private readonly options: EventStoreOptions;
  private events: EventRecord[] = [];

  constructor(options: EventStoreOptions = {}) {
    this.options = options;
  }

  appendEvent(input: NewEventInput): EventRecord {
    const record = createEventRecord(input, this.options);
    this.events.push(record);
    return cloneRecord(record);
  }

  listEvents(filter?: EventFilter): EventRecord[] {
    return this.events
      .filter((record) => matchesFilter(record, filter))
      .map((record) => cloneRecord(record));
  }

  clear(): void {
    this.events = [];
  }
}

export class JsonlEventStore implements EventStore {
  private readonly filePath: string;
  private readonly options: EventStoreOptions;

  constructor(filePath: string, options: EventStoreOptions = {}) {
    this.filePath = filePath;
    this.options = options;
  }

  appendEvent(input: NewEventInput): EventRecord {
    const record = createEventRecord(input, this.options);
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
    return cloneRecord(record);
  }

  listEvents(filter?: EventFilter): EventRecord[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    return readFileSync(this.filePath, "utf8")
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as EventRecord)
      .filter((record) => matchesFilter(record, filter))
      .map((record) => cloneRecord(record));
  }

  clear(): void {
    if (existsSync(this.filePath)) {
      rmSync(this.filePath);
    }
  }

  close(): void {
    // JSONL writes are synchronous and do not hold an open handle.
  }
}
