import { describe, expect, it } from "vitest";

import {
  buildCapabilityPolicyEnforcementReport,
  summarizeCapabilityPolicyEnforcementReport,
  type CapabilityPolicyEnforcementReport,
  type CapabilityPolicyItemInput
} from "../src/workflows/capability-policy-enforcement.js";

const safeCapabilities: CapabilityPolicyItemInput[] = [
  {
    capabilityId: "broker-plan-1",
    category: "broker_plan_preview",
    mode: "manual_only",
    riskLevel: "medium",
    summary: "Broker plan summary for fixed approved workflow lanes.",
    manualApprovalPresent: true,
    warningCodes: []
  },
  {
    capabilityId: "desktop-proposal-1",
    category: "desktop_action_proposal",
    mode: "approved_lane",
    riskLevel: "low",
    summary: "Desktop action proposal summary for focusing an observed window.",
    actionKind: "focus_window",
    allowlisted: true,
    warningCodes: []
  },
  {
    capabilityId: "git-lane-1",
    category: "git_shell_lane_summary",
    mode: "approved_lane",
    riskLevel: "medium",
    summary: "Git safe lane summary using a fixed template.",
    laneKind: "fixed_git_status",
    fixedTemplate: true,
    warningCodes: []
  }
];

function expectNoExecution(report: CapabilityPolicyEnforcementReport): void {
  expect(report.readiness.canExecuteCapability).toBe(false);
  expect(report.readiness.canApprove).toBe(false);
  expect(report.readiness.canApplyPatch).toBe(false);
  expect(report.readiness.canRollback).toBe(false);
  expect(report.readiness.canIssuePermissionLease).toBe(false);
  expect(report.readiness.canInvokeMcpTool).toBe(false);
  expect(report.readiness.canExecutePluginRuntime).toBe(false);
  expect(report.readiness.canExecuteDesktopAction).toBe(false);
  expect(report.readiness.canExecuteGit).toBe(false);
  expect(report.readiness.canExecuteShell).toBe(false);
  expect(report.readiness.appCanExecute).toBe(false);
}

describe("capability policy enforcement", () => {
  it("marks safe capability summaries policy ready", () => {
    const report = buildCapabilityPolicyEnforcementReport({
      capabilities: safeCapabilities,
      idGenerator: () => "capability-policy-test"
    });
    const summary = summarizeCapabilityPolicyEnforcementReport(report);

    expect(report.status).toBe("policy_ready");
    expect(report.policyId).toBe("capability-policy-test");
    expect(report.allowedCount).toBe(3);
    expect(report.blockedCount).toBe(0);
    expect(report.categoryCounts.desktop_action_proposal).toBe(1);
    expect(report.riskCounts.medium).toBe(2);
    expect(summary.source).toBe("runtime_capability_policy_enforcement");
    expect(report.readiness.canUseForPolicyReview).toBe(true);
    expectNoExecution(report);
  });

  it("blocks disabled capabilities that claim execution", () => {
    const report = buildCapabilityPolicyEnforcementReport({
      capabilities: [
        {
          capabilityId: "disabled-1",
          category: "capability_descriptor",
          mode: "disabled",
          riskLevel: "high",
          summary: "Disabled capability summary.",
          readiness: {
            canExecuteCapability: true
          },
          warningCodes: []
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "DISABLED_CAPABILITY_CLAIMS_EXECUTION",
        "APP_READINESS_CLAIMS_EXECUTION",
        "EXECUTION_FLAG_TRUE"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks manual-only missing approvals and read-only mutation", () => {
    const report = buildCapabilityPolicyEnforcementReport({
      capabilities: [
        {
          capabilityId: "manual-1",
          category: "broker_plan_preview",
          mode: "manual_only",
          riskLevel: "medium",
          summary: "Manual-only plan without approval.",
          warningCodes: []
        },
        {
          capabilityId: "readonly-1",
          category: "capability_descriptor",
          mode: "read_only",
          riskLevel: "medium",
          summary: "Read-only descriptor attempting mutation.",
          canMutate: true,
          warningCodes: []
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "MANUAL_ONLY_MISSING_APPROVAL",
        "READ_ONLY_MUTATION"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks MCP mutation, plugin runtime, desktop allowlist misses, shell lanes, and broad leases", () => {
    const report = buildCapabilityPolicyEnforcementReport({
      capabilities: [
        {
          capabilityId: "mcp-1",
          category: "mcp_descriptor",
          mode: "manual_only",
          riskLevel: "high",
          summary: "MCP mutating descriptor.",
          canMutate: true,
          manualApprovalPresent: true,
          warningCodes: []
        },
        {
          capabilityId: "plugin-1",
          category: "plugin_skill_descriptor",
          mode: "manual_only",
          riskLevel: "high",
          summary: "Plugin runtime descriptor.",
          runtimeExecutionRequested: true,
          manualApprovalPresent: true,
          warningCodes: []
        },
        {
          capabilityId: "desktop-1",
          category: "desktop_action_proposal",
          mode: "manual_only",
          riskLevel: "high",
          summary: "Desktop action proposal outside allowlist.",
          actionKind: "drag_drop",
          manualApprovalPresent: true,
          warningCodes: []
        },
        {
          capabilityId: "shell-1",
          category: "git_shell_lane_summary",
          mode: "manual_only",
          riskLevel: "critical",
          summary: "Arbitrary shell lane.",
          laneKind: "arbitrary_shell",
          fixedTemplate: false,
          manualApprovalPresent: true,
          warningCodes: []
        },
        {
          capabilityId: "lease-1",
          category: "approval_consistency_report",
          mode: "manual_only",
          riskLevel: "critical",
          summary: "Broad PermissionLease summary.",
          broadLease: true,
          manualApprovalPresent: true,
          warningCodes: []
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "MCP_MUTATING_TOOL_BLOCKED",
        "PLUGIN_SKILL_RUNTIME_BLOCKED",
        "DESKTOP_ACTION_OUTSIDE_ALLOWLIST",
        "ARBITRARY_GIT_SHELL_BLOCKED",
        "BROAD_PERMISSION_LEASE"
      ])
    );
    expectNoExecution(report);
  });

  it("blocks raw fields, token markers, and readiness execution claims without leaking raw text", () => {
    const report = buildCapabilityPolicyEnforcementReport({
      capabilities: [
        {
          capabilityId: "unsafe-1",
          category: "capability_descriptor",
          mode: "manual_only",
          riskLevel: "medium",
          summary: "Bearer abcdefghijklmnop",
          manualApprovalPresent: true,
          rawOutput: "raw capability output",
          readiness: {
            canExecuteShell: true
          },
          warningCodes: []
        }
      ]
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "FORBIDDEN_FIELD",
        "BEARER_TOKEN_MARKER",
        "EXECUTION_FLAG_TRUE",
        "APP_READINESS_CLAIMS_EXECUTION"
      ])
    );
    expect(serialized).not.toContain("raw capability output");
    expect(serialized).not.toContain("Bearer abcdefghijklmnop");
    expectNoExecution(report);
  });

  it("keeps report hashes deterministic and summary-only", () => {
    const first = buildCapabilityPolicyEnforcementReport({
      capabilities: safeCapabilities,
      idGenerator: () => "capability-policy-deterministic"
    });
    const second = buildCapabilityPolicyEnforcementReport({
      capabilities: safeCapabilities,
      idGenerator: () => "capability-policy-deterministic"
    });
    const serialized = JSON.stringify(first);

    expect(first.enforcementHash).toBe(second.enforcementHash);
    expect(serialized).not.toContain("raw prompt");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("apiKey");
    expectNoExecution(first);
  });
});
