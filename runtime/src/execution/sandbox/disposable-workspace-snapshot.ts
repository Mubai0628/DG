export type DisposableWorkspaceSnapshotStatus =
  | "empty"
  | "contract_ready"
  | "warning"
  | "blocked";

export type DisposableWorkspacePlannedMutation =
  | "none"
  | "create"
  | "update"
  | "delete"
  | "documentation"
  | "test";

export type DisposableWorkspaceSnapshotSeverity =
  | "info"
  | "warning"
  | "blocker";

export type DisposableWorkspaceSnapshotFindingKind =
  | "input"
  | "path"
  | "policy"
  | "snapshot"
  | "safety"
  | "secret"
  | "readiness";

export type DisposableWorkspaceSnapshotWarning = {
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DisposableWorkspaceSnapshotFinding = {
  findingId: string;
  kind: DisposableWorkspaceSnapshotFindingKind;
  severity: DisposableWorkspaceSnapshotSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
};

export type DisposableWorkspaceSnapshotFileSummary = {
  path: string;
  language?: string | undefined;
  extension?: string | undefined;
  sizeBytes: number;
  lineCount?: number | undefined;
  hashPrefix: string;
  exists: boolean;
  plannedMutation?: DisposableWorkspacePlannedMutation | undefined;
  warningCodes: string[];
  isBinary: boolean;
  isGenerated: boolean;
  isSymlink: boolean;
  isJunction: boolean;
  isReparsePoint: boolean;
};

export type DisposableWorkspaceSnapshotDirectorySummary = {
  path: string;
  fileCount: number;
  totalBytes: number;
  warningCodes: string[];
};

export type DisposableWorkspaceSnapshotPolicy = {
  pathPolicy: "strict_relative_only";
  symlinkPolicy: "deny" | "warn";
  reparsePointPolicy: "deny" | "warn";
  generatedArtifactPolicy: "deny_planned_mutation" | "warn";
  secretPathPolicy: "deny";
  lineEndingPolicy: "lf" | "crlf" | "mixed" | "unknown";
  binaryPolicy: "warn" | "deny";
  maxFiles: number;
  maxBytes: number;
  noSymlinkFollowing: true;
};

export type DisposableWorkspaceSnapshotReadiness = {
  canProceedToSandboxApplyPrototype: boolean;
  canReadFilesystem: false;
  canWriteFilesystem: false;
  canApplyPatch: false;
  canRollbackReal: false;
  canExecuteGit: false;
  canExecuteShell: false;
};

export type DisposableWorkspaceSnapshotContractInput = {
  sourceWorkspaceFingerprint?: string | undefined;
  disposableRootRef?: string | undefined;
  workspaceIndexRef?: string | undefined;
  sourceSnapshotHash?: string | undefined;
  expectedInputHash?: string | undefined;
  files?: unknown[] | undefined;
  directories?: unknown[] | undefined;
  allowedRelativePaths?: unknown[] | undefined;
  deniedRelativePaths?: unknown[] | undefined;
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  pathPolicy?: string | undefined;
  symlinkPolicy?: string | undefined;
  reparsePointPolicy?: string | undefined;
  generatedArtifactPolicy?: string | undefined;
  secretPathPolicy?: string | undefined;
  lineEndingPolicy?: string | undefined;
  binaryPolicy?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type DisposableWorkspaceSnapshotContract = {
  status: DisposableWorkspaceSnapshotStatus;
  contractId: string;
  sourceWorkspaceFingerprint: string;
  disposableRootRef: string;
  workspaceIndexRef?: string | undefined;
  sourceSnapshotHash: string;
  expectedInputHash?: string | undefined;
  fileCount: number;
  directoryCount: number;
  totalBytes: number;
  allowedPathCount: number;
  deniedPathCount: number;
  generatedFileCount: number;
  binaryFileCount: number;
  symlinkLikeCount: number;
  plannedMutationCount: number;
  files: DisposableWorkspaceSnapshotFileSummary[];
  directories: DisposableWorkspaceSnapshotDirectorySummary[];
  policy: DisposableWorkspaceSnapshotPolicy;
  findings: DisposableWorkspaceSnapshotFinding[];
  warnings: DisposableWorkspaceSnapshotWarning[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DisposableWorkspaceSnapshotReadiness;
  contractHash: string;
  nextAction: string;
  source: "runtime_disposable_workspace_snapshot_contract";
  metadataOnly: true;
  applyEnabled: false;
  rollbackEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type DisposableWorkspaceSnapshotValidationResult = {
  ok: boolean;
  warningCodes: string[];
  findings: DisposableWorkspaceSnapshotFinding[];
};

type NormalizedInput = {
  sourceWorkspaceFingerprint: string;
  disposableRootRef: string;
  workspaceIndexRef?: string | undefined;
  sourceSnapshotHash: string;
  expectedInputHash?: string | undefined;
  files: DisposableWorkspaceSnapshotFileSummary[];
  directories: DisposableWorkspaceSnapshotDirectorySummary[];
  allowedRelativePaths: string[];
  deniedRelativePaths: string[];
  policy: DisposableWorkspaceSnapshotPolicy;
};

const defaultMaxFiles = 200;
const defaultMaxBytes = 5_000_000;
const largeFileBytes = 1_000_000;

const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRawInputKeys = new Set(
  [
    "content",
    "fileContent",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    "beforeContent",
    "afterContent",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    privatePasteField,
    apiKeyField,
    authHeaderField,
    "env",
    "stdout",
    "stderr",
    "realAbsolutePath"
  ].map((key) => key.toLowerCase())
);

const unsafePreviewPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{16,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b`, "i")
  },
  {
    code: "RAW_DOM_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Dom"}\\b|raw DOM`, "i")
  },
  {
    code: "RAW_CSV_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Csv"}\\b|raw CSV`, "i")
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b`, "i")
  },
  {
    code: "RAW_SCREENSHOT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Screenshot"}\\b|screenshot`, "i")
  },
  {
    code: "CLIPBOARD_MARKER",
    pattern: new RegExp(`\\b${privatePasteField}\\b`, "i")
  },
  {
    code: "URL_QUERY_SECRET_MARKER",
    pattern: /https?:\/\/\S+\?(?=\S*(token|key|secret|auth|password)=)/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

const blockedPathSegments = new Set([
  ".git",
  ".tmp",
  "node_modules",
  "dist",
  "target"
]);

const generatedArtifactPrefixes = [
  "node_modules/",
  "dist/",
  "target/",
  "runtime/dist/",
  "browser-extension/dist/",
  "conformance/results/",
  "app/dist/",
  "app/src-tauri/target/",
  ".tmp/"
];

const sourcePathPattern = /^(app|runtime|browser-extension|conformance)\/src\//;
const testPathPattern =
  /(^|\/)(test|tests|__tests__)\/|(\.test|\.spec)\.[tj]sx?$/i;
const configOrBuildPathPattern =
  /(^|\/)(package\.json|pnpm-lock\.yaml|tsconfig(?:\.[^./]+)?\.json|vite\.config\.[tj]s|Cargo\.toml|Cargo\.lock|tauri\.conf\.json)$/i;
const secretPathPattern =
  /(^|\/)(\.env[^/]*|.*(?:secret|credential|password|private[-_]?key|id_rsa|id_ed25519).*)$/i;

export function buildDisposableWorkspaceSnapshotContract(
  input: DisposableWorkspaceSnapshotContractInput = {}
): DisposableWorkspaceSnapshotContract {
  const normalized = normalizeInput(input);
  if (isEmptyInput(input)) {
    return contractFromNormalized(normalized, [], "empty", input);
  }

  const validation = validateDisposableWorkspaceSnapshotContractInput(input);
  const blockerCount = validation.findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = validation.findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: DisposableWorkspaceSnapshotStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "contract_ready";

  return contractFromNormalized(normalized, validation.findings, status, input);
}

export function summarizeDisposableWorkspaceSnapshotContract(
  contract: DisposableWorkspaceSnapshotContract
): {
  contractId: string;
  status: DisposableWorkspaceSnapshotStatus;
  sourceWorkspaceFingerprint: string;
  disposableRootRef: string;
  fileCount: number;
  totalBytes: number;
  blockerCount: number;
  warningCount: number;
  canProceedToSandboxApplyPrototype: boolean;
  canReadFilesystem: false;
  canWriteFilesystem: false;
  canApplyPatch: false;
  canRollbackReal: false;
  canExecuteGit: false;
  canExecuteShell: false;
  hash: string;
} {
  return {
    contractId: contract.contractId,
    status: contract.status,
    sourceWorkspaceFingerprint: contract.sourceWorkspaceFingerprint,
    disposableRootRef: contract.disposableRootRef,
    fileCount: contract.fileCount,
    totalBytes: contract.totalBytes,
    blockerCount: contract.blockerCount,
    warningCount: contract.warningCount,
    canProceedToSandboxApplyPrototype:
      contract.readiness.canProceedToSandboxApplyPrototype,
    canReadFilesystem: false,
    canWriteFilesystem: false,
    canApplyPatch: false,
    canRollbackReal: false,
    canExecuteGit: false,
    canExecuteShell: false,
    hash: hashPreview(
      [
        contract.contractId,
        contract.status,
        contract.sourceWorkspaceFingerprint,
        contract.disposableRootRef,
        contract.fileCount,
        contract.totalBytes,
        contract.blockerCount,
        contract.warningCount,
        contract.contractHash
      ].join("|")
    )
  };
}

export function validateDisposableWorkspaceSnapshotContractInput(
  input: DisposableWorkspaceSnapshotContractInput
): DisposableWorkspaceSnapshotValidationResult {
  const normalized = normalizeInput(input);
  const findings: DisposableWorkspaceSnapshotFinding[] = [];
  const inputJson = safeStringify(input);

  for (const code of rawFieldWarningsFrom(input)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of unsafeWarningCodes(inputJson)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of executionAttemptWarningsFrom(input)) {
    findings.push(finding("readiness", "blocker", code));
  }

  if (normalized.sourceWorkspaceFingerprint.length === 0) {
    findings.push(
      finding(
        "input",
        "blocker",
        "DISPOSABLE_SNAPSHOT_MISSING_SOURCE_FINGERPRINT"
      )
    );
  }
  if (normalized.disposableRootRef.length === 0) {
    findings.push(
      finding("input", "blocker", "DISPOSABLE_SNAPSHOT_MISSING_ROOT_REF")
    );
  } else {
    const rootPathCode = unsafeRootRefCode(normalized.disposableRootRef);
    if (rootPathCode !== undefined) {
      findings.push(finding("path", "blocker", rootPathCode));
    } else if (looksPathLike(normalized.disposableRootRef)) {
      findings.push(
        finding("input", "warning", "DISPOSABLE_ROOT_REF_LOOKS_PATH_LIKE")
      );
    }
  }
  if (normalized.workspaceIndexRef === undefined) {
    findings.push(
      finding(
        "snapshot",
        "warning",
        "DISPOSABLE_SNAPSHOT_WORKSPACE_INDEX_MISSING"
      )
    );
  }
  if (normalized.expectedInputHash === undefined) {
    findings.push(
      finding(
        "snapshot",
        "warning",
        "DISPOSABLE_SNAPSHOT_EXPECTED_HASH_MISSING"
      )
    );
  }
  if (normalized.files.length === 0) {
    findings.push(
      finding("snapshot", "warning", "DISPOSABLE_SNAPSHOT_NO_FILES")
    );
  }
  if (normalized.files.length > normalized.policy.maxFiles) {
    findings.push(
      finding("snapshot", "blocker", "DISPOSABLE_SNAPSHOT_TOO_MANY_FILES")
    );
  }
  if (totalBytes(normalized.files) > normalized.policy.maxBytes) {
    findings.push(
      finding("snapshot", "blocker", "DISPOSABLE_SNAPSHOT_TOO_MANY_BYTES")
    );
  }

  const seenPaths = new Set<string>();
  const hasTestSummary = normalized.files.some((file) =>
    testPathPattern.test(file.path)
  );
  for (const file of normalized.files) {
    const pathFindings = validateRelativePath(file.path, "file");
    for (const pathFinding of pathFindings) {
      findings.push(pathFinding);
    }
    if (seenPaths.has(file.path.toLowerCase())) {
      findings.push(
        finding(
          "path",
          "blocker",
          "DISPOSABLE_SNAPSHOT_DUPLICATE_PATH",
          file.path
        )
      );
    }
    seenPaths.add(file.path.toLowerCase());

    if (file.sizeBytes < 0 || (file.lineCount ?? 0) < 0) {
      findings.push(
        finding(
          "snapshot",
          "blocker",
          "DISPOSABLE_SNAPSHOT_NEGATIVE_SIZE",
          file.path
        )
      );
    }
    if (file.sizeBytes > largeFileBytes) {
      findings.push(
        finding(
          "snapshot",
          "warning",
          "DISPOSABLE_SNAPSHOT_LARGE_FILE",
          file.path
        )
      );
    }
    if (file.isBinary) {
      findings.push(
        finding(
          "snapshot",
          normalized.policy.binaryPolicy === "deny" ? "blocker" : "warning",
          "DISPOSABLE_SNAPSHOT_BINARY_FILE",
          file.path
        )
      );
    }
    if (file.isSymlink) {
      findings.push(
        finding(
          "policy",
          normalized.policy.symlinkPolicy === "deny" ? "blocker" : "warning",
          "DISPOSABLE_SNAPSHOT_SYMLINK_DENIED",
          file.path
        )
      );
    }
    if (file.isJunction || file.isReparsePoint) {
      findings.push(
        finding(
          "policy",
          normalized.policy.reparsePointPolicy === "deny"
            ? "blocker"
            : "warning",
          "DISPOSABLE_SNAPSHOT_REPARSE_POINT_DENIED",
          file.path
        )
      );
    }
    if (file.isGenerated && file.plannedMutation !== "none") {
      findings.push(
        finding(
          "policy",
          normalized.policy.generatedArtifactPolicy === "deny_planned_mutation"
            ? "blocker"
            : "warning",
          "DISPOSABLE_SNAPSHOT_GENERATED_MUTATION_DENIED",
          file.path
        )
      );
    }
    if (
      file.plannedMutation !== "none" &&
      configOrBuildPathPattern.test(file.path)
    ) {
      findings.push(
        finding(
          "policy",
          "warning",
          "DISPOSABLE_SNAPSHOT_CONFIG_MUTATION",
          file.path
        )
      );
    }
    if (
      file.plannedMutation === "delete" ||
      file.warningCodes.includes("PLANNED_DELETE")
    ) {
      findings.push(
        finding(
          "policy",
          "warning",
          "DISPOSABLE_SNAPSHOT_PLANNED_DELETE",
          file.path
        )
      );
    }
    if (
      file.plannedMutation !== "none" &&
      sourcePathPattern.test(file.path) &&
      !hasTestSummary
    ) {
      findings.push(
        finding(
          "policy",
          "warning",
          "DISPOSABLE_SNAPSHOT_SOURCE_WITHOUT_TEST_SUMMARY",
          file.path
        )
      );
    }
    if (file.language === undefined || file.language === "unknown") {
      findings.push(
        finding(
          "snapshot",
          "warning",
          "DISPOSABLE_SNAPSHOT_UNKNOWN_LANGUAGE",
          file.path
        )
      );
    }
  }

  for (const directory of normalized.directories) {
    for (const pathFinding of validateRelativePath(
      directory.path,
      "directory"
    )) {
      findings.push(pathFinding);
    }
    if (directory.totalBytes < 0 || directory.fileCount < 0) {
      findings.push(
        finding(
          "snapshot",
          "blocker",
          "DISPOSABLE_SNAPSHOT_NEGATIVE_DIRECTORY_TOTAL",
          directory.path
        )
      );
    }
  }

  for (const path of [...normalized.allowedRelativePaths]) {
    for (const pathFinding of validateRelativePath(path, "path")) {
      findings.push(pathFinding);
    }
  }
  for (const path of normalized.deniedRelativePaths) {
    for (const pathFinding of validateDeniedPathSummary(path)) {
      findings.push(pathFinding);
    }
  }

  if (
    normalized.policy.lineEndingPolicy === "mixed" ||
    normalized.policy.lineEndingPolicy === "unknown"
  ) {
    findings.push(
      finding("policy", "warning", "DISPOSABLE_SNAPSHOT_LINE_ENDINGS_UNCERTAIN")
    );
  }

  const uniqueFindings = uniqueFindingsByCodePath(findings);
  return {
    ok: uniqueFindings.every((item) => item.severity !== "blocker"),
    warningCodes: uniqueFindings.map((item) => item.code),
    findings: uniqueFindings
  };
}

function contractFromNormalized(
  normalized: NormalizedInput,
  findings: DisposableWorkspaceSnapshotFinding[],
  status: DisposableWorkspaceSnapshotStatus,
  input: DisposableWorkspaceSnapshotContractInput
): DisposableWorkspaceSnapshotContract {
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const contractId =
    status === "empty"
      ? ""
      : (input.idGenerator?.() ??
        `disposable-snapshot-${hashPreview(
          [
            normalized.sourceWorkspaceFingerprint,
            normalized.disposableRootRef,
            normalized.sourceSnapshotHash,
            normalized.files
              .map((file) => `${file.path}:${file.hashPrefix}`)
              .join(","),
            input.createdAt ?? "runtime-disposable-workspace-snapshot-contract"
          ].join("|")
        )}`);
  const contractHash = hashPreview(
    JSON.stringify({
      contractId,
      sourceWorkspaceFingerprint: normalized.sourceWorkspaceFingerprint,
      disposableRootRef: normalized.disposableRootRef,
      workspaceIndexRef: normalized.workspaceIndexRef,
      sourceSnapshotHash: normalized.sourceSnapshotHash,
      expectedInputHash: normalized.expectedInputHash,
      files: normalized.files.map((file) => ({
        path: file.path,
        hashPrefix: file.hashPrefix,
        plannedMutation: file.plannedMutation,
        sizeBytes: file.sizeBytes
      })),
      directories: normalized.directories,
      policy: normalized.policy,
      findingCodes: findings.map((finding) => finding.code)
    })
  );
  const readiness: DisposableWorkspaceSnapshotReadiness = {
    canProceedToSandboxApplyPrototype: blockerCount === 0 && status !== "empty",
    canReadFilesystem: false,
    canWriteFilesystem: false,
    canApplyPatch: false,
    canRollbackReal: false,
    canExecuteGit: false,
    canExecuteShell: false
  };

  return {
    status,
    contractId,
    sourceWorkspaceFingerprint: normalized.sourceWorkspaceFingerprint,
    disposableRootRef: normalized.disposableRootRef,
    workspaceIndexRef: normalized.workspaceIndexRef,
    sourceSnapshotHash: normalized.sourceSnapshotHash,
    expectedInputHash: normalized.expectedInputHash,
    fileCount: normalized.files.length,
    directoryCount: normalized.directories.length,
    totalBytes: totalBytes(normalized.files),
    allowedPathCount: normalized.allowedRelativePaths.length,
    deniedPathCount: normalized.deniedRelativePaths.length,
    generatedFileCount: normalized.files.filter((file) => file.isGenerated)
      .length,
    binaryFileCount: normalized.files.filter((file) => file.isBinary).length,
    symlinkLikeCount: normalized.files.filter(
      (file) => file.isSymlink || file.isJunction || file.isReparsePoint
    ).length,
    plannedMutationCount: normalized.files.filter(
      (file) => file.plannedMutation !== "none"
    ).length,
    files: normalized.files,
    directories: normalized.directories,
    policy: normalized.policy,
    findings,
    warnings: findings
      .filter((finding) => finding.severity !== "info")
      .map(warningFromFinding),
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness,
    contractHash,
    nextAction: nextActionFor(status, readiness),
    source: "runtime_disposable_workspace_snapshot_contract",
    metadataOnly: true,
    applyEnabled: false,
    rollbackEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function normalizeInput(
  input: DisposableWorkspaceSnapshotContractInput
): NormalizedInput {
  const policy = normalizePolicy(input);
  const files = safeArray(input.files).map((item, index) =>
    normalizeFile(item, index)
  );
  return {
    sourceWorkspaceFingerprint: safeRef(input.sourceWorkspaceFingerprint, ""),
    disposableRootRef: safeRef(input.disposableRootRef, ""),
    workspaceIndexRef: optionalSafeRef(input.workspaceIndexRef),
    sourceSnapshotHash:
      optionalSafeRef(input.sourceSnapshotHash) ??
      hashPreview(
        files.map((file) => `${file.path}:${file.hashPrefix}`).join("|")
      ),
    expectedInputHash: optionalSafeRef(input.expectedInputHash),
    files,
    directories: safeArray(input.directories).map((item, index) =>
      normalizeDirectory(item, index)
    ),
    allowedRelativePaths: safeArray(input.allowedRelativePaths).map((item) =>
      safePathForOutput(safeText(item, ""))
    ),
    deniedRelativePaths: safeArray(input.deniedRelativePaths).map((item) =>
      safePathForOutput(safeText(item, ""))
    ),
    policy
  };
}

function normalizePolicy(
  input: DisposableWorkspaceSnapshotContractInput
): DisposableWorkspaceSnapshotPolicy {
  return {
    pathPolicy: "strict_relative_only",
    symlinkPolicy: input.symlinkPolicy === "warn" ? "warn" : "deny",
    reparsePointPolicy: input.reparsePointPolicy === "warn" ? "warn" : "deny",
    generatedArtifactPolicy:
      input.generatedArtifactPolicy === "warn"
        ? "warn"
        : "deny_planned_mutation",
    secretPathPolicy: "deny",
    lineEndingPolicy: normalizeLineEndingPolicy(input.lineEndingPolicy),
    binaryPolicy: input.binaryPolicy === "deny" ? "deny" : "warn",
    maxFiles: finitePositiveInteger(input.maxFiles, defaultMaxFiles),
    maxBytes: finitePositiveInteger(input.maxBytes, defaultMaxBytes),
    noSymlinkFollowing: true
  };
}

function normalizeFile(
  value: unknown,
  index: number
): DisposableWorkspaceSnapshotFileSummary {
  const record = isRecord(value) ? value : {};
  const rawPath = safeText(record.path, `file-${index + 1}`);
  const path = safePathForOutput(rawPath);
  const sizeBytes = finiteNumber(record.sizeBytes, 0);
  const plannedMutation = normalizePlannedMutation(record.plannedMutation);
  const generated =
    Boolean(record.isGenerated) || isGeneratedArtifactPath(path);
  const warningCodes = safeArray(record.warningCodes)
    .filter((item): item is string => typeof item === "string")
    .map((item) => warningCode(item))
    .filter((item) => item !== undefined);
  return {
    path,
    language: optionalSafeRef(record.language),
    extension: optionalSafeRef(record.extension),
    sizeBytes,
    lineCount:
      record.lineCount === undefined
        ? undefined
        : finiteNumber(record.lineCount, 0),
    hashPrefix: hashPrefixFrom(record.hashPrefix, path),
    exists: record.exists === false ? false : true,
    plannedMutation,
    warningCodes:
      plannedMutation === "delete"
        ? uniqueStrings([...warningCodes, "PLANNED_DELETE"])
        : warningCodes,
    isBinary: Boolean(record.isBinary),
    isGenerated: generated,
    isSymlink: Boolean(record.isSymlink),
    isJunction: Boolean(record.isJunction),
    isReparsePoint: Boolean(record.isReparsePoint)
  };
}

function normalizeDirectory(
  value: unknown,
  index: number
): DisposableWorkspaceSnapshotDirectorySummary {
  const record = isRecord(value) ? value : {};
  return {
    path: safePathForOutput(safeText(record.path, `dir-${index + 1}`)),
    fileCount: finiteNumber(record.fileCount, 0),
    totalBytes: finiteNumber(record.totalBytes, 0),
    warningCodes: safeArray(record.warningCodes)
      .filter((item): item is string => typeof item === "string")
      .map((item) => warningCode(item))
      .filter((item) => item !== undefined)
  };
}

function normalizePlannedMutation(
  value: unknown
): DisposableWorkspacePlannedMutation {
  if (
    value === "create" ||
    value === "update" ||
    value === "delete" ||
    value === "documentation" ||
    value === "test"
  ) {
    return value;
  }
  if (value === true) {
    return "update";
  }
  return "none";
}

function normalizeLineEndingPolicy(
  value: unknown
): DisposableWorkspaceSnapshotPolicy["lineEndingPolicy"] {
  return value === "lf" ||
    value === "crlf" ||
    value === "mixed" ||
    value === "unknown"
    ? value
    : "unknown";
}

function validateRelativePath(
  path: string,
  codePrefix: "file" | "directory" | "path"
): DisposableWorkspaceSnapshotFinding[] {
  const findings: DisposableWorkspaceSnapshotFinding[] = [];
  const pathCode = unsafeRelativePathCode(path);
  if (pathCode !== undefined) {
    findings.push(finding("path", "blocker", pathCode, path));
  }
  if (secretPathPattern.test(path)) {
    findings.push(
      finding(
        "secret",
        "blocker",
        "DISPOSABLE_SNAPSHOT_SECRET_PATH_REJECTED",
        path
      )
    );
  }
  if (unsafeWarningCodes(path).length > 0) {
    findings.push(
      finding(
        "safety",
        "blocker",
        `DISPOSABLE_SNAPSHOT_${codePrefix.toUpperCase()}_UNSAFE_MARKER`,
        path
      )
    );
  }
  return findings;
}

function validateDeniedPathSummary(
  path: string
): DisposableWorkspaceSnapshotFinding[] {
  const findings: DisposableWorkspaceSnapshotFinding[] = [];
  const text = path.trim();
  if (text.length === 0) {
    findings.push(finding("path", "blocker", "DISPOSABLE_SNAPSHOT_PATH_EMPTY"));
  }
  if (
    text.startsWith("/") ||
    text.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(text) ||
    text.startsWith("//") ||
    text.startsWith("\\\\") ||
    text.split("/").includes("..")
  ) {
    findings.push(
      finding("path", "blocker", "DISPOSABLE_SNAPSHOT_DENY_PATH_UNSAFE")
    );
  }
  if (unsafeWarningCodes(text).length > 0) {
    findings.push(
      finding(
        "safety",
        "blocker",
        "DISPOSABLE_SNAPSHOT_DENY_PATH_UNSAFE_MARKER"
      )
    );
  }
  return findings;
}

function unsafeRelativePathCode(path: string): string | undefined {
  const text = path.trim();
  const lower = text.toLowerCase();
  if (text.length === 0) {
    return "DISPOSABLE_SNAPSHOT_PATH_EMPTY";
  }
  if (text.startsWith("/") || text.startsWith("\\")) {
    return "DISPOSABLE_SNAPSHOT_ABSOLUTE_PATH_REJECTED";
  }
  if (/^[a-zA-Z]:[\\/]/.test(text) || /^[a-zA-Z]:$/.test(text)) {
    return "DISPOSABLE_SNAPSHOT_DRIVE_PATH_REJECTED";
  }
  if (text.startsWith("//") || text.startsWith("\\\\")) {
    return "DISPOSABLE_SNAPSHOT_UNC_PATH_REJECTED";
  }
  if (text.split("/").includes("..")) {
    return "DISPOSABLE_SNAPSHOT_PARENT_TRAVERSAL_REJECTED";
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || /[?#]/.test(text)) {
    return "DISPOSABLE_SNAPSHOT_URL_PATH_REJECTED";
  }
  if (/[;&|`$<>]/.test(text)) {
    return "DISPOSABLE_SNAPSHOT_SHELL_META_REJECTED";
  }
  const parts = lower.split("/").filter(Boolean);
  if (parts.some((part) => blockedPathSegments.has(part))) {
    return "DISPOSABLE_SNAPSHOT_BLOCKED_DIRECTORY_REJECTED";
  }
  if (parts.some((part) => part === ".env" || part.startsWith(".env."))) {
    return "DISPOSABLE_SNAPSHOT_SECRET_PATH_REJECTED";
  }
  return undefined;
}

