import { describe, expect, it } from "vitest";

import {
  buildEvidenceFreshnessDriftReport,
  summarizeEvidenceFreshnessDriftReport,
  type EvidenceFreshnessDriftReport,
  type EvidenceFreshnessRefInput
} from "../src/workflows/evidence-freshness-drift.js";

const safeRefs: EvidenceFreshnessRefInput[] = [
  {
    refId: "workspace-index-ref",
    category: "workspace_index",
    summary: "Workspace index summary.",
    observedAt: "2026-07-05T00:00:00.000Z",
    expectedHashPrefix: "abcd1234",
    currentHashPrefix: "abcd1234",
    sourceType: "workspace_index",
    expectedSourceType: "workspace_index"
  },
  {
    refId: "mcp-metadata-ref",
    category: "mcp_metadata",
    summary: "MCP metadata summary.",
    observedAt: "2026-07-05T00:01:00.000Z",
    expectedHashPrefix: "mcp1234",
    currentHashPrefix: "mcp1234"
  }
];

function expectNoExecution(report: EvidenceFreshnessDriftReport): void {
  expect(report.readiness.canReadRawEvidence).toBe(false);
  expect(report.readiness.canRefreshEvidence).toBe(false);
  expect(report.readiness.canWriteEventStore).toBe(false);
  expect(report.readiness.canApplyPatch).toBe(false);
  expect(report.readiness.canRollback).toBe(false);
  expect(report.readiness.canInvokeMcpTool).toBe(false);
  expect(report.readiness.canExecutePluginRuntime).toBe(false);
  expect(report.readiness.canTriggerDesktopObserver).toBe(false);
  expect(report.readiness.canExecuteDesktopAction).toBe(false);
  expect(report.readiness.canExecuteGit).toBe(false);
  expect(report.readiness.canExecuteShell).toBe(false);
  expect(report.readiness.appCanExecute).toBe(false);
}

describe("evidence freshness drift", () => {
  it("marks fresh evidence refs ready", () => {
    const report = buildEvidenceFreshnessDriftReport({
      evidenceRefs: safeRefs,
      createdAt: "2026-07-05T00:02:00.000Z",
      idGenerator: () => "evidence-freshness-test"
    });
    const summary = summarizeEvidenceFreshnessDriftReport(report);

    expect(report.status).toBe("fresh");
    expect(report.freshnessId).toBe("evidence-freshness-test");
    expect(report.evidenceCount).toBe(2);
    expect(report.staleCount).toBe(0);
    expect(report.driftCount).toBe(0);
    expect(report.categoryCounts.workspace_index).toBe(1);
    expect(summary.source).toBe("runtime_evidence_freshness_drift");
    expect(report.readiness.canUseForWorkflowReview).toBe(true);
    expectNoExecution(report);
  });

  it("warns for stale workspace and desktop evidence", () => {
    const report = buildEvidenceFreshnessDriftReport({
      evidenceRefs: [
        {
          refId: "workspace-old",
          category: "workspace_index",
          summary: "Old workspace summary.",
          observedAt: "2026-07-01T00:00:00.000Z"
        },
        {
          refId: "desktop-old",
          category: "desktop_observation",
          summary: "Old desktop observation.",
          observedAt: "2026-07-05T00:00:00.000Z"
        }
      ],
      staleThresholdMs: 60_000,
      desktopObservationStaleThresholdMs: 30_000,
      createdAt: "2026-07-05T00:02:00.000Z"
    });

    expect(report.status).toBe("warning");
    expect(report.staleCount).toBe(2);
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "STALE_EVIDENCE",
        "WORKSPACE_SNAPSHOT_OUTDATED",
        "DESKTOP_OBSERVATION_TOO_OLD"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks hash drift and source type mismatch", () => {
    const report = buildEvidenceFreshnessDriftReport({
      evidenceRefs: [
        {
          refId: "mcp-drift",
          category: "mcp_metadata",
          summary: "MCP descriptor changed.",
          expectedHashPrefix: "oldmcp",
          currentHashPrefix: "newmcp"
        },
        {
          refId: "plugin-drift",
          category: "plugin_skill_metadata",
          summary: "Plugin metadata changed.",
          expectedHashPrefix: "oldplugin",
          currentHashPrefix: "newplugin"
        },
        {
          refId: "source-mismatch",
          category: "memory_recall",
          summary: "Memory source mismatch.",
          sourceType: "memory",
          expectedSourceType: "project_knowledge"
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "MCP_DESCRIPTOR_CHANGED",
        "PLUGIN_SKILL_METADATA_CHANGED",
        "SOURCE_TYPE_MISMATCH"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks git drift, old verification, and handoff missing context", () => {
    const report = buildEvidenceFreshnessDriftReport({
      evidenceRefs: [
        {
          refId: "git-drift",
          category: "git_status_diff",
          summary: "Git diff changed.",
          expectedHashPrefix: "oldgit",
          currentHashPrefix: "newgit"
        },
        {
          refId: "verify-old",
          category: "shell_verification",
          summary: "Verification older than apply.",
          validatedAt: "2026-07-05T00:00:00.000Z",
          applyCompletedAt: "2026-07-05T00:01:00.000Z"
        },
        {
          refId: "handoff-missing",
          category: "agent_handoff_dossier",
          summary: "Agent handoff missing context.",
          contextRefPresent: false
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "GIT_DIFF_CHANGED_AFTER_VALIDATION",
        "VERIFICATION_OLDER_THAN_APPLY",
        "AGENT_HANDOFF_MISSING_CONTEXT"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks raw evidence, API key markers, and execution claims without leaking raw text", () => {
    const report = buildEvidenceFreshnessDriftReport({
      evidenceRefs: [
        {
          refId: "unsafe-ref",
          category: "project_knowledge",
          summary: "Bearer abcdefghijklmnop",
          rawEvidence: "do not leak raw evidence",
          readiness: {
            canReadRawEvidence: true
          }
        }
      ]
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "FORBIDDEN_RAW_EVIDENCE_FIELD",
        "BEARER_TOKEN_MARKER",
        "EXECUTION_FLAG_TRUE"
      ])
    );
    expect(serialized).not.toContain("do not leak raw evidence");
    expect(serialized).not.toContain("Bearer abcdefghijklmnop");
    expectNoExecution(report);
  });

  it("keeps output deterministic and summary-only", () => {
    const first = buildEvidenceFreshnessDriftReport({
      evidenceRefs: safeRefs,
      createdAt: "2026-07-05T00:02:00.000Z",
      idGenerator: () => "evidence-freshness-deterministic"
    });
    const second = buildEvidenceFreshnessDriftReport({
      evidenceRefs: safeRefs,
      createdAt: "2026-07-05T00:02:00.000Z",
      idGenerator: () => "evidence-freshness-deterministic"
    });
    const serialized = JSON.stringify(first);

    expect(first.freshnessHash).toBe(second.freshnessHash);
    expect(serialized).not.toContain("rawEvidence");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("apiKey");
    expectNoExecution(first);
  });
});
