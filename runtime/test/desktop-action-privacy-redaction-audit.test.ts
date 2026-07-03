import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildDesktopActionPrivacyRedactionAudit,
  classifyDesktopActionRisk,
  simulateDesktopActionProposal,
  type DesktopActionPrivacyRedactionAudit,
  type DesktopActionProposal,
  validateDesktopActionProposal,
  validateDesktopActionTargets
} from "../src/desktop-action/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smokeRoot = path.join(
  __dirname,
  "fixtures",
  "desktop-action-smoke"
);

async function smokeFixture(): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(
      path.join(smokeRoot, "safe-desktop-action-proposal-smoke.json"),
      "utf8"
    )
  ) as Record<string, unknown>;
}

async function safeChain() {
  const fixture = await smokeFixture();
  const proposal = validateDesktopActionProposal(
    fixture.proposal as Record<string, unknown>
  ).proposal!;
  const targetValidation = validateDesktopActionTargets({
    proposal,
    observerSummary: {
      evidenceRefs: [
        {
          evidenceRefId: "desktop-action-smoke-evidence-1",
          observedAt: "2026-07-03T05:00:00.000Z"
        }
      ],
      windows: [
        {
          windowIdHash: "win_hash_smoke_editor",
          appIdHash: "app_hash_smoke_editor",
          displayIdHash: "display_hash_primary",
          boundsSummary: "x:100 y:100 w:1200 h:800",
          titleSummary: "Editor window summary"
        }
      ],
      displays: [
        {
          displayIdHash: "display_hash_primary",
          sizeSummary: "1920x1080",
          primary: true
        }
      ]
    },
    currentMetadataSummary: {
      observedAt: "2026-07-03T05:05:00.000Z",
      targets: [
        {
          targetId: "target-editor-window-smoke",
          windowIdHash: "win_hash_smoke_editor",
          appIdHash: "app_hash_smoke_editor",
          displayIdHash: "display_hash_primary",
          boundsSummary: "x:100 y:100 w:1200 h:800",
          labelSummary: "Editor window summary",
          confidence: 0.95,
          candidateCount: 1
        }
      ],
      displays: [
        {
          displayIdHash: "display_hash_primary",
          sizeSummary: "1920x1080",
          primary: true
        }
      ]
    },
    createdAt: "2026-07-03T05:05:00.000Z"
  });
  const riskClassification = classifyDesktopActionRisk({
    proposal,
    targetValidation
  });
  const simulation = simulateDesktopActionProposal({
    proposal,
    targetValidation,
    riskClassification
  });
  return {
    proposal,
    targetValidation,
    riskClassification,
    simulation,
    appSummary: fixture.appSummary as Record<string, unknown>
  };
}

function expectExecutionFlagsFalse(
  audit: DesktopActionPrivacyRedactionAudit
): void {
  expect(audit.readiness.canPersistRawScreenshot).toBe(false);
  expect(audit.readiness.canPersistRawOcrText).toBe(false);
  expect(audit.readiness.canPersistRawUiText).toBe(false);
  expect(audit.readiness.canUseClipboard).toBe(false);
  expect(audit.readiness.canWriteEventStore).toBe(false);
  expect(audit.readiness.canExecuteDesktopAction).toBe(false);
  expect(audit.readiness.canClick).toBe(false);
  expect(audit.readiness.canType).toBe(false);
  expect(audit.readiness.canOpenFileDialog).toBe(false);
  expect(audit.readiness.canUseNativeBridge).toBe(false);
  expect(audit.readiness.appCanExecute).toBe(false);
}

function expectSummaryOnly(audit: DesktopActionPrivacyRedactionAudit): void {
  const serialized = JSON.stringify(audit);
  expect(serialized).not.toContain("RAW_SCREENSHOT_BYTES");
  expect(serialized).not.toContain("RAW_OCR_VISIBLE_TEXT");
  expect(serialized).not.toContain("CLIPBOARD_CONTENT_VALUE");
  expect(serialized).not.toContain("sk-fake-desktop-action");
  expect(serialized).not.toContain("executeNow");
  expect(serialized).not.toContain("clickNow");
}

