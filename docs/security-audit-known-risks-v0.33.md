# Security Audit Known Risks v0.33

This register captures known v1 candidate risks and their current disposition.
It is not a new capability surface.

| Risk                            | Area                   | Current disposition                                                   | Mitigation                                                       | Release blocker                                              |
| ------------------------------- | ---------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| GitHub Actions Node warning     | Release automation     | Known warning; Actions force Node.js 24 for Node 20-targeting actions | Track upstream action updates; document warning in release notes | No, if CI is green                                           |
| Tauri bundle identifier warning | Packaging              | Known warning from existing `local.deepseek-workbench.app` identifier | Keep documented until package identity is intentionally changed  | No, if build exits 0                                         |
| Vite chunk-size warning         | Packaging              | Known production build warning                                        | Track future code-splitting; do not block RC if build exits 0    | No                                                           |
| Packaged standalone behavior    | Packaging              | Source-tree mode is well covered; packaged guarantees remain manual   | Manual QA and package hygiene docs                               | Yes, if package docs imply unsupported guarantees            |
| Migration destructive behavior  | Data migration         | Not implemented; dry-run review only                                  | Final dry-run review and rollback plan                           | Yes, if any destructive migration appears                    |
| Silent update behavior          | Release/update         | Not implemented; policy only                                          | Release update policy and manual QA                              | Yes, if auto-update is enabled without confirmation          |
| Raw content leakage             | Events/replay/docs     | Guarded by denylist, tests, boundary checks, and manual QA            | `check:secrets`, boundary checks, docs-lock tests                | Yes                                                          |
| Capability drift                | Cross-surface workflow | Many surfaces exist and can drift in wording or state                 | Capability boundary matrix and golden regression dashboard       | Yes, if execution boundary changes without gate              |
| Desktop action target drift     | Desktop actions        | Recovery and freshness checks exist                                   | Desktop recovery smoke and manual QA                             | Yes, if actions can execute without fresh target and receipt |
| MCP server variability          | MCP read-only tools    | Fixed profiles and allowlisted contracts only                         | Redaction audit, bounded output, mutating tool denylist          | Yes, if mutating or generic calls are enabled                |
| Plugin / skill supply chain     | Plugin/skill metadata  | Metadata-only and fixed simulation lanes                              | Sandbox manifest docs and boundary checks                        | Yes, if arbitrary runtime is enabled                         |
| Manual QA incompleteness        | Release readiness      | Human checklist can miss flows                                        | Final North Star manual QA matrix and RC checklist               | Yes, if required rows are missing                            |

## Open Follow-ups

- Decide whether package identity should change before v1 final.
- Decide whether Vite chunk splitting is worth addressing before v1 final.
- Keep release body links pinned to full docs paths.
- Keep all execution expansion proposals outside P1K unless a separate roadmap
  explicitly reopens capability work.
