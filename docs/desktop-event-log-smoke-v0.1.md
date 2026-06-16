# Desktop Event Log Smoke v0.1

The desktop Event Log / Replay panel shows a safe summary of the fixed local
event log at:

```text
<workspace>/.deepseek-workbench/events.jsonl
```

It does not let the user choose an arbitrary event file path, and it does not
display full event payloads, CSV content, browser DOM, prompts, screenshots,
clipboard data, authorization headers, API keys, or full URL query strings.

## Manual Smoke

1. Run:

   ```bash
   pnpm app:dev
   ```

2. Choose an existing workspace directory.
3. Paste or load a sanitized `BrowserDomPayload` JSON file.
4. Click **Convert**.
5. Confirm the result panel shows a draft path under `drafts/`.
6. In **Event Log / Replay**, confirm:
   - event count is greater than zero
   - draft count is at least one
   - completed tasks shows `1 / 1`
   - safety scan is `OK`
   - timeline items show event type and safe summaries only
7. Click **Refresh events** and confirm the summary remains stable.

## Empty Workspace Check

Use a workspace that has not run a conversion yet and click **Refresh events**.
The panel should show:

```text
No events yet. Run a conversion first.
```

## Current Limitations

- The panel reads only the fixed workspace event log.
- Large event logs are summarized with a safe warning instead of streaming raw
  contents.
- The panel is a local replay summary, not a full event debugger.
- There is no browser-extension bridge, no native messaging, no desktop
  control, and no DeepSeek API call from this panel.
