import {
  compareContextSegmentsV2,
  hashContextSegmentsV2
} from "./context-segment-v2.js";
import { noCompressZoneSummary } from "./no-compress-zone.js";
import { detectRuleConflicts } from "./rules-conflict.js";
import {
  type ContextAssemblyReport,
  type ContextBoundaryHash,
  type ContextLayer,
  type ContextLedgerWarning,
  type ContextPlacementRecord,
  type ContextSegmentV2
} from "./rules-types.js";

export function buildContextAssemblyReport(input: {
  segments: readonly ContextSegmentV2[];
  placementDecisions: readonly ContextPlacementRecord[];
  previousReport?: ContextAssemblyReport;
}): ContextAssemblyReport {
  const accepted = input.segments.filter(
    (segment) => segment.placement !== "rejected"
  );
  const rejected = input.segments.filter(
    (segment) => segment.placement === "rejected"
  );
  const hashSummary = buildHashSummary(accepted);
  const warnings = buildWarnings(input.placementDecisions);
  const activeRules = accepted
    .filter(
      (segment) =>
        segment.layer === "immutable_rules" ||
        segment.layer === "workspace_rules" ||
        segment.layer === "task_contract"
    )
    .sort(compareContextSegmentsV2);

  return {
    segmentCountByLayer: countByLayer(accepted),
    tokenEstimateByLayer: tokenEstimateByLayer(accepted),
    activeRuleIds: activeRules.map((segment) => segment.id),
    ignoredSegmentIds: [],
    rejectedSegmentIds: rejected.map((segment) => segment.id).sort(),
    hashSummary,
    warnings,
    conflicts: detectRuleConflicts(accepted),
    noCompressZoneIds: noCompressZoneSummary(accepted).sort(),
    cacheBoundaryChangedReasons: detectCacheBoundaryChangedReasons(
      input.previousReport?.hashSummary,
      hashSummary
    ),
    placementDecisions: [...input.placementDecisions]
  };
}

export function buildHashSummary(
  segments: readonly ContextSegmentV2[]
): ContextBoundaryHash {
  const frozen = segments.filter(
    (segment) => segment.placement === "frozen_prefix"
  );
  const workspace = frozen.filter(
    (segment) => segment.layer === "workspace_rules"
  );
  const task = segments.filter(
    (segment) => segment.placement === "task_stable_prefix"
  );
  const volatile = segments.filter(
    (segment) => segment.placement === "volatile_tail"
  );
  const noCompress = segments.filter(
    (segment) => segment.placement === "no_compress_zone"
  );

  return {
    globalFrozenPrefixHash: hashContextSegmentsV2(frozen),
    workspaceRulesHash: hashContextSegmentsV2(workspace),
    taskContractHash: hashContextSegmentsV2(task),
    volatileTailHash: hashContextSegmentsV2(volatile),
    noCompressZoneHash: hashContextSegmentsV2(noCompress)
  };
}

function countByLayer(
  segments: readonly ContextSegmentV2[]
): Record<ContextLayer, number> {
  const counts = emptyLayerRecord();
  for (const segment of segments) {
    counts[segment.layer] += 1;
  }
  return counts;
}

function tokenEstimateByLayer(
  segments: readonly ContextSegmentV2[]
): Record<ContextLayer, number> {
  const counts = emptyLayerRecord();
  for (const segment of segments) {
    counts[segment.layer] += segment.tokenEstimate;
  }
  return counts;
}

function emptyLayerRecord(): Record<ContextLayer, number> {
  return {
    immutable_rules: 0,
    workspace_rules: 0,
    task_contract: 0,
    session_working_set: 0,
    volatile_tail: 0,
    no_compress_zone: 0
  };
}

function buildWarnings(
  placementDecisions: readonly ContextPlacementRecord[]
): ContextLedgerWarning[] {
  return placementDecisions
    .filter((decision) => decision.requestedPlacement !== undefined)
    .filter((decision) => decision.requestedPlacement !== decision.placement)
    .map((decision) => ({
      code: "PLACEMENT_CORRECTED",
      segmentId: decision.segmentId,
      layer: decision.layer,
      message: `${decision.segmentId}: ${decision.reason}`
    }))
    .sort((left, right) => left.message.localeCompare(right.message));
}

function detectCacheBoundaryChangedReasons(
  previous: ContextBoundaryHash | undefined,
  next: ContextBoundaryHash
): string[] {
  if (previous === undefined) {
    return [];
  }

  const reasons: string[] = [];
  if (previous.globalFrozenPrefixHash !== next.globalFrozenPrefixHash) {
    reasons.push("global_frozen_prefix_changed");
  }
  if (previous.workspaceRulesHash !== next.workspaceRulesHash) {
    reasons.push("workspace_rules_changed");
  }
  return reasons;
}
