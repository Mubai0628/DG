import { safeArray, safeErrorMessage, safeText } from "./safety.js";

export type AppWorkspaceIndexStatus =
  | "empty"
  | "loaded"
  | "rejected"
  | "warning";

export type AppWorkspaceIndexSource =
  | "empty"
  | "pasted_summary_json"
  | "file_summary_json"
  | "synthetic_summary";

export type AppWorkspaceIndexWarning = {
  code: string;
  safeMessage?: string | undefined;
};

export type AppWorkspaceIndexFileSummaryView = {
  path: string;
  language: string;
  extension: string;
  sizeBytes: number;
  lineCount: number;
  symbolCount: number;
  hashPrefix: string;
  indexed: boolean;
  skippedReason?: string | undefined;
  warningCodes: string[];
};

export type AppWorkspaceIndexLanguageView = {
  language: string;
  fileCount: number;
  indexedFileCount: number;
  lineCount: number;
  sizeBytes: number;
};

export type AppWorkspaceIndexDirectoryView = {
  path: string;
  fileCount: number;
  indexedFileCount: number;
  skippedFileCount: number;
  languageCounts: Record<string, number>;
  warningCodes: string[];
};

export type AppWorkspaceIndexSymbolSummaryView = {
  filePath: string;
  name: string;
  kind: string;
  language: string;
};

export type AppWorkspaceIndexSummaryInput = {
  summary?: unknown;
  source?: AppWorkspaceIndexSource | undefined;
  rawJsonText?: string | undefined;
  maxJsonBytes?: number | undefined;
  maxFileSummaries?: number | undefined;
  parseErrorCode?: string | undefined;
  parseErrorMessage?: string | undefined;
};

export type AppWorkspaceIndexValidationResult = {
  ok: boolean;
  errorCode?: string | undefined;
  safeMessage?: string | undefined;
  warningCodes: string[];
};

export type AppWorkspaceIndexSummaryJsonParseResult =
  | { ok: true; input: AppWorkspaceIndexSummaryInput }
  | {
      ok: false;
      errorCode: string;
      safeMessage: string;
      warnings: AppWorkspaceIndexWarning[];
    };

export type AppWorkspaceIndexBridgeView = {
  status: AppWorkspaceIndexStatus;
  workspaceIndexId?: string | undefined;
  source: AppWorkspaceIndexSource;
  fileCount: number;
  indexedFileCount: number;
  skippedFileCount: number;
  directoryCount: number;
  languageCount: number;
  symbolCount: number;
  totalBytes: number;
  totalLines: number;
  hashPrefix: string;
  languages: AppWorkspaceIndexLanguageView[];
  topDirectories: AppWorkspaceIndexDirectoryView[];
  topFiles: AppWorkspaceIndexFileSummaryView[];
  symbolSummaries: AppWorkspaceIndexSymbolSummaryView[];
  warnings: AppWorkspaceIndexWarning[];
  nextAction: string;
  readOnly: true;
  filesystemCrawlEnabled: false;
  eventWritesEnabled: false;
};

const defaultMaxJsonBytes = 500_000;
const defaultMaxFileSummaries = 250;
const maxShownFiles = 12;
const maxShownDirectories = 8;
const maxShownSymbols = 20;

const rawFieldNames = new Set([
  "content",
  "beforeContent",
  "afterContent",
  "rawSource",
  `raw${"Diff"}`,
  `raw${"Prompt"}`,
  `raw${"Dom"}`,
  `raw${"Csv"}`,
  `raw${"Screenshot"}`,
  `clip${"board"}`,
  "apiKey",
  "authorization",
  "env"
]);

const secretOrRawPatterns = [
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
    pattern: /\bAuthorization\s*:/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\braw${"Prompt"}\\b`, "i")
  },
  {
    code: "RAW_DOM_MARKER",
    pattern: new RegExp(`\\braw${"Dom"}\\b|raw DOM`, "i")
  },
  {
    code: "RAW_CSV_MARKER",
    pattern: new RegExp(`\\braw${"Csv"}\\b|raw CSV`, "i")
  },
  {
    code: "RAW_SCREENSHOT_MARKER",
    pattern: new RegExp(`\\braw${"Screenshot"}\\b|screenshot`, "i")
  },
  {
    code: "CLIPBOARD_MARKER",
    pattern: new RegExp(`\\bclip${"board"}\\b`, "i")
  },
  {
    code: "URL_QUERY_SECRET_MARKER",
    pattern: /https?:\/\/\S+\?(?=\S*(token|key|secret|auth|password)=)/i
  }
];

const pathMetacharacters = /[;&|><`$(){}\r\n\0]/;

