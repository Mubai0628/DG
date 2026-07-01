import { describe, expect, it } from "vitest";

import {
  buildProjectKnowledgeRedactionAudit,
  buildProjectKnowledgeSummaryEvent,
  replayProjectKnowledgeEvents,
  summarizeProjectKnowledgeReplayProjection
} from "../src/index.js";

const createdAt = "2026-06-30T00:00:00.000Z";

function committed(entryId: string) {
  return buildProjectKnowledgeSummaryEvent({
    type: "project_knowledge.candidate_committed",
    entryId,
    entryStatus: "committed",
    projectKnowledgeCount: 1,
    warningCodes: [],
    createdAt
  });
}

function expectExecutionDisabled(result: {
  readiness: Record<string, unknown>;
}): void {
  expect(result.readiness).toMatchObject({
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("project knowledge events replay and redaction audit", () => {
  it("replays commit, revoke, and expire events", () => {
    const projection = replayProjectKnowledgeEvents({
      events: [
        committed("pk-1"),
        committed("pk-2"),
        buildProjectKnowledgeSummaryEvent({
          type: "project_knowledge.entry_revoked",
          entryId: "pk-1",
          entryStatus: "revoked",
          reasonSummary: "Superseded by a newer reviewed summary.",
          createdAt
        }),
        buildProjectKnowledgeSummaryEvent({
          type: "project_knowledge.entry_expired",
          entryId: "pk-2",
          entryStatus: "expired",
          reasonSummary: "Expired review window.",
          createdAt
        })
      ],
      idGenerator: () => "project-knowledge-replay-test"
    });

    expect(projection.status).toBe("replay_ready");
    expect(projection.replayId).toBe("project-knowledge-replay-test");
    expect(projection.projectKnowledgeCount).toBe(2);
    expect(projection.revokedCount).toBe(1);
    expect(projection.expiredCount).toBe(1);
    expect(projection.entries.map((entry) => entry.status)).toEqual([
      "revoked",
      "expired"
    ]);
    expect(projection.events.every((event) => event.summaryOnly)).toBe(true);
    expectExecutionDisabled(projection);
  });

  it("warns and skips corrupted event lines", () => {
    const event = committed("pk-1");
    const projection = replayProjectKnowledgeEvents({
      eventLines: `${JSON.stringify(event)}\n{not json}\n`,
      idGenerator: () => "project-knowledge-replay-corrupt"
    });

    expect(projection.status).toBe("warning");
    expect(projection.eventCount).toBe(1);
    expect(projection.findings.map((finding) => finding.code)).toContain(
      "PARSE_ERROR_LINE_SKIPPED"
    );
    expectExecutionDisabled(projection);
  });

  it("blocks raw fields without echoing raw content", () => {
    const projection = replayProjectKnowledgeEvents({
      events: [
        {
          type: "project_knowledge.recall_used",
          payload: {
            recallSummary: "Use reviewed project knowledge.",
            rawSource: "Synthetic raw source must not appear in output."
          }
        }
      ]
    });
    const serialized = JSON.stringify(projection);

    expect(projection.status).toBe("blocked");
    expect(projection.findings.map((finding) => finding.code)).toContain(
      "RAWSOURCE_FIELD_REJECTED"
    );
    expect(serialized).not.toContain("Synthetic raw source must not appear");
    expect(serialized).not.toContain("rawSource");
    expectExecutionDisabled(projection);
  });

  it("redaction audit catches fake API key and raw source markers", () => {
    const fakeKey = ["s", "k-fake-project-knowledge-audit"].join("");
    const audit = buildProjectKnowledgeRedactionAudit({
      records: [
        {
          entryId: "pk-1",
          summary: `Rejected fake key marker ${fakeKey}`
        },
        {
          entryId: "pk-2",
          rawSource: "Synthetic raw source must be blocked."
        }
      ],
      idGenerator: () => "project-knowledge-audit-test"
    });
    const serialized = JSON.stringify(audit);

    expect(audit.status).toBe("blocked");
    expect(audit.auditId).toBe("project-knowledge-audit-test");
    expect(audit.apiKeyLeakDetected).toBe(true);
    expect(audit.rawContentDetected).toBe(true);
    expect(serialized).not.toContain(fakeKey);
    expect(serialized).not.toContain("Synthetic raw source");
    expectExecutionDisabled(audit);
  });

  it("projects recall events as summary-only output", () => {
    const event = buildProjectKnowledgeSummaryEvent({
      type: "project_knowledge.recall_used",
      recallSummary: "2 reviewed summaries entered volatile tail.",
      matchedEntryCount: 2,
      createdAt,
      idGenerator: () => "project-knowledge-recall-event"
    });
    const projection = replayProjectKnowledgeEvents({ events: [event] });
    const summary = summarizeProjectKnowledgeReplayProjection(projection);
    const serialized = JSON.stringify({ event, projection, summary });

    expect(event.id).toBe("project-knowledge-recall-event");
    expect(event.payload.recallSummary).toBe(
      "2 reviewed summaries entered volatile tail."
    );
    expect(projection.status).toBe("replay_ready");
    expect(projection.recallEventCount).toBe(1);
    expect(projection.latestRecallSummary).toContain(
      "project knowledge recall used"
    );
    expect(summary.summaryOnly).toBe(true);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("sk-");
    expectExecutionDisabled(projection);
  });

  it("generates deterministic replay hash with injected id and clock", () => {
    const first = replayProjectKnowledgeEvents({
      events: [committed("pk-deterministic")],
      createdAt,
      idGenerator: () => "deterministic-replay"
    });
    const second = replayProjectKnowledgeEvents({
      events: [committed("pk-deterministic")],
      createdAt,
      idGenerator: () => "deterministic-replay"
    });

    expect(first.replayId).toBe("deterministic-replay");
    expect(first.replayHash).toBe(second.replayHash);
    expect(first.events[0]?.eventHash).toBe(second.events[0]?.eventHash);
  });
});
