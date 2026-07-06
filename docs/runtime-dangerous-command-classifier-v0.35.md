# Runtime Dangerous Command Classifier v0.35

DW-P1N-003 adds a deterministic dangerous command classifier for the future
command broker. It is a runtime-only safety planner and does not execute
commands.

## Scope

The classifier accepts command metadata and returns a summary-only risk report:

- risk level
- detected category list
- blocker and warning counts
- suggested future permission mode
- approval and full-access requirements
- command hash
- deterministic classification hash

The report never includes raw command text, raw output, raw prompt, raw
response, `reasoning_content`, environment values, API keys, tokens, or
Authorization values.

## Categories

The classifier detects:

- destructive delete
- recursive delete
- force delete
- format disk
- permission change
- ownership change
- shell download and execute
- credential exfiltration
- network exfiltration
- package script execution
- Git write
- Git remote push
- Git history rewrite
- process kill
- background daemon
- native bridge attempt
- desktop action attempt
- environment secret access
- system path write
- workspace escape
- unknown high risk shell or privilege marker

## Platform Patterns

Windows examples include `del`, `rmdir`, `Remove-Item`, `Remove-Item
-Recurse`, `rd /s`, `format`, `icacls`, `takeown`, `Start-Process`,
PowerShell download-and-invoke patterns, `Invoke-WebRequest`, `iwr`, `curl`,
and `wget`.

Unix-like examples include `rm`, `rm -rf`, `chmod`, `chown`, `sudo`,
`curl | sh`, `wget | sh`, `kill`, `nohup`, and background `&`.

Git write examples include `git add`, `git commit`, `git push`, `git reset`,
`git clean`, `git checkout`, `git switch`, `git merge`, `git rebase`,
`git stash`, `git tag`, and `git apply`.

## Safety Boundary

- No command execution.
- No process spawn.
- No Tauri command.
- No App execution.
- No workspace write.
- No apply or rollback.
- No EventStore write.
- No Git or shell execution.
- No API key read.
- No fetch/network.
- No native bridge or desktop action.

Every execution readiness flag remains false. A classifier hit only informs
later broker policy and review stages; it never authorizes execution.

## Relation to P1N

P1N-002 defines the command request schema. P1N-003 adds deterministic danger
classification. P1N-004 can consume these summaries to plan a mode-gated
runtime broker decision while still avoiding process execution.
