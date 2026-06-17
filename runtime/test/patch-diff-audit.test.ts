import { describe, expect, it } from "vitest";

import {
  ContextLedgerV2,
  InMemoryEventStore,
  createPatchProposal,
  createVirtualWorkspaceSnapshot,
  describePatchApplyCapability,
  normalizePatchPath,
  patchAuditToAgentEvidenceRef,
  patchAuditToNoCompressZoneSegment,
  patchProposalToEvidenceRef,
  patchSha256,
  simulatePatchApply,
  simulateRollback,
  validateCapabilityDescriptor,
  type PatchFileChange,
  type PatchProposal,
  type PatchServiceOptions
} from "../src/index.js";

const now = "2026-01-01T00:00:00.000Z";

function options(eventStore?: InMemoryEventStore): PatchServiceOptions {
  let id = 0;
  const result: PatchServiceOptions = {
    clock: () => new Date(now),
    idFactory: () => {
      id += 1;
      return `patch-id-${id}`;
    }
  };
  if (eventStore !== undefined) {
    result.eventStore = eventStore;
  }
  return result;
}

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

function change(overrides: Partial<PatchFileChange> = {}): PatchFileChange {
  const beforeContent = overrides.beforeContent;
  const afterContent = overrides.afterContent ?? "export const value = 1;\n";
  const sizeBytes = Buffer.byteLength(
    afterContent ?? beforeContent ?? "",
    "utf8"
  );
  const base: PatchFileChange = {
    operation: "create",
    path: "runtime/src/example.ts",
    contentType: "text/typescript",
    encoding: "utf8",
    sizeBytes,
    reason: "Add deterministic test file",
    sourceRefs: ["task-1"],
    sensitivity: "internal"
  };
  if (beforeContent !== undefined) {
    base.beforeContent = beforeContent;
  }
  if (afterContent !== undefined) {
    base.afterContent = afterContent;
  }
  return {
    ...base,
    ...overrides,
    sizeBytes: overrides.sizeBytes ?? sizeBytes
  };
}

function proposal(
  changes: PatchFileChange[],
  patchOptions: PatchServiceOptions = options()
): PatchProposal {
  return createPatchProposal(
    {
      taskId: "task-1",
      agentId: "coder-1",
      source: "agent",
      title: "Patch proposal",
      description: "Virtual patch proposal",
      changes
    },
    patchOptions
  );
}

