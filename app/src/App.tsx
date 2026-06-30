import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type JSX,
  type ReactNode
} from "react";

import {
  applyApprovedUserWorkspacePatch,
  checkDesktopRunnerPreflight,
  generateLiveDeepSeekPatchProposal,
  getDesktopAppVersion,
  loadWorkspaceEventSummary,
  liveProposalAllowedKeySourceRef,
  recordApprovedUserWorkspaceExecutionEvent,
  recordControlRunDraftEvent,
  recordLiveProposalSummaryEvent,
  recordVerificationLaneEvent,
  rollbackApprovedUserWorkspacePatch,
  runDesktopWebTableToCsvFlow,
  runGitReadLane,
  runShellVerificationLane,
  type ApprovedUserWorkspaceApplyResult,
  type ApprovedUserWorkspaceRollbackResult,
  type ApprovedUserWorkspaceExecutionEventRecordResult,
  type GitReadLane,
  type GitReadLaneResult,
  type LiveDeepSeekPatchProposalCommandRequest,
  type LiveDeepSeekPatchProposalCommandResult,
  type LiveProposalSummaryEventPreview,
  type LiveProposalSummaryEventRecordResult,
  type VerificationLaneEventRecordResult,
  type ShellVerificationLaneResult,
  type ShellVerificationTemplateId
} from "./desktop-flow.js";
import {
  buildControlPlaneProjectionView,
  type AppControlPlaneProjectionView
} from "./control-plane-view.js";
import {
  buildWorkbenchSurfacesView,
  type AppWorkbenchSurfaceView
} from "./workbench-surfaces.js";
import {
  buildMemoryInspectorView,
  type AppMemoryInspectorView
} from "./memory-inspector-view.js";
import {
  buildMemoryRecallPreviewView,
  type AppMemoryRecallPreviewView
} from "./memory-recall-preview-view.js";
import {
  buildWorkspaceIndexBridgeView,
  parseWorkspaceIndexSummaryJson,
  type AppWorkspaceIndexBridgeView,
  type AppWorkspaceIndexSource
} from "./workspace-index-bridge-view.js";
import {
  buildChatRunCanvasView,
  type AppChatRunCanvasView,
  type AppRunCanvasIntent
} from "./chat-run-canvas-view.js";
import { buildRunDraftView, type AppRunDraftView } from "./run-draft-view.js";
import {
  buildRunDraftEventPayload,
  summarizeRunDraftEventResult,
  type AppRunDraftEventPreview,
  type AppRunDraftEventRecordResult
} from "./run-draft-event-view.js";
import {
  buildContextCartView,
  type AppContextCartView
} from "./context-cart-view.js";
import {
  buildContextAssemblyPreviewView,
  summarizeContextAssemblyPreview,
  type AppContextAssemblyPreviewView
} from "./context-assembly-preview-view.js";
import {
  buildAgentRoutePreviewView,
  type AppAgentRoutePreviewView
} from "./agent-route-preview-view.js";
import {
  buildCapabilityPlanPreviewView,
  capabilityPlanApprovalRefs,
  type AppCapabilityPlanPreviewView
} from "./capability-plan-preview-view.js";
import {
  buildPatchProposalCreationPreviewView,
  type AppPatchProposalCreationPreviewView,
  patchProposalCreationApprovalRefs,
  patchProposalCreationSurfaceSummaries,
  type PatchProposalCreationChangeKind
} from "./patch-proposal-creation-preview-view.js";
import {
  buildModelPatchProposalImportView,
  buildPatchProposalCreationPreviewFromModelImport,
  summarizeModelPatchProposalImportView,
  type ModelPatchProposalImportView
} from "./model-patch-proposal-import-view.js";
import {
  buildModelProposalChainIntegrationView,
  modelProposalChainIntegrationApprovalRefs,
  modelProposalChainIntegrationSurfaceSummaries,
  modelProposalChainIntegrationWarningCodes,
  summarizeModelProposalChainIntegrationView,
  type ModelProposalChainIntegrationView
} from "./model-proposal-chain-integration-view.js";
import {
  buildLiveProposalOptInGateView,
  type LiveProposalOptInGateView
} from "./live-proposal-opt-in-gate-view.js";
import {
  buildAppLiveProposalSessionReceiptView,
  summarizeAppLiveProposalSessionReceiptView,
  type AppLiveProposalSessionReceiptView
} from "./app-live-proposal-session-receipt-view.js";
import {
  buildLiveProposalRequestBuilderView,
  type LiveProposalRequestBuilderView
} from "./live-proposal-request-builder-view.js";
import {
  buildLiveDeepSeekProposalGenerationView,
  type LiveDeepSeekProposalGenerationView
} from "./live-deepseek-proposal-generation-view.js";
import {
  buildLiveProposalValidationIntegrationView,
  type LiveProposalValidationIntegrationView
} from "./live-proposal-validation-integration-view.js";
import {
  buildLiveProposalPreviewGateView,
  summarizeLiveProposalPreviewGateView,
  type LiveProposalPreviewGateView
} from "./live-proposal-preview-gate-view.js";
import {
  buildLiveProposalTelemetryAuditView,
  summarizeLiveProposalTelemetryAuditView,
  type LiveProposalTelemetryAuditView
} from "./live-proposal-telemetry-audit-view.js";
import {
  buildLiveProposalEvaluationSummaryView,
  summarizeLiveProposalEvaluationSummaryView,
  type LiveProposalEvaluationSummaryView
} from "./live-proposal-evaluation-summary-view.js";
import {
  buildLiveProposalEvaluationTelemetryAuditView,
  summarizeLiveProposalEvaluationTelemetryAuditView,
  type LiveProposalEvaluationTelemetryAuditView
} from "./live-proposal-evaluation-telemetry-audit-view.js";
import {
  buildPatchProposalValidationPreviewView,
  patchProposalValidationApprovalRefs,
  patchProposalValidationAuditWarningCodes,
  patchProposalValidationSurfaceSummaries,
  type AppPatchProposalValidationPreviewView
} from "./patch-proposal-validation-preview-view.js";
import {
  buildPatchDiffAuditPreviewView,
  patchDiffAuditApprovalRefs,
  patchDiffAuditSurfaceSummaries,
  patchDiffAuditWarningCodes,
  type AppPatchDiffAuditPreviewView
} from "./patch-diff-audit-preview-view.js";
import {
  buildPatchApprovalDraftView,
  patchApprovalDraftApprovalRefs,
  patchApprovalDraftSurfaceSummaries,
  patchApprovalDraftWarningCodes,
  type AppPatchApprovalDraftView
} from "./patch-approval-draft-view.js";
import {
  buildPatchVirtualApplyPreviewView,
  patchVirtualApplyApprovalRefs,
  patchVirtualApplySurfaceSummaries,
  patchVirtualApplyWarningCodes,
  type AppPatchVirtualApplyPreviewView
} from "./patch-virtual-apply-preview-view.js";
import {
  buildPatchRollbackCheckpointPreviewView,
  patchRollbackCheckpointApprovalRefs,
  patchRollbackCheckpointSurfaceSummaries,
  patchRollbackCheckpointWarningCodes,
  type AppPatchRollbackCheckpointPreviewView
} from "./patch-rollback-checkpoint-preview-view.js";
import {
  buildControlledCreationReplayProjectionView,
  controlledCreationReplayApprovalRefs,
  controlledCreationReplayPatchSummaries,
  controlledCreationReplayWarningCodes,
  summarizeControlledCreationReplayProjectionView,
  type AppControlledCreationReplayProjectionView
} from "./controlled-creation-replay-projection-view.js";
import {
  buildVerificationLaneProjectionView,
  summarizeVerificationLaneProjectionView,
  verificationLaneProjectionWarningCodes,
  type AppVerificationLaneProjectionView
} from "./verification-lane-projection-view.js";
import {
  buildSandboxApplyRollbackEventProjectionView,
  sandboxApplyRollbackEventProjectionApprovalRefs,
  sandboxApplyRollbackEventProjectionSurfaceSummaries,
  sandboxApplyRollbackEventProjectionWarningCodes,
  summarizeSandboxApplyRollbackEventProjectionView,
  type AppSandboxApplyRollbackEventProjectionView
} from "./sandbox-apply-rollback-event-projection-view.js";
import {
  buildDisposableWorkspaceSnapshotView,
  disposableWorkspaceSnapshotWarningCodes,
  type AppDisposableWorkspaceSnapshotView
} from "./disposable-workspace-snapshot-view.js";
import {
  buildUserWorkspaceSnapshotBackupView,
  userWorkspaceSnapshotBackupWarningCodes,
  type AppUserWorkspaceSnapshotBackupView
} from "./user-workspace-snapshot-backup-view.js";
import {
  buildUserWorkspacePromotionReadinessView,
  summarizeUserWorkspacePromotionReadinessView,
  userWorkspacePromotionReadinessWarningCodes,
  type AppUserWorkspacePromotionReadinessView
} from "./user-workspace-promotion-readiness-view.js";
import {
  buildUserWorkspaceApplyPrototypeView,
  type AppUserWorkspaceApplyPrototypeView
} from "./user-workspace-apply-prototype-view.js";
import {
  buildUserWorkspaceRollbackPrototypeView,
  type AppUserWorkspaceRollbackPrototypeView
} from "./user-workspace-rollback-prototype-view.js";
import {
  buildUserWorkspaceEventWriterView,
  type AppUserWorkspaceEventWriterView
} from "./user-workspace-event-writer-view.js";
import {
  buildAppApprovalExecutionDesignView,
  summarizeAppApprovalExecutionDesignView,
  type AppApprovalExecutionDesignView
} from "./app-approval-execution-design-view.js";
import {
  buildAppApprovedExecutionReceiptView,
  summarizeAppApprovedExecutionReceiptView,
  type AppApprovedExecutionReceiptView
} from "./app-approved-execution-receipt-view.js";
import {
  buildAppApprovedExecutionFlowView,
  buildApprovedApplyRequestFromExecutionFlow,
  buildApprovedRollbackRequestFromExecutionFlow,
  summarizeAppApprovedExecutionFlowView,
  type AppApprovedExecutionFlowInput,
  type AppApprovedExecutionFlowView
} from "./app-approved-execution-flow-view.js";
import {
  buildDisposablePatchApplyView,
  type AppDisposablePatchApplyView
} from "./disposable-patch-apply-view.js";
import {
  buildApprovalGatedDisposableApplyView,
  type AppApprovalGatedDisposableApplyView
} from "./approval-gated-disposable-apply-view.js";
import {
  buildDisposablePatchRollbackView,
  type AppDisposablePatchRollbackView
} from "./disposable-patch-rollback-view.js";
import {
  buildEventLogPanelModel,
  buildBridgeProposalPreviewModel,
  buildResultPanelModel,
  buildUiErrorFallbackMessage,
  runnerPreflightMessage,
  defaultDraftFilename,
  importBridgeProposalToPayloadEditor,
  rejectBridgeProposal,
  validatePayloadTextSize,
  safeErrorMessage,
  type BridgeProposalPreviewModel,
  type BridgeProposalPreviewState,
  type DesktopFlowResult,
  type EventLogPanelModel,
  type ResultPanelModel,
  type RunnerPreflightSummary,
  type WorkspaceEventSummary
} from "./safety.js";

type RunStatus = "idle" | "running" | "done" | "error";
type EventStatus = "idle" | "loading" | "loaded" | "error";
type DraftEventStatus = "idle" | "recording" | "recorded" | "error";
type GitReadLaneStatus = "idle" | "running" | "done" | "error";
type ShellVerificationLaneStatus = "idle" | "running" | "done" | "error";

type ErrorBoundaryState = {
  error?: unknown;
};

