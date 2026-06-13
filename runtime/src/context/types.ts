import { type EventStore } from "../events/index.js";

export type ContextSegmentId = string;

export type ContextSegmentKind =
  | "system_rules"
  | "workspace_policy"
  | "agent_role"
  | "pinned_memory"
  | "retrieved_memory"
  | "evidence"
  | "tool_result"
  | "screen_frame"
  | "task_context"
  | "active_plan"
  | "recent_message"
  | "user_instruction"
  | "approval"
  | "diff"
  | "tool_arguments"
  | "safety_judgement";

export type ContextSegmentPlacement =
  | "frozen_prefix"
  | "volatile_tail"
  | "no_compress";

export type ContextSafetyLabel =
  | "trusted_instruction"
  | "trusted_policy"
  | "user_provided"
  | "untrusted_external"
  | "tool_output"
  | "sensitive_redacted"
  | "secret_blocked";

export type ContextSegmentSource = {
  type:
    | "system"
    | "workspace"
    | "agent"
    | "user"
    | "retrieval"
    | "tool"
    | "screen"
    | "runtime";
  name?: string;
  uri?: string;
};

export type ContextSegment = {
  id: ContextSegmentId;
  kind: ContextSegmentKind;
  placement: ContextSegmentPlacement;
  content: string;
  source: ContextSegmentSource;
  safetyLabel: ContextSafetyLabel;
  tokenEstimate: number;
  createdAt: string;
  stableKey?: string;
  pinned?: boolean;
  immutable?: boolean;
  provenance?: Record<string, unknown>;
  redacted?: boolean;
  noCompress?: boolean;
};

export type ContextSegmentInput = {
  id?: ContextSegmentId;
  kind: ContextSegmentKind;
  placement?: ContextSegmentPlacement;
  content: string;
  source: ContextSegmentSource;
  safetyLabel: ContextSafetyLabel;
  stableKey?: string;
  pinned?: boolean;
  immutable?: boolean;
  provenance?: Record<string, unknown>;
  redacted?: boolean;
  noCompress?: boolean;
};

export type ConversationContextMessage = {
  id?: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  safetyLabel?: ContextSafetyLabel;
  source?: ContextSegmentSource;
};

export type ContextAssemblyOptions = {
  currentMessages?: readonly ConversationContextMessage[];
  latestUserInstruction?: string;
  previousAssembly?: ContextAssemblyResult;
  logEvents?: boolean;
};

export type TokenEstimate = {
  frozenPrefix: number;
  volatileTail: number;
  noCompress: number;
  total: number;
};

export type ContextCacheBoundaryReason =
  | "system_rules_changed"
  | "workspace_policy_changed"
  | "agent_role_changed"
  | "pinned_memory_changed"
  | "frozen_prefix_order_changed"
  | "unknown_frozen_prefix_changed"
  | "volatile_tail_changed";

export type CacheBoundaryChange = {
  reason: ContextCacheBoundaryReason;
  previousHash?: string;
  nextHash?: string;
};

export type ContextAssemblyResult = {
  frozenPrefixText: string;
  volatileTailText: string;
  fullPromptPreview: string;
  segmentsIncluded: ContextSegment[];
  tokenEstimate: TokenEstimate;
  stablePrefixHash: string;
  volatileTailHash: string;
  warnings: string[];
  cacheBoundaryChanges: CacheBoundaryChange[];
};

export type PromptAssemblerOptions = {
  eventStore?: EventStore;
};

export type PlacementRuleResult = {
  placement: ContextSegmentPlacement;
  noCompress: boolean;
  warning?: string;
};
