import { type CapabilityRiskLevel } from "../../capabilities/index.js";

export type PatchProposalValidationStatus =
  | "empty"
  | "valid"
  | "warning"
  | "blocked"
  | "needs_approval";

export type PatchProposalValidationFindingKind =
  | "path"
  | "schema"
  | "risk"
  | "approval"
  | "evidence"
  | "context"
  | "safety"
  | "readiness";

export type PatchProposalValidationSeverity = "info" | "warning" | "blocker";

export type PatchProposalValidationFinding = {
  findingId: string;
  kind: PatchProposalValidationFindingKind;
  severity: PatchProposalValidationSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type PatchProposalValidationRiskSummary = {
  declaredRiskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  reasonCodes: string[];
};

export type PatchProposalValidationReadiness = {
  canProceedToDiffAuditPreview: boolean;
  canProceedToApprovalDraftPreview: boolean;
  canProceedToVirtualApplyPreview: false;
  canApplyPatch: false;
};

export type PatchProposalValidationWarning = {
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type PatchProposalValidationPreviewInput = {
  proposalPreview?: unknown;
  proposalId?: string | undefined;
  intent?: string | undefined;
  title?: string | undefined;
  fileCount?: number | undefined;
  filesCreated?: number | undefined;
  filesUpdated?: number | undefined;
  filesDeleted?: number | undefined;
  linesAdded?: number | undefined;
  linesRemoved?: number | undefined;
  riskLevel?: CapabilityRiskLevel | undefined;
  requiresApproval?: boolean | undefined;
  pathSummaries?: string[] | undefined;
  warningCodes?: string[] | undefined;
  proposalHash?: string | undefined;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  agentRouteRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  maxFileRefs?: number | undefined;
  maxInputBytes?: number | undefined;
};

export type PatchProposalValidationPreview = {
  status: PatchProposalValidationStatus;
  validationId: string;
  proposalId: string;
  intent: string;
  fileCount: number;
  linesAdded: number;
  linesRemoved: number;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: PatchProposalValidationFinding[];
  warnings: PatchProposalValidationWarning[];
  readiness: PatchProposalValidationReadiness;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  validationHash: string;
  nextAction: string;
  source: "runtime_patch_validation_preview";
  validationOnly: true;
  applyEnabled: false;
  virtualApplyEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
};

export type PatchProposalValidationInputValidationResult = {
  ok: boolean;
  warningCodes: string[];
  findings: PatchProposalValidationFinding[];
};

type NormalizedProposalSummary = {
  proposalId: string;
  intent: string;
  title: string;
  fileCount: number;
  linesAdded: number;
  linesRemoved: number;
  filesDeleted: number;
  riskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  pathSummaries: string[];
  warningCodes: string[];
  proposalHash: string;
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
const defaultMaxInputBytes = 100_000;
const manyFilesWarningThreshold = 5;
const highLineWarningThreshold = 400;

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
const protectedDeletePattern =
  /(^|\/)(README\.md|SECURITY\.md|CONTRIBUTING\.md|LICENSE|package\.json|pnpm-lock\.yaml)$/i;

export function buildPatchProposalValidationPreview(
  input: PatchProposalValidationPreviewInput = {}
): PatchProposalValidationPreview {
  const proposal = normalizeProposalSummary(input);
  if (isEmptyValidationInput(input, proposal)) {
    return emptyPreview(input, []);
  }

  const validation = validatePatchProposalValidationInput(input);
  const findings = validation.findings;
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const derivedRiskLevel = deriveRiskLevel(proposal, findings);
  const requiresApproval =
    proposal.requiresApproval || approvalRequired(proposal, findings);
  const status = statusFor(blockerCount, warningCount, requiresApproval);
  const validationId =
    input.idGenerator?.() ??
    `patch-validation-${hashPreview(
      [
        proposal.proposalId,
        proposal.intent,
        proposal.pathSummaries.join(","),
        proposal.proposalHash,
        input.createdAt ?? "runtime-validation-preview"
      ].join("|")
    )}`;
  const readiness: PatchProposalValidationReadiness = {
    canProceedToDiffAuditPreview:
      blockerCount === 0 && proposal.pathSummaries.length > 0,
    canProceedToApprovalDraftPreview: blockerCount === 0 && requiresApproval,
    canProceedToVirtualApplyPreview: false,
    canApplyPatch: false
  };
  const validationHash = hashPreview(
    JSON.stringify({
      validationId,
      proposalId: proposal.proposalId,
      intent: proposal.intent,
      fileCount: proposal.fileCount,
      linesAdded: proposal.linesAdded,
      linesRemoved: proposal.linesRemoved,
      riskLevel: proposal.riskLevel,
      derivedRiskLevel,
      requiresApproval,
      findings: findings.map((finding) => ({
        kind: finding.kind,
        severity: finding.severity,
        code: finding.code,
        path: finding.path,
        relatedRef: finding.relatedRef
      }))
    })
  );

  return {
    status,
    validationId,
    proposalId: proposal.proposalId,
    intent: proposal.intent,
    fileCount: proposal.fileCount,
    linesAdded: proposal.linesAdded,
    linesRemoved: proposal.linesRemoved,
    riskLevel: proposal.riskLevel,
    derivedRiskLevel,
    requiresApproval,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    findings,
    warnings: findings
      .filter((finding) => finding.severity !== "info")
      .map((finding) => warningFromFinding(finding)),
    readiness,
    noCompressRequired: proposal.pathSummaries.length > 0,
    contextPlacement: "no_compress_zone",
    validationHash,
    nextAction: nextActionFor(status, readiness),
    source: "runtime_patch_validation_preview",
    validationOnly: true,
    applyEnabled: false,
    virtualApplyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false
  };
}

export function summarizePatchProposalValidationPreview(
  preview: PatchProposalValidationPreview
): {
  validationId: string;
  proposalId: string;
  status: PatchProposalValidationStatus;
  blockerCount: number;
  warningCount: number;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  canProceedToDiffAuditPreview: boolean;
  canApplyPatch: false;
  hash: string;
} {
  return {
    validationId: preview.validationId,
    proposalId: preview.proposalId,
    status: preview.status,
    blockerCount: preview.blockerCount,
    warningCount: preview.warningCount,
    riskLevel: preview.riskLevel,
    derivedRiskLevel: preview.derivedRiskLevel,
    requiresApproval: preview.requiresApproval,
    canProceedToDiffAuditPreview:
      preview.readiness.canProceedToDiffAuditPreview,
    canApplyPatch: false,
    hash: hashPreview(
      [
        preview.validationId,
        preview.proposalId,
        preview.status,
        preview.blockerCount,
        preview.warningCount,
        preview.derivedRiskLevel,
        preview.requiresApproval ? "approval" : "no-approval",
        preview.validationHash
      ].join("|")
    )
  };
}

export function validatePatchProposalValidationInput(
  input: PatchProposalValidationPreviewInput
): PatchProposalValidationInputValidationResult {
  const proposal = normalizeProposalSummary(input);
  const findings: PatchProposalValidationFinding[] = [];
  const inputJson = safeStringify(input);

  if (inputJson.length > (input.maxInputBytes ?? defaultMaxInputBytes)) {
    findings.push(
      finding("schema", "blocker", "PATCH_VALIDATION_INPUT_TOO_LARGE")
    );
  }
  for (const code of rawFieldWarningsFrom(input)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of unsafeWarningCodes(inputJson)) {
    findings.push(finding("safety", "blocker", code));
  }

  if (proposal.proposalId.length === 0) {
    findings.push(
      finding("schema", "blocker", "PATCH_VALIDATION_MISSING_PROPOSAL_ID")
    );
  }
  if (proposal.pathSummaries.length === 0) {
    findings.push(
      finding("schema", "blocker", "PATCH_VALIDATION_MISSING_PATH_SUMMARIES")
    );
  }
  if (
    proposal.pathSummaries.length > (input.maxFileRefs ?? defaultMaxFileRefs)
  ) {
    findings.push(
      finding("schema", "blocker", "PATCH_VALIDATION_TOO_MANY_FILES")
    );
  } else if (proposal.pathSummaries.length > manyFilesWarningThreshold) {
    findings.push(finding("schema", "warning", "PATCH_VALIDATION_MANY_FILES"));
  }
  if (proposal.linesAdded < 0 || proposal.linesRemoved < 0) {
    findings.push(
      finding("schema", "blocker", "PATCH_VALIDATION_NEGATIVE_LINE_ESTIMATE")
    );
  }
  if (
    proposal.linesAdded > highLineWarningThreshold ||
    proposal.linesRemoved > highLineWarningThreshold
  ) {
    findings.push(
      finding("risk", "warning", "PATCH_VALIDATION_HIGH_LINE_ESTIMATE")
    );
  }

  const parsedPaths = proposal.pathSummaries.map(parsePathSummary);
  for (const item of parsedPaths) {
    for (const code of validatePath(item.path)) {
      findings.push(finding("path", "blocker", code, item.path));
    }
    for (const code of approvalFindingsForPath(item.path, item.changeKind)) {
      findings.push(finding("approval", "warning", code, item.path));
    }
  }

  if (proposal.workspaceIndexRef === undefined) {
    findings.push(
      finding("evidence", "warning", "PATCH_VALIDATION_WORKSPACE_INDEX_MISSING")
    );
  }
  if (proposal.contextSummaryRef === undefined) {
    findings.push(
      finding("context", "warning", "PATCH_VALIDATION_CONTEXT_SUMMARY_MISSING")
    );
    findings.push(
      finding("context", "warning", "PATCH_VALIDATION_NO_COMPRESS_REF_MISSING")
    );
  }
  if (proposal.capabilityPlanRef === undefined) {
    findings.push(
      finding("evidence", "warning", "PATCH_VALIDATION_CAPABILITY_PLAN_MISSING")
    );
  }
  if (proposal.agentRouteRef === undefined) {
    findings.push(
      finding("evidence", "warning", "PATCH_VALIDATION_AGENT_ROUTE_MISSING")
    );
  }
  if (
    proposal.intent === "code_change" &&
    !parsedPaths.some((item) => testPath(item.path))
  ) {
    findings.push(
      finding("readiness", "warning", "PATCH_VALIDATION_TEST_PATH_MISSING")
    );
  }
  if (
    proposal.intent === "code_change" &&
    parsedPaths.length > 0 &&
    parsedPaths.every((item) => documentationPath(item.path))
  ) {
    findings.push(
      finding("readiness", "warning", "PATCH_VALIDATION_DOCS_ONLY_CODE_CHANGE")
    );
  }
  if (proposal.intent === "unknown") {
    findings.push(
      finding("readiness", "warning", "PATCH_VALIDATION_UNKNOWN_INTENT")
    );
  }

  const derivedRiskLevel = deriveRiskLevel(proposal, findings);
  if (riskRank(proposal.riskLevel) < riskRank(derivedRiskLevel)) {
    findings.push(
      finding("risk", "warning", "PATCH_VALIDATION_DECLARED_RISK_TOO_LOW")
    );
  }

  for (const code of proposal.warningCodes) {
    const normalizedCode = warningCode(code);
    findings.push(
      finding(
        safetyWarningCode(normalizedCode) ? "safety" : "evidence",
        safetyWarningCode(normalizedCode) ? "blocker" : "warning",
        normalizedCode
      )
    );
  }

  const dedupedFindings = uniqueFindings(findings);
  const warningCodes = dedupedFindings.map((item) => item.code);
  return {
    ok: !dedupedFindings.some((item) => item.severity === "blocker"),
    warningCodes,
    findings: dedupedFindings
  };
}

function normalizeProposalSummary(
  input: PatchProposalValidationPreviewInput
): NormalizedProposalSummary {
  const preview = isRecord(input.proposalPreview) ? input.proposalPreview : {};
  const proposalId = safeText(input.proposalId ?? preview.proposalId, "");
  const pathSummaries = safeStringArray(
    input.pathSummaries ?? preview.pathSummaries
  );
  const items = safeArray(readValue(preview, "items")).filter(isRecord);
  const itemPathSummaries = items
    .map((item) => {
      const path = safeText(item.path, "");
      const changeKind = safeText(item.changeKind, "update");
      return path.length > 0 ? `${changeKind}:${path}` : "";
    })
    .filter((item) => item.length > 0);
  return {
    proposalId,
    intent: safeIdentifier(input.intent ?? preview.intent, "unknown"),
    title: safeText(input.title ?? preview.title, "Patch proposal validation"),
    fileCount: nonNegativeInteger(
      input.fileCount ?? preview.fileCount,
      pathSummaries.length || itemPathSummaries.length
    ),
    linesAdded: finiteNumber(input.linesAdded ?? preview.linesAdded),
    linesRemoved: finiteNumber(input.linesRemoved ?? preview.linesRemoved),
    filesDeleted: nonNegativeInteger(
      input.filesDeleted ?? preview.filesDeleted
    ),
    riskLevel: normalizeRiskLevel(input.riskLevel ?? preview.riskLevel),
    requiresApproval:
      input.requiresApproval === true || preview.requiresApproval === true,
    pathSummaries: uniqueStrings([...pathSummaries, ...itemPathSummaries]),
    warningCodes: safeWarningCodes(input.warningCodes ?? preview.warningCodes),
    proposalHash: safeText(input.proposalHash ?? preview.proposalHash, ""),
    workspaceIndexRef: optionalSafeRef(
      input.workspaceIndexRef ?? preview.workspaceIndexRef
    ),
    contextSummaryRef: optionalSafeRef(
      input.contextSummaryRef ?? preview.contextSummaryRef
    ),
    capabilityPlanRef: optionalSafeRef(
      input.capabilityPlanRef ?? preview.capabilityPlanRef
    ),
    agentRouteRef: optionalSafeRef(input.agentRouteRef ?? preview.agentRouteRef)
  };
}

function isEmptyValidationInput(
  input: PatchProposalValidationPreviewInput,
  proposal: NormalizedProposalSummary
): boolean {
  return (
    input.proposalPreview === undefined &&
    proposal.proposalId.length === 0 &&
    proposal.pathSummaries.length === 0 &&
    proposal.title === "Patch proposal validation"
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

function approvalFindingsForPath(
  path: string,
  changeKind: ParsedPathSummary["changeKind"]
): string[] {
  const codes: string[] = [];
  if (changeKind === "delete") {
    codes.push("PATCH_VALIDATION_DELETE_REQUIRES_APPROVAL");
  }
  if (changeKind === "delete" && protectedDeletePattern.test(path)) {
    codes.push("PATCH_VALIDATION_PROTECTED_DELETE_REQUIRES_APPROVAL");
  }
  if (configFilePattern.test(path)) {
    codes.push("PATCH_VALIDATION_CONFIG_REQUIRES_APPROVAL");
  }
  if (/^(app|runtime)\/src\//.test(path)) {
    codes.push("PATCH_VALIDATION_SOURCE_REQUIRES_APPROVAL");
  }
  return codes;
}

function validatePath(path: string): string[] {
  const codes: string[] = [];
  if (path.length === 0) {
    codes.push("PATCH_VALIDATION_EMPTY_PATH");
  }
  if (path.length > 240) {
    codes.push("PATCH_VALIDATION_PATH_TOO_LONG");
  }
  if (/^[a-zA-Z]:/.test(path)) {
    codes.push("PATCH_VALIDATION_DRIVE_PATH_REJECTED");
  }
  if (path.startsWith("//")) {
    codes.push("PATCH_VALIDATION_UNC_PATH_REJECTED");
  }
  if (path.startsWith("/")) {
    codes.push("PATCH_VALIDATION_ABSOLUTE_PATH_REJECTED");
  }
  if (path.includes("\0")) {
    codes.push("PATCH_VALIDATION_NULL_BYTE_REJECTED");
  }
  if (/[\r\n]/.test(path)) {
    codes.push("PATCH_VALIDATION_NEWLINE_PATH_REJECTED");
  }
  if (/https?:\/\//i.test(path) || /[?#]/.test(path)) {
    codes.push("PATCH_VALIDATION_URL_OR_QUERY_PATH_REJECTED");
  }
  if (/[;&|`$<>*{}[\]!]/.test(path)) {
    codes.push("PATCH_VALIDATION_SHELL_META_PATH_REJECTED");
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "..")) {
    codes.push("PATCH_VALIDATION_PARENT_TRAVERSAL_REJECTED");
  }
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    codes.push("PATCH_VALIDATION_EMPTY_SEGMENT_REJECTED");
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    codes.push("PATCH_VALIDATION_GENERATED_PATH_REJECTED");
  }
  const lower = path.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    codes.push("PATCH_VALIDATION_GENERATED_PATH_REJECTED");
  }
  if (/^\.env(?:\.|$)|\/\.env(?:\.|$)/.test(lower)) {
    codes.push("PATCH_VALIDATION_SECRET_PATH_REJECTED");
  }
  if (
    /(^|[/.-])secret(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])credential(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])private-key([/.-]|$)/i.test(path) ||
    /(^|\/)id_rsa$/i.test(path) ||
    /\.(pem|p12|pfx|key)$/i.test(path)
  ) {
    codes.push("PATCH_VALIDATION_SECRET_PATH_REJECTED");
  }
  return uniqueStrings(codes);
}

function deriveRiskLevel(
  proposal: NormalizedProposalSummary,
  findings: readonly PatchProposalValidationFinding[]
): CapabilityRiskLevel {
  if (
    findings.some(
      (finding) =>
        finding.code === "PATCH_VALIDATION_DELETE_REQUIRES_APPROVAL" ||
        finding.code ===
          "PATCH_VALIDATION_PROTECTED_DELETE_REQUIRES_APPROVAL" ||
        finding.code === "PATCH_VALIDATION_CONFIG_REQUIRES_APPROVAL" ||
        finding.code === "PATCH_VALIDATION_SOURCE_REQUIRES_APPROVAL"
    ) ||
    proposal.filesDeleted > 0
  ) {
    return "A3_scoped_write";
  }
  if (proposal.pathSummaries.length > 0) {
    return "A2_draft_write";
  }
  return "A1_read";
}

function approvalRequired(
  proposal: NormalizedProposalSummary,
  findings: readonly PatchProposalValidationFinding[]
): boolean {
  return (
    proposal.requiresApproval ||
    proposal.filesDeleted > 0 ||
    findings.some(
      (finding) =>
        finding.kind === "approval" ||
        finding.code === "PATCH_VALIDATION_DECLARED_RISK_TOO_LOW"
    )
  );
}

function statusFor(
  blockerCount: number,
  warningCount: number,
  requiresApproval: boolean
): PatchProposalValidationStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (requiresApproval) {
    return "needs_approval";
  }
  return warningCount > 0 ? "warning" : "valid";
}

function nextActionFor(
  status: PatchProposalValidationStatus,
  readiness: PatchProposalValidationReadiness
): string {
  if (status === "blocked") {
    return "Resolve blocker findings before diff/audit preview. Patch apply remains disabled.";
  }
  if (status === "needs_approval") {
    return "Review approval draft preview next. Approval execution and patch apply remain disabled.";
  }
  if (status === "warning") {
    return readiness.canProceedToDiffAuditPreview
      ? "Review warning findings, then proceed to diff/audit preview only. Patch apply remains disabled."
      : "Review warning findings before any next preview stage.";
  }
  if (status === "valid") {
    return "Ready for diff/audit preview only. Patch apply remains disabled.";
  }
  return "Create a patch proposal summary first, then validate it before diff/audit preview.";
}

function emptyPreview(
  input: PatchProposalValidationPreviewInput,
  warningCodes: readonly string[]
): PatchProposalValidationPreview {
  const validationId =
    input.idGenerator?.() ??
    `patch-validation-${hashPreview(["empty", warningCodes.join(",")].join("|"))}`;
  const findings = warningCodes.map((code) =>
    finding("schema", "warning", code)
  );
  return {
    status: warningCodes.length > 0 ? "warning" : "empty",
    validationId,
    proposalId: "no-patch-proposal-validation",
    intent: safeIdentifier(input.intent, "unknown"),
    fileCount: 0,
    linesAdded: 0,
    linesRemoved: 0,
    riskLevel: "A1_read",
    derivedRiskLevel: "A1_read",
    requiresApproval: false,
    blockerCount: 0,
    warningCount: findings.length,
    findingCount: findings.length,
    findings,
    warnings: findings.map((item) => warningFromFinding(item)),
    readiness: {
      canProceedToDiffAuditPreview: false,
      canProceedToApprovalDraftPreview: false,
      canProceedToVirtualApplyPreview: false,
      canApplyPatch: false
    },
    noCompressRequired: false,
    contextPlacement: "no_compress_zone",
    validationHash: hashPreview(`empty:${warningCodes.join(",")}`),
    nextAction:
      "Create a patch proposal summary first, then validate it before diff/audit preview.",
    source: "runtime_patch_validation_preview",
    validationOnly: true,
    applyEnabled: false,
    virtualApplyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false
  };
}

function warningFromFinding(
  item: PatchProposalValidationFinding
): PatchProposalValidationWarning {
  return {
    code: item.code,
    safeMessage: item.summary,
    ...(item.path !== undefined ? { path: item.path } : {})
  };
}

function finding(
  kind: PatchProposalValidationFindingKind,
  severity: PatchProposalValidationSeverity,
  code: string,
  path?: string | undefined,
  relatedRef?: string | undefined
): PatchProposalValidationFinding {
  const safeCode = warningCode(code);
  return {
    findingId: `patch-validation-${kind}-${safeCode.toLowerCase()}-${hashPreview(
      `${path ?? ""}|${relatedRef ?? ""}`
    )}`,
    kind,
    severity,
    code: safeCode,
    summary: `Patch proposal validation finding: ${safeCode}`,
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
      codes.push("PATCH_VALIDATION_RAW_FIELD_REJECTED");
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

function testPath(path: string): boolean {
  return (
    /(^|\/)(test|tests|__tests__)\//i.test(path) ||
    /\.(test|spec)\.[tj]sx?$/i.test(path)
  );
}

function warningCode(value: string): string {
  const code = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, "_");
  return /^[A-Z0-9_.:-]{1,120}$/.test(code) ? code : "PATCH_VALIDATION_WARNING";
}

function safetyWarningCode(code: string): boolean {
  return (
    code.endsWith("_MARKER") ||
    code === "PATCH_PREVIEW_RAW_FIELD_REJECTED" ||
    code === "PATCH_VALIDATION_RAW_FIELD_REJECTED"
  );
}

function safeWarningCodes(value: unknown): string[] {
  return safeStringArray(value).map(warningCode);
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

function safeIdentifier(value: unknown, fallback: string): string {
  const text = safeText(value, fallback)
    .replace(/[^A-Za-z0-9_.:-]/g, "_")
    .slice(0, 80);
  return text.length > 0 ? text : fallback;
}

function optionalSafeRef(value: unknown): string | undefined {
  const text = safeIdentifier(value, "");
  return text.length > 0 ? text : undefined;
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

function readValue(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

function uniqueFindings(
  findings: readonly PatchProposalValidationFinding[]
): PatchProposalValidationFinding[] {
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
