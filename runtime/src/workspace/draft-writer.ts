import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

import { redactContextText } from "../context/index.js";
import { type EventStore } from "../events/index.js";

import { WorkspaceFsError } from "./errors.js";
import { WorkspacePathGuard } from "./path-guard.js";
import {
  type DraftWriteRequest,
  type DraftWriteResult,
  type DraftWrittenEventPayload,
  type DraftWriterOptions,
  type NormalizedWorkspacePolicy
} from "./types.js";

export class DraftWriter {
  private readonly guard: WorkspacePathGuard;
  private readonly eventStore: EventStore | undefined;
  private readonly clock: () => Date;
  private readonly policy: NormalizedWorkspacePolicy;

  constructor(options: DraftWriterOptions) {
    this.guard = new WorkspacePathGuard({ policy: options.policy });
    this.policy = this.guard.policy;
    this.eventStore = options.eventStore;
    this.clock = options.clock ?? (() => new Date());
  }

  async writeDraft(request: DraftWriteRequest): Promise<DraftWriteResult> {
    if (request.contentType !== "text/csv") {
      throw new WorkspaceFsError(
        "unsupported_content_type",
        "Draft content type is not supported"
      );
    }

    const bytes = Buffer.byteLength(request.content, "utf8");
    if (bytes > this.policy.maxDraftBytes) {
      throw new WorkspaceFsError(
        "draft_too_large",
        "Draft content exceeds the configured size limit"
      );
    }

    if (redactContextText(request.content).secretBlocked) {
      throw new WorkspaceFsError(
        "secret_like_content_rejected",
        "Draft content contains secret-like text"
      );
    }

    const guardedPath = await this.guard.resolveDraftPath(request.filename);
    if (guardedPath.existed && !this.policy.allowOverwrite) {
      throw new WorkspaceFsError("file_exists", "Draft already exists");
    }

    try {
      await writeFile(guardedPath.absolutePath, request.content, {
        encoding: "utf8",
        flag: this.policy.allowOverwrite ? "w" : "wx"
      });
    } catch (error) {
      if (isNodeError(error) && error.code === "EEXIST") {
        throw new WorkspaceFsError("file_exists", "Draft already exists");
      }
      throw new WorkspaceFsError("io_error", "Draft write failed");
    }

    const result: DraftWriteResult = {
      workspaceRoot: guardedPath.workspaceRoot,
      relativePath: guardedPath.relativePath,
      absolutePath: guardedPath.absolutePath,
      bytes,
      sha256: sha256(request.content),
      contentType: request.contentType,
      createdAt: this.clock().toISOString(),
      overwritten: guardedPath.existed
    };

    this.logDraftWritten(result, request);
    return result;
  }

  private logDraftWritten(
    result: DraftWriteResult,
    request: DraftWriteRequest
  ): void {
    if (this.eventStore === undefined) {
      return;
    }

    const payload: DraftWrittenEventPayload = {
      relativePath: result.relativePath,
      bytes: result.bytes,
      sha256: result.sha256,
      contentType: result.contentType,
      overwritten: result.overwritten
    };
    const sourceSummary = summarizeSource(request.source);
    const metadataSummary = summarizeMetadata(request.metadata);

    if (sourceSummary !== undefined) {
      payload.sourceSummary = sourceSummary;
    }
    if (metadataSummary !== undefined) {
      payload.metadataSummary = metadataSummary;
    }

    this.eventStore.appendEvent({
      type: "fs.draft_written",
      payload
    });
  }
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function summarizeSource(
  source: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (source === undefined) {
    return undefined;
  }

  const summary: Record<string, unknown> = {};
  if (typeof source.kind === "string") {
    summary.kind = source.kind;
  }
  if (typeof source.tableId === "string") {
    summary.tableId = source.tableId;
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
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (metadata === undefined) {
    return undefined;
  }

  const summary: Record<string, unknown> = {};
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
