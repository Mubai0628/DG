import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ContextLedgerV2,
  InMemoryEventStore,
  createDefaultShellAllowlist,
  createFakeShellRunner,
  createShellCapabilityDescriptors,
  planShellCommand,
  shellFailureToPitfallCandidate,
  shellSummaryToAgentEvidenceRef,
  shellSummaryToVolatileContextSegment,
  validateCapabilityDescriptor,
  validateShellAllowlist,
  validateShellCommandTemplate
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

describe("Shell allowlist templates and planning", () => {
  it("contains fixed default command templates", () => {
    const allowlist = createDefaultShellAllowlist();
    const ids = allowlist.templates.map((template) => template.id).sort();

    expect(ids).toEqual([
      "cargo.check_tauri",
      "pnpm.lint",
      "pnpm.test",
      "pnpm.typecheck",
      "pnpm.verify_ci",
      "tsc.runtime_build"
    ]);
    expect(validateShellAllowlist(allowlist)).toEqual({
      ok: true,
      errors: []
    });
  });

  it("plans fixed argv arrays only", () => {
    const plan = planShellCommand(
      { commandId: "pnpm.test", planId: "shell-plan-1" },
      createDefaultShellAllowlist(),
      { clock: () => new Date(now) }
    );

    expect(plan).toMatchObject({
      planId: "shell-plan-1",
      commandId: "pnpm.test",
      status: "planned",
      executionMode: "SIMULATE",
      argv: ["pnpm", "test"]
    });
  });

  it("rejects unknown command and arbitrary command input fields", () => {
    const allowlist = createDefaultShellAllowlist();
    const unknown = planShellCommand({ commandId: "pnpm.install" }, allowlist);
    const arbitrary = planShellCommand(
      {
        commandId: "pnpm.test",
        command: "pnpm test && rm -rf .tmp"
      },
      allowlist
    );

    expect(unknown.status).toBe("unknown_command");
    expect(arbitrary.status).toBe("rejected");
    expect(arbitrary.warnings.map((warning) => warning.code)).toContain(
      "arbitrary_command_string"
    );
  });

  it("rejects unsafe template argv and executable paths", () => {
    const base = createDefaultShellAllowlist().templates[0]!;
    for (const argv of [
      ["pnpm", "test;rm"],
      ["C:/Tools/pnpm", "test"],
      ["/usr/bin/pnpm", "test"]
    ]) {
      const result = validateShellCommandTemplate({ ...base, argv });
      expect(result.ok, argv.join(" ")).toBe(false);
    }
  });

  it("rejects blocked network, destructive, and platform command names", () => {
    const base = createDefaultShellAllowlist().templates[0]!;
    for (const executable of [
      "curl",
      "wget",
      "powershell",
      "cmd",
      "bash",
      "sh",
      "rm",
      "del",
      "sudo"
    ]) {
      const result = validateShellCommandTemplate({
        ...base,
        id: `blocked.${executable}`,
        argv: [executable, "x"]
      });
      expect(result.ok, executable).toBe(false);
    }
  });

  it("rejects install commands and git write commands", () => {
    const base = createDefaultShellAllowlist().templates[0]!;
    for (const argv of [
      ["pnpm", "install"],
      ["npm", "install"],
      ["git", "push"],
      ["git", "reset"],
      ["git", "clean"]
    ]) {
      const result = validateShellCommandTemplate({ ...base, argv });
      expect(result.ok, argv.join(" ")).toBe(false);
    }
  });

  it("rejects secret env names, unsafe cwd, high timeout, and unlimited output", () => {
    const allowlist = createDefaultShellAllowlist();
    const secretEnv = planShellCommand(
      { commandId: "pnpm.test", envNames: ["PROJECT_API_KEY"] },
      allowlist
    );
    const unsafeCwd = planShellCommand(
      { commandId: "pnpm.test", cwd: "../outside" },
      allowlist
    );
    const highTimeout = planShellCommand(
      { commandId: "pnpm.test", timeoutMs: 999_999 },
      allowlist
    );
    const badOutputPolicy = validateShellCommandTemplate({
      ...allowlist.templates[0]!,
      outputPolicy: {
        maxStdoutBytes: Number.POSITIVE_INFINITY,
        maxStderrBytes: Number.POSITIVE_INFINITY,
        maxLines: Number.POSITIVE_INFINITY,
        includeFirstLines: 1
      }
    });

    expect(secretEnv.status).toBe("rejected");
    expect(unsafeCwd.status).toBe("rejected");
    expect(highTimeout.status).toBe("rejected");
    expect(badOutputPolicy.ok).toBe(false);
  });
});

