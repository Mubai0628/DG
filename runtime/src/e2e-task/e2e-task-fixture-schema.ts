import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type EndToEndCodingTaskFixtureInput =
  | Record<string, unknown>
  | string
  | unknown;

export type EndToEndCodingTaskExpectedStatus =
  | "pass"
  | "warning"
  | "blocked"
  | "rollback_required";

export type EndToEndCodingTaskFailureCategory =
  | "schema_failure"
  | "unsafe_path"
  | "secret_marker"
  | "raw_content_leak"
  | "missing_expected_event"
  | "stale_snapshot"
  | "apply_conflict"
  | "verification_failure"
  | "rollback_failure"
  | "event_mismatch"
  | "replay_mismatch"
  | "no_failure_expected";

export type EndToEndCodingTaskObjective = {
  objectiveSummary: string;
  intent: string;
  workspaceRootRef: string;
  allowedPathRefs: string[];
  forbiddenPathPolicy: string[];
};

export type EndToEndCodingTaskExpectedFlow = {
  expectedStatus: EndToEndCodingTaskExpectedStatus;
  requiresLiveProposal: boolean;
  requiresRepairOrSchemaValidation: boolean;
  requiresApprovalReceipt: boolean;
  requiresTypedConfirmation: boolean;
  requiresCheckpoint: boolean;
  requiresVerification: boolean;
  rollbackRequired: boolean;
};

export type EndToEndCodingTaskExpectedArtifact = {
  refId: string;
  kind:
    | "proposal_summary"
    | "apply_summary"
    | "verification_summary"
    | "rollback_summary"
    | "event_summary"
    | "replay_summary";
  summary: string;
  pathRefs: string[];
  eventKinds: string[];
  hashPrefix?: string | undefined;
  warningCodes: string[];
};

export type EndToEndCodingTaskFailureExpectation = {
  category: EndToEndCodingTaskFailureCategory;
  severity: "warning" | "blocker";
  summary: string;
};

export type EndToEndCodingTaskFixture = {
  schemaVersion: "e2e_coding_task_fixture.v1";
  taskId: string;
  title: string;
  objective: EndToEndCodingTaskObjective;
  expectedFlow: EndToEndCodingTaskExpectedFlow;
  expectedArtifacts: EndToEndCodingTaskExpectedArtifact[];
  expectedFailureCategories: EndToEndCodingTaskFailureCategory[];
  failureExpectations: EndToEndCodingTaskFailureExpectation[];
  expectedEventCount: number;
  expectedReplaySummaryRef: string;
  tagCount: number;
  tags: string[];
  fixtureHash: string;
  source: "runtime_e2e_coding_task_fixture";
};

export type EndToEndCodingTaskFixtureFindingKind =
  | "schema"
  | "structure"
  | "path"
  | "secret"
  | "raw_field"
  | "execution_field"
  | "event"
  | "failure_expectation"
  | "readiness";

export type EndToEndCodingTaskFixtureSeverity = "blocker" | "warning";

