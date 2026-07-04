import { describe, expect, it } from "vitest";

import {
  buildExternalCapabilityBrokerIntegration,
  buildExternalCapabilityRedactionAudit,
  discoverMcpCapabilitiesReadonly,
  scanPluginSkillMetadata,
  summarizeExternalCapabilityRedactionAudit,
  validateExternalCapabilityManifest
} from "../src/index.js";

function safeManifest() {
  return validateExternalCapabilityManifest({
    schemaVersion: "external_capability_manifest.v1",
    manifestId: "mcp-safe-audit",
    sourceType: "mcp_server",
    sourceName: "Safe Audit MCP",
    sourceVersion: "0.1.0",
    publisherSummary: "Fixture.",
    descriptionSummary: "Safe descriptor metadata for audit.",
    capabilities: [
      {
        capabilityId: "mcp.safe.audit.read",
        displayName: "Safe audit read",
        category: "knowledge",
        descriptionSummary: "Read-only metadata preview.",
        operationKind: "read",
        riskLevel: "A1",
        defaultInvocationPolicy: "MANUAL_ONLY",
        requiresNetwork: false,
        requiresFilesystem: false,
        requiresShell: false,
        requiresDesktop: false
      }
    ],
    riskNotes: ["Metadata only."]
  });
}

function safeMcpDiscovery() {
  return discoverMcpCapabilitiesReadonly({
    serverId: "mcp.audit",
    displayName: "Audit MCP",
    transportMode: "metadata_only",
    tools: [
      {
        toolId: "mcp.audit.search",
        displayName: "Search audit metadata",
        descriptionSummary: "Search descriptor metadata.",
        riskLevel: "A1",
        defaultInvocationPolicy: "MANUAL_ONLY",
        inputSchemaSummary: { keyCount: 1 },
        outputSchemaSummary: { keyCount: 1 }
      }
    ]
  });
}

function safePluginScan() {
  return scanPluginSkillMetadata({
    packages: [
      {
        packageKind: "plugin",
        packageId: "plugin.audit",
        displayName: "Audit Plugin",
        version: "1.0.0",
        publisherSummary: "Fixture.",
        packageSource: "fixture_manifest",
        declaredCapabilities: [
          {
            capabilityId: "plugin.audit.preview",
            displayName: "Audit preview",
            descriptionSummary: "Preview plugin metadata.",
            operationKind: "compute",
            riskLevel: "A1",
            defaultInvocationPolicy: "MANUAL_ONLY"
          }
        ]
      }
    ]
  });
}

