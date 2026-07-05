import { describe, expect, it, vi } from "vitest";

import {
  buildFirstRunUpgradeState,
  buildReleaseChannelPolicy,
  summarizeReleaseChannelPolicy,
  summarizeUpgradeState
} from "../src/platform/index.js";

describe("release/update policy", () => {
  it("builds a stable release policy without enabling updates", () => {
    const policy = buildReleaseChannelPolicy({
      policyId: "release-policy-stable",
      channel: "stable",
      currentVersion: "v0.31.0",
      targetVersion: "v0.32.0",
      updatePolicy: {
        requireUserConfirmation: true,
        allowAutomaticUpdate: false,
        allowNetworkFetch: false,
        allowDownload: false,
        allowInstall: false,
        allowAutoMigration: false
      }
    });
    const summary = summarizeReleaseChannelPolicy(policy);

    expect(policy.status).toBe("policy_ready");
    expect(summary.channel).toBe("stable");
    expect(policy.readiness).toMatchObject({
      canCheckForUpdates: false,
      canDownloadUpdate: false,
      canInstallUpdate: false,
      canRunUpgradeMigration: false,
      canFetchNetwork: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      appCanExecute: false
    });
  });

  it("keeps nightly disabled by default", () => {
    const policy = buildReleaseChannelPolicy({
      channel: "nightly_disabled",
      updatePolicy: { requireUserConfirmation: true }
    });

    expect(policy.status).toBe("disabled");
    expect(policy.findings.map((finding) => finding.code)).toContain(
      "NIGHTLY_DISABLED_BY_DEFAULT"
    );
    expect(policy.readiness.canCheckForUpdates).toBe(false);
  });

  it("blocks automatic update, network fetch, install, and auto-migration attempts", () => {
    const policy = buildReleaseChannelPolicy({
      channel: "rc",
      updatePolicy: {
        requireUserConfirmation: true,
        allowAutomaticUpdate: true,
        allowNetworkFetch: true,
        allowDownload: true,
        allowInstall: true,
        allowAutoMigration: true
      }
    });

    expect(policy.status).toBe("blocked");
    expect(policy.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "AUTOMATIC_UPDATE_REJECTED",
        "NETWORK_FETCH_REJECTED",
        "DOWNLOAD_INSTALL_REJECTED",
        "AUTO_MIGRATION_REJECTED"
      ])
    );
  });

  it("blocks raw or secret-like policy metadata without echoing values", () => {
    const policy = buildReleaseChannelPolicy({
      channel: "stable",
      updatePolicy: { requireUserConfirmation: true },
      rawInstaller: "fake raw update payload",
      targetVersion: "Bearer fake-test-token"
    } as never);

    expect(policy.status).toBe("blocked");
    expect(JSON.stringify(policy)).not.toContain("fake-test-token");
    expect(policy.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "RAWINSTALLER_FIELD_REJECTED",
        "BEARER_TOKEN_MARKER"
      ])
    );
  });

  it("summarizes first-run upgrade state without enabling migration", () => {
    const policy = buildReleaseChannelPolicy({
      policyId: "release-policy-rc",
      channel: "rc",
      currentVersion: "v0.32.0",
      targetVersion: "v0.32.0",
      updatePolicy: { requireUserConfirmation: true }
    });
    const state = buildFirstRunUpgradeState({
      stateId: "first-run-state",
      previousVersion: "v0.31.0",
      currentVersion: "v0.32.0",
      firstRun: true,
      releaseChannelPolicy: policy,
      migrationPlanStatus: "plan_ready",
      backupPlanStatus: "plan_ready",
      schemaVersions: ["event_log.v1"]
    });
    const summary = summarizeUpgradeState(state);

    expect(state.status).toBe("warning");
    expect(summary.upgradeDetected).toBe(true);
    expect(summary.manualReviewRequired).toBe(true);
    expect(state.readiness).toMatchObject({
      canCheckForUpdates: false,
      canDownloadUpdate: false,
      canInstallUpdate: false,
      canRunUpgradeMigration: false,
      canFetchNetwork: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      appCanExecute: false
    });
  });

  it("blocks first-run auto-migration and network fetch requests", () => {
    const policy = buildReleaseChannelPolicy({
      channel: "stable",
      updatePolicy: { requireUserConfirmation: true }
    });
    const state = buildFirstRunUpgradeState({
      currentVersion: "v0.32.0",
      previousVersion: "v0.31.0",
      firstRun: true,
      releaseChannelPolicy: policy,
      migrationPlanStatus: "plan_ready",
      backupPlanStatus: "plan_ready",
      schemaVersions: ["event_log.v1"],
      autoMigrationRequested: true,
      networkFetchRequested: true
    });

    expect(state.status).toBe("blocked");
    expect(state.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "AUTO_MIGRATION_REJECTED",
        "NETWORK_FETCH_REJECTED"
      ])
    );
    expect(state.readiness.canRunUpgradeMigration).toBe(false);
  });

  it("blocks raw first-run state metadata and keeps output summary-only", () => {
    const policy = buildReleaseChannelPolicy({
      channel: "stable",
      updatePolicy: { requireUserConfirmation: true }
    });
    const state = buildFirstRunUpgradeState({
      currentVersion: "v0.32.0",
      previousVersion: "v0.31.0",
      releaseChannelPolicy: policy,
      rawUpgradePayload: "raw source content",
      Authorization: "Authorization: Bearer fake-test-token"
    } as never);

    expect(state.status).toBe("blocked");
    expect(JSON.stringify(state)).not.toContain("fake-test-token");
    expect(state.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "RAWUPGRADEPAYLOAD_FIELD_REJECTED",
        "AUTHORIZATION_FIELD_REJECTED"
      ])
    );
  });

  it("uses deterministic ids and hashes with injected ids", () => {
    const policy = buildReleaseChannelPolicy({
      channel: "stable",
      idGenerator: () => "deterministic-policy",
      updatePolicy: { requireUserConfirmation: true }
    });
    const state = buildFirstRunUpgradeState({
      idGenerator: () => "deterministic-state",
      currentVersion: "v0.32.0",
      previousVersion: "v0.32.0",
      releaseChannelPolicy: policy,
      migrationPlanStatus: "plan_ready",
      backupPlanStatus: "plan_ready",
      schemaVersions: ["event_log.v1"]
    });

    expect(policy.policyId).toBe("deterministic-policy");
    expect(state.stateId).toBe("deterministic-state");
    expect(policy.policyHash).toHaveLength(64);
    expect(state.stateHash).toHaveLength(64);
  });

  it("does not read process.env or call global fetch", () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("fetch must not be called"));
    const envKey = "P1J_RELEASE_POLICY_SENTINEL";
    const original = process.env[envKey];
    process.env[envKey] = "sentinel-secret";

    try {
      const policy = buildReleaseChannelPolicy({
        channel: "stable",
        updatePolicy: { requireUserConfirmation: true }
      });
      const state = buildFirstRunUpgradeState({
        currentVersion: "v0.32.0",
        previousVersion: "v0.31.0",
        releaseChannelPolicy: policy,
        migrationPlanStatus: "plan_ready",
        backupPlanStatus: "plan_ready",
        schemaVersions: ["event_log.v1"]
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(JSON.stringify({ policy, state })).not.toContain(
        "sentinel-secret"
      );
    } finally {
      if (original === undefined) {
        delete process.env[envKey];
      } else {
        process.env[envKey] = original;
      }
      fetchSpy.mockRestore();
    }
  });
});
