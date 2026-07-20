import { useCallback, useEffect, useState } from "react";

import { useT } from "../i18n/index.js";
import { listProjectKnowledge } from "../../desktop-flow.js";
import { safeErrorMessage } from "../../safety.js";

export function MemorySettings({ workspaceRoot }: { workspaceRoot: string }) {
  const t = useT();
  const [snapshot, setSnapshot] = useState<string>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setError(undefined);
    if (workspaceRoot.trim().length === 0) {
      setSnapshot(undefined);
      return;
    }
    try {
      const result = await listProjectKnowledge(workspaceRoot);
      setSnapshot(JSON.stringify(result, null, 2));
    } catch (caught) {
      setError(safeErrorMessage(caught));
    }
  }, [workspaceRoot]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <h2 className="sectionTitle">{t("Memory & Knowledge")}</h2>
      <div className="card">
        <div className="cardTitle">{t("Project knowledge")}</div>
        <div className="row">
          <button
            type="button"
            className="secondary"
            disabled={workspaceRoot.trim().length === 0}
            onClick={() => void refresh()}
          >
            {t("Refresh")}
          </button>
        </div>
        {snapshot !== undefined && <pre className="resultBox">{snapshot}</pre>}
        {error !== undefined && <p className="errorText">{error}</p>}
        {workspaceRoot.trim().length === 0 && (
          <p className="muted">{t("Select a workspace first.")}</p>
        )}
      </div>
    </>
  );
}
