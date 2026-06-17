import { createHash } from "node:crypto";

import { estimateTokens } from "./token-estimator.js";
import {
  type ContextLayer,
  type ContextSegmentV2,
  type ContextSegmentV2Input
} from "./rules-types.js";

export const contextLayers: readonly ContextLayer[] = [
  "immutable_rules",
  "workspace_rules",
  "task_contract",
  "session_working_set",
  "volatile_tail",
  "no_compress_zone"
];

export function createContextSegmentV2(
  input: ContextSegmentV2Input,
  defaults: {
    id: string;
    now: string;
    placement: ContextSegmentV2["placement"];
  }
): ContextSegmentV2 {
  const tokenEstimate = input.tokenEstimate ?? estimateTokens(input.content);
  const provenance = { ...(input.provenance ?? {}) };
  const hash = hashSegmentInput(input);

  const segment: ContextSegmentV2 = {
    id: input.id ?? defaults.id,
    layer: input.layer,
    title: input.title,
    content: input.content,
    source: input.source,
    priority: input.priority ?? 0,
    provenance,
    createdAt: input.createdAt ?? defaults.now,
    tokenEstimate,
    sensitivity: input.sensitivity ?? "internal",
    placement: defaults.placement,
    hash
  };

  if (input.pinned !== undefined) {
    segment.pinned = input.pinned;
  }
  if (input.immutable !== undefined) {
    segment.immutable = input.immutable;
  }
  if (input.updatedAt !== undefined) {
    segment.updatedAt = input.updatedAt;
  }
  if (input.noCompress === true || input.layer === "no_compress_zone") {
    segment.noCompress = true;
  }

  return segment;
}

export function cloneContextSegmentV2(
  segment: ContextSegmentV2
): ContextSegmentV2 {
  const clone: ContextSegmentV2 = {
    id: segment.id,
    layer: segment.layer,
    title: segment.title,
    content: segment.content,
    source: segment.source,
    priority: segment.priority,
    provenance: { ...segment.provenance },
    createdAt: segment.createdAt,
    tokenEstimate: segment.tokenEstimate,
    sensitivity: segment.sensitivity,
    placement: segment.placement,
    hash: segment.hash
  };

  if (segment.pinned !== undefined) {
    clone.pinned = segment.pinned;
  }
  if (segment.immutable !== undefined) {
    clone.immutable = segment.immutable;
  }
  if (segment.updatedAt !== undefined) {
    clone.updatedAt = segment.updatedAt;
  }
  if (segment.noCompress !== undefined) {
    clone.noCompress = segment.noCompress;
  }

  return clone;
}

export function stableSegmentSortKey(segment: ContextSegmentV2): string {
  return [
    segment.layer,
    String(segment.priority).padStart(8, "0"),
    segment.source,
    segment.title,
    segment.id
  ].join("\0");
}

export function compareContextSegmentsV2(
  left: ContextSegmentV2,
  right: ContextSegmentV2
): number {
  return stableSegmentSortKey(left).localeCompare(stableSegmentSortKey(right));
}

export function hashContextSegmentsV2(
  segments: readonly ContextSegmentV2[]
): string {
  const serialized = [...segments]
    .sort(compareContextSegmentsV2)
    .map((segment) =>
      [
        segment.id,
        segment.layer,
        segment.source,
        segment.priority,
        segment.placement,
        segment.hash
      ].join("\0")
    )
    .join("\n");

  return sha256(serialized);
}

export function contentHash(content: string): string {
  return sha256(content);
}

function hashSegmentInput(input: ContextSegmentV2Input): string {
  return sha256(
    [
      input.layer,
      input.source,
      input.title,
      input.content,
      input.priority ?? 0,
      input.sensitivity ?? "internal"
    ].join("\0")
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
