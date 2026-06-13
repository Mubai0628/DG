import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  type ConformanceCaseResult,
  type ConformanceStatus,
  type ConformanceSummary
} from "./types.js";
import { redactForReport } from "./redaction.js";

export function summarizeResults(
  mode: "dry" | "live",
  results: ConformanceCaseResult[]
): ConformanceSummary {
  const status: ConformanceStatus = results.some(
    (result) => result.status === "FAIL"
  )
    ? "FAIL"
    : results.some((result) => result.status === "INCONCLUSIVE")
      ? "INCONCLUSIVE"
      : results.every((result) => result.status === "SKIPPED")
        ? "SKIPPED"
        : "PASS";

  return redactForReport({ mode, status, results }) as ConformanceSummary;
}

export function writeRedactedSummary(
  filePath: string,
  summary: ConformanceSummary
): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    `${JSON.stringify(redactForReport(summary), null, 2)}\n`
  );
}

export function formatSummary(summary: ConformanceSummary): string {
  const lines = [
    `Conformance ${summary.mode}`,
    `status: ${summary.status}`,
    `cases: ${summary.results.length}`
  ];

  for (const result of summary.results) {
    lines.push(`${result.caseId}: ${result.status}`);
  }

  return lines.join("\n");
}
