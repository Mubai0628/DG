import { constants } from "node:fs";
import { access, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createPayloadFromCapturedTables,
  createSampleCapturedPayload,
  formatPreview,
  normalizeCapturedText,
  sanitizeSourceFromUrl,
  type ExtensionBrowserDomPayload,
  type ExtensionVisibleTable
} from "../src/index.js";
import {
  DraftWriter,
  InMemoryEventStore,
  ToolBroker,
  validateBrowserDomPayload,
  webTableToCsv,
  type ToolCallRequest
} from "../../runtime/src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const extensionRoot = path.join(repoRoot, "browser-extension");
const tempRoots: string[] = [];

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function readSourceFiles(): Promise<
  Array<{ file: string; text: string }>
> {
  const files = [
    "capture-visible-tables.ts",
    "index.ts",
    "payload.ts",
    "popup.ts",
    "safety.ts"
  ];

  return Promise.all(
    files.map(async (file) => ({
      file,
      text: await readFile(path.join(extensionRoot, "src", file), "utf8")
    }))
  );
}

async function createTempWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "dw-browser-"));
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

function writeDraftCall(args: Record<string, unknown>): ToolCallRequest {
  return {
    id: "call-browser-table",
    name: "fs.write_draft",
    rawArguments: JSON.stringify(args),
    source: { kind: "test", toolCallId: "call-browser-table" }
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe("manifest safety", () => {
  it("uses only activeTab and scripting permissions without host permissions", async () => {
    const manifest = (await readJson(
      path.join(extensionRoot, "manifest.json")
    )) as {
      manifest_version?: number;
      permissions?: string[];
      host_permissions?: string[];
      content_scripts?: unknown;
      background?: unknown;
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions?.sort()).toEqual(["activeTab", "scripting"]);
    expect(manifest.host_permissions ?? []).toEqual([]);
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.background).toBeUndefined();

    const serialized = JSON.stringify(manifest);
    for (const forbidden of [
      "cookies",
      "storage",
      "downloads",
      "clipboardRead",
      "clipboardWrite",
      "tabs",
      "webRequest",
      "nativeMessaging",
      "<all_urls>"
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

describe("static source safety", () => {
  it("does not include forbidden browser or page-effect APIs", async () => {
    const sources = await readSourceFiles();
    const allSource = sources.map((source) => source.text).join("\n");

    for (const pattern of [
      /document\.cookie/,
      /localStorage/,
      /sessionStorage/,
      /chrome\.cookies/,
      /chrome\.storage/,
      /innerHTML/,
      /outerHTML/,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /\.click\s*\(/,
      /\.submit\s*\(/,
      /\.dispatchEvent\s*\(/
    ]) {
      expect(allSource).not.toMatch(pattern);
    }
  });

  it("keeps table DOM selectors confined to capture-visible-tables", async () => {
    const sources = await readSourceFiles();

    for (const source of sources) {
      const usesVisibleTableSelectors =
        /document\.querySelectorAll|getElementsByTagName/.test(source.text);
      if (source.file === "capture-visible-tables.ts") {
        expect(usesVisibleTableSelectors).toBe(true);
      } else {
        expect(usesVisibleTableSelectors).toBe(false);
      }
    }
  });

  it("does not read page form control values inside the capture function", async () => {
    const captureSource = await readFile(
      path.join(extensionRoot, "src", "capture-visible-tables.ts"),
      "utf8"
    );

    expect(captureSource).not.toMatch(/\.value\b/);
  });
});

describe("payload contract", () => {
  it("creates a sample payload accepted by runtime validation", () => {
    const payload = createSampleCapturedPayload();

    expect(validateBrowserDomPayload(payload).tables[0]?.id).toBe("table-1");
    expect(payload.source.url).toBe("https://example.com/orders");
    expect(payload.source.url).not.toContain("?");
    expect(payload.source.url).not.toContain("#");
    expect(payload.redaction).toEqual({
      passwordValuesDropped: true,
      inputValuesDropped: true,
      storageAccessed: false,
      cookiesAccessed: false,
      rawDomIncluded: false
    });
  });

  it("returns a safe unsupported scheme error", () => {
    expect(sanitizeSourceFromUrl("chrome://extensions")).toMatchObject({
      ok: false,
      errorKind: "unsupported_scheme"
    });
    expect(
      createPayloadFromCapturedTables({
        url: "file:///tmp/table.html",
        tables: []
      })
    ).toMatchObject({
      ok: false,
      errorKind: "unsupported_scheme"
    });
  });

  it("normalizes whitespace, preserves Unicode, and drops input values", () => {
    const payload = createSampleCapturedPayload();

    expect(normalizeCapturedText("  北京\n订单\t42  ")).toBe("北京 订单 42");
    expect(JSON.stringify(payload)).toContain("北京 订单");
    expect(JSON.stringify(payload)).toContain("[input value dropped]");
  });

  it("limits table and cell counts before returning a payload", () => {
    const oneCell = (id: string): ExtensionVisibleTable => ({
      id,
      rowCount: 1,
      columnCount: 1,
      rows: [{ cells: [{ text: id }] }]
    });

    const tooManyTables = createPayloadFromCapturedTables(
      {
        url: "https://example.com/tables",
        tables: [oneCell("a"), oneCell("b")]
      },
      { maxTables: 1 }
    );
    expect(tooManyTables).toMatchObject({ ok: true });
    if (tooManyTables.ok) {
      expect(tooManyTables.payload.tables).toHaveLength(1);
      expect(tooManyTables.warnings[0]?.code).toBe("table_limit_reached");
    }

    const tooManyCells = createPayloadFromCapturedTables(
      {
        url: "https://example.com/tables",
        tables: [oneCell("large")]
      },
      { maxCells: 0 }
    );
    expect(tooManyCells).toMatchObject({ ok: false });
    expect(tooManyCells.warnings[0]?.code).toBe("cell_limit_reached");
  });

  it("does not include unsafe payload keys outside required redaction flags", () => {
    const payload = createSampleCapturedPayload();
    const unsafe = collectUnsafeKeys(payload);

    expect(unsafe).toEqual([]);
  });
});

describe("popup preview helper", () => {
  it("formats a readonly preview summary without network, clipboard, or download side effects", () => {
    const preview = formatPreview({
      ok: true,
      payload: createSampleCapturedPayload(),
      warnings: []
    });

    expect(preview.summary).toContain("Tables: 1");
    expect(preview.summary).toContain("example.com/orders");
    expect(preview.jsonPreview).toContain('"schemaVersion": 1');
    expect(preview.jsonPreview).not.toContain("token=removed");
  });
});

describe("runtime contract integration", () => {
  it("runs extension fixture payload through webTableToCsv and fs.write_draft", async () => {
    const root = await createTempWorkspace();
    const eventStore = new InMemoryEventStore({
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      idFactory: () => "event-fixed"
    });
    const csvResult = webTableToCsv({
      payload: createSampleCapturedPayload(),
      eventStore
    });
    const broker = new ToolBroker({
      draftWriter: new DraftWriter({
        policy: { rootPath: root },
        eventStore
      }),
      eventStore,
      clock: () => new Date("2026-01-01T00:00:00.000Z")
    });

    const result = await broker.executeToolCall(
      writeDraftCall({
        filename: csvResult.suggestedFilename,
        content: csvResult.csvContent,
        contentType: "text/csv",
        source: {
          kind: "browser.dom",
          urlHost: csvResult.metadata.sourceHost,
          tableId: csvResult.metadata.tableId,
          url:
            csvResult.metadata.sourceOrigin +
            csvResult.metadata.sourcePathWithoutQuery
        },
        metadata: csvResult.metadata
      })
    );
    const serializedEvents = JSON.stringify(eventStore.listEvents());

    expect(result.status).toBe("executed");
    expect(
      await fileExists(
        path.join(await realpath(root), "drafts", csvResult.suggestedFilename)
      )
    ).toBe(true);
    expect(eventStore.listEvents().map((event) => event.type)).toEqual([
      "browser.dom.captured",
      "frame.redacted",
      "tool.proposed",
      "tool.approved",
      "fs.draft_written",
      "tool.executed"
    ]);
    expect(serializedEvents).not.toContain(csvResult.csvContent);
    expect(serializedEvents).not.toContain("token=removed");
    expect(serializedEvents).not.toContain("<table>");
    expect(serializedEvents).not.toContain("api key");
  });
});

function collectUnsafeKeys(payload: ExtensionBrowserDomPayload): string[] {
  const allowed = new Set([
    "redaction.cookiesAccessed",
    "redaction.storageAccessed",
    "redaction.rawDomIncluded",
    "redaction.passwordValuesDropped"
  ]);
  const unsafeFragments = [
    "cookie",
    "localstorage",
    "sessionstorage",
    "passwordvalue",
    "rawdom",
    "innerhtml",
    "outerhtml"
  ];
  const found: string[] = [];

  walk(payload, [], (pathParts, key) => {
    const pathText = pathParts.concat(key).join(".");
    if (allowed.has(pathText)) {
      return;
    }
    const lower = key.toLowerCase();
    if (unsafeFragments.some((fragment) => lower.includes(fragment))) {
      found.push(pathText);
    }
  });

  return found;
}

function walk(
  value: unknown,
  pathParts: string[],
  visit: (pathParts: string[], key: string) => void
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, pathParts, visit);
    }
    return;
  }
  if (typeof value !== "object" || value === null) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    visit(pathParts, key);
    walk(child, pathParts.concat(key), visit);
  }
}
