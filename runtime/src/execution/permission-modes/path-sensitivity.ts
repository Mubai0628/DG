import {
  TIER_OPERATION_MATRIX,
  type PermissionTier,
  type TierOperationClass,
  type TierOperationGate
} from "./permission-tier.js";

/**
 * Unified path sensitivity grading for the permission tier model.
 *
 * Consolidates the rules previously scattered across four lane-specific
 * guards (workspace draft guard, patch path guard, workspace-index path
 * guard, git pathspec guard) and the Rust approved-apply segment check into
 * one graded classification. Lanes keep their own rejection behavior; this
 * module answers "which operation class does reading this path fall into".
 *
 * Grades:
 *
 * - `protected`: infrastructure paths (`.git`, `node_modules`) that are
 *   never agent-accessible in any tier. Reads of protected paths have no
 *   operation class and are always blocked.
 * - `sensitive`: secret-like paths (`.env*`, `.ssh`, key material,
 *   credential-bearing names). Reading them is gated by the tier's
 *   `sensitive_file_read` operation class.
 * - `normal`: everything else, gated by `file_read`.
 *
 * Matching is segment-based, case-insensitive, and separator-agnostic
 * (`/` and `\`). The Rust mirror in
 * `app/src-tauri/src/path_sensitivity.rs` must stay in sync; both sides are
 * pinned to the same corpus in their tests.
 */
export type PathSensitivityGrade = "normal" | "sensitive" | "protected";

const PROTECTED_SEGMENTS = new Set([".git", "node_modules"]);

const KEY_FILE_SUFFIXES = [".pem", ".key", ".p12", ".pfx"];

const KEY_MATERIAL_NAMES = ["id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"];

const SECRET_LIKE_SUBSTRINGS = [
  "secret",
  "token",
  "password",
  "credential",
  "apikey",
  "api-key",
  "api_key",
  "private-key",
  "private_key"
];

/**
 * Grade a path by its segments. Empty or `.` segments are ignored; this is
 * a grading function, not a traversal validator — callers still enforce
 * their own containment rules.
 */
export function gradePathSensitivity(pathText: string): PathSensitivityGrade {
  const segments = String(pathText ?? "")
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment.length > 0 && segment !== ".");

  let grade: PathSensitivityGrade = "normal";
  for (const segment of segments) {
    if (PROTECTED_SEGMENTS.has(segment)) {
      return "protected";
    }
    if (isSensitiveSegment(segment)) {
      grade = "sensitive";
    }
  }
  return grade;
}

export function isSensitivePath(pathText: string): boolean {
  return gradePathSensitivity(pathText) === "sensitive";
}

/**
 * Maps a read of this path to its tier operation class. Returns `undefined`
 * for protected paths, which have no operation class and are always blocked.
 */
export function pathReadOperationClass(
  pathText: string
): TierOperationClass | undefined {
  const grade = gradePathSensitivity(pathText);
  if (grade === "protected") {
    return undefined;
  }
  return grade === "sensitive" ? "sensitive_file_read" : "file_read";
}

/**
 * The gate a permission tier applies to reading this path. Protected paths
 * are blocked in every tier, including unrestricted.
 */
export function pathReadGate(
  tier: PermissionTier,
  pathText: string
): TierOperationGate {
  const operationClass = pathReadOperationClass(pathText);
  if (operationClass === undefined) {
    return "blocked";
  }
  return TIER_OPERATION_MATRIX[tier][operationClass];
}

function isSensitiveSegment(segment: string): boolean {
  if (segment === ".ssh") {
    return true;
  }
  if (segment === ".env" || segment.startsWith(".env.")) {
    return true;
  }
  for (const name of KEY_MATERIAL_NAMES) {
    if (segment === name || segment.startsWith(`${name}.`)) {
      return true;
    }
  }
  if (KEY_FILE_SUFFIXES.some((suffix) => segment.endsWith(suffix))) {
    return true;
  }
  return SECRET_LIKE_SUBSTRINGS.some((marker) => segment.includes(marker));
}
