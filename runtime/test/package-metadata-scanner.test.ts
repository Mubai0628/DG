import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  scanCapabilityPackageMetadata,
  summarizeCapabilityPackageMetadataScan,
  type CapabilityPackageMetadataScanResult
} from "../src/index.js";

const fixtureRoot = new URL("./fixtures/capability-packages/", import.meta.url);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

function findingCodes(result: CapabilityPackageMetadataScanResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: CapabilityPackageMetadataScanResult): void {
  expect(result.readiness).toMatchObject({
    canInstallPackage: false,
    canExecutePlugin: false,
    canExecuteSkill: false,
    canLoadCode: false,
    canWriteFilesystem: false,
    canUseNetwork: false,
    canWriteEventStore: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("package metadata scanner", () => {
  it("scans safe plugin package metadata", async () => {
    const fixture = await readFixture("safe-plugin-package.json");
    const result = scanCapabilityPackageMetadata(fixture);
    const summary = summarizeCapabilityPackageMetadataScan(result);

    expect(result.status).toBe("scanned");
    expect(result.packageKind).toBe("plugin");
    expect(result.fileCount).toBe(3);
    expect(result.dependencyCount).toBe(1);
    expect(result.manifestRefs[0]?.kind).toBe("plugin");
    expect(summary.source).toBe("runtime_package_metadata_scanner");
    expect(result.readiness.canRegisterMetadata).toBe(true);
    expectNoExecution(result);
  });

  it("scans safe skill package metadata and JSON string input", async () => {
    const fixture = await readFixture("safe-skill-package.json");
    const result = scanCapabilityPackageMetadata(JSON.stringify(fixture));

    expect(result.status).toBe("scanned");
    expect(result.packageKind).toBe("skill");
    expect(result.fileCount).toBe(2);
    expect(result.manifestRefs[0]?.kind).toBe("skill");
    expectNoExecution(result);
  });

  it("blocks lifecycle scripts without echoing command text", async () => {
    const fixture = await readFixture("blocked-lifecycle-package.json");
    const result = scanCapabilityPackageMetadata(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("LIFECYCLE_SCRIPT_REJECTED");
    expect(findingCodes(result)).toContain("SHELL_SCRIPT_SUMMARY_REJECTED");
    expect(serialized).not.toContain("node install.js");
    expectNoExecution(result);
  });

  it("blocks native and binary markers", async () => {
    const fixture = await readFixture("blocked-native-package.json");
    const result = scanCapabilityPackageMetadata(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("NATIVE_OR_BINARY_MARKER_REJECTED");
    expect(findingCodes(result)).toContain("SHELL_ENTRYPOINT_REJECTED");
    expect(findingCodes(result)).toContain("NATIVE_BUILD_SCRIPT_REJECTED");
    expectNoExecution(result);
  });

  it("blocks unsafe package file paths", async () => {
    const fixture = await readFixture("safe-plugin-package.json");
    fixture.fileListSummary = [
      { path: "../private/.env", hashPrefix: "bad111" },
      { path: "node_modules/pkg/index.js", hashPrefix: "bad222" }
    ];
    const result = scanCapabilityPackageMetadata(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("UNSAFE_PACKAGE_PATH_REJECTED");
    expectNoExecution(result);
  });

  it("blocks raw package content and raw code markers", async () => {
    const fixture = await readFixture("safe-plugin-package.json");
    fixture.rawPackageContent = "blocked";
    fixture.metadataSummary = "function blocked() { return true; }";
    const result = scanCapabilityPackageMetadata(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain(
      "RAW_PACKAGE_CONTENT_FIELD_REJECTED"
    );
    expect(findingCodes(result)).toContain("RAW_CODE_MARKER_REJECTED");
    expect(serialized).not.toContain("function blocked");
    expectNoExecution(result);
  });

  it("blocks secret markers and oversized packages", async () => {
    const fixture = await readFixture("safe-plugin-package.json");
    fixture.dependencyNames = ["safe", "sk-fakepackage000000"];
    fixture.packageSizeBytes = 30 * 1024 * 1024;
    const result = scanCapabilityPackageMetadata(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(findingCodes(result)).toContain("OVERSIZED_PACKAGE_REJECTED");
    expect(serialized).not.toContain("sk-fakepackage000000");
    expectNoExecution(result);
  });

  it("blocks blocked manifest results", async () => {
    const fixture = await readFixture("safe-plugin-package.json");
    (fixture.manifestJson as Record<string, unknown>).postinstall =
      "node install.js";
    const result = scanCapabilityPackageMetadata(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("BLOCKED_PLUGIN_MANIFEST");
    expectNoExecution(result);
  });

  it("blocks execution readiness flags", async () => {
    const fixture = await readFixture("safe-plugin-package.json");
    fixture.readiness = {
      canInstallPackage: true
    };
    const result = scanCapabilityPackageMetadata(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("READINESS_FIELD_REJECTED");
    expectNoExecution(result);
  });
});
