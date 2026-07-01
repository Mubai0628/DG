# App / Tauri Project Knowledge Store v0.15

P0T-003 adds fixed Tauri commands for workspace-local project knowledge
persistence. This is the first production memory persistence path, but it is
strictly summary-only and limited to project knowledge records.

## Commands

The App wrapper exposes only fixed commands:

- `project_knowledge_list`
- `project_knowledge_commit_candidate`
- `project_knowledge_revoke`
- `project_knowledge_expire`

There is no generic filesystem writer, no generic EventStore writer, and no
generic invoke path for project knowledge.

- No generic filesystem writer.
- No generic EventStore writer.

## Storage

Project knowledge is stored under the selected workspace only:

```text
<workspace>/.deepseek-workbench/project-knowledge/
```

Files:

```text
entries.jsonl
events.jsonl
index.json
```

`entries.jsonl` and `events.jsonl` are append-only. `index.json` is a derived
summary index. Revoke and expire append lifecycle events; they do not delete
historical entry records.

## Command Behavior

`project_knowledge_list` reads the store and returns a summary-only snapshot. A
missing store returns an empty snapshot. Corrupt JSONL lines are skipped with
safe warnings.

`project_knowledge_commit_candidate` validates the candidate, appends a
summary-only entry record, appends a summary-only lifecycle event, updates the
index, and returns a safe summary.

`project_knowledge_revoke` requires the typed confirmation:

```text
REVOKE PROJECT KNOWLEDGE
```

`project_knowledge_expire` requires an entry id and reason summary.

## Safety

The commands block:

- unsafe workspace roots.
- traversal or symlink/reparse escape from the project knowledge store path.
- forbidden raw fields.
- API key, Authorization, Bearer, token, secret, and env markers.
- oversized summaries.
- policy entries from model, tool, or external unreviewed sources.
- tool/model direct policy commit.

All returned data is summary-only. Raw prompt, raw source, raw diff, raw
response, reasoning_content, stdout, stderr, file contents, API keys, and
Authorization values are not returned.

## Boundaries

- No App-side apply.
- No App-side rollback.
- No App approval/rejection execution.
- No PermissionLease issuance.
- No Git/shell execution.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No native bridge.
- No desktop action.

The path writes only the fixed project knowledge files above. It does not write
the main `.deepseek-workbench/events.jsonl` EventStore log.

## Relation to P0T

P0T-002 defines the runtime schema and logical store contract. P0T-003 adds the
fixed Tauri persistence commands. P0T-004 will add the human-reviewed App
surface for reviewing, committing, revoking, and expiring project knowledge.
