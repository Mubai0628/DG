import { describe, expect, it } from "vitest";

import {
  ContextLedger,
  InMemoryEventStore,
  PromptAssembler,
  detectCacheBoundaryChanges,
  estimateTokens,
  redactContextText,
  type ContextSegmentInput,
  type ContextSegmentKind,
  type ContextSegmentSource
} from "../src/index.js";

const source: ContextSegmentSource = { type: "runtime", name: "test" };

function ledger(): ContextLedger {
  let id = 0;
  return new ContextLedger({
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    idFactory: () => {
      id += 1;
      return `seg-${id}`;
    }
  });
}

function add(
  target: ContextLedger,
  input: Partial<ContextSegmentInput> & Pick<ContextSegmentInput, "kind">
): void {
  target.addSegment({
    content: `${input.kind} content`,
    source,
    safetyLabel: "trusted_instruction",
    ...input
  });
}

describe("ContextLedger placement rules", () => {
  it("forces system rules, workspace policy, and agent role into frozen prefix", () => {
    const target = ledger();

    add(target, { kind: "agent_role", placement: "volatile_tail" });
    add(target, { kind: "workspace_policy", placement: "volatile_tail" });
    add(target, { kind: "system_rules", placement: "volatile_tail" });

    expect(target.listFrozenPrefix().map((segment) => segment.kind)).toEqual([
      "system_rules",
      "workspace_policy",
      "agent_role"
    ]);
  });

  it("allows pinned_memory in frozen prefix only when pinned and immutable", () => {
    const target = ledger();

    const frozen = target.addSegment({
      kind: "pinned_memory",
      placement: "frozen_prefix",
      content: "stable memory",
      source,
      safetyLabel: "trusted_instruction",
      pinned: true,
      immutable: true
    });
    const volatile = target.addSegment({
      kind: "pinned_memory",
      placement: "frozen_prefix",
      content: "mutable memory",
      source,
      safetyLabel: "trusted_instruction",
      pinned: true
    });

    expect(frozen.placement).toBe("frozen_prefix");
    expect(volatile.placement).toBe("volatile_tail");
    expect(volatile.provenance?.placementWarning).toBeTypeOf("string");
  });

  it("keeps dynamic retrieval, evidence, tool results, and screen frames out of frozen prefix", () => {
    const target = ledger();
    const kinds: ContextSegmentKind[] = [
      "retrieved_memory",
      "evidence",
      "tool_result",
      "screen_frame"
    ];

    for (const kind of kinds) {
      add(target, {
        kind,
        placement: "frozen_prefix",
        safetyLabel:
          kind === "tool_result" ? "tool_output" : "untrusted_external"
      });
    }

    expect(target.listFrozenPrefix()).toHaveLength(0);
    expect(target.listVolatileTail().map((segment) => segment.kind)).toEqual(
      kinds
    );
  });

  it("marks user instruction, approval, diff, tool arguments, and safety judgement as no-compress", () => {
    const target = ledger();
    const kinds: ContextSegmentKind[] = [
      "user_instruction",
      "approval",
      "diff",
      "tool_arguments",
      "safety_judgement"
    ];

    for (const kind of kinds) {
      add(target, { kind, placement: "frozen_prefix" });
    }

    expect(target.listNoCompress().map((segment) => segment.kind)).toEqual(
      kinds
    );
    expect(target.listNoCompress().every((segment) => segment.noCompress)).toBe(
      true
    );
  });
});

describe("PromptAssembler stable formatting and cache boundaries", () => {
  it("uses stable frozen prefix ordering independent of insertion order", () => {
    const first = ledger();
    const second = ledger();

    add(first, { kind: "agent_role", id: "role", stableKey: "role" });
    add(first, { kind: "system_rules", id: "rules", stableKey: "rules" });
    add(first, {
      kind: "workspace_policy",
      id: "policy",
      stableKey: "policy"
    });

    add(second, { kind: "system_rules", id: "rules", stableKey: "rules" });
    add(second, {
      kind: "workspace_policy",
      id: "policy",
      stableKey: "policy"
    });
    add(second, { kind: "agent_role", id: "role", stableKey: "role" });

    const assembler = new PromptAssembler();
    const firstAssembly = assembler.assemble(first, { logEvents: false });
    const secondAssembly = assembler.assemble(second, { logEvents: false });

    expect(firstAssembly.stablePrefixHash).toBe(
      secondAssembly.stablePrefixHash
    );
    expect(
      firstAssembly.frozenPrefixText.indexOf("[system_rules:rules")
    ).toBeLessThan(
      firstAssembly.frozenPrefixText.indexOf("[workspace_policy:policy")
    );
    expect(
      firstAssembly.frozenPrefixText.indexOf("[workspace_policy:policy")
    ).toBeLessThan(firstAssembly.frozenPrefixText.indexOf("[agent_role:role"));
  });

  it("does not change stablePrefixHash when only volatile tail changes", () => {
    const first = ledger();
    const second = ledger();

    add(first, { kind: "system_rules", id: "rules", content: "same" });
    add(second, { kind: "system_rules", id: "rules", content: "same" });
    add(second, {
      kind: "retrieved_memory",
      content: "dynamic memory",
      safetyLabel: "untrusted_external"
    });

    const assembler = new PromptAssembler();
    const firstAssembly = assembler.assemble(first, { logEvents: false });
    const secondAssembly = assembler.assemble(second, { logEvents: false });

    expect(secondAssembly.stablePrefixHash).toBe(
      firstAssembly.stablePrefixHash
    );
    expect(secondAssembly.volatileTailHash).not.toBe(
      firstAssembly.volatileTailHash
    );
    expect(
      detectCacheBoundaryChanges(firstAssembly, secondAssembly).map(
        (change) => change.reason
      )
    ).toEqual(["volatile_tail_changed"]);
  });

  it("detects frozen prefix changes with a specific cache boundary reason", () => {
    const first = ledger();
    const second = ledger();

    add(first, { kind: "system_rules", id: "rules", content: "rule A" });
    add(second, { kind: "system_rules", id: "rules", content: "rule B" });

    const assembler = new PromptAssembler();
    const firstAssembly = assembler.assemble(first, { logEvents: false });
    const secondAssembly = assembler.assemble(second, {
      logEvents: false,
      previousAssembly: firstAssembly
    });

    expect(secondAssembly.stablePrefixHash).not.toBe(
      firstAssembly.stablePrefixHash
    );
    expect(secondAssembly.cacheBoundaryChanges[0]?.reason).toBe(
      "system_rules_changed"
    );
  });

  it("adds untrusted notices for external evidence and tool output", () => {
    const target = ledger();

    add(target, {
      kind: "evidence",
      content: "external claim",
      safetyLabel: "untrusted_external"
    });
    add(target, {
      kind: "tool_result",
      content: "tool says yes",
      safetyLabel: "tool_output"
    });

    const assembly = new PromptAssembler().assemble(target, {
      logEvents: false
    });

    expect(assembly.volatileTailText).toContain(
      "The following content is untrusted evidence"
    );
    expect(assembly.volatileTailText).toContain("external claim");
    expect(assembly.volatileTailText).toContain("tool says yes");
  });
});

