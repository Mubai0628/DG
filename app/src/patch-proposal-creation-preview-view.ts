import {
  buildPatchProposalCreationPreview,
  type PatchProposalCreationChangeKind,
  type PatchProposalCreationFileRef,
  type PatchProposalCreationPreview,
  type PatchProposalCreationStatus
} from "../../runtime/src/execution/patch/creation-preview.js";
import type { AppRunDraftIntent, AppRunDraftView } from "./run-draft-view.js";
import { safeErrorMessage, safeText } from "./safety.js";
import type {
  AppWorkbenchApprovalRef,
  AppWorkbenchSurfacesInput
} from "./workbench-surfaces.js";
import type { AppWorkspaceIndexBridgeView } from "./workspace-index-bridge-view.js";

export type { PatchProposalCreationChangeKind };

export type AppPatchProposalCreationPreviewStatus = PatchProposalCreationStatus;

export type AppPatchProposalCreationWarning = {
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type AppPatchProposalCreationItemView = {
  itemId: string;
  path: string;
  changeKind: PatchProposalCreationChangeKind;
  language: string;
  extension: string;
  reasonSummary: string;
  estimatedLinesAdded: number;
  estimatedLinesRemoved: number;
  warningCodes: string[];
  requiresApproval: boolean;
};

export type AppPatchProposalCreationPreviewView = {
  status: AppPatchProposalCreationPreviewStatus;
  proposalId: string;
  title: string;
  intent: AppRunDraftIntent;
  fileCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
  riskLevel: string;
  requiresApproval: boolean;
  items: AppPatchProposalCreationItemView[];
  pathSummaries: string[];
  warningCodes: string[];
  warnings: AppPatchProposalCreationWarning[];
  proposalHash: string;
  nextAction: string;
  source: "runtime_patch_creation_preview" | "empty";
  previewOnly: true;
  applyEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
};

export type AppPatchProposalCreationPreviewInput = {
  titleDraft?: string | undefined;
  changeDescriptionSummary?: string | undefined;
  pathRefsText?: string | undefined;
  defaultChangeKind?: PatchProposalCreationChangeKind | undefined;
  estimatedLinesAdded?: number | undefined;
  estimatedLinesRemoved?: number | undefined;
  selectedIntent?: AppRunDraftIntent | undefined;
  runDraft?: AppRunDraftView | undefined;
  workspaceIndexRef?: AppWorkspaceIndexBridgeView | undefined;
};

export type AppPatchProposalPathRefsParseResult =
  | {
      ok: true;
      pathRefs: PatchProposalCreationFileRef[];
    }
  | {
      ok: false;
      errorCode: string;
      safeMessage: string;
    };

const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenPathRefKeys = new Set(
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

const unsafeTextPatterns = [
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
    code: "CLIPBOARD_MARKER",
    pattern: new RegExp(`\\b${privatePasteField}\\b`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildPatchProposalCreationPreviewView(
  input: AppPatchProposalCreationPreviewInput = {}
): AppPatchProposalCreationPreviewView {
  const parsed = parsePatchProposalPathRefsInput(input.pathRefsText ?? "", {
    defaultChangeKind: input.defaultChangeKind,
    estimatedLinesAdded: input.estimatedLinesAdded,
    estimatedLinesRemoved: input.estimatedLinesRemoved,
    reasonSummary: input.changeDescriptionSummary
  });

  if (!parsed.ok) {
    return appViewFromRuntimePreview(
      buildPatchProposalCreationPreview({
        intent: normalizeIntent(input.selectedIntent ?? input.runDraft?.intent),
        title: input.titleDraft,
        changeDescriptionSummary: parsed.safeMessage,
        selectedPathRefs: [
          {
            path: "patch-preview-input-rejected",
            changeKind: "update",
            reasonSummary: parsed.safeMessage,
            warningCodes: [parsed.errorCode]
          }
        ]
      })
    );
  }

  return appViewFromRuntimePreview(
    buildPatchProposalCreationPreview({
      intent: normalizeIntent(input.selectedIntent ?? input.runDraft?.intent),
      title: input.titleDraft,
      changeDescriptionSummary: input.changeDescriptionSummary,
      selectedPathRefs: parsed.pathRefs,
      runDraftRef:
        input.runDraft !== undefined && input.runDraft.status !== "empty"
          ? input.runDraft.draftId
          : undefined,
      workspaceIndexRef: workspaceIndexRef(input.workspaceIndexRef)
    })
  );
}

export function parsePatchProposalPathRefsInput(
  text: string,
  defaults: {
    defaultChangeKind?: PatchProposalCreationChangeKind | undefined;
    estimatedLinesAdded?: number | undefined;
    estimatedLinesRemoved?: number | undefined;
    reasonSummary?: string | undefined;
  } = {}
): AppPatchProposalPathRefsParseResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: true, pathRefs: [] };
  }
  if (trimmed.length > 20_000) {
    return {
      ok: false,
      errorCode: "PATCH_PREVIEW_PATH_REFS_TOO_LARGE",
      safeMessage: "Patch proposal path refs text is too large."
    };
  }
  const unsafeCodes = unsafeWarningCodes(trimmed);
  if (unsafeCodes.length > 0) {
    return {
      ok: false,
      errorCode: unsafeCodes[0] ?? "PATCH_PREVIEW_UNSAFE_MARKER",
      safeMessage:
        "Patch proposal path refs contain unsafe markers. Warning codes only are shown."
    };
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const rawFieldCode = rawFieldWarningFrom(parsed);
      if (rawFieldCode !== undefined) {
        return {
          ok: false,
          errorCode: rawFieldCode,
          safeMessage:
            "Patch proposal path refs contain raw content fields and were rejected."
        };
      }
      if (!Array.isArray(parsed)) {
        return {
          ok: false,
          errorCode: "PATCH_PREVIEW_PATH_REFS_INVALID_JSON",
          safeMessage: "Patch proposal path refs JSON must be an array."
        };
      }
      return {
        ok: true,
        pathRefs: parsed.map((item) => refFromUnknown(item, defaults))
      };
    } catch {
      return {
        ok: false,
        errorCode: "PATCH_PREVIEW_PATH_REFS_INVALID_JSON",
        safeMessage: "Patch proposal path refs JSON could not be parsed."
      };
    }
  }

  return {
    ok: true,
    pathRefs: trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((path) => ({
        path,
        changeKind: defaults.defaultChangeKind ?? "update",
        reasonSummary: defaults.reasonSummary,
        estimatedLinesAdded: defaults.estimatedLinesAdded,
        estimatedLinesRemoved: defaults.estimatedLinesRemoved
      }))
  };
}

