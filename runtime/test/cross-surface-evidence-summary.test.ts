import { describe, expect, it } from "vitest";

import {
  buildCrossSurfaceEvidenceSummary,
  summarizeCrossSurfaceEvidenceSummary,
  validateCrossSurfaceEvidenceSummaryInput,
  type CrossSurfaceEvidenceRefInput,
  type CrossSurfaceEvidenceSummary
} from "../src/workflows/cross-surface-evidence-summary.js";

const safeEvidenceRefs: CrossSurfaceEvidenceRefInput[] = [
  {
    refId: "knowledge-ref",
    kind: "project_knowledge",
    status: "summary_ready",
    summary: "Project knowledge summary ref.",
    hashPrefix: "abc12345",
    summaryOnly: true
  },
  {
    refId: "mcp-metadata-ref",
    kind: "mcp_readonly_metadata",
    status: "summary_ready",
    summary: "MCP read-only metadata summary.",
    hashPrefix: "def67890",
    summaryOnly: true
  },
  {
    refId: "mcp-tool-summary-ref",
    kind: "mcp_readonly_tool_summary",
    status: "warning",
    summary: "MCP readonly tool output summary counts only.",
    warningCodes: ["MCP_OUTPUT_TRUNCATED"],
    summaryOnly: true
  },
  {
    refId: "plugin-metadata-ref",
    kind: "plugin_metadata",
    status: "summary_ready",
    summary: "Plugin metadata summary.",
    summaryOnly: true
  },
  {
    refId: "skill-metadata-ref",
    kind: "skill_metadata",
    status: "summary_ready",
    summary: "Skill metadata summary.",
    summaryOnly: true
  },
  {
    refId: "desktop-observer-ref",
    kind: "desktop_observer_metadata",
    status: "summary_ready",
    summary: "Desktop observer metadata summary.",
    summaryOnly: true
  },
  {
    refId: "desktop-action-proposal-ref",
    kind: "desktop_action_proposal_summary",
    status: "summary_ready",
    summary: "Desktop action proposal summary.",
    summaryOnly: true
  }
];

function expectNoExecution(summary: CrossSurfaceEvidenceSummary): void {
  expect(summary.readiness.canReadProjectRawMemory).toBe(false);
  expect(summary.readiness.canReadMcpResourceContent).toBe(false);
  expect(summary.readiness.canCallMcpTool).toBe(false);
  expect(summary.readiness.canExecutePluginRuntime).toBe(false);
  expect(summary.readiness.canExecuteSkillRuntime).toBe(false);
  expect(summary.readiness.canTriggerDesktopObserver).toBe(false);
  expect(summary.readiness.canExecuteDesktopAction).toBe(false);
  expect(summary.readiness.canCallDeepSeek).toBe(false);
  expect(summary.readiness.canWriteEventStore).toBe(false);
  expect(summary.readiness.canApplyPatch).toBe(false);
  expect(summary.readiness.canRollback).toBe(false);
  expect(summary.readiness.canExecuteGit).toBe(false);
  expect(summary.readiness.canExecuteShell).toBe(false);
  expect(summary.readiness.appCanExecute).toBe(false);
}

