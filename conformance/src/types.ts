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
  note?: string | undefined;
};

export type ConformanceSummary = {
  mode: "dry" | "live";
  status: ConformanceStatus;
  results: ConformanceCaseResult[];
};
