import { type CaptureResult } from "./payload.js";

export function captureVisibleTables(): CaptureResult {
  const maxTables = 20;
  const maxCells = 10_000;
  const maxCellText = 2_000;
  const maxNearbyText = 300;

  function normalizeText(text: string, maxLength: number): string {
    const normalized = text
      .trim()
      .replace(/\r\n|\r|\n/g, " ")
      .replace(/\s+/g, " ");
    return normalized.length > maxLength
      ? `${normalized.slice(0, Math.max(0, maxLength - 1))}...`
      : normalized;
  }

  function sourceFromPage():
    | {
        ok: true;
        source: {
          kind: "browser_active_tab";
          url: string;
          title?: string;
          origin?: string;
        };
      }
    | { ok: false; message: string } {
    let url: URL;
    try {
      url = new URL(globalThis.location.href);
    } catch {
      return {
        ok: false,
        message: "Only http and https pages can be captured"
      };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        ok: false,
        message: "Only http and https pages can be captured"
      };
    }

    const source: {
      kind: "browser_active_tab";
      url: string;
      title?: string;
      origin?: string;
    } = {
      kind: "browser_active_tab",
      url: `${url.origin}${url.pathname}`,
      origin: url.origin
    };
    const title = normalizeText(globalThis.document.title, 200);
    if (title.length > 0) {
      source.title = title;
    }
    return { ok: true, source };
  }

  function isVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }
    if (
      rect.bottom <= 0 ||
      rect.right <= 0 ||
      rect.top >= globalThis.innerHeight ||
      rect.left >= globalThis.innerWidth
    ) {
      return false;
    }

    const style = globalThis.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  }

  function hasFormControl(element: Element): boolean {
    return (
      element.getElementsByTagName("input").length > 0 ||
      element.getElementsByTagName("select").length > 0 ||
      element.getElementsByTagName("textarea").length > 0 ||
      element.getElementsByTagName("button").length > 0
    );
  }

  function cellText(cell: HTMLTableCellElement): {
    text: string;
    inputDropped: boolean;
    truncated: boolean;
  } {
    const inputDropped = hasFormControl(cell);
    const baseText = normalizeText(cell.textContent ?? "", maxCellText);
    const text =
      inputDropped && baseText.length === 0
        ? "[input value dropped]"
        : inputDropped
          ? `${baseText} [input value dropped]`
          : baseText;

    return {
      text,
      inputDropped,
      truncated: (cell.textContent ?? "").length > maxCellText
    };
  }

  function nearbyText(tableElement: HTMLTableElement): string | undefined {
    const candidates = [
      tableElement.previousElementSibling,
      tableElement.nextElementSibling
    ];
    for (const candidate of candidates) {
      if (candidate !== null) {
        const text = normalizeText(candidate.textContent ?? "", maxNearbyText);
        if (text.length > 0) {
          return text;
        }
      }
    }
    return undefined;
  }

  function simpleHash(text: string): string {
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  const source = sourceFromPage();
  if (!source.ok) {
    return {
      ok: false,
      errorKind: "unsupported_scheme",
      message: source.message,
      warnings: []
    };
  }

  const warnings: NonNullable<CaptureResult["warnings"]> = [];
  const allTables = Array.from(globalThis.document.querySelectorAll("table"));
  const tables: NonNullable<
    Extract<CaptureResult, { ok: true }>["payload"]["tables"]
  > = [];
  let totalCells = 0;

  for (const [tableIndex, tableElement] of allTables.entries()) {
    if (tables.length >= maxTables) {
      warnings.push({
        code: "table_limit_reached",
        message: "Additional visible tables were omitted"
      });
      break;
    }
    if (!isVisible(tableElement)) {
      continue;
    }

    const rows: NonNullable<
      Extract<CaptureResult, { ok: true }>["payload"]["tables"][number]["rows"]
    > = [];
    let columnCount = 0;
    for (const rowElement of Array.from(tableElement.rows)) {
      if (!isVisible(rowElement)) {
        continue;
      }

      const cells = Array.from(rowElement.cells).map((cell) => {
        const textResult = cellText(cell);
        if (textResult.inputDropped) {
          warnings.push({
            code: "input_value_dropped",
            message: "A form control value was dropped",
            tableId: `table-${tableIndex + 1}`
          });
        }
        if (textResult.truncated) {
          warnings.push({
            code: "cell_text_truncated",
            message: "A table cell text value was truncated",
            tableId: `table-${tableIndex + 1}`
          });
        }

        return {
          text: textResult.text,
          header: cell.tagName.toLowerCase() === "th",
          rowSpan: Math.max(1, cell.rowSpan),
          colSpan: Math.max(1, cell.colSpan),
          ...(cell.getAttribute("aria-label") !== null
            ? {
                ariaLabel: normalizeText(
                  cell.getAttribute("aria-label") ?? "",
                  200
                )
              }
            : {})
        };
      });
      const expandedWidth = cells.reduce(
        (total, cell) => total + (cell.colSpan ?? 1),
        0
      );
      columnCount = Math.max(columnCount, expandedWidth);
      rows.push({ cells });
    }

    if (rows.length === 0 || columnCount === 0) {
      continue;
    }

    const nextCellCount = rows.length * columnCount;
    if (totalCells + nextCellCount > maxCells) {
      warnings.push({
        code: "cell_limit_reached",
        message: "Additional visible tables were omitted after the cell limit"
      });
      break;
    }
    totalCells += nextCellCount;

    for (const row of rows) {
      let width = row.cells.reduce(
        (total, cell) => total + (cell.colSpan ?? 1),
        0
      );
      while (width < columnCount) {
        row.cells.push({ text: "", header: false });
        width += 1;
      }
    }

    const captionText =
      tableElement.caption === null
        ? undefined
        : normalizeText(tableElement.caption.textContent ?? "", 300);
    const ariaLabel = tableElement.getAttribute("aria-label");
    const tableId =
      tableElement.id.trim().length > 0
        ? normalizeText(tableElement.id, 80)
        : `table-${tableIndex + 1}`;
    const sourceFingerprint = simpleHash(
      `${source.source.url}:${tableId}:${rows.length}:${columnCount}`
    );
    const nearby = nearbyText(tableElement);

    tables.push({
      id: tableId,
      ...(captionText !== undefined && captionText.length > 0
        ? { caption: captionText }
        : {}),
      ...(ariaLabel !== null
        ? { ariaLabel: normalizeText(ariaLabel, 200) }
        : {}),
      ...(nearby !== undefined ? { nearbyText: nearby } : {}),
      rowCount: rows.length,
      columnCount,
      rows,
      sourceFingerprint
    });
  }

  if (tables.length === 0) {
    return {
      ok: false,
      errorKind: "no_visible_tables",
      message: "No visible tables were found in the active tab viewport",
      warnings
    };
  }

  const visibleTextSample = normalizeText(
    tables
      .flatMap((table) =>
        table.rows.flatMap((row) => row.cells.map((cell) => cell.text))
      )
      .join(" "),
    500
  );

  return {
    ok: true,
    payload: {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      source: source.source,
      ...(visibleTextSample.length > 0 ? { visibleTextSample } : {}),
      tables,
      redaction: {
        passwordValuesDropped: true,
        inputValuesDropped: true,
        storageAccessed: false,
        cookiesAccessed: false,
        rawDomIncluded: false
      }
    },
    warnings
  };
}
