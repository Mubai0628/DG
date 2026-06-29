# App Approved Execution Threat Model v0.10

Status: P0O design artifact. This document does not enable apply or rollback.

## Assets

- User workspace files and directories.
- Approved patch proposal summaries.
- Validation, diff/audit, approval draft, and approval receipt summaries.
- Allowed relative path lists and denied path policies.
- Checkpoint metadata and local preimage storage.
- Summary-only apply and rollback events.
- Event Log / Replay projections.
- Typed confirmation state.
- Secret paths, environment files, credentials, private keys, and tokens.

## Trust Boundaries

- App Shell UI to approval receipt builder.
- App Shell UI to Tauri command wrapper.
- Tauri command boundary to user workspace filesystem mutation.
- Proposal summary to operations boundary.
- Approval receipt to apply/rollback command boundary.
- Checkpoint storage to rollback command boundary.
- Tauri command result to EventStore summary event boundary.
- EventStore summary events to replay projection boundary.

## Attacker-Controlled Inputs

Attackers may influence proposal summaries, operation paths, operation content,
validation summaries, audit summaries, approval summaries, receipt fields,
typed confirmation text, workspace root strings, checkpoint refs, event preview
payloads, warning codes, hashes, and file names.

All inputs must be treated as untrusted until validated by the narrow gate that
uses them.

## Malicious Proposal Risks

A proposal can request unsafe paths, unsafe content, high-risk operations,
stale validation refs, or mismatched audit summaries.

Mitigations:

- require proposal, validation, audit, and approval ids to match
- require validation and audit to be non-blocked
- limit operations to approved relative paths
- scan content for secret and raw-data markers
- fail closed on mismatch or missing evidence

## Stale Snapshot Risks

Files may change after validation or approval but before apply. A stale
snapshot can cause accidental overwrite or rollback mismatch.

Mitigations:

- require expected-before hashes when provided
- verify expected existence before write
- create checkpoint before update/delete
- block on hash mismatch
- include snapshot/checkpoint refs in summary events

## Path Traversal Risks

Path traversal can escape the workspace through `..`, absolute paths, Windows
drive paths, UNC paths, mixed separators, nulls, newlines, shell metacharacters,
URL-like paths, query-like paths, reserved names, and alternate data streams.

Mitigations:

- accept relative paths only
- canonicalize workspace root and targets
- reject ambiguous path syntax
- block `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`, generated
  artifacts, and secret-like paths
- verify final target remains inside the workspace root

## Symlink / Junction / Reparse Point Risks

Symlinks, junctions, and reparse points can redirect writes or rollback outside
the approved workspace.

Mitigations:

- reject symlink, junction, and reparse traversal
- inspect parent directories before mutation
- fail closed if metadata cannot be inspected
- never follow a reparse target for apply or rollback

## Generated / Dependency Path Mutation Risks

Mutating dependencies, build outputs, generated artifacts, or temporary
directories can hide malicious changes or break reproducibility.

Mitigations:

- deny dependency and generated paths by default
- require a future explicit exception gate for generated artifacts
- keep v0.11 docs-only smoke paths simple and safe

## Secret Path Mutation Risks

Writing to `.env`, private key files, credential paths, or token-like files can
destroy or expose secrets.

Mitigations:

- deny secret-like path names
- deny `.env` and private key patterns
- scan content for API key, Bearer, Authorization, and private key markers
- never include raw secret-like values in findings or events

## Raw Preimage Leakage Risks

Rollback requires local preimage storage, but raw preimage can leak through UI,
events, logs, release notes, or tests.

Mitigations:

- store raw preimage only in the local private checkpoint file
- expose only preimage hashes, byte counts, paths, and checkpoint ids
- keep event payloads summary-only
- keep replay summaries summary-only

## Event Tampering / Replay Mismatch Risks

Events can be incomplete, tampered, or mismatched with checkpoint state. Replay
could show an apply or rollback as safe when it was not.

Mitigations:

- include ids, hashes, counts, and warning codes in summary events
- validate event schemas
- keep event type allowlists
- test replay for apply, rollback, blocked, and conflict states

## Approval Bypass Risks

Attackers may fake receipts, reuse expired receipts, change receipt scope, or
skip typed confirmation.

Mitigations:

- require exact typed confirmation
- require receipt hash
- require expiry checks
- bind receipt to proposal, validation, audit, approval draft, checkpoint, and
  allowed paths
- block if any scope field mismatches command input

## Rollback Failure Risks

Rollback can fail if checkpoint content is missing, target hashes changed,
created files already existed, deleted files cannot be restored, or paths now
resolve differently.

Mitigations:

- verify checkpoint hash and workspace root ref
- verify current applied hashes when available
- restore only covered paths
- no recursive delete
- no directory delete
- fail closed on missing or ambiguous checkpoint data

## Interrupted Apply Risks

The process may stop after partial writes and before summary event write.

Mitigations:

- checkpoint before mutation
- return interrupted/partial summary if detectable
- keep rollback available from checkpoint
- make replay show missing event or partial result warnings

## Windows Path Risks

Windows-specific issues include drive roots, profile roots, system roots, UNC
paths, reparse points, junctions, case-insensitive collisions, reserved device
names, alternate data streams, and CRLF changes.

Mitigations:

- reject unsafe workspace roots
- canonicalize roots and targets
- reject alternate data streams
- reject reserved or ambiguous names
- include deterministic line ending metadata where relevant

## Out-of-Scope Risks

- Git commit or push.
- Shell execution.
- Autonomous DeepSeek coding loops.
- MCP/plugin/skills runtime execution.
- Broad PermissionLease issuance.
- Native bridge.
- Desktop action.
