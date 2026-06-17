# Git Safe Lanes v0.2

Git Safe Lanes v0.2 is the Execution Plane skeleton for representing Git
operations safely before any real repository side effect exists. It provides
read-only command planning, deterministic parsers, a fake runner, pathspec
validation, disabled write-intent models, and summary-only events.

This phase does not execute Git. It does not spawn subprocesses, run a shell,
write the repository, apply patches to the filesystem, or create commits.

## Read-Only Lanes

The current read-only command kinds are:

- `status`
- `diff_summary`
- `log_summary`
- `branch_summary`

`planGitSafeCommand` creates an abstract `GitCommandPlan` with fixed argv
tokens. The plan is data only. No executable path is user-provided, no arbitrary
subcommand is accepted, and no shell string is created.

Planned argv examples:

- `["git", "status", "--porcelain=v1", "--branch"]`
- `["git", "diff", "--numstat", "--name-status", "--", ...pathspecs]`
- `["git", "log", "--pretty=format:%H%x09%ct%x09%an%x09%s", "-n", "<limit>"]`
- `["git", "branch", "--format=%(refname:short)"]`

These argv arrays are for future implementation review and fake-runner tests
only.

## Disabled Write Lanes

The following command kinds are represented but disabled:

- `add`
- `commit`
- `push`
- `checkout`
- `merge`
- `rebase`
- `reset`
- `clean`
- `stash`
- `tag`
- `remote`
- `apply_patch`

`GitWriteIntent` records future write intent data, patch proposal refs, audit
report refs, and approval requirement. Its status is always `disabled` in this
phase with the reason `git write lanes are disabled in this phase`.

Future Git writes must go through Patch and Diff Audit first. They must cite a
`PatchProposal`, an audit report, and an explicit approval gate before any later
apply implementation can be considered.

## Pathspec Guard

Git pathspecs must be repository-relative and safe for argv-array usage.

The guard rejects:

- absolute paths
- Windows drive-letter paths
- UNC paths
- parent traversal
- empty pathspecs
- `.git` and control paths
- generated artifacts such as `node_modules`, `dist`, `target`,
  `app/src-tauri/target`, `conformance/results`, `browser-extension/dist`,
  `runtime/dist`, and `.tmp`
- secret-looking paths such as `.env`, `.env.*`, `id_rsa`, and private key
  files
- shell metacharacters
- newline or null bytes
- full URL or query-like paths

It allows ordinary relative paths such as `src/index.ts`, `docs/file.md`, and
safe `**` path glob segments such as `runtime/src/**`.

## Parsers

The deterministic parsers consume fixture output:

- `parseGitStatusPorcelainV1`
- `parseGitDiffNumstatNameStatus`
- `parseGitLogSummary`
- `parseGitBranchSummary`

Malformed lines are skipped with warnings. Parser results are summaries only:
counts, paths, hashes or commit ids, safe branch names, truncated subjects, and
warning codes. They do not include raw diff hunks or source code.

## Fake Runner

`FakeGitRunner` accepts a `GitCommandPlan` and a fixture-output map. It never
uses the filesystem, never starts a subprocess, never opens the network, and
never calls real Git. It returns parsed summaries for tests and dry harnesses.

## Capability Broker Integration

Git Safe Lanes exposes descriptor helpers:

- `native.git.status`
- `native.git.diff_summary`
- `native.git.log_summary`
- `native.git.branch_summary`
- `native.git.commit_draft`

Read descriptors are native Git descriptors with read/simulate semantics.
`native.git.commit_draft` is disabled and not `AUTO`.

## Agent and Context Integration

Git summaries can become:

- Agent evidence refs with ids and safe summaries only
- Context Ledger segments in `volatile_tail`

Git summaries never enter the frozen prefix. They do not grant execution
authority and do not bypass Capability Broker or Patch and Diff Audit.

## Events

When an event store is provided, Git Safe Lanes can emit summary-only events:

- `git.command.planned`
- `git.command.rejected`
- `git.summary.produced`
- `git.write_intent.disabled`

Payloads may include command kind, safe argv tokens, pathspec count, file
counts, changed paths, warning codes, descriptor ids, decision, and hashes.
They must not include raw diffs, raw source code, raw prompts, raw DOM, raw
CSV, screenshots, clipboard data, API keys, authorization headers, environment
variables, or raw command strings with user input.

## Non-Goals

- no real Git subprocess execution
- no `git add`
- no `git commit`
- no `git push`
- no checkout, merge, rebase, reset, clean, or stash
- no repository mutation
- no shell execution
- no filesystem patch apply
- no Git Service
- no coder LLM
- no MCP, plugin, or skills runtime
- no desktop action
