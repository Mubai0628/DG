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
  checkDesktopRunnerPreflight,
  getDesktopAppVersion,
  loadWorkspaceEventSummary,
  recordControlRunDraftEvent,
  runDesktopWebTableToCsvFlow
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
  patchProposalCreationApprovalRefs,
  patchProposalCreationSurfaceSummaries,
  type AppPatchProposalCreationPreviewView,
  type PatchProposalCreationChangeKind
} from "./patch-proposal-creation-preview-view.js";
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
  buildDisposableWorkspaceSnapshotView,
  disposableWorkspaceSnapshotWarningCodes,
  type AppDisposableWorkspaceSnapshotView
} from "./disposable-workspace-snapshot-view.js";
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
  const [snapshotDisposableRootRef, setSnapshotDisposableRootRef] =
    useState("");
  const [snapshotSourceFingerprint, setSnapshotSourceFingerprint] =
    useState("");
  const [snapshotFileSummaryJson, setSnapshotFileSummaryJson] = useState("");
  const [
    disposableWorkspaceSnapshotPreview,
    setDisposableWorkspaceSnapshotPreview
  ] = useState<AppDisposableWorkspaceSnapshotView | undefined>();
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
  const displayedPatchProposalCreation =
    patchProposalCreationPreview ??
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
      ) ?? [])
    ],
    [
      controlledCreationReplayProjection,
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
      )
    ],
    [
      controlledCreationReplayProjection,
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
      )
    ],
    [
      controlledCreationReplayProjection,
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
        futureAuditWarningCodes: patchProposalAuditWarningCodes
      }),
    [
      controlPlanePanel,
      error,
      eventSummary,
      patchProposalApprovalRefs,
      patchProposalAuditWarningCodes,
      patchProposalSurfaceSummaries,
      preflight,
      result
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
        eventSummary,
        replayProjection: controlledCreationReplayProjection,
        snapshotContract: displayedDisposableWorkspaceSnapshot,
        previousPreview: contextAssemblyPreview
      }),
    [
      agentRoutePreview,
      capabilityPlanPreview,
      contextAssemblyPreview,
      controlPlanePanel,
      controlledCreationReplayProjection,
      displayedDisposableWorkspaceSnapshot,
      displayedRunDraft,
      eventSummary,
      loadedWorkspaceIndexRef,
      memoryRecallPreview,
      patchWorkbenchSurfaces.diff
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
          ...disposableWorkspaceSnapshotAuditWarningCodes
        ]
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
      result
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
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
    setDisposableWorkspaceSnapshotPreview(undefined);
    setContextAssemblyPreview(undefined);
  }, [acceptanceCriteriaDraft, objectiveDraft, selectedIntent, workspaceRoot]);

  useEffect(() => {
    setPatchProposalCreationPreview(undefined);
    setPatchProposalValidationPreview(undefined);
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
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
    setContextAssemblyPreview(undefined);
  }, [
    agentRoutePreview.routeId,
    disposableWorkspaceSnapshotPreview?.contractId,
    patchApprovalDraftPreview?.approvalDraftId,
    patchDiffAuditPreview?.auditId,
    patchRollbackCheckpointPreview?.checkpointPreviewId,
    patchVirtualApplyPreview?.virtualApplyId,
    controlledCreationReplayProjection?.projectionId,
    patchWorkbenchSurfaces.diff.items.length,
    capabilityPlanPreview.itemCount,
    displayedRunDraft.draftId,
    eventSummary?.eventCount,
    loadedWorkspaceIndexRef?.hashPrefix,
    memoryRecallPreview.itemCount
  ]);

  useEffect(() => {
    setDisposableWorkspaceSnapshotPreview(undefined);
    setContextAssemblyPreview(undefined);
  }, [
    loadedWorkspaceIndexRef?.hashPrefix,
    snapshotDisposableRootRef,
    snapshotFileSummaryJson,
    snapshotSourceFingerprint
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
    setPatchProposalValidationPreview(undefined);
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
  }

  function handleValidatePatchProposal(): void {
    setPatchProposalValidationPreview(patchProposalValidationCandidate);
    setPatchDiffAuditPreview(undefined);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
  }

  function handlePreviewDiffAudit(): void {
    setPatchDiffAuditPreview(patchDiffAuditCandidate);
    setPatchApprovalDraftPreview(undefined);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
  }

  function handlePreviewApprovalDraft(): void {
    setPatchApprovalDraftPreview(patchApprovalDraftCandidate);
    setPatchVirtualApplyPreview(undefined);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
  }

  function handlePreviewVirtualApply(): void {
    setPatchVirtualApplyPreview(patchVirtualApplyCandidate);
    setPatchRollbackCheckpointPreview(undefined);
    setControlledCreationReplayProjection(undefined);
  }

  function handlePreviewRollbackCheckpoint(): void {
    setPatchRollbackCheckpointPreview(patchRollbackCheckpointCandidate);
    setControlledCreationReplayProjection(undefined);
  }

  function handlePreviewDisposableWorkspaceSnapshot(): void {
    setDisposableWorkspaceSnapshotPreview(disposableWorkspaceSnapshotCandidate);
    setContextAssemblyPreview(undefined);
  }

  function handlePreviewControlledReplayProjection(): void {
    setControlledCreationReplayProjection(controlledCreationReplayCandidate);
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
              passing does not mean apply is enabled.
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
              applied.
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
                Read-only skeleton. No approval, apply, rollback, commit, or
                execution controls.
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
