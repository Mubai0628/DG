import { describe, expect, it } from "vitest";

import {
  ALL_PERMISSION_TIERS,
  ALL_TIER_OPERATION_CLASSES,
  TIER_OPERATION_MATRIX,
  commandExecutionModeForPermissionMode,
  commandExecutionModeTier,
  permissionModeTier,
  tierDescription,
  tierDisplayName,
  tierOperationGate,
  type PermissionTier
} from "../src/index.js";

describe("permission tier canonical mappings", () => {
  it("maps every 6-level permission mode onto a tier", () => {
    expect(permissionModeTier("read_only_preview")).toBe("approval_required");
    expect(permissionModeTier("approval_mode")).toBe("read_auto_approved");
    expect(permissionModeTier("autonomous_safe_mode")).toBe(
      "read_auto_approved"
    );
    expect(permissionModeTier("advanced_workspace_mode")).toBe("guarded_open");
    expect(permissionModeTier("full_access_mode")).toBe("unrestricted");
    expect(permissionModeTier("break_glass_mode")).toBe("unrestricted");
  });

  it("maps every command execution mode onto a tier", () => {
    expect(commandExecutionModeTier("approval")).toBe("approval_required");
    expect(commandExecutionModeTier("autonomous_safe")).toBe(
      "read_auto_approved"
    );
    expect(commandExecutionModeTier("advanced_workspace")).toBe("guarded_open");
    expect(commandExecutionModeTier("full_access")).toBe("unrestricted");
    expect(commandExecutionModeTier("break_glass")).toBe("unrestricted");
  });

  it("derives command execution mode from permission mode and fails closed for read_only_preview", () => {
    expect(commandExecutionModeForPermissionMode("read_only_preview")).toBe(
      "approval"
    );
    expect(commandExecutionModeForPermissionMode("approval_mode")).toBe(
      "approval"
    );
    expect(commandExecutionModeForPermissionMode("autonomous_safe_mode")).toBe(
      "autonomous_safe"
    );
    expect(
      commandExecutionModeForPermissionMode("advanced_workspace_mode")
    ).toBe("advanced_workspace");
    expect(commandExecutionModeForPermissionMode("full_access_mode")).toBe(
      "full_access"
    );
    expect(commandExecutionModeForPermissionMode("break_glass_mode")).toBe(
      "break_glass"
    );
  });

  it("derives a command mode whose tier is never looser than the source mode tier", () => {
    const rank: Record<PermissionTier, number> = {
      unrestricted: 0,
      guarded_open: 1,
      read_auto_approved: 2,
      approval_required: 3
    };
    const modes = [
      "read_only_preview",
      "approval_mode",
      "autonomous_safe_mode",
      "advanced_workspace_mode",
      "full_access_mode",
      "break_glass_mode"
    ] as const;
    for (const mode of modes) {
      const derived = commandExecutionModeForPermissionMode(mode);
      expect(rank[commandExecutionModeTier(derived)]).toBeGreaterThanOrEqual(
        rank[permissionModeTier(mode)]
      );
    }
  });
});

describe("tier operation matrix", () => {
  it("covers every tier and every operation class", () => {
    for (const tier of ALL_PERMISSION_TIERS) {
      for (const operationClass of ALL_TIER_OPERATION_CLASSES) {
        expect(TIER_OPERATION_MATRIX[tier][operationClass]).toMatch(
          /^(auto|requires_approval|blocked)$/
        );
      }
    }
  });

  it("requires approval for everything in approval_required tier", () => {
    for (const operationClass of ALL_TIER_OPERATION_CLASSES) {
      expect(tierOperationGate("approval_required", operationClass)).toBe(
        "requires_approval"
      );
    }
  });

  it("auto-approves plain reads only in read_auto_approved tier", () => {
    expect(tierOperationGate("read_auto_approved", "file_read")).toBe("auto");
    for (const operationClass of ALL_TIER_OPERATION_CLASSES) {
      if (operationClass === "file_read") {
        continue;
      }
      expect(tierOperationGate("read_auto_approved", operationClass)).toBe(
        "requires_approval"
      );
    }
  });

  it("keeps deletion and sensitive reads approval-gated in guarded_open tier", () => {
    expect(tierOperationGate("guarded_open", "file_delete")).toBe(
      "requires_approval"
    );
    expect(tierOperationGate("guarded_open", "sensitive_file_read")).toBe(
      "requires_approval"
    );
    for (const operationClass of ALL_TIER_OPERATION_CLASSES) {
      if (
        operationClass === "file_delete" ||
        operationClass === "sensitive_file_read"
      ) {
        continue;
      }
      expect(tierOperationGate("guarded_open", operationClass)).toBe("auto");
    }
  });

  it("auto-approves everything in unrestricted tier", () => {
    for (const operationClass of ALL_TIER_OPERATION_CLASSES) {
      expect(tierOperationGate("unrestricted", operationClass)).toBe("auto");
    }
  });

  it("provides display names and descriptions for every tier", () => {
    for (const tier of ALL_PERMISSION_TIERS) {
      expect(tierDisplayName(tier).length).toBeGreaterThan(0);
      expect(tierDescription(tier).length).toBeGreaterThan(0);
    }
    expect(new Set(ALL_PERMISSION_TIERS.map(tierDisplayName)).size).toBe(
      ALL_PERMISSION_TIERS.length
    );
  });
});

describe("tier ladder ordering", () => {
  it("never loosens a gate when moving to a stricter tier", () => {
    const rank: Record<string, number> = {
      auto: 0,
      requires_approval: 1,
      blocked: 2
    };
    const ladder: PermissionTier[] = [
      "unrestricted",
      "guarded_open",
      "read_auto_approved",
      "approval_required"
    ];
    for (let index = 1; index < ladder.length; index += 1) {
      for (const operationClass of ALL_TIER_OPERATION_CLASSES) {
        const looser = tierOperationGate(ladder[index - 1]!, operationClass);
        const stricter = tierOperationGate(ladder[index]!, operationClass);
        expect(rank[stricter]).toBeGreaterThanOrEqual(rank[looser]!);
      }
    }
  });
});
