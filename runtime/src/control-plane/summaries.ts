import { hashPatchObject } from "../execution/patch/index.js";
import {
  type ControlPlaneError,
  type ControlPlaneTimelineItem,
  type ControlPlaneWarning
} from "./types.js";
import { controlPlaneError } from "./errors.js";

const rawMarkerWords = [
  "raw" + "Prompt",
  "raw" + "Dom",
  "raw" + "Csv",
  "csv" + "Content",
  "raw" + "Screenshot",
  "clip" + "board",
  "Authorization",
  "BrowserDomPayload"
];

const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/i,
  /\bBearer\s+[A-Za-z0-9._-]{16,}\b/i,
  /\bapi[_-]?key\b/i,
  /\b[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD)[A-Z0-9_]*\b/i,
  /https?:\/\/\S+\?(?:token|secret|session|key)=/i
];

export function safeControlSummary(value: unknown, max = 160): string {
  const text = typeof value === "string" ? value : "";
  const compact = redactUnsafeText(text).replace(/\s+/g, " ").trim();
  if (compact.length === 0) {
    return "No summary";
  }
  return compact.length > max ? `${compact.slice(0, max - 1)}...` : compact;
}

export function validateNoUnsafeControlText(
  value: unknown,
  refs: {
    taskId?: string;
    runId?: string;
  } = {}
): ControlPlaneError[] {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const errors: ControlPlaneError[] = [];
  if (rawMarkerWords.some((marker) => text.includes(marker))) {
    errors.push(
      controlPlaneError(
        "unsafe_content",
        "raw_content_marker",
        "Control-plane input contains a forbidden raw-content marker.",
        refs
      )
    );
  }
  if (secretPatterns.some((pattern) => pattern.test(text))) {
    errors.push(
      controlPlaneError(
        "unsafe_content",
        "secret_marker",
        "Control-plane input contains a secret-like marker.",
        refs
      )
    );
  }
  return errors;
}

export function redactUnsafeText(value: string): string {
  let output = value;
  for (const marker of rawMarkerWords) {
    output = output.split(marker).join("[REDACTED]");
  }
  for (const pattern of secretPatterns) {
    output = output.replace(pattern, "[REDACTED]");
  }
  return output;
}

export function createControlHash(value: unknown): string {
  return hashPatchObject(value);
}

export function warning(
  code: string,
  safeMessage: string
): ControlPlaneWarning {
  return { code, safeMessage };
}

export function timelineItem(input: {
  id: string;
  ts: string;
  type: string;
  summary: string;
  taskId?: string;
  runId?: string;
  phase?: ControlPlaneTimelineItem["phase"];
  status?: ControlPlaneTimelineItem["status"];
}): ControlPlaneTimelineItem {
  const item: ControlPlaneTimelineItem = {
    id: input.id,
    ts: input.ts,
    type: input.type,
    summary: safeControlSummary(input.summary)
  };
  if (input.taskId !== undefined) {
    item.taskId = input.taskId;
  }
  if (input.runId !== undefined) {
    item.runId = input.runId;
  }
  if (input.phase !== undefined) {
    item.phase = input.phase;
  }
  if (input.status !== undefined) {
    item.status = input.status;
  }
  return item;
}
