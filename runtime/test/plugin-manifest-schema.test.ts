import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  parsePluginManifest,
  summarizePluginManifest,
  validatePluginManifest,
  type PluginManifestValidationResult
} from "../src/index.js";

const fixtureRoot = new URL("./fixtures/plugin-manifests/", import.meta.url);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

function findingCodes(result: PluginManifestValidationResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: PluginManifestValidationResult): void {
  expect(result.readiness).toMatchObject({
    canLoadCode: false,
    canInstallPackage: false,
    canExecutePlugin: false,
    canInvokeCapability: false,
    canWriteFilesystem: false,
    canUseNetwork: false,
    canUseNativeBridge: false,
    canUseDesktopAction: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("plugin manifest schema", () => {
  it("parses safe readonly plugin metadata", async () => {
    const fixture = await readFixture("safe-readonly-plugin.json");
    const result = validatePluginManifest(fixture);

    expect(result.status).toBe("parsed");
    expect(result.manifest?.pluginId).toBe("plugin.readonly.docs");
    expect(result.summary.capabilityCount).toBe(1);
    expect(result.summary.permissionCount).toBe(1);
    expect(result.summary.riskLevel).toBe("low");
    expect(result.readiness.canRegisterMetadata).toBe(true);
    expect(result.source).toBe("runtime_plugin_manifest_schema");
    expectNoExecution(result);
  });

  it("parses JSON string input and summarizes manifest", async () => {
    const fixture = await readFixture("safe-readonly-plugin.json");
    const result = parsePluginManifest(JSON.stringify(fixture));

    expect(result.status).toBe("parsed");
    expect(result.manifest).toBeDefined();
    const summary = summarizePluginManifest(result.manifest!);
    expect(summary.pluginId).toBe("plugin.readonly.docs");
    expect(summary.summaryOnly).toBe(true);
    expectNoExecution(result);
  });

  it("warns for disabled write metadata without enabling execution", async () => {
    const fixture = await readFixture("warning-write-disabled-plugin.json");
    const result = validatePluginManifest(fixture);

    expect(result.status).toBe("warning");
    expect(findingCodes(result)).toContain("APPROVAL_METADATA_MISSING");
    expect(findingCodes(result)).toContain("MUTATING_PERMISSION_METADATA");
    expect(result.summary.riskLevel).toBe("high");
    expect(result.readiness.canRegisterMetadata).toBe(true);
    expectNoExecution(result);
  });

  it("blocks missing required fields", () => {
    const result = validatePluginManifest({
      schemaVersion: "plugin_manifest.v1",
      capabilities: []
    });

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("MISSING_PLUGIN_ID");
    expect(findingCodes(result)).toContain("MISSING_NAME");
    expect(findingCodes(result)).toContain("MISSING_VERSION");
    expect(findingCodes(result)).toContain("MISSING_CAPABILITIES");
    expectNoExecution(result);
  });

  it("blocks duplicate capability IDs", async () => {
    const fixture = await readFixture("duplicate-capability.json");
    const result = validatePluginManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("DUPLICATE_CAPABILITY_ID");
    expectNoExecution(result);
  });

  it("blocks unsupported schema version and unknown execution mode", async () => {
    const fixture = await readFixture("safe-readonly-plugin.json");
    fixture.schemaVersion = "plugin_manifest.v999";
    (fixture.capabilities as Record<string, unknown>[])[0]!.executionMode =
      "enabled";
    const result = validatePluginManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("UNSUPPORTED_SCHEMA_VERSION");
    expect(findingCodes(result)).toContain("UNKNOWN_EXECUTION_MODE");
    expectNoExecution(result);
  });

  it("blocks broad mutation claims", async () => {
    const fixture = await readFixture("warning-write-disabled-plugin.json");
    (fixture.capabilities as Record<string, unknown>[])[0]!.executionMode =
      "simulated";
    const result = validatePluginManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("BROAD_MUTATION_CLAIM_REJECTED");
    expectNoExecution(result);
  });

  it("blocks unsafe entrypoint paths", async () => {
    const fixture = await readFixture("blocked-entrypoint-path.json");
    const result = validatePluginManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("UNSAFE_ENTRYPOINT_PATH");
    expectNoExecution(result);
  });

  it("blocks lifecycle script fields", async () => {
    const fixture = await readFixture("blocked-lifecycle-script.json");
    const result = validatePluginManifest(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("POSTINSTALL_FIELD_REJECTED");
    expect(serialized).not.toContain("node install.js");
    expectNoExecution(result);
  });

  it("blocks package URL query secrets", async () => {
    const fixture = await readFixture("safe-readonly-plugin.json");
    fixture.homepage = "https://example.invalid/pkg?token=fake-token";
    const result = validatePluginManifest(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("URL_QUERY_SECRET_REJECTED");
    expect(serialized).not.toContain("fake-token");
    expectNoExecution(result);
  });

  it("blocks secret markers and raw code markers", async () => {
    const secretFixture = await readFixture("blocked-secret-marker.json");
    const rawCodeFixture = await readFixture("blocked-raw-code.json");
    const secretResult = validatePluginManifest(secretFixture);
    const rawCodeResult = validatePluginManifest(rawCodeFixture);
    const serialized = JSON.stringify({ secretResult, rawCodeResult });

    expect(secretResult.status).toBe("blocked");
    expect(rawCodeResult.status).toBe("blocked");
    expect(findingCodes(secretResult)).toContain("SECRET_MARKER_REJECTED");
    expect(findingCodes(rawCodeResult)).toContain("RAW_CODE_FIELD_REJECTED");
    expect(serialized).not.toContain("sk-fakeplugin000000");
    expect(serialized).not.toContain("function blocked");
    expectNoExecution(secretResult);
  });

  it("blocks binary-looking metadata and execution readiness flags", async () => {
    const fixture = await readFixture("safe-readonly-plugin.json");
    fixture.packageSummary = {
      blob: "A".repeat(140)
    };
    fixture.readiness = {
      canExecutePlugin: true
    };
    const result = validatePluginManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("BINARY_MARKER_REJECTED");
    expect(findingCodes(result)).toContain("EXECUTION_READINESS_REJECTED");
    expectNoExecution(result);
  });

  it("keeps blocked output summary-only", async () => {
    const fixture = await readFixture("blocked-secret-marker.json");
    const result = validatePluginManifest(fixture);
    const serialized = JSON.stringify(result);

    expect(result.manifest).toBeUndefined();
    expect(result.summary.summaryOnly).toBe(true);
    expect(serialized).not.toContain("sk-fakeplugin000000");
    expect(serialized).not.toContain("apiKey");
    expectNoExecution(result);
  });
});
