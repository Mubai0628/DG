import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ClipboardActionProposalInput =
  | Record<string, unknown>
  | string
  | unknown;

export type ClipboardActionProposalKind =
  | "clipboard_write"
  | "clipboard_clear"
  | "clipboard_paste_request";

export type ClipboardContentCategory =
  | "plain_text"
  | "code"
  | "path_ref"
  | "url"
  | "structured_data"
  | "unknown";

export type ClipboardContentSummary = {
  lengthEstimate?: number | undefined;
  hashPrefix?: string | undefined;
  contentCategory: ClipboardContentCategory;
  redactionStatus: "summary_only" | "redacted" | "not_provided";
  userVisibleSummary: string;
};

export type ClipboardActionProposalFindingKind =
  | "schema"
  | "clipboard"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "readiness";

export type ClipboardActionProposalSeverity = "blocker" | "warning";

export type ClipboardActionProposalFinding = {
  findingId: string;
  kind: ClipboardActionProposalFindingKind;
  severity: ClipboardActionProposalSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ClipboardActionProposalReadiness = {
  canEnterRiskClassification: boolean;
  canEnterSimulation: boolean;
  canWriteClipboard: false;
  canPasteClipboard: false;
  canClearClipboard: false;
  canReadClipboard: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type ClipboardActionProposal = {
  schemaVersion: "clipboard_action_proposal.v1";
  proposalId: string;
  proposalKind: ClipboardActionProposalKind;
  objectiveSummary: string;
  contentSummary?: ClipboardContentSummary | undefined;
  targetSummary?: string | undefined;
  riskNotes: string[];
  createdAt: string;
  proposalHash: string;
  source: "runtime_clipboard_action_proposal";
};

export type ClipboardActionProposalStatus = "parsed" | "warning" | "blocked";

export type ClipboardActionProposalSummary = {
  status: ClipboardActionProposalStatus;
  proposalId?: string | undefined;
  proposalKind?: ClipboardActionProposalKind | undefined;
  objectiveSummary?: string | undefined;
  contentCategory?: ClipboardContentCategory | undefined;
  lengthEstimate?: number | undefined;
  hashPrefix?: string | undefined;
  redactionStatus?: ClipboardContentSummary["redactionStatus"] | undefined;
  warningCodes: string[];
  blockerCodes: string[];
  proposalHash?: string | undefined;
  summaryOnly: true;
};

export type ClipboardActionProposalValidationResult = {
  status: ClipboardActionProposalStatus;
  proposal?: ClipboardActionProposal | undefined;
  summary: ClipboardActionProposalSummary;
  findings: ClipboardActionProposalFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  proposalHash?: string | undefined;
  readiness: ClipboardActionProposalReadiness;
  nextAction: string;
  source: "runtime_clipboard_action_proposal";
};

const proposalKinds = new Set<ClipboardActionProposalKind>([
  "clipboard_write",
  "clipboard_clear",
  "clipboard_paste_request"
]);

const contentCategories = new Set<ClipboardContentCategory>([
  "plain_text",
  "code",
  "path_ref",
  "url",
  "structured_data",
  "unknown"
]);

const redactionStatuses = new Set<ClipboardContentSummary["redactionStatus"]>([
  "summary_only",
  "redacted",
  "not_provided"
]);

const forbiddenFieldKeys = new Set(
  [
    "rawClipboardText",
    "clipboardText",
    "clipboardValue",
    "clipboardContent",
    "rawText",
    "copiedSecret",
    "fileContent",
    "commandContent",
    "pasteNow",
    "writeNow",
    "clearNow",
    "apiKey",
    "Authorization",
    "bearer",
    "token",
    "password",
    "secret"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "pasteNow",
    "writeNow",
    "clearNow",
    "canWriteClipboard",
    "canPasteClipboard",
    "canClearClipboard",
    "canReadClipboard",
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

const rawClipboardMarkers = [
  "RAW_CLIPBOARD",
  "CLIPBOARD_CONTENT",
  "PASSWORD_VALUE_MARKER"
];

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
  kind: ClipboardActionProposalFindingKind,
  severity: ClipboardActionProposalSeverity,
  code: string,
  safeMessage: string,
  path?: string
): ClipboardActionProposalFinding {
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

function readiness(canEnterPreview: boolean): ClipboardActionProposalReadiness {
  return {
    canEnterRiskClassification: canEnterPreview,
    canEnterSimulation: canEnterPreview,
    canWriteClipboard: false,
    canPasteClipboard: false,
    canClearClipboard: false,
    canReadClipboard: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function parseInput(input: ClipboardActionProposalInput): {
  record?: Record<string, unknown>;
  findings: ClipboardActionProposalFinding[];
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
              "Clipboard action proposal JSON must be an object."
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
            "Clipboard action proposal JSON could not be parsed."
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
          "Clipboard action proposal input must be an object."
        )
      ]
    };
  }
  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: ClipboardActionProposalFinding[]
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
    if (rawClipboardMarkers.some((marker) => value.includes(marker))) {
      findings.push(
        finding(
          "clipboard",
          "blocker",
          "RAW_CLIPBOARD_MARKER",
          "Raw clipboard markers are not allowed.",
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
          normalizedKey.includes("paste") ||
            normalizedKey.includes("write") ||
            normalizedKey.includes("clear")
            ? "execution_field"
            : normalizedKey.includes("clipboard")
              ? "clipboard"
              : "raw_field",
          "blocker",
          "FORBIDDEN_FIELD",
          "Forbidden clipboard, secret, raw, or execution field is not allowed.",
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
          "Clipboard proposal execution flags must remain false.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function isProposalKind(value: unknown): value is ClipboardActionProposalKind {
  return (
    typeof value === "string" &&
    proposalKinds.has(value as ClipboardActionProposalKind)
  );
}

function normalizeContentSummary(
  value: unknown,
  findings: ClipboardActionProposalFinding[]
): ClipboardContentSummary | undefined {
  if (!isRecord(value)) {
    findings.push(
      finding(
        "clipboard",
        "blocker",
        "MISSING_CONTENT_SUMMARY",
        "Clipboard write or paste request proposals require content summary metadata.",
        "contentSummary"
      )
    );
    return undefined;
  }

  const contentCategory = readString(value.contentCategory);
  const redactionStatus = readString(value.redactionStatus);
  const userVisibleSummary = readString(value.userVisibleSummary);
  const lengthEstimate = readNumber(value.lengthEstimate);
  const hashPrefix = readString(value.hashPrefix);

  if (!contentCategories.has(contentCategory as ClipboardContentCategory)) {
    findings.push(
      finding(
        "clipboard",
        "blocker",
        "UNKNOWN_CONTENT_CATEGORY",
        "Clipboard content category is not supported.",
        "contentSummary.contentCategory"
      )
    );
  }
  if (
    !redactionStatuses.has(
      redactionStatus as ClipboardContentSummary["redactionStatus"]
    )
  ) {
    findings.push(
      finding(
        "clipboard",
        "blocker",
        "UNKNOWN_REDACTION_STATUS",
        "Clipboard redaction status is not supported.",
        "contentSummary.redactionStatus"
      )
    );
  }
  if (!userVisibleSummary) {
    findings.push(
      finding(
        "clipboard",
        "blocker",
        "MISSING_USER_VISIBLE_SUMMARY",
        "Clipboard proposal requires a user-visible summary.",
        "contentSummary.userVisibleSummary"
      )
    );
  }
  if (lengthEstimate !== undefined && lengthEstimate < 0) {
    findings.push(
      finding(
        "clipboard",
        "blocker",
        "INVALID_LENGTH_ESTIMATE",
        "Clipboard length estimate must be non-negative.",
        "contentSummary.lengthEstimate"
      )
    );
  }
  if (hashPrefix && !/^[a-f0-9]{6,32}$/i.test(hashPrefix)) {
    findings.push(
      finding(
        "clipboard",
        "warning",
        "NONSTANDARD_HASH_PREFIX",
        "Clipboard hash prefix should be a short hex hash.",
        "contentSummary.hashPrefix"
      )
    );
  }

  if (
    !contentCategories.has(contentCategory as ClipboardContentCategory) ||
    !redactionStatuses.has(
      redactionStatus as ClipboardContentSummary["redactionStatus"]
    ) ||
    !userVisibleSummary
  ) {
    return undefined;
  }

  return {
    ...(lengthEstimate !== undefined ? { lengthEstimate } : {}),
    ...(hashPrefix ? { hashPrefix } : {}),
    contentCategory: contentCategory as ClipboardContentCategory,
    redactionStatus:
      redactionStatus as ClipboardContentSummary["redactionStatus"],
    userVisibleSummary
  };
}

function buildSummary(
  status: ClipboardActionProposalStatus,
  proposal: ClipboardActionProposal | undefined,
  findings: ClipboardActionProposalFinding[]
): ClipboardActionProposalSummary {
  return {
    status,
    ...(proposal
      ? {
          proposalId: proposal.proposalId,
          proposalKind: proposal.proposalKind,
          objectiveSummary: proposal.objectiveSummary,
          ...(proposal.contentSummary
            ? {
                contentCategory: proposal.contentSummary.contentCategory,
                ...(proposal.contentSummary.lengthEstimate !== undefined
                  ? { lengthEstimate: proposal.contentSummary.lengthEstimate }
                  : {}),
                ...(proposal.contentSummary.hashPrefix
                  ? { hashPrefix: proposal.contentSummary.hashPrefix }
                  : {}),
                redactionStatus: proposal.contentSummary.redactionStatus
              }
            : {}),
          proposalHash: proposal.proposalHash
        }
      : {}),
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
  proposal: ClipboardActionProposal | undefined,
  findings: ClipboardActionProposalFinding[]
): ClipboardActionProposalValidationResult {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: ClipboardActionProposalStatus =
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
        ? "Fix blocked clipboard proposal fields before preview."
        : "Proceed to clipboard risk classification and simulation preview.",
    source: "runtime_clipboard_action_proposal"
  };
}

export function validateClipboardActionProposal(
  input: ClipboardActionProposalInput
): ClipboardActionProposalValidationResult {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  if (!parsed.record) {
    return buildResult(undefined, findings);
  }

  scanUnsafeFields(parsed.record, "", findings);

  const schemaVersion = readString(parsed.record.schemaVersion);
  if (schemaVersion && schemaVersion !== "clipboard_action_proposal.v1") {
    findings.push(
      finding(
        "schema",
        "blocker",
        "UNSUPPORTED_SCHEMA_VERSION",
        "Unsupported clipboard action proposal schema version.",
        "schemaVersion"
      )
    );
  }

  const proposalId = readString(parsed.record.proposalId);
  const proposalKind = readString(parsed.record.proposalKind);
  const objectiveSummary = readString(parsed.record.objectiveSummary);
  const createdAt = readString(parsed.record.createdAt);
  const riskNotes = readStringArray(parsed.record.riskNotes);

  if (!proposalId) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_PROPOSAL_ID",
        "Clipboard proposal id is required.",
        "proposalId"
      )
    );
  }
  if (!isProposalKind(proposalKind)) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "UNKNOWN_CLIPBOARD_PROPOSAL_KIND",
        "Clipboard proposal kind is not supported.",
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
        "Clipboard proposal risk notes are required.",
        "riskNotes"
      )
    );
  }

  const contentSummary =
    proposalKind === "clipboard_write" ||
    proposalKind === "clipboard_paste_request"
      ? normalizeContentSummary(parsed.record.contentSummary, findings)
      : undefined;

  if (proposalKind === "clipboard_write") {
    findings.push(
      finding(
        "clipboard",
        "warning",
        "CLIPBOARD_WRITE_PROPOSAL_ONLY",
        "Clipboard write remains proposal-only.",
        "proposalKind"
      )
    );
  }
  if (proposalKind === "clipboard_clear") {
    findings.push(
      finding(
        "clipboard",
        "warning",
        "CLIPBOARD_CLEAR_PROPOSAL_ONLY",
        "Clipboard clear remains proposal-only.",
        "proposalKind"
      )
    );
  }
  if (proposalKind === "clipboard_paste_request") {
    findings.push(
      finding(
        "clipboard",
        "warning",
        "CLIPBOARD_PASTE_REQUEST_PROPOSAL_ONLY",
        "Clipboard paste request remains proposal-only.",
        "proposalKind"
      )
    );
  }

  if (
    !proposalId ||
    !isProposalKind(proposalKind) ||
    !objectiveSummary ||
    !createdAt ||
    !riskNotes ||
    ((proposalKind === "clipboard_write" ||
      proposalKind === "clipboard_paste_request") &&
      !contentSummary)
  ) {
    return buildResult(undefined, findings);
  }

  const proposalCore = {
    schemaVersion: "clipboard_action_proposal.v1" as const,
    proposalId,
    proposalKind,
    objectiveSummary,
    ...(contentSummary ? { contentSummary } : {}),
    ...(readString(parsed.record.targetSummary)
      ? { targetSummary: readString(parsed.record.targetSummary) }
      : {}),
    riskNotes,
    createdAt,
    source: "runtime_clipboard_action_proposal" as const
  };
  const proposal: ClipboardActionProposal = {
    ...proposalCore,
    proposalHash: stablePreviewHash(JSON.stringify(proposalCore))
  };
  return buildResult(proposal, findings);
}

export function parseClipboardActionProposal(
  input: ClipboardActionProposalInput
): ClipboardActionProposalValidationResult {
  return validateClipboardActionProposal(input);
}

export function summarizeClipboardActionProposal(
  proposal: ClipboardActionProposal
): ClipboardActionProposalSummary {
  return buildSummary("parsed", proposal, []);
}
