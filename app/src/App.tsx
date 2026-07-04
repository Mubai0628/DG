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
  commitProjectKnowledgeCandidate,
  expireProjectKnowledgeEntry,
  executeApprovedDesktopAction,
  executeApprovedExpandedDesktopAction,
  generateLiveDeepSeekPatchProposal,
  getDesktopAppVersion,
  listProjectKnowledge,
  loadWorkspaceEventSummary,
  liveProposalAllowedKeySourceRef,
  observeDesktopMetadata,
  recordApprovedUserWorkspaceExecutionEvent,
  recordControlRunDraftEvent,
  recordLiveProposalSummaryEvent,
  recordVerificationLaneEvent,
  revokeProjectKnowledgeEntry,
  rollbackApprovedUserWorkspacePatch,
  callMcpReadonlyTool,
  runDesktopWebTableToCsvFlow,
  runGitReadLane,
  runMcpReadonlyDiscovery,
  runShellVerificationLane,
  type ApprovedUserWorkspaceApplyResult,
  type ApprovedUserWorkspaceRollbackResult,
  type ApprovedUserWorkspaceExecutionEventRecordResult,
  type ApprovedDesktopActionCommandResult,
  type ApprovedExpandedDesktopActionCommandResult,
  type DesktopObservationCommandResult,
  type GitReadLane,
  type GitReadLaneResult,
  type LiveDeepSeekPatchProposalCommandRequest,
  type LiveDeepSeekPatchProposalCommandResult,
  type LiveProposalSummaryEventPreview,
  type LiveProposalSummaryEventRecordResult,
  type McpReadonlyDiscoverResult,
  type McpReadonlyToolCallCommandResult,
  type ProjectKnowledgeCommitResult,
  type ProjectKnowledgeLifecycleResult,
  type ProjectKnowledgeSnapshotResult,
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
  buildFixedMultiAgentRunView,
  summarizeFixedMultiAgentRunView,
  type FixedMultiAgentRunView
} from "./fixed-multi-agent-run-view.js";
import {
  buildFixedAgentReplayProjectionView,
  summarizeFixedAgentReplayProjectionView,
  type FixedAgentReplayProjectionView
} from "./fixed-agent-replay-projection-view.js";
import {
  buildAgentHandoffStateReviewView,
  summarizeAgentHandoffStateReviewView,
  type AgentHandoffStateReviewView
} from "./agent-handoff-state-review-view.js";
import {
  buildCapabilityHostSurfaceView,
  capabilityHostSurfaceWarningCodes,
  summarizeCapabilityHostSurfaceView,
  type CapabilityHostSurfaceView,
  type CapabilityHostSurfaceInput
} from "./capability-host-surface-view.js";
import {
  buildCapabilityHostAuditView,
  summarizeCapabilityHostAuditView,
  type CapabilityHostAuditView
} from "./capability-host-audit-view.js";
import {
  buildExternalCapabilityAuditSurfaceView,
  summarizeExternalCapabilityAuditSurfaceView,
  type ExternalCapabilityAuditSurfaceView
} from "./external-capability-audit-surface-view.js";
import {
  buildPluginSkillHostView,
  summarizePluginSkillHostView,
  type PluginSkillHostView
} from "./plugin-skill-host-view.js";
import {
  buildPluginSkillRedactionAuditView,
  summarizePluginSkillRedactionAuditView,
  type PluginSkillRedactionAuditView
} from "./plugin-skill-redaction-audit-view.js";
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
  buildCrossSurfaceWorkflowView,
  summarizeCrossSurfaceWorkflowView,
  type CrossSurfaceWorkflowView
} from "./cross-surface-workflow-view.js";
import {
  buildCrossSurfaceEvidenceView,
  summarizeCrossSurfaceEvidenceView,
  type CrossSurfaceEvidenceView
} from "./cross-surface-evidence-view.js";
import {
  buildEvidenceFreshnessDriftView,
  summarizeEvidenceFreshnessDriftView,
  type EvidenceFreshnessDriftView
} from "./evidence-freshness-drift-view.js";
import {
  buildApprovalConsistencyView,
  summarizeApprovalConsistencyView,
  type ApprovalConsistencyView
} from "./approval-consistency-view.js";
import {
  buildCapabilityPolicyEnforcementView,
  summarizeCapabilityPolicyEnforcementView,
  type CapabilityPolicyEnforcementView
} from "./capability-policy-enforcement-view.js";
import {
  buildCrossSurfaceReplayTimelineView,
  summarizeCrossSurfaceReplayTimelineView,
  type CrossSurfaceReplayTimelineView
} from "./cross-surface-replay-timeline-view.js";
import {
  buildCrossSurfaceReplayAuditView,
  summarizeCrossSurfaceReplayAuditView,
  type CrossSurfaceReplayAuditView
} from "./cross-surface-replay-audit-view.js";
import {
  buildCrossSurfaceApprovedSequence,
  summarizeCrossSurfaceApprovedSequence,
  type CrossSurfaceApprovedSequence
} from "../../runtime/src/workflows/cross-surface-approved-sequencer.js";
import {
  buildDesktopObserverView,
  desktopObserverEvidenceRefs,
  summarizeDesktopObserverView,
  type DesktopObserverView
} from "./desktop-observer-view.js";
import {
  buildDesktopActionProposalView,
  type DesktopActionProposalView
} from "./desktop-action-proposal-view.js";
import {
  buildExpandedDesktopActionProposalView,
  type ExpandedDesktopActionProposalView
} from "./expanded-desktop-action-proposal-view.js";
import {
  buildApprovedExpandedDesktopActionReceiptView,
  summarizeApprovedExpandedDesktopActionReceiptView,
  type ApprovedExpandedDesktopActionReceiptView
} from "./approved-expanded-desktop-action-receipt-view.js";
import {
  buildApprovedExpandedDesktopActionView,
  summarizeApprovedExpandedDesktopActionView,
  type ApprovedExpandedDesktopActionView
} from "./approved-expanded-desktop-action-view.js";
import {
  buildApprovedDesktopActionView,
  summarizeApprovedDesktopActionView,
  type ApprovedDesktopActionView
} from "./approved-desktop-action-view.js";
import {
  buildDesktopActionReplayView,
  type DesktopActionReplayView
} from "./desktop-action-replay-view.js";
import {
  buildMcpReadonlyConnectionView,
  summarizeMcpReadonlyConnectionView,
  type McpReadonlyConnectionView
} from "./mcp-readonly-connection-view.js";
import {
  buildMcpToolProposalView,
  mcpToolProposalApprovalRefs,
  mcpToolProposalWarningCodes,
  summarizeMcpToolProposalView,
  type McpToolProposalView
} from "./mcp-tool-proposal-view.js";
import {
  buildMcpReadonlyToolExecutionView,
  summarizeMcpReadonlyToolExecutionView,
  type McpReadonlyToolExecutionView
} from "./mcp-readonly-tool-execution-view.js";
import {
  buildMcpMetadataRedactionAuditView,
  summarizeMcpMetadataRedactionAuditView,
  type McpMetadataRedactionAuditView
} from "./mcp-metadata-redaction-audit-view.js";
import {
  buildProjectKnowledgeReviewView,
  summarizeProjectKnowledgeReviewView,
  type ProjectKnowledgeCandidateForm,
  type ProjectKnowledgeEntryType,
  type ProjectKnowledgeReviewView
} from "./project-knowledge-view.js";
import {
  buildProjectKnowledgeRecallView,
  summarizeProjectKnowledgeRecallView,
  type AppProjectKnowledgeRecallView
} from "./project-knowledge-recall-view.js";
import {
  buildE2ECodingTaskWizardView,
  summarizeE2ECodingTaskWizardView,
  type E2ECodingTaskWizardView
} from "./e2e-coding-task-wizard-view.js";
import {
  buildE2ECodingTaskSequencerView,
  summarizeE2ECodingTaskSequencerView,
  type E2ECodingTaskSequencerView
} from "./e2e-coding-task-sequencer-view.js";
import {
  buildE2ETaskRecoveryView,
  summarizeE2ETaskRecoveryView,
  type E2ETaskRecoveryView
} from "./e2e-task-recovery-view.js";
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
  buildApprovedExecutionRecoveryView,
  summarizeApprovedExecutionRecoveryView,
  type ApprovedExecutionRecoveryView
} from "./approved-execution-recovery-view.js";
import {
  buildApprovedExecutionReplayTimelineView,
  summarizeApprovedExecutionReplayTimelineView,
  type ApprovedExecutionReplayTimelineView
} from "./approved-execution-replay-timeline-view.js";
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
type McpReadonlyConnectionRunStatus = "idle" | "running" | "done" | "error";

