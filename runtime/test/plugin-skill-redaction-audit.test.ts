import { describe, expect, it } from "vitest";

import {
  buildExternalPluginSkillDescriptors,
  buildPluginSkillRedactionAudit,
  buildPluginSkillSandboxContract,
  scanCapabilityPackageMetadata,
  summarizePluginSkillRedactionAudit,
  validatePluginManifest,
  validateSkillManifest,
  type PluginSkillRedactionAudit
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

function packageScan(
  overrides: Record<string, unknown> = {}
): ReturnType<typeof scanCapabilityPackageMetadata> {
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
    licenseSummary: "MIT",
    ...overrides
  });
}

function sandboxContract(): ReturnType<typeof buildPluginSkillSandboxContract> {
  return buildPluginSkillSandboxContract({
    mode: "simulated_builtin_safe",
    inputSummaryPolicy: "summary_only",
    outputSummaryPolicy: "summary_only",
    maxInputBytes: 4096,
    maxOutputBytes: 2048,
    timeoutMs: 1000
  });
}

function safeDescriptorResult(): ReturnType<
  typeof buildExternalPluginSkillDescriptors
> {
  return buildExternalPluginSkillDescriptors({
    pluginManifestResult: validatePluginManifest(pluginManifest()),
    skillManifestResult: validateSkillManifest(skillManifest()),
    packageScanResult: packageScan(),
    sandboxContract: sandboxContract()
  });
}

function expectNoExecution(audit: PluginSkillRedactionAudit): void {
  expect(audit.readiness).toMatchObject({
    canInstallPlugin: false,
    canRunSkillRuntime: false,
    canExecutePlugin: false,
    canInvokeCapability: false,
    canIssuePermissionLease: false,
    canWriteEventStore: false,
    canFetchNetwork: false,
    canWriteFilesystem: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canUseNativeBridge: false,
    canUseDesktopAction: false,
    appCanExecute: false
  });
}

function findingCodes(audit: PluginSkillRedactionAudit): string[] {
  return audit.findings.map((finding) => finding.code);
}

