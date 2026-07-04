import { describe, expect, it } from "vitest";

import {
  buildPluginSkillSandboxEscapeReport,
  summarizePluginSkillSandboxEscapeReport,
  validatePluginSkillSandboxEscapeChecks,
  type PluginSkillSandboxEscapeInput,
  type PluginSkillSandboxEscapeReport
} from "../src/capabilities/index.js";

function safeInput(): PluginSkillSandboxEscapeInput {
  return {
    packages: [
      {
        packageKind: "plugin",
        packageId: "plugin.readonly.format",
        displayName: "Readonly Format Plugin",
        descriptorRef: "descriptor-plugin-readonly-format",
        warningCodes: []
      },
      {
        packageKind: "skill",
        skillId: "skill.readonly.review",
        displayName: "Readonly Review Skill",
        descriptorRef: "descriptor-skill-readonly-review",
        warningCodes: []
      }
    ],
    metadataScanSummary: {
      status: "scanned"
    },
    sandboxContractSummary: {
      status: "metadata_only"
    }
  };
}

function codes(result: PluginSkillSandboxEscapeReport): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: PluginSkillSandboxEscapeReport): void {
  expect(result.readiness.canInstallPackage).toBe(false);
  expect(result.readiness.canLoadPluginCode).toBe(false);
  expect(result.readiness.canRunSkillRuntime).toBe(false);
  expect(result.readiness.canExecuteCustomCode).toBe(false);
  expect(result.readiness.canUseNetwork).toBe(false);
  expect(result.readiness.canWriteFilesystem).toBe(false);
  expect(result.readiness.canExecuteProcess).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.canUseDesktopAction).toBe(false);
  expect(result.readiness.canIssueBroadPermission).toBe(false);
  expect(result.readiness.canExecuteGit).toBe(false);
  expect(result.readiness.canExecuteShell).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("plugin skill sandbox escape checks", () => {
  it("returns safe metadata summary for plugin and skill package refs", () => {
    const result = buildPluginSkillSandboxEscapeReport({
      ...safeInput(),
      idGenerator: () => "sandbox-escape-test"
    });
    const summary = summarizePluginSkillSandboxEscapeReport(result);

    expect(result.status).toBe("safe_metadata");
    expect(result.sandboxCheckId).toBe("sandbox-escape-test");
    expect(result.packageCount).toBe(2);
    expect(result.pluginCount).toBe(1);
    expect(result.skillCount).toBe(1);
    expect(result.descriptorRefs).toEqual([
      "descriptor-plugin-readonly-format",
      "descriptor-skill-readonly-review"
    ]);
    expect(result.packageHash).toBeDefined();
    expect(result.riskCounts.safe).toBe(2);
    expect(summary.source).toBe(
      "runtime_plugin_skill_sandbox_escape_checks"
    );
    expect(result.readiness.canRegisterSafeMetadata).toBe(true);
    expectNoExecution(result);
  });

  it("warns for missing package metadata and existing warning summaries", () => {
    const result = buildPluginSkillSandboxEscapeReport({
      metadataScanSummary: { status: "warning" },
      sandboxContractSummary: { status: "warning" }
    });

    expect(result.status).toBe("warning");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "PACKAGE_METADATA_MISSING",
        "METADATA_SCAN_WARNING",
        "SANDBOX_CONTRACT_WARNING"
      ])
    );
    expectNoExecution(result);
  });

  it("blocks lifecycle scripts, postinstall, and preinstall markers", () => {
    const result = buildPluginSkillSandboxEscapeReport({
      packages: [
        {
          packageKind: "plugin",
          packageId: "plugin.blocked.lifecycle",
          descriptorRef: "descriptor-blocked-lifecycle",
          lifecycleScripts: ["synthetic build script"],
          postinstall: "node synthetic-postinstall.js",
          preinstall: "node synthetic-preinstall.js"
        }
      ]
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.blockedSignalCodes).toEqual(
      expect.arrayContaining([
        "LIFECYCLE_SCRIPT_REJECTED",
        "POSTINSTALL_REJECTED",
        "PREINSTALL_REJECTED"
      ])
    );
    expect(serialized).not.toContain("synthetic-postinstall");
    expectNoExecution(result);
  });

  it("blocks native modules, binary payloads, shell scripts, and process markers", () => {
    const result = buildPluginSkillSandboxEscapeReport({
      packages: [
        {
          packageKind: "plugin",
          packageId: "plugin.blocked.native",
          descriptorRef: "descriptor-blocked-native",
          nativeModules: ["addon.node"],
          binaryPayloads: ["tool.exe"],
          shellScripts: ["run.ps1"],
          process: "child_process spawn"
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedSignalCodes).toEqual(
      expect.arrayContaining([
        "NATIVE_MODULE_REJECTED",
        "BINARY_PAYLOAD_REJECTED",
        "SHELL_SCRIPT_REJECTED",
        "PROCESS_EXECUTION_PERMISSION_REJECTED"
      ])
    );
    expectNoExecution(result);
  });

  it("blocks network, filesystem write, dynamic import, and eval signals", () => {
    const result = buildPluginSkillSandboxEscapeReport({
      packages: [
        {
          packageKind: "skill",
          skillId: "skill.blocked.permissions",
          descriptorRef: "descriptor-blocked-permissions",
          networkPermissions: ["fetch external data"],
          filesystemWrite: true,
          dynamicImport: "import('external-runtime')",
          eval: "eval('blocked')"
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedSignalCodes).toEqual(
      expect.arrayContaining([
        "NETWORK_PERMISSION_REJECTED",
        "FILESYSTEM_WRITE_PERMISSION_REJECTED",
        "DYNAMIC_IMPORT_REJECTED",
        "EVAL_MARKER_REJECTED"
      ])
    );
    expectNoExecution(result);
  });

  it("blocks native bridge, desktop action, secret access, clipboard write, and file dialog automation", () => {
    const result = buildPluginSkillSandboxEscapeReport({
      packages: [
        {
          packageKind: "plugin",
          packageId: "plugin.blocked.desktop",
          descriptorRef: "descriptor-blocked-desktop",
          nativeBridge: true,
          desktopAction: true,
          secretAccess: "env ref",
          clipboardWrite: true,
          fileDialogAutomation: true
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedSignalCodes).toEqual(
      expect.arrayContaining([
        "NATIVE_BRIDGE_MARKER_REJECTED",
        "DESKTOP_ACTION_MARKER_REJECTED",
        "SECRET_ACCESS_REJECTED",
        "CLIPBOARD_WRITE_REJECTED",
        "FILE_DIALOG_AUTOMATION_REJECTED"
      ])
    );
    expectNoExecution(result);
  });

  it("blocks mutating and broad permission claims plus blocked upstream summaries", () => {
    const result = buildPluginSkillSandboxEscapeReport({
      ...safeInput(),
      packages: [
        {
          packageKind: "skill",
          skillId: "skill.blocked.mutating",
          descriptorRef: "descriptor-blocked-mutating",
          mutatingCapability: true,
          broadPermissions: ["all-files"]
        }
      ],
      metadataScanSummary: { status: "blocked" },
      sandboxContractSummary: { status: "blocked" }
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedSignalCodes).toEqual(
      expect.arrayContaining([
        "MUTATING_CAPABILITY_REJECTED",
        "BROAD_PERMISSION_REJECTED",
        "METADATA_SCAN_BLOCKED",
        "SANDBOX_CONTRACT_BLOCKED"
      ])
    );
    expectNoExecution(result);
  });

  it("blocks raw package content, secret markers, and execution readiness without leaking raw values", () => {
    const result = buildPluginSkillSandboxEscapeReport({
      ...safeInput(),
      rawPackageContent: "RAW_PACKAGE_CONTENT_SHOULD_NOT_LEAK",
      note: "Bearer fake-token-for-test-only",
      readiness: {
        canRunSkillRuntime: true
      }
    } as never);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.blockedSignalCodes).toEqual(
      expect.arrayContaining([
        "RAW_PACKAGE_CONTENT_REJECTED",
        "BEARER_TOKEN_MARKER_REJECTED",
        "EXECUTION_READINESS_FLAG_TRUE"
      ])
    );
    expect(serialized).not.toContain("RAW_PACKAGE_CONTENT_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("Bearer fake-token-for-test-only");
    expectNoExecution(result);
  });

  it("returns deterministic package hashes and validation findings", () => {
    const first = buildPluginSkillSandboxEscapeReport({
      ...safeInput(),
      idGenerator: () => "deterministic-sandbox-escape"
    });
    const second = buildPluginSkillSandboxEscapeReport({
      ...safeInput(),
      idGenerator: () => "deterministic-sandbox-escape"
    });
    const findings = validatePluginSkillSandboxEscapeChecks(safeInput());

    expect(first.packageHash).toBe(second.packageHash);
    expect(first.sandboxCheckId).toBe(second.sandboxCheckId);
    expect(findings).toHaveLength(0);
    expectNoExecution(first);
  });
});
