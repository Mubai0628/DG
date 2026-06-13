import { createHash } from "node:crypto";

import {
  type ContextSafetyLabel,
  type ContextSegment,
  type ContextSegmentId,
  type ContextSegmentInput,
  type ContextSegmentKind,
  type ContextSegmentPlacement,
  type PlacementRuleResult
} from "./types.js";
import { redactContextText } from "./redaction.js";
import { estimateTokens } from "./token-estimator.js";

const frozenKinds: readonly ContextSegmentKind[] = [
  "system_rules",
  "workspace_policy",
  "agent_role",
  "pinned_memory"
];

const volatileKinds = new Set<ContextSegmentKind>([
  "retrieved_memory",
  "evidence",
  "tool_result",
  "screen_frame",
  "task_context",
  "active_plan",
  "recent_message"
]);

const noCompressKinds = new Set<ContextSegmentKind>([
  "user_instruction",
  "approval",
  "diff",
  "tool_arguments",
  "safety_judgement"
]);

const volatileSortOrder: readonly ContextSegmentKind[] = [
  "user_instruction",
  "task_context",
  "active_plan",
  "retrieved_memory",
  "evidence",
  "tool_result",
  "screen_frame",
  "recent_message",
  "approval",
  "diff",
  "tool_arguments",
  "safety_judgement"
];

export type ContextLedgerOptions = {
  clock?: () => Date;
  idFactory?: () => string;
};

export class ContextLedger {
  private readonly segments: ContextSegment[] = [];
  private readonly clock: () => Date;
  private readonly idFactory: () => string;

  constructor(options: ContextLedgerOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? defaultIdFactory();
  }

  addSegment(input: ContextSegmentInput): ContextSegment {
    const rule = enforcePlacementRules(input);
    const redaction = redactContextText(input.content);
    const provenance = { ...(input.provenance ?? {}) };

    if (rule.warning !== undefined) {
      provenance.placementWarning = rule.warning;
      if (input.placement !== undefined) {
        provenance.placementCorrectedFrom = input.placement;
      }
    }

    const safetyLabel = redaction.redacted
      ? normalizeRedactedSafetyLabel(input.safetyLabel)
      : input.safetyLabel;

    const segment: ContextSegment = {
      id: input.id ?? this.idFactory(),
      kind: input.kind,
      placement: rule.placement,
      content: redaction.text,
      source: { ...input.source },
      safetyLabel,
      tokenEstimate: estimateTokens(redaction.text),
      createdAt: this.clock().toISOString()
    };

    if (input.stableKey !== undefined) {
      segment.stableKey = input.stableKey;
    }
    if (input.pinned !== undefined) {
      segment.pinned = input.pinned;
    }
    if (input.immutable !== undefined) {
      segment.immutable = input.immutable;
    }
    if (Object.keys(provenance).length > 0) {
      segment.provenance = provenance;
    }
    if (redaction.redacted || input.redacted === true) {
      segment.redacted = true;
    }
    if (rule.noCompress || input.noCompress === true) {
      segment.noCompress = true;
    }

    this.segments.push(segment);
    return cloneSegment(segment);
  }

  listSegments(): ContextSegment[] {
    return this.segments.map((segment) => cloneSegment(segment));
  }

  listFrozenPrefix(): ContextSegment[] {
    return this.segments
      .filter((segment) => segment.placement === "frozen_prefix")
      .sort(compareFrozenSegments)
      .map((segment) => cloneSegment(segment));
  }

  listVolatileTail(): ContextSegment[] {
    return this.segments
      .filter((segment) => segment.placement === "volatile_tail")
      .sort(compareVolatileSegments)
      .map((segment) => cloneSegment(segment));
  }

  listNoCompress(): ContextSegment[] {
    return this.segments
      .filter((segment) => segment.placement === "no_compress")
      .sort(compareVolatileSegments)
      .map((segment) => cloneSegment(segment));
  }

  removeSegment(id: ContextSegmentId): void {
    const index = this.segments.findIndex((segment) => segment.id === id);
    if (index >= 0) {
      this.segments.splice(index, 1);
    }
  }

  clear(): void {
    this.segments.splice(0, this.segments.length);
  }

  clone(): ContextLedger {
    const ledger = new ContextLedger({
      clock: this.clock,
      idFactory: this.idFactory
    });
    for (const segment of this.segments) {
      ledger.segments.push(cloneSegment(segment));
    }
    return ledger;
  }

  getStablePrefixHash(): string {
    return hashContextSegments(this.listFrozenPrefix());
  }

  getVolatileTailHash(): string {
    return hashContextSegments([
      ...this.listVolatileTail(),
      ...this.listNoCompress()
    ]);
  }
}

