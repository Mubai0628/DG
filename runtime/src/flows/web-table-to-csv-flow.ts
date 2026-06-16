import { stat } from "node:fs/promises";
import path from "node:path";

import { JsonlEventStore, replay, type EventRecord } from "../events/index.js";
import { ToolBroker } from "../tools/tool-broker.js";
import { type ToolBrokerErrorKind } from "../tools/types.js";
import { DraftWriter } from "../workspace/index.js";
import {
  validateBrowserDomPayload,
  webTableToCsv,
  type BrowserDomPayload
} from "../web/index.js";

import {
  type WebTableToCsvFlowInput,
  type WebTableToCsvFlowResult
} from "./types.js";

const flowTaskTitle = "web_table_to_csv";

export class WebTableToCsvFlowError extends Error {
  readonly kind: string;

  constructor(message: string, kind = "flow_failed") {
    super(message);
    this.name = "WebTableToCsvFlowError";
    this.kind = kind;
  }
}

export async function runWebTableToCsvFlow(
  input: WebTableToCsvFlowInput
): Promise<WebTableToCsvFlowResult> {
  const workspaceRoot = path.resolve(input.workspaceRoot);
  await assertExistingWorkspaceRoot(workspaceRoot);
  const payload = validateBrowserDomPayload(input.payload);
  const eventLogPath = path.resolve(
    input.eventLogPath ??
      path.join(workspaceRoot, ".deepseek-workbench", "events.jsonl")
  );
  const clock = input.clock ?? (() => new Date());
  const eventStore = new JsonlEventStore(eventLogPath, {
    clock,
    ...(input.idFactory !== undefined ? { idFactory: input.idFactory } : {})
  });
  const taskId = taskIdFromClock(clock);

  try {
    eventStore.appendEvent({
      type: "task.created",
      taskId,
      payload: taskPayload("created", payload)
    });
    eventStore.appendEvent({
      type: "task.started",
      taskId,
      payload: taskPayload("started", payload)
    });

    const csvResult = webTableToCsv({
      payload,
      eventStore,
      ...(input.tableId !== undefined ? { tableId: input.tableId } : {})
    });
    const filename = input.filename ?? csvResult.suggestedFilename;
    const draftWriter = new DraftWriter({
      policy: {
        rootPath: workspaceRoot,
        allowOverwrite: input.allowOverwrite ?? false
      },
      eventStore,
      clock
    });
    const broker = new ToolBroker({
      draftWriter,
      eventStore,
      clock
    });
    const toolResult = await broker.executeToolCall({
      id: "web-table-to-csv-write-draft",
      name: "fs.write_draft",
      rawArguments: JSON.stringify({
        filename,
        content: csvResult.csvContent,
        contentType: "text/csv",
        source: {
          kind: "browser.dom",
          tableId: csvResult.metadata.tableId,
          urlHost: csvResult.metadata.sourceHost
        },
        metadata: {
          rowCount: csvResult.metadata.rowCount,
          columnCount: csvResult.metadata.columnCount
        }
      }),
      source: {
        kind: "manual",
        toolCallId: "web-table-to-csv-write-draft"
      },
      taskId
    });

    if (toolResult.status !== "executed") {
      throw createDraftWriteFlowError(filename, toolResult.errorKind);
    }

    const draftSummary = draftSummaryFromToolResult(
      workspaceRoot,
      toolResult.resultSummary
    );
    eventStore.appendEvent({
      type: "task.completed",
      taskId,
      payload: {
        ...taskPayload("completed", payload),
        relativePath: draftSummary.relativePath,
        bytes: draftSummary.bytes,
        sha256: draftSummary.sha256
      }
    });

    const events = eventStore.listEvents();
    const replayState = replay(events);

    return {
      draft: draftSummary,
      extraction: {
        sourceHost: csvResult.metadata.sourceHost,
        sourcePathWithoutQuery: csvResult.metadata.sourcePathWithoutQuery,
        tableId: csvResult.metadata.tableId,
        rowCount: csvResult.metadata.rowCount,
        columnCount: csvResult.metadata.columnCount,
        warningCount: csvResult.metadata.warningCount,
        injectionRiskCount: csvResult.metadata.injectionRiskCount,
        formulaEscapedCount: csvResult.metadata.formulaEscapedCount
      },
      events: {
        eventCount: events.length,
        eventLogPath
      },
      replaySummary: {
        eventCount: replayState.eventCount,
        draftCount: replayState.draftCount,
        tasks: replayState.tasks
      },
      warnings: csvResult.warnings
    };
  } catch (error) {
    eventStore.appendEvent({
      type: "task.failed",
      taskId,
      payload: {
        ...taskPayload("failed", payload),
        errorKind:
          error instanceof WebTableToCsvFlowError
            ? error.kind
            : "unexpected_flow_error"
      }
    });
    throw error;
  } finally {
    eventStore.close?.();
  }
}

