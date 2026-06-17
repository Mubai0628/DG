import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ContextLedgerV2,
  InMemoryEventStore,
  createDisabledGitWriteIntent,
  createFakeGitRunner,
  createGitCommitDraftDescriptor,
  createGitReadCapabilityDescriptors,
  gitSummaryToAgentEvidenceRef,
  gitSummaryToVolatileContextSegment,
  parseGitBranchSummary,
  parseGitDiffNumstatNameStatus,
  parseGitLogSummary,
  parseGitStatusPorcelainV1,
  planGitSafeCommand,
  validateCapabilityDescriptor,
  validateGitPathSpec
} from "../src/index.js";

const now = "2026-01-01T00:00:00.000Z";

function eventStore(): InMemoryEventStore {
  let id = 0;
  return new InMemoryEventStore({
    clock: () => new Date(now),
    idFactory: () => {
      id += 1;
      return `event-${id}`;
    }
  });
}

describe("Git safe command planning", () => {
  it("plans status with fixed safe argv", () => {
    const plan = planGitSafeCommand(
      { commandKind: "status" },
      { clock: () => new Date(now), idFactory: () => "plan-1" }
    );

    expect(plan).toMatchObject({
      planId: "plan-1",
      commandKind: "status",
      lane: "read_only",
      status: "planned",
      argv: ["git", "status", "--porcelain=v1", "--branch"]
    });
  });

  it("plans diff summary with fixed argv and pathspec separator", () => {
    const plan = planGitSafeCommand({
      commandKind: "diff_summary",
      pathspecs: ["runtime/src/**", "docs/file.md"]
    });

    expect(plan.status).toBe("planned");
    expect(plan.argv).toEqual([
      "git",
      "diff",
      "--numstat",
      "--name-status",
      "--",
      "runtime/src/**",
      "docs/file.md"
    ]);
  });

  it("rejects unknown command and disables write commands", () => {
    const unknown = planGitSafeCommand({ commandKind: "status; rm" });
    const write = planGitSafeCommand({ commandKind: "commit" });

    expect(unknown.status).toBe("unknown_command");
    expect(write.status).toBe("disabled");
    expect(write.reasons).toEqual([
      "git write lanes are disabled in this phase"
    ]);
    expect(write.argv).toEqual([]);
  });

  it("rejects unsafe pathspecs", () => {
    for (const unsafe of [
      "/tmp/file.ts",
      "C:/repo/file.ts",
      "\\\\server\\share\\file.ts",
      "../outside.ts",
      ".git/config",
      "node_modules/pkg/index.js",
      "dist/app.js",
      "target/debug/app",
      "app/src-tauri/target/debug/app.exe",
      "conformance/results/report.json",
      "browser-extension/dist/popup.js",
      "runtime/dist/index.js",
      ".tmp/eval.json",
      ".env.local",
      "id_rsa",
      "src/file;rm.ts",
      "src/file\nname.ts",
      "src/file\0name.ts",
      "https://example.com/path?token=secret"
    ]) {
      expect(validateGitPathSpec(unsafe).ok, unsafe).toBe(false);
    }
  });

  it("allows safe relative pathspecs and runtime/src/**", () => {
    expect(validateGitPathSpec("src/index.ts").ok).toBe(true);
    expect(validateGitPathSpec("docs/file.md").ok).toBe(true);
    expect(validateGitPathSpec("runtime/src/**").ok).toBe(true);
  });
});

describe("Git safe summary parsers", () => {
  it("parses status porcelain v1 counts and branch", () => {
    const summary = parseGitStatusPorcelainV1(
      [
        "## main...origin/main [ahead 1, behind 2]",
        " M runtime/src/index.ts",
        "M  docs/README.md",
        "?? runtime/test/git-safe-lanes.test.ts"
      ].join("\n")
    );

    expect(summary).toMatchObject({
      branch: "main",
      upstream: "origin/main",
      ahead: 1,
      behind: 2,
      fileCount: 3,
      stagedCount: 1,
      unstagedCount: 1,
      untrackedCount: 1
    });
  });

  it("parses diff summary counts without raw hunks", () => {
    const summary = parseGitDiffNumstatNameStatus(
      [
        "12\t3\truntime/src/index.ts",
        "-\t-\tassets/logo.png",
        "M\truntime/src/index.ts"
      ].join("\n")
    );

    expect(summary).toMatchObject({
      filesChanged: 2,
      additions: 12,
      deletions: 3,
      binaryFiles: 1
    });
    expect(JSON.stringify(summary)).not.toContain("@@");
  });

  it("parses log summary and truncates subject safely", () => {
    const secret = "sk-test1234567890abcdef";
    const summary = parseGitLogSummary(
      `abcdef123456\t1767225600\tAlice Example\tFix parser ${secret} ${"x".repeat(160)}`
    );

    expect(summary.commitCount).toBe(1);
    expect(summary.commits[0]?.subject).not.toContain(secret);
    expect(summary.commits[0]?.subject.length).toBeLessThanOrEqual(120);
  });

  it("parses branch summary with current branch marker", () => {
    const summary = parseGitBranchSummary(
      ["main", "* feature/git-safe", "release"].join("\n")
    );

    expect(summary.currentBranch).toBe("feature/git-safe");
    expect(summary.branchCount).toBe(3);
  });

  it("skips malformed parser lines with warnings instead of throwing", () => {
    const status = parseGitStatusPorcelainV1("bad");
    const diff = parseGitDiffNumstatNameStatus("not-a-diff-line");
    const log = parseGitLogSummary("not\tenough");

    expect(status.warnings.map((warning) => warning.code)).toContain(
      "status_malformed_line"
    );
    expect(diff.warnings.map((warning) => warning.code)).toContain(
      "diff_malformed_line"
    );
    expect(log.warnings.map((warning) => warning.code)).toContain(
      "log_malformed_line"
    );
  });
});

