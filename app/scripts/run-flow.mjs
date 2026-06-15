#!/usr/bin/env node
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runWebTableToCsvFlow } from "../../runtime/dist/index.js";

export const maxPayloadFileBytes = 2_000_000;

export async function main(argv) {
  const parsed = await parseArgs(argv);
  if (parsed.error !== undefined) {
    throw new Error(parsed.error);
  }

  const payloadText = await readPayloadText(parsed.payloadPath);
  const payload = JSON.parse(payloadText);
  const result = await runWebTableToCsvFlow({
    workspaceRoot: parsed.workspaceRoot,
    payload,
    ...(parsed.filename !== undefined ? { filename: parsed.filename } : {}),
    allowOverwrite: parsed.allowOverwrite
  });

  console.log(JSON.stringify(toDesktopSummary(result)));
}

export function toDesktopSummary(result) {
  const summary = {
    draft: result.draft,
    extraction: {
      rowCount: result.extraction.rowCount,
      columnCount: result.extraction.columnCount,
      warningCount: result.extraction.warningCount,
      injectionRiskCount: result.extraction.injectionRiskCount,
      formulaEscapedCount: result.extraction.formulaEscapedCount
    },
    events: result.events,
    replaySummary: {
      draftCount: result.replaySummary.draftCount
    }
  };
  assertSafeSummary(summary);
  return summary;
}

export async function parseArgs(argv) {
  const parsed = {
    allowOverwrite: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
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
    return parsed;
  }

  parsed.workspaceRoot = await canonicalDirectory(parsed.workspaceRoot);
  parsed.payloadPath = await canonicalFile(parsed.payloadPath);

  return parsed;
}

export function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export async function readPayloadText(payloadPath) {
  const payloadStat = await stat(payloadPath);
  if (payloadStat.size > maxPayloadFileBytes) {
    throw new Error("Payload file is too large");
  }
  return readFile(payloadPath, "utf8");
}

async function canonicalDirectory(inputPath) {
  const resolved = await realpath(path.resolve(inputPath));
  const entry = await stat(resolved);
  if (!entry.isDirectory()) {
    throw new Error("Workspace root must exist and be a directory");
  }
  return resolved;
}

async function canonicalFile(inputPath) {
  const resolved = await realpath(path.resolve(inputPath));
  const entry = await stat(resolved);
  if (!entry.isFile()) {
    throw new Error("Payload path must be a file");
  }
  return resolved;
}

export function safeErrorMessage(error) {
  const message =
    error instanceof Error ? error.message : "Desktop runner failed";
  return message
    .replace(/\bAuthorization\s*:\s*[^\r\n]+/gi, "[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}\b/gi, "[redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gi, "[redacted]")
    .slice(0, 400);
}

function assertSafeSummary(summary) {
  const serialized = JSON.stringify(summary);
  const forbiddenPatterns = [
    /\bcsvContent\b/i,
    /\brawCsv\b/i,
    /\brawDom\b/i,
    /\brawPrompt\b/i,
    /\brawScreenshot\b/i,
    /\bclipboard\b/i,
    /\bAuthorization\b/i,
    /\bBearer\s+[A-Za-z0-9._-]{8,}\b/i,
    /\bsk-[A-Za-z0-9_-]{8,}\b/i,
    /\?[A-Za-z0-9_-]+=/
  ];
  if (forbiddenPatterns.some((pattern) => pattern.test(serialized))) {
    throw new Error("Desktop runner summary failed safety validation");
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Desktop runner failed: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  });
}