function unsafeRootRefCode(value: string): string | undefined {
  const text = value.trim();
  if (text.startsWith("/") || text.startsWith("\\")) {
    return "DISPOSABLE_ROOT_REF_ABSOLUTE_REJECTED";
  }
  if (/^[a-zA-Z]:[\\/]/.test(text) || /^[a-zA-Z]:$/.test(text)) {
    return "DISPOSABLE_ROOT_REF_DRIVE_REJECTED";
  }
  if (text.startsWith("//") || text.startsWith("\\\\")) {
    return "DISPOSABLE_ROOT_REF_UNC_REJECTED";
  }
  return undefined;
}

function looksPathLike(value: string): boolean {
  return /[\\/]/.test(value);
}

function isGeneratedArtifactPath(path: string): boolean {
  const lower = path.toLowerCase();
  return generatedArtifactPrefixes.some((prefix) => lower.startsWith(prefix));
}

function rawFieldWarningsFrom(input: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(input, (key) => {
    if (key !== undefined && forbiddenRawInputKeys.has(key.toLowerCase())) {
      warnings.push("DISPOSABLE_SNAPSHOT_RAW_FIELD_REJECTED");
    }
  });
  return uniqueStrings(warnings);
}

function executionAttemptWarningsFrom(input: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(input, (key, value) => {
    if (
      value === true &&
      (key === "canReadFilesystem" ||
        key === "canWriteFilesystem" ||
        key === "canApplyPatch")
    ) {
      warnings.push("DISPOSABLE_SNAPSHOT_EXECUTION_FLAG_REJECTED");
    }
  });
  return uniqueStrings(warnings);
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.code);
}

