export type SettingsGroup =
  | "general"
  | "permissions"
  | "model"
  | "mcp"
  | "desktop"
  | "memory"
  | "data";

export type ShellProject = {
  id: string;
  name: string;
  root: string;
};

export type ShellConversation = {
  id: string;
  title: string;
  projectId: string | null;
};

export const SETTINGS_GROUPS: readonly {
  id: SettingsGroup;
  label: string;
}[] = [
  { id: "general", label: "General" },
  { id: "permissions", label: "Permissions & Safety" },
  { id: "model", label: "Model & Proposals" },
  { id: "mcp", label: "Capabilities & MCP" },
  { id: "desktop", label: "Desktop" },
  { id: "memory", label: "Memory & Knowledge" },
  { id: "data", label: "Data & Storage" }
];