describe("desktop action privacy redaction audit", () => {
  it("audits a safe desktop action smoke proposal without execution", async () => {
    const chain = await safeChain();
    const audit = buildDesktopActionPrivacyRedactionAudit({
      ...chain,
      idGenerator: () => "desktop-action-privacy-audit-test"
    });

    expect(audit.status).toBe("audit_ready");
    expect(audit.auditId).toBe("desktop-action-privacy-audit-test");
    expect(audit.proposalId).toBe("desktop-action-proposal-smoke-safe");
    expect(audit.redactionSummary.summaryOnly).toBe(true);
    expect(audit.redactionSummary.rawScreenshotDetected).toBe(false);
    expect(audit.redactionSummary.rawOcrTextDetected).toBe(false);
    expect(audit.redactionSummary.clipboardContentDetected).toBe(false);
    expect(audit.redactionSummary.redactedFieldCount).toBeGreaterThanOrEqual(2);
    expect(audit.blockerCount).toBe(0);
    expect(audit.findingCount).toBe(0);
    expectExecutionFlagsFalse(audit);
    expectSummaryOnly(audit);
  });

  it("blocks raw screenshot and image bytes", async () => {
    const audit = buildDesktopActionPrivacyRedactionAudit({
      ...(await safeChain()),
      rawScreenshot: "RAW_SCREENSHOT_BYTES",
      screenshotBytes: "SCREENSHOT_BYTES"
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.rawScreenshotDetected).toBe(true);
    expect(audit.redactionSummary.imageBytesDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining(["RAW_SCREENSHOT_FIELD", "IMAGE_BYTES_FIELD"])
    );
    expectExecutionFlagsFalse(audit);
    expectSummaryOnly(audit);
  });

  it("blocks raw OCR text", async () => {
    const audit = buildDesktopActionPrivacyRedactionAudit({
      ...(await safeChain()),
      rawOcrText: "RAW_OCR_VISIBLE_TEXT"
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.rawOcrTextDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "RAW_OCR_FIELD"
    );
    expectSummaryOnly(audit);
  });

  it("blocks clipboard content", async () => {
    const audit = buildDesktopActionPrivacyRedactionAudit({
      ...(await safeChain()),
      appSummary: {
        clipboardContent: "CLIPBOARD_CONTENT_VALUE"
      }
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.clipboardContentDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "CLIPBOARD_CONTENT_FIELD"
    );
    expectSummaryOnly(audit);
  });

  it("blocks secret and API key markers", async () => {
    const audit = buildDesktopActionPrivacyRedactionAudit({
      ...(await safeChain()),
      appSummary: {
        marker: "sk-fake-desktop-action-secret-000000"
      }
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.secretMarkerDetected).toBe(true);
    expect(audit.redactionSummary.apiKeyDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "API_KEY_MARKER"
    );
    expectSummaryOnly(audit);
  });

  it("blocks raw UI target labels when policy forbids them", async () => {
    const chain = await safeChain();
    const proposal: DesktopActionProposal = {
      ...chain.proposal,
      operations: [
        {
          ...chain.proposal.operations[0]!,
          targetRef: {
            ...chain.proposal.operations[0]!.targetRef,
            labelSummary: "Primary submit button"
          }
        }
      ]
    };
    const audit = buildDesktopActionPrivacyRedactionAudit({
      ...chain,
      proposal,
      policy: { forbidRawTargetLabels: true }
    });

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.rawTargetLabelDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "RAW_TARGET_LABEL_FORBIDDEN"
    );
    expect(JSON.stringify(audit)).not.toContain("Primary submit button");
    expectExecutionFlagsFalse(audit);
  });

  it("blocks execution readiness attempts", async () => {
    const audit = buildDesktopActionPrivacyRedactionAudit({
      ...(await safeChain()),
      executeNow: true,
      canExecuteDesktopAction: true
    } as never);

    expect(audit.status).toBe("blocked");
    expect(audit.redactionSummary.executeFlagDetected).toBe(true);
    expect(audit.findings.map((item) => item.code)).toContain(
      "EXECUTION_FLAG_TRUE"
    );
    expectExecutionFlagsFalse(audit);
    expectSummaryOnly(audit);
  });
});
