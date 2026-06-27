# User Workspace Apply Promotion Threat Model v0.6

Status: P0K design artifact. This document does not enable user workspace
apply.

## Assets

- User workspace files and directories.
- User workspace snapshot hashes and fingerprints.
- Disposable apply result summaries.
- Backup and preimage contracts.
- Rollback checkpoint summaries.
- EventStore summary event plans and replay projections.
- Approval draft and approval receipt summaries.
- App Shell disabled-only state.
- Secret paths, private keys, environment files, credentials, and tokens.

## Trust Boundaries

- App Shell UI to runtime helper boundary.
- Runtime summary model to future filesystem mutation boundary.
- Disposable workspace result to user workspace promotion boundary.
- User workspace snapshot to backup/preimage boundary.
- Approval evidence to mutation gate boundary.
- Event projection to future EventStore writer boundary.
- User-controlled input to path guard boundary.

## Attacker-Controlled Inputs

Attackers may control or influence:

- requested relative paths
- denied path bypass attempts
- disposable apply result summaries
- approval receipt summaries
- snapshot metadata
- backup/preimage metadata
- event preview payloads
- warning codes
- hash prefixes
- file extensions and language labels
- line ending metadata

Future implementations must treat all of these as untrusted until validated.

## Path Traversal Risks

Promotion can be abused if a path escapes the intended user workspace root.
Risks include `..` traversal, absolute paths, Windows drive-letter paths, UNC
paths, mixed separators, null bytes, newlines, shell metacharacters, URL-like
paths, query-like paths, reserved names, and case aliases.

Mitigations:

- require normalized relative paths
- canonicalize target paths before mutation in future implementation
- reject traversal and path-like ambiguity
- enforce allowed and denied relative path lists
- block `.git`, `.env`, dependency, generated, build, and temporary paths

## Symlink / Junction / Reparse Point Risks

Windows junctions and reparse points can redirect a safe-looking relative path
outside the workspace. Symlinks can also make rollback restore content to the
wrong target.

Mitigations:

- no symlink following
- deny symlink, junction, and reparse point targets by default
- verify every parent path before future mutation
- fail closed on ambiguous metadata

## Secret Leakage Risks

Promotion must not expose or mutate secret files. Event and replay payloads must
not carry raw source, raw diff, preimage content, API keys, Authorization
headers, environment values, private keys, or raw prompts.

Mitigations:

- secret-like path denylist
- secret marker scanning
- summary-only event payloads
- no raw preimage output
- no raw diff output
- no `.env` mutation

## Stale Snapshot Risks

A disposable apply result can become stale relative to the user workspace. User
files may change after snapshot and before future promotion.

Mitigations:

- expected user snapshot hash
- source workspace fingerprint
- immediate pre-promotion hash check in future implementation
- block on mismatch
- require replay to show snapshot age and state

## Backup / Preimage Leakage Risks

Rollback requires preimage capture in a future implementation, but preimage
content is sensitive. Leaking it through events, logs, UI, or tests would expose
raw user workspace content.

Mitigations:

- metadata-only preview first
- preimage hash and byte counts in summaries
- no raw preimage in events
- no raw preimage in App UI
- redact or block secret-like preimages

## Generated Artifact / Dependency Directory Risks

Mutating generated artifacts, dependencies, build outputs, or target
directories can create noisy diffs, break reproducibility, and hide malicious
changes.

Mitigations:

- deny `node_modules`, `dist`, `target`, `.tmp`, generated outputs, and package
  manager artifacts by default
- require an explicit later gate for any generated artifact exception

## Rollback Mismatch Risks

Rollback may fail if before hashes do not match, preimage content is missing,
created files already existed, deleted files cannot be recreated, or a path
points somewhere else after mutation.

Mitigations:

- require rollback proof before promotion
- verify created, updated, and deleted path coverage
- require preimage hashes and restore scope
- block if rollback cannot cover every operation
- do not rely on Git only

## Event / Replay Tampering Risks

Incorrect or tampered event summaries can make unsafe promotion look safe.
Replay might skip blockers or reconstruct the wrong state.

Mitigations:

- summary event hashes
- chain identity
- schema versions
- strict event type allowlist
- replay tests for blocked, approved, applied, rollback, and interrupted states
- no raw content in event payloads

## Approval Bypass Risks

An attacker may attempt to fake approval, reuse stale approval, or widen the
scope beyond what was approved.

Mitigations:

- approval scope must include workspace fingerprint, snapshot hash, proposal
  refs, allowed paths, max files, and max bytes
- approval must expire
- approval must not be production PermissionLease in P0K design
- block if scope mismatches any promotion input

## Race / Interruption Risks

Future mutation can be interrupted after partial writes. External processes can
modify files between snapshot and apply. Power loss or process crashes can
leave mixed states.

Mitigations:

- preflight snapshot check immediately before mutation
- rollback checkpoint before mutation
- event plan for proposed, executed, interrupted, result, and rollback states
- idempotent replay projection

## Windows-Specific Risks

Windows-specific risks include drive letters, UNC paths, 8.3 aliases, reserved
device names, reparse points, junctions, case-insensitive collisions, alternate
data streams, mixed separators, and CRLF changes.

Mitigations:

- explicit Windows path validation
- no reparse traversal
- no alternate data stream paths
- deterministic line ending policy
- case-normalized duplicate detection

## Out-of-Scope Risks

- Git commit or push.
- Shell execution.
- DeepSeek autonomous coding loops.
- MCP/plugin/skills runtime execution.
- Native bridge and desktop action execution.
- Production PermissionLease issuing.
- Broad capability invocation.
