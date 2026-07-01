import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  checkDesktopRunnerPreflight,
  applyApprovedUserWorkspacePatch,
  commitProjectKnowledgeCandidate,
  expireProjectKnowledgeEntry,
  generateLiveDeepSeekPatchProposal,
  invokeAllowedCommand,
  isAllowedDesktopCommand,
  listProjectKnowledge,
  loadWorkspaceEventSummary,
  liveProposalAllowedKeySourceRef,
  recordLiveProposalSummaryEvent,
  recordVerificationLaneEvent,
  recordApprovedUserWorkspaceExecutionEvent,
  recordControlRunDraftEvent,
  runMcpReadonlyDiscovery,
  revokeProjectKnowledgeEntry,
  rollbackApprovedUserWorkspacePatch,
  runDesktopWebTableToCsvFlow,
  runGitReadLane,
  runShellVerificationLane,
  safeInvoke,
  type ApprovedUserWorkspaceApplyResult,
  type ApprovedUserWorkspaceRollbackResult,
  type GitReadLaneResult,
  type LiveDeepSeekPatchProposalCommandRequest,
  type LiveDeepSeekPatchProposalCommandResult,
  type LiveProposalSummaryEventPreview,
  type LiveProposalSummaryEventRecordResult,
  type McpReadonlyDiscoverResult,
  type VerificationLaneEventRecordResult,
  type ShellVerificationLaneResult,
  type TauriInvoke
} from "../src/desktop-flow.js";
import { buildControlPlaneProjectionView } from "../src/control-plane-view.js";
import { buildWorkbenchSurfacesView } from "../src/workbench-surfaces.js";
import { buildPatchProposalSurfaceView } from "../src/patch-proposal-surface-view.js";
import { buildMemoryInspectorView } from "../src/memory-inspector-view.js";
import { buildChatRunCanvasView } from "../src/chat-run-canvas-view.js";
import { buildRunDraftView, summarizeRunDraft } from "../src/run-draft-view.js";
import {
  buildRunDraftEventPayload,
  summarizeRunDraftEventResult,
  validateRunDraftEventPayload
} from "../src/run-draft-event-view.js";
import { buildContextCartView } from "../src/context-cart-view.js";
import {
  buildContextAssemblyPreviewView,
  summarizeContextAssemblyPreview,
  validateContextAssemblyPreviewInput
} from "../src/context-assembly-preview-view.js";
import { buildAgentRoutePreviewView } from "../src/agent-route-preview-view.js";
import {
  buildCapabilityPlanPreviewView,
  capabilityPlanApprovalRefs
} from "../src/capability-plan-preview-view.js";
import {
  buildCapabilityHostSurfaceView,
  capabilityHostSurfaceWarningCodes,
  summarizeCapabilityHostSurfaceView
} from "../src/capability-host-surface-view.js";
import { buildCapabilityHostAuditView } from "../src/capability-host-audit-view.js";
import {
  buildPatchProposalCreationPreviewView,
  parsePatchProposalPathRefsInput,
  patchProposalCreationApprovalRefs,
  patchProposalCreationSurfaceSummaries
} from "../src/patch-proposal-creation-preview-view.js";
import {
  buildModelPatchProposalImportView,
  buildPatchProposalCreationPreviewFromModelImport,
  modelPatchProposalImportApprovalRefs,
  modelPatchProposalImportSurfaceSummaries,
  summarizeModelPatchProposalImportView
} from "../src/model-patch-proposal-import-view.js";
import {
  buildModelProposalChainIntegrationView,
  modelProposalChainIntegrationApprovalRefs,
  modelProposalChainIntegrationSurfaceSummaries,
  summarizeModelProposalChainIntegrationView
} from "../src/model-proposal-chain-integration-view.js";
import { buildLiveProposalOptInGateView } from "../src/live-proposal-opt-in-gate-view.js";
import { buildAppLiveProposalSessionReceiptView } from "../src/app-live-proposal-session-receipt-view.js";
import { buildLiveDeepSeekProposalGenerationView } from "../src/live-deepseek-proposal-generation-view.js";
import { buildLiveProposalRequestBuilderView } from "../src/live-proposal-request-builder-view.js";
import { buildLiveProposalValidationIntegrationView } from "../src/live-proposal-validation-integration-view.js";
import { buildLiveProposalPreviewGateView } from "../src/live-proposal-preview-gate-view.js";
import { buildLiveProposalTelemetryAuditView } from "../src/live-proposal-telemetry-audit-view.js";
import {
  buildLiveProposalEvaluationSummaryView,
  parseLiveProposalEvaluationSummaryJson
} from "../src/live-proposal-evaluation-summary-view.js";
import { buildLiveProposalEvaluationTelemetryAuditView } from "../src/live-proposal-evaluation-telemetry-audit-view.js";
import { buildMcpMetadataRedactionAuditView } from "../src/mcp-metadata-redaction-audit-view.js";
import { buildMcpReadonlyConnectionView } from "../src/mcp-readonly-connection-view.js";
import { buildProjectKnowledgeReviewView } from "../src/project-knowledge-view.js";
import { buildProjectKnowledgeRecallView } from "../src/project-knowledge-recall-view.js";
import { buildE2ECodingTaskWizardView } from "../src/e2e-coding-task-wizard-view.js";
import { buildE2ECodingTaskSequencerView } from "../src/e2e-coding-task-sequencer-view.js";
import { buildE2ETaskRecoveryView } from "../src/e2e-task-recovery-view.js";
import {
  buildPatchProposalValidationPreviewView,
  patchProposalValidationApprovalRefs,
  patchProposalValidationAuditWarningCodes,
  patchProposalValidationSurfaceSummaries
} from "../src/patch-proposal-validation-preview-view.js";
import {
  buildPatchDiffAuditPreviewView,
  patchDiffAuditApprovalRefs,
  patchDiffAuditSurfaceSummaries,
  patchDiffAuditWarningCodes
} from "../src/patch-diff-audit-preview-view.js";
import {
  buildPatchApprovalDraftView,
  patchApprovalDraftApprovalRefs,
  patchApprovalDraftSurfaceSummaries,
  patchApprovalDraftWarningCodes
} from "../src/patch-approval-draft-view.js";
import {
  buildPatchVirtualApplyPreviewView,
  patchVirtualApplyApprovalRefs,
  patchVirtualApplySurfaceSummaries,
  patchVirtualApplyWarningCodes
} from "../src/patch-virtual-apply-preview-view.js";
import {
  buildPatchRollbackCheckpointPreviewView,
  patchRollbackCheckpointApprovalRefs,
  patchRollbackCheckpointSurfaceSummaries,
  patchRollbackCheckpointWarningCodes
} from "../src/patch-rollback-checkpoint-preview-view.js";
import {
  buildControlledCreationReplayProjectionView,
  controlledCreationReplayApprovalRefs,
  controlledCreationReplayPatchSummaries,
  controlledCreationReplayWarningCodes,
  summarizeControlledCreationReplayProjectionView
} from "../src/controlled-creation-replay-projection-view.js";
import {
  buildVerificationLaneProjectionView,
  summarizeVerificationLaneProjectionView,
  verificationLaneProjectionWarningCodes
} from "../src/verification-lane-projection-view.js";
import {
  buildSandboxApplyRollbackEventProjectionView,
  sandboxApplyRollbackEventProjectionApprovalRefs,
  sandboxApplyRollbackEventProjectionSurfaceSummaries,
  sandboxApplyRollbackEventProjectionWarningCodes
} from "../src/sandbox-apply-rollback-event-projection-view.js";
import { buildCapabilityPlanPreview } from "../../runtime/src/capabilities/plan-preview.js";
import { buildMemoryRecallPreviewView } from "../src/memory-recall-preview-view.js";
import {
  buildWorkspaceIndexBridgeView,
  parseWorkspaceIndexSummaryJson,
  validateWorkspaceIndexSummaryInput
} from "../src/workspace-index-bridge-view.js";
import {
  buildDisposableWorkspaceSnapshotView,
  disposableWorkspaceSnapshotWarningCodes
} from "../src/disposable-workspace-snapshot-view.js";
import {
  buildUserWorkspaceSnapshotBackupView,
  userWorkspaceSnapshotBackupWarningCodes
} from "../src/user-workspace-snapshot-backup-view.js";
import {
  buildUserWorkspacePromotionReadinessView,
  userWorkspacePromotionReadinessWarningCodes
} from "../src/user-workspace-promotion-readiness-view.js";
import { buildUserWorkspaceApplyPrototypeView } from "../src/user-workspace-apply-prototype-view.js";
import { buildUserWorkspaceRollbackPrototypeView } from "../src/user-workspace-rollback-prototype-view.js";
import { buildUserWorkspaceEventWriterView } from "../src/user-workspace-event-writer-view.js";
import {
  buildAppApprovalExecutionDesignView,
  summarizeAppApprovalExecutionDesignView
} from "../src/app-approval-execution-design-view.js";
import { buildAppApprovedExecutionReceiptView } from "../src/app-approved-execution-receipt-view.js";
import {
  buildAppApprovedExecutionFlowView,
  buildApprovedApplyRequestFromExecutionFlow,
  buildApprovedRollbackRequestFromExecutionFlow
} from "../src/app-approved-execution-flow-view.js";
import { buildApprovedExecutionRecoveryView } from "../src/approved-execution-recovery-view.js";
import { buildApprovedExecutionReplayTimelineView } from "../src/approved-execution-replay-timeline-view.js";
import { buildDisposablePatchApplyView } from "../src/disposable-patch-apply-view.js";
import { buildApprovalGatedDisposableApplyView } from "../src/approval-gated-disposable-apply-view.js";
import { buildDisposablePatchRollbackView } from "../src/disposable-patch-rollback-view.js";
import {
  buildEventLogPanelModel,
  buildBridgeProposalPreviewModel,
  buildResultPanelModel,
  buildUiErrorFallbackMessage,
  canRunWithPreflight,
  importBridgeProposalToPayloadEditor,
  maxPayloadTextBytes,
  normalizeBridgeProposalPreview,
  normalizeDesktopCommandError,
  normalizeDesktopFlowResult,
  normalizeEventSummary,
  normalizeRunnerPreflightSummary,
  normalizeTimelineItem,
  normalizeWorkspaceEventSummary,
  parsePayloadJson,
  rejectBridgeProposal,
  runnerPreflightMessage,
  safeArray,
  safeErrorMessage,
  safeShort,
  safeText,
  validatePayloadTextSize,
  validateDesktopFlowInput,
  type DesktopFlowResult,
  type BridgeProposalPreviewState,
  type RunnerPreflightSummary,
  type WorkspaceEventSummary
} from "../src/safety.js";
import {
  buildStaticAgentRoutePreview,
  runWebTableToCsvFlow,
  createBridgeProposalPreview,
  type BrowserDomPayload
} from "@deepseek-workbench/runtime";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const appRoot = path.join(repoRoot, "app");
const fixturePath = path.join(
  repoRoot,
  "runtime",
  "test",
  "fixtures",
  "web-table-sample-payload.json"
);
const rootPackagePath = path.join(repoRoot, "package.json");
const appPackagePath = path.join(appRoot, "package.json");
const tauriConfigPath = path.join(appRoot, "src-tauri", "tauri.conf.json");
const viteConfigPath = path.join(appRoot, "vite.config.ts");
const appScriptRunnerPath = path.join(appRoot, "scripts", "run-flow.mjs");
const appPreflightScriptPath = path.join(appRoot, "scripts", "preflight.mjs");
const appQaScriptPath = path.join(appRoot, "scripts", "qa-check.mjs");
const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true }))
  );
});

async function createTempWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "dw-app-test-"));
  tempRoots.push(root);
  return root;
}

async function readFixture(): Promise<BrowserDomPayload> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as BrowserDomPayload;
}

function fixedResult(workspaceRoot: string): DesktopFlowResult {
  return {
    draft: {
      relativePath: "drafts/table.csv",
      absolutePath: path.join(workspaceRoot, "drafts", "table.csv"),
      bytes: 42,
      sha256: "a".repeat(64),
      contentType: "text/csv"
    },
    extraction: {
      rowCount: 4,
      columnCount: 3,
      warningCount: 1,
      injectionRiskCount: 1,
      formulaEscapedCount: 1
    },
    events: {
      eventCount: 9,
      eventLogPath: path.join(
        workspaceRoot,
        ".deepseek-workbench",
        "events.jsonl"
      )
    },
    replaySummary: {
      draftCount: 1
    }
  };
}

function fixedPreflight(
  overrides: Partial<RunnerPreflightSummary> = {}
): RunnerPreflightSummary {
  return {
    ok: true,
    mode: "dev_source_tree",
    runnerFound: true,
    nodeAvailable: true,
    payloadLimitBytes: maxPayloadTextBytes,
    warnings: [],
    statusCode: "DEV_SOURCE_TREE_READY",
    runnerStatus: "Ready",
    packagedStandaloneSupport: "Source-tree runner",
    nextAction: "Run Convert with a sanitized BrowserDomPayload",
    ...overrides
  };
}

function fixedGitReadLaneResult(
  overrides: Partial<GitReadLaneResult> = {}
): GitReadLaneResult {
  return {
    ok: true,
    lane: "status_summary",
    status: "changed",
    workspaceRootRef: "workspace-ref-test",
    branchSummary: "main",
    fileCount: 1,
    changedFileCount: 1,
    addedLineCount: 0,
    deletedLineCount: 0,
    changedPathSummaries: ["M docs/example.md"],
    warningCodes: [],
    commandHash: "command-hash",
    outputHash: "output-hash",
    durationMs: 12,
    truncated: false,
    rawDiffIncluded: false,
    rawStdoutIncluded: false,
    rawStderrIncluded: false,
    eventPreview: {
      type: "git.read_lane.executed",
      lane: "status_summary",
      workspaceRootRef: "workspace-ref-test",
      commandHash: "command-hash",
      resultHash: "result-hash",
      changedFileCount: 1,
      addedLineCount: 0,
      deletedLineCount: 0,
      warningCodes: [],
      durationMs: 12,
      truncated: false,
      summaryOnly: true,
      notWritten: true
    },
    safeMessage:
      "Git read lane summary generated. No raw diff/stdout/stderr returned.",
    ...overrides
  };
}

function fixedShellVerificationLaneResult(
  overrides: Partial<ShellVerificationLaneResult> = {}
): ShellVerificationLaneResult {
  return {
    ok: true,
    templateId: "app.typecheck",
    status: "passed",
    exitCode: 0,
    workspaceRootRef: "workspace-ref-test",
    stdoutBytes: 120,
    stderrBytes: 0,
    stdoutLineCount: 4,
    stderrLineCount: 0,
    warningCodes: [],
    commandHash: "shell-command-hash",
    outputHash: "shell-output-hash",
    durationMs: 21,
    truncated: false,
    rawStdoutIncluded: false,
    rawStderrIncluded: false,
    eventPreview: {
      type: "shell.verification_lane.executed",
      templateId: "app.typecheck",
      workspaceRootRef: "workspace-ref-test",
      commandHash: "shell-command-hash",
      resultHash: "shell-result-hash",
      exitCode: 0,
      stdoutBytes: 120,
      stderrBytes: 0,
      warningCodes: [],
      durationMs: 21,
      truncated: false,
      summaryOnly: true,
      notWritten: true
    },
    safeMessage:
      "Shell verification lane summary generated. No raw stdout/stderr returned.",
    ...overrides
  };
}

function fixedVerificationLaneEventRecord(
  overrides: Partial<VerificationLaneEventRecordResult> = {}
): VerificationLaneEventRecordResult {
  return {
    ok: true,
    eventId: "verification-lane-event-1",
    eventType: "git.read_lane.executed",
    laneOrTemplateId: "status_summary",
    resultHash: "result-hash",
    eventLogPath: "D:\\workspace\\.deepseek-workbench\\events.jsonl",
    safeMessage: "Summary-only verification lane event recorded locally.",
    warnings: [],
    ...overrides
  };
}

function fixedEventSummary(
  overrides: Partial<WorkspaceEventSummary> = {}
): WorkspaceEventSummary {
  return {
    ok: true,
    eventLogPath: "D:\\workspace\\.deepseek-workbench\\events.jsonl",
    eventCount: 2,
    displayedEventCount: 2,
    taskCount: 1,
    completedTaskCount: 1,
    draftCount: 1,
    approvedApplyCount: 0,
    approvedRollbackCount: 0,
    verificationEventCount: 0,
    liveProposalEventCount: 0,
    projectKnowledgeEventCount: 0,
    projectKnowledgeEntryCount: 0,
    lastEventAt: "2026-06-16T00:00:01.000Z",
    typeCounts: {
      "task.completed": 1,
      "fs.draft_written": 1
    },
    timeline: [
      {
        id: "event-1",
        ts: "2026-06-16T00:00:00.000Z",
        type: "fs.draft_written",
        taskId: "task-1",
        summary: "draft written: drafts/table.csv · 42 bytes · text/csv",
        safePayloadKeys: ["relativePath", "bytes", "contentType"]
      }
    ],
    safetyScan: {
      ok: true,
      findings: 0,
      warningCodes: []
    },
    warnings: [],
    ...overrides
  };
}

function fixedVerificationEventSummary(
  overrides: Partial<WorkspaceEventSummary> = {}
): WorkspaceEventSummary {
  return fixedEventSummary({
    eventCount: 4,
    displayedEventCount: 4,
    verificationEventCount: 2,
    lastEventAt: "2026-06-25T00:00:02.000Z",
    latestVerificationSummary:
      "shell verification lane recorded: app.typecheck · 0 exit · 120 stdout bytes · 0 stderr bytes · 21 ms · result shellhash1234",
    typeCounts: {
      "task.completed": 1,
      "fs.draft_written": 1,
      "git.read_lane.executed": 1,
      "shell.verification_lane.executed": 1
    },
    timeline: [
      {
        id: "git-verification-event-1",
        ts: "2026-06-25T00:00:01.000Z",
        type: "git.read_lane.executed",
        taskId: "no task",
        summary:
          "git read lane recorded: status_summary · 2 changed files · 3 lines added · 1 lines deleted · 14 ms · result githash123456",
        safePayloadKeys: [
          "lane",
          "changedFileCount",
          "addedLineCount",
          "deletedLineCount",
          "durationMs",
          "resultHash"
        ]
      },
      {
        id: "shell-verification-event-1",
        ts: "2026-06-25T00:00:02.000Z",
        type: "shell.verification_lane.executed",
        taskId: "no task",
        summary:
          "shell verification lane recorded: app.typecheck · 0 exit · 120 stdout bytes · 0 stderr bytes · 21 ms · result shellhash1234",
        safePayloadKeys: [
          "templateId",
          "exitCode",
          "stdoutBytes",
          "stderrBytes",
          "durationMs",
          "resultHash"
        ]
      }
    ],
    ...overrides
  });
}

function fixedWorkspaceIndexSummary(): Record<string, unknown> {
  return {
    workspaceIndexId: "workspace-index-test-1",
    status: "built",
    fileCount: 3,
    indexedFileCount: 2,
    skippedFileCount: 1,
    totalBytes: 1234,
    totalLines: 88,
    hash: "abcdef1234567890",
    fileSummaries: [
      {
        path: "README.md",
        extension: "md",
        language: "md",
        sizeBytes: 234,
        lineCount: 20,
        hash: "readmehash123456",
        indexed: true,
        warningCodes: [],
        symbolCount: 2
      },
      {
        path: "app/src/App.tsx",
        extension: "tsx",
        language: "tsx",
        sizeBytes: 1000,
        lineCount: 68,
        hash: "apphash123456789",
        indexed: true,
        warningCodes: ["LARGE_COMPONENT_SUMMARY"],
        symbolCount: 5
      },
      {
        path: "docs/private-note.md",
        extension: "md",
        language: "md",
        sizeBytes: 0,
        lineCount: 0,
        hash: "skippedhash123456",
        indexed: false,
        skippedReason: "UNSAFE_CONTENT_SKIPPED",
        warningCodes: ["UNSAFE_CONTENT_SKIPPED"],
        symbolCount: 0
      }
    ],
    directorySummaries: [
      {
        path: "app/src",
        fileCount: 1,
        indexedFileCount: 1,
        skippedFileCount: 0,
        languageCounts: { tsx: 1 },
        warningCodes: []
      },
      {
        path: "docs",
        fileCount: 1,
        indexedFileCount: 0,
        skippedFileCount: 1,
        languageCounts: { md: 1 },
        warningCodes: ["UNSAFE_CONTENT_SKIPPED"]
      }
    ],
    languageSummary: [
      {
        language: "md",
        fileCount: 2,
        indexedFileCount: 1,
        lineCount: 20,
        sizeBytes: 234
      },
      {
        language: "tsx",
        fileCount: 1,
        indexedFileCount: 1,
        lineCount: 68,
        sizeBytes: 1000
      }
    ],
    symbolSummaries: [
      {
        filePath: "README.md",
        name: "Overview",
        kind: "heading",
        language: "md"
      },
      {
        filePath: "app/src/App.tsx",
        name: "DesktopShell",
        kind: "function",
        language: "tsx"
      }
    ],
    warningCodes: ["UNSAFE_CONTENT_SKIPPED"]
  };
}

function fixedBridgePreview(
  payload: BrowserDomPayload
): BridgeProposalPreviewState {
  const runtimePreview = createBridgeProposalPreview({
    proposalId: "proposal-1",
    sessionId: "session-1",
    proposal: {
      payload,
      extensionId: "extension-under-test",
      extensionVersion: "0.1.0"
    },
    receivedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T00:05:00.000Z"
  });
  const normalized = normalizeBridgeProposalPreview(runtimePreview);
  if (normalized === undefined) {
    throw new Error("bridge preview fixture did not normalize");
  }
  return normalized;
}

function runNodeScript(args: string[]): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}>;
function runNodeScript(
  args: string[],
  options: { cwd?: string }
): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}>;
function runNodeScript(
  args: string[],
  options: { cwd?: string } = {}
): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: options.cwd ?? repoRoot,
        timeout: 120_000,
        env: sanitizedTestEnv()
      },
      (error, stdout, stderr) => {
        if (error !== null && "code" in error) {
          resolve({ code: error.code as number, stdout, stderr });
          return;
        }
        if (error !== null) {
          reject(error);
          return;
        }
        resolve({ code: 0, stdout, stderr });
      }
    );
  });
}

function parseRunnerError(stderr: string): Record<string, unknown> {
  const lines = stderr.trim().split(/\r?\n/).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? "{}";
  return JSON.parse(lastLine) as Record<string, unknown>;
}

function sanitizedTestEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !/API_KEY|TOKEN|AUTH|SECRET|PASSWORD|CREDENTIAL|BEARER/i.test(key)
    )
  );
}

describe("desktop shell safety helpers", () => {
  it("validates payload JSON before invoking the flow", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();

    const validation = validateDesktopFlowInput({
      workspaceRoot,
      payloadText: JSON.stringify(payload),
      filename: "table.csv"
    });

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.request.workspaceRoot).toBe(workspaceRoot);
      expect(JSON.parse(validation.request.payloadJson)).toMatchObject({
        schemaVersion: payload.schemaVersion
      });
    }
  });

  it("returns a safe validation error for invalid payload text", async () => {
    const secret = "sk-test1234567890abcdef";
    const parsed = parsePayloadJson(`{"leaked":"${secret}"`);
    const message = safeErrorMessage(new Error(`bad payload ${secret}`));

    expect(parsed.ok).toBe(false);
    expect(message).not.toContain(secret);
  });

  it("rejects oversized pasted payload text", () => {
    const oversized = "x".repeat(maxPayloadTextBytes + 1);

    expect(validatePayloadTextSize(oversized)).toBe(
      "Payload JSON is too large"
    );
    expect(
      validateDesktopFlowInput({
        workspaceRoot: "D:\\workspace",
        payloadText: oversized
      })
    ).toMatchObject({
      ok: false,
      errorMessage: "Payload JSON is too large"
    });
  });

  it("requires a workspace path", () => {
    const validation = validateDesktopFlowInput({
      workspaceRoot: " ",
      payloadText: "{}"
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errorMessage).toContain("Workspace root is required");
    }
  });

  it("lets the existing flow reject traversal filenames without writing a draft", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();

    await expect(
      runWebTableToCsvFlow({
        workspaceRoot,
        payload,
        filename: "../evil.csv"
      })
    ).rejects.toThrow();
    await expect(
      access(path.join(workspaceRoot, "drafts", "evil.csv"))
    ).rejects.toThrow();
  });

  it("builds a result panel model without CSV content", async () => {
    const workspaceRoot = await createTempWorkspace();
    const model = buildResultPanelModel(fixedResult(workspaceRoot));

    expect(model.draftRelativePath).toBe("drafts/table.csv");
    expect(JSON.stringify(model)).not.toContain("name,amount");
    expect(JSON.stringify(model)).not.toContain("=SUM(A1:A2)");
  });

  it("normalizes real Rust-style camelCase desktop flow responses", async () => {
    const workspaceRoot = await createTempWorkspace();
    const normalized = normalizeDesktopFlowResult(fixedResult(workspaceRoot));

    expect(normalized.draft.relativePath).toBe("drafts/table.csv");
    expect(normalized.events.eventLogPath).toContain(".deepseek-workbench");
    expect(normalized.replaySummary.draftCount).toBe(1);
  });

  it("normalizes legacy snake_case desktop flow responses safely", async () => {
    const workspaceRoot = await createTempWorkspace();
    const normalized = normalizeDesktopFlowResult({
      draft: {
        relative_path: "drafts/table.csv",
        absolute_path: path.join(workspaceRoot, "drafts", "table.csv"),
        bytes: 42,
        sha256: "a".repeat(64),
        content_type: "text/csv"
      },
      extraction: {
        row_count: 4,
        column_count: 3,
        warning_count: 1,
        injection_risk_count: 1,
        formula_escaped_count: 1
      },
      events: {
        event_count: 9,
        event_log_path: path.join(
          workspaceRoot,
          ".deepseek-workbench",
          "events.jsonl"
        )
      },
      replay_summary: {
        draft_count: 1
      }
    });

    expect(normalized.draft.relativePath).toBe("drafts/table.csv");
    expect(normalized.replaySummary.draftCount).toBe(1);
  });

  it("turns malformed desktop flow success into a safe invalid response error", () => {
    expect(() => normalizeDesktopFlowResult({ ok: true })).toThrow(
      "Desktop flow draft summary was invalid"
    );
  });

  it("normalizes bridge proposal previews without raw payload in the panel model", async () => {
    const payload = await readFixture();
    const preview = fixedBridgePreview(payload);
    const model = buildBridgeProposalPreviewModel(preview);
    const serializedModel = JSON.stringify(model);

    expect(model).toMatchObject({
      proposalId: "proposal-1",
      sessionId: "session-1",
      source: "example.com/reports/table",
      tableSummary: "1 table(s), 4 row(s), 3 column(s)",
      warningSummary: "1 warning(s), 1 injection risk(s)",
      importDisabled: false,
      rejectDisabled: false
    });
    expect(serializedModel).not.toContain("Product");
    expect(serializedModel).not.toContain("北京");
    expect(serializedModel).not.toContain("ignore previous");
    expect(serializedModel).not.toContain("token=");
  });

  it("imports bridge proposals only into payload editor state", async () => {
    const payload = await readFixture();
    const preview = fixedBridgePreview(payload);

    const decision = importBridgeProposalToPayloadEditor(
      preview,
      "2026-01-01T00:00:00.000Z"
    );

    expect(decision).toMatchObject({
      ok: true,
      autoConvert: false,
      fileWritten: false,
      eventWritten: false
    });
    expect(
      decision.ok ? JSON.parse(decision.payloadText).schemaVersion : 0
    ).toBe(1);
    expect(decision.ok ? decision.preview.status : "blocked").toBe("imported");
  });

  it("blocks expired and rejected bridge proposal imports", async () => {
    const payload = await readFixture();
    const preview = fixedBridgePreview(payload);
    const expired = {
      ...preview,
      expiresAt: "2026-01-01T00:00:01.000Z"
    };

    expect(
      importBridgeProposalToPayloadEditor(expired, "2026-01-01T00:00:02.000Z")
    ).toMatchObject({
      ok: false,
      autoConvert: false,
      fileWritten: false,
      eventWritten: false
    });

    const rejected = rejectBridgeProposal(preview);
    expect(rejected).toMatchObject({
      status: "rejected",
      sanitizedPayloadJson: ""
    });
    expect(
      importBridgeProposalToPayloadEditor(rejected, "2026-01-01T00:00:00.000Z")
    ).toMatchObject({
      ok: false,
      safeMessage: "Bridge proposal was rejected"
    });
  });

  it("renders empty bridge preview gate as disabled dry UX", () => {
    const model = buildBridgeProposalPreviewModel(undefined);

    expect(model.status).toBe("disabled");
    expect(model.emptyMessage).toContain("No live bridge is enabled");
    expect(model.emptyMessage).toContain(
      "Future extension-to-desktop proposals will appear here for preview"
    );
    expect(model.importDisabled).toBe(true);
    expect(model.rejectDisabled).toBe(true);
    expect(JSON.stringify(model)).not.toContain("rawDom");
  });
});

describe("desktop command wrapper", () => {
  it("refuses unknown command names", async () => {
    await expect(invokeAllowedCommand("unknown_command", {})).rejects.toThrow(
      "not allowed"
    );
    expect(isAllowedDesktopCommand("check_runner_preflight")).toBe(true);
    expect(isAllowedDesktopCommand("load_workspace_event_summary")).toBe(true);
    expect(isAllowedDesktopCommand("record_control_run_draft_event")).toBe(
      true
    );
    expect(isAllowedDesktopCommand("apply_approved_user_workspace_patch")).toBe(
      true
    );
    expect(
      isAllowedDesktopCommand("rollback_approved_user_workspace_patch")
    ).toBe(true);
    expect(
      isAllowedDesktopCommand("record_approved_user_workspace_execution_event")
    ).toBe(true);
    expect(
      isAllowedDesktopCommand("generate_live_deepseek_patch_proposal")
    ).toBe(true);
    expect(isAllowedDesktopCommand("record_live_proposal_summary_event")).toBe(
      true
    );
    expect(isAllowedDesktopCommand("mcp_readonly_discover")).toBe(true);
    expect(isAllowedDesktopCommand("project_knowledge_list")).toBe(true);
    expect(isAllowedDesktopCommand("project_knowledge_commit_candidate")).toBe(
      true
    );
    expect(isAllowedDesktopCommand("project_knowledge_revoke")).toBe(true);
    expect(isAllowedDesktopCommand("project_knowledge_expire")).toBe(true);
    expect(isAllowedDesktopCommand("run_web_table_to_csv_flow")).toBe(true);
  });

  it("calls MCP readonly discovery only through the fixed wrapper", async () => {
    const invoke: TauriInvoke = async <T>(
      command: string,
      args?: Record<string, unknown>
    ): Promise<T> => {
      expect(command).toBe("mcp_readonly_discover");
      expect(args).toMatchObject({
        request: {
          typedConfirmation: "DISCOVER MCP METADATA",
          maxItems: 10,
          timeoutMs: 5000
        }
      });
      const result = {
        ok: true,
        discoveryId: "mcp-readonly-discovery-1",
        profileId: "mcp.docs.injected",
        serverInfo: {
          serverId: "mcp.docs.server",
          displayName: "Docs MCP",
          serverVersion: "fake-injected-0.1",
          metadataHash: "metadata-hash"
        },
        resourceCount: 1,
        promptCount: 1,
        toolCount: 1,
        resourceSummaries: [
          {
            resourceId: "mcp.docs.resource",
            displayName: "Docs resource",
            kind: "summary_index",
            descriptionSummary: "Resource metadata only.",
            warningCodes: []
          }
        ],
        promptSummaries: [
          {
            promptId: "mcp.docs.prompt",
            displayName: "Docs prompt",
            descriptionSummary: "Prompt metadata only.",
            templateDeclared: true,
            rawPromptIncluded: false,
            warningCodes: []
          }
        ],
        toolSummaries: [
          {
            toolId: "mcp.docs.tool",
            displayName: "Docs tool",
            descriptionSummary: "Tool metadata only.",
            riskLevel: "A3",
            defaultInvocationPolicy: "DISABLED",
            inputSchemaKnown: true,
            outputSchemaKnown: true,
            warningCodes: ["TOOL_INVOCATION_DISABLED"]
          }
        ],
        warningCodes: ["STDIO_DISCOVERY_DEFERRED"],
        summaryOnly: true,
        rawMetadataIncluded: false,
        rawStdoutIncluded: false,
        rawStderrIncluded: false,
        canCallTool: false,
        canReadResource: false,
        canExecutePrompt: false,
        canMutate: false,
        canWriteEventStore: false,
        resultHash: "result-hash",
        safeMessage: "MCP read-only metadata discovered."
      } satisfies McpReadonlyDiscoverResult;
      return result as T;
    };

    const result = await runMcpReadonlyDiscovery(
      {
        profile: {
          profileId: "mcp.docs.injected",
          displayName: "Docs MCP",
          serverKind: "mcp",
          transportKind: "injected_test_transport",
          serverRef: "mcp.docs.server",
          readOnlyPolicy: {
            allowInitialize: true,
            allowListResources: true,
            allowListPrompts: true,
            allowListTools: true,
            allowReadResource: false,
            allowCallTool: false,
            allowPromptExecution: false,
            allowMutation: false
          }
        },
        typedConfirmation: "DISCOVER MCP METADATA",
        maxItems: 10,
        timeoutMs: 5000
      },
      invoke
    );

    expect(result.summaryOnly).toBe(true);
    expect(result.canCallTool).toBe(false);
    expect(result.canReadResource).toBe(false);
    expect(result.canExecutePrompt).toBe(false);
    expect(result.canMutate).toBe(false);
  });

  it("keeps MCP readonly discovery wrapper free of generic tool invocation", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const flowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );

    expect(flowSource).toContain("mcp_readonly_discover");
    expect(flowSource).toContain("runMcpReadonlyDiscovery");
    expect(flowSource).not.toContain("callTool(");
    expect(flowSource).not.toContain("resourceRead(");
    expect(flowSource).not.toContain("mcpGenericInvoke");
    expect(appSource).not.toContain("callTool(");
    expect(appSource).not.toContain("resourceRead(");
    expect(appSource).not.toContain("tools/call");
    expect(appSource).not.toContain("resources/read");
  });

  it("renders MCP read-only connection surface with disabled execution controls", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );

    expect(appSource).toContain("MCP Read-only Connection");
    expect(appSource).toContain("Read-only discovery / no tool invocation");
    expect(appSource).toContain("Discover MCP Metadata");
    expect(appSource).toContain("Invoke MCP Tool (disabled)");
    expect(appSource).toContain("Read MCP Resource Content (disabled)");
    expect(appSource).toContain("runMcpReadonlyDiscovery");
    expect(appSource).not.toContain("mcpGenericInvoke");
    expect(appSource).not.toContain("tools/call");
    expect(appSource).not.toContain("resources/read");
  });

  it("blocks raw MCP metadata in the App connection view model", () => {
    const view = buildMcpReadonlyConnectionView({
      profileJsonText: JSON.stringify({
        profileId: "mcp.docs.injected",
        displayName: "Docs MCP",
        transportKind: "injected_test_transport",
        serverRef: "mcp.docs.server",
        readOnlyPolicy: {
          allowInitialize: true,
          allowListResources: true,
          allowListPrompts: true,
          allowListTools: true,
          allowReadResource: false,
          allowCallTool: false,
          allowPromptExecution: false,
          allowMutation: false
        },
        rawMetadata: "raw metadata should not be accepted"
      }),
      typedConfirmation: "DISCOVER MCP METADATA"
    });

    expect(view.status).toBe("blocked");
    expect(view.safeDiscoveryRequest).toBeUndefined();
    expect(view.readiness.canInvokeMcpTool).toBe(false);
    expect(view.readiness.canReadMcpResourceContent).toBe(false);
    expect(JSON.stringify(view)).not.toContain("raw metadata should not");
  });

  it("shows summary-only MCP descriptor previews after fixed discovery", () => {
    const view = buildMcpReadonlyConnectionView({
      profileJsonText: JSON.stringify({
        profileId: "mcp.docs.injected",
        displayName: "Docs MCP",
        transportKind: "injected_test_transport",
        serverRef: "mcp.docs.server",
        readOnlyPolicy: {
          allowInitialize: true,
          allowListResources: true,
          allowListPrompts: true,
          allowListTools: true,
          allowReadResource: false,
          allowCallTool: false,
          allowPromptExecution: false,
          allowMutation: false
        }
      }),
      typedConfirmation: "DISCOVER MCP METADATA",
      discoveryResult: {
        ok: true,
        discoveryId: "mcp-readonly-discovery-1",
        profileId: "mcp.docs.injected",
        serverInfo: {
          serverId: "mcp.docs.server",
          displayName: "Docs MCP",
          serverVersion: "fake-injected-0.1",
          metadataHash: "metadata-hash"
        },
        resourceCount: 1,
        promptCount: 1,
        toolCount: 1,
        resourceSummaries: [
          {
            resourceId: "mcp.docs.resource",
            displayName: "Docs resource",
            kind: "summary_index",
            descriptionSummary: "Resource metadata only.",
            warningCodes: []
          }
        ],
        promptSummaries: [
          {
            promptId: "mcp.docs.prompt",
            displayName: "Docs prompt",
            descriptionSummary: "Prompt metadata only.",
            templateDeclared: true,
            rawPromptIncluded: false,
            warningCodes: []
          }
        ],
        toolSummaries: [
          {
            toolId: "mcp.docs.tool",
            displayName: "Docs tool",
            descriptionSummary: "Tool metadata only.",
            riskLevel: "A3",
            defaultInvocationPolicy: "DISABLED",
            warningCodes: ["TOOL_INVOCATION_DISABLED"]
          }
        ],
        warningCodes: [],
        summaryOnly: true,
        rawMetadataIncluded: false,
        rawStdoutIncluded: false,
        rawStderrIncluded: false,
        canCallTool: false,
        canReadResource: false,
        canExecutePrompt: false,
        canMutate: false,
        canWriteEventStore: false,
        resultHash: "result-hash",
        safeMessage: "MCP read-only metadata discovered."
      }
    });

    expect(view.status).toBe("warning");
    expect(view.resourceCount).toBe(1);
    expect(view.promptCount).toBe(1);
    expect(view.toolCount).toBe(1);
    expect(view.descriptorPreview).toContainEqual(
      expect.objectContaining({
        kind: "tool_metadata",
        invokePolicy: "DISABLED"
      })
    );
    expect(view.readiness.canInvokeMcpTool).toBe(false);
    expect(view.readiness.canReadMcpResourceContent).toBe(false);
    expect(JSON.stringify(view)).not.toContain("resource content");
  });

  it("renders MCP metadata redaction audit panel without execution controls", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );

    expect(appSource).toContain("MCP Metadata Redaction Audit");
    expect(appSource).toContain("Summary only / no raw metadata");
    expect(appSource).toContain("Preview MCP Metadata Audit");
    expect(appSource).toContain("Write MCP Audit Event (disabled)");
    expect(appSource).toContain("Invoke MCP Tool (disabled)");
    expect(appSource).not.toContain("tools/call");
    expect(appSource).not.toContain("resources/read");
  });

  it("keeps MCP metadata audit App view summary-only", () => {
    const view = buildMcpMetadataRedactionAuditView({
      mcpReadonlyConnectionView: buildMcpReadonlyConnectionView({
        profileJsonText: JSON.stringify({
          profileId: "mcp.docs.injected",
          displayName: "Docs MCP",
          transportKind: "injected_test_transport",
          serverRef: "mcp.docs.server",
          readOnlyPolicy: {
            allowInitialize: true,
            allowListResources: true,
            allowListPrompts: true,
            allowListTools: true,
            allowReadResource: false,
            allowCallTool: false,
            allowPromptExecution: false,
            allowMutation: false
          }
        }),
        typedConfirmation: "DISCOVER MCP METADATA"
      })
    });

    expect(view.readiness.canInvokeMcpTool).toBe(false);
    expect(view.readiness.canReadMcpResourceContent).toBe(false);
    expect(view.readiness.canWriteEventStore).toBe(false);
    expect(JSON.stringify(view)).not.toContain("raw metadata value");
  });

  it("smokes MCP read-only discovery through App summary and audit surfaces", async () => {
    const profile = {
      profileId: "mcp.docs.injected",
      displayName: "Docs MCP",
      serverKind: "mcp",
      transportKind: "injected_test_transport",
      serverRef: "mcp.docs.server",
      readOnlyPolicy: {
        allowInitialize: true,
        allowListResources: true,
        allowListPrompts: true,
        allowListTools: true,
        allowReadResource: false,
        allowCallTool: false,
        allowPromptExecution: false,
        allowMutation: false
      },
      timeoutMs: 5000,
      maxItems: 10
    };
    const invoke: TauriInvoke = async <T>(
      command: string,
      args?: Record<string, unknown>
    ): Promise<T> => {
      expect(command).toBe("mcp_readonly_discover");
      expect(args).toMatchObject({
        request: {
          typedConfirmation: "DISCOVER MCP METADATA"
        }
      });
      const result = {
        ok: true,
        discoveryId: "mcp-readonly-discovery-smoke",
        profileId: "mcp.docs.injected",
        serverInfo: {
          serverId: "mcp.docs.server",
          displayName: "Docs MCP",
          serverVersion: "fake-smoke-0.1",
          metadataHash: "metadata-hash"
        },
        resourceCount: 1,
        promptCount: 1,
        toolCount: 1,
        resourceSummaries: [
          {
            resourceId: "mcp.docs.index",
            displayName: "Docs index",
            kind: "summary_index",
            descriptionSummary: "Metadata summary only.",
            warningCodes: []
          }
        ],
        promptSummaries: [
          {
            promptId: "mcp.docs.prompt",
            displayName: "Docs prompt",
            descriptionSummary: "Prompt metadata only.",
            templateDeclared: true,
            rawPromptIncluded: false,
            warningCodes: []
          }
        ],
        toolSummaries: [
          {
            toolId: "mcp.docs.search",
            displayName: "Search docs",
            descriptionSummary: "Tool metadata only.",
            riskLevel: "A3",
            defaultInvocationPolicy: "DISABLED",
            inputSchemaKnown: true,
            outputSchemaKnown: true,
            warningCodes: ["TOOL_INVOCATION_DISABLED"]
          }
        ],
        warningCodes: ["STDIO_DISCOVERY_DEFERRED"],
        summaryOnly: true,
        rawMetadataIncluded: false,
        rawStdoutIncluded: false,
        rawStderrIncluded: false,
        canCallTool: false,
        canReadResource: false,
        canExecutePrompt: false,
        canMutate: false,
        canWriteEventStore: false,
        resultHash: "result-hash",
        safeMessage: "MCP read-only metadata discovered."
      } satisfies McpReadonlyDiscoverResult;
      return result as T;
    };

    const discoveryResult = await runMcpReadonlyDiscovery(
      {
        profile,
        typedConfirmation: "DISCOVER MCP METADATA",
        maxItems: 10,
        timeoutMs: 5000
      },
      invoke
    );
    const connectionView = buildMcpReadonlyConnectionView({
      profileJsonText: JSON.stringify(profile),
      typedConfirmation: "DISCOVER MCP METADATA",
      discoveryResult
    });
    const auditView = buildMcpMetadataRedactionAuditView({
      mcpReadonlyConnectionView: connectionView,
      discoveryResult
    });

    expect(discoveryResult.summaryOnly).toBe(true);
    expect(connectionView.resourceCount).toBe(1);
    expect(connectionView.promptCount).toBe(1);
    expect(connectionView.toolCount).toBe(1);
    expect(connectionView.readiness.canInvokeMcpTool).toBe(false);
    expect(connectionView.readiness.canReadMcpResourceContent).toBe(false);
    expect(auditView.status).not.toBe("blocked");
    expect(auditView.rawFieldDetectedCount).toBe(0);
    expect(auditView.readiness.canInvokeMcpTool).toBe(false);
    expect(auditView.readiness.canWriteEventStore).toBe(false);
    expect(JSON.stringify({ connectionView, auditView })).not.toContain(
      "raw metadata"
    );
  });

  it("uses fixed project knowledge commands and normalizes summary-only responses", async () => {
    const calls: Array<{
      command: string;
      args: Record<string, unknown> | undefined;
    }> = [];
    const invoke: TauriInvoke = async <T>(
      command: string,
      args?: Record<string, unknown>
    ): Promise<T> => {
      calls.push({ command, args });
      if (command === "project_knowledge_list") {
        return {
          ok: true,
          status: "empty",
          storePath: "workspace/.deepseek-workbench/project-knowledge",
          entriesPath:
            "workspace/.deepseek-workbench/project-knowledge/entries.jsonl",
          eventsPath:
            "workspace/.deepseek-workbench/project-knowledge/events.jsonl",
          indexPath:
            "workspace/.deepseek-workbench/project-knowledge/index.json",
          entryCount: 0,
          activeEntryCount: 0,
          revokedEntryCount: 0,
          expiredEntryCount: 0,
          entries: [],
          warnings: [],
          snapshotHash: "snapshot-hash",
          summaryOnly: true,
          rawContentIncluded: false,
          safeMessage: "Project knowledge snapshot loaded."
        } as T;
      }
      if (command === "project_knowledge_commit_candidate") {
        return {
          ok: true,
          entry: {
            entryId: "project-knowledge-entry",
            type: "project_fact",
            namespace: "deepseek-gui",
            summary: "Project knowledge summary only.",
            status: "committed",
            evidenceRefCount: 1,
            tagCount: 1,
            entryHash: "entry-hash",
            warningCodes: [],
            summaryOnly: true
          },
          eventId: "project-knowledge-event",
          storePath: "workspace/.deepseek-workbench/project-knowledge",
          entryCount: 1,
          indexHash: "index-hash",
          summaryOnly: true,
          rawContentIncluded: false,
          safeMessage: "Project knowledge committed.",
          warnings: []
        } as T;
      }
      if (
        command === "project_knowledge_revoke" ||
        command === "project_knowledge_expire"
      ) {
        return {
          ok: true,
          entryId: "project-knowledge-entry",
          status:
            command === "project_knowledge_revoke" ? "revoked" : "expired",
          eventId: "project-knowledge-event",
          storePath: "workspace/.deepseek-workbench/project-knowledge",
          indexHash: "index-hash",
          summaryOnly: true,
          rawContentIncluded: false,
          safeMessage: "Project knowledge lifecycle event recorded.",
          warnings: []
        } as T;
      }
      throw new Error(`unexpected command ${command}`);
    };
    const candidate = {
      type: "project_fact" as const,
      namespace: "deepseek-gui",
      summary: "Project knowledge store wrappers are fixed commands.",
      trust: {
        score: 0.95,
        level: "trusted" as const,
        humanReviewed: true
      },
      provenance: {
        sourceKind: "human_reviewed" as const,
        summary: "Human-reviewed summary-only provenance."
      },
      evidenceRefs: [
        {
          refId: "evidence-1",
          kind: "repo_doc",
          summary: "Repository doc summary.",
          hashPrefix: "abc12345"
        }
      ],
      factKind: "app_boundary"
    };

    const snapshot = await listProjectKnowledge("D:/workspace", invoke);
    const committed = await commitProjectKnowledgeCandidate(
      { workspaceRoot: "D:/workspace", candidate },
      invoke
    );
    const revoked = await revokeProjectKnowledgeEntry(
      {
        workspaceRoot: "D:/workspace",
        entryId: committed.entry.entryId,
        typedConfirmation: "REVOKE PROJECT KNOWLEDGE"
      },
      invoke
    );
    const expired = await expireProjectKnowledgeEntry(
      {
        workspaceRoot: "D:/workspace",
        entryId: committed.entry.entryId,
        reasonSummary: "Superseded by newer reviewed project knowledge."
      },
      invoke
    );
    const serialized = JSON.stringify({
      snapshot,
      committed,
      revoked,
      expired
    });

    expect(calls.map((call) => call.command)).toEqual([
      "project_knowledge_list",
      "project_knowledge_commit_candidate",
      "project_knowledge_revoke",
      "project_knowledge_expire"
    ]);
    expect(committed.entry.summaryOnly).toBe(true);
    expect(revoked.status).toBe("revoked");
    expect(expired.status).toBe("expired");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("sk-");
  });

  function safeLiveProposalCommandRequest(): LiveDeepSeekPatchProposalCommandRequest {
    return {
      sessionReceipt: {
        status: "ready",
        receiptId: "receipt-test",
        kind: "live_proposal_generation",
        providerId: "deepseek",
        modelProfileId: "deepseek-chat",
        objectiveSummaryHash: "objective-hash-test",
        allowedPathRefs: ["docs/live-proposal.md"],
        contextRefHashes: ["context-ref"],
        apiKeyPolicyId: "policy-test",
        requestBuilderId: "request-builder-test",
        expiresAt: "2099-01-01T00:00:00.000Z",
        typedConfirmation: "CALL DEEPSEEK FOR PROPOSAL",
        typedConfirmationAccepted: true,
        summaryOnly: true,
        readiness: {
          canProceedToLiveProposalCommand: true,
          canReadApiKey: false,
          canCallLiveModel: false,
          canFetchNetwork: false,
          canSendLiveRequest: false,
          canWriteFilesystem: false,
          canWriteEventStore: false,
          canApplyPatch: false,
          canRollback: false,
          canExecuteGit: false,
          canExecuteShell: false,
          canIssuePermissionLease: false,
          appCanExecute: false
        },
        source: "runtime_app_live_proposal_session_receipt"
      },
      apiKeySourceRef: liveProposalAllowedKeySourceRef,
      providerId: "deepseek",
      modelProfileId: "deepseek-chat",
      requestEnvelope: {
        requestId: "live-proposal-request-test",
        responseFormat: "model_patch_proposal",
        summaryOnly: true,
        noExecution: true,
        noFileWrite: true,
        noApply: true,
        noRollback: true,
        noEventStoreWrite: true,
        noGitShell: true,
        noTools: true,
        toolChoiceOmitted: true
      },
      objectiveSummary: "Generate a summary-only proposal.",
      allowedPathRefs: ["docs/live-proposal.md"],
      contextRefs: ["context-ref"],
      maxResponseBytes: 20_000,
      timeoutMs: 5_000
    };
  }

  function safeLiveProposalCommandResult(): LiveDeepSeekPatchProposalCommandResult {
    return {
      ok: true,
      status: "generated",
      providerId: "deepseek",
      modelProfileId: "deepseek-chat",
      requestId: "live-proposal-request-test",
      responseId: "response-test",
      proposalCandidate: {
        proposalId: "proposal-test",
        title: "Update docs",
        intent: "code_change",
        operations: [
          {
            operationId: "operation-test",
            changeKind: "update",
            path: "docs/live-proposal.md",
            summary: "Update docs summary."
          }
        ]
      },
      proposalCandidateHash: "proposal-hash-test",
      responseHash: "response-hash-test",
      usageSummary: {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3
      },
      droppedReasoningContent: true,
      reasoningContentCharCount: 12,
      warningCodes: ["REASONING_CONTENT_DROPPED"],
      summaryOnly: true,
      rawPromptIncluded: false,
      rawResponseIncluded: false,
      rawReasoningContentIncluded: false,
      canApplyPatch: false,
      canRollback: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      safeMessage:
        "Live DeepSeek proposal command returned a summary-only proposal candidate."
    };
  }

  function safeLiveProposalSummaryEventPreview(
    overrides: Partial<LiveProposalSummaryEventPreview> = {}
  ): LiveProposalSummaryEventPreview {
    return {
      type: "model.patch_proposal.live_generated",
      generationId: "live-proposal-flow-test",
      requestId: "live-proposal-request-test",
      proposalId: "proposal-test",
      modelProfileId: "deepseek-chat",
      usageSummary: {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3
      },
      repairStatus: "valid",
      validationStatus: "valid",
      warningCount: 1,
      blockerCount: 0,
      proposalHash: "proposal-hash-test",
      droppedReasoningContent: true,
      warningCodes: ["REASONING_CONTENT_DROPPED"],
      summaryOnly: true,
      noRawPrompt: true,
      noRawResponse: true,
      noReasoningContent: true,
      noApiKey: true,
      contentDraftRawIncluded: false,
      canApplyPatch: false,
      canRollback: false,
      canWriteEventStore: false,
      notWritten: true,
      ...overrides
    };
  }

  function safeLiveProposalSummaryEventRecordResult(
    overrides: Partial<LiveProposalSummaryEventRecordResult> = {}
  ): LiveProposalSummaryEventRecordResult {
    return {
      ok: true,
      eventId: "live-proposal-event-test",
      eventType: "model.patch_proposal.live_generated",
      generationId: "live-proposal-flow-test",
      proposalId: "proposal-test",
      eventLogPath: "D:\\workspace\\.deepseek-workbench\\events.jsonl",
      safeMessage:
        "Summary-only live proposal generation event recorded locally.",
      warnings: [],
      ...overrides
    };
  }

  it("calls live DeepSeek proposal generation only through the fixed wrapper", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("generate_live_deepseek_patch_proposal");
      expect(args).toMatchObject({
        request: {
          providerId: "deepseek",
          modelProfileId: "deepseek-chat",
          apiKeySourceRef: liveProposalAllowedKeySourceRef,
          maxResponseBytes: 20_000,
          timeoutMs: 5_000
        }
      });
      return safeLiveProposalCommandResult() as never;
    };

    const result = await generateLiveDeepSeekPatchProposal(
      safeLiveProposalCommandRequest(),
      invoke
    );
    const serialized = JSON.stringify(result);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("generated");
    expect(result.summaryOnly).toBe(true);
    expect(result.rawPromptIncluded).toBe(false);
    expect(result.rawResponseIncluded).toBe(false);
    expect(result.rawReasoningContentIncluded).toBe(false);
    expect(result.canApplyPatch).toBe(false);
    expect(result.canRollback).toBe(false);
    expect(result.canWriteEventStore).toBe(false);
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("internal chain");
  });

  it("blocks live proposal wrapper inputs and unsafe responses before App use", async () => {
    await expect(
      generateLiveDeepSeekPatchProposal(
        {
          ...safeLiveProposalCommandRequest(),
          apiKeySourceRef: "sk-fake-live-proposal-key-000000"
        },
        async () => safeLiveProposalCommandResult() as never
      )
    ).rejects.toThrow("credential ref");

    await expect(
      generateLiveDeepSeekPatchProposal(
        {
          ...safeLiveProposalCommandRequest(),
          requestEnvelope: {
            ...safeLiveProposalCommandRequest().requestEnvelope,
            rawPrompt: "hidden"
          }
        },
        async () => safeLiveProposalCommandResult() as never
      )
    ).rejects.toThrow("unsafe fields");

    await expect(
      generateLiveDeepSeekPatchProposal(
        safeLiveProposalCommandRequest(),
        async () =>
          ({
            ...safeLiveProposalCommandResult(),
            rawResponseIncluded: true
          }) as never
      )
    ).rejects.toMatchObject({
      errorCode: "INVALID_RESPONSE"
    });
  });

  it("records live proposal generation events through a summary-only fixed wrapper", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("record_live_proposal_summary_event");
      expect(args).toMatchObject({
        workspaceRoot: "D:\\workspace",
        eventPreview: {
          type: "model.patch_proposal.live_generated",
          generationId: "live-proposal-flow-test",
          requestId: "live-proposal-request-test",
          proposalId: "proposal-test",
          summaryOnly: true,
          noRawPrompt: true,
          noRawResponse: true,
          noReasoningContent: true,
          noApiKey: true,
          contentDraftRawIncluded: false,
          canApplyPatch: false,
          canRollback: false,
          canWriteEventStore: false,
          notWritten: true
        }
      });
      return safeLiveProposalSummaryEventRecordResult() as never;
    };

    const result = await recordLiveProposalSummaryEvent(
      {
        workspaceRoot: "D:\\workspace",
        eventPreview: safeLiveProposalSummaryEventPreview()
      },
      invoke
    );
    const serialized = JSON.stringify(result);

    expect(result.ok).toBe(true);
    expect(result.eventType).toBe("model.patch_proposal.live_generated");
    expect(result.proposalId).toBe("proposal-test");
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("reasoning_content");
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("Authorization");
  });

  it("blocks unsafe live proposal event previews before Tauri invocation", async () => {
    await expect(
      recordLiveProposalSummaryEvent(
        {
          workspaceRoot: "D:\\workspace",
          eventPreview: {
            ...safeLiveProposalSummaryEventPreview(),
            rawResponse: "hidden"
          } as unknown as LiveProposalSummaryEventPreview
        },
        async () => safeLiveProposalSummaryEventRecordResult() as never
      )
    ).rejects.toThrow("unsafe fields");

    await expect(
      recordLiveProposalSummaryEvent(
        {
          workspaceRoot: "D:\\workspace",
          eventPreview: {
            ...safeLiveProposalSummaryEventPreview(),
            proposalHash: "sk-fake-live-event-secret-000000"
          }
        },
        async () => safeLiveProposalSummaryEventRecordResult() as never
      )
    ).rejects.toThrow("unsafe fields");

    await expect(
      recordLiveProposalSummaryEvent(
        {
          workspaceRoot: "D:\\workspace",
          eventPreview: {
            ...safeLiveProposalSummaryEventPreview(),
            canApplyPatch: true
          } as unknown as LiveProposalSummaryEventPreview
        },
        async () => safeLiveProposalSummaryEventRecordResult() as never
      )
    ).rejects.toThrow("required");
  });

  it("keeps live proposal command boundary fixed behind the App generation gate", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const flowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );

    expect(flowSource).toContain("generate_live_deepseek_patch_proposal");
    expect(flowSource).toContain("record_live_proposal_summary_event");
    expect(flowSource).toContain("generateLiveDeepSeekPatchProposal");
    expect(flowSource).toContain("recordLiveProposalSummaryEvent");
    expect(flowSource).not.toContain("fetch(");
    expect(flowSource).not.toContain("XMLHttpRequest");
    expect(flowSource).not.toContain("createLiveHttpCommand");
    expect(flowSource).not.toContain("genericHttp");
    expect(appSource).toContain("Call DeepSeek (disabled)");
    expect(appSource).toContain("Live DeepSeek Proposal Generation");
    expect(appSource).toContain("Generate Live Proposal");
    expect(appSource).toContain("Record Live Proposal Summary Event");
    expect(appSource).toContain("canGenerateLiveProposal");
    expect(appSource).toContain("canRecordLiveProposalSummaryEvent");
    expect(appSource).toContain("generateLiveDeepSeekPatchProposal(");
    expect(appSource).toContain("recordLiveProposalSummaryEvent(");
    expect(appSource).not.toContain("handleGenerateLiveDeepSeekPatchProposal");
    expect(appSource).not.toContain("handleCallDeepSeek");
    expect(appSource).not.toContain('type="password"');
    expect(appSource).not.toContain("API key input");
  });

  it("calls approved apply only through the fixed wrapper and normalizes summary result", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("apply_approved_user_workspace_patch");
      expect(args).toMatchObject({
        request: {
          workspaceRoot: "D:\\workspace",
          workspaceRootRef: "workspace-ref-test",
          maxFiles: 1,
          maxBytes: 4096
        }
      });
      return {
        ok: true,
        applyId: "approved-apply-1",
        checkpointId: "checkpoint-1",
        checkpointHash: "checkpoint-hash",
        workspaceRootRef: "workspace-ref-test",
        operationCount: 1,
        filesCreated: 1,
        filesUpdated: 0,
        filesDeleted: 0,
        bytesWritten: 12,
        warningCodes: [],
        inputSnapshotHash: "input-hash",
        outputSnapshotHash: "output-hash",
        resultHash: "result-hash",
        eventPreview: {
          type: "user_workspace.patch_apply.approved_result",
          applyId: "approved-apply-1",
          checkpointId: "checkpoint-1",
          checkpointHash: "checkpoint-hash",
          workspaceRootRef: "workspace-ref-test",
          operationCount: 1,
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          bytesWritten: 12,
          pathSummaries: ["create src/file.ts"],
          pathSummaryCount: 1,
          resultHash: "result-hash",
          warningCodes: [],
          notWritten: true
        },
        safeMessage:
          "Approved user workspace apply completed with a summary-only result. Event preview was not written."
      } as never;
    };

    const result = await applyApprovedUserWorkspacePatch(
      {
        workspaceRoot: "D:\\workspace",
        workspaceRootRef: "workspace-ref-test",
        receipt: { status: "ready" },
        operations: [
          {
            path: "src/file.ts",
            changeKind: "create",
            content: "safe content"
          }
        ],
        proposalSummary: { proposalId: "proposal-1" },
        validationSummary: { validationId: "validation-1" },
        auditSummary: { auditId: "audit-1" },
        approvalSummary: { approvalDraftId: "approval-1" },
        maxFiles: 1,
        maxBytes: 4096
      },
      invoke
    );

    expect(result.ok).toBe(true);
    expect(result.eventPreview.notWritten).toBe(true);
    expect(JSON.stringify(result)).not.toContain("safe content");
  });

  it("calls approved rollback only through the fixed wrapper and normalizes summary result", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("rollback_approved_user_workspace_patch");
      expect(args).toMatchObject({
        request: {
          workspaceRoot: "D:\\workspace",
          workspaceRootRef: "workspace-ref-test",
          applyId: "approved-apply-1",
          checkpointId: "checkpoint-1",
          checkpointRef: "checkpoint-hash"
        }
      });
      return {
        ok: true,
        rollbackId: "approved-rollback-1",
        applyId: "approved-apply-1",
        checkpointId: "checkpoint-1",
        checkpointHash: "checkpoint-hash",
        workspaceRootRef: "workspace-ref-test",
        operationCount: 1,
        filesRemoved: 1,
        filesRestored: 0,
        restoredSnapshotHash: "restored-hash",
        resultHash: "rollback-result-hash",
        warningCodes: [],
        eventPreview: {
          type: "user_workspace.patch_rollback.approved_result",
          rollbackId: "approved-rollback-1",
          applyId: "approved-apply-1",
          checkpointId: "checkpoint-1",
          checkpointHash: "checkpoint-hash",
          workspaceRootRef: "workspace-ref-test",
          operationCount: 1,
          filesRemoved: 1,
          filesRestored: 0,
          pathSummaries: ["create src/file.ts"],
          pathSummaryCount: 1,
          restoredSnapshotHash: "restored-hash",
          resultHash: "rollback-result-hash",
          warningCodes: [],
          notWritten: true
        },
        safeMessage:
          "Approved user workspace rollback completed with a summary-only result. Event preview was not written."
      } as never;
    };

    const result = await rollbackApprovedUserWorkspacePatch(
      {
        workspaceRoot: "D:\\workspace",
        workspaceRootRef: "workspace-ref-test",
        receipt: { status: "ready" },
        applyId: "approved-apply-1",
        checkpointId: "checkpoint-1",
        checkpointRef: "checkpoint-hash"
      },
      invoke
    );

    expect(result.ok).toBe(true);
    expect(result.eventPreview.notWritten).toBe(true);
    expect(JSON.stringify(result)).not.toContain("preimage content");
  });

  it("records approved execution summaries only through the fixed wrapper", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("record_approved_user_workspace_execution_event");
      expect(args).toMatchObject({
        workspaceRoot: "D:\\workspace",
        eventPreview: {
          type: "user_workspace.patch_apply.approved_result",
          applyId: "approved-apply-1",
          notWritten: true
        }
      });
      return {
        ok: true,
        eventId: "approved-execution-1",
        eventType: "user_workspace.patch_apply.app_executed",
        operationId: "approved-apply-1",
        checkpointId: "checkpoint-1",
        eventLogPath: "D:\\workspace\\.deepseek-workbench\\events.jsonl",
        safeMessage: "Summary-only approved execution event recorded locally.",
        warnings: []
      } as never;
    };

    const result = await recordApprovedUserWorkspaceExecutionEvent(
      {
        workspaceRoot: "D:\\workspace",
        eventPreview: {
          type: "user_workspace.patch_apply.approved_result",
          applyId: "approved-apply-1",
          checkpointId: "checkpoint-1",
          checkpointHash: "checkpoint-hash",
          workspaceRootRef: "workspace-ref-test",
          operationCount: 1,
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          bytesWritten: 12,
          pathSummaries: ["create src/file.ts"],
          pathSummaryCount: 1,
          resultHash: "result-hash",
          warningCodes: [],
          notWritten: true
        }
      },
      invoke
    );

    expect(result.ok).toBe(true);
    expect(result.eventType).toBe("user_workspace.patch_apply.app_executed");
    expect(JSON.stringify(result)).not.toContain("safe content");
    expect(JSON.stringify(result)).not.toContain("preimage");
  });

  it("reads runner preflight through the fixed command", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("check_runner_preflight");
      expect(args).toMatchObject({ workspaceRoot: "D:\\workspace" });
      return fixedPreflight({ workspaceValid: true }) as never;
    };

    const preflight = await checkDesktopRunnerPreflight(
      "D:\\workspace",
      invoke
    );

    expect(preflight.ok).toBe(true);
    expect(runnerPreflightMessage(preflight)).toContain("Ready");
    expect(preflight.statusCode).toBe("DEV_SOURCE_TREE_READY");
    expect(canRunWithPreflight(preflight)).toBe(true);
  });

  it("reports node-missing preflight as a safe error", async () => {
    const secret = "sk-test1234567890abcdef";
    const invoke: TauriInvoke = async () =>
      fixedPreflight({
        ok: false,
        nodeAvailable: false,
        statusCode: "NODE_RUNTIME_NOT_FOUND",
        errorCode: "NODE_RUNTIME_NOT_FOUND",
        safeMessage: `Node runtime was not found ${secret}`,
        runnerStatus: "Node missing",
        nextAction: "Install Node.js and rerun preflight"
      }) as never;

    const preflight = await checkDesktopRunnerPreflight(undefined, invoke);

    expect(preflight.ok).toBe(false);
    expect(preflight.errorCode).toBe("NODE_RUNTIME_NOT_FOUND");
    expect(safeErrorMessage(preflight.safeMessage)).not.toContain(secret);
  });

  it("normalizes runner preflight and event summaries from Rust response shapes", () => {
    const preflight = normalizeRunnerPreflightSummary(
      fixedPreflight({ workspaceValid: true })
    );
    const eventSummary = normalizeWorkspaceEventSummary(fixedEventSummary());

    expect(preflight.statusCode).toBe("DEV_SOURCE_TREE_READY");
    expect(preflight.runnerFound).toBe(true);
    expect(eventSummary.displayedEventCount).toBe(2);
    expect(eventSummary.timeline).toHaveLength(1);
  });

  it("safeInvoke catches string, object, Error, and malformed success responses", async () => {
    await expect(
      safeInvoke("run_web_table_to_csv_flow", {}, async () => {
        throw "Desktop flow failed with exit code 1";
      })
    ).rejects.toThrow("Desktop flow failed with exit code 1");

    await expect(
      safeInvoke("run_web_table_to_csv_flow", {}, async () => {
        throw {
          ok: false,
          errorCode: "FILE_EXISTS",
          safeMessage:
            "Draft already exists: drafts/web-table-export.csv. Choose a new draft filename or remove the existing file.",
          stage: "write_draft",
          exitCode: 1,
          stdoutJsonParsed: true
        };
      })
    ).rejects.toMatchObject({
      errorCode: "FILE_EXISTS",
      stage: "write_draft",
      exitCode: 1,
      stdoutJsonParsed: true
    });

    await expect(
      safeInvoke("load_workspace_event_summary", {}, async () => {
        throw new Error("Event summary failed safely");
      })
    ).rejects.toThrow("Event summary failed safely");

    await expect(
      invokeAllowedCommand(
        "run_web_table_to_csv_flow",
        {},
        async () => ({ ok: true }) as never
      )
    ).rejects.toMatchObject({
      errorCode: "INVALID_RESPONSE"
    });
  });

  it("normalizes object command errors without leaking raw input", () => {
    const secret = "sk-test1234567890abcdef";
    const error = normalizeDesktopCommandError({
      errorCode: "INVALID_PAYLOAD",
      safeMessage: `Payload JSON is not valid JSON ${secret}`,
      stage: "load_payload",
      runnerFound: true,
      nodeAvailable: true
    });

    expect(error.errorCode).toBe("INVALID_PAYLOAD");
    expect(error.runnerFound).toBe(true);
    expect(safeErrorMessage(error)).not.toContain(secret);
  });

  it("reports runner-missing preflight as a safe error", async () => {
    const invoke: TauriInvoke = async () =>
      fixedPreflight({
        ok: false,
        runnerFound: false,
        statusCode: "RUNNER_NOT_FOUND",
        errorCode: "RUNNER_NOT_FOUND",
        safeMessage: "Desktop runner could not be found",
        runnerStatus: "Runner missing",
        nextAction:
          "Run from the repository source tree or restore app/scripts/run-flow.mjs"
      }) as never;

    const preflight = await checkDesktopRunnerPreflight(undefined, invoke);

    expect(preflight.ok).toBe(false);
    expect(preflight.runnerFound).toBe(false);
    expect(runnerPreflightMessage(preflight)).toBe(
      "Desktop runner could not be found"
    );
  });

  it("does not treat packaged mode as supported without a bundled runner", () => {
    const preflight = fixedPreflight({
      ok: false,
      mode: "packaged_not_supported",
      statusCode: "PACKAGED_MODE_REQUIRES_SOURCE_TREE",
      errorCode: "PACKAGED_MODE_REQUIRES_SOURCE_TREE",
      safeMessage: "Packaged mode requires the source-tree runner in v0.1",
      runnerStatus: "Ready",
      packagedStandaloneSupport: "Source-tree required",
      nextAction: "Use pnpm app:dev or keep the source-tree runner available"
    });

    expect(canRunWithPreflight(preflight)).toBe(false);
    expect(runnerPreflightMessage(preflight)).toContain("Packaged mode");
    expect(preflight.packagedStandaloneSupport).toBe("Source-tree required");
    expect(preflight.nextAction).toContain("pnpm app:dev");
  });

  it("renders packaged limitation details without raw input", () => {
    const secret = "sk-test1234567890abcdef";
    const preflight = fixedPreflight({
      ok: false,
      mode: "packaged_with_resources",
      statusCode: "PACKAGED_RUNNER_NOT_BUNDLED",
      errorCode: "PACKAGED_RUNNER_NOT_BUNDLED",
      safeMessage: "Packaged runner resources are not bundled in v0.1",
      packagedStandaloneSupport: "Not bundled",
      nextAction: `Use pnpm app:dev from the source tree for v0.1 ${secret}`
    });
    const uiText = safeErrorMessage(
      `${runnerPreflightMessage(preflight)} ${preflight.nextAction}`
    );

    expect(canRunWithPreflight(preflight)).toBe(false);
    expect(preflight.statusCode).toBe("PACKAGED_RUNNER_NOT_BUNDLED");
    expect(uiText).toContain("Packaged runner resources");
    expect(uiText).not.toContain(secret);
  });

  it("invokes the fixed flow command without exposing env key values", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();
    const secret = "sk-test1234567890abcdef";
    const keyName = ["DEEPSEEK", "API", "KEY"].join("_");
    process.env[keyName] = secret;

    const calls: Array<{ command: string; args?: Record<string, unknown> }> =
      [];
    const invoke: TauriInvoke = async (command, args) => {
      calls.push(args === undefined ? { command } : { command, args });
      if (command === "check_runner_preflight") {
        return fixedPreflight({ workspaceValid: true }) as never;
      }
      return fixedResult(workspaceRoot) as never;
    };

    const result = await runDesktopWebTableToCsvFlow(
      {
        workspaceRoot,
        payloadText: JSON.stringify(payload),
        filename: "table.csv"
      },
      invoke
    );

    expect(result.draft.relativePath).toBe("drafts/table.csv");
    expect(calls).toHaveLength(2);
    expect(calls[0]?.command).toBe("check_runner_preflight");
    expect(calls[1]?.command).toBe("run_web_table_to_csv_flow");
    expect(JSON.stringify(calls)).not.toContain(secret);

    delete process.env[keyName];
  });

  it("blocks conversion when preflight fails", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();
    const calls: string[] = [];
    const invoke: TauriInvoke = async (command) => {
      calls.push(command);
      return fixedPreflight({
        ok: false,
        runnerFound: false,
        statusCode: "RUNNER_NOT_FOUND",
        errorCode: "RUNNER_NOT_FOUND",
        safeMessage: "Desktop runner could not be found",
        runnerStatus: "Runner missing",
        nextAction:
          "Run from the repository source tree or restore app/scripts/run-flow.mjs"
      }) as never;
    };

    await expect(
      runDesktopWebTableToCsvFlow(
        {
          workspaceRoot,
          payloadText: JSON.stringify(payload),
          filename: "table.csv"
        },
        invoke
      )
    ).rejects.toThrow("Desktop runner could not be found");
    expect(calls).toEqual(["check_runner_preflight"]);
  });

  it("loads event summaries only through the fixed workspace command", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("load_workspace_event_summary");
      expect(args).toEqual({
        workspaceRoot: "D:\\workspace",
        maxEvents: 25
      });
      return fixedEventSummary() as never;
    };

    const summary = await loadWorkspaceEventSummary(
      "D:\\workspace",
      25,
      invoke
    );

    expect(summary.ok).toBe(true);
    expect(summary.draftCount).toBe(1);
    expect(JSON.stringify(summary)).not.toContain("csvContent");
  });

  it("runs Git read lanes only through the fixed summary command", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("run_git_read_lane");
      expect(args).toEqual({
        request: {
          workspaceRoot: "D:\\workspace",
          workspaceRootRef: "workspace-ref-test",
          lane: "status_summary",
          pathspecs: ["docs/example.md"],
          timeoutMs: 5000,
          maxOutputBytes: 65536
        }
      });
      return fixedGitReadLaneResult() as never;
    };

    const result = await runGitReadLane(
      {
        workspaceRoot: "D:\\workspace",
        workspaceRootRef: "workspace-ref-test",
        lane: "status_summary",
        pathspecs: ["docs/example.md"],
        timeoutMs: 5000,
        maxOutputBytes: 65536
      },
      invoke
    );

    expect(result.ok).toBe(true);
    expect(result.eventPreview.notWritten).toBe(true);
    expect(result.rawDiffIncluded).toBe(false);
    expect(result.rawStdoutIncluded).toBe(false);
    expect(result.rawStderrIncluded).toBe(false);
    expect(JSON.stringify(result)).not.toContain("diff --git");
  });

  it("keeps Git Read Lanes UI fixed and summary-only", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const normalizedAppSource = appSource.replace(/\s+/g, " ");

    expect(appSource).toContain("Git Read Lanes");
    expect(appSource).toContain("Read-only / no Git writes");
    expect(appSource).toContain("Run Git Read Lane");
    expect(appSource).toContain("status_summary");
    expect(appSource).toContain("diff_summary");
    expect(appSource).toContain("log_summary");
    expect(appSource).toContain("branch_summary");
    expect(appSource).toContain("No raw diff");
    expect(normalizedAppSource).toContain("No raw diff, stdout/stderr");
    expect(appSource).not.toMatch(/>\s*Git Commit\s*</);
    expect(appSource).not.toMatch(/>\s*Git Push\s*</);
    expect(appSource).not.toMatch(/>\s*Git Checkout\s*</);
    expect(appSource).not.toMatch(/>\s*Git Reset\s*</);
    expect(appSource).not.toContain("gitCommand");
    expect(appSource).not.toContain("shellCommand");
    expect(desktopFlowSource).toContain('"run_git_read_lane"');
    expect(desktopFlowSource).not.toContain("run_git_command");
    expect(desktopFlowSource).not.toContain("rawDiff:");
    expect(desktopFlowSource).not.toContain("rawStdout:");
    expect(desktopFlowSource).not.toContain("rawStderr:");
  });

  it("runs shell verification lanes only through the allowlisted command", async () => {
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("run_shell_verification_lane");
      expect(args).toEqual({
        request: {
          workspaceRoot: "D:\\workspace",
          workspaceRootRef: "workspace-ref-test",
          templateId: "pnpm.test.scoped",
          safeArgs: {
            testFilePath: "runtime/test/model-patch-proposal-schema.test.ts"
          },
          timeoutMs: 60000,
          maxOutputBytes: 65536
        }
      });
      return fixedShellVerificationLaneResult({
        templateId: "pnpm.test.scoped",
        eventPreview: {
          ...fixedShellVerificationLaneResult().eventPreview,
          templateId: "pnpm.test.scoped"
        }
      }) as never;
    };

    const result = await runShellVerificationLane(
      {
        workspaceRoot: "D:\\workspace",
        workspaceRootRef: "workspace-ref-test",
        templateId: "pnpm.test.scoped",
        safeArgs: {
          testFilePath: "runtime/test/model-patch-proposal-schema.test.ts"
        },
        timeoutMs: 60000,
        maxOutputBytes: 65536
      },
      invoke
    );

    expect(result.ok).toBe(true);
    expect(result.templateId).toBe("pnpm.test.scoped");
    expect(result.eventPreview.notWritten).toBe(true);
    expect(result.rawStdoutIncluded).toBe(false);
    expect(result.rawStderrIncluded).toBe(false);
    expect(JSON.stringify(result)).not.toContain("stdout text");
    expect(JSON.stringify(result)).not.toContain("stderr text");
  });

  it("records verification lane summary events through the fixed event command", async () => {
    const eventPreview = fixedGitReadLaneResult().eventPreview;
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("record_verification_lane_event");
      expect(args).toEqual({
        workspaceRoot: "D:\\workspace",
        eventPreview
      });
      return fixedVerificationLaneEventRecord() as never;
    };

    const result = await recordVerificationLaneEvent(
      {
        workspaceRoot: "D:\\workspace",
        eventPreview
      },
      invoke
    );

    expect(result.ok).toBe(true);
    expect(result.eventType).toBe("git.read_lane.executed");
    expect(result.safeMessage).toContain("Summary-only verification");
    expect(JSON.stringify(result)).not.toContain("rawStdout");
    expect(JSON.stringify(result)).not.toContain("rawStderr");
    expect(JSON.stringify(result)).not.toContain("diff --git");
  });

  it("keeps Shell Verification Lanes UI allowlisted and summary-only", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );

    expect(appSource).toContain("Shell Verification Lanes");
    expect(appSource).toContain("Verification Summary");
    expect(appSource).toContain("Summary events / no raw output");
    expect(appSource).toContain("Verification Replay Projection");
    expect(appSource).toContain("Evidence refs / no raw output");
    expect(appSource).toContain("verificationLaneProjection");
    expect(appSource).toContain("Allowlist only / no arbitrary shell");
    expect(appSource).toContain("Run Verification Lane");
    expect(appSource).toContain("pnpm.typecheck");
    expect(appSource).toContain("pnpm.lint");
    expect(appSource).toContain("pnpm.test.scoped");
    expect(appSource).toContain("app.typecheck");
    expect(appSource).toContain("cargo.check_tauri");
    expect(appSource).toContain("No generic shell command");
    expect(appSource).toContain("raw stdout/stderr");
    expect(appSource).toContain("recordVerificationLaneEvent");
    expect(appSource).toContain("latestVerificationSummary");
    expect(appSource).not.toContain("shellCommand");
    expect(appSource).not.toContain("custom executable");
    expect(appSource).not.toMatch(/>\s*Install\s*</);
    expect(appSource).not.toMatch(/>\s*Run Shell\s*</);
    expect(appSource).not.toMatch(/>\s*Write Events\s*</);
    expect(desktopFlowSource).toContain('"run_shell_verification_lane"');
    expect(desktopFlowSource).toContain('"record_verification_lane_event"');
    expect(desktopFlowSource).not.toContain("run_shell_command");
    expect(desktopFlowSource).not.toContain("rawStdout:");
    expect(desktopFlowSource).not.toContain("rawStderr:");
  });

  it("builds a safe no-events model", () => {
    const model = buildEventLogPanelModel(
      fixedEventSummary({
        eventCount: 0,
        displayedEventCount: 0,
        taskCount: 0,
        completedTaskCount: 0,
        draftCount: 0,
        typeCounts: {},
        timeline: []
      })
    );

    expect(model?.emptyMessage).toBe(
      "No events yet. Run Convert first, then refresh."
    );
    expect(JSON.stringify(model)).not.toContain("rawDom");
    expect(JSON.stringify(model)).not.toContain("csvContent");
  });

  it("renders undefined and malformed event summaries without throwing", () => {
    expect(buildEventLogPanelModel(undefined)).toBeUndefined();
    expect(buildEventLogPanelModel(null)).toBeUndefined();

    const malformed = {
      ok: true,
      eventCount: Number.NaN,
      displayedEventCount: undefined,
      taskCount: undefined,
      completedTaskCount: undefined,
      draftCount: undefined,
      safetyScan: undefined,
      warnings: undefined,
      timeline: [{ id: "bad" }]
    } as unknown as WorkspaceEventSummary;
    const model = buildEventLogPanelModel(malformed);

    expect(model).toMatchObject({
      eventCount: 0,
      displayedEventCount: 1,
      taskCount: 0,
      completedTaskCount: 0,
      draftCount: 0,
      safetyOk: false,
      safetyFindingCount: 0,
      warnings: ["MALFORMED_EVENT_SUMMARY"],
      timeline: [
        {
          id: "bad",
          taskId: "no task",
          summary: "unknown.event event"
        }
      ]
    });
  });

  it("normalizes null timeline fields without throwing", () => {
    expect(safeText(null)).toBe("—");
    expect(safeShort(null)).toBe("—");
    expect(safeArray(null)).toEqual([]);

    const item = normalizeTimelineItem(
      {
        id: null,
        ts: null,
        type: null,
        taskId: null,
        summary: null,
        safePayloadKeys: null
      },
      0
    );

    expect(item).toMatchObject({
      id: "event-1",
      key: "event-1-0",
      ts: "unknown time",
      type: "unknown.event",
      taskId: "no task",
      taskIdShort: "no task",
      summary: "unknown.event event",
      safePayloadKeys: []
    });
  });

  it("renders event timeline items with null taskId/id/summary safely", () => {
    const summary = {
      ok: true,
      eventCount: 1,
      displayedEventCount: 1,
      taskCount: 0,
      completedTaskCount: 0,
      draftCount: 1,
      lastEventAt: null,
      typeCounts: null,
      timeline: [
        {
          id: null,
          ts: "2026-06-16T00:00:00.000Z",
          type: "fs.draft_written",
          taskId: null,
          summary: null,
          safePayloadKeys: null
        }
      ],
      safetyScan: null,
      warnings: null
    } as unknown as WorkspaceEventSummary;
    const model = buildEventLogPanelModel(summary);

    expect(model?.timeline).toHaveLength(1);
    expect(model?.timeline[0]).toMatchObject({
      id: "event-1",
      taskId: "no task",
      taskIdShort: "no task",
      summary: "fs.draft_written event",
      safePayloadKeys: []
    });
    expect(model?.warnings).toContain("MALFORMED_EVENT_SUMMARY");
    expect(model?.safetyOk).toBe(false);
  });

  it("normalizes event summary null timeline and warning codes safely", () => {
    const summary = normalizeEventSummary({
      ok: true,
      eventCount: 2,
      displayedEventCount: 2,
      taskCount: 1,
      completedTaskCount: 1,
      draftCount: 1,
      typeCounts: null,
      timeline: null,
      safetyScan: {
        ok: false,
        findings: 1,
        warningCodes: null
      },
      warnings: null
    });
    const model = buildEventLogPanelModel(summary);

    expect(summary.timeline).toEqual([]);
    expect(model?.timeline).toEqual([]);
    expect(model?.warnings).toContain("MALFORMED_EVENT_SUMMARY");
    expect(model?.safetyFindingCount).toBe(1);
  });

  it("projects live proposal summary events into Event Log / Replay", () => {
    const summary = normalizeWorkspaceEventSummary(
      fixedEventSummary({
        eventCount: 3,
        displayedEventCount: 3,
        liveProposalEventCount: 1,
        latestLiveProposalSummary:
          "live proposal generated: proposal-test · request live-proposal-request-test · deepseek-chat · repair valid · validation valid · 1 warnings · 0 blockers",
        typeCounts: {
          "task.completed": 1,
          "fs.draft_written": 1,
          "model.patch_proposal.live_generated": 1
        },
        timeline: [
          {
            id: "live-proposal-event-test",
            ts: "2026-06-30T00:00:00.000Z",
            type: "model.patch_proposal.live_generated",
            taskId: "no task",
            summary:
              "live proposal generated: proposal-test · request live-proposal-request-test · deepseek-chat · repair valid · validation valid · 1 warnings · 0 blockers",
            safePayloadKeys: [
              "generationId",
              "requestId",
              "proposalId",
              "modelProfileId",
              "usageSummary",
              "repairStatus",
              "validationStatus",
              "proposalHash"
            ]
          }
        ]
      })
    );
    const model = buildEventLogPanelModel(summary);
    const serialized = JSON.stringify(model);

    expect(model?.liveProposalEventCount).toBe(1);
    expect(model?.latestLiveProposalSummary).toContain(
      "live proposal generated: proposal-test"
    );
    expect(model?.timeline[0]?.type).toBe(
      "model.patch_proposal.live_generated"
    );
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("reasoning_content");
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain('canApplyPatch":true');
  });

  it("projects project knowledge lifecycle events into Event Log / Replay", () => {
    const summary = normalizeWorkspaceEventSummary(
      fixedEventSummary({
        eventCount: 4,
        displayedEventCount: 4,
        projectKnowledgeEventCount: 3,
        projectKnowledgeEntryCount: 1,
        latestProjectKnowledgeSummary:
          "project knowledge entry revoked: pk-1 · revoked · Superseded by reviewed summary.",
        latestProjectKnowledgeRecallSummary:
          "project knowledge recall used: 1 reviewed summary entered volatile tail. · 1 matches",
        projectKnowledgeRedactionAuditStatus: "ok",
        typeCounts: {
          "project_knowledge.candidate_committed": 1,
          "project_knowledge.entry_revoked": 1,
          "project_knowledge.recall_used": 1
        },
        timeline: [
          {
            id: "project-knowledge-event-1",
            ts: "2026-06-30T00:00:00.000Z",
            type: "project_knowledge.candidate_committed",
            taskId: "project-knowledge",
            summary: "project knowledge candidate committed: pk-1 · committed",
            safePayloadKeys: [
              "entryId",
              "entryStatus",
              "eventHash",
              "summaryOnly",
              "noRawContent"
            ]
          },
          {
            id: "project-knowledge-event-2",
            ts: "2026-06-30T00:00:01.000Z",
            type: "project_knowledge.recall_used",
            taskId: "project-knowledge",
            summary:
              "project knowledge recall used: 1 reviewed summary entered volatile tail. · 1 matches",
            safePayloadKeys: [
              "recallSummary",
              "matchedEntryCount",
              "summaryOnly"
            ]
          }
        ]
      })
    );
    const model = buildEventLogPanelModel(summary);
    const serialized = JSON.stringify(model);

    expect(model?.projectKnowledgeEventCount).toBe(3);
    expect(model?.projectKnowledgeEntryCount).toBe(1);
    expect(model?.latestProjectKnowledgeRecallSummary).toContain(
      "project knowledge recall used"
    );
    expect(model?.projectKnowledgeRedactionAuditStatus).toBe("ok");
    expect(model?.timeline[0]?.type).toBe(
      "project_knowledge.candidate_committed"
    );
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("sk-");
  });

  it("models refresh and convert event summaries with null taskId without ErrorBoundary fallback", async () => {
    const summary = normalizeWorkspaceEventSummary({
      ok: true,
      eventCount: 1,
      displayedEventCount: 1,
      taskCount: 0,
      completedTaskCount: 0,
      draftCount: 1,
      typeCounts: {},
      timeline: [
        {
          id: "event-1",
          ts: "2026-06-16T00:00:00.000Z",
          type: "fs.draft_written",
          taskId: null,
          summary: "draft written",
          safePayloadKeys: null
        }
      ],
      safetyScan: {
        ok: true,
        findings: 0,
        warningCodes: null
      },
      warnings: []
    });
    const model = buildEventLogPanelModel(summary);
    const serialized = JSON.stringify(model);

    expect(model?.timeline[0]?.taskId).toBe("no task");
    expect(model?.timeline[0]?.summary).toBe("draft written");
    expect(serialized).not.toContain("Desktop shell recovered");
    expect(serialized).not.toContain("rawDom");
  });

  it("builds safe UI error fallback copy without raw payload values", () => {
    const secret = "sk-test1234567890abcdef";
    const message = buildUiErrorFallbackMessage(
      new Error(`render failed with raw payload ${secret}`)
    );

    expect(message).toBe("Desktop shell recovered from a UI error.");
    expect(message).not.toContain(secret);
  });

  it("keeps event panel model on safe summaries only", () => {
    const secret = "sk-test1234567890abcdef";
    const model = buildEventLogPanelModel(
      fixedEventSummary({
        safetyScan: {
          ok: false,
          findings: 2,
          warningCodes: ["CSV_CONTENT_MARKER", "RAW_DOM_MARKER"]
        },
        warnings: ["CSV_CONTENT_MARKER", "RAW_DOM_MARKER"],
        timeline: [
          {
            id: "event-2",
            ts: "2026-06-16T00:00:02.000Z",
            type: "tool.executed",
            summary: "tool.executed: fs.write_draft · drafts/table.csv",
            safePayloadKeys: ["toolName", "resultSummary"]
          }
        ],
        safeMessage: `safe message ${secret}`
      })
    );
    const serialized = safeErrorMessage(JSON.stringify(model));

    expect(model?.safetyOk).toBe(false);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("name,value");
  });
});

describe("desktop runner sidecar safety", () => {
  it("rejects oversized payload files with a safe error", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payloadPath = path.join(workspaceRoot, "payload.json");
    const secret = "sk-test1234567890abcdef";
    await writeFile(
      payloadPath,
      `${"x".repeat(maxPayloadTextBytes + 1)}${secret}`,
      "utf8"
    );

    const result = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      payloadPath
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Payload file is too large");
    expect(parseRunnerError(result.stderr)).toMatchObject({
      ok: false,
      errorCode: "INVALID_PAYLOAD",
      errorKind: "invalid_payload",
      safeMessage: "Payload file is too large",
      stage: "load_payload"
    });
    expect(result.stderr).not.toContain(secret);
    expect(result.stdout).toBe("");
  });

  it("returns safe errors for unsupported runner arguments", async () => {
    const workspaceRoot = await createTempWorkspace();
    const result = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--unknown"
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unsupported desktop runner argument");
    expect(parseRunnerError(result.stderr)).toMatchObject({
      ok: false,
      errorCode: "INVALID_ARGUMENTS",
      errorKind: "invalid_arguments",
      stage: "parse_args"
    });
    expect(result.stderr).not.toContain("csvContent");
    expect(result.stdout).toBe("");
  });

  it("returns a structured safe error when a draft already exists", async () => {
    const workspaceRoot = await createTempWorkspace();
    const first = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--filename",
      "existing.csv"
    ]);
    const second = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--filename",
      "existing.csv"
    ]);
    const error = parseRunnerError(second.stderr);

    expect(first.code).toBe(0);
    expect(second.code).toBe(1);
    expect(error).toMatchObject({
      ok: false,
      errorCode: "FILE_EXISTS",
      errorKind: "file_exists",
      safeMessage:
        "Draft already exists: drafts/existing.csv. Choose a new draft filename or remove the existing file.",
      stage: "write_draft"
    });
    expect(second.stderr).not.toContain("Desktop flow failed with exit code 1");
    expect(second.stderr).not.toContain("北京");
    expect(second.stderr).not.toContain("ignore previous instructions");
    expect(second.stderr).not.toContain("csvContent");
    expect(second.stdout).toBe("");
  });

  it("returns a structured safe error for invalid payload JSON", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payloadPath = path.join(workspaceRoot, "invalid-payload.json");
    const secret = "sk-test1234567890abcdef";
    await writeFile(payloadPath, `{"leaked":"${secret}"`, "utf8");

    const result = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      payloadPath
    ]);
    const error = parseRunnerError(result.stderr);

    expect(result.code).toBe(1);
    expect(error).toMatchObject({
      ok: false,
      errorCode: "INVALID_PAYLOAD",
      errorKind: "invalid_payload",
      safeMessage: "Payload JSON is not valid JSON",
      stage: "load_payload"
    });
    expect(result.stderr).not.toContain(secret);
    expect(result.stdout).toBe("");
  });

  it("prints only the safe desktop summary contract", async () => {
    const workspaceRoot = await createTempWorkspace();
    const result = await runNodeScript([
      appScriptRunnerPath,
      "--workspace",
      workspaceRoot,
      "--payload",
      fixturePath,
      "--filename",
      "runner-contract.csv"
    ]);
    const summary = JSON.parse(result.stdout) as Record<string, unknown>;
    const serialized = JSON.stringify(summary);

    expect(result.code).toBe(0);
    expect(summary).toHaveProperty("draft");
    expect(summary).toHaveProperty("extraction");
    expect(summary).toHaveProperty("events");
    expect(summary).toHaveProperty("replaySummary");
    expect(serialized).not.toContain("csvContent");
    expect(serialized).not.toContain("rawDom");
    expect(serialized).not.toContain("sk-test");
    expect(serialized).not.toContain("?token=");
    expect(
      (summary.extraction as Record<string, unknown>).sourceHost
    ).toBeUndefined();
    expect(
      (summary.replaySummary as Record<string, unknown>).tasks
    ).toBeUndefined();
  });

  it("runs the sidecar successfully from the Tauri-like cwd with absolute args", async () => {
    const workspaceRoot = await createTempWorkspace();
    const result = await runNodeScript(
      [
        appScriptRunnerPath,
        "--workspace",
        workspaceRoot,
        "--payload",
        fixturePath,
        "--filename",
        "tauri-cwd.csv"
      ],
      {
        cwd: path.join(appRoot, "src-tauri")
      }
    );
    const summary = JSON.parse(result.stdout) as DesktopFlowResult;

    expect(result.code).toBe(0);
    expect(summary.draft.relativePath).toBe("drafts/tauri-cwd.csv");
    expect(summary.replaySummary.draftCount).toBe(1);
    expect(result.stderr).toBe("");
  });

  it("runs the offline app preflight script", async () => {
    const result = await runNodeScript([appPreflightScriptPath]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Desktop runner preflight");
    expect(result.stdout).toContain("status: PASS");
    expect(result.stdout).not.toContain("csvContent");
    expect(result.stderr).toBe("");
  });
});

describe("desktop flow integration", () => {
  it("runs the runtime flow for a fixture and writes under workspace/drafts", async () => {
    const workspaceRoot = await createTempWorkspace();
    const payload = await readFixture();

    const result = await runWebTableToCsvFlow({
      workspaceRoot,
      payload,
      filename: "desktop-table.csv"
    });

    expect(result.draft.relativePath).toBe("drafts/desktop-table.csv");
    expect(result.extraction.rowCount).toBeGreaterThan(0);
    expect(result.replaySummary.draftCount).toBe(1);
    await expect(access(result.draft.absolutePath)).resolves.toBeUndefined();
  });
});

describe("app control-plane projection view", () => {
  it("builds an empty read-only projection for no event summary", () => {
    const view = buildControlPlaneProjectionView(undefined);

    expect(view).toMatchObject({
      status: "empty",
      runStatus: "created",
      intent: "web_data_extraction",
      phase: "intake",
      source: "empty"
    });
    expect(view.nextAction.label).toBe(
      "Run Convert first, then refresh events."
    );
  });

  it("projects a successful conversion event summary as completed web extraction", () => {
    const result = fixedResult("D:\\workspace");
    const view = buildControlPlaneProjectionView(
      fixedEventSummary(),
      result,
      fixedPreflight()
    );

    expect(view.status).toBe("projected");
    expect(view.runStatus).toBe("completed");
    expect(view.intent).toBe("web_data_extraction");
    expect(view.phase).toBe("result");
    expect(view.draftCount).toBe(1);
    expect(view.artifactRefs).toContainEqual(
      expect.objectContaining({
        relativePath: "drafts/table.csv",
        source: "conversion_result"
      })
    );
  });

  it("preserves the previous projection shape for FILE_EXISTS and gives safe next action", () => {
    const view = buildControlPlaneProjectionView(
      fixedEventSummary(),
      undefined,
      fixedPreflight(),
      {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists: drafts/table.csv. Choose a new draft filename or remove the existing file."
      }
    );

    expect(view.status).toBe("warning");
    expect(view.runStatus).toBe("completed");
    expect(view.artifactRefs).toContainEqual(
      expect.objectContaining({ relativePath: "drafts/table.csv" })
    );
    expect(view.nextAction.label).toBe(
      "Choose a new draft filename or remove the existing file."
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "FILE_EXISTS"
    );
  });

  it("handles malformed event summaries without throwing", () => {
    const view = buildControlPlaneProjectionView({
      ok: true,
      eventCount: Number.NaN,
      displayedEventCount: Number.NaN,
      taskCount: Number.NaN,
      completedTaskCount: Number.NaN,
      draftCount: Number.NaN,
      typeCounts: null,
      timeline: null,
      safetyScan: null,
      warnings: null
    } as unknown as WorkspaceEventSummary);

    expect(view.timelineCount).toBe(0);
    expect(view.taskCount).toBe(0);
    expect(view.completedTaskCount).toBe(0);
    expect(view.nextAction.label).toContain("Convert");
  });

  it("shows safety warning codes only and redacts unsafe messages", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildControlPlaneProjectionView(
      fixedEventSummary({
        ok: false,
        safeMessage: `Event summary failed ${secret}`,
        safetyScan: {
          ok: false,
          findings: 1,
          warningCodes: ["PASSWORD_VALUE_MARKER", `raw match ${secret}`]
        }
      })
    );
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("error");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "PASSWORD_VALUE_MARKER"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "EVENT_SUMMARY_WARNING"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("raw match");
  });

  it("keeps projection summaries free of raw CSV, raw payload, and API keys", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildControlPlaneProjectionView(
      fixedEventSummary({
        warnings: ["MALFORMED_EVENT_SUMMARY"],
        timeline: [
          {
            id: "event-1",
            ts: "2026-06-16T00:00:00.000Z",
            type: "fs.draft_written",
            taskId: "task-1",
            summary: "draft written: drafts/table.csv · 42 bytes · text/csv",
            safePayloadKeys: ["relativePath"]
          }
        ],
        safeMessage: `Safe message with ${secret}`
      })
    );
    const serialized = JSON.stringify(view);

    expect(serialized).toContain("drafts/table.csv");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("csvContent");
    expect(serialized).not.toContain("rawPayload");
    expect(serialized).not.toContain("rawDom");
  });
});

describe("app approval diff audit surfaces", () => {
  it("builds empty read-only approval and diff surfaces", () => {
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({ controlProjection });

    expect(surfaces.readOnly).toBe(true);
    expect(surfaces.executionEnabled).toBe(false);
    expect(surfaces.approval.status).toBe("empty");
    expect(surfaces.approval.emptyMessage).toBe(
      "No approvals yet. Future patch, capability, git, and shell proposals will appear here as summaries before any execution gate."
    );
    expect(surfaces.diff.status).toBe("empty");
    expect(surfaces.diff.emptyMessage).toBe(
      "No patch proposals yet. Future code changes will appear here as reviewable diffs before apply."
    );
  });

  it("maps event summary counts into the audit surface", () => {
    const eventSummary = fixedEventSummary();
    const controlProjection = buildControlPlaneProjectionView(eventSummary);
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection
    });

    expect(surfaces.audit.status).toBe("summary");
    expect(surfaces.audit.eventCount).toBe(2);
    expect(surfaces.audit.displayedEventCount).toBe(2);
    expect(surfaces.audit.timelineCount).toBe(1);
    expect(surfaces.audit.safetyStatus).toBe("ok");
    expect(surfaces.audit.lastEventAt).toBe("2026-06-16T00:00:01.000Z");
  });

  it("projects verification replay summaries into audit evidence refs", () => {
    const eventSummary = fixedVerificationEventSummary();
    const verificationProjection =
      buildVerificationLaneProjectionView(eventSummary);
    const controlProjection = buildControlPlaneProjectionView(eventSummary);
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      verificationLaneProjection: verificationProjection,
      futureAuditWarningCodes: verificationLaneProjectionWarningCodes(
        verificationProjection
      )
    });

    expect(verificationProjection.status).toBe("projected");
    expect(verificationProjection.latestGitChangedFileCount).toBe(2);
    expect(verificationProjection.latestShellStatus).toBe("pass");
    expect(verificationProjection.evidenceRefCount).toBe(2);
    expect(verificationProjection.readiness.canExecuteGit).toBe(false);
    expect(verificationProjection.readiness.canExecuteShell).toBe(false);
    expect(
      summarizeVerificationLaneProjectionView(verificationProjection)
    ).toContain("events:2");
    expect(surfaces.audit.verificationEventCount).toBe(2);
    expect(surfaces.audit.verificationEvidenceRefCount).toBe(2);
    expect(surfaces.audit.latestVerificationStatus).toBe("pass");
    expect(JSON.stringify(verificationProjection)).not.toContain("diff --git");
    expect(JSON.stringify(verificationProjection)).not.toContain("sk-test");
  });

  it("keeps missing or malformed verification projections safe", () => {
    const empty = buildVerificationLaneProjectionView();
    const malformed = buildVerificationLaneProjectionView(
      fixedVerificationEventSummary({
        timeline: [],
        displayedEventCount: 0
      })
    );

    expect(empty.status).toBe("empty");
    expect(empty.readiness.canWriteEventStore).toBe(false);
    expect(malformed.status).toBe("warning");
    expect(malformed.warningCodes).toContain("VERIFICATION_TIMELINE_MISSING");
    expect(malformed.readiness.appCanExecute).toBe(false);
  });

  it("blocks raw verification summaries without echoing raw output", () => {
    const blocked = buildVerificationLaneProjectionView(
      fixedVerificationEventSummary({
        timeline: [
          {
            id: "bad-verification-event",
            ts: "2026-06-25T00:00:03.000Z",
            type: "shell.verification_lane.executed",
            summary: "rawStdout should never become evidence",
            safePayloadKeys: []
          }
        ]
      })
    );
    const serialized = JSON.stringify(blocked);

    expect(blocked.status).toBe("blocked");
    expect(blocked.warningCodes).toContain("VERIFICATION_RAW_OUTPUT_MARKER");
    expect(blocked.evidenceRefCount).toBe(0);
    expect(serialized).not.toContain("rawStdout should never become evidence");
    expect(blocked.readiness.canUseAsEvidenceRef).toBe(false);
  });

  it("updates audit surface from conversion result and event summary", () => {
    const eventSummary = fixedEventSummary({ eventCount: 3 });
    const result = fixedResult("D:\\workspace");
    const controlProjection = buildControlPlaneProjectionView(
      eventSummary,
      result
    );
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      conversionResult: result
    });

    expect(controlProjection.runStatus).toBe("completed");
    expect(surfaces.audit.status).toBe("summary");
    expect(surfaces.audit.eventCount).toBe(3);
    expect(surfaces.audit.nextAction).toContain("Event Log / Replay");
  });

  it("keeps prior surface state for FILE_EXISTS with actionable next action", () => {
    const eventSummary = fixedEventSummary();
    const controlProjection = buildControlPlaneProjectionView(
      eventSummary,
      undefined,
      fixedPreflight(),
      {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists: drafts/table.csv. Choose a new draft filename or remove the existing file."
      }
    );
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      conversionError: {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists: drafts/table.csv. Choose a new draft filename or remove the existing file."
      }
    });

    expect(controlProjection.runStatus).toBe("completed");
    expect(surfaces.audit.eventCount).toBe(2);
    expect(surfaces.audit.warningCodes).toContain("FILE_EXISTS");
    expect(surfaces.audit.nextAction).toBe(
      "Choose a new draft filename or remove the existing file."
    );
  });

  it("summarizes future refs without raw source or secrets", () => {
    const secret = "sk-test1234567890abcdef";
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection,
      futureApprovalRefs: [
        {
          id: "approval-1",
          kind: "patch",
          status: "pending",
          summary: `Approve summary with ${secret}`
        }
      ],
      futurePatchRefs: [
        {
          id: "patch-1",
          fileCount: 1,
          linesAdded: 2,
          linesRemoved: 1,
          summary: `Diff summary with raw source ${secret}`
        }
      ]
    });
    const serialized = JSON.stringify(surfaces);

    expect(surfaces.approval.status).toBe("pending");
    expect(surfaces.diff.status).toBe("summary");
    expect(surfaces.diff.fileCount).toBe(1);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPayload");
    expect(serialized).not.toContain("csvContent");
    expect(serialized).not.toContain("rawDom");
  });

  it("keeps web table conversion from creating patch proposals in diff surface", () => {
    const eventSummary = fixedEventSummary();
    const result = fixedResult("D:\\workspace");
    const controlProjection = buildControlPlaneProjectionView(
      eventSummary,
      result
    );
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      conversionResult: result
    });

    expect(surfaces.diff.status).toBe("empty");
    expect(surfaces.diff.items).toHaveLength(0);
    expect(surfaces.diff.fileCount).toBe(0);
    expect(surfaces.diff.nextAction).toBe(
      "No patch proposals yet. Future code changes will appear here as reviewable diffs before apply."
    );
  });

  it("maps synthetic patch proposal summaries into the diff surface", () => {
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection,
      patchProposalSummaries: [
        {
          proposalId: "proposal-1",
          taskId: "task-1",
          title: "Update parser summary",
          status: "simulated",
          riskLevel: "A2_draft_write",
          requiresApproval: true,
          filesChanged: 2,
          filesCreated: 1,
          filesUpdated: 1,
          filesDeleted: 0,
          linesAdded: 14,
          linesRemoved: 3,
          pathSummaries: ["app/src/App.tsx", "app/src/workbench-surfaces.ts"],
          hash: "patch-hash-1",
          fingerprint: "patch-fingerprint-1",
          suggestedNextAction: "Patch apply is not enabled."
        }
      ]
    });

    expect(surfaces.diff.status).toBe("summary");
    expect(surfaces.diff.fileCount).toBe(2);
    expect(surfaces.diff.linesAdded).toBe(14);
    expect(surfaces.diff.linesRemoved).toBe(3);
    expect(surfaces.diff.items[0]?.proposalId).toBe("proposal-1");
    expect(surfaces.diff.items[0]?.requiresApproval).toBe(true);
    expect(surfaces.diff.items[0]?.pathSummaries).toEqual([
      "app/src/App.tsx",
      "app/src/workbench-surfaces.ts"
    ]);
  });

  it("maps synthetic patch audit warnings as warning codes only", () => {
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection,
      patchAuditReports: [
        {
          auditId: "audit-1",
          proposalId: "proposal-1",
          decision: "needs_approval",
          riskLevel: "A2_draft_write",
          pathWarnings: ["secret_marker:app/src/App.tsx"],
          contentWarnings: ["raw_marker"],
          hash: "audit-hash-1",
          suggestedNextAction: "request_changes"
        }
      ]
    });
    const serialized = JSON.stringify(surfaces);

    expect(surfaces.diff.status).toBe("warning");
    expect(surfaces.diff.warnings).toContain("SECRET_MARKER");
    expect(surfaces.diff.warnings).toContain("RAW_MARKER");
    expect(serialized).not.toContain("app/src/App.tsx");
    expect(serialized).not.toContain("secret_marker:app/src/App.tsx");
  });

  it("strips raw patch content fields from patch proposal surface view", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildPatchProposalSurfaceView({
      patchProposalSummaries: [
        {
          proposalId: "proposal-raw",
          taskId: "task-raw",
          title: `raw source ${secret}`,
          beforeContent: "const beforeSecret = true;",
          afterContent: `const token = "${secret}";`,
          rawPatch: "raw patch body",
          filesChanged: 1,
          linesAdded: 1,
          linesRemoved: 1,
          pathSummaries: ["runtime/src/index.ts"],
          hash: "hash-raw"
        }
      ]
    });
    const serialized = JSON.stringify(view);

    expect(view.items[0]?.title).toContain("[redacted-raw]");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("const beforeSecret");
    expect(serialized).not.toContain("raw patch body");
  });
});

describe("app memory inspector skeleton", () => {
  it("builds an empty read-only memory inspector view", () => {
    const view = buildMemoryInspectorView();

    expect(view.status).toBe("empty");
    expect(view.readOnly).toBe(true);
    expect(view.persistenceConnected).toBe(false);
    expect(view.typeCounts).toEqual({
      policy: 0,
      project_fact: 0,
      pitfall: 0
    });
    expect(view.candidateCount).toBe(0);
    expect(view.committedCount).toBe(0);
    expect(view.emptyMessages).toContain(
      "No memory records are connected to the desktop shell yet."
    );
    expect(view.emptyMessages).toContain(
      "Runtime Memory Core is available, but this inspector is read-only and not connected to persistence."
    );
  });

  it("counts policy project_fact and pitfall summaries", () => {
    const view = buildMemoryInspectorView({
      memorySummaries: [
        {
          memoryId: "mem-policy",
          type: "policy",
          status: "committed",
          summary: "Always keep bridge transport disabled by default."
        },
        {
          memoryId: "mem-pitfall",
          type: "pitfall",
          status: "revoked",
          summary: "Stale dry harness docs can confuse release state."
        }
      ],
      memoryRecallItems: [
        {
          memoryId: "mem-fact",
          type: "project_fact",
          status: "recalled",
          summary: "Desktop shell uses manual payload import."
        }
      ],
      memoryCandidates: [
        {
          candidateId: "candidate-pitfall",
          proposedType: "pitfall",
          proposedSummary: "Candidate summary only."
        }
      ]
    });

    expect(view.status).toBe("summary");
    expect(view.typeCounts).toEqual({
      policy: 1,
      project_fact: 1,
      pitfall: 2
    });
    expect(view.committedCount).toBe(1);
    expect(view.recalledCount).toBe(1);
    expect(view.revokedCount).toBe(1);
    expect(view.candidateCount).toBe(1);
  });

  it("keeps memory candidates summary-only and commit-gated", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildMemoryInspectorView({
      memoryCandidates: [
        {
          candidateId: "candidate-1",
          proposedType: "project_fact",
          status: "candidate",
          proposedSummary: `rawPrompt should not appear ${secret}`,
          source: "model",
          trustLevel: "model_suggested",
          reason: "Future candidate only"
        }
      ]
    });
    const serialized = JSON.stringify(view);

    expect(view.candidates[0]?.proposedSummary).toBe(
      "Summary withheld by safety policy."
    );
    expect(view.nextAction).toContain("Commit gate UI is not enabled");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("full content");
  });

  it("keeps memory item summaries free of raw content markers", () => {
    const view = buildMemoryInspectorView({
      memorySummaries: [
        {
          memoryId: "memory-1",
          type: "policy",
          status: "committed",
          trustLevel: "explicit_user",
          namespace: "desktop",
          summary: "Authorization header and clipboard details must not render",
          tags: ["safe", "rawDom marker"],
          provenanceRefCount: 1,
          evidenceRefCount: 2
        }
      ]
    });
    const serialized = JSON.stringify(view);

    expect(view.items[0]?.summary).toBe("Summary withheld by safety policy.");
    expect(view.items[0]?.tags).toContain("Summary withheld by safety policy.");
    expect(serialized).not.toContain("Authorization header");
    expect(serialized).not.toContain("clipboard");
    expect(serialized).not.toContain("rawDom");
  });

  it("preserves memory inspector state around refresh and FILE_EXISTS", () => {
    const eventSummary = fixedEventSummary({ eventCount: 4 });
    const empty = buildMemoryInspectorView({ eventSummary });
    const fileExists = buildMemoryInspectorView({
      eventSummary,
      conversionError: {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists. Choose a new draft filename or remove the existing file."
      }
    });

    expect(empty.status).toBe("empty");
    expect(empty.typeCounts.policy).toBe(0);
    expect(fileExists.status).toBe("warning");
    expect(fileExists.typeCounts.policy).toBe(0);
    expect(fileExists.warnings.map((warning) => warning.code)).toContain(
      "FILE_EXISTS"
    );
    expect(fileExists.nextAction).toBe(
      "Choose a new draft filename or remove the existing file."
    );
  });
});

describe("app chat run canvas skeleton", () => {
  it("builds empty draft-only chat run canvas view", () => {
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({ controlProjection });
    const memoryInspector = buildMemoryInspectorView();
    const view = buildChatRunCanvasView({
      controlProjection,
      memoryInspector,
      approvalDiffAuditSurfaces: surfaces
    });

    expect(view.status).toBe("empty");
    expect(view.source).toBe("local_state_only");
    expect(view.canCreateRun).toBe(false);
    expect(view.canSendToModel).toBe(false);
    expect(view.intent).toBe("unknown");
    expect(view.objectiveSummary).toBe("No objective draft yet.");
    expect(view.acceptanceCriteriaCount).toBe(0);
    expect(view.nextAction.label).toContain("No LLM request is sent");
  });

  it("builds local draft preview without enabling run or model send", () => {
    const eventSummary = fixedEventSummary({ eventCount: 5 });
    const result = fixedResult("D:\\workspace");
    const controlProjection = buildControlPlaneProjectionView(
      eventSummary,
      result
    );
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      conversionResult: result
    });
    const memoryInspector = buildMemoryInspectorView({ eventSummary });
    const view = buildChatRunCanvasView({
      objectiveDraft: "Export the visible table and inspect the summaries.",
      selectedIntent: "web_data_extraction",
      acceptanceCriteriaDraft: "CSV exists\nEvent summary updates",
      workspaceRoot: "D:\\workspace",
      controlProjection,
      eventSummary,
      conversionResult: result,
      memoryInspector,
      approvalDiffAuditSurfaces: surfaces
    });

    expect(view.status).toBe("ready_preview");
    expect(view.intent).toBe("web_data_extraction");
    expect(view.acceptanceCriteriaCount).toBe(2);
    expect(view.contextHintCount).toBeGreaterThan(0);
    expect(view.canCreateRun).toBe(false);
    expect(view.canSendToModel).toBe(false);
    expect(view.runCanvas.runStatus).toBe("completed");
    expect(view.runCanvas.eventCount).toBe(5);
    expect(view.runCanvas.auditStatus).toBe("summary");
    expect(view.runCanvas.memoryStatus).toBe("empty");
  });

  it("warns on fake API key and raw data markers without exposing summary", () => {
    const secret = "sk-test1234567890abcdef";
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({ controlProjection });
    const memoryInspector = buildMemoryInspectorView();
    const view = buildChatRunCanvasView({
      objectiveDraft: `Inspect rawDom and raw CSV without keeping ${secret}`,
      acceptanceCriteriaDraft: "rawPrompt is withheld",
      controlProjection,
      memoryInspector,
      approvalDiffAuditSurfaces: surfaces
    });
    const serialized = JSON.stringify(view);

    expect(view.warnings).toContain("API_KEY_MARKER");
    expect(view.warnings).toContain("RAW_DOM_MARKER");
    expect(view.warnings).toContain("RAW_CSV_MARKER");
    expect(view.warnings).toContain("RAW_PROMPT_MARKER");
    expect(view.objectiveSummary).toBe(
      "Draft summary withheld by safety policy."
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawDom");
    expect(serialized).not.toContain("rawPrompt");
  });

  it("keeps FILE_EXISTS actionable without creating a run", () => {
    const eventSummary = fixedEventSummary();
    const controlProjection = buildControlPlaneProjectionView(eventSummary);
    const surfaces = buildWorkbenchSurfacesView({
      eventSummary,
      controlProjection,
      conversionError: {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists. Choose a new draft filename or remove the existing file."
      }
    });
    const memoryInspector = buildMemoryInspectorView({ eventSummary });
    const view = buildChatRunCanvasView({
      objectiveDraft: "Try another file name.",
      selectedIntent: "web_data_extraction",
      controlProjection,
      eventSummary,
      conversionError: {
        errorCode: "FILE_EXISTS",
        safeMessage:
          "Draft already exists. Choose a new draft filename or remove the existing file."
      },
      memoryInspector,
      approvalDiffAuditSurfaces: surfaces
    });

    expect(view.canCreateRun).toBe(false);
    expect(view.nextAction.label).toBe(
      "Choose a new draft filename or remove the existing file."
    );
    expect(view.runCanvas.auditStatus).toBe("warning");
  });
});

describe("app control plane run draft preview", () => {
  it("returns an empty local draft when the objective is empty", () => {
    const view = buildRunDraftView({
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Tests pass",
      workspaceRoot: "D:\\workspace"
    });

    expect(view.status).toBe("empty");
    expect(view.mode).toBe("local_draft");
    expect(view.previewOnly).toBe(true);
    expect(view.canPreview).toBe(false);
    expect(view.canCreateRun).toBe(false);
    expect(view.canSendToModel).toBe(false);
    expect(view.objectiveSummary).toBe("No objective draft yet.");
  });

  it("builds a safe local run draft preview without creating a real run", () => {
    const eventSummary = fixedEventSummary({ eventCount: 4 });
    const controlProjection = buildControlPlaneProjectionView(eventSummary);
    const view = buildRunDraftView({
      objectiveDraft: "Prepare a small parser refactor plan.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Tests pass\nDiff summary is safe",
      workspaceRoot: "D:\\workspace\\demo",
      controlProjection,
      eventSummary,
      idGenerator: () => "local-draft-test"
    });
    const summary = summarizeRunDraft(view);

    expect(view.draftId).toBe("local-draft-test");
    expect(view.status).toBe("draft_ready");
    expect(view.canPreview).toBe(true);
    expect(view.intent).toBe("code_change");
    expect(view.acceptanceCriteriaCount).toBe(2);
    expect(view.workspaceRootSummary).toBe(".../demo");
    expect(view.warnings).toHaveLength(0);
    expect(summary).toContain("preview_only=yes");
    expect(summary).toContain("intent=code_change");
  });

  it("uses warning codes for fake API key markers without exposing raw values", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildRunDraftView({
      objectiveDraft: `Review a draft that includes ${secret}`,
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "Summary is safe",
      workspaceRoot: "D:\\workspace"
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("draft_blocked");
    expect(view.canPreview).toBe(false);
    expect(view.safety.warningCodes).toContain("API_KEY_MARKER");
    expect(view.objectiveSummary).toBe(
      "Draft summary withheld by safety policy."
    );
    expect(serialized).not.toContain(secret);
  });

  it("detects raw prompt, DOM, CSV, screenshot, and clipboard markers", () => {
    const view = buildRunDraftView({
      objectiveDraft:
        "Inspect rawPrompt, rawDom, rawCsv, rawScreenshot, and clipboard markers.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "warning codes only",
      workspaceRoot: "D:\\workspace"
    });
    const warningCodes = view.warnings.map((warning) => warning.code);
    const serialized = JSON.stringify(view);

    expect(warningCodes).toContain("RAW_PROMPT_MARKER");
    expect(warningCodes).toContain("RAW_DOM_MARKER");
    expect(warningCodes).toContain("RAW_CSV_MARKER");
    expect(warningCodes).toContain("RAW_SCREENSHOT_MARKER");
    expect(warningCodes).toContain("CLIPBOARD_MARKER");
    expect(serialized).not.toContain("rawPrompt, rawDom");
  });

  it("summarizes unsafe acceptance criteria without copying raw values", () => {
    const view = buildRunDraftView({
      objectiveDraft: "Preview a verification task.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft:
        "Keep rawPrompt and Authorization: Bearer hidden from summaries",
      workspaceRoot: "D:\\workspace"
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("draft_blocked");
    expect(view.safety.warningCodes).toContain("AUTHORIZATION_HEADER_MARKER");
    expect(view.safety.warningCodes).toContain("RAW_PROMPT_MARKER");
    expect(view.acceptanceCriteria.summaries).toEqual([
      "Acceptance criteria summary withheld by safety policy."
    ]);
    expect(serialized).not.toContain("Authorization: Bearer");
    expect(serialized).not.toContain("rawPrompt");
  });

  it("allows preview with clarification warnings for unknown intent", () => {
    const view = buildRunDraftView({
      objectiveDraft: "Plan the next local-only step.",
      selectedIntent: "unknown",
      acceptanceCriteriaDraft: "Preview exists",
      workspaceRoot: "D:\\workspace"
    });
    const warningCodes = view.warnings.map((warning) => warning.code);

    expect(view.status).toBe("warning");
    expect(view.canPreview).toBe(true);
    expect(warningCodes).toContain("INTENT_UNKNOWN_NEEDS_CLARIFICATION");
    expect(view.proposedPhases.map((phase) => phase.id)).toEqual([
      "intake",
      "clarification"
    ]);
  });

  it("warns but still previews when acceptance criteria or workspace are empty", () => {
    const view = buildRunDraftView({
      objectiveDraft: "Draft a local documentation task.",
      selectedIntent: "documentation"
    });
    const warningCodes = view.warnings.map((warning) => warning.code);

    expect(view.status).toBe("warning");
    expect(view.canPreview).toBe(true);
    expect(warningCodes).toContain("ACCEPTANCE_CRITERIA_EMPTY");
    expect(warningCodes).toContain("WORKSPACE_ROOT_EMPTY");
  });

  it("plans code_change future phases without execution", () => {
    const view = buildRunDraftView({
      objectiveDraft: "Prepare a code change draft.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Diff summary exists",
      workspaceRoot: "D:\\workspace"
    });

    expect(view.proposedPhases.map((phase) => phase.id)).toEqual([
      "intake",
      "context",
      "routing",
      "capability_planning",
      "approval",
      "diff",
      "audit"
    ]);
    expect(view.expectedSurfaces).toContain("Diff Surface");
    expect(view.nextAction).toContain("No run is created");
  });

  it("plans web data extraction phases without coder execution", () => {
    const view = buildRunDraftView({
      objectiveDraft: "Export a table to CSV.",
      selectedIntent: "web_data_extraction",
      acceptanceCriteriaDraft: "CSV exists",
      workspaceRoot: "D:\\workspace"
    });
    const phases = view.proposedPhases.map((phase) => phase.id);
    const serialized = JSON.stringify(view);

    expect(phases).toEqual([
      "intake",
      "context",
      "execution_plan",
      "result",
      "audit"
    ]);
    expect(phases).not.toContain("routing");
    expect(serialized).not.toContain("coder");
  });
});

describe("app run draft event preview", () => {
  it("builds a summary-only draft event payload from a safe local run draft", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a code change plan.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Tests pass\nDiff summary exists",
      workspaceRoot: "D:\\workspace",
      idGenerator: () => "local-draft-event-test"
    });
    const workspaceIndex = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
    const preview = buildRunDraftEventPayload({
      runDraft,
      workspaceRoot: "D:\\workspace",
      workspaceIndexRef: workspaceIndex,
      createdAt: "2026-06-21T00:00:00.000Z"
    });

    expect(preview.status).toBe("ready");
    expect(preview.canRecord).toBe(true);
    expect(preview.payload).toMatchObject({
      eventKind: "control.run.draft_recorded",
      draftId: "local-draft-event-test",
      localTaskId: "local-task-local-draft-event-test",
      intent: "code_change",
      objectiveSummary: "Prepare a code change plan.",
      acceptanceCriteriaCount: 2,
      schemaVersion: 1,
      previewOnly: true,
      localOnly: true,
      noExecution: true
    });
    expect(preview.payload?.workspaceRootHash).toMatch(/^workspace-/);
    expect(preview.payload?.workspaceIndexRef).toMatchObject({
      fileCount: 3,
      indexedFileCount: 2,
      skippedFileCount: 1
    });
    expect(JSON.stringify(preview)).not.toContain("objectiveDraft");
    expect(JSON.stringify(preview)).not.toContain("acceptanceCriteriaDraft");
  });

  it("blocks event payloads for blocked drafts or missing workspace", () => {
    const blockedDraft = buildRunDraftView({
      objectiveDraft: "Keep rawPrompt out of events.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "safe",
      workspaceRoot: "D:\\workspace"
    });
    const blockedPreview = buildRunDraftEventPayload({
      runDraft: blockedDraft,
      workspaceRoot: "D:\\workspace"
    });
    const safeDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local preview.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "safe"
    });
    const missingWorkspace = buildRunDraftEventPayload({ runDraft: safeDraft });

    expect(blockedPreview.status).toBe("blocked");
    expect(blockedPreview.canRecord).toBe(false);
    expect(blockedPreview.warnings.map((warning) => warning.code)).toContain(
      "RAW_PROMPT_MARKER"
    );
    expect(missingWorkspace.status).toBe("blocked");
    expect(missingWorkspace.warnings.map((warning) => warning.code)).toContain(
      "WORKSPACE_ROOT_REQUIRED"
    );
  });

  it("rejects raw fields and secret markers in draft event payloads", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local preview.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "safe",
      workspaceRoot: "D:\\workspace",
      idGenerator: () => "local-draft-safe"
    });
    const preview = buildRunDraftEventPayload({
      runDraft,
      workspaceRoot: "D:\\workspace"
    });
    if (preview.payload === undefined) {
      throw new Error("expected payload");
    }
    const withRawField = {
      ...preview.payload,
      rawPrompt: "do not store"
    } as typeof preview.payload;
    const withSecret = {
      ...preview.payload,
      objectiveSummary: "sk-test1234567890abcdef"
    };

    expect(validateRunDraftEventPayload(withRawField)).toMatchObject({
      ok: false,
      errorCode: "RAW_FIELD_REJECTED"
    });
    expect(validateRunDraftEventPayload(withSecret)).toMatchObject({
      ok: false,
      errorCode: "UNSAFE_MARKER_REJECTED"
    });
  });

  it("records draft events only through the fixed allowlisted desktop command", async () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local preview.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "safe",
      workspaceRoot: "D:\\workspace",
      idGenerator: () => "local-draft-record"
    });
    const preview = buildRunDraftEventPayload({
      runDraft,
      workspaceRoot: "D:\\workspace"
    });
    if (preview.payload === undefined) {
      throw new Error("expected payload");
    }
    const invoke: TauriInvoke = async (command, args) => {
      expect(command).toBe("record_control_run_draft_event");
      expect(args?.workspaceRoot).toBe("D:\\workspace");
      expect(typeof args?.payloadJson).toBe("string");
      expect(args?.payloadJson).not.toContain("objectiveDraft");
      return {
        ok: true,
        eventId: "control-run-draft-test",
        eventType: "control.run.draft_recorded",
        draftId: "local-draft-record",
        eventLogPath: "D:\\workspace\\.deepseek-workbench\\events.jsonl",
        safeMessage:
          "Summary-only draft event recorded locally. No run was created.",
        warnings: []
      } as never;
    };
    const result = await recordControlRunDraftEvent(
      {
        workspaceRoot: "D:\\workspace",
        payload: preview.payload
      },
      invoke
    );

    expect(isAllowedDesktopCommand("record_control_run_draft_event")).toBe(
      true
    );
    expect(result.ok).toBe(true);
    expect(summarizeRunDraftEventResult(result)).toContain(
      "No run was created"
    );
  });

  it("projects draft events without marking a run completed", () => {
    const summary = fixedEventSummary({
      eventCount: 1,
      displayedEventCount: 1,
      taskCount: 0,
      completedTaskCount: 0,
      draftCount: 0,
      typeCounts: {
        "control.run.draft_recorded": 1
      },
      timeline: [
        {
          id: "control-run-draft-test",
          ts: "unix-ms-1",
          type: "control.run.draft_recorded",
          taskId: "local-task-local-draft-test",
          summary:
            "draft event recorded: code_change · Prepare a safe plan. · 2 criteria",
          safePayloadKeys: ["draftId", "intent", "objectiveSummary"]
        }
      ]
    });
    const eventPanel = buildEventLogPanelModel(summary);
    const projection = buildControlPlaneProjectionView(summary);

    expect(eventPanel?.eventCount).toBe(1);
    expect(eventPanel?.draftCount).toBe(0);
    expect(projection.draftEventCount).toBe(1);
    expect(projection.completedTaskCount).toBe(0);
    expect(projection.runStatus).toBe("planned");
    expect(projection.nextAction.label).toContain(
      "Real run creation is still disabled"
    );
    expect(JSON.stringify(projection)).not.toContain("rawPrompt");
  });
});

describe("app context cart rules ledger visualization", () => {
  it("builds an empty read-only context cart skeleton", () => {
    const view = buildContextCartView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.readOnly).toBe(true);
    expect(view.totalSegments).toBe(0);
    expect(view.totalTokenEstimate).toBe(0);
    expect(view.layers).toHaveLength(6);
    expect(view.frozenPrefixHash).toBe("n/a");
    expect(view.volatileTailHash).toBe("n/a");
    expect(view.noCompressZoneCount).toBe(0);
    expect(view.nextAction).toContain("No context assembly report");
  });

  it("maps synthetic context summaries to layer, hash, and placement counts", () => {
    const view = buildContextCartView({
      contextAssemblyReport: {
        source: "synthetic_summary",
        segmentCountByLayer: {
          immutable_rules: 1,
          workspace_rules: 2,
          task_contract: 1,
          volatile_tail: 3,
          no_compress_zone: 2
        },
        tokenEstimatesByLayer: {
          immutable_rules: 10,
          workspace_rules: 20,
          task_contract: 30,
          volatile_tail: 40,
          no_compress_zone: 50
        },
        hashSummary: {
          globalFrozenPrefixHash: "frozenprefix1234567890",
          workspaceRulesHash: "workspacehash1234567890",
          taskContractHash: "taskcontract1234567890",
          volatileTailHash: "volatiletail1234567890",
          noCompressZoneHash: "nocompress1234567890"
        },
        noCompressZoneIds: ["approval-1", "diff-1"],
        placementDecisions: [
          {
            segmentId: "rule-1",
            layer: "immutable_rules",
            placement: "frozen_prefix",
            reasonCode: "IMMUTABLE_RULE"
          },
          {
            segmentId: "memory-1",
            layer: "volatile_tail",
            placement: "volatile_tail",
            reasonCode: "MEMORY_RECALL_VOLATILE"
          }
        ],
        warnings: ["CACHE_BOUNDARY_REVIEW"]
      }
    });

    expect(view.status).toBe("warning");
    expect(view.source).toBe("synthetic_summary");
    expect(view.totalSegments).toBe(9);
    expect(view.totalTokenEstimate).toBe(150);
    expect(view.frozenPrefixHash).toBe("frozenprefix");
    expect(view.workspaceRulesHash).toBe("workspacehas");
    expect(view.taskContractHash).toBe("taskcontract");
    expect(view.volatileTailHash).toBe("volatiletail");
    expect(view.noCompressZoneHash).toBe("nocompress12");
    expect(view.noCompressZoneCount).toBe(2);
    expect(view.placementDecisionCount).toBe(2);
    expect(
      view.layers.find((layer) => layer.layer === "volatile_tail")
    ).toMatchObject({ segmentCount: 3, tokenEstimate: 40, volatileOnly: true });
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "CACHE_BOUNDARY_REVIEW"
    );
  });

  it("drops raw segment content and unsafe marker summaries", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildContextCartView({
      contextAssemblyReport: {
        source: "synthetic_summary",
        segments: [
          {
            id: "segment-raw",
            layer: "task_contract",
            title: `Do not show ${secret}`,
            source: "task",
            content: "rawPrompt should never render"
          }
        ],
        hashSummary: {
          taskContractHash: "taskcontractabcdef"
        }
      }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("warning");
    expect(view.segmentSummaries[0]?.title).toBe(
      "Summary withheld by safety policy."
    );
    expect(view.segmentSummaries[0]?.warningCodes).toContain(
      "RAW_CONTEXT_FIELD_DROPPED"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("should never render");
  });

  it("shows run draft relationship as next action only without assembly", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Preview a code change.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Summary only",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildContextCartView({ runDraft });

    expect(view.status).toBe("warning");
    expect(view.totalSegments).toBe(0);
    expect(view.placementDecisionCount).toBe(0);
    expect(view.nextAction).toContain("derive task_contract");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "RUN_DRAFT_CONTEXT_PENDING"
    );
  });

  it("marks memory recalls as volatile-tail relationship only", () => {
    const memoryInspector = buildMemoryInspectorView({
      memoryRecallItems: [
        {
          memoryId: "memory-1",
          type: "project_fact",
          status: "recalled",
          trustLevel: "verified_tool_result",
          namespace: "workspace",
          summary: "Safe summary only"
        }
      ]
    });
    const view = buildContextCartView({ memoryInspector });

    expect(view.status).toBe("warning");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "MEMORY_RECALL_VOLATILE_TAIL"
    );
    expect(JSON.stringify(view)).not.toContain("full content");
  });
});

describe("app context assembly preview", () => {
  it("builds an empty local preview without prompt assembly", () => {
    const view = buildContextAssemblyPreviewView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.promptAssemblyEnabled).toBe(false);
    expect(view.modelRequestEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.totalSegments).toBe(0);
    expect(view.cacheBoundary.status).toBe("unavailable");
  });

  it("maps a run draft into task_contract without exposing raw objective text", () => {
    const objective = "Implement context assembly from summary refs.";
    const runDraft = buildRunDraftView({
      objectiveDraft: objective,
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "No prompt assembly\nNo model request",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildContextAssemblyPreviewView({ runDraft });
    const taskContract = view.segments.find(
      (segment) => segment.layer === "task_contract"
    );
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("preview");
    expect(taskContract).toMatchObject({
      sourceKind: "run_draft",
      placement: "task_contract",
      noCompress: false
    });
    expect(view.frozenPrefixSegmentCount).toBe(0);
    expect(serialized).not.toContain(objective);
    expect(summarizeContextAssemblyPreview(view)).toContain("preview_only=yes");
  });

  it("places workspace index and memory recall summaries in volatile_tail", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare code change memory recall with workspace index.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Summaries only",
      workspaceRoot: "D:\\workspace"
    });
    const workspaceIndexBridge = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
    const memoryRecallPreview = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-project-fact",
          type: "project_fact",
          trustLevel: "verified_tool_result",
          summary: "Workspace index memory recall supports code change.",
          tags: ["code_change", "workspace"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        }
      ]
    });
    const view = buildContextAssemblyPreviewView({
      runDraft,
      workspaceIndexBridge,
      memoryRecallPreview
    });
    const volatileSegments = view.segments.filter(
      (segment) => segment.placement === "volatile_tail"
    );
    const serialized = JSON.stringify(view);

    expect(
      volatileSegments.some(
        (segment) => segment.sourceKind === "workspace_index"
      )
    ).toBe(true);
    expect(
      volatileSegments.some((segment) => segment.sourceKind === "memory_recall")
    ).toBe(true);
    expect(
      view.layers.find((layer) => layer.layer === "volatile_tail")
    ).toMatchObject({ segmentCount: 2 });
    expect(serialized).not.toContain("Workspace index memory recall supports");
    expect(serialized).not.toContain("source code line");
  });

  it("places verification evidence refs in volatile_tail only", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Use verification summaries as evidence refs.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "Verification refs stay summary-only.",
      workspaceRoot: "D:\\workspace"
    });
    const verificationProjection = buildVerificationLaneProjectionView(
      fixedVerificationEventSummary()
    );
    const view = buildContextAssemblyPreviewView({
      runDraft,
      verificationLaneProjection: verificationProjection
    });
    const verificationSegment = view.segments.find(
      (segment) => segment.sourceKind === "verification_evidence"
    );
    const serialized = JSON.stringify(view);

    expect(verificationSegment).toMatchObject({
      layer: "volatile_tail",
      placement: "volatile_tail",
      sourceRefId: verificationProjection.projectionId
    });
    expect(view.volatileTailSegmentCount).toBeGreaterThan(0);
    expect(serialized).not.toContain("diff --git");
    expect(serialized).not.toContain("rawStdout");
  });

  it("places patch proposal and approval refs in no_compress_zone", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a patch proposal preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Diff remains summary only",
      workspaceRoot: "D:\\workspace"
    });
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const patchSurface = buildWorkbenchSurfacesView({
      controlProjection,
      patchProposalSummaries: [
        {
          proposalId: "patch-1",
          title: "Update context preview wiring",
          filesChanged: 2,
          linesAdded: 12,
          linesRemoved: 3,
          pathSummaries: ["app/src/App.tsx"],
          requiresApproval: true
        }
      ]
    }).diff;
    const contextCart = buildContextCartView({ runDraft });
    const agentRoutePreview = buildAgentRoutePreviewView({
      runDraft,
      contextCart,
      patchSurface
    });
    const capabilityPlanPreview = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview,
      contextCart,
      patchSurface,
      selectedIntent: "code_change"
    });
    const view = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface,
      capabilityPlanPreview
    });
    const noCompressSegments = view.segments.filter(
      (segment) => segment.placement === "no_compress_zone"
    );

    expect(
      noCompressSegments.some(
        (segment) => segment.sourceKind === "patch_proposal"
      )
    ).toBe(true);
    expect(
      noCompressSegments.some(
        (segment) => segment.sourceKind === "approval_ref"
      )
    ).toBe(true);
    expect(view.noCompressSegmentCount).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(view)).not.toContain("raw diff");
  });

  it("keeps dynamic summaries out of frozen prefix layers", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Keep dynamic context outside frozen prefix.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "Dynamic summaries stay volatile",
      workspaceRoot: "D:\\workspace"
    });
    const workspaceIndexBridge = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
    const view = buildContextAssemblyPreviewView({
      runDraft,
      workspaceIndexBridge
    });

    expect(
      view.segments.filter((segment) => segment.placement === "frozen_prefix")
    ).toHaveLength(0);
    expect(
      view.layers.find((layer) => layer.layer === "immutable_rules")
    ).toMatchObject({ segmentCount: 0, placement: "frozen_prefix" });
    expect(
      view.layers.find((layer) => layer.layer === "workspace_rules")
    ).toMatchObject({ segmentCount: 0, placement: "frozen_prefix" });
  });

  it("uses deterministic token estimates and summary-only hash prefixes", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Estimate context preview tokens deterministically.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "Stable token count",
      workspaceRoot: "D:\\workspace"
    });
    const first = buildContextAssemblyPreviewView({ runDraft });
    const second = buildContextAssemblyPreviewView({ runDraft });

    expect(second.totalTokenEstimate).toBe(first.totalTokenEstimate);
    expect(second.layers.map((layer) => layer.hashPrefix)).toEqual(
      first.layers.map((layer) => layer.hashPrefix)
    );
    expect(
      first.layers.every((layer) => /^[a-f0-9]{8,12}$/.test(layer.hashPrefix))
    ).toBe(true);
  });

  it("marks volatile cache changes separately from frozen prefix changes", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Compare workspace index summaries.",
      selectedIntent: "code_review",
      acceptanceCriteriaDraft: "Volatile cache changes only",
      workspaceRoot: "D:\\workspace"
    });
    const previousWorkspaceIndex = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
    const previous = buildContextAssemblyPreviewView({
      runDraft,
      workspaceIndexBridge: previousWorkspaceIndex
    });
    const nextWorkspaceIndex = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: {
        ...fixedWorkspaceIndexSummary(),
        fileCount: 4,
        indexedFileCount: 3,
        hash: "fedcba6543210000"
      }
    });
    const next = buildContextAssemblyPreviewView({
      runDraft,
      workspaceIndexBridge: nextWorkspaceIndex,
      previousPreview: previous
    });

    expect(next.cacheBoundary.status).toBe("changed");
    expect(next.cacheBoundary.frozenPrefixChanged).toBe(false);
    expect(next.cacheBoundary.taskContractChanged).toBe(false);
    expect(next.cacheBoundary.volatileTailChanged).toBe(true);
    expect(next.cacheBoundary.reasonCodes).toContain("VOLATILE_TAIL_CHANGED");
  });

  it("blocks unsafe markers without retaining raw prompt, DOM, CSV, or API keys", () => {
    const secret = "sk-test1234567890abcdef";
    const safeDraft = buildRunDraftView({
      objectiveDraft: "Safe draft before unsafe override.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "Safe criteria",
      workspaceRoot: "D:\\workspace"
    });
    const unsafeDraft = {
      ...safeDraft,
      objectiveSummary: `rawPrompt rawDom rawCsv ${secret}`,
      rawPrompt: "do not keep"
    } as unknown as typeof safeDraft;
    const validation = validateContextAssemblyPreviewInput({
      runDraft: unsafeDraft
    });
    const view = buildContextAssemblyPreviewView({ runDraft: unsafeDraft });
    const serialized = JSON.stringify(view);

    expect(validation.ok).toBe(false);
    expect(view.status).toBe("blocked");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt rawDom rawCsv");
  });

  it("keeps App UI local-only with no prompt assembly execution path", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );

    expect(appSource).toContain("Context Assembly Preview");
    expect(appSource).toContain("No prompt is assembled");
    expect(appSource).toContain("no model request is sent");
    expect(appSource).toContain("handlePreviewContextAssembly");
    expect(desktopFlowSource).not.toContain("context_assembly");
    expect(appSource).not.toContain("record_context_assembly");
    expect(appSource).not.toContain("localStorage");
    expect(appSource).not.toContain("sessionStorage");
  });
});

describe("app agent route preview", () => {
  it("builds an empty preview until a local run draft exists", () => {
    const view = buildAgentRoutePreviewView({
      selectedIntent: "code_change"
    });

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.executionEnabled).toBe(false);
    expect(view.steps).toHaveLength(0);
    expect(view.nextAction).toContain("Preview a local run draft first");
  });

  it("routes web data extraction through orchestrator and verifier only", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Export the selected web table to CSV.",
      selectedIntent: "web_data_extraction",
      acceptanceCriteriaDraft: "CSV draft exists",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildAgentRoutePreviewView({
      runDraft,
      contextCart: buildContextCartView({
        contextAssemblyReport: {
          source: "synthetic_summary",
          segmentCountByLayer: { volatile_tail: 1 }
        }
      })
    });

    expect(view.status).toBe("preview");
    expect(view.source).toBe("runtime_static_router_preview");
    expect(view.steps.map((step) => step.role)).toEqual([
      "orchestrator",
      "verifier"
    ]);
    expect(view.steps.map((step) => step.role)).not.toContain("coder");
    expect(view.nextAction).toContain("No agent is executed");
  });

  it("uses the runtime static router helper output shape", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a runtime backed route preview.",
      selectedIntent: "code_review",
      acceptanceCriteriaDraft: "Reviewer summary exists",
      workspaceRoot: "D:\\workspace"
    });
    const runtimePreview = buildStaticAgentRoutePreview({
      intent: runDraft.intent,
      objectiveSummary: runDraft.objectiveSummary,
      acceptanceCriteriaCount: runDraft.acceptanceCriteriaCount,
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => "route-runtime"
    });
    const appPreview = buildAgentRoutePreviewView({
      runDraft,
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => "route-runtime"
    });

    expect(appPreview.source).toBe("runtime_static_router_preview");
    expect(appPreview.routeId).toBe(runtimePreview.routeId);
    expect(appPreview.steps.map((step) => step.role)).toEqual(
      runtimePreview.steps.map((step) => step.role)
    );
    expect(appPreview.modelProfileIds).toEqual(runtimePreview.modelProfileIds);
    expect(appPreview.capabilityRefCount).toBe(
      runtimePreview.capabilityRefCount
    );
  });

  it("routes code changes through orchestrator coder reviewer verifier", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a small UI patch proposal.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Patch summary exists\nTests are described",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildAgentRoutePreviewView({
      runDraft,
      contextCart: buildContextCartView({
        contextAssemblyReport: {
          source: "synthetic_summary",
          segmentCountByLayer: { task_contract: 1 }
        }
      })
    });

    expect(view.steps.map((step) => step.role)).toEqual([
      "orchestrator",
      "coder",
      "reviewer",
      "verifier"
    ]);
    expect(view.status).toBe("warning");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "PATCH_CAPABILITY_NOT_CONNECTED"
    );
    expect(
      view.steps.find((step) => step.role === "coder")?.expectedOutputs
    ).toContain("patch proposal summary");
  });

  it("marks unknown intent as needing clarification", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Plan this later.",
      selectedIntent: "unknown",
      acceptanceCriteriaDraft: "Preview only",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildAgentRoutePreviewView({ runDraft });

    expect(view.status).toBe("needs_clarification");
    expect(view.steps.map((step) => step.role)).toEqual(["orchestrator"]);
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "INTENT_UNKNOWN_NEEDS_CLARIFICATION"
    );
  });

  it("includes display-only model profile ids and capability refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Review a proposed code diff.",
      selectedIntent: "code_review",
      acceptanceCriteriaDraft: "Reviewer summary exists",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildAgentRoutePreviewView({ runDraft });
    const serialized = JSON.stringify(view);

    expect(view.modelProfileIds).toContain("deepseek-v4-pro");
    expect(view.modelProfileIds).toContain("deepseek-v4-flash");
    expect(view.capabilityRefCount).toBeGreaterThan(0);
    for (const step of view.steps) {
      for (const capability of step.allowedCapabilityRefs) {
        expect(capability.mode).toBe("display_only");
      }
    }
    expect(serialized).toContain("native.workspace.index");
    expect(serialized).toContain("native.git.diff_summary");
  });

  it("does not expose unsafe objective markers in route summaries", () => {
    const secret = "sk-test1234567890abcdef";
    const runDraft = buildRunDraftView({
      objectiveDraft: `Route a draft containing ${secret} and rawDom.`,
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "warning codes only",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildAgentRoutePreviewView({ runDraft });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("error");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "RAW_DOM_MARKER"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawDom");
    expect(serialized).not.toContain("Route a draft containing");
  });
});

describe("app capability plan preview", () => {
  it("builds an empty capability plan until a run draft and route exist", () => {
    const view = buildCapabilityPlanPreviewView({
      selectedIntent: "code_change"
    });

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.planningOnly).toBe(true);
    expect(view.executionEnabled).toBe(false);
    expect(view.leaseIssued).toBe(false);
    expect(view.items).toHaveLength(0);
    expect(view.nextAction).toContain("Preview a local run draft");
  });

  it("uses runtime Capability Broker preview helper output shape", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local code change preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Patch proposal summary exists",
      workspaceRoot: "D:\\workspace"
    });
    const agentRoutePreview = buildAgentRoutePreviewView({ runDraft });
    const runtimePreview = buildCapabilityPlanPreview({
      intent: "code_change",
      routePreview: {
        routeId: agentRoutePreview.routeId,
        status: agentRoutePreview.status,
        roleRefs: agentRoutePreview.steps.map((step) => step.role),
        routeStepRefs: agentRoutePreview.steps.map((step) => step.stepId),
        capabilityRefs: agentRoutePreview.steps.flatMap((step) =>
          step.allowedCapabilityRefs.map((ref) => ref.capabilityId)
        )
      },
      runDraftSummary: `${runDraft.objectiveSummary} criteria:${runDraft.acceptanceCriteriaCount}`
    });
    const appPreview = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview
    });

    expect(appPreview.source).toBe("runtime_capability_broker_preview");
    expect(appPreview.itemCount).toBe(runtimePreview.itemCount);
    expect(appPreview.items.map((item) => item.capabilityId)).toEqual(
      runtimePreview.items.map((item) => item.capabilityId)
    );
    expect(appPreview.approvalRequiredCount).toBe(
      runtimePreview.approvalRequiredCount
    );
    expect(appPreview.leaseRequiredCount).toBe(
      runtimePreview.leaseRequiredCount
    );
    expect(
      appPreview.items.every((item) => item.descriptorHash.length > 0)
    ).toBe(true);
  });

  it("maps web data extraction to display-only workspace and draft-write descriptors", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Export a web table to CSV.",
      selectedIntent: "web_data_extraction",
      acceptanceCriteriaDraft: "CSV exists",
      workspaceRoot: "D:\\workspace"
    });
    const agentRoutePreview = buildAgentRoutePreviewView({ runDraft });
    const view = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview
    });

    expect(view.source).toBe("runtime_capability_broker_preview");
    expect(view.itemCount).toBe(2);
    expect(view.items.map((item) => item.capabilityId)).toContain(
      "native.workspace.index"
    );
    expect(view.items.map((item) => item.capabilityId)).toContain(
      "native.fs.write_draft"
    );
    expect(
      view.items.find((item) => item.capabilityId === "native.workspace.index")
        ?.planStatus
    ).toBe("display_only");
    expect(
      view.items.find((item) => item.capabilityId === "native.fs.write_draft")
        ?.planStatus
    ).toBe("approval_required");
    expect(view.leaseRequiredCount).toBe(1);
    expect(JSON.stringify(view)).not.toContain("rawDom");
  });

  it("maps code change to workspace, patch, git, and disabled command refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local code change preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Patch proposal summary exists",
      workspaceRoot: "D:\\workspace"
    });
    const patchSurface = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: [
        {
          proposalId: "patch-1",
          title: "Safe patch summary",
          filesChanged: 1,
          linesAdded: 2,
          linesRemoved: 1
        }
      ]
    }).diff;
    const agentRoutePreview = buildAgentRoutePreviewView({
      runDraft,
      patchSurface
    });
    const view = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview,
      patchSurface
    });
    const ids = view.items.map((item) => item.capabilityId);

    expect(ids).toContain("native.workspace.index");
    expect(ids).toContain("native.patch.propose");
    expect(ids).toContain("native.git.diff_summary");
    expect(ids).toContain("native.git.status");
    expect(ids).toContain("native.shell.pnpm_test");
    expect(ids).toContain("native.patch.apply");
    expect(ids).toContain("native.git.commit_draft");
    expect(view.highRiskCount).toBeGreaterThanOrEqual(3);
    expect(view.disabledCount).toBeGreaterThanOrEqual(3);
    expect(
      view.items.find((item) => item.capabilityId === "native.patch.apply")
        ?.planStatus
    ).toBe("disabled");
    expect(
      view.items.find((item) => item.capabilityId === "native.git.commit_draft")
        ?.planStatus
    ).toBe("disabled");
    expect(
      view.items.find((item) => item.capabilityId === "native.shell.pnpm_test")
        ?.invokePolicy
    ).toBe("DISABLED");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "PATCH_APPLY_DISABLED"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "GIT_WRITE_DISABLED"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "SHELL_EXECUTION_DISABLED"
    );
  });

  it("returns needs clarification for unknown intent", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Clarify this task later.",
      selectedIntent: "unknown",
      acceptanceCriteriaDraft: "Preview only",
      workspaceRoot: "D:\\workspace"
    });
    const agentRoutePreview = buildAgentRoutePreviewView({ runDraft });
    const view = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview
    });

    expect(view.status).toBe("needs_clarification");
    expect(view.itemCount).toBe(0);
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "INTENT_UNKNOWN_NEEDS_CLARIFICATION"
    );
  });

  it("strips raw arguments and unsafe markers from the view model", () => {
    const secret = "sk-test1234567890abcdef";
    const runDraft = buildRunDraftView({
      objectiveDraft: `Plan with ${secret} and rawDom markers.`,
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "warning codes only",
      workspaceRoot: "D:\\workspace"
    });
    const agentRoutePreview = buildAgentRoutePreviewView({ runDraft });
    const view = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview,
      conversionError: {
        safeMessage: "rawCsv should be warning-only"
      }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("blocked");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "RAW_DOM_MARKER"
    );
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "RAW_CSV_MARKER"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawDom");
    expect(serialized).not.toContain("rawCsv");
    expect(serialized).not.toContain("Plan with");
  });

  it("passes capability approvals to the existing approval surface as read-only dry refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Export a web table to CSV.",
      selectedIntent: "web_data_extraction",
      acceptanceCriteriaDraft: "CSV exists",
      workspaceRoot: "D:\\workspace"
    });
    const agentRoutePreview = buildAgentRoutePreviewView({ runDraft });
    const capabilityPlan = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      futureApprovalRefs: capabilityPlanApprovalRefs(capabilityPlan)
    });

    expect(surfaces.approval.status).toBe("pending");
    expect(surfaces.approval.itemCount).toBe(1);
    expect(surfaces.approval.items[0]).toMatchObject({
      kind: "capability",
      status: "dry"
    });
    expect(JSON.stringify(surfaces.approval)).not.toContain("raw");
  });
});

describe("app patch proposal creation preview", () => {
  it("builds an empty local preview before path refs are entered", () => {
    const view = buildPatchProposalCreationPreviewView({
      selectedIntent: "code_change"
    });

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.applyEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.items).toHaveLength(0);
  });

  it("creates a local summary-only proposal from safe path refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a local patch proposal preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Diff surface shows summary only",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildPatchProposalCreationPreviewView({
      titleDraft: "Update patch preview wiring",
      changeDescriptionSummary: "Connect safe path refs to summary surfaces.",
      pathRefsText: "app/src/App.tsx\ndocs/app-preview.md",
      defaultChangeKind: "update",
      estimatedLinesAdded: 10,
      estimatedLinesRemoved: 2,
      selectedIntent: "code_change",
      runDraft
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("warning");
    expect(view.source).toBe("runtime_patch_creation_preview");
    expect(view.fileCount).toBe(2);
    expect(view.linesAdded).toBe(20);
    expect(view.linesRemoved).toBe(4);
    expect(view.pathSummaries).toEqual([
      "update:app/src/App.tsx",
      "update:docs/app-preview.md"
    ]);
    expect(view.requiresApproval).toBe(true);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("rawDiff");
  });

  it("rejects raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const rawFieldParsed = parsePatchProposalPathRefsInput(
      JSON.stringify([
        {
          path: "app/src/App.tsx",
          changeKind: "update",
          beforeContent: "do not keep"
        }
      ])
    );
    const markerView = buildPatchProposalCreationPreviewView({
      pathRefsText: `docs/file.md ${secret}`,
      selectedIntent: "code_change"
    });
    const serialized = JSON.stringify(markerView);

    expect(rawFieldParsed.ok).toBe(false);
    if (!rawFieldParsed.ok) {
      expect(rawFieldParsed.errorCode).toBe("PATCH_PREVIEW_RAW_FIELD_REJECTED");
    }
    expect(markerView.status).toBe("blocked");
    expect(markerView.warningCodes).toContain("API_KEY_MARKER");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("feeds Diff Surface and Approval Surface with summary-only refs", () => {
    const view = buildPatchProposalCreationPreviewView({
      titleDraft: "Delete obsolete doc",
      changeDescriptionSummary: "Delete requires approval summary.",
      pathRefsText: "README.md",
      defaultChangeKind: "delete",
      estimatedLinesAdded: 0,
      estimatedLinesRemoved: 3,
      selectedIntent: "code_change"
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: patchProposalCreationSurfaceSummaries(view),
      futureApprovalRefs: patchProposalCreationApprovalRefs(view)
    });
    const serialized = JSON.stringify(surfaces);

    expect(view.requiresApproval).toBe(true);
    expect(surfaces.diff.status).toBe("warning");
    expect(surfaces.diff.items).toHaveLength(1);
    expect(surfaces.diff.items[0]?.proposalId).toBe(view.proposalId);
    expect(surfaces.diff.items[0]?.suggestedNextAction).toContain(
      "Apply is disabled"
    );
    expect(surfaces.approval.status).toBe("pending");
    expect(surfaces.approval.items[0]).toMatchObject({
      kind: "patch",
      status: "dry"
    });
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("places created patch proposals into context no_compress_zone and capability refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare local patch creation preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Patch proposal summary appears",
      workspaceRoot: "D:\\workspace"
    });
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update route preview",
      changeDescriptionSummary: "Summary-only patch proposal preview.",
      pathRefsText: "app/src/agent-route-preview-view.ts",
      defaultChangeKind: "update",
      estimatedLinesAdded: 6,
      estimatedLinesRemoved: 1,
      selectedIntent: "code_change",
      runDraft
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries:
        patchProposalCreationSurfaceSummaries(proposalView)
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface: surfaces.diff
    });
    const agentRoutePreview = buildAgentRoutePreviewView({
      runDraft,
      patchSurface: surfaces.diff
    });
    const capabilityPlan = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview,
      patchSurface: surfaces.diff,
      selectedIntent: "code_change"
    });

    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceKind === "patch_proposal" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(
      capabilityPlan.items.find(
        (item) => item.capabilityId === "native.patch.propose"
      )?.inputSummary
    ).toContain("patch-surface-summary");
    expect(JSON.stringify(contextPreview)).not.toContain(
      "Summary-only patch proposal preview."
    );
  });

  it("keeps App UI preview-only without patch apply or execution handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "patch-proposal-creation-preview-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Patch Proposal Creation Preview");
    expect(appSource).toContain("Preview only / no apply");
    expect(appSource).toContain("handlePreviewPatchProposal");
    expect(appSource).toContain("files are read or written");
    expect(appSource).toContain("no patch is applied");
    expect(combined).not.toContain("handleApplyPatch");
    expect(combined).not.toContain("applyPatch");
    expect(combined).not.toContain("approvePatch");
    expect(combined).not.toContain("rejectPatch");
    expect(combined).not.toContain("executePatch");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("patch_proposal_creation");
  });
});

describe("app model patch proposal import", () => {
  const proposalFixtureRoot = path.join(
    repoRoot,
    "runtime",
    "test",
    "fixtures",
    "model-patch-proposals"
  );
  const repairFixtureRoot = path.join(proposalFixtureRoot, "repair");

  it("builds an empty preview-only import state", () => {
    const view = buildModelPatchProposalImportView({
      draftText: "",
      sourceKind: "paste",
      idGenerator: () => "empty-test"
    });

    expect(view.status).toBe("empty");
    expect(view.readiness.canImportToPatchPreview).toBe(false);
    expect(view.readiness.canApplyPatch).toBe(false);
    expect(view.readiness.canWriteFilesystem).toBe(false);
    expect(view.readiness.canExecuteGit).toBe(false);
    expect(view.readiness.canExecuteShell).toBe(false);
    expect(view.readiness.canWriteEventStore).toBe(false);
    expect(view.readiness.appCanExecute).toBe(false);
  });

  it("imports a safe model proposal draft into summary preview surfaces", async () => {
    const draft = await readFile(
      path.join(proposalFixtureRoot, "safe-basic.json"),
      "utf8"
    );
    const view = buildModelPatchProposalImportView({
      draftText: draft,
      sourceKind: "fixture"
    });
    const creationPreview =
      buildPatchProposalCreationPreviewFromModelImport(view);
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: modelPatchProposalImportSurfaceSummaries(view),
      futureApprovalRefs: modelPatchProposalImportApprovalRefs(view)
    });
    const summary = summarizeModelPatchProposalImportView(view);
    const serialized = JSON.stringify({ view, creationPreview, surfaces });

    expect(view.status).toBe("warning");
    expect(view.preview?.proposalId).toBe("model-proposal-safe-basic");
    expect(view.preview?.operationCount).toBe(2);
    expect(view.preview?.evidenceRefCount).toBe(2);
    expect(view.readiness.canImportToPatchPreview).toBe(true);
    expect(creationPreview?.status).not.toBe("empty");
    expect(creationPreview?.items.map((item) => item.path)).toContain(
      "docs/app-shell-preview.md"
    );
    expect(surfaces.diff.items[0]?.proposalId).toBe(
      "model-proposal-safe-basic"
    );
    expect(surfaces.approval.items[0]).toMatchObject({
      kind: "patch",
      status: "dry"
    });
    expect(summary.nextAction).toContain("preview-only");
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("apiKey");
  });

  it("repairs markdown fenced model proposal draft before import", async () => {
    const draft = await readFile(
      path.join(repairFixtureRoot, "markdown-fenced-json.txt"),
      "utf8"
    );
    const view = buildModelPatchProposalImportView({
      draftText: draft,
      sourceKind: "fixture"
    });

    expect(view.status).toBe("warning");
    expect(view.repairOperations).toContain("strip_markdown_fence");
    expect(view.preview?.title).toBe("Fenced repair draft");
    expect(view.readiness.canImportToPatchPreview).toBe(true);
  });

  it("blocks unsafe path, secret marker, and execution field drafts", async () => {
    const unsafePath = await readFile(
      path.join(repairFixtureRoot, "unsafe-path.json"),
      "utf8"
    );
    const secretMarker = await readFile(
      path.join(repairFixtureRoot, "secret-marker.json"),
      "utf8"
    );
    const executionField = await readFile(
      path.join(repairFixtureRoot, "execution-field.json"),
      "utf8"
    );

    const unsafePathView = buildModelPatchProposalImportView({
      draftText: unsafePath,
      sourceKind: "fixture"
    });
    const secretView = buildModelPatchProposalImportView({
      draftText: secretMarker,
      sourceKind: "fixture"
    });
    const executionView = buildModelPatchProposalImportView({
      draftText: executionField,
      sourceKind: "fixture"
    });

    expect(unsafePathView.status).toBe("blocked");
    expect(unsafePathView.repairOperations).toContain("reject_unsafe_path");
    expect(secretView.status).toBe("blocked");
    expect(secretView.repairOperations).toContain("reject_secret_marker");
    expect(executionView.status).toBe("blocked");
    expect(executionView.repairOperations).toContain("reject_execution_fields");
    expect(
      buildPatchProposalCreationPreviewFromModelImport(unsafePathView)
    ).toBeUndefined();
    expect(JSON.stringify(secretView)).not.toContain("sk-test1234567890abcdef");
  });

  it("keeps contentDraft out of App view output", async () => {
    const draft = await readFile(
      path.join(proposalFixtureRoot, "warning-content-draft.json"),
      "utf8"
    );
    const view = buildModelPatchProposalImportView({
      draftText: draft,
      sourceKind: "fixture"
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("warning");
    expect(view.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["SCHEMA_CONTENT_DRAFT_PRESENT"])
    );
    expect(serialized).not.toContain(
      "Model-generated documentation draft. This is not written"
    );
    expect(serialized).not.toContain('"contentDraft":');
    expect(view.contentDraftSummaryOnly).toBe(true);
  });

  it("places model proposal import refs into context no_compress_zone", async () => {
    const draft = await readFile(
      path.join(proposalFixtureRoot, "safe-basic.json"),
      "utf8"
    );
    const importView = buildModelPatchProposalImportView({
      draftText: draft,
      sourceKind: "fixture"
    });
    const runDraft = buildRunDraftView({
      objectiveDraft: "Review an imported model proposal.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Import ref enters context.",
      workspaceRoot: "D:\\workspace"
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      modelPatchProposalImport: importView
    });
    const importSegment = contextPreview.segments.find(
      (segment) => segment.sourceKind === "model_patch_proposal_import"
    );

    expect(importSegment).toMatchObject({
      placement: "no_compress_zone",
      sourceRefId: importView.importId
    });
    expect(importSegment?.warningCodes).toContain(
      "MODEL_PATCH_PROPOSAL_IMPORT_NO_COMPRESS"
    );
    expect(JSON.stringify(contextPreview)).not.toContain("rawDiff");
  });

  it("keeps App source preview-only without model calls, Tauri, or events", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const importSource = await readFile(
      path.join(appRoot, "src", "model-patch-proposal-import-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${importSource}`;

    expect(appSource).toContain("Model Patch Proposal Import");
    expect(appSource).toContain("Preview only / no model call");
    expect(appSource).toContain("Preview Model Proposal");
    expect(appSource).not.toContain("Apply Model Proposal");
    expect(importSource).not.toContain("safeInvoke");
    expect(importSource).not.toContain("fetch(");
    expect(importSource).not.toContain("DEEPSEEK_API_KEY");
    expect(importSource).not.toContain("OPENAI_API_KEY");
    expect(importSource).not.toContain("readFile");
    expect(importSource).not.toContain("writeFile");
    expect(importSource).not.toContain("eventStoreWrite");
    expect(importSource).not.toContain("writeUserWorkspaceApplyRollbackEvents");
    expect(combined).not.toContain("handleApplyModelProposal");
    expect(combined).not.toContain("handleRollbackModelProposal");
    expect(combined).not.toContain("handleWriteModelProposalEvents");
  });

  it("documents App model proposal import as preview-only", async () => {
    const doc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-model-patch-proposal-import-v0.7.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(doc).toContain("App Shell Model Patch Proposal Import v0.7");
    expect(doc).toContain("preview only");
    expect(doc).toContain("no model call");
    expect(doc).toContain("No fetch/network");
    expect(doc).toContain("No file write");
    expect(doc).toContain("No apply or rollback");
    expect(doc).toContain("No EventStore write");
    expect(doc).toContain("contentDraft");
    expect(doc).toContain("P0L-002");
    expect(doc).toContain("P0L-005");
    expect(docsIndex).toContain(
      "app-shell-model-patch-proposal-import-v0.7.md"
    );
  });
});

describe("app model proposal chain integration", () => {
  const proposalFixtureRoot = path.join(
    repoRoot,
    "runtime",
    "test",
    "fixtures",
    "model-patch-proposals"
  );

  it("builds an empty preview-only chain state", () => {
    const view = buildModelProposalChainIntegrationView();

    expect(view.status).toBe("empty");
    expect(view.readiness.canEnterExistingPreviewChain).toBe(false);
    expect(view.readiness.canExecuteApply).toBe(false);
    expect(view.readiness.canExecuteRollback).toBe(false);
    expect(view.readiness.canWriteFilesystem).toBe(false);
    expect(view.readiness.canWriteEventStore).toBe(false);
    expect(view.readiness.canApprove).toBe(false);
    expect(view.readiness.canIssuePermissionLease).toBe(false);
    expect(view.readiness.canExecuteGit).toBe(false);
    expect(view.readiness.canExecuteShell).toBe(false);
    expect(view.readiness.appCanExecute).toBe(false);
  });

  it("projects a safe imported proposal into a summary-only chain timeline", async () => {
    const draft = await readFile(
      path.join(proposalFixtureRoot, "safe-basic.json"),
      "utf8"
    );
    const importView = buildModelPatchProposalImportView({
      draftText: draft,
      sourceKind: "fixture"
    });
    const creationPreview =
      buildPatchProposalCreationPreviewFromModelImport(importView);

    if (creationPreview === undefined) {
      throw new Error(
        "Expected imported model proposal to create preview input."
      );
    }

    const chainView = buildModelProposalChainIntegrationView({
      modelImportView: importView,
      patchProposalCreationPreview: creationPreview
    });
    const summary = summarizeModelProposalChainIntegrationView(chainView);
    const serialized = JSON.stringify(chainView);

    expect(chainView.status).toBe("partial");
    expect(chainView.proposalId).toBe("model-proposal-safe-basic");
    expect(chainView.stages.map((stage) => stage.kind)).toEqual(
      expect.arrayContaining([
        "model_proposal_import",
        "patch_proposal_creation_preview",
        "patch_validation_preview",
        "user_workspace_promotion_readiness",
        "app_approval_execution_disabled"
      ])
    );
    expect(chainView.completedStageCount).toBeGreaterThanOrEqual(2);
    expect(chainView.missingStageCount).toBeGreaterThan(0);
    expect(chainView.readiness.canEnterExistingPreviewChain).toBe(true);
    expect(summary.nextAction).toContain("No execution is enabled");
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("Model-generated documentation draft");
  });

  it("blocks chain integration when the model import is blocked", async () => {
    const draft = await readFile(
      path.join(proposalFixtureRoot, "repair", "unsafe-path.json"),
      "utf8"
    );
    const importView = buildModelPatchProposalImportView({
      draftText: draft,
      sourceKind: "fixture"
    });
    const chainView = buildModelProposalChainIntegrationView({
      modelImportView: importView
    });

    expect(importView.status).toBe("blocked");
    expect(chainView.status).toBe("blocked");
    expect(chainView.readiness.canEnterExistingPreviewChain).toBe(false);
    expect(chainView.stages).toHaveLength(1);
    expect(chainView.findings.map((finding) => finding.code)).toContain(
      "MODEL_IMPORT_BLOCKED"
    );
  });

  it("lets warning imports enter the chain only with warning summaries", async () => {
    const draft = await readFile(
      path.join(proposalFixtureRoot, "warning-content-draft.json"),
      "utf8"
    );
    const importView = buildModelPatchProposalImportView({
      draftText: draft,
      sourceKind: "fixture"
    });
    const creationPreview =
      buildPatchProposalCreationPreviewFromModelImport(importView);

    if (creationPreview === undefined) {
      throw new Error(
        "Expected warning model proposal to create preview input."
      );
    }

    const chainView = buildModelProposalChainIntegrationView({
      modelImportView: importView,
      patchProposalCreationPreview: creationPreview
    });
    const serialized = JSON.stringify(chainView);

    expect(importView.status).toBe("warning");
    expect(chainView.status).toBe("partial");
    expect(chainView.warningCount).toBeGreaterThan(0);
    expect(chainView.blockerCount).toBe(0);
    expect(chainView.readiness.canEnterExistingPreviewChain).toBe(true);
    expect(serialized).not.toContain(
      "Model-generated documentation draft. This is not written"
    );
    expect(serialized).not.toContain('"contentDraft":');
  });

  it("blocks a stage that claims execution readiness", async () => {
    const draft = await readFile(
      path.join(proposalFixtureRoot, "safe-basic.json"),
      "utf8"
    );
    const importView = buildModelPatchProposalImportView({
      draftText: draft,
      sourceKind: "fixture"
    });
    const creationPreview =
      buildPatchProposalCreationPreviewFromModelImport(importView);

    if (creationPreview === undefined) {
      throw new Error(
        "Expected imported model proposal to create preview input."
      );
    }

    const executingValidationPreview = {
      status: "warning",
      proposalId: importView.preview?.proposalId,
      validationId: "validation-execution-claim",
      readiness: {
        canApplyPatch: true
      }
    } as never;
    const chainView = buildModelProposalChainIntegrationView({
      modelImportView: importView,
      patchProposalCreationPreview: creationPreview,
      patchValidationPreview: executingValidationPreview
    });

    expect(chainView.status).toBe("blocked");
    expect(chainView.readiness.canEnterExistingPreviewChain).toBe(false);
    expect(chainView.findings.map((finding) => finding.code)).toContain(
      "MODEL_CHAIN_EXECUTION_FLAG_TRUE"
    );
  });

  it("feeds summary-only chain refs into Diff, Approval, and Context surfaces", async () => {
    const draft = await readFile(
      path.join(proposalFixtureRoot, "safe-basic.json"),
      "utf8"
    );
    const importView = buildModelPatchProposalImportView({
      draftText: draft,
      sourceKind: "fixture"
    });
    const creationPreview =
      buildPatchProposalCreationPreviewFromModelImport(importView);

    if (creationPreview === undefined) {
      throw new Error(
        "Expected imported model proposal to create preview input."
      );
    }

    const chainView = buildModelProposalChainIntegrationView({
      modelImportView: importView,
      patchProposalCreationPreview: creationPreview
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries:
        modelProposalChainIntegrationSurfaceSummaries(chainView),
      futureApprovalRefs: modelProposalChainIntegrationApprovalRefs(chainView)
    });
    const runDraft = buildRunDraftView({
      objectiveDraft: "Review an imported model proposal chain.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Chain ref enters context.",
      workspaceRoot: "D:\\workspace"
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      modelPatchProposalImport: importView,
      modelProposalChainIntegration: chainView
    });
    const chainSegment = contextPreview.segments.find(
      (segment) => segment.sourceKind === "model_proposal_chain_integration"
    );
    const serialized = JSON.stringify({ chainView, surfaces, contextPreview });

    expect(surfaces.diff.items[0]?.label).toBe(
      "Model proposal chain integration"
    );
    expect(surfaces.approval.items[0]).toMatchObject({
      kind: "patch",
      status: "dry"
    });
    expect(chainSegment).toMatchObject({
      placement: "no_compress_zone",
      sourceRefId: chainView.chainId
    });
    expect(chainSegment?.warningCodes).toContain(
      "MODEL_PROPOSAL_CHAIN_INTEGRATION_NO_COMPRESS"
    );
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("apiKey");
  });

  it("keeps App source chain integration preview-only", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const chainSource = await readFile(
      path.join(appRoot, "src", "model-proposal-chain-integration-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${chainSource}`;

    expect(appSource).toContain("Model Proposal Chain Integration");
    expect(appSource).toContain("Preview chain / no execution");
    expect(appSource).toContain("Preview Model Proposal Chain");
    expect(appSource).not.toContain("Apply Model Proposal Chain");
    expect(chainSource).not.toContain("safeInvoke");
    expect(chainSource).not.toContain("fetch(");
    expect(chainSource).not.toContain("DEEPSEEK_API_KEY");
    expect(chainSource).not.toContain("OPENAI_API_KEY");
    expect(chainSource).not.toContain("readFile");
    expect(chainSource).not.toContain("writeFile");
    expect(chainSource).not.toContain("eventStoreWrite");
    expect(chainSource).not.toContain("writeUserWorkspaceApplyRollbackEvents");
    expect(combined).not.toContain("handleApplyModelProposalChain");
    expect(combined).not.toContain("handleRollbackModelProposalChain");
    expect(combined).not.toContain("handleWriteModelProposalChainEvents");
  });

  it("documents App model proposal chain integration as no-execution", async () => {
    const doc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-model-proposal-chain-integration-v0.7.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(doc).toContain("App Shell Model Proposal Chain Integration v0.7");
    expect(doc).toContain("preview chain only");
    expect(doc).toContain("No live model call");
    expect(doc).toContain("No dry adapter call");
    expect(doc).toContain("No API key is read");
    expect(doc).toContain("No fetch or network request");
    expect(doc).toContain("No file is read or written");
    expect(doc).toContain("No patch is applied");
    expect(doc).toContain("No rollback is executed");
    expect(doc).toContain("No App approval execution");
    expect(doc).toContain("No EventStore write");
    expect(doc).toContain("No Tauri command");
    expect(doc).toContain("P0L-006");
    expect(doc).toContain("P0I");
    expect(doc).toContain("P0K");
    expect(docsIndex).toContain(
      "app-shell-model-proposal-chain-integration-v0.7.md"
    );
  });
});

describe("app live proposal opt-in gate", () => {
  it("builds disabled and explicit policy previews without key reads or live calls", () => {
    const disabled = buildLiveProposalOptInGateView();
    const explicit = buildLiveProposalOptInGateView({
      modelProfileId: "deepseek-chat",
      keySourceRef: "DEEPSEEK_API_KEY",
      optInMode: "explicit_live_proposal_opt_in"
    });
    const secret = "sk-test1234567890abcdef";
    const blocked = buildLiveProposalOptInGateView({
      modelProfileId: "deepseek-chat",
      keySourceRef: secret,
      optInMode: "explicit_live_proposal_opt_in"
    });
    const serialized = JSON.stringify({ disabled, explicit, blocked });

    expect(disabled.status).toBe("disabled");
    expect(disabled.keySourceType).toBe("disabled");
    expect(disabled.readiness.canReadApiKey).toBe(false);
    expect(disabled.readiness.canCallLiveModel).toBe(false);
    expect(explicit.status).toBe("warning");
    expect(explicit.keySourceType).toBe("env_var_ref");
    expect(explicit.keySourceRefHash).toHaveLength(16);
    expect(explicit.readiness.canProceedToLiveRequestBuilder).toBe(true);
    expect(explicit.readiness.canReadApiKey).toBe(false);
    expect(explicit.readiness.canCallLiveModel).toBe(false);
    expect(explicit.readiness.canFetchNetwork).toBe(false);
    expect(blocked.status).toBe("blocked");
    expect(blocked.findings.map((finding) => finding.code)).toContain(
      "RAW_KEY_REF_REJECTED"
    );
    expect(serialized).not.toContain(secret);
  });

  it("keeps App source opt-in gate policy-only without live execution wiring", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "live-proposal-opt-in-gate-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}`;

    expect(appSource).toContain("Live Proposal Opt-in Gate");
    expect(appSource).toContain("Policy only / no API key read");
    expect(appSource).toContain("Preview Opt-in Policy");
    expect(appSource).toContain("Call DeepSeek (disabled)");
    expect(appSource).toContain("DEEPSEEK_API_KEY ref only, no value");
    expect(appSource).toContain("not an API key");
    expect(appSource).toContain("value field");
    expect(appSource).not.toContain('type="password"');
    expect(appSource).not.toContain("Authorization input");
    expect(appSource).not.toContain("handleCallDeepSeek");
    expect(appSource).not.toContain("handleLiveDeepSeekProposal");
    expect(appSource).not.toContain("handleApplyLiveProposal");
    expect(appSource).not.toContain("handleRollbackLiveProposal");
    expect(appSource).not.toContain("handleWriteLiveProposalEvents");
    expect(viewSource).not.toContain("process.env");
    expect(viewSource).not.toContain("fetch(");
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toContain("recordControlRunDraftEvent");
    expect(combined).not.toContain("readLiveProposalApiKey");
    expect(combined).not.toContain("writeLiveProposalEvent");
  });

  it("documents runtime and App live proposal opt-in policy boundaries", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-live-proposal-api-key-policy-v0.8.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-proposal-opt-in-gate-v0.8.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;
    const normalized = combined.replace(/\s+/g, " ");

    expect(combined).toContain("Runtime Live Proposal API Key Policy v0.8");
    expect(combined).toContain("App Shell Live Proposal Opt-in Gate v0.8");
    expect(combined).toContain("Policy only");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No environment value read");
    expect(combined).toContain("No vault read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No apply or rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(normalized).toContain("DEEPSEEK_API_KEY ref only, no value");
    expect(docsIndex).toContain("runtime-live-proposal-api-key-policy-v0.8.md");
    expect(docsIndex).toContain("app-shell-live-proposal-opt-in-gate-v0.8.md");
  });
});

describe("app live proposal session receipt", () => {
  it("builds ready and blocked receipt previews without live calls", () => {
    const empty = buildAppLiveProposalSessionReceiptView();
    const ready = buildAppLiveProposalSessionReceiptView({
      typedConfirmation: "CALL DEEPSEEK FOR PROPOSAL",
      objectiveSummary: "Generate a summary-only docs proposal.",
      modelProfileId: "deepseek-chat",
      allowedPathRefsText: "docs/live-proposal-session.md",
      apiKeyPolicyId: "policy-ref-1",
      requestBuilderId: "request-ref-1",
      requestBoundaryHash: "request-boundary-hash-1"
    });
    const blocked = buildAppLiveProposalSessionReceiptView({
      typedConfirmation: "CALL MODEL",
      objectiveSummary: "Generate a summary-only docs proposal.",
      modelProfileId: "deepseek-chat",
      allowedPathRefsText: "../escape.ts",
      apiKeyPolicyId: "policy-ref-1"
    });
    const serialized = JSON.stringify({ empty, ready, blocked });

    expect(empty.status).toBe("empty");
    expect(empty.readiness.canReadApiKey).toBe(false);
    expect(empty.readiness.canCallLiveModel).toBe(false);
    expect(ready.status).toBe("ready");
    expect(ready.typedConfirmationAccepted).toBe(true);
    expect(ready.allowedPathCount).toBe(1);
    expect(ready.readiness.canProceedToLiveProposalCommand).toBe(true);
    expect(ready.readiness.canReadApiKey).toBe(false);
    expect(ready.readiness.canCallLiveModel).toBe(false);
    expect(ready.readiness.canFetchNetwork).toBe(false);
    expect(ready.readiness.canApplyPatch).toBe(false);
    expect(ready.readiness.canRollback).toBe(false);
    expect(ready.readiness.canWriteEventStore).toBe(false);
    expect(blocked.status).toBe("blocked");
    expect(blocked.findings.map((finding) => finding.code)).toContain(
      "APP_LIVE_SESSION_CONFIRMATION_MISMATCH"
    );
    expect(blocked.findings.map((finding) => finding.code)).toContain(
      "APP_LIVE_SESSION_UNSAFE_PATH"
    );
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("raw prompt");
  });

  it("keeps App source session receipt confirmation-only without live call wiring", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "app-live-proposal-session-receipt-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}`;

    expect(appSource).toContain("Live Proposal Session Receipt");
    expect(appSource).toContain("Explicit confirmation / no model call");
    expect(appSource).toContain("Preview Session Receipt");
    expect(appSource).toContain("CALL DEEPSEEK FOR PROPOSAL");
    expect(appSource).toContain("Call DeepSeek (disabled)");
    expect(appSource).toContain("not an apply");
    expect(appSource).toContain("key value field");
    expect(appSource).not.toContain('type="password"');
    expect(appSource).not.toContain("handleCallDeepSeek");
    expect(appSource).not.toContain("handleSendLiveProposalRequest");
    expect(appSource).not.toContain("handleApplyLiveProposal");
    expect(appSource).not.toContain("handleRollbackLiveProposal");
    expect(viewSource).not.toContain("process.env");
    expect(viewSource).not.toContain("fetch(");
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toContain("recordControlRunDraftEvent");
    expect(combined).not.toContain("readLiveProposalApiKey");
    expect(combined).not.toContain("writeLiveProposalEvent");
  });
});

describe("app live proposal request builder", () => {
  it("builds empty and safe request previews without network or key reads", () => {
    const empty = buildLiveProposalRequestBuilderView();
    const safe = buildLiveProposalRequestBuilderView({
      objectiveSummary: "Create a summary-only docs proposal.",
      intent: "Generate a structured model_patch_proposal draft.",
      modelProfileId: "deepseek-chat",
      keySourceRef: "DEEPSEEK_API_KEY",
      optInMode: "explicit_live_proposal_opt_in",
      allowedPathRefsText: "docs/live-proposal-request-builder.md"
    });
    const blocked = buildLiveProposalRequestBuilderView({
      objectiveSummary: "Create proposal",
      modelProfileId: "deepseek-chat",
      keySourceRef: "DEEPSEEK_API_KEY",
      optInMode: "explicit_live_proposal_opt_in",
      allowedPathRefsText: "../escape.ts"
    });
    const serialized = JSON.stringify({ empty, safe, blocked });

    expect(empty.status).toBe("empty");
    expect(empty.readiness.canReadApiKey).toBe(false);
    expect(empty.readiness.canCallLiveModel).toBe(false);
    expect(safe.status).toBe("request_ready");
    expect(safe.summaryOnly).toBe(true);
    expect(safe.noExecution).toBe(true);
    expect(safe.toolChoiceOmitted).toBe(true);
    expect(safe.keySourceRefHash).toHaveLength(16);
    expect(safe.requestHash).toHaveLength(64);
    expect(safe.readiness.canProceedToLiveAdapter).toBe(true);
    expect(safe.readiness.canReadApiKey).toBe(false);
    expect(safe.readiness.canFetchNetwork).toBe(false);
    expect(blocked.status).toBe("blocked");
    expect(blocked.findings.map((finding) => finding.code)).toContain(
      "UNSAFE_ALLOWED_PATH_REF"
    );
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("process.env");
  });

  it("keeps App source request builder preview-only without live send wiring", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "live-proposal-request-builder-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}`;

    expect(appSource).toContain("Live Proposal Request Builder");
    expect(appSource).toContain("Request preview / no network");
    expect(appSource).toContain("Preview Live Proposal Request");
    expect(appSource).toContain("Send Live Proposal Request (disabled)");
    expect(appSource).not.toContain('type="password"');
    expect(appSource).not.toContain("Authorization input");
    expect(appSource).not.toContain("handleSendLiveProposalRequest");
    expect(appSource).not.toContain("handleCallLiveProposalRequest");
    expect(appSource).not.toContain("handleApplyLiveProposal");
    expect(appSource).not.toContain("handleRollbackLiveProposal");
    expect(viewSource).not.toContain("process.env");
    expect(viewSource).not.toContain("fetch(");
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toContain("recordControlRunDraftEvent");
    expect(combined).not.toContain("readLiveProposalApiKey");
    expect(combined).not.toContain("writeLiveProposalEvent");
  });

  it("documents runtime and App live proposal request builder boundaries", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-live-proposal-request-builder-v0.8.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-proposal-request-builder-v0.8.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain("Runtime Live Proposal Request Builder v0.8");
    expect(combined).toContain("App Shell Live Proposal Request Builder v0.8");
    expect(combined).toContain("Request builder only");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No environment value read");
    expect(combined).toContain("No vault read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No apply or rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No tools/tool_choice");
    expect(combined).toContain("No Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "runtime-live-proposal-request-builder-v0.8.md"
    );
    expect(docsIndex).toContain(
      "app-shell-live-proposal-request-builder-v0.8.md"
    );
  });

  it("documents the runtime live DeepSeek proposal adapter without App execution", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-live-deepseek-proposal-adapter-v0.8.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${docsIndex}`;

    expect(combined).toContain("Runtime Live DeepSeek Proposal Adapter v0.8");
    expect(combined).toContain("Explicit opt-in required");
    expect(combined).toContain("API key resolver injected");
    expect(combined).toContain("Transport injected");
    expect(combined).toContain("No App call");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No tools/tool_choice");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("No apply or rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "runtime-live-deepseek-proposal-adapter-v0.8.md"
    );
  });
});

describe("app live DeepSeek proposal generation flow", () => {
  function safePolicy() {
    return buildLiveProposalOptInGateView({
      modelProfileId: "deepseek-chat",
      keySourceRef: liveProposalAllowedKeySourceRef,
      optInMode: "explicit_live_proposal_opt_in"
    });
  }

  function safeRequest() {
    return buildLiveProposalRequestBuilderView({
      objectiveSummary: "Generate a summary-only docs proposal.",
      intent: "Generate a structured model_patch_proposal draft.",
      modelProfileId: "deepseek-chat",
      keySourceRef: liveProposalAllowedKeySourceRef,
      optInMode: "explicit_live_proposal_opt_in",
      allowedPathRefsText: "docs/app-shell-preview.md"
    });
  }

  function safeReceipt() {
    return buildAppLiveProposalSessionReceiptView({
      typedConfirmation: "CALL DEEPSEEK FOR PROPOSAL",
      objectiveSummary: "Generate a summary-only docs proposal.",
      modelProfileId: "deepseek-chat",
      allowedPathRefsText: "docs/app-shell-preview.md",
      apiKeyPolicyId: safePolicy().policyId,
      requestBuilderId: safeRequest().requestId,
      requestBoundaryHash: safeRequest().requestHashPrefix
    });
  }

  function safeLiveGenerationCommandResult(
    proposalCandidate: Record<string, unknown> = {
      schemaVersion: "model_patch_proposal.v1",
      proposalId: "model-proposal-safe-basic",
      title: "Clarify disabled App copy",
      intent: "Update read-only copy for a disabled App preview surface.",
      objectiveSummary:
        "Keep App execution disabled while clarifying proposal flow.",
      operations: [
        {
          operationId: "op-doc-001",
          path: "docs/app-shell-preview.md",
          changeKind: "documentation",
          summary: "Document that model proposals remain draft-only.",
          rationale: "Docs should distinguish proposals from apply execution.",
          estimatedLinesAdded: 8,
          estimatedLinesRemoved: 1,
          warningCodes: []
        }
      ],
      pathSummaries: [
        {
          path: "docs/app-shell-preview.md",
          changeKind: "documentation",
          summary: "Documentation-only update"
        }
      ],
      evidenceRefs: [
        {
          refId: "workspace-index-summary",
          kind: "workspace_index",
          summary: "Workspace index summary ref only.",
          hashPrefix: "abc12345"
        }
      ],
      riskNotes: [
        {
          code: "DRAFT_ONLY",
          severity: "info",
          summary: "No execution controls are added."
        }
      ],
      createdAt: "2026-06-28T00:00:00.000Z",
      modelProfileId: "deepseek-chat",
      source: "deepseek_model_patch_proposal"
    }
  ): LiveDeepSeekPatchProposalCommandResult {
    return {
      ok: true,
      status: "generated",
      providerId: "deepseek",
      modelProfileId: "deepseek-chat",
      requestId: safeRequest().requestId,
      responseId: "response-safe-summary",
      proposalCandidate,
      proposalCandidateHash: "proposal-candidate-hash",
      responseHash: "response-hash",
      usageSummary: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      droppedReasoningContent: true,
      reasoningContentCharCount: 42,
      warningCodes: ["REASONING_CONTENT_DROPPED"],
      summaryOnly: true,
      rawPromptIncluded: false,
      rawResponseIncluded: false,
      rawReasoningContentIncluded: false,
      canApplyPatch: false,
      canRollback: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      safeMessage:
        "Live DeepSeek proposal command returned a summary-only proposal candidate."
    };
  }

  function safeLiveGenerationCommandRequest(): LiveDeepSeekPatchProposalCommandRequest {
    return {
      sessionReceipt: safeReceipt().receiptEnvelope as unknown as Record<
        string,
        unknown
      >,
      apiKeySourceRef: liveProposalAllowedKeySourceRef,
      providerId: "deepseek",
      modelProfileId: "deepseek-chat",
      requestEnvelope: safeRequest().requestEnvelope as unknown as Record<
        string,
        unknown
      >,
      objectiveSummary: "Generate a summary-only docs proposal.",
      allowedPathRefs: ["docs/app-shell-preview.md"],
      contextRefs: ["context-ref"],
      maxResponseBytes: 20_000,
      timeoutMs: 5_000
    };
  }

  function expectNoLiveProposalLeak(value: unknown): void {
    const serialized = JSON.stringify(value);

    expect(serialized).not.toContain("RAW_PROMPT_BODY_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("RAW_RESPONSE_BODY_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("REASONING_CONTENT_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("Authorization: Bearer");
    expect(serialized).not.toContain("sk-fake-live-proposal-secret");
    expect(serialized).not.toContain("api-key-value-should-not-leak");
  }

  it("keeps Generate Live Proposal disabled until policy, request, and receipt gates are satisfied", () => {
    const noReceipt = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef
    });
    const wrongConfirmation = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: buildAppLiveProposalSessionReceiptView({
        typedConfirmation: "CALL MODEL",
        objectiveSummary: "Generate a summary-only docs proposal.",
        modelProfileId: "deepseek-chat",
        allowedPathRefsText: "docs/app-shell-preview.md",
        apiKeyPolicyId: safePolicy().policyId,
        requestBuilderId: safeRequest().requestId
      }),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef
    });
    const noRequest = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef
    });
    const ready = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef
    });

    expect(noReceipt.readiness.canGenerateLiveProposal).toBe(false);
    expect(noReceipt.status).toBe("blocked");
    expect(wrongConfirmation.readiness.canGenerateLiveProposal).toBe(false);
    expect(wrongConfirmation.status).toBe("blocked");
    expect(noRequest.readiness.canGenerateLiveProposal).toBe(false);
    expect(noRequest.status).toBe("blocked");
    expect(ready.status).toBe("ready");
    expect(ready.readiness.canGenerateLiveProposal).toBe(true);
    expect(ready.readiness.canApplyPatch).toBe(false);
    expect(ready.readiness.canWriteEventStore).toBe(false);
  });

  it("imports a fake live command success into repair/schema and chain previews", async () => {
    const commandResult = await generateLiveDeepSeekPatchProposal(
      {
        sessionReceipt: safeReceipt().receiptEnvelope as unknown as Record<
          string,
          unknown
        >,
        apiKeySourceRef: liveProposalAllowedKeySourceRef,
        providerId: "deepseek",
        modelProfileId: "deepseek-chat",
        requestEnvelope: safeRequest().requestEnvelope as unknown as Record<
          string,
          unknown
        >,
        objectiveSummary: "Generate a summary-only docs proposal.",
        allowedPathRefs: ["docs/app-shell-preview.md"],
        contextRefs: ["context-ref"],
        maxResponseBytes: 20_000,
        timeoutMs: 5_000
      },
      async () => safeLiveGenerationCommandResult() as never
    );
    const importView = buildModelPatchProposalImportView({
      draftText: JSON.stringify(commandResult.proposalCandidate),
      sourceKind: "manual_test"
    });
    const chainView = buildModelProposalChainIntegrationView({
      modelImportView: importView,
      patchProposalCreationPreview:
        buildPatchProposalCreationPreviewFromModelImport(importView)
    });
    const flowView = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef,
      commandResult,
      modelImportView: importView,
      modelProposalChainIntegrationView: chainView
    });
    const serialized = JSON.stringify(flowView);

    expect(commandResult.ok).toBe(true);
    expect(importView.status).not.toBe("blocked");
    expect(importView.readiness.canImportToPatchPreview).toBe(true);
    expect(chainView.status).not.toBe("blocked");
    expect(flowView.proposalId).toBe("model-proposal-safe-basic");
    expect(flowView.repairStatus).not.toBe("blocked");
    expect(flowView.schemaValidationStatus).not.toBe("blocked");
    expect(flowView.readiness.canEnterModelImport).toBe(true);
    expect(flowView.readiness.canApplyPatch).toBe(false);
    expect(flowView.readiness.canWriteEventStore).toBe(false);
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("internal chain");
  });

  it("blocks unsafe and secret proposal candidates through import validation", () => {
    const unsafeImport = buildModelPatchProposalImportView({
      draftText: JSON.stringify(
        safeLiveGenerationCommandResult({
          schemaVersion: "model_patch_proposal.v1",
          proposalId: "proposal-unsafe-path",
          title: "Unsafe path",
          intent: "Attempt unsafe path",
          objectiveSummary: "Attempt unsafe path.",
          operations: [
            {
              operationId: "op-unsafe",
              path: "../escape.ts",
              changeKind: "update",
              summary: "Attempt unsafe path."
            }
          ],
          evidenceRefs: [],
          riskNotes: []
        }).proposalCandidate
      ),
      sourceKind: "manual_test"
    });
    const secretImport = buildModelPatchProposalImportView({
      draftText: JSON.stringify(
        safeLiveGenerationCommandResult({
          schemaVersion: "model_patch_proposal.v1",
          proposalId: "proposal-secret",
          title: "Secret marker",
          intent: "Attempt secret marker",
          objectiveSummary: "Attempt secret marker.",
          operations: [
            {
              operationId: "op-secret",
              path: "docs/secret.md",
              changeKind: "update",
              summary: "fake marker sk-fake-secret-marker-000000"
            }
          ],
          evidenceRefs: [],
          riskNotes: []
        }).proposalCandidate
      ),
      sourceKind: "manual_test"
    });

    expect(unsafeImport.status).toBe("blocked");
    expect(secretImport.status).toBe("blocked");
  });

  it("summarizes live proposal failure states without raw leakage or auto-apply", () => {
    const missingPolicy = buildLiveDeepSeekProposalGenerationView({
      requestBuilderView: safeRequest(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef
    });
    const missingReceipt = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef
    });
    const wrongConfirmation = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: buildAppLiveProposalSessionReceiptView({
        typedConfirmation: "CALL MODEL",
        objectiveSummary: "Generate a summary-only docs proposal.",
        modelProfileId: "deepseek-chat",
        allowedPathRefsText: "docs/app-shell-preview.md",
        apiKeyPolicyId: safePolicy().policyId,
        requestBuilderId: safeRequest().requestId
      }),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef
    });
    const commandFailure = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef,
      errorMessage:
        "Live proposal command failed safely before returning a proposal."
    });
    const timeoutSummary = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef,
      errorMessage:
        "Live proposal request timed out safely before returning a proposal."
    });
    const repairFailedImport = buildModelPatchProposalImportView({
      draftText: "{ malformed model_patch_proposal",
      sourceKind: "manual_test"
    });
    const repairFailed = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef,
      commandResult: safeLiveGenerationCommandResult(),
      modelImportView: repairFailedImport
    });
    const schemaBlockedImport = buildModelPatchProposalImportView({
      draftText: JSON.stringify({
        schemaVersion: "model_patch_proposal.v1",
        proposalId: "proposal-schema-blocked",
        title: "Schema blocked",
        intent: "Schema blocked candidate.",
        objectiveSummary: "Schema blocked candidate.",
        operations: [
          {
            operationId: "op-schema-blocked",
            path: "docs/app-shell-preview.md",
            changeKind: "execute",
            summary: "Unsupported operation kind."
          }
        ],
        evidenceRefs: [],
        riskNotes: []
      }),
      sourceKind: "manual_test"
    });
    const schemaBlocked = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef,
      commandResult: safeLiveGenerationCommandResult(),
      modelImportView: schemaBlockedImport
    });
    const unsafeImport = buildModelPatchProposalImportView({
      draftText: JSON.stringify({
        schemaVersion: "model_patch_proposal.v1",
        proposalId: "proposal-unsafe-path",
        title: "Unsafe path",
        intent: "Attempt unsafe path.",
        objectiveSummary: "Attempt unsafe path.",
        operations: [
          {
            operationId: "op-unsafe",
            path: "../escape.ts",
            changeKind: "update",
            summary: "Attempt unsafe path."
          }
        ],
        evidenceRefs: [],
        riskNotes: []
      }),
      sourceKind: "manual_test"
    });
    const unsafePath = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef,
      commandResult: safeLiveGenerationCommandResult(),
      modelImportView: unsafeImport
    });
    const secretImport = buildModelPatchProposalImportView({
      draftText: JSON.stringify({
        schemaVersion: "model_patch_proposal.v1",
        proposalId: "proposal-secret-marker",
        title: "Secret marker",
        intent: "Attempt secret marker.",
        objectiveSummary: "Attempt secret marker.",
        operations: [
          {
            operationId: "op-secret",
            path: "docs/app-shell-preview.md",
            changeKind: "update",
            summary: "Contains sk-fake-live-proposal-secret-000000 marker."
          }
        ],
        evidenceRefs: [],
        riskNotes: []
      }),
      sourceKind: "manual_test"
    });
    const secretMarker = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef,
      commandResult: safeLiveGenerationCommandResult(),
      modelImportView: secretImport
    });
    const reasoningDropped = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: safePolicy(),
      requestBuilderView: safeRequest(),
      sessionReceiptView: safeReceipt(),
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef,
      commandResult: safeLiveGenerationCommandResult()
    });
    const failureViews = [
      missingPolicy,
      missingReceipt,
      wrongConfirmation,
      commandFailure,
      timeoutSummary,
      repairFailed,
      schemaBlocked,
      unsafePath,
      secretMarker,
      reasoningDropped
    ];
    const codes = new Set(
      failureViews.flatMap((view) =>
        view.findings.map((finding) => finding.code)
      )
    );

    expect(Array.from(codes)).toEqual(
      expect.arrayContaining([
        "LIVE_PROPOSAL_POLICY_MISSING",
        "LIVE_PROPOSAL_SESSION_RECEIPT_MISSING",
        "LIVE_PROPOSAL_CONFIRMATION_MISSING",
        "LIVE_PROPOSAL_COMMAND_ERROR",
        "LIVE_PROPOSAL_IMPORT_BLOCKED",
        "LIVE_PROPOSAL_REASONING_DROPPED"
      ])
    );
    expect(repairFailed.repairStatus).toBe("blocked");
    expect(schemaBlocked.schemaValidationStatus).toBe("blocked");
    expect(reasoningDropped.droppedReasoningContent).toBe(true);
    expect(reasoningDropped.reasoningContentCharCount).toBe(42);
    for (const view of failureViews) {
      expect(view.readiness.canApplyPatch).toBe(false);
      expect(view.readiness.canRollback).toBe(false);
      expect(view.readiness.canWriteEventStore).toBe(false);
      expect(view.readiness.appCanExecute).toBe(false);
      expectNoLiveProposalLeak(view);
    }
  });

  it("keeps live proposal command and event write failures safe-summary only", async () => {
    try {
      await generateLiveDeepSeekPatchProposal(
        safeLiveGenerationCommandRequest(),
        async () => {
          throw {
            errorCode: "LIVE_PROPOSAL_COMMAND_FAILED",
            safeMessage: "Live proposal command failed safely.",
            stage: "generate_live_deepseek_patch_proposal",
            rawResponse: "RAW_RESPONSE_BODY_SHOULD_NOT_LEAK",
            Authorization: "Bearer api-key-value-should-not-leak"
          };
        }
      );
      throw new Error("expected command failure");
    } catch (error) {
      const message = safeErrorMessage(error);

      expect(message).toContain("Live proposal command failed safely.");
      expectNoLiveProposalLeak(message);
    }

    try {
      await generateLiveDeepSeekPatchProposal(
        safeLiveGenerationCommandRequest(),
        async () => {
          throw {
            errorCode: "LIVE_PROPOSAL_TIMEOUT",
            safeMessage: "Live proposal request timed out safely.",
            stage: "generate_live_deepseek_patch_proposal",
            rawPrompt: "RAW_PROMPT_BODY_SHOULD_NOT_LEAK"
          };
        }
      );
      throw new Error("expected timeout failure");
    } catch (error) {
      const message = safeErrorMessage(error);

      expect(message).toContain("timed out safely");
      expectNoLiveProposalLeak(message);
    }

    try {
      await generateLiveDeepSeekPatchProposal(
        safeLiveGenerationCommandRequest(),
        async () =>
          ({
            ok: true,
            rawResponse: "RAW_RESPONSE_BODY_SHOULD_NOT_LEAK",
            reasoning_content: "REASONING_CONTENT_SHOULD_NOT_LEAK"
          }) as never
      );
      throw new Error("expected malformed response failure");
    } catch (error) {
      const message = safeErrorMessage(error);

      expect(message).toContain("Live proposal command response was invalid");
      expectNoLiveProposalLeak(message);
    }

    try {
      await recordLiveProposalSummaryEvent(
        {
          workspaceRoot: "D:\\workspace",
          eventPreview: {
            type: "model.patch_proposal.live_generated",
            generationId: "live-proposal-flow-test",
            requestId: "live-proposal-request-test",
            proposalId: "proposal-test",
            modelProfileId: "deepseek-chat",
            usageSummary: {
              promptTokens: 1,
              completionTokens: 2,
              totalTokens: 3
            },
            repairStatus: "valid",
            validationStatus: "valid",
            warningCount: 1,
            blockerCount: 0,
            proposalHash: "proposal-hash-test",
            droppedReasoningContent: true,
            warningCodes: ["REASONING_CONTENT_DROPPED"],
            summaryOnly: true,
            noRawPrompt: true,
            noRawResponse: true,
            noReasoningContent: true,
            noApiKey: true,
            contentDraftRawIncluded: false,
            canApplyPatch: false,
            canRollback: false,
            canWriteEventStore: false,
            notWritten: true
          }
        },
        async () => {
          throw {
            errorCode: "LIVE_PROPOSAL_EVENT_WRITE_FAILED",
            safeMessage: "Live proposal summary event write failed safely.",
            stage: "record_live_proposal_summary_event",
            rawResponse: "RAW_RESPONSE_BODY_SHOULD_NOT_LEAK",
            apiKey: "sk-fake-live-proposal-secret-000000"
          };
        }
      );
      throw new Error("expected event write failure");
    } catch (error) {
      const message = safeErrorMessage(error);

      expect(message).toContain("summary event write failed safely");
      expectNoLiveProposalLeak(message);
    }
  });

  it("clears generated proposal previews and event status from the live generation handler", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const clearStart = appSource.indexOf(
      "function handleClearLiveProposalGeneration"
    );
    const clearEnd = appSource.indexOf(
      "async function handleRecordLiveProposalSummaryEvent"
    );
    const clearHandler = appSource.slice(clearStart, clearEnd);

    expect(clearHandler).toContain(
      "setLiveDeepSeekProposalCommandResult(undefined)"
    );
    expect(clearHandler).toContain(
      "setLiveDeepSeekProposalGenerationError(undefined)"
    );
    expect(clearHandler).toContain(
      "setModelPatchProposalImportPreview(undefined)"
    );
    expect(clearHandler).toContain(
      "setModelProposalChainIntegrationPreview(undefined)"
    );
    expect(clearHandler).toContain(
      "setPatchProposalCreationPreview(undefined)"
    );
    expect(clearHandler).toContain('setLiveProposalSummaryEventStatus("idle")');
    expect(clearHandler).toContain(
      "setLiveProposalSummaryEventResult(undefined)"
    );
    expect(clearHandler).toContain(
      "setLiveProposalSummaryEventError(undefined)"
    );
    expect(clearHandler).toContain("setContextAssemblyPreview(undefined)");
  });

  it("keeps App live generation UI proposal-only without raw output or enabled execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "live-deepseek-proposal-generation-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}`;
    const normalizedAppSource = appSource.replace(/\s+/g, " ");

    expect(appSource).toContain("Live DeepSeek Proposal Generation");
    expect(appSource).toContain("Explicit opt-in / no auto-apply");
    expect(appSource).toContain("Generate Live Proposal");
    expect(appSource).toContain("repair, schema");
    expect(appSource).toContain("Dropped reasoning");
    expect(normalizedAppSource).toContain(
      "Raw prompt, raw response, reasoning_content, and API key values are not displayed or"
    );
    expect(appSource).not.toContain("raw response display");
    expect(appSource).not.toContain("raw prompt display");
    expect(appSource).not.toContain("API key display");
    expect(appSource).not.toContain('type="password"');
    expect(appSource).not.toContain("Apply Live Proposal");
    expect(appSource).not.toContain("Rollback Live Proposal");
    expect(appSource).not.toContain("Write Live Proposal Events");
    expect(appSource).not.toContain("Approve Live Proposal");
    expect(appSource).not.toContain("Reject Live Proposal");
    expect(combined).not.toContain("handleApplyLiveProposal");
    expect(combined).not.toContain("handleRollbackLiveProposal");
    expect(combined).not.toContain("recordLiveProposalEvent");
  });
});

describe("app live proposal validation integration", () => {
  it("builds a disabled summary-only integration view", () => {
    const view = buildLiveProposalValidationIntegrationView();
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("empty");
    expect(view.source).toBe("runtime_live_proposal_validation_integration");
    expect(view.gateCount).toBe(10);
    expect(view.blockerCount).toBe(1);
    expect(view.readiness.canEnterPatchProposalPreview).toBe(false);
    expect(view.readiness.canApplyPatch).toBe(false);
    expect(view.readiness.canWriteEventStore).toBe(false);
    expect(view.readiness.appCanExecute).toBe(false);
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("reasoning secret");
    expect(serialized).not.toContain("sk-");
  });

  it("keeps App source validation integration disabled without live wiring", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "live-proposal-validation-integration-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}`;
    const normalizedAppSource = appSource.replace(/\s+/g, " ");

    expect(appSource).toContain("Live Proposal Validation Integration");
    expect(appSource).toContain("Summary only / no execution");
    expect(appSource).toContain("Validate Live Proposal Result (disabled)");
    expect(normalizedAppSource).toContain(
      "The App Shell does not call DeepSeek, apply patches, rollback, or write events."
    );
    expect(appSource).not.toContain("raw response input");
    expect(appSource).not.toContain("API key input");
    expect(appSource).not.toContain("handleValidateLiveProposalResult");
    expect(appSource).not.toContain("handleCallLiveProposalValidation");
    expect(appSource).not.toContain("handleApplyLiveProposalValidation");
    expect(viewSource).not.toContain("process.env");
    expect(viewSource).not.toContain("fetch(");
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toContain("recordControlRunDraftEvent");
    expect(combined).not.toContain("readLiveProposalApiKey");
    expect(combined).not.toContain("writeLiveProposalEvent");
  });

  it("documents runtime and App live proposal validation integration boundaries", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-live-proposal-validation-integration-v0.8.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-proposal-validation-integration-v0.8.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain(
      "Runtime Live Proposal Validation Integration v0.8"
    );
    expect(combined).toContain(
      "App Shell Live Proposal Validation Integration v0.8"
    );
    expect(combined).toContain("Integration helper only");
    expect(combined).toContain("No live call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No App call");
    expect(combined).toContain("No file write");
    expect(combined).toContain("No apply or rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No raw response input");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("repair summary");
    expect(combined).toContain("schema validation summary");
    expect(combined).toContain("No Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "runtime-live-proposal-validation-integration-v0.8.md"
    );
    expect(docsIndex).toContain(
      "app-shell-live-proposal-validation-integration-v0.8.md"
    );
  });
});

describe("app live proposal preview gate", () => {
  it("builds empty, warning, and blocked gate views without execution readiness", () => {
    const empty = buildLiveProposalPreviewGateView();
    const policy = buildLiveProposalOptInGateView({
      modelProfileId: "deepseek-chat",
      keySourceRef: "DEEPSEEK_API_KEY",
      optInMode: "explicit_live_proposal_opt_in"
    });
    const request = buildLiveProposalRequestBuilderView({
      objectiveSummary: "Create a summary-only docs proposal.",
      intent: "Generate a structured model_patch_proposal draft.",
      modelProfileId: "deepseek-chat",
      keySourceRef: "DEEPSEEK_API_KEY",
      optInMode: "explicit_live_proposal_opt_in",
      allowedPathRefsText: "docs/live-proposal-preview-gate.md"
    });
    const warning = buildLiveProposalPreviewGateView({
      liveProposalApiKeyPolicyView: policy,
      liveProposalRequestBuilderView: request,
      liveProposalValidationIntegrationView:
        buildLiveProposalValidationIntegrationView()
    });
    const blocked = buildLiveProposalPreviewGateView({
      liveDeepSeekProposalAdapterSummary: {
        readiness: {
          appCanExecute: true
        }
      }
    });
    const serialized = JSON.stringify({ empty, warning, blocked });

    expect(empty.status).toBe("empty");
    expect(empty.readiness.canPreviewGate).toBe(false);
    expect(warning.status).toBe("warning");
    expect(warning.stageCount).toBe(14);
    expect(warning.readiness.canPreviewGate).toBe(true);
    expect(warning.readiness.canCallDeepSeekFromApp).toBe(false);
    expect(warning.readiness.canReadApiKeyFromApp).toBe(false);
    expect(warning.readiness.canFetchNetworkFromApp).toBe(false);
    expect(warning.readiness.canSendLiveRequest).toBe(false);
    expect(warning.readiness.canApplyPatch).toBe(false);
    expect(warning.readiness.canRollback).toBe(false);
    expect(warning.readiness.canWriteEventStore).toBe(false);
    expect(warning.readiness.canApprove).toBe(false);
    expect(warning.readiness.canReject).toBe(false);
    expect(warning.readiness.canIssuePermissionLease).toBe(false);
    expect(warning.readiness.canExecuteGit).toBe(false);
    expect(warning.readiness.canExecuteShell).toBe(false);
    expect(warning.readiness.appCanExecute).toBe(false);
    expect(blocked.status).toBe("blocked");
    expect(blocked.findings.map((finding) => finding.code)).toContain(
      "LIVE_PROPOSAL_GATE_EXECUTION_FLAG_TRUE"
    );
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("Authorization:");
  });

  it("places live proposal preview gate refs into context no_compress_zone", () => {
    const gate = buildLiveProposalPreviewGateView({
      liveProposalApiKeyPolicyView: buildLiveProposalOptInGateView({
        modelProfileId: "deepseek-chat",
        keySourceRef: "DEEPSEEK_API_KEY",
        optInMode: "explicit_live_proposal_opt_in"
      }),
      liveProposalRequestBuilderView: buildLiveProposalRequestBuilderView({
        objectiveSummary: "Create a summary-only docs proposal.",
        intent: "Generate a structured model_patch_proposal draft.",
        modelProfileId: "deepseek-chat",
        keySourceRef: "DEEPSEEK_API_KEY",
        optInMode: "explicit_live_proposal_opt_in",
        allowedPathRefsText: "docs/live-proposal-preview-gate.md"
      }),
      liveProposalValidationIntegrationView:
        buildLiveProposalValidationIntegrationView()
    });
    const runDraft = buildRunDraftView({
      objectiveDraft: "Review the App live proposal gate.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Gate ref enters context.",
      workspaceRoot: "D:\\workspace"
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      liveProposalPreviewGate: gate
    });
    const gateSegment = contextPreview.segments.find(
      (segment) => segment.sourceKind === "live_proposal_preview_gate"
    );
    const serialized = JSON.stringify({ gate, contextPreview });

    expect(gateSegment).toMatchObject({
      placement: "no_compress_zone",
      sourceRefId: gate.gateId
    });
    expect(gateSegment?.warningCodes).toContain(
      "LIVE_PROPOSAL_PREVIEW_GATE_NO_COMPRESS"
    );
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("apiKeyValue");
  });

  it("keeps App source preview gate disabled without live call wiring", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "live-proposal-preview-gate-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}`;
    const normalizedAppSource = appSource.replace(/\s+/g, " ");

    expect(appSource).toContain("App Live Proposal Preview Gate");
    expect(appSource).toContain("Disabled by default / no App live call");
    expect(appSource).toContain("Preview Live Proposal Gate");
    expect(appSource).toContain("Call DeepSeek (disabled)");
    expect(appSource).toContain("Send Live Proposal Request (disabled)");
    expect(normalizedAppSource).toContain(
      "The App Shell cannot read API keys, call DeepSeek, fetch network, apply patches, rollback, approve, issue leases, or write events."
    );
    expect(appSource).not.toContain('type="password"');
    expect(appSource).not.toContain("Authorization input");
    expect(appSource).not.toContain("handleCallDeepSeek");
    expect(appSource).not.toContain("handleSendLiveProposalRequest");
    expect(appSource).not.toContain("handleApplyLiveProposalGate");
    expect(appSource).not.toContain("handleRollbackLiveProposalGate");
    expect(viewSource).not.toContain("process.env");
    expect(viewSource).not.toContain("fetch(");
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toContain("recordControlRunDraftEvent");
    expect(viewSource).not.toContain("runLiveDeepSeekProposalAdapter");
    expect(combined).not.toContain("readLiveProposalApiKey");
    expect(combined).not.toContain("writeLiveProposalEvent");
  });

  it("documents the App live proposal preview gate boundary", async () => {
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-proposal-preview-gate-v0.8.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${appDoc}\n${docsIndex}`;

    expect(combined).toContain("App Shell Live Proposal Preview Gate v0.8");
    expect(combined).toContain("App gate only");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No request send");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No apply or rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("No Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("app-shell-live-proposal-preview-gate-v0.8.md");
  });
});

describe("app live proposal telemetry redaction audit", () => {
  it("builds a summary-only telemetry audit view without execution readiness", () => {
    const policy = buildLiveProposalOptInGateView({
      modelProfileId: "deepseek-chat",
      keySourceRef: "DEEPSEEK_API_KEY",
      optInMode: "explicit_live_proposal_opt_in"
    });
    const request = buildLiveProposalRequestBuilderView({
      objectiveSummary: "Create a summary-only telemetry proposal.",
      intent: "Generate a structured model_patch_proposal draft.",
      modelProfileId: "deepseek-chat",
      keySourceRef: "DEEPSEEK_API_KEY",
      optInMode: "explicit_live_proposal_opt_in",
      allowedPathRefsText: "docs/live-proposal-telemetry.md"
    });
    const validation = buildLiveProposalValidationIntegrationView();
    const gate = buildLiveProposalPreviewGateView({
      liveProposalApiKeyPolicyView: policy,
      liveProposalRequestBuilderView: request,
      liveProposalValidationIntegrationView: validation
    });
    const view = buildLiveProposalTelemetryAuditView({
      liveProposalApiKeyPolicyView: policy,
      liveProposalRequestBuilderView: request,
      liveProposalValidationIntegrationView: validation,
      liveProposalPreviewGateView: gate
    });
    const blocked = buildLiveProposalTelemetryAuditView({
      liveProposalPreviewGateView: {
        ...gate,
        readiness: {
          ...gate.readiness,
          appCanExecute: true as false
        }
      }
    });
    const serialized = JSON.stringify({ view, blocked });

    expect(view.status).toBe("warning");
    expect(view.source).toBe("runtime_live_proposal_telemetry_redaction_audit");
    expect(view.recordCount).toBeGreaterThan(0);
    expect(view.apiKeyLeakDetected).toBe(false);
    expect(view.rawPromptDetected).toBe(false);
    expect(view.rawResponseDetected).toBe(false);
    expect(view.reasoningContentPersisted).toBe(false);
    expect(view.readiness.canWriteTelemetryEvent).toBe(false);
    expect(view.readiness.canPersistRawPrompt).toBe(false);
    expect(view.readiness.canPersistRawResponse).toBe(false);
    expect(view.readiness.canPersistReasoningContent).toBe(false);
    expect(view.readiness.canReadApiKey).toBe(false);
    expect(view.readiness.canCallLiveModel).toBe(false);
    expect(view.readiness.canFetchNetwork).toBe(false);
    expect(view.readiness.canWriteEventStore).toBe(false);
    expect(view.readiness.canApplyPatch).toBe(false);
    expect(view.readiness.canRollback).toBe(false);
    expect(view.readiness.canExecuteGit).toBe(false);
    expect(view.readiness.canExecuteShell).toBe(false);
    expect(view.readiness.appCanExecute).toBe(false);
    expect(blocked.status).toBe("blocked");
    expect(blocked.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_READINESS_REJECTED"
    );
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("model response text");
    expect(serialized).not.toContain("model prompt text");
    expect(serialized).not.toContain("Authorization:");
  });

  it("keeps App source telemetry audit disabled without writes or live calls", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "live-proposal-telemetry-audit-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}`;

    expect(appSource).toContain("Live Proposal Telemetry / Redaction Audit");
    expect(appSource).toContain("Summary only / no raw prompt");
    expect(appSource).toContain("Preview Telemetry Audit");
    expect(appSource).toContain("Write Telemetry (disabled)");
    expect(appSource).not.toContain('type="password"');
    expect(appSource).not.toContain("Authorization input");
    expect(appSource).not.toContain("raw prompt input");
    expect(appSource).not.toContain("raw response input");
    expect(appSource).not.toContain("handleWriteTelemetry");
    expect(appSource).not.toContain("handleCallTelemetry");
    expect(appSource).not.toContain("handleCallDeepSeekTelemetry");
    expect(viewSource).not.toContain("process.env");
    expect(viewSource).not.toContain("fetch(");
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toContain("recordControlRunDraftEvent");
    expect(viewSource).not.toContain("runLiveDeepSeekProposalAdapter");
    expect(combined).not.toContain("writeLiveProposalTelemetryEvent");
    expect(combined).not.toContain("writeLiveProposalEvent");
  });

  it("documents runtime and App live proposal telemetry redaction audit boundaries", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-live-proposal-telemetry-redaction-audit-v0.8.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-proposal-telemetry-redaction-audit-v0.8.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain(
      "Runtime Live Proposal Telemetry / Redaction Audit v0.8"
    );
    expect(combined).toContain(
      "App Shell Live Proposal Telemetry / Redaction Audit v0.8"
    );
    expect(combined).toContain("Audit only");
    expect(combined).toContain("No live call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No raw prompt persistence");
    expect(combined).toContain("No raw response persistence");
    expect(combined).toContain("No reasoning_content persistence");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No file write");
    expect(combined).toContain("No apply or rollback");
    expect(combined).toContain("Usage summary only");
    expect(combined).toContain("No Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "runtime-live-proposal-telemetry-redaction-audit-v0.8.md"
    );
    expect(docsIndex).toContain(
      "app-shell-live-proposal-telemetry-redaction-audit-v0.8.md"
    );
  });
});

describe("app live proposal evaluation summary surface", () => {
  const safeEvaluationSummary = {
    source: "runtime_live_proposal_failure_metrics",
    metricsId: "metrics-safe",
    reportCount: 2,
    caseCount: 5,
    offlineCaseCount: 3,
    liveCaseCount: 2,
    taxonomyMetrics: {
      categories: {
        schema_failure: 0,
        malformed_json: 0,
        repair_failed: 0,
        unsafe_path: 1,
        forbidden_field: 0,
        secret_marker: 0,
        missing_evidence: 0,
        missing_test_plan: 1,
        high_risk_operation: 0,
        hallucinated_path: 0,
        poor_objective_fit: 0,
        raw_content_leak: 0,
        reasoning_content_leak: 0,
        usage_summary_missing: 0,
        no_failure_expected: 0
      },
      totalFailureCategoryCount: 2,
      dominantCategories: ["unsafe_path", "missing_test_plan"]
    },
    repairMetrics: {
      repairAttemptCount: 4,
      repairSuccessCount: 3,
      repairFailureCount: 1,
      repairSuccessRate: 0.75
    },
    schemaMetrics: {
      schemaEvaluatedCaseCount: 5,
      schemaPassedCount: 4,
      schemaBlockedCount: 1,
      schemaWarningCount: 1,
      schemaPassRate: 0.8
    },
    expectationMetrics: {
      passedCount: 3,
      warningCount: 1,
      blockedCount: 1,
      failedExpectationCount: 1,
      matchedExpectationCount: 4
    },
    usageMetrics: {
      usageSummaryCaseCount: 2,
      requestCount: 2,
      responseCount: 2,
      totalPromptTokens: 30,
      totalCompletionTokens: 17,
      totalTokens: 47
    },
    blockerCount: 0,
    warningCount: 3,
    findingCount: 3,
    metricsHash: "abcdef1234567890"
  };

  it("builds empty, safe, and blocked read-only summary views", () => {
    const empty = buildLiveProposalEvaluationSummaryView();
    const parsed = parseLiveProposalEvaluationSummaryJson(
      JSON.stringify(safeEvaluationSummary)
    );
    const safe = buildLiveProposalEvaluationSummaryView({
      summaryJsonText: JSON.stringify(safeEvaluationSummary)
    });
    const blocked = buildLiveProposalEvaluationSummaryView({
      summaryJsonText: JSON.stringify({
        ...safeEvaluationSummary,
        readiness: {
          canRunEvaluation: true,
          appCanExecute: true
        }
      })
    });
    const serialized = JSON.stringify({ empty, safe, blocked });

    expect(parsed.ok).toBe(true);
    expect(empty.status).toBe("empty");
    expect(empty.readiness.canDisplaySummary).toBe(false);
    expect(safe.status).toBe("warning");
    expect(safe.source).toBe("app_live_proposal_evaluation_summary");
    expect(safe.reportCount).toBe(2);
    expect(safe.caseCount).toBe(5);
    expect(safe.passWarnBlockSummary).toMatchObject({
      passedCount: 3,
      warningCount: 1,
      blockedCount: 1,
      failedExpectationCount: 1
    });
    expect(safe.schemaPassRate).toBe(0.8);
    expect(safe.repairSuccessRate).toBe(0.75);
    expect(safe.taxonomySummary.categories.unsafe_path).toBe(1);
    expect(safe.usageSummary?.totalTokens).toBe(47);
    expect(safe.readiness.canDisplaySummary).toBe(true);
    expect(safe.readiness.canRunEvaluation).toBe(false);
    expect(safe.readiness.canCallLiveModel).toBe(false);
    expect(safe.readiness.canReadApiKey).toBe(false);
    expect(safe.readiness.canFetchNetwork).toBe(false);
    expect(safe.readiness.canWriteEventStore).toBe(false);
    expect(safe.readiness.canApplyPatch).toBe(false);
    expect(safe.readiness.canRollback).toBe(false);
    expect(safe.readiness.canExecuteGit).toBe(false);
    expect(safe.readiness.canExecuteShell).toBe(false);
    expect(safe.readiness.appCanExecute).toBe(false);
    expect(blocked.status).toBe("blocked");
    expect(blocked.findings.map((finding) => finding.code)).toContain(
      "EVALUATION_SUMMARY_EXECUTION_FLAG_TRUE"
    );
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("model prompt text");
    expect(serialized).not.toContain("model response text");
    expect(serialized).not.toContain("Authorization:");
  });

  it("blocks malformed JSON, raw fields, secret markers, unknown taxonomy, and raw usage text", () => {
    const malformed = buildLiveProposalEvaluationSummaryView({
      summaryJsonText: "{not json"
    });
    const rawPrompt = buildLiveProposalEvaluationSummaryView({
      summaryJsonText: JSON.stringify({
        ...safeEvaluationSummary,
        rawPrompt: "blocked"
      })
    });
    const secretMarker = buildLiveProposalEvaluationSummaryView({
      summaryJsonText: JSON.stringify({
        ...safeEvaluationSummary,
        safeLabel: "Bearer fake-token-12345678"
      })
    });
    const unknownTaxonomy = buildLiveProposalEvaluationSummaryView({
      summaryJsonText: JSON.stringify({
        ...safeEvaluationSummary,
        taxonomyMetrics: {
          categories: {
            unknown_failure: 1
          }
        }
      })
    });
    const rawUsage = buildLiveProposalEvaluationSummaryView({
      summaryJsonText: JSON.stringify({
        ...safeEvaluationSummary,
        usageMetrics: {
          totalTokens: 47,
          modelResponseText: "raw usage text"
        }
      })
    });
    const badRate = buildLiveProposalEvaluationSummaryView({
      summaryJsonText: JSON.stringify({
        ...safeEvaluationSummary,
        schemaMetrics: {
          schemaPassRate: 1.5
        }
      })
    });

    expect(malformed.status).toBe("blocked");
    expect(rawPrompt.status).toBe("blocked");
    expect(rawPrompt.findings.map((finding) => finding.code)).toContain(
      "RAWPROMPT_FIELD_REJECTED"
    );
    expect(secretMarker.status).toBe("blocked");
    expect(secretMarker.findings.map((finding) => finding.code)).toContain(
      "BEARER_TOKEN_MARKER"
    );
    expect(unknownTaxonomy.status).toBe("blocked");
    expect(unknownTaxonomy.findings.map((finding) => finding.code)).toContain(
      "UNKNOWN_TAXONOMY_CATEGORY"
    );
    expect(rawUsage.status).toBe("blocked");
    expect(rawUsage.findings.map((finding) => finding.code)).toContain(
      "USAGE_SUMMARY_RAW_TEXT_REJECTED"
    );
    expect(badRate.status).toBe("blocked");
    expect(badRate.findings.map((finding) => finding.code)).toContain(
      "INVALID_RATE_METRIC"
    );
  });

  it("keeps App evaluation summary surface read-only without runner or live call wiring", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "live-proposal-evaluation-summary-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}`;
    const normalizedAppSource = appSource.replace(/\s+/g, " ");

    expect(appSource).toContain("Live Proposal Evaluation Summary");
    expect(appSource).toContain("Read-only / no live call");
    expect(appSource).toContain("Preview Evaluation Summary");
    expect(appSource).toContain("Run Evaluation (disabled)");
    expect(appSource).toContain("Call DeepSeek for Evaluation (disabled)");
    expect(normalizedAppSource).toContain(
      "The App Shell does not run evaluation, call DeepSeek, read API keys, fetch network, apply patches, rollback, or write events."
    );
    expect(appSource).not.toContain('type="password"');
    expect(appSource).not.toContain("Authorization input");
    expect(appSource).not.toContain("handleRunLiveProposalEvaluation");
    expect(appSource).not.toContain("handleCallDeepSeekEvaluation");
    expect(viewSource).not.toContain("process.env");
    expect(viewSource).not.toContain("fetch(");
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toContain("recordControlRunDraftEvent");
    expect(viewSource).not.toContain("runLiveProposalEvaluation(");
    expect(viewSource).not.toContain("runLiveDeepSeekProposalAdapter");
    expect(combined).not.toContain("writeLiveProposalEvaluationEvent");
    expect(combined).not.toContain("readLiveProposalApiKey");
  });

  it("documents the App live proposal evaluation summary boundary", async () => {
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-proposal-evaluation-summary-v0.9.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${appDoc}\n${docsIndex}`;

    expect(combined).toContain(
      "App Shell Live Proposal Evaluation Summary v0.9"
    );
    expect(combined).toContain("read-only summary surface");
    expect(combined).toContain("no evaluator execution");
    expect(combined).toContain("no live call");
    expect(combined).toContain("no API key read");
    expect(combined).toContain("no fetch/network");
    expect(combined).toContain("no raw prompt persistence");
    expect(combined).toContain("no raw response persistence");
    expect(combined).toContain("no reasoning_content persistence");
    expect(combined).toContain("Failure Taxonomy");
    expect(combined).toContain("schema_failure");
    expect(combined).toContain("repair_failed");
    expect(combined).toContain("unsafe_path");
    expect(combined).toContain("secret_marker");
    expect(combined).toContain("No apply/rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git/shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "app-shell-live-proposal-evaluation-summary-v0.9.md"
    );
  });
});

describe("app live proposal evaluation telemetry audit surface", () => {
  const safeAuditReport = {
    status: "audit_ready",
    source: "runtime_live_proposal_evaluation_telemetry_audit",
    auditId: "audit-safe",
    auditMode: "summary_only_audit",
    recordCount: 3,
    offlineReportCount: 1,
    liveReportCount: 1,
    metricsReportCount: 1,
    appSummaryCount: 1,
    rawFieldDetectedCount: 0,
    redactedFieldCount: 0,
    apiKeyLeakDetected: false,
    rawPromptDetected: false,
    rawResponseDetected: false,
    reasoningContentPersisted: false,
    usageSummary: {
      usageSummaryCaseCount: 2,
      requestCount: 2,
      responseCount: 2,
      totalPromptTokens: 30,
      totalCompletionTokens: 15,
      totalTokens: 45
    },
    redactionSummary: {
      redactedFieldCount: 0,
      rawFieldDetectedCount: 0,
      apiKeyLeakDetected: false,
      rawPromptDetected: false,
      rawResponseDetected: false,
      reasoningContentPersisted: false,
      rawSourceDetected: false,
      rawDiffDetected: false,
      outputSummaryOnly: true
    },
    records: [
      {
        recordId: "usage-summary-record",
        kind: "usage_summary",
        source: "runtime_live_proposal_evaluation_telemetry_audit",
        status: "passed",
        summary: "tokens:45",
        warningCodes: []
      }
    ],
    findings: [],
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    auditHash: "abcdef1234567890",
    readiness: {
      canEnterRcSummary: true,
      canWriteTelemetryEvent: false,
      canPersistRawPrompt: false,
      canPersistRawResponse: false,
      canPersistReasoningContent: false,
      canReadApiKey: false,
      canCallLiveModel: false,
      canFetchNetwork: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: "summary only"
  };

  it("builds empty and safe read-only audit views", () => {
    const empty = buildLiveProposalEvaluationTelemetryAuditView();
    const safe = buildLiveProposalEvaluationTelemetryAuditView({
      auditJsonText: JSON.stringify(safeAuditReport)
    });
    const fromSummary = buildLiveProposalEvaluationTelemetryAuditView({
      appEvaluationSummaryView: buildLiveProposalEvaluationSummaryView({
        summaryJsonText: JSON.stringify({
          source: "runtime_live_proposal_failure_metrics",
          metricsId: "metrics-safe",
          reportCount: 1,
          caseCount: 1,
          usageMetrics: {
            usageSummaryCaseCount: 1,
            requestCount: 1,
            responseCount: 1,
            totalTokens: 9
          },
          taxonomyMetrics: {
            categories: {
              no_failure_expected: 1
            }
          },
          repairMetrics: {
            repairSuccessRate: 1
          },
          schemaMetrics: {
            schemaPassRate: 1
          },
          expectationMetrics: {
            passedCount: 1,
            warningCount: 0,
            blockedCount: 0,
            failedExpectationCount: 0
          },
          metricsHash: "metrics-safe-hash"
        })
      })
    });
    const serialized = JSON.stringify({ empty, safe, fromSummary });

    expect(empty.status).toBe("empty");
    expect(empty.readiness.canEnterRcSummary).toBe(false);
    expect(safe.status).toBe("audit_ready");
    expect(safe.source).toBe(
      "runtime_live_proposal_evaluation_telemetry_audit"
    );
    expect(safe.recordCount).toBe(3);
    expect(safe.usageSummary?.totalTokens).toBe(45);
    expect(safe.apiKeyLeakDetected).toBe(false);
    expect(safe.rawPromptDetected).toBe(false);
    expect(safe.rawResponseDetected).toBe(false);
    expect(safe.reasoningContentPersisted).toBe(false);
    expect(safe.readiness.canWriteTelemetryEvent).toBe(false);
    expect(safe.readiness.canCallLiveModel).toBe(false);
    expect(safe.readiness.canReadApiKey).toBe(false);
    expect(safe.readiness.canFetchNetwork).toBe(false);
    expect(safe.readiness.canApplyPatch).toBe(false);
    expect(safe.readiness.canRollback).toBe(false);
    expect(safe.readiness.canExecuteGit).toBe(false);
    expect(safe.readiness.canExecuteShell).toBe(false);
    expect(safe.readiness.appCanExecute).toBe(false);
    expect(fromSummary.status).toBe("warning");
    expect(fromSummary.appSummaryCount).toBe(1);
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("model prompt text");
    expect(serialized).not.toContain("model response text");
    expect(serialized).not.toContain("Authorization:");
  });

  it("blocks raw prompt, raw response, reasoning_content, and API key markers", () => {
    const rawPrompt = buildLiveProposalEvaluationTelemetryAuditView({
      auditJsonText: JSON.stringify({
        ...safeAuditReport,
        rawPrompt: "blocked"
      })
    });
    const rawResponse = buildLiveProposalEvaluationTelemetryAuditView({
      auditJsonText: JSON.stringify({
        ...safeAuditReport,
        rawResponse: "blocked"
      })
    });
    const reasoning = buildLiveProposalEvaluationTelemetryAuditView({
      auditJsonText: JSON.stringify({
        ...safeAuditReport,
        reasoning_content: "blocked"
      })
    });
    const secret = buildLiveProposalEvaluationTelemetryAuditView({
      auditJsonText: JSON.stringify({
        ...safeAuditReport,
        safeLabel: "Bearer fake-token-12345678"
      })
    });

    expect(rawPrompt.status).toBe("blocked");
    expect(rawPrompt.findings.map((finding) => finding.code)).toContain(
      "RAWPROMPT_FIELD_REJECTED"
    );
    expect(rawResponse.status).toBe("blocked");
    expect(rawResponse.findings.map((finding) => finding.code)).toContain(
      "RAWRESPONSE_FIELD_REJECTED"
    );
    expect(reasoning.status).toBe("blocked");
    expect(reasoning.findings.map((finding) => finding.code)).toContain(
      "REASONING_CONTENT_FIELD_REJECTED"
    );
    expect(secret.status).toBe("blocked");
    expect(secret.findings.map((finding) => finding.code)).toContain(
      "BEARER_TOKEN_MARKER"
    );
  });

  it("keeps App source telemetry audit read-only without runner or live call wiring", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(
        appRoot,
        "src",
        "live-proposal-evaluation-telemetry-audit-view.ts"
      ),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}`;
    const normalizedAppSource = appSource.replace(/\s+/g, " ");

    expect(appSource).toContain("Live Proposal Evaluation Telemetry Audit");
    expect(appSource).toContain("Read-only / no raw output");
    expect(appSource).toContain("Preview Evaluation Telemetry Audit");
    expect(appSource).toContain("Run Telemetry Audit (disabled)");
    expect(appSource).toContain("Write Telemetry Event (disabled)");
    expect(normalizedAppSource).toContain(
      "The App Shell does not run evaluation, call DeepSeek, fetch network, apply patches, rollback, or write events."
    );
    expect(appSource).not.toContain('type="password"');
    expect(appSource).not.toContain("Authorization input");
    expect(appSource).not.toContain("handleRunEvaluationTelemetryAudit");
    expect(appSource).not.toContain("handleWriteEvaluationTelemetryEvent");
    expect(viewSource).not.toContain("process.env");
    expect(viewSource).not.toContain("fetch(");
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toContain("recordControlRunDraftEvent");
    expect(viewSource).not.toContain("runLiveProposalEvaluation(");
    expect(viewSource).not.toContain("runLiveDeepSeekProposalAdapter");
    expect(combined).not.toContain("writeLiveProposalEvaluationTelemetryEvent");
    expect(combined).not.toContain("readLiveProposalApiKey");
  });

  it("documents runtime and App evaluation telemetry audit boundaries", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-live-proposal-evaluation-telemetry-audit-v0.9.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-proposal-evaluation-telemetry-audit-v0.9.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain(
      "Runtime Live Proposal Evaluation Telemetry Audit v0.9"
    );
    expect(combined).toContain(
      "App Shell Live Proposal Evaluation Telemetry Audit v0.9"
    );
    expect(combined).toContain("telemetry audit only");
    expect(combined).toContain("no evaluator execution");
    expect(combined).toContain("no live call");
    expect(combined).toContain("no API key read");
    expect(combined).toContain("no fetch/network");
    expect(combined).toContain("no raw prompt");
    expect(combined).toContain("no raw response");
    expect(combined).toContain("no reasoning_content persistence");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No apply/rollback");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No Git/shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "runtime-live-proposal-evaluation-telemetry-audit-v0.9.md"
    );
    expect(docsIndex).toContain(
      "app-shell-live-proposal-evaluation-telemetry-audit-v0.9.md"
    );
  });
});

describe("app patch proposal validation preview", () => {
  it("builds an empty validation preview until a patch proposal exists", () => {
    const view = buildPatchProposalValidationPreviewView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.validationOnly).toBe(true);
    expect(view.applyEnabled).toBe(false);
    expect(view.virtualApplyEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
  });

  it("validates a safe patch proposal creation preview through the runtime helper", () => {
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update docs and tests",
      changeDescriptionSummary: "Summary-only validation preview.",
      pathRefsText: "docs/validation.md\nruntime/test/validation.test.ts",
      defaultChangeKind: "documentation",
      estimatedLinesAdded: 4,
      estimatedLinesRemoved: 1,
      selectedIntent: "documentation"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const serialized = JSON.stringify(validationView);

    expect(validationView.source).toBe("runtime_patch_validation_preview");
    expect(validationView.status).toBe("needs_approval");
    expect(validationView.proposalId).toBe(proposalView.proposalId);
    expect(validationView.readiness.canProceedToDiffAuditPreview).toBe(true);
    expect(validationView.readiness.canApplyPatch).toBe(false);
    expect(validationView.noCompressRequired).toBe(true);
    expect(validationView.contextPlacement).toBe("no_compress_zone");
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("rawDiff");
  });

  it("rejects unsafe raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const rawFieldProposal = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe proposal",
      pathRefsText: JSON.stringify([
        {
          path: "app/src/App.tsx",
          changeKind: "update",
          beforeContent: "do not keep"
        }
      ]),
      selectedIntent: "code_change"
    });
    const markerProposal = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe marker proposal",
      pathRefsText: `app/src/App.tsx ${secret}`,
      selectedIntent: "code_change"
    });
    const rawFieldValidation = buildPatchProposalValidationPreviewView({
      proposalPreview: rawFieldProposal
    });
    const markerValidation = buildPatchProposalValidationPreviewView({
      proposalPreview: markerProposal
    });
    const serialized = JSON.stringify({
      rawFieldValidation,
      markerValidation
    });

    expect(rawFieldProposal.status).toBe("blocked");
    expect(rawFieldValidation.status).toBe("blocked");
    expect(rawFieldValidation.warningCodes).toEqual(
      expect.arrayContaining(["PATCH_PREVIEW_RAW_FIELD_REJECTED"])
    );
    expect(markerProposal.status).toBe("blocked");
    expect(markerValidation.status).toBe("blocked");
    expect(markerValidation.warningCodes).toEqual(
      expect.arrayContaining(["API_KEY_MARKER"])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("feeds Diff, Approval, Audit, and Context Assembly surfaces with summary refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Validate a local patch proposal preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Validation summary appears",
      workspaceRoot: "D:\\workspace"
    });
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update app validation panel",
      changeDescriptionSummary: "Summary-only validation preview.",
      pathRefsText: "app/src/App.tsx\nruntime/test/app.test.ts",
      defaultChangeKind: "update",
      estimatedLinesAdded: 6,
      estimatedLinesRemoved: 1,
      selectedIntent: "code_change",
      runDraft
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: [
        ...(patchProposalCreationSurfaceSummaries(proposalView) ?? []),
        ...(patchProposalValidationSurfaceSummaries(validationView) ?? [])
      ],
      futureApprovalRefs: [
        ...patchProposalCreationApprovalRefs(proposalView),
        ...patchProposalValidationApprovalRefs(validationView)
      ],
      futureAuditWarningCodes:
        patchProposalValidationAuditWarningCodes(validationView)
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface: surfaces.diff
    });
    const serialized = JSON.stringify({
      surfaces,
      contextPreview
    });

    expect(surfaces.diff.items).toHaveLength(2);
    expect(
      surfaces.diff.items.some((item) => item.status.startsWith("validation_"))
    ).toBe(true);
    expect(surfaces.approval.items.some((item) => item.kind === "patch")).toBe(
      true
    );
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `PATCH_VALIDATION_FINDINGS_${validationView.findingCount}`,
        `PATCH_VALIDATION_WARNINGS_${validationView.warningCount}`
      ])
    );
    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceRefId === "patch-validation-preview-surface" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps App UI validation-only without Tauri, EventStore, fs, or execution handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "patch-proposal-validation-preview-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Patch Proposal Validation Preview");
    expect(appSource).toContain("Validation only / no apply");
    expect(appSource).toContain("handleValidatePatchProposal");
    expect(appSource).toContain("Validation");
    expect(appSource).toMatch(
      /Validation\s+passing\s+does\s+not\s+enable\s+apply\./
    );
    expect(combined).not.toContain("handleApplyPatch");
    expect(combined).not.toContain("applyPatch");
    expect(combined).not.toContain("approvePatch");
    expect(combined).not.toContain("rejectPatch");
    expect(combined).not.toContain("executePatch");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("patch_proposal_validation");
  });
});

describe("app patch diff audit preview", () => {
  it("builds an empty diff audit preview until proposal and validation summaries exist", () => {
    const view = buildPatchDiffAuditPreviewView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.diffGenerated).toBe(false);
    expect(view.applyEnabled).toBe(false);
    expect(view.virtualApplyEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
  });

  it("generates a summary-only diff audit preview from safe proposal and validation views", () => {
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update safe summary path",
      changeDescriptionSummary: "Summary-only diff audit preview.",
      pathRefsText: "examples/summary.txt",
      defaultChangeKind: "update",
      estimatedLinesAdded: 4,
      estimatedLinesRemoved: 1,
      selectedIntent: "documentation"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });
    const serialized = JSON.stringify(auditView);

    expect(auditView.source).toBe("runtime_patch_diff_audit_preview");
    expect(auditView.proposalId).toBe(proposalView.proposalId);
    expect(auditView.validationId).toBe(validationView.validationId);
    expect(auditView.status).toBe("needs_approval");
    expect(auditView.diffGenerated).toBe(false);
    expect(auditView.readiness.canProceedToApprovalDraftPreview).toBe(true);
    expect(auditView.readiness.canProceedToVirtualApplyPreview).toBe(false);
    expect(auditView.readiness.canApplyPatch).toBe(false);
    expect(auditView.contextPlacement).toBe("no_compress_zone");
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("rawDiff");
  });

  it("keeps validation blockers from becoming ready audit previews", () => {
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe validation blocker",
      pathRefsText: ".env.local",
      selectedIntent: "code_change"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });

    expect(validationView.status).toBe("blocked");
    expect(auditView.status).toBe("blocked");
    expect(auditView.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_DIFF_AUDIT_VALIDATION_BLOCKED",
        "PATCH_DIFF_AUDIT_VALIDATION_NOT_READY"
      ])
    );
    expect(auditView.readiness.canProceedToApprovalDraftPreview).toBe(false);
  });

  it("rejects unsafe raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const rawFieldProposal = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe audit proposal",
      pathRefsText: JSON.stringify([
        {
          path: "app/src/App.tsx",
          changeKind: "update",
          beforeContent: "do not keep"
        }
      ]),
      selectedIntent: "code_change"
    });
    const markerProposal = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe marker audit proposal",
      pathRefsText: `app/src/App.tsx ${secret}`,
      selectedIntent: "code_change"
    });
    const rawFieldValidation = buildPatchProposalValidationPreviewView({
      proposalPreview: rawFieldProposal
    });
    const markerValidation = buildPatchProposalValidationPreviewView({
      proposalPreview: markerProposal
    });
    const rawFieldAudit = buildPatchDiffAuditPreviewView({
      proposalPreview: rawFieldProposal,
      validationPreview: rawFieldValidation
    });
    const markerAudit = buildPatchDiffAuditPreviewView({
      proposalPreview: markerProposal,
      validationPreview: markerValidation
    });
    const serialized = JSON.stringify({ rawFieldAudit, markerAudit });

    expect(rawFieldAudit.status).toBe("blocked");
    expect(rawFieldAudit.warningCodes).toEqual(
      expect.arrayContaining(["PATCH_PREVIEW_RAW_FIELD_REJECTED"])
    );
    expect(markerAudit.status).toBe("blocked");
    expect(markerAudit.warningCodes).toEqual(
      expect.arrayContaining(["API_KEY_MARKER"])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("feeds Diff, Approval, Audit, and Context Assembly with audit summary refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Audit a local patch proposal preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Diff audit summary appears",
      workspaceRoot: "D:\\workspace"
    });
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update app audit panel",
      changeDescriptionSummary: "Summary-only diff audit preview.",
      pathRefsText: "app/src/App.tsx\napp/test/desktop-shell.test.ts",
      defaultChangeKind: "update",
      estimatedLinesAdded: 6,
      estimatedLinesRemoved: 1,
      selectedIntent: "code_change",
      runDraft
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: [
        ...(patchProposalCreationSurfaceSummaries(proposalView) ?? []),
        ...(patchProposalValidationSurfaceSummaries(validationView) ?? []),
        ...(patchDiffAuditSurfaceSummaries(auditView) ?? [])
      ],
      futureApprovalRefs: [
        ...patchProposalCreationApprovalRefs(proposalView),
        ...patchProposalValidationApprovalRefs(validationView),
        ...patchDiffAuditApprovalRefs(auditView)
      ],
      futureAuditWarningCodes: [
        ...patchProposalValidationAuditWarningCodes(validationView),
        ...patchDiffAuditWarningCodes(auditView)
      ]
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface: surfaces.diff
    });
    const serialized = JSON.stringify({
      surfaces,
      contextPreview
    });

    expect(surfaces.diff.items).toHaveLength(3);
    expect(
      surfaces.diff.items.some((item) => item.status.startsWith("diff_audit_"))
    ).toBe(true);
    expect(surfaces.approval.items.some((item) => item.kind === "patch")).toBe(
      true
    );
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `PATCH_DIFF_AUDIT_FINDINGS_${auditView.findingCount}`,
        `PATCH_DIFF_AUDIT_WARNINGS_${auditView.warningCount}`
      ])
    );
    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceRefId === "patch-diff-audit-preview-surface" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps App UI audit-preview-only without Tauri, EventStore, fs, or execution handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "patch-diff-audit-preview-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Patch Diff Audit Preview");
    expect(appSource).toContain("Audit preview / no raw diff");
    expect(appSource).toContain("handlePreviewDiffAudit");
    expect(appSource).toContain("Preview Diff Audit");
    expect(appSource).toContain("no patch is applied");
    expect(combined).not.toContain("handleApplyPatch");
    expect(combined).not.toContain("applyPatch");
    expect(combined).not.toContain("approvePatch");
    expect(combined).not.toContain("rejectPatch");
    expect(combined).not.toContain("executePatch");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("patch_diff_audit_preview");
  });
});

describe("app patch approval draft", () => {
  it("builds an empty approval draft until proposal, validation, and audit summaries exist", () => {
    const view = buildPatchApprovalDraftView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.draftOnly).toBe(true);
    expect(view.approvalExecutionEnabled).toBe(false);
    expect(view.rejectionExecutionEnabled).toBe(false);
    expect(view.permissionLeaseIssuingEnabled).toBe(false);
    expect(view.applyEnabled).toBe(false);
    expect(view.virtualApplyEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
  });

  it("generates a summary-only approval draft from safe proposal, validation, and audit views", () => {
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update approval docs",
      changeDescriptionSummary: "Summary-only approval draft preview.",
      pathRefsText: "docs/approval-draft.md",
      defaultChangeKind: "documentation",
      estimatedLinesAdded: 4,
      estimatedLinesRemoved: 1,
      selectedIntent: "documentation"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });
    const approvalView = buildPatchApprovalDraftView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView
    });
    const serialized = JSON.stringify(approvalView);

    expect(approvalView.source).toBe("runtime_patch_approval_draft");
    expect(approvalView.proposalId).toBe(proposalView.proposalId);
    expect(approvalView.validationId).toBe(validationView.validationId);
    expect(approvalView.auditId).toBe(auditView.auditId);
    expect(approvalView.status).toBe("needs_manual_review");
    expect(approvalView.readiness.canProceedToApprovalReviewPreview).toBe(true);
    expect(approvalView.readiness.canApprove).toBe(false);
    expect(approvalView.readiness.canReject).toBe(false);
    expect(approvalView.readiness.canIssueLease).toBe(false);
    expect(approvalView.readiness.canApplyPatch).toBe(false);
    expect(approvalView.contextPlacement).toBe("no_compress_zone");
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("rawDiff");
  });

  it("keeps validation blockers from becoming ready approval drafts", () => {
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe approval proposal",
      pathRefsText: ".env.local",
      selectedIntent: "code_change"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });
    const approvalView = buildPatchApprovalDraftView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView
    });

    expect(validationView.status).toBe("blocked");
    expect(approvalView.status).toBe("blocked");
    expect(approvalView.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_APPROVAL_VALIDATION_BLOCKED",
        "PATCH_APPROVAL_AUDIT_BLOCKED"
      ])
    );
    expect(approvalView.readiness.canProceedToApprovalReviewPreview).toBe(
      false
    );
  });

  it("rejects unsafe raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const rawFieldProposal = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe approval raw field",
      pathRefsText: JSON.stringify([
        {
          path: "app/src/App.tsx",
          changeKind: "update",
          beforeContent: "do not keep"
        }
      ]),
      selectedIntent: "code_change"
    });
    const markerProposal = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe approval marker",
      pathRefsText: `app/src/App.tsx ${secret}`,
      selectedIntent: "code_change"
    });
    const rawFieldValidation = buildPatchProposalValidationPreviewView({
      proposalPreview: rawFieldProposal
    });
    const markerValidation = buildPatchProposalValidationPreviewView({
      proposalPreview: markerProposal
    });
    const rawFieldAudit = buildPatchDiffAuditPreviewView({
      proposalPreview: rawFieldProposal,
      validationPreview: rawFieldValidation
    });
    const markerAudit = buildPatchDiffAuditPreviewView({
      proposalPreview: markerProposal,
      validationPreview: markerValidation
    });
    const rawFieldApproval = buildPatchApprovalDraftView({
      proposalPreview: rawFieldProposal,
      validationPreview: rawFieldValidation,
      diffAuditPreview: rawFieldAudit
    });
    const markerApproval = buildPatchApprovalDraftView({
      proposalPreview: markerProposal,
      validationPreview: markerValidation,
      diffAuditPreview: markerAudit
    });
    const serialized = JSON.stringify({ rawFieldApproval, markerApproval });

    expect(rawFieldApproval.status).toBe("blocked");
    expect(rawFieldApproval.warningCodes).toEqual(
      expect.arrayContaining(["PATCH_PREVIEW_RAW_FIELD_REJECTED"])
    );
    expect(markerApproval.status).toBe("blocked");
    expect(markerApproval.warningCodes).toEqual(
      expect.arrayContaining(["API_KEY_MARKER"])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("feeds Diff, Approval, Audit, and Context Assembly with approval draft summary refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Draft approval for a local patch proposal preview.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Approval draft summary appears",
      workspaceRoot: "D:\\workspace"
    });
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update app approval panel",
      changeDescriptionSummary: "Summary-only approval draft preview.",
      pathRefsText: "app/src/App.tsx\napp/test/desktop-shell.test.ts",
      defaultChangeKind: "update",
      estimatedLinesAdded: 6,
      estimatedLinesRemoved: 1,
      selectedIntent: "code_change",
      runDraft
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });
    const approvalView = buildPatchApprovalDraftView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: [
        ...(patchProposalCreationSurfaceSummaries(proposalView) ?? []),
        ...(patchProposalValidationSurfaceSummaries(validationView) ?? []),
        ...(patchDiffAuditSurfaceSummaries(auditView) ?? []),
        ...(patchApprovalDraftSurfaceSummaries(approvalView) ?? [])
      ],
      futureApprovalRefs: [
        ...patchProposalCreationApprovalRefs(proposalView),
        ...patchProposalValidationApprovalRefs(validationView),
        ...patchDiffAuditApprovalRefs(auditView),
        ...patchApprovalDraftApprovalRefs(approvalView)
      ],
      futureAuditWarningCodes: [
        ...patchProposalValidationAuditWarningCodes(validationView),
        ...patchDiffAuditWarningCodes(auditView),
        ...patchApprovalDraftWarningCodes(approvalView)
      ]
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface: surfaces.diff
    });
    const serialized = JSON.stringify({ surfaces, contextPreview });

    expect(surfaces.diff.items).toHaveLength(4);
    expect(
      surfaces.diff.items.some((item) =>
        item.status.startsWith("approval_draft_")
      )
    ).toBe(true);
    expect(surfaces.approval.items.some((item) => item.kind === "patch")).toBe(
      true
    );
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `PATCH_APPROVAL_DRAFT_FINDINGS_${approvalView.findingCount}`,
        `PATCH_APPROVAL_DRAFT_STATUS_${approvalView.status.toUpperCase()}`
      ])
    );
    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceRefId === "patch-approval-draft-preview-surface" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps App UI draft-only without Tauri, EventStore, fs, or approval execution handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "patch-approval-draft-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Patch Approval Draft");
    expect(appSource).toContain("Draft only / no approval execution");
    expect(appSource).toContain("handlePreviewApprovalDraft");
    expect(appSource).toMatch(
      /No\s+approval,\s+rejection,\s+or\s+lease\s+is\s+issued,\s+and\s+patch\s+apply\s+stays\s+disabled\./
    );
    expect(combined).not.toContain("handleApprove");
    expect(combined).not.toContain("handleRejectPatch");
    expect(combined).not.toContain("handleIssueLease");
    expect(combined).not.toContain("handleApplyPatch");
    expect(combined).not.toContain("approvePatch");
    expect(combined).not.toContain("rejectPatch");
    expect(combined).not.toContain("issuePermissionLease");
    expect(combined).not.toContain("executePatch");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("patch_approval_draft");
  });
});

describe("app patch virtual apply preview", () => {
  function safeWorkspaceIndex() {
    return buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: {
        workspaceIndexId: "workspace-index-virtual",
        indexHash: "workspacehashvirtual",
        directoryCount: 1,
        fileSummaries: [
          {
            path: "examples/summary.txt",
            language: "unknown",
            extension: "txt",
            sizeBytes: 120,
            lineCount: 12,
            symbolCount: 0,
            hash: "abc12345",
            indexed: true
          }
        ],
        languageSummary: [
          {
            language: "unknown",
            fileCount: 1,
            indexedFileCount: 1,
            lineCount: 12,
            sizeBytes: 120
          }
        ]
      }
    });
  }

  function safeVirtualChain() {
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update virtual apply summary",
      changeDescriptionSummary: "Summary-only virtual apply preview.",
      pathRefsText: "examples/summary.txt",
      defaultChangeKind: "update",
      estimatedLinesAdded: 8,
      estimatedLinesRemoved: 1,
      selectedIntent: "documentation"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });
    const approvalView = buildPatchApprovalDraftView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView
    });
    const workspaceIndex = safeWorkspaceIndex();
    const virtualView = buildPatchVirtualApplyPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView,
      approvalDraft: approvalView,
      workspaceIndexRef: workspaceIndex
    });
    return {
      proposalView,
      validationView,
      auditView,
      approvalView,
      workspaceIndex,
      virtualView
    };
  }

  it("builds an empty virtual apply preview until approval draft summaries exist", () => {
    const view = buildPatchVirtualApplyPreviewView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.inMemoryOnly).toBe(true);
    expect(view.applyEnabled).toBe(false);
    expect(view.rollbackEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
  });

  it("generates a summary-only virtual apply preview from safe patch previews and workspace summary", () => {
    const {
      virtualView,
      proposalView,
      validationView,
      auditView,
      approvalView
    } = safeVirtualChain();
    const serialized = JSON.stringify(virtualView);

    expect(virtualView.source).toBe("runtime_patch_virtual_apply_preview");
    expect(virtualView.proposalId).toBe(proposalView.proposalId);
    expect(virtualView.validationId).toBe(validationView.validationId);
    expect(virtualView.auditId).toBe(auditView.auditId);
    expect(virtualView.approvalDraftId).toBe(approvalView.approvalDraftId);
    expect(virtualView.status).toBe("needs_approval");
    expect(virtualView.inputSnapshot.snapshotId).toBe(
      "workspace-index-virtual"
    );
    expect(virtualView.operations).toHaveLength(1);
    expect(virtualView.operations[0]?.existsBefore).toBe(true);
    expect(virtualView.readiness.canProceedToRollbackCheckpointPreview).toBe(
      true
    );
    expect(virtualView.readiness.canWriteFilesystem).toBe(false);
    expect(virtualView.readiness.canApplyPatch).toBe(false);
    expect(virtualView.readiness.canExecuteGit).toBe(false);
    expect(virtualView.readiness.canExecuteShell).toBe(false);
    expect(virtualView.rollbackPreview.canRollbackReal).toBe(false);
    expect(virtualView.rollbackPreview.rollbackExecuted).toBe(false);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("function App");
  });

  it("keeps validation, audit, and approval blockers from becoming ready virtual apply previews", () => {
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe virtual apply proposal",
      pathRefsText: ".env.local",
      selectedIntent: "code_change"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });
    const approvalView = buildPatchApprovalDraftView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView
    });
    const virtualView = buildPatchVirtualApplyPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView,
      approvalDraft: approvalView,
      workspaceIndexRef: safeWorkspaceIndex()
    });

    expect(validationView.status).toBe("blocked");
    expect(auditView.status).toBe("blocked");
    expect(approvalView.status).toBe("blocked");
    expect(virtualView.status).toBe("blocked");
    expect(virtualView.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_VIRTUAL_APPLY_VALIDATION_BLOCKED",
        "PATCH_VIRTUAL_APPLY_AUDIT_BLOCKED",
        "PATCH_VIRTUAL_APPLY_APPROVAL_BLOCKED"
      ])
    );
    expect(virtualView.readiness.canProceedToRollbackCheckpointPreview).toBe(
      false
    );
  });

  it("rejects unsafe raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const rawFieldProposal = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe virtual raw field",
      pathRefsText: JSON.stringify([
        {
          path: "examples/summary.txt",
          changeKind: "update",
          beforeContent: "do not keep"
        }
      ]),
      selectedIntent: "code_change"
    });
    const markerProposal = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe virtual marker",
      pathRefsText: `examples/summary.txt ${secret}`,
      selectedIntent: "code_change"
    });
    const rawValidation = buildPatchProposalValidationPreviewView({
      proposalPreview: rawFieldProposal
    });
    const markerValidation = buildPatchProposalValidationPreviewView({
      proposalPreview: markerProposal
    });
    const rawAudit = buildPatchDiffAuditPreviewView({
      proposalPreview: rawFieldProposal,
      validationPreview: rawValidation
    });
    const markerAudit = buildPatchDiffAuditPreviewView({
      proposalPreview: markerProposal,
      validationPreview: markerValidation
    });
    const rawApproval = buildPatchApprovalDraftView({
      proposalPreview: rawFieldProposal,
      validationPreview: rawValidation,
      diffAuditPreview: rawAudit
    });
    const markerApproval = buildPatchApprovalDraftView({
      proposalPreview: markerProposal,
      validationPreview: markerValidation,
      diffAuditPreview: markerAudit
    });
    const rawVirtual = buildPatchVirtualApplyPreviewView({
      proposalPreview: rawFieldProposal,
      validationPreview: rawValidation,
      diffAuditPreview: rawAudit,
      approvalDraft: rawApproval,
      workspaceIndexRef: safeWorkspaceIndex()
    });
    const markerVirtual = buildPatchVirtualApplyPreviewView({
      proposalPreview: markerProposal,
      validationPreview: markerValidation,
      diffAuditPreview: markerAudit,
      approvalDraft: markerApproval,
      workspaceIndexRef: safeWorkspaceIndex()
    });
    const serialized = JSON.stringify({ rawVirtual, markerVirtual });

    expect(rawVirtual.status).toBe("blocked");
    expect(rawVirtual.warningCodes).toEqual(
      expect.arrayContaining(["PATCH_PREVIEW_RAW_FIELD_REJECTED"])
    );
    expect(markerVirtual.status).toBe("blocked");
    expect(markerVirtual.warningCodes).toEqual(
      expect.arrayContaining(["API_KEY_MARKER"])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("feeds Diff, Approval, Audit, and Context Assembly with virtual apply summary refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Preview virtual apply for a local patch proposal.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "Virtual apply summary appears",
      workspaceRoot: "D:\\workspace"
    });
    const {
      proposalView,
      validationView,
      auditView,
      approvalView,
      virtualView
    } = safeVirtualChain();
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: [
        ...(patchProposalCreationSurfaceSummaries(proposalView) ?? []),
        ...(patchProposalValidationSurfaceSummaries(validationView) ?? []),
        ...(patchDiffAuditSurfaceSummaries(auditView) ?? []),
        ...(patchApprovalDraftSurfaceSummaries(approvalView) ?? []),
        ...(patchVirtualApplySurfaceSummaries(virtualView) ?? [])
      ],
      futureApprovalRefs: [
        ...patchProposalCreationApprovalRefs(proposalView),
        ...patchProposalValidationApprovalRefs(validationView),
        ...patchDiffAuditApprovalRefs(auditView),
        ...patchApprovalDraftApprovalRefs(approvalView),
        ...patchVirtualApplyApprovalRefs(virtualView)
      ],
      futureAuditWarningCodes: [
        ...patchProposalValidationAuditWarningCodes(validationView),
        ...patchDiffAuditWarningCodes(auditView),
        ...patchApprovalDraftWarningCodes(approvalView),
        ...patchVirtualApplyWarningCodes(virtualView)
      ]
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface: surfaces.diff
    });
    const serialized = JSON.stringify({ surfaces, contextPreview });

    expect(surfaces.diff.items).toHaveLength(5);
    expect(
      surfaces.diff.items.some((item) =>
        item.status.startsWith("virtual_apply_")
      )
    ).toBe(true);
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `PATCH_VIRTUAL_APPLY_FINDINGS_${virtualView.findingCount}`,
        `PATCH_VIRTUAL_APPLY_STATUS_${virtualView.status.toUpperCase()}`
      ])
    );
    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceRefId === "patch-virtual-apply-preview-surface" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps virtual apply UI in-memory-only without generic execution handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "patch-virtual-apply-preview-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Patch Virtual Apply Preview");
    expect(appSource).toContain("In-memory summary only / no filesystem write");
    expect(appSource).toContain("handlePreviewVirtualApply");
    expect(appSource).toContain(
      "No files are read or written, no rollback is executed"
    );
    expect(combined).not.toContain("handleApplyPatch");
    expect(combined).not.toContain("handleRollbackPatch");
    expect(combined).not.toContain("handleRollbackUserWorkspace");
    expect(combined).not.toContain("handleCommit");
    expect(combined).not.toContain("approvePatch");
    expect(combined).not.toContain("rejectPatch");
    expect(combined).not.toContain("executePatch");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("patch_virtual_apply_preview");
  });
});

describe("app patch rollback checkpoint preview", () => {
  function safeWorkspaceIndex() {
    return buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: {
        workspaceIndexId: "workspace-index-rollback",
        indexHash: "workspacehashrollback",
        directoryCount: 1,
        fileSummaries: [
          {
            path: "examples/summary.txt",
            language: "unknown",
            extension: "txt",
            sizeBytes: 120,
            lineCount: 12,
            symbolCount: 0,
            hash: "abc12345",
            indexed: true
          }
        ],
        languageSummary: [
          {
            language: "unknown",
            fileCount: 1,
            indexedFileCount: 1,
            lineCount: 12,
            sizeBytes: 120
          }
        ]
      }
    });
  }

  function safeRollbackChain() {
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update rollback checkpoint summary",
      changeDescriptionSummary: "Summary-only rollback checkpoint preview.",
      pathRefsText: "examples/summary.txt",
      defaultChangeKind: "update",
      estimatedLinesAdded: 8,
      estimatedLinesRemoved: 1,
      selectedIntent: "documentation"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });
    const approvalView = buildPatchApprovalDraftView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView
    });
    const workspaceIndex = safeWorkspaceIndex();
    const virtualView = buildPatchVirtualApplyPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView,
      approvalDraft: approvalView,
      workspaceIndexRef: workspaceIndex
    });
    const rollbackView = buildPatchRollbackCheckpointPreviewView({
      virtualApplyPreview: virtualView,
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView,
      approvalDraft: approvalView,
      workspaceIndexRef: workspaceIndex
    });
    return {
      proposalView,
      validationView,
      auditView,
      approvalView,
      workspaceIndex,
      virtualView,
      rollbackView
    };
  }

  it("builds an empty rollback checkpoint preview until virtual apply summary exists", () => {
    const view = buildPatchRollbackCheckpointPreviewView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.metadataOnly).toBe(true);
    expect(view.checkpointFileWriteEnabled).toBe(false);
    expect(view.rollbackEnabled).toBe(false);
    expect(view.applyEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
  });

  it("generates a metadata-only rollback checkpoint preview from safe virtual apply summaries", () => {
    const { rollbackView, virtualView } = safeRollbackChain();
    const serialized = JSON.stringify(rollbackView);

    expect(rollbackView.source).toBe(
      "runtime_patch_rollback_checkpoint_preview"
    );
    expect(rollbackView.virtualApplyId).toBe(virtualView.virtualApplyId);
    expect(rollbackView.status).not.toBe("empty");
    expect(rollbackView.affectedFileCount).toBe(1);
    expect(rollbackView.restoreScope.metadataOnly).toBe(true);
    expect(rollbackView.restoreScope.filesToRestore).toEqual([
      "examples/summary.txt"
    ]);
    expect(rollbackView.readiness.canProceedToReplayProjectionPreview).toBe(
      true
    );
    expect(rollbackView.readiness.canRollbackReal).toBe(false);
    expect(rollbackView.readiness.rollbackExecuted).toBe(false);
    expect(rollbackView.readiness.canWriteFilesystem).toBe(false);
    expect(rollbackView.readiness.canApplyPatch).toBe(false);
    expect(rollbackView.readiness.canExecuteGit).toBe(false);
    expect(rollbackView.readiness.canExecuteShell).toBe(false);
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("function App");
  });

  it("keeps virtual apply blockers from becoming ready rollback checkpoints", () => {
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Unsafe rollback checkpoint proposal",
      pathRefsText: ".env.local",
      selectedIntent: "code_change"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });
    const approvalView = buildPatchApprovalDraftView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView
    });
    const virtualView = buildPatchVirtualApplyPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView,
      approvalDraft: approvalView,
      workspaceIndexRef: safeWorkspaceIndex()
    });
    const rollbackView = buildPatchRollbackCheckpointPreviewView({
      virtualApplyPreview: virtualView,
      approvalDraft: approvalView,
      workspaceIndexRef: safeWorkspaceIndex()
    });

    expect(virtualView.status).toBe("blocked");
    expect(rollbackView.status).toBe("blocked");
    expect(rollbackView.warningCodes).toEqual(
      expect.arrayContaining([
        "PATCH_ROLLBACK_VIRTUAL_APPLY_BLOCKED",
        "PATCH_ROLLBACK_VIRTUAL_APPLY_NOT_READY"
      ])
    );
    expect(rollbackView.readiness.canProceedToReplayProjectionPreview).toBe(
      false
    );
  });

  it("rejects or withholds unsafe raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const { virtualView } = safeRollbackChain();
    const maliciousVirtual = {
      ...virtualView,
      virtualApplyId: secret,
      beforeContent: "do not keep"
    } as typeof virtualView & Record<string, unknown>;
    const rollbackView = buildPatchRollbackCheckpointPreviewView({
      virtualApplyPreview: maliciousVirtual,
      workspaceIndexRef: safeWorkspaceIndex()
    });
    const serialized = JSON.stringify(rollbackView);

    expect(rollbackView.status).toBe("blocked");
    expect(rollbackView.warningCodes).toEqual(
      expect.arrayContaining(["API_KEY_MARKER"])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
    expect(serialized).not.toContain("beforeContent");
  });

  it("feeds Diff, Approval, Audit, and Context Assembly with rollback checkpoint summary refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Preview rollback checkpoint for a local patch proposal.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "Rollback checkpoint summary appears",
      workspaceRoot: "D:\\workspace"
    });
    const {
      proposalView,
      validationView,
      auditView,
      approvalView,
      virtualView,
      rollbackView
    } = safeRollbackChain();
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: [
        ...(patchProposalCreationSurfaceSummaries(proposalView) ?? []),
        ...(patchProposalValidationSurfaceSummaries(validationView) ?? []),
        ...(patchDiffAuditSurfaceSummaries(auditView) ?? []),
        ...(patchApprovalDraftSurfaceSummaries(approvalView) ?? []),
        ...(patchVirtualApplySurfaceSummaries(virtualView) ?? []),
        ...(patchRollbackCheckpointSurfaceSummaries(rollbackView) ?? [])
      ],
      futureApprovalRefs: [
        ...patchProposalCreationApprovalRefs(proposalView),
        ...patchProposalValidationApprovalRefs(validationView),
        ...patchDiffAuditApprovalRefs(auditView),
        ...patchApprovalDraftApprovalRefs(approvalView),
        ...patchVirtualApplyApprovalRefs(virtualView),
        ...patchRollbackCheckpointApprovalRefs(rollbackView)
      ],
      futureAuditWarningCodes: [
        ...patchProposalValidationAuditWarningCodes(validationView),
        ...patchDiffAuditWarningCodes(auditView),
        ...patchApprovalDraftWarningCodes(approvalView),
        ...patchVirtualApplyWarningCodes(virtualView),
        ...patchRollbackCheckpointWarningCodes(rollbackView)
      ]
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface: surfaces.diff
    });
    const serialized = JSON.stringify({ surfaces, contextPreview });

    expect(surfaces.diff.items).toHaveLength(6);
    expect(
      surfaces.diff.items.some((item) =>
        item.status.startsWith("rollback_checkpoint_")
      )
    ).toBe(true);
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `PATCH_ROLLBACK_FINDINGS_${rollbackView.findingCount}`,
        `PATCH_ROLLBACK_STATUS_${rollbackView.status.toUpperCase()}`
      ])
    );
    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceRefId === "patch-rollback-checkpoint-preview-surface" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps rollback checkpoint UI checkpoint-only without generic execution handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "patch-rollback-checkpoint-preview-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Patch Rollback Checkpoint Preview");
    expect(appSource).toContain("Checkpoint preview / no real rollback");
    expect(appSource).toContain("handlePreviewRollbackCheckpoint");
    expect(appSource).toContain("No checkpoint file is written");
    expect(combined).not.toContain("handleApplyPatch");
    expect(combined).not.toContain("handleRollbackPatch");
    expect(combined).not.toContain("handleRollbackUserWorkspace");
    expect(combined).not.toContain("handleCommit");
    expect(combined).not.toContain("approvePatch");
    expect(combined).not.toContain("rejectPatch");
    expect(combined).not.toContain("executePatch");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain(
      "patch_rollback_checkpoint_preview"
    );
  });
});

describe("app controlled creation replay projection", () => {
  function safeWorkspaceIndex() {
    return buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: {
        workspaceIndexId: "workspace-index-replay",
        indexHash: "workspacehashreplay",
        directoryCount: 1,
        fileSummaries: [
          {
            path: "examples/replay-summary.txt",
            language: "unknown",
            extension: "txt",
            sizeBytes: 120,
            lineCount: 12,
            symbolCount: 0,
            hash: "abc12345",
            indexed: true
          }
        ],
        languageSummary: [
          {
            language: "unknown",
            fileCount: 1,
            indexedFileCount: 1,
            lineCount: 12,
            sizeBytes: 120
          }
        ]
      }
    });
  }

  function safeEventSummary(draftId: string): WorkspaceEventSummary {
    return {
      ok: true,
      eventLogPath: "D:\\workspace\\.deepseek-workbench\\events.jsonl",
      eventCount: 1,
      displayedEventCount: 1,
      taskCount: 1,
      completedTaskCount: 0,
      draftCount: 0,
      approvedApplyCount: 0,
      approvedRollbackCount: 0,
      verificationEventCount: 0,
      liveProposalEventCount: 0,
      projectKnowledgeEventCount: 0,
      projectKnowledgeEntryCount: 0,
      lastEventAt: "2026-06-25T00:00:00.000Z",
      typeCounts: {
        "control.run.draft_recorded": 1
      },
      timeline: [
        {
          id: "event-run-draft-replay",
          type: "control.run.draft_recorded",
          summary: `Run draft ${draftId} recorded as a summary-only event.`
        }
      ],
      safetyScan: {
        ok: true,
        findings: 0,
        warningCodes: []
      },
      warnings: []
    };
  }

  function safeReplayChain() {
    const runDraft = buildRunDraftView({
      objectiveDraft:
        "Preview controlled creation replay projection for a local patch chain.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft: "Replay projection summary appears",
      workspaceRoot: "D:\\workspace"
    });
    const runDraftEventResult = {
      ok: true,
      eventId: "event-run-draft-replay",
      eventType: "control.run.draft_recorded" as const,
      draftId: runDraft.draftId,
      eventLogPath: "D:\\workspace\\.deepseek-workbench\\events.jsonl",
      safeMessage: "Draft event recorded locally as a summary-only event.",
      warnings: []
    };
    const eventSummary = safeEventSummary(runDraft.draftId);
    const proposalView = buildPatchProposalCreationPreviewView({
      titleDraft: "Update replay projection summary",
      changeDescriptionSummary:
        "Summary-only controlled creation replay projection preview.",
      pathRefsText: "examples/replay-summary.txt",
      defaultChangeKind: "update",
      estimatedLinesAdded: 8,
      estimatedLinesRemoved: 1,
      selectedIntent: "documentation"
    });
    const validationView = buildPatchProposalValidationPreviewView({
      proposalPreview: proposalView
    });
    const auditView = buildPatchDiffAuditPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView
    });
    const approvalView = buildPatchApprovalDraftView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView
    });
    const workspaceIndex = safeWorkspaceIndex();
    const virtualView = buildPatchVirtualApplyPreviewView({
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView,
      approvalDraft: approvalView,
      workspaceIndexRef: workspaceIndex
    });
    const rollbackView = buildPatchRollbackCheckpointPreviewView({
      virtualApplyPreview: virtualView,
      proposalPreview: proposalView,
      validationPreview: validationView,
      diffAuditPreview: auditView,
      approvalDraft: approvalView,
      workspaceIndexRef: workspaceIndex
    });
    const patchSurface = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(eventSummary),
      patchProposalSummaries: [
        ...(patchProposalCreationSurfaceSummaries(proposalView) ?? []),
        ...(patchProposalValidationSurfaceSummaries(validationView) ?? []),
        ...(patchDiffAuditSurfaceSummaries(auditView) ?? []),
        ...(patchApprovalDraftSurfaceSummaries(approvalView) ?? []),
        ...(patchVirtualApplySurfaceSummaries(virtualView) ?? []),
        ...(patchRollbackCheckpointSurfaceSummaries(rollbackView) ?? [])
      ]
    }).diff;
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      runDraftEventSummary: runDraftEventResult,
      workspaceIndexBridge: workspaceIndex,
      patchSurface
    });
    const controlProjection = buildControlPlaneProjectionView(eventSummary);
    const replayView = buildControlledCreationReplayProjectionView({
      eventSummary,
      runDraftEventResult,
      patchProposalCreationPreview: proposalView,
      patchValidationPreview: validationView,
      patchDiffAuditPreview: auditView,
      patchApprovalDraft: approvalView,
      patchVirtualApplyPreview: virtualView,
      patchRollbackCheckpointPreview: rollbackView,
      contextAssemblyPreview: contextPreview,
      controlProjection
    });

    return {
      runDraft,
      runDraftEventResult,
      eventSummary,
      proposalView,
      validationView,
      auditView,
      approvalView,
      workspaceIndex,
      virtualView,
      rollbackView,
      contextPreview,
      controlProjection,
      replayView
    };
  }

  it("builds an empty replay projection until controlled creation summaries exist", () => {
    const view = buildControlledCreationReplayProjectionView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.executionEnabled).toBe(false);
    expect(view.runExecutionEnabled).toBe(false);
    expect(view.applyEnabled).toBe(false);
    expect(view.rollbackEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
  });

  it("generates a summary-only replay projection from the safe preview chain", () => {
    const { replayView } = safeReplayChain();
    const serialized = JSON.stringify(replayView);

    expect(replayView.source).toBe(
      "runtime_controlled_creation_replay_projection"
    );
    expect(replayView.stageCount).toBe(7);
    expect(replayView.persistedEventCount).toBe(1);
    expect(replayView.localPreviewStageCount).toBe(6);
    expect(replayView.stages.map((stage) => stage.kind)).toEqual([
      "run_draft_event_recorded",
      "patch_proposal_creation_previewed",
      "patch_proposal_validation_previewed",
      "patch_diff_audit_previewed",
      "patch_approval_draft_previewed",
      "patch_virtual_apply_previewed",
      "patch_rollback_checkpoint_previewed"
    ]);
    expect(replayView.noCompressRequired).toBe(true);
    expect(replayView.contextPlacement).toBe("no_compress_zone");
    expect(replayView.readiness.canReplayProjection).toBe(true);
    expect(replayView.readiness.canExecuteRun).toBe(false);
    expect(replayView.readiness.canApplyPatch).toBe(false);
    expect(replayView.readiness.canRollbackReal).toBe(false);
    expect(replayView.readiness.canWriteFilesystem).toBe(false);
    expect(replayView.readiness.canExecuteGit).toBe(false);
    expect(replayView.readiness.canExecuteShell).toBe(false);
    expect(summarizeControlledCreationReplayProjectionView(replayView)).toMatch(
      /stages:7/
    );
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("function App");
  });

  it("keeps incomplete chains partial without executing missing stages", () => {
    const {
      eventSummary,
      runDraftEventResult,
      proposalView,
      contextPreview,
      controlProjection
    } = safeReplayChain();
    const replayView = buildControlledCreationReplayProjectionView({
      eventSummary,
      runDraftEventResult,
      patchProposalCreationPreview: proposalView,
      contextAssemblyPreview: contextPreview,
      controlProjection
    });

    expect(replayView.status).toBe("partial");
    expect(replayView.stageCount).toBe(2);
    expect(replayView.missingStageCount).toBeGreaterThan(0);
    expect(replayView.readiness.canExecuteRun).toBe(false);
    expect(replayView.warningCodes).toEqual(
      expect.arrayContaining([
        "MISSING_LATER_STAGE_PATCH_PROPOSAL_VALIDATION_PREVIEWED"
      ])
    );
  });

  it("blocks mismatched preview chain IDs safely", () => {
    const {
      eventSummary,
      runDraftEventResult,
      proposalView,
      validationView,
      auditView,
      approvalView,
      virtualView,
      rollbackView,
      contextPreview,
      controlProjection
    } = safeReplayChain();
    const replayView = buildControlledCreationReplayProjectionView({
      eventSummary,
      runDraftEventResult,
      patchProposalCreationPreview: proposalView,
      patchValidationPreview: {
        ...validationView,
        proposalId: "different-proposal"
      },
      patchDiffAuditPreview: auditView,
      patchApprovalDraft: approvalView,
      patchVirtualApplyPreview: virtualView,
      patchRollbackCheckpointPreview: rollbackView,
      contextAssemblyPreview: contextPreview,
      controlProjection
    });

    expect(replayView.status).toBe("blocked");
    expect(replayView.blockerCount).toBeGreaterThan(0);
    expect(replayView.warningCodes).toEqual(
      expect.arrayContaining(["PATCH_VALIDATION_PROPOSAL_ID_MISMATCH"])
    );
    expect(replayView.readiness.canReplayProjection).toBe(false);
  });

  it("rejects unsafe raw fields and fake API key markers without retaining values", () => {
    const secret = "sk-test1234567890abcdef";
    const {
      eventSummary,
      runDraftEventResult,
      proposalView,
      validationView,
      auditView,
      approvalView,
      virtualView,
      rollbackView,
      contextPreview,
      controlProjection
    } = safeReplayChain();
    const replayView = buildControlledCreationReplayProjectionView({
      eventSummary,
      runDraftEventResult,
      patchProposalCreationPreview: {
        ...proposalView,
        rawPrompt: `do not keep rawPrompt rawDom rawCsv ${secret}`
      } as typeof proposalView & Record<string, unknown>,
      patchValidationPreview: validationView,
      patchDiffAuditPreview: auditView,
      patchApprovalDraft: approvalView,
      patchVirtualApplyPreview: virtualView,
      patchRollbackCheckpointPreview: rollbackView,
      contextAssemblyPreview: contextPreview,
      controlProjection
    });
    const serialized = JSON.stringify(replayView);

    expect(replayView.status).toBe("blocked");
    expect(replayView.warningCodes).toEqual(
      expect.arrayContaining([
        "API_KEY_MARKER",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER"
      ])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
    expect(serialized).not.toContain("rawPrompt rawDom rawCsv");
  });

  it("feeds Diff, Approval, Audit, and Context Assembly with replay summary refs", () => {
    const {
      runDraft,
      proposalView,
      validationView,
      auditView,
      approvalView,
      virtualView,
      rollbackView,
      replayView
    } = safeReplayChain();
    const blockedReplayView = buildControlledCreationReplayProjectionView({
      patchRollbackCheckpointPreview: {
        ...rollbackView,
        canRollbackReal: true
      } as typeof rollbackView & Record<string, unknown>
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries: [
        ...(patchProposalCreationSurfaceSummaries(proposalView) ?? []),
        ...(patchProposalValidationSurfaceSummaries(validationView) ?? []),
        ...(patchDiffAuditSurfaceSummaries(auditView) ?? []),
        ...(patchApprovalDraftSurfaceSummaries(approvalView) ?? []),
        ...(patchVirtualApplySurfaceSummaries(virtualView) ?? []),
        ...(patchRollbackCheckpointSurfaceSummaries(rollbackView) ?? []),
        ...(controlledCreationReplayPatchSummaries(replayView) ?? [])
      ],
      futureApprovalRefs: [
        ...patchApprovalDraftApprovalRefs(approvalView),
        ...patchVirtualApplyApprovalRefs(virtualView),
        ...patchRollbackCheckpointApprovalRefs(rollbackView),
        ...controlledCreationReplayApprovalRefs(blockedReplayView)
      ],
      futureAuditWarningCodes: [
        ...patchApprovalDraftWarningCodes(approvalView),
        ...patchVirtualApplyWarningCodes(virtualView),
        ...patchRollbackCheckpointWarningCodes(rollbackView),
        ...controlledCreationReplayWarningCodes(replayView)
      ]
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      patchSurface: surfaces.diff,
      replayProjection: replayView
    });
    const serialized = JSON.stringify({ surfaces, contextPreview });

    expect(
      surfaces.diff.items.some((item) =>
        item.status.startsWith("replay_projection_")
      )
    ).toBe(true);
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `CONTROLLED_REPLAY_STAGES_${replayView.stageCount}`,
        `CONTROLLED_REPLAY_STATUS_${replayView.status.toUpperCase()}`
      ])
    );
    expect(surfaces.approval.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `controlled-replay-${blockedReplayView.projectionId}`,
          status: "blocked"
        })
      ])
    );
    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceRefId === "controlled-creation-replay-projection" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps App UI replay-only without Tauri, EventStore, fs, rollback, apply, or execution handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(
        appRoot,
        "src",
        "controlled-creation-replay-projection-view.ts"
      ),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Controlled Creation Replay Projection");
    expect(appSource).toContain("Replay preview / no execution");
    expect(appSource).toContain("handlePreviewControlledReplayProjection");
    expect(appSource).toContain(
      "No events are written and no action is executed"
    );
    expect(combined).not.toContain("handleExecuteReplay");
    expect(combined).not.toContain("handleRunReplayProjection");
    expect(combined).not.toContain("executeReplayProjection");
    expect(combined).not.toContain("applyReplayProjection");
    expect(combined).not.toContain("rollbackReplayProjection");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(adapterSource).not.toContain("fetch(");
    expect(desktopFlowSource).not.toContain(
      "controlled_creation_replay_projection"
    );
  });
});

describe("app memory recall preview", () => {
  it("builds an empty recall preview until a run draft exists", () => {
    const view = buildMemoryRecallPreviewView({
      selectedIntent: "code_change"
    });

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.previewOnly).toBe(true);
    expect(view.persistenceConnected).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.frozenPrefixIncluded).toBe(false);
    expect(view.items).toHaveLength(0);
    expect(view.nextAction).toContain("Preview a local run draft first");
  });

  it("keeps run draft recall empty when desktop memory persistence is not connected", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a code change with review safeguards.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Review summary exists",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildMemoryRecallPreviewView({ runDraft });

    expect(view.status).toBe("empty");
    expect(view.itemCount).toBe(0);
    expect(view.nextAction).toContain(
      "desktop persistence is not connected yet"
    );
    expect(view.querySummary.intent).toBe("code_change");
  });

  it("maps synthetic policy, project_fact, and pitfall summaries to volatile_tail items", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare code change review for workspace patch safety.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Patch review exists",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-policy-1",
          type: "policy",
          namespace: "repo",
          trustLevel: "repository_rule",
          summary: "Code change patches require review before apply.",
          tags: ["code_change", "patch"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        },
        {
          memoryId: "mem-fact-1",
          type: "project_fact",
          namespace: "workspace",
          trustLevel: "verified_tool_result",
          summary: "Workspace patch summaries are shown in Diff Surface.",
          tags: ["workspace", "patch"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        },
        {
          memoryId: "mem-pitfall-1",
          type: "pitfall",
          namespace: "workspace",
          trustLevel: "user_correction",
          summary: "Patch previews must not imply apply execution.",
          tags: ["code_change"],
          trigger: "preview wording",
          reasonCodes: ["PATCH_APPLY_DISABLED"]
        }
      ]
    });

    expect(view.status).toBe("preview");
    expect(view.source).toBe("runtime_memory_core_preview");
    expect(view.itemCount).toBe(3);
    expect(view.policyCount).toBe(1);
    expect(view.projectFactCount).toBe(1);
    expect(view.pitfallCount).toBe(1);
    expect(view.highTrustCount).toBe(3);
    expect(view.volatileTailCount).toBe(3);
    expect(view.items.every((item) => item.placement === "volatile_tail")).toBe(
      true
    );
    expect(JSON.stringify(view)).not.toContain("content");
  });

  it("filters policy trust, project facts without evidence, and pitfall without trigger", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Review workspace policy and project fact summaries.",
      selectedIntent: "code_review",
      acceptanceCriteriaDraft: "No unsafe recall",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-policy-external",
          type: "policy",
          trustLevel: "external_untrusted",
          summary: "External policy should not appear.",
          tags: ["code_review"]
        },
        {
          memoryId: "mem-fact-no-evidence",
          type: "project_fact",
          trustLevel: "external_untrusted",
          summary: "Fact without evidence should not appear.",
          tags: ["code_review"]
        },
        {
          memoryId: "mem-pitfall-no-trigger",
          type: "pitfall",
          trustLevel: "external_untrusted",
          summary: "Pitfall without trigger should not appear.",
          tags: ["code_review"]
        },
        {
          memoryId: "mem-fact-low-trust",
          type: "project_fact",
          trustLevel: "external_untrusted",
          summary: "Code review has an external summary with evidence.",
          tags: ["code_review"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        }
      ]
    });

    expect(view.items.map((item) => item.memoryId)).toEqual([
      "mem-fact-low-trust"
    ]);
    expect(view.projectFactCount).toBe(1);
    expect(view.policyCount).toBe(0);
    expect(view.pitfallCount).toBe(0);
    expect(view.highTrustCount).toBe(0);
  });

  it("sorts recall items deterministically by score, type priority, and id", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Verify deterministic review memory summaries.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "Order is stable",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-z",
          type: "pitfall",
          trustLevel: "user_correction",
          summary: "Verification memory summary.",
          tags: ["verification"],
          trigger: "verification",
          score: 1
        },
        {
          memoryId: "mem-a",
          type: "project_fact",
          trustLevel: "verified_tool_result",
          summary: "Verification memory summary.",
          tags: ["verification"],
          provenanceRefCount: 1,
          evidenceRefCount: 1,
          score: 1
        },
        {
          memoryId: "mem-policy",
          type: "policy",
          trustLevel: "workspace_rule",
          summary: "Verification memory summary.",
          tags: ["verification"],
          score: 1
        }
      ]
    });

    expect(view.items.map((item) => item.memoryId)).toEqual([
      "mem-policy",
      "mem-a",
      "mem-z"
    ]);
  });

  it("skips unsafe memory summaries and never exposes raw markers or fake keys", () => {
    const secret = "sk-test1234567890abcdef";
    const runDraft = buildRunDraftView({
      objectiveDraft: "Review memory recall warning handling.",
      selectedIntent: "verification",
      acceptanceCriteriaDraft: "warning codes only",
      workspaceRoot: "D:\\workspace"
    });
    const view = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-safe",
          type: "project_fact",
          trustLevel: "verified_tool_result",
          summary: "Memory recall warning handling has safe evidence.",
          tags: ["verification"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        },
        {
          memoryId: "mem-secret",
          type: "project_fact",
          trustLevel: "verified_tool_result",
          summary: `rawPrompt and rawDom should stay hidden ${secret}`,
          tags: ["verification"],
          provenanceRefCount: 1,
          evidenceRefCount: 1
        }
      ]
    });
    const serialized = JSON.stringify(view);

    expect(view.items.map((item) => item.memoryId)).toEqual(["mem-safe"]);
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "MEMORY_RECALL_ITEM_SKIPPED_FOR_SAFETY"
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("rawDom");
  });

  it("lets Context Cart show memory recall as volatile_tail relation only", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare code change memory recall.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Memory relation is visible",
      workspaceRoot: "D:\\workspace"
    });
    const memoryRecallPreview = buildMemoryRecallPreviewView({
      runDraft,
      syntheticMemorySummaries: [
        {
          memoryId: "mem-policy-1",
          type: "policy",
          trustLevel: "repository_rule",
          summary: "Code change memory recall belongs in volatile tail.",
          tags: ["code_change"],
          provenanceRefCount: 1
        }
      ]
    });
    const contextCart = buildContextCartView({
      runDraft,
      memoryRecallPreview
    });

    expect(contextCart.warnings.map((warning) => warning.code)).toContain(
      "MEMORY_RECALL_VOLATILE_TAIL"
    );
    expect(contextCart.nextAction).toContain("volatile_tail");
    expect(JSON.stringify(contextCart)).not.toContain("Code change memory");
  });
});

describe("app workspace index bridge", () => {
  it("builds an empty read-only bridge state", () => {
    const view = buildWorkspaceIndexBridgeView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.readOnly).toBe(true);
    expect(view.filesystemCrawlEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.nextAction).toContain("Raw file content is not accepted");
  });

  it("parses safe summary JSON and renders counts without raw content", () => {
    const parsed = parseWorkspaceIndexSummaryJson(
      JSON.stringify(fixedWorkspaceIndexSummary())
    );
    expect(parsed.ok).toBe(true);
    const view = parsed.ok
      ? buildWorkspaceIndexBridgeView(parsed.input)
      : buildWorkspaceIndexBridgeView({
          parseErrorCode: parsed.errorCode,
          parseErrorMessage: parsed.safeMessage
        });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("warning");
    expect(view.workspaceIndexId).toBe("workspace-index-test-1");
    expect(view.fileCount).toBe(3);
    expect(view.indexedFileCount).toBe(2);
    expect(view.skippedFileCount).toBe(1);
    expect(view.directoryCount).toBe(2);
    expect(view.languageCount).toBe(2);
    expect(view.symbolCount).toBe(2);
    expect(view.totalBytes).toBe(1234);
    expect(view.totalLines).toBe(88);
    expect(view.hashPrefix).toBe("abcdef123456");
    expect(view.languages.map((language) => language.language)).toEqual([
      "md",
      "tsx"
    ]);
    expect(view.topDirectories.map((directory) => directory.path)).toContain(
      "app/src"
    );
    expect(view.topFiles.map((file) => file.path)).toContain("app/src/App.tsx");
    expect(view.warnings.map((warning) => warning.code)).toContain(
      "UNSAFE_CONTENT_SKIPPED"
    );
    expect(serialized).not.toContain("beforeContent");
    expect(serialized).not.toContain("afterContent");
    expect(serialized).not.toContain("source code line");
  });

  it("rejects raw content fields and raw diff fields", () => {
    const rawContent = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: {
        ...fixedWorkspaceIndexSummary(),
        fileSummaries: [
          {
            path: "src/index.ts",
            content: "source code line",
            beforeContent: "before",
            afterContent: "after",
            rawDiff: "@@ hidden"
          }
        ]
      }
    });

    expect(rawContent.status).toBe("rejected");
    expect(rawContent.warnings.map((warning) => warning.code)).toContain(
      "WORKSPACE_INDEX_RAW_FIELD_REJECTED"
    );
    expect(JSON.stringify(rawContent)).not.toContain("source code line");
  });

  it("rejects fake secrets and authorization markers in summary JSON", () => {
    const secretJson = JSON.stringify({
      ...fixedWorkspaceIndexSummary(),
      note: "Bearer abcdefghijklmnopqrstuvwxyz"
    });
    const parsed = parseWorkspaceIndexSummaryJson(secretJson);
    const authorization = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: {
        ...fixedWorkspaceIndexSummary(),
        warningCodes: ["Authorization: token"]
      }
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errorCode).toBe("WORKSPACE_INDEX_UNSAFE_MARKER");
    }
    expect(authorization.status).toBe("rejected");
    expect(JSON.stringify(authorization)).not.toContain("Authorization: token");
  });

  it("rejects unsafe paths and generated directories", () => {
    const unsafePaths = [
      "C:/repo/src/App.tsx",
      "//server/share/file.ts",
      "../src/App.tsx",
      ".env",
      ".git/config",
      "node_modules/pkg/index.js",
      "runtime/dist/index.js",
      "app/src-tauri/target/debug/app.exe",
      ".tmp/cache.json",
      "src/App.tsx?token=secret",
      "src/App$(bad).tsx"
    ];

    for (const unsafePath of unsafePaths) {
      const view = buildWorkspaceIndexBridgeView({
        source: "synthetic_summary",
        summary: {
          ...fixedWorkspaceIndexSummary(),
          fileSummaries: [
            {
              path: unsafePath,
              language: "ts",
              extension: "ts",
              indexed: true
            }
          ]
        }
      });

      expect(view.status, unsafePath).toBe("rejected");
      expect(view.warnings.map((warning) => warning.code)).toContain(
        "WORKSPACE_INDEX_UNSAFE_PATH"
      );
    }
  });

  it("rejects too-large JSON and too many file summaries", () => {
    const parsed = parseWorkspaceIndexSummaryJson("x".repeat(64), {
      maxJsonBytes: 12
    });
    const tooManyFiles = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      maxFileSummaries: 1,
      summary: fixedWorkspaceIndexSummary()
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errorCode).toBe("WORKSPACE_INDEX_JSON_TOO_LARGE");
    }
    expect(tooManyFiles.status).toBe("rejected");
    expect(tooManyFiles.warnings.map((warning) => warning.code)).toContain(
      "WORKSPACE_INDEX_TOO_MANY_FILES"
    );
  });

  it("validates summary inputs without accepting unsafe schema", () => {
    expect(
      validateWorkspaceIndexSummaryInput({
        source: "synthetic_summary",
        summary: fixedWorkspaceIndexSummary()
      }).ok
    ).toBe(true);
    expect(
      validateWorkspaceIndexSummaryInput({
        source: "synthetic_summary",
        summary: { fileSummaries: [{ path: "http://example.test/file.ts" }] }
      })
    ).toMatchObject({
      ok: false,
      errorCode: "WORKSPACE_INDEX_UNSAFE_PATH"
    });
  });

  it("feeds Run Canvas, Context Cart, Agent Route, and Capability Plan with summary refs only", () => {
    const workspaceIndexBridge = buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
    const runDraft = buildRunDraftView({
      objectiveDraft: "Prepare a code change with workspace index summaries.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Workspace index summary visible",
      workspaceRoot: "D:\\workspace",
      workspaceIndexRef: workspaceIndexBridge
    });
    const controlProjection = buildControlPlaneProjectionView(undefined);
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection
    });
    const memoryInspector = buildMemoryInspectorView();
    const chatCanvas = buildChatRunCanvasView({
      objectiveDraft: "Prepare a code change with workspace index summaries.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Workspace index summary visible",
      workspaceRoot: "D:\\workspace",
      controlProjection,
      memoryInspector,
      approvalDiffAuditSurfaces: surfaces,
      workspaceIndexBridge
    });
    const contextCart = buildContextCartView({
      runDraft,
      workspaceIndexRef: workspaceIndexBridge
    });
    const agentRoutePreview = buildAgentRoutePreviewView({
      runDraft,
      contextCart,
      workspaceIndexRef: workspaceIndexBridge
    });
    const capabilityPlan = buildCapabilityPlanPreviewView({
      runDraft,
      agentRoutePreview,
      contextCart,
      workspaceIndexRef: workspaceIndexBridge,
      selectedIntent: "code_change"
    });
    const serialized = JSON.stringify({
      chatCanvas,
      contextCart,
      agentRoutePreview,
      capabilityPlan
    });

    expect(
      chatCanvas.chatDraft.contextHints.find(
        (hint) => hint.id === "workspace-index"
      )?.value
    ).toContain("2/3 indexed");
    expect(contextCart.nextAction).toContain("Workspace index summary");
    expect(
      agentRoutePreview.steps
        .flatMap((step) => step.contextRefs)
        .includes("workspace-index:summary")
    ).toBe(true);
    expect(
      capabilityPlan.items.find(
        (item) => item.capabilityId === "native.workspace.index"
      )?.inputSummary
    ).toContain("2/3 indexed");
    expect(serialized).not.toContain("source code line");
    expect(serialized).not.toContain("rawDiff");
  });
});

describe("app disposable workspace snapshot contract", () => {
  function loadedWorkspaceIndex() {
    return buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
  }

  it("builds an empty metadata-only snapshot contract state", () => {
    const view = buildDisposableWorkspaceSnapshotView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.metadataOnly).toBe(true);
    expect(view.applyEnabled).toBe(false);
    expect(view.rollbackEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
  });

  it("builds a summary-only contract from a safe Workspace Index summary", () => {
    const view = buildDisposableWorkspaceSnapshotView({
      disposableRootRef: "sandbox-ref-p0j-001",
      sourceWorkspaceFingerprint: "workspace-fingerprint-p0j-001",
      workspaceIndexRef: loadedWorkspaceIndex()
    });
    const serialized = JSON.stringify(view);

    expect(view.source).toBe("runtime_disposable_workspace_snapshot_contract");
    expect(view.status).not.toBe("empty");
    expect(view.fileCount).toBeGreaterThan(0);
    expect(view.totalBytes).toBeGreaterThan(0);
    expect(view.workspaceIndexRef).toBe("workspace-index-test-1");
    expect(view.readiness.canReadFilesystem).toBe(false);
    expect(view.readiness.canWriteFilesystem).toBe(false);
    expect(view.readiness.canApplyPatch).toBe(false);
    expect(view.readiness.canRollbackReal).toBe(false);
    expect(view.readiness.canExecuteGit).toBe(false);
    expect(view.readiness.canExecuteShell).toBe(false);
    expect(serialized).not.toContain("source code line");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("rejects unsafe raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildDisposableWorkspaceSnapshotView({
      disposableRootRef: "sandbox-ref-p0j-unsafe",
      sourceWorkspaceFingerprint: "workspace-fingerprint-p0j-unsafe",
      fileSummaryJsonText: JSON.stringify({
        files: [
          {
            path: "docs/unsafe.md",
            sizeBytes: 1,
            hashPrefix: "abc12345",
            exists: true,
            content: "do not keep"
          }
        ],
        rawPrompt: `rawPrompt rawDom rawCsv ${secret}`
      })
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("blocked");
    expect(view.warningCodes).toEqual(
      expect.arrayContaining([
        "DISPOSABLE_SNAPSHOT_RAW_FIELD_REJECTED",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER",
        "API_KEY_MARKER"
      ])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("feeds Context Assembly and Audit Surface with summary-only snapshot refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Preview disposable workspace snapshot metadata.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Snapshot contract summary is visible",
      workspaceRoot: "D:\\workspace"
    });
    const snapshotView = buildDisposableWorkspaceSnapshotView({
      disposableRootRef: "sandbox-ref-p0j-001",
      sourceWorkspaceFingerprint: "workspace-fingerprint-p0j-001",
      workspaceIndexRef: loadedWorkspaceIndex()
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      snapshotContract: snapshotView
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      futureAuditWarningCodes:
        disposableWorkspaceSnapshotWarningCodes(snapshotView)
    });
    const serialized = JSON.stringify({ contextPreview, surfaces });

    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceKind === "snapshot_contract" &&
          segment.sourceRefId === "disposable-workspace-snapshot-contract" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `DISPOSABLE_SNAPSHOT_STATUS_${snapshotView.status.toUpperCase()}`,
        `DISPOSABLE_SNAPSHOT_FINDINGS_${snapshotView.findingCount}`
      ])
    );
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps App UI metadata-only without Tauri, EventStore, fs, apply, rollback, or execution handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "disposable-workspace-snapshot-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Disposable Workspace Snapshot Contract");
    expect(appSource).toContain("Metadata only / no apply");
    expect(appSource).toContain("Preview Snapshot Contract");
    expect(appSource).toContain(
      "opaque display ref, not a real filesystem path"
    );
    expect(combined).not.toContain("handleApplySnapshot");
    expect(combined).not.toContain("handleWriteSnapshot");
    expect(combined).not.toContain("handleCreateDisposableWorkspace");
    expect(combined).not.toContain("handleRollbackSnapshot");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("disposable_workspace_snapshot");
  });
});

describe("app user workspace snapshot backup contract", () => {
  function loadedWorkspaceIndex() {
    return buildWorkspaceIndexBridgeView({
      source: "synthetic_summary",
      summary: fixedWorkspaceIndexSummary()
    });
  }

  it("builds an empty metadata-only user workspace contract state", () => {
    const view = buildUserWorkspaceSnapshotBackupView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.metadataOnly).toBe(true);
    expect(view.applyEnabled).toBe(false);
    expect(view.rollbackEnabled).toBe(false);
    expect(view.backupFileCreationEnabled).toBe(false);
    expect(view.preimageCaptureEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
  });

  it("builds a summary-only user workspace contract from a safe Workspace Index summary", () => {
    const workspaceIndex = loadedWorkspaceIndex();
    const view = buildUserWorkspaceSnapshotBackupView({
      userWorkspaceRootRef: "user-workspace-ref-p0k-001",
      sourceWorkspaceFingerprint: "workspace-fingerprint-p0k-001",
      workspaceIndexRef: workspaceIndex
    });
    const serialized = JSON.stringify(view);

    expect(view.source).toBe("runtime_user_workspace_snapshot_backup_contract");
    expect(view.status).not.toBe("empty");
    expect(view.status).not.toBe("blocked");
    expect(view.fileCount).toBeGreaterThan(0);
    expect(view.totalBytes).toBeGreaterThan(0);
    expect(view.expectedUserSnapshotHash).toBe(workspaceIndex.hashPrefix);
    expect(view.readiness.canReadFilesystem).toBe(false);
    expect(view.readiness.canWriteFilesystem).toBe(false);
    expect(view.readiness.canApplyToUserWorkspace).toBe(false);
    expect(view.readiness.canRollbackUserWorkspace).toBe(false);
    expect(view.readiness.canExecuteGit).toBe(false);
    expect(view.readiness.canExecuteShell).toBe(false);
    expect(serialized).not.toContain("source code line");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toMatch(/"preimageContent"\s*:/);
  });

  it("rejects unsafe raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildUserWorkspaceSnapshotBackupView({
      userWorkspaceRootRef: "user-workspace-ref-p0k-unsafe",
      sourceWorkspaceFingerprint: "workspace-fingerprint-p0k-unsafe",
      fileSummaryJsonText: JSON.stringify({
        files: [
          {
            path: "docs/unsafe.md",
            sizeBytes: 1,
            hashPrefix: "abc12345",
            exists: true,
            plannedMutation: "update",
            backupRequired: true,
            preimageHashRequired: true,
            preimageContent: "do not keep"
          }
        ],
        rawPrompt: `rawPrompt rawDom rawCsv ${secret}`
      })
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("blocked");
    expect(view.warningCodes).toEqual(
      expect.arrayContaining([
        "USER_WORKSPACE_RAW_FIELD_REJECTED",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER",
        "API_KEY_MARKER"
      ])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("feeds Context Assembly and Audit Surface with summary-only user workspace contract refs", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft: "Preview user workspace promotion metadata.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "User workspace contract summary is visible",
      workspaceRoot: "D:\\workspace"
    });
    const contractView = buildUserWorkspaceSnapshotBackupView({
      userWorkspaceRootRef: "user-workspace-ref-p0k-001",
      sourceWorkspaceFingerprint: "workspace-fingerprint-p0k-001",
      fileSummaryJsonText: JSON.stringify({
        files: [
          {
            path: "app/src/App.tsx",
            language: "typescript",
            sizeBytes: 1200,
            hashPrefix: "abc12345",
            exists: true,
            plannedMutation: "update",
            backupRequired: true,
            preimageHashRequired: true
          },
          {
            path: "app/test/desktop-shell.test.ts",
            language: "typescript",
            sizeBytes: 900,
            hashPrefix: "def67890",
            exists: true,
            plannedMutation: "test",
            backupRequired: true,
            preimageHashRequired: false
          }
        ]
      })
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      userWorkspaceSnapshotContract: contractView
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      futureAuditWarningCodes:
        userWorkspaceSnapshotBackupWarningCodes(contractView)
    });
    const serialized = JSON.stringify({ contextPreview, surfaces });

    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceKind === "user_workspace_contract" &&
          segment.sourceRefId === "user-workspace-snapshot-backup-contract" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `USER_WORKSPACE_CONTRACT_STATUS_${contractView.status.toUpperCase()}`,
        `USER_WORKSPACE_CONTRACT_FINDINGS_${contractView.findingCount}`
      ])
    );
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toMatch(/"preimageContent"\s*:/);
  });

  it("keeps App UI read-only without Tauri, EventStore, filesystem, user apply, rollback, or backup handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "user-workspace-snapshot-backup-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("User Workspace Snapshot / Backup Contract");
    expect(appSource).toContain("Metadata only / no user workspace apply");
    expect(appSource).toContain("Preview User Workspace Contract");
    expect(appSource).toContain("No files are read or written");
    expect(combined).not.toContain("handleApplyUserWorkspace");
    expect(combined).not.toContain("handleWriteUserWorkspace");
    expect(combined).not.toContain("handleRollbackUserWorkspace");
    expect(combined).not.toContain("handleCreateBackup");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("user_workspace_snapshot");
  });
});

describe("app user workspace promotion readiness", () => {
  function safeUserContract() {
    return buildUserWorkspaceSnapshotBackupView({
      userWorkspaceRootRef: "user-workspace-ref-p0k-003",
      sourceWorkspaceFingerprint: "workspace-fingerprint-p0k-003",
      disposableApplyResultRef: "apply-1",
      disposableRollbackResultRef: "rollback-1",
      disposableSnapshotContractRef: "snapshot-contract-1",
      expectedDisposableOutputHash: "disposable-output-hash",
      expectedUserSnapshotHash: "user-snapshot-hash",
      fileSummaryJsonText: JSON.stringify({
        lineEndingPolicy: "lf",
        files: [
          {
            path: "app/src/App.tsx",
            language: "typescript",
            extension: "tsx",
            sizeBytes: 1200,
            lineCount: 80,
            hashPrefix: "abc12345",
            exists: true,
            plannedMutation: "none",
            backupRequired: false,
            preimageHashRequired: false,
            lineEnding: "lf"
          },
          {
            path: "app/test/desktop-shell.test.ts",
            language: "typescript",
            extension: "ts",
            sizeBytes: 900,
            lineCount: 60,
            hashPrefix: "def67890",
            exists: true,
            plannedMutation: "none",
            backupRequired: false,
            preimageHashRequired: false,
            lineEnding: "lf"
          }
        ]
      })
    });
  }

  function safeReadinessInput() {
    return {
      userWorkspaceSnapshotBackupContract: safeUserContract(),
      disposablePatchApplyResult: {
        status: "applied_to_disposable",
        applyId: "apply-1",
        disposableRootRef: "disposable-root-ref",
        outputSnapshotHash: "disposable-output-hash",
        resultHash: "apply-result-hash",
        warningCount: 0,
        blockerCount: 0,
        readiness: {
          canPromoteToUserWorkspace: false,
          canApplyToUserWorkspace: false,
          canCommitGit: false,
          canExecuteShell: false,
          canRollbackReal: false
        }
      },
      disposablePatchRollbackResult: {
        status: "rolled_back_disposable",
        rollbackId: "rollback-1",
        applyId: "apply-1",
        disposableRootRef: "disposable-root-ref",
        restoredSnapshotHash: "restored-snapshot-hash",
        resultHash: "rollback-result-hash",
        warningCount: 0,
        blockerCount: 0,
        readiness: {
          canRollbackUserWorkspace: false,
          canApplyToUserWorkspace: false,
          canCommitGit: false,
          canExecuteShell: false
        }
      },
      sandboxApplyRollbackEventProjection: {
        status: "projection_ready",
        projectionId: "projection-1",
        chainId: "chain-1",
        blockerCount: 0,
        warningCount: 0,
        projectionHash: "projection-hash",
        eventPreviews: [{ eventId: "event-1", notWritten: true }],
        readiness: {
          canWriteEventStore: false,
          canExecuteApply: false,
          canExecuteRollback: false,
          canApplyToUserWorkspace: false,
          canExecuteGit: false,
          canExecuteShell: false
        }
      },
      patchProposalPreview: { status: "preview", proposalId: "proposal-1" },
      patchValidationPreview: {
        status: "preview",
        validationId: "validation-1"
      },
      patchDiffAuditPreview: { status: "preview", auditId: "audit-1" },
      patchApprovalDraft: {
        status: "preview",
        approvalDraftId: "approval-1"
      },
      patchVirtualApplyPreview: {
        status: "preview_ready",
        virtualApplyId: "virtual-1"
      },
      patchRollbackCheckpointPreview: {
        status: "checkpoint_preview_ready",
        checkpointPreviewId: "checkpoint-preview-1"
      },
      approvalGatedDisposableApplyResult: {
        status: "applied_to_disposable",
        gatedApplyId: "gated-apply-1",
        resultHash: "gated-result-hash",
        readiness: {
          canApplyToUserWorkspace: false,
          canPromoteToUserWorkspace: false,
          canIssuePermissionLease: false,
          canCommitGit: false,
          canExecuteShell: false
        }
      }
    };
  }

  it("builds an empty readiness-only promotion state", () => {
    const view = buildUserWorkspacePromotionReadinessView();

    expect(view.status).toBe("empty");
    expect(view.source).toBe("empty");
    expect(view.readinessOnly).toBe(true);
    expect(view.userWorkspaceReadEnabled).toBe(false);
    expect(view.userWorkspaceWriteEnabled).toBe(false);
    expect(view.backupCreationEnabled).toBe(false);
    expect(view.applyEnabled).toBe(false);
    expect(view.rollbackEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.tauriCommandEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
  });

  it("builds promotion readiness from a safe summary chain", () => {
    const view = buildUserWorkspacePromotionReadinessView(safeReadinessInput());
    const serialized = JSON.stringify(view);

    expect(view.source).toBe("runtime_user_workspace_promotion_readiness");
    expect(view.status).toBe("readiness_ready");
    expect(view.blockerCount).toBe(0);
    expect(view.missingArtifactCount).toBe(0);
    expect(view.gates.map((gate) => gate.name)).toEqual(
      expect.arrayContaining([
        "user_workspace_snapshot_contract",
        "disposable_apply_result",
        "disposable_rollback_result",
        "apply_rollback_event_projection",
        "patch_validation",
        "patch_diff_audit",
        "patch_approval_draft",
        "rollback_checkpoint_preview",
        "backup_preimage_requirement",
        "manual_confirmation_deferred",
        "production_permission_lease_deferred",
        "app_execution_disabled"
      ])
    );
    expect(view.readiness.canProceedToUserWorkspaceApplyPrototype).toBe(true);
    expect(view.readiness.canApplyToUserWorkspace).toBe(false);
    expect(view.readiness.canWriteFilesystem).toBe(false);
    expect(view.readiness.canRollbackUserWorkspace).toBe(false);
    expect(view.readiness.canExecuteGit).toBe(false);
    expect(view.readiness.canExecuteShell).toBe(false);
    expect(view.readiness.canIssuePermissionLease).toBe(false);
    expect(view.readiness.appCanExecute).toBe(false);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toMatch(/"content"\s*:/);
  });

  it("rejects unsafe raw fields and fake API key markers safely", () => {
    const secret = "sk-test1234567890abcdef";
    const view = buildUserWorkspacePromotionReadinessView({
      ...safeReadinessInput(),
      patchValidationPreview: {
        status: "preview",
        validationId: "validation-1",
        preimageContent: "do not keep"
      },
      patchDiffAuditPreview: {
        status: "preview",
        auditId: "audit-1",
        rawPrompt: `rawPrompt rawDom rawCsv ${secret}`
      }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("blocked");
    expect(view.warningCodes).toEqual(
      expect.arrayContaining([
        "PROMOTION_RAW_FIELD_REJECTED",
        "RAW_PROMPT_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER",
        "API_KEY_MARKER"
      ])
    );
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("do not keep");
  });

  it("feeds Context Assembly and Audit Surface with summary-only readiness refs", () => {
    const readiness =
      buildUserWorkspacePromotionReadinessView(safeReadinessInput());
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft: buildRunDraftView({
        objectiveDraft: "Preview user workspace promotion readiness.",
        selectedIntent: "code_change",
        acceptanceCriteriaDraft: "Promotion readiness summary is visible",
        workspaceRoot: "D:\\workspace"
      }),
      userWorkspacePromotionReadiness: readiness
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      futureAuditWarningCodes:
        userWorkspacePromotionReadinessWarningCodes(readiness)
    });
    const serialized = JSON.stringify({ contextPreview, surfaces });

    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceKind === "user_workspace_promotion_readiness" &&
          segment.sourceRefId === "user-workspace-promotion-readiness" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `USER_WORKSPACE_PROMOTION_STATUS_${readiness.status.toUpperCase()}`,
        `USER_WORKSPACE_PROMOTION_GATES_${readiness.gateCount}`
      ])
    );
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
  });

  it("keeps App UI read-only without Tauri, EventStore, filesystem, promote, apply, rollback, or backup handlers", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "user-workspace-promotion-readiness-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("User Workspace Promotion Readiness");
    expect(appSource).toContain("Readiness only / no write");
    expect(appSource).toContain("Preview Promotion Readiness");
    expect(appSource).toContain("No files are read or written");
    expect(combined).not.toContain("handlePromoteUserWorkspace");
    expect(combined).not.toContain("handleApplyUserWorkspace");
    expect(combined).not.toContain("handleRollbackUserWorkspace");
    expect(combined).not.toContain("handleCreateUserWorkspaceBackup");
    expect(combined).not.toContain("handleWritePromotionEvents");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("user_workspace_promotion");
  });
});

describe("app user workspace apply prototype", () => {
  it("shows disabled-by-default runtime prototype state", () => {
    const view = buildUserWorkspaceApplyPrototypeView();

    expect(view.source).toBe("app_user_workspace_apply_prototype_disabled");
    expect(view.status).toBe("disabled");
    expect(view.disabledByDefault).toBe(true);
    expect(view.runtimePrototypeOnly).toBe(true);
    expect(view.runtimeHelperAvailable).toBe(true);
    expect(view.appExecutionConnected).toBe(false);
    expect(view.userWorkspaceMutationEnabled).toBe(false);
    expect(view.applyButtonEnabled).toBe(false);
    expect(view.contentInputEnabled).toBe(false);
    expect(view.preimageInputEnabled).toBe(false);
    expect(view.approvalReceiptInputEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.tauriCommandEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
    expect(view.warningCodes).toEqual(
      expect.arrayContaining([
        "USER_WORKSPACE_APPLY_PROMOTION_READINESS_MISSING",
        "USER_WORKSPACE_APPLY_SNAPSHOT_CONTRACT_MISSING",
        "USER_WORKSPACE_APPLY_APP_APPLY_DISABLED"
      ])
    );
  });

  it("summarizes promotion refs without enabling App apply", () => {
    const readiness = {
      status: "readiness_ready",
      readinessId: "readiness-1",
      gateCount: 3,
      blockerCount: 0,
      warningCount: 0,
      nextAction: "Future user workspace apply prototype remains disabled"
    };
    const userWorkspaceSnapshotBackupContract = {
      status: "contract_ready",
      contractId: "contract-1",
      userWorkspaceRootRef: "user-workspace-root-ref",
      fileCount: 1,
      blockerCount: 0,
      warningCount: 0
    };
    const view = buildUserWorkspaceApplyPrototypeView({
      promotionReadiness: readiness,
      userWorkspaceSnapshotBackupContract,
      patchProposalPreview: { proposalId: "proposal-1" },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      patchVirtualApplyPreview: { virtualApplyId: "virtual-1" },
      patchRollbackCheckpointPreview: {
        checkpointPreviewId: "checkpoint-preview-1"
      }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("disabled");
    expect(view.readinessId).toBe(readiness.readinessId);
    expect(view.contractId).toBe("contract-1");
    expect(view.proposalId).toBe("proposal-1");
    expect(view.applyButtonEnabled).toBe(false);
    expect(view.contentInputEnabled).toBe(false);
    expect(view.preimageInputEnabled).toBe(false);
    expect(view.approvalReceiptInputEnabled).toBe(false);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toMatch(/"content"\s*:/);
  });

  it("keeps App Shell disconnected from user workspace apply execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "user-workspace-apply-prototype-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("User Workspace Apply Prototype");
    expect(appSource).toContain("Disabled by default / runtime prototype only");
    expect(appSource).toContain("Apply to User Workspace (disabled)");
    expect(appSource).toMatch(
      /The App Shell cannot apply\s+patches to the user\s+workspace/
    );
    expect(combined).not.toContain("handleApplyUserWorkspace");
    expect(combined).not.toContain("handlePromoteUserWorkspace");
    expect(combined).not.toContain("handleRollbackUserWorkspace");
    expect(combined).not.toContain("handleWriteUserWorkspaceEvents");
    expect(combined).not.toContain("approvalReceiptId");
    expect(adapterSource).not.toContain("preimageContent");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("user_workspace_apply");
  });
});

describe("app user workspace rollback prototype", () => {
  it("shows disabled-by-default runtime prototype state", () => {
    const view = buildUserWorkspaceRollbackPrototypeView();

    expect(view.source).toBe("app_user_workspace_rollback_prototype_disabled");
    expect(view.status).toBe("disabled");
    expect(view.disabledByDefault).toBe(true);
    expect(view.runtimePrototypeOnly).toBe(true);
    expect(view.runtimeHelperAvailable).toBe(true);
    expect(view.appExecutionConnected).toBe(false);
    expect(view.userWorkspaceMutationEnabled).toBe(false);
    expect(view.rollbackButtonEnabled).toBe(false);
    expect(view.preimageInputEnabled).toBe(false);
    expect(view.approvalReceiptInputEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.tauriCommandEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
    expect(view.warningCodes).toEqual(
      expect.arrayContaining([
        "USER_WORKSPACE_ROLLBACK_APPLY_RESULT_MISSING",
        "USER_WORKSPACE_ROLLBACK_CHECKPOINT_MISSING",
        "USER_WORKSPACE_ROLLBACK_APP_ROLLBACK_DISABLED"
      ])
    );
  });

  it("summarizes rollback refs without enabling App rollback", () => {
    const view = buildUserWorkspaceRollbackPrototypeView({
      userWorkspaceApplyResult: { applyId: "user-apply-1" },
      userWorkspaceSnapshotBackupContract: {
        contractId: "contract-1",
        userWorkspaceRootRef: "user-workspace-root-ref"
      },
      promotionReadiness: { readinessId: "readiness-1" },
      rollbackCheckpoint: {
        checkpointId: "checkpoint-1",
        entries: [{ path: "src/file.ts" }]
      }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("disabled");
    expect(view.applyId).toBe("user-apply-1");
    expect(view.checkpointId).toBe("checkpoint-1");
    expect(view.contractId).toBe("contract-1");
    expect(view.operationCount).toBe(1);
    expect(view.rollbackButtonEnabled).toBe(false);
    expect(view.preimageInputEnabled).toBe(false);
    expect(view.approvalReceiptInputEnabled).toBe(false);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toMatch(/"preimageContent"\s*:/);
  });

  it("keeps App Shell disconnected from user workspace rollback execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "user-workspace-rollback-prototype-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("User Workspace Rollback Prototype");
    expect(appSource).toContain("Disabled by default / runtime prototype only");
    expect(appSource).toContain("Rollback User Workspace (disabled)");
    expect(appSource).toMatch(
      /The App Shell cannot rollback\s+the user\s+workspace/
    );
    expect(combined).not.toContain("handleRollbackUserWorkspace");
    expect(combined).not.toContain("handleApplyUserWorkspace");
    expect(combined).not.toContain("handlePromoteUserWorkspace");
    expect(combined).not.toContain("handleWriteUserWorkspaceEvents");
    expect(combined).not.toContain("approvalReceiptId");
    expect(adapterSource).not.toContain("preimageContent");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("user_workspace_rollback");
  });
});

describe("app user workspace apply rollback event writer", () => {
  it("shows runtime-only disabled event writer state", () => {
    const view = buildUserWorkspaceEventWriterView();

    expect(view.source).toBe("app_user_workspace_event_writer_disabled");
    expect(view.status).toBe("disabled");
    expect(view.disabledByDefault).toBe(true);
    expect(view.runtimeOnly).toBe(true);
    expect(view.runtimeHelperAvailable).toBe(true);
    expect(view.appWriteConnected).toBe(false);
    expect(view.eventWriteButtonEnabled).toBe(false);
    expect(view.eventPayloadInputEnabled).toBe(false);
    expect(view.rawContentInputEnabled).toBe(false);
    expect(view.applyExecutionEnabled).toBe(false);
    expect(view.rollbackExecutionEnabled).toBe(false);
    expect(view.tauriCommandEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
    expect(view.warningCodes).toEqual(
      expect.arrayContaining([
        "USER_WORKSPACE_EVENT_WRITER_APPLY_RESULT_MISSING",
        "USER_WORKSPACE_EVENT_WRITER_ROLLBACK_RESULT_MISSING",
        "USER_WORKSPACE_EVENT_WRITER_APP_WRITE_DISABLED"
      ])
    );
  });

  it("summarizes apply and rollback refs without enabling App writes", () => {
    const view = buildUserWorkspaceEventWriterView({
      userWorkspaceApplyResult: {
        applyId: "user-apply-1",
        userWorkspaceRootRef: "user-root-ref"
      },
      userWorkspaceRollbackResult: {
        rollbackId: "user-rollback-1",
        userWorkspaceRootRef: "user-root-ref"
      },
      promotionReadiness: { readinessId: "readiness-1" },
      userWorkspaceSnapshotBackupContract: {
        contractId: "contract-1",
        userWorkspaceRootRef: "user-root-ref"
      }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("disabled");
    expect(view.userWorkspaceApplyId).toBe("user-apply-1");
    expect(view.userWorkspaceRollbackId).toBe("user-rollback-1");
    expect(view.userWorkspaceRootRef).toBe("user-root-ref");
    expect(view.readinessId).toBe("readiness-1");
    expect(view.contractId).toBe("contract-1");
    expect(view.eventWriteButtonEnabled).toBe(false);
    expect(view.eventPayloadInputEnabled).toBe(false);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toMatch(/"preimageContent"\s*:/);
  });

  it("keeps App Shell disconnected from apply rollback event writes", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "user-workspace-event-writer-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("User Workspace Apply / Rollback Event Writer");
    expect(appSource).toContain("Runtime only / App write disabled");
    expect(appSource).toContain("Write Apply/Rollback Events (disabled)");
    expect(appSource).toMatch(
      /The\s+App\s+Shell\s+cannot\s+write\s+these\s+events\s+or\s+execute\s+apply\/rollback/
    );
    expect(combined).not.toContain("writeUserWorkspaceApplyRollbackEvents");
    expect(combined).not.toContain("handleWriteUserWorkspaceEvents");
    expect(combined).not.toContain("handleWriteApplyRollbackEvents");
    expect(combined).not.toContain("eventPayloadDraft");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).toContain(
      "user_workspace.patch_apply.approved_result"
    );
    expect(desktopFlowSource).toContain(
      "user_workspace.patch_rollback.approved_result"
    );
    expect(desktopFlowSource).not.toContain(
      "writeUserWorkspaceApplyRollbackEvents"
    );
  });
});

describe("app approval execution design", () => {
  it("shows disabled design-only state with all execution readiness false", () => {
    const view = buildAppApprovalExecutionDesignView();

    expect(view.source).toBe("app_approval_execution_design");
    expect(view.status).toBe("disabled");
    expect(view.disabledActionCount).toBe(8);
    expect(view.readiness.canApprove).toBe(false);
    expect(view.readiness.canReject).toBe(false);
    expect(view.readiness.canIssuePermissionLease).toBe(false);
    expect(view.readiness.canExecuteApply).toBe(false);
    expect(view.readiness.canExecuteRollback).toBe(false);
    expect(view.readiness.canWriteEventStore).toBe(false);
    expect(view.readiness.canExecuteGit).toBe(false);
    expect(view.readiness.canExecuteShell).toBe(false);
    expect(view.readiness.appCanExecute).toBe(false);
    expect(view.requirements.map((item) => item.requirementId)).toEqual(
      expect.arrayContaining([
        "promotion_readiness",
        "app_approval_execution_disabled",
        "production_permission_lease_design",
        "manual_confirmation_required"
      ])
    );
    expect(summarizeAppApprovalExecutionDesignView(view)).toContain(
      "app_execution:false"
    );
  });

  it("keeps approval execution disabled even when summary refs are present", () => {
    const view = buildAppApprovalExecutionDesignView({
      userWorkspacePromotionReadiness: {
        status: "readiness_ready",
        readinessId: "readiness-1",
        userWorkspaceRootRef: "user-root-ref",
        blockerCount: 0
      },
      userWorkspaceApplyPrototype: buildUserWorkspaceApplyPrototypeView({
        promotionReadiness: { gates: [{ gateId: "gate-1" }] },
        userWorkspaceSnapshotBackupContract: { contractId: "contract-1" }
      }),
      userWorkspaceRollbackPrototype: buildUserWorkspaceRollbackPrototypeView({
        userWorkspaceApplyResult: { applyId: "apply-1" },
        userWorkspaceSnapshotBackupContract: { contractId: "contract-1" },
        promotionReadiness: { readinessId: "readiness-1" },
        rollbackCheckpoint: {
          checkpointId: "checkpoint-1",
          entries: [{ path: "src/file.ts" }]
        }
      }),
      userWorkspaceApplyRollbackEventWriter: buildUserWorkspaceEventWriterView({
        userWorkspaceApplyResult: { applyId: "apply-1" },
        userWorkspaceRollbackResult: { rollbackId: "rollback-1" },
        promotionReadiness: { readinessId: "readiness-1" },
        userWorkspaceSnapshotBackupContract: { contractId: "contract-1" }
      }),
      approvalDraft: {
        approvalDraftId: "approval-1",
        readiness: {
          canApprove: false,
          canReject: false,
          canIssueLease: false,
          canApplyPatch: false
        }
      },
      capabilityPlan: {
        planId: "capability-plan-1",
        readiness: { canIssuePermissionLease: false },
        executionEnabled: false
      },
      contextAssembly: { previewId: "context-preview-1" },
      auditSurface: { source: "audit-surface" }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("warning");
    expect(view.blockerCount).toBe(0);
    expect(view.readiness.appCanExecute).toBe(false);
    expect(view.readiness.canApprove).toBe(false);
    expect(view.readiness.canWriteEventStore).toBe(false);
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toMatch(/"preimageContent"\s*:/);
  });

  it("keeps App Shell disconnected from approval execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "app-approval-execution-design-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("App Approval Execution Design");
    expect(appSource).toContain("Design only / disabled");
    expect(appSource).toContain("Approve Apply (disabled)");
    expect(appSource).toContain("Reject Apply (disabled)");
    expect(appSource).toContain("Issue Permission Lease (disabled)");
    expect(appSource).toMatch(
      /The App Shell\s+cannot approve,\s+reject,\s+issue leases,\s+apply patches,\s+rollback,\s+or\s+write apply events/
    );
    expect(combined).not.toContain("handleApproveApply");
    expect(combined).not.toContain("handleRejectApply");
    expect(combined).not.toContain("handleIssuePermissionLease");
    expect(combined).not.toContain("handleApplyUserWorkspace");
    expect(combined).not.toContain("handleRollbackUserWorkspace");
    expect(combined).not.toContain("handleWriteUserWorkspaceEvents");
    expect(combined).not.toContain("applyPatchToUserWorkspacePrototype");
    expect(combined).not.toContain("rollbackUserWorkspaceApplyPrototype");
    expect(combined).not.toContain("writeUserWorkspaceApplyRollbackEvents");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("appendEvent");
    expect(adapterSource).not.toContain("recordControlRunDraftEvent");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("app_approval_execution");
  });

  it("locks v0.7 user workspace RC copy to disabled App execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const forbiddenExecutionHandlers = [
      "handleApplyUserWorkspace",
      "handleRollbackUserWorkspace",
      "handleWriteUserWorkspaceEvents",
      "handleApproveApply",
      "handleRejectApply",
      "handleIssuePermissionLease",
      "handleCommitUserWorkspace",
      "handleExecuteUserWorkspace"
    ];

    expect(appSource).toContain("Metadata only / no user workspace apply");
    expect(appSource).toMatch(
      /No files are read or written,\s+and no backup is\s+created/
    );
    expect(appSource).toContain("Readiness only / no write");
    expect(appSource).toMatch(
      /Readiness passing does not enable App\s+execution/
    );
    expect(appSource).toContain("Disabled by default / runtime prototype only");
    expect(appSource).toMatch(
      /The App Shell cannot apply\s+patches to the user\s+workspace/
    );
    expect(appSource).toMatch(
      /The App Shell cannot rollback\s+the user\s+workspace/
    );
    expect(appSource).toContain("Runtime only / App write disabled");
    expect(appSource).toMatch(
      /The\s+App\s+Shell\s+cannot\s+write\s+these\s+events/
    );
    expect(appSource).toContain("Design only / disabled");
    expect(appSource).toMatch(
      /The App Shell\s+cannot approve,\s+reject,\s+issue leases,\s+apply patches,\s+rollback,\s+or\s+write apply events/
    );
    expect(appSource).toContain(
      "Read-only. No approval, apply, rollback, commit, or execution"
    );
    expect(appSource).toContain(
      "No prompt is assembled and no model request is sent."
    );
    expect(appSource).toMatch(
      /No capability is invoked and no\s+permission lease is issued/
    );
    expect(appSource).toContain("Event log events");
    expect(appSource).toContain("Source-tree mode");
    expect(appSource).toContain("No native bridge");
    expect(appSource).toContain("Apply to User Workspace (disabled)");
    expect(appSource).toContain("Rollback User Workspace (disabled)");
    expect(appSource).toContain("Write Apply/Rollback Events (disabled)");
    expect(appSource).toContain("Approve Apply (disabled)");
    expect(appSource).toContain("Reject Apply (disabled)");
    expect(appSource).toContain("Issue Permission Lease (disabled)");
    for (const handlerName of forbiddenExecutionHandlers) {
      expect(appSource).not.toContain(handlerName);
    }
    expect(appSource).not.toContain("DeepSeek chat works");
    expect(appSource).not.toContain("Create Run works");
    expect(appSource).not.toContain("Execute Run works");
    expect(appSource).not.toContain("App can apply user workspace");
    expect(appSource).not.toContain("App can rollback user workspace");
    expect(appSource).not.toContain("App can approve");
    expect(appSource).not.toContain("Git execution works");
    expect(appSource).not.toContain("Shell execution works");
    expect(appSource).not.toContain("Native bridge is enabled");
  });
});

describe("app approved execution receipt preview", () => {
  function safeReceiptView(kind: "apply" | "rollback" = "apply") {
    return buildAppApprovedExecutionReceiptView({
      receiptKind: kind,
      applyTypedConfirmation: "APPLY TO USER WORKSPACE",
      rollbackTypedConfirmation: "ROLLBACK USER WORKSPACE",
      allowedRelativePathsText: "src/safe-file.ts",
      approvedApplyResult: kind === "rollback" ? safeApplyResult() : undefined,
      workspaceSnapshotBackupContract: {
        userWorkspaceRootRef: "workspace-ref-demo"
      },
      patchProposalPreview: {
        proposalId: "proposal-1",
        items: [{ path: "src/safe-file.ts", changeKind: "create" }]
      },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      patchRollbackCheckpointPreview: { checkpointPreviewId: "checkpoint-1" },
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => `receipt-${kind}-1`
    });
  }

  function safeApplyResult(): ApprovedUserWorkspaceApplyResult {
    return {
      ok: true,
      applyId: "approved-apply-1",
      checkpointId: "checkpoint-1",
      checkpointHash: "checkpoint-hash-123456",
      workspaceRootRef: "workspace-ref-demo",
      operationCount: 1,
      filesCreated: 1,
      filesUpdated: 0,
      filesDeleted: 0,
      bytesWritten: 12,
      warningCodes: [],
      inputSnapshotHash: "input-hash",
      outputSnapshotHash: "output-hash",
      resultHash: "result-hash",
      eventPreview: {
        type: "user_workspace.patch_apply.approved_result",
        applyId: "approved-apply-1",
        checkpointId: "checkpoint-1",
        checkpointHash: "checkpoint-hash-123456",
        workspaceRootRef: "workspace-ref-demo",
        operationCount: 1,
        filesCreated: 1,
        filesUpdated: 0,
        filesDeleted: 0,
        bytesWritten: 12,
        pathSummaries: ["create src/safe-file.ts"],
        pathSummaryCount: 1,
        resultHash: "result-hash",
        warningCodes: [],
        notWritten: true
      },
      safeMessage:
        "Approved user workspace apply completed with a summary-only result. Event preview was not written."
    };
  }

  function safeRollbackResult(): ApprovedUserWorkspaceRollbackResult {
    return {
      ok: true,
      rollbackId: "approved-rollback-1",
      applyId: "approved-apply-1",
      checkpointId: "checkpoint-1",
      checkpointHash: "checkpoint-hash-123456",
      workspaceRootRef: "workspace-ref-demo",
      operationCount: 1,
      filesRemoved: 1,
      filesRestored: 0,
      restoredSnapshotHash: "restored-hash",
      resultHash: "rollback-result-hash",
      warningCodes: [],
      eventPreview: {
        type: "user_workspace.patch_rollback.approved_result",
        rollbackId: "approved-rollback-1",
        applyId: "approved-apply-1",
        checkpointId: "checkpoint-1",
        checkpointHash: "checkpoint-hash-123456",
        workspaceRootRef: "workspace-ref-demo",
        operationCount: 1,
        filesRemoved: 1,
        filesRestored: 0,
        pathSummaries: ["create src/safe-file.ts"],
        pathSummaryCount: 1,
        restoredSnapshotHash: "restored-hash",
        resultHash: "rollback-result-hash",
        warningCodes: [],
        notWritten: true
      },
      safeMessage:
        "Approved user workspace rollback completed with a summary-only result. Event preview was not written."
    };
  }

  it("builds apply and rollback receipt previews without enabling App execution", () => {
    const applyView = safeReceiptView("apply");
    const rollbackView = safeReceiptView("rollback");

    expect(applyView.status).toBe("ready");
    expect(applyView.kind).toBe("apply");
    expect(rollbackView.status).toBe("ready");
    expect(rollbackView.kind).toBe("rollback");
    expect(rollbackView.checkpointId).toBe("checkpoint-1");
    expect(applyView.readiness.canApplyPatch).toBe(false);
    expect(applyView.readiness.canRollback).toBe(false);
    expect(applyView.readiness.canWriteFilesystem).toBe(false);
    expect(applyView.readiness.canWriteEventStore).toBe(false);
    expect(applyView.readiness.canExecuteGit).toBe(false);
    expect(applyView.readiness.canExecuteShell).toBe(false);
    expect(applyView.readiness.canIssuePermissionLease).toBe(false);
    expect(applyView.readiness.appCanExecute).toBe(false);
  });

  it("keeps receipt preview empty and safe before user confirmation", () => {
    const view = buildAppApprovedExecutionReceiptView();

    expect(view.status).toBe("empty");
    expect(view.readiness.canPreviewReceipt).toBe(false);
    expect(view.readiness.canWriteFilesystem).toBe(false);
    expect(view.readiness.appCanExecute).toBe(false);
    expect(view.summary).toContain("app_execution:false");
  });

  it("blocks App receipt preview when confirmation is wrong", () => {
    const view = buildAppApprovedExecutionReceiptView({
      receiptKind: "apply",
      applyTypedConfirmation: "apply",
      allowedRelativePathsText: "src/safe-file.ts",
      workspaceSnapshotBackupContract: {
        userWorkspaceRootRef: "workspace-ref-demo"
      },
      patchProposalPreview: { proposalId: "proposal-1" },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" }
    });

    expect(view.status).toBe("blocked");
    expect(view.findings.map((finding) => finding.code)).toContain(
      "APP_APPROVED_RECEIPT_CONFIRMATION_MISMATCH"
    );
    expect(view.readiness.canPreviewReceipt).toBe(false);
  });

  it("enables apply only after strict receipt, path, and content gates", () => {
    const receiptView = safeReceiptView("apply");
    const view = buildAppApprovedExecutionFlowView({
      workspaceRoot: "D:\\workspace",
      receiptView,
      patchProposalPreview: {
        proposalId: "proposal-1",
        items: [{ path: "src/safe-file.ts", changeKind: "create" }]
      },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      contentDraft: "summary safe content"
    });
    const request = buildApprovedApplyRequestFromExecutionFlow({
      workspaceRoot: "D:\\workspace",
      receiptView,
      patchProposalPreview: {
        proposalId: "proposal-1",
        items: [{ path: "src/safe-file.ts", changeKind: "create" }]
      },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      contentDraft: "summary safe content"
    });
    const serializedView = JSON.stringify(view);

    expect(view.status).toBe("apply_ready");
    expect(view.readiness.canApplyApprovedPatch).toBe(true);
    expect(view.readiness.canRollbackApprovedPatch).toBe(false);
    expect(view.readiness.canUseGenericCommand).toBe(false);
    expect(request.operations).toHaveLength(1);
    expect(request.operations[0]?.path).toBe("src/safe-file.ts");
    expect(request.operations[0]?.content).toBe("summary safe content");
    expect(serializedView).not.toContain("summary safe content");
    expect(serializedView).not.toContain("rawPrompt");
  });

  it("blocks apply when content or confirmation gates are missing", () => {
    const missingContent = buildAppApprovedExecutionFlowView({
      workspaceRoot: "D:\\workspace",
      receiptView: safeReceiptView("apply"),
      patchProposalPreview: {
        proposalId: "proposal-1",
        items: [{ path: "src/safe-file.ts", changeKind: "create" }]
      },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      contentDraft: ""
    });
    const blockedReceipt = buildAppApprovedExecutionReceiptView({
      receiptKind: "apply",
      applyTypedConfirmation: "apply",
      allowedRelativePathsText: "src/safe-file.ts",
      workspaceSnapshotBackupContract: {
        userWorkspaceRootRef: "workspace-ref-demo"
      },
      patchProposalPreview: { proposalId: "proposal-1" },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" }
    });
    const wrongConfirmation = buildAppApprovedExecutionFlowView({
      workspaceRoot: "D:\\workspace",
      receiptView: blockedReceipt,
      contentDraft: "safe content"
    });

    expect(missingContent.status).toBe("blocked");
    expect(missingContent.readiness.canApplyApprovedPatch).toBe(false);
    expect(missingContent.findings.map((finding) => finding.code)).toContain(
      "APP_APPROVED_EXECUTION_CONTENT_MISSING"
    );
    expect(wrongConfirmation.status).toBe("blocked");
    expect(wrongConfirmation.findings.map((finding) => finding.code)).toContain(
      "APP_APPROVED_EXECUTION_RECEIPT_BLOCKED"
    );
  });

  it("enables rollback only after apply checkpoint and matching rollback receipt", () => {
    const receiptView = safeReceiptView("rollback");
    const view = buildAppApprovedExecutionFlowView({
      workspaceRoot: "D:\\workspace",
      receiptView,
      patchProposalPreview: {
        proposalId: "proposal-1",
        items: [{ path: "src/safe-file.ts", changeKind: "create" }]
      },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      applyResult: safeApplyResult()
    });
    const request = buildApprovedRollbackRequestFromExecutionFlow({
      workspaceRoot: "D:\\workspace",
      receiptView,
      patchProposalPreview: {
        proposalId: "proposal-1",
        items: [{ path: "src/safe-file.ts", changeKind: "create" }]
      },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      applyResult: safeApplyResult()
    });

    expect(view.status).toBe("rollback_ready");
    expect(view.readiness.canApplyApprovedPatch).toBe(false);
    expect(view.readiness.canRollbackApprovedPatch).toBe(true);
    expect(request.checkpointId).toBe("checkpoint-1");
    expect(request.checkpointRef).toBe("checkpoint-hash-123456");
  });

  it("summarizes completed apply and rollback without raw content", () => {
    const applied = buildAppApprovedExecutionFlowView({
      workspaceRoot: "D:\\workspace",
      receiptView: safeReceiptView("apply"),
      contentDraft: "summary safe content",
      applyResult: safeApplyResult()
    });
    const rolledBack = buildAppApprovedExecutionFlowView({
      workspaceRoot: "D:\\workspace",
      receiptView: safeReceiptView("rollback"),
      applyResult: safeApplyResult(),
      rollbackResult: safeRollbackResult()
    });
    const serialized = JSON.stringify({ applied, rolledBack });

    expect(applied.status).toBe("applied");
    expect(rolledBack.status).toBe("rolled_back");
    expect(applied.applyResultSummary).toContain("approved-apply-1");
    expect(rolledBack.rollbackResultSummary).toContain("approved-rollback-1");
    expect(serialized).not.toContain("summary safe content");
    expect(serialized).not.toContain("preimage");
  });

  it("classifies approved execution recovery states without unsafe actions", () => {
    const applyFlow = buildAppApprovedExecutionFlowView({
      workspaceRoot: "D:\\workspace",
      receiptView: safeReceiptView("apply"),
      patchProposalPreview: {
        proposalId: "proposal-1",
        items: [{ path: "src/safe-file.ts", changeKind: "create" }]
      },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      contentDraft: "summary safe content"
    });
    const rollbackFlow = buildAppApprovedExecutionFlowView({
      workspaceRoot: "D:\\workspace",
      receiptView: safeReceiptView("rollback"),
      applyResult: safeApplyResult()
    });
    const noWrite = buildApprovedExecutionRecoveryView({
      approvedExecutionFlowView: applyFlow,
      latestFailureSummary: "Approved apply failed before writing."
    });
    const partialWithCheckpoint = buildApprovedExecutionRecoveryView({
      approvedExecutionFlowView: applyFlow,
      applyResult: safeApplyResult(),
      eventRecordError: "Summary event write failed safely."
    });
    const rollbackAvailable = buildApprovedExecutionRecoveryView({
      approvedExecutionFlowView: rollbackFlow,
      applyResult: safeApplyResult()
    });
    const rollbackFailed = buildApprovedExecutionRecoveryView({
      approvedExecutionFlowView: rollbackFlow,
      applyResult: safeApplyResult(),
      latestFailureSummary: "Approved rollback failed safely."
    });
    const checkpointMissing = buildApprovedExecutionRecoveryView({
      approvedExecutionFlowView: applyFlow,
      latestFailureSummary: "Checkpoint missing after partial apply."
    });
    const revalidate = buildApprovedExecutionRecoveryView({
      approvedExecutionFlowView: applyFlow,
      latestFailureSummary:
        "Expected before hash mismatch. Snapshot changed before apply."
    });
    const completed = buildApprovedExecutionRecoveryView({
      approvedExecutionFlowView: rollbackFlow,
      applyResult: safeApplyResult(),
      rollbackResult: safeRollbackResult()
    });
    const rawBlocked = buildApprovedExecutionRecoveryView({
      latestFailureSummary: "unsafe raw prompt contained sk-fake-not-a-real-key"
    });

    expect(noWrite.state).toBe("apply_failed_no_write");
    expect(noWrite.checkpointStatus).toBe("not_required");
    expect(partialWithCheckpoint.state).toBe(
      "apply_partial_checkpoint_available"
    );
    expect(partialWithCheckpoint.checkpointStatus).toBe("verified");
    expect(partialWithCheckpoint.eventSummaryStatus).toBe("write_failed");
    expect(rollbackAvailable.state).toBe("rollback_available");
    expect(rollbackAvailable.rollbackAvailability).toBe("available");
    expect(rollbackFailed.state).toBe("rollback_failed");
    expect(checkpointMissing.state).toBe("apply_partial_checkpoint_missing");
    expect(checkpointMissing.checkpointStatus).toBe("missing");
    expect(revalidate.state).toBe("revalidate_required");
    expect(revalidate.nextAction).toContain("Revalidate required");
    expect(completed.state).toBe("rollback_completed");
    expect(completed.status).toBe("completed");
    expect(rawBlocked.status).toBe("blocked");
    expect(rawBlocked.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["API_KEY_MARKER", "RAW_CONTENT_MARKER"])
    );
    expect(rawBlocked.readiness.canRetryApplyFromRecovery).toBe(false);
    expect(rawBlocked.readiness.canRollbackFromRecovery).toBe(false);
    expect(rawBlocked.readiness.canRunManualRecovery).toBe(false);
    expect(rawBlocked.readiness.canWriteFilesystem).toBe(false);
    expect(rawBlocked.readiness.canWriteEventStore).toBe(false);
    expect(rawBlocked.readiness.canExecuteGit).toBe(false);
    expect(rawBlocked.readiness.canExecuteShell).toBe(false);
    expect(rawBlocked.readiness.canIssuePermissionLease).toBe(false);
    expect(JSON.stringify(rawBlocked)).not.toContain("sk-fake");
    expect(JSON.stringify(rawBlocked)).not.toContain("not-a-real-key");
  });

  it("projects approved execution replay timeline states deterministically", () => {
    const proposalImport = {
      status: "imported"
    } as never;
    const validationPreview = { status: "valid" };
    const diffAuditPreview = { status: "audit_ready" };
    const applyResult = safeApplyResult();
    const rollbackResult = safeRollbackResult();
    const verificationSummary = fixedVerificationEventSummary();
    const fullEventSummary = fixedEventSummary({
      eventCount: 5,
      displayedEventCount: 5,
      approvedApplyCount: 1,
      approvedRollbackCount: 1,
      verificationEventCount: 2,
      liveProposalEventCount: 1,
      typeCounts: {
        "model.patch_proposal.live_generated": 1,
        "user_workspace.patch_apply.app_executed": 1,
        "git.read_lane.executed": 1,
        "shell.verification_lane.executed": 1,
        "user_workspace.patch_rollback.app_executed": 1
      },
      timeline: [
        {
          id: "proposal-event-1",
          ts: "2026-06-26T00:00:00.000Z",
          type: "model.patch_proposal.live_generated",
          taskId: "task-1",
          summary: "live proposal generated: proposal-1 · summary only",
          safePayloadKeys: ["proposalId", "proposalHash"]
        },
        {
          id: "apply-event-1",
          ts: "2026-06-26T00:00:01.000Z",
          type: "user_workspace.patch_apply.app_executed",
          taskId: "task-1",
          summary:
            "approved apply executed: op approved-apply-1 · checkpoint checkpoint-1 · files 1",
          safePayloadKeys: ["pathSummaries", "pathSummaryCount"]
        },
        ...(verificationSummary.timeline as unknown[]),
        {
          id: "rollback-event-1",
          ts: "2026-06-26T00:00:04.000Z",
          type: "user_workspace.patch_rollback.app_executed",
          taskId: "task-1",
          summary:
            "approved rollback executed: op approved-rollback-1 · checkpoint checkpoint-1 · files 1",
          safePayloadKeys: ["pathSummaries", "pathSummaryCount"]
        }
      ]
    });
    const rollbackChain = buildApprovedExecutionReplayTimelineView({
      eventSummary: fullEventSummary,
      modelPatchProposalImportView: proposalImport,
      patchValidationPreview: validationPreview,
      patchDiffAuditPreview: diffAuditPreview,
      approvalReceiptView: safeReceiptView("rollback"),
      approvedExecutionFlowView: buildAppApprovedExecutionFlowView({
        workspaceRoot: "D:\\workspace",
        receiptView: safeReceiptView("rollback"),
        applyResult
      }),
      applyResult,
      rollbackResult,
      verificationLaneProjection:
        buildVerificationLaneProjectionView(verificationSummary)
    });
    const applyFailure = buildApprovedExecutionReplayTimelineView({
      eventSummary: fixedEventSummary({
        approvedApplyCount: 1,
        timeline: []
      }),
      modelPatchProposalImportView: proposalImport,
      patchValidationPreview: validationPreview,
      patchDiffAuditPreview: diffAuditPreview,
      approvalReceiptView: safeReceiptView("apply"),
      approvedExecutionFlowView: buildAppApprovedExecutionFlowView({
        workspaceRoot: "D:\\workspace",
        receiptView: safeReceiptView("apply"),
        contentDraft: "summary safe content"
      }),
      approvedExecutionError:
        "Expected before hash mismatch. Snapshot changed before apply."
    });
    const failedVerificationSummary = fixedVerificationEventSummary({
      timeline: [
        {
          id: "shell-verification-event-1",
          ts: "2026-06-25T00:00:02.000Z",
          type: "shell.verification_lane.executed",
          taskId: "no task",
          summary:
            "shell verification lane recorded: app.typecheck · 1 exit · 12 stdout bytes · 0 stderr bytes · result shellhash",
          safePayloadKeys: ["templateId", "exitCode", "resultHash"]
        }
      ]
    });
    const verificationFailure = buildApprovedExecutionReplayTimelineView({
      eventSummary: failedVerificationSummary,
      modelPatchProposalImportView: proposalImport,
      patchValidationPreview: validationPreview,
      patchDiffAuditPreview: diffAuditPreview,
      approvalReceiptView: safeReceiptView("apply"),
      approvedExecutionFlowView: buildAppApprovedExecutionFlowView({
        workspaceRoot: "D:\\workspace",
        receiptView: safeReceiptView("apply"),
        contentDraft: "summary safe content",
        applyResult
      }),
      applyResult,
      verificationLaneProjection: buildVerificationLaneProjectionView(
        failedVerificationSummary
      )
    });
    const duplicated = buildApprovedExecutionReplayTimelineView({
      eventSummary: fixedEventSummary({
        approvedApplyCount: 1,
        timeline: [
          {
            id: "apply-event-dup",
            ts: "2026-06-26T00:00:01.000Z",
            type: "user_workspace.patch_apply.app_executed",
            taskId: "task-1",
            summary: "approved apply executed: files 1",
            safePayloadKeys: ["pathSummaries"]
          },
          {
            id: "apply-event-dup",
            ts: "2026-06-26T00:00:01.000Z",
            type: "user_workspace.patch_apply.app_executed",
            taskId: "task-1",
            summary: "approved apply executed: files 1",
            safePayloadKeys: ["pathSummaries"]
          }
        ]
      }),
      modelPatchProposalImportView: proposalImport,
      patchValidationPreview: validationPreview,
      patchDiffAuditPreview: diffAuditPreview,
      approvalReceiptView: safeReceiptView("apply"),
      applyResult
    });
    const duplicatedAgain = buildApprovedExecutionReplayTimelineView({
      eventSummary: fixedEventSummary({
        approvedApplyCount: 1,
        timeline: [
          {
            id: "apply-event-dup",
            ts: "2026-06-26T00:00:01.000Z",
            type: "user_workspace.patch_apply.app_executed",
            taskId: "task-1",
            summary: "approved apply executed: files 1",
            safePayloadKeys: ["pathSummaries"]
          },
          {
            id: "apply-event-dup",
            ts: "2026-06-26T00:00:01.000Z",
            type: "user_workspace.patch_apply.app_executed",
            taskId: "task-1",
            summary: "approved apply executed: files 1",
            safePayloadKeys: ["pathSummaries"]
          }
        ]
      }),
      modelPatchProposalImportView: proposalImport,
      patchValidationPreview: validationPreview,
      patchDiffAuditPreview: diffAuditPreview,
      approvalReceiptView: safeReceiptView("apply"),
      applyResult
    });
    const rawBlocked = buildApprovedExecutionReplayTimelineView({
      eventSummary: fixedEventSummary({
        timeline: [
          {
            id: "unsafe-event",
            ts: "2026-06-26T00:00:01.000Z",
            type: "user_workspace.patch_apply.app_executed",
            taskId: "task-1",
            summary: "unsafe raw prompt sk-fake-not-a-real-key",
            safePayloadKeys: []
          }
        ]
      })
    });

    expect(rollbackChain.status).toBe("projected");
    expect(rollbackChain.stages.map((stage) => stage.kind)).toEqual([
      "proposal_imported_or_generated",
      "validation_result",
      "diff_audit",
      "approval_receipt_created",
      "apply_attempted",
      "apply_succeeded_or_failed",
      "checkpoint_created",
      "verification_run",
      "verification_passed_or_failed",
      "rollback_attempted",
      "rollback_succeeded_or_failed",
      "final_task_status"
    ]);
    expect(rollbackChain.completedStageCount).toBe(12);
    expect(rollbackChain.readiness.canApplyPatch).toBe(false);
    expect(rollbackChain.readiness.canRollback).toBe(false);
    expect(rollbackChain.readiness.canWriteEventStore).toBe(false);
    expect(applyFailure.status).toBe("warning");
    expect(applyFailure.findings.map((finding) => finding.code)).toContain(
      "APPROVED_REPLAY_TIMELINE_EVENT_MISSING"
    );
    expect(verificationFailure.status).toBe("warning");
    expect(
      verificationFailure.stages.find(
        (stage) => stage.kind === "verification_passed_or_failed"
      )?.warningCodes
    ).toContain("VERIFICATION_FAILED");
    expect(duplicated.duplicateEventCount).toBe(1);
    expect(duplicated.timelineHash).toBe(duplicatedAgain.timelineHash);
    expect(rawBlocked.status).toBe("blocked");
    expect(JSON.stringify(rawBlocked)).not.toContain("sk-fake");
    expect(JSON.stringify(rawBlocked)).not.toContain("not-a-real-key");
  });

  it("builds the P0O-007 approved execution smoke request from fixtures", async () => {
    const fixture = JSON.parse(
      await readFile(
        path.join(
          appRoot,
          "test",
          "fixtures",
          "approved-execution-smoke-proposal.json"
        ),
        "utf8"
      )
    ) as Record<string, string>;
    const workspaceFixture = JSON.parse(
      await readFile(
        path.join(
          appRoot,
          "test",
          "fixtures",
          "approved-execution-temp-workspace.json"
        ),
        "utf8"
      )
    ) as Record<string, string | boolean>;
    const receiptView = buildAppApprovedExecutionReceiptView({
      receiptKind: "apply",
      applyTypedConfirmation: fixture.applyTypedConfirmation,
      allowedRelativePathsText: fixture.path,
      workspaceSnapshotBackupContract: {
        userWorkspaceRootRef: fixture.workspaceRootRef
      },
      patchProposalPreview: {
        proposalId: fixture.proposalId,
        items: [{ path: fixture.path, changeKind: fixture.changeKind }]
      },
      patchValidationPreview: { validationId: fixture.validationId },
      patchDiffAuditPreview: { auditId: fixture.auditId },
      patchApprovalDraft: { approvalDraftId: fixture.approvalDraftId },
      createdAt: "2026-01-01T00:00:00.000Z",
      idGenerator: () => "receipt-smoke-fixture"
    });
    const input = {
      workspaceRoot: "D:\\workspace",
      receiptView,
      patchProposalPreview: {
        proposalId: fixture.proposalId,
        items: [{ path: fixture.path, changeKind: fixture.changeKind }]
      },
      patchValidationPreview: { validationId: fixture.validationId },
      patchDiffAuditPreview: { auditId: fixture.auditId },
      patchApprovalDraft: { approvalDraftId: fixture.approvalDraftId },
      contentDraft: fixture.contentDraft
    };
    const view = buildAppApprovedExecutionFlowView(input);
    const request = buildApprovedApplyRequestFromExecutionFlow(input);
    const serialized = JSON.stringify(view);

    expect(workspaceFixture.fixtureKind).toBe("temp_workspace_contract");
    expect(workspaceFixture.summaryOnlyEvents).toBe(true);
    expect(view.status).toBe("apply_ready");
    expect(request.operations[0]?.path).toBe(
      "docs/app-approved-execution-smoke.md"
    );
    expect(request.operations[0]?.changeKind).toBe("create");
    expect(request.workspaceRootRef).toBe(
      "workspace-ref-approved-execution-smoke"
    );
    expect(receiptView.workspaceRootRef).toBe(request.workspaceRootRef);
    expect(serialized).not.toContain(fixture.contentDraft);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain(["api", "Key"].join(""));
  });

  it("projects approved execution replay counts into the event log panel", () => {
    const model = buildEventLogPanelModel(
      fixedEventSummary({
        approvedApplyCount: 1,
        approvedRollbackCount: 1,
        latestApprovedExecutionSummary:
          "approved rollback executed: op approved-rollback-1 · checkpoint checkpoint-1 · files 1",
        typeCounts: {
          "user_workspace.patch_apply.app_executed": 1,
          "user_workspace.patch_rollback.app_executed": 1
        },
        timeline: [
          {
            id: "approved-event-1",
            type: "user_workspace.patch_apply.app_executed",
            summary:
              "approved apply executed: op approved-apply-1 · checkpoint checkpoint-1 · files 1",
            safePayloadKeys: ["pathSummaries", "pathSummaryCount"]
          }
        ]
      })
    );

    expect(model).toBeDefined();
    expect(model?.approvedApplyCount).toBe(1);
    expect(model?.approvedRollbackCount).toBe(1);
    expect(model?.latestApprovedExecutionSummary).toContain(
      "approved rollback executed"
    );
  });

  it("renders approved execution flow with fixed commands and summary events only", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "app-approved-execution-receipt-view.ts"),
      "utf8"
    );
    const flowSource = await readFile(
      path.join(appRoot, "src", "app-approved-execution-flow-view.ts"),
      "utf8"
    );
    const recoverySource = await readFile(
      path.join(appRoot, "src", "approved-execution-recovery-view.ts"),
      "utf8"
    );
    const replayTimelineSource = await readFile(
      path.join(appRoot, "src", "approved-execution-replay-timeline-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}\n${flowSource}\n${recoverySource}\n${replayTimelineSource}`;

    expect(appSource).toContain("App Approved Execution Receipt");
    expect(appSource).toContain("Receipt preview / no execution");
    expect(appSource).toContain("Apply typed confirmation");
    expect(appSource).toContain("Rollback typed confirmation");
    expect(appSource).toContain("Preview Apply Receipt");
    expect(appSource).toContain("Preview Rollback Receipt");
    expect(appSource).toContain("Approved Execution");
    expect(appSource).toContain("Human approved / narrow write path");
    expect(appSource).toContain("Rollback available");
    expect(appSource).toContain("Apply Approved Patch");
    expect(appSource).toContain("Rollback Approved Patch");
    expect(appSource).toContain("No generic command UI");
    expect(appSource).toContain("Approved Execution Recovery");
    expect(appSource).toContain("Recovery preview / no auto execution");
    expect(appSource).toContain("Preview Approved Recovery");
    expect(appSource).toContain("Retry Apply (disabled)");
    expect(appSource).toContain("Rollback From Recovery (disabled)");
    expect(appSource).toContain("Write Recovery Event (disabled)");
    expect(appSource).toContain("Checkpoint status");
    expect(appSource).toContain("Rollback guidance");
    expect(appSource).toContain("Manual recovery guidance");
    expect(appSource).toContain("Approved Execution Replay Timeline");
    expect(appSource).toContain("Audit timeline / summary-only replay");
    expect(appSource).toContain("Preview Approved Replay Timeline");
    expect(appSource).toContain("Replay Write Event (disabled)");
    expect(appSource).toContain("Execute From Timeline (disabled)");
    expect(appSource).toContain("Apply / rollback / verification events");
    expect(appSource).toContain("Latest approved execution");
    expect(appSource).toMatch(
      /The App\s+Shell does not invoke Tauri,\s+write files,\s+apply patches,\s+rollback,\s+write events,\s+issue leases,\s+or execute Git or shell commands/
    );
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toContain("recordControlRunDraftEvent");
    expect(viewSource).not.toContain("writeFile");
    expect(viewSource).not.toContain("readFile(");
    expect(flowSource).not.toContain("safeInvoke");
    expect(flowSource).not.toContain("writeFile");
    expect(flowSource).not.toContain("readFile(");
    expect(recoverySource).not.toContain("safeInvoke");
    expect(recoverySource).not.toContain("writeFile");
    expect(recoverySource).not.toContain("readFile(");
    expect(replayTimelineSource).not.toContain("safeInvoke");
    expect(replayTimelineSource).not.toContain("writeFile");
    expect(replayTimelineSource).not.toContain("readFile(");
    expect(combined).not.toContain("handleIssuePermissionLease");
    expect(combined).not.toContain("appendEventStore");
    expect(combined).not.toContain("handleExecuteFromTimeline");
    expect(combined).not.toContain("handleReplayWriteEvent");
    expect(desktopFlowSource).toContain("apply_approved_user_workspace_patch");
    expect(desktopFlowSource).toContain(
      "rollback_approved_user_workspace_patch"
    );
    expect(desktopFlowSource).toContain(
      "record_approved_user_workspace_execution_event"
    );
    expect(desktopFlowSource).not.toContain("gitCommand");
    expect(desktopFlowSource).not.toContain("shellCommand");
  });

  it("documents the P0S-004 approved execution recovery surface", async () => {
    const docs = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-approved-execution-recovery-v0.15.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${docs}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("App Shell Approved Execution Recovery v0.15");
    expect(combined).toContain("apply_failed_no_write");
    expect(combined).toContain("apply_partial_checkpoint_available");
    expect(combined).toContain("apply_partial_checkpoint_missing");
    expect(combined).toContain("rollback_available");
    expect(combined).toContain("rollback_failed");
    expect(combined).toContain("manual_recovery_required");
    expect(combined).toContain("revalidate_required");
    expect(combined).toContain("no automatic retry");
    expect(combined).toContain("no rollback from the recovery panel");
    expect(combined).toContain("no EventStore write");
    expect(combined).toContain("no Git or shell execution");
    expect(combined).toContain("no raw content display");
    expect(docsIndex).toContain(
      "app-shell-approved-execution-recovery-v0.15.md"
    );
  });

  it("documents the P0S-005 approved execution replay timeline boundary", async () => {
    const docs = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-approved-execution-replay-timeline-v0.15.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${docs}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain(
      "App Shell Approved Execution Replay Timeline v0.15"
    );
    expect(combined).toContain("proposal_imported_or_generated");
    expect(combined).toContain("validation_result");
    expect(combined).toContain("diff_audit");
    expect(combined).toContain("approval_receipt_created");
    expect(combined).toContain("apply_attempted");
    expect(combined).toContain("checkpoint_created");
    expect(combined).toContain("verification_passed_or_failed");
    expect(combined).toContain("rollback_succeeded_or_failed");
    expect(combined).toContain("final_task_status");
    expect(combined).toContain("Missing events produce warnings");
    expect(combined).toContain("Duplicate event ids are deduplicated");
    expect(combined).toContain("no EventStore write");
    expect(combined).toContain("no apply or rollback from the timeline");
    expect(combined).toContain("no arbitrary Git or shell");
    expect(combined).toContain("no raw content in timeline output");
    expect(docsIndex).toContain(
      "app-shell-approved-execution-replay-timeline-v0.15.md"
    );
  });

  it("documents the P0S-006 approved execution smoke hardening checklist", async () => {
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "e2e-coding-task-hardening-manual-qa.md"),
      "utf8"
    );
    const smokePlan = await readFile(
      path.join(repoRoot, "docs", "e2e-coding-task-hardening-smoke-plan.md"),
      "utf8"
    );
    const smokeChecker = await readFile(
      path.join(repoRoot, "scripts", "check-e2e-approved-execution-smoke.mjs"),
      "utf8"
    );
    const packageJson = await readFile(
      path.join(repoRoot, "package.json"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${manualQa}\n${smokePlan}\n${appReadme}`;

    expect(combined).toContain("Convert");
    expect(combined).toContain("live proposal generation");
    expect(combined).toContain("proposal chain");
    expect(combined).toContain("approved apply");
    expect(combined).toContain("verification lane");
    expect(combined).toContain("rollback");
    expect(combined).toContain("replay");
    expect(combined).toContain("stale conflict");
    expect(combined).toContain("failure recovery");
    expect(combined).toContain("raw content absence");
    expect(combined).toContain("static smoke checker");
    expect(combined).toContain("does not execute apply");
    expect(combined).toContain("does not execute rollback");
    expect(combined).toContain("does not mutate workspace");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("no raw prompt");
    expect(combined).toContain("no raw response");
    expect(combined).toContain("no API key");
    expect(smokeChecker).toContain("readFile");
    expect(smokeChecker).not.toContain("node:child_process");
    expect(smokeChecker).not.toContain("safeInvoke");
    expect(smokeChecker).not.toContain("writeFile");
    expect(smokeChecker).not.toContain("mkdtemp");
    expect(packageJson).toContain("check:e2e-approved-execution-smoke");
    expect(docsIndex).toContain("e2e-coding-task-hardening-manual-qa.md");
    expect(docsIndex).toContain("e2e-coding-task-hardening-smoke-plan.md");
  });

  it("documents the P0S-007 package warnings and boundary tightening", async () => {
    const docs = await readFile(
      path.join(
        repoRoot,
        "docs",
        "mvp-hardening-package-boundary-notes-v0.15.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const boundaryChecker = await readFile(
      path.join(repoRoot, "scripts", "check-boundaries.mjs"),
      "utf8"
    );
    const combined = `${docs}\n${docsIndex}\n${boundaryChecker}`;

    expect(combined).toContain("Tauri Bundle Identifier");
    expect(combined).toContain("Vite Chunk Size");
    expect(combined).toContain("GitHub Actions Node 20 Annotation");
    expect(combined).toContain("non-blocking warning");
    expect(combined).toContain(
      "approved_execution_command_outside_controlled_lane"
    );
    expect(combined).toContain("app_tauri_invoke_outside_desktop_flow");
    expect(combined).toContain("execution_readiness_enabled_in_preview_source");
    expect(combined).toContain("native_bridge_or_desktop_action_enabled");
    expect(combined).toContain("no App-side live DeepSeek call");
    expect(combined).toContain("no arbitrary Git/shell execution");
    expect(combined).toContain("no raw content in approved execution events");
    expect(docsIndex).toContain(
      "mvp-hardening-package-boundary-notes-v0.15.md"
    );
  });

  it("documents the v0.15 MVP hardening recovery RC release boundary", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.15.0-mvp-hardening-recovery-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "mvp-hardening-recovery-manual-qa.md"),
      "utf8"
    );
    const rcChecklist = await readFile(
      path.join(repoRoot, "docs", "mvp-hardening-recovery-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const combined = `${releaseNotes}\n${manualQa}\n${rcChecklist}\n${docsIndex}\n${rootReadme}\n${appReadme}\n${appSource}`;

    expect(combined).toContain("v0.15.0-mvp-hardening-recovery-rc.1");
    expect(combined).toContain("MVP hardening, recovery, and E2E regression");
    expect(combined).toContain(
      "web_table_to_csv Convert remains the real baseline flow"
    );
    expect(combined).toContain(
      "App live proposal generation remains explicit opt-in"
    );
    expect(combined).toContain(
      "Approved apply remains human-approved and typed-confirmation gated"
    );
    expect(combined).toContain(
      "Verification safe lanes remain fixed and summary-only"
    );
    expect(combined).toContain("Rollback remains checkpoint-based");
    expect(combined).toContain("Replay/audit timeline shows the E2E chain");
    expect(combined).toContain(
      "Failure recovery and conflict handling have been hardened"
    );
    expect(combined).toContain("no auto-apply");
    expect(combined).toContain("no autonomous coding loop");
    expect(combined).toContain("no arbitrary Git/shell");
    expect(combined).toContain("no broad PermissionLease");
    expect(combined).toContain("no MCP/plugin/skills runtime");
    expect(combined).toContain("no native bridge");
    expect(combined).toContain("no desktop action");
    expect(combined).toContain("no raw content in events");
    expect(combined).toContain("golden regression");
    expect(combined).toContain("stale snapshot detection");
    expect(combined).toContain("conflict fail-closed");
    expect(combined).toContain("checkpoint verification");
    expect(combined).toContain("summary-only events");
    expect(combined).toContain("rollback guidance");
    expect(combined).toContain("raw output blocking");
    expect(combined).toContain("boundary checks");
    expect(manualQa).toContain("Convert Smoke");
    expect(manualQa).toContain("live proposal generation");
    expect(manualQa).toContain("Approved Apply");
    expect(manualQa).toContain("Verification Lane");
    expect(manualQa).toContain("Event Log / Replay");
    expect(manualQa).toContain("Rollback");
    expect(manualQa).toContain("Stale Conflict");
    expect(manualQa).toContain("Failure Recovery UX");
    expect(manualQa).toContain("Raw Content Absence");
    expect(rcChecklist).toContain("Local Scoped Command Gate");
    expect(rcChecklist).toContain("Full Gates");
    expect(rcChecklist).toContain("Visual Smoke");
    expect(rcChecklist).toContain("GitHub Actions");
    expect(rcChecklist).toContain("Ignored Artifacts");
    expect(rcChecklist).toContain("Tag Command");
    expect(rcChecklist).toContain("Release Command");
    expect(rcChecklist).toContain("Rollback Guidance");
    expect(rcChecklist).toContain("Known Limitations");
    expect(rcChecklist).toContain("Full Docs Path Links");
    expect(releaseNotes).toContain(
      "https://github.com/Mubai0628/DG/blob/v0.15.0-mvp-hardening-recovery-rc.1/docs/mvp-hardening-recovery-manual-qa.md"
    );
    expect(docsIndex).toContain(
      "release-notes-v0.15.0-mvp-hardening-recovery-rc.1.md"
    );
    expect(docsIndex).toContain("mvp-hardening-recovery-manual-qa.md");
    expect(docsIndex).toContain("mvp-hardening-recovery-rc-checklist.md");
    expect(appSource).toContain("Summarizes v0.15 approved apply");
    expect(appSource).toContain("Reconstructs the v0.15 approved proposal");
    expect(appSource).toContain("Replay Write Event (disabled)");
    expect(appSource).toContain("Execute From Timeline (disabled)");
  });
});

describe("app disposable patch apply prototype", () => {
  it("shows disabled-by-default state without app execution", () => {
    const view = buildDisposablePatchApplyView();

    expect(view.source).toBe("app_disposable_patch_apply_disabled");
    expect(view.status).toBe("disabled");
    expect(view.disabledByDefault).toBe(true);
    expect(view.disposableOnly).toBe(true);
    expect(view.runtimeHelperAvailable).toBe(true);
    expect(view.appExecutionConnected).toBe(false);
    expect(view.userWorkspaceMutationEnabled).toBe(false);
    expect(view.applyButtonEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.tauriCommandEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
    expect(view.warningCodes).toEqual(
      expect.arrayContaining([
        "DISPOSABLE_PATCH_SNAPSHOT_CONTRACT_MISSING",
        "DISPOSABLE_PATCH_PROPOSAL_MISSING",
        "DISPOSABLE_PATCH_APP_APPLY_DISABLED"
      ])
    );
  });

  it("summarizes the preview chain while keeping apply disabled", () => {
    const view = buildDisposablePatchApplyView({
      snapshotContract: { contractId: "snapshot-contract-1" },
      patchProposalPreview: { proposalId: "proposal-1" },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      patchVirtualApplyPreview: {
        virtualApplyId: "virtual-1",
        operations: [{ path: "docs/a.md" }]
      },
      patchRollbackCheckpointPreview: { checkpointPreviewId: "checkpoint-1" }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("disabled");
    expect(view.snapshotContractId).toBe("snapshot-contract-1");
    expect(view.proposalId).toBe("proposal-1");
    expect(view.validationId).toBe("validation-1");
    expect(view.auditId).toBe("audit-1");
    expect(view.approvalDraftId).toBe("approval-1");
    expect(view.virtualApplyId).toBe("virtual-1");
    expect(view.checkpointPreviewId).toBe("checkpoint-1");
    expect(view.operationCount).toBe(1);
    expect(view.blockerCount).toBe(0);
    expect(view.warningCodes).toEqual(["DISPOSABLE_PATCH_APP_APPLY_DISABLED"]);
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps App Shell disconnected from disposable patch apply execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "disposable-patch-apply-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Disposable Patch Apply Prototype");
    expect(appSource).toContain(
      "Disabled by default / disposable workspace only"
    );
    expect(appSource).toContain(
      "Runtime helper can write only inside explicit"
    );
    expect(appSource).toContain(
      "disposableRoot. The App Shell cannot apply patches."
    );
    expect(appSource).toContain("Apply to Disposable Workspace (disabled)");
    expect(combined).not.toContain("applyPatchToDisposableWorkspace");
    expect(combined).not.toContain("handleApplyDisposablePatch");
    expect(combined).not.toContain("disposablePatchContent");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("disposable_patch_apply");
  });
});

describe("app approval-gated disposable apply", () => {
  it("shows disabled-by-default state without app apply execution", () => {
    const view = buildApprovalGatedDisposableApplyView();

    expect(view.source).toBe("app_approval_gated_disposable_apply_disabled");
    expect(view.status).toBe("disabled");
    expect(view.disabledByDefault).toBe(true);
    expect(view.disposableOnly).toBe(true);
    expect(view.runtimeHelperAvailable).toBe(true);
    expect(view.appExecutionConnected).toBe(false);
    expect(view.userWorkspaceMutationEnabled).toBe(false);
    expect(view.applyButtonEnabled).toBe(false);
    expect(view.approvalReceiptInputEnabled).toBe(false);
    expect(view.permissionLeaseIssuingEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.tauriCommandEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
    expect(view.warningCodes).toEqual(
      expect.arrayContaining([
        "APPROVAL_GATED_APPLY_SNAPSHOT_CONTRACT_MISSING",
        "APPROVAL_GATED_APPLY_APPROVAL_DRAFT_MISSING",
        "APPROVAL_GATED_APPLY_APP_APPLY_DISABLED"
      ])
    );
  });

  it("maps summary refs without enabling approval receipt input", () => {
    const view = buildApprovalGatedDisposableApplyView({
      snapshotContract: { contractId: "snapshot-1" },
      patchProposalPreview: { proposalId: "proposal-1" },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      patchVirtualApplyPreview: {
        virtualApplyId: "virtual-1",
        operations: [{ operationId: "op-1" }]
      },
      patchRollbackCheckpointPreview: {
        checkpointPreviewId: "checkpoint-1"
      },
      disposablePatchApplyView: buildDisposablePatchApplyView()
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("disabled");
    expect(view.snapshotContractId).toBe("snapshot-1");
    expect(view.proposalId).toBe("proposal-1");
    expect(view.validationId).toBe("validation-1");
    expect(view.auditId).toBe("audit-1");
    expect(view.approvalDraftId).toBe("approval-1");
    expect(view.virtualApplyId).toBe("virtual-1");
    expect(view.checkpointPreviewId).toBe("checkpoint-1");
    expect(view.operationCount).toBe(1);
    expect(view.approvalReceiptInputEnabled).toBe(false);
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("beforeContent");
  });

  it("keeps App Shell disconnected from approval-gated apply execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "approval-gated-disposable-apply-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Approval-Gated Disposable Apply");
    expect(appSource).toContain(
      "Disabled by default / no user workspace apply"
    );
    expect(appSource).toContain("The App Shell cannot execute");
    expect(appSource).toContain("Apply with Approval Gate (disabled)");
    expect(combined).not.toContain("applyWithDisposableApprovalGate");
    expect(combined).not.toContain("applyPatchToDisposableWorkspace");
    expect(combined).not.toContain("approvalReceiptDraft");
    expect(combined).not.toContain("disposableApplyContent");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("approval_gated_disposable_apply");
  });
});

describe("app disposable patch rollback prototype", () => {
  it("shows disabled-by-default state without app rollback execution", () => {
    const view = buildDisposablePatchRollbackView();

    expect(view.source).toBe("app_disposable_patch_rollback_disabled");
    expect(view.status).toBe("disabled");
    expect(view.disabledByDefault).toBe(true);
    expect(view.disposableOnly).toBe(true);
    expect(view.runtimeHelperAvailable).toBe(true);
    expect(view.appExecutionConnected).toBe(false);
    expect(view.userWorkspaceMutationEnabled).toBe(false);
    expect(view.rollbackButtonEnabled).toBe(false);
    expect(view.preimageInputEnabled).toBe(false);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.tauriCommandEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
    expect(view.warningCodes).toEqual(
      expect.arrayContaining([
        "DISPOSABLE_ROLLBACK_SNAPSHOT_CONTRACT_MISSING",
        "DISPOSABLE_ROLLBACK_APPLY_RESULT_MISSING",
        "DISPOSABLE_ROLLBACK_APP_ROLLBACK_DISABLED"
      ])
    );
  });

  it("summarizes the preview chain while keeping rollback disabled", () => {
    const applyView = buildDisposablePatchApplyView({
      snapshotContract: { contractId: "snapshot-contract-1" },
      patchProposalPreview: { proposalId: "proposal-1" },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      patchVirtualApplyPreview: {
        virtualApplyId: "virtual-1",
        operations: [{ path: "docs/a.md" }]
      },
      patchRollbackCheckpointPreview: {
        checkpointPreviewId: "checkpoint-preview-1"
      }
    });
    const view = buildDisposablePatchRollbackView({
      snapshotContract: { contractId: "snapshot-contract-1" },
      disposablePatchApplyView: applyView,
      patchProposalPreview: { proposalId: "proposal-1" },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      patchVirtualApplyPreview: {
        virtualApplyId: "virtual-1",
        operations: [{ path: "docs/a.md" }]
      },
      patchRollbackCheckpointPreview: {
        checkpointPreviewId: "checkpoint-preview-1"
      }
    });
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("disabled");
    expect(view.snapshotContractId).toBe("snapshot-contract-1");
    expect(view.proposalId).toBe("proposal-1");
    expect(view.validationId).toBe("validation-1");
    expect(view.auditId).toBe("audit-1");
    expect(view.approvalDraftId).toBe("approval-1");
    expect(view.virtualApplyId).toBe("virtual-1");
    expect(view.checkpointPreviewId).toBe("checkpoint-preview-1");
    expect(view.operationCount).toBe(1);
    expect(view.warningCodes).toEqual(
      expect.arrayContaining([
        "DISPOSABLE_ROLLBACK_APPLY_RESULT_MISSING",
        "DISPOSABLE_ROLLBACK_APP_ROLLBACK_DISABLED"
      ])
    );
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("preimageContent");
  });

  it("keeps App Shell disconnected from disposable patch rollback execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(appRoot, "src", "disposable-patch-rollback-view.ts"),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Disposable Patch Rollback Prototype");
    expect(appSource).toContain(
      "Disabled by default / disposable workspace only"
    );
    expect(appSource).toMatch(
      /The\s+App\s+Shell\s+does\s+not\s+rollback\s+the\s+user\s+workspace\./
    );
    expect(appSource).toContain("Rollback Disposable Patch (disabled)");
    expect(combined).not.toContain("rollbackDisposablePatchApply");
    expect(combined).not.toContain("handleRollbackDisposablePatch");
    expect(combined).not.toContain("disposableRollbackPreimage");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("EventStore");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("disposable_patch_rollback");
  });
});

describe("app sandbox apply rollback event projection", () => {
  function safeApplyResult(overrides: Record<string, unknown> = {}) {
    return {
      status: "applied_to_disposable",
      applyId: "apply-1",
      disposableRootRef: "disposable-root-ref",
      proposalId: "proposal-1",
      validationId: "validation-1",
      auditId: "audit-1",
      approvalDraftId: "approval-1",
      virtualApplyId: "virtual-1",
      checkpointPreviewId: "checkpoint-preview-1",
      operationCount: 1,
      filesCreated: 1,
      filesUpdated: 0,
      filesDeleted: 0,
      bytesWritten: 12,
      blockerCount: 0,
      warningCount: 0,
      resultHash: "apply-result-hash",
      eventPreview: {
        type: "sandbox.patch_apply.preview_result",
        applyId: "apply-1",
        disposableRootRef: "disposable-root-ref",
        notWritten: true
      },
      readiness: {
        appliedToDisposable: true,
        canApplyToUserWorkspace: false,
        canCommitGit: false,
        canExecuteShell: false
      },
      ...overrides
    };
  }

  function safeRollbackResult(overrides: Record<string, unknown> = {}) {
    return {
      status: "rolled_back_disposable",
      rollbackId: "rollback-1",
      applyId: "apply-1",
      checkpointId: "checkpoint-1",
      disposableRootRef: "disposable-root-ref",
      operationCount: 1,
      filesRestored: 0,
      filesRemoved: 1,
      filesRecreated: 0,
      bytesRestored: 0,
      blockerCount: 0,
      warningCount: 0,
      resultHash: "rollback-result-hash",
      eventPreview: {
        type: "sandbox.patch_rollback.preview_result",
        rollbackId: "rollback-1",
        applyId: "apply-1",
        checkpointId: "checkpoint-1",
        disposableRootRef: "disposable-root-ref",
        notWritten: true
      },
      readiness: {
        rolledBackDisposable: true,
        canRollbackUserWorkspace: false,
        canApplyToUserWorkspace: false,
        canCommitGit: false,
        canExecuteShell: false
      },
      ...overrides
    };
  }

  function safeProjectionView() {
    return buildSandboxApplyRollbackEventProjectionView({
      disposablePatchApplyResult: safeApplyResult(),
      disposablePatchRollbackResult: safeRollbackResult(),
      snapshotContract: {
        contractId: "snapshot-contract-1",
        status: "contract_ready"
      },
      patchProposalPreview: { proposalId: "proposal-1" },
      patchValidationPreview: { validationId: "validation-1" },
      patchDiffAuditPreview: { auditId: "audit-1" },
      patchApprovalDraft: { approvalDraftId: "approval-1" },
      patchVirtualApplyPreview: { virtualApplyId: "virtual-1" },
      patchRollbackCheckpointPreview: { checkpointPreviewId: "checkpoint-1" },
      existingEventSummary: { eventCount: 1 }
    });
  }

  it("shows empty projection state with all execution readiness disabled", () => {
    const view = buildSandboxApplyRollbackEventProjectionView();

    expect(view.source).toBe("empty");
    expect(view.status).toBe("empty");
    expect(view.eventCount).toBe(0);
    expect(view.eventWritesEnabled).toBe(false);
    expect(view.applyExecutionEnabled).toBe(false);
    expect(view.rollbackExecutionEnabled).toBe(false);
    expect(view.userWorkspaceMutationEnabled).toBe(false);
    expect(view.tauriCommandEnabled).toBe(false);
    expect(view.fileReadEnabled).toBe(false);
    expect(view.fileWriteEnabled).toBe(false);
    expect(view.gitExecutionEnabled).toBe(false);
    expect(view.shellExecutionEnabled).toBe(false);
  });

  it("maps apply and rollback summaries into not-written event previews", () => {
    const view = safeProjectionView();
    const serialized = JSON.stringify(view);

    expect(view.status).toBe("projection_ready");
    expect(view.eventCount).toBe(5);
    expect(view.applyEventCount).toBe(2);
    expect(view.rollbackEventCount).toBe(2);
    expect(view.notWrittenEventCount).toBe(5);
    expect(view.eventPreviews.every((event) => event.notWritten)).toBe(true);
    expect(view.readiness.canWriteEventStore).toBe(false);
    expect(view.readiness.canExecuteApply).toBe(false);
    expect(view.readiness.canExecuteRollback).toBe(false);
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawDiff");
    expect(serialized).not.toContain("preimageContent");
  });

  it("places event projection refs into Context Assembly no_compress_zone and Audit summaries", () => {
    const view = safeProjectionView();
    const runDraft = buildRunDraftView({
      objectiveDraft: "Preview sandbox apply rollback event projection.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Summary-only projection exists.",
      workspaceRoot: "D:\\workspaces\\demo"
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      sandboxApplyRollbackEventProjection: view
    });
    const surfaces = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      patchProposalSummaries:
        sandboxApplyRollbackEventProjectionSurfaceSummaries(view),
      futureApprovalRefs: sandboxApplyRollbackEventProjectionApprovalRefs({
        ...view,
        warningCount: 1
      }),
      futureAuditWarningCodes:
        sandboxApplyRollbackEventProjectionWarningCodes(view)
    });

    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceKind === "sandbox_event_projection" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(surfaces.diff.items.map((item) => item.status)).toContain(
      `sandbox_event_projection_${view.status}`
    );
    expect(surfaces.audit.warningCodes).toEqual(
      expect.arrayContaining([
        `SANDBOX_EVENT_PROJECTION_EVENTS_${view.eventCount}`,
        `SANDBOX_EVENT_PROJECTION_NOT_WRITTEN_${view.notWrittenEventCount}`
      ])
    );
    expect(surfaces.approval.items[0]?.summary).toContain("read-only");
  });

  it("keeps App Shell projection local without EventStore, Tauri, filesystem, apply, or rollback execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const adapterSource = await readFile(
      path.join(
        appRoot,
        "src",
        "sandbox-apply-rollback-event-projection-view.ts"
      ),
      "utf8"
    );
    const desktopFlowSource = await readFile(
      path.join(appRoot, "src", "desktop-flow.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${adapterSource}`;

    expect(appSource).toContain("Sandbox Apply / Rollback Event Projection");
    expect(appSource).toContain("Projection only / not written");
    expect(appSource).toContain("Preview Apply/Rollback Events");
    expect(appSource).not.toContain("Write Events</button>");
    expect(appSource).not.toContain("Commit</button>");
    expect(appSource).not.toContain("Execute</button>");
    expect(combined).not.toContain("applyPatchToDisposableWorkspace");
    expect(combined).not.toContain("rollbackDisposablePatchApply");
    expect(combined).not.toContain("handleWriteSandboxEvents");
    expect(adapterSource).not.toContain("safeInvoke");
    expect(adapterSource).not.toContain("readFile");
    expect(adapterSource).not.toContain("writeFile");
    expect(adapterSource).not.toContain("localStorage");
    expect(adapterSource).not.toContain("sessionStorage");
    expect(desktopFlowSource).not.toContain("sandbox.patch_apply");
    expect(desktopFlowSource).not.toContain("sandbox.patch_rollback");
  });
});

describe("desktop source boundaries", () => {
  it("keeps refresh events and docs actions from navigating or resetting UI state", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const agentRouteSource = await readFile(
      path.join(appRoot, "src", "agent-route-preview-view.ts"),
      "utf8"
    );
    const capabilityPlanSource = await readFile(
      path.join(appRoot, "src", "capability-plan-preview-view.ts"),
      "utf8"
    );
    const memoryRecallSource = await readFile(
      path.join(appRoot, "src", "memory-recall-preview-view.ts"),
      "utf8"
    );

    expect(appSource).toContain("Local web-table-to-CSV workflow");
    expect(appSource).toContain("Source-tree mode / Preflight OK");
    expect(appSource).toContain("No native bridge");
    expect(appSource).toContain("workspace/drafts/");
    expect(appSource).toContain(
      "No events yet. Run Convert first, then refresh."
    );
    expect(appSource).toContain("summary-only check of events.jsonl");
    expect(appSource).toContain("docs/desktop-event-log-smoke-v0.1.md");
    expect(appSource).toContain("Local docs path:");
    expect(appSource).toContain("DesktopErrorBoundary");
    expect(appSource).toContain("Reset UI state");
    expect(appSource).toContain("Event log events");
    expect(appSource).toContain("Bridge Proposal Preview (dry)");
    expect(appSource).toContain("Import to Payload Editor");
    expect(appSource).toContain("Reject Proposal");
    expect(appSource).toContain("Disabled - no live bridge is enabled.");
    expect(appSource).toContain("Control Plane Projection");
    expect(appSource).toContain("Read-only projection from event summaries");
    expect(appSource).toContain("No execution is");
    expect(appSource).toContain("buildControlPlaneProjectionView");
    expect(appSource).toContain("Approval / Diff / Audit Surfaces");
    expect(appSource).toMatch(
      /Read-only\.\s+No\s+approval,\s+apply,\s+rollback,\s+commit,\s+or\s+execution\s+controls\./
    );
    expect(appSource).toMatch(/No\s+approval,\s+apply,\s+rollback,\s+commit/);
    expect(appSource).toContain("Approval Surface");
    expect(appSource).toContain("Diff Surface");
    expect(appSource).toContain("Audit Surface");
    expect(appSource).toContain("workbenchSurfaces");
    expect(appSource).toContain("item.pathSummaries");
    expect(appSource).toContain("item.warningCodes");
    expect(appSource).toContain(
      "No patch apply. Raw source and raw diff are not displayed."
    );
    expect(appSource).toContain("Memory Inspector");
    expect(appSource).toContain("memoryInspector");
    expect(appSource).toContain(
      "Read-only skeleton. Not connected to persistence."
    );
    expect(appSource).toContain("not connected to persistence");
    expect(appSource).toContain("Commit gate UI is not enabled");
    expect(appSource).toContain("Chat / Run Canvas");
    expect(appSource).toContain("Draft only. No LLM request is sent.");
    expect(appSource).toContain("No LLM request is sent");
    expect(appSource).toContain("Create Run is disabled.");
    expect(appSource).toContain("Create Run (disabled)");
    expect(appSource).toContain("Preview Draft Run");
    expect(appSource).toContain("Run Draft Preview");
    expect(appSource).toContain("Record Draft Event (local)");
    expect(appSource).toContain("Local-only opt-in.");
    expect(appSource).toContain("recordControlRunDraftEvent");
    expect(appSource).toContain("handleRecordRunDraftEvent");
    expect(appSource).toContain("create or execute a run");
    expect(appSource).toContain("summary-only draft event");
    expect(appSource).toContain("Context Cart / Rules Ledger");
    expect(appSource).toContain("Read-only summary");
    expect(appSource).toContain(
      "Raw prompt and segment content are not displayed."
    );
    expect(appSource).toContain("buildContextCartView");
    expect(appSource).toContain("contextCart");
    expect(appSource).toContain("No context assembly report is connected yet");
    expect(appSource).toContain("Agent Route Preview");
    expect(appSource).toContain("Runtime static router preview");
    expect(appSource).toContain("runtime static router helper");
    expect(appSource).toContain("No agent");
    expect(appSource).toContain("no model request is sent");
    expect(agentRouteSource).toContain("buildStaticAgentRoutePreview");
    expect(appSource).toContain("buildAgentRoutePreviewView");
    expect(appSource).toContain("agentRoutePreview");
    expect(appSource).toContain(
      "Preview a local run draft first. Agent routes will appear here"
    );
    expect(appSource).toContain("Capability Plan Preview");
    expect(appSource).toContain("Runtime Capability Broker preview");
    expect(appSource).toContain("Capability Broker preview helper");
    expect(appSource).toContain("No capability");
    expect(appSource).toContain("permission lease is issued");
    expect(capabilityPlanSource).toContain("buildCapabilityPlanPreview");
    expect(capabilityPlanSource).toContain("runtime_capability_broker_preview");
    expect(appSource).toContain("buildCapabilityPlanPreviewView");
    expect(appSource).toContain("capabilityPlanPreview");
    expect(appSource).toContain("capabilityPlanApprovalRefs");
    expect(appSource).toContain(
      "Preview a local run draft and agent route first"
    );
    expect(appSource).toContain("Memory Recall Preview");
    expect(appSource).toContain("Runtime Memory Core preview");
    expect(appSource).toContain("summary-only memory refs");
    expect(appSource).toContain("runtime Memory Core preview helper");
    expect(appSource).toContain("Recall refs would enter volatile_tail.");
    expect(appSource).toContain("No memory is");
    expect(appSource).toContain("committed or persisted here");
    expect(appSource).toContain("buildMemoryRecallPreviewView");
    expect(appSource).toContain("memoryRecallPreview");
    expect(memoryRecallSource).toContain("buildMemoryRecallPreview");
    expect(memoryRecallSource).toContain("runtime_memory_core_preview");
    expect(memoryRecallSource).not.toContain("safeInvoke");
    expect(memoryRecallSource).not.toContain("EventStore");
    expect(memoryRecallSource).not.toContain("new InMemoryMemoryStore");
    expect(memoryRecallSource).not.toContain("createInMemoryMemoryStore");
    expect(memoryRecallSource).not.toContain("commitCandidate");
    expect(memoryRecallSource).not.toContain("revokeMemory");
    expect(memoryRecallSource).not.toContain("expireMemory");
    expect(appSource).toContain(
      "Preview a local run draft first. Memory recall summaries will"
    );
    expect(appSource).toContain("Workspace Index");
    expect(appSource).toContain("Read-only summary");
    expect(appSource).toContain("Preview Workspace Index");
    expect(appSource).toContain("buildWorkspaceIndexBridgeView");
    expect(appSource).toContain("parseWorkspaceIndexSummaryJson");
    expect(appSource).toContain("handlePreviewWorkspaceIndex");
    expect(appSource).toContain("handleWorkspaceIndexSummaryFile");
    expect(appSource).toContain("Raw file content");
    expect(appSource).toContain("does not crawl the workspace");
    expect(appSource).toContain("No filesystem crawl is performed.");
    expect(appSource).toContain("workspaceIndexBridge");
    expect(appSource).toContain("loadedWorkspaceIndexRef");
    expect(appSource).toContain("displayedRunDraft");
    expect(appSource).toContain("runDraftCandidate");
    expect(appSource).toContain("setRunDraftPreview");
    expect(appSource).toContain("handlePreviewDraftRun");
    expect(appSource).toMatch(
      /Preview\s+only\.\s+No\s+run\s+is\s+created\s+and\s+no\s+LLM\s+request\s+is\s+sent\./
    );
    expect(appSource).toContain("Patch Proposal Creation Preview");
    expect(appSource).toContain("Preview only / no apply");
    expect(appSource).toContain("No files are read or written");
    expect(appSource).toContain("Patch Proposal Validation Preview");
    expect(appSource).toContain("Validation only / no apply");
    expect(appSource).toMatch(
      /Validation\s+passing\s+does\s+not\s+enable\s+apply\./
    );
    expect(appSource).toContain("Patch Diff Audit Preview");
    expect(appSource).toContain("Audit preview / no raw diff");
    expect(appSource).toContain("No raw diff is");
    expect(appSource).toContain("Patch Approval Draft");
    expect(appSource).toContain("Draft only / no approval execution");
    expect(appSource).toContain("No approval, rejection, or lease is issued");
    expect(appSource).toContain("Patch Virtual Apply Preview");
    expect(appSource).toContain("In-memory summary only / no filesystem write");
    expect(appSource).toContain("Patch Rollback Checkpoint Preview");
    expect(appSource).toContain("Checkpoint preview / no real rollback");
    expect(appSource).toMatch(
      /No\s+checkpoint\s+file\s+is\s+written\s+and\s+no\s+rollback\s+is/
    );
    expect(appSource).toContain("Disposable Workspace Snapshot Contract");
    expect(appSource).toContain("Metadata only / no apply");
    expect(appSource).toContain(
      "No disposable workspace is created by the App Shell."
    );
    expect(appSource).toContain("Preview Snapshot Contract");
    expect(appSource).toContain("not a real filesystem path");
    expect(appSource).toContain("Disposable Patch Apply Prototype");
    expect(appSource).toContain(
      "Disabled by default / disposable workspace only"
    );
    expect(appSource).toContain(
      "Runtime helper can write only inside explicit"
    );
    expect(appSource).toContain(
      "disposableRoot. The App Shell cannot apply patches."
    );
    expect(appSource).toContain("Apply to Disposable Workspace (disabled)");
    expect(appSource).toContain("buildDisposablePatchApplyView");
    expect(appSource).toContain("Disposable Patch Rollback Prototype");
    expect(appSource).toContain("Rollback Disposable Patch (disabled)");
    expect(appSource).toMatch(
      /The\s+App\s+Shell\s+does\s+not\s+rollback\s+the\s+user\s+workspace\./
    );
    expect(appSource).toContain("buildDisposablePatchRollbackView");
    expect(appSource).toContain("Sandbox Apply / Rollback Event Projection");
    expect(appSource).toContain("Projection only / not written");
    expect(appSource).toContain("Event previews are not written to");
    expect(appSource).toContain("EventStore");
    expect(appSource).toContain("Approval-Gated Disposable Apply");
    expect(appSource).toContain(
      "Disabled by default / no user workspace apply"
    );
    expect(appSource).toContain(
      "Approval receipt is summary-only and not a PermissionLease."
    );
    expect(appSource).toContain("Apply with Approval Gate (disabled)");
    expect(appSource).toContain("Controlled Creation Replay Projection");
    expect(appSource).toContain("Replay preview / no execution");
    expect(appSource).toContain(
      "No events are written and no action is executed"
    );
    expect(appSource).toMatch(
      /No\s+approval,\s+apply,\s+rollback,\s+commit,\s+or\s+execution\s+controls/
    );
    expect(appSource).toContain(
      "No prompt is assembled and no model request is sent."
    );
    expect(appSource).toMatch(
      /No\s+capability\s+is\s+invoked\s+and\s+no\s+permission\s+lease\s+is\s+issued\./
    );
    expect(appSource).toContain('aria-disabled="true"');
    expect(appSource).toContain("chatRunCanvas");
    expect(appSource).toContain("Objective summary:");
    expect(appSource).toContain("Acceptance preview:");
    expect(appSource).toContain("No live bridge is enabled");
    expect(appSource).toContain("Future extension-to-desktop proposals");
    expect(appSource).toContain("bridgeActionsVisible");
    expect(appSource).toContain('bridgePanel.status === "pending"');
    expect(appSource).toContain("Convert still requires a separate click");
    expect(appSource).not.toContain("Events written");
    expect(appSource).not.toContain("auto approval");
    expect(appSource).not.toContain("Auto Convert");
    expect(appSource).not.toContain("handleApprove");
    expect(appSource).not.toContain("handleApplyUserWorkspace");
    expect(appSource).not.toContain("handleGenericApply");
    expect(appSource).not.toContain("handleExecute");
    expect(appSource).not.toContain("handleCommitMemory");
    expect(appSource).not.toContain("handleRevokeMemory");
    expect(appSource).not.toContain("handleExpireMemory");
    expect(appSource).not.toContain("handleRecallMemory");
    expect(appSource).not.toContain("handleCreateRun");
    expect(appSource).not.toContain("handleSendChat");
    expect(appSource).not.toContain("handleRunCanvas");
    expect(appSource).not.toContain("handleRouteAgent");
    expect(appSource).not.toContain("handleSpawnAgent");
    expect(appSource).not.toContain("handleInvokeCapability");
    expect(appSource).not.toContain("handleIssueLease");
    expect(appSource).not.toContain("Write Events");
    expect(appSource).not.toContain("handleWriteEvents");
    expect(appSource).not.toContain("handleRollbackDisposablePatch");
    expect(appSource).not.toContain("handleCommitSandboxApply");
    expect(appSource).not.toContain("handleDryRunCapability");
    expect(appSource).not.toContain("handleSendToDeepSeek");
    expect(appSource).not.toContain("handleRunGitCommand");
    expect(appSource).not.toContain("handleRunGitWrite");
    expect(appSource).not.toContain("handleGitCommit");
    expect(appSource).not.toContain("handleGitPush");
    expect(appSource).not.toContain("handleRunShell");
    expect(appSource).not.toContain("handleEnableBridge");
    expect(appSource).not.toContain("Send to DeepSeek");
    expect(appSource).not.toContain("Create Run</button>");
    expect(appSource).not.toContain("Run Agent");
    expect(appSource).not.toContain("Execute Agent");
    expect(appSource).not.toContain("Spawn Agent");
    expect(appSource).not.toContain("Send Agent");
    expect(appSource).not.toMatch(/>\s*Invoke Capability\s*</);
    expect(appSource).not.toMatch(/>\s*Issue Lease\s*</);
    expect(appSource).not.toContain("Execute Capability");
    expect(appSource).not.toContain("Apply Patch");
    expect(appSource).not.toMatch(
      />\s*(Apply|Rollback|Commit|Approve|Reject|Execute)\s*</
    );
    expect(appSource).toContain("Run Git Read Lane");
    expect(appSource).not.toContain("Run Git Command");
    expect(appSource).not.toContain("Run Git Write");
    expect(appSource).not.toContain("Run Shell");
    expect(appSource).not.toContain("Enable native bridge");
    expect(appSource).not.toContain("Native bridge enabled");
    expect(appSource).not.toContain("Approve and execute");
    expect(appSource).not.toContain("Memory commit enabled");
    expect(appSource).not.toContain("Memory recall event written");
    expect(appSource).not.toContain("commit_memory_command");
    expect(appSource).not.toContain("revoke_memory_command");
    expect(appSource).not.toContain("expire_memory_command");
    expect(appSource).not.toContain("recall_memory_command");
    expect(appSource).not.toContain("workspace_index_command");
    expect(appSource).not.toContain("scan_workspace_command");
    expect(appSource).not.toContain("crawl_workspace_command");
    expect(appSource).not.toContain("load_workspace_index_summary");
    expect(appSource).not.toContain("new InMemoryMemoryStore");
    expect(appSource).not.toContain("MemoryStore");
    expect(appSource).not.toContain("create_run_command");
    expect(appSource).not.toContain("send_chat_command");
    expect(appSource).not.toContain("run_canvas_command");
    expect(appSource).not.toContain("createControlPlaneRun");
    expect(appSource).not.toContain("createControlPlaneTask");
    expect(appSource).not.toContain("routeAgentTask");
    expect(appSource).not.toContain("planCapabilityInvocation");
    expect(appSource).not.toContain("issuePermissionLease");
    expect(appSource).not.toContain("assemblePrompt");
    expect(appSource).not.toContain("assembleContext");
    expect(appSource).not.toContain("ContextLedger");
    expect(appSource).not.toContain("ContextLedgerV2");
    expect(appSource).not.toContain("PromptAssembler");
    expect(appSource).not.toContain("writeEventStore");
    expect(appSource).not.toContain("appendEventStore");
    expect(appSource).not.toContain("writeEvent(");
    expect(appSource).not.toContain("git_execute_command");
    expect(appSource).not.toContain("shell_execute_command");
    expect(appSource).not.toContain("native_bridge_command");
    expect(appSource).not.toContain(".slice(");
    expect(appSource).not.toContain(
      'href="../docs/desktop-event-log-smoke-v0.1.md"'
    );
    expect(appSource).not.toContain("<a href=");
    expect(appSource).not.toContain("setEventSummary(undefined);");
    expect(appSource).toContain("event.preventDefault();");
    expect(appSource).toContain("event.stopPropagation();");
    expect(appSource).toContain("void refreshEvents();");
    expect(appSource).toContain("await refreshEvents(workspaceRoot);");
    expect(appSource).toContain("[error, eventSummary, preflight, result]");
    expect(appSource).toContain(
      'setDocMessage("docs/desktop-event-log-smoke-v0.1.md")'
    );

    const diffSurfaceSource = appSource.slice(
      appSource.indexOf('aria-label="Diff Surface"'),
      appSource.indexOf('aria-label="Audit Surface"')
    );
    expect(diffSurfaceSource).not.toContain("<button");
    expect(diffSurfaceSource).not.toContain("Apply Patch");
    expect(diffSurfaceSource).not.toContain("Approve");
    expect(diffSurfaceSource).not.toContain("Reject");
    expect(diffSurfaceSource).not.toContain("Execute");
    expect(diffSurfaceSource).not.toContain("Write files");
  });

  it("keeps bridge preview empty state inactive at the visual layer", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const safetySource = await readFile(
      path.join(appRoot, "src", "safety.ts"),
      "utf8"
    );
    const styles = await readFile(
      path.join(appRoot, "src", "styles.css"),
      "utf8"
    );

    expect(safetySource).toContain('status: "disabled"');
    expect(safetySource).toContain(
      "Future extension-to-desktop proposals will appear here for preview."
    );
    expect(appSource).toContain("bridgeActionsVisible ? (");
    expect(appSource).toContain('bridgePanel.status === "pending"');
    expect(appSource).toContain("aria-disabled={bridgePanel.importDisabled}");
    expect(appSource).toContain("aria-disabled={bridgePanel.rejectDisabled}");
    expect(
      appSource.indexOf("setPayloadText(decision.payloadText)")
    ).toBeGreaterThan(appSource.indexOf("if (bridgePreview === undefined)"));
    expect(styles).toMatch(
      /\.secondary:disabled\s*{[^}]*cursor:\s*not-allowed;/s
    );
    expect(styles).not.toMatch(
      /\.secondary:disabled\s*{[^}]*cursor:\s*(wait|progress);/s
    );
  });

  it("does not include native bridge or arbitrary shell plugin references in app source", async () => {
    const sourceFiles = [
      "src/App.tsx",
      "src/desktop-flow.ts",
      "src/safety.ts",
      "src/control-plane-view.ts",
      "src/workbench-surfaces.ts",
      "src/patch-proposal-surface-view.ts",
      "src/memory-inspector-view.ts",
      "src/memory-recall-preview-view.ts",
      "src/workspace-index-bridge-view.ts",
      "src/chat-run-canvas-view.ts",
      "src/run-draft-view.ts",
      "src/run-draft-event-view.ts",
      "src/context-cart-view.ts",
      "src/agent-route-preview-view.ts",
      "src/capability-plan-preview-view.ts",
      "scripts/preflight.mjs",
      "scripts/run-flow.mjs",
      "src-tauri/src/main.rs",
      "src-tauri/src/commands.rs",
      "src-tauri/tauri.conf.json",
      "src-tauri/capabilities/default.json"
    ];
    const sources = await Promise.all(
      sourceFiles.map(async (file) => ({
        file,
        text: await readFile(path.join(appRoot, file), "utf8")
      }))
    );
    const combined = sources.map((source) => source.text).join("\n");
    const nonCommandSource = sources
      .filter((source) => source.file !== "src-tauri/src/commands.rs")
      .map((source) => source.text)
      .join("\n");
    const commandSource = sources.find(
      (source) => source.file === "src-tauri/src/commands.rs"
    )?.text;

    expect(combined).not.toContain("nativeMessaging");
    expect(combined).not.toContain("@tauri-apps/plugin-shell");
    expect(combined).not.toContain("Command::new(command");
    expect(nonCommandSource).not.toContain("localStorage");
    expect(nonCommandSource).not.toContain("sessionStorage");
    expect(combined).not.toContain("shell:allow");
    expect(combined).not.toContain("approve_surface_command");
    expect(combined).not.toContain("apply_patch_command");
    expect(combined).not.toContain("execute_surface_command");
    expect(combined).toContain(".current_dir(cwd)");
    expect(combined).toContain(".args(args)");
    expect(combined).toContain("env_clear()");
    expect(combined).toContain("sanitize_env_vars");
    expect(combined).toContain("RUNNER_TIMEOUT");
    expect(combined).toContain('join("run-flow.mjs")');
    expect(commandSource).toContain("LOCAL_STORAGE_MARKER");
    expect(commandSource).toContain("SESSION_STORAGE_MARKER");
  });

  it("keeps desktop QA docs and RC copy aligned with safety boundaries", async () => {
    const docs = await Promise.all(
      [
        "desktop-manual-qa-v0.1.md",
        "desktop-rc-checklist-v0.1.md",
        "desktop-troubleshooting-v0.1.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("nativeMessaging");
    expect(combined).toContain("desktop action");
    expect(combined).toContain("raw browser DOM");
    expect(combined).toContain("raw CSV");
    expect(combined).toContain("MCP");
    expect(combined).toContain("No `nativeMessaging`");
    expect(combined).toContain("API keys");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain(
      "Get-Content D:\\workspaces\\demo\\.deepseek-workbench\\events.jsonl -TotalCount 5"
    );
    expect(combined).not.toMatch(/fully standalone packaged runner is ready/i);
    expect(combined).not.toMatch(
      /automatic extension-to-app bridge is supported/i
    );
  });

  it("documents bridge transport choice and implementation gate without enabling transport", async () => {
    const docs = await Promise.all(
      [
        "adr/0003-bridge-transport-choice.md",
        "bridge-implementation-gate-v0.1.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("Native Messaging");
    expect(combined).toMatch(/localhost loopback HTTP/i);
    expect(combined).toMatch(/local drop folder/i);
    expect(combined).toMatch(/custom URL protocol/i);
    expect(combined).toContain("manual import");
    expect(combined).toContain("Recommended Next Implementation Path");
    expect(combined).toContain("No auto Convert");
    expect(combined).toContain("No file write from bridge");
    expect(combined).toContain("Boundary checker updated");
    expect(combined).toContain("Rollback Strategy");
    expect(combined).toContain("adr/0003-bridge-transport-choice.md");
    expect(combined).toContain("bridge-implementation-gate-v0.1.md");
    expect(combined).toContain("localhost server enabled by default");
    expect(combined).not.toMatch(/localhost server is supported/i);
    expect(combined).not.toMatch(/automatic Convert is supported/i);
  });

  it("documents app approval diff audit surfaces as read-only skeletons", async () => {
    const docs = await Promise.all(
      ["app-shell-approval-diff-audit-surfaces-v0.2.md", "README.md"].map(
        async (file) => ({
          file,
          text: await readFile(path.join(repoRoot, "docs", file), "utf8")
        })
      )
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("read-only skeleton");
    expect(combined).toMatch(/do not execute any side\s+effect/);
    expect(combined).toContain(
      "There are no approve or reject execution controls"
    );
    expect(combined).toContain("does not apply patches");
    expect(combined).toContain("Git execution");
    expect(combined).toContain("shell execution");
    expect(combined).toContain("real DeepSeek calls");
    expect(combined).toContain(
      "app-shell-approval-diff-audit-surfaces-v0.2.md"
    );
  });

  it("documents app memory inspector as a read-only skeleton", async () => {
    const docs = await Promise.all(
      ["app-shell-memory-inspector-v0.2.md", "README.md"].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("read-only skeleton");
    expect(combined).toContain("not connected to desktop persistence");
    expect(combined).toContain("policy");
    expect(combined).toContain("project_fact");
    expect(combined).toContain("pitfall");
    expect(combined).toContain("There are no commit");
    expect(combined).toContain("No persistent database");
    expect(combined).toContain("No vector database");
    expect(combined).toContain("No real DeepSeek calls");
    expect(combined).toContain("No raw memory content display");
    expect(combined).toContain("app-shell-memory-inspector-v0.2.md");
  });

  it("documents app chat run canvas as draft-only and non-executing", async () => {
    const docs = await Promise.all(
      ["app-shell-chat-run-canvas-v0.2.md", "README.md"].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("draft-only skeleton");
    expect(combined).toContain("does not send chat requests");
    expect(combined).toContain("No LLM request is sent");
    expect(combined).toContain("No run is created");
    expect(combined).toContain("not written to EventStore");
    expect(combined).toContain("localStorage");
    expect(combined).toContain("sessionStorage");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No patch, Git, or shell execution");
    expect(combined).toContain("app-shell-chat-run-canvas-v0.2.md");
  });

  it("documents app run draft as local preview only", async () => {
    const docs = await Promise.all(
      ["app-shell-run-draft-v0.2.md", "README.md"].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("App Shell Run Draft v0.2");
    expect(combined).toContain("local-only Control Plane run preview");
    expect(combined).toContain("local_draft");
    expect(combined).toContain("preview_only");
    expect(combined).toContain("No real ControlPlaneRun is created");
    expect(combined).toContain("No EventStore entry is written");
    expect(combined).toContain("No Tauri command is added or invoked");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain(
      "No agent, capability, patch, Git, or shell execution"
    );
    expect(combined).toContain("No persistence is used");
    expect(combined).toContain("localStorage");
    expect(combined).toContain("sessionStorage");
    expect(combined).toContain("warning codes only");
    expect(combined).toContain("Workspace Index");
    expect(combined).toContain("Patch Proposal UI Bridge");
    expect(combined).toContain("Agent Dossier");
    expect(combined).toContain("Capability Broker");
    expect(combined).toContain("app-shell-run-draft-v0.2.md");
  });

  it("documents app context cart as read-only and summary-only", async () => {
    const docs = await Promise.all(
      ["app-shell-context-cart-v0.2.md", "README.md"].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("App Shell Context Cart v0.2");
    expect(combined).toContain("read-only visualization");
    expect(combined).toContain("immutable_rules");
    expect(combined).toContain("workspace_rules");
    expect(combined).toContain("task_contract");
    expect(combined).toContain("session_working_set");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("raw prompt text");
    expect(combined).toContain("raw segment content");
    expect(combined).toContain("warning codes only");
    expect(combined).toContain("frozen prefix");
    expect(combined).toContain("volatile tail");
    expect(combined).toContain("no-compress zone");
    expect(combined).toContain("No model call");
    expect(combined).toContain("No prompt assembly");
    expect(combined).toContain("No EventStore writes");
    expect(combined).toContain("No persistent context store");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("app-shell-context-cart-v0.2.md");
  });

  it("documents app agent route preview as preview-only", async () => {
    const docs = await Promise.all(
      ["app-shell-agent-route-preview-v0.2.md", "README.md"].map(
        async (file) => ({
          file,
          text: await readFile(path.join(repoRoot, "docs", file), "utf8")
        })
      )
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("App Shell Agent Route Preview v0.2");
    expect(combined).toContain("fixed roles before dynamic bidding");
    expect(combined).toContain("orchestrator -> verifier");
    expect(combined).toContain("orchestrator -> coder -> reviewer -> verifier");
    expect(combined).toContain("deepseek-v4-pro");
    expect(combined).toContain("deepseek-v4-flash");
    expect(combined).toContain("capability ids as refs only");
    expect(combined).toContain("raw objective text");
    expect(combined).toContain("warning codes only");
    expect(combined).toContain("No dynamic bidding");
    expect(combined).toContain("No real multi-agent execution");
    expect(combined).toContain("No model request");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No patch, Git, or shell execution");
    expect(combined).toContain("app-shell-agent-route-preview-v0.2.md");
  });

  it("documents runtime static agent route preview helper as pure preview-only", async () => {
    const docs = await Promise.all(
      ["runtime-static-agent-route-preview-v0.3.md", "README.md"].map(
        async (file) => ({
          file,
          text: await readFile(path.join(repoRoot, "docs", file), "utf8")
        })
      )
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("Runtime Static Agent Route Preview v0.3");
    expect(combined).toContain("pure runtime static router preview helper");
    expect(combined).toContain("runtime_static_router_preview");
    expect(combined).toContain("orchestrator -> verifier");
    expect(combined).toContain("orchestrator -> coder -> reviewer -> verifier");
    expect(combined).toContain("No dynamic bidding");
    expect(combined).toContain("No agent execution");
    expect(combined).toContain("No model call");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("runtime-static-agent-route-preview-v0.3.md");
  });

  it("documents app capability plan preview as planning-only", async () => {
    const docs = await Promise.all(
      [
        "app-shell-capability-plan-preview-v0.2.md",
        "runtime-capability-plan-preview-v0.3.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("App Shell Capability Plan Preview v0.2");
    expect(combined).toContain("Runtime Capability Plan Preview v0.3");
    expect(combined).toContain("pure runtime Capability Broker preview helper");
    expect(combined).toContain("runtime-capability-plan-preview-v0.3.md");
    expect(combined).toContain("planning-only");
    expect(combined).toContain("descriptor-style capability needs");
    expect(combined).toContain("does not invoke tools");
    expect(combined).toContain("does not issue permission leases");
    expect(combined).toContain("native.workspace.index");
    expect(combined).toContain("native.fs.write_draft");
    expect(combined).toContain("native.patch.apply` as disabled");
    expect(combined).toContain("native.git.commit_draft` as disabled");
    expect(combined).toContain("shell descriptors remain disabled");
    expect(combined).toContain("Approval Surface");
    expect(combined).toContain("No capability execution");
    expect(combined).toContain("No permission lease issuing");
    expect(combined).toContain("No real dry-run execution");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No patch, Git, or shell execution");
    expect(combined).toContain("app-shell-capability-plan-preview-v0.2.md");
  });

  it("documents patch proposal creation preview as no-apply summary-only", async () => {
    const docs = await Promise.all(
      [
        "app-shell-patch-proposal-creation-preview-v0.3.md",
        "runtime-patch-proposal-creation-preview-v0.3.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain(
      "App Shell Patch Proposal Creation Preview v0.3"
    );
    expect(combined).toContain("Runtime Patch Proposal Creation Preview v0.3");
    expect(combined).toContain("preview only");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No filesystem read or write");
    expect(combined).toContain(
      "No raw source, raw diff, or patch body display"
    );
    expect(combined).toContain("summary-only path refs");
    expect(combined).toContain("Patch and Diff Audit");
    expect(combined).toContain("Diff Surface");
    expect(combined).toContain("Approval Surface");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain("Capability Plan Preview");
    expect(combined).toContain("proposal validation");
    expect(combined).toContain("explicit approval");
    expect(combined).toContain("virtual apply");
    expect(combined).toContain("real apply");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain(
      "app-shell-patch-proposal-creation-preview-v0.3.md"
    );
    expect(combined).toContain(
      "runtime-patch-proposal-creation-preview-v0.3.md"
    );
  });

  it("documents patch proposal validation preview as validation-only and no-apply", async () => {
    const docs = await Promise.all(
      [
        "app-shell-patch-proposal-validation-preview-v0.4.md",
        "runtime-patch-proposal-validation-preview-v0.4.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const combined = `${docs.map((doc) => doc.text).join("\n")}\n${appReadme}`;

    expect(combined).toContain("Patch Proposal Validation Preview");
    expect(combined).toContain("validation preview only");
    expect(combined).toContain("no apply");
    expect(combined).toContain("No filesystem read or write");
    expect(combined).toContain("no raw source/diff display");
    expect(combined).toContain("path/schema/risk/approval/readiness");
    expect(combined).toContain("Patch Proposal Creation Preview");
    expect(combined).toContain("Diff Audit Preview");
    expect(combined).toContain("Approval Gate Draft");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain(
      "runtime-patch-proposal-validation-preview-v0.4.md"
    );
    expect(combined).toContain(
      "app-shell-patch-proposal-validation-preview-v0.4.md"
    );
  });

  it("documents patch diff audit preview as no-raw-diff and no-apply", async () => {
    const docs = await Promise.all(
      [
        "app-shell-patch-diff-audit-preview-v0.4.md",
        "runtime-patch-diff-audit-preview-v0.4.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const combined = `${docs.map((doc) => doc.text).join("\n")}\n${appReadme}`;

    expect(combined).toContain("Patch Diff Audit Preview");
    expect(combined).toContain("without generating a raw diff");
    expect(combined).toContain("no patch apply");
    expect(combined).toContain("no virtual apply");
    expect(combined).toContain("no filesystem read or write");
    expect(combined).toContain("no EventStore write");
    expect(combined).toContain("Approval Gate Draft");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("runtime-patch-diff-audit-preview-v0.4.md");
    expect(combined).toContain("app-shell-patch-diff-audit-preview-v0.4.md");
  });

  it("documents app and runtime patch approval draft as no approval execution", async () => {
    const docs = await Promise.all(
      [
        "runtime-patch-approval-draft-v0.4.md",
        "app-shell-patch-approval-draft-v0.4.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const combined = `${docs.map((doc) => doc.text).join("\n")}\n${appReadme}`;

    expect(combined).toContain("Patch Approval Draft");
    expect(combined).toContain("approval draft");
    expect(combined).toContain("no approval execution");
    expect(combined).toContain("no reject execution");
    expect(combined).toContain("no PermissionLease issuing");
    expect(combined).toContain("no patch apply");
    expect(combined).toContain("no virtual apply");
    expect(combined).toContain("no filesystem read or write");
    expect(combined).toContain("no EventStore write");
    expect(combined).toContain("no raw source");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("runtime-patch-approval-draft-v0.4.md");
    expect(combined).toContain("app-shell-patch-approval-draft-v0.4.md");
  });

  it("documents app and runtime patch virtual apply preview as in-memory and no-apply", async () => {
    const docs = await Promise.all(
      [
        "runtime-patch-virtual-apply-preview-v0.4.md",
        "app-shell-patch-virtual-apply-preview-v0.4.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const combined = `${docs.map((doc) => doc.text).join("\n")}\n${appReadme}`;

    expect(combined).toContain("Patch Virtual Apply Preview");
    expect(combined).toContain("in-memory");
    expect(combined).toContain("summary-only");
    expect(combined).toMatch(/no filesystem read/i);
    expect(combined).toMatch(/no filesystem write/i);
    expect(combined).toMatch(/no real rollback/i);
    expect(combined).toMatch(/no patch apply/i);
    expect(combined).toContain("raw source");
    expect(combined).toContain("raw diff");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("runtime-patch-virtual-apply-preview-v0.4.md");
    expect(combined).toContain("app-shell-patch-virtual-apply-preview-v0.4.md");
  });

  it("documents app and runtime patch rollback checkpoint preview as metadata-only and no-rollback", async () => {
    const docs = await Promise.all(
      [
        "runtime-patch-rollback-checkpoint-preview-v0.4.md",
        "app-shell-patch-rollback-checkpoint-preview-v0.4.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const combined = `${docs.map((doc) => doc.text).join("\n")}\n${appReadme}`;

    expect(combined).toContain("Patch Rollback Checkpoint Preview");
    expect(combined).toContain("metadata-only");
    expect(combined).toMatch(/no checkpoint file write/i);
    expect(combined).toMatch(/no filesystem read/i);
    expect(combined).toMatch(/no filesystem write/i);
    expect(combined).toMatch(/no real rollback/i);
    expect(combined).toMatch(/no patch apply/i);
    expect(combined).toContain("raw source");
    expect(combined).toContain("raw diff");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain(
      "runtime-patch-rollback-checkpoint-preview-v0.4.md"
    );
    expect(combined).toContain(
      "app-shell-patch-rollback-checkpoint-preview-v0.4.md"
    );
  });

  it("documents app and runtime controlled creation replay projection as summary-only and no-execution", async () => {
    const docs = await Promise.all(
      [
        "runtime-controlled-creation-replay-projection-v0.4.md",
        "app-shell-controlled-creation-replay-projection-v0.4.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const combined = `${docs.map((doc) => doc.text).join("\n")}\n${appReadme}`;

    expect(combined).toContain("Controlled Creation Replay Projection");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("Replay preview / no execution");
    expect(combined).toMatch(/no EventStore write/i);
    expect(combined).toMatch(/no real ControlPlaneRun creation or execution/i);
    expect(combined).toMatch(/no patch apply/i);
    expect(combined).toMatch(/no real rollback/i);
    expect(combined).toContain("raw source");
    expect(combined).toContain("raw diff");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain(
      "runtime-controlled-creation-replay-projection-v0.4.md"
    );
    expect(combined).toContain(
      "app-shell-controlled-creation-replay-projection-v0.4.md"
    );
  });

  it("documents app and runtime memory recall preview as volatile-tail preview only", async () => {
    const docs = await Promise.all(
      [
        "app-shell-memory-recall-preview-v0.2.md",
        "runtime-memory-recall-preview-v0.3.md",
        "README.md"
      ].map(async (file) => ({
        file,
        text: await readFile(path.join(repoRoot, "docs", file), "utf8")
      }))
    );
    const combined = docs.map((doc) => doc.text).join("\n");

    expect(combined).toContain("App Shell Memory Recall Preview v0.2");
    expect(combined).toContain("Runtime Memory Recall Preview v0.3");
    expect(combined).toContain("pure, browser-safe summary helper");
    expect(combined).toContain("in-memory memory summaries");
    expect(combined).toContain("runtime_memory_core_preview");
    expect(combined).toContain("preview-only");
    expect(combined).toContain("does not connect the desktop shell to memory");
    expect(combined).toContain("policy`, `project_fact`, and `pitfall");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("do not enter frozen prefix");
    expect(combined).toContain("No MemoryStore persistence connection");
    expect(combined).toContain("No persistent DB");
    expect(combined).toContain("No vector DB");
    expect(combined).toContain("No memory commit, revoke, or expire UI");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No prompt assembly");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("app-shell-memory-recall-preview-v0.2.md");
    expect(combined).toContain("runtime-memory-recall-preview-v0.3.md");
  });

  it("documents the v0.2 App Shell RC release notes without enabling execution", async () => {
    const docs = await Promise.all(
      ["release-notes-v0.2.0-app-shell-rc.1.md", "README.md"].map(
        async (file) => ({
          file,
          text: await readFile(path.join(repoRoot, "docs", file), "utf8")
        })
      )
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${docs.map((doc) => doc.text).join("\n")}\n${rootReadme}`;

    expect(combined).toContain("v0.2.0-app-shell-rc.1");
    expect(combined).toContain("v0.2 Control Plane foundation");
    expect(combined).toContain("Model capability profiles");
    expect(combined).toContain("Rules Ledger v2");
    expect(combined).toContain("Capability Broker v2 skeleton");
    expect(combined).toContain("Agent Dossier static router");
    expect(combined).toContain("Memory Core v1");
    expect(combined).toContain("Patch/Diff Audit foundation");
    expect(combined).toContain("Git Safe Lanes");
    expect(combined).toContain("Shell Allowlist");
    expect(combined).toContain("Control Plane Task/Run skeleton");
    expect(combined).toContain("App Shell Chat / Run Canvas");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("No real chat or LLM execution");
    expect(combined).toContain("No real control-plane run creation");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No MCP, plugin, or skills runtime");
    expect(combined).toContain("No `nativeMessaging`");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("release-notes-v0.2.0-app-shell-rc.1.md");
  });

  it("documents the v0.2 App Shell manual QA flow", async () => {
    const qaDoc = await readFile(
      path.join(repoRoot, "docs", "app-shell-v0.2-manual-qa.md"),
      "utf8"
    );

    expect(qaDoc).toContain("pnpm verify:ci");
    expect(qaDoc).toContain("pnpm release:smoke");
    expect(qaDoc).toContain("pnpm app:qa:check");
    expect(qaDoc).toContain("git status --short");
    expect(qaDoc).toContain("pnpm app:dev");
    expect(qaDoc).toContain("D:\\workspaces\\demo");
    expect(qaDoc).toContain("web-table-export-v02.csv");
    expect(qaDoc).toContain("Chat / Run Canvas");
    expect(qaDoc).toContain("Control Plane Projection");
    expect(qaDoc).toContain("Approval Surface");
    expect(qaDoc).toContain("Diff Surface");
    expect(qaDoc).toContain("Audit Surface");
    expect(qaDoc).toContain("Memory Inspector");
    expect(qaDoc).toContain("Bridge Proposal Preview");
    expect(qaDoc).toContain("Refresh events");
    expect(qaDoc).toContain("FILE_EXISTS");
    expect(qaDoc).toContain("PASSWORD_VALUE_MARKER");
    expect(qaDoc).toContain("No DeepSeek chat execution");
    expect(qaDoc).toContain("No patch, Git, or shell execution");
    expect(qaDoc).toContain("No native bridge");
  });

  it("documents the v0.2 App Shell RC checklist and generated artifact boundaries", async () => {
    const checklist = await readFile(
      path.join(repoRoot, "docs", "app-shell-v0.2-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");

    expect(checklist).toContain("pnpm verify:ci");
    expect(checklist).toContain("pnpm release:smoke");
    expect(checklist).toContain("pnpm app:qa:check");
    expect(checklist).toContain("GitHub Actions");
    expect(checklist).toContain("v0.2.0-app-shell-rc.1");
    expect(checklist).toContain("runtime/dist/");
    expect(checklist).toContain("browser-extension/dist/");
    expect(checklist).toContain("app/src-tauri/target/");
    expect(checklist).toContain("No real chat or LLM execution");
    expect(checklist).toContain("No `nativeMessaging` or live bridge");
    expect(checklist).toContain("release-notes-v0.2.0-app-shell-rc.1.md");
    expect(docsIndex).toContain("release-notes-v0.2.0-app-shell-rc.1.md");
    expect(docsIndex).toContain("app-shell-v0.2-manual-qa.md");
    expect(docsIndex).toContain("app-shell-v0.2-rc-checklist.md");
    expect(appReadme).toContain("draft-only, read-only, preview-only, or");
    expect(appReadme).toContain("planning-only summaries");
    expect(appReadme).toContain(
      "no real DeepSeek chat, autonomous coding loop, run creation"
    );
  });

  it("documents the v0.3 coding workflow preview RC without enabling execution", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.3.0-coding-workflow-preview-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "app-shell-coding-workflow-manual-qa.md"),
      "utf8"
    );
    const checklist = await readFile(
      path.join(repoRoot, "docs", "app-shell-coding-workflow-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${releaseNotes}\n${manualQa}\n${checklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(combined).toContain("v0.3.0-coding-workflow-preview-rc.1");
    expect(combined).toContain(
      "Coding workflow preview surfaces, no execution"
    );
    expect(combined).toContain("P0F control-plane foundation");
    expect(combined).toContain("Workspace Read / Index skeleton");
    expect(combined).toContain("Patch Proposal UI Bridge");
    expect(combined).toContain("local Run Draft Preview");
    expect(combined).toContain("Context Cart / Rules Ledger visualization");
    expect(combined).toContain("Agent Route Preview");
    expect(combined).toContain("Capability Plan Preview");
    expect(combined).toContain("Memory Recall Preview");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("No real DeepSeek chat");
    expect(combined).toContain("No real ControlPlaneRun creation from UI");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No PermissionLease issuance");
    expect(combined).toContain("No memory commit, revoke, or expire UI");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No `nativeMessaging` or live bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("pnpm app:dev");
    expect(combined).toContain("D:\\workspaces\\demo");
    expect(combined).toContain("web-table-export-p0g.csv");
    expect(combined).toContain("FILE_EXISTS");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain(
      "release-notes-v0.3.0-coding-workflow-preview-rc.1.md"
    );
    expect(combined).toContain("app-shell-coding-workflow-manual-qa.md");
    expect(combined).toContain("app-shell-coding-workflow-rc-checklist.md");
  });

  it("documents the v0.4 controlled creation preview RC without enabling execution", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.4.0-controlled-creation-preview-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "app-shell-controlled-creation-manual-qa.md"),
      "utf8"
    );
    const checklist = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-controlled-creation-rc-checklist.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${releaseNotes}\n${manualQa}\n${checklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(combined).toContain("v0.4.0-controlled-creation-preview-rc.1");
    expect(combined).toContain(
      "Controlled creation preview, summary-only side effects"
    );
    expect(combined).toContain("v0.3 coding workflow preview surfaces");
    expect(combined).toContain("Workspace Index summary bridge");
    expect(combined).toContain("Run Draft summary event");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain("runtime static Agent Route Preview helper");
    expect(combined).toContain("runtime Capability Plan Preview helper");
    expect(combined).toContain("Patch Proposal Creation Preview");
    expect(combined).toContain("runtime Memory Recall Preview helper");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain("one summary-only local draft event");
    expect(combined).toContain("No real DeepSeek chat");
    expect(combined).toContain("No real ControlPlaneRun execution");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No PermissionLease issuance");
    expect(combined).toContain("No memory commit, revoke, or expire UI");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No `nativeMessaging` or live bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("pnpm app:dev");
    expect(combined).toContain("D:\\workspaces\\demo");
    expect(combined).toContain("web-table-export-p0h.csv");
    expect(combined).toContain("FILE_EXISTS");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain(
      "release-notes-v0.4.0-controlled-creation-preview-rc.1.md"
    );
    expect(combined).toContain("app-shell-controlled-creation-manual-qa.md");
    expect(combined).toContain("app-shell-controlled-creation-rc-checklist.md");
  });

  it("documents the v0.5 validation approval virtual apply preview RC without enabling execution", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.5.0-validation-approval-virtual-apply-preview-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-validation-approval-virtual-apply-manual-qa.md"
      ),
      "utf8"
    );
    const checklist = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-validation-approval-virtual-apply-rc-checklist.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${releaseNotes}\n${manualQa}\n${checklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(combined).toContain(
      "v0.5.0-validation-approval-virtual-apply-preview-rc.1"
    );
    expect(combined).toContain(
      "Validation, approval, and virtual-apply previews, no execution"
    );
    expect(combined).toContain("Patch Proposal Validation Preview");
    expect(combined).toContain("Patch Diff Audit Preview");
    expect(combined).toContain("Patch Approval Draft");
    expect(combined).toContain("Patch Virtual Apply Preview");
    expect(combined).toContain("Patch Rollback Checkpoint Preview");
    expect(combined).toContain("Controlled Creation Replay Projection");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain("local summary-event write path");
    expect(combined).toContain("No real DeepSeek chat");
    expect(combined).toContain("No real ControlPlaneRun execution");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No filesystem write");
    expect(combined).toContain("No real rollback");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No PermissionLease issuance");
    expect(combined).toContain("No memory commit, revoke, or expire UI");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No `nativeMessaging` or live bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("pnpm app:dev");
    expect(combined).toContain("D:\\workspaces\\demo");
    expect(combined).toContain("web-table-export-p0i.csv");
    expect(combined).toContain("FILE_EXISTS");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain(
      "release-notes-v0.5.0-validation-approval-virtual-apply-preview-rc.1.md"
    );
    expect(combined).toContain(
      "app-shell-validation-approval-virtual-apply-manual-qa.md"
    );
    expect(combined).toContain(
      "app-shell-validation-approval-virtual-apply-rc-checklist.md"
    );
  });

  it("documents the v0.6 sandbox apply preview RC without enabling App execution", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.6.0-sandbox-apply-preview-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "app-shell-sandbox-apply-manual-qa.md"),
      "utf8"
    );
    const checklist = await readFile(
      path.join(repoRoot, "docs", "app-shell-sandbox-apply-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${releaseNotes}\n${manualQa}\n${checklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(combined).toContain("v0.6.0-sandbox-apply-preview-rc.1");
    expect(combined).toContain(
      "Sandboxed disposable apply and rollback prototypes"
    );
    expect(combined).toContain("App execution");
    expect(combined).toContain("v0.5 validation / approval / virtual apply");
    expect(combined).toContain("P0J sandbox strategy ADR");
    expect(combined).toContain("Disposable Workspace Snapshot Contract");
    expect(combined).toContain("Disposable Patch Apply Prototype");
    expect(combined).toContain("Disposable Patch Rollback Prototype");
    expect(combined).toContain("Apply / Rollback Event Projection");
    expect(combined).toContain("Approval-Gated Disposable Apply");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toMatch(/explicit\s+disposableRoot/);
    expect(combined).toContain("App Shell does not execute apply or rollback");
    expect(combined).toContain("No real DeepSeek chat");
    expect(combined).toContain("No real ControlPlaneRun execution");
    expect(combined).toContain("No user workspace patch apply");
    expect(combined).toContain("No App-side patch apply");
    expect(combined).toContain("No App-side rollback");
    expect(combined).toContain("No Git commit or push");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No PermissionLease issuance");
    expect(combined).toContain("No memory commit, revoke, or expire UI");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No `nativeMessaging` or live bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toMatch(/[Cc]anonical\s+path\s+guard/);
    expect(combined).toContain("Symlink, junction, and reparse point");
    expect(combined).toContain("notWritten: true");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("pnpm app:dev");
    expect(combined).toContain("D:\\workspaces\\demo");
    expect(combined).toContain("web-table-export-p0j.csv");
    expect(combined).toContain("FILE_EXISTS");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain(
      "release-notes-v0.6.0-sandbox-apply-preview-rc.1.md"
    );
    expect(combined).toContain("app-shell-sandbox-apply-manual-qa.md");
    expect(combined).toContain("app-shell-sandbox-apply-rc-checklist.md");
  });

  it("documents the v0.7 user workspace apply preview RC without enabling App execution", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.7.0-user-workspace-apply-preview-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-user-workspace-apply-manual-qa.md"
      ),
      "utf8"
    );
    const checklist = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-user-workspace-apply-rc-checklist.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${releaseNotes}\n${manualQa}\n${checklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(combined).toContain("v0.7.0-user-workspace-apply-preview-rc.1");
    expect(combined).toContain(
      "User workspace apply/rollback runtime prototypes"
    );
    expect(combined).toContain(
      "v0.6 sandbox disposable apply/rollback prototypes"
    );
    expect(combined).toContain("P0K user workspace apply promotion ADR");
    expect(combined).toContain("User Workspace Snapshot / Backup Contract");
    expect(combined).toContain("Promotion Readiness Checker");
    expect(combined).toContain("User Workspace Apply Prototype");
    expect(combined).toContain("User Workspace Rollback Prototype");
    expect(combined).toContain("Runtime Apply/Rollback EventStore Writer");
    expect(combined).toContain("App Approval Execution Design");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain("explicit fixture roots");
    expect(combined).toContain("summary-only apply/rollback events");
    expect(combined).toContain(
      "App Shell does not execute apply, rollback, event write, approval execution"
    );
    expect(combined).toContain("No real DeepSeek chat");
    expect(combined).toContain("No real ControlPlaneRun execution");
    expect(combined).toContain("No App-side user workspace patch apply");
    expect(combined).toContain("No App-side rollback");
    expect(combined).toContain("No App-side apply/rollback EventStore write");
    expect(combined).toContain("No Git commit or push");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No production PermissionLease issuance");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No `nativeMessaging` or live bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("Runtime explicit fixture root only");
    expect(combined).toMatch(/[Cc]anonical\s+path\s+guard/);
    expect(combined).toContain("Symlink, junction, and reparse point");
    expect(combined).toContain("Backup and preimage content");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("App disabled-only");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("pnpm app:dev");
    expect(combined).toContain("D:\\workspaces\\demo");
    expect(combined).toContain("web-table-export-p0k.csv");
    expect(combined).toContain("FILE_EXISTS");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain(
      "release-notes-v0.7.0-user-workspace-apply-preview-rc.1.md"
    );
    expect(combined).toContain("app-shell-user-workspace-apply-manual-qa.md");
    expect(combined).toContain(
      "app-shell-user-workspace-apply-rc-checklist.md"
    );
  });

  it("documents the v0.8 DeepSeek proposal preview RC without enabling model or App execution", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.8.0-deepseek-proposal-preview-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-deepseek-proposal-preview-manual-qa.md"
      ),
      "utf8"
    );
    const checklist = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-deepseek-proposal-preview-rc-checklist.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${releaseNotes}\n${manualQa}\n${checklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(releaseNotes).toContain("v0.8.0-deepseek-proposal-preview-rc.1");
    expect(releaseNotes).toContain(
      "DeepSeek patch proposal preview pipeline, no live model call"
    );
    expect(combined).toContain("v0.7 user workspace runtime prototypes");
    expect(combined).toContain("P0L DeepSeek Patch Proposal Generation ADR");
    expect(combined).toContain("Model Patch Proposal Schema");
    expect(combined).toContain("Offline Fake Model Patch Proposal Harness");
    expect(combined).toContain("Patch Proposal Dry Adapter");
    expect(combined).toContain("Proposal Repair / Schema Repair Loop");
    expect(combined).toContain("App Patch Proposal Import");
    expect(combined).toContain("Model Proposal Chain Integration");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain("Runtime can validate and repair");
    expect(combined).toContain("without a live model call");
    expect(combined).toContain("App can import a pasted");
    expect(combined).toContain("App Shell does not call DeepSeek");
    expect(combined).toContain("No live DeepSeek proposal generation");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No real DeepSeek chat");
    expect(combined).toContain("No real ControlPlaneRun execution");
    expect(combined).toContain("No App-side user workspace patch apply");
    expect(combined).toContain("No App-side rollback");
    expect(combined).toContain("No App-side apply/rollback EventStore write");
    expect(combined).toContain("No App approval/rejection execution");
    expect(combined).toContain("No production PermissionLease issuance");
    expect(combined).toContain("No Git commit or push");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No `nativeMessaging` or live bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("schema validation");
    expect(combined).toContain("Forbidden field guard");
    expect(combined).toContain("Path guard");
    expect(combined).toContain("Secret marker guard");
    expect(combined).toContain("Repair fails closed");
    expect(combined).toContain("contentDraft");
    expect(combined).toContain("no tools or `tool_choice`");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("pnpm app:dev");
    expect(combined).toContain("D:\\workspaces\\demo");
    expect(combined).toContain("web-table-export-p0l.csv");
    expect(combined).toContain("FILE_EXISTS");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain(
      "release-notes-v0.8.0-deepseek-proposal-preview-rc.1.md"
    );
    expect(combined).toContain(
      "app-shell-deepseek-proposal-preview-manual-qa.md"
    );
    expect(combined).toContain(
      "app-shell-deepseek-proposal-preview-rc-checklist.md"
    );
  });

  it("locks v0.8 App Shell copy as preview-only and no-execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );

    expect(appSource).toContain("Preview only / no model call");
    expect(appSource).toMatch(
      /The\s+App\s+Shell\s+does\s+not\s+call\s+DeepSeek,\s+write\s+files,\s+apply\s+patches,\s+rollback,\s+or\s+write\s+events\./
    );
    expect(appSource).toContain("Preview chain / no execution");
    expect(appSource).toMatch(
      /No\s+model\s+call,\s+file\s+write,\s+apply,\s+rollback,\s+approval\s+execution,\s+or\s+event\s+write\s+is\s+performed\./
    );
    expect(appSource).toContain("Preview only / no apply");
    expect(appSource).toContain("Validation only / no apply");
    expect(appSource).toMatch(
      /Validation\s+passing\s+does\s+not\s+enable\s+apply\./
    );
    expect(appSource).toContain("Audit preview / no raw diff");
    expect(appSource).toContain("Draft only / no approval execution");
    expect(appSource).toContain("In-memory summary only / no filesystem write");
    expect(appSource).toContain("Checkpoint preview / no real rollback");
    expect(appSource).toContain("Disabled by default / runtime prototype only");
    expect(appSource).toContain("Runtime only / App write disabled");
    expect(appSource).toContain("Design only / disabled");
    expect(appSource).toContain(
      "No prompt is assembled and no model request is sent."
    );
    expect(appSource).toMatch(
      /No\s+capability\s+is\s+invoked\s+and\s+no\s+permission\s+lease\s+is\s+issued\./
    );
    expect(appSource).toContain("Event log events");
    expect(appSource).toContain("Source-tree mode");
    expect(appSource).toContain("No native bridge");
    expect(appSource).not.toContain("Generate Live DeepSeek Proposal");
    expect(appSource).not.toContain("Read DeepSeek API Key");
    expect(appSource).not.toContain("handleLiveDeepSeekProposal");
    expect(appSource).not.toContain("handleApplyModelProposal");
    expect(appSource).not.toContain("handleRollbackModelProposal");
    expect(appSource).not.toContain("handleWriteModelProposalEvents");
    expect(appSource).not.toContain("handleApproveModelProposal");
    expect(appSource).not.toContain("handleRejectModelProposal");
    expect(appSource).not.toContain("handleCommitModelProposal");
    expect(appSource).not.toContain("handleExecuteModelProposal");
  });

  it("documents the v0.9 live DeepSeek proposal RC without enabling App live calls", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.9.0-live-deepseek-proposal-preview-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-deepseek-proposal-manual-qa.md"
      ),
      "utf8"
    );
    const checklist = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-deepseek-proposal-rc-checklist.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${releaseNotes}\n${manualQa}\n${checklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(releaseNotes).toContain(
      "v0.9.0-live-deepseek-proposal-preview-rc.1"
    );
    expect(releaseNotes).toContain(
      "Live DeepSeek proposal adapter, explicit opt-in, no App execution"
    );
    expect(combined).toContain("v0.8 DeepSeek proposal preview pipeline");
    expect(combined).toContain("P0M Live DeepSeek Proposal Adapter ADR");
    expect(combined).toContain("API Key Access Policy / Opt-in Gate");
    expect(combined).toContain("Live Proposal Request Builder");
    expect(combined).toContain("Runtime Live DeepSeek Proposal Adapter");
    expect(combined).toContain("Live Proposal Repair / Validation Integration");
    expect(combined).toContain("App Live Proposal Preview Gate");
    expect(combined).toContain("Telemetry / Redaction Audit");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain("summary-only live proposal requests");
    expect(combined).toContain("injected API key resolver");
    expect(combined).toContain("injected transport");
    expect(combined).toContain("repair/schema chain");
    expect(combined).toContain("App can preview opt-in");
    expect(combined).toContain("App Shell does not call DeepSeek");
    expect(combined).toContain("No App-side live DeepSeek call");
    expect(combined).toContain("No App API key read");
    expect(combined).toContain("No App fetch/network");
    expect(combined).toContain("No autonomous DeepSeek coding loop");
    expect(combined).toContain("No real DeepSeek chat UI");
    expect(combined).toContain("No real ControlPlaneRun execution");
    expect(combined).toContain("No App-side user workspace patch apply");
    expect(combined).toContain("No App-side rollback");
    expect(combined).toContain("No App-side apply/rollback EventStore write");
    expect(combined).toContain("No App approval/rejection execution");
    expect(combined).toContain("No production PermissionLease issuance");
    expect(combined).toContain("No Git commit or push");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No `nativeMessaging` or live bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("explicit opt-in");
    expect(combined).toContain("no default environment read");
    expect(combined).toContain("no default fetch/network");
    expect(combined).toContain("summary-only request boundary");
    expect(combined).toContain("no tools or `tool_choice`");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("Unsafe live output fails closed");
    expect(combined).toContain("Telemetry / Redaction Audit");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("pnpm app:dev");
    expect(combined).toContain("D:\\workspaces\\demo");
    expect(combined).toContain("web-table-export-p0m.csv");
    expect(combined).toContain("Live Proposal Opt-in Gate");
    expect(combined).toContain("Live Proposal Request Builder");
    expect(combined).toContain("Live Proposal Validation Integration");
    expect(combined).toContain("App Live Proposal Preview Gate");
    expect(combined).toContain("Live Proposal Telemetry / Redaction Audit");
    expect(combined).toContain("FILE_EXISTS");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain("full docs path links");
    expect(combined).toContain(
      "release-notes-v0.9.0-live-deepseek-proposal-preview-rc.1.md"
    );
    expect(combined).toContain("app-shell-live-deepseek-proposal-manual-qa.md");
    expect(combined).toContain(
      "app-shell-live-deepseek-proposal-rc-checklist.md"
    );
  });

  it("locks v0.9 App Shell copy as disabled-only live proposal preview", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const normalizedAppSource = appSource.replace(/\s+/g, " ");

    expect(appSource).toContain("Policy only / no API key read");
    expect(normalizedAppSource).toContain(
      "The App Shell does not read API keys, call DeepSeek, fetch network, apply patches, rollback, or write events."
    );
    expect(appSource).toContain("Request preview / no network");
    expect(normalizedAppSource).toContain(
      "The App Shell does not send live requests."
    );
    expect(appSource).toContain("Summary only / no execution");
    expect(normalizedAppSource).toContain(
      "The App Shell does not call DeepSeek, apply patches, rollback, or write events."
    );
    expect(appSource).toContain("Disabled by default / no App live call");
    expect(normalizedAppSource).toContain(
      "The App Shell cannot read API keys, call DeepSeek, fetch network, apply patches, rollback, approve, issue leases, or write events."
    );
    expect(appSource).toContain("Summary only / no raw prompt");
    expect(normalizedAppSource).toContain(
      "The App Shell does not persist raw prompts, raw responses, reasoning_content, API keys, or model calls."
    );
    expect(appSource).toContain("Preview only / no model call");
    expect(appSource).toContain("Preview chain / no execution");
    expect(appSource).toContain("Disabled by default / runtime prototype only");
    expect(appSource).toContain("Runtime only / App write disabled");
    expect(appSource).toContain("Design only / disabled");
    expect(appSource).toContain(
      "No prompt is assembled and no model request is sent."
    );
    expect(appSource).toMatch(
      /No\s+capability\s+is\s+invoked\s+and\s+no\s+permission\s+lease\s+is\s+issued\./
    );
    expect(appSource).toContain("Event log events");
    expect(appSource).toContain("Source-tree mode");
    expect(appSource).toContain("No native bridge");
    expect(appSource).toContain("Call DeepSeek (disabled)");
    expect(appSource).toContain("Send Live Proposal Request (disabled)");
    expect(appSource).toContain("Write Telemetry (disabled)");
    expect(appSource).not.toMatch(/>\s*Call DeepSeek\s*</);
    expect(appSource).not.toMatch(/>\s*Send Live Proposal Request\s*</);
    expect(appSource).not.toMatch(/>\s*Apply\s*</);
    expect(appSource).not.toMatch(/>\s*Rollback\s*</);
    expect(appSource).not.toMatch(/>\s*Write Events\s*</);
    expect(appSource).not.toMatch(/>\s*Approve\s*</);
    expect(appSource).not.toMatch(/>\s*Reject\s*</);
    expect(appSource).not.toMatch(/>\s*Commit\s*</);
    expect(appSource).not.toMatch(/>\s*Execute\s*</);
    expect(appSource).not.toContain("DeepSeek chat works");
    expect(appSource).not.toContain("Generate Live DeepSeek Proposal");
    expect(appSource).not.toContain("Read DeepSeek API Key");
    expect(appSource).not.toContain("Fetch Live DeepSeek Proposal");
    expect(appSource).not.toContain("Create Run works");
    expect(appSource).not.toContain("Execute Run works");
    expect(appSource).not.toContain("Enable native bridge");
    expect(appSource).not.toContain("handleCallDeepSeek");
    expect(appSource).not.toContain("handleSendLiveProposalRequest");
    expect(appSource).not.toContain("handleReadDeepSeekApiKey");
    expect(appSource).not.toContain("handleFetchLiveProposal");
    expect(appSource).not.toContain("handleApplyLiveProposal");
    expect(appSource).not.toContain("handleRollbackLiveProposal");
    expect(appSource).not.toContain("handleWriteLiveProposalEvents");
    expect(appSource).not.toContain("handleApproveLiveProposal");
    expect(appSource).not.toContain("handleRejectLiveProposal");
    expect(appSource).not.toContain("handleCommitLiveProposal");
    expect(appSource).not.toContain("handleExecuteLiveProposal");
  });

  it("documents the v0.10 live proposal evaluation RC without enabling App evaluation", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.10.0-live-proposal-evaluation-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-proposal-evaluation-manual-qa.md"
      ),
      "utf8"
    );
    const checklist = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-live-proposal-evaluation-rc-checklist.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${releaseNotes}\n${manualQa}\n${checklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(releaseNotes).toContain("v0.10.0-live-proposal-evaluation-rc.1");
    expect(releaseNotes).toContain(
      "Live proposal evaluation and golden cases, no App execution"
    );
    expect(combined).toContain("v0.9 live DeepSeek proposal adapter");
    expect(combined).toContain("P0N Live Proposal Golden Cases ADR/design");
    expect(combined).toContain("Golden Case Fixture Schema");
    expect(combined).toContain("Offline Evaluation Runner");
    expect(combined).toContain("Live Evaluation Runner");
    expect(combined).toContain("Failure Taxonomy and Repair Metrics");
    expect(combined).toContain("App Evaluation Summary Surface");
    expect(combined).toContain("Evaluation Telemetry / Redaction Audit");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain(
      "Runtime can validate live proposal golden cases"
    );
    expect(combined).toContain("offline fake/dry evaluations");
    expect(combined).toContain("explicit opt-in live evaluations");
    expect(combined).toContain("injected resolver");
    expect(combined).toContain("injected transport");
    expect(combined).toContain("failure taxonomy");
    expect(combined).toContain(
      "repair, schema, expectation, and usage metrics"
    );
    expect(combined).toContain(
      "App Shell does not run evaluation, call DeepSeek"
    );
    expect(combined).toContain("No App-side live DeepSeek call");
    expect(combined).toContain("No App-side evaluation runner");
    expect(combined).toContain("No App API key read");
    expect(combined).toContain("No App fetch/network");
    expect(combined).toContain("No autonomous DeepSeek coding loop");
    expect(combined).toContain("No real DeepSeek chat UI");
    expect(combined).toContain("No real ControlPlaneRun execution");
    expect(combined).toContain("No App-side user workspace patch apply");
    expect(combined).toContain("No App-side rollback");
    expect(combined).toContain("No App-side apply/rollback EventStore write");
    expect(combined).toContain("No App approval/rejection execution");
    expect(combined).toContain("No production PermissionLease issuance");
    expect(combined).toContain("No Git commit or push");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No `nativeMessaging` or live bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("Golden cases are summary-only");
    expect(combined).toContain(
      "Raw prompt, raw response, and reasoning_content are not persisted"
    );
    expect(combined).toContain("Live evaluation requires explicit opt-in");
    expect(combined).toContain("There is no default environment read");
    expect(combined).toContain("There is no default fetch/network path");
    expect(combined).toContain(
      "Usage is recorded as safe numeric summary only"
    );
    expect(combined).toContain("Telemetry / Redaction Audit blocks raw output");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("pnpm app:dev");
    expect(combined).toContain("D:\\workspaces\\demo");
    expect(combined).toContain("web-table-export-p0n.csv");
    expect(combined).toContain("Live Proposal Evaluation Summary");
    expect(combined).toContain("Live Proposal Evaluation Telemetry Audit");
    expect(combined).toContain("no App evaluation run");
    expect(combined).toContain("no App live DeepSeek call");
    expect(combined).toContain("no API key input");
    expect(combined).toContain("no fetch/network");
    expect(combined).toContain("no raw prompt/response/reasoning displayed");
    expect(combined).toContain("FILE_EXISTS");
    expect(combined).toContain("PASSWORD_VALUE_MARKER");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain("full docs path links");
    expect(combined).toContain(
      "release-notes-v0.10.0-live-proposal-evaluation-rc.1.md"
    );
    expect(combined).toContain(
      "app-shell-live-proposal-evaluation-manual-qa.md"
    );
    expect(combined).toContain(
      "app-shell-live-proposal-evaluation-rc-checklist.md"
    );
  });

  it("locks v0.10 App Shell copy as read-only evaluation preview", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const normalizedAppSource = appSource.replace(/\s+/g, " ");

    expect(appSource).toContain("Live Proposal Evaluation Summary");
    expect(appSource).toContain("Read-only / no live call");
    expect(normalizedAppSource).toContain(
      "The App Shell does not run evaluation, call DeepSeek, read API keys, fetch network, apply patches, rollback, or write events."
    );
    expect(appSource).toContain("Live Proposal Evaluation Telemetry Audit");
    expect(appSource).toContain("Read-only / no raw output");
    expect(normalizedAppSource).toContain(
      "The App Shell does not run evaluation, call DeepSeek, fetch network, apply patches, rollback, or write events."
    );
    expect(appSource).toContain("Run Evaluation (disabled)");
    expect(appSource).toContain("Call DeepSeek for Evaluation (disabled)");
    expect(appSource).toContain("Run Telemetry Audit (disabled)");
    expect(appSource).toContain("Write Telemetry Event (disabled)");
    expect(appSource).toContain("Policy only / no API key read");
    expect(appSource).toContain("Request preview / no network");
    expect(appSource).toContain("The App Shell does not send live requests.");
    expect(appSource).toContain("Summary only / no execution");
    expect(appSource).toContain("Disabled by default / no App live call");
    expect(appSource).toContain("Summary only / no raw prompt");
    expect(appSource).toContain("Preview only / no model call");
    expect(appSource).toContain("Preview chain / no execution");
    expect(appSource).toContain("Disabled by default / runtime prototype only");
    expect(appSource).toContain("Runtime only / App write disabled");
    expect(appSource).toContain("Design only / disabled");
    expect(appSource).toContain(
      "No prompt is assembled and no model request is sent."
    );
    expect(appSource).toMatch(
      /No\s+capability\s+is\s+invoked\s+and\s+no\s+permission\s+lease\s+is\s+issued\./
    );
    expect(appSource).toContain("Event log events");
    expect(appSource).toContain("Source-tree mode");
    expect(appSource).toContain("No native bridge");
    expect(appSource).not.toMatch(/>\s*Run Evaluation\s*</);
    expect(appSource).not.toMatch(/>\s*Call DeepSeek\s*</);
    expect(appSource).not.toMatch(/>\s*Send Live Proposal Request\s*</);
    expect(appSource).not.toMatch(/>\s*Apply\s*</);
    expect(appSource).not.toMatch(/>\s*Rollback\s*</);
    expect(appSource).not.toMatch(/>\s*Write Events\s*</);
    expect(appSource).not.toMatch(/>\s*Approve\s*</);
    expect(appSource).not.toMatch(/>\s*Reject\s*</);
    expect(appSource).not.toMatch(/>\s*Commit\s*</);
    expect(appSource).not.toMatch(/>\s*Execute\s*</);
    expect(appSource).not.toContain("DeepSeek chat works");
    expect(appSource).not.toContain("Run live evaluation");
    expect(appSource).not.toContain("Generate Live DeepSeek Proposal");
    expect(appSource).not.toContain("Read DeepSeek API Key");
    expect(appSource).not.toContain("Fetch Live DeepSeek Proposal");
    expect(appSource).not.toContain("Create Run works");
    expect(appSource).not.toContain("Execute Run works");
    expect(appSource).not.toContain("Enable native bridge");
    expect(appSource).not.toContain("handleRunEvaluation");
    expect(appSource).not.toContain("handleCallDeepSeek");
    expect(appSource).not.toContain("handleSendLiveProposalRequest");
    expect(appSource).not.toContain("handleReadDeepSeekApiKey");
    expect(appSource).not.toContain("handleFetchLiveProposal");
    expect(appSource).not.toContain("handleApplyLiveProposal");
    expect(appSource).not.toContain("handleRollbackLiveProposal");
    expect(appSource).not.toContain("handleWriteLiveProposalEvents");
    expect(appSource).not.toContain("handleApproveLiveProposal");
    expect(appSource).not.toContain("handleRejectLiveProposal");
    expect(appSource).not.toContain("handleCommitLiveProposal");
    expect(appSource).not.toContain("handleExecuteLiveProposal");
  });

  it("documents the v0.7 post-release review and P0L DeepSeek proposal roadmap without enabling execution", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.7-user-workspace-apply-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0l-deepseek-patch-proposal-generation-roadmap.md"
      ),
      "utf8"
    );
    const plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0l-001-deepseek-patch-proposal-generation-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${review}\n${roadmap}\n${plan}\n${docsIndex}`;

    expect(combined).toContain("v0.7.0-user-workspace-apply-preview-rc.1");
    expect(combined).toContain(
      "User workspace apply/rollback runtime prototypes"
    );
    expect(combined).toContain("0b98beb");
    expect(combined).toContain("P0K is complete");
    expect(combined).toContain("P0L DeepSeek Patch Proposal Generation");
    expect(combined).toContain("DeepSeek-assisted patch proposal generation");
    expect(combined).toMatch(/structured\s+patch\s+proposals\s+only/);
    expect(combined).toContain("DeepSeek must not write files");
    expect(combined).toContain("DeepSeek must not call apply or rollback");
    expect(combined).toContain("validation preview");
    expect(combined).toContain("diff audit");
    expect(combined).toContain("approval draft");
    expect(combined).toContain("virtual apply");
    expect(combined).toContain("rollback");
    expect(combined).toContain("replay chain");
    expect(combined).toContain("model must not write files");
    expect(combined).toContain("no live DeepSeek call");
    expect(combined).toContain("no model implementation");
    expect(combined).toContain("no file write");
    expect(combined).toContain("no apply");
    expect(combined).toContain("no rollback");
    expect(combined).toContain("no App execution");
    expect(combined).toContain("No Git");
    expect(combined).toContain("No shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("App-side apply");
    expect(combined).toContain("App-side rollback");
    expect(combined).toContain("Production PermissionLease");
    expect(combined).toContain("No raw source");
    expect(combined).toContain("No raw diff");
    expect(combined).toContain("No raw CSV");
    expect(combined).toContain("No raw prompt");
    expect(combined).toContain("No API key");
    expect(docsIndex).toContain(
      "v0.7-user-workspace-apply-postrelease-review.md"
    );
    expect(docsIndex).toContain(
      "p0l-deepseek-patch-proposal-generation-roadmap.md"
    );
    expect(docsIndex).toContain(
      "p0l-001-deepseek-patch-proposal-generation-plan.md"
    );
  });

  it("documents the v0.8 post-release review and P0M live proposal roadmap without implementation", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.8-deepseek-proposal-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0m-live-deepseek-proposal-adapter-roadmap.md"
      ),
      "utf8"
    );
    const plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0m-001-live-deepseek-proposal-adapter-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${review}\n${roadmap}\n${plan}\n${docsIndex}`;

    expect(combined).toContain("v0.8.0-deepseek-proposal-preview-rc.1");
    expect(combined).toContain(
      "DeepSeek patch proposal preview pipeline, no live model call"
    );
    expect(combined).toContain("d82790a");
    expect(combined).toContain("P0L is complete");
    expect(combined).toContain("P0M: Live DeepSeek Proposal Adapter");
    expect(combined).toContain(
      "explicit opt-in live DeepSeek proposal adapter"
    );
    expect(combined).toContain(
      "Live DeepSeek may generate structured patch proposals only"
    );
    expect(combined).toMatch(/Live DeepSeek must\s+not write files/);
    expect(combined).toMatch(/Live DeepSeek must not call apply or rollback/);
    expect(combined).toMatch(/Live DeepSeek\s+must not write EventStore/);
    expect(combined).toMatch(/Live DeepSeek must not issue PermissionLease/);
    expect(combined).toMatch(/API key access must be explicit and\s+gated/);
    expect(combined).toContain("no live DeepSeek call in P0M-001");
    expect(combined).toContain("no adapter implementation in P0M-001");
    expect(combined).toContain("no API key read in P0M-001");
    expect(combined).toContain("no fetch/network in P0M-001");
    expect(combined).toMatch(
      /schema \/ repair \/ validation \/ audit \/ approval\s+chain/
    );
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No Git");
    expect(combined).toContain("No shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("App-side apply");
    expect(combined).toContain("App-side rollback");
    expect(combined).toContain("Production PermissionLease");
    expect(combined).toContain("No raw source");
    expect(combined).toContain("No raw diff");
    expect(combined).toContain("No raw CSV");
    expect(combined).toContain("No raw prompt");
    expect(combined).toContain("No API key");
    expect(docsIndex).toContain("v0.8-deepseek-proposal-postrelease-review.md");
    expect(docsIndex).toContain(
      "p0m-live-deepseek-proposal-adapter-roadmap.md"
    );
    expect(docsIndex).toContain(
      "p0m-001-live-deepseek-proposal-adapter-plan.md"
    );
  });

  it("documents the P0M-001 live DeepSeek proposal adapter ADR and gates without implementation", async () => {
    const adr = await readFile(
      path.join(
        repoRoot,
        "docs",
        "adr",
        "0008-live-deepseek-proposal-adapter.md"
      ),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(
        repoRoot,
        "docs",
        "live-deepseek-proposal-adapter-threat-model-v0.8.md"
      ),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "live-deepseek-proposal-adapter-implementation-gate-v0.8.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0m-002-api-key-access-policy-opt-in-gate-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${nextPlan}\n${docsIndex}`;

    expect(combined).toContain("Live DeepSeek Proposal Adapter");
    expect(combined).toContain("Proposed / Accepted for P0M design gate");
    expect(combined).toContain("explicit opt-in");
    expect(combined).toMatch(/no live DeepSeek call in P0M-001/i);
    expect(combined).toMatch(/no API key read in P0M-001/i);
    expect(combined).toMatch(/no fetch\/network in P0M-001/i);
    expect(combined).toContain("No adapter implementation");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No file write");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git");
    expect(combined).toContain("No shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toMatch(/API Key Leakage Risks/i);
    expect(combined).toMatch(/Raw Prompt \/ Source Leakage Risks/i);
    expect(combined).toMatch(/Opt-in Bypass Risks/i);
    expect(combined).toMatch(
      /Do not implement live adapter until P0M-001\/P0M-002\/P0M-003 gates are\s+satisfied/
    );
    expect(combined).toMatch(
      /schema[,/ ]+repair[,/ ]+validation[,/ ]+audit[,/ ]+approval/i
    );
    expect(combined).toContain("P0M-002 is policy-only");
    expect(combined).toContain("No live call in P0M-002");
    expect(combined).toContain("No API key read in P0M-002");
    expect(combined).toContain("No fetch/network in P0M-002");
    expect(docsIndex).toContain("adr/0008-live-deepseek-proposal-adapter.md");
    expect(docsIndex).toContain(
      "live-deepseek-proposal-adapter-threat-model-v0.8.md"
    );
    expect(docsIndex).toContain(
      "live-deepseek-proposal-adapter-implementation-gate-v0.8.md"
    );
    expect(docsIndex).toContain(
      "p0m-002-api-key-access-policy-opt-in-gate-plan.md"
    );
  });

  it("documents the v0.9 post-release review and P0N live proposal evaluation roadmap without execution", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.9-live-deepseek-proposal-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(repoRoot, "docs", "p0n-live-proposal-evaluation-roadmap.md"),
      "utf8"
    );
    const plan = await readFile(
      path.join(repoRoot, "docs", "p0n-001-live-proposal-golden-cases-plan.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${review}\n${roadmap}\n${plan}\n${docsIndex}`;

    expect(combined).toContain("v0.9.0-live-deepseek-proposal-preview-rc.1");
    expect(combined).toContain(
      "Live DeepSeek proposal adapter, explicit opt-in, no App execution"
    );
    expect(combined).toContain("Commit: to be verified");
    expect(combined).toContain("P0M is complete");
    expect(combined).toContain("P0N: Live Proposal Evaluation / Golden Cases");
    expect(combined).toContain("live proposal evaluation");
    expect(combined).toContain("golden cases");
    expect(combined).toMatch(
      /measure[s]?\s+proposal quality before expanding execution/i
    );
    expect(combined).toMatch(/App execution remains\s+disabled/);
    expect(combined).toMatch(/App-side apply and App-side rollback/);
    expect(combined).toMatch(/must not directly write files/);
    expect(combined).toMatch(/schema, repair, validation,\s+audit, approval/);
    expect(combined).toContain("schema failure");
    expect(combined).toContain("unsafe path");
    expect(combined).toContain("forbidden field");
    expect(combined).toContain("secret marker");
    expect(combined).toContain("missing evidence");
    expect(combined).toContain("missing tests");
    expect(combined).toContain("high-risk operation");
    expect(combined).toContain("repair failed");
    expect(combined).toContain("validation warning");
    expect(combined).toContain("hallucinated path");
    expect(combined).toContain("poor objective fit");
    expect(combined).toContain("usage summary only");
    expect(combined).toContain("never persist raw prompt");
    expect(combined).toContain("raw response");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("no live DeepSeek call in P0N-001");
    expect(combined).toContain(
      "no evaluation runner implementation in P0N-001"
    );
    expect(combined).toContain("no API key read in P0N-001");
    expect(combined).toContain("no fetch/network in P0N-001");
    expect(combined).toContain("no file write");
    expect(combined).toContain("no apply");
    expect(combined).toContain("no rollback");
    expect(combined).toContain("no App execution");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No Git");
    expect(combined).toContain("No shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("No raw prompt");
    expect(combined).toContain("No raw response");
    expect(combined).toContain("No API key");
    expect(docsIndex).toContain(
      "v0.9-live-deepseek-proposal-postrelease-review.md"
    );
    expect(docsIndex).toContain("p0n-live-proposal-evaluation-roadmap.md");
    expect(docsIndex).toContain("p0n-001-live-proposal-golden-cases-plan.md");
  });

  it("documents the P0N-001 live proposal golden cases design without evaluator implementation", async () => {
    const adr = await readFile(
      path.join(repoRoot, "docs", "adr", "0009-live-proposal-golden-cases.md"),
      "utf8"
    );
    const design = await readFile(
      path.join(repoRoot, "docs", "live-proposal-golden-cases-design-v0.9.md"),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(
        repoRoot,
        "docs",
        "live-proposal-evaluation-threat-model-v0.9.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(repoRoot, "docs", "p0n-002-golden-case-fixture-schema-plan.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${design}\n${threatModel}\n${nextPlan}\n${docsIndex}`;

    expect(combined).toContain("Live Proposal Golden Cases");
    expect(combined).toContain("Proposed / Accepted for P0N design gate");
    expect(combined).toContain("evaluation taxonomy");
    expect(combined).toContain("Golden Case Principles");
    expect(combined).toContain("objective summary");
    expect(combined).toContain("workspace refs");
    expect(combined).toContain("expected proposal summary");
    expect(combined).toMatch(/expected failure categor(?:y|ies)/i);
    expect(combined).toContain("no live DeepSeek call in P0N-001");
    expect(combined).toContain("no evaluator implementation in P0N-001");
    expect(combined).toContain("no API key read in P0N-001");
    expect(combined).toContain("no fetch/network in P0N-001");
    expect(combined).toContain("no raw prompt persistence");
    expect(combined).toContain("no raw response persistence");
    expect(combined).toContain("no reasoning_content persistence");
    expect(combined).toContain("No API key");
    expect(combined).toContain("No App execution");
    expect(combined).toMatch(/No Git(?:\/shell)?/);
    expect(combined).toMatch(/No (?:Git\/)?shell/);
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("Golden Case Poisoning");
    expect(combined).toContain("Expected-Output Overfitting");
    expect(combined).toContain("Raw Prompt / Response Leakage");
    expect(combined).toContain("reasoning_content Leakage");
    expect(combined).toContain("API Key Leakage");
    expect(combined).toContain("Metric Gaming");
    expect(combined).toContain("schema_validity");
    expect(combined).toContain("repair_success");
    expect(combined).toContain("unsafe_path_blocked");
    expect(combined).toContain("forbidden_field_blocked");
    expect(combined).toContain("secret_marker_blocked");
    expect(combined).toContain("evidence_coverage");
    expect(combined).toContain("objective_fit");
    expect(combined).toContain("operation_risk");
    expect(combined).toContain("test_coverage_hint");
    expect(combined).toContain("diff_audit_readiness");
    expect(combined).toContain("approval_readiness");
    expect(combined).toContain("user_workspace_readiness");
    expect(combined).toContain("schema_failure");
    expect(combined).toContain("malformed_json");
    expect(combined).toContain("repair_failed");
    expect(combined).toContain("unsafe_path");
    expect(combined).toContain("forbidden_field");
    expect(combined).toContain("secret_marker");
    expect(combined).toContain("missing_evidence");
    expect(combined).toContain("missing_test_plan");
    expect(combined).toContain("high_risk_operation");
    expect(combined).toContain("hallucinated_path");
    expect(combined).toContain("poor_objective_fit");
    expect(combined).toContain("raw_content_leak");
    expect(combined).toContain("reasoning_content_leak");
    expect(combined).toContain("usage_summary_missing");
    expect(combined).toContain("redaction audit");
    expect(combined).toMatch(/no live call in P0N-002/i);
    expect(combined).toContain("no raw prompt");
    expect(combined).toContain("no raw response");
    expect(combined).toContain("no raw source");
    expect(combined).toContain("no raw diff");
    expect(combined).toContain("no reasoning_content");
    expect(combined).toContain("no apply");
    expect(combined).toContain("no rollback");
    expect(combined).toContain("no App execution");
    expect(docsIndex).toContain("adr/0009-live-proposal-golden-cases.md");
    expect(docsIndex).toContain("live-proposal-golden-cases-design-v0.9.md");
    expect(docsIndex).toContain(
      "live-proposal-evaluation-threat-model-v0.9.md"
    );
    expect(docsIndex).toContain("p0n-002-golden-case-fixture-schema-plan.md");
  });

  it("documents the P0N-002 golden case fixture schema without evaluator or live call", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-live-proposal-golden-case-schema-v0.9.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${docsIndex}`;

    expect(combined).toContain("Runtime Live Proposal Golden Case Schema v0.9");
    expect(combined).toContain("fixture schema");
    expect(combined).toContain("No evaluator runner");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("raw prompt");
    expect(combined).toContain("raw response");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("No apply/rollback");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No Git/shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("Failure Taxonomy");
    expect(combined).toContain("schema_failure");
    expect(combined).toContain("unsafe_path");
    expect(combined).toContain("forbidden_field");
    expect(combined).toContain("secret_marker");
    expect(combined).toContain("reasoning_content_leak");
    expect(docsIndex).toContain(
      "runtime-live-proposal-golden-case-schema-v0.9.md"
    );
  });

  it("documents the P0N-003 offline evaluation runner without live calls", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-live-proposal-offline-evaluation-runner-v0.9.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${docsIndex}`;

    expect(combined).toContain(
      "Runtime Live Proposal Offline Evaluation Runner v0.9"
    );
    expect(combined).toContain("offline evaluation only");
    expect(combined).toContain("fake/dry only");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("raw prompt");
    expect(combined).toContain("raw response");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("No apply/rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("Failure Taxonomy");
    expect(combined).toContain("schema_failure");
    expect(combined).toContain("malformed_json");
    expect(combined).toContain("repair_failed");
    expect(combined).toContain("unsafe_path");
    expect(combined).toContain("forbidden_field");
    expect(combined).toContain("secret_marker");
    expect(docsIndex).toContain(
      "runtime-live-proposal-offline-evaluation-runner-v0.9.md"
    );
  });

  it("documents the P0N-004 live evaluation runner explicit opt-in boundary", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-live-proposal-evaluation-runner-v0.9.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${docsIndex}`;

    expect(combined).toContain("Runtime Live Proposal Evaluation Runner v0.9");
    expect(combined).toContain("explicit opt-in");
    expect(combined).toContain("disabled");
    expect(combined).toContain("dry_run");
    expect(combined).toContain("injected API key resolver");
    expect(combined).toContain("injected transport");
    expect(combined).toContain("No App live call");
    expect(combined).toContain("No App API key read");
    expect(combined).toContain("No default fetch/network");
    expect(combined).toContain("raw prompt");
    expect(combined).toContain("raw response");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("No apply/rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git/shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("Failure Taxonomy");
    expect(combined).toContain("unsafe_path");
    expect(combined).toContain("secret_marker");
    expect(combined).toContain("raw_content_leak");
    expect(docsIndex).toContain(
      "runtime-live-proposal-evaluation-runner-v0.9.md"
    );
  });

  it("documents the P0N-005 failure metrics aggregator without execution", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-live-proposal-failure-metrics-v0.9.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${docsIndex}`;

    expect(combined).toContain("Runtime Live Proposal Failure Metrics v0.9");
    expect(combined).toContain("metrics aggregator only");
    expect(combined).toContain("no live call");
    expect(combined).toContain("no API key read");
    expect(combined).toContain("no fetch/network");
    expect(combined).toContain("no raw prompt");
    expect(combined).toContain("no raw response");
    expect(combined).toContain("reasoning_content persistence");
    expect(combined).toContain("Failure Taxonomy");
    expect(combined).toContain("Repair Metrics");
    expect(combined).toContain("Schema metrics");
    expect(combined).toContain("Usage metrics");
    expect(combined).toContain("No apply/rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No Git/shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "runtime-live-proposal-failure-metrics-v0.9.md"
    );
  });

  it("documents the v0.10 post-release review and P0O approved execution roadmap", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.10-live-proposal-evaluation-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(repoRoot, "docs", "p0o-app-approved-execution-roadmap.md"),
      "utf8"
    );
    const plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0o-001-app-approved-execution-gate-plan.md"
      ),
      "utf8"
    );
    const spec = await readFile(
      path.join(repoRoot, "docs", "v0.11 — App-side Approved Execution MVP.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${plan}\n${spec}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain("v0.10.0-live-proposal-evaluation-rc.1");
    expect(combined).toContain(
      "Live proposal evaluation and golden cases, no App execution"
    );
    expect(combined).toContain("P0N is complete");
    expect(combined).toContain("P0O: App-side Approved Execution MVP");
    expect(combined).toContain("App-side approved execution MVP");
    expect(combined).toMatch(/user must explicitly approve/i);
    expect(combined).toContain("Human approval is required");
    expect(combined).toContain("Typed confirmation is required");
    expect(combined).toContain("rollback-capable");
    expect(combined).toContain("Rollback is available");
    expect(combined).toMatch(/summary-only apply and rollback events/i);
    expect(combined).toMatch(/summary events must be replayable/i);
    expect(combined).toContain("Event Log / Replay can show the chain");
    expect(combined).toContain("No auto-apply");
    expect(combined).toContain("No model execution");
    expect(combined).toContain("No Git command execution");
    expect(combined).toContain("No shell command execution");
    expect(combined).toContain("No broad production PermissionLease");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("No runtime feature implementation");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No EventStore writer");
    expect(combined).toContain("No user workspace mutation");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("raw preimage");
    expect(combined).toContain("never appear in EventStore payloads");
    expect(combined).toContain("DW-P0O-002");
    expect(docsIndex).toContain(
      "v0.11%20%E2%80%94%20App-side%20Approved%20Execution%20MVP.md"
    );
    expect(docsIndex).toContain(
      "v0.10-live-proposal-evaluation-postrelease-review.md"
    );
    expect(docsIndex).toContain("p0o-app-approved-execution-roadmap.md");
    expect(docsIndex).toContain("p0o-001-app-approved-execution-gate-plan.md");
  });

  it("documents the P0O-002 app approved execution gate design before implementation", async () => {
    const adr = await readFile(
      path.join(repoRoot, "docs", "adr", "0010-app-approved-execution-gate.md"),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-approved-execution-threat-model-v0.10.md"
      ),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-approved-execution-implementation-gate-v0.10.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(repoRoot, "docs", "p0o-003-app-approval-receipt-plan.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${nextPlan}\n${docsIndex}`;

    expect(combined).toContain("App Approved Execution Gate");
    expect(combined).toContain("Proposed / Accepted for P0O design gate");
    expect(combined).toContain("explicit approval receipt");
    expect(combined).toContain("patch proposal exists");
    expect(combined).toContain("patch proposal validation passes");
    expect(combined).toContain("diff/audit passes");
    expect(combined).toContain("approval draft exists");
    expect(combined).toContain("snapshot or preimage requirement exists");
    expect(combined).toContain("rollback checkpoint can be created");
    expect(combined).toContain("apply result exists");
    expect(combined).toContain("checkpoint verifies");
    expect(combined).toContain("must not auto-apply from model output");
    expect(combined).toMatch(/must not execute Git or\s+shell commands/);
    expect(combined).toContain("summary-only");
    expect(combined).toContain("Raw preimage may exist only");
    expect(combined).toMatch(/malicious proposal/i);
    expect(combined).toContain("Stale Snapshot Risks");
    expect(combined).toContain("Path Traversal Risks");
    expect(combined).toContain("Symlink / Junction / Reparse Point Risks");
    expect(combined).toContain("Generated / Dependency Path Mutation Risks");
    expect(combined).toContain("Secret Path Mutation Risks");
    expect(combined).toContain("Raw Preimage Leakage Risks");
    expect(combined).toContain("Event Tampering / Replay Mismatch Risks");
    expect(combined).toContain("Approval Bypass Risks");
    expect(combined).toContain("Rollback Failure Risks");
    expect(combined).toContain("Interrupted Apply Risks");
    expect(combined).toContain("Windows Path Risks");
    expect(combined).toContain("Path Safety");
    expect(combined).toContain("Content Safety");
    expect(combined).toContain("Approval Safety");
    expect(combined).toContain("Checkpoint Safety");
    expect(combined).toContain("Rollback Safety");
    expect(combined).toContain("EventStore Safety");
    expect(combined).toContain("Replay Safety");
    expect(combined).toContain("UI Safety");
    expect(combined).toContain("CI / Boundary Safety");
    expect(combined).toMatch(/not a (?:broad\s+)?production\s+PermissionLease/);
    expect(combined).toContain("APPLY TO USER WORKSPACE");
    expect(combined).toContain("ROLLBACK USER WORKSPACE");
    expect(combined).toContain("No Tauri invoke");
    expect(combined).toContain("No file write");
    expect(combined).toContain("No EventStore write");
    expect(docsIndex).toContain("adr/0010-app-approved-execution-gate.md");
    expect(docsIndex).toContain("app-approved-execution-threat-model-v0.10.md");
    expect(docsIndex).toContain(
      "app-approved-execution-implementation-gate-v0.10.md"
    );
    expect(docsIndex).toContain("p0o-003-app-approval-receipt-plan.md");
  });

  it("documents the P0O-004 approved apply command as narrow and summary-only", async () => {
    const applyDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-approved-user-workspace-apply-command-v0.11.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${applyDoc}\n${docsIndex}`;

    expect(combined).toContain("apply_approved_user_workspace_patch");
    expect(combined).toContain("Fixed Tauri command only");
    expect(combined).toContain("APPLY TO USER WORKSPACE");
    expect(combined).toContain("Blocks absolute paths");
    expect(combined).toContain("symlink / reparse escape");
    expect(combined).toContain("summary-only result");
    expect(combined).toContain("eventPreview");
    expect(combined).toContain("notWritten: true");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("Rollback is handled by the separate P0O-005");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No PermissionLease issuing");
    expect(combined).toContain("No raw content");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "app-approved-user-workspace-apply-command-v0.11.md"
    );
  });

  it("documents the P0O-005 approved rollback command as checkpoint-only and summary-only", async () => {
    const rollbackDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-approved-user-workspace-rollback-command-v0.11.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${rollbackDoc}\n${docsIndex}`;

    expect(combined).toContain("rollback_approved_user_workspace_patch");
    expect(combined).toContain("ROLLBACK USER WORKSPACE");
    expect(combined).toContain("checkpointRef");
    expect(combined).toContain("checkpoint content hash");
    expect(combined).toContain("Read checkpoint only");
    expect(combined).toContain("summary-only result");
    expect(combined).toContain("eventPreview.notWritten: true");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No generic rollback command");
    expect(combined).toContain("No raw content event payload");
    expect(combined).toContain("No Git/shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "app-approved-user-workspace-rollback-command-v0.11.md"
    );
  });

  it("documents the P0O-006 approved execution flow and replay surface", async () => {
    const flowDoc = await readFile(
      path.join(repoRoot, "docs", "app-approved-execution-flow-v0.11.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${flowDoc}\n${docsIndex}`;

    expect(combined).toContain("App Approved Execution Flow v0.11");
    expect(combined).toContain("DW-P0O-006");
    expect(combined).toContain("Apply Approved Patch");
    expect(combined).toContain("Rollback Approved Patch");
    expect(combined).toContain("summary-only execution events");
    expect(combined).toContain("user_workspace.patch_apply.app_executed");
    expect(combined).toContain("user_workspace.patch_rollback.app_executed");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("No generic command UI");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No production PermissionLease issuing");
    expect(combined).toContain("No raw content");
    expect(combined).toContain("No model call");
    expect(docsIndex).toContain("app-approved-execution-flow-v0.11.md");
  });

  it("documents the P0O-007 approved execution e2e smoke path", async () => {
    const smokeDoc = await readFile(
      path.join(repoRoot, "docs", "app-approved-execution-smoke.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${smokeDoc}\n${docsIndex}`;

    expect(combined).toContain("DW-P0O-007");
    expect(combined).toContain("docs/app-approved-execution-smoke.md");
    expect(combined).toContain("proposal import");
    expect(combined).toContain("summary event");
    expect(combined).toContain("rollback receipt");
    expect(combined).toContain("replay projection");
    expect(combined).toContain("user_workspace.patch_apply.app_executed");
    expect(combined).toContain("user_workspace.patch_rollback.app_executed");
    expect(combined).toContain(
      "app/test/fixtures/approved-execution-smoke-proposal.json"
    );
    expect(combined).toContain(
      "app/test/fixtures/approved-execution-temp-workspace.json"
    );
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No raw content");
    expect(docsIndex).toContain("app-approved-execution-smoke.md");
  });

  it("documents the v0.11 approved execution RC release boundary", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.11.0-app-approved-execution-mvp-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "app-approved-execution-manual-qa.md"),
      "utf8"
    );
    const rcChecklist = await readFile(
      path.join(repoRoot, "docs", "app-approved-execution-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const appSource = await readFile(
      path.join(repoRoot, "app", "src", "App.tsx"),
      "utf8"
    );
    const combined = `${releaseNotes}\n${manualQa}\n${rcChecklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(combined).toContain("v0.11.0-app-approved-execution-mvp-rc.1");
    expect(combined).toContain("App-side approved apply and rollback MVP");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain("App-side approved apply is available");
    expect(combined).toContain("App-side approved rollback is available");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("DeepSeek does not auto-apply");
    expect(combined).toContain("No auto-apply");
    expect(combined).toContain("No Git commit or push");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No broad PermissionLease");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("typed confirmation");
    expect(combined).toContain("approved execution receipt");
    expect(combined).toContain("Path guard");
    expect(combined).toContain("Secret and raw-content markers");
    expect(combined).toContain("checkpoint");
    expect(combined).toContain("rollback");
    expect(combined).toContain("replay");
    expect(combined).toContain("Convert Smoke");
    expect(combined).toContain("Approved Docs-only Apply");
    expect(combined).toContain("Event Log Apply Summary");
    expect(combined).toContain("Refresh events");
    expect(combined).toContain("Event Log Rollback Summary");
    expect(combined).toContain("Duplicate / Conflict Apply");
    expect(combined).toContain("raw content is written to events");
    expect(combined).toContain("pnpm install");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("GitHub Actions");
    expect(docsIndex).toContain(
      "release-notes-v0.11.0-app-approved-execution-mvp-rc.1.md"
    );
    expect(docsIndex).toContain("app-approved-execution-manual-qa.md");
    expect(docsIndex).toContain("app-approved-execution-rc-checklist.md");
    expect(rootReadme).toContain(
      "v0.11 App-side Approved Execution MVP RC status"
    );
    expect(appReadme).toContain("v0.11 App-side Approved Execution MVP RC");
    expect(appSource).toContain("Human approved / narrow write path");
    expect(appSource).toContain("Apply Approved Patch");
    expect(appSource).toContain("Rollback Approved Patch");
    expect(appSource).toContain("Call DeepSeek (disabled)");
    expect(appSource).toContain("Run Evaluation (disabled)");
    expect(appSource).not.toContain("DeepSeek auto-apply enabled");
    expect(appSource).not.toContain("Git execution works");
    expect(appSource).not.toContain("Shell execution works");
    expect(appSource).not.toContain("Native bridge is enabled");
    expect(appSource).not.toMatch(/>\s*Execute Run\s*</);
    expect(appSource).not.toMatch(/>\s*Commit\s*</);
  });

  it("documents the v0.11 post-release review and P0P git shell safe lanes roadmap", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.11-app-approved-execution-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(repoRoot, "docs", "p0p-git-shell-safe-lanes-roadmap.md"),
      "utf8"
    );
    const plan = await readFile(
      path.join(repoRoot, "docs", "p0p-001-git-shell-safe-lanes-plan.md"),
      "utf8"
    );
    const prompts = await readFile(
      path.join(repoRoot, "docs", "v0.12-git-shell-safe-lanes-mvp-prompts.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${plan}\n${prompts}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain("v0.11.0-app-approved-execution-mvp-rc.1");
    expect(combined).toContain("App-side approved apply and rollback MVP");
    expect(combined).toContain("P0O is complete");
    expect(combined).toContain("P0P: Git / Shell Safe Lanes MVP");
    expect(combined).toContain("Git / Shell Safe Lanes MVP");
    expect(combined).toContain("Git is available only as fixed read-only");
    expect(combined).toContain("shell is available only as fixed verification");
    expect(combined).toContain("status_summary");
    expect(combined).toContain("diff_summary");
    expect(combined).toContain("log_summary");
    expect(combined).toContain("branch_summary");
    expect(combined).toContain("pnpm.typecheck");
    expect(combined).toContain("pnpm.lint");
    expect(combined).toContain("pnpm.test.scoped");
    expect(combined).toContain("cargo.check_tauri");
    expect(combined).toContain("app.typecheck");
    expect(combined).toContain("No arbitrary command");
    expect(combined).toContain("No Git write command");
    expect(combined).toContain("No shell install command");
    expect(combined).toContain("No network command");
    expect(combined).toContain("No destructive command");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No EventStore writer");
    expect(combined).toContain("No user workspace mutation");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("No PermissionLease issuance");
    expect(combined).toMatch(/summary-only event payloads/i);
    expect(combined).toContain("Raw stdout/stderr");
    expect(combined).toContain("raw diff, raw source, raw preimage");
    expect(combined).toContain("DW-P0P-002");
    expect(docsIndex).toContain(
      "v0.11-app-approved-execution-postrelease-review.md"
    );
    expect(docsIndex).toContain("v0.12-git-shell-safe-lanes-mvp-prompts.md");
    expect(docsIndex).toContain("p0p-git-shell-safe-lanes-roadmap.md");
    expect(docsIndex).toContain("p0p-001-git-shell-safe-lanes-plan.md");
    expect(rootReadme).toContain("v0.12-git-shell-safe-lanes-mvp-prompts.md");
    expect(rootReadme).toContain("v0.12 Git / Shell Safe Lanes MVP RC status");
  });

  it("documents the P0P-002 Git and shell safe lanes ADR and implementation gate", async () => {
    const adr = await readFile(
      path.join(repoRoot, "docs", "adr", "0011-git-shell-safe-lanes.md"),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(repoRoot, "docs", "git-shell-safe-lanes-threat-model-v0.11.md"),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "git-shell-safe-lanes-implementation-gate-v0.11.md"
      ),
      "utf8"
    );
    const gitPlan = await readFile(
      path.join(repoRoot, "docs", "p0p-003-git-read-lanes-command-plan.md"),
      "utf8"
    );
    const shellPlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0p-004-shell-verification-allowlist-command-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${gitPlan}\n${shellPlan}\n${docsIndex}`;

    expect(combined).toContain("ADR 0011: Git / Shell Safe Lanes");
    expect(combined).toContain("fixed read-only lanes");
    expect(combined).toContain("fixed verification templates");
    expect(combined).toContain("No arbitrary command input");
    expect(combined).toContain("No command string passed to shell");
    expect(combined).toContain("No Git write command");
    expect(combined).toContain("No shell install command");
    expect(combined).toContain("No shell network command");
    expect(combined).toContain("No destructive shell command");
    expect(combined).toContain("Output is summary-only");
    expect(combined).toContain("Raw diff, raw stdout, and raw stderr");
    expect(combined).toContain("EventStore");
    expect(combined).toContain("Agent evidence refs");
    expect(combined).toContain("Context volatile tail summaries");
    expect(combined).toContain("controlled verification UI only");
    expect(combined).toContain("status_summary");
    expect(combined).toContain("diff_summary");
    expect(combined).toContain("log_summary");
    expect(combined).toContain("branch_summary");
    expect(combined).toContain("pnpm.typecheck");
    expect(combined).toContain("pnpm.lint");
    expect(combined).toContain("pnpm.test.scoped");
    expect(combined).toContain("cargo.check_tauri");
    expect(combined).toContain("app.typecheck");
    expect(combined).toContain("command injection");
    expect(combined).toContain("shell metacharacters");
    expect(combined).toMatch(/path\s+traversal/);
    expect(combined).toContain("unsafe cwd");
    expect(combined).toContain("Git write command bypass");
    expect(combined).toContain("output leakage");
    expect(combined).toMatch(/API key leakage\s+in stdout\/stderr/);
    expect(combined).toMatch(/raw diff leakage/);
    expect(combined).toMatch(/long output \/ memory exhaustion/);
    expect(combined).toContain("process hang");
    expect(combined).toContain("Windows path issues");
    expect(combined).toMatch(
      /workspace symlink \/\s+junction \/ reparse point/
    );
    expect(combined).toContain("Every item below must be testable");
    expect(combined).toContain("command template safety");
    expect(combined).toContain("argv safety");
    expect(combined).toContain("cwd safety");
    expect(combined).toContain("pathspec safety");
    expect(combined).toContain("output redaction");
    expect(combined).toContain("timeout safety");
    expect(combined).toContain("event safety");
    expect(combined).toContain("replay safety");
    expect(combined).toContain("UI safety");
    expect(combined).toContain("boundary checker safety");
    expect(combined).toContain("No generic Git runner");
    expect(combined).toContain("No arbitrary shell command");
    expect(combined).toContain("rawDiffIncluded: false");
    expect(combined).toContain("rawStdoutIncluded: false");
    expect(combined).toContain("rawStderrIncluded: false");
    expect(docsIndex).toContain("adr/0011-git-shell-safe-lanes.md");
    expect(docsIndex).toContain("git-shell-safe-lanes-threat-model-v0.11.md");
    expect(docsIndex).toContain(
      "git-shell-safe-lanes-implementation-gate-v0.11.md"
    );
    expect(docsIndex).toContain("p0p-003-git-read-lanes-command-plan.md");
    expect(docsIndex).toContain(
      "p0p-004-shell-verification-allowlist-command-plan.md"
    );
  });

  it("documents verification summary events and replay projection surfaces", async () => {
    const summaryEvents = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-verification-summary-events-v0.12.md"
      ),
      "utf8"
    );
    const replayProjection = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-verification-replay-projection-v0.12.md"
      ),
      "utf8"
    );
    const smoke = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-approved-execution-verification-smoke-v0.12.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${summaryEvents}\n${replayProjection}\n${smoke}\n${docsIndex}`;

    expect(combined).toContain("git.read_lane.executed");
    expect(combined).toContain("shell.verification_lane.executed");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("Verification Replay Projection");
    expect(combined).toContain("latest verification status");
    expect(combined).toContain("Git changed file count");
    expect(combined).toContain("shell pass/fail status");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("approved receipt");
    expect(combined).toContain("apply approved docs patch");
    expect(combined).toContain("run Git status summary lane");
    expect(combined).toContain("run shell verification lane");
    expect(combined).toContain("rollback approved patch");
    expect(combined).toContain(
      "replay confirms apply, verification, and rollback"
    );
    expect(combined).toContain("No arbitrary shell");
    expect(combined).toContain("No Git write commands");
    expect(combined).toContain("No new Tauri command");
    expect(combined).toContain("No new EventStore writer");
    expect(combined).toContain("No App-side apply or rollback");
    expect(combined).toContain("No PermissionLease issuing");
    expect(combined).toContain("No native bridge or desktop action");
    expect(docsIndex).toContain(
      "app-shell-verification-summary-events-v0.12.md"
    );
    expect(docsIndex).toContain(
      "app-shell-verification-replay-projection-v0.12.md"
    );
    expect(docsIndex).toContain(
      "app-approved-execution-verification-smoke-v0.12.md"
    );
  });

  it("documents the v0.12 Git and shell safe lanes RC release boundary", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.12.0-git-shell-safe-lanes-mvp-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "git-shell-safe-lanes-manual-qa.md"),
      "utf8"
    );
    const rcChecklist = await readFile(
      path.join(repoRoot, "docs", "git-shell-safe-lanes-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const normalizedAppSource = appSource.replace(/\s+/g, " ");
    const combined = `${releaseNotes}\n${manualQa}\n${rcChecklist}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("v0.12.0-git-shell-safe-lanes-mvp-rc.1");
    expect(combined).toContain("Git and shell verification safe lanes MVP");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("App-side approved apply and rollback");
    expect(combined).toContain(
      "Git read lanes provide status, diff, log, and branch summaries only"
    );
    expect(combined).toContain(
      "Shell verification lanes run fixed allowlist templates only"
    );
    expect(combined).toContain(
      "Verification events are summary-only and replayable"
    );
    expect(combined).toContain("No arbitrary shell");
    expect(combined).toContain("No arbitrary Git");
    expect(combined).toContain("No Git write commands");
    expect(combined).toContain("No install, network, or destructive commands");
    expect(combined).toContain(
      "No raw stdout, raw stderr, or raw diff in events"
    );
    expect(combined).toContain("No DeepSeek auto-execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("fixed argv");
    expect(combined).toContain("No shell interpreter");
    expect(combined).toContain("Pathspec guard");
    expect(combined).toContain("Cwd guard");
    expect(combined).toContain("Timeout guards");
    expect(combined).toContain("Output truncation");
    expect(combined).toContain("Secret redaction");
    expect(combined).toContain("Convert Smoke");
    expect(combined).toContain("Approved Docs-only Apply");
    expect(combined).toContain("Git Status Summary");
    expect(combined).toContain("Git Diff Summary");
    expect(combined).toContain("Shell Verification Lane");
    expect(combined).toContain("Event Log Verification Summary");
    expect(combined).toContain("Rollback");
    expect(combined).toContain("Event Log Rollback Summary");
    expect(combined).toContain("Raw Output Absent");
    expect(combined).toContain("Arbitrary Command Absent");
    expect(combined).toContain("Git Write Command Absent");
    expect(combined).toContain("Local Scoped Command Gate");
    expect(combined).toContain("Full Stage-End Command Gate");
    expect(combined).toContain("Visual Smoke Gate");
    expect(combined).toContain("GitHub Actions");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Release / Tag Suggestion");
    expect(combined).toContain("Release Commands");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain("Known Limitations");
    expect(combined).toContain("full docs path links");
    expect(docsIndex).toContain(
      "release-notes-v0.12.0-git-shell-safe-lanes-mvp-rc.1.md"
    );
    expect(docsIndex).toContain("git-shell-safe-lanes-manual-qa.md");
    expect(docsIndex).toContain("git-shell-safe-lanes-rc-checklist.md");

    expect(appSource).toContain("Read-only / no Git writes");
    expect(appSource).toContain("Allowlist only / no arbitrary shell");
    expect(appSource).toContain("Summary events / no raw output");
    expect(appSource).toContain("Evidence refs / no raw output");
    expect(normalizedAppSource).toContain(
      "Runs a fixed read-only Git summary lane with fixed argv."
    );
    expect(normalizedAppSource).toContain(
      "Runs only fixed verification templates with fixed argv and no shell interpreter."
    );
    expect(appSource).toContain("Event log events");
    expect(appSource).not.toContain("DeepSeek auto-execution enabled");
    expect(appSource).not.toContain("Arbitrary Git enabled");
    expect(appSource).not.toContain("Arbitrary shell enabled");
    expect(appSource).not.toContain("Git write command enabled");
    expect(appSource).not.toContain("Native bridge is enabled");
    expect(appSource).not.toContain("Desktop action is enabled");
    expect(appSource).not.toMatch(/>\s*Execute\s*</);
    expect(appSource).not.toMatch(/>\s*Commit\s*</);
    expect(appSource).not.toMatch(/>\s*Push\s*</);
    expect(appSource).not.toMatch(/>\s*Install\s*</);
  });

  it("documents the v0.12 post-release review and P0Q app live proposal roadmap", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.12-git-shell-safe-lanes-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0q-app-live-proposal-generation-roadmap.md"
      ),
      "utf8"
    );
    const plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0q-001-app-live-proposal-generation-gate-plan.md"
      ),
      "utf8"
    );
    const prompts = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.13-app-live-proposal-generation-mvp-prompts.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${plan}\n${prompts}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain("v0.12.0-git-shell-safe-lanes-mvp-rc.1");
    expect(combined).toContain("Git and shell verification safe lanes MVP");
    expect(combined).toContain("P0P is complete");
    expect(combined).toContain("P0Q: App Live Proposal Generation MVP");
    expect(combined).toContain(
      "App can explicitly request live DeepSeek patch proposal generation"
    );
    expect(combined).toContain("Live proposal generation is opt-in only");
    expect(combined).toContain("App must not auto-apply");
    expect(combined).toContain("App must not write files from model output");
    expect(combined).toContain("App must not rollback from model output");
    expect(combined).toContain("App must not execute Git or shell");
    expect(combined).toContain(
      "schema / repair / validation / audit / approval"
    );
    expect(combined).toContain("approved apply / verification / rollback");
    expect(combined).toContain("no auto-apply");
    expect(combined).toContain("no model-driven file write");
    expect(combined).toContain("no model-driven rollback");
    expect(combined).toContain("no App-side Git write");
    expect(combined).toContain("no arbitrary shell");
    expect(combined).toContain("no broad PermissionLease");
    expect(combined).toContain("no native bridge");
    expect(combined).toContain("no desktop action");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No EventStore writer");
    expect(combined).toContain("No user workspace mutation");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No raw prompt persistence");
    expect(combined).toContain("No raw response persistence");
    expect(combined).toContain("No reasoning_content persistence");
    expect(combined).toContain("DW-P0Q-001");
    expect(combined).toContain("DW-P0Q-008");
    expect(docsIndex).toContain(
      "v0.13-app-live-proposal-generation-mvp-prompts.md"
    );
    expect(docsIndex).toContain(
      "v0.12-git-shell-safe-lanes-postrelease-review.md"
    );
    expect(docsIndex).toContain("p0q-app-live-proposal-generation-roadmap.md");
    expect(docsIndex).toContain(
      "p0q-001-app-live-proposal-generation-gate-plan.md"
    );
    expect(rootReadme).toContain(
      "v0.13 App Live Proposal Generation MVP RC status"
    );
  });

  it("documents the P0Q-001 app live proposal generation design gate", async () => {
    const adr = await readFile(
      path.join(
        repoRoot,
        "docs",
        "adr",
        "0011-app-live-proposal-generation-gate.md"
      ),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-live-proposal-generation-threat-model-v0.12.md"
      ),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-live-proposal-generation-implementation-gate-v0.12.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0q-002-app-live-proposal-session-receipt-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${nextPlan}\n${docsIndex}`;

    expect(combined).toContain("ADR 0011: App Live Proposal Generation Gate");
    expect(combined).toContain("Proposed / Accepted for P0Q design gate");
    expect(combined).toContain("explicit opt-in");
    expect(combined).toContain("session receipt");
    expect(combined).toContain("Session receipt is not a PermissionLease");
    expect(combined).toContain("model_patch_proposal");
    expect(combined).toContain("must not apply patches");
    expect(combined).toContain("must not rollback patches");
    expect(combined).toContain("must not write EventStore");
    expect(combined).toContain("must not execute Git");
    expect(combined).toContain("must not execute shell");
    expect(combined).toContain("raw prompt");
    expect(combined).toContain("raw response");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("schema validation");
    expect(combined).toContain("repair loop");
    expect(combined).toContain("patch proposal import");
    expect(combined).toContain("chain integration");
    expect(combined).toContain("validation preview");
    expect(combined).toContain("diff audit");
    expect(combined).toContain("approval draft");
    expect(combined).toContain("approved apply / rollback chain");
    expect(combined).toContain("API Key Leakage");
    expect(combined).toContain("Prompt Injection");
    expect(combined).toContain("Raw Prompt Leakage");
    expect(combined).toContain("Raw Response Leakage");
    expect(combined).toContain("Reasoning Content Leakage");
    expect(combined).toContain("Model Hallucination");
    expect(combined).toContain("Unsafe Path Generation");
    expect(combined).toContain("Malicious ContentDraft");
    expect(combined).toContain("App Live Call Bypass");
    expect(combined).toContain("Session Receipt Replay");
    expect(combined).toContain("Request Tampering");
    expect(combined).toContain("Response Tampering");
    expect(combined).toContain("Telemetry Leakage");
    expect(combined).toContain("Approval Bypass");
    expect(combined).toContain("Event Confusion");
    expect(combined).toContain("Windows Path Issues");
    expect(combined).toContain("API Key Boundary");
    expect(combined).toContain("Session Receipt Boundary");
    expect(combined).toContain("Request Boundary");
    expect(combined).toContain("Response Schema Boundary");
    expect(combined).toContain("Repair Fail-Closed Boundary");
    expect(combined).toContain("Redaction Boundary");
    expect(combined).toContain("App UI Boundary");
    expect(combined).toContain("No Auto-Apply Boundary");
    expect(combined).toContain("No Git / Shell Boundary");
    expect(combined).toContain("CI / Boundary Checker Gate");
    expect(combined).toContain("GENERATE LIVE PROPOSAL");
    expect(combined).toContain("proposal_generation_only");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No EventStore writer");
    expect(combined).toContain("No file write");
    expect(combined).toContain("No apply");
    expect(combined).toContain("No rollback");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "adr/0011-app-live-proposal-generation-gate.md"
    );
    expect(docsIndex).toContain(
      "app-live-proposal-generation-threat-model-v0.12.md"
    );
    expect(docsIndex).toContain(
      "app-live-proposal-generation-implementation-gate-v0.12.md"
    );
    expect(docsIndex).toContain(
      "p0q-002-app-live-proposal-session-receipt-plan.md"
    );
  });

  it("documents P0Q live proposal failure hardening without enabling execution", async () => {
    const docs = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-live-proposal-generation-failure-hardening-v0.13.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${docs}\n${docsIndex}`;

    expect(combined).toContain(
      "App Live Proposal Generation Failure Hardening v0.13"
    );
    expect(combined).toContain("Safe summary-only failure reporting");
    expect(combined).toContain("missing live proposal opt-in policy");
    expect(combined).toContain("missing live proposal session receipt");
    expect(combined).toContain("wrong typed confirmation");
    expect(combined).toContain("command failure");
    expect(combined).toContain("network timeout summary");
    expect(combined).toContain("malformed response");
    expect(combined).toContain("unsafe path");
    expect(combined).toContain("secret marker");
    expect(combined).toContain("reasoning_content dropped");
    expect(combined).toContain("repair failed");
    expect(combined).toContain("schema blocked");
    expect(combined).toContain("event write failure");
    expect(combined).toContain("raw prompt");
    expect(combined).toContain("raw response");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("API key values");
    expect(combined).toContain("No Auto-Apply");
    expect(combined).toContain("No App-side apply or rollback");
    expect(combined).toContain("No EventStore writer expansion");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "app-live-proposal-generation-failure-hardening-v0.13.md"
    );
  });

  it("documents the v0.13 App live proposal generation RC release boundary", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.13.0-app-live-proposal-generation-mvp-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "app-live-proposal-generation-manual-qa.md"),
      "utf8"
    );
    const rcChecklist = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-live-proposal-generation-rc-checklist.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const appSource = await readFile(
      path.join(repoRoot, "app", "src", "App.tsx"),
      "utf8"
    );
    const normalizedAppSource = appSource.replace(/\s+/g, " ");
    const combined = `${releaseNotes}\n${manualQa}\n${rcChecklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;
    const normalizedCombined = combined.replace(/\s+/g, " ");

    expect(combined).toContain("v0.13.0-app-live-proposal-generation-mvp-rc.1");
    expect(normalizedCombined).toContain(
      "App live DeepSeek proposal generation MVP, no auto-apply"
    );
    expect(normalizedCombined).toContain(
      "web_table_to_csv` Convert remains the real conversion flow"
    );
    expect(combined).toContain("Record Draft Event remains available");
    expect(normalizedCombined).toContain(
      "App can explicitly request live DeepSeek patch proposal generation"
    );
    expect(normalizedCombined).toContain(
      "Live proposal output enters repair/schema/import/chain integration"
    );
    expect(combined).toContain("App does not auto-apply");
    expect(normalizedCombined).toContain(
      "Approved apply/rollback still require human approval receipt and typed"
    );
    expect(normalizedCombined).toContain(
      "Git/shell verification safe lanes remain fixed and summary-only"
    );
    expect(combined).toContain("No autonomous coding loop");
    expect(combined).toContain("No model-driven file write");
    expect(combined).toContain("No broad PermissionLease");
    expect(combined).toContain("No arbitrary Git/shell");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain(
      "No raw prompt/response/reasoning/API key in events"
    );
    expect(combined).toContain("Explicit session receipt");
    expect(combined).toContain("Typed confirmation");
    expect(combined).toContain("API key source ref / resolver boundary");
    expect(combined).toContain("Fixed Tauri command");
    expect(combined).toContain("Summary-only request/response handling");
    expect(combined).toContain("Repair/schema validation");
    expect(combined).toContain("Proposal chain integration");
    expect(combined).toContain("Approval receipt before apply");
    expect(combined).toContain("Checkpoint/rollback");
    expect(combined).toContain("Summary-only events");
    expect(combined).toContain("Replay");
    expect(combined).toContain("Convert Smoke");
    expect(combined).toContain("Live Proposal Session Receipt");
    expect(combined).toContain("Live Proposal Request");
    expect(combined).toContain("Live Proposal Generation");
    expect(combined).toContain("Proposal Event Summary");
    expect(combined).toContain("Proposal Import / Chain Integration");
    expect(combined).toContain("Approved Apply");
    expect(combined).toContain("Verification Lanes");
    expect(combined).toContain("Rollback");
    expect(combined).toContain("Refresh / Replay");
    expect(combined).toContain("Duplicate Conflict");
    expect(combined).toContain("Raw Prompt / Response / API Key Absent");
    expect(combined).toContain("No Auto-Apply");
    expect(combined).toContain("No Arbitrary Git / Shell");
    expect(combined).toContain("Local Scoped Command Gate");
    expect(combined).toContain("Full Stage-End Command Gate");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("GitHub Actions Gate");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Release / Tag Suggestion");
    expect(combined).toContain("Release Commands");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain("Known Limitations");
    expect(combined).toContain("full docs path links");
    expect(combined).toContain(
      "docs/app-live-proposal-generation-manual-qa.md"
    );
    expect(docsIndex).toContain(
      "release-notes-v0.13.0-app-live-proposal-generation-mvp-rc.1.md"
    );
    expect(docsIndex).toContain("app-live-proposal-generation-manual-qa.md");
    expect(docsIndex).toContain("app-live-proposal-generation-rc-checklist.md");
    expect(rootReadme).toContain(
      "v0.13 App Live Proposal Generation MVP RC status"
    );
    expect(appReadme).toContain(
      "prepare the v0.13 App Live Proposal Generation MVP RC"
    );
    expect(appSource).toContain("Explicit opt-in / no auto-apply");
    expect(normalizedAppSource).toContain(
      "Raw prompt, raw response, reasoning_content, and API key values are not displayed or written to events."
    );
    expect(appSource).toContain("Record Live Proposal Summary Event");
    expect(appSource).not.toContain("DeepSeek auto-apply enabled");
    expect(appSource).not.toContain("Apply Live Proposal");
    expect(appSource).not.toContain("Rollback Live Proposal");
    expect(appSource).not.toContain("Approve Live Proposal");
    expect(appSource).not.toContain("Reject Live Proposal");
    expect(appSource).not.toContain("Native bridge is enabled");
    expect(appSource).not.toContain("Desktop action is enabled");
    expect(appSource).not.toMatch(/>\s*Execute Run\s*</);
    expect(appSource).not.toMatch(/>\s*Commit\s*</);
    expect(appSource).not.toMatch(/>\s*Push\s*</);
  });

  it("documents the v0.14 E2E coding task MVP RC release boundary", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.14.0-end-to-end-coding-task-mvp-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "e2e-coding-task-manual-qa.md"),
      "utf8"
    );
    const rcChecklist = await readFile(
      path.join(repoRoot, "docs", "e2e-coding-task-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const appSource = await readFile(
      path.join(repoRoot, "app", "src", "App.tsx"),
      "utf8"
    );
    const combined = `${releaseNotes}\n${manualQa}\n${rcChecklist}\n${docsIndex}\n${rootReadme}\n${appReadme}`;
    const normalizedCombined = combined.replace(/\s+/g, " ");
    const normalizedAppSource = appSource.replace(/\s+/g, " ");

    expect(combined).toContain("v0.14.0-end-to-end-coding-task-mvp-rc.1");
    expect(normalizedCombined).toContain("End-to-end DeepSeek coding task MVP");
    expect(combined).toContain(
      "web_table_to_csv` Convert remains the real conversion flow"
    );
    expect(combined).toContain(
      "App can request live DeepSeek proposal generation with explicit opt-in"
    );
    expect(combined).toContain(
      "Generated proposal enters repair/schema/import/chain preview"
    );
    expect(combined).toContain("Human approval receipt and typed confirmation");
    expect(combined).toContain("Approved apply writes only safe paths");
    expect(combined).toContain(
      "Git/shell verification lanes are fixed and bounded"
    );
    expect(combined).toContain("Rollback is available from checkpoint");
    expect(combined).toContain(
      "Summary-only events/replay reconstruct the flow"
    );
    expect(combined).toContain("No auto-apply");
    expect(combined).toContain("No autonomous coding loop");
    expect(combined).toContain("No arbitrary Git/shell");
    expect(combined).toContain("No broad PermissionLease");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain(
      "No raw prompt/response/reasoning/API key in events"
    );
    expect(combined).toContain("No raw source/diff/preimage in event payloads");
    expect(combined).toContain("Human approval");
    expect(combined).toContain("Typed confirmation");
    expect(combined).toContain("Path guard");
    expect(combined).toContain("Content/secret guard");
    expect(combined).toContain("Checkpoint");
    expect(combined).toContain("Verification");
    expect(combined).toContain("Summary-only events");
    expect(combined).toContain("Replay");
    expect(combined).toContain("Failure recovery");
    expect(combined).toContain("Convert Smoke");
    expect(combined).toContain("Live Proposal Request With Explicit Opt-in");
    expect(combined).toContain("Import Proposal");
    expect(combined).toContain("Approval Receipt");
    expect(combined).toContain("Approved Apply");
    expect(combined).toContain("Git/Shell Verification");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("Raw Content Absent");
    expect(combined).toContain("No Arbitrary Git/Shell");
    expect(combined).toContain("Local Scoped Command Gate");
    expect(combined).toContain("Full Stage-End Command Gate");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("GitHub Actions Gate");
    expect(combined).toContain("Generated Artifacts");
    expect(combined).toContain("Release / Tag Suggestion");
    expect(combined).toContain("Release Commands");
    expect(combined).toContain("Rollback Guidance");
    expect(combined).toContain("Known Limitations");
    expect(combined).toContain("full docs path links");
    expect(combined).toContain("docs/e2e-coding-task-manual-qa.md");
    expect(docsIndex).toContain(
      "release-notes-v0.14.0-end-to-end-coding-task-mvp-rc.1.md"
    );
    expect(docsIndex).toContain("e2e-coding-task-manual-qa.md");
    expect(docsIndex).toContain("e2e-coding-task-rc-checklist.md");
    expect(rootReadme).toContain("v0.14 End-to-End Coding Task MVP status");
    expect(rootReadme).toContain("P0R is complete for the v0.14 RC");
    expect(appReadme).toContain(
      "prepare the v0.14 End-to-End Coding Task MVP RC"
    );
    expect(appSource).toContain("End-to-End Coding Task Wizard");
    expect(appSource).toContain("Guided flow / no auto-apply");
    expect(appSource).toContain(
      "End-to-End Apply / Verify / Rollback Sequencer"
    );
    expect(appSource).toContain("Approved gates only / no arbitrary execution");
    expect(appSource).toContain("E2E Task Recovery");
    expect(appSource).toContain("Safe recovery / no auto-retry execution");
    expect(normalizedAppSource).toContain(
      "No prompt is assembled and no model request is sent."
    );
    expect(normalizedAppSource).toContain(
      "No capability is invoked and no permission lease is issued."
    );
    expect(appSource).not.toContain("Auto Apply Task");
    expect(appSource).not.toContain("Run Arbitrary Shell");
    expect(appSource).not.toContain("Run Git Write");
  });

  it("documents the v0.14 post-release review and P0S hardening roadmap", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.14-end-to-end-coding-task-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(repoRoot, "docs", "p0s-mvp-hardening-recovery-roadmap.md"),
      "utf8"
    );
    const plan = await readFile(
      path.join(repoRoot, "docs", "p0s-001-mvp-hardening-recovery-plan.md"),
      "utf8"
    );
    const prompts = await readFile(
      path.join(repoRoot, "docs", "v0.15-mvp-hardening-recovery-prompts.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${plan}\n${prompts}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain("v0.14.0-end-to-end-coding-task-mvp-rc.1");
    expect(combined).toContain("End-to-end DeepSeek coding task MVP");
    expect(combined).toContain("P0S MVP Hardening / Recovery");
    expect(combined).toContain("harden the v0.14 MVP flow");
    expect(combined).toContain("E2E golden regression");
    expect(combined).toContain("stale snapshot");
    expect(combined).toContain("conflict handling");
    expect(combined).toContain("apply/rollback failure recovery");
    expect(combined).toContain("Event replay and audit timeline hardening");
    expect(combined).toContain("manual QA and release smoke");
    expect(combined).toContain("Build/package warnings");
    expect(combined).toContain("Convert");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain("App live proposal generation");
    expect(combined).toContain("repair/schema/import/chain preview");
    expect(combined).toContain("approval receipt");
    expect(combined).toContain("typed confirmation");
    expect(combined).toContain("approved apply");
    expect(combined).toContain("Git/shell safe verification lanes");
    expect(combined).toContain("rollback from checkpoint");
    expect(combined).toContain("summary-only events/replay");
    expect(combined).toContain("No live DeepSeek call in P0S-001");
    expect(combined).toContain("No API key read in P0S-001");
    expect(combined).toContain("No fetch/network in P0S-001");
    expect(combined).toContain("No apply");
    expect(combined).toContain("No rollback");
    expect(combined).toContain("No EventStore writer");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No arbitrary Git execution");
    expect(combined).toContain("No arbitrary shell execution");
    expect(combined).toContain("No broad PermissionLease");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("raw prompt");
    expect(combined).toContain("raw response");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("API key");
    expect(combined).toContain("raw source");
    expect(combined).toContain("raw diff");
    expect(combined).toContain("raw preimage");
    expect(docsIndex).toContain("v0.15-mvp-hardening-recovery-prompts.md");
    expect(docsIndex).toContain(
      "v0.14-end-to-end-coding-task-postrelease-review.md"
    );
    expect(docsIndex).toContain("p0s-mvp-hardening-recovery-roadmap.md");
    expect(docsIndex).toContain("p0s-001-mvp-hardening-recovery-plan.md");
    expect(rootReadme).toContain("v0.15 MVP Hardening / Recovery status");
    expect(rootReadme).toContain(
      "P0S is complete for the v0.15 RC as a hardening and recovery phase"
    );
  });

  it("documents the v0.15 post-release review and P0T production memory roadmap", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.15-mvp-hardening-recovery-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0t-production-memory-project-knowledge-roadmap.md"
      ),
      "utf8"
    );
    const plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0t-001-production-memory-project-knowledge-plan.md"
      ),
      "utf8"
    );
    const prompts = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.16-production-memory-project-knowledge-prompts.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(
      path.join(repoRoot, "app", "README.md"),
      "utf8"
    );
    const combined = `${review}\n${roadmap}\n${plan}\n${prompts}\n${docsIndex}\n${rootReadme}\n${appReadme}`;

    expect(combined).toContain("v0.15.0-mvp-hardening-recovery-rc.1");
    expect(combined).toContain("MVP hardening, recovery, and E2E regression");
    expect(combined).toContain("P0T Production Memory / Project Knowledge");
    expect(combined).toContain("Production Memory / Project Knowledge MVP");
    expect(combined).toContain("policy");
    expect(combined).toContain("project_fact");
    expect(combined).toContain("pitfall");
    expect(combined).toContain("candidate");
    expect(combined).toContain("human review");
    expect(combined).toContain("commit");
    expect(combined).toContain("recall");
    expect(combined).toContain("revoke");
    expect(combined).toContain("expire");
    expect(combined).toContain("replay");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("workspace-local");
    expect(combined).toContain("persistent");
    expect(combined).toContain("No runtime feature implementation in P0T-001");
    expect(combined).toContain("No App UI implementation in P0T-001");
    expect(combined).toContain("No Tauri command in P0T-001");
    expect(combined).toContain("No memory store write in P0T-001");
    expect(combined).toContain("No API key read in P0T-001");
    expect(combined).toContain("No fetch/network in P0T-001");
    expect(combined).toContain("No apply");
    expect(combined).toContain("No rollback");
    expect(combined).toContain("No arbitrary Git execution");
    expect(combined).toContain("No arbitrary shell execution");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("raw prompt");
    expect(combined).toContain("raw source");
    expect(combined).toContain("raw diff");
    expect(combined).toContain("API key");
    expect(combined).toContain("model-direct policy write");
    expect(combined).toContain("automatic memory commit");
    expect(docsIndex).toContain(
      "v0.16-production-memory-project-knowledge-prompts.md"
    );
    expect(docsIndex).toContain(
      "v0.15-mvp-hardening-recovery-postrelease-review.md"
    );
    expect(docsIndex).toContain(
      "p0t-production-memory-project-knowledge-roadmap.md"
    );
    expect(docsIndex).toContain(
      "p0t-001-production-memory-project-knowledge-plan.md"
    );
    expect(rootReadme).toContain(
      "v0.16 Production Memory / Project Knowledge status"
    );
    expect(appReadme).toContain(
      "lock the P0T Production Memory / Project Knowledge roadmap"
    );
  });

  it("documents the P0T-001 production memory project knowledge design gate", async () => {
    const adr = await readFile(
      path.join(
        repoRoot,
        "docs",
        "adr",
        "0011-production-memory-project-knowledge.md"
      ),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(repoRoot, "docs", "production-memory-threat-model-v0.15.md"),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "production-memory-implementation-gate-v0.15.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0t-002-project-knowledge-store-contract-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${nextPlan}\n${docsIndex}`;

    expect(combined).toContain(
      "ADR 0011: Production Memory / Project Knowledge"
    );
    expect(combined).toContain("Proposed / Accepted for P0T design gate");
    expect(combined).toContain("workspace-local and persistent");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("policy");
    expect(combined).toContain("project_fact");
    expect(combined).toContain("pitfall");
    expect(combined).toContain("candidate");
    expect(combined).toContain("reviewed");
    expect(combined).toContain("committed");
    expect(combined).toContain("recalled");
    expect(combined).toContain("revoked");
    expect(combined).toContain("expired");
    expect(combined).toContain("Policy memory requires a human trusted source");
    expect(combined).toContain("Project facts require evidence refs");
    expect(combined).toContain("Pitfalls require trigger and mitigation");
    expect(combined).toContain("Model output may propose memory candidates");
    expect(combined).toContain("it cannot commit memory");
    expect(combined).toContain("Tool\noutput may propose memory candidates");
    expect(combined).toContain("it cannot commit policy memory");
    expect(combined).toContain(
      "App commit and revoke actions must be explicit"
    );
    expect(combined).toContain("Memory recall must be visible");
    expect(combined).toContain("audit surface");
    expect(combined).toContain("prompt injection creating fake memory");
    expect(combined).toContain("model hallucination stored as fact");
    expect(combined).toContain("stale project fact");
    expect(combined).toContain("wrong policy persistence");
    expect(combined).toContain("policy poisoning");
    expect(combined).toContain("secret leakage");
    expect(combined).toContain("raw source leakage");
    expect(combined).toContain("raw diff leakage");
    expect(combined).toContain("raw prompt leakage");
    expect(combined).toContain("API key leakage");
    expect(combined).toContain("tool output poisoning");
    expect(combined).toContain("external source poisoning");
    expect(combined).toContain("over-recall");
    expect(combined).toContain("memory interfering with patch safety");
    expect(combined).toContain("revoke/expire bypass");
    expect(combined).toContain("replay mismatch");
    expect(combined).toContain("filesystem corruption of memory store");
    expect(combined).toContain("Schema safety tests");
    expect(combined).toContain("Storage safety tests");
    expect(combined).toContain("Candidate safety tests");
    expect(combined).toContain("Commit safety tests");
    expect(combined).toContain("Policy source safety tests");
    expect(combined).toContain("Evidence and provenance safety tests");
    expect(combined).toContain("Revoke and expire safety tests");
    expect(combined).toContain("Recall safety tests");
    expect(combined).toContain("Context integration safety tests");
    expect(combined).toContain("Event and replay safety tests");
    expect(combined).toContain("App UI safety tests");
    expect(combined).toContain("CI and boundary checks");
    expect(combined).toContain("JSONL");
    expect(combined).toContain("append-only");
    expect(combined).toContain("No Tauri command in P0T-002");
    expect(combined).toContain("No App UI feature in P0T-002");
    expect(combined).toContain("No file write implementation");
    expect(combined).toContain("No memory store mutation");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No apply");
    expect(combined).toContain("No rollback");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "adr/0011-production-memory-project-knowledge.md"
    );
    expect(docsIndex).toContain("production-memory-threat-model-v0.15.md");
    expect(docsIndex).toContain(
      "production-memory-implementation-gate-v0.15.md"
    );
    expect(docsIndex).toContain(
      "p0t-002-project-knowledge-store-contract-plan.md"
    );
  });

  it("documents the P0T-002 project knowledge store contract", async () => {
    const runtimeDoc = await readFile(
      path.join(repoRoot, "docs", "runtime-project-knowledge-store-v0.15.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${docsIndex}`;

    expect(combined).toContain(
      "Runtime Project Knowledge Store Contract v0.15"
    );
    expect(combined).toContain("summary-only project knowledge entries");
    expect(combined).toContain("policy");
    expect(combined).toContain("project_fact");
    expect(combined).toContain("pitfall");
    expect(combined).toContain("entries.jsonl");
    expect(combined).toContain("events.jsonl");
    expect(combined).toContain("index.json");
    expect(combined).toContain("append-only");
    expect(combined).toContain("workspace-local");
    expect(combined).toContain(
      "policy from model, tool, or external unreviewed source"
    );
    expect(combined).toContain("project fact without evidence refs");
    expect(combined).toContain("pitfall without trigger or mitigation");
    expect(combined).toContain("duplicate entry id in a snapshot");
    expect(combined).toContain("canWriteStore: false");
    expect(combined).toContain("canWriteEventStore: false");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No App UI");
    expect(combined).toContain("No file write implementation");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No apply/rollback");
    expect(combined).toContain("No Git/shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("runtime-project-knowledge-store-v0.15.md");
  });

  it("documents the P0T-003 App Tauri project knowledge store commands", async () => {
    const appTauriDoc = await readFile(
      path.join(repoRoot, "docs", "app-tauri-project-knowledge-store-v0.15.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${appTauriDoc}\n${docsIndex}`;

    expect(combined).toContain("App / Tauri Project Knowledge Store v0.15");
    expect(combined).toContain("project_knowledge_list");
    expect(combined).toContain("project_knowledge_commit_candidate");
    expect(combined).toContain("project_knowledge_revoke");
    expect(combined).toContain("project_knowledge_expire");
    expect(combined).toContain("No generic filesystem writer");
    expect(combined).toContain("No generic EventStore writer");
    expect(combined).toContain("entries.jsonl");
    expect(combined).toContain("events.jsonl");
    expect(combined).toContain("index.json");
    expect(combined).toContain("append-only");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("Corrupt JSONL lines are skipped");
    expect(combined).toContain("REVOKE PROJECT KNOWLEDGE");
    expect(combined).toContain("No App-side apply");
    expect(combined).toContain("No App-side rollback");
    expect(combined).toContain("No PermissionLease issuance");
    expect(combined).toContain("No Git/shell execution");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("app-tauri-project-knowledge-store-v0.15.md");
  });

  it("builds a human-reviewed project_fact candidate that can commit", () => {
    const view = buildProjectKnowledgeReviewView({
      workspaceRoot: "D:/workspace",
      typedConfirmation: "COMMIT PROJECT KNOWLEDGE",
      candidateForm: {
        type: "project_fact",
        namespace: "project",
        summary: "Use summary-only project knowledge for later recall.",
        evidenceRefsText:
          "user-request | manual_note | User approved this summary fact | abc12345abc12345",
        tagsText: "memory, project",
        trustLevel: "high",
        trustScore: 0.9,
        humanReviewed: true,
        reviewedBy: "manual_user_preview",
        sourceKind: "human_reviewed",
        factKind: "project_boundary"
      }
    });

    expect(view.status).toBe("candidate_ready");
    expect(view.readiness.canCommitCandidate).toBe(true);
    expect(view.readiness.canAutoCommitFromModel).toBe(false);
    expect(view.readiness.canAutoCommitFromTool).toBe(false);
    expect(view.readiness.canRunMemoryTriggeredApply).toBe(false);
    expect(view.readiness.canApplyPatch).toBe(false);
    expect(view.readiness.canRollback).toBe(false);
    expect(view.candidate?.type).toBe("project_fact");
    expect(view.candidateSummary?.summaryOnly).toBe(true);
  });

  it("blocks unsafe or insufficient project knowledge candidates", () => {
    const base = {
      workspaceRoot: "D:/workspace",
      typedConfirmation: "COMMIT PROJECT KNOWLEDGE",
      candidateForm: {
        type: "project_fact" as const,
        namespace: "project",
        summary: "Summary-only fact.",
        evidenceRefsText:
          "user-request | manual_note | User approved this summary fact | abc12345abc12345",
        tagsText: "memory",
        trustLevel: "high" as const,
        trustScore: 0.9,
        humanReviewed: true,
        reviewedBy: "manual_user_preview",
        sourceKind: "human_reviewed" as const,
        factKind: "project_boundary"
      }
    };
    const pitfall = buildProjectKnowledgeReviewView({
      ...base,
      candidateForm: {
        ...base.candidateForm,
        type: "pitfall",
        triggerSummary: "",
        mitigationSummary: "",
        severity: "medium"
      }
    });
    const policy = buildProjectKnowledgeReviewView({
      ...base,
      typedConfirmation: "COMMIT PROJECT POLICY",
      candidateForm: {
        ...base.candidateForm,
        type: "policy",
        sourceKind: "model_suggested",
        policyScope: "project"
      }
    });
    const secretMarker = buildProjectKnowledgeReviewView({
      ...base,
      candidateForm: {
        ...base.candidateForm,
        summary: `Do not store ${"sk"}-fakeProjectKnowledgeValue`
      }
    });

    expect(pitfall.status).toBe("blocked");
    expect(pitfall.findings.map((finding) => finding.code)).toContain(
      "PITFALL_REQUIRES_TRIGGER"
    );
    expect(policy.status).toBe("blocked");
    expect(policy.findings.map((finding) => finding.code)).toContain(
      "POLICY_SOURCE_MUST_BE_HUMAN_REVIEWED"
    );
    expect(secretMarker.status).toBe("blocked");
    expect(secretMarker.findings.map((finding) => finding.code)).toContain(
      "API_KEY_MARKER"
    );
  });

  it("keeps the Project Knowledge App surface fixed-command and summary-only", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "project-knowledge-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}`;

    expect(appSource).toContain("Project Knowledge");
    expect(appSource).toContain("Human reviewed / summary-only");
    expect(appSource).toContain("Refresh Project Knowledge");
    expect(appSource).toContain("Preview Knowledge Candidate");
    expect(appSource).toContain("Commit Project Knowledge");
    expect(appSource).toContain("Revoke Project Knowledge");
    expect(appSource).toContain("Expire Project Knowledge");
    expect(combined).toContain("COMMIT PROJECT POLICY");
    expect(combined).toContain("COMMIT PROJECT KNOWLEDGE");
    expect(appSource).toContain("REVOKE PROJECT KNOWLEDGE");
    expect(appSource).toContain("browser storage");
    expect(appSource).toContain("listProjectKnowledge");
    expect(appSource).toContain("commitProjectKnowledgeCandidate");
    expect(appSource).toContain("revokeProjectKnowledgeEntry");
    expect(appSource).toContain("expireProjectKnowledgeEntry");
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toContain("invokeAllowedCommand");
    expect(combined).not.toContain("autoCommitProjectKnowledge");
    expect(combined).not.toContain("memoryTriggeredApply");
    expect(combined).not.toContain("writeProjectKnowledgeEventStoreRaw");
    expect(combined).not.toContain("projectKnowledgeGenericInvoke");
  });

  it("documents the P0T-004 App project knowledge review surface", async () => {
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-project-knowledge-review-v0.15.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${appDoc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("App Shell Project Knowledge Review v0.15");
    expect(combined).toContain("human-reviewed");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("project_knowledge_list");
    expect(combined).toContain("project_knowledge_commit_candidate");
    expect(combined).toContain("project_knowledge_revoke");
    expect(combined).toContain("project_knowledge_expire");
    expect(combined).toContain("COMMIT PROJECT POLICY");
    expect(combined).toContain("COMMIT PROJECT KNOWLEDGE");
    expect(combined).toContain("REVOKE PROJECT KNOWLEDGE");
    expect(combined).toContain("No automatic commit from model output");
    expect(combined).toContain("No automatic commit from tool output");
    expect(combined).toContain("No memory-triggered apply");
    expect(combined).toContain("No localStorage/sessionStorage");
    expect(combined).toContain("No Git/shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("app-shell-project-knowledge-review-v0.15.md");
  });

  it("previews Project Knowledge Recall with include and exclude state only", () => {
    const snapshot = {
      ok: true as const,
      status: "ready" as const,
      storePath: "workspace/.deepseek-workbench/project-knowledge",
      entriesPath:
        "workspace/.deepseek-workbench/project-knowledge/entries.jsonl",
      eventsPath:
        "workspace/.deepseek-workbench/project-knowledge/events.jsonl",
      indexPath: "workspace/.deepseek-workbench/project-knowledge/index.json",
      entryCount: 1,
      activeEntryCount: 1,
      revokedEntryCount: 0,
      expiredEntryCount: 0,
      entries: [
        {
          entryId: "pk-include-1",
          type: "project_fact" as const,
          namespace: "deepseek-gui",
          summary: "Unrelated but safe summary-only project knowledge.",
          status: "committed",
          evidenceRefCount: 1,
          tagCount: 1,
          entryHash: "entryhash123",
          warningCodes: [],
          summaryOnly: true as const
        }
      ],
      warnings: [],
      snapshotHash: "snap123",
      summaryOnly: true as const,
      rawContentIncluded: false as const,
      safeMessage: "Project knowledge snapshot loaded."
    };
    const review = buildProjectKnowledgeReviewView({
      workspaceRoot: "D:\\workspace",
      snapshot
    });
    const included = buildProjectKnowledgeRecallView({
      projectKnowledgeReview: review,
      taskObjective: "Prepare an unrelated task.",
      intent: "code_change",
      includeEntryIdsText: "pk-include-1"
    });
    const excluded = buildProjectKnowledgeRecallView({
      projectKnowledgeReview: review,
      taskObjective: "Prepare an unrelated task.",
      intent: "code_change",
      includeEntryIdsText: "pk-include-1",
      excludeEntryIdsText: "pk-include-1"
    });

    expect(included.status).toBe("recall_ready");
    expect(included.matchedEntryCount).toBe(1);
    expect(included.includeEntryIds).toEqual(["pk-include-1"]);
    expect(included.readiness.canCommitMemory).toBe(false);
    expect(included.readiness.canApplyPatch).toBe(false);
    expect(excluded.status).toBe("empty");
    expect(excluded.matchedEntryCount).toBe(0);
    expect(excluded.excludeEntryIds).toEqual(["pk-include-1"]);
  });

  it("feeds Project Knowledge Recall refs into Context Assembly summaries", () => {
    const runDraft = buildRunDraftView({
      objectiveDraft:
        "Use project knowledge recall for Tauri command wrappers.",
      selectedIntent: "code_change",
      acceptanceCriteriaDraft: "Summary refs only",
      workspaceRoot: "D:\\workspace"
    });
    const snapshot = {
      ok: true as const,
      status: "ready" as const,
      storePath: "workspace/.deepseek-workbench/project-knowledge",
      entriesPath:
        "workspace/.deepseek-workbench/project-knowledge/entries.jsonl",
      eventsPath:
        "workspace/.deepseek-workbench/project-knowledge/events.jsonl",
      indexPath: "workspace/.deepseek-workbench/project-knowledge/index.json",
      entryCount: 1,
      activeEntryCount: 1,
      revokedEntryCount: 0,
      expiredEntryCount: 0,
      entries: [
        {
          entryId: "pk-context-1",
          type: "project_fact" as const,
          namespace: "deepseek-gui",
          summary: "Project knowledge recall supports Tauri command wrappers.",
          status: "committed",
          evidenceRefCount: 1,
          tagCount: 1,
          entryHash: "entryhash456",
          warningCodes: [],
          summaryOnly: true as const
        }
      ],
      warnings: [],
      snapshotHash: "snap456",
      summaryOnly: true as const,
      rawContentIncluded: false as const,
      safeMessage: "Project knowledge snapshot loaded."
    };
    const projectKnowledgeRecallPreview = buildProjectKnowledgeRecallView({
      projectKnowledgeReview: buildProjectKnowledgeReviewView({
        workspaceRoot: "D:\\workspace",
        snapshot
      }),
      taskObjective: "Use project knowledge recall for Tauri command wrappers.",
      intent: runDraft.intent,
      tagsText: "project-knowledge"
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      projectKnowledgeRecallPreview
    });
    const recallSegment = contextPreview.segments.find(
      (segment) => segment.sourceKind === "project_knowledge_recall"
    );
    const serialized = JSON.stringify(contextPreview);

    expect(projectKnowledgeRecallPreview.status).toBe("recall_ready");
    expect(recallSegment).toMatchObject({
      layer: "volatile_tail",
      placement: "volatile_tail",
      sourceKind: "project_knowledge_recall"
    });
    expect(serialized).not.toContain("Project knowledge recall supports");
    expect(serialized).not.toContain("rawPrompt");
  });

  it("smokes a knowledge-informed docs-index task without unsafe memory writes", () => {
    const workspaceRoot = "D:\\workspace";
    const committedSnapshot = {
      ok: true as const,
      status: "ready" as const,
      storePath: "workspace/.deepseek-workbench/project-knowledge",
      entriesPath:
        "workspace/.deepseek-workbench/project-knowledge/entries.jsonl",
      eventsPath:
        "workspace/.deepseek-workbench/project-knowledge/events.jsonl",
      indexPath: "workspace/.deepseek-workbench/project-knowledge/index.json",
      entryCount: 2,
      activeEntryCount: 2,
      revokedEntryCount: 0,
      expiredEntryCount: 0,
      entries: [
        {
          entryId: "pk-fact-convert",
          type: "project_fact" as const,
          namespace: "deepseek-gui",
          summary:
            "Convert remains the real web_table_to_csv flow during memory smoke.",
          status: "committed",
          evidenceRefCount: 1,
          tagCount: 1,
          entryHash: "facthashp0t",
          warningCodes: [],
          summaryOnly: true as const
        },
        {
          entryId: "pk-pitfall-docs-index",
          type: "pitfall" as const,
          namespace: "deepseek-gui",
          summary:
            "When verification fails because docs index is missing, update docs/README.md with the new docs file.",
          status: "committed",
          evidenceRefCount: 1,
          tagCount: 1,
          entryHash: "pitfallhashp0t",
          warningCodes: [],
          summaryOnly: true as const
        }
      ],
      warnings: [],
      snapshotHash: "snapshotp0t007",
      summaryOnly: true as const,
      rawContentIncluded: false as const,
      safeMessage: "Project knowledge snapshot loaded."
    };
    const projectKnowledgeReview = buildProjectKnowledgeReviewView({
      workspaceRoot,
      snapshot: committedSnapshot
    });
    const runDraft = buildRunDraftView({
      objectiveDraft:
        "Add a project knowledge E2E smoke doc and update docs index.",
      selectedIntent: "documentation",
      acceptanceCriteriaDraft:
        "Recall the docs index pitfall and keep memory summary-only.",
      workspaceRoot
    });
    const recallPreview = buildProjectKnowledgeRecallView({
      projectKnowledgeReview,
      taskObjective:
        "Add a project knowledge E2E smoke doc and update docs index.",
      intent: runDraft.intent,
      tagsText: "docs,index,p0t",
      includeEntryIdsText: "pk-pitfall-docs-index"
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      projectKnowledgeRecallPreview: recallPreview
    });
    const importView = buildModelPatchProposalImportView({
      draftText: JSON.stringify({
        schemaVersion: "model_patch_proposal.v1",
        proposalId: "proposal-p0t-knowledge-smoke",
        title: "Project knowledge E2E smoke docs update",
        intent: "docs_update",
        operations: [
          {
            operationId: "op-doc",
            path: "docs/project-knowledge-e2e-smoke-v0.15.md",
            changeKind: "documentation",
            summary: "Add the project knowledge smoke doc.",
            rationale: "P0T-007 needs summary-only smoke documentation.",
            estimatedLinesAdded: 12,
            estimatedLinesRemoved: 0,
            warningCodes: []
          },
          {
            operationId: "op-index",
            path: "docs/README.md",
            changeKind: "documentation",
            summary: "Update docs index for the project knowledge smoke.",
            rationale: "Recalled pitfall requires docs index updates.",
            estimatedLinesAdded: 1,
            estimatedLinesRemoved: 0,
            warningCodes: []
          }
        ],
        pathSummaries: [
          {
            path: "docs/project-knowledge-e2e-smoke-v0.15.md",
            changeKind: "documentation",
            summary: "Project knowledge smoke documentation."
          },
          {
            path: "docs/README.md",
            changeKind: "documentation",
            summary: "Docs index entry for the smoke."
          }
        ],
        evidenceRefs: [
          {
            refId: "project-knowledge-recall",
            kind: "memory_summary",
            summary: "Project knowledge recall summary only.",
            hashPrefix: recallPreview.hashPrefix
          }
        ],
        riskNotes: [
          {
            code: "DOCS_ONLY",
            severity: "info",
            summary: "Docs-only smoke; no execution is enabled."
          }
        ],
        validationHints: ["Run app:test scoped smoke."],
        source: "deepseek_model_patch_proposal"
      }),
      sourceKind: "fixture"
    });
    const creationPreview =
      buildPatchProposalCreationPreviewFromModelImport(importView);
    const revokedReview = buildProjectKnowledgeReviewView({
      workspaceRoot,
      snapshot: {
        ...committedSnapshot,
        activeEntryCount: 1,
        revokedEntryCount: 1,
        entries: committedSnapshot.entries.map((entry) =>
          entry.entryId === "pk-pitfall-docs-index"
            ? { ...entry, status: "revoked" as const }
            : entry
        )
      }
    });
    const revokedRecall = buildProjectKnowledgeRecallView({
      projectKnowledgeReview: revokedReview,
      taskObjective:
        "Add a project knowledge E2E smoke doc and update docs index.",
      intent: runDraft.intent,
      tagsText: "docs,index,p0t"
    });
    const eventPanel = buildEventLogPanelModel(
      fixedEventSummary({
        eventCount: 4,
        displayedEventCount: 4,
        projectKnowledgeEventCount: 3,
        projectKnowledgeEntryCount: 2,
        latestProjectKnowledgeRecallSummary:
          "project knowledge recall used: docs index pitfall · 1 matches",
        typeCounts: {
          "project_knowledge.candidate_committed": 2,
          "project_knowledge.entry_revoked": 1,
          "project_knowledge.recall_used": 1
        },
        timeline: [
          {
            id: "pk-event-1",
            ts: "2026-06-30T00:00:00.000Z",
            type: "project_knowledge.candidate_committed",
            taskId: "project-knowledge",
            summary:
              "project knowledge candidate committed: pk-pitfall-docs-index",
            safePayloadKeys: ["entryId", "entryStatus", "summaryOnly"]
          }
        ]
      })
    );
    const convertPanel = buildResultPanelModel(fixedResult(workspaceRoot));
    const serialized = JSON.stringify({
      contextPreview,
      creationPreview,
      eventPanel,
      revokedRecall,
      convertPanel
    });

    expect(recallPreview.status).toBe("recall_ready");
    expect(recallPreview.pitfallCount).toBe(1);
    expect(
      contextPreview.segments.some(
        (segment) => segment.sourceKind === "project_knowledge_recall"
      )
    ).toBe(true);
    expect(
      creationPreview?.pathSummaries.some((summary) =>
        summary.includes("docs/README.md")
      )
    ).toBe(true);
    expect(
      revokedRecall.matchedEntries.map((entry) => entry.entryId)
    ).not.toContain("pk-pitfall-docs-index");
    expect(eventPanel?.projectKnowledgeEventCount).toBe(3);
    expect(eventPanel?.latestProjectKnowledgeRecallSummary).toContain(
      "project knowledge recall used"
    );
    expect(convertPanel.rows).toBe(4);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("rawSource");
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain('"canApplyPatch":true');
  });

  it("keeps the Project Knowledge Recall App surface read-only and summary-only", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "project-knowledge-recall-view.ts"),
      "utf8"
    );
    const contextSource = await readFile(
      path.join(appRoot, "src", "context-assembly-preview-view.ts"),
      "utf8"
    );
    const combined = `${appSource}\n${viewSource}\n${contextSource}`;

    expect(appSource).toContain("Project Knowledge Recall");
    expect(appSource).toContain("Read-only / summary refs");
    expect(appSource).toContain("Preview Project Knowledge Recall");
    expect(appSource).toContain("Clear Project Knowledge Recall");
    expect(appSource).toContain(
      "does not commit memory, apply patches, rollback"
    );
    expect(appSource).toContain(
      "setProjectKnowledgeRecallPreview(projectKnowledgeRecallCandidate)"
    );
    expect(contextSource).toContain("project_knowledge_recall");
    expect(contextSource).toContain("Project knowledge volatile recall refs");
    expect(contextSource).toContain(
      "Project knowledge workspace rules summary"
    );
    expect(combined).not.toContain("projectKnowledgeRecallGenericInvoke");
    expect(combined).not.toContain("handleProjectKnowledgeRecallApply");
    expect(combined).not.toContain("projectKnowledgeRecallEventStoreWrite");
  });

  it("documents the P0T-005 project knowledge recall integration", async () => {
    const recallDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "project-knowledge-recall-integration-v0.15.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${recallDoc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("Project Knowledge Recall Integration v0.15");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("workspace_rules_summary");
    expect(combined).toContain("No automatic memory commit");
    expect(combined).toContain("No App-side apply or rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git/shell execution");
    expect(combined).toContain("No native bridge");
    expect(docsIndex).toContain(
      "project-knowledge-recall-integration-v0.15.md"
    );
  });

  it("documents the P0T-006 project knowledge events replay audit", async () => {
    const replayDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "project-knowledge-events-replay-audit-v0.15.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const combined = `${replayDoc}\n${docsIndex}\n${appReadme}\n${appSource}`;

    expect(combined).toContain(
      "Project Knowledge Events / Replay / Redaction Audit v0.15"
    );
    expect(combined).toContain("project_knowledge.candidate_committed");
    expect(combined).toContain("project_knowledge.recall_used");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("no raw content");
    expect(combined).toContain("no App execution");
    expect(combined).toContain("no Git or shell execution");
    expect(appSource).toContain("Project knowledge events");
    expect(appSource).toContain("Latest project knowledge recall");
    expect(appSource).toContain("Knowledge redaction audit");
    expect(docsIndex).toContain(
      "project-knowledge-events-replay-audit-v0.15.md"
    );
  });

  it("documents the P0T-007 project knowledge E2E smoke", async () => {
    const smokeDoc = await readFile(
      path.join(repoRoot, "docs", "project-knowledge-e2e-smoke-v0.15.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${smokeDoc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("Project Knowledge E2E Smoke v0.15");
    expect(combined).toContain("commit project_fact");
    expect(combined).toContain("commit pitfall");
    expect(combined).toContain(
      "Context Assembly includes project knowledge recall refs"
    );
    expect(combined).toContain("revoked pitfall no longer recalls");
    expect(combined).toContain("Convert still works");
    expect(combined).toContain("no raw prompt");
    expect(combined).toContain("no automatic memory commit");
    expect(combined).toContain("no App-side apply or rollback");
    expect(combined).toContain("no Git or shell execution");
    expect(combined).toContain("no native bridge");
    expect(docsIndex).toContain("project-knowledge-e2e-smoke-v0.15.md");
  });

  it("documents the v0.16 production memory project knowledge RC", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.16.0-production-memory-project-knowledge-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "project-knowledge-manual-qa.md"),
      "utf8"
    );
    const rcChecklist = await readFile(
      path.join(repoRoot, "docs", "project-knowledge-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const combined = `${releaseNotes}\n${manualQa}\n${rcChecklist}\n${docsIndex}\n${rootReadme}\n${appReadme}\n${appSource}`;

    expect(combined).toContain(
      "v0.16.0-production-memory-project-knowledge-rc.1"
    );
    expect(combined).toContain("Production Memory / Project Knowledge MVP");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain(
      "App-side approved execution remains human-approved and rollbackable"
    );
    expect(combined).toContain(
      "Git/shell verification safe lanes remain fixed and summary-only"
    );
    expect(combined).toContain(
      "App live proposal generation remains explicit opt-in"
    );
    expect(combined).toContain("policy");
    expect(combined).toContain("project_fact");
    expect(combined).toContain("pitfall");
    expect(combined).toContain("human review");
    expect(combined).toContain("typed confirmation");
    expect(combined).toContain("evidence refs");
    expect(combined).toContain("trigger and mitigation");
    expect(combined).toContain("revoke");
    expect(combined).toContain("expire");
    expect(combined).toContain("recall");
    expect(combined).toContain("replay");
    expect(combined).toContain("redaction audit");
    expect(combined).toContain("commit project_fact");
    expect(combined).toContain("commit pitfall");
    expect(combined).toContain("commit policy");
    expect(combined).toContain("reject fake API key");
    expect(combined).toContain("E2E task sees recall");
    expect(combined).toContain("memory events show in replay");
    expect(combined).toContain("approved apply and rollback");
    expect(combined).toContain("No automatic memory commit");
    expect(combined).toContain("No model-direct policy write");
    expect(combined).toContain("No raw prompt");
    expect(combined).toContain("No broad PermissionLease");
    expect(combined).toContain("No MCP/plugin/skills runtime");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(rcChecklist).toContain("Local Scoped Command Gate");
    expect(rcChecklist).toContain("Full Stage-end Command Gate");
    expect(rcChecklist).toContain("GitHub Actions Gate");
    expect(rcChecklist).toContain("Generated Artifacts");
    expect(rcChecklist).toContain("Release / Tag Suggestion");
    expect(rcChecklist).toContain("Rollback Guidance");
    expect(rcChecklist).toContain("Known Limitations");
    expect(docsIndex).toContain(
      "release-notes-v0.16.0-production-memory-project-knowledge-rc.1.md"
    );
    expect(docsIndex).toContain("project-knowledge-manual-qa.md");
    expect(docsIndex).toContain("project-knowledge-rc-checklist.md");
    expect(appSource).toContain("Human reviewed / summary-only");
    expect(appSource).toContain("auto-commit model or tool output");
    expect(appSource).toContain("write model-direct policy entries");
    expect(appSource).toContain("store raw prompt/source/diff/API key memory");
    expect(appSource).toContain(
      "memory-driven apply, native bridge, or desktop action"
    );
  });

  it("documents the v0.16 post-release review and P0U capability host roadmap", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.16-production-memory-project-knowledge-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(repoRoot, "docs", "p0u-capability-host-roadmap.md"),
      "utf8"
    );
    const plan = await readFile(
      path.join(repoRoot, "docs", "p0u-001-capability-host-adr-plan.md"),
      "utf8"
    );
    const prompts = await readFile(
      path.join(repoRoot, "docs", "v0.17-capability-host-mvp-prompts.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${plan}\n${prompts}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain(
      "v0.16.0-production-memory-project-knowledge-rc.1"
    );
    expect(combined).toContain("Production Memory / Project Knowledge MVP");
    expect(combined).toContain("P0U Capability Host Roadmap");
    expect(combined).toContain("descriptor-first Capability Host MVP");
    expect(combined).toContain("MCP / plugin / skill metadata only");
    expect(combined).toContain("read-only discovery");
    expect(combined).toContain("Capability Broker");
    expect(combined).toContain("risk / approval / lease preview");
    expect(combined).toContain("App read-only surface");
    expect(combined).toContain("redaction / boundary audit");
    expect(combined).toContain("No external capability execution");
    expect(combined).toContain("No MCP tool invocation");
    expect(combined).toContain("No MCP stdio process launch");
    expect(combined).toContain("No MCP HTTP/SSE/WebSocket connection");
    expect(combined).toContain("No plugin code loading");
    expect(combined).toContain("No skill runtime execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("No broad PermissionLease");
    expect(combined).toContain("No arbitrary Git/shell");
    expect(combined).toContain("Do not implement MCP/plugin/skill execution");
    expect(docsIndex).toContain("v0.17-capability-host-mvp-prompts.md");
    expect(docsIndex).toContain(
      "v0.16-production-memory-project-knowledge-postrelease-review.md"
    );
    expect(docsIndex).toContain("p0u-capability-host-roadmap.md");
    expect(docsIndex).toContain("p0u-001-capability-host-adr-plan.md");
    expect(rootReadme).toContain("v0.17 Capability Host MVP status");
  });

  it("documents the P0U-001 capability host design gate", async () => {
    const adr = await readFile(
      path.join(repoRoot, "docs", "adr", "0011-capability-host-mvp.md"),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(repoRoot, "docs", "capability-host-threat-model-v0.16.md"),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "capability-host-implementation-gate-v0.16.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0u-002-capability-descriptor-manifest-schema-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${nextPlan}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain("ADR 0011: Capability Host MVP");
    expect(combined).toContain("Proposed / Accepted for P0U design gate");
    expect(combined).toContain("Capability Host is descriptor-first");
    expect(combined).toContain(
      "MCP / plugin / skill sources are represented as metadata descriptors"
    );
    expect(combined).toContain("No external capability execution in v0.17");
    expect(combined).toContain("No MCP stdio/http connection in v0.17");
    expect(combined).toContain("No MCP HTTP/SSE/WebSocket connection");
    expect(combined).toContain("No plugin code loading");
    expect(combined).toContain("No skill runtime execution");
    expect(combined).toContain(
      "Capability Broker is the only integration boundary"
    );
    expect(combined).toContain("risk / source type / invocation policy");
    expect(combined).toContain("manual-only preview");
    expect(combined).toContain("App surface remains read-only");
    expect(combined).toContain("malicious MCP server metadata");
    expect(combined).toContain("plugin manifest poisoning");
    expect(combined).toContain("skill package metadata poisoning");
    expect(combined).toContain("prompt injection in descriptions");
    expect(combined).toContain("tool schema secret leakage");
    expect(combined).toContain("URL / endpoint leakage");
    expect(combined).toContain("command field smuggling");
    expect(combined).toContain("shell/git/native command smuggling");
    expect(combined).toContain("path traversal in package metadata");
    expect(combined).toContain("dependency confusion");
    expect(combined).toContain("version spoofing");
    expect(combined).toContain("capability id collision");
    expect(combined).toContain("risk downgrade");
    expect(combined).toContain("approval bypass");
    expect(combined).toContain("PermissionLease misuse");
    expect(combined).toContain("event/replay confusion");
    expect(combined).toContain("raw args");
    expect(combined).toContain("descriptor schema safety");
    expect(combined).toContain("source identity safety");
    expect(combined).toContain("path / URL metadata safety");
    expect(combined).toContain("command/execution field safety");
    expect(combined).toContain("secret/redaction safety");
    expect(combined).toContain("capability broker mapping safety");
    expect(combined).toContain("App UI safety");
    expect(combined).toContain("CI/boundary checker safety");
    expect(combined).toContain("docs/replay safety");
    expect(combined).toContain(
      "Do not implement MCP/plugin/skill execution until descriptor, broker, audit, App UI, and redaction gates are complete."
    );
    expect(combined).toContain(
      "runtime/src/capabilities/external-capability-manifest.ts"
    );
    expect(combined).toContain("No MCP tool invocation");
    expect(combined).toContain("No arbitrary Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("adr/0011-capability-host-mvp.md");
    expect(docsIndex).toContain("capability-host-threat-model-v0.16.md");
    expect(docsIndex).toContain("capability-host-implementation-gate-v0.16.md");
    expect(docsIndex).toContain(
      "p0u-002-capability-descriptor-manifest-schema-plan.md"
    );
    expect(rootReadme).toContain("docs/adr/0011-capability-host-mvp.md");
  });

  it("previews Capability Host manifests without external execution", async () => {
    const safeManifest = await readFile(
      path.join(
        repoRoot,
        "runtime",
        "test",
        "fixtures",
        "external-capabilities",
        "safe-mcp-readonly.json"
      ),
      "utf8"
    );
    const commandManifest = await readFile(
      path.join(
        repoRoot,
        "runtime",
        "test",
        "fixtures",
        "external-capabilities",
        "rejected-command-field.json"
      ),
      "utf8"
    );
    const secretManifest = await readFile(
      path.join(
        repoRoot,
        "runtime",
        "test",
        "fixtures",
        "external-capabilities",
        "rejected-secret-marker.json"
      ),
      "utf8"
    );

    const safeView = buildCapabilityHostSurfaceView({
      manifestJsonText: safeManifest,
      sourceType: "mcp_server"
    });
    const commandView = buildCapabilityHostSurfaceView({
      manifestJsonText: commandManifest,
      sourceType: "plugin_package"
    });
    const secretView = buildCapabilityHostSurfaceView({
      manifestJsonText: secretManifest,
      sourceType: "skill_bundle"
    });

    expect(safeView.status).toBe("preview_ready");
    expect(safeView.descriptorCount).toBe(1);
    expect(safeView.brokerDescriptorCount).toBe(1);
    expect(safeView.leasePreviewCount).toBe(1);
    expect(safeView.brokerPreviewSummary?.descriptorPreviewCount).toBe(1);
    expect(safeView.readiness.canPreviewDescriptors).toBe(true);
    expect(safeView.readiness.canConnectMcpServer).toBe(false);
    expect(safeView.readiness.canInstallPlugin).toBe(false);
    expect(safeView.readiness.canRunSkill).toBe(false);
    expect(safeView.readiness.canInvokeCapability).toBe(false);
    expect(safeView.readiness.canIssueLease).toBe(false);
    expect(safeView.readiness.appCanExecute).toBe(false);
    expect(summarizeCapabilityHostSurfaceView(safeView).source).toBe(
      "app_capability_host_surface"
    );
    expect(capabilityHostSurfaceWarningCodes(safeView)).toContain(
      "CAPABILITY_HOST_SURFACE_READ_ONLY"
    );

    expect(commandView.status).toBe("blocked");
    expect(commandView.findings.map((finding) => finding.code)).toContain(
      "COMMAND_FIELD_REJECTED"
    );
    expect(secretView.status).toBe("blocked");
    expect(secretView.findings.map((finding) => finding.code)).toContain(
      "SECRET_MARKER_REJECTED"
    );

    const serialized = JSON.stringify(safeView);
    expect(serialized).not.toContain("echo blocked");
    expect(serialized).not.toContain("sk-fake");
  });

  it("places Capability Host summary refs into audit and context previews", async () => {
    const safeManifest = await readFile(
      path.join(
        repoRoot,
        "runtime",
        "test",
        "fixtures",
        "external-capabilities",
        "safe-mcp-readonly.json"
      ),
      "utf8"
    );
    const capabilityHost = buildCapabilityHostSurfaceView({
      manifestJsonText: safeManifest,
      sourceType: "mcp_server"
    });
    const runDraft = buildRunDraftView({
      objectiveDraft: "Preview external capability metadata.",
      acceptanceCriteriaDraft: "Descriptor summary only.",
      selectedIntent: "documentation"
    });
    const contextPreview = buildContextAssemblyPreviewView({
      runDraft,
      capabilityHostSurface: capabilityHost
    });
    const workbench = buildWorkbenchSurfacesView({
      controlProjection: buildControlPlaneProjectionView(undefined),
      futureAuditWarningCodes: capabilityHostSurfaceWarningCodes(capabilityHost)
    });

    expect(
      contextPreview.segments.some(
        (segment) =>
          segment.sourceKind === "capability_host_surface" &&
          segment.placement === "no_compress_zone"
      )
    ).toBe(true);
    expect(workbench.audit.warningCodes).toContain(
      "CAPABILITY_HOST_SURFACE_READ_ONLY"
    );
  });

  it("renders the Capability Host panel as read-only App surface", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "capability-host-surface-view.ts"),
      "utf8"
    );

    expect(appSource).toContain("Capability Host");
    expect(appSource).toContain("Read-only / no external execution");
    expect(appSource).toContain(
      "Preview MCP, plugin, and skill capability descriptors."
    );
    expect(appSource).toContain("Preview Capability Host");
    expect(appSource).toContain("Clear Capability Host");
    expect(appSource).toContain("Connect MCP Server (disabled)");
    expect(appSource).toContain("Install Plugin (disabled)");
    expect(appSource).toContain("Run Skill (disabled)");
    expect(appSource).toContain("Invoke Capability (disabled)");
    expect(appSource).toContain("Issue Lease (disabled)");
    expect(appSource).not.toMatch(/>\s*Connect MCP Server\s*</);
    expect(appSource).not.toMatch(/>\s*Install Plugin\s*</);
    expect(appSource).not.toMatch(/>\s*Run Skill\s*</);
    expect(appSource).not.toMatch(/>\s*Invoke Capability\s*</);
    expect(appSource).not.toMatch(/>\s*Issue Lease\s*</);
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toMatch(/\binvoke\s*\(/);
    expect(viewSource).not.toMatch(/\bfetch\s*\(/);
    expect(viewSource).not.toContain("localStorage");
    expect(viewSource).not.toContain("sessionStorage");
    expect(viewSource).toContain("canWriteEventStore: false");
    expect(viewSource).not.toContain("connectNative");
    expect(viewSource).not.toContain("sendNativeMessage");
  });

  it("documents the App Shell Capability Host surface", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "app-shell-capability-host-surface-v0.16.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(doc).toContain("App Shell Capability Host Surface v0.16");
    expect(doc).toContain("read-only preview panel");
    expect(doc).toContain("No MCP server connection");
    expect(doc).toContain("No plugin install");
    expect(doc).toContain("No skill execution");
    expect(doc).toContain("No capability invocation");
    expect(doc).toContain("No PermissionLease issuance");
    expect(doc).toContain("No Tauri command");
    expect(doc).toContain("No fetch/network");
    expect(doc).toContain("No EventStore write");
    expect(doc).toContain("No external tool run");
    expect(doc).toContain("Broker output is a preview");
    expect(docsIndex).toContain("app-shell-capability-host-surface-v0.16.md");
  });

  it("previews Capability Host audit summaries without execution", async () => {
    const safeManifest = await readFile(
      path.join(
        repoRoot,
        "runtime",
        "test",
        "fixtures",
        "external-capabilities",
        "safe-mcp-readonly.json"
      ),
      "utf8"
    );
    const capabilityHost = buildCapabilityHostSurfaceView({
      manifestJsonText: safeManifest,
      sourceType: "mcp_server"
    });
    const safeAudit = buildCapabilityHostAuditView({
      capabilityHostSurface: capabilityHost
    });
    const rawAudit = buildCapabilityHostAuditView({
      summaryJsonText: JSON.stringify({
        rawArgs: "RAW_ARG_SENTINEL_VALUE",
        canInvokeCapability: true,
        leaseIssued: true
      })
    });

    expect(safeAudit.status).toBe("audit_ready");
    expect(safeAudit.descriptorCounts.appSurfaceDescriptorCount).toBe(1);
    expect(safeAudit.readiness.canPreviewAudit).toBe(true);
    expect(safeAudit.readiness.canRunExternalCapabilityAudit).toBe(false);
    expect(safeAudit.readiness.canInvokeCapability).toBe(false);
    expect(safeAudit.readiness.canIssueLease).toBe(false);
    expect(safeAudit.readiness.canFetchNetwork).toBe(false);
    expect(safeAudit.readiness.canWriteEventStore).toBe(false);
    expect(safeAudit.readiness.appCanExecute).toBe(false);

    expect(rawAudit.status).toBe("blocked");
    expect(rawAudit.findings.map((finding) => finding.code)).toContain(
      "RAW_ARGS_FIELD_REJECTED"
    );
    expect(rawAudit.findings.map((finding) => finding.code)).toContain(
      "EXECUTION_READINESS_REJECTED"
    );
    expect(rawAudit.findings.map((finding) => finding.code)).toContain(
      "LEASE_ISSUED_REJECTED"
    );
    expect(JSON.stringify(rawAudit)).not.toContain("RAW_ARG_SENTINEL_VALUE");
  });

  it("renders the Capability Host audit panel as read-only App surface", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const viewSource = await readFile(
      path.join(appRoot, "src", "capability-host-audit-view.ts"),
      "utf8"
    );

    expect(appSource).toContain("Capability Host Redaction / Boundary Audit");
    expect(appSource).toContain("Read-only / no execution");
    expect(appSource).toContain("Preview Capability Host Audit");
    expect(appSource).toContain("Run External Capability Audit (disabled)");
    expect(appSource).not.toMatch(/>\s*Run External Capability Audit\s*</);
    expect(viewSource).not.toContain("safeInvoke");
    expect(viewSource).not.toMatch(/\binvoke\s*\(/);
    expect(viewSource).not.toMatch(/\bfetch\s*\(/);
    expect(viewSource).not.toContain("localStorage");
    expect(viewSource).not.toContain("sessionStorage");
    expect(viewSource).toContain("canWriteEventStore: false");
  });

  it("documents the Capability Host redaction audit surfaces", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-external-capability-redaction-audit-v0.16.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(repoRoot, "docs", "app-shell-capability-host-audit-v0.16.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}`;

    expect(combined).toContain("External Capability Redaction Audit");
    expect(combined).toContain("raw args");
    expect(combined).toContain("raw prompt/source/diff/response");
    expect(combined).toContain("No MCP server connection");
    expect(combined).toContain("No plugin install");
    expect(combined).toContain("No skill execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No PermissionLease issuance");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "runtime-external-capability-redaction-audit-v0.16.md"
    );
    expect(docsIndex).toContain("app-shell-capability-host-audit-v0.16.md");
  });

  it("documents the v0.17 Capability Host RC without external execution", async () => {
    const releaseNotes = await readFile(
      path.join(
        repoRoot,
        "docs",
        "release-notes-v0.17.0-capability-host-mvp-rc.1.md"
      ),
      "utf8"
    );
    const manualQa = await readFile(
      path.join(repoRoot, "docs", "capability-host-manual-qa.md"),
      "utf8"
    );
    const rcChecklist = await readFile(
      path.join(repoRoot, "docs", "capability-host-rc-checklist.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const combinedDocs = `${releaseNotes}\n${manualQa}\n${rcChecklist}`;

    expect(releaseNotes).toContain("v0.17.0-capability-host-mvp-rc.1");
    expect(releaseNotes).toContain(
      "Capability Host MVP, read-only descriptors and no external execution"
    );
    expect(releaseNotes).toContain(
      "Capability Host can parse and preview MCP/plugin/skill descriptors."
    );
    expect(releaseNotes).toContain(
      "No external capability execution is enabled."
    );
    expect(releaseNotes).toContain("no MCP tool invocation");
    expect(releaseNotes).toContain("no MCP server connection");
    expect(releaseNotes).toContain("no plugin installation");
    expect(releaseNotes).toContain("no skill runtime execution");
    expect(releaseNotes).toContain("redaction audit");
    expect(manualQa).toContain("Paste a safe MCP manifest");
    expect(manualQa).toContain("rejected command manifest");
    expect(manualQa).toContain("install script");
    expect(manualQa).toContain("Run External Capability Audit (disabled)");
    expect(manualQa).toContain("no fetch/network");
    expect(manualQa).toContain("no Tauri external execution");
    expect(manualQa).toContain("no EventStore external execution event");
    expect(rcChecklist).toContain("pnpm verify:ci");
    expect(rcChecklist).toContain("pnpm release:smoke");
    expect(rcChecklist).toContain("pnpm app:qa:check");
    expect(rcChecklist).toContain("git tag v0.17.0-capability-host-mvp-rc.1");
    expect(rcChecklist).toContain("gh release create");
    expect(combinedDocs).toContain("full docs path links");
    expect(docsIndex).toContain(
      "release-notes-v0.17.0-capability-host-mvp-rc.1.md"
    );
    expect(docsIndex).toContain("capability-host-manual-qa.md");
    expect(docsIndex).toContain("capability-host-rc-checklist.md");
    expect(rootReadme).toContain("P0U is complete for the v0.17 RC");
    expect(appReadme).toContain("prepare the v0.17 Capability Host MVP RC");
    expect(appSource).toContain("Read-only / no external execution");
    expect(appSource).toContain("Read-only / no execution");
    expect(appSource).toContain("Connect MCP Server (disabled)");
    expect(appSource).toContain("Install Plugin (disabled)");
    expect(appSource).toContain("Run Skill (disabled)");
    expect(appSource).toContain("Invoke Capability (disabled)");
    expect(appSource).toContain("Issue Lease (disabled)");
    expect(appSource).toContain("Run External Capability Audit (disabled)");
    expect(appSource).not.toMatch(/>\s*Connect MCP Server\s*</);
    expect(appSource).not.toMatch(/>\s*Install Plugin\s*</);
    expect(appSource).not.toMatch(/>\s*Run Skill\s*</);
    expect(appSource).not.toMatch(/>\s*Invoke Capability\s*</);
    expect(appSource).not.toMatch(/>\s*Issue Lease\s*</);
    expect(appSource).not.toMatch(/>\s*Run External Capability Audit\s*</);
  });

  it("documents the v0.17 post-release review and P0V MCP read-only roadmap", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.17-capability-host-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(repoRoot, "docs", "p0v-mcp-readonly-connection-roadmap.md"),
      "utf8"
    );
    const gatePlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0v-001-mcp-readonly-connection-gate-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${gatePlan}`;

    expect(review).toContain("v0.17 Capability Host Post-Release Review");
    expect(review).toContain("v0.17.0-capability-host-mvp-rc.1");
    expect(review).toContain(
      "Capability Host MVP, read-only descriptors and no external execution"
    );
    expect(review).toContain("App Capability Host read-only surface");
    expect(review).toContain(
      "External capability metadata redaction / boundary audit"
    );
    expect(roadmap).toContain("P0V MCP Read-only Connection Roadmap");
    expect(roadmap).toContain("metadata-only resources/prompts/tools listing");
    expect(roadmap).toContain("Capability Broker integration");
    expect(roadmap).toContain("App read-only connection surface");
    expect(gatePlan).toContain("P0V-001 MCP Read-only Connection Gate Plan");
    expect(gatePlan).toContain("no MCP connection implementation in P0V-001");
    expect(combined).toContain("no MCP tool invocation");
    expect(combined).toContain("no mutating MCP operation");
    expect(combined).toContain("no resource content read by default");
    expect(combined).toContain("no arbitrary process spawn");
    expect(combined).toContain("no App hidden connection");
    expect(combined).toContain("no external mutation");
    expect(combined).toContain("no native bridge");
    expect(combined).toContain("no desktop action");
    expect(combined).toContain("broad PermissionLease");
    expect(docsIndex).toContain("v0.18-mcp-readonly-connection-mvp-prompts.md");
    expect(docsIndex).toContain("v0.17-capability-host-postrelease-review.md");
    expect(docsIndex).toContain("p0v-mcp-readonly-connection-roadmap.md");
    expect(docsIndex).toContain("p0v-001-mcp-readonly-connection-gate-plan.md");
    expect(rootReadme).toContain("active v0.18 roadmap");
  });

  it("documents the P0V-001 MCP read-only connection gate", async () => {
    const adr = await readFile(
      path.join(
        repoRoot,
        "docs",
        "adr",
        "0011-mcp-readonly-connection-gate.md"
      ),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(
        repoRoot,
        "docs",
        "mcp-readonly-connection-threat-model-v0.17.md"
      ),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "mcp-readonly-connection-implementation-gate-v0.17.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0v-002-mcp-connection-profile-schema-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${nextPlan}`;

    expect(adr).toContain("ADR 0011: MCP Read-only Connection Gate");
    expect(adr).toContain("v0.18 only supports read-only MCP discovery");
    expect(adr).toContain("resources metadata list");
    expect(adr).toContain("prompts metadata list");
    expect(adr).toContain("tools metadata list");
    expect(adr).toContain(
      "Capability Broker receives metadata descriptors only"
    );
    expect(threatModel).toContain("malicious MCP server metadata");
    expect(threatModel).toContain("prompt injection");
    expect(threatModel).toContain("command injection through server profile");
    expect(threatModel).toContain("hanging server / timeout");
    expect(threatModel).toContain("Windows path / command issues");
    expect(implementationGate).toContain("Connection Profile Safety");
    expect(implementationGate).toContain("No Tool Invocation Safety");
    expect(implementationGate).toContain("No Resource Read Safety");
    expect(implementationGate).toContain("CI / Boundary Safety");
    expect(nextPlan).toContain("P0V-002 MCP Connection Profile Schema Plan");
    expect(combined).toContain("no MCP tool invocation");
    expect(combined).toContain("no resource content read");
    expect(combined).toContain("no arbitrary process spawn");
    expect(combined).toContain("no user-supplied command execution");
    expect(combined).toContain("no App hidden connection");
    expect(combined).toContain("no native bridge");
    expect(combined).toContain("no desktop action");
    expect(combined).toContain("redaction audit");
    expect(docsIndex).toContain("adr/0011-mcp-readonly-connection-gate.md");
    expect(docsIndex).toContain(
      "mcp-readonly-connection-threat-model-v0.17.md"
    );
    expect(docsIndex).toContain(
      "mcp-readonly-connection-implementation-gate-v0.17.md"
    );
    expect(docsIndex).toContain(
      "p0v-002-mcp-connection-profile-schema-plan.md"
    );
  });

  it("documents the App MCP read-only connection surface", async () => {
    const doc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-mcp-readonly-connection-v0.17.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");

    expect(doc).toContain("App Shell MCP Read-only Connection v0.17");
    expect(doc).toContain("read-only discovery only");
    expect(doc).toContain("DISCOVER MCP METADATA");
    expect(doc).toContain("no tool invocation");
    expect(doc).toContain("No MCP tool invocation");
    expect(doc).toContain("No MCP resource content read");
    expect(doc).toContain("No EventStore write");
    expect(doc).toContain("No App execution");
    expect(doc).toContain("No Git or shell");
    expect(doc).toContain("No native bridge");
    expect(doc).toContain("No desktop action");
    expect(docsIndex).toContain("app-shell-mcp-readonly-connection-v0.17.md");
    expect(appReadme).toContain("App MCP Read-only Connection surface");
  });

  it("documents the MCP metadata redaction audit", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-mcp-metadata-redaction-audit-v0.17.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-mcp-metadata-redaction-audit-v0.17.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}`;

    expect(runtimeDoc).toContain("Runtime MCP Metadata Redaction Audit v0.17");
    expect(appDoc).toContain("App Shell MCP Metadata Redaction Audit v0.17");
    expect(combined).toContain("no raw metadata");
    expect(combined).toContain("No MCP tool invocation");
    expect(combined).toContain("No MCP resource content read");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No Git or shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("runtime-mcp-metadata-redaction-audit-v0.17.md");
    expect(docsIndex).toContain(
      "app-shell-mcp-metadata-redaction-audit-v0.17.md"
    );
  });

  it("documents the MCP read-only connection smoke and hardening path", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "mcp-readonly-connection-smoke-v0.17.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(doc).toContain("MCP Read-only Connection Smoke v0.17");
    expect(doc).toContain("safe MCP profile");
    expect(doc).toContain("typed confirmation");
    expect(doc).toContain("read-only discovery");
    expect(doc).toContain("redaction audit");
    expect(doc).toContain("no MCP tool call");
    expect(doc).toContain("no MCP resource content read");
    expect(doc).toContain("no raw metadata display");
    expect(doc).toContain("no App hidden connection");
    expect(doc).toContain("no arbitrary command");
    expect(doc).toContain("no EventStore raw write");
    expect(doc).toContain("no broad PermissionLease");
    expect(docsIndex).toContain("mcp-readonly-connection-smoke-v0.17.md");
  });

  it("documents the P0S-001 MVP hardening recovery design gate", async () => {
    const adr = await readFile(
      path.join(repoRoot, "docs", "adr", "0011-mvp-hardening-recovery.md"),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(
        repoRoot,
        "docs",
        "mvp-hardening-recovery-threat-model-v0.14.md"
      ),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "mvp-hardening-recovery-implementation-gate-v0.14.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0s-002-e2e-golden-regression-suite-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${nextPlan}\n${docsIndex}`;

    expect(combined).toContain("ADR 0011: MVP Hardening / Recovery");
    expect(combined).toContain("Proposed / Accepted for P0S design gate");
    expect(combined).toContain("v0.15 focuses on stabilization");
    expect(combined).toContain("regression-tested");
    expect(combined).toContain("Apply/rollback failures");
    expect(combined).toContain(
      "Stale snapshots and conflicts must fail closed"
    );
    expect(combined).toContain("Event replay must reconstruct");
    expect(combined).toContain("Manual QA must cover");
    expect(combined).toContain("Packaging and build warnings");
    expect(combined).toContain("stale workspace snapshot");
    expect(combined).toContain("Conflict after proposal approval");
    expect(combined).toContain("Interrupted apply");
    expect(combined).toContain("Interrupted rollback");
    expect(combined).toContain("Checkpoint corruption");
    expect(combined).toContain("Preimage mismatch");
    expect(combined).toContain("Event mismatch");
    expect(combined).toContain("Replay drift");
    expect(combined).toContain("Duplicate apply");
    expect(combined).toContain("Rollback after external modification");
    expect(combined).toContain("Verification command failure");
    expect(combined).toContain("Git/shell output leakage");
    expect(combined).toContain("Raw checkpoint or preimage leakage");
    expect(combined).toContain("Windows path edge cases");
    expect(combined).toContain("UI accidentally enabling unsafe buttons");
    expect(combined).toContain("Golden regression tests");
    expect(combined).toContain("Conflict detection tests");
    expect(combined).toContain("Checkpoint verification tests");
    expect(combined).toContain("Rollback verification tests");
    expect(combined).toContain("Summary-only event tests");
    expect(combined).toContain("Replay projection tests");
    expect(combined).toContain("Raw output leakage tests");
    expect(combined).toContain("no arbitrary Git/shell");
    expect(combined).toContain("no native bridge");
    expect(combined).toContain("no auto-apply");
    expect(combined).toContain("no model execution");
    expect(combined).toContain("Docs-only create");
    expect(combined).toContain("Docs-only update");
    expect(combined).toContain("Conflict after approval");
    expect(combined).toContain("Failed verification");
    expect(combined).toContain("Rollback after apply");
    expect(combined).toContain("Blocked unsafe path");
    expect(combined).toContain("Blocked raw content marker");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No new App execution feature");
    expect(combined).toContain("No auto-apply");
    expect(docsIndex).toContain("adr/0011-mvp-hardening-recovery.md");
    expect(docsIndex).toContain("mvp-hardening-recovery-threat-model-v0.14.md");
    expect(docsIndex).toContain(
      "mvp-hardening-recovery-implementation-gate-v0.14.md"
    );
    expect(docsIndex).toContain("p0s-002-e2e-golden-regression-suite-plan.md");
  });

  it("documents the P0S-002 E2E golden regression suite", async () => {
    const regressionDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-e2e-golden-regression-suite-v0.15.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(regressionDoc).toContain(
      "Runtime E2E Golden Regression Suite v0.15"
    );
    expect(regressionDoc).toContain("deterministic golden regression suite");
    expect(regressionDoc).toContain("Docs-only create");
    expect(regressionDoc).toContain("Docs-only update");
    expect(regressionDoc).toContain("Conflict after approval");
    expect(regressionDoc).toContain("Failed verification");
    expect(regressionDoc).toContain("Rollback after apply");
    expect(regressionDoc).toContain("Blocked unsafe path");
    expect(regressionDoc).toContain("Blocked raw content marker");
    expect(regressionDoc).toContain("No live DeepSeek call");
    expect(regressionDoc).toContain("No API key read");
    expect(regressionDoc).toContain("No fetch/network");
    expect(regressionDoc).toContain("No actual user workspace mutation");
    expect(regressionDoc).toContain("No new App execution feature");
    expect(regressionDoc).toContain("No auto-apply");
    expect(regressionDoc).toContain("No arbitrary Git/shell");
    expect(regressionDoc).toContain("No Tauri command");
    expect(regressionDoc).toContain("No EventStore writer");
    expect(regressionDoc).toContain("No raw source");
    expect(regressionDoc).toContain("raw response");
    expect(regressionDoc).toContain("reasoning_content");
    expect(regressionDoc).toContain("API key");
    expect(docsIndex).toContain("runtime-e2e-golden-regression-suite-v0.15.md");
  });

  it("documents the v0.13 post-release review and P0R end-to-end coding task roadmap", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.13-app-live-proposal-generation-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(repoRoot, "docs", "p0r-end-to-end-coding-task-roadmap.md"),
      "utf8"
    );
    const plan = await readFile(
      path.join(repoRoot, "docs", "p0r-001-end-to-end-coding-task-mvp-plan.md"),
      "utf8"
    );
    const prompts = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.14-end-to-end-coding-task-mvp-prompts.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${plan}\n${prompts}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain("v0.13.0-app-live-proposal-generation-mvp-rc.1");
    expect(combined).toContain(
      "App live DeepSeek proposal generation MVP, no auto-apply"
    );
    expect(combined).toContain("P0R: End-to-End Coding Task MVP");
    expect(combined).toContain("one reliable end-to-end coding task MVP");
    expect(combined).toContain("live DeepSeek proposal generation");
    expect(combined).toContain("repair / schema validation");
    expect(combined).toContain("model proposal import");
    expect(combined).toContain("chain integration");
    expect(combined).toContain("human typed confirmation");
    expect(combined).toContain("approved apply");
    expect(combined).toContain("Git / shell verification safe lanes");
    expect(combined).toContain("summary events / replay");
    expect(combined).toContain("rollback if needed");
    expect(combined).toContain("human approval receipt");
    expect(combined).toContain("failure recovery UX");
    expect(combined).toContain("no auto-apply");
    expect(combined).toContain("autonomous coding loop");
    expect(combined).toContain("broad PermissionLease");
    expect(combined).toContain("arbitrary Git/shell");
    expect(combined).toContain("native bridge");
    expect(combined).toContain("desktop action");
    expect(combined).toContain("raw prompt");
    expect(combined).toContain("raw response");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("API key");
    expect(combined).toContain("raw source");
    expect(combined).toContain("raw diff");
    expect(combined).toContain("checkpoint preimage");
    expect(combined).toContain("No live DeepSeek call in P0R-001");
    expect(combined).toContain("No API key read in P0R-001");
    expect(combined).toContain("No fetch/network in P0R-001");
    expect(combined).toContain("No apply");
    expect(combined).toContain("No rollback");
    expect(combined).toContain("No EventStore writer");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No arbitrary Git execution");
    expect(combined).toContain("No arbitrary shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("v0.14-end-to-end-coding-task-mvp-prompts.md");
    expect(docsIndex).toContain(
      "v0.13-app-live-proposal-generation-postrelease-review.md"
    );
    expect(docsIndex).toContain("p0r-end-to-end-coding-task-roadmap.md");
    expect(docsIndex).toContain("p0r-001-end-to-end-coding-task-mvp-plan.md");
    expect(rootReadme).toContain("v0.14 End-to-End Coding Task MVP status");
  });

  it("documents the P0R-001 end-to-end coding task MVP design gate", async () => {
    const adr = await readFile(
      path.join(repoRoot, "docs", "adr", "0011-end-to-end-coding-task-mvp.md"),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(
        repoRoot,
        "docs",
        "end-to-end-coding-task-threat-model-v0.13.md"
      ),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "end-to-end-coding-task-implementation-gate-v0.13.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0r-002-golden-end-to-end-task-fixture-schema-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${nextPlan}\n${docsIndex}`;

    expect(combined).toContain("ADR 0011: End-to-End Coding Task MVP");
    expect(combined).toContain("Proposed / Accepted for P0R design gate");
    expect(combined).toContain("objective");
    expect(combined).toContain("live proposal generation");
    expect(combined).toContain("repair/schema validation");
    expect(combined).toContain("chain integration");
    expect(combined).toContain("validation/diff/audit/approval");
    expect(combined).toContain("typed confirmation");
    expect(combined).toContain("approved apply");
    expect(combined).toContain("Git/shell verification");
    expect(combined).toContain("summary events/replay");
    expect(combined).toContain("rollback if verification fails");
    expect(combined).toContain("Live proposal session receipt");
    expect(combined).toContain("Model proposal schema validation");
    expect(combined).toContain("Repair fail-closed");
    expect(combined).toContain("Diff/audit pass");
    expect(combined).toContain("Approval receipt");
    expect(combined).toContain("Snapshot/checkpoint");
    expect(combined).toContain("Apply summary event");
    expect(combined).toContain("Verification summary event");
    expect(combined).toContain("Rollback summary event");
    expect(combined).toContain("Replay projection");
    expect(combined).toContain("Model Hallucination");
    expect(combined).toContain("Unsafe Patch");
    expect(combined).toContain("Stale Workspace Snapshot");
    expect(combined).toContain("Apply Conflict");
    expect(combined).toContain("Verification Failure");
    expect(combined).toContain("Rollback Failure");
    expect(combined).toContain("Event Mismatch");
    expect(combined).toContain("Replay Tampering");
    expect(combined).toContain("Path Traversal");
    expect(combined).toContain("Symlink / Junction / Reparse Traversal");
    expect(combined).toContain("Secret Leakage");
    expect(combined).toContain("Raw Prompt / Response Leakage");
    expect(combined).toContain("Approval Bypass");
    expect(combined).toContain("Arbitrary Command Injection");
    expect(combined).toContain("Proposal Safety");
    expect(combined).toContain("Path / Content Safety");
    expect(combined).toContain("Approval Safety");
    expect(combined).toContain("Apply Safety");
    expect(combined).toContain("Verification Safety");
    expect(combined).toContain("Rollback Safety");
    expect(combined).toContain("Event / Replay Safety");
    expect(combined).toContain("App UX Safety");
    expect(combined).toContain("CI / Boundary Safety");
    expect(combined).toContain("No orchestrator implementation in P0R-002");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No apply");
    expect(combined).toContain("No rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No arbitrary Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("Raw prompt");
    expect(combined).toContain("Raw response");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("API key");
    expect(combined).toContain("Raw source");
    expect(combined).toContain("Raw diff");
    expect(combined).toContain("Checkpoint preimage");
    expect(docsIndex).toContain("adr/0011-end-to-end-coding-task-mvp.md");
    expect(docsIndex).toContain("end-to-end-coding-task-threat-model-v0.13.md");
    expect(docsIndex).toContain(
      "end-to-end-coding-task-implementation-gate-v0.13.md"
    );
    expect(docsIndex).toContain(
      "p0r-002-golden-end-to-end-task-fixture-schema-plan.md"
    );
  });

  it("documents the P0R-002 E2E coding task fixture schema without execution", async () => {
    const docs = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-e2e-coding-task-fixture-schema-v0.13.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${docs}\n${docsIndex}`;

    expect(combined).toContain("Runtime E2E Coding Task Fixture Schema v0.13");
    expect(combined).toContain("summary-only fixtures");
    expect(combined).toContain("No evaluator runner");
    expect(combined).toContain("No orchestrator");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No apply");
    expect(combined).toContain("No rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No arbitrary Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("rawPrompt");
    expect(combined).toContain("rawResponse");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("preimageContent");
    expect(combined).toContain("expectedEvents");
    expect(docsIndex).toContain(
      "runtime-e2e-coding-task-fixture-schema-v0.13.md"
    );
  });

  it("documents the P0R-003 E2E coding task orchestrator as state machine only", async () => {
    const docs = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-e2e-coding-task-orchestrator-v0.13.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${docs}\n${docsIndex}`;

    expect(combined).toContain("Runtime E2E Coding Task Orchestrator v0.13");
    expect(combined).toContain("pure state machine model");
    expect(combined).toContain("live proposal generation summary");
    expect(combined).toContain("model proposal import summary");
    expect(combined).toContain("chain integration summary");
    expect(combined).toContain("validation/audit/approval summary");
    expect(combined).toContain("approval receipt summary");
    expect(combined).toContain("apply result summary");
    expect(combined).toContain("verification result summary");
    expect(combined).toContain("rollback result summary");
    expect(combined).toContain("replay summary");
    expect(combined).toContain("verification_failed");
    expect(combined).toContain("rollback_ready");
    expect(combined).toContain("rolled_back");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch/network");
    expect(combined).toContain("No apply");
    expect(combined).toContain("No rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No arbitrary Git/shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("raw prompt");
    expect(combined).toContain("raw response");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("checkpoint preimage");
    expect(docsIndex).toContain(
      "runtime-e2e-coding-task-orchestrator-v0.13.md"
    );
  });

  it("previews the P0R-004 E2E coding task wizard without auto-apply", () => {
    const proposalCandidate = {
      schemaVersion: "model_patch_proposal.v1",
      proposalId: "e2e-wizard-proposal",
      title: "Clarify task wizard docs",
      intent: "Update summary-only task wizard documentation.",
      objectiveSummary: "Preview a guided E2E task flow without apply.",
      operations: [
        {
          operationId: "op-e2e-docs",
          path: "docs/app-shell-e2e-coding-task-wizard-v0.13.md",
          changeKind: "documentation",
          summary: "Document the wizard preview boundary.",
          rationale: "The App Shell should show guidance without execution.",
          estimatedLinesAdded: 6,
          estimatedLinesRemoved: 0,
          warningCodes: []
        }
      ],
      pathSummaries: [
        {
          path: "docs/app-shell-e2e-coding-task-wizard-v0.13.md",
          changeKind: "documentation",
          summary: "Wizard docs summary."
        }
      ],
      evidenceRefs: [
        {
          refId: "workspace-index-summary",
          kind: "workspace_index",
          summary: "Workspace index summary ref only.",
          hashPrefix: "abc12345"
        }
      ],
      riskNotes: [
        {
          code: "PREVIEW_ONLY",
          severity: "info",
          summary: "No execution is enabled."
        }
      ],
      source: "deepseek_model_patch_proposal"
    };
    const importView = buildModelPatchProposalImportView({
      draftText: JSON.stringify(proposalCandidate),
      sourceKind: "manual_test"
    });
    const chainView = buildModelProposalChainIntegrationView({
      modelImportView: importView,
      patchProposalCreationPreview:
        buildPatchProposalCreationPreviewFromModelImport(importView)
    });
    const policy = buildLiveProposalOptInGateView({
      modelProfileId: "deepseek-chat",
      keySourceRef: liveProposalAllowedKeySourceRef,
      optInMode: "explicit_live_proposal_opt_in"
    });
    const request = buildLiveProposalRequestBuilderView({
      objectiveSummary: "Preview a guided E2E task flow without apply.",
      intent: "Generate a structured model_patch_proposal draft.",
      modelProfileId: "deepseek-chat",
      keySourceRef: liveProposalAllowedKeySourceRef,
      optInMode: "explicit_live_proposal_opt_in",
      allowedPathRefsText: "docs/app-shell-e2e-coding-task-wizard-v0.13.md"
    });
    const receipt = buildAppLiveProposalSessionReceiptView({
      typedConfirmation: "CALL DEEPSEEK FOR PROPOSAL",
      objectiveSummary: "Preview a guided E2E task flow without apply.",
      modelProfileId: "deepseek-chat",
      allowedPathRefsText: "docs/app-shell-e2e-coding-task-wizard-v0.13.md",
      apiKeyPolicyId: policy.policyId,
      requestBuilderId: request.requestId,
      requestBoundaryHash: request.requestHashPrefix
    });
    const readyLiveView = buildLiveDeepSeekProposalGenerationView({
      liveProposalOptInGateView: policy,
      requestBuilderView: request,
      sessionReceiptView: receipt,
      keySourceRef: liveProposalAllowedKeySourceRef,
      expectedKeySourceRef: liveProposalAllowedKeySourceRef
    });
    const wizard = buildE2ECodingTaskWizardView({
      objectiveSummary: "Preview a guided E2E task flow without apply.",
      liveProposalGenerationView: readyLiveView,
      modelPatchProposalImportView: importView,
      modelProposalChainIntegrationView: chainView,
      idGenerator: () => "e2e-wizard-test-run"
    });
    const serialized = JSON.stringify(wizard);

    expect(wizard.status).not.toBe("blocked");
    expect(wizard.sections.map((section) => section.label)).toEqual([
      "Objective summary",
      "Live proposal status",
      "Proposal import status",
      "Chain integration status",
      "Approval readiness",
      "Apply readiness",
      "Verification readiness",
      "Rollback readiness"
    ]);
    expect(wizard.readiness.canRequestLiveProposal).toBe(true);
    expect(wizard.readiness.canAutoApply).toBe(false);
    expect(wizard.readiness.canApplyPatch).toBe(false);
    expect(wizard.readiness.canRollback).toBe(false);
    expect(wizard.readiness.canWriteEventStore).toBe(false);
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("sk-fake");
  });

  it("blocks unsafe raw wizard inputs and keeps the App wizard copy preview-only", async () => {
    const blocked = buildE2ECodingTaskWizardView({
      objectiveSummary: "Preview a guided E2E task flow.",
      liveProposalGenerationView: {
        rawPrompt: "RAW_PROMPT_BODY_SHOULD_NOT_LEAK",
        status: "generated"
      } as never
    });
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const wizardSource = await readFile(
      path.join(appRoot, "src", "e2e-coding-task-wizard-view.ts"),
      "utf8"
    );
    const combinedSource = `${appSource}\n${wizardSource}`;

    expect(blocked.status).toBe("blocked");
    expect(JSON.stringify(blocked)).not.toContain(
      "RAW_PROMPT_BODY_SHOULD_NOT_LEAK"
    );
    expect(appSource).toContain("End-to-End Coding Task Wizard");
    expect(appSource).toContain("Guided flow / no auto-apply");
    expect(appSource).toContain("Preview Task Flow");
    expect(appSource).toContain("Request Live Proposal");
    expect(appSource).toContain("Import Proposal to Chain");
    expect(combinedSource).toContain("Objective summary");
    expect(combinedSource).toContain("Live proposal status");
    expect(combinedSource).toContain("Proposal import status");
    expect(combinedSource).toContain("Chain integration status");
    expect(combinedSource).toContain("Approval readiness");
    expect(combinedSource).toContain("Apply readiness");
    expect(combinedSource).toContain("Verification readiness");
    expect(combinedSource).toContain("Rollback readiness");
    expect(appSource).toContain("Convert");
    expect(appSource).toContain("Refresh events");
    expect(appSource).not.toContain("Auto Apply Task");
    expect(appSource).not.toContain("Apply E2E Task");
    expect(appSource).not.toContain("Rollback E2E Task");
    expect(appSource).not.toContain("Raw model response enabled");
    expect(appSource).not.toContain("raw prompt persistence enabled");
  });

  it("documents the P0R-004 App E2E coding task wizard boundary", async () => {
    const docs = await readFile(
      path.join(repoRoot, "docs", "app-shell-e2e-coding-task-wizard-v0.13.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${docs}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("App Shell E2E Coding Task Wizard v0.13");
    expect(combined).toContain("objective summary");
    expect(combined).toContain("live proposal status");
    expect(combined).toContain("proposal import status");
    expect(combined).toContain("chain integration status");
    expect(combined).toContain("approval readiness");
    expect(combined).toContain("apply readiness");
    expect(combined).toContain("verification readiness");
    expect(combined).toContain("rollback readiness");
    expect(combined).toContain("No auto-apply");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No raw prompt persistence");
    expect(combined).toContain("No raw response display");
    expect(combined).toContain("No arbitrary Git execution");
    expect(combined).toContain("No arbitrary shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("app-shell-e2e-coding-task-wizard-v0.13.md");
  });

  it("sequences approved apply, verification, and rollback without arbitrary execution", () => {
    const patchProposalPreview = {
      proposalId: "proposal-1",
      status: "preview",
      items: [{ path: "src/safe-file.ts", changeKind: "update" }]
    };
    const patchValidationPreview = {
      validationId: "validation-1",
      status: "valid"
    };
    const patchDiffAuditPreview = {
      auditId: "audit-1",
      status: "audit_ready"
    };
    const patchApprovalDraft = {
      approvalDraftId: "approval-1",
      status: "approval_ready"
    };
    const workspaceSnapshotBackupContract = {
      userWorkspaceRootRef: "workspace-ref-demo"
    };
    const applyReceipt = buildAppApprovedExecutionReceiptView({
      receiptKind: "apply",
      applyTypedConfirmation: "APPLY TO USER WORKSPACE",
      allowedRelativePathsText: "src/safe-file.ts",
      workspaceSnapshotBackupContract,
      patchProposalPreview,
      patchValidationPreview,
      patchDiffAuditPreview,
      patchApprovalDraft
    });
    const applyFlow = buildAppApprovedExecutionFlowView({
      workspaceRoot: "D:\\workspace",
      receiptView: applyReceipt,
      patchProposalPreview,
      patchValidationPreview,
      patchDiffAuditPreview,
      patchApprovalDraft,
      contentDraft: "safe content"
    });
    const applyResult: ApprovedUserWorkspaceApplyResult = {
      ok: true,
      applyId: "apply-1",
      checkpointId: "checkpoint-1",
      checkpointHash: "checkpoint-hash-123456",
      workspaceRootRef: "workspace-ref-demo",
      operationCount: 1,
      filesCreated: 0,
      filesUpdated: 1,
      filesDeleted: 0,
      bytesWritten: 12,
      warningCodes: [],
      inputSnapshotHash: "input-hash",
      outputSnapshotHash: "output-hash",
      resultHash: "apply-result-hash",
      eventPreview: {
        type: "user_workspace.patch_apply.approved_result",
        applyId: "apply-1",
        checkpointId: "checkpoint-1",
        checkpointHash: "checkpoint-hash-123456",
        workspaceRootRef: "workspace-ref-demo",
        operationCount: 1,
        filesCreated: 0,
        filesUpdated: 1,
        filesDeleted: 0,
        bytesWritten: 12,
        pathSummaries: ["src/safe-file.ts update"],
        pathSummaryCount: 1,
        resultHash: "apply-result-hash",
        warningCodes: [],
        notWritten: true
      },
      safeMessage: "Approved apply summary."
    };
    const rollbackReceipt = buildAppApprovedExecutionReceiptView({
      receiptKind: "rollback",
      rollbackTypedConfirmation: "ROLLBACK USER WORKSPACE",
      allowedRelativePathsText: "src/safe-file.ts",
      workspaceSnapshotBackupContract,
      patchProposalPreview,
      patchValidationPreview,
      patchDiffAuditPreview,
      patchApprovalDraft,
      approvedApplyResult: applyResult
    });
    const rollbackFlow = buildAppApprovedExecutionFlowView({
      workspaceRoot: "D:\\workspace",
      receiptView: rollbackReceipt,
      patchProposalPreview,
      patchValidationPreview,
      patchDiffAuditPreview,
      patchApprovalDraft,
      contentDraft: "safe content",
      applyResult
    });
    const failedVerification: ShellVerificationLaneResult = {
      ok: true,
      templateId: "app.typecheck",
      status: "failed",
      exitCode: 1,
      workspaceRootRef: "workspace-ref-demo",
      stdoutBytes: 120,
      stderrBytes: 0,
      stdoutLineCount: 4,
      stderrLineCount: 0,
      warningCodes: [],
      commandHash: "command-hash",
      outputHash: "verification-output-hash",
      durationMs: 20,
      truncated: false,
      rawStdoutIncluded: false,
      rawStderrIncluded: false,
      eventPreview: {
        type: "shell.verification_lane.executed",
        templateId: "app.typecheck",
        workspaceRootRef: "workspace-ref-demo",
        commandHash: "command-hash",
        resultHash: "verification-output-hash",
        exitCode: 1,
        stdoutBytes: 120,
        stderrBytes: 0,
        warningCodes: [],
        durationMs: 20,
        truncated: false,
        summaryOnly: true,
        notWritten: true
      },
      safeMessage: "Verification failed with summary-only output."
    };
    const rollbackResult: ApprovedUserWorkspaceRollbackResult = {
      ok: true,
      rollbackId: "rollback-1",
      applyId: "apply-1",
      checkpointId: "checkpoint-1",
      checkpointHash: "checkpoint-hash-123456",
      workspaceRootRef: "workspace-ref-demo",
      operationCount: 1,
      filesRemoved: 0,
      filesRestored: 1,
      restoredSnapshotHash: "restored-hash",
      resultHash: "rollback-result-hash",
      warningCodes: [],
      eventPreview: {
        type: "user_workspace.patch_rollback.approved_result",
        rollbackId: "rollback-1",
        applyId: "apply-1",
        checkpointId: "checkpoint-1",
        checkpointHash: "checkpoint-hash-123456",
        workspaceRootRef: "workspace-ref-demo",
        operationCount: 1,
        filesRemoved: 0,
        filesRestored: 1,
        pathSummaries: ["src/safe-file.ts restored"],
        pathSummaryCount: 1,
        restoredSnapshotHash: "restored-hash",
        resultHash: "rollback-result-hash",
        warningCodes: [],
        notWritten: true
      },
      safeMessage: "Approved rollback summary."
    };

    const beforeGates = buildE2ECodingTaskSequencerView();
    const applyReady = buildE2ECodingTaskSequencerView({
      approvedExecutionFlowView: applyFlow
    });
    const afterApply = buildE2ECodingTaskSequencerView({
      approvedExecutionFlowView: rollbackFlow,
      applyResult
    });
    const rollbackReady = buildE2ECodingTaskSequencerView({
      approvedExecutionFlowView: rollbackFlow,
      applyResult,
      shellVerificationResult: failedVerification
    });
    const rolledBack = buildE2ECodingTaskSequencerView({
      approvedExecutionFlowView: rollbackFlow,
      applyResult,
      shellVerificationResult: failedVerification,
      rollbackResult
    });
    const unsafe = buildE2ECodingTaskSequencerView({
      approvedExecutionFlowView: {
        shellCommand: "npm test && arbitrary",
        canAutoApply: true
      } as never
    });

    expect(beforeGates.readiness.canRunApprovedApply).toBe(false);
    expect(beforeGates.readiness.canRunVerification).toBe(false);
    expect(beforeGates.readiness.canRunApprovedRollback).toBe(false);
    expect(applyReady.status).toBe("apply_ready");
    expect(applyReady.readiness.canRunApprovedApply).toBe(true);
    expect(applyReady.readiness.canRunVerification).toBe(false);
    expect(afterApply.status).toBe("verification_ready");
    expect(afterApply.readiness.canRunVerification).toBe(true);
    expect(afterApply.readiness.canRunApprovedRollback).toBe(false);
    expect(rollbackReady.status).toBe("rollback_ready");
    expect(rollbackReady.readiness.canRunApprovedRollback).toBe(true);
    expect(rolledBack.status).toBe("done");
    expect(unsafe.status).toBe("blocked");
    expect(unsafe.findings.map((finding) => finding.code)).toContain(
      "ARBITRARY_SHELL_FIELD_REJECTED"
    );
    expect(rollbackReady.readiness.canAutoApply).toBe(false);
    expect(rollbackReady.readiness.canUseArbitraryGit).toBe(false);
    expect(rollbackReady.readiness.canUseArbitraryShell).toBe(false);
    expect(JSON.stringify(rollbackReady)).not.toContain("rawPrompt");
    expect(JSON.stringify(rollbackReady)).not.toContain("rawResponse");
    expect(JSON.stringify(rollbackReady)).not.toContain("Authorization");
    expect(JSON.stringify(rollbackReady)).not.toContain("sk-fake");
  });

  it("renders the P0R-005 sequencer controls as gated existing commands", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const sequencerSource = await readFile(
      path.join(appRoot, "src", "e2e-coding-task-sequencer-view.ts"),
      "utf8"
    );
    const combinedSource = `${appSource}\n${sequencerSource}`;

    expect(appSource).toContain(
      "End-to-End Apply / Verify / Rollback Sequencer"
    );
    expect(appSource).toContain("Approved gates only / no arbitrary execution");
    expect(appSource).toContain("Run Sequenced Approved Apply");
    expect(appSource).toContain("Run Sequenced Git Read Lane");
    expect(appSource).toContain("Run Sequenced Verification Lane");
    expect(appSource).toContain("Run Sequenced Approved Rollback");
    expect(appSource).toContain("User explicitly requested rollback");
    expect(combinedSource).toContain("proposal_ready");
    expect(combinedSource).toContain("approval_required");
    expect(combinedSource).toContain("apply_ready");
    expect(combinedSource).toContain("apply_executed");
    expect(combinedSource).toContain("verification_ready");
    expect(combinedSource).toContain("verification_passed");
    expect(combinedSource).toContain("verification_failed");
    expect(combinedSource).toContain("rollback_ready");
    expect(combinedSource).toContain("rollback_executed");
    expect(combinedSource).toContain("done");
    expect(appSource).not.toContain("Run Arbitrary Shell");
    expect(appSource).not.toContain("Run Git Write");
    expect(appSource).not.toContain("Auto Apply Task");
  });

  it("documents the P0R-005 App E2E apply verify rollback sequencer boundary", async () => {
    const docs = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-e2e-coding-task-sequencer-v0.13.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${docs}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("App Shell E2E Coding Task Sequencer v0.13");
    expect(combined).toContain("approved apply from v0.11");
    expect(combined).toContain("Git read and shell verification lanes");
    expect(combined).toContain("approved rollback from v0.11");
    expect(combined).toContain("proposal_ready");
    expect(combined).toContain("rollback_executed");
    expect(combined).toContain("No auto-apply");
    expect(combined).toContain("No arbitrary Git");
    expect(combined).toContain("No arbitrary shell");
    expect(combined).toContain("No Git write");
    expect(combined).toContain("No raw event payload");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("app-shell-e2e-coding-task-sequencer-v0.13.md");
  });

  it("classifies P0R-006 E2E task recovery states without auto-retry execution", () => {
    const readyReceipt = {
      status: "ready",
      findings: [],
      blockerCount: 0,
      nextAction: "Receipt ready."
    } as never;
    const applyFlow = {
      receiptKind: "apply",
      readiness: { canRollbackApprovedPatch: false }
    } as never;
    const rollbackFlow = {
      receiptKind: "rollback",
      readiness: { canRollbackApprovedPatch: true }
    } as never;
    const applyResult = {
      applyId: "apply-1"
    } as ApprovedUserWorkspaceApplyResult;
    const failedVerification = {
      status: "failed",
      safeMessage: "Verification failed with summary-only output."
    } as ShellVerificationLaneResult;

    const staleSnapshot = buildE2ETaskRecoveryView({
      approvalReceiptView: readyReceipt,
      approvedExecutionFlowView: applyFlow,
      approvedExecutionError:
        "Expected before hash mismatch. Snapshot changed before apply."
    });
    const applyConflict = buildE2ETaskRecoveryView({
      approvalReceiptView: readyReceipt,
      approvedExecutionFlowView: applyFlow,
      approvedExecutionError: "Apply conflict: file already exists."
    });
    const verificationFailure = buildE2ETaskRecoveryView({
      approvalReceiptView: readyReceipt,
      approvedExecutionFlowView: rollbackFlow,
      applyResult,
      shellVerificationResult: failedVerification
    });
    const rollbackFailure = buildE2ETaskRecoveryView({
      approvalReceiptView: readyReceipt,
      approvedExecutionFlowView: rollbackFlow,
      applyResult,
      approvedExecutionError: "Approved rollback failed safely."
    });
    const fileExists = buildE2ETaskRecoveryView({
      conversionError: {
        errorCode: "FILE_EXISTS",
        safeMessage: "FILE_EXISTS: choose a new filename."
      }
    });
    const rawBlocked = buildE2ETaskRecoveryView({
      approvedExecutionFlowView: {
        preimageContent: "unsafe",
        rawSource: "unsafe",
        apiKey: "sk-fake-not-a-real-key"
      } as never
    });

    expect(staleSnapshot.failureCategory).toBe("stale_snapshot");
    expect(staleSnapshot.safeSummary).toContain("Expected before hash");
    expect(staleSnapshot.recommendedAction).toContain("Conflict detected");
    expect(staleSnapshot.recommendedAction).toContain("stale snapshot");
    expect(staleSnapshot.recommendedAction).toContain("revalidate required");
    expect(staleSnapshot.retryAllowed).toBe(true);
    expect(applyConflict.failureCategory).toBe("apply_conflict");
    expect(applyConflict.recommendedAction).toContain("Conflict detected");
    expect(applyConflict.recommendedAction).toContain("revalidate required");
    expect(verificationFailure.failureCategory).toBe("verification_failure");
    expect(verificationFailure.recommendedAction).toContain("rollback");
    expect(verificationFailure.rollbackAvailable).toBe(true);
    expect(verificationFailure.retryAllowed).toBe(false);
    expect(rollbackFailure.failureCategory).toBe("rollback_failure");
    expect(rollbackFailure.safeSummary).toContain("rollback failed safely");
    expect(fileExists.failureCategory).toBe("convert_file_exists");
    expect(fileExists.recommendedAction).toContain("new CSV filename");
    expect(rawBlocked.status).toBe("blocked");
    expect(rawBlocked.failureCategory).toBe("raw_content_blocked");
    expect(rawBlocked.findings.map((finding) => finding.code)).toContain(
      "RAW_SOURCE_FIELD_REJECTED"
    );
    expect(staleSnapshot.readiness.canAutoRetryExecution).toBe(false);
    expect(staleSnapshot.readiness.canAutoApply).toBe(false);
    expect(staleSnapshot.readiness.canRunArbitraryGit).toBe(false);
    expect(staleSnapshot.readiness.canRunArbitraryShell).toBe(false);
    expect(JSON.stringify(rawBlocked)).not.toContain("preimageContent");
    expect(JSON.stringify(rawBlocked)).not.toContain("rawSource");
    expect(JSON.stringify(rawBlocked)).not.toContain("sk-fake");
  });

  it("renders the P0R-006 recovery surface without enabled retry or arbitrary execution", async () => {
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );
    const recoverySource = await readFile(
      path.join(appRoot, "src", "e2e-task-recovery-view.ts"),
      "utf8"
    );
    const combinedSource = `${appSource}\n${recoverySource}`;

    expect(appSource).toContain("E2E Task Recovery");
    expect(appSource).toContain("Safe recovery / no auto-retry execution");
    expect(appSource).toContain("Preview E2E Task Recovery");
    expect(appSource).toContain("Failure category");
    expect(appSource).toContain("Retry / rollback state");
    expect(appSource).toContain("rollback unavailable");
    expect(appSource).toContain("rollback safe");
    expect(appSource).toContain("Safe summary");
    expect(appSource).toContain("Recommended action");
    expect(combinedSource).toContain("revalidate required");
    expect(combinedSource).toContain("Conflict detected");
    expect(combinedSource).toContain("stale_snapshot");
    expect(combinedSource).toContain("apply_conflict");
    expect(combinedSource).toContain("verification_failure");
    expect(combinedSource).toContain("rollback_failure");
    expect(combinedSource).toContain("eventstore_write_failure");
    expect(combinedSource).toContain("convert_file_exists");
    expect(combinedSource).toContain("raw_content_blocked");
    expect(appSource).not.toContain("Auto Retry Execution");
    expect(appSource).not.toContain("Retry Execution Now");
    expect(appSource).not.toContain("Run Arbitrary Shell");
    expect(appSource).not.toContain("Run Git Write");
  });

  it("documents the P0R-006 E2E task failure recovery boundary", async () => {
    const docs = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-e2e-task-failure-recovery-v0.13.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${docs}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("App Shell E2E Task Failure Recovery v0.13");
    expect(combined).toContain("live proposal blocked");
    expect(combined).toContain("schema or repair failed");
    expect(combined).toContain("validation blocked");
    expect(combined).toContain("typed confirmation mismatch");
    expect(combined).toContain("stale snapshot");
    expect(combined).toContain("apply conflict");
    expect(combined).toContain("verification failure");
    expect(combined).toContain("rollback failure");
    expect(combined).toContain("EventStore write failure");
    expect(combined).toContain("Convert FILE_EXISTS");
    expect(combined).toContain("No auto-retry execution");
    expect(combined).toContain("No raw event payload");
    expect(combined).toContain("No arbitrary Git");
    expect(combined).toContain("No arbitrary shell");
    expect(combined).toContain("app-shell-e2e-task-failure-recovery-v0.13.md");
  });

  it("runs the P0R-007 E2E coding task regression smoke through fixed wrappers", async () => {
    const workspaceRoot = await createTempWorkspace();
    const regressionRoot = path.join(
      appRoot,
      "test",
      "fixtures",
      "e2e-coding-task-regression"
    );
    const docsTask = JSON.parse(
      await readFile(path.join(regressionRoot, "safe-docs-task.json"), "utf8")
    ) as Record<string, string | boolean>;
    const verificationTask = JSON.parse(
      await readFile(
        path.join(regressionRoot, "verification-failure-task.json"),
        "utf8"
      )
    ) as Record<string, string | boolean>;
    const rollbackTask = JSON.parse(
      await readFile(path.join(regressionRoot, "rollback-task.json"), "utf8")
    ) as Record<string, string | boolean>;
    const expectedEventSummary = JSON.parse(
      await readFile(
        path.join(regressionRoot, "expected-event-summary.json"),
        "utf8"
      )
    ) as Record<string, unknown>;
    const payload = await readFixture();
    const calls: string[] = [];
    const applyResult: ApprovedUserWorkspaceApplyResult = {
      ok: true,
      applyId: "apply-p0r-regression",
      checkpointId: String(rollbackTask.checkpointId),
      checkpointHash: String(rollbackTask.checkpointHash),
      workspaceRootRef: String(docsTask.workspaceRootRef),
      operationCount: 1,
      filesCreated: 1,
      filesUpdated: 0,
      filesDeleted: 0,
      bytesWritten: 54,
      warningCodes: [],
      inputSnapshotHash: "input-p0r-regression",
      outputSnapshotHash: "output-p0r-regression",
      resultHash: "apply-result-p0r-regression",
      eventPreview: {
        type: "user_workspace.patch_apply.approved_result",
        applyId: "apply-p0r-regression",
        checkpointId: String(rollbackTask.checkpointId),
        checkpointHash: String(rollbackTask.checkpointHash),
        workspaceRootRef: String(docsTask.workspaceRootRef),
        operationCount: 1,
        filesCreated: 1,
        filesUpdated: 0,
        filesDeleted: 0,
        bytesWritten: 54,
        pathSummaries: [`create ${docsTask.path}`],
        pathSummaryCount: 1,
        resultHash: "apply-result-p0r-regression",
        warningCodes: [],
        notWritten: true
      },
      safeMessage:
        "Approved user workspace apply completed with a summary-only result."
    };
    const rollbackResult: ApprovedUserWorkspaceRollbackResult = {
      ok: true,
      rollbackId: "rollback-p0r-regression",
      applyId: applyResult.applyId,
      checkpointId: applyResult.checkpointId,
      checkpointHash: applyResult.checkpointHash,
      workspaceRootRef: applyResult.workspaceRootRef,
      operationCount: 1,
      filesRemoved: 1,
      filesRestored: 0,
      restoredSnapshotHash: "restored-p0r-regression",
      resultHash: "rollback-result-p0r-regression",
      warningCodes: [],
      eventPreview: {
        type: "user_workspace.patch_rollback.approved_result",
        rollbackId: "rollback-p0r-regression",
        applyId: applyResult.applyId,
        checkpointId: applyResult.checkpointId,
        checkpointHash: applyResult.checkpointHash,
        workspaceRootRef: applyResult.workspaceRootRef,
        operationCount: 1,
        filesRemoved: 1,
        filesRestored: 0,
        pathSummaries: [`remove ${docsTask.path}`],
        pathSummaryCount: 1,
        restoredSnapshotHash: "restored-p0r-regression",
        resultHash: "rollback-result-p0r-regression",
        warningCodes: [],
        notWritten: true
      },
      safeMessage:
        "Approved user workspace rollback completed with a summary-only result."
    };
    const failedVerification = fixedShellVerificationLaneResult({
      templateId: "pnpm.test.scoped",
      status: "failed",
      exitCode: 1,
      workspaceRootRef: String(docsTask.workspaceRootRef),
      safeMessage: "Verification failed with summary-only output.",
      eventPreview: {
        ...fixedShellVerificationLaneResult().eventPreview,
        templateId: "pnpm.test.scoped",
        workspaceRootRef: String(docsTask.workspaceRootRef),
        exitCode: 1,
        summaryOnly: true,
        notWritten: true
      }
    });
    const invoke: TauriInvoke = async (command, args) => {
      calls.push(command);
      if (command === "check_runner_preflight") {
        return fixedPreflight({ workspaceValid: true }) as never;
      }
      if (command === "run_web_table_to_csv_flow") {
        return fixedResult(workspaceRoot) as never;
      }
      if (command === "apply_approved_user_workspace_patch") {
        return applyResult as never;
      }
      if (command === "run_shell_verification_lane") {
        return failedVerification as never;
      }
      if (command === "rollback_approved_user_workspace_patch") {
        return rollbackResult as never;
      }
      if (command === "record_approved_user_workspace_execution_event") {
        const eventPreview = args?.eventPreview as
          | ApprovedUserWorkspaceApplyResult["eventPreview"]
          | ApprovedUserWorkspaceRollbackResult["eventPreview"]
          | undefined;
        const isRollback =
          eventPreview?.type ===
          "user_workspace.patch_rollback.approved_result";
        return {
          ok: true,
          eventId: "approved-execution-event-p0r",
          eventType: isRollback
            ? "user_workspace.patch_rollback.app_executed"
            : "user_workspace.patch_apply.app_executed",
          operationId: isRollback
            ? "rollback-p0r-regression"
            : "apply-p0r-regression",
          checkpointId: String(rollbackTask.checkpointId),
          eventLogPath: path.join(
            workspaceRoot,
            ".deepseek-workbench",
            "events.jsonl"
          ),
          safeMessage:
            "Summary-only approved execution event recorded locally.",
          warnings: []
        } as never;
      }
      if (command === "record_verification_lane_event") {
        return fixedVerificationLaneEventRecord({
          eventType: "shell.verification_lane.executed",
          laneOrTemplateId: "pnpm.test.scoped",
          resultHash: failedVerification.outputHash
        }) as never;
      }
      throw new Error(`unexpected command ${command}`);
    };

    const importView = buildModelPatchProposalImportView({
      draftText: JSON.stringify({
        schemaVersion: "model_patch_proposal.v1",
        proposalId: docsTask.proposalId,
        title: "P0R safe docs regression",
        intent: "docs_update",
        operations: [
          {
            operationId: "op-p0r-docs",
            path: docsTask.path,
            changeKind: "documentation",
            summary: "Create a safe regression docs smoke file.",
            rationale: "The P0R regression suite needs a safe docs task.",
            estimatedLinesAdded: 3,
            estimatedLinesRemoved: 0,
            warningCodes: []
          }
        ],
        pathSummaries: [
          {
            path: docsTask.path,
            changeKind: "documentation",
            summary: "Safe docs regression smoke file."
          }
        ],
        evidenceRefs: [
          {
            refId: "fixture",
            kind: "manual_note",
            summary: "P0R fixture summary only.",
            hashPrefix: "p0rfixture"
          }
        ],
        riskNotes: [
          {
            code: "DOCS_ONLY",
            severity: "info",
            summary: "Docs-only regression fixture."
          }
        ],
        validationHints: ["Run App regression smoke."],
        modelProfileId: "deepseek-chat",
        source: "deepseek_model_patch_proposal"
      }),
      sourceKind: "fixture"
    });
    const chainView = buildModelProposalChainIntegrationView({
      modelImportView: importView
    });
    const receiptView = buildAppApprovedExecutionReceiptView({
      receiptKind: "apply",
      applyTypedConfirmation: String(docsTask.applyTypedConfirmation),
      rollbackTypedConfirmation: String(rollbackTask.rollbackTypedConfirmation),
      allowedRelativePathsText: String(docsTask.path),
      workspaceSnapshotBackupContract: {
        userWorkspaceRootRef: docsTask.workspaceRootRef
      },
      patchProposalPreview: {
        proposalId: docsTask.proposalId,
        items: [{ path: docsTask.path, changeKind: docsTask.changeKind }]
      },
      patchValidationPreview: { validationId: docsTask.validationId },
      patchDiffAuditPreview: { auditId: docsTask.auditId },
      patchApprovalDraft: { approvalDraftId: docsTask.approvalDraftId }
    });
    const applyFlow = buildAppApprovedExecutionFlowView({
      workspaceRoot,
      receiptView,
      patchProposalPreview: {
        proposalId: docsTask.proposalId,
        items: [{ path: docsTask.path, changeKind: docsTask.changeKind }]
      },
      patchValidationPreview: { validationId: docsTask.validationId },
      patchDiffAuditPreview: { auditId: docsTask.auditId },
      patchApprovalDraft: { approvalDraftId: docsTask.approvalDraftId },
      contentDraft: String(docsTask.contentDraft)
    });
    const convertResult = await runDesktopWebTableToCsvFlow(
      {
        workspaceRoot,
        payloadText: JSON.stringify(payload),
        filename: "p0r-regression.csv"
      },
      invoke
    );
    const applied = await applyApprovedUserWorkspacePatch(
      buildApprovedApplyRequestFromExecutionFlow({
        workspaceRoot,
        receiptView,
        patchProposalPreview: {
          proposalId: docsTask.proposalId,
          items: [{ path: docsTask.path, changeKind: docsTask.changeKind }]
        },
        patchValidationPreview: { validationId: docsTask.validationId },
        patchDiffAuditPreview: { auditId: docsTask.auditId },
        patchApprovalDraft: { approvalDraftId: docsTask.approvalDraftId },
        contentDraft: String(docsTask.contentDraft)
      }),
      invoke
    );
    const applyEvent = await recordApprovedUserWorkspaceExecutionEvent(
      { workspaceRoot, eventPreview: applied.eventPreview },
      invoke
    );
    const verification = await runShellVerificationLane(
      {
        workspaceRoot,
        workspaceRootRef: String(docsTask.workspaceRootRef),
        templateId: "pnpm.test.scoped",
        safeArgs: {
          testFilePath: String(verificationTask.safeTestFilePath)
        }
      },
      invoke
    );
    const verificationEvent = await recordVerificationLaneEvent(
      { workspaceRoot, eventPreview: verification.eventPreview },
      invoke
    );
    const rollbackReceipt = buildAppApprovedExecutionReceiptView({
      receiptKind: "rollback",
      applyTypedConfirmation: String(docsTask.applyTypedConfirmation),
      rollbackTypedConfirmation: String(rollbackTask.rollbackTypedConfirmation),
      allowedRelativePathsText: String(docsTask.path),
      workspaceSnapshotBackupContract: {
        userWorkspaceRootRef: docsTask.workspaceRootRef
      },
      patchProposalPreview: {
        proposalId: docsTask.proposalId,
        items: [{ path: docsTask.path, changeKind: docsTask.changeKind }]
      },
      patchValidationPreview: { validationId: docsTask.validationId },
      patchDiffAuditPreview: { auditId: docsTask.auditId },
      patchApprovalDraft: { approvalDraftId: docsTask.approvalDraftId },
      patchRollbackCheckpointPreview: {
        checkpointPreviewId: rollbackTask.checkpointId
      },
      approvedApplyResult: applied
    });
    const rollbackFlow = buildAppApprovedExecutionFlowView({
      workspaceRoot,
      receiptView: rollbackReceipt,
      patchProposalPreview: {
        proposalId: docsTask.proposalId,
        items: [{ path: docsTask.path, changeKind: docsTask.changeKind }]
      },
      patchValidationPreview: { validationId: docsTask.validationId },
      patchDiffAuditPreview: { auditId: docsTask.auditId },
      patchApprovalDraft: { approvalDraftId: docsTask.approvalDraftId },
      applyResult: applied
    });
    const rollbackReady = buildE2ECodingTaskSequencerView({
      modelPatchProposalImportView: importView,
      modelProposalChainIntegrationView: chainView,
      approvedExecutionFlowView: rollbackFlow,
      applyResult: applied,
      shellVerificationResult: verification
    });
    const recovery = buildE2ETaskRecoveryView({
      approvalReceiptView: rollbackReceipt,
      approvedExecutionFlowView: rollbackFlow,
      applyResult: applied,
      shellVerificationResult: verification,
      sequencerView: rollbackReady
    });
    const rolledBack = await rollbackApprovedUserWorkspacePatch(
      buildApprovedRollbackRequestFromExecutionFlow({
        workspaceRoot,
        receiptView: rollbackReceipt,
        patchProposalPreview: {
          proposalId: docsTask.proposalId,
          items: [{ path: docsTask.path, changeKind: docsTask.changeKind }]
        },
        patchValidationPreview: { validationId: docsTask.validationId },
        patchDiffAuditPreview: { auditId: docsTask.auditId },
        patchApprovalDraft: { approvalDraftId: docsTask.approvalDraftId },
        applyResult: applied
      }),
      invoke
    );
    const rollbackEvent = await recordApprovedUserWorkspaceExecutionEvent(
      { workspaceRoot, eventPreview: rolledBack.eventPreview },
      invoke
    );
    const replayPanel = buildEventLogPanelModel(
      fixedEventSummary({
        approvedApplyCount: Number(expectedEventSummary.approvedApplyCount),
        approvedRollbackCount: Number(
          expectedEventSummary.approvedRollbackCount
        ),
        verificationEventCount: Number(
          expectedEventSummary.verificationLaneCount
        ),
        timeline: [
          {
            id: "apply-event",
            type: "user_workspace.patch_apply.app_executed",
            summary: "approved apply summary",
            safePayloadKeys: ["pathSummaries", "pathSummaryCount"]
          },
          {
            id: "verification-event",
            type: "shell.verification_lane.executed",
            summary: "shell verification summary",
            safePayloadKeys: ["templateId", "resultHash"]
          },
          {
            id: "rollback-event",
            type: "user_workspace.patch_rollback.app_executed",
            summary: "approved rollback summary",
            safePayloadKeys: ["pathSummaries", "pathSummaryCount"]
          }
        ]
      })
    );
    const serialized = JSON.stringify({
      importView,
      chainView,
      applyFlow,
      applied,
      applyEvent,
      verification,
      verificationEvent,
      recovery,
      rollbackReady,
      rolledBack,
      rollbackEvent,
      replayPanel,
      convertResult
    });

    expect(importView.readiness.canImportToPatchPreview).toBe(true);
    expect(chainView.readiness.canEnterExistingPreviewChain).toBe(true);
    expect(applyFlow.readiness.canApplyApprovedPatch).toBe(true);
    expect(applied.eventPreview.pathSummaries).toContain(
      `create ${docsTask.path}`
    );
    expect(verification.status).toBe("failed");
    expect(rollbackReady.status).toBe("rollback_ready");
    expect(recovery.failureCategory).toBe("verification_failure");
    expect(recovery.rollbackAvailable).toBe(true);
    expect(rollbackFlow.readiness.canRollbackApprovedPatch).toBe(true);
    expect(rolledBack.eventPreview.pathSummaries).toContain(
      `remove ${docsTask.path}`
    );
    expect(replayPanel?.approvedApplyCount).toBe(1);
    expect(replayPanel?.approvedRollbackCount).toBe(1);
    expect(replayPanel?.verificationEventCount).toBe(1);
    expect(convertResult.draft.relativePath).toBe("drafts/table.csv");
    expect(calls).toContain("run_web_table_to_csv_flow");
    expect(calls).toContain("apply_approved_user_workspace_patch");
    expect(calls).toContain("run_shell_verification_lane");
    expect(calls).toContain("rollback_approved_user_workspace_patch");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("rawResponse");
    expect(serialized).not.toContain("reasoning_content");
    expect(serialized).not.toContain(["api", "Key"].join(""));
    expect(serialized).not.toContain("preimageContent");
  });

  it("documents the P0R-007 E2E coding task regression suite and fixtures", async () => {
    const docs = await readFile(
      path.join(repoRoot, "docs", "e2e-coding-task-regression-suite-v0.13.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const fixtureNames = [
      "safe-docs-task.json",
      "verification-failure-task.json",
      "rollback-task.json",
      "expected-event-summary.json"
    ];
    const combined = `${docs}\n${docsIndex}\n${appReadme}`;

    for (const fixtureName of fixtureNames) {
      await access(
        path.join(
          appRoot,
          "test",
          "fixtures",
          "e2e-coding-task-regression",
          fixtureName
        )
      );
      expect(combined).toContain(fixtureName);
    }
    expect(combined).toContain("proposal/import chain works");
    expect(combined).toContain(
      "verification failure triggers rollback readiness"
    );
    expect(combined).toContain("rollback restores the checkpoint summary");
    expect(combined).toContain("Convert still works");
    expect(combined).toContain("No auto-apply");
    expect(combined).toContain("No arbitrary Git");
    expect(combined).toContain("No arbitrary shell");
    expect(combined).toContain("No raw prompt");
    expect(docsIndex).toContain("e2e-coding-task-regression-suite-v0.13.md");
  });

  it("documents the P0L-001 DeepSeek patch proposal ADR and gates without implementation", async () => {
    const adr = await readFile(
      path.join(
        repoRoot,
        "docs",
        "adr",
        "0007-deepseek-patch-proposal-generation.md"
      ),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(
        repoRoot,
        "docs",
        "deepseek-patch-proposal-generation-threat-model-v0.7.md"
      ),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "deepseek-patch-proposal-generation-implementation-gate-v0.7.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0l-002-model-patch-proposal-schema-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${nextPlan}\n${docsIndex}`;

    expect(combined).toContain("DeepSeek Patch Proposal Generation");
    expect(combined).toContain("Proposed / Accepted for P0L design gate");
    expect(combined).toContain("no live DeepSeek call");
    expect(combined).toContain("DeepSeek must not write files");
    expect(combined).toContain("DeepSeek must not call apply or rollback");
    expect(combined).toContain("DeepSeek must not issue PermissionLease");
    expect(combined).toContain("schema validation");
    expect(combined).toContain("secret scan");
    expect(combined).toContain("path guard");
    expect(combined).toContain("patch validation preview");
    expect(combined).toContain("diff audit");
    expect(combined).toContain("approval draft");
    expect(combined).toContain("virtual apply");
    expect(combined).toContain("rollback checkpoint");
    expect(combined).toContain("replay projection");
    expect(combined).toContain("No App execution");
    expect(combined).toContain("No Git");
    expect(combined).toContain("No shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("Do not implement live model call");
    expect(combined).toContain("model_patch_proposal");
    expect(combined).toMatch(/forbidden fields/i);
    expect(combined).toContain("Example Safe Fixture");
    expect(combined).toContain("Example Rejected Fixture");
    expect(docsIndex).toContain(
      "adr/0007-deepseek-patch-proposal-generation.md"
    );
    expect(docsIndex).toContain(
      "deepseek-patch-proposal-generation-threat-model-v0.7.md"
    );
    expect(docsIndex).toContain(
      "deepseek-patch-proposal-generation-implementation-gate-v0.7.md"
    );
    expect(docsIndex).toContain("p0l-002-model-patch-proposal-schema-plan.md");
  });

  it("documents the P0L-002 model patch proposal schema without model calls or execution", async () => {
    const docs = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-model-patch-proposal-schema-v0.7.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${docs}\n${docsIndex}`;

    expect(combined).toContain("Runtime Model Patch Proposal Schema v0.7");
    expect(combined).toContain("No model call");
    expect(combined).toContain("does not write files");
    expect(combined).toContain("does not apply patches");
    expect(combined).toContain("does not rollback");
    expect(combined).toMatch(/does not\s+write EventStore/);
    expect(combined).toContain("Forbidden Fields");
    expect(combined).toContain("Path, Content, And Secret Guards");
    expect(combined).toContain("Patch Proposal Creation Preview");
    expect(combined).toContain("patch proposal validation preview");
    expect(combined).toContain("diff audit");
    expect(combined).toContain("approval draft");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("runtime-model-patch-proposal-schema-v0.7.md");
  });

  it("documents the P0L-003 fake patch proposal harness without live calls or execution", async () => {
    const docs = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-patch-proposal-fake-harness-v0.7.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${docs}\n${docsIndex}`;

    expect(combined).toContain("Runtime Patch Proposal Fake Harness v0.7");
    expect(combined).toContain("offline fake model patch proposal harness");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch or network use");
    expect(combined).toContain("No apply or rollback");
    expect(combined).toContain("P0L-002 model patch proposal schema");
    expect(combined).toContain("schema validation");
    expect(combined).toContain("diff audit");
    expect(combined).toContain("approval draft");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("runtime-patch-proposal-fake-harness-v0.7.md");
  });

  it("documents the P0L-004 patch proposal dry adapter without live calls or execution", async () => {
    const docs = await readFile(
      path.join(repoRoot, "docs", "runtime-patch-proposal-dry-adapter-v0.7.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${docs}\n${docsIndex}`;

    expect(combined).toContain("Runtime Patch Proposal Dry Adapter v0.7");
    expect(combined).toContain("Dry adapter only");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch or network use");
    expect(combined).toContain("does not include `tools` or `tool_choice`");
    expect(combined).toContain("reasoning_content");
    expect(combined).toContain("dropped");
    expect(combined).toContain("No apply or rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("runtime-patch-proposal-dry-adapter-v0.7.md");
  });

  it("documents the P0L-005 patch proposal repair loop without retry or execution", async () => {
    const docs = await readFile(
      path.join(repoRoot, "docs", "runtime-patch-proposal-repair-v0.7.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${docs}\n${docsIndex}`;

    expect(combined).toContain("Runtime Patch Proposal Repair v0.7");
    expect(combined).toContain("Deterministic repair only");
    expect(combined).toContain("No model retry");
    expect(combined).toContain("No live DeepSeek call");
    expect(combined).toContain("No API key read");
    expect(combined).toContain("No fetch or network use");
    expect(combined).toContain("unsafe paths");
    expect(combined).toContain("secret-like markers");
    expect(combined).toContain("execution fields");
    expect(combined).toContain("No apply or rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("runtime-patch-proposal-repair-v0.7.md");
  });

  it("documents the v0.6 post-release review and P0K promotion roadmap without enabling user workspace apply", async () => {
    const review = await readFile(
      path.join(repoRoot, "docs", "v0.6-sandbox-apply-postrelease-review.md"),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0k-user-workspace-apply-promotion-roadmap.md"
      ),
      "utf8"
    );
    const plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0k-001-user-workspace-apply-promotion-gate-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${review}\n${roadmap}\n${plan}\n${docsIndex}`;

    expect(combined).toContain("v0.6.0-sandbox-apply-preview-rc.1");
    expect(combined).toContain(
      "Sandboxed disposable apply and rollback prototypes"
    );
    expect(combined).toContain("App execution");
    expect(combined).toContain("P0J is complete");
    expect(combined).toContain("P0K User Workspace Apply Promotion Roadmap");
    expect(combined).toContain("promotion gate");
    expect(combined).toContain("does not directly enable user workspace apply");
    expect(combined).toContain("no direct user workspace apply");
    expect(combined).toContain("rollback gate");
    expect(combined).toContain("No Git");
    expect(combined).toContain("No shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("App remains disabled");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No EventStore writer");
    expect(combined).toContain("v0.6-sandbox-apply-postrelease-review.md");
    expect(combined).toContain("p0k-user-workspace-apply-promotion-roadmap.md");
    expect(combined).toContain(
      "p0k-001-user-workspace-apply-promotion-gate-plan.md"
    );
  });

  it("documents the P0K-001 user workspace promotion gate design without implementation", async () => {
    const adr = await readFile(
      path.join(
        repoRoot,
        "docs",
        "adr",
        "0006-user-workspace-apply-promotion-gate.md"
      ),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(
        repoRoot,
        "docs",
        "user-workspace-apply-promotion-threat-model-v0.6.md"
      ),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "user-workspace-apply-promotion-implementation-gate-v0.6.md"
      ),
      "utf8"
    );
    const nextPlan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0k-002-user-workspace-snapshot-backup-contract-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${nextPlan}\n${docsIndex}`;

    expect(combined).toContain("User Workspace Apply Promotion");
    expect(combined).toContain("no direct user workspace apply");
    expect(combined).toContain("Disposable apply result exists");
    expect(combined).toContain("user workspace snapshot");
    expect(combined).toContain("backup/preimage");
    expect(combined).toContain("rollback gate");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("Replay");
    expect(combined).toContain("No Git");
    expect(combined).toContain("No shell");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain(
      "adr/0006-user-workspace-apply-promotion-gate.md"
    );
    expect(combined).toContain(
      "user-workspace-apply-promotion-threat-model-v0.6.md"
    );
    expect(combined).toContain(
      "user-workspace-apply-promotion-implementation-gate-v0.6.md"
    );
    expect(combined).toContain(
      "p0k-002-user-workspace-snapshot-backup-contract-plan.md"
    );
  });

  it("documents the user workspace snapshot backup contract as metadata-only and no-apply", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-user-workspace-snapshot-backup-contract-v0.6.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-user-workspace-snapshot-backup-contract-v0.6.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain("User Workspace Snapshot / Backup Contract");
    expect(combined).toContain("metadata-only");
    expect(combined).toContain("no user workspace read/write");
    expect(combined).toContain("No user workspace read/write");
    expect(combined).toContain("No backup file creation");
    expect(combined).toContain("No preimage capture");
    expect(combined).toContain("No user workspace apply");
    expect(combined).toContain("No user workspace rollback");
    expect(combined).toContain("opaque display reference");
    expect(combined).toContain("userWorkspaceRootRef");
    expect(combined).toContain("symlink, junction, or reparse point");
    expect(combined).toContain("generated artifact paths");
    expect(combined).toContain("P0K-003 Promotion Readiness Checker");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "runtime-user-workspace-snapshot-backup-contract-v0.6.md"
    );
    expect(docsIndex).toContain(
      "app-shell-user-workspace-snapshot-backup-contract-v0.6.md"
    );
  });

  it("documents the user workspace promotion readiness checker as no-write", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-user-workspace-promotion-readiness-v0.6.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-user-workspace-promotion-readiness-v0.6.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain("User Workspace Promotion Readiness");
    expect(combined).toContain("readiness checker");
    expect(combined).toContain("summary-only");
    expect(combined).toContain("No user workspace read/write");
    expect(combined).toContain("No backup file creation");
    expect(combined).toContain("No user workspace apply");
    expect(combined).toContain("No user workspace rollback");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("Disposable Patch Apply Result");
    expect(combined).toContain("Disposable Patch Rollback Result");
    expect(combined).toContain("User Workspace Snapshot / Backup Contract");
    expect(combined).toContain("P0K-004 User Workspace Apply Prototype");
    expect(docsIndex).toContain(
      "runtime-user-workspace-promotion-readiness-v0.6.md"
    );
    expect(docsIndex).toContain(
      "app-shell-user-workspace-promotion-readiness-v0.6.md"
    );
  });

  it("documents the user workspace apply prototype as disabled in App", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-user-workspace-apply-prototype-v0.6.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-user-workspace-apply-prototype-v0.6.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain("User Workspace Apply Prototype");
    expect(combined).toContain("disabled by default");
    expect(combined).toContain("runtime-only");
    expect(combined).toContain("explicit user workspace fixture roots");
    expect(combined).toContain("explicit_user_workspace_apply_prototype");
    expect(combined).toContain("Promotion Readiness");
    expect(combined).toContain("User Workspace Snapshot / Backup Contract");
    expect(combined).toContain("approval receipt");
    expect(combined).toContain("not a production PermissionLease");
    expect(combined).toContain("notWritten: true");
    expect(combined).toContain("No App apply");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git commit or push");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No raw output");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("User Workspace Rollback Prototype");
    expect(docsIndex).toContain(
      "runtime-user-workspace-apply-prototype-v0.6.md"
    );
    expect(docsIndex).toContain(
      "app-shell-user-workspace-apply-prototype-v0.6.md"
    );
  });

  it("documents the user workspace rollback prototype as disabled in App", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-user-workspace-rollback-prototype-v0.6.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-user-workspace-rollback-prototype-v0.6.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain("User Workspace Rollback Prototype");
    expect(combined).toContain("disabled by default");
    expect(combined).toContain("runtime tests");
    expect(combined).toContain("explicit_user_workspace_rollback_prototype");
    expect(combined).toContain("User Workspace Apply Prototype");
    expect(combined).toContain("User Workspace Snapshot / Backup Contract");
    expect(combined).toContain("Promotion Readiness");
    expect(combined).toContain("approval receipt");
    expect(combined).toContain("not a production PermissionLease");
    expect(combined).toContain("notWritten: true");
    expect(combined).toContain("No App rollback");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git commit or push");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain(
      "runtime-user-workspace-rollback-prototype-v0.6.md"
    );
    expect(docsIndex).toContain(
      "app-shell-user-workspace-rollback-prototype-v0.6.md"
    );
  });

  it("documents the user workspace apply rollback event writer as runtime-only", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-user-workspace-apply-rollback-event-writer-v0.6.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-user-workspace-apply-rollback-event-writer-v0.6.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain("User Workspace Apply / Rollback Event Writer");
    expect(combined).toContain("runtime-only");
    expect(combined).toContain("summary-only events");
    expect(combined).toContain('recordMode: "explicit_summary_event_write"');
    expect(combined).toContain("App Shell cannot write these events");
    expect(combined).toContain("No App-side EventStore write");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No apply execution");
    expect(combined).toContain("No rollback execution");
    expect(combined).toContain("No Git commit or push");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No raw content");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("P0K-007");
    expect(docsIndex).toContain(
      "runtime-user-workspace-apply-rollback-event-writer-v0.6.md"
    );
    expect(docsIndex).toContain(
      "app-shell-user-workspace-apply-rollback-event-writer-v0.6.md"
    );
  });

  it("documents App approval execution design as disabled-only", async () => {
    const designDoc = await readFile(
      path.join(repoRoot, "docs", "app-approval-execution-design-v0.6.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${designDoc}\n${docsIndex}`;

    expect(combined).toContain("App Approval Execution Design");
    expect(combined).toContain("design only");
    expect(combined).toContain("App execution disabled");
    expect(combined).toContain("No approve action");
    expect(combined).toContain("No reject action");
    expect(combined).toContain("No PermissionLease issuing");
    expect(combined).toContain("No App-side user workspace apply");
    expect(combined).toContain("No App-side user workspace rollback");
    expect(combined).toContain("No App-side apply/rollback EventStore write");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No Git commit or push");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("Promotion readiness passes");
    expect(combined).toContain("Replay projection can reconstruct");
    expect(combined).toContain("P0K-008");
    expect(docsIndex).toContain("app-approval-execution-design-v0.6.md");
  });

  it("documents the v0.5 post-release review and P0J sandbox apply roadmap without implementation", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.5-validation-approval-virtual-apply-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(repoRoot, "docs", "p0j-sandboxed-real-apply-roadmap.md"),
      "utf8"
    );
    const plan = await readFile(
      path.join(repoRoot, "docs", "p0j-001-sandbox-apply-strategy-adr-plan.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${plan}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain(
      "v0.5.0-validation-approval-virtual-apply-preview-rc.1"
    );
    expect(combined).toContain(
      "Validation, approval, and virtual-apply previews, no execution"
    );
    expect(combined).toContain("910cb324498e6451981f2bc9b1891a091a2a1ff9");
    expect(combined).toContain("local gates passed");
    expect(combined).toContain("P0I is complete");
    expect(combined).toMatch(
      /Do\s+not\s+keep\s+adding\s+preview\s+panels\s+in\s+P0I/
    );
    expect(combined).toContain("P0J Sandboxed Real Apply Path");
    expect(combined).toContain("Sandboxed Real Apply Strategy ADR");
    expect(combined).toContain("Disposable Workspace Snapshot Contract");
    expect(combined).toContain(
      "Real Patch Apply Prototype In Disposable Workspace"
    );
    expect(combined).toContain(
      "Real Rollback Prototype In Disposable Workspace"
    );
    expect(combined).toContain("Apply / Rollback Event Projection");
    expect(combined).toContain("Approval-Gated Apply Path");
    expect(combined).toContain("Sandbox Apply RC Polish");
    expect(combined).toContain("design only");
    expect(combined).toContain("disposable workspace");
    expect(combined).toMatch(/no\s+direct\s+user\s+workspace\s+mutation/);
    expect(combined).toMatch(
      /Real\s+apply\s+remains\s+disabled\s+by\s+default/
    );
    expect(combined).toContain("No patch apply implementation");
    expect(combined).toContain("No user workspace mutation");
    expect(combined).toContain("Real DeepSeek chat");
    expect(combined).toContain("No real ControlPlaneRun execution");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No capability invocation");
    expect(combined).toContain("No PermissionLease issuing");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("git status --short");
    expect(combined).toContain("git status -sb");
    expect(combined).toContain("git log --oneline origin/main..HEAD");
    expect(combined).toContain("Do not push.");
    expect(combined).toContain("Do not tag.");
    expect(combined).toContain(
      "v0.5-validation-approval-virtual-apply-postrelease-review.md"
    );
    expect(combined).toContain("p0j-sandboxed-real-apply-roadmap.md");
    expect(combined).toContain("p0j-001-sandbox-apply-strategy-adr-plan.md");
  });

  it("documents the P0J sandboxed real apply ADR and gates without implementation", async () => {
    const adr = await readFile(
      path.join(
        repoRoot,
        "docs",
        "adr",
        "0005-sandboxed-real-apply-strategy.md"
      ),
      "utf8"
    );
    const threatModel = await readFile(
      path.join(repoRoot, "docs", "sandboxed-real-apply-threat-model-v0.5.md"),
      "utf8"
    );
    const implementationGate = await readFile(
      path.join(
        repoRoot,
        "docs",
        "sandboxed-real-apply-implementation-gate-v0.5.md"
      ),
      "utf8"
    );
    const p0j002Plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0j-002-disposable-workspace-snapshot-contract-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${adr}\n${threatModel}\n${implementationGate}\n${p0j002Plan}\n${docsIndex}\n${rootReadme}`;

    expect(adr).toContain("ADR 0005: Sandboxed Real Apply Strategy");
    expect(adr).toContain("Proposed / Accepted for P0J design gate");
    expect(combined).toContain("P0I completed the validation");
    expect(combined).toContain("sandboxed real apply strategy");
    expect(combined).toContain("disposable workspace");
    expect(combined).toContain("no user workspace apply");
    expect(combined).toMatch(/no\s+direct\s+user\s+workspace\s+mutation/);
    expect(combined).toMatch(
      /Direct\s+mutation\s+of\s+the\s+user's\s+source\s+workspace\s+is\s+not\s+allowed/
    );
    expect(combined).toContain(
      "Do not implement until all P0J-001/P0J-002 gates are satisfied"
    );
    expect(combined).toContain("path guard");
    expect(combined).toContain("symlink, junction, and reparse point policy");
    expect(combined).toContain("secret scan");
    expect(combined).toContain("generated artifact exclusion");
    expect(combined).toContain("patch proposal validation");
    expect(combined).toContain("diff audit preview");
    expect(combined).toContain("approval draft");
    expect(combined).toContain("virtual apply preview");
    expect(combined).toContain("rollback checkpoint preview");
    expect(combined).toContain("replay projection");
    expect(combined).toContain("explicit user confirmation");
    expect(combined).toContain("summary-only event");
    expect(combined).toContain(
      "Replay must reconstruct apply and rollback state"
    );
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("metadata-only");
    expect(combined).toContain("No real patch apply");
    expect(combined).toContain("No filesystem read or write implementation");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("git log --oneline origin/main..HEAD");
    expect(combined).toContain("Do not push.");
    expect(combined).toContain("Do not tag.");
    expect(combined).toContain("0005-sandboxed-real-apply-strategy.md");
    expect(combined).toContain("sandboxed-real-apply-threat-model-v0.5.md");
    expect(combined).toContain(
      "sandboxed-real-apply-implementation-gate-v0.5.md"
    );
    expect(combined).toContain(
      "p0j-002-disposable-workspace-snapshot-contract-plan.md"
    );
  });

  it("documents the disposable workspace snapshot contract as metadata-only and no-apply", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-disposable-workspace-snapshot-contract-v0.5.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-disposable-workspace-snapshot-contract-v0.5.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("metadata-only");
    expect(combined).toContain("Disposable Workspace Snapshot Contract");
    expect(combined).toContain("opaque display reference");
    expect(combined).toMatch(/not\s+a\s+real\s+filesystem\s+path/);
    expect(combined).toContain("No disposable workspace creation");
    expect(combined).toContain("No filesystem read or write");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No rollback");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("P0J-003 sandbox apply prototype");
    expect(docsIndex).toContain(
      "runtime-disposable-workspace-snapshot-contract-v0.5.md"
    );
    expect(docsIndex).toContain(
      "app-shell-disposable-workspace-snapshot-contract-v0.5.md"
    );
  });

  it("documents the disposable patch apply prototype as disabled by default", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-disposable-patch-apply-prototype-v0.5.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-disposable-patch-apply-prototype-v0.5.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("disabled by default");
    expect(combined).toContain("disposable workspace");
    expect(combined).toContain("no user workspace");
    expect(combined).toContain("no Git");
    expect(combined).toContain("no shell");
    expect(combined).toContain("raw content");
    expect(combined).toContain("raw source");
    expect(combined).toContain("eventPreview");
    expect(combined).toContain("notWritten: true");
    expect(combined).toContain("P0J-004");
    expect(docsIndex).toContain(
      "runtime-disposable-patch-apply-prototype-v0.5.md"
    );
    expect(docsIndex).toContain(
      "app-shell-disposable-patch-apply-prototype-v0.5.md"
    );
  });

  it("documents the disposable patch rollback prototype as disabled by default", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-disposable-patch-rollback-prototype-v0.5.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-disposable-patch-rollback-prototype-v0.5.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("disabled by default");
    expect(combined).toContain("disposable workspace");
    expect(combined).toContain("no user workspace rollback");
    expect(combined).toContain("checkpoint preimage");
    expect(combined).toContain("no raw output");
    expect(combined).toContain("eventPreview");
    expect(combined).toContain("notWritten: true");
    expect(combined).toContain("no Git");
    expect(combined).toContain("no shell");
    expect(combined).toContain("no native bridge");
    expect(combined).toContain("no desktop action");
    expect(combined).toContain("P0J-005");
    expect(docsIndex).toContain(
      "runtime-disposable-patch-rollback-prototype-v0.5.md"
    );
    expect(docsIndex).toContain(
      "app-shell-disposable-patch-rollback-prototype-v0.5.md"
    );
  });

  it("documents the v0.2 App Shell RC post-release review and locks P0F", async () => {
    const review = await readFile(
      path.join(repoRoot, "docs", "v0.2-app-shell-rc-postrelease-review.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(review).toContain("v0.2.0-app-shell-rc.1");
    expect(review).toContain("Control plane foundation");
    expect(review).toContain("release tag checks passed");
    expect(review).toContain("Tag: TODO");
    expect(review).toContain("Commit: TODO");
    expect(review).toContain("P0F is complete");
    expect(review).toContain("web_table_to_csv");
    expect(review).toContain("Event Log / Replay");
    expect(review).toContain("Control Plane Projection");
    expect(review).toContain("Chat / Run Canvas");
    expect(review).toContain("Approval / Diff / Audit");
    expect(review).toContain("Memory Inspector");
    expect(review).toContain("Bridge Proposal Preview");
    expect(review).toContain("Real chat / LLM execution");
    expect(review).toContain("Real run creation");
    expect(review).toContain("Patch apply");
    expect(review).toContain("Git execution");
    expect(review).toContain("Shell execution");
    expect(review).toContain("MCP, plugin, or skills runtime");
    expect(review).toContain("Native bridge");
    expect(review).toContain("Memory persistence UI");
    expect(review).toContain("pnpm verify:ci");
    expect(review).toContain("pnpm release:smoke");
    expect(review).toContain("pnpm app:qa:check");
    expect(review).toContain("manual GUI QA");
    expect(review).toContain("GitHub Actions Node runtime warning");
    expect(review).toContain("Tauri bundle identifier warning");
    expect(review).toContain("No raw payload uploads");
    expect(review).toContain("No raw CSV uploads");
    expect(review).toContain("No API key uploads");
    expect(review).toContain("No ignored `conformance/results/`");
    expect(docsIndex).toContain("v0.2-app-shell-rc-postrelease-review.md");
  });

  it("documents the P0G Coding Workflow roadmap without enabling execution", async () => {
    const roadmap = await readFile(
      path.join(repoRoot, "docs", "p0g-coding-workflow-roadmap.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${roadmap}\n${rootReadme}\n${docsIndex}`;

    expect(combined).toContain("P0G Coding Workflow Roadmap");
    expect(combined).toContain("coding workflow MVP");
    expect(combined).toContain("read-only workspace intelligence");
    expect(combined).toContain("patch proposal UI");
    expect(combined).toContain("P0G-001 Workspace Read / Index Skeleton");
    expect(combined).toContain("P0G-002 Patch Proposal UI Bridge");
    expect(combined).toContain("P0G-003 Control Plane Run Draft");
    expect(combined).toContain("P0G-004 Context Cart / Rules Ledger");
    expect(combined).toContain("P0G-005 Agent Route Preview");
    expect(combined).toContain("P0G-006 Capability Plan Preview");
    expect(combined).toContain("P0G-007 Memory Recall Preview");
    expect(combined).toContain("P0G-008 App Shell RC Polish");
    expect(combined).toContain("Patch apply");
    expect(combined).toContain("Real Git execution");
    expect(combined).toContain("Real shell execution");
    expect(combined).toContain("Real DeepSeek chat");
    expect(combined).toContain("MCP, plugin, or skills runtime");
    expect(combined).toContain("Native bridge");
    expect(combined).toContain("Desktop action");
    expect(combined).toContain("p0g-coding-workflow-roadmap.md");
    expect(combined).toContain("P0F is complete");
  });

  it("documents the v0.3 post-release review and P0H roadmap lock", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.3-coding-workflow-preview-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0h-coding-workflow-controlled-creation-roadmap.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain("v0.3.0-coding-workflow-preview-rc.1");
    expect(combined).toContain(
      "Coding workflow preview surfaces, no execution"
    );
    expect(combined).toContain("Tag: `v0.3.0-coding-workflow-preview-rc.1`");
    expect(combined).toContain("Commit: `cbb89b9`");
    expect(combined).toContain("published pre-release");
    expect(combined).toContain("P0G is complete");
    expect(combined).toContain("P0H Coding");
    expect(combined).toContain("Workflow Controlled Creation MVP");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("Local Run Draft Preview");
    expect(combined).toContain("Context Cart / Rules Ledger visualization");
    expect(combined).toContain("Agent Route Preview");
    expect(combined).toContain("Capability Plan Preview");
    expect(combined).toContain("Patch Proposal UI Bridge");
    expect(combined).toContain("Memory Recall Preview");
    expect(combined).toContain("Bridge Proposal Preview");
    expect(combined).toContain("Real DeepSeek chat");
    expect(combined).toContain("Real ControlPlaneRun creation");
    expect(combined).toContain("Patch apply");
    expect(combined).toContain("Git execution");
    expect(combined).toContain("Shell execution");
    expect(combined).toContain("Capability invocation");
    expect(combined).toContain("PermissionLease issuing");
    expect(combined).toContain("Memory commit, revoke, or expire UI");
    expect(combined).toContain("MCP, plugin, or skills runtime");
    expect(combined).toContain("Native bridge");
    expect(combined).toContain("Desktop action");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("manual GUI QA");
    expect(combined).toContain("GitHub Actions warning");
    expect(combined).toContain("Tauri bundle identifier warning");
    expect(combined).toContain("No raw payload uploads");
    expect(combined).toContain("No raw CSV uploads");
    expect(combined).toContain("No raw source uploads");
    expect(combined).toContain("No raw prompt uploads");
    expect(combined).toContain("No API key uploads");
    expect(combined).toContain("No ignored `conformance/results/`");
    expect(combined).toContain("P0H-001 Workspace Index To App Bridge");
    expect(combined).toContain(
      "P0H-002 Run Draft To Control Plane Draft Event"
    );
    expect(combined).toContain("P0H-003 Context Cart From Run Draft");
    expect(combined).toContain("P0H-004 Static Agent Route Preview");
    expect(combined).toContain("P0H-005 Capability Plan Preview");
    expect(combined).toContain("P0H-006 Patch Proposal Creation Preview");
    expect(combined).toContain("P0H-007 Memory Recall Preview");
    expect(combined).toContain(
      "P0H-008 Coding Workflow Controlled Creation RC"
    );
    expect(combined).toContain("controlled creation MVP");
    expect(combined).toContain("still does not allow arbitrary execution");
    expect(combined).toContain("Do not crawl the real filesystem by default");
    expect(combined).toContain(
      "v0.3-coding-workflow-preview-postrelease-review.md"
    );
    expect(combined).toContain(
      "p0h-coding-workflow-controlled-creation-roadmap.md"
    );
  });

  it("documents the v0.4 post-release review and P0I roadmap lock", async () => {
    const review = await readFile(
      path.join(
        repoRoot,
        "docs",
        "v0.4-controlled-creation-preview-postrelease-review.md"
      ),
      "utf8"
    );
    const roadmap = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0i-validation-approval-virtual-apply-roadmap.md"
      ),
      "utf8"
    );
    const plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0i-001-patch-proposal-validation-preview-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const combined = `${review}\n${roadmap}\n${plan}\n${docsIndex}\n${rootReadme}`;

    expect(combined).toContain("v0.4.0-controlled-creation-preview-rc.1");
    expect(combined).toContain(
      "Controlled creation preview, summary-only side effects"
    );
    expect(combined).toContain(
      "Tag: `v0.4.0-controlled-creation-preview-rc.1`"
    );
    expect(combined).toContain("Commit: `7a1ac07`");
    expect(combined).toContain("release tag CI succeeded");
    expect(combined).toContain("P0H is complete");
    expect(combined).toContain("P0I Validation / Approval / Virtual Apply");
    expect(combined).toContain("web_table_to_csv");
    expect(combined).toContain("Event Log / Replay");
    expect(combined).toContain("Workspace Index summary bridge");
    expect(combined).toContain("Record Draft Event");
    expect(combined).toContain("Context Assembly Preview");
    expect(combined).toContain("Runtime Agent Route Preview helper");
    expect(combined).toContain("Runtime Capability Plan Preview helper");
    expect(combined).toContain("Patch Proposal Creation Preview");
    expect(combined).toContain("Patch Proposal / Diff UI Bridge");
    expect(combined).toContain("Approval / Diff / Audit Surfaces");
    expect(combined).toContain("Runtime Memory Recall Preview helper");
    expect(combined).toContain("Bridge Proposal Preview");
    expect(combined).toContain("Real DeepSeek chat");
    expect(combined).toContain("Real run execution");
    expect(combined).toContain("Patch apply");
    expect(combined).toContain("Git execution");
    expect(combined).toContain("Shell execution");
    expect(combined).toContain("Capability invocation");
    expect(combined).toContain("PermissionLease issuing");
    expect(combined).toContain("Memory commit, revoke, or expire UI");
    expect(combined).toContain("MCP, plugin, or skills runtime");
    expect(combined).toContain("Native bridge");
    expect(combined).toContain("Desktop action");
    expect(combined).toContain("pnpm verify:ci");
    expect(combined).toContain("pnpm release:smoke");
    expect(combined).toContain("pnpm app:qa:check");
    expect(combined).toContain("manual GUI QA");
    expect(combined).toContain("GitHub Actions Node warning");
    expect(combined).toContain("Tauri bundle identifier warning");
    expect(combined).toContain("No raw payload uploads");
    expect(combined).toContain("No raw CSV uploads");
    expect(combined).toContain("No raw source uploads");
    expect(combined).toContain("No raw prompt uploads");
    expect(combined).toContain("No API key uploads");
    expect(combined).toContain("No ignored `conformance/results/`");
    expect(combined).toContain("P0I-001 Patch Proposal Validation Preview");
    expect(combined).toContain("P0I-002 Patch Diff Audit Preview");
    expect(combined).toContain("P0I-003 Approval Gate Draft");
    expect(combined).toContain("P0I-004 Virtual Apply Preview");
    expect(combined).toContain("P0I-005 Rollback Checkpoint Preview");
    expect(combined).toContain("P0I-006 Replay Projection");
    expect(combined).toContain(
      "P0I-007 App Shell Validation / Approval / Virtual Apply RC Polish"
    );
    expect(combined).toContain("P0I-008 Post-Release Review");
    expect(combined).toContain("Do not implement this plan in P0H-009");
    expect(combined).toContain("Input Model");
    expect(combined).toContain("Validation Rules");
    expect(combined).toContain("Risk Output");
    expect(combined).toContain("App UI Summary Mapping");
    expect(combined).toContain(
      "v0.4-controlled-creation-preview-postrelease-review.md"
    );
    expect(combined).toContain(
      "p0i-validation-approval-virtual-apply-roadmap.md"
    );
    expect(combined).toContain(
      "p0i-001-patch-proposal-validation-preview-plan.md"
    );
  });

  it("documents P0H-001 as a read-only Workspace Index to App bridge plan", async () => {
    const plan = await readFile(
      path.join(
        repoRoot,
        "docs",
        "p0h-001-workspace-index-to-app-bridge-plan.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(plan).toContain("Do not implement this plan in P0G-009");
    expect(plan).toContain("Scope");
    expect(plan).toContain("Non-Goals");
    expect(plan).toContain("Data Model");
    expect(plan).toContain("Source Of Workspace Index Summaries");
    expect(plan).toContain("Path And Secret Safety");
    expect(plan).toContain("Summary-Only UI Mapping");
    expect(plan).toContain("Tests");
    expect(plan).toContain("Commands To Run");
    expect(plan).toContain("Completion Report Format");
    expect(plan).toContain("AppWorkspaceIndexBridgeView");
    expect(plan).toContain("synthetic fixture summaries");
    expect(plan).toContain("explicit app-local safe summary input");
    expect(plan).toContain("No raw file content display");
    expect(plan).toContain("No filesystem crawling by default");
    expect(plan).toContain("No `.env`");
    expect(plan).toContain("No patch apply");
    expect(plan).toContain("No Git execution");
    expect(plan).toContain("No shell execution");
    expect(plan).toContain("No DeepSeek call");
    expect(plan).toContain("No real ControlPlaneRun creation");
    expect(plan).toContain("No capability invocation");
    expect(plan).toContain("No PermissionLease issuing");
    expect(plan).toContain("no EventStore write");
    expect(plan).toContain("no Tauri invoke added");
    expect(plan).toContain("DW-P0H-001");
    expect(plan).toContain("DW-P0H-002 Run Draft -> Control Plane Draft Event");
    expect(docsIndex).toContain(
      "p0h-001-workspace-index-to-app-bridge-plan.md"
    );
  });

  it("documents the App Shell Workspace Index bridge without enabling scanning", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "app-shell-workspace-index-bridge-v0.3.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${doc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("Workspace Index Bridge v0.3");
    expect(combined).toContain("read-only App Shell surface");
    expect(combined).toContain("summary-only `WorkspaceIndex` JSON");
    expect(combined).toContain("not a workspace scanner");
    expect(combined).toContain("No real workspace scanner");
    expect(combined).toContain("No filesystem crawling");
    expect(combined).toContain("No `.env`");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No Git execution");
    expect(combined).toContain("No shell execution");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No native bridge");
    expect(combined).toContain("No desktop action");
    expect(docsIndex).toContain("app-shell-workspace-index-bridge-v0.3.md");
    expect(appReadme).toContain("Workspace Index summary bridge");
    expect(appReadme).toContain("summary-only JSON previews");
  });

  it("documents the App Shell Run Draft Event bridge as local-only opt-in", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "app-shell-run-draft-event-v0.3.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${doc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("Run Draft Event v0.3");
    expect(combined).toContain("local, summary-only");
    expect(combined).toContain("Record Draft Event (local)");
    expect(combined).toContain("control.run.draft_recorded");
    expect(combined).toContain(".deepseek-workbench/events.jsonl");
    expect(combined).toContain("not run creation");
    expect(combined).toContain("No real ControlPlaneRun creation");
    expect(combined).toContain("No execution");
    expect(combined).toContain("No PermissionLease issuing");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No Git or shell execution");
    expect(combined).toContain("No native bridge");
    expect(docsIndex).toContain("app-shell-run-draft-event-v0.3.md");
    expect(appReadme).toContain("summary-only Run Draft Event");
  });

  it("documents the App Shell Context Assembly Preview as local-only and prompt-free", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "app-shell-context-assembly-preview-v0.3.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const appReadme = await readFile(path.join(appRoot, "README.md"), "utf8");
    const combined = `${doc}\n${docsIndex}\n${appReadme}`;

    expect(combined).toContain("Context Assembly Preview v0.3");
    expect(combined).toContain("local App Shell view model");
    expect(combined).toContain("does not assemble a real prompt");
    expect(combined).toContain("call DeepSeek");
    expect(combined).toContain("write events");
    expect(combined).toContain("frozen prefix");
    expect(combined).toContain("volatile_tail");
    expect(combined).toContain("no_compress_zone");
    expect(combined).toContain("Workspace Index refs");
    expect(combined).toContain("Memory Recall refs");
    expect(combined).toContain("Patch proposal summaries");
    expect(combined).toContain("No actual prompt generation");
    expect(combined).toContain("No DeepSeek request");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No raw content display");
    expect(docsIndex).toContain("app-shell-context-assembly-preview-v0.3.md");
    expect(appReadme).toContain("Context Assembly Preview");
    expect(appReadme).toContain("no App Shell prompt assembly");
  });

  it("documents P0G-001 as a read-only workspace index plan", async () => {
    const plan = await readFile(
      path.join(repoRoot, "docs", "p0g-001-workspace-read-index-plan.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );

    expect(plan).toContain("Do not implement this plan in P0F-015");
    expect(plan).toContain("Scope");
    expect(plan).toContain("Non-Goals");
    expect(plan).toContain("Suggested Data Model");
    expect(plan).toContain("Path Guard Rules");
    expect(plan).toContain("Read-Only File Summary Model");
    expect(plan).toContain("Virtual / In-Memory Fixtures");
    expect(plan).toContain("Event Summary Policy");
    expect(plan).toContain("Tests");
    expect(plan).toContain("Commands To Run");
    expect(plan).toContain("Completion Report Format");
    expect(plan).toContain("WorkspaceIndex");
    expect(plan).toContain("WorkspacePathGuardResult");
    expect(plan).toContain("absolute paths");
    expect(plan).toContain("Windows drive-letter paths");
    expect(plan).toContain("parent traversal");
    expect(plan).toContain("node_modules");
    expect(plan).toContain("No Git execution");
    expect(plan).toContain("No shell execution");
    expect(plan).toContain("No DeepSeek call");
    expect(plan).toContain("pnpm test -- workspace-index");
    expect(plan).toContain("DW-P0G-001");
    expect(plan).toContain("DW-P0G-002 Patch Proposal UI bridge");
    expect(docsIndex).toContain("p0g-001-workspace-read-index-plan.md");
  });

  it("documents the P0G-002 patch proposal UI bridge without enabling apply", async () => {
    const doc = await readFile(
      path.join(repoRoot, "docs", "patch-proposal-ui-bridge-v0.2.md"),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${doc}\n${docsIndex}`;

    expect(combined).toContain("Patch Proposal UI Bridge v0.2");
    expect(combined).toContain("summary-only preview path");
    expect(combined).toContain("does not apply patches");
    expect(combined).toContain("No patch apply");
    expect(combined).toContain("No filesystem write");
    expect(combined).toContain("No real Git execution");
    expect(combined).toContain("No real shell execution");
    expect(combined).toContain("No DeepSeek call");
    expect(combined).toContain("no raw source code");
    expect(combined).toContain("Patch and Diff Audit");
    expect(combined).toContain("Control Plane");
    expect(combined).toContain("Approval Surface");
    expect(combined).toContain("Agent Dossier");
    expect(docsIndex).toContain("patch-proposal-ui-bridge-v0.2.md");
  });

  it("configures the offline desktop QA check without GUI or DeepSeek calls", async () => {
    const rootPackage = JSON.parse(
      await readFile(rootPackagePath, "utf8")
    ) as PackageJson;
    const appPackage = JSON.parse(
      await readFile(appPackagePath, "utf8")
    ) as PackageJson;
    const script = await readFile(appQaScriptPath, "utf8");

    expect(rootPackage.scripts["app:qa:check"]).toContain("qa:check");
    expect(appPackage.scripts["qa:check"]).toBe("node scripts/qa-check.mjs");
    expect(script).toContain("Desktop QA check");
    expect(script).toContain("app:preflight");
    expect(script).toContain("app:smoke");
    expect(script).toContain("events.jsonl");
    expect(script).toContain("scanEventLogForLeaks");
    expect(script).not.toContain("app:dev");
    expect(script).not.toContain("DEEPSEEK_API_KEY");
    expect(script).not.toContain("OPENAI_API_KEY");
  });

  it("documents sandbox apply rollback event projection as not-written projection only", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-sandbox-apply-rollback-event-projection-v0.5.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-sandbox-apply-rollback-event-projection-v0.5.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain("projection-only");
    expect(combined).toContain("notWritten: true");
    expect(combined).toContain("no EventStore write");
    expect(combined).toContain("no apply execution");
    expect(combined).toContain("no rollback execution");
    expect(combined).toContain("no user workspace");
    expect(combined).toContain("summary-only event");
    expect(combined).toContain("P0J-003");
    expect(combined).toContain("P0J-004");
    expect(combined).toContain("P0J-006");
    expect(combined).toContain("no Git");
    expect(combined).toContain("no shell");
    expect(combined).toContain("no native bridge");
    expect(combined).toContain("no desktop action");
    expect(docsIndex).toContain(
      "runtime-sandbox-apply-rollback-event-projection-v0.5.md"
    );
    expect(docsIndex).toContain(
      "app-shell-sandbox-apply-rollback-event-projection-v0.5.md"
    );
  });

  it("documents approval-gated disposable apply as disabled in App", async () => {
    const runtimeDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "runtime-approval-gated-disposable-apply-v0.5.md"
      ),
      "utf8"
    );
    const appDoc = await readFile(
      path.join(
        repoRoot,
        "docs",
        "app-shell-approval-gated-disposable-apply-v0.5.md"
      ),
      "utf8"
    );
    const docsIndex = await readFile(
      path.join(repoRoot, "docs", "README.md"),
      "utf8"
    );
    const combined = `${runtimeDoc}\n${appDoc}\n${docsIndex}`;

    expect(combined).toContain("disabled by default");
    expect(combined).toContain("Runtime tests only");
    expect(combined).toContain("explicit disposable workspace");
    expect(combined).toContain("not a production PermissionLease");
    expect(combined).toContain("No user workspace apply");
    expect(combined).toContain("No EventStore write");
    expect(combined).toContain("No Git");
    expect(combined).toContain("No shell");
    expect(combined).toContain("No Tauri command");
    expect(combined).toContain("P0J-003");
    expect(combined).toContain("P0J-004");
    expect(combined).toContain("P0J-005");
    expect(docsIndex).toContain(
      "runtime-approval-gated-disposable-apply-v0.5.md"
    );
    expect(docsIndex).toContain(
      "app-shell-approval-gated-disposable-apply-v0.5.md"
    );
  });
});

describe("desktop dev scripts", () => {
  it("keeps frontend dev separate from Tauri dev", async () => {
    const appPackage = JSON.parse(
      await readFile(appPackagePath, "utf8")
    ) as PackageJson;
    const rootPackage = JSON.parse(
      await readFile(rootPackagePath, "utf8")
    ) as PackageJson;

    expect(appPackage.scripts.dev).toContain("vite");
    expect(appPackage.scripts.dev).toContain("--port 5179");
    expect(appPackage.scripts.dev).toContain("--strictPort");
    expect(appPackage.scripts.dev).not.toContain("tauri dev");
    expect(appPackage.scripts["tauri:dev"]).toBe("tauri dev");
    expect(rootPackage.scripts["app:dev"]).toContain("tauri:dev");
    expect(rootPackage.scripts["app:dev"]).not.toMatch(/\bapp dev\b/);
  });

  it("keeps Tauri before commands pointed at frontend scripts", async () => {
    const tauriConfig = JSON.parse(
      await readFile(tauriConfigPath, "utf8")
    ) as TauriConfig;

    expect(tauriConfig.build.devUrl).toBe("http://localhost:5179");
    expect(tauriConfig.build.beforeDevCommand).toBe("pnpm dev");
    expect(tauriConfig.build.beforeBuildCommand).toBe("pnpm build");
    expect(tauriConfig.build.beforeDevCommand).not.toContain("tauri");
    expect(tauriConfig.build.beforeBuildCommand).not.toContain("tauri");
  });

  it("uses the same strict local port in Vite and Tauri config", async () => {
    const viteConfig = await readFile(viteConfigPath, "utf8");

    expect(viteConfig).toContain('host: "127.0.0.1"');
    expect(viteConfig).toContain("port: 5179");
    expect(viteConfig).toContain("strictPort: true");
  });
});

type PackageJson = {
  scripts: Record<string, string>;
};

type TauriConfig = {
  build: {
    beforeDevCommand: string;
    beforeBuildCommand: string;
    devUrl: string;
  };
};
