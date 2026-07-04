import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type FileDialogActionProposalInput =
  | Record<string, unknown>
  | string
  | unknown;

export type FileDialogActionProposalKind =
  | "file_dialog_open"
  | "file_dialog_save"
  | "file_dialog_select_directory"
  | "file_dialog_cancel";

export type FileDialogPathRefSummary = {
  refId: string;
  summary: string;
  safeRelativePathRef?: string | undefined;
  hashPrefix?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type FileDialogActionProposalFindingKind =
  | "schema"
  | "file_dialog"
  | "path_safety"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "readiness";

export type FileDialogActionProposalSeverity = "blocker" | "warning";

export type FileDialogActionProposalFinding = {
  findingId: string;
  kind: FileDialogActionProposalFindingKind;
  severity: FileDialogActionProposalSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type FileDialogActionProposalReadiness = {
  canEnterRiskClassification: boolean;
  canEnterSimulation: boolean;
  canOpenFileDialog: false;
  canSelectFile: false;
  canSaveFile: false;
  canSelectDirectory: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type FileDialogActionProposal = {
  schemaVersion: "file_dialog_action_proposal.v1";
  proposalId: string;
  proposalKind: FileDialogActionProposalKind;
  objectiveSummary: string;
  dialogIntent: string;
  allowedExtensions: string[];
  pathRefSummary?: FileDialogPathRefSummary | undefined;
  directoryRefSummary?: FileDialogPathRefSummary | undefined;
  expectedFileCount?: number | undefined;
  riskSummary: string;
  riskNotes: string[];
  createdAt: string;
  proposalHash: string;
  source: "runtime_file_dialog_action_proposal";
};

export type FileDialogActionProposalStatus = "parsed" | "warning" | "blocked";

export type FileDialogActionProposalSummary = {
  status: FileDialogActionProposalStatus;
  proposalId?: string | undefined;
  proposalKind?: FileDialogActionProposalKind | undefined;
  objectiveSummary?: string | undefined;
  dialogIntent?: string | undefined;
  allowedExtensionCount: number;
  pathRefId?: string | undefined;
  directoryRefId?: string | undefined;
  expectedFileCount?: number | undefined;
  riskSummary?: string | undefined;
  warningCodes: string[];
  blockerCodes: string[];
  proposalHash?: string | undefined;
  summaryOnly: true;
};

export type FileDialogActionProposalValidationResult = {
  status: FileDialogActionProposalStatus;
  proposal?: FileDialogActionProposal | undefined;
  summary: FileDialogActionProposalSummary;
  findings: FileDialogActionProposalFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  proposalHash?: string | undefined;
  readiness: FileDialogActionProposalReadiness;
  nextAction: string;
  source: "runtime_file_dialog_action_proposal";
};

const proposalKinds = new Set<FileDialogActionProposalKind>([
  "file_dialog_open",
  "file_dialog_save",
  "file_dialog_select_directory",
  "file_dialog_cancel"
]);

const forbiddenFieldKeys = new Set(
  [
    "rawPath",
    "rawFilePath",
    "rawDirectoryPath",
    "absolutePath",
    "selectedPath",
    "selectedFilePath",
    "filePath",
    "directoryPath",
    "fileContent",
    "beforeContent",
    "afterContent",
    "apiKey",
    "Authorization",
    "bearer",
    "token",
    "password",
    "secret",
    "autoSelect",
    "clickNow",
    "typePathNow",
    "openDialogNow",
    "saveNow",
    "selectNow",
    "nativeBridge",
    "eventStoreWrite",
    "shellCommand",
    "gitCommand"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "autoSelect",
    "clickNow",
    "typePathNow",
    "openDialogNow",
    "saveNow",
    "selectNow",
    "canOpenFileDialog",
    "canSelectFile",
    "canSaveFile",
    "canSelectDirectory",
    "canWriteFilesystem",
    "canWriteEventStore",
    "canUseNativeBridge",
    "appCanExecute"
  ].map((key) => key.toLowerCase())
);

const secretMarkers = [
  "sk-",
  "Bearer ",
  "Authorization",
  "BEGIN PRIVATE KEY",
  "PASSWORD_VALUE_MARKER",
  "DEEPSEEK_API_KEY",
  "OPENAI_API_KEY"
];

const rawPathMarkers = [
  "RAW_PATH",
  "RAW_FILE_PATH",
  "RAW_DIRECTORY_PATH",
  "FILE_CONTENT",
  "ABSOLUTE_PATH"
];

const blockedPathSegments = new Set([
  ".env",
  ".git",
  "node_modules",
  "dist",
  "target",
  ".tmp"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value
    .map((item) => readString(item))
    .filter((item): item is string => Boolean(item));
  return strings.length > 0 ? strings : undefined;
}

function finding(
  kind: FileDialogActionProposalFindingKind,
  severity: FileDialogActionProposalSeverity,
  code: string,
  safeMessage: string,
  path?: string
): FileDialogActionProposalFinding {
  return {
    findingId: stablePreviewHash(
      JSON.stringify({ kind, severity, code, path: path || "" })
    ).slice(0, 16),
    kind,
    severity,
    code,
    safeMessage,
    ...(path ? { path } : {})
  };
}

function readiness(
  canEnterPreview: boolean
): FileDialogActionProposalReadiness {
  return {
    canEnterRiskClassification: canEnterPreview,
    canEnterSimulation: canEnterPreview,
    canOpenFileDialog: false,
    canSelectFile: false,
    canSaveFile: false,
    canSelectDirectory: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function parseInput(input: FileDialogActionProposalInput): {
  record?: Record<string, unknown>;
  findings: FileDialogActionProposalFinding[];
} {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (!isRecord(parsed)) {
        return {
          findings: [
            finding(
              "schema",
              "blocker",
              "JSON_NOT_OBJECT",
              "File dialog proposal JSON must be an object."
            )
          ]
        };
      }
      return { record: parsed, findings: [] };
    } catch {
      return {
        findings: [
          finding(
            "schema",
            "blocker",
            "MALFORMED_JSON",
            "File dialog proposal JSON could not be parsed."
          )
        ]
      };
    }
  }
  if (!isRecord(input)) {
    return {
      findings: [
        finding(
          "schema",
          "blocker",
          "INPUT_NOT_OBJECT",
          "File dialog proposal input must be an object."
        )
      ]
    };
  }
  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: FileDialogActionProposalFinding[]
): void {
  if (typeof value === "string") {
    if (secretMarkers.some((marker) => value.includes(marker))) {
      findings.push(
        finding(
          "secret",
          "blocker",
          "SECRET_MARKER",
          "Secret-like marker is not allowed.",
          path
        )
      );
    }
    if (rawPathMarkers.some((marker) => value.includes(marker))) {
      findings.push(
        finding(
          "file_dialog",
          "blocker",
          "RAW_PATH_MARKER",
          "Raw path markers are not allowed.",
          path
        )
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeFields(item, `${path}[${index}]`, findings)
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const normalizedKey = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalizedKey)) {
      findings.push(
        finding(
          normalizedKey.includes("now") ||
            normalizedKey.includes("select") ||
            normalizedKey.includes("bridge")
            ? "execution_field"
            : normalizedKey.includes("path") ||
                normalizedKey.includes("content")
              ? "raw_field"
              : "secret",
          "blocker",
          "FORBIDDEN_FIELD",
          "Forbidden file dialog, secret, raw, or execution field is not allowed.",
          childPath
        )
      );
    }
    if (executionBooleanKeys.has(normalizedKey) && child === true) {
      findings.push(
        finding(
          "execution_field",
          "blocker",
          "EXECUTION_FLAG_TRUE",
          "File dialog proposal execution flags must remain false.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function isProposalKind(value: unknown): value is FileDialogActionProposalKind {
  return (
    typeof value === "string" &&
    proposalKinds.has(value as FileDialogActionProposalKind)
  );
}

function isSafeRelativePathRef(value: string): boolean {
  const normalized = value.replace(/\\/g, "/").trim();
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.includes("..") ||
    normalized.includes("\0")
  ) {
    return false;
  }
  const segments = normalized
    .split("/")
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
  if (segments.some((segment) => blockedPathSegments.has(segment))) {
    return false;
  }
  return !secretMarkers.some((marker) => normalized.includes(marker));
}

function normalizePathRefSummary(
  value: unknown,
  path: string,
  findings: FileDialogActionProposalFinding[]
): FileDialogPathRefSummary | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const refId = readString(value.refId);
  const summary = readString(value.summary);
  const safeRelativePathRef = readString(value.safeRelativePathRef);
  const hashPrefix = readString(value.hashPrefix);
  const warningCodes = readStringArray(value.warningCodes);

  if (!refId) {
    findings.push(
      finding(
        "file_dialog",
        "blocker",
        "MISSING_PATH_REF_ID",
        "File dialog path ref summary requires a ref id.",
        `${path}.refId`
      )
    );
  }
  if (!summary) {
    findings.push(
      finding(
        "file_dialog",
        "blocker",
        "MISSING_PATH_REF_SUMMARY",
        "File dialog path ref summary requires summary text.",
        `${path}.summary`
      )
    );
  }
  if (safeRelativePathRef && !isSafeRelativePathRef(safeRelativePathRef)) {
    findings.push(
      finding(
        "path_safety",
        "blocker",
        "UNSAFE_FILE_DIALOG_PATH",
        "File dialog path refs must be safe relative refs only.",
        `${path}.safeRelativePathRef`
      )
    );
  }
  if (hashPrefix && !/^[a-f0-9]{6,32}$/i.test(hashPrefix)) {
    findings.push(
      finding(
        "file_dialog",
        "warning",
        "NONSTANDARD_HASH_PREFIX",
        "File dialog path ref hash prefix should be a short hex hash.",
        `${path}.hashPrefix`
      )
    );
  }

  if (
    !refId ||
    !summary ||
    (safeRelativePathRef && !isSafeRelativePathRef(safeRelativePathRef))
  ) {
    return undefined;
  }

  return {
    refId,
    summary,
    ...(safeRelativePathRef ? { safeRelativePathRef } : {}),
    ...(hashPrefix ? { hashPrefix } : {}),
    ...(warningCodes ? { warningCodes } : {})
  };
}

function validateAllowedExtensions(
  value: unknown,
  findings: FileDialogActionProposalFinding[]
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const extensions: string[] = [];
  for (const [index, item] of value.entries()) {
    const extension = readString(item);
    if (!extension) {
      continue;
    }
    if (!/^\.[A-Za-z0-9_-]{1,16}$/.test(extension)) {
      findings.push(
        finding(
          "file_dialog",
          "blocker",
          "UNSAFE_EXTENSION",
          "Allowed file extensions must be short extension refs.",
          `allowedExtensions[${index}]`
        )
      );
      continue;
    }
    extensions.push(extension.toLowerCase());
  }
  return [...new Set(extensions)];
}

function buildSummary(
  status: FileDialogActionProposalStatus,
  proposal: FileDialogActionProposal | undefined,
  findings: FileDialogActionProposalFinding[]
): FileDialogActionProposalSummary {
  return {
    status,
    ...(proposal
      ? {
          proposalId: proposal.proposalId,
          proposalKind: proposal.proposalKind,
          objectiveSummary: proposal.objectiveSummary,
          dialogIntent: proposal.dialogIntent,
          allowedExtensionCount: proposal.allowedExtensions.length,
          ...(proposal.pathRefSummary
            ? { pathRefId: proposal.pathRefSummary.refId }
            : {}),
          ...(proposal.directoryRefSummary
            ? { directoryRefId: proposal.directoryRefSummary.refId }
            : {}),
          ...(proposal.expectedFileCount !== undefined
            ? { expectedFileCount: proposal.expectedFileCount }
            : {}),
          riskSummary: proposal.riskSummary,
          proposalHash: proposal.proposalHash
        }
      : { allowedExtensionCount: 0 }),
    warningCodes: findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    blockerCodes: findings
      .filter((item) => item.severity === "blocker")
      .map((item) => item.code),
    summaryOnly: true
  };
}

function buildResult(
  proposal: FileDialogActionProposal | undefined,
  findings: FileDialogActionProposalFinding[]
): FileDialogActionProposalValidationResult {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: FileDialogActionProposalStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const safeProposal = status === "blocked" ? undefined : proposal;
  return {
    status,
    ...(safeProposal
      ? { proposal: safeProposal, proposalHash: safeProposal.proposalHash }
      : {}),
    summary: buildSummary(status, safeProposal, findings),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(status !== "blocked" && Boolean(safeProposal)),
    nextAction:
      status === "blocked"
        ? "Fix blocked file dialog proposal fields before preview."
        : "Proceed to file dialog risk classification and simulation preview.",
    source: "runtime_file_dialog_action_proposal"
  };
}

export function validateFileDialogActionProposal(
  input: FileDialogActionProposalInput
): FileDialogActionProposalValidationResult {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  if (!parsed.record) {
    return buildResult(undefined, findings);
  }

  scanUnsafeFields(parsed.record, "", findings);

  const schemaVersion = readString(parsed.record.schemaVersion);
  if (schemaVersion && schemaVersion !== "file_dialog_action_proposal.v1") {
    findings.push(
      finding(
        "schema",
        "blocker",
        "UNSUPPORTED_SCHEMA_VERSION",
        "Unsupported file dialog proposal schema version.",
        "schemaVersion"
      )
    );
  }

  const proposalId = readString(parsed.record.proposalId);
  const proposalKind = readString(parsed.record.proposalKind);
  const objectiveSummary = readString(parsed.record.objectiveSummary);
  const dialogIntent = readString(parsed.record.dialogIntent);
  const riskSummary = readString(parsed.record.riskSummary);
  const createdAt = readString(parsed.record.createdAt);
  const riskNotes = readStringArray(parsed.record.riskNotes);
  const expectedFileCount = readNumber(parsed.record.expectedFileCount);
  const allowedExtensions = validateAllowedExtensions(
    parsed.record.allowedExtensions,
    findings
  );
  const pathRefSummary = normalizePathRefSummary(
    parsed.record.pathRefSummary,
    "pathRefSummary",
    findings
  );
  const directoryRefSummary = normalizePathRefSummary(
    parsed.record.directoryRefSummary,
    "directoryRefSummary",
    findings
  );

  if (!proposalId) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_PROPOSAL_ID",
        "File dialog proposal id is required.",
        "proposalId"
      )
    );
  }
  if (!isProposalKind(proposalKind)) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "UNKNOWN_FILE_DIALOG_PROPOSAL_KIND",
        "File dialog proposal kind is not supported.",
        "proposalKind"
      )
    );
  }
  if (!objectiveSummary) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_OBJECTIVE_SUMMARY",
        "Objective summary is required.",
        "objectiveSummary"
      )
    );
  }
  if (!dialogIntent) {
    findings.push(
      finding(
        "file_dialog",
        "blocker",
        "MISSING_DIALOG_INTENT",
        "File dialog proposal requires dialog intent summary.",
        "dialogIntent"
      )
    );
  }
  if (!riskSummary) {
    findings.push(
      finding(
        "file_dialog",
        "blocker",
        "MISSING_RISK_SUMMARY",
        "File dialog proposal requires a risk summary.",
        "riskSummary"
      )
    );
  }
  if (!createdAt) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_CREATED_AT",
        "Created timestamp is required.",
        "createdAt"
      )
    );
  }
  if (!riskNotes || riskNotes.length === 0) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_RISK_NOTES",
        "File dialog proposal risk notes are required.",
        "riskNotes"
      )
    );
  }
  if (expectedFileCount !== undefined && expectedFileCount < 0) {
    findings.push(
      finding(
        "file_dialog",
        "blocker",
        "INVALID_EXPECTED_FILE_COUNT",
        "Expected file count must be non-negative.",
        "expectedFileCount"
      )
    );
  }

  if (proposalKind === "file_dialog_open" && !pathRefSummary) {
    findings.push(
      finding(
        "file_dialog",
        "warning",
        "MISSING_OPEN_PATH_REF",
        "Open file dialog proposal should include a path ref summary when known.",
        "pathRefSummary"
      )
    );
  }
  if (proposalKind === "file_dialog_save" && !pathRefSummary) {
    findings.push(
      finding(
        "file_dialog",
        "warning",
        "MISSING_SAVE_PATH_REF",
        "Save file dialog proposal should include a destination path ref summary when known.",
        "pathRefSummary"
      )
    );
  }
  if (proposalKind === "file_dialog_select_directory" && !directoryRefSummary) {
    findings.push(
      finding(
        "file_dialog",
        "warning",
        "MISSING_DIRECTORY_REF",
        "Directory selection proposal should include a directory ref summary when known.",
        "directoryRefSummary"
      )
    );
  }
  if (proposalKind && isProposalKind(proposalKind)) {
    findings.push(
      finding(
        "file_dialog",
        "warning",
        "FILE_DIALOG_PROPOSAL_ONLY",
        "File dialog actions remain proposal-only.",
        "proposalKind"
      )
    );
  }

  if (
    !proposalId ||
    !isProposalKind(proposalKind) ||
    !objectiveSummary ||
    !dialogIntent ||
    !riskSummary ||
    !createdAt ||
    !riskNotes ||
    (expectedFileCount !== undefined && expectedFileCount < 0)
  ) {
    return buildResult(undefined, findings);
  }

  const proposalCore = {
    schemaVersion: "file_dialog_action_proposal.v1" as const,
    proposalId,
    proposalKind,
    objectiveSummary,
    dialogIntent,
    allowedExtensions,
    ...(pathRefSummary ? { pathRefSummary } : {}),
    ...(directoryRefSummary ? { directoryRefSummary } : {}),
    ...(expectedFileCount !== undefined ? { expectedFileCount } : {}),
    riskSummary,
    riskNotes,
    createdAt,
    source: "runtime_file_dialog_action_proposal" as const
  };
  const proposal: FileDialogActionProposal = {
    ...proposalCore,
    proposalHash: stablePreviewHash(JSON.stringify(proposalCore))
  };
  return buildResult(proposal, findings);
}

export function parseFileDialogActionProposal(
  input: FileDialogActionProposalInput
): FileDialogActionProposalValidationResult {
  return validateFileDialogActionProposal(input);
}

export function summarizeFileDialogActionProposal(
  proposal: FileDialogActionProposal
): FileDialogActionProposalSummary {
  return buildSummary("parsed", proposal, []);
}