export function parseWorkspaceIndexSummaryJson(
  text: string,
  options: {
    source?: AppWorkspaceIndexSource | undefined;
    maxJsonBytes?: number | undefined;
  } = {}
): AppWorkspaceIndexSummaryJsonParseResult {
  const maxJsonBytes = options.maxJsonBytes ?? defaultMaxJsonBytes;
  const source = options.source ?? "pasted_summary_json";
  if (text.trim().length === 0) {
    return rejectedParse("WORKSPACE_INDEX_JSON_EMPTY");
  }
  if (byteLength(text) > maxJsonBytes) {
    return rejectedParse("WORKSPACE_INDEX_JSON_TOO_LARGE");
  }
  const markerCodes = unsafeMarkerCodes(text);
  if (markerCodes.length > 0) {
    return rejectedParse("WORKSPACE_INDEX_UNSAFE_MARKER", markerCodes);
  }

  try {
    return {
      ok: true,
      input: {
        summary: JSON.parse(text) as unknown,
        rawJsonText: text,
        source,
        maxJsonBytes
      }
    };
  } catch {
    return rejectedParse("WORKSPACE_INDEX_JSON_INVALID");
  }
}

export function buildWorkspaceIndexBridgeView(
  input: AppWorkspaceIndexSummaryInput = {}
): AppWorkspaceIndexBridgeView {
  if (input.parseErrorCode !== undefined) {
    return rejectedView(
      input.source ?? "pasted_summary_json",
      input.parseErrorCode,
      input.parseErrorMessage
    );
  }

  if (input.summary === undefined) {
    return emptyView();
  }

  const validation = validateWorkspaceIndexSummaryInput(input);
  if (!validation.ok) {
    return rejectedView(
      input.source ?? "pasted_summary_json",
      validation.errorCode ?? "WORKSPACE_INDEX_REJECTED",
      validation.safeMessage
    );
  }

  const summary = isRecord(input.summary) ? input.summary : {};
  const files = normalizeFiles(summary);
  const directories = normalizeDirectories(summary);
  const languages = normalizeLanguages(summary, files);
  const symbols = normalizeSymbols(summary, files);
  const warnings = normalizeWarnings(summary, validation.warningCodes);
  const fileCount =
    finiteNumber(readValue(summary, "fileCount")) ||
    files.length ||
    finiteNumber(readValue(summary, "totalFileCount"));
  const indexedFileCount =
    finiteNumber(readValue(summary, "indexedFileCount")) ||
    files.filter((file) => file.indexed).length;
  const skippedFileCount =
    finiteNumber(readValue(summary, "skippedFileCount")) ||
    files.filter((file) => !file.indexed).length;
  const totalBytes =
    finiteNumber(readValue(summary, "totalBytes")) ||
    files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const totalLines =
    finiteNumber(readValue(summary, "totalLines")) ||
    files.reduce((sum, file) => sum + file.lineCount, 0);
  const symbolCount =
    finiteNumber(readValue(summary, "symbolCount", "symbolCounts")) ||
    symbols.length ||
    files.reduce((sum, file) => sum + file.symbolCount, 0);

  return {
    status: warnings.length > 0 ? "warning" : "loaded",
    workspaceIndexId: safeIdentifier(
      readValue(summary, "workspaceIndexId", "indexId", "id")
    ),
    source: normalizeSource(input.source),
    fileCount,
    indexedFileCount,
    skippedFileCount,
    directoryCount:
      finiteNumber(readValue(summary, "directoryCount")) || directories.length,
    languageCount: languages.length,
    symbolCount,
    totalBytes,
    totalLines,
    hashPrefix: hashPrefix(readValue(summary, "hash", "indexHash")),
    languages,
    topDirectories: directories.slice(0, maxShownDirectories),
    topFiles: files.slice(0, maxShownFiles),
    symbolSummaries: symbols.slice(0, maxShownSymbols),
    warnings,
    nextAction:
      "Workspace index summary is loaded locally. It can inform future previews as counts, safe paths, and hash refs only.",
    readOnly: true,
    filesystemCrawlEnabled: false,
    eventWritesEnabled: false
  };
}

