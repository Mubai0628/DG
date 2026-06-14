import { BrowserPayloadValidationError } from "./errors.js";
import {
  type BrowserDomPayload,
  type BrowserPayloadValidationOptions,
  type BrowserTableCell,
  type BrowserTableRow,
  type BrowserVisibleTable
} from "./types.js";

const defaultMaxTables = 20;
const defaultMaxCells = 10_000;

const unsafeFieldFragments = [
  "cookie",
  "localstorage",
  "sessionstorage",
  "passwordvalue",
  "rawdom",
  "htmlouter",
  "innerhtml",
  "outerhtml"
];

const allowedRedactionPaths = new Set([
  "redaction.cookiesAccessed",
  "redaction.storageAccessed",
  "redaction.passwordValuesDropped",
  "redaction.rawDomIncluded"
]);

export type SafeSourceSummary = {
  sourceHost: string;
  sourceOrigin: string;
  sourcePathWithoutQuery: string;
};

export function validateBrowserDomPayload(
  payload: unknown,
  options: BrowserPayloadValidationOptions = {}
): BrowserDomPayload {
  assertNoUnsafeFieldNames(payload);
  if (!isRecord(payload)) {
    throw new BrowserPayloadValidationError(
      "invalid_payload",
      "Browser payload must be an object"
    );
  }
  if (payload.schemaVersion !== 1) {
    throw new BrowserPayloadValidationError(
      "unsupported_schema",
      "Browser payload schemaVersion must be 1"
    );
  }

  validateSource(payload.source);
  validateRedactionContract(payload.redaction);

  if (!Array.isArray(payload.tables) || payload.tables.length === 0) {
    throw new BrowserPayloadValidationError(
      "no_tables",
      "Browser payload must include at least one visible table"
    );
  }

  const maxTables = options.maxTables ?? defaultMaxTables;
  if (payload.tables.length > maxTables) {
    throw new BrowserPayloadValidationError(
      "too_many_tables",
      "Browser payload contains too many tables"
    );
  }

  let cellCount = 0;
  const maxCells = options.maxCells ?? defaultMaxCells;
  for (const table of payload.tables) {
    cellCount += validateTable(table);
    if (cellCount > maxCells) {
      throw new BrowserPayloadValidationError(
        "too_many_cells",
        "Browser payload contains too many table cells"
      );
    }
  }

  return payload as BrowserDomPayload;
}

export function summarizePayloadSource(
  source: BrowserDomPayload["source"]
): SafeSourceSummary {
  const url = parseSupportedUrl(source.url);
  return {
    sourceHost: url.host,
    sourceOrigin: url.origin,
    sourcePathWithoutQuery: url.pathname.length > 0 ? url.pathname : "/"
  };
}

function validateSource(source: unknown): void {
  if (!isRecord(source)) {
    throw new BrowserPayloadValidationError(
      "invalid_payload",
      "Browser payload source must be an object"
    );
  }
  if (source.kind !== "browser_active_tab") {
    throw new BrowserPayloadValidationError(
      "invalid_payload",
      "Browser payload source kind is not supported"
    );
  }
  if (typeof source.url !== "string") {
    throw new BrowserPayloadValidationError(
      "unsupported_source",
      "Browser payload source URL is required"
    );
  }
  parseSupportedUrl(source.url);
  if (source.title !== undefined && typeof source.title !== "string") {
    throw new BrowserPayloadValidationError(
      "invalid_payload",
      "Browser payload source title must be a string"
    );
  }
  if (source.origin !== undefined && typeof source.origin !== "string") {
    throw new BrowserPayloadValidationError(
      "invalid_payload",
      "Browser payload source origin must be a string"
    );
  }
}

function parseSupportedUrl(urlText: string): URL {
  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    throw new BrowserPayloadValidationError(
      "unsupported_source",
      "Browser payload source URL must be a valid URL"
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BrowserPayloadValidationError(
      "unsupported_source",
      "Browser payload source URL must use http or https"
    );
  }
  return url;
}