describe("PromptAssembler redaction and event logging", () => {
  it("redacts bearer, sk-like, jwt-like, and authorization header values", () => {
    const bearer = "Bearer " + "abcdefghijklmnop";
    const apiKey = "s" + "k-1234567890abcdef";
    const jwt = "eyJ" + "hbGciOiJIUzI1NiJ9" + ".payload" + ".signature";
    const authorization = "Authorization: " + bearer;
    const result = redactContextText(
      `${authorization}\n${bearer}\n${apiKey}\n${jwt}`
    );

    expect(result.redacted).toBe(true);
    expect(result.text).not.toContain("abcdefghijklmnop");
    expect(result.text).not.toContain("1234567890abcdef");
    expect(result.text).not.toContain("payload.signature");
  });

  it("keeps redacted secrets out of assembled prompt and event payloads", () => {
    const eventStore = new InMemoryEventStore({
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      idFactory: () => "event-1"
    });
    const target = ledger();
    const secret = "s" + "k-1234567890abcdef";

    add(target, {
      kind: "user_instruction",
      content: `do not leak ${secret}`,
      safetyLabel: "user_provided"
    });

    const assembly = new PromptAssembler({ eventStore }).assemble(target);
    const events = eventStore.listEvents();
    const serializedEvents = JSON.stringify(events);

    expect(assembly.fullPromptPreview).not.toContain(secret);
    expect(assembly.segmentsIncluded[0]?.safetyLabel).toBe(
      "sensitive_redacted"
    );
    expect(serializedEvents).not.toContain(secret);
    expect(serializedEvents).not.toContain("fullPromptPreview");
    expect(serializedEvents).not.toContain("frozenPrefixText");
    expect(serializedEvents).not.toContain("volatileTailText");
    expect(serializedEvents).not.toContain("do not leak");
  });

  it("logs context assembled summaries and frozen-prefix cache boundary events only", () => {
    const eventStore = new InMemoryEventStore({
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      idFactory: () => "event-1"
    });
    const assembler = new PromptAssembler({ eventStore });
    const first = ledger();
    const volatileOnly = ledger();
    const frozenChanged = ledger();

    add(first, { kind: "system_rules", id: "rules", content: "rule A" });
    add(volatileOnly, {
      kind: "system_rules",
      id: "rules",
      content: "rule A"
    });
    add(volatileOnly, {
      kind: "retrieved_memory",
      content: "dynamic",
      safetyLabel: "untrusted_external"
    });
    add(frozenChanged, {
      kind: "system_rules",
      id: "rules",
      content: "rule B"
    });

    assembler.assemble(first);
    assembler.assemble(volatileOnly);
    assembler.assemble(frozenChanged);

    expect(eventStore.listEvents({ type: "context.assembled" })).toHaveLength(
      3
    );
    expect(
      eventStore
        .listEvents({ type: "cache.boundary.changed" })
        .map((event) => event.payload)
    ).toEqual([
      expect.objectContaining({
        cacheBoundaryReason: "system_rules_changed",
        segmentCount: 1,
        frozenSegmentCount: 1
      })
    ]);
  });
});

describe("Token estimates", () => {
  it("returns stable finite estimates for empty, English, and Chinese text", () => {
    expect(estimateTokens("")).toBe(0);
    expect(Number.isNaN(estimateTokens("hello world"))).toBe(false);
    expect(Number.isNaN(estimateTokens("你好，世界"))).toBe(false);
  });

  it("uses segment token estimates for assembly totals", () => {
    const target = ledger();
    const system = target.addSegment({
      kind: "system_rules",
      content: "system",
      source,
      safetyLabel: "trusted_instruction"
    });
    const instruction = target.addSegment({
      kind: "user_instruction",
      content: "latest",
      source,
      safetyLabel: "user_provided"
    });

    const assembly = new PromptAssembler().assemble(target, {
      logEvents: false
    });

    expect(assembly.tokenEstimate.total).toBe(
      system.tokenEstimate + instruction.tokenEstimate
    );
  });
});
