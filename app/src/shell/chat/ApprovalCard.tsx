import { useState } from "react";

import { useT } from "../i18n/index.js";
import type { LeaseOption } from "./chat-types.js";

export type ApprovalCardProps = {
  reason: string;
  phrase: string;
  needsLease: boolean;
  leaseOptions: LeaseOption[];
  onApprove: (phrase: string, leaseId: string | undefined) => void;
  onCancel: () => void;
};

export function ApprovalCard({
  reason,
  phrase,
  needsLease,
  leaseOptions,
  onApprove,
  onCancel
}: ApprovalCardProps) {
  const t = useT();
  const [confirmation, setConfirmation] = useState("");
  const [leaseId, setLeaseId] = useState(leaseOptions[0]?.leaseId ?? "");
  // An empty phrase means the action needs a simple click approval only
  // (no typed confirmation).
  const phraseMatches = phrase === "" || confirmation === phrase;
  const leaseReady = !needsLease || leaseId.trim().length > 0;

  return (
    <div className="card" style={{ borderColor: "rgba(176, 122, 30, 0.4)" }}>
      <div className="cardTitle">
        <span className="statusChip warn">{t("approval required")}</span>
      </div>
      <p>{reason}</p>
      {needsLease &&
        (leaseOptions.length > 0 ? (
          <label className="field">
            <span>{t("Session lease")}</span>
            <select
              value={leaseId}
              onChange={(event) => setLeaseId(event.target.value)}
            >
              {leaseOptions.map((lease) => (
                <option key={lease.leaseId} value={lease.leaseId}>
                  {lease.leaseId} ({t(lease.status)})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="muted">
            {t(
              "No active full-access lease in this workspace — issue one in Settings → Permissions & Safety first."
            )}
          </p>
        ))}
      {phrase !== "" && (
        <label className="field">
          <span>{t("Type the phrase to approve")}</span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={phrase}
          />
        </label>
      )}
      <div className="row">
        <button
          type="button"
          className="primary"
          disabled={!phraseMatches || !leaseReady}
          onClick={() => onApprove(confirmation, leaseId || undefined)}
        >
          {t("Approve & run")}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          {t("Cancel")}
        </button>
      </div>
    </div>
  );
}
