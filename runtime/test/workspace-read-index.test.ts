import { describe, expect, it } from "vitest";

import {
  CapabilityBrokerV2,
  ContextLedgerV2,
  InMemoryEventStore,
  buildWorkspaceIndex,
  createCapabilityRegistry,
  createNativeWorkspaceIndexDescriptor,
  validateCapabilityDescriptor,
  validateWorkspaceIndexPath,
  workspaceIndexToAgentEvidenceRefs,
  workspaceIndexToContextSegments,
  workspaceIndexToControlRef,
  type WorkspaceVirtualFile
} from "../src/index.js";

const now = "2026-06-19T00:00:00.000Z";

function sampleFiles(): WorkspaceVirtualFile[] {
  return [
    {
      path: "README.md",
      content: "# DeepSeek Workbench\n\n## Usage\nSafe docs."
    },
    {
      path: "runtime/src/index.ts",
      content:
        "export function runTask() { return 'ok'; }\nexport class RuntimeIndex {}\nexport const AppView = () => null;\n"
    },
    {
      path: "app/src/App.tsx",
      content:
        "export const App = () => null;\nexport function renderApp() { return App; }\n"
    },
    {
      path: "package.json",
      content: '{"name":"demo","scripts":{"test":"vitest"}}'
    },
    {
      path: "src/main/java/App.java",
      content:
        'public class App { public String run() { return "ok"; } interface Runner {} enum Mode { A } }'
    },
    {
      path: "runtime/src/lib.rs",
      content:
        "pub struct RuntimeIndex {}\npub enum Mode { A }\npub fn run_task() {}\n"
    }
  ];
}

function build(files: WorkspaceVirtualFile[] = sampleFiles()) {
  return buildWorkspaceIndex(
    {
      workspaceId: "workspace-1",
      rootLabel: "virtual-fixture",
      files
    },
    {
      now,
      indexId: "workspace-index-test"
    }
  );
}

describe("Workspace Read / Index path guard", () => {
  it("allows safe workspace-relative paths", () => {
    for (const path of [
      "README.md",
      "docs/file.md",
      "runtime/src/index.ts",
      "app/src/App.tsx",
      "src/main/java/App.java"
    ]) {
      expect(validateWorkspaceIndexPath(path)).toMatchObject({
        ok: true,
        path
      });
    }
  });

  it("rejects unsafe absolute, drive, UNC, traversal, generated, and secret paths", () => {
    const rejected = [
      "",
      "/etc/passwd",
      "C:/Users/me/.env",
      "//server/share/file.ts",
      "src/../secret.ts",
      "src\\..\\secret.ts",
      ".git/config",
      ".env",
      ".env.local",
      "keys/id_rsa",
      "node_modules/pkg/index.js",
      "dist/bundle.js",
      "target/debug/app",
      "app/src-tauri/target/debug/app",
      "runtime/dist/index.js",
      "browser-extension/dist/popup.js",
      "conformance/results/live.json",
      ".tmp/output.json"
    ];

    for (const path of rejected) {
      const result = validateWorkspaceIndexPath(path);
      expect(result.ok).toBe(false);
      if (!result.ok && path.length > 0) {
        expect(result.safePath).not.toContain(path);
      }
    }
  });

  it("rejects shell metacharacters, null bytes, newlines, and query-like URLs", () => {
    for (const path of [
      "src/index;rm.ts",
      "src/index$(whoami).ts",
      "src/index\0.ts",
      "src/index\n.ts",
      "https://example.com/file.ts?token=secret",
      "docs/file.md?api_key=secret"
    ]) {
      expect(validateWorkspaceIndexPath(path).ok).toBe(false);
    }
  });
});

