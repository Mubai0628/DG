import { useRef, useState, type MutableRefObject } from "react";

import { buildCommandBrokerView } from "../command-broker-view.js";
import { ConversationEngine } from "../../../runtime/src/conversation/conversation-engine.js";
import {
  type PendingToolCall,
  type ConversationOutput
} from "../../../runtime/src/conversation/types.js";
import { type DeepSeekToolDefinition } from "../../../runtime/src/deepseek/types.js";
import { buildFileReadApprovalReceipt } from "../../../runtime/src/execution/permission-modes/file-read-approval-receipt.js";
import { commandExecutionModeForPermissionMode } from "../../../runtime/src/execution/permission-modes/permission-tier.js";
import { type PermissionMode } from "../../../runtime/src/execution/permission-modes/mode-policy.js";
import {
  executeCommandBrokerRequest,
  listPermissionLeases,
  readWorkspaceFile,
  runDesktopWebTableToCsvFlow,
  runGitReadLane,
  runShellVerificationLane,
  type CommandBrokerShellKind,
  type GitReadLane,
  type ShellVerificationTemplateId
} from "../desktop-flow.js";
import { safeErrorMessage, validatePayloadTextSize } from "../safety.js";
import { ApprovalCard } from "./chat/ApprovalCard.js";
import {
  type ChatItem,
  type LeaseOption,
  type ToolKind,
  type ToolState
} from "./chat/chat-types.js";
import { createTauriChatClient } from "./chat/engine-client.js";
import { parseComposerInput, QUICK_TOOL_USAGE } from "./chat/slash-commands.js";
import { SlashPalette, type SlashCommandItem } from "./chat/SlashPalette.js";
import { useT } from "./i18n/index.js";
import { ToolCard } from "./chat/ToolCard.js";

export type ChatViewProps = {
  workspaceRoot: string;
  permissionMode: PermissionMode;
  permissionTierLabel: string;
  composerText: string;
  onComposerTextChange: (text: string) => void;
  settingsPersistRef: MutableRefObject<Promise<void> | undefined>;
  items: ChatItem[];
  onItemsChange: (updater: (previous: ChatItem[]) => ChatItem[]) => void;
};

const WORKSPACE_REF = "workspace-ref-chat";

const CHAT_SYSTEM_PROMPT = [
  "You are the DeepSeek Workbench assistant running inside a local,",
  "approval-gated desktop app. Answer concisely and honestly. You may use",
  "the provided workspace tools when they help; every tool call is",
  "reviewed by the user before it runs. Never print or request secrets,",
  "API keys, tokens, or raw credentials. Summaries over raw dumps."
].join(" ");

const CHAT_TOOL_DEFINITIONS: DeepSeekToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "workspace_file_read",
      description:
        "Read a UTF-8 text file inside the workspace (relative path). Sensitive files require user approval.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Workspace-relative file path" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "shell_verification",
      description:
        "Run a fixed safe verification template (typecheck, lint, tests, cargo check) in the workspace.",
      parameters: {
        type: "object",
        properties: {
          template: {
            type: "string",
            enum: [
              "pnpm.typecheck",
              "pnpm.lint",
              "pnpm.test.scoped",
              "app.typecheck",
              "cargo.check_tauri"
            ]
          }
        },
        required: ["template"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "git_read",
      description:
        "Read summary git state (status, diff numstat, recent log, current branch) for the workspace.",
      parameters: {
        type: "object",
        properties: {
          lane: {
            type: "string",
            enum: [
              "status_summary",
              "diff_summary",
              "log_summary",
              "branch_summary"
            ]
          }
        },
        required: ["lane"]
      }
    }
  }
];

let nextItemId = 1;

