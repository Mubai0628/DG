import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

describe("native host proof-of-life gate documentation", () => {
  it("documents the proof-of-life as disabled by default with preview mandatory", async () => {
    const doc = await readRepoFile("docs/native-host-proof-of-life-v0.1.md");
    const adr = await readRepoFile(
      "docs/adr/0004-native-host-proof-of-life-gate.md"
    );
    const combined = `${doc}\n${adr}`;

    expect(combined).toContain("disabled by default");
    expect(combined).toContain("explicit dev flag");
    expect(combined).toContain("No OS native host registration");
    expect(combined).toContain("No native host binary");
    expect(combined).toContain("No browser extension permission change");
    expect(combined).toContain("No `chrome.runtime.connectNative`");
    expect(combined).toContain("No `chrome.runtime.sendNativeMessage`");
    expect(combined).toContain("No extension auto-send");
    expect(combined).toContain("No automatic Convert");
    expect(combined).toContain("No file write from bridge");
    expect(combined).toContain("Desktop preview gate is mandatory");
    expect(combined).toContain("rollback");
  });

  it("keeps the disabled sample gate config inert", async () => {
    const sample = JSON.parse(
      await readRepoFile(
        "docs/examples/native-messaging/dev-host-gate.sample.json"
      )
    ) as {
      enabled: boolean;
      requiresDevFlag: boolean;
      hostName: string;
      extensionId: string;
      previewRequired: boolean;
      autoConvert: boolean;
      fileWriteFromBridge: boolean;
    };

    expect(sample).toEqual({
      enabled: false,
      requiresDevFlag: true,
      hostName: "com.dg.bridge",
      extensionId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      previewRequired: true,
      autoConvert: false,
      fileWriteFromBridge: false
    });
  });

  it("does not add native messaging permissions or APIs to the browser extension", async () => {
    const extensionRoot = path.join(repoRoot, "browser-extension");
    const manifest = JSON.parse(
      await readFile(path.join(extensionRoot, "manifest.json"), "utf8")
    ) as {
      permissions?: string[];
      externally_connectable?: unknown;
    };
    const sourceFiles = await readdir(path.join(extensionRoot, "src"));
    const sourceText = (
      await Promise.all(
        sourceFiles
          .filter((file) => file.endsWith(".ts"))
          .map((file) =>
            readFile(path.join(extensionRoot, "src", file), "utf8")
          )
      )
    ).join("\n");

    expect(manifest.permissions?.sort()).toEqual(["activeTab", "scripting"]);
    expect(manifest.permissions ?? []).not.toContain("nativeMessaging");
    expect(manifest.externally_connectable).toBeUndefined();
    expect(sourceText).not.toContain("connectNative");
    expect(sourceText).not.toContain("sendNativeMessage");
    expect(sourceText).not.toContain("nativeMessaging");
  });

  it("does not add install scripts or host binaries to the native messaging examples", async () => {
    const sampleDir = path.join(
      repoRoot,
      "docs",
      "examples",
      "native-messaging"
    );
    const files = await readdir(sampleDir);

    expect(files.sort()).toEqual([
      "com.dg.bridge.sample.json",
      "dev-host-gate.sample.json"
    ]);
    expect(
      files.some((file) =>
        /\.(?:exe|ps1|cmd|bat|sh|mjs|cjs|js|msi|pkg|app)$/i.test(file)
      )
    ).toBe(false);
  });
});
