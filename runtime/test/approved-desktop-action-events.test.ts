import { describe, expect, it } from "vitest";

import {
  buildApprovedDesktopActionEvent,
  projectApprovedDesktopActionReplay,
  summarizeApprovedDesktopActionEvent,
  summarizeApprovedDesktopActionReplay
} from "../src/desktop-action/index.js";

const safeInput = {
  status: "unsupported",
  actionId: "approved-desktop-action-test",
  receiptId: "approved-desktop-action-receipt-test",
  desktopActionProposalId: "desktop-action-proposal-test",
  actionKind: "focus_observed_window",
  targetWindowRef: "target-editor-window",
  targetAppRef: "target-editor-app",
  targetDisplayRef: "display-primary",
  observerEvidenceId: "desktop-observer-evidence-test",
  riskClassificationId: "desktop-action-risk-test",
  warningCodes: ["UNSUPPORTED_PLATFORM"],
  actionHash: "action-hash-test",
  receiptHash: "receipt-hash-test",
  resultHash: "result-hash-test",
  occurredAt: "2026-01-01T00:00:00.000Z",
  idGenerator: () => "approved-desktop-action-event-test"
} as const;

describe("approved desktop action summary events", () => {
  it("builds a summary-only event payload", () => {
    const result = buildApprovedDesktopActionEvent(safeInput);

    expect(result.status).toBe("event_ready");
    expect(result.event).toMatchObject({
      eventId: "approved-desktop-action-event-test",
      eventType: "desktop.action.unsupported",
      status: "unsupported",
      actionKind: "focus_observed_window",
      targetWindowRef: "target-editor-window",
      rawScreenshotIncluded: false,
      rawOcrTextIncluded: false,
      rawWindowContentIncluded: false,
      clipboardContentIncluded: false,
      rawPromptSourceDiffIncluded: false,
      apiKeyIncluded: false,
      summaryOnly: true,
      notWritten: true,
      canReplayDesktopAction: false,
      canExecuteDesktopAction: false,
      canWriteEventStore: false
    });
    expect(result.readiness.canEnterReplayProjection).toBe(true);
    expect(result.readiness.canWriteEventStore).toBe(false);
    expect(result.readiness.canReplayDesktopAction).toBe(false);
    expect(result.readiness.canExecuteDesktopAction).toBe(false);
    expect(summarizeApprovedDesktopActionEvent(result.event!)).toContain(
      "summary_only:true"
    );
    expect(JSON.stringify(result)).not.toContain("RAW_SCREENSHOT_BYTES");
    expect(JSON.stringify(result)).not.toContain("sk-fake");
  });

  it("blocks raw screenshot, OCR, clipboard, and API key fields", () => {
    const rawScreenshot = buildApprovedDesktopActionEvent({
      ...safeInput,
      sourceSummary: { rawScreenshot: "RAW_SCREENSHOT" }
    });
    const rawOcr = buildApprovedDesktopActionEvent({
      ...safeInput,
      sourceSummary: { ocrText: "RAW_OCR" }
    });
    const clipboard = buildApprovedDesktopActionEvent({
      ...safeInput,
      sourceSummary: { clipboardContent: "CLIPBOARD_CONTENT" }
    });
    const apiKey = buildApprovedDesktopActionEvent({
      ...safeInput,
      sourceSummary: { note: "sk-fake-approved-desktop-action-key" }
    });

    expect(rawScreenshot.status).toBe("blocked");
    expect(rawScreenshot.privacyAudit.rawScreenshotDetected).toBe(true);
    expect(rawOcr.status).toBe("blocked");
    expect(rawOcr.privacyAudit.rawOcrDetected).toBe(true);
    expect(clipboard.status).toBe("blocked");
    expect(clipboard.privacyAudit.clipboardDetected).toBe(true);
    expect(apiKey.status).toBe("blocked");
    expect(apiKey.privacyAudit.apiKeyDetected).toBe(true);
  });

  it("projects replay summaries without re-execution", () => {
    const event = buildApprovedDesktopActionEvent(safeInput).event!;
    const replay = projectApprovedDesktopActionReplay([event]);

    expect(replay.status).toBe("projected");
    expect(replay.eventCount).toBe(1);
    expect(replay.unsupportedCount).toBe(1);
    expect(replay.timeline[0]).toMatchObject({
      eventId: "approved-desktop-action-event-test",
      eventType: "desktop.action.unsupported",
      status: "unsupported",
      actionKind: "focus_observed_window",
      targetWindowRef: "target-editor-window"
    });
    expect(replay.readiness.canDisplayReplay).toBe(true);
    expect(replay.readiness.canReplayDesktopAction).toBe(false);
    expect(replay.readiness.canExecuteDesktopAction).toBe(false);
    expect(replay.readiness.canWriteEventStore).toBe(false);
    expect(replay.readiness.canUseNativeBridge).toBe(false);
    expect(replay.readiness.appCanExecute).toBe(false);
    expect(summarizeApprovedDesktopActionReplay(replay)).toContain(
      "desktop_replay:false"
    );
  });
});