describe("FakeGitRunner and integrations", () => {
  it("uses fixtures and does not execute subprocesses", () => {
    const plan = planGitSafeCommand({ commandKind: "status" });
    const runner = createFakeGitRunner({
      status: "## main\n?? runtime/test/git-safe-lanes.test.ts\n"
    });
    const result = runner.run(plan);

    expect(result.ok).toBe(true);
    expect(result.ok ? result.summary.kind : "").toBe("status");
    expect(result.ok ? result.summary.warnings : []).toEqual([]);
  });

  it("emits summary-only events without raw diff, source, or API keys", () => {
    const events = eventStore();
    const secret = "sk-test1234567890abcdef";
    const plan = planGitSafeCommand(
      { commandKind: "diff_summary", pathspecs: ["runtime/src/index.ts"] },
      {
        eventStore: events,
        clock: () => new Date(now),
        idFactory: () => "plan-1"
      }
    );
    const runner = createFakeGitRunner(
      {
        diff_summary: `10\t2\truntime/src/index.ts\nM\truntime/src/index.ts\n@@ raw diff ${secret}`
      },
      { eventStore: events }
    );

    runner.run(plan);
    const serialized = JSON.stringify(events.listEvents());

    expect(serialized).toContain("git.command.planned");
    expect(serialized).toContain("git.summary.produced");
    expect(serialized).not.toContain("@@ raw diff");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("Authorization");
  });

  it("keeps git commit draft descriptor disabled and not AUTO", () => {
    const writeDescriptor = createGitCommitDraftDescriptor();
    const readDescriptors = createGitReadCapabilityDescriptors();

    expect(writeDescriptor.invokePolicy).toBe("DISABLED");
    expect(writeDescriptor.executionMode).toBe("SIMULATE");
    expect(validateCapabilityDescriptor(writeDescriptor).ok).toBe(true);
    expect(
      readDescriptors.every((descriptor) => descriptor.invokePolicy !== "AUTO")
    ).toBe(true);
    expect(
      readDescriptors.every(
        (descriptor) => validateCapabilityDescriptor(descriptor).ok
      )
    ).toBe(true);
  });

  it("keeps git write intents disabled and tied to patch/audit refs", () => {
    const events = eventStore();
    const intent = createDisabledGitWriteIntent(
      {
        commandKind: "commit",
        summary: "Draft commit after patch audit",
        patchProposalRefs: ["patch-1"],
        auditReportRefs: ["audit-1"]
      },
      { eventStore: events, idFactory: () => "intent-1" }
    );

    expect(intent).toMatchObject({
      intentId: "intent-1",
      status: "disabled",
      patchProposalRefs: ["patch-1"],
      auditReportRefs: ["audit-1"]
    });
    expect(events.listEvents()[0]?.type).toBe("git.write_intent.disabled");
  });

  it("converts git summaries to summary-only agent evidence and volatile context", () => {
    const summary = parseGitDiffNumstatNameStatus("5\t1\truntime/src/index.ts");
    const evidence = gitSummaryToAgentEvidenceRef({
      summary,
      id: "git-diff-1"
    });
    const segment = gitSummaryToVolatileContextSegment({
      summary,
      id: "git-context-1"
    });
    const ledger = new ContextLedgerV2({
      clock: () => new Date(now)
    });

    ledger.addSegment(segment);
    const report = ledger.assemble({ logEvents: false });

    expect(evidence.summary).toContain("Git diff summary");
    expect(segment.layer).toBe("volatile_tail");
    expect(segment.source).toBe("tool_result");
    expect(report.segmentCountByLayer.volatile_tail).toBe(1);
  });

  it("does not import child_process or run real git in runtime execution source", () => {
    const repoRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      ".."
    );
    const executionDir = path.join(repoRoot, "src", "execution");
    const source = collectTsSource(executionDir);

    expect(source).not.toMatch(/child_process/);
    expect(source).not.toMatch(/\b(?:spawn|exec|execFile|execSync)\s*\(/);
    expect(source).not.toMatch(/\b(?:spawn|exec|execFile|execSync)\s*=/);
  });
});

function collectTsSource(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectTsSource(fullPath);
      }
      if (entry.isFile() && entry.name.endsWith(".ts")) {
        return readFileSync(fullPath, "utf8");
      }
      return "";
    })
    .join("\n");
}
