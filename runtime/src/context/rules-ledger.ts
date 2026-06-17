import {
  cloneContextSegmentV2,
  createContextSegmentV2
} from "./context-segment-v2.js";
import { buildContextAssemblyReport } from "./context-assembly-report.js";
import {
  type ContextAssembleOptionsV2,
  type ContextAssemblyReport,
  type ContextLedgerV2Options,
  type ContextPlacementDecision,
  type ContextPlacementRecord,
  type ContextSegmentV2,
  type ContextSegmentV2Input
} from "./rules-types.js";

export class ContextLedgerV2 {
  private readonly segments: ContextSegmentV2[] = [];
  private readonly placementDecisions: ContextPlacementRecord[] = [];
  private readonly clock: () => Date;
  private readonly idFactory: () => string;

  constructor(private readonly options: ContextLedgerV2Options = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? defaultIdFactory();
  }

  addSegment(input: ContextSegmentV2Input): ContextSegmentV2 {
    const id = input.id ?? this.idFactory();
    const normalizedInput: ContextSegmentV2Input = { ...input, id };
    const decision = decidePlacement(normalizedInput);
    const segment = createContextSegmentV2(normalizedInput, {
      id,
      now: this.clock().toISOString(),
      placement: decision.placement
    });

    this.segments.push(segment);
    this.placementDecisions.push(decision);

    return cloneContextSegmentV2(segment);
  }

  listSegments(): ContextSegmentV2[] {
    return this.segments.map((segment) => cloneContextSegmentV2(segment));
  }

  assemble(options: ContextAssembleOptionsV2 = {}): ContextAssemblyReport {
    const reportInput: Parameters<typeof buildContextAssemblyReport>[0] = {
      segments: this.segments,
      placementDecisions: this.placementDecisions
    };
    if (options.previousReport !== undefined) {
      reportInput.previousReport = options.previousReport;
    }

    const report = buildContextAssemblyReport(reportInput);

    if (options.logEvents !== false) {
      this.logReport(report);
    }

    return report;
  }

  clear(): void {
    this.segments.splice(0, this.segments.length);
    this.placementDecisions.splice(0, this.placementDecisions.length);
  }

  private logReport(report: ContextAssemblyReport): void {
    if (this.options.eventStore === undefined) {
      return;
    }

    const payload = reportEventPayload(report);
    this.options.eventStore.appendEvent({
      type: "context.assembled",
      payload
    });

    for (const activation of report.activeRuleIds) {
      this.options.eventStore.appendEvent({
        type: "context.rule.activated",
        payload: {
          ruleId: activation,
          hashSummary: report.hashSummary
        }
      });
    }

    for (const reason of report.cacheBoundaryChangedReasons) {
      this.options.eventStore.appendEvent({
        type: "cache.boundary.changed",
        payload: {
          reason,
          hashSummary: report.hashSummary
        }
      });
    }
  }
}

export function decidePlacement(
  input: ContextSegmentV2Input
): ContextPlacementRecord {
  const forced = forcedPlacement(input);
  const requestedPlacement = input.placement;
  const record: ContextPlacementRecord = {
    segmentId: input.id ?? "(generated)",
    layer: input.layer,
    source: input.source,
    placement: forced.placement,
    reason: forced.reason
  };

  if (requestedPlacement !== undefined) {
    record.requestedPlacement = requestedPlacement;
  }

  return record;
}

function forcedPlacement(input: ContextSegmentV2Input): {
  placement: ContextPlacementDecision;
  reason: string;
} {
  if (input.layer === "no_compress_zone") {
    return {
      placement: "no_compress_zone",
      reason: "no_compress_zone is never summarized or compressed"
    };
  }

  if (input.source === "tool_result") {
    return {
      placement: "volatile_tail",
      reason: "tool_result is untrusted dynamic context"
    };
  }

  if (input.source === "external_untrusted") {
    return {
      placement: "volatile_tail",
      reason: "external_untrusted context cannot enter frozen prefix"
    };
  }

  if (input.source === "memory_recall") {
    return {
      placement: "volatile_tail",
      reason: "memory_recall is dynamic and must stay volatile"
    };
  }

  if (input.layer === "immutable_rules") {
    if (input.immutable === true) {
      return {
        placement: "frozen_prefix",
        reason: "immutable_rules with immutable=true enter frozen prefix"
      };
    }
    return {
      placement: "rejected",
      reason: "immutable_rules require immutable=true"
    };
  }

  if (input.layer === "workspace_rules") {
    if (
      input.immutable === true ||
      input.source === "repository" ||
      input.source === "workspace_file"
    ) {
      return {
        placement: "frozen_prefix",
        reason: "stable workspace_rules enter frozen prefix"
      };
    }
    return {
      placement: "volatile_tail",
      reason: "workspace_rules without stable source stay volatile"
    };
  }

  if (input.layer === "task_contract") {
    return {
      placement: "task_stable_prefix",
      reason: "task_contract is task-stable, not globally frozen"
    };
  }

  if (input.layer === "session_working_set") {
    return {
      placement: "volatile_tail",
      reason: "session_working_set is session volatile"
    };
  }

  return {
    placement: "volatile_tail",
    reason: "volatile_tail is always volatile"
  };
}

function reportEventPayload(
  report: ContextAssemblyReport
): Record<string, unknown> {
  return {
    segmentCountByLayer: report.segmentCountByLayer,
    tokenEstimateByLayer: report.tokenEstimateByLayer,
    activeRuleIds: report.activeRuleIds,
    rejectedSegmentIds: report.rejectedSegmentIds,
    noCompressZoneIds: report.noCompressZoneIds,
    hashSummary: report.hashSummary,
    cacheBoundaryChangedReasons: report.cacheBoundaryChangedReasons,
    warningCodes: report.warnings.map((warning) => warning.code)
  };
}

function defaultIdFactory(): () => string {
  let nextId = 0;
  return () => {
    nextId += 1;
    return `ctxv2-${nextId}`;
  };
}
