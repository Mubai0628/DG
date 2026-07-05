# North Star QA Matrix v0.32

This matrix ties the packaging/update/migration QA phase back to the north-star
demo without expanding execution radius.

## North-star Path

1. Convert a web table into CSV.
2. Refresh events and inspect Event Log / Replay.
3. Review Control Plane, Diff, Approval, Audit, Context, and Capability preview
   surfaces.
4. Review Project Knowledge and memory summary surfaces.
5. Review live proposal and evaluation summary-only surfaces.
6. Review desktop observer/action/recovery preview surfaces.
7. Review P1J data inventory, schema registry, migration dry-run,
   backup/restore, release/update policy, artifact hygiene, and path hygiene.

## Acceptance Signals

- Convert baseline works.
- App approved apply/rollback surfaces remain within existing explicit approved
  lanes.
- Git/shell safe lanes remain fixed-template or read-only summary lanes.
- MCP read-only connection/tool surfaces do not mutate.
- Plugin/skill metadata surfaces do not execute plugins or skills.
- Desktop Observer and Desktop Action Proposal surfaces do not broaden native
  bridge scope.
- Approved Desktop Action and Expanded Desktop Action click/type lanes remain
  receipt-gated.
- Desktop recovery remains read-only.
- Cross-surface workflow remains replayable and summary-only where execution is
  not explicitly approved.
- Data inventory / migration dry-run / backup plan remains read-only.

## Packaging QA Signals

- Generated artifacts remain ignored.
- Release smoke matrix states what is automated, manual, and not claimed.
- Known packaging warnings are documented.
- Windows path examples use escaped paths.
- Manual QA and RC checklist paths are present before release.

## Non-goals

- No App-side auto-update.
- No App-side migration execution.
- No App-side backup archive creation.
- No App-side restore or data deletion.
- No new Git/shell execution.
- No new native bridge.
- No new desktop action.
