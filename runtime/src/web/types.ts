import { type EventStore } from "../events/index.js";

export type BrowserPayloadSource = {
  kind: "browser_active_tab";
  url: string;
  title?: string;
  origin?: string;
};

export type BrowserTableCell = {
  text: string;
  header?: boolean;
  rowSpan?: number;
  colSpan?: number;
  ariaLabel?: string;
};

export type BrowserTableRow = {
  cells: BrowserTableCell[];
};

export type BrowserVisibleTable = {
  id: string;
  caption?: string;
  ariaLabel?: string;
  nearbyText?: string;
  rowCount: number;
  columnCount: number;
  rows: BrowserTableRow[];
  sourceFingerprint?: string;
};

export type BrowserDomPayload = {
  schemaVersion: 1;
  capturedAt: string;
  source: BrowserPayloadSource;
  visibleTextSample?: string;
  tables: BrowserVisibleTable[];
  redaction: {
    passwordValuesDropped: boolean;
    inputValuesDropped: boolean;
    storageAccessed: false;
    cookiesAccessed: false;
    rawDomIncluded: false;
  };
};

export type ExtractedCell = {
  text: string;
  header: boolean;
  sourceRowIndex: number;
  sourceColumnIndex: number;
};

export type InjectionRisk = {
  kind: "prompt_injection";
  pattern: string;
  location: string;
  snippetHash: string;
};

export type UntrustedContentWarning = {
  code:
    | "multiple_tables_selected_largest"
    | "ambiguous_table_selection"
    | "row_span_flattened"
    | "prompt_injection_risk"
    | "secret_like_text_redacted";
  message: string;
  tableId?: string;
  riskCount?: number;
};

export type ExtractedTable = {
  id: string;
  caption?: string;
  ariaLabel?: string;
  sourceFingerprint?: string;
  rows: ExtractedCell[][];
  rowCount: number;
  columnCount: number;
  provenance: {
    sourceHost: string;
    sourceOrigin: string;
    sourcePathWithoutQuery: string;
    tableId: string;
    captionSummary?: string;
    ariaSummary?: string;
    warningCount: number;
    injectionRiskCount: number;
  };
};

export type TableExtractionResult = {
  tables: ExtractedTable[];
  selectedTable: ExtractedTable;
  warnings: UntrustedContentWarning[];
  injectionRisks: InjectionRisk[];
  redactedTextCount: number;
};

export type CsvLineEnding = "LF" | "CRLF";

export type CsvBuildOptions = {
  lineEnding?: CsvLineEnding;
  formulaEscape?: "single_quote" | "tab" | "none";
};

export type CsvBuildResult = {
  content: string;
  rowCount: number;
  columnCount: number;
  bytes: number;
  sha256: string;
  formulaEscapedCount: number;
};

export type WebTableToCsvRequest = {
  payload: BrowserDomPayload;
  tableId?: string;
  csvOptions?: CsvBuildOptions;
  eventStore?: EventStore;
  clock?: () => Date;
};

export type WebTableToCsvMetadata = {
  rowCount: number;
  columnCount: number;
  sourceHost: string;
  sourceOrigin: string;
  sourcePathWithoutQuery: string;
  tableId: string;
  captionSummary?: string;
  warningCount: number;
  injectionRiskCount: number;
  formulaEscapedCount: number;
  sha256: string;
};

export type WebTableToCsvResult = {
  csvContent: string;
  suggestedFilename: string;
  metadata: WebTableToCsvMetadata;
  warnings: UntrustedContentWarning[];
  extraction: TableExtractionResult;
  csv: CsvBuildResult;
};

export type BrowserPayloadValidationOptions = {
  maxTables?: number;
  maxCells?: number;
};

export type WebExtractionErrorKind =
  | "invalid_payload"
  | "unsupported_schema"
  | "no_tables"
  | "too_many_tables"
  | "too_many_cells"
  | "inconsistent_table_shape"
  | "unsupported_source"
  | "unsafe_payload_field"
  | "missing_table"
  | "redaction_contract_violation"
  | "csv_build_failed";
