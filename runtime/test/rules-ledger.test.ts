import { describe, expect, it } from "vitest";

import {
  ContextLedgerV2,
  InMemoryEventStore,
  type ContextAssemblyReport,
  type ContextLayer,
  type ContextSegmentV2Input,
  type RuleSource
} from "../src/index.js";

function ledger(): ContextLedgerV2 {
  return new ContextLedgerV2({
    clock: () => new Date("2026-01-01T00:00:00.000Z")
  });
}

function add(
  target: ContextLedgerV2,
  input: Partial<ContextSegmentV2Input> &
    Pick<ContextSegmentV2Input, "id" | "layer" | "source">
): void {
  target.addSegment({
    title: `${input.id} title`,
    content: `${input.id} raw content`,
    priority: 10,
    ...input
  });
}

function reportWith(
  layer: ContextLayer,
  source: RuleSource,
  content: string
): ContextAssemblyReport {
  const target = ledger();
  add(target, {
    id: "immutable",
    layer: "immutable_rules",
    source: "system",
    immutable: true,
    content: "stable"
  });
  add(target, {
    id: "target",
    layer,
    source,
    content
  });
  return target.assemble({ logEvents: false });
}

describe("ContextLedgerV2 placement rules", () => {
  it("places immutable and stable workspace rules in the frozen prefix", () => {
    const target = ledger();
    add(target, {
      id: "system-rule",
      layer: "immutable_rules",
      source: "system",
      immutable: true
    });
    add(target, {
      id: "workspace-rule",
      layer: "workspace_rules",
      source: "repository"
    });

    const report = target.assemble({ logEvents: false });

    expect(report.activeRuleIds).toEqual(["system-rule", "workspace-rule"]);
    expect(report.segmentCountByLayer.immutable_rules).toBe(1);
    expect(report.segmentCountByLayer.workspace_rules).toBe(1);
    expect(
      report.placementDecisions.map((decision) => decision.placement)
    ).toEqual(["frozen_prefix", "frozen_prefix"]);
  });

  it("forces dynamic memory recall, tool result, and untrusted evidence into volatile tail", () => {
    const target = ledger();
    add(target, {
      id: "memory",
      layer: "workspace_rules",
      source: "memory_recall",
      placement: "frozen_prefix"
    });
    add(target, {
      id: "tool",
      layer: "session_working_set",
      source: "tool_result",
      placement: "frozen_prefix"
    });
    add(target, {
      id: "evidence",
      layer: "volatile_tail",
      source: "external_untrusted",
      placement: "frozen_prefix"
    });

    const report = target.assemble({ logEvents: false });

    expect(
      report.placementDecisions.map((decision) => decision.placement)
    ).toEqual(["volatile_tail", "volatile_tail", "volatile_tail"]);
    expect(report.segmentCountByLayer.volatile_tail).toBe(1);
    expect(report.segmentCountByLayer.session_working_set).toBe(1);
    expect(report.segmentCountByLayer.workspace_rules).toBe(1);
  });

  it("marks approval, diff, tool args, and safety judgement as no-compress", () => {
    const target = ledger();
    for (const id of ["approval", "diff", "tool-args", "safety"]) {
      add(target, {
        id,
        layer: "no_compress_zone",
        source: "user_confirmed",
        placement: "frozen_prefix"
      });
    }

    const report = target.assemble({ logEvents: false });

    expect(report.noCompressZoneIds).toEqual([
      "approval",
      "diff",
      "safety",
      "tool-args"
    ]);
    expect(
      report.placementDecisions.every(
        (decision) => decision.placement === "no_compress_zone"
      )
    ).toBe(true);
  });

  it("rejects unsafe immutable rule placement with a warning", () => {
    const target = ledger();
    add(target, {
      id: "mutable-system",
      layer: "immutable_rules",
      source: "system",
      placement: "frozen_prefix"
    });

    const report = target.assemble({ logEvents: false });

    expect(report.rejectedSegmentIds).toEqual(["mutable-system"]);
    expect(report.warnings).toEqual([
      expect.objectContaining({
        code: "PLACEMENT_CORRECTED",
        segmentId: "mutable-system"
      })
    ]);
  });
});