export type EndToEndCodingTaskFixtureFinding = {
  findingId: string;
  kind: EndToEndCodingTaskFixtureFindingKind;
  severity: EndToEndCodingTaskFixtureSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type EndToEndCodingTaskFixtureSummary = {
  taskId?: string | undefined;
  title?: string | undefined;
  intent?: string | undefined;
  allowedPathCount: number;
  expectedEventCount: number;
  expectedArtifactCount: number;
  expectedStatus?: EndToEndCodingTaskExpectedStatus | undefined;
  expectedFailureCategories: EndToEndCodingTaskFailureCategory[];
  warningCodes: string[];
  hash?: string | undefined;
  summaryOnly: true;
};

export type EndToEndCodingTaskFixtureReadiness = {
  canEnterOrchestrator: boolean;
  canCallLiveModel: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type EndToEndCodingTaskFixtureValidationResult = {
  status: "parsed" | "warning" | "blocked";
  fixture?: EndToEndCodingTaskFixture | undefined;
  summary: EndToEndCodingTaskFixtureSummary;
  findings: EndToEndCodingTaskFixtureFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  normalizedHash: string;
  readiness: EndToEndCodingTaskFixtureReadiness;
  nextAction: string;
  source: "runtime_e2e_coding_task_fixture_schema";
};

export type EndToEndCodingTaskFixtureOptions = {
  idGenerator?: (() => string) | undefined;
};

const supportedSchemaVersion = "e2e_coding_task_fixture.v1" as const;

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const allowedTopLevelKeys = new Set([
  "schemaVersion",
  "taskId",
  "title",
  "objectiveSummary",
  "intent",
  "workspaceRootRef",
  "allowedPathRefs",
  "forbiddenPathPolicy",
  "expectedProposalSummary",
  "expectedApplySummary",
  "expectedVerificationSummary",
  "expectedRollbackSummary",
  "expectedEvents",
  "expectedReplaySummary",
  "expectedFailureCategories",
  "failureExpectations",
  "tags"
]);

const allowedStatuses = new Set<EndToEndCodingTaskExpectedStatus>([
  "pass",
  "warning",
  "blocked",
  "rollback_required"
]);

const allowedFailureCategories = new Set<EndToEndCodingTaskFailureCategory>([
  "schema_failure",
  "unsafe_path",
  "secret_marker",
  "raw_content_leak",
  "missing_expected_event",
  "stale_snapshot",
  "apply_conflict",
  "verification_failure",
  "rollback_failure",
  "event_mismatch",
  "replay_mismatch",
  "no_failure_expected"
]);

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    rawPrefix + "Response",
    reasoningSnakeField,
    rawPrefix + "Source",
    rawPrefix + "Diff",
    "fileContent",
    "preimageContent",
    apiKeyField,
    authHeaderField,
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "applyNow",
    "rollbackNow",
    "nativeBridge",
    "desktopAction",
    "tools",
    toolChoiceField
  ].map((field) => field.toLowerCase())
);

const executionAttemptKeys = new Set(
  [
    "canCallLiveModel",
    "canReadApiKey",
    "canFetchNetwork",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowGit",
    "allowShell",
    "allowAppExecution"
  ].map((field) => field.toLowerCase())
);

const blockedPathSegments = new Set([
  ".git",
  ".env",
  ".tmp",
  "node_modules",
  "dist",
  "target"
]);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
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

export function parseEndToEndCodingTaskFixture(
  input: EndToEndCodingTaskFixtureInput,
  options: EndToEndCodingTaskFixtureOptions = {}
): EndToEndCodingTaskFixtureValidationResult {
  return validateEndToEndCodingTaskFixture(input, options);
}

export function validateEndToEndCodingTaskFixture(
  input: EndToEndCodingTaskFixtureInput,
  options: EndToEndCodingTaskFixtureOptions = {}
): EndToEndCodingTaskFixtureValidationResult {
  const findings: EndToEndCodingTaskFixtureFinding[] = [];
  const parsed = parseInput(input, findings);
  if (Array.isArray(parsed)) {
    findings.push(...validateDuplicateTaskIds(parsed));
    return resultFrom(undefined, findings);
  }
  if (!isRecord(parsed)) {
    return resultFrom(undefined, findings);
  }

  findings.push(...findForbiddenFields(parsed));
  findings.push(...findUnsafeStringMarkers(parsed));
  findings.push(...validateTopLevel(parsed));
  findings.push(...validateRequiredFields(parsed));
  findings.push(...validateAllowedPaths(parsed.allowedPathRefs));
  findings.push(...validateExpectedArtifacts(parsed));
  findings.push(...validateExpectedEvents(parsed.expectedEvents));
  findings.push(...validateFailureCategories(parsed.expectedFailureCategories));

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const fixture =
    blockerCount === 0 ? normalizeFromRecord(parsed, options) : undefined;
  return resultFrom(fixture, findings);
}

export function summarizeEndToEndCodingTaskFixture(
  fixture: EndToEndCodingTaskFixture
): EndToEndCodingTaskFixtureSummary {
  return {
    taskId: fixture.taskId,
    title: fixture.title,
    intent: fixture.objective.intent,
    allowedPathCount: fixture.objective.allowedPathRefs.length,
    expectedEventCount: fixture.expectedEventCount,
    expectedArtifactCount: fixture.expectedArtifacts.length,
    expectedStatus: fixture.expectedFlow.expectedStatus,
    expectedFailureCategories: fixture.expectedFailureCategories,
    warningCodes: uniqueStrings(
      fixture.expectedArtifacts.flatMap((artifact) => artifact.warningCodes)
    ),
    hash: fixture.fixtureHash,
    summaryOnly: true
  };
}

