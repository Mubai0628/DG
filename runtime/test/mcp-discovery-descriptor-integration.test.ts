import { describe, expect, it } from "vitest";

import {
  buildMcpDiscoveryDescriptorIntegration,
  runMcpReadOnlyDiscovery,
  summarizeMcpDiscoveryDescriptorIntegration,
  validateMcpConnectionProfile,
  type McpDiscoveryDescriptorIntegrationResult,
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

function safeTransport(
  options: {
    duplicateResource?: boolean;
    mutatingTool?: boolean;
    secretMetadata?: boolean;
    autoTool?: boolean;
  } = {}
): McpReadOnlyTransport {
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
        const first = {
          resourceId: "mcp.docs.index",
          displayName: "Docs index",
          kind: "summary_index",
          descriptionSummary: "Documentation index metadata.",
          warningCodes: []
        };
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            resources: options.duplicateResource
              ? [first, { ...first }]
              : [first]
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
              toolId: options.mutatingTool
                ? "mcp.docs.write"
                : "mcp.docs.search",
              displayName: options.mutatingTool ? "Write docs" : "Search docs",
              descriptionSummary: options.secretMetadata
                ? "sk-fake1234567890 should block."
                : options.mutatingTool
                  ? "Writes documentation metadata."
                  : "Searches documentation summaries.",
              riskLevel: options.mutatingTool ? "A5" : "A1",
              defaultInvocationPolicy: options.autoTool
                ? "AUTO"
                : "MANUAL_ONLY",
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

async function safeDiscovery() {
  return runMcpReadOnlyDiscovery({
    profile: safeProfile(),
    transport: safeTransport(),
    idGenerator: () => "mcp-discovery-descriptor-test"
  });
}

function findingCodes(
  result: McpDiscoveryDescriptorIntegrationResult
): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoInvocation(
  result: McpDiscoveryDescriptorIntegrationResult
): void {
  expect(result.readiness).toMatchObject({
    canRegisterForExecution: false,
    canInvoke: false,
    canIssueLease: false,
    canAutoRun: false,
    appCanExecute: false
  });
  for (const preview of result.descriptorPreviews) {
    expect(preview.executionMode).toBe("METADATA_ONLY");
    expect(preview.canInvoke).toBe(false);
    expect(preview.canIssueLease).toBe(false);
  }
}

describe("mcp discovery descriptor integration", () => {
  it("creates resource and prompt metadata descriptors", async () => {
    const discoveryResult = await safeDiscovery();
    const result = buildMcpDiscoveryDescriptorIntegration({
      discoveryResult
    });
    const summary = summarizeMcpDiscoveryDescriptorIntegration(result);

    expect(result.status).toBe("preview_ready");
    expect(result.resourceDescriptorCount).toBe(1);
    expect(result.promptDescriptorCount).toBe(1);
    expect(result.descriptorPreviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "mcp_resource",
          invokePolicy: "READ_ONLY_METADATA"
        }),
        expect.objectContaining({
          category: "mcp_prompt",
          invokePolicy: "READ_ONLY_METADATA"
        })
      ])
    );
    expect(summary.source).toBe("runtime_mcp_discovery_descriptor_integration");
    expectNoInvocation(result);
  });

  it("keeps tool metadata descriptors disabled", async () => {
    const result = buildMcpDiscoveryDescriptorIntegration({
      discoveryResult: await safeDiscovery()
    });
    const toolPreview = result.descriptorPreviews.find(
      (preview) => preview.category === "mcp_tool_metadata"
    );

    expect(toolPreview).toMatchObject({
      invokePolicy: "DISABLED",
      disabledByDefault: true,
      executionMode: "METADATA_ONLY"
    });
    expectNoInvocation(result);
  });

  it("marks mutating-looking tools high risk and disabled", async () => {
    const discoveryResult = await runMcpReadOnlyDiscovery({
      profile: safeProfile(),
      transport: safeTransport({ mutatingTool: true })
    });
    const result = buildMcpDiscoveryDescriptorIntegration({
      discoveryResult
    });
    const toolPreview = result.descriptorPreviews.find(
      (preview) => preview.category === "mcp_tool_metadata"
    );

    expect(result.status).toBe("preview_ready");
    expect(toolPreview?.riskLevel).toBe("A5_sensitive_or_irreversible");
    expect(toolPreview?.invokePolicy).toBe("DISABLED");
    expect(toolPreview?.warningCodes).toContain(
      "MUTATING_TOOL_METADATA_DISABLED"
    );
    expectNoInvocation(result);
  });

  it("blocks secret metadata", async () => {
    const discoveryResult = await runMcpReadOnlyDiscovery({
      profile: safeProfile(),
      transport: safeTransport({ secretMetadata: true })
    });
    const result = buildMcpDiscoveryDescriptorIntegration({
      discoveryResult
    });
    const serialized = JSON.stringify(result);

    expect(discoveryResult.status).toBe("blocked");
    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("BLOCKED_MCP_DISCOVERY_RESULT");
    expect(serialized).not.toContain("sk-fake1234567890");
    expectNoInvocation(result);
  });

  it("blocks duplicate descriptor ids", async () => {
    const discoveryResult = await runMcpReadOnlyDiscovery({
      profile: safeProfile(),
      transport: safeTransport({ duplicateResource: true })
    });
    const result = buildMcpDiscoveryDescriptorIntegration({
      discoveryResult
    });

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("DUPLICATE_DESCRIPTOR_ID");
    expectNoInvocation(result);
  });

  it("blocks tool metadata that claims AUTO invocation", async () => {
    const discoveryResult = await runMcpReadOnlyDiscovery({
      profile: safeProfile(),
      transport: safeTransport({ autoTool: true })
    });
    const result = buildMcpDiscoveryDescriptorIntegration({
      discoveryResult
    });

    expect(discoveryResult.status).toBe("blocked");
    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("BLOCKED_MCP_DISCOVERY_RESULT");
    expectNoInvocation(result);
  });

  it("blocks execution readiness true", async () => {
    const discoveryResult = await safeDiscovery();
    const hostileDiscoveryResult = {
      ...discoveryResult,
      readiness: {
        ...(discoveryResult.readiness as unknown as Record<string, unknown>),
        canInvokeTool: true
      }
    } as unknown as typeof discoveryResult;
    const result = buildMcpDiscoveryDescriptorIntegration({
      discoveryResult: hostileDiscoveryResult
    });

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("EXECUTION_READINESS_TRUE");
    expectNoInvocation(result);
  });
});
