import { InMemoryEventStore } from "./store.js";
import { type EventRecord, type NewEventInput } from "./types.js";

export function createDemoEventInputs(): NewEventInput[] {
  return [
    {
      type: "task.created",
      taskId: "demo-task",
      agentId: "planner",
      payload: {
        title: "Demo web table to CSV",
        route: "web_table_to_csv"
      }
    },
    {
      type: "task.started",
      taskId: "demo-task",
      agentId: "planner",
      payload: {
        route: "web_table_to_csv"
      }
    },
    {
      type: "llm.requested",
      taskId: "demo-task",
      agentId: "planner",
      payload: {
        provider: "fake",
        promptStorage: "disabled",
        requestKind: "table_extraction_plan"
      }
    },
    {
      type: "llm.completed",
      taskId: "demo-task",
      agentId: "planner",
      payload: {
        provider: "fake",
        responseKind: "table_extraction_plan"
      },
      usage: {
        inputTokens: 120,
        outputTokens: 48,
        reasoningTokens: 0,
        cacheHitTokens: 0,
        cacheMissTokens: 120,
        retryCount: 0,
        latencyMs: 25,
        model: "fake-deepseek"
      }
    },
    {
      type: "fs.draft_written",
      taskId: "demo-task",
      agentId: "draft-actuator",
      payload: {
        path: "workspace/drafts/demo-task.csv",
        bytes: 42,
        redacted: true
      }
    },
    {
      type: "task.completed",
      taskId: "demo-task",
      agentId: "verifier",
      payload: {
        result: "draft_written",
        draftPath: "workspace/drafts/demo-task.csv"
      }
    }
  ];
}

export function createDemoEvents(): EventRecord[] {
  let sequence = 0;
  const store = new InMemoryEventStore({
    idFactory: () => {
      sequence += 1;
      return `demo-event-${sequence}`;
    },
    clock: () => new Date(Date.UTC(2026, 0, 1, 0, 0, sequence))
  });

  for (const input of createDemoEventInputs()) {
    store.appendEvent(input);
  }

  return store.listEvents();
}