const defaultMcpReadonlyProfileJson = JSON.stringify(
  {
    profileId: "mcp.docs.injected",
    displayName: "Docs MCP injected metadata profile",
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
  },
  null,
  2
);

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
  const [desktopObserverPreview, setDesktopObserverPreview] = useState<
    DesktopObserverView | undefined
  >();
  const [desktopObserverStatus, setDesktopObserverStatus] = useState<
    "idle" | "observing" | "observed" | "failed"
  >("idle");
  const [desktopObserverResult, setDesktopObserverResult] = useState<
    DesktopObservationCommandResult | undefined
  >();
  const [desktopObserverError, setDesktopObserverError] = useState<
    string | undefined
  >();
  const [desktopActionProposalText, setDesktopActionProposalText] =
    useState("");
  const [desktopActionProposalPreview, setDesktopActionProposalPreview] =
    useState<DesktopActionProposalView | undefined>();
  const [
    expandedDesktopActionProposalText,
    setExpandedDesktopActionProposalText
  ] = useState("");
  const [
    expandedDesktopActionProposalPreview,
    setExpandedDesktopActionProposalPreview
  ] = useState<ExpandedDesktopActionProposalView | undefined>();
  const [
    approvedExpandedDesktopActionTypedConfirmation,
    setApprovedExpandedDesktopActionTypedConfirmation
  ] = useState("");
  const [
    approvedExpandedDesktopActionReceiptPreview,
    setApprovedExpandedDesktopActionReceiptPreview
  ] = useState<ApprovedExpandedDesktopActionReceiptView | undefined>();
  const [
    approvedExpandedDesktopActionPreview,
    setApprovedExpandedDesktopActionPreview
  ] = useState<ApprovedExpandedDesktopActionView | undefined>();
  const [
    approvedExpandedDesktopActionStatus,
    setApprovedExpandedDesktopActionStatus
  ] = useState<"idle" | "executing" | "executed" | "failed">("idle");
  const [
    approvedExpandedDesktopActionResult,
    setApprovedExpandedDesktopActionResult
  ] = useState<ApprovedExpandedDesktopActionCommandResult | undefined>();
  const [
    approvedExpandedDesktopActionError,
    setApprovedExpandedDesktopActionError
  ] = useState<string | undefined>();
  const [
    approvedDesktopActionTypedConfirmation,
    setApprovedDesktopActionTypedConfirmation
  ] = useState("");
  const [approvedDesktopActionPreview, setApprovedDesktopActionPreview] =
    useState<ApprovedDesktopActionView | undefined>();
  const [approvedDesktopActionStatus, setApprovedDesktopActionStatus] =
    useState<"idle" | "executing" | "executed" | "failed">("idle");
  const [approvedDesktopActionResult, setApprovedDesktopActionResult] =
    useState<ApprovedDesktopActionCommandResult | undefined>();
  const [approvedDesktopActionError, setApprovedDesktopActionError] = useState<
    string | undefined
  >();
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
  const [e2eCodingTaskWizardPreview, setE2ECodingTaskWizardPreview] = useState<
    E2ECodingTaskWizardView | undefined
  >();
  const [e2eCodingTaskSequencerPreview, setE2ECodingTaskSequencerPreview] =
    useState<E2ECodingTaskSequencerView | undefined>();
  const [e2eTaskRecoveryPreview, setE2ETaskRecoveryPreview] = useState<
    E2ETaskRecoveryView | undefined
  >();
  const [e2eSequencerRollbackRequested, setE2ESequencerRollbackRequested] =
    useState(false);
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
  const [
    crossSurfaceWorkflowScenarioText,
    setCrossSurfaceWorkflowScenarioText
  ] = useState("");
  const [crossSurfaceWorkflowPreview, setCrossSurfaceWorkflowPreview] =
    useState<CrossSurfaceWorkflowView | undefined>();
  const [crossSurfaceEvidenceJsonText, setCrossSurfaceEvidenceJsonText] =
    useState("");
  const [crossSurfaceEvidencePreview, setCrossSurfaceEvidencePreview] =
    useState<CrossSurfaceEvidenceView | undefined>();
  const [evidenceFreshnessJsonText, setEvidenceFreshnessJsonText] =
    useState("");
  const [evidenceFreshnessPreview, setEvidenceFreshnessPreview] = useState<
    EvidenceFreshnessDriftView | undefined
  >();
  const [approvalConsistencyJsonText, setApprovalConsistencyJsonText] =
    useState("");
  const [approvalConsistencyPreview, setApprovalConsistencyPreview] = useState<
    ApprovalConsistencyView | undefined
  >();
  const [capabilityPolicyJsonText, setCapabilityPolicyJsonText] = useState("");
  const [capabilityPolicyPreview, setCapabilityPolicyPreview] = useState<
    CapabilityPolicyEnforcementView | undefined
  >();
  const [crossSurfaceReplayTimelineText, setCrossSurfaceReplayTimelineText] =
    useState("");
  const [
    crossSurfaceReplayTimelinePreview,
    setCrossSurfaceReplayTimelinePreview
  ] = useState<CrossSurfaceReplayTimelineView | undefined>();
  const [crossSurfaceReplayAuditText, setCrossSurfaceReplayAuditText] =
    useState("");
  const [crossSurfaceReplayAuditPreview, setCrossSurfaceReplayAuditPreview] =
    useState<CrossSurfaceReplayAuditView | undefined>();
  const [fixedMultiAgentRunPreview, setFixedMultiAgentRunPreview] = useState<
    FixedMultiAgentRunView | undefined
  >();
  const [
    fixedAgentReplayProjectionPreview,
    setFixedAgentReplayProjectionPreview
  ] = useState<FixedAgentReplayProjectionView | undefined>();
  const [agentHandoffStateReviewText, setAgentHandoffStateReviewText] =
    useState("");
  const [agentHandoffStateReviewPreview, setAgentHandoffStateReviewPreview] =
    useState<AgentHandoffStateReviewView | undefined>();
  const [mcpReadonlyProfileText, setMcpReadonlyProfileText] = useState(
    defaultMcpReadonlyProfileJson
  );
  const [mcpReadonlyTypedConfirmation, setMcpReadonlyTypedConfirmation] =
    useState("");
  const [mcpReadonlyConnectionStatus, setMcpReadonlyConnectionStatus] =
    useState<McpReadonlyConnectionRunStatus>("idle");
  const [mcpReadonlyDiscoverResult, setMcpReadonlyDiscoverResult] = useState<
    McpReadonlyDiscoverResult | undefined
  >();
  const [mcpReadonlyDiscoverError, setMcpReadonlyDiscoverError] = useState<
    string | undefined
  >();
  const [mcpReadonlyConnectionPreview, setMcpReadonlyConnectionPreview] =
    useState<McpReadonlyConnectionView | undefined>();
  const [mcpToolProposalSummaryText, setMcpToolProposalSummaryText] =
    useState("");
  const [mcpToolProposalPreview, setMcpToolProposalPreview] = useState<
    McpToolProposalView | undefined
  >();
  const [
    mcpReadonlyToolTypedConfirmation,
    setMcpReadonlyToolTypedConfirmation
  ] = useState("");
  const [mcpReadonlyToolArgumentSummary, setMcpReadonlyToolArgumentSummary] =
    useState("querySummaryHash=docs-safe; maxResults=3");
  const [mcpReadonlyToolExecutionPreview, setMcpReadonlyToolExecutionPreview] =
    useState<McpReadonlyToolExecutionView | undefined>();
  const [mcpReadonlyToolCallStatus, setMcpReadonlyToolCallStatus] =
    useState<McpReadonlyConnectionRunStatus>("idle");
  const [mcpReadonlyToolCallResult, setMcpReadonlyToolCallResult] = useState<
    McpReadonlyToolCallCommandResult | undefined
  >();
  const [mcpReadonlyToolCallError, setMcpReadonlyToolCallError] = useState<
    string | undefined
  >();
  const [
    mcpMetadataRedactionAuditPreview,
    setMcpMetadataRedactionAuditPreview
  ] = useState<McpMetadataRedactionAuditView | undefined>();
  const [capabilityHostManifestText, setCapabilityHostManifestText] =
    useState("");
  const [capabilityHostSourceType, setCapabilityHostSourceType] =
    useState<NonNullable<CapabilityHostSurfaceInput["sourceType"]>>(
      "mcp_server"
    );
  const [capabilityHostSurfacePreview, setCapabilityHostSurfacePreview] =
    useState<CapabilityHostSurfaceView | undefined>();
  const [capabilityHostAuditText, setCapabilityHostAuditText] = useState("");
  const [capabilityHostAuditPreview, setCapabilityHostAuditPreview] = useState<
    CapabilityHostAuditView | undefined
  >();
  const [
    externalCapabilityAuditSummaryText,
    setExternalCapabilityAuditSummaryText
  ] = useState("");
  const [
    externalCapabilityAuditSurfacePreview,
    setExternalCapabilityAuditSurfacePreview
  ] = useState<ExternalCapabilityAuditSurfaceView | undefined>();
  const [pluginSkillPluginManifestText, setPluginSkillPluginManifestText] =
    useState("");
  const [pluginSkillSkillManifestText, setPluginSkillSkillManifestText] =
    useState("");
  const [pluginSkillPackageMetadataText, setPluginSkillPackageMetadataText] =
    useState("");
  const [pluginSkillHostPreview, setPluginSkillHostPreview] = useState<
    PluginSkillHostView | undefined
  >();
  const [pluginSkillAuditText, setPluginSkillAuditText] = useState("");
  const [
    pluginSkillRedactionAuditPreview,
    setPluginSkillRedactionAuditPreview
  ] = useState<PluginSkillRedactionAuditView | undefined>();
  const [projectKnowledgeEntryType, setProjectKnowledgeEntryType] =
    useState<ProjectKnowledgeEntryType>("project_fact");
  const [projectKnowledgeNamespace, setProjectKnowledgeNamespace] =
    useState("project");
  const [projectKnowledgeSummary, setProjectKnowledgeSummary] = useState("");
  const [
    projectKnowledgeEvidenceRefsText,
    setProjectKnowledgeEvidenceRefsText
  ] = useState("");
  const [projectKnowledgeTagsText, setProjectKnowledgeTagsText] = useState("");
  const [projectKnowledgeTrustLevel, setProjectKnowledgeTrustLevel] = useState<
    "low" | "medium" | "high" | "trusted"
  >("high");
  const [projectKnowledgeTrustScore, setProjectKnowledgeTrustScore] =
    useState("0.9");
  const [projectKnowledgeHumanReviewed, setProjectKnowledgeHumanReviewed] =
    useState(false);
  const [projectKnowledgeReviewedBy, setProjectKnowledgeReviewedBy] = useState(
    "manual_user_preview"
  );
  const [projectKnowledgeSourceKind, setProjectKnowledgeSourceKind] =
    useState<ProjectKnowledgeCandidateForm["sourceKind"]>("human_reviewed");
  const [projectKnowledgePolicyScope, setProjectKnowledgePolicyScope] =
    useState("project");
  const [projectKnowledgeFactKind, setProjectKnowledgeFactKind] =
    useState("project_fact");
  const [projectKnowledgePitfallTrigger, setProjectKnowledgePitfallTrigger] =
    useState("");
  const [
    projectKnowledgePitfallMitigation,
    setProjectKnowledgePitfallMitigation
  ] = useState("");
  const [projectKnowledgePitfallSeverity, setProjectKnowledgePitfallSeverity] =
    useState<"low" | "medium" | "high">("medium");
  const [
    projectKnowledgeTypedConfirmation,
    setProjectKnowledgeTypedConfirmation
  ] = useState("");
  const [projectKnowledgeRevokeEntryId, setProjectKnowledgeRevokeEntryId] =
    useState("");
  const [
    projectKnowledgeRevokeConfirmation,
    setProjectKnowledgeRevokeConfirmation
  ] = useState("");
  const [projectKnowledgeExpireEntryId, setProjectKnowledgeExpireEntryId] =
    useState("");
  const [projectKnowledgeExpireReason, setProjectKnowledgeExpireReason] =
    useState("");
  const [projectKnowledgeSnapshot, setProjectKnowledgeSnapshot] = useState<
    ProjectKnowledgeSnapshotResult | undefined
  >();
  const [projectKnowledgeReviewPreview, setProjectKnowledgeReviewPreview] =
    useState<ProjectKnowledgeReviewView | undefined>();
  const [projectKnowledgeActionStatus, setProjectKnowledgeActionStatus] =
    useState<EventStatus>("idle");
  const [projectKnowledgeActionError, setProjectKnowledgeActionError] =
    useState<string | undefined>();
  const [projectKnowledgeLatestCommit, setProjectKnowledgeLatestCommit] =
    useState<ProjectKnowledgeCommitResult | undefined>();
  const [projectKnowledgeLatestLifecycle, setProjectKnowledgeLatestLifecycle] =
    useState<ProjectKnowledgeLifecycleResult | undefined>();
  const [projectKnowledgeRecallTagsText, setProjectKnowledgeRecallTagsText] =
    useState("");
  const [
    projectKnowledgeRecallIncludeIdsText,
    setProjectKnowledgeRecallIncludeIdsText
  ] = useState("");
  const [
    projectKnowledgeRecallExcludeIdsText,
    setProjectKnowledgeRecallExcludeIdsText
  ] = useState("");
  const [
    projectKnowledgeRecallMaxEntries,
    setProjectKnowledgeRecallMaxEntries
  ] = useState("6");
  const [
    projectKnowledgeRecallTrustThreshold,
    setProjectKnowledgeRecallTrustThreshold
  ] = useState("0.5");
  const [
    projectKnowledgePolicyRecallEnabled,
    setProjectKnowledgePolicyRecallEnabled
  ] = useState(false);
  const [projectKnowledgeRecallPreview, setProjectKnowledgeRecallPreview] =
    useState<AppProjectKnowledgeRecallView | undefined>();
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
  const [
    appApprovedExecutionRecoveryPreview,
    setAppApprovedExecutionRecoveryPreview
  ] = useState<ApprovedExecutionRecoveryView | undefined>();
  const [
    appApprovedExecutionReplayTimelinePreview,
    setAppApprovedExecutionReplayTimelinePreview
  ] = useState<ApprovedExecutionReplayTimelineView | undefined>();
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
  const desktopObserverCandidate = useMemo<DesktopObserverView>(
    () =>
      buildDesktopObserverView({
        observationResult: desktopObserverResult,
        observeStatus: desktopObserverStatus,
        observeError: desktopObserverError
      }),
    [desktopObserverError, desktopObserverResult, desktopObserverStatus]
  );
  const displayedDesktopObserver =
    desktopObserverPreview ?? desktopObserverCandidate;
  const desktopObservationEvidenceRefs = useMemo(
    () => desktopObserverEvidenceRefs(displayedDesktopObserver),
    [displayedDesktopObserver]
  );
  const desktopActionProposalCandidate = useMemo<DesktopActionProposalView>(
    () =>
      buildDesktopActionProposalView({
        proposalJsonText: desktopActionProposalText,
        sourceKind: "paste"
      }),
    [desktopActionProposalText]
  );
  const displayedDesktopActionProposal =
    desktopActionProposalPreview ?? buildDesktopActionProposalView();
  const expandedDesktopActionProposalCandidate =
    useMemo<ExpandedDesktopActionProposalView>(
      () =>
        buildExpandedDesktopActionProposalView({
          proposalJsonText: expandedDesktopActionProposalText,
          sourceKind: "paste"
        }),
      [expandedDesktopActionProposalText]
    );
  const displayedExpandedDesktopActionProposal =
    expandedDesktopActionProposalPreview ??
    buildExpandedDesktopActionProposalView();
  const approvedExpandedDesktopActionReceiptCandidate =
    useMemo<ApprovedExpandedDesktopActionReceiptView>(
      () =>
        buildApprovedExpandedDesktopActionReceiptView({
          expandedProposalView:
            displayedExpandedDesktopActionProposal.status === "empty"
              ? undefined
              : displayedExpandedDesktopActionProposal,
          typedConfirmation: approvedExpandedDesktopActionTypedConfirmation
        }),
      [
        approvedExpandedDesktopActionTypedConfirmation,
        displayedExpandedDesktopActionProposal
      ]
    );
  const displayedApprovedExpandedDesktopActionReceipt =
    approvedExpandedDesktopActionReceiptPreview ??
    buildApprovedExpandedDesktopActionReceiptView();
  const approvedExpandedDesktopActionCandidate =
    useMemo<ApprovedExpandedDesktopActionView>(
      () =>
        buildApprovedExpandedDesktopActionView({
          expandedProposalView:
            displayedExpandedDesktopActionProposal.status === "empty"
              ? undefined
              : displayedExpandedDesktopActionProposal,
          receiptView:
            displayedApprovedExpandedDesktopActionReceipt.status === "empty"
              ? undefined
              : displayedApprovedExpandedDesktopActionReceipt,
          commandStatus: approvedExpandedDesktopActionStatus,
          commandResult: approvedExpandedDesktopActionResult,
          commandError: approvedExpandedDesktopActionError
        }),
      [
        approvedExpandedDesktopActionError,
        approvedExpandedDesktopActionResult,
        approvedExpandedDesktopActionStatus,
        displayedApprovedExpandedDesktopActionReceipt,
        displayedExpandedDesktopActionProposal
      ]
    );
  const displayedApprovedExpandedDesktopAction =
    approvedExpandedDesktopActionPreview ??
    approvedExpandedDesktopActionCandidate;
  const approvedDesktopActionCandidate = useMemo<ApprovedDesktopActionView>(
    () =>
      buildApprovedDesktopActionView({
        proposalView: displayedDesktopActionProposal,
        typedConfirmation: approvedDesktopActionTypedConfirmation,
        commandStatus: approvedDesktopActionStatus,
        commandResult: approvedDesktopActionResult,
        commandError: approvedDesktopActionError
      }),
    [
      approvedDesktopActionError,
      approvedDesktopActionResult,
      approvedDesktopActionStatus,
      approvedDesktopActionTypedConfirmation,
      displayedDesktopActionProposal
    ]
  );
  const displayedApprovedDesktopAction =
    approvedDesktopActionPreview ?? approvedDesktopActionCandidate;
  const desktopActionReplayView = useMemo<DesktopActionReplayView>(
    () =>
      buildDesktopActionReplayView({
        commandResult: approvedDesktopActionResult,
        approvedDesktopActionView: displayedApprovedDesktopAction,
        expandedCommandResult: approvedExpandedDesktopActionResult,
        approvedExpandedDesktopActionView:
          displayedApprovedExpandedDesktopAction
      }),
    [
      approvedDesktopActionResult,
      approvedExpandedDesktopActionResult,
      displayedApprovedDesktopAction,
      displayedApprovedExpandedDesktopAction
    ]
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
  const capabilityHostSurfaceCandidate = useMemo<CapabilityHostSurfaceView>(
    () =>
      buildCapabilityHostSurfaceView({
        manifestJsonText: capabilityHostManifestText,
        sourceType: capabilityHostSourceType
      }),
    [capabilityHostManifestText, capabilityHostSourceType]
  );
  const displayedCapabilityHostSurface =
    capabilityHostSurfacePreview ?? buildCapabilityHostSurfaceView();
  const capabilityHostAuditCandidate = useMemo<CapabilityHostAuditView>(
    () =>
      buildCapabilityHostAuditView({
        capabilityHostSurface:
          displayedCapabilityHostSurface.status === "empty"
            ? undefined
            : displayedCapabilityHostSurface,
        summaryJsonText: capabilityHostAuditText
      }),
    [capabilityHostAuditText, displayedCapabilityHostSurface]
  );
  const displayedCapabilityHostAudit =
    capabilityHostAuditPreview ?? buildCapabilityHostAuditView();
  const externalCapabilityAuditSurfaceCandidate =
    useMemo<ExternalCapabilityAuditSurfaceView>(
      () =>
        buildExternalCapabilityAuditSurfaceView({
          capabilityHostAudit:
            displayedCapabilityHostAudit.status === "empty"
              ? undefined
              : displayedCapabilityHostAudit,
          hardeningSummaryJsonText: externalCapabilityAuditSummaryText
        }),
      [displayedCapabilityHostAudit, externalCapabilityAuditSummaryText]
    );
  const displayedExternalCapabilityAuditSurface =
    externalCapabilityAuditSurfacePreview ??
    buildExternalCapabilityAuditSurfaceView();
  const pluginSkillHostCandidate = useMemo<PluginSkillHostView>(
    () =>
      buildPluginSkillHostView({
        pluginManifestJsonText: pluginSkillPluginManifestText,
        skillManifestJsonText: pluginSkillSkillManifestText,
        packageMetadataJsonText: pluginSkillPackageMetadataText
      }),
    [
      pluginSkillPackageMetadataText,
      pluginSkillPluginManifestText,
      pluginSkillSkillManifestText
    ]
  );
  const displayedPluginSkillHost =
    pluginSkillHostPreview ?? buildPluginSkillHostView();
  const pluginSkillRedactionAuditCandidate =
    useMemo<PluginSkillRedactionAuditView>(
      () =>
        buildPluginSkillRedactionAuditView({
          pluginSkillHost:
            displayedPluginSkillHost.status === "empty"
              ? undefined
              : displayedPluginSkillHost,
          summaryJsonText: pluginSkillAuditText
        }),
      [displayedPluginSkillHost, pluginSkillAuditText]
    );
  const displayedPluginSkillRedactionAudit =
    pluginSkillRedactionAuditPreview ?? buildPluginSkillRedactionAuditView();
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
      ),
      ...capabilityHostSurfaceWarningCodes(capabilityHostSurfacePreview)
    ],
    [
      capabilityHostSurfacePreview,
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
          ...capabilityHostSurfaceWarningCodes(capabilityHostSurfacePreview),
          ...verificationLaneProjectionWarningCodes(verificationLaneProjection)
        ],
        verificationLaneProjection
      }),
    [
      controlPlanePanel,
      error,
      eventSummary,
      capabilityHostSurfacePreview,
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
        memoryInspector,
        desktopObservationEvidenceRefs
      }),
    [
      contextCart,
      desktopObservationEvidenceRefs,
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
  const fixedMultiAgentRunCandidate = useMemo<FixedMultiAgentRunView>(
    () =>
      buildFixedMultiAgentRunView({
        runDraft: displayedRunDraft,
        selectedIntent,
        objectiveSummary: displayedRunDraft.objectiveSummary,
        agentRoutePreview,
        capabilityPlanPreview
      }),
    [
      agentRoutePreview,
      capabilityPlanPreview,
      displayedRunDraft,
      selectedIntent
    ]
  );
  const displayedFixedMultiAgentRun =
    fixedMultiAgentRunPreview ?? buildFixedMultiAgentRunView();
  const fixedAgentReplayProjectionCandidate =
    useMemo<FixedAgentReplayProjectionView>(
      () =>
        buildFixedAgentReplayProjectionView({
          fixedMultiAgentRun: fixedMultiAgentRunPreview,
          eventSummary
        }),
      [eventSummary, fixedMultiAgentRunPreview]
    );
  const displayedFixedAgentReplayProjection =
    fixedAgentReplayProjectionPreview ?? buildFixedAgentReplayProjectionView();
  const agentHandoffStateReviewCandidate = useMemo<AgentHandoffStateReviewView>(
    () =>
      buildAgentHandoffStateReviewView({
        handoffJsonText: agentHandoffStateReviewText,
        sourceKind: "paste"
      }),
    [agentHandoffStateReviewText]
  );
  const displayedAgentHandoffStateReview =
    agentHandoffStateReviewPreview ?? buildAgentHandoffStateReviewView();
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
  const appApprovedExecutionRecoveryCandidate =
    useMemo<ApprovedExecutionRecoveryView>(
      () =>
        buildApprovedExecutionRecoveryView({
          approvedExecutionFlowView: appApprovedExecutionFlowView,
          applyResult: appApprovedApplyResult,
          rollbackResult: appApprovedRollbackResult,
          eventRecordResult: appApprovedExecutionEventResult,
          eventRecordError:
            (appApprovedApplyResult !== undefined ||
              appApprovedRollbackResult !== undefined) &&
            appApprovedExecutionEventResult === undefined
              ? appApprovedExecutionError
              : undefined,
          latestFailureSummary: appApprovedExecutionError
        }),
      [
        appApprovedApplyResult,
        appApprovedExecutionError,
        appApprovedExecutionEventResult,
        appApprovedExecutionFlowView,
        appApprovedRollbackResult
      ]
    );
  const displayedApprovedExecutionRecovery =
    appApprovedExecutionRecoveryPreview ?? buildApprovedExecutionRecoveryView();
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
  const e2eCodingTaskObjectiveSummary =
    liveProposalRequestObjective.trim() || objectiveDraft.trim();
  const e2eCodingTaskWizardCandidate = useMemo<E2ECodingTaskWizardView>(
    () =>
      buildE2ECodingTaskWizardView({
        objectiveSummary: e2eCodingTaskObjectiveSummary,
        liveProposalGenerationView: liveDeepSeekProposalGenerationView,
        modelPatchProposalImportView: modelPatchProposalImportPreview,
        modelProposalChainIntegrationView: modelProposalChainIntegrationPreview,
        patchApprovalDraftView: patchApprovalDraftPreview,
        patchVirtualApplyPreviewView: patchVirtualApplyPreview,
        patchRollbackCheckpointPreviewView: patchRollbackCheckpointPreview,
        verificationLaneProjectionView: verificationLaneProjection,
        replayProjectionView: controlledCreationReplayProjection
      }),
    [
      controlledCreationReplayProjection,
      e2eCodingTaskObjectiveSummary,
      liveDeepSeekProposalGenerationView,
      modelPatchProposalImportPreview,
      modelProposalChainIntegrationPreview,
      patchApprovalDraftPreview,
      patchRollbackCheckpointPreview,
      patchVirtualApplyPreview,
      verificationLaneProjection
    ]
  );
  const displayedE2ECodingTaskWizard =
    e2eCodingTaskWizardPreview ?? buildE2ECodingTaskWizardView();
  const e2eCodingTaskSequencerCandidate = useMemo<E2ECodingTaskSequencerView>(
    () =>
      buildE2ECodingTaskSequencerView({
        wizardView: e2eCodingTaskWizardCandidate,
        modelPatchProposalImportView: modelPatchProposalImportPreview,
        modelProposalChainIntegrationView: modelProposalChainIntegrationPreview,
        patchValidationPreview: patchProposalValidationPreview,
        patchDiffAuditPreview,
        patchApprovalDraft: patchApprovalDraftPreview,
        approvalReceiptView: displayedAppApprovedExecutionReceipt,
        approvedExecutionFlowView: appApprovedExecutionFlowView,
        applyResult: appApprovedApplyResult,
        rollbackResult: appApprovedRollbackResult,
        approvedExecutionEventResult: appApprovedExecutionEventResult,
        gitReadLaneResult,
        shellVerificationResult,
        gitVerificationEventResult,
        shellVerificationEventResult,
        verificationLaneProjectionView: verificationLaneProjection,
        userRequestedRollback: e2eSequencerRollbackRequested
      }),
    [
      appApprovedApplyResult,
      appApprovedExecutionEventResult,
      appApprovedExecutionFlowView,
      appApprovedRollbackResult,
      displayedAppApprovedExecutionReceipt,
      e2eCodingTaskWizardCandidate,
      e2eSequencerRollbackRequested,
      gitReadLaneResult,
      gitVerificationEventResult,
      modelPatchProposalImportPreview,
      modelProposalChainIntegrationPreview,
      patchApprovalDraftPreview,
      patchDiffAuditPreview,
      patchProposalValidationPreview,
      shellVerificationEventResult,
      shellVerificationResult,
      verificationLaneProjection
    ]
  );
  const displayedE2ECodingTaskSequencer =
    e2eCodingTaskSequencerPreview ?? buildE2ECodingTaskSequencerView();
  const e2eTaskRecoveryCandidate = useMemo<E2ETaskRecoveryView>(
    () =>
      buildE2ETaskRecoveryView({
        liveProposalGenerationView: liveDeepSeekProposalGenerationView,
        modelPatchProposalImportView: modelPatchProposalImportPreview,
        patchValidationPreview: patchProposalValidationPreview,
        approvalReceiptView: displayedAppApprovedExecutionReceipt,
        approvedExecutionFlowView: appApprovedExecutionFlowView,
        approvedExecutionError: appApprovedExecutionError,
        applyResult: appApprovedApplyResult,
        rollbackResult: appApprovedRollbackResult,
        approvedExecutionEventError:
          (appApprovedApplyResult !== undefined ||
            appApprovedRollbackResult !== undefined) &&
          appApprovedExecutionEventResult === undefined
            ? appApprovedExecutionError
            : undefined,
        liveProposalSummaryEventError,
        gitVerificationEventError: gitReadLaneError,
        shellVerificationResult,
        shellVerificationError,
        sequencerView: e2eCodingTaskSequencerCandidate,
        conversionError:
          error === undefined ? undefined : { safeMessage: error }
      }),
    [
      appApprovedApplyResult,
      appApprovedExecutionError,
      appApprovedExecutionEventResult,
      appApprovedExecutionFlowView,
      appApprovedRollbackResult,
      displayedAppApprovedExecutionReceipt,
      e2eCodingTaskSequencerCandidate,
      error,
      gitReadLaneError,
      liveDeepSeekProposalGenerationView,
      liveProposalSummaryEventError,
      modelPatchProposalImportPreview,
      patchProposalValidationPreview,
      shellVerificationError,
      shellVerificationResult
    ]
  );
  const displayedE2ETaskRecovery =
    e2eTaskRecoveryPreview ?? buildE2ETaskRecoveryView();
  const appApprovedExecutionReplayTimelineCandidate =
    useMemo<ApprovedExecutionReplayTimelineView>(
      () =>
        buildApprovedExecutionReplayTimelineView({
          eventSummary,
          liveProposalGenerationView: liveDeepSeekProposalGenerationView,
          modelPatchProposalImportView: modelPatchProposalImportPreview,
          patchValidationPreview: patchProposalValidationPreview,
          patchDiffAuditPreview,
          approvalReceiptView: displayedAppApprovedExecutionReceipt,
          approvedExecutionFlowView: appApprovedExecutionFlowView,
          applyResult: appApprovedApplyResult,
          rollbackResult: appApprovedRollbackResult,
          approvedExecutionError: appApprovedExecutionError,
          recoveryView: appApprovedExecutionRecoveryCandidate,
          verificationLaneProjection
        }),
      [
        appApprovedApplyResult,
        appApprovedExecutionError,
        appApprovedExecutionFlowView,
        appApprovedExecutionRecoveryCandidate,
        appApprovedRollbackResult,
        displayedAppApprovedExecutionReceipt,
        eventSummary,
        liveDeepSeekProposalGenerationView,
        modelPatchProposalImportPreview,
        patchDiffAuditPreview,
        patchProposalValidationPreview,
        verificationLaneProjection
      ]
    );
  const displayedApprovedExecutionReplayTimeline =
    appApprovedExecutionReplayTimelinePreview ??
    buildApprovedExecutionReplayTimelineView();
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
  const crossSurfaceWorkflowCandidate = useMemo<CrossSurfaceWorkflowView>(
    () =>
      buildCrossSurfaceWorkflowView({
        scenarioJsonText: crossSurfaceWorkflowScenarioText,
        sourceKind: "paste"
      }),
    [crossSurfaceWorkflowScenarioText]
  );
  const displayedCrossSurfaceWorkflow =
    crossSurfaceWorkflowPreview ?? buildCrossSurfaceWorkflowView();
  const crossSurfaceEvidenceCandidate = useMemo<CrossSurfaceEvidenceView>(
    () =>
      buildCrossSurfaceEvidenceView({
        evidenceJsonText: crossSurfaceEvidenceJsonText,
        sourceKind: "paste"
      }),
    [crossSurfaceEvidenceJsonText]
  );
  const displayedCrossSurfaceEvidence =
    crossSurfaceEvidencePreview ?? buildCrossSurfaceEvidenceView();
  const evidenceFreshnessCandidate = useMemo<EvidenceFreshnessDriftView>(
    () =>
      buildEvidenceFreshnessDriftView({
        freshnessJsonText: evidenceFreshnessJsonText,
        sourceKind: "paste"
      }),
    [evidenceFreshnessJsonText]
  );
  const displayedEvidenceFreshness =
    evidenceFreshnessPreview ?? buildEvidenceFreshnessDriftView();
  const approvalConsistencyCandidate = useMemo<ApprovalConsistencyView>(
    () =>
      buildApprovalConsistencyView({
        consistencyJsonText: approvalConsistencyJsonText,
        sourceKind: "paste"
      }),
    [approvalConsistencyJsonText]
  );
  const displayedApprovalConsistency =
    approvalConsistencyPreview ?? buildApprovalConsistencyView();
  const capabilityPolicyCandidate = useMemo<CapabilityPolicyEnforcementView>(
    () =>
      buildCapabilityPolicyEnforcementView({
        policyJsonText: capabilityPolicyJsonText,
        sourceKind: "paste"
      }),
    [capabilityPolicyJsonText]
  );
  const displayedCapabilityPolicy =
    capabilityPolicyPreview ?? buildCapabilityPolicyEnforcementView();
  const crossSurfaceReplayTimelineCandidate =
    useMemo<CrossSurfaceReplayTimelineView>(
      () =>
        buildCrossSurfaceReplayTimelineView({
          timelineJsonText: crossSurfaceReplayTimelineText,
          sourceKind: "paste"
        }),
      [crossSurfaceReplayTimelineText]
    );
  const displayedCrossSurfaceReplayTimeline =
    crossSurfaceReplayTimelinePreview ?? buildCrossSurfaceReplayTimelineView();
  const crossSurfaceReplayAuditCandidate = useMemo<CrossSurfaceReplayAuditView>(
    () =>
      buildCrossSurfaceReplayAuditView({
        replayAuditJsonText: crossSurfaceReplayAuditText,
        sourceKind: "paste"
      }),
    [crossSurfaceReplayAuditText]
  );
  const displayedCrossSurfaceReplayAudit =
    crossSurfaceReplayAuditPreview ?? buildCrossSurfaceReplayAuditView();
  const crossSurfaceApprovedSequence = useMemo<CrossSurfaceApprovedSequence>(
    () =>
      buildCrossSurfaceApprovedSequence({
        lanes: [],
        sourceKind: "app_preview"
      }),
    []
  );
  const mcpReadonlyConnectionCandidate = useMemo<McpReadonlyConnectionView>(
    () =>
      buildMcpReadonlyConnectionView({
        profileJsonText: mcpReadonlyProfileText,
        typedConfirmation: mcpReadonlyTypedConfirmation,
        discoveryResult: mcpReadonlyDiscoverResult,
        discoveryError: mcpReadonlyDiscoverError,
        inFlight: mcpReadonlyConnectionStatus === "running"
      }),
    [
      mcpReadonlyConnectionStatus,
      mcpReadonlyDiscoverError,
      mcpReadonlyDiscoverResult,
      mcpReadonlyProfileText,
      mcpReadonlyTypedConfirmation
    ]
  );
  const displayedMcpReadonlyConnection =
    mcpReadonlyConnectionPreview ?? mcpReadonlyConnectionCandidate;
  const mcpToolProposalCandidate = useMemo<McpToolProposalView>(
    () =>
      buildMcpToolProposalView({
        summaryJsonText: mcpToolProposalSummaryText,
        sourceKind: "paste"
      }),
    [mcpToolProposalSummaryText]
  );
  const displayedMcpToolProposal =
    mcpToolProposalPreview ?? mcpToolProposalCandidate;
  const mcpReadonlyToolExecutionCandidate =
    useMemo<McpReadonlyToolExecutionView>(
      () =>
        buildMcpReadonlyToolExecutionView({
          connectionProfileRef:
            displayedMcpReadonlyConnection.profileId ??
            "mcp-profile.docs-readonly",
          toolId: displayedMcpToolProposal.toolName ?? "docs.search",
          toolName: displayedMcpToolProposal.toolName ?? "docs.search",
          typedConfirmation: mcpReadonlyToolTypedConfirmation,
          argumentSummary: mcpReadonlyToolArgumentSummary,
          result: mcpReadonlyToolCallResult,
          errorSummary: mcpReadonlyToolCallError,
          inFlight: mcpReadonlyToolCallStatus === "running"
        }),
      [
        displayedMcpReadonlyConnection.profileId,
        displayedMcpToolProposal.toolName,
        mcpReadonlyToolArgumentSummary,
        mcpReadonlyToolCallError,
        mcpReadonlyToolCallResult,
        mcpReadonlyToolCallStatus,
        mcpReadonlyToolTypedConfirmation
      ]
    );
  const displayedMcpReadonlyToolExecution =
    mcpReadonlyToolExecutionPreview ?? mcpReadonlyToolExecutionCandidate;
  const mcpMetadataRedactionAuditCandidate =
    useMemo<McpMetadataRedactionAuditView>(
      () =>
        buildMcpMetadataRedactionAuditView({
          mcpReadonlyConnectionView:
            displayedMcpReadonlyConnection.status === "empty"
              ? undefined
              : displayedMcpReadonlyConnection,
          discoveryResult: mcpReadonlyDiscoverResult
        }),
      [displayedMcpReadonlyConnection, mcpReadonlyDiscoverResult]
    );
  const displayedMcpMetadataRedactionAudit =
    mcpMetadataRedactionAuditPreview ?? buildMcpMetadataRedactionAuditView();
  const projectKnowledgeReviewCandidate = useMemo<ProjectKnowledgeReviewView>(
    () =>
      buildProjectKnowledgeReviewView({
        workspaceRoot,
        snapshot: projectKnowledgeSnapshot,
        latestCommit: projectKnowledgeLatestCommit,
        latestLifecycle: projectKnowledgeLatestLifecycle,
        typedConfirmation: projectKnowledgeTypedConfirmation,
        revokeEntryId: projectKnowledgeRevokeEntryId,
        revokeTypedConfirmation: projectKnowledgeRevokeConfirmation,
        expireEntryId: projectKnowledgeExpireEntryId,
        expireReasonSummary: projectKnowledgeExpireReason,
        candidateForm: {
          type: projectKnowledgeEntryType,
          namespace: projectKnowledgeNamespace,
          summary: projectKnowledgeSummary,
          evidenceRefsText: projectKnowledgeEvidenceRefsText,
          tagsText: projectKnowledgeTagsText,
          trustLevel: projectKnowledgeTrustLevel,
          trustScore: Number(projectKnowledgeTrustScore),
          humanReviewed: projectKnowledgeHumanReviewed,
          reviewedBy: projectKnowledgeReviewedBy,
          sourceKind: projectKnowledgeSourceKind,
          policyScope: projectKnowledgePolicyScope,
          factKind: projectKnowledgeFactKind,
          triggerSummary: projectKnowledgePitfallTrigger,
          mitigationSummary: projectKnowledgePitfallMitigation,
          severity: projectKnowledgePitfallSeverity
        }
      }),
    [
      projectKnowledgeEntryType,
      projectKnowledgeEvidenceRefsText,
      projectKnowledgeExpireEntryId,
      projectKnowledgeExpireReason,
      projectKnowledgeFactKind,
      projectKnowledgeHumanReviewed,
      projectKnowledgeLatestCommit,
      projectKnowledgeLatestLifecycle,
      projectKnowledgeNamespace,
      projectKnowledgePitfallMitigation,
      projectKnowledgePitfallSeverity,
      projectKnowledgePitfallTrigger,
      projectKnowledgePolicyScope,
      projectKnowledgeReviewedBy,
      projectKnowledgeRevokeConfirmation,
      projectKnowledgeRevokeEntryId,
      projectKnowledgeSnapshot,
      projectKnowledgeSourceKind,
      projectKnowledgeSummary,
      projectKnowledgeTagsText,
      projectKnowledgeTrustLevel,
      projectKnowledgeTrustScore,
      projectKnowledgeTypedConfirmation,
      workspaceRoot
    ]
  );
  const displayedProjectKnowledgeReview =
    projectKnowledgeReviewPreview ??
    buildProjectKnowledgeReviewView({
      workspaceRoot,
      snapshot: projectKnowledgeSnapshot,
      latestCommit: projectKnowledgeLatestCommit,
      latestLifecycle: projectKnowledgeLatestLifecycle,
      typedConfirmation: projectKnowledgeTypedConfirmation,
      revokeEntryId: projectKnowledgeRevokeEntryId,
      revokeTypedConfirmation: projectKnowledgeRevokeConfirmation,
      expireEntryId: projectKnowledgeExpireEntryId,
      expireReasonSummary: projectKnowledgeExpireReason
    });
  const projectKnowledgeRecallCandidate =
    useMemo<AppProjectKnowledgeRecallView>(
      () =>
        buildProjectKnowledgeRecallView({
          projectKnowledgeReview: displayedProjectKnowledgeReview,
          taskObjective: objectiveDraft,
          intent: selectedIntent,
          workspaceRefs:
            loadedWorkspaceIndexRef?.workspaceIndexId !== undefined
              ? [loadedWorkspaceIndexRef.workspaceIndexId]
              : workspaceRoot.trim().length > 0
                ? [workspaceRoot.trim()]
                : [],
          tagsText: projectKnowledgeRecallTagsText,
          includeEntryIdsText: projectKnowledgeRecallIncludeIdsText,
          excludeEntryIdsText: projectKnowledgeRecallExcludeIdsText,
          maxEntries: Number(projectKnowledgeRecallMaxEntries),
          trustThreshold: Number(projectKnowledgeRecallTrustThreshold),
          policyRecallEnabled: projectKnowledgePolicyRecallEnabled
        }),
      [
        displayedProjectKnowledgeReview,
        loadedWorkspaceIndexRef?.workspaceIndexId,
        objectiveDraft,
        projectKnowledgePolicyRecallEnabled,
        projectKnowledgeRecallExcludeIdsText,
        projectKnowledgeRecallIncludeIdsText,
        projectKnowledgeRecallMaxEntries,
        projectKnowledgeRecallTagsText,
        projectKnowledgeRecallTrustThreshold,
        selectedIntent,
        workspaceRoot
      ]
    );
  const displayedProjectKnowledgeRecall =
    projectKnowledgeRecallPreview ?? buildProjectKnowledgeRecallView();
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
  useEffect(() => {
    setCrossSurfaceWorkflowPreview(undefined);
  }, [crossSurfaceWorkflowScenarioText]);
  useEffect(() => {
    setCrossSurfaceEvidencePreview(undefined);
  }, [crossSurfaceEvidenceJsonText]);
  useEffect(() => {
    setEvidenceFreshnessPreview(undefined);
  }, [evidenceFreshnessJsonText]);
  useEffect(() => {
    setApprovalConsistencyPreview(undefined);
  }, [approvalConsistencyJsonText]);
  useEffect(() => {
    setCapabilityPolicyPreview(undefined);
  }, [capabilityPolicyJsonText]);
  useEffect(() => {
    setCrossSurfaceReplayTimelinePreview(undefined);
  }, [crossSurfaceReplayTimelineText]);
  useEffect(() => {
    setCrossSurfaceReplayAuditPreview(undefined);
  }, [crossSurfaceReplayAuditText]);
  useEffect(() => {
    setFixedMultiAgentRunPreview(undefined);
  }, [
    agentRoutePreview.routeId,
    capabilityPlanPreview.source,
    displayedRunDraft.draftId
  ]);
  useEffect(() => {
    setFixedAgentReplayProjectionPreview(undefined);
  }, [eventSummary, fixedMultiAgentRunPreview]);
  useEffect(() => {
    setAgentHandoffStateReviewPreview(undefined);
  }, [agentHandoffStateReviewText]);
  useEffect(() => {
    setMcpReadonlyConnectionPreview(undefined);
    setMcpReadonlyDiscoverResult(undefined);
    setMcpReadonlyDiscoverError(undefined);
    setMcpReadonlyConnectionStatus("idle");
    setMcpMetadataRedactionAuditPreview(undefined);
  }, [mcpReadonlyProfileText, mcpReadonlyTypedConfirmation]);
  useEffect(() => {
    setMcpMetadataRedactionAuditPreview(undefined);
  }, [mcpReadonlyConnectionPreview, mcpReadonlyDiscoverResult]);
  useEffect(() => {
    setProjectKnowledgeReviewPreview(undefined);
  }, [
    projectKnowledgeEntryType,
    projectKnowledgeEvidenceRefsText,
    projectKnowledgeExpireEntryId,
    projectKnowledgeExpireReason,
    projectKnowledgeFactKind,
    projectKnowledgeHumanReviewed,
    projectKnowledgeNamespace,
    projectKnowledgePitfallMitigation,
    projectKnowledgePitfallSeverity,
    projectKnowledgePitfallTrigger,
    projectKnowledgePolicyScope,
    projectKnowledgeReviewedBy,
    projectKnowledgeRevokeConfirmation,
    projectKnowledgeRevokeEntryId,
    projectKnowledgeSourceKind,
    projectKnowledgeSummary,
    projectKnowledgeTagsText,
    projectKnowledgeTrustLevel,
    projectKnowledgeTrustScore,
    projectKnowledgeTypedConfirmation
  ]);
  useEffect(() => {
    setProjectKnowledgeRecallPreview(undefined);
  }, [
    loadedWorkspaceIndexRef?.workspaceIndexId,
    objectiveDraft,
    projectKnowledgeLatestCommit,
    projectKnowledgeLatestLifecycle,
    projectKnowledgePolicyRecallEnabled,
    projectKnowledgeRecallExcludeIdsText,
    projectKnowledgeRecallIncludeIdsText,
    projectKnowledgeRecallMaxEntries,
    projectKnowledgeRecallTagsText,
    projectKnowledgeRecallTrustThreshold,
    projectKnowledgeSnapshot,
    selectedIntent,
    workspaceRoot
  ]);
  useEffect(() => {
    setE2ECodingTaskWizardPreview(undefined);
  }, [
    controlledCreationReplayProjection,
    e2eCodingTaskObjectiveSummary,
    liveDeepSeekProposalGenerationView,
    modelPatchProposalImportPreview,
    modelProposalChainIntegrationPreview,
    patchApprovalDraftPreview,
    patchRollbackCheckpointPreview,
    patchVirtualApplyPreview,
    verificationLaneProjection
  ]);
  useEffect(() => {
    setE2ECodingTaskSequencerPreview(undefined);
  }, [
    appApprovedApplyResult,
    appApprovedExecutionEventResult,
    appApprovedExecutionFlowView,
    appApprovedRollbackResult,
    displayedAppApprovedExecutionReceipt,
    e2eCodingTaskWizardPreview,
    e2eSequencerRollbackRequested,
    gitReadLaneResult,
    gitVerificationEventResult,
    modelPatchProposalImportPreview,
    modelProposalChainIntegrationPreview,
    patchApprovalDraftPreview,
    patchDiffAuditPreview,
    patchProposalValidationPreview,
    shellVerificationEventResult,
    shellVerificationResult,
    verificationLaneProjection
  ]);
  useEffect(() => {
    setE2ETaskRecoveryPreview(undefined);
  }, [
    appApprovedApplyResult,
    appApprovedExecutionError,
    appApprovedExecutionEventResult,
    appApprovedExecutionFlowView,
    appApprovedRollbackResult,
    displayedAppApprovedExecutionReceipt,
    e2eCodingTaskSequencerCandidate,
    error,
    gitReadLaneError,
    liveDeepSeekProposalGenerationView,
    liveProposalSummaryEventError,
    modelPatchProposalImportPreview,
    patchProposalValidationPreview,
    shellVerificationError,
    shellVerificationResult
  ]);
  useEffect(() => {
    setAppApprovedExecutionRecoveryPreview(undefined);
  }, [
    appApprovedApplyResult,
    appApprovedExecutionError,
    appApprovedExecutionEventResult,
    appApprovedExecutionFlowView,
    appApprovedRollbackResult
  ]);
  useEffect(() => {
    setAppApprovedExecutionReplayTimelinePreview(undefined);
  }, [
    appApprovedApplyResult,
    appApprovedExecutionError,
    appApprovedExecutionFlowView,
    appApprovedExecutionRecoveryCandidate,
    appApprovedRollbackResult,
    displayedAppApprovedExecutionReceipt,
    eventSummary,
    liveDeepSeekProposalGenerationView,
    modelPatchProposalImportPreview,
    patchDiffAuditPreview,
    patchProposalValidationPreview,
    verificationLaneProjection
  ]);
  const contextAssemblyCandidate = useMemo<AppContextAssemblyPreviewView>(
    () =>
      buildContextAssemblyPreviewView({
        runDraft: displayedRunDraft,
        workspaceIndexBridge: loadedWorkspaceIndexRef,
        memoryRecallPreview,
        projectKnowledgeRecallPreview:
          displayedProjectKnowledgeRecall.status === "empty"
            ? undefined
            : displayedProjectKnowledgeRecall,
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
        desktopObservationEvidenceRefs,
        fixedMultiAgentRun: fixedMultiAgentRunPreview,
        mcpToolProposal: displayedMcpToolProposal,
        capabilityHostSurface: capabilityHostSurfacePreview,
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
      displayedProjectKnowledgeRecall,
      displayedDisposableWorkspaceSnapshot,
      capabilityHostSurfacePreview,
      displayedMcpToolProposal,
      fixedMultiAgentRunPreview,
      liveProposalPreviewGatePreview,
      modelProposalChainIntegrationPreview,
      modelPatchProposalImportPreview,
      displayedUserWorkspaceSnapshotBackup,
      displayedUserWorkspacePromotionReadiness,
      displayedSandboxApplyRollbackEventProjection,
      displayedRunDraft,
      desktopObservationEvidenceRefs,
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
          ...capabilityPlanApprovalRefs(capabilityPlanPreview),
          ...mcpToolProposalApprovalRefs(displayedMcpToolProposal)
        ],
        futureAuditWarningCodes: [
          ...patchProposalAuditWarningCodes,
          ...disposableWorkspaceSnapshotAuditWarningCodes,
          ...userWorkspaceSnapshotAuditWarningCodes,
          ...userWorkspacePromotionAuditWarningCodes,
          ...mcpToolProposalWarningCodes(displayedMcpToolProposal),
          ...capabilityHostSurfaceWarningCodes(capabilityHostSurfacePreview),
          ...verificationLaneProjectionWarningCodes(verificationLaneProjection)
        ],
        verificationLaneProjection
      }),
    [
      capabilityPlanPreview,
      capabilityHostSurfacePreview,
      controlPlanePanel,
      disposableWorkspaceSnapshotAuditWarningCodes,
      displayedMcpToolProposal,
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

  function handlePreviewDesktopObserverProfile(): void {
    setDesktopObserverPreview(desktopObserverCandidate);
  }

  async function handleObserveDesktopMetadata(): Promise<void> {
    if (desktopObserverCandidate.safeRequest === undefined) {
      setDesktopObserverPreview(desktopObserverCandidate);
      return;
    }

    setDesktopObserverStatus("observing");
    setDesktopObserverError(undefined);
    setDesktopObserverPreview(
      buildDesktopObserverView({ observeStatus: "observing" })
    );

    try {
      const observation = await observeDesktopMetadata(
        desktopObserverCandidate.safeRequest
      );
      setDesktopObserverResult(observation);
      setDesktopObserverStatus("observed");
      setDesktopObserverPreview(
        buildDesktopObserverView({
          observationResult: observation,
          observeStatus: "observed"
        })
      );
    } catch (caught) {
      const message = safeErrorMessage(caught);
      setDesktopObserverError(message);
      setDesktopObserverStatus("failed");
      setDesktopObserverPreview(
        buildDesktopObserverView({
          observeStatus: "failed",
          observeError: message
        })
      );
    }
  }

  function handlePreviewDesktopActionProposal(): void {
    setDesktopActionProposalPreview(desktopActionProposalCandidate);
    setApprovedDesktopActionPreview(undefined);
    setApprovedDesktopActionStatus("idle");
    setApprovedDesktopActionResult(undefined);
    setApprovedDesktopActionError(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handleClearDesktopActionProposal(): void {
    setDesktopActionProposalText("");
    setDesktopActionProposalPreview(undefined);
    setApprovedDesktopActionTypedConfirmation("");
    setApprovedDesktopActionPreview(undefined);
    setApprovedDesktopActionStatus("idle");
    setApprovedDesktopActionResult(undefined);
    setApprovedDesktopActionError(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewExpandedDesktopActionProposal(): void {
    setExpandedDesktopActionProposalPreview(
      expandedDesktopActionProposalCandidate
    );
    setApprovedExpandedDesktopActionReceiptPreview(undefined);
    setApprovedExpandedDesktopActionPreview(undefined);
    setApprovedExpandedDesktopActionStatus("idle");
    setApprovedExpandedDesktopActionResult(undefined);
    setApprovedExpandedDesktopActionError(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handleClearExpandedDesktopActionProposal(): void {
    setExpandedDesktopActionProposalText("");
    setExpandedDesktopActionProposalPreview(undefined);
    setApprovedExpandedDesktopActionTypedConfirmation("");
    setApprovedExpandedDesktopActionReceiptPreview(undefined);
    setApprovedExpandedDesktopActionPreview(undefined);
    setApprovedExpandedDesktopActionStatus("idle");
    setApprovedExpandedDesktopActionResult(undefined);
    setApprovedExpandedDesktopActionError(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handleBuildApprovedExpandedDesktopActionReceipt(): void {
    setApprovedExpandedDesktopActionReceiptPreview(
      approvedExpandedDesktopActionReceiptCandidate
    );
    setApprovedExpandedDesktopActionPreview(undefined);
    setApprovedExpandedDesktopActionStatus("idle");
    setApprovedExpandedDesktopActionResult(undefined);
    setApprovedExpandedDesktopActionError(undefined);
  }

  function handleClearApprovedExpandedDesktopActionReceipt(): void {
    setApprovedExpandedDesktopActionTypedConfirmation("");
    setApprovedExpandedDesktopActionReceiptPreview(undefined);
    setApprovedExpandedDesktopActionPreview(undefined);
    setApprovedExpandedDesktopActionStatus("idle");
    setApprovedExpandedDesktopActionResult(undefined);
    setApprovedExpandedDesktopActionError(undefined);
  }

  function handlePreviewApprovedExpandedDesktopAction(): void {
    setApprovedExpandedDesktopActionPreview(
      approvedExpandedDesktopActionCandidate
    );
  }

  async function handleExecuteApprovedExpandedDesktopAction(): Promise<void> {
    const request =
      approvedExpandedDesktopActionPreview?.commandRequest ??
      approvedExpandedDesktopActionCandidate.commandRequest;
    if (request === undefined) {
      setApprovedExpandedDesktopActionPreview(
        approvedExpandedDesktopActionCandidate
      );
      return;
    }

    setApprovedExpandedDesktopActionStatus("executing");
    setApprovedExpandedDesktopActionError(undefined);
    setApprovedExpandedDesktopActionPreview(
      buildApprovedExpandedDesktopActionView({
        expandedProposalView: displayedExpandedDesktopActionProposal,
        receiptView: displayedApprovedExpandedDesktopActionReceipt,
        commandStatus: "executing"
      })
    );

    try {
      const actionResult = await executeApprovedExpandedDesktopAction(request);
      setApprovedExpandedDesktopActionResult(actionResult);
      setApprovedExpandedDesktopActionStatus("executed");
      setApprovedExpandedDesktopActionPreview(
        buildApprovedExpandedDesktopActionView({
          expandedProposalView: displayedExpandedDesktopActionProposal,
          receiptView: displayedApprovedExpandedDesktopActionReceipt,
          commandStatus: "executed",
          commandResult: actionResult
        })
      );
    } catch (caught) {
      const message = safeErrorMessage(caught);
      setApprovedExpandedDesktopActionError(message);
      setApprovedExpandedDesktopActionStatus("failed");
      setApprovedExpandedDesktopActionPreview(
        buildApprovedExpandedDesktopActionView({
          expandedProposalView: displayedExpandedDesktopActionProposal,
          receiptView: displayedApprovedExpandedDesktopActionReceipt,
          commandStatus: "failed",
          commandError: message
        })
      );
    }
  }

  function handleClearApprovedExpandedDesktopAction(): void {
    setApprovedExpandedDesktopActionPreview(undefined);
    setApprovedExpandedDesktopActionStatus("idle");
    setApprovedExpandedDesktopActionResult(undefined);
    setApprovedExpandedDesktopActionError(undefined);
  }

  function handleBuildApprovedDesktopActionReceipt(): void {
    setApprovedDesktopActionResult(undefined);
    setApprovedDesktopActionError(undefined);
    setApprovedDesktopActionStatus("idle");
    setApprovedDesktopActionPreview(approvedDesktopActionCandidate);
  }

  async function handleExecuteApprovedDesktopAction(): Promise<void> {
    const request =
      approvedDesktopActionPreview?.commandRequest ??
      approvedDesktopActionCandidate.commandRequest;
    if (request === undefined) {
      setApprovedDesktopActionPreview(approvedDesktopActionCandidate);
      return;
    }

    setApprovedDesktopActionStatus("executing");
    setApprovedDesktopActionError(undefined);
    setApprovedDesktopActionPreview(
      buildApprovedDesktopActionView({
        proposalView: displayedDesktopActionProposal,
        typedConfirmation: approvedDesktopActionTypedConfirmation,
        commandStatus: "executing"
      })
    );

    try {
      const actionResult = await executeApprovedDesktopAction(request);
      setApprovedDesktopActionResult(actionResult);
      setApprovedDesktopActionStatus("executed");
      setApprovedDesktopActionPreview(
        buildApprovedDesktopActionView({
          proposalView: displayedDesktopActionProposal,
          typedConfirmation: approvedDesktopActionTypedConfirmation,
          commandStatus: "executed",
          commandResult: actionResult
        })
      );
    } catch (caught) {
      const message = safeErrorMessage(caught);
      setApprovedDesktopActionError(message);
      setApprovedDesktopActionStatus("failed");
      setApprovedDesktopActionPreview(
        buildApprovedDesktopActionView({
          proposalView: displayedDesktopActionProposal,
          typedConfirmation: approvedDesktopActionTypedConfirmation,
          commandStatus: "failed",
          commandError: message
        })
      );
    }
  }

  function handleClearApprovedDesktopAction(): void {
    setApprovedDesktopActionTypedConfirmation("");
    setApprovedDesktopActionPreview(undefined);
    setApprovedDesktopActionStatus("idle");
    setApprovedDesktopActionResult(undefined);
    setApprovedDesktopActionError(undefined);
  }

  function handlePreviewFixedRunPlan(): void {
    setFixedMultiAgentRunPreview(fixedMultiAgentRunCandidate);
    setFixedAgentReplayProjectionPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewFixedAgentHandoffs(): void {
    setFixedMultiAgentRunPreview(fixedMultiAgentRunCandidate);
    setFixedAgentReplayProjectionPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handleClearFixedMultiAgentRun(): void {
    setFixedMultiAgentRunPreview(undefined);
    setFixedAgentReplayProjectionPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewFixedAgentReplayProjection(): void {
    setFixedAgentReplayProjectionPreview(fixedAgentReplayProjectionCandidate);
  }

  function handleClearFixedAgentReplayProjection(): void {
    setFixedAgentReplayProjectionPreview(undefined);
  }

  function handlePreviewAgentHandoffStateReview(): void {
    setAgentHandoffStateReviewPreview(agentHandoffStateReviewCandidate);
  }

  function handleClearAgentHandoffStateReview(): void {
    setAgentHandoffStateReviewText("");
    setAgentHandoffStateReviewPreview(undefined);
  }

  function handlePreviewPatchProposal(): void {
    setPatchProposalCreationPreview(patchProposalCreationCandidate);
    setModelPatchProposalImportPreview(undefined);
    setModelProposalChainIntegrationPreview(undefined);
    setE2ECodingTaskWizardPreview(undefined);
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

  function buildChainPreviewFromModelImport(
    importView: ModelPatchProposalImportView
  ): ModelProposalChainIntegrationView {
    const creationPreview =
      buildPatchProposalCreationPreviewFromModelImport(importView);
    return buildModelProposalChainIntegrationView({
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
  }

  function handlePreviewE2ECodingTaskWizard(): void {
    setE2ECodingTaskWizardPreview(e2eCodingTaskWizardCandidate);
  }

  function handlePreviewE2ECodingTaskSequencer(): void {
    setE2ECodingTaskSequencerPreview(e2eCodingTaskSequencerCandidate);
  }

  function handlePreviewE2ETaskRecovery(): void {
    setE2ETaskRecoveryPreview(e2eTaskRecoveryCandidate);
  }

  function handlePreviewApprovedExecutionRecovery(): void {
    setAppApprovedExecutionRecoveryPreview(
      appApprovedExecutionRecoveryCandidate
    );
  }

  function handlePreviewApprovedExecutionReplayTimeline(): void {
    setAppApprovedExecutionReplayTimelinePreview(
      appApprovedExecutionReplayTimelineCandidate
    );
  }

  function handleImportE2EProposalToChain(): void {
    const importView =
      modelPatchProposalImportCandidate.status === "empty"
        ? modelPatchProposalImportPreview
        : modelPatchProposalImportCandidate;
    if (
      importView === undefined ||
      importView.status === "empty" ||
      !importView.readiness.canImportToPatchPreview
    ) {
      return;
    }
    const chainView = buildChainPreviewFromModelImport(importView);
    const wizardView = buildE2ECodingTaskWizardView({
      objectiveSummary: e2eCodingTaskObjectiveSummary,
      liveProposalGenerationView: liveDeepSeekProposalGenerationView,
      modelPatchProposalImportView: importView,
      modelProposalChainIntegrationView: chainView,
      patchApprovalDraftView: patchApprovalDraftPreview,
      patchVirtualApplyPreviewView: patchVirtualApplyPreview,
      patchRollbackCheckpointPreviewView: patchRollbackCheckpointPreview,
      verificationLaneProjectionView: verificationLaneProjection,
      replayProjectionView: controlledCreationReplayProjection
    });

    setModelPatchProposalImportPreview(importView);
    setModelProposalChainIntegrationPreview(chainView);
    setE2ECodingTaskWizardPreview(wizardView);
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewModelPatchProposal(): void {
    setModelPatchProposalImportPreview(modelPatchProposalImportCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setE2ECodingTaskWizardPreview(undefined);
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
    setE2ECodingTaskWizardPreview(undefined);
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
    setE2ECodingTaskWizardPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setLiveProposalTelemetryAuditPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handleClearModelProposalChain(): void {
    setModelProposalChainIntegrationPreview(undefined);
    setE2ECodingTaskWizardPreview(undefined);
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
    setE2ECodingTaskWizardPreview(undefined);
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
    setE2ECodingTaskWizardPreview(undefined);
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
    setE2ECodingTaskWizardPreview(undefined);
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
    setE2ECodingTaskWizardPreview(undefined);
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
      const chainView = buildChainPreviewFromModelImport(importView);

      setLiveDeepSeekProposalCommandResult(commandResult);
      setModelPatchProposalImportPreview(importView);
      setModelProposalChainIntegrationPreview(chainView);
      setE2ECodingTaskWizardPreview(undefined);
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
    setE2ECodingTaskWizardPreview(undefined);
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

  function handlePreviewCrossSurfaceWorkflow(): void {
    setCrossSurfaceWorkflowPreview(crossSurfaceWorkflowCandidate);
  }

  function handleClearCrossSurfaceWorkflow(): void {
    setCrossSurfaceWorkflowScenarioText("");
    setCrossSurfaceWorkflowPreview(undefined);
  }

  function handlePreviewCrossSurfaceEvidence(): void {
    setCrossSurfaceEvidencePreview(crossSurfaceEvidenceCandidate);
  }

  function handleClearCrossSurfaceEvidence(): void {
    setCrossSurfaceEvidenceJsonText("");
    setCrossSurfaceEvidencePreview(undefined);
  }

  function handlePreviewEvidenceFreshness(): void {
    setEvidenceFreshnessPreview(evidenceFreshnessCandidate);
  }

  function handleClearEvidenceFreshness(): void {
    setEvidenceFreshnessJsonText("");
    setEvidenceFreshnessPreview(undefined);
  }

  function handlePreviewApprovalConsistency(): void {
    setApprovalConsistencyPreview(approvalConsistencyCandidate);
  }

  function handleClearApprovalConsistency(): void {
    setApprovalConsistencyJsonText("");
    setApprovalConsistencyPreview(undefined);
  }

  function handlePreviewCapabilityPolicy(): void {
    setCapabilityPolicyPreview(capabilityPolicyCandidate);
  }

  function handleClearCapabilityPolicy(): void {
    setCapabilityPolicyJsonText("");
    setCapabilityPolicyPreview(undefined);
  }

  function handlePreviewCrossSurfaceReplayTimeline(): void {
    setCrossSurfaceReplayTimelinePreview(crossSurfaceReplayTimelineCandidate);
  }

  function handleClearCrossSurfaceReplayTimeline(): void {
    setCrossSurfaceReplayTimelineText("");
    setCrossSurfaceReplayTimelinePreview(undefined);
  }

  function handlePreviewCrossSurfaceReplayAudit(): void {
    setCrossSurfaceReplayAuditPreview(crossSurfaceReplayAuditCandidate);
  }

  function handleClearCrossSurfaceReplayAudit(): void {
    setCrossSurfaceReplayAuditText("");
    setCrossSurfaceReplayAuditPreview(undefined);
  }

  async function handleDiscoverMcpReadonlyMetadata(): Promise<void> {
    const candidate = mcpReadonlyConnectionCandidate;
    setMcpReadonlyConnectionPreview(candidate);
    if (candidate.safeDiscoveryRequest === undefined) {
      setMcpReadonlyConnectionStatus("error");
      setMcpReadonlyDiscoverError(candidate.nextAction);
      return;
    }

    setMcpReadonlyConnectionStatus("running");
    setMcpReadonlyDiscoverError(undefined);
    try {
      const discoveryResult = await runMcpReadonlyDiscovery(
        candidate.safeDiscoveryRequest
      );
      setMcpReadonlyDiscoverResult(discoveryResult);
      setMcpReadonlyConnectionStatus("done");
      setMcpReadonlyConnectionPreview(
        buildMcpReadonlyConnectionView({
          profileJsonText: mcpReadonlyProfileText,
          typedConfirmation: mcpReadonlyTypedConfirmation,
          discoveryResult
        })
      );
    } catch (caught) {
      const safeMessage = safeErrorMessage(caught);
      setMcpReadonlyDiscoverError(safeMessage);
      setMcpReadonlyConnectionStatus("error");
      setMcpReadonlyConnectionPreview(
        buildMcpReadonlyConnectionView({
          profileJsonText: mcpReadonlyProfileText,
          typedConfirmation: mcpReadonlyTypedConfirmation,
          discoveryError: safeMessage
        })
      );
    }
  }

  function handleClearMcpReadonlyConnection(): void {
    setMcpReadonlyTypedConfirmation("");
    setMcpReadonlyDiscoverResult(undefined);
    setMcpReadonlyDiscoverError(undefined);
    setMcpReadonlyConnectionStatus("idle");
    setMcpReadonlyConnectionPreview(undefined);
    setMcpToolProposalPreview(undefined);
    setMcpReadonlyToolExecutionPreview(undefined);
    setMcpReadonlyToolCallResult(undefined);
    setMcpReadonlyToolCallError(undefined);
    setMcpReadonlyToolCallStatus("idle");
    setMcpMetadataRedactionAuditPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewMcpToolProposal(): void {
    setMcpToolProposalPreview(mcpToolProposalCandidate);
    setContextAssemblyPreview(undefined);
  }

  function handleClearMcpToolProposal(): void {
    setMcpToolProposalSummaryText("");
    setMcpToolProposalPreview(undefined);
    setMcpReadonlyToolExecutionPreview(undefined);
    setMcpReadonlyToolCallResult(undefined);
    setMcpReadonlyToolCallError(undefined);
    setMcpReadonlyToolCallStatus("idle");
    setContextAssemblyPreview(undefined);
  }

  async function handleCallMcpReadonlyTool(): Promise<void> {
    const candidate = mcpReadonlyToolExecutionCandidate;
    setMcpReadonlyToolExecutionPreview(candidate);
    if (candidate.safeCallRequest === undefined) {
      setMcpReadonlyToolCallStatus("error");
      setMcpReadonlyToolCallError(candidate.nextAction);
      return;
    }

    setMcpReadonlyToolCallStatus("running");
    setMcpReadonlyToolCallError(undefined);
    try {
      const result = await callMcpReadonlyTool(candidate.safeCallRequest);
      setMcpReadonlyToolCallResult(result);
      setMcpReadonlyToolCallStatus("done");
      setMcpReadonlyToolExecutionPreview(
        buildMcpReadonlyToolExecutionView({
          connectionProfileRef: candidate.connectionProfileRef,
          toolId: candidate.toolId,
          toolName: candidate.toolName,
          typedConfirmation: mcpReadonlyToolTypedConfirmation,
          argumentSummary: mcpReadonlyToolArgumentSummary,
          result
        })
      );
    } catch (caught) {
      const safeMessage = safeErrorMessage(caught);
      setMcpReadonlyToolCallError(safeMessage);
      setMcpReadonlyToolCallStatus("error");
      setMcpReadonlyToolExecutionPreview(
        buildMcpReadonlyToolExecutionView({
          connectionProfileRef: candidate.connectionProfileRef,
          toolId: candidate.toolId,
          toolName: candidate.toolName,
          typedConfirmation: mcpReadonlyToolTypedConfirmation,
          argumentSummary: mcpReadonlyToolArgumentSummary,
          errorSummary: safeMessage
        })
      );
    }
  }

  function handleClearMcpReadonlyToolExecution(): void {
    setMcpReadonlyToolTypedConfirmation("");
    setMcpReadonlyToolArgumentSummary(
      "querySummaryHash=docs-safe; maxResults=3"
    );
    setMcpReadonlyToolExecutionPreview(undefined);
    setMcpReadonlyToolCallResult(undefined);
    setMcpReadonlyToolCallError(undefined);
    setMcpReadonlyToolCallStatus("idle");
  }

  function handlePreviewMcpMetadataRedactionAudit(): void {
    setMcpMetadataRedactionAuditPreview(mcpMetadataRedactionAuditCandidate);
  }

  function handlePreviewCapabilityHostSurface(): void {
    setCapabilityHostSurfacePreview(capabilityHostSurfaceCandidate);
    setContextAssemblyPreview(undefined);
  }

  function handleClearCapabilityHostSurface(): void {
    setCapabilityHostManifestText("");
    setCapabilityHostSurfacePreview(undefined);
    setCapabilityHostAuditPreview(undefined);
    setExternalCapabilityAuditSurfacePreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewCapabilityHostAudit(): void {
    setCapabilityHostAuditPreview(capabilityHostAuditCandidate);
  }

  function handleClearCapabilityHostAudit(): void {
    setCapabilityHostAuditText("");
    setCapabilityHostAuditPreview(undefined);
    setExternalCapabilityAuditSurfacePreview(undefined);
  }

  function handlePreviewExternalCapabilityAuditSurface(): void {
    setExternalCapabilityAuditSurfacePreview(
      externalCapabilityAuditSurfaceCandidate
    );
  }

  function handleClearExternalCapabilityAuditSurface(): void {
    setExternalCapabilityAuditSummaryText("");
    setExternalCapabilityAuditSurfacePreview(undefined);
  }

  function handlePreviewPluginSkillHost(): void {
    setPluginSkillHostPreview(pluginSkillHostCandidate);
  }

  function handleClearPluginSkillHost(): void {
    setPluginSkillPluginManifestText("");
    setPluginSkillSkillManifestText("");
    setPluginSkillPackageMetadataText("");
    setPluginSkillHostPreview(undefined);
    setPluginSkillRedactionAuditPreview(undefined);
  }

  function handlePreviewPluginSkillRedactionAudit(): void {
    setPluginSkillRedactionAuditPreview(pluginSkillRedactionAuditCandidate);
  }

  function handleClearPluginSkillRedactionAudit(): void {
    setPluginSkillAuditText("");
    setPluginSkillRedactionAuditPreview(undefined);
  }

  async function handleRefreshProjectKnowledge(): Promise<void> {
    setProjectKnowledgeActionStatus("loading");
    setProjectKnowledgeActionError(undefined);
    try {
      const snapshot = await listProjectKnowledge(workspaceRoot);
      setProjectKnowledgeSnapshot(snapshot);
      setProjectKnowledgeActionStatus("loaded");
    } catch (caught) {
      setProjectKnowledgeActionError(safeErrorMessage(caught));
      setProjectKnowledgeActionStatus("error");
    }
  }

  function handlePreviewProjectKnowledgeCandidate(): void {
    setProjectKnowledgeReviewPreview(projectKnowledgeReviewCandidate);
  }

  function handlePreviewProjectKnowledgeRecall(): void {
    setProjectKnowledgeRecallPreview(projectKnowledgeRecallCandidate);
    setContextAssemblyPreview(undefined);
  }

  function handleClearProjectKnowledgeRecall(): void {
    setProjectKnowledgeRecallPreview(undefined);
    setContextAssemblyPreview(undefined);
  }

  async function runProjectKnowledgeCandidateCommit(): Promise<void> {
    const candidate = projectKnowledgeReviewCandidate.candidate;
    if (
      candidate === undefined ||
      !projectKnowledgeReviewCandidate.readiness.canCommitCandidate
    ) {
      setProjectKnowledgeActionError(
        "Project knowledge candidate is not ready for commit."
      );
      setProjectKnowledgeActionStatus("error");
      return;
    }
    setProjectKnowledgeActionStatus("loading");
    setProjectKnowledgeActionError(undefined);
    try {
      const result = await commitProjectKnowledgeCandidate({
        workspaceRoot,
        candidate
      });
      setProjectKnowledgeLatestCommit(result);
      setProjectKnowledgeLatestLifecycle(undefined);
      const snapshot = await listProjectKnowledge(workspaceRoot);
      setProjectKnowledgeSnapshot(snapshot);
      setProjectKnowledgeReviewPreview(undefined);
      setProjectKnowledgeActionStatus("loaded");
    } catch (caught) {
      setProjectKnowledgeActionError(safeErrorMessage(caught));
      setProjectKnowledgeActionStatus("error");
    }
  }

  async function handleRevokeProjectKnowledgeEntry(): Promise<void> {
    if (!projectKnowledgeReviewCandidate.readiness.canRevokeEntry) {
      setProjectKnowledgeActionError(
        "Project knowledge revoke confirmation is required."
      );
      setProjectKnowledgeActionStatus("error");
      return;
    }
    setProjectKnowledgeActionStatus("loading");
    setProjectKnowledgeActionError(undefined);
    try {
      const result = await revokeProjectKnowledgeEntry({
        workspaceRoot,
        entryId: projectKnowledgeRevokeEntryId,
        typedConfirmation: projectKnowledgeRevokeConfirmation
      });
      setProjectKnowledgeLatestLifecycle(result);
      const snapshot = await listProjectKnowledge(workspaceRoot);
      setProjectKnowledgeSnapshot(snapshot);
      setProjectKnowledgeReviewPreview(undefined);
      setProjectKnowledgeActionStatus("loaded");
    } catch (caught) {
      setProjectKnowledgeActionError(safeErrorMessage(caught));
      setProjectKnowledgeActionStatus("error");
    }
  }

  async function handleExpireProjectKnowledgeEntry(): Promise<void> {
    if (!projectKnowledgeReviewCandidate.readiness.canExpireEntry) {
      setProjectKnowledgeActionError(
        "Project knowledge expire entry and reason are required."
      );
      setProjectKnowledgeActionStatus("error");
      return;
    }
    setProjectKnowledgeActionStatus("loading");
    setProjectKnowledgeActionError(undefined);
    try {
      const result = await expireProjectKnowledgeEntry({
        workspaceRoot,
        entryId: projectKnowledgeExpireEntryId,
        reasonSummary: projectKnowledgeExpireReason
      });
      setProjectKnowledgeLatestLifecycle(result);
      const snapshot = await listProjectKnowledge(workspaceRoot);
      setProjectKnowledgeSnapshot(snapshot);
      setProjectKnowledgeReviewPreview(undefined);
      setProjectKnowledgeActionStatus("loaded");
    } catch (caught) {
      setProjectKnowledgeActionError(safeErrorMessage(caught));
      setProjectKnowledgeActionStatus("error");
    }
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
    setE2ECodingTaskWizardPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
  }

  function handlePreviewDiffAudit(): void {
    setPatchDiffAuditPreview(patchDiffAuditCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setE2ECodingTaskWizardPreview(undefined);
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
    setE2ECodingTaskWizardPreview(undefined);
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
    setE2ECodingTaskWizardPreview(undefined);
    setLiveProposalPreviewGatePreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setSandboxApplyRollbackEventProjection(undefined);
    setUserWorkspacePromotionReadinessPreview(undefined);
  }

  function handlePreviewRollbackCheckpoint(): void {
    setPatchRollbackCheckpointPreview(patchRollbackCheckpointCandidate);
    setModelProposalChainIntegrationPreview(undefined);
    setE2ECodingTaskWizardPreview(undefined);
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
    setE2ECodingTaskWizardPreview(undefined);
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
            aria-label="End-to-End Coding Task Wizard"
          >
            <div className="panelHeader">
              <h2>End-to-End Coding Task Wizard</h2>
              <span className="muted">Guided flow / no auto-apply</span>
            </div>
            <p className="fieldHelp">
              Guides an objective through explicit live proposal request, model
              proposal import, and existing chain preview summaries. The wizard
              does not auto-apply patches, rollback, write events, issue
              approvals, persist raw prompts, or display raw model responses.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewE2ECodingTaskWizard();
                }}
              >
                Preview Task Flow
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  !e2eCodingTaskWizardCandidate.readiness
                    .canRequestLiveProposal ||
                  liveDeepSeekProposalGenerationInFlight
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleGenerateLiveProposal();
                }}
              >
                Request Live Proposal
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  !modelPatchProposalImportCandidate.readiness
                    .canImportToPatchPreview &&
                  !displayedModelPatchProposalImport.readiness
                    .canImportToPatchPreview
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleImportE2EProposalToChain();
                }}
              >
                Import Proposal to Chain
              </button>
            </div>

            {displayedE2ECodingTaskWizard.status === "empty" ? (
              <p className="empty">
                No task flow preview yet. Enter an objective or preview the
                current proposal summaries to inspect the guided chain.
              </p>
            ) : null}

            {displayedE2ECodingTaskWizard.status === "blocked" ? (
              <div className="errorBox">
                <strong>End-to-end coding task wizard blocked</strong>
                <p>{displayedE2ECodingTaskWizard.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedE2ECodingTaskWizard.status}</dd>
              </div>
              <div>
                <dt>Wizard</dt>
                <dd>{displayedE2ECodingTaskWizard.wizardId}</dd>
              </div>
              <div>
                <dt>Orchestrator state</dt>
                <dd>{displayedE2ECodingTaskWizard.orchestratorState}</dd>
              </div>
              <div>
                <dt>Stages complete / missing</dt>
                <dd>
                  {displayedE2ECodingTaskWizard.completedStageCount} /{" "}
                  {displayedE2ECodingTaskWizard.missingStageCount}
                </dd>
              </div>
              <div>
                <dt>Sections ready / warning / blocked</dt>
                <dd>
                  {displayedE2ECodingTaskWizard.readySectionCount} /{" "}
                  {displayedE2ECodingTaskWizard.warningSectionCount} /{" "}
                  {displayedE2ECodingTaskWizard.blockedSectionCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedE2ECodingTaskWizard.blockerCount} /{" "}
                  {displayedE2ECodingTaskWizard.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedE2ECodingTaskWizard.wizardHash.substring(0, 12)}
                </dd>
              </div>
              <div>
                <dt>Live request / chain import</dt>
                <dd>
                  {displayedE2ECodingTaskWizard.readiness.canRequestLiveProposal
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedE2ECodingTaskWizard.readiness
                    .canImportProposalToChain
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Auto-apply / apply</dt>
                <dd>
                  {displayedE2ECodingTaskWizard.readiness.canAutoApply
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedE2ECodingTaskWizard.readiness.canApplyPatch
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Rollback / event write</dt>
                <dd>
                  {displayedE2ECodingTaskWizard.readiness.canRollback
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedE2ECodingTaskWizard.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Git / shell</dt>
                <dd>
                  {displayedE2ECodingTaskWizard.readiness.canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedE2ECodingTaskWizard.readiness.canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedE2ECodingTaskWizard.sections.length > 0 ? (
              <ol className="timeline">
                {displayedE2ECodingTaskWizard.sections.map((section) => (
                  <li key={section.kind}>
                    <span className="timelineMeta">
                      {section.label} · {section.status}
                    </span>
                    <span>{section.summary}</span>
                    {section.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {section.warningCodes.join(", ")}
                      </span>
                    ) : null}
                    {section.blockerCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Blockers: {section.blockerCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedE2ECodingTaskWizard.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedE2ECodingTaskWizard.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeE2ECodingTaskWizardView(displayedE2ECodingTaskWizard)
                  .nextAction
              }
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="End-to-End Apply Verify Rollback Sequencer"
          >
            <div className="panelHeader">
              <h2>End-to-End Apply / Verify / Rollback Sequencer</h2>
              <span className="muted">
                Approved gates only / no arbitrary execution
              </span>
            </div>
            <p className="fieldHelp">
              Sequences the existing approved apply command, fixed Git/shell
              verification lanes, and approved rollback command. It does not
              auto-apply, run arbitrary Git or shell, write raw content events,
              issue leases, use a native bridge, or perform desktop actions.
            </p>

            <label className="checkboxRow">
              <input
                type="checkbox"
                checked={e2eSequencerRollbackRequested}
                onChange={(event) => {
                  setE2ESequencerRollbackRequested(event.target.checked);
                }}
              />
              <span>User explicitly requested rollback after apply</span>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewE2ECodingTaskSequencer();
                }}
              >
                Preview Apply / Verify / Rollback Sequencer
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  !e2eCodingTaskSequencerCandidate.readiness.canRunApprovedApply
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleApplyApprovedPatch();
                }}
              >
                Run Sequenced Approved Apply
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  !e2eCodingTaskSequencerCandidate.readiness
                    .canRunVerification || gitReadLaneStatus === "running"
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleRunGitReadLane();
                }}
              >
                Run Sequenced Git Read Lane
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  !e2eCodingTaskSequencerCandidate.readiness
                    .canRunVerification || shellVerificationStatus === "running"
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleRunVerificationLane();
                }}
              >
                Run Sequenced Verification Lane
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  !e2eCodingTaskSequencerCandidate.readiness
                    .canRunApprovedRollback
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleRollbackApprovedPatch();
                }}
              >
                Run Sequenced Approved Rollback
              </button>
            </div>

            {displayedE2ECodingTaskSequencer.status === "empty" ? (
              <p className="empty">
                No sequencer preview yet. Preview the wizard, approval receipt,
                approved execution flow, or verification summaries first.
              </p>
            ) : null}

            {displayedE2ECodingTaskSequencer.status === "blocked" ? (
              <div className="errorBox">
                <strong>E2E sequencer blocked</strong>
                <p>{displayedE2ECodingTaskSequencer.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedE2ECodingTaskSequencer.status}</dd>
              </div>
              <div>
                <dt>Sequencer</dt>
                <dd>{displayedE2ECodingTaskSequencer.sequencerId}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>{displayedE2ECodingTaskSequencer.proposalId}</dd>
              </div>
              <div>
                <dt>Apply / checkpoint</dt>
                <dd>
                  {displayedE2ECodingTaskSequencer.applyId} /{" "}
                  {displayedE2ECodingTaskSequencer.checkpointId}
                </dd>
              </div>
              <div>
                <dt>Verification / rollback</dt>
                <dd>
                  {displayedE2ECodingTaskSequencer.verificationStatus} /{" "}
                  {displayedE2ECodingTaskSequencer.rollbackId}
                </dd>
              </div>
              <div>
                <dt>Stages ready / executed / blocked</dt>
                <dd>
                  {displayedE2ECodingTaskSequencer.readyStageCount} /{" "}
                  {displayedE2ECodingTaskSequencer.executedStageCount} /{" "}
                  {displayedE2ECodingTaskSequencer.blockedStageCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedE2ECodingTaskSequencer.blockerCount} /{" "}
                  {displayedE2ECodingTaskSequencer.warningCount}
                </dd>
              </div>
              <div>
                <dt>Summary events</dt>
                <dd>{displayedE2ECodingTaskSequencer.summaryEventCount}</dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedE2ECodingTaskSequencer.sequencerHash.substring(
                    0,
                    12
                  )}
                </dd>
              </div>
              <div>
                <dt>Approved apply / verification</dt>
                <dd>
                  {displayedE2ECodingTaskSequencer.readiness.canRunApprovedApply
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedE2ECodingTaskSequencer.readiness.canRunVerification
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Approved rollback / auto-apply</dt>
                <dd>
                  {displayedE2ECodingTaskSequencer.readiness
                    .canRunApprovedRollback
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedE2ECodingTaskSequencer.readiness.canAutoApply
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Arbitrary Git / shell</dt>
                <dd>
                  {displayedE2ECodingTaskSequencer.readiness.canUseArbitraryGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedE2ECodingTaskSequencer.readiness
                    .canUseArbitraryShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedE2ECodingTaskSequencer.stages.length > 0 ? (
              <ol className="timeline">
                {displayedE2ECodingTaskSequencer.stages.map((stage) => (
                  <li key={stage.kind}>
                    <span className="timelineMeta">
                      {stage.label} · {stage.status}
                    </span>
                    <span>{stage.summary}</span>
                    {stage.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {stage.warningCodes.join(", ")}
                      </span>
                    ) : null}
                    {stage.blockerCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Blockers: {stage.blockerCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedE2ECodingTaskSequencer.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedE2ECodingTaskSequencer.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeE2ECodingTaskSequencerView(
                  displayedE2ECodingTaskSequencer
                ).nextAction
              }
            </p>
          </section>

          <section className="eventPanel" aria-label="E2E Task Recovery">
            <div className="panelHeader">
              <h2>E2E Task Recovery</h2>
              <span className="muted">
                Safe recovery / no auto-retry execution
              </span>
            </div>
            <p className="fieldHelp">
              Summarizes common E2E coding task failures and the next safe
              action. The App Shell does not auto-retry execution, expose raw
              prompt, raw response, raw source, raw diff, preimage content, API
              keys, arbitrary Git/shell, native bridge, or desktop actions.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewE2ETaskRecovery();
                }}
              >
                Preview E2E Task Recovery
              </button>
            </div>

            {displayedE2ETaskRecovery.status === "empty" ? (
              <p className="empty">
                No recovery preview yet. Trigger or preview a blocked proposal,
                validation, approval, apply, verification, rollback, event, or
                Convert FILE_EXISTS state first.
              </p>
            ) : null}

            {displayedE2ETaskRecovery.status === "blocked" ? (
              <div className="errorBox">
                <strong>E2E recovery blocked</strong>
                <p>{displayedE2ETaskRecovery.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedE2ETaskRecovery.status}</dd>
              </div>
              <div>
                <dt>Recovery</dt>
                <dd>{displayedE2ETaskRecovery.recoveryId}</dd>
              </div>
              <div>
                <dt>Failure category</dt>
                <dd>{displayedE2ETaskRecovery.failureCategory}</dd>
              </div>
              <div>
                <dt>Retry / rollback state</dt>
                <dd>
                  {displayedE2ETaskRecovery.retryAllowed
                    ? "retry allowed"
                    : "retry disabled"}{" "}
                  /{" "}
                  {displayedE2ETaskRecovery.rollbackAvailable
                    ? "rollback safe"
                    : "rollback unavailable"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedE2ETaskRecovery.blockerCount} /{" "}
                  {displayedE2ETaskRecovery.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedE2ETaskRecovery.recoveryHash.substring(0, 12)}
                </dd>
              </div>
              <div>
                <dt>Auto retry / auto apply</dt>
                <dd>
                  {displayedE2ETaskRecovery.readiness.canAutoRetryExecution
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedE2ETaskRecovery.readiness.canAutoApply
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Arbitrary Git / shell</dt>
                <dd>
                  {displayedE2ETaskRecovery.readiness.canRunArbitraryGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedE2ETaskRecovery.readiness.canRunArbitraryShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            <div className="statusBox">
              <strong>Safe summary</strong>
              <p>{displayedE2ETaskRecovery.safeSummary}</p>
            </div>
            <div className="statusBox">
              <strong>Recommended action</strong>
              <p>{displayedE2ETaskRecovery.recommendedAction}</p>
            </div>

            {displayedE2ETaskRecovery.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedE2ETaskRecovery.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {summarizeE2ETaskRecoveryView(displayedE2ETaskRecovery).source} ·{" "}
              {displayedE2ETaskRecovery.nextAction}
            </p>
          </section>

          <section className="eventPanel" aria-label="Desktop Observer">
            <div className="panelHeader">
              <h2>Desktop Observer</h2>
              <span className="muted">Read-only / no desktop action</span>
            </div>
            <p className="fieldHelp">
              Observes foreground/window/display metadata on explicit user
              request. The App Shell cannot click, type, select, control
              windows, write clipboard, persist raw screenshots, or send desktop
              observations to a model automatically.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewDesktopObserverProfile();
                }}
              >
                Preview Desktop Observation Profile
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  desktopObserverStatus === "observing" ||
                  !desktopObserverCandidate.readiness.canObserveMetadata
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleObserveDesktopMetadata();
                }}
              >
                {desktopObserverStatus === "observing"
                  ? "Observing..."
                  : "Observe Desktop Metadata"}
              </button>
              <button type="button" className="secondary" disabled>
                Click Desktop (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Type into Desktop (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Capture Raw Screenshot (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Send Screen to Model (disabled)
              </button>
            </div>

            {displayedDesktopObserver.status === "blocked" ? (
              <div className="errorBox">
                <strong>Desktop Observer blocked</strong>
                <p>{displayedDesktopObserver.safeMessage}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedDesktopObserver.status}</dd>
              </div>
              <div>
                <dt>Profile</dt>
                <dd>{displayedDesktopObserver.profileSummary.profileId}</dd>
              </div>
              <div>
                <dt>Observation</dt>
                <dd>{displayedDesktopObserver.observationId ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Windows / apps / displays</dt>
                <dd>
                  {displayedDesktopObserver.windowCount} /{" "}
                  {displayedDesktopObserver.appCount} /{" "}
                  {displayedDesktopObserver.displayCount}
                </dd>
              </div>
              <div>
                <dt>Focused window</dt>
                <dd>{displayedDesktopObserver.focusedWindowSummary}</dd>
              </div>
              <div>
                <dt>Redaction warnings</dt>
                <dd>
                  {displayedDesktopObserver.redactionWarnings.length > 0
                    ? displayedDesktopObserver.redactionWarnings.join(", ")
                    : "none"}
                </dd>
              </div>
              <div>
                <dt>Screenshot boundary</dt>
                <dd>
                  {displayedDesktopObserver.screenshotBoundary === undefined
                    ? "not included"
                    : `${displayedDesktopObserver.screenshotBoundary.status} / ${displayedDesktopObserver.screenshotBoundary.hashPrefix ?? "no hash"}`}
                </dd>
              </div>
              <div>
                <dt>Evidence refs</dt>
                <dd>{desktopObservationEvidenceRefs.length} summary-only</dd>
              </div>
              <div>
                <dt>Redaction audit</dt>
                <dd>
                  {displayedDesktopObserver.redactionAudit.status} / blockers{" "}
                  {displayedDesktopObserver.redactionAudit.blockerCount} /
                  warnings{" "}
                  {displayedDesktopObserver.redactionAudit.warningCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedDesktopObserver.blockerCount} /{" "}
                  {displayedDesktopObserver.warningCount}
                </dd>
              </div>
              <div>
                <dt>Raw/OCR/model</dt>
                <dd>
                  {displayedDesktopObserver.readiness.canPersistRawImage
                    ? "raw"
                    : "no raw"}{" "}
                  /{" "}
                  {displayedDesktopObserver.readiness.canPersistOcrText
                    ? "ocr"
                    : "no ocr"}{" "}
                  /{" "}
                  {displayedDesktopObserver.readiness.canSendToModel
                    ? "model"
                    : "no model"}
                </dd>
              </div>
              <div>
                <dt>Desktop action</dt>
                <dd>
                  {displayedDesktopObserver.readiness.canDesktopAction
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
            </dl>

            {displayedDesktopObserver.screenshotBoundary !== undefined ? (
              <p className="muted">
                screenshot boundary flags raw{" "}
                {displayedDesktopObserver.screenshotBoundary.rawPersisted
                  ? "yes"
                  : "no"}
                , OCR{" "}
                {displayedDesktopObserver.screenshotBoundary.ocrPersisted
                  ? "yes"
                  : "no"}
                , model{" "}
                {displayedDesktopObserver.screenshotBoundary.modelSent
                  ? "yes"
                  : "no"}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeDesktopObserverView(displayedDesktopObserver)
                  .nextAction
              }
            </p>
          </section>

          <section className="eventPanel" aria-label="Desktop Action Proposal">
            <div className="panelHeader">
              <h2>Desktop Action Proposal</h2>
              <span className="muted">Proposal only / no desktop action</span>
            </div>
            <p className="fieldHelp">
              Models a future desktop action from Desktop Observer evidence. The
              App Shell does not click, type, use clipboard, open file dialogs,
              or perform desktop actions.
            </p>

            <label>
              Desktop action proposal JSON
              <textarea
                rows={8}
                value={desktopActionProposalText}
                onChange={(event) => {
                  setDesktopActionProposalText(event.target.value);
                }}
                placeholder="Paste desktop_action_proposal JSON draft"
              />
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewDesktopActionProposal();
                }}
              >
                Preview Desktop Action Proposal
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearDesktopActionProposal();
                }}
              >
                Clear Desktop Action Proposal
              </button>
              <button type="button" className="secondary" disabled>
                Execute Desktop Action (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Click Target (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Type Text (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Use Clipboard (disabled)
              </button>
            </div>

            {displayedDesktopActionProposal.status === "blocked" ? (
              <div className="errorBox">
                <strong>Desktop Action Proposal blocked</strong>
                <p>{displayedDesktopActionProposal.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedDesktopActionProposal.status}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>{displayedDesktopActionProposal.proposalId ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Actions</dt>
                <dd>{displayedDesktopActionProposal.actionCount}</dd>
              </div>
              <div>
                <dt>Targets</dt>
                <dd>{displayedDesktopActionProposal.targetSummary}</dd>
              </div>
              <div>
                <dt>Risk</dt>
                <dd>{displayedDesktopActionProposal.riskSummary}</dd>
              </div>
              <div>
                <dt>Simulation</dt>
                <dd>{displayedDesktopActionProposal.simulationSummary}</dd>
              </div>
              <div>
                <dt>Capability plan</dt>
                <dd>{displayedDesktopActionProposal.capabilitySummary}</dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedDesktopActionProposal.blockerCount} /{" "}
                  {displayedDesktopActionProposal.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedDesktopActionProposal.capabilityHash?.substring(
                    0,
                    12
                  ) ??
                    displayedDesktopActionProposal.simulationHash?.substring(
                      0,
                      12
                    ) ??
                    displayedDesktopActionProposal.proposalHash?.substring(
                      0,
                      12
                    ) ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Read-only display</dt>
                <dd>
                  {displayedDesktopActionProposal.readiness
                    .canDisplayReadOnlyPreview
                    ? "ready"
                    : "not ready"}
                </dd>
              </div>
              <div>
                <dt>Execution</dt>
                <dd>
                  {displayedDesktopActionProposal.readiness
                    .canExecuteDesktopAction
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Native bridge / events</dt>
                <dd>
                  {displayedDesktopActionProposal.readiness.canUseNativeBridge
                    ? "bridge"
                    : "no bridge"}{" "}
                  /{" "}
                  {displayedDesktopActionProposal.readiness.canWriteEventStore
                    ? "write"
                    : "no write"}
                </dd>
              </div>
            </dl>

            {displayedDesktopActionProposal.contextAssemblyRef !== undefined ? (
              <p className="muted">
                no_compress_zone ref{" "}
                {displayedDesktopActionProposal.contextAssemblyRef}
              </p>
            ) : null}

            {displayedDesktopActionProposal.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedDesktopActionProposal.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {displayedDesktopActionProposal.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Expanded Desktop Action Proposal"
          >
            <div className="panelHeader">
              <h2>Expanded Desktop Action Proposal</h2>
              <span className="muted">Proposal only / no desktop action</span>
            </div>
            <p className="fieldHelp">
              Models future click, type, select, clipboard, and file-dialog
              actions as read-only proposals. The App Shell cannot execute these
              actions.
            </p>

            <label>
              Expanded desktop action proposal JSON
              <textarea
                rows={8}
                value={expandedDesktopActionProposalText}
                onChange={(event) => {
                  setExpandedDesktopActionProposalText(event.target.value);
                }}
                placeholder="Paste desktop_action_expansion_proposal JSON draft"
              />
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewExpandedDesktopActionProposal();
                }}
              >
                Preview Proposal
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearExpandedDesktopActionProposal();
                }}
              >
                Clear Proposal
              </button>
              <button type="button" className="secondary" disabled>
                Execute Click (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Type Text (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Write Clipboard (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Open File Dialog (disabled)
              </button>
            </div>

            {displayedExpandedDesktopActionProposal.status === "blocked" ? (
              <div className="errorBox">
                <strong>Expanded Desktop Action Proposal blocked</strong>
                <p>{displayedExpandedDesktopActionProposal.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedExpandedDesktopActionProposal.status}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>
                  {displayedExpandedDesktopActionProposal.proposalId ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Action kind</dt>
                <dd>
                  {displayedExpandedDesktopActionProposal.actionKind ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Target summary</dt>
                <dd>{displayedExpandedDesktopActionProposal.targetSummary}</dd>
              </div>
              <div>
                <dt>Freshness summary</dt>
                <dd>
                  {displayedExpandedDesktopActionProposal.freshnessSummary}
                </dd>
              </div>
              <div>
                <dt>Risk summary</dt>
                <dd>{displayedExpandedDesktopActionProposal.riskSummary}</dd>
              </div>
              <div>
                <dt>Simulation summary</dt>
                <dd>
                  {displayedExpandedDesktopActionProposal.simulationSummary}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedExpandedDesktopActionProposal.blockerCount} /{" "}
                  {displayedExpandedDesktopActionProposal.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedExpandedDesktopActionProposal.simulationHash?.substring(
                    0,
                    12
                  ) ??
                    displayedExpandedDesktopActionProposal.riskHash?.substring(
                      0,
                      12
                    ) ??
                    displayedExpandedDesktopActionProposal.proposalHash?.substring(
                      0,
                      12
                    ) ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Execution</dt>
                <dd>
                  {displayedExpandedDesktopActionProposal.readiness
                    .canExecuteDesktopAction
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Clipboard / file dialog</dt>
                <dd>
                  {displayedExpandedDesktopActionProposal.readiness
                    .canWriteClipboard
                    ? "clipboard"
                    : "no clipboard"}{" "}
                  /{" "}
                  {displayedExpandedDesktopActionProposal.readiness
                    .canOpenFileDialog
                    ? "file dialog"
                    : "no file dialog"}
                </dd>
              </div>
              <div>
                <dt>Native bridge / events</dt>
                <dd>
                  {displayedExpandedDesktopActionProposal.readiness
                    .canUseNativeBridge
                    ? "bridge"
                    : "no bridge"}{" "}
                  /{" "}
                  {displayedExpandedDesktopActionProposal.readiness
                    .canWriteEventStore
                    ? "write"
                    : "no write"}
                </dd>
              </div>
            </dl>

            {displayedExpandedDesktopActionProposal.contextAssemblyRef !==
            undefined ? (
              <p className="muted">
                no_compress_zone ref{" "}
                {displayedExpandedDesktopActionProposal.contextAssemblyRef}
              </p>
            ) : null}

            {displayedExpandedDesktopActionProposal.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedExpandedDesktopActionProposal.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {displayedExpandedDesktopActionProposal.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Approved Expanded Desktop Action Receipt"
          >
            <div className="panelHeader">
              <h2>Approved Expanded Desktop Action Receipt</h2>
              <span className="muted">Receipt preview / no desktop action</span>
            </div>
            <p className="fieldHelp">
              Builds a summary-only approval receipt for a future approved
              expanded click/type lane. The App Shell does not invoke Tauri,
              execute desktop actions, write clipboard, automate file dialogs,
              or write events.
            </p>

            <label>
              Typed confirmation
              <input
                value={approvedExpandedDesktopActionTypedConfirmation}
                onChange={(event) => {
                  setApprovedExpandedDesktopActionTypedConfirmation(
                    event.target.value
                  );
                  setApprovedExpandedDesktopActionReceiptPreview(undefined);
                  setApprovedExpandedDesktopActionPreview(undefined);
                  setApprovedExpandedDesktopActionStatus("idle");
                  setApprovedExpandedDesktopActionResult(undefined);
                  setApprovedExpandedDesktopActionError(undefined);
                }}
                placeholder={
                  displayedApprovedExpandedDesktopActionReceipt.typedConfirmationRequired ??
                  "CLICK OBSERVED TARGET / TYPE INTO OBSERVED FIELD"
                }
              />
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled={
                  !approvedExpandedDesktopActionReceiptCandidate.readiness
                    .canBuildReceipt
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleBuildApprovedExpandedDesktopActionReceipt();
                }}
              >
                Build Expanded Action Receipt
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearApprovedExpandedDesktopActionReceipt();
                }}
              >
                Clear Expanded Action Receipt
              </button>
              <button type="button" className="secondary" disabled>
                Execute Approved Click (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Execute Approved Type (disabled)
              </button>
            </div>

            {displayedApprovedExpandedDesktopActionReceipt.status ===
            "blocked" ? (
              <div className="errorBox">
                <strong>
                  Approved Expanded Desktop Action Receipt blocked
                </strong>
                <p>
                  {displayedApprovedExpandedDesktopActionReceipt.nextAction}
                </p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedApprovedExpandedDesktopActionReceipt.status}</dd>
              </div>
              <div>
                <dt>Receipt</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.receiptId ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.proposalId ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Action kind</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.actionKind ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Target ref</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.targetRef ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Window / app</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.windowRef ??
                    "n/a"}{" "}
                  /{" "}
                  {displayedApprovedExpandedDesktopActionReceipt.appRef ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Risk / simulation</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.riskClassificationId ??
                    "n/a"}{" "}
                  /{" "}
                  {displayedApprovedExpandedDesktopActionReceipt.simulationId ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Typed confirmation</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.typedConfirmationAccepted
                    ? "accepted"
                    : "required"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.blockerCount} /{" "}
                  {displayedApprovedExpandedDesktopActionReceipt.warningCount}
                </dd>
              </div>
              <div>
                <dt>Receipt hash</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.receiptHash?.substring(
                    0,
                    12
                  ) ??
                    displayedApprovedExpandedDesktopActionReceipt.viewHash.substring(
                      0,
                      12
                    )}
                </dd>
              </div>
              <div>
                <dt>Safe click/type contract</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.readiness
                    .canEnterSafeClickContract
                    ? "click"
                    : "no click"}{" "}
                  /{" "}
                  {displayedApprovedExpandedDesktopActionReceipt.readiness
                    .canEnterSafeTypeContract
                    ? "type"
                    : "no type"}
                </dd>
              </div>
              <div>
                <dt>Execution / native bridge / events</dt>
                <dd>
                  {displayedApprovedExpandedDesktopActionReceipt.readiness
                    .canExecuteDesktopAction
                    ? "enabled"
                    : "disabled"}{" "}
                  /{" "}
                  {displayedApprovedExpandedDesktopActionReceipt.readiness
                    .canUseNativeBridge
                    ? "bridge"
                    : "no bridge"}{" "}
                  /{" "}
                  {displayedApprovedExpandedDesktopActionReceipt.readiness
                    .canWriteEventStore
                    ? "write"
                    : "no write"}
                </dd>
              </div>
            </dl>

            {displayedApprovedExpandedDesktopActionReceipt.receiptSummary !==
            undefined ? (
              <p className="muted">
                receipt summary{" "}
                {displayedApprovedExpandedDesktopActionReceipt.receiptSummary}
              </p>
            ) : null}

            {displayedApprovedExpandedDesktopActionReceipt.findings.length >
            0 ? (
              <p className="muted">
                findings{" "}
                {displayedApprovedExpandedDesktopActionReceipt.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {displayedApprovedExpandedDesktopActionReceipt.nextAction}
            </p>
            <p className="srOnly">
              {JSON.stringify(
                summarizeApprovedExpandedDesktopActionReceiptView(
                  displayedApprovedExpandedDesktopActionReceipt
                )
              )}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Approved Expanded Desktop Action"
          >
            <div className="panelHeader">
              <h2>Approved Expanded Desktop Action</h2>
              <span className="muted">
                Human approved / narrow click-type lane
              </span>
            </div>
            <p className="fieldHelp">
              Executes only fixed approved click/type commands after receipt,
              safe contract, confirmation, freshness, and target checks pass. No
              generic native invoke, clipboard write, file dialog, drag/drop,
              multi-step automation, or background action is enabled. This v0.27
              lane remains narrow: one approved safe click or one approved safe
              type.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled={
                  displayedApprovedExpandedDesktopActionReceipt.status ===
                  "empty"
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewApprovedExpandedDesktopAction();
                }}
              >
                Preview Approved Expanded Action
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  approvedExpandedDesktopActionStatus === "executing" ||
                  displayedApprovedExpandedDesktopAction.actionKind !==
                    "click_observed_safe_target" ||
                  !displayedApprovedExpandedDesktopAction.readiness
                    .canExecuteApprovedExpandedDesktopAction
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleExecuteApprovedExpandedDesktopAction();
                }}
              >
                {approvedExpandedDesktopActionStatus === "executing" &&
                displayedApprovedExpandedDesktopAction.actionKind ===
                  "click_observed_safe_target"
                  ? "Executing Approved Click..."
                  : "Execute Approved Click"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  approvedExpandedDesktopActionStatus === "executing" ||
                  displayedApprovedExpandedDesktopAction.actionKind !==
                    "type_into_observed_text_field" ||
                  !displayedApprovedExpandedDesktopAction.readiness
                    .canExecuteApprovedExpandedDesktopAction
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleExecuteApprovedExpandedDesktopAction();
                }}
              >
                {approvedExpandedDesktopActionStatus === "executing" &&
                displayedApprovedExpandedDesktopAction.actionKind ===
                  "type_into_observed_text_field"
                  ? "Executing Approved Type..."
                  : "Execute Approved Type"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearApprovedExpandedDesktopAction();
                }}
              >
                Clear Approved Expanded Action
              </button>
              <button type="button" className="secondary" disabled>
                Write Clipboard (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Open File Dialog (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Drag / Drop (disabled)
              </button>
            </div>

            {displayedApprovedExpandedDesktopAction.status === "blocked" ? (
              <div className="errorBox">
                <strong>Approved Expanded Desktop Action blocked</strong>
                <p>{displayedApprovedExpandedDesktopAction.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedApprovedExpandedDesktopAction.status}</dd>
              </div>
              <div>
                <dt>Action kind</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.actionKind ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Target ref</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.targetRef ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Window / app / display</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.windowRef ?? "n/a"} /{" "}
                  {displayedApprovedExpandedDesktopAction.appRef ?? "n/a"} /{" "}
                  {displayedApprovedExpandedDesktopAction.displayRef ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Freshness / risk</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.freshnessStatus ??
                    "n/a"}{" "}
                  / {displayedApprovedExpandedDesktopAction.riskStatus ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Simulation</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.simulationStatus ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Receipt status</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.receiptStatus ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Confirmation</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.typedConfirmationAccepted
                    ? "accepted"
                    : "required"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.blockerCount} /{" "}
                  {displayedApprovedExpandedDesktopAction.warningCount}
                </dd>
              </div>
              <div>
                <dt>Event preview</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.eventPreviewStatus}
                </dd>
              </div>
              <div>
                <dt>Command result</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.commandResultSummary
                    ?.status ?? "not called"}
                </dd>
              </div>
              <div>
                <dt>Fixed command</dt>
                <dd>
                  {displayedApprovedExpandedDesktopAction.readiness
                    .canCallFixedTauriCommand
                    ? "ready"
                    : "disabled"}
                </dd>
              </div>
            </dl>

            {displayedApprovedExpandedDesktopAction.receiptSummary !==
            undefined ? (
              <p className="muted">
                receipt summary{" "}
                {displayedApprovedExpandedDesktopAction.receiptSummary}
              </p>
            ) : null}

            {displayedApprovedExpandedDesktopAction.contractSummary !==
            undefined ? (
              <p className="muted">
                contract summary{" "}
                {displayedApprovedExpandedDesktopAction.contractSummary}
              </p>
            ) : null}

            {displayedApprovedExpandedDesktopAction.commandResultSummary !==
            undefined ? (
              <p className="muted">
                result{" "}
                {
                  displayedApprovedExpandedDesktopAction.commandResultSummary
                    .status
                }{" "}
                / hash{" "}
                {
                  displayedApprovedExpandedDesktopAction.commandResultSummary
                    .resultHashPrefix
                }
              </p>
            ) : null}

            {displayedApprovedExpandedDesktopAction.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedApprovedExpandedDesktopAction.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {displayedApprovedExpandedDesktopAction.nextAction}
            </p>
            <p className="srOnly">
              {JSON.stringify(
                summarizeApprovedExpandedDesktopActionView(
                  displayedApprovedExpandedDesktopAction
                )
              )}
            </p>
          </section>

          <section className="eventPanel" aria-label="Approved Desktop Action">
            <div className="panelHeader">
              <h2>Approved Desktop Action</h2>
              <span className="muted">
                Human approved / narrow desktop action
              </span>
            </div>
            <p className="fieldHelp">
              Executes only fixed, approved, low-risk desktop actions such as
              focusing an observed window. Click/type/select remains disabled;
              no clipboard write, file dialog, or broad native bridge is
              enabled.
            </p>

            <label>
              Typed confirmation
              <input
                value={approvedDesktopActionTypedConfirmation}
                onChange={(event) => {
                  setApprovedDesktopActionTypedConfirmation(event.target.value);
                  setApprovedDesktopActionPreview(undefined);
                  setApprovedDesktopActionStatus("idle");
                  setApprovedDesktopActionResult(undefined);
                  setApprovedDesktopActionError(undefined);
                }}
                placeholder={
                  displayedApprovedDesktopAction.typedConfirmationRequired ??
                  "FOCUS OBSERVED WINDOW"
                }
              />
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled={
                  !approvedDesktopActionCandidate.readiness.canBuildReceipt
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleBuildApprovedDesktopActionReceipt();
                }}
              >
                Build approval receipt
              </button>
              <button
                type="button"
                className="secondary"
                disabled={
                  approvedDesktopActionStatus === "executing" ||
                  !displayedApprovedDesktopAction.readiness
                    .canExecuteApprovedDesktopAction
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleExecuteApprovedDesktopAction();
                }}
              >
                {approvedDesktopActionStatus === "executing"
                  ? "Executing approved desktop action..."
                  : "Execute approved desktop action"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearApprovedDesktopAction();
                }}
              >
                Clear Approved Desktop Action
              </button>
              <button type="button" className="secondary" disabled>
                Click Desktop (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Type Text (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Write Clipboard (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Open File Dialog (disabled)
              </button>
            </div>

            {displayedApprovedDesktopAction.status === "blocked" ? (
              <div className="errorBox">
                <strong>Approved Desktop Action blocked</strong>
                <p>{displayedApprovedDesktopAction.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedApprovedDesktopAction.status}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>{displayedApprovedDesktopAction.proposalId ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Action</dt>
                <dd>{displayedApprovedDesktopAction.actionKind ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Target refs</dt>
                <dd>
                  {displayedApprovedDesktopAction.targetWindowRef ?? "n/a"} /{" "}
                  {displayedApprovedDesktopAction.targetAppRef ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Receipt</dt>
                <dd>
                  {displayedApprovedDesktopAction.receipt?.receiptId ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Confirmation</dt>
                <dd>
                  {displayedApprovedDesktopAction.typedConfirmationAccepted
                    ? "accepted"
                    : "required"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedApprovedDesktopAction.blockerCount} /{" "}
                  {displayedApprovedDesktopAction.warningCount}
                </dd>
              </div>
              <div>
                <dt>Command result</dt>
                <dd>
                  {displayedApprovedDesktopAction.commandResultSummary
                    ?.status ?? "not called"}
                </dd>
              </div>
              <div>
                <dt>Event preview</dt>
                <dd>
                  {displayedApprovedDesktopAction.commandResultSummary
                    ?.eventNotWritten
                    ? "not written"
                    : "n/a"}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedApprovedDesktopAction.viewHash.substring(0, 12)}
                </dd>
              </div>
              <div>
                <dt>Fixed command</dt>
                <dd>
                  {displayedApprovedDesktopAction.readiness
                    .canExecuteApprovedDesktopAction
                    ? "ready"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Broad controls</dt>
                <dd>
                  {displayedApprovedDesktopAction.readiness.canClick
                    ? "click"
                    : "no click"}{" "}
                  /{" "}
                  {displayedApprovedDesktopAction.readiness.canType
                    ? "type"
                    : "no type"}{" "}
                  /{" "}
                  {displayedApprovedDesktopAction.readiness.canWriteClipboard
                    ? "enabled"
                    : "no clipboard"}
                </dd>
              </div>
            </dl>

            {displayedApprovedDesktopAction.receiptSummary !== undefined ? (
              <p className="muted">
                receipt summary {displayedApprovedDesktopAction.receiptSummary}
              </p>
            ) : null}

            {displayedApprovedDesktopAction.commandResultSummary !==
            undefined ? (
              <p className="muted">
                result{" "}
                {displayedApprovedDesktopAction.commandResultSummary.status} /{" "}
                hash{" "}
                {
                  displayedApprovedDesktopAction.commandResultSummary
                    .resultHashPrefix
                }
              </p>
            ) : null}

            {displayedApprovedDesktopAction.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedApprovedDesktopAction.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeApprovedDesktopActionView(
                  displayedApprovedDesktopAction
                ).nextAction
              }
            </p>
          </section>

          <section className="eventPanel" aria-label="Desktop Action Replay">
            <div className="panelHeader">
              <h2>Desktop Action Replay</h2>
              <span className="muted">Summary replay / no re-execution</span>
            </div>
            <p className="fieldHelp">
              Projects approved desktop action and expanded click/type summary
              events into a replay surface. Replay can show status, event type,
              action kind, target refs, timestamp, and warning codes, but cannot
              execute desktop actions or write events.
            </p>

            {desktopActionReplayView.status === "blocked" ? (
              <div className="errorBox">
                <strong>Desktop Action Replay blocked</strong>
                <p>{desktopActionReplayView.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{desktopActionReplayView.status}</dd>
              </div>
              <div>
                <dt>Event type</dt>
                <dd>{desktopActionReplayView.eventType}</dd>
              </div>
              <div>
                <dt>Action status</dt>
                <dd>{desktopActionReplayView.actionStatus}</dd>
              </div>
              <div>
                <dt>Action kind</dt>
                <dd>{desktopActionReplayView.actionKind}</dd>
              </div>
              <div>
                <dt>Target refs</dt>
                <dd>
                  {desktopActionReplayView.targetWindowRef} /{" "}
                  {desktopActionReplayView.targetAppRef}
                </dd>
              </div>
              <div>
                <dt>Timestamp</dt>
                <dd>{desktopActionReplayView.timestamp}</dd>
              </div>
              <div>
                <dt>Warnings</dt>
                <dd>
                  {desktopActionReplayView.warningCodes.length > 0
                    ? desktopActionReplayView.warningCodes.join(", ")
                    : "none"}
                </dd>
              </div>
              <div>
                <dt>Privacy audit</dt>
                <dd>
                  {desktopActionReplayView.replayProjection.privacyAudit.status}{" "}
                  / blockers{" "}
                  {
                    desktopActionReplayView.replayProjection.privacyAudit
                      .blockerCount
                  }
                </dd>
              </div>
              <div>
                <dt>Replay execution</dt>
                <dd>
                  {desktopActionReplayView.readiness.canReplayDesktopAction
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Event write</dt>
                <dd>
                  {desktopActionReplayView.readiness.canWriteEventStore
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{desktopActionReplayView.replayHash.substring(0, 12)}</dd>
              </div>
            </dl>

            <p className="fieldHelp">{desktopActionReplayView.nextAction}</p>
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
            aria-label="Cross-surface Evidence Summary"
          >
            <div className="panelHeader">
              <h2>Cross-surface Evidence Summary</h2>
              <span className="muted">Summary refs only / no tool calls</span>
            </div>
            <p className="fieldHelp">
              Aggregates project knowledge, MCP read-only metadata, MCP
              read-only tool summaries, plugin/skill metadata, desktop observer
              metadata, and desktop action proposal summaries. The App Shell
              does not read raw MCP resource content, call MCP tools, execute
              plugin or skill runtimes, trigger desktop observer commands,
              execute desktop actions, or write EventStore events.
            </p>

            <label>
              <span>Cross-surface evidence refs JSON</span>
              <textarea
                className="compactTextarea"
                value={crossSurfaceEvidenceJsonText}
                onChange={(event) => {
                  setCrossSurfaceEvidenceJsonText(event.target.value);
                }}
                placeholder="Paste summary-only cross-surface evidence refs JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Accepts summary-only refs for project knowledge, MCP metadata,
                plugin/skill metadata, desktop observer metadata, and desktop
                action proposal summaries. Raw MCP output, screenshots, source,
                diffs, prompts, package contents, and secrets are blocked.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewCrossSurfaceEvidence();
                }}
              >
                Preview Evidence Summary
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearCrossSurfaceEvidence();
                }}
              >
                Clear Evidence Summary
              </button>
              <button type="button" className="secondary" disabled>
                Collect Evidence (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Call MCP Tool (disabled)
              </button>
            </div>

            {displayedCrossSurfaceEvidence.status === "empty" ? (
              <p className="empty">
                No cross-surface evidence refs loaded. Paste summary-only
                evidence refs to preview aggregation.
              </p>
            ) : null}

            {displayedCrossSurfaceEvidence.status === "blocked" ? (
              <div className="errorBox">
                <strong>Evidence summary blocked</strong>
                <p>{displayedCrossSurfaceEvidence.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedCrossSurfaceEvidence.status}</dd>
              </div>
              <div>
                <dt>Evidence summary</dt>
                <dd>{displayedCrossSurfaceEvidence.evidenceSummaryId}</dd>
              </div>
              <div>
                <dt>Evidence / workflow refs</dt>
                <dd>
                  {displayedCrossSurfaceEvidence.evidenceCount} /{" "}
                  {displayedCrossSurfaceEvidence.workflowRefCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedCrossSurfaceEvidence.blockerCount} /{" "}
                  {displayedCrossSurfaceEvidence.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedCrossSurfaceEvidence.hashPrefix ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Attach / MCP content</dt>
                <dd>
                  {displayedCrossSurfaceEvidence.readiness
                    .canAttachToWorkflowPreview
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceEvidence.readiness
                    .canReadMcpResourceContent
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>MCP tool / plugin runtime</dt>
                <dd>
                  {displayedCrossSurfaceEvidence.readiness.canCallMcpTool
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceEvidence.readiness
                    .canExecutePluginRuntime
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Desktop observer / action</dt>
                <dd>
                  {displayedCrossSurfaceEvidence.readiness
                    .canTriggerDesktopObserver
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceEvidence.readiness
                    .canExecuteDesktopAction
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>EventStore / App execute</dt>
                <dd>
                  {displayedCrossSurfaceEvidence.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceEvidence.readiness.appCanExecute
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedCrossSurfaceEvidence.workflowSummaryRefs.length > 0 ? (
              <ol className="timeline">
                {displayedCrossSurfaceEvidence.workflowSummaryRefs.map(
                  (ref) => (
                    <li key={`${ref.stepKind}-${ref.refId}`}>
                      <span className="timelineMeta">
                        {ref.stepKind} · {ref.status}
                      </span>
                      <span>{ref.summary}</span>
                      {ref.warningCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Warnings: {ref.warningCodes.join(", ")}
                        </span>
                      ) : null}
                      {ref.blockerCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Blockers: {ref.blockerCodes.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedCrossSurfaceEvidence.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedCrossSurfaceEvidence.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeCrossSurfaceEvidenceView(displayedCrossSurfaceEvidence)
                  .source
              }{" "}
              · {displayedCrossSurfaceEvidence.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Evidence Freshness / Drift"
          >
            <div className="panelHeader">
              <h2>Evidence Freshness / Drift</h2>
              <span className="muted">Read-only / no evidence refresh</span>
            </div>
            <p className="fieldHelp">
              Checks workspace index, project knowledge, memory recall, MCP,
              plugin/skill, desktop observation, desktop action target,
              Git/diff, shell verification, and agent handoff evidence summary
              refs for stale timestamps and drift. The App Shell does not read
              raw evidence, refresh evidence, call MCP tools, execute desktop
              actions, apply patches, rollback, write EventStore events, or run
              Git/shell.
            </p>

            <label>
              <span>Evidence freshness refs JSON</span>
              <textarea
                className="compactTextarea"
                value={evidenceFreshnessJsonText}
                onChange={(event) => {
                  setEvidenceFreshnessJsonText(event.target.value);
                }}
                placeholder="Paste summary-only evidence freshness refs JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Accepts summary-only evidence refs with timestamp, hash,
                source-type, apply timing, and context-presence metadata. Raw
                evidence, source, diffs, screenshots, OCR, stdout/stderr,
                command payloads, and secrets are blocked.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewEvidenceFreshness();
                }}
              >
                Preview Freshness
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearEvidenceFreshness();
                }}
              >
                Clear Freshness
              </button>
            </div>

            {displayedEvidenceFreshness.status === "empty" ? (
              <p className="empty">
                No evidence freshness refs loaded. Paste summary-only evidence
                refs to preview freshness and drift.
              </p>
            ) : null}

            {displayedEvidenceFreshness.status === "blocked" ? (
              <div className="errorBox">
                <strong>Evidence freshness blocked</strong>
                <p>{displayedEvidenceFreshness.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedEvidenceFreshness.status}</dd>
              </div>
              <div>
                <dt>Freshness report</dt>
                <dd>{displayedEvidenceFreshness.freshnessId}</dd>
              </div>
              <div>
                <dt>Evidence refs</dt>
                <dd>{displayedEvidenceFreshness.evidenceCount}</dd>
              </div>
              <div>
                <dt>Stale / drift</dt>
                <dd>
                  {displayedEvidenceFreshness.staleCount} /{" "}
                  {displayedEvidenceFreshness.driftCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedEvidenceFreshness.blockerCount} /{" "}
                  {displayedEvidenceFreshness.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedEvidenceFreshness.hashPrefix ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Workflow review / raw evidence</dt>
                <dd>
                  {displayedEvidenceFreshness.readiness.canUseForWorkflowReview
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedEvidenceFreshness.readiness.canReadRawEvidence
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Refresh / EventStore</dt>
                <dd>
                  {displayedEvidenceFreshness.readiness.canRefreshEvidence
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedEvidenceFreshness.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>MCP / desktop action</dt>
                <dd>
                  {displayedEvidenceFreshness.readiness.canInvokeMcpTool
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedEvidenceFreshness.readiness.canExecuteDesktopAction
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedEvidenceFreshness.refs.length > 0 ? (
              <ol className="timeline">
                {displayedEvidenceFreshness.refs.map((ref) => (
                  <li key={ref.refId}>
                    <span className="timelineMeta">
                      {ref.category} · stale {ref.stale ? "yes" : "no"} · drift{" "}
                      {ref.drifted ? "yes" : "no"}
                    </span>
                    <span>summary {ref.summaryHash}</span>
                    {ref.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {ref.warningCodes.join(", ")}
                      </span>
                    ) : null}
                    {ref.blockerCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Blockers: {ref.blockerCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedEvidenceFreshness.findingCodes.length > 0 ? (
              <p className="muted">
                findings {displayedEvidenceFreshness.findingCodes.join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeEvidenceFreshnessDriftView(displayedEvidenceFreshness)
                  .source
              }{" "}
              · {displayedEvidenceFreshness.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Approval / Receipt Consistency"
          >
            <div className="panelHeader">
              <h2>Approval / Receipt Consistency</h2>
              <span className="muted">Read-only / advisory</span>
            </div>
            <p className="fieldHelp">
              Checks approval receipts, PermissionLease previews, apply and
              rollback receipts, MCP read-only approvals, desktop action
              approvals, live proposal opt-in policy summaries, capability
              plans, broker previews, and workflow stage refs. The App Shell
              does not approve, reject, apply, rollback, issue leases, execute
              desktop actions, write EventStore events, or run Git/shell.
            </p>

            <label>
              <span>Approval consistency refs JSON</span>
              <textarea
                className="compactTextarea"
                value={approvalConsistencyJsonText}
                onChange={(event) => {
                  setApprovalConsistencyJsonText(event.target.value);
                }}
                placeholder="Paste summary-only approval and receipt scope refs JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Accepts summary-only scope refs with task, proposal, workspace,
                target, expiration, typed confirmation, max file/byte, and path
                metadata. Raw prompts, source, diffs, responses, command
                payloads, and secrets are blocked.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewApprovalConsistency();
                }}
              >
                Preview Consistency
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearApprovalConsistency();
                }}
              >
                Clear Consistency Preview
              </button>
            </div>

            {displayedApprovalConsistency.status === "empty" ? (
              <p className="empty">
                No approval consistency refs loaded. Paste summary-only scope
                refs to preview receipt alignment.
              </p>
            ) : null}

            {displayedApprovalConsistency.status === "blocked" ? (
              <div className="errorBox">
                <strong>Approval consistency blocked</strong>
                <p>{displayedApprovalConsistency.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedApprovalConsistency.status}</dd>
              </div>
              <div>
                <dt>Consistency report</dt>
                <dd>{displayedApprovalConsistency.consistencyId}</dd>
              </div>
              <div>
                <dt>Consistent / total scopes</dt>
                <dd>
                  {displayedApprovalConsistency.consistentScopeCount} /{" "}
                  {displayedApprovalConsistency.scopeCount}
                </dd>
              </div>
              <div>
                <dt>Inconsistent / warning scopes</dt>
                <dd>
                  {displayedApprovalConsistency.inconsistentScopeCount} /{" "}
                  {displayedApprovalConsistency.warningScopeCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedApprovalConsistency.blockerCount} /{" "}
                  {displayedApprovalConsistency.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedApprovalConsistency.hashPrefix ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Advisory / approve</dt>
                <dd>
                  {displayedApprovalConsistency.readiness
                    .canUseForAdvisoryReview
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedApprovalConsistency.readiness.canApprove
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback</dt>
                <dd>
                  {displayedApprovalConsistency.readiness.canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedApprovalConsistency.readiness.canRollback
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Lease / EventStore</dt>
                <dd>
                  {displayedApprovalConsistency.readiness
                    .canIssuePermissionLease
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedApprovalConsistency.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Desktop / Git-shell</dt>
                <dd>
                  {displayedApprovalConsistency.readiness
                    .canExecuteDesktopAction
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedApprovalConsistency.readiness.canExecuteGit ||
                  displayedApprovalConsistency.readiness.canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedApprovalConsistency.scopeSummaries.length > 0 ? (
              <ol className="timeline">
                {displayedApprovalConsistency.scopeSummaries.map((scope) => (
                  <li key={scope.scopeId}>
                    <span className="timelineMeta">
                      {scope.kind} · {scope.stageKind} · {scope.status}
                    </span>
                    <span>summary {scope.summaryHash}</span>
                    {scope.expiresAt !== undefined ? (
                      <span className="timelineMeta">
                        expires {scope.expiresAt}
                      </span>
                    ) : null}
                    {scope.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {scope.warningCodes.join(", ")}
                      </span>
                    ) : null}
                    {scope.blockerCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Blockers: {scope.blockerCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedApprovalConsistency.findingCodes.length > 0 ? (
              <p className="muted">
                findings {displayedApprovalConsistency.findingCodes.join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeApprovalConsistencyView(displayedApprovalConsistency)
                  .source
              }{" "}
              · {displayedApprovalConsistency.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Capability Policy Enforcement"
          >
            <div className="panelHeader">
              <h2>Capability Policy Enforcement</h2>
              <span className="muted">Read-only / policy report</span>
            </div>
            <p className="fieldHelp">
              Checks capability descriptors, broker plan previews, MCP
              descriptors, plugin and skill descriptors, desktop action
              proposals, Git/shell lane summaries, and approval consistency
              reports. The App Shell does not execute capabilities, approve,
              apply, rollback, issue leases, invoke MCP tools, run plugin or
              skill runtimes, execute desktop actions, or run Git/shell.
            </p>

            <label>
              <span>Capability policy refs JSON</span>
              <textarea
                className="compactTextarea"
                value={capabilityPolicyJsonText}
                onChange={(event) => {
                  setCapabilityPolicyJsonText(event.target.value);
                }}
                placeholder="Paste summary-only capability policy refs JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Accepts summary-only capability refs with category, mode, risk,
                allowlist, fixed-lane, manual approval, and warning metadata.
                Raw args, raw output, command payloads, EventStore writes, broad
                leases, and secrets are blocked.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewCapabilityPolicy();
                }}
              >
                Preview Policy Report
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearCapabilityPolicy();
                }}
              >
                Clear Policy Report
              </button>
            </div>

            {displayedCapabilityPolicy.status === "empty" ? (
              <p className="empty">
                No capability policy refs loaded. Paste summary-only capability
                refs to preview policy enforcement.
              </p>
            ) : null}

            {displayedCapabilityPolicy.status === "blocked" ? (
              <div className="errorBox">
                <strong>Capability policy blocked</strong>
                <p>{displayedCapabilityPolicy.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedCapabilityPolicy.status}</dd>
              </div>
              <div>
                <dt>Policy report</dt>
                <dd>{displayedCapabilityPolicy.policyId}</dd>
              </div>
              <div>
                <dt>Allowed / total capabilities</dt>
                <dd>
                  {displayedCapabilityPolicy.allowedCount} /{" "}
                  {displayedCapabilityPolicy.capabilityCount}
                </dd>
              </div>
              <div>
                <dt>Blocked / warnings</dt>
                <dd>
                  {displayedCapabilityPolicy.blockedCount} /{" "}
                  {displayedCapabilityPolicy.warningCount}
                </dd>
              </div>
              <div>
                <dt>Findings / blockers</dt>
                <dd>
                  {displayedCapabilityPolicy.findingCount} /{" "}
                  {displayedCapabilityPolicy.blockerCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedCapabilityPolicy.hashPrefix ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Policy review / approve</dt>
                <dd>
                  {displayedCapabilityPolicy.readiness.canUseForPolicyReview
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityPolicy.readiness.canApprove
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>MCP / plugin runtime</dt>
                <dd>
                  {displayedCapabilityPolicy.readiness.canInvokeMcpTool
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityPolicy.readiness.canExecutePluginRuntime
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Desktop / Git-shell</dt>
                <dd>
                  {displayedCapabilityPolicy.readiness.canExecuteDesktopAction
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityPolicy.readiness.canExecuteGit ||
                  displayedCapabilityPolicy.readiness.canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback / lease</dt>
                <dd>
                  {displayedCapabilityPolicy.readiness.canApplyPatch ||
                  displayedCapabilityPolicy.readiness.canRollback ||
                  displayedCapabilityPolicy.readiness.canIssuePermissionLease
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedCapabilityPolicy.itemSummaries.length > 0 ? (
              <ol className="timeline">
                {displayedCapabilityPolicy.itemSummaries.map((item) => (
                  <li key={item.capabilityId}>
                    <span className="timelineMeta">
                      {item.category} · {item.mode} · {item.riskLevel}
                    </span>
                    <span>summary {item.summaryHash}</span>
                    <span className="timelineMeta">
                      allowed {item.allowed ? "yes" : "no"}
                    </span>
                    {item.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {item.warningCodes.join(", ")}
                      </span>
                    ) : null}
                    {item.blockerCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Blockers: {item.blockerCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedCapabilityPolicy.findingCodes.length > 0 ? (
              <p className="muted">
                findings {displayedCapabilityPolicy.findingCodes.join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeCapabilityPolicyEnforcementView(
                  displayedCapabilityPolicy
                ).source
              }{" "}
              · {displayedCapabilityPolicy.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Cross-surface Agent Workflow"
          >
            <div className="panelHeader">
              <h2>Cross-surface Agent Workflow</h2>
              <span className="muted">
                Workflow preview / controlled lanes only
              </span>
            </div>
            <p className="fieldHelp">
              {
                "Previews the v0.28 fixed cross-surface workflow from summary refs only, with v0.29 North Star hardening for recovery, approval consistency, policy, replay, freshness, and handoff review. The App Shell does not run DeepSeek, run agents, call MCP tools, execute desktop actions, apply patches, rollback, or write EventStore events."
              }
            </p>

            <label>
              <span>Cross-surface workflow scenario JSON</span>
              <textarea
                className="compactTextarea"
                value={crossSurfaceWorkflowScenarioText}
                onChange={(event) => {
                  setCrossSurfaceWorkflowScenarioText(event.target.value);
                }}
                placeholder="Paste summary-only cross-surface workflow scenario JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Accepts objective, route, stage, evidence, no-compress, and
                expected outcome summaries. Raw prompts, source text, diffs,
                secrets, and execution flags are blocked before preview.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewCrossSurfaceWorkflow();
                }}
              >
                Preview Cross-surface Workflow
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearCrossSurfaceWorkflow();
                }}
              >
                Clear Workflow Preview
              </button>
              <button type="button" className="secondary" disabled>
                Run Cross-surface Workflow (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Auto-execute Workflow (disabled)
              </button>
            </div>

            {displayedCrossSurfaceWorkflow.status === "empty" ? (
              <p className="empty">
                No cross-surface workflow scenario loaded. Paste a summary-only
                scenario to preview the controlled lane plan.
              </p>
            ) : null}

            {displayedCrossSurfaceWorkflow.status === "blocked" ? (
              <div className="errorBox">
                <strong>Cross-surface workflow blocked</strong>
                <p>{displayedCrossSurfaceWorkflow.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedCrossSurfaceWorkflow.status}</dd>
              </div>
              <div>
                <dt>Scenario</dt>
                <dd>{displayedCrossSurfaceWorkflow.scenarioId ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>{displayedCrossSurfaceWorkflow.planId ?? "n/a"}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{displayedCrossSurfaceWorkflow.state ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Steps ready / total</dt>
                <dd>
                  {displayedCrossSurfaceWorkflow.readyStepCount} /{" "}
                  {displayedCrossSurfaceWorkflow.stepCount}
                </dd>
              </div>
              <div>
                <dt>Missing / blocked steps</dt>
                <dd>
                  {displayedCrossSurfaceWorkflow.missingStepCount} /{" "}
                  {displayedCrossSurfaceWorkflow.blockedStepCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedCrossSurfaceWorkflow.blockerCount} /{" "}
                  {displayedCrossSurfaceWorkflow.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedCrossSurfaceWorkflow.hashPrefix ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Preview / run workflow</dt>
                <dd>
                  {displayedCrossSurfaceWorkflow.readiness.canPreviewWorkflow
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceWorkflow.readiness.canRunWorkflow
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>DeepSeek / agents</dt>
                <dd>
                  {displayedCrossSurfaceWorkflow.readiness.canCallDeepSeek
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceWorkflow.readiness.canRunAgents
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>MCP / desktop action</dt>
                <dd>
                  {displayedCrossSurfaceWorkflow.readiness.canInvokeMcpTools
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceWorkflow.readiness
                    .canExecuteDesktopAction
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback</dt>
                <dd>
                  {displayedCrossSurfaceWorkflow.readiness.canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceWorkflow.readiness.canRollback
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>EventStore / App execute</dt>
                <dd>
                  {displayedCrossSurfaceWorkflow.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceWorkflow.readiness.appCanExecute
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            <div className="statusBox">
              <strong>Approved actions sequencer</strong>
              <p>
                {
                  summarizeCrossSurfaceApprovedSequence(
                    crossSurfaceApprovedSequence
                  ).source
                }{" "}
                · {crossSurfaceApprovedSequence.status} · lanes{" "}
                {crossSurfaceApprovedSequence.readyLaneCount} /{" "}
                {crossSurfaceApprovedSequence.laneCount} · missing approvals{" "}
                {crossSurfaceApprovedSequence.missingApprovals.length}
              </p>
              <p className="muted">
                Sequencer summary only. It does not auto-execute approved apply,
                verification, desktop action, rollback, or replay lanes.
              </p>
              <p className="muted">
                canExecuteNow{" "}
                {crossSurfaceApprovedSequence.readiness.canExecuteNow
                  ? "yes"
                  : "no"}{" "}
                / sequencerExecutes{" "}
                {crossSurfaceApprovedSequence.readiness.sequencerExecutes
                  ? "yes"
                  : "no"}
              </p>
            </div>

            {displayedCrossSurfaceWorkflow.stages.length > 0 ? (
              <ol className="timeline">
                {displayedCrossSurfaceWorkflow.stages.map((stage) => (
                  <li key={`${stage.kind}-${stage.stageId ?? stage.refId}`}>
                    <span className="timelineMeta">
                      {stage.kind} · {stage.status}
                    </span>
                    <span>{stage.stateAfter}</span>
                    {stage.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {stage.warningCodes.join(", ")}
                      </span>
                    ) : null}
                    {stage.blockerCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Blockers: {stage.blockerCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedCrossSurfaceWorkflow.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedCrossSurfaceWorkflow.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeCrossSurfaceWorkflowView(displayedCrossSurfaceWorkflow)
                  .source
              }{" "}
              · {displayedCrossSurfaceWorkflow.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Cross-surface Replay Audit Timeline"
          >
            <div className="panelHeader">
              <h2>Cross-surface Replay Audit Timeline</h2>
              <span className="muted">Read-only / no re-run</span>
            </div>
            <p className="fieldHelp">
              Renders summary-only replay and audit refs for the cross-surface
              workflow. The App Shell does not replay execution, re-run actions,
              write EventStore events, show raw content, show raw screenshot or
              OCR, or show raw stdout/stderr.
            </p>

            <label>
              <span>Cross-surface replay timeline JSON</span>
              <textarea
                className="compactTextarea"
                value={crossSurfaceReplayTimelineText}
                onChange={(event) => {
                  setCrossSurfaceReplayTimelineText(event.target.value);
                }}
                placeholder="Paste summary-only replay/audit timeline refs JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Accepts objective, proposal, route, evidence, desktop, apply,
                verification, rollback, and final audit summary refs. Raw event
                payloads, screenshots, OCR, stdout, stderr, source, diffs, and
                secrets are blocked.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewCrossSurfaceReplayTimeline();
                }}
              >
                Preview Replay Timeline
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearCrossSurfaceReplayTimeline();
                }}
              >
                Clear Replay Timeline
              </button>
              <button type="button" className="secondary" disabled>
                Replay Execution (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Re-run Actions (disabled)
              </button>
            </div>

            {displayedCrossSurfaceReplayTimeline.status === "empty" ? (
              <p className="empty">
                No replay/audit timeline loaded. Paste summary-only timeline
                refs to preview the audit chain.
              </p>
            ) : null}

            {displayedCrossSurfaceReplayTimeline.status === "blocked" ? (
              <div className="errorBox">
                <strong>Replay/audit timeline blocked</strong>
                <p>{displayedCrossSurfaceReplayTimeline.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedCrossSurfaceReplayTimeline.status}</dd>
              </div>
              <div>
                <dt>Timeline</dt>
                <dd>{displayedCrossSurfaceReplayTimeline.timelineId}</dd>
              </div>
              <div>
                <dt>Stages present / total</dt>
                <dd>
                  {displayedCrossSurfaceReplayTimeline.presentStageCount} /{" "}
                  {displayedCrossSurfaceReplayTimeline.stageCount}
                </dd>
              </div>
              <div>
                <dt>Missing critical</dt>
                <dd>
                  {
                    displayedCrossSurfaceReplayTimeline.missingCriticalStageCount
                  }
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedCrossSurfaceReplayTimeline.blockerCount} /{" "}
                  {displayedCrossSurfaceReplayTimeline.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedCrossSurfaceReplayTimeline.hashPrefix ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Render / replay</dt>
                <dd>
                  {displayedCrossSurfaceReplayTimeline.readiness
                    .canRenderTimeline
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceReplayTimeline.readiness
                    .canReplayExecution
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Re-run / EventStore</dt>
                <dd>
                  {displayedCrossSurfaceReplayTimeline.readiness.canRerunActions
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceReplayTimeline.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Raw content / stdout</dt>
                <dd>
                  {displayedCrossSurfaceReplayTimeline.readiness
                    .canShowRawContent
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceReplayTimeline.readiness
                    .canShowRawStdoutStderr
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedCrossSurfaceReplayTimeline.items.length > 0 ? (
              <ol className="timeline">
                {displayedCrossSurfaceReplayTimeline.items.map((item) => (
                  <li key={`${item.stage}-${item.refId}`}>
                    <span className="timelineMeta">
                      {item.stage} · {item.status}
                    </span>
                    <span>{item.summaryHash}</span>
                    {item.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {item.warningCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedCrossSurfaceReplayTimeline.findingCodes.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedCrossSurfaceReplayTimeline.findingCodes.join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeCrossSurfaceReplayTimelineView(
                  displayedCrossSurfaceReplayTimeline
                ).source
              }{" "}
              · {displayedCrossSurfaceReplayTimeline.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Cross-surface Replay / Audit Completeness"
          >
            <div className="panelHeader">
              <h2>Cross-surface Replay / Audit Completeness</h2>
              <span className="muted">Read-only / no replay execution</span>
            </div>
            <p className="fieldHelp">
              Checks that replay/audit summary events include required task,
              model proposal, repair/schema validation, approval, apply,
              verification, rollback, MCP, plugin/skill, desktop, agent route,
              policy, and redaction refs. The App Shell does not replay
              execution, re-run actions, apply patches, rollback, write
              EventStore events, invoke MCP tools, execute desktop actions, or
              run Git/shell.
            </p>

            <label>
              <span>Replay/audit completeness JSON</span>
              <textarea
                className="compactTextarea"
                value={crossSurfaceReplayAuditText}
                onChange={(event) => {
                  setCrossSurfaceReplayAuditText(event.target.value);
                }}
                placeholder="Paste summary-only replay/audit completeness events JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Accepts summary-only event refs and relation flags. Raw event
                payloads, source, diffs, prompts, responses, screenshots, OCR,
                stdout/stderr, command payloads, and secrets are blocked.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewCrossSurfaceReplayAudit();
                }}
              >
                Preview Replay Audit
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearCrossSurfaceReplayAudit();
                }}
              >
                Clear Replay Audit
              </button>
            </div>

            {displayedCrossSurfaceReplayAudit.status === "empty" ? (
              <p className="empty">
                No replay/audit completeness events loaded. Paste summary-only
                events to preview completeness.
              </p>
            ) : null}

            {displayedCrossSurfaceReplayAudit.status === "blocked" ? (
              <div className="errorBox">
                <strong>Replay/audit completeness blocked</strong>
                <p>{displayedCrossSurfaceReplayAudit.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedCrossSurfaceReplayAudit.status}</dd>
              </div>
              <div>
                <dt>Completeness report</dt>
                <dd>{displayedCrossSurfaceReplayAudit.completenessId}</dd>
              </div>
              <div>
                <dt>Events</dt>
                <dd>{displayedCrossSurfaceReplayAudit.eventCount}</dd>
              </div>
              <div>
                <dt>Required present / total</dt>
                <dd>
                  {displayedCrossSurfaceReplayAudit.presentRequiredEventCount} /{" "}
                  {displayedCrossSurfaceReplayAudit.requiredEventCount}
                </dd>
              </div>
              <div>
                <dt>Missing required</dt>
                <dd>
                  {displayedCrossSurfaceReplayAudit.missingRequiredEventCount}
                </dd>
              </div>
              <div>
                <dt>Out-of-order / duplicate conflicts</dt>
                <dd>
                  {displayedCrossSurfaceReplayAudit.outOfOrderCount} /{" "}
                  {displayedCrossSurfaceReplayAudit.duplicateConflictCount}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedCrossSurfaceReplayAudit.blockerCount} /{" "}
                  {displayedCrossSurfaceReplayAudit.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedCrossSurfaceReplayAudit.hashPrefix ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Render / replay</dt>
                <dd>
                  {displayedCrossSurfaceReplayAudit.readiness
                    .canRenderCompletenessReport
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCrossSurfaceReplayAudit.readiness.canReplayExecution
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback / EventStore</dt>
                <dd>
                  {displayedCrossSurfaceReplayAudit.readiness.canApplyPatch ||
                  displayedCrossSurfaceReplayAudit.readiness.canRollback ||
                  displayedCrossSurfaceReplayAudit.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedCrossSurfaceReplayAudit.missingRequiredKinds.length >
            0 ? (
              <p className="muted">
                missing{" "}
                {displayedCrossSurfaceReplayAudit.missingRequiredKinds.join(
                  ", "
                )}
              </p>
            ) : null}

            {displayedCrossSurfaceReplayAudit.eventSummaries.length > 0 ? (
              <ol className="timeline">
                {displayedCrossSurfaceReplayAudit.eventSummaries.map(
                  (event) => (
                    <li key={event.eventId}>
                      <span className="timelineMeta">
                        {event.kind} · {event.status}
                      </span>
                      <span>summary {event.summaryHash}</span>
                      {event.warningCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Warnings: {event.warningCodes.join(", ")}
                        </span>
                      ) : null}
                      {event.blockerCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Blockers: {event.blockerCodes.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedCrossSurfaceReplayAudit.findingCodes.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedCrossSurfaceReplayAudit.findingCodes.join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeCrossSurfaceReplayAuditView(
                  displayedCrossSurfaceReplayAudit
                ).source
              }{" "}
              · {displayedCrossSurfaceReplayAudit.nextAction}
            </p>
          </section>

          <section className="eventPanel" aria-label="MCP Read-only Connection">
            <div className="panelHeader">
              <h2>MCP Read-only Connection</h2>
              <span className="muted">
                Read-only discovery / no tool invocation
              </span>
            </div>
            <p className="fieldHelp">
              Discovers MCP resources, prompts, and tool metadata through the
              fixed App/Tauri read-only command. The App Shell does not invoke
              MCP tools, read resource content, execute prompts, write events,
              apply patches, rollback, or issue leases.
            </p>

            <label>
              <span>MCP connection profile JSON</span>
              <textarea
                className="compactTextarea"
                value={mcpReadonlyProfileText}
                onChange={(event) => {
                  setMcpReadonlyProfileText(event.target.value);
                }}
                placeholder="Paste summary-only MCP connection profile JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                The App accepts fixed injected read-only metadata profiles only.
                Resource content, tool arguments, raw metadata, secrets, and
                execution flags are rejected before discovery.
              </p>
            </label>

            <label>
              <span>Typed confirmation</span>
              <input
                value={mcpReadonlyTypedConfirmation}
                onChange={(event) => {
                  setMcpReadonlyTypedConfirmation(event.target.value);
                }}
                placeholder="DISCOVER MCP METADATA"
              />
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                disabled={
                  !displayedMcpReadonlyConnection.readiness
                    .canDiscoverMetadata ||
                  mcpReadonlyConnectionStatus === "running"
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleDiscoverMcpReadonlyMetadata();
                }}
              >
                Discover MCP Metadata
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearMcpReadonlyConnection();
                }}
              >
                Clear MCP Metadata
              </button>
              <button type="button" className="secondary" disabled>
                Invoke MCP Tool (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Read MCP Resource Content (disabled)
              </button>
            </div>

            {displayedMcpReadonlyConnection.status === "empty" ? (
              <p className="empty">
                No MCP profile loaded. Paste a summary-only profile and type the
                fixed confirmation to preview metadata discovery.
              </p>
            ) : null}

            {displayedMcpReadonlyConnection.status === "blocked" ? (
              <div className="errorBox">
                <strong>MCP metadata discovery blocked</strong>
                <p>{displayedMcpReadonlyConnection.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedMcpReadonlyConnection.status}</dd>
              </div>
              <div>
                <dt>Profile</dt>
                <dd>{displayedMcpReadonlyConnection.profileId ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Server</dt>
                <dd>
                  {displayedMcpReadonlyConnection.serverDisplayName ??
                    displayedMcpReadonlyConnection.displayName ??
                    "n/a"}
                </dd>
              </div>
              <div>
                <dt>Transport</dt>
                <dd>{displayedMcpReadonlyConnection.transportKind ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Resources / prompts / tools</dt>
                <dd>
                  {displayedMcpReadonlyConnection.resourceCount} /{" "}
                  {displayedMcpReadonlyConnection.promptCount} /{" "}
                  {displayedMcpReadonlyConnection.toolCount}
                </dd>
              </div>
              <div>
                <dt>Descriptors</dt>
                <dd>{displayedMcpReadonlyConnection.descriptorCount}</dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedMcpReadonlyConnection.blockerCount} /{" "}
                  {displayedMcpReadonlyConnection.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedMcpReadonlyConnection.resultHashPrefix ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Discover / invoke tool</dt>
                <dd>
                  {displayedMcpReadonlyConnection.readiness.canDiscoverMetadata
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpReadonlyConnection.readiness.canInvokeMcpTool
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Read content / execute prompt</dt>
                <dd>
                  {displayedMcpReadonlyConnection.readiness
                    .canReadMcpResourceContent
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpReadonlyConnection.readiness.canExecuteMcpPrompt
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Event write / lease</dt>
                <dd>
                  {displayedMcpReadonlyConnection.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpReadonlyConnection.readiness
                    .canIssuePermissionLease
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>App execute</dt>
                <dd>
                  {displayedMcpReadonlyConnection.readiness.appCanExecute
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedMcpReadonlyConnection.descriptorPreview.length > 0 ? (
              <ol className="timeline">
                {displayedMcpReadonlyConnection.descriptorPreview.map(
                  (descriptor) => (
                    <li key={`${descriptor.kind}-${descriptor.descriptorId}`}>
                      <span className="timelineMeta">
                        {descriptor.kind} · {descriptor.invokePolicy} ·{" "}
                        {descriptor.riskLevel}
                      </span>
                      <span>{descriptor.displayName}</span>
                      {descriptor.warningCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Warnings: {descriptor.warningCodes.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedMcpReadonlyConnection.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedMcpReadonlyConnection.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeMcpReadonlyConnectionView(
                  displayedMcpReadonlyConnection
                ).source
              }{" "}
              · {displayedMcpReadonlyConnection.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="MCP Tool Invocation Proposal"
          >
            <div className="panelHeader">
              <h2>MCP Tool Invocation Proposal</h2>
              <span className="muted">Proposal only / no tool invocation</span>
            </div>
            <p className="fieldHelp">
              Reviews summary-only MCP tool invocation proposals, input schema
              risk, simulated results, and broker planning refs. The App Shell
              does not call MCP tools, approve invocations, write events, apply
              patches, rollback, or issue leases.
            </p>

            <label>
              <span>MCP tool proposal summary JSON</span>
              <textarea
                className="compactTextarea"
                value={mcpToolProposalSummaryText}
                onChange={(event) => {
                  setMcpToolProposalSummaryText(event.target.value);
                  setMcpToolProposalPreview(undefined);
                }}
                placeholder="Paste summary-only MCP tool proposal JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                The App accepts proposal, risk, simulated result, and broker
                planning summaries only. Tool arguments, tool outputs, resource
                content, secrets, and execution flags are rejected.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewMcpToolProposal();
                }}
              >
                Preview MCP Tool Proposal
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearMcpToolProposal();
                }}
              >
                Clear MCP Tool Proposal
              </button>
              <button type="button" className="secondary" disabled>
                Invoke MCP Tool (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Approve Tool Invocation (disabled)
              </button>
            </div>

            {displayedMcpToolProposal.status === "empty" ? (
              <p className="empty">
                No MCP tool proposal loaded. Paste a summary-only proposal to
                preview risk, approval draft, and simulated result refs.
              </p>
            ) : null}

            {displayedMcpToolProposal.status === "blocked" ? (
              <div className="errorBox">
                <strong>MCP tool proposal blocked</strong>
                <p>{displayedMcpToolProposal.nextAction}</p>
                {displayedMcpToolProposal.findings.length > 0 ? (
                  <p>
                    codes{" "}
                    {displayedMcpToolProposal.findings
                      .map((finding) => finding.code)
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedMcpToolProposal.status}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>{displayedMcpToolProposal.proposalId ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Server ref</dt>
                <dd>{displayedMcpToolProposal.serverRef ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Tool</dt>
                <dd>{displayedMcpToolProposal.toolName ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Risk</dt>
                <dd>{displayedMcpToolProposal.riskLevel}</dd>
              </div>
              <div>
                <dt>Input schema</dt>
                <dd>{displayedMcpToolProposal.inputSchemaSummary}</dd>
              </div>
              <div>
                <dt>Argument hash</dt>
                <dd>{displayedMcpToolProposal.argumentSummaryHash}</dd>
              </div>
              <div>
                <dt>Approval required</dt>
                <dd>
                  {displayedMcpToolProposal.approvalRequired ? "yes" : "no"}
                </dd>
              </div>
              <div>
                <dt>Simulated result</dt>
                <dd>{displayedMcpToolProposal.simulatedResultSummary}</dd>
              </div>
              <div>
                <dt>Broker planning</dt>
                <dd>{displayedMcpToolProposal.brokerPlanningSummary}</dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedMcpToolProposal.blockerCount} /{" "}
                  {displayedMcpToolProposal.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedMcpToolProposal.proposalHashPrefix ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Display / invoke</dt>
                <dd>
                  {displayedMcpToolProposal.readiness.canDisplayProposal
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpToolProposal.readiness.canInvokeMcpTool
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Approve / event write</dt>
                <dd>
                  {displayedMcpToolProposal.readiness.canApproveToolInvocation
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpToolProposal.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>App execute</dt>
                <dd>
                  {displayedMcpToolProposal.readiness.appCanExecute
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedMcpToolProposal.status !== "empty" &&
            displayedMcpToolProposal.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedMcpToolProposal.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {summarizeMcpToolProposalView(displayedMcpToolProposal).source} ·{" "}
              {displayedMcpToolProposal.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="MCP Read-only Tool Execution"
          >
            <div className="panelHeader">
              <h2>MCP Read-only Tool Execution</h2>
              <span className="muted">
                Explicit approval / read-only tool only
              </span>
              <span className="muted">No mutating tools</span>
            </div>
            <p className="fieldHelp">
              Calls only the fixed MCP read-only Tauri wrapper after exact typed
              confirmation. The App Shell does not expose raw arguments, raw
              output, generic MCP invocation, mutating tools, EventStore writes,
              Git, shell, native bridge, or desktop actions. Redaction counts
              and replay summaries are shown without persisting raw tool output.
            </p>

            <div className="formGrid">
              <label>
                <span>Typed confirmation</span>
                <input
                  value={mcpReadonlyToolTypedConfirmation}
                  onChange={(event) => {
                    setMcpReadonlyToolTypedConfirmation(event.target.value);
                    setMcpReadonlyToolExecutionPreview(undefined);
                    setMcpReadonlyToolCallError(undefined);
                  }}
                  placeholder="CALL READONLY MCP TOOL"
                />
              </label>
              <label>
                <span>Arguments summary</span>
                <input
                  value={mcpReadonlyToolArgumentSummary}
                  onChange={(event) => {
                    setMcpReadonlyToolArgumentSummary(event.target.value);
                    setMcpReadonlyToolExecutionPreview(undefined);
                    setMcpReadonlyToolCallResult(undefined);
                    setMcpReadonlyToolCallError(undefined);
                  }}
                  placeholder="querySummaryHash=docs-safe; maxResults=3"
                />
              </label>
            </div>

            <div className="buttonRow">
              <button
                type="button"
                className="primary"
                disabled={
                  displayedMcpReadonlyToolExecution.safeCallRequest ===
                    undefined || mcpReadonlyToolCallStatus === "running"
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleCallMcpReadonlyTool();
                }}
              >
                Call Read-only MCP Tool
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearMcpReadonlyToolExecution();
                }}
              >
                Clear MCP Tool Result
              </button>
              <button type="button" className="secondary" disabled>
                Invoke Mutating MCP Tool (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Write MCP Result Event (disabled)
              </button>
            </div>

            {displayedMcpReadonlyToolExecution.status === "blocked" ? (
              <div className="errorBox">
                <strong>MCP read-only tool call blocked</strong>
                <p>{displayedMcpReadonlyToolExecution.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedMcpReadonlyToolExecution.status}</dd>
              </div>
              <div>
                <dt>Connection profile</dt>
                <dd>
                  {displayedMcpReadonlyToolExecution.connectionProfileRef}
                </dd>
              </div>
              <div>
                <dt>Tool</dt>
                <dd>{displayedMcpReadonlyToolExecution.toolName}</dd>
              </div>
              <div>
                <dt>Risk</dt>
                <dd>{displayedMcpReadonlyToolExecution.riskLevel}</dd>
              </div>
              <div>
                <dt>Schema summary</dt>
                <dd>{displayedMcpReadonlyToolExecution.inputSchemaSummary}</dd>
              </div>
              <div>
                <dt>Approval receipt</dt>
                <dd>{displayedMcpReadonlyToolExecution.approvalReceiptId}</dd>
              </div>
              <div>
                <dt>Typed confirmation</dt>
                <dd>
                  {displayedMcpReadonlyToolExecution.typedConfirmation ===
                  displayedMcpReadonlyToolExecution.typedConfirmationRequired
                    ? "matched"
                    : "missing"}
                </dd>
              </div>
              <div>
                <dt>Output hash</dt>
                <dd>
                  {displayedMcpReadonlyToolExecution.outputHashPrefix ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Output bytes / lines</dt>
                <dd>
                  {displayedMcpReadonlyToolExecution.outputBytes ?? 0} /{" "}
                  {displayedMcpReadonlyToolExecution.outputLineCount ?? 0}
                </dd>
              </div>
              <div>
                <dt>Redaction counts</dt>
                <dd>
                  {
                    displayedMcpReadonlyToolExecution.redactionSummary
                      .secretMarkerCount
                  }{" "}
                  /{" "}
                  {
                    displayedMcpReadonlyToolExecution.redactionSummary
                      .rawMarkerCount
                  }{" "}
                  /{" "}
                  {
                    displayedMcpReadonlyToolExecution.redactionSummary
                      .mutatingMarkerCount
                  }
                </dd>
              </div>
              <div>
                <dt>Replay result events</dt>
                <dd>
                  {
                    displayedMcpReadonlyToolExecution.replaySummary
                      .resultEventCount
                  }
                </dd>
              </div>
              <div>
                <dt>Call / Event write</dt>
                <dd>
                  {displayedMcpReadonlyToolExecution.readiness
                    .canSubmitReadonlyToolCall
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpReadonlyToolExecution.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Git / shell / lease</dt>
                <dd>
                  {displayedMcpReadonlyToolExecution.readiness.canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpReadonlyToolExecution.readiness.canExecuteShell
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpReadonlyToolExecution.readiness
                    .canIssuePermissionLease
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedMcpReadonlyToolExecution.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedMcpReadonlyToolExecution.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeMcpReadonlyToolExecutionView(
                  displayedMcpReadonlyToolExecution
                ).source
              }{" "}
              · {displayedMcpReadonlyToolExecution.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="MCP Metadata Redaction Audit"
          >
            <div className="panelHeader">
              <h2>MCP Metadata Redaction Audit</h2>
              <span className="muted">Summary only / no raw metadata</span>
            </div>
            <p className="fieldHelp">
              Audits MCP connection, discovery, descriptor, and App surface
              summaries for raw metadata, prompt/source/diff leaks, secrets,
              resource content, and tool invocation fields. The App Shell does
              not invoke MCP tools, read resource content, write events, or
              execute actions.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewMcpMetadataRedactionAudit();
                }}
              >
                Preview MCP Metadata Audit
              </button>
              <button type="button" className="secondary" disabled>
                Write MCP Audit Event (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Invoke MCP Tool (disabled)
              </button>
            </div>

            {displayedMcpMetadataRedactionAudit.status === "empty" ? (
              <p className="empty">
                No MCP metadata audit preview yet. Discover or preview MCP
                metadata summaries before auditing redaction boundaries.
              </p>
            ) : null}

            {displayedMcpMetadataRedactionAudit.status === "blocked" ? (
              <div className="errorBox">
                <strong>MCP metadata audit blocked</strong>
                <p>{displayedMcpMetadataRedactionAudit.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedMcpMetadataRedactionAudit.status}</dd>
              </div>
              <div>
                <dt>Audit</dt>
                <dd>{displayedMcpMetadataRedactionAudit.auditId}</dd>
              </div>
              <div>
                <dt>Records</dt>
                <dd>{displayedMcpMetadataRedactionAudit.recordCount}</dd>
              </div>
              <div>
                <dt>Redacted / raw fields</dt>
                <dd>
                  {displayedMcpMetadataRedactionAudit.redactedFieldCount} /{" "}
                  {displayedMcpMetadataRedactionAudit.rawFieldDetectedCount}
                </dd>
              </div>
              <div>
                <dt>Prompt / source / diff</dt>
                <dd>
                  {displayedMcpMetadataRedactionAudit.rawPromptDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpMetadataRedactionAudit.rawSourceDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpMetadataRedactionAudit.rawDiffDetected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Secret / execution</dt>
                <dd>
                  {displayedMcpMetadataRedactionAudit.secretDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpMetadataRedactionAudit.executionFieldDetected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Tool / resource risks</dt>
                <dd>
                  {
                    displayedMcpMetadataRedactionAudit.riskCounts
                      .toolInvocationRiskCount
                  }{" "}
                  /{" "}
                  {
                    displayedMcpMetadataRedactionAudit.riskCounts
                      .resourceContentRiskCount
                  }
                </dd>
              </div>
              <div>
                <dt>Command / huge metadata</dt>
                <dd>
                  {
                    displayedMcpMetadataRedactionAudit.riskCounts
                      .commandInjectionRiskCount
                  }{" "}
                  /{" "}
                  {
                    displayedMcpMetadataRedactionAudit.riskCounts
                      .hugeMetadataRiskCount
                  }
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedMcpMetadataRedactionAudit.blockerCount} /{" "}
                  {displayedMcpMetadataRedactionAudit.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedMcpMetadataRedactionAudit.auditHashPrefix}</dd>
              </div>
              <div>
                <dt>Preview / event write</dt>
                <dd>
                  {displayedMcpMetadataRedactionAudit.readiness.canPreviewAudit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpMetadataRedactionAudit.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Invoke / read content</dt>
                <dd>
                  {displayedMcpMetadataRedactionAudit.readiness.canInvokeMcpTool
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedMcpMetadataRedactionAudit.readiness
                    .canReadMcpResourceContent
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedMcpMetadataRedactionAudit.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedMcpMetadataRedactionAudit.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeMcpMetadataRedactionAuditView(
                  displayedMcpMetadataRedactionAudit
                ).appSource
              }{" "}
              · {displayedMcpMetadataRedactionAudit.nextAction}
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
            aria-label="Approved Execution Recovery"
          >
            <div className="panelHeader">
              <h2>Approved Execution Recovery</h2>
              <span className="muted">
                Recovery preview / no auto execution
              </span>
            </div>
            <p className="fieldHelp">
              Summarizes v0.15 approved apply or rollback recovery after safe
              failures. The App Shell does not auto-retry, rollback from this
              panel, write files, write events, run Git or shell, issue leases,
              expose raw content, or use native bridge or desktop actions.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewApprovedExecutionRecovery();
                }}
              >
                Preview Approved Recovery
              </button>
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Retry Apply (disabled)
              </button>
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Rollback From Recovery (disabled)
              </button>
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Write Recovery Event (disabled)
              </button>
            </div>

            {displayedApprovedExecutionRecovery.status === "idle" ? (
              <p className="empty">
                No approved execution recovery preview yet. Run or preview an
                approved apply, rollback, event write, or conflict failure to
                inspect the recovery guidance.
              </p>
            ) : null}

            {displayedApprovedExecutionRecovery.status === "blocked" ? (
              <div className="errorBox">
                <strong>Approved execution recovery blocked</strong>
                <p>{displayedApprovedExecutionRecovery.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedApprovedExecutionRecovery.status}</dd>
              </div>
              <div>
                <dt>Recovery state</dt>
                <dd>{displayedApprovedExecutionRecovery.state}</dd>
              </div>
              <div>
                <dt>Failure code</dt>
                <dd>{displayedApprovedExecutionRecovery.failureCode}</dd>
              </div>
              <div>
                <dt>Affected paths</dt>
                <dd>{displayedApprovedExecutionRecovery.affectedPathCount}</dd>
              </div>
              <div>
                <dt>Checkpoint status</dt>
                <dd>
                  {displayedApprovedExecutionRecovery.checkpointStatus} /{" "}
                  {displayedApprovedExecutionRecovery.checkpointId ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Rollback availability</dt>
                <dd>
                  {displayedApprovedExecutionRecovery.rollbackAvailability}
                </dd>
              </div>
              <div>
                <dt>Event summary status</dt>
                <dd>{displayedApprovedExecutionRecovery.eventSummaryStatus}</dd>
              </div>
              <div>
                <dt>Unsafe buttons</dt>
                <dd>retry no / rollback no / event write no</dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedApprovedExecutionRecovery.blockerCount} /{" "}
                  {displayedApprovedExecutionRecovery.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedApprovedExecutionRecovery.recoveryHash.substring(
                    0,
                    12
                  )}
                </dd>
              </div>
            </dl>

            <div className="statusBox">
              <strong>Latest failure summary</strong>
              <p>{displayedApprovedExecutionRecovery.failureSummary}</p>
            </div>
            <div className="statusBox">
              <strong>Rollback guidance</strong>
              <p>{displayedApprovedExecutionRecovery.rollbackGuidance}</p>
            </div>
            <div className="statusBox">
              <strong>Manual recovery guidance</strong>
              <p>{displayedApprovedExecutionRecovery.manualRecoveryGuidance}</p>
            </div>

            {displayedApprovedExecutionRecovery.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedApprovedExecutionRecovery.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeApprovedExecutionRecoveryView(
                  displayedApprovedExecutionRecovery
                ).source
              }{" "}
              · {displayedApprovedExecutionRecovery.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Approved Execution Replay Timeline"
          >
            <div className="panelHeader">
              <h2>Approved Execution Replay Timeline</h2>
              <span className="muted">
                Audit timeline / summary-only replay
              </span>
            </div>
            <p className="fieldHelp">
              Reconstructs the v0.15 approved proposal, validation, audit,
              receipt, apply, checkpoint, verification, rollback, and final task
              status chain from safe summaries. The App Shell does not write
              events, apply patches, rollback, run Git or shell, expose raw
              output, or execute recovery actions from this timeline.
            </p>
            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewApprovedExecutionReplayTimeline();
                }}
              >
                Preview Approved Replay Timeline
              </button>
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Replay Write Event (disabled)
              </button>
              <button
                type="button"
                className="secondary"
                disabled
                aria-disabled="true"
              >
                Execute From Timeline (disabled)
              </button>
            </div>

            {displayedApprovedExecutionReplayTimeline.status === "empty" ? (
              <p className="empty">
                No approved execution replay timeline yet. Refresh Event Log /
                Replay or preview approved execution summaries first.
              </p>
            ) : null}

            {displayedApprovedExecutionReplayTimeline.status === "blocked" ? (
              <div className="errorBox">
                <strong>Approved replay timeline blocked</strong>
                <p>{displayedApprovedExecutionReplayTimeline.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedApprovedExecutionReplayTimeline.status}</dd>
              </div>
              <div>
                <dt>Stages</dt>
                <dd>
                  {displayedApprovedExecutionReplayTimeline.completedStageCount}
                  /{displayedApprovedExecutionReplayTimeline.stageCount}{" "}
                  complete
                </dd>
              </div>
              <div>
                <dt>Missing / warning / blocked</dt>
                <dd>
                  {displayedApprovedExecutionReplayTimeline.missingStageCount} /{" "}
                  {displayedApprovedExecutionReplayTimeline.warningStageCount} /{" "}
                  {displayedApprovedExecutionReplayTimeline.blockedStageCount}
                </dd>
              </div>
              <div>
                <dt>Persisted / duplicate events</dt>
                <dd>
                  {displayedApprovedExecutionReplayTimeline.persistedEventCount}{" "}
                  /{" "}
                  {displayedApprovedExecutionReplayTimeline.duplicateEventCount}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback / verification events</dt>
                <dd>
                  {
                    displayedApprovedExecutionReplayTimeline.approvedApplyEventCount
                  }{" "}
                  /{" "}
                  {
                    displayedApprovedExecutionReplayTimeline.approvedRollbackEventCount
                  }{" "}
                  /{" "}
                  {
                    displayedApprovedExecutionReplayTimeline.verificationEventCount
                  }
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedApprovedExecutionReplayTimeline.blockerCount} /{" "}
                  {displayedApprovedExecutionReplayTimeline.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedApprovedExecutionReplayTimeline.hashPrefix}</dd>
              </div>
              <div>
                <dt>Execution readiness</dt>
                <dd>apply no / rollback no / event write no</dd>
              </div>
            </dl>

            {displayedApprovedExecutionReplayTimeline.stages.length > 0 ? (
              <ol className="timeline">
                {displayedApprovedExecutionReplayTimeline.stages.map(
                  (stage) => (
                    <li key={stage.kind}>
                      <span className="timelineMeta">
                        {stage.label} · {stage.status} · {stage.hashPrefix}
                      </span>
                      <span>{stage.summary}</span>
                      {stage.warningCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Warnings: {stage.warningCodes.join(", ")}
                        </span>
                      ) : null}
                      {stage.blockerCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Blockers: {stage.blockerCodes.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedApprovedExecutionReplayTimeline.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedApprovedExecutionReplayTimeline.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {summarizeApprovedExecutionReplayTimelineView(
                displayedApprovedExecutionReplayTimeline
              )}{" "}
              · {displayedApprovedExecutionReplayTimeline.nextAction}
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

          <section className="eventPanel" aria-label="Fixed Multi-Agent Run">
            <div className="panelHeader">
              <h2>Fixed Multi-Agent Run</h2>
              <span className="muted">Fixed roles / no dynamic bidding</span>
            </div>
            <p className="fieldHelp">
              Runs a fixed orchestrator/coder/reviewer/verifier route using
              summary-only handoff dossiers. Agents cannot directly execute
              tools, apply patches, run Git/shell, call MCP mutating tools, or
              invoke plugin/skill runtimes.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewFixedRunPlan();
                }}
                disabled={displayedRunDraft.status === "empty"}
                aria-disabled={displayedRunDraft.status === "empty"}
              >
                Preview fixed run plan
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewFixedAgentHandoffs();
                }}
                disabled={displayedRunDraft.status === "empty"}
                aria-disabled={displayedRunDraft.status === "empty"}
              >
                Preview agent handoffs
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearFixedMultiAgentRun();
                }}
              >
                Clear multi-agent preview
              </button>
              <button type="button" className="secondary" disabled>
                Add Agent (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Bid Agents (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Auto-run Tools (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Auto-apply (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Invoke MCP Tool (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Shell lane (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Git Write (disabled)
              </button>
            </div>

            {displayedFixedMultiAgentRun.status === "empty" ? (
              <p className="empty">
                Preview a local run draft first. Fixed multi-agent run summaries
                will appear here before context assembly.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedFixedMultiAgentRun.status}</dd>
              </div>
              <div>
                <dt>Intent</dt>
                <dd>{displayedFixedMultiAgentRun.intent}</dd>
              </div>
              <div>
                <dt>Route</dt>
                <dd>
                  {displayedFixedMultiAgentRun.route.length > 0
                    ? displayedFixedMultiAgentRun.route.join(" / ")
                    : "n/a"}
                </dd>
              </div>
              <div>
                <dt>Roles</dt>
                <dd>{displayedFixedMultiAgentRun.roleCount}</dd>
              </div>
              <div>
                <dt>Stages</dt>
                <dd>
                  {displayedFixedMultiAgentRun.stageCount} ·{" "}
                  {displayedFixedMultiAgentRun.stageStatus}
                </dd>
              </div>
              <div>
                <dt>Handoffs</dt>
                <dd>{displayedFixedMultiAgentRun.handoffCount}</dd>
              </div>
              <div>
                <dt>Blockers</dt>
                <dd>{displayedFixedMultiAgentRun.blockedCount}</dd>
              </div>
              <div>
                <dt>Warnings</dt>
                <dd>{displayedFixedMultiAgentRun.warningCount}</dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedFixedMultiAgentRun.runHashPrefix}</dd>
              </div>
              <div>
                <dt>App execution</dt>
                <dd>
                  {displayedFixedMultiAgentRun.readiness.appCanExecute
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
            </dl>

            <p className="fieldHelp">
              {summarizeFixedMultiAgentRunView(displayedFixedMultiAgentRun)}
            </p>

            {displayedFixedMultiAgentRun.stages.length > 0 ? (
              <ol className="timeline">
                {displayedFixedMultiAgentRun.stages.map((stage) => (
                  <li key={stage.stageId}>
                    <span className="timelineMeta">
                      {stage.kind} · {stage.status}
                      {stage.role !== undefined ? ` · ${stage.role}` : ""}
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

            {displayedFixedMultiAgentRun.handoffs.length > 0 ? (
              <ol className="timeline">
                {displayedFixedMultiAgentRun.handoffs.map((handoff) => (
                  <li key={handoff.handoffId}>
                    <span className="timelineMeta">
                      {handoff.fromRole} to {handoff.toRole} ·{" "}
                      {handoff.dossierHashPrefix}
                    </span>
                    <span>
                      evidence {handoff.evidenceRefCount} · context{" "}
                      {handoff.contextRefCount} · memory{" "}
                      {handoff.memoryRefCount} · capabilities{" "}
                      {handoff.capabilityPlanRefCount}
                    </span>
                    {handoff.warningCodes.length > 0 ? (
                      <span className="timelineMeta">
                        Warnings: {handoff.warningCodes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedFixedMultiAgentRun.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedFixedMultiAgentRun.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {displayedFixedMultiAgentRun.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Fixed Agent Replay Projection"
          >
            <div className="panelHeader">
              <h2>Fixed Agent Replay Projection</h2>
              <span className="muted">
                Summary-only replay / no event write
              </span>
            </div>
            <p className="fieldHelp">
              Projects fixed agent run, stage, handoff, review, and verification
              summaries into an audit timeline. No event is written and no
              agent, tool, apply, rollback, Git, or shell action is executed.
            </p>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewFixedAgentReplayProjection();
                }}
                disabled={fixedMultiAgentRunPreview === undefined}
                aria-disabled={fixedMultiAgentRunPreview === undefined}
              >
                Preview Agent Replay Projection
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearFixedAgentReplayProjection();
                }}
              >
                Clear Agent Replay Projection
              </button>
              <button type="button" className="secondary" disabled>
                Write Agent Event (disabled)
              </button>
            </div>

            {displayedFixedAgentReplayProjection.status === "empty" ? (
              <p className="empty">
                Preview a fixed multi-agent run first. Agent replay summaries
                will appear here without writing events.
              </p>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedFixedAgentReplayProjection.status}</dd>
              </div>
              <div>
                <dt>Agent runs</dt>
                <dd>{displayedFixedAgentReplayProjection.agentRunCount}</dd>
              </div>
              <div>
                <dt>Route</dt>
                <dd>
                  {displayedFixedAgentReplayProjection.latestRoute.length > 0
                    ? displayedFixedAgentReplayProjection.latestRoute.join(
                        " / "
                      )
                    : "n/a"}
                </dd>
              </div>
              <div>
                <dt>Role stages</dt>
                <dd>
                  {displayedFixedAgentReplayProjection.roleStageTimeline.length}
                </dd>
              </div>
              <div>
                <dt>Virtual events</dt>
                <dd>
                  {displayedFixedAgentReplayProjection.virtualAgentEventCount}
                </dd>
              </div>
              <div>
                <dt>Persisted agent events</dt>
                <dd>
                  {displayedFixedAgentReplayProjection.persistedAgentEventCount}
                </dd>
              </div>
              <div>
                <dt>Blockers</dt>
                <dd>{displayedFixedAgentReplayProjection.blockerCount}</dd>
              </div>
              <div>
                <dt>Warnings</dt>
                <dd>{displayedFixedAgentReplayProjection.warningCount}</dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedFixedAgentReplayProjection.projectionHashPrefix}
                </dd>
              </div>
              <div>
                <dt>Event writes</dt>
                <dd>
                  {displayedFixedAgentReplayProjection.eventWritesEnabled
                    ? "enabled"
                    : "disabled"}
                </dd>
              </div>
            </dl>

            <p className="fieldHelp">
              {summarizeFixedAgentReplayProjectionView(
                displayedFixedAgentReplayProjection
              )}
            </p>

            {displayedFixedAgentReplayProjection.roleStageTimeline.length >
            0 ? (
              <ol className="timeline">
                {displayedFixedAgentReplayProjection.roleStageTimeline.map(
                  (stage) => (
                    <li key={stage.stageId}>
                      <span className="timelineMeta">
                        {stage.role} · {stage.status}
                      </span>
                      <span>{stage.summary}</span>
                      {stage.warningCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Warnings: {stage.warningCodes.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedFixedAgentReplayProjection.eventTimeline.length > 0 ? (
              <ol className="timeline">
                {displayedFixedAgentReplayProjection.eventTimeline.map(
                  (event) => (
                    <li key={event.eventId}>
                      <span className="timelineMeta">
                        {event.eventType} · {event.stage} · {event.hashPrefix}
                      </span>
                      <span>{event.summary}</span>
                      {event.warningCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Warnings: {event.warningCodes.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedFixedAgentReplayProjection.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedFixedAgentReplayProjection.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {displayedFixedAgentReplayProjection.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Agent Handoff State Review"
          >
            <div className="panelHeader">
              <h2>Agent Handoff State Review</h2>
              <span className="muted">Read-only / no agent rerun</span>
            </div>
            <p className="fieldHelp">
              Reviews fixed agent handoff summaries for missing outputs, role
              order mismatch, stale dossier hashes, skipped reviewer/verifier
              stages, and interrupted workflow recovery. The App Shell does not
              rerun agents, create dynamic bidding, invoke tools, apply patches,
              rollback, write EventStore events, or run Git/shell.
            </p>

            <label>
              <span>Agent handoff state refs JSON</span>
              <textarea
                className="compactTextarea"
                value={agentHandoffStateReviewText}
                onChange={(event) => {
                  setAgentHandoffStateReviewText(event.target.value);
                }}
                placeholder="Paste summary-only agent handoff state refs JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Accepts summary-only orchestrator, coder, reviewer, and verifier
                stage refs. Raw prompts, raw source, raw diffs, API keys,
                command payloads, and execution readiness claims are blocked.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewAgentHandoffStateReview();
                }}
              >
                Preview Handoff Review
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearAgentHandoffStateReview();
                }}
              >
                Clear Handoff Review
              </button>
            </div>

            {displayedAgentHandoffStateReview.status === "empty" ? (
              <p className="empty">
                No agent handoff state refs loaded. Paste summary-only refs to
                review long-running handoff state.
              </p>
            ) : null}

            {displayedAgentHandoffStateReview.status === "blocked" ? (
              <div className="errorBox">
                <strong>Agent handoff review blocked</strong>
                <p>{displayedAgentHandoffStateReview.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedAgentHandoffStateReview.status}</dd>
              </div>
              <div>
                <dt>Review</dt>
                <dd>{displayedAgentHandoffStateReview.reviewId}</dd>
              </div>
              <div>
                <dt>Stages</dt>
                <dd>
                  {displayedAgentHandoffStateReview.completedStageCount} /{" "}
                  {displayedAgentHandoffStateReview.stageCount}
                </dd>
              </div>
              <div>
                <dt>Missing / stale</dt>
                <dd>
                  {displayedAgentHandoffStateReview.missingRoleOutputCount} /{" "}
                  {displayedAgentHandoffStateReview.staleStageCount}
                </dd>
              </div>
              <div>
                <dt>Skipped roles</dt>
                <dd>{displayedAgentHandoffStateReview.skippedRoleCount}</dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedAgentHandoffStateReview.blockerCount} /{" "}
                  {displayedAgentHandoffStateReview.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedAgentHandoffStateReview.hashPrefix ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Review / rerun</dt>
                <dd>
                  {displayedAgentHandoffStateReview.readiness
                    .canReviewHandoffState
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedAgentHandoffStateReview.readiness.canRerunAgent
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Dynamic / tools</dt>
                <dd>
                  {displayedAgentHandoffStateReview.readiness.canBidAgents
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedAgentHandoffStateReview.readiness.canInvokeTools
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>EventStore / App execution</dt>
                <dd>
                  {displayedAgentHandoffStateReview.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedAgentHandoffStateReview.readiness.appCanExecute
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedAgentHandoffStateReview.roleOrder.length > 0 ? (
              <p className="fieldHelp">
                role order{" "}
                {displayedAgentHandoffStateReview.roleOrder.join(" / ")}
              </p>
            ) : null}

            {displayedAgentHandoffStateReview.stageSummaries.length > 0 ? (
              <ol className="timeline">
                {displayedAgentHandoffStateReview.stageSummaries.map(
                  (stage) => (
                    <li key={stage.stageId}>
                      <span className="timelineMeta">
                        {stage.role} · {stage.status} · {stage.summaryHash}
                      </span>
                      <span>
                        output {stage.hasOutput ? "yes" : "no"} · evidence{" "}
                        {stage.evidenceRefCount} · context{" "}
                        {stage.contextRefCount}
                      </span>
                      {stage.warningCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Warnings: {stage.warningCodes.join(", ")}
                        </span>
                      ) : null}
                      {stage.blockerCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Blockers: {stage.blockerCodes.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            {displayedAgentHandoffStateReview.findingCodes.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedAgentHandoffStateReview.findingCodes.join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeAgentHandoffStateReviewView(
                  displayedAgentHandoffStateReview
                ).source
              }{" "}
              · {displayedAgentHandoffStateReview.nextAction}
            </p>
          </section>

          <section className="eventPanel" aria-label="Capability Host">
            <div className="panelHeader">
              <h2>Capability Host</h2>
              <span className="muted">Read-only / no external execution</span>
            </div>
            <p className="fieldHelp">
              Preview MCP, plugin, and skill capability descriptors. The App
              Shell does not connect to MCP servers, install plugins, execute
              skills, invoke capabilities, issue leases, or run external tools.
            </p>

            <div className="formGrid">
              <label>
                <span>Source type</span>
                <select
                  value={capabilityHostSourceType}
                  onChange={(event) => {
                    setCapabilityHostSourceType(
                      event.target.value as NonNullable<
                        CapabilityHostSurfaceInput["sourceType"]
                      >
                    );
                  }}
                >
                  <option value="mcp_server">mcp_server</option>
                  <option value="plugin_package">plugin_package</option>
                  <option value="skill_bundle">skill_bundle</option>
                  <option value="local_builtin_descriptor">
                    local_builtin_descriptor
                  </option>
                </select>
              </label>
            </div>

            <label>
              <span>External capability manifest JSON</span>
              <textarea
                className="compactTextarea"
                value={capabilityHostManifestText}
                onChange={(event) => {
                  setCapabilityHostManifestText(event.target.value);
                }}
                placeholder="Paste external capability manifest JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Manifest preview accepts descriptor metadata only. Raw args,
                secrets, command fields, plugin install scripts, and execution
                fields are rejected before broker preview.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewCapabilityHostSurface();
                }}
              >
                Preview Capability Host
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearCapabilityHostSurface();
                }}
              >
                Clear Capability Host
              </button>
              <button type="button" className="secondary" disabled>
                Connect MCP Server (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Install Plugin (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Run Skill (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Invoke Capability (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Issue Lease (disabled)
              </button>
            </div>

            {displayedCapabilityHostSurface.status === "empty" ? (
              <p className="empty">
                No external capability manifest loaded. Paste descriptor
                metadata to preview risk and invocation policy summaries.
              </p>
            ) : null}

            {displayedCapabilityHostSurface.status === "blocked" ? (
              <div className="errorBox">
                <strong>Capability host metadata blocked</strong>
                <p>{displayedCapabilityHostSurface.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedCapabilityHostSurface.status}</dd>
              </div>
              <div>
                <dt>Source type</dt>
                <dd>{displayedCapabilityHostSurface.sourceType}</dd>
              </div>
              <div>
                <dt>Manifest / broker</dt>
                <dd>
                  {displayedCapabilityHostSurface.manifestStatus} /{" "}
                  {displayedCapabilityHostSurface.brokerStatus}
                </dd>
              </div>
              <div>
                <dt>Manifest</dt>
                <dd>
                  {displayedCapabilityHostSurface.manifestId ?? "n/a"} /{" "}
                  {displayedCapabilityHostSurface.sourceName ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Descriptors</dt>
                <dd>
                  {displayedCapabilityHostSurface.descriptorCount} /{" "}
                  {displayedCapabilityHostSurface.brokerDescriptorCount}
                </dd>
              </div>
              <div>
                <dt>Lease previews</dt>
                <dd>{displayedCapabilityHostSurface.leasePreviewCount}</dd>
              </div>
              <div>
                <dt>Risk summary</dt>
                <dd>
                  {Object.entries(displayedCapabilityHostSurface.riskSummary)
                    .map(([risk, count]) => `${risk}:${count}`)
                    .join(", ") || "none"}
                </dd>
              </div>
              <div>
                <dt>Invocation policies</dt>
                <dd>
                  {Object.entries(
                    displayedCapabilityHostSurface.invocationPolicies
                  )
                    .map(([policy, count]) => `${policy}:${count}`)
                    .join(", ") || "none"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedCapabilityHostSurface.blockerCount} /{" "}
                  {displayedCapabilityHostSurface.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedCapabilityHostSurface.hashPrefix ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Preview / invoke</dt>
                <dd>
                  {displayedCapabilityHostSurface.readiness
                    .canPreviewDescriptors
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityHostSurface.readiness.canInvokeCapability
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Connect / install</dt>
                <dd>
                  {displayedCapabilityHostSurface.readiness.canConnectMcpServer
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityHostSurface.readiness.canInstallPlugin
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Lease / App execute</dt>
                <dd>
                  {displayedCapabilityHostSurface.readiness.canIssueLease
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityHostSurface.readiness.appCanExecute
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Fetch / Tauri</dt>
                <dd>
                  {displayedCapabilityHostSurface.readiness.canFetchNetwork
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityHostSurface.readiness.canUseTauri
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedCapabilityHostSurface.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedCapabilityHostSurface.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeCapabilityHostSurfaceView(
                  displayedCapabilityHostSurface
                ).source
              }{" "}
              · {displayedCapabilityHostSurface.nextAction}
            </p>
          </section>

          <section className="eventPanel" aria-label="Plugin / Skill Host">
            <div className="panelHeader">
              <h2>Plugin / Skill Host</h2>
              <span className="muted">
                Read-only / no plugin execution · Metadata only / no skill
                runtime
              </span>
            </div>
            <p className="fieldHelp">
              Preview plugin manifests, skill manifests, package metadata
              summaries, sandbox contracts, and broker descriptor summaries. The
              App Shell does not install plugins, run skills, execute plugin
              capabilities, fetch network, invoke Tauri, write events, or issue
              leases.
            </p>

            <label>
              <span>Plugin manifest JSON</span>
              <textarea
                className="compactTextarea"
                value={pluginSkillPluginManifestText}
                onChange={(event) => {
                  setPluginSkillPluginManifestText(event.target.value);
                }}
                placeholder="Paste plugin_manifest.v1 JSON"
                spellCheck={false}
              />
            </label>

            <label>
              <span>Skill manifest JSON</span>
              <textarea
                className="compactTextarea"
                value={pluginSkillSkillManifestText}
                onChange={(event) => {
                  setPluginSkillSkillManifestText(event.target.value);
                }}
                placeholder="Paste skill_manifest.v1 JSON"
                spellCheck={false}
              />
            </label>

            <label>
              <span>Package metadata summary JSON</span>
              <textarea
                className="compactTextarea"
                value={pluginSkillPackageMetadataText}
                onChange={(event) => {
                  setPluginSkillPackageMetadataText(event.target.value);
                }}
                placeholder="Paste summary-only package metadata JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Metadata preview rejects raw package content, raw args, raw
                outputs, install scripts, command fields, API keys, and secret
                markers before descriptor preview.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewPluginSkillHost();
                }}
              >
                Preview Plugin Manifest
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewPluginSkillHost();
                }}
              >
                Preview Skill Manifest
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewPluginSkillHost();
                }}
              >
                Preview Package Metadata
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearPluginSkillHost();
                }}
              >
                Clear
              </button>
              <button type="button" className="secondary" disabled>
                Install Plugin (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Run Skill (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Execute Plugin Capability (disabled)
              </button>
            </div>

            {displayedPluginSkillHost.status === "empty" ? (
              <p className="empty">
                No plugin, skill, or package metadata loaded. Paste summary-only
                JSON to preview host descriptor boundaries.
              </p>
            ) : null}

            {displayedPluginSkillHost.status === "blocked" ? (
              <div className="errorBox">
                <strong>Plugin / Skill Host metadata blocked</strong>
                <p>{displayedPluginSkillHost.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedPluginSkillHost.status}</dd>
              </div>
              <div>
                <dt>Plugin / skill manifests</dt>
                <dd>
                  {displayedPluginSkillHost.pluginManifestStatus} /{" "}
                  {displayedPluginSkillHost.skillManifestStatus}
                </dd>
              </div>
              <div>
                <dt>Package / sandbox</dt>
                <dd>
                  {displayedPluginSkillHost.packageScanStatus} /{" "}
                  {displayedPluginSkillHost.sandboxStatus}
                </dd>
              </div>
              <div>
                <dt>Sandbox mode</dt>
                <dd>{displayedPluginSkillHost.sandboxMode}</dd>
              </div>
              <div>
                <dt>Broker status</dt>
                <dd>{displayedPluginSkillHost.brokerStatus}</dd>
              </div>
              <div>
                <dt>Plugin capabilities</dt>
                <dd>{displayedPluginSkillHost.pluginCapabilityCount}</dd>
              </div>
              <div>
                <dt>Skill steps</dt>
                <dd>{displayedPluginSkillHost.skillStepCount}</dd>
              </div>
              <div>
                <dt>Package files</dt>
                <dd>{displayedPluginSkillHost.packageFileCount}</dd>
              </div>
              <div>
                <dt>Scanner findings</dt>
                <dd>{displayedPluginSkillHost.scannerFindingCount}</dd>
              </div>
              <div>
                <dt>Broker descriptors</dt>
                <dd>
                  {displayedPluginSkillHost.brokerDescriptorCount} total,{" "}
                  {displayedPluginSkillHost.pluginDescriptorCount} plugin,{" "}
                  {displayedPluginSkillHost.skillDescriptorCount} skill
                </dd>
              </div>
              <div>
                <dt>Risk summary</dt>
                <dd>
                  {Object.entries(displayedPluginSkillHost.riskSummary)
                    .map(([risk, count]) => `${risk}:${count}`)
                    .join(", ") || "none"}
                </dd>
              </div>
              <div>
                <dt>Policy summary</dt>
                <dd>
                  {Object.entries(displayedPluginSkillHost.policySummary)
                    .map(([policy, count]) => `${policy}:${count}`)
                    .join(", ") || "none"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedPluginSkillHost.blockerCount} /{" "}
                  {displayedPluginSkillHost.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedPluginSkillHost.hashPrefix ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Preview / broker preview</dt>
                <dd>
                  {displayedPluginSkillHost.readiness.canPreviewMetadata
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillHost.readiness
                    .canPreviewBrokerDescriptors
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Install / run</dt>
                <dd>
                  {displayedPluginSkillHost.readiness.canInstallPlugin
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillHost.readiness.canRunSkill
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Execute / lease</dt>
                <dd>
                  {displayedPluginSkillHost.readiness.canExecutePluginCapability
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillHost.readiness.canIssuePermissionLease
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Fetch / Tauri</dt>
                <dd>
                  {displayedPluginSkillHost.readiness.canFetchNetwork
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillHost.readiness.canUseTauri
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedPluginSkillHost.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedPluginSkillHost.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {summarizePluginSkillHostView(displayedPluginSkillHost).source} ·{" "}
              {displayedPluginSkillHost.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Plugin / Skill Redaction Audit"
          >
            <div className="panelHeader">
              <h2>Plugin / Skill Redaction Audit</h2>
              <span className="muted">Summary only / no raw metadata</span>
            </div>
            <p className="fieldHelp">
              Audits plugin, skill, package, sandbox, descriptor, and App host
              summaries for raw metadata, raw package content, raw prompt, raw
              args, raw output, secrets, install scripts, command fields, native
              bridge, desktop action, and execution readiness. No execution is
              performed.
            </p>

            <label>
              <span>Optional plugin / skill host summary JSON</span>
              <textarea
                className="compactTextarea"
                value={pluginSkillAuditText}
                onChange={(event) => {
                  setPluginSkillAuditText(event.target.value);
                }}
                placeholder="Paste plugin / skill host summary JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Empty input audits the current Plugin / Skill Host preview
                summary. Pasted JSON is treated as summary metadata only.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewPluginSkillRedactionAudit();
                }}
              >
                Preview Plugin / Skill Audit
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearPluginSkillRedactionAudit();
                }}
              >
                Clear Plugin / Skill Audit
              </button>
              <button type="button" className="secondary" disabled>
                Run Plugin / Skill Audit (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Write Plugin / Skill Audit Event (disabled)
              </button>
            </div>

            {displayedPluginSkillRedactionAudit.status === "empty" ? (
              <p className="empty">
                No plugin / skill audit loaded. Preview host metadata or paste
                summary JSON to inspect redaction boundaries.
              </p>
            ) : null}

            {displayedPluginSkillRedactionAudit.status === "blocked" ? (
              <div className="errorBox">
                <strong>Plugin / Skill audit blocked</strong>
                <p>{displayedPluginSkillRedactionAudit.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedPluginSkillRedactionAudit.status}</dd>
              </div>
              <div>
                <dt>Audit</dt>
                <dd>{displayedPluginSkillRedactionAudit.auditId}</dd>
              </div>
              <div>
                <dt>Sources</dt>
                <dd>
                  {
                    displayedPluginSkillRedactionAudit.sourceCounts
                      .pluginManifestResultCount
                  }
                  p /{" "}
                  {
                    displayedPluginSkillRedactionAudit.sourceCounts
                      .skillManifestResultCount
                  }
                  s /{" "}
                  {
                    displayedPluginSkillRedactionAudit.sourceCounts
                      .packageScanResultCount
                  }
                  pkg /{" "}
                  {
                    displayedPluginSkillRedactionAudit.sourceCounts
                      .descriptorResultCount
                  }
                  desc /{" "}
                  {
                    displayedPluginSkillRedactionAudit.sourceCounts
                      .appHostSummaryCount
                  }
                  app
                </dd>
              </div>
              <div>
                <dt>Metadata refs</dt>
                <dd>
                  {
                    displayedPluginSkillRedactionAudit.metadataCounts
                      .totalMetadataRefCount
                  }
                </dd>
              </div>
              <div>
                <dt>Plugin / skill counts</dt>
                <dd>
                  {
                    displayedPluginSkillRedactionAudit.metadataCounts
                      .pluginCapabilityCount
                  }{" "}
                  /{" "}
                  {
                    displayedPluginSkillRedactionAudit.metadataCounts
                      .skillStepCount
                  }
                </dd>
              </div>
              <div>
                <dt>Package files / deps</dt>
                <dd>
                  {
                    displayedPluginSkillRedactionAudit.metadataCounts
                      .packageFileCount
                  }{" "}
                  /{" "}
                  {
                    displayedPluginSkillRedactionAudit.metadataCounts
                      .packageDependencyCount
                  }
                </dd>
              </div>
              <div>
                <dt>Redacted / raw fields</dt>
                <dd>
                  {displayedPluginSkillRedactionAudit.redactedFieldCount} /{" "}
                  {displayedPluginSkillRedactionAudit.rawFieldDetectedCount}
                </dd>
              </div>
              <div>
                <dt>Secret / raw metadata</dt>
                <dd>
                  {displayedPluginSkillRedactionAudit.leakBooleans
                    .secretDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillRedactionAudit.leakBooleans
                    .rawMetadataDetected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Prompt / args / output</dt>
                <dd>
                  {displayedPluginSkillRedactionAudit.leakBooleans
                    .rawPromptDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillRedactionAudit.leakBooleans
                    .rawArgsDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillRedactionAudit.leakBooleans
                    .rawOutputDetected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Install / execution</dt>
                <dd>
                  {displayedPluginSkillRedactionAudit.leakBooleans
                    .installScriptDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillRedactionAudit.leakBooleans
                    .executionFieldDetected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Risk summary</dt>
                <dd>
                  {Object.entries(
                    displayedPluginSkillRedactionAudit.riskSummary
                  )
                    .map(([risk, count]) => `${risk}:${count}`)
                    .join(", ") || "none"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedPluginSkillRedactionAudit.blockerCount} /{" "}
                  {displayedPluginSkillRedactionAudit.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedPluginSkillRedactionAudit.auditHash.substring(
                    0,
                    12
                  )}
                </dd>
              </div>
              <div>
                <dt>Preview / run</dt>
                <dd>
                  {displayedPluginSkillRedactionAudit.readiness.canPreviewAudit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillRedactionAudit.readiness
                    .canRunPluginSkillAudit
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Install / runtime</dt>
                <dd>
                  {displayedPluginSkillRedactionAudit.readiness.canInstallPlugin
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillRedactionAudit.readiness.canRunSkill
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Event / fetch / Tauri</dt>
                <dd>
                  {displayedPluginSkillRedactionAudit.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillRedactionAudit.readiness.canFetchNetwork
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedPluginSkillRedactionAudit.readiness.canUseTauri
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedPluginSkillRedactionAudit.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedPluginSkillRedactionAudit.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizePluginSkillRedactionAuditView(
                  displayedPluginSkillRedactionAudit
                ).appSource
              }{" "}
              · {displayedPluginSkillRedactionAudit.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="Capability Host Redaction / Boundary Audit"
          >
            <div className="panelHeader">
              <h2>Capability Host Redaction / Boundary Audit</h2>
              <span className="muted">Read-only / no execution</span>
            </div>
            <p className="fieldHelp">
              Audits external capability metadata summaries for raw secrets,
              command fields, install scripts, raw args, raw prompt/source/diff
              /response fields, execution readiness, and issued leases. The App
              Shell does not connect, install, invoke, fetch network, write
              events, issue leases, or run external tools.
            </p>

            <label>
              <span>Optional summary JSON</span>
              <textarea
                className="compactTextarea"
                value={capabilityHostAuditText}
                onChange={(event) => {
                  setCapabilityHostAuditText(event.target.value);
                }}
                placeholder="Paste capability host summary JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Empty input audits the current Capability Host preview summary.
                Pasted JSON is treated as summary metadata only.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewCapabilityHostAudit();
                }}
              >
                Preview Capability Host Audit
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearCapabilityHostAudit();
                }}
              >
                Clear Capability Host Audit
              </button>
              <button type="button" className="secondary" disabled>
                Run External Capability Audit (disabled)
              </button>
            </div>

            {displayedCapabilityHostAudit.status === "empty" ? (
              <p className="empty">
                No capability host audit loaded. Preview a Capability Host
                manifest or paste summary JSON to inspect redaction boundaries.
              </p>
            ) : null}

            {displayedCapabilityHostAudit.status === "blocked" ? (
              <div className="errorBox">
                <strong>Capability host audit blocked</strong>
                <p>{displayedCapabilityHostAudit.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedCapabilityHostAudit.status}</dd>
              </div>
              <div>
                <dt>Audit</dt>
                <dd>{displayedCapabilityHostAudit.auditId}</dd>
              </div>
              <div>
                <dt>Sources</dt>
                <dd>
                  {
                    displayedCapabilityHostAudit.sourceCounts
                      .manifestResultCount
                  }{" "}
                  /{" "}
                  {
                    displayedCapabilityHostAudit.sourceCounts
                      .mcpDiscoveryResultCount
                  }{" "}
                  /{" "}
                  {
                    displayedCapabilityHostAudit.sourceCounts
                      .pluginSkillScanResultCount
                  }{" "}
                  /{" "}
                  {
                    displayedCapabilityHostAudit.sourceCounts
                      .brokerIntegrationResultCount
                  }{" "}
                  /{" "}
                  {
                    displayedCapabilityHostAudit.sourceCounts
                      .appSurfaceSummaryCount
                  }
                </dd>
              </div>
              <div>
                <dt>Descriptors</dt>
                <dd>
                  {
                    displayedCapabilityHostAudit.descriptorCounts
                      .totalDescriptorCount
                  }
                </dd>
              </div>
              <div>
                <dt>Redacted / raw fields</dt>
                <dd>
                  {displayedCapabilityHostAudit.redactedFieldCount} /{" "}
                  {displayedCapabilityHostAudit.rawFieldDetectedCount}
                </dd>
              </div>
              <div>
                <dt>Raw prompt / response</dt>
                <dd>
                  {displayedCapabilityHostAudit.rawLeakBooleans
                    .rawPromptDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityHostAudit.rawLeakBooleans
                    .rawResponseDetected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Secret / lease issued</dt>
                <dd>
                  {displayedCapabilityHostAudit.rawLeakBooleans.secretDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityHostAudit.rawLeakBooleans
                    .leaseIssuedDetected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Risk summary</dt>
                <dd>
                  {Object.entries(displayedCapabilityHostAudit.riskSummary)
                    .map(([risk, count]) => `${risk}:${count}`)
                    .join(", ") || "none"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedCapabilityHostAudit.blockerCount} /{" "}
                  {displayedCapabilityHostAudit.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedCapabilityHostAudit.auditHash.substring(0, 12)}
                </dd>
              </div>
              <div>
                <dt>Preview / run audit</dt>
                <dd>
                  {displayedCapabilityHostAudit.readiness.canPreviewAudit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityHostAudit.readiness
                    .canRunExternalCapabilityAudit
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Invoke / lease</dt>
                <dd>
                  {displayedCapabilityHostAudit.readiness.canInvokeCapability
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityHostAudit.readiness.canIssueLease
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Fetch / event write</dt>
                <dd>
                  {displayedCapabilityHostAudit.readiness.canFetchNetwork
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedCapabilityHostAudit.readiness.canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedCapabilityHostAudit.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedCapabilityHostAudit.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeCapabilityHostAuditView(displayedCapabilityHostAudit)
                  .appSource
              }{" "}
              · {displayedCapabilityHostAudit.nextAction}
            </p>
          </section>

          <section
            className="eventPanel"
            aria-label="External Capability Audit"
          >
            <div className="panelHeader">
              <h2>External Capability Audit</h2>
              <span className="muted">Read-only / no external execution</span>
            </div>
            <p className="fieldHelp">
              Aggregates external capability hardening summaries for policy,
              MCP read-only consistency, plugin/skill sandbox signals, replay
              completeness, and redaction audit. The App Shell does not invoke
              external capabilities, run plugins or skills, execute mutating MCP
              tools, fetch network, write events, use Tauri, or show raw output.
            </p>

            <label>
              <span>Optional hardening summary JSON</span>
              <textarea
                className="compactTextarea"
                value={externalCapabilityAuditSummaryText}
                onChange={(event) => {
                  setExternalCapabilityAuditSummaryText(event.target.value);
                }}
                placeholder="Paste external capability hardening summary JSON"
                spellCheck={false}
              />
              <p className="fieldHelp">
                Empty input aggregates the current Capability Host audit
                summary. Pasted JSON is treated as summary metadata only.
              </p>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewExternalCapabilityAuditSurface();
                }}
              >
                Preview External Capability Audit
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearExternalCapabilityAuditSurface();
                }}
              >
                Clear External Capability Audit
              </button>
              <button type="button" className="secondary" disabled>
                Invoke External Capability (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Run Plugin (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Run Skill (disabled)
              </button>
              <button type="button" className="secondary" disabled>
                Execute Mutating MCP Tool (disabled)
              </button>
            </div>

            {displayedExternalCapabilityAuditSurface.status === "empty" ? (
              <p className="empty">
                No external capability audit summary loaded. Preview the
                current Capability Host audit or paste summary JSON.
              </p>
            ) : null}

            {displayedExternalCapabilityAuditSurface.status === "blocked" ? (
              <div className="errorBox">
                <strong>External capability audit blocked</strong>
                <p>{displayedExternalCapabilityAuditSurface.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedExternalCapabilityAuditSurface.status}</dd>
              </div>
              <div>
                <dt>Descriptors</dt>
                <dd>
                  {displayedExternalCapabilityAuditSurface.descriptorCount}
                </dd>
              </div>
              <div>
                <dt>Policy hardening</dt>
                <dd>
                  {
                    displayedExternalCapabilityAuditSurface.policyHardeningStatus
                  }
                </dd>
              </div>
              <div>
                <dt>MCP readonly</dt>
                <dd>
                  {
                    displayedExternalCapabilityAuditSurface
                      .mcpReadonlyConsistencyStatus
                  }
                </dd>
              </div>
              <div>
                <dt>Plugin / skill sandbox</dt>
                <dd>
                  {
                    displayedExternalCapabilityAuditSurface
                      .pluginSkillSandboxStatus
                  }
                </dd>
              </div>
              <div>
                <dt>Replay completeness</dt>
                <dd>
                  {
                    displayedExternalCapabilityAuditSurface
                      .replayCompletenessStatus
                  }
                </dd>
              </div>
              <div>
                <dt>Redaction audit</dt>
                <dd>
                  {displayedExternalCapabilityAuditSurface.redactionAuditStatus}
                </dd>
              </div>
              <div>
                <dt>Redacted / raw fields</dt>
                <dd>
                  {displayedExternalCapabilityAuditSurface.redactedFieldCount}{" "}
                  /{" "}
                  {displayedExternalCapabilityAuditSurface.rawFieldDetectedCount}
                </dd>
              </div>
              <div>
                <dt>Raw output / secret</dt>
                <dd>
                  {displayedExternalCapabilityAuditSurface.rawLeakBooleans
                    .rawToolOutputDetected
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedExternalCapabilityAuditSurface.rawLeakBooleans
                    .secretDetected
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedExternalCapabilityAuditSurface.blockerCount} /{" "}
                  {displayedExternalCapabilityAuditSurface.warningCount}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>
                  {displayedExternalCapabilityAuditSurface.auditHash.substring(
                    0,
                    12
                  )}
                </dd>
              </div>
              <div>
                <dt>Preview / invoke</dt>
                <dd>
                  {displayedExternalCapabilityAuditSurface.readiness
                    .canPreviewExternalCapabilityAudit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedExternalCapabilityAuditSurface.readiness
                    .canInvokeExternalCapability
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Plugin / skill run</dt>
                <dd>
                  {displayedExternalCapabilityAuditSurface.readiness.canRunPlugin
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedExternalCapabilityAuditSurface.readiness.canRunSkill
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Fetch / event write</dt>
                <dd>
                  {displayedExternalCapabilityAuditSurface.readiness
                    .canFetchNetwork
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedExternalCapabilityAuditSurface.readiness
                    .canWriteEventStore
                    ? "yes"
                    : "no"}
                </dd>
              </div>
            </dl>

            {displayedExternalCapabilityAuditSurface.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedExternalCapabilityAuditSurface.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeExternalCapabilityAuditSurfaceView(
                  displayedExternalCapabilityAuditSurface
                ).source
              }{" "}
              · {displayedExternalCapabilityAuditSurface.nextAction}
            </p>
          </section>

          <section className="eventPanel" aria-label="Project Knowledge">
            <div className="panelHeader">
              <h2>Project Knowledge</h2>
              <span className="muted">Human reviewed / summary-only</span>
            </div>
            <p className="fieldHelp">
              Review, commit, revoke, expire, and refresh workspace-local
              project knowledge through fixed Tauri commands. The App Shell does
              not auto-commit model or tool output, write raw EventStore
              content, use browser storage, write model-direct policy entries,
              store raw prompt/source/diff/API key memory, or trigger
              memory-driven apply, native bridge, or desktop action.
            </p>

            <div className="formGrid">
              <label>
                <span>Knowledge type</span>
                <select
                  value={projectKnowledgeEntryType}
                  onChange={(event) => {
                    setProjectKnowledgeEntryType(
                      event.target.value as ProjectKnowledgeEntryType
                    );
                    setProjectKnowledgeTypedConfirmation("");
                  }}
                >
                  <option value="project_fact">project_fact</option>
                  <option value="pitfall">pitfall</option>
                  <option value="policy">policy</option>
                </select>
              </label>
              <label>
                <span>Namespace</span>
                <input
                  value={projectKnowledgeNamespace}
                  onChange={(event) =>
                    setProjectKnowledgeNamespace(event.target.value)
                  }
                  placeholder="project"
                />
              </label>
              <label>
                <span>Trust</span>
                <select
                  value={projectKnowledgeTrustLevel}
                  onChange={(event) =>
                    setProjectKnowledgeTrustLevel(
                      event.target.value as
                        | "low"
                        | "medium"
                        | "high"
                        | "trusted"
                    )
                  }
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="trusted">trusted</option>
                </select>
              </label>
              <label>
                <span>Trust score</span>
                <input
                  value={projectKnowledgeTrustScore}
                  onChange={(event) =>
                    setProjectKnowledgeTrustScore(event.target.value)
                  }
                  inputMode="decimal"
                  placeholder="0.9"
                />
              </label>
              <label>
                <span>Source kind</span>
                <select
                  value={projectKnowledgeSourceKind}
                  onChange={(event) =>
                    setProjectKnowledgeSourceKind(
                      event.target
                        .value as ProjectKnowledgeCandidateForm["sourceKind"]
                    )
                  }
                >
                  <option value="human_reviewed">human_reviewed</option>
                  <option value="repo_doc_summary">repo_doc_summary</option>
                  <option value="manual_import_summary">
                    manual_import_summary
                  </option>
                  <option value="model_suggested">model_suggested</option>
                  <option value="tool_output_summary">
                    tool_output_summary
                  </option>
                  <option value="external_summary">external_summary</option>
                </select>
              </label>
              <label>
                <span>Reviewed by</span>
                <input
                  value={projectKnowledgeReviewedBy}
                  onChange={(event) =>
                    setProjectKnowledgeReviewedBy(event.target.value)
                  }
                  placeholder="manual_user_preview"
                />
              </label>
            </div>

            <label className="checkboxRow">
              <input
                type="checkbox"
                checked={projectKnowledgeHumanReviewed}
                onChange={(event) =>
                  setProjectKnowledgeHumanReviewed(event.target.checked)
                }
              />
              <span>Human confirmation checked</span>
            </label>

            <label>
              <span>Summary</span>
              <textarea
                className="compactTextarea"
                value={projectKnowledgeSummary}
                onChange={(event) =>
                  setProjectKnowledgeSummary(event.target.value)
                }
                placeholder="Write a summary-only project knowledge candidate"
                spellCheck={false}
              />
            </label>

            <label>
              <span>Evidence refs</span>
              <textarea
                className="compactTextarea"
                value={projectKnowledgeEvidenceRefsText}
                onChange={(event) =>
                  setProjectKnowledgeEvidenceRefsText(event.target.value)
                }
                placeholder="ref-id | manual_note | summary-only evidence | hashprefix"
                spellCheck={false}
              />
              <p className="fieldHelp">
                One summary-only ref per line. Do not paste raw prompt, raw
                source, raw diff, DOM, CSV, or API key material.
              </p>
            </label>

            <div className="formGrid">
              <label>
                <span>Tags</span>
                <input
                  value={projectKnowledgeTagsText}
                  onChange={(event) =>
                    setProjectKnowledgeTagsText(event.target.value)
                  }
                  placeholder="memory, project"
                />
              </label>
              <label>
                <span>Policy scope</span>
                <input
                  value={projectKnowledgePolicyScope}
                  onChange={(event) =>
                    setProjectKnowledgePolicyScope(event.target.value)
                  }
                  placeholder="project"
                  disabled={projectKnowledgeEntryType !== "policy"}
                />
              </label>
              <label>
                <span>Fact kind</span>
                <input
                  value={projectKnowledgeFactKind}
                  onChange={(event) =>
                    setProjectKnowledgeFactKind(event.target.value)
                  }
                  placeholder="project_fact"
                  disabled={projectKnowledgeEntryType !== "project_fact"}
                />
              </label>
              <label>
                <span>Pitfall severity</span>
                <select
                  value={projectKnowledgePitfallSeverity}
                  onChange={(event) =>
                    setProjectKnowledgePitfallSeverity(
                      event.target.value as "low" | "medium" | "high"
                    )
                  }
                  disabled={projectKnowledgeEntryType !== "pitfall"}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
            </div>

            <div className="formGrid">
              <label>
                <span>Pitfall trigger</span>
                <input
                  value={projectKnowledgePitfallTrigger}
                  onChange={(event) =>
                    setProjectKnowledgePitfallTrigger(event.target.value)
                  }
                  placeholder="Trigger summary"
                  disabled={projectKnowledgeEntryType !== "pitfall"}
                />
              </label>
              <label>
                <span>Pitfall mitigation</span>
                <input
                  value={projectKnowledgePitfallMitigation}
                  onChange={(event) =>
                    setProjectKnowledgePitfallMitigation(event.target.value)
                  }
                  placeholder="Mitigation summary"
                  disabled={projectKnowledgeEntryType !== "pitfall"}
                />
              </label>
              <label>
                <span>Commit confirmation</span>
                <input
                  value={projectKnowledgeTypedConfirmation}
                  onChange={(event) =>
                    setProjectKnowledgeTypedConfirmation(event.target.value)
                  }
                  placeholder={
                    projectKnowledgeReviewCandidate.requiredConfirmation
                  }
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
                  handleRefreshProjectKnowledge().catch((caught) => {
                    setProjectKnowledgeActionError(safeErrorMessage(caught));
                    setProjectKnowledgeActionStatus("error");
                  });
                }}
                disabled={
                  !displayedProjectKnowledgeReview.readiness
                    .canRefreshProjectKnowledge ||
                  projectKnowledgeActionStatus === "loading"
                }
              >
                Refresh Project Knowledge
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewProjectKnowledgeCandidate();
                }}
                disabled={
                  !projectKnowledgeReviewCandidate.readiness.canPreviewCandidate
                }
              >
                Preview Knowledge Candidate
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  runProjectKnowledgeCandidateCommit().catch((caught) => {
                    setProjectKnowledgeActionError(safeErrorMessage(caught));
                    setProjectKnowledgeActionStatus("error");
                  });
                }}
                disabled={
                  !projectKnowledgeReviewCandidate.readiness
                    .canCommitCandidate ||
                  projectKnowledgeActionStatus === "loading"
                }
              >
                Commit Project Knowledge
              </button>
            </div>

            <div className="formGrid">
              <label>
                <span>Revoke entry id</span>
                <input
                  value={projectKnowledgeRevokeEntryId}
                  onChange={(event) =>
                    setProjectKnowledgeRevokeEntryId(event.target.value)
                  }
                  placeholder="project-knowledge-entry-id"
                />
              </label>
              <label>
                <span>Revoke confirmation</span>
                <input
                  value={projectKnowledgeRevokeConfirmation}
                  onChange={(event) =>
                    setProjectKnowledgeRevokeConfirmation(event.target.value)
                  }
                  placeholder="REVOKE PROJECT KNOWLEDGE"
                />
              </label>
              <label>
                <span>Expire entry id</span>
                <input
                  value={projectKnowledgeExpireEntryId}
                  onChange={(event) =>
                    setProjectKnowledgeExpireEntryId(event.target.value)
                  }
                  placeholder="project-knowledge-entry-id"
                />
              </label>
              <label>
                <span>Expire reason</span>
                <input
                  value={projectKnowledgeExpireReason}
                  onChange={(event) =>
                    setProjectKnowledgeExpireReason(event.target.value)
                  }
                  placeholder="Summary-only reason"
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
                  handleRevokeProjectKnowledgeEntry().catch((caught) => {
                    setProjectKnowledgeActionError(safeErrorMessage(caught));
                    setProjectKnowledgeActionStatus("error");
                  });
                }}
                disabled={
                  !projectKnowledgeReviewCandidate.readiness.canRevokeEntry ||
                  projectKnowledgeActionStatus === "loading"
                }
              >
                Revoke Project Knowledge
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleExpireProjectKnowledgeEntry().catch((caught) => {
                    setProjectKnowledgeActionError(safeErrorMessage(caught));
                    setProjectKnowledgeActionStatus("error");
                  });
                }}
                disabled={
                  !projectKnowledgeReviewCandidate.readiness.canExpireEntry ||
                  projectKnowledgeActionStatus === "loading"
                }
              >
                Expire Project Knowledge
              </button>
            </div>

            {displayedProjectKnowledgeReview.status === "empty" ? (
              <p className="empty">
                No project knowledge snapshot loaded. Refresh the workspace or
                preview a human-reviewed candidate.
              </p>
            ) : null}

            {displayedProjectKnowledgeReview.status === "blocked" ? (
              <div className="errorBox">
                <strong>Project knowledge blocked</strong>
                <p>{displayedProjectKnowledgeReview.nextAction}</p>
              </div>
            ) : null}

            {projectKnowledgeActionError !== undefined ? (
              <div className="errorBox">
                <strong>Project knowledge command failed safely</strong>
                <p>{projectKnowledgeActionError}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedProjectKnowledgeReview.status}</dd>
              </div>
              <div>
                <dt>Entries active / total</dt>
                <dd>
                  {
                    displayedProjectKnowledgeReview.snapshotSummary
                      .activeEntryCount
                  }{" "}
                  / {displayedProjectKnowledgeReview.snapshotSummary.entryCount}
                </dd>
              </div>
              <div>
                <dt>Revoked / expired</dt>
                <dd>
                  {
                    displayedProjectKnowledgeReview.snapshotSummary
                      .revokedEntryCount
                  }{" "}
                  /{" "}
                  {
                    displayedProjectKnowledgeReview.snapshotSummary
                      .expiredEntryCount
                  }
                </dd>
              </div>
              <div>
                <dt>Candidate type</dt>
                <dd>
                  {displayedProjectKnowledgeReview.candidate?.type ?? "n/a"}
                </dd>
              </div>
              <div>
                <dt>Evidence refs</dt>
                <dd>
                  {displayedProjectKnowledgeReview.candidateSummary
                    ?.evidenceRefCount ?? 0}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedProjectKnowledgeReview.blockerCount} /{" "}
                  {displayedProjectKnowledgeReview.warningCount}
                </dd>
              </div>
              <div>
                <dt>Commit ready</dt>
                <dd>
                  {displayedProjectKnowledgeReview.readiness.canCommitCandidate
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Auto model / tool commit</dt>
                <dd>
                  {displayedProjectKnowledgeReview.readiness
                    .canAutoCommitFromModel
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedProjectKnowledgeReview.readiness
                    .canAutoCommitFromTool
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Apply / rollback</dt>
                <dd>
                  {displayedProjectKnowledgeReview.readiness.canApplyPatch
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedProjectKnowledgeReview.readiness.canRollback
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Git / shell</dt>
                <dd>
                  {displayedProjectKnowledgeReview.readiness.canExecuteGit
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedProjectKnowledgeReview.readiness.canExecuteShell
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedProjectKnowledgeReview.hashPrefix}</dd>
              </div>
              <div>
                <dt>Action status</dt>
                <dd>{projectKnowledgeActionStatus}</dd>
              </div>
            </dl>

            {displayedProjectKnowledgeReview.latestCommit !== undefined ? (
              <p className="fieldHelp">
                Latest commit:{" "}
                {displayedProjectKnowledgeReview.latestCommit.entry.entryId} ·{" "}
                {displayedProjectKnowledgeReview.latestCommit.safeMessage}
              </p>
            ) : null}

            {displayedProjectKnowledgeReview.latestLifecycle !== undefined ? (
              <p className="fieldHelp">
                Latest lifecycle:{" "}
                {displayedProjectKnowledgeReview.latestLifecycle.entryId} ·{" "}
                {displayedProjectKnowledgeReview.latestLifecycle.status}
              </p>
            ) : null}

            {displayedProjectKnowledgeReview.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedProjectKnowledgeReview.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}

            {displayedProjectKnowledgeReview.snapshot?.entries.length ? (
              <ol className="timelineList">
                {displayedProjectKnowledgeReview.snapshot.entries.map(
                  (entry) => (
                    <li key={entry.entryId}>
                      <strong>{entry.type}</strong> · {entry.entryId} ·{" "}
                      {entry.namespace}
                      <span className="timelineMeta">
                        {entry.status} · evidence {entry.evidenceRefCount} ·
                        tags {entry.tagCount}
                      </span>
                      <span>{entry.summary}</span>
                      {entry.warningCodes.length > 0 ? (
                        <span className="timelineMeta">
                          Warnings: {entry.warningCodes.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  )
                )}
              </ol>
            ) : null}

            <p className="fieldHelp">
              {
                summarizeProjectKnowledgeReviewView(
                  displayedProjectKnowledgeReview
                ).source
              }{" "}
              · {displayedProjectKnowledgeReview.nextAction}
            </p>
          </section>

          <section className="eventPanel" aria-label="Project Knowledge Recall">
            <div className="panelHeader">
              <h2>Project Knowledge Recall</h2>
              <span className="muted">Read-only / summary refs</span>
            </div>
            <p className="fieldHelp">
              Uses committed project knowledge summaries for the current task.
              The App Shell does not commit memory, apply patches, rollback,
              write events, or change immutable rules.
            </p>

            <div className="formGrid">
              <label>
                <span>Recall tags</span>
                <input
                  value={projectKnowledgeRecallTagsText}
                  onChange={(event) =>
                    setProjectKnowledgeRecallTagsText(event.target.value)
                  }
                  placeholder="project-knowledge, p0t"
                />
              </label>
              <label>
                <span>Include entry ids</span>
                <input
                  value={projectKnowledgeRecallIncludeIdsText}
                  onChange={(event) =>
                    setProjectKnowledgeRecallIncludeIdsText(event.target.value)
                  }
                  placeholder="entry-id, optional"
                />
              </label>
              <label>
                <span>Exclude entry ids</span>
                <input
                  value={projectKnowledgeRecallExcludeIdsText}
                  onChange={(event) =>
                    setProjectKnowledgeRecallExcludeIdsText(event.target.value)
                  }
                  placeholder="entry-id, optional"
                />
              </label>
              <label>
                <span>Max entries</span>
                <input
                  value={projectKnowledgeRecallMaxEntries}
                  onChange={(event) =>
                    setProjectKnowledgeRecallMaxEntries(event.target.value)
                  }
                  inputMode="numeric"
                  placeholder="6"
                />
              </label>
              <label>
                <span>Trust threshold</span>
                <input
                  value={projectKnowledgeRecallTrustThreshold}
                  onChange={(event) =>
                    setProjectKnowledgeRecallTrustThreshold(event.target.value)
                  }
                  inputMode="decimal"
                  placeholder="0.5"
                />
              </label>
            </div>

            <label className="checkboxRow">
              <input
                type="checkbox"
                checked={projectKnowledgePolicyRecallEnabled}
                onChange={(event) =>
                  setProjectKnowledgePolicyRecallEnabled(event.target.checked)
                }
              />
              <span>
                Enable human-reviewed policy recall for workspace rules
              </span>
            </label>

            <div className="buttonRow">
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handlePreviewProjectKnowledgeRecall();
                }}
                disabled={
                  !projectKnowledgeRecallCandidate.readiness.canPreviewRecall
                }
              >
                Preview Project Knowledge Recall
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleClearProjectKnowledgeRecall();
                }}
              >
                Clear Project Knowledge Recall
              </button>
            </div>

            {displayedProjectKnowledgeRecall.status === "empty" ? (
              <p className="empty">
                Refresh project knowledge and preview recall to add summary-only
                refs to the current task context.
              </p>
            ) : null}

            {displayedProjectKnowledgeRecall.status === "blocked" ? (
              <div className="errorBox">
                <strong>Project knowledge recall blocked</strong>
                <p>{displayedProjectKnowledgeRecall.nextAction}</p>
              </div>
            ) : null}

            <dl className="summaryGrid compact">
              <div>
                <dt>Status</dt>
                <dd>{displayedProjectKnowledgeRecall.status}</dd>
              </div>
              <div>
                <dt>Matches</dt>
                <dd>{displayedProjectKnowledgeRecall.matchedEntryCount}</dd>
              </div>
              <div>
                <dt>Fact / pitfall / policy</dt>
                <dd>
                  {displayedProjectKnowledgeRecall.projectFactCount} /{" "}
                  {displayedProjectKnowledgeRecall.pitfallCount} /{" "}
                  {displayedProjectKnowledgeRecall.policyCount}
                </dd>
              </div>
              <div>
                <dt>volatile_tail</dt>
                <dd>{displayedProjectKnowledgeRecall.volatileTailCount}</dd>
              </div>
              <div>
                <dt>workspace rules</dt>
                <dd>
                  {displayedProjectKnowledgeRecall.workspaceRulesSummaryCount}
                </dd>
              </div>
              <div>
                <dt>Include / exclude</dt>
                <dd>
                  {displayedProjectKnowledgeRecall.includeEntryIds.length} /{" "}
                  {displayedProjectKnowledgeRecall.excludeEntryIds.length}
                </dd>
              </div>
              <div>
                <dt>Blockers / warnings</dt>
                <dd>
                  {displayedProjectKnowledgeRecall.blockerCount} /{" "}
                  {displayedProjectKnowledgeRecall.warningCount}
                </dd>
              </div>
              <div>
                <dt>Context assembly</dt>
                <dd>
                  {displayedProjectKnowledgeRecall.readiness
                    .canEnterContextAssembly
                    ? "ready"
                    : "not ready"}
                </dd>
              </div>
              <div>
                <dt>Mutation / apply</dt>
                <dd>
                  {displayedProjectKnowledgeRecall.readiness
                    .canMutateProjectKnowledge
                    ? "yes"
                    : "no"}{" "}
                  /{" "}
                  {displayedProjectKnowledgeRecall.readiness.canApplyPatch
                    ? "yes"
                    : "no"}
                </dd>
              </div>
              <div>
                <dt>Hash</dt>
                <dd>{displayedProjectKnowledgeRecall.hashPrefix}</dd>
              </div>
            </dl>

            <p className="fieldHelp">
              {
                summarizeProjectKnowledgeRecallView(
                  displayedProjectKnowledgeRecall
                ).source
              }{" "}
              · {displayedProjectKnowledgeRecall.nextAction}
            </p>

            {displayedProjectKnowledgeRecall.matchedEntries.length > 0 ? (
              <ol className="timelineList">
                {displayedProjectKnowledgeRecall.matchedEntries.map((entry) => (
                  <li key={entry.entryId}>
                    <strong>{entry.type}</strong> · {entry.entryId} ·{" "}
                    {entry.namespace}
                    <span className="timelineMeta">
                      {entry.status} · score {entry.score.toFixed(1)} ·{" "}
                      {entry.placement}
                    </span>
                    <span>{entry.summary}</span>
                    <span className="timelineMeta">
                      Reasons: {entry.reasonCodes.join(", ") || "n/a"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {displayedProjectKnowledgeRecall.findings.length > 0 ? (
              <p className="muted">
                findings{" "}
                {displayedProjectKnowledgeRecall.findings
                  .map((finding) => finding.code)
                  .join(", ")}
              </p>
            ) : null}
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
                    <dt>Project knowledge events</dt>
                    <dd>{eventPanel.projectKnowledgeEventCount}</dd>
                  </div>
                  <div>
                    <dt>Project knowledge entries</dt>
                    <dd>{eventPanel.projectKnowledgeEntryCount}</dd>
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
                    <dt>Latest project knowledge</dt>
                    <dd>{eventPanel.latestProjectKnowledgeSummary ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Latest project knowledge recall</dt>
                    <dd>
                      {eventPanel.latestProjectKnowledgeRecallSummary ?? "n/a"}
                    </dd>
                  </div>
                  <div>
                    <dt>Desktop action replay preview</dt>
                    <dd>
                      {desktopActionReplayView.status === "empty"
                        ? "n/a"
                        : `${desktopActionReplayView.eventType} / ${desktopActionReplayView.actionStatus}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Knowledge redaction audit</dt>
                    <dd>
                      {eventPanel.projectKnowledgeRedactionAuditStatus ?? "n/a"}
                    </dd>
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
