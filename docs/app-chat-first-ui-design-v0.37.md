# App Chat-First UI Design v0.37

Status: design only (no code in this round). Supersedes the debug-panel
information architecture for end users; the existing 98 panels stay in the
codebase but are hidden (not rendered) in this UI.

## 1. Goals and Principles

**Goals**

- One chat-first home: the primary interface is a single conversation view
  in the style of mainstream agent tools (Codex, Claude Code desktop).
- A left sidebar for conversation-related functions; a settings entry at
  the bottom-left; a settings page with grouped, well-organized sections.
- A clean, light-default visual theme: restrained, layered, with paper and
  frosted-glass materials — no visual noise.

**Principles**

- **Safety culture stays visible**: approvals, typed confirmations,
  permission mode, and lease state are first-class UI elements, not hidden
  in logs. Every irreversible or sensitive action keeps its approval step,
  rendered as an inline card in the conversation.
- **No feature loss**: all current capabilities remain reachable. Debug /
  prototype panels are **hidden in the new UI** (their code stays in the
  codebase but is not rendered); bringing any of them back is a later,
  separate decision.
- **Summary-only data hygiene**: raw secrets, raw output, and raw DOM never
  render in the UI; hashes and counts are the default representation.
- **Honest states**: empty, loading, disabled, and error states always say
  why and what to do next, in human language (no raw error codes as the
  primary message).

## 2. Information Architecture

### 2.1 Top-level structure

```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar (260px, collapsible)        │ Main area              │
│ ┌──────────────────────────────┐    │ ┌────────────────────┐ │
│ │ + New conversation           │    │ │ conversation       │ │
│ │ ────────────────             │    │ │ messages / tool    │ │
│ │ Conversations                │    │ │ cards / approvals  │ │
│ │  · today / earlier           │    │ │                    │ │
│ │ ────────────────             │    │ ├────────────────────┤ │
│ │ Workspace                    │    │ │ composer (input,   │ │
│ │  · current root, switch      │    │ │ mode badge, send)  │ │
│ │ ────────────────             │    │ └────────────────────┘ │
│ │ Tools (quick actions)        │    │                        │
│ ├──────────────────────────────┤    │                        │
│ │ ⚙ Settings   (bottom-left)   │    │                        │
│ │ ⏻ Mode badge → settings      │    │                        │
│ └──────────────────────────────┘    │                        │
└──────────────────────────────────────────────────────────────┘
```

- **Sidebar (conversation scope)**: new conversation, conversation list
  (grouped by recency), current workspace indicator + switcher, quick tool
  actions. Bottom-left: settings gear; above it the current permission mode
  badge (click → settings permission section).
- **Main area**: the conversation itself — message stream, tool-call cards,
  approval cards — and the composer at the bottom.
- **Settings page**: replaces the main area when opened (sidebar stays).

### 2.2 Settings page structure

```
┌──────────┬─────────────────────────────────────────────┐
│ Settings │  <section content>                          │
│  General │                                             │
│  Perms & │                                             │
│   Safety │                                             │
│  Command │                                             │
│  Model   │                                             │
│  MCP     │                                             │
│  Desktop │                                             │
│  Memory  │                                             │
│  Data    │                                             │
└──────────┴─────────────────────────────────────────────┘
```

Settings groups (left nav → right content):

| Group                | Contents (from the existing inventory)                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| General              | Workspace root default, theme (light/system), settings source (project/app)                                |
| Permissions & Safety | Permission tier select + typed confirmation, session leases (issue/list/revoke), approval receipt defaults |
| Command Execution    | Broker defaults (shell kind, timeout, output cap), verification lanes, git read lane                       |
| Model & Proposals    | DeepSeek live proposal opt-in, model profile, evaluation/telemetry summaries                               |
| Capabilities & MCP   | MCP read-only connections, capability policy, plugin/skill hosts                                           |
| Desktop              | Desktop observer metadata, desktop action stubs (clearly marked unsupported)                               |
| Memory & Knowledge   | Project knowledge list/commit/revoke/expire, memory inspector                                              |
| Data & Storage       | Transcript viewer/retention/delete (typed confirmation), event log replay, export                          |

