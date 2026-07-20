import { useState } from "react";

import { useT } from "../i18n/index.js";
import { observeDesktopMetadata } from "../../desktop-flow.js";
import { safeErrorMessage } from "../../safety.js";

export function DesktopSettings() {
  const t = useT();
  const [summary, setSummary] = useState<string>();
  const [error, setError] = useState<string>();

  async function handleObserve(): Promise<void> {
    setError(undefined);
    setSummary(undefined);
    try {
      const result = await observeDesktopMetadata({
        profile: { observationMode: "metadata_only" },
        requestId: "shell-desktop-observe",
        userTriggered: true,
        includeForegroundWindow: true,
        includeWindowList: true,
        includeDisplayMetadata: true,
        includeScreenshotMetadata: false
      });
      setSummary(JSON.stringify(result, null, 2));
    } catch (caught) {
      setError(safeErrorMessage(caught));
    }
  }

  return (
    <>
      <h2 className="sectionTitle">{t("Desktop")}</h2>
      <div className="card">
        <div className="cardTitle">
          {t("Desktop observation")}{" "}
          <span className="statusChip warn">{t("unsupported platform")}</span>
        </div>
        <p className="muted">
          {t(
            "Desktop observation and actions are honest stubs in this build: window metadata is unavailable and desktop actions report unsupported_platform. This is a deliberate fail-closed placeholder, not an error."
          )}
        </p>
        <div className="row">
          <button
            type="button"
            className="secondary"
            onClick={() => void handleObserve()}
          >
            {t("Probe observation metadata")}
          </button>
        </div>
        {summary !== undefined && <pre className="resultBox">{summary}</pre>}
        {error !== undefined && <p className="errorText">{error}</p>}
      </div>
    </>
  );
}
