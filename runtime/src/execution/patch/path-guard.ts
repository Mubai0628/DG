import {
  type PatchServiceOptions,
  type PatchValidationIssue
} from "./types.js";

export type PatchPathGuardResult =
  | {
      ok: true;
      path: string;
      warnings: PatchValidationIssue[];
    }
  | {
      ok: false;
      path: string;
      errors: PatchValidationIssue[];
      warnings: PatchValidationIssue[];
    };

const generatedArtifactPrefixes = [
  "node_modules/",
  "dist/",
  "target/",
  "runtime/dist/",
  "browser-extension/dist/",
  "conformance/results/",
  "app/dist/",
  "app/src-tauri/target/"
];

const blockedSegments = new Set([
  ".git",
  ".tmp",
  "node_modules",
  "dist",
  "target"
]);

const secretFilePatterns = [
  /^\.env(?:\.|$)/,
  /(^|[/.-])secret(s)?([/.-]|$)/i,
  /(^|[/.-])credential(s)?([/.-]|$)/i,
  /(^|[/.-])private-key([/.-]|$)/i,
  /(^|[/.-])id_rsa$/i,
  /\.(pem|p12|pfx|key)$/i
];

const executablePathPattern = /\.(cmd|bat|ps1|sh|bash|zsh|exe|msi)$/i;

export function normalizePatchPath(
  inputPath: string,
  options: Pick<PatchServiceOptions, "allowHiddenControlPaths"> = {}
): PatchPathGuardResult {
  const errors: PatchValidationIssue[] = [];
  const warnings: PatchValidationIssue[] = [];
  const rawPath = String(inputPath ?? "");
  const trimmed = rawPath.trim();
  const normalized = trimmed.replace(/\\/g, "/");

  if (normalized.length === 0) {
    errors.push(issue("empty_path", normalized, "Patch path is required."));
  }
  if (/^[a-zA-Z]:/.test(normalized)) {
    errors.push(
      issue(
        "drive_letter_path",
        normalized,
        "Patch path must be workspace-relative."
      )
    );
  }
  if (normalized.startsWith("//")) {
    errors.push(
      issue(
        "unc_path",
        normalized,
        "UNC paths are not allowed in patch proposals."
      )
    );
  }
  if (normalized.startsWith("/")) {
    errors.push(
      issue("absolute_path", normalized, "Absolute paths are not allowed.")
    );
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "..")) {
    errors.push(
      issue("parent_traversal", normalized, "Parent traversal is not allowed.")
    );
  }
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    errors.push(
      issue("empty_path", normalized, "Patch path contains an empty segment.")
    );
  }

  const lower = normalized.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    errors.push(
      issue(
        "generated_artifact_path",
        normalized,
        "Generated artifact paths are not patchable by default."
      )
    );
  }

  for (const segment of segments) {
    if (blockedSegments.has(segment.toLowerCase())) {
      errors.push(
        issue(
          "generated_artifact_path",
          normalized,
          "Generated or control directories are not patchable by default."
        )
      );
      break;
    }
  }

  if (
    options.allowHiddenControlPaths !== true &&
    segments.some((segment) => segment.startsWith("."))
  ) {
    errors.push(
      issue(
        "hidden_control_path",
        normalized,
        "Hidden control paths require an explicit allow option."
      )
    );
  }

  if (secretFilePatterns.some((pattern) => pattern.test(normalized))) {
    errors.push(
      issue(
        "secret_path",
        normalized,
        "Secret-looking paths are not patchable."
      )
    );
  }

  if (executablePathPattern.test(normalized)) {
    errors.push(
      issue(
        "suspicious_executable_path",
        normalized,
        "Executable script paths require a later explicit approval lane."
      )
    );
  }

  if (errors.length > 0) {
    return {
      ok: false,
      path: normalized,
      errors: uniqueIssues(errors),
      warnings
    };
  }

  return { ok: true, path: normalized, warnings };
}

function issue(
  kind: PatchValidationIssue["kind"],
  path: string,
  safeMessage: string
): PatchValidationIssue {
  return { kind, path, safeMessage };
}

function uniqueIssues(issues: PatchValidationIssue[]): PatchValidationIssue[] {
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