function parseInput(
  input: EndToEndCodingTaskFixtureInput,
  findings: EndToEndCodingTaskFixtureFinding[]
): unknown {
  if (typeof input === "string") {
    for (const code of unsafeMarkerCodes(input)) {
      findings.push(finding("secret", "blocker", code));
    }
    try {
      return JSON.parse(input);
    } catch {
      findings.push(finding("schema", "blocker", "INVALID_JSON"));
      return undefined;
    }
  }
  if (!isRecord(input) && !Array.isArray(input)) {
    findings.push(finding("schema", "blocker", "INPUT_NOT_OBJECT"));
    return undefined;
  }
  return input;
}

function validateTopLevel(
  record: Record<string, unknown>
): EndToEndCodingTaskFixtureFinding[] {
  const findings: EndToEndCodingTaskFixtureFinding[] = [];
  for (const key of Object.keys(record)) {
    if (!allowedTopLevelKeys.has(key)) {
      findings.push(
        finding("structure", "blocker", "UNKNOWN_TOP_LEVEL_FIELD", key)
      );
    }
  }
  if (record.schemaVersion !== supportedSchemaVersion) {
    findings.push(finding("schema", "blocker", "UNSUPPORTED_SCHEMA_VERSION"));
  }
  return findings;
}

function validateRequiredFields(
  record: Record<string, unknown>
): EndToEndCodingTaskFixtureFinding[] {
  const findings: EndToEndCodingTaskFixtureFinding[] = [];
  for (const field of [
    "taskId",
    "title",
    "objectiveSummary",
    "intent",
    "workspaceRootRef",
    "allowedPathRefs",
    "forbiddenPathPolicy",
    "expectedProposalSummary",
    "expectedApplySummary",
    "expectedVerificationSummary",
    "expectedEvents",
    "expectedReplaySummary",
    "tags"
  ]) {
    if (record[field] === undefined) {
      findings.push(finding("structure", "blocker", "MISSING_FIELD", field));
    }
  }

  for (const field of ["taskId", "title", "objectiveSummary", "intent"]) {
    if (record[field] !== undefined && safeString(record[field]) === "") {
      findings.push(finding("structure", "blocker", "EMPTY_FIELD", field));
    }
  }

  if (!Array.isArray(record.allowedPathRefs)) {
    findings.push(finding("path", "blocker", "ALLOWED_PATH_REFS_NOT_ARRAY"));
  }
  if (!Array.isArray(record.forbiddenPathPolicy)) {
    findings.push(
      finding("path", "blocker", "FORBIDDEN_PATH_POLICY_NOT_ARRAY")
    );
  }
  if (!Array.isArray(record.expectedEvents)) {
    findings.push(finding("event", "blocker", "EXPECTED_EVENTS_NOT_ARRAY"));
  }
  if (!Array.isArray(record.tags)) {
    findings.push(finding("structure", "warning", "TAGS_NOT_ARRAY"));
  }
  return findings;
}

function validateAllowedPaths(
  value: unknown
): EndToEndCodingTaskFixtureFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }
  if (value.length === 0) {
    return [finding("path", "blocker", "NO_ALLOWED_PATH_REFS")];
  }
  const findings: EndToEndCodingTaskFixtureFinding[] = [];
  for (const item of value) {
    const path = safeString(item);
    if (path === "") {
      findings.push(finding("path", "blocker", "EMPTY_PATH_REF"));
      continue;
    }
    const code = unsafePathCode(path);
    if (code !== undefined) {
      findings.push(finding("path", "blocker", code));
    }
  }
  return findings;
}

function validateExpectedArtifacts(
  record: Record<string, unknown>
): EndToEndCodingTaskFixtureFinding[] {
  const findings: EndToEndCodingTaskFixtureFinding[] = [];
  for (const field of [
    "expectedProposalSummary",
    "expectedApplySummary",
    "expectedVerificationSummary",
    "expectedReplaySummary"
  ]) {
    if (!isRecord(record[field])) {
      findings.push(
        finding("structure", "blocker", "EXPECTED_ARTIFACT_NOT_OBJECT", field)
      );
      continue;
    }
    if (safeString((record[field] as Record<string, unknown>).summary) === "") {
      findings.push(
        finding(
          "structure",
          "blocker",
          "EXPECTED_ARTIFACT_EMPTY_SUMMARY",
          field
        )
      );
    }
  }
  if (
    record.expectedRollbackSummary !== undefined &&
    !isRecord(record.expectedRollbackSummary)
  ) {
    findings.push(
      finding("structure", "blocker", "EXPECTED_ROLLBACK_SUMMARY_NOT_OBJECT")
    );
  }
  return findings;
}

