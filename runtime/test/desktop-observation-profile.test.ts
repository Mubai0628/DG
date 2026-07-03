import { describe, expect, it } from "vitest";

import {
  buildDesktopObservationProfile,
  summarizeDesktopObservationProfile,
  validateDesktopObservationProfileInput
} from "../src/desktop-observer/index.js";

const safeProfileInput = {
  displayName: "Metadata observer",
  observationMode: "metadata_only",
  scope: {
    includeForegroundWindow: true,
    includeWindowList: true
  },
  capturePolicy: {},
  redactionPolicy: {
    enabled: true,
    redactWindowTitles: true,
    redactProcessNames: true
  },
  maxWindowCount: 5,
  maxDisplayCount: 2,
  includeWindowTitles: false,
  includeProcessNames: false,
  includeDisplayMetadata: true,
  includeScreenshotMetadata: false,
  createdAt: "2026-07-03T00:00:00.000Z",
  idGenerator: () => "profile-fixed-id"
};

describe("desktop observation profile schema", () => {
  it("builds a safe metadata-only profile", () => {
    const result = buildDesktopObservationProfile(safeProfileInput);

    expect(result.status).toBe("profile_ready");
    expect(result.blockerCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.profile?.profileId).toBe("profile-fixed-id");
    expect(result.profile?.capturePolicy.allowDesktopAction).toBe(false);
    expect(result.profile?.capturePolicy.allowRawScreenshotPersistence).toBe(
      false
    );
    expect(result.readiness.canUseForDesktopObservation).toBe(true);
    expect(result.readiness.canDesktopAction).toBe(false);
    expect(result.readiness.canClickTypeSelect).toBe(false);
    expect(result.readiness.canWriteEventStore).toBe(false);
    expect(result.readiness.appCanExecute).toBe(false);

    const summary = summarizeDesktopObservationProfile(result);
    expect(summary.summaryOnly).toBe(true);
    expect(summary.profileId).toBe("profile-fixed-id");
    expect(summary.profileHash).toBe(result.profileHash);
  });

  it("keeps disabled profiles disabled and non-executable", () => {
    const result = buildDesktopObservationProfile({
      ...safeProfileInput,
      observationMode: "disabled"
    });

    expect(result.status).toBe("disabled");
    expect(result.blockerCount).toBe(0);
    expect(result.readiness.canUseForDesktopObservation).toBe(false);
    expect(result.readiness.canCaptureRawScreenshot).toBe(false);
    expect(result.readiness.canExecuteGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
  });

  it("warns for screenshot metadata mode without enabling raw screenshots", () => {
    const result = buildDesktopObservationProfile({
      ...safeProfileInput,
      observationMode: "screenshot_metadata_only",
      includeScreenshotMetadata: true
    });

    expect(result.status).toBe("warning");
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.summary.warningCodes).toContain("screenshot_metadata_mode");
    expect(result.readiness.canCaptureScreenshotMetadata).toBe(true);
    expect(result.readiness.canCaptureRawScreenshot).toBe(false);
    expect(result.readiness.canPersistRawScreenshot).toBe(false);
  });

  it("warns when window titles or process names are included", () => {
    const result = buildDesktopObservationProfile({
      ...safeProfileInput,
      includeWindowTitles: true,
      includeProcessNames: true
    });

    expect(result.status).toBe("warning");
    expect(result.summary.warningCodes).toContain("window_titles_included");
    expect(result.summary.warningCodes).toContain("process_names_included");
  });

  it("blocks raw screenshot and raw OCR persistence", () => {
    const result = buildDesktopObservationProfile({
      ...safeProfileInput,
      capturePolicy: {
        allowRawScreenshotPersistence: true,
        allowRawOcrTextPersistence: true
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain(
      "raw_screenshot_persistence_allowed"
    );
    expect(result.summary.blockerCodes).toContain(
      "raw_ocr_persistence_allowed"
    );
    expect(result.readiness.canPersistRawScreenshot).toBe(false);
    expect(result.readiness.canPersistRawOcrText).toBe(false);
  });

  it("blocks desktop action and click/type/select", () => {
    const result = buildDesktopObservationProfile({
      ...safeProfileInput,
      capturePolicy: {
        allowDesktopAction: true,
        allowClickTypeSelect: true
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("desktop_action_allowed");
    expect(result.summary.blockerCodes).toContain("click_type_select_allowed");
    expect(result.readiness.canDesktopAction).toBe(false);
    expect(result.readiness.canClickTypeSelect).toBe(false);
  });

  it("blocks clipboard and send-to-model policies", () => {
    const result = buildDesktopObservationProfile({
      ...safeProfileInput,
      capturePolicy: {
        allowClipboardWrite: true,
        allowClipboardReadByDefault: true,
        sendToModel: true
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("clipboard_write_allowed");
    expect(result.summary.blockerCodes).toContain(
      "clipboard_read_default_allowed"
    );
    expect(result.summary.blockerCodes).toContain("send_to_model_allowed");
    expect(result.readiness.canWriteClipboard).toBe(false);
    expect(result.readiness.canReadClipboardByDefault).toBe(false);
    expect(result.readiness.canSendToModel).toBe(false);
  });

  it("blocks hidden capture and screen recording", () => {
    const result = buildDesktopObservationProfile({
      ...safeProfileInput,
      capturePolicy: {
        allowHiddenBackgroundCapture: true,
        allowScreenRecording: true
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain(
      "hidden_background_capture_allowed"
    );
    expect(result.summary.blockerCodes).toContain("screen_recording_allowed");
    expect(result.readiness.canHiddenBackgroundCapture).toBe(false);
    expect(result.readiness.canScreenRecord).toBe(false);
  });

  it("blocks raw fields and secret markers without echoing raw values", () => {
    const result = validateDesktopObservationProfileInput({
      ...safeProfileInput,
      displayName: "sk-fake-observer-key",
      rawScreenshot: "fake raw screenshot bytes",
      rawOcrText: "fake raw OCR",
      apiKey: "sk-fake-secret"
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.profile).toBeUndefined();
    expect(result.summary.displayName).toBeUndefined();
    expect(result.summary.blockerCodes).toContain("forbidden_field");
    expect(result.summary.blockerCodes).toContain("secret_marker_detected");
    expect(serialized).not.toContain("sk-fake-observer-key");
    expect(serialized).not.toContain("sk-fake-secret");
    expect(serialized).not.toContain("fake raw screenshot bytes");
  });

  it("blocks unknown modes and missing display names", () => {
    const result = buildDesktopObservationProfile({
      observationMode: "observe_everything",
      maxWindowCount: 5,
      maxDisplayCount: 2
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("missing_display_name");
    expect(result.summary.blockerCodes).toContain("unknown_observation_mode");
  });

  it("keeps deterministic ids and hashes with injected id and createdAt", () => {
    const first = buildDesktopObservationProfile(safeProfileInput);
    const second = buildDesktopObservationProfile(safeProfileInput);

    expect(first.profile?.profileId).toBe("profile-fixed-id");
    expect(second.profile?.profileId).toBe("profile-fixed-id");
    expect(first.profileHash).toBe(second.profileHash);
  });

  it("keeps every execution readiness flag false", () => {
    const result = buildDesktopObservationProfile(safeProfileInput);

    expect(result.readiness.canCaptureRawScreenshot).toBe(false);
    expect(result.readiness.canPersistRawScreenshot).toBe(false);
    expect(result.readiness.canPersistRawOcrText).toBe(false);
    expect(result.readiness.canWriteClipboard).toBe(false);
    expect(result.readiness.canReadClipboardByDefault).toBe(false);
    expect(result.readiness.canDesktopAction).toBe(false);
    expect(result.readiness.canClickTypeSelect).toBe(false);
    expect(result.readiness.canFileDialogAutomation).toBe(false);
    expect(result.readiness.canHiddenBackgroundCapture).toBe(false);
    expect(result.readiness.canScreenRecord).toBe(false);
    expect(result.readiness.canSendToModel).toBe(false);
    expect(result.readiness.canWriteEventStore).toBe(false);
    expect(result.readiness.canApplyPatch).toBe(false);
    expect(result.readiness.canRollback).toBe(false);
    expect(result.readiness.canExecuteGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(result.readiness.canIssuePermissionLease).toBe(false);
    expect(result.readiness.appCanExecute).toBe(false);
  });
});
