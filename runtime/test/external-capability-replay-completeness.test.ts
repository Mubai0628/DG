import { describe, expect, it } from "vitest";

import {
  buildExternalCapabilityReplayCompletenessReport,
  summarizeExternalCapabilityReplayCompleteness,
  validateExternalCapabilityReplayCompleteness,
  type ExternalCapabilityReplayCompletenessReport,
  type ExternalCapabilityReplayResultSummary
} from "../src/capabilities/index.js";

const safeResults: ExternalCapabilityReplayResultSummary[] = [
  {
    resultId: "mcp-result-1",
    descriptorRef: "descriptor-mcp-read",
    sourceType: "mcp_readonly_tool",
    riskSummary: "low read-only metadata result.",
    requiresApproval: true,
    policySummaryPresent: true,
    approvalSummaryPresent: true,
    leaseSummaryPresent: true,
    redactionSummaryPresent: true,
    eventWritten: true,
    eventSummaryPresent: true,
    replayProjectionIncludesResult: true,
    warningCodes: []
  },
  {
    resultId: "plugin-scan-1",
    descriptorRef: "descriptor-plugin-scan",
    sourceType: "plugin_metadata",
    riskLevel: "low",
    requiresApproval: false,
    redactionSummaryPresent: true,
    eventWritten: false,
    replayProjectionIncludesResult: true,
    warningCodes: []
  }
];

