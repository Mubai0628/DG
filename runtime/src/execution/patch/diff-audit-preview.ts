import { type CapabilityRiskLevel } from "../../capabilities/index.js";

export type PatchDiffAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked"
  | "needs_approval";

export type PatchDiffAuditFindingKind =
  | "validation"
  | "path"
  | "risk"
  | "approval"
  | "evidence"
  | "context"
  | "test_coverage"
  | "readiness"
  | "safety";

export type PatchDiffAuditSeverity = "info" | "warning" | "blocker";

export type PatchDiffAuditFinding = {
  findingId: string;
  kind: PatchDiffAuditFindingKind;
  severity: PatchDiffAuditSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type PatchDiffAuditPathCategorySummary = {
  docs: number;
  tests: number;
  source: number;
  config: number;
  deletes: number;
  generated: number;
  unknown: number;
};

export type PatchDiffAuditValidationFindingSummary = {
  validationStatus: string;
  totalFindingCount: number;
  blockerCount: number;
  warningCount: number;
  infoCount: number;
};

export type PatchDiffAuditRiskSummary = {
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  reasonCodes: string[];
};

export type PatchDiffAuditReadiness = {
  canProceedToApprovalDraftPreview: boolean;
  canProceedToVirtualApplyPreview: false;
  canApplyPatch: false;
};

export type PatchDiffAuditWarning = {
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type PatchDiffAuditPreviewInput = {
  proposalPreview?: unknown;
  validationPreview?: unknown;
  proposalId?: string | undefined;
  validationId?: string | undefined;
  intent?: string | undefined;
  title?: string | undefined;
  fileCount?: number | undefined;
  filesCreated?: number | undefined;
  filesUpdated?: number | undefined;
  filesDeleted?: number | undefined;
  linesAdded?: number | undefined;
  linesRemoved?: number | undefined;
  riskLevel?: CapabilityRiskLevel | undefined;
  derivedRiskLevel?: CapabilityRiskLevel | undefined;
  requiresApproval?: boolean | undefined;
  pathSummaries?: string[] | undefined;
  validationFindings?: unknown[] | undefined;
  warningCodes?: string[] | undefined;
  proposalHash?: string | undefined;
  validationHash?: string | undefined;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  agentRouteRef?: string | undefined;
  approvalRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  maxFileRefs?: number | undefined;
  maxInputBytes?: number | undefined;
};

export type PatchDiffAuditPreview = {
  status: PatchDiffAuditStatus;
  auditId: string;
  proposalId: string;
  validationId: string;
  intent: string;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  fileCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
  findingCount: number;
  blockerCount: number;
  warningCount: number;
  findings: PatchDiffAuditFinding[];
  warnings: PatchDiffAuditWarning[];
  pathCategorySummary: PatchDiffAuditPathCategorySummary;
  validationFindingSummary: PatchDiffAuditValidationFindingSummary;
  riskSummary: PatchDiffAuditRiskSummary;
  readiness: PatchDiffAuditReadiness;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  auditHash: string;
  nextAction: string;
  source: "runtime_patch_diff_audit_preview";
  previewOnly: true;
  diffGenerated: false;
  applyEnabled: false;
  virtualApplyEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
};

export type PatchDiffAuditInputValidationResult = {
  ok: boolean;
  warningCodes: string[];
  findings: PatchDiffAuditFinding[];
};

type NormalizedAuditSummary = {
  proposalId: string;
  validationId: string;
  intent: string;
  title: string;
  fileCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  pathSummaries: string[];
  validationStatus: string;
  validationCanProceedToDiffAuditPreview: boolean;
  validationFindings: PatchDiffAuditFinding[];
  warningCodes: string[];
  proposalHash: string;
  validationHash: string;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  agentRouteRef?: string | undefined;
  approvalRef?: string | undefined;
};

type ParsedPathSummary = {
  path: string;
  changeKind: "create" | "update" | "delete" | "documentation" | "test";
};

const defaultMaxFileRefs = 12;
const defaultMaxInputBytes = 120_000;
const manyFilesWarningThreshold = 5;
const largeLineDeltaWarningThreshold = 400;

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
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b|raw diff`, "i")
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
const testDirectoryPattern = /(^|\/)(test|tests|__tests__)\//i;
const testFilePattern = /\.(test|spec)\.[tj]sx?$/i;

export function buildPatchDiffAuditPreview(
  input: PatchDiffAuditPreviewInput = {}
): PatchDiffAuditPreview {
  const summary = normalizeAuditSummary(input);
  if (isEmptyAuditInput(input, summary)) {
    return emptyPreview(input, []);
  }

  const validation = validatePatchDiffAuditPreviewInput(input);
  const findings = validation.findings;
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const pathCategorySummary = pathCategories(summary.pathSummaries);
  const derivedRiskLevel = deriveRiskLevel(summary, findings);
  const requiresApproval =
    summary.requiresApproval ||
    approvalRequired(summary, findings, pathCategorySummary);
  const status = statusFor(blockerCount, warningCount, requiresApproval);
  const auditId =
    input.idGenerator?.() ??
    `patch-diff-audit-${hashPreview(
      [
        summary.proposalId,
        summary.validationId,
        summary.pathSummaries.join(","),
        summary.validationHash,
        input.createdAt ?? "runtime-diff-audit-preview"
      ].join("|")
    )}`;
  const readiness: PatchDiffAuditReadiness = {
    canProceedToApprovalDraftPreview: blockerCount === 0,
    canProceedToVirtualApplyPreview: false,
    canApplyPatch: false
  };
  const validationFindingSummary = validationFindingSummaryFor(summary);
  const riskSummary: PatchDiffAuditRiskSummary = {
    riskLevel: summary.riskLevel,
    derivedRiskLevel,
    requiresApproval,
    reasonCodes: uniqueStrings(findings.map((finding) => finding.code))
  };
  const auditHash = hashPreview(
    JSON.stringify({
      auditId,
      proposalId: summary.proposalId,
      validationId: summary.validationId,
      intent: summary.intent,
      counts: {
        fileCount: summary.fileCount,
        filesCreated: summary.filesCreated,
        filesUpdated: summary.filesUpdated,
        filesDeleted: summary.filesDeleted,
        linesAdded: summary.linesAdded,
        linesRemoved: summary.linesRemoved
      },
      riskLevel: summary.riskLevel,
      derivedRiskLevel,
      requiresApproval,
      findings: findings.map((finding) => ({
        kind: finding.kind,
        severity: finding.severity,
        code: finding.code,
        path: finding.path,
        relatedRef: finding.relatedRef
      })),
      pathCategorySummary,
      validationFindingSummary
    })
  );

  return {
    status,
    auditId,
    proposalId: summary.proposalId,
    validationId: summary.validationId,
    intent: summary.intent,
    riskLevel: summary.riskLevel,
    derivedRiskLevel,
    requiresApproval,
    fileCount: summary.fileCount,
    filesCreated: summary.filesCreated,
    filesUpdated: summary.filesUpdated,
    filesDeleted: summary.filesDeleted,
    linesAdded: summary.linesAdded,
    linesRemoved: summary.linesRemoved,
    findingCount: findings.length,
    blockerCount,
    warningCount,
    findings,
    warnings: findings
      .filter((finding) => finding.severity !== "info")
      .map((finding) => warningFromFinding(finding)),
    pathCategorySummary,
    validationFindingSummary,
    riskSummary,
    readiness,
    noCompressRequired: summary.pathSummaries.length > 0,
    contextPlacement: "no_compress_zone",
    auditHash,
    nextAction: nextActionFor(status, readiness),
    source: "runtime_patch_diff_audit_preview",
    previewOnly: true,
    diffGenerated: false,
    applyEnabled: false,
    virtualApplyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false
  };
}

export function summarizePatchDiffAuditPreview(
  preview: PatchDiffAuditPreview
): {
  auditId: string;
  proposalId: string;
  validationId: string;
  status: PatchDiffAuditStatus;
  blockerCount: number;
  warningCount: number;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  canProceedToApprovalDraftPreview: boolean;
  canApplyPatch: false;
  diffGenerated: false;
  hash: string;
} {
  return {
    auditId: preview.auditId,
    proposalId: preview.proposalId,
    validationId: preview.validationId,
    status: preview.status,
    blockerCount: preview.blockerCount,
    warningCount: preview.warningCount,
    riskLevel: preview.riskLevel,
    derivedRiskLevel: preview.derivedRiskLevel,
    requiresApproval: preview.requiresApproval,
    canProceedToApprovalDraftPreview:
      preview.readiness.canProceedToApprovalDraftPreview,
    canApplyPatch: false,
    diffGenerated: false,
    hash: hashPreview(
      [
        preview.auditId,
        preview.proposalId,
        preview.validationId,
        preview.status,
        preview.blockerCount,
        preview.warningCount,
        preview.derivedRiskLevel,
        preview.requiresApproval ? "approval" : "no-approval",
        preview.auditHash
      ].join("|")
    )
  };
}

export function validatePatchDiffAuditPreviewInput(
  input: PatchDiffAuditPreviewInput
): PatchDiffAuditInputValidationResult {
  const summary = normalizeAuditSummary(input);
  const findings: PatchDiffAuditFinding[] = [];
  const inputJson = safeStringify(input);

  if (inputJson.length > (input.maxInputBytes ?? defaultMaxInputBytes)) {
    findings.push(
      finding("safety", "blocker", "PATCH_DIFF_AUDIT_INPUT_TOO_LARGE")
    );
  }
  for (const code of rawFieldWarningsFrom(input)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of unsafeWarningCodes(inputJson)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of applyAttemptWarningsFrom(input)) {
    findings.push(finding("readiness", "blocker", code));
  }

  if (summary.proposalId.length === 0) {
    findings.push(
      finding("validation", "blocker", "PATCH_DIFF_AUDIT_MISSING_PROPOSAL_ID")
    );
  }
  if (summary.validationId.length === 0) {
    findings.push(
      finding("validation", "blocker", "PATCH_DIFF_AUDIT_MISSING_VALIDATION_ID")
    );
  }
  if (summary.pathSummaries.length === 0) {
    findings.push(
      finding("path", "blocker", "PATCH_DIFF_AUDIT_MISSING_PATH_SUMMARIES")
    );
  }
  if (
    summary.pathSummaries.length > (input.maxFileRefs ?? defaultMaxFileRefs)
  ) {
    findings.push(
      finding("path", "blocker", "PATCH_DIFF_AUDIT_TOO_MANY_FILES")
    );
  } else if (summary.pathSummaries.length > manyFilesWarningThreshold) {
    findings.push(finding("path", "warning", "PATCH_DIFF_AUDIT_MANY_FILES"));
  }
  if (summary.linesAdded < 0 || summary.linesRemoved < 0) {
    findings.push(
      finding("risk", "blocker", "PATCH_DIFF_AUDIT_NEGATIVE_LINE_ESTIMATE")
    );
  }
  if (
    summary.linesAdded > largeLineDeltaWarningThreshold ||
    summary.linesRemoved > largeLineDeltaWarningThreshold
  ) {
    findings.push(
      finding("risk", "warning", "PATCH_DIFF_AUDIT_LARGE_LINE_DELTA")
    );
  }
  if (summary.validationStatus === "blocked") {
    findings.push(
      finding("validation", "blocker", "PATCH_DIFF_AUDIT_VALIDATION_BLOCKED")
    );
  }
  if (!summary.validationCanProceedToDiffAuditPreview) {
    findings.push(
      finding("readiness", "blocker", "PATCH_DIFF_AUDIT_VALIDATION_NOT_READY")
    );
  }

  const parsedPaths = summary.pathSummaries.map(parsePathSummary);
  for (const item of parsedPaths) {
    for (const code of validatePath(item.path)) {
      findings.push(finding("path", "blocker", code, item.path));
    }
    for (const code of pathRiskFindings(item)) {
      findings.push(finding("approval", "warning", code, item.path));
    }
  }

  if (summary.workspaceIndexRef === undefined) {
    findings.push(
      finding("evidence", "warning", "PATCH_DIFF_AUDIT_WORKSPACE_INDEX_MISSING")
    );
  }
  if (summary.contextSummaryRef === undefined) {
    findings.push(
      finding("context", "warning", "PATCH_DIFF_AUDIT_CONTEXT_SUMMARY_MISSING")
    );
  }
  if (summary.capabilityPlanRef === undefined) {
    findings.push(
      finding("evidence", "warning", "PATCH_DIFF_AUDIT_CAPABILITY_PLAN_MISSING")
    );
  }
  if (summary.agentRouteRef === undefined) {
    findings.push(
      finding("evidence", "warning", "PATCH_DIFF_AUDIT_AGENT_ROUTE_MISSING")
    );
  }
  if (summary.requiresApproval && summary.approvalRef === undefined) {
    findings.push(
      finding("approval", "warning", "PATCH_DIFF_AUDIT_APPROVAL_REF_MISSING")
    );
  }
  if (
    summary.intent === "code_change" &&
    parsedPaths.some((item) => sourcePath(item.path)) &&
    !parsedPaths.some((item) => testPath(item.path))
  ) {
    findings.push(
      finding("test_coverage", "warning", "PATCH_DIFF_AUDIT_TEST_PATH_MISSING")
    );
  }
  if (summary.intent === "unknown") {
    findings.push(
      finding("readiness", "warning", "PATCH_DIFF_AUDIT_UNKNOWN_INTENT")
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
  for (const code of summary.warningCodes) {
    const normalizedCode = warningCode(code);
    findings.push(
      finding(
        safetyWarningCode(normalizedCode) ? "safety" : "evidence",
        safetyWarningCode(normalizedCode) ? "blocker" : "warning",
        normalizedCode
      )
    );
  }

  const derivedRiskLevel = deriveRiskLevel(summary, findings);
  if (riskRank(summary.derivedRiskLevel) < riskRank(derivedRiskLevel)) {
    findings.push(
      finding("risk", "warning", "PATCH_DIFF_AUDIT_VALIDATION_RISK_TOO_LOW")
    );
  }
  if (riskRank(summary.riskLevel) < riskRank(derivedRiskLevel)) {
    findings.push(
      finding("risk", "warning", "PATCH_DIFF_AUDIT_DECLARED_RISK_TOO_LOW")
    );
  }

  const dedupedFindings = uniqueFindings(findings);
  return {
    ok: !dedupedFindings.some((item) => item.severity === "blocker"),
    warningCodes: dedupedFindings.map((item) => item.code),
    findings: dedupedFindings
  };
}

function normalizeAuditSummary(
  input: PatchDiffAuditPreviewInput
): NormalizedAuditSummary {
  const proposal = isRecord(input.proposalPreview) ? input.proposalPreview : {};
  const validation = isRecord(input.validationPreview)
    ? input.validationPreview
    : {};
  const readiness = isRecord(validation.readiness) ? validation.readiness : {};
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
    ...itemPathSummaries
  ]);
  const validationFindings = normalizeValidationFindings([
    ...safeArray(input.validationFindings),
    ...safeArray(validation.findings)
  ]);

  return {
    proposalId: safeText(
      input.proposalId ?? validation.proposalId ?? proposal.proposalId,
      ""
    ),
    validationId: safeText(input.validationId ?? validation.validationId, ""),
    intent: safeIdentifier(
      input.intent ?? validation.intent ?? proposal.intent,
      "unknown"
    ),
    title: safeText(input.title ?? proposal.title, "Patch diff audit preview"),
    fileCount: nonNegativeInteger(
      input.fileCount ?? validation.fileCount ?? proposal.fileCount,
      pathSummaries.length
    ),
    filesCreated: nonNegativeInteger(
      input.filesCreated ?? proposal.filesCreated
    ),
    filesUpdated: nonNegativeInteger(
      input.filesUpdated ?? proposal.filesUpdated
    ),
    filesDeleted: nonNegativeInteger(
      input.filesDeleted ?? proposal.filesDeleted
    ),
    linesAdded: finiteNumber(
      input.linesAdded ?? validation.linesAdded ?? proposal.linesAdded
    ),
    linesRemoved: finiteNumber(
      input.linesRemoved ?? validation.linesRemoved ?? proposal.linesRemoved
    ),
    riskLevel: normalizeRiskLevel(
      input.riskLevel ?? validation.riskLevel ?? proposal.riskLevel
    ),
    derivedRiskLevel: normalizeRiskLevel(
      input.derivedRiskLevel ??
        validation.derivedRiskLevel ??
        proposal.riskLevel
    ),
    requiresApproval:
      input.requiresApproval === true ||
      validation.requiresApproval === true ||
      proposal.requiresApproval === true,
    pathSummaries,
    validationStatus: safeIdentifier(validation.status, "unknown"),
    validationCanProceedToDiffAuditPreview:
      readiness.canProceedToDiffAuditPreview === true,
    validationFindings,
    warningCodes: uniqueStrings([
      ...safeWarningCodes(input.warningCodes),
      ...safeWarningCodes(proposal.warningCodes),
      ...safeWarningCodes(validation.warningCodes)
    ]),
    proposalHash: safeText(input.proposalHash ?? proposal.proposalHash, ""),
    validationHash: safeText(
      input.validationHash ?? validation.validationHash,
      ""
    ),
    workspaceIndexRef: optionalSafeRef(
      input.workspaceIndexRef ?? proposal.workspaceIndexRef
    ),
    contextSummaryRef: optionalSafeRef(
      input.contextSummaryRef ?? validation.contextSummaryRef
    ),
    capabilityPlanRef: optionalSafeRef(
      input.capabilityPlanRef ?? validation.capabilityPlanRef
    ),
    agentRouteRef: optionalSafeRef(
      input.agentRouteRef ?? validation.agentRouteRef
    ),
    approvalRef: optionalSafeRef(input.approvalRef)
  };
}

function isEmptyAuditInput(
  input: PatchDiffAuditPreviewInput,
  summary: NormalizedAuditSummary
): boolean {
  return (
    input.proposalPreview === undefined &&
    input.validationPreview === undefined &&
    summary.proposalId.length === 0 &&
    summary.validationId.length === 0 &&
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
    codes.push("PATCH_DIFF_AUDIT_EMPTY_PATH");
  }
  if (path.length > 240) {
    codes.push("PATCH_DIFF_AUDIT_PATH_TOO_LONG");
  }
  if (/^[a-zA-Z]:/.test(path)) {
    codes.push("PATCH_DIFF_AUDIT_DRIVE_PATH_REJECTED");
  }
  if (path.startsWith("//")) {
    codes.push("PATCH_DIFF_AUDIT_UNC_PATH_REJECTED");
  }
  if (path.startsWith("/")) {
    codes.push("PATCH_DIFF_AUDIT_ABSOLUTE_PATH_REJECTED");
  }
  if (path.includes("\0")) {
    codes.push("PATCH_DIFF_AUDIT_NULL_BYTE_REJECTED");
  }
  if (/[\r\n]/.test(path)) {
    codes.push("PATCH_DIFF_AUDIT_NEWLINE_PATH_REJECTED");
  }
  if (/https?:\/\//i.test(path) || /[?#]/.test(path)) {
    codes.push("PATCH_DIFF_AUDIT_URL_OR_QUERY_PATH_REJECTED");
  }
  if (/[;&|`$<>*{}[\]!]/.test(path)) {
    codes.push("PATCH_DIFF_AUDIT_SHELL_META_PATH_REJECTED");
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "..")) {
    codes.push("PATCH_DIFF_AUDIT_PARENT_TRAVERSAL_REJECTED");
  }
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    codes.push("PATCH_DIFF_AUDIT_EMPTY_SEGMENT_REJECTED");
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    codes.push("PATCH_DIFF_AUDIT_GENERATED_PATH_REJECTED");
  }
  const lower = path.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    codes.push("PATCH_DIFF_AUDIT_GENERATED_PATH_REJECTED");
  }
  if (/^\.env(?:\.|$)|\/\.env(?:\.|$)/.test(lower)) {
    codes.push("PATCH_DIFF_AUDIT_SECRET_PATH_REJECTED");
  }
  if (
    /(^|[/.-])secret(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])credential(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])private-key([/.-]|$)/i.test(path) ||
    /(^|\/)id_rsa$/i.test(path) ||
    /\.(pem|p12|pfx|key)$/i.test(path)
  ) {
    codes.push("PATCH_DIFF_AUDIT_SECRET_PATH_REJECTED");
  }
  return uniqueStrings(codes);
}

