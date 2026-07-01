import { describe, expect, it } from "vitest";

import {
  buildMcpDiscoveryDescriptorIntegration,
  buildMcpMetadataRedactionAudit,
  runMcpReadOnlyDiscovery,
  summarizeMcpMetadataRedactionAudit,
  validateMcpConnectionProfile,
  type McpDiscoveryDescriptorIntegrationResult,
  type McpDiscoveryDescriptorPreview,
  type McpReadOnlyDiscoveryResult,
  type McpReadOnlyTransport
} from "../src/index.js";

function safeProfile() {
  return validateMcpConnectionProfile({
    profileId: "mcp.docs.injected",
    displayName: "Docs MCP injected test profile",
    serverKind: "mcp",
    transportKind: "injected_test_transport",
    serverRef: "mcp.docs.server",
    readOnlyPolicy: {
      allowInitialize: true,
      allowListResources: true,
      allowListPrompts: true,
      allowListTools: true,
      allowReadResource: false,
      allowCallTool: false,
      allowPromptExecution: false,
      allowMutation: false
    },
    timeoutMs: 5000,
    maxMetadataBytes: 64000,
    maxItems: 50
  });
}

function safeTransport(): McpReadOnlyTransport {
  return {
    async send(request) {
      if (request.method === "initialize") {
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            serverInfo: {
              serverId: "mcp.docs.server",
              displayName: "Docs MCP"
            }
          }
        };
      }
      if (request.method === "resources/list") {
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            resources: [
              {
                resourceId: "mcp.docs.index",
                displayName: "Docs index",
                kind: "summary_index",
                descriptionSummary: "Documentation index metadata.",
                warningCodes: []
              }
            ]
          }
        };
      }
      if (request.method === "prompts/list") {
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            prompts: [
              {
                promptId: "mcp.docs.prompt",
                displayName: "Docs prompt",
                descriptionSummary: "Prompt metadata summary.",
                templateSummary: "Template metadata only.",
                warningCodes: []
              }
            ]
          }
        };
      }
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
            {
              toolId: "mcp.docs.search",
              displayName: "Search docs",
              descriptionSummary: "Searches documentation summaries.",
              riskLevel: "A1",
              defaultInvocationPolicy: "MANUAL_ONLY",
              inputSchemaSummary: { keyCount: 1 },
              outputSchemaSummary: { keyCount: 1 },
              warningCodes: []
            }
          ]
        }
      };
    }
  };
}

async function safeDiscovery(): Promise<McpReadOnlyDiscoveryResult> {
  const profile = safeProfile();
  expect(profile.status).not.toBe("blocked");
  return runMcpReadOnlyDiscovery({
    profile,
    transport: safeTransport(),
    idGenerator: () => "mcp-readonly-discovery-test"
  });
}

async function safeIntegration(): Promise<McpDiscoveryDescriptorIntegrationResult> {
  return buildMcpDiscoveryDescriptorIntegration({
    discoveryResult: await safeDiscovery()
  });
}

function expectNoExecutionReadiness(
  readiness: ReturnType<typeof buildMcpMetadataRedactionAudit>["readiness"]
): void {
  expect(readiness.canInvokeMcpTool).toBe(false);
  expect(readiness.canReadMcpResourceContent).toBe(false);
  expect(readiness.canExecuteMcpPrompt).toBe(false);
  expect(readiness.canMutateMcpServer).toBe(false);
  expect(readiness.canWriteEventStore).toBe(false);
  expect(readiness.canApplyPatch).toBe(false);
  expect(readiness.canRollback).toBe(false);
  expect(readiness.canIssuePermissionLease).toBe(false);
  expect(readiness.canExecuteGit).toBe(false);
  expect(readiness.canExecuteShell).toBe(false);
  expect(readiness.appCanExecute).toBe(false);
}