export function validateWorkspaceIndexSummaryInput(
  input: AppWorkspaceIndexSummaryInput
): AppWorkspaceIndexValidationResult {
  if (input.parseErrorCode !== undefined) {
    return {
      ok: false,
      errorCode: input.parseErrorCode,
      safeMessage: input.parseErrorMessage,
      warningCodes: [input.parseErrorCode]
    };
  }
  if (input.rawJsonText !== undefined) {
    if (
      byteLength(input.rawJsonText) >
      (input.maxJsonBytes ?? defaultMaxJsonBytes)
    ) {
      return invalid("WORKSPACE_INDEX_JSON_TOO_LARGE");
    }
    const markerCodes = unsafeMarkerCodes(input.rawJsonText);
    if (markerCodes.length > 0) {
      return invalid("WORKSPACE_INDEX_UNSAFE_MARKER", markerCodes);
    }
  }
  if (!isRecord(input.summary)) {
    return invalid("WORKSPACE_INDEX_SCHEMA_INVALID");
  }

  const rawField = findRawField(input.summary);
  if (rawField !== undefined) {
    return invalid("WORKSPACE_INDEX_RAW_FIELD_REJECTED", [
      "RAW_FIELD_REJECTED"
    ]);
  }

  const unsafeMarkers = unsafeMarkersInValue(input.summary);
  if (unsafeMarkers.length > 0) {
    return invalid("WORKSPACE_INDEX_UNSAFE_MARKER", unsafeMarkers);
  }

  const files = normalizeFiles(input.summary);
  if (files.length > (input.maxFileSummaries ?? defaultMaxFileSummaries)) {
    return invalid("WORKSPACE_INDEX_TOO_MANY_FILES");
  }

  const unsafePath = firstUnsafePath(input.summary, files);
  if (unsafePath !== undefined) {
    return invalid("WORKSPACE_INDEX_UNSAFE_PATH", ["UNSAFE_PATH"]);
  }

  return {
    ok: true,
    warningCodes: uniqueStrings([
      ...warningCodesFrom(input.summary),
      ...safeArray(readValue(input.summary, "errorCodes")).map((item) =>
        warningCode(safeText(item, "WORKSPACE_INDEX_ERROR"))
      )
    ])
  };
}

function emptyView(): AppWorkspaceIndexBridgeView {
  return {
    status: "empty",
    source: "empty",
    fileCount: 0,
    indexedFileCount: 0,
    skippedFileCount: 0,
    directoryCount: 0,
    languageCount: 0,
    symbolCount: 0,
    totalBytes: 0,
    totalLines: 0,
    hashPrefix: "n/a",
    languages: [],
    topDirectories: [],
    topFiles: [],
    symbolSummaries: [],
    warnings: [],
    nextAction:
      "Paste a safe WorkspaceIndex summary JSON to preview workspace metadata. Raw file content is not accepted or displayed.",
    readOnly: true,
    filesystemCrawlEnabled: false,
    eventWritesEnabled: false
  };
}

function rejectedView(
  source: AppWorkspaceIndexSource,
  errorCode: string,
  safeMessage?: string
): AppWorkspaceIndexBridgeView {
  return {
    ...emptyView(),
    status: "rejected",
    source: normalizeSource(source),
    warnings: [
      {
        code: warningCode(errorCode),
        safeMessage:
          safeMessage ??
          "Workspace index summary was rejected by the read-only safety policy."
      }
    ],
    nextAction:
      "Provide a summary-only WorkspaceIndex JSON without raw content, secrets, unsafe paths, or generated directories."
  };
}

function rejectedParse(
  errorCode: string,
  warningCodes: readonly string[] = [errorCode]
): AppWorkspaceIndexSummaryJsonParseResult {
  return {
    ok: false,
    errorCode,
    safeMessage:
      "Workspace index summary JSON was rejected by the read-only safety policy.",
    warnings: uniqueStrings(warningCodes).map((code) => ({
      code: warningCode(code)
    }))
  };
}

function invalid(
  errorCode: string,
  warningCodes: readonly string[] = [errorCode]
): AppWorkspaceIndexValidationResult {
  return {
    ok: false,
    errorCode,
    safeMessage:
      "Workspace index summary JSON was rejected by the read-only safety policy.",
    warningCodes: uniqueStrings(warningCodes).map(warningCode)
  };
}

