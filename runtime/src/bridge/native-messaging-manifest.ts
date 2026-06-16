export type NativeMessagingHostManifest = {
  name?: unknown;
  description?: unknown;
  path?: unknown;
  type?: unknown;
  allowed_origins?: unknown;
  [key: string]: unknown;
};

export type NativeMessagingManifestErrorKind =
  | "invalid_manifest"
  | "missing_name"
  | "unknown_name"
  | "missing_description"
  | "suspicious_description"
  | "invalid_type"
  | "missing_path"
  | "relative_path_rejected"
  | "parent_traversal_rejected"
  | "executable_extension_rejected"
  | "outside_expected_install_root"
  | "empty_allowed_extension_ids"
  | "empty_allowed_origins"
  | "too_many_allowed_origins"
  | "wildcard_origin_rejected"
  | "all_urls_rejected"
  | "unsupported_origin"
  | "invalid_extension_origin"
  | "unknown_extension_id"
  | "high_risk_field_rejected";

export type NativeMessagingManifestValidationIssue = {
  kind: NativeMessagingManifestErrorKind;
  field: string;
  safeMessage: string;
};

export type NativeMessagingManifestValidationOptions = {
  expectedHostName: string;
  allowedExtensionIds: readonly string[];
  expectedInstallRoot?: string | undefined;
  maxAllowedOrigins?: number | undefined;
};

export type NativeMessagingManifestValidationResult =
  | {
      ok: true;
      manifest: {
        name: string;
        description: string;
        path: string;
        type: "stdio";
        allowed_origins: [string];
      };
      summary: NativeMessagingManifestSummary;
    }
  | {
      ok: false;
      issues: NativeMessagingManifestValidationIssue[];
      summary: NativeMessagingManifestSummary;
    };

export type NativeMessagingManifestSummary = {
  hostName?: string;
  type?: string;
  pathKind: "missing" | "absolute" | "relative_or_invalid";
  executableName?: string;
  originCount: number;
  allowedExtensionIds: string[];
  installRootMatched?: boolean;
  dryCheckOnly: true;
  nativeMessagingEnabled: false;
};

const allowedManifestFields = new Set([
  "name",
  "description",
  "path",
  "type",
  "allowed_origins"
]);

const suspiciousDescriptionPattern =
  /\bsk-[A-Za-z0-9_-]{16,}\b|\bBearer\s+[A-Za-z0-9._-]{16,}\b|\bapi[_-]?key\b|\bAuthorization\b|\bDEEPSEEK_API_KEY\b|\bOPENAI_API_KEY\b/i;

const executableExtensionPattern = /\.(?:exe|cmd|bat|sh|app|bin)$/i;
const extensionIdPattern = /^[a-p]{32}$/;

