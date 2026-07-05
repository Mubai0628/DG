# Known Limitations v1 Candidate

This document names what the v1 candidate intentionally does not provide.

## Execution Limits

- No arbitrary desktop automation.
- No mutating MCP tools.
- No arbitrary plugin execution.
- No arbitrary skill runtime.
- No broad native bridge.
- No arbitrary Git/shell.
- No autonomous coding loop.

## Release / Data Limits

- No cloud sync.
- No auto-update.
- No destructive migration.
- No silent data deletion.
- No telemetry upload.

## App Shell Limits

- The App Shell does not call DeepSeek.
- The App Shell does not read API keys.
- The App Shell does not fetch network.
- The App Shell does not run live evaluation.
- The App Shell does not issue PermissionLease.
- The App Shell does not run generic ControlPlaneRun execution.
- The App Shell does not execute broad MCP/plugin/skill capabilities.

## Data Handling Limits

- No raw prompt, source, diff, model response, reasoning content, DOM, CSV,
  screenshot, clipboard content, file dialog content, API key, Authorization
  value, token, or secret is allowed in persisted summaries or release
  artifacts.

## Future Work

Future releases may broaden specific lanes only with explicit policy, approval
receipt, replay, redaction, and manual QA evidence. Disabled lanes are not v1
candidate capabilities.
