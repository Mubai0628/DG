# Raw Transcript / Output Persistence Threat Model v0.34

## Assets

- Transcript metadata, redacted transcript summaries, raw opt-in state,
  retention policy, delete/export state, and replay refs.
- User workspace path summaries, command output summaries, model output
  summaries, prompt summaries, and redaction audit findings.
- Session lease, permission mode, execution policy, risk budget, and kill switch
  metadata.
- EventStore summaries, release artifacts, manual QA evidence, and future
  command broker audit trails.

## Trust Boundaries

- Runtime transcript builders to transcript storage.
- Redaction pipeline to raw output opt-in policy.
- Transcript storage to replay and export surfaces.
- Tauri transcript commands to local transcript files.
- App transcript viewer to runtime summaries.
- Future command broker output to transcript capture.
- Release packaging to generated transcript artifacts.

## Threats and Mitigations

### Secret leakage via stdout/stderr

Command output can include secrets. Mitigation: default records store summaries
only; redaction scans must block secret markers before any raw opt-in path can
persist raw output.

### API key leakage

Model, tool, or command output can include API keys. Mitigation: API key,
Authorization, token, bearer, password, and private key markers are forbidden in
summary output and must fail closed.

### Raw prompt / response leakage

Prompts and model responses can contain private user data. Mitigation: raw
prompt and raw response are not persisted by default, and future raw views must
be gated by explicit opt-in.

### reasoning_content persistence

Reasoning content can expose sensitive intermediate text. Mitigation:
reasoning_content must be dropped or summarized by safe counts only.

### Source/diff leakage

Raw source and raw diffs can expose proprietary code. Mitigation: transcript
summaries may include path refs, counts, hash prefixes, and warning codes, but
not raw source or raw diff.

### Terminal escape sequences

Terminal control sequences can manipulate rendering. Mitigation: control
characters, ANSI escapes, and terminal escape sequences must be stripped or
blocked before display or export.

### Binary output

Binary output can bypass text redaction. Mitigation: binary output must be
stored as blocked/truncated metadata with byte counts and hashes only.

### Huge output / disk bloat

Unbounded output can exhaust disk. Mitigation: transcript builders need size
limits, truncation summaries, and retention limits before storage.

### Command injection in transcript rendering

Transcript text can be copied into future commands. Mitigation: transcript
renderers must treat transcript text as inert display data and never as command
input.

### HTML/script injection

Transcript text can include markup. Mitigation: App viewer must escape
transcript content and default to redacted summaries.

### Path leakage

Full paths can reveal private directory structure. Mitigation: use workspace
relative refs and path hash prefixes where possible.

### Workspace privacy

Transcript output can expose workspace internals. Mitigation: workspace refs
must stay scoped to the active workspace and default to summaries.

### Stale retention

Transcripts can outlive the intended retention period. Mitigation: records need
retention metadata and expiry/delete checks.

### Export leakage

Exports can accidentally include raw output. Mitigation: exports must be
redacted by default, require explicit raw opt-in for raw exports, and include
redaction audit summaries.

### Delete bypass

Delete requests can leave raw copies. Mitigation: delete must tombstone or
remove transcript records and export artifacts according to policy.

### Replay accidental raw display

Replay could display raw transcript content by default. Mitigation: replay
defaults to summary refs and must require gated raw view.

### Raw transcript in release artifacts

Generated transcript artifacts can be committed or uploaded. Mitigation:
generated transcript directories must stay ignored and release gates must check
for raw artifact leakage.

## Out of Scope

- Proving safety of future arbitrary shell implementation.
- Proving safety of future autonomous loop implementation.
- Proving safety of future full access execution.
- Implementing transcript storage in P1M-001.