export function validateNativeMessagingHostManifest(
  manifest: unknown,
  options: NativeMessagingManifestValidationOptions
): NativeMessagingManifestValidationResult {
  const issues: NativeMessagingManifestValidationIssue[] = [];

  if (options.allowedExtensionIds.length === 0) {
    issues.push(
      issue(
        "empty_allowed_extension_ids",
        "allowedExtensionIds",
        "Native messaging manifest dry check requires an extension allowlist"
      )
    );
  }

  if (!isRecord(manifest)) {
    issues.push(
      issue(
        "invalid_manifest",
        "manifest",
        "Native messaging host manifest must be an object"
      )
    );
    return {
      ok: false,
      issues,
      summary: summarizeNativeMessagingHostManifest(manifest, options)
    };
  }

  for (const key of Object.keys(manifest)) {
    if (!allowedManifestFields.has(key)) {
      issues.push(
        issue(
          "high_risk_field_rejected",
          key,
          "Native messaging dry manifest contains unsupported fields"
        )
      );
    }
  }

  const name = readString(manifest.name);
  if (name === undefined || name.length === 0) {
    issues.push(
      issue("missing_name", "name", "Native messaging host name is required")
    );
  } else if (name !== options.expectedHostName) {
    issues.push(
      issue(
        "unknown_name",
        "name",
        "Native messaging host name is not allowlisted"
      )
    );
  }

  const description = readString(manifest.description);
  if (description === undefined || description.length === 0) {
    issues.push(
      issue(
        "missing_description",
        "description",
        "Native messaging host description is required"
      )
    );
  } else if (suspiciousDescriptionPattern.test(description)) {
    issues.push(
      issue(
        "suspicious_description",
        "description",
        "Native messaging host description contains secret-like text"
      )
    );
  }

  const type = readString(manifest.type);
  if (type !== "stdio") {
    issues.push(
      issue(
        "invalid_type",
        "type",
        'Native messaging host type must be "stdio"'
      )
    );
  }

  const hostPath = readString(manifest.path);
  if (hostPath === undefined || hostPath.length === 0) {
    issues.push(
      issue("missing_path", "path", "Native messaging host path is required")
    );
  } else {
    issues.push(...validateHostPath(hostPath, options));
  }

  issues.push(...validateAllowedOrigins(manifest.allowed_origins, options));

  const summary = summarizeNativeMessagingHostManifest(manifest, options);
  if (issues.length > 0) {
    return { ok: false, issues, summary };
  }

  return {
    ok: true,
    manifest: {
      name: name as string,
      description: description as string,
      path: hostPath as string,
      type: "stdio",
      allowed_origins: manifest.allowed_origins as [string]
    },
    summary
  };
}

export function summarizeNativeMessagingHostManifest(
  manifest: unknown,
  options?: Partial<NativeMessagingManifestValidationOptions>
): NativeMessagingManifestSummary {
  const record = isRecord(manifest) ? manifest : {};
  const hostPath = readString(record.path);
  const allowedOrigins = Array.isArray(record.allowed_origins)
    ? record.allowed_origins
    : [];
  const expectedInstallRoot = options?.expectedInstallRoot;
  const summary: NativeMessagingManifestSummary = {
    pathKind:
      hostPath === undefined
        ? "missing"
        : isAbsoluteHostPath(hostPath)
          ? "absolute"
          : "relative_or_invalid",
    originCount: allowedOrigins.length,
    allowedExtensionIds: allowedOrigins
      .map((origin) =>
        typeof origin === "string" ? parseExtensionIdFromOrigin(origin) : null
      )
      .filter((extensionId): extensionId is string => extensionId !== null),
    dryCheckOnly: true,
    nativeMessagingEnabled: false
  };

  const hostName = readString(record.name);
  if (hostName !== undefined) {
    summary.hostName = hostName;
  }
  const type = readString(record.type);
  if (type !== undefined) {
    summary.type = type;
  }
  if (hostPath !== undefined) {
    summary.executableName = basename(hostPath);
  }
  if (hostPath !== undefined && expectedInstallRoot !== undefined) {
    summary.installRootMatched = pathInsideRoot(hostPath, expectedInstallRoot);
  }

  return summary;
}

function validateHostPath(
  hostPath: string,
  options: NativeMessagingManifestValidationOptions
): NativeMessagingManifestValidationIssue[] {
  const issues: NativeMessagingManifestValidationIssue[] = [];
  if (!isAbsoluteHostPath(hostPath)) {
    issues.push(
      issue(
        "relative_path_rejected",
        "path",
        "Native messaging host path must be absolute"
      )
    );
  }
  if (hasParentTraversal(hostPath)) {
    issues.push(
      issue(
        "parent_traversal_rejected",
        "path",
        "Native messaging host path must not contain parent traversal"
      )
    );
  }
  if (!executableExtensionPattern.test(hostPath)) {
    issues.push(
      issue(
        "executable_extension_rejected",
        "path",
        "Native messaging host path must use an executable-like file extension"
      )
    );
  }
  if (
    options.expectedInstallRoot !== undefined &&
    !pathInsideRoot(hostPath, options.expectedInstallRoot)
  ) {
    issues.push(
      issue(
        "outside_expected_install_root",
        "path",
        "Native messaging host path is outside the expected install root"
      )
    );
  }
  return issues;
}

