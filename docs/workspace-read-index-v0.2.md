# Workspace Read / Index v0.2

Status: P0G-001 skeleton. This is a read-only, virtual workspace index for the
Coding Workflow MVP.

## Scope

Workspace Read / Index v0.2 accepts caller-provided virtual file inputs and
builds deterministic summaries:

- file summaries
- directory summaries
- language and extension summaries
- simple regex-based symbol summaries
- summary-only event payloads
- references for Context Ledger, Agent Dossier, Control Plane, and Capability
  Broker

The module does not crawl the real filesystem by default. It does not read
workspace paths on its own, and it does not write files.

## Path Guard

The path guard accepts workspace-relative POSIX-like paths such as:

- `README.md`
- `docs/file.md`
- `runtime/src/index.ts`
- `app/src/App.tsx`
- `src/main/java/App.java`

It rejects:

- empty paths
- absolute paths
- Windows drive-letter paths
- UNC paths
- parent traversal
- backslash paths
- null bytes or newlines
- `.git`
- `.env` and `.env.*`
- private-key-looking paths
- generated directories such as `node_modules`, `dist`, `target`, `.tmp`,
  `runtime/dist`, `browser-extension/dist`, `app/src-tauri/target`, and
  `conformance/results`
- shell metacharacters
- URL or query-like secret paths
- paths over the configured maximum length

Unsafe paths are represented by warning codes and short fingerprints. The raw
unsafe path is not echoed in event payloads.

## Content Safety

Content is only used in memory to build summaries. The index does not retain
full file content. Files are skipped when content is:

- binary-like
- larger than the configured maximum file size
- contains API-key-like markers
- contains bearer tokens or authorization headers
- contains private key markers
- contains raw prompt, raw DOM, screenshot, or clipboard markers
- contains URL query secret markers

Skipped files still produce safe summaries with warning codes, sizes, hashes,
and paths when paths are safe. Symbol extraction is not run for skipped files.

## Summaries

File summaries include only:

- path
- extension
- language
- byte size
- line count
- hash
- content type
- indexed/skipped status
- warning codes
- symbol count
- summary fingerprint

Symbol summaries include names only. They do not include source lines or raw
code.

## Events

When an `EventStore` is provided, the module writes summary-only events:

- `workspace.index.proposed`
- `workspace.index.built`
- `workspace.index.rejected`
- `workspace.file.summarized`

Payloads may include counts, safe paths, warning codes, language counts, and
hashes. They must not include raw file content, raw source code, raw prompt, raw
DOM, raw CSV, screenshots, clipboard values, API keys, authorization headers,
environment values, or full URL queries.

## Integrations

- Context Ledger: workspace index summaries become `volatile_tail` context
  segments with `source=workspace_file`. They do not enter the frozen prefix by
  default.
- Agent Dossier: agents receive evidence refs and summary strings only.
- Control Plane: the index can be represented as a control ref with counts,
  language summary, warning count, and hash.
- Capability Broker: `native.workspace.index` is a read planning descriptor with
  `A1_read`, `SIMULATE`, `ASK_FIRST`, `supportsDryRun=true`, and
  `canWriteMemory=false`. It is not executable.

## Non-Goals

- No real filesystem crawling by default.
- No `.env` or secret file reads.
- No Git execution.
- No shell execution.
- No patch apply.
- No DeepSeek call.
- No persistent index database.
- No vector database.
- No MCP, plugin, or skills runtime.
- No native bridge.
- No desktop action.
