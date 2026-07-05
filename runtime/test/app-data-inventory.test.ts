import { describe, expect, it } from "vitest";

import {
  buildAppDataInventory,
  summarizeAppDataInventory,
  validateAppDataInventory,
  type AppDataInventory,
  type AppDataInventoryInput
} from "../src/index.js";

function safeInventoryInput() {
  return {
    inventoryId: "inventory-safe",
    items: [
      {
        pathRef: "app_data_root_ref",
        relativePath: "events",
        kind: "event_log" as const,
        exists: true,
        fileCount: 1,
        byteCount: 128,
        schemaVersion: "event_log.v1",
        hashPrefix: "events-hash"
      },
      {
        pathRef: "project_knowledge_ref",
        relativePath: "project-knowledge",
        kind: "project_knowledge_store" as const,
        exists: true,
        fileCount: 2,
        byteCount: 256,
        schemaVersion: "project_knowledge.v1",
        hashPrefix: "knowledge-hash"
      },
      {
        pathRef: "qa_artifact_ref",
        relativePath: ".tmp/qa",
        kind: "qa_artifact_dir" as const,
        exists: false,
        fileCount: 0,
        byteCount: 0,
        schemaVersion: "qa_artifact.v1",
        hashPrefix: "qa-hash"
      }
    ]
  };
}

function findingCodes(result: AppDataInventory): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: AppDataInventory): void {
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

describe("app data inventory", () => {
  it("parses safe summary-only inventory metadata", () => {
    const result = buildAppDataInventory(safeInventoryInput());
    const summary = summarizeAppDataInventory(result);

    expect(result.status).toBe("ready");
    expect(result.itemCount).toBe(3);
    expect(result.existingItemCount).toBe(2);
    expect(result.totalFileCount).toBe(3);
    expect(result.totalByteCount).toBe(384);
    expect(result.kindCounts.event_log).toBe(1);
    expect(summary.schemaVersions).toContain("event_log.v1");
    expect(result.items[0]?.itemId).toMatch(/^app-data-item-/);
    expectNoExecution(result);
  });

  it("warns for empty or incomplete summary metadata without enabling migration", () => {
    const result = validateAppDataInventory({ items: [{}] });

    expect(result.status).toBe("warning");
    expect(findingCodes(result)).toContain("EXISTS_DEFAULTED_FALSE");
    expect(findingCodes(result)).toContain("MISSING_RELATIVE_PATH");
    expect(result.readiness.canDisplayInventory).toBe(true);
    expectNoExecution(result);
  });

  it("blocks unsafe paths before producing item summaries", () => {
    const result = validateAppDataInventory({
      items: [
        {
          relativePath: "../events",
          kind: "event_log",
          exists: true
        },
        {
          relativePath: "C:\\Users\\demo\\events",
          kind: "event_log",
          exists: true
        },
        {
          relativePath: "node_modules/cache",
          kind: "capability_cache",
          exists: true
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.items).toHaveLength(0);
    expect(findingCodes(result)).toContain("PARENT_TRAVERSAL_REJECTED");
    expect(findingCodes(result)).toContain("WINDOWS_DRIVE_PATH_REJECTED");
    expect(findingCodes(result)).toContain("NODE_MODULES_PATH_REJECTED");
    expectNoExecution(result);
  });

  it("blocks raw content and checkpoint preimage fields", () => {
    const result = validateAppDataInventory({
      items: [
        {
          relativePath: "checkpoints",
          kind: "checkpoint_dir",
          exists: true,
          preimageContent: "raw checkpoint bytes"
        }
      ]
    } as unknown as AppDataInventoryInput);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("PREIMAGECONTENT_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("UNKNOWN_ITEM_FIELD");
    expectNoExecution(result);
  });

  it("blocks secret markers without echoing the value", () => {
    const result = validateAppDataInventory({
      items: [
        {
          relativePath: "events",
          kind: "event_log",
          exists: true,
          hashPrefix: "Bearer fake-test-token"
        }
      ]
    });
    const output = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("BEARER_TOKEN_MARKER");
    expect(output).not.toContain("fake-test-token");
    expectNoExecution(result);
  });

  it("keeps deterministic inventory ids and hashes with injected id", () => {
    const first = buildAppDataInventory({
      ...safeInventoryInput(),
      inventoryId: undefined,
      idGenerator: () => "inventory-generated"
    });
    const second = buildAppDataInventory({
      ...safeInventoryInput(),
      inventoryId: undefined,
      idGenerator: () => "inventory-generated"
    });

    expect(first.inventoryId).toBe("inventory-generated");
    expect(first.inventoryHash).toBe(second.inventoryHash);
    expectNoExecution(first);
  });
});