function normalizeFiles(
  summary: Record<string, unknown>
): AppWorkspaceIndexFileSummaryView[] {
  const rawFiles = [
    ...safeArray(readValue(summary, "fileSummaries")),
    ...safeArray(readValue(summary, "files")).map((item) =>
      isRecord(item) && isRecord(item.summary) ? item.summary : item
    ),
    ...safeArray(readValue(summary, "skippedFiles"))
  ];
  return rawFiles
    .map(normalizeFile)
    .filter(
      (file): file is AppWorkspaceIndexFileSummaryView => file !== undefined
    )
    .sort((left, right) => left.path.localeCompare(right.path));
}

function normalizeFile(
  item: unknown
): AppWorkspaceIndexFileSummaryView | undefined {
  const record = isRecord(item) ? item : {};
  const path = safePath(readValue(record, "path", "filePath"));
  if (path === undefined) {
    return undefined;
  }
  const skippedReason = safeOptionalText(readValue(record, "skippedReason"));
  return {
    path,
    language: safeToken(readValue(record, "language"), "unknown"),
    extension: safeExtension(readValue(record, "extension"), path),
    sizeBytes: finiteNumber(readValue(record, "sizeBytes")),
    lineCount: finiteNumber(readValue(record, "lineCount")),
    symbolCount: finiteNumber(readValue(record, "symbolCount")),
    hashPrefix: hashPrefix(
      readValue(record, "hash", "summaryFingerprint", "fingerprint")
    ),
    indexed: readValue(record, "indexed") !== false,
    ...(skippedReason !== undefined ? { skippedReason } : {}),
    warningCodes: warningCodesFrom(record)
  };
}

function normalizeDirectories(
  summary: Record<string, unknown>
): AppWorkspaceIndexDirectoryView[] {
  const treeSummary = isRecord(readValue(summary, "treeSummary"))
    ? (readValue(summary, "treeSummary") as Record<string, unknown>)
    : {};
  const rawDirectories = [
    ...safeArray(readValue(summary, "directorySummaries", "directories")),
    ...safeArray(readValue(treeSummary, "topDirectories"))
  ];
  return rawDirectories
    .map(normalizeDirectory)
    .filter(
      (directory): directory is AppWorkspaceIndexDirectoryView =>
        directory !== undefined
    )
    .sort((left, right) => {
      if (right.fileCount !== left.fileCount) {
        return right.fileCount - left.fileCount;
      }
      return left.path.localeCompare(right.path);
    });
}

function normalizeDirectory(
  item: unknown
): AppWorkspaceIndexDirectoryView | undefined {
  const record = isRecord(item) ? item : {};
  const path = safePath(readValue(record, "path"));
  if (path === undefined) {
    return undefined;
  }
  return {
    path,
    fileCount: finiteNumber(readValue(record, "fileCount")),
    indexedFileCount: finiteNumber(readValue(record, "indexedFileCount")),
    skippedFileCount: finiteNumber(readValue(record, "skippedFileCount")),
    languageCounts: normalizeLanguageCounts(
      readValue(record, "languageCounts")
    ),
    warningCodes: warningCodesFrom(record)
  };
}

