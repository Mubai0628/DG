# Cross-surface Evidence Integration v0.27

This document covers the P1F-005 evidence integration layer for the fixed
cross-surface workflow route. The layer aggregates summary refs from existing
surfaces and prepares them for workflow preview.

## Evidence Kinds

- `project_knowledge`
- `mcp_readonly_metadata`
- `mcp_readonly_tool_summary`
- `plugin_metadata`
- `skill_metadata`
- `desktop_observer_metadata`
- `desktop_action_proposal_summary`

Each evidence item must be a summary ref. It may include a ref id, status,
summary, warning codes, blocker codes, and a hash prefix. It must not include
raw prompt, raw source, raw diff, raw MCP output, raw desktop screenshot, raw
plugin package content, secrets, commands, or execution claims.

## Runtime Summary Helper

`runtime/src/workflows/cross-surface-evidence-summary.ts` aggregates safe
evidence refs into:

- evidence kind counts;
- workflow summary refs for knowledge, MCP, plugin/skill, desktop observer, and
  desktop proposal steps;
- warning and blocker counts;
- stable summary hash;
- readiness flags that keep all execution capabilities false.

The helper does not read project raw memory content, MCP resource content,
plugin packages, screenshots, source files, diffs, prompts, API keys, or
workspace files.

## App Preview

The App Shell exposes a read-only Cross-surface Evidence Summary panel. The
panel accepts pasted summary-only JSON and only updates React state.

The App Shell does not:

- read raw MCP resource content;
- call MCP tools;
- execute plugin or skill runtimes;
- trigger desktop observer commands;
- execute desktop actions;
- call DeepSeek;
- write EventStore events;
- apply patches or rollback;
- execute Git or shell commands;
- issue PermissionLease records.

## Fail-closed Rules

Evidence refs are blocked if they contain:

- raw prompt, source, diff, response, screenshot, OCR, or package content;
- raw MCP output or resource content;
- API key, Authorization, Bearer, token, private key, or secret markers;
- command, shell, Git, Tauri, EventStore, apply, rollback, PermissionLease, or
  native bridge fields;
- readiness flags that claim execution.

Blocked evidence refs do not attach to the workflow preview.

## Relation to P1F

P1F-002 defines the scenario schema. P1F-003 defines the planner. P1F-004 adds
the App workflow preview surface. P1F-005 adds the evidence aggregation layer
that can feed later approved action sequencing, replay, audit, and smoke QA
without expanding App execution.
