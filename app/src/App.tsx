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
  buildChatRunCanvasView,
  type AppChatRunCanvasView,
  type AppRunCanvasIntent
} from "./chat-run-canvas-view.js";
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
  const workbenchSurfaces = useMemo<AppWorkbenchSurfaceView>(
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
        approvalDiffAuditSurfaces: workbenchSurfaces
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
              <span className="muted">
                Draft only - no LLM request is sent.
              </span>
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
                disabled={true}
                aria-disabled="true"
              >
                Create Run (disabled)
              </button>
            </div>
            <p className="fieldHelp">
              Create Run is disabled until execution gates are implemented.
            </p>

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
                Read-only skeleton - no execution controls
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
                Read-only skeleton - not connected to persistence
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
