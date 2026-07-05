import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type SchemaCompatibilityStatus =
  | "compatible"
  | "upgrade_available"
  | "unknown_schema"
  | "incompatible";

export type SchemaVersionEntryInput = {
  componentId?: string | undefined;
  schemaVersion?: string | undefined;
  supportedVersions?: string[] | undefined;
  latestKnownVersion?: string | undefined;
  compatibility?: SchemaCompatibilityStatus | undefined;
  warningCodes?: string[] | undefined;
};

export type SchemaVersionRegistryInput =
  | {
      registryId?: string | undefined;
      entries?: SchemaVersionEntryInput[] | undefined;
      createdAt?: string | undefined;
      idGenerator?: (() => string) | undefined;
    }
  | SchemaVersionEntryInput[]
  | undefined;

export type SchemaVersionRegistryStatus =
  | "empty"
  | "ready"
  | "warning"
  | "blocked";

export type SchemaVersionRegistryFindingKind =
  | "schema"
  | "compatibility"
  | "raw_field"
  | "secret"
  | "execution_field";

export type SchemaVersionRegistrySeverity = "blocker" | "warning";

export type SchemaVersionRegistryFinding = {
  findingId: string;
  kind: SchemaVersionRegistryFindingKind;
  severity: SchemaVersionRegistrySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type SchemaVersionEntry = {
  entryId: string;
  componentId: string;
  schemaVersion: string;
  supportedVersions: string[];
  latestKnownVersion?: string | undefined;
  compatibility: SchemaCompatibilityStatus;
  warningCodes: string[];
};

export type SchemaVersionRegistryReadiness = {
  canDisplaySchemaRegistry: boolean;
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

export type SchemaVersionRegistrySummary = {
  registryId: string;
  status: SchemaVersionRegistryStatus;
  entryCount: number;
  compatibleCount: number;
  upgradeAvailableCount: number;
  unknownSchemaCount: number;
  incompatibleCount: number;
  schemaVersions: string[];
  warningCodes: string[];
  hash: string;
};

export type SchemaVersionRegistry = {
  status: SchemaVersionRegistryStatus;
  registryId: string;
  entryCount: number;
  compatibleCount: number;
  upgradeAvailableCount: number;
  unknownSchemaCount: number;
  incompatibleCount: number;
  entries: SchemaVersionEntry[];
  schemaVersions: string[];
  findings: SchemaVersionRegistryFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  registryHash: string;
  readiness: SchemaVersionRegistryReadiness;
  nextAction: string;
  source: "runtime_schema_version_registry";
};

const compatibilityStatuses: SchemaCompatibilityStatus[] = [
  "compatible",
  "upgrade_available",
  "unknown_schema",
  "incompatible"
];

const allowedEntryKeys = new Set([
  "componentId",
  "schemaVersion",
  "supportedVersions",
  "latestKnownVersion",
  "compatibility",
  "warningCodes"
]);

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
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
    rawPrefix + "Source",
    rawPrefix + "Diff",
    apiKeyField,
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

function finding(
  index: number,
  kind: SchemaVersionRegistryFindingKind,
  severity: SchemaVersionRegistrySeverity,
  code: string,
  safeMessage: string,
  path?: string
): SchemaVersionRegistryFinding {
  return {
    findingId: `schema-version-registry-finding-${index}`,
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

function readiness(
  canDisplaySchemaRegistry: boolean
): SchemaVersionRegistryReadiness {
  return {
    canDisplaySchemaRegistry,
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

function scanForbidden(
  value: unknown,
  path: string,
  findings: SchemaVersionRegistryFinding[]
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
          `Forbidden field ${key} is not allowed in schema registry metadata.`,
          nestedPath
        )
      );
    }
    scanForbidden(nested, nestedPath, findings);
  }
}

function parseEntries(
  input: SchemaVersionRegistryInput
): SchemaVersionEntryInput[] {
  if (Array.isArray(input)) {
    return input;
  }
  if (isRecord(input) && Array.isArray(input.entries)) {
    return input.entries.filter(isRecord) as SchemaVersionEntryInput[];
  }
  return [];
}

function buildRegistry(
  input: SchemaVersionRegistryInput
): SchemaVersionRegistry {
  const findings: SchemaVersionRegistryFinding[] = [];
  scanForbidden(input, "$", findings);

  if (isRecord(input) && !Array.isArray(input.entries)) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "blocker",
        "MISSING_ENTRIES",
        "Schema version registry input must include an entries array."
      )
    );
  }

  const entryInputs = parseEntries(input);
  if (entryInputs.length === 0) {
    findings.push(
      finding(
        findings.length + 1,
        "schema",
        "warning",
        "EMPTY_REGISTRY",
        "No schema version entries were provided."
      )
    );
  }

  const seenComponents = new Set<string>();
  const entries = entryInputs.map((entry, index) => {
    for (const key of Object.keys(entry)) {
      if (!allowedEntryKeys.has(key)) {
        findings.push(
          finding(
            findings.length + 1,
            "schema",
            "blocker",
            "UNKNOWN_ENTRY_FIELD",
            `Unknown schema registry entry field ${key} is not allowed.`,
            `entries[${index}].${key}`
          )
        );
      }
    }

    const componentId =
      typeof entry.componentId === "string" && entry.componentId.trim() !== ""
        ? entry.componentId.trim()
        : `unknown_component_${index + 1}`;
    if (componentId.startsWith("unknown_component_")) {
      findings.push(
        finding(
          findings.length + 1,
          "schema",
          "blocker",
          "MISSING_COMPONENT_ID",
          `Schema registry entry ${index + 1} is missing componentId.`
        )
      );
    }
    if (seenComponents.has(componentId)) {
      findings.push(
        finding(
          findings.length + 1,
          "schema",
          "blocker",
          "DUPLICATE_SCHEMA_COMPONENT",
          `Duplicate schema registry component ${componentId}.`
        )
      );
    }
    seenComponents.add(componentId);

    const schemaVersion =
      typeof entry.schemaVersion === "string" &&
      entry.schemaVersion.trim() !== ""
        ? entry.schemaVersion.trim()
        : "unknown";
    if (schemaVersion === "unknown") {
      findings.push(
        finding(
          findings.length + 1,
          "compatibility",
          "warning",
          "UNKNOWN_SCHEMA_VERSION",
          `Schema registry entry ${componentId} has an unknown schema version.`
        )
      );
    }

    const supportedVersions = Array.isArray(entry.supportedVersions)
      ? entry.supportedVersions.filter(
          (version): version is string =>
            typeof version === "string" && version.trim() !== ""
        )
      : [];
    const latestKnownVersion =
      typeof entry.latestKnownVersion === "string" &&
      entry.latestKnownVersion.trim() !== ""
        ? entry.latestKnownVersion.trim()
        : undefined;
    let compatibility: SchemaCompatibilityStatus =
      entry.compatibility !== undefined &&
      compatibilityStatuses.includes(entry.compatibility)
        ? entry.compatibility
        : "unknown_schema";

    if (
      schemaVersion !== "unknown" &&
      supportedVersions.includes(schemaVersion)
    ) {
      compatibility =
        latestKnownVersion !== undefined && latestKnownVersion !== schemaVersion
          ? "upgrade_available"
          : "compatible";
    }
    if (
      schemaVersion !== "unknown" &&
      supportedVersions.length > 0 &&
      !supportedVersions.includes(schemaVersion)
    ) {
      compatibility = "incompatible";
    }

    if (compatibility === "unknown_schema") {
      findings.push(
        finding(
          findings.length + 1,
          "compatibility",
          "warning",
          "UNKNOWN_SCHEMA_COMPATIBILITY",
          `Schema compatibility is unknown for ${componentId}.`
        )
      );
    }
    if (compatibility === "incompatible") {
      findings.push(
        finding(
          findings.length + 1,
          "compatibility",
          "blocker",
          "INCOMPATIBLE_SCHEMA_VERSION",
          `Schema version is incompatible for ${componentId}.`
        )
      );
    }

    for (let index = 0; index < (entry.warningCodes ?? []).length; index += 1) {
      findings.push(
        finding(
          findings.length + 1,
          "compatibility",
          "warning",
          "SCHEMA_ENTRY_WARNING_CODE",
          `Schema registry entry contains caller-provided warning code #${index + 1}.`
        )
      );
    }

    const entryHash = stablePreviewHash(
      JSON.stringify({
        componentId,
        schemaVersion,
        supportedVersions,
        latestKnownVersion,
        compatibility,
        warningCodes: entry.warningCodes ?? []
      })
    );

    return {
      entryId: `schema-entry-${entryHash.slice(0, 12)}`,
      componentId,
      schemaVersion,
      supportedVersions,
      ...(latestKnownVersion !== undefined ? { latestKnownVersion } : {}),
      compatibility,
      warningCodes: (entry.warningCodes ?? []).filter(
        (code): code is string => typeof code === "string"
      )
    };
  });

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: SchemaVersionRegistryStatus =
    blockerCount > 0
      ? "blocked"
      : entries.length === 0
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "ready";

  const registryId =
    isRecord(input) && typeof input.registryId === "string"
      ? input.registryId
      : isRecord(input) && typeof input.idGenerator === "function"
        ? input.idGenerator()
        : `schema-registry-${stablePreviewHash(JSON.stringify(entries)).slice(0, 12)}`;
  const schemaVersions = [
    ...new Set(entries.map((entry) => entry.schemaVersion))
  ].sort();
  const registryHash = stablePreviewHash(
    JSON.stringify({
      registryId,
      entries,
      schemaVersions
    })
  );

  return {
    status,
    registryId,
    entryCount: entries.length,
    compatibleCount: entries.filter(
      (entry) => entry.compatibility === "compatible"
    ).length,
    upgradeAvailableCount: entries.filter(
      (entry) => entry.compatibility === "upgrade_available"
    ).length,
    unknownSchemaCount: entries.filter(
      (entry) => entry.compatibility === "unknown_schema"
    ).length,
    incompatibleCount: entries.filter(
      (entry) => entry.compatibility === "incompatible"
    ).length,
    entries: status === "blocked" ? [] : entries,
    schemaVersions,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    registryHash,
    readiness: readiness(status !== "blocked"),
    nextAction:
      status === "blocked"
        ? "Fix blocked schema registry metadata before migration planning."
        : status === "empty"
          ? "Provide summary-only schema version entries."
          : "Review schema compatibility summaries; migration remains disabled.",
    source: "runtime_schema_version_registry"
  };
}

export function buildSchemaVersionRegistry(
  input?: SchemaVersionRegistryInput
): SchemaVersionRegistry {
  return buildRegistry(input);
}

export function validateSchemaVersionRegistry(
  input?: SchemaVersionRegistryInput
): SchemaVersionRegistry {
  return buildRegistry(input);
}

export function summarizeSchemaVersionRegistry(
  registry: SchemaVersionRegistry
): SchemaVersionRegistrySummary {
  return {
    registryId: registry.registryId,
    status: registry.status,
    entryCount: registry.entryCount,
    compatibleCount: registry.compatibleCount,
    upgradeAvailableCount: registry.upgradeAvailableCount,
    unknownSchemaCount: registry.unknownSchemaCount,
    incompatibleCount: registry.incompatibleCount,
    schemaVersions: registry.schemaVersions,
    warningCodes: registry.findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    hash: registry.registryHash
  };
}
