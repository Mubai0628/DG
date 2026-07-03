import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseDesktopActionProposal,
  summarizeDesktopActionProposal,
  validateDesktopActionProposal
} from "../src/desktop-action/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(
  __dirname,
  "fixtures",
  "desktop-action-proposals"
);

async function fixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(path.join(fixtureRoot, name), "utf8")
  ) as Record<string, unknown>;
}

function expectExecutionFlagsFalse(
  result: ReturnType<typeof validateDesktopActionProposal>
) {
  expect(result.readiness.canExecuteDesktopAction).toBe(false);
  expect(result.readiness.canClick).toBe(false);
  expect(result.readiness.canType).toBe(false);
  expect(result.readiness.canUseClipboard).toBe(false);
  expect(result.readiness.canOpenFileDialog).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("desktop action proposal schema", () => {
  it("parses a safe focus proposal", async () => {
    const result = validateDesktopActionProposal(
      await fixture("safe-focus-window.json")
    );

    expect(result.status).toBe("parsed");
    expect(result.blockerCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.proposal?.proposalId).toBe(
      "desktop-action-proposal-safe-focus"
    );
    expect(result.summary.actionKinds).toEqual(["focus_window"]);
    expect(result.readiness.canEnterRiskClassification).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it("parses JSON string input", async () => {
    const input = JSON.stringify(await fixture("safe-focus-window.json"));
    const result = parseDesktopActionProposal(input);

    expect(result.status).toBe("parsed");
    expect(result.proposal?.operations).toHaveLength(1);
  });

  it("generates deterministic proposal and operation ids", async () => {
    const input = await fixture("safe-focus-window.json");
    delete input.proposalId;
    const operations = input.operations as Record<string, unknown>[];
    delete operations[0]!.operationId;
    const ids = ["proposal-fixed", "operation-fixed"];

    const result = validateDesktopActionProposal({
      ...input,
      idGenerator: () => ids.shift() || "fallback-id"
    });

    expect(result.status).toBe("parsed");
    expect(result.proposal?.proposalId).toBe("operation-fixed");
    expect(result.proposal?.operations[0]?.operationId).toBe("proposal-fixed");
    expect(result.proposalHash).toBe(result.proposal?.proposalHash);
  });

  it("blocks raw screenshot fields", async () => {
    const result = validateDesktopActionProposal(
      await fixture("blocked-raw-screenshot.json")
    );

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(result.summary.blockerCodes).toContain("RAW_MARKER");
    expect(result.proposal).toBeUndefined();
    expectExecutionFlagsFalse(result);
  });

  it("blocks secret markers", async () => {
    const result = validateDesktopActionProposal(
      await fixture("blocked-secret-target.json")
    );

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("SECRET_MARKER");
    expect(result.proposal).toBeUndefined();
  });

  it("blocks executeNow clickNow and typeNow fields", async () => {
    const executeNow = validateDesktopActionProposal(
      await fixture("blocked-execute-now.json")
    );
    const clickNow = validateDesktopActionProposal({
      ...(await fixture("safe-focus-window.json")),
      clickNow: true
    });
    const typeNow = validateDesktopActionProposal({
      ...(await fixture("safe-focus-window.json")),
      operations: [
        {
          actionKind: "type_text",
          typeNow: true,
          targetRef: {
            targetId: "target-field",
            observerEvidenceRefId: "desktop-evidence-editor-1"
          },
          summary: "Unsafe type now.",
          expectedVisibleStateChange: "No execution."
        }
      ]
    });

    expect(executeNow.status).toBe("blocked");
    expect(clickNow.status).toBe("blocked");
    expect(typeNow.status).toBe("blocked");
    expect(executeNow.summary.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(clickNow.summary.blockerCodes).toContain("EXECUTION_FLAG_TRUE");
    expect(typeNow.summary.blockerCodes).toContain("EXECUTION_FLAG_TRUE");
  });

  it("blocks missing evidence refs", async () => {
    const input = await fixture("safe-focus-window.json");
    delete input.observerEvidenceRefs;

    const result = validateDesktopActionProposal(input);

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain(
      "MISSING_OBSERVER_EVIDENCE_REFS"
    );
    expect(result.summary.blockerCodes).toContain("UNKNOWN_TARGET_EVIDENCE");
  });

  it("warns and blocks sensitive target text input", async () => {
    const result = validateDesktopActionProposal({
      ...(await fixture("safe-focus-window.json")),
      operations: [
        {
          actionKind: "type_text",
          targetRef: {
            targetId: "target-password",
            sensitiveKind: "password",
            observerEvidenceRefId: "desktop-evidence-editor-1"
          },
          summary: "Type text into a sensitive field.",
          inputTextSummary: "Short text summary.",
          expectedVisibleStateChange: "Field would change in a future phase."
        }
      ],
      riskNotes: ["Sensitive target fixture."]
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.warningCodes).toContain("SENSITIVE_TARGET");
    expect(result.summary.blockerCodes).toContain(
      "SENSITIVE_TEXT_INPUT_BLOCKED"
    );
  });

  it("warns for text input actions", async () => {
    const result = validateDesktopActionProposal({
      ...(await fixture("safe-focus-window.json")),
      operations: [
        {
          actionKind: "type_text",
          targetRef: {
            targetId: "target-search",
            role: "textbox",
            observerEvidenceRefId: "desktop-evidence-editor-1"
          },
          summary: "Type summarized search text.",
          inputTextSummary: "Search query summary.",
          expectedVisibleStateChange:
            "Search field would contain summarized text."
        }
      ],
      riskNotes: ["Text input requires review."]
    });

    expect(result.status).toBe("warning");
    expect(result.summary.warningCodes).toContain("TEXT_INPUT_ACTION");
    expect(result.summary.warningCodes).toContain("HIGH_RISK_ACTION_KIND");
    expectExecutionFlagsFalse(result);
  });

  it("warns for file dialog proposals and blocks unsafe absolute paths", async () => {
    const warning = validateDesktopActionProposal({
      ...(await fixture("safe-focus-window.json")),
      operations: [
        {
          actionKind: "open_file_dialog",
          targetRef: {
            targetId: "target-dialog-button",
            observerEvidenceRefId: "desktop-evidence-editor-1"
          },
          summary: "Open a future file dialog.",
          expectedVisibleStateChange:
            "A file dialog would open in a future phase.",
          fileDialogPolicy: { allowedPathRef: "workspace-docs" }
        }
      ],
      riskNotes: ["File dialog requires review."]
    });
    const blocked = validateDesktopActionProposal({
      ...(await fixture("safe-focus-window.json")),
      operations: [
        {
          actionKind: "choose_file",
          targetRef: {
            targetId: "target-dialog",
            observerEvidenceRefId: "desktop-evidence-editor-1"
          },
          summary: "Choose a file from an unsafe path.",
          expectedVisibleStateChange: "No execution.",
          fileDialogPolicy: { path: "C:\\Users\\example\\secret.txt" }
        }
      ],
      riskNotes: ["Unsafe file dialog fixture."]
    });

    expect(warning.status).toBe("warning");
    expect(warning.summary.warningCodes).toContain("FILE_DIALOG_ACTION");
    expect(blocked.status).toBe("blocked");
    expect(blocked.summary.blockerCodes).toContain("UNSAFE_FILE_DIALOG_PATH");
  });

  it("keeps output summary-only", async () => {
    const result = validateDesktopActionProposal(
      await fixture("warning-click-target.json")
    );
    const summary = summarizeDesktopActionProposal(result.proposal!);
    const serialized = JSON.stringify(summary);

    expect(result.status).toBe("warning");
    expect(summary.summaryOnly).toBe(true);
    expect(serialized).not.toContain("rawScreenshot");
    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("executeNow");
    expectExecutionFlagsFalse(result);
  });
});
