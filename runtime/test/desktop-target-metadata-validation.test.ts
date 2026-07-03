import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type DesktopCurrentMetadataSummary,
  type DesktopTargetObserverSummary,
  validateDesktopActionProposal,
  validateDesktopActionTargets
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

function observerSummary(): DesktopTargetObserverSummary {
  return {
    observationId: "desktop-observation-1",
    observedAt: "2026-07-03T05:00:00.000Z",
    status: "observed",
    evidenceRefs: [
      {
        evidenceRefId: "desktop-evidence-editor-1",
        observationId: "desktop-observation-1",
        observedAt: "2026-07-03T05:00:00.000Z"
      }
    ],
    windows: [
      {
        windowIdHash: "win_hash_editor",
        appIdHash: "app_hash_editor",
        displayIdHash: "display_hash_primary",
        boundsSummary: "x:100 y:100 w:1200 h:800",
        titleSummary: "Editor window summary",
        targetIds: ["target-editor-window"]
      }
    ],
    apps: [
      {
        appIdHash: "app_hash_editor",
        appNameSummary: "Editor app summary",
        windowCount: 1
      }
    ],
    displays: [
      {
        displayIdHash: "display_hash_primary",
        sizeSummary: "1920x1080",
        primary: true
      }
    ]
  };
}

function currentMetadata(): DesktopCurrentMetadataSummary {
  return {
    observedAt: "2026-07-03T05:05:00.000Z",
    targets: [
      {
        targetId: "target-editor-window",
        windowIdHash: "win_hash_editor",
        appIdHash: "app_hash_editor",
        displayIdHash: "display_hash_primary",
        boundsSummary: "x:100 y:100 w:1200 h:800",
        labelSummary: "Editor window summary",
        confidence: 0.95,
        candidateCount: 1
      }
    ],
    windows: [
      {
        windowIdHash: "win_hash_editor",
        appIdHash: "app_hash_editor",
        displayIdHash: "display_hash_primary",
        boundsSummary: "x:100 y:100 w:1200 h:800",
        titleSummary: "Editor window summary",
        targetIds: ["target-editor-window"]
      }
    ],
    apps: [
      {
        appIdHash: "app_hash_editor",
        appNameSummary: "Editor app summary",
        windowCount: 1
      }
    ],
    displays: [
      {
        displayIdHash: "display_hash_primary",
        sizeSummary: "1920x1080",
        primary: true
      }
    ]
  };
}

async function safeProposal() {
  return validateDesktopActionProposal(await fixture("safe-focus-window.json"));
}

