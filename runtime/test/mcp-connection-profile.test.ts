import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  parseMcpConnectionProfile,
  summarizeMcpConnectionProfile,
  validateMcpConnectionProfile,
  type McpConnectionProfileValidationResult
} from "../src/index.js";

const fixtureRoot = new URL(
  "./fixtures/mcp-connection-profiles/",
  import.meta.url
);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

function findingCodes(result: McpConnectionProfileValidationResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: McpConnectionProfileValidationResult): void {
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

describe("mcp connection profile schema", () => {
  it("parses a safe injected profile", async () => {
    const fixture = await readFixture("safe-injected-profile.json");
    const result = validateMcpConnectionProfile(fixture);

    expect(result.status).toBe("parsed");
    expect(result.profile?.transportKind).toBe("injected_test_transport");
    expect(result.summary.readOnlyCapabilities.allowListTools).toBe(true);
    expect(result.readiness.canUseProfileForReadonlyDiscovery).toBe(true);
    expectNoExecution(result);
  });

  it("parses a safe fixed stdio profile without raw commands", async () => {
    const fixture = await readFixture("safe-stdio-fixed-profile.json");
    const result = parseMcpConnectionProfile(JSON.stringify(fixture));
    const summary = summarizeMcpConnectionProfile(result.profile!);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("parsed");
    expect(result.profile?.transportKind).toBe("stdio_fixed");
    expect(summary.commandRefHash).toBeDefined();
    expect(serialized).not.toContain("node server.js");
    expectNoExecution(result);
  });

  it("blocks call tool permission", async () => {
    const fixture = await readFixture("rejected-call-tool.json");
    const result = validateMcpConnectionProfile(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("ALLOWCALLTOOL_REJECTED");
    expect(result.profile).toBeUndefined();
    expect(result.readiness.canUseProfileForReadonlyDiscovery).toBe(false);
    expectNoExecution(result);
  });

  it("blocks resource reads", async () => {
    const fixture = await readFixture("safe-injected-profile.json");
    fixture.readOnlyPolicy = {
      ...(fixture.readOnlyPolicy as Record<string, unknown>),
      allowReadResource: true
    };
    const result = validateMcpConnectionProfile(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("ALLOWREADRESOURCE_REJECTED");
    expectNoExecution(result);
  });

  it("blocks mutation", async () => {
    const fixture = await readFixture("safe-injected-profile.json");
    fixture.readOnlyPolicy = {
      ...(fixture.readOnlyPolicy as Record<string, unknown>),
      allowMutation: true
    };
    const result = validateMcpConnectionProfile(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("ALLOWMUTATION_REJECTED");
    expectNoExecution(result);
  });

  it("blocks raw command fields without echoing the command", async () => {
    const fixture = await readFixture("rejected-raw-command.json");
    const result = validateMcpConnectionProfile(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("COMMAND_FIELD_REJECTED");
    expect(serialized).not.toContain("node server.js");
    expectNoExecution(result);
  });

  it("blocks shell metacharacters in launch refs", async () => {
    const fixture = await readFixture("safe-stdio-fixed-profile.json");
    fixture.commandRef = "docs;rm";
    const result = validateMcpConnectionProfile(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("COMMANDREF_UNSAFE");
    expectNoExecution(result);
  });

  it("blocks secret markers without echoing fake values", async () => {
    const fixture = await readFixture("rejected-secret-marker.json");
    const result = validateMcpConnectionProfile(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("sk-fake1234567890");
    expectNoExecution(result);
  });

  it("blocks timeout and metadata limits that are too high", async () => {
    const fixture = await readFixture("safe-injected-profile.json");
    fixture.timeoutMs = 60000;
    fixture.maxMetadataBytes = 2000000;
    fixture.maxItems = 1000;
    const result = validateMcpConnectionProfile(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("TIMEOUT_MS_REJECTED");
    expect(findingCodes(result)).toContain("MAX_METADATA_BYTES_REJECTED");
    expect(findingCodes(result)).toContain("MAX_ITEMS_REJECTED");
    expectNoExecution(result);
  });

  it("blocks unknown transport kinds", async () => {
    const fixture = await readFixture("safe-injected-profile.json");
    fixture.transportKind = "http";
    const result = validateMcpConnectionProfile(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("TRANSPORT_KIND_REJECTED");
    expectNoExecution(result);
  });

  it("keeps output summary-only", async () => {
    const fixture = await readFixture("safe-stdio-fixed-profile.json");
    const result = validateMcpConnectionProfile(fixture);
    const serialized = JSON.stringify(result.summary);

    expect(result.status).toBe("parsed");
    expect(serialized).not.toContain("command-ref.docs-mcp");
    expect(serialized).not.toContain("argv-template.docs-mcp.readonly");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("rawPrompt");
    expectNoExecution(result);
  });
});
