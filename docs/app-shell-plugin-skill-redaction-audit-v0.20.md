# App Shell Plugin / Skill Redaction Audit v0.20

The App Shell Plugin / Skill Redaction Audit is a read-only surface for checking
P0Y plugin and skill host summaries.

The panel title is:

```text
Plugin / Skill Redaction Audit
```

The badge is:

```text
Summary only / no raw metadata
```

The App can audit the current Plugin / Skill Host summary or a pasted
summary-only JSON object. It does not accept raw plugin package content, raw
skill prompt templates, raw args, raw output, raw source, raw diff, API keys,
Authorization headers, bearer tokens, install scripts, shell commands, native
bridge requests, desktop action requests, or execution readiness.

The App displays:

- audit status
- source counts
- metadata counts
- redacted and raw field counts
- secret/raw/prompt/args/output/install/execution leak booleans
- risk summary
- finding counts
- safe finding codes
- hash prefix
- readiness flags with execution disabled

The disabled controls are intentionally visible:

- `Run Plugin / Skill Audit (disabled)`
- `Write Plugin / Skill Audit Event (disabled)`

Clicking `Preview Plugin / Skill Audit` only updates React state. It does not
invoke Tauri, write EventStore, fetch network, install packages, run plugins,
run skills, invoke capabilities, issue leases, execute Git, execute shell, use
native bridge, or perform desktop action.

Non-goals:

- no plugin execution
- no arbitrary skill runtime execution
- no package installation
- no App execution
- no EventStore write
- no Git or shell execution
- no native bridge
- no desktop action