describe("Workspace Read / Index builder", () => {
  it("builds a deterministic summary-only index from virtual files", () => {
    const first = build();
    const second = build([...sampleFiles()].reverse());

    expect(first.ok).toBe(true);
    expect(first.index.hash).toBe(second.index.hash);
    expect(first.index.fileCount).toBe(6);
    expect(first.index.indexedFileCount).toBe(6);
    expect(first.index.files.map((file) => file.path)).toEqual([
      "app/src/App.tsx",
      "package.json",
      "README.md",
      "runtime/src/index.ts",
      "runtime/src/lib.rs",
      "src/main/java/App.java"
    ]);
    expect(JSON.stringify(first.index)).not.toContain(
      "export function runTask"
    );
  });

  it("skips secret and raw-marker content without leaking raw content", () => {
    const secret = "sk-test1234567890abcdef";
    const result = build([
      {
        path: "runtime/src/safe.ts",
        content: "export function safeName() { return 'ok'; }"
      },
      {
        path: "runtime/src/secret.ts",
        content: `const token = "${secret}";`
      },
      {
        path: "runtime/src/raw.ts",
        content:
          "const rawPrompt = 'private'; const rawDom = '<table></table>'; const clipboard = 'x';"
      }
    ]);

    expect(result.ok).toBe(true);
    expect(result.index.indexedFileCount).toBe(1);
    expect(result.index.skippedFileCount).toBe(2);
    expect(result.index.warningCodes).toEqual(["raw_marker", "secret_marker"]);
    const serialized = JSON.stringify(result.index);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt =");
    expect(serialized).not.toContain("<table>");
  });

  it("skips binary-ish and oversized files", () => {
    const result = buildWorkspaceIndex(
      {
        workspaceId: "workspace-1",
        files: [
          { path: "runtime/src/binary.bin", content: "abc\0def" },
          { path: "runtime/src/large.ts", content: "x".repeat(32) },
          { path: "runtime/src/safe.ts", content: "ok" }
        ]
      },
      {
        now,
        maxFileBytes: 16
      }
    );

    expect(result.index.indexedFileCount).toBe(1);
    expect(result.index.skippedFileCount).toBe(2);
    expect(result.index.warningCodes).toEqual([
      "binary_content",
      "file_too_large"
    ]);
  });

  it("summarizes languages, directories, and symbols without source lines", () => {
    const result = build();
    const languages = Object.fromEntries(
      result.index.languageSummary.map((item) => [
        item.language,
        item.fileCount
      ])
    );
    expect(languages).toMatchObject({
      md: 1,
      json: 1,
      ts: 1,
      tsx: 1,
      java: 1,
      rs: 1
    });
    expect(
      result.index.directories.find((directory) => directory.path === "runtime")
    ).toMatchObject({
      fileCount: 2,
      indexedFileCount: 2
    });
    const symbols = result.index.files.flatMap((file) => file.symbols);
    expect(symbols.map((symbol) => symbol.name)).toEqual(
      expect.arrayContaining([
        "Usage",
        "App",
        "runTask",
        "RuntimeIndex",
        "name",
        "App",
        "run",
        "RuntimeIndex",
        "run_task"
      ])
    );
    expect(JSON.stringify(symbols)).not.toContain("return");
  });

  it("warns when maxFiles or maxTotalBytes limits skip files", () => {
    const maxFilesResult = buildWorkspaceIndex(
      {
        files: [
          { path: "a.ts", content: "export function a() {}" },
          { path: "b.ts", content: "export function b() {}" }
        ]
      },
      { now, maxFiles: 1 }
    );
    expect(maxFilesResult.index.warningCodes).toContain("max_files_exceeded");

    const maxBytesResult = buildWorkspaceIndex(
      {
        files: [
          { path: "a.ts", content: "export function a() {}" },
          { path: "b.ts", content: "export function b() {}" }
        ]
      },
      { now, maxTotalBytes: 8 }
    );
    expect(maxBytesResult.index.warningCodes).toContain(
      "max_total_bytes_exceeded"
    );
  });
});

describe("Workspace Read / Index events and integrations", () => {
  it("emits summary-only events without raw content or API keys", () => {
    const eventStore = new InMemoryEventStore({
      clock: () => new Date(now),
      idFactory: () => "event-id"
    });
    const secret = "sk-test1234567890abcdef";
    const result = buildWorkspaceIndex(
      {
        workspaceId: "workspace-1",
        files: [
          { path: "runtime/src/index.ts", content: "export function ok() {}" },
          {
            path: "runtime/src/secret.ts",
            content: `const secret = "${secret}";`
          }
        ]
      },
      {
        now,
        eventStore
      }
    );

    expect(result.ok).toBe(true);
    expect(eventStore.listEvents().map((event) => event.type)).toEqual([
      "workspace.index.proposed",
      "workspace.file.summarized",
      "workspace.file.summarized",
      "workspace.index.built"
    ]);
    const serialized = JSON.stringify(eventStore.listEvents());
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("export function ok");
  });

  it("converts workspace index to volatile context without changing frozen hash", () => {
    const result = build();
    const ledger = new ContextLedgerV2({
      clock: () => new Date(now)
    });
    ledger.addSegment({
      id: "immutable-rule",
      layer: "immutable_rules",
      title: "Immutable rule",
      content: "Stable rule",
      source: "system",
      immutable: true
    });
    const before = ledger.assemble({ logEvents: false });

    for (const segment of workspaceIndexToContextSegments(result.index)) {
      ledger.addSegment(segment);
    }
    const after = ledger.assemble({ logEvents: false });

    expect(after.hashSummary.globalFrozenPrefixHash).toBe(
      before.hashSummary.globalFrozenPrefixHash
    );
    expect(after.segmentCountByLayer.volatile_tail).toBe(1);
    expect(after.placementDecisions.at(-1)).toMatchObject({
      placement: "volatile_tail"
    });
  });

  it("creates summary-only agent evidence refs and control refs", () => {
    const result = build();
    const evidenceRefs = workspaceIndexToAgentEvidenceRefs(result.index);
    const controlRef = workspaceIndexToControlRef(result.index);

    expect(evidenceRefs[0]).toMatchObject({
      id: "workspace-index-test",
      kind: "artifact",
      untrusted: false
    });
    expect(controlRef).toMatchObject({
      workspaceIndexId: "workspace-index-test",
      fileCount: 6,
      indexedFileCount: 6,
      skippedFileCount: 0
    });
    const serialized = JSON.stringify({ evidenceRefs, controlRef });
    expect(serialized).not.toContain("export function");
  });

  it("describes native.workspace.index as read-only planning and not AUTO", () => {
    const descriptor = createNativeWorkspaceIndexDescriptor();
    const validation = validateCapabilityDescriptor(descriptor);
    expect(validation.ok).toBe(true);
    expect(descriptor).toMatchObject({
      id: "native.workspace.index",
      sourceType: "native",
      category: "knowledge",
      riskLevel: "A1_read",
      invokePolicy: "ASK_FIRST",
      executionMode: "SIMULATE",
      supportsDryRun: true,
      canWriteMemory: false
    });

    const registry = createCapabilityRegistry();
    registry.register(descriptor);
    const broker = new CapabilityBrokerV2({ registry });
    const plan = broker.planCapabilityInvocation({
      id: "workspace-index-request",
      capabilityId: "native.workspace.index",
      input: {
        fileCount: 1
      }
    });
    expect(plan.status).toBe("approval_required");
    expect(plan.dryRunAvailable).toBe(true);
    expect(plan.dryRunResult?.wouldExecute).toBe(false);
  });
});
