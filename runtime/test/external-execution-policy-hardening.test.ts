import { describe, expect, it } from "vitest";

import {
  buildExternalExecutionPolicyHardeningReport,
  summarizeExternalExecutionPolicyHardening,
  validateExternalExecutionPolicyHardening,
  type ExternalExecutionCapabilityDescriptorSummary,
  type ExternalExecutionPolicyHardeningResult
} from "../src/capabilities/index.js";

const safeDescriptor: ExternalExecutionCapabilityDescriptorSummary = {
  descriptorId: "mcp.safe.read",
  sourceType: "mcp_readonly_tool",
  riskLevel: "low",
  mode: "approved_lane",
  operationKind: "read",
  provenanceSummary: "MCP readonly contract summary.",
  readOnly: true,
  mutating: false,
  requiresApproval: true,
  warningCodes: []
};

function safeInput() {
  return {
    capabilityDescriptors: [safeDescriptor],
    policySummaries: [
      {
        policyId: "policy-safe",
        descriptorId: "mcp.safe.read",
        sourceType: "mcp_readonly_tool",
        maxRiskLevel: "medium",
        requiresApproval: true,
        allowAuto: false,
        redactionAuditRequired: true
      }
    ],
    approvalReceipts: [
      {
        receiptId: "receipt-safe",
        descriptorId: "mcp.safe.read",
        sourceType: "mcp_readonly_tool",
        scopeHash: "scope-safe",
        approved: true
      }
    ],
    permissionLeases: [
      {
        leaseId: "lease-safe",
        descriptorId: "mcp.safe.read",
        sourceType: "mcp_readonly_tool",
        scopeHash: "scope-safe",
        expiresAt: "2026-12-31T00:00:00.000Z"
      }
    ],
    replaySummaries: [
      {
        resultId: "result-safe",
        descriptorId: "mcp.safe.read",
        sourceType: "mcp_readonly_tool",
        eventSummaryPresent: true,
        replayProjectionPresent: true,
        redactionAuditPresent: true
      }
    ]
  };
}

