# Patch and Diff Audit v0.2

Patch and Diff Audit v0.2 is the Execution Plane foundation for representing
future file writes safely before any real side effect occurs. It is deliberately
limited to in-memory patch proposals, deterministic diff summaries, virtual
apply simulation, and rollback checkpoints.

This is not a workspace patch service. It does not write real files, invoke
Git, run commands, call a coder model, or control the desktop.

## Proposal-First Write Model

Every future file write must be expressible as:

1. propose a `PatchProposal`
2. validate paths and content
3. generate a `DiffSummary`
4. generate a summary-only `DiffAuditReport`
5. simulate the patch in a `VirtualWorkspaceSnapshot`
6. create a `RollbackCheckpoint`
7. await explicit approve or reject
8. apply later through a separate, gated implementation

P0F-006 stops before the final apply step. Real filesystem apply remains out of
scope.

## Patch Proposal

`PatchProposal` records task id, optional agent id, source, title, description,
risk level, approval requirement, file changes, validation result, diff summary,
audit report, and a stable hash.

`PatchFileChange` can represent:

- `create`
- `update`
- `delete`
- `rename`

The foundation fully supports create, update, and delete in the virtual
workspace. Rename is modelled but rejected for simulation until a later task
defines exact rename semantics.

Patch proposals may hold before and after content in memory because the
proposal itself is the audit object. Summary reports and events must not expose
that raw content.

## Path Validation

Patch paths are virtual workspace-relative paths. The path guard rejects:

- absolute paths
- Windows drive-letter paths
- UNC paths
- parent traversal
- empty paths
- hidden control paths unless explicitly allowed
- `.env` and secret-looking files
- generated artifacts such as `node_modules`, `dist`, `target`, `.git`,
  `.tmp`, `conformance/results`, and `app/src-tauri/target`
- executable script paths by default

The guard does not call `realpath` or inspect the real filesystem.

## Content Validation

Content validation rejects:

- binary markers in text content
- oversized files or oversized patch proposals
- API key-like values
- bearer tokens and authorization headers
- private key markers
- raw DOM, raw prompt, raw screenshot, clipboard, and CSV-content markers
- full URL query secret markers
- patch reasons that propose direct command execution

The validator is deterministic and offline.

## Diff Summary

The diff generator is a small deterministic line diff. It supports Unicode,
newline normalization, and summary counts:

- files changed
- files created, updated, deleted
- lines added and removed
- largest file size
- risk warning codes

Diff hunks can exist inside the proposal object, but summary events and agent
evidence refs use counts, paths, and hashes only.

## Virtual Apply and Rollback

`VirtualWorkspaceSnapshot` is an in-memory map of virtual files. Applying a
proposal to it:

- never writes real files
- requires `beforeHash` to match for update and delete when supplied
- rejects create when the file already exists
- rejects update or delete when the file is missing
- produces a `RollbackCheckpoint` with enough in-memory state to restore the
  previous virtual snapshot

Rollback simulation restores the virtual snapshot and emits only summary
information when an event store is present.

## Audit Report

`DiffAuditReport` contains:

- decision: valid, invalid, or needs approval
- reasons and warning codes
- risk level
- path and content warning summaries
- before and after hash maps
- changed file summaries
- approval requirement
- no-compress zone refs
- suggested next action

It must not contain full before or after content, raw source code, raw prompt,
raw DOM, raw CSV, screenshots, clipboard data, API keys, authorization headers,
or environment variables.

## Control Plane Integration

Capability Broker:

- `native.patch.apply` is represented as a future descriptor.
- It is disabled in this task.
- It is not `AUTO`.
- No real apply path is registered.

Agent Dossier:

- patch proposals and audits can be converted to evidence refs.
- refs contain ids, counts, decisions, and risk summaries.
- refs do not contain raw code.

Context Ledger:

- patch audits can become `no_compress_zone` context segments.
- the segment contains a compact safety summary and hash, not raw code.
- it supports the existing rule that approvals, diffs, tool args, and safety
  judgements are never compressed.

## Events

When an event store is provided, patch foundation can emit summary-only events:

- `patch.proposed`
- `patch.validated`
- `patch.simulated`
- `patch.rejected`
- `rollback.checkpoint.created`
- `rollback.simulated`

Payloads include proposal ids, task ids, agent ids, operation counts, paths,
hashes, risk level, decision, warnings, and reasons. They must not include raw
patch bodies, before or after content, raw source code, raw prompts, raw DOM,
raw CSV, screenshots, clipboard data, API keys, authorization headers, or
environment variables.

## Non-Goals

- no real patch apply to the workspace
- no Git Service
- no shell execution
- no coder LLM
- no MCP, plugin, or skills runtime
- no desktop action
- no nativeMessaging or bridge transport
- no persistent database
- no vector database
