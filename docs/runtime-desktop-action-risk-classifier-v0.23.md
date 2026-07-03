# Runtime Desktop Action Risk Classifier v0.23

P1B-004 adds a runtime-only risk classifier for desktop action proposals. It
consumes a validated desktop action proposal and target metadata validation
summary, then emits risk levels, approval requirements, blocked reasons,
warning codes, and a Capability Broker planning risk mapping.

This helper does not execute desktop actions. It never clicks, types, selects,
drags, drops, writes the clipboard, opens file dialogs, calls a native bridge,
writes EventStore, or performs shell/Git execution.

## Risk Levels

- `D0_INFO`
- `D1_LOW`
- `D2_MEDIUM`
- `D3_HIGH`
- `D4_CRITICAL`
- `D5_BLOCKED`

Default examples:

- `focus_window` -> `D1_LOW`
- `click_target`, `select_menu`, `scroll` -> `D2_MEDIUM`
- `type_text`, `press_key`, `copy_selection`, `paste_text`,
  `open_file_dialog`, `drag_drop` -> `D3_HIGH`
- `choose_file` -> `D4_CRITICAL`
- sensitive, hidden, blocked target, or policy-blocked actions -> `D5_BLOCKED`

## Approval Mapping

The classifier returns a summary-only approval mode:

- low/info: no approval draft requirement
- medium: manual review
- high: typed confirmation
- critical: explicit approval required
- blocked: no approval path

This approval mapping is descriptive only. P1B does not approve or execute
desktop actions.

## Capability Broker Mapping

The output includes:

- `planningLane: "desktop_action_proposal_only"`
- `canPlan`
- `canExecute: false`
- `requiredGate: "desktop_action_approval_draft"`

The mapping is for future planning integration only. It does not create a
PermissionLease and does not enable an action host.

## Safety

The classifier blocks:

- blocked proposals
- blocked target metadata validation
- sensitive targets when policy requires blocking
- hidden/background/offscreen targets when policy requires blocking
- raw screenshot/OCR/UI text/prompt/response fields
- secret-like markers
- command/native bridge/EventStore/action execution fields
- execution readiness flags set to true

All output is summary-only: risk scores, risk levels, warning codes, blocked
reason codes, operation ids, action kinds, hashes, and readiness flags.

Every execution readiness flag remains false:

- `canExecuteDesktopAction`
- `canClick`
- `canType`
- `canUseClipboard`
- `canOpenFileDialog`
- `canWriteEventStore`
- `canUseNativeBridge`
- `appCanExecute`

## Non-goals

- no desktop action execution
- no click/type/select/drag/drop
- no clipboard write
- no file dialog automation
- no native bridge
- no remote control
- no EventStore write
- no App execution
- no shell/Git execution