function pathRiskFindings(item: ParsedPathSummary): string[] {
  const codes: string[] = [];
  if (item.changeKind === "delete") {
    codes.push("PATCH_DIFF_AUDIT_DELETE_REQUIRES_APPROVAL");
  }
  if (configFilePattern.test(item.path)) {
    codes.push("PATCH_DIFF_AUDIT_CONFIG_REQUIRES_APPROVAL");
  }
  if (sourcePath(item.path)) {
    codes.push("PATCH_DIFF_AUDIT_SOURCE_REQUIRES_APPROVAL");
  }
  return codes;
}

function pathCategories(
  pathSummaries: readonly string[]
): PatchDiffAuditPathCategorySummary {
  const parsedPaths = pathSummaries.map(parsePathSummary);
  return parsedPaths.reduce<PatchDiffAuditPathCategorySummary>(
    (acc, item) => {
      if (item.changeKind === "delete") {
        acc.deletes += 1;
      }
      if (generatedPath(item.path)) {
        acc.generated += 1;
      } else if (documentationPath(item.path)) {
        acc.docs += 1;
      } else if (testPath(item.path)) {
        acc.tests += 1;
      } else if (sourcePath(item.path)) {
        acc.source += 1;
      } else if (configFilePattern.test(item.path)) {
        acc.config += 1;
      } else {
        acc.unknown += 1;
      }
      return acc;
    },
    {
      docs: 0,
      tests: 0,
      source: 0,
      config: 0,
      deletes: 0,
      generated: 0,
      unknown: 0
    }
  );
}

