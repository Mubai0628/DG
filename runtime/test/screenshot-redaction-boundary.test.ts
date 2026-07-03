import { describe, expect, it } from "vitest";

import {
  buildScreenshotMetadataBoundary,
  summarizeScreenshotMetadataBoundary
} from "../src/desktop-observer/index.js";

const safeMetadata = {
  boundaryId: "screenshot-boundary-fixed",
  width: 1920,
  height: 1080,
  displayCount: 2,
  hashPrefix: "abc123metadata",
  captureMode: "metadata_only",
  rawPersisted: false,
  ocrPersisted: false,
  modelSent: false,
  redactionCodes: ["metadata_only", "window_titles_redacted"],
  idGenerator: () => "screenshot-boundary-fixed"
};

describe("screenshot metadata redaction boundary", () => {
  it("builds a summary-only screenshot metadata boundary", () => {
    const result = buildScreenshotMetadataBoundary(safeMetadata);

    expect(result.status).toBe("boundary_ready");
    expect(result.boundaryId).toBe("screenshot-boundary-fixed");
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.displayCount).toBe(2);
    expect(result.pixelCountEstimate).toBe(1920 * 1080 * 2);
    expect(result.hashPrefix).toBe("abc123metadata");
    expect(result.captureMode).toBe("metadata_only");
    expect(result.rawPersisted).toBe(false);
    expect(result.ocrPersisted).toBe(false);
    expect(result.modelSent).toBe(false);
    expect(result.redactionCodes).toContain("metadata_only");
    expect(result.readiness.canUseScreenshotMetadata).toBe(true);
    expect(result.readiness.canPersistRawScreenshot).toBe(false);
    expect(result.readiness.canPersistRawOcrText).toBe(false);
    expect(result.readiness.canSendToModel).toBe(false);

    const summary = summarizeScreenshotMetadataBoundary(result);
    expect(summary.summaryOnly).toBe(true);
    expect(summary.rawPersisted).toBe(false);
    expect(summary.ocrPersisted).toBe(false);
    expect(summary.modelSent).toBe(false);
    expect(summary.boundaryHash).toBe(result.boundaryHash);
  });

  it("unwraps screenshotMetadata records from desktop observation summaries", () => {
    const result = buildScreenshotMetadataBoundary({
      displayCount: 1,
      screenshotMetadata: {
        width: 1280,
        height: 720,
        hashPrefix: "summaryhash",
        captureMode: "metadata_only",
        redactionCodes: ["metadata_only"]
      },
      idGenerator: () => "screenshot-boundary-summary"
    });

    expect(result.status).toBe("boundary_ready");
    expect(result.boundaryId).toBe("screenshot-boundary-summary");
    expect(result.displayCount).toBe(1);
    expect(result.pixelCountEstimate).toBe(1280 * 720);
  });

  it("returns empty safely when metadata is missing", () => {
    const result = buildScreenshotMetadataBoundary(undefined);

    expect(result.status).toBe("empty");
    expect(result.warningCount).toBe(1);
    expect(result.readiness.canUseScreenshotMetadata).toBe(false);
    expect(result.readiness.canPersistRawScreenshot).toBe(false);
  });

  it("blocks base64 image, byte, and raw screenshot path fields", () => {
    const result = buildScreenshotMetadataBoundary({
      ...safeMetadata,
      screenshotBase64: "data:image/png;base64,AAAA",
      bytes: 400,
      rawScreenshotPath: "C:/Users/example/Desktop/raw.png"
    });
    const codes = result.findings.map((finding) => finding.code);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(codes).toContain("forbidden_field");
    expect(codes).toContain("raw_marker_detected");
    expect(serialized).not.toContain("AAAA");
    expect(serialized).not.toContain("raw.png");
  });

  it("blocks OCR text and raw prompt/source/diff fields", () => {
    const result = buildScreenshotMetadataBoundary({
      ...safeMetadata,
      ocrText: "visible private text",
      rawPrompt: "raw prompt",
      rawSource: "source content",
      rawDiff: "diff content"
    });
    const codes = result.findings.map((finding) => finding.code);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(codes).toContain("forbidden_field");
    expect(codes).toContain("raw_marker_detected");
    expect(serialized).not.toContain("visible private text");
    expect(serialized).not.toContain("source content");
    expect(serialized).not.toContain("diff content");
  });

  it("blocks raw persistence, OCR persistence, and model send", () => {
    const result = buildScreenshotMetadataBoundary({
      ...safeMetadata,
      rawPersisted: true,
      ocrPersisted: true,
      modelSent: true
    });
    const codes = result.findings.map((finding) => finding.code);

    expect(result.status).toBe("blocked");
    expect(codes).toContain("raw_screenshot_persisted");
    expect(codes).toContain("raw_ocr_persisted");
    expect(codes).toContain("model_sent");
    expect(codes).toContain("execution_field_true");
    expect(result.rawPersisted).toBe(false);
    expect(result.ocrPersisted).toBe(false);
    expect(result.modelSent).toBe(false);
  });

  it("blocks API key markers without echoing them", () => {
    const result = buildScreenshotMetadataBoundary({
      ...safeMetadata,
      hashPrefix: "sk-fake-screenshot-key-000000"
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "secret_marker_detected"
    );
    expect(serialized).not.toContain("sk-fake-screenshot-key-000000");
  });

  it("warns when dimensions or display count are missing", () => {
    const result = buildScreenshotMetadataBoundary({
      captureMode: "metadata_only",
      rawPersisted: false,
      ocrPersisted: false,
      modelSent: false,
      idGenerator: () => "screenshot-boundary-warning"
    });
    const codes = result.findings.map((finding) => finding.code);

    expect(result.status).toBe("warning");
    expect(codes).toContain("dimensions_missing");
    expect(codes).toContain("display_count_missing");
    expect(result.readiness.canUseScreenshotMetadata).toBe(true);
  });

  it("blocks capture modes other than metadata_only", () => {
    const result = buildScreenshotMetadataBoundary({
      ...safeMetadata,
      captureMode: "raw_screenshot"
    });

    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "capture_mode_not_metadata_only"
    );
  });

  it("keeps all execution readiness flags false", () => {
    const result = buildScreenshotMetadataBoundary(safeMetadata);

    expect(result.readiness.canPersistRawScreenshot).toBe(false);
    expect(result.readiness.canPersistRawOcrText).toBe(false);
    expect(result.readiness.canSendToModel).toBe(false);
    expect(result.readiness.canCaptureRawScreenshot).toBe(false);
    expect(result.readiness.canDesktopAction).toBe(false);
    expect(result.readiness.canClickTypeSelect).toBe(false);
    expect(result.readiness.canWriteClipboard).toBe(false);
    expect(result.readiness.canWriteEventStore).toBe(false);
    expect(result.readiness.canApplyPatch).toBe(false);
    expect(result.readiness.canRollback).toBe(false);
    expect(result.readiness.canExecuteGit).toBe(false);
    expect(result.readiness.canExecuteShell).toBe(false);
    expect(result.readiness.appCanExecute).toBe(false);
  });

  it("keeps deterministic hashes with injected id", () => {
    const first = buildScreenshotMetadataBoundary(safeMetadata);
    const second = buildScreenshotMetadataBoundary(safeMetadata);

    expect(first.boundaryId).toBe("screenshot-boundary-fixed");
    expect(second.boundaryId).toBe("screenshot-boundary-fixed");
    expect(first.boundaryHash).toBe(second.boundaryHash);
  });
});
