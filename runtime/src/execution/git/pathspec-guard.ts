import {
  type GitPathSpecErrorKind,
  type GitPathSpecValidationResult,
  type GitSafeLaneIssue
} from "./types.js";

const blockedExactSegments = new Set([".git", ".tmp", "node_modules"]);
const generatedSegments = new Set(["dist", "target"]);
const blockedPrefixes = [
  "app/src-tauri/target/",
  "conformance/results/",
  "browser-extension/dist/",
  "runtime/dist/"
];
const secretPathPatterns = [
  /^\.env(?:\.|$)/,
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)id_rsa$/i,
  /private[-_]?key/i,
  /\.(pem|p12|pfx|key)$/i
];
const forbiddenShellCharacters = /[;&|`$<>()[\]{}]/;

export function validateGitPathSpec(
  input: string
): GitPathSpecValidationResult {
  const raw = String(input ?? "");
  const trimmed = raw.trim();
  const normalized = trimmed.replace(/\\/g, "/");
  const errors: GitSafeLaneIssue[] = [];
  const warnings: GitSafeLaneIssue[] = [];

  if (normalized.length === 0) {
    errors.push(issue("empty_path", normalized, "Pathspec is required."));
  }
  if (normalized.includes("\0") || /[\r\n]/.test(normalized)) {
    errors.push(
      issue(
        "newline_or_null",
        normalized,
        "Pathspec cannot contain newlines or null bytes."
      )
    );
  }
  if (/^[a-zA-Z]:/.test(normalized)) {
    errors.push(
      issue(
        "drive_letter_path",
        normalized,
        "Pathspec must be repository-relative."
      )
    );
  }
  if (normalized.startsWith("//")) {
    errors.push(
      issue("unc_path", normalized, "UNC pathspecs are not allowed.")
    );
  }
  if (normalized.startsWith("/")) {
    errors.push(
      issue("absolute_path", normalized, "Absolute pathspecs are not allowed.")
    );
  }
  if (/^[a-z]+:\/\//i.test(normalized) || normalized.includes("?")) {
    errors.push(
      issue(
        "url_or_query_path",
        normalized,
        "URL or query-like pathspecs are not allowed."
      )
    );
  }
  if (forbiddenShellCharacters.test(normalized)) {
    errors.push(
      issue(
        "shell_metacharacter",
        normalized,
        "Pathspec contains shell metacharacters."
      )
    );
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    errors.push(
      issue("empty_path", normalized, "Pathspec contains an empty segment.")
    );
  }
  if (segments.includes("..")) {
    errors.push(
      issue("parent_traversal", normalized, "Parent traversal is not allowed.")
    );
  }
  if (segments.some((segment) => blockedExactSegments.has(segment))) {
    errors.push(
      issue(
        "git_control_path",
        normalized,
        "Git/control directories are not allowed."
      )
    );
  }
  if (segments.some((segment) => generatedSegments.has(segment))) {
    errors.push(
      issue(
        "generated_artifact_path",
        normalized,
        "Generated artifact paths are not allowed."
      )
    );
  }
  const lower = normalized.toLowerCase();
  if (
    blockedPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    errors.push(
      issue(
        "generated_artifact_path",
        normalized,
        "Generated artifact paths are not allowed."
      )
    );
  }
  if (secretPathPatterns.some((pattern) => pattern.test(normalized))) {
    errors.push(
      issue(
        "secret_path",
        normalized,
        "Secret-looking pathspecs are not allowed."
      )
    );
  }
  if (!isAllowedGlob(normalized)) {
    errors.push(
      issue(
        "shell_metacharacter",
        normalized,
        "Only ** path glob segments are allowed."
      )
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: uniqueIssues(errors), warnings };
  }
  return {
    ok: true,
    pathspec: { path: normalized },
    warnings
  };
}

function isAllowedGlob(value: string): boolean {
  if (!/[*?]/.test(value)) {
    return true;
  }
  return value
    .split("/")
    .every((segment) => segment === "**" || !/[*?]/.test(segment));
}

function issue(
  kind: GitPathSpecErrorKind,
  path: string,
  safeMessage: string
): GitSafeLaneIssue {
  return { kind, code: kind, path, safeMessage };
}

function uniqueIssues(issues: readonly GitSafeLaneIssue[]): GitSafeLaneIssue[] {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.kind}:${item.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
