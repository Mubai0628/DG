# Runtime Capability Plan Preview v0.3

The runtime capability plan preview helper is a pure, browser-safe summary
helper for the App Shell Capability Plan Preview. It aligns the App surface with
Capability Broker v2 descriptor semantics without invoking any capability.

## Scope

- Build display-only capability plan summaries from a run draft summary, static
  route preview refs, context summary refs, workspace index refs, patch summary
  refs, and memory recall refs.
- Return descriptor-style rows with capability id, source type, category, risk
  level, invoke policy, execution mode, plan status, approval requirement,
  lease requirement, disabled reason, dry-run availability, and warning codes.
- Keep mapping deterministic for supported intents:
  - `web_data_extraction`: `native.workspace.index`,
    `native.fs.write_draft`
  - `code_change`: `native.workspace.index`, `native.patch.propose`,
    `native.git.diff_summary`, `native.git.status`,
    `native.shell.pnpm_test`, `native.patch.apply` disabled,
    `native.git.commit_draft` disabled
  - `code_review`: `native.workspace.index`, `native.git.diff_summary`,
    patch audit refs or an unavailable MCP runtime placeholder
  - `verification`: `native.git.status`, `native.shell.pnpm_test` disabled
  - `documentation`: `native.workspace.index`, `native.patch.propose`
  - `unknown`: needs clarification

## Safety Model

The helper returns summary-only data. It rejects or blocks inputs that contain
raw argument, prompt, source, DOM, CSV, diff, screenshot, clipboard, API key,
Authorization, environment, stdout, or stderr markers. Warning codes are
returned instead of raw values.

The helper is intentionally pure:

- No capability invocation.
- No PermissionLease issuing.
- No approval execution.
- No EventStore write.
- No ToolBroker call.
- No MCP, plugin, or skill runtime execution.
- No patch, Git, or shell execution.
- No DeepSeek call.
- No filesystem access.
- No native bridge or desktop action.

## Relation To Existing Planes

- Capability Broker v2 provides the descriptor vocabulary and risk/policy
  semantics. This helper mirrors those summaries for UI preview only.
- Agent Route Preview supplies role and route-step refs for display.
- Context Assembly Preview and Workspace Index Bridge supply summary refs only.
- Approval Surface may display approval-required rows as read-only dry refs.

Future controlled creation work may use the same summary shape before an
explicit approval gate, but real invocation and lease issuing remain deferred.
