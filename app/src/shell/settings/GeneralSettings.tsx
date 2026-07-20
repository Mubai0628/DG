import type { PermissionMode } from "../../../../runtime/src/execution/permission-modes/mode-policy.js";
import { useT, type Language } from "../i18n/index.js";

export type GeneralSettingsProps = {
  workspaceRoot: string;
  onWorkspaceRootChange: (value: string) => void;
  permissionMode: PermissionMode;
  settingsSource: "project" | "app";
  onSettingsSourceChange: (source: "project" | "app") => void;
  settingsStatus: string;
  onPersistSettings: (mode: PermissionMode, source: "project" | "app") => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export function GeneralSettings({
  workspaceRoot,
  onWorkspaceRootChange,
  permissionMode,
  settingsSource,
  onSettingsSourceChange,
  settingsStatus,
  onPersistSettings,
  language,
  onLanguageChange
}: GeneralSettingsProps) {
  const t = useT();
  return (
    <>
      <h2 className="sectionTitle">{t("General")}</h2>
      <div className="card">
        <label className="field">
          <span>{t("Workspace root")}</span>
          <input
            value={workspaceRoot}
            onChange={(event) => onWorkspaceRootChange(event.target.value)}
            placeholder="C:\\path\\to\\workspace"
          />
        </label>
        <p className="muted" style={{ marginBottom: 0 }}>
          {t(
            "Settings resolve per workspace; the app-level file is shared across workspaces."
          )}
        </p>
      </div>
      <div className="card">
        <label className="field">
          <span>{t("Language")}</span>
          <select
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as Language)
            }
          >
            <option value="zh">{t("Chinese (default)")}</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="field">
          <span>{t("Theme")}</span>
          <select value="light" disabled>
            <option value="light">{t("Light (default)")}</option>
          </select>
        </label>
        <p className="muted" style={{ marginBottom: 0 }}>
          {t(
            "Paper & frosted glass. Dark theme is reserved for a later round."
          )}
        </p>
      </div>
      <div className="card">
        <label className="field">
          <span>{t("Settings file")}</span>
          <select
            value={settingsSource}
            onChange={(event) =>
              onSettingsSourceChange(event.target.value as "project" | "app")
            }
          >
            <option value="project">{t("Project settings (default)")}</option>
            <option value="app">{t("App settings (shared)")}</option>
          </select>
        </label>
        <div className="row">
          <button
            type="button"
            className="primary"
            onClick={() => onPersistSettings(permissionMode, settingsSource)}
          >
            {t("Save settings")}
          </button>
        </div>
        {settingsStatus !== "" && <p className="muted">{settingsStatus}</p>}
      </div>
    </>
  );
}
