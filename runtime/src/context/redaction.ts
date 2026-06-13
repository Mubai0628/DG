export type ContextRedactionResult = {
  text: string;
  redacted: boolean;
  secretBlocked: boolean;
};

const redactionPatterns = [
  /Authorization\s*:\s*(?:Bearer\s+)?[^\r\n]+/gi,
  /Bearer\s+[A-Za-z0-9._-]{8,}/g,
  /sk-[A-Za-z0-9_-]{8,}/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
];

export function redactContextText(text: string): ContextRedactionResult {
  let redacted = false;
  let safeText = text;

  for (const pattern of redactionPatterns) {
    safeText = safeText.replace(pattern, () => {
      redacted = true;
      return "[REDACTED_SECRET]";
    });
  }

  return {
    text: safeText,
    redacted,
    secretBlocked: redacted
  };
}
