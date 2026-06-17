import {
  type ContextPlacementDecision,
  type ContextSegmentV2
} from "./rules-types.js";

export function isNoCompressPlacement(
  placement: ContextPlacementDecision
): boolean {
  return placement === "no_compress_zone";
}

export function isNoCompressZoneSegment(
  segment: Pick<ContextSegmentV2, "layer" | "placement" | "noCompress">
): boolean {
  return (
    segment.layer === "no_compress_zone" ||
    segment.placement === "no_compress_zone" ||
    segment.noCompress === true
  );
}

export function noCompressZoneSummary(
  segments: readonly ContextSegmentV2[]
): string[] {
  return segments.filter(isNoCompressZoneSegment).map((segment) => segment.id);
}
