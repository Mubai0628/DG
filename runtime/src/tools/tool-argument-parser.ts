import { type ToolBrokerErrorKind } from "./types.js";

export type ParsedToolArguments =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errorKind: ToolBrokerErrorKind };

export function parseToolArgumentsSafely(
  rawArguments: string
): ParsedToolArguments {
  try {
    const value = JSON.parse(rawArguments) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { ok: false, errorKind: "invalid_arguments_shape" };
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, errorKind: "invalid_arguments_json" };
  }
}