describe("ContextLedgerV2 hash model", () => {
  it("changes taskContractHash but not globalFrozenPrefixHash for task changes", () => {
    const first = reportWith("task_contract", "task", "task A");
    const second = reportWith("task_contract", "task", "task B");

    expect(second.hashSummary.globalFrozenPrefixHash).toBe(
      first.hashSummary.globalFrozenPrefixHash
    );
    expect(second.hashSummary.taskContractHash).not.toBe(
      first.hashSummary.taskContractHash
    );
  });

  it("does not change globalFrozenPrefixHash for volatile tail changes", () => {
    const first = reportWith("volatile_tail", "session", "volatile A");
    const second = reportWith("volatile_tail", "session", "volatile B");

    expect(second.hashSummary.globalFrozenPrefixHash).toBe(
      first.hashSummary.globalFrozenPrefixHash
    );
    expect(second.hashSummary.volatileTailHash).not.toBe(
      first.hashSummary.volatileTailHash
    );
  });

  it("emits cache.boundary.changed reason when frozen rules change", () => {
    const firstLedger = ledger();
    const secondLedger = ledger();
    add(firstLedger, {
      id: "immutable",
      layer: "immutable_rules",
      source: "system",
      immutable: true,
      content: "rule A"
    });
    add(secondLedger, {
      id: "immutable",
      layer: "immutable_rules",
      source: "system",
      immutable: true,
      content: "rule B"
    });

    const first = firstLedger.assemble({ logEvents: false });
    const second = secondLedger.assemble({
      logEvents: false,
      previousReport: first
    });

    expect(second.cacheBoundaryChangedReasons).toContain(
      "global_frozen_prefix_changed"
    );
  });

  it("keeps frozen hash stable across insertion order", () => {
    const first = ledger();
    const second = ledger();
    add(first, {
      id: "a",
      layer: "immutable_rules",
      source: "system",
      immutable: true,
      priority: 1
    });
    add(first, {
      id: "b",
      layer: "workspace_rules",
      source: "repository",
      priority: 2
    });
    add(second, {
      id: "b",
      layer: "workspace_rules",
      source: "repository",
      priority: 2
    });
    add(second, {
      id: "a",
      layer: "immutable_rules",
      source: "system",
      immutable: true,
      priority: 1
    });

    expect(second.assemble().hashSummary.globalFrozenPrefixHash).toBe(
      first.assemble().hashSummary.globalFrozenPrefixHash
    );
  });
});

describe("ContextLedgerV2 reports and events", () => {
  it("keeps raw content out of reports and event payloads", () => {
    const eventStore = new InMemoryEventStore({
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      idFactory: () => "event-1"
    });
    const target = new ContextLedgerV2({ eventStore });
    const raw = "raw segment content must not appear";
    add(target, {
      id: "secret-rule",
      layer: "immutable_rules",
      source: "system",
      immutable: true,
      content: raw
    });

    const report = target.assemble();
    const serializedReport = JSON.stringify(report);
    const serializedEvents = JSON.stringify(eventStore.listEvents());

    expect(serializedReport).not.toContain(raw);
    expect(serializedReport).not.toContain("content");
    expect(serializedEvents).not.toContain(raw);
    expect(serializedEvents).not.toContain("content");
    expect(
      eventStore.listEvents({ type: "context.rule.activated" })
    ).toHaveLength(1);
  });

  it("detects duplicate rule id and duplicate priority conflicts", () => {
    const target = ledger();
    add(target, {
      id: "duplicate",
      layer: "immutable_rules",
      source: "system",
      immutable: true,
      priority: 10,
      content: "one"
    });
    add(target, {
      id: "duplicate",
      layer: "immutable_rules",
      source: "system",
      immutable: true,
      priority: 11,
      content: "two"
    });
    add(target, {
      id: "same-priority",
      layer: "immutable_rules",
      source: "system",
      immutable: true,
      priority: 10
    });

    const conflicts = target.assemble({ logEvents: false }).conflicts;

    expect(conflicts.map((conflict) => conflict.kind)).toEqual([
      "duplicate_rule_id",
      "duplicate_rule_priority"
    ]);
  });

  it("tracks token estimates by layer", () => {
    const target = ledger();
    add(target, {
      id: "contract",
      layer: "task_contract",
      source: "task",
      tokenEstimate: 7
    });
    add(target, {
      id: "tail",
      layer: "volatile_tail",
      source: "session",
      tokenEstimate: 5
    });

    const report = target.assemble({ logEvents: false });

    expect(report.tokenEstimateByLayer.task_contract).toBe(7);
    expect(report.tokenEstimateByLayer.volatile_tail).toBe(5);
  });

  it("emits summary-only cache boundary events", () => {
    const eventStore = new InMemoryEventStore({
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      idFactory: () => "event-1"
    });
    const firstLedger = ledger();
    add(firstLedger, {
      id: "rule",
      layer: "immutable_rules",
      source: "system",
      immutable: true,
      content: "A"
    });
    const first = firstLedger.assemble({ logEvents: false });
    const second = new ContextLedgerV2({ eventStore });
    add(second, {
      id: "rule",
      layer: "immutable_rules",
      source: "system",
      immutable: true,
      content: "B"
    });

    second.assemble({ previousReport: first });

    const boundaryEvents = eventStore.listEvents({
      type: "cache.boundary.changed"
    });
    expect(boundaryEvents).toHaveLength(1);
    expect(JSON.stringify(boundaryEvents)).not.toContain("A");
    expect(JSON.stringify(boundaryEvents)).not.toContain("B");
  });
});
