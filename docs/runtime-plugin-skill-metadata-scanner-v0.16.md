# Runtime Plugin / Skill Metadata Scanner v0.16

## Summary

`runtime/src/capabilities/plugin-skill-metadata-scanner.ts` scans explicit
plugin and skill package metadata summaries. It is metadata-only and does not
install packages, load plugin code, import modules, evaluate code, run skills,
or crawl arbitrary filesystem paths.

Allowed inputs:

- metadata object.
- JSON string.
- explicit file summary list.

Rejected inputs and fields:

- package archives.
- executable code.
- install scripts.
- arbitrary path scans.
- command, shell, git, native, desktop, script, code, or eval fields.
- raw prompt, raw source, raw diff, raw response.
- secrets, Authorization, tokens, passwords, env values.

## Validation

The scanner blocks:

- `installScript`, `postinstall`, and `preinstall`.
- `script`, `code`, and `eval`.
- command/shell/git/native/desktop execution fields.
- dependency refs with URL query secrets.
- executable file paths.
- path traversal.
- `.env` and `.git` paths.
- secret markers.
- raw prompt/source/diff/response fields.
- `AUTO` external invocation policy.

The scanner warns:

- missing publisher.
- unpinned or floating version.
- broad dependency range.
- high-risk declared capability.
- network/filesystem/desktop metadata requests.
- unknown package source.

## Output

The scan result is summary-only:

- plugin package count.
- skill bundle count.
- declared capability count.
- risk summary.
- blocker and warning counts.
- descriptor refs.
- plugin summaries.
- skill summaries.
- declared capability summaries.
- scan hash.
- readiness flags.

All execution readiness flags remain false:

- `canInstallPackage`
- `canExecutePlugin`
- `canExecuteSkill`
- `canInvokeCapability`
- `appCanExecute`

`canRegisterMetadata` only means the safe metadata can enter descriptor preview.
It does not mean package install or runtime execution is enabled.

## Non-goals

- No package install.
- No import/eval.
- No plugin execution.
- No skill runtime execution.
- No filesystem crawling beyond explicit test fixture metadata.
- No MCP/tool execution.
- No Tauri command.
- No EventStore write.
- No Git/shell.
- No native bridge.
- No desktop action.

## Relation to P0U

This is P0U-004. It complements the external capability manifest schema and MCP
read-only discovery with metadata-only package scanning. Later broker/App
surfaces must consume only the safe summaries and preserve the no-execution
boundary.
