import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  parseSkillManifest,
  summarizeSkillManifest,
  validateSkillManifest,
  type SkillManifestValidationResult
} from "../src/index.js";

const fixtureRoot = new URL("./fixtures/skill-manifests/", import.meta.url);

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

function findingCodes(result: SkillManifestValidationResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: SkillManifestValidationResult): void {
  expect(result.readiness).toMatchObject({
    canExecuteSkill: false,
    canRunSkillRuntime: false,
    canInvokeCapability: false,
    canInvokeMcpTool: false,
    canExecutePlugin: false,
    canWriteFilesystem: false,
    canUseNetwork: false,
    canUseNativeBridge: false,
    canUseDesktopAction: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("skill manifest schema", () => {
  it("parses safe docs skill metadata", async () => {
    const fixture = await readFixture("safe-docs-skill.json");
    const result = validateSkillManifest(fixture);

    expect(result.status).toBe("parsed");
    expect(result.skillId).toBe("skill.docs.review");
    expect(result.stepCount).toBe(1);
    expect(result.requiredCapabilityCount).toBe(1);
    expect(result.riskLevel).toBe("low");
    expect(result.readiness.canRegisterMetadata).toBe(true);
    expect(result.source).toBe("runtime_skill_manifest_schema");
    expectNoExecution(result);
  });

  it("parses JSON string input and summarizes manifest", async () => {
    const fixture = await readFixture("safe-docs-skill.json");
    const result = parseSkillManifest(JSON.stringify(fixture));

    expect(result.status).toBe("parsed");
    expect(result.manifest).toBeDefined();
    const summary = summarizeSkillManifest(result.manifest!);
    expect(summary.skillId).toBe("skill.docs.review");
    expect(summary.stepCount).toBe(1);
    expectNoExecution(result);
  });

  it("warns for missing metadata sections without enabling execution", async () => {
    const fixture = await readFixture("warning-empty-skill.json");
    const result = validateSkillManifest(fixture);

    expect(result.status).toBe("warning");
    expect(findingCodes(result)).toContain("MISSING_STEPS");
    expect(findingCodes(result)).toContain("MISSING_RISK_NOTES");
    expect(result.readiness.canRegisterMetadata).toBe(true);
    expectNoExecution(result);
  });

  it("blocks missing required fields", () => {
    const result = validateSkillManifest({
      schemaVersion: "skill_manifest.v1"
    });

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("MISSING_SKILL_ID");
    expect(findingCodes(result)).toContain("MISSING_NAME");
    expect(findingCodes(result)).toContain("MISSING_VERSION");
    expectNoExecution(result);
  });

  it("blocks unsafe IDs and duplicate steps", async () => {
    const unsafe = await readFixture("safe-docs-skill.json");
    unsafe.skillId = "../bad";
    const duplicate = await readFixture("duplicate-step.json");

    const unsafeResult = validateSkillManifest(unsafe);
    const duplicateResult = validateSkillManifest(duplicate);

    expect(unsafeResult.status).toBe("blocked");
    expect(duplicateResult.status).toBe("blocked");
    expect(findingCodes(unsafeResult)).toContain("UNSAFE_SKILL_ID");
    expect(findingCodes(duplicateResult)).toContain("DUPLICATE_STEP_ID");
    expectNoExecution(unsafeResult);
  });

  it("blocks execution and mutation claims in steps", async () => {
    const execution = await readFixture("blocked-execution-step.json");
    const mutation = await readFixture("safe-docs-skill.json");
    (mutation.steps as Record<string, unknown>[])[0]!.summary =
      "Apply a patch to a workspace file.";

    const executionResult = validateSkillManifest(execution);
    const mutationResult = validateSkillManifest(mutation);

    expect(executionResult.status).toBe("blocked");
    expect(mutationResult.status).toBe("blocked");
    expect(findingCodes(executionResult)).toContain(
      "STEP_EXECUTION_CLAIM_REJECTED"
    );
    expect(findingCodes(mutationResult)).toContain(
      "STEP_MUTATION_CLAIM_REJECTED"
    );
    expectNoExecution(executionResult);
  });

  it("blocks high-risk capability without manual-only preview mode", async () => {
    const fixture = await readFixture("blocked-high-risk-capability.json");
    const result = validateSkillManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain(
      "HIGH_RISK_CAPABILITY_POLICY_REJECTED"
    );
    expectNoExecution(result);
  });

  it("allows high-risk capability only as manual-only preview metadata", async () => {
    const fixture = await readFixture("blocked-high-risk-capability.json");
    (
      fixture.requiredCapabilities as Record<string, unknown>[]
    )[0]!.invocationPolicy = "manual_only_preview";
    const result = validateSkillManifest(fixture);

    expect(result.status).toBe("parsed");
    expect(result.riskLevel).toBe("high");
    expectNoExecution(result);
  });

  it("blocks raw prompt/source/diff fields and secret markers", async () => {
    const rawPrompt = await readFixture("blocked-raw-prompt.json");
    const secret = await readFixture("blocked-secret-marker.json");
    const rawSource = await readFixture("safe-docs-skill.json");
    rawSource.rawSource = "Synthetic raw source.";
    rawSource.rawDiff = "Synthetic raw diff.";

    const rawPromptResult = validateSkillManifest(rawPrompt);
    const secretResult = validateSkillManifest(secret);
    const rawSourceResult = validateSkillManifest(rawSource);
    const serialized = JSON.stringify({
      rawPromptResult,
      secretResult,
      rawSourceResult
    });

    expect(rawPromptResult.status).toBe("blocked");
    expect(secretResult.status).toBe("blocked");
    expect(rawSourceResult.status).toBe("blocked");
    expect(findingCodes(rawPromptResult)).toContain(
      "RAW_PROMPT_FIELD_REJECTED"
    );
    expect(findingCodes(secretResult)).toContain("SECRET_MARKER_REJECTED");
    expect(findingCodes(rawSourceResult)).toContain(
      "RAW_SOURCE_FIELD_REJECTED"
    );
    expect(findingCodes(rawSourceResult)).toContain("RAW_DIFF_FIELD_REJECTED");
    expect(serialized).not.toContain("Synthetic raw prompt content.");
    expect(serialized).not.toContain("sk-fakeskill000000");
    expectNoExecution(rawPromptResult);
  });

  it("blocks forbidden execution fields and lifecycle scripts", async () => {
    const fixture = await readFixture("safe-docs-skill.json");
    fixture.shellCommand = "echo blocked";
    fixture.postinstall = "node install.js";
    fixture.mcpToolInvocation = { tool: "blocked" };
    fixture.pluginExecutionRequest = true;
    const result = validateSkillManifest(fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SHELL_COMMAND_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("POSTINSTALL_FIELD_REJECTED");
    expect(findingCodes(result)).toContain(
      "MCP_TOOL_INVOCATION_FIELD_REJECTED"
    );
    expect(findingCodes(result)).toContain(
      "PLUGIN_EXECUTION_REQUEST_FIELD_REJECTED"
    );
    expect(serialized).not.toContain("echo blocked");
    expectNoExecution(result);
  });

  it("blocks readiness flags that attempt execution", async () => {
    const fixture = await readFixture("safe-docs-skill.json");
    fixture.readiness = { canExecuteSkill: true };
    const result = validateSkillManifest(fixture);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("EXECUTION_READINESS_REJECTED");
    expectNoExecution(result);
  });
});
