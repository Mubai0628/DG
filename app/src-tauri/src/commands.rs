use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const MAX_PAYLOAD_BYTES: usize = 2_000_000;
const MAX_RUNNER_STDOUT_BYTES: usize = 65_536;
const MAX_EVENT_LOG_BYTES: u64 = 2_000_000;
const RUNNER_TIMEOUT: Duration = Duration::from_secs(60);
const PREFLIGHT_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopFlowResult {
    draft: DraftSummary,
    extraction: ExtractionSummary,
    events: EventSummary,
    replay_summary: ReplaySummary,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopFlowError {
    ok: bool,
    error_code: String,
    safe_message: String,
    stage: String,
    exit_code: Option<i32>,
    runner_mode: RunnerMode,
    node_available: Option<bool>,
    runner_found: Option<bool>,
    stdout_json_parsed: bool,
}

impl DesktopFlowError {
    fn new(error_code: &str, safe_message: impl Into<String>, stage: &str) -> Self {
        Self {
            ok: false,
            error_code: error_code.to_string(),
            safe_message: sanitize_safe_message(&safe_message.into()),
            stage: stage.to_string(),
            exit_code: None,
            runner_mode: runner_mode(),
            node_available: None,
            runner_found: None,
            stdout_json_parsed: false,
        }
    }

    fn with_exit_code(mut self, exit_code: Option<i32>) -> Self {
        self.exit_code = exit_code;
        self
    }

    fn with_runner_status(
        mut self,
        node_available: Option<bool>,
        runner_found: Option<bool>,
    ) -> Self {
        self.node_available = node_available;
        self.runner_found = runner_found;
        self
    }

    fn with_stdout_json_parsed(mut self, parsed: bool) -> Self {
        self.stdout_json_parsed = parsed;
        self
    }

    fn from_preflight(preflight: RunnerPreflightSummary, stage: &str) -> Self {
        let error_code = preflight
            .error_code
            .unwrap_or_else(|| "PREFLIGHT_FAILED".to_string());
        let safe_message = preflight
            .safe_message
            .unwrap_or_else(|| "Runner preflight failed".to_string());
        Self::new(&error_code, safe_message, stage)
            .with_runner_status(Some(preflight.node_available), Some(preflight.runner_found))
    }

    fn workspace_invalid(message: String) -> Self {
        Self::new("WORKSPACE_INVALID", message, "load_payload")
    }

    fn invalid_payload(message: impl Into<String>) -> Self {
        Self::new("INVALID_PAYLOAD", message, "load_payload")
    }

    fn invalid_filename(message: String) -> Self {
        Self::new("INVALID_FILENAME", message, "write_draft")
    }

    fn runner_not_found(message: String) -> Self {
        Self::new("RUNNER_NOT_FOUND", message, "preflight")
    }

    fn temp_payload(message: String) -> Self {
        Self::new("TEMP_PAYLOAD_FAILED", message, "load_payload")
    }

    fn command_start_failed() -> Self {
        Self::new(
            "COMMAND_START_FAILED",
            "Desktop flow command could not start",
            "run_flow",
        )
    }

    fn command_status_failed() -> Self {
        Self::new(
            "COMMAND_STATUS_FAILED",
            "Desktop flow command status could not be read",
            "run_flow",
        )
    }

    fn command_output_failed() -> Self {
        Self::new(
            "COMMAND_OUTPUT_FAILED",
            "Desktop flow command output could not be read",
            "run_flow",
        )
    }

    fn timeout() -> Self {
        Self::new("RUNNER_TIMEOUT", "Desktop flow timed out", "run_flow")
    }

    fn invalid_runner_output(message: impl Into<String>) -> Self {
        Self::new("INVALID_RUNNER_OUTPUT", message, "run_flow")
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RunnerMode {
    DevSourceTree,
    PackagedWithResources,
    PackagedNotSupported,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerPreflightSummary {
    ok: bool,
    mode: RunnerMode,
    runner_found: bool,
    node_available: bool,
    workspace_valid: Option<bool>,
    payload_limit_bytes: usize,
    warnings: Vec<String>,
    status_code: String,
    error_code: Option<String>,
    safe_message: Option<String>,
    runner_status: String,
    packaged_standalone_support: String,
    next_action: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DraftSummary {
    relative_path: String,
    absolute_path: String,
    bytes: u64,
    sha256: String,
    content_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExtractionSummary {
    row_count: u64,
    column_count: u64,
    warning_count: u64,
    injection_risk_count: u64,
    formula_escaped_count: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventSummary {
    event_count: u64,
    event_log_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReplaySummary {
    draft_count: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceEventSummary {
    ok: bool,
    event_log_path: Option<String>,
    event_count: usize,
    displayed_event_count: usize,
    task_count: usize,
    completed_task_count: usize,
    draft_count: usize,
    last_event_at: Option<String>,
    type_counts: BTreeMap<String, usize>,
    timeline: Vec<EventTimelineItem>,
    safety_scan: EventSafetyScan,
    warnings: Vec<String>,
    safe_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventTimelineItem {
    id: String,
    ts: String,
    #[serde(rename = "type")]
    event_type: String,
    task_id: Option<String>,
    summary: String,
    safe_payload_keys: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventSafetyScan {
    ok: bool,
    findings: usize,
    warning_codes: Vec<String>,
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command(rename_all = "camelCase")]
pub fn check_runner_preflight(workspace_root: Option<String>) -> RunnerPreflightSummary {
    run_runner_preflight(workspace_root.as_deref(), runner_mode())
}

#[tauri::command(rename_all = "camelCase")]
pub fn load_workspace_event_summary(
    workspace_root: String,
    max_events: Option<usize>,
) -> WorkspaceEventSummary {
    load_event_summary(&workspace_root, max_events)
}

#[tauri::command(rename_all = "camelCase")]
pub fn run_web_table_to_csv_flow(
    workspace_root: String,
    payload_json: String,
    filename: Option<String>,
    allow_overwrite: Option<bool>,
) -> Result<DesktopFlowResult, DesktopFlowError> {
    let preflight = run_runner_preflight(Some(&workspace_root), runner_mode());
    if !preflight.ok {
        return Err(DesktopFlowError::from_preflight(preflight, "preflight"));
    }

    let workspace_root =
        validate_workspace_root(&workspace_root).map_err(DesktopFlowError::workspace_invalid)?;
    validate_payload_size(&payload_json).map_err(DesktopFlowError::invalid_payload)?;
    if let Some(name) = filename.as_deref() {
        validate_filename(name).map_err(DesktopFlowError::invalid_filename)?;
    }

    let payload: Value = serde_json::from_str(&payload_json)
        .map_err(|_| DesktopFlowError::invalid_payload("Payload JSON is not valid JSON"))?;
    validate_payload_shape(&payload).map_err(DesktopFlowError::invalid_payload)?;

    let repo_root = repo_root().map_err(DesktopFlowError::runner_not_found)?;
    let payload_path = write_temp_payload(&payload).map_err(DesktopFlowError::temp_payload)?;
    let runner_path = app_runner_path(&repo_root).map_err(DesktopFlowError::runner_not_found)?;

    let result = (|| {
        let mut args = vec![
            path_for_node_arg(&runner_path),
            "--workspace".to_string(),
            path_for_node_arg(&workspace_root),
            "--payload".to_string(),
            path_for_node_arg(&payload_path),
        ];
        if let Some(name) = filename {
            args.push("--filename".to_string());
            args.push(name);
        }
        if allow_overwrite.unwrap_or(false) {
            args.push("--allow-overwrite".to_string());
        }

        let output = run_fixed_command(node_command(), &args, &repo_root)?;
        validate_runner_stdout(&output)?;
        serde_json::from_str::<DesktopFlowResult>(&output).map_err(|_| {
            DesktopFlowError::invalid_runner_output("Desktop flow returned an invalid summary")
        })
    })();

    let _ = fs::remove_file(payload_path);
    result
}

fn run_runner_preflight(workspace_root: Option<&str>, mode: RunnerMode) -> RunnerPreflightSummary {
    let mut warnings = Vec::new();
    let mut error_code: Option<String> = None;
    let mut safe_message: Option<String> = None;

    let workspace_valid = workspace_root.map(|root| validate_workspace_root(root).is_ok());
    if workspace_valid == Some(false) {
        error_code = Some("WORKSPACE_INVALID".to_string());
        safe_message = Some("Workspace root must exist and be a directory".to_string());
    }

    let repo_root = repo_root();
    let runner_found = repo_root
        .as_deref()
        .ok()
        .and_then(|root| app_runner_path(root).ok())
        .is_some();
    if !runner_found && error_code.is_none() {
        error_code = Some("RUNNER_NOT_FOUND".to_string());
        safe_message = Some("Desktop runner could not be found".to_string());
    }

    let node_available = repo_root
        .as_deref()
        .ok()
        .is_some_and(|root| check_node_available(root));
    if !node_available && error_code.is_none() {
        error_code = Some("NODE_RUNTIME_NOT_FOUND".to_string());
        safe_message = Some("Node runtime was not found for the desktop runner".to_string());
    }

    match mode {
        RunnerMode::DevSourceTree => {}
        RunnerMode::PackagedNotSupported => {
            warnings.push("Packaged mode does not yet bundle the Node sidecar runner".to_string());
            if error_code.is_none() {
                error_code = Some("PACKAGED_MODE_REQUIRES_SOURCE_TREE".to_string());
                safe_message =
                    Some("Packaged mode requires the source-tree runner in v0.1".to_string());
            }
        }
        RunnerMode::PackagedWithResources => {
            warnings.push("Packaged runner resources are reserved for a future task".to_string());
            if error_code.is_none() {
                error_code = Some("PACKAGED_RUNNER_NOT_BUNDLED".to_string());
                safe_message =
                    Some("Packaged runner resources are not bundled in v0.1".to_string());
            }
        }
    }

    if mode == RunnerMode::PackagedNotSupported && error_code.as_deref() == Some("RUNNER_NOT_FOUND")
    {
        error_code = Some("PACKAGED_RUNNER_NOT_BUNDLED".to_string());
        safe_message = Some("Packaged runner resources are not bundled in v0.1".to_string());
    }

    let runner_status = runner_status(runner_found, node_available, workspace_valid);
    let packaged_standalone_support = packaged_standalone_support(mode);
    let next_action = next_action(error_code.as_deref());
    let status_code = error_code
        .clone()
        .unwrap_or_else(|| "DEV_SOURCE_TREE_READY".to_string());

    RunnerPreflightSummary {
        ok: error_code.is_none(),
        mode,
        runner_found,
        node_available,
        workspace_valid,
        payload_limit_bytes: MAX_PAYLOAD_BYTES,
        warnings,
        status_code,
        error_code,
        safe_message,
        runner_status,
        packaged_standalone_support,
        next_action,
    }
}

fn runner_status(
    runner_found: bool,
    node_available: bool,
    workspace_valid: Option<bool>,
) -> String {
    if workspace_valid == Some(false) {
        return "Workspace invalid".to_string();
    }
    if !runner_found {
        return "Runner missing".to_string();
    }
    if !node_available {
        return "Node missing".to_string();
    }
    "Ready".to_string()
}

fn packaged_standalone_support(mode: RunnerMode) -> String {
    match mode {
        RunnerMode::DevSourceTree => "Source-tree runner".to_string(),
        RunnerMode::PackagedWithResources => "Not bundled".to_string(),
        RunnerMode::PackagedNotSupported => "Source-tree required".to_string(),
    }
}

fn next_action(error_code: Option<&str>) -> String {
    match error_code {
        None => "Run Convert with a sanitized BrowserDomPayload".to_string(),
        Some("NODE_RUNTIME_NOT_FOUND") => "Install Node.js and rerun preflight".to_string(),
        Some("RUNNER_NOT_FOUND") => {
            "Run from the repository source tree or restore app/scripts/run-flow.mjs".to_string()
        }
        Some("PACKAGED_RUNNER_NOT_BUNDLED") => {
            "Use pnpm app:dev from the source tree for v0.1".to_string()
        }
        Some("PACKAGED_MODE_REQUIRES_SOURCE_TREE") => {
            "Use pnpm app:dev or keep the source-tree runner available".to_string()
        }
        Some("WORKSPACE_INVALID") => "Choose an existing local workspace directory".to_string(),
        Some(_) => "Review the safe preflight message and retry".to_string(),
    }
}

fn runner_mode() -> RunnerMode {
    if cfg!(debug_assertions) {
        RunnerMode::DevSourceTree
    } else {
        RunnerMode::PackagedNotSupported
    }
}

fn load_event_summary(workspace_root: &str, max_events: Option<usize>) -> WorkspaceEventSummary {
    let display_limit = max_events.unwrap_or(50).clamp(1, 200);
    let workspace_root = match validate_workspace_root(workspace_root) {
        Ok(root) => root,
        Err(message) => {
            return event_summary_error("WORKSPACE_INVALID", message);
        }
    };
    let event_log_path = workspace_root
        .join(".deepseek-workbench")
        .join("events.jsonl");
    let event_log_path_text = event_log_path.to_string_lossy().to_string();

    if !event_log_path.exists() {
        return empty_event_summary(Some(event_log_path_text), Vec::new(), None);
    }

    let canonical_event_log = match event_log_path.canonicalize() {
        Ok(path) => path,
        Err(_) => {
            return event_summary_error(
                "EVENT_LOG_UNREADABLE",
                "Event log could not be read safely".to_string(),
            );
        }
    };
    if !canonical_event_log.starts_with(&workspace_root) || !canonical_event_log.is_file() {
        return event_summary_error(
            "EVENT_LOG_PATH_ESCAPE",
            "Event log path is outside the workspace".to_string(),
        );
    }

    let metadata = match fs::metadata(&canonical_event_log) {
        Ok(value) => value,
        Err(_) => {
            return event_summary_error(
                "EVENT_LOG_UNREADABLE",
                "Event log could not be read safely".to_string(),
            );
        }
    };
    if metadata.len() > MAX_EVENT_LOG_BYTES {
        return empty_event_summary(
            Some(event_log_path_text),
            vec!["EVENT_LOG_TOO_LARGE".to_string()],
            Some("Event log is too large to display safely".to_string()),
        );
    }

    let event_text = match fs::read_to_string(&canonical_event_log) {
        Ok(value) => value,
        Err(_) => {
            return event_summary_error(
                "EVENT_LOG_UNREADABLE",
                "Event log could not be read safely".to_string(),
            );
        }
    };
    let safety_scan = scan_event_log_for_leaks(&event_text);
    let mut warnings = Vec::new();
    let mut events = Vec::new();

    for line in event_text.lines().filter(|line| !line.trim().is_empty()) {
        match serde_json::from_str::<Value>(line) {
            Ok(value) => events.push(value),
            Err(_) => warnings.push("PARSE_ERROR_LINE_SKIPPED".to_string()),
        }
    }
    warnings.extend(safety_scan.warning_codes.clone());
    warnings.sort();
    warnings.dedup();

    let mut task_status: BTreeMap<String, String> = BTreeMap::new();
    let mut type_counts: BTreeMap<String, usize> = BTreeMap::new();
    let mut draft_count = 0usize;
    let mut last_event_at: Option<String> = None;

    for event in &events {
        let event_type = event_string(event, "type").unwrap_or_else(|| "unknown".to_string());
        *type_counts.entry(event_type.clone()).or_insert(0) += 1;
        if let Some(ts) = event_string(event, "ts") {
            last_event_at = Some(ts);
        }
        if let Some(task_id) = event_string(event, "taskId") {
            if matches!(
                event_type.as_str(),
                "task.created" | "task.started" | "task.completed" | "task.failed"
            ) {
                task_status.insert(task_id, event_type.replace("task.", ""));
            }
        }
        if event_type == "fs.draft_written" {
            draft_count += 1;
        }
    }

    let mut timeline = events
        .iter()
        .rev()
        .take(display_limit)
        .map(timeline_item)
        .collect::<Vec<_>>();
    timeline.reverse();

    WorkspaceEventSummary {
        ok: true,
        event_log_path: Some(event_log_path_text),
        event_count: events.len(),
        displayed_event_count: timeline.len(),
        task_count: task_status.len(),
        completed_task_count: task_status
            .values()
            .filter(|status| status.as_str() == "completed")
            .count(),
        draft_count,
        last_event_at,
        type_counts,
        timeline,
        safety_scan,
        warnings,
        safe_message: None,
    }
}

fn empty_event_summary(
    event_log_path: Option<String>,
    warnings: Vec<String>,
    safe_message: Option<String>,
) -> WorkspaceEventSummary {
    WorkspaceEventSummary {
        ok: true,
        event_log_path,
        event_count: 0,
        displayed_event_count: 0,
        task_count: 0,
        completed_task_count: 0,
        draft_count: 0,
        last_event_at: None,
        type_counts: BTreeMap::new(),
        timeline: Vec::new(),
        safety_scan: EventSafetyScan {
            ok: true,
            findings: 0,
            warning_codes: Vec::new(),
        },
        warnings,
        safe_message,
    }
}

fn event_summary_error(code: &str, message: String) -> WorkspaceEventSummary {
    WorkspaceEventSummary {
        ok: false,
        event_log_path: None,
        event_count: 0,
        displayed_event_count: 0,
        task_count: 0,
        completed_task_count: 0,
        draft_count: 0,
        last_event_at: None,
        type_counts: BTreeMap::new(),
        timeline: Vec::new(),
        safety_scan: EventSafetyScan {
            ok: true,
            findings: 0,
            warning_codes: Vec::new(),
        },
        warnings: vec![code.to_string()],
        safe_message: Some(message),
    }
}

fn timeline_item(event: &Value) -> EventTimelineItem {
    let payload = event.get("payload").and_then(Value::as_object);
    EventTimelineItem {
        id: event_string(event, "id").unwrap_or_else(|| "unknown-event".to_string()),
        ts: event_string(event, "ts").unwrap_or_else(|| "unknown-time".to_string()),
        event_type: event_string(event, "type").unwrap_or_else(|| "unknown".to_string()),
        task_id: event_string(event, "taskId"),
        summary: summarize_safe_event(event),
        safe_payload_keys: payload
            .map(safe_payload_keys)
            .unwrap_or_default()
            .into_iter()
            .collect(),
    }
}

fn safe_payload_keys(payload: &serde_json::Map<String, Value>) -> BTreeSet<String> {
    let allowed = [
        "argumentSummary",
        "bytes",
        "columnCount",
        "contentType",
        "decision",
        "errorKind",
        "formulaEscapedCount",
        "injectionRiskCount",
        "metadataSummary",
        "overwritten",
        "redactedTextCount",
        "redaction",
        "relativePath",
        "resultSummary",
        "riskLevel",
        "rowCount",
        "selectedTableId",
        "sha256",
        "sourceHost",
        "sourceOrigin",
        "sourcePathWithoutQuery",
        "sourceSummary",
        "status",
        "tableCount",
        "title",
        "toolName",
        "warningCount",
    ];
    allowed
        .into_iter()
        .filter(|key| payload.contains_key(*key))
        .map(str::to_string)
        .collect()
}

fn summarize_safe_event(event: &Value) -> String {
    let event_type = event_string(event, "type").unwrap_or_else(|| "unknown".to_string());
    let payload = event.get("payload");

    match event_type.as_str() {
        "task.created" | "task.started" | "task.completed" | "task.failed" => {
            let status = nested_string(payload, "status").unwrap_or_else(|| {
                event_type
                    .strip_prefix("task.")
                    .unwrap_or(event_type.as_str())
                    .to_string()
            });
            let host = nested_string(payload, "sourceHost");
            let path = nested_string(payload, "sourcePathWithoutQuery");
            format_parts(&event_type, [Some(status), host, path])
        }
        "browser.dom.captured" => format_parts(
            "captured browser tables",
            [
                nested_string(payload, "sourceHost"),
                nested_string(payload, "sourcePathWithoutQuery"),
                nested_display(payload, "tableCount", "tables"),
            ],
        ),
        "frame.redacted" => format_parts(
            "redacted selected table",
            [
                nested_string(payload, "selectedTableId"),
                nested_display(payload, "rowCount", "rows"),
                nested_display(payload, "columnCount", "columns"),
                nested_display(payload, "warningCount", "warnings"),
                nested_display(payload, "injectionRiskCount", "risks"),
                nested_display(payload, "formulaEscapedCount", "formula escapes"),
            ],
        ),
        "fs.draft_written" => format_parts(
            "draft written",
            [
                nested_string(payload, "relativePath"),
                nested_display(payload, "bytes", "bytes"),
                nested_string(payload, "contentType"),
                nested_string(payload, "sha256").map(|value| {
                    let prefix = value.chars().take(12).collect::<String>();
                    format!("sha256 {prefix}")
                }),
            ],
        ),
        "tool.proposed" | "tool.approved" | "tool.rejected" | "tool.executed" | "tool.failed" => {
            let result = payload.and_then(|value| value.get("resultSummary"));
            format_parts(
                &event_type,
                [
                    nested_string(payload, "toolName"),
                    nested_string(payload, "riskLevel"),
                    nested_string(payload, "decision"),
                    nested_string(result, "relativePath"),
                    nested_display(result, "bytes", "bytes"),
                ],
            )
        }
        _ => format_parts(
            &event_type,
            [
                nested_string(payload, "sourceHost"),
                nested_string(payload, "sourcePathWithoutQuery"),
                nested_display(payload, "rowCount", "rows"),
                nested_display(payload, "columnCount", "columns"),
                nested_string(payload, "relativePath"),
                nested_display(payload, "bytes", "bytes"),
                nested_string(payload, "contentType"),
            ],
        ),
    }
}

fn format_parts<const N: usize>(label: &str, parts: [Option<String>; N]) -> String {
    let safe_parts = parts.into_iter().flatten().collect::<Vec<_>>();
    if safe_parts.is_empty() {
        return label.to_string();
    }
    format!("{label}: {}", safe_parts.join(" · "))
}

fn event_string(event: &Value, key: &str) -> Option<String> {
    event
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn nested_string(parent: Option<&Value>, key: &str) -> Option<String> {
    parent
        .and_then(|value| value.get(key))
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn nested_display(parent: Option<&Value>, key: &str, label: &str) -> Option<String> {
    let value = parent.and_then(|value| value.get(key))?;
    if let Some(number) = value.as_u64() {
        return Some(format!("{number} {label}"));
    }
    if let Some(number) = value.as_i64() {
        return Some(format!("{number} {label}"));
    }
    value
        .as_str()
        .filter(|value| !value.is_empty())
        .map(|value| format!("{value} {label}"))
}

fn scan_event_log_for_leaks(text: &str) -> EventSafetyScan {
    let checks = [
        ("RAW_DOM_MARKER", "\"rawDom\""),
        ("INNER_HTML_MARKER", "innerHTML"),
        ("OUTER_HTML_MARKER", "outerHTML"),
        ("CSV_CONTENT_MARKER", "csvContent"),
        ("RAW_PROMPT_MARKER", "rawPrompt"),
        ("RAW_SCREENSHOT_MARKER", "rawScreenshot"),
        ("CLIPBOARD_MARKER", "clipboard"),
        ("AUTHORIZATION_MARKER", "Authorization"),
        ("BEARER_TOKEN_MARKER", "Bearer "),
        ("SK_LIKE_KEY_MARKER", "sk-"),
        ("QUERY_TOKEN_MARKER", "token="),
        ("QUERY_SESSION_MARKER", "session="),
        ("QUERY_SECRET_MARKER", "secret="),
        ("LOCAL_STORAGE_MARKER", "localStorage"),
        ("SESSION_STORAGE_MARKER", "sessionStorage"),
        ("COOKIES_MARKER", "\"cookies\""),
        ("API_KEY_MARKER", "apiKey"),
        ("DEEPSEEK_KEY_MARKER", "DEEPSEEK_API_KEY"),
        ("OPENAI_KEY_MARKER", "OPENAI_API_KEY"),
    ];
    let mut warning_codes = checks
        .into_iter()
        .filter(|(_, marker)| text.contains(marker))
        .map(|(code, _)| code.to_string())
        .collect::<Vec<_>>();
    if contains_password_leak_marker(text) {
        warning_codes.push("PASSWORD_VALUE_MARKER".to_string());
    }
    warning_codes.sort();
    warning_codes.dedup();
    EventSafetyScan {
        ok: warning_codes.is_empty(),
        findings: warning_codes.len(),
        warning_codes,
    }
}

fn contains_password_leak_marker(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    lower.contains("\"passwordvalue\"")
        || lower.contains("\"password_value\"")
        || lower.contains("\"password\"")
        || lower.contains("password=")
        || lower.contains("\"credential\"")
        || lower.contains("credential=")
}

fn check_node_available(repo_root: &Path) -> bool {
    run_fixed_command_with_timeout(
        node_command(),
        &["--version".to_string()],
        repo_root,
        PREFLIGHT_TIMEOUT,
    )
    .is_ok()
}

fn validate_workspace_root(workspace_root: &str) -> Result<PathBuf, String> {
    if workspace_root.trim().is_empty() {
        return Err("Workspace root is required".to_string());
    }
    let canonical = Path::new(workspace_root)
        .canonicalize()
        .map_err(|_| "Workspace root must exist and be a directory".to_string())?;
    if !canonical.is_dir() {
        return Err("Workspace root must exist and be a directory".to_string());
    }
    Ok(canonical)
}

fn validate_payload_size(payload_json: &str) -> Result<(), String> {
    if payload_json.as_bytes().len() > MAX_PAYLOAD_BYTES {
        return Err("Payload JSON is too large".to_string());
    }
    Ok(())
}

fn validate_filename(filename: &str) -> Result<(), String> {
    if filename.contains("..") {
        return Err("Filename cannot contain parent traversal".to_string());
    }
    if filename.contains('/') || filename.contains('\\') {
        return Err("Filename cannot contain path separators".to_string());
    }
    if !filename.to_ascii_lowercase().ends_with(".csv") {
        return Err("Filename must end with .csv".to_string());
    }
    Ok(())
}

fn validate_payload_shape(payload: &Value) -> Result<(), String> {
    let object = payload
        .as_object()
        .ok_or_else(|| "Payload must be an object".to_string())?;
    if !object.contains_key("schemaVersion")
        || !object.get("source").is_some_and(Value::is_object)
        || !object.get("tables").is_some_and(Value::is_array)
        || !object.get("redaction").is_some_and(Value::is_object)
    {
        return Err("Payload must be a sanitized BrowserDomPayload object".to_string());
    }
    Ok(())
}

fn repo_root() -> Result<PathBuf, String> {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .map(Path::to_path_buf)
        .ok_or_else(|| "Cannot resolve repository root".to_string())?;
    root.canonicalize()
        .map_err(|_| "Cannot resolve repository root".to_string())
}

fn app_runner_path(repo_root: &Path) -> Result<PathBuf, String> {
    let app_root = repo_root
        .join("app")
        .canonicalize()
        .map_err(|_| "Cannot resolve app root".to_string())?;
    let runner = app_root
        .join("scripts")
        .join("run-flow.mjs")
        .canonicalize()
        .map_err(|_| "Cannot resolve desktop runner".to_string())?;
    if !runner.starts_with(&app_root) || !runner.is_file() {
        return Err("Desktop runner path is outside the app package".to_string());
    }
    Ok(runner)
}

fn write_temp_payload(payload: &Value) -> Result<PathBuf, String> {
    let temp_dir = std::env::temp_dir().join("deepseek-workbench-desktop");
    fs::create_dir_all(&temp_dir)
        .map_err(|_| "Cannot create temp payload directory".to_string())?;
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "Cannot create temp payload path".to_string())?
        .as_millis();
    let payload_path = temp_dir.join(format!("payload-{}-{}.json", std::process::id(), millis));
    let payload_text =
        serde_json::to_string(payload).map_err(|_| "Cannot serialize payload".to_string())?;
    validate_payload_size(&payload_text)?;
    fs::write(&payload_path, payload_text).map_err(|_| "Cannot write temp payload".to_string())?;
    payload_path
        .canonicalize()
        .map_err(|_| "Cannot resolve temp payload path".to_string())
}

fn run_fixed_command<S>(program: S, args: &[String], cwd: &Path) -> Result<String, DesktopFlowError>
where
    S: AsRef<OsStr>,
{
    run_fixed_command_with_timeout(program, args, cwd, RUNNER_TIMEOUT)
}

fn run_fixed_command_with_timeout<S>(
    program: S,
    args: &[String],
    cwd: &Path,
    timeout: Duration,
) -> Result<String, DesktopFlowError>
where
    S: AsRef<OsStr>,
{
    let mut child = Command::new(program)
        .args(args)
        .current_dir(cwd)
        .env_clear()
        .envs(sanitized_command_env())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|_| DesktopFlowError::command_start_failed())?;

    let started_at = Instant::now();
    loop {
        if started_at.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(DesktopFlowError::timeout());
        }
        if child
            .try_wait()
            .map_err(|_| DesktopFlowError::command_status_failed())?
            .is_some()
        {
            break;
        }
        thread::sleep(Duration::from_millis(50));
    }

    let output = child
        .wait_with_output()
        .map_err(|_| DesktopFlowError::command_output_failed())?;

    if !output.status.success() {
        return Err(safe_command_error(
            output.status.code(),
            &output.stdout,
            &output.stderr,
        ));
    }

    let stdout = String::from_utf8(output.stdout)
        .map_err(|_| DesktopFlowError::invalid_runner_output("Desktop flow output is not UTF-8"))?;
    validate_runner_stdout(&stdout)?;
    Ok(stdout)
}

fn sanitized_command_env() -> Vec<(String, String)> {
    sanitize_env_vars(std::env::vars())
}

fn sanitize_env_vars<I>(vars: I) -> Vec<(String, String)>
where
    I: IntoIterator<Item = (String, String)>,
{
    vars.into_iter()
        .filter(|(key, _)| !is_sensitive_env_key(key))
        .collect()
}

fn is_sensitive_env_key(key: &str) -> bool {
    let upper = key.to_ascii_uppercase();
    [
        "API_KEY",
        "TOKEN",
        "AUTH",
        "SECRET",
        "PASSWORD",
        "CREDENTIAL",
        "BEARER",
    ]
    .iter()
    .any(|marker| upper.contains(marker))
}

fn node_command() -> &'static str {
    if cfg!(windows) {
        "node.exe"
    } else {
        "node"
    }
}

fn path_for_node_arg(path: &Path) -> String {
    let text = path.to_string_lossy().to_string();
    if let Some(rest) = text.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{rest}");
    }
    if let Some(rest) = text.strip_prefix(r"\\?\") {
        return rest.to_string();
    }
    text
}

fn validate_runner_stdout(stdout: &str) -> Result<(), DesktopFlowError> {
    if stdout.as_bytes().len() > MAX_RUNNER_STDOUT_BYTES {
        return Err(DesktopFlowError::invalid_runner_output(
            "Desktop flow returned too much output",
        ));
    }
    Ok(())
}

fn safe_command_error(exit_code: Option<i32>, stdout: &[u8], stderr: &[u8]) -> DesktopFlowError {
    let stderr_text = String::from_utf8_lossy(stderr);
    if let Some(error) = runner_error_summary(&stderr_text, exit_code) {
        return error;
    }
    let stdout_text = String::from_utf8_lossy(stdout);
    if let Some(error) = runner_error_summary(&stdout_text, exit_code) {
        return error;
    }
    if let Some(excerpt) = safe_process_output_excerpt(&stderr_text) {
        return DesktopFlowError::new(
            "RUNNER_FAILED",
            format!("Desktop flow failed safely: {excerpt}"),
            "run_flow",
        )
        .with_exit_code(exit_code);
    }
    if let Some(excerpt) = safe_process_output_excerpt(&stdout_text) {
        return DesktopFlowError::new(
            "RUNNER_FAILED",
            format!("Desktop flow failed safely: {excerpt}"),
            "run_flow",
        )
        .with_exit_code(exit_code);
    }
    let message = match exit_code {
        Some(code) => format!("Desktop flow failed with exit code {code}"),
        None => "Desktop flow failed".to_string(),
    };
    DesktopFlowError::new("RUNNER_FAILED", message, "run_flow").with_exit_code(exit_code)
}

fn runner_error_summary(text: &str, exit_code: Option<i32>) -> Option<DesktopFlowError> {
    text.lines().rev().find_map(|line| {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return None;
        }
        let value = serde_json::from_str::<Value>(trimmed).ok()?;
        if value.get("ok").and_then(Value::as_bool) != Some(false) {
            return None;
        }
        let safe_message = value
            .get("safeMessage")
            .and_then(Value::as_str)
            .map(sanitize_safe_message)?;
        let error_code = value
            .get("errorCode")
            .and_then(Value::as_str)
            .unwrap_or("RUNNER_FAILED");
        let stage = value
            .get("stage")
            .and_then(Value::as_str)
            .unwrap_or("run_flow");
        Some(
            DesktopFlowError::new(error_code, safe_message, stage)
                .with_exit_code(exit_code)
                .with_stdout_json_parsed(true),
        )
    })
}

fn sanitize_safe_message(message: &str) -> String {
    let clipped: String = message.chars().take(400).collect();
    if contains_sensitive_marker(&clipped) {
        return "Desktop flow failed safely".to_string();
    }
    clipped
}

fn safe_process_output_excerpt(text: &str) -> Option<String> {
    let lines = text
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();
    let excerpt = lines
        .iter()
        .copied()
        .find(|line| {
            line.starts_with("Error:")
                || line.contains("Cannot ")
                || line.contains("failed")
                || line.contains("EINVAL")
        })
        .or_else(|| {
            lines
                .iter()
                .copied()
                .find(|line| *line != "Node.js v24.9.0")
        })?;
    let clipped: String = excerpt.chars().take(300).collect();
    if contains_sensitive_marker(&clipped) {
        return None;
    }
    Some(clipped)
}

fn contains_sensitive_marker(message: &str) -> bool {
    let lower = message.to_ascii_lowercase();
    lower.contains("authorization")
        || lower.contains("bearer ")
        || lower.contains("sk-")
        || lower.contains("raw payload")
        || lower.contains("raw csv")
        || lower.contains("raw dom")
        || lower.contains("api key")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_workspace(label: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "dw-app-event-summary-{}-{}",
            label,
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("time")
                .as_nanos()
        ));
        fs::create_dir_all(&path).expect("temp workspace");
        path
    }

    fn write_event_log(workspace: &Path, text: &str) {
        let event_dir = workspace.join(".deepseek-workbench");
        fs::create_dir_all(&event_dir).expect("event dir");
        fs::write(event_dir.join("events.jsonl"), text).expect("event log");
    }

    #[test]
    fn strips_sensitive_env_keys() {
        let sanitized = sanitize_env_vars([
            ("PATH".to_string(), "ok".to_string()),
            ("DEEPSEEK_API_KEY".to_string(), "secret".to_string()),
            ("OPENAI_API_KEY".to_string(), "secret".to_string()),
            ("SERVICE_TOKEN".to_string(), "secret".to_string()),
            ("AUTHORIZATION".to_string(), "secret".to_string()),
        ]);

        let keys: Vec<String> = sanitized.into_iter().map(|(key, _)| key).collect();
        assert!(keys.contains(&"PATH".to_string()));
        assert!(!keys.contains(&"DEEPSEEK_API_KEY".to_string()));
        assert!(!keys.contains(&"OPENAI_API_KEY".to_string()));
        assert!(!keys.contains(&"SERVICE_TOKEN".to_string()));
        assert!(!keys.contains(&"AUTHORIZATION".to_string()));
    }

    #[test]
    fn safe_command_error_does_not_include_stderr() {
        let secret = "sk-test1234567890abcdef";
        let error = safe_command_error(
            Some(1),
            b"",
            format!("payload {{\"secret\":\"{secret}\"}}").as_bytes(),
        );

        assert_eq!(error.error_code, "RUNNER_FAILED");
        assert_eq!(error.safe_message, "Desktop flow failed with exit code 1");
        assert_eq!(error.exit_code, Some(1));
        assert!(!error.safe_message.contains(secret));
        assert!(!error.safe_message.contains("payload"));
    }

    #[test]
    fn safe_command_error_uses_structured_runner_summary() {
        let error = safe_command_error(
            Some(1),
            b"",
            br#"{"ok":false,"errorCode":"FILE_EXISTS","errorKind":"file_exists","safeMessage":"Draft already exists: drafts/web-table-export.csv. Choose a new draft filename or remove the existing file.","stage":"write_draft"}"#,
        );

        assert_eq!(error.error_code, "FILE_EXISTS");
        assert_eq!(error.stage, "write_draft");
        assert_eq!(
            error.safe_message,
            "Draft already exists: drafts/web-table-export.csv. Choose a new draft filename or remove the existing file."
        );
        assert_eq!(error.exit_code, Some(1));
        assert!(error.stdout_json_parsed);
        assert!(!error.safe_message.contains("exit code 1"));
    }

    #[test]
    fn safe_command_error_redacts_sensitive_structured_summary() {
        let secret = "sk-test1234567890abcdef";
        let error = safe_command_error(
            Some(1),
            b"",
            format!(r#"{{"ok":false,"errorKind":"invalid_payload","safeMessage":"bad {secret}"}}"#)
                .as_bytes(),
        );

        assert_eq!(error.safe_message, "Desktop flow failed safely");
        assert!(!error.safe_message.contains(secret));
    }

    #[test]
    fn safe_command_error_uses_safe_stderr_excerpt_when_no_summary_exists() {
        let error = safe_command_error(Some(1), b"", b"TypeScript build failed safely");

        assert_eq!(error.error_code, "RUNNER_FAILED");
        assert_eq!(
            error.safe_message,
            "Desktop flow failed safely: TypeScript build failed safely"
        );
        assert_eq!(error.exit_code, Some(1));
    }

    #[test]
    fn rejects_large_payload_text() {
        let oversized = "x".repeat(MAX_PAYLOAD_BYTES + 1);
        assert_eq!(
            validate_payload_size(&oversized),
            Err("Payload JSON is too large".to_string())
        );
    }

    #[test]
    fn resolves_runner_inside_app_package() {
        let root = repo_root().expect("repo root");
        let runner = app_runner_path(&root).expect("runner path");

        assert!(runner.ends_with(Path::new("app").join("scripts").join("run-flow.mjs")));
        assert!(runner.starts_with(root.join("app")));
    }

    #[test]
    fn strips_windows_verbatim_prefix_for_node_args() {
        let path = PathBuf::from(r"\\?\D:\workspace\payload.json");
        assert_eq!(path_for_node_arg(&path), r"D:\workspace\payload.json");

        let unc_path = PathBuf::from(r"\\?\UNC\server\share\payload.json");
        assert_eq!(path_for_node_arg(&unc_path), r"\\server\share\payload.json");
    }

    #[test]
    fn desktop_command_runs_fixture_through_fixed_runner() {
        let workspace = temp_workspace("command-success");
        let fixture_path = repo_root()
            .expect("repo root")
            .join("runtime")
            .join("test")
            .join("fixtures")
            .join("web-table-sample-payload.json");
        let payload_json = fs::read_to_string(fixture_path).expect("fixture");

        let result = run_web_table_to_csv_flow(
            workspace.to_string_lossy().to_string(),
            payload_json,
            Some("web-table-export.csv".to_string()),
            Some(false),
        )
        .expect("desktop command should run fixture");

        assert_eq!(result.draft.relative_path, "drafts/web-table-export.csv");
        assert!(result.extraction.row_count > 0);
        assert!(result.events.event_count >= 1);
        assert_eq!(result.replay_summary.draft_count, 1);
        assert!(workspace
            .join("drafts")
            .join("web-table-export.csv")
            .is_file());

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn desktop_flow_result_serializes_camel_case() {
        let result = DesktopFlowResult {
            draft: DraftSummary {
                relative_path: "drafts/table.csv".to_string(),
                absolute_path: "D:\\workspace\\drafts\\table.csv".to_string(),
                bytes: 42,
                sha256: "a".repeat(64),
                content_type: "text/csv".to_string(),
            },
            extraction: ExtractionSummary {
                row_count: 4,
                column_count: 3,
                warning_count: 1,
                injection_risk_count: 1,
                formula_escaped_count: 1,
            },
            events: EventSummary {
                event_count: 9,
                event_log_path: "D:\\workspace\\.deepseek-workbench\\events.jsonl".to_string(),
            },
            replay_summary: ReplaySummary { draft_count: 1 },
        };
        let value = serde_json::to_value(result).expect("serialize");
        let serialized = value.to_string();

        assert!(serialized.contains("relativePath"));
        assert!(serialized.contains("eventLogPath"));
        assert!(serialized.contains("replaySummary"));
        assert!(!serialized.contains("relative_path"));
        assert!(!serialized.contains("event_log_path"));
        assert!(!serialized.contains("replay_summary"));
    }

    #[test]
    fn desktop_flow_error_serializes_camel_case() {
        let error = DesktopFlowError::new("FILE_EXISTS", "Draft already exists", "write_draft")
            .with_exit_code(Some(1))
            .with_runner_status(Some(true), Some(true))
            .with_stdout_json_parsed(true);
        let value = serde_json::to_value(error).expect("serialize");
        let serialized = value.to_string();

        assert!(serialized.contains("safeMessage"));
        assert!(serialized.contains("errorCode"));
        assert!(serialized.contains("exitCode"));
        assert!(serialized.contains("runnerFound"));
        assert!(!serialized.contains("safe_message"));
        assert!(!serialized.contains("error_code"));
        assert!(!serialized.contains("exit_code"));
        assert!(!serialized.contains("runner_found"));
    }

    #[test]
    fn timeout_returns_safe_error() {
        let root = repo_root().expect("repo root");
        let args = vec!["-e".to_string(), "setTimeout(() => {}, 3000);".to_string()];
        let error =
            run_fixed_command_with_timeout(node_command(), &args, &root, Duration::from_millis(50))
                .expect_err("timeout should fail safely");

        assert_eq!(error.error_code, "RUNNER_TIMEOUT");
        assert_eq!(error.safe_message, "Desktop flow timed out");
    }

    #[test]
    fn preflight_passes_in_dev_source_tree_mode() {
        let root = repo_root().expect("repo root");
        let summary = run_runner_preflight(
            Some(root.to_string_lossy().as_ref()),
            RunnerMode::DevSourceTree,
        );

        assert!(summary.ok);
        assert_eq!(summary.mode, RunnerMode::DevSourceTree);
        assert!(summary.runner_found);
        assert!(summary.node_available);
        assert_eq!(summary.workspace_valid, Some(true));
        assert_eq!(summary.payload_limit_bytes, MAX_PAYLOAD_BYTES);
        assert_eq!(summary.status_code, "DEV_SOURCE_TREE_READY");
        assert_eq!(summary.runner_status, "Ready");
        assert_eq!(summary.packaged_standalone_support, "Source-tree runner");
        assert_eq!(
            summary.next_action,
            "Run Convert with a sanitized BrowserDomPayload"
        );
    }

    #[test]
    fn preflight_reports_missing_workspace_safely() {
        let root = repo_root().expect("repo root");
        let missing = root.join(".tmp").join("missing-preflight-workspace");
        let summary = run_runner_preflight(
            Some(missing.to_string_lossy().as_ref()),
            RunnerMode::DevSourceTree,
        );

        assert!(!summary.ok);
        assert_eq!(summary.error_code.as_deref(), Some("WORKSPACE_INVALID"));
        assert_eq!(summary.status_code, "WORKSPACE_INVALID");
        assert_eq!(summary.workspace_valid, Some(false));
        assert_eq!(
            summary.next_action,
            "Choose an existing local workspace directory"
        );
        assert!(!summary.safe_message.unwrap_or_default().contains("sk-"));
    }

    #[test]
    fn packaged_mode_is_not_reported_as_supported() {
        let root = repo_root().expect("repo root");
        let summary = run_runner_preflight(
            Some(root.to_string_lossy().as_ref()),
            RunnerMode::PackagedNotSupported,
        );

        assert!(!summary.ok);
        assert_eq!(summary.mode, RunnerMode::PackagedNotSupported);
        assert_eq!(
            summary.error_code.as_deref(),
            Some("PACKAGED_MODE_REQUIRES_SOURCE_TREE")
        );
        assert_eq!(summary.status_code, "PACKAGED_MODE_REQUIRES_SOURCE_TREE");
        assert_eq!(summary.packaged_standalone_support, "Source-tree required");
        assert!(summary.next_action.contains("pnpm app:dev"));
        assert!(!summary.warnings.is_empty());
    }

    #[test]
    fn packaged_with_resources_is_reserved_for_future_work() {
        let root = repo_root().expect("repo root");
        let summary = run_runner_preflight(
            Some(root.to_string_lossy().as_ref()),
            RunnerMode::PackagedWithResources,
        );

        assert!(!summary.ok);
        assert_eq!(summary.mode, RunnerMode::PackagedWithResources);
        assert_eq!(
            summary.error_code.as_deref(),
            Some("PACKAGED_RUNNER_NOT_BUNDLED")
        );
        assert_eq!(summary.status_code, "PACKAGED_RUNNER_NOT_BUNDLED");
        assert_eq!(summary.packaged_standalone_support, "Not bundled");
    }

    #[test]
    fn missing_event_log_returns_empty_summary() {
        let workspace = temp_workspace("missing");
        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), None);

        assert!(summary.ok);
        assert_eq!(summary.event_count, 0);
        assert!(summary.timeline.is_empty());
        assert_eq!(summary.draft_count, 0);
        assert!(summary.safe_message.is_none());

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn event_summary_uses_allowlisted_fields() {
        let workspace = temp_workspace("allowlisted");
        write_event_log(
            &workspace,
            r#"{"id":"e1","ts":"2026-06-16T00:00:00.000Z","type":"task.created","schemaVersion":1,"taskId":"task-1","payload":{"title":"web_table_to_csv","status":"created","sourceHost":"example.com","sourcePathWithoutQuery":"/table","tableCount":1}}
{"id":"e2","ts":"2026-06-16T00:00:01.000Z","type":"fs.draft_written","schemaVersion":1,"taskId":"task-1","payload":{"relativePath":"drafts/table.csv","bytes":42,"sha256":"1234567890abcdef","contentType":"text/csv"}}
{"id":"e3","ts":"2026-06-16T00:00:02.000Z","type":"task.completed","schemaVersion":1,"taskId":"task-1","payload":{"status":"completed","relativePath":"drafts/table.csv","bytes":42}}"#,
        );

        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));

        assert!(summary.ok);
        assert_eq!(summary.event_count, 3);
        assert_eq!(summary.task_count, 1);
        assert_eq!(summary.completed_task_count, 1);
        assert_eq!(summary.draft_count, 1);
        assert_eq!(summary.displayed_event_count, 3);
        assert_eq!(
            summary.type_counts.get("fs.draft_written").copied(),
            Some(1)
        );
        assert!(summary.timeline[1].summary.contains("drafts/table.csv"));
        assert!(summary.timeline[1].summary.contains("sha256 1234567890ab"));
        assert!(!summary.timeline[1].summary.contains("1234567890abcdef"));
        assert!(summary.timeline[1]
            .safe_payload_keys
            .contains(&"relativePath".to_string()));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn redaction_password_values_dropped_does_not_trigger_password_warning() {
        let workspace = temp_workspace("redaction-password-safe");
        write_event_log(
            &workspace,
            r#"{"id":"e1","ts":"2026-06-16T00:00:00.000Z","type":"browser.dom.captured","schemaVersion":1,"payload":{"sourceHost":"example.com","sourcePathWithoutQuery":"/table","tableCount":1,"redaction":{"passwordValuesDropped":true,"inputValuesDropped":true,"storageAccessed":false,"cookiesAccessed":false,"rawDomIncluded":false}}}"#,
        );

        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));

        assert!(summary.ok);
        assert!(summary.safety_scan.ok);
        assert!(!summary
            .safety_scan
            .warning_codes
            .contains(&"PASSWORD_VALUE_MARKER".to_string()));
        assert_eq!(summary.safety_scan.findings, 0);

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn password_value_markers_still_trigger_warning_without_returning_raw_values() {
        let workspace = temp_workspace("password-leak");
        write_event_log(
            &workspace,
            r#"{"id":"e1","ts":"2026-06-16T00:00:00.000Z","type":"tool.executed","schemaVersion":1,"payload":{"toolName":"fs.write_draft","passwordValue":"private-password","url":"https://example.com/path?password=secret"}}"#,
        );

        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));
        let serialized = serde_json::to_string(&summary).expect("summary");

        assert!(summary.ok);
        assert!(!summary.safety_scan.ok);
        assert!(summary
            .safety_scan
            .warning_codes
            .contains(&"PASSWORD_VALUE_MARKER".to_string()));
        assert!(!serialized.contains("private-password"));
        assert!(!serialized.contains("password=secret"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn invalid_json_line_is_skipped_safely() {
        let workspace = temp_workspace("invalid-line");
        write_event_log(
            &workspace,
            "not-json-with-secret-token=private\n{\"id\":\"e1\",\"ts\":\"2026-06-16T00:00:00.000Z\",\"type\":\"unknown.event\",\"schemaVersion\":1,\"payload\":{\"rowCount\":2}}\n",
        );

        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));
        let serialized = serde_json::to_string(&summary).expect("summary");

        assert!(summary.ok);
        assert_eq!(summary.event_count, 1);
        assert!(summary
            .warnings
            .contains(&"PARSE_ERROR_LINE_SKIPPED".to_string()));
        assert!(summary.warnings.contains(&"QUERY_TOKEN_MARKER".to_string()));
        assert_eq!(summary.timeline[0].event_type, "unknown.event");
        assert!(!serialized.contains("private"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn event_safety_scan_detects_synthetic_leaks_without_returning_values() {
        let workspace = temp_workspace("leak");
        let secret = "sk-test1234567890abcdef";
        let csv_content_key = format!("{}{}", "csv", "Content");
        let raw_dom_key = format!("{}{}", "raw", "Dom");
        write_event_log(
            &workspace,
            &format!(
                r#"{{"id":"e1","ts":"2026-06-16T00:00:00.000Z","type":"tool.executed","schemaVersion":1,"payload":{{"toolName":"fs.write_draft","{csv_content_key}":"name,value","{raw_dom_key}":"<table></table>","authorization":"Bearer abcdefghijklmnop","apiKey":"{secret}","url":"https://example.com/path?token=secret"}}}}"#
            ),
        );

        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));
        let serialized = serde_json::to_string(&summary).expect("summary");

        assert!(summary.ok);
        assert!(!summary.safety_scan.ok);
        assert!(summary.safety_scan.findings >= 4);
        assert!(summary
            .safety_scan
            .warning_codes
            .contains(&"CSV_CONTENT_MARKER".to_string()));
        assert!(summary
            .safety_scan
            .warning_codes
            .contains(&"RAW_DOM_MARKER".to_string()));
        assert!(!serialized.contains(secret));
        assert!(!serialized.contains(&csv_content_key));
        assert!(!serialized.contains(&raw_dom_key));
        assert!(!serialized.contains("<table>"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn large_event_log_returns_safe_warning() {
        let workspace = temp_workspace("large");
        write_event_log(&workspace, &"x".repeat((MAX_EVENT_LOG_BYTES as usize) + 1));

        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));

        assert!(summary.ok);
        assert_eq!(summary.event_count, 0);
        assert!(summary
            .warnings
            .contains(&"EVENT_LOG_TOO_LARGE".to_string()));
        assert_eq!(
            summary.safe_message.as_deref(),
            Some("Event log is too large to display safely")
        );

        let _ = fs::remove_dir_all(workspace);
    }
}
