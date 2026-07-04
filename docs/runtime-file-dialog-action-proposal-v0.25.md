# Runtime File Dialog Action Proposal Schema v0.25

This document locks the P1D-004 file dialog action proposal schema.

The helper is schema and validation only. It does not open a file dialog, select a file, save a file, select a directory, write the filesystem, call a native bridge, or write EventStore entries.

## Runtime Module

- `runtime/src/desktop/file-dialog-action-proposal.ts`

The module exports:

- `validateFileDialogActionProposal(input)`
- `parseFileDialogActionProposal(input)`
- `summarizeFileDialogActionProposal(proposal)`

Supported proposal kinds:

- `file_dialog_open`
- `file_dialog_save`
- `file_dialog_select_directory`
- `file_dialog_cancel`

Every kind is proposal-only.

## Summary-Only Contract

Allowed input is limited to:

- dialog intent summary
- allowed extension list
- safe relative path reference summary
- safe relative directory reference summary
- expected file count
- risk summary and risk notes

Output summaries include only counts, ids, proposal hash, warning codes, blocker codes, and proposal metadata. Raw file paths are not returned in summaries.

## Fail-Closed Rules

The validator blocks:

- absolute paths
- Windows drive paths
- UNC paths
- parent traversal
- `.env`
- `.git`
- `node_modules`
- `dist`
- `target`
- `.tmp`
- secret-like path markers
- raw path fields
- raw file content fields
- `autoSelect`
- `clickNow`
- `typePathNow`
- `openDialogNow`
- `nativeBridge`
- true execution readiness flags

Secret markers such as fake API keys, `Authorization`, bearer tokens, and private-key markers are blocked without echoing the value.

## Readiness

The only positive readiness fields indicate that the proposal can enter later risk classification or simulation preview.

These readiness flags are always false:

- `canOpenFileDialog`
- `canSelectFile`
- `canSaveFile`
- `canSelectDirectory`
- `canWriteFilesystem`
- `canWriteEventStore`
- `canUseNativeBridge`
- `appCanExecute`

## Non-Goals

- No real file dialog automation
- No native bridge
- No filesystem write
- No apply or rollback
- No EventStore write
- No Git or shell execution
- No App execution
- No desktop action execution