function expectNoExecution(
  audit: ReturnType<typeof buildExternalCapabilityRedactionAudit>
): void {
  expect(audit.readiness).toMatchObject({
    canConnectMcpServer: false,
    canInstallPlugin: false,
    canExecuteSkill: false,
    canInvokeCapability: false,
    canIssueLease: false,
    canWriteEventStore: false,
    canFetchNetwork: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("external capability redaction audit", () => {
  it("returns empty safely without inputs", () => {
    const audit = buildExternalCapabilityRedactionAudit();

    expect(audit.status).toBe("empty");
    expect(audit.descriptorCounts.totalDescriptorCount).toBe(0);
    expect(audit.readiness.canPreviewAudit).toBe(false);
    expectNoExecution(audit);
  });

  it("audits safe manifest, discovery, scan, broker, and App summaries", () => {
    const manifestResult = safeManifest();
    const mcpDiscoveryResult = safeMcpDiscovery();
    const pluginSkillScanResult = safePluginScan();
    const brokerIntegrationResult = buildExternalCapabilityBrokerIntegration({
      manifestResult,
      mcpDiscoveryResult,
      pluginSkillScanResult
    });
    const audit = buildExternalCapabilityRedactionAudit({
      manifestResult,
      mcpDiscoveryResult,
      pluginSkillScanResult,
      brokerIntegrationResult,
      appSurfaceSummary: {
        source: "app_capability_host_surface",
        brokerDescriptorCount: 3,
        riskSummary: { A1_read: 3 }
      }
    });
    const summary = summarizeExternalCapabilityRedactionAudit(audit);

    expect(audit.status).toBe("audit_ready");
    expect(audit.sourceCounts).toMatchObject({
      manifestResultCount: 1,
      mcpDiscoveryResultCount: 1,
      pluginSkillScanResultCount: 1,
      brokerIntegrationResultCount: 1,
      appSurfaceSummaryCount: 1
    });
    expect(audit.descriptorCounts.totalDescriptorCount).toBeGreaterThan(0);
    expect(audit.rawFieldDetectedCount).toBe(0);
    expect(summary.source).toBe("runtime_external_capability_redaction_audit");
    expect(audit.readiness.canPreviewAudit).toBe(true);
    expectNoExecution(audit);
  });

  it("audits P1H summary artifacts without raw output persistence", () => {
    const audit = buildExternalCapabilityRedactionAudit({
      policyHardeningReport: {
        status: "policy_ready",
        riskSummary: { low: 1 }
      },
      mcpReadonlyConsistencyReport: {
        status: "consistency_ready",
        redactionCounts: {
          redactedFieldCount: 1,
          rawFieldDetectedCount: 0
        }
      },
      sandboxEscapeReport: {
        status: "safe_metadata",
        blockedSignalCodes: []
      },
      replayCompletenessReport: {
        status: "replay_ready",
        resultCount: 2
      },
      externalResultSummaries: [
        {
          resultId: "external-result-1",
          descriptorRef: "descriptor-external-1",
          sourceType: "mcp_readonly_tool",
          hashPrefix: "abc123"
        }
      ]
    });
    const summary = summarizeExternalCapabilityRedactionAudit(audit);

    expect(audit.status).toBe("audit_ready");
    expect(audit.sourceCounts.policyHardeningReportCount).toBe(1);
    expect(audit.sourceCounts.mcpReadonlyConsistencyReportCount).toBe(1);
    expect(audit.sourceCounts.sandboxEscapeReportCount).toBe(1);
    expect(audit.sourceCounts.replayCompletenessReportCount).toBe(1);
    expect(audit.sourceCounts.externalResultSummaryCount).toBe(1);
    expect(audit.rawFieldDetectedCount).toBe(0);
    expect(summary.redactedFieldCount).toBe(0);
    expect(summary.riskSummary.low).toBe(1);
    expectNoExecution(audit);
  });

  it("blocks raw fields and secret markers", () => {
    const audit = buildExternalCapabilityRedactionAudit({
      manifestResult: safeManifest(),
      appSurfaceSummary: {
        rawArgs: "blocked",
        rawPrompt: "blocked",
        marker: "sk-fake1234567890"
      }
    } as never);
    const codes = audit.findings.map((finding) => finding.code);
    const serialized = JSON.stringify(audit);

    expect(audit.status).toBe("blocked");
    expect(codes).toContain("RAW_ARGS_FIELD_REJECTED");
    expect(codes).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(codes).toContain("SECRET_MARKER_REJECTED");
    expect(audit.rawLeakBooleans.rawArgsDetected).toBe(true);
    expect(audit.rawLeakBooleans.rawPromptDetected).toBe(true);
    expect(audit.rawLeakBooleans.secretDetected).toBe(true);
    expect(serialized).not.toContain("sk-fake1234567890");
    expectNoExecution(audit);
  });

  it("blocks command, install script, eval, and secret URL fields", () => {
    const audit = buildExternalCapabilityRedactionAudit({
      brokerIntegrationResult: buildExternalCapabilityBrokerIntegration({
        manifestResult: safeManifest()
      }),
      appSurfaceSummary: {
        command: "blocked",
        installScript: "blocked",
        eval: "blocked",
        homepageRef: "https://example.invalid/callback?token=blocked"
      }
    } as never);
    const codes = audit.findings.map((finding) => finding.code);

    expect(audit.status).toBe("blocked");
    expect(codes).toContain("COMMAND_FIELD_REJECTED");
    expect(codes).toContain("INSTALL_SCRIPT_REJECTED");
    expect(codes).toContain("EVAL_FIELD_REJECTED");
    expect(codes).toContain("SECRET_URL_QUERY_REJECTED");
    expect(audit.rawLeakBooleans.secretUrlDetected).toBe(true);
    expectNoExecution(audit);
  });

  it("blocks raw tool output, raw stdout/stderr, raw package content, and process execution fields", () => {
    const audit = buildExternalCapabilityRedactionAudit({
      replayCompletenessReport: {
        status: "replay_ready"
      },
      externalResultSummaries: [
        {
          resultId: "external-result-raw",
          rawToolOutput: "RAW_TOOL_OUTPUT_SHOULD_NOT_LEAK",
          rawPackageContent: "RAW_PACKAGE_CONTENT_SHOULD_NOT_LEAK",
          stdout: "RAW_STDOUT_SHOULD_NOT_LEAK",
          stderr: "RAW_STDERR_SHOULD_NOT_LEAK",
          childProcess: "spawn synthetic",
          nativeBridge: true
        }
      ]
    } as never);
    const codes = audit.findings.map((finding) => finding.code);
    const serialized = JSON.stringify(audit);

    expect(audit.status).toBe("blocked");
    expect(codes).toContain("RAW_TOOL_OUTPUT_FIELD_REJECTED");
    expect(codes).toContain("RAW_PACKAGE_CONTENT_FIELD_REJECTED");
    expect(codes).toContain("RAW_STDOUT_FIELD_REJECTED");
    expect(codes).toContain("RAW_STDERR_FIELD_REJECTED");
    expect(codes).toContain("CHILD_PROCESS_FIELD_REJECTED");
    expect(codes).toContain("NATIVE_BRIDGE_FIELD_REJECTED");
    expect(audit.rawLeakBooleans.rawToolOutputDetected).toBe(true);
    expect(audit.rawLeakBooleans.rawPackageContentDetected).toBe(true);
    expect(audit.rawLeakBooleans.rawStdoutDetected).toBe(true);
    expect(audit.rawLeakBooleans.rawStderrDetected).toBe(true);
    expect(serialized).not.toContain("RAW_TOOL_OUTPUT_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("RAW_PACKAGE_CONTENT_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("RAW_STDOUT_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("RAW_STDERR_SHOULD_NOT_LEAK");
    expectNoExecution(audit);
  });

  it("blocks or warns on P1H artifact statuses", () => {
    const blocked = buildExternalCapabilityRedactionAudit({
      policyHardeningReport: { status: "blocked" },
      mcpReadonlyConsistencyReport: { status: "blocked" },
      sandboxEscapeReport: { status: "blocked" },
      replayCompletenessReport: { status: "blocked" }
    });
    const warning = buildExternalCapabilityRedactionAudit({
      policyHardeningReport: { status: "warning" },
      mcpReadonlyConsistencyReport: { status: "warning" },
      sandboxEscapeReport: { status: "warning" },
      replayCompletenessReport: { status: "warning" }
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "BLOCKED_POLICY_HARDENING_REPORT",
        "BLOCKED_MCP_READONLY_CONSISTENCY_REPORT",
        "BLOCKED_SANDBOX_ESCAPE_REPORT",
        "BLOCKED_REPLAY_COMPLETENESS_REPORT"
      ])
    );
    expect(warning.status).toBe("warning");
    expect(warning.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "WARNING_POLICY_HARDENING_REPORT",
        "WARNING_MCP_READONLY_CONSISTENCY_REPORT",
        "WARNING_SANDBOX_ESCAPE_REPORT",
        "WARNING_REPLAY_COMPLETENESS_REPORT"
      ])
    );
    expectNoExecution(blocked);
    expectNoExecution(warning);
  });

  it("blocks execution readiness and issued leases", () => {
    const audit = buildExternalCapabilityRedactionAudit({
      manifestResult: safeManifest(),
      appSurfaceSummary: {
        canInvokeCapability: true,
        canIssueLease: true,
        leaseIssued: true
      }
    } as never);
    const codes = audit.findings.map((finding) => finding.code);

    expect(audit.status).toBe("blocked");
    expect(codes).toContain("EXECUTION_READINESS_REJECTED");
    expect(codes).toContain("LEASE_ISSUED_REJECTED");
    expect(audit.rawLeakBooleans.leaseIssuedDetected).toBe(true);
    expectNoExecution(audit);
  });

  it("warns on high-risk, network, filesystem, desktop, and broad dependency metadata", () => {
    const manifestResult = validateExternalCapabilityManifest({
      schemaVersion: "external_capability_manifest.v1",
      manifestId: "mcp-warning-audit",
      sourceType: "mcp_server",
      sourceName: "Warning MCP",
      descriptionSummary: "Warning descriptor metadata.",
      capabilities: [
        {
          capabilityId: "mcp.warning.desktop",
          displayName: "Warning desktop",
          category: "desktop",
          descriptionSummary: "High-risk desktop metadata.",
          operationKind: "desktop",
          riskLevel: "A5",
          defaultInvocationPolicy: "DISABLED",
          requiresNetwork: true,
          requiresFilesystem: true,
          requiresDesktop: true
        }
      ],
      riskNotes: ["Expected warning."]
    });
    const pluginSkillScanResult = scanPluginSkillMetadata({
      packages: [
        {
          packageKind: "plugin",
          packageId: "plugin.warning",
          displayName: "Warning Plugin",
          packageSource: "fixture_manifest",
          dependencyRefs: ["dep@*"],
          declaredCapabilities: [
            {
              capabilityId: "plugin.warning.network",
              displayName: "Network warning",
              descriptionSummary: "Network metadata.",
              operationKind: "network",
              riskLevel: "A4",
              defaultInvocationPolicy: "DISABLED",
              requiresNetwork: true
            }
          ]
        }
      ]
    });
    const audit = buildExternalCapabilityRedactionAudit({
      manifestResult,
      pluginSkillScanResult
    });
    const codes = audit.findings.map((finding) => finding.code);

    expect(audit.status).toBe("warning");
    expect(codes).toContain("HIGH_RISK_EXTERNAL_DESCRIPTOR");
    expect(codes).toContain("NETWORK_CAPABILITY_DECLARED");
    expect(codes).toContain("FILESYSTEM_CAPABILITY_DECLARED");
    expect(codes).toContain("DESKTOP_CAPABILITY_DECLARED");
    expect(codes).toContain("BROAD_DEPENDENCY_RANGE");
    expect(codes).toContain("MISSING_OR_UNPINNED_VERSION");
    expectNoExecution(audit);
  });

  it("blocks blocked source results", () => {
    const blockedManifest = validateExternalCapabilityManifest({
      schemaVersion: "external_capability_manifest.v1",
      sourceType: "mcp_server",
      sourceName: "Blocked",
      descriptionSummary: "Blocked manifest.",
      capabilities: [
        {
          capabilityId: "mcp.blocked.auto",
          displayName: "Blocked",
          category: "knowledge",
          descriptionSummary: "Blocked.",
          operationKind: "read",
          riskLevel: "A1",
          defaultInvocationPolicy: "AUTO"
        }
      ]
    });
    const audit = buildExternalCapabilityRedactionAudit({
      manifestResult: blockedManifest
    });

    expect(blockedManifest.status).toBe("blocked");
    expect(audit.status).toBe("blocked");
    expect(audit.findings.map((finding) => finding.code)).toContain(
      "BLOCKED_MANIFEST_RESULT"
    );
    expectNoExecution(audit);
  });

  it("is deterministic and summary-only", () => {
    const auditA = buildExternalCapabilityRedactionAudit({
      manifestResult: safeManifest(),
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => "audit-test-id"
    });
    const auditB = buildExternalCapabilityRedactionAudit({
      manifestResult: safeManifest(),
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => "audit-test-id"
    });
    const serialized = JSON.stringify(auditA);

    expect(auditA.auditId).toBe(auditB.auditId);
    expect(auditA.auditHash).toBe(auditB.auditHash);
    expect(serialized).not.toContain("RAW_PROMPT_SENTINEL_VALUE");
    expect(serialized).not.toContain("RAW_RESPONSE_SENTINEL_VALUE");
    expect(serialized).not.toContain("sk-fake");
    expectNoExecution(auditA);
  });
});
