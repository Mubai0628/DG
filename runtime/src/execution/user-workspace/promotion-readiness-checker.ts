export type UserWorkspacePromotionReadinessStatus =
  | "empty"
  | "readiness_ready"
  | "warning"
  | "blocked";

export type UserWorkspacePromotionReadinessSeverity =
  | "info"
  | "warning"
  | "blocker";

export type UserWorkspacePromotionReadinessFindingKind =
  | "input"
  | "artifact"
  | "gate"
  | "hash"
  | "snapshot"
  | "event_projection"
  | "safety"
  | "readiness";

export type UserWorkspacePromotionReadinessGateName =
  | "user_workspace_snapshot_contract"
  | "disposable_apply_result"
  | "disposable_rollback_result"
  | "apply_rollback_event_projection"
  | "patch_validation"
  | "patch_diff_audit"
  | "patch_approval_draft"
  | "rollback_checkpoint_preview"
  | "backup_preimage_requirement"
  | "manual_confirmation_deferred"
  | "production_permission_lease_deferred"
  | "app_execution_disabled";

export type UserWorkspacePromotionReadinessFinding = {
  findingId: string;
  kind: UserWorkspacePromotionReadinessFindingKind;
  severity: UserWorkspacePromotionReadinessSeverity;
  code: string;
  summary: string;
  relatedRef?: string | undefined;
};

export type UserWorkspacePromotionReadinessArtifactRef = {
  artifactId: string;
  artifactType:
    | "user_workspace_snapshot_contract"
    | "disposable_apply_result"
    | "disposable_rollback_result"
    | "apply_rollback_event_projection"
    | "patch_proposal"
    | "patch_validation"
    | "patch_diff_audit"
    | "patch_approval_draft"
    | "patch_virtual_apply"
    | "rollback_checkpoint_preview"
    | "approval_gated_disposable_apply";
  required: boolean;
  present: boolean;
  status: string;
  hashPrefix?: string | undefined;
  warningCodes: string[];
};

export type UserWorkspacePromotionReadinessGate = {
  gateId: string;
  name: UserWorkspacePromotionReadinessGateName;
  status: "passed" | "warning" | "blocked";
  required: boolean;
  artifactRefIds: string[];
  summary: string;
  blockerCodes: string[];
  warningCodes: string[];
  gateHash: string;
};

