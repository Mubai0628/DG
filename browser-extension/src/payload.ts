export type ExtensionPayloadSource = {
  kind: "browser_active_tab";
  url: string;
  title?: string;
  origin?: string;
};

export type ExtensionTableCell = {
  text: string;
  header?: boolean;
  rowSpan?: number;
  colSpan?: number;
  ariaLabel?: string;
};

export type ExtensionTableRow = {
  cells: ExtensionTableCell[];
};

export type ExtensionVisibleTable = {
  id: string;
  caption?: string;
  ariaLabel?: string;
  nearbyText?: string;
  rowCount: number;
  columnCount: number;
  rows: ExtensionTableRow[];
  sourceFingerprint?: string;
};

export type ExtensionBrowserDomPayload = {
  schemaVersion: 1;
  capturedAt: string;
  source: ExtensionPayloadSource;
  visibleTextSample?: string;
  tables: ExtensionVisibleTable[];
  redaction: {
    passwordValuesDropped: true;
    inputValuesDropped: true;
    storageAccessed: false;
    cookiesAccessed: false;
    rawDomIncluded: false;
  };
};

export type CaptureWarning = {
  code:
    | "table_limit_reached"
    | "cell_limit_reached"
    | "payload_size_limit_reached"
    | "cell_text_truncated"
    | "input_value_dropped";
  message: string;
  tableId?: string;
};

export type CaptureErrorKind =
  | "unsupported_scheme"
  | "no_visible_tables"
  | "payload_limit_exceeded"
  | "capture_failed";

export type CaptureSuccess = {
  ok: true;
  payload: ExtensionBrowserDomPayload;
  warnings: CaptureWarning[];
};

export type CaptureFailure = {
  ok: false;
  errorKind: CaptureErrorKind;
  message: string;
  warnings: CaptureWarning[];
};

export type CaptureResult = CaptureSuccess | CaptureFailure;

export type CapturePayloadOptions = {
  maxTables?: number;
  maxCells?: number;
  maxPayloadBytes?: number;
};

const defaultMaxTables = 20;
const defaultMaxCells = 10_000;
const defaultMaxPayloadBytes = 1_000_000;

export function createPayloadFromCapturedTables(
  input: {
    url: string;
    title?: string;
    capturedAt?: string;
    tables: ExtensionVisibleTable[];
    visibleTextSample?: string;
  },
  options: CapturePayloadOptions = {}
): CaptureResult {
  const sourceResult = sanitizeSourceFromUrl(input.url, input.title);
  if (!sourceResult.ok) {
    return {
      ok: false,
      errorKind: sourceResult.errorKind,
      message: sourceResult.message,
      warnings: []
    };
  }

  const warnings: CaptureWarning[] = [];
  const maxTables = options.maxTables ?? defaultMaxTables;
  const maxCells = options.maxCells ?? defaultMaxCells;
  const limitedTables = limitTables(
    input.tables,
    maxTables,
    maxCells,
    warnings
  );
  if (limitedTables.length === 0) {
    return {
      ok: false,
      errorKind: "no_visible_tables",
      message: "No visible tables were captured",
      warnings
    };
  }

  const payload: ExtensionBrowserDomPayload = {
    schemaVersion: 1,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    source: sourceResult.source,
    tables: limitedTables,
    redaction: {
      passwordValuesDropped: true,
      inputValuesDropped: true,
      storageAccessed: false,
      cookiesAccessed: false,
      rawDomIncluded: false
    }
  };

  if (input.visibleTextSample !== undefined) {
    payload.visibleTextSample = normalizeCapturedText(
      input.visibleTextSample,
      500
    );
  }

  if (
    jsonByteLength(payload) >
    (options.maxPayloadBytes ?? defaultMaxPayloadBytes)
  ) {
    return {
      ok: false,
      errorKind: "payload_limit_exceeded",
      message: "Captured payload exceeded the configured size limit",
      warnings: [
        ...warnings,
        {
          code: "payload_size_limit_reached",
          message: "Captured payload was not returned because it was too large"
        }
      ]
    };
  }

  return { ok: true, payload, warnings };
}