function normalizeLanguages(
  summary: Record<string, unknown>,
  files: readonly AppWorkspaceIndexFileSummaryView[]
): AppWorkspaceIndexLanguageView[] {
  const explicit = safeArray(readValue(summary, "languageSummary"));
  if (explicit.length > 0) {
    return explicit
      .map((item) => {
        const record = isRecord(item) ? item : {};
        return {
          language: safeToken(readValue(record, "language"), "unknown"),
          fileCount: finiteNumber(readValue(record, "fileCount")),
          indexedFileCount: finiteNumber(readValue(record, "indexedFileCount")),
          lineCount: finiteNumber(readValue(record, "lineCount")),
          sizeBytes: finiteNumber(readValue(record, "sizeBytes"))
        };
      })
      .sort((left, right) => {
        if (right.fileCount !== left.fileCount) {
          return right.fileCount - left.fileCount;
        }
        return left.language.localeCompare(right.language);
      });
  }

  const languageCounts = normalizeLanguageCounts(
    readValue(summary, "languageCounts")
  );
  if (Object.keys(languageCounts).length > 0) {
    return Object.entries(languageCounts)
      .map(([language, fileCount]) => ({
        language,
        fileCount,
        indexedFileCount: fileCount,
        lineCount: 0,
        sizeBytes: 0
      }))
      .sort((left, right) => {
        if (right.fileCount !== left.fileCount) {
          return right.fileCount - left.fileCount;
        }
        return left.language.localeCompare(right.language);
      });
  }

  const byLanguage = new Map<string, AppWorkspaceIndexLanguageView>();
  for (const file of files) {
    const current = byLanguage.get(file.language) ?? {
      language: file.language,
      fileCount: 0,
      indexedFileCount: 0,
      lineCount: 0,
      sizeBytes: 0
    };
    current.fileCount += 1;
    current.indexedFileCount += file.indexed ? 1 : 0;
    current.lineCount += file.lineCount;
    current.sizeBytes += file.sizeBytes;
    byLanguage.set(file.language, current);
  }
  return [...byLanguage.values()].sort((left, right) => {
    if (right.fileCount !== left.fileCount) {
      return right.fileCount - left.fileCount;
    }
    return left.language.localeCompare(right.language);
  });
}

function normalizeSymbols(
  summary: Record<string, unknown>,
  files: readonly AppWorkspaceIndexFileSummaryView[]
): AppWorkspaceIndexSymbolSummaryView[] {
  const fromTopLevel = safeArray(
    readValue(summary, "symbolSummaries", "symbols")
  );
  const fromFiles = safeArray(readValue(summary, "files")).flatMap((item) => {
    const record = isRecord(item) ? item : {};
    const path = safeText(readValue(record, "path"), "");
    return safeArray(readValue(record, "symbols")).map((symbol) =>
      isRecord(symbol)
        ? { ...symbol, filePath: symbol.filePath ?? path }
        : symbol
    );
  });
  const knownLanguages = new Map(
    files.map((file) => [file.path, file.language])
  );
  return [...fromTopLevel, ...fromFiles]
    .map((item) => normalizeSymbol(item, knownLanguages))
    .filter(
      (symbol): symbol is AppWorkspaceIndexSymbolSummaryView =>
        symbol !== undefined
    )
    .sort((left, right) => {
      const fileCompare = left.filePath.localeCompare(right.filePath);
      return fileCompare === 0
        ? left.name.localeCompare(right.name)
        : fileCompare;
    });
}

function normalizeSymbol(
  item: unknown,
  knownLanguages: ReadonlyMap<string, string>
): AppWorkspaceIndexSymbolSummaryView | undefined {
  const record = isRecord(item) ? item : {};
  const filePath = safePath(readValue(record, "filePath", "path"));
  if (filePath === undefined) {
    return undefined;
  }
  const name = safeDisplayText(readValue(record, "name"), "symbol");
  return {
    filePath,
    name,
    kind: safeToken(readValue(record, "kind"), "symbol"),
    language: safeToken(
      readValue(record, "language"),
      knownLanguages.get(filePath) ?? "unknown"
    )
  };
}

function firstUnsafePath(
  summary: Record<string, unknown>,
  files: readonly AppWorkspaceIndexFileSummaryView[]
): string | undefined {
  const paths = [
    ...files.map((file) => file.path),
    ...normalizeDirectories(summary).map((directory) => directory.path),
    ...normalizeSymbols(summary, files).map((symbol) => symbol.filePath),
    ...safeArray(readValue(summary, "safePaths")).filter(
      (item): item is string => typeof item === "string"
    )
  ];
  return paths.find((path) => !workspacePathSafe(path));
}

function findRawField(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findRawField(item);
      if (nested !== undefined) {
        return nested;
      }
    }
    return undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (rawFieldNames.has(key)) {
      return key;
    }
    const nestedRawField = findRawField(nested);
    if (nestedRawField !== undefined) {
      return nestedRawField;
    }
  }
  return undefined;
}

function unsafeMarkersInValue(value: unknown): string[] {
  if (typeof value === "string") {
    return unsafeMarkerCodes(value);
  }
  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap(unsafeMarkersInValue));
  }
  if (isRecord(value)) {
    return uniqueStrings(Object.values(value).flatMap(unsafeMarkersInValue));
  }
  return [];
}