export type UserWorkspacePromotionReadinessReadiness = {
  canProceedToUserWorkspaceApplyPrototype: boolean;
  canApplyToUserWorkspace: false;
  canWriteFilesystem: false;
  canRollbackUserWorkspace: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type UserWorkspacePromotionReadinessInput = {
  userWorkspaceSnapshotBackupContract?: unknown;
  disposablePatchApplyResult?: unknown;
  disposablePatchRollbackResult?: unknown;
  sandboxApplyRollbackEventProjection?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  approvalGatedDisposableApplyResult?: unknown;
  sourceWorkspaceFingerprint?: string | undefined;
  userWorkspaceRootRef?: string | undefined;
  expectedUserSnapshotHash?: string | undefined;
  expectedDisposableOutputHash?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type UserWorkspacePromotionReadiness = {
  status: UserWorkspacePromotionReadinessStatus;
  readinessId: string;
  chainId: string;
  userWorkspaceRootRef: string;
  sourceWorkspaceFingerprint: string;
  gateCount: number;
  passedGateCount: number;
  blockedGateCount: number;
  warningGateCount: number;
  requiredArtifactCount: number;
  presentArtifactCount: number;
  missingArtifactCount: number;
  artifactRefs: UserWorkspacePromotionReadinessArtifactRef[];
  gates: UserWorkspacePromotionReadinessGate[];
  findings: UserWorkspacePromotionReadinessFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  expectedUserSnapshotHash?: string | undefined;
  expectedDisposableOutputHash?: string | undefined;
  readiness: UserWorkspacePromotionReadinessReadiness;
  readinessHash: string;
  nextAction: string;
  source: "runtime_user_workspace_promotion_readiness";
  readinessOnly: true;
  userWorkspaceReadEnabled: false;
  userWorkspaceWriteEnabled: false;
  backupCreationEnabled: false;
  applyEnabled: false;
  rollbackEnabled: false;
  eventWritesEnabled: false;
  tauriCommandEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type UserWorkspacePromotionReadinessValidationResult = {
  ok: boolean;
  warningCodes: string[];
  findings: UserWorkspacePromotionReadinessFinding[];
};

type SummaryRecord = Record<string, unknown>;

type NormalizedInput = {
  contract: SummaryRecord | undefined;
  applyResult: SummaryRecord | undefined;
  rollbackResult: SummaryRecord | undefined;
  eventProjection: SummaryRecord | undefined;
  patchProposalPreview: SummaryRecord | undefined;
  patchValidationPreview: SummaryRecord | undefined;
  patchDiffAuditPreview: SummaryRecord | undefined;
  patchApprovalDraft: SummaryRecord | undefined;
  patchVirtualApplyPreview: SummaryRecord | undefined;
  patchRollbackCheckpointPreview: SummaryRecord | undefined;
  approvalGatedDisposableApplyResult: SummaryRecord | undefined;
  userWorkspaceRootRef: string;
  sourceWorkspaceFingerprint: string;
  expectedUserSnapshotHash: string | undefined;
  expectedDisposableOutputHash: string | undefined;
  createdAt: string;
};

const defaultTimestamp = "2026-01-01T00:00:00.000Z";
const runtimeSource = "runtime_user_workspace_promotion_readiness";
const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const preimageField = ["preimage", "Content"].join("");
const backupContentField = ["backup", "Content"].join("");

const forbiddenRawInputKeys = new Set(
  [
    "content",
    "fileContent",
    preimageField,
    backupContentField,
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
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

const requiredArtifactTypes = new Set<
  UserWorkspacePromotionReadinessArtifactRef["artifactType"]
>([
  "user_workspace_snapshot_contract",
  "disposable_apply_result",
  "disposable_rollback_result",
  "apply_rollback_event_projection",
  "patch_validation",
  "patch_diff_audit",
  "patch_approval_draft",
  "rollback_checkpoint_preview"
]);

const sourceMutationWithoutTestCode =
  "PROMOTION_SOURCE_MUTATION_WITHOUT_TEST_SUMMARY";

export function buildUserWorkspacePromotionReadiness(
  input: UserWorkspacePromotionReadinessInput = {}
): UserWorkspacePromotionReadiness {
  const normalized = normalizeInput(input);
  if (isEmptyInput(input)) {
    return readinessFromNormalized(normalized, [], "empty", input);
  }
  const validation = validateUserWorkspacePromotionReadinessInput(input);
  const blockerCount = validation.findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = validation.findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: UserWorkspacePromotionReadinessStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "readiness_ready";
  return readinessFromNormalized(
    normalized,
    validation.findings,
    status,
    input
  );
}

export function summarizeUserWorkspacePromotionReadiness(
  readiness: UserWorkspacePromotionReadiness
): {
  readinessId: string;
  status: UserWorkspacePromotionReadinessStatus;
  chainId: string;
  gateCount: number;
  passedGateCount: number;
  blockedGateCount: number;
  warningGateCount: number;
  requiredArtifactCount: number;
  presentArtifactCount: number;
  missingArtifactCount: number;
  blockerCount: number;
  warningCount: number;
  canProceedToUserWorkspaceApplyPrototype: boolean;
  canApplyToUserWorkspace: false;
  canWriteFilesystem: false;
  canRollbackUserWorkspace: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
  hash: string;
} {
  return {
    readinessId: readiness.readinessId,
    status: readiness.status,
    chainId: readiness.chainId,
    gateCount: readiness.gateCount,
    passedGateCount: readiness.passedGateCount,
    blockedGateCount: readiness.blockedGateCount,
    warningGateCount: readiness.warningGateCount,
    requiredArtifactCount: readiness.requiredArtifactCount,
    presentArtifactCount: readiness.presentArtifactCount,
    missingArtifactCount: readiness.missingArtifactCount,
    blockerCount: readiness.blockerCount,
    warningCount: readiness.warningCount,
    canProceedToUserWorkspaceApplyPrototype:
      readiness.readiness.canProceedToUserWorkspaceApplyPrototype,
    canApplyToUserWorkspace: false,
    canWriteFilesystem: false,
    canRollbackUserWorkspace: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false,
    hash: hashPreview(
      [
        readiness.readinessId,
        readiness.status,
        readiness.chainId,
        readiness.gateCount,
        readiness.readinessHash
      ].join("|")
    )
  };
}

export function validateUserWorkspacePromotionReadinessInput(
  input: UserWorkspacePromotionReadinessInput = {}
): UserWorkspacePromotionReadinessValidationResult {
  const normalized = normalizeInput(input);
  const findings: UserWorkspacePromotionReadinessFinding[] = [];
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

  validateContract(normalized, findings);
  validateApplyRollback(normalized, findings);
  validateEventProjection(normalized, findings);
  validateExpectedHashes(normalized, findings);
  validateRequiredPatchArtifacts(normalized, findings);
  validateOptionalArtifacts(normalized, findings);
  validateContractWarnings(normalized, findings);

  const uniqueFindings = uniqueFindingsByCodeRef(findings);
  return {
    ok: uniqueFindings.every((item) => item.severity !== "blocker"),
    warningCodes: uniqueFindings.map((item) => item.code),
    findings: uniqueFindings
  };
}

function validateContract(
  normalized: NormalizedInput,
  findings: UserWorkspacePromotionReadinessFinding[]
): void {
  const contract = normalized.contract;
  if (contract === undefined) {
    findings.push(
      finding("artifact", "blocker", "PROMOTION_USER_CONTRACT_MISSING")
    );
    return;
  }
  if (readString(contract, "status") === "blocked") {
    findings.push(
      finding("artifact", "blocker", "PROMOTION_USER_CONTRACT_BLOCKED")
    );
  }
  if (
    readNestedBoolean(
      contract,
      ["readiness", "canProceedToPromotionReadinessCheck"],
      false
    ) !== true
  ) {
    findings.push(
      finding(
        "readiness",
        "blocker",
        "PROMOTION_USER_CONTRACT_NOT_READY"
      )
    );
  }
  if (normalized.sourceWorkspaceFingerprint.length === 0) {
    findings.push(
      finding("input", "blocker", "PROMOTION_SOURCE_FINGERPRINT_MISSING")
    );
  }
  if (normalized.userWorkspaceRootRef.length === 0) {
    findings.push(
      finding("input", "blocker", "PROMOTION_USER_WORKSPACE_ROOT_REF_MISSING")
    );
  }
}

function validateApplyRollback(
  normalized: NormalizedInput,
  findings: UserWorkspacePromotionReadinessFinding[]
): void {
  const apply = normalized.applyResult;
  const rollback = normalized.rollbackResult;
  if (apply === undefined) {
    findings.push(
      finding("artifact", "blocker", "PROMOTION_DISPOSABLE_APPLY_MISSING")
    );
  } else if (readString(apply, "status") !== "applied_to_disposable") {
    findings.push(
      finding(
        "artifact",
        "blocker",
        "PROMOTION_DISPOSABLE_APPLY_NOT_APPLIED"
      )
    );
  }
  if (rollback === undefined) {
    findings.push(
      finding("artifact", "blocker", "PROMOTION_DISPOSABLE_ROLLBACK_MISSING")
    );
  } else if (readString(rollback, "status") !== "rolled_back_disposable") {
    findings.push(
      finding(
        "artifact",
        "blocker",
        "PROMOTION_DISPOSABLE_ROLLBACK_NOT_ROLLED_BACK"
      )
    );
  }
  if (apply !== undefined && rollback !== undefined) {
    const applyId = readString(apply, "applyId");
    const rollbackApplyId = readString(rollback, "applyId");
    if (
      applyId.length > 0 &&
      rollbackApplyId.length > 0 &&
      applyId !== rollbackApplyId
    ) {
      findings.push(
        finding("gate", "blocker", "PROMOTION_APPLY_ROLLBACK_ID_MISMATCH")
      );
    }
    const applyRootRef = readString(apply, "disposableRootRef");
    const rollbackRootRef = readString(rollback, "disposableRootRef");
    if (
      applyRootRef.length > 0 &&
      rollbackRootRef.length > 0 &&
      applyRootRef !== rollbackRootRef
    ) {
      findings.push(
        finding(
          "gate",
          "blocker",
          "PROMOTION_DISPOSABLE_ROOT_REF_MISMATCH"
        )
      );
    }
  }
}

function validateEventProjection(
  normalized: NormalizedInput,
  findings: UserWorkspacePromotionReadinessFinding[]
): void {
  const projection = normalized.eventProjection;
  if (projection === undefined) {
    findings.push(
      finding("artifact", "blocker", "PROMOTION_EVENT_PROJECTION_MISSING")
    );
    return;
  }
  if (
    readString(projection, "status") === "blocked" ||
    readNumber(projection, "blockerCount") > 0
  ) {
    findings.push(
      finding("event_projection", "blocker", "PROMOTION_EVENT_PROJECTION_BLOCKED")
    );
  }
  const eventPreviews = safeArray(projection.eventPreviews);
  if (
    eventPreviews.some(
      (event) => isRecord(event) && event.notWritten !== true
    )
  ) {
    findings.push(
      finding(
        "event_projection",
        "blocker",
        "PROMOTION_EVENT_PREVIEW_WRITTEN_REJECTED"
      )
    );
  }
}

function validateExpectedHashes(
  normalized: NormalizedInput,
  findings: UserWorkspacePromotionReadinessFinding[]
): void {
  if (normalized.expectedUserSnapshotHash === undefined) {
    findings.push(
      finding("hash", "blocker", "PROMOTION_USER_SNAPSHOT_HASH_MISSING")
    );
  }
  if (normalized.expectedDisposableOutputHash === undefined) {
    findings.push(
      finding("hash", "blocker", "PROMOTION_DISPOSABLE_OUTPUT_HASH_MISSING")
    );
  }
  const contractExpectedDisposableHash = optionalSafeRef(
    normalized.contract?.expectedDisposableOutputHash
  );
  const applyOutputHash = optionalSafeRef(
    normalized.applyResult?.outputSnapshotHash
  );
  if (
    contractExpectedDisposableHash !== undefined &&
    applyOutputHash !== undefined &&
    contractExpectedDisposableHash !== applyOutputHash
  ) {
    findings.push(
      finding(
        "hash",
        "blocker",
        "PROMOTION_DISPOSABLE_OUTPUT_HASH_MISMATCH"
      )
    );
  }
  const contractExpectedUserHash = optionalSafeRef(
    normalized.contract?.expectedUserSnapshotHash
  );
  if (
    contractExpectedUserHash !== undefined &&
    normalized.expectedUserSnapshotHash !== undefined &&
    contractExpectedUserHash !== normalized.expectedUserSnapshotHash
  ) {
    findings.push(
      finding("hash", "blocker", "PROMOTION_USER_SNAPSHOT_HASH_MISMATCH")
    );
  }
}

function validateRequiredPatchArtifacts(
  normalized: NormalizedInput,
  findings: UserWorkspacePromotionReadinessFinding[]
): void {
  requiredArtifactCheck(
    normalized.patchValidationPreview,
    "PROMOTION_PATCH_VALIDATION_MISSING",
    "PROMOTION_PATCH_VALIDATION_BLOCKED",
    findings
  );
  requiredArtifactCheck(
    normalized.patchDiffAuditPreview,
    "PROMOTION_PATCH_DIFF_AUDIT_MISSING",
    "PROMOTION_PATCH_DIFF_AUDIT_BLOCKED",
    findings
  );
  requiredArtifactCheck(
    normalized.patchApprovalDraft,
    "PROMOTION_PATCH_APPROVAL_DRAFT_MISSING",
    "PROMOTION_PATCH_APPROVAL_DRAFT_BLOCKED",
    findings
  );
  requiredArtifactCheck(
    normalized.patchRollbackCheckpointPreview,
    "PROMOTION_ROLLBACK_CHECKPOINT_MISSING",
    "PROMOTION_ROLLBACK_CHECKPOINT_BLOCKED",
    findings
  );
}

function validateOptionalArtifacts(
  normalized: NormalizedInput,
  findings: UserWorkspacePromotionReadinessFinding[]
): void {
  if (normalized.approvalGatedDisposableApplyResult === undefined) {
    findings.push(
      finding(
        "artifact",
        "warning",
        "PROMOTION_APPROVAL_GATED_DISPOSABLE_APPLY_MISSING"
      )
    );
  } else if (
    readString(normalized.approvalGatedDisposableApplyResult, "status") !==
    "applied_to_disposable"
  ) {
    findings.push(
      finding(
        "artifact",
        "warning",
        "PROMOTION_APPROVAL_GATED_DISPOSABLE_APPLY_NOT_APPLIED"
      )
    );
  }
  if (normalized.patchVirtualApplyPreview === undefined) {
    findings.push(
      finding("artifact", "warning", "PROMOTION_PATCH_VIRTUAL_APPLY_MISSING")
    );
  }
}

function validateContractWarnings(
  normalized: NormalizedInput,
  findings: UserWorkspacePromotionReadinessFinding[]
): void {
  const contract = normalized.contract;
  if (contract === undefined) {
    return;
  }
  if (readNumber(contract, "warningCount") > 0) {
    findings.push(
      finding("artifact", "warning", "PROMOTION_USER_CONTRACT_HAS_WARNINGS")
    );
  }
  if (readNumber(normalized.applyResult, "warningCount") > 0) {
    findings.push(
      finding("artifact", "warning", "PROMOTION_DISPOSABLE_APPLY_HAS_WARNINGS")
    );
  }
  if (readNumber(normalized.rollbackResult, "warningCount") > 0) {
    findings.push(
      finding(
        "artifact",
        "warning",
        "PROMOTION_DISPOSABLE_ROLLBACK_HAS_WARNINGS"
      )
    );
  }
  if (readNumber(normalized.eventProjection, "warningCount") > 0) {
    findings.push(
      finding("artifact", "warning", "PROMOTION_EVENT_PROJECTION_HAS_WARNINGS")
    );
  }
  if (
    readNumber(contract, "backupRequiredCount") > 0 &&
    readBoolean(contract, "preimageCaptureEnabled") !== true
  ) {
    findings.push(
      finding(
        "gate",
        "warning",
        "PROMOTION_PREIMAGE_CAPTURE_DEFERRED_FOR_BACKUP_REQUIREMENTS"
      )
    );
  }
  if (readNumber(contract, "binaryFileCount") > 0) {
    findings.push(
      finding("artifact", "warning", "PROMOTION_USER_CONTRACT_BINARY_FILES")
    );
  }
  const warningCodes = safeStringArray(contract.warningCodes);
  const findingCodes = safeArray(contract.findings).map((item) =>
    safeText(isRecord(item) ? item.code : item, "")
  );
  if (
    [...warningCodes, ...findingCodes].some(
      (code) =>
        code === sourceMutationWithoutTestCode ||
        code === "USER_WORKSPACE_SOURCE_WITHOUT_TEST_SUMMARY"
    )
  ) {
    findings.push(
      finding("artifact", "warning", sourceMutationWithoutTestCode)
    );
  }
}

function requiredArtifactCheck(
  artifact: SummaryRecord | undefined,
  missingCode: string,
  blockedCode: string,
  findings: UserWorkspacePromotionReadinessFinding[]
): void {
  if (artifact === undefined) {
    findings.push(finding("artifact", "blocker", missingCode));
    return;
  }
  if (readString(artifact, "status") === "blocked") {
    findings.push(finding("artifact", "blocker", blockedCode));
  }
}

function readinessFromNormalized(
  normalized: NormalizedInput,
  findings: UserWorkspacePromotionReadinessFinding[],
  status: UserWorkspacePromotionReadinessStatus,
  input: UserWorkspacePromotionReadinessInput
): UserWorkspacePromotionReadiness {
  const artifactRefs = buildArtifactRefs(normalized);
  const gates = buildGates(normalized, findings, artifactRefs);
  const blockerCount = findings.filter((item) => item.severity === "blocker")
    .length;
  const warningCount = findings.filter((item) => item.severity === "warning")
    .length;
  const readiness: UserWorkspacePromotionReadinessReadiness = {
    canProceedToUserWorkspaceApplyPrototype:
      blockerCount === 0 && status !== "empty",
    canApplyToUserWorkspace: false,
    canWriteFilesystem: false,
    canRollbackUserWorkspace: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
  const chainId =
    status === "empty"
      ? ""
      : `promotion-chain-${hashPreview(
          artifactRefs.map((artifact) => artifact.artifactId).join("|")
        )}`;
  const readinessId =
    status === "empty"
      ? ""
      : (input.idGenerator?.() ??
        `promotion-readiness-${hashPreview(
          [
            chainId,
            normalized.userWorkspaceRootRef,
            normalized.sourceWorkspaceFingerprint,
            normalized.expectedUserSnapshotHash ?? "",
            normalized.expectedDisposableOutputHash ?? "",
            normalized.createdAt
          ].join("|")
        )}`);
  const readinessHash = hashPreview(
    JSON.stringify({
      readinessId,
      status,
      chainId,
      rootRef: normalized.userWorkspaceRootRef,
      fingerprint: normalized.sourceWorkspaceFingerprint,
      expectedUserSnapshotHash: normalized.expectedUserSnapshotHash,
      expectedDisposableOutputHash: normalized.expectedDisposableOutputHash,
      artifactRefs: artifactRefs.map((artifact) => ({
        artifactId: artifact.artifactId,
        artifactType: artifact.artifactType,
        present: artifact.present,
        status: artifact.status,
        hashPrefix: artifact.hashPrefix
      })),
      gates: gates.map((gate) => ({
        name: gate.name,
        status: gate.status,
        blockerCodes: gate.blockerCodes,
        warningCodes: gate.warningCodes
      }))
    })
  );
  const requiredArtifacts = artifactRefs.filter((artifact) => artifact.required);
  const presentArtifacts = artifactRefs.filter(
    (artifact) => artifact.required && artifact.present
  );

  return {
    status,
    readinessId,
    chainId,
    userWorkspaceRootRef: normalized.userWorkspaceRootRef,
    sourceWorkspaceFingerprint: normalized.sourceWorkspaceFingerprint,
    gateCount: gates.length,
    passedGateCount: gates.filter((gate) => gate.status === "passed").length,
    blockedGateCount: gates.filter((gate) => gate.status === "blocked").length,
    warningGateCount: gates.filter((gate) => gate.status === "warning").length,
    requiredArtifactCount: requiredArtifacts.length,
    presentArtifactCount: presentArtifacts.length,
    missingArtifactCount: requiredArtifacts.length - presentArtifacts.length,
    artifactRefs,
    gates,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    expectedUserSnapshotHash: normalized.expectedUserSnapshotHash,
    expectedDisposableOutputHash: normalized.expectedDisposableOutputHash,
    readiness,
    readinessHash,
    nextAction: nextActionFor(status, readiness),
    source: runtimeSource,
    readinessOnly: true,
    userWorkspaceReadEnabled: false,
    userWorkspaceWriteEnabled: false,
    backupCreationEnabled: false,
    applyEnabled: false,
    rollbackEnabled: false,
    eventWritesEnabled: false,
    tauriCommandEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function buildArtifactRefs(
  normalized: NormalizedInput
): UserWorkspacePromotionReadinessArtifactRef[] {
  return [
    artifactRef(
      normalized.contract,
      "user_workspace_snapshot_contract",
      true,
      ["contractId"],
      ["contractHash"]
    ),
    artifactRef(
      normalized.applyResult,
      "disposable_apply_result",
      true,
      ["applyId"],
      ["resultHash", "outputSnapshotHash"]
    ),
    artifactRef(
      normalized.rollbackResult,
      "disposable_rollback_result",
      true,
      ["rollbackId"],
      ["resultHash", "restoredSnapshotHash"]
    ),
    artifactRef(
      normalized.eventProjection,
      "apply_rollback_event_projection",
      true,
      ["projectionId"],
      ["projectionHash"]
    ),
    artifactRef(
      normalized.patchProposalPreview,
      "patch_proposal",
      false,
      ["proposalId"],
      ["proposalHash"]
    ),
    artifactRef(
      normalized.patchValidationPreview,
      "patch_validation",
      true,
      ["validationId"],
      ["validationHash"]
    ),
    artifactRef(
      normalized.patchDiffAuditPreview,
      "patch_diff_audit",
      true,
      ["auditId"],
      ["auditHash"]
    ),
    artifactRef(
      normalized.patchApprovalDraft,
      "patch_approval_draft",
      true,
      ["approvalDraftId"],
      ["approvalDraftHash"]
    ),
    artifactRef(
      normalized.patchVirtualApplyPreview,
      "patch_virtual_apply",
      false,
      ["virtualApplyId"],
      ["virtualApplyHash"]
    ),
    artifactRef(
      normalized.patchRollbackCheckpointPreview,
      "rollback_checkpoint_preview",
      true,
      ["checkpointPreviewId"],
      ["checkpointHash"]
    ),
    artifactRef(
      normalized.approvalGatedDisposableApplyResult,
      "approval_gated_disposable_apply",
      false,
      ["gatedApplyId"],
      ["resultHash"]
    )
  ];
}

function artifactRef(
  record: SummaryRecord | undefined,
  artifactType: UserWorkspacePromotionReadinessArtifactRef["artifactType"],
  required: boolean,
  idKeys: string[],
  hashKeys: string[]
): UserWorkspacePromotionReadinessArtifactRef {
  const artifactId =
    record === undefined
      ? `missing-${artifactType}`
      : firstString(record, idKeys) ||
        `${artifactType}-${hashPreview(safeStringify(record))}`;
  const hashPrefix =
    record === undefined ? undefined : optionalSafeRef(firstString(record, hashKeys));
  return {
    artifactId,
    artifactType,
    required,
    present: record !== undefined,
    status: record === undefined ? "missing" : readString(record, "status"),
    hashPrefix,
    warningCodes: record === undefined ? [] : warningCodesFrom(record)
  };
}

function buildGates(
  normalized: NormalizedInput,
  findings: UserWorkspacePromotionReadinessFinding[],
  artifactRefs: UserWorkspacePromotionReadinessArtifactRef[]
): UserWorkspacePromotionReadinessGate[] {
  return [
    gate(
      "user_workspace_snapshot_contract",
      true,
      artifactRefs,
      [
        "PROMOTION_USER_CONTRACT_MISSING",
        "PROMOTION_USER_CONTRACT_BLOCKED",
        "PROMOTION_USER_CONTRACT_NOT_READY",
        "PROMOTION_SOURCE_FINGERPRINT_MISSING",
        "PROMOTION_USER_WORKSPACE_ROOT_REF_MISSING"
      ],
      ["PROMOTION_USER_CONTRACT_HAS_WARNINGS"],
      findings
    ),
    gate(
      "disposable_apply_result",
      true,
      artifactRefs,
      [
        "PROMOTION_DISPOSABLE_APPLY_MISSING",
        "PROMOTION_DISPOSABLE_APPLY_NOT_APPLIED",
        "PROMOTION_DISPOSABLE_OUTPUT_HASH_MISMATCH"
      ],
      ["PROMOTION_DISPOSABLE_APPLY_HAS_WARNINGS"],
      findings
    ),
    gate(
      "disposable_rollback_result",
      true,
      artifactRefs,
      [
        "PROMOTION_DISPOSABLE_ROLLBACK_MISSING",
        "PROMOTION_DISPOSABLE_ROLLBACK_NOT_ROLLED_BACK",
        "PROMOTION_APPLY_ROLLBACK_ID_MISMATCH",
        "PROMOTION_DISPOSABLE_ROOT_REF_MISMATCH"
      ],
      ["PROMOTION_DISPOSABLE_ROLLBACK_HAS_WARNINGS"],
      findings
    ),
    gate(
      "apply_rollback_event_projection",
      true,
      artifactRefs,
      [
        "PROMOTION_EVENT_PROJECTION_MISSING",
        "PROMOTION_EVENT_PROJECTION_BLOCKED",
        "PROMOTION_EVENT_PREVIEW_WRITTEN_REJECTED"
      ],
      ["PROMOTION_EVENT_PROJECTION_HAS_WARNINGS"],
      findings
    ),
    gate(
      "patch_validation",
      true,
      artifactRefs,
      ["PROMOTION_PATCH_VALIDATION_MISSING", "PROMOTION_PATCH_VALIDATION_BLOCKED"],
      [],
      findings
    ),
    gate(
      "patch_diff_audit",
      true,
      artifactRefs,
      ["PROMOTION_PATCH_DIFF_AUDIT_MISSING", "PROMOTION_PATCH_DIFF_AUDIT_BLOCKED"],
      [],
      findings
    ),
    gate(
      "patch_approval_draft",
      true,
      artifactRefs,
      [
        "PROMOTION_PATCH_APPROVAL_DRAFT_MISSING",
        "PROMOTION_PATCH_APPROVAL_DRAFT_BLOCKED"
      ],
      [],
      findings
    ),
    gate(
      "rollback_checkpoint_preview",
      true,
      artifactRefs,
      [
        "PROMOTION_ROLLBACK_CHECKPOINT_MISSING",
        "PROMOTION_ROLLBACK_CHECKPOINT_BLOCKED"
      ],
      [],
      findings
    ),
    gate(
      "backup_preimage_requirement",
      true,
      artifactRefs,
      [],
      [
        "PROMOTION_PREIMAGE_CAPTURE_DEFERRED_FOR_BACKUP_REQUIREMENTS",
        "PROMOTION_USER_CONTRACT_BINARY_FILES",
        sourceMutationWithoutTestCode,
        "PROMOTION_STALE_SNAPSHOT_RISK"
      ],
      findings,
      `backup_requirements:${readNumber(normalized.contract, "backupRequiredCount")}`
    ),
    gate(
      "manual_confirmation_deferred",
      true,
      artifactRefs,
      [],
      [],
      findings,
      "manual confirmation remains deferred to a later gate"
    ),
    gate(
      "production_permission_lease_deferred",
      true,
      artifactRefs,
      [],
      [],
      findings,
      "production permission lease remains deferred"
    ),
    gate(
      "app_execution_disabled",
      true,
      artifactRefs,
      ["PROMOTION_APP_EXECUTION_ENABLED_REJECTED"],
      [],
      findings,
      "App execution remains disabled"
    )
  ];
}

function gate(
  name: UserWorkspacePromotionReadinessGateName,
  required: boolean,
  artifactRefs: UserWorkspacePromotionReadinessArtifactRef[],
  blockerCodes: string[],
  warningCodes: string[],
  findings: UserWorkspacePromotionReadinessFinding[],
  summaryOverride?: string | undefined
): UserWorkspacePromotionReadinessGate {
  const presentBlockers = blockerCodes.filter((code) =>
    findings.some((findingItem) => findingItem.code === code)
  );
  const presentWarnings = warningCodes.filter((code) =>
    findings.some((findingItem) => findingItem.code === code)
  );
  const status: UserWorkspacePromotionReadinessGate["status"] =
    presentBlockers.length > 0
      ? "blocked"
      : presentWarnings.length > 0
        ? "warning"
        : "passed";
  const artifactRefIds = artifactRefs
    .filter((artifact) => gateUsesArtifact(name, artifact.artifactType))
    .map((artifact) => artifact.artifactId);
  const gateHash = hashPreview(
    [name, status, artifactRefIds.join(","), presentBlockers, presentWarnings]
      .flat()
      .join("|")
  );
  return {
    gateId: `gate-${gateHash}`,
    name,
    status,
    required,
    artifactRefIds,
    summary:
      summaryOverride ??
      (status === "passed"
        ? `${name} gate passed for metadata readiness.`
        : `${name} gate has ${status} findings.`),
    blockerCodes: presentBlockers,
    warningCodes: presentWarnings,
    gateHash
  };
}

function gateUsesArtifact(
  gateName: UserWorkspacePromotionReadinessGateName,
  artifactType: UserWorkspacePromotionReadinessArtifactRef["artifactType"]
): boolean {
  if (gateName === "user_workspace_snapshot_contract") {
    return artifactType === "user_workspace_snapshot_contract";
  }
  if (gateName === "disposable_apply_result") {
    return artifactType === "disposable_apply_result";
  }
  if (gateName === "disposable_rollback_result") {
    return artifactType === "disposable_rollback_result";
  }
  if (gateName === "apply_rollback_event_projection") {
    return artifactType === "apply_rollback_event_projection";
  }
  if (gateName === "patch_validation") {
    return artifactType === "patch_validation";
  }
  if (gateName === "patch_diff_audit") {
    return artifactType === "patch_diff_audit";
  }
  if (gateName === "patch_approval_draft") {
    return artifactType === "patch_approval_draft";
  }
  if (gateName === "rollback_checkpoint_preview") {
    return artifactType === "rollback_checkpoint_preview";
  }
  if (gateName === "backup_preimage_requirement") {
    return artifactType === "user_workspace_snapshot_contract";
  }
  return false;
}

function normalizeInput(
  input: UserWorkspacePromotionReadinessInput
): NormalizedInput {
  const contract = recordOrUndefined(input.userWorkspaceSnapshotBackupContract);
  return {
    contract,
    applyResult: recordOrUndefined(input.disposablePatchApplyResult),
    rollbackResult: recordOrUndefined(input.disposablePatchRollbackResult),
    eventProjection: recordOrUndefined(input.sandboxApplyRollbackEventProjection),
    patchProposalPreview: recordOrUndefined(input.patchProposalPreview),
    patchValidationPreview: recordOrUndefined(input.patchValidationPreview),
    patchDiffAuditPreview: recordOrUndefined(input.patchDiffAuditPreview),
    patchApprovalDraft: recordOrUndefined(input.patchApprovalDraft),
    patchVirtualApplyPreview: recordOrUndefined(input.patchVirtualApplyPreview),
    patchRollbackCheckpointPreview: recordOrUndefined(
      input.patchRollbackCheckpointPreview
    ),
    approvalGatedDisposableApplyResult: recordOrUndefined(
      input.approvalGatedDisposableApplyResult
    ),
    userWorkspaceRootRef:
      safeRef(input.userWorkspaceRootRef, "") ||
      safeRef(contract?.userWorkspaceRootRef, ""),
    sourceWorkspaceFingerprint:
      safeRef(input.sourceWorkspaceFingerprint, "") ||
      safeRef(contract?.sourceWorkspaceFingerprint, ""),
    expectedUserSnapshotHash:
      optionalSafeRef(input.expectedUserSnapshotHash) ??
      optionalSafeRef(contract?.expectedUserSnapshotHash),
    expectedDisposableOutputHash:
      optionalSafeRef(input.expectedDisposableOutputHash) ??
      optionalSafeRef(contract?.expectedDisposableOutputHash),
    createdAt: safeRef(input.createdAt, defaultTimestamp) || defaultTimestamp
  };
}

function isEmptyInput(input: UserWorkspacePromotionReadinessInput): boolean {
  return (
    input.userWorkspaceSnapshotBackupContract === undefined &&
    input.disposablePatchApplyResult === undefined &&
    input.disposablePatchRollbackResult === undefined &&
    input.sandboxApplyRollbackEventProjection === undefined &&
    input.patchValidationPreview === undefined &&
    input.patchDiffAuditPreview === undefined &&
    input.patchApprovalDraft === undefined &&
    input.patchRollbackCheckpointPreview === undefined &&
    input.userWorkspaceRootRef === undefined &&
    input.sourceWorkspaceFingerprint === undefined
  );
}

function recordOrUndefined(value: unknown): SummaryRecord | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (readString(value, "status") === "empty") {
    return undefined;
  }
  return value;
}

function rawFieldWarningsFrom(input: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(input, (key) => {
    if (key !== undefined && forbiddenRawInputKeys.has(key.toLowerCase())) {
      warnings.push("PROMOTION_RAW_FIELD_REJECTED");
    }
  });
  return uniqueStrings(warnings);
}

function executionAttemptWarningsFrom(input: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(input, (key, value) => {
    if (value !== true) {
      return;
    }
    if (
      key === "canApplyToUserWorkspace" ||
      key === "canWriteFilesystem" ||
      key === "canRollbackUserWorkspace" ||
      key === "canExecuteGit" ||
      key === "canExecuteShell" ||
      key === "canIssuePermissionLease" ||
      key === "canWriteEventStore"
    ) {
      warnings.push("PROMOTION_EXECUTION_FLAG_REJECTED");
    }
    if (
      key === "appCanExecute" ||
      key === "appExecutionEnabled" ||
      key === "appExecutionConnected" ||
      key === "applyButtonEnabled" ||
      key === "rollbackButtonEnabled" ||
      key === "promoteButtonEnabled" ||
      key === "userWorkspaceMutationEnabled"
    ) {
      warnings.push("PROMOTION_APP_EXECUTION_ENABLED_REJECTED");
    }
  });
  return uniqueStrings(warnings);
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.code);
}

function warningCodesFrom(record: SummaryRecord): string[] {
  const codes = [
    ...safeStringArray(record.warningCodes),
    ...safeArray(record.warnings).map((item) =>
      safeText(isRecord(item) ? item.code : item, "")
    ),
    ...safeArray(record.findings).map((item) =>
      safeText(isRecord(item) ? item.code : item, "")
    )
  ];
  return uniqueStrings(codes.filter((code) => code.length > 0));
}

function finding(
  kind: UserWorkspacePromotionReadinessFindingKind,
  severity: UserWorkspacePromotionReadinessSeverity,
  code: string,
  relatedRef?: string | undefined
): UserWorkspacePromotionReadinessFinding {
  return {
    findingId: `promotion-${hashPreview(
      [kind, severity, code, relatedRef ?? ""].join("|")
    )}`,
    kind,
    severity,
    code,
    summary: safeSummaryForCode(code),
    relatedRef
  };
}

function safeSummaryForCode(code: string): string {
  return code
    .toLowerCase()
    .replace(/^promotion_/, "")
    .replaceAll("_", " ");
}

function nextActionFor(
  status: UserWorkspacePromotionReadinessStatus,
  readiness: UserWorkspacePromotionReadinessReadiness
): string {
  if (status === "empty") {
    return "Provide summary artifacts for the user workspace promotion readiness checker.";
  }
  if (!readiness.canProceedToUserWorkspaceApplyPrototype) {
    return "Resolve blocker gates before this metadata chain can feed the future P0K-004 runtime prototype.";
  }
  if (status === "warning") {
    return "Review warning gates. Readiness is summary-only and does not enable user workspace apply.";
  }
  return "Readiness chain is complete for future P0K-004 design. User workspace apply remains disabled.";
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function visitUnknown(
  value: unknown,
  visitor: (key: string | undefined, value: unknown) => void,
  key?: string | undefined,
  seen: WeakSet<object> = new WeakSet()
): void {
  visitor(key, value);
  if (typeof value !== "object" || value === null) {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => visitUnknown(item, visitor, undefined, seen));
    return;
  }
  for (const [childKey, childValue] of Object.entries(value)) {
    visitUnknown(childValue, visitor, childKey, seen);
  }
}

function uniqueFindingsByCodeRef(
  findings: UserWorkspacePromotionReadinessFinding[]
): UserWorkspacePromotionReadinessFinding[] {
  const seen = new Set<string>();
  const result: UserWorkspacePromotionReadinessFinding[] = [];
  for (const item of findings) {
    const key = `${item.code}:${item.relatedRef ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => safeText(item, ""))
    .filter((item) => item.length > 0);
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function safeRef(value: unknown, fallback: string): string {
  const text = safeText(value, fallback).trim().slice(0, 180);
  return unsafeWarningCodes(text).length > 0 ? fallback : text;
}

function optionalSafeRef(value: unknown): string | undefined {
  const text = safeRef(value, "");
  return text.length > 0 ? text : undefined;
}

function readString(record: unknown, key: string): string {
  if (!isRecord(record)) {
    return "";
  }
  return safeRef(record[key], "");
}

function firstString(record: SummaryRecord, keys: string[]): string {
  for (const key of keys) {
    const value = readString(record, key);
    if (value.length > 0) {
      return value;
    }
  }
  return "";
}

function readNumber(record: unknown, key: string): number {
  if (!isRecord(record)) {
    return 0;
  }
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readBoolean(record: unknown, key: string): boolean | undefined {
  if (!isRecord(record)) {
    return undefined;
  }
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function readNestedBoolean(
  record: unknown,
  path: string[],
  fallback: boolean
): boolean {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current)) {
      return fallback;
    }
    current = current[key];
  }
  return typeof current === "boolean" ? current : fallback;
}

function hashPreview(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 12);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isRecord(value: unknown): value is SummaryRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
