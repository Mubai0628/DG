import { useCallback, useEffect, useState } from "react";

import type { PermissionMode } from "../../../../runtime/src/execution/permission-modes/mode-policy.js";
import { useT } from "../i18n/index.js";
import {
  issuePermissionLease,
  listPermissionLeases,
  revokePermissionLease,
  type PermissionLeaseSummary
} from "../../desktop-flow.js";
import { safeErrorMessage } from "../../safety.js";

export type PermissionsSettingsProps = {
  workspaceRoot: string;
  permissionMode: PermissionMode;
  onPermissionModeChange: (mode: PermissionMode) => void;
  settingsSource: "project" | "app";
  settingsStatus: string;
  onPersistSettings: (mode: PermissionMode, source: "project" | "app") => void;
};

export function PermissionsSettings({
  workspaceRoot,
  permissionMode,
  onPermissionModeChange,
  settingsSource,
  settingsStatus,
  onPersistSettings
}: PermissionsSettingsProps) {
  const t = useT();
  const [leaseStatus, setLeaseStatus] = useState("");
  const [leases, setLeases] = useState<PermissionLeaseSummary[]>([]);

  const refreshLeases = useCallback(async () => {
    if (workspaceRoot.trim().length === 0) {
      setLeases([]);
      return;
    }
    try {
      const result = await listPermissionLeases(workspaceRoot);
      setLeases(result.leases);
    } catch (caught) {
      setLeaseStatus(t("Lease list failed: ") + safeErrorMessage(caught));
    }
  }, [workspaceRoot, t]);

  useEffect(() => {
    void refreshLeases();
  }, [refreshLeases]);

  async function handleIssueLease(): Promise<void> {
    if (permissionMode !== "full_access_mode") {
      setLeaseStatus(t("Leases are only issuable in full_access mode."));
      return;
    }
    try {
      const result = await issuePermissionLease({
        workspaceRoot,
        workspaceRootRef: "workspace-ref-command-broker",
        mode: permissionMode,
        reasonSummary: `Session lease issued from settings for ${permissionMode}.`,
        ttlMs: 30 * 60_000
      });
      setLeaseStatus(t("Lease issued: ") + result.lease.leaseId);
      await refreshLeases();
    } catch (caught) {
      setLeaseStatus(t("Lease issue failed: ") + safeErrorMessage(caught));
    }
  }

  async function handleRevokeLease(leaseId: string): Promise<void> {
    try {
      await revokePermissionLease({
        workspaceRoot,
        leaseId,
        reasonSummary: "Lease revoked from settings."
      });
      setLeaseStatus(t("Lease revoked: ") + leaseId);
      await refreshLeases();
    } catch (caught) {
      setLeaseStatus(t("Lease revoke failed: ") + safeErrorMessage(caught));
    }
  }

  const modeOption = (() => {
    if (permissionMode === "full_access_mode") {
      return "full_access_mode";
    }
    if (permissionMode === "approval_mode") {
      return "approval_mode";
    }
    return "other";
  })();

  return (
    <>
      <h2 className="sectionTitle">{t("Permissions & Safety")}</h2>
      <div className="card">
        <label className="field">
          <span>{t("Permission mode")}</span>
          <select
            value={modeOption}
            onChange={(event) => {
              const next = event.target.value;
              if (next === "approval_mode" || next === "full_access_mode") {
                onPermissionModeChange(next);
              }
            }}
          >
            <option value="approval_mode">{t("Requires approval")}</option>
            <option value="yolo" disabled>
              {t("yolo (coming soon)")}
            </option>
            <option value="full_access_mode">{t("Full access")}</option>
            {modeOption === "other" && (
              <option value="other" disabled>
                {permissionMode}
              </option>
            )}
          </select>
        </label>
        <p className="muted">
          {t(
            "File reads are available to the assistant in every mode; approvals gate everything else."
          )}
        </p>
        <div className="row">
          <button
            type="button"
            className="primary"
            onClick={() => onPersistSettings(permissionMode, settingsSource)}
          >
            {t("Save mode")}
          </button>
        </div>
        {settingsStatus !== "" && <p className="muted">{settingsStatus}</p>}
      </div>

      <div className="card">
        <div className="cardTitle">{t("Session leases")}</div>
        <p className="muted">
          {t(
            "Broker full_access execution requires a stored, active full-access lease. Leases are time-limited and workspace-scoped."
          )}
        </p>
        <div className="row">
          <button
            type="button"
            className="primary"
            disabled={permissionMode !== "full_access_mode"}
            onClick={() => void handleIssueLease()}
          >
            {t("Issue 30-minute lease")}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => void refreshLeases()}
          >
            {t("Refresh")}
          </button>
        </div>
        {permissionMode !== "full_access_mode" && (
          <p className="muted">
            {t("Switch to full access mode to issue a lease.")}
          </p>
        )}
        {leaseStatus !== "" && <p className="muted">{leaseStatus}</p>}
        {leases.length > 0 ? (
          <table style={{ width: "100%", fontSize: 12.5, marginTop: 8 }}>
            <thead>
              <tr className="muted" style={{ textAlign: "left" }}>
                <th>{t("Lease")}</th>
                <th>{t("Mode")}</th>
                <th>{t("Status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {leases.map((lease) => (
                <tr key={lease.leaseId}>
                  <td className="mono">{lease.leaseId}</td>
                  <td>{lease.mode}</td>
                  <td>
                    <span
                      className={`statusChip${
                        lease.status === "active" ? " ok" : " warn"
                      }`}
                    >
                      {t(lease.status)}
                    </span>
                  </td>
                  <td>
                    {lease.status === "active" && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void handleRevokeLease(lease.leaseId)}
                      >
                        {t("Revoke")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">{t("No leases stored for this workspace.")}</p>
        )}
      </div>
    </>
  );
}