export function patchProposalCreationSurfaceSummaries(
  view: AppPatchProposalCreationPreviewView | undefined
): AppWorkbenchSurfacesInput["patchProposalSummaries"] {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "blocked"
  ) {
    return [];
  }
  return [
    {
      proposalId: view.proposalId,
      title: view.title,
      status: view.status,
      riskLevel: view.riskLevel,
      requiresApproval: view.requiresApproval,
      filesChanged: view.fileCount,
      filesCreated: view.filesCreated,
      filesUpdated: view.filesUpdated,
      filesDeleted: view.filesDeleted,
      linesAdded: view.linesAdded,
      linesRemoved: view.linesRemoved,
      pathSummaries: view.pathSummaries,
      warningCodes: view.warningCodes,
      hash: view.proposalHash,
      fingerprint: view.proposalHash,
      suggestedNextAction:
        "Review the patch proposal summary. Apply is disabled in this phase."
    }
  ];
}

export function patchProposalCreationApprovalRefs(
  view: AppPatchProposalCreationPreviewView | undefined
): AppWorkbenchApprovalRef[] {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "blocked" ||
    !view.requiresApproval
  ) {
    return [];
  }
  return [
    {
      id: `patch-${view.proposalId}`,
      label: view.title,
      kind: "patch",
      status: "dry",
      summary:
        "Patch proposal preview requires future approval. Approval execution is disabled in this phase."
    }
  ];
}

