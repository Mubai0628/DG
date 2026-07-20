import { useState } from "react";

import { useT } from "./i18n/index.js";
import type {
  SettingsGroup,
  ShellConversation,
  ShellProject
} from "./types.js";

export type SidebarProps = {
  workspaceRoot: string;
  permissionTierLabel: string;
  collapsed: boolean;
  projects: ShellProject[];
  conversations: ShellConversation[];
  activeConversationId: string;
  onToggleCollapsed: () => void;
  onOpenSettings: (group?: SettingsGroup) => void;
  onAddProject: (root: string) => void;
  onAddConversation: () => void;
  onSelectConversation: (id: string) => void;
};

export function Sidebar({
  workspaceRoot,
  permissionTierLabel,
  collapsed,
  projects,
  conversations,
  activeConversationId,
  onToggleCollapsed,
  onOpenSettings,
  onAddProject,
  onAddConversation,
  onSelectConversation
}: SidebarProps) {
  const t = useT();
  const [projectRoot, setProjectRoot] = useState("");
  const standalone = conversations.filter(
    (conversation) => conversation.projectId === null
  );
  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  );

  return (
    <aside className="sidebar" aria-label="Conversation sidebar">
      <div className="sidebarBrand">
        {collapsed ? "DW" : "DeepSeek Workbench"}
        <button
          type="button"
          className="secondary"
          style={{ marginLeft: "auto", padding: "2px 8px" }}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <div className="sidebarSection">
        <div className="sidebarTitle">{t("Conversation")}</div>
        {activeConversation !== undefined && (
          <button type="button" className="navItem active">
            {activeConversation.title}
          </button>
        )}
        <button type="button" className="navItem" onClick={onAddConversation}>
          {t("＋ New conversation")}
        </button>
      </div>

      <div className="sidebarSection">
        <div className="sidebarTitle">{t("Projects")}</div>
        {projects.map((project) => (
          <div key={project.id}>
            <div className="navItem" style={{ cursor: "default" }}>
              📁 {project.name}
            </div>
            {conversations
              .filter((conversation) => conversation.projectId === project.id)
              .map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`navItem${
                    conversation.id === activeConversationId ? " active" : ""
                  }`}
                  style={{ paddingLeft: 24 }}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  💬 {conversation.title}
                </button>
              ))}
          </div>
        ))}
        {!collapsed && (
          <div className="sidebarSection" style={{ gap: 4 }}>
            <input
              value={projectRoot}
              onChange={(event) => setProjectRoot(event.target.value)}
              placeholder="C:\\path\\to\\workspace"
              aria-label={t("Workspace root")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onAddProject(projectRoot);
                  setProjectRoot("");
                }
              }}
            />
            <button
              type="button"
              className="navItem"
              disabled={projectRoot.trim().length === 0}
              onClick={() => {
                onAddProject(projectRoot);
                setProjectRoot("");
              }}
            >
              {t("＋ New project")}
            </button>
          </div>
        )}
      </div>

      {standalone.length > 0 && (
        <div className="sidebarSection">
          <div className="sidebarTitle">{t("Standalone conversations")}</div>
          {standalone.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={`navItem${
                conversation.id === activeConversationId ? " active" : ""
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              💬 {conversation.title}
            </button>
          ))}
        </div>
      )}

      <div className="sidebarSpacer" />

      <div className="sidebarFooter">
        <button
          type="button"
          className="modeBadge"
          onClick={() => onOpenSettings("permissions")}
          title={t("Open permission settings")}
        >
          ⛨ {permissionTierLabel}
        </button>
        <button
          type="button"
          className="navItem"
          onClick={() => onOpenSettings()}
          aria-label={t("Open settings")}
        >
          {t("⚙ Settings")}
        </button>
      </div>
    </aside>
  );
}
