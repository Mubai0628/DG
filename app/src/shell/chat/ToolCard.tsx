import { useT } from "../i18n/index.js";
import type { ChatItem, ToolKind, ToolState } from "./chat-types.js";

const TOOL_LABEL_KEYS: Record<ToolKind, string> = {
  read: "Read workspace file",
  convert: "Web table → CSV",
  broker: "Command broker",
  verify: "Shell verification lane",
  git: "Git read lane",
  chat: "DeepSeek chat"
};

export function ToolCard({
  item
}: {
  item: Extract<ChatItem, { kind: "tool" }>;
}) {
  const t = useT();
  const { tool, title, state } = item;
  return (
    <div className="card">
      <div className="cardTitle">
        {t(TOOL_LABEL_KEYS[tool])}
        <StatusChip state={state} />
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        <code>{title}</code>
      </p>
      <ToolBody state={state} />
    </div>
  );
}

function StatusChip({ state }: { state: ToolState }) {
  const t = useT();
  switch (state.phase) {
    case "needs_args":
      return <span className="statusChip warn">{t("needs input")}</span>;
    case "awaiting_approval":
      return <span className="statusChip warn">{t("approval required")}</span>;
    case "running":
      return <span className="statusChip">{t("running…")}</span>;
    case "done":
      return <span className="statusChip ok">{t("done")}</span>;
    case "error":
      return <span className="statusChip danger">{t("error")}</span>;
  }
}

function ToolBody({ state }: { state: ToolState }) {
  const t = useT();
  switch (state.phase) {
    case "needs_args":
      return <p>{state.prompt}</p>;
    case "awaiting_approval":
      return null; // ApprovalCard is rendered by the chat list itself.
    case "running":
      return (
        <p className="muted">{t("Running through the fixed Tauri lane…")}</p>
      );
    case "done":
      return (
        <>
          <p style={{ marginBottom: 6 }}>{state.summary}</p>
          {state.detail !== undefined && (
            <pre className="resultBox">{state.detail}</pre>
          )}
        </>
      );
    case "error":
      return <p className="errorText">{state.message}</p>;
  }
}
