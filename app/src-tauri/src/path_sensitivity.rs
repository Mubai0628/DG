//! Unified path sensitivity grading (Rust mirror).
//!
//! Mirrors `runtime/src/execution/permission-modes/path-sensitivity.ts`:
//! consolidates the lane-specific secret/protected path rules into one
//! segment-based, case-insensitive, separator-agnostic grading used by the
//! permission tier model and the approved-apply path validation. Both sides
//! are pinned to the same corpus in their tests.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PathSensitivity {
    Normal,
    Sensitive,
    Protected,
}

/// Canonical permission tiers, mirrored from
/// `runtime/src/execution/permission-modes/permission-tier.ts`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PermissionTier {
    ApprovalRequired,
    ReadAutoApproved,
    GuardedOpen,
    Unrestricted,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TierGate {
    Auto,
    RequiresApproval,
    Blocked,
}

/// Maps a 6-level product permission mode onto the canonical tier ladder
/// (mirror of `permissionModeTier`). Returns `None` for unknown modes so
/// callers can reject them.
pub fn permission_mode_tier(mode: &str) -> Option<PermissionTier> {
    match mode {
        "read_only_preview" => Some(PermissionTier::ApprovalRequired),
        "approval_mode" | "autonomous_safe_mode" => Some(PermissionTier::ReadAutoApproved),
        "advanced_workspace_mode" => Some(PermissionTier::GuardedOpen),
        "full_access_mode" | "break_glass_mode" => Some(PermissionTier::Unrestricted),
        _ => None,
    }
}

/// Derives the command-broker execution mode from the product permission
/// mode (mirror of `commandExecutionModeForPermissionMode` in
/// `runtime/src/execution/permission-modes/permission-tier.ts`).
/// `read_only_preview` fails closed to `approval`.
pub fn command_execution_mode_for_permission_mode(mode: &str) -> Option<&'static str> {
    match mode {
        "read_only_preview" => Some("approval"),
        "approval_mode" => Some("approval"),
        "autonomous_safe_mode" => Some("autonomous_safe"),
        "advanced_workspace_mode" => Some("advanced_workspace"),
        "full_access_mode" => Some("full_access"),
        "break_glass_mode" => Some("break_glass"),
        _ => None,
    }
}

/// The gate a permission tier applies to reading this path (mirror of
/// `pathReadGate` over `TIER_OPERATION_MATRIX`). Protected paths are blocked
/// in every tier, including unrestricted.
pub fn path_read_gate(tier: PermissionTier, path_text: &str) -> TierGate {
    match grade_path_sensitivity(path_text) {
        PathSensitivity::Protected => TierGate::Blocked,
        PathSensitivity::Sensitive => match tier {
            PermissionTier::Unrestricted => TierGate::Auto,
            _ => TierGate::RequiresApproval,
        },
        PathSensitivity::Normal => match tier {
            PermissionTier::ApprovalRequired => TierGate::RequiresApproval,
            _ => TierGate::Auto,
        },
    }
}

/// Deterministic hash binding a file-read approval receipt to one exact
/// read request. Must stay in sync with `fileReadRequestHash` in
/// `runtime/src/execution/permission-modes/file-read-approval-receipt.ts`.
pub fn file_read_request_hash(mode: &str, workspace_root_ref: &str, relative_path: &str) -> String {
    crate::command_broker_classifier::stable_preview_hash(
        ["v1", "file_read", mode, workspace_root_ref, relative_path].join("\n").as_str(),
    )
}

const PROTECTED_SEGMENTS: [&str; 2] = [".git", "node_modules"];
const KEY_FILE_SUFFIXES: [&str; 4] = [".pem", ".key", ".p12", ".pfx"];
const KEY_MATERIAL_NAMES: [&str; 4] = ["id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"];
const SECRET_LIKE_SUBSTRINGS: [&str; 9] = [
    "secret",
    "token",
    "password",
    "credential",
    "apikey",
    "api-key",
    "api_key",
    "private-key",
    "private_key",
];

/// Grade a path by its segments. Empty and `.` segments are ignored; this
/// is grading, not traversal validation.
pub fn grade_path_sensitivity(path_text: &str) -> PathSensitivity {
    let normalized = path_text.replace('\\', "/");
    let mut grade = PathSensitivity::Normal;
    for raw_segment in normalized.split('/') {
        let segment = raw_segment.trim().to_lowercase();
        if segment.is_empty() || segment == "." {
            continue;
        }
        if PROTECTED_SEGMENTS.contains(&segment.as_str()) {
            return PathSensitivity::Protected;
        }
        if segment_is_sensitive(&segment) {
            grade = PathSensitivity::Sensitive;
        }
    }
    grade
}

