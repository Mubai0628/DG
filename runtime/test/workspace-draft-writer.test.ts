import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  access,
  mkdtemp,
  mkdir,
  realpath,
  rm,
  stat,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  DraftWriter,
  InMemoryEventStore,
  WorkspaceFsError,
  replay,
  createDemoEvents,
  type DraftContentType,
  type WorkspaceFsErrorKind
} from "../src/index.js";

const tempRoots: string[] = [];

async function createTempWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "dw-draft-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true }))
  );
});

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

async function expectWorkspaceError(
  action: Promise<unknown>,
  kind: WorkspaceFsErrorKind
): Promise<void> {
  await expect(action).rejects.toMatchObject({ kind });
}

describe("DraftWriter basic writes", () => {
  it("writes csv drafts under workspace drafts and returns a content-free result", async () => {
    const root = await createTempWorkspace();
    const writer = new DraftWriter({ policy: { rootPath: root } });
    const content = "name,value\nalpha,1\n";

    const result = await writer.writeDraft({
      filename: "table.csv",
      content,
      contentType: "text/csv"
    });

    expect(result.workspaceRoot).toBe(await pathReal(root));
    expect(result.relativePath).toBe("drafts/table.csv");
    expect(result.bytes).toBe(Buffer.byteLength(content, "utf8"));
    expect(result.sha256).toBe(sha256(content));
    expect(result.contentType).toBe("text/csv");
    expect(result.overwritten).toBe(false);
    await expect(access(result.absolutePath, constants.F_OK)).resolves.toBe(
      undefined
    );
    expect(JSON.stringify(result)).not.toContain("alpha,1");
  });

  it("does not overwrite by default", async () => {
    const root = await createTempWorkspace();
    const writer = new DraftWriter({ policy: { rootPath: root } });

    await writer.writeDraft({
      filename: "table.csv",
      content: "a\n1\n",
      contentType: "text/csv"
    });

    await expectWorkspaceError(
      writer.writeDraft({
        filename: "table.csv",
        content: "a\n2\n",
        contentType: "text/csv"
      }),
      "file_exists"
    );
  });

  it("overwrites only when policy allows it", async () => {
    const root = await createTempWorkspace();
    const writer = new DraftWriter({
      policy: { rootPath: root, allowOverwrite: true }
    });

    await writer.writeDraft({
      filename: "table.csv",
      content: "a\n1\n",
      contentType: "text/csv"
    });
    const result = await writer.writeDraft({
      filename: "table.csv",
      content: "a\n2\n",
      contentType: "text/csv"
    });

    expect(result.overwritten).toBe(true);
    expect(result.sha256).toBe(sha256("a\n2\n"));
  });

  it("rejects unsupported content types and non-csv extensions", async () => {
    const root = await createTempWorkspace();
    const writer = new DraftWriter({ policy: { rootPath: root } });

    await expectWorkspaceError(
      writer.writeDraft({
        filename: "table.csv",
        content: "{}",
        contentType: "application/json" as DraftContentType
      }),
      "unsupported_content_type"
    );
    await expectWorkspaceError(
      writer.writeDraft({
        filename: "table.txt",
        content: "a\n1\n",
        contentType: "text/csv"
      }),
      "unsupported_extension"
    );
  });
});