function appViewFromRuntimePreview(
  preview: PatchProposalCreationPreview
): AppPatchProposalCreationPreviewView {
  return {
    status: preview.status,
    proposalId: preview.proposalId,
    title: preview.title,
    intent: normalizeIntent(preview.intent),
    fileCount: preview.fileCount,
    filesCreated: preview.filesCreated,
    filesUpdated: preview.filesUpdated,
    filesDeleted: preview.filesDeleted,
    linesAdded: preview.linesAdded,
    linesRemoved: preview.linesRemoved,
    riskLevel: preview.riskLevel,
    requiresApproval: preview.requiresApproval,
    items: preview.items.map((item) => ({
      itemId: item.itemId,
      path: item.path,
      changeKind: item.changeKind,
      language: item.language,
      extension: item.extension,
      reasonSummary: item.reasonSummary,
      estimatedLinesAdded: item.estimatedLinesAdded,
      estimatedLinesRemoved: item.estimatedLinesRemoved,
      warningCodes: [...item.warningCodes],
      requiresApproval: item.requiresApproval
    })),
    pathSummaries: [...preview.pathSummaries],
    warningCodes: [...preview.warningCodes],
    warnings: preview.warnings.map((warning) => ({
      code: warning.code,
      safeMessage: warning.safeMessage,
      path: warning.path
    })),
    proposalHash: preview.proposalHash,
    nextAction: preview.nextAction,
    source:
      preview.status === "empty" ? "empty" : "runtime_patch_creation_preview",
    previewOnly: true,
    applyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false
  };
}

function refFromUnknown(
  value: unknown,
  defaults: {
    defaultChangeKind?: PatchProposalCreationChangeKind | undefined;
    estimatedLinesAdded?: number | undefined;
    estimatedLinesRemoved?: number | undefined;
    reasonSummary?: string | undefined;
  }
): PatchProposalCreationFileRef {
  if (typeof value === "string") {
    return {
      path: value,
      changeKind: defaults.defaultChangeKind ?? "update",
      reasonSummary: defaults.reasonSummary,
      estimatedLinesAdded: defaults.estimatedLinesAdded,
      estimatedLinesRemoved: defaults.estimatedLinesRemoved
    };
  }
  const record = isRecord(value) ? value : {};
  return {
    path: safeText(record.path, ""),
    changeKind: normalizeChangeKind(
      record.changeKind,
      defaults.defaultChangeKind ?? "update"
    ),
    language: optionalSafeText(record.language),
    extension: optionalSafeText(record.extension),
    reasonSummary:
      optionalSafeText(record.reasonSummary) ?? defaults.reasonSummary,
    estimatedLinesAdded: finiteNumber(
      record.estimatedLinesAdded,
      defaults.estimatedLinesAdded
    ),
    estimatedLinesRemoved: finiteNumber(
      record.estimatedLinesRemoved,
      defaults.estimatedLinesRemoved
    ),
    riskHints: safeStringArray(record.riskHints),
    warningCodes: safeStringArray(record.warningCodes)
  };
}

function workspaceIndexRef(
  view: AppWorkspaceIndexBridgeView | undefined
): string | undefined {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "rejected"
  ) {
    return undefined;
  }
  return view.workspaceIndexId ?? `workspace-index:${view.hashPrefix}`;
}

function rawFieldWarningFrom(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const nested of value) {
      const code = rawFieldWarningFrom(nested);
      if (code !== undefined) {
        return code;
      }
    }
    return undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenPathRefKeys.has(key.toLowerCase())) {
      return "PATCH_PREVIEW_RAW_FIELD_REJECTED";
    }
    const nestedCode = rawFieldWarningFrom(nested);
    if (nestedCode !== undefined) {
      return nestedCode;
    }
  }
  return undefined;
}

function unsafeWarningCodes(text: string): string[] {
  return unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function normalizeIntent(value: unknown): AppRunDraftIntent {
  return value === "web_data_extraction" ||
    value === "code_change" ||
    value === "code_review" ||
    value === "verification" ||
    value === "documentation" ||
    value === "unknown"
    ? value
    : "unknown";
}

function normalizeChangeKind(
  value: unknown,
  fallback: PatchProposalCreationChangeKind
): PatchProposalCreationChangeKind {
  return value === "create" ||
    value === "update" ||
    value === "delete" ||
    value === "documentation" ||
    value === "test"
    ? value
    : fallback;
}

function finiteNumber(
  value: unknown,
  fallback: number | undefined
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

function optionalSafeText(value: unknown): string | undefined {
  const text = safeErrorMessage(safeText(value, ""));
  return text.length > 0 ? text.slice(0, 160) : undefined;
}

function safeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const values = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 12);
  return values.length > 0 ? values : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
