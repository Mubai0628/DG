# App Command Broker Replay Events v0.35

## Scope

P1N-007 adds a summary-only command broker event projection for App replay and
redaction surfaces. It covers command broker command lifecycle summaries:

- `command_broker.command.planned`
- `command_broker.command.executed`
- `command_broker.command.blocked`
- `command_broker.command.cancelled`

The projection is for inspection only. It does not create a new command
execution path and does not write EventStore entries from the App Shell.
No EventStore write is performed by this replay surface.

## Summary Event Payload

Command broker replay events may contain only safe summary fields:

- request id
- command hash
- shell kind
- permission mode
- workspace root ref
- classifier categories
- exit code
- duration
- transcript ref
- stdout and stderr byte counts
- redacted stdout and stderr line counts
- blocker and warning codes
- redaction audit status

The event payload must not contain raw stdout, raw stderr, raw command text,
raw prompt, raw response, workspace source, API keys, environment values,
authorization headers, or token-like content.

## Replay Projection

The replay projection reports:

- planned command count
- executed command count
- blocked command count
- failed command count
- cancelled command count
- latest command summary
- transcript ref count
- redaction status

Replay is summary-only and cannot re-execute commands. A successful projection
does not enable apply, rollback, Git write, shell execution, EventStore write,
native bridge, or desktop action.

## Redaction Audit

The command broker redaction audit blocks raw event attempts. It checks that:

- raw stdout and raw stderr are absent from events
- command text is absent or hash-only
- secret markers, bearer tokens, and authorization markers are absent
- transcript raw availability can be referenced only by safe summary flags
- environment values are absent

Findings are reported as warning or blocker codes. The audit output is
summary-only and must not include the rejected raw content.

## App Surface

The App Shell shows:

- a `Command Broker Replay / Redaction` panel
- command broker event counts in Event Log / Replay
- latest command broker summary in Event Log / Replay
- redaction status and raw-output absence indicators

The App Shell does not add an EventStore writer for these command broker events.
The existing fixed `execute_command_broker_request` Tauri command remains the
only App command broker execution entry point.

## Non-goals

- no generic shell runner
- no raw output display
- no command replay execution
- no EventStore write from the App Shell
- no apply or rollback
- no Git commit or push
- no native bridge
- no desktop action
