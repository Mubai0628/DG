import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ProjectKnowledgeEntryType = "policy" | "project_fact" | "pitfall";

export type ProjectKnowledgeStatus =
  | "candidate"
  | "reviewed"
  | "committed"
  | "recalled"
  | "revoked"
  | "expired";

export type ProjectKnowledgePolicySourceKind =
  | "human_reviewed"
  | "repo_doc_summary"
  | "manual_import_summary";

export type ProjectKnowledgeProvenanceSourceKind =
  | ProjectKnowledgePolicySourceKind
  | "model_suggested"
  | "tool_output_summary"
  | "external_summary";

export type ProjectKnowledgeTrust = {
  score: number;
  level: "low" | "medium" | "high" | "trusted";
  humanReviewed: boolean;
  reviewedBy?: string | undefined;
};

export type ProjectKnowledgeEvidenceRef = {
  refId: string;
  kind:
    | "user_request"
    | "repo_doc"
    | "test_summary"
    | "manual_note"
    | "event_summary"
    | "memory_summary"
    | "tool_summary";
  summary: string;
  hashPrefix: string;
  warningCodes: string[];
};

export type ProjectKnowledgeProvenance = {
  sourceKind: ProjectKnowledgeProvenanceSourceKind;
  sourceId?: string | undefined;
  actor?: string | undefined;
  summary: string;
  refHashes: string[];
};

