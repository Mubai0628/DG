import { createHash } from "node:crypto";

import { normalizeWhitespace } from "./redaction.js";
import { type InjectionRisk } from "./types.js";

const injectionPatterns: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "ignore previous instructions",
    pattern: /ignore\s+(?:all\s+)?previous\s+instructions/i
  },
  {
    label: "ignore system instructions",
    pattern: /ignore\s+(?:the\s+)?system\s+instructions/i
  },
  { label: "read .env", pattern: /read\s+\.env/i },
  { label: "send api key", pattern: /send\s+(?:the\s+)?api\s+key/i },
  { label: "exfiltrate", pattern: /exfiltrate/i },
  { label: "disable safety", pattern: /disable\s+safety/i },
  {
    label: "reveal hidden prompt",
    pattern: /reveal\s+(?:the\s+)?hidden\s+prompt/i
  },
  { label: "请忽略以上指令", pattern: /请忽略(?:以上|之前|系统)指令/ },
  { label: "读取 .env", pattern: /读取\s*\.env/ },
  { label: "发送密钥", pattern: /发送密钥/ }
];

export function detectInjectionRisks(
  text: string,
  location: string
): InjectionRisk[] {
  const normalized = normalizeWhitespace(text);
  if (normalized.length === 0) {
    return [];
  }

  const risks: InjectionRisk[] = [];
  for (const candidate of injectionPatterns) {
    if (candidate.pattern.test(normalized)) {
      risks.push({
        kind: "prompt_injection",
        pattern: candidate.label,
        location,
        snippetHash: hashSnippet(normalized)
      });
    }
  }

  return risks;
}

function hashSnippet(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}