describe("DraftWriter path safety", () => {
  it("rejects traversal, nested paths, absolute paths, hidden names, and deny paths", async () => {
    const root = await createTempWorkspace();
    const writer = new DraftWriter({ policy: { rootPath: root } });
    const cases: Array<[string, WorkspaceFsErrorKind]> = [
      ["../evil.csv", "parent_traversal_rejected"],
      ["nested/evil.csv", "invalid_filename"],
      ["nested\\evil.csv", "invalid_filename"],
      [path.resolve(root, "evil.csv"), "absolute_path_rejected"],
      ["C:\\temp\\evil.csv", "absolute_path_rejected"],
      ["\\\\server\\share\\evil.csv", "absolute_path_rejected"],
      [".env", "invalid_filename"],
      [".hidden.csv", "invalid_filename"],
      ["id_rsa.csv", "denied_path"],
      ["secret.key.csv", "denied_path"]
    ];

    for (const [filename, kind] of cases) {
      await expectWorkspaceError(
        writer.writeDraft({
          filename,
          content: "a\n1\n",
          contentType: "text/csv"
        }),
        kind
      );
    }
  });

  it("requires an existing workspace root and creates drafts when missing", async () => {
    const root = await createTempWorkspace();
    const missingRoot = path.join(root, "missing");

    await expectWorkspaceError(
      new DraftWriter({ policy: { rootPath: missingRoot } }).writeDraft({
        filename: "table.csv",
        content: "a\n1\n",
        contentType: "text/csv"
      }),
      "invalid_workspace_root"
    );

    const result = await new DraftWriter({
      policy: { rootPath: root }
    }).writeDraft({
      filename: "table.csv",
      content: "a\n1\n",
      contentType: "text/csv"
    });

    expect((await stat(path.join(root, "drafts"))).isDirectory()).toBe(true);
    expect(result.relativePath).toBe("drafts/table.csv");
  });

  it("rejects drafts symlinks that point outside the workspace", async () => {
    const root = await createTempWorkspace();
    const outside = await createTempWorkspace();
    const draftsPath = path.join(root, "drafts");

    try {
      await symlink(
        outside,
        draftsPath,
        process.platform === "win32" ? "junction" : "dir"
      );
    } catch {
      return;
    }

    await expectWorkspaceError(
      new DraftWriter({ policy: { rootPath: root } }).writeDraft({
        filename: "table.csv",
        content: "a\n1\n",
        contentType: "text/csv"
      }),
      "symlink_escape"
    );
  });

  it("rejects existing draft targets that are symlinks", async () => {
    const root = await createTempWorkspace();
    const outside = await createTempWorkspace();
    const draftsPath = path.join(root, "drafts");
    await mkdir(draftsPath);
    await writeFile(path.join(outside, "target.csv"), "a\n1\n", "utf8");

    try {
      await symlink(
        path.join(outside, "target.csv"),
        path.join(draftsPath, "table.csv"),
        "file"
      );
    } catch {
      return;
    }

    await expectWorkspaceError(
      new DraftWriter({ policy: { rootPath: root } }).writeDraft({
        filename: "table.csv",
        content: "a\n1\n",
        contentType: "text/csv"
      }),
      "symlink_escape"
    );
  });
});

describe("DraftWriter event logging and secret handling", () => {
  it("logs fs.draft_written summaries without raw csv, full url query, or unsafe source fields", async () => {
    const root = await createTempWorkspace();
    const eventStore = new InMemoryEventStore({
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      idFactory: () => "event-1"
    });
    const rawDomKey = "raw" + "Dom";
    const rawPromptKey = "raw" + "Prompt";
    const writer = new DraftWriter({
      policy: { rootPath: root },
      eventStore
    });

    const result = await writer.writeDraft({
      filename: "table.csv",
      content: "name,value\nalpha,1\n",
      contentType: "text/csv",
      source: {
        kind: "browser.dom",
        tableId: "visible-table",
        url: "https://example.com/path?token=secret",
        [rawDomKey]: "<table>alpha</table>"
      },
      metadata: {
        rowCount: 1,
        columnCount: 2,
        [rawPromptKey]: "extract table"
      }
    });

    const events = eventStore.listEvents({ type: "fs.draft_written" });
    const payload = events[0]?.payload;
    const serialized = JSON.stringify(events);

    expect(events).toHaveLength(1);
    expect(payload).toMatchObject({
      relativePath: "drafts/table.csv",
      bytes: result.bytes,
      sha256: result.sha256,
      contentType: "text/csv",
      overwritten: false,
      sourceSummary: {
        kind: "browser.dom",
        tableId: "visible-table",
        urlHost: "example.com"
      },
      metadataSummary: {
        rowCount: 1,
        columnCount: 2
      }
    });
    expect(serialized).not.toContain("alpha,1");
    expect(serialized).not.toContain("token=secret");
    expect(serialized).not.toContain("<table>");
    expect(serialized).not.toContain("extract table");
  });

  it("rejects secret-like csv content without leaking the fake secret to errors or events", async () => {
    const root = await createTempWorkspace();
    const eventStore = new InMemoryEventStore();
    const writer = new DraftWriter({
      policy: { rootPath: root },
      eventStore
    });
    const bearer = "Bear" + "er abcdefghijklmnop";
    const apiKey = "s" + "k-1234567890abcdef";

    try {
      await writer.writeDraft({
        filename: "table.csv",
        content: `name,value\nbearer,${bearer}\nkey,${apiKey}\n`,
        contentType: "text/csv"
      });
      throw new Error("Expected writeDraft to reject secret-like content");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkspaceFsError);
      expect((error as WorkspaceFsError).kind).toBe(
        "secret_like_content_rejected"
      );
      expect((error as Error).message).not.toContain("abcdefghijklmnop");
      expect((error as Error).message).not.toContain("1234567890abcdef");
    }

    expect(JSON.stringify(eventStore.listEvents())).not.toContain(
      "abcdefghijklmnop"
    );
    expect(eventStore.listEvents({ type: "fs.draft_written" })).toHaveLength(0);
  });

  it("does not break replay demo draft counting", () => {
    expect(replay(createDemoEvents()).draftCount).toBe(1);
  });
});

async function pathReal(value: string): Promise<string> {
  return realpath(value);
}
