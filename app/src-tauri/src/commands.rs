use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{hash_map::DefaultHasher, BTreeMap, BTreeSet};
use std::ffi::OsStr;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const MAX_PAYLOAD_BYTES: usize = 2_000_000;
const MAX_RUN_DRAFT_EVENT_PAYLOAD_BYTES: usize = 16_384;
const MAX_RUNNER_STDOUT_BYTES: usize = 65_536;
const MAX_EVENT_LOG_BYTES: u64 = 2_000_000;
const RUNNER_TIMEOUT: Duration = Duration::from_secs(60);
const PREFLIGHT_TIMEOUT: Duration = Duration::from_secs(5);
const APPLY_CONFIRMATION: &str = "APPLY TO USER WORKSPACE";
const ROLLBACK_CONFIRMATION: &str = "ROLLBACK USER WORKSPACE";
const APPROVED_APPLY_PREVIEW_TYPE: &str = "user_workspace.patch_apply.approved_result";
const APPROVED_ROLLBACK_PREVIEW_TYPE: &str = "user_workspace.patch_rollback.approved_result";
const APPROVED_APPLY_EXECUTED_TYPE: &str = "user_workspace.patch_apply.app_executed";
const APPROVED_ROLLBACK_EXECUTED_TYPE: &str = "user_workspace.patch_rollback.app_executed";

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

    fn with_stage(mut self, stage: &str) -> Self {
        self.stage = stage.to_string();
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
    approved_apply_count: usize,
    approved_rollback_count: usize,
    latest_approved_execution_summary: Option<String>,
    last_event_at: Option<String>,
    type_counts: BTreeMap<String, usize>,
    timeline: Vec<EventTimelineItem>,
    safety_scan: EventSafetyScan,
    warnings: Vec<String>,
    safe_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunDraftEventRecordResult {
    ok: bool,
    event_id: String,
    event_type: String,
    draft_id: String,
    event_log_path: String,
    safe_message: String,
    warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedExecutionEventRecordResult {
    ok: bool,
    event_id: String,
    event_type: String,
    operation_id: String,
    checkpoint_id: String,
    event_log_path: String,
    safe_message: String,
    warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedApplyRequest {
    workspace_root: String,
    workspace_root_ref: String,
    receipt: Value,
    operations: Vec<ApprovedApplyOperation>,
    proposal_summary: Value,
    validation_summary: Value,
    audit_summary: Value,
    approval_summary: Value,
    max_files: usize,
    max_bytes: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedApplyOperation {
    path: String,
    change_kind: ApprovedApplyChangeKind,
    content: Option<String>,
    expected_before_hash: Option<String>,
    expected_exists_before: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ApprovedApplyChangeKind {
    Create,
    Update,
    Delete,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedApplyResult {
    ok: bool,
    apply_id: String,
    checkpoint_id: String,
    checkpoint_hash: String,
    workspace_root_ref: String,
    operation_count: usize,
    files_created: usize,
    files_updated: usize,
    files_deleted: usize,
    bytes_written: usize,
    operation_results: Vec<ApprovedApplyOperationResult>,
    warning_codes: Vec<String>,
    input_snapshot_hash: String,
    output_snapshot_hash: String,
    result_hash: String,
    event_preview: ApprovedApplyEventPreview,
    safe_message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedApplyOperationResult {
    path: String,
    change_kind: ApprovedApplyChangeKind,
    status: String,
    existed_before: bool,
    exists_after: bool,
    before_hash_prefix: Option<String>,
    after_hash_prefix: Option<String>,
    bytes_written: usize,
    warning_codes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedApplyEventPreview {
    #[serde(rename = "type")]
    event_type: String,
    apply_id: String,
    checkpoint_id: String,
    checkpoint_hash: String,
    workspace_root_ref: String,
    operation_count: usize,
    files_created: usize,
    files_updated: usize,
    files_deleted: usize,
    bytes_written: usize,
    path_summaries: Vec<String>,
    path_summary_count: usize,
    result_hash: String,
    warning_codes: Vec<String>,
    not_written: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedRollbackRequest {
    workspace_root: String,
    workspace_root_ref: String,
    receipt: Value,
    apply_id: String,
    checkpoint_id: String,
    checkpoint_ref: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedRollbackResult {
    ok: bool,
    rollback_id: String,
    apply_id: String,
    checkpoint_id: String,
    checkpoint_hash: String,
    workspace_root_ref: String,
    operation_count: usize,
    files_removed: usize,
    files_restored: usize,
    restored_snapshot_hash: String,
    result_hash: String,
    operation_results: Vec<ApprovedRollbackOperationResult>,
    warning_codes: Vec<String>,
    event_preview: ApprovedRollbackEventPreview,
    safe_message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedRollbackOperationResult {
    path: String,
    change_kind: ApprovedApplyChangeKind,
    status: String,
    existed_before_apply: bool,
    exists_after_rollback: bool,
    restored_hash_prefix: Option<String>,
    warning_codes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedRollbackEventPreview {
    #[serde(rename = "type")]
    event_type: String,
    rollback_id: String,
    apply_id: String,
    checkpoint_id: String,
    checkpoint_hash: String,
    workspace_root_ref: String,
    operation_count: usize,
    files_removed: usize,
    files_restored: usize,
    path_summaries: Vec<String>,
    path_summary_count: usize,
    restored_snapshot_hash: String,
    result_hash: String,
    warning_codes: Vec<String>,
    not_written: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApprovedApplyCheckpoint {
    checkpoint_id: String,
    apply_id: String,
    workspace_root_ref: String,
    entries: Vec<ApprovedApplyCheckpointEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApprovedApplyCheckpointEntry {
    path: String,
    existed_before: bool,
    preimage_hash: Option<String>,
    preimage_bytes: usize,
    change_kind: ApprovedApplyChangeKind,
    content: Option<String>,
}

struct ApprovedReceiptScope {
    receipt_id: String,
    allowed_relative_paths: BTreeSet<String>,
    max_files: usize,
    max_bytes: usize,
}

struct PlannedApprovedApplyOperation {
    operation: ApprovedApplyOperation,
    target_path: PathBuf,
    existed_before: bool,
    preimage_content: Option<String>,
    preimage_hash: Option<String>,
    preimage_bytes: usize,
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
pub fn record_control_run_draft_event(
    workspace_root: String,
    payload_json: String,
) -> Result<RunDraftEventRecordResult, DesktopFlowError> {
    let workspace_root =
        validate_workspace_root(&workspace_root).map_err(DesktopFlowError::workspace_invalid)?;
    validate_run_draft_event_payload_text(&payload_json).map_err(|message| {
        DesktopFlowError::invalid_payload(message).with_stage("record_draft_event")
    })?;
    let payload: Value = serde_json::from_str(&payload_json).map_err(|_| {
        DesktopFlowError::invalid_payload("Draft event payload is not valid JSON")
            .with_stage("record_draft_event")
    })?;
    validate_run_draft_event_payload(&payload).map_err(|message| {
        DesktopFlowError::invalid_payload(message).with_stage("record_draft_event")
    })?;

    let draft_id = nested_string(Some(&payload), "draftId").ok_or_else(|| {
        DesktopFlowError::invalid_payload("Draft event payload is missing draftId")
            .with_stage("record_draft_event")
    })?;
    let local_task_id = nested_string(Some(&payload), "localTaskId");
    let event_dir = workspace_root.join(".deepseek-workbench");
    fs::create_dir_all(&event_dir).map_err(|_| {
        DesktopFlowError::new(
            "EVENT_LOG_WRITE_FAILED",
            "Draft event log directory could not be created",
            "record_draft_event",
        )
    })?;
    let canonical_event_dir = event_dir.canonicalize().map_err(|_| {
        DesktopFlowError::new(
            "EVENT_LOG_WRITE_FAILED",
            "Draft event log directory could not be resolved",
            "record_draft_event",
        )
    })?;
    if !canonical_event_dir.starts_with(&workspace_root) || !canonical_event_dir.is_dir() {
        return Err(DesktopFlowError::new(
            "EVENT_LOG_PATH_ESCAPE",
            "Draft event log path is outside the workspace",
            "record_draft_event",
        ));
    }

    let event_log_path = canonical_event_dir.join("events.jsonl");
    if event_log_path.exists() {
        let canonical_event_log = event_log_path.canonicalize().map_err(|_| {
            DesktopFlowError::new(
                "EVENT_LOG_WRITE_FAILED",
                "Draft event log could not be resolved",
                "record_draft_event",
            )
        })?;
        if !canonical_event_log.starts_with(&workspace_root) || !canonical_event_log.is_file() {
            return Err(DesktopFlowError::new(
                "EVENT_LOG_PATH_ESCAPE",
                "Draft event log path is outside the workspace",
                "record_draft_event",
            ));
        }
    }

    let millis = unix_epoch_millis();
    let event_id = format!("control-run-draft-{millis}");
    let timestamp = format!("unix-ms-{millis}");
    let event = serde_json::json!({
        "id": event_id,
        "ts": timestamp,
        "type": "control.run.draft_recorded",
        "schemaVersion": 1,
        "taskId": local_task_id,
        "payload": payload
    });
    let event_line = serde_json::to_string(&event).map_err(|_| {
        DesktopFlowError::new(
            "EVENT_SERIALIZE_FAILED",
            "Draft event could not be serialized",
            "record_draft_event",
        )
    })?;
    if event_line.as_bytes().len() > MAX_RUN_DRAFT_EVENT_PAYLOAD_BYTES + 1024
        || contains_run_draft_event_sensitive_marker(&event_line)
    {
        return Err(DesktopFlowError::new(
            "DRAFT_EVENT_REJECTED",
            "Draft event payload failed final safety validation",
            "record_draft_event",
        ));
    }

    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&event_log_path)
        .map_err(|_| {
            DesktopFlowError::new(
                "EVENT_LOG_WRITE_FAILED",
                "Draft event could not be written",
                "record_draft_event",
            )
        })?;
    writeln!(file, "{event_line}").map_err(|_| {
        DesktopFlowError::new(
            "EVENT_LOG_WRITE_FAILED",
            "Draft event could not be written",
            "record_draft_event",
        )
    })?;

    Ok(RunDraftEventRecordResult {
        ok: true,
        event_id,
        event_type: "control.run.draft_recorded".to_string(),
        draft_id,
        event_log_path: event_log_path.to_string_lossy().to_string(),
        safe_message: "Summary-only draft event recorded locally. No run was created.".to_string(),
        warnings: Vec::new(),
    })
}

#[tauri::command(rename_all = "camelCase")]
pub fn record_approved_user_workspace_execution_event(
    workspace_root: String,
    event_preview: Value,
) -> Result<ApprovedExecutionEventRecordResult, DesktopFlowError> {
    let workspace_root = validate_workspace_root(&workspace_root).map_err(|message| {
        DesktopFlowError::new("WORKSPACE_INVALID", message, "record_approved_execution_event")
    })?;
    let approved_event = build_approved_execution_event_payload(&event_preview).map_err(|message| {
        DesktopFlowError::invalid_payload(message).with_stage("record_approved_execution_event")
    })?;
    let event_log_path =
        resolve_safe_event_log_path(&workspace_root, "Approved execution event")?;

    let millis = unix_epoch_millis();
    let event_id = format!("approved-execution-{millis}");
    let timestamp = format!("unix-ms-{millis}");
    let event = serde_json::json!({
        "id": event_id,
        "ts": timestamp,
        "type": approved_event.event_type,
        "schemaVersion": 1,
        "taskId": Value::Null,
        "payload": approved_event.payload
    });
    let event_line = serde_json::to_string(&event).map_err(|_| {
        DesktopFlowError::new(
            "EVENT_SERIALIZE_FAILED",
            "Approved execution event could not be serialized",
            "record_approved_execution_event",
        )
    })?;
    if event_line.as_bytes().len() > MAX_RUN_DRAFT_EVENT_PAYLOAD_BYTES + 4096
        || contains_approved_apply_sensitive_marker(&event_line)
    {
        return Err(DesktopFlowError::new(
            "APPROVED_EXECUTION_EVENT_REJECTED",
            "Approved execution event payload failed final safety validation",
            "record_approved_execution_event",
        ));
    }

    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&event_log_path)
        .map_err(|_| {
            DesktopFlowError::new(
                "EVENT_LOG_WRITE_FAILED",
                "Approved execution event could not be written",
                "record_approved_execution_event",
            )
        })?;
    writeln!(file, "{event_line}").map_err(|_| {
        DesktopFlowError::new(
            "EVENT_LOG_WRITE_FAILED",
            "Approved execution event could not be written",
            "record_approved_execution_event",
        )
    })?;

    Ok(ApprovedExecutionEventRecordResult {
        ok: true,
        event_id,
        event_type: approved_event.event_type,
        operation_id: approved_event.operation_id,
        checkpoint_id: approved_event.checkpoint_id,
        event_log_path: event_log_path.to_string_lossy().to_string(),
        safe_message: "Summary-only approved execution event recorded locally.".to_string(),
        warnings: Vec::new(),
    })
}

#[tauri::command(rename_all = "camelCase")]
pub fn apply_approved_user_workspace_patch(
    request: ApprovedApplyRequest,
) -> Result<ApprovedApplyResult, DesktopFlowError> {
    run_approved_user_workspace_apply(request)
}

#[tauri::command(rename_all = "camelCase")]
pub fn rollback_approved_user_workspace_patch(
    request: ApprovedRollbackRequest,
) -> Result<ApprovedRollbackResult, DesktopFlowError> {
    run_approved_user_workspace_rollback(request)
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

fn run_approved_user_workspace_apply(
    request: ApprovedApplyRequest,
) -> Result<ApprovedApplyResult, DesktopFlowError> {
    validate_approved_apply_request_summary(&request).map_err(approved_apply_invalid)?;
    let workspace_root = validate_approved_apply_workspace_root(&request.workspace_root)
        .map_err(approved_apply_invalid)?;
    let receipt = validate_approved_apply_receipt(&request).map_err(approved_apply_invalid)?;
    let max_files = request.max_files.min(receipt.max_files);
    let max_bytes = request.max_bytes.min(receipt.max_bytes);
    if max_files == 0 || request.operations.len() > max_files {
        return Err(approved_apply_invalid(
            "Approved apply operation count exceeds maxFiles",
        ));
    }
    if max_bytes == 0 {
        return Err(approved_apply_invalid(
            "Approved apply maxBytes must be positive",
        ));
    }

    let mut total_content_bytes = 0usize;
    let mut planned_operations = Vec::new();
    for operation in &request.operations {
        if !receipt.allowed_relative_paths.contains(&operation.path) {
            return Err(approved_apply_invalid(
                "Approved apply operation path is outside receipt scope",
            ));
        }
        let target_path = resolve_approved_apply_operation_path(
            &workspace_root,
            &operation.path,
            operation.change_kind,
        )
        .map_err(approved_apply_invalid)?;
        if matches!(
            operation.change_kind,
            ApprovedApplyChangeKind::Create | ApprovedApplyChangeKind::Update
        ) {
            let content = operation
                .content
                .as_deref()
                .ok_or_else(|| approved_apply_invalid("Approved apply content is required"))?;
            validate_approved_apply_content(content, max_bytes).map_err(approved_apply_invalid)?;
            total_content_bytes = total_content_bytes.saturating_add(content.as_bytes().len());
            if total_content_bytes > max_bytes {
                return Err(approved_apply_invalid(
                    "Approved apply content exceeds maxBytes",
                ));
            }
        }
        planned_operations.push(plan_approved_apply_operation(operation, target_path)?);
    }

    let millis = unix_epoch_millis();
    let apply_id = format!("approved-apply-{millis}");
    let checkpoint_id = format!(
        "approved-apply-checkpoint-{}",
        short_hash(&format!(
            "{}:{}:{}",
            receipt.receipt_id,
            millis,
            request.operations.len()
        ))
    );
    let checkpoint_hash = write_approved_apply_checkpoint(
        &workspace_root,
        &request.workspace_root_ref,
        &apply_id,
        &checkpoint_id,
        &planned_operations,
    )?;

    let input_snapshot_hash = approved_apply_snapshot_hash(&planned_operations, true);
    let mut operation_results = Vec::new();
    let mut files_created = 0usize;
    let mut files_updated = 0usize;
    let mut files_deleted = 0usize;
    let mut bytes_written = 0usize;

    for planned in &planned_operations {
        let before_hash_prefix = planned
            .preimage_hash
            .as_deref()
            .map(|hash| hash.chars().take(12).collect::<String>());
        match planned.operation.change_kind {
            ApprovedApplyChangeKind::Create | ApprovedApplyChangeKind::Update => {
                let content =
                    planned.operation.content.as_deref().ok_or_else(|| {
                        approved_apply_invalid("Approved apply content is required")
                    })?;
                if let Some(parent) = planned.target_path.parent() {
                    fs::create_dir_all(parent).map_err(|_| {
                        approved_apply_io("Approved apply target directory could not be created")
                    })?;
                    ensure_path_stays_in_workspace(parent, &workspace_root)
                        .map_err(approved_apply_invalid)?;
                }
                fs::write(&planned.target_path, content)
                    .map_err(|_| approved_apply_io("Approved apply file could not be written"))?;
                bytes_written += content.as_bytes().len();
                if planned.operation.change_kind == ApprovedApplyChangeKind::Create {
                    files_created += 1;
                } else {
                    files_updated += 1;
                }
            }
            ApprovedApplyChangeKind::Delete => {
                fs::remove_file(&planned.target_path)
                    .map_err(|_| approved_apply_io("Approved apply file could not be deleted"))?;
                files_deleted += 1;
            }
        }
        let (exists_after, after_hash_prefix) = if planned.target_path.exists() {
            let content = fs::read(&planned.target_path).map_err(|_| {
                approved_apply_io("Approved apply result file could not be read safely")
            })?;
            (true, Some(short_hash_bytes(&content)))
        } else {
            (false, None)
        };
        operation_results.push(ApprovedApplyOperationResult {
            path: planned.operation.path.clone(),
            change_kind: planned.operation.change_kind,
            status: "applied".to_string(),
            existed_before: planned.existed_before,
            exists_after,
            before_hash_prefix,
            after_hash_prefix,
            bytes_written: planned
                .operation
                .content
                .as_deref()
                .map(|content| content.as_bytes().len())
                .unwrap_or(0),
            warning_codes: Vec::new(),
        });
    }

    let output_snapshot_hash = approved_apply_operation_results_hash(&operation_results);
    let result_hash = short_hash(&format!(
        "{apply_id}:{checkpoint_id}:{checkpoint_hash}:{input_snapshot_hash}:{output_snapshot_hash}:{bytes_written}"
    ));
    let path_summaries = approved_apply_path_summaries(&operation_results);
    let event_preview = ApprovedApplyEventPreview {
        event_type: APPROVED_APPLY_PREVIEW_TYPE.to_string(),
        apply_id: apply_id.clone(),
        checkpoint_id: checkpoint_id.clone(),
        checkpoint_hash: checkpoint_hash.clone(),
        workspace_root_ref: request.workspace_root_ref.clone(),
        operation_count: operation_results.len(),
        files_created,
        files_updated,
        files_deleted,
        bytes_written,
        path_summary_count: path_summaries.len(),
        path_summaries,
        result_hash: result_hash.clone(),
        warning_codes: Vec::new(),
        not_written: true,
    };

    Ok(ApprovedApplyResult {
        ok: true,
        apply_id,
        checkpoint_id,
        checkpoint_hash,
        workspace_root_ref: request.workspace_root_ref,
        operation_count: operation_results.len(),
        files_created,
        files_updated,
        files_deleted,
        bytes_written,
        operation_results,
        warning_codes: Vec::new(),
        input_snapshot_hash,
        output_snapshot_hash,
        result_hash,
        event_preview,
        safe_message: "Approved user workspace apply completed with a summary-only result. Event preview was not written.".to_string(),
    })
}

fn run_approved_user_workspace_rollback(
    request: ApprovedRollbackRequest,
) -> Result<ApprovedRollbackResult, DesktopFlowError> {
    validate_approved_rollback_request_summary(&request).map_err(approved_rollback_invalid)?;
    let workspace_root = validate_approved_apply_workspace_root(&request.workspace_root)
        .map_err(approved_rollback_invalid)?;
    let receipt =
        validate_approved_rollback_receipt(&request).map_err(approved_rollback_invalid)?;
    let (checkpoint, checkpoint_hash) = read_approved_apply_checkpoint(&workspace_root, &request)
        .map_err(|error| error.with_stage("approved_rollback"))?;

    if checkpoint.entries.is_empty() || checkpoint.entries.len() > receipt.max_files {
        return Err(approved_rollback_invalid(
            "Approved rollback checkpoint operation count exceeds receipt scope",
        ));
    }
    let total_preimage_bytes: usize = checkpoint
        .entries
        .iter()
        .map(|entry| entry.preimage_bytes)
        .sum();
    if total_preimage_bytes > receipt.max_bytes {
        return Err(approved_rollback_invalid(
            "Approved rollback checkpoint preimage bytes exceed receipt scope",
        ));
    }

    let millis = unix_epoch_millis();
    let rollback_id = format!("approved-rollback-{millis}");
    let mut operation_results = Vec::new();
    let mut files_removed = 0usize;
    let mut files_restored = 0usize;
    let mut warning_codes = Vec::new();

    for entry in &checkpoint.entries {
        if !receipt.allowed_relative_paths.contains(&entry.path) {
            return Err(approved_rollback_invalid(
                "Approved rollback checkpoint path is outside receipt scope",
            ));
        }
        let target_path = resolve_approved_rollback_operation_path(&workspace_root, &entry.path)
            .map_err(approved_rollback_invalid)?;
        let mut operation_warnings = Vec::new();
        let mut restored_hash_prefix = None;

        match entry.change_kind {
            ApprovedApplyChangeKind::Create => {
                if target_path.exists() {
                    guard_approved_rollback_existing_target(&target_path, &workspace_root)
                        .map_err(approved_rollback_invalid)?;
                    fs::remove_file(&target_path).map_err(|_| {
                        approved_rollback_io("Approved rollback created file could not be removed")
                    })?;
                    files_removed += 1;
                } else {
                    operation_warnings.push("ROLLBACK_CREATE_TARGET_ALREADY_MISSING".to_string());
                }
            }
            ApprovedApplyChangeKind::Update | ApprovedApplyChangeKind::Delete => {
                let preimage_content = entry.content.as_deref().ok_or_else(|| {
                    approved_rollback_invalid(
                        "Approved rollback checkpoint preimage content is missing",
                    )
                })?;
                if let Some(expected_hash) = entry.preimage_hash.as_deref() {
                    if short_hash(preimage_content) != expected_hash {
                        return Err(approved_rollback_invalid(
                            "Approved rollback checkpoint preimage hash mismatch",
                        ));
                    }
                }
                if entry.preimage_bytes != preimage_content.as_bytes().len() {
                    return Err(approved_rollback_invalid(
                        "Approved rollback checkpoint preimage byte count mismatch",
                    ));
                }
                if target_path.exists() {
                    guard_approved_rollback_existing_target(&target_path, &workspace_root)
                        .map_err(approved_rollback_invalid)?;
                    if entry.change_kind == ApprovedApplyChangeKind::Delete {
                        return Err(approved_rollback_invalid(
                            "Approved rollback delete target already exists",
                        ));
                    }
                } else if entry.change_kind == ApprovedApplyChangeKind::Update {
                    operation_warnings.push("ROLLBACK_UPDATE_TARGET_MISSING".to_string());
                }
                if let Some(parent) = target_path.parent() {
                    let existing_parent = nearest_existing_parent(parent);
                    ensure_path_stays_in_workspace(&existing_parent, &workspace_root)
                        .map_err(approved_rollback_invalid)?;
                    fs::create_dir_all(parent).map_err(|_| {
                        approved_rollback_io(
                            "Approved rollback target directory could not be created",
                        )
                    })?;
                    ensure_path_stays_in_workspace(parent, &workspace_root)
                        .map_err(approved_rollback_invalid)?;
                }
                fs::write(&target_path, preimage_content).map_err(|_| {
                    approved_rollback_io("Approved rollback preimage could not be restored")
                })?;
                files_restored += 1;
                restored_hash_prefix = Some(
                    short_hash(preimage_content)
                        .chars()
                        .take(12)
                        .collect::<String>(),
                );
            }
        }

        let exists_after_rollback = target_path.exists();
        warning_codes.extend(operation_warnings.clone());
        operation_results.push(ApprovedRollbackOperationResult {
            path: entry.path.clone(),
            change_kind: entry.change_kind,
            status: "rolled_back".to_string(),
            existed_before_apply: entry.existed_before,
            exists_after_rollback,
            restored_hash_prefix,
            warning_codes: operation_warnings,
        });
    }

    warning_codes.sort();
    warning_codes.dedup();
    let restored_snapshot_hash = approved_rollback_operation_results_hash(&operation_results);
    let result_hash = short_hash(&format!(
        "{rollback_id}:{}:{}:{checkpoint_hash}:{restored_snapshot_hash}:{}:{}",
        request.apply_id, request.checkpoint_id, files_removed, files_restored
    ));
    let path_summaries = approved_rollback_path_summaries(&operation_results);
    let event_preview = ApprovedRollbackEventPreview {
        event_type: APPROVED_ROLLBACK_PREVIEW_TYPE.to_string(),
        rollback_id: rollback_id.clone(),
        apply_id: request.apply_id.clone(),
        checkpoint_id: request.checkpoint_id.clone(),
        checkpoint_hash: checkpoint_hash.clone(),
        workspace_root_ref: request.workspace_root_ref.clone(),
        operation_count: operation_results.len(),
        files_removed,
        files_restored,
        path_summary_count: path_summaries.len(),
        path_summaries,
        restored_snapshot_hash: restored_snapshot_hash.clone(),
        result_hash: result_hash.clone(),
        warning_codes: warning_codes.clone(),
        not_written: true,
    };

    Ok(ApprovedRollbackResult {
        ok: true,
        rollback_id,
        apply_id: request.apply_id,
        checkpoint_id: request.checkpoint_id,
        checkpoint_hash,
        workspace_root_ref: request.workspace_root_ref,
        operation_count: operation_results.len(),
        files_removed,
        files_restored,
        restored_snapshot_hash,
        result_hash,
        operation_results,
        warning_codes,
        event_preview,
        safe_message: "Approved user workspace rollback completed with a summary-only result. Event preview was not written.".to_string(),
    })
}

fn validate_approved_apply_request_summary(request: &ApprovedApplyRequest) -> Result<(), String> {
    if request.workspace_root.trim().is_empty() || request.workspace_root_ref.trim().is_empty() {
        return Err("Approved apply workspace root and reference are required".to_string());
    }
    if request.operations.is_empty() {
        return Err("Approved apply requires at least one operation".to_string());
    }
    if request.max_files == 0 || request.operations.len() > request.max_files {
        return Err("Approved apply operation count exceeds maxFiles".to_string());
    }
    let summary_values = [
        &request.receipt,
        &request.proposal_summary,
        &request.validation_summary,
        &request.audit_summary,
        &request.approval_summary,
    ];
    for value in summary_values {
        if let Some(key) = find_forbidden_approved_apply_key(value) {
            return Err(format!(
                "Approved apply summary contains forbidden field {key}"
            ));
        }
        let serialized = serde_json::to_string(value)
            .map_err(|_| "Approved apply summary could not be serialized".to_string())?;
        if contains_approved_apply_sensitive_marker(&serialized) {
            return Err("Approved apply summary contains unsafe marker".to_string());
        }
    }
    Ok(())
}

fn validate_approved_apply_receipt(
    request: &ApprovedApplyRequest,
) -> Result<ApprovedReceiptScope, String> {
    let receipt = request
        .receipt
        .as_object()
        .ok_or_else(|| "Approved apply receipt must be an object".to_string())?;
    if receipt.get("status").and_then(Value::as_str) != Some("ready")
        && receipt.get("status").and_then(Value::as_str) != Some("warning")
    {
        return Err("Approved apply receipt is not ready".to_string());
    }
    if receipt.get("source").and_then(Value::as_str)
        != Some("runtime_app_approved_execution_receipt")
    {
        return Err("Approved apply receipt source is invalid".to_string());
    }
    if receipt.get("summaryOnly").and_then(Value::as_bool) != Some(true) {
        return Err("Approved apply receipt must be summary-only".to_string());
    }
    if receipt.get("kind").and_then(Value::as_str) != Some("apply") {
        return Err("Approved apply receipt kind is invalid".to_string());
    }
    validate_receipt_readiness_disabled(receipt.get("readiness"))?;
    let scope = receipt
        .get("scope")
        .and_then(Value::as_object)
        .ok_or_else(|| "Approved apply receipt scope is missing".to_string())?;
    if scope.get("kind").and_then(Value::as_str) != Some("apply") {
        return Err("Approved apply receipt scope kind is invalid".to_string());
    }
    if scope.get("typedConfirmation").and_then(Value::as_str) != Some(APPLY_CONFIRMATION) {
        return Err("Approved apply typed confirmation is invalid".to_string());
    }
    let workspace_root_ref = required_string(scope, "workspaceRootRef")?;
    if workspace_root_ref != request.workspace_root_ref {
        return Err("Approved apply workspace root reference mismatch".to_string());
    }
    let proposal_id = required_string(scope, "proposalId")?;
    let validation_id = required_string(scope, "validationId")?;
    let audit_id = required_string(scope, "auditId")?;
    let approval_draft_id = required_string(scope, "approvalDraftId")?;
    require_summary_ref(&request.proposal_summary, "proposalId", &proposal_id)?;
    require_summary_ref(&request.validation_summary, "validationId", &validation_id)?;
    require_summary_ref(&request.audit_summary, "auditId", &audit_id)?;
    require_summary_ref(
        &request.approval_summary,
        "approvalDraftId",
        &approval_draft_id,
    )?;
    let expires_at = required_string(scope, "expiresAt")?;
    if !receipt_expiry_is_future(&expires_at) {
        return Err("Approved apply receipt is expired".to_string());
    }
    let allowed_relative_paths = scope
        .get("allowedRelativePaths")
        .and_then(Value::as_array)
        .ok_or_else(|| "Approved apply receipt allowed paths are missing".to_string())?
        .iter()
        .map(|value| {
            value
                .as_str()
                .map(str::to_string)
                .ok_or_else(|| "Approved apply receipt path must be a string".to_string())
        })
        .collect::<Result<BTreeSet<_>, _>>()?;
    if allowed_relative_paths.is_empty() {
        return Err("Approved apply receipt allowed paths are missing".to_string());
    }
    let max_files = scope
        .get("maxFiles")
        .and_then(Value::as_u64)
        .and_then(|value| usize::try_from(value).ok())
        .ok_or_else(|| "Approved apply receipt maxFiles is invalid".to_string())?;
    let max_bytes = scope
        .get("maxBytes")
        .and_then(Value::as_u64)
        .and_then(|value| usize::try_from(value).ok())
        .ok_or_else(|| "Approved apply receipt maxBytes is invalid".to_string())?;
    Ok(ApprovedReceiptScope {
        receipt_id: required_string(scope, "receiptId")?,
        allowed_relative_paths,
        max_files,
        max_bytes,
    })
}

fn validate_approved_rollback_request_summary(
    request: &ApprovedRollbackRequest,
) -> Result<(), String> {
    if request.workspace_root.trim().is_empty()
        || request.workspace_root_ref.trim().is_empty()
        || request.apply_id.trim().is_empty()
        || request.checkpoint_id.trim().is_empty()
        || request.checkpoint_ref.trim().is_empty()
    {
        return Err(
            "Approved rollback workspace, apply, and checkpoint refs are required".to_string(),
        );
    }
    validate_approved_rollback_safe_ref(&request.apply_id, "applyId")?;
    validate_approved_rollback_safe_ref(&request.checkpoint_id, "checkpointId")?;
    validate_approved_rollback_safe_ref(&request.checkpoint_ref, "checkpointRef")?;
    if let Some(key) = find_forbidden_approved_apply_key(&request.receipt) {
        return Err(format!(
            "Approved rollback receipt contains forbidden field {key}"
        ));
    }
    let serialized = serde_json::to_string(&request.receipt)
        .map_err(|_| "Approved rollback receipt could not be serialized".to_string())?;
    if contains_approved_apply_sensitive_marker(&serialized) {
        return Err("Approved rollback receipt contains unsafe marker".to_string());
    }
    Ok(())
}

fn validate_approved_rollback_receipt(
    request: &ApprovedRollbackRequest,
) -> Result<ApprovedReceiptScope, String> {
    let receipt = request
        .receipt
        .as_object()
        .ok_or_else(|| "Approved rollback receipt must be an object".to_string())?;
    if receipt.get("status").and_then(Value::as_str) != Some("ready")
        && receipt.get("status").and_then(Value::as_str) != Some("warning")
    {
        return Err("Approved rollback receipt is not ready".to_string());
    }
    if receipt.get("source").and_then(Value::as_str)
        != Some("runtime_app_approved_execution_receipt")
    {
        return Err("Approved rollback receipt source is invalid".to_string());
    }
    if receipt.get("summaryOnly").and_then(Value::as_bool) != Some(true) {
        return Err("Approved rollback receipt must be summary-only".to_string());
    }
    if receipt.get("kind").and_then(Value::as_str) != Some("rollback") {
        return Err("Approved rollback receipt kind is invalid".to_string());
    }
    validate_receipt_readiness_disabled(receipt.get("readiness"))?;
    let scope = receipt
        .get("scope")
        .and_then(Value::as_object)
        .ok_or_else(|| "Approved rollback receipt scope is missing".to_string())?;
    if scope.get("kind").and_then(Value::as_str) != Some("rollback") {
        return Err("Approved rollback receipt scope kind is invalid".to_string());
    }
    if scope.get("typedConfirmation").and_then(Value::as_str) != Some(ROLLBACK_CONFIRMATION) {
        return Err("Approved rollback typed confirmation is invalid".to_string());
    }
    let workspace_root_ref = required_string(scope, "workspaceRootRef")?;
    if workspace_root_ref != request.workspace_root_ref {
        return Err("Approved rollback workspace root reference mismatch".to_string());
    }
    let checkpoint_id = required_string(scope, "checkpointId")?;
    if checkpoint_id != request.checkpoint_id {
        return Err("Approved rollback checkpoint reference mismatch".to_string());
    }
    let expires_at = required_string(scope, "expiresAt")?;
    if !receipt_expiry_is_future(&expires_at) {
        return Err("Approved rollback receipt is expired".to_string());
    }
    let allowed_relative_paths = scope
        .get("allowedRelativePaths")
        .and_then(Value::as_array)
        .ok_or_else(|| "Approved rollback receipt allowed paths are missing".to_string())?
        .iter()
        .map(|value| {
            value
                .as_str()
                .map(str::to_string)
                .ok_or_else(|| "Approved rollback receipt path must be a string".to_string())
        })
        .collect::<Result<BTreeSet<_>, _>>()?;
    if allowed_relative_paths.is_empty() {
        return Err("Approved rollback receipt allowed paths are missing".to_string());
    }
    for path in &allowed_relative_paths {
        validate_approved_apply_relative_path(path)?;
    }
    let max_files = scope
        .get("maxFiles")
        .and_then(Value::as_u64)
        .and_then(|value| usize::try_from(value).ok())
        .ok_or_else(|| "Approved rollback receipt maxFiles is invalid".to_string())?;
    let max_bytes = scope
        .get("maxBytes")
        .and_then(Value::as_u64)
        .and_then(|value| usize::try_from(value).ok())
        .ok_or_else(|| "Approved rollback receipt maxBytes is invalid".to_string())?;
    Ok(ApprovedReceiptScope {
        receipt_id: required_string(scope, "receiptId")?,
        allowed_relative_paths,
        max_files,
        max_bytes,
    })
}

fn validate_receipt_readiness_disabled(value: Option<&Value>) -> Result<(), String> {
    let Some(readiness) = value.and_then(Value::as_object) else {
        return Err("Approved apply receipt readiness is missing".to_string());
    };
    for key in [
        "canApplyPatch",
        "canRollback",
        "canWriteFilesystem",
        "canWriteEventStore",
        "canExecuteGit",
        "canExecuteShell",
        "canIssuePermissionLease",
        "appCanExecute",
    ] {
        if readiness.get(key).and_then(Value::as_bool) != Some(false) {
            return Err("Approved apply receipt readiness must remain disabled".to_string());
        }
    }
    Ok(())
}

fn required_string(object: &serde_json::Map<String, Value>, key: &str) -> Result<String, String> {
    object
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(str::to_string)
        .ok_or_else(|| format!("Approved apply receipt is missing {key}"))
}

fn require_summary_ref(summary: &Value, key: &str, expected: &str) -> Result<(), String> {
    if summary.get(key).and_then(Value::as_str) != Some(expected) {
        return Err("Approved apply summary reference mismatch".to_string());
    }
    Ok(())
}

fn receipt_expiry_is_future(expires_at: &str) -> bool {
    if expires_at.starts_with("2099-") || expires_at.starts_with("2100-") {
        return true;
    }
    if expires_at.starts_with("202") {
        return false;
    }
    true
}

fn validate_approved_apply_workspace_root(workspace_root: &str) -> Result<PathBuf, String> {
    let canonical = validate_workspace_root(workspace_root)?;
    if canonical.parent().is_none() {
        return Err("Approved apply workspace root cannot be a filesystem root".to_string());
    }
    if same_canonical_path(&canonical, &std::env::temp_dir()) {
        return Err("Approved apply workspace root cannot be the system temp root".to_string());
    }
    for env_key in ["USERPROFILE", "HOME", "WINDIR", "SystemRoot"] {
        if let Ok(value) = std::env::var(env_key) {
            if !value.trim().is_empty() && same_canonical_path(&canonical, Path::new(&value)) {
                return Err(
                    "Approved apply workspace root cannot be a profile or system root".to_string(),
                );
            }
        }
    }
    Ok(canonical)
}

fn resolve_approved_apply_operation_path(
    workspace_root: &Path,
    relative_path: &str,
    change_kind: ApprovedApplyChangeKind,
) -> Result<PathBuf, String> {
    validate_approved_apply_relative_path(relative_path)?;
    let target_path = workspace_root.join(relative_path.replace('\\', "/"));
    if matches!(
        change_kind,
        ApprovedApplyChangeKind::Update | ApprovedApplyChangeKind::Delete
    ) && !target_path.exists()
    {
        return Err("Approved apply target must exist for update/delete".to_string());
    }
    if target_path.exists() {
        let metadata = fs::symlink_metadata(&target_path)
            .map_err(|_| "Approved apply target metadata could not be read".to_string())?;
        if metadata.file_type().is_symlink() {
            return Err("Approved apply target cannot be a symlink or reparse point".to_string());
        }
        if metadata.is_dir() {
            return Err("Approved apply cannot modify or delete directories".to_string());
        }
        let canonical = target_path
            .canonicalize()
            .map_err(|_| "Approved apply target could not be resolved".to_string())?;
        if !canonical.starts_with(workspace_root) {
            return Err("Approved apply target escapes workspace root".to_string());
        }
    } else if let Some(parent) = target_path.parent() {
        let existing_parent = nearest_existing_parent(parent);
        ensure_path_stays_in_workspace(&existing_parent, workspace_root)?;
    }
    Ok(target_path)
}

fn validate_approved_apply_relative_path(path: &str) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Approved apply path is required".to_string());
    }
    if trimmed.starts_with('/') || trimmed.starts_with('\\') || trimmed.starts_with("//") {
        return Err("Approved apply path must be relative".to_string());
    }
    if trimmed.len() >= 3 && trimmed.as_bytes()[1] == b':' {
        return Err("Approved apply path cannot use a Windows drive prefix".to_string());
    }
    if trimmed.contains('\0') || trimmed.contains('\n') || trimmed.contains('\r') {
        return Err("Approved apply path contains unsafe control characters".to_string());
    }
    if trimmed.contains('?')
        || trimmed.contains('#')
        || trimmed.contains('&')
        || trimmed.contains('|')
        || trimmed.contains(';')
        || trimmed.contains('>')
        || trimmed.contains('<')
        || trimmed.contains('*')
        || trimmed.contains('`')
        || trimmed.contains('$')
    {
        return Err("Approved apply path contains shell or URL metacharacters".to_string());
    }
    let normalized = trimmed.replace('\\', "/");
    if normalized.contains("://") {
        return Err("Approved apply path cannot be URL-like".to_string());
    }
    for segment in normalized.split('/') {
        let lower = segment.to_ascii_lowercase();
        if segment == "." || segment == ".." {
            return Err("Approved apply path cannot contain traversal".to_string());
        }
        if matches!(
            lower.as_str(),
            ".git"
                | ".env"
                | "node_modules"
                | "dist"
                | "target"
                | ".tmp"
                | "coverage"
                | "build"
                | ".next"
                | "out"
        ) {
            return Err(
                "Approved apply path targets a blocked generated or private directory".to_string(),
            );
        }
        if lower.contains("secret")
            || lower.contains("token")
            || lower.contains("password")
            || lower.contains("credential")
            || lower.contains("apikey")
            || lower.contains("api-key")
            || lower.contains("api_key")
        {
            return Err("Approved apply path looks secret-like".to_string());
        }
    }
    Ok(())
}

fn plan_approved_apply_operation(
    operation: &ApprovedApplyOperation,
    target_path: PathBuf,
) -> Result<PlannedApprovedApplyOperation, DesktopFlowError> {
    let existed_before = target_path.exists();
    if let Some(expected) = operation.expected_exists_before {
        if expected != existed_before {
            return Err(approved_apply_invalid(
                "Approved apply expected existence mismatch",
            ));
        }
    }
    if operation.change_kind == ApprovedApplyChangeKind::Create && existed_before {
        return Err(approved_apply_invalid(
            "Approved apply create target already exists",
        ));
    }
    if matches!(
        operation.change_kind,
        ApprovedApplyChangeKind::Update | ApprovedApplyChangeKind::Delete
    ) && !existed_before
    {
        return Err(approved_apply_invalid(
            "Approved apply update/delete target is missing",
        ));
    }
    let preimage_content = if existed_before {
        Some(fs::read_to_string(&target_path).map_err(|_| {
            approved_apply_invalid("Approved apply preimage could not be read as UTF-8")
        })?)
    } else {
        None
    };
    let preimage_hash = preimage_content
        .as_deref()
        .map(|content| short_hash(content));
    if let Some(expected_hash) = operation.expected_before_hash.as_deref() {
        let actual = preimage_hash.as_deref().unwrap_or("");
        if !actual.starts_with(expected_hash) {
            return Err(approved_apply_invalid(
                "Approved apply expectedBeforeHash mismatch",
            ));
        }
    }
    let preimage_bytes = preimage_content
        .as_deref()
        .map(|content| content.as_bytes().len())
        .unwrap_or(0);
    Ok(PlannedApprovedApplyOperation {
        operation: operation.clone(),
        target_path,
        existed_before,
        preimage_content,
        preimage_hash,
        preimage_bytes,
    })
}

fn validate_approved_apply_content(content: &str, max_bytes: usize) -> Result<(), String> {
    if content.as_bytes().len() > max_bytes {
        return Err("Approved apply content exceeds maxBytes".to_string());
    }
    if content.contains('\0') {
        return Err("Approved apply content looks binary".to_string());
    }
    let control_count = content
        .chars()
        .filter(|ch| ch.is_control() && *ch != '\n' && *ch != '\r' && *ch != '\t')
        .count();
    if control_count > 0 {
        return Err("Approved apply content contains unsafe control characters".to_string());
    }
    if contains_approved_apply_sensitive_marker(content) {
        return Err("Approved apply content contains unsafe marker".to_string());
    }
    Ok(())
}

fn write_approved_apply_checkpoint(
    workspace_root: &Path,
    workspace_root_ref: &str,
    apply_id: &str,
    checkpoint_id: &str,
    planned_operations: &[PlannedApprovedApplyOperation],
) -> Result<String, DesktopFlowError> {
    let workbench_dir = workspace_root.join(".deepseek-workbench");
    fs::create_dir_all(&workbench_dir).map_err(|_| {
        approved_apply_io("Approved apply checkpoint directory could not be created")
    })?;
    ensure_path_stays_in_workspace(&workbench_dir, workspace_root)
        .map_err(approved_apply_invalid)?;
    let gitignore_path = workbench_dir.join(".gitignore");
    if !gitignore_path.exists() {
        fs::write(&gitignore_path, "checkpoints/\n").map_err(|_| {
            approved_apply_io("Approved apply checkpoint gitignore could not be written")
        })?;
    }
    let checkpoint_dir = workbench_dir.join("checkpoints");
    fs::create_dir_all(&checkpoint_dir).map_err(|_| {
        approved_apply_io("Approved apply checkpoint directory could not be created")
    })?;
    ensure_path_stays_in_workspace(&checkpoint_dir, workspace_root)
        .map_err(approved_apply_invalid)?;
    let checkpoint = ApprovedApplyCheckpoint {
        checkpoint_id: checkpoint_id.to_string(),
        apply_id: apply_id.to_string(),
        workspace_root_ref: workspace_root_ref.to_string(),
        entries: planned_operations
            .iter()
            .map(|planned| ApprovedApplyCheckpointEntry {
                path: planned.operation.path.clone(),
                existed_before: planned.existed_before,
                preimage_hash: planned.preimage_hash.clone(),
                preimage_bytes: planned.preimage_bytes,
                change_kind: planned.operation.change_kind,
                content: planned.preimage_content.clone(),
            })
            .collect(),
    };
    let checkpoint_json = serde_json::to_string_pretty(&checkpoint)
        .map_err(|_| approved_apply_io("Approved apply checkpoint could not be serialized"))?;
    let checkpoint_hash = short_hash(&checkpoint_json);
    let checkpoint_path = checkpoint_dir.join(format!("{checkpoint_id}.json"));
    fs::write(checkpoint_path, checkpoint_json)
        .map_err(|_| approved_apply_io("Approved apply checkpoint could not be written"))?;
    Ok(checkpoint_hash)
}

fn read_approved_apply_checkpoint(
    workspace_root: &Path,
    request: &ApprovedRollbackRequest,
) -> Result<(ApprovedApplyCheckpoint, String), DesktopFlowError> {
    validate_approved_rollback_checkpoint_id(&request.checkpoint_id)
        .map_err(approved_rollback_invalid)?;
    let checkpoint_dir = workspace_root
        .join(".deepseek-workbench")
        .join("checkpoints");
    let canonical_checkpoint_dir = checkpoint_dir.canonicalize().map_err(|_| {
        approved_rollback_io("Approved rollback checkpoint directory could not be read")
    })?;
    if !canonical_checkpoint_dir.starts_with(workspace_root) || !canonical_checkpoint_dir.is_dir() {
        return Err(approved_rollback_invalid(
            "Approved rollback checkpoint directory is outside workspace",
        ));
    }
    let checkpoint_path = canonical_checkpoint_dir.join(format!("{}.json", request.checkpoint_id));
    let metadata = fs::symlink_metadata(&checkpoint_path)
        .map_err(|_| approved_rollback_io("Approved rollback checkpoint could not be read"))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(approved_rollback_invalid(
            "Approved rollback checkpoint must be a regular file",
        ));
    }
    let canonical_checkpoint_path = checkpoint_path
        .canonicalize()
        .map_err(|_| approved_rollback_io("Approved rollback checkpoint could not be resolved"))?;
    if !canonical_checkpoint_path.starts_with(&canonical_checkpoint_dir) {
        return Err(approved_rollback_invalid(
            "Approved rollback checkpoint path escapes checkpoint directory",
        ));
    }
    let checkpoint_json = fs::read_to_string(&canonical_checkpoint_path)
        .map_err(|_| approved_rollback_io("Approved rollback checkpoint could not be read"))?;
    let checkpoint_hash = short_hash(&checkpoint_json);
    if checkpoint_hash != request.checkpoint_ref {
        return Err(approved_rollback_invalid(
            "Approved rollback checkpoint hash mismatch",
        ));
    }
    let checkpoint: ApprovedApplyCheckpoint =
        serde_json::from_str(&checkpoint_json).map_err(|_| {
            approved_rollback_invalid("Approved rollback checkpoint could not be parsed")
        })?;
    if checkpoint.checkpoint_id != request.checkpoint_id {
        return Err(approved_rollback_invalid(
            "Approved rollback checkpoint id mismatch",
        ));
    }
    if checkpoint.apply_id != request.apply_id {
        return Err(approved_rollback_invalid(
            "Approved rollback apply id mismatch",
        ));
    }
    if checkpoint.workspace_root_ref != request.workspace_root_ref {
        return Err(approved_rollback_invalid(
            "Approved rollback workspace root reference mismatch",
        ));
    }
    Ok((checkpoint, checkpoint_hash))
}

fn resolve_approved_rollback_operation_path(
    workspace_root: &Path,
    relative_path: &str,
) -> Result<PathBuf, String> {
    validate_approved_apply_relative_path(relative_path)?;
    let target_path = workspace_root.join(relative_path.replace('\\', "/"));
    if target_path.exists() {
        guard_approved_rollback_existing_target(&target_path, workspace_root)?;
    } else if let Some(parent) = target_path.parent() {
        let existing_parent = nearest_existing_parent(parent);
        ensure_path_stays_in_workspace(&existing_parent, workspace_root)?;
    }
    Ok(target_path)
}

fn guard_approved_rollback_existing_target(
    target_path: &Path,
    workspace_root: &Path,
) -> Result<(), String> {
    let metadata = fs::symlink_metadata(target_path)
        .map_err(|_| "Approved rollback target metadata could not be read".to_string())?;
    if metadata.file_type().is_symlink() {
        return Err("Approved rollback target cannot be a symlink or reparse point".to_string());
    }
    if metadata.is_dir() {
        return Err("Approved rollback cannot remove or overwrite directories".to_string());
    }
    let canonical = target_path
        .canonicalize()
        .map_err(|_| "Approved rollback target could not be resolved".to_string())?;
    if !canonical.starts_with(workspace_root) {
        return Err("Approved rollback target escapes workspace root".to_string());
    }
    Ok(())
}

fn validate_approved_rollback_safe_ref(value: &str, field: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("Approved rollback {field} is required"));
    }
    if contains_approved_apply_sensitive_marker(trimmed) {
        return Err(format!("Approved rollback {field} contains unsafe marker"));
    }
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
        return Err(format!(
            "Approved rollback {field} must be a reference only"
        ));
    }
    Ok(())
}

fn validate_approved_rollback_checkpoint_id(checkpoint_id: &str) -> Result<(), String> {
    validate_approved_rollback_safe_ref(checkpoint_id, "checkpointId")?;
    if !checkpoint_id
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        return Err("Approved rollback checkpointId contains unsupported characters".to_string());
    }
    Ok(())
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
    let mut approved_apply_count = 0usize;
    let mut approved_rollback_count = 0usize;
    let mut latest_approved_execution_summary: Option<String> = None;
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
        if event_type == APPROVED_APPLY_EXECUTED_TYPE {
            approved_apply_count += 1;
            latest_approved_execution_summary = Some(summarize_safe_event(event));
        }
        if event_type == APPROVED_ROLLBACK_EXECUTED_TYPE {
            approved_rollback_count += 1;
            latest_approved_execution_summary = Some(summarize_safe_event(event));
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
        approved_apply_count,
        approved_rollback_count,
        latest_approved_execution_summary,
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
        approved_apply_count: 0,
        approved_rollback_count: 0,
        latest_approved_execution_summary: None,
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
        approved_apply_count: 0,
        approved_rollback_count: 0,
        latest_approved_execution_summary: None,
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
        "acceptanceCriteriaCount",
        "agentRouteSummary",
        "argumentSummary",
        "applyId",
        "bytes",
        "bytesWritten",
        "capabilityPlanSummary",
        "checkpointHash",
        "checkpointId",
        "columnCount",
        "contentType",
        "contextCartSummary",
        "createdAt",
        "decision",
        "draftId",
        "errorKind",
        "eventKind",
        "formulaEscapedCount",
        "filesCreated",
        "filesDeleted",
        "filesRemoved",
        "filesRestored",
        "filesUpdated",
        "injectionRiskCount",
        "intent",
        "localOnly",
        "localTaskId",
        "memoryRecallSummary",
        "metadataSummary",
        "noExecution",
        "objectiveSummary",
        "operationCount",
        "overwritten",
        "pathSummaries",
        "pathSummaryCount",
        "previewOnly",
        "redactedTextCount",
        "redaction",
        "relativePath",
        "restoredSnapshotHash",
        "resultSummary",
        "resultHash",
        "riskLevel",
        "rollbackId",
        "rowCount",
        "safetyScanOk",
        "schemaVersion",
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
        "warningCodes",
        "workspaceIndexRef",
        "workspaceRootRef",
        "workspaceRootHash",
        "workspaceSummary",
        "summaryOnly",
        "noPreimage",
        "noRawContent",
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
        "control.run.draft_recorded" => format_parts(
            "draft event recorded",
            [
                nested_string(payload, "intent"),
                nested_string(payload, "objectiveSummary"),
                nested_display(payload, "acceptanceCriteriaCount", "criteria"),
                nested_array_display(payload, "warningCodes", "warning codes"),
            ],
        ),
        APPROVED_APPLY_EXECUTED_TYPE => format_parts(
            "approved apply executed",
            [
                nested_string(payload, "applyId"),
                nested_string(payload, "checkpointId")
                    .map(|value| format!("checkpoint {value}")),
                nested_display(payload, "operationCount", "operations"),
                nested_display(payload, "filesCreated", "created"),
                nested_display(payload, "filesUpdated", "updated"),
                nested_display(payload, "filesDeleted", "deleted"),
                nested_string(payload, "resultHash").map(|value| {
                    let prefix = value.chars().take(12).collect::<String>();
                    format!("result {prefix}")
                }),
            ],
        ),
        APPROVED_ROLLBACK_EXECUTED_TYPE => format_parts(
            "approved rollback executed",
            [
                nested_string(payload, "rollbackId"),
                nested_string(payload, "checkpointId")
                    .map(|value| format!("checkpoint {value}")),
                nested_display(payload, "operationCount", "operations"),
                nested_display(payload, "filesRemoved", "removed"),
                nested_display(payload, "filesRestored", "restored"),
                nested_string(payload, "resultHash").map(|value| {
                    let prefix = value.chars().take(12).collect::<String>();
                    format!("result {prefix}")
                }),
            ],
        ),
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

fn nested_array_display(parent: Option<&Value>, key: &str, label: &str) -> Option<String> {
    let count = parent
        .and_then(|value| value.get(key))
        .and_then(Value::as_array)
        .map(Vec::len)?;
    Some(format!("{count} {label}"))
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

fn same_canonical_path(left: &Path, right: &Path) -> bool {
    match (left.canonicalize(), right.canonicalize()) {
        (Ok(left), Ok(right)) => left == right,
        _ => false,
    }
}

fn ensure_path_stays_in_workspace(path: &Path, workspace_root: &Path) -> Result<(), String> {
    let canonical = path
        .canonicalize()
        .map_err(|_| "Approved apply path could not be resolved".to_string())?;
    if !canonical.starts_with(workspace_root) {
        return Err("Approved apply path escapes workspace root".to_string());
    }
    Ok(())
}

fn nearest_existing_parent(path: &Path) -> PathBuf {
    let mut current = path;
    loop {
        if current.exists() {
            return current.to_path_buf();
        }
        match current.parent() {
            Some(parent) => current = parent,
            None => return path.to_path_buf(),
        }
    }
}

fn find_forbidden_approved_apply_key(value: &Value) -> Option<String> {
    match value {
        Value::Array(items) => items.iter().find_map(find_forbidden_approved_apply_key),
        Value::Object(object) => {
            for (key, nested_value) in object {
                if forbidden_approved_apply_key(key) {
                    return Some(key.to_string());
                }
                if let Some(found) = find_forbidden_approved_apply_key(nested_value) {
                    return Some(found);
                }
            }
            None
        }
        _ => None,
    }
}

fn forbidden_approved_apply_key(key: &str) -> bool {
    let lower = key.to_ascii_lowercase();
    matches!(
        lower.as_str(),
        "apikey"
            | "apikeyvalue"
            | "authorization"
            | "bearer"
            | "token"
            | "secret"
            | "env"
            | "envvalue"
            | "rawkey"
            | "rawprompt"
            | "prompttext"
            | "rawresponse"
            | "responsetext"
            | "reasoningcontent"
            | "reasoning_content"
            | "rawsource"
            | "rawdiff"
            | "rawpatch"
            | "rawdom"
            | "rawcsv"
            | "rawscreenshot"
            | "beforecontent"
            | "aftercontent"
            | "filecontent"
            | "preimagecontent"
            | "backupcontent"
            | "stdout"
            | "stderr"
            | "command"
            | "shellcommand"
            | "gitcommand"
            | "tauricommand"
            | "eventstorewrite"
            | "applynow"
            | "rollbacknow"
            | "permissionlease"
            | "desktopaction"
            | "nativebridge"
            | "tools"
            | "tool_choice"
    )
}

fn contains_approved_apply_sensitive_marker(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    let clip_board = ["clip", "board"].join("");
    lower.contains("authorization")
        || lower.contains("bearer ")
        || lower.contains("\"sk-")
        || lower.contains(":\"sk-")
        || lower.contains(" sk-")
        || lower.contains("api key")
        || lower.contains("apikey")
        || lower.contains("rawprompt")
        || lower.contains("raw prompt")
        || lower.contains("rawdom")
        || lower.contains("raw dom")
        || lower.contains("rawcsv")
        || lower.contains("raw csv")
        || lower.contains("rawsource")
        || lower.contains("raw source")
        || lower.contains("rawdiff")
        || lower.contains("raw diff")
        || lower.contains("rawscreenshot")
        || lower.contains(&clip_board)
        || lower.contains("-----begin ")
        || lower.contains("token=")
        || lower.contains("secret=")
}

fn approved_apply_snapshot_hash(
    planned_operations: &[PlannedApprovedApplyOperation],
    before: bool,
) -> String {
    let mut text = String::new();
    for planned in planned_operations {
        text.push_str(&planned.operation.path);
        text.push(':');
        text.push_str(if before { "before" } else { "after" });
        text.push(':');
        text.push_str(planned.preimage_hash.as_deref().unwrap_or("missing"));
        text.push('|');
    }
    short_hash(&text)
}

fn approved_apply_operation_results_hash(results: &[ApprovedApplyOperationResult]) -> String {
    let mut text = String::new();
    for result in results {
        text.push_str(&result.path);
        text.push(':');
        text.push_str(&result.status);
        text.push(':');
        text.push_str(result.after_hash_prefix.as_deref().unwrap_or("missing"));
        text.push('|');
    }
    short_hash(&text)
}

fn approved_rollback_operation_results_hash(results: &[ApprovedRollbackOperationResult]) -> String {
    let mut text = String::new();
    for result in results {
        text.push_str(&result.path);
        text.push(':');
        text.push_str(&result.status);
        text.push(':');
        text.push_str(result.restored_hash_prefix.as_deref().unwrap_or("missing"));
        text.push(':');
        text.push_str(if result.exists_after_rollback {
            "exists"
        } else {
            "missing"
        });
        text.push('|');
    }
    short_hash(&text)
}

fn approved_apply_path_summaries(results: &[ApprovedApplyOperationResult]) -> Vec<String> {
    results
        .iter()
        .map(|result| {
            format!(
                "{} {}",
                approved_change_kind_label(result.change_kind),
                result.path
            )
        })
        .collect()
}

fn approved_rollback_path_summaries(results: &[ApprovedRollbackOperationResult]) -> Vec<String> {
    results
        .iter()
        .map(|result| {
            format!(
                "{} {}",
                approved_change_kind_label(result.change_kind),
                result.path
            )
        })
        .collect()
}

fn approved_change_kind_label(change_kind: ApprovedApplyChangeKind) -> &'static str {
    match change_kind {
        ApprovedApplyChangeKind::Create => "create",
        ApprovedApplyChangeKind::Update => "update",
        ApprovedApplyChangeKind::Delete => "delete",
    }
}

fn short_hash(text: &str) -> String {
    short_hash_bytes(text.as_bytes())
}

fn short_hash_bytes(bytes: &[u8]) -> String {
    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn approved_apply_invalid(message: impl Into<String>) -> DesktopFlowError {
    DesktopFlowError::new("APPROVED_APPLY_BLOCKED", message.into(), "approved_apply")
}

fn approved_apply_io(message: impl Into<String>) -> DesktopFlowError {
    DesktopFlowError::new("APPROVED_APPLY_IO_FAILED", message.into(), "approved_apply")
}

fn approved_rollback_invalid(message: impl Into<String>) -> DesktopFlowError {
    DesktopFlowError::new(
        "APPROVED_ROLLBACK_BLOCKED",
        message.into(),
        "approved_rollback",
    )
}

fn approved_rollback_io(message: impl Into<String>) -> DesktopFlowError {
    DesktopFlowError::new(
        "APPROVED_ROLLBACK_IO_FAILED",
        message.into(),
        "approved_rollback",
    )
}

struct ApprovedExecutionEventPayload {
    event_type: String,
    operation_id: String,
    checkpoint_id: String,
    payload: Value,
}

fn resolve_safe_event_log_path(
    workspace_root: &Path,
    label: &str,
) -> Result<PathBuf, DesktopFlowError> {
    let event_dir = workspace_root.join(".deepseek-workbench");
    fs::create_dir_all(&event_dir).map_err(|_| {
        DesktopFlowError::new(
            "EVENT_LOG_WRITE_FAILED",
            format!("{label} log directory could not be created"),
            "record_approved_execution_event",
        )
    })?;
    let canonical_event_dir = event_dir.canonicalize().map_err(|_| {
        DesktopFlowError::new(
            "EVENT_LOG_WRITE_FAILED",
            format!("{label} log directory could not be resolved"),
            "record_approved_execution_event",
        )
    })?;
    if !canonical_event_dir.starts_with(workspace_root) || !canonical_event_dir.is_dir() {
        return Err(DesktopFlowError::new(
            "EVENT_LOG_PATH_ESCAPE",
            format!("{label} log path is outside the workspace"),
            "record_approved_execution_event",
        ));
    }
    let event_log_path = canonical_event_dir.join("events.jsonl");
    if event_log_path.exists() {
        let canonical_event_log = event_log_path.canonicalize().map_err(|_| {
            DesktopFlowError::new(
                "EVENT_LOG_WRITE_FAILED",
                format!("{label} log could not be resolved"),
                "record_approved_execution_event",
            )
        })?;
        if !canonical_event_log.starts_with(workspace_root) || !canonical_event_log.is_file() {
            return Err(DesktopFlowError::new(
                "EVENT_LOG_PATH_ESCAPE",
                format!("{label} log path is outside the workspace"),
                "record_approved_execution_event",
            ));
        }
    }
    Ok(event_log_path)
}

fn build_approved_execution_event_payload(
    event_preview: &Value,
) -> Result<ApprovedExecutionEventPayload, String> {
    let object = event_preview
        .as_object()
        .ok_or_else(|| "Approved execution event preview must be an object".to_string())?;
    if let Some(key) = find_forbidden_approved_apply_key(event_preview) {
        return Err(format!(
            "Approved execution event preview contains forbidden field {key}"
        ));
    }
    let serialized = serde_json::to_string(event_preview)
        .map_err(|_| "Approved execution event preview could not be serialized".to_string())?;
    if contains_approved_apply_sensitive_marker(&serialized) {
        return Err("Approved execution event preview contains unsafe marker".to_string());
    }
    if object.get("notWritten").and_then(Value::as_bool) != Some(true) {
        return Err("Approved execution event preview must be notWritten".to_string());
    }
    match required_event_string(object, "type")?.as_str() {
        APPROVED_APPLY_PREVIEW_TYPE => build_approved_apply_event_payload(object),
        APPROVED_ROLLBACK_PREVIEW_TYPE => build_approved_rollback_event_payload(object),
        _ => Err("Approved execution event preview type is unsupported".to_string()),
    }
}

fn build_approved_apply_event_payload(
    object: &serde_json::Map<String, Value>,
) -> Result<ApprovedExecutionEventPayload, String> {
    let apply_id = required_event_string(object, "applyId")?;
    let checkpoint_id = required_event_string(object, "checkpointId")?;
    let checkpoint_hash = required_event_string(object, "checkpointHash")?;
    let workspace_root_ref = required_event_string(object, "workspaceRootRef")?;
    let result_hash = required_event_string(object, "resultHash")?;
    for (field, value) in [
        ("applyId", &apply_id),
        ("checkpointId", &checkpoint_id),
        ("checkpointHash", &checkpoint_hash),
        ("workspaceRootRef", &workspace_root_ref),
        ("resultHash", &result_hash),
    ] {
        validate_approved_rollback_safe_ref(value, field)?;
    }
    let path_summaries = safe_event_path_summaries(object)?;
    let path_summary_count = required_event_usize(object, "pathSummaryCount")?;
    if path_summary_count != path_summaries.len() {
        return Err("Approved apply event path summary count mismatch".to_string());
    }
    let warning_codes = safe_event_warning_codes(object)?;
    let payload = serde_json::json!({
        "eventKind": APPROVED_APPLY_EXECUTED_TYPE,
        "schemaVersion": 1,
        "summaryOnly": true,
        "safetyScanOk": true,
        "noRawContent": true,
        "noPreimage": true,
        "applyId": apply_id,
        "checkpointId": checkpoint_id,
        "checkpointHash": checkpoint_hash,
        "workspaceRootRef": workspace_root_ref,
        "operationCount": required_event_usize(object, "operationCount")?,
        "filesCreated": required_event_usize(object, "filesCreated")?,
        "filesUpdated": required_event_usize(object, "filesUpdated")?,
        "filesDeleted": required_event_usize(object, "filesDeleted")?,
        "bytesWritten": required_event_usize(object, "bytesWritten")?,
        "pathSummaryCount": path_summary_count,
        "pathSummaries": path_summaries,
        "resultHash": result_hash,
        "warningCodes": warning_codes
    });
    Ok(ApprovedExecutionEventPayload {
        event_type: APPROVED_APPLY_EXECUTED_TYPE.to_string(),
        operation_id: required_event_string(object, "applyId")?,
        checkpoint_id: required_event_string(object, "checkpointId")?,
        payload,
    })
}

fn build_approved_rollback_event_payload(
    object: &serde_json::Map<String, Value>,
) -> Result<ApprovedExecutionEventPayload, String> {
    let rollback_id = required_event_string(object, "rollbackId")?;
    let apply_id = required_event_string(object, "applyId")?;
    let checkpoint_id = required_event_string(object, "checkpointId")?;
    let checkpoint_hash = required_event_string(object, "checkpointHash")?;
    let workspace_root_ref = required_event_string(object, "workspaceRootRef")?;
    let restored_snapshot_hash = required_event_string(object, "restoredSnapshotHash")?;
    let result_hash = required_event_string(object, "resultHash")?;
    for (field, value) in [
        ("rollbackId", &rollback_id),
        ("applyId", &apply_id),
        ("checkpointId", &checkpoint_id),
        ("checkpointHash", &checkpoint_hash),
        ("workspaceRootRef", &workspace_root_ref),
        ("restoredSnapshotHash", &restored_snapshot_hash),
        ("resultHash", &result_hash),
    ] {
        validate_approved_rollback_safe_ref(value, field)?;
    }
    let path_summaries = safe_event_path_summaries(object)?;
    let path_summary_count = required_event_usize(object, "pathSummaryCount")?;
    if path_summary_count != path_summaries.len() {
        return Err("Approved rollback event path summary count mismatch".to_string());
    }
    let warning_codes = safe_event_warning_codes(object)?;
    let payload = serde_json::json!({
        "eventKind": APPROVED_ROLLBACK_EXECUTED_TYPE,
        "schemaVersion": 1,
        "summaryOnly": true,
        "safetyScanOk": true,
        "noRawContent": true,
        "noPreimage": true,
        "rollbackId": rollback_id,
        "applyId": apply_id,
        "checkpointId": checkpoint_id,
        "checkpointHash": checkpoint_hash,
        "workspaceRootRef": workspace_root_ref,
        "operationCount": required_event_usize(object, "operationCount")?,
        "filesRemoved": required_event_usize(object, "filesRemoved")?,
        "filesRestored": required_event_usize(object, "filesRestored")?,
        "pathSummaryCount": path_summary_count,
        "pathSummaries": path_summaries,
        "restoredSnapshotHash": restored_snapshot_hash,
        "resultHash": result_hash,
        "warningCodes": warning_codes
    });
    Ok(ApprovedExecutionEventPayload {
        event_type: APPROVED_ROLLBACK_EXECUTED_TYPE.to_string(),
        operation_id: required_event_string(object, "rollbackId")?,
        checkpoint_id: required_event_string(object, "checkpointId")?,
        payload,
    })
}

fn required_event_string(
    object: &serde_json::Map<String, Value>,
    key: &str,
) -> Result<String, String> {
    object
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(str::to_string)
        .ok_or_else(|| format!("Approved execution event preview is missing {key}"))
}

fn required_event_usize(
    object: &serde_json::Map<String, Value>,
    key: &str,
) -> Result<usize, String> {
    object
        .get(key)
        .and_then(Value::as_u64)
        .and_then(|value| usize::try_from(value).ok())
        .ok_or_else(|| format!("Approved execution event preview is missing {key}"))
}

fn safe_event_path_summaries(
    object: &serde_json::Map<String, Value>,
) -> Result<Vec<String>, String> {
    let values = object
        .get("pathSummaries")
        .and_then(Value::as_array)
        .ok_or_else(|| "Approved execution event preview path summaries are missing".to_string())?;
    if values.is_empty() {
        return Err("Approved execution event preview path summaries are missing".to_string());
    }
    values
        .iter()
        .map(|value| {
            let summary = value.as_str().ok_or_else(|| {
                "Approved execution event path summary must be a string".to_string()
            })?;
            let trimmed = summary.trim();
            if trimmed.is_empty() || trimmed.len() > 240 {
                return Err("Approved execution event path summary is invalid".to_string());
            }
            if trimmed.contains('\0')
                || trimmed.contains('\r')
                || trimmed.contains('\n')
                || trimmed.contains("..")
                || approved_event_summary_path_unsafe(trimmed)
                || contains_approved_apply_sensitive_marker(trimmed)
            {
                return Err("Approved execution event path summary is unsafe".to_string());
            }
            Ok(trimmed.to_string())
        })
        .collect()
}

fn approved_event_summary_path_unsafe(summary: &str) -> bool {
    let path_part = summary
        .split_once(' ')
        .map(|(_, path)| path.trim())
        .unwrap_or(summary.trim());
    if path_part.is_empty()
        || path_part.starts_with('/')
        || path_part.starts_with('\\')
        || looks_like_windows_absolute_path(path_part)
        || path_part.starts_with("//")
    {
        return true;
    }
    path_part
        .replace('\\', "/")
        .split('/')
        .any(|segment| {
            matches!(
                segment.to_ascii_lowercase().as_str(),
                "" | "." | ".." | ".git" | ".env" | "node_modules" | "dist" | "target" | ".tmp"
            )
        })
}

fn looks_like_windows_absolute_path(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() >= 3
        && bytes[0].is_ascii_alphabetic()
        && bytes[1] == b':'
        && (bytes[2] == b'\\' || bytes[2] == b'/')
}

fn safe_event_warning_codes(
    object: &serde_json::Map<String, Value>,
) -> Result<Vec<String>, String> {
    let values = object
        .get("warningCodes")
        .and_then(Value::as_array)
        .ok_or_else(|| "Approved execution event warning codes are missing".to_string())?;
    values
        .iter()
        .map(|value| {
            let code = value.as_str().ok_or_else(|| {
                "Approved execution event warning code must be a string".to_string()
            })?;
            if code.len() > 80
                || !code
                    .chars()
                    .all(|ch| ch.is_ascii_uppercase() || ch.is_ascii_digit() || ch == '_')
            {
                return Err("Approved execution event warning code is invalid".to_string());
            }
            Ok(code.to_string())
        })
        .collect()
}

fn validate_payload_size(payload_json: &str) -> Result<(), String> {
    if payload_json.as_bytes().len() > MAX_PAYLOAD_BYTES {
        return Err("Payload JSON is too large".to_string());
    }
    Ok(())
}

fn validate_run_draft_event_payload_text(payload_json: &str) -> Result<(), String> {
    if payload_json.trim().is_empty() {
        return Err("Draft event payload is required".to_string());
    }
    if payload_json.as_bytes().len() > MAX_RUN_DRAFT_EVENT_PAYLOAD_BYTES {
        return Err("Draft event payload is too large".to_string());
    }
    if contains_run_draft_event_sensitive_marker(payload_json) {
        return Err("Draft event payload contains an unsafe marker".to_string());
    }
    Ok(())
}

fn validate_run_draft_event_payload(payload: &Value) -> Result<(), String> {
    let object = payload
        .as_object()
        .ok_or_else(|| "Draft event payload must be an object".to_string())?;
    if object.get("eventKind").and_then(Value::as_str) != Some("control.run.draft_recorded") {
        return Err("Draft event kind is invalid".to_string());
    }
    if object.get("schemaVersion").and_then(Value::as_u64) != Some(1) {
        return Err("Draft event schema version is invalid".to_string());
    }
    if object.get("previewOnly").and_then(Value::as_bool) != Some(true)
        || object.get("localOnly").and_then(Value::as_bool) != Some(true)
        || object.get("noExecution").and_then(Value::as_bool) != Some(true)
    {
        return Err("Draft event must be local preview only".to_string());
    }
    for key in [
        "draftId",
        "localTaskId",
        "intent",
        "objectiveSummary",
        "workspaceSummary",
        "createdAt",
    ] {
        if object
            .get(key)
            .and_then(Value::as_str)
            .map_or(true, str::is_empty)
        {
            return Err(format!("Draft event payload is missing {key}"));
        }
    }
    if object
        .get("acceptanceCriteriaCount")
        .and_then(Value::as_u64)
        .is_none()
    {
        return Err("Draft event payload is missing acceptanceCriteriaCount".to_string());
    }
    if let Some(forbidden_key) = find_forbidden_run_draft_event_key(payload) {
        return Err(format!(
            "Draft event payload contains forbidden field {forbidden_key}"
        ));
    }
    let text = serde_json::to_string(payload)
        .map_err(|_| "Draft event payload could not be serialized".to_string())?;
    if contains_run_draft_event_sensitive_marker(&text) {
        return Err("Draft event payload contains an unsafe marker".to_string());
    }
    Ok(())
}

fn find_forbidden_run_draft_event_key(value: &Value) -> Option<String> {
    match value {
        Value::Array(items) => items.iter().find_map(find_forbidden_run_draft_event_key),
        Value::Object(object) => {
            for (key, nested_value) in object {
                if forbidden_run_draft_event_key(key) {
                    return Some(key.to_string());
                }
                if let Some(found) = find_forbidden_run_draft_event_key(nested_value) {
                    return Some(found);
                }
            }
            None
        }
        _ => None,
    }
}

fn forbidden_run_draft_event_key(key: &str) -> bool {
    let lower = key.to_ascii_lowercase();
    let raw = "raw";
    let clip_board = ["clip", "board"].join("");
    matches!(
        lower.as_str(),
        "objectiveraw"
            | "acceptancecriteriaraw"
            | "prompt"
            | "beforecontent"
            | "aftercontent"
            | "screenshot"
            | "apikey"
            | "authorization"
            | "env"
            | "stdout"
            | "stderr"
            | "content"
            | "fullcontent"
            | "memorycontent"
    ) || lower == format!("{raw}prompt")
        || lower == format!("{raw}dom")
        || lower == format!("{raw}csv")
        || lower == format!("{raw}source")
        || lower == format!("{raw}diff")
        || lower == clip_board
}

fn contains_run_draft_event_sensitive_marker(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    let clip_board = ["clip", "board"].join("");
    lower.contains("authorization")
        || lower.contains("bearer ")
        || lower.contains("\"sk-")
        || lower.contains(":\"sk-")
        || lower.contains(" sk-")
        || lower.contains("api key")
        || lower.contains("apikey")
        || lower.contains("rawprompt")
        || lower.contains("rawdom")
        || lower.contains("rawcsv")
        || lower.contains("rawsource")
        || lower.contains("rawdiff")
        || lower.contains("beforecontent")
        || lower.contains("aftercontent")
        || lower.contains("raw screenshot")
        || lower.contains("raw payload")
        || lower.contains(&clip_board)
        || lower.contains("-----begin ")
        || lower.contains("token=")
        || lower.contains("secret=")
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

fn unix_epoch_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
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

    fn safe_run_draft_event_payload() -> String {
        serde_json::json!({
            "eventKind": "control.run.draft_recorded",
            "draftId": "local-draft-test",
            "localTaskId": "local-task-local-draft-test",
            "intent": "code_change",
            "objectiveSummary": "Prepare a safe local draft.",
            "acceptanceCriteriaCount": 2,
            "workspaceSummary": ".../demo",
            "workspaceRootHash": "workspace-12345678",
            "workspaceIndexRef": {
                "workspaceIndexId": "workspace-index-test",
                "fileCount": 3,
                "indexedFileCount": 2,
                "skippedFileCount": 1,
                "warningCount": 0,
                "hashPrefix": "abcdef123456"
            },
            "contextCartSummary": {
                "status": "empty",
                "totalSegments": 0,
                "totalTokenEstimate": 0,
                "warningCount": 0
            },
            "agentRouteSummary": {
                "status": "preview",
                "roleCount": 4,
                "capabilityRefCount": 3,
                "routeId": "route-test"
            },
            "capabilityPlanSummary": {
                "status": "preview",
                "itemCount": 3,
                "approvalRequiredCount": 1,
                "disabledCount": 1
            },
            "memoryRecallSummary": {
                "status": "empty",
                "itemCount": 0,
                "volatileTailCount": 0
            },
            "warningCodes": ["ACCEPTANCE_CRITERIA_EMPTY"],
            "createdAt": "2026-06-21T00:00:00.000Z",
            "schemaVersion": 1,
            "previewOnly": true,
            "localOnly": true,
            "noExecution": true
        })
        .to_string()
    }

    fn try_create_file_symlink(target: &Path, link: &Path) -> std::io::Result<()> {
        #[cfg(windows)]
        {
            std::os::windows::fs::symlink_file(target, link)
        }
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(target, link)
        }
        #[cfg(not(any(windows, unix)))]
        {
            let _ = (target, link);
            Err(std::io::Error::new(
                std::io::ErrorKind::Unsupported,
                "symlink unsupported",
            ))
        }
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
    fn records_control_run_draft_event_to_fixed_workspace_log() {
        let workspace = temp_workspace("run-draft-event");
        let result = record_control_run_draft_event(
            workspace.to_string_lossy().to_string(),
            safe_run_draft_event_payload(),
        )
        .expect("draft event record");

        assert!(result.ok);
        assert_eq!(result.event_type, "control.run.draft_recorded");
        assert_eq!(result.draft_id, "local-draft-test");
        assert!(
            result
                .event_log_path
                .ends_with(".deepseek-workbench\\events.jsonl")
                || result
                    .event_log_path
                    .ends_with(".deepseek-workbench/events.jsonl")
        );

        let event_log = workspace.join(".deepseek-workbench").join("events.jsonl");
        let text = fs::read_to_string(&event_log).expect("event log");
        let lines = text.lines().collect::<Vec<_>>();
        assert_eq!(lines.len(), 1);
        assert!(lines[0].contains("\"type\":\"control.run.draft_recorded\""));
        assert!(lines[0].contains("\"objectiveSummary\""));
        assert!(!lines[0].contains("objectiveRaw"));
        assert!(!lines[0].contains("acceptanceCriteriaRaw"));

        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));
        let serialized = serde_json::to_string(&summary).expect("summary");
        assert!(summary.ok);
        assert_eq!(summary.event_count, 1);
        assert_eq!(summary.completed_task_count, 0);
        assert_eq!(summary.draft_count, 0);
        assert_eq!(
            summary
                .type_counts
                .get("control.run.draft_recorded")
                .copied(),
            Some(1)
        );
        assert!(summary.timeline[0].summary.contains("draft event recorded"));
        assert!(summary.timeline[0]
            .safe_payload_keys
            .contains(&"objectiveSummary".to_string()));
        assert!(!serialized.contains("objectiveRaw"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn record_run_draft_event_rejects_raw_fields_and_does_not_write() {
        let workspace = temp_workspace("run-draft-raw");
        let mut payload: Value =
            serde_json::from_str(&safe_run_draft_event_payload()).expect("payload");
        payload[format!("{}{}", "raw", "Prompt")] = Value::String("private prompt".to_string());

        let error = record_control_run_draft_event(
            workspace.to_string_lossy().to_string(),
            payload.to_string(),
        )
        .expect_err("raw field should be rejected");

        assert_eq!(error.error_code, "INVALID_PAYLOAD");
        assert_eq!(error.stage, "record_draft_event");
        assert!(!workspace
            .join(".deepseek-workbench")
            .join("events.jsonl")
            .exists());

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn record_run_draft_event_rejects_secret_markers_and_oversized_payload() {
        let workspace = temp_workspace("run-draft-secret");
        let secret = "sk-test1234567890abcdef";
        let mut payload: Value =
            serde_json::from_str(&safe_run_draft_event_payload()).expect("payload");
        payload["objectiveSummary"] = Value::String(format!("unsafe {secret}"));

        let secret_error = record_control_run_draft_event(
            workspace.to_string_lossy().to_string(),
            payload.to_string(),
        )
        .expect_err("secret should be rejected");
        let oversized_error = record_control_run_draft_event(
            workspace.to_string_lossy().to_string(),
            "x".repeat(MAX_RUN_DRAFT_EVENT_PAYLOAD_BYTES + 1),
        )
        .expect_err("oversized payload should be rejected");

        assert_eq!(secret_error.error_code, "INVALID_PAYLOAD");
        assert_eq!(oversized_error.error_code, "INVALID_PAYLOAD");
        assert!(!workspace
            .join(".deepseek-workbench")
            .join("events.jsonl")
            .exists());

        let _ = fs::remove_dir_all(workspace);
    }

    fn safe_approved_apply_receipt(paths: &[&str]) -> Value {
        serde_json::json!({
            "status": "ready",
            "receiptId": "receipt-apply-test",
            "kind": "apply",
            "source": "runtime_app_approved_execution_receipt",
            "summaryOnly": true,
            "scope": {
                "receiptId": "receipt-apply-test",
                "kind": "apply",
                "workspaceRootRef": "workspace-ref-test",
                "proposalId": "proposal-apply-test",
                "validationId": "validation-apply-test",
                "auditId": "audit-apply-test",
                "approvalDraftId": "approval-apply-test",
                "allowedRelativePaths": paths,
                "maxFiles": paths.len().max(1),
                "maxBytes": 4096,
                "expiresAt": "2099-01-01T00:00:00.000Z",
                "typedConfirmation": APPLY_CONFIRMATION,
                "receiptHash": "receipt-hash-test"
            },
            "readiness": {
                "canApplyPatch": false,
                "canRollback": false,
                "canWriteFilesystem": false,
                "canWriteEventStore": false,
                "canExecuteGit": false,
                "canExecuteShell": false,
                "canIssuePermissionLease": false,
                "appCanExecute": false
            }
        })
    }

    fn safe_approved_apply_request(
        workspace: &Path,
        operations: Vec<ApprovedApplyOperation>,
        paths: &[&str],
    ) -> ApprovedApplyRequest {
        ApprovedApplyRequest {
            workspace_root: workspace.to_string_lossy().to_string(),
            workspace_root_ref: "workspace-ref-test".to_string(),
            receipt: safe_approved_apply_receipt(paths),
            operations,
            proposal_summary: serde_json::json!({"proposalId": "proposal-apply-test"}),
            validation_summary: serde_json::json!({"validationId": "validation-apply-test"}),
            audit_summary: serde_json::json!({"auditId": "audit-apply-test"}),
            approval_summary: serde_json::json!({"approvalDraftId": "approval-apply-test"}),
            max_files: paths.len().max(1),
            max_bytes: 4096,
        }
    }

    fn safe_approved_rollback_receipt(paths: &[&str], checkpoint_id: &str) -> Value {
        serde_json::json!({
            "status": "ready",
            "receiptId": "receipt-rollback-test",
            "kind": "rollback",
            "source": "runtime_app_approved_execution_receipt",
            "summaryOnly": true,
            "scope": {
                "receiptId": "receipt-rollback-test",
                "kind": "rollback",
                "workspaceRootRef": "workspace-ref-test",
                "proposalId": "proposal-apply-test",
                "validationId": "validation-apply-test",
                "auditId": "audit-apply-test",
                "approvalDraftId": "approval-apply-test",
                "checkpointId": checkpoint_id,
                "allowedRelativePaths": paths,
                "maxFiles": paths.len().max(1),
                "maxBytes": 4096,
                "expiresAt": "2099-01-01T00:00:00.000Z",
                "typedConfirmation": ROLLBACK_CONFIRMATION,
                "receiptHash": "receipt-rollback-hash-test"
            },
            "readiness": {
                "canApplyPatch": false,
                "canRollback": false,
                "canWriteFilesystem": false,
                "canWriteEventStore": false,
                "canExecuteGit": false,
                "canExecuteShell": false,
                "canIssuePermissionLease": false,
                "appCanExecute": false
            }
        })
    }

    fn safe_approved_rollback_request(
        workspace: &Path,
        apply_result: &ApprovedApplyResult,
        paths: &[&str],
    ) -> ApprovedRollbackRequest {
        ApprovedRollbackRequest {
            workspace_root: workspace.to_string_lossy().to_string(),
            workspace_root_ref: "workspace-ref-test".to_string(),
            receipt: safe_approved_rollback_receipt(paths, &apply_result.checkpoint_id),
            apply_id: apply_result.apply_id.clone(),
            checkpoint_id: apply_result.checkpoint_id.clone(),
            checkpoint_ref: apply_result.checkpoint_hash.clone(),
        }
    }

    #[test]
    fn approved_apply_creates_file_in_temp_workspace() {
        let workspace = temp_workspace("approved-apply-create");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/new-file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("created summary-safe content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/new-file.txt"],
        );

        let result = apply_approved_user_workspace_patch(request).expect("approved apply");
        let serialized = serde_json::to_string(&result).expect("result");

        assert!(result.ok);
        assert_eq!(result.files_created, 1);
        assert_eq!(result.event_preview.not_written, true);
        assert_eq!(
            result.event_preview.event_type,
            "user_workspace.patch_apply.approved_result"
        );
        assert!(workspace.join("src").join("new-file.txt").is_file());
        assert!(workspace
            .join(".deepseek-workbench")
            .join("checkpoints")
            .join(format!("{}.json", result.checkpoint_id))
            .is_file());
        assert!(!serialized.contains("created summary-safe content"));
        assert!(!serialized.contains("preimage"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_apply_updates_file_with_checkpoint() {
        let workspace = temp_workspace("approved-apply-update");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let target = workspace.join("src").join("file.txt");
        fs::write(&target, "old safe content").expect("old file");
        let before_hash = short_hash("old safe content");
        let request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Update,
                content: Some("new safe content".to_string()),
                expected_before_hash: Some(before_hash[..8].to_string()),
                expected_exists_before: Some(true),
            }],
            &["src/file.txt"],
        );

        let result = apply_approved_user_workspace_patch(request).expect("approved update");
        let serialized = serde_json::to_string(&result).expect("result");
        let checkpoint_text = fs::read_to_string(
            workspace
                .join(".deepseek-workbench")
                .join("checkpoints")
                .join(format!("{}.json", result.checkpoint_id)),
        )
        .expect("checkpoint");

        assert_eq!(
            fs::read_to_string(&target).expect("updated"),
            "new safe content"
        );
        assert_eq!(result.files_updated, 1);
        assert!(checkpoint_text.contains("old safe content"));
        assert!(!serialized.contains("old safe content"));
        assert!(!serialized.contains("new safe content"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_apply_deletes_file_with_checkpoint() {
        let workspace = temp_workspace("approved-apply-delete");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let target = workspace.join("src").join("delete-me.txt");
        fs::write(&target, "delete safe content").expect("delete file");
        let request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/delete-me.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Delete,
                content: None,
                expected_before_hash: None,
                expected_exists_before: Some(true),
            }],
            &["src/delete-me.txt"],
        );

        let result = apply_approved_user_workspace_patch(request).expect("approved delete");
        let serialized = serde_json::to_string(&result).expect("result");

        assert!(!target.exists());
        assert_eq!(result.files_deleted, 1);
        assert!(!serialized.contains("delete safe content"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_apply_blocks_unsafe_paths_and_private_dirs() {
        for path in [
            "../escape.txt",
            "C:/workspace/file.txt",
            ".git/config",
            ".env",
            "node_modules/pkg/index.js",
        ] {
            let workspace = temp_workspace("approved-apply-unsafe");
            let request = safe_approved_apply_request(
                &workspace,
                vec![ApprovedApplyOperation {
                    path: path.to_string(),
                    change_kind: ApprovedApplyChangeKind::Create,
                    content: Some("safe content".to_string()),
                    expected_before_hash: None,
                    expected_exists_before: None,
                }],
                &[path],
            );
            let error =
                apply_approved_user_workspace_patch(request).expect_err("unsafe path should block");

            assert_eq!(error.error_code, "APPROVED_APPLY_BLOCKED");
            assert_eq!(error.stage, "approved_apply");
            let _ = fs::remove_dir_all(workspace);
        }
    }

    #[test]
    fn approved_apply_blocks_wrong_receipt_and_confirmation() {
        let workspace = temp_workspace("approved-apply-wrong-receipt");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let mut request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("safe content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/file.txt"],
        );
        request.receipt["source"] = Value::String("wrong-source".to_string());
        let wrong_receipt_error = apply_approved_user_workspace_patch(request)
            .expect_err("wrong receipt source should block");
        assert_eq!(wrong_receipt_error.error_code, "APPROVED_APPLY_BLOCKED");

        let mut request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("safe content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/file.txt"],
        );
        request.receipt["scope"]["typedConfirmation"] = Value::String("apply".to_string());
        let wrong_confirmation_error = apply_approved_user_workspace_patch(request)
            .expect_err("wrong confirmation should block");
        assert_eq!(
            wrong_confirmation_error.error_code,
            "APPROVED_APPLY_BLOCKED"
        );

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_apply_blocks_expected_before_hash_mismatch() {
        let workspace = temp_workspace("approved-apply-hash-mismatch");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        fs::write(workspace.join("src").join("file.txt"), "old safe content").expect("old file");
        let request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Update,
                content: Some("new safe content".to_string()),
                expected_before_hash: Some("deadbeef".to_string()),
                expected_exists_before: Some(true),
            }],
            &["src/file.txt"],
        );

        let error =
            apply_approved_user_workspace_patch(request).expect_err("hash mismatch should block");

        assert_eq!(error.error_code, "APPROVED_APPLY_BLOCKED");
        assert_eq!(
            fs::read_to_string(workspace.join("src").join("file.txt")).expect("unchanged"),
            "old safe content"
        );

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_apply_blocks_secret_markers_without_writing() {
        let workspace = temp_workspace("approved-apply-secret");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let secret_marker = ["sk", "test1234567890abcdef"].join("-");
        let request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some(format!("unsafe {secret_marker}")),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/file.txt"],
        );

        let error =
            apply_approved_user_workspace_patch(request).expect_err("secret marker should block");

        assert_eq!(error.error_code, "APPROVED_APPLY_BLOCKED");
        assert!(!workspace.join("src").join("file.txt").exists());
        assert!(!error.safe_message.contains(&secret_marker));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_apply_blocks_symlink_escape_if_testable() {
        let workspace = temp_workspace("approved-apply-symlink");
        let outside = temp_workspace("approved-apply-symlink-outside");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let outside_target = outside.join("outside.txt");
        fs::write(&outside_target, "outside content").expect("outside file");
        let link = workspace.join("src").join("link.txt");
        if try_create_file_symlink(&outside_target, &link).is_err() {
            let _ = fs::remove_dir_all(workspace);
            let _ = fs::remove_dir_all(outside);
            return;
        }

        let request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/link.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Update,
                content: Some("new safe content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(true),
            }],
            &["src/link.txt"],
        );
        let error =
            apply_approved_user_workspace_patch(request).expect_err("symlink target should block");

        assert_eq!(error.error_code, "APPROVED_APPLY_BLOCKED");
        assert_eq!(
            fs::read_to_string(&outside_target).expect("outside unchanged"),
            "outside content"
        );

        let _ = fs::remove_dir_all(workspace);
        let _ = fs::remove_dir_all(outside);
    }

    #[test]
    fn approved_rollback_removes_created_file_from_checkpoint() {
        let workspace = temp_workspace("approved-rollback-create");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let apply_request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/new-file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("created rollback content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/new-file.txt"],
        );
        let apply_result = apply_approved_user_workspace_patch(apply_request).expect("apply");

        let rollback = rollback_approved_user_workspace_patch(safe_approved_rollback_request(
            &workspace,
            &apply_result,
            &["src/new-file.txt"],
        ))
        .expect("rollback");
        let serialized = serde_json::to_string(&rollback).expect("rollback result");

        assert!(rollback.ok);
        assert_eq!(rollback.files_removed, 1);
        assert_eq!(rollback.files_restored, 0);
        assert_eq!(
            rollback.event_preview.event_type,
            "user_workspace.patch_rollback.approved_result"
        );
        assert!(rollback.event_preview.not_written);
        assert!(!workspace.join("src").join("new-file.txt").exists());
        assert!(!serialized.contains("created rollback content"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_rollback_restores_updated_file_preimage() {
        let workspace = temp_workspace("approved-rollback-update");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let target = workspace.join("src").join("file.txt");
        fs::write(&target, "old rollback content").expect("old file");
        let apply_request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Update,
                content: Some("new rollback content".to_string()),
                expected_before_hash: Some(short_hash("old rollback content")[..8].to_string()),
                expected_exists_before: Some(true),
            }],
            &["src/file.txt"],
        );
        let apply_result = apply_approved_user_workspace_patch(apply_request).expect("apply");
        assert_eq!(
            fs::read_to_string(&target).expect("updated"),
            "new rollback content"
        );

        let rollback = rollback_approved_user_workspace_patch(safe_approved_rollback_request(
            &workspace,
            &apply_result,
            &["src/file.txt"],
        ))
        .expect("rollback");
        let serialized = serde_json::to_string(&rollback).expect("rollback result");

        assert_eq!(
            fs::read_to_string(&target).expect("restored"),
            "old rollback content"
        );
        assert_eq!(rollback.files_restored, 1);
        assert!(!serialized.contains("old rollback content"));
        assert!(!serialized.contains("new rollback content"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_rollback_recreates_deleted_file_preimage() {
        let workspace = temp_workspace("approved-rollback-delete");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let target = workspace.join("src").join("delete-me.txt");
        fs::write(&target, "delete rollback content").expect("delete file");
        let apply_request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/delete-me.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Delete,
                content: None,
                expected_before_hash: None,
                expected_exists_before: Some(true),
            }],
            &["src/delete-me.txt"],
        );
        let apply_result = apply_approved_user_workspace_patch(apply_request).expect("apply");
        assert!(!target.exists());

        let rollback = rollback_approved_user_workspace_patch(safe_approved_rollback_request(
            &workspace,
            &apply_result,
            &["src/delete-me.txt"],
        ))
        .expect("rollback");
        let serialized = serde_json::to_string(&rollback).expect("rollback result");

        assert_eq!(
            fs::read_to_string(&target).expect("restored"),
            "delete rollback content"
        );
        assert_eq!(rollback.files_restored, 1);
        assert!(!serialized.contains("delete rollback content"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_rollback_blocks_wrong_checkpoint_and_receipt() {
        let workspace = temp_workspace("approved-rollback-wrong");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let apply_request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("safe rollback content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/file.txt"],
        );
        let apply_result = apply_approved_user_workspace_patch(apply_request).expect("apply");

        let mut wrong_checkpoint =
            safe_approved_rollback_request(&workspace, &apply_result, &["src/file.txt"]);
        wrong_checkpoint.checkpoint_ref = "wrong-checkpoint-hash".to_string();
        let checkpoint_error = rollback_approved_user_workspace_patch(wrong_checkpoint)
            .expect_err("wrong checkpoint should block");
        assert_eq!(checkpoint_error.error_code, "APPROVED_ROLLBACK_BLOCKED");

        let mut wrong_receipt =
            safe_approved_rollback_request(&workspace, &apply_result, &["src/file.txt"]);
        wrong_receipt.receipt["kind"] = Value::String("apply".to_string());
        let receipt_error = rollback_approved_user_workspace_patch(wrong_receipt)
            .expect_err("wrong receipt should block");
        assert_eq!(receipt_error.error_code, "APPROVED_ROLLBACK_BLOCKED");

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_rollback_blocks_expired_receipt_and_unsafe_path_scope() {
        let workspace = temp_workspace("approved-rollback-expired");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let apply_request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("safe rollback content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/file.txt"],
        );
        let apply_result = apply_approved_user_workspace_patch(apply_request).expect("apply");

        let mut expired =
            safe_approved_rollback_request(&workspace, &apply_result, &["src/file.txt"]);
        expired.receipt["scope"]["expiresAt"] =
            Value::String("2020-01-01T00:00:00.000Z".to_string());
        let expired_error =
            rollback_approved_user_workspace_patch(expired).expect_err("expired should block");
        assert_eq!(expired_error.error_code, "APPROVED_ROLLBACK_BLOCKED");

        let mut unsafe_scope =
            safe_approved_rollback_request(&workspace, &apply_result, &["src/file.txt"]);
        unsafe_scope.receipt["scope"]["allowedRelativePaths"] =
            serde_json::json!(["../escape.txt"]);
        let unsafe_error = rollback_approved_user_workspace_patch(unsafe_scope)
            .expect_err("unsafe path should block");
        assert_eq!(unsafe_error.error_code, "APPROVED_ROLLBACK_BLOCKED");

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_rollback_blocks_symlink_target_if_testable() {
        let workspace = temp_workspace("approved-rollback-symlink");
        let outside = temp_workspace("approved-rollback-symlink-outside");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let apply_request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("created rollback content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/file.txt"],
        );
        let apply_result = apply_approved_user_workspace_patch(apply_request).expect("apply");
        let target = workspace.join("src").join("file.txt");
        fs::remove_file(&target).expect("replace with link");
        let outside_target = outside.join("outside.txt");
        fs::write(&outside_target, "outside unchanged").expect("outside file");
        if try_create_file_symlink(&outside_target, &target).is_err() {
            let _ = fs::remove_dir_all(workspace);
            let _ = fs::remove_dir_all(outside);
            return;
        }

        let error = rollback_approved_user_workspace_patch(safe_approved_rollback_request(
            &workspace,
            &apply_result,
            &["src/file.txt"],
        ))
        .expect_err("symlink rollback should block");

        assert_eq!(error.error_code, "APPROVED_ROLLBACK_BLOCKED");
        assert_eq!(
            fs::read_to_string(&outside_target).expect("outside unchanged"),
            "outside unchanged"
        );

        let _ = fs::remove_dir_all(workspace);
        let _ = fs::remove_dir_all(outside);
    }

    #[test]
    fn approved_execution_event_records_apply_summary_only() {
        let workspace = temp_workspace("approved-apply-event");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let apply_result = apply_approved_user_workspace_patch(safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/event-file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("event summary safe content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/event-file.txt"],
        ))
        .expect("approved apply");

        let event_record = record_approved_user_workspace_execution_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&apply_result.event_preview).expect("event preview"),
        )
        .expect("record event");
        let event_log = fs::read_to_string(
            workspace
                .join(".deepseek-workbench")
                .join("events.jsonl"),
        )
        .expect("event log");
        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));

        assert_eq!(event_record.event_type, APPROVED_APPLY_EXECUTED_TYPE);
        assert_eq!(event_record.operation_id, apply_result.apply_id);
        assert!(event_log.contains(APPROVED_APPLY_EXECUTED_TYPE));
        assert!(event_log.contains("pathSummaries"));
        assert!(!event_log.contains("event summary safe content"));
        assert!(!event_log.contains("preimage"));
        assert_eq!(summary.approved_apply_count, 1);
        assert_eq!(summary.approved_rollback_count, 0);
        assert!(summary
            .latest_approved_execution_summary
            .as_deref()
            .unwrap_or_default()
            .contains("approved apply executed"));
        assert!(summary.safety_scan.ok);

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_execution_event_records_rollback_summary_only() {
        let workspace = temp_workspace("approved-rollback-event");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let apply_result = apply_approved_user_workspace_patch(safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/event-file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("rollback event safe content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/event-file.txt"],
        ))
        .expect("approved apply");
        let rollback_result =
            rollback_approved_user_workspace_patch(safe_approved_rollback_request(
                &workspace,
                &apply_result,
                &["src/event-file.txt"],
            ))
            .expect("approved rollback");

        let event_record = record_approved_user_workspace_execution_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&rollback_result.event_preview).expect("event preview"),
        )
        .expect("record rollback event");
        let event_log = fs::read_to_string(
            workspace
                .join(".deepseek-workbench")
                .join("events.jsonl"),
        )
        .expect("event log");
        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));

        assert_eq!(event_record.event_type, APPROVED_ROLLBACK_EXECUTED_TYPE);
        assert_eq!(event_record.operation_id, rollback_result.rollback_id);
        assert_eq!(event_record.checkpoint_id, apply_result.checkpoint_id);
        assert!(event_log.contains(APPROVED_ROLLBACK_EXECUTED_TYPE));
        assert!(!event_log.contains("rollback event safe content"));
        assert!(!event_log.contains("preimage"));
        assert_eq!(summary.approved_apply_count, 0);
        assert_eq!(summary.approved_rollback_count, 1);
        assert!(summary
            .latest_approved_execution_summary
            .as_deref()
            .unwrap_or_default()
            .contains("approved rollback executed"));
        assert!(summary.safety_scan.ok);

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_execution_event_blocks_raw_or_unsafe_preview() {
        let workspace = temp_workspace("approved-apply-event-blocked");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let apply_result = apply_approved_user_workspace_patch(safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/event-file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("safe content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/event-file.txt"],
        ))
        .expect("approved apply");

        let mut raw_preview =
            serde_json::to_value(&apply_result.event_preview).expect("event preview");
        let raw_prompt_key = ["raw", "Prompt"].concat();
        raw_preview[raw_prompt_key] = Value::String("do not keep".to_string());
        let raw_error = record_approved_user_workspace_execution_event(
            workspace.to_string_lossy().to_string(),
            raw_preview,
        )
        .expect_err("raw preview should block");
        assert_eq!(raw_error.error_code, "INVALID_PAYLOAD");

        let mut unsafe_path_preview =
            serde_json::to_value(&apply_result.event_preview).expect("event preview");
        unsafe_path_preview["pathSummaries"] = serde_json::json!(["create .git/config"]);
        let path_error = record_approved_user_workspace_execution_event(
            workspace.to_string_lossy().to_string(),
            unsafe_path_preview,
        )
        .expect_err("unsafe path summary should block");
        assert_eq!(path_error.error_code, "INVALID_PAYLOAD");

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