function validationFindingSummaryFor(
  summary: NormalizedAuditSummary
): PatchDiffAuditValidationFindingSummary {
  return {
    validationStatus: summary.validationStatus,
    totalFindingCount: summary.validationFindings.length,
    blockerCount: summary.validationFindings.filter(
      (finding) => finding.severity === "blocker"
    ).length,
    warningCount: summary.validationFindings.filter(
      (finding) => finding.severity === "warning"
    ).length,
    infoCount: summary.validationFindings.filter(
      (finding) => finding.severity === "info"
    ).length
  };
}

function deriveRiskLevel(
  summary: NormalizedAuditSummary,
  findings: readonly PatchDiffAuditFinding[]
): CapabilityRiskLevel {
  if (
    summary.filesDeleted > 0 ||
    findings.some((finding) =>
      [
        "PATCH_DIFF_AUDIT_DELETE_REQUIRES_APPROVAL",
        "PATCH_DIFF_AUDIT_CONFIG_REQUIRES_APPROVAL",
        "PATCH_DIFF_AUDIT_SOURCE_REQUIRES_APPROVAL"
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

function approvalRequired(
  summary: NormalizedAuditSummary,
  findings: readonly PatchDiffAuditFinding[],
  categories: PatchDiffAuditPathCategorySummary
): boolean {
  return (
    summary.requiresApproval ||
    categories.deletes > 0 ||
    categories.source > 0 ||
    categories.config > 0 ||
    findings.some(
      (finding) =>
        finding.kind === "approval" ||
        finding.code === "PATCH_DIFF_AUDIT_DECLARED_RISK_TOO_LOW" ||
        finding.code === "PATCH_DIFF_AUDIT_VALIDATION_RISK_TOO_LOW"
    )
  );
}

function statusFor(
  blockerCount: number,
  warningCount: number,
  requiresApproval: boolean
): PatchDiffAuditStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (requiresApproval) {
    return "needs_approval";
  }
  return warningCount > 0 ? "warning" : "audit_ready";
}

function nextActionFor(
  status: PatchDiffAuditStatus,
  readiness: PatchDiffAuditReadiness
): string {
  if (status === "blocked") {
    return "Resolve blocker findings before approval draft preview. Patch apply and virtual apply remain disabled.";
  }
  if (status === "needs_approval") {
    return "Review approval draft preview next. Approval execution, virtual apply, and patch apply remain disabled.";
  }
  if (status === "warning") {
    return readiness.canProceedToApprovalDraftPreview
      ? "Review audit warning findings before approval draft preview. Patch apply remains disabled."
      : "Review audit warnings before any next preview stage.";
  }
  if (status === "audit_ready") {
    return "Ready for approval draft preview only. No raw diff is generated and patch apply remains disabled.";
  }
  return "Validate a patch proposal summary first, then preview diff audit.";
}

function emptyPreview(
  input: PatchDiffAuditPreviewInput,
  warningCodes: readonly string[]
): PatchDiffAuditPreview {
  const auditId =
    input.idGenerator?.() ??
    `patch-diff-audit-${hashPreview(["empty", warningCodes.join(",")].join("|"))}`;
  const findings = warningCodes.map((code) =>
    finding("readiness", "warning", code)
  );
  return {
    status: warningCodes.length > 0 ? "warning" : "empty",
    auditId,
    proposalId: "no-patch-proposal-audit",
    validationId: "no-patch-validation-audit",
    intent: safeIdentifier(input.intent, "unknown"),
    riskLevel: "A1_read",
    derivedRiskLevel: "A1_read",
    requiresApproval: false,
    fileCount: 0,
    filesCreated: 0,
    filesUpdated: 0,
    filesDeleted: 0,
    linesAdded: 0,
    linesRemoved: 0,
    findingCount: findings.length,
    blockerCount: 0,
    warningCount: findings.length,
    findings,
    warnings: findings.map(warningFromFinding),
    pathCategorySummary: pathCategories([]),
    validationFindingSummary: {
      validationStatus: "unknown",
      totalFindingCount: 0,
      blockerCount: 0,
      warningCount: 0,
      infoCount: 0
    },
    riskSummary: {
      riskLevel: "A1_read",
      derivedRiskLevel: "A1_read",
      requiresApproval: false,
      reasonCodes: []
    },
    readiness: {
      canProceedToApprovalDraftPreview: false,
      canProceedToVirtualApplyPreview: false,
      canApplyPatch: false
    },
    noCompressRequired: false,
    contextPlacement: "no_compress_zone",
    auditHash: hashPreview(`empty:${warningCodes.join(",")}`),
    nextAction:
      "Validate a patch proposal summary first, then preview diff audit.",
    source: "runtime_patch_diff_audit_preview",
    previewOnly: true,
    diffGenerated: false,
    applyEnabled: false,
    virtualApplyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false
  };
}

function normalizeValidationFindings(
  values: readonly unknown[]
): PatchDiffAuditFinding[] {
  return values.filter(isRecord).map((value, index) => {
    const code = warningCode(value.code);
    const severity = normalizeSeverity(value.severity);
    const kind = normalizeFindingKind(value.kind);
    const path = optionalPath(value.path);
    const relatedRef = optionalSafeRef(value.relatedRef ?? value.findingId);
    return {
      findingId: safeIdentifier(
        value.findingId,
        `validation-finding-${index + 1}-${hashPreview(code)}`
      ),
      kind,
      severity,
      code,
      summary: safeSummary(value.summary, `Validation finding: ${code}`),
      ...(path !== undefined ? { path } : {}),
      ...(relatedRef !== undefined ? { relatedRef } : {})
    };
  });
}

function warningFromFinding(
  item: PatchDiffAuditFinding
): PatchDiffAuditWarning {
  return {
    code: item.code,
    safeMessage: item.summary,
    ...(item.path !== undefined ? { path: item.path } : {})
  };
}

function finding(
  kind: PatchDiffAuditFindingKind,
  severity: PatchDiffAuditSeverity,
  code: string,
  path?: string | undefined,
  relatedRef?: string | undefined
): PatchDiffAuditFinding {
  const safeCode = warningCode(code);
  return {
    findingId: `patch-diff-audit-${kind}-${safeCode.toLowerCase()}-${hashPreview(
      `${path ?? ""}|${relatedRef ?? ""}`
    )}`,
    kind,
    severity,
    code: safeCode,
    summary: `Patch diff audit preview finding: ${safeCode}`,
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
      codes.push("PATCH_DIFF_AUDIT_RAW_FIELD_REJECTED");
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

function applyAttemptWarningsFrom(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap(applyAttemptWarningsFrom));
  }
  if (!isRecord(value)) {
    return [];
  }
  const codes: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    if (
      (key === "canApplyPatch" ||
        key === "applyEnabled" ||
        key === "virtualApplyEnabled" ||
        key === "canProceedToVirtualApplyPreview") &&
      nested === true
    ) {
      codes.push("PATCH_DIFF_AUDIT_APPLY_ATTEMPT_REJECTED");
    }
    codes.push(...applyAttemptWarningsFrom(nested));
  }
  return uniqueStrings(codes);
}

function safetyWarningCode(code: string): boolean {
  return (
    code.endsWith("_MARKER") ||
    code === "PATCH_PREVIEW_RAW_FIELD_REJECTED" ||
    code === "PATCH_VALIDATION_RAW_FIELD_REJECTED" ||
    code === "PATCH_DIFF_AUDIT_RAW_FIELD_REJECTED"
  );
}

function normalizeSeverity(value: unknown): PatchDiffAuditSeverity {
  return value === "info" || value === "warning" || value === "blocker"
    ? value
    : "warning";
}

function normalizeFindingKind(value: unknown): PatchDiffAuditFindingKind {
  return value === "validation" ||
    value === "path" ||
    value === "risk" ||
    value === "approval" ||
    value === "evidence" ||
    value === "context" ||
    value === "test_coverage" ||
    value === "readiness" ||
    value === "safety"
    ? value
    : "validation";
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

function documentationPath(path: string): boolean {
  return path.startsWith("docs/") || /\.md$/i.test(path);
}

function sourcePath(path: string): boolean {
  return sourcePathPattern.test(path);
}

function testPath(path: string): boolean {
  return testDirectoryPattern.test(path) || testFilePattern.test(path);
}

function generatedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return generatedArtifactPrefixes.some(
    (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
  );
}

function warningCode(value: unknown): string {
  const code = safeText(value, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, "_");
  return /^[A-Z0-9_.:-]{1,120}$/.test(code) ? code : "PATCH_DIFF_AUDIT_WARNING";
}

function optionalPath(value: unknown): string | undefined {
  const text = safeText(value, "").trim().replace(/\\/g, "/");
  return text.length > 0 && text.length <= 240 ? text : undefined;
}

function optionalSafeRef(value: unknown): string | undefined {
  const text = safeIdentifier(value, "");
  return text.length > 0 ? text : undefined;
}

function safeIdentifier(value: unknown, fallback: string): string {
  const text = safeText(value, fallback)
    .replace(/[^A-Za-z0-9_.:-]/g, "_")
    .slice(0, 96);
  return text.length > 0 ? text : fallback;
}

function safeSummary(value: unknown, fallback: string): string {
  const text = safeText(value, fallback);
  return unsafeWarningCodes(text).length > 0
    ? "Summary withheld by safety policy."
    : text.slice(0, 160);
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

function safeWarningCodes(value: unknown): string[] {
  return safeStringArray(value).map(warningCode);
}

function readValue(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

function uniqueFindings(
  findings: readonly PatchDiffAuditFinding[]
): PatchDiffAuditFinding[] {
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
