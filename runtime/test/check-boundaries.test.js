import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  listCheckableFiles,
  runBoundaryCheck,
  runSecretCheck
} from "../../scripts/check-boundaries.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const tempRoots = [];

async function createTempRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "dw-boundary-"));
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

describe("repository boundary checks", () => {
  it("passes on the current repository", async () => {
    const boundary = await runBoundaryCheck({ root: repoRoot, silent: true });
    const secrets = await runSecretCheck({ root: repoRoot, silent: true });

    expect(boundary.ok).toBe(true);
    expect(secrets.ok).toBe(true);
  }, 20_000);

  it("ignores generated artifacts while keeping normal source files checkable", async () => {
    const root = await createTempRoot();
    await mkdir(path.join(root, "app", "src-tauri", "target", "debug"), {
      recursive: true
    });
    await mkdir(path.join(root, "app", "dist"), { recursive: true });
    await mkdir(path.join(root, "runtime", "dist"), { recursive: true });
    await mkdir(path.join(root, ".tmp"), { recursive: true });
    await mkdir(path.join(root, "src"), { recursive: true });

    await writeFile(
      path.join(root, "app", "src-tauri", "target", "debug", "bad.js"),
      "const leaked = document.cookie;\n",
      "utf8"
    );
    await writeFile(
      path.join(root, "app", "dist", "bad.js"),
      "const bridge = 'nativeMessaging';\n",
      "utf8"
    );
    await writeFile(
      path.join(root, "runtime", "dist", "bad.js"),
      "const token = 'sk-1234567890abcdef';\n",
      "utf8"
    );
    await writeFile(
      path.join(root, ".tmp", "bad.js"),
      "const request = new XMLHttpRequest();\n",
      "utf8"
    );
    await writeFile(
      path.join(root, "src", "safe.js"),
      "const ok = true;\n",
      "utf8"
    );

    const files = await listCheckableFiles(root);
    const relativeFiles = files.map((file) =>
      path.relative(root, file).split(path.sep).join("/")
    );
    const boundary = await runBoundaryCheck({ root, silent: true });
    const secrets = await runSecretCheck({ root, silent: true });

    expect(relativeFiles).toEqual(["src/safe.js"]);
    expect(boundary.ok).toBe(true);
    expect(secrets.ok).toBe(true);
  });

  it("fails on synthetic forbidden capability usage", async () => {
    const root = await createTempRoot();
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify(
        {
          dependencies: {
            playwright: "1.0.0"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );
    await writeFile(
      path.join(root, "src", "bad.js"),
      "const leaked = document.cookie;\n",
      "utf8"
    );

    const result = await runBoundaryCheck({ root, silent: true });

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.ruleId)).toContain(
      "forbidden_dependency"
    );
    expect(result.findings.map((finding) => finding.ruleId)).toContain(
      "document_cookie_reference"
    );
  });

  it("fails on synthetic arbitrary command and native messaging usage", async () => {
    const root = await createTempRoot();
    await mkdir(path.join(root, "app", "src-tauri", "src"), {
      recursive: true
    });
    await writeFile(
      path.join(root, "app", "src-tauri", "src", "commands.rs"),
      [
        "use std::process::Command;",
        "fn run(command: &str) {",
        "  let _ = Command::new(command);",
        "}"
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      path.join(root, "app", "src-tauri", "tauri.conf.json"),
      `${JSON.stringify({ plugins: ["nativeMessaging"] })}\n`,
      "utf8"
    );

    const result = await runBoundaryCheck({ root, silent: true });

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.ruleId)).toContain(
      "tauri_arbitrary_command_reference"
    );
    expect(result.findings.map((finding) => finding.ruleId)).toContain(
      "native_messaging_reference"
    );
  });

  it("allows event log leak scanner denylist markers only in the fixed app command source", async () => {
    const root = await createTempRoot();
    await mkdir(path.join(root, "app", "src-tauri", "src"), {
      recursive: true
    });
    await writeFile(
      path.join(root, "app", "src-tauri", "src", "commands.rs"),
      [
        'const _RAW_DOM: (&str, &str) = ("RAW_DOM_MARKER", "rawDom");',
        'const _STORAGE: (&str, &str) = ("LOCAL_STORAGE_MARKER", "localStorage");'
      ].join("\n"),
      "utf8"
    );

    const result = await runBoundaryCheck({ root, silent: true });

    expect(result.ok).toBe(true);
  });

  it("fails on synthetic secret-like content", async () => {
    const root = await createTempRoot();
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(
      path.join(root, "src", "bad.js"),
      'const token = "sk-1234567890abcdef";\n',
      "utf8"
    );

    const result = await runSecretCheck({ root, silent: true });

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.ruleId)).toContain(
      "sk_like_key"
    );
  });
});
