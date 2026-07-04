import { describe, expect, it } from "vitest";

import {
  parseFileDialogActionProposal,
  summarizeFileDialogActionProposal,
  validateFileDialogActionProposal
} from "../src/desktop/index.js";

function baseProposal() {
  return {
    schemaVersion: "file_dialog_action_proposal.v1",
    proposalId: "file-dialog-open-safe",
    proposalKind: "file_dialog_open",
    objectiveSummary: "Choose a summarized project markdown file.",
    dialogIntent: "Open a project document from a safe relative path ref.",
    allowedExtensions: [".md", ".txt"],
    pathRefSummary: {
      refId: "path-ref-doc",
      summary: "Project docs file ref.",
      safeRelativePathRef: "docs/overview.md",
      hashPrefix: "abc123"
    },
    expectedFileCount: 1,
    riskSummary: "Low risk because only a proposal ref is produced.",
    riskNotes: ["No file dialog automation is executed."],
    createdAt: "2026-07-04T10:00:00.000Z"
  };
}

function expectExecutionFlagsFalse(
  result: ReturnType<typeof validateFileDialogActionProposal>
) {
  expect(result.readiness.canOpenFileDialog).toBe(false);
  expect(result.readiness.canSelectFile).toBe(false);
  expect(result.readiness.canSaveFile).toBe(false);
  expect(result.readiness.canSelectDirectory).toBe(false);
  expect(result.readiness.canWriteFilesystem).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canUseNativeBridge).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("file dialog action proposal schema", () => {
  it("parses a safe open proposal as proposal-only", () => {
    const result = validateFileDialogActionProposal(baseProposal());

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.proposal?.proposalKind).toBe("file_dialog_open");
    expect(result.summary.pathRefId).toBe("path-ref-doc");
    expect(result.summary.warningCodes).toContain("FILE_DIALOG_PROPOSAL_ONLY");
    expectExecutionFlagsFalse(result);
  });

  it("parses a safe save proposal with summary-only path ref", () => {
    const result = validateFileDialogActionProposal({
      ...baseProposal(),
      proposalId: "file-dialog-save-safe",
      proposalKind: "file_dialog_save",
      dialogIntent: "Save a future export through a safe relative path ref.",
      pathRefSummary: {
        refId: "path-ref-export",
        summary: "Export path ref.",
        safeRelativePathRef: "exports/report.csv"
      },
      allowedExtensions: [".csv"]
    });

    expect(result.status).toBe("warning");
    expect(result.blockerCount).toBe(0);
    expect(result.proposal?.proposalKind).toBe("file_dialog_save");
    expect(result.summary.pathRefId).toBe("path-ref-export");
    expect(JSON.stringify(result.summary)).not.toContain("exports/report.csv");
    expectExecutionFlagsFalse(result);
  });

  it("parses JSON string input", () => {
    const result = parseFileDialogActionProposal(
      JSON.stringify({
        ...baseProposal(),
        proposalId: "file-dialog-cancel-safe",
        proposalKind: "file_dialog_cancel"
      })
    );

    expect(result.status).toBe("warning");
    expect(result.proposal?.proposalKind).toBe("file_dialog_cancel");
  });

  it("blocks absolute paths", () => {
    const result = validateFileDialogActionProposal({
      ...baseProposal(),
      pathRefSummary: {
        refId: "absolute-path",
        summary: "Unsafe absolute path.",
        safeRelativePathRef: "C:\\Users\\demo\\file.txt"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("UNSAFE_FILE_DIALOG_PATH");
    expect(result.proposal).toBeUndefined();
    expectExecutionFlagsFalse(result);
  });

  it("blocks traversal paths", () => {
    const result = validateFileDialogActionProposal({
      ...baseProposal(),
      pathRefSummary: {
        refId: "traversal-path",
        summary: "Unsafe traversal path.",
        safeRelativePathRef: "../secrets.txt"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("UNSAFE_FILE_DIALOG_PATH");
  });

  it("blocks secret-like paths and secret markers", () => {
    const result = validateFileDialogActionProposal({
      ...baseProposal(),
      pathRefSummary: {
        refId: "secret-path",
        summary: "Unsafe fake key path.",
        safeRelativePathRef: "docs/sk-test-fake-key.txt"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("SECRET_MARKER");
    expect(result.summary.blockerCodes).toContain("UNSAFE_FILE_DIALOG_PATH");
  });

  it("blocks generated and dependency directories", () => {
    const result = validateFileDialogActionProposal({
      ...baseProposal(),
      pathRefSummary: {
        refId: "node-modules-path",
        summary: "Unsafe dependency dir path.",
        safeRelativePathRef: "node_modules/pkg/index.js"
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("UNSAFE_FILE_DIALOG_PATH");
  });

  it("blocks raw path and execution fields", () => {
    const result = validateFileDialogActionProposal({
      ...baseProposal(),
      rawPath: "RAW_PATH",
      autoSelect: true,
      readiness: {
        canOpenFileDialog: true
      }
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(result.summary.blockerCodes).toContain("RAW_PATH_MARKER");
    expect(result.summary.blockerCodes).toContain("EXECUTION_FLAG_TRUE");
    expectExecutionFlagsFalse(result);
  });

  it("keeps directory selection proposal-only", () => {
    const result = validateFileDialogActionProposal({
      ...baseProposal(),
      proposalId: "file-dialog-directory-safe",
      proposalKind: "file_dialog_select_directory",
      directoryRefSummary: {
        refId: "dir-ref-docs",
        summary: "Docs directory ref.",
        safeRelativePathRef: "docs"
      }
    });

    expect(result.status).toBe("warning");
    expect(result.proposal?.proposalKind).toBe("file_dialog_select_directory");
    expect(result.summary.directoryRefId).toBe("dir-ref-docs");
    expectExecutionFlagsFalse(result);
  });

  it("returns summary-only output", () => {
    const result = validateFileDialogActionProposal(baseProposal());
    const summary = summarizeFileDialogActionProposal(result.proposal!);
    const serializedResult = JSON.stringify(result);
    const serializedSummary = JSON.stringify(summary);

    expect(summary.summaryOnly).toBe(true);
    expect(serializedSummary).not.toContain("RAW_PATH");
    expect(serializedSummary).not.toContain("C:\\");
    expect(serializedResult).not.toContain("apiKey");
    expectExecutionFlagsFalse(result);
  });
});
