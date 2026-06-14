#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

import { runWebTableToCsvFlow } from "../runtime/dist/index.js";

const helpText = `Web table to CSV

Usage:
  pnpm run web-table-to-csv -- --workspace <path> --payload <path> [options]

Required:
  --workspace <path>    Existing local workspace root.
  --payload <path>      Sanitized BrowserDomPayload JSON file.

Options:
  --filename <name>     Draft filename under workspace/drafts.
  --table-id <id>       Capture table id to export.
  --event-log <path>    JSONL event log path.
  --allow-overwrite     Allow replacing an existing draft file.
  --help                Show this help.
`;

async function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    console.log(helpText.trimEnd());
    return 0;
  }
  if (parsed.error !== undefined) {
    console.error(parsed.error);
    return 1;
  }

  try {
    const payloadText = await readFile(parsed.payloadPath, "utf8");
    const payload = JSON.parse(payloadText);
    const result = await runWebTableToCsvFlow({
      workspaceRoot: parsed.workspaceRoot,
      payload,
      ...(parsed.filename !== undefined ? { filename: parsed.filename } : {}),
      ...(parsed.tableId !== undefined ? { tableId: parsed.tableId } : {}),
      ...(parsed.eventLogPath !== undefined
        ? { eventLogPath: parsed.eventLogPath }
        : {}),
      allowOverwrite: parsed.allowOverwrite
    });

    console.log("Web table to CSV");
    console.log(`draft: ${result.draft.relativePath}`);
    console.log(
      `rows/columns: ${result.extraction.rowCount}/${result.extraction.columnCount}`
    );
    console.log(`events written: ${result.events.eventCount}`);
    console.log(`warnings: ${result.warnings.length}`);
    console.log(`replay draft count: ${result.replaySummary.draftCount}`);
    console.log(`event log: ${result.events.eventLogPath}`);
    return 0;
  } catch (error) {
    console.error(`Web table to CSV failed: ${safeErrorMessage(error)}`);
    return 1;
  }
}

function parseArgs(argv) {
  const parsed = {
    help: false,
    allowOverwrite: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--":
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--allow-overwrite":
        parsed.allowOverwrite = true;
        break;
      case "--workspace":
        parsed.workspaceRoot = requireValue(argv, index, arg);
        index += 1;
        break;
      case "--payload":
        parsed.payloadPath = requireValue(argv, index, arg);
        index += 1;
        break;
      case "--filename":
        parsed.filename = requireValue(argv, index, arg);
        index += 1;
        break;
      case "--table-id":
        parsed.tableId = requireValue(argv, index, arg);
        index += 1;
        break;
      case "--event-log":
        parsed.eventLogPath = requireValue(argv, index, arg);
        index += 1;
        break;
      default:
        parsed.error = `Unknown argument: ${arg}`;
        return parsed;
    }
  }

  if (parsed.help) {
    return parsed;
  }
  if (parsed.workspaceRoot === undefined || parsed.payloadPath === undefined) {
    parsed.error = "Missing required --workspace and --payload arguments";
    return parsed;
  }

  parsed.workspaceRoot = path.resolve(parsed.workspaceRoot);
  parsed.payloadPath = path.resolve(parsed.payloadPath);
  if (parsed.eventLogPath !== undefined) {
    parsed.eventLogPath = path.resolve(parsed.eventLogPath);
  }

  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function safeErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

main(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(`Web table to CSV failed: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  });