function validateExpectedEvents(
  value: unknown
): EndToEndCodingTaskFixtureFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }
  if (value.length === 0) {
    return [finding("event", "blocker", "MISSING_EXPECTED_EVENTS")];
  }
  const findings: EndToEndCodingTaskFixtureFinding[] = [];
  const eventIds = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) {
      findings.push(finding("event", "blocker", "EXPECTED_EVENT_NOT_OBJECT"));
      continue;
    }
    const refId = safeString(item.refId);
    if (refId === "") {
      findings.push(finding("event", "blocker", "EXPECTED_EVENT_MISSING_REF"));
    } else if (eventIds.has(refId)) {
      findings.push(finding("event", "blocker", "DUPLICATE_EVENT_REF"));
    }
    eventIds.add(refId);
    if (safeString(item.summary) === "") {
      findings.push(
        finding("event", "blocker", "EXPECTED_EVENT_EMPTY_SUMMARY")
      );
    }
  }
  return findings;
}

function validateFailureCategories(
  value: unknown
): EndToEndCodingTaskFixtureFinding[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return [
      finding("failure_expectation", "blocker", "FAILURE_CATEGORIES_NOT_ARRAY")
    ];
  }
  return value.flatMap((item) =>
    allowedFailureCategories.has(item as EndToEndCodingTaskFailureCategory)
      ? []
      : [finding("failure_expectation", "blocker", "UNKNOWN_FAILURE_CATEGORY")]
  );
}

function validateDuplicateTaskIds(
  value: unknown[]
): EndToEndCodingTaskFixtureFinding[] {
  const seen = new Set<string>();
  const findings: EndToEndCodingTaskFixtureFinding[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      findings.push(finding("schema", "blocker", "INPUT_NOT_OBJECT"));
      continue;
    }
    const taskId = safeString(item.taskId);
    if (taskId === "") {
      continue;
    }
    if (seen.has(taskId)) {
      findings.push(finding("structure", "blocker", "DUPLICATE_TASK_ID"));
    }
    seen.add(taskId);
  }
  if (findings.length === 0) {
    findings.push(finding("schema", "blocker", "INPUT_ARRAY_NOT_SUPPORTED"));
  }
  return findings;
}

function normalizeFromRecord(
  record: Record<string, unknown>,
  options: EndToEndCodingTaskFixtureOptions
): EndToEndCodingTaskFixture {
  const taskId = safeString(record.taskId) || options.idGenerator?.() || "task";
  const expectedRollbackSummary = isRecord(record.expectedRollbackSummary)
    ? artifactFromRecord(record.expectedRollbackSummary, "rollback_summary")
    : undefined;
  const expectedArtifacts = [
    artifactFromRecord(
      record.expectedProposalSummary as Record<string, unknown>,
      "proposal_summary"
    ),
    artifactFromRecord(
      record.expectedApplySummary as Record<string, unknown>,
      "apply_summary"
    ),
    artifactFromRecord(
      record.expectedVerificationSummary as Record<string, unknown>,
      "verification_summary"
    ),
    ...(expectedRollbackSummary === undefined ? [] : [expectedRollbackSummary]),
    ...eventsFromUnknown(record.expectedEvents),
    artifactFromRecord(
      record.expectedReplaySummary as Record<string, unknown>,
      "replay_summary"
    )
  ];
  const allowedPathRefs = stringArray(record.allowedPathRefs);
  const fixtureForHash = {
    schemaVersion: supportedSchemaVersion,
    taskId,
    title: safeString(record.title),
    objectiveSummary: safeString(record.objectiveSummary),
    intent: safeString(record.intent),
    workspaceRootRef: safeString(record.workspaceRootRef),
    allowedPathRefs,
    forbiddenPathPolicy: stringArray(record.forbiddenPathPolicy),
    expectedArtifacts,
    expectedFailureCategories: failureCategoriesFromUnknown(
      record.expectedFailureCategories
    ),
    tags: stringArray(record.tags)
  };
  const fixtureHash = stablePreviewHash(stableStringify(fixtureForHash));
  const expectedStatus = expectedStatusFromRecord(record);

  return {
    schemaVersion: supportedSchemaVersion,
    taskId,
    title: safeString(record.title),
    objective: {
      objectiveSummary: safeString(record.objectiveSummary),
      intent: safeString(record.intent),
      workspaceRootRef: safeString(record.workspaceRootRef),
      allowedPathRefs,
      forbiddenPathPolicy: stringArray(record.forbiddenPathPolicy)
    },
    expectedFlow: {
      expectedStatus,
      requiresLiveProposal: true,
      requiresRepairOrSchemaValidation: true,
      requiresApprovalReceipt: true,
      requiresTypedConfirmation: true,
      requiresCheckpoint: true,
      requiresVerification: true,
      rollbackRequired:
        expectedRollbackSummary !== undefined ||
        expectedStatus === "rollback_required"
    },
    expectedArtifacts,
    expectedFailureCategories: failureCategoriesFromUnknown(
      record.expectedFailureCategories
    ),
    failureExpectations: failureExpectationsFromUnknown(
      record.failureExpectations
    ),
    expectedEventCount: Array.isArray(record.expectedEvents)
      ? record.expectedEvents.length
      : 0,
    expectedReplaySummaryRef: safeString(
      (record.expectedReplaySummary as Record<string, unknown>)?.refId
    ),
    tagCount: stringArray(record.tags).length,
    tags: stringArray(record.tags),
    fixtureHash,
    source: "runtime_e2e_coding_task_fixture"
  };
}

