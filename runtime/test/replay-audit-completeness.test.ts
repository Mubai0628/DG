import { describe, expect, it } from "vitest";

import {
  buildReplayAuditCompletenessReport,
  summarizeReplayAuditCompletenessReport,
  type ReplayAuditCompletenessReport,
  type ReplayAuditEventInput,
  type ReplayAuditEventKind
} from "../src/workflows/replay-audit-completeness.js";

const requiredKinds: ReplayAuditEventKind[] = [
  "task_run_draft",
  "model_proposal",
  "repair_schema_validation",
  "policy_enforcement",
  "approval_receipt",
  "apply_result",
  "verification_result",
  "redaction_audit"
];

const safeEvents: ReplayAuditEventInput[] = requiredKinds.map((kind) => ({
  eventId: `${kind}-event`,
  kind,
  status: "summary_ready",
  summary: `${kind} summary.`,
  hashPrefix: `${kind.slice(0, 4)}1234`
}));

function expectNoExecution(report: ReplayAuditCompletenessReport): void {
  expect(report.readiness.canReplayExecution).toBe(false);
  expect(report.readiness.canRerunActions).toBe(false);
  expect(report.readiness.canWriteEventStore).toBe(false);
  expect(report.readiness.canShowRawContent).toBe(false);
  expect(report.readiness.canApplyPatch).toBe(false);
  expect(report.readiness.canRollback).toBe(false);
  expect(report.readiness.canExecuteDesktopAction).toBe(false);
  expect(report.readiness.canInvokeMcpTool).toBe(false);
  expect(report.readiness.canExecutePluginRuntime).toBe(false);
  expect(report.readiness.canExecuteGit).toBe(false);
  expect(report.readiness.canExecuteShell).toBe(false);
  expect(report.readiness.appCanExecute).toBe(false);
}

describe("replay audit completeness", () => {
  it("marks required replay summaries complete", () => {
    const report = buildReplayAuditCompletenessReport({
      events: safeEvents,
      sourceKind: "fixture",
      idGenerator: () => "replay-audit-completeness-test"
    });
    const summary = summarizeReplayAuditCompletenessReport(report);

    expect(report.status).toBe("complete");
    expect(report.completenessId).toBe("replay-audit-completeness-test");
    expect(report.eventCount).toBe(8);
    expect(report.missingRequiredEventCount).toBe(0);
    expect(report.readiness.canRenderCompletenessReport).toBe(true);
    expect(summary.source).toBe("runtime_replay_audit_completeness");
    expectNoExecution(report);
  });

  it("warns for missing required summaries", () => {
    const report = buildReplayAuditCompletenessReport({
      events: safeEvents.filter((event) => event.kind !== "verification_result")
    });

    expect(report.status).toBe("warning");
    expect(report.missingRequiredKinds).toContain("verification_result");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "MISSING_REQUIRED_EVENT"
    );
    expectNoExecution(report);
  });

  it("blocks out-of-order and duplicate conflicting event ids", () => {
    const report = buildReplayAuditCompletenessReport({
      events: [
        safeEvents.find((event) => event.kind === "apply_result")!,
        safeEvents.find((event) => event.kind === "approval_receipt")!,
        {
          eventId: "conflict-event",
          kind: "task_run_draft",
          summary: "First task summary."
        },
        {
          eventId: "conflict-event",
          kind: "model_proposal",
          summary: "Second conflicting summary."
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "OUT_OF_ORDER_EVENT",
        "DUPLICATE_CONFLICTING_EVENT_ID"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks apply, rollback, desktop action, and MCP relation violations", () => {
    const report = buildReplayAuditCompletenessReport({
      events: [
        {
          eventId: "apply-result",
          kind: "apply_result",
          summary: "Apply result without approval."
        },
        {
          eventId: "rollback-result",
          kind: "rollback_result",
          summary: "Rollback result without checkpoint."
        },
        {
          eventId: "desktop-proposal",
          kind: "desktop_action_proposal",
          summary: "Desktop action without observer evidence."
        },
        {
          eventId: "mcp-result",
          kind: "mcp_tool_result",
          summary: "MCP tool result without approval."
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "APPLY_WITHOUT_APPROVAL",
        "ROLLBACK_WITHOUT_CHECKPOINT",
        "DESKTOP_ACTION_WITHOUT_OBSERVER",
        "MCP_TOOL_RESULT_WITHOUT_APPROVAL"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks raw fields, API key markers, and execution claims without leaking raw text", () => {
    const report = buildReplayAuditCompletenessReport({
      events: [
        {
          eventId: "unsafe-event",
          kind: "verification_result",
          summary: "Bearer abcdefghijklmnop",
          rawContent: "do not leak raw replay content",
          claimsExecution: true,
          readiness: {
            canReplayExecution: true
          }
        }
      ]
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "FORBIDDEN_RAW_EVENT_FIELD",
        "BEARER_TOKEN_MARKER",
        "EXECUTION_CLAIM_WITHOUT_RESULT",
        "EXECUTION_FLAG_TRUE"
      ])
    );
    expect(serialized).not.toContain("do not leak raw replay content");
    expect(serialized).not.toContain("Bearer abcdefghijklmnop");
    expectNoExecution(report);
  });

  it("keeps output deterministic and summary-only", () => {
    const first = buildReplayAuditCompletenessReport({
      events: safeEvents,
      idGenerator: () => "replay-audit-deterministic"
    });
    const second = buildReplayAuditCompletenessReport({
      events: safeEvents,
      idGenerator: () => "replay-audit-deterministic"
    });
    const serialized = JSON.stringify(first);

    expect(first.completenessHash).toBe(second.completenessHash);
    expect(serialized).not.toContain("raw replay");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("apiKey");
    expectNoExecution(first);
  });
});