function warningFromFinding(
  snapshotFinding: DisposableWorkspaceSnapshotFinding
): DisposableWorkspaceSnapshotWarning {
  return {
    code: snapshotFinding.code,
    safeMessage: snapshotFinding.summary,
    path: snapshotFinding.path
  };
}

function finding(
  kind: DisposableWorkspaceSnapshotFindingKind,
  severity: DisposableWorkspaceSnapshotSeverity,
  code: string,
  path?: string | undefined
): DisposableWorkspaceSnapshotFinding {
  return {
    findingId: `snapshot-${hashPreview([kind, severity, code, path ?? ""].join("|"))}`,
    kind,
    severity,
    code,
    summary: safeSummaryForCode(code),
    path
  };
}

function safeSummaryForCode(code: string): string {
  return code
    .toLowerCase()
    .replace(/^disposable_snapshot_/, "")
    .replace(/^disposable_root_ref_/, "root ref ")
    .replaceAll("_", " ");
}

function nextActionFor(
  status: DisposableWorkspaceSnapshotStatus,
  readiness: DisposableWorkspaceSnapshotReadiness
): string {
  if (status === "empty") {
    return "Provide source workspace fingerprint, opaque disposableRootRef, and metadata-only file summaries.";
  }
  if (!readiness.canProceedToSandboxApplyPrototype) {
    return "Resolve blocker codes before this metadata contract can feed a future sandbox apply prototype.";
  }
  if (status === "warning") {
    return "Review warning codes. Contract remains metadata-only and does not enable apply.";
  }
  return "Contract is ready for future P0J sandbox apply prototype design. Apply remains disabled.";
}