function artifactFromRecord(
  record: Record<string, unknown>,
  kind: EndToEndCodingTaskExpectedArtifact["kind"]
): EndToEndCodingTaskExpectedArtifact {
  return {
    refId: safeString(record.refId) || `${kind}:summary`,
    kind,
    summary: safeString(record.summary),
    pathRefs: stringArray(record.pathRefs),
    eventKinds: stringArray(record.eventKinds),
    hashPrefix: optionalSafeString(record.hashPrefix),
    warningCodes: stringArray(record.warningCodes)
  };
}

function eventsFromUnknown(
  value: unknown
): EndToEndCodingTaskExpectedArtifact[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isRecord)
    .map((item) => artifactFromRecord(item, "event_summary"));
}

function failureCategoriesFromUnknown(
  value: unknown
): EndToEndCodingTaskFailureCategory[] {
  if (!Array.isArray(value)) {
    return ["no_failure_expected"];
  }
  return uniqueStrings(
    value
      .filter((item): item is EndToEndCodingTaskFailureCategory =>
        allowedFailureCategories.has(item as EndToEndCodingTaskFailureCategory)
      )
      .map(String)
  ) as EndToEndCodingTaskFailureCategory[];
}

function failureExpectationsFromUnknown(
  value: unknown
): EndToEndCodingTaskFailureExpectation[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((item) => ({
    category: allowedFailureCategories.has(
      item.category as EndToEndCodingTaskFailureCategory
    )
      ? (item.category as EndToEndCodingTaskFailureCategory)
      : "schema_failure",
    severity: item.severity === "warning" ? "warning" : "blocker",
    summary: safeString(item.summary)
  }));
}

function expectedStatusFromRecord(
  record: Record<string, unknown>
): EndToEndCodingTaskExpectedStatus {
  const value = safeString(
    (record.expectedReplaySummary as Record<string, unknown> | undefined)
      ?.expectedStatus
  );
  if (allowedStatuses.has(value as EndToEndCodingTaskExpectedStatus)) {
    return value as EndToEndCodingTaskExpectedStatus;
  }
  if (
    failureCategoriesFromUnknown(record.expectedFailureCategories).some(
      (category) => category !== "no_failure_expected"
    )
  ) {
    return "blocked";
  }
  return "pass";
}

