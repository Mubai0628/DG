import { describe, expect, it } from "vitest";

import {
  buildCommandBrokerRedactionAudit,
  buildCommandBrokerReplayProjection,
  buildCommandBrokerSummaryEvent,
  summarizeCommandBrokerRedactionAudit,
  summarizeCommandBrokerReplayProjection
} from "../src/execution/index.js";

function safeEventInput(
  overrides: Partial<Parameters<typeof buildCommandBrokerSummaryEvent>[0]> = {}
) {
  return {
    eventType: "command_broker.command.executed",
    requestId: "command-request-safe",
    commandHash: "commandhashsafe123",
    shellKind: "powershell",
    mode: "advanced_workspace",
    workspaceRootRef: "workspace-ref-command-broker",
    classifierCategories: [],
    exitCode: 0,
    durationMs: 25,
    transcriptRef: "transcript:command-broker-safe",
    stdoutBytes: 12,
    stderrBytes: 0,
    redactedStdoutLineCount: 1,
    redactedStderrLineCount: 0,
    warningCodes: [],
    createdAt: "2026-07-06T00:00:00.000Z",
    idGenerator: () => "command-event-test",
    ...overrides
  };
}

function expectExecutionFlagsFalse(
  readiness: ReturnType<typeof buildCommandBrokerReplayProjection>["readiness"]
) {
  expect(readiness.canWriteEventStore).toBe(false);
  expect(readiness.canPersistRawOutput).toBe(false);
  expect(readiness.canReplayExecuteCommand).toBe(false);
  expect(readiness.canExecuteCommand).toBe(false);
  expect(readiness.canSpawnProcess).toBe(false);
  expect(readiness.canWriteFilesystem).toBe(false);
  expect(readiness.canExecuteGitWrite).toBe(false);
  expect(readiness.canRunBackgroundProcess).toBe(false);
  expect(readiness.canApplyPatch).toBe(false);
  expect(readiness.canRollback).toBe(false);
  expect(readiness.appCanExecute).toBe(false);
}

describe("command broker summary events", () => {
  it("builds an executed command broker event as summary-only", () => {
    const result = buildCommandBrokerSummaryEvent(safeEventInput());

    expect(result.status).toBe("event_ready");
    expect(result.event?.type).toBe("command_broker.command.executed");
    expect(result.event?.payload.summaryOnly).toBe(true);
    expect(result.event?.payload.notWritten).toBe(true);
    expect(result.event?.payload.noRawOutput).toBe(true);
    expect(result.event?.payload.rawCommandTextIncluded).toBe(false);
    expect(result.event?.payload.rawStdoutIncluded).toBe(false);
    expect(result.event?.payload.rawStderrIncluded).toBe(false);
    expect(result.event?.payload.transcriptRef).toBe(
      "transcript:command-broker-safe"
    );
    expect(JSON.stringify(result)).not.toContain("broker safe hello");
    expect(JSON.stringify(result)).not.toContain("Write-Output");
    expectExecutionFlagsFalse(result.readiness);
  });

  it("supports planned, blocked, and cancelled command event types", () => {
    for (const eventType of [
      "command_broker.command.planned",
      "command_broker.command.blocked",
      "command_broker.command.cancelled"
    ] as const) {
      const result = buildCommandBrokerSummaryEvent(
        safeEventInput({
          eventType,
          exitCode: undefined,
          transcriptRef: undefined,
          stdoutBytes: 0,
          stderrBytes: 0
        })
      );
      expect(result.status).toBe("event_ready");
      expect(result.event?.type).toBe(eventType);
      expect(result.event?.payload.commandStatus).toContain(
        eventType.replace("command_broker.command.", "")
      );
    }
  });

  it("blocks raw output, raw command text, and secret markers", () => {
    const rawStdout = buildCommandBrokerSummaryEvent({
      ...safeEventInput(),
      rawStdout: "line one"
    } as unknown as Parameters<typeof buildCommandBrokerSummaryEvent>[0]);
    expect(rawStdout.status).toBe("blocked");
    expect(rawStdout.findings.map((finding) => finding.code)).toContain(
      "RAW_STDOUT_DETECTED"
    );

    const rawCommand = buildCommandBrokerSummaryEvent({
      ...safeEventInput(),
      commandText: "Write-Output secret"
    } as unknown as Parameters<typeof buildCommandBrokerSummaryEvent>[0]);
    expect(rawCommand.status).toBe("blocked");
    expect(rawCommand.findings.map((finding) => finding.code)).toContain(
      "RAW_COMMAND_TEXT_DETECTED"
    );

    const secret = buildCommandBrokerSummaryEvent({
      ...safeEventInput(),
      warningCodes: ["sk-fake-obvious-value"]
    });
    expect(secret.status).toBe("blocked");
    expect(secret.findings.map((finding) => finding.code)).toContain(
      "SECRET_MARKER_DETECTED"
    );
  });

  it("projects replay counts and transcript refs without re-execution", () => {
    const planned = buildCommandBrokerSummaryEvent(
      safeEventInput({ eventType: "command_broker.command.planned" })
    ).event;
    const executed = buildCommandBrokerSummaryEvent(safeEventInput()).event;
    const blocked = buildCommandBrokerSummaryEvent(
      safeEventInput({
        eventType: "command_broker.command.blocked",
        commandStatus: "blocked",
        transcriptRef: undefined
      })
    ).event;
    const cancelled = buildCommandBrokerSummaryEvent(
      safeEventInput({
        eventType: "command_broker.command.cancelled",
        commandStatus: "cancelled",
        transcriptRef: undefined
      })
    ).event;

    const projection = buildCommandBrokerReplayProjection({
      events: [planned, executed, blocked, cancelled]
    });

    expect(projection.status).toBe("projected");
    expect(projection.eventCount).toBe(4);
    expect(projection.plannedCommandCount).toBe(1);
    expect(projection.executedCommandCount).toBe(1);
    expect(projection.blockedCommandCount).toBe(1);
    expect(projection.cancelledCommandCount).toBe(1);
    expect(projection.transcriptRefs).toEqual([
      "transcript:command-broker-safe"
    ]);
    expect(projection.readiness.canUseForReplay).toBe(true);
    expectExecutionFlagsFalse(projection.readiness);
    expect(summarizeCommandBrokerReplayProjection(projection)).toContain(
      "executed:1"
    );
  });

  it("redaction audit catches raw event attempts", () => {
    const audit = buildCommandBrokerRedactionAudit({
      events: [
        buildCommandBrokerSummaryEvent(safeEventInput()).event,
        {
          type: "command_broker.command.executed",
          payload: {
            commandHash: "commandhashunsafe",
            rawStderr: "raw stderr should not persist"
          }
        }
      ]
    });

    expect(audit.status).toBe("blocked");
    expect(audit.rawStderrDetected).toBe(true);
    expect(audit.rawFieldDetectedCount).toBeGreaterThan(0);
    expect(summarizeCommandBrokerRedactionAudit(audit)).toContain(
      "stderr:blocked"
    );
    expectExecutionFlagsFalse(audit.readiness);
  });

  it("keeps output summary-only and deterministic", () => {
    const first = buildCommandBrokerSummaryEvent(safeEventInput());
    const second = buildCommandBrokerSummaryEvent(safeEventInput());
    expect(first.eventHash).toBe(second.eventHash);
    expect(first.event?.id).toBe("command-event-test");

    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain("raw prompt");
    expect(serialized).not.toContain("raw response");
    expect(serialized).not.toContain("reasoning_content");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("Authorization");
  });
});