function expectExecutionFlagsFalse(
  result: ReturnType<typeof validateDesktopActionTargets>
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

describe("desktop target metadata validation", () => {
  it("validates safe target metadata", async () => {
    const result = validateDesktopActionTargets({
      proposal: await safeProposal(),
      observerSummary: observerSummary(),
      currentMetadataSummary: currentMetadata(),
      staleThresholdMs: 10 * 60 * 1000,
      allowedAppRefs: ["app_hash_editor"],
      createdAt: "2026-07-03T05:05:00.000Z"
    });

    expect(result.status).toBe("validated");
    expect(result.proposalId).toBe("desktop-action-proposal-safe-focus");
    expect(result.targetCount).toBe(1);
    expect(result.summary.summaryOnly).toBe(true);
    expect(result.readiness.canEnterRiskClassification).toBe(true);
    expectExecutionFlagsFalse(result);
  });

  it("blocks stale observer evidence over threshold", async () => {
    const result = validateDesktopActionTargets({
      proposal: await safeProposal(),
      observerSummary: observerSummary(),
      currentMetadataSummary: currentMetadata(),
      staleThresholdMs: 60 * 1000,
      createdAt: "2026-07-03T05:30:00.000Z"
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain(
      "STALE_EVIDENCE_OVER_THRESHOLD"
    );
  });

  it("blocks target app window and display mismatch", async () => {
    const metadata = currentMetadata();
    metadata.targets = [
      {
        targetId: "target-editor-window",
        windowIdHash: "win_hash_other",
        appIdHash: "app_hash_other",
        displayIdHash: "display_hash_other",
        boundsSummary: "x:100 y:100 w:1200 h:800",
        labelSummary: "Other target summary"
      }
    ];
    const result = validateDesktopActionTargets({
      proposal: await safeProposal(),
      observerSummary: observerSummary(),
      currentMetadataSummary: metadata,
      createdAt: "2026-07-03T05:05:00.000Z"
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("TARGET_WINDOW_MISMATCH");
    expect(result.summary.blockerCodes).toContain("TARGET_APP_MISMATCH");
    expect(result.summary.blockerCodes).toContain("TARGET_DISPLAY_MISMATCH");
  });

  it("blocks sensitive target text clipboard and file-dialog action", async () => {
    const base = (await safeProposal()).proposal!;
    const proposal = {
      ...base,
      operations: [
        {
          operationId: "desktop-action-operation-type-1",
          actionKind: "type_text",
          targetRef: {
            targetId: "target-password",
            windowIdHash: "win_hash_editor",
            appIdHash: "app_hash_editor",
            displayIdHash: "display_hash_primary",
            boundsSummary: "x:100 y:100 w:300 h:40",
            labelSummary: "Password field summary",
            sensitiveKind: "password",
            observerEvidenceRefId: "desktop-evidence-editor-1"
          },
          summary: "Future text action proposal.",
          inputTextSummary: "Safe text summary.",
          expectedVisibleStateChange: "No execution in this phase."
        }
      ],
      riskNotes: ["Sensitive target validation fixture."]
    } as typeof base;
    const metadata = currentMetadata();
    metadata.targets = [
      {
        targetId: "target-password",
        windowIdHash: "win_hash_editor",
        appIdHash: "app_hash_editor",
        displayIdHash: "display_hash_primary",
        boundsSummary: "x:100 y:100 w:300 h:40",
        labelSummary: "Password field summary"
      }
    ];

    const result = validateDesktopActionTargets({
      proposal,
      observerSummary: observerSummary(),
      currentMetadataSummary: metadata,
      createdAt: "2026-07-03T05:05:00.000Z"
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.warningCodes).toContain("SENSITIVE_TARGET");
    expect(result.summary.blockerCodes).toContain("SENSITIVE_TARGET_BLOCKED");
  });

  it("blocks missing observer evidence and current target metadata", async () => {
    const result = validateDesktopActionTargets({
      proposal: await safeProposal(),
      observerSummary: { ...observerSummary(), evidenceRefs: [] },
      currentMetadataSummary: {
        ...currentMetadata(),
        targets: [],
        windows: []
      },
      createdAt: "2026-07-03T05:05:00.000Z"
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("MISSING_OBSERVER_EVIDENCE");
    expect(result.summary.blockerCodes).toContain("TARGET_METADATA_MISSING");
  });

  it("blocks raw fields, secret markers, and execution flags", async () => {
    const result = validateDesktopActionTargets({
      proposal: await safeProposal(),
      observerSummary: {
        ...observerSummary(),
        rawScreenshot: "RAW_SCREENSHOT_BYTES",
        note: "sk-test-obvious-fake"
      },
      currentMetadataSummary: currentMetadata(),
      canExecuteDesktopAction: true,
      createdAt: "2026-07-03T05:05:00.000Z"
    } as never);

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("FORBIDDEN_FIELD");
    expect(result.summary.blockerCodes).toContain("RAW_MARKER");
    expect(result.summary.blockerCodes).toContain("SECRET_MARKER");
    expect(result.summary.blockerCodes).toContain("EXECUTION_FLAG_TRUE");
    expectExecutionFlagsFalse(result);
  });

  it("keeps output summary-only", async () => {
    const result = validateDesktopActionTargets({
      proposal: await safeProposal(),
      observerSummary: observerSummary(),
      currentMetadataSummary: currentMetadata(),
      createdAt: "2026-07-03T05:05:00.000Z"
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("RAW_SCREENSHOT");
    expect(serialized).not.toContain("rawScreenshot");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("executeNow");
    expect(result.summary.summaryOnly).toBe(true);
    expectExecutionFlagsFalse(result);
  });
});
