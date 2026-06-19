import { safeShortHash } from "./hash.js";
import { type WorkspacePathGuardResult } from "./types.js";

const DEFAULT_MAX_PATH_LENGTH = 240;

const blockedSegments = new Set([
  ".git",
  "node_modules",
  "dist",
  "target",
  ".tmp"
]);

const blockedExactPaths = new Set([
  "app/src-tauri/target",
  "runtime/dist",
  "browser-extension/dist",
  "conformance/results"
]);

const shellMetacharacterPattern = /[;&|<>`$(){}\r\n\0]/;

export function validateWorkspaceIndexPath(
  rawPath: string,
  options: {
    maxPathLength?: number;
  } = {}
): WorkspacePathGuardResult {
  const maxPathLength = options.maxPathLength ?? DEFAULT_MAX_PATH_LENGTH;

  if (typeof rawPath !== "string" || rawPath.length === 0) {
    return rejected("empty_path", rawPath);
  }
  if (rawPath.length > maxPathLength) {
    return rejected("path_too_long", rawPath);
  }
  if (rawPath.includes("\0")) {
    return rejected("null_byte", rawPath);
  }
  if (/[\r\n]/.test(rawPath)) {
    return rejected("newline", rawPath);
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(rawPath)) {
    return rejected("url_path", rawPath);
  }
  if (/[?].*(token|key|secret|auth|password)/i.test(rawPath)) {
    return rejected("query_secret_path", rawPath);
  }
  if (/^[a-zA-Z]:[\\/]/.test(rawPath)) {
    return rejected("drive_letter_path", rawPath);
  }
  if (/^[/\\]{2}/.test(rawPath)) {
    return rejected("unc_path", rawPath);
  }
  if (rawPath.startsWith("/") || rawPath.startsWith("\\")) {
    return rejected("absolute_path", rawPath);
  }
  if (rawPath.includes("\\")) {
    return rejected("backslash_path", rawPath);
  }
  if (shellMetacharacterPattern.test(rawPath)) {
    return rejected("shell_metacharacter", rawPath);
  }

  const collapsed = rawPath
    .split("/")
    .filter((segment) => segment.length > 0)
    .join("/");
  if (collapsed.length === 0) {
    return rejected("empty_path", rawPath);
  }

  const segments = collapsed.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return rejected("parent_traversal", rawPath);
  }

  const normalizedLower = collapsed.toLowerCase();
  for (const blockedPath of blockedExactPaths) {
    if (
      normalizedLower === blockedPath ||
      normalizedLower.startsWith(`${blockedPath}/`)
    ) {
      return rejected("generated_path", rawPath);
    }
  }

  for (const segment of segments) {
    const lower = segment.toLowerCase();
    if (blockedSegments.has(lower)) {
      return rejected("generated_path", rawPath);
    }
    if (lower === ".env" || lower.startsWith(".env.")) {
      return rejected("secret_path", rawPath);
    }
    if (isPrivateKeyLikeSegment(lower)) {
      return rejected("private_key_path", rawPath);
    }
  }

  return {
    ok: true,
    path: collapsed,
    segments,
    warningCodes: collapsed !== rawPath ? ["path_normalized"] : []
  };
}

function isPrivateKeyLikeSegment(segment: string): boolean {
  return (
    segment === "id_rsa" ||
    segment === "id_dsa" ||
    segment === "id_ecdsa" ||
    segment === "id_ed25519" ||
    segment.includes("private_key") ||
    segment.includes("private-key") ||
    segment.endsWith(".pem") ||
    segment.endsWith(".p12")
  );
}

function rejected(code: string, rawPath: string): WorkspacePathGuardResult {
  return {
    ok: false,
    code,
    safePath: `unsafe-path:${code}:${safeShortHash(rawPath)}`,
    safeMessage: `Workspace index path rejected: ${code}`
  };
}
