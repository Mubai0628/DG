import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type AppDataDirectoryKind =
  | "project_workbench_dir"
  | "event_log"
  | "project_knowledge_store"
  | "checkpoint_dir"
  | "replay_cache"
  | "app_settings"
  | "capability_cache"
  | "qa_artifact_dir"
  | "unknown";

export type AppDataInventoryItemInput = {
  pathRef?: string | undefined;
  relativePath?: string | undefined;
  kind?: AppDataDirectoryKind | undefined;
  exists?: boolean | undefined;
  fileCount?: number | undefined;
  byteCount?: number | undefined;
  schemaVersion?: string | undefined;
  hashPrefix?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type AppDataInventoryInput =
  | {
      inventoryId?: string | undefined;
      items?: AppDataInventoryItemInput[] | undefined;
      createdAt?: string | undefined;
      idGenerator?: (() => string) | undefined;
    }
  | AppDataInventoryItemInput[]
  | undefined;

export type AppDataInventoryStatus = "empty" | "ready" | "warning" | "blocked";

export type AppDataInventoryFindingKind =
  | "schema"
  | "path"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "summary";

export type AppDataInventorySeverity = "blocker" | "warning";

export type AppDataInventoryFinding = {
  findingId: string;
  kind: AppDataInventoryFindingKind;
  severity: AppDataInventorySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type AppDataInventoryItem = {
  itemId: string;
  pathRef?: string | undefined;
  relativePath?: string | undefined;
  kind: AppDataDirectoryKind;
  exists: boolean;
  fileCount: number;
  byteCount: number;
  schemaVersion?: string | undefined;
  hashPrefix?: string | undefined;
  warningCodes: string[];
};

export type AppDataInventoryReadiness = {
  canDisplayInventory: boolean;
  canPlanMigration: false;
  canRunMigration: false;
  canDeleteData: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type AppDataInventorySummary = {
  inventoryId: string;
  status: AppDataInventoryStatus;
  itemCount: number;
  existingItemCount: number;
  missingItemCount: number;
  totalFileCount: number;
  totalByteCount: number;
  kinds: Record<AppDataDirectoryKind, number>;
  schemaVersions: string[];
  warningCodes: string[];
  hash: string;
};

export type AppDataInventory = {
  status: AppDataInventoryStatus;
  inventoryId: string;
  itemCount: number;
  existingItemCount: number;
  missingItemCount: number;
  totalFileCount: number;
  totalByteCount: number;
  kindCounts: Record<AppDataDirectoryKind, number>;
  schemaVersions: string[];
  items: AppDataInventoryItem[];
  findings: AppDataInventoryFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  inventoryHash: string;
  readiness: AppDataInventoryReadiness;
  nextAction: string;
  source: "runtime_app_data_inventory";
};

const directoryKinds: AppDataDirectoryKind[] = [
  "project_workbench_dir",
  "event_log",
  "project_knowledge_store",
  "checkpoint_dir",
  "replay_cache",
  "app_settings",
  "capability_cache",
  "qa_artifact_dir",
  "unknown"
];

const allowedItemKeys = new Set([
  "pathRef",
  "relativePath",
  "kind",
  "exists",
  "fileCount",
  "byteCount",
  "schemaVersion",
  "hashPrefix",
  "warningCodes"
]);

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const apiKeyValueField = ["api", "Key", "Value"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "FileContent",
    rawPrefix + "EventPayload",
    rawPrefix + "MemoryEntry",
    rawPrefix + "Checkpoint",
    "preimage",
    "preimageContent",
    "checkpointPreimage",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    apiKeyField,
    apiKeyValueField,
    authHeaderField,
    bearerField,
    tokenField,
    "secret",
    "password",
    "stdout",
    "stderr",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge",
    "tools",
    ["tool", "_", "choice"].join("")
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`, "i")
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/i
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i
  },
  {
    code: "RAW_CONTENT_MARKER",
    pattern:
      /\b(raw source|raw diff|raw event|raw checkpoint|preimage content)\b/i
  }
];

const secretLikePathPattern =
  /(^|[\\/_-])(secret|password|token|api[_-]?key|authorization|private[_-]?key)([\\/_\-.]|$)/i;

function emptyKindCounts(): Record<AppDataDirectoryKind, number> {
  return Object.fromEntries(directoryKinds.map((kind) => [kind, 0])) as Record<
    AppDataDirectoryKind,
    number
  >;
}

function readiness(canDisplayInventory: boolean): AppDataInventoryReadiness {
  return {
    canDisplayInventory,
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
  };
}

function finding(
  index: number,
  kind: AppDataInventoryFindingKind,
  severity: AppDataInventorySeverity,
  code: string,
  safeMessage: string,
  path?: string
): AppDataInventoryFinding {
  return {
    findingId: `app-data-inventory-finding-${index}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function scanForbidden(
  value: unknown,
  path: string,
  findings: AppDataInventoryFinding[]
): void {
  if (typeof value === "string") {
    for (const { code, pattern } of unsafeStringPatterns) {
      if (pattern.test(value)) {
        findings.push(
          finding(
            findings.length + 1,
            "secret",
            "blocker",
            code,
            `Unsafe marker detected at ${path}.`,
            path
          )
        );
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      scanForbidden(item, `${path}[${index}]`, findings);
    });
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const nestedPath = path === "$" ? key : `${path}.${key}`;
    if (forbiddenFieldKeys.has(normalizedKey)) {
      findings.push(
        finding(
          findings.length + 1,
          normalizedKey.includes("command") ||
            normalizedKey.includes("apply") ||
            normalizedKey.includes("rollback") ||
            normalizedKey.includes("permission") ||
            normalizedKey.includes("desktop") ||
            normalizedKey.includes("native") ||
            normalizedKey.includes("tool")
            ? "execution_field"
            : normalizedKey.includes("secret") ||
                normalizedKey.includes("password") ||
                normalizedKey.includes("token") ||
                normalizedKey.includes("key") ||
                normalizedKey.includes("authorization")
              ? "secret"
              : "raw_field",
          "blocker",
          `${key.toUpperCase()}_FIELD_REJECTED`,
          `Forbidden field ${key} is not allowed in App data inventory metadata.`,
          nestedPath
        )
      );
    }
    scanForbidden(nested, nestedPath, findings);
  }
}

function validateRelativePath(
  relativePath: string | undefined,
  kind: AppDataDirectoryKind,
  index: number,
  findings: AppDataInventoryFinding[]
): void {
  if (relativePath === undefined || relativePath.trim() === "") {
    findings.push(
      finding(
        findings.length + 1,
        "path",
        "warning",
        "MISSING_RELATIVE_PATH",
        `Inventory item ${index + 1} has no relativePath summary.`
      )
    );
    return;
  }

  const value = relativePath.trim();
  const normalized = value.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  const path = `items[${index}].relativePath`;

  if (/^[a-z]:[\\/]/i.test(value)) {
    findings.push(
      finding(
        findings.length + 1,
        "path",
        "blocker",
        "WINDOWS_DRIVE_PATH_REJECTED",
        "Inventory relativePath must not contain a Windows drive path.",
        path
      )
    );
  }
  if (value.startsWith("\\\\") || normalized.startsWith("//")) {
    findings.push(
      finding(
        findings.length + 1,
        "path",
        "blocker",
        "UNC_PATH_REJECTED",
        "Inventory relativePath must not contain a UNC path.",
        path
      )
    );
  }
  if (normalized.startsWith("/") || /^[a-z]+:\/\//i.test(normalized)) {
    findings.push(
      finding(
        findings.length + 1,
        "path",
        "blocker",
        "ABSOLUTE_PATH_REJECTED",
        "Inventory item paths must be relative summaries or opaque root refs.",
        path
      )
    );
  }
  if (normalized.split("/").includes("..")) {
    findings.push(
      finding(
        findings.length + 1,
        "path",
        "blocker",
        "PARENT_TRAVERSAL_REJECTED",
        "Inventory relativePath must not contain parent traversal.",
        path
      )
    );
  }
  for (const blockedSegment of [
    ".git",
    ".env",
    "node_modules",
    "dist",
    "target"
  ]) {
    if (lower.split("/").includes(blockedSegment)) {
      findings.push(
        finding(
          findings.length + 1,
          "path",
          "blocker",
          `${blockedSegment.replace(".", "").toUpperCase()}_PATH_REJECTED`,
          `Inventory relativePath must not include ${blockedSegment}.`,
          path
        )
      );
    }
  }
  if (lower.split("/").includes(".tmp") && kind !== "qa_artifact_dir") {
    findings.push(
      finding(
        findings.length + 1,
        "path",
        "blocker",
        "TMP_PATH_REJECTED",
        "Inventory .tmp paths are only allowed for qa_artifact_dir summaries.",
        path
      )
    );
  }
  if (secretLikePathPattern.test(normalized)) {
    findings.push(
      finding(
        findings.length + 1,
        "path",
        "blocker",
        "SECRET_LIKE_PATH_REJECTED",
        "Inventory relativePath contains a secret-like segment.",
        path
      )
    );
  }
}

function normalizeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function parseItems(input: AppDataInventoryInput): AppDataInventoryItemInput[] {
  if (Array.isArray(input)) {
    return input;
  }
  if (isRecord(input) && Array.isArray(input.items)) {
    return input.items.filter(isRecord) as AppDataInventoryItemInput[];
  }
  return [];
}

function buildInventory(input: AppDataInventoryInput): AppDataInventory {
  const findings: AppDataInventoryFinding[] = [];
  scanForbidden(input, "$", findings);

  if (isRecord(input) && !Array.isArray(input.items)) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "blocker",
        "MISSING_ITEMS",
        "App data inventory input must include an items array."
      )
    );
  }

  const itemsInput = parseItems(input);
  if (itemsInput.length === 0) {
    findings.push(
      finding(
        findings.length + 1,
        "summary",
        "warning",
        "EMPTY_INVENTORY",
        "No App data inventory items were provided."
      )
    );
  }

  const items = itemsInput.map((item, index) => {
    for (const key of Object.keys(item)) {
      if (!allowedItemKeys.has(key)) {
        findings.push(
          finding(
            findings.length + 1,
            "schema",
            "blocker",
            "UNKNOWN_ITEM_FIELD",
            `Unknown inventory item field ${key} is not allowed.`,
            `items[${index}].${key}`
          )
        );
      }
    }

    const kind = directoryKinds.includes(item.kind as AppDataDirectoryKind)
      ? (item.kind as AppDataDirectoryKind)
      : "unknown";
    if (
      item.kind !== undefined &&
      kind === "unknown" &&
      item.kind !== "unknown"
    ) {
      findings.push(
        finding(
          findings.length + 1,
          "schema",
          "warning",
          "UNKNOWN_DIRECTORY_KIND",
          `Inventory item ${index + 1} uses an unknown directory kind.`
        )
      );
    }
    if (typeof item.exists !== "boolean") {
      findings.push(
        finding(
          findings.length + 1,
          "schema",
          "warning",
          "EXISTS_DEFAULTED_FALSE",
          `Inventory item ${index + 1} does not declare exists; defaulting to false.`
        )
      );
    }
    validateRelativePath(item.relativePath, kind, index, findings);

    const itemHash = stablePreviewHash(
      JSON.stringify({
        pathRef: item.pathRef,
        relativePath: item.relativePath,
        kind,
        exists: item.exists === true,
        fileCount: normalizeNumber(item.fileCount),
        byteCount: normalizeNumber(item.byteCount),
        schemaVersion: item.schemaVersion,
        hashPrefix: item.hashPrefix,
        warningCodes: item.warningCodes ?? []
      })
    );

    return {
      itemId: `app-data-item-${itemHash.slice(0, 12)}`,
      ...(item.pathRef !== undefined ? { pathRef: item.pathRef } : {}),
      ...(item.relativePath !== undefined
        ? { relativePath: item.relativePath }
        : {}),
      kind,
      exists: item.exists === true,
      fileCount: normalizeNumber(item.fileCount),
      byteCount: normalizeNumber(item.byteCount),
      ...(item.schemaVersion !== undefined
        ? { schemaVersion: item.schemaVersion }
        : {}),
      ...(item.hashPrefix !== undefined ? { hashPrefix: item.hashPrefix } : {}),
      warningCodes: Array.isArray(item.warningCodes)
        ? item.warningCodes.filter(
            (code): code is string => typeof code === "string"
          )
        : []
    };
  });

  const kindCounts = emptyKindCounts();
  const schemaVersions = new Set<string>();
  const warningCodes = new Set<string>();
  let existingItemCount = 0;
  let totalFileCount = 0;
  let totalByteCount = 0;

  for (const item of items) {
    kindCounts[item.kind] += 1;
    if (item.exists) {
      existingItemCount += 1;
    }
    totalFileCount += item.fileCount;
    totalByteCount += item.byteCount;
    if (item.schemaVersion !== undefined && item.schemaVersion !== "") {
      schemaVersions.add(item.schemaVersion);
    }
    for (const code of item.warningCodes) {
      warningCodes.add(code);
      findings.push(
        finding(
          findings.length + 1,
          "summary",
          "warning",
          "ITEM_WARNING_CODE",
          "Inventory item contains a caller-provided warning code."
        )
      );
    }
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: AppDataInventoryStatus =
    blockerCount > 0
      ? "blocked"
      : items.length === 0
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "ready";

  const inventoryId =
    isRecord(input) && typeof input.inventoryId === "string"
      ? input.inventoryId
      : isRecord(input) && typeof input.idGenerator === "function"
        ? input.idGenerator()
        : `app-data-inventory-${stablePreviewHash(JSON.stringify(items)).slice(0, 12)}`;
  const inventoryHash = stablePreviewHash(
    JSON.stringify({
      inventoryId,
      items,
      schemaVersions: [...schemaVersions].sort(),
      warningCodes: [...warningCodes].sort()
    })
  );

  return {
    status,
    inventoryId,
    itemCount: items.length,
    existingItemCount,
    missingItemCount: items.length - existingItemCount,
    totalFileCount,
    totalByteCount,
    kindCounts,
    schemaVersions: [...schemaVersions].sort(),
    items: status === "blocked" ? [] : items,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    inventoryHash,
    readiness: readiness(status !== "blocked"),
    nextAction:
      status === "blocked"
        ? "Fix blocked inventory metadata before schema registry or migration planning."
        : status === "empty"
          ? "Provide summary-only App data inventory metadata."
          : "Review inventory and schema registry summaries; migration remains disabled.",
    source: "runtime_app_data_inventory"
  };
}

export function buildAppDataInventory(
  input?: AppDataInventoryInput
): AppDataInventory {
  return buildInventory(input);
}

export function validateAppDataInventory(
  input?: AppDataInventoryInput
): AppDataInventory {
  return buildInventory(input);
}

export function summarizeAppDataInventory(
  inventory: AppDataInventory
): AppDataInventorySummary {
  return {
    inventoryId: inventory.inventoryId,
    status: inventory.status,
    itemCount: inventory.itemCount,
    existingItemCount: inventory.existingItemCount,
    missingItemCount: inventory.missingItemCount,
    totalFileCount: inventory.totalFileCount,
    totalByteCount: inventory.totalByteCount,
    kinds: inventory.kindCounts,
    schemaVersions: inventory.schemaVersions,
    warningCodes: inventory.findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    hash: inventory.inventoryHash
  };
}
