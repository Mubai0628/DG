import {
  type DraftWriteRequest,
  type DraftWriteResult
} from "../workspace/index.js";

import {
  type ToolArgumentSummary,
  type ToolDefinitionRuntime,
  type ToolValidationResult
} from "./types.js";

export function createFsWriteDraftTool(draftWriter: {
  writeDraft(request: DraftWriteRequest): Promise<DraftWriteResult>;
}): ToolDefinitionRuntime {
  return {
    name: "fs.write_draft",
    riskLevel: "A2_draft_write",
    validateArguments: validateFsWriteDraftArguments,
    async execute(argumentsValue) {
      const result = await draftWriter.writeDraft(argumentsValue);
      return summarizeDraftResult(result);
    }
  };
}

export function validateFsWriteDraftArguments(
  value: Record<string, unknown>
): ToolValidationResult {
  const filename = value.filename;
  const content = value.content;
  const contentType = value.contentType;

  if (typeof contentType !== "string" || contentType !== "text/csv") {
    return {
      ok: false,
      errorKind: "unsupported_content_type",
      message: "Tool contentType must be text/csv",
      argumentSummary: summarizeFsWriteDraftArguments(value)
    };
  }
  if (typeof filename !== "string" || filename.length === 0) {
    return {
      ok: false,
      errorKind: "invalid_arguments_shape",
      message: "Tool filename must be a string",
      argumentSummary: summarizeFsWriteDraftArguments(value)
    };
  }
  if (typeof content !== "string") {
    return {
      ok: false,
      errorKind: "invalid_arguments_shape",
      message: "Tool content must be a string",
      argumentSummary: summarizeFsWriteDraftArguments(value)
    };
  }

  return {
    ok: true,
    value: {
      filename,
      content,
      contentType,
      ...(isRecord(value.source) ? { source: value.source } : {}),
      ...(isRecord(value.metadata) ? { metadata: value.metadata } : {})
    },
    argumentSummary: summarizeFsWriteDraftArguments(value)
  };
}

export function summarizeFsWriteDraftArguments(
  value: Record<string, unknown>
): ToolArgumentSummary {
  const summary: ToolArgumentSummary = {};

  if (typeof value.filename === "string") {
    summary.filename = value.filename;
  }
  if (typeof value.contentType === "string") {
    summary.contentType = value.contentType;
  }
  if (typeof value.content === "string") {
    summary.contentBytes = Buffer.byteLength(value.content, "utf8");
  }
  if (isRecord(value.source)) {
    const sourceSummary = summarizeSource(value.source);
    if (sourceSummary !== undefined) {
      summary.source = sourceSummary;
    }
  }
  if (isRecord(value.metadata)) {
    const metadataSummary = summarizeMetadata(value.metadata);
    if (metadataSummary !== undefined) {
      summary.metadata = metadataSummary;
    }
  }

  return summary;
}

function summarizeDraftResult(
  result: DraftWriteResult
): Record<string, unknown> {
  return {
    relativePath: result.relativePath,
    bytes: result.bytes,
    sha256: result.sha256,
    contentType: result.contentType,
    overwritten: result.overwritten
  };
}

function summarizeSource(
  source: Record<string, unknown>
): ToolArgumentSummary["source"] | undefined {
  const summary: NonNullable<ToolArgumentSummary["source"]> = {};
  if (typeof source.kind === "string") {
    summary.kind = source.kind;
  }
  if (typeof source.urlHost === "string") {
    summary.urlHost = source.urlHost;
  } else if (typeof source.url === "string") {
    const host = safeUrlHost(source.url);
    if (host !== undefined) {
      summary.urlHost = host;
    }
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
}

function summarizeMetadata(
  metadata: Record<string, unknown>
): ToolArgumentSummary["metadata"] | undefined {
  const summary: NonNullable<ToolArgumentSummary["metadata"]> = {};
  if (isFiniteNumber(metadata.rowCount)) {
    summary.rowCount = metadata.rowCount;
  }
  if (isFiniteNumber(metadata.columnCount)) {
    summary.columnCount = metadata.columnCount;
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
}

function safeUrlHost(value: string): string | undefined {
  try {
    return new URL(value).host;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
