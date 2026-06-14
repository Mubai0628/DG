import { redactContextText } from "../context/index.js";

export type WebTextRedactionResult = {
  text: string;
  redacted: boolean;
};

export function redactWebText(text: string): WebTextRedactionResult {
  const result = redactContextText(text);
  return {
    text: result.text,
    redacted: result.redacted
  };
}

export function summarizeText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const redacted = redactWebText(normalizeWhitespace(value)).text;
  if (redacted.length === 0) {
    return undefined;
  }

  return redacted.length > 80 ? `${redacted.slice(0, 77)}...` : redacted;
}

export function normalizeWhitespace(value: string): string {
  return value
    .trim()
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\s+/g, " ");
}