Debug and prototype panels have no settings group: they are hidden in this
UI (see 2.3) and are not part of this round's surface.

### 2.3 Existing inventory → destination map

| Cluster (representative panels)                                        | Destination                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Web table → CSV (payload, Convert, Result, Run Draft)                  | Conversation quick tool `/convert` + tool card               |
| Event Log / Replay, Transcript Viewer                                  | Settings → Data & Storage (viewer stays a full surface)      |
| Command Broker + Replay, Verification Lanes, Git Read                  | Conversation quick tools + Settings → Command Execution      |
| File read lane (v0.36)                                                 | Conversation quick tool `/read` + tool card                  |
| Patch approval / apply / rollback, checkpoints, receipts               | Conversation approval cards; Settings → Permissions & Safety |
| Live DeepSeek proposals (opt-in, builder, evaluation)                  | Conversation tool + Settings → Model & Proposals             |
| MCP read-only, capability hosts, plugin/skill                          | Settings → Capabilities & MCP                                |
| Desktop observer / actions (stubs)                                     | Settings → Desktop (marked "not supported on this platform") |
| Memory, Project Knowledge                                              | Settings → Memory & Knowledge                                |
| Prototypes, E2E wizards, agent replays, control plane, chat/run canvas | Hidden (not rendered in this UI)                             |
| Release/update, migration, backup contracts                            | Hidden (not rendered in this UI)                             |

## 3. Layout Specification

### 3.1 Main window

- Min window 960×640; sidebar 260px (collapses to 64px icon rail under
  1100px; fully hides under 860px with a top-left toggle).
- Message column: max-width 760px centered, 24px side gutters.
- Composer: sticky bottom, rounded-2xl paper card with 1px border and soft
  shadow; auto-growing textarea (≤8 rows), mode badge chip, send button
  (primary), stop button while executing.

### 3.2 Message types

- **User message**: plain text, right-aligned ink-on-paper bubble (subtle).
- **Assistant message**: left, no bubble (open text, tool typography).
- **Tool call card**: frosted card — header (tool icon + name + status
  chip), body (summary fields, hashes, counts), footer (elapsed time,
  transcript/event refs).
- **Approval card**: amber-accent frosted card — what will happen (summary
  only), scope (workspace, paths, hashes), expiry, typed-confirmation input
  with the required phrase as placeholder, Approve/Cancel buttons.
- **Status/error**: inline muted text or red-accent card with reason +
  suggested next action (human language, error code secondary).

### 3.3 Settings page

- Left nav 200px, content max-width 720px; sections as paper cards with
  clear group titles; dangerous zones (delete transcript, revoke lease,
  break-glass) visually separated with a red hairline and extra
  confirmation.

## 4. Visual Theme ("paper & frosted glass")

### 4.1 Color tokens (light default)

| Token       | Value                                                                  | Use                                |
| ----------- | ---------------------------------------------------------------------- | ---------------------------------- |
| `--paper`   | `#F6F4EE`                                                              | app background (paper)             |
| `--surface` | `#FFFFFF`                                                              | cards, message bubbles             |
| `--glass`   | `rgba(255,255,255,0.72)` + `backdrop-filter: blur(12px) saturate(1.1)` | sidebar, sticky composer, popovers |
| `--ink`     | `#26241F`                                                              | primary text                       |
| `--ink-2`   | `#6E6A60`                                                              | secondary text                     |
| `--line`    | `#E4E0D6`                                                              | hairline borders                   |
| `--accent`  | `#3A6EA5`                                                              | primary actions, links, active nav |
| `--ok`      | `#2E7D4F`                                                              | success states                     |
| `--warn`    | `#B07A1E`                                                              | warnings, approval accent          |
| `--danger`  | `#B4453C`                                                              | destructive, errors                |

Dark theme: reserved token slots only, not implemented this round.

### 4.2 Materials and depth

- **Paper texture**: `--paper` base plus a very subtle monochrome noise
  (inline SVG feTurbulence data-URI, opacity ≤ 0.04). No image assets.
