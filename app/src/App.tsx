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
  buildEventLogPanelModel,
  buildResultPanelModel,
  buildUiErrorFallbackMessage,
  runnerPreflightMessage,
  defaultDraftFilename,
  validatePayloadTextSize,
  safeErrorMessage,
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

  const panel = useMemo<ResultPanelModel | undefined>(
    () => (result === undefined ? undefined : buildResultPanelModel(result)),
    [result]
  );
  const eventPanel = useMemo<EventLogPanelModel | undefined>(
    () => buildEventLogPanelModel(eventSummary),
    [eventSummary]
  );

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
        </div>
        <span className="badge">v0.1 local web-table-to-CSV shell</span>
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
          </label>

          <label>
            <span>Payload JSON file</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handlePayloadFile}
            />
          </label>

          <label>
            <span>Sanitized BrowserDomPayload JSON</span>
            <textarea
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              placeholder="Paste the sanitized extension payload here"
              spellCheck={false}
            />
          </label>

          <label>
            <span>Draft filename</span>
            <input
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              placeholder="web-table-export.csv"
            />
          </label>

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
                No event summary loaded. Refresh events or run a conversion.
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
            <p className="docHint">
              Open this repository document locally: {docMessage}
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