export function enforcePlacementRules(
  input: Pick<
    ContextSegmentInput,
    "kind" | "placement" | "pinned" | "immutable"
  >
): PlacementRuleResult {
  if (
    input.kind === "system_rules" ||
    input.kind === "workspace_policy" ||
    input.kind === "agent_role"
  ) {
    return forcedPlacement(input, "frozen_prefix");
  }

  if (input.kind === "pinned_memory") {
    const canFreeze = input.pinned === true && input.immutable === true;
    if (canFreeze) {
      return forcedPlacement(input, "frozen_prefix");
    }
    return {
      placement: "volatile_tail",
      noCompress: false,
      ...(input.placement === "frozen_prefix"
        ? {
            warning:
              "pinned_memory requires pinned=true and immutable=true for frozen_prefix"
          }
        : {})
    };
  }

  if (volatileKinds.has(input.kind)) {
    return forcedPlacement(input, "volatile_tail");
  }

  if (noCompressKinds.has(input.kind)) {
    return forcedPlacement(input, "no_compress", true);
  }

  return {
    placement: input.placement ?? "volatile_tail",
    noCompress: input.placement === "no_compress"
  };
}

export function compareFrozenSegments(
  left: ContextSegment,
  right: ContextSegment
): number {
  const leftKind = frozenKinds.indexOf(left.kind);
  const rightKind = frozenKinds.indexOf(right.kind);
  if (leftKind !== rightKind) {
    return leftKind - rightKind;
  }
  return compareStableSegmentKey(left, right);
}

export function compareVolatileSegments(
  left: ContextSegment,
  right: ContextSegment
): number {
  const leftKind = volatileSortIndex(left.kind);
  const rightKind = volatileSortIndex(right.kind);
  if (leftKind !== rightKind) {
    return leftKind - rightKind;
  }
  return compareStableSegmentKey(left, right);
}

function volatileSortIndex(kind: ContextSegmentKind): number {
  const index = volatileSortOrder.indexOf(kind);
  return index >= 0 ? index : volatileSortOrder.length;
}

export function hashContextSegments(
  segments: readonly ContextSegment[]
): string {
  const serialized = segments
    .map((segment) =>
      [
        segment.kind,
        segment.placement,
        segment.stableKey ?? segment.id,
        segment.safetyLabel,
        segment.content
      ].join("\0")
    )
    .join("\n");

  return createHash("sha256").update(serialized).digest("hex");
}

export function cloneSegment(segment: ContextSegment): ContextSegment {
  const clone: ContextSegment = {
    id: segment.id,
    kind: segment.kind,
    placement: segment.placement,
    content: segment.content,
    source: { ...segment.source },
    safetyLabel: segment.safetyLabel,
    tokenEstimate: segment.tokenEstimate,
    createdAt: segment.createdAt
  };

  if (segment.stableKey !== undefined) {
    clone.stableKey = segment.stableKey;
  }
  if (segment.pinned !== undefined) {
    clone.pinned = segment.pinned;
  }
  if (segment.immutable !== undefined) {
    clone.immutable = segment.immutable;
  }
  if (segment.provenance !== undefined) {
    clone.provenance = { ...segment.provenance };
  }
  if (segment.redacted !== undefined) {
    clone.redacted = segment.redacted;
  }
  if (segment.noCompress !== undefined) {
    clone.noCompress = segment.noCompress;
  }

  return clone;
}

function forcedPlacement(
  input: Pick<ContextSegmentInput, "kind" | "placement">,
  placement: ContextSegmentPlacement,
  noCompress = false
): PlacementRuleResult {
  const warning =
    input.placement !== undefined && input.placement !== placement
      ? `${input.kind} placement corrected from ${input.placement} to ${placement}`
      : undefined;

  return {
    placement,
    noCompress,
    ...(warning !== undefined ? { warning } : {})
  };
}

function compareStableSegmentKey(
  left: ContextSegment,
  right: ContextSegment
): number {
  const leftKey = left.stableKey ?? left.id;
  const rightKey = right.stableKey ?? right.id;
  if (leftKey !== rightKey) {
    return leftKey.localeCompare(rightKey);
  }
  return left.id.localeCompare(right.id);
}

function normalizeRedactedSafetyLabel(
  safetyLabel: ContextSafetyLabel
): ContextSafetyLabel {
  if (safetyLabel === "secret_blocked") {
    return "secret_blocked";
  }
  return "sensitive_redacted";
}

function defaultIdFactory(): () => string {
  let nextId = 0;
  return () => {
    nextId += 1;
    return `ctx-${nextId}`;
  };
}
