import { describe, expect, it } from "vitest";

import {
  buildExternalCapabilityBrokerIntegration,
  discoverMcpCapabilitiesReadonly,
  scanPluginSkillMetadata,
  summarizeExternalCapabilityBrokerIntegration,
  validateExternalCapabilityManifest,
  type ExternalCapabilityBrokerIntegrationResult
} from "../src/index.js";

function safeManifest() {
  return validateExternalCapabilityManifest({
    schemaVersion: "external_capability_manifest.v1",
    manifestId: "mcp-safe",
    sourceType: "mcp_server",
    sourceName: "Safe MCP",
    sourceVersion: "0.1.0",
    publisherSummary: "Fixture.",
    descriptionSummary: "Safe MCP descriptor metadata.",
    capabilities: [
      {
        capabilityId: "mcp.safe.read",
        displayName: "Safe read",
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
    serverId: "mcp.docs",
    displayName: "Docs MCP",
    transportMode: "metadata_only",
    tools: [
      {
        toolId: "mcp.docs.search",
        displayName: "Search docs",
        descriptionSummary: "Search metadata.",
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
        packageId: "plugin.safe",
        displayName: "Safe Plugin",
        version: "1.0.0",
        publisherSummary: "Fixture.",
        packageSource: "fixture_manifest",
        declaredCapabilities: [
          {
            capabilityId: "plugin.safe.preview",
            displayName: "Safe preview",
            descriptionSummary: "Preview plugin metadata.",
            operationKind: "compute",
            riskLevel: "A1",
            defaultInvocationPolicy: "MANUAL_ONLY"
          }
        ]
      },
      {
        packageKind: "skill",
        skillId: "skill.safe",
        displayName: "Safe Skill",
        version: "1.0.0",
        publisherSummary: "Fixture.",
        packageSource: "fixture_manifest",
        declaredCapabilities: [
          {
            capabilityId: "skill.safe.preview",
            displayName: "Safe skill preview",
            descriptionSummary: "Preview skill metadata.",
            operationKind: "read",
            riskLevel: "A1",
            defaultInvocationPolicy: "DISABLED"
          }
        ]
      }
    ]
  });
}

function findingCodes(
  result: ExternalCapabilityBrokerIntegrationResult
): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(
  result: ExternalCapabilityBrokerIntegrationResult
): void {
  expect(result.readiness).toMatchObject({
    canRegisterForExecution: false,
    canInvoke: false,
    canIssueLease: false,
    canAutoRun: false,
    appCanExecute: false
  });
  for (const preview of result.descriptorPreviews) {
    expect(preview.leasePreview.status).toBe("preview_only");
    expect(preview.leasePreview.canIssueLease).toBe(false);
    expect(preview.executionMode).toBe("SIMULATE");
    expect(preview.invokePolicy).not.toBe("AUTO");
  }
}

describe("external capability broker integration", () => {
  it("maps a safe manifest to broker previews", () => {
    const result = buildExternalCapabilityBrokerIntegration({
      manifestResult: safeManifest()
    });
    const summary = summarizeExternalCapabilityBrokerIntegration(result);

    expect(result.status).toBe("preview_ready");
    expect(result.descriptorPreviewCount).toBe(1);
    expect(result.descriptorPreviews[0]).toMatchObject({
      descriptorId: "mcp.safe.read",
      sourceType: "mcp",
      riskLevel: "A1_read",
      invokePolicy: "MANUAL_ONLY"
    });
    expect(summary.source).toBe(
      "runtime_external_capability_broker_integration"
    );
    expect(result.readiness.canPreviewDescriptors).toBe(true);
    expectNoExecution(result);
  });

  it("maps MCP readonly discovery results", () => {
    const result = buildExternalCapabilityBrokerIntegration({
      mcpDiscoveryResult: safeMcpDiscovery()
    });

    expect(result.status).toBe("preview_ready");
    expect(result.descriptorPreviews[0]?.descriptorId).toBe("mcp.docs.search");
    expect(result.policyMapping.MANUAL_ONLY).toBe(1);
    expectNoExecution(result);
  });

  it("maps plugin and skill scan results", () => {
    const result = buildExternalCapabilityBrokerIntegration({
      pluginSkillScanResult: safePluginScan()
    });

    expect(result.status).toBe("preview_ready");
    expect(result.descriptorPreviewCount).toBe(2);
    expect(result.descriptorPreviews.map((preview) => preview.sourceType)).toEqual(
      ["plugin", "skill"]
    );
    expect(result.leasePreviewCount).toBe(2);
    expectNoExecution(result);
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
    const result = buildExternalCapabilityBrokerIntegration({
      manifestResult: blockedManifest
    });

    expect(blockedManifest.status).toBe("blocked");
    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("BLOCKED_MANIFEST_RESULT");
    expect(result.descriptorPreviewCount).toBe(0);
    expectNoExecution(result);
  });

  it("blocks AUTO external policies even if a source result claims parsed", () => {
    const manifest = safeManifest();
    if (manifest.manifest !== undefined) {
      manifest.manifest.capabilities[0]!.defaultInvocationPolicy = "AUTO";
    }
    const result = buildExternalCapabilityBrokerIntegration({
      manifestResult: manifest
    });

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("AUTO_EXTERNAL_POLICY_REJECTED");
    expectNoExecution(result);
  });

  it("keeps lease preview only", () => {
    const result = buildExternalCapabilityBrokerIntegration({
      manifestResult: safeManifest(),
      mcpDiscoveryResult: safeMcpDiscovery()
    });

    expect(result.status).toBe("preview_ready");
    expect(result.leasePreviewCount).toBe(2);
    expect(result.descriptorPreviews.every((preview) => preview.leasePreview.canIssueLease === false)).toBe(
      true
    );
    expect(result.readiness.canIssueLease).toBe(false);
    expectNoExecution(result);
  });

  it("blocks execution readiness true and raw/secret markers", () => {
    const manifest = safeManifest();
    const result = buildExternalCapabilityBrokerIntegration({
      manifestResult: {
        ...manifest,
        readiness: {
          ...manifest.readiness,
          canInvokeCapability: true
        }
      },
      rawArgs: "blocked",
      marker: "sk-fake1234567890"
    } as never);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("EXECUTION_READINESS_REJECTED");
    expect(findingCodes(result)).toContain("RAW_ARGS_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("sk-fake1234567890");
    expectNoExecution(result);
  });
});
