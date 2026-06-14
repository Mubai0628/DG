import { WebExtractionError } from "./errors.js";
import {
  validateBrowserDomPayload,
  summarizePayloadSource
} from "./browser-payload-contract.js";
import { detectInjectionRisks } from "./injection-detector.js";
import {
  normalizeWhitespace,
  redactWebText,
  summarizeText
} from "./redaction.js";
import {
  type BrowserDomPayload,
  type BrowserTableCell,
  type BrowserVisibleTable,
  type ExtractedCell,
  type ExtractedTable,
  type InjectionRisk,
  type TableExtractionResult,
  type UntrustedContentWarning
} from "./types.js";

export type TableExtractionOptions = {
  tableId?: string;
};

export function extractTablesFromPayload(
  payload: BrowserDomPayload,
  options: TableExtractionOptions = {}
): TableExtractionResult {
  const validated = validateBrowserDomPayload(payload);
  const warnings: UntrustedContentWarning[] = [];
  const injectionRisks: InjectionRisk[] = [];
  let redactedTextCount = 0;

  const tables = validated.tables.map((table) => {
    const extraction = extractTable(table, validated, warnings);
    injectionRisks.push(...collectInjectionRisks(table));
    redactedTextCount += extraction.redactedTextCount;
    return extraction.table;
  });

  const selectedTable = selectTable(tables, options.tableId, warnings);
  if (injectionRisks.length > 0) {
    warnings.push({
      code: "prompt_injection_risk",
      message: "Untrusted table text contains deterministic injection patterns",
      tableId: selectedTable.id,
      riskCount: injectionRisks.length
    });
  }
  if (redactedTextCount > 0) {
    warnings.push({
      code: "secret_like_text_redacted",
      message: "Secret-like text was redacted before CSV assembly",
      tableId: selectedTable.id,
      riskCount: redactedTextCount
    });
  }

  return {
    tables,
    selectedTable: {
      ...selectedTable,
      provenance: {
        ...selectedTable.provenance,
        warningCount: warnings.length,
        injectionRiskCount: injectionRisks.length
      }
    },
    warnings,
    injectionRisks,
    redactedTextCount
  };
}

function extractTable(
  table: BrowserVisibleTable,
  payload: BrowserDomPayload,
  warnings: UntrustedContentWarning[]
): { table: ExtractedTable; redactedTextCount: number } {
  const source = summarizePayloadSource(payload.source);
  let rowSpanWarned = false;
  let redactedTextCount = 0;
  const rows = table.rows.map((row, rowIndex) => {
    const extractedRow: ExtractedCell[] = [];
    for (const [sourceColumnIndex, cell] of row.cells.entries()) {
      if ((cell.rowSpan ?? 1) > 1 && !rowSpanWarned) {
        rowSpanWarned = true;
        warnings.push({
          code: "row_span_flattened",
          message: "rowSpan was flattened for v0 table extraction",
          tableId: table.id
        });
      }

      const normalized = normalizeWhitespace(cell.text);
      const redaction = redactWebText(normalized);
      if (redaction.redacted) {
        redactedTextCount += 1;
      }
      const colSpan = cell.colSpan ?? 1;
      for (let spanIndex = 0; spanIndex < colSpan; spanIndex += 1) {
        extractedRow.push({
          text: redaction.text,
          header: cell.header ?? false,
          sourceRowIndex: rowIndex,
          sourceColumnIndex: sourceColumnIndex + spanIndex
        });
      }
    }
    return extractedRow;
  });

  const extracted: ExtractedTable = {
    id: table.id,
    rows,
    rowCount: table.rowCount,
    columnCount: table.columnCount,
    provenance: {
      ...source,
      tableId: table.id,
      warningCount: 0,
      injectionRiskCount: 0
    }
  };
  if (table.caption !== undefined) {
    extracted.caption = normalizeWhitespace(table.caption);
    const captionSummary = summarizeText(table.caption);
    if (captionSummary !== undefined) {
      extracted.provenance.captionSummary = captionSummary;
    }
  }
  if (table.ariaLabel !== undefined) {
    extracted.ariaLabel = normalizeWhitespace(table.ariaLabel);
    const ariaSummary = summarizeText(table.ariaLabel);
    if (ariaSummary !== undefined) {
      extracted.provenance.ariaSummary = ariaSummary;
    }
  }
  if (table.sourceFingerprint !== undefined) {
    extracted.sourceFingerprint = table.sourceFingerprint;
  }

  return { table: extracted, redactedTextCount };
}

function collectInjectionRisks(table: BrowserVisibleTable): InjectionRisk[] {
  const risks: InjectionRisk[] = [];

  scanOptionalText(table.caption, `${table.id}:caption`, risks);
  scanOptionalText(table.ariaLabel, `${table.id}:ariaLabel`, risks);
  scanOptionalText(table.nearbyText, `${table.id}:nearbyText`, risks);

  for (const [rowIndex, row] of table.rows.entries()) {
    for (const [cellIndex, cell] of row.cells.entries()) {
      scanCellText(
        cell,
        `${table.id}:r${rowIndex + 1}c${cellIndex + 1}`,
        risks
      );
    }
  }

  return risks;
}

function scanOptionalText(
  text: string | undefined,
  location: string,
  risks: InjectionRisk[]
): void {
  if (text !== undefined) {
    risks.push(...detectInjectionRisks(text, location));
  }
}

function scanCellText(
  cell: BrowserTableCell,
  location: string,
  risks: InjectionRisk[]
): void {
  risks.push(...detectInjectionRisks(cell.text, location));
  if (cell.ariaLabel !== undefined) {
    risks.push(
      ...detectInjectionRisks(cell.ariaLabel, `${location}:ariaLabel`)
    );
  }
}

function selectTable(
  tables: readonly ExtractedTable[],
  tableId: string | undefined,
  warnings: UntrustedContentWarning[]
): ExtractedTable {
  if (tableId !== undefined) {
    const selected = tables.find((table) => table.id === tableId);
    if (selected === undefined) {
      throw new WebExtractionError(
        "missing_table",
        "Requested tableId was not present in browser payload"
      );
    }
    return selected;
  }

  const scored = tables
    .map((table, index) => ({
      table,
      index,
      score: tableScore(table)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.index - right.index;
    });
  const selected = scored[0]?.table;
  if (selected === undefined) {
    throw new WebExtractionError("missing_table", "No table could be selected");
  }

  if (tables.length > 1) {
    const secondScore = scored[1]?.score;
    warnings.push({
      code:
        secondScore === scored[0]?.score
          ? "ambiguous_table_selection"
          : "multiple_tables_selected_largest",
      message:
        secondScore === scored[0]?.score
          ? "Multiple tables had the same score; selected the first stable match"
          : "Multiple tables were present; selected the largest data table",
      tableId: selected.id
    });
  }

  return selected;
}

function tableScore(table: ExtractedTable): number {
  let score = table.rowCount * table.columnCount;
  if (table.rowCount <= 1) {
    score *= 0.5;
  }
  if (table.columnCount <= 1) {
    score *= 0.5;
  }
  return score;
}
