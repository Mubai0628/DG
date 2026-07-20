import type { MutableRefObject } from "react";

import type { PermissionMode } from "../../../runtime/src/execution/permission-modes/mode-policy.js";
import { useT, type Language } from "./i18n/index.js";
import { DataSettings } from "./settings/DataSettings.js";
import { DesktopSettings } from "./settings/DesktopSettings.js";
import { GeneralSettings } from "./settings/GeneralSettings.js";
import { MemorySettings } from "./settings/MemorySettings.js";
import { McpSettings } from "./settings/McpSettings.js";
import { ModelSettings } from "./settings/ModelSettings.js";
import { PermissionsSettings } from "./settings/PermissionsSettings.js";
import { SETTINGS_GROUPS, type SettingsGroup } from "./types.js";

export type SettingsViewProps = {
  workspaceRoot: string;
  onWorkspaceRootChange: (value: string) => void;
  group: SettingsGroup;
  onGroupChange: (group: SettingsGroup) => void;
  permissionMode: PermissionMode;
  onPermissionModeChange: (mode: PermissionMode) => void;
  settingsSource: "project" | "app";
  onSettingsSourceChange: (source: "project" | "app") => void;
  settingsStatus: string;
  onPersistSettings: (mode: PermissionMode, source: "project" | "app") => void;
  settingsPersistRef: MutableRefObject<Promise<void> | undefined>;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onClose: () => void;
};

export function SettingsView(props: SettingsViewProps) {
  const { group, onGroupChange } = props;
  const t = useT();
  return (
    <div className="settingsLayout">
      <nav className="settingsNav" aria-label="Settings groups">
        {SETTINGS_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`navItem${group === item.id ? " active" : ""}`}
            onClick={() => onGroupChange(item.id)}
          >
            {t(item.label)}
          </button>
        ))}
      </nav>
      <div className="settingsContent">
        <div className="settingsColumn">
          <div className="row">
            <button type="button" className="secondary" onClick={props.onClose}>
              ← {t("Back")}
            </button>
          </div>
          {group === "general" && (
            <GeneralSettings
              workspaceRoot={props.workspaceRoot}
              onWorkspaceRootChange={props.onWorkspaceRootChange}
              permissionMode={props.permissionMode}
              settingsSource={props.settingsSource}
              onSettingsSourceChange={props.onSettingsSourceChange}
              settingsStatus={props.settingsStatus}
              onPersistSettings={props.onPersistSettings}
              language={props.language}
              onLanguageChange={props.onLanguageChange}
            />
          )}
          {group === "permissions" && (
            <PermissionsSettings
              workspaceRoot={props.workspaceRoot}
              permissionMode={props.permissionMode}
              onPermissionModeChange={props.onPermissionModeChange}
              settingsSource={props.settingsSource}
              settingsStatus={props.settingsStatus}
              onPersistSettings={props.onPersistSettings}
            />
          )}
          {group === "model" && <ModelSettings />}
          {group === "mcp" && (
            <McpSettings workspaceRoot={props.workspaceRoot} />
          )}
          {group === "desktop" && <DesktopSettings />}
          {group === "memory" && (
            <MemorySettings workspaceRoot={props.workspaceRoot} />
          )}
          {group === "data" && (
            <DataSettings workspaceRoot={props.workspaceRoot} />
          )}
        </div>
      </div>
    </div>
  );
}