describe("Patch proposal validation", () => {
  it("validates create file proposals", () => {
    const target = proposal([change()]);

    expect(target.validation.ok).toBe(true);
    expect(target.status).toBe("validated");
    expect(target.diffSummary).toMatchObject({
      filesChanged: 1,
      filesCreated: 1,
      linesAdded: 1,
      linesRemoved: 0
    });
  });

  it("validates update proposals with matching beforeHash", () => {
    const snapshot = createVirtualWorkspaceSnapshot(
      [
        {
          path: "runtime/src/example.ts",
          content: "export const value = 1;\n"
        }
      ],
      options()
    );
    const target = proposal([
      change({
        operation: "update",
        beforeContent: "export const value = 1;\n",
        beforeHash: patchSha256("export const value = 1;\n"),
        afterContent: "export const value = 2;\n"
      })
    ]);

    const simulation = simulatePatchApply(snapshot, target, options());

    expect(simulation.ok).toBe(true);
    expect(
      simulation.snapshotAfter?.files["runtime/src/example.ts"]?.content
    ).toBe("export const value = 2;\n");
  });

  it("rejects update proposals when beforeHash mismatches", () => {
    const snapshot = createVirtualWorkspaceSnapshot(
      [{ path: "runtime/src/example.ts", content: "current\n" }],
      options()
    );
    const target = proposal([
      change({
        operation: "update",
        beforeHash: patchSha256("old\n"),
        afterContent: "new\n"
      })
    ]);

    const simulation = simulatePatchApply(snapshot, target, options());

    expect(simulation.ok).toBe(false);
    expect(simulation.errors.map((error) => error.kind)).toContain(
      "before_hash_mismatch"
    );
  });

  it("rejects create existing file and delete missing file in virtual apply", () => {
    const snapshot = createVirtualWorkspaceSnapshot(
      [{ path: "runtime/src/example.ts", content: "current\n" }],
      options()
    );
    const createExisting = simulatePatchApply(snapshot, proposal([change()]));
    const missingDelete = change({
      operation: "delete",
      path: "runtime/src/missing.ts",
      beforeHash: patchSha256("missing\n")
    });
    delete missingDelete.afterContent;
    const deleteMissing = simulatePatchApply(
      snapshot,
      proposal([missingDelete])
    );

    expect(createExisting.errors.map((error) => error.kind)).toContain(
      "file_exists"
    );
    expect(deleteMissing.errors.map((error) => error.kind)).toContain(
      "file_missing"
    );
  });

  it("rejects unsafe paths", () => {
    for (const unsafePath of [
      "../secret.txt",
      "/tmp/file.ts",
      "C:/tmp/file.ts",
      "\\\\server\\share\\file.ts"
    ]) {
      expect(normalizePatchPath(unsafePath).ok).toBe(false);
    }
  });

  it("rejects secret paths and generated artifact paths", () => {
    for (const unsafePath of [
      ".env",
      ".env.local",
      "node_modules/pkg/index.js",
      "dist/app.js",
      "target/debug/app",
      ".git/config",
      ".tmp/report.json",
      "conformance/results/report.json",
      "app/src-tauri/target/debug/app.exe"
    ]) {
      const result = proposal([change({ path: unsafePath })]);
      expect(result.validation.ok).toBe(false);
    }
  });

  it("rejects secret markers in content", () => {
    const secret = "sk-test1234567890abcdef";
    const result = proposal([
      change({ afterContent: `const key = "${secret}";` })
    ]);

    expect(result.validation.errors.map((error) => error.kind)).toContain(
      "secret_marker"
    );
  });

  it("rejects raw DOM, rawPrompt, and clipboard markers", () => {
    for (const marker of ["rawDom", "rawPrompt", "clipboard"]) {
      const result = proposal([
        change({ afterContent: `const marker = "${marker}";` })
      ]);
      expect(result.validation.errors.map((error) => error.kind)).toContain(
        "raw_marker"
      );
    }
  });

  it("rejects direct command execution expressed in patch reasons", () => {
    const result = proposal([
      change({ reason: "Run powershell cleanup after this patch" })
    ]);

    expect(result.validation.errors.map((error) => error.kind)).toContain(
      "direct_shell_command"
    );
  });

  it("keeps rename as a modelled but unsupported operation", () => {
    const result = proposal([
      change({
        operation: "rename",
        path: "runtime/src/new.ts",
        oldPath: "runtime/src/old.ts"
      })
    ]);

    expect(result.validation.ok).toBe(false);
    expect(result.validation.errors.map((error) => error.kind)).toContain(
      "unsupported_operation"
    );
  });
});

