# App Shell Desktop Observer Surface v0.22

P1A-006 adds the App Shell read-only Desktop Observer surface. The panel is a
metadata review surface for explicit user-triggered desktop observation, not a
desktop automation tool.

## Surface

- Panel title: `Desktop Observer`
- Badge: `Read-only / no desktop action`
- Primary controls:
  - `Preview Desktop Observation Profile`
  - `Observe Desktop Metadata`
- Disabled placeholders:
  - `Click Desktop (disabled)`
  - `Type into Desktop (disabled)`
  - `Capture Raw Screenshot (disabled)`
  - `Send Screen to Model (disabled)`

The observe button may call only the fixed `observeDesktopMetadata` wrapper from
P1A-004, which targets the allowlisted `observe_desktop_metadata` Tauri command.
The App Shell does not use generic Tauri invoke from this surface.

## Displayed Metadata

The surface displays summary-only fields:

- profile status and profile id
- observation id
- window, app, and display counts
- focused window summary
- redaction warning codes
- screenshot metadata boundary status and hash prefix when present
- next action

The screenshot boundary is provided by P1A-005 and remains metadata-only:
raw image persistence, OCR persistence, and model send are always false.

## Hard Boundaries

- No desktop action command.
- No click, type, select, or window control.
- No raw screenshot input or display.
- No OCR input or display.
- No clipboard read or write.
- No EventStore write.
- No file write.
- No model call.
- No apply or rollback.
- No Git or shell execution.
- No native bridge.
- No desktop action.

## Relation To P1A

P1A-002 defines the safe desktop observation profile. P1A-003 summarizes
observation metadata. P1A-004 exposes the fixed metadata command. P1A-005
defines the screenshot redaction boundary. This surface wires those contracts
into an App read-only review panel while keeping all execution readiness flags
false.