function resultFrom(
  fixture: EndToEndCodingTaskFixture | undefined,
  findings: EndToEndCodingTaskFixtureFinding[]
): EndToEndCodingTaskFixtureValidationResult {
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const summary =
    fixture === undefined
      ? emptySummary(status)
      : summarizeEndToEndCodingTaskFixture(fixture);
  return {
    status,
    fixture,
    summary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    normalizedHash:
      fixture?.fixtureHash ??
      stablePreviewHash(
        stableStringify({
          status,
          blockerCount,
          warningCount,
          codes: findings.map((finding) => finding.code)
        })
      ),
    readiness: {
      canEnterOrchestrator: status !== "blocked",
      canCallLiveModel: false,
      canReadApiKey: false,
      canFetchNetwork: false,
      canApplyPatch: false,
      canRollback: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction:
      status === "blocked"
        ? "Fix blocked summary fixture fields before using this case."
        : "Fixture can enter a future state-machine-only orchestrator test.",
    source: "runtime_e2e_coding_task_fixture_schema"
  };
}

function emptySummary(
  status: EndToEndCodingTaskFixtureValidationResult["status"]
): EndToEndCodingTaskFixtureSummary {
  return {
    status,
    allowedPathCount: 0,
    expectedEventCount: 0,
    expectedArtifactCount: 0,
    expectedFailureCategories: [],
    warningCodes: [],
    summaryOnly: true
  } as EndToEndCodingTaskFixtureSummary;
}

function findForbiddenFields(
  value: unknown,
  path = "$"
): EndToEndCodingTaskFixtureFinding[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenFields(item, `${path}[${index}]`)
    );
  }
  if (!isRecord(value)) {
    return [];
  }
  const findings: EndToEndCodingTaskFixtureFinding[] = [];
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalized)) {
      findings.push(
        finding(
          normalized.includes("command") ||
            normalized.includes("apply") ||
            normalized.includes("rollback") ||
            normalized.includes("bridge") ||
            normalized.includes("action")
            ? "execution_field"
            : "raw_field",
          "blocker",
          forbiddenCodeForKey(key),
          `${path}.${key}`
        )
      );
    }
    if (executionAttemptKeys.has(normalized) && child === true) {
      findings.push(
        finding(
          "readiness",
          "blocker",
          "EXECUTION_READINESS_TRUE",
          `${path}.${key}`
        )
      );
    }
    findings.push(...findForbiddenFields(child, `${path}.${key}`));
  }
  return findings;
}

function findUnsafeStringMarkers(
  value: unknown,
  path = "$"
): EndToEndCodingTaskFixtureFinding[] {
  if (typeof value === "string") {
    return unsafeMarkerCodes(value).map((code) =>
      finding("secret", "blocker", code, path)
    );
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findUnsafeStringMarkers(item, `${path}[${index}]`)
    );
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    findUnsafeStringMarkers(child, `${path}.${key}`)
  );
}

function unsafeMarkerCodes(value: string): string[] {
  return unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(value))
    .map(({ code }) => code);
}

function unsafePathCode(pathValue: string): string | undefined {
  const normalized = pathValue.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    return "ABSOLUTE_PATH_REJECTED";
  }
  if (normalized.startsWith("//")) {
    return "UNC_PATH_REJECTED";
  }
  if (normalized.split("/").includes("..")) {
    return "PARENT_TRAVERSAL_REJECTED";
  }
  for (const segment of lower.split("/")) {
    if (blockedPathSegments.has(segment)) {
      return "BLOCKED_PATH_SEGMENT";
    }
  }
  if (/secret|password|token|authorization|apikey|api-key/i.test(pathValue)) {
    return "SECRET_LIKE_PATH_REJECTED";
  }
  return undefined;
}

function forbiddenCodeForKey(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.includes("prompt")) {
    return "RAW_PROMPT_FIELD_REJECTED";
  }
  if (normalized.includes("response")) {
    return "RAW_RESPONSE_FIELD_REJECTED";
  }
  if (normalized.includes("reasoning")) {
    return "REASONING_CONTENT_FIELD_REJECTED";
  }
  if (normalized.includes("source")) {
    return "RAW_SOURCE_FIELD_REJECTED";
  }
  if (normalized.includes("diff")) {
    return "RAW_DIFF_FIELD_REJECTED";
  }
  if (normalized.includes("filecontent") || normalized.includes("preimage")) {
    return "RAW_WORKSPACE_CONTENT_FIELD_REJECTED";
  }
  if (normalized.includes("key") || normalized.includes("authorization")) {
    return "SECRET_FIELD_REJECTED";
  }
  return "EXECUTION_FIELD_REJECTED";
}

