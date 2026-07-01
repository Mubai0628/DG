# MCP Tool Invocation Proposal Implementation Gate v0.18

Do not implement real MCP tool invocation until all gates below are testable
and green. P0W may implement proposal, risk, simulated result, broker planning,
App preview, smoke, and redaction audit only.

## Metadata Safety

- Test malicious tool names and descriptions are summary-only.
- Test prompt-injection text in descriptions cannot become commands,
  arguments, or policy grants.
- Test mutating metadata is blocked or disabled/manual-only.

## Input Schema Safety

- Test input schemas are summarized, bounded, and hashed.
- Test unknown schema types receive conservative risk.
- Test filesystem write, command execution, credential access, network,
  workspace mutation, desktop action, and unknown categories are not AUTO.

## Argument Redaction

- Test raw args fields are forbidden.
- Test secret-like markers block proposals.
- Test argument summaries are bounded and output only hashes/counts.

## Risk Classification

- Test read-only metadata can be planned only as proposal/manual preview.
- Test mutating, credential, command, filesystem write, desktop action, and
  unknown risks are disabled or manual-only.
- Test no policy emits `AUTO` invocation.

## Approval Draft

- Test approval draft is a preview, not a production PermissionLease.
- Test no PermissionLease is issued.
- Test approval readiness flags remain false for execution.

## Simulation Boundary

- Test simulated results cannot claim real execution.
- Test simulated results cannot claim mutation or EventStore write.
- Test raw output, resource content, stdout, stderr, and secret markers are
  blocked.

## Broker Integration

- Test Capability Broker receives MCP tool proposals as external capability
  descriptors and planning previews only.
- Test broker output is disabled/manual-only.
- Test no tool call, EventStore write, or lease issuing path is introduced.

## App UI Safety

- Test the App surface renders proposal, risk, approval draft, and simulated
  result summaries only.
- Test `Invoke MCP Tool (disabled)` remains disabled.
- Test `Approve Tool Invocation (disabled)` remains disabled.
- Test no raw args input or raw output display exists.
- Test no Tauri `callTool` command exists.

## Boundary / CI Safety

- Test `pnpm check:boundaries` blocks MCP invocation, arbitrary process spawn,
  arbitrary shell, native bridge, desktop action, and EventStore raw writes.
- Test `pnpm check:secrets` blocks API key and token leakage.
- Test focused runtime and App suites cover the proposal chain.

## Release Rule

The v0.19 release can describe MCP tool invocation proposals, risk
classification, approval drafts, simulated results, broker planning, App
preview, and redaction audit. It must not claim real MCP tool execution.