describe("plugin skill redaction audit", () => {
  it("returns empty safely without inputs", () => {
    const audit = buildPluginSkillRedactionAudit();

    expect(audit.status).toBe("empty");
    expect(audit.metadataCounts.totalMetadataRefCount).toBe(0);
    expect(audit.readiness.canPreviewAudit).toBe(false);
    expectNoExecution(audit);
  });

  it("audits safe plugin, skill, package, sandbox, descriptor, and App summaries", () => {
    const pluginManifestResult = validatePluginManifest(pluginManifest());
    const skillManifestResult = validateSkillManifest(skillManifest());
    const packageScanResult = packageScan();
    const contract = sandboxContract();
    const descriptorResult = buildExternalPluginSkillDescriptors({
      pluginManifestResult,
      skillManifestResult,
      packageScanResult,
      sandboxContract: contract
    });
    const audit = buildPluginSkillRedactionAudit({
      pluginManifestResult,
      skillManifestResult,
      packageScanResult,
      sandboxContract: contract,
      descriptorResult,
      appHostSummary: {
        source: "app_plugin_skill_host",
        brokerDescriptorCount: descriptorResult.descriptorCount,
        riskSummary: descriptorResult.riskMapping
      }
    });
    const summary = summarizePluginSkillRedactionAudit(audit);

    expect(audit.status).toBe("audit_ready");
    expect(audit.sourceCounts).toMatchObject({
      pluginManifestResultCount: 1,
      skillManifestResultCount: 1,
      packageScanResultCount: 1,
      sandboxContractCount: 1,
      descriptorResultCount: 1,
      appHostSummaryCount: 1
    });
    expect(audit.metadataCounts.pluginCapabilityCount).toBe(1);
    expect(audit.metadataCounts.skillStepCount).toBe(1);
    expect(audit.metadataCounts.brokerDescriptorCount).toBeGreaterThanOrEqual(2);
    expect(audit.rawFieldDetectedCount).toBe(0);
    expect(summary.source).toBe("runtime_plugin_skill_redaction_audit");
    expect(audit.readiness.canPreviewAudit).toBe(true);
    expectNoExecution(audit);
  });

  it("blocks raw metadata, package content, prompt, args, output, source, and diff fields", () => {
    const audit = buildPluginSkillRedactionAudit({
      descriptorResult: safeDescriptorResult(),
      appHostSummary: {
        rawMetadata: "blocked",
        rawPackageContent: "blocked",
        rawPrompt: "blocked",
        rawArgs: "blocked",
        rawOutput: "blocked",
        rawSource: "blocked",
        rawDiff: "blocked"
      }
    } as never);
    const codes = findingCodes(audit);
    const serialized = JSON.stringify(audit);

    expect(audit.status).toBe("blocked");
    expect(codes).toContain("RAW_METADATA_FIELD_REJECTED");
    expect(codes).toContain("RAW_PACKAGE_CONTENT_FIELD_REJECTED");
    expect(codes).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(codes).toContain("RAW_ARGS_FIELD_REJECTED");
    expect(codes).toContain("RAW_OUTPUT_FIELD_REJECTED");
    expect(codes).toContain("RAW_SOURCE_FIELD_REJECTED");
    expect(codes).toContain("RAW_DIFF_FIELD_REJECTED");
    expect(audit.leakBooleans.rawPromptDetected).toBe(true);
    expect(audit.leakBooleans.rawArgsDetected).toBe(true);
    expect(serialized).not.toContain("raw package body");
    expectNoExecution(audit);
  });

  it("blocks API key, Authorization, bearer, and private key markers without echoing them", () => {
    const audit = buildPluginSkillRedactionAudit({
      descriptorResult: safeDescriptorResult(),
      appHostSummary: {
        marker: "sk-fake1234567890",
        auth: "Authorization: Bearer fake-token-1234567890",
        privateKey: "-----BEGIN FAKE PRIVATE KEY-----"
      }
    } as never);
    const codes = findingCodes(audit);
    const serialized = JSON.stringify(audit);

    expect(audit.status).toBe("blocked");
    expect(codes).toContain("SECRET_MARKER_REJECTED");
    expect(codes).toContain("AUTHORIZATION_MARKER_REJECTED");
    expect(codes).toContain("BEARER_TOKEN_REJECTED");
    expect(codes).toContain("PRIVATE_KEY_MARKER_REJECTED");
    expect(audit.leakBooleans.secretDetected).toBe(true);
    expect(serialized).not.toContain("sk-fake1234567890");
    expect(serialized).not.toContain("fake-token-1234567890");
    expectNoExecution(audit);
  });

  it("blocks install scripts, shell commands, native bridge, desktop action, and execution readiness", () => {
    const audit = buildPluginSkillRedactionAudit({
      descriptorResult: safeDescriptorResult(),
      appHostSummary: {
        installScript: "blocked",
        shellCommand: "blocked",
        nativeBridge: true,
        desktopAction: true,
        canExecutePlugin: true,
        canRunSkillRuntime: true,
        canWriteEventStore: true
      }
    } as never);
    const codes = findingCodes(audit);

    expect(audit.status).toBe("blocked");
    expect(codes).toContain("INSTALL_SCRIPT_FIELD_REJECTED");
    expect(codes).toContain("SHELL_COMMAND_FIELD_REJECTED");
    expect(codes).toContain("NATIVE_BRIDGE_FIELD_REJECTED");
    expect(codes).toContain("DESKTOP_ACTION_FIELD_REJECTED");
    expect(codes).toContain("EXECUTION_READINESS_REJECTED");
    expect(audit.leakBooleans.installScriptDetected).toBe(true);
    expect(audit.leakBooleans.executionFieldDetected).toBe(true);
    expect(audit.leakBooleans.nativeBridgeDetected).toBe(true);
    expect(audit.leakBooleans.desktopActionDetected).toBe(true);
    expectNoExecution(audit);
  });

  it("blocks blocked source results and warns for warning source results", () => {
    const blockedPluginManifestResult = validatePluginManifest(
      pluginManifest({ rawCode: "blocked" })
    );
    const warningSkillManifestResult = validateSkillManifest({
      schemaVersion: "skill_manifest.v1",
      skillId: "skill.docs.warning",
      name: "Warning Skill",
      description: "Warning metadata.",
      version: "1.0.0",
      steps: [],
      requiredCapabilities: [],
      riskNotes: []
    });
    const blockedAudit = buildPluginSkillRedactionAudit({
      pluginManifestResult: blockedPluginManifestResult
    });
    const warningAudit = buildPluginSkillRedactionAudit({
      skillManifestResult: warningSkillManifestResult,
      sandboxContract: sandboxContract()
    });

    expect(blockedAudit.status).toBe("blocked");
    expect(findingCodes(blockedAudit)).toContain(
      "BLOCKED_PLUGIN_MANIFEST_RESULT"
    );
    expect(warningAudit.status).toBe("warning");
    expect(findingCodes(warningAudit)).toContain(
      "SKILL_MANIFEST_WARNING_PRESENT"
    );
    expectNoExecution(blockedAudit);
    expectNoExecution(warningAudit);
  });

  it("outputs summary-only audit without raw content or execution readiness", () => {
    const audit = buildPluginSkillRedactionAudit({
      descriptorResult: safeDescriptorResult(),
      appHostSummary: {
        source: "app_plugin_skill_host",
        brokerDescriptorCount: 2,
        riskSummary: { low: 2 }
      }
    });
    const serialized = JSON.stringify(audit);

    expect(audit.status).toBe("audit_ready");
    expect(serialized).not.toContain("blocked prompt");
    expect(serialized).not.toContain("blocked source");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("blocked shell");
    expect(audit.auditId).toMatch(/^plugin-skill-redaction-audit-/);
    expect(audit.auditHash).toHaveLength(64);
    expectNoExecution(audit);
  });
});
