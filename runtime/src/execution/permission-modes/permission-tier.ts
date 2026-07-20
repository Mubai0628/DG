import { type CommandExecutionMode } from "../command-broker/command-policy.js";
import { type PermissionMode } from "./mode-policy.js";

/**
 * Canonical permission tiers (user-facing four-tier ladder) and their mapping
 * to the two legacy mode vocabularies:
 *
 * - `PermissionMode` (6 product modes, permission-modes roadmap asset)
 * - `CommandExecutionMode` (5 command-broker modes)
 *
 * This module is the single source of truth for how the vocabularies relate.
 * Enforcement semantics per tier are expressed by `TIER_OPERATION_MATRIX`;
 * lanes adopt the matrix incrementally (command broker first).
 */
export type PermissionTier =
  | "approval_required"
  | "read_auto_approved"
  | "guarded_open"
  | "unrestricted";

export type TierOperationClass =
  | "file_read"
  | "sensitive_file_read"
  | "workspace_write"
  | "file_delete"
  | "shell_command"
  | "network_egress"
  | "git_write"
  | "mcp_tool_call"
  | "desktop_action";

export type TierOperationGate = "auto" | "requires_approval" | "blocked";

export const ALL_PERMISSION_TIERS: readonly PermissionTier[] = [
  "approval_required",
  "read_auto_approved",
  "guarded_open",
  "unrestricted"
];

export const ALL_TIER_OPERATION_CLASSES: readonly TierOperationClass[] = [
  "file_read",
  "sensitive_file_read",
  "workspace_write",
  "file_delete",
  "shell_command",
  "network_egress",
  "git_write",
  "mcp_tool_call",
  "desktop_action"
];

const AUTO_MATRIX: Record<TierOperationClass, TierOperationGate> = {
  file_read: "auto",
  sensitive_file_read: "auto",
  workspace_write: "auto",
  file_delete: "auto",
  shell_command: "auto",
  network_egress: "auto",
  git_write: "auto",
  mcp_tool_call: "auto",
  desktop_action: "auto"
};

/**
 * Tier semantics, as confirmed with the project owner (2026-07-17):
 *
 * - approval_required: every side-effecting operation requires approval.
 * - read_auto_approved: plain file reads run without approval; everything
 *   else (including sensitive reads) requires approval.
 * - guarded_open: everything runs except file deletion and sensitive file
 *   reads, which still require approval.
 * - unrestricted: every operation class is auto. Audit events and the kill
 *   switch remain mandatory safety rails in this tier and are not part of
 *   this matrix.
 */
export const TIER_OPERATION_MATRIX: Record<
  PermissionTier,
  Record<TierOperationClass, TierOperationGate>
> = {
  approval_required: {
    file_read: "requires_approval",
    sensitive_file_read: "requires_approval",
    workspace_write: "requires_approval",
    file_delete: "requires_approval",
    shell_command: "requires_approval",
    network_egress: "requires_approval",
    git_write: "requires_approval",
    mcp_tool_call: "requires_approval",
    desktop_action: "requires_approval"
  },
  read_auto_approved: {
    ...AUTO_MATRIX,
    file_read: "auto",
    sensitive_file_read: "requires_approval",
    workspace_write: "requires_approval",
    file_delete: "requires_approval",
    shell_command: "requires_approval",
    network_egress: "requires_approval",
    git_write: "requires_approval",
    mcp_tool_call: "requires_approval",
    desktop_action: "requires_approval"
  },
  guarded_open: {
    ...AUTO_MATRIX,
    file_delete: "requires_approval",
    sensitive_file_read: "requires_approval"
  },
  unrestricted: { ...AUTO_MATRIX }
};

export function tierOperationGate(
  tier: PermissionTier,
  operationClass: TierOperationClass
): TierOperationGate {
  return TIER_OPERATION_MATRIX[tier][operationClass];
}

/**
 * Maps a 6-level product permission mode onto the canonical tier ladder.
 * `read_only_preview` maps to the most conservative tier; preview-only
 * behavior remains enforced by the mode policy itself.
 */
export function permissionModeTier(mode: PermissionMode): PermissionTier {
  switch (mode) {
    case "read_only_preview":
      return "approval_required";
    case "approval_mode":
      return "read_auto_approved";
    case "autonomous_safe_mode":
      return "read_auto_approved";
    case "advanced_workspace_mode":
      return "guarded_open";
    case "full_access_mode":
      return "unrestricted";
    case "break_glass_mode":
      return "unrestricted";
  }
}

/**
 * Maps a command-broker execution mode onto the canonical tier ladder.
 * Broker `approval` mode additionally blocks arbitrary shell entirely; that
 * lane-specific restriction is enforced on top of the tier.
 */
export function commandExecutionModeTier(
  mode: CommandExecutionMode
): PermissionTier {
  switch (mode) {
    case "approval":
      return "approval_required";
    case "autonomous_safe":
      return "read_auto_approved";
    case "advanced_workspace":
      return "guarded_open";
    case "full_access":
      return "unrestricted";
    case "break_glass":
      return "unrestricted";
  }
}

/**
 * Derives the command-broker execution mode from the product permission
 * mode. `read_only_preview` fails closed to `approval` (the most restrictive
 * broker mode); `break_glass_mode` keeps its dry-run-only semantics.
 */
export function commandExecutionModeForPermissionMode(
  mode: PermissionMode
): CommandExecutionMode {
  switch (mode) {
    case "read_only_preview":
      return "approval";
    case "approval_mode":
      return "approval";
    case "autonomous_safe_mode":
      return "autonomous_safe";
    case "advanced_workspace_mode":
      return "advanced_workspace";
    case "full_access_mode":
      return "full_access";
    case "break_glass_mode":
      return "break_glass";
  }
}

export function tierDisplayName(tier: PermissionTier): string {
  const names: Record<PermissionTier, string> = {
    approval_required: "Approval Required",
    read_auto_approved: "Read Auto-Approved",
    guarded_open: "Guarded Open",
    unrestricted: "Unrestricted"
  };
  return names[tier];
}

export function tierDescription(tier: PermissionTier): string {
  const descriptions: Record<PermissionTier, string> = {
    approval_required:
      "Every side-effecting operation requires an explicit approval receipt before execution.",
    read_auto_approved:
      "Plain file reads run without approval; writes, deletions, shell, network, and sensitive reads require approval.",
    guarded_open:
      "Operations run without approval except file deletion and sensitive file reads, which still require approval.",
    unrestricted:
      "All operation classes run without approval. Audit events and the kill switch remain enforced."
  };
  return descriptions[tier];
}
