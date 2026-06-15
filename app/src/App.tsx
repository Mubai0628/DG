import { useMemo, useState, type ChangeEvent, type JSX } from "react";

import {
  getDesktopAppVersion,
  runDesktopWebTableToCsvFlow
} from "./desktop-flow.js";
import {
  buildResultPanelModel,
  defaultDraftFilename,
  safeErrorMessage,
  type DesktopFlowResult,
  type ResultPanelModel
} from "./safety.js";

type RunStatus = "idle" | "running" | "done" | "error";

export function App(): JSX.Element {
  const [workspaceRoot, setWorkspaceRoot] = useState("");
  const [payloadText, setPayloadText] = useState("");
  const [filename, setFilename] = useState(defaultDraftFilename());
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<DesktopFlowResult | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [version, setVersion] = useState<string>("0.1.0");

  const panel = useMemo<ResultPanelModel | undefined>(
    () => (result === undefined ? undefined : buildResultPanelModel(result)),
    [result]
  );

  async function handleConvert(): Promise<void> {
    setStatus("running");
    setResult(undefined);
    setError(undefined);
    try {
      const flowResult = await runDesktopWebTableToCsvFlow({
        workspaceRoot,
        payloadText,
        filename
      });
      setResult(flowResult);
      setStatus("done");
    } catch (caught) {
      setError(safeErrorMessage(caught));
      setStatus("error");
    }
  }

  async function handlePayloadFile(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    setPayloadText(await file.text());
  }

  async function refreshVersion(): Promise<void> {
    try {
      setVersion(await getDesktopAppVersion());
    } catch {
      setVersion("0.1.0");
    }
  }

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
            onClick={handleConvert}
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
                <dt>Events written</dt>
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

          <nav className="docLinks" aria-label="Documentation links">
            <a href="../docs/web-table-to-csv-acceptance.md">
              Web table acceptance
            </a>
            <a href="../docs/manual-smoke-v0.1.md">Manual smoke</a>
            <a href="../docs/threat-model-v0.1.md">Threat model</a>
          </nav>
        </section>
      </section>
    </main>
  );
}
