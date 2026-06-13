const blockedKeys = new Set([
  "api" + "Key",
  "authorization",
  "headers",
  "raw" + "Prompt",
  "raw" + "Messages",
  "raw" + "ReasoningContent",
  "raw" + "Dom",
  "raw" + "Screenshot",
  "clip" + "board",
  "requestBody"
]);

const sensitivePatterns = [
  /sk-[A-Za-z0-9_-]{8,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/g
];

export function redactForReport(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactForReport(item));
  }

  if (typeof value === "object" && value !== null) {
    const redacted: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (blockedKeys.has(key)) {
        continue;
      }
      redacted[key] = redactForReport(nested);
    }
    return redacted;
  }

  if (typeof value === "string") {
    return sensitivePatterns.reduce(
      (current, pattern) => current.replace(pattern, "[REDACTED]"),
      value
    );
  }

  return value;
}

export function sanitizeDiagnosticMessage(message: string): string {
  return redactForReport(message) as string;
}
