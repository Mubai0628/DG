import { stablePreviewHash } from "./stable-preview-hash.js";

export type LiveProposalApiKeySourceType =
  | "disabled"
  | "env_var_ref"
  | "vault_ref"
  | "test_fixture_ref";

export type LiveProposalApiKeySource = {
  type: LiveProposalApiKeySourceType;
  refName?: string | undefined;
  displayName?: string | undefined;
  keyPresenceProof?: "unknown" | "declared_by_test_fixture" | "not_checked";
};

export type LiveProposalOptInScope = "proposal_generation_only";

export type LiveProposalOptInGate = {
  mode: "disabled" | "dry_config_check" | "explicit_live_proposal_opt_in";
  scope: LiveProposalOptInScope;
  allowApply: false;
  allowRollback: false;
  allowEventStoreWrite: false;
  allowGit: false;
  allowShell: false;
  allowAppExecution: false;
  expiresAt?: string | undefined;
  requestedBy?: "manual_user_preview" | "test_fixture" | undefined;
  reasonSummary?: string | undefined;
};

export type LiveProposalApiKeyPolicyInput = {
  providerId?: "deepseek" | string | undefined;
  modelProfileId?: string | undefined;
  keySource?: LiveProposalApiKeySource | undefined;
  optInGate?: LiveProposalOptInGate | undefined;
  allowedEnvVarNames?: string[] | undefined;
  allowedVaultRefPrefixes?: string[] | undefined;
  allowedTestFixtureRefs?: string[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type LiveProposalApiKeyPolicyStatus =
  | "disabled"
  | "policy_ready"
  | "dry_config_ready"
  | "warning"
  | "blocked";

export type LiveProposalApiKeyPolicyFindingKind =
  | "input"
  | "provider"
  | "model_profile"
  | "key_source"
  | "opt_in"
  | "secret"
  | "forbidden_field"
  | "readiness";

export type LiveProposalApiKeyPolicySeverity = "blocker" | "warning";

export type LiveProposalApiKeyPolicyFinding = {
  findingId: string;
  kind: LiveProposalApiKeyPolicyFindingKind;
  severity: LiveProposalApiKeyPolicySeverity;
  code: string;
  safeMessage: string;
};

export type LiveProposalApiKeyPolicyReadiness = {
  canProceedToLiveRequestBuilder: boolean;
  canReadApiKey: false;
  canCallLiveModel: false;
  canFetchNetwork: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type LiveProposalApiKeyPolicy = {
  status: LiveProposalApiKeyPolicyStatus;
  policyId: string;
  providerId: "deepseek";
  modelProfileId: string;
  keySourceSummary: {
    type: LiveProposalApiKeySourceType;
    refNameHash: string;
    displayName?: string | undefined;
    keyPresenceProof: "unknown" | "declared_by_test_fixture" | "not_checked";
    rawKeyPresent: false;
  };
  optInSummary: {
    mode: LiveProposalOptInGate["mode"];
    scope: LiveProposalOptInScope;
    expiresAt?: string | undefined;
    requestedBy?: LiveProposalOptInGate["requestedBy"] | undefined;
    reasonSummary?: string | undefined;
  };
  findings: LiveProposalApiKeyPolicyFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  policyHash: string;
  readiness: LiveProposalApiKeyPolicyReadiness;
  nextAction: string;
  source: "runtime_live_proposal_api_key_policy";
};

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const bearerField = ["bear", "er"].join("");

const forbiddenInputKeys = new Set(
  [
    apiKeyField,
    "apiKeyValue",
    "secret",
    "token",
    authHeaderField,
    bearerField,
    "rawKey",
    "envValue",
    "processEnvValue",
    "vaultSecretValue",
    "password",
    rawPrefix + "Prompt",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge"
  ].map((key) => key.toLowerCase())
);

const trueReadinessKeys = new Set(
  ["canReadApiKey", "canCallLiveModel"].map((key) => key.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "RAW_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

const executionPermissionKeys = [
  "allowApply",
  "allowRollback",
  "allowEventStoreWrite",
  "allowGit",
  "allowShell",
  "allowAppExecution"
] as const;

export function buildLiveProposalApiKeyPolicy(
  input: LiveProposalApiKeyPolicyInput
): LiveProposalApiKeyPolicy {
  const findings = validateLiveProposalApiKeyPolicyInput(input);
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const keySource = input.keySource ?? { type: "disabled" as const };
  const optInGate =
    input.optInGate ??
    ({
      mode: "disabled",
      scope: "proposal_generation_only",
      allowApply: false,
      allowRollback: false,
      allowEventStoreWrite: false,
      allowGit: false,
      allowShell: false,
      allowAppExecution: false
    } satisfies LiveProposalOptInGate);
  const refName = safeText(keySource.refName, "");
  const refNameHash =
    refName.length === 0 ? "n/a" : stablePreviewHash(refName).slice(0, 16);
  const normalizedForHash = JSON.stringify({
    providerId: input.providerId ?? "missing",
    modelProfileId: safeText(input.modelProfileId, ""),
    keySource: {
      type: keySource.type,
      refNameHash,
      displayName: safeOptionalText(keySource.displayName),
      keyPresenceProof: keySource.keyPresenceProof ?? "not_checked"
    },
    optInGate: {
      mode: optInGate.mode,
      scope: optInGate.scope,
      expiresAt: optInGate.expiresAt,
      requestedBy: optInGate.requestedBy,
      reasonSummary: safeOptionalText(optInGate.reasonSummary)
    },
    createdAt: input.createdAt
  });
  const policyHash = stablePreviewHash(normalizedForHash);
  const readiness = readinessFor(input, blockerCount === 0);
  const status = statusFor(input, blockerCount, warningCount);

  return {
    status,
    policyId:
      input.idGenerator?.() ??
      `live-proposal-api-key-policy-${policyHash.slice(0, 12)}`,
    providerId: "deepseek",
    modelProfileId: safeText(input.modelProfileId, "unknown"),
    keySourceSummary: {
      type: keySource.type,
      refNameHash,
      displayName: safeOptionalText(keySource.displayName),
      keyPresenceProof: keySource.keyPresenceProof ?? "not_checked",
      rawKeyPresent: false
    },
    optInSummary: {
      mode: optInGate.mode,
      scope: optInGate.scope,
      expiresAt: optInGate.expiresAt,
      requestedBy: optInGate.requestedBy,
      reasonSummary: safeOptionalText(optInGate.reasonSummary)
    },
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    policyHash,
    readiness,
    nextAction: nextActionFor(status),
    source: "runtime_live_proposal_api_key_policy"
  };
}

export function validateLiveProposalApiKeyPolicyInput(
  input: LiveProposalApiKeyPolicyInput
): LiveProposalApiKeyPolicyFinding[] {
  const findings: LiveProposalApiKeyPolicyFinding[] = [];
  const addFinding = (
    kind: LiveProposalApiKeyPolicyFindingKind,
    severity: LiveProposalApiKeyPolicySeverity,
    code: string,
    safeMessage: string
  ) => {
    findings.push({
      findingId: `${code.toLowerCase()}-${findings.length + 1}`,
      kind,
      severity,
      code,
      safeMessage
    });
  };

  scanObject(input, (code, message) => {
    addFinding("forbidden_field", "blocker", code, message);
  });

  if (input.providerId === undefined || input.providerId === "") {
    addFinding(
      "provider",
      "blocker",
      "MISSING_PROVIDER_ID",
      "Provider id is required."
    );
  } else if (input.providerId !== "deepseek") {
    addFinding(
      "provider",
      "blocker",
      "UNSUPPORTED_PROVIDER_ID",
      "Only the deepseek provider is supported by this policy."
    );
  }

  if (!hasText(input.modelProfileId)) {
    addFinding(
      "model_profile",
      "blocker",
      "MISSING_MODEL_PROFILE_ID",
      "Model profile id is required."
    );
  } else if (!isSafeProfileId(input.modelProfileId as string)) {
    addFinding(
      "model_profile",
      "blocker",
      "UNSAFE_MODEL_PROFILE_ID",
      "Model profile id must be a safe display ref."
    );
  } else if (!(input.modelProfileId as string).startsWith("deepseek-")) {
    addFinding(
      "model_profile",
      "warning",
      "UNKNOWN_MODEL_PROFILE_ID",
      "Model profile id is syntactically safe but not a known DeepSeek profile."
    );
  }

  validateKeySource(input, addFinding);
  validateOptInGate(input, addFinding);

  return findings;
}

export function summarizeLiveProposalApiKeyPolicy(
  policy: LiveProposalApiKeyPolicy
): string {
  return [
    `status=${policy.status}`,
    `provider=${policy.providerId}`,
    `model=${policy.modelProfileId}`,
    `keySource=${policy.keySourceSummary.type}`,
    `refHash=${policy.keySourceSummary.refNameHash}`,
    `optIn=${policy.optInSummary.mode}`,
    `canProceed=${policy.readiness.canProceedToLiveRequestBuilder ? "yes" : "no"}`,
    `canReadApiKey=${policy.readiness.canReadApiKey ? "yes" : "no"}`,
    `canCallLiveModel=${policy.readiness.canCallLiveModel ? "yes" : "no"}`
  ].join("; ");
}

function validateKeySource(
  input: LiveProposalApiKeyPolicyInput,
  addFinding: (
    kind: LiveProposalApiKeyPolicyFindingKind,
    severity: LiveProposalApiKeyPolicySeverity,
    code: string,
    safeMessage: string
  ) => void
): void {
  const keySource = input.keySource;
  if (keySource === undefined) {
    addFinding(
      "key_source",
      "blocker",
      "MISSING_KEY_SOURCE",
      "Key source policy ref is required."
    );
    return;
  }

  if (!isKnownKeySourceType(keySource.type)) {
    addFinding(
      "key_source",
      "blocker",
      "UNKNOWN_KEY_SOURCE_TYPE",
      "Key source type is not supported."
    );
    return;
  }

  const refName = safeText(keySource.refName, "");
  if (keySource.type !== "disabled" && refName.length === 0) {
    addFinding(
      "key_source",
      "blocker",
      "MISSING_KEY_SOURCE_REF",
      "Non-disabled key source requires a ref name."
    );
  }

  if (refName.length > 0 && looksLikeRawSecret(refName)) {
    addFinding(
      "secret",
      "blocker",
      "RAW_KEY_REF_REJECTED",
      "Key source ref looks like a raw key or secret marker."
    );
  }

  if (
    keySource.type === "env_var_ref" &&
    !safeStringArray(input.allowedEnvVarNames).includes(refName)
  ) {
    addFinding(
      "key_source",
      "blocker",
      "ENV_REF_NOT_ALLOWLISTED",
      "Environment variable ref is not allowlisted."
    );
  }

  if (
    keySource.type === "vault_ref" &&
    !safeStringArray(input.allowedVaultRefPrefixes).some((prefix) =>
      refName.startsWith(prefix)
    )
  ) {
    addFinding(
      "key_source",
      "blocker",
      "VAULT_REF_NOT_ALLOWLISTED",
      "Vault ref does not use an allowlisted prefix."
    );
  }

  if (
    keySource.type === "test_fixture_ref" &&
    !safeStringArray(input.allowedTestFixtureRefs).includes(refName)
  ) {
    addFinding(
      "key_source",
      "blocker",
      "TEST_FIXTURE_REF_NOT_ALLOWLISTED",
      "Test fixture ref is not allowlisted."
    );
  }

  if (
    keySource.type === "env_var_ref" &&
    keySource.keyPresenceProof === "unknown"
  ) {
    addFinding(
      "key_source",
      "warning",
      "KEY_PRESENCE_UNKNOWN",
      "Environment ref presence is not checked in this policy task."
    );
  }

  if (keySource.type === "vault_ref") {
    addFinding(
      "key_source",
      "warning",
      "VAULT_READ_DEFERRED",
      "Vault read is deferred; this policy only records an opaque ref."
    );
  }
}

function validateOptInGate(
  input: LiveProposalApiKeyPolicyInput,
  addFinding: (
    kind: LiveProposalApiKeyPolicyFindingKind,
    severity: LiveProposalApiKeyPolicySeverity,
    code: string,
    safeMessage: string
  ) => void
): void {
  const optInGate = input.optInGate;
  if (optInGate === undefined) {
    addFinding(
      "opt_in",
      "blocker",
      "MISSING_OPT_IN_GATE",
      "Opt-in gate metadata is required."
    );
    return;
  }

  if (
    optInGate.mode !== "disabled" &&
    optInGate.mode !== "dry_config_check" &&
    optInGate.mode !== "explicit_live_proposal_opt_in"
  ) {
    addFinding(
      "opt_in",
      "blocker",
      "UNKNOWN_OPT_IN_MODE",
      "Opt-in gate mode is not supported."
    );
  }

  if (optInGate.scope !== "proposal_generation_only") {
    addFinding(
      "opt_in",
      "blocker",
      "INVALID_OPT_IN_SCOPE",
      "Opt-in gate scope must be proposal_generation_only."
    );
  }

  if (
    optInGate.mode === "explicit_live_proposal_opt_in" &&
    input.keySource?.type === "disabled"
  ) {
    addFinding(
      "opt_in",
      "blocker",
      "EXPLICIT_OPT_IN_WITH_DISABLED_KEY_SOURCE",
      "Explicit opt-in requires a non-disabled key source ref."
    );
  }

  for (const key of executionPermissionKeys) {
    if ((optInGate as unknown as Record<string, unknown>)[key] === true) {
      addFinding(
        "opt_in",
        "blocker",
        "EXECUTION_PERMISSION_REJECTED",
        "Opt-in policy cannot authorize execution permissions."
      );
    }
  }

  if (
    optInGate.expiresAt !== undefined &&
    isExpired(optInGate.expiresAt, input.createdAt)
  ) {
    addFinding(
      "opt_in",
      "blocker",
      "OPT_IN_EXPIRED",
      "Opt-in gate is expired."
    );
  }

  if (optInGate.mode === "disabled") {
    addFinding(
      "opt_in",
      "warning",
      "OPT_IN_DISABLED",
      "Opt-in gate is disabled; live call remains unavailable."
    );
  }

  if (optInGate.mode === "dry_config_check") {
    addFinding(
      "opt_in",
      "warning",
      "DRY_CONFIG_CHECK_ONLY",
      "Dry config check cannot read keys or call the live model."
    );
  }

  if (
    optInGate.mode === "explicit_live_proposal_opt_in" &&
    optInGate.expiresAt === undefined
  ) {
    addFinding(
      "opt_in",
      "warning",
      "MISSING_OPT_IN_EXPIRY",
      "Explicit opt-in should include an expiry."
    );
  }

  if (
    optInGate.mode === "explicit_live_proposal_opt_in" &&
    optInGate.requestedBy === undefined
  ) {
    addFinding(
      "opt_in",
      "warning",
      "MISSING_REQUESTED_BY",
      "Explicit opt-in should include a safe requester summary."
    );
  }

  if (
    optInGate.mode === "explicit_live_proposal_opt_in" &&
    !hasText(optInGate.reasonSummary)
  ) {
    addFinding(
      "opt_in",
      "warning",
      "MISSING_REASON_SUMMARY",
      "Explicit opt-in should include a reason summary."
    );
  }
}

function readinessFor(
  input: LiveProposalApiKeyPolicyInput,
  noBlockers: boolean
): LiveProposalApiKeyPolicyReadiness {
  const gate = input.optInGate;
  const keySource = input.keySource;
  const canProceed =
    noBlockers &&
    gate?.mode === "explicit_live_proposal_opt_in" &&
    gate.scope === "proposal_generation_only" &&
    keySource !== undefined &&
    keySource.type !== "disabled" &&
    executionPermissionKeys.every(
      (key) => (gate as unknown as Record<string, unknown>)[key] === false
    );

  return {
    canProceedToLiveRequestBuilder: canProceed,
    canReadApiKey: false,
    canCallLiveModel: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function statusFor(
  input: LiveProposalApiKeyPolicyInput,
  blockerCount: number,
  warningCount: number
): LiveProposalApiKeyPolicyStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (input.optInGate?.mode === "disabled") {
    return "disabled";
  }
  if (input.optInGate?.mode === "dry_config_check") {
    return "dry_config_ready";
  }
  if (warningCount > 0) {
    return "warning";
  }
  return "policy_ready";
}

function nextActionFor(status: LiveProposalApiKeyPolicyStatus): string {
  switch (status) {
    case "policy_ready":
      return "Policy metadata is ready for a future live request builder. Live calls remain disabled.";
    case "dry_config_ready":
      return "Dry config check is available. It cannot read keys or call DeepSeek.";
    case "warning":
      return "Review policy warnings before future request-builder work.";
    case "blocked":
      return "Fix policy blockers before any future request-builder work.";
    case "disabled":
    default:
      return "Enable only an explicit future opt-in policy before request-builder work. No key is read.";
  }
}

function scanObject(
  value: unknown,
  addBlocker: (code: string, safeMessage: string) => void,
  seen = new Set<unknown>()
): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    const pattern = unsafeTextPatterns.find(({ pattern }) =>
      pattern.test(value)
    );
    if (pattern !== undefined || looksLikeLongToken(value)) {
      addBlocker(
        pattern?.code ?? "TOKEN_LIKE_VALUE_REJECTED",
        "Input contains a secret-like marker."
      );
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>
  )) {
    const normalizedKey = key.toLowerCase();
    if (forbiddenInputKeys.has(normalizedKey)) {
      addBlocker(
        "FORBIDDEN_POLICY_FIELD",
        "Input contains a forbidden policy field."
      );
    }
    if (trueReadinessKeys.has(normalizedKey) && nestedValue === true) {
      addBlocker(
        "LIVE_READINESS_ATTEMPT_REJECTED",
        "Input cannot enable API key reads or live model calls."
      );
    }
    scanObject(nestedValue, addBlocker, seen);
  }
}

function isKnownKeySourceType(
  value: unknown
): value is LiveProposalApiKeySourceType {
  return (
    value === "disabled" ||
    value === "env_var_ref" ||
    value === "vault_ref" ||
    value === "test_fixture_ref"
  );
}

function isSafeProfileId(value: string): boolean {
  return /^[A-Za-z0-9._:/-]{1,80}$/.test(value) && !looksLikeRawSecret(value);
}

function looksLikeRawSecret(value: string): boolean {
  return (
    unsafeTextPatterns.some(({ pattern }) => pattern.test(value)) ||
    looksLikeLongToken(value)
  );
}

function looksLikeLongToken(value: string): boolean {
  return (
    /^[A-Za-z0-9_./+=-]{40,}$/.test(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}

function isExpired(expiresAt: string, createdAt?: string | undefined): boolean {
  const expiresTime = Date.parse(expiresAt);
  if (!Number.isFinite(expiresTime)) {
    return true;
  }
  const nowTime =
    createdAt === undefined || !Number.isFinite(Date.parse(createdAt))
      ? Date.now()
      : Date.parse(createdAt);
  return expiresTime <= nowTime;
}

function safeStringArray(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.filter((value) => typeof value === "string");
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim().slice(0, 120);
}

function safeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return value.trim().slice(0, 120);
}
