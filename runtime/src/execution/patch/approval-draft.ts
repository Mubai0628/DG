import { type CapabilityRiskLevel } from "../../capabilities/index.js";

export type PatchApprovalDraftStatus =
  | "empty"
  | "draft_ready"
  | "warning"
  | "blocked"
  | "needs_manual_review";

export type PatchApprovalDecisionOptionId =
  | "approve_later_requires_user_action"
  | "request_changes_later_requires_user_action"
  | "reject_later_requires_user_action"
  | "defer_later_requires_user_action";

export type PatchApprovalDecisionOption = {
  optionId: PatchApprovalDecisionOptionId;
  label: string;
  summary: string;
  enabled: false;
  reason: string;
};

export type PatchApprovalCondition = {
  conditionId: string;
  summary: string;
  satisfied: boolean;
  warningCodes: string[];
};

export type PatchApprovalFindingKind =
  | "validation"
  | "audit"
  | "path"
  | "risk"
  | "approval"
  | "evidence"
  | "context"
  | "lease"
  | "readiness"
  | "safety";

export type PatchApprovalSeverity = "info" | "warning" | "blocker";

export type PatchApprovalFinding = {
  findingId: string;
  kind: PatchApprovalFindingKind;
  severity: PatchApprovalSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type PatchApprovalReadiness = {
  canProceedToApprovalReviewPreview: boolean;
  canApprove: false;
  canReject: false;
  canIssueLease: false;
  canProceedToVirtualApplyPreview: false;
  canApplyPatch: false;
};

export type PatchApprovalWarning = {
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type PatchApprovalScopeSummary = {
  fileCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
  pathSummaries: string[];
  proposalHash: string;
  validationHash: string;
  auditHash: string;
};

export type PatchApprovalExpiryPreview = {
  ttlMinutes: number;
  expiresAt: string;
  enforcementEnabled: false;
};

export type PatchApprovalDraftInput = {
  proposalPreview?: unknown;
  validationPreview?: unknown;
  diffAuditPreview?: unknown;
  proposalId?: string | undefined;
  validationId?: string | undefined;
  auditId?: string | undefined;
  intent?: string | undefined;
  title?: string | undefined;
  riskLevel?: CapabilityRiskLevel | undefined;
  derivedRiskLevel?: CapabilityRiskLevel | undefined;
  requiresApproval?: boolean | undefined;
  blockerCount?: number | undefined;
  warningCount?: number | undefined;
  findingCount?: number | undefined;
  fileCount?: number | undefined;
  filesCreated?: number | undefined;
  filesUpdated?: number | undefined;
  filesDeleted?: number | undefined;
  linesAdded?: number | undefined;
  linesRemoved?: number | undefined;
  pathSummaries?: string[] | undefined;
  validationFindings?: unknown[] | undefined;
  auditFindings?: unknown[] | undefined;
  proposalHash?: string | undefined;
  validationHash?: string | undefined;
  auditHash?: string | undefined;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  agentRouteRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  maxFileRefs?: number | undefined;
  maxInputBytes?: number | undefined;
};

export type PatchApprovalDraft = {
  status: PatchApprovalDraftStatus;
  approvalDraftId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  intent: string;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  requiredApprovalReasons: string[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  decisionOptions: PatchApprovalDecisionOption[];
  suggestedConditions: PatchApprovalCondition[];
  scopeSummary: PatchApprovalScopeSummary;
  expiryPreview: PatchApprovalExpiryPreview;
  findings: PatchApprovalFinding[];
  warnings: PatchApprovalWarning[];
  readiness: PatchApprovalReadiness;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  approvalDraftHash: string;
  nextAction: string;
  source: "runtime_patch_approval_draft";
  draftOnly: true;
  approvalExecutionEnabled: false;
  rejectionExecutionEnabled: false;
  permissionLeaseIssuingEnabled: false;
  applyEnabled: false;
  virtualApplyEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
};

export type PatchApprovalDraftValidationResult = {
  ok: boolean;
  warningCodes: string[];
  findings: PatchApprovalFinding[];
};

type NormalizedApprovalInput = {
  proposalId: string;
  validationId: string;
  auditId: string;
  intent: string;
  title: string;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  fileCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
  pathSummaries: string[];
  validationStatus: string;
  auditStatus: string;
  auditCanProceedToApprovalDraftPreview: boolean;
  validationFindings: PatchApprovalFinding[];
  auditFindings: PatchApprovalFinding[];
  proposalHash: string;
  validationHash: string;
  auditHash: string;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  agentRouteRef?: string | undefined;
};

type ParsedPathSummary = {
  path: string;
  changeKind: "create" | "update" | "delete" | "documentation" | "test";
};

const defaultMaxFileRefs = 12;
const defaultMaxInputBytes = 130_000;
const manyFilesWarningThreshold = 5;
const largeLineDeltaWarningThreshold = 400;
const expiryTtlMinutes = 24 * 60;

const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRawInputKeys = new Set(
  [
    "content",
    "fullContent",
    "fileContent",
    "beforeContent",
    "afterContent",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Source",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    privatePasteField,
    apiKeyField,
    authHeaderField,
    "env",
    "stdout",
    "stderr"
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

const configFilePattern =
  /(^|\/)(package\.json|pnpm-lock\.yaml|tsconfig(?:\.[^./]+)?\.json|vite\.config\.[tj]s|Cargo\.toml|Cargo\.lock|tauri\.conf\.json)$/i;
const sourcePathPattern = /^(app|runtime|browser-extension|conformance)\/src\//;

export function buildPatchApprovalDraft(
  input: PatchApprovalDraftInput = {}
): PatchApprovalDraft {
  const summary = normalizeApprovalInput(input);
  if (isEmptyApprovalInput(input, summary)) {
    return emptyDraft(input, []);
  }

  const validation = validatePatchApprovalDraftInput(input);
  const findings = validation.findings;
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const derivedRiskLevel = deriveRiskLevel(summary, findings);
  const requiredApprovalReasons = approvalReasons(summary, findings);
  const requiresApproval =
    summary.requiresApproval || requiredApprovalReasons.length > 0;
  const status = statusFor(blockerCount, warningCount, requiresApproval);
  const approvalDraftId =
    input.idGenerator?.() ??
    `patch-approval-draft-${hashPreview(
      [
        summary.proposalId,
        summary.validationId,
        summary.auditId,
        summary.pathSummaries.join(","),
        summary.auditHash,
        input.createdAt ?? "runtime-patch-approval-draft"
      ].join("|")
    )}`;
  const readiness: PatchApprovalReadiness = {
    canProceedToApprovalReviewPreview: blockerCount === 0,
    canApprove: false,
    canReject: false,
    canIssueLease: false,
    canProceedToVirtualApplyPreview: false,
    canApplyPatch: false
  };
  const scopeSummary: PatchApprovalScopeSummary = {
    fileCount: summary.fileCount,
    filesCreated: summary.filesCreated,
    filesUpdated: summary.filesUpdated,
    filesDeleted: summary.filesDeleted,
    linesAdded: summary.linesAdded,
    linesRemoved: summary.linesRemoved,
    pathSummaries: [...summary.pathSummaries],
    proposalHash: summary.proposalHash,
    validationHash: summary.validationHash,
    auditHash: summary.auditHash
  };
  const expiryPreview = expiryPreviewFor(input.createdAt);
  const suggestedConditions = conditionsFor(summary, findings, readiness);
  const approvalDraftHash = hashPreview(
    JSON.stringify({
      approvalDraftId,
      proposalId: summary.proposalId,
      validationId: summary.validationId,
      auditId: summary.auditId,
      intent: summary.intent,
      riskLevel: summary.riskLevel,
      derivedRiskLevel,
      requiresApproval,
      requiredApprovalReasons,
      counts: {
        fileCount: summary.fileCount,
        blockerCount,
        warningCount,
        findingCount: findings.length
      },
      paths: summary.pathSummaries,
      findingCodes: findings.map((finding) => finding.code),
      expiryPreview
    })
  );

  return {
    status,
    approvalDraftId,
    proposalId: summary.proposalId,
    validationId: summary.validationId,
    auditId: summary.auditId,
    intent: summary.intent,
    riskLevel: summary.riskLevel,
    derivedRiskLevel,
    requiresApproval,
    requiredApprovalReasons,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    decisionOptions: decisionOptions(),
    suggestedConditions,
    scopeSummary,
    expiryPreview,
    findings,
    warnings: findings
      .filter((finding) => finding.severity !== "info")
      .map(warningFromFinding),
    readiness,
    noCompressRequired: summary.pathSummaries.length > 0,
    contextPlacement: "no_compress_zone",
    approvalDraftHash,
    nextAction: nextActionFor(status, readiness),
    source: "runtime_patch_approval_draft",
    draftOnly: true,
    approvalExecutionEnabled: false,
    rejectionExecutionEnabled: false,
    permissionLeaseIssuingEnabled: false,
    applyEnabled: false,
    virtualApplyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false
  };
}

export function summarizePatchApprovalDraft(draft: PatchApprovalDraft): {
  approvalDraftId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  status: PatchApprovalDraftStatus;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  canProceedToApprovalReviewPreview: boolean;
  canApprove: false;
  canReject: false;
  canIssueLease: false;
  canApplyPatch: false;
  hash: string;
} {
  return {
    approvalDraftId: draft.approvalDraftId,
    proposalId: draft.proposalId,
    validationId: draft.validationId,
    auditId: draft.auditId,
    status: draft.status,
    blockerCount: draft.blockerCount,
    warningCount: draft.warningCount,
    findingCount: draft.findingCount,
    riskLevel: draft.riskLevel,
    derivedRiskLevel: draft.derivedRiskLevel,
    requiresApproval: draft.requiresApproval,
    canProceedToApprovalReviewPreview:
      draft.readiness.canProceedToApprovalReviewPreview,
    canApprove: false,
    canReject: false,
    canIssueLease: false,
    canApplyPatch: false,
    hash: hashPreview(
      [
        draft.approvalDraftId,
        draft.proposalId,
        draft.validationId,
        draft.auditId,
        draft.status,
        draft.blockerCount,
        draft.warningCount,
        draft.derivedRiskLevel,
        draft.requiresApproval ? "approval" : "no-approval",
        draft.approvalDraftHash
      ].join("|")
    )
  };
}

export function validatePatchApprovalDraftInput(
  input: PatchApprovalDraftInput
): PatchApprovalDraftValidationResult {
  const summary = normalizeApprovalInput(input);
  const findings: PatchApprovalFinding[] = [];
  const inputJson = safeStringify(input);

  if (inputJson.length > (input.maxInputBytes ?? defaultMaxInputBytes)) {
    findings.push(
      finding("safety", "blocker", "PATCH_APPROVAL_DRAFT_INPUT_TOO_LARGE")
    );
  }
  for (const code of rawFieldWarningsFrom(input)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of unsafeWarningCodes(inputJson)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of executionAttemptWarningsFrom(input)) {
    findings.push(finding("readiness", "blocker", code));
  }

  if (summary.proposalId.length === 0) {
    findings.push(
      finding("validation", "blocker", "PATCH_APPROVAL_MISSING_PROPOSAL_ID")
    );
  }
  if (summary.validationId.length === 0) {
    findings.push(
      finding("validation", "blocker", "PATCH_APPROVAL_MISSING_VALIDATION_ID")
    );
  }
  if (summary.auditId.length === 0) {
    findings.push(
      finding("audit", "blocker", "PATCH_APPROVAL_MISSING_AUDIT_ID")
    );
  }
  if (summary.pathSummaries.length === 0) {
    findings.push(
      finding("path", "blocker", "PATCH_APPROVAL_MISSING_PATH_SUMMARIES")
    );
  }
  if (
    summary.pathSummaries.length > (input.maxFileRefs ?? defaultMaxFileRefs)
  ) {
    findings.push(finding("path", "blocker", "PATCH_APPROVAL_TOO_MANY_FILES"));
  } else if (summary.pathSummaries.length > manyFilesWarningThreshold) {
    findings.push(finding("path", "warning", "PATCH_APPROVAL_MANY_FILES"));
  }
  if (summary.linesAdded < 0 || summary.linesRemoved < 0) {
    findings.push(
      finding("risk", "blocker", "PATCH_APPROVAL_NEGATIVE_LINE_ESTIMATE")
    );
  }
  if (
    summary.linesAdded > largeLineDeltaWarningThreshold ||
    summary.linesRemoved > largeLineDeltaWarningThreshold
  ) {
    findings.push(
      finding("risk", "warning", "PATCH_APPROVAL_LARGE_LINE_DELTA")
    );
  }
  if (summary.validationStatus === "blocked") {
    findings.push(
      finding("validation", "blocker", "PATCH_APPROVAL_VALIDATION_BLOCKED")
    );
  }
  if (summary.auditStatus === "blocked") {
    findings.push(finding("audit", "blocker", "PATCH_APPROVAL_AUDIT_BLOCKED"));
  }
  if (!summary.auditCanProceedToApprovalDraftPreview) {
    findings.push(
      finding("readiness", "blocker", "PATCH_APPROVAL_AUDIT_NOT_READY")
    );
  }

  for (const item of summary.pathSummaries.map(parsePathSummary)) {
    for (const code of validatePath(item.path)) {
      findings.push(finding("path", "blocker", code, item.path));
    }
    for (const code of pathApprovalWarnings(item)) {
      findings.push(finding("approval", "warning", code, item.path));
    }
  }

  if (summary.workspaceIndexRef === undefined) {
    findings.push(
      finding("evidence", "warning", "PATCH_APPROVAL_WORKSPACE_INDEX_MISSING")
    );
  }
  if (summary.contextSummaryRef === undefined) {
    findings.push(
      finding("context", "warning", "PATCH_APPROVAL_CONTEXT_SUMMARY_MISSING")
    );
  }
  if (summary.capabilityPlanRef === undefined) {
    findings.push(
      finding("evidence", "warning", "PATCH_APPROVAL_CAPABILITY_PLAN_MISSING")
    );
  }
  if (summary.agentRouteRef === undefined) {
    findings.push(
      finding("evidence", "warning", "PATCH_APPROVAL_AGENT_ROUTE_MISSING")
    );
  }
  if (summary.intent === "unknown") {
    findings.push(
      finding("readiness", "warning", "PATCH_APPROVAL_UNKNOWN_INTENT")
    );
  }
  if (
    summary.requiresApproval === false &&
    riskRank(summary.derivedRiskLevel) >= riskRank("A3_scoped_write")
  ) {
    findings.push(
      finding("approval", "warning", "PATCH_APPROVAL_RISK_REQUIRES_APPROVAL")
    );
  }

  for (const validationFinding of summary.validationFindings) {
    findings.push(
      finding(
        "validation",
        validationFinding.severity === "blocker" ? "blocker" : "warning",
        validationFinding.code,
        validationFinding.path,
        validationFinding.findingId
      )
    );
  }
  for (const auditFinding of summary.auditFindings) {
    findings.push(
      finding(
        "audit",
        auditFinding.severity === "blocker" ? "blocker" : "warning",
        auditFinding.code,
        auditFinding.path,
        auditFinding.findingId
      )
    );
  }

  const dedupedFindings = uniqueFindings(findings);
  return {
    ok: !dedupedFindings.some((item) => item.severity === "blocker"),
    warningCodes: dedupedFindings.map((item) => item.code),
    findings: dedupedFindings
  };
}

function normalizeApprovalInput(
  input: PatchApprovalDraftInput
): NormalizedApprovalInput {
  const proposal = isRecord(input.proposalPreview) ? input.proposalPreview : {};
  const validation = isRecord(input.validationPreview)
    ? input.validationPreview
    : {};
  const audit = isRecord(input.diffAuditPreview) ? input.diffAuditPreview : {};
  const auditReadiness = isRecord(audit.readiness) ? audit.readiness : {};
  const proposalItems = safeArray(readValue(proposal, "items")).filter(
    isRecord
  );
  const itemPathSummaries = proposalItems
    .map((item) => {
      const path = safeText(item.path, "");
      const changeKind = safeText(item.changeKind, "update");
      return path.length > 0 ? `${changeKind}:${path}` : "";
    })
    .filter((item) => item.length > 0);
  const pathSummaries = uniqueStrings([
    ...safeStringArray(input.pathSummaries),
    ...safeStringArray(proposal.pathSummaries),
    ...safeStringArray(audit.scopeSummary),
    ...itemPathSummaries
  ]);
  const auditScope = isRecord(audit.scopeSummary) ? audit.scopeSummary : {};
  return {
    proposalId: safeText(
      input.proposalId ??
        audit.proposalId ??
        validation.proposalId ??
        proposal.proposalId,
      ""
    ),
    validationId: safeText(
      input.validationId ?? audit.validationId ?? validation.validationId,
      ""
    ),
    auditId: safeText(input.auditId ?? audit.auditId, ""),
    intent: safeIdentifier(
      input.intent ?? audit.intent ?? validation.intent ?? proposal.intent,
      "unknown"
    ),
    title: safeSummary(input.title ?? proposal.title, "Patch approval draft"),
    riskLevel: normalizeRiskLevel(
      input.riskLevel ??
        audit.riskLevel ??
        validation.riskLevel ??
        proposal.riskLevel
    ),
    derivedRiskLevel: normalizeRiskLevel(
      input.derivedRiskLevel ??
        audit.derivedRiskLevel ??
        validation.derivedRiskLevel ??
        proposal.riskLevel
    ),
    requiresApproval:
      input.requiresApproval === true ||
      audit.requiresApproval === true ||
      validation.requiresApproval === true ||
      proposal.requiresApproval === true,
    blockerCount: nonNegativeInteger(
      input.blockerCount ?? audit.blockerCount ?? validation.blockerCount
    ),
    warningCount: nonNegativeInteger(
      input.warningCount ?? audit.warningCount ?? validation.warningCount
    ),
    findingCount: nonNegativeInteger(
      input.findingCount ?? audit.findingCount ?? validation.findingCount
    ),
    fileCount: nonNegativeInteger(
      input.fileCount ??
        audit.fileCount ??
        validation.fileCount ??
        proposal.fileCount,
      pathSummaries.length
    ),
    filesCreated: nonNegativeInteger(
      input.filesCreated ?? audit.filesCreated ?? proposal.filesCreated
    ),
    filesUpdated: nonNegativeInteger(
      input.filesUpdated ?? audit.filesUpdated ?? proposal.filesUpdated
    ),
    filesDeleted: nonNegativeInteger(
      input.filesDeleted ?? audit.filesDeleted ?? proposal.filesDeleted
    ),
    linesAdded: finiteNumber(
      input.linesAdded ??
        audit.linesAdded ??
        validation.linesAdded ??
        proposal.linesAdded
    ),
    linesRemoved: finiteNumber(
      input.linesRemoved ??
        audit.linesRemoved ??
        validation.linesRemoved ??
        proposal.linesRemoved
    ),
    pathSummaries: uniqueStrings([
      ...pathSummaries,
      ...safeStringArray(auditScope.pathSummaries)
    ]),
    validationStatus: safeIdentifier(validation.status, "unknown"),
    auditStatus: safeIdentifier(audit.status, "unknown"),
    auditCanProceedToApprovalDraftPreview:
      auditReadiness.canProceedToApprovalDraftPreview === true,
    validationFindings: normalizeFindings([
      ...safeArray(input.validationFindings),
      ...safeArray(validation.findings)
    ]),
    auditFindings: normalizeFindings([
      ...safeArray(input.auditFindings),
      ...safeArray(audit.findings)
    ]),
    proposalHash: safeText(input.proposalHash ?? proposal.proposalHash, ""),
    validationHash: safeText(
      input.validationHash ?? validation.validationHash,
      ""
    ),
    auditHash: safeText(input.auditHash ?? audit.auditHash, ""),
    workspaceIndexRef: optionalSafeRef(
      input.workspaceIndexRef ??
        audit.workspaceIndexRef ??
        proposal.workspaceIndexRef
    ),
    contextSummaryRef: optionalSafeRef(
      input.contextSummaryRef ??
        audit.contextSummaryRef ??
        validation.contextSummaryRef
    ),
    capabilityPlanRef: optionalSafeRef(
      input.capabilityPlanRef ??
        audit.capabilityPlanRef ??
        validation.capabilityPlanRef
    ),
    agentRouteRef: optionalSafeRef(
      input.agentRouteRef ?? audit.agentRouteRef ?? validation.agentRouteRef
    )
  };
}

function isEmptyApprovalInput(
  input: PatchApprovalDraftInput,
  summary: NormalizedApprovalInput
): boolean {
  return (
    input.proposalPreview === undefined &&
    input.validationPreview === undefined &&
    input.diffAuditPreview === undefined &&
    summary.proposalId.length === 0 &&
    summary.validationId.length === 0 &&
    summary.auditId.length === 0 &&
    summary.pathSummaries.length === 0
  );
}

function parsePathSummary(value: string): ParsedPathSummary {
  const text = value.trim().replace(/\\/g, "/");
  const colon = text.indexOf(":");
  if (colon > 0) {
    const prefix = text.slice(0, colon);
    const rest = text.slice(colon + 1);
    if (isChangeKind(prefix)) {
      return { changeKind: prefix, path: rest };
    }
  }
  return { changeKind: "update", path: text };
}

function validatePath(path: string): string[] {
  const codes: string[] = [];
  if (path.length === 0) {
    codes.push("PATCH_APPROVAL_EMPTY_PATH");
  }
  if (path.length > 240) {
    codes.push("PATCH_APPROVAL_PATH_TOO_LONG");
  }
  if (/^[a-zA-Z]:/.test(path)) {
    codes.push("PATCH_APPROVAL_DRIVE_PATH_REJECTED");
  }
  if (path.startsWith("//")) {
    codes.push("PATCH_APPROVAL_UNC_PATH_REJECTED");
  }
  if (path.startsWith("/")) {
    codes.push("PATCH_APPROVAL_ABSOLUTE_PATH_REJECTED");
  }
  if (path.includes("\0")) {
    codes.push("PATCH_APPROVAL_NULL_BYTE_REJECTED");
  }
  if (/[\r\n]/.test(path)) {
    codes.push("PATCH_APPROVAL_NEWLINE_PATH_REJECTED");
  }
  if (/https?:\/\//i.test(path) || /[?#]/.test(path)) {
    codes.push("PATCH_APPROVAL_URL_OR_QUERY_PATH_REJECTED");
  }
  if (/[;&|`$<>*{}[\]!]/.test(path)) {
    codes.push("PATCH_APPROVAL_SHELL_META_PATH_REJECTED");
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "..")) {
    codes.push("PATCH_APPROVAL_PARENT_TRAVERSAL_REJECTED");
  }
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    codes.push("PATCH_APPROVAL_EMPTY_SEGMENT_REJECTED");
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    codes.push("PATCH_APPROVAL_GENERATED_PATH_REJECTED");
  }
  const lower = path.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    codes.push("PATCH_APPROVAL_GENERATED_PATH_REJECTED");
  }
  if (/^\.env(?:\.|$)|\/\.env(?:\.|$)/.test(lower)) {
    codes.push("PATCH_APPROVAL_SECRET_PATH_REJECTED");
  }
  if (
    /(^|[/.-])secret(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])credential(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])private-key([/.-]|$)/i.test(path) ||
    /(^|\/)id_rsa$/i.test(path) ||
    /\.(pem|p12|pfx|key)$/i.test(path)
  ) {
    codes.push("PATCH_APPROVAL_SECRET_PATH_REJECTED");
  }
  return uniqueStrings(codes);
}

function pathApprovalWarnings(item: ParsedPathSummary): string[] {
  const codes: string[] = [];
  if (item.changeKind === "delete") {
    codes.push("PATCH_APPROVAL_DELETE_REQUIRES_APPROVAL");
  }
  if (configFilePattern.test(item.path)) {
    codes.push("PATCH_APPROVAL_CONFIG_REQUIRES_APPROVAL");
  }
  if (sourcePathPattern.test(item.path)) {
    codes.push("PATCH_APPROVAL_SOURCE_REQUIRES_APPROVAL");
  }
  return codes;
}

function approvalReasons(
  summary: NormalizedApprovalInput,
  findings: readonly PatchApprovalFinding[]
): string[] {
  const reasons = [
    ...(summary.requiresApproval ? ["PATCH_APPROVAL_REQUESTED"] : []),
    ...(riskRank(summary.derivedRiskLevel) >= riskRank("A3_scoped_write")
      ? ["PATCH_APPROVAL_RISK_REQUIRES_APPROVAL"]
      : []),
    ...findings
      .filter((finding) => finding.kind === "approval")
      .map((finding) => finding.code)
  ];
  return uniqueStrings(reasons);
}

function deriveRiskLevel(
  summary: NormalizedApprovalInput,
  findings: readonly PatchApprovalFinding[]
): CapabilityRiskLevel {
  if (
    summary.filesDeleted > 0 ||
    findings.some((finding) =>
      [
        "PATCH_APPROVAL_DELETE_REQUIRES_APPROVAL",
        "PATCH_APPROVAL_CONFIG_REQUIRES_APPROVAL",
        "PATCH_APPROVAL_SOURCE_REQUIRES_APPROVAL"
      ].includes(finding.code)
    )
  ) {
    return "A3_scoped_write";
  }
  if (summary.pathSummaries.length > 0) {
    return "A2_draft_write";
  }
  return "A1_read";
}

function statusFor(
  blockerCount: number,
  warningCount: number,
  requiresApproval: boolean
): PatchApprovalDraftStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (requiresApproval) {
    return "needs_manual_review";
  }
  return warningCount > 0 ? "warning" : "draft_ready";
}

function nextActionFor(
  status: PatchApprovalDraftStatus,
  readiness: PatchApprovalReadiness
): string {
  if (status === "blocked") {
    return "Resolve blocker findings before approval review preview. Approval, rejection, lease issuing, virtual apply, and patch apply remain disabled.";
  }
  if (status === "needs_manual_review") {
    return "Review the approval draft summary. Approval execution, PermissionLease issuing, virtual apply, and patch apply are disabled in this phase.";
  }
  if (status === "warning") {
    return readiness.canProceedToApprovalReviewPreview
      ? "Review approval draft warnings before any future approval review preview."
      : "Review approval draft warnings before any next preview stage.";
  }
  if (status === "draft_ready") {
    return "Ready for approval review preview only. No approval, rejection, lease, virtual apply, or patch apply is executed.";
  }
  return "Create, validate, and audit a patch proposal summary first.";
}

function decisionOptions(): PatchApprovalDecisionOption[] {
  const reason = "Approval execution is disabled in this phase.";
  return [
    {
      optionId: "approve_later_requires_user_action",
      label: "Approve later",
      summary: "Future approval would require explicit user action.",
      enabled: false,
      reason
    },
    {
      optionId: "request_changes_later_requires_user_action",
      label: "Request changes later",
      summary: "Future change request would require explicit user action.",
      enabled: false,
      reason
    },
    {
      optionId: "reject_later_requires_user_action",
      label: "Reject later",
      summary: "Future rejection would require explicit user action.",
      enabled: false,
      reason
    },
    {
      optionId: "defer_later_requires_user_action",
      label: "Defer later",
      summary: "Future deferral would require explicit user action.",
      enabled: false,
      reason
    }
  ];
}

function conditionsFor(
  summary: NormalizedApprovalInput,
  findings: readonly PatchApprovalFinding[],
  readiness: PatchApprovalReadiness
): PatchApprovalCondition[] {
  return [
    condition(
      "require_tests_before_apply",
      "Require tests before any future apply path.",
      summary.intent !== "code_change" ||
        summary.pathSummaries.some((item) =>
          testPath(parsePathSummary(item).path)
        ),
      ["PATCH_APPROVAL_TESTS_NOT_CONFIRMED"]
    ),
    condition(
      "require_reviewer_confirmation",
      "Require reviewer confirmation before any future approval execution.",
      false,
      ["PATCH_APPROVAL_REVIEWER_CONFIRMATION_REQUIRED"]
    ),
    condition(
      "require_no_blockers",
      "Require zero blocker findings before future approval review.",
      readiness.canProceedToApprovalReviewPreview,
      ["PATCH_APPROVAL_BLOCKERS_PRESENT"]
    ),
    condition(
      "require_workspace_index_refresh",
      "Require a Workspace Index summary ref before future approval execution.",
      summary.workspaceIndexRef !== undefined,
      ["PATCH_APPROVAL_WORKSPACE_INDEX_MISSING"]
    ),
    condition(
      "require_virtual_apply_preview",
      "Require virtual apply preview before any real apply path.",
      false,
      ["PATCH_APPROVAL_VIRTUAL_APPLY_PREVIEW_REQUIRED"]
    ),
    condition(
      "require_rollback_checkpoint_preview",
      "Require rollback checkpoint preview before any real apply path.",
      false,
      ["PATCH_APPROVAL_ROLLBACK_PREVIEW_REQUIRED"]
    )
  ]
    .map((item) => ({
      ...item,
      warningCodes: item.satisfied ? [] : item.warningCodes
    }))
    .concat(
      findings.some((finding) => finding.kind === "approval")
        ? [
            {
              conditionId: "require_approval_risk_review",
              summary: "Require explicit review of approval risk reason codes.",
              satisfied: false,
              warningCodes: uniqueStrings(
                findings
                  .filter((finding) => finding.kind === "approval")
                  .map((finding) => finding.code)
              )
            }
          ]
        : []
    );
}

function condition(
  conditionId: string,
  summary: string,
  satisfied: boolean,
  warningCodes: string[]
): PatchApprovalCondition {
  return {
    conditionId,
    summary,
    satisfied,
    warningCodes
  };
}

function expiryPreviewFor(
  createdAt: string | undefined
): PatchApprovalExpiryPreview {
  const parsedBase = createdAt === undefined ? NaN : Date.parse(createdAt);
  const baseMs = Number.isFinite(parsedBase)
    ? parsedBase
    : Date.parse("2026-01-01T00:00:00.000Z");
  return {
    ttlMinutes: expiryTtlMinutes,
    expiresAt: new Date(baseMs + expiryTtlMinutes * 60_000).toISOString(),
    enforcementEnabled: false
  };
}

function emptyDraft(
  input: PatchApprovalDraftInput,
  warningCodes: readonly string[]
): PatchApprovalDraft {
  const approvalDraftId =
    input.idGenerator?.() ??
    `patch-approval-draft-${hashPreview(["empty", warningCodes.join(",")].join("|"))}`;
  const findings = warningCodes.map((code) =>
    finding("readiness", "warning", code)
  );
  return {
    status: warningCodes.length > 0 ? "warning" : "empty",
    approvalDraftId,
    proposalId: "no-patch-proposal-approval",
    validationId: "no-patch-validation-approval",
    auditId: "no-patch-audit-approval",
    intent: safeIdentifier(input.intent, "unknown"),
    riskLevel: "A1_read",
    derivedRiskLevel: "A1_read",
    requiresApproval: false,
    requiredApprovalReasons: [],
    blockerCount: 0,
    warningCount: findings.length,
    findingCount: findings.length,
    decisionOptions: decisionOptions(),
    suggestedConditions: [],
    scopeSummary: {
      fileCount: 0,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      linesAdded: 0,
      linesRemoved: 0,
      pathSummaries: [],
      proposalHash: "",
      validationHash: "",
      auditHash: ""
    },
    expiryPreview: expiryPreviewFor(input.createdAt),
    findings,
    warnings: findings.map(warningFromFinding),
    readiness: {
      canProceedToApprovalReviewPreview: false,
      canApprove: false,
      canReject: false,
      canIssueLease: false,
      canProceedToVirtualApplyPreview: false,
      canApplyPatch: false
    },
    noCompressRequired: false,
    contextPlacement: "no_compress_zone",
    approvalDraftHash: hashPreview(`empty:${warningCodes.join(",")}`),
    nextAction: "Create, validate, and audit a patch proposal summary first.",
    source: "runtime_patch_approval_draft",
    draftOnly: true,
    approvalExecutionEnabled: false,
    rejectionExecutionEnabled: false,
    permissionLeaseIssuingEnabled: false,
    applyEnabled: false,
    virtualApplyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false
  };
}

function normalizeFindings(values: readonly unknown[]): PatchApprovalFinding[] {
  return values.filter(isRecord).map((value, index) => {
    const code = warningCode(value.code);
    return {
      findingId: safeIdentifier(
        value.findingId,
        `patch-approval-finding-${index + 1}-${hashPreview(code)}`
      ),
      kind: normalizeFindingKind(value.kind),
      severity: normalizeSeverity(value.severity),
      code,
      summary: safeSummary(value.summary, `Patch approval finding: ${code}`),
      ...(optionalPath(value.path) !== undefined
        ? { path: optionalPath(value.path) }
        : {}),
      ...(optionalSafeRef(value.relatedRef) !== undefined
        ? { relatedRef: optionalSafeRef(value.relatedRef) }
        : {})
    };
  });
}

function warningFromFinding(item: PatchApprovalFinding): PatchApprovalWarning {
  return {
    code: item.code,
    safeMessage: item.summary,
    ...(item.path !== undefined ? { path: item.path } : {})
  };
}

function finding(
  kind: PatchApprovalFindingKind,
  severity: PatchApprovalSeverity,
  code: string,
  path?: string | undefined,
  relatedRef?: string | undefined
): PatchApprovalFinding {
  const safeCode = warningCode(code);
  return {
    findingId: `patch-approval-${kind}-${safeCode.toLowerCase()}-${hashPreview(
      `${path ?? ""}|${relatedRef ?? ""}`
    )}`,
    kind,
    severity,
    code: safeCode,
    summary: `Patch approval draft finding: ${safeCode}`,
    ...(path !== undefined && path.length > 0 ? { path } : {}),
    ...(relatedRef !== undefined && relatedRef.length > 0 ? { relatedRef } : {})
  };
}

function rawFieldWarningsFrom(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap(rawFieldWarningsFrom));
  }
  if (!isRecord(value)) {
    return [];
  }
  const codes: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenRawInputKeys.has(key.toLowerCase())) {
      codes.push("PATCH_APPROVAL_RAW_FIELD_REJECTED");
    }
    codes.push(...rawFieldWarningsFrom(nested));
  }
  return uniqueStrings(codes);
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function executionAttemptWarningsFrom(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap(executionAttemptWarningsFrom));
  }
  if (!isRecord(value)) {
    return [];
  }
  const codes: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (
      ([
        "approved",
        "rejected",
        "canapprove",
        "canreject",
        "canissuelease",
        "canapplypatch",
        "canproceedtovirtualapplypreview",
        "approveenabled",
        "rejectenabled",
        "issueleaseenabled",
        "applyenabled",
        "virtualapplyenabled",
        "executeenabled",
        "approvalexecutionenabled",
        "rejectionexecutionenabled",
        "permissionleaseissuingenabled"
      ].includes(lower) &&
        nested === true) ||
      lower === "permissionleaseid"
    ) {
      codes.push("PATCH_APPROVAL_EXECUTION_ATTEMPT_REJECTED");
    }
    if (
      (lower === "action" || lower === "decision" || lower === "handler") &&
      typeof nested === "string" &&
      /\b(approve|reject|apply|execute|lease)\b/i.test(nested)
    ) {
      codes.push("PATCH_APPROVAL_EXECUTION_ACTION_REJECTED");
    }
    codes.push(...executionAttemptWarningsFrom(nested));
  }
  return uniqueStrings(codes);
}

function normalizeFindingKind(value: unknown): PatchApprovalFindingKind {
  return value === "validation" ||
    value === "audit" ||
    value === "path" ||
    value === "risk" ||
    value === "approval" ||
    value === "evidence" ||
    value === "context" ||
    value === "lease" ||
    value === "readiness" ||
    value === "safety"
    ? value
    : "readiness";
}

function normalizeSeverity(value: unknown): PatchApprovalSeverity {
  return value === "info" || value === "warning" || value === "blocker"
    ? value
    : "warning";
}

function normalizeRiskLevel(value: unknown): CapabilityRiskLevel {
  return value === "A0_observe" ||
    value === "A1_read" ||
    value === "A2_draft_write" ||
    value === "A3_scoped_write" ||
    value === "A4_external_effect" ||
    value === "A5_sensitive_or_irreversible"
    ? value
    : "A1_read";
}

function riskRank(riskLevel: CapabilityRiskLevel): number {
  return [
    "A0_observe",
    "A1_read",
    "A2_draft_write",
    "A3_scoped_write",
    "A4_external_effect",
    "A5_sensitive_or_irreversible"
  ].indexOf(riskLevel);
}

function isChangeKind(value: string): value is ParsedPathSummary["changeKind"] {
  return (
    value === "create" ||
    value === "update" ||
    value === "delete" ||
    value === "documentation" ||
    value === "test"
  );
}

function testPath(path: string): boolean {
  return (
    /(^|\/)(test|tests|__tests__)\//i.test(path) ||
    /\.(test|spec)\.[tj]sx?$/i.test(path)
  );
}

function warningCode(value: unknown): string {
  const code = safeText(value, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, "_");
  return /^[A-Z0-9_.:-]{1,120}$/.test(code) ? code : "PATCH_APPROVAL_WARNING";
}

function optionalPath(value: unknown): string | undefined {
  const text = safeText(value, "").trim().replace(/\\/g, "/");
  return text.length > 0 && text.length <= 240 ? text : undefined;
}

function optionalSafeRef(value: unknown): string | undefined {
  const text = safeIdentifier(value, "");
  return text.length > 0 ? text : undefined;
}

function safeSummary(value: unknown, fallback: string): string {
  const text = safeText(value, fallback);
  return unsafeWarningCodes(text).length > 0
    ? "Summary withheld by safety policy."
    : text.slice(0, 160);
}

function safeIdentifier(value: unknown, fallback: string): string {
  const text = safeText(value, fallback)
    .replace(/[^A-Za-z0-9_.:-]/g, "_")
    .slice(0, 96);
  return text.length > 0 ? text : fallback;
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  );
}

function readValue(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

function uniqueFindings(
  findings: readonly PatchApprovalFinding[]
): PatchApprovalFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.path ?? ""}:${item.relatedRef ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length))
  ).sort();
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (key, nested) =>
      typeof nested === "function" ? `[function:${key}]` : nested
    );
  } catch {
    return "[unserializable]";
  }
}

function hashPreview(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
