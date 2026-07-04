import { describe, expect, it } from "vitest";

import {
  summarizeClipboardActionProposal,
  validateClipboardActionProposal
} from "../src/desktop/index.js";

function safeWriteProposal() {
  return {
    schemaVersion: "clipboard_action_proposal.v1",
    proposalId: "clipboard-write-summary",
    proposalKind: "clipboard_write",
    objectiveSummary: "Prepare a future clipboard write for a safe note.",
    contentSummary: {
      lengthEstimate: 42,
      hashPrefix: "aabbccdd",
      contentCategory: "plain_text",
      redactionStatus: "summary_only",
      userVisibleSummary: "Short note text summary."
    },
    targetSummary: "Future paste target summary.",
    riskNotes: ["Clipboard write remains proposal-only."],
    createdAt: "2026-07-04T10:00:00.000Z"
  };
}

function expectReadinessFalse(
  result: ReturnType<typeof validateClipboardActionProposal>
) {
  expect(result.readiness.canWriteClipboard).toBe(false);
  expect(result.readiness.canPasteClipboard).toBe(false);
  expect(result.readiness.canClearClipboard).toBe(false);
  expect(result.readiness.canReadClipboard).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("clipboard action proposal schema", () => {
  it("accepts safe clipboard write proposal with length and hash summary", () => {
    const result = validateClipboardActionProposal(safeWriteProposal());

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.proposal?.proposalKind).toBe("clipboard_write");
    expect(result.summary.lengthEstimate).toBe(42);
    expect(result.summary.hashPrefix).toBe("aabbccdd");
    expect(result.summary.warningCodes).toContain(
      "CLIPBOARD_WRITE_PROPOSAL_ONLY"
    );
    expectReadinessFalse(result);
  });

  it("blocks raw clipboard text", () => {
    const result = validateClipboardActionProposal({
      ...safeWriteProposal(),
      rawClipboardText: "RAW_CLIPBOARD"
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(result.summary.blockerCodes).toContain("RAW_CLIPBOARD_MARKER");
    expect(result.proposal).toBeUndefined();
  });

  it("blocks API key markers", () => {
    const result = validateClipboardActionProposal({
      ...safeWriteProposal(),
      riskNotes: ["fake marker sk-test-should-block"]
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("SECRET_MARKER");
  });

  it("blocks password markers", () => {
    const result = validateClipboardActionProposal({
      ...safeWriteProposal(),
      contentSummary: {
        ...safeWriteProposal().contentSummary,
        userVisibleSummary: "PASSWORD_VALUE_MARKER"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("SECRET_MARKER");
  });

  it("blocks pasteNow and writeNow execution flags", () => {
    const paste = validateClipboardActionProposal({
      ...safeWriteProposal(),
      pasteNow: true
    });
    const write = validateClipboardActionProposal({
      ...safeWriteProposal(),
      writeNow: true
    });

    expect(paste.status).toBe("blocked");
    expect(write.status).toBe("blocked");
    expect(paste.summary.blockerCodes).toContain("EXECUTION_FLAG_TRUE");
    expect(write.summary.blockerCodes).toContain("EXECUTION_FLAG_TRUE");
    expectReadinessFalse(paste);
    expectReadinessFalse(write);
  });

  it("accepts clipboard clear as proposal-only without content value", () => {
    const result = validateClipboardActionProposal({
      schemaVersion: "clipboard_action_proposal.v1",
      proposalId: "clipboard-clear-summary",
      proposalKind: "clipboard_clear",
      objectiveSummary: "Request a future clipboard clear.",
      riskNotes: ["Clipboard clear remains proposal-only."],
      createdAt: "2026-07-04T10:00:00.000Z"
    });

    expect(result.status).toBe("warning");
    expect(result.proposal?.proposalKind).toBe("clipboard_clear");
    expect(result.summary.warningCodes).toContain(
      "CLIPBOARD_CLEAR_PROPOSAL_ONLY"
    );
    expectReadinessFalse(result);
  });

  it("keeps output summary-only", () => {
    const result = validateClipboardActionProposal(safeWriteProposal());
    const summary = summarizeClipboardActionProposal(result.proposal!);
    const serialized = JSON.stringify(summary);

    expect(summary.summaryOnly).toBe(true);
    expect(serialized).not.toContain("rawClipboardText");
    expect(serialized).not.toContain("RAW_CLIPBOARD");
    expect(serialized).not.toContain("clipboardContent");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("writeNow");
    expectReadinessFalse(result);
  });
});