describe("mcp metadata redaction audit", () => {
  it("returns empty safely without inputs", () => {
    const audit = buildMcpMetadataRedactionAudit();

    expect(audit.status).toBe("empty");
    expect(audit.recordCounts.totalRecordCount).toBe(0);
    expectNoExecutionReadiness(audit.readiness);
  });

  it("marks safe metadata audit ready", async () => {
    const discoveryResult = await safeDiscovery();
    const integration = buildMcpDiscoveryDescriptorIntegration({
      discoveryResult
    });
    const audit = buildMcpMetadataRedactionAudit({
      connectionProfileSummary: {
        profileId: "mcp.docs.injected",
        transportKind: "injected_test_transport"
      },
      discoveryResult,
      brokerDescriptorPreviews: integration,
      appSurfaceSummary: {
        status: "discovered",
        descriptorCount: integration.descriptorPreviewCount
      },
      idGenerator: () => "mcp-audit-test"
    });

    expect(audit.status).toBe("audit_ready");
    expect(audit.auditId).toBe("mcp-audit-test");
    expect(audit.recordCounts.discoveryResultCount).toBe(1);
    expect(audit.recordCounts.brokerDescriptorPreviewCount).toBe(
      integration.descriptorPreviewCount
    );
    expect(audit.rawMetadataIncluded).toBe(false);
    expect(audit.blockerCount).toBe(0);
    expectNoExecutionReadiness(audit.readiness);

    const summary = summarizeMcpMetadataRedactionAudit(audit);
    expect(summary.source).toBe("runtime_mcp_metadata_redaction_audit");
    expect(JSON.stringify(summary)).not.toContain(
      "Documentation index metadata"
    );
  });

  it("blocks raw prompt metadata", () => {
    const audit = buildMcpMetadataRedactionAudit({
      appSurfaceSummary: {
        rawPrompt: "do not persist this prompt"
      }
    });

    expect(audit.status).toBe("blocked");
    expect(audit.rawPromptDetected).toBe(true);
    expect(audit.findings.map((finding) => finding.code)).toContain(
      "RAW_PROMPT_FIELD_REJECTED"
    );
    expect(JSON.stringify(audit)).not.toContain("do not persist this prompt");
  });

  it("blocks secret markers", () => {
    const audit = buildMcpMetadataRedactionAudit({
      discoveryResult: {
        serverInfo: {
          displayName: "Docs MCP",
          descriptionSummary: "sk-fake1234567890 should block"
        }
      } as unknown as McpReadOnlyDiscoveryResult
    });

    expect(audit.status).toBe("blocked");
    expect(audit.secretDetected).toBe(true);
    expect(audit.riskCounts.secretRiskCount).toBeGreaterThan(0);
  });

  it("blocks command injection markers", () => {
    const audit = buildMcpMetadataRedactionAudit({
      connectionProfileSummary: {
        descriptionSummary: "metadata && powershell should block"
      }
    });

    expect(audit.status).toBe("blocked");
    expect(audit.riskCounts.commandInjectionRiskCount).toBeGreaterThan(0);
  });

  it("blocks tool invocation fields", () => {
    const audit = buildMcpMetadataRedactionAudit({
      appSurfaceSummary: {
        toolCall: {
          name: "mcp.docs.search"
        }
      }
    });

    expect(audit.status).toBe("blocked");
    expect(audit.riskCounts.toolInvocationRiskCount).toBeGreaterThan(0);
  });

  it("blocks resource content fields", () => {
    const audit = buildMcpMetadataRedactionAudit({
      appSurfaceSummary: {
        resourceContent: "file body should not appear"
      }
    });

    expect(audit.status).toBe("blocked");
    expect(audit.riskCounts.resourceContentRiskCount).toBeGreaterThan(0);
    expect(JSON.stringify(audit)).not.toContain("file body should not appear");
  });

  it("blocks mutating enabled tool descriptors", async () => {
    const integration = await safeIntegration();
    const base = integration.descriptorPreviews.find(
      (descriptor) => descriptor.category === "mcp_tool_metadata"
    );
    expect(base).toBeDefined();
    const hostile = {
      ...(base as McpDiscoveryDescriptorPreview),
      descriptorId: "mcp.docs.write",
      title: "Write docs",
      category: "mcp_tool_metadata",
      sourceType: "mcp",
      riskLevel: "A5_sensitive_or_irreversible",
      invokePolicy: "MANUAL_ONLY",
      executionMode: "METADATA_ONLY",
      disabledByDefault: false,
      canInvoke: true
    } as unknown as McpDiscoveryDescriptorPreview;

    const audit = buildMcpMetadataRedactionAudit({
      brokerDescriptorPreviews: [hostile]
    });

    expect(audit.status).toBe("blocked");
    expect(audit.riskCounts.toolInvocationRiskCount).toBeGreaterThan(0);
    expect(audit.riskCounts.mutatingToolEnabledRiskCount).toBeGreaterThan(0);
  });

  it("blocks raw stdout and huge metadata flags", () => {
    const audit = buildMcpMetadataRedactionAudit({
      discoveryResult: {
        rawStdoutIncluded: true,
        metadataBytes: 256000,
        canCallTool: false,
        canReadResource: false,
        canExecutePrompt: false,
        canMutate: false,
        canWriteEventStore: false
      } as unknown as McpReadOnlyDiscoveryResult
    });

    expect(audit.status).toBe("blocked");
    expect(audit.riskCounts.rawStdoutStderrRiskCount).toBeGreaterThan(0);
    expect(audit.riskCounts.hugeMetadataRiskCount).toBeGreaterThan(0);
  });

  it("keeps output summary-only and deterministic", async () => {
    const discoveryResult = await safeDiscovery();
    const input = {
      discoveryResult,
      brokerDescriptorPreviews: buildMcpDiscoveryDescriptorIntegration({
        discoveryResult
      }),
      idGenerator: () => "fixed-mcp-audit"
    };
    const first = buildMcpMetadataRedactionAudit(input);
    const second = buildMcpMetadataRedactionAudit(input);

    expect(first.auditId).toBe("fixed-mcp-audit");
    expect(first.auditHash).toBe(second.auditHash);
    expect(JSON.stringify(first)).not.toContain("raw prompt");
    expect(JSON.stringify(first)).not.toContain("Authorization:");
    expectNoExecutionReadiness(first.readiness);
  });
});
