import { describe, expect, it } from "vitest";

import {
  parseDesktopActionExpansionProposal,
  summarizeDesktopActionExpansionProposal,
  validateDesktopActionExpansionProposal
} from "../src/desktop/index.js";

function baseProposal() {
  return {
    schemaVersion: "desktop_action_expansion_proposal.v1",
    proposalId: "expanded-desktop-action-safe-click",
    actionKind: "click_target",
    objectiveSummary: "Open the visible settings panel button.",
    observerEvidenceRef: {
      evidenceRefId: "desktop-evidence-1",
      observedAt: "2026-07-04T09:00:00.000Z",
      summary: "Foreground app metadata summary.",
      windowIdHash: "win_hash",
      appIdHash: "app_hash",
      displayIdHash: "display_hash",
      targetHash: "target_hash"
    },
    targetSummary: {
      targetId: "target-settings-button",
      targetKind: "button",
      labelSummary: "Settings",
      appNameSummary: "Demo App",
      windowTitleSummary: "Demo App Home",
      role: "button",
      confidence: 0.94,
      windowIdHash: "win_hash",
      appIdHash: "app_hash",
      displayIdHash: "display_hash",
      boundsHash: "bounds_hash",
      boundsSummary: "safe bounds summary"
    },
    expectedEffect: {
      summary: "The settings panel becomes visible.",
      visibleStateChangeSummary: "Settings panel is shown."
    },
    riskNotes: ["Low-risk navigation proposal only."],
    createdAt: "2026-07-04T09:01:00.000Z"
  };
}

function expectExecutionFlagsFalse(
  result: ReturnType<typeof validateDesktopActionExpansionProposal>
) {
  expect(result.readiness.canExecuteDesktopAction).toBe(false);
  expect(result.readiness.canClick).toBe(false);
  expect(result.readiness.canType).toBe(false);
  expect(result.readiness.canSelect).toBe(false);
  expect(result.readiness.canUseKeyboardShortcut).toBe(false);
  expect(result.readiness.canWriteClipboard).toBe(false);
  expect(result.readiness.canOpenFileDialog).toBe(false);
  expect(result.readiness.canDragDrop).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("desktop action expansion proposal schema", () => {
  it("parses a safe click proposal as proposal-only", () => {
    const result = validateDesktopActionExpansionProposal(baseProposal());

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.proposal?.actionKind).toBe("click_target");
    expect(result.summary.warningCodes).toContain(
      "EXPANDED_ACTION_PROPOSAL_ONLY"
    );
    expectExecutionFlagsFalse(result);
  });

  it("parses a safe type proposal as proposal-only", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      proposalId: "expanded-type",
      actionKind: "type_text",
      targetSummary: {
        ...baseProposal().targetSummary,
        targetId: "target-search",
        targetKind: "text_field",
        labelSummary: "Search field"
      },
      expectedEffect: {
        summary: "The search field would contain summarized user text."
      },
      riskNotes: ["Text entry proposal only."]
    });

    expect(result.status).toBe("warning");
    expect(result.proposal?.actionKind).toBe("type_text");
    expect(result.readiness.canEnterRiskClassification).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it("parses a safe select proposal", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      proposalId: "expanded-select",
      actionKind: "select_option",
      targetSummary: {
        ...baseProposal().targetSummary,
        targetId: "target-list-item",
        targetKind: "menu_item",
        labelSummary: "Sort by date"
      },
      expectedEffect: {
        summary: "The visible list sort order changes to date."
      },
      riskNotes: ["Selection proposal only."]
    });

    expect(result.status).toBe("warning");
    expect(result.proposal?.actionKind).toBe("select_option");
    expectExecutionFlagsFalse(result);
  });

  it("keeps file dialog proposals as proposal-only", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      proposalId: "expanded-file-dialog",
      actionKind: "file_dialog_select",
      targetSummary: {
        ...baseProposal().targetSummary,
        targetId: "target-file-dialog",
        targetKind: "file_dialog",
        labelSummary: "Choose project file",
        boundsSummary: "dialog button summary"
      },
      expectedEffect: {
        summary: "A future file picker would show a safe relative ref."
      },
      riskNotes: ["File dialog is proposal-only."]
    });

    expect(result.status).toBe("warning");
    expect(result.proposal?.actionKind).toBe("file_dialog_select");
    expectExecutionFlagsFalse(result);
  });

  it("parses JSON string input", () => {
    const result = parseDesktopActionExpansionProposal(
      JSON.stringify({
        ...baseProposal(),
        actionKind: "wait_for_state",
        proposalId: "expanded-wait"
      })
    );

    expect(result.status).toBe("parsed");
    expect(result.proposal?.proposalId).toBe("expanded-wait");
  });

  it("blocks raw screenshot fields", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      rawScreenshot: "RAW_SCREENSHOT"
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(result.summary.blockerCodes).toContain("RAW_MARKER");
    expect(result.proposal).toBeUndefined();
    expectExecutionFlagsFalse(result);
  });

  it("blocks raw OCR fields", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      observerEvidenceRef: {
        ...baseProposal().observerEvidenceRef,
        rawOcrText: "RAW_OCR"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(result.summary.blockerCodes).toContain("RAW_MARKER");
  });

  it("blocks clipboard content", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      actionKind: "clipboard_write",
      clipboardContent: "copy this raw value"
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("FORBIDDEN_FIELD");
  });

  it("blocks execution fields", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      clickNow: true,
      readiness: {
        canClick: true
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("EXECUTION_FLAG_TRUE");
    expectExecutionFlagsFalse(result);
  });

  it("blocks secret markers", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      riskNotes: ["fake key sk-test-should-block"]
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("SECRET_MARKER");
  });

  it("blocks stale evidence beyond threshold", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      createdAt: "2026-07-04T09:30:01.000Z",
      freshnessThresholdMs: 5 * 60 * 1000
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("STALE_EVIDENCE");
  });

  it("blocks unsafe absolute file dialog paths", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      actionKind: "file_dialog_select",
      targetSummary: {
        ...baseProposal().targetSummary,
        targetKind: "file_dialog",
        pathRef: "C:\\Users\\example\\.env"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("UNSAFE_FILE_DIALOG_PATH");
  });

  it("warns for low confidence and password-like labels", () => {
    const result = validateDesktopActionExpansionProposal({
      ...baseProposal(),
      actionKind: "wait_for_state",
      targetSummary: {
        ...baseProposal().targetSummary,
        confidence: 0.4,
        labelSummary: "Password"
      }
    });

    expect(result.status).toBe("warning");
    expect(result.summary.warningCodes).toContain("LOW_TARGET_CONFIDENCE");
    expect(result.summary.warningCodes).toContain(
      "PASSWORD_LIKE_TARGET_LABEL"
    );
  });

  it("keeps output summary-only", () => {
    const result = validateDesktopActionExpansionProposal(baseProposal());
    const summary = summarizeDesktopActionExpansionProposal(result.proposal!);
    const serialized = JSON.stringify(summary);

    expect(summary.summaryOnly).toBe(true);
    expect(serialized).not.toContain("rawScreenshot");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("rawOcrText");
    expect(serialized).not.toContain("clipboardContent");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("clickNow");
    expectExecutionFlagsFalse(result);
  });
});
