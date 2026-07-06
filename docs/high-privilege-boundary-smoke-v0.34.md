# High-Privilege Boundary Smoke v0.34

DW-P1L-007 adds a focused regression smoke for the v0.34 permission mode and
execution policy boundary. It proves that high-privilege capabilities remain
blocked while existing narrow lanes are still represented.

## Blocked In v0.34

- Arbitrary shell.
- Custom command strings.
- Auto apply outside the existing approved path.
- Recursive delete.
- Git commit.
- Git push.
- Autonomous loop execution.
- Raw output persistence.
- Native bridge.
- Mutating MCP.
- Plugin or skill arbitrary runtime execution.
- Broad desktop automation.

## Still Available As Existing Narrow Lanes

- Approved apply and rollback receipts remain ready only through the old
  human-approved lane.
- Fixed shell verification lanes remain fixed-argv and simulated/planned.
- Git read lanes remain read-only.

## Full Access Boundary

Full Access remains metadata preview only. The policy may show future high-risk
capabilities, but readiness flags for arbitrary shell, recursive delete, Git
push, autonomous loop, raw output persistence, EventStore write, and App
execution remain false.

## Non-Goals

- No new App execution.
- No real shell execution.
- No Git write execution.
- No apply or rollback execution in this smoke.
- No EventStore write.
- No Tauri command.
- No native bridge.
- No desktop action execution.