function validateRedactionContract(redaction: unknown): void {
  if (!isRecord(redaction)) {
    throw new BrowserPayloadValidationError(
      "redaction_contract_violation",
      "Browser payload redaction contract is required"
    );
  }
  if (redaction.cookiesAccessed !== false) {
    throw new BrowserPayloadValidationError(
      "redaction_contract_violation",
      "Browser payload must not include browser cookie access"
    );
  }
  if (redaction.storageAccessed !== false) {
    throw new BrowserPayloadValidationError(
      "redaction_contract_violation",
      "Browser payload must not include browser storage access"
    );
  }
  if (redaction.rawDomIncluded !== false) {
    throw new BrowserPayloadValidationError(
      "redaction_contract_violation",
      "Browser payload must not include raw DOM"
    );
  }
  if (redaction.passwordValuesDropped !== true) {
    throw new BrowserPayloadValidationError(
      "redaction_contract_violation",
      "Browser payload must confirm password field values were dropped"
    );
  }
  if (
    redaction.inputValuesDropped !== true &&
    redaction.inputValuesDropped !== false
  ) {
    throw new BrowserPayloadValidationError(
      "redaction_contract_violation",
      "Browser payload input value redaction flag is required"
    );
  }
}

function validateTable(table: unknown): number {
  if (!isRecord(table)) {
    throw new BrowserPayloadValidationError(
      "invalid_payload",
      "Browser table must be an object"
    );
  }

  assertNonEmptyString(table.id, "Browser table id is required");
  assertPositiveInteger(table.rowCount, "Browser table rowCount is invalid");
  assertPositiveInteger(
    table.columnCount,
    "Browser table columnCount is invalid"
  );

  if (!Array.isArray(table.rows) || table.rows.length !== table.rowCount) {
    throw new BrowserPayloadValidationError(
      "inconsistent_table_shape",
      "Browser table rowCount does not match rows"
    );
  }

  const browserTable = table as BrowserVisibleTable;
  for (const [rowIndex, row] of browserTable.rows.entries()) {
    validateRow(row, browserTable.columnCount, rowIndex);
  }

  return browserTable.rowCount * browserTable.columnCount;
}

function validateRow(
  row: BrowserTableRow,
  columnCount: number,
  rowIndex: number
): void {
  if (!isRecord(row) || !Array.isArray(row.cells)) {
    throw new BrowserPayloadValidationError(
      "inconsistent_table_shape",
      "Browser table row must include cells"
    );
  }

  let expandedWidth = 0;
  for (const cell of row.cells) {
    expandedWidth += validateCell(cell);
  }

  if (expandedWidth !== columnCount) {
    throw new BrowserPayloadValidationError(
      "inconsistent_table_shape",
      `Browser table row ${rowIndex + 1} width does not match columnCount`
    );
  }
}

function validateCell(cell: BrowserTableCell): number {
  if (!isRecord(cell) || typeof cell.text !== "string") {
    throw new BrowserPayloadValidationError(
      "inconsistent_table_shape",
      "Browser table cell text must be a string"
    );
  }
  if (cell.header !== undefined && typeof cell.header !== "boolean") {
    throw new BrowserPayloadValidationError(
      "inconsistent_table_shape",
      "Browser table cell header must be a boolean"
    );
  }
  if (cell.rowSpan !== undefined) {
    assertPositiveInteger(cell.rowSpan, "Browser table rowSpan is invalid");
  }
  if (cell.colSpan !== undefined) {
    assertPositiveInteger(cell.colSpan, "Browser table colSpan is invalid");
  }
  if (cell.ariaLabel !== undefined && typeof cell.ariaLabel !== "string") {
    throw new BrowserPayloadValidationError(
      "inconsistent_table_shape",
      "Browser table cell ariaLabel must be a string"
    );
  }

  return cell.colSpan ?? 1;
}

function assertNonEmptyString(value: unknown, message: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BrowserPayloadValidationError("invalid_payload", message);
  }
}

function assertPositiveInteger(value: unknown, message: string): void {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new BrowserPayloadValidationError(
      "inconsistent_table_shape",
      message
    );
  }
}

function assertNoUnsafeFieldNames(value: unknown, path: string[] = []): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoUnsafeFieldNames(item, path);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    const joinedPath = nextPath.join(".");
    const lowerKey = key.toLowerCase();
    if (
      !allowedRedactionPaths.has(joinedPath) &&
      unsafeFieldFragments.some((fragment) => lowerKey.includes(fragment))
    ) {
      throw new BrowserPayloadValidationError(
        "unsafe_payload_field",
        "Browser payload contains an unsafe field name"
      );
    }
    assertNoUnsafeFieldNames(child, nextPath);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
