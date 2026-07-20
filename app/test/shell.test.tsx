import { renderToString } from "react-dom/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { AppShell } from "../src/shell/AppShell.js";
import { SETTINGS_GROUPS } from "../src/shell/types.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDir, "..");

describe("chat-first app shell", () => {
  it("renders the sidebar, static conversation, and composer in Chinese by default", () => {
    const html = renderToString(<AppShell />);

    expect(html).toContain("Conversation sidebar");
    expect(html).toContain("新建对话");
    expect(html).toContain("设置");
    expect(html).toContain("Read Auto-Approved");
    expect(html).toContain("消息输入框");
    expect(html).toContain("/read");
    // Debug panels are not rendered anywhere in the shell.
    expect(html).not.toContain("Patch Approval Draft");
    expect(html).not.toContain("Agent Route Preview");
    expect(html).not.toContain("Capability Host");
  });

  it("exposes all seven settings groups", () => {
    expect(SETTINGS_GROUPS.map((group) => group.id)).toEqual([
      "general",
      "permissions",
      "model",
      "mcp",
      "desktop",
      "memory",
      "data"
    ]);
    expect(SETTINGS_GROUPS).toHaveLength(7);
  });

  it("switches the entry point to the shell and imports the theme", async () => {
    const mainSource = await readFile(
      path.join(appRoot, "src", "main.tsx"),
      "utf8"
    );
    const themeSource = await readFile(
      path.join(appRoot, "src", "shell", "theme.css"),
      "utf8"
    );

    expect(mainSource).toContain('from "./shell/AppShell.js"');
    expect(mainSource).toContain('import "./shell/theme.css"');
    expect(mainSource).not.toContain('from "./App.js"');
    for (const token of [
      "--paper",
      "--glass",
      "--ink",
      "--accent",
      "backdrop-filter: blur(12px)",
      ".composer",
      ".settingsLayout"
    ]) {
      expect(themeSource).toContain(token);
    }
  });

  it("keeps the legacy debug app unmounted", async () => {
    const mainSource = await readFile(
      path.join(appRoot, "src", "main.tsx"),
      "utf8"
    );
    const appSource = await readFile(
      path.join(appRoot, "src", "App.tsx"),
      "utf8"
    );

    // The legacy 98-panel debug app stays in the codebase (dead code) but
    // is no longer referenced by the entry point.
    expect(mainSource).not.toContain("App />");
    expect(appSource).toContain("Command Broker");
  });
});