function codes(result: ExternalCapabilityReplayCompletenessReport): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(
  result: ExternalCapabilityReplayCompletenessReport
): void {
  expect(result.readiness.canReplayRawOutput).toBe(false);
  expect(result.readiness.canExecuteExternalCapability).toBe(false);
  expect(result.readiness.canWriteEventStoreRaw).toBe(false);
  expect(result.readiness.canPersistRawArgs).toBe(false);
  expect(result.readiness.canPersistRawOutput).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.canExecuteDesktopAction).toBe(false);
  expect(result.readiness.canExecuteGit).toBe(false);
  expect(result.readiness.canExecuteShell).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("external capability replay completeness", () => {
  it("marks summary-only external capability results replay-ready", () => {
    const report = buildExternalCapabilityReplayCompletenessReport({
      results: safeResults,
      idGenerator: () => "external-replay-test"
    });
    const summary = summarizeExternalCapabilityReplayCompleteness(report);

    expect(report.status).toBe("replay_ready");
    expect(report.completenessId).toBe("external-replay-test");
    expect(report.resultCount).toBe(2);
    expect(report.descriptorRefCount).toBe(2);
    expect(report.sourceTypeCounts.mcp_readonly_tool).toBe(1);
    expect(report.sourceTypeCounts.plugin_metadata).toBe(1);
    expect(report.approvalRequiredCount).toBe(1);
    expect(report.redactionSummaryCount).toBe(2);
    expect(report.eventSummaryCount).toBe(1);
    expect(report.replayProjectionCount).toBe(2);
    expect(summary.source).toBe(
      "runtime_external_capability_replay_completeness"
    );
    expect(report.readiness.canReplayExternalCapabilitySummary).toBe(true);
    expectNoExecution(report);
  });

  it("returns empty safely when no result summaries exist", () => {
    const report = buildExternalCapabilityReplayCompletenessReport();

    expect(report.status).toBe("empty");
    expect(codes(report)).toContain("RESULT_SUMMARY_MISSING");
    expect(report.readiness.canReplayExternalCapabilitySummary).toBe(false);
    expectNoExecution(report);
  });

  it("blocks missing id, descriptor ref, source type, and risk summary", () => {
    const report = buildExternalCapabilityReplayCompletenessReport({
      results: [
        {
          redactionSummaryPresent: true,
          replayProjectionIncludesResult: true
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(codes(report)).toEqual(
      expect.arrayContaining([
        "RESULT_ID_MISSING",
        "DESCRIPTOR_REF_MISSING",
        "SOURCE_TYPE_MISSING",
        "RISK_SUMMARY_MISSING"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks missing policy, approval, and lease summaries for approval-required results", () => {
    const report = buildExternalCapabilityReplayCompletenessReport({
      results: [
        {
          ...safeResults[0],
          policySummaryPresent: false,
          approvalSummaryPresent: false,
          leaseSummaryPresent: false
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(codes(report)).toEqual(
      expect.arrayContaining([
        "POLICY_SUMMARY_MISSING",
        "APPROVAL_SUMMARY_MISSING",
        "LEASE_SUMMARY_MISSING"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks missing redaction, written-event summary, replay projection, and duplicate ids", () => {
    const report = buildExternalCapabilityReplayCompletenessReport({
      results: [
        {
          ...safeResults[0],
          redactionSummaryPresent: false,
          eventWritten: true,
          eventSummaryPresent: false,
          replayProjectionIncludesResult: false
        },
        {
          ...safeResults[1],
          resultId: "mcp-result-1"
        }
      ],
      replayProjection: {
        resultIds: ["plugin-scan-1"]
      }
    });

    expect(report.status).toBe("blocked");
    expect(codes(report)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_RESULT_ID",
        "REDACTION_SUMMARY_MISSING",
        "EVENT_SUMMARY_MISSING_FOR_WRITTEN_EVENT",
        "REPLAY_PROJECTION_MISSING_RESULT"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks raw args, raw output, raw package content, stdout/stderr, and secret markers without leaking values", () => {
    const report = buildExternalCapabilityReplayCompletenessReport({
      results: [
        {
          ...safeResults[0],
          rawArgs: "RAW_ARGS_SHOULD_NOT_LEAK",
          rawOutput: "RAW_OUTPUT_SHOULD_NOT_LEAK",
          rawPackageContent: "RAW_PACKAGE_SHOULD_NOT_LEAK",
          stdout: "RAW_STDOUT_SHOULD_NOT_LEAK",
          stderr: "RAW_STDERR_SHOULD_NOT_LEAK",
          note: "Bearer fake-token-for-test-only"
        }
      ]
    } as never);
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(codes(report)).toEqual(
      expect.arrayContaining([
        "RAW_ARGS_FIELD_REJECTED",
        "RAW_OUTPUT_FIELD_REJECTED",
        "RAW_PACKAGE_CONTENT_REJECTED",
        "RAW_STDOUT_FIELD_REJECTED",
        "RAW_STDERR_FIELD_REJECTED",
        "BEARER_TOKEN_MARKER_REJECTED"
      ])
    );
    expect(serialized).not.toContain("RAW_ARGS_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("RAW_OUTPUT_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("RAW_PACKAGE_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("Bearer fake-token-for-test-only");
    expectNoExecution(report);
  });

  it("blocks execution readiness flags and command/native/desktop fields", () => {
    const report = buildExternalCapabilityReplayCompletenessReport({
      results: safeResults,
      command: "synthetic command",
      nativeBridge: true,
      desktopAction: true,
      readiness: {
        canExecuteExternalCapability: true
      }
    } as never);

    expect(report.status).toBe("blocked");
    expect(codes(report)).toEqual(
      expect.arrayContaining([
        "COMMAND_FIELD_REJECTED",
        "NATIVE_BRIDGE_FIELD_REJECTED",
        "DESKTOP_ACTION_FIELD_REJECTED",
        "EXECUTION_READINESS_FLAG_TRUE"
      ])
    );
    expectNoExecution(report);
  });

  it("returns deterministic hashes and validation findings", () => {
    const first = buildExternalCapabilityReplayCompletenessReport({
      results: safeResults,
      idGenerator: () => "external-replay-deterministic"
    });
    const second = buildExternalCapabilityReplayCompletenessReport({
      results: safeResults,
      idGenerator: () => "external-replay-deterministic"
    });
    const findings = validateExternalCapabilityReplayCompleteness({
      results: safeResults
    });

    expect(first.completenessHash).toBe(second.completenessHash);
    expect(first.completenessId).toBe(second.completenessId);
    expect(findings).toHaveLength(0);
    expectNoExecution(first);
  });
});
