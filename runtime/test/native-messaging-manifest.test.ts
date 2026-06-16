import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  summarizeNativeMessagingHostManifest,
  validateNativeMessagingHostManifest,
  type NativeMessagingHostManifest,
  type NativeMessagingManifestValidationOptions
} from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const extensionId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const options: NativeMessagingManifestValidationOptions = {
  expectedHostName: "com.dg.bridge",
  allowedExtensionIds: [extensionId],
  expectedInstallRoot: "C:\\Program Files\\DGBridge"
};

function validManifest(
  overrides: Partial<NativeMessagingHostManifest> = {}
): NativeMessagingHostManifest {
  return {
    name: "com.dg.bridge",
    description: "DG bridge host dry manifest",
    path: "C:\\Program Files\\DGBridge\\dg-bridge-host.exe",
    type: "stdio",
    allowed_origins: [`chrome-extension://${extensionId}/`],
    ...overrides
  };
}

function issueKinds(manifest: unknown, validationOptions = options): string[] {
  const result = validateNativeMessagingHostManifest(
    manifest,
    validationOptions
  );
  return result.ok ? [] : result.issues.map((issue) => issue.kind);
}

describe("native messaging manifest dry check", () => {
  it("accepts the disabled sample shape with an expected extension id", async () => {
    const sample = JSON.parse(
      await readFile(
        path.join(
          repoRoot,
          "docs",
          "examples",
          "native-messaging",
          "com.dg.bridge.sample.json"
        ),
        "utf8"
      )
    ) as NativeMessagingHostManifest;

    const result = validateNativeMessagingHostManifest(sample, {
      expectedHostName: "com.dg.bridge",
      allowedExtensionIds: [extensionId]
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      hostName: "com.dg.bridge",
      pathKind: "absolute",
      executableName: "dg-bridge-host.exe",
      originCount: 1,
      allowedExtensionIds: [extensionId],
      dryCheckOnly: true,
      nativeMessagingEnabled: false
    });
    expect(JSON.stringify(result.summary)).not.toContain("C:\\Path\\To");
  });

  it("rejects wildcard, all_urls, http, file, and malformed extension origins", () => {
    expect(
      issueKinds(validManifest({ allowed_origins: ["chrome-extension://*/*"] }))
    ).toContain("wildcard_origin_rejected");
    expect(
      issueKinds(validManifest({ allowed_origins: ["<all_urls>"] }))
    ).toContain("all_urls_rejected");
    expect(
      issueKinds(validManifest({ allowed_origins: ["https://example.com"] }))
    ).toContain("unsupported_origin");
    expect(
      issueKinds(validManifest({ allowed_origins: ["file:///tmp"] }))
    ).toContain("unsupported_origin");
    expect(
      issueKinds(
        validManifest({
          allowed_origins: [`chrome-extension://${extensionId}`]
        })
      )
    ).toContain("invalid_extension_origin");
  });

  it("rejects unknown extension ids and fails closed without an allowlist", () => {
    expect(
      issueKinds(
        validManifest({
          allowed_origins: [
            "chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/"
          ]
        })
      )
    ).toContain("unknown_extension_id");

    expect(
      issueKinds(validManifest(), { ...options, allowedExtensionIds: [] })
    ).toContain("empty_allowed_extension_ids");
  });

  it("rejects more origins than the dry subset allows", () => {
    expect(
      issueKinds(
        validManifest({
          allowed_origins: [
            `chrome-extension://${extensionId}/`,
            "chrome-extension://cccccccccccccccccccccccccccccccc/"
          ]
        })
      )
    ).toContain("too_many_allowed_origins");
  });

  it("rejects relative, parent traversal, non-executable, and outside-root paths", () => {
    expect(issueKinds(validManifest({ path: "dg-bridge-host.exe" }))).toContain(
      "relative_path_rejected"
    );
    expect(
      issueKinds({
        ...validManifest(),
        path: "C:\\Program Files\\DGBridge\\..\\evil.exe"
      })
    ).toContain("parent_traversal_rejected");
    expect(issueKinds(validManifest({ path: "/opt/dg/bridge.txt" }))).toContain(
      "executable_extension_rejected"
    );
    expect(
      issueKinds(validManifest({ path: "C:\\Temp\\dg-bridge-host.exe" }))
    ).toContain("outside_expected_install_root");
  });

  it("rejects non-stdio type, host name mismatch, empty origins, and risky fields", () => {
    expect(issueKinds(validManifest({ type: "socket" }))).toContain(
      "invalid_type"
    );
    expect(issueKinds(validManifest({ name: "com.evil.bridge" }))).toContain(
      "unknown_name"
    );
    expect(issueKinds(validManifest({ name: undefined }))).toContain(
      "missing_name"
    );
    expect(issueKinds(validManifest({ allowed_origins: [] }))).toContain(
      "empty_allowed_origins"
    );
    expect(
      issueKinds({
        ...validManifest(),
        permissions: ["nativeMessaging"]
      })
    ).toContain("high_risk_field_rejected");
  });

  it("keeps summaries safe when manifest text contains secret-like values", () => {
    const secret = "sk-test1234567890abcdef";
    const result = validateNativeMessagingHostManifest(
      validManifest({ description: `do not log ${secret}` }),
      options
    );
    const summary = summarizeNativeMessagingHostManifest(
      validManifest({ description: `do not log ${secret}` }),
      options
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.issues.map((issue) => issue.kind)).toContain(
      "suspicious_description"
    );
    expect(JSON.stringify(summary)).not.toContain(secret);
    expect(JSON.stringify(summary)).not.toContain("DEEPSEEK_API_KEY");
    expect(JSON.stringify(summary)).not.toContain("Users");
  });

  it("keeps the browser extension manifest and source free of native messaging", async () => {
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

  it("does not include native host installation scripts", async () => {
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
      files.some((file) => /\.(?:ps1|cmd|bat|sh|mjs|js)$/i.test(file))
    ).toBe(false);
  });

  it("documents the dry check as disabled by default", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "native-messaging-dry-check-v0.1.md"),
      "utf8"
    );

    expect(doc).toContain("dry check only");
    expect(doc).toContain("No OS native host registration");
    expect(doc).toContain("No browser extension permission change");
    expect(doc).toContain("No extension auto-send");
    expect(doc).toContain("No automatic Convert");
    expect(doc).toContain("No file write from bridge");
    expect(doc).toContain("desktop preview gate");
  });
});
