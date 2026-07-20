import { useCallback, useEffect, useState } from "react";

import { useT } from "../i18n/index.js";
import {
  deleteTranscriptRecord,
  exportTranscriptSummary,
  listTranscriptRecords,
  loadWorkspaceEventSummary,
  readTranscriptRecordSummary,
  type TranscriptRecordSummary
} from "../../desktop-flow.js";
import { safeErrorMessage } from "../../safety.js";

export function DataSettings({ workspaceRoot }: { workspaceRoot: string }) {
  const t = useT();
  return (
    <>
      <h2 className="sectionTitle">{t("Data & Storage")}</h2>
      <TranscriptCard workspaceRoot={workspaceRoot} />
      <EventLogCard workspaceRoot={workspaceRoot} />
    </>
  );
}

function TranscriptCard({ workspaceRoot }: { workspaceRoot: string }) {
  const t = useT();
  const [records, setRecords] = useState<TranscriptRecordSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [summary, setSummary] = useState<string>();
  const [status, setStatus] = useState("");

  const refresh = useCallback(async () => {
    if (workspaceRoot.trim().length === 0) {
      setRecords([]);
      return;
    }
    try {
      const result = await listTranscriptRecords(workspaceRoot);
      setRecords(result.records);
      setStatus(
        result.recordCount === 0
          ? t("No transcript records yet.")
          : `${result.recordCount} record(s)`
      );
    } catch (caught) {
      setStatus(t("List failed: ") + safeErrorMessage(caught));
    }
  }, [workspaceRoot, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handlePreview(): Promise<void> {
    try {
      const result = await readTranscriptRecordSummary({
        workspaceRoot,
        transcriptId: selectedId
      });
      setSummary(JSON.stringify(result, null, 2));
    } catch (caught) {
      setStatus(t("Preview failed: ") + safeErrorMessage(caught));
    }
  }

  async function handleExport(): Promise<void> {
    try {
      const result = await exportTranscriptSummary({
        workspaceRoot,
        transcriptId: selectedId
      });
      setSummary(JSON.stringify(result, null, 2));
    } catch (caught) {
      setStatus(t("Export failed: ") + safeErrorMessage(caught));
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await deleteTranscriptRecord({
        workspaceRoot,
        transcriptId: selectedId
      });
      setSummary(undefined);
      setSelectedId("");
      setStatus(t("Transcript deleted."));
      await refresh();
    } catch (caught) {
      setStatus(t("Delete failed: ") + safeErrorMessage(caught));
    }
  }

  return (
    <div className="card">
      <div className="cardTitle">{t("Transcript store")}</div>
      <div className="row">
        <button
          type="button"
          className="secondary"
          disabled={workspaceRoot.trim().length === 0}
          onClick={() => void refresh()}
        >
          {t("Refresh")}
        </button>
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          aria-label={t("Select transcript")}
        >
          <option value="">{t("Select transcript…")}</option>
          {records.map((record) => (
            <option key={record.transcriptId} value={record.transcriptId}>
              {record.transcriptId}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="secondary"
          disabled={selectedId.length === 0}
          onClick={() => void handlePreview()}
        >
          {t("Preview")}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={selectedId.length === 0}
          onClick={() => void handleExport()}
        >
          {t("Export summary")}
        </button>
      </div>
      {summary !== undefined && <pre className="resultBox">{summary}</pre>}
      <div className="row" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="secondary"
          disabled={selectedId.length === 0}
          onClick={() => void handleDelete()}
        >
          {t("Delete transcript")}
        </button>
      </div>
      {status !== "" && <p className="muted">{status}</p>}
    </div>
  );
}

function EventLogCard({ workspaceRoot }: { workspaceRoot: string }) {
  const t = useT();
  const [summaryText, setSummaryText] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setError(undefined);
    if (workspaceRoot.trim().length === 0) {
      setSummaryText(undefined);
      return;
    }
    try {
      const result = await loadWorkspaceEventSummary(workspaceRoot, 50);
      setSummaryText(JSON.stringify(result, null, 2));
    } catch (caught) {
      setError(safeErrorMessage(caught));
    }
  }, [workspaceRoot]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="card">
      <div className="cardTitle">{t("Event log replay")}</div>
      <div className="row">
        <button
          type="button"
          className="secondary"
          disabled={workspaceRoot.trim().length === 0}
          onClick={() => void load()}
        >
          {t("Load events")}
        </button>
      </div>
      {summaryText !== undefined && (
        <pre className="resultBox">{summaryText}</pre>
      )}
      {error !== undefined && <p className="errorText">{error}</p>}
    </div>
  );
}
