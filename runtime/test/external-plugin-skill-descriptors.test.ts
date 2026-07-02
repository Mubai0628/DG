import { describe, expect, it } from "vitest";

import {
  buildExternalPluginSkillDescriptors,
  buildPluginSkillSandboxContract,
  scanCapabilityPackageMetadata,
  summarizeExternalPluginSkillDescriptors,
  validateCapabilityDescriptor,
  validatePluginManifest,
  validateSkillManifest,
  type ExternalPluginSkillDescriptorResult
} from "../src/index.js";

function pluginManifest(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    schemaVersion: "plugin_manifest.v1",
    pluginId: "plugin.readonly.docs",
    name: "Readonly Docs Plugin",
    description: "Provides summary-only documentation metadata.",
    version: "1.0.0",
    capabilities: [
      {
        capabilityId: "plugin.readonly.docs.search",
        kind: "read",
        summary: "Searches documentation summaries.",
        riskLevel: "low",
        requiresApproval: false,
        executionMode: "metadata_only"
      }
    ],
    riskNotes: ["Read-only metadata."],
    ...overrides
  };
}

function skillManifest(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    schemaVersion: "skill_manifest.v1",
    skillId: "skill.docs.review",
    name: "Docs Review Skill",
    description: "Reviews summary-only documentation metadata.",
    version: "1.0.0",
    steps: [
      {
        stepId: "skill.docs.review.summarize",
        summary: "Summarize metadata risk.",
        mode: "simulated_builtin_safe"
      }
    ],
    requiredCapabilities: [
      {
        capabilityId: "plugin.readonly.docs.search",
        riskLevel: "low",
        invocationPolicy: "manual_only_preview"
      }
    ],
    riskNotes: ["Built-in safe simulation only."],
    ...overrides
  };
}

function packageScan(): ReturnType<typeof scanCapabilityPackageMetadata> {
  return scanCapabilityPackageMetadata({
    packageName: "@example/readonly-docs-plugin",
    version: "1.0.0",
    packageKind: "plugin",
    manifestJson: pluginManifest(),
    fileListSummary: [
      { path: "package.json", hashPrefix: "aaa111" },
      { path: "metadata/plugin.json", hashPrefix: "bbb222" }
    ],
    packageSizeBytes: 2048,
    declaredScriptsSummary: [],
    dependencyNames: [],
    licenseSummary: "MIT"
  });
}

function sandboxContract(): ReturnType<typeof buildPluginSkillSandboxContract> {
  return buildPluginSkillSandboxContract({
    mode: "simulated_builtin_safe",
    inputSummaryPolicy: "summary_only",
    outputSummaryPolicy: "summary_only",
    maxInputBytes: 4096,
    maxOutputBytes: 2048,
    timeoutMs: 1000,
    idGenerator: () => "sandbox.contract.descriptor"
  });
}

function findingCodes(result: ExternalPluginSkillDescriptorResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: ExternalPluginSkillDescriptorResult): void {
  expect(result.readiness).toMatchObject({
    canRegisterForExecution: false,
    canInvoke: false,
    canIssuePermissionLease: false,
    canWriteEventStore: false,
    canExecutePlugin: false,
    canRunSkillRuntime: false,
    canInstallPackage: false,
    canLoadCode: false,
    canUseNetwork: false,
    canWriteFilesystem: false,
    canExecuteShell: false,
    canExecuteGit: false,
    canUseNativeBridge: false,
    canUseDesktopAction: false,
    appCanExecute: false
  });
}