export function sanitizeSourceFromUrl(
  urlText: string,
  title?: string
):
  | { ok: true; source: ExtensionPayloadSource }
  | { ok: false; errorKind: "unsupported_scheme"; message: string } {
  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    return {
      ok: false,
      errorKind: "unsupported_scheme",
      message: "Only http and https pages can be captured"
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      errorKind: "unsupported_scheme",
      message: "Only http and https pages can be captured"
    };
  }

  const source: ExtensionPayloadSource = {
    kind: "browser_active_tab",
    url: `${url.origin}${url.pathname}`,
    origin: url.origin
  };
  const safeTitle =
    title === undefined ? undefined : normalizeCapturedText(title, 200);
  if (safeTitle !== undefined && safeTitle.length > 0) {
    source.title = safeTitle;
  }
  return { ok: true, source };
}

export function normalizeCapturedText(text: string, maxLength = 2_000): string {
  const normalized = text
    .trim()
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\s+/g, " ");
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 3))}...`
    : normalized;
}

export function formatPreview(result: CaptureResult): {
  summary: string;
  jsonPreview: string;
} {
  if (!result.ok) {
    return {
      summary: `Capture failed: ${result.errorKind}\nWarnings: ${result.warnings.length}`,
      jsonPreview: JSON.stringify(
        {
          ok: false,
          errorKind: result.errorKind,
          message: result.message,
          warnings: result.warnings
        },
        null,
        2
      )
    };
  }

  const sourceUrl = new URL(result.payload.source.url);
  const rows = result.payload.tables.map(
    (table) => `${table.id}: ${table.rowCount}x${table.columnCount}`
  );
  return {
    summary: [
      `Tables: ${result.payload.tables.length}`,
      `Source: ${sourceUrl.host}${sourceUrl.pathname}`,
      `Rows/columns: ${rows.join(", ")}`,
      `Warnings: ${result.warnings.length}`
    ].join("\n"),
    jsonPreview: JSON.stringify(result.payload, null, 2)
  };
}

export function createSampleCapturedPayload(): ExtensionBrowserDomPayload {
  const result = createPayloadFromCapturedTables({
    url: "https://example.com/orders?token=removed#section",
    title: "Orders",
    capturedAt: "2026-01-01T00:00:00.000Z",
    visibleTextSample: "Orders table",
    tables: [
      {
        id: "table-1",
        caption: "Orders",
        rowCount: 3,
        columnCount: 2,
        rows: [
          {
            cells: [
              { text: "Name", header: true },
              { text: "Value", header: true }
            ]
          },
          {
            cells: [
              { text: "北京 订单", header: false },
              { text: "42", header: false }
            ]
          },
          {
            cells: [
              { text: "Form field", header: false },
              { text: "[input value dropped]", header: false }
            ]
          }
        ],
        sourceFingerprint: "sample"
      }
    ]
  });

  if (!result.ok) {
    throw new Error("Sample payload should be valid");
  }
  return result.payload;
}

function limitTables(
  tables: ExtensionVisibleTable[],
  maxTables: number,
  maxCells: number,
  warnings: CaptureWarning[]
): ExtensionVisibleTable[] {
  const limited: ExtensionVisibleTable[] = [];
  let usedCells = 0;

  for (const table of tables) {
    if (limited.length >= maxTables) {
      warnings.push({
        code: "table_limit_reached",
        message: "Additional visible tables were omitted"
      });
      break;
    }

    const nextCells = table.rowCount * table.columnCount;
    if (usedCells + nextCells > maxCells) {
      warnings.push({
        code: "cell_limit_reached",
        message: "Additional visible tables were omitted after the cell limit"
      });
      break;
    }

    usedCells += nextCells;
    limited.push(table);
  }

  return limited;
}

function jsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
