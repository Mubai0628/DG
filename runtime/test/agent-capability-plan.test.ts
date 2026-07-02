import { describe, expect, it } from "vitest";

import {
  buildAgentCapabilityPlan,
  buildFixedAgentRoleOutput,
  buildFixedAgentRunPlan,
  summarizeAgentCapabilityPlan,
  type CapabilityDescriptor
} from "../src/index.js";

function descriptor(
  overrides: Partial<CapabilityDescriptor> = {}
): CapabilityDescriptor {
  return {
    id: "runtime.context.assembly",
    title: "Context assembly summary",
    sourceType: "native",
    category: "unknown",
    riskLevel: "A1_read",
    invokePolicy: "MANUAL_ONLY",
    executionMode: "SIMULATE",
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    supportsDryRun: true,
    requiresElicitation: false,
    canWriteMemory: false,
    trustTier: "core",
    version: "0.21.0",
    owner: "runtime",
    description: "Summary-only test descriptor.",
    eventTypes: ["capability.invocation.planned"],
    ...overrides
  };
}

function planAndOutput(
  role: "orchestrator" | "coder" | "reviewer" | "verifier"
) {
  const runPlan = buildFixedAgentRunPlan({
    intent: "code_change",
    objectiveSummary: "Plan capability refs for fixed roles.",
    evidenceRefs: [
      {
        refId: "evidence",
        kind: "manual_note",
        summary: "Summary-only evidence."
      }
    ]
  }).plan!;
  const roleOutput = buildFixedAgentRoleOutput({
    role,
    routeSummary: { refId: "route", hash: "routehash" },
    modelProposalImportSummaryRefs: [{ refId: "model", hash: "modelhash" }],
    validationSummaryRefs: [{ refId: "validation", hash: "validationhash" }],
    gitSafeLaneSummaries: [{ refId: "git", hash: "githash" }],
    evidenceRefs: [{ refId: "evidence", hash: "evidencehash" }]
  }).output!;
  return { runPlan, roleOutput };
}

