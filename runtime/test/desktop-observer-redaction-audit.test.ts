import { describe, expect, it } from "vitest";

import {
  buildDesktopObserverRedactionAudit,
  summarizeDesktopObserverRedactionAudit
} from "../src/desktop-observer/index.js";

const safeAuditInput = {
  profileSummary: {
    profileId: "profile-safe",
    status: "ready",
    includeWindowTitles: false,
    includeProcessNames: false,
    includeDisplayMetadata: true,
    includeScreenshotMetadata: false,
    summaryOnly: true
  },
  observationSummary: {
    observationId: "observation-safe",
    windowCount: 1,
    appCount: 1,
    displayCount: 1,
    screenshotMetadataIncluded: false,
    warningCodes: [],
    summaryOnly: true
  },
  screenshotBoundary: {
    captureMode: "metadata_only",
    modelSent: false,
    redactionCodes: [],
    warningCodes: [],
    blockerCodes: [],
    summaryOnly: true
  }
};

describe("desktop observer redaction audit", () => {
  it("passes safe summary-only observation audit", () => {
    const report = buildDesktopObserverRedactionAudit(safeAuditInput);
    const summary = summarizeDesktopObserverRedactionAudit(report);

    expect(report.status).toBe("audit_ready");
    expect(report.blockerCount).toBe(0);
    expect(report.summaryOnly).toBe(true);
    expect(report.readiness.canUseSummaryAsEvidence).toBe(true);
    expect(summary.status).toBe("audit_ready");
    expect(summary.summaryOnly).toBe(true);
  });

  it("blocks raw screenshot fields without echoing values", () => {
    const report = buildDesktopObserverRedactionAudit({
      ...safeAuditInput,
      screenshotBytes: "fake raw screenshot bytes"
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.rawScreenshotDetected).toBe(true);
    expect(report.findings.map((finding) => finding.code)).toContain(
      "raw_screenshot_field"
    );
    expect(serialized).not.toContain("fake raw screenshot bytes");
  });

  it("blocks OCR text fields without echoing values", () => {
    const report = buildDesktopObserverRedactionAudit({
      ...safeAuditInput,
      ocrText: "fake private OCR text"
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.ocrTextDetected).toBe(true);
    expect(report.findings.map((finding) => finding.code)).toContain(
      "ocr_text_field"
    );
    expect(serialized).not.toContain("fake private OCR text");
  });

  it("blocks API key markers without returning the marker", () => {
    const report = buildDesktopObserverRedactionAudit({
      ...safeAuditInput,
      titleSummary: "sk-fake-desktop-observer-secret"
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.apiKeyMarkerDetected).toBe(true);
    expect(report.findings.map((finding) => finding.code)).toContain(
      "api_key_marker"
    );
    expect(serialized).not.toContain("sk-fake-desktop-observer-secret");
  });

  it("blocks hidden capture flags", () => {
    const report = buildDesktopObserverRedactionAudit({
      ...safeAuditInput,
      capturePolicy: {
        allowHiddenBackgroundCapture: true
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.hiddenCaptureDetected).toBe(true);
    expect(report.findings.map((finding) => finding.code)).toContain(
      "hidden_capture_true"
    );
    expect(report.readiness.canHiddenCapture).toBe(false);
  });

  it("blocks send-to-model flags", () => {
    const report = buildDesktopObserverRedactionAudit({
      ...safeAuditInput,
      observationSummary: {
        ...safeAuditInput.observationSummary,
        sendToModel: true
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.sendToModelDetected).toBe(true);
    expect(report.findings.map((finding) => finding.code)).toContain(
      "send_to_model_true"
    );
    expect(report.readiness.canSendToModel).toBe(false);
  });

  it("warns on title/process/screenshot/multiple-display metadata", () => {
    const report = buildDesktopObserverRedactionAudit({
      ...safeAuditInput,
      profileSummary: {
        ...safeAuditInput.profileSummary,
        includeWindowTitles: true,
        includeProcessNames: true,
        includeScreenshotMetadata: true
      },
      observationSummary: {
        ...safeAuditInput.observationSummary,
        displayCount: 2,
        appNameSummary: "unknown"
      }
    });
    const codes = report.findings.map((finding) => finding.code);

    expect(report.status).toBe("warning");
    expect(codes).toEqual(
      expect.arrayContaining([
        "window_titles_included",
        "process_names_included",
        "screenshot_metadata_included",
        "multiple_displays_detected",
        "unknown_app_names_detected"
      ])
    );
  });

  it("keeps every execution readiness flag false", () => {
    const report = buildDesktopObserverRedactionAudit(safeAuditInput);

    expect(report.readiness.canPersistRawScreenshot).toBe(false);
    expect(report.readiness.canPersistOcrText).toBe(false);
    expect(report.readiness.canSendToModel).toBe(false);
    expect(report.readiness.canDesktopAction).toBe(false);
    expect(report.readiness.canClickTypeSelect).toBe(false);
    expect(report.readiness.canReadClipboard).toBe(false);
    expect(report.readiness.canWriteClipboard).toBe(false);
    expect(report.readiness.canHiddenCapture).toBe(false);
    expect(report.readiness.canWriteEventStore).toBe(false);
    expect(report.readiness.canApplyPatch).toBe(false);
    expect(report.readiness.canRollback).toBe(false);
    expect(report.readiness.canExecuteGit).toBe(false);
    expect(report.readiness.canExecuteShell).toBe(false);
    expect(report.readiness.appCanExecute).toBe(false);
  });
});