function codes(result: ExternalExecutionPolicyHardeningResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoBroadExecution(
  result: ExternalExecutionPolicyHardeningResult
): void {
  expect(result.readiness.canExecuteMutatingMcpTool).toBe(false);
  expect(result.readiness.canExecutePluginCode).toBe(false);
  expect(result.readiness.canExecuteSkillRuntime).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.canExecuteDesktopActionBroadly).toBe(false);
  expect(result.readiness.canExecuteArbitraryShell).toBe(false);
  expect(result.readiness.canWriteEventStoreRaw).toBe(false);
  expect(result.readiness.canInvokeArbitraryMcpTool).toBe(false);
  expect(result.readiness.canIssueBroadPermissionLease).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("external execution policy hardening", () => {
  it("builds a policy-ready summary for matching descriptors, policy, lease, receipt, and replay", () => {
    const result = buildExternalExecutionPolicyHardeningReport({
      ...safeInput(),
      idGenerator: () => "external-policy-test"
    });
    const summary = summarizeExternalExecutionPolicyHardening(result);

    expect(result.status).toBe("policy_ready");
    expect(result.policyId).toBe("external-policy-test");
    expect(result.descriptorCount).toBe(1);
    expect(result.policyCount).toBe(1);
    expect(result.approvalReceiptCount).toBe(1);
    expect(result.leaseCount).toBe(1);
    expect(result.replaySummaryCount).toBe(1);
    expect(result.leaseReceiptSummary.approvalMatchedCount).toBe(1);
    expect(result.leaseReceiptSummary.leaseMatchedCount).toBe(1);
    expect(result.riskSummary.low).toBe(1);
    expect(summary.source).toBe("runtime_external_execution_policy_hardening");
    expect(result.readiness.canReviewExternalExecutionPolicy).toBe(true);
    expectNoBroadExecution(result);
  });

  it("blocks missing descriptors and unknown risk", () => {
    const missing = buildExternalExecutionPolicyHardeningReport();
    const unknown = buildExternalExecutionPolicyHardeningReport({
      capabilityDescriptors: [
        {
          descriptorId: "unknown-risk",
          sourceType: "mcp_readonly_tool",
          riskLevel: "surprise",
          provenanceSummary: "Unknown risk summary."
        }
      ],
      replaySummaries: [
        {
          descriptorId: "unknown-risk",
          eventSummaryPresent: true,
          replayProjectionPresent: true,
          redactionAuditPresent: true
        }
      ]
    });

    expect(missing.status).toBe("blocked");
    expect(codes(missing)).toContain("DESCRIPTOR_MISSING");
    expect(unknown.status).toBe("blocked");
    expect(codes(unknown)).toContain("DESCRIPTOR_RISK_UNKNOWN");
    expectNoBroadExecution(missing);
    expectNoBroadExecution(unknown);
  });

  it("blocks mutating read-only MCP tools and plugin or skill runtime execution", () => {
    const result = buildExternalExecutionPolicyHardeningReport({
      capabilityDescriptors: [
        {
          descriptorId: "mcp.mutate",
          sourceType: "mcp_readonly_tool",
          riskLevel: "medium",
          provenanceSummary: "Mutating tool summary.",
          readOnly: true,
          mutating: true,
          operationKind: "write"
        },
        {
          descriptorId: "plugin.runtime",
          sourceType: "plugin",
          riskLevel: "high",
          provenanceSummary: "Plugin runtime summary.",
          runtimeExecutionEnabled: true
        }
      ],
      policySummaries: [
        {
          descriptorId: "mcp.mutate",
          sourceType: "mcp_readonly_tool",
          maxRiskLevel: "critical",
          redactionAuditRequired: true
        },
        {
          descriptorId: "plugin.runtime",
          sourceType: "plugin",
          maxRiskLevel: "critical",
          redactionAuditRequired: true
        }
      ],
      replaySummaries: [
        {
          descriptorId: "mcp.mutate",
          sourceType: "mcp_readonly_tool",
          eventSummaryPresent: true,
          replayProjectionPresent: true,
          redactionAuditPresent: true
        },
        {
          descriptorId: "plugin.runtime",
          sourceType: "plugin",
          eventSummaryPresent: true,
          replayProjectionPresent: true,
          redactionAuditPresent: true
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "MUTATING_CAPABILITY_MARKED_READ_ONLY",
        "MCP_MUTATING_TOOL_MARKED_READ_ONLY",
        "PLUGIN_SKILL_RUNTIME_EXECUTION_ENABLED",
        "EXECUTION_READINESS_FLAG_TRUE"
      ])
    );
    expectNoBroadExecution(result);
  });

  it("blocks lease scope mismatch, expired lease, approval mismatch, source mismatch, and high risk policy mismatch", () => {
    const result = buildExternalExecutionPolicyHardeningReport({
      capabilityDescriptors: [
        {
          ...safeDescriptor,
          descriptorId: "mcp.mismatch",
          riskLevel: "critical"
        }
      ],
      policySummaries: [
        {
          descriptorId: "mcp.mismatch",
          sourceType: "plugin",
          maxRiskLevel: "medium",
          allowAuto: true,
          redactionAuditRequired: true
        }
      ],
      approvalReceipts: [
        {
          descriptorId: "mcp.mismatch",
          sourceType: "plugin",
          approved: false
        }
      ],
      permissionLeases: [
        {
          descriptorId: "mcp.mismatch",
          sourceType: "plugin",
          scopeHash: "broad",
          expiresAt: "2025-01-01T00:00:00.000Z"
        }
      ],
      replaySummaries: [
        {
          descriptorId: "mcp.mismatch",
          sourceType: "plugin",
          eventSummaryPresent: true,
          replayProjectionPresent: true,
          redactionAuditPresent: true
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "SOURCE_TYPE_MISMATCH",
        "RISK_TOO_HIGH_FOR_POLICY",
        "AUTO_ALLOWED_ON_MUTATING_OR_HIGH_RISK_CAPABILITY",
        "APPROVAL_RECEIPT_MISMATCH",
        "APPROVAL_SOURCE_TYPE_MISMATCH",
        "LEASE_SOURCE_TYPE_MISMATCH",
        "LEASE_SCOPE_MISMATCH",
        "LEASE_EXPIRED",
        "REPLAY_SOURCE_TYPE_MISMATCH"
      ])
    );
    expectNoBroadExecution(result);
  });

  it("blocks missing replay summary and warns on missing lease, provenance, redaction audit, and non-critical replay stage", () => {
    const result = buildExternalExecutionPolicyHardeningReport({
      capabilityDescriptors: [
        {
          descriptorId: "skill.warning",
          sourceType: "skill",
          riskLevel: "medium",
          mode: "manual_only",
          requiresApproval: true
        },
        {
          descriptorId: "mcp.no-replay",
          sourceType: "mcp_readonly_tool",
          riskLevel: "low",
          provenanceSummary: "No replay summary.",
          requiresApproval: false
        }
      ],
      policySummaries: [
        {
          descriptorId: "skill.warning",
          sourceType: "skill",
          maxRiskLevel: "high",
          redactionAuditRequired: false
        },
        {
          descriptorId: "mcp.no-replay",
          sourceType: "mcp_readonly_tool",
          maxRiskLevel: "high",
          redactionAuditRequired: true
        }
      ],
      approvalReceipts: [
        {
          descriptorId: "skill.warning",
          sourceType: "skill",
          approved: true
        }
      ],
      replaySummaries: [
        {
          descriptorId: "skill.warning",
          sourceType: "skill",
          eventSummaryPresent: true,
          replayProjectionPresent: false,
          redactionAuditPresent: false
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "LEASE_REQUIRED_SUMMARY_MISSING",
        "DESCRIPTOR_PROVENANCE_MISSING",
        "MANUAL_ONLY_CAPABILITY_PRESENT",
        "OUTPUT_REDACTION_AUDIT_MISSING",
        "REPLAY_SUMMARY_MISSING_NON_CRITICAL_STAGE",
        "EVENT_RESULT_MISSING_REPLAY_SUMMARY"
      ])
    );
    expectNoBroadExecution(result);
  });

  it("blocks raw fields, secret markers, and readiness execution flags without leaking raw values", () => {
    const result = buildExternalExecutionPolicyHardeningReport({
      ...safeInput(),
      appSurfaceSummary: {
        rawOutput: "RAW_EXTERNAL_TOOL_OUTPUT",
        marker: "Bearer abcdefghijklmnop",
        readiness: {
          canExecutePluginCode: true
        }
      }
    } as never);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "RAW_OUTPUT_FIELD_REJECTED",
        "BEARER_TOKEN_MARKER_REJECTED",
        "EXECUTION_READINESS_FLAG_TRUE"
      ])
    );
    expect(serialized).not.toContain("RAW_EXTERNAL_TOOL_OUTPUT");
    expect(serialized).not.toContain("Bearer abcdefghijklmnop");
    expectNoBroadExecution(result);
  });

  it("returns deterministic summary hashes and validation findings", () => {
    const first = buildExternalExecutionPolicyHardeningReport({
      ...safeInput(),
      idGenerator: () => "deterministic-policy"
    });
    const second = buildExternalExecutionPolicyHardeningReport({
      ...safeInput(),
      idGenerator: () => "deterministic-policy"
    });
    const validationFindings =
      validateExternalExecutionPolicyHardening(safeInput());

    expect(first.policyHash).toBe(second.policyHash);
    expect(first.policyId).toBe(second.policyId);
    expect(validationFindings).toHaveLength(0);
    expectNoBroadExecution(first);
  });
});
