import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  JsonlEventStore,
  replay,
  runWebTableToCsvFlow
} from "../../runtime/dist/index.js";

import { scanEventLogForLeaks } from "./leak-scanner.mjs";

const evalDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(evalDir, "../..");
const defaultCasesDir = path.join(evalDir, "cases");
const defaultOutputRoot = path.join(
  repoRoot,
  ".tmp",
  "evals",
  "web-table-to-csv"
);
const defaultReportPath = path.join(
  repoRoot,
  ".tmp",
  "evals",
  "reports",
  "web-table-to-csv-report.json"
);

export async function runWebTableToCsvEval(options = {}) {
  const startedAt = Date.now();
  const casesDir = path.resolve(options.casesDir ?? defaultCasesDir);
  const outputRoot = path.resolve(options.outputRoot ?? defaultOutputRoot);
  const reportPath = path.resolve(options.reportPath ?? defaultReportPath);
  const cases = await loadEvalCases(casesDir);

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const caseResults = [];
  for (const evalCase of cases) {
    caseResults.push(await runCase(evalCase, outputRoot));
  }

  const summary = summarizeResults(caseResults, Date.now() - startedAt);
  const report = {
    ...summary,
    cases: caseResults.map((result) => result.report)
  };

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    ok: summary.failed === 0,
    reportPath,
    summary,
    cases: caseResults
  };
}

export async function loadEvalCases(casesDir = defaultCasesDir) {
  const caseIndex = JSON.parse(
    await readFile(path.join(casesDir, "index.json"), "utf8")
  );
  const cases = [];
  for (const file of caseIndex.files) {
    cases.push(JSON.parse(await readFile(path.join(casesDir, file), "utf8")));
  }
  return cases;
}

async function runCase(evalCase, outputRoot) {
  const caseWorkspace = path.join(outputRoot, evalCase.id);
  const eventLogPath = path.join(
    caseWorkspace,
    ".deepseek-workbench",
    "events.jsonl"
  );
  await mkdir(caseWorkspace, { recursive: true });

  const expected = evalCase.expected;
  const forbiddenValues = expected.mustNotContainInEvents ?? [];
  const report = {
    id: evalCase.id,
    description: evalCase.description,
    status: "FAIL",
    expectedStatus: expected.status,
    draftWritten: false,
    expectedDraftWritten: expected.draftWritten,
    rowCount: null,
    columnCount: null,
    selectedTableId: null,
    formulaEscapedCount: 0,
    injectionRiskCount: 0,
    eventCount: 0,
    replayDraftCount: 0,
    warningCount: 0,
    leakageFindings: [],
    safeReason: null
  };

  try {
    const flowResult = await runWebTableToCsvFlow({
      workspaceRoot: caseWorkspace,
      payload: evalCase.payload,
      eventLogPath,
      ...(evalCase.options?.filename !== undefined
        ? { filename: evalCase.options.filename }
        : {}),
      ...(evalCase.options?.tableId !== undefined
        ? { tableId: evalCase.options.tableId }
        : {}),
      allowOverwrite: false,
      clock: () => new Date("2026-01-01T00:00:00.000Z")
    });
    const csvText = await readFile(flowResult.draft.absolutePath, "utf8");
    const eventsText = await readFile(eventLogPath, "utf8");
    const events = new JsonlEventStore(eventLogPath).listEvents();
    const replayState = replay(events);
    const leakage = scanEventLogForLeaks(eventsText, forbiddenValues);
    const failures = [
      ...assertSuccessExpectations(expected, flowResult, csvText, replayState),
      ...(leakage.ok ? [] : ["event log leakage detected"])
    ];

    Object.assign(report, {
      status:
        failures.length === 0 && expected.status === "pass" ? "PASS" : "FAIL",
      draftWritten: true,
      rowCount: flowResult.extraction.rowCount,
      columnCount: flowResult.extraction.columnCount,
      selectedTableId: flowResult.extraction.tableId,
      formulaEscapedCount: flowResult.extraction.formulaEscapedCount,
      injectionRiskCount: flowResult.extraction.injectionRiskCount,
      eventCount: flowResult.events.eventCount,
      replayDraftCount: replayState.draftCount,
      warningCount: flowResult.warnings.length,
      leakageFindings: leakage.findings,
      safeReason: failures.join("; ") || null
    });
  } catch (error) {
    const draftFiles = await listDraftFiles(caseWorkspace);
    const expectedReject = expected.status === "reject";
    Object.assign(report, {
      status:
        expectedReject &&
        draftFiles.length === 0 &&
        expected.draftWritten === false
          ? "PASS"
          : "FAIL",
      draftWritten: draftFiles.length > 0,
      safeReason:
        expectedReject && draftFiles.length === 0
          ? "rejected as expected"
          : safeErrorReason(error)
    });
  }

  return {
    id: evalCase.id,
    ok: report.status === "PASS",
    report
  };
}

