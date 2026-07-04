import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildDesktopActionExpansionRedactionAudit,
  summarizeDesktopActionExpansionRedactionAudit,
  type DesktopActionExpansionRedactionAudit
} from "../src/desktop/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(
  __dirname,
  "fixtures",
  "desktop-action-expansion"
);

async function smokeFixture() {
  return JSON.parse(
    await readFile(
      path.join(fixtureRoot, "desktop-action-expansion-smoke.json"),
      "utf8"
    )
  ) as Record<string, unknown>;
}

function expectExecutionFlagsFalse(
  audit: DesktopActionExpansionRedactionAudit
): void {
  expect(audit.readiness.canPersistRawScreenshot).toBe(false);
  expect(audit.readiness.canPersistScreenshotBytes).toBe(false);
  expect(audit.readiness.canPersistRawOcr).toBe(false);
  expect(audit.readiness.canPersistRawTargetText).toBe(false);
  expect(audit.readiness.canUseClipboard).toBe(false);
  expect(audit.readiness.canOpenFileDialog).toBe(false);
  expect(audit.readiness.canWriteEventStore).toBe(false);
  expect(audit.readiness.canExecuteDesktopAction).toBe(false);
  expect(audit.readiness.canClick).toBe(false);
  expect(audit.readiness.canType).toBe(false);
  expect(audit.readiness.canSelect).toBe(false);
  expect(audit.readiness.canDragDrop).toBe(false);
  expect(audit.readiness.canUseNativeBridge).toBe(false);
  expect(audit.readiness.appCanExecute).toBe(false);
}

function expectSummaryOnly(audit: DesktopActionExpansionRedactionAudit): void {
  const serialized = JSON.stringify(audit);
  expect(serialized).not.toContain("RAW_SCREENSHOT_BYTES_VALUE");
  expect(serialized).not.toContain("RAW_OCR_VISIBLE_TEXT");
  expect(serialized).not.toContain("CLIPBOARD_CONTENT_VALUE");
  expect(serialized).not.toContain("C:\\Users\\demo\\secret.txt");
  expect(serialized).not.toContain("sk-fake-expanded-action-secret");
  expect(serialized).not.toContain("execute-now-value");
}

describe("desktop action expansion redaction audit", () => {
  it("audits safe summary records as ready", async () => {
    const audit = buildDesktopActionExpansionRedactionAudit({
      ...(await smokeFixture()),
      idGenerator: () => "desktop-action-expansion-redaction-audit-test"
    });

    expect(audit.status).toBe("audit_ready");
    expect(audit.auditId).toBe("desktop-action-expansion-redaction-audit-test");
    expect(audit.recordCount).toBe(5);
    expect(audit.warningRecordCount).toBeGreaterThan(0);
    expect(audit.blockerCount).toBe(0);
    expect(audit.redactionSummary.summaryOnly).toBe(true);
    expect(audit.redactionSummary.rawFieldDetectedCount).toBe(0);
    expect(audit.privacyRiskSummary.rawLeakDetected).toBe(false);
    expect(audit.privacyRiskSummary.executionBoundaryViolated).toBe(false);
    expectExecutionFlagsFalse(audit);
    expectSummaryOnly(audit);
  });

  it("blocks raw screenshot fields and screenshot bytes", async () => {
    const audit = buildDesktopActionExpansionRedactionAudit({
      ...(await smokeFixture()),
      appSurfaceSummaries: [
        {
          rawScreenshot: "RAW_SCREENSHOT_BYTES_VALUE",
          screenshotBytes: "SCREENSHOT_BYTES"
        }
      ]
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.rawScreenshotDetected).toBe(true);
    expect(audit.redactionSummary.screenshotBytesDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "RAW_SCREENSHOT_FIELD",
        "SCREENSHOT_BYTES_FIELD"
      ])
    );
    expectSummaryOnly(audit);
  });

  it("blocks raw OCR text", async () => {
    const audit = buildDesktopActionExpansionRedactionAudit({
      ...(await smokeFixture()),
      records: [{ rawOcrText: "RAW_OCR_VISIBLE_TEXT" }]
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.rawOcrDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "RAW_OCR_FIELD"
    );
    expectSummaryOnly(audit);
  });

  it("blocks clipboard content", async () => {
    const audit = buildDesktopActionExpansionRedactionAudit({
      ...(await smokeFixture()),
      appSurfaceSummaries: [{ clipboardContent: "CLIPBOARD_CONTENT_VALUE" }]
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.clipboardContentDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "CLIPBOARD_CONTENT_FIELD"
    );
    expectSummaryOnly(audit);
  });

  it("blocks file dialog raw paths", async () => {
    const audit = buildDesktopActionExpansionRedactionAudit({
      ...(await smokeFixture()),
      actionProposals: [
        {
          status: "warning",
          actionKind: "file_dialog_select",
          fileDialogPath: "C:\\Users\\demo\\secret.txt"
        }
      ]
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.fileDialogRawPathDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "FILE_DIALOG_RAW_PATH_FIELD"
    );
    expectSummaryOnly(audit);
  });

  it("blocks execution fields", async () => {
    const audit = buildDesktopActionExpansionRedactionAudit({
      ...(await smokeFixture()),
      records: [
        {
          executeNow: true,
          marker: "execute-now-value"
        }
      ]
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.executionFieldDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "EXECUTION_FLAG_TRUE"
    );
    expectExecutionFlagsFalse(audit);
    expectSummaryOnly(audit);
  });

  it("blocks API key and secret markers", async () => {
    const audit = buildDesktopActionExpansionRedactionAudit({
      ...(await smokeFixture()),
      riskClassifierSummaries: [
        {
          marker: "sk-fake-expanded-action-secret-000000"
        }
      ]
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.apiKeyDetected).toBe(true);
    expect(audit.redactionSummary.secretDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "API_KEY_MARKER"
    );
    expectSummaryOnly(audit);
  });

  it("blocks native bridge markers", async () => {
    const audit = buildDesktopActionExpansionRedactionAudit({
      ...(await smokeFixture()),
      records: [
        {
          nativeBridgeCommand: "desktop-native-command"
        }
      ]
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.nativeBridgeDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "NATIVE_BRIDGE_FIELD"
    );
    expectExecutionFlagsFalse(audit);
  });

  it("summarizes output without raw content", async () => {
    const audit = buildDesktopActionExpansionRedactionAudit(
      await smokeFixture()
    );
    const summary = summarizeDesktopActionExpansionRedactionAudit(audit);

    expect(summary.summaryOnly).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("RAW_SCREENSHOT");
    expect(JSON.stringify(summary)).not.toContain("CLIPBOARD_CONTENT");
    expect(JSON.stringify(summary)).not.toContain("sk-fake");
    expectExecutionFlagsFalse(audit);
  });
});
