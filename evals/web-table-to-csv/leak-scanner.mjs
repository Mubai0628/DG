const defaultLeakPatterns = [
  { kind: "raw_dom_marker", pattern: /\brawDom\b/i },
  { kind: "inner_html_marker", pattern: /\binnerHTML\b/i },
  { kind: "outer_html_marker", pattern: /\bouterHTML\b/i },
  { kind: "url_query_token", pattern: /[?&](?:token|session|secret)=/i },
  { kind: "authorization_header", pattern: /\bAuthorization\b/i },
  { kind: "bearer_token", pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}/ },
  { kind: "sk_like_key", pattern: /\bsk-[A-Za-z0-9_-]{8,}/ },
  { kind: "clipboard_marker", pattern: /\bclipboard\b/i },
  { kind: "raw_prompt_marker", pattern: /\brawPrompt\b/i },
  { kind: "raw_screenshot_marker", pattern: /\brawScreenshot\b/i },
  { kind: "password_value_marker", pattern: /\bpasswordValue\b/i },
  { kind: "local_storage_marker", pattern: /\blocalStorage\b/i },
  { kind: "session_storage_marker", pattern: /\bsessionStorage\b/i },
  { kind: "cookie_value_marker", pattern: /\bcookie\s*=/i },
  { kind: "cookie_object_marker", pattern: /"cookies"\s*:/i },
  { kind: "api_key_marker", pattern: /\bapi key\b/i }
];

export function scanEventLogForLeaks(eventsText, forbiddenValues = []) {
  const findings = [];

  for (const pattern of defaultLeakPatterns) {
    if (pattern.pattern.test(eventsText)) {
      findings.push({ kind: pattern.kind });
    }
  }

  for (const value of forbiddenValues) {
    if (
      typeof value === "string" &&
      value.length > 0 &&
      eventsText.includes(value)
    ) {
      findings.push({
        kind: "forbidden_value",
        valueHash: hashValue(value)
      });
    }
  }

  return {
    ok: findings.length === 0,
    findings
  };
}

function hashValue(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
