import { describe, expect, it } from "vitest";

import {
  buildApprovedDesktopActionPrivacyAudit,
  summarizeApprovedDesktopActionPrivacyAudit
} from "../src/desktop-action/index.js";

describe("approved desktop action privacy audit", () => {
  it("accepts summary-only artifacts", () => {
    const audit = buildApprovedDesktopActionPrivacyAudit({
      artifact: {
        actionId: "approved-desktop-action-test",
        status: "unsupported",
        warningCodes: ["UNSUPPORTED_PLATFORM"],
        rawScreenshotIncluded: false,
        rawOcrTextIncluded: false,
        rawWindowContentIncluded: false,
        clipboardContentIncluded: false,
        summaryOnly: true
      },
      idGenerator: () => "approved-desktop-action-privacy-test"
    });

    expect(audit.status).toBe("audit_ready");
    expect(audit.auditId).toBe("approved-desktop-action-privacy-test");
    expect(audit.blockerCount).toBe(0);
    expect(audit.rawScreenshotDetected).toBe(false);
    expect(audit.rawOcrDetected).toBe(false);
    expect(audit.clipboardDetected).toBe(false);
    expect(audit.rawWindowContentDetected).toBe(false);
    expect(audit.apiKeyDetected).toBe(false);
    expect(audit.readiness.canPersistRawScreenshot).toBe(false);
    expect(audit.readiness.canPersistOcrText).toBe(false);
    expect(audit.readiness.canUseClipboard).toBe(false);
    expect(audit.readiness.canWriteEventStore).toBe(false);
    expect(audit.readiness.canReplayDesktopAction).toBe(false);
    expect(audit.readiness.canExecuteDesktopAction).toBe(false);
    expect(audit.readiness.appCanExecute).toBe(false);
    expect(summarizeApprovedDesktopActionPrivacyAudit(audit)).toContain(
      "summary_only:true"
    );
  });

  it("blocks raw screenshot, OCR, clipboard, window content, API key, prompt, source, and diff fields", () => {
    const audit = buildApprovedDesktopActionPrivacyAudit({
      artifact: {
        rawScreenshot: "RAW_SCREENSHOT",
        ocrText: "RAW_OCR",
        clipboardContent: "CLIPBOARD_CONTENT",
        rawWindowContent: "RAW_WINDOW_CONTENT",
        apiKey: "sk-fake-approved-desktop-action-key",
        rawPrompt: "RAW_PROMPT",
        rawSource: "RAW_SOURCE",
        rawDiff: "RAW_DIFF"
      }
    });

    expect(audit.status).toBe("blocked");
    expect(audit.rawScreenshotDetected).toBe(true);
    expect(audit.rawOcrDetected).toBe(true);
    expect(audit.clipboardDetected).toBe(true);
    expect(audit.rawWindowContentDetected).toBe(true);
    expect(audit.apiKeyDetected).toBe(true);
    expect(audit.rawPromptSourceDiffDetected).toBe(true);
    expect(audit.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "APPROVED_DESKTOP_ACTION_RAW_SCREENSHOT_FIELD",
        "APPROVED_DESKTOP_ACTION_OCR_TEXT_FIELD",
        "APPROVED_DESKTOP_ACTION_CLIPBOARD_FIELD",
        "APPROVED_DESKTOP_ACTION_RAW_WINDOW_CONTENT_FIELD",
        "APPROVED_DESKTOP_ACTION_API_KEY_FIELD",
        "APPROVED_DESKTOP_ACTION_RAW_PROMPT_FIELD",
        "APPROVED_DESKTOP_ACTION_RAW_SOURCE_FIELD",
        "APPROVED_DESKTOP_ACTION_RAW_DIFF_FIELD"
      ])
    );
    expect(JSON.stringify(audit)).not.toContain(
      "sk-fake-approved-desktop-action-key"
    );
  });

  it("blocks execution readiness attempts", () => {
    const audit = buildApprovedDesktopActionPrivacyAudit({
      artifact: {
        canReplayDesktopAction: true,
        canExecuteDesktopAction: true
      }
    });

    expect(audit.status).toBe("blocked");
    expect(audit.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "APPROVED_DESKTOP_ACTION_EXECUTION_FIELD_TRUE"
      ])
    );
  });
});
