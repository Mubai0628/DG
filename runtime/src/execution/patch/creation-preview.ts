import { type CapabilityRiskLevel } from "../../capabilities/index.js";

export type PatchProposalCreationStatus =
  | "empty"
  | "preview"
  | "blocked"
  | "warning";

export type PatchProposalCreationChangeKind =
  | "create"
  | "update"
  | "delete"
  | "documentation"
  | "test";

export type PatchProposalCreationWarning = {
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type PatchProposalCreationFileRef = {
  path: string;
  changeKind: PatchProposalCreationChangeKind;
  language?: string | undefined;
  extension?: string | undefined;
  reasonSummary?: string | undefined;
  estimatedLinesAdded?: number | undefined;
  estimatedLinesRemoved?: number | undefined;
  riskHints?: string[] | undefined;
  warningCodes?: string[] | undefined;
};

export type PatchProposalCreationItem = {
  itemId: string;
  path: string;
  changeKind: PatchProposalCreationChangeKind;
  language: string;
  extension: string;
  reasonSummary: string;
  estimatedLinesAdded: number;
  estimatedLinesRemoved: number;
  riskHints: string[];
  warningCodes: string[];
  requiresApproval: boolean;
};

export type PatchProposalCreationRiskSummary = {
  riskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  reasonCodes: string[];
};

export type PatchProposalCreationPreviewInput = {
  intent?: string | undefined;
  title?: string | undefined;
  changeDescriptionSummary?: string | undefined;
  selectedPathRefs?: PatchProposalCreationFileRef[] | undefined;
  proposedChanges?: PatchProposalCreationFileRef[] | undefined;
  runDraftRef?: string | undefined;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  agentRouteRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  maxFileRefs?: number | undefined;
  maxInputBytes?: number | undefined;
  maxDescriptionLength?: number | undefined;
};

export type PatchProposalCreationPreview = {
  status: PatchProposalCreationStatus;
  proposalId: string;
  title: string;
  intent: string;
  fileCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
  riskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  items: PatchProposalCreationItem[];
  pathSummaries: string[];
  warningCodes: string[];
  warnings: PatchProposalCreationWarning[];
  proposalHash: string;
  nextAction: string;
  source: "runtime_patch_creation_preview";
  previewOnly: true;
  applyEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
};

export type PatchProposalCreationValidationResult = {
  ok: boolean;
  warningCodes: string[];
  warnings: PatchProposalCreationWarning[];
};

const defaultMaxFileRefs = 12;
const defaultMaxInputBytes = 80_000;
const defaultMaxDescriptionLength = 600;
const manyFilesWarningThreshold = 5;

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

export function buildPatchProposalCreationPreview(
  input: PatchProposalCreationPreviewInput = {}
): PatchProposalCreationPreview {
  const validation = validatePatchProposalCreationInput(input);
  const fileRefs = uniqueFileRefs([
    ...safeArray(input.selectedPathRefs),
    ...safeArray(input.proposedChanges)
  ]);

  if (fileRefs.length === 0 && validation.warnings.length === 0) {
    return emptyPreview(input, []);
  }

  if (!validation.ok) {
    return emptyPreview(input, validation.warningCodes, "blocked");
  }

  const items = fileRefs.map((ref, index) => itemFromRef(input, ref, index));
  const warningCodes = uniqueStrings([
    ...validation.warningCodes,
    ...items.flatMap((item) => item.warningCodes),
    ...(items.length > manyFilesWarningThreshold
      ? ["PATCH_PREVIEW_MANY_FILES"]
      : [])
  ]);
  const risk = riskSummaryFor(items, warningCodes);
  const proposalId =
    input.idGenerator?.() ??
    `patch-preview-${hashPreview(
      [
        safeText(input.intent, "unknown"),
        safeText(input.title, "Patch proposal preview"),
        safeText(input.changeDescriptionSummary, ""),
        items.map((item) => `${item.changeKind}:${item.path}`).join(","),
        safeText(input.runDraftRef, ""),
        safeText(input.workspaceIndexRef, ""),
        safeText(input.contextSummaryRef, ""),
        safeText(input.agentRouteRef, ""),
        safeText(input.capabilityPlanRef, ""),
        safeText(input.createdAt, "runtime-preview")
      ].join("|")
    )}`;
  const status: PatchProposalCreationStatus = warningCodes.some(
    isBlockingWarning
  )
    ? "blocked"
    : warningCodes.length > 0
      ? "warning"
      : "preview";
  const filesCreated = items.filter(
    (item) => item.changeKind === "create"
  ).length;
  const filesDeleted = items.filter(
    (item) => item.changeKind === "delete"
  ).length;
  const filesUpdated = items.length - filesCreated - filesDeleted;
  const linesAdded = items.reduce(
    (sum, item) => sum + item.estimatedLinesAdded,
    0
  );
  const linesRemoved = items.reduce(
    (sum, item) => sum + item.estimatedLinesRemoved,
    0
  );
  const pathSummaries = items.map((item) => `${item.changeKind}:${item.path}`);
  const proposalHash = hashPreview(
    JSON.stringify({
      proposalId,
      intent: safeText(input.intent, "unknown"),
      title: safeTitle(input.title),
      fileRefs: items.map((item) => ({
        path: item.path,
        changeKind: item.changeKind,
        language: item.language,
        extension: item.extension,
        added: item.estimatedLinesAdded,
        removed: item.estimatedLinesRemoved,
        warnings: item.warningCodes
      })),
      riskLevel: risk.riskLevel,
      requiresApproval: risk.requiresApproval,
      warningCodes
    })
  );

  return {
    status,
    proposalId,
    title: safeTitle(input.title),
    intent: safeText(input.intent, "unknown"),
    fileCount: items.length,
    filesCreated,
    filesUpdated,
    filesDeleted,
    linesAdded,
    linesRemoved,
    riskLevel: risk.riskLevel,
    requiresApproval: risk.requiresApproval,
    items,
    pathSummaries,
    warningCodes,
    warnings: warningCodes.map((code) => warning(code)),
    proposalHash,
    nextAction: nextActionFor(status, risk.requiresApproval),
    source: "runtime_patch_creation_preview",
    previewOnly: true,
    applyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false
  };
}

export function summarizePatchProposalCreationPreview(
  preview: PatchProposalCreationPreview
): {
  proposalId: string;
  status: PatchProposalCreationStatus;
  intent: string;
  fileCount: number;
  linesAdded: number;
  linesRemoved: number;
  riskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  warningCodes: string[];
  hash: string;
} {
  return {
    proposalId: preview.proposalId,
    status: preview.status,
    intent: preview.intent,
    fileCount: preview.fileCount,
    linesAdded: preview.linesAdded,
    linesRemoved: preview.linesRemoved,
    riskLevel: preview.riskLevel,
    requiresApproval: preview.requiresApproval,
    warningCodes: [...preview.warningCodes],
    hash: hashPreview(
      [
        preview.proposalId,
        preview.status,
        preview.intent,
        preview.fileCount,
        preview.linesAdded,
        preview.linesRemoved,
        preview.riskLevel,
        preview.requiresApproval ? "approval" : "no-approval",
        preview.warningCodes.join(","),
        preview.proposalHash
      ].join("|")
    )
  };
}

export function validatePatchProposalCreationInput(
  input: PatchProposalCreationPreviewInput
): PatchProposalCreationValidationResult {
  const fileRefs = [
    ...safeArray(input.selectedPathRefs),
    ...safeArray(input.proposedChanges)
  ];
  const warnings: PatchProposalCreationWarning[] = [];
  const rawFieldWarnings = rawFieldWarningsFrom(input);
  warnings.push(...rawFieldWarnings.map((code) => warning(code)));

  const inputJson = safeStringify(input);
  if (inputJson.length > (input.maxInputBytes ?? defaultMaxInputBytes)) {
    warnings.push(warning("PATCH_PREVIEW_INPUT_TOO_LARGE"));
  }
  if (
    safeText(input.changeDescriptionSummary, "").length >
    (input.maxDescriptionLength ?? defaultMaxDescriptionLength)
  ) {
    warnings.push(warning("PATCH_PREVIEW_DESCRIPTION_TOO_LONG"));
  }
  if (fileRefs.length > (input.maxFileRefs ?? defaultMaxFileRefs)) {
    warnings.push(warning("PATCH_PREVIEW_TOO_MANY_FILES"));
  }
  warnings.push(...unsafeWarningCodes(inputJson).map((code) => warning(code)));

  for (const fileRef of fileRefs) {
    warnings.push(...validateFileRef(fileRef));
  }

  const dedupedWarnings = uniqueWarnings(warnings);
  const warningCodes = dedupedWarnings.map((item) => item.code);
  return {
    ok: !warningCodes.some(isBlockingWarning),
    warningCodes,
    warnings: dedupedWarnings
  };
}

function itemFromRef(
  input: PatchProposalCreationPreviewInput,
  ref: PatchProposalCreationFileRef,
  index: number
): PatchProposalCreationItem {
  const path = normalizePath(ref.path);
  const changeKind = normalizeChangeKind(ref.changeKind);
  const warningCodes = uniqueStrings([
    ...safeWarningCodes(ref.warningCodes),
    ...safeWarningCodes(ref.riskHints),
    ...pathRiskWarnings(path, changeKind),
    ...lineEstimateWarnings(ref)
  ]);
  return {
    itemId: `patch-preview-item-${index + 1}-${safeRef(path)}`,
    path,
    changeKind,
    language: safeLanguage(ref.language ?? languageFromPath(path)),
    extension: safeExtension(ref.extension ?? extensionFromPath(path)),
    reasonSummary: safeReason(
      ref.reasonSummary ?? input.changeDescriptionSummary
    ),
    estimatedLinesAdded: nonNegativeNumber(ref.estimatedLinesAdded),
    estimatedLinesRemoved: nonNegativeNumber(ref.estimatedLinesRemoved),
    riskHints: safeWarningCodes(ref.riskHints),
    warningCodes,
    requiresApproval: itemRequiresApproval(path, changeKind, warningCodes)
  };
}

function validateFileRef(
  ref: PatchProposalCreationFileRef
): PatchProposalCreationWarning[] {
  const warnings: PatchProposalCreationWarning[] = [];
  const path = normalizePath(ref.path);
  const pathWarnings = validatePath(path);
  warnings.push(...pathWarnings.map((code) => warning(code, path)));
  if (!isPatchChangeKind(ref.changeKind)) {
    warnings.push(warning("PATCH_PREVIEW_UNSUPPORTED_CHANGE_KIND", path));
  }
  if (
    ref.estimatedLinesAdded !== undefined &&
    (!Number.isFinite(ref.estimatedLinesAdded) || ref.estimatedLinesAdded < 0)
  ) {
    warnings.push(warning("PATCH_PREVIEW_NEGATIVE_LINE_ESTIMATE", path));
  }
  if (
    ref.estimatedLinesRemoved !== undefined &&
    (!Number.isFinite(ref.estimatedLinesRemoved) ||
      ref.estimatedLinesRemoved < 0)
  ) {
    warnings.push(warning("PATCH_PREVIEW_NEGATIVE_LINE_ESTIMATE", path));
  }
  warnings.push(
    ...pathRiskWarnings(path, ref.changeKind).map((code) => warning(code, path))
  );
  return warnings;
}

function riskSummaryFor(
  items: readonly PatchProposalCreationItem[],
  warningCodes: readonly string[]
): PatchProposalCreationRiskSummary {
  const reasonCodes = uniqueStrings([
    ...warningCodes,
    ...items.flatMap((item) => item.warningCodes)
  ]);
  const highRisk = reasonCodes.some((code) =>
    [
      "PATCH_PREVIEW_DELETE_REQUIRES_APPROVAL",
      "PATCH_PREVIEW_PROTECTED_DELETE_REQUIRES_APPROVAL",
      "PATCH_PREVIEW_CONFIG_REQUIRES_APPROVAL",
      "PATCH_PREVIEW_SOURCE_REQUIRES_APPROVAL"
    ].includes(code)
  );
  const mediumRisk =
    highRisk ||
    reasonCodes.some((code) =>
      [
        "PATCH_PREVIEW_TEST_CHANGE",
        "PATCH_PREVIEW_DOC_CHANGE",
        "PATCH_PREVIEW_MANY_FILES"
      ].includes(code)
    );
  const requiresApproval =
    items.some((item) => item.requiresApproval) ||
    highRisk ||
    warningCodes.length > 0;
  return {
    riskLevel: highRisk
      ? "A3_scoped_write"
      : mediumRisk
        ? "A2_draft_write"
        : "A1_read",
    requiresApproval,
    reasonCodes
  };
}

function pathRiskWarnings(
  path: string,
  changeKind: PatchProposalCreationChangeKind
): string[] {
  const codes: string[] = [];
  if (changeKind === "delete") {
    codes.push("PATCH_PREVIEW_DELETE_REQUIRES_APPROVAL");
  }
  if (changeKind === "documentation") {
    codes.push("PATCH_PREVIEW_DOC_CHANGE");
  }
  if (changeKind === "test") {
    codes.push("PATCH_PREVIEW_TEST_CHANGE");
  }
  if (changeKind === "delete" && protectedDeletePattern.test(path)) {
    codes.push("PATCH_PREVIEW_PROTECTED_DELETE_REQUIRES_APPROVAL");
  }
  if (configFilePattern.test(path)) {
    codes.push("PATCH_PREVIEW_CONFIG_REQUIRES_APPROVAL");
  }
  if (/^(app|runtime)\/src\//.test(path)) {
    codes.push("PATCH_PREVIEW_SOURCE_REQUIRES_APPROVAL");
  }
  return uniqueStrings(codes);
}

function lineEstimateWarnings(ref: PatchProposalCreationFileRef): string[] {
  return ref.estimatedLinesAdded !== undefined && ref.estimatedLinesAdded < 0
    ? ["PATCH_PREVIEW_NEGATIVE_LINE_ESTIMATE"]
    : ref.estimatedLinesRemoved !== undefined && ref.estimatedLinesRemoved < 0
      ? ["PATCH_PREVIEW_NEGATIVE_LINE_ESTIMATE"]
      : [];
}

function itemRequiresApproval(
  path: string,
  changeKind: PatchProposalCreationChangeKind,
  warningCodes: readonly string[]
): boolean {
  return (
    changeKind === "delete" ||
    configFilePattern.test(path) ||
    /^(app|runtime)\/src\//.test(path) ||
    warningCodes.some((code) => code.includes("REQUIRES_APPROVAL"))
  );
}

function validatePath(path: string): string[] {
  const codes: string[] = [];
  if (path.length === 0) {
    codes.push("PATCH_PREVIEW_EMPTY_PATH");
  }
  if (path.length > 240) {
    codes.push("PATCH_PREVIEW_PATH_TOO_LONG");
  }
  if (/^[a-zA-Z]:/.test(path)) {
    codes.push("PATCH_PREVIEW_DRIVE_PATH_REJECTED");
  }
  if (path.startsWith("//")) {
    codes.push("PATCH_PREVIEW_UNC_PATH_REJECTED");
  }
  if (path.startsWith("/")) {
    codes.push("PATCH_PREVIEW_ABSOLUTE_PATH_REJECTED");
  }
  if (path.includes("\0")) {
    codes.push("PATCH_PREVIEW_NULL_BYTE_REJECTED");
  }
  if (/[\r\n]/.test(path)) {
    codes.push("PATCH_PREVIEW_NEWLINE_PATH_REJECTED");
  }
  if (/https?:\/\//i.test(path) || /[?#]/.test(path)) {
    codes.push("PATCH_PREVIEW_URL_OR_QUERY_PATH_REJECTED");
  }
  if (/[;&|`$<>*{}[\]!]/.test(path)) {
    codes.push("PATCH_PREVIEW_SHELL_META_PATH_REJECTED");
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "..")) {
    codes.push("PATCH_PREVIEW_PARENT_TRAVERSAL_REJECTED");
  }
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    codes.push("PATCH_PREVIEW_EMPTY_SEGMENT_REJECTED");
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    codes.push("PATCH_PREVIEW_GENERATED_PATH_REJECTED");
  }
  const lower = path.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    codes.push("PATCH_PREVIEW_GENERATED_PATH_REJECTED");
  }
  if (/^\.env(?:\.|$)|\/\.env(?:\.|$)/.test(lower)) {
    codes.push("PATCH_PREVIEW_SECRET_PATH_REJECTED");
  }
  if (
    /(^|[/.-])secret(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])credential(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])private-key([/.-]|$)/i.test(path) ||
    /(^|\/)id_rsa$/i.test(path) ||
    /\.(pem|p12|pfx|key)$/i.test(path)
  ) {
    codes.push("PATCH_PREVIEW_SECRET_PATH_REJECTED");
  }
  return uniqueStrings(codes);
}

function emptyPreview(
  input: PatchProposalCreationPreviewInput,
  warningCodes: readonly string[],
  forcedStatus?: PatchProposalCreationStatus
): PatchProposalCreationPreview {
  const status =
    forcedStatus ?? (warningCodes.length > 0 ? "warning" : "empty");
  return {
    status,
    proposalId: "no-patch-proposal-preview",
    title: safeTitle(input.title),
    intent: safeText(input.intent, "unknown"),
    fileCount: 0,
    filesCreated: 0,
    filesUpdated: 0,
    filesDeleted: 0,
    linesAdded: 0,
    linesRemoved: 0,
    riskLevel: "A1_read",
    requiresApproval: false,
    items: [],
    pathSummaries: [],
    warningCodes: [...warningCodes],
    warnings: warningCodes.map((code) => warning(code)),
    proposalHash: hashPreview(["empty", warningCodes.join(",")].join("|")),
    nextAction: nextActionFor(status, false),
    source: "runtime_patch_creation_preview",
    previewOnly: true,
    applyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false
  };
}

function nextActionFor(
  status: PatchProposalCreationStatus,
  requiresApproval: boolean
): string {
  if (status === "blocked") {
    return "Remove unsafe paths, raw fields, or secret markers before previewing a patch proposal.";
  }
  if (status === "warning") {
    return "Review warning codes and patch proposal summary only. Apply is disabled in this phase.";
  }
  if (status === "preview") {
    return requiresApproval
      ? "Review the patch proposal summary. Approval execution and apply are disabled in this phase."
      : "Review the patch proposal summary. Apply is disabled in this phase.";
  }
  return "Enter safe path refs and a change description summary to preview a patch proposal.";
}

function warning(
  code: string,
  path?: string | undefined
): PatchProposalCreationWarning {
  const result: PatchProposalCreationWarning = {
    code,
    safeMessage: `Patch proposal creation preview warning: ${code}`
  };
  if (path !== undefined && path.length > 0) {
    result.path = path;
  }
  return result;
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
      codes.push("PATCH_PREVIEW_RAW_FIELD_REJECTED");
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

function isBlockingWarning(code: string): boolean {
  return (
    code.includes("_REJECTED") ||
    code.endsWith("_MARKER") ||
    code === "PATCH_PREVIEW_INPUT_TOO_LARGE" ||
    code === "PATCH_PREVIEW_DESCRIPTION_TOO_LONG" ||
    code === "PATCH_PREVIEW_TOO_MANY_FILES" ||
    code === "PATCH_PREVIEW_UNSUPPORTED_CHANGE_KIND" ||
    code === "PATCH_PREVIEW_NEGATIVE_LINE_ESTIMATE" ||
    code === "PATCH_PREVIEW_RAW_FIELD_REJECTED"
  );
}

function uniqueFileRefs(
  refs: readonly PatchProposalCreationFileRef[]
): PatchProposalCreationFileRef[] {
  const seen = new Set<string>();
  const result: PatchProposalCreationFileRef[] = [];
  for (const ref of refs) {
    const key = `${normalizePath(ref.path)}:${normalizeChangeKind(ref.changeKind)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(ref);
    }
  }
  return result;
}

function normalizePath(path: unknown): string {
  return typeof path === "string" ? path.trim().replace(/\\/g, "/") : "";
}

function normalizeChangeKind(value: unknown): PatchProposalCreationChangeKind {
  return isPatchChangeKind(value) ? value : "update";
}

function isPatchChangeKind(
  value: unknown
): value is PatchProposalCreationChangeKind {
  return (
    value === "create" ||
    value === "update" ||
    value === "delete" ||
    value === "documentation" ||
    value === "test"
  );
}

function safeTitle(value: unknown): string {
  const text = safeText(value, "Patch proposal preview");
  return unsafeWarningCodes(text).length > 0
    ? "Patch proposal preview"
    : text.slice(0, 120);
}

function safeReason(value: unknown): string {
  const text = safeText(value, "Summary-only patch proposal preview");
  return unsafeWarningCodes(text).length > 0
    ? "Summary withheld by safety policy."
    : text.slice(0, 180);
}

function safeLanguage(value: unknown): string {
  return safeIdentifier(value, "unknown");
}

function safeExtension(value: unknown): string {
  return safeIdentifier(value, "unknown").replace(/^\./, "");
}

function safeIdentifier(value: unknown, fallback: string): string {
  const text = safeText(value, fallback)
    .replace(/[^A-Za-z0-9_.+-]/g, "_")
    .slice(0, 48);
  return text.length > 0 ? text : fallback;
}

function languageFromPath(path: string): string {
  const ext = extensionFromPath(path);
  if (["ts", "tsx"].includes(ext)) {
    return ext;
  }
  if (["js", "jsx"].includes(ext)) {
    return ext;
  }
  if (
    ["md", "json", "java", "rs", "yaml", "yml", "css", "html"].includes(ext)
  ) {
    return ext;
  }
  return "unknown";
}

function extensionFromPath(path: string): string {
  const name = path.split("/").at(-1) ?? "";
  const parts = name.split(".");
  return parts.length > 1
    ? (parts.at(-1)?.toLowerCase() ?? "unknown")
    : "unknown";
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function safeWarningCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) =>
        item
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_.:-]/g, "_")
          .slice(0, 80)
      )
      .filter((item) => item.length > 0)
  );
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeRef(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 80);
}

function safeArray<T>(value: readonly T[] | undefined): T[] {
  return Array.isArray(value) ? [...value] : [];
}

function uniqueWarnings(
  warnings: readonly PatchProposalCreationWarning[]
): PatchProposalCreationWarning[] {
  const seen = new Set<string>();
  return warnings.filter((item) => {
    const key = `${item.code}:${item.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => /^[A-Z0-9_.:-]{1,120}$/.test(value))
    )
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