function validateAllowedOrigins(
  origins: unknown,
  options: NativeMessagingManifestValidationOptions
): NativeMessagingManifestValidationIssue[] {
  const issues: NativeMessagingManifestValidationIssue[] = [];
  if (!Array.isArray(origins) || origins.length === 0) {
    return [
      issue(
        "empty_allowed_origins",
        "allowed_origins",
        "Native messaging host manifest must allow exactly one extension origin"
      )
    ];
  }

  const maxAllowedOrigins = options.maxAllowedOrigins ?? 1;
  if (origins.length > maxAllowedOrigins) {
    issues.push(
      issue(
        "too_many_allowed_origins",
        "allowed_origins",
        "Native messaging host manifest allows too many extension origins"
      )
    );
  }

  for (const origin of origins) {
    if (typeof origin !== "string") {
      issues.push(
        issue(
          "invalid_extension_origin",
          "allowed_origins",
          "Native messaging allowed origin must be a string"
        )
      );
      continue;
    }

    if (origin === "<all_urls>" || origin.includes("<all_urls>")) {
      issues.push(
        issue(
          "all_urls_rejected",
          "allowed_origins",
          "Native messaging allowed origin must not use all_urls"
        )
      );
      continue;
    }
    if (origin.includes("*")) {
      issues.push(
        issue(
          "wildcard_origin_rejected",
          "allowed_origins",
          "Native messaging allowed origin must not contain wildcards"
        )
      );
      continue;
    }
    if (
      origin.startsWith("http://") ||
      origin.startsWith("https://") ||
      origin.startsWith("file://")
    ) {
      issues.push(
        issue(
          "unsupported_origin",
          "allowed_origins",
          "Native messaging allowed origin must be a chrome-extension origin"
        )
      );
      continue;
    }

    const extensionId = parseExtensionIdFromOrigin(origin);
    if (extensionId === null) {
      issues.push(
        issue(
          "invalid_extension_origin",
          "allowed_origins",
          "Native messaging allowed origin must be chrome-extension://<extension-id>/"
        )
      );
      continue;
    }
    if (!options.allowedExtensionIds.includes(extensionId)) {
      issues.push(
        issue(
          "unknown_extension_id",
          "allowed_origins",
          "Native messaging allowed origin extension id is not allowlisted"
        )
      );
    }
  }

  return issues;
}

function parseExtensionIdFromOrigin(origin: string): string | null {
  const match = /^chrome-extension:\/\/([a-p]{32})\/$/.exec(origin);
  const extensionId = match?.[1];
  if (extensionId === undefined || !extensionIdPattern.test(extensionId)) {
    return null;
  }
  return extensionId;
}

function isAbsoluteHostPath(value: string): boolean {
  return (
    /^[A-Za-z]:[\\/]/.test(value) ||
    /^\\\\[^\\]/.test(value) ||
    value.startsWith("/")
  );
}

function hasParentTraversal(value: string): boolean {
  return value.split(/[\\/]+/).some((segment) => segment === "..");
}

function pathInsideRoot(hostPath: string, expectedRoot: string): boolean {
  if (!isAbsoluteHostPath(hostPath) || !isAbsoluteHostPath(expectedRoot)) {
    return false;
  }
  const normalizedPath = normalizePathForComparison(hostPath);
  const normalizedRoot = normalizePathForComparison(expectedRoot);
  return (
    normalizedPath === normalizedRoot ||
    normalizedPath.startsWith(`${normalizedRoot}/`)
  );
}

function normalizePathForComparison(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();
}

function basename(value: string): string {
  const segments = value
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0);
  return segments.at(-1) ?? "";
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(
  kind: NativeMessagingManifestErrorKind,
  field: string,
  safeMessage: string
): NativeMessagingManifestValidationIssue {
  return { kind, field, safeMessage };
}
