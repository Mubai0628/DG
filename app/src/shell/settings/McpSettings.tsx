import { useState } from "react";

import { useT } from "../i18n/index.js";
import {
  runMcpReadonlyDiscovery,
  type McpReadonlyDiscoverResult
} from "../../desktop-flow.js";
import { safeErrorMessage } from "../../safety.js";

export function McpSettings({ workspaceRoot }: { workspaceRoot: string }) {
  const t = useT();
  const [result, setResult] = useState<McpReadonlyDiscoverResult>();
  const [error, setError] = useState<string>();

  async function handleDiscover(): Promise<void> {
    setError(undefined);
    setResult(undefined);
    try {
      const discovery = await runMcpReadonlyDiscovery({
        profile: {
          profileId: "mcp.docs.injected",
          displayName: "Docs MCP injected profile",
          serverKind: "mcp",
          transportKind: "injected_test_transport",
          serverRef: "mcp.docs.server",
          readOnlyPolicy: {
            allowInitialize: true,
            allowListResources: true,
            allowListPrompts: true,
            allowListTools: true,
            allowReadResource: false,
            allowCallTool: false,
            allowPromptExecution: false,
            allowMutation: false
          }
        },
        maxItems: 10,
        timeoutMs: 5_000
      });
      setResult(discovery);
    } catch (caught) {
      setError(safeErrorMessage(caught));
    }
  }

  return (
    <>
      <h2 className="sectionTitle">{t("Capabilities & MCP")}</h2>
      <div className="card">
        <div className="cardTitle">{t("MCP read-only discovery")}</div>
        <p className="muted">
          {t(
            "Discovery runs against the injected test transport in this build; no real MCP server is contacted. Tool calls stay behind their own approval receipt and arrive with the conversation tools."
          )}
        </p>
        <div className="row">
          <button
            type="button"
            className="primary"
            onClick={() => void handleDiscover()}
          >
            {t("Discover metadata")}
          </button>
        </div>
        {result !== undefined && (
          <pre className="resultBox">
            {`server: ${result.serverInfo.displayName} (${result.serverInfo.serverVersion})\ntools: ${result.toolCount} · resources: ${result.resourceCount} · prompts: ${result.promptCount}`}
          </pre>
        )}
        {error !== undefined && <p className="errorText">{error}</p>}
        {workspaceRoot.trim().length === 0 && (
          <p className="muted">{t("Select a workspace first.")}</p>
        )}
      </div>
    </>
  );
}