function unsafeMarkerCodes(text: string): string[] {
  return secretOrRawPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function normalizeWarnings(
  summary: Record<string, unknown>,
  validationWarnings: readonly string[]
): AppWorkspaceIndexWarning[] {
  const warningCodes = uniqueStrings([
    ...validationWarnings,
    ...warningCodesFrom(summary),
    ...safeArray(readValue(summary, "errorCodes")).map((item) =>
      warningCode(safeText(item, "WORKSPACE_INDEX_ERROR"))
    )
  ]);
  return warningCodes.map((code) => ({ code }));
}

function warningCodesFrom(record: Record<string, unknown>): string[] {
  const rawCodes = [
    ...safeArray(readValue(record, "warningCodes")),
    ...safeArray(readValue(record, "warnings")).map((item) =>
      isRecord(item) ? readValue(item, "code") : item
    )
  ];
  return uniqueStrings(
    rawCodes.map((item) =>
      warningCode(safeText(item, "WORKSPACE_INDEX_WARNING"))
    )
  );
}

function normalizeLanguageCounts(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }
  const entries: Array<[string, number]> = [];
  for (const [key, count] of Object.entries(value)) {
    const normalizedCount = finiteNumber(count);
    if (normalizedCount > 0) {
      entries.push([safeToken(key, "unknown"), normalizedCount]);
    }
  }
  return Object.fromEntries(entries);
}

function safePath(value: unknown): string | undefined {
  const path = safeText(value, "");
  return path.length > 0 ? path.replace(/\\/g, "/") : undefined;
}

function workspacePathSafe(path: string): boolean {
  if (path.length === 0 || path.length > 240) {
    return false;
  }
  if (
    path.startsWith("/") ||
    path.startsWith("\\") ||
    path.includes("\\") ||
    /^[A-Za-z]:/.test(path) ||
    /^https?:\/\//i.test(path) ||
    path.includes("?") ||
    path.includes("#") ||
    pathMetacharacters.test(path)
  ) {
    return false;
  }
  const segments = path.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return false;
  }
  return segments.every((segment) => safePathSegment(segment));
}

function safePathSegment(segment: string): boolean {
  const lower = segment.toLowerCase();
  if (
    segment === "." ||
    segment === ".." ||
    lower === ".git" ||
    lower === ".env" ||
    lower.startsWith(".env.") ||
    lower === "node_modules" ||
    lower === "dist" ||
    lower === "target" ||
    lower === ".tmp" ||
    lower.includes("private_key") ||
    lower.includes("id_rsa")
  ) {
    return false;
  }
  return segment.length > 0;
}

function safeDisplayText(value: unknown, fallback: string): string {
  const text = safeErrorMessage(safeText(value, fallback));
  if (unsafeMarkerCodes(text).length > 0) {
    return "summary-withheld";
  }
  return text.replace(/[^\w .:/@-]/g, "").slice(0, 100);
}

function safeOptionalText(value: unknown): string | undefined {
  const text = safeDisplayText(value, "");
  return text.length > 0 ? text : undefined;
}

function safeToken(value: unknown, fallback: string): string {
  const text = safeText(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "_")
    .slice(0, 80);
  return text.length > 0 ? text : fallback;
}

function safeExtension(value: unknown, path: string): string {
  const explicit = safeToken(value, "");
  if (explicit.length > 0) {
    return explicit;
  }
  const match = path.match(/\.([A-Za-z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? "";
}

function safeIdentifier(value: unknown): string | undefined {
  const text = safeText(value, "")
    .replace(/[^A-Za-z0-9_.:-]/g, "")
    .slice(0, 80);
  return text.length > 0 ? text : undefined;
}

function hashPrefix(value: unknown): string {
  const text = safeIdentifier(value);
  return text === undefined ? "n/a" : text.slice(0, 12);
}

function warningCode(value: string): string {
  const code = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.-]/g, "_");
  return /^[A-Z0-9_.-]{1,96}$/.test(code) ? code : "WORKSPACE_INDEX_WARNING";
}

function normalizeSource(
  value: AppWorkspaceIndexSource | undefined
): AppWorkspaceIndexSource {
  return value === "file_summary_json" || value === "synthetic_summary"
    ? value
    : value === "empty"
      ? "empty"
      : "pasted_summary_json";
}

function readValue(
  record: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }
  return undefined;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