function assertSuccessExpectations(expected, flowResult, csvText, replayState) {
  const failures = [];
  if (expected.status !== "pass") {
    failures.push("case succeeded but expected rejection");
  }
  if (expected.draftWritten !== true) {
    failures.push("draft was written but expected no draft");
  }
  if (
    expected.rowCount !== undefined &&
    flowResult.extraction.rowCount !== expected.rowCount
  ) {
    failures.push("row count mismatch");
  }
  if (
    expected.columnCount !== undefined &&
    flowResult.extraction.columnCount !== expected.columnCount
  ) {
    failures.push("column count mismatch");
  }
  if (
    expected.selectedTableId !== undefined &&
    flowResult.extraction.tableId !== expected.selectedTableId
  ) {
    failures.push("selected table mismatch");
  }
  if (
    expected.formulaEscapedMin !== undefined &&
    flowResult.extraction.formulaEscapedCount < expected.formulaEscapedMin
  ) {
    failures.push("formula escaped count too low");
  }
  if (
    expected.injectionRiskMin !== undefined &&
    flowResult.extraction.injectionRiskCount < expected.injectionRiskMin
  ) {
    failures.push("injection risk count too low");
  }
  for (const value of expected.mustContainInCsv ?? []) {
    if (!csvText.includes(value)) {
      failures.push("expected CSV marker missing");
    }
  }
  for (const value of expected.mustNotContainInCsv ?? []) {
    if (csvText.includes(value)) {
      failures.push("unexpected CSV marker present");
    }
  }
  if (replayState.draftCount < 1) {
    failures.push("replay draft count missing");
  }
  return failures;
}

function summarizeResults(caseResults, durationMs) {
  const reports = caseResults.map((result) => result.report);
  return {
    totalCases: reports.length,
    passed: reports.filter((report) => report.status === "PASS").length,
    failed: reports.filter((report) => report.status !== "PASS").length,
    rejectedExpected: reports.filter(
      (report) =>
        report.expectedStatus === "reject" &&
        report.status === "PASS" &&
        report.draftWritten === false
    ).length,
    rejectedUnexpected: reports.filter(
      (report) =>
        report.expectedStatus === "pass" &&
        report.status !== "PASS" &&
        report.draftWritten === false
    ).length,
    draftsWritten: reports.filter((report) => report.draftWritten).length,
    leakageFailures: reports.filter(
      (report) => report.leakageFindings.length > 0
    ).length,
    totalWarnings: sum(reports, "warningCount"),
    totalInjectionRisks: sum(reports, "injectionRiskCount"),
    totalFormulaEscaped: sum(reports, "formulaEscapedCount"),
    durationMs
  };
}

async function listDraftFiles(caseWorkspace) {
  const draftsDir = path.join(caseWorkspace, "drafts");
  try {
    return await readdir(draftsDir);
  } catch {
    return [];
  }
}

function sum(reports, key) {
  return reports.reduce((total, report) => total + (report[key] ?? 0), 0);
}

function safeErrorReason(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return "eval case failed";
}

export function printEvalSummary(result) {
  console.log("Web table to CSV eval");
  console.log(`status: ${result.ok ? "PASS" : "FAIL"}`);
  console.log(`cases: ${result.summary.totalCases}`);
  console.log(`passed: ${result.summary.passed}`);
  console.log(`failed: ${result.summary.failed}`);
  console.log(`drafts written: ${result.summary.draftsWritten}`);
  console.log(`leakage failures: ${result.summary.leakageFailures}`);
  console.log(`warnings: ${result.summary.totalWarnings}`);
  console.log(`injection risks: ${result.summary.totalInjectionRisks}`);
  console.log(`formula escaped: ${result.summary.totalFormulaEscaped}`);
  console.log(`report: ${result.reportPath}`);
}

export function parseEvalArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--":
        break;
      case "--cases-dir":
        options.casesDir = requireValue(argv, index, arg);
        index += 1;
        break;
      case "--output-root":
        options.outputRoot = requireValue(argv, index, arg);
        index += 1;
        break;
      case "--report-path":
        options.reportPath = requireValue(argv, index, arg);
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}
