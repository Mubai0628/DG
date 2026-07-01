import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  discoverMcpCapabilitiesReadonly,
  runMcpReadOnlyDiscovery,
  summarizeMcpReadonlyDiscovery,
  summarizeMcpReadOnlyDiscovery,
  validateMcpConnectionProfile,
  validateExternalCapabilityManifest,
  type McpReadOnlyTransport,
  type McpReadOnlyTransportRequest,
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

function safeConnectionProfile(): Record<string, unknown> {
  return {
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
  };
}

function safeTransport(
  seen: McpReadOnlyTransportRequest[] = []
): McpReadOnlyTransport {
  return {
    async send(request) {
      seen.push(request);
      if (request.method === "initialize") {
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            serverInfo: {
              serverId: "mcp.docs.server",
              displayName: "Docs MCP",
              serverVersion: "0.1.0"
            },
            riskNotes: ["Injected metadata transport only."]
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
                requiresNetwork: false,
                requiresFilesystem: false
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
                templateSummary: "Template metadata only."
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
              outputSchemaSummary: { keyCount: 1 }
            }
          ]
        }
      };
    }
  };
}

function expectClientNoExecution(
  result: Awaited<ReturnType<typeof runMcpReadOnlyDiscovery>>
): void {
  expect(result.readiness).toMatchObject({
    canConnectServer: false,
    canSpawnProcess: false,
    canInvokeTool: false,
    canReadResource: false,
    canExecutePrompt: false,
    canMutate: false,
    canUseNetwork: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
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

  it("runs safe read-only discovery through injected transport", async () => {
    const profile = validateMcpConnectionProfile(safeConnectionProfile());
    const seen: McpReadOnlyTransportRequest[] = [];
    const result = await runMcpReadOnlyDiscovery({
      profile,
      transport: safeTransport(seen),
      idGenerator: () => "mcp-discovery-test"
    });
    const summary = summarizeMcpReadOnlyDiscovery(result);

    expect(result.status).toBe("listed");
    expect(result.serverCount).toBe(1);
    expect(result.resourceCount).toBe(1);
    expect(result.promptCount).toBe(1);
    expect(result.toolCount).toBe(1);
    expect(result.toolSummaries[0]?.toolId).toBe("mcp.docs.search");
    expect(summary.source).toBe("runtime_mcp_readonly_discovery_client");
    expect(seen.map((request) => request.method)).toEqual([
      "initialize",
      "resources/list",
      "prompts/list",
      "tools/list"
    ]);
    expectClientNoExecution(result);
  });

  it("blocks tool call attempts before transport", async () => {
    const profile = validateMcpConnectionProfile(safeConnectionProfile());
    const seen: McpReadOnlyTransportRequest[] = [];
    const result = await runMcpReadOnlyDiscovery({
      profile,
      transport: safeTransport(seen),
      requestedMethods: ["tools/call"]
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "MCP_METHOD_REJECTED"
    );
    expect(seen).toHaveLength(0);
    expectClientNoExecution(result);
  });

  it("blocks resource read attempts before transport", async () => {
    const profile = validateMcpConnectionProfile(safeConnectionProfile());
    const seen: McpReadOnlyTransportRequest[] = [];
    const result = await runMcpReadOnlyDiscovery({
      profile,
      transport: safeTransport(seen),
      requestedMethods: ["resources/read"]
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "MCP_METHOD_REJECTED"
    );
    expect(seen).toHaveLength(0);
    expectClientNoExecution(result);
  });

  it("blocks malicious metadata without raw secret output", async () => {
    const profile = validateMcpConnectionProfile(safeConnectionProfile());
    const result = await runMcpReadOnlyDiscovery({
      profile,
      requestedMethods: ["tools/list"],
      transport: {
        async send(request) {
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              tools: [
                {
                  toolId: "mcp.docs.leaky",
                  displayName: "Leaky docs",
                  descriptionSummary: "sk-fake1234567890 should be blocked.",
                  riskLevel: "A1",
                  defaultInvocationPolicy: "MANUAL_ONLY",
                  inputSchemaSummary: { keyCount: 1 },
                  outputSchemaSummary: { keyCount: 1 }
                }
              ]
            }
          };
        }
      }
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "SECRET_MARKER_REJECTED"
    );
    expect(serialized).not.toContain("sk-fake1234567890");
    expectClientNoExecution(result);
  });

  it("blocks oversized metadata responses", async () => {
    const profile = validateMcpConnectionProfile({
      ...safeConnectionProfile(),
      maxMetadataBytes: 120
    });
    const result = await runMcpReadOnlyDiscovery({
      profile,
      requestedMethods: ["tools/list"],
      transport: {
        async send(request) {
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              tools: [
                {
                  toolId: "mcp.docs.large",
                  displayName: "Large docs",
                  descriptionSummary: "x".repeat(300)
                }
              ]
            }
          };
        }
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "METADATA_RESPONSE_TOO_LARGE"
    );
    expectClientNoExecution(result);
  });

  it("summarizes timeout or transport errors safely", async () => {
    const profile = validateMcpConnectionProfile(safeConnectionProfile());
    const result = await runMcpReadOnlyDiscovery({
      profile,
      requestedMethods: ["initialize"],
      transport: {
        async send() {
          throw new Error("Synthetic timeout with hidden stderr");
        }
      }
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "TRANSPORT_ERROR"
    );
    expect(serialized).not.toContain("hidden stderr");
    expectClientNoExecution(result);
  });

  it("does not call fetch or spawn processes", async () => {
    const profile = validateMcpConnectionProfile(safeConnectionProfile());
    let fetchCalled = false;
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      fetchCalled = true;
      throw new Error("fetch must not be called");
    }) as typeof fetch;
    try {
      const result = await runMcpReadOnlyDiscovery({
        profile,
        transport: safeTransport(),
        requestedMethods: ["initialize"]
      });
      const source = await readFile(
        new URL(
          "../src/capabilities/mcp-readonly-discovery.ts",
          import.meta.url
        ),
        "utf8"
      );

      expect(result.status).toBe("listed");
      expect(fetchCalled).toBe(false);
      expect(source).not.toContain("child_process");
      expect(source).not.toContain("spawn(");
      expectClientNoExecution(result);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("blocks mutating tool metadata without risk warning", async () => {
    const profile = validateMcpConnectionProfile(safeConnectionProfile());
    const result = await runMcpReadOnlyDiscovery({
      profile,
      requestedMethods: ["tools/list"],
      transport: {
        async send(request) {
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              tools: [
                {
                  toolId: "mcp.docs.write",
                  displayName: "Write docs",
                  descriptionSummary: "Writes documentation metadata.",
                  operationKind: "write",
                  riskLevel: "A2",
                  defaultInvocationPolicy: "MANUAL_ONLY",
                  inputSchemaSummary: { keyCount: 1 },
                  outputSchemaSummary: { keyCount: 1 }
                }
              ]
            }
          };
        }
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "MUTATING_TOOL_WITHOUT_RISK_WARNING"
    );
    expectClientNoExecution(result);
  });
});
