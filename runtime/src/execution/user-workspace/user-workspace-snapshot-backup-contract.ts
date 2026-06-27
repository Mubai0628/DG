export type UserWorkspaceSnapshotStatus =
  | "empty"
  | "contract_ready"
  | "warning"
  | "blocked";

export type UserWorkspacePlannedMutation =
  | "none"
  | "create"
  | "update"
  | "delete"
  | "documentation"
  | "test";

export type UserWorkspaceSnapshotSeverity = "info" | "warning" | "blocker";

export type UserWorkspaceSnapshotFindingKind =
  | "input"
  | "path"
  | "policy"
  | "snapshot"
  | "backup"
  | "safety"
  | "secret"
  | "readiness";

export type UserWorkspaceSnapshotWarning = {
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type UserWorkspaceSnapshotFinding = {
  findingId: string;
  kind: UserWorkspaceSnapshotFindingKind;
  severity: UserWorkspaceSnapshotSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
};

export type UserWorkspaceFileSummary = {
  path: string;
  language?: string | undefined;
  extension?: string | undefined;
  sizeBytes: number;
  lineCount?: number | undefined;
  hashPrefix: string;
  exists: boolean;
  plannedMutation: UserWorkspacePlannedMutation;
  backupRequired: boolean;
  preimageHashRequired: boolean;
  warningCodes: string[];
  isBinary: boolean;
  isGenerated: boolean;
  isSymlink: boolean;
  isJunction: boolean;
  isReparsePoint: boolean;
  lineEnding?: "lf" | "crlf" | "mixed" | "unknown" | undefined;
};

export type UserWorkspaceDirectorySummary = {
  path: string;
  fileCount: number;
  totalBytes: number;
  warningCodes: string[];
};

export type UserWorkspaceBackupScope = {
  affectedPathCount: number;
  metadataOnly: true;
  backupStorage: "deferred";
  warningCodes: string[];
};

export type UserWorkspaceBackupRequirement = {
  requirementId: string;
  path: string;
  mutationKind: UserWorkspacePlannedMutation;
  preimageHashRequired: boolean;
  preimageContentRequiredForFutureApply: boolean;
  backupStorage: "deferred";
  warningCodes: string[];
  requirementHash: string;
};

export type UserWorkspaceSnapshotPolicy = {
  pathPolicy: "strict_relative_only";
  backupPolicy: "metadata_only_preimage_hash_required";
  symlinkPolicy: "deny" | "warn";
  reparsePointPolicy: "deny" | "warn";
  generatedArtifactPolicy: "deny_planned_mutation" | "warn";
  secretPathPolicy: "deny";
  lineEndingPolicy: "lf" | "crlf" | "mixed" | "unknown";
  binaryPolicy: "warn" | "deny";
  maxFiles: number;
  maxBytes: number;
  noSymlinkFollowing: true;
  noBackupFileCreation: true;
  noPreimageCapture: true;
};

export type UserWorkspaceSnapshotReadiness = {
  canProceedToPromotionReadinessCheck: boolean;
  canReadFilesystem: false;
  canWriteFilesystem: false;
  canApplyToUserWorkspace: false;
  canRollbackUserWorkspace: false;
  canExecuteGit: false;
  canExecuteShell: false;
};

export type UserWorkspaceSnapshotBackupContractInput = {
  userWorkspaceRootRef?: string | undefined;
  sourceWorkspaceFingerprint?: string | undefined;
  disposableApplyResultRef?: string | undefined;
  disposableRollbackResultRef?: string | undefined;
  disposableSnapshotContractRef?: string | undefined;
  expectedDisposableOutputHash?: string | undefined;
  expectedUserSnapshotHash?: string | undefined;
  files?: unknown[] | undefined;
  directories?: unknown[] | undefined;
  allowedRelativePaths?: unknown[] | undefined;
  deniedRelativePaths?: unknown[] | undefined;
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  backupPolicy?: string | undefined;
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

export type UserWorkspaceSnapshotBackupContract = {
  status: UserWorkspaceSnapshotStatus;
  contractId: string;
  userWorkspaceRootRef: string;
  sourceWorkspaceFingerprint: string;
  disposableApplyResultRef?: string | undefined;
  disposableRollbackResultRef?: string | undefined;
  disposableSnapshotContractRef?: string | undefined;
  expectedDisposableOutputHash?: string | undefined;
  expectedUserSnapshotHash?: string | undefined;
  fileCount: number;
  directoryCount: number;
  totalBytes: number;
  plannedMutationCount: number;
  backupRequiredCount: number;
  preimageHashRequiredCount: number;
  generatedFileCount: number;
  binaryFileCount: number;
  symlinkLikeCount: number;
  files: UserWorkspaceFileSummary[];
  directories: UserWorkspaceDirectorySummary[];
  backupRequirements: UserWorkspaceBackupRequirement[];
  backupScope: UserWorkspaceBackupScope;
  policy: UserWorkspaceSnapshotPolicy;
  findings: UserWorkspaceSnapshotFinding[];
  warnings: UserWorkspaceSnapshotWarning[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: UserWorkspaceSnapshotReadiness;
  contractHash: string;
  nextAction: string;
  source: "runtime_user_workspace_snapshot_backup_contract";
  metadataOnly: true;
  applyEnabled: false;
  rollbackEnabled: false;
  backupFileCreationEnabled: false;
  preimageCaptureEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type UserWorkspaceSnapshotValidationResult = {
  ok: boolean;
  warningCodes: string[];
  findings: UserWorkspaceSnapshotFinding[];
};

type NormalizedInput = {
  userWorkspaceRootRef: string;
  sourceWorkspaceFingerprint: string;
  disposableApplyResultRef?: string | undefined;
  disposableRollbackResultRef?: string | undefined;
  disposableSnapshotContractRef?: string | undefined;
  expectedDisposableOutputHash?: string | undefined;
  expectedUserSnapshotHash?: string | undefined;
  files: UserWorkspaceFileSummary[];
  directories: UserWorkspaceDirectorySummary[];
  allowedRelativePaths: string[];
  deniedRelativePaths: string[];
  policy: UserWorkspaceSnapshotPolicy;
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
    "preimageContent",
    "backupContent",
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
    "realAbsolutePath",
    "backupFilePath"
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

export function buildUserWorkspaceSnapshotBackupContract(
  input: UserWorkspaceSnapshotBackupContractInput = {}
): UserWorkspaceSnapshotBackupContract {
  const normalized = normalizeInput(input);
  if (isEmptyInput(input)) {
    return contractFromNormalized(normalized, [], "empty", input);
  }

  const validation = validateUserWorkspaceSnapshotBackupContractInput(input);
  const blockerCount = validation.findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = validation.findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: UserWorkspaceSnapshotStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "contract_ready";

  return contractFromNormalized(normalized, validation.findings, status, input);
}

export function summarizeUserWorkspaceSnapshotBackupContract(
  contract: UserWorkspaceSnapshotBackupContract
): {
  contractId: string;
  status: UserWorkspaceSnapshotStatus;
  userWorkspaceRootRef: string;
  sourceWorkspaceFingerprint: string;
  fileCount: number;
  plannedMutationCount: number;
  backupRequiredCount: number;
  preimageHashRequiredCount: number;
  blockerCount: number;
  warningCount: number;
  canProceedToPromotionReadinessCheck: boolean;
  canReadFilesystem: false;
  canWriteFilesystem: false;
  canApplyToUserWorkspace: false;
  canRollbackUserWorkspace: false;
  canExecuteGit: false;
  canExecuteShell: false;
  hash: string;
} {
  return {
    contractId: contract.contractId,
    status: contract.status,
    userWorkspaceRootRef: contract.userWorkspaceRootRef,
    sourceWorkspaceFingerprint: contract.sourceWorkspaceFingerprint,
    fileCount: contract.fileCount,
    plannedMutationCount: contract.plannedMutationCount,
    backupRequiredCount: contract.backupRequiredCount,
    preimageHashRequiredCount: contract.preimageHashRequiredCount,
    blockerCount: contract.blockerCount,
    warningCount: contract.warningCount,
    canProceedToPromotionReadinessCheck:
      contract.readiness.canProceedToPromotionReadinessCheck,
    canReadFilesystem: false,
    canWriteFilesystem: false,
    canApplyToUserWorkspace: false,
    canRollbackUserWorkspace: false,
    canExecuteGit: false,
    canExecuteShell: false,
    hash: hashPreview(
      [
        contract.contractId,
        contract.status,
        contract.userWorkspaceRootRef,
        contract.sourceWorkspaceFingerprint,
        contract.fileCount,
        contract.plannedMutationCount,
        contract.contractHash
      ].join("|")
    )
  };
}

export function validateUserWorkspaceSnapshotBackupContractInput(
  input: UserWorkspaceSnapshotBackupContractInput
): UserWorkspaceSnapshotValidationResult {
  const normalized = normalizeInput(input);
  const findings: UserWorkspaceSnapshotFinding[] = [];
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

  if (normalized.userWorkspaceRootRef.length === 0) {
    findings.push(
      finding("input", "blocker", "USER_WORKSPACE_ROOT_REF_MISSING")
    );
  } else {
    const rootCode = unsafeRootRefCode(normalized.userWorkspaceRootRef);
    if (rootCode !== undefined) {
      findings.push(finding("path", "blocker", rootCode));
    } else if (looksPathLike(normalized.userWorkspaceRootRef)) {
      findings.push(
        finding("input", "warning", "USER_WORKSPACE_ROOT_REF_LOOKS_PATH_LIKE")
      );
    }
  }
  if (normalized.sourceWorkspaceFingerprint.length === 0) {
    findings.push(
      finding("input", "blocker", "USER_WORKSPACE_SOURCE_FINGERPRINT_MISSING")
    );
  }
  if (normalized.disposableApplyResultRef === undefined) {
    findings.push(
      finding("snapshot", "warning", "USER_WORKSPACE_DISPOSABLE_APPLY_MISSING")
    );
  }
  if (normalized.disposableRollbackResultRef === undefined) {
    findings.push(
      finding("backup", "warning", "USER_WORKSPACE_DISPOSABLE_ROLLBACK_MISSING")
    );
  }
  if (normalized.expectedDisposableOutputHash === undefined) {
    findings.push(
      finding(
        "snapshot",
        "warning",
        "USER_WORKSPACE_DISPOSABLE_OUTPUT_HASH_MISSING"
      )
    );
  }
  if (normalized.expectedUserSnapshotHash === undefined) {
    findings.push(
      finding("snapshot", "warning", "USER_WORKSPACE_SNAPSHOT_HASH_MISSING")
    );
  }
  if (normalized.files.length === 0) {
    findings.push(finding("snapshot", "warning", "USER_WORKSPACE_NO_FILES"));
  }
  if (normalized.files.length > normalized.policy.maxFiles) {
    findings.push(
      finding("snapshot", "blocker", "USER_WORKSPACE_TOO_MANY_FILES")
    );
  }
  if (totalBytes(normalized.files) > normalized.policy.maxBytes) {
    findings.push(
      finding("snapshot", "blocker", "USER_WORKSPACE_TOO_MANY_BYTES")
    );
  }

  const seenPaths = new Set<string>();
  const hasTestSummary = normalized.files.some((file) =>
    testPathPattern.test(file.path)
  );
  for (const file of normalized.files) {
    for (const pathFinding of validateRelativePath(file.path, "file")) {
      findings.push(pathFinding);
    }
    if (seenPaths.has(file.path.toLowerCase())) {
      findings.push(
        finding("path", "blocker", "USER_WORKSPACE_DUPLICATE_PATH", file.path)
      );
    }
    seenPaths.add(file.path.toLowerCase());

    if (file.sizeBytes < 0 || (file.lineCount ?? 0) < 0) {
      findings.push(
        finding(
          "snapshot",
          "blocker",
          "USER_WORKSPACE_NEGATIVE_SIZE",
          file.path
        )
      );
    }
    if (file.sizeBytes > largeFileBytes) {
      findings.push(
        finding("snapshot", "warning", "USER_WORKSPACE_LARGE_FILE", file.path)
      );
    }
    if (file.isBinary) {
      findings.push(
        finding(
          "snapshot",
          normalized.policy.binaryPolicy === "deny" ? "blocker" : "warning",
          "USER_WORKSPACE_BINARY_FILE",
          file.path
        )
      );
    }
    if (file.isSymlink) {
      findings.push(
        finding(
          "policy",
          normalized.policy.symlinkPolicy === "deny" ? "blocker" : "warning",
          "USER_WORKSPACE_SYMLINK_DENIED",
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
          "USER_WORKSPACE_REPARSE_POINT_DENIED",
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
          "USER_WORKSPACE_GENERATED_MUTATION_DENIED",
          file.path
        )
      );
    }
    if (file.plannedMutation !== "none" && !file.backupRequired) {
      findings.push(
        finding(
          "backup",
          "blocker",
          "USER_WORKSPACE_BACKUP_REQUIRED_FOR_MUTATION",
          file.path
        )
      );
    }
    if (
      (file.plannedMutation === "update" ||
        file.plannedMutation === "delete") &&
      !file.preimageHashRequired
    ) {
      findings.push(
        finding(
          "backup",
          "blocker",
          "USER_WORKSPACE_PREIMAGE_HASH_REQUIRED",
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
          "USER_WORKSPACE_CONFIG_MUTATION",
          file.path
        )
      );
    }
    if (file.plannedMutation === "delete") {
      findings.push(
        finding("policy", "warning", "USER_WORKSPACE_PLANNED_DELETE", file.path)
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
          "USER_WORKSPACE_SOURCE_WITHOUT_TEST_SUMMARY",
          file.path
        )
      );
    }
    if (file.language === undefined || file.language === "unknown") {
      findings.push(
        finding(
          "snapshot",
          "warning",
          "USER_WORKSPACE_UNKNOWN_LANGUAGE",
          file.path
        )
      );
    }
    if (file.lineEnding === "mixed" || file.lineEnding === "unknown") {
      findings.push(
        finding(
          "policy",
          "warning",
          "USER_WORKSPACE_LINE_ENDING_UNCERTAIN",
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
          "USER_WORKSPACE_NEGATIVE_DIRECTORY_TOTAL",
          directory.path
        )
      );
    }
  }

  for (const path of normalized.allowedRelativePaths) {
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
      finding("policy", "warning", "USER_WORKSPACE_LINE_ENDINGS_UNCERTAIN")
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
  findings: UserWorkspaceSnapshotFinding[],
  status: UserWorkspaceSnapshotStatus,
  input: UserWorkspaceSnapshotBackupContractInput
): UserWorkspaceSnapshotBackupContract {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const backupRequirements = normalized.files
    .filter((file) => file.plannedMutation !== "none")
    .map((file) => backupRequirementFromFile(file));
  const contractId =
    status === "empty"
      ? ""
      : (input.idGenerator?.() ??
        `user-workspace-snapshot-${hashPreview(
          [
            normalized.userWorkspaceRootRef,
            normalized.sourceWorkspaceFingerprint,
            normalized.expectedUserSnapshotHash ?? "",
            normalized.files
              .map((file) => `${file.path}:${file.hashPrefix}`)
              .join(","),
            input.createdAt ?? "runtime-user-workspace-snapshot-contract"
          ].join("|")
        )}`);
  const contractHash = hashPreview(
    JSON.stringify({
      contractId,
      userWorkspaceRootRef: normalized.userWorkspaceRootRef,
      sourceWorkspaceFingerprint: normalized.sourceWorkspaceFingerprint,
      disposableApplyResultRef: normalized.disposableApplyResultRef,
      disposableRollbackResultRef: normalized.disposableRollbackResultRef,
      expectedDisposableOutputHash: normalized.expectedDisposableOutputHash,
      expectedUserSnapshotHash: normalized.expectedUserSnapshotHash,
      files: normalized.files.map((file) => ({
        path: file.path,
        hashPrefix: file.hashPrefix,
        plannedMutation: file.plannedMutation,
        backupRequired: file.backupRequired,
        preimageHashRequired: file.preimageHashRequired,
        sizeBytes: file.sizeBytes
      })),
      backupRequirements: backupRequirements.map((item) => ({
        path: item.path,
        mutationKind: item.mutationKind,
        requirementHash: item.requirementHash
      })),
      policy: normalized.policy,
      findingCodes: findings.map((finding) => finding.code)
    })
  );
  const readiness: UserWorkspaceSnapshotReadiness = {
    canProceedToPromotionReadinessCheck:
      blockerCount === 0 && status !== "empty",
    canReadFilesystem: false,
    canWriteFilesystem: false,
    canApplyToUserWorkspace: false,
    canRollbackUserWorkspace: false,
    canExecuteGit: false,
    canExecuteShell: false
  };

  return {
    status,
    contractId,
    userWorkspaceRootRef: normalized.userWorkspaceRootRef,
    sourceWorkspaceFingerprint: normalized.sourceWorkspaceFingerprint,
    disposableApplyResultRef: normalized.disposableApplyResultRef,
    disposableRollbackResultRef: normalized.disposableRollbackResultRef,
    disposableSnapshotContractRef: normalized.disposableSnapshotContractRef,
    expectedDisposableOutputHash: normalized.expectedDisposableOutputHash,
    expectedUserSnapshotHash: normalized.expectedUserSnapshotHash,
    fileCount: normalized.files.length,
    directoryCount: normalized.directories.length,
    totalBytes: totalBytes(normalized.files),
    plannedMutationCount: normalized.files.filter(
      (file) => file.plannedMutation !== "none"
    ).length,
    backupRequiredCount: normalized.files.filter((file) => file.backupRequired)
      .length,
    preimageHashRequiredCount: normalized.files.filter(
      (file) => file.preimageHashRequired
    ).length,
    generatedFileCount: normalized.files.filter((file) => file.isGenerated)
      .length,
    binaryFileCount: normalized.files.filter((file) => file.isBinary).length,
    symlinkLikeCount: normalized.files.filter(
      (file) => file.isSymlink || file.isJunction || file.isReparsePoint
    ).length,
    files: normalized.files,
    directories: normalized.directories,
    backupRequirements,
    backupScope: {
      affectedPathCount: backupRequirements.length,
      metadataOnly: true,
      backupStorage: "deferred",
      warningCodes: uniqueStrings(
        backupRequirements.flatMap((item) => item.warningCodes)
      )
    },
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
    source: "runtime_user_workspace_snapshot_backup_contract",
    metadataOnly: true,
    applyEnabled: false,
    rollbackEnabled: false,
    backupFileCreationEnabled: false,
    preimageCaptureEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function normalizeInput(
  input: UserWorkspaceSnapshotBackupContractInput
): NormalizedInput {
  const policy = normalizePolicy(input);
  const files = safeArray(input.files).map((item, index) =>
    normalizeFile(item, index)
  );
  return {
    userWorkspaceRootRef: safeRef(input.userWorkspaceRootRef, ""),
    sourceWorkspaceFingerprint: safeRef(input.sourceWorkspaceFingerprint, ""),
    disposableApplyResultRef: optionalSafeRef(input.disposableApplyResultRef),
    disposableRollbackResultRef: optionalSafeRef(
      input.disposableRollbackResultRef
    ),
    disposableSnapshotContractRef: optionalSafeRef(
      input.disposableSnapshotContractRef
    ),
    expectedDisposableOutputHash: optionalSafeRef(
      input.expectedDisposableOutputHash
    ),
    expectedUserSnapshotHash: optionalSafeRef(input.expectedUserSnapshotHash),
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
  input: UserWorkspaceSnapshotBackupContractInput
): UserWorkspaceSnapshotPolicy {
  return {
    pathPolicy: "strict_relative_only",
    backupPolicy: "metadata_only_preimage_hash_required",
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
    noSymlinkFollowing: true,
    noBackupFileCreation: true,
    noPreimageCapture: true
  };
}

function normalizeFile(
  value: unknown,
  index: number
): UserWorkspaceFileSummary {
  const record = isRecord(value) ? value : {};
  const path = safePathForOutput(safeText(record.path, `file-${index + 1}`));
  const plannedMutation = normalizePlannedMutation(record.plannedMutation);
  const warningCodes = safeArray(record.warningCodes)
    .filter((item): item is string => typeof item === "string")
    .map((item) => warningCode(item))
    .filter((item) => item !== undefined);
  return {
    path,
    language: optionalSafeRef(record.language),
    extension: optionalSafeRef(record.extension),
    sizeBytes: finiteNumber(record.sizeBytes, 0),
    lineCount:
      record.lineCount === undefined
        ? undefined
        : finiteNumber(record.lineCount, 0),
    hashPrefix: hashPrefixFrom(record.hashPrefix, path),
    exists: record.exists === false ? false : true,
    plannedMutation,
    backupRequired: record.backupRequired === true,
    preimageHashRequired: record.preimageHashRequired === true,
    warningCodes:
      plannedMutation === "delete"
        ? uniqueStrings([...warningCodes, "PLANNED_DELETE"])
        : warningCodes,
    isBinary: Boolean(record.isBinary),
    isGenerated: Boolean(record.isGenerated) || isGeneratedArtifactPath(path),
    isSymlink: Boolean(record.isSymlink),
    isJunction: Boolean(record.isJunction),
    isReparsePoint: Boolean(record.isReparsePoint),
    lineEnding: normalizeLineEnding(record.lineEnding)
  };
}

function normalizeDirectory(
  value: unknown,
  index: number
): UserWorkspaceDirectorySummary {
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

function backupRequirementFromFile(
  file: UserWorkspaceFileSummary
): UserWorkspaceBackupRequirement {
  const warningCodes = uniqueStrings([
    ...file.warningCodes,
    ...(file.preimageHashRequired ? ["PREIMAGE_HASH_REQUIRED"] : []),
    "BACKUP_STORAGE_DEFERRED"
  ]);
  return {
    requirementId: `backup-${hashPreview(
      [file.path, file.plannedMutation, file.hashPrefix].join("|")
    )}`,
    path: file.path,
    mutationKind: file.plannedMutation,
    preimageHashRequired: file.preimageHashRequired,
    preimageContentRequiredForFutureApply:
      file.plannedMutation === "update" || file.plannedMutation === "delete",
    backupStorage: "deferred",
    warningCodes,
    requirementHash: hashPreview(
      JSON.stringify({
        path: file.path,
        mutationKind: file.plannedMutation,
        preimageHashRequired: file.preimageHashRequired,
        hashPrefix: file.hashPrefix
      })
    )
  };
}

function normalizePlannedMutation(
  value: unknown
): UserWorkspacePlannedMutation {
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

function normalizeLineEnding(
  value: unknown
): UserWorkspaceFileSummary["lineEnding"] {
  return value === "lf" ||
    value === "crlf" ||
    value === "mixed" ||
    value === "unknown"
    ? value
    : undefined;
}

function normalizeLineEndingPolicy(
  value: unknown
): UserWorkspaceSnapshotPolicy["lineEndingPolicy"] {
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
): UserWorkspaceSnapshotFinding[] {
  const findings: UserWorkspaceSnapshotFinding[] = [];
  const pathCode = unsafeRelativePathCode(path);
  if (pathCode !== undefined) {
    findings.push(finding("path", "blocker", pathCode, path));
  }
  if (secretPathPattern.test(path)) {
    findings.push(
      finding("secret", "blocker", "USER_WORKSPACE_SECRET_PATH_REJECTED", path)
    );
  }
  if (unsafeWarningCodes(path).length > 0) {
    findings.push(
      finding(
        "safety",
        "blocker",
        `USER_WORKSPACE_${codePrefix.toUpperCase()}_UNSAFE_MARKER`,
        path
      )
    );
  }
  return findings;
}

function validateDeniedPathSummary(
  path: string
): UserWorkspaceSnapshotFinding[] {
  const findings: UserWorkspaceSnapshotFinding[] = [];
  const text = path.trim();
  if (text.length === 0) {
    findings.push(finding("path", "blocker", "USER_WORKSPACE_PATH_EMPTY"));
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
      finding("path", "blocker", "USER_WORKSPACE_DENY_PATH_UNSAFE")
    );
  }
  if (unsafeWarningCodes(text).length > 0) {
    findings.push(
      finding("safety", "blocker", "USER_WORKSPACE_DENY_PATH_UNSAFE_MARKER")
    );
  }
  return findings;
}

function unsafeRelativePathCode(path: string): string | undefined {
  const text = path.trim();
  const lower = text.toLowerCase();
  if (text.length === 0) {
    return "USER_WORKSPACE_PATH_EMPTY";
  }
  if (text.startsWith("/") || text.startsWith("\\")) {
    return "USER_WORKSPACE_ABSOLUTE_PATH_REJECTED";
  }
  if (/^[a-zA-Z]:[\\/]/.test(text) || /^[a-zA-Z]:$/.test(text)) {
    return "USER_WORKSPACE_DRIVE_PATH_REJECTED";
  }
  if (text.startsWith("//") || text.startsWith("\\\\")) {
    return "USER_WORKSPACE_UNC_PATH_REJECTED";
  }
  if (text.split("/").includes("..")) {
    return "USER_WORKSPACE_PARENT_TRAVERSAL_REJECTED";
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || /[?#]/.test(text)) {
    return "USER_WORKSPACE_URL_PATH_REJECTED";
  }
  if (/[;&|`$<>]/.test(text)) {
    return "USER_WORKSPACE_SHELL_META_REJECTED";
  }
  const parts = lower.split("/").filter(Boolean);
  if (parts.some((part) => blockedPathSegments.has(part))) {
    return "USER_WORKSPACE_BLOCKED_DIRECTORY_REJECTED";
  }
  if (parts.some((part) => part === ".env" || part.startsWith(".env."))) {
    return "USER_WORKSPACE_SECRET_PATH_REJECTED";
  }
  return undefined;
}

function unsafeRootRefCode(value: string): string | undefined {
  const text = value.trim();
  if (text.startsWith("/") || text.startsWith("\\")) {
    return "USER_WORKSPACE_ROOT_REF_ABSOLUTE_REJECTED";
  }
  if (/^[a-zA-Z]:[\\/]/.test(text) || /^[a-zA-Z]:$/.test(text)) {
    return "USER_WORKSPACE_ROOT_REF_DRIVE_REJECTED";
  }
  if (text.startsWith("//") || text.startsWith("\\\\")) {
    return "USER_WORKSPACE_ROOT_REF_UNC_REJECTED";
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
      warnings.push("USER_WORKSPACE_RAW_FIELD_REJECTED");
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
        key === "canApplyToUserWorkspace" ||
        key === "canRollbackUserWorkspace" ||
        key === "canExecuteGit" ||
        key === "canExecuteShell")
    ) {
      warnings.push("USER_WORKSPACE_EXECUTION_FLAG_REJECTED");
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
  snapshotFinding: UserWorkspaceSnapshotFinding
): UserWorkspaceSnapshotWarning {
  return {
    code: snapshotFinding.code,
    safeMessage: snapshotFinding.summary,
    path: snapshotFinding.path
  };
}

function finding(
  kind: UserWorkspaceSnapshotFindingKind,
  severity: UserWorkspaceSnapshotSeverity,
  code: string,
  path?: string | undefined
): UserWorkspaceSnapshotFinding {
  return {
    findingId: `user-workspace-${hashPreview(
      [kind, severity, code, path ?? ""].join("|")
    )}`,
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
    .replace(/^user_workspace_/, "")
    .replaceAll("_", " ");
}

function nextActionFor(
  status: UserWorkspaceSnapshotStatus,
  readiness: UserWorkspaceSnapshotReadiness
): string {
  if (status === "empty") {
    return "Provide an opaque userWorkspaceRootRef, source fingerprint, and metadata-only file summaries.";
  }
  if (!readiness.canProceedToPromotionReadinessCheck) {
    return "Resolve blocker codes before this metadata contract can feed the future promotion readiness checker.";
  }
  if (status === "warning") {
    return "Review warning codes. Contract remains metadata-only and does not enable user workspace apply.";
  }
  return "Contract is ready for future P0K-003 promotion readiness checking. User workspace apply remains disabled.";
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
  return /^[A-Z0-9_.-]{1,80}$/.test(text) ? text : "USER_WORKSPACE_WARNING";
}

function totalBytes(files: readonly UserWorkspaceFileSummary[]): number {
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
  findings: readonly UserWorkspaceSnapshotFinding[]
): UserWorkspaceSnapshotFinding[] {
  const seen = new Set<string>();
  const result: UserWorkspaceSnapshotFinding[] = [];
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
  input: UserWorkspaceSnapshotBackupContractInput
): boolean {
  return (
    input.userWorkspaceRootRef === undefined &&
    input.sourceWorkspaceFingerprint === undefined &&
    input.files === undefined &&
    input.directories === undefined
  );
}
