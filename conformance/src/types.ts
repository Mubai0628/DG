import { type UsageSummary } from "@deepseek-workbench/runtime";

export type ConformanceStatus = "PASS" | "FAIL" | "SKIPPED" | "INCONCLUSIVE";

export type ConformanceCaseId =
  | "CASE-DRY-001"
  | "CASE-DRY-002"
  | "CASE-DRY-003"
  | "CASE-DRY-004"
  | "CASE-DRY-005"
  | "CASE-DRY-006"
  | "CASE-LIVE-001"
  | "CASE-LIVE-002"
  | "CASE-LIVE-003"
  | "CASE-LIVE-004"
  | "CASE-LIVE-005"
  | "SKIPPED_LIVE_CONFORMANCE";

export type ConformanceCaseResult = {
  caseId: ConformanceCaseId;
  status: ConformanceStatus;
  model?: string | undefined;
  finishReason?: string | null | undefined;
  responseHasReasoningContent?: boolean | undefined;
  responseHasToolCalls?: boolean | undefined;
  usageSummary?: UsageSummary | undefined;
  latencyMs?: number | undefined;
  cacheHitTokens?: number | undefined;
  cacheMissTokens?: number | undefined;
  errorKind?: string | undefined;
  failureCategory?: LiveFailureCategory | undefined;
  httpStatus?: number | undefined;
  sanitizedErrorMessage?: string | undefined;
  toolCallCount?: number | undefined;
  pendingToolCallCount?: number | undefined;
  continuationRequestMessageCount?: number | undefined;
  continuationIncludesToolRoundReasoning?: boolean | undefined;
  continuationIncludesReasoningContent?: boolean | undefined;
  continuationIncludesAssistantToolCalls?: boolean | undefined;
  continuationIncludesToolMessages?: boolean | undefined;
  continuationIncludesToolMessage?: boolean | undefined;
  toolChoiceFirstRequest?: string | undefined;
  toolChoiceContinuation?: string | undefined;
  thinkingEnabled?: boolean | undefined;
  toolChoicePresentFirstRequest?: boolean | undefined;
  toolChoicePresentContinuation?: boolean | undefined;
  toolChoiceWasStrippedForThinking?: boolean | undefined;
  assistantToolCallContentWasNull?: boolean | undefined;
  assistantToolCallContentNormalized?: boolean | undefined;
  continuationHttpStatus?: number | undefined;
  liveFailureCategory?: LiveFailureCategory | undefined;
  note?: string | undefined;
};

export type ConformanceSummary = {
  mode: "dry" | "live";
  status: ConformanceStatus;
  results: ConformanceCaseResult[];
};

export type LiveFailureCategory =
  | "TOOL_CHOICE_UNSUPPORTED_IN_THINKING"
  | "API_400_REASONING_ROUNDTRIP"
  | "NO_TOOL_CALL_INCONCLUSIVE"
  | "STRICT_SCHEMA_OR_BETA_ERROR"
  | "INVALID_TOOL_MESSAGE_SHAPE"
  | "MAX_TOKENS_OR_LENGTH"
  | "NETWORK_OR_RATE_LIMIT"
  | "UNKNOWN_LIVE_FAILURE";

export type LiveToolRoundtripDiagnostics = {
  failureCategory?: LiveFailureCategory | undefined;
  httpStatus?: number | undefined;
  sanitizedErrorMessage?: string | undefined;
  toolCallCount?: number | undefined;
  pendingToolCallCount?: number | undefined;
  continuationRequestMessageCount?: number | undefined;
  continuationIncludesToolRoundReasoning?: boolean | undefined;
  continuationIncludesReasoningContent?: boolean | undefined;
  continuationIncludesAssistantToolCalls?: boolean | undefined;
  continuationIncludesToolMessages?: boolean | undefined;
  continuationIncludesToolMessage?: boolean | undefined;
  toolChoiceFirstRequest?: string | undefined;
  toolChoiceContinuation?: string | undefined;
  thinkingEnabled?: boolean | undefined;
  toolChoicePresentFirstRequest?: boolean | undefined;
  toolChoicePresentContinuation?: boolean | undefined;
  toolChoiceWasStrippedForThinking?: boolean | undefined;
  assistantToolCallContentWasNull?: boolean | undefined;
  assistantToolCallContentNormalized?: boolean | undefined;
  continuationHttpStatus?: number | undefined;
  liveFailureCategory?: LiveFailureCategory | undefined;
};
