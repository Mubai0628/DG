import {
  buildAppDataInventory,
  buildSchemaVersionRegistry,
  summarizeAppDataInventory,
  summarizeSchemaVersionRegistry,
  type AppDataInventory,
  type AppDataInventoryInput,
  type SchemaVersionRegistry,
  type SchemaVersionRegistryInput
} from "../../runtime/src/platform/index.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type AppDataInventorySchemaViewStatus =
  | "empty"
  | "ready"
  | "warning"
  | "blocked";

export type AppDataInventorySchemaView = {
  status: AppDataInventorySchemaViewStatus;
  source: "app_data_inventory_schema_registry";
  inventoryId: string;
  registryId: string;
  itemCount: number;
  existingItemCount: number;
  missingItemCount: number;
  schemaVersionCount: number;
  compatibleSchemaCount: number;
  upgradeAvailableCount: number;
  unknownSchemaCount: number;
  incompatibleSchemaCount: number;
  blockerCount: number;
  warningCount: number;
  inventoryHashPrefix: string;
  registryHashPrefix: string;
  warningCodes: string[];
  readiness: {
    canDisplayInventory: boolean;
    canDisplaySchemaRegistry: boolean;
    canPlanMigration: false;
    canRunMigration: false;
    canDeleteData: false;
    canWriteFilesystem: false;
    canWriteEventStore: false;
    appCanExecute: false;
  };
  nextAction: string;
  inventorySummary: ReturnType<typeof summarizeAppDataInventory>;
  registrySummary: ReturnType<typeof summarizeSchemaVersionRegistry>;
};

export type AppDataInventorySchemaViewInput = {
  inventory?: AppDataInventoryInput | undefined;
  schemaRegistry?: SchemaVersionRegistryInput | undefined;
};

export function buildAppDataInventorySchemaView(
  input: AppDataInventorySchemaViewInput = {}
): AppDataInventorySchemaView {
  const inventory = buildAppDataInventory(input.inventory);
  const registry = buildSchemaVersionRegistry(input.schemaRegistry);
  const blockerCount = inventory.blockerCount + registry.blockerCount;
  const warningCount = inventory.warningCount + registry.warningCount;
  const status = mergeStatus(inventory, registry, blockerCount, warningCount);
  const inventorySummary = summarizeAppDataInventory(inventory);
  const registrySummary = summarizeSchemaVersionRegistry(registry);

  return {
    status,
    source: "app_data_inventory_schema_registry",
    inventoryId: safeText(inventory.inventoryId, "app-data-inventory"),
    registryId: safeText(registry.registryId, "schema-version-registry"),
    itemCount: inventory.itemCount,
    existingItemCount: inventory.existingItemCount,
    missingItemCount: inventory.missingItemCount,
    schemaVersionCount: registry.schemaVersions.length,
    compatibleSchemaCount: registry.compatibleCount,
    upgradeAvailableCount: registry.upgradeAvailableCount,
    unknownSchemaCount: registry.unknownSchemaCount,
    incompatibleSchemaCount: registry.incompatibleCount,
    blockerCount,
    warningCount,
    inventoryHashPrefix: inventory.inventoryHash.slice(0, 12),
    registryHashPrefix: registry.registryHash.slice(0, 12),
    warningCodes: [
      ...inventory.findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => safeText(finding.code, "INVENTORY_WARNING")),
      ...registry.findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => safeText(finding.code, "SCHEMA_WARNING"))
    ],
    readiness: {
      canDisplayInventory: inventory.readiness.canDisplayInventory,
      canDisplaySchemaRegistry: registry.readiness.canDisplaySchemaRegistry,
      canPlanMigration: false,
      canRunMigration: false,
      canDeleteData: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    nextAction: safeErrorMessage(
      status === "blocked"
        ? "Fix blocked inventory or schema metadata before future migration planning."
        : status === "empty"
          ? "Provide summary-only data directory and schema metadata when the future inventory reader exists."
          : "Review read-only inventory and schema summaries; migration remains disabled."
    ),
    inventorySummary,
    registrySummary
  };
}

export function summarizeAppDataInventorySchemaView(
  view: AppDataInventorySchemaView
): Pick<
  AppDataInventorySchemaView,
  | "status"
  | "itemCount"
  | "schemaVersionCount"
  | "compatibleSchemaCount"
  | "unknownSchemaCount"
  | "blockerCount"
  | "warningCount"
  | "inventoryHashPrefix"
  | "registryHashPrefix"
  | "nextAction"
> {
  return {
    status: view.status,
    itemCount: view.itemCount,
    schemaVersionCount: view.schemaVersionCount,
    compatibleSchemaCount: view.compatibleSchemaCount,
    unknownSchemaCount: view.unknownSchemaCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    inventoryHashPrefix: view.inventoryHashPrefix,
    registryHashPrefix: view.registryHashPrefix,
    nextAction: view.nextAction
  };
}

function mergeStatus(
  inventory: AppDataInventory,
  registry: SchemaVersionRegistry,
  blockerCount: number,
  warningCount: number
): AppDataInventorySchemaViewStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (inventory.status === "empty" && registry.status === "empty") {
    return "empty";
  }
  if (
    warningCount > 0 ||
    inventory.status === "empty" ||
    registry.status === "empty"
  ) {
    return "warning";
  }
  return "ready";
}
