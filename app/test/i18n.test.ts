import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { translate } from "../src/shell/i18n/index.js";
import { zhDictionary } from "../src/shell/i18n/zh.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const shellDir = path.resolve(testDir, "..", "src", "shell");

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "i18n") {
        continue;
      }
      files.push(...(await collectSourceFiles(fullPath)));
    } else if (
      /\.(tsx?|css)$/.test(entry.name) &&
      entry.name.endsWith(".tsx")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Every literal passed to t(...) across the shell sources. */
async function collectTranslationKeys(): Promise<Map<string, string>> {
  const keys = new Map<string, string>();
  for (const file of await collectSourceFiles(shellDir)) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
      const raw = match[1] ?? "";
      keys.set(raw.replace(/\\(.)/g, "$1"), path.relative(shellDir, file));
    }
  }
  return keys;
}

describe("shell i18n", () => {
  it("defaults to Chinese and falls back to the English key for unknown text", () => {
    expect(translate("zh", "Workspace root")).toBe("工作区根目录");
    expect(translate("zh", "Some untranslated text")).toBe(
      "Some untranslated text"
    );
    expect(translate("en", "Workspace root")).toBe("Workspace root");
  });

  it("covers every t() key used in the shell with a Chinese translation", async () => {
    const keys = await collectTranslationKeys();
    const missing: string[] = [];
    for (const [key, file] of keys) {
      if (zhDictionary[key] === undefined) {
        missing.push(`${file}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("has no empty Chinese translations", () => {
    const empty = Object.entries(zhDictionary)
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it("does not use the raw English rendering for any covered key in zh mode", async () => {
    const keys = await collectTranslationKeys();
    const untranslated: string[] = [];
    for (const [key] of keys) {
      if (
        zhDictionary[key] !== undefined &&
        translate("zh", key) === key &&
        key.trim().length > 3
      ) {
        untranslated.push(key);
      }
    }
    expect(untranslated).toEqual([]);
  });
});