/// True when a single lowercase path segment looks secret-like. Shared with
/// the approved-apply relative path validation so both use the same
/// sensitive set.
pub fn segment_is_sensitive(segment: &str) -> bool {
    if segment == ".ssh" {
        return true;
    }
    if segment == ".env" || segment.starts_with(".env.") {
        return true;
    }
    for name in KEY_MATERIAL_NAMES {
        if segment == name || segment.starts_with(&format!("{name}.")) {
            return true;
        }
    }
    if KEY_FILE_SUFFIXES
        .iter()
        .any(|suffix| segment.ends_with(suffix))
    {
        return true;
    }
    SECRET_LIKE_SUBSTRINGS
        .iter()
        .any(|marker| segment.contains(marker))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grades_the_shared_corpus() {
        let cases: [(&str, PathSensitivity); 31] = [
            ("src/index.ts", PathSensitivity::Normal),
            ("docs/readme.md", PathSensitivity::Normal),
            ("scripts/format-all.sh", PathSensitivity::Normal),
            ("folder/sub.folder/file.json", PathSensitivity::Normal),
            (".git/config", PathSensitivity::Protected),
            ("repo/.git/HEAD", PathSensitivity::Protected),
            ("node_modules/react/index.js", PathSensitivity::Protected),
            ("pkg/node_modules/lib/a.ts", PathSensitivity::Protected),
            (".env", PathSensitivity::Sensitive),
            (".env.local", PathSensitivity::Sensitive),
            ("config/.env.production", PathSensitivity::Sensitive),
            (".ssh/id_rsa", PathSensitivity::Sensitive),
            ("home/user/.ssh/config", PathSensitivity::Sensitive),
            ("keys/id_rsa", PathSensitivity::Sensitive),
            ("keys/id_rsa.pub", PathSensitivity::Sensitive),
            ("keys/id_ed25519", PathSensitivity::Sensitive),
            ("certs/server.pem", PathSensitivity::Sensitive),
            ("certs/server.key", PathSensitivity::Sensitive),
            ("certs/bundle.p12", PathSensitivity::Sensitive),
            ("certs/bundle.pfx", PathSensitivity::Sensitive),
            ("keys/private-key.pem", PathSensitivity::Sensitive),
            ("keys/private_key", PathSensitivity::Sensitive),
            ("secrets/app.txt", PathSensitivity::Sensitive),
            ("config/my-secrets.json", PathSensitivity::Sensitive),
            ("app/credentials.json", PathSensitivity::Sensitive),
            ("db/passwords.txt", PathSensitivity::Sensitive),
            ("ci/api_key.txt", PathSensitivity::Sensitive),
            ("ci/apikey.yaml", PathSensitivity::Sensitive),
            ("ci/api-key.yaml", PathSensitivity::Sensitive),
            ("tokens/refresh.txt", PathSensitivity::Sensitive),
            ("config\\.env", PathSensitivity::Sensitive),
        ];
        for (path, expected) in cases {
            assert_eq!(
                grade_path_sensitivity(path),
                expected,
                "path {path:?} graded incorrectly"
            );
        }
    }

    #[test]
    fn handles_case_and_separator_variants() {
        assert_eq!(
            grade_path_sensitivity("Certs\\SERVER.PEM"),
            PathSensitivity::Sensitive
        );
        assert_eq!(
            grade_path_sensitivity("REPO\\.GIT\\config"),
            PathSensitivity::Protected
        );
    }

    #[test]
    fn maps_modes_to_tiers_and_gates_reads() {
        assert_eq!(
            permission_mode_tier("read_only_preview"),
            Some(PermissionTier::ApprovalRequired)
        );
        assert_eq!(
            permission_mode_tier("approval_mode"),
            Some(PermissionTier::ReadAutoApproved)
        );
        assert_eq!(
            permission_mode_tier("autonomous_safe_mode"),
            Some(PermissionTier::ReadAutoApproved)
        );
        assert_eq!(
            permission_mode_tier("advanced_workspace_mode"),
            Some(PermissionTier::GuardedOpen)
        );
        assert_eq!(
            permission_mode_tier("full_access_mode"),
            Some(PermissionTier::Unrestricted)
        );
        assert_eq!(permission_mode_tier("god_mode"), None);

        // approval_required: every read needs approval
        assert_eq!(
            path_read_gate(PermissionTier::ApprovalRequired, "src/a.ts"),
            TierGate::RequiresApproval
        );
        // read_auto_approved: plain reads auto, sensitive reads gated
        assert_eq!(
            path_read_gate(PermissionTier::ReadAutoApproved, "src/a.ts"),
            TierGate::Auto
        );
        assert_eq!(
            path_read_gate(PermissionTier::ReadAutoApproved, ".env"),
            TierGate::RequiresApproval
        );
        // guarded_open: sensitive reads still gated
        assert_eq!(
            path_read_gate(PermissionTier::GuardedOpen, ".ssh/id_rsa"),
            TierGate::RequiresApproval
        );
        assert_eq!(
            path_read_gate(PermissionTier::GuardedOpen, "src/a.ts"),
            TierGate::Auto
        );
        // unrestricted: all auto except protected
        assert_eq!(
            path_read_gate(PermissionTier::Unrestricted, ".env"),
            TierGate::Auto
        );
        assert_eq!(
            path_read_gate(PermissionTier::Unrestricted, ".git/config"),
            TierGate::Blocked
        );
    }

    #[test]
    fn derives_command_execution_mode_from_permission_mode() {
        assert_eq!(
            command_execution_mode_for_permission_mode("read_only_preview"),
            Some("approval")
        );
        assert_eq!(
            command_execution_mode_for_permission_mode("approval_mode"),
            Some("approval")
        );
        assert_eq!(
            command_execution_mode_for_permission_mode("autonomous_safe_mode"),
            Some("autonomous_safe")
        );
        assert_eq!(
            command_execution_mode_for_permission_mode("advanced_workspace_mode"),
            Some("advanced_workspace")
        );
        assert_eq!(
            command_execution_mode_for_permission_mode("full_access_mode"),
            Some("full_access")
        );
        assert_eq!(
            command_execution_mode_for_permission_mode("break_glass_mode"),
            Some("break_glass")
        );
        assert_eq!(command_execution_mode_for_permission_mode("god_mode"), None);
    }

    #[test]
    fn file_read_request_hash_is_deterministic() {
        let first = file_read_request_hash("approval_mode", "ws-ref", "src/a.ts");
        let second = file_read_request_hash("approval_mode", "ws-ref", "src/a.ts");
        assert_eq!(first, second);
        assert_eq!(first.len(), 64);
        assert_ne!(
            first,
            file_read_request_hash("approval_mode", "ws-ref", "src/b.ts")
        );
    }
}
