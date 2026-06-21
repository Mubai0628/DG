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
  buildAgentRoutePreviewView,
  type AppAgentRoutePreviewView
} from "./agent-route-preview-view.js";
import {
  buildCapabilityPlanPreviewView,
  capabilityPlanApprovalRefs,
  type AppCapabilityPlanPreviewView
} from "./capability-plan-preview-view.js";
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
  const baseWorkbenchSurfaces = useMemo<AppWorkbenchSurfaceView>(
    () =>
      buildWorkbenchSurfacesView({
        eventSummary,
        controlProjection: controlPlanePanel,
        conversionResult: result,
        conversionError:
          error === undefined ? undefined : { safeMessage: error },
        preflight
      }),
    [controlPlanePanel, error, eventSummary, preflight, result]
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
        patchSurface: baseWorkbenchSurfaces.diff,
        eventSummary
      }),
    [
      baseWorkbenchSurfaces.diff,
      controlPlanePanel,
      displayedRunDraft,
      eventSummary,
      loadedWorkspaceIndexRef,
      memoryInspector,
      memoryRecallPreview
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
        patchSurface: baseWorkbenchSurfaces.diff,
        memoryInspector
      }),
    [
      baseWorkbenchSurfaces.diff,
      contextCart,
      displayedRunDraft,
      loadedWorkspaceIndexRef,
      memoryInspector,
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
        patchSurface: baseWorkbenchSurfaces.diff,
        workspaceIndexRef: loadedWorkspaceIndexRef,
        memoryInspector,
        selectedIntent,
        conversionResult: result,
        conversionError:
          error === undefined ? undefined : { safeMessage: error }
      }),
    [
      agentRoutePreview,
      baseWorkbenchSurfaces.diff,
      contextCart,
      displayedRunDraft,
      error,
      loadedWorkspaceIndexRef,
      memoryInspector,
      result,
      selectedIntent
    ]
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
        futureApprovalRefs: capabilityPlanApprovalRefs(capabilityPlanPreview)
      }),
    [
      capabilityPlanPreview,
      controlPlanePanel,
      error,
      eventSummary,
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
  }, [acceptanceCriteriaDraft, objectiveDraft, selectedIntent, workspaceRoot]);

  function handlePreviewDraftRun(): void {
    if (runDraftCandidate.canPreview) {
      setRunDraftPreview(runDraftCandidate);
    }
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
              Record Draft Event (local) writes one summary-only draft event to
              the workspace event log. It does not create or execute a run.
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
              is not accepted or displayed.
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

          <section className="eventPanel" aria-label="Agent Route Preview">
            <div className="panelHeader">
              <h2>Agent Route Preview</h2>
              <span className="muted">Preview only</span>
            </div>
            <p className="fieldHelp">
              Shows the fixed role route that a future run would use. No agent
              is executed and no model request is sent.
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
              <span className="muted">Planning only</span>
            </div>
            <p className="fieldHelp">
              Shows future capability needs as descriptors. No capability is
              invoked and no permission lease is issued.
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
              <span className="muted">Preview only</span>
            </div>
            <p className="fieldHelp">
              Shows summary-only memory refs that a future run may recall into
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
                Read-only skeleton. No execution controls.
              </span>
            </div>
            <p className="fieldHelp">
              Read-only surfaces for future proposals. No approval, apply, or
              execution controls are available here.
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
