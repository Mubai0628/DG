import { type ConformanceCaseId } from "./types.js";

export const dryCaseIds = [
  "CASE-DRY-001",
  "CASE-DRY-002",
  "CASE-DRY-003",
  "CASE-DRY-004",
  "CASE-DRY-005",
  "CASE-DRY-006"
] satisfies ConformanceCaseId[];

export const liveCaseIds = [
  "CASE-LIVE-001",
  "CASE-LIVE-002",
  "CASE-LIVE-003",
  "CASE-LIVE-004",
  "CASE-LIVE-005"
] satisfies ConformanceCaseId[];

// Official API constraints reflected by the harness:
// - Models are limited to deepseek-v4-flash and deepseek-v4-pro.
// - Thinking uses thinking.type enabled/disabled and reasoning_effort high/max.
// - Thinking requests do not rely on temperature/top_p style sampling knobs.
// - Tools are function-only and tool-call arguments stay raw strings.
// - Cache hit tokens are observable, but cache hits are best-effort.
