import { useEffect, useRef, useState } from "react";

import {
  permissionModeTier,
  tierDisplayName
} from "../../../runtime/src/execution/permission-modes/permission-tier.js";
import { type PermissionMode } from "../../../runtime/src/execution/permission-modes/mode-policy.js";
import {
  readWorkspaceSettings,
  writeWorkspaceSettings
} from "../desktop-flow.js";
import { safeErrorMessage } from "../safety.js";
import { ChatView } from "./ChatView.js";
import { LanguageProvider, translate, type Language } from "./i18n/index.js";
import { Sidebar } from "./Sidebar.js";
import { SettingsView } from "./SettingsView.js";
import { type ChatItem } from "./chat/chat-types.js";
import type {
  SettingsGroup,
  ShellConversation,
  ShellProject
} from "./types.js";

export type AppShellView = "chat" | "settings";

export function AppShell() {
  const [workspaceRoot, setWorkspaceRoot] = useState("");
  const [view, setView] = useState<AppShellView>("chat");
  const [settingsGroup, setSettingsGroup] = useState<SettingsGroup>("general");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [projects, setProjects] = useState<ShellProject[]>([]);
  const [conversations, setConversations] = useState<ShellConversation[]>([
    { id: "conv-1", title: "新对话 1", projectId: null }
  ]);
  const [activeConversationId, setActiveConversationId] = useState("conv-1");
  const [itemsByConversation, setItemsByConversation] = useState<
    Record<string, ChatItem[]>
  >({});
  const idCounterRef = useRef(2);
  const [language, setLanguage] = useState<Language>("zh");

  const [permissionMode, setPermissionMode] =
    useState<PermissionMode>("approval_mode");
  const [settingsSource, setSettingsSource] = useState<"project" | "app">(
    "project"
  );
  const [settingsStatus, setSettingsStatus] = useState("");
  const settingsPersistRef = useRef<Promise<void> | undefined>(undefined);

  useEffect(() => {
    const root = workspaceRoot.trim();
    if (root.length === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await readWorkspaceSettings(root);
        if (cancelled) {
          return;
        }
        setPermissionMode(result.permissionMode as PermissionMode);
        setSettingsSource(result.source);
        setSettingsStatus(
          result.defaulted
            ? translate(
                language,
                "Settings defaulted (no saved settings file found)."
              )
            : translate(
                language,
                `Settings loaded from ${result.source} settings.`
              )
        );
      } catch (caught) {
        if (cancelled) {
          return;
        }
        setSettingsStatus(
          translate(language, "Settings load failed: ") +
            safeErrorMessage(caught)
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceRoot, language]);

  function persistSettings(
    mode: PermissionMode,
    source: "project" | "app"
  ): void {
    if (workspaceRoot.trim().length === 0) {
      setSettingsStatus(
        translate(language, "Settings not saved: workspace root is empty.")
      );
      return;
    }
    const pending = (async () => {
      try {
        await writeWorkspaceSettings({
          workspaceRoot,
          source,
          permissionMode: String(mode)
        });
        setSettingsStatus(
          translate(language, `Settings saved to ${source} settings.`)
        );
      } catch (caught) {
        setSettingsStatus(
          translate(language, "Settings save failed: ") +
            safeErrorMessage(caught)
        );
      }
    })();
    settingsPersistRef.current = pending;
  }

  function openSettings(group?: SettingsGroup): void {
    if (group !== undefined) {
      setSettingsGroup(group);
    }
    setView("settings");
  }

  function toggleSettings(): void {
    if (view === "settings") {
      setView("chat");
    } else {
      openSettings();
    }
  }

  function addProject(root: string): void {
    const trimmed = root.trim();
    if (trimmed.length === 0) {
      return;
    }
    const projectId = `proj-${idCounterRef.current++}`;
    const conversationId = `conv-${idCounterRef.current++}`;
    const name =
      trimmed
        .replace(/[\\/]+$/, "")
        .split(/[\\/]/)
        .pop() ?? trimmed;
    const project: ShellProject = { id: projectId, name, root: trimmed };
    const conversation: ShellConversation = {
      id: conversationId,
      title: `${name} · 新对话`,
      projectId
    };
    setProjects((previous) => [...previous, project]);
    setConversations((previous) => [...previous, conversation]);
    setActiveConversationId(conversationId);
    setWorkspaceRoot(trimmed);
    setView("chat");
  }

  function addConversation(): void {
    const active = conversations.find(
      (conversation) => conversation.id === activeConversationId
    );
    const id = `conv-${idCounterRef.current++}`;
    const conversation: ShellConversation = {
      id,
      title: `新对话 ${conversations.length + 1}`,
      projectId: active?.projectId ?? null
    };
    setConversations((previous) => [...previous, conversation]);
    setActiveConversationId(id);
    setView("chat");
  }

  function selectConversation(id: string): void {
    setActiveConversationId(id);
    const conversation = conversations.find((item) => item.id === id);
    if (conversation?.projectId) {
      const project = projects.find(
        (item) => item.id === conversation.projectId
      );
      if (project !== undefined) {
        setWorkspaceRoot(project.root);
      }
    }
    setView("chat");
  }

  const permissionTierLabel = tierDisplayName(
    permissionModeTier(permissionMode)
  );

  const activeItems = itemsByConversation[activeConversationId] ?? [];
  const setActiveItems = (
    updater: (previous: ChatItem[]) => ChatItem[]
  ): void => {
    setItemsByConversation((previous) => ({
      ...previous,
      [activeConversationId]: updater(previous[activeConversationId] ?? [])
    }));
  };

  return (
    <LanguageProvider language={language}>
      <div className={`shell${sidebarCollapsed ? " sidebarCollapsed" : ""}`}>
        <Sidebar
          permissionTierLabel={permissionTierLabel}
          collapsed={sidebarCollapsed}
          projects={projects}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          onOpenSettings={toggleSettings}
          onAddProject={addProject}
          onAddConversation={addConversation}
          onSelectConversation={selectConversation}
        />
        <main className="mainArea">
          {view === "chat" ? (
            <ChatView
              key={activeConversationId}
              workspaceRoot={workspaceRoot}
              permissionMode={permissionMode}
              permissionTierLabel={permissionTierLabel}
              composerText={composerText}
              onComposerTextChange={setComposerText}
              settingsPersistRef={settingsPersistRef}
              items={activeItems}
              onItemsChange={setActiveItems}
            />
          ) : (
            <SettingsView
              workspaceRoot={workspaceRoot}
              onWorkspaceRootChange={setWorkspaceRoot}
              group={settingsGroup}
              onGroupChange={setSettingsGroup}
              permissionMode={permissionMode}
              onPermissionModeChange={setPermissionMode}
              settingsSource={settingsSource}
              onSettingsSourceChange={setSettingsSource}
              settingsStatus={settingsStatus}
              onPersistSettings={persistSettings}
              settingsPersistRef={settingsPersistRef}
              language={language}
              onLanguageChange={setLanguage}
              onClose={() => setView("chat")}
            />
          )}
        </main>
      </div>
    </LanguageProvider>
  );
}
