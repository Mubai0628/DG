import { shellIssue } from "./errors.js";
import { type ShellAllowlistIssue } from "./types.js";

const secretEnvNamePattern =
  /(?:API[_-]?KEY|TOKEN|SECRET|AUTHORIZATION|PASSWORD|BEARER)/i;

export function validateShellEnvNames(
  envNames: readonly string[] | undefined,
  commandId: string
): ShellAllowlistIssue[] {
  const errors: ShellAllowlistIssue[] = [];
  for (const envName of envNames ?? []) {
    if (secretEnvNamePattern.test(envName)) {
      errors.push(
        shellIssue(
          "secret_env_name",
          "Secret-like environment variable names are not allowed.",
          { commandId, value: envName }
        )
      );
    }
  }
  return errors;
}

export function redactShellText(text: string): {
  text: string;
  redactionCount: number;
} {
  const patterns = [
    /\bsk-[A-Za-z0-9_-]{16,}\b/g,
    /\bBearer\s+[A-Za-z0-9._-]{16,}\b/g,
    /\bAuthorization\s*[:=]\s*[^\s]+/gi,
    /\bapi[_-]?key\s*[:=]\s*[^\s]+/gi
  ];
  let redactionCount = 0;
  let redacted = text;

  for (const pattern of patterns) {
    const matches = [...redacted.matchAll(pattern)];
    if (matches.length > 0) {
      redactionCount += matches.length;
      redacted = redacted.replace(pattern, "[REDACTED]");
    }
  }

  return { text: redacted, redactionCount };
}
