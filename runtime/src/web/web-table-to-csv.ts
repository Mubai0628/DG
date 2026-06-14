import {
  summarizePayloadSource,
  validateBrowserDomPayload
} from "./browser-payload-contract.js";
import { buildCsvFromTable } from "./csv.js";
import { extractTablesFromPayload } from "./table-extractor.js";
import {
  type BrowserDomPayload,
  type CsvBuildResult,
  type TableExtractionResult,
  type WebTableToCsvMetadata,
  type WebTableToCsvRequest,
  type WebTableToCsvResult
} from "./types.js";

export function webTableToCsv(
  request: WebTableToCsvRequest
): WebTableToCsvResult {
  const payload = validateBrowserDomPayload(request.payload);
  const sourceSummary = summarizePayloadSource(payload.source);
  request.eventStore?.appendEvent({
    type: "browser.dom.captured",
    payload: {
      ...sourceSummary,
      tableCount: payload.tables.length,
      redaction: safeRedactionFlags(payload)
    }
  });

  const extraction = extractTablesFromPayload(payload, {
    ...(request.tableId !== undefined ? { tableId: request.tableId } : {})
  });
  const csv = buildCsvFromTable(extraction.selectedTable, request.csvOptions);
  const metadata = createMetadata(payload, extraction, csv);

  request.eventStore?.appendEvent({
    type: "frame.redacted",
    payload: {
      ...sourceSummary,
      selectedTableId: extraction.selectedTable.id,
      rowCount: extraction.selectedTable.rowCount,
      columnCount: extraction.selectedTable.columnCount,
      tableCount: payload.tables.length,
      redaction: safeRedactionFlags(payload),
      warningCount: extraction.warnings.length,
      injectionRiskCount: extraction.injectionRisks.length,
      formulaEscapedCount: csv.formulaEscapedCount,
      redactedTextCount: extraction.redactedTextCount
    }
  });

  return {
    csvContent: csv.content,
    suggestedFilename: suggestFilename(
      sourceSummary.sourceHost,
      metadata.tableId
    ),
    metadata,
    warnings: extraction.warnings,
    extraction,
    csv
  };
}

function createMetadata(
  payload: BrowserDomPayload,
  extraction: TableExtractionResult,
  csv: CsvBuildResult
): WebTableToCsvMetadata {
  const source = summarizePayloadSource(payload.source);
  const metadata: WebTableToCsvMetadata = {
    rowCount: extraction.selectedTable.rowCount,
    columnCount: extraction.selectedTable.columnCount,
    sourceHost: source.sourceHost,
    sourceOrigin: source.sourceOrigin,
    sourcePathWithoutQuery: source.sourcePathWithoutQuery,
    tableId: extraction.selectedTable.id,
    warningCount: extraction.warnings.length,
    injectionRiskCount: extraction.injectionRisks.length,
    formulaEscapedCount: csv.formulaEscapedCount,
    sha256: csv.sha256
  };

  const captionSummary = extraction.selectedTable.provenance.captionSummary;
  if (captionSummary !== undefined) {
    metadata.captionSummary = captionSummary;
  }

  return metadata;
}

function safeRedactionFlags(
  payload: BrowserDomPayload
): Record<string, unknown> {
  return {
    passwordValuesDropped: payload.redaction.passwordValuesDropped,
    inputValuesDropped: payload.redaction.inputValuesDropped,
    storageAccessed: payload.redaction.storageAccessed,
    cookiesAccessed: payload.redaction.cookiesAccessed,
    rawDomIncluded: payload.redaction.rawDomIncluded
  };
}

function suggestFilename(sourceHost: string, tableId: string): string {
  const host = slug(sourceHost);
  const table = slug(tableId);
  const base = [host, table].filter((part) => part.length > 0).join("-");
  return `${base.length > 0 ? base : "table"}.csv`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
