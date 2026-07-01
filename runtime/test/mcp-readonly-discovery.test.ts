import { describe, expect, it } from "vitest";

import {
  discoverMcpCapabilitiesReadonly,
  summarizeMcpReadonlyDiscovery,
  validateExternalCapabilityManifest,
  type McpReadonlyDiscoveryResult
} from "../src/index.js";

function safeMetadata(): Record<string, unknown> {
  return {
    serverId: "mcp.docs",
    displayName: "Docs MCP",
    serverVersion: "0.1.0",
    transportMode: "metadata_only",
    tools: [
      {
        toolId: "mcp.docs.search",
        displayName: "Search docs",
        capabilityId: "mcp.docs.search",
        descriptionSummary: "Searches documentation summaries.",
        riskLevel: "A1",
        defaultInvocationPolicy: "MANUAL_ONLY",
        inputSchemaSummary: { keyCount: 1, keys: ["query"] },
        outputSchemaSummary: { keyCount: 1, keys: ["matches"] }
      }
    ],
    resources: [
      {
        resourceId: "mcp.docs.index",
        displayName: "Docs index",
        kind: "summary_index",
        descriptionSummary: "Documentation index metadata.",
        requiresNetwork: false,
        requiresFilesystem: false
      }
    ],
    prompts: [
      {
        promptId: "mcp.docs.prompt",
        displayName: "Docs prompt",
        descriptionSummary: "Prompt metadata summary.",
        templateSummary: "Summary-only prompt template metadata."
      }
    ],
    riskNotes: ["Metadata-only fixture."],
    metadataHash: "hash-docs-mcp"
  };
}

function findingCodes(result: McpReadonlyDiscoveryResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: McpReadonlyDiscoveryResult): void {
  expect(result.readiness).toMatchObject({
    canConnectServer: false,
    canInvokeTool: false,
    canReadResource: false,
    canExecutePrompt: false,
    appCanExecute: false
  });
}

describe("mcp readonly discovery", () => {
  it("lists safe metadata-only discovery", () => {
    const result = discoverMcpCapabilitiesReadonly(safeMetadata());
    const summary = summarizeMcpReadonlyDiscovery(result);

    expect(result.status).toBe("listed");
    expect(result.serverCount).toBe(1);
    expect(result.toolCount).toBe(1);
    expect(result.resourceCount).toBe(1);
    expect(result.promptCount).toBe(1);
    expect(result.toolSummaries[0]?.toolId).toBe("mcp.docs.search");
    expect(summary.source).toBe("runtime_mcp_readonly_discovery");
    expect(result.readiness.canList).toBe(true);
    expectNoExecution(result);
  });

  it("accepts JSON string input", () => {
    const result = discoverMcpCapabilitiesReadonly(
      JSON.stringify(safeMetadata())
    );

    expect(result.status).toBe("listed");
    expect(result.serverSummaries[0]?.displayName).toBe("Docs MCP");
    expectNoExecution(result);
  });

  it("can list from an external MCP manifest summary", () => {
    const manifest = {
      schemaVersion: "external_capability_manifest.v1",
      manifestId: "mcp-manifest",
      sourceType: "mcp_server",
      sourceName: "Manifest MCP",
      sourceVersion: "0.1.0",
      publisherSummary: "Fixture.",
      descriptionSummary: "Metadata-only MCP manifest.",
      capabilities: [
        {
          capabilityId: "mcp.manifest.search",
          displayName: "Manifest search",
          category: "docs",
          descriptionSummary: "Search from manifest metadata.",
          operationKind: "read",
          riskLevel: "A1",
          defaultInvocationPolicy: "MANUAL_ONLY",
          inputSchemaSummary: { keyCount: 1 },
          outputSchemaSummary: { keyCount: 1 }
        }
      ],
      riskNotes: ["Manifest metadata only."]
    };
    const manifestResult = validateExternalCapabilityManifest(manifest);
    const result = discoverMcpCapabilitiesReadonly(manifestResult.manifest);

    expect(manifestResult.status).toBe("parsed");
    expect(result.status).toBe("listed");
    expect(result.toolSummaries[0]?.toolId).toBe("mcp.manifest.search");
    expectNoExecution(result);
  });

  it("blocks stdio and http transport modes", () => {
    const stdioResult = discoverMcpCapabilitiesReadonly({
      ...safeMetadata(),
      transportMode: "stdio"
    });
    const httpResult = discoverMcpCapabilitiesReadonly({
      ...safeMetadata(),
      transportMode: "http"
    });

    expect(stdioResult.status).toBe("blocked");
    expect(httpResult.status).toBe("blocked");
    expect(findingCodes(stdioResult)).toContain("TRANSPORT_MODE_REJECTED");
    expect(findingCodes(stdioResult)).toContain("LIVE_TRANSPORT_REJECTED");
    expect(findingCodes(httpResult)).toContain("TRANSPORT_MODE_REJECTED");
    expectNoExecution(stdioResult);
  });

  it("blocks tool invocation samples", () => {
    const input = safeMetadata();
    input.tools = [
      {
        ...((input.tools as Record<string, unknown>[])[0] ?? {}),
        toolInvocationSample: { name: "mcp.docs.search" }
      }
    ];
    const result = discoverMcpCapabilitiesReadonly(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("TOOL_INVOCATION_SAMPLE_REJECTED");
    expectNoExecution(result);
  });

  it("blocks command fields", () => {
    const input = safeMetadata();
    input.command = "node server.js";
    const result = discoverMcpCapabilitiesReadonly(input);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("COMMAND_FIELD_REJECTED");
    expect(serialized).not.toContain("node server.js");
    expectNoExecution(result);
  });

  it("blocks secret markers without echoing fake values", () => {
    const input = safeMetadata();
    input.displayName = "Docs MCP sk-fake1234567890";
    const result = discoverMcpCapabilitiesReadonly(input);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("sk-fake1234567890");
    expectNoExecution(result);
  });

  it("blocks duplicate tool ids", () => {
    const input = safeMetadata();
    input.tools = [
      ...((input.tools as Record<string, unknown>[]) ?? []),
      { ...(((input.tools as Record<string, unknown>[])[0] ?? {}) as object) }
    ];
    const result = discoverMcpCapabilitiesReadonly(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("DUPLICATE_TOOL_ID");
    expectNoExecution(result);
  });

  it("warns for network resources", () => {
    const input = safeMetadata();
    input.resources = [
      {
        resourceId: "mcp.docs.remote",
        displayName: "Remote docs",
        kind: "network_resource",
        descriptionSummary: "Network resource metadata only.",
        requiresNetwork: true
      }
    ];
    const result = discoverMcpCapabilitiesReadonly(input);

    expect(result.status).toBe("warning");
    expect(findingCodes(result)).toContain("NETWORK_RESOURCE_DECLARED");
    expect(result.readiness.canList).toBe(true);
    expectNoExecution(result);
  });

  it("keeps output summary-only", () => {
    const result = discoverMcpCapabilitiesReadonly(safeMetadata());
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("listed");
    expect(serialized).not.toContain("rawToolArgs");
    expect(serialized).not.toContain("rawToolResult");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("bearer");
    expectNoExecution(result);
  });

  it("blocks AUTO invocation", () => {
    const input = safeMetadata();
    input.tools = [
      {
        ...((input.tools as Record<string, unknown>[])[0] ?? {}),
        defaultInvocationPolicy: "AUTO"
      }
    ];
    const result = discoverMcpCapabilitiesReadonly(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("AUTO_INVOCATION_REJECTED");
    expectNoExecution(result);
  });
});
