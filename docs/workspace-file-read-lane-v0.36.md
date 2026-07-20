# Workspace File Read Lane v0.36

## Scope

v0.36 (gap-4 follow-up to `permission-tier-path-sensitivity-v0.36.md`) adds
the first read lane: the fixed Tauri command `read_workspace_file`. It is
the carrier for the `read_auto_approved` tier ("read files without
approval") and the first consumer of the unified path sensitivity grading
and the canonical permission tiers.

## Command

`read_workspace_file(request)` reads one UTF-8 text file inside the
workspace and returns its content with safety rails:

- `workspaceRoot`, `workspaceRootRef`, `relativePath`, `permissionMode`,
  optional `approvalReceipt`.
- Relative paths only: no drive prefixes, no traversal, no control
  characters. The target must resolve inside the canonical workspace root
  and must not be a symlink.
- Hard caps: files above 1 MiB are rejected (`WORKSPACE_FILE_TOO_LARGE`);
  returned content is truncated at 64 KiB with a `truncated` flag.
- Non-UTF-8 targets are rejected (`WORKSPACE_FILE_NOT_TEXT`).

## Tier Gate (server-side, recomputed)

The command derives the gate from the **persisted workspace settings**, not
from the request. The request's `permissionMode` field must match the
effective mode exactly (`WORKSPACE_FILE_MODE_MISMATCH`); authorization
never trusts a client-declared mode. Missing settings default to
`approval_mode` (fail-closed).

| Mode                                                          | Plain file | Sensitive file | Protected (`.git`, `node_modules`) |
| ------------------------------------------------------------- | ---------- | -------------- | ---------------------------------- |
| `read_only_preview` (approval_required tier)                  | receipt    | receipt        | blocked                            |
| `approval_mode` / `autonomous_safe_mode` (read_auto_approved) | auto       | receipt        | blocked                            |
| `advanced_workspace_mode` (guarded_open)                      | auto       | receipt        | blocked                            |
| `full_access_mode` / `break_glass_mode` (unrestricted)        | auto       | auto           | blocked                            |

Unknown modes are rejected (`WORKSPACE_FILE_MODE_REJECTED`).

## Approval Receipt

Reads gated `requires_approval` need a bound receipt
(`WORKSPACE_FILE_RECEIPT_REQUIRED`), following the broker receipt
conventions:

- fixed `source` (`runtime_file_read_approval_receipt`), `summaryOnly`,
  kind `workspace_file_read`, all-false readiness
- typed confirmation `READ WORKSPACE FILE`
- expiry checked server-side
- scope binding: mode, workspace root reference, and relative path must
  match the request; `requestHash` is recomputed server-side
  (`file_read_request_hash`, TS/Rust parity pinned by tests)

## Content Safety

- Auto-approved normal reads fail closed on secret-like content
  (`WORKSPACE_FILE_CONTENT_SECRET`).
- Receipt-covered reads return content verbatim (capped): the receipt is
  the explicit approval for that exact file, and sensitive files usually
  contain markers by nature.
- The result deliberately sets `summaryOnly: false` — this lane returns
  content. Event previews remain summary-only (hashes, counts, gate
  metadata; `workspace_file.read.completed`).

## Out of Scope

- App UI panel for the read lane (UX round).
- Audit event persistence for reads (event previews are not written).
- Migrating legacy lane guards onto the shared grading function.
