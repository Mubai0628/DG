# E2E Coding Task Hardening Manual QA

This checklist closes the v0.15 MVP hardening path with manual, summary-only
validation. It exercises the visible surfaces without adding execution paths.
It explicitly covers stale conflict, failure recovery, and raw content absence.

## Pre-check

- Confirm `git status --short` is clean except intentional local QA edits.
- Confirm scoped checks passed for the current task.
- Do not enable App-side live calls, broad Git/shell execution, native bridge,
  desktop action, or autonomous apply.

## Convert

- Start the App Shell with the normal local dev command.
- Use the `web_table_to_csv` Convert flow with a safe fixture payload.
- Verify the generated CSV exists at the selected output path.
- Convert the same filename again and verify the safe `FILE_EXISTS` error.
- Confirm the UI does not display raw CSV, raw DOM, raw source, raw prompt, raw
  response, raw diff, reasoning_content, or API key material.

## Live Proposal Generation

- Open the live proposal surfaces.
- Confirm live proposal generation remains explicit opt-in and proposal-only.
- Confirm the App Shell does not read API keys, call DeepSeek, fetch network,
  or send live requests from the App.
- Confirm generated or pasted candidates enter only repair/schema/import/chain
  previews and never auto-apply.

## Proposal Chain

- Paste a safe structured `model_patch_proposal` draft.
- Confirm the model import preview accepts only summary output.
- Confirm the proposal chain projection shows validation, diff audit, approval
  draft, virtual apply, rollback checkpoint, replay, and user workspace
  readiness as summary-only stages.
- Confirm blocked unsafe path, secret marker, raw content, and execution field
  cases do not enter the preview chain.

## Approved Apply

- Use an approved execution fixture with a valid receipt and typed
  confirmation.
- Confirm Approved Execution is the only App-side user workspace write lane.
- Confirm the App still requires receipt, safe path checks, content checks, and
  private checkpoint metadata.
- Confirm no raw file content appears in events, logs, or replay surfaces.

## Verification Lane

- Run the fixed verification lane through the E2E sequencer.
- Confirm verification uses only fixed allowlist templates.
- Confirm no arbitrary Git command, shell command, install command, network
  command, raw stdout, or raw stderr is exposed.

## Rollback

- Exercise the approved rollback fixture after an approved apply checkpoint.
- Confirm rollback requires the approved checkpoint metadata and current hash
  match.
- Confirm stale or missing checkpoint state blocks with safe summary findings.
- Confirm rollback does not expose arbitrary file writes or raw backup content.

## Replay

- Open Event Log / Replay and the Approved Execution Replay Timeline.
- Confirm the timeline shows proposal, validation, audit, approval, apply,
  checkpoint, verification, rollback, and final task status summary stages.
- Confirm missing events are warnings and duplicate event ids are deduplicated.
- Confirm there is no replay write event button enabled and no timeline
  execution path.

## Stale Conflict

- Use the stale snapshot or conflict fixture.
- Confirm apply is blocked when preimage hash, file size, or checkpoint
  metadata no longer matches.
- Confirm the recovery panel shows safe conflict codes and manual guidance.

## Failure Recovery

- Exercise apply failure, partial checkpoint, rollback failure, and verification
  failure fixtures.
- Confirm Approved Execution Recovery classifies the state without automatic
  retry, automatic rollback, EventStore write, Git/shell execution, native
  bridge, or desktop action.
- Confirm disabled controls remain disabled: retry apply, rollback from
  recovery, write recovery event, replay write event, and execute from timeline.

## Raw Content Absence

- Search visible surfaces after each scenario for raw content absence:
  raw prompt, raw response, raw source, raw diff, raw CSV, raw DOM,
  reasoning_content, API key, Authorization header, token, password marker,
  stdout, and stderr.
- Confirm all summaries use counts, hashes, warning codes, event ids, proposal
  ids, checkpoint ids, and safe status labels only.

## Current Limitations

- No App-side live DeepSeek call.
- No App-side evaluation runner.
- No autonomous coding loop.
- No auto-apply.
- No generic Git/shell execution.
- No native bridge or desktop action.
