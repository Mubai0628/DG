import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  InMemoryEventStore,
  JsonlEventStore,
  createDemoEvents,
  replay,
  type EventType,
  type NewEventInput
} from "../src/index.js";

const fixedDate = new Date("2026-01-01T00:00:00.000Z");

function deterministicStore(): InMemoryEventStore {
  let id = 0;
  return new InMemoryEventStore({
    clock: () => fixedDate,
    idFactory: () => {
      id += 1;
      return `evt-${id}`;
    }
  });
}

describe("event store", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("appendEvent fills id, ts, and schemaVersion", () => {
    const store = deterministicStore();

    const record = store.appendEvent({
      type: "task.created",
      taskId: "task-1",
      payload: { title: "Create CSV" }
    });

    expect(record.id).toBe("evt-1");
    expect(record.ts).toBe("2026-01-01T00:00:00.000Z");
    expect(record.schemaVersion).toBe(1);
  });

  it("rejects invalid event types", () => {
    const store = deterministicStore();

    expect(() =>
      store.appendEvent({
        type: "unknown.event" as EventType,
        payload: {}
      })
    ).toThrow("Invalid event type");
  });

  it("rejects missing or undefined payload", () => {
    const store = deterministicStore();

    expect(() =>
      store.appendEvent({ type: "task.created" } as NewEventInput)
    ).toThrow("Event payload is required");
    expect(() =>
      store.appendEvent({ type: "task.created", payload: undefined })
    ).toThrow("Event payload is required");
  });

  it("lists events in append order", () => {
    const store = deterministicStore();

    store.appendEvent({ type: "task.created", taskId: "task-1", payload: {} });
    store.appendEvent({ type: "task.started", taskId: "task-1", payload: {} });

    expect(store.listEvents().map((event) => event.type)).toEqual([
      "task.created",
      "task.started"
    ]);
  });

  it("filters events by taskId and type", () => {
    const store = deterministicStore();

    store.appendEvent({ type: "task.created", taskId: "task-1", payload: {} });
    store.appendEvent({ type: "task.created", taskId: "task-2", payload: {} });
    store.appendEvent({ type: "task.started", taskId: "task-1", payload: {} });

    expect(
      store
        .listEvents({ taskId: "task-1", type: "task.created" })
        .map((event) => event.id)
    ).toEqual(["evt-1"]);
  });

  it("preserves usage and replay aggregates it", () => {
    const store = deterministicStore();

    store.appendEvent({
      type: "llm.completed",
      taskId: "task-1",
      payload: { provider: "fake" },
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        reasoningTokens: 2,
        cacheHitTokens: 3,
        cacheMissTokens: 7,
        retryCount: 1,
        latencyMs: 25,
        model: "fake-deepseek"
      }
    });

    const [event] = store.listEvents();
    expect(event?.usage?.model).toBe("fake-deepseek");
    expect(replay(store.listEvents()).usageTotals).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      reasoningTokens: 2,
      cacheHitTokens: 3,
      cacheMissTokens: 7,
      retryCount: 1,
      latencyMs: 25
    });
  });

  it("replays demo events to a completed task", () => {
    const state = replay(createDemoEvents());

    expect(state.eventCount).toBe(6);
    expect(state.tasks["demo-task"]).toBe("completed");
    expect(state.draftCount).toBe(1);
  });

  it("replay is deterministic", () => {
    const events = createDemoEvents();

    expect(replay(events)).toEqual(replay(events));
  });

  it("JsonlEventStore reads events after reopening", () => {
    const dir = mkdtempSync(join(tmpdir(), "deepseek-workbench-events-"));
    tempDirs.push(dir);
    const filePath = join(dir, "events.jsonl");
    const store = new JsonlEventStore(filePath, {
      clock: () => fixedDate,
      idFactory: () => "persisted-1"
    });

    const written = store.appendEvent({
      type: "task.created",
      taskId: "task-1",
      payload: { title: "Persisted task" }
    });
    const reopened = new JsonlEventStore(filePath);

    expect(reopened.listEvents()).toEqual([written]);
  });

  it("demo events do not contain raw prompt, raw DOM, or secret fields", () => {
    const serialized = JSON.stringify(createDemoEvents());

    expect(serialized).not.toMatch(
      /rawPrompt|raw_prompt|rawDom|raw_dom|apiKey|api_key|secret|screenshot|clipboard/i
    );
  });
});