function safeRef(value: unknown, fallback: string): string {
  const text = safeText(value, fallback).trim().slice(0, 160);
  return unsafeWarningCodes(text).length > 0 ? fallback : text;
}

function optionalSafeRef(value: unknown): string | undefined {
  const text = safeRef(value, "");
  return text.length > 0 ? text : undefined;
}

function safePathForOutput(value: string): string {
  const normalized = value.replace(/\\/g, "/").trim().slice(0, 240);
  if (unsafeWarningCodes(normalized).length > 0) {
    return "rejected-unsafe-path";
  }
  return normalized;
}

function hashPrefixFrom(value: unknown, fallbackSeed: string): string {
  const text = safeRef(value, "");
  if (/^[a-f0-9]{6,64}$/i.test(text)) {
    return text.slice(0, 16);
  }
  return hashPreview(fallbackSeed);
}

function warningCode(value: string): string | undefined {
  const text = safeText(value, "").trim();
  if (text.length === 0) {
    return undefined;
  }
  return /^[A-Z0-9_.-]{1,80}$/.test(text) ? text : "SNAPSHOT_WARNING";
}

function totalBytes(
  files: readonly DisposableWorkspaceSnapshotFileSummary[]
): number {
  return files.reduce((sum, file) => sum + file.sizeBytes, 0);
}

function finitePositiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : fallback;
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function visitUnknown(
  value: unknown,
  visitor: (key: string | undefined, value: unknown) => void,
  seen = new Set<unknown>(),
  key?: string | undefined
): void {
  visitor(key, value);
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => visitUnknown(item, visitor, seen));
    return;
  }
  for (const [entryKey, entryValue] of Object.entries(value)) {
    visitUnknown(entryValue, visitor, seen, entryKey);
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, nestedValue: unknown) =>
      typeof nestedValue === "function" ? "[function]" : nestedValue
    );
  } catch {
    return "[unserializable]";
  }
}

function hashPreview(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 12);
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function uniqueFindingsByCodePath(
  findings: readonly DisposableWorkspaceSnapshotFinding[]
): DisposableWorkspaceSnapshotFinding[] {
  const seen = new Set<string>();
  const result: DisposableWorkspaceSnapshotFinding[] = [];
  for (const item of findings) {
    const key = `${item.code}:${item.path ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function isEmptyInput(
  input: DisposableWorkspaceSnapshotContractInput
): boolean {
  return (
    input.sourceWorkspaceFingerprint === undefined &&
    input.disposableRootRef === undefined &&
    input.workspaceIndexRef === undefined &&
    input.files === undefined &&
    input.directories === undefined
  );
}