describe("cross-surface evidence summary", () => {
  it("aggregates safe evidence refs", () => {
    const summary = buildCrossSurfaceEvidenceSummary({
      evidenceRefs: [...safeEvidenceRefs],
      sourceKind: "fixture",
      createdAt: "2026-07-04T00:00:00.000Z",
      idGenerator: () => "cross-surface-evidence-test"
    });

    expect(summary.status).toBe("warning");
    expect(summary.evidenceSummaryId).toBe("cross-surface-evidence-test");
    expect(summary.evidenceCount).toBe(7);
    expect(summary.kindCounts.project_knowledge).toBe(1);
    expect(summary.kindCounts.mcp_readonly_metadata).toBe(1);
    expect(summary.workflowSummaryRefs.map((ref) => ref.stepKind)).toContain(
      "knowledge_recall"
    );
    expect(summary.workflowSummaryRefs.map((ref) => ref.stepKind)).toContain(
      "mcp_evidence"
    );
    expect(summary.workflowSummaryRefs.map((ref) => ref.stepKind)).toContain(
      "plugin_skill_metadata"
    );
    expect(summary.readiness.canAttachToWorkflowPreview).toBe(true);
    expectNoExecution(summary);
  });

  it("blocks raw source, diff, and prompt fields", () => {
    const summary = buildCrossSurfaceEvidenceSummary({
      evidenceRefs: [
        {
          refId: "raw-ref",
          kind: "project_knowledge",
          summary: "Safe summary",
          rawPrompt: "do not leak raw prompt",
          rawSource: "do not leak raw source",
          rawDiff: "do not leak raw diff"
        }
      ]
    });
    const serialized = JSON.stringify(summary);

    expect(summary.status).toBe("blocked");
    expect(summary.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_FIELD"
    );
    expect(serialized).not.toContain("do not leak raw prompt");
    expect(serialized).not.toContain("do not leak raw source");
    expect(serialized).not.toContain("do not leak raw diff");
    expectNoExecution(summary);
  });

  it("blocks raw MCP output", () => {
    const summary = buildCrossSurfaceEvidenceSummary({
      evidenceRefs: [
        {
          refId: "mcp-raw-ref",
          kind: "mcp_readonly_tool_summary",
          summary: "Safe tool result counts.",
          rawMcpOutput: "raw MCP output should not appear"
        }
      ]
    });

    expect(summary.status).toBe("blocked");
    expect(summary.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_FIELD"
    );
    expect(JSON.stringify(summary)).not.toContain("raw MCP output should not appear");
  });

  it("blocks raw desktop screenshot", () => {
    const summary = buildCrossSurfaceEvidenceSummary({
      evidenceRefs: [
        {
          refId: "desktop-raw-ref",
          kind: "desktop_observer_metadata",
          summary: "Desktop metadata summary.",
          rawDesktopScreenshot: "raw screenshot bytes"
        }
      ]
    });

    expect(summary.status).toBe("blocked");
    expect(summary.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_FIELD"
    );
    expect(JSON.stringify(summary)).not.toContain("raw screenshot bytes");
  });

  it("blocks plugin package raw content", () => {
    const summary = buildCrossSurfaceEvidenceSummary({
      evidenceRefs: [
        {
          refId: "plugin-raw-ref",
          kind: "plugin_metadata",
          summary: "Plugin metadata summary.",
          rawPluginPackage: "package archive bytes"
        }
      ]
    });

    expect(summary.status).toBe("blocked");
    expect(summary.findings.map((finding) => finding.code)).toContain(
      "FORBIDDEN_FIELD"
    );
    expect(JSON.stringify(summary)).not.toContain("package archive bytes");
  });

  it("blocks secret markers and execution readiness claims", () => {
    const summary = buildCrossSurfaceEvidenceSummary({
      evidenceRefs: [
        {
          refId: "secret-ref",
          kind: "project_knowledge",
          summary: "sk-fake-cross-surface-evidence-secret",
          readiness: {
            canCallMcpTool: true
          }
        }
      ]
    });
    const codes = summary.findings.map((finding) => finding.code);

    expect(summary.status).toBe("blocked");
    expect(codes).toContain("API_KEY_MARKER");
    expect(codes).toContain("EXECUTION_FLAG_TRUE");
    expect(JSON.stringify(summary)).not.toContain(
      "sk-fake-cross-surface-evidence-secret"
    );
    expectNoExecution(summary);
  });

  it("blocks duplicate refs and unknown evidence kinds", () => {
    const findings = validateCrossSurfaceEvidenceSummaryInput({
      evidenceRefs: [
        {
          refId: "duplicate-ref",
          kind: "project_knowledge",
          summary: "One summary."
        },
        {
          refId: "duplicate-ref",
          kind: "unknown",
          summary: "Another summary."
        }
      ]
    });
    const codes = findings.map((finding) => finding.code);

    expect(codes).toContain("DUPLICATE_REF");
    expect(codes).toContain("UNKNOWN_EVIDENCE_KIND");
  });

  it("produces summary-only output and deterministic hash", () => {
    const first = buildCrossSurfaceEvidenceSummary({
      evidenceRefs: [...safeEvidenceRefs],
      idGenerator: () => "deterministic-evidence-id",
      createdAt: "2026-07-04T00:00:00.000Z"
    });
    const second = buildCrossSurfaceEvidenceSummary({
      evidenceRefs: [...safeEvidenceRefs],
      idGenerator: () => "deterministic-evidence-id",
      createdAt: "2026-07-04T00:00:00.000Z"
    });
    const summary = summarizeCrossSurfaceEvidenceSummary(first);
    const serialized = JSON.stringify(first);

    expect(first.evidenceHash).toBe(second.evidenceHash);
    expect(summary.source).toBe("runtime_cross_surface_evidence_summary");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("reasoning_content");
    expect(serialized).not.toContain("Authorization");
    expectNoExecution(first);
  });
});
