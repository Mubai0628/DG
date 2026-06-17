import { type EventStore } from "../events/index.js";

export type ContextLayer =
  | "immutable_rules"
  | "workspace_rules"
  | "task_contract"
  | "session_working_set"
  | "volatile_tail"
  | "no_compress_zone";

export type RuleSource =
  | "system"
  | "repository"
  | "workspace_file"
  | "user_confirmed"
  | "task"
  | "session"
  | "tool_result"
  | "external_untrusted"
  | "memory_recall";

export type RulePriority = number;

export type ContextPlacementDecision =
  | "frozen_prefix"
  | "task_stable_prefix"
  | "volatile_tail"
  | "no_compress_zone"
  | "rejected";

export type ContextSensitivity =
  | "public"
  | "internal"
  | "sensitive"
  | "secret_blocked";

export type ContextBoundaryHash = {
  globalFrozenPrefixHash: string;
  workspaceRulesHash: string;
  taskContractHash: string;
  volatileTailHash: string;
  noCompressZoneHash: string;
};

export type ContextLedgerWarning = {
  code: string;
  segmentId?: string;
  layer?: ContextLayer;
  message: string;
};

export type ContextLedgerError = {
  code: string;
  segmentId?: string;
  safeMessage: string;
};

export type RuleConflict = {
  kind: "duplicate_rule_id" | "duplicate_rule_priority";
  segmentIds: string[];
  layer?: ContextLayer;
  priority?: RulePriority;
};

export type RuleActivation = {
  id: string;
  layer: ContextLayer;
  source: RuleSource;
  priority: RulePriority;
  placement: ContextPlacementDecision;
  hash: string;
};

export type ContextSegmentV2 = {
  id: string;
  layer: ContextLayer;
  title: string;
  content: string;
  source: RuleSource;
  priority: RulePriority;
  pinned?: boolean;
  immutable?: boolean;
  provenance: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  tokenEstimate: number;
  sensitivity: ContextSensitivity;
  placement: ContextPlacementDecision;
  noCompress?: boolean;
  hash: string;
};

export type RuleSegment = ContextSegmentV2 & {
  layer: "immutable_rules" | "workspace_rules";
};

export type TaskContractSegment = ContextSegmentV2 & {
  layer: "task_contract";
};

export type SessionWorkingSetSegment = ContextSegmentV2 & {
  layer: "session_working_set";
};

export type VolatileTailSegment = ContextSegmentV2 & {
  layer: "volatile_tail";
};

export type NoCompressZoneSegment = ContextSegmentV2 & {
  layer: "no_compress_zone";
  noCompress: true;
};

export type ContextSegmentV2Input = {
  id?: string;
  layer: ContextLayer;
  title: string;
  content: string;
  source: RuleSource;
  priority?: RulePriority;
  pinned?: boolean;
  immutable?: boolean;
  provenance?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  tokenEstimate?: number;
  sensitivity?: ContextSensitivity;
  placement?: ContextPlacementDecision;
  noCompress?: boolean;
};

export type ContextPlacementRecord = {
  segmentId: string;
  layer: ContextLayer;
  source: RuleSource;
  requestedPlacement?: ContextPlacementDecision;
  placement: ContextPlacementDecision;
  reason: string;
};

export type ContextAssemblyReport = {
  segmentCountByLayer: Record<ContextLayer, number>;
  tokenEstimateByLayer: Record<ContextLayer, number>;
  activeRuleIds: string[];
  ignoredSegmentIds: string[];
  rejectedSegmentIds: string[];
  hashSummary: ContextBoundaryHash;
  warnings: ContextLedgerWarning[];
  conflicts: RuleConflict[];
  noCompressZoneIds: string[];
  cacheBoundaryChangedReasons: string[];
  placementDecisions: ContextPlacementRecord[];
};

export type ContextLedgerV2Options = {
  clock?: () => Date;
  idFactory?: () => string;
  eventStore?: EventStore;
};

export type ContextAssembleOptionsV2 = {
  previousReport?: ContextAssemblyReport;
  logEvents?: boolean;
};