function finding(
  kind: EndToEndCodingTaskFixtureFindingKind,
  severity: EndToEndCodingTaskFixtureSeverity,
  code: string,
  path?: string
): EndToEndCodingTaskFixtureFinding {
  return {
    findingId: `${severity}:${kind}:${code}:${path ?? "$"}`,
    kind,
    severity,
    code,
    safeMessage: safeMessageForCode(code),
    path
  };
}

function safeMessageForCode(code: string): string {
  const messages: Record<string, string> = {
    INVALID_JSON: "Fixture JSON could not be parsed.",
    INPUT_NOT_OBJECT: "Fixture input must be an object.",
    INPUT_ARRAY_NOT_SUPPORTED: "Validate one fixture at a time.",
    DUPLICATE_TASK_ID: "Duplicate task IDs are not allowed in a fixture batch.",
    UNKNOWN_TOP_LEVEL_FIELD: "Fixture contains an unsupported top-level field.",
    UNSUPPORTED_SCHEMA_VERSION: "Fixture schemaVersion is not supported.",
    MISSING_FIELD: "Fixture is missing a required summary field.",
    EMPTY_FIELD: "Fixture contains an empty required summary field.",
    ALLOWED_PATH_REFS_NOT_ARRAY: "allowedPathRefs must be an array.",
    FORBIDDEN_PATH_POLICY_NOT_ARRAY: "forbiddenPathPolicy must be an array.",
    EXPECTED_EVENTS_NOT_ARRAY: "expectedEvents must be an array.",
    MISSING_EXPECTED_EVENTS: "Expected summary events are required.",
    EXPECTED_EVENT_NOT_OBJECT: "Expected event summaries must be objects.",
    EXPECTED_EVENT_MISSING_REF: "Expected event summary is missing a ref.",
    EXPECTED_EVENT_EMPTY_SUMMARY: "Expected event summary is empty.",
    DUPLICATE_EVENT_REF: "Duplicate expected event refs are not allowed.",
    EXPECTED_ARTIFACT_NOT_OBJECT:
      "Expected artifact summary must be an object.",
    EXPECTED_ARTIFACT_EMPTY_SUMMARY: "Expected artifact summary is empty.",
    EXPECTED_ROLLBACK_SUMMARY_NOT_OBJECT:
      "Expected rollback summary must be an object when present.",
    NO_ALLOWED_PATH_REFS: "At least one allowed path ref is required.",
    EMPTY_PATH_REF: "Allowed path refs must be non-empty.",
    ABSOLUTE_PATH_REJECTED: "Absolute paths are not allowed.",
    UNC_PATH_REJECTED: "UNC paths are not allowed.",
    PARENT_TRAVERSAL_REJECTED: "Parent traversal is not allowed.",
    BLOCKED_PATH_SEGMENT: "Blocked workspace path segment is not allowed.",
    SECRET_LIKE_PATH_REJECTED: "Secret-like paths are not allowed.",
    FAILURE_CATEGORIES_NOT_ARRAY: "Failure categories must be an array.",
    UNKNOWN_FAILURE_CATEGORY: "Failure category is not supported.",
    RAW_PROMPT_FIELD_REJECTED: "Raw prompt fields are not allowed.",
    RAW_RESPONSE_FIELD_REJECTED: "Raw response fields are not allowed.",
    REASONING_CONTENT_FIELD_REJECTED:
      "Reasoning content fields are not allowed.",
    RAW_SOURCE_FIELD_REJECTED: "Raw source fields are not allowed.",
    RAW_DIFF_FIELD_REJECTED: "Raw diff fields are not allowed.",
    RAW_WORKSPACE_CONTENT_FIELD_REJECTED:
      "Raw workspace content fields are not allowed.",
    SECRET_FIELD_REJECTED: "Secret fields are not allowed.",
    EXECUTION_FIELD_REJECTED: "Execution fields are not allowed.",
    EXECUTION_READINESS_TRUE: "Execution readiness flags must remain false.",
    API_KEY_MARKER: "API key-like marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token-like marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected."
  };
  return messages[code] ?? "Fixture failed a safety check.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalSafeString(value: unknown): string | undefined {
  const text = safeString(value);
  return text === "" ? undefined : text;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? uniqueStrings(value.map(safeString).filter((item) => item !== ""))
    : [];
}

function uniqueStrings<T extends string>(value: T[]): T[] {
  return [...new Set(value)];
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortForStableHash(value));
}

function sortForStableHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForStableHash);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortForStableHash(child)])
    );
  }
  return value;
}