describe("FakeShellRunner and output summaries", () => {
  it("uses fixtures and never executes a subprocess", () => {
    const plan = planShellCommand(
      { commandId: "pnpm.test" },
      createDefaultShellAllowlist()
    );
    const runner = createFakeShellRunner({
      "pnpm.test": {
        exitCode: 0,
        stdout: "PASS 23 files\n264 passed",
        stderr: "",
        durationMs: 1200
      }
    });
    const result = runner.run(plan);

    expect(result.ok).toBe(true);
    expect(result.ok ? result.summary.exitCode : -1).toBe(0);
    expect(
      result.ok ? result.summary.findings.map((finding) => finding.code) : []
    ).toContain("success_marker");
  });

  it("redacts fake secrets, detects failure markers, and truncates stderr", () => {
    const secret = "sk-test1234567890abcdef";
    const plan = planShellCommand(
      { commandId: "pnpm.test" },
      createDefaultShellAllowlist()
    );
    const runner = createFakeShellRunner({
      "pnpm.test": {
        exitCode: 1,
        stdout: `FAIL test ${secret}`,
        stderr: `TypeError: bad\n${"x".repeat(20_000)}`,
        durationMs: 2200
      }
    });
    const result = runner.run(plan);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected fake shell run to succeed");
    }
    const serialized = JSON.stringify(result.summary);
    expect(serialized).not.toContain(secret);
    expect(result.summary.redactionCount).toBeGreaterThan(0);
    expect(result.summary.stderrTruncated).toBe(true);
    expect(result.summary.findings.map((finding) => finding.code)).toContain(
      "failure_marker"
    );
    expect(result.summary.findings.map((finding) => finding.code)).toContain(
      "type_error_marker"
    );
  });

  it("emits summary-only events without raw stdout or API keys", () => {
    const events = eventStore();
    const secret = "sk-test1234567890abcdef";
    const plan = planShellCommand(
      { commandId: "pnpm.test" },
      createDefaultShellAllowlist(),
      { eventStore: events, clock: () => new Date(now) }
    );
    const runner = createFakeShellRunner(
      {
        "pnpm.test": {
          exitCode: 1,
          stdout: `FAIL ${secret} raw output line`,
          stderr: "ERROR details",
          durationMs: 500
        }
      },
      { eventStore: events }
    );

    runner.run(plan);
    const serialized = JSON.stringify(events.listEvents());

    expect(serialized).toContain("shell.command.planned");
    expect(serialized).toContain("shell.command.simulated");
    expect(serialized).toContain("shell.output.summarized");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("raw output line");
    expect(serialized).not.toContain("Authorization");
  });
});

describe("Shell descriptors and integrations", () => {
  it("keeps shell capability descriptors disabled and never AUTO", () => {
    const descriptors = createShellCapabilityDescriptors();

    expect(descriptors.length).toBe(6);
    for (const descriptor of descriptors) {
      expect(descriptor.invokePolicy).toBe("DISABLED");
      expect(descriptor.executionMode).toBe("SIMULATE");
      expect(descriptor.invokePolicy).not.toBe("AUTO");
      expect(validateCapabilityDescriptor(descriptor).ok).toBe(true);
    }
  });

  it("converts shell summaries to summary-only agent evidence and volatile context", () => {
    const plan = planShellCommand(
      { commandId: "pnpm.test" },
      createDefaultShellAllowlist()
    );
    const result = createFakeShellRunner({
      "pnpm.test": {
        exitCode: 0,
        stdout: "PASS",
        stderr: "",
        durationMs: 10
      }
    }).run(plan);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected fake shell result");
    }
    const evidence = shellSummaryToAgentEvidenceRef({
      commandId: plan.commandId,
      summary: result.summary,
      id: "shell-evidence-1"
    });
    const segment = shellSummaryToVolatileContextSegment({
      commandId: plan.commandId,
      summary: result.summary,
      id: "shell-context-1"
    });
    const ledger = new ContextLedgerV2({ clock: () => new Date(now) });

    ledger.addSegment(segment);
    const report = ledger.assemble({ logEvents: false });

    expect(evidence.summary).toContain("Shell allowlist summary");
    expect(segment.layer).toBe("volatile_tail");
    expect(report.segmentCountByLayer.volatile_tail).toBe(1);
  });

  it("turns shell failures into candidate-only pitfall memory", () => {
    const plan = planShellCommand(
      { commandId: "pnpm.test" },
      createDefaultShellAllowlist()
    );
    const result = createFakeShellRunner({
      "pnpm.test": {
        exitCode: 1,
        stdout: "FAIL tests",
        stderr: "",
        durationMs: 10
      }
    }).run(plan);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected fake shell result");
    }
    const candidate = shellFailureToPitfallCandidate({
      commandId: plan.commandId,
      summary: result.summary,
      now
    });

    expect(candidate).toMatchObject({
      proposedType: "pitfall",
      source: "tool_result",
      trustLevel: "verified_tool_result"
    });
    expect(candidate?.trigger).toContain("Shell allowlist simulation failed");
  });

  it("does not import child_process or implement real execution in runtime execution source", () => {
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