export class DesktopErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(): void {
    // Render a safe fallback only; do not expose stack traces or user payloads.
  }

  render(): ReactNode {
    if (this.state.error !== undefined) {
      return (
        <main className="shell">
          <section className="panel">
            <h1>Desktop shell recovered from a UI error.</h1>
            <p>{buildUiErrorFallbackMessage(this.state.error)}</p>
            <button
              type="button"
              className="secondary"
              onClick={() => this.setState({ error: undefined })}
            >
              Reset UI state
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export function App(): JSX.Element {
  return (
    <DesktopErrorBoundary>
      <DesktopShell />
    </DesktopErrorBoundary>
  );
}

export function parseGitReadLanePathspecs(text: string): string[] | undefined {
  const values = text
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return values.length === 0 ? undefined : values;
}

export function parseShellVerificationSafeArgs(
  templateId: ShellVerificationTemplateId,
  testFilePath: string
): { testFilePath?: string } | undefined {
  if (templateId !== "pnpm.test.scoped") {
    return undefined;
  }
  const trimmed = testFilePath.trim();
  return trimmed.length === 0 ? undefined : { testFilePath: trimmed };
}

export function parseLiveProposalGenerationAllowedPathRefs(
  text: string
): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((_, index) => index < 20);
}

function buildLiveProposalGenerationCommandRequest(input: {
  sessionReceiptView: AppLiveProposalSessionReceiptView;
  requestBuilderView: LiveProposalRequestBuilderView;
  keySourceRef: string;
  objectiveSummary: string;
  allowedPathRefsText: string;
}): LiveDeepSeekPatchProposalCommandRequest {
  if (input.requestBuilderView.requestEnvelope === undefined) {
    throw new Error("Live proposal request envelope is missing");
  }
  return {
    sessionReceipt: input.sessionReceiptView
      .receiptEnvelope as unknown as Record<string, unknown>,
    apiKeySourceRef: input.keySourceRef.trim(),
    providerId: "deepseek",
    modelProfileId: input.requestBuilderView.modelProfileId,
    requestEnvelope: input.requestBuilderView
      .requestEnvelope as unknown as Record<string, unknown>,
    objectiveSummary: input.objectiveSummary.trim(),
    allowedPathRefs: parseLiveProposalGenerationAllowedPathRefs(
      input.allowedPathRefsText
    ),
    contextRefs: [
      `app-live-proposal-session:${input.sessionReceiptView.receiptId}`,
      `app-live-proposal-request:${input.requestBuilderView.requestId}`
    ],
    maxResponseBytes: 50_000,
    timeoutMs: 60_000
  };
}

export function buildLiveProposalSummaryEventPreview(input: {
  generationView: LiveDeepSeekProposalGenerationView;
  commandResult: LiveDeepSeekPatchProposalCommandResult;
  importView: ModelPatchProposalImportView;
}): LiveProposalSummaryEventPreview {
  const proposalHash =
    input.importView.preview?.proposalHash ??
    input.commandResult.proposalCandidateHash;

  return {
    type: "model.patch_proposal.live_generated",
    generationId: input.generationView.flowId,
    requestId: input.generationView.requestId,
    proposalId: input.generationView.proposalId,
    modelProfileId: input.commandResult.modelProfileId,
    usageSummary: input.generationView.usageSummary,
    repairStatus: input.generationView.repairStatus,
    validationStatus: input.generationView.schemaValidationStatus,
    warningCount: input.generationView.warningCount,
    blockerCount: input.generationView.blockerCount,
    proposalHash,
    droppedReasoningContent: input.generationView.droppedReasoningContent,
    warningCodes: input.generationView.warningCodes,
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
  };
}

export function DesktopShell(): JSX.Element {
  const [workspaceRoot, setWorkspaceRoot] = useState("");
  const [payloadText, setPayloadText] = useState("");
  const [filename, setFilename] = useState(defaultDraftFilename());
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<DesktopFlowResult | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [version, setVersion] = useState<string>("0.1.0");
  const [preflight, setPreflight] = useState<
    RunnerPreflightSummary | undefined
  >();
  const [eventSummary, setEventSummary] = useState<
    WorkspaceEventSummary | undefined
  >();
  const [eventStatus, setEventStatus] = useState<EventStatus>("idle");
  const [eventError, setEventError] = useState<string | undefined>();
  const [docMessage, setDocMessage] = useState<string | undefined>();
  const [bridgePreview, setBridgePreview] = useState<
    BridgeProposalPreviewState | undefined
  >();
  const [bridgeMessage, setBridgeMessage] = useState<string | undefined>();
  const [selectedIntent, setSelectedIntent] =
    useState<AppRunCanvasIntent>("unknown");
  const [objectiveDraft, setObjectiveDraft] = useState("");
  const [acceptanceCriteriaDraft, setAcceptanceCriteriaDraft] = useState("");
  const [runDraftPreview, setRunDraftPreview] = useState<
    AppRunDraftView | undefined
  >();
  const [runDraftEventStatus, setRunDraftEventStatus] =
    useState<DraftEventStatus>("idle");
  const [runDraftEventResult, setRunDraftEventResult] = useState<
    AppRunDraftEventRecordResult | undefined
  >();
  const [runDraftEventError, setRunDraftEventError] = useState<
    string | undefined
  >();
  const [workspaceIndexJson, setWorkspaceIndexJson] = useState("");
  const [workspaceIndexFileLabel, setWorkspaceIndexFileLabel] = useState<
    string | undefined
  >();
  const [workspaceIndexBridge, setWorkspaceIndexBridge] =
    useState<AppWorkspaceIndexBridgeView>(() =>
      buildWorkspaceIndexBridgeView()
    );
  const [contextAssemblyPreview, setContextAssemblyPreview] = useState<
    AppContextAssemblyPreviewView | undefined
  >();
  const [patchProposalTitleDraft, setPatchProposalTitleDraft] = useState("");
  const [patchProposalDescriptionDraft, setPatchProposalDescriptionDraft] =
    useState("");
  const [patchProposalPathRefsDraft, setPatchProposalPathRefsDraft] =
    useState("");
  const [patchProposalChangeKind, setPatchProposalChangeKind] =
    useState<PatchProposalCreationChangeKind>("update");
  const [patchProposalLinesAdded, setPatchProposalLinesAdded] = useState("0");
  const [patchProposalLinesRemoved, setPatchProposalLinesRemoved] =
    useState("0");
  const [modelPatchProposalDraftText, setModelPatchProposalDraftText] =
    useState("");
  const [modelPatchProposalImportPreview, setModelPatchProposalImportPreview] =
    useState<ModelPatchProposalImportView | undefined>();
  const [
    modelProposalChainIntegrationPreview,
    setModelProposalChainIntegrationPreview
  ] = useState<ModelProposalChainIntegrationView | undefined>();
  const [liveProposalModelProfileId, setLiveProposalModelProfileId] =
    useState("deepseek-chat");
  const [liveProposalKeySourceRef, setLiveProposalKeySourceRef] = useState("");
  const [liveProposalOptInMode, setLiveProposalOptInMode] =
    useState<LiveProposalOptInGateView["optInMode"]>("disabled");
  const [liveProposalOptInGatePreview, setLiveProposalOptInGatePreview] =
    useState<LiveProposalOptInGateView | undefined>();
  const [
    appLiveProposalSessionTypedConfirmation,
    setAppLiveProposalSessionTypedConfirmation
  ] = useState("");
  const [
    appLiveProposalSessionReceiptPreview,
    setAppLiveProposalSessionReceiptPreview
  ] = useState<AppLiveProposalSessionReceiptView | undefined>();
  const [liveProposalRequestObjective, setLiveProposalRequestObjective] =
    useState("");
  const [liveProposalRequestIntent, setLiveProposalRequestIntent] = useState(
    "Generate a structured model_patch_proposal draft."
  );
  const [liveProposalRequestAllowedPaths, setLiveProposalRequestAllowedPaths] =
    useState("");
  const [
    liveProposalRequestBuilderPreview,
    setLiveProposalRequestBuilderPreview
  ] = useState<LiveProposalRequestBuilderView | undefined>();
  const [
    liveDeepSeekProposalCommandResult,
    setLiveDeepSeekProposalCommandResult
  ] = useState<LiveDeepSeekPatchProposalCommandResult | undefined>();
  const [
    liveDeepSeekProposalGenerationInFlight,
    setLiveDeepSeekProposalGenerationInFlight
  ] = useState(false);
  const [
    liveDeepSeekProposalGenerationError,
    setLiveDeepSeekProposalGenerationError
  ] = useState<string | undefined>();
  const [liveProposalSummaryEventStatus, setLiveProposalSummaryEventStatus] =
    useState<DraftEventStatus>("idle");
  const [liveProposalSummaryEventResult, setLiveProposalSummaryEventResult] =
    useState<LiveProposalSummaryEventRecordResult | undefined>();
  const [liveProposalSummaryEventError, setLiveProposalSummaryEventError] =
    useState<string | undefined>();
  const [liveProposalPreviewGatePreview, setLiveProposalPreviewGatePreview] =
    useState<LiveProposalPreviewGateView | undefined>();
  const [
    liveProposalTelemetryAuditPreview,
    setLiveProposalTelemetryAuditPreview
  ] = useState<LiveProposalTelemetryAuditView | undefined>();
  const [
    liveProposalEvaluationSummaryText,
    setLiveProposalEvaluationSummaryText
  ] = useState("");
  const [
    liveProposalEvaluationSummaryPreview,
    setLiveProposalEvaluationSummaryPreview
  ] = useState<LiveProposalEvaluationSummaryView | undefined>();
  const [
    liveProposalEvaluationTelemetryAuditText,
    setLiveProposalEvaluationTelemetryAuditText
  ] = useState("");
  const [
    liveProposalEvaluationTelemetryAuditPreview,
    setLiveProposalEvaluationTelemetryAuditPreview
  ] = useState<LiveProposalEvaluationTelemetryAuditView | undefined>();
  const [patchProposalCreationPreview, setPatchProposalCreationPreview] =
    useState<AppPatchProposalCreationPreviewView | undefined>();
  const [patchProposalValidationPreview, setPatchProposalValidationPreview] =
    useState<AppPatchProposalValidationPreviewView | undefined>();
  const [patchDiffAuditPreview, setPatchDiffAuditPreview] = useState<
    AppPatchDiffAuditPreviewView | undefined
  >();
  const [patchApprovalDraftPreview, setPatchApprovalDraftPreview] = useState<
    AppPatchApprovalDraftView | undefined
  >();
  const [patchVirtualApplyPreview, setPatchVirtualApplyPreview] = useState<
    AppPatchVirtualApplyPreviewView | undefined
  >();
  const [patchRollbackCheckpointPreview, setPatchRollbackCheckpointPreview] =
    useState<AppPatchRollbackCheckpointPreviewView | undefined>();
  const [
    controlledCreationReplayProjection,
    setControlledCreationReplayProjection
  ] = useState<AppControlledCreationReplayProjectionView | undefined>();
  const [
    sandboxApplyRollbackEventProjection,
    setSandboxApplyRollbackEventProjection
  ] = useState<AppSandboxApplyRollbackEventProjectionView | undefined>();
  const [snapshotDisposableRootRef, setSnapshotDisposableRootRef] =
    useState("");
  const [snapshotSourceFingerprint, setSnapshotSourceFingerprint] =
    useState("");
  const [snapshotFileSummaryJson, setSnapshotFileSummaryJson] = useState("");
  const [
    disposableWorkspaceSnapshotPreview,
    setDisposableWorkspaceSnapshotPreview
  ] = useState<AppDisposableWorkspaceSnapshotView | undefined>();
  const [userWorkspaceRootRef, setUserWorkspaceRootRef] = useState("");
  const [userWorkspaceSourceFingerprint, setUserWorkspaceSourceFingerprint] =
    useState("");
  const [userWorkspaceFileSummaryJson, setUserWorkspaceFileSummaryJson] =
    useState("");
  const [
    userWorkspaceSnapshotBackupPreview,
    setUserWorkspaceSnapshotBackupPreview
  ] = useState<AppUserWorkspaceSnapshotBackupView | undefined>();
  const [
    userWorkspacePromotionReadinessPreview,
    setUserWorkspacePromotionReadinessPreview
  ] = useState<AppUserWorkspacePromotionReadinessView | undefined>();
  const [appApprovedApplyConfirmation, setAppApprovedApplyConfirmation] =
    useState("");
  const [appApprovedRollbackConfirmation, setAppApprovedRollbackConfirmation] =
    useState("");
  const [appApprovedReceiptPathRefs, setAppApprovedReceiptPathRefs] =
    useState("");
  const [
    appApprovedExecutionReceiptPreview,
    setAppApprovedExecutionReceiptPreview
  ] = useState<AppApprovedExecutionReceiptView | undefined>();
  const [
    appApprovedExecutionContentDraft,
    setAppApprovedExecutionContentDraft
  ] = useState("");
  const [appApprovedApplyResult, setAppApprovedApplyResult] = useState<
    ApprovedUserWorkspaceApplyResult | undefined
  >();
  const [appApprovedRollbackResult, setAppApprovedRollbackResult] = useState<
    ApprovedUserWorkspaceRollbackResult | undefined
  >();
  const [appApprovedExecutionEventResult, setAppApprovedExecutionEventResult] =
    useState<ApprovedUserWorkspaceExecutionEventRecordResult | undefined>();
  const [appApprovedExecutionError, setAppApprovedExecutionError] = useState<
    string | undefined
  >();
  const [gitReadLane, setGitReadLane] = useState<GitReadLane>("status_summary");
  const [gitReadPathspecs, setGitReadPathspecs] = useState("");
  const [gitReadLaneStatus, setGitReadLaneStatus] =
    useState<GitReadLaneStatus>("idle");
  const [gitReadLaneResult, setGitReadLaneResult] = useState<
    GitReadLaneResult | undefined
  >();
  const [gitReadLaneError, setGitReadLaneError] = useState<
    string | undefined
  >();
  const [gitVerificationEventResult, setGitVerificationEventResult] = useState<
    VerificationLaneEventRecordResult | undefined
  >();
  const [shellVerificationTemplate, setShellVerificationTemplate] =
    useState<ShellVerificationTemplateId>("app.typecheck");
  const [shellVerificationTestFile, setShellVerificationTestFile] =
    useState("");
  const [shellVerificationStatus, setShellVerificationStatus] =
    useState<ShellVerificationLaneStatus>("idle");
  const [shellVerificationResult, setShellVerificationResult] = useState<
    ShellVerificationLaneResult | undefined
  >();
  const [shellVerificationError, setShellVerificationError] = useState<
    string | undefined
  >();
  const [shellVerificationEventResult, setShellVerificationEventResult] =
    useState<VerificationLaneEventRecordResult | undefined>();
  const loadedWorkspaceIndexRef =
    workspaceIndexBridge.status === "loaded" ||
    workspaceIndexBridge.status === "warning"
      ? workspaceIndexBridge
      : undefined;

  const panel = useMemo<ResultPanelModel | undefined>(
    () => (result === undefined ? undefined : buildResultPanelModel(result)),
    [result]
  );
  const eventPanel = useMemo<EventLogPanelModel | undefined>(
    () => buildEventLogPanelModel(eventSummary),
    [eventSummary]
  );
  const controlPlanePanel = useMemo<AppControlPlaneProjectionView>(
    () =>
      buildControlPlaneProjectionView(
        eventSummary,
        result,
        preflight,
        error === undefined ? undefined : { safeMessage: error }
      ),
    [error, eventSummary, preflight, result]
  );
  const verificationLaneProjection = useMemo<AppVerificationLaneProjectionView>(
    () => buildVerificationLaneProjectionView(eventSummary),
    [eventSummary]
  );
  const bridgePanel = useMemo<BridgeProposalPreviewModel>(
    () => buildBridgeProposalPreviewModel(bridgePreview),
    [bridgePreview]
  );
  const memoryInspector = useMemo<AppMemoryInspectorView>(
    () =>
      buildMemoryInspectorView({
        controlProjection: controlPlanePanel,
        eventSummary,
        conversionError:
          error === undefined ? undefined : { safeMessage: error }
      }),
    [controlPlanePanel, error, eventSummary]
  );
  const runDraftCandidate = useMemo<AppRunDraftView>(
    () =>
      buildRunDraftView({
        objectiveDraft,
        selectedIntent,
        acceptanceCriteriaDraft,
        workspaceRoot,
        controlProjection: controlPlanePanel,
        eventSummary,
        workspaceIndexRef: loadedWorkspaceIndexRef
      }),
    [
      acceptanceCriteriaDraft,
      controlPlanePanel,
      eventSummary,
      loadedWorkspaceIndexRef,
      objectiveDraft,
      selectedIntent,
      workspaceRoot
    ]
  );
  const displayedRunDraft = runDraftPreview ?? runDraftCandidate;
  const patchProposalCreationCandidate =
    useMemo<AppPatchProposalCreationPreviewView>(
      () =>
        buildPatchProposalCreationPreviewView({
          titleDraft: patchProposalTitleDraft,
          changeDescriptionSummary: patchProposalDescriptionDraft,
          pathRefsText: patchProposalPathRefsDraft,
          defaultChangeKind: patchProposalChangeKind,
          estimatedLinesAdded: Number(patchProposalLinesAdded),
          estimatedLinesRemoved: Number(patchProposalLinesRemoved),
          selectedIntent,
          runDraft: displayedRunDraft,
          workspaceIndexRef: loadedWorkspaceIndexRef
        }),
      [
        displayedRunDraft,
        loadedWorkspaceIndexRef,
        patchProposalChangeKind,
        patchProposalDescriptionDraft,
        patchProposalLinesAdded,
        patchProposalLinesRemoved,
        patchProposalPathRefsDraft,
        patchProposalTitleDraft,
        selectedIntent
      ]
    );
  const modelPatchProposalImportCandidate =
    useMemo<ModelPatchProposalImportView>(
      () =>
        buildModelPatchProposalImportView({
          draftText: modelPatchProposalDraftText,
          sourceKind: "paste"
        }),
      [modelPatchProposalDraftText]
    );
  const modelImportedPatchProposalCreationPreview = useMemo<
    AppPatchProposalCreationPreviewView | undefined
  >(
    () =>
      buildPatchProposalCreationPreviewFromModelImport(
        modelPatchProposalImportPreview
      ),
    [modelPatchProposalImportPreview]
  );
  const displayedModelPatchProposalImport =
    modelPatchProposalImportPreview ??
    buildModelPatchProposalImportView({
      draftText: "",
      sourceKind: "paste"
    });
  const displayedPatchProposalCreation =
    patchProposalCreationPreview ??
    modelImportedPatchProposalCreationPreview ??
    buildPatchProposalCreationPreviewView({
      selectedIntent,
      runDraft: displayedRunDraft,
      workspaceIndexRef: loadedWorkspaceIndexRef
    });
  const patchProposalSurfaceSummaries = useMemo(
    () => [
      ...(patchProposalCreationSurfaceSummaries(
        displayedPatchProposalCreation
      ) ?? []),
      ...(patchProposalValidationSurfaceSummaries(
        patchProposalValidationPreview
      ) ?? []),
      ...(patchDiffAuditSurfaceSummaries(patchDiffAuditPreview) ?? []),
      ...(patchApprovalDraftSurfaceSummaries(patchApprovalDraftPreview) ?? []),
      ...(patchVirtualApplySurfaceSummaries(patchVirtualApplyPreview) ?? []),
      ...(patchRollbackCheckpointSurfaceSummaries(
        patchRollbackCheckpointPreview
      ) ?? []),
      ...(controlledCreationReplayPatchSummaries(
        controlledCreationReplayProjection
      ) ?? []),
      ...(sandboxApplyRollbackEventProjectionSurfaceSummaries(
        sandboxApplyRollbackEventProjection
      ) ?? []),
      ...(modelProposalChainIntegrationSurfaceSummaries(
        modelProposalChainIntegrationPreview
      ) ?? [])
    ],
    [
      controlledCreationReplayProjection,
      modelProposalChainIntegrationPreview,
      sandboxApplyRollbackEventProjection,
      patchApprovalDraftPreview,
      patchRollbackCheckpointPreview,
      patchVirtualApplyPreview,
      displayedPatchProposalCreation,
      patchDiffAuditPreview,
      patchProposalValidationPreview
    ]
  );
  const patchProposalApprovalRefs = useMemo(
    () => [
      ...patchProposalCreationApprovalRefs(displayedPatchProposalCreation),
      ...patchProposalValidationApprovalRefs(patchProposalValidationPreview),
      ...patchDiffAuditApprovalRefs(patchDiffAuditPreview),
      ...patchApprovalDraftApprovalRefs(patchApprovalDraftPreview),
      ...patchVirtualApplyApprovalRefs(patchVirtualApplyPreview),
      ...patchRollbackCheckpointApprovalRefs(patchRollbackCheckpointPreview),
      ...controlledCreationReplayApprovalRefs(
        controlledCreationReplayProjection
      ),
      ...sandboxApplyRollbackEventProjectionApprovalRefs(
        sandboxApplyRollbackEventProjection
      ),
      ...modelProposalChainIntegrationApprovalRefs(
        modelProposalChainIntegrationPreview
      )
    ],
    [
      controlledCreationReplayProjection,
      modelProposalChainIntegrationPreview,
      sandboxApplyRollbackEventProjection,
      patchApprovalDraftPreview,
      patchRollbackCheckpointPreview,
      patchVirtualApplyPreview,
      displayedPatchProposalCreation,
      patchDiffAuditPreview,
      patchProposalValidationPreview
    ]
  );
  const patchProposalAuditWarningCodes = useMemo(
    () => [
      ...patchProposalValidationAuditWarningCodes(
        patchProposalValidationPreview
      ),
      ...patchDiffAuditWarningCodes(patchDiffAuditPreview),
      ...patchApprovalDraftWarningCodes(patchApprovalDraftPreview),
      ...patchVirtualApplyWarningCodes(patchVirtualApplyPreview),
      ...patchRollbackCheckpointWarningCodes(patchRollbackCheckpointPreview),
      ...controlledCreationReplayWarningCodes(
        controlledCreationReplayProjection
      ),
      ...sandboxApplyRollbackEventProjectionWarningCodes(
        sandboxApplyRollbackEventProjection
      ),
      ...modelProposalChainIntegrationWarningCodes(
        modelProposalChainIntegrationPreview
      )
    ],
    [
      controlledCreationReplayProjection,
      modelProposalChainIntegrationPreview,
      sandboxApplyRollbackEventProjection,
      patchApprovalDraftPreview,
      patchRollbackCheckpointPreview,
      patchVirtualApplyPreview,
      patchDiffAuditPreview,
      patchProposalValidationPreview
    ]
  );
  const patchWorkbenchSurfaces = useMemo<AppWorkbenchSurfaceView>(
    () =>
      buildWorkbenchSurfacesView({
        eventSummary,
        controlProjection: controlPlanePanel,
        conversionResult: result,
        conversionError:
          error === undefined ? undefined : { safeMessage: error },
        preflight,
        patchProposalSummaries: patchProposalSurfaceSummaries,
        futureApprovalRefs: patchProposalApprovalRefs,
        futureAuditWarningCodes: [
          ...patchProposalAuditWarningCodes,
          ...verificationLaneProjectionWarningCodes(verificationLaneProjection)
        ],
        verificationLaneProjection
      }),
    [
      controlPlanePanel,
      error,
      eventSummary,
      patchProposalApprovalRefs,
      patchProposalAuditWarningCodes,
      patchProposalSurfaceSummaries,
      preflight,
      result,
      verificationLaneProjection
    ]
  );
  const memoryRecallPreview = useMemo<AppMemoryRecallPreviewView>(
    () =>
      buildMemoryRecallPreviewView({
        runDraft: displayedRunDraft,
        objectiveSummary: displayedRunDraft.objectiveSummary,
        selectedIntent,
        acceptanceCriteriaCount: displayedRunDraft.acceptanceCriteriaCount,
        workspaceRoot,
        memoryInspector,
        workspaceIndexRef: loadedWorkspaceIndexRef
      }),
    [
      displayedRunDraft,
      loadedWorkspaceIndexRef,
      memoryInspector,
      selectedIntent,
      workspaceRoot
    ]
  );
  const contextCart = useMemo<AppContextCartView>(
    () =>
      buildContextCartView({
        runDraft: displayedRunDraft,
        controlProjection: controlPlanePanel,
        memoryInspector,
        memoryRecallPreview,
        workspaceIndexRef: loadedWorkspaceIndexRef,
        patchSurface: patchWorkbenchSurfaces.diff,
        eventSummary
      }),
    [
      controlPlanePanel,
      displayedRunDraft,
      eventSummary,
      loadedWorkspaceIndexRef,
      memoryInspector,
      memoryRecallPreview,
      patchWorkbenchSurfaces.diff
    ]
  );
  const agentRoutePreview = useMemo<AppAgentRoutePreviewView>(
    () =>
      buildAgentRoutePreviewView({
        runDraft: displayedRunDraft,
        selectedIntent,
        objectiveSummary: displayedRunDraft.objectiveSummary,
        acceptanceCriteriaCount: displayedRunDraft.acceptanceCriteriaCount,
        workspaceRoot,
        contextCart,
        workspaceIndexRef: loadedWorkspaceIndexRef,
        patchSurface: patchWorkbenchSurfaces.diff,
        memoryInspector
      }),
    [
      contextCart,
      displayedRunDraft,
      loadedWorkspaceIndexRef,
      memoryInspector,
      patchWorkbenchSurfaces.diff,
      selectedIntent,
      workspaceRoot
    ]
  );
  const capabilityPlanPreview = useMemo<AppCapabilityPlanPreviewView>(
    () =>
      buildCapabilityPlanPreviewView({
        runDraft: displayedRunDraft,
        agentRoutePreview,
        contextCart,
        patchSurface: patchWorkbenchSurfaces.diff,
        workspaceIndexRef: loadedWorkspaceIndexRef,
        memoryInspector,
        selectedIntent,
        conversionResult: result,
        conversionError:
          error === undefined ? undefined : { safeMessage: error }
      }),
    [
      agentRoutePreview,
      contextCart,
      displayedRunDraft,
      error,
      loadedWorkspaceIndexRef,
      memoryInspector,
      patchWorkbenchSurfaces.diff,
      result,
      selectedIntent
    ]
  );
  const patchProposalValidationCandidate =
    useMemo<AppPatchProposalValidationPreviewView>(
      () =>
        buildPatchProposalValidationPreviewView({
          proposalPreview: displayedPatchProposalCreation,
          workspaceIndexRef: loadedWorkspaceIndexRef,
          capabilityPlanPreview
        }),
      [
        capabilityPlanPreview,
        displayedPatchProposalCreation,
        loadedWorkspaceIndexRef
      ]
    );
  const displayedPatchProposalValidation =
    patchProposalValidationPreview ?? buildPatchProposalValidationPreviewView();
  const patchDiffAuditCandidate = useMemo<AppPatchDiffAuditPreviewView>(
    () =>
      buildPatchDiffAuditPreviewView({
        proposalPreview: displayedPatchProposalCreation,
        validationPreview: displayedPatchProposalValidation,
        workspaceIndexRef: loadedWorkspaceIndexRef,
        capabilityPlanPreview
      }),
    [
      capabilityPlanPreview,
      displayedPatchProposalCreation,
      displayedPatchProposalValidation,
      loadedWorkspaceIndexRef
    ]
  );
  const displayedPatchDiffAudit =
    patchDiffAuditPreview ?? buildPatchDiffAuditPreviewView();
  const patchApprovalDraftCandidate = useMemo<AppPatchApprovalDraftView>(
    () =>
      buildPatchApprovalDraftView({
        proposalPreview: displayedPatchProposalCreation,
        validationPreview: displayedPatchProposalValidation,
        diffAuditPreview: displayedPatchDiffAudit,
        workspaceIndexRef: loadedWorkspaceIndexRef,
        capabilityPlanPreview,
        agentRoutePreview
      }),
    [
      agentRoutePreview,
      capabilityPlanPreview,
      displayedPatchDiffAudit,
      displayedPatchProposalCreation,
      displayedPatchProposalValidation,
      loadedWorkspaceIndexRef
    ]
  );
  const displayedPatchApprovalDraft =
    patchApprovalDraftPreview ?? buildPatchApprovalDraftView();
  const patchVirtualApplyCandidate = useMemo<AppPatchVirtualApplyPreviewView>(
    () =>
      buildPatchVirtualApplyPreviewView({
        proposalPreview: displayedPatchProposalCreation,
        validationPreview: displayedPatchProposalValidation,
        diffAuditPreview: displayedPatchDiffAudit,
        approvalDraft: displayedPatchApprovalDraft,
        workspaceIndexRef: loadedWorkspaceIndexRef,
        capabilityPlanPreview,
        agentRoutePreview
      }),
    [
      agentRoutePreview,
      capabilityPlanPreview,
      displayedPatchApprovalDraft,
      displayedPatchDiffAudit,
      displayedPatchProposalCreation,
      displayedPatchProposalValidation,
      loadedWorkspaceIndexRef
    ]
  );
  const displayedPatchVirtualApply =
    patchVirtualApplyPreview ?? buildPatchVirtualApplyPreviewView();
  const patchRollbackCheckpointCandidate =
    useMemo<AppPatchRollbackCheckpointPreviewView>(
      () =>
        buildPatchRollbackCheckpointPreviewView({
          virtualApplyPreview: displayedPatchVirtualApply,
          proposalPreview: displayedPatchProposalCreation,
          validationPreview: displayedPatchProposalValidation,
          diffAuditPreview: displayedPatchDiffAudit,
          approvalDraft: displayedPatchApprovalDraft,
          workspaceIndexRef: loadedWorkspaceIndexRef,
          contextAssemblyPreview,
          capabilityPlanPreview,
          agentRoutePreview
        }),
      [
        agentRoutePreview,
        capabilityPlanPreview,
        contextAssemblyPreview,
        displayedPatchApprovalDraft,
        displayedPatchDiffAudit,
        displayedPatchProposalCreation,
        displayedPatchProposalValidation,
        displayedPatchVirtualApply,
        loadedWorkspaceIndexRef
      ]
    );
  const displayedPatchRollbackCheckpoint =
    patchRollbackCheckpointPreview ?? buildPatchRollbackCheckpointPreviewView();
  const disposableWorkspaceSnapshotCandidate =
    useMemo<AppDisposableWorkspaceSnapshotView>(
      () =>
        buildDisposableWorkspaceSnapshotView({
          disposableRootRef: snapshotDisposableRootRef,
          sourceWorkspaceFingerprint: snapshotSourceFingerprint,
          fileSummaryJsonText: snapshotFileSummaryJson,
          workspaceIndexRef: loadedWorkspaceIndexRef
        }),
      [
        loadedWorkspaceIndexRef,
        snapshotDisposableRootRef,
        snapshotFileSummaryJson,
        snapshotSourceFingerprint
      ]
    );
  const displayedDisposableWorkspaceSnapshot =
    disposableWorkspaceSnapshotPreview ??
    buildDisposableWorkspaceSnapshotView();
  const userWorkspaceSnapshotBackupCandidate =
    useMemo<AppUserWorkspaceSnapshotBackupView>(
      () =>
        buildUserWorkspaceSnapshotBackupView({
          userWorkspaceRootRef,
          sourceWorkspaceFingerprint: userWorkspaceSourceFingerprint,
          fileSummaryJsonText: userWorkspaceFileSummaryJson,
          workspaceIndexRef: loadedWorkspaceIndexRef,
          disposableSnapshotContractRef:
            disposableWorkspaceSnapshotPreview?.contractId,
          expectedUserSnapshotHash: loadedWorkspaceIndexRef?.hashPrefix
        }),
      [
        disposableWorkspaceSnapshotPreview?.contractId,
        loadedWorkspaceIndexRef,
        userWorkspaceFileSummaryJson,
        userWorkspaceRootRef,
        userWorkspaceSourceFingerprint
      ]
    );
  const displayedUserWorkspaceSnapshotBackup =
    userWorkspaceSnapshotBackupPreview ??
    buildUserWorkspaceSnapshotBackupView();
  const disposablePatchApplyView = useMemo<AppDisposablePatchApplyView>(
    () =>
      buildDisposablePatchApplyView({
        snapshotContract: disposableWorkspaceSnapshotPreview,
        patchProposalPreview: patchProposalCreationPreview,
        patchValidationPreview: patchProposalValidationPreview,
        patchDiffAuditPreview,
        patchApprovalDraft: patchApprovalDraftPreview,
        patchVirtualApplyPreview,
        patchRollbackCheckpointPreview
      }),
    [
      disposableWorkspaceSnapshotPreview,
      patchApprovalDraftPreview,
      patchDiffAuditPreview,
      patchProposalCreationPreview,
      patchProposalValidationPreview,
      patchRollbackCheckpointPreview,
      patchVirtualApplyPreview
    ]
  );
  const approvalGatedDisposableApplyView =
    useMemo<AppApprovalGatedDisposableApplyView>(
      () =>
        buildApprovalGatedDisposableApplyView({
          snapshotContract: disposableWorkspaceSnapshotPreview,
          patchProposalPreview: patchProposalCreationPreview,
          patchValidationPreview: patchProposalValidationPreview,
          patchDiffAuditPreview,
          patchApprovalDraft: patchApprovalDraftPreview,
          patchVirtualApplyPreview,
          patchRollbackCheckpointPreview,
          disposablePatchApplyView
        }),
      [
        disposablePatchApplyView,
        disposableWorkspaceSnapshotPreview,
        patchApprovalDraftPreview,
        patchDiffAuditPreview,
        patchProposalCreationPreview,
        patchProposalValidationPreview,
        patchRollbackCheckpointPreview,
        patchVirtualApplyPreview
      ]
    );
  const disposablePatchRollbackView = useMemo<AppDisposablePatchRollbackView>(
    () =>
      buildDisposablePatchRollbackView({
        snapshotContract: disposableWorkspaceSnapshotPreview,
        disposablePatchApplyView,
        patchProposalPreview: patchProposalCreationPreview,
        patchValidationPreview: patchProposalValidationPreview,
        patchDiffAuditPreview,
        patchApprovalDraft: patchApprovalDraftPreview,
        patchVirtualApplyPreview,
        patchRollbackCheckpointPreview
      }),
    [
      disposablePatchApplyView,
      disposableWorkspaceSnapshotPreview,
      patchApprovalDraftPreview,
      patchDiffAuditPreview,
      patchProposalCreationPreview,
      patchProposalValidationPreview,
      patchRollbackCheckpointPreview,
      patchVirtualApplyPreview
    ]
  );
  const sandboxApplyRollbackEventProjectionCandidate =
    useMemo<AppSandboxApplyRollbackEventProjectionView>(
      () =>
        buildSandboxApplyRollbackEventProjectionView({
          snapshotContract: disposableWorkspaceSnapshotPreview,
          patchProposalPreview: patchProposalCreationPreview,
          patchValidationPreview: patchProposalValidationPreview,
          patchDiffAuditPreview,
          patchApprovalDraft: patchApprovalDraftPreview,
          patchVirtualApplyPreview,
          patchRollbackCheckpointPreview
        }),
      [
        disposableWorkspaceSnapshotPreview,
        patchApprovalDraftPreview,
        patchDiffAuditPreview,
        patchProposalCreationPreview,
        patchProposalValidationPreview,
        patchRollbackCheckpointPreview,
        patchVirtualApplyPreview
      ]
    );
  const displayedSandboxApplyRollbackEventProjection =
    sandboxApplyRollbackEventProjection ??
    sandboxApplyRollbackEventProjectionCandidate;
  const userWorkspacePromotionReadinessCandidate =
    useMemo<AppUserWorkspacePromotionReadinessView>(
      () =>
        buildUserWorkspacePromotionReadinessView({
          userWorkspaceSnapshotBackupContract:
            userWorkspaceSnapshotBackupPreview,
          sandboxApplyRollbackEventProjection:
            displayedSandboxApplyRollbackEventProjection,
          patchProposalPreview: patchProposalCreationPreview,
          patchValidationPreview: patchProposalValidationPreview,
          patchDiffAuditPreview: patchDiffAuditPreview,
          patchApprovalDraft: patchApprovalDraftPreview,
          patchVirtualApplyPreview: patchVirtualApplyPreview,
          patchRollbackCheckpointPreview: patchRollbackCheckpointPreview,
          approvalGatedDisposableApplyResult: approvalGatedDisposableApplyView
        }),
      [
        approvalGatedDisposableApplyView,
        displayedSandboxApplyRollbackEventProjection,
        patchApprovalDraftPreview,
        patchDiffAuditPreview,
        patchProposalCreationPreview,
        patchProposalValidationPreview,
        patchRollbackCheckpointPreview,
        patchVirtualApplyPreview,
        userWorkspaceSnapshotBackupPreview
      ]
    );
  const displayedUserWorkspacePromotionReadiness =
    userWorkspacePromotionReadinessPreview ??
    buildUserWorkspacePromotionReadinessView();
  const userWorkspaceApplyPrototypeView =
    useMemo<AppUserWorkspaceApplyPrototypeView>(
      () =>
        buildUserWorkspaceApplyPrototypeView({
          promotionReadiness: displayedUserWorkspacePromotionReadiness,
          userWorkspaceSnapshotBackupContract:
            displayedUserWorkspaceSnapshotBackup,
          patchProposalPreview: patchProposalCreationPreview,
          patchValidationPreview: patchProposalValidationPreview,
          patchDiffAuditPreview: patchDiffAuditPreview,
          patchApprovalDraft: patchApprovalDraftPreview,
          patchVirtualApplyPreview: patchVirtualApplyPreview,
          patchRollbackCheckpointPreview: patchRollbackCheckpointPreview
        }),
      [
        displayedUserWorkspacePromotionReadiness,
        displayedUserWorkspaceSnapshotBackup,
        patchApprovalDraftPreview,
        patchDiffAuditPreview,
        patchProposalCreationPreview,
        patchProposalValidationPreview,
        patchRollbackCheckpointPreview,
        patchVirtualApplyPreview
      ]
    );
  const userWorkspaceRollbackPrototypeView =
    useMemo<AppUserWorkspaceRollbackPrototypeView>(
      () =>
        buildUserWorkspaceRollbackPrototypeView({
          userWorkspaceSnapshotBackupContract:
            displayedUserWorkspaceSnapshotBackup,
          promotionReadiness: displayedUserWorkspacePromotionReadiness
        }),
      [
        displayedUserWorkspacePromotionReadiness,
        displayedUserWorkspaceSnapshotBackup
      ]
    );
  const userWorkspaceEventWriterView = useMemo<AppUserWorkspaceEventWriterView>(
    () =>
      buildUserWorkspaceEventWriterView({
        promotionReadiness: displayedUserWorkspacePromotionReadiness,
        userWorkspaceSnapshotBackupContract:
          displayedUserWorkspaceSnapshotBackup
      }),
    [
      displayedUserWorkspacePromotionReadiness,
      displayedUserWorkspaceSnapshotBackup
    ]
  );
  const appApprovalExecutionDesignView =
    useMemo<AppApprovalExecutionDesignView>(
      () =>
        buildAppApprovalExecutionDesignView({
          userWorkspacePromotionReadiness:
            displayedUserWorkspacePromotionReadiness,
          userWorkspaceApplyPrototype: userWorkspaceApplyPrototypeView,
          userWorkspaceRollbackPrototype: userWorkspaceRollbackPrototypeView,
          userWorkspaceApplyRollbackEventWriter: userWorkspaceEventWriterView,
          approvalDraft: patchApprovalDraftPreview,
          capabilityPlan: capabilityPlanPreview,
          contextAssembly: contextAssemblyPreview,
          auditSurface: patchWorkbenchSurfaces.audit
        }),
      [
        capabilityPlanPreview,
        contextAssemblyPreview,
        displayedUserWorkspacePromotionReadiness,
        patchApprovalDraftPreview,
        patchWorkbenchSurfaces.audit,
        userWorkspaceApplyPrototypeView,
        userWorkspaceEventWriterView,
        userWorkspaceRollbackPrototypeView
      ]
    );
  const displayedAppApprovedExecutionReceipt =
    appApprovedExecutionReceiptPreview ??
    buildAppApprovedExecutionReceiptView();
  const appApprovedExecutionFlowInput = useMemo<AppApprovedExecutionFlowInput>(
    () => ({
      workspaceRoot,
      receiptView: displayedAppApprovedExecutionReceipt,
      patchProposalPreview: patchProposalCreationPreview,
      patchValidationPreview: patchProposalValidationPreview,
      patchDiffAuditPreview,
      patchApprovalDraft: patchApprovalDraftPreview,
      contentDraft: appApprovedExecutionContentDraft,
      applyResult: appApprovedApplyResult,
      rollbackResult: appApprovedRollbackResult,
      eventRecordResult: appApprovedExecutionEventResult
    }),
    [
      appApprovedApplyResult,
      appApprovedExecutionContentDraft,
      appApprovedExecutionEventResult,
      appApprovedRollbackResult,
      displayedAppApprovedExecutionReceipt,
      patchApprovalDraftPreview,
      patchDiffAuditPreview,
      patchProposalCreationPreview,
      patchProposalValidationPreview,
      workspaceRoot
    ]
  );
  const appApprovedExecutionFlowView = useMemo<AppApprovedExecutionFlowView>(
    () => buildAppApprovedExecutionFlowView(appApprovedExecutionFlowInput),
    [appApprovedExecutionFlowInput]
  );
  const modelProposalChainIntegrationCandidate =
    useMemo<ModelProposalChainIntegrationView>(
      () =>
        buildModelProposalChainIntegrationView({
          modelImportView: modelPatchProposalImportPreview,
          patchProposalCreationPreview: displayedPatchProposalCreation,
          patchValidationPreview: patchProposalValidationPreview,
          patchDiffAuditPreview: patchDiffAuditPreview,
          patchApprovalDraft: patchApprovalDraftPreview,
          patchVirtualApplyPreview: patchVirtualApplyPreview,
          patchRollbackCheckpointPreview: patchRollbackCheckpointPreview,
          controlledCreationReplayProjection,
          userWorkspaceSnapshotBackupContract:
            userWorkspaceSnapshotBackupPreview,
          userWorkspacePromotionReadiness:
            userWorkspacePromotionReadinessPreview,
          userWorkspaceApplyPrototype: userWorkspaceApplyPrototypeView,
          userWorkspaceRollbackPrototype: userWorkspaceRollbackPrototypeView,
          userWorkspaceApplyRollbackEventWriter: userWorkspaceEventWriterView,
          appApprovalExecutionDesign: appApprovalExecutionDesignView
        }),
      [
        appApprovalExecutionDesignView,
        controlledCreationReplayProjection,
        displayedPatchProposalCreation,
        modelPatchProposalImportPreview,
        patchApprovalDraftPreview,
        patchDiffAuditPreview,
        patchProposalValidationPreview,
        patchRollbackCheckpointPreview,
        patchVirtualApplyPreview,
        userWorkspaceApplyPrototypeView,
        userWorkspaceEventWriterView,
        userWorkspacePromotionReadinessPreview,
        userWorkspaceRollbackPrototypeView,
        userWorkspaceSnapshotBackupPreview
      ]
    );
  const displayedModelProposalChainIntegration =
    modelProposalChainIntegrationPreview ??
    buildModelProposalChainIntegrationView();
  const liveProposalOptInGateCandidate = useMemo<LiveProposalOptInGateView>(
    () =>
      buildLiveProposalOptInGateView({
        providerId: "deepseek",
        modelProfileId: liveProposalModelProfileId,
        keySourceRef: liveProposalKeySourceRef,
        optInMode: liveProposalOptInMode
      }),
    [
      liveProposalKeySourceRef,
      liveProposalModelProfileId,
      liveProposalOptInMode
    ]
  );
  const displayedLiveProposalOptInGate =
    liveProposalOptInGatePreview ?? liveProposalOptInGateCandidate;
  const liveProposalRequestBuilderCandidate =
    useMemo<LiveProposalRequestBuilderView>(
      () =>
        buildLiveProposalRequestBuilderView({
          objectiveSummary: liveProposalRequestObjective,
          intent: liveProposalRequestIntent,
          modelProfileId: liveProposalModelProfileId,
          keySourceRef: liveProposalKeySourceRef,
          optInMode: liveProposalOptInMode,
          allowedPathRefsText: liveProposalRequestAllowedPaths
        }),
      [
        liveProposalKeySourceRef,
        liveProposalModelProfileId,
        liveProposalOptInMode,
        liveProposalRequestAllowedPaths,
        liveProposalRequestIntent,
        liveProposalRequestObjective
      ]
    );
  const displayedLiveProposalRequestBuilder =
    liveProposalRequestBuilderPreview ?? liveProposalRequestBuilderCandidate;
  const appLiveProposalSessionReceiptCandidate =
    useMemo<AppLiveProposalSessionReceiptView>(
      () =>
        buildAppLiveProposalSessionReceiptView({
          typedConfirmation: appLiveProposalSessionTypedConfirmation,
          modelProfileId: liveProposalModelProfileId,
          objectiveSummary: liveProposalRequestObjective,
          allowedPathRefsText: liveProposalRequestAllowedPaths,
          apiKeyPolicyId: displayedLiveProposalOptInGate.policyId,
          requestBuilderId: displayedLiveProposalRequestBuilder.requestId,
          requestBoundaryHash:
            displayedLiveProposalRequestBuilder.requestHashPrefix
        }),
      [
        appLiveProposalSessionTypedConfirmation,
        displayedLiveProposalOptInGate.policyId,
        displayedLiveProposalRequestBuilder.requestHashPrefix,
        displayedLiveProposalRequestBuilder.requestId,
        liveProposalModelProfileId,
        liveProposalRequestAllowedPaths,
        liveProposalRequestObjective
      ]
    );
  const displayedAppLiveProposalSessionReceipt =
    appLiveProposalSessionReceiptPreview ??
    appLiveProposalSessionReceiptCandidate;
  const liveDeepSeekProposalGenerationView =
    useMemo<LiveDeepSeekProposalGenerationView>(
      () =>
        buildLiveDeepSeekProposalGenerationView({
          liveProposalOptInGateView: liveProposalOptInGatePreview,
          sessionReceiptView: appLiveProposalSessionReceiptPreview,
          requestBuilderView: liveProposalRequestBuilderPreview,
          keySourceRef: liveProposalKeySourceRef,
          expectedKeySourceRef: liveProposalAllowedKeySourceRef,
          commandResult: liveDeepSeekProposalCommandResult,
          modelImportView: modelPatchProposalImportPreview,
          modelProposalChainIntegrationView:
            modelProposalChainIntegrationPreview,
          isGenerating: liveDeepSeekProposalGenerationInFlight,
          errorMessage: liveDeepSeekProposalGenerationError
        }),
      [
        appLiveProposalSessionReceiptPreview,
        liveDeepSeekProposalCommandResult,
        liveDeepSeekProposalGenerationError,
        liveDeepSeekProposalGenerationInFlight,
        liveProposalOptInGatePreview,
        liveProposalKeySourceRef,
        liveProposalRequestBuilderPreview,
        modelPatchProposalImportPreview,
        modelProposalChainIntegrationPreview
      ]
    );
  const liveProposalSummaryEventPreview = useMemo<
    LiveProposalSummaryEventPreview | undefined
  >(() => {
    if (
      liveDeepSeekProposalCommandResult === undefined ||
      modelPatchProposalImportPreview === undefined ||
      modelPatchProposalImportPreview.readiness.canImportToPatchPreview !==
        true ||
      liveDeepSeekProposalGenerationView.blockerCount > 0
    ) {
      return undefined;
    }
    return buildLiveProposalSummaryEventPreview({
      generationView: liveDeepSeekProposalGenerationView,
      commandResult: liveDeepSeekProposalCommandResult,
      importView: modelPatchProposalImportPreview
    });
  }, [
    liveDeepSeekProposalCommandResult,
    liveDeepSeekProposalGenerationView,
    modelPatchProposalImportPreview
  ]);
  const canRecordLiveProposalSummaryEvent =
    liveProposalSummaryEventPreview !== undefined &&
    workspaceRoot.trim().length > 0 &&
    liveProposalSummaryEventStatus !== "recording";
  const liveProposalValidationIntegrationView =
    useMemo<LiveProposalValidationIntegrationView>(
      () => buildLiveProposalValidationIntegrationView(),
      []
    );
  const liveProposalPreviewGateCandidate = useMemo<LiveProposalPreviewGateView>(
    () =>
      buildLiveProposalPreviewGateView({
        liveProposalApiKeyPolicyView: displayedLiveProposalOptInGate,
        liveProposalRequestBuilderView: displayedLiveProposalRequestBuilder,
        liveProposalValidationIntegrationView,
        modelPatchProposalImportView: modelPatchProposalImportPreview,
        modelProposalChainIntegrationView: modelProposalChainIntegrationPreview,
        auditSurface: patchWorkbenchSurfaces.audit
      }),
    [
      displayedLiveProposalOptInGate,
      displayedLiveProposalRequestBuilder,
      liveProposalValidationIntegrationView,
      modelPatchProposalImportPreview,
      modelProposalChainIntegrationPreview,
      patchWorkbenchSurfaces.audit
    ]
  );
  const displayedLiveProposalPreviewGate =
    liveProposalPreviewGatePreview ?? buildLiveProposalPreviewGateView();
  const liveProposalTelemetryAuditCandidate =
    useMemo<LiveProposalTelemetryAuditView>(
      () =>
        buildLiveProposalTelemetryAuditView({
          liveProposalApiKeyPolicyView: displayedLiveProposalOptInGate,
          liveProposalRequestBuilderView: displayedLiveProposalRequestBuilder,
          liveProposalValidationIntegrationView,
          liveProposalPreviewGateView:
            displayedLiveProposalPreviewGate.status === "empty"
              ? undefined
              : displayedLiveProposalPreviewGate
        }),
      [
        displayedLiveProposalOptInGate,
        displayedLiveProposalPreviewGate,
        displayedLiveProposalRequestBuilder,
        liveProposalValidationIntegrationView
      ]
    );
  const displayedLiveProposalTelemetryAudit =
    liveProposalTelemetryAuditPreview ?? buildLiveProposalTelemetryAuditView();
  const liveProposalEvaluationSummaryCandidate =
    useMemo<LiveProposalEvaluationSummaryView>(
      () =>
        buildLiveProposalEvaluationSummaryView({
          summaryJsonText: liveProposalEvaluationSummaryText,
          sourceKind: "paste"
        }),
      [liveProposalEvaluationSummaryText]
    );
  const displayedLiveProposalEvaluationSummary =
    liveProposalEvaluationSummaryPreview ??
    buildLiveProposalEvaluationSummaryView();
  const liveProposalEvaluationTelemetryAuditCandidate =
    useMemo<LiveProposalEvaluationTelemetryAuditView>(
      () =>
        buildLiveProposalEvaluationTelemetryAuditView({
          auditJsonText: liveProposalEvaluationTelemetryAuditText,
          appEvaluationSummaryView:
            displayedLiveProposalEvaluationSummary.status === "empty"
              ? undefined
              : displayedLiveProposalEvaluationSummary
        }),
      [
        displayedLiveProposalEvaluationSummary,
        liveProposalEvaluationTelemetryAuditText
      ]
    );
  const displayedLiveProposalEvaluationTelemetryAudit =
    liveProposalEvaluationTelemetryAuditPreview ??
    buildLiveProposalEvaluationTelemetryAuditView();
  useEffect(() => {
    setLiveProposalTelemetryAuditPreview(undefined);
  }, [
    liveProposalOptInGatePreview,
    liveProposalPreviewGatePreview,
    liveProposalRequestBuilderPreview,
    modelPatchProposalImportPreview,
    modelProposalChainIntegrationPreview
  ]);
  useEffect(() => {
    setLiveDeepSeekProposalCommandResult(undefined);
    setLiveDeepSeekProposalGenerationError(undefined);
    setLiveDeepSeekProposalGenerationInFlight(false);
  }, [
    appLiveProposalSessionTypedConfirmation,
    liveProposalKeySourceRef,
    liveProposalModelProfileId,
    liveProposalOptInMode,
    liveProposalRequestAllowedPaths,
    liveProposalRequestIntent,
    liveProposalRequestObjective
  ]);
  useEffect(() => {
    setLiveProposalEvaluationSummaryPreview(undefined);
  }, [liveProposalEvaluationSummaryText]);
  useEffect(() => {
    setLiveProposalEvaluationTelemetryAuditPreview(undefined);
  }, [
    liveProposalEvaluationSummaryPreview,
    liveProposalEvaluationSummaryText,
    liveProposalEvaluationTelemetryAuditText
  ]);
  const contextAssemblyCandidate = useMemo<AppContextAssemblyPreviewView>(
    () =>
      buildContextAssemblyPreviewView({
        runDraft: displayedRunDraft,
        workspaceIndexBridge: loadedWorkspaceIndexRef,
        memoryRecallPreview,
        patchSurface: patchWorkbenchSurfaces.diff,
        agentRoutePreview,
        capabilityPlanPreview,
        controlProjection: controlPlanePanel,
        verificationLaneProjection,
        eventSummary,
        replayProjection: controlledCreationReplayProjection,
        sandboxApplyRollbackEventProjection:
          displayedSandboxApplyRollbackEventProjection,
        modelPatchProposalImport: modelPatchProposalImportPreview,
        modelProposalChainIntegration: modelProposalChainIntegrationPreview,
        liveProposalPreviewGate: liveProposalPreviewGatePreview,
        snapshotContract: displayedDisposableWorkspaceSnapshot,
        userWorkspaceSnapshotContract: displayedUserWorkspaceSnapshotBackup,
        userWorkspacePromotionReadiness:
          displayedUserWorkspacePromotionReadiness,
        previousPreview: contextAssemblyPreview
      }),
    [
      agentRoutePreview,
      capabilityPlanPreview,
      contextAssemblyPreview,
      controlPlanePanel,
      controlledCreationReplayProjection,
      displayedDisposableWorkspaceSnapshot,
      liveProposalPreviewGatePreview,
      modelProposalChainIntegrationPreview,
      modelPatchProposalImportPreview,
      displayedUserWorkspaceSnapshotBackup,
      displayedUserWorkspacePromotionReadiness,
      displayedSandboxApplyRollbackEventProjection,
      displayedRunDraft,
      eventSummary,
      loadedWorkspaceIndexRef,
      memoryRecallPreview,
      patchWorkbenchSurfaces.diff,
      verificationLaneProjection
    ]
  );
  const displayedContextAssembly =
    contextAssemblyPreview ?? contextAssemblyCandidate;
  const controlledCreationReplayCandidate =
    useMemo<AppControlledCreationReplayProjectionView>(
      () =>
        buildControlledCreationReplayProjectionView({
          eventSummary,
          runDraftEventResult,
          patchProposalCreationPreview: patchProposalCreationPreview,
          patchValidationPreview: patchProposalValidationPreview,
          patchDiffAuditPreview,
          patchApprovalDraft: patchApprovalDraftPreview,
          patchVirtualApplyPreview,
          patchRollbackCheckpointPreview,
          contextAssemblyPreview: displayedContextAssembly,
          controlProjection: controlPlanePanel
        }),
      [
        controlPlanePanel,
        displayedContextAssembly,
        eventSummary,
        patchApprovalDraftPreview,
        patchDiffAuditPreview,
        patchProposalCreationPreview,
        patchProposalValidationPreview,
        patchRollbackCheckpointPreview,
        patchVirtualApplyPreview,
        runDraftEventResult
      ]
    );
  const displayedControlledCreationReplay =
    controlledCreationReplayProjection ??
    buildControlledCreationReplayProjectionView();
  const disposableWorkspaceSnapshotAuditWarningCodes = useMemo(
    () =>
      disposableWorkspaceSnapshotWarningCodes(
        disposableWorkspaceSnapshotPreview
      ),
    [disposableWorkspaceSnapshotPreview]
  );
  const userWorkspaceSnapshotAuditWarningCodes = useMemo(
    () =>
      userWorkspaceSnapshotBackupWarningCodes(
        userWorkspaceSnapshotBackupPreview
      ),
    [userWorkspaceSnapshotBackupPreview]
  );
  const userWorkspacePromotionAuditWarningCodes = useMemo(
    () =>
      userWorkspacePromotionReadinessWarningCodes(
        userWorkspacePromotionReadinessPreview
      ),
    [userWorkspacePromotionReadinessPreview]
  );
  const workbenchSurfaces = useMemo<AppWorkbenchSurfaceView>(
    () =>
      buildWorkbenchSurfacesView({
        eventSummary,
        controlProjection: controlPlanePanel,
        conversionResult: result,
        conversionError:
          error === undefined ? undefined : { safeMessage: error },
        preflight,
        patchProposalSummaries: patchProposalSurfaceSummaries,
        futureApprovalRefs: [
          ...patchProposalApprovalRefs,
          ...capabilityPlanApprovalRefs(capabilityPlanPreview)
        ],
        futureAuditWarningCodes: [
          ...patchProposalAuditWarningCodes,
          ...disposableWorkspaceSnapshotAuditWarningCodes,
          ...userWorkspaceSnapshotAuditWarningCodes,
          ...userWorkspacePromotionAuditWarningCodes,
          ...verificationLaneProjectionWarningCodes(verificationLaneProjection)
        ],
        verificationLaneProjection
      }),
    [
      capabilityPlanPreview,
      controlPlanePanel,
      disposableWorkspaceSnapshotAuditWarningCodes,
      error,
      eventSummary,
      patchProposalApprovalRefs,
      patchProposalAuditWarningCodes,
      patchProposalSurfaceSummaries,
      preflight,
      result,
      userWorkspacePromotionAuditWarningCodes,
      userWorkspaceSnapshotAuditWarningCodes,
      verificationLaneProjection
    ]
  );
  const runDraftEventPreview = useMemo<AppRunDraftEventPreview>(
    () =>
      buildRunDraftEventPayload({
        runDraft: displayedRunDraft,
        workspaceRoot,
        workspaceIndexRef: loadedWorkspaceIndexRef,
        contextCart,
        agentRoutePreview,
        capabilityPlanPreview,
        memoryRecallPreview
      }),
    [
      agentRoutePreview,
      capabilityPlanPreview,
      contextCart,
      displayedRunDraft,
      loadedWorkspaceIndexRef,
      memoryRecallPreview,
      workspaceRoot
    ]
  );
  const chatRunCanvas = useMemo<AppChatRunCanvasView>(
    () =>
      buildChatRunCanvasView({
        objectiveDraft,
        selectedIntent,
        acceptanceCriteriaDraft,
        workspaceRoot,
        controlProjection: controlPlanePanel,
        eventSummary,
        conversionResult: result,
        conversionError:
          error === undefined ? undefined : { safeMessage: error },
        preflight,
        memoryInspector,
        approvalDiffAuditSurfaces: workbenchSurfaces,
        workspaceIndexBridge
      }),
    [
      acceptanceCriteriaDraft,
      controlPlanePanel,
      error,
      eventSummary,
      memoryInspector,
      objectiveDraft,
      preflight,
      result,
      selectedIntent,
      workbenchSurfaces,
      workspaceIndexBridge,
      workspaceRoot
    ]
  );
  const bridgeActionsVisible =
    bridgePanel.status === "pending" && bridgePanel.emptyMessage === undefined;
  const preflightBadge =
    preflight === undefined
      ? "Source-tree mode / Preflight pending / No native bridge"
      : preflight.ok
        ? "Source-tree mode / Preflight OK / No native bridge"
        : "Source-tree mode / Preflight needs attention / No native bridge";

  useEffect(() => {
    setRunDraftPreview(undefined);
    setRunDraftEventStatus("idle");
    setRunDraftEventResult(undefined);
    setRunDraftEventError(undefined);
    setPatchProposalCreationPreview(undefined);
    setPatchProposalValidationPreview(undefined);
    setModelPatchProposalImportPreview(undefined);
    setModelProposalChainIntegrationPreview(undefined);
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setDisposableWorkspaceSnapshotPreview(undefined);
    setUserWorkspaceSnapshotBackupPreview(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
    setContextAssemblyPreview(undefined);
  }, [acceptanceCriteriaDraft, objectiveDraft, selectedIntent, workspaceRoot]);

  useEffect(() => {
    setPatchProposalCreationPreview(undefined);
    setModelPatchProposalImportPreview(undefined);
    setModelProposalChainIntegrationPreview(undefined);
    setPatchProposalValidationPreview(undefined);
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
    setContextAssemblyPreview(undefined);
  }, [
    patchProposalChangeKind,
    patchProposalDescriptionDraft,
    patchProposalLinesAdded,
    patchProposalLinesRemoved,
    patchProposalPathRefsDraft,
    patchProposalTitleDraft
  ]);

  useEffect(() => {
    setModelPatchProposalImportPreview(undefined);
    setModelProposalChainIntegrationPreview(undefined);
    setPatchProposalValidationPreview(undefined);
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
    setContextAssemblyPreview(undefined);
  }, [modelPatchProposalDraftText]);

  useEffect(() => {
    setModelProposalChainIntegrationPreview(undefined);
    setContextAssemblyPreview(undefined);
  }, [
    modelPatchProposalImportPreview?.importId,
    patchProposalValidationPreview?.validationId,
    patchDiffAuditPreview?.auditId,
    patchApprovalDraftPreview?.approvalDraftId,
    patchVirtualApplyPreview?.virtualApplyId,
    patchRollbackCheckpointPreview?.checkpointPreviewId,
    controlledCreationReplayProjection?.projectionId,
    userWorkspaceSnapshotBackupPreview?.contractId,
    userWorkspacePromotionReadinessPreview?.readinessId
  ]);

  useEffect(() => {
    setContextAssemblyPreview(undefined);
  }, [
    agentRoutePreview.routeId,
    disposableWorkspaceSnapshotPreview?.contractId,
    patchApprovalDraftPreview?.approvalDraftId,
    patchDiffAuditPreview?.auditId,
    patchRollbackCheckpointPreview?.checkpointPreviewId,
    patchVirtualApplyPreview?.virtualApplyId,
    controlledCreationReplayProjection?.projectionId,
    sandboxApplyRollbackEventProjection?.projectionId,
    modelProposalChainIntegrationPreview?.chainId,
    modelPatchProposalImportPreview?.importId,
    userWorkspaceSnapshotBackupPreview?.contractId,
    userWorkspacePromotionReadinessPreview?.readinessId,
    patchWorkbenchSurfaces.diff.items.length,
    capabilityPlanPreview.itemCount,
    displayedRunDraft.draftId,
    eventSummary?.eventCount,
    loadedWorkspaceIndexRef?.hashPrefix,
    memoryRecallPreview.itemCount
  ]);

  useEffect(() => {
    setDisposableWorkspaceSnapshotPreview(undefined);
    setUserWorkspaceSnapshotBackupPreview(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
    setContextAssemblyPreview(undefined);
  }, [
    loadedWorkspaceIndexRef?.hashPrefix,
    snapshotDisposableRootRef,
    snapshotFileSummaryJson,
    snapshotSourceFingerprint
  ]);

  useEffect(() => {
    setUserWorkspaceSnapshotBackupPreview(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
    setContextAssemblyPreview(undefined);
  }, [
    disposableWorkspaceSnapshotPreview?.contractId,
    loadedWorkspaceIndexRef?.hashPrefix,
    userWorkspaceFileSummaryJson,
    userWorkspaceRootRef,
    userWorkspaceSourceFingerprint
  ]);

  useEffect(() => {
    setUserWorkspacePromotionReadinessPreview(undefined);
    setContextAssemblyPreview(undefined);
  }, [
    patchApprovalDraftPreview?.approvalDraftId,
    patchDiffAuditPreview?.auditId,
    patchProposalValidationPreview?.validationId,
    patchRollbackCheckpointPreview?.checkpointPreviewId,
    patchVirtualApplyPreview?.virtualApplyId,
    sandboxApplyRollbackEventProjection?.projectionId,
    userWorkspaceSnapshotBackupPreview?.contractId
  ]);

  function handlePreviewDraftRun(): void {
    if (runDraftCandidate.canPreview) {
      setRunDraftPreview(runDraftCandidate);
    }
  }

  function handlePreviewContextAssembly(): void {
    setContextAssemblyPreview(contextAssemblyCandidate);
  }

  function handlePreviewPatchProposal(): void {
    setPatchProposalCreationPreview(patchProposalCreationCandidate);
    setModelPatchProposalImportPreview(undefined);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setPatchProposalValidationPreview(undefined);
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
  }

  function handlePreviewModelPatchProposal(): void {
    setModelPatchProposalImportPreview(modelPatchProposalImportCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
    setPatchProposalCreationPreview(undefined);
    setPatchProposalValidationPreview(undefined);
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handleClearModelPatchProposal(): void {
    setModelPatchProposalDraftText("");
    setModelPatchProposalImportPreview(undefined);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
    setPatchProposalCreationPreview(undefined);
    setPatchProposalValidationPreview(undefined);
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewModelProposalChain(): void {
    setModelProposalChainIntegrationPreview(
      modelProposalChainIntegrationCandidate
    );
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handleClearModelProposalChain(): void {
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewLiveProposalOptInGate(): void {
    setLiveProposalOptInGatePreview(liveProposalOptInGateCandidate);
    setLiveDeepSeekProposalCommandResult(undefined);
    setLiveDeepSeekProposalGenerationError(undefined);
    setLiveProposalSummaryEventStatus("idle");
    setLiveProposalSummaryEventResult(undefined);
    setLiveProposalSummaryEventError(undefined);
    setAppLiveProposalSessionReceiptPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
  }

  function handlePreviewLiveProposalRequest(): void {
    setLiveProposalRequestBuilderPreview(liveProposalRequestBuilderCandidate);
    setLiveDeepSeekProposalCommandResult(undefined);
    setLiveDeepSeekProposalGenerationError(undefined);
    setLiveProposalSummaryEventStatus("idle");
    setLiveProposalSummaryEventResult(undefined);
    setLiveProposalSummaryEventError(undefined);
    setAppLiveProposalSessionReceiptPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
  }

  function handlePreviewAppLiveProposalSessionReceipt(): void {
    setAppLiveProposalSessionReceiptPreview(
      appLiveProposalSessionReceiptCandidate
    );
    setLiveDeepSeekProposalCommandResult(undefined);
    setLiveDeepSeekProposalGenerationError(undefined);
    setLiveProposalSummaryEventStatus("idle");
    setLiveProposalSummaryEventResult(undefined);
    setLiveProposalSummaryEventError(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
  }

  function handleClearAppLiveProposalSessionReceipt(): void {
    setAppLiveProposalSessionReceiptPreview(undefined);
    setLiveDeepSeekProposalCommandResult(undefined);
    setLiveDeepSeekProposalGenerationError(undefined);
    setLiveProposalSummaryEventStatus("idle");
    setLiveProposalSummaryEventResult(undefined);
    setLiveProposalSummaryEventError(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
  }

  async function handleGenerateLiveProposal(): Promise<void> {
    if (
      !liveDeepSeekProposalGenerationView.readiness.canGenerateLiveProposal ||
      appLiveProposalSessionReceiptPreview === undefined ||
      liveProposalRequestBuilderPreview === undefined
    ) {
      return;
    }

    setLiveDeepSeekProposalGenerationInFlight(true);
    setLiveDeepSeekProposalGenerationError(undefined);
    setLiveDeepSeekProposalCommandResult(undefined);
    setLiveProposalSummaryEventStatus("idle");
    setLiveProposalSummaryEventResult(undefined);
    setLiveProposalSummaryEventError(undefined);
    try {
      const commandRequest = buildLiveProposalGenerationCommandRequest({
        sessionReceiptView: appLiveProposalSessionReceiptPreview,
        requestBuilderView: liveProposalRequestBuilderPreview,
        keySourceRef: liveProposalKeySourceRef,
        objectiveSummary: liveProposalRequestObjective,
        allowedPathRefsText: liveProposalRequestAllowedPaths
      });
      const commandResult =
        await generateLiveDeepSeekPatchProposal(commandRequest);
      const importView = buildModelPatchProposalImportView({
        draftText: JSON.stringify(commandResult.proposalCandidate),
        sourceKind: "manual_test"
      });
      const creationPreview =
        buildPatchProposalCreationPreviewFromModelImport(importView);
      const chainView = buildModelProposalChainIntegrationView({
        modelImportView: importView,
        patchProposalCreationPreview: creationPreview,
        patchValidationPreview: patchProposalValidationPreview,
        patchDiffAuditPreview: patchDiffAuditPreview,
        patchApprovalDraft: patchApprovalDraftPreview,
        patchVirtualApplyPreview: patchVirtualApplyPreview,
        patchRollbackCheckpointPreview: patchRollbackCheckpointPreview,
        controlledCreationReplayProjection,
        userWorkspaceSnapshotBackupContract: userWorkspaceSnapshotBackupPreview,
        userWorkspacePromotionReadiness: userWorkspacePromotionReadinessPreview,
        userWorkspaceApplyPrototype: userWorkspaceApplyPrototypeView,
        userWorkspaceRollbackPrototype: userWorkspaceRollbackPrototypeView,
        userWorkspaceApplyRollbackEventWriter: userWorkspaceEventWriterView,
        appApprovalExecutionDesign: appApprovalExecutionDesignView
      });

      setLiveDeepSeekProposalCommandResult(commandResult);
      setModelPatchProposalImportPreview(importView);
      setModelProposalChainIntegrationPreview(chainView);
      setPatchProposalCreationPreview(undefined);
      setLiveProposalPreviewGatePreview(undefined);
      setLiveProposalTelemetryAuditPreview(undefined);
      setContextAssemblyPreview(undefined);
      setLiveProposalSummaryEventStatus("idle");
    } catch (caught) {
      setLiveDeepSeekProposalGenerationError(safeErrorMessage(caught));
    } finally {
      setLiveDeepSeekProposalGenerationInFlight(false);
    }
  }

  function handleClearLiveProposalGeneration(): void {
    setLiveDeepSeekProposalCommandResult(undefined);
    setLiveDeepSeekProposalGenerationError(undefined);
    setLiveDeepSeekProposalGenerationInFlight(false);
    setModelPatchProposalImportPreview(undefined);
    setModelProposalChainIntegrationPreview(undefined);
    setPatchProposalCreationPreview(undefined);
    setLiveProposalSummaryEventStatus("idle");
    setLiveProposalSummaryEventResult(undefined);
    setLiveProposalSummaryEventError(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  async function handleRecordLiveProposalSummaryEvent(): Promise<void> {
    if (liveProposalSummaryEventPreview === undefined) {
      setLiveProposalSummaryEventStatus("error");
      setLiveProposalSummaryEventError(
        "Live proposal summary event preview is not ready."
      );
      return;
    }
    setLiveProposalSummaryEventStatus("recording");
    setLiveProposalSummaryEventError(undefined);
    try {
      const eventResult = await recordLiveProposalSummaryEvent({
        workspaceRoot,
        eventPreview: liveProposalSummaryEventPreview
      });
      setLiveProposalSummaryEventResult(eventResult);
      setLiveProposalSummaryEventStatus("recorded");
      await refreshEvents(workspaceRoot);
    } catch (caught) {
      setLiveProposalSummaryEventError(safeErrorMessage(caught));
      setLiveProposalSummaryEventStatus("error");
    }
  }

  function handlePreviewLiveProposalGate(): void {
    setLiveProposalPreviewGatePreview(liveProposalPreviewGateCandidate);
    setLiveProposalTelemetryAuditPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handleClearLiveProposalGate(): void {
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewLiveProposalTelemetryAudit(): void {
    setLiveProposalTelemetryAuditPreview(liveProposalTelemetryAuditCandidate);
  }

  function handlePreviewLiveProposalEvaluationSummary(): void {
    setLiveProposalEvaluationSummaryPreview(
      liveProposalEvaluationSummaryCandidate
    );
  }

  function handleClearLiveProposalEvaluationSummary(): void {
    setLiveProposalEvaluationSummaryText("");
    setLiveProposalEvaluationSummaryPreview(undefined);
  }

  function handlePreviewLiveProposalEvaluationTelemetryAudit(): void {
    setLiveProposalEvaluationTelemetryAuditPreview(
      liveProposalEvaluationTelemetryAuditCandidate
    );
  }

  function handleClearLiveProposalEvaluationTelemetryAudit(): void {
    setLiveProposalEvaluationTelemetryAuditText("");
    setLiveProposalEvaluationTelemetryAuditPreview(undefined);
  }

  function handleValidatePatchProposal(): void {
    setPatchProposalValidationPreview(patchProposalValidationCandidate);
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
  }

  function handlePreviewDiffAudit(): void {
    setPatchDiffAuditPreview(patchDiffAuditCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
  }

  function handlePreviewApprovalDraft(): void {
    setPatchApprovalDraftPreview(patchApprovalDraftCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
  }

  function handlePreviewVirtualApply(): void {
    setPatchVirtualApplyPreview(patchVirtualApplyCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
  }

  function handlePreviewRollbackCheckpoint(): void {
    setPatchRollbackCheckpointPreview(patchRollbackCheckpointCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
  }

  function handlePreviewDisposableWorkspaceSnapshot(): void {
    setDisposableWorkspaceSnapshotPreview(disposableWorkspaceSnapshotCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setUserWorkspaceSnapshotBackupPreview(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewUserWorkspaceSnapshotBackup(): void {
    setUserWorkspaceSnapshotBackupPreview(userWorkspaceSnapshotBackupCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewControlledReplayProjection(): void {
    setControlledCreationReplayProjection(controlledCreationReplayCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
  }

  function handlePreviewSandboxApplyRollbackEventProjection(): void {
    setSandboxApplyRollbackEventProjection(
      sandboxApplyRollbackEventProjectionCandidate
    );
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
  }

  function handlePreviewUserWorkspacePromotionReadiness(): void {
    setUserWorkspacePromotionReadinessPreview(
      userWorkspacePromotionReadinessCandidate
    );
    setModelProposalChainIntegrationPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  async function handleRecordRunDraftEvent(): Promise<void> {
    if (
      !runDraftEventPreview.canRecord ||
      runDraftEventPreview.payload === undefined
    ) {
      setRunDraftEventStatus("error");
      setRunDraftEventError(
        runDraftEventPreview.safeMessage ??
          "Draft event payload is not ready to record."
      );
      return;
    }
    setRunDraftEventStatus("recording");
    setRunDraftEventError(undefined);
    try {
      const recordResult = await recordControlRunDraftEvent({
        workspaceRoot,
        payload: runDraftEventPreview.payload
      });
      setRunDraftEventResult(recordResult);
      setControlledCreationReplayProjection(undefined);
      setRunDraftEventStatus("recorded");
      await refreshEvents(workspaceRoot);
    } catch (caught) {
      setRunDraftEventError(safeErrorMessage(caught));
      setRunDraftEventStatus("error");
    }
  }

  async function handleApplyApprovedPatch(): Promise<void> {
    setAppApprovedExecutionError(undefined);
    try {
      const request = buildApprovedApplyRequestFromExecutionFlow(
        appApprovedExecutionFlowInput
      );
      const applyResult = await applyApprovedUserWorkspacePatch(request);
      setAppApprovedApplyResult(applyResult);
      setAppApprovedRollbackResult(undefined);
      const eventResult = await recordApprovedUserWorkspaceExecutionEvent({
        workspaceRoot,
        eventPreview: applyResult.eventPreview
      });
      setAppApprovedExecutionEventResult(eventResult);
      setAppApprovedExecutionReceiptPreview(
        buildAppApprovedExecutionReceiptView({
          receiptKind: "rollback",
          applyTypedConfirmation: appApprovedApplyConfirmation,
          rollbackTypedConfirmation: appApprovedRollbackConfirmation,
          allowedRelativePathsText: appApprovedReceiptPathRefs,
          workspaceSnapshotBackupContract: displayedUserWorkspaceSnapshotBackup,
          patchProposalPreview: patchProposalCreationPreview,
          patchValidationPreview: patchProposalValidationPreview,
          patchDiffAuditPreview,
          patchApprovalDraft: patchApprovalDraftPreview,
          patchRollbackCheckpointPreview,
          approvedApplyResult: applyResult
        })
      );
      await refreshEvents(workspaceRoot);
    } catch (caught) {
      setAppApprovedExecutionError(safeErrorMessage(caught));
    }
  }

  async function handleRollbackApprovedPatch(): Promise<void> {
    setAppApprovedExecutionError(undefined);
    try {
      const request = buildApprovedRollbackRequestFromExecutionFlow(
        appApprovedExecutionFlowInput
      );
      const rollbackResult = await rollbackApprovedUserWorkspacePatch(request);
      setAppApprovedRollbackResult(rollbackResult);
      const eventResult = await recordApprovedUserWorkspaceExecutionEvent({
        workspaceRoot,
        eventPreview: rollbackResult.eventPreview
      });
      setAppApprovedExecutionEventResult(eventResult);
      await refreshEvents(workspaceRoot);
    } catch (caught) {
      setAppApprovedExecutionError(safeErrorMessage(caught));
    }
  }

  async function handleRunGitReadLane(): Promise<void> {
    setGitReadLaneStatus("running");
    setGitReadLaneResult(undefined);
    setGitReadLaneError(undefined);
    setGitVerificationEventResult(undefined);
    try {
      const laneResult = await runGitReadLane({
        workspaceRoot,
        workspaceRootRef: "app-workspace-root",
        lane: gitReadLane,
        pathspecs: parseGitReadLanePathspecs(gitReadPathspecs),
        timeoutMs: 5000,
        maxOutputBytes: 65536
      });
      setGitReadLaneResult(laneResult);
      const eventResult = await recordVerificationLaneEvent({
        workspaceRoot,
        eventPreview: laneResult.eventPreview
      });
      setGitVerificationEventResult(eventResult);
      await refreshEvents(workspaceRoot);
      setGitReadLaneStatus("done");
    } catch (caught) {
      setGitReadLaneError(safeErrorMessage(caught));
      setGitReadLaneStatus("error");
    }
  }

  async function handleRunVerificationLane(): Promise<void> {
    setShellVerificationStatus("running");
    setShellVerificationResult(undefined);
    setShellVerificationError(undefined);
    setShellVerificationEventResult(undefined);
    try {
      const safeArgs = parseShellVerificationSafeArgs(
        shellVerificationTemplate,
        shellVerificationTestFile
      );
      const laneResult = await runShellVerificationLane({
        workspaceRoot,
        workspaceRootRef: "app-workspace-root",
        templateId: shellVerificationTemplate,
        ...(safeArgs === undefined ? {} : { safeArgs }),
        timeoutMs: 60_000,
        maxOutputBytes: 65_536
      });
      setShellVerificationResult(laneResult);
      const eventResult = await recordVerificationLaneEvent({
        workspaceRoot,
        eventPreview: laneResult.eventPreview
      });
      setShellVerificationEventResult(eventResult);
      await refreshEvents(workspaceRoot);
      setShellVerificationStatus("done");
    } catch (caught) {
      setShellVerificationError(safeErrorMessage(caught));
      setShellVerificationStatus("error");
    }
  }

  async function handleConvert(): Promise<void> {
    setStatus("running");
    setResult(undefined);
    setError(undefined);
    try {
      const nextPreflight = await checkDesktopRunnerPreflight(workspaceRoot);
      setPreflight(nextPreflight);
      if (!nextPreflight.ok) {
        throw new Error(runnerPreflightMessage(nextPreflight));
      }
      const flowResult = await runDesktopWebTableToCsvFlow({
        workspaceRoot,
        payloadText,
        filename
      });
      setResult(flowResult);
      await refreshEvents(workspaceRoot);
      setStatus("done");
    } catch (caught) {
      setError(safeErrorMessage(caught));
      setStatus("error");
    }
  }

  async function refreshEvents(root = workspaceRoot): Promise<void> {
    setEventStatus("loading");
    setEventError(undefined);
    try {
      const summary = await loadWorkspaceEventSummary(root, 50);
      setEventSummary(summary);
      setEventStatus(summary.ok ? "loaded" : "error");
      if (!summary.ok) {
        setEventError(summary.safeMessage ?? "Event summary failed");
      }
    } catch (caught) {
      setEventError(safeErrorMessage(caught));
      setEventStatus("error");
    }
  }

  async function handlePayloadFile(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    const fileText = await file.text();
    const sizeError = validatePayloadTextSize(fileText);
    if (sizeError !== undefined) {
      setPayloadText("");
      setResult(undefined);
      setError(sizeError);
      setStatus("error");
      return;
    }
    setPayloadText(fileText);
  }

  async function handleWorkspaceIndexSummaryFile(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    setWorkspaceIndexFileLabel(file.name);
    setWorkspaceIndexJson(await file.text());
  }

  function handlePreviewWorkspaceIndex(): void {
    const source: AppWorkspaceIndexSource =
      workspaceIndexFileLabel === undefined
        ? "pasted_summary_json"
        : "file_summary_json";
    const parsed = parseWorkspaceIndexSummaryJson(workspaceIndexJson, {
      source
    });
    if (parsed.ok) {
      setWorkspaceIndexBridge(buildWorkspaceIndexBridgeView(parsed.input));
      return;
    }
    setWorkspaceIndexBridge(
      buildWorkspaceIndexBridgeView({
        source,
        parseErrorCode: parsed.errorCode,
        parseErrorMessage: parsed.safeMessage
      })
    );
  }

  function handleImportBridgeProposal(): void {
    if (bridgePreview === undefined) {
      setBridgeMessage("No bridge proposal is available to import.");
      return;
    }
    const decision = importBridgeProposalToPayloadEditor(
      bridgePreview,
      new Date().toISOString()
    );
    setBridgePreview(decision.preview);
    if (decision.ok) {
      setPayloadText(decision.payloadText);
      setBridgeMessage(
        "Bridge proposal imported into the payload editor. Convert still requires a separate click."
      );
      return;
    }
    setBridgeMessage(decision.safeMessage);
  }

  function handleRejectBridgeProposal(): void {
    if (bridgePreview === undefined) {
      setBridgeMessage("No bridge proposal is available to reject.");
      return;
    }
    setBridgePreview(rejectBridgeProposal(bridgePreview));
    setBridgeMessage("Bridge proposal rejected. Nothing was imported.");
  }

  async function refreshVersion(): Promise<void> {
    try {
      setVersion(await getDesktopAppVersion());
    } catch {
      setVersion("0.1.0");
    }
  }

  useEffect(() => {
    let cancelled = false;
    checkDesktopRunnerPreflight()
      .then((nextPreflight) => {
        if (!cancelled) {
          setPreflight(nextPreflight);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setPreflight({
            ok: false,
            mode: "packaged_not_supported",
            runnerFound: false,
            nodeAvailable: false,
            payloadLimitBytes: 2_000_000,
            warnings: [],
            statusCode: "PREFLIGHT_FAILED",
            errorCode: "PREFLIGHT_FAILED",
            safeMessage: safeErrorMessage(caught),
            runnerStatus: "Preflight failed",
            packagedStandaloneSupport: "Unknown",
            nextAction: "Review the safe preflight message and retry"
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="shell" onMouseEnter={refreshVersion}>
      <header className="topbar">
        <div>
          <p className="eyebrow">DeepSeek Workbench</p>
          <h1>DG Desktop Shell</h1>
          <p className="subtitle">Local web-table-to-CSV workflow</p>
        </div>
        <span className="badge">{preflightBadge}</span>
      </header>

      <section className="layout">
        <form className="panel" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>Workspace root</span>
            <input
              value={workspaceRoot}
              onChange={(event) => setWorkspaceRoot(event.target.value)}
              placeholder="D:\\workspaces\\demo"
            />
            <p className="fieldHelp">
              Workspace is a local folder. Draft CSV files are written only
              under workspace/drafts/.
            </p>
          </label>

          <label>
            <span>Payload JSON file</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handlePayloadFile}
            />
            <p className="fieldHelp">
              Load a sanitized BrowserDomPayload JSON file exported from the
              browser extension.
            </p>
          </label>

          <label>
            <span>Sanitized BrowserDomPayload JSON</span>
            <textarea
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              placeholder="Paste the sanitized extension payload here"
              spellCheck={false}
            />
            <p className="fieldHelp">
              Paste sanitized BrowserDomPayload JSON. Raw page markup and
              private browser data should not be present.
            </p>
          </label>

          <section
            className="bridgePreview"
            aria-label="Bridge proposal preview"
          >
            <div className="panelHeader">
              <h2>Bridge Proposal Preview (dry)</h2>
              <span className="muted">
                {bridgePanel.status === "disabled"
                  ? "Disabled - no live bridge is enabled."
                  : bridgePanel.status}
              </span>
            </div>
            <p className="fieldHelp">
              No live bridge is enabled. Future extension-to-desktop proposals
              will appear here for preview.
            </p>
            {bridgePanel.emptyMessage !== undefined ? (
              <p className="empty">{bridgePanel.emptyMessage}</p>
            ) : (
              <dl className="summaryGrid compact">
                <div>
                  <dt>Source</dt>
                  <dd>{bridgePanel.source}</dd>
                </div>
                <div>
                  <dt>Extension</dt>
                  <dd>{bridgePanel.extensionLabel}</dd>
                </div>
                <div>
                  <dt>Tables</dt>
                  <dd>{bridgePanel.tableSummary}</dd>
                </div>
                <div>
                  <dt>Risks</dt>
                  <dd>{bridgePanel.warningSummary}</dd>
                </div>
                <div>
                  <dt>Payload bytes</dt>
                  <dd>{bridgePanel.payloadBytes}</dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>{bridgePanel.receivedAt}</dd>
                </div>
              </dl>
            )}
            {bridgePanel.warnings.length > 0 ? (
              <p className="muted">
                warnings {bridgePanel.warnings.join(", ")}
              </p>
            ) : null}
            {bridgeActionsVisible ? (
              <div className="buttonRow">
                <button
                  type="button"
                  className="secondary"
                  disabled={bridgePanel.importDisabled}
                  aria-disabled={bridgePanel.importDisabled}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleImportBridgeProposal();
                  }}
                >
                  Import to Payload Editor
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={bridgePanel.rejectDisabled}
                  aria-disabled={bridgePanel.rejectDisabled}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRejectBridgeProposal();
                  }}
                >
                  Reject Proposal
                </button>
              </div>
            ) : null}
            {bridgeMessage !== undefined ? (
              <p className="docHint">{bridgeMessage}</p>
            ) : null}
          </section>

          <label>
            <span>Draft filename</span>
            <input
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              placeholder="web-table-export.csv"
            />
          </label>

          <p className="fieldHelp">
            Convert runs the local runner only. It does not contact DeepSeek or
            inspect browser secrets, form values, or page storage.
          </p>
          <button
            type="button"
            className="primary"
            disabled={status === "running"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleConvert();
            }}
          >
            {status === "running" ? "Converting..." : "Convert"}
          </button>

          <section className="bridgePreview" aria-label="Git Read Lanes">
            <div className="panelHeader">
              <h2>Git Read Lanes</h2>
              <span className="muted">Read-only / no Git writes</span>
            </div>
            <p className="fieldHelp">
              Runs a fixed read-only Git summary lane with fixed argv. No raw
              diff, stdout/stderr, Git write command, or EventStore write is
              exposed.
            </p>
            <label>
              <span>Lane</span>
              <select
                value={gitReadLane}
                onChange={(event) =>
                  setGitReadLane(event.target.value as GitReadLane)
                }
              >
                <option value="status_summary">status_summary</option>
                <option value="diff_summary">diff_summary</option>
                <option value="log_summary">log_summary</option>
                <option value="branch_summary">branch_summary</option>
              </select>
            </label>
            <label>
              <span>Safe pathspecs</span>
              <textarea
                value={gitReadPathspecs}
                onChange={(event) => setGitReadPathspecs(event.target.value)}
                placeholder="Optional relative pathspecs, one per line"
                spellCheck={false}
              />
            </label>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled={
                  workspaceRoot.trim().length === 0 ||
                  gitReadLaneStatus === "running"
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleRunGitReadLane();
                }}
              >
                {gitReadLaneStatus === "running"
                  ? "Running Git Read Lane..."
                  : "Run Git Read Lane"}
              </button>
            </div>
            {gitReadLaneResult !== undefined ? (
              <dl className="summaryGrid compact">
                <div>
                  <dt>Status</dt>
                  <dd>{gitReadLaneResult.status}</dd>
                </div>
                <div>
                  <dt>Lane</dt>
                  <dd>{gitReadLaneResult.lane}</dd>
                </div>
                <div>
                  <dt>Branch</dt>
                  <dd>{gitReadLaneResult.branchSummary}</dd>
                </div>
                <div>
                  <dt>Changed files</dt>
                  <dd>{gitReadLaneResult.changedFileCount}</dd>
                </div>
                <div>
                  <dt>Lines +/-</dt>
                  <dd>
                    {gitReadLaneResult.addedLineCount} /{" "}
                    {gitReadLaneResult.deletedLineCount}
                  </dd>
                </div>
                <div>
                  <dt>Truncated</dt>
                  <dd>{gitReadLaneResult.truncated ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Command hash</dt>
                  <dd>{gitReadLaneResult.commandHash.substring(0, 12)}</dd>
                </div>
                <div>
                  <dt>Output hash</dt>
                  <dd>{gitReadLaneResult.outputHash.substring(0, 12)}</dd>
                </div>
                <div>
                  <dt>Event preview</dt>
                  <dd>
                    {gitReadLaneResult.eventPreview.notWritten
                      ? "not written"
                      : "unexpected"}
                  </dd>
                </div>
                <div>
                  <dt>Raw output</dt>
                  <dd>
                    {gitReadLaneResult.rawDiffIncluded ||
                    gitReadLaneResult.rawStdoutIncluded ||
                    gitReadLaneResult.rawStderrIncluded
                      ? "blocked"
                      : "absent"}
                  </dd>
                </div>
              </dl>
            ) : null}
            {gitReadLaneResult?.changedPathSummaries.length ? (
              <ol className="timeline">
                {gitReadLaneResult.changedPathSummaries.map(
                  (summary, index) => (
                    <li key={`${summary}-${index}`}>
                      <span>{summary}</span>
                    </li>
                  )
                )}
              </ol>
            ) : null}
            {gitReadLaneResult?.warningCodes.length ? (
              <p className="muted">
                warnings {gitReadLaneResult.warningCodes.join(", ")}
              </p>
            ) : null}
            {gitReadLaneError !== undefined ? (
              <p className="errorText">{gitReadLaneError}</p>
            ) : null}
          </section>

          <section
            className="bridgePreview"
            aria-label="Shell Verification Lanes"
          >
            <div className="panelHeader">
              <h2>Shell Verification Lanes</h2>
              <span className="muted">Allowlist only / no arbitrary shell</span>
            </div>
            <p className="fieldHelp">
              Runs only fixed verification templates with fixed argv and no
              shell interpreter. No generic shell command, raw stdout/stderr,
              install command, network command, or EventStore write is exposed.
            </p>
            <label>
              <span>Template</span>
              <select
                value={shellVerificationTemplate}
                onChange={(event) =>
                  setShellVerificationTemplate(
                    event.target.value as ShellVerificationTemplateId
                  )
                }
              >
                <option value="app.typecheck">app.typecheck</option>
                <option value="pnpm.typecheck">pnpm.typecheck</option>
                <option value="pnpm.lint">pnpm.lint</option>
                <option value="pnpm.test.scoped">pnpm.test.scoped</option>
                <option value="cargo.check_tauri">cargo.check_tauri</option>
              </select>
            </label>
            <label>
              <span>Safe scoped test file</span>
              <input
                value={shellVerificationTestFile}
                onChange={(event) =>
                  setShellVerificationTestFile(event.target.value)
                }
                placeholder="runtime/test/example.test.ts"
                disabled={shellVerificationTemplate !== "pnpm.test.scoped"}
              />
              <p className="fieldHelp">
                Used only by pnpm.test.scoped. Relative app/test or runtime/test
                files ending in .test.ts/.tsx are allowed.
              </p>
            </label>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled={
                  workspaceRoot.trim().length === 0 ||
                  shellVerificationStatus === "running"
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleRunVerificationLane();
                }}
              >
                {shellVerificationStatus === "running"
                  ? "Running Verification Lane..."
                  : "Run Verification Lane"}
              </button>
            </div>
            {shellVerificationResult !== undefined ? (
              <dl className="summaryGrid compact">
                <div>
                  <dt>Status</dt>
                  <dd>{shellVerificationResult.status}</dd>
                </div>
                <div>
                  <dt>Template</dt>
                  <dd>{shellVerificationResult.templateId}</dd>
                </div>
                <div>
                  <dt>Exit code</dt>
                  <dd>{shellVerificationResult.exitCode ?? "n/a"}</dd>
                </div>
                <div>
                  <dt>Stdout bytes</dt>
                  <dd>{shellVerificationResult.stdoutBytes}</dd>
                </div>
                <div>
                  <dt>Stderr bytes</dt>
                  <dd>{shellVerificationResult.stderrBytes}</dd>
                </div>
                <div>
                  <dt>Lines out / err</dt>
                  <dd>
                    {shellVerificationResult.stdoutLineCount} /{" "}
                    {shellVerificationResult.stderrLineCount}
                  </dd>
                </div>
                <div>
                  <dt>Truncated</dt>
                  <dd>{shellVerificationResult.truncated ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Command hash</dt>
                  <dd>
                    {shellVerificationResult.commandHash.substring(0, 12)}
                  </dd>
                </div>
                <div>
                  <dt>Output hash</dt>
                  <dd>{shellVerificationResult.outputHash.substring(0, 12)}</dd>
                </div>
                <div>
                  <dt>Event preview</dt>
                  <dd>
                    {shellVerificationResult.eventPreview.notWritten
                      ? "not written"
                      : "unexpected"}
                  </dd>
                </div>
                <div>
                  <dt>Raw output</dt>
                  <dd>
                    {shellVerificationResult.rawStdoutIncluded ||
                    shellVerificationResult.rawStderrIncluded
                      ? "blocked"
                      : "absent"}
                  </dd>
                </div>
              </dl>
            ) : null}
            {shellVerificationResult?.warningCodes.length ? (
              <p className="muted">
                warnings {shellVerificationResult.warningCodes.join(", ")}
              </p>
            ) : null}
            {shellVerificationError !== undefined ? (
              <p className="errorText">{shellVerificationError}</p>
            ) : null}
          </section>

          <section className="bridgePreview" aria-label="Verification Summary">
            <div className="panelHeader">
              <h2>Verification Summary</h2>
              <span className="muted">Summary events / no raw output</span>
            </div>
            <p className="fieldHelp">
              Shows latest Git and shell verification summary events. Event Log
              / Replay stores counts, hashes, warning codes, and status only.
              Raw diff, stdout, stderr, source, and API keys are not displayed.
            </p>
            <dl className="summaryGrid compact">
              <div>
                <dt>Git event id</dt>
                <dd>{gitVerificationEventResult?.eventId ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Shell event id</dt>
                <dd>{shellVerificationEventResult?.eventId ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Replay verification events</dt>
                <dd>{eventPanel?.verificationEventCount ?? 0}</dd>
              </div>
              <div>
                <dt>Latest verification</dt>
                <dd>{eventPanel?.latestVerificationSummary ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Safety scan</dt>
                <dd>{eventPanel?.safetyOk === true ? "OK" : "pending"}</dd>
              </div>
              <div>
                <dt>Raw output</dt>
                <dd>absent</dd>
              </div>
            </dl>
          </section>

          <section
            className="bridgePreview"
            aria-label="Verification Replay Projection"
          >
            <div className="panelHeader">
              <h2>Verification Replay Projection</h2>
              <span className="muted">Evidence refs / no raw output</span>
            </div>
            <p className="fieldHelp">
              Projects Git and shell verification events into replay, audit, and
              context evidence summaries. No raw stdout, stderr, diff, source,
              or API key content is displayed.
            </p>
            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{verificationLaneProjection.status}</dd>
              </div>
              <div>
                <dt>Events</dt>
                <dd>{verificationLaneProjection.eventCount}</dd>
              </div>
              <div>
                <dt>Git / shell</dt>
                <dd>
                  {verificationLaneProjection.gitEventCount} /{" "}
                  {verificationLaneProjection.shellEventCount}
                </dd>
              </div>
              <div>
                <dt>Git changed files</dt>
                <dd>{verificationLaneProjection.latestGitChangedFileCount}</dd>
              </div>
              <div>
                <dt>Shell status</dt>
                <dd>{verificationLaneProjection.latestShellStatus}</dd>
              </div>
              <div>
                <dt>Last verification</dt>
                <dd>{verificationLaneProjection.lastVerificationAt}</dd>
              </div>
              <div>
                <dt>Warnings</dt>
                <dd>{verificationLaneProjection.warningCount}</dd>
              </div>
              <div>
                <dt>Evidence refs</dt>
                <dd>{verificationLaneProjection.evidenceRefCount}</dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{verificationLaneProjection.hashPrefix}</dd>
              </div>
              <div>
                <dt>Execution</dt>
                <dd>
                  {verificationLaneProjection.readiness.appCanExecute
                    ? "unexpected"
                    : "disabled"}
                </dd>
              </div>
            </dl>
            <p className="fieldHelp">
              {summarizeVerificationLaneProjectionView(
                verificationLaneProjection
              )}
            </p>
            {verificationLaneProjection.evidenceRefs.length > 0 ? (
              <ol className="timeline">
                {verificationLaneProjection.evidenceRefs.map((ref) => (
                  <li key={ref.id}>
                    <span className="timelineMeta">
                      {ref.kind} · {ref.hashPrefix}
                    </span>
                    <span>{ref.summary}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {verificationLaneProjection.warningCodes.length > 0 ? (
              <p className="muted">
                warnings {verificationLaneProjection.warningCodes.join(", ")}
              </p>
            ) : null}
            <p className="fieldHelp">{verificationLaneProjection.nextAction}</p>
          </section>
        </form>

        <section className="panel resultPanel" aria-live="polite">
          <div className="panelHeader">
            <h2>Result</h2>
            <span className="muted">App {version}</span>
          </div>

          {panel === undefined && status !== "error" ? (
            <p className="empty">Run a local conversion to see the summary.</p>
          ) : null}

          <div
            className={
              preflight === undefined || preflight.ok ? "statusBox" : "errorBox"
            }
          >
            <strong>Runner preflight</strong>
            <p>{runnerPreflightMessage(preflight)}</p>
            {preflight !== undefined ? (
              <p className="muted">
                status {preflight.statusCode} · mode {preflight.mode} · runner{" "}
                {preflight.runnerFound ? "found" : "missing"} · node{" "}
                {preflight.nodeAvailable ? "available" : "missing"} · packaged{" "}
                {preflight.packagedStandaloneSupport} · next{" "}
                {preflight.nextAction} · payload limit{" "}
                {preflight.payloadLimitBytes} bytes
              </p>
            ) : null}
          </div>

          {panel !== undefined ? (
            <dl className="summaryGrid">
              <div>
                <dt>Draft</dt>
                <dd>{panel.draftRelativePath}</dd>
              </div>
              <div>
                <dt>Absolute path</dt>
                <dd>{panel.draftAbsolutePath}</dd>
              </div>
              <div>
                <dt>Rows / columns</dt>
                <dd>
                  {panel.rows} / {panel.columns}
                </dd>
              </div>
              <div>
                <dt>Warnings</dt>
                <dd>{panel.warningCount}</dd>
              </div>
              <div>
                <dt>Injection risks</dt>
                <dd>{panel.injectionRiskCount}</dd>
              </div>
              <div>
                <dt>Formula escapes</dt>
                <dd>{panel.formulaEscapedCount}</dd>
              </div>
              <div>
                <dt>Event log events</dt>
                <dd>{panel.eventsWritten}</dd>
              </div>
              <div>
                <dt>Replay drafts</dt>
                <dd>{panel.replayDraftCount}</dd>
              </div>
              <div>
                <dt>Event log</dt>
                <dd>{panel.eventLogPath}</dd>
              </div>
            </dl>
          ) : null}

          {status === "error" ? (
            <div className="errorBox">
              <strong>Conversion failed</strong>
              <p>{error}</p>
            </div>
          ) : null}

          <section className="eventPanel" aria-label="Chat Run Canvas">
            <div className="panelHeader">
              <h2>Chat / Run Canvas</h2>
              <span className="muted">Draft only. No LLM request is sent.</span>
            </div>
            <p className="fieldHelp">
              This canvas is a local draft surface. No LLM request is sent and
              no run is created in this phase.
            </p>

            <label>
              <span>Future task intent</span>
              <select
                value={selectedIntent}
                onChange={(event) =>
                  setSelectedIntent(event.target.value as AppRunCanvasIntent)
                }
              >
                <option value="web_data_extraction">web_data_extraction</option>
                <option value="code_change">code_change</option>
                <option value="code_review">code_review</option>
                <option value="verification">verification</option>
                <option value="documentation">documentation</option>
                <option value="unknown">unknown</option>
              </select>
            </label>

            <label>
              <span>Objective draft</span>
              <textarea
                className="compactTextarea"
                value={objectiveDraft}
                onChange={(event) => setObjectiveDraft(event.target.value)}
                placeholder="Draft a future local objective"
                spellCheck={false}
              />
            </label>

            <label>
              <span>Acceptance criteria draft</span>
              <textarea
                className="compactTextarea"
                value={acceptanceCriteriaDraft}
                onChange={(event) =>
                  setAcceptanceCriteriaDraft(event.target.value)
                }
                placeholder="One criterion per line"
                spellCheck={false}
              />
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={handlePreviewDraftRun}
                disabled={!runDraftCandidate.canPreview}
                aria-disabled={!runDraftCandidate.canPreview}
              >
                Preview Draft Run
              </button>
              <button
                type="button"
                className="secondary"
                disabled={true}
                aria-disabled="true"
              >
                Create Run (disabled)
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => void handleRecordRunDraftEvent()}
                disabled={
                  !runDraftEventPreview.canRecord ||
                  runDraftEventStatus === "recording"
                }
                aria-disabled={
                  !runDraftEventPreview.canRecord ||
                  runDraftEventStatus === "recording"
                }
              >
                {runDraftEventStatus === "recording"
                  ? "Recording Draft Event..."
                  : "Record Draft Event (local)"}
              </button>
            </div>
            <p className="fieldHelp">
              Create Run is disabled. Execution gates are not implemented in
              this preview.
            </p>
            <p className="fieldHelp">
              Local-only opt-in. Record Draft Event (local) writes one
              summary-only draft event to the workspace event log. It does not
              create or execute a run.
            </p>

            <section className="surfaceBox" aria-label="Run Draft Preview">
              <div className="panelHeader compactHeader">
                <h2>Run Draft Preview</h2>
                <span className="muted">{displayedRunDraft.status}</span>
              </div>
              <p className="fieldHelp">
                Preview only. No run is created and no LLM request is sent.
              </p>
              <dl className="summaryGrid compact">
                <div>
                  <dt>Mode</dt>
                  <dd>{displayedRunDraft.mode}</dd>
                </div>
                <div>
                  <dt>Preview only</dt>
                  <dd>{displayedRunDraft.previewOnly ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Intent</dt>
                  <dd>{displayedRunDraft.intent}</dd>
                </div>
                <div>
                  <dt>Criteria</dt>
                  <dd>{displayedRunDraft.acceptanceCriteriaCount}</dd>
                </div>
                <div>
                  <dt>Workspace</dt>
                  <dd>{displayedRunDraft.workspaceRootSummary}</dd>
                </div>
                <div>
                  <dt>Can create run</dt>
                  <dd>{displayedRunDraft.canCreateRun ? "yes" : "no"}</dd>
                </div>
              </dl>
              <p className="fieldHelp">
                Draft objective: {displayedRunDraft.objectiveSummary}
              </p>
              {displayedRunDraft.proposedPhases.length > 0 ? (
                <ol className="timeline">
                  {displayedRunDraft.proposedPhases.map((phase) => (
                    <li key={phase.id}>
                      <span className="timelineMeta">future phase</span>
                      <span>{phase.label}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {displayedRunDraft.warnings.length > 0 ? (
                <p className="muted">
                  warnings{" "}
                  {displayedRunDraft.warnings
                    .map((warning) => warning.code)
                    .join(", ")}
                </p>
              ) : null}
              {runDraftEventPreview.warnings.length > 0 ? (
                <p className="muted">
                  draft event warnings{" "}
                  {runDraftEventPreview.warnings
                    .map((warning) => warning.code)
                    .join(", ")}
                </p>
              ) : null}
              <p className="fieldHelp">{displayedRunDraft.nextAction}</p>
              <p className="fieldHelp">{runDraftEventPreview.nextAction}</p>
              {runDraftEventResult !== undefined ? (
                <p className="successText">
                  {summarizeRunDraftEventResult(runDraftEventResult)}
                </p>
              ) : null}
              {runDraftEventStatus === "error" ? (
                <p className="errorText">
                  {runDraftEventError ?? "Draft event was not recorded safely."}
                </p>
              ) : null}
            </section>

            <dl className="summaryGrid compact">
              <div>
                <dt>Canvas status</dt>
                <dd>{chatRunCanvas.status}</dd>
              </div>
              <div>
                <dt>Intent</dt>
                <dd>{chatRunCanvas.intent}</dd>
              </div>
              <div>
                <dt>Criteria</dt>
                <dd>{chatRunCanvas.acceptanceCriteriaCount}</dd>
              </div>
              <div>
                <dt>Can create run</dt>
                <dd>{chatRunCanvas.canCreateRun ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt>Can send to model</dt>
                <dd>{chatRunCanvas.canSendToModel ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt>Latest run</dt>
                <dd>{chatRunCanvas.runCanvas.runStatus}</dd>
              </div>
              <div>
                <dt>Phase</dt>
                <dd>{chatRunCanvas.runCanvas.phase}</dd>
              </div>
              <div>
                <dt>Artifacts</dt>
                <dd>{chatRunCanvas.runCanvas.artifactCount}</dd>
              </div>
              <div>
                <dt>Events</dt>
                <dd>{chatRunCanvas.runCanvas.eventCount}</dd>
              </div>
              <div>
                <dt>Surfaces</dt>
                <dd>
                  approval {chatRunCanvas.runCanvas.approvalStatus} · diff{" "}
                  {chatRunCanvas.runCanvas.diffStatus} · audit{" "}
                  {chatRunCanvas.runCanvas.auditStatus} · memory{" "}
                  {chatRunCanvas.runCanvas.memoryStatus}
                </dd>
              </div>
            </dl>

            <p className="fieldHelp">
              Objective summary: {chatRunCanvas.objectiveSummary}
            </p>
            <p className="fieldHelp">
              Acceptance preview:{" "}
              {chatRunCanvas.chatDraft.acceptanceCriteria.summary}
            </p>
            <p className="fieldHelp">
              Latest result: {chatRunCanvas.runCanvas.latestResult}
            </p>
            {chatRunCanvas.chatDraft.contextHints.length > 0 ? (
              <ol className="timeline">
                {chatRunCanvas.chatDraft.contextHints.map((hint) => (
                  <li key={hint.id}>
                    <span className="timelineMeta">{hint.label}</span>
                    <span>{hint.value}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {chatRunCanvas.warnings.length > 0 ? (
              <p className="muted">
                warnings {chatRunCanvas.warnings.join(", ")}
              </p>
            ) : null}
            <div
              className={
                chatRunCanvas.nextAction.severity === "blocked"
                  ? "errorBox"
                  : "statusBox"
              }
            >
              <strong>Next action</strong>
              <p>{chatRunCanvas.nextAction.label}</p>
            </div>
          </section>

          <section className="eventPanel" aria-label="Workspace Index">
            <div className="panelHeader">
              <h2>Workspace Index</h2>
              <span className="muted">Read-only summary</span>
            </div>
            <p className="fieldHelp">
              Load or paste a safe WorkspaceIndex summary JSON. Raw file content
              is not accepted or displayed. No filesystem crawl is performed.
            </p>

            <label>
              <span>WorkspaceIndex summary JSON file</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  void handleWorkspaceIndexSummaryFile(event);
                }}
              />
              <p className="fieldHelp">
                This reads only the selected summary JSON file text into local
                React state. It does not crawl the workspace.
              </p>
            </label>

            <label>
              <span>WorkspaceIndex summary JSON</span>
              <textarea
                className="compactTextarea"
                value={workspaceIndexJson}
                onChange={(event) => {
                  setWorkspaceIndexFileLabel(undefined);
                  setWorkspaceIndexJson(event.target.value);
                }}
                placeholder="Paste a summary-only WorkspaceIndex JSON export"
                spellCheck={false}
              />
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewWorkspaceIndex();
                }}
              >
                Preview Workspace Index
              </button>
            </div>

            {workspaceIndexFileLabel !== undefined ? (
              <p className="fieldHelp">
                Loaded local summary file: {workspaceIndexFileLabel}
              </p>
            ) : null}

            {workspaceIndexBridge.status === "empty" ? (
              <p className="empty">
                No WorkspaceIndex summary loaded yet. Paste a summary-only JSON
                export to preview metadata.
              </p>
            ) : null}

            {workspaceIndexBridge.status === "rejected" ? (
              <div className="errorBox">
                <strong>Workspace index summary rejected</strong>
                <p>
                  {workspaceIndexBridge.warnings[0]?.safeMessage ??
                    "Workspace index summary was rejected by safety policy."}
                </p>
                <p className="muted">
                  codes{" "}
                  {workspaceIndexBridge.warnings
                    .map((warning) => warning.code)
                    .join(", ")}
                </p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{workspaceIndexBridge.status}</dd>
              </div>
              <div>
                <dt>Files</dt>
                <dd>{workspaceIndexBridge.fileCount}</dd>
              </div>
              <div>
                <dt>Indexed / skipped</dt>
                <dd>
                  {workspaceIndexBridge.indexedFileCount} /{" "}
                  {workspaceIndexBridge.skippedFileCount}
                </dd>
              </div>
              <div>
                <dt>Directories</dt>
                <dd>{workspaceIndexBridge.directoryCount}</dd>
              </div>
              <div>
                <dt>Languages</dt>
                <dd>{workspaceIndexBridge.languageCount}</dd>
              </div>
              <div>
                <dt>Symbols</dt>
                <dd>{workspaceIndexBridge.symbolCount}</dd>
              </div>
              <div>
                <dt>Bytes / lines</dt>
                <dd>
                  {workspaceIndexBridge.totalBytes} /{" "}
                  {workspaceIndexBridge.totalLines}
                </dd>
              </div>
              <div>
                <dt>Hash prefix</dt>
                <dd>{workspaceIndexBridge.hashPrefix}</dd>
              </div>
            </dl>

            {workspaceIndexBridge.languages.length > 0 ? (
              <ol className="timeline">
                {workspaceIndexBridge.languages.map((language) => (
                  <li key={language.language}>
                    <span className="timelineMeta">
                      {language.language} · {language.indexedFileCount} indexed
                    </span>
                    <span>
                      {language.fileCount} file(s), {language.lineCount} line(s)
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {workspaceIndexBridge.topDirectories.length > 0 ? (
              <ol className="timeline">
                {workspaceIndexBridge.topDirectories.map((directory) => (
                  <li key={directory.path}>
                    <span className="timelineMeta">directory</span>
                    <span>
                      {directory.path} · {directory.fileCount} file(s)
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {workspaceIndexBridge.topFiles.length > 0 ? (
              <ol className="timeline">
                {workspaceIndexBridge.topFiles.map((file) => (
                  <li key={file.path}>
                    <span className="timelineMeta">
                      {file.language} · {file.hashPrefix}
                    </span>
                    <span>
                      {file.path} · {file.lineCount} line(s) ·{" "}
                      {file.symbolCount} symbol(s)
                    </span>
                    {file.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {file.warningCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {workspaceIndexBridge.warnings.length > 0 &&
            workspaceIndexBridge.status !== "rejected" ? (
              <p className="muted">
                warnings{" "}
                {workspaceIndexBridge.warnings
                  .map((warning) => warning.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">{workspaceIndexBridge.nextAction}</p>
          </section>

          <section
            className="eventPanel"
            aria-label="Live Proposal Validation Integration"
          >
            <div className="panelHeader">
              <h2>Live Proposal Validation Integration</h2>
              <span className="muted">Summary only / no execution</span>
            </div>
            <p className="fieldHelp">
              Summarizes how a future live DeepSeek proposal result must pass
              repair and schema validation. The App Shell does not call
              DeepSeek, apply patches, rollback, or write events.
            </p>

            <div className="buttonRow">
              <button type="button" className="secondary" disabled>
                Validate Live Proposal Result (disabled)
              </button>
            </div>

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{liveProposalValidationIntegrationView.status}</dd>
              </div>
              <div>
                <dt>Gates</dt>
                <dd>
                  {liveProposalValidationIntegrationView.passedGateCount} passed
                  / {liveProposalValidationIntegrationView.warningGateCount}{" "}
                  warning /{" "}
                  {liveProposalValidationIntegrationView.blockedGateCount}{" "}
                  blocked
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {liveProposalValidationIntegrationView.blockerCount} /{" "}
                  {liveProposalValidationIntegrationView.warningCount}
                </dd>
              </div>
              <div>
                <dt>Reasoning dropped</dt>
                <dd>
                  {liveProposalValidationIntegrationView.droppedReasoningContent
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Usage summary</dt>
                <dd>
                  {liveProposalValidationIntegrationView.usageSummary ===
                  undefined
                    ? "not available"
                    : `${liveProposalValidationIntegrationView.usageSummary.totalTokens ?? 0} token(s)`}
                </dd>
              </div>
              <div>
                <dt>Can enter preview</dt>
                <dd>
                  {liveProposalValidationIntegrationView.readiness
                    .canEnterPatchProposalPreview
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can apply / write events</dt>
                <dd>
                  {liveProposalValidationIntegrationView.readiness.canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {liveProposalValidationIntegrationView.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {liveProposalValidationIntegrationView.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {liveProposalValidationIntegrationView.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {liveProposalValidationIntegrationView.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Model Patch Proposal Import"
          >
            <div className="panelHeader">
              <h2>Model Patch Proposal Import</h2>
              <span className="muted">Preview only / no model call</span>
            </div>
            <p className="fieldHelp">
              Paste a structured model_patch_proposal draft to import it into
              the preview chain. The App Shell does not call DeepSeek, write
              files, apply patches, rollback, or write events.
            </p>

            <label>
              <span>Model proposal draft</span>
              <textarea
                className="compactTextarea"
                value={modelPatchProposalDraftText}
                onChange={(event) => {
                  setModelPatchProposalDraftText(event.target.value);
                }}
                placeholder="Paste model_patch_proposal JSON draft"
                spellCheck={false}
              />
              <p className="fieldHelp">
                contentDraft is summarized only as warning codes, counts, and
                hashes from the runtime schema validator. Raw source, raw diff,
                prompts, DOM, CSV, and secrets are not displayed.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewModelPatchProposal();
                }}
              >
                Preview Model Proposal
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearModelPatchProposal();
                }}
              >
                Clear Model Proposal
              </button>
            </div>

            {displayedModelPatchProposalImport.status === "empty" ? (
              <p className="empty">
                No model proposal draft imported yet. Paste a structured JSON
                draft to preview summary-only proposal counts.
              </p>
            ) : null}

            {displayedModelPatchProposalImport.status === "blocked" ? (
              <div className="errorBox">
                <strong>Model proposal import blocked</strong>
                <p>{displayedModelPatchProposalImport.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedModelPatchProposalImport.status}</dd>
              </div>
              <div>
                <dt>Import</dt>
                <dd>{displayedModelPatchProposalImport.importId}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>
                  {displayedModelPatchProposalImport.preview?.proposalId ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Title</dt>
                <dd>
                  {displayedModelPatchProposalImport.preview?.title ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Intent</dt>
                <dd>
                  {displayedModelPatchProposalImport.preview?.intent ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Operations / files</dt>
                <dd>
                  {displayedModelPatchProposalImport.preview?.operationCount ??
                    0}{" "}
                  / {displayedModelPatchProposalImport.preview?.fileCount ?? 0}
                </dd>
              </div>
              <div>
                <dt>Evidence / risk</dt>
                <dd>
                  {displayedModelPatchProposalImport.preview
                    ?.evidenceRefCount ?? 0}{" "}
                  /{" "}
                  {displayedModelPatchProposalImport.preview?.riskNoteCount ??
                    0}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedModelPatchProposalImport.blockerCount} /{" "}
                  {displayedModelPatchProposalImport.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedModelPatchProposalImport.preview?.proposalHash ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Can import</dt>
                <dd>
                  {displayedModelPatchProposalImport.readiness
                    .canImportToPatchPreview
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedModelPatchProposalImport.preview?.pathSummaries.length ? (
              <ol className="timeline">
                {displayedModelPatchProposalImport.preview.pathSummaries.map(
                  (pathSummary) => (
                    <li key={pathSummary}>
                      <span className="timelineMeta">path summary</span>
                      <span>{pathSummary}</span>
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedModelPatchProposalImport.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedModelPatchProposalImport.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeModelPatchProposalImportView(
                  displayedModelPatchProposalImport
                ).nextAction
              }
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Model Proposal Chain Integration"
          >
            <div className="panelHeader">
              <h2>Model Proposal Chain Integration</h2>
              <span className="muted">Preview chain / no execution</span>
            </div>
            <p className="fieldHelp">
              Projects an imported model_patch_proposal into the existing
              validation, audit, approval, rollback, and user-workspace
              readiness chain. No model call, file write, apply, rollback,
              approval execution, or event write is performed.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewModelProposalChain();
                }}
              >
                Preview Model Proposal Chain
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearModelProposalChain();
                }}
              >
                Clear Chain Preview
              </button>
            </div>

            {displayedModelProposalChainIntegration.status === "empty" ? (
              <p className="empty">
                No model proposal chain preview yet. Import a model proposal
                draft first, then preview the summary-only chain.
              </p>
            ) : null}

            {displayedModelProposalChainIntegration.status === "blocked" ? (
              <div className="errorBox">
                <strong>Model proposal chain blocked</strong>
                <p>{displayedModelProposalChainIntegration.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedModelProposalChainIntegration.status}</dd>
              </div>
              <div>
                <dt>Chain</dt>
                <dd>{displayedModelProposalChainIntegration.chainId}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>
                  {displayedModelProposalChainIntegration.proposalId ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Stages</dt>
                <dd>
                  {displayedModelProposalChainIntegration.completedStageCount} /{" "}
                  {displayedModelProposalChainIntegration.stageCount}
                </dd>
              </div>
              <div>
                <dt>Missing stages</dt>
                <dd>
                  {displayedModelProposalChainIntegration.missingStageCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedModelProposalChainIntegration.blockerCount} /{" "}
                  {displayedModelProposalChainIntegration.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedModelProposalChainIntegration.chainHash}</dd>
              </div>
              <div>
                <dt>Can enter chain</dt>
                <dd>
                  {displayedModelProposalChainIntegration.readiness
                    .canEnterExistingPreviewChain
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedModelProposalChainIntegration.stages.length > 0 ? (
              <ol className="timeline">
                {displayedModelProposalChainIntegration.stages.map((stage) => (
                  <li key={stage.stageId}>
                    <span className="timelineMeta">
                      {stage.kind} · {stage.status}
                    </span>
                    <span>{stage.summary}</span>
                    {stage.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {stage.warningCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedModelProposalChainIntegration.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedModelProposalChainIntegration.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeModelProposalChainIntegrationView(
                  displayedModelProposalChainIntegration
                ).nextAction
              }
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Live Proposal Opt-in Gate"
          >
            <div className="panelHeader">
              <h2>Live Proposal Opt-in Gate</h2>
              <span className="muted">Policy only / no API key read</span>
            </div>
            <p className="fieldHelp">
              Defines the future opt-in boundary for live DeepSeek proposal
              generation. The App Shell does not read API keys, call DeepSeek,
              fetch network, apply patches, rollback, or write events.
            </p>

            <div className="inlineFields">
              <label>
                <span>Provider</span>
                <input value="deepseek" readOnly />
              </label>
              <label>
                <span>Model profile</span>
                <input
                  value={liveProposalModelProfileId}
                  onChange={(event) => {
                    setLiveProposalModelProfileId(event.target.value);
                    setLiveProposalOptInGatePreview(undefined);
                    setLiveProposalRequestBuilderPreview(undefined);
                    setAppLiveProposalSessionReceiptPreview(undefined);
                    setLiveProposalPreviewGatePreview(undefined);
                    setLiveProposalTelemetryAuditPreview(undefined);
                  }}
                  placeholder="deepseek-chat"
                />
              </label>
            </div>

            <label>
              <span>Key source ref</span>
              <input
                value={liveProposalKeySourceRef}
                onChange={(event) => {
                  setLiveProposalKeySourceRef(event.target.value);
                  setLiveProposalOptInGatePreview(undefined);
                  setLiveProposalRequestBuilderPreview(undefined);
                  setAppLiveProposalSessionReceiptPreview(undefined);
                  setLiveProposalPreviewGatePreview(undefined);
                  setLiveProposalTelemetryAuditPreview(undefined);
                }}
                placeholder="DEEPSEEK_API_KEY ref only, no value"
              />
              <p className="fieldHelp">
                This field accepts a reference name only. It is not an API key
                value field, does not read environment values, and does not call
                a vault.
              </p>
            </label>

            <label>
              <span>Opt-in mode</span>
              <select
                value={liveProposalOptInMode}
                onChange={(event) => {
                  setLiveProposalOptInMode(
                    event.target.value as LiveProposalOptInGateView["optInMode"]
                  );
                  setLiveProposalOptInGatePreview(undefined);
                  setLiveProposalRequestBuilderPreview(undefined);
                  setAppLiveProposalSessionReceiptPreview(undefined);
                  setLiveProposalPreviewGatePreview(undefined);
                  setLiveProposalTelemetryAuditPreview(undefined);
                }}
              >
                <option value="disabled">disabled</option>
                <option value="dry_config_check">dry config check</option>
                <option value="explicit_live_proposal_opt_in">
                  explicit opt-in
                </option>
              </select>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewLiveProposalOptInGate();
                }}
              >
                Preview Opt-in Policy
              </button>
              <button type="button" className="secondary" disabled>
                Call DeepSeek (disabled)
              </button>
            </div>

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedLiveProposalOptInGate.status}</dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>{displayedLiveProposalOptInGate.policyId}</dd>
              </div>
              <div>
                <dt>Provider / model</dt>
                <dd>
                  {displayedLiveProposalOptInGate.providerId} /{" "}
                  {displayedLiveProposalOptInGate.modelProfileId}
                </dd>
              </div>
              <div>
                <dt>Key source</dt>
                <dd>{displayedLiveProposalOptInGate.keySourceType}</dd>
              </div>
              <div>
                <dt>Ref hash</dt>
                <dd>{displayedLiveProposalOptInGate.keySourceRefHash}</dd>
              </div>
              <div>
                <dt>Opt-in</dt>
                <dd>
                  {displayedLiveProposalOptInGate.optInMode} /{" "}
                  {displayedLiveProposalOptInGate.optInScope}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedLiveProposalOptInGate.blockerCount} /{" "}
                  {displayedLiveProposalOptInGate.warningCount}
                </dd>
              </div>
              <div>
                <dt>Can build request later</dt>
                <dd>
                  {displayedLiveProposalOptInGate.readiness
                    .canProceedToLiveRequestBuilder
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can read key / call model</dt>
                <dd>
                  {displayedLiveProposalOptInGate.readiness.canReadApiKey
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalOptInGate.readiness.canCallLiveModel
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Network / events</dt>
                <dd>
                  {displayedLiveProposalOptInGate.readiness.canFetchNetwork
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalOptInGate.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedLiveProposalOptInGate.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedLiveProposalOptInGate.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {displayedLiveProposalOptInGate.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Live Proposal Session Receipt"
          >
            <div className="panelHeader">
              <h2>Live Proposal Session Receipt</h2>
              <span className="muted">
                Explicit confirmation / no model call
              </span>
            </div>
            <p className="fieldHelp">
              Builds a summary-only session receipt for one future live DeepSeek
              proposal request. The App Shell does not call DeepSeek, read API
              keys, fetch network, apply patches, rollback, invoke Tauri, or
              write events.
            </p>

            <label>
              <span>Typed confirmation</span>
              <input
                value={appLiveProposalSessionTypedConfirmation}
                onChange={(event) => {
                  setAppLiveProposalSessionTypedConfirmation(
                    event.target.value
                  );
                  setAppLiveProposalSessionReceiptPreview(undefined);
                  setLiveProposalPreviewGatePreview(undefined);
                  setLiveProposalTelemetryAuditPreview(undefined);
                }}
                placeholder="CALL DEEPSEEK FOR PROPOSAL"
              />
              <p className="fieldHelp">
                This confirms proposal generation only. It is not an apply
                approval, rollback approval, PermissionLease, key value field,
                or live model call.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewAppLiveProposalSessionReceipt();
                }}
              >
                Preview Session Receipt
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearAppLiveProposalSessionReceipt();
                }}
              >
                Clear Session Receipt
              </button>
              <button type="button" className="secondary" disabled>
                Call DeepSeek (disabled)
              </button>
            </div>

            {displayedAppLiveProposalSessionReceipt.status === "empty" ? (
              <p className="empty">
                No session receipt preview yet. Type the exact confirmation to
                inspect receipt readiness.
              </p>
            ) : null}

            {displayedAppLiveProposalSessionReceipt.status === "blocked" ? (
              <div className="errorBox">
                <strong>Session receipt blocked</strong>
                <p>{displayedAppLiveProposalSessionReceipt.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedAppLiveProposalSessionReceipt.status}</dd>
              </div>
              <div>
                <dt>Receipt</dt>
                <dd>{displayedAppLiveProposalSessionReceipt.receiptId}</dd>
              </div>
              <div>
                <dt>Provider / model</dt>
                <dd>
                  {displayedAppLiveProposalSessionReceipt.providerId} /{" "}
                  {displayedAppLiveProposalSessionReceipt.modelProfileId}
                </dd>
              </div>
              <div>
                <dt>Objective hash</dt>
                <dd>
                  {
                    displayedAppLiveProposalSessionReceipt.objectiveSummaryHashPrefix
                  }
                </dd>
              </div>
              <div>
                <dt>Path / context refs</dt>
                <dd>
                  {displayedAppLiveProposalSessionReceipt.allowedPathCount} /{" "}
                  {displayedAppLiveProposalSessionReceipt.contextRefCount}
                </dd>
              </div>
              <div>
                <dt>Confirmation</dt>
                <dd>
                  {displayedAppLiveProposalSessionReceipt.typedConfirmationAccepted
                    ? "accepted"
                    : "not accepted"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedAppLiveProposalSessionReceipt.blockerCount} /{" "}
                  {displayedAppLiveProposalSessionReceipt.warningCount}
                </dd>
              </div>
              <div>
                <dt>Receipt hash</dt>
                <dd>
                  {displayedAppLiveProposalSessionReceipt.receiptHashPrefix}
                </dd>
              </div>
              <div>
                <dt>Can enter command later</dt>
                <dd>
                  {displayedAppLiveProposalSessionReceipt.readiness
                    .canProceedToLiveProposalCommand
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Key / model / network</dt>
                <dd>
                  {displayedAppLiveProposalSessionReceipt.readiness
                    .canReadApiKey
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedAppLiveProposalSessionReceipt.readiness
                    .canCallLiveModel
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedAppLiveProposalSessionReceipt.readiness
                    .canFetchNetwork
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Apply / events</dt>
                <dd>
                  {displayedAppLiveProposalSessionReceipt.readiness
                    .canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedAppLiveProposalSessionReceipt.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedAppLiveProposalSessionReceipt.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedAppLiveProposalSessionReceipt.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeAppLiveProposalSessionReceiptView(
                  displayedAppLiveProposalSessionReceipt
                ).nextAction
              }
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Live Proposal Request Builder"
          >
            <div className="panelHeader">
              <h2>Live Proposal Request Builder</h2>
              <span className="muted">Request preview / no network</span>
            </div>
            <p className="fieldHelp">
              Builds a summary-only request boundary for a future live DeepSeek
              proposal call. The App Shell does not read API keys, call
              DeepSeek, fetch network, apply patches, rollback, or write events.
              The App Shell does not send live requests.
            </p>

            <label>
              <span>Objective summary</span>
              <textarea
                className="compactTextarea"
                value={liveProposalRequestObjective}
                onChange={(event) => {
                  setLiveProposalRequestObjective(event.target.value);
                  setLiveProposalRequestBuilderPreview(undefined);
                  setAppLiveProposalSessionReceiptPreview(undefined);
                  setLiveProposalPreviewGatePreview(undefined);
                  setLiveProposalTelemetryAuditPreview(undefined);
                }}
                placeholder="Describe the desired structured patch proposal without raw source or diff"
              />
            </label>

            <label>
              <span>Intent</span>
              <input
                value={liveProposalRequestIntent}
                onChange={(event) => {
                  setLiveProposalRequestIntent(event.target.value);
                  setLiveProposalRequestBuilderPreview(undefined);
                  setAppLiveProposalSessionReceiptPreview(undefined);
                  setLiveProposalPreviewGatePreview(undefined);
                  setLiveProposalTelemetryAuditPreview(undefined);
                }}
                placeholder="Generate a structured model_patch_proposal draft."
              />
            </label>

            <div className="inlineFields">
              <label>
                <span>Model profile</span>
                <input
                  value={liveProposalModelProfileId}
                  onChange={(event) => {
                    setLiveProposalModelProfileId(event.target.value);
                    setLiveProposalOptInGatePreview(undefined);
                    setLiveProposalRequestBuilderPreview(undefined);
                    setAppLiveProposalSessionReceiptPreview(undefined);
                    setLiveProposalPreviewGatePreview(undefined);
                    setLiveProposalTelemetryAuditPreview(undefined);
                  }}
                  placeholder="deepseek-chat"
                />
              </label>
              <label>
                <span>Allowed path refs</span>
                <textarea
                  className="compactTextarea"
                  value={liveProposalRequestAllowedPaths}
                  onChange={(event) => {
                    setLiveProposalRequestAllowedPaths(event.target.value);
                    setLiveProposalRequestBuilderPreview(undefined);
                    setAppLiveProposalSessionReceiptPreview(undefined);
                    setLiveProposalPreviewGatePreview(undefined);
                    setLiveProposalTelemetryAuditPreview(undefined);
                  }}
                  placeholder={"docs/example.md\napp/src/example.ts"}
                />
              </label>
            </div>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewLiveProposalRequest();
                }}
              >
                Preview Live Proposal Request
              </button>
              <button type="button" className="secondary" disabled>
                Send Live Proposal Request (disabled)
              </button>
            </div>

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedLiveProposalRequestBuilder.status}</dd>
              </div>
              <div>
                <dt>Request</dt>
                <dd>{displayedLiveProposalRequestBuilder.requestId}</dd>
              </div>
              <div>
                <dt>Model profile</dt>
                <dd>{displayedLiveProposalRequestBuilder.modelProfileId}</dd>
              </div>
              <div>
                <dt>Summary / execution</dt>
                <dd>
                  {displayedLiveProposalRequestBuilder.summaryOnly
                    ? "summary-only"
                    : "not-summary-only"}{" "}
                  /{" "}
                  {displayedLiveProposalRequestBuilder.noExecution
                    ? "no execution"
                    : "execution"}
                </dd>
              </div>
              <div>
                <dt>Tool choice</dt>
                <dd>
                  {displayedLiveProposalRequestBuilder.toolChoiceOmitted
                    ? "omitted"
                    : "present"}
                </dd>
              </div>
              <div>
                <dt>Key ref hash</dt>
                <dd>{displayedLiveProposalRequestBuilder.keySourceRefHash}</dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedLiveProposalRequestBuilder.blockerCount} /{" "}
                  {displayedLiveProposalRequestBuilder.warningCount}
                </dd>
              </div>
              <div>
                <dt>Can continue later</dt>
                <dd>
                  {displayedLiveProposalRequestBuilder.readiness
                    .canProceedToLiveAdapter
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can read key / fetch</dt>
                <dd>
                  {displayedLiveProposalRequestBuilder.readiness.canReadApiKey
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalRequestBuilder.readiness.canFetchNetwork
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Request hash</dt>
                <dd>
                  {displayedLiveProposalRequestBuilder.requestHashPrefix ??
                    "n/a"}
                </dd>
              </div>
            </dl>

            {displayedLiveProposalRequestBuilder.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedLiveProposalRequestBuilder.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {displayedLiveProposalRequestBuilder.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Live DeepSeek Proposal Generation"
          >
            <div className="panelHeader">
              <h2>Live DeepSeek Proposal Generation</h2>
              <span className="muted">Explicit opt-in / no auto-apply</span>
            </div>
            <p className="fieldHelp">
              Calls the fixed runtime-only Tauri command only after the policy,
              request, receipt, typed confirmation, and allowed path gates are
              satisfied. Returned proposal candidates enter repair, schema
              validation, model import, and chain previews only; the App Shell
              does not apply patches, rollback, approve, or write apply/rollback
              events. Raw prompt, raw response, reasoning_content, and API key
              values are not displayed or written to events.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled={
                  !liveDeepSeekProposalGenerationView.readiness
                    .canGenerateLiveProposal
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleGenerateLiveProposal();
                }}
              >
                Generate Live Proposal
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearLiveProposalGeneration();
                }}
              >
                Clear Live Proposal Result
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!canRecordLiveProposalSummaryEvent}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleRecordLiveProposalSummaryEvent();
                }}
              >
                {liveProposalSummaryEventStatus === "recording"
                  ? "Recording Summary Event..."
                  : "Record Live Proposal Summary Event"}
              </button>
            </div>

            {liveDeepSeekProposalGenerationView.status === "blocked" ? (
              <div className="errorBox">
                <strong>Live proposal generation blocked</strong>
                <p>{liveDeepSeekProposalGenerationView.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{liveDeepSeekProposalGenerationView.status}</dd>
              </div>
              <div>
                <dt>Request</dt>
                <dd>{liveDeepSeekProposalGenerationView.requestId}</dd>
              </div>
              <div>
                <dt>Response</dt>
                <dd>{liveDeepSeekProposalGenerationView.responseId}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>{liveDeepSeekProposalGenerationView.proposalId}</dd>
              </div>
              <div>
                <dt>Repair</dt>
                <dd>{liveDeepSeekProposalGenerationView.repairStatus}</dd>
              </div>
              <div>
                <dt>Schema validation</dt>
                <dd>
                  {liveDeepSeekProposalGenerationView.schemaValidationStatus}
                </dd>
              </div>
              <div>
                <dt>Import / chain</dt>
                <dd>
                  {liveDeepSeekProposalGenerationView.importStatus} /{" "}
                  {liveDeepSeekProposalGenerationView.chainStatus}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {liveDeepSeekProposalGenerationView.blockerCount} /{" "}
                  {liveDeepSeekProposalGenerationView.warningCount}
                </dd>
              </div>
              <div>
                <dt>Usage tokens</dt>
                <dd>
                  {liveDeepSeekProposalGenerationView.usageSummary
                    ?.promptTokens ?? 0}{" "}
                  /{" "}
                  {liveDeepSeekProposalGenerationView.usageSummary
                    ?.completionTokens ?? 0}{" "}
                  /{" "}
                  {liveDeepSeekProposalGenerationView.usageSummary
                    ?.totalTokens ?? 0}
                </dd>
              </div>
              <div>
                <dt>Dropped reasoning</dt>
                <dd>
                  {liveDeepSeekProposalGenerationView.droppedReasoningContent
                    ? "yes"
                    : "no"}{" "}
                  (
                  {liveDeepSeekProposalGenerationView.reasoningContentCharCount}
                  )
                </dd>
              </div>
              <div>
                <dt>Can generate</dt>
                <dd>
                  {liveDeepSeekProposalGenerationView.readiness
                    .canGenerateLiveProposal
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can apply / events</dt>
                <dd>
                  {liveDeepSeekProposalGenerationView.readiness.canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {liveDeepSeekProposalGenerationView.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Flow hash</dt>
                <dd>
                  {liveDeepSeekProposalGenerationView.generationHash.substring(
                    0,
                    12
                  )}
                </dd>
              </div>
              <div>
                <dt>Summary event</dt>
                <dd>{liveProposalSummaryEventStatus}</dd>
              </div>
              <div>
                <dt>Event id</dt>
                <dd>{liveProposalSummaryEventResult?.eventId ?? "n/a"}</dd>
              </div>
            </dl>

            {liveProposalSummaryEventError !== undefined ? (
              <div className="errorBox">
                <strong>Live proposal summary event blocked</strong>
                <p>{liveProposalSummaryEventError}</p>
              </div>
            ) : null}

            {liveProposalSummaryEventResult !== undefined ? (
              <p className="muted">
                {liveProposalSummaryEventResult.safeMessage} ·{" "}
                {liveProposalSummaryEventResult.proposalId}
              </p>
            ) : null}

            {liveDeepSeekProposalGenerationView.warningCodes.length > 0 ? (
              <p className="muted">
                warnings{" "}
                {liveDeepSeekProposalGenerationView.warningCodes.join(", ")}
              </p>
            ) : null}

            {liveDeepSeekProposalGenerationView.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {liveDeepSeekProposalGenerationView.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {liveDeepSeekProposalGenerationView.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="App Live Proposal Preview Gate"
          >
            <div className="panelHeader">
              <h2>App Live Proposal Preview Gate</h2>
              <span className="muted">
                Disabled by default / no App live call
              </span>
            </div>
            <p className="fieldHelp">
              Summarizes the future live DeepSeek proposal boundary. The App
              Shell cannot read API keys, call DeepSeek, fetch network, apply
              patches, rollback, approve, issue leases, or write events.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewLiveProposalGate();
                }}
              >
                Preview Live Proposal Gate
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearLiveProposalGate();
                }}
              >
                Clear Live Proposal Gate
              </button>
              <button type="button" className="secondary" disabled>
                Call DeepSeek (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Send Live Proposal Request (disabled)
              </button>
            </div>

            {displayedLiveProposalPreviewGate.status === "empty" ? (
              <p className="empty">
                No App live proposal gate preview yet. Preview the gate to
                inspect summary-only stage readiness.
              </p>
            ) : null}

            {displayedLiveProposalPreviewGate.status === "blocked" ? (
              <div className="errorBox">
                <strong>Live proposal gate blocked</strong>
                <p>{displayedLiveProposalPreviewGate.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedLiveProposalPreviewGate.status}</dd>
              </div>
              <div>
                <dt>Gate</dt>
                <dd>{displayedLiveProposalPreviewGate.gateId}</dd>
              </div>
              <div>
                <dt>Stages</dt>
                <dd>
                  {displayedLiveProposalPreviewGate.satisfiedStageCount} /{" "}
                  {displayedLiveProposalPreviewGate.stageCount}
                </dd>
              </div>
              <div>
                <dt>Warnings / blocked</dt>
                <dd>
                  {displayedLiveProposalPreviewGate.warningStageCount} /{" "}
                  {displayedLiveProposalPreviewGate.blockedStageCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedLiveProposalPreviewGate.blockerCount} /{" "}
                  {displayedLiveProposalPreviewGate.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedLiveProposalPreviewGate.gateHashPrefix}</dd>
              </div>
              <div>
                <dt>Can preview gate</dt>
                <dd>
                  {displayedLiveProposalPreviewGate.readiness.canPreviewGate
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>App live call / key read</dt>
                <dd>
                  {displayedLiveProposalPreviewGate.readiness
                    .canCallDeepSeekFromApp
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalPreviewGate.readiness
                    .canReadApiKeyFromApp
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Fetch / send request</dt>
                <dd>
                  {displayedLiveProposalPreviewGate.readiness
                    .canFetchNetworkFromApp
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalPreviewGate.readiness.canSendLiveRequest
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback</dt>
                <dd>
                  {displayedLiveProposalPreviewGate.readiness.canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalPreviewGate.readiness.canRollback
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedLiveProposalPreviewGate.stages.length > 0 ? (
              <ol className="timeline">
                {displayedLiveProposalPreviewGate.stages.map((stage) => (
                  <li key={stage.stageId}>
                    <span className="timelineMeta">
                      {stage.kind} · {stage.status}
                    </span>
                    <span>{stage.summary}</span>
                    {stage.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {stage.warningCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedLiveProposalPreviewGate.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedLiveProposalPreviewGate.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeLiveProposalPreviewGateView(
                  displayedLiveProposalPreviewGate
                ).nextAction
              }{" "}
              No key value or raw response text is accepted.
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Live Proposal Telemetry / Redaction Audit"
          >
            <div className="panelHeader">
              <h2>Live Proposal Telemetry / Redaction Audit</h2>
              <span className="muted">Summary only / no raw prompt</span>
            </div>
            <p className="fieldHelp">
              Audits future live proposal telemetry boundaries. The App Shell
              does not persist raw prompts, raw responses, reasoning_content,
              API keys, or model calls.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewLiveProposalTelemetryAudit();
                }}
              >
                Preview Telemetry Audit
              </button>
              <button type="button" className="secondary" disabled>
                Write Telemetry (disabled)
              </button>
            </div>

            {displayedLiveProposalTelemetryAudit.status === "empty" ? (
              <p className="empty">
                No telemetry audit preview yet. Preview the audit to inspect
                summary-only redaction readiness.
              </p>
            ) : null}

            {displayedLiveProposalTelemetryAudit.status === "blocked" ? (
              <div className="errorBox">
                <strong>Telemetry audit blocked</strong>
                <p>{displayedLiveProposalTelemetryAudit.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedLiveProposalTelemetryAudit.status}</dd>
              </div>
              <div>
                <dt>Audit</dt>
                <dd>{displayedLiveProposalTelemetryAudit.auditId}</dd>
              </div>
              <div>
                <dt>Records</dt>
                <dd>{displayedLiveProposalTelemetryAudit.recordCount}</dd>
              </div>
              <div>
                <dt>Warning / blocked records</dt>
                <dd>
                  {displayedLiveProposalTelemetryAudit.warningRecordCount} /{" "}
                  {displayedLiveProposalTelemetryAudit.blockedRecordCount}
                </dd>
              </div>
              <div>
                <dt>Redacted / raw fields</dt>
                <dd>
                  {displayedLiveProposalTelemetryAudit.redactedFieldCount} /{" "}
                  {displayedLiveProposalTelemetryAudit.rawFieldDetectedCount}
                </dd>
              </div>
              <div>
                <dt>Key / prompt leak</dt>
                <dd>
                  {displayedLiveProposalTelemetryAudit.apiKeyLeakDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalTelemetryAudit.rawPromptDetected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Response / reasoning persisted</dt>
                <dd>
                  {displayedLiveProposalTelemetryAudit.rawResponseDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalTelemetryAudit.reasoningContentPersisted
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Usage tokens</dt>
                <dd>
                  {displayedLiveProposalTelemetryAudit.usageSummary ===
                  undefined
                    ? "n/a"
                    : `${displayedLiveProposalTelemetryAudit.usageSummary.totalTokens ?? 0} token(s)`}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedLiveProposalTelemetryAudit.auditHashPrefix}</dd>
              </div>
              <div>
                <dt>Telemetry event / model call</dt>
                <dd>
                  {displayedLiveProposalTelemetryAudit.readiness
                    .canWriteTelemetryEvent
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalTelemetryAudit.readiness
                    .canCallLiveModel
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Persist prompt / response</dt>
                <dd>
                  {displayedLiveProposalTelemetryAudit.readiness
                    .canPersistRawPrompt
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalTelemetryAudit.readiness
                    .canPersistRawResponse
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback</dt>
                <dd>
                  {displayedLiveProposalTelemetryAudit.readiness.canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalTelemetryAudit.readiness.canRollback
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedLiveProposalTelemetryAudit.records.length > 0 ? (
              <ol className="timeline">
                {displayedLiveProposalTelemetryAudit.records.map((record) => (
                  <li key={`${record.kind}-${record.status}`}>
                    <span className="timelineMeta">
                      {record.kind} · {record.status}
                    </span>
                    <span>{record.summary}</span>
                    {record.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {record.warningCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedLiveProposalTelemetryAudit.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedLiveProposalTelemetryAudit.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeLiveProposalTelemetryAuditView(
                  displayedLiveProposalTelemetryAudit
                ).source
              }{" "}
              · {displayedLiveProposalTelemetryAudit.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Live Proposal Evaluation Summary"
          >
            <div className="panelHeader">
              <h2>Live Proposal Evaluation Summary</h2>
              <span className="muted">Read-only / no live call</span>
            </div>
            <p className="fieldHelp">
              Displays summary-only evaluation metrics for live proposal golden
              cases. The App Shell does not run evaluation, call DeepSeek, read
              API keys, fetch network, apply patches, rollback, or write events.
            </p>

            <label>
              <span>Summary-only metrics JSON</span>
              <textarea
                className="compactTextarea"
                value={liveProposalEvaluationSummaryText}
                onChange={(event) => {
                  setLiveProposalEvaluationSummaryText(event.target.value);
                }}
                placeholder="Paste summary-only evaluation metrics JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Accepts evaluation counts, rates, taxonomy categories, usage
                numbers, and hashes only. Raw prompts, raw responses,
                reasoning_content, source text, diffs, and keys are rejected.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewLiveProposalEvaluationSummary();
                }}
              >
                Preview Evaluation Summary
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearLiveProposalEvaluationSummary();
                }}
              >
                Clear Evaluation Summary
              </button>
              <button type="button" className="secondary" disabled>
                Run Evaluation (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Call DeepSeek for Evaluation (disabled)
              </button>
            </div>

            {displayedLiveProposalEvaluationSummary.status === "empty" ? (
              <p className="empty">
                No evaluation summary loaded. Paste summary-only metrics to
                inspect read-only evaluation health.
              </p>
            ) : null}

            {displayedLiveProposalEvaluationSummary.status === "blocked" ? (
              <div className="errorBox">
                <strong>Evaluation summary blocked</strong>
                <p>{displayedLiveProposalEvaluationSummary.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedLiveProposalEvaluationSummary.status}</dd>
              </div>
              <div>
                <dt>Summary</dt>
                <dd>{displayedLiveProposalEvaluationSummary.summaryId}</dd>
              </div>
              <div>
                <dt>Reports / cases</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.reportCount} /{" "}
                  {displayedLiveProposalEvaluationSummary.caseCount}
                </dd>
              </div>
              <div>
                <dt>Offline / live cases</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.offlineCaseCount} /{" "}
                  {displayedLiveProposalEvaluationSummary.liveCaseCount}
                </dd>
              </div>
              <div>
                <dt>Pass / warn / block</dt>
                <dd>
                  {
                    displayedLiveProposalEvaluationSummary.passWarnBlockSummary
                      .passedCount
                  }{" "}
                  /{" "}
                  {
                    displayedLiveProposalEvaluationSummary.passWarnBlockSummary
                      .warningCount
                  }{" "}
                  /{" "}
                  {
                    displayedLiveProposalEvaluationSummary.passWarnBlockSummary
                      .blockedCount
                  }
                </dd>
              </div>
              <div>
                <dt>Failed expectations</dt>
                <dd>
                  {
                    displayedLiveProposalEvaluationSummary.passWarnBlockSummary
                      .failedExpectationCount
                  }
                </dd>
              </div>
              <div>
                <dt>Schema / repair rate</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.schemaPassRate ??
                    "n/a"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationSummary.repairSuccessRate ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Taxonomy categories</dt>
                <dd>
                  {
                    displayedLiveProposalEvaluationSummary.taxonomySummary
                      .totalFailureCategoryCount
                  }
                </dd>
              </div>
              <div>
                <dt>Dominant taxonomy</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.taxonomySummary
                    .dominantCategories.length > 0
                    ? displayedLiveProposalEvaluationSummary.taxonomySummary.dominantCategories.join(
                        ", "
                      )
                    : "none"}
                </dd>
              </div>
              <div>
                <dt>Usage tokens</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.usageSummary ===
                  undefined
                    ? "n/a"
                    : `${displayedLiveProposalEvaluationSummary.usageSummary.totalTokens ?? 0} token(s)`}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.blockerCount} /{" "}
                  {displayedLiveProposalEvaluationSummary.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.hashPrefix ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Display / run evaluation</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.readiness
                    .canDisplaySummary
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationSummary.readiness
                    .canRunEvaluation
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Model call / key read</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.readiness
                    .canCallLiveModel
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationSummary.readiness
                    .canReadApiKey
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Fetch / event write</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.readiness
                    .canFetchNetwork
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationSummary.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback</dt>
                <dd>
                  {displayedLiveProposalEvaluationSummary.readiness
                    .canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationSummary.readiness.canRollback
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedLiveProposalEvaluationSummary.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedLiveProposalEvaluationSummary.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeLiveProposalEvaluationSummaryView(
                  displayedLiveProposalEvaluationSummary
                ).source
              }{" "}
              · {displayedLiveProposalEvaluationSummary.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Live Proposal Evaluation Telemetry Audit"
          >
            <div className="panelHeader">
              <h2>Live Proposal Evaluation Telemetry Audit</h2>
              <span className="muted">Read-only / no raw output</span>
            </div>
            <p className="fieldHelp">
              Audits evaluation telemetry summaries for raw prompt, raw
              response, reasoning_content, API key, and execution leaks. The App
              Shell does not run evaluation, call DeepSeek, fetch network, apply
              patches, rollback, or write events.
            </p>

            <label>
              <span>Summary-only telemetry audit JSON</span>
              <textarea
                className="compactTextarea"
                value={liveProposalEvaluationTelemetryAuditText}
                onChange={(event) => {
                  setLiveProposalEvaluationTelemetryAuditText(
                    event.target.value
                  );
                }}
                placeholder="Paste summary-only evaluation telemetry audit JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Accepts summary artifact JSON or a summary-only audit report.
                Raw prompts, raw responses, reasoning_content, source text,
                diffs, and keys are rejected before display.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewLiveProposalEvaluationTelemetryAudit();
                }}
              >
                Preview Evaluation Telemetry Audit
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearLiveProposalEvaluationTelemetryAudit();
                }}
              >
                Clear Telemetry Audit
              </button>
              <button type="button" className="secondary" disabled>
                Run Telemetry Audit (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Write Telemetry Event (disabled)
              </button>
            </div>

            {displayedLiveProposalEvaluationTelemetryAudit.status ===
            "empty" ? (
              <p className="empty">
                No evaluation telemetry audit loaded. Preview the audit to
                inspect summary-only redaction status.
              </p>
            ) : null}

            {displayedLiveProposalEvaluationTelemetryAudit.status ===
            "blocked" ? (
              <div className="errorBox">
                <strong>Evaluation telemetry audit blocked</strong>
                <p>
                  {displayedLiveProposalEvaluationTelemetryAudit.nextAction}
                </p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedLiveProposalEvaluationTelemetryAudit.status}</dd>
              </div>
              <div>
                <dt>Audit</dt>
                <dd>{displayedLiveProposalEvaluationTelemetryAudit.auditId}</dd>
              </div>
              <div>
                <dt>Records</dt>
                <dd>
                  {displayedLiveProposalEvaluationTelemetryAudit.recordCount}
                </dd>
              </div>
              <div>
                <dt>Offline / live reports</dt>
                <dd>
                  {
                    displayedLiveProposalEvaluationTelemetryAudit.offlineReportCount
                  }{" "}
                  /{" "}
                  {
                    displayedLiveProposalEvaluationTelemetryAudit.liveReportCount
                  }
                </dd>
              </div>
              <div>
                <dt>Metrics / App summaries</dt>
                <dd>
                  {
                    displayedLiveProposalEvaluationTelemetryAudit.metricsReportCount
                  }{" "}
                  /{" "}
                  {
                    displayedLiveProposalEvaluationTelemetryAudit.appSummaryCount
                  }
                </dd>
              </div>
              <div>
                <dt>Raw / redacted fields</dt>
                <dd>
                  {
                    displayedLiveProposalEvaluationTelemetryAudit.rawFieldDetectedCount
                  }{" "}
                  /{" "}
                  {
                    displayedLiveProposalEvaluationTelemetryAudit.redactedFieldCount
                  }
                </dd>
              </div>
              <div>
                <dt>Key / prompt leak</dt>
                <dd>
                  {displayedLiveProposalEvaluationTelemetryAudit.apiKeyLeakDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationTelemetryAudit.rawPromptDetected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Response / reasoning persisted</dt>
                <dd>
                  {displayedLiveProposalEvaluationTelemetryAudit.rawResponseDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationTelemetryAudit.reasoningContentPersisted
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Usage tokens</dt>
                <dd>
                  {displayedLiveProposalEvaluationTelemetryAudit.usageSummary ===
                  undefined
                    ? "n/a"
                    : `${displayedLiveProposalEvaluationTelemetryAudit.usageSummary.totalTokens ?? 0} token(s)`}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedLiveProposalEvaluationTelemetryAudit.blockerCount} /{" "}
                  {displayedLiveProposalEvaluationTelemetryAudit.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {
                    displayedLiveProposalEvaluationTelemetryAudit.auditHashPrefix
                  }
                </dd>
              </div>
              <div>
                <dt>RC summary / telemetry write</dt>
                <dd>
                  {displayedLiveProposalEvaluationTelemetryAudit.readiness
                    .canEnterRcSummary
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationTelemetryAudit.readiness
                    .canWriteTelemetryEvent
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Model call / key read</dt>
                <dd>
                  {displayedLiveProposalEvaluationTelemetryAudit.readiness
                    .canCallLiveModel
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationTelemetryAudit.readiness
                    .canReadApiKey
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Fetch / event write</dt>
                <dd>
                  {displayedLiveProposalEvaluationTelemetryAudit.readiness
                    .canFetchNetwork
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationTelemetryAudit.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback</dt>
                <dd>
                  {displayedLiveProposalEvaluationTelemetryAudit.readiness
                    .canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedLiveProposalEvaluationTelemetryAudit.readiness
                    .canRollback
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedLiveProposalEvaluationTelemetryAudit.records.length >
            0 ? (
              <ol className="timeline">
                {displayedLiveProposalEvaluationTelemetryAudit.records.map(
                  (record) => (
                    <li key={`${record.kind}-${record.source}`}>
                      <span className="timelineMeta">
                        {record.kind} · {record.status}
                      </span>
                      <span>{record.summary}</span>
                      {record.warningCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Warnings: {record.warningCodes.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedLiveProposalEvaluationTelemetryAudit.findings.length >
            0 ? (
              <p className="muted">
                findings{" "}
                {displayedLiveProposalEvaluationTelemetryAudit.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeLiveProposalEvaluationTelemetryAuditView(
                  displayedLiveProposalEvaluationTelemetryAudit
                ).source
              }{" "}
              · {displayedLiveProposalEvaluationTelemetryAudit.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Patch Proposal Creation Preview"
          >
            <div className="panelHeader">
              <h2>Patch Proposal Creation Preview</h2>
              <span className="muted">Preview only / no apply</span>
            </div>
            <p className="fieldHelp">
              Create a local patch proposal summary from safe path refs. No
              files are read or written, and no patch is applied. Raw source and
              raw diff are not displayed.
            </p>

            <label>
              <span>Proposal title</span>
              <input
                value={patchProposalTitleDraft}
                onChange={(event) => {
                  setPatchProposalTitleDraft(event.target.value);
                }}
                placeholder="Update summary-only preview wiring"
              />
            </label>

            <label>
              <span>Change description summary</span>
              <textarea
                className="compactTextarea"
                value={patchProposalDescriptionDraft}
                onChange={(event) => {
                  setPatchProposalDescriptionDraft(event.target.value);
                }}
                placeholder="Describe the intended change without source code or diff text"
              />
            </label>

            <label>
              <span>Safe path refs</span>
              <textarea
                className="compactTextarea"
                value={patchProposalPathRefsDraft}
                onChange={(event) => {
                  setPatchProposalPathRefsDraft(event.target.value);
                }}
                placeholder={"app/src/example.tsx\ndocs/example.md"}
                spellCheck={false}
              />
              <p className="fieldHelp">
                One workspace-relative path per line, or a small summary-only
                JSON array. Raw source, raw diff, and patch body fields are
                rejected.
              </p>
            </label>

            <div className="inlineFields">
              <label>
                <span>Change kind</span>
                <select
                  value={patchProposalChangeKind}
                  onChange={(event) => {
                    setPatchProposalChangeKind(
                      event.target.value as PatchProposalCreationChangeKind
                    );
                  }}
                >
                  <option value="update">update</option>
                  <option value="create">create</option>
                  <option value="delete">delete</option>
                  <option value="documentation">documentation</option>
                  <option value="test">test</option>
                </select>
              </label>
              <label>
                <span>Estimated lines added</span>
                <input
                  type="number"
                  min="0"
                  value={patchProposalLinesAdded}
                  onChange={(event) => {
                    setPatchProposalLinesAdded(event.target.value);
                  }}
                />
              </label>
              <label>
                <span>Estimated lines removed</span>
                <input
                  type="number"
                  min="0"
                  value={patchProposalLinesRemoved}
                  onChange={(event) => {
                    setPatchProposalLinesRemoved(event.target.value);
                  }}
                />
              </label>
            </div>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewPatchProposal();
                }}
              >
                Preview Patch Proposal
              </button>
            </div>

            {displayedPatchProposalCreation.status === "empty" ? (
              <p className="empty">
                No local patch proposal preview yet. Enter safe path refs to
                preview summary-only counts before any apply lane exists.
              </p>
            ) : null}

            {displayedPatchProposalCreation.status === "blocked" ? (
              <div className="errorBox">
                <strong>Patch proposal preview blocked</strong>
                <p>{displayedPatchProposalCreation.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedPatchProposalCreation.status}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>{displayedPatchProposalCreation.proposalId}</dd>
              </div>
              <div>
                <dt>Files</dt>
                <dd>{displayedPatchProposalCreation.fileCount}</dd>
              </div>
              <div>
                <dt>Created / updated / deleted</dt>
                <dd>
                  {displayedPatchProposalCreation.filesCreated} /{" "}
                  {displayedPatchProposalCreation.filesUpdated} /{" "}
                  {displayedPatchProposalCreation.filesDeleted}
                </dd>
              </div>
              <div>
                <dt>Lines + / -</dt>
                <dd>
                  {displayedPatchProposalCreation.linesAdded} /{" "}
                  {displayedPatchProposalCreation.linesRemoved}
                </dd>
              </div>
              <div>
                <dt>Risk</dt>
                <dd>{displayedPatchProposalCreation.riskLevel}</dd>
              </div>
              <div>
                <dt>Requires approval</dt>
                <dd>
                  {displayedPatchProposalCreation.requiresApproval
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedPatchProposalCreation.proposalHash}</dd>
              </div>
            </dl>

            {displayedPatchProposalCreation.items.length > 0 ? (
              <ol className="timeline">
                {displayedPatchProposalCreation.items.map((item) => (
                  <li key={item.itemId}>
                    <span className="timelineMeta">
                      {item.changeKind} · {item.language} ·{" "}
                      {item.requiresApproval
                        ? "approval summary required"
                        : "summary only"}
                    </span>
                    <span>
                      {item.path} · +{item.estimatedLinesAdded} / -
                      {item.estimatedLinesRemoved}
                    </span>
                    {item.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {item.warningCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedPatchProposalCreation.warnings.length > 0 ? (
              <p className="muted">
                warnings{" "}
                {displayedPatchProposalCreation.warnings
                  .map((warning) => warning.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {displayedPatchProposalCreation.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Patch Proposal Validation Preview"
          >
            <div className="panelHeader">
              <h2>Patch Proposal Validation Preview</h2>
              <span className="muted">Validation only / no apply</span>
            </div>
            <p className="fieldHelp">
              Validates the patch proposal summary before audit or approval. No
              files are read or written, and no patch is applied. Validation
              passing does not enable apply.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleValidatePatchProposal();
                }}
                disabled={displayedPatchProposalCreation.status === "empty"}
                aria-disabled={
                  displayedPatchProposalCreation.status === "empty"
                }
              >
                Validate Patch Proposal
              </button>
            </div>

            {displayedPatchProposalValidation.status === "empty" ? (
              <p className="empty">
                Preview a local patch proposal first. Validation findings will
                appear here before diff audit, approval draft, or virtual apply
                preview.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedPatchProposalValidation.status}</dd>
              </div>
              <div>
                <dt>Validation</dt>
                <dd>{displayedPatchProposalValidation.validationId}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>{displayedPatchProposalValidation.proposalId}</dd>
              </div>
              <div>
                <dt>Risk / derived</dt>
                <dd>
                  {displayedPatchProposalValidation.riskLevel} /{" "}
                  {displayedPatchProposalValidation.derivedRiskLevel}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedPatchProposalValidation.blockerCount} /{" "}
                  {displayedPatchProposalValidation.warningCount}
                </dd>
              </div>
              <div>
                <dt>Findings</dt>
                <dd>{displayedPatchProposalValidation.findingCount}</dd>
              </div>
              <div>
                <dt>No-compress</dt>
                <dd>
                  {displayedPatchProposalValidation.noCompressRequired
                    ? displayedPatchProposalValidation.contextPlacement
                    : "not required"}
                </dd>
              </div>
              <div>
                <dt>Can apply</dt>
                <dd>
                  {displayedPatchProposalValidation.readiness.canApplyPatch
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            <dl className="summaryGrid compact">
              <div>
                <dt>Diff/audit preview</dt>
                <dd>
                  {displayedPatchProposalValidation.readiness
                    .canProceedToDiffAuditPreview
                    ? "ready"
                    : "not ready"}
                </dd>
              </div>
              <div>
                <dt>Approval draft</dt>
                <dd>
                  {displayedPatchProposalValidation.readiness
                    .canProceedToApprovalDraftPreview
                    ? "ready"
                    : "not ready"}
                </dd>
              </div>
              <div>
                <dt>Virtual apply</dt>
                <dd>
                  {displayedPatchProposalValidation.readiness
                    .canProceedToVirtualApplyPreview
                    ? "ready"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedPatchProposalValidation.validationHash}</dd>
              </div>
            </dl>

            {displayedPatchProposalValidation.findings.length > 0 ? (
              <ol className="timeline">
                {displayedPatchProposalValidation.findings.map((finding) => (
                  <li key={finding.findingId}>
                    <span className="timelineMeta">
                      {finding.kind} · {finding.severity} · {finding.code}
                    </span>
                    <span>{finding.summary}</span>
                    {finding.path !== undefined ? (
                      <span className="timelineMeta">Path: {finding.path}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            <p className="fieldHelp">
              {displayedPatchProposalValidation.nextAction}
            </p>
          </section>

          <section className="eventPanel" aria-label="Patch Diff Audit Preview">
            <div className="panelHeader">
              <h2>Patch Diff Audit Preview</h2>
              <span className="muted">Audit preview / no raw diff</span>
            </div>
            <p className="fieldHelp">
              Audits the patch proposal summary after validation. No raw diff is
              generated, no files are read, and no patch is applied. Passing
              audit only means ready for approval draft preview.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewDiffAudit();
                }}
                disabled={
                  displayedPatchProposalValidation.status === "empty" ||
                  displayedPatchProposalValidation.status === "blocked"
                }
                aria-disabled={
                  displayedPatchProposalValidation.status === "empty" ||
                  displayedPatchProposalValidation.status === "blocked"
                }
              >
                Preview Diff Audit
              </button>
            </div>

            {displayedPatchDiffAudit.status === "empty" ? (
              <p className="empty">
                Validate a patch proposal summary first. Diff audit findings
                will appear here before approval draft or virtual apply preview.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedPatchDiffAudit.status}</dd>
              </div>
              <div>
                <dt>Audit</dt>
                <dd>{displayedPatchDiffAudit.auditId}</dd>
              </div>
              <div>
                <dt>Proposal / validation</dt>
                <dd>
                  {displayedPatchDiffAudit.proposalId} /{" "}
                  {displayedPatchDiffAudit.validationId}
                </dd>
              </div>
              <div>
                <dt>Risk / derived</dt>
                <dd>
                  {displayedPatchDiffAudit.riskLevel} /{" "}
                  {displayedPatchDiffAudit.derivedRiskLevel}
                </dd>
              </div>
              <div>
                <dt>Files</dt>
                <dd>{displayedPatchDiffAudit.fileCount}</dd>
              </div>
              <div>
                <dt>Created / updated / deleted</dt>
                <dd>
                  {displayedPatchDiffAudit.filesCreated} /{" "}
                  {displayedPatchDiffAudit.filesUpdated} /{" "}
                  {displayedPatchDiffAudit.filesDeleted}
                </dd>
              </div>
              <div>
                <dt>Lines + / -</dt>
                <dd>
                  {displayedPatchDiffAudit.linesAdded} /{" "}
                  {displayedPatchDiffAudit.linesRemoved}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedPatchDiffAudit.blockerCount} /{" "}
                  {displayedPatchDiffAudit.warningCount}
                </dd>
              </div>
              <div>
                <dt>No-compress</dt>
                <dd>
                  {displayedPatchDiffAudit.noCompressRequired
                    ? displayedPatchDiffAudit.contextPlacement
                    : "not required"}
                </dd>
              </div>
              <div>
                <dt>Raw diff generated</dt>
                <dd>{displayedPatchDiffAudit.diffGenerated ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt>Can apply</dt>
                <dd>
                  {displayedPatchDiffAudit.readiness.canApplyPatch
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Approval draft</dt>
                <dd>
                  {displayedPatchDiffAudit.readiness
                    .canProceedToApprovalDraftPreview
                    ? "ready"
                    : "not ready"}
                </dd>
              </div>
            </dl>

            <dl className="summaryGrid compact">
              <div>
                <dt>Docs / tests / source</dt>
                <dd>
                  {displayedPatchDiffAudit.pathCategorySummary.docs} /{" "}
                  {displayedPatchDiffAudit.pathCategorySummary.tests} /{" "}
                  {displayedPatchDiffAudit.pathCategorySummary.source}
                </dd>
              </div>
              <div>
                <dt>Config / deletes / generated</dt>
                <dd>
                  {displayedPatchDiffAudit.pathCategorySummary.config} /{" "}
                  {displayedPatchDiffAudit.pathCategorySummary.deletes} /{" "}
                  {displayedPatchDiffAudit.pathCategorySummary.generated}
                </dd>
              </div>
              <div>
                <dt>Validation findings</dt>
                <dd>
                  {
                    displayedPatchDiffAudit.validationFindingSummary
                      .totalFindingCount
                  }{" "}
                  total
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedPatchDiffAudit.auditHash}</dd>
              </div>
            </dl>

            {displayedPatchDiffAudit.findings.length > 0 ? (
              <ol className="timeline">
                {displayedPatchDiffAudit.findings.map((finding) => (
                  <li key={finding.findingId}>
                    <span className="timelineMeta">
                      {finding.kind} · {finding.severity} · {finding.code}
                    </span>
                    <span>{finding.summary}</span>
                    {finding.path !== undefined ? (
                      <span className="timelineMeta">Path: {finding.path}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            <p className="fieldHelp">{displayedPatchDiffAudit.nextAction}</p>
          </section>

          <section className="eventPanel" aria-label="Patch Approval Draft">
            <div className="panelHeader">
              <h2>Patch Approval Draft</h2>
              <span className="muted">Draft only / no approval execution</span>
            </div>
            <p className="fieldHelp">
              Builds a read-only approval request draft from validation and
              audit summaries. No approval, rejection, or lease is issued, and
              patch apply stays disabled.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewApprovalDraft();
                }}
                disabled={
                  !displayedPatchDiffAudit.readiness
                    .canProceedToApprovalDraftPreview
                }
                aria-disabled={
                  !displayedPatchDiffAudit.readiness
                    .canProceedToApprovalDraftPreview
                }
              >
                Preview Approval Draft
              </button>
            </div>

            {displayedPatchApprovalDraft.status === "empty" ? (
              <p className="empty">
                Preview a patch diff audit summary first. Approval draft details
                will appear here before any approval review or virtual apply
                preview.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedPatchApprovalDraft.status}</dd>
              </div>
              <div>
                <dt>Approval draft</dt>
                <dd>{displayedPatchApprovalDraft.approvalDraftId}</dd>
              </div>
              <div>
                <dt>Proposal / validation / audit</dt>
                <dd>
                  {displayedPatchApprovalDraft.proposalId} /{" "}
                  {displayedPatchApprovalDraft.validationId} /{" "}
                  {displayedPatchApprovalDraft.auditId}
                </dd>
              </div>
              <div>
                <dt>Risk / derived</dt>
                <dd>
                  {displayedPatchApprovalDraft.riskLevel} /{" "}
                  {displayedPatchApprovalDraft.derivedRiskLevel}
                </dd>
              </div>
              <div>
                <dt>Approval required</dt>
                <dd>
                  {displayedPatchApprovalDraft.requiresApproval ? "yes" : "no"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings / findings</dt>
                <dd>
                  {displayedPatchApprovalDraft.blockerCount} /{" "}
                  {displayedPatchApprovalDraft.warningCount} /{" "}
                  {displayedPatchApprovalDraft.findingCount}
                </dd>
              </div>
              <div>
                <dt>Files</dt>
                <dd>{displayedPatchApprovalDraft.scopeSummary.fileCount}</dd>
              </div>
              <div>
                <dt>Lines + / -</dt>
                <dd>
                  {displayedPatchApprovalDraft.scopeSummary.linesAdded} /{" "}
                  {displayedPatchApprovalDraft.scopeSummary.linesRemoved}
                </dd>
              </div>
              <div>
                <dt>Expires preview</dt>
                <dd>{displayedPatchApprovalDraft.expiryPreview.expiresAt}</dd>
              </div>
              <div>
                <dt>No-compress</dt>
                <dd>
                  {displayedPatchApprovalDraft.noCompressRequired
                    ? displayedPatchApprovalDraft.contextPlacement
                    : "not required"}
                </dd>
              </div>
            </dl>

            <dl className="summaryGrid compact">
              <div>
                <dt>Can approve</dt>
                <dd>
                  {displayedPatchApprovalDraft.readiness.canApprove
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can reject</dt>
                <dd>
                  {displayedPatchApprovalDraft.readiness.canReject
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can issue lease</dt>
                <dd>
                  {displayedPatchApprovalDraft.readiness.canIssueLease
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can apply</dt>
                <dd>
                  {displayedPatchApprovalDraft.readiness.canApplyPatch
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Approval review preview</dt>
                <dd>
                  {displayedPatchApprovalDraft.readiness
                    .canProceedToApprovalReviewPreview
                    ? "ready"
                    : "not ready"}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedPatchApprovalDraft.approvalDraftHash}</dd>
              </div>
            </dl>

            {displayedPatchApprovalDraft.requiredApprovalReasons.length > 0 ? (
              <p className="muted">
                approval reasons{" "}
                {displayedPatchApprovalDraft.requiredApprovalReasons.join(", ")}
              </p>
            ) : null}

            {displayedPatchApprovalDraft.decisionOptions.length > 0 ? (
              <ol className="timeline">
                {displayedPatchApprovalDraft.decisionOptions.map((option) => (
                  <li key={option.optionId}>
                    <span className="timelineMeta">
                      {option.optionId} · enabled{" "}
                      {option.enabled ? "yes" : "no"}
                    </span>
                    <span>{option.summary}</span>
                    <span className="timelineMeta">{option.reason}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedPatchApprovalDraft.suggestedConditions.length > 0 ? (
              <ol className="timeline">
                {displayedPatchApprovalDraft.suggestedConditions.map(
                  (condition) => (
                    <li key={condition.conditionId}>
                      <span className="timelineMeta">
                        {condition.conditionId} ·{" "}
                        {condition.satisfied ? "satisfied" : "pending"}
                      </span>
                      <span>{condition.summary}</span>
                      {condition.warningCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Warnings: {condition.warningCodes.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedPatchApprovalDraft.findings.length > 0 ? (
              <ol className="timeline">
                {displayedPatchApprovalDraft.findings.map((finding) => (
                  <li key={finding.findingId}>
                    <span className="timelineMeta">
                      {finding.kind} · {finding.severity} · {finding.code}
                    </span>
                    <span>{finding.summary}</span>
                    {finding.path !== undefined ? (
                      <span className="timelineMeta">Path: {finding.path}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            <p className="fieldHelp">
              {displayedPatchApprovalDraft.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Patch Virtual Apply Preview"
          >
            <div className="panelHeader">
              <h2>Patch Virtual Apply Preview</h2>
              <span className="muted">
                In-memory summary only / no filesystem write
              </span>
            </div>
            <p className="fieldHelp">
              Simulates the patch proposal against a summary-only in-memory
              snapshot. No files are read or written, no rollback is executed,
              and no patch is applied.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewVirtualApply();
                }}
                disabled={
                  !displayedPatchApprovalDraft.readiness
                    .canProceedToApprovalReviewPreview
                }
                aria-disabled={
                  !displayedPatchApprovalDraft.readiness
                    .canProceedToApprovalReviewPreview
                }
              >
                Preview Virtual Apply
              </button>
            </div>

            {displayedPatchVirtualApply.status === "empty" ? (
              <p className="empty">
                Preview an approval draft first. Virtual apply details will
                appear here before rollback checkpoint preview.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedPatchVirtualApply.status}</dd>
              </div>
              <div>
                <dt>Virtual apply</dt>
                <dd>{displayedPatchVirtualApply.virtualApplyId}</dd>
              </div>
              <div>
                <dt>Proposal / validation / audit</dt>
                <dd>
                  {displayedPatchVirtualApply.proposalId} /{" "}
                  {displayedPatchVirtualApply.validationId} /{" "}
                  {displayedPatchVirtualApply.auditId}
                </dd>
              </div>
              <div>
                <dt>Approval draft</dt>
                <dd>{displayedPatchVirtualApply.approvalDraftId}</dd>
              </div>
              <div>
                <dt>Risk / derived</dt>
                <dd>
                  {displayedPatchVirtualApply.riskLevel} /{" "}
                  {displayedPatchVirtualApply.derivedRiskLevel}
                </dd>
              </div>
              <div>
                <dt>Operations</dt>
                <dd>{displayedPatchVirtualApply.operations.length}</dd>
              </div>
              <div>
                <dt>Created / updated / deleted</dt>
                <dd>
                  {displayedPatchVirtualApply.filesCreated} /{" "}
                  {displayedPatchVirtualApply.filesUpdated} /{" "}
                  {displayedPatchVirtualApply.filesDeleted}
                </dd>
              </div>
              <div>
                <dt>Lines + / -</dt>
                <dd>
                  {displayedPatchVirtualApply.estimatedLinesAdded} /{" "}
                  {displayedPatchVirtualApply.estimatedLinesRemoved}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings / findings</dt>
                <dd>
                  {displayedPatchVirtualApply.blockerCount} /{" "}
                  {displayedPatchVirtualApply.warningCount} /{" "}
                  {displayedPatchVirtualApply.findingCount}
                </dd>
              </div>
              <div>
                <dt>No-compress</dt>
                <dd>
                  {displayedPatchVirtualApply.noCompressRequired
                    ? displayedPatchVirtualApply.contextPlacement
                    : "not required"}
                </dd>
              </div>
            </dl>

            <dl className="summaryGrid compact">
              <div>
                <dt>Input snapshot</dt>
                <dd>{displayedPatchVirtualApply.inputSnapshot.snapshotHash}</dd>
              </div>
              <div>
                <dt>Output snapshot</dt>
                <dd>
                  {displayedPatchVirtualApply.outputSnapshot.snapshotHash}
                </dd>
              </div>
              <div>
                <dt>Rollback checkpoint</dt>
                <dd>
                  {
                    displayedPatchVirtualApply.rollbackPreview
                      .checkpointPreviewId
                  }
                </dd>
              </div>
              <div>
                <dt>Rollback real</dt>
                <dd>
                  {displayedPatchVirtualApply.rollbackPreview.canRollbackReal
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can write filesystem</dt>
                <dd>
                  {displayedPatchVirtualApply.readiness.canWriteFilesystem
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can apply</dt>
                <dd>
                  {displayedPatchVirtualApply.readiness.canApplyPatch
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can git / shell</dt>
                <dd>
                  {displayedPatchVirtualApply.readiness.canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPatchVirtualApply.readiness.canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Rollback preview</dt>
                <dd>
                  {displayedPatchVirtualApply.readiness
                    .canProceedToRollbackCheckpointPreview
                    ? "ready"
                    : "not ready"}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedPatchVirtualApply.virtualApplyHash}</dd>
              </div>
            </dl>

            {displayedPatchVirtualApply.operations.length > 0 ? (
              <ol className="timeline">
                {displayedPatchVirtualApply.operations.map((operation) => (
                  <li key={operation.operationId}>
                    <span className="timelineMeta">
                      {operation.changeKind} · {operation.path}
                    </span>
                    <span>
                      exists {operation.existsBefore ? "before" : "not before"}{" "}
                      → {operation.existsAfter ? "after" : "not after"}
                    </span>
                    <span className="timelineMeta">
                      Lines {operation.estimatedLinesAdded} /{" "}
                      {operation.estimatedLinesRemoved}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedPatchVirtualApply.findings.length > 0 ? (
              <ol className="timeline">
                {displayedPatchVirtualApply.findings.map((finding) => (
                  <li key={finding.findingId}>
                    <span className="timelineMeta">
                      {finding.kind} · {finding.severity} · {finding.code}
                    </span>
                    <span>{finding.summary}</span>
                    {finding.path !== undefined ? (
                      <span className="timelineMeta">Path: {finding.path}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            <p className="fieldHelp">{displayedPatchVirtualApply.nextAction}</p>
          </section>

          <section
            className="eventPanel"
            aria-label="Patch Rollback Checkpoint Preview"
          >
            <div className="panelHeader">
              <h2>Patch Rollback Checkpoint Preview</h2>
              <span className="muted">
                Checkpoint preview / no real rollback
              </span>
            </div>
            <p className="fieldHelp">
              Builds a rollback checkpoint summary from the virtual apply
              preview. No checkpoint file is written and no rollback is
              executed.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewRollbackCheckpoint();
                }}
                disabled={
                  !displayedPatchVirtualApply.readiness
                    .canProceedToRollbackCheckpointPreview
                }
                aria-disabled={
                  !displayedPatchVirtualApply.readiness
                    .canProceedToRollbackCheckpointPreview
                }
              >
                Preview Rollback Checkpoint
              </button>
            </div>

            {displayedPatchRollbackCheckpoint.status === "empty" ? (
              <p className="empty">
                Preview a virtual apply summary first. Rollback checkpoint
                summaries will appear here before replay projection preview.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedPatchRollbackCheckpoint.status}</dd>
              </div>
              <div>
                <dt>Checkpoint</dt>
                <dd>{displayedPatchRollbackCheckpoint.checkpointPreviewId}</dd>
              </div>
              <div>
                <dt>Virtual apply</dt>
                <dd>{displayedPatchRollbackCheckpoint.virtualApplyId}</dd>
              </div>
              <div>
                <dt>Proposal / validation / audit</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.proposalId} /{" "}
                  {displayedPatchRollbackCheckpoint.validationId} /{" "}
                  {displayedPatchRollbackCheckpoint.auditId}
                </dd>
              </div>
              <div>
                <dt>Approval draft</dt>
                <dd>{displayedPatchRollbackCheckpoint.approvalDraftId}</dd>
              </div>
              <div>
                <dt>Affected files</dt>
                <dd>{displayedPatchRollbackCheckpoint.affectedFileCount}</dd>
              </div>
              <div>
                <dt>Created / updated / deleted</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.filesCreated} /{" "}
                  {displayedPatchRollbackCheckpoint.filesUpdated} /{" "}
                  {displayedPatchRollbackCheckpoint.filesDeleted}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings / findings</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.blockerCount} /{" "}
                  {displayedPatchRollbackCheckpoint.warningCount} /{" "}
                  {displayedPatchRollbackCheckpoint.findingCount}
                </dd>
              </div>
              <div>
                <dt>Metadata only</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.restoreScope.metadataOnly
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>No-compress</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.noCompressRequired
                    ? displayedPatchRollbackCheckpoint.contextPlacement
                    : "not required"}
                </dd>
              </div>
            </dl>

            <dl className="summaryGrid compact">
              <div>
                <dt>Input snapshot</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.inputSnapshot.snapshotHash}
                </dd>
              </div>
              <div>
                <dt>Output snapshot</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.outputSnapshot.snapshotHash}
                </dd>
              </div>
              <div>
                <dt>Can real rollback</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.readiness.canRollbackReal
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Rollback executed</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.readiness.rollbackExecuted
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can write filesystem</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.readiness.canWriteFilesystem
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can apply</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.readiness.canApplyPatch
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can git / shell</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.readiness.canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPatchRollbackCheckpoint.readiness.canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Replay projection</dt>
                <dd>
                  {displayedPatchRollbackCheckpoint.readiness
                    .canProceedToReplayProjectionPreview
                    ? "ready"
                    : "not ready"}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedPatchRollbackCheckpoint.checkpointHash}</dd>
              </div>
            </dl>

            {displayedPatchRollbackCheckpoint.operationSummaries.length > 0 ? (
              <ol className="timeline">
                {displayedPatchRollbackCheckpoint.operationSummaries.map(
                  (operation) => (
                    <li key={operation.operationId}>
                      <span className="timelineMeta">
                        {operation.changeKind} · {operation.path}
                      </span>
                      <span>
                        restore scope:{" "}
                        {operation.changeKind === "create"
                          ? "remove-if-created"
                          : operation.changeKind === "delete"
                            ? "recreate-if-deleted"
                            : "restore-metadata"}
                      </span>
                      <span className="timelineMeta">
                        Lines {operation.estimatedLinesAdded} /{" "}
                        {operation.estimatedLinesRemoved}
                      </span>
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedPatchRollbackCheckpoint.restoreScope.affectedFileCount >
            0 ? (
              <dl className="summaryGrid compact">
                <div>
                  <dt>Files to restore</dt>
                  <dd>
                    {
                      displayedPatchRollbackCheckpoint.restoreScope
                        .filesToRestore.length
                    }
                  </dd>
                </div>
                <div>
                  <dt>Remove created</dt>
                  <dd>
                    {
                      displayedPatchRollbackCheckpoint.restoreScope
                        .filesToRemoveIfCreated.length
                    }
                  </dd>
                </div>
                <div>
                  <dt>Recreate deleted</dt>
                  <dd>
                    {
                      displayedPatchRollbackCheckpoint.restoreScope
                        .filesToRecreateIfDeleted.length
                    }
                  </dd>
                </div>
              </dl>
            ) : null}

            {displayedPatchRollbackCheckpoint.findings.length > 0 ? (
              <ol className="timeline">
                {displayedPatchRollbackCheckpoint.findings.map((finding) => (
                  <li key={finding.findingId}>
                    <span className="timelineMeta">
                      {finding.kind} · {finding.severity} · {finding.code}
                    </span>
                    <span>{finding.summary}</span>
                    {finding.path !== undefined ? (
                      <span className="timelineMeta">Path: {finding.path}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            <p className="fieldHelp">
              {displayedPatchRollbackCheckpoint.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Disposable Workspace Snapshot Contract"
          >
            <div className="panelHeader">
              <h2>Disposable Workspace Snapshot Contract</h2>
              <span className="muted">Metadata only / no apply</span>
            </div>
            <p className="fieldHelp">
              Builds a summary-only contract for a future disposable workspace
              apply target. No files are read or written, and no patch is
              applied. No disposable workspace is created by the App Shell.
            </p>
            <label className="fieldLabel" htmlFor="snapshotDisposableRootRef">
              Disposable root ref
            </label>
            <input
              id="snapshotDisposableRootRef"
              value={snapshotDisposableRootRef}
              onChange={(event) =>
                setSnapshotDisposableRootRef(event.currentTarget.value)
              }
              placeholder="sandbox-ref-p0j-001"
            />
            <p className="fieldHelp">
              This is an opaque display ref, not a real filesystem path.
            </p>
            <label className="fieldLabel" htmlFor="snapshotSourceFingerprint">
              Source workspace fingerprint
            </label>
            <input
              id="snapshotSourceFingerprint"
              value={snapshotSourceFingerprint}
              onChange={(event) =>
                setSnapshotSourceFingerprint(event.currentTarget.value)
              }
              placeholder="workspace-fingerprint-summary"
            />
            <label className="fieldLabel" htmlFor="snapshotFileSummaryJson">
              File summary JSON
            </label>
            <textarea
              id="snapshotFileSummaryJson"
              value={snapshotFileSummaryJson}
              onChange={(event) =>
                setSnapshotFileSummaryJson(event.currentTarget.value)
              }
              rows={5}
              placeholder='[{"path":"app/src/App.tsx","sizeBytes":1200,"hashPrefix":"abc12345","exists":true}]'
            />
            <p className="fieldHelp">
              Leave blank to use the loaded Workspace Index summary. Raw file
              content, raw diffs, and secret markers are rejected.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewDisposableWorkspaceSnapshot();
                }}
              >
                Preview Snapshot Contract
              </button>
            </div>

            {displayedDisposableWorkspaceSnapshot.status === "empty" ? (
              <p className="empty">
                Load a Workspace Index summary or paste metadata-only file
                summaries to preview the disposable workspace snapshot contract.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedDisposableWorkspaceSnapshot.status}</dd>
              </div>
              <div>
                <dt>Contract</dt>
                <dd>{displayedDisposableWorkspaceSnapshot.contractId}</dd>
              </div>
              <div>
                <dt>Disposable root ref</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.disposableRootRef}
                </dd>
              </div>
              <div>
                <dt>Source fingerprint</dt>
                <dd>
                  {
                    displayedDisposableWorkspaceSnapshot.sourceWorkspaceFingerprint
                  }
                </dd>
              </div>
              <div>
                <dt>Files / directories</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.fileCount} /{" "}
                  {displayedDisposableWorkspaceSnapshot.directoryCount}
                </dd>
              </div>
              <div>
                <dt>Total bytes</dt>
                <dd>{displayedDisposableWorkspaceSnapshot.totalBytes}</dd>
              </div>
              <div>
                <dt>Generated / binary / symlink-like</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.generatedFileCount} /{" "}
                  {displayedDisposableWorkspaceSnapshot.binaryFileCount} /{" "}
                  {displayedDisposableWorkspaceSnapshot.symlinkLikeCount}
                </dd>
              </div>
              <div>
                <dt>Planned mutations</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.plannedMutationCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings / findings</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.blockerCount} /{" "}
                  {displayedDisposableWorkspaceSnapshot.warningCount} /{" "}
                  {displayedDisposableWorkspaceSnapshot.findingCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedDisposableWorkspaceSnapshot.contractHash}</dd>
              </div>
            </dl>

            <dl className="summaryGrid compact">
              <div>
                <dt>Can sandbox prototype</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.readiness
                    .canProceedToSandboxApplyPrototype
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can read filesystem</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.readiness
                    .canReadFilesystem
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can write filesystem</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.readiness
                    .canWriteFilesystem
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can apply / rollback</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.readiness.canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedDisposableWorkspaceSnapshot.readiness
                    .canRollbackReal
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can git / shell</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.readiness.canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedDisposableWorkspaceSnapshot.readiness
                    .canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>
                  {displayedDisposableWorkspaceSnapshot.policy.pathPolicy} ·
                  symlink{" "}
                  {displayedDisposableWorkspaceSnapshot.policy.symlinkPolicy} ·
                  reparse{" "}
                  {
                    displayedDisposableWorkspaceSnapshot.policy
                      .reparsePointPolicy
                  }
                </dd>
              </div>
            </dl>

            {displayedDisposableWorkspaceSnapshot.files.length > 0 ? (
              <ol className="timeline">
                {displayedDisposableWorkspaceSnapshot.files.map((file) => (
                  <li key={file.path}>
                    <span className="timelineMeta">
                      {file.path} · {file.language ?? "unknown"} ·{" "}
                      {file.plannedMutation ?? "none"}
                    </span>
                    <span>
                      {file.sizeBytes} bytes · hash {file.hashPrefix}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedDisposableWorkspaceSnapshot.findings.length > 0 ? (
              <ol className="timeline">
                {displayedDisposableWorkspaceSnapshot.findings.map(
                  (finding) => (
                    <li key={finding.findingId}>
                      <span className="timelineMeta">
                        {finding.kind} · {finding.severity} · {finding.code}
                      </span>
                      <span>{finding.summary}</span>
                      {finding.path !== undefined ? (
                        <span className="timelineMeta">
                          Path: {finding.path}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            <p className="fieldHelp">
              {displayedDisposableWorkspaceSnapshot.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="User Workspace Snapshot / Backup Contract"
          >
            <div className="panelHeader">
              <h2>User Workspace Snapshot / Backup Contract</h2>
              <span className="muted">
                Metadata only / no user workspace apply
              </span>
            </div>
            <p className="fieldHelp">
              Builds a summary-only contract for a future user workspace
              promotion gate. No files are read or written, and no backup is
              created.
            </p>
            <label className="fieldLabel" htmlFor="userWorkspaceRootRef">
              User workspace root ref
            </label>
            <input
              id="userWorkspaceRootRef"
              value={userWorkspaceRootRef}
              onChange={(event) =>
                setUserWorkspaceRootRef(event.currentTarget.value)
              }
              placeholder="user-workspace-ref-p0k-001"
            />
            <p className="fieldHelp">
              This is an opaque display ref for the promotion gate, not a real
              executable filesystem path.
            </p>
            <label
              className="fieldLabel"
              htmlFor="userWorkspaceSourceFingerprint"
            >
              Source workspace fingerprint
            </label>
            <input
              id="userWorkspaceSourceFingerprint"
              value={userWorkspaceSourceFingerprint}
              onChange={(event) =>
                setUserWorkspaceSourceFingerprint(event.currentTarget.value)
              }
              placeholder="workspace-fingerprint-summary"
            />
            <label
              className="fieldLabel"
              htmlFor="userWorkspaceFileSummaryJson"
            >
              File summary JSON
            </label>
            <textarea
              id="userWorkspaceFileSummaryJson"
              value={userWorkspaceFileSummaryJson}
              onChange={(event) =>
                setUserWorkspaceFileSummaryJson(event.currentTarget.value)
              }
              rows={5}
              placeholder='[{"path":"app/src/App.tsx","sizeBytes":1200,"hashPrefix":"abc12345","exists":true,"plannedMutation":"update","backupRequired":true,"preimageHashRequired":true}]'
            />
            <p className="fieldHelp">
              Leave blank to use the loaded Workspace Index summary. Raw file
              content, raw diffs, preimage content, backup content, and secret
              markers are rejected.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewUserWorkspaceSnapshotBackup();
                }}
              >
                Preview User Workspace Contract
              </button>
            </div>

            {displayedUserWorkspaceSnapshotBackup.status === "empty" ? (
              <p className="empty">
                Load a Workspace Index summary or paste metadata-only file
                summaries to preview the user workspace snapshot and backup
                contract.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedUserWorkspaceSnapshotBackup.status}</dd>
              </div>
              <div>
                <dt>Contract</dt>
                <dd>{displayedUserWorkspaceSnapshotBackup.contractId}</dd>
              </div>
              <div>
                <dt>User workspace ref</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.userWorkspaceRootRef}
                </dd>
              </div>
              <div>
                <dt>Source fingerprint</dt>
                <dd>
                  {
                    displayedUserWorkspaceSnapshotBackup.sourceWorkspaceFingerprint
                  }
                </dd>
              </div>
              <div>
                <dt>Files / directories</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.fileCount} /{" "}
                  {displayedUserWorkspaceSnapshotBackup.directoryCount}
                </dd>
              </div>
              <div>
                <dt>Total bytes</dt>
                <dd>{displayedUserWorkspaceSnapshotBackup.totalBytes}</dd>
              </div>
              <div>
                <dt>Planned mutations</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.plannedMutationCount}
                </dd>
              </div>
              <div>
                <dt>Backup / preimage requirements</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.backupRequiredCount} /{" "}
                  {
                    displayedUserWorkspaceSnapshotBackup.preimageHashRequiredCount
                  }
                </dd>
              </div>
              <div>
                <dt>Generated / binary / symlink-like</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.generatedFileCount} /{" "}
                  {displayedUserWorkspaceSnapshotBackup.binaryFileCount} /{" "}
                  {displayedUserWorkspaceSnapshotBackup.symlinkLikeCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings / findings</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.blockerCount} /{" "}
                  {displayedUserWorkspaceSnapshotBackup.warningCount} /{" "}
                  {displayedUserWorkspaceSnapshotBackup.findingCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedUserWorkspaceSnapshotBackup.contractHash}</dd>
              </div>
            </dl>

            <dl className="summaryGrid compact">
              <div>
                <dt>Can readiness check</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.readiness
                    .canProceedToPromotionReadinessCheck
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can read filesystem</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.readiness
                    .canReadFilesystem
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can write filesystem</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.readiness
                    .canWriteFilesystem
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can user apply / rollback</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.readiness
                    .canApplyToUserWorkspace
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedUserWorkspaceSnapshotBackup.readiness
                    .canRollbackUserWorkspace
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can git / shell</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.readiness.canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedUserWorkspaceSnapshotBackup.readiness
                    .canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>
                  {displayedUserWorkspaceSnapshotBackup.policy.pathPolicy} ·
                  backup{" "}
                  {displayedUserWorkspaceSnapshotBackup.policy.backupPolicy} ·
                  symlink{" "}
                  {displayedUserWorkspaceSnapshotBackup.policy.symlinkPolicy}
                </dd>
              </div>
            </dl>

            {displayedUserWorkspaceSnapshotBackup.backupRequirements.length >
            0 ? (
              <ol className="timeline">
                {displayedUserWorkspaceSnapshotBackup.backupRequirements.map(
                  (requirement) => (
                    <li key={requirement.requirementId}>
                      <span className="timelineMeta">
                        {requirement.path} · {requirement.mutationKind} ·{" "}
                        {requirement.backupStorage}
                      </span>
                      <span>
                        preimage hash required:{" "}
                        {requirement.preimageHashRequired ? "yes" : "no"} ·
                        content deferred:{" "}
                        {requirement.preimageContentRequiredForFutureApply
                          ? "yes"
                          : "no"}
                      </span>
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedUserWorkspaceSnapshotBackup.findings.length > 0 ? (
              <ol className="timeline">
                {displayedUserWorkspaceSnapshotBackup.findings.map(
                  (finding) => (
                    <li key={finding.findingId}>
                      <span className="timelineMeta">
                        {finding.kind} · {finding.severity} · {finding.code}
                      </span>
                      <span>{finding.summary}</span>
                      {finding.path !== undefined ? (
                        <span className="timelineMeta">
                          Path: {finding.path}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            <p className="fieldHelp">
              {displayedUserWorkspaceSnapshotBackup.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="User Workspace Promotion Readiness"
          >
            <div className="panelHeader">
              <h2>User Workspace Promotion Readiness</h2>
              <span className="muted">Readiness only / no write</span>
            </div>
            <p className="fieldHelp">
              Checks whether sandbox apply/rollback summaries and user workspace
              metadata are sufficient for a future promotion gate. No files are
              read or written. Readiness passing does not enable App execution.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewUserWorkspacePromotionReadiness();
                }}
              >
                Preview Promotion Readiness
              </button>
            </div>

            {displayedUserWorkspacePromotionReadiness.status === "empty" ? (
              <p className="empty">
                Preview the user workspace snapshot contract and sandbox
                summaries to evaluate promotion readiness. This checker does not
                enable apply.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedUserWorkspacePromotionReadiness.status}</dd>
              </div>
              <div>
                <dt>Readiness id</dt>
                <dd>{displayedUserWorkspacePromotionReadiness.readinessId}</dd>
              </div>
              <div>
                <dt>Chain id</dt>
                <dd>{displayedUserWorkspacePromotionReadiness.chainId}</dd>
              </div>
              <div>
                <dt>Gates passed / total</dt>
                <dd>
                  {displayedUserWorkspacePromotionReadiness.passedGateCount} /{" "}
                  {displayedUserWorkspacePromotionReadiness.gateCount}
                </dd>
              </div>
              <div>
                <dt>Blocked / warning gates</dt>
                <dd>
                  {displayedUserWorkspacePromotionReadiness.blockedGateCount} /{" "}
                  {displayedUserWorkspacePromotionReadiness.warningGateCount}
                </dd>
              </div>
              <div>
                <dt>Artifacts present / required</dt>
                <dd>
                  {
                    displayedUserWorkspacePromotionReadiness.presentArtifactCount
                  }{" "}
                  /{" "}
                  {
                    displayedUserWorkspacePromotionReadiness.requiredArtifactCount
                  }
                </dd>
              </div>
              <div>
                <dt>Missing artifacts</dt>
                <dd>
                  {
                    displayedUserWorkspacePromotionReadiness.missingArtifactCount
                  }
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings / findings</dt>
                <dd>
                  {displayedUserWorkspacePromotionReadiness.blockerCount} /{" "}
                  {displayedUserWorkspacePromotionReadiness.warningCount} /{" "}
                  {displayedUserWorkspacePromotionReadiness.findingCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedUserWorkspacePromotionReadiness.readinessHash}
                </dd>
              </div>
            </dl>

            <dl className="summaryGrid compact">
              <div>
                <dt>Can future prototype check</dt>
                <dd>
                  {displayedUserWorkspacePromotionReadiness.readiness
                    .canProceedToUserWorkspaceApplyPrototype
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can user apply / rollback</dt>
                <dd>
                  {displayedUserWorkspacePromotionReadiness.readiness
                    .canApplyToUserWorkspace
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedUserWorkspacePromotionReadiness.readiness
                    .canRollbackUserWorkspace
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can write filesystem</dt>
                <dd>
                  {displayedUserWorkspacePromotionReadiness.readiness
                    .canWriteFilesystem
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can permission lease</dt>
                <dd>
                  {displayedUserWorkspacePromotionReadiness.readiness
                    .canIssuePermissionLease
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can git / shell</dt>
                <dd>
                  {displayedUserWorkspacePromotionReadiness.readiness
                    .canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedUserWorkspacePromotionReadiness.readiness
                    .canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>App can execute</dt>
                <dd>
                  {displayedUserWorkspacePromotionReadiness.readiness
                    .appCanExecute
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedUserWorkspacePromotionReadiness.gates.length > 0 ? (
              <ol className="timeline">
                {displayedUserWorkspacePromotionReadiness.gates.map((gate) => (
                  <li key={gate.gateId}>
                    <span className="timelineMeta">
                      {gate.name} · {gate.status}
                    </span>
                    <span>{gate.summary}</span>
                    {gate.blockerCodes.length > 0 ||
                    gate.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        {[...gate.blockerCodes, ...gate.warningCodes].join(
                          ", "
                        )}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedUserWorkspacePromotionReadiness.findings.length > 0 ? (
              <ol className="timeline">
                {displayedUserWorkspacePromotionReadiness.findings.map(
                  (finding) => (
                    <li key={finding.findingId}>
                      <span className="timelineMeta">
                        {finding.kind} · {finding.severity} · {finding.code}
                      </span>
                      <span>{finding.summary}</span>
                    </li>
                  )
                )}
              </ol>
            ) : null}

            <p className="fieldHelp">
              {summarizeUserWorkspacePromotionReadinessView(
                displayedUserWorkspacePromotionReadiness
              )}
            </p>
            <p className="fieldHelp">
              {displayedUserWorkspacePromotionReadiness.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="User Workspace Apply Prototype"
          >
            <div className="panelHeader">
              <h2>User Workspace Apply Prototype</h2>
              <span className="muted">
                Disabled by default / runtime prototype only
              </span>
            </div>
            <p className="fieldHelp">
              User workspace apply is only available to runtime tests with
              explicit fixtures. The App Shell cannot apply patches to the user
              workspace.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Apply to User Workspace (disabled)
              </button>
            </div>
            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{userWorkspaceApplyPrototypeView.status}</dd>
              </div>
              <div>
                <dt>Runtime helper</dt>
                <dd>
                  {userWorkspaceApplyPrototypeView.runtimeHelperAvailable
                    ? "available for tests"
                    : "not connected"}
                </dd>
              </div>
              <div>
                <dt>Runtime prototype only</dt>
                <dd>
                  {userWorkspaceApplyPrototypeView.runtimePrototypeOnly
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>App execution connected</dt>
                <dd>
                  {userWorkspaceApplyPrototypeView.appExecutionConnected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>User workspace mutation</dt>
                <dd>
                  {userWorkspaceApplyPrototypeView.userWorkspaceMutationEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Content / preimage inputs</dt>
                <dd>
                  {userWorkspaceApplyPrototypeView.contentInputEnabled
                    ? "enabled"
                    : "disabled"}{" "}
                  /{" "}
                  {userWorkspaceApplyPrototypeView.preimageInputEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Approval receipt input</dt>
                <dd>
                  {userWorkspaceApplyPrototypeView.approvalReceiptInputEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Readiness / contract</dt>
                <dd>
                  {userWorkspaceApplyPrototypeView.readinessId || "n/a"} /{" "}
                  {userWorkspaceApplyPrototypeView.contractId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Proposal / validation / audit</dt>
                <dd>
                  {userWorkspaceApplyPrototypeView.proposalId || "n/a"} /{" "}
                  {userWorkspaceApplyPrototypeView.validationId || "n/a"} /{" "}
                  {userWorkspaceApplyPrototypeView.auditId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Approval / virtual / checkpoint</dt>
                <dd>
                  {userWorkspaceApplyPrototypeView.approvalDraftId || "n/a"} /{" "}
                  {userWorkspaceApplyPrototypeView.virtualApplyId || "n/a"} /{" "}
                  {userWorkspaceApplyPrototypeView.checkpointPreviewId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {userWorkspaceApplyPrototypeView.blockerCount} /{" "}
                  {userWorkspaceApplyPrototypeView.warningCount}
                </dd>
              </div>
            </dl>
            {userWorkspaceApplyPrototypeView.warningCodes.length > 0 ? (
              <p className="fieldHelp">
                Warning codes:{" "}
                {userWorkspaceApplyPrototypeView.warningCodes.join(", ")}
              </p>
            ) : null}
            <p className="fieldHelp">
              {userWorkspaceApplyPrototypeView.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="User Workspace Rollback Prototype"
          >
            <div className="panelHeader">
              <h2>User Workspace Rollback Prototype</h2>
              <span className="muted">
                Disabled by default / runtime prototype only
              </span>
            </div>
            <p className="fieldHelp">
              User workspace rollback is only available to runtime tests with
              explicit fixtures. The App Shell cannot rollback the user
              workspace.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Rollback User Workspace (disabled)
              </button>
            </div>
            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{userWorkspaceRollbackPrototypeView.status}</dd>
              </div>
              <div>
                <dt>Runtime helper</dt>
                <dd>
                  {userWorkspaceRollbackPrototypeView.runtimeHelperAvailable
                    ? "available for tests"
                    : "not connected"}
                </dd>
              </div>
              <div>
                <dt>Runtime prototype only</dt>
                <dd>
                  {userWorkspaceRollbackPrototypeView.runtimePrototypeOnly
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>App execution connected</dt>
                <dd>
                  {userWorkspaceRollbackPrototypeView.appExecutionConnected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>User workspace mutation</dt>
                <dd>
                  {userWorkspaceRollbackPrototypeView.userWorkspaceMutationEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Preimage input</dt>
                <dd>
                  {userWorkspaceRollbackPrototypeView.preimageInputEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Approval receipt input</dt>
                <dd>
                  {userWorkspaceRollbackPrototypeView.approvalReceiptInputEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Apply / checkpoint</dt>
                <dd>
                  {userWorkspaceRollbackPrototypeView.applyId || "n/a"} /{" "}
                  {userWorkspaceRollbackPrototypeView.checkpointId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Readiness / contract</dt>
                <dd>
                  {userWorkspaceRollbackPrototypeView.readinessId || "n/a"} /{" "}
                  {userWorkspaceRollbackPrototypeView.contractId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {userWorkspaceRollbackPrototypeView.blockerCount} /{" "}
                  {userWorkspaceRollbackPrototypeView.warningCount}
                </dd>
              </div>
            </dl>
            {userWorkspaceRollbackPrototypeView.warningCodes.length > 0 ? (
              <p className="fieldHelp">
                Warning codes:{" "}
                {userWorkspaceRollbackPrototypeView.warningCodes.join(", ")}
              </p>
            ) : null}
            <p className="fieldHelp">
              {userWorkspaceRollbackPrototypeView.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="User Workspace Apply / Rollback Event Writer"
          >
            <div className="panelHeader">
              <h2>User Workspace Apply / Rollback Event Writer</h2>
              <span className="muted">Runtime only / App write disabled</span>
            </div>
            <p className="fieldHelp">
              Runtime tests can persist summary-only apply/rollback events. The
              App Shell cannot write these events or execute apply/rollback.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Write Apply/Rollback Events (disabled)
              </button>
            </div>
            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{userWorkspaceEventWriterView.status}</dd>
              </div>
              <div>
                <dt>Runtime helper</dt>
                <dd>
                  {userWorkspaceEventWriterView.runtimeHelperAvailable
                    ? "available for tests"
                    : "not connected"}
                </dd>
              </div>
              <div>
                <dt>Runtime only</dt>
                <dd>
                  {userWorkspaceEventWriterView.runtimeOnly ? "yes" : "no"}
                </dd>
              </div>
              <div>
                <dt>App write connected</dt>
                <dd>
                  {userWorkspaceEventWriterView.appWriteConnected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Payload input</dt>
                <dd>
                  {userWorkspaceEventWriterView.eventPayloadInputEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback execution</dt>
                <dd>
                  {userWorkspaceEventWriterView.applyExecutionEnabled
                    ? "enabled"
                    : "disabled"}{" "}
                  /{" "}
                  {userWorkspaceEventWriterView.rollbackExecutionEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback result</dt>
                <dd>
                  {userWorkspaceEventWriterView.userWorkspaceApplyId || "n/a"} /{" "}
                  {userWorkspaceEventWriterView.userWorkspaceRollbackId ||
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Readiness / contract</dt>
                <dd>
                  {userWorkspaceEventWriterView.readinessId || "n/a"} /{" "}
                  {userWorkspaceEventWriterView.contractId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {userWorkspaceEventWriterView.blockerCount} /{" "}
                  {userWorkspaceEventWriterView.warningCount}
                </dd>
              </div>
            </dl>
            {userWorkspaceEventWriterView.warningCodes.length > 0 ? (
              <p className="fieldHelp">
                Warning codes:{" "}
                {userWorkspaceEventWriterView.warningCodes.join(", ")}
              </p>
            ) : null}
            <p className="fieldHelp">
              {userWorkspaceEventWriterView.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="App Approval Execution Design"
          >
            <div className="panelHeader">
              <h2>App Approval Execution Design</h2>
              <span className="muted">Design only / disabled</span>
            </div>
            <p className="fieldHelp">
              Documents the future App approval execution gate. The App Shell
              cannot approve, reject, issue leases, apply patches, rollback, or
              write apply events.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Approve Apply (disabled)
              </button>
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Reject Apply (disabled)
              </button>
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Issue Permission Lease (disabled)
              </button>
            </div>
            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{appApprovalExecutionDesignView.status}</dd>
              </div>
              <div>
                <dt>Disabled actions</dt>
                <dd>{appApprovalExecutionDesignView.disabledActionCount}</dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {appApprovalExecutionDesignView.blockerCount} /{" "}
                  {appApprovalExecutionDesignView.warningCount}
                </dd>
              </div>
              <div>
                <dt>Can approve / reject</dt>
                <dd>
                  {appApprovalExecutionDesignView.readiness.canApprove
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {appApprovalExecutionDesignView.readiness.canReject
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can issue lease</dt>
                <dd>
                  {appApprovalExecutionDesignView.readiness
                    .canIssuePermissionLease
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can apply / rollback</dt>
                <dd>
                  {appApprovalExecutionDesignView.readiness.canExecuteApply
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {appApprovalExecutionDesignView.readiness.canExecuteRollback
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can write events</dt>
                <dd>
                  {appApprovalExecutionDesignView.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can git / shell</dt>
                <dd>
                  {appApprovalExecutionDesignView.readiness.canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {appApprovalExecutionDesignView.readiness.canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>
            <p className="fieldHelp">
              {summarizeAppApprovalExecutionDesignView(
                appApprovalExecutionDesignView
              )}
            </p>
            {appApprovalExecutionDesignView.requirements.length > 0 ? (
              <ol className="timeline">
                {appApprovalExecutionDesignView.requirements.map(
                  (requirement) => (
                    <li key={requirement.requirementId}>
                      <span className="timelineMeta">
                        {requirement.status} · {requirement.requirementId}
                      </span>
                      <span>{requirement.label}</span>
                      <span className="timelineMeta">
                        {requirement.summary}
                      </span>
                    </li>
                  )
                )}
              </ol>
            ) : null}
            <p className="fieldHelp">
              {appApprovalExecutionDesignView.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="App Approved Execution Receipt"
          >
            <div className="panelHeader">
              <h2>App Approved Execution Receipt</h2>
              <span className="muted">Receipt preview / no execution</span>
            </div>
            <p className="fieldHelp">
              Previews a narrow apply or rollback approval receipt. The App
              Shell does not invoke Tauri, write files, apply patches, rollback,
              write events, issue leases, or execute Git or shell commands.
            </p>
            <label>
              Apply typed confirmation
              <input
                value={appApprovedApplyConfirmation}
                onChange={(event) =>
                  setAppApprovedApplyConfirmation(event.target.value)
                }
                placeholder="APPLY TO USER WORKSPACE"
                spellCheck={false}
              />
            </label>
            <label>
              Rollback typed confirmation
              <input
                value={appApprovedRollbackConfirmation}
                onChange={(event) =>
                  setAppApprovedRollbackConfirmation(event.target.value)
                }
                placeholder="ROLLBACK USER WORKSPACE"
                spellCheck={false}
              />
            </label>
            <label>
              Allowed relative paths
              <textarea
                value={appApprovedReceiptPathRefs}
                onChange={(event) =>
                  setAppApprovedReceiptPathRefs(event.target.value)
                }
                placeholder="src/safe-file.ts"
                spellCheck={false}
              />
            </label>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setAppApprovedExecutionReceiptPreview(
                    buildAppApprovedExecutionReceiptView({
                      receiptKind: "apply",
                      applyTypedConfirmation: appApprovedApplyConfirmation,
                      rollbackTypedConfirmation:
                        appApprovedRollbackConfirmation,
                      allowedRelativePathsText: appApprovedReceiptPathRefs,
                      workspaceSnapshotBackupContract:
                        displayedUserWorkspaceSnapshotBackup,
                      patchProposalPreview: patchProposalCreationPreview,
                      patchValidationPreview: patchProposalValidationPreview,
                      patchDiffAuditPreview: patchDiffAuditPreview,
                      patchApprovalDraft: patchApprovalDraftPreview,
                      patchRollbackCheckpointPreview:
                        patchRollbackCheckpointPreview,
                      approvedApplyResult: appApprovedApplyResult
                    })
                  )
                }
              >
                Preview Apply Receipt
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setAppApprovedExecutionReceiptPreview(
                    buildAppApprovedExecutionReceiptView({
                      receiptKind: "rollback",
                      applyTypedConfirmation: appApprovedApplyConfirmation,
                      rollbackTypedConfirmation:
                        appApprovedRollbackConfirmation,
                      allowedRelativePathsText: appApprovedReceiptPathRefs,
                      workspaceSnapshotBackupContract:
                        displayedUserWorkspaceSnapshotBackup,
                      patchProposalPreview: patchProposalCreationPreview,
                      patchValidationPreview: patchProposalValidationPreview,
                      patchDiffAuditPreview: patchDiffAuditPreview,
                      patchApprovalDraft: patchApprovalDraftPreview,
                      patchRollbackCheckpointPreview:
                        patchRollbackCheckpointPreview
                    })
                  )
                }
              >
                Preview Rollback Receipt
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAppApprovedExecutionReceiptPreview(undefined);
                  setAppApprovedApplyConfirmation("");
                  setAppApprovedRollbackConfirmation("");
                  setAppApprovedReceiptPathRefs("");
                  setAppApprovedExecutionContentDraft("");
                  setAppApprovedApplyResult(undefined);
                  setAppApprovedRollbackResult(undefined);
                  setAppApprovedExecutionEventResult(undefined);
                  setAppApprovedExecutionError(undefined);
                }}
              >
                Clear Receipt Preview
              </button>
            </div>
            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedAppApprovedExecutionReceipt.status}</dd>
              </div>
              <div>
                <dt>Kind</dt>
                <dd>{displayedAppApprovedExecutionReceipt.kind}</dd>
              </div>
              <div>
                <dt>Receipt id</dt>
                <dd>{displayedAppApprovedExecutionReceipt.receiptId}</dd>
              </div>
              <div>
                <dt>Proposal / validation / audit</dt>
                <dd>
                  {displayedAppApprovedExecutionReceipt.proposalId || "n/a"} /{" "}
                  {displayedAppApprovedExecutionReceipt.validationId || "n/a"} /{" "}
                  {displayedAppApprovedExecutionReceipt.auditId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Approval / checkpoint</dt>
                <dd>
                  {displayedAppApprovedExecutionReceipt.approvalDraftId ||
                    "n/a"}{" "}
                  / {displayedAppApprovedExecutionReceipt.checkpointId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Allowed paths</dt>
                <dd>{displayedAppApprovedExecutionReceipt.allowedPathCount}</dd>
              </div>
              <div>
                <dt>Receipt hash</dt>
                <dd>
                  {displayedAppApprovedExecutionReceipt.receiptHashPrefix ||
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedAppApprovedExecutionReceipt.blockerCount} /{" "}
                  {displayedAppApprovedExecutionReceipt.warningCount}
                </dd>
              </div>
              <div>
                <dt>Can write / events</dt>
                <dd>
                  {displayedAppApprovedExecutionReceipt.readiness
                    .canWriteFilesystem
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedAppApprovedExecutionReceipt.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can apply / rollback</dt>
                <dd>
                  {displayedAppApprovedExecutionReceipt.readiness.canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedAppApprovedExecutionReceipt.readiness.canRollback
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can git / shell</dt>
                <dd>
                  {displayedAppApprovedExecutionReceipt.readiness.canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedAppApprovedExecutionReceipt.readiness
                    .canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>App can execute</dt>
                <dd>
                  {displayedAppApprovedExecutionReceipt.readiness.appCanExecute
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>
            <p className="fieldHelp">
              {summarizeAppApprovedExecutionReceiptView(
                displayedAppApprovedExecutionReceipt
              )}
            </p>
            {displayedAppApprovedExecutionReceipt.findings.length > 0 ? (
              <ol className="timeline">
                {displayedAppApprovedExecutionReceipt.findings.map(
                  (finding) => (
                    <li key={`${finding.code}-${finding.path ?? "scope"}`}>
                      <span className="timelineMeta">
                        {finding.severity} · {finding.code}
                      </span>
                      <span>{finding.safeMessage}</span>
                    </li>
                  )
                )}
              </ol>
            ) : null}
            <p className="fieldHelp">
              {displayedAppApprovedExecutionReceipt.nextAction}
            </p>
          </section>

          <section className="eventPanel" aria-label="Approved Execution">
            <div className="panelHeader">
              <h2>Approved Execution</h2>
              <span className="muted">Human approved / narrow write path</span>
              {appApprovedApplyResult !== undefined ? (
                <span className="muted">Rollback available</span>
              ) : null}
            </div>
            <p className="fieldHelp">
              Runs only the fixed approved apply or rollback command after the
              receipt, typed confirmation, proposal, validation, audit,
              approval, path, and byte gates pass. No generic command UI, Git,
              shell, PermissionLease, native bridge, or desktop action is
              available.
            </p>
            <label>
              Explicit content for create/update
              <textarea
                value={appApprovedExecutionContentDraft}
                onChange={(event) =>
                  setAppApprovedExecutionContentDraft(event.target.value)
                }
                placeholder="User-approved file content for the allowed path"
                spellCheck={false}
              />
            </label>
            <div className="buttonRow">
              <button
                type="button"
                className="primary"
                disabled={
                  !appApprovedExecutionFlowView.readiness.canApplyApprovedPatch
                }
                aria-disabled={
                  !appApprovedExecutionFlowView.readiness.canApplyApprovedPatch
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleApplyApprovedPatch();
                }}
              >
                Apply Approved Patch
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  !appApprovedExecutionFlowView.readiness
                    .canRollbackApprovedPatch
                }
                aria-disabled={
                  !appApprovedExecutionFlowView.readiness
                    .canRollbackApprovedPatch
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleRollbackApprovedPatch();
                }}
              >
                Rollback Approved Patch
              </button>
            </div>
            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{appApprovedExecutionFlowView.status}</dd>
              </div>
              <div>
                <dt>Receipt</dt>
                <dd>
                  {appApprovedExecutionFlowView.receiptKind} /{" "}
                  {appApprovedExecutionFlowView.receiptId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Allowed paths</dt>
                <dd>{appApprovedExecutionFlowView.allowedPathCount}</dd>
              </div>
              <div>
                <dt>Content summary</dt>
                <dd>
                  {appApprovedExecutionFlowView.contentDraftBytes} bytes /{" "}
                  {appApprovedExecutionFlowView.contentDraftLineCount} lines /{" "}
                  {appApprovedExecutionFlowView.contentDraftHashPrefix ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Checkpoint</dt>
                <dd>
                  {appApprovedExecutionFlowView.checkpointId || "n/a"} /{" "}
                  {appApprovedExecutionFlowView.checkpointHashPrefix ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {appApprovedExecutionFlowView.blockerCount} /{" "}
                  {appApprovedExecutionFlowView.warningCount}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback enabled</dt>
                <dd>
                  {appApprovedExecutionFlowView.readiness.canApplyApprovedPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {appApprovedExecutionFlowView.readiness
                    .canRollbackApprovedPatch
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Summary event</dt>
                <dd>
                  {appApprovedExecutionFlowView.eventRecordSummary ?? "n/a"}
                </dd>
              </div>
            </dl>
            <p className="fieldHelp">
              {summarizeAppApprovedExecutionFlowView(
                appApprovedExecutionFlowView
              )}
            </p>
            {appApprovedExecutionError !== undefined ? (
              <p className="error">{appApprovedExecutionError}</p>
            ) : null}
            {appApprovedExecutionFlowView.applyResultSummary !== undefined ? (
              <p className="fieldHelp">
                {appApprovedExecutionFlowView.applyResultSummary}
              </p>
            ) : null}
            {appApprovedExecutionFlowView.rollbackResultSummary !==
            undefined ? (
              <p className="fieldHelp">
                {appApprovedExecutionFlowView.rollbackResultSummary}
              </p>
            ) : null}
            {appApprovedExecutionFlowView.findings.length > 0 ? (
              <ol className="timeline">
                {appApprovedExecutionFlowView.findings.map((finding) => (
                  <li key={finding.code}>
                    <span className="timelineMeta">
                      {finding.severity} · {finding.code}
                    </span>
                    <span>{finding.safeMessage}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            <p className="fieldHelp">
              {appApprovedExecutionFlowView.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Disposable Patch Apply Prototype"
          >
            <div className="panelHeader">
              <h2>Disposable Patch Apply Prototype</h2>
              <span className="muted">
                Disabled by default / disposable workspace only
              </span>
            </div>
            <p className="fieldHelp">
              Prototype apply is only allowed for explicit disposable workspace
              tests. Runtime helper can write only inside explicit
              disposableRoot. The App Shell cannot apply patches.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Apply to Disposable Workspace (disabled)
              </button>
            </div>
            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{disposablePatchApplyView.status}</dd>
              </div>
              <div>
                <dt>Runtime helper</dt>
                <dd>
                  {disposablePatchApplyView.runtimeHelperAvailable
                    ? "available for tests"
                    : "not connected"}
                </dd>
              </div>
              <div>
                <dt>App execution connected</dt>
                <dd>
                  {disposablePatchApplyView.appExecutionConnected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>User workspace mutation</dt>
                <dd>
                  {disposablePatchApplyView.userWorkspaceMutationEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Snapshot contract</dt>
                <dd>{disposablePatchApplyView.snapshotContractId || "n/a"}</dd>
              </div>
              <div>
                <dt>Proposal / validation / audit</dt>
                <dd>
                  {disposablePatchApplyView.proposalId || "n/a"} /{" "}
                  {disposablePatchApplyView.validationId || "n/a"} /{" "}
                  {disposablePatchApplyView.auditId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Approval / virtual / checkpoint</dt>
                <dd>
                  {disposablePatchApplyView.approvalDraftId || "n/a"} /{" "}
                  {disposablePatchApplyView.virtualApplyId || "n/a"} /{" "}
                  {disposablePatchApplyView.checkpointPreviewId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Operations</dt>
                <dd>{disposablePatchApplyView.operationCount}</dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {disposablePatchApplyView.blockerCount} /{" "}
                  {disposablePatchApplyView.warningCount}
                </dd>
              </div>
            </dl>
            {disposablePatchApplyView.warningCodes.length > 0 ? (
              <p className="fieldHelp">
                Warning codes:{" "}
                {disposablePatchApplyView.warningCodes.join(", ")}
              </p>
            ) : null}
            <p className="fieldHelp">{disposablePatchApplyView.nextAction}</p>
          </section>

          <section
            className="eventPanel"
            aria-label="Approval-Gated Disposable Apply"
          >
            <div className="panelHeader">
              <h2>Approval-Gated Disposable Apply</h2>
              <span className="muted">
                Disabled by default / no user workspace apply
              </span>
            </div>
            <p className="fieldHelp">
              Approval-gated apply is only available to runtime tests for
              explicit disposable workspaces. The App Shell cannot execute
              apply. Approval receipt is summary-only and not a PermissionLease.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Apply with Approval Gate (disabled)
              </button>
            </div>
            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{approvalGatedDisposableApplyView.status}</dd>
              </div>
              <div>
                <dt>Runtime helper</dt>
                <dd>
                  {approvalGatedDisposableApplyView.runtimeHelperAvailable
                    ? "available for tests"
                    : "not connected"}
                </dd>
              </div>
              <div>
                <dt>App execution connected</dt>
                <dd>
                  {approvalGatedDisposableApplyView.appExecutionConnected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>User workspace apply</dt>
                <dd>
                  {approvalGatedDisposableApplyView.userWorkspaceMutationEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Receipt input</dt>
                <dd>
                  {approvalGatedDisposableApplyView.approvalReceiptInputEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>PermissionLease issuing</dt>
                <dd>
                  {approvalGatedDisposableApplyView.permissionLeaseIssuingEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Snapshot contract</dt>
                <dd>
                  {approvalGatedDisposableApplyView.snapshotContractId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Proposal / validation / audit</dt>
                <dd>
                  {approvalGatedDisposableApplyView.proposalId || "n/a"} /{" "}
                  {approvalGatedDisposableApplyView.validationId || "n/a"} /{" "}
                  {approvalGatedDisposableApplyView.auditId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Approval / virtual / checkpoint</dt>
                <dd>
                  {approvalGatedDisposableApplyView.approvalDraftId || "n/a"} /{" "}
                  {approvalGatedDisposableApplyView.virtualApplyId || "n/a"} /{" "}
                  {approvalGatedDisposableApplyView.checkpointPreviewId ||
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Operations</dt>
                <dd>{approvalGatedDisposableApplyView.operationCount}</dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {approvalGatedDisposableApplyView.blockerCount} /{" "}
                  {approvalGatedDisposableApplyView.warningCount}
                </dd>
              </div>
            </dl>
            {approvalGatedDisposableApplyView.warningCodes.length > 0 ? (
              <p className="fieldHelp">
                Warning codes:{" "}
                {approvalGatedDisposableApplyView.warningCodes.join(", ")}
              </p>
            ) : null}
            <p className="fieldHelp">
              {approvalGatedDisposableApplyView.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Disposable Patch Rollback Prototype"
          >
            <div className="panelHeader">
              <h2>Disposable Patch Rollback Prototype</h2>
              <span className="muted">
                Disabled by default / disposable workspace only
              </span>
            </div>
            <p className="fieldHelp">
              Prototype rollback is only allowed for explicit disposable
              workspace tests. The App Shell does not rollback the user
              workspace.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Rollback Disposable Patch (disabled)
              </button>
            </div>
            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{disposablePatchRollbackView.status}</dd>
              </div>
              <div>
                <dt>Runtime helper</dt>
                <dd>
                  {disposablePatchRollbackView.runtimeHelperAvailable
                    ? "available for tests"
                    : "not connected"}
                </dd>
              </div>
              <div>
                <dt>App execution connected</dt>
                <dd>
                  {disposablePatchRollbackView.appExecutionConnected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>User workspace rollback</dt>
                <dd>
                  {disposablePatchRollbackView.userWorkspaceMutationEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Preimage input</dt>
                <dd>
                  {disposablePatchRollbackView.preimageInputEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Apply / checkpoint</dt>
                <dd>
                  {disposablePatchRollbackView.applyId || "n/a"} /{" "}
                  {disposablePatchRollbackView.checkpointPreviewId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Snapshot contract</dt>
                <dd>
                  {disposablePatchRollbackView.snapshotContractId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Proposal / validation / audit</dt>
                <dd>
                  {disposablePatchRollbackView.proposalId || "n/a"} /{" "}
                  {disposablePatchRollbackView.validationId || "n/a"} /{" "}
                  {disposablePatchRollbackView.auditId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Approval / virtual</dt>
                <dd>
                  {disposablePatchRollbackView.approvalDraftId || "n/a"} /{" "}
                  {disposablePatchRollbackView.virtualApplyId || "n/a"}
                </dd>
              </div>
              <div>
                <dt>Operations</dt>
                <dd>{disposablePatchRollbackView.operationCount}</dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {disposablePatchRollbackView.blockerCount} /{" "}
                  {disposablePatchRollbackView.warningCount}
                </dd>
              </div>
            </dl>
            {disposablePatchRollbackView.warningCodes.length > 0 ? (
              <p className="fieldHelp">
                Warning codes:{" "}
                {disposablePatchRollbackView.warningCodes.join(", ")}
              </p>
            ) : null}
            <p className="fieldHelp">
              {disposablePatchRollbackView.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Controlled Creation Replay Projection"
          >
            <div className="panelHeader">
              <h2>Controlled Creation Replay Projection</h2>
              <span className="muted">Replay preview / no execution</span>
            </div>
            <p className="fieldHelp">
              Projects the controlled-creation preview chain into a summary-only
              replay timeline. No events are written and no action is executed.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewControlledReplayProjection();
                }}
                disabled={controlledCreationReplayCandidate.status === "empty"}
                aria-disabled={
                  controlledCreationReplayCandidate.status === "empty"
                }
              >
                Preview Replay Projection
              </button>
            </div>

            {displayedControlledCreationReplay.status === "empty" ? (
              <p className="empty">
                Build controlled-creation preview stages first. Replay
                projection summaries will appear here before any execution.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedControlledCreationReplay.status}</dd>
              </div>
              <div>
                <dt>Projection</dt>
                <dd>{displayedControlledCreationReplay.projectionId}</dd>
              </div>
              <div>
                <dt>Chain</dt>
                <dd>{displayedControlledCreationReplay.chainId}</dd>
              </div>
              <div>
                <dt>Stages</dt>
                <dd>{displayedControlledCreationReplay.stageCount}</dd>
              </div>
              <div>
                <dt>Persisted / local / missing</dt>
                <dd>
                  {displayedControlledCreationReplay.persistedEventCount} /{" "}
                  {displayedControlledCreationReplay.localPreviewStageCount} /{" "}
                  {displayedControlledCreationReplay.missingStageCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings / findings</dt>
                <dd>
                  {displayedControlledCreationReplay.blockerCount} /{" "}
                  {displayedControlledCreationReplay.warningCount} /{" "}
                  {displayedControlledCreationReplay.findingCount}
                </dd>
              </div>
              <div>
                <dt>Hash chain</dt>
                <dd>
                  {displayedControlledCreationReplay.hashChainSummary.chainHash}
                </dd>
              </div>
              <div>
                <dt>No-compress</dt>
                <dd>
                  {displayedControlledCreationReplay.noCompressRequired
                    ? displayedControlledCreationReplay.contextPlacement
                    : "not required"}
                </dd>
              </div>
            </dl>

            <dl className="summaryGrid compact">
              <div>
                <dt>Can replay projection</dt>
                <dd>
                  {displayedControlledCreationReplay.readiness
                    .canReplayProjection
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can execute run</dt>
                <dd>
                  {displayedControlledCreationReplay.readiness.canExecuteRun
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can apply</dt>
                <dd>
                  {displayedControlledCreationReplay.readiness.canApplyPatch
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can rollback</dt>
                <dd>
                  {displayedControlledCreationReplay.readiness.canRollbackReal
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can write filesystem</dt>
                <dd>
                  {displayedControlledCreationReplay.readiness
                    .canWriteFilesystem
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can git / shell</dt>
                <dd>
                  {displayedControlledCreationReplay.readiness.canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedControlledCreationReplay.readiness.canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Projection hash</dt>
                <dd>{displayedControlledCreationReplay.projectionHash}</dd>
              </div>
            </dl>

            {displayedControlledCreationReplay.stages.length > 0 ? (
              <ol className="timeline">
                {displayedControlledCreationReplay.stages.map((stage) => (
                  <li key={stage.stageId}>
                    <span className="timelineMeta">
                      {stage.order}. {stage.kind} · {stage.source} ·{" "}
                      {stage.status}
                    </span>
                    <span>{stage.summary}</span>
                    <span className="timelineMeta">
                      hash {stage.hashPrefix} · blockers {stage.blockerCount} ·
                      warnings {stage.warningCount}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedControlledCreationReplay.findings.length > 0 ? (
              <ol className="timeline">
                {displayedControlledCreationReplay.findings.map((finding) => (
                  <li key={finding.findingId}>
                    <span className="timelineMeta">
                      {finding.kind} · {finding.severity} · {finding.code}
                    </span>
                    <span>{finding.summary}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            <p className="fieldHelp">
              {displayedControlledCreationReplay.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Sandbox Apply / Rollback Event Projection"
          >
            <div className="panelHeader">
              <h2>Sandbox Apply / Rollback Event Projection</h2>
              <span className="muted">Projection only / not written</span>
            </div>
            <p className="fieldHelp">
              Builds summary-only event previews for disposable apply and
              rollback results. The App Shell does not write these events or
              execute apply/rollback. Event previews are not written to
              EventStore.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewSandboxApplyRollbackEventProjection();
                }}
              >
                Preview Apply/Rollback Events
              </button>
            </div>

            {displayedSandboxApplyRollbackEventProjection.status === "empty" ? (
              <p className="empty">
                Connect disposable apply and rollback result summaries first.
                Event projection previews will appear here before any event
                write or execution.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedSandboxApplyRollbackEventProjection.status}</dd>
              </div>
              <div>
                <dt>Projection</dt>
                <dd>
                  {displayedSandboxApplyRollbackEventProjection.projectionId ||
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Events</dt>
                <dd>
                  {displayedSandboxApplyRollbackEventProjection.eventCount}
                </dd>
              </div>
              <div>
                <dt>Not-written events</dt>
                <dd>
                  {
                    displayedSandboxApplyRollbackEventProjection.notWrittenEventCount
                  }
                </dd>
              </div>
              <div>
                <dt>Apply / rollback events</dt>
                <dd>
                  {displayedSandboxApplyRollbackEventProjection.applyEventCount}{" "}
                  /{" "}
                  {
                    displayedSandboxApplyRollbackEventProjection.rollbackEventCount
                  }
                </dd>
              </div>
              <div>
                <dt>Existing persisted</dt>
                <dd>
                  {
                    displayedSandboxApplyRollbackEventProjection.existingPersistedEventCount
                  }
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings / findings</dt>
                <dd>
                  {displayedSandboxApplyRollbackEventProjection.blockerCount} /{" "}
                  {displayedSandboxApplyRollbackEventProjection.warningCount} /{" "}
                  {displayedSandboxApplyRollbackEventProjection.findingCount}
                </dd>
              </div>
              <div>
                <dt>Hash chain</dt>
                <dd>
                  {
                    displayedSandboxApplyRollbackEventProjection
                      .hashChainSummary.chainHash
                  }
                </dd>
              </div>
            </dl>

            <dl className="summaryGrid compact">
              <div>
                <dt>Can write events</dt>
                <dd>
                  {displayedSandboxApplyRollbackEventProjection.eventWritesEnabled
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can execute apply</dt>
                <dd>
                  {displayedSandboxApplyRollbackEventProjection.readiness
                    .canExecuteApply
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can execute rollback</dt>
                <dd>
                  {displayedSandboxApplyRollbackEventProjection.readiness
                    .canExecuteRollback
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can user workspace</dt>
                <dd>
                  {displayedSandboxApplyRollbackEventProjection.readiness
                    .canApplyToUserWorkspace
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Can git / shell</dt>
                <dd>
                  {displayedSandboxApplyRollbackEventProjection.readiness
                    .canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedSandboxApplyRollbackEventProjection.readiness
                    .canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Projection hash</dt>
                <dd>
                  {displayedSandboxApplyRollbackEventProjection.projectionHash}
                </dd>
              </div>
            </dl>

            <p className="fieldHelp">
              {summarizeSandboxApplyRollbackEventProjectionView(
                displayedSandboxApplyRollbackEventProjection
              )}
            </p>

            {displayedSandboxApplyRollbackEventProjection.eventPreviews.length >
            0 ? (
              <ol className="timeline">
                {displayedSandboxApplyRollbackEventProjection.eventPreviews.map(
                  (event) => (
                    <li key={event.eventId}>
                      <span className="timelineMeta">
                        {event.type} · notWritten{" "}
                        {event.notWritten ? "yes" : "no"}
                      </span>
                      <span>
                        ops {event.payloadSummary.operationCount ?? 0} · hash{" "}
                        {event.eventHash}
                      </span>
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedSandboxApplyRollbackEventProjection.findings.length >
            0 ? (
              <ol className="timeline">
                {displayedSandboxApplyRollbackEventProjection.findings.map(
                  (finding) => (
                    <li key={finding.findingId}>
                      <span className="timelineMeta">
                        {finding.kind} · {finding.severity} · {finding.code}
                      </span>
                      <span>{finding.summary}</span>
                    </li>
                  )
                )}
              </ol>
            ) : null}

            <p className="fieldHelp">
              {displayedSandboxApplyRollbackEventProjection.nextAction}
            </p>
          </section>

          <section className="eventPanel" aria-label="Agent Route Preview">
            <div className="panelHeader">
              <h2>Agent Route Preview</h2>
              <span className="muted">Runtime static router preview</span>
            </div>
            <p className="fieldHelp">
              Route generated from runtime static router helper. Shows the fixed
              role route that a future run would use. No agent is executed and
              no model request is sent.
            </p>

            {agentRoutePreview.status === "empty" ? (
              <p className="empty">
                Preview a local run draft first. Agent routes will appear here
                before any execution.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{agentRoutePreview.status}</dd>
              </div>
              <div>
                <dt>Intent</dt>
                <dd>{agentRoutePreview.intent}</dd>
              </div>
              <div>
                <dt>Roles</dt>
                <dd>{agentRoutePreview.roleCount}</dd>
              </div>
              <div>
                <dt>Capability refs</dt>
                <dd>{agentRoutePreview.capabilityRefCount}</dd>
              </div>
              <div>
                <dt>Profiles</dt>
                <dd>
                  {agentRoutePreview.modelProfileIds.length > 0
                    ? agentRoutePreview.modelProfileIds.join(", ")
                    : "n/a"}
                </dd>
              </div>
              <div>
                <dt>Execution enabled</dt>
                <dd>{agentRoutePreview.executionEnabled ? "yes" : "no"}</dd>
              </div>
            </dl>

            {agentRoutePreview.steps.length > 0 ? (
              <ol className="timeline">
                {agentRoutePreview.steps.map((step) => (
                  <li key={step.stepId}>
                    <span className="timelineMeta">
                      {step.order}. {step.role} · {step.modelProfileId}
                    </span>
                    <span>{step.purpose}</span>
                    <span className="timelineMeta">
                      Outputs: {step.expectedOutputs.join(", ")}
                    </span>
                    {step.allowedCapabilityRefs.length > 0 ? (
                      <span className="timelineMeta">
                        Capability refs:{" "}
                        {step.allowedCapabilityRefs
                          .map((ref) => ref.capabilityId)
                          .join(", ")}
                      </span>
                    ) : null}
                    {step.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {step.warningCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {agentRoutePreview.warnings.length > 0 ? (
              <p className="muted">
                warnings{" "}
                {agentRoutePreview.warnings
                  .map((warning) => warning.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">{agentRoutePreview.nextAction}</p>
          </section>

          <section className="eventPanel" aria-label="Capability Plan Preview">
            <div className="panelHeader">
              <h2>Capability Plan Preview</h2>
              <span className="muted">Runtime Capability Broker preview</span>
            </div>
            <p className="fieldHelp">
              Shows future capability needs as descriptors from the runtime
              Capability Broker preview helper. No capability is invoked and no
              permission lease is issued.
            </p>

            {capabilityPlanPreview.status === "empty" ? (
              <p className="empty">
                Preview a local run draft and agent route first. Capability
                plans will appear here before approval or execution.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{capabilityPlanPreview.status}</dd>
              </div>
              <div>
                <dt>Items</dt>
                <dd>{capabilityPlanPreview.itemCount}</dd>
              </div>
              <div>
                <dt>High risk</dt>
                <dd>{capabilityPlanPreview.highRiskCount}</dd>
              </div>
              <div>
                <dt>Disabled</dt>
                <dd>{capabilityPlanPreview.disabledCount}</dd>
              </div>
              <div>
                <dt>Approval required</dt>
                <dd>{capabilityPlanPreview.approvalRequiredCount}</dd>
              </div>
              <div>
                <dt>Lease required</dt>
                <dd>{capabilityPlanPreview.leaseRequiredCount}</dd>
              </div>
              <div>
                <dt>Execution enabled</dt>
                <dd>{capabilityPlanPreview.executionEnabled ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt>Lease issued</dt>
                <dd>{capabilityPlanPreview.leaseIssued ? "yes" : "no"}</dd>
              </div>
            </dl>

            {capabilityPlanPreview.items.length > 0 ? (
              <ol className="timeline">
                {capabilityPlanPreview.items.map((item) => (
                  <li key={item.capabilityId}>
                    <span className="timelineMeta">
                      {item.capabilityId} · {item.sourceType} · {item.category}
                    </span>
                    <span>{item.title}</span>
                    <span className="timelineMeta">
                      {item.riskLevel} · {item.invokePolicy} ·{" "}
                      {item.executionMode} · {item.planStatus}
                    </span>
                    <span className="timelineMeta">{item.inputSummary}</span>
                    {item.leasePreview?.required === true ? (
                      <span className="timelineMeta">
                        Lease: {item.leasePreview.status} ·{" "}
                        {item.leasePreview.reason}
                      </span>
                    ) : null}
                    {item.disabledReason !== undefined ? (
                      <span className="timelineMeta">
                        Disabled: {item.disabledReason}
                      </span>
                    ) : null}
                    {item.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {item.warningCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {capabilityPlanPreview.warnings.length > 0 ? (
              <p className="muted">
                warnings{" "}
                {capabilityPlanPreview.warnings
                  .map((warning) => warning.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">{capabilityPlanPreview.nextAction}</p>
          </section>

          <section className="eventPanel" aria-label="Memory Recall Preview">
            <div className="panelHeader">
              <h2>Memory Recall Preview</h2>
              <span className="muted">Runtime Memory Core preview</span>
            </div>
            <p className="fieldHelp">
              Recall generated from runtime Memory Core preview helper. Shows
              summary-only memory refs that a future run may recall into
              volatile_tail. Recall refs would enter volatile_tail. No memory is
              committed or persisted here.
            </p>

            {memoryRecallPreview.status === "empty" ? (
              <p className="empty">
                Preview a local run draft first. Memory recall summaries will
                appear here before context assembly.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{memoryRecallPreview.status}</dd>
              </div>
              <div>
                <dt>Intent</dt>
                <dd>{memoryRecallPreview.intent}</dd>
              </div>
              <div>
                <dt>Items</dt>
                <dd>{memoryRecallPreview.itemCount}</dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>{memoryRecallPreview.policyCount}</dd>
              </div>
              <div>
                <dt>Project facts</dt>
                <dd>{memoryRecallPreview.projectFactCount}</dd>
              </div>
              <div>
                <dt>Pitfalls</dt>
                <dd>{memoryRecallPreview.pitfallCount}</dd>
              </div>
              <div>
                <dt>High trust</dt>
                <dd>{memoryRecallPreview.highTrustCount}</dd>
              </div>
              <div>
                <dt>volatile_tail</dt>
                <dd>{memoryRecallPreview.volatileTailCount}</dd>
              </div>
              <div>
                <dt>Persistence</dt>
                <dd>
                  {memoryRecallPreview.persistenceConnected
                    ? "connected"
                    : "off"}
                </dd>
              </div>
              <div>
                <dt>Frozen prefix</dt>
                <dd>
                  {memoryRecallPreview.frozenPrefixIncluded
                    ? "included"
                    : "not included"}
                </dd>
              </div>
            </dl>

            <p className="fieldHelp">
              Query: {memoryRecallPreview.querySummary.objectiveSummary} ·
              criteria{" "}
              {memoryRecallPreview.querySummary.acceptanceCriteriaCount}·
              workspace {memoryRecallPreview.querySummary.workspaceSummary}
            </p>

            {memoryRecallPreview.items.length > 0 ? (
              <ol className="timelineList">
                {memoryRecallPreview.items.map((item) => (
                  <li key={item.memoryId}>
                    <strong>{item.type}</strong> · {item.memoryId} ·{" "}
                    {item.namespace}
                    <span className="timelineMeta">
                      trust {item.trustLevel} · score {item.score} ·{" "}
                      {item.placement}
                    </span>
                    <span>{item.summary}</span>
                    <span className="timelineMeta">
                      provenance {item.provenanceRefCount} · evidence{" "}
                      {item.evidenceRefCount}
                    </span>
                    {item.tags.length > 0 ? (
                      <span className="timelineMeta">
                        Tags: {item.tags.join(", ")}
                      </span>
                    ) : null}
                    {item.reasonCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Reasons: {item.reasonCodes.join(", ")}
                      </span>
                    ) : null}
                    {item.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {item.warningCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {memoryRecallPreview.warnings.length > 0 ? (
              <p className="muted">
                warnings{" "}
                {memoryRecallPreview.warnings
                  .map((warning) => warning.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">{memoryRecallPreview.nextAction}</p>
          </section>

          <section className="eventPanel" aria-label="Context Cart">
            <div className="panelHeader">
              <h2>Context Cart / Rules Ledger</h2>
              <span className="muted">Read-only summary</span>
            </div>
            <p className="fieldHelp">
              Shows context placement, hashes, token estimates, and no-compress
              zones. Raw prompt and segment content are not displayed.
            </p>

            <section
              className="surfaceBox"
              aria-label="Context Assembly Preview"
            >
              <div className="panelHeader compactHeader">
                <h2>Context Assembly Preview</h2>
                <span className="muted">Preview only</span>
              </div>
              <p className="fieldHelp">
                Builds a local context summary from Run Draft and Workspace
                Index refs. No prompt is assembled and no model request is sent.
              </p>
              <div className="buttonRow">
                <button
                  type="button"
                  className="secondary"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handlePreviewContextAssembly();
                  }}
                  disabled={displayedRunDraft.status === "empty"}
                  aria-disabled={displayedRunDraft.status === "empty"}
                >
                  Preview Context Summary
                </button>
              </div>
              <dl className="summaryGrid compact">
                <div>
                  <dt>Status</dt>
                  <dd>{displayedContextAssembly.status}</dd>
                </div>
                <div>
                  <dt>Segments</dt>
                  <dd>{displayedContextAssembly.totalSegments}</dd>
                </div>
                <div>
                  <dt>Approx tokens</dt>
                  <dd>{displayedContextAssembly.totalTokenEstimate}</dd>
                </div>
                <div>
                  <dt>Frozen segments</dt>
                  <dd>{displayedContextAssembly.frozenPrefixSegmentCount}</dd>
                </div>
                <div>
                  <dt>Volatile segments</dt>
                  <dd>{displayedContextAssembly.volatileTailSegmentCount}</dd>
                </div>
                <div>
                  <dt>No-compress</dt>
                  <dd>{displayedContextAssembly.noCompressSegmentCount}</dd>
                </div>
                <div>
                  <dt>Cache boundary</dt>
                  <dd>{displayedContextAssembly.cacheBoundary.status}</dd>
                </div>
                <div>
                  <dt>Event writes</dt>
                  <dd>
                    {displayedContextAssembly.eventWritesEnabled
                      ? "enabled"
                      : "disabled"}
                  </dd>
                </div>
              </dl>
              <p className="fieldHelp">
                {summarizeContextAssemblyPreview(displayedContextAssembly)}
              </p>
              <div className="surfaceStack">
                {displayedContextAssembly.layers.map((layer) => (
                  <section className="surfaceBox" key={layer.layer}>
                    <div className="panelHeader compactHeader">
                      <h2>{layer.layer}</h2>
                      <span className="muted">{layer.placement}</span>
                    </div>
                    <dl className="summaryGrid compact">
                      <div>
                        <dt>Segments</dt>
                        <dd>{layer.segmentCount}</dd>
                      </div>
                      <div>
                        <dt>Tokens</dt>
                        <dd>{layer.tokenEstimate}</dd>
                      </div>
                      <div>
                        <dt>Hash prefix</dt>
                        <dd>{layer.hashPrefix}</dd>
                      </div>
                      <div>
                        <dt>Source refs</dt>
                        <dd>{layer.sourceRefCount}</dd>
                      </div>
                      <div>
                        <dt>Warnings</dt>
                        <dd>
                          {layer.warningCodes.length > 0
                            ? layer.warningCodes.join(", ")
                            : "none"}
                        </dd>
                      </div>
                    </dl>
                  </section>
                ))}
              </div>
              {displayedContextAssembly.segments.length > 0 ? (
                <ol className="timeline">
                  {displayedContextAssembly.segments.map((segment) => (
                    <li key={segment.segmentId}>
                      <span className="timelineMeta">
                        {segment.layer} · {segment.placement} ·{" "}
                        {segment.sourceKind}
                      </span>
                      <span>
                        {segment.title} · {segment.hashPrefix} · tokens{" "}
                        {segment.tokenEstimate}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {displayedContextAssembly.cacheBoundary.reasonCodes.length > 0 ? (
                <p className="muted">
                  cache{" "}
                  {displayedContextAssembly.cacheBoundary.reasonCodes.join(
                    ", "
                  )}
                </p>
              ) : null}
              {displayedContextAssembly.warnings.length > 0 ? (
                <p className="muted">
                  warnings{" "}
                  {displayedContextAssembly.warnings
                    .map((warning) => warning.code)
                    .join(", ")}
                </p>
              ) : null}
              <p className="fieldHelp">{displayedContextAssembly.nextAction}</p>
            </section>

            {contextCart.status === "empty" ? (
              <p className="empty">
                No context assembly report is connected yet. Future run drafts
                will show context placement here before model execution.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Segments</dt>
                <dd>{contextCart.totalSegments}</dd>
              </div>
              <div>
                <dt>Token estimate</dt>
                <dd>{contextCart.totalTokenEstimate}</dd>
              </div>
              <div>
                <dt>Frozen prefix</dt>
                <dd>{contextCart.frozenPrefixHash}</dd>
              </div>
              <div>
                <dt>Volatile tail</dt>
                <dd>{contextCart.volatileTailHash}</dd>
              </div>
              <div>
                <dt>No-compress zones</dt>
                <dd>{contextCart.noCompressZoneCount}</dd>
              </div>
              <div>
                <dt>Placements</dt>
                <dd>{contextCart.placementDecisionCount}</dd>
              </div>
              <div>
                <dt>Cache boundary</dt>
                <dd>
                  {contextCart.cacheBoundaryChanged ? "changed" : "unchanged"}
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{contextCart.source}</dd>
              </div>
            </dl>

            <div className="surfaceStack">
              {contextCart.layers.map((layer) => (
                <section className="surfaceBox" key={layer.layer}>
                  <div className="panelHeader compactHeader">
                    <h2>{layer.layer}</h2>
                    <span className="muted">{layer.placement}</span>
                  </div>
                  <dl className="summaryGrid compact">
                    <div>
                      <dt>Segments</dt>
                      <dd>{layer.segmentCount}</dd>
                    </div>
                    <div>
                      <dt>Tokens</dt>
                      <dd>{layer.tokenEstimate}</dd>
                    </div>
                    <div>
                      <dt>Hash prefix</dt>
                      <dd>{layer.hashPrefix}</dd>
                    </div>
                    <div>
                      <dt>Volatile only</dt>
                      <dd>{layer.volatileOnly ? "yes" : "no"}</dd>
                    </div>
                    <div>
                      <dt>No-compress</dt>
                      <dd>{layer.noCompressCount}</dd>
                    </div>
                    <div>
                      <dt>Warnings</dt>
                      <dd>
                        {layer.warningCodes.length > 0
                          ? layer.warningCodes.join(", ")
                          : "none"}
                      </dd>
                    </div>
                  </dl>
                </section>
              ))}
            </div>

            {contextCart.placementDecisions.length > 0 ? (
              <ol className="timeline">
                {contextCart.placementDecisions.map((decision) => (
                  <li key={`${decision.segmentId}-${decision.reasonCode}`}>
                    <span className="timelineMeta">
                      {decision.layer} · {decision.placement}
                    </span>
                    <span>{decision.reasonCode}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {contextCart.warnings.length > 0 ? (
              <p className="muted">
                warnings{" "}
                {contextCart.warnings.map((warning) => warning.code).join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">{contextCart.nextAction}</p>
          </section>

          <section className="eventPanel">
            <div className="panelHeader">
              <h2>Event Log / Replay</h2>
              <button
                type="button"
                className="secondary"
                disabled={eventStatus === "loading"}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void refreshEvents();
                }}
              >
                {eventStatus === "loading" ? "Refreshing..." : "Refresh events"}
              </button>
            </div>

            {eventPanel === undefined && eventStatus !== "error" ? (
              <p className="empty">
                No events yet. Run Convert first, then refresh.
              </p>
            ) : null}

            {eventPanel !== undefined ? (
              <>
                <dl className="summaryGrid compact">
                  <div>
                    <dt>Events</dt>
                    <dd>{eventPanel.eventCount}</dd>
                  </div>
                  <div>
                    <dt>Displayed</dt>
                    <dd>{eventPanel.displayedEventCount}</dd>
                  </div>
                  <div>
                    <dt>Drafts</dt>
                    <dd>{eventPanel.draftCount}</dd>
                  </div>
                  <div>
                    <dt>Approved applies</dt>
                    <dd>{eventPanel.approvedApplyCount}</dd>
                  </div>
                  <div>
                    <dt>Approved rollbacks</dt>
                    <dd>{eventPanel.approvedRollbackCount}</dd>
                  </div>
                  <div>
                    <dt>Verification events</dt>
                    <dd>{eventPanel.verificationEventCount}</dd>
                  </div>
                  <div>
                    <dt>Live proposal events</dt>
                    <dd>{eventPanel.liveProposalEventCount}</dd>
                  </div>
                  <div>
                    <dt>Latest approved execution</dt>
                    <dd>
                      {eventPanel.latestApprovedExecutionSummary ?? "n/a"}
                    </dd>
                  </div>
                  <div>
                    <dt>Latest verification</dt>
                    <dd>{eventPanel.latestVerificationSummary ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Latest live proposal</dt>
                    <dd>{eventPanel.latestLiveProposalSummary ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Tasks completed</dt>
                    <dd>
                      {eventPanel.completedTaskCount} / {eventPanel.taskCount}
                    </dd>
                  </div>
                  <div>
                    <dt>Last event</dt>
                    <dd>{eventPanel.lastEventAt ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Safety scan</dt>
                    <dd>
                      {eventPanel.safetyOk
                        ? "OK"
                        : `${eventPanel.safetyFindingCount} warning(s)`}
                    </dd>
                  </div>
                </dl>
                <p className="fieldHelp">
                  Safety Scan is a summary-only check of events.jsonl. Raw CSV
                  and raw DOM are not displayed.
                </p>

                {eventPanel.emptyMessage !== undefined ? (
                  <p className="empty">{eventPanel.emptyMessage}</p>
                ) : null}

                {eventPanel.warnings.length > 0 ? (
                  <p className="muted">
                    warnings {eventPanel.warnings.join(", ")}
                  </p>
                ) : null}

                {eventPanel.timeline.length > 0 ? (
                  <ol className="timeline">
                    {eventPanel.timeline.map((item) => (
                      <li key={item.key}>
                        <span className="timelineMeta">
                          {item.ts} · {item.type}
                          {item.taskId !== "no task"
                            ? ` · ${item.taskIdShort}`
                            : ""}
                        </span>
                        <span>{item.summary}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </>
            ) : null}

            {eventStatus === "error" ? (
              <div className="errorBox">
                <strong>Event summary unavailable</strong>
                <p>{eventError}</p>
              </div>
            ) : null}
          </section>

          <section className="eventPanel" aria-label="Control Plane Projection">
            <div className="panelHeader">
              <h2>Control Plane Projection</h2>
              <span className="muted">
                Read-only projection from event summaries
              </span>
            </div>
            <p className="fieldHelp">
              Read-only projection from event summaries. No execution is
              triggered here.
            </p>

            {controlPlanePanel.status === "empty" ? (
              <p className="empty">
                No control-plane projection yet. Run Convert first, then refresh
                events.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Run status</dt>
                <dd>{controlPlanePanel.runStatus}</dd>
              </div>
              <div>
                <dt>Intent</dt>
                <dd>{controlPlanePanel.intent}</dd>
              </div>
              <div>
                <dt>Phase</dt>
                <dd>{controlPlanePanel.phase}</dd>
              </div>
              <div>
                <dt>Tasks completed</dt>
                <dd>
                  {controlPlanePanel.completedTaskCount} /{" "}
                  {controlPlanePanel.taskCount}
                </dd>
              </div>
              <div>
                <dt>Drafts / artifacts</dt>
                <dd>
                  {controlPlanePanel.draftCount} /{" "}
                  {controlPlanePanel.artifactRefs.length}
                </dd>
              </div>
              <div>
                <dt>Timeline</dt>
                <dd>{controlPlanePanel.timelineCount}</dd>
              </div>
              <div>
                <dt>Draft events</dt>
                <dd>{controlPlanePanel.draftEventCount}</dd>
              </div>
              <div>
                <dt>Verification events</dt>
                <dd>{controlPlanePanel.verificationEventCount}</dd>
              </div>
              <div>
                <dt>Last event</dt>
                <dd>{controlPlanePanel.lastEventAt}</dd>
              </div>
              <div>
                <dt>Safety</dt>
                <dd>{controlPlanePanel.safetyStatus}</dd>
              </div>
            </dl>

            {controlPlanePanel.artifactRefs.length > 0 ? (
              <ol className="timeline">
                {controlPlanePanel.artifactRefs.map((artifact) => (
                  <li key={artifact.id}>
                    <span className="timelineMeta">
                      {artifact.label} · {artifact.source}
                    </span>
                    <span>{artifact.relativePath}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {controlPlanePanel.latestDraftEventSummary !== undefined ? (
              <p className="fieldHelp">
                Latest draft event: {controlPlanePanel.latestDraftEventSummary}
              </p>
            ) : null}

            {controlPlanePanel.latestVerificationSummary !== undefined ? (
              <p className="fieldHelp">
                Latest verification event:{" "}
                {controlPlanePanel.latestVerificationSummary}
              </p>
            ) : null}

            {verificationLaneProjection.status !== "empty" ? (
              <p className="fieldHelp">
                Verification replay projection:{" "}
                {summarizeVerificationLaneProjectionView(
                  verificationLaneProjection
                )}
                . Evidence refs remain summary-only.
              </p>
            ) : null}

            {displayedControlledCreationReplay.status !== "empty" ? (
              <p className="fieldHelp">
                Controlled creation replay projection:{" "}
                {summarizeControlledCreationReplayProjectionView(
                  displayedControlledCreationReplay
                )}
                . This is a summary-only preview and not an executed run.
              </p>
            ) : null}

            {controlPlanePanel.warnings.length > 0 ? (
              <p className="muted">
                warnings{" "}
                {controlPlanePanel.warnings
                  .map((warning) => warning.code)
                  .join(", ")}
              </p>
            ) : null}

            {controlPlanePanel.status === "error" &&
            controlPlanePanel.safeMessage !== undefined ? (
              <div className="errorBox">
                <strong>Control projection warning</strong>
                <p>{controlPlanePanel.safeMessage}</p>
              </div>
            ) : null}

            <div
              className={
                controlPlanePanel.nextAction.severity === "error"
                  ? "errorBox"
                  : "statusBox"
              }
            >
              <strong>Next action</strong>
              <p>{controlPlanePanel.nextAction.label}</p>
            </div>
          </section>

          <section className="eventPanel" aria-label="App Workbench Surfaces">
            <div className="panelHeader">
              <h2>Approval / Diff / Audit Surfaces</h2>
              <span className="muted">
                Read-only. No approval, apply, rollback, commit, or execution
                controls.
              </span>
            </div>
            <p className="fieldHelp">
              Read-only surfaces for future proposals. No approval, apply,
              rollback, commit, or execution controls are available here.
            </p>

            <div className="surfaceStack">
              <section className="surfaceBox" aria-label="Approval Surface">
                <div className="panelHeader compactHeader">
                  <h2>Approval Surface</h2>
                  <span className="muted">
                    {workbenchSurfaces.approval.status}
                  </span>
                </div>
                {workbenchSurfaces.approval.itemCount === 0 ? (
                  <p className="empty">
                    {workbenchSurfaces.approval.emptyMessage}
                  </p>
                ) : null}
                <p className="fieldHelp">
                  {workbenchSurfaces.approval.nextAction}
                </p>
                {workbenchSurfaces.approval.items.length > 0 ? (
                  <ol className="timeline">
                    {workbenchSurfaces.approval.items.map((item) => (
                      <li key={item.id}>
                        <span className="timelineMeta">
                          {item.kind} · {item.status}
                        </span>
                        <span>{item.summary}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </section>

              <section className="surfaceBox" aria-label="Diff Surface">
                <div className="panelHeader compactHeader">
                  <h2>Diff Surface</h2>
                  <span className="muted">{workbenchSurfaces.diff.status}</span>
                </div>
                {workbenchSurfaces.diff.items.length === 0 ? (
                  <p className="empty">{workbenchSurfaces.diff.emptyMessage}</p>
                ) : null}
                <p className="fieldHelp">
                  No patch apply. Raw source and raw diff are not displayed.
                </p>
                <dl className="summaryGrid compact">
                  <div>
                    <dt>Files</dt>
                    <dd>{workbenchSurfaces.diff.fileCount}</dd>
                  </div>
                  <div>
                    <dt>Lines + / -</dt>
                    <dd>
                      {workbenchSurfaces.diff.linesAdded} /{" "}
                      {workbenchSurfaces.diff.linesRemoved}
                    </dd>
                  </div>
                </dl>
                <p className="fieldHelp">{workbenchSurfaces.diff.nextAction}</p>
                {workbenchSurfaces.diff.items.length > 0 ? (
                  <ol className="timeline">
                    {workbenchSurfaces.diff.items.map((item) => (
                      <li key={item.id}>
                        <span className="timelineMeta">
                          {item.status} · {item.riskLevel} ·{" "}
                          {item.requiresApproval
                            ? "approval required"
                            : "approval not requested"}
                        </span>
                        <span>{item.summary}</span>
                        {item.pathSummaries.length > 0 ? (
                          <span className="timelineMeta">
                            Paths: {item.pathSummaries.join(", ")}
                          </span>
                        ) : null}
                        {item.warningCodes.length > 0 ? (
                          <span className="timelineMeta">
                            Warnings: {item.warningCodes.join(", ")}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </section>

              <section className="surfaceBox" aria-label="Audit Surface">
                <div className="panelHeader compactHeader">
                  <h2>Audit Surface</h2>
                  <span className="muted">
                    {workbenchSurfaces.audit.status}
                  </span>
                </div>
                <dl className="summaryGrid compact">
                  <div>
                    <dt>Events</dt>
                    <dd>{workbenchSurfaces.audit.eventCount}</dd>
                  </div>
                  <div>
                    <dt>Displayed</dt>
                    <dd>{workbenchSurfaces.audit.displayedEventCount}</dd>
                  </div>
                  <div>
                    <dt>Timeline</dt>
                    <dd>{workbenchSurfaces.audit.timelineCount}</dd>
                  </div>
                  <div>
                    <dt>Verification events</dt>
                    <dd>{workbenchSurfaces.audit.verificationEventCount}</dd>
                  </div>
                  <div>
                    <dt>Verification refs</dt>
                    <dd>
                      {workbenchSurfaces.audit.verificationEvidenceRefCount}
                    </dd>
                  </div>
                  <div>
                    <dt>Verification status</dt>
                    <dd>{workbenchSurfaces.audit.latestVerificationStatus}</dd>
                  </div>
                  <div>
                    <dt>Safety</dt>
                    <dd>{workbenchSurfaces.audit.safetyStatus}</dd>
                  </div>
                  <div>
                    <dt>Last event</dt>
                    <dd>{workbenchSurfaces.audit.lastEventAt}</dd>
                  </div>
                  <div>
                    <dt>Warnings</dt>
                    <dd>
                      {workbenchSurfaces.audit.warningCodes.length > 0
                        ? workbenchSurfaces.audit.warningCodes.join(", ")
                        : "none"}
                    </dd>
                  </div>
                </dl>
                <p className="fieldHelp">
                  {workbenchSurfaces.audit.nextAction}
                </p>
              </section>
            </div>
          </section>

          <section className="eventPanel" aria-label="Memory Inspector">
            <div className="panelHeader">
              <h2>Memory Inspector</h2>
              <span className="muted">
                Read-only skeleton. Not connected to persistence.
              </span>
            </div>
            <p className="fieldHelp">
              Runtime Memory Core is available, but this inspector is read-only
              and not connected to persistence.
            </p>

            {memoryInspector.status === "empty" ? (
              <div className="statusBox">
                {memoryInspector.emptyMessages.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Policy</dt>
                <dd>{memoryInspector.typeCounts.policy}</dd>
              </div>
              <div>
                <dt>Project facts</dt>
                <dd>{memoryInspector.typeCounts.project_fact}</dd>
              </div>
              <div>
                <dt>Pitfalls</dt>
                <dd>{memoryInspector.typeCounts.pitfall}</dd>
              </div>
              <div>
                <dt>Candidates</dt>
                <dd>{memoryInspector.candidateCount}</dd>
              </div>
              <div>
                <dt>Committed</dt>
                <dd>{memoryInspector.committedCount}</dd>
              </div>
              <div>
                <dt>Recalled</dt>
                <dd>{memoryInspector.recalledCount}</dd>
              </div>
              <div>
                <dt>Revoked / expired</dt>
                <dd>
                  {memoryInspector.revokedCount} /{" "}
                  {memoryInspector.expiredCount}
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{memoryInspector.source}</dd>
              </div>
            </dl>

            {memoryInspector.candidates.length > 0 ? (
              <ol className="timeline">
                {memoryInspector.candidates.map((candidate) => (
                  <li key={candidate.candidateId}>
                    <span className="timelineMeta">
                      {candidate.proposedType} · {candidate.status} ·{" "}
                      {candidate.trustLevel}
                    </span>
                    <span>{candidate.proposedSummary}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {memoryInspector.items.length > 0 ? (
              <ol className="timeline">
                {memoryInspector.items.map((item) => (
                  <li key={item.memoryId}>
                    <span className="timelineMeta">
                      {item.type} · {item.status} · {item.trustLevel}
                    </span>
                    <span>{item.summary}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {memoryInspector.warnings.length > 0 ? (
              <p className="muted">
                warnings{" "}
                {memoryInspector.warnings
                  .map((warning) => warning.code)
                  .join(", ")}
              </p>
            ) : null}

            <div className="statusBox">
              <strong>Next action</strong>
              <p>{memoryInspector.nextAction}</p>
              <p className="muted">
                Commit gate UI is not enabled in this phase.
              </p>
            </div>
          </section>

          <nav className="docLinks" aria-label="Documentation links">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDocMessage("docs/web-table-to-csv-acceptance.md");
              }}
            >
              Web table acceptance
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDocMessage("docs/manual-smoke-v0.1.md");
              }}
            >
              Manual smoke
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDocMessage("docs/desktop-event-log-smoke-v0.1.md");
              }}
            >
              Event log smoke
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDocMessage("docs/threat-model-v0.1.md");
              }}
            >
              Threat model
            </button>
          </nav>
          {docMessage !== undefined ? (
            <p className="docHint">Local docs path: {docMessage}</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
