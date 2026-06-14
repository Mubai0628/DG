import { createHash } from "node:crypto";

import { WebExtractionError } from "./errors.js";
import {
  type CsvBuildOptions,
  type CsvBuildResult,
  type ExtractedTable
} from "./types.js";

export function buildCsvFromTable(
  table: ExtractedTable,
  options: CsvBuildOptions = {}
): CsvBuildResult {
  const lineEnding = options.lineEnding === "CRLF" ? "\r\n" : "\n";
  const formulaEscape = options.formulaEscape ?? "single_quote";
  let formulaEscapedCount = 0;

  try {
    const lines = table.rows.map((row) =>
      row
        .map((cell) => {
          const escaped = escapeFormula(cell.text, formulaEscape);
          if (escaped.escaped) {
            formulaEscapedCount += 1;
          }
          return csvField(escaped.text);
        })
        .join(",")
    );
    const content = lines.join(lineEnding);

    return {
      content,
      rowCount: table.rowCount,
      columnCount: table.columnCount,
      bytes: Buffer.byteLength(content, "utf8"),
      sha256: sha256(content),
      formulaEscapedCount
    };
  } catch {
    throw new WebExtractionError("csv_build_failed", "CSV build failed");
  }
}

function escapeFormula(
  value: string,
  mode: NonNullable<CsvBuildOptions["formulaEscape"]>
): { text: string; escaped: boolean } {
  if (mode === "none" || value.length === 0) {
    return { text: value, escaped: false };
  }

  if (!["=", "+", "-", "@"].includes(value[0] ?? "")) {
    return { text: value, escaped: false };
  }

  return {
    text: `${mode === "tab" ? "\t" : "'"}${value}`,
    escaped: true
  };
}

function csvField(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
