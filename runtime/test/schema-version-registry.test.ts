import { describe, expect, it } from "vitest";

import {
  buildSchemaVersionRegistry,
  summarizeSchemaVersionRegistry,
  validateSchemaVersionRegistry,
  type SchemaVersionRegistry,
  type SchemaVersionRegistryInput
} from "../src/index.js";

function safeRegistryInput() {
  return {
    registryId: "schema-registry-safe",
    entries: [
      {
        componentId: "event_log",
        schemaVersion: "event_log.v1",
        supportedVersions: ["event_log.v1"],
        latestKnownVersion: "event_log.v1"
      },
      {
        componentId: "project_knowledge_store",
        schemaVersion: "project_knowledge.v1",
        supportedVersions: ["project_knowledge.v1"],
        latestKnownVersion: "project_knowledge.v2"
      }
    ]
  };
}

function findingCodes(result: SchemaVersionRegistry): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: SchemaVersionRegistry): void {
  expect(result.readiness).toMatchObject({
    canPlanMigration: false,
    canRunMigration: false,
    canDeleteData: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("schema version registry", () => {
  it("detects schema compatibility from summary metadata", () => {
    const result = buildSchemaVersionRegistry(safeRegistryInput());
    const summary = summarizeSchemaVersionRegistry(result);

    expect(result.status).toBe("ready");
    expect(result.entryCount).toBe(2);
    expect(result.compatibleCount).toBe(1);
    expect(result.upgradeAvailableCount).toBe(1);
    expect(result.unknownSchemaCount).toBe(0);
    expect(summary.schemaVersions).toContain("event_log.v1");
    expectNoExecution(result);
  });

  it("warns on unknown schema without enabling migration", () => {
    const result = validateSchemaVersionRegistry({
      entries: [
        {
          componentId: "replay_cache",
          schemaVersion: "unknown",
          supportedVersions: []
        }
      ]
    });

    expect(result.status).toBe("warning");
    expect(result.unknownSchemaCount).toBe(1);
    expect(findingCodes(result)).toContain("UNKNOWN_SCHEMA_VERSION");
    expect(findingCodes(result)).toContain("UNKNOWN_SCHEMA_COMPATIBILITY");
    expectNoExecution(result);
  });

  it("blocks incompatible schemas and duplicate components", () => {
    const result = validateSchemaVersionRegistry({
      entries: [
        {
          componentId: "event_log",
          schemaVersion: "event_log.v9",
          supportedVersions: ["event_log.v1"]
        },
        {
          componentId: "event_log",
          schemaVersion: "event_log.v1",
          supportedVersions: ["event_log.v1"]
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.entries).toHaveLength(0);
    expect(findingCodes(result)).toContain("INCOMPATIBLE_SCHEMA_VERSION");
    expect(findingCodes(result)).toContain("DUPLICATE_SCHEMA_COMPONENT");
    expectNoExecution(result);
  });

  it("blocks raw fields and secret markers", () => {
    const result = validateSchemaVersionRegistry({
      entries: [
        {
          componentId: "event_log",
          schemaVersion: "event_log.v1",
          supportedVersions: ["event_log.v1"],
          rawEventPayload: "raw event payload",
          warningCodes: ["Bearer fake-test-token"]
        }
      ]
    } as unknown as SchemaVersionRegistryInput);
    const output = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAWEVENTPAYLOAD_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("UNKNOWN_ENTRY_FIELD");
    expect(findingCodes(result)).toContain("BEARER_TOKEN_MARKER");
    expect(output).not.toContain("fake-test-token");
    expectNoExecution(result);
  });

  it("keeps deterministic registry ids and hashes with injected id", () => {
    const first = buildSchemaVersionRegistry({
      ...safeRegistryInput(),
      registryId: undefined,
      idGenerator: () => "schema-registry-generated"
    });
    const second = buildSchemaVersionRegistry({
      ...safeRegistryInput(),
      registryId: undefined,
      idGenerator: () => "schema-registry-generated"
    });

    expect(first.registryId).toBe("schema-registry-generated");
    expect(first.registryHash).toBe(second.registryHash);
    expectNoExecution(first);
  });
});