function expectExecutionReadinessFalse(
  result: ReturnType<typeof buildAgentCapabilityPlan>
) {
  expect(result.readiness.canInvokeCapability).toBe(false);
  expect(result.readiness.canCallMcpTool).toBe(false);
  expect(result.readiness.canRunPlugin).toBe(false);
  expect(result.readiness.canRunSkill).toBe(false);
  expect(result.readiness.canExecuteGit).toBe(false);
  expect(result.readiness.canExecuteShell).toBe(false);
  expect(result.readiness.canWriteFiles).toBe(false);
  expect(result.readiness.canApplyPatch).toBe(false);
  expect(result.readiness.canRollback).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canIssuePermissionLease).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("agent capability plan", () => {
  it("allows orchestrator context, routing, and evidence capability refs", () => {
    const { runPlan, roleOutput } = planAndOutput("orchestrator");
    const result = buildAgentCapabilityPlan({
      fixedRunPlan: runPlan,
      roleOutput,
      requestedCapabilityRefs: [
        "runtime.context.assembly",
        "runtime.agent.route_preview",
        "runtime.evidence.summary"
      ],
      capabilityDescriptors: [
        descriptor({ id: "runtime.context.assembly" }),
        descriptor({ id: "runtime.agent.route_preview" }),
        descriptor({ id: "runtime.evidence.summary" })
      ]
    });

    expect(result.status).toBe("ready");
    expect(result.allowedRefs.map((ref) => ref.capabilityId)).toEqual([
      "runtime.context.assembly",
      "runtime.agent.route_preview",
      "runtime.evidence.summary"
    ]);
    expect(result.blockedRefs).toHaveLength(0);
    expectExecutionReadinessFalse(result);
  });

  it("allows coder proposal preview refs but blocks direct apply", () => {
    const { runPlan, roleOutput } = planAndOutput("coder");
    const result = buildAgentCapabilityPlan({
      fixedRunPlan: runPlan,
      roleOutput,
      requestedCapabilityRefs: [
        "runtime.model_proposal.import",
        "runtime.patch_proposal.preview",
        "runtime.patch.apply"
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.allowedRefs).toHaveLength(2);
    expect(result.blockedRefs.map((ref) => ref.capabilityId)).toContain(
      "runtime.patch.apply"
    );
    expect(result.disabledReasons).toContain("DIRECT_APPLY_ROLLBACK_BLOCKED");
  });

  it("allows reviewer validation, audit, and approval draft refs", () => {
    const { runPlan, roleOutput } = planAndOutput("reviewer");
    const result = buildAgentCapabilityPlan({
      fixedRunPlan: runPlan,
      roleOutput,
      requestedCapabilityRefs: [
        "runtime.patch.validation_preview",
        "runtime.patch.diff_audit_preview",
        "runtime.patch.approval_draft_preview"
      ]
    });

    expect(result.status).toBe("ready");
    expect(result.allowedRefs).toHaveLength(3);
    expect(result.approvalRequirements).toEqual([
      "runtime.patch.validation_preview",
      "runtime.patch.diff_audit_preview",
      "runtime.patch.approval_draft_preview"
    ]);
  });

  it("allows verifier Git read and shell scoped verification refs", () => {
    const { runPlan, roleOutput } = planAndOutput("verifier");
    const result = buildAgentCapabilityPlan({
      fixedRunPlan: runPlan,
      roleOutput,
      requestedCapabilityRefs: [
        "native.git.status",
        "native.git.diff_summary",
        "runtime.shell.scoped_test_summary"
      ],
      capabilityDescriptors: [
        descriptor({
          id: "native.git.status",
          category: "git",
          riskLevel: "A1_read"
        }),
        descriptor({
          id: "native.git.diff_summary",
          category: "git",
          riskLevel: "A1_read"
        }),
        descriptor({
          id: "runtime.shell.scoped_test_summary",
          category: "shell",
          riskLevel: "A1_read"
        })
      ]
    });

    expect(result.status).toBe("ready");
    expect(result.allowedRefs).toHaveLength(3);
    expect(result.blockedRefs).toHaveLength(0);
  });

  it("blocks mutating MCP tools", () => {
    const { runPlan, roleOutput } = planAndOutput("verifier");
    const result = buildAgentCapabilityPlan({
      fixedRunPlan: runPlan,
      roleOutput,
      requestedCapabilityRefs: ["mcp.fs.write"],
      capabilityDescriptors: [
        descriptor({
          id: "mcp.fs.write",
          sourceType: "mcp",
          category: "fs",
          executionMode: "MUTATING",
          riskLevel: "A4_external_effect"
        })
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.disabledReasons).toContain("MCP_MUTATING_TOOL_BLOCKED");
    expect(result.blockedRefs[0]?.allowed).toBe(false);
  });

  it("blocks arbitrary shell commands", () => {
    const { runPlan, roleOutput } = planAndOutput("verifier");
    const result = buildAgentCapabilityPlan({
      fixedRunPlan: runPlan,
      roleOutput,
      requestedCapabilityRefs: ["native.shell.exec"],
      capabilityDescriptors: [
        descriptor({
          id: "native.shell.exec",
          category: "shell",
          executionMode: "MUTATING",
          riskLevel: "A4_external_effect"
        })
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.disabledReasons).toContain("SHELL_ARBITRARY_COMMAND_BLOCKED");
  });

  it("blocks Git write and PermissionLease issuing", () => {
    const { runPlan, roleOutput } = planAndOutput("verifier");
    const result = buildAgentCapabilityPlan({
      fixedRunPlan: runPlan,
      roleOutput,
      requestedCapabilityRefs: [
        "native.git.push",
        "runtime.permission_lease.issue"
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.disabledReasons).toContain("GIT_WRITE_BLOCKED");
    expect(result.disabledReasons).toContain(
      "PERMISSION_LEASE_ISSUING_BLOCKED"
    );
  });

  it("blocks plugin and skill runtime execution", () => {
    const { runPlan, roleOutput } = planAndOutput("orchestrator");
    const result = buildAgentCapabilityPlan({
      fixedRunPlan: runPlan,
      roleOutput,
      requestedCapabilityRefs: [
        "plugin.runner.execute",
        "skill.runner.execute"
      ],
      capabilityDescriptors: [
        descriptor({
          id: "plugin.runner.execute",
          sourceType: "plugin",
          executionMode: "MUTATING"
        }),
        descriptor({
          id: "skill.runner.execute",
          sourceType: "skill",
          executionMode: "READ_ONLY"
        })
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.disabledReasons).toContain("PLUGIN_SKILL_RUNTIME_BLOCKED");
  });

  it("blocks desktop action and native bridge", () => {
    const { runPlan, roleOutput } = planAndOutput("orchestrator");
    const result = buildAgentCapabilityPlan({
      fixedRunPlan: runPlan,
      roleOutput,
      requestedCapabilityRefs: ["native.desktop.click", "native.bridge.send"],
      capabilityDescriptors: [
        descriptor({ id: "native.desktop.click", category: "desktop" }),
        descriptor({ id: "native.bridge.send", category: "bridge" })
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.disabledReasons).toContain("DESKTOP_ACTION_BLOCKED");
    expect(result.disabledReasons).toContain("NATIVE_BRIDGE_BLOCKED");
  });

  it("keeps output summary-only and does not invoke capabilities", () => {
    const { runPlan, roleOutput } = planAndOutput("verifier");
    const result = buildAgentCapabilityPlan({
      fixedRunPlan: runPlan,
      roleOutput,
      requestedCapabilityRefs: ["native.git.status"],
      idGenerator: () => "agent-capability-plan-test"
    });
    const summary = summarizeAgentCapabilityPlan(result);
    const serialized = JSON.stringify({ result, summary });

    expect(result.planId).toBe("agent-capability-plan-test");
    expect(summary.summaryOnly).toBe(true);
    expect(result.allowedRefs[0]).toMatchObject({
      capabilityId: "native.git.status",
      summaryOnly: true
    });
    expect(serialized).not.toContain("raw prompt");
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("sk-fake");
    expectExecutionReadinessFalse(result);
  });
});