describe("external plugin skill descriptors", () => {
  it("builds plugin broker descriptor previews from safe manifests and package metadata", () => {
    const result = buildExternalPluginSkillDescriptors({
      pluginManifestResult: validatePluginManifest(pluginManifest()),
      packageScanResult: packageScan(),
      sandboxContract: sandboxContract()
    });
    const summary = summarizeExternalPluginSkillDescriptors(result);

    expect(result.status).toBe("preview_ready");
    expect(result.descriptorCount).toBe(1);
    expect(result.pluginDescriptorCount).toBe(1);
    expect(result.descriptors[0]).toMatchObject({
      capabilityId: "plugin.readonly.docs.search",
      sourceType: "plugin",
      executionMode: "metadata_only",
      invokePolicy: "manual_only_preview"
    });
    expect(result.descriptors[0]?.redactionSummary).toMatchObject({
      rawMetadataIncluded: false,
      rawArgsIncluded: false,
      rawOutputIncluded: false
    });
    expect(summary.source).toBe("runtime_external_plugin_skill_descriptors");
    expect(validateCapabilityDescriptor(result.brokerDescriptors[0]!).ok).toBe(
      true
    );
    expectNoExecution(result);
  });

  it("builds skill broker descriptor previews for built-in safe simulation", () => {
    const result = buildExternalPluginSkillDescriptors({
      skillManifestResult: validateSkillManifest(skillManifest()),
      sandboxContract: sandboxContract()
    });

    expect(result.status).toBe("preview_ready");
    expect(result.skillDescriptorCount).toBe(1);
    expect(result.descriptors[0]).toMatchObject({
      capabilityId: "skill.docs.review.summarize",
      sourceType: "skill",
      executionMode: "simulated_builtin_safe",
      invokePolicy: "manual_only_preview"
    });
    expect(result.brokerDescriptors[0]?.executionMode).toBe("SIMULATE");
    expect(result.brokerDescriptors[0]?.invokePolicy).toBe("MANUAL_ONLY");
    expectNoExecution(result);
  });

  it("maps high-risk descriptors to disabled preview", () => {
    const result = buildExternalPluginSkillDescriptors({
      pluginManifestResult: validatePluginManifest(
        pluginManifest({
          capabilities: [
            {
              capabilityId: "plugin.high.review",
              kind: "analysis",
              summary: "High risk metadata review.",
              riskLevel: "high",
              requiresApproval: true,
              executionMode: "simulated"
            }
          ]
        })
      ),
      sandboxContract: sandboxContract()
    });

    expect(result.status).toBe("preview_ready");
    expect(result.descriptors[0]).toMatchObject({
      riskLevel: "high",
      invokePolicy: "disabled"
    });
    expect(result.brokerDescriptors[0]?.invokePolicy).toBe("DISABLED");
    expectNoExecution(result);
  });

  it("blocks duplicate descriptor ids", () => {
    const result = buildExternalPluginSkillDescriptors({
      pluginManifestResult: validatePluginManifest(pluginManifest()),
      skillManifestResult: validateSkillManifest(
        skillManifest({
          steps: [
            {
              stepId: "plugin.readonly.docs.search",
              summary: "Duplicate id metadata.",
              mode: "metadata_only"
            }
          ]
        })
      ),
      sandboxContract: sandboxContract()
    });

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("DUPLICATE_DESCRIPTOR_ID");
    expect(result.descriptorCount).toBe(0);
    expectNoExecution(result);
  });

  it("blocks blocked manifest, package scan, and sandbox results", () => {
    const result = buildExternalPluginSkillDescriptors({
      pluginManifestResult: validatePluginManifest(
        pluginManifest({ postinstall: "node install.js" })
      ),
      packageScanResult: scanCapabilityPackageMetadata({
        packageName: "@example/blocked",
        version: "1.0.0",
        packageKind: "plugin",
        manifestJson: pluginManifest(),
        fileListSummary: [{ path: "../private/.env", hashPrefix: "bad111" }],
        packageSizeBytes: 2048
      }),
      sandboxContract: buildPluginSkillSandboxContract({
        mode: "shell",
        inputSummaryPolicy: "summary_only",
        outputSummaryPolicy: "summary_only"
      })
    });

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toEqual(
      expect.arrayContaining([
        "BLOCKED_PLUGIN_MANIFEST_REJECTED",
        "BLOCKED_PACKAGE_SCAN_REJECTED",
        "BLOCKED_SANDBOX_CONTRACT_REJECTED"
      ])
    );
    expectNoExecution(result);
  });

  it("blocks raw metadata, secret markers, and execution readiness attempts", () => {
    const result = buildExternalPluginSkillDescriptors({
      pluginManifestResult: validatePluginManifest(pluginManifest()),
      rawMetadata: "blocked",
      notes: "sk-fakedescriptor000000",
      readiness: {
        canInvoke: true
      }
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAW_METADATA_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(findingCodes(result)).toContain("EXECUTION_READINESS_REJECTED");
    expect(serialized).not.toContain("sk-fakedescriptor000000");
    expectNoExecution(result);
  });

  it("keeps descriptor output summary-only without raw manifest summaries", () => {
    const result = buildExternalPluginSkillDescriptors({
      pluginManifestResult: validatePluginManifest(pluginManifest()),
      packageScanResult: packageScan(),
      sandboxContract: sandboxContract()
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("preview_ready");
    expect(serialized).not.toContain("Searches documentation summaries.");
    expect(serialized).not.toContain("Read-only metadata.");
    expect(serialized).not.toContain("rawManifest");
    expect(serialized).not.toContain("rawPackage");
    expectNoExecution(result);
  });
});
