import { describe, expect, it } from "vitest";

import {
  buildDesktopObservationProfile,
  buildDesktopObservationSummary,
  summarizeDesktopObservation,
  validateDesktopObservationInput
} from "../src/desktop-observer/index.js";

const profileResult = buildDesktopObservationProfile({
  displayName: "Metadata observer",
  observationMode: "screenshot_metadata_only",
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
  maxDisplayCount: 3,
  includeWindowTitles: true,
  includeProcessNames: true,
  includeDisplayMetadata: true,
  includeScreenshotMetadata: true,
  idGenerator: () => "profile-summary-id",
  createdAt: "2026-07-03T00:00:00.000Z"
});

const safeObservationInput = {
  profile: profileResult,
  observationId: "observation-fixed-id",
  observedAt: "2026-07-03T00:01:00.000Z",
  windows: [
    {
      windowId: "window-main",
      title: "Docs - DeepSeek Workbench",
      appName: "Code Editor",
      pid: 1234,
      bounds: { x: 0, y: 0, width: 1280, height: 720 },
      focused: true,
      displayId: "display-primary"
    }
  ],
  displays: [
    {
      displayId: "display-primary",
      width: 1920,
      height: 1080,
      scaleFactor: 1.25,
      primary: true
    }
  ],
  screenshotMetadata: {
    screenshotHash: "abc123metadata",
    width: 1920,
    height: 1080,
    byteEstimate: 120000,
    redactionCodes: ["metadata_only"],
    rawScreenshotPersisted: false
  },
  idGenerator: () => "observation-fixed-id"
};

describe("desktop observation summary model", () => {
  it("summarizes safe manual metadata without OS or Tauri calls", () => {
    const result = buildDesktopObservationSummary(safeObservationInput);

    expect(result.status).toBe("observed");
    expect(result.blockerCount).toBe(0);
    expect(result.windowCount).toBe(1);
    expect(result.appCount).toBe(1);
    expect(result.displayCount).toBe(1);
    expect(result.observationId).toBe("observation-fixed-id");
    expect(result.profileId).toBe("profile-summary-id");
    expect(result.windows[0]?.titleSummary).toBe("Docs - DeepSeek Workbench");
    expect(result.windows[0]?.windowIdHash).not.toBe("window-main");
    expect(result.displays[0]?.sizeSummary).toBe("1920x1080");
    expect(result.readiness.canUseAsContextEvidence).toBe(true);
    expect(result.readiness.canDesktopAction).toBe(false);
    expect(result.readiness.canWriteEventStore).toBe(false);

    const summary = summarizeDesktopObservation(result);
    expect(summary.summaryOnly).toBe(true);
    expect(summary.observationHash).toBe(result.observationHash);
  });

  it("redacts sensitive title summaries and blocks secret-like titles", () => {
    const result = buildDesktopObservationSummary({
      ...safeObservationInput,
      windows: [
        {
          windowId: "window-secret",
          title: "sk-fake-window-title-secret",
          appName: "Code Editor",
          focused: true
        }
      ]
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.windows).toHaveLength(0);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "window_title_secret_marker"
    );
    expect(serialized).not.toContain("sk-fake-window-title-secret");
  });

  it("includes screenshot metadata only and never raw screenshot persistence", () => {
    const result = buildDesktopObservationSummary(safeObservationInput);

    expect(result.screenshotMetadataIncluded).toBe(true);
    expect(result.screenshotMetadata?.screenshotHash).toBe("abc123metadata");
    expect(result.screenshotMetadata?.rawScreenshotPersisted).toBe(false);
    expect(result.readiness.canPersistRawScreenshot).toBe(false);
    expect(result.readiness.canPersistRawOcrText).toBe(false);
  });

  it("blocks raw screenshot and OCR fields", () => {
    const result = validateDesktopObservationInput({
      ...safeObservationInput,
      rawScreenshot: "fake raw screenshot bytes",
      rawOcrText: "fake raw OCR text"
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "forbidden_field"
    );
    expect(serialized).not.toContain("fake raw screenshot bytes");
    expect(serialized).not.toContain("fake raw OCR text");
  });

  it("blocks desktop action, click/type/select, clipboard, and send-to-model", () => {
    const result = buildDesktopObservationSummary({
      ...safeObservationInput,
      desktopAction: true,
      click: true,
      clipboardText: "do not keep clipboard",
      sendToModel: true
    });
    const codes = result.findings.map((finding) => finding.code);

    expect(result.status).toBe("blocked");
    expect(codes).toContain("forbidden_field");
    expect(codes).toContain("execution_field_true");
    expect(result.readiness.canDesktopAction).toBe(false);
    expect(result.readiness.canClickTypeSelect).toBe(false);
    expect(result.readiness.canWriteClipboard).toBe(false);
    expect(result.readiness.canSendToModel).toBe(false);
  });

  it("blocks raw screenshot persisted metadata", () => {
    const result = buildDesktopObservationSummary({
      ...safeObservationInput,
      screenshotMetadata: {
        screenshotHash: "abc123metadata",
        width: 1920,
        height: 1080,
        rawScreenshotPersisted: true
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "raw_screenshot_persisted"
    );
    expect(result.readiness.canPersistRawScreenshot).toBe(false);
  });

  it("blocks too many windows according to profile limits", () => {
    const result = buildDesktopObservationSummary({
      ...safeObservationInput,
      windows: Array.from({ length: 6 }, (_, index) => ({
        windowId: `window-${index}`,
        title: `Window ${index}`,
        appName: "Code Editor"
      }))
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "too_many_windows"
    );
  });

  it("returns empty safely for no metadata", () => {
    const result = buildDesktopObservationSummary({
      profile: profileResult,
      idGenerator: () => "empty-observation"
    });

    expect(result.status).toBe("empty");
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.windowCount).toBe(0);
    expect(result.readiness.canUseAsContextEvidence).toBe(false);
  });

  it("keeps deterministic observation ids and hashes", () => {
    const first = buildDesktopObservationSummary(safeObservationInput);
    const second = buildDesktopObservationSummary(safeObservationInput);

    expect(first.observationId).toBe("observation-fixed-id");
    expect(second.observationId).toBe("observation-fixed-id");
    expect(first.observationHash).toBe(second.observationHash);
  });

  it("keeps every execution readiness flag false", () => {
    const result = buildDesktopObservationSummary(safeObservationInput);

    expect(result.readiness.canPersistRawScreenshot).toBe(false);
    expect(result.readiness.canPersistRawOcrText).toBe(false);
    expect(result.readiness.canReadClipboard).toBe(false);
    expect(result.readiness.canWriteClipboard).toBe(false);
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