export function ChatView({
  workspaceRoot,
  permissionMode,
  permissionTierLabel,
  composerText,
  onComposerTextChange,
  settingsPersistRef,
  items,
  onItemsChange
}: ChatViewProps) {
  const [leaseOptionsByItem, setLeaseOptionsByItem] = useState<
    Record<string, LeaseOption[]>
  >({});
  const engineRef = useRef<ConversationEngine | null>(null);
  const pendingToolCallsRef = useRef<Record<string, PendingToolCall>>({});
  const approvalKindRef = useRef<
    Record<string, "quick-read" | "broker" | "model-tool">
  >({});
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const setItems = onItemsChange;
  const t = useT();

  function appendItem(
    item:
      | { kind: "user"; text: string }
      | { kind: "assistant"; text: string }
      | { kind: "tool"; tool: ToolKind; title: string; state: ToolState }
  ): string {
    const id = `chat-item-${nextItemId++}`;
    setItems((previous) => [...previous, { ...item, id } as ChatItem]);
    queueMicrotask(() =>
      listEndRef.current?.scrollIntoView({ behavior: "smooth" })
    );
    return id;
  }

  function updateTool(id: string, state: ToolState): void {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id && item.kind === "tool" ? { ...item, state } : item
      )
    );
  }

  function handleSend(): void {
    const text = composerText.trim();
    if (text.length === 0) {
      return;
    }
    onComposerTextChange("");
    appendItem({ kind: "user", text });
    const parsed = parseComposerInput(text);
    if (parsed.kind === "chat") {
      void runAssistantTurn(parsed.text);
      return;
    }
    if (parsed.kind === "unknown") {
      appendItem({
        kind: "assistant",
        text: t("I don't recognize that command. ") + t(QUICK_TOOL_USAGE)
      });
      return;
    }
    if (workspaceRoot.trim().length === 0) {
      appendItem({
        kind: "assistant",
        text: t(
          "Set a workspace root first (sidebar or Settings → General), then run that tool again."
        )
      });
      return;
    }
    switch (parsed.kind) {
      case "read":
        void dispatchRead(parsed.relativePath);
        break;
      case "convert":
        appendItem({
          kind: "tool",
          tool: "convert",
          title: `/convert ${parsed.filename}`,
          state: {
            phase: "needs_args",
            prompt: t(
              "Paste the sanitized BrowserDomPayload JSON from the browser extension, then run the conversion."
            )
          }
        });
        break;
      case "broker":
        dispatchBroker(parsed.commandText);
        break;
      case "verify":
        void dispatchVerify(parsed.templateId);
        break;
      case "git":
        void dispatchGit(parsed.lane);
        break;
    }
  }

  async function dispatchRead(relativePath: string): Promise<void> {
    const id = appendItem({
      kind: "tool",
      tool: "read",
      title: `/read ${relativePath}`,
      state: { phase: "running" }
    });
    try {
      const result = await readWorkspaceFile({
        workspaceRoot,
        workspaceRootRef: WORKSPACE_REF,
        relativePath,
        permissionMode
      });
      updateTool(id, {
        phase: "done",
        summary: `${result.sensitivity} · ${result.tierGate} · ${result.lineCount} lines · ${result.byteCount} bytes${result.truncated ? " · truncated" : ""}`,
        detail: result.content
      });
    } catch (caught) {
      if (isErrorCode(caught, "WORKSPACE_FILE_RECEIPT_REQUIRED")) {
        updateTool(id, {
          phase: "awaiting_approval",
          reason: t(
            "This read is gated: the file is sensitive, or the current tier requires approval for reads."
          ),
          phrase: "",
          needsLease: false
        });
        approvalKindRef.current[id] = "quick-read";
      } else {
        updateTool(id, { phase: "error", message: safeErrorMessage(caught) });
      }
    }
  }

  function ensureEngine(): ConversationEngine {
    if (engineRef.current === null) {
      engineRef.current = new ConversationEngine({
        client: createTauriChatClient(),
        model: "deepseek-v4-flash",
        tools: CHAT_TOOL_DEFINITIONS,
        systemPrompt: CHAT_SYSTEM_PROMPT
      });
    }
    return engineRef.current;
  }

  async function runAssistantTurn(text: string): Promise<void> {
    const id = appendItem({
      kind: "tool",
      tool: "chat",
      title: "DeepSeek",
      state: { phase: "running" }
    });
    try {
      const output = await ensureEngine().sendUserMessage(text);
      appendAssistantOutput(output);
      updateTool(id, { phase: "done", summary: usageSummaryFor(output) });
    } catch (caught) {
      updateTool(id, { phase: "error", message: safeErrorMessage(caught) });
    }
  }

  function appendAssistantOutput(output: ConversationOutput): void {
    const content = output.assistantTurn.content ?? "";
    if (content.trim().length > 0) {
      appendItem({ kind: "assistant", text: content });
    }
    for (const pending of output.pendingToolCalls) {
      registerPendingToolCall(pending);
    }
  }

  function registerPendingToolCall(pending: PendingToolCall): void {
    const phrase = "";
    const id = appendItem({
      kind: "tool",
      tool: toolKindForModelTool(pending.name),
      title: `${pending.name}(${summarizeToolArguments(pending.arguments)})`,
      state: {
        phase: "awaiting_approval",
        reason: `${t("The assistant wants to run ")}${pending.name}.`,
        phrase,
        needsLease: false
      }
    });
    pendingToolCallsRef.current[id] = pending;
    approvalKindRef.current[id] = "model-tool";
  }

  async function approveModelToolCall(
    id: string,
    phrase: string
  ): Promise<void> {
    const pending = pendingToolCallsRef.current[id];
    if (pending === undefined) {
      updateTool(id, {
        phase: "error",
        message: t("Tool call is no longer pending.")
      });
      return;
    }
    updateTool(id, { phase: "running" });
    try {
      const resultSummary = await executeModelTool(pending, phrase);
      ensureEngine().submitToolResult({
        toolCallId: pending.id,
        content: resultSummary
      });
      updateTool(id, { phase: "done", summary: resultSummary.slice(0, 400) });
      await continueIfToolsSettled();
    } catch (caught) {
      updateTool(id, { phase: "error", message: safeErrorMessage(caught) });
    }
  }

  async function declineModelToolCall(id: string): Promise<void> {
    const pending = pendingToolCallsRef.current[id];
    updateTool(id, {
      phase: "error",
      message: t("Declined — the assistant was informed.")
    });
    if (pending !== undefined) {
      ensureEngine().submitToolResult({
        toolCallId: pending.id,
        content: "The user declined this tool call."
      });
      await continueIfToolsSettled();
    }
  }

  async function continueIfToolsSettled(): Promise<void> {
    const engine = ensureEngine();
    if (engine.getState().pendingToolCalls.length > 0) {
      return;
    }
    try {
      const output = await engine.continueAfterToolResults();
      appendAssistantOutput(output);
    } catch (caught) {
      appendItem({
        kind: "assistant",
        text: `Tool continuation failed: ${safeErrorMessage(caught)}`
      });
    }
  }

  async function executeModelTool(
    pending: PendingToolCall,
    phrase: string
  ): Promise<string> {
    const args = parseToolArguments(pending.arguments);
    if (pending.name === "workspace_file_read") {
      const path = typeof args.path === "string" ? args.path : "";
      if (path.trim().length === 0) {
        throw new Error("workspace_file_read requires a path argument");
      }
      const result = await readWorkspaceFile({
        workspaceRoot,
        workspaceRootRef: WORKSPACE_REF,
        relativePath: path,
        permissionMode,
        approvalReceipt: buildFileReadApprovalReceipt({
          mode: permissionMode,
          workspaceRootRef: WORKSPACE_REF,
          relativePath: path,
          typedConfirmation: phrase
        })
      });
      const clipped =
        result.content.length > 3000
          ? `${result.content.slice(0, 3000)}\n[truncated]`
          : result.content;
      return `file_read(${path}) ${result.sensitivity} ${result.tierGate} ${result.lineCount} lines:\n${clipped}`;
    }
    if (pending.name === "shell_verification") {
      const template =
        typeof args.template === "string" ? args.template : "pnpm.typecheck";
      const result = await runShellVerificationLane({
        workspaceRoot,
        workspaceRootRef: "workspace-ref-verification",
        templateId: template as ShellVerificationTemplateId
      });
      return `verification(${template}) ${result.status} exit ${String(result.exitCode)} stdout ${result.stdoutLineCount} lines stderr ${result.stderrLineCount} lines`;
    }
    if (pending.name === "git_read") {
      const lane = typeof args.lane === "string" ? args.lane : "status_summary";
      const result = await runGitReadLane({
        workspaceRoot,
        workspaceRootRef: "workspace-ref-git-read",
        lane: lane as GitReadLane
      });
      return `git_read(${lane}) ${JSON.stringify(result).slice(0, 2000)}`;
    }
    throw new Error(`Unknown tool ${pending.name}`);
  }

  async function approveRead(
    id: string,
    relativePath: string,
    phrase: string
  ): Promise<void> {
    updateTool(id, { phase: "running" });
    try {
      const result = await readWorkspaceFile({
        workspaceRoot,
        workspaceRootRef: WORKSPACE_REF,
        relativePath,
        permissionMode,
        approvalReceipt: buildFileReadApprovalReceipt({
          mode: permissionMode,
          workspaceRootRef: WORKSPACE_REF,
          relativePath,
          typedConfirmation: phrase
        })
      });
      updateTool(id, {
        phase: "done",
        summary: `approved · ${result.sensitivity} · ${result.lineCount} lines`,
        detail: result.content
      });
    } catch (caught) {
      updateTool(id, { phase: "error", message: safeErrorMessage(caught) });
    }
  }

  function dispatchBroker(commandText: string): void {
    const brokerMode = commandExecutionModeForPermissionMode(permissionMode);
    const preview = buildCommandBrokerView({
      workspaceRoot,
      workspaceRootRef: WORKSPACE_REF,
      mode: brokerMode,
      sessionLeaseRef: "",
      transcriptPolicyRef: "transcript-policy-command-broker",
      commandText,
      shellKind: "powershell",
      workingDirectory: ".",
      allowWorkspaceWrite: brokerMode === "advanced_workspace"
    });
    if (preview.policyDecision !== "ready_for_tauri_execution") {
      appendItem({
        kind: "tool",
        tool: "broker",
        title: `/broker ${commandText}`,
        state: {
          phase: "error",
          message: `The planner blocked this command: ${preview.findingCodes.join(", ") || preview.status}.`
        }
      });
      return;
    }
    const id = appendItem({
      kind: "tool",
      tool: "broker",
      title: `/broker ${commandText}`,
      state: {
        phase: "awaiting_approval",
        reason: `${t("Broker execution requires your typed approval.")} ${t("Classifier")}: ${preview.classifierSummary.categories.length > 0 ? preview.classifierSummary.categories.join(", ") : "safe"}.`,
        phrase: "",
        needsLease: brokerMode === "full_access"
      }
    });
    approvalKindRef.current[id] = "broker";
    if (brokerMode === "full_access") {
      void (async () => {
        try {
          const result = await listPermissionLeases(workspaceRoot);
          const options = result.leases
            .filter(
              (lease) =>
                lease.status === "active" && lease.mode === "full_access_mode"
            )
            .map((lease) => ({
              leaseId: lease.leaseId,
              mode: lease.mode,
              status: lease.status
            }));
          setLeaseOptionsByItem((previous) => ({
            ...previous,
            [id]: options
          }));
        } catch {
          // Lease list stays empty; the approval card explains next steps.
        }
      })();
    }
  }

  async function approveBroker(
    id: string,
    commandText: string,
    phrase: string,
    leaseId: string | undefined
  ): Promise<void> {
    const brokerMode = commandExecutionModeForPermissionMode(permissionMode);
    const view = buildCommandBrokerView({
      workspaceRoot,
      workspaceRootRef: WORKSPACE_REF,
      mode: brokerMode,
      sessionLeaseRef: leaseId ?? "",
      transcriptPolicyRef: "transcript-policy-command-broker",
      commandText,
      shellKind: "powershell",
      workingDirectory: ".",
      allowWorkspaceWrite: brokerMode === "advanced_workspace",
      typedConfirmation: phrase
    });
    if (view.executeDisabled) {
      updateTool(id, {
        phase: "error",
        message: view.executeDisabledReasons.join(", ") || t("Blocked.")
      });
      return;
    }
    updateTool(id, { phase: "running" });
    await settingsPersistRef.current;
    try {
      const result = await executeCommandBrokerRequest({
        workspaceRoot,
        brokerDecision: view.policyDecision,
        commandRequest: {
          requestId: "chat-broker-request",
          mode: String(view.mode),
          workspaceRootRef: view.workspaceRootRef,
          workingDirectory: view.workingDirectory,
          commandText,
          argv: [],
          shellKind: view.shellKind as CommandBrokerShellKind,
          timeoutMs: view.timeoutMs,
          maxOutputBytes: view.maxOutputBytes,
          allowBackgroundProcess: false,
          allowNetwork: false,
          allowWorkspaceWrite: brokerMode === "advanced_workspace",
          allowOutsideWorkspaceWrite: false,
          allowGitWrite: false,
          allowDestructive: false,
          environmentPolicy: {
            mode: "allowlist_names",
            allowedEnvNames: ["PATH"]
          }
        },
        sessionLeaseRef: view.sessionLeaseRef,
        transcriptPolicy: {
          transcriptPolicyRef: view.transcriptPolicyRef,
          rawOptIn: false
        },
        classifierCategories: view.classifierSummary.categories,
        killSwitchActive: false,
        cancellationId: null,
        approvalReceipt: view.approvalReceipt
      });
      updateTool(id, {
        phase: "done",
        summary: `${result.status} · exit ${String(result.exitCode)} · stdout ${result.stdoutLineCount} lines · stderr ${result.stderrLineCount} lines`,
        detail: `transcript: ${result.transcriptId}`
      });
    } catch (caught) {
      updateTool(id, { phase: "error", message: safeErrorMessage(caught) });
    }
  }

  async function submitConvert(
    id: string,
    filename: string,
    payloadText: string
  ): Promise<void> {
    const sizeError = validatePayloadTextSize(payloadText);
    if (sizeError !== undefined) {
      updateTool(id, { phase: "error", message: sizeError });
      return;
    }
    updateTool(id, { phase: "running" });
    try {
      const result = await runDesktopWebTableToCsvFlow({
        workspaceRoot,
        payloadText,
        filename
      });
      updateTool(id, {
        phase: "done",
        summary: t("CSV draft written."),
        detail: JSON.stringify(result, null, 2)
      });
    } catch (caught) {
      updateTool(id, { phase: "error", message: safeErrorMessage(caught) });
    }
  }

  async function dispatchVerify(templateId: string): Promise<void> {
    const id = appendItem({
      kind: "tool",
      tool: "verify",
      title: `/verify ${templateId}`,
      state: { phase: "running" }
    });
    try {
      const result = await runShellVerificationLane({
        workspaceRoot,
        workspaceRootRef: "workspace-ref-verification",
        templateId: templateId as ShellVerificationTemplateId
      });
      updateTool(id, {
        phase: "done",
        summary: `${result.status} · exit ${String(result.exitCode)} · stdout ${result.stdoutLineCount} lines · stderr ${result.stderrLineCount} lines`
      });
    } catch (caught) {
      updateTool(id, { phase: "error", message: safeErrorMessage(caught) });
    }
  }

  async function dispatchGit(lane: string): Promise<void> {
    const id = appendItem({
      kind: "tool",
      tool: "git",
      title: `/git ${lane}`,
      state: { phase: "running" }
    });
    try {
      const result = await runGitReadLane({
        workspaceRoot,
        workspaceRootRef: "workspace-ref-git-read",
        lane: lane as GitReadLane
      });
      updateTool(id, {
        phase: "done",
        summary: `status: ${result.status}`,
        detail: JSON.stringify(result, null, 2)
      });
    } catch (caught) {
      updateTool(id, { phase: "error", message: safeErrorMessage(caught) });
    }
  }

  return (
    <>
      <div className="chatScroll">
        <div className="chatColumn">
          {items.length === 0 && (
            <div className="msgAssistant">
              <p>
                {t("Ask me anything, or run a quick tool. Current tier: ")}
                <strong>{permissionTierLabel}</strong>.
              </p>
              <p className="muted">{t(QUICK_TOOL_USAGE)}</p>
            </div>
          )}
          {items.map((item) => {
            if (item.kind === "user") {
              return (
                <div key={item.id} className="msgUser">
                  {item.text}
                </div>
              );
            }
            if (item.kind === "assistant") {
              return (
                <div key={item.id} className="msgAssistant">
                  {item.text}
                </div>
              );
            }
            if (item.state.phase === "awaiting_approval") {
              return (
                <ApprovalCard
                  key={item.id}
                  reason={item.state.reason}
                  phrase={item.state.phrase}
                  needsLease={item.state.needsLease}
                  leaseOptions={leaseOptionsByItem[item.id] ?? []}
                  onApprove={(phrase, leaseId) => {
                    const approvalKind = approvalKindRef.current[item.id];
                    if (approvalKind === "quick-read") {
                      void approveRead(
                        item.id,
                        item.title.replace(/^\/read /, ""),
                        phrase
                      );
                    } else if (approvalKind === "broker") {
                      void approveBroker(
                        item.id,
                        item.title.replace(/^\/broker /, ""),
                        phrase,
                        leaseId
                      );
                    } else if (approvalKind === "model-tool") {
                      void approveModelToolCall(item.id, phrase);
                    }
                  }}
                  onCancel={() => {
                    if (approvalKindRef.current[item.id] === "model-tool") {
                      void declineModelToolCall(item.id);
                      return;
                    }
                    updateTool(item.id, {
                      phase: "error",
                      message: t("Cancelled — nothing was executed.")
                    });
                  }}
                />
              );
            }
            if (item.state.phase === "needs_args" && item.tool === "convert") {
              return (
                <ConvertArgsCard
                  key={item.id}
                  filename={item.title.replace(/^\/convert /, "")}
                  onSubmit={(payload) =>
                    void submitConvert(
                      item.id,
                      item.title.replace(/^\/convert /, ""),
                      payload
                    )
                  }
                />
              );
            }
            return <ToolCard key={item.id} item={item} />;
          })}
          <div ref={listEndRef} />
        </div>
      </div>
      <div className="composerWrap">
        <SlashPalette
          text={composerText}
          onPick={(command: SlashCommandItem) => {
            onComposerTextChange(`${command.name} `);
          }}
        />
        <div className="composer">
          <textarea
            rows={2}
            value={composerText}
            onChange={(event) => onComposerTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder={t(
              "Message, or /read · /convert · /broker · /verify · /git …"
            )}
            aria-label={t("Message composer")}
          />
          <button
            type="button"
            className="primary"
            onClick={handleSend}
            disabled={composerText.trim().length === 0}
          >
            {t("Send")}
          </button>
        </div>
        <p className="composerHint">{t(QUICK_TOOL_USAGE)}</p>
      </div>
    </>
  );
}