function createDraftWriteFlowError(
  filename: string,
  errorKind: ToolBrokerErrorKind | undefined
): WebTableToCsvFlowError {
  const safeRelativePath = `drafts/${filename}`;
  switch (errorKind) {
    case "file_exists":
      return new WebTableToCsvFlowError(
        `Draft already exists: ${safeRelativePath}. Choose a new draft filename or remove the existing file.`,
        "file_exists"
      );
    case "unsupported_extension":
      return new WebTableToCsvFlowError(
        "Draft filename must use an allowed .csv extension",
        "unsupported_extension"
      );
    case "unsupported_content_type":
      return new WebTableToCsvFlowError(
        "Draft content type is not supported",
        "unsupported_content_type"
      );
    case "draft_too_large":
      return new WebTableToCsvFlowError(
        "Draft content is too large",
        "draft_too_large"
      );
    case "secret_like_content_rejected":
      return new WebTableToCsvFlowError(
        "Draft content was rejected because it appears to contain a secret",
        "secret_like_content_rejected"
      );
    case "path_escape":
    case "absolute_path_rejected":
    case "parent_traversal_rejected":
    case "denied_path":
    case "invalid_filename":
    case "symlink_escape":
      return new WebTableToCsvFlowError(
        "Draft filename was rejected by the workspace path guard",
        errorKind
      );
    case "invalid_workspace_root":
      return new WebTableToCsvFlowError(
        "Workspace root must exist and be a directory",
        "invalid_workspace_root"
      );
    default:
      return new WebTableToCsvFlowError(
        "Draft write tool did not execute",
        errorKind ?? "draft_write_failed"
      );
  }
}

function taskPayload(
  status: "created" | "started" | "completed" | "failed",
  payload: BrowserDomPayload
): Record<string, unknown> {
  const url = new URL(payload.source.url);
  return {
    title: flowTaskTitle,
    status,
    sourceHost: url.host,
    sourcePathWithoutQuery: url.pathname.length > 0 ? url.pathname : "/",
    tableCount: payload.tables.length
  };
}

async function assertExistingWorkspaceRoot(
  workspaceRoot: string
): Promise<void> {
  const stats = await stat(workspaceRoot).catch(() => undefined);
  if (stats === undefined || !stats.isDirectory()) {
    throw new WebTableToCsvFlowError(
      "Workspace root must exist and be a directory",
      "invalid_workspace_root"
    );
  }
}

function taskIdFromClock(clock: () => Date): string {
  return `web-table-to-csv-${clock()
    .toISOString()
    .replace(/[^0-9]/g, "")}`;
}

function draftSummaryFromToolResult(
  workspaceRoot: string,
  resultSummary: Record<string, unknown> | undefined
): WebTableToCsvFlowResult["draft"] {
  if (resultSummary === undefined) {
    throw new WebTableToCsvFlowError("Draft result summary is missing");
  }

  const relativePath = stringField(resultSummary, "relativePath");
  const bytes = numberField(resultSummary, "bytes");
  const sha256 = stringField(resultSummary, "sha256");
  const contentType = stringField(resultSummary, "contentType");
  if (contentType !== "text/csv") {
    throw new WebTableToCsvFlowError("Draft result content type is invalid");
  }

  return {
    relativePath,
    absolutePath: path.join(workspaceRoot, relativePath),
    bytes,
    sha256,
    contentType
  };
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new WebTableToCsvFlowError(`Draft result ${key} is missing`);
  }
  return value;
}

function numberField(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new WebTableToCsvFlowError(`Draft result ${key} is missing`);
  }
  return value;
}

export function replayWebTableToCsvEventLog(
  events: readonly EventRecord[]
): ReturnType<typeof replay> {
  return replay(events);
}
