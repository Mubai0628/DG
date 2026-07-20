# Permission Tier Path Sensitivity v0.36

## Scope

v0.36 (gap-3 follow-up to `app-command-broker-server-authorization-v0.36.md`)
adds the two missing pieces the permission tier ladder needs before a
read-file lane can exist:

1. `file_read` and `sensitive_file_read` capability kinds.
2. A unified path sensitivity grading function, mirrored in TypeScript and
   Rust, replacing the four lane-specific secret-path deny lists as the
   single grading vocabulary.

No new lane is introduced here; this is the classification substrate only.

## Unified Path Sensitivity Grading

`runtime/src/execution/permission-modes/path-sensitivity.ts` and
`app/src-tauri/src/path_sensitivity.rs` implement the same segment-based,
case-insensitive, separator-agnostic grading:

| Grade       | Rule (any path segment, case-insensitive)                                                                                                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protected` | `.git`, `node_modules` — never agent-accessible in any tier; reads are always `blocked`.                                                                                                                                                                  |
| `sensitive` | `.ssh`, `.env`/`.env.*`, `id_rsa`/`id_dsa`/`id_ecdsa`/`id_ed25519` (+dot variants), `*.pem`/`*.key`/`*.p12`/`*.pfx`, or any segment containing `secret`, `token`, `password`, `credential`, `apikey`, `api-key`, `api_key`, `private-key`, `private_key`. |
| `normal`    | Everything else.                                                                                                                                                                                                                                          |

The grade maps onto tier operation classes: `normal` → `file_read`,
`sensitive` → `sensitive_file_read`, `protected` → blocked in every tier
(including unrestricted). `pathReadGate(tier, path)` composes the grade
with `TIER_OPERATION_MATRIX`.

Grading is not traversal validation; callers keep their own containment
checks. False positives in the secret-like substring set (e.g. `tokenizer`)
are fail-closed by design: they route to approval, never to silent allow.

## Capability Model Additions

- `ExecutionCapabilityKind` gains `file_read` (read-only group) and
  `sensitive_file_read` (approval-required group, medium risk).
- `PermissionCapabilityFlag` gains `canReadSensitiveFile` (default `false`
  in every mode; tiers govern sensitive reads through the matrix).
- In `approval_mode` the policy engine now reports `file_read` as `allowed`
  and `sensitive_file_read` as `requires_approval`, matching the
  `read_auto_approved` tier semantics.

## Approved-Apply Hardening

The Rust approved-apply relative-path validation now consumes the shared
sensitive segment set (`segment_is_sensitive`), closing the previously
documented gap where `.ssh`, `id_rsa`/`id_ed25519`, `*.pem`/`*.key` and
`private-key` segments were not rejected on the apply lane. The
write-specific generated-directory list (`dist`, `target`, `.tmp`, …) is
unchanged.

## Out of Scope

- The read-file lane itself (gap-4).
- Migrating the four legacy lane guards onto the shared grading function;
  their rejection behavior is preserved as-is.
- Settings persistence and the real session lease lifecycle.