function ConvertArgsCard({
  filename,
  onSubmit
}: {
  filename: string;
  onSubmit: (payloadText: string) => void;
}) {
  const t = useT();
  const [payloadText, setPayloadText] = useState("");
  return (
    <div className="card">
      <div className="cardTitle">
        {t("Web table → CSV")}{" "}
        <span className="statusChip warn">{t("needs input")}</span>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        <code>{filename}</code>
      </p>
      <label className="field">
        <span>{t("BrowserDomPayload JSON")}</span>
        <textarea
          rows={8}
          value={payloadText}
          onChange={(event) => setPayloadText(event.target.value)}
          placeholder='{"schemaVersion":1,"tables":[…]}'
        />
      </label>
      <div className="row">
        <button
          type="button"
          className="primary"
          disabled={payloadText.trim().length === 0}
          onClick={() => onSubmit(payloadText)}
        >
          {t("Run conversion")}
        </button>
      </div>
    </div>
  );
}

function isErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "errorCode" in error &&
    (error as { errorCode?: unknown }).errorCode === code
  );
}

function usageSummaryFor(output: ConversationOutput): string {
  const usage = output.usage;
  if (usage === undefined) {
    return "completed";
  }
  const input = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  return `completed · ${input + outputTokens} tokens`;
}

function toolKindForModelTool(name: string): ToolKind {
  if (name === "workspace_file_read") {
    return "read";
  }
  if (name === "shell_verification") {
    return "verify";
  }
  return "git";
}

function summarizeToolArguments(args: string): string {
  return args.length > 60 ? `${args.slice(0, 60)}…` : args;
}

function parseToolArguments(args: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(args || "{}");
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
