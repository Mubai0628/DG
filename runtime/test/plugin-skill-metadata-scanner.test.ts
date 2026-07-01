import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  scanPluginSkillMetadata,
  summarizePluginSkillMetadataScan,
  type PluginSkillMetadataScanResult
} from "../src/index.js";

const fixtureRoot = new URL(
  "./fixtures/plugin-skill-metadata/",
  import.meta.url
);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

function findingCodes(result: PluginSkillMetadataScanResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: PluginSkillMetadataScanResult): void {
  expect(result.readiness).toMatchObject({
    canInstallPackage: false,
    canExecutePlugin: false,
    canExecuteSkill: false,
    canInvokeCapability: false,
    appCanExecute: false
  });
}

describe("plugin skill metadata scanner", () => {
  it("scans safe plugin metadata", async () => {
    const fixture = await readFixture("safe-plugin-metadata.json");
    const result = scanPluginSkillMetadata(fixture);
    const summary = summarizePluginSkillMetadataScan(result);

    expect(result.status).toBe("scanned");
    expect(result.packageCount).toBe(1);
    expect(result.skillCount).toBe(0);
    expect(result.declaredCapabilityCount).toBe(1);
    expect(result.pluginPackages[0]?.packageId).toBe("plugin.readonly.format");
    expect(summary.source).toBe("runtime_plugin_skill_metadata_scanner");
    expect(result.readiness.canRegisterMetadata).toBe(true);
    expectNoExecution(result);
  });

  it("scans safe skill metadata", async () => {
    const fixture = await readFixture("safe-skill-metadata.json");
    const result = scanPluginSkillMetadata(fixture);

    expect(result.status).toBe("scanned");
    expect(result.packageCount).toBe(0);
    expect(result.skillCount).toBe(1);
    expect(result.skillBundles[0]?.skillId).toBe("skill.readonly.review");
    expectNoExecution(result);
  });

  it("parses JSON string input", async () => {
    const fixture = await readFixture("safe-plugin-metadata.json");
    const result = scanPluginSkillMetadata(JSON.stringify(fixture));

    expect(result.status).toBe("scanned");
    expect(result.pluginPackages[0]?.displayName).toBe(
      "Readonly Format Plugin"
    );
    expectNoExecution(result);
  });

  it("accepts explicit file summary lists without crawling paths", () => {
    const result = scanPluginSkillMetadata([
      {
        path: "docs/README.md",
        summary: "Explicit file summary metadata only.",
        hashPrefix: "abc123"
      }
    ]);

    expect(result.status).toBe("warning");
    expect(result.packageCount).toBe(1);
    expect(result.declaredCapabilityCount).toBe(0);
    expect(result.readiness.canRegisterMetadata).toBe(true);
    expectNoExecution(result);
  });

  it("blocks install scripts", async () => {
    const fixture = await readFixture("rejected-install-script.json");
    const result = scanPluginSkillMetadata(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("INSTALL_SCRIPT_REJECTED");
    expect(serialized).not.toContain("node install.js");
    expectNoExecution(result);
  });

  it("blocks eval and code fields", async () => {
    const evalFixture = await readFixture("rejected-eval-code.json");
    const codeFixture = {
      ...(await readFixture("safe-plugin-metadata.json")),
      code: "blocked"
    };
    const evalResult = scanPluginSkillMetadata(evalFixture);
    const codeResult = scanPluginSkillMetadata(codeFixture);

    expect(evalResult.status).toBe("blocked");
    expect(codeResult.status).toBe("blocked");
    expect(findingCodes(evalResult)).toContain("EVAL_FIELD_REJECTED");
    expect(findingCodes(codeResult)).toContain("CODE_FIELD_REJECTED");
    expectNoExecution(evalResult);
  });

  it("blocks command fields", async () => {
    const fixture = await readFixture("rejected-command.json");
    const result = scanPluginSkillMetadata(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("COMMAND_FIELD_REJECTED");
    expect(serialized).not.toContain("echo blocked");
    expectNoExecution(result);
  });

  it("warns for broad dependencies and high risk metadata", async () => {
    const fixture = await readFixture("warning-broad-dependency.json");
    const result = scanPluginSkillMetadata(fixture);

    expect(result.status).toBe("warning");
    expect(findingCodes(result)).toContain("MISSING_PUBLISHER");
    expect(findingCodes(result)).toContain("UNPINNED_VERSION");
    expect(findingCodes(result)).toContain("BROAD_DEPENDENCY_RANGE");
    expect(findingCodes(result)).toContain("HIGH_RISK_DECLARED_CAPABILITY");
    expect(findingCodes(result)).toContain("NETWORK_REQUESTED");
    expect(result.riskSummary.A4).toBe(1);
    expectNoExecution(result);
  });

  it("blocks dependency URL query secrets", async () => {
    const fixture = await readFixture("safe-plugin-metadata.json");
    fixture.dependencyRefs = ["https://example.invalid/pkg?token=fake-token"];
    const result = scanPluginSkillMetadata(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain(
      "DEPENDENCY_URL_QUERY_SECRET_REJECTED"
    );
    expect(serialized).not.toContain("fake-token");
    expectNoExecution(result);
  });

  it("blocks executable paths and path traversal", async () => {
    const executableFixture = await readFixture("safe-plugin-metadata.json");
    executableFixture.fileRef = "bin/run.ps1";
    const traversalFixture = await readFixture("safe-skill-metadata.json");
    traversalFixture.fileRef = "../private/.env";

    const executableResult = scanPluginSkillMetadata(executableFixture);
    const traversalResult = scanPluginSkillMetadata(traversalFixture);

    expect(executableResult.status).toBe("blocked");
    expect(traversalResult.status).toBe("blocked");
    expect(findingCodes(executableResult)).toContain("UNSAFE_PATH_REJECTED");
    expect(findingCodes(traversalResult)).toContain("UNSAFE_PATH_REJECTED");
    expectNoExecution(executableResult);
  });

  it("blocks secret markers and raw prompt/source/diff/response fields", async () => {
    const secretFixture = await readFixture("safe-plugin-metadata.json");
    secretFixture.displayName = "Plugin sk-fake1234567890";
    const rawFixture = await readFixture("safe-skill-metadata.json");
    rawFixture.rawPrompt = "Synthetic raw prompt.";
    rawFixture.rawSource = "Synthetic raw source.";
    rawFixture.rawDiff = "Synthetic raw diff.";
    rawFixture.rawResponse = "Synthetic raw response.";

    const secretResult = scanPluginSkillMetadata(secretFixture);
    const rawResult = scanPluginSkillMetadata(rawFixture);
    const serialized = JSON.stringify({ secretResult, rawResult });

    expect(secretResult.status).toBe("blocked");
    expect(rawResult.status).toBe("blocked");
    expect(findingCodes(secretResult)).toContain("SECRET_MARKER_REJECTED");
    expect(findingCodes(rawResult)).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(findingCodes(rawResult)).toContain("RAW_SOURCE_FIELD_REJECTED");
    expect(findingCodes(rawResult)).toContain("RAW_DIFF_FIELD_REJECTED");
    expect(findingCodes(rawResult)).toContain("RAW_RESPONSE_FIELD_REJECTED");
    expect(serialized).not.toContain("sk-fake1234567890");
    expect(serialized).not.toContain("Synthetic raw prompt.");
    expectNoExecution(secretResult);
  });

  it("blocks AUTO external policy", async () => {
    const fixture = await readFixture("safe-plugin-metadata.json");
    fixture.declaredCapabilities = [
      {
        ...((fixture.declaredCapabilities as Record<string, unknown>[])[0] ??
          {}),
        defaultInvocationPolicy: "AUTO"
      }
    ];
    const result = scanPluginSkillMetadata(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("AUTO_EXTERNAL_POLICY_REJECTED");
    expectNoExecution(result);
  });
});
