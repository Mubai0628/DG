import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  filterSlashCommands,
  SLASH_COMMANDS,
  SlashPalette
} from "../src/shell/chat/SlashPalette.js";
import { LanguageProvider } from "../src/shell/i18n/index.js";
import { Sidebar } from "../src/shell/Sidebar.js";

describe("slash command palette", () => {
  it("lists all commands on a bare slash and filters by prefix", () => {
    expect(filterSlashCommands("/")).toHaveLength(SLASH_COMMANDS.length);
    expect(filterSlashCommands("/re").map((command) => command.name)).toEqual([
      "/read"
    ]);
    expect(filterSlashCommands("/g").map((command) => command.name)).toEqual([
      "/git"
    ]);
    expect(filterSlashCommands("/broker pnpm")).toEqual([]);
    expect(filterSlashCommands("plain text")).toEqual([]);
  });

  it("renders the palette with Chinese descriptions by default", () => {
    const html = renderToString(<SlashPalette text="/" onPick={() => {}} />);

    expect(html).toContain("/read");
    expect(html).toContain("/convert");
    expect(html).toContain("/git");
    expect(html).toContain("读取工作区文件");
  });
});

describe("sidebar project grouping", () => {
  it("renders projects with nested conversations and standalone conversations", () => {
    const html = renderToString(
      <LanguageProvider language="zh">
        <Sidebar
          permissionTierLabel="Read Auto-Approved"
          collapsed={false}
          projects={[{ id: "p1", name: "demo", root: "C:\\ws" }]}
          conversations={[
            { id: "c1", title: "demo · 新对话", projectId: "p1" },
            { id: "c2", title: "新对话 2", projectId: null }
          ]}
          activeConversationId="c2"
          onToggleCollapsed={() => {}}
          onOpenSettings={() => {}}
          onAddProject={() => {}}
          onAddConversation={() => {}}
          onSelectConversation={() => {}}
        />
      </LanguageProvider>
    );

    expect(html).toContain("项目");
    expect(html).toContain("demo");
    expect(html).toContain("demo · 新对话");
    expect(html).toContain("独立对话");
    expect(html).toContain("新对话 2");
    expect(html).toContain("新建项目");
  });
});
