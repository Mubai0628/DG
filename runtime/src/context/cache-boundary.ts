import {
  type CacheBoundaryChange,
  type ContextCacheBoundaryReason,
  type ContextAssemblyResult,
  type ContextSegment,
  type ContextSegmentKind
} from "./types.js";

const frozenReasonByKind: Partial<
  Record<ContextSegmentKind, ContextCacheBoundaryReason>
> = {
  system_rules: "system_rules_changed",
  workspace_policy: "workspace_policy_changed",
  agent_role: "agent_role_changed",
  pinned_memory: "pinned_memory_changed"
};

export function detectCacheBoundaryChanges(
  previousAssembly: ContextAssemblyResult | undefined,
  nextAssembly: ContextAssemblyResult
): CacheBoundaryChange[] {
  if (previousAssembly === undefined) {
    return [];
  }

  const changes: CacheBoundaryChange[] = [];

  if (previousAssembly.stablePrefixHash !== nextAssembly.stablePrefixHash) {
    changes.push({
      reason: detectFrozenPrefixReason(previousAssembly, nextAssembly),
      previousHash: previousAssembly.stablePrefixHash,
      nextHash: nextAssembly.stablePrefixHash
    });
  }

  if (previousAssembly.volatileTailHash !== nextAssembly.volatileTailHash) {
    changes.push({
      reason: "volatile_tail_changed",
      previousHash: previousAssembly.volatileTailHash,
      nextHash: nextAssembly.volatileTailHash
    });
  }

  return changes;
}

function detectFrozenPrefixReason(
  previousAssembly: ContextAssemblyResult,
  nextAssembly: ContextAssemblyResult
): ContextCacheBoundaryReason {
  const previousFrozen = frozenSegments(previousAssembly);
  const nextFrozen = frozenSegments(nextAssembly);
  const previousOrder = previousFrozen.map(segmentKey).join("\n");
  const nextOrder = nextFrozen.map(segmentKey).join("\n");
  const previousOrderSet = [...previousFrozen.map(segmentKey)]
    .sort()
    .join("\n");
  const nextOrderSet = [...nextFrozen.map(segmentKey)].sort().join("\n");

  if (previousOrder !== nextOrder && previousOrderSet === nextOrderSet) {
    return "frozen_prefix_order_changed";
  }

  for (const kind of [
    "system_rules",
    "workspace_policy",
    "agent_role",
    "pinned_memory"
  ] as const) {
    if (
      kindFingerprint(previousFrozen, kind) !==
      kindFingerprint(nextFrozen, kind)
    ) {
      return frozenReasonByKind[kind] ?? "unknown_frozen_prefix_changed";
    }
  }

  return "unknown_frozen_prefix_changed";
}

function frozenSegments(assembly: ContextAssemblyResult): ContextSegment[] {
  return assembly.segmentsIncluded.filter(
    (segment) => segment.placement === "frozen_prefix"
  );
}

function kindFingerprint(
  segments: readonly ContextSegment[],
  kind: ContextSegmentKind
): string {
  return segments
    .filter((segment) => segment.kind === kind)
    .map(
      (segment) =>
        `${segmentKey(segment)}\0${segment.safetyLabel}\0${segment.content}`
    )
    .join("\n");
}

function segmentKey(segment: ContextSegment): string {
  return `${segment.kind}:${segment.stableKey ?? segment.id}`;
}
