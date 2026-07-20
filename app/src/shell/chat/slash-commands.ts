/**
 * Slash command parsing for the chat composer (pure, unit-tested).
 *
 * P2 supports quick tools only; anything that is not a recognized slash
 * command falls through to `chat` (the model conversation loop arrives in
 * P3), and unknown slash commands return `unknown` with a hint.
 */
export type ParsedComposerInput =
  | { kind: "read"; relativePath: string }
  | { kind: "convert"; filename: string }
  | { kind: "broker"; commandText: string }
  | { kind: "verify"; templateId: string }
  | { kind: "git"; lane: string }
  | { kind: "chat"; text: string }
  | { kind: "unknown"; input: string };

const VERIFY_TEMPLATES = new Map<string, string>([
  ["typecheck", "pnpm.typecheck"],
  ["lint", "pnpm.lint"],
  ["test", "pnpm.test.scoped"],
  ["app:typecheck", "app.typecheck"],
  ["cargo", "cargo.check_tauri"],
  ["pnpm.typecheck", "pnpm.typecheck"],
  ["pnpm.lint", "pnpm.lint"],
  ["pnpm.test.scoped", "pnpm.test.scoped"],
  ["app.typecheck", "app.typecheck"],
  ["cargo.check_tauri", "cargo.check_tauri"]
]);

const GIT_LANES = new Map<string, string>([
  ["status", "status_summary"],
  ["diff", "diff_summary"],
  ["log", "log_summary"],
  ["branch", "branch_summary"],
  ["status_summary", "status_summary"],
  ["diff_summary", "diff_summary"],
  ["log_summary", "log_summary"],
  ["branch_summary", "branch_summary"]
]);

export function parseComposerInput(rawText: string): ParsedComposerInput {
  const text = rawText.trim();
  if (!text.startsWith("/")) {
    return { kind: "chat", text };
  }
  const [head, ...rest] = text.split(/\s+/);
  const args = rest.join(" ").trim();

  switch (head) {
    case "/read":
      return args.length > 0
        ? { kind: "read", relativePath: args }
        : { kind: "unknown", input: text };
    case "/convert":
      return args.length > 0
        ? { kind: "convert", filename: args }
        : { kind: "unknown", input: text };
    case "/broker":
      return args.length > 0
        ? { kind: "broker", commandText: args }
        : { kind: "unknown", input: text };
    case "/verify": {
      const template = VERIFY_TEMPLATES.get(args || "typecheck");
      return template !== undefined
        ? { kind: "verify", templateId: template }
        : { kind: "unknown", input: text };
    }
    case "/git": {
      const lane = GIT_LANES.get(args || "status");
      return lane !== undefined
        ? { kind: "git", lane }
        : { kind: "unknown", input: text };
    }
    default:
      return { kind: "unknown", input: text };
  }
}

export const QUICK_TOOL_USAGE =
  "Quick tools: /read <path> · /convert <file.csv> · /broker <command> · " +
  "/verify [typecheck|lint|test|app:typecheck|cargo] · " +
  "/git [status|diff|log|branch]";
