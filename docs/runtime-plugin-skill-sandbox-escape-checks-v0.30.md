# Runtime Plugin / Skill Sandbox Escape Checks v0.30

`runtime/src/capabilities/plugin-skill-sandbox-escape-checks.ts` inspects
plugin and skill metadata summaries for sandbox escape signals. It is a
summary-only runtime helper and does not execute plugin code or skill runtime.

## Scope

- Runtime helper only.
- Metadata and safe simulation boundary checks only.
- No package installation.
- No plugin code execution.
- No skill runtime execution.
- No live external capability invocation.
- No filesystem write.
- No network access.
- No process execution.
- No native bridge.
- No desktop action.
- No raw package content in output.

## Blocked Signals

The helper blocks lifecycle scripts, `postinstall`, `preinstall`, native
modules, binary payloads, shell scripts, network permissions, filesystem write
permissions, process execution permissions, dynamic import markers, `eval`
markers, native bridge markers, desktop action markers, secret access markers,
clipboard write markers, file dialog automation markers, mutating capability
claims, broad permission claims, raw package content, API key markers,
Authorization/Bearer markers, secret markers, and readiness flags that claim
execution.

It also blocks upstream metadata scans or sandbox contracts that are already
blocked.

## Output

The output is summary-only:

- `safe_metadata | warning | blocked`
- package, plugin, and skill counts
- descriptor refs
- package hash
- risk counts
- blocked signal codes
- safe package ref hashes
- finding counts
- readiness flags that keep execution disabled

The helper never returns raw package contents, lifecycle scripts, shell
commands, native payloads, API keys, Authorization headers, Bearer tokens, or
secret values.

## Relation to P1H

This is the runtime implementation for `DW-P1H-004`. It narrows plugin and
skill handling to metadata-only review and feeds later replay completeness,
redaction audit, and App read-only audit surfaces without enabling plugin
runtime, skill runtime, native bridge, or desktop action execution.