describe("Diff, virtual apply, and rollback", () => {
  it("creates deterministic diff summary counts", () => {
    const target = proposal([
      change({
        operation: "update",
        beforeContent: "one\ntwo\nthree\n",
        afterContent: "one\nTWO\nthree\nfour\n"
      })
    ]);

    expect(target.diffSummary.linesAdded).toBe(2);
    expect(target.diffSummary.linesRemoved).toBe(1);
    expect(target.diffSummary.hunks[0]?.lines.map((line) => line.kind)).toEqual(
      ["unchanged", "added", "removed", "unchanged", "added"]
    );
  });

  it("supports unicode diff content in the proposal object", () => {
    const target = proposal([
      change({
        beforeContent: "城市,值\n上海,1\n",
        afterContent: "城市,值\n上海,2\n深圳,3\n"
      })
    ]);

    expect(target.diffSummary.linesAdded).toBe(2);
    expect(
      target.diffSummary.hunks[0]?.lines.some((line) => line.text === "深圳,3")
    ).toBe(true);
  });

  it("applies changes to a virtual snapshot and rolls them back", () => {
    const snapshot = createVirtualWorkspaceSnapshot(
      [
        { path: "runtime/src/a.ts", content: "a\n" },
        { path: "runtime/src/delete-me.ts", content: "delete\n" }
      ],
      options()
    );
    const deleteChange = change({
      operation: "delete",
      path: "runtime/src/delete-me.ts",
      beforeHash: patchSha256("delete\n"),
      beforeContent: "delete\n"
    });
    delete deleteChange.afterContent;
    const target = proposal([
      change({
        operation: "update",
        path: "runtime/src/a.ts",
        beforeHash: patchSha256("a\n"),
        beforeContent: "a\n",
        afterContent: "b\n"
      }),
      change({
        operation: "create",
        path: "runtime/src/new.ts",
        afterContent: "new\n"
      }),
      deleteChange
    ]);

    const simulation = simulatePatchApply(snapshot, target, options());
    const rollback = simulateRollback(
      simulation.snapshotAfter!,
      simulation.checkpoint!,
      options()
    );

    expect(simulation.ok).toBe(true);
    expect(simulation.snapshotAfter?.files["runtime/src/a.ts"]?.content).toBe(
      "b\n"
    );
    expect(simulation.snapshotAfter?.files["runtime/src/new.ts"]).toBeDefined();
    expect(
      simulation.snapshotAfter?.files["runtime/src/delete-me.ts"]
    ).toBeUndefined();
    expect(rollback.snapshot?.files["runtime/src/a.ts"]?.content).toBe("a\n");
    expect(rollback.snapshot?.files["runtime/src/new.ts"]).toBeUndefined();
    expect(rollback.snapshot?.files["runtime/src/delete-me.ts"]?.content).toBe(
      "delete\n"
    );
  });
});

describe("Patch audit summaries and integrations", () => {
  it("keeps event payloads summary-only without raw source content", () => {
    const events = eventStore();
    const rawSource = "export const privateValue = 'do-not-log';\n";
    const target = proposal(
      [
        change({
          afterContent: rawSource
        })
      ],
      options(events)
    );
    const snapshot = createVirtualWorkspaceSnapshot([], options());

    simulatePatchApply(snapshot, target, options(events));
    const serialized = JSON.stringify(events.listEvents());

    expect(serialized).toContain("patch.proposed");
    expect(serialized).toContain("patch.simulated");
    expect(serialized).not.toContain(rawSource);
    expect(serialized).not.toContain("privateValue");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps audit reports free of raw source code", () => {
    const rawSource = "export const rawSourceCode = 42;\n";
    const target = proposal([change({ afterContent: rawSource })]);
    const serializedAudit = JSON.stringify(target.auditReport);

    expect(serializedAudit).not.toContain(rawSource);
    expect(serializedAudit).not.toContain("rawSourceCode");
    expect(target.auditReport.changedFiles[0]).toMatchObject({
      path: "runtime/src/example.ts",
      operation: "create"
    });
  });

  it("converts patch audit reports to no-compress zone segments", () => {
    const target = proposal([change()]);
    const segment = patchAuditToNoCompressZoneSegment(target.auditReport);
    const ledger = new ContextLedgerV2({
      clock: () => new Date(now)
    });
    ledger.addSegment(segment);

    const report = ledger.assemble({ logEvents: false });

    expect(segment.layer).toBe("no_compress_zone");
    expect(segment.noCompress).toBe(true);
    expect(report.noCompressZoneIds).toEqual([segment.id]);
  });

  it("converts patch proposal and audit reports to summary-only agent evidence refs", () => {
    const rawSource = "export const hidden = 1;\n";
    const target = proposal([change({ afterContent: rawSource })]);
    const proposalRef = patchProposalToEvidenceRef(target);
    const auditRef = patchAuditToAgentEvidenceRef(target.auditReport);
    const serialized = JSON.stringify([proposalRef, auditRef]);

    expect(proposalRef.summary).toContain("Patch proposal");
    expect(auditRef.summary).toContain("Patch audit");
    expect(serialized).not.toContain(rawSource);
    expect(serialized).not.toContain("hidden");
  });

  it("keeps future patch apply capability disabled and not AUTO", () => {
    const descriptor = describePatchApplyCapability();
    const validation = validateCapabilityDescriptor(descriptor);

    expect(descriptor.invokePolicy).toBe("DISABLED");
    expect(descriptor.executionMode).toBe("SIMULATE");
    expect(validation.ok).toBe(true);
  });
});