export type ProjectKnowledgeBaseEntry = {
  entryId: string;
  type: ProjectKnowledgeEntryType;
  namespace: string;
  summary: string;
  status: ProjectKnowledgeStatus;
  trust: ProjectKnowledgeTrust;
  provenance: ProjectKnowledgeProvenance;
  evidenceRefs: ProjectKnowledgeEvidenceRef[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | undefined;
  revokedAt?: string | undefined;
  pinned: boolean;
  entryHash: string;
};

export type ProjectKnowledgePolicyEntry = ProjectKnowledgeBaseEntry & {
  type: "policy";
  policyScope: string;
  sourceKind: ProjectKnowledgePolicySourceKind;
};

export type ProjectKnowledgeProjectFactEntry = ProjectKnowledgeBaseEntry & {
  type: "project_fact";
  factKind: string;
};

export type ProjectKnowledgePitfallEntry = ProjectKnowledgeBaseEntry & {
  type: "pitfall";
  triggerSummary: string;
  mitigationSummary: string;
  severity: "low" | "medium" | "high";
};

export type ProjectKnowledgeEntry =
  | ProjectKnowledgePolicyEntry
  | ProjectKnowledgeProjectFactEntry
  | ProjectKnowledgePitfallEntry;

export type ProjectKnowledgeCandidate = {
  candidateId: string;
  type: ProjectKnowledgeEntryType;
  namespace: string;
  summary: string;
  trust: ProjectKnowledgeTrust;
  provenance: ProjectKnowledgeProvenance;
  evidenceRefs: ProjectKnowledgeEvidenceRef[];
  tags: string[];
  createdAt: string;
  expiresAt?: string | undefined;
  pinned: boolean;
  policyScope?: string | undefined;
  sourceKind?: ProjectKnowledgePolicySourceKind | undefined;
  factKind?: string | undefined;
  triggerSummary?: string | undefined;
  mitigationSummary?: string | undefined;
  severity?: "low" | "medium" | "high" | undefined;
  candidateHash: string;
};

export type ProjectKnowledgeCommitDecision = {
  status: "approved" | "rejected" | "needs_review";
  candidateId: string;
  entryId?: string | undefined;
  reasonCodes: string[];
  reviewedBy?: string | undefined;
  summaryOnly: true;
  createdAt: string;
};

export type ProjectKnowledgeStoreRecord = {
  recordId: string;
  recordKind: "entry";
  entry: ProjectKnowledgeEntry;
  createdAt: string;
  recordHash: string;
};

export type ProjectKnowledgeLogicalFileContract = {
  root: ".deepseek-workbench/project-knowledge";
  entriesJsonl: ".deepseek-workbench/project-knowledge/entries.jsonl";
  eventsJsonl: ".deepseek-workbench/project-knowledge/events.jsonl";
  indexJson: ".deepseek-workbench/project-knowledge/index.json";
  appendOnly: true;
  summaryOnly: true;
  workspaceLocal: true;
  replayable: true;
  backupExportDeferred: true;
};

export type ProjectKnowledgeStoreSnapshotStatus =
  | "empty"
  | "ready"
  | "warning"
  | "blocked";

export type ProjectKnowledgeFindingKind =
  | "schema"
  | "type"
  | "summary"
  | "source"
  | "status"
  | "trust"
  | "evidence"
  | "namespace"
  | "raw_field"
  | "secret"
  | "execution"
  | "snapshot";

export type ProjectKnowledgeSeverity = "blocker" | "warning";

export type ProjectKnowledgeFinding = {
  findingId: string;
  kind: ProjectKnowledgeFindingKind;
  severity: ProjectKnowledgeSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ProjectKnowledgeReadiness = {
  canEnterRecallIndex: boolean;
  canWriteStore: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ProjectKnowledgeEntrySummary = {
  entryId?: string | undefined;
  type?: ProjectKnowledgeEntryType | undefined;
  namespace?: string | undefined;
  summary?: string | undefined;
  status?: ProjectKnowledgeStatus | undefined;
  trustScore?: number | undefined;
  evidenceRefCount: number;
  tagCount: number;
  warningCodes: string[];
  entryHash?: string | undefined;
  summaryOnly: true;
};

export type ProjectKnowledgeEntryValidationStatus =
  | "valid"
  | "warning"
  | "blocked";

export type ProjectKnowledgeEntryValidationResult = {
  status: ProjectKnowledgeEntryValidationStatus;
  entry?: ProjectKnowledgeEntry | undefined;
  summary: ProjectKnowledgeEntrySummary;
  findings: ProjectKnowledgeFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  normalizedHash: string;
  readiness: ProjectKnowledgeReadiness;
  nextAction: string;
  source: "runtime_project_knowledge_store_contract";
};

export type ProjectKnowledgeCandidateValidationResult = {
  status: ProjectKnowledgeEntryValidationStatus;
  candidate?: ProjectKnowledgeCandidate | undefined;
  summary: ProjectKnowledgeEntrySummary & {
    candidateId?: string | undefined;
    candidateHash?: string | undefined;
  };
  findings: ProjectKnowledgeFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  normalizedHash: string;
  readiness: ProjectKnowledgeReadiness;
  nextAction: string;
  source: "runtime_project_knowledge_store_contract";
};

export type ProjectKnowledgeStoreSnapshot = {
  status: ProjectKnowledgeStoreSnapshotStatus;
  snapshotId: string;
  logicalFiles: ProjectKnowledgeLogicalFileContract;
  recordCount: number;
  entryCount: number;
  activeEntryCount: number;
  candidateEntryCount: number;
  revokedEntryCount: number;
  expiredEntryCount: number;
  policyCount: number;
  projectFactCount: number;
  pitfallCount: number;
  entries: ProjectKnowledgeEntrySummary[];
  findings: ProjectKnowledgeFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  snapshotHash: string;
  readiness: ProjectKnowledgeReadiness;
  nextAction: string;
  source: "runtime_project_knowledge_store_contract";
};

export type ProjectKnowledgeStoreSnapshotSummary = {
  status: ProjectKnowledgeStoreSnapshotStatus;
  snapshotId: string;
  recordCount: number;
  entryCount: number;
  activeEntryCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  snapshotHash: string;
  summaryOnly: true;
  source: "runtime_project_knowledge_store_contract_summary";
};

export type ProjectKnowledgeValidationOptions = {
  createdAt?: string | undefined;
  now?: string | Date | undefined;
  idGenerator?: (() => string) | undefined;
};

export const projectKnowledgeLogicalFileContract: ProjectKnowledgeLogicalFileContract =
  {
    root: ".deepseek-workbench/project-knowledge",
    entriesJsonl: ".deepseek-workbench/project-knowledge/entries.jsonl",
    eventsJsonl: ".deepseek-workbench/project-knowledge/events.jsonl",
    indexJson: ".deepseek-workbench/project-knowledge/index.json",
    appendOnly: true,
    summaryOnly: true,
    workspaceLocal: true,
    replayable: true,
    backupExportDeferred: true
  };

const supportedTypes = new Set<ProjectKnowledgeEntryType>([
  "policy",
  "project_fact",
  "pitfall"
]);

const supportedStatuses = new Set<ProjectKnowledgeStatus>([
  "candidate",
  "reviewed",
  "committed",
  "recalled",
  "revoked",
  "expired"
]);

const activeStatuses = new Set<ProjectKnowledgeStatus>([
  "candidate",
  "reviewed",
  "committed",
  "recalled"
]);

const policySourceKinds = new Set<ProjectKnowledgePolicySourceKind>([
  "human_reviewed",
  "repo_doc_summary",
  "manual_import_summary"
]);

const provenanceSourceKinds = new Set<ProjectKnowledgeProvenanceSourceKind>([
  "human_reviewed",
  "repo_doc_summary",
  "manual_import_summary",
  "model_suggested",
  "tool_output_summary",
  "external_summary"
]);

const evidenceKinds = new Set<ProjectKnowledgeEvidenceRef["kind"]>([
  "user_request",
  "repo_doc",
  "test_summary",
  "manual_note",
  "event_summary",
  "memory_summary",
  "tool_summary"
]);

const trustLevels = new Set<ProjectKnowledgeTrust["level"]>([
  "low",
  "medium",
  "high",
  "trusted"
]);

const pitfallSeverities = new Set<ProjectKnowledgePitfallEntry["severity"]>([
  "low",
  "medium",
  "high"
]);

const maxSummaryChars = 500;
const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    "promptText",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
    apiKeyField,
    authHeaderField,
    bearerField,
    tokenField,
    "secret",
    "env",
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
    "nativeBridge"
  ].map((key) => key.toLowerCase())
);

const executionAttemptKeys = new Set(
  [
    "canApply",
    "canExecute",
    "canApplyPatch",
    "canRollback",
    "canWriteStore",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowEventStoreWrite",
    "allowGit",
    "allowShell",
    "allowAppExecution",
    "executeNow"
  ].map((key) => key.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: new RegExp(`\\b${bearerField}\\s+[A-Za-z0-9._-]{8,}`, "i")
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
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b|raw prompt`, "i")
  },
  {
    code: "RAW_SOURCE_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Source"}\\b|raw source`, "i")
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b|raw diff`, "i")
  },
  {
    code: "RAW_CONTENT_MARKER",
    pattern: /raw content|file content|workspace dump/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function validateProjectKnowledgeEntry(
  input: unknown,
  options: ProjectKnowledgeValidationOptions = {}
): ProjectKnowledgeEntryValidationResult {
  const findings: ProjectKnowledgeFinding[] = [];
  if (!isRecord(input)) {
    findings.push(finding("schema", "blocker", "INPUT_NOT_OBJECT"));
    return entryResult(undefined, findings);
  }

  findings.push(...validateKnowledgeRecord(input, "entry", options));
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const entry = blockerCount === 0 ? normalizeEntry(input, options) : undefined;
  return entryResult(entry, findings);
}

export function validateProjectKnowledgeCandidate(
  input: unknown,
  options: ProjectKnowledgeValidationOptions = {}
): ProjectKnowledgeCandidateValidationResult {
  const findings: ProjectKnowledgeFinding[] = [];
  if (!isRecord(input)) {
    findings.push(finding("schema", "blocker", "INPUT_NOT_OBJECT"));
    return candidateResult(undefined, findings);
  }

  findings.push(...validateKnowledgeRecord(input, "candidate", options));
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const candidate =
    blockerCount === 0 ? normalizeCandidate(input, options) : undefined;
  return candidateResult(candidate, findings);
}

export function summarizeProjectKnowledgeEntry(
  entry: ProjectKnowledgeEntry
): ProjectKnowledgeEntrySummary {
  return {
    entryId: entry.entryId,
    type: entry.type,
    namespace: entry.namespace,
    summary: safeSummary(entry.summary),
    status: entry.status,
    trustScore: entry.trust.score,
    evidenceRefCount: entry.evidenceRefs.length,
    tagCount: entry.tags.length,
    warningCodes: uniqueStrings(
      entry.evidenceRefs.flatMap((ref) => ref.warningCodes)
    ),
    entryHash: entry.entryHash,
    summaryOnly: true
  };
}

export function buildProjectKnowledgeStoreSnapshot(
  records: readonly ProjectKnowledgeStoreRecord[],
  options: ProjectKnowledgeValidationOptions = {}
): ProjectKnowledgeStoreSnapshot {
  const findings: ProjectKnowledgeFinding[] = [];
  const seenEntryIds = new Set<string>();
  const entries: ProjectKnowledgeEntry[] = [];

  for (const [index, record] of records.entries()) {
    if (!isRecord(record)) {
      findings.push(
        finding("snapshot", "blocker", "STORE_RECORD_NOT_OBJECT", `${index}`)
      );
      continue;
    }
    if (record.recordKind !== "entry") {
      findings.push(
        finding(
          "snapshot",
          "blocker",
          "UNSUPPORTED_STORE_RECORD_KIND",
          `${index}.recordKind`
        )
      );
      continue;
    }
    if (!isProjectKnowledgeEntry(record.entry)) {
      const result = validateProjectKnowledgeEntry(record.entry, options);
      findings.push(...result.findings);
      continue;
    }
    const result = validateProjectKnowledgeEntry(record.entry, options);
    findings.push(...result.findings);
    if (result.entry === undefined) {
      continue;
    }
    if (seenEntryIds.has(result.entry.entryId)) {
      findings.push(
        finding(
          "snapshot",
          "blocker",
          "DUPLICATE_ENTRY_ID",
          `${index}.entry.entryId`
        )
      );
      continue;
    }
    seenEntryIds.add(result.entry.entryId);
    entries.push(result.entry);
  }

  const dedupedFindings = uniqueFindings(findings);
  const blockerCount = dedupedFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = dedupedFindings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: ProjectKnowledgeStoreSnapshotStatus =
    records.length === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "ready";
  const entrySummaries = entries.map(summarizeProjectKnowledgeEntry);
  const snapshotHash = stablePreviewHash(
    stableStringify({
      status,
      recordCount: records.length,
      entries: entrySummaries.map((entry) => ({
        entryId: entry.entryId,
        type: entry.type,
        status: entry.status,
        entryHash: entry.entryHash
      })),
      findings: dedupedFindings.map((item) => ({
        kind: item.kind,
        severity: item.severity,
        code: item.code,
        path: item.path
      }))
    })
  );
  return {
    status,
    snapshotId:
      options.idGenerator?.() ??
      `project-knowledge-snapshot-${snapshotHash.slice(0, 12)}`,
    logicalFiles: projectKnowledgeLogicalFileContract,
    recordCount: records.length,
    entryCount: entries.length,
    activeEntryCount: entries.filter((entry) =>
      activeStatuses.has(entry.status)
    ).length,
    candidateEntryCount: entries.filter((entry) => entry.status === "candidate")
      .length,
    revokedEntryCount: entries.filter((entry) => entry.status === "revoked")
      .length,
    expiredEntryCount: entries.filter((entry) => entry.status === "expired")
      .length,
    policyCount: entries.filter((entry) => entry.type === "policy").length,
    projectFactCount: entries.filter((entry) => entry.type === "project_fact")
      .length,
    pitfallCount: entries.filter((entry) => entry.type === "pitfall").length,
    entries: entrySummaries,
    findings: dedupedFindings,
    blockerCount,
    warningCount,
    findingCount: dedupedFindings.length,
    snapshotHash,
    readiness: disabledReadiness(blockerCount === 0 && entries.length > 0),
    nextAction: snapshotNextAction(status),
    source: "runtime_project_knowledge_store_contract"
  };
}

export function summarizeProjectKnowledgeStoreSnapshot(
  snapshot: ProjectKnowledgeStoreSnapshot
): ProjectKnowledgeStoreSnapshotSummary {
  return {
    status: snapshot.status,
    snapshotId: snapshot.snapshotId,
    recordCount: snapshot.recordCount,
    entryCount: snapshot.entryCount,
    activeEntryCount: snapshot.activeEntryCount,
    blockerCount: snapshot.blockerCount,
    warningCount: snapshot.warningCount,
    findingCount: snapshot.findingCount,
    snapshotHash: snapshot.snapshotHash,
    summaryOnly: true,
    source: "runtime_project_knowledge_store_contract_summary"
  };
}

function validateKnowledgeRecord(
  record: Record<string, unknown>,
  mode: "entry" | "candidate",
  options: ProjectKnowledgeValidationOptions
): ProjectKnowledgeFinding[] {
  const findings: ProjectKnowledgeFinding[] = [];
  findings.push(...findForbiddenFields(record));
  findings.push(...findUnsafeStringMarkers(record));
  findings.push(...validateCoreFields(record, mode, options));
  findings.push(...validateTypeSpecificFields(record));
  findings.push(...validateEvidenceRefs(record.evidenceRefs));
  findings.push(...validateTrust(record.trust));
  findings.push(...validateProvenance(record.provenance));
  return uniqueFindings(findings);
}

function validateCoreFields(
  record: Record<string, unknown>,
  mode: "entry" | "candidate",
  options: ProjectKnowledgeValidationOptions
): ProjectKnowledgeFinding[] {
  const findings: ProjectKnowledgeFinding[] = [];
  const type = text(record.type);
  if (!supportedTypes.has(type as ProjectKnowledgeEntryType)) {
    findings.push(finding("type", "blocker", "UNKNOWN_TYPE", "type"));
  }
  const namespace = text(record.namespace);
  if (namespace.length === 0) {
    findings.push(finding("namespace", "blocker", "MISSING_NAMESPACE"));
  } else if (!/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(namespace)) {
    findings.push(finding("namespace", "blocker", "INVALID_NAMESPACE"));
  }
  const summary = text(record.summary);
  if (summary.length === 0) {
    findings.push(finding("summary", "blocker", "MISSING_SUMMARY"));
  }
  if (summary.length > maxSummaryChars) {
    findings.push(finding("summary", "blocker", "SUMMARY_TOO_LONG"));
  }
  if (mode === "entry") {
    if (text(record.entryId).length === 0) {
      findings.push(finding("schema", "blocker", "MISSING_ENTRY_ID"));
    }
    const status = text(record.status);
    if (!supportedStatuses.has(status as ProjectKnowledgeStatus)) {
      findings.push(finding("status", "blocker", "INVALID_STATUS"));
    } else {
      findings.push(
        ...validateStatusLifecycle(
          record,
          status as ProjectKnowledgeStatus,
          options
        )
      );
    }
    if (text(record.entryHash).length === 0) {
      findings.push(finding("schema", "warning", "ENTRY_HASH_GENERATED"));
    }
  } else if (text(record.candidateId).length === 0) {
    findings.push(finding("schema", "warning", "CANDIDATE_ID_GENERATED"));
  }
  return findings;
}

function validateStatusLifecycle(
  record: Record<string, unknown>,
  status: ProjectKnowledgeStatus,
  options: ProjectKnowledgeValidationOptions
): ProjectKnowledgeFinding[] {
  const findings: ProjectKnowledgeFinding[] = [];
  if (activeStatuses.has(status) && text(record.revokedAt).length > 0) {
    findings.push(finding("status", "blocker", "REVOKED_ACTIVE_STATUS"));
  }
  const expiresAt = text(record.expiresAt);
  if (
    activeStatuses.has(status) &&
    expiresAt.length > 0 &&
    !isTruthy(record.pinned) &&
    isExpiredAt(expiresAt, options.now)
  ) {
    findings.push(finding("status", "blocker", "EXPIRED_ACTIVE_STATUS"));
  }
  if (status === "expired" && expiresAt.length === 0) {
    findings.push(finding("status", "warning", "EXPIRED_MISSING_EXPIRES_AT"));
  }
  if (status === "revoked" && text(record.revokedAt).length === 0) {
    findings.push(finding("status", "warning", "REVOKED_MISSING_REVOKED_AT"));
  }
  return findings;
}

function validateTypeSpecificFields(
  record: Record<string, unknown>
): ProjectKnowledgeFinding[] {
  const findings: ProjectKnowledgeFinding[] = [];
  const type = text(record.type);
  if (type === "policy") {
    const sourceKind = text(record.sourceKind);
    if (
      !policySourceKinds.has(sourceKind as ProjectKnowledgePolicySourceKind)
    ) {
      findings.push(finding("source", "blocker", "POLICY_SOURCE_REJECTED"));
    }
    if (text(record.policyScope).length === 0) {
      findings.push(finding("schema", "blocker", "MISSING_POLICY_SCOPE"));
    }
    const provenance = isRecord(record.provenance) ? record.provenance : {};
    const provenanceSource = text(provenance.sourceKind);
    if (
      provenanceSource === "model_suggested" ||
      provenanceSource === "tool_output_summary" ||
      provenanceSource === "external_summary"
    ) {
      findings.push(
        finding("source", "blocker", "POLICY_UNREVIEWED_SOURCE_REJECTED")
      );
    }
  }
  if (type === "project_fact") {
    if (text(record.factKind).length === 0) {
      findings.push(finding("schema", "blocker", "MISSING_FACT_KIND"));
    }
    if (
      !Array.isArray(record.evidenceRefs) ||
      record.evidenceRefs.length === 0
    ) {
      findings.push(
        finding("evidence", "blocker", "PROJECT_FACT_REQUIRES_EVIDENCE")
      );
    }
  }
  if (type === "pitfall") {
    if (text(record.triggerSummary).length === 0) {
      findings.push(finding("schema", "blocker", "PITFALL_REQUIRES_TRIGGER"));
    }
    if (text(record.mitigationSummary).length === 0) {
      findings.push(
        finding("schema", "blocker", "PITFALL_REQUIRES_MITIGATION")
      );
    }
    if (!pitfallSeverities.has(text(record.severity) as never)) {
      findings.push(finding("schema", "blocker", "INVALID_PITFALL_SEVERITY"));
    }
  }
  return findings;
}

function validateEvidenceRefs(value: unknown): ProjectKnowledgeFinding[] {
  const findings: ProjectKnowledgeFinding[] = [];
  if (!Array.isArray(value)) {
    findings.push(finding("evidence", "blocker", "MISSING_EVIDENCE_REFS"));
    return findings;
  }
  const seen = new Set<string>();
  for (const [index, item] of value.entries()) {
    const path = `evidenceRefs[${index}]`;
    if (!isRecord(item)) {
      findings.push(
        finding("evidence", "blocker", "EVIDENCE_REF_NOT_OBJECT", path)
      );
      continue;
    }
    const refId = text(item.refId);
    if (refId.length === 0) {
      findings.push(
        finding("evidence", "blocker", "EVIDENCE_REF_MISSING_ID", path)
      );
    } else if (seen.has(refId)) {
      findings.push(
        finding("evidence", "blocker", "DUPLICATE_EVIDENCE_REF", path)
      );
    }
    seen.add(refId);
    if (
      !evidenceKinds.has(text(item.kind) as ProjectKnowledgeEvidenceRef["kind"])
    ) {
      findings.push(
        finding("evidence", "blocker", "UNKNOWN_EVIDENCE_KIND", path)
      );
    }
    if (text(item.summary).length === 0) {
      findings.push(
        finding("evidence", "blocker", "EVIDENCE_REF_MISSING_SUMMARY", path)
      );
    }
    if (!isSafeHash(text(item.hashPrefix))) {
      findings.push(
        finding("evidence", "blocker", "EVIDENCE_REF_MISSING_HASH", path)
      );
    }
  }
  return findings;
}

function validateTrust(value: unknown): ProjectKnowledgeFinding[] {
  const findings: ProjectKnowledgeFinding[] = [];
  if (!isRecord(value)) {
    findings.push(finding("trust", "blocker", "MISSING_TRUST"));
    return findings;
  }
  if (!trustLevels.has(text(value.level) as ProjectKnowledgeTrust["level"])) {
    findings.push(finding("trust", "blocker", "INVALID_TRUST_LEVEL"));
  }
  if (
    typeof value.score !== "number" ||
    !Number.isFinite(value.score) ||
    value.score < 0 ||
    value.score > 1
  ) {
    findings.push(finding("trust", "blocker", "TRUST_OUT_OF_RANGE"));
  }
  if (typeof value.humanReviewed !== "boolean") {
    findings.push(finding("trust", "warning", "TRUST_REVIEW_FLAG_MISSING"));
  }
  return findings;
}

function validateProvenance(value: unknown): ProjectKnowledgeFinding[] {
  const findings: ProjectKnowledgeFinding[] = [];
  if (!isRecord(value)) {
    findings.push(finding("source", "blocker", "MISSING_PROVENANCE"));
    return findings;
  }
  if (!provenanceSourceKinds.has(text(value.sourceKind) as never)) {
    findings.push(finding("source", "blocker", "UNKNOWN_PROVENANCE_SOURCE"));
  }
  if (text(value.summary).length === 0) {
    findings.push(finding("source", "blocker", "PROVENANCE_MISSING_SUMMARY"));
  }
  const refs = Array.isArray(value.refHashes) ? value.refHashes : [];
  if (refs.some((item) => typeof item !== "string" || !isSafeHash(item))) {
    findings.push(finding("source", "blocker", "PROVENANCE_REF_HASH_INVALID"));
  }
  return findings;
}

function normalizeEntry(
  record: Record<string, unknown>,
  options: ProjectKnowledgeValidationOptions
): ProjectKnowledgeEntry {
  const type = record.type as ProjectKnowledgeEntryType;
  const baseWithoutHash = {
    entryId: text(record.entryId),
    type,
    namespace: text(record.namespace),
    summary: text(record.summary),
    status: record.status as ProjectKnowledgeStatus,
    trust: normalizeTrust(record.trust),
    provenance: normalizeProvenance(record.provenance),
    evidenceRefs: normalizeEvidenceRefs(record.evidenceRefs),
    tags: safeStringArray(record.tags),
    createdAt: text(record.createdAt) || createdAt(options),
    updatedAt: text(record.updatedAt) || createdAt(options),
    ...(text(record.expiresAt).length > 0
      ? { expiresAt: text(record.expiresAt) }
      : {}),
    ...(text(record.revokedAt).length > 0
      ? { revokedAt: text(record.revokedAt) }
      : {}),
    pinned: isTruthy(record.pinned)
  };
  const specific =
    type === "policy"
      ? {
          policyScope: text(record.policyScope),
          sourceKind: record.sourceKind as ProjectKnowledgePolicySourceKind
        }
      : type === "project_fact"
        ? { factKind: text(record.factKind) }
        : {
            triggerSummary: text(record.triggerSummary),
            mitigationSummary: text(record.mitigationSummary),
            severity:
              record.severity as ProjectKnowledgePitfallEntry["severity"]
          };
  const withoutHash = { ...baseWithoutHash, ...specific };
  const entryHash = stablePreviewHash(stableStringify(withoutHash));
  return { ...withoutHash, entryHash } as ProjectKnowledgeEntry;
}

function normalizeCandidate(
  record: Record<string, unknown>,
  options: ProjectKnowledgeValidationOptions
): ProjectKnowledgeCandidate {
  const type = record.type as ProjectKnowledgeEntryType;
  const withoutHash: Omit<ProjectKnowledgeCandidate, "candidateHash"> = {
    candidateId:
      text(record.candidateId) || generatedId(options, "pk-candidate"),
    type,
    namespace: text(record.namespace),
    summary: text(record.summary),
    trust: normalizeTrust(record.trust),
    provenance: normalizeProvenance(record.provenance),
    evidenceRefs: normalizeEvidenceRefs(record.evidenceRefs),
    tags: safeStringArray(record.tags),
    createdAt: text(record.createdAt) || createdAt(options),
    ...(text(record.expiresAt).length > 0
      ? { expiresAt: text(record.expiresAt) }
      : {}),
    pinned: isTruthy(record.pinned),
    ...(type === "policy"
      ? {
          policyScope: text(record.policyScope),
          sourceKind: record.sourceKind as ProjectKnowledgePolicySourceKind
        }
      : {}),
    ...(type === "project_fact" ? { factKind: text(record.factKind) } : {}),
    ...(type === "pitfall"
      ? {
          triggerSummary: text(record.triggerSummary),
          mitigationSummary: text(record.mitigationSummary),
          severity: record.severity as ProjectKnowledgePitfallEntry["severity"]
        }
      : {})
  };
  return {
    ...withoutHash,
    candidateHash: stablePreviewHash(stableStringify(withoutHash))
  };
}

function normalizeTrust(value: unknown): ProjectKnowledgeTrust {
  const record = isRecord(value) ? value : {};
  return {
    score:
      typeof record.score === "number" && Number.isFinite(record.score)
        ? record.score
        : 0,
    level: trustLevels.has(text(record.level) as ProjectKnowledgeTrust["level"])
      ? (record.level as ProjectKnowledgeTrust["level"])
      : "low",
    humanReviewed: record.humanReviewed === true,
    ...(text(record.reviewedBy).length > 0
      ? { reviewedBy: text(record.reviewedBy) }
      : {})
  };
}

function normalizeProvenance(value: unknown): ProjectKnowledgeProvenance {
  const record = isRecord(value) ? value : {};
  return {
    sourceKind: provenanceSourceKinds.has(
      text(record.sourceKind) as ProjectKnowledgeProvenanceSourceKind
    )
      ? (record.sourceKind as ProjectKnowledgeProvenanceSourceKind)
      : "manual_import_summary",
    ...(text(record.sourceId).length > 0
      ? { sourceId: text(record.sourceId) }
      : {}),
    ...(text(record.actor).length > 0 ? { actor: text(record.actor) } : {}),
    summary: text(record.summary),
    refHashes: safeStringArray(record.refHashes).filter(isSafeHash)
  };
}

function normalizeEvidenceRefs(value: unknown): ProjectKnowledgeEvidenceRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((item) => ({
    refId: text(item.refId),
    kind: evidenceKinds.has(
      text(item.kind) as ProjectKnowledgeEvidenceRef["kind"]
    )
      ? (item.kind as ProjectKnowledgeEvidenceRef["kind"])
      : "manual_note",
    summary: text(item.summary),
    hashPrefix: text(item.hashPrefix),
    warningCodes: safeCodeArray(item.warningCodes)
  }));
}

function entryResult(
  entry: ProjectKnowledgeEntry | undefined,
  findings: readonly ProjectKnowledgeFinding[]
): ProjectKnowledgeEntryValidationResult {
  const dedupedFindings = uniqueFindings(findings);
  const blockerCount = dedupedFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = dedupedFindings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: ProjectKnowledgeEntryValidationStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "valid";
  const summary =
    entry === undefined
      ? emptyEntrySummary(dedupedFindings)
      : summarizeProjectKnowledgeEntry(entry);
  const normalizedHash = stablePreviewHash(
    stableStringify({
      status,
      summary: {
        entryId: summary.entryId,
        type: summary.type,
        namespace: summary.namespace,
        evidenceRefCount: summary.evidenceRefCount,
        entryHash: summary.entryHash
      },
      findings: dedupedFindings.map((item) => ({
        kind: item.kind,
        severity: item.severity,
        code: item.code,
        path: item.path
      }))
    })
  );
  return {
    status,
    ...(entry !== undefined ? { entry } : {}),
    summary,
    findings: dedupedFindings,
    blockerCount,
    warningCount,
    findingCount: dedupedFindings.length,
    normalizedHash,
    readiness: disabledReadiness(blockerCount === 0),
    nextAction: nextActionFor(status),
    source: "runtime_project_knowledge_store_contract"
  };
}

function candidateResult(
  candidate: ProjectKnowledgeCandidate | undefined,
  findings: readonly ProjectKnowledgeFinding[]
): ProjectKnowledgeCandidateValidationResult {
  const dedupedFindings = uniqueFindings(findings);
  const blockerCount = dedupedFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = dedupedFindings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: ProjectKnowledgeEntryValidationStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "valid";
  const summary =
    candidate === undefined
      ? emptyEntrySummary(dedupedFindings)
      : {
          candidateId: candidate.candidateId,
          type: candidate.type,
          namespace: candidate.namespace,
          summary: safeSummary(candidate.summary),
          status: "candidate" as const,
          trustScore: candidate.trust.score,
          evidenceRefCount: candidate.evidenceRefs.length,
          tagCount: candidate.tags.length,
          warningCodes: uniqueStrings(
            candidate.evidenceRefs.flatMap((ref) => ref.warningCodes)
          ),
          candidateHash: candidate.candidateHash,
          summaryOnly: true as const
        };
  const normalizedHash = stablePreviewHash(
    stableStringify({
      status,
      candidateHash: candidate?.candidateHash,
      findingCodes: dedupedFindings.map((item) => item.code)
    })
  );
  return {
    status,
    ...(candidate !== undefined ? { candidate } : {}),
    summary,
    findings: dedupedFindings,
    blockerCount,
    warningCount,
    findingCount: dedupedFindings.length,
    normalizedHash,
    readiness: disabledReadiness(blockerCount === 0),
    nextAction: nextActionFor(status),
    source: "runtime_project_knowledge_store_contract"
  };
}

function emptyEntrySummary(
  findings: readonly ProjectKnowledgeFinding[]
): ProjectKnowledgeEntrySummary {
  return {
    evidenceRefCount: 0,
    tagCount: 0,
    warningCodes: findings.map((item) => item.code),
    summaryOnly: true
  };
}

function nextActionFor(status: ProjectKnowledgeEntryValidationStatus): string {
  if (status === "blocked") {
    return "Reject this project knowledge record until schema, source, redaction, evidence, and lifecycle blockers are resolved.";
  }
  if (status === "warning") {
    return "Review warnings before this summary-only record enters the project knowledge store contract.";
  }
  return "Record is valid for the project knowledge store contract. File writes, EventStore writes, and execution remain disabled.";
}

function snapshotNextAction(
  status: ProjectKnowledgeStoreSnapshotStatus
): string {
  if (status === "empty") {
    return "Provide summary-only project knowledge records before building a recall index.";
  }
  if (status === "blocked") {
    return "Resolve snapshot blockers before this store contract can be replayed.";
  }
  if (status === "warning") {
    return "Review snapshot warnings before recall integration.";
  }
  return "Snapshot can enter a future recall integration. Store writes and execution remain disabled.";
}

function disabledReadiness(
  canEnterRecallIndex: boolean
): ProjectKnowledgeReadiness {
  return {
    canEnterRecallIndex,
    canWriteStore: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function findForbiddenFields(
  value: unknown,
  path: string[] = []
): ProjectKnowledgeFinding[] {
  const findings: ProjectKnowledgeFinding[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findForbiddenFields(item, [...path, `${index}`]));
    });
    return findings;
  }
  if (!isRecord(value)) {
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const keyPath = [...path, key].join(".");
    if (forbiddenFieldKeys.has(normalizedKey)) {
      const isExecution =
        normalizedKey.includes("command") ||
        normalizedKey === "eventstorewrite" ||
        normalizedKey === "applynow" ||
        normalizedKey === "rollbacknow" ||
        normalizedKey === "permissionlease" ||
        normalizedKey === "desktopaction" ||
        normalizedKey === "nativebridge";
      findings.push(
        finding(
          isExecution ? "execution" : "raw_field",
          "blocker",
          isExecution
            ? "EXECUTION_FIELD_REJECTED"
            : `${safeCode(key)}_FIELD_REJECTED`,
          keyPath
        )
      );
    }
    if (executionAttemptKeys.has(normalizedKey) && child === true) {
      findings.push(
        finding("execution", "blocker", "EXECUTION_READINESS_TRUE", keyPath)
      );
    }
    findings.push(...findForbiddenFields(child, [...path, key]));
  }
  return findings;
}

function findUnsafeStringMarkers(
  value: unknown,
  path: string[] = []
): ProjectKnowledgeFinding[] {
  const findings: ProjectKnowledgeFinding[] = [];
  if (typeof value === "string") {
    for (const { code, pattern } of unsafeTextPatterns) {
      if (pattern.test(value)) {
        findings.push(finding("secret", "blocker", code, path.join(".")));
      }
    }
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findUnsafeStringMarkers(item, [...path, `${index}`]));
    });
    return findings;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      findings.push(...findUnsafeStringMarkers(child, [...path, key]));
    }
  }
  return findings;
}

function isExpiredAt(value: string, now: string | Date | undefined): boolean {
  const expiresAt = Date.parse(value);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }
  const current = now instanceof Date ? now.getTime() : Date.parse(now ?? "");
  return Number.isFinite(current) && expiresAt <= current;
}

function isProjectKnowledgeEntry(
  value: unknown
): value is ProjectKnowledgeEntry {
  return isRecord(value) && typeof value.entryId === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function createdAt(options: ProjectKnowledgeValidationOptions): string {
  if (options.createdAt !== undefined) {
    return options.createdAt;
  }
  if (options.now instanceof Date) {
    return options.now.toISOString();
  }
  if (typeof options.now === "string" && options.now.length > 0) {
    return options.now;
  }
  return "1970-01-01T00:00:00.000Z";
}

function generatedId(
  options: ProjectKnowledgeValidationOptions,
  prefix: string
): string {
  return (
    options.idGenerator?.() ?? `${prefix}-${createdAt(options).slice(0, 10)}`
  );
}

function isTruthy(value: unknown): boolean {
  return value === true;
}

function isSafeHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{6,80}$/.test(value);
}

function safeSummary(value: string): string {
  if (
    unsafeTextPatterns.some(({ pattern }) => pattern.test(value)) ||
    value.length > maxSummaryChars
  ) {
    return "Summary withheld by project knowledge redaction guard.";
  }
  return value;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function safeCodeArray(value: unknown): string[] {
  return uniqueStrings(safeStringArray(value).map(safeCode));
}

function safeCode(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function uniqueStrings<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function uniqueFindings(
  findings: readonly ProjectKnowledgeFinding[]
): ProjectKnowledgeFinding[] {
  const seen = new Set<string>();
  const result: ProjectKnowledgeFinding[] = [];
  for (const item of findings) {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.path ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function finding(
  kind: ProjectKnowledgeFindingKind,
  severity: ProjectKnowledgeSeverity,
  code: string,
  path?: string | undefined
): ProjectKnowledgeFinding {
  const normalizedCode = safeCode(code);
  return {
    findingId: `${kind}-${normalizedCode.toLowerCase()}-${stablePreviewHash(
      `${kind}:${severity}:${normalizedCode}:${path ?? ""}`
    ).slice(0, 10)}`,
    kind,
    severity,
    code: normalizedCode,
    safeMessage: safeMessageFor(normalizedCode),
    ...(path !== undefined && path.length > 0 ? { path } : {})
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    INPUT_NOT_OBJECT: "Project knowledge input must be an object.",
    UNKNOWN_TYPE:
      "Project knowledge type must be policy, project_fact, or pitfall.",
    MISSING_NAMESPACE: "Project knowledge namespace is required.",
    INVALID_NAMESPACE: "Project knowledge namespace is invalid.",
    MISSING_SUMMARY: "Summary is required.",
    SUMMARY_TOO_LONG: "Summary exceeds the project knowledge length limit.",
    MISSING_ENTRY_ID: "Entry id is required for committed records.",
    INVALID_STATUS: "Project knowledge status is invalid.",
    ENTRY_HASH_GENERATED:
      "Entry hash was regenerated for the summary contract.",
    CANDIDATE_ID_GENERATED: "Candidate id was generated deterministically.",
    REVOKED_ACTIVE_STATUS: "Active project knowledge must not have revokedAt.",
    EXPIRED_ACTIVE_STATUS:
      "Expired active project knowledge must be pinned or inactive.",
    EXPIRED_MISSING_EXPIRES_AT: "Expired entries should include expiresAt.",
    REVOKED_MISSING_REVOKED_AT: "Revoked entries should include revokedAt.",
    POLICY_SOURCE_REJECTED:
      "Policy source kind must be reviewed or repo/manual summary.",
    POLICY_UNREVIEWED_SOURCE_REJECTED:
      "Policy entries cannot come from model, tool, or external unreviewed sources.",
    MISSING_POLICY_SCOPE: "Policy entries require a policy scope.",
    MISSING_FACT_KIND: "Project fact entries require a fact kind.",
    PROJECT_FACT_REQUIRES_EVIDENCE: "Project facts require evidence refs.",
    PITFALL_REQUIRES_TRIGGER: "Pitfall entries require a trigger summary.",
    PITFALL_REQUIRES_MITIGATION:
      "Pitfall entries require a mitigation summary.",
    INVALID_PITFALL_SEVERITY: "Pitfall severity is invalid.",
    MISSING_EVIDENCE_REFS: "Evidence refs are required.",
    EVIDENCE_REF_NOT_OBJECT: "Evidence ref must be an object.",
    EVIDENCE_REF_MISSING_ID: "Evidence ref id is required.",
    DUPLICATE_EVIDENCE_REF: "Evidence ref ids must be unique.",
    UNKNOWN_EVIDENCE_KIND: "Evidence ref kind is unsupported.",
    EVIDENCE_REF_MISSING_SUMMARY: "Evidence ref summary is required.",
    EVIDENCE_REF_MISSING_HASH: "Evidence ref hashPrefix is required.",
    MISSING_TRUST: "Trust metadata is required.",
    INVALID_TRUST_LEVEL: "Trust level is invalid.",
    TRUST_OUT_OF_RANGE: "Trust score must be between 0 and 1.",
    TRUST_REVIEW_FLAG_MISSING: "Trust review flag is missing.",
    MISSING_PROVENANCE: "Provenance metadata is required.",
    UNKNOWN_PROVENANCE_SOURCE: "Provenance source kind is unsupported.",
    PROVENANCE_MISSING_SUMMARY: "Provenance summary is required.",
    PROVENANCE_REF_HASH_INVALID: "Provenance ref hashes must be safe hashes.",
    DUPLICATE_ENTRY_ID: "Snapshot contains duplicate entry ids.",
    STORE_RECORD_NOT_OBJECT: "Store record must be an object.",
    UNSUPPORTED_STORE_RECORD_KIND: "Store record kind is unsupported.",
    EXECUTION_FIELD_REJECTED: "Execution fields are not allowed.",
    EXECUTION_READINESS_TRUE: "Execution readiness flags must remain false.",
    API_KEY_MARKER: "Key-like marker detected and rejected.",
    BEARER_TOKEN_MARKER: "Bearer-token marker detected and rejected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected and rejected.",
    PRIVATE_KEY_MARKER: "Private-key marker detected and rejected.",
    RAW_PROMPT_MARKER: "Raw prompt marker detected and rejected.",
    RAW_SOURCE_MARKER: "Raw source marker detected and rejected.",
    RAW_DIFF_MARKER: "Raw diff marker detected and rejected.",
    RAW_CONTENT_MARKER: "Raw content marker detected and rejected."
  };
  return messages[code] ?? "Project knowledge record requires review.";
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