- **Frosted glass**: sidebar, composer, cards floating above content —
  `--glass` + 1px `rgba(0,0,0,0.04)` border.
- **Elevation scale**: e0 flat paper → e1 card (`0 1px 2px rgba(31,28,20,.06)`) →
  e2 sticky/popover (`0 8px 24px rgba(31,28,20,.10)`).
- Radius: 6px controls, 12px cards, 16px composer; 1px hairlines everywhere;
  no gradients on text, no glow.

### 4.3 Typography and spacing

- Font: system stack (`system-ui, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`);
  code/paths/hashes in `ui-monospace, Consolas, monospace`.
- Base 14px/1.6; message text 14.5px; section titles 13px semibold
  uppercase tracking .04em in muted ink.
- Spacing scale 4/8/12/16/24/32; density comfortable (default), compact
  reserved for future dense surfaces.

### 4.4 Interaction states

- Hover: background shift ≤4% ink; Active: accent; focus-visible: 2px
  `color-mix(accent 60%, transparent)` outline, never removed.
- Disabled: 50% opacity plus a reason on hover/inline, never silent.
- Motion: 120–180ms ease-out for sidebar/card transitions;
  `prefers-reduced-motion` disables all of it.

## 5. Key Flows (target behavior)

1. **Chat with tools**: user asks in natural language or uses a quick tool
   (`/read`, `/convert`, `/broker`, `/verify`, `/git`). The assistant
   renders tool cards inline; results are summary-only.
2. **Approval in chat**: when a tool hits `requires_approval`, an approval
   card appears inline (receipt + typed confirmation). Approving executes
   through the fixed Tauri lane and appends the result card.
3. **Mode and lease**: permission tier changes in Settings → Permissions &
   Safety (typed confirmation per current rules; full-access needs none by
   design). Broker `full_access` runs prompt for a lease; issuing happens
   from the approval card or the settings lease section.
4. **Workspace switch**: sidebar workspace entry re-resolves settings and
   recent activity for that root.

**Current-truth note (must ship honestly)**: the runtime conversation
engine exists but is not wired to the UI today; v0.37 ships the chat shell
with quick tools and tool cards first (see phasing), and wires the model
conversation loop after.

## 6. Phasing (implementation order, later rounds)

- **P1 — Shell**: sidebar + chat layout + theme tokens; static
  conversation; settings page with all groups. The 98 debug/prototype
  panels are not rendered (hidden); no panel rewrites. Manual QA of every
  reachable feature.
- **P2 — Quick tools + cards**: `/read`, `/convert`, `/broker`, `/verify`,
  `/git` wired to the existing lanes with tool/approval cards.
- **P3 — Conversation engine**: wire the runtime ConversationEngine,
  proposals, and receipts fully into the chat loop.
- **P4 — Polish**: compact density, keyboard map, empty-state art,
  dark theme.

## 7. Functional Test Plan (manual QA, no Playwright per boundary rules)

Automated regression gate stays green: `pnpm lint`, `pnpm typecheck`,
`pnpm test`, `pnpm app:test` (vitest + cargo), boundaries, secrets.

Manual QA script per area (P1 acceptance):

- **Shell**: sidebar collapse/expand; settings entry bottom-left; theme
  consistent at 960–1440px widths; keyboard-only traversal has visible
  focus everywhere.
- **Settings**: each of the 8 groups opens; tier change with/without typed
  confirmation behaves per M2 rules; source switch project/app round-trips;
  lease issue/list/revoke works and survives restart.
- **Hidden panels**: debug/prototype panels are confirmed absent from the
  rendered UI (no dead links, no empty section shells); the fixed lanes
  remain covered by the automated suites above.
- **Security spot-checks**: broker full_access without stored lease is
  rejected; sensitive read requires receipt in approval mode;
  `WORKSPACE_FILE_MODE_MISMATCH` appears when the UI mode and settings
  diverge; transcript delete needs the typed phrase.

Each finding is filed as `symptom → expected → actual → severity` in the
existing manual-QA doc format under `docs/`.
