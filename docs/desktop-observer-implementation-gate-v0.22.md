# Desktop Observer Implementation Gate v0.22

Do not implement the desktop observer profile, metadata model, Tauri command,
screenshot boundary, App surface, or evidence-ref integration until the
relevant gate items are backed by tests or boundary checks. No item may rely
only on prose.

Do not implement desktop action in P1A. Do not implement click/type/select. Do
not persist raw screenshots by default. Do not persist raw OCR text by default.
Do not send desktop observation to model automatically.

## Profile Safety

- Test only `disabled`, `metadata_only`, and `screenshot_metadata_only` style
  profile modes are accepted when implemented.
- Test profile fields that allow desktop action, click/type/select, clipboard
  write, hidden capture, screen recording, raw screenshot persistence, raw OCR
  persistence, or model auto-send are blocked.
- Test max window/display counts are bounded.
- Test profile output readiness keeps all execution flags false.

## User-trigger Safety

- Test observation requests require an explicit `userTriggered: true`-style
  signal.
- Test hidden background capture, timer capture, agent-triggered capture, model
  triggered capture, replay-triggered capture, and auto-run fields are blocked.
- Test unavailable or ambiguous foreground-window state returns a warning, not
  an execution path.

## Tauri Command Allowlist

- Test only the future fixed command name is callable.
- Test no generic desktop command, native bridge broad action, click, type,
  select, focus, move-window, file-dialog, clipboard-write, or screen-recording
  command is added.
- Test the command returns summary-only data and never writes EventStore.

## Window Metadata Safety

- Test window ids, process ids, display ids, and screenshot ids are hashed or
  summarized.
- Test title summaries are bounded and redacted.
- Test API-key-like, Authorization, bearer token, password, and private-key
  markers in titles or app names block or redact safely.
- Test too many windows or displays are blocked or truncated with warning codes.

## Screenshot / Redaction Safety

- Test raw screenshot bytes, base64, image paths, pixel buffers, raw OCR text,
  and raw extracted text are blocked.
- Test screenshot output can include only dimensions, size estimates, hash
  prefixes, redaction codes, and warning counts by default.
- Test raw screenshot persistence remains false unless a future explicit gate
  changes the policy.

## Event / Replay Safety

- Test any future observation event schema is summary-only.
- Test raw screenshot, raw OCR, raw clipboard, raw prompt, raw source, raw diff,
  raw model response, API key, Authorization, bearer token, stdout, and stderr
  fields are blocked.
- Test replay can show observation refs, counts, hashes, warning codes, and
  redaction summaries without raw desktop content.

## App UI Safety

- Test App observer surfaces are read-only.
- Test App has no enabled click, type, select, clipboard write, file dialog,
  screen recording, remote-control, apply, rollback, approve, reject, issue
  lease, Git/shell, native bridge, or desktop action buttons.
- Test disabled placeholders remain visibly disabled.
- Test App cannot call a generic Tauri invoke for desktop actions.

## Context / Agent Evidence Safety

- Test observation evidence refs include only ref ids, hashes, counts, warning
  codes, redaction summaries, and safe metadata summaries.
- Test raw screenshot/OCR, prompt, source, diff, model response, API key, or
  clipboard content cannot enter `volatile_tail`, `no_compress_zone`, or Agent
  Dossiers.
- Test agents cannot directly request desktop observation without a future
  broker/approval gate.

## CI / Boundary Safety

- Boundary checks keep blocking desktop action, native bridge broad action,
  App hidden capture, raw screenshot persistence, raw OCR persistence, model
  auto-send, arbitrary Git/shell, mutating MCP tools, arbitrary plugin/skill
  runtime, and broad PermissionLease.
- Focused tests run for each new runtime/App/Tauri surface.
- Full gates remain stage-end only for P1A-009.
