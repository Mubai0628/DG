# Permission Lease Lifecycle + Transcript Delete Confirmation v0.36

## Scope

v0.36 closes two hardening gaps:

1. **Gap 6**: `delete_transcript_record` previously deleted transcript files
   with no confirmation at all.
2. **Gap 7**: the permission session lease was preview-only metadata — a
   free-text reference that proved nothing (the command broker's
   `full_access` mode accepted any non-empty string).

## Transcript Delete Confirmation (gap 6)

`delete_transcript_record` now requires the typed confirmation phrase
`DELETE TRANSCRIPT RECORD` (`TRANSCRIPT_DELETE_CONFIRMATION_REQUIRED`).
The desktop wrapper validates it before invoking; the App transcript panel
gains a delete confirmation input, and the Delete button stays disabled
until the phrase matches. Deletion remains scoped to the derived transcript
file inside the transcript store with symlink rejection.

## Permission Lease Lifecycle (gap 7)

Leases are now real, stored, time-limited, workspace-scoped records —
matching the P1L roadmap requirement for full access to be
"session-scoped, time-limited, workspace-scoped, visible, revocable".

### Storage

`<workspace>/.deepseek-workbench/leases/<leaseId>.json`, one record per
lease: schema version, lease id, mode, workspace root reference, scope and
reason summaries, `issuedAtEpochMs` / `expiresAtEpochMs`, typed
confirmation, revocation fields, and a lease hash. Records are validated
fail-closed on read (size cap, UTF-8 JSON object, allow-listed fields,
supported mode, matching typed confirmation, no secret markers).

### Commands

- `issue_permission_lease` — issues a lease for `advanced_workspace_mode`
  or `full_access_mode` only. Requires the mode's typed confirmation
  (`ENABLE ADVANCED WORKSPACE MODE` / `ENABLE FULL ACCESS FOR THIS
WORKSPACE`, the same phrases the runtime lease model uses), a bounded TTL
  (1 minute – 24 hours), and safe metadata. Expiry uses the real clock.
- `list_permission_leases` — summarizes all leases with computed status
  (`active` / `expired` / `revoked`); corrupt records are skipped with a
  `PERMISSION_LEASE_RECORD_SKIPPED` warning.
- `revoke_permission_lease` — revokes a lease. Revocation is a safety
  operation and intentionally has no confirmation barrier; it requires only
  a non-empty reason. Revoking an already-revoked lease is idempotent
  (`already_revoked`).

### Broker Consumption

`full_access` command broker execution now requires a stored, active,
full-access lease whose id is the request's session lease reference:

- unknown id / free-text reference → `COMMAND_BROKER_LEASE_REJECTED`
- lease for another mode → `COMMAND_BROKER_LEASE_MODE_MISMATCH`
- revoked lease → `COMMAND_BROKER_LEASE_REVOKED`
- expired lease (real clock) → `COMMAND_BROKER_LEASE_EXPIRED`

`advanced_workspace` broker execution still requires the bound approval
receipt only; lease consumption for other lanes is future work.

### App Surface

The command broker panel gains a lease confirmation input plus Issue and
Revoke buttons. Issue is enabled only for `advanced_workspace` /
`full_access` broker modes, maps them to the product lease modes, uses a
fixed 30-minute TTL, and fills the session lease reference with the new
lease id on success.

## Out of Scope

- Lease consumption for lanes other than broker `full_access`.
- Lease renewal and lease-scoped risk budgets.
- Lease storage encryption; records contain no secrets by construction
  (validated against secret markers on write and read).
