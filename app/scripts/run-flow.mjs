#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

import { runWebTableToCsvFlow } from "../../runtime/dist/index.js";

async function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error !== undefined) {
    throw new Error(parsed.error);
  }

  const payloadText = await readFile(parsed.payloadPath, "utf8");
  const payload = JSON.parse(payloadText);
  const result = await runWebTableToCsvFlow({
    workspaceRoot: parsed.workspaceRoot,
    payload,
    ...(parsed.filename !== undefined ? { filename: parsed.filename } : {}),
    allowOverwrite: parsed.allowOverwrite
  });

  console.log(JSON.stringify(toDesktopSummary(result)));
}

function toDesktopSummary(result) {
  return {
    draft: result.draft,
    extraction: result.extraction,
    events: result.events,
    replaySummary: result.replaySummary
  };
}

function parseArgs(argv) {
  const parsed = {
    allowOverwrite: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--workspace":
        parsed.workspaceRoot = path.resolve(requireValue(argv, index, arg));
        index += 1;
        break;
      case "--payload":
        parsed.payloadPath = path.resolve(requireValue(argv, index, arg));
        index += 1;
        break;
      case "--filename":
        parsed.filename = requireValue(argv, index, arg);
        index += 1;
        break;
      case "--allow-overwrite":
        parsed.allowOverwrite = true;
        break;
      default:
        parsed.error = "Unsupported desktop runner argument";
        return parsed;
    }
  }

  if (parsed.workspaceRoot === undefined || parsed.payloadPath === undefined) {
    parsed.error = "Desktop runner requires workspace and payload paths";
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
  const message =
    error instanceof Error ? error.message : "Desktop runner failed";
  return message
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}\b/gi, "[redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gi, "[redacted]")
    .slice(0, 400);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`Desktop runner failed: ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});
