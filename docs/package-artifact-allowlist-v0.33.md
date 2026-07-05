# Package Artifact Allowlist v0.33

This allowlist documents which artifact classes may exist during local build,
test, packaging, and release preparation. It is summary-only and does not
include artifact contents.

| Artifact class           | Path or pattern          | Disposition               | Commit allowed | Release attach allowed  | Required review                         |
| ------------------------ | ------------------------ | ------------------------- | -------------- | ----------------------- | --------------------------------------- |
| App web build output     | `app/dist`               | Ignored build output      | No             | No                      | `pnpm app:build` summary only           |
| Tauri/Rust target output | `app/src-tauri/target`   | Ignored build output      | No             | No                      | Cargo check/build summary only          |
| Runtime package build    | `runtime/dist`           | Ignored package output    | No             | No                      | Runtime build summary only              |
| Browser extension build  | `browser-extension/dist` | Ignored extension output  | No             | No                      | Extension build/test summary only       |
| Conformance output       | `conformance/results`    | Ignored diagnostic output | No             | No                      | Summary counts only                     |
| Temporary output         | `.tmp`                   | Ignored temporary output  | No             | No                      | None unless referenced by release notes |
| Dependency tree          | `node_modules`           | Ignored dependency output | No             | No                      | Lockfile review only                    |
| Coverage output          | `coverage`               | Ignored test output       | No             | No                      | Test summary only                       |
| Release zips             | release zip artifacts    | Release-review only       | No             | Only after RC checklist | Artifact name, checksum, size summary   |
| Logs                     | local logs               | Manual evidence only      | No             | No                      | Redaction review                        |
| Screenshots              | local screenshots        | Manual evidence only      | No             | No                      | Redaction review                        |

## Forbidden Artifact Content

- Raw CSV, DOM, source, diff, prompt, response, screenshot payload, clipboard
  content, file dialog content, API key, Authorization value, token, or secret.
- Installer scripts that auto-update, silently delete data, or mutate outside
  documented app-owned paths.
- Generated conformance artifacts uploaded by default.

## Required Check

Run:

```powershell
pnpm check:artifacts
```

The check is read-only and reports path coverage as JSON to stdout.
