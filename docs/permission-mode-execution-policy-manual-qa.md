# Permission Mode / Execution Policy Manual QA

Use this checklist for `v0.34.0-permission-mode-execution-policy-rc.1`.

## A. Pre-Check

```powershell
git status --short
git log --oneline origin/main..HEAD
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Confirm the release candidate commit is clean before opening the App.

## B. Start

```powershell
pnpm app:dev
```

## C. Execution Mode Panel

- Open the App Shell.
- Verify the `Execution Mode` panel is visible.
- Preview Approval Mode.
- Preview Autonomous Safe Mode.
- Preview Advanced Workspace Mode.
- Preview Full Access Mode.
- Confirm Full Access remains metadata-only.
- Confirm high-risk buttons remain disabled:
  - `Enable Autonomous Execution (disabled)`
  - `Enable Arbitrary Shell (disabled)`
  - `Enable Full Access (disabled)`
- Confirm there is no arbitrary shell input.
- Confirm there is no Git push UI.
- Confirm there is no recursive delete UI.

## D. Permission Mode Audit

- Verify the `Permission Mode Audit` panel is visible.
- Preview the permission audit.
- Confirm event previews show `notWritten`.
- Confirm replay status is summary-only.
- Confirm there is no EventStore write control.
- Confirm no raw transcript, raw output, command text, API key, token, raw
  source, or raw diff is displayed.

## E. Existing Convert smoke

- Use workspace `D:\workspaces\demo`.
- Use payload `runtime/test/fixtures/web-table-sample-payload.json`.
- Use filename `web-table-export-p1l.csv`.
- Run Convert.
- Verify the CSV exists under `workspace/drafts/`.
- Refresh events and confirm Event Log / Replay still works.
- Convert the same filename again and confirm the safe `FILE_EXISTS` error.

## F. Existing approved apply/rollback smoke

If practical for the local fixture workspace:

- Confirm approved apply still requires its existing receipt and typed
  confirmation.
- Confirm approved rollback still requires checkpoint scope and typed
  confirmation.
- Confirm no auto-apply path appears.
- Confirm no model-driven write path appears.

## G. Existing Git/shell safe lanes smoke

- Confirm Git read lanes remain read-only summaries.
- Confirm shell verification lanes remain fixed templates.
- Confirm there is no arbitrary command input.
- Confirm install/network/destructive shell commands are absent.
- Confirm Git commit and Git push remain unavailable.

## H. Safety Pass

- No arbitrary shell input.
- No automatic command execution.
- No automatic apply.
- No arbitrary file deletion.
- No recursive directory deletion.
- No Git commit/push.
- No autonomous loop.
- No raw transcript persistence.
- No raw output persistence.
- No broad native bridge.
- No arbitrary desktop automation.
