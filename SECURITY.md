# Security Policy

## Project status

DeepSeek Workbench is an unofficial community project. It is not produced, endorsed, or supported by DeepSeek.

The initial v0.1.0 scope is intentionally narrow: `web_table_to_csv` with user-authorized browser visible DOM/table input, redaction, draft CSV output, events, and replay.

## v0.1.0 security boundaries

The project must not:

- Read or store API keys by default.
- Call the real DeepSeek API during default tests.
- Control arbitrary desktop apps.
- Execute real mouse clicks.
- Submit forms.
- Read cookies, localStorage, sessionStorage, clipboard data, or password field values.
- Enable browser click, submit, navigation, or fetch actions.
- Store raw prompt, raw DOM, raw screenshot, raw OCR, or secret-containing tool output by default.

## Reporting

Please report security issues privately to the project owner until a public disclosure channel is established. Do not include secrets, access tokens, raw DOM from private pages, or API keys in reports.
