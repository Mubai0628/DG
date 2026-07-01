import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  parseExternalCapabilityManifest,
  summarizeExternalCapabilityManifest,
  validateExternalCapabilityManifest,
  type ExternalCapabilityManifestValidationResult
} from "../src/index.js";

const fixtureRoot = new URL(
  "./fixtures/external-capabilities/",
  import.meta.url
);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

function findingCodes(
  result: ExternalCapabilityManifestValidationResult
): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(
  result: ExternalCapabilityManifestValidationResult
): void {
  expect(result.readiness).toMatchObject({
    canInvokeCapability: false,
    canIssueLease: false,
    canExecuteShell: false,
    canUseNetwork: false,
    canUseDesktop: false,
    appCanExecute: false
  });
}

describe("external capability manifest schema", () => {
  it("parses a safe MCP read-only manifest", async () => {
    const fixture = await readFixture("safe-mcp-readonly.json");
    const result = validateExternalCapabilityManifest(fixture);

    expect(result.status).toBe("parsed");
    expect(result.manifest?.sourceType).toBe("mcp_server");
    expect(result.summary.capabilityIds).toContain("mcp.docs.search");
    expect(result.readiness.canRegisterDescriptor).toBe(true);
    expectNoExecution(result);
  });

  it("parses a safe plugin read-only manifest", async () => {
    const fixture = await readFixture("safe-plugin-readonly.json");
    const result = parseExternalCapabilityManifest(fixture);
    const summary = summarizeExternalCapabilityManifest(result.manifest!);

    expect(result.status).toBe("parsed");
    expect(result.manifest?.sourceType).toBe("plugin_package");
    expect(summary.invocationPolicies).toContain("MANUAL_ONLY");
    expect(summary.warningCodes).toContain("PLUGIN_METADATA_ONLY");
    expectNoExecution(result);
  });

  it("parses a safe skill read-only manifest", async () => {
    const fixture = await readFixture("safe-skill-readonly.json");
    const result = validateExternalCapabilityManifest(fixture);

    expect(result.status).toBe("parsed");
    expect(result.manifest?.sourceType).toBe("skill_bundle");
    expect(result.summary.invocationPolicies).toContain("DISABLED");
    expectNoExecution(result);
  });

  it("parses JSON string input", async () => {
    const fixture = await readFixture("safe-mcp-readonly.json");
    const result = parseExternalCapabilityManifest(JSON.stringify(fixture));

    expect(result.status).toBe("parsed");
    expect(result.summary.manifestId).toBe("mcp-readonly-docs");
    expectNoExecution(result);
  });

  it("blocks duplicate capability ids", async () => {
    const fixture = await readFixture("safe-mcp-readonly.json");
    fixture.capabilities = [
      ...(fixture.capabilities as unknown[]),
      {
        ...((fixture.capabilities as Record<string, unknown>[])[0] ?? {})
      }
    ];
    const result = validateExternalCapabilityManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("DUPLICATE_CAPABILITY_ID");
    expect(result.readiness.canRegisterDescriptor).toBe(false);
    expectNoExecution(result);
  });

  it("blocks AUTO policy for external sources", async () => {
    const fixture = await readFixture("rejected-auto-external.json");
    const result = validateExternalCapabilityManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("AUTO_EXTERNAL_REJECTED");
    expectNoExecution(result);
  });

  it("blocks command, script, and eval fields", async () => {
    const commandFixture = await readFixture("rejected-command-field.json");
    const scriptFixture = {
      ...(await readFixture("safe-plugin-readonly.json")),
      capabilities: [
        {
          ...((
            (await readFixture("safe-plugin-readonly.json"))
              .capabilities as Record<string, unknown>[]
          )[0] ?? {}),
          script: "blocked"
        }
      ]
    };
    const evalFixture = {
      ...(await readFixture("safe-plugin-readonly.json")),
      capabilities: [
        {
          ...((
            (await readFixture("safe-plugin-readonly.json"))
              .capabilities as Record<string, unknown>[]
          )[0] ?? {}),
          eval: "blocked"
        }
      ]
    };

    const commandResult = validateExternalCapabilityManifest(commandFixture);
    const scriptResult = validateExternalCapabilityManifest(scriptFixture);
    const evalResult = validateExternalCapabilityManifest(evalFixture);
    const serialized = JSON.stringify({
      commandResult,
      scriptResult,
      evalResult
    });

    expect(commandResult.status).toBe("blocked");
    expect(scriptResult.status).toBe("blocked");
    expect(evalResult.status).toBe("blocked");
    expect(findingCodes(commandResult)).toContain("COMMAND_FIELD_REJECTED");
    expect(findingCodes(scriptResult)).toContain("SCRIPT_FIELD_REJECTED");
    expect(findingCodes(evalResult)).toContain("EVAL_FIELD_REJECTED");
    expect(serialized).not.toContain("echo blocked");
    expectNoExecution(commandResult);
  });

  it("blocks secret markers without echoing the fake key", async () => {
    const fixture = await readFixture("rejected-secret-marker.json");
    const result = validateExternalCapabilityManifest(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("sk-fake1234567890");
    expectNoExecution(result);
  });

  it("blocks URL query secrets", async () => {
    const fixture = await readFixture("safe-mcp-readonly.json");
    fixture.homepageRef = "https://example.invalid/callback?token=fake-token";
    const result = validateExternalCapabilityManifest(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("URL_QUERY_SECRET_REJECTED");
    expect(serialized).not.toContain("fake-token");
    expectNoExecution(result);
  });

  it("blocks wildcard scopes", async () => {
    const fixture = await readFixture("safe-mcp-readonly.json");
    fixture.scopes = ["*"];
    const result = validateExternalCapabilityManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("BROAD_WILDCARD_SCOPE_REJECTED");
    expectNoExecution(result);
  });

  it("warns and defaults unknown risk or operation safely", async () => {
    const fixture = await readFixture("safe-plugin-readonly.json");
    fixture.capabilities = [
      {
        ...((fixture.capabilities as Record<string, unknown>[])[0] ?? {}),
        operationKind: "mystery",
        riskLevel: "AX",
        defaultInvocationPolicy: "MANUAL_ONLY"
      }
    ];
    const result = validateExternalCapabilityManifest(fixture);

    expect(result.status).toBe("warning");
    expect(findingCodes(result)).toContain("UNKNOWN_OPERATION_KIND");
    expect(findingCodes(result)).toContain("UNKNOWN_RISK_DEFAULTED_A5");
    expect(result.summary.operationKinds).toContain("unknown");
    expect(result.summary.riskLevels).toContain("A5");
    expectNoExecution(result);
  });

  it("warns when high-risk network metadata remains manual-only", async () => {
    const fixture = await readFixture("warning-network-manifest.json");
    const result = validateExternalCapabilityManifest(fixture);

    expect(result.status).toBe("warning");
    expect(findingCodes(result)).toContain("NETWORK_FLAG_PRESENT");
    expect(result.summary.riskLevels).toContain("A4");
    expect(result.summary.invocationPolicies).toContain("MANUAL_ONLY");
    expectNoExecution(result);
  });

  it("blocks risk downgrade attempts", async () => {
    const fixture = await readFixture("warning-network-manifest.json");
    fixture.capabilities = [
      {
        ...((fixture.capabilities as Record<string, unknown>[])[0] ?? {}),
        riskLevel: "A0"
      }
    ];
    const result = validateExternalCapabilityManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RISK_DOWNGRADE_ATTEMPT");
    expectNoExecution(result);
  });

  it("blocks unsafe local path traversal", async () => {
    const fixture = await readFixture("safe-plugin-readonly.json");
    fixture.metadataRefs = ["../private/.env"];
    const result = validateExternalCapabilityManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("UNSAFE_PATH_REJECTED");
    expectNoExecution(result);
  });

  it("keeps summary output free of raw args and secrets", async () => {
    const fixture = await readFixture("safe-mcp-readonly.json");
    const result = validateExternalCapabilityManifest(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("parsed");
    expect(serialized).not.toContain("rawArgs");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("token=");
    expect(result.summary.summaryOnly).toBe(true);
    expectNoExecution(result);
  });
});
