# App Shell Memory Recall Preview v0.2

Memory Recall Preview is a read-only App Shell surface for showing the memory
refs that a future local run draft may recall. It is a preview-only bridge from
Run Draft toward Context Cart. It does not connect the desktop shell to memory
persistence.

## Scope

- derive a local query summary from the Run Draft intent, objective summary,
  acceptance criteria count, and workspace summary
- display summary-only memory refs for `policy`, `project_fact`, and `pitfall`
- show namespace, type, trust level, score, reason codes, evidence counts, and
  provenance counts
- mark every recalled item as `volatile_tail`
- show warning codes for skipped or unsafe summaries
- keep production App Shell empty unless safe synthetic summaries are provided

## Safety Rules

The preview never displays full memory content, raw prompt text, raw source
code, raw DOM, raw CSV, screenshots, clipboard data, API keys, authorization
headers, environment values, or chain-of-thought. Unsafe summaries are skipped
or withheld and represented by warning codes only.

Policy memory is displayed only when the trust level is one of:

- `explicit_user`
- `approval_record`
- `repository_rule`
- `workspace_rule`

`project_fact` previews require provenance or evidence refs. `pitfall` previews
require a trigger or reason code. `external_untrusted` never becomes policy in
this surface.

## Context Placement

All recall preview items are placed in `volatile_tail`.

They do not enter frozen prefix, workspace rules, task contract, or
no-compress-zone by default. Context Cart may show that memory recall summaries
would be volatile-tail references, but it does not assemble context in this
phase.

## Relations

- **Memory Core** provides the future governed memory model and deterministic
  recall rules.
- **Run Draft** provides local intent and objective summaries for the preview
  query.
- **Context Cart** can show that recalled memory refs would remain volatile.
- **Agent Dossier** may later receive memory refs and summaries only, never raw
  memory content.

## Non-goals

- No persistent DB.
- No vector DB.
- No desktop memory persistence connection.
- No memory commit, revoke, or expire UI.
- No automatic memory write.
- No EventStore write.
- No context assembly.
- No DeepSeek call.
- No agent or capability execution.
