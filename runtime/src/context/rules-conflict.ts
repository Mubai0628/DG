import { type ContextSegmentV2, type RuleConflict } from "./rules-types.js";

const ruleLayers = new Set(["immutable_rules", "workspace_rules"]);

export function detectRuleConflicts(
  segments: readonly ContextSegmentV2[]
): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  const byId = new Map<string, ContextSegmentV2[]>();
  const byLayerPriority = new Map<string, ContextSegmentV2[]>();

  for (const segment of segments) {
    if (!ruleLayers.has(segment.layer)) {
      continue;
    }

    const idGroup = byId.get(segment.id) ?? [];
    idGroup.push(segment);
    byId.set(segment.id, idGroup);

    const priorityKey = `${segment.layer}:${segment.priority}`;
    const priorityGroup = byLayerPriority.get(priorityKey) ?? [];
    priorityGroup.push(segment);
    byLayerPriority.set(priorityKey, priorityGroup);
  }

  for (const group of byId.values()) {
    if (group.length > 1) {
      conflicts.push({
        kind: "duplicate_rule_id",
        segmentIds: group.map((segment) => segment.id).sort()
      });
    }
  }

  for (const group of byLayerPriority.values()) {
    const uniqueIds = [...new Set(group.map((segment) => segment.id))].sort();
    if (uniqueIds.length > 1) {
      const first = group[0];
      if (first !== undefined) {
        conflicts.push({
          kind: "duplicate_rule_priority",
          segmentIds: uniqueIds,
          layer: first.layer,
          priority: first.priority
        });
      }
    }
  }

  return conflicts.sort((left, right) =>
    `${left.kind}:${left.segmentIds.join(",")}`.localeCompare(
      `${right.kind}:${right.segmentIds.join(",")}`
    )
  );
}
