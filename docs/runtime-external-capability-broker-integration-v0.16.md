# Runtime External Capability Broker Integration v0.16

## Summary

`runtime/src/capabilities/external-capability-broker-integration.ts` maps safe
external capability metadata summaries into broker-shaped descriptor previews.
It does not register descriptors for execution, invoke capabilities, or issue
PermissionLease grants.

Accepted inputs:

- external capability manifest validation result.
- MCP readonly discovery result.
- plugin / skill metadata scan result.

Blocked source results cannot enter the integration.

## Mapping Rules

- `mcp_server` maps to broker source type `mcp`.
- `plugin_package` maps to broker source type `plugin`.
- `skill_bundle` maps to broker source type `skill`.
- `local_builtin_descriptor` maps to broker source type `native`.
- External `AUTO` policy is blocked.
- External mutating, network, filesystem, shell, desktop, A4, or A5 capability
  metadata maps to `DISABLED`.
- Read-only low-risk external metadata may remain `MANUAL_ONLY` or `ASK_FIRST`,
  but never `AUTO`.
- Every descriptor preview includes a lease preview with `canIssueLease: false`.
- No invocation plan is produced.

## Validation

The integration blocks:

- blocked manifest / discovery / scan results.
- `AUTO` external policy.
- duplicate descriptor ids.
- raw args.
- raw prompt/source/diff/response fields.
- secret markers.
- execution readiness flags from any source.

## Output

The result is summary-only:

- descriptor preview count.
- risk mapping.
- policy mapping.
- lease preview count.
- descriptor previews.
- blocker/warning counts.
- integration hash.
- readiness flags.

All execution readiness flags remain false:

- `canRegisterForExecution`
- `canInvoke`
- `canIssueLease`
- `canAutoRun`
- `appCanExecute`

`canPreviewDescriptors` means only that the App/runtime can display the
descriptor preview. It does not enable registry registration, invocation, lease
issuance, MCP connection, plugin execution, skill execution, Git/shell, native
bridge, or desktop action.

## Non-goals

- No registration that enables execution.
- No invocation.
- No PermissionLease issuing.
- No EventStore write.
- No App execution.
- No MCP connection.
- No plugin code loading.
- No skill runtime execution.
- No Git/shell.
- No native bridge.
- No desktop action.

## Relation to P0U

This is P0U-005. It joins the descriptor schema, MCP readonly discovery, and
plugin/skill scanner into the broker preview chain. P0U-006 may show these
summaries in the App, but the App must remain read-only.
