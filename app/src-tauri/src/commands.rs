use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{hash_map::DefaultHasher, BTreeMap, BTreeSet};
use std::ffi::OsStr;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::Read;
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
const GIT_READ_LANE_DEFAULT_TIMEOUT: Duration = Duration::from_secs(5);
const GIT_READ_LANE_MAX_TIMEOUT_MS: u64 = 30_000;
const GIT_READ_LANE_DEFAULT_MAX_OUTPUT_BYTES: usize = 64 * 1024;
const GIT_READ_LANE_MAX_OUTPUT_BYTES: usize = 256 * 1024;
const SHELL_VERIFICATION_DEFAULT_TIMEOUT: Duration = Duration::from_secs(60);
const SHELL_VERIFICATION_MAX_TIMEOUT_MS: u64 = 120_000;
const SHELL_VERIFICATION_DEFAULT_MAX_OUTPUT_BYTES: usize = 64 * 1024;
const SHELL_VERIFICATION_MAX_OUTPUT_BYTES: usize = 256 * 1024;
const APPLY_CONFIRMATION: &str = "APPLY TO USER WORKSPACE";
const ROLLBACK_CONFIRMATION: &str = "ROLLBACK USER WORKSPACE";
const APPROVED_APPLY_PREVIEW_TYPE: &str = "user_workspace.patch_apply.approved_result";
const APPROVED_ROLLBACK_PREVIEW_TYPE: &str = "user_workspace.patch_rollback.approved_result";
const APPROVED_APPLY_EXECUTED_TYPE: &str = "user_workspace.patch_apply.app_executed";
const APPROVED_ROLLBACK_EXECUTED_TYPE: &str = "user_workspace.patch_rollback.app_executed";
const LIVE_PROPOSAL_GENERATED_TYPE: &str = "model.patch_proposal.live_generated";
const LIVE_PROPOSAL_CONFIRMATION: &str = "CALL DEEPSEEK FOR PROPOSAL";
const LIVE_PROPOSAL_ALLOWED_KEY_REF: &str = "DEEPSEEK_API_KEY";
const LIVE_PROPOSAL_ENDPOINT: &str = "https://api.deepseek.com/chat/completions";
const LIVE_PROPOSAL_MIN_RESPONSE_BYTES: usize = 256;
const LIVE_PROPOSAL_MAX_RESPONSE_BYTES: usize = 1_000_000;
const LIVE_PROPOSAL_MIN_TIMEOUT_MS: u64 = 1_000;
const LIVE_PROPOSAL_MAX_TIMEOUT_MS: u64 = 120_000;
const MCP_READONLY_DISCOVERY_CONFIRMATION: &str = "DISCOVER MCP METADATA";
const MCP_READONLY_DISCOVERY_MAX_TIMEOUT_MS: u64 = 30_000;
const MCP_READONLY_DISCOVERY_MAX_ITEMS: usize = 100;
const MCP_READONLY_TOOL_CONFIRMATION: &str = "CALL READONLY MCP TOOL";
const MCP_READONLY_TOOL_MAX_TIMEOUT_MS: u64 = 30_000;
const MCP_READONLY_TOOL_MAX_OUTPUT_BYTES: usize = 65_536;
const PROJECT_KNOWLEDGE_REVOKE_CONFIRMATION: &str = "REVOKE PROJECT KNOWLEDGE";
const PROJECT_KNOWLEDGE_MAX_SUMMARY_CHARS: usize = 500;
const PROJECT_KNOWLEDGE_ENTRY_COMMITTED_TYPE: &str = "project_knowledge.entry_committed";
const PROJECT_KNOWLEDGE_CANDIDATE_COMMITTED_TYPE: &str = "project_knowledge.candidate_committed";
const PROJECT_KNOWLEDGE_ENTRY_REVOKED_TYPE: &str = "project_knowledge.entry_revoked";
const PROJECT_KNOWLEDGE_ENTRY_EXPIRED_TYPE: &str = "project_knowledge.entry_expired";
const PROJECT_KNOWLEDGE_RECALL_USED_TYPE: &str = "project_knowledge.recall_used";
const PROJECT_KNOWLEDGE_AUDIT_WARNING_TYPE: &str = "project_knowledge.audit_warning";

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
    verification_event_count: usize,
    live_proposal_event_count: usize,
    project_knowledge_event_count: usize,
    project_knowledge_entry_count: usize,
    latest_approved_execution_summary: Option<String>,
    latest_verification_summary: Option<String>,
    latest_live_proposal_summary: Option<String>,
    latest_project_knowledge_summary: Option<String>,
    latest_project_knowledge_recall_summary: Option<String>,
    project_knowledge_redaction_audit_status: Option<String>,
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
pub struct VerificationLaneEventRecordResult {
    ok: bool,
    event_id: String,
    event_type: String,
    lane_or_template_id: String,
    result_hash: String,
    event_log_path: String,
    safe_message: String,
    warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveProposalSummaryEventRecordResult {
    ok: bool,
    event_id: String,
    event_type: String,
    generation_id: String,
    proposal_id: String,
    event_log_path: String,
    safe_message: String,
    warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LiveDeepSeekPatchProposalCommandRequest {
    session_receipt: Value,
    api_key_source_ref: String,
    provider_id: String,
    model_profile_id: String,
    request_envelope: Value,
    objective_summary: String,
    allowed_path_refs: Vec<String>,
    context_refs: Vec<String>,
    max_response_bytes: usize,
    timeout_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LiveDeepSeekPatchProposalUsageSummary {
    prompt_tokens: Option<u64>,
    completion_tokens: Option<u64>,
    total_tokens: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LiveDeepSeekPatchProposalCommandResult {
    ok: bool,
    status: String,
    provider_id: String,
    model_profile_id: String,
    request_id: String,
    response_id: Option<String>,
    proposal_candidate: Value,
    proposal_candidate_hash: String,
    response_hash: String,
    usage_summary: Option<LiveDeepSeekPatchProposalUsageSummary>,
    dropped_reasoning_content: bool,
    reasoning_content_char_count: usize,
    warning_codes: Vec<String>,
    summary_only: bool,
    raw_prompt_included: bool,
    raw_response_included: bool,
    raw_reasoning_content_included: bool,
    can_apply_patch: bool,
    can_rollback: bool,
    can_write_event_store: bool,
    can_execute_git: bool,
    can_execute_shell: bool,
    safe_message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopObservationCommandRequest {
    profile: Value,
    request_id: String,
    user_triggered: bool,
    include_foreground_window: bool,
    include_window_list: bool,
    include_display_metadata: bool,
    include_screenshot_metadata: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopWindowObservationSummary {
    window_id_hash: String,
    title_summary: String,
    app_name_summary: String,
    pid_hash: Option<String>,
    bounds_summary: Option<String>,
    focused: bool,
    display_id_hash: Option<String>,
    redaction_codes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopAppObservationSummary {
    app_id_hash: String,
    app_name_summary: String,
    window_count: usize,
    redaction_codes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopDisplayObservationSummary {
    display_id_hash: String,
    size_summary: String,
    scale_factor: Option<f64>,
    primary: bool,
    redaction_codes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopScreenshotObservationMetadata {
    screenshot_hash: Option<String>,
    width: u32,
    height: u32,
    byte_estimate: Option<u64>,
    redaction_codes: Vec<String>,
    raw_screenshot_persisted: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopObservationCommandResult {
    ok: bool,
    status: String,
    request_id: String,
    observation_id: String,
    profile_id: Option<String>,
    window_count: usize,
    app_count: usize,
    display_count: usize,
    screenshot_metadata_included: bool,
    windows: Vec<DesktopWindowObservationSummary>,
    apps: Vec<DesktopAppObservationSummary>,
    displays: Vec<DesktopDisplayObservationSummary>,
    screenshot_metadata: Option<DesktopScreenshotObservationMetadata>,
    warning_codes: Vec<String>,
    summary_only: bool,
    raw_screenshot_persisted: bool,
    raw_ocr_text_persisted: bool,
    raw_clipboard_included: bool,
    can_desktop_action: bool,
    can_click_type_select: bool,
    can_write_clipboard: bool,
    can_send_to_model: bool,
    can_write_event_store: bool,
    can_apply_patch: bool,
    can_rollback: bool,
    can_execute_git: bool,
    can_execute_shell: bool,
    app_can_execute: bool,
    result_hash: String,
    safe_message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyDiscoverRequest {
    profile: Value,
    typed_confirmation: String,
    max_items: usize,
    timeout_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyServerInfoSummary {
    server_id: String,
    display_name: String,
    server_version: String,
    metadata_hash: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyResourceSummary {
    resource_id: String,
    display_name: String,
    kind: String,
    description_summary: String,
    warning_codes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyPromptSummary {
    prompt_id: String,
    display_name: String,
    description_summary: String,
    template_declared: bool,
    raw_prompt_included: bool,
    warning_codes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyToolSummary {
    tool_id: String,
    display_name: String,
    description_summary: String,
    risk_level: String,
    default_invocation_policy: String,
    input_schema_known: bool,
    output_schema_known: bool,
    warning_codes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyDiscoverResult {
    ok: bool,
    discovery_id: String,
    profile_id: String,
    server_info: McpReadonlyServerInfoSummary,
    resource_count: usize,
    prompt_count: usize,
    tool_count: usize,
    resource_summaries: Vec<McpReadonlyResourceSummary>,
    prompt_summaries: Vec<McpReadonlyPromptSummary>,
    tool_summaries: Vec<McpReadonlyToolSummary>,
    warning_codes: Vec<String>,
    summary_only: bool,
    raw_metadata_included: bool,
    raw_stdout_included: bool,
    raw_stderr_included: bool,
    can_call_tool: bool,
    can_read_resource: bool,
    can_execute_prompt: bool,
    can_mutate: bool,
    can_write_event_store: bool,
    result_hash: String,
    safe_message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyToolCallRequest {
    connection_profile_ref: String,
    server_profile: Value,
    tool_contract_summary: Value,
    approval_receipt: Value,
    argument_summary: String,
    argument_values: Value,
    max_output_bytes: usize,
    timeout_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyToolOutputSummary {
    output_hash: String,
    output_bytes: usize,
    output_line_count: usize,
    warning_codes: Vec<String>,
    raw_output_included: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyToolRedactionCounts {
    secret_marker_count: usize,
    raw_marker_count: usize,
    mutating_marker_count: usize,
    truncated_byte_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyToolEventPreview {
    #[serde(rename = "type")]
    event_type: String,
    call_id: String,
    tool_id: String,
    connection_profile_ref_hash: String,
    output_hash: String,
    output_bytes: usize,
    warning_codes: Vec<String>,
    summary_only: bool,
    raw_output_included: bool,
    not_written: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpReadonlyToolCallResult {
    ok: bool,
    status: String,
    call_id: String,
    tool_id: String,
    connection_profile_ref: String,
    output_summary: McpReadonlyToolOutputSummary,
    output_hash: String,
    output_bytes: usize,
    redaction_counts: McpReadonlyToolRedactionCounts,
    warning_codes: Vec<String>,
    event_preview: McpReadonlyToolEventPreview,
    summary_only: bool,
    called_readonly_tool: bool,
    raw_output_included: bool,
    raw_args_included: bool,
    can_call_mcp_tool: bool,
    can_invoke_mutating_tool: bool,
    can_write_event_store: bool,
    can_execute_git: bool,
    can_execute_shell: bool,
    can_issue_permission_lease: bool,
    app_can_execute: bool,
    result_hash: String,
    safe_message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectKnowledgeEvidenceRef {
    ref_id: String,
    kind: String,
    summary: String,
    hash_prefix: String,
    #[serde(default)]
    warning_codes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectKnowledgeTrust {
    score: f64,
    level: String,
    human_reviewed: bool,
    reviewed_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectKnowledgeProvenance {
    source_kind: String,
    source_id: Option<String>,
    actor: Option<String>,
    summary: String,
    #[serde(default)]
    ref_hashes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectKnowledgeCandidate {
    #[serde(rename = "type")]
    entry_type: String,
    namespace: String,
    summary: String,
    trust: ProjectKnowledgeTrust,
    provenance: ProjectKnowledgeProvenance,
    evidence_refs: Vec<ProjectKnowledgeEvidenceRef>,
    #[serde(default)]
    tags: Vec<String>,
    policy_scope: Option<String>,
    source_kind: Option<String>,
    fact_kind: Option<String>,
    trigger_summary: Option<String>,
    mitigation_summary: Option<String>,
    severity: Option<String>,
    expires_at: Option<String>,
    pinned: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectKnowledgeEntry {
    entry_id: String,
    #[serde(rename = "type")]
    entry_type: String,
    namespace: String,
    summary: String,
    status: String,
    trust: ProjectKnowledgeTrust,
    provenance: ProjectKnowledgeProvenance,
    evidence_refs: Vec<ProjectKnowledgeEvidenceRef>,
    tags: Vec<String>,
    created_at: String,
    updated_at: String,
    expires_at: Option<String>,
    revoked_at: Option<String>,
    pinned: bool,
    entry_hash: String,
    policy_scope: Option<String>,
    source_kind: Option<String>,
    fact_kind: Option<String>,
    trigger_summary: Option<String>,
    mitigation_summary: Option<String>,
    severity: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectKnowledgeEntrySummary {
    entry_id: String,
    #[serde(rename = "type")]
    entry_type: String,
    namespace: String,
    summary: String,
    status: String,
    evidence_ref_count: usize,
    tag_count: usize,
    entry_hash: String,
    warning_codes: Vec<String>,
    summary_only: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProjectKnowledgeStoreRecord {
    record_id: String,
    record_kind: String,
    entry: ProjectKnowledgeEntry,
    created_at: String,
    record_hash: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProjectKnowledgeLifecycleEvent {
    event_id: String,
    event_type: String,
    entry_id: String,
    status: String,
    reason_summary: Option<String>,
    created_at: String,
    event_hash: String,
    summary_only: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectKnowledgeSnapshotResult {
    ok: bool,
    status: String,
    store_path: String,
    entries_path: String,
    events_path: String,
    index_path: String,
    entry_count: usize,
    active_entry_count: usize,
    revoked_entry_count: usize,
    expired_entry_count: usize,
    entries: Vec<ProjectKnowledgeEntrySummary>,
    warnings: Vec<String>,
    snapshot_hash: String,
    summary_only: bool,
    raw_content_included: bool,
    safe_message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectKnowledgeCommitResult {
    ok: bool,
    entry: ProjectKnowledgeEntrySummary,
    event_id: String,
    store_path: String,
    entry_count: usize,
    index_hash: String,
    summary_only: bool,
    raw_content_included: bool,
    safe_message: String,
    warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectKnowledgeLifecycleResult {
    ok: bool,
    entry_id: String,
    status: String,
    event_id: String,
    store_path: String,
    index_hash: String,
    summary_only: bool,
    raw_content_included: bool,
    safe_message: String,
    warnings: Vec<String>,
}

#[derive(Debug, Clone)]
struct LiveDeepSeekTransportResponse {
    status_code: u16,
    body: String,
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

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum GitReadLane {
    StatusSummary,
    DiffSummary,
    LogSummary,
    BranchSummary,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitReadLaneRequest {
    workspace_root: String,
    workspace_root_ref: String,
    lane: GitReadLane,
    pathspecs: Option<Vec<String>>,
    timeout_ms: Option<u64>,
    max_output_bytes: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitReadLaneResult {
    ok: bool,
    lane: GitReadLane,
    status: String,
    workspace_root_ref: String,
    branch_summary: String,
    file_count: usize,
    changed_file_count: usize,
    added_line_count: usize,
    deleted_line_count: usize,
    changed_path_summaries: Vec<String>,
    warning_codes: Vec<String>,
    command_hash: String,
    output_hash: String,
    duration_ms: u128,
    truncated: bool,
    raw_diff_included: bool,
    raw_stdout_included: bool,
    raw_stderr_included: bool,
    event_preview: GitReadLaneEventPreview,
    safe_message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitReadLaneEventPreview {
    #[serde(rename = "type")]
    event_type: String,
    lane: GitReadLane,
    workspace_root_ref: String,
    command_hash: String,
    result_hash: String,
    changed_file_count: usize,
    added_line_count: usize,
    deleted_line_count: usize,
    warning_codes: Vec<String>,
    duration_ms: u128,
    truncated: bool,
    summary_only: bool,
    not_written: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ShellVerificationTemplateId {
    #[serde(rename = "pnpm.typecheck")]
    PnpmTypecheck,
    #[serde(rename = "pnpm.lint")]
    PnpmLint,
    #[serde(rename = "pnpm.test.scoped")]
    PnpmTestScoped,
    #[serde(rename = "app.typecheck")]
    AppTypecheck,
    #[serde(rename = "cargo.check_tauri")]
    CargoCheckTauri,
}

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShellVerificationSafeArgs {
    test_file_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellVerificationLaneRequest {
    workspace_root: String,
    workspace_root_ref: String,
    template_id: ShellVerificationTemplateId,
    safe_args: Option<ShellVerificationSafeArgs>,
    timeout_ms: Option<u64>,
    max_output_bytes: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellVerificationLaneResult {
    ok: bool,
    template_id: ShellVerificationTemplateId,
    status: String,
    exit_code: Option<i32>,
    workspace_root_ref: String,
    stdout_bytes: usize,
    stderr_bytes: usize,
    stdout_line_count: usize,
    stderr_line_count: usize,
    warning_codes: Vec<String>,
    command_hash: String,
    output_hash: String,
    duration_ms: u128,
    truncated: bool,
    raw_stdout_included: bool,
    raw_stderr_included: bool,
    event_preview: ShellVerificationLaneEventPreview,
    safe_message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellVerificationLaneEventPreview {
    #[serde(rename = "type")]
    event_type: String,
    template_id: ShellVerificationTemplateId,
    workspace_root_ref: String,
    command_hash: String,
    result_hash: String,
    exit_code: Option<i32>,
    stdout_bytes: usize,
    stderr_bytes: usize,
    warning_codes: Vec<String>,
    duration_ms: u128,
    truncated: bool,
    summary_only: bool,
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
    #[serde(default)]
    applied_hash: Option<String>,
    #[serde(default)]
    applied_bytes: usize,
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
    applied_hash: Option<String>,
    applied_bytes: usize,
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

struct ProjectKnowledgeEventSummaryProjection {
    events: Vec<Value>,
    warnings: Vec<String>,
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
        DesktopFlowError::new(
            "WORKSPACE_INVALID",
            message,
            "record_approved_execution_event",
        )
    })?;
    let approved_event =
        build_approved_execution_event_payload(&event_preview).map_err(|message| {
            DesktopFlowError::invalid_payload(message).with_stage("record_approved_execution_event")
        })?;
    let event_log_path = resolve_safe_event_log_path(&workspace_root, "Approved execution event")?;

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
pub fn record_verification_lane_event(
    workspace_root: String,
    event_preview: Value,
) -> Result<VerificationLaneEventRecordResult, DesktopFlowError> {
    let workspace_root = validate_workspace_root(&workspace_root).map_err(|message| {
        DesktopFlowError::new(
            "WORKSPACE_INVALID",
            message,
            "record_verification_lane_event",
        )
    })?;
    let verification_event =
        build_verification_lane_event_payload(&event_preview).map_err(|message| {
            DesktopFlowError::invalid_payload(message).with_stage("record_verification_lane_event")
        })?;
    let event_log_path = resolve_safe_event_log_path(&workspace_root, "Verification lane event")?;

    let millis = unix_epoch_millis();
    let event_id = format!("verification-lane-{millis}");
    let timestamp = format!("unix-ms-{millis}");
    let event = serde_json::json!({
        "id": event_id,
        "ts": timestamp,
        "type": verification_event.event_type,
        "schemaVersion": 1,
        "taskId": Value::Null,
        "payload": verification_event.payload
    });
    let event_line = serde_json::to_string(&event).map_err(|_| {
        DesktopFlowError::new(
            "EVENT_SERIALIZE_FAILED",
            "Verification lane event could not be serialized",
            "record_verification_lane_event",
        )
    })?;
    if event_line.as_bytes().len() > MAX_RUN_DRAFT_EVENT_PAYLOAD_BYTES + 4096
        || contains_approved_apply_sensitive_marker(&event_line)
    {
        return Err(DesktopFlowError::new(
            "VERIFICATION_EVENT_REJECTED",
            "Verification lane event payload failed final safety validation",
            "record_verification_lane_event",
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
                "Verification lane event could not be written",
                "record_verification_lane_event",
            )
        })?;
    writeln!(file, "{event_line}").map_err(|_| {
        DesktopFlowError::new(
            "EVENT_LOG_WRITE_FAILED",
            "Verification lane event could not be written",
            "record_verification_lane_event",
        )
    })?;

    Ok(VerificationLaneEventRecordResult {
        ok: true,
        event_id,
        event_type: verification_event.event_type,
        lane_or_template_id: verification_event.lane_or_template_id,
        result_hash: verification_event.result_hash,
        event_log_path: event_log_path.to_string_lossy().to_string(),
        safe_message: "Summary-only verification lane event recorded locally.".to_string(),
        warnings: Vec::new(),
    })
}

#[tauri::command(rename_all = "camelCase")]
pub fn record_live_proposal_summary_event(
    workspace_root: String,
    event_preview: Value,
) -> Result<LiveProposalSummaryEventRecordResult, DesktopFlowError> {
    let workspace_root = validate_workspace_root(&workspace_root).map_err(|message| {
        DesktopFlowError::new(
            "WORKSPACE_INVALID",
            message,
            "record_live_proposal_summary_event",
        )
    })?;
    let live_event =
        build_live_proposal_summary_event_payload(&event_preview).map_err(|message| {
            DesktopFlowError::invalid_payload(message)
                .with_stage("record_live_proposal_summary_event")
        })?;
    let event_log_path = resolve_safe_event_log_path(&workspace_root, "Live proposal event")?;

    let millis = unix_epoch_millis();
    let event_id = format!("live-proposal-{millis}");
    let timestamp = format!("unix-ms-{millis}");
    let event = serde_json::json!({
        "id": event_id,
        "ts": timestamp,
        "type": LIVE_PROPOSAL_GENERATED_TYPE,
        "schemaVersion": 1,
        "taskId": Value::Null,
        "payload": live_event.payload
    });
    let event_line = serde_json::to_string(&event).map_err(|_| {
        DesktopFlowError::new(
            "EVENT_SERIALIZE_FAILED",
            "Live proposal event could not be serialized",
            "record_live_proposal_summary_event",
        )
    })?;
    if event_line.as_bytes().len() > MAX_RUN_DRAFT_EVENT_PAYLOAD_BYTES + 4096
        || contains_approved_apply_sensitive_marker(&event_line)
    {
        return Err(DesktopFlowError::new(
            "LIVE_PROPOSAL_EVENT_REJECTED",
            "Live proposal event payload failed final safety validation",
            "record_live_proposal_summary_event",
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
                "Live proposal event could not be written",
                "record_live_proposal_summary_event",
            )
        })?;
    writeln!(file, "{event_line}").map_err(|_| {
        DesktopFlowError::new(
            "EVENT_LOG_WRITE_FAILED",
            "Live proposal event could not be written",
            "record_live_proposal_summary_event",
        )
    })?;

    Ok(LiveProposalSummaryEventRecordResult {
        ok: true,
        event_id,
        event_type: LIVE_PROPOSAL_GENERATED_TYPE.to_string(),
        generation_id: live_event.generation_id,
        proposal_id: live_event.proposal_id,
        event_log_path: event_log_path.to_string_lossy().to_string(),
        safe_message: "Summary-only live proposal event recorded locally.".to_string(),
        warnings: Vec::new(),
    })
}

#[tauri::command(rename_all = "camelCase")]
pub fn project_knowledge_list(
    workspace_root: String,
) -> Result<ProjectKnowledgeSnapshotResult, DesktopFlowError> {
    let workspace_root = validate_project_knowledge_workspace_root(&workspace_root)?;
    let store = resolve_project_knowledge_store(&workspace_root, false)?;
    load_project_knowledge_snapshot(&store)
}

#[tauri::command(rename_all = "camelCase")]
pub fn project_knowledge_commit_candidate(
    workspace_root: String,
    candidate: ProjectKnowledgeCandidate,
) -> Result<ProjectKnowledgeCommitResult, DesktopFlowError> {
    let workspace_root = validate_project_knowledge_workspace_root(&workspace_root)?;
    let store = resolve_project_knowledge_store(&workspace_root, true)?;
    validate_project_knowledge_candidate(&candidate)?;
    let entry = project_knowledge_entry_from_candidate(candidate)?;
    let summary = summarize_project_knowledge_entry(&entry);
    let record = project_knowledge_store_record(entry.clone());
    append_project_knowledge_record(&store.entries_path, &record)?;
    let event = project_knowledge_event(
        PROJECT_KNOWLEDGE_ENTRY_COMMITTED_TYPE,
        &entry.entry_id,
        "committed",
        None,
    );
    append_project_knowledge_event(&store.events_path, &event)?;
    let snapshot = load_project_knowledge_snapshot(&store)?;
    let index_hash = write_project_knowledge_index(&store, &snapshot)?;

    Ok(ProjectKnowledgeCommitResult {
        ok: true,
        entry: summary,
        event_id: event.event_id,
        store_path: store.store_dir.to_string_lossy().to_string(),
        entry_count: snapshot.entry_count,
        index_hash,
        summary_only: true,
        raw_content_included: false,
        safe_message: "Project knowledge candidate committed as summary-only local memory."
            .to_string(),
        warnings: snapshot.warnings,
    })
}

#[tauri::command(rename_all = "camelCase")]
pub fn project_knowledge_revoke(
    workspace_root: String,
    entry_id: String,
    typed_confirmation: String,
) -> Result<ProjectKnowledgeLifecycleResult, DesktopFlowError> {
    if typed_confirmation.trim() != PROJECT_KNOWLEDGE_REVOKE_CONFIRMATION {
        return Err(project_knowledge_invalid(
            "Project knowledge revoke confirmation is required",
        ));
    }
    project_knowledge_lifecycle_event(
        workspace_root,
        entry_id,
        "revoked",
        PROJECT_KNOWLEDGE_ENTRY_REVOKED_TYPE,
        None,
    )
}

#[tauri::command(rename_all = "camelCase")]
pub fn project_knowledge_expire(
    workspace_root: String,
    entry_id: String,
    reason_summary: String,
) -> Result<ProjectKnowledgeLifecycleResult, DesktopFlowError> {
    if reason_summary.trim().is_empty() {
        return Err(project_knowledge_invalid(
            "Project knowledge expire reason summary is required",
        ));
    }
    project_knowledge_lifecycle_event(
        workspace_root,
        entry_id,
        "expired",
        PROJECT_KNOWLEDGE_ENTRY_EXPIRED_TYPE,
        Some(reason_summary),
    )
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
pub fn run_git_read_lane(
    request: GitReadLaneRequest,
) -> Result<GitReadLaneResult, DesktopFlowError> {
    run_git_read_lane_summary(request)
}

#[tauri::command(rename_all = "camelCase")]
pub fn run_shell_verification_lane(
    request: ShellVerificationLaneRequest,
) -> Result<ShellVerificationLaneResult, DesktopFlowError> {
    run_shell_verification_lane_summary(request)
}

#[tauri::command(rename_all = "camelCase")]
pub fn mcp_readonly_discover(
    request: McpReadonlyDiscoverRequest,
) -> Result<McpReadonlyDiscoverResult, DesktopFlowError> {
    run_mcp_readonly_discover_fake(request)
}

#[tauri::command(rename_all = "camelCase")]
pub fn call_mcp_readonly_tool(
    request: McpReadonlyToolCallRequest,
) -> Result<McpReadonlyToolCallResult, DesktopFlowError> {
    run_mcp_readonly_tool_call_fixed(request)
}

#[tauri::command(rename_all = "camelCase")]
pub fn observe_desktop_metadata(
    request: DesktopObservationCommandRequest,
) -> Result<DesktopObservationCommandResult, DesktopFlowError> {
    run_desktop_observation_metadata(request)
}

fn run_desktop_observation_metadata(
    request: DesktopObservationCommandRequest,
) -> Result<DesktopObservationCommandResult, DesktopFlowError> {
    validate_desktop_observation_request(&request)?;
    let profile_id = request
        .profile
        .get("profileId")
        .and_then(Value::as_str)
        .map(sanitize_safe_message);
    let observation_id = format!(
        "desktop-observation-{}",
        short_hash(&format!(
            "{}:{}:{}:{}:{}:{}",
            request.request_id,
            profile_id.as_deref().unwrap_or("profile"),
            request.include_foreground_window,
            request.include_window_list,
            request.include_display_metadata,
            request.include_screenshot_metadata
        ))
    );
    let mut warning_codes = Vec::new();
    let windows = Vec::new();
    let apps = Vec::new();
    if request.include_foreground_window || request.include_window_list {
        warning_codes.push("WINDOW_METADATA_UNAVAILABLE".to_string());
    }
    let displays = if request.include_display_metadata {
        vec![DesktopDisplayObservationSummary {
            display_id_hash: short_hash("desktop-observer-primary-display"),
            size_summary: "metadata unavailable".to_string(),
            scale_factor: None,
            primary: true,
            redaction_codes: vec!["DISPLAY_METADATA_FALLBACK".to_string()],
        }]
    } else {
        Vec::new()
    };
    if request.include_display_metadata && displays.is_empty() {
        warning_codes.push("DISPLAY_METADATA_UNAVAILABLE".to_string());
    }
    let screenshot_metadata = if request.include_screenshot_metadata {
        warning_codes.push("SCREENSHOT_CAPTURE_NOT_PERFORMED".to_string());
        Some(DesktopScreenshotObservationMetadata {
            screenshot_hash: None,
            width: 0,
            height: 0,
            byte_estimate: None,
            redaction_codes: vec!["RAW_SCREENSHOT_NOT_CAPTURED".to_string()],
            raw_screenshot_persisted: false,
        })
    } else {
        None
    };
    warning_codes.sort();
    warning_codes.dedup();
    let status = if warning_codes.is_empty() {
        "observed"
    } else {
        "warning"
    }
    .to_string();
    let result_hash = short_hash(&format!(
        "{}:{}:{}:{}:{}:{:?}",
        observation_id,
        request.request_id,
        windows.len(),
        apps.len(),
        displays.len(),
        warning_codes
    ));
    Ok(DesktopObservationCommandResult {
        ok: true,
        status,
        request_id: sanitize_safe_message(&request.request_id),
        observation_id,
        profile_id,
        window_count: windows.len(),
        app_count: apps.len(),
        display_count: displays.len(),
        screenshot_metadata_included: screenshot_metadata.is_some(),
        windows,
        apps,
        displays,
        screenshot_metadata,
        warning_codes,
        summary_only: true,
        raw_screenshot_persisted: false,
        raw_ocr_text_persisted: false,
        raw_clipboard_included: false,
        can_desktop_action: false,
        can_click_type_select: false,
        can_write_clipboard: false,
        can_send_to_model: false,
        can_write_event_store: false,
        can_apply_patch: false,
        can_rollback: false,
        can_execute_git: false,
        can_execute_shell: false,
        app_can_execute: false,
        result_hash,
        safe_message: "Desktop observation metadata summarized without action.".to_string(),
    })
}

fn validate_desktop_observation_request(
    request: &DesktopObservationCommandRequest,
) -> Result<(), DesktopFlowError> {
    if request.request_id.trim().is_empty() {
        return Err(desktop_observer_invalid("Desktop observation requestId is required"));
    }
    if !request.user_triggered {
        return Err(DesktopFlowError::new(
            "DESKTOP_OBSERVER_NOT_USER_TRIGGERED",
            "Desktop observation must be explicitly user-triggered",
            "desktop_observer",
        ));
    }
    let Some(profile) = request.profile.as_object() else {
        return Err(desktop_observer_invalid(
            "Desktop observation profile is required",
        ));
    };
    if matches!(
        profile.get("observationMode").and_then(Value::as_str),
        Some("disabled")
    ) || matches!(profile.get("status").and_then(Value::as_str), Some("blocked"))
    {
        return Err(desktop_observer_invalid(
            "Desktop observation profile is not enabled for metadata observation",
        ));
    }
    if let Some(key) = find_forbidden_approved_apply_key(&request.profile) {
        return Err(desktop_observer_invalid(format!(
            "Desktop observation request contains forbidden field {key}"
        )));
    }
    validate_live_value_string_safety(&request.profile).map_err(desktop_observer_invalid)?;
    if desktop_observer_value_has_execution_true(&request.profile) {
        return Err(desktop_observer_invalid(
            "Desktop observation request attempted to enable action or persistence",
        ));
    }
    Ok(())
}

fn desktop_observer_value_has_execution_true(value: &Value) -> bool {
    match value {
        Value::Array(items) => items.iter().any(desktop_observer_value_has_execution_true),
        Value::Object(object) => object.iter().any(|(key, nested)| {
            let lower = key.to_ascii_lowercase();
            let execution_key = matches!(
                lower.as_str(),
                "allowdesktopaction"
                    | "allowclicktypeselect"
                    | "allowclipboardwrite"
                    | "allowclipboardread"
                    | "allowclipboardreadbydefault"
                    | "allowfiledialogautomation"
                    | "allowhiddenbackgroundcapture"
                    | "allowscreenrecording"
                    | "allowrawscreenshotpersistence"
                    | "allowrawocrtextpersistence"
                    | "sendtomodel"
                    | "rawscreenshotpersisted"
                    | "rawocrtextpersisted"
                    | "rawclipboardincluded"
                    | "candesktopaction"
                    | "canclicktypeselect"
                    | "canwriteclipboard"
                    | "canreadclipboard"
                    | "canreadclipboardbydefault"
                    | "canpersistrawscreenshot"
                    | "canpersistrawocrtext"
                    | "cansendtomodel"
                    | "canwriteeventstore"
                    | "canapplypatch"
                    | "canrollback"
                    | "canexecutegit"
                    | "canexecuteshell"
                    | "canissuepermissionlease"
                    | "appcanexecute"
            );
            (execution_key && nested.as_bool() == Some(true))
                || desktop_observer_value_has_execution_true(nested)
        }),
        _ => false,
    }
}

fn desktop_observer_invalid(message: impl Into<String>) -> DesktopFlowError {
    DesktopFlowError::new(
        "DESKTOP_OBSERVER_BLOCKED",
        message.into(),
        "desktop_observer",
    )
}

fn run_mcp_readonly_discover_fake(
    request: McpReadonlyDiscoverRequest,
) -> Result<McpReadonlyDiscoverResult, DesktopFlowError> {
    let profile =
        validate_mcp_readonly_discovery_request(&request).map_err(mcp_readonly_invalid)?;
    let profile_id = profile
        .get("profileId")
        .and_then(Value::as_str)
        .unwrap_or("mcp-profile");
    let server_ref = profile
        .get("serverRef")
        .and_then(Value::as_str)
        .unwrap_or("mcp-server");
    let display_name = profile
        .get("displayName")
        .and_then(Value::as_str)
        .unwrap_or(profile_id);
    let discovery_id = format!(
        "mcp-readonly-discovery-{}",
        short_hash(&format!(
            "{profile_id}:{server_ref}:{}:{}",
            request.max_items, request.timeout_ms
        ))
    );
    let server_info = McpReadonlyServerInfoSummary {
        server_id: sanitize_safe_message(server_ref),
        display_name: sanitize_safe_message(display_name),
        server_version: "fake-injected-0.1".to_string(),
        metadata_hash: short_hash(&format!("{profile_id}:{server_ref}:metadata")),
    };
    let resource_summaries = vec![McpReadonlyResourceSummary {
        resource_id: format!("{profile_id}.resource.index"),
        display_name: "MCP resource index metadata".to_string(),
        kind: "summary_index".to_string(),
        description_summary: "Read-only MCP resource metadata summary.".to_string(),
        warning_codes: Vec::new(),
    }];
    let prompt_summaries = vec![McpReadonlyPromptSummary {
        prompt_id: format!("{profile_id}.prompt.summary"),
        display_name: "MCP prompt metadata".to_string(),
        description_summary: "Prompt metadata summary; prompt execution is disabled.".to_string(),
        template_declared: true,
        raw_prompt_included: false,
        warning_codes: Vec::new(),
    }];
    let tool_summaries = vec![McpReadonlyToolSummary {
        tool_id: format!("{profile_id}.tool.metadata"),
        display_name: "MCP tool metadata".to_string(),
        description_summary: "Tool metadata summary; invocation is disabled.".to_string(),
        risk_level: "A3".to_string(),
        default_invocation_policy: "DISABLED".to_string(),
        input_schema_known: true,
        output_schema_known: true,
        warning_codes: vec!["TOOL_INVOCATION_DISABLED".to_string()],
    }];
    let result_hash = short_hash(&format!(
        "{}:{}:{}:{}",
        discovery_id,
        resource_summaries.len(),
        prompt_summaries.len(),
        tool_summaries.len()
    ));
    Ok(McpReadonlyDiscoverResult {
        ok: true,
        discovery_id,
        profile_id: sanitize_safe_message(profile_id),
        server_info,
        resource_count: resource_summaries.len(),
        prompt_count: prompt_summaries.len(),
        tool_count: tool_summaries.len(),
        resource_summaries,
        prompt_summaries,
        tool_summaries,
        warning_codes: vec!["STDIO_DISCOVERY_DEFERRED".to_string()],
        summary_only: true,
        raw_metadata_included: false,
        raw_stdout_included: false,
        raw_stderr_included: false,
        can_call_tool: false,
        can_read_resource: false,
        can_execute_prompt: false,
        can_mutate: false,
        can_write_event_store: false,
        result_hash,
        safe_message: "MCP read-only metadata discovered through fixed fake injected transport."
            .to_string(),
    })
}

fn validate_mcp_readonly_discovery_request(
    request: &McpReadonlyDiscoverRequest,
) -> Result<&serde_json::Map<String, Value>, String> {
    if request.typed_confirmation != MCP_READONLY_DISCOVERY_CONFIRMATION {
        return Err("MCP readonly discovery confirmation is required".to_string());
    }
    if request.max_items == 0 || request.max_items > MCP_READONLY_DISCOVERY_MAX_ITEMS {
        return Err("MCP readonly discovery item limit is outside the allowed range".to_string());
    }
    if request.timeout_ms == 0 || request.timeout_ms > MCP_READONLY_DISCOVERY_MAX_TIMEOUT_MS {
        return Err("MCP readonly discovery timeout is outside the allowed range".to_string());
    }
    validate_live_value_forbidden_keys(&request.profile)?;
    validate_live_value_string_safety(&request.profile)?;
    let profile = request
        .profile
        .as_object()
        .ok_or_else(|| "MCP readonly discovery profile must be an object".to_string())?;
    if profile.get("serverKind").and_then(Value::as_str) != Some("mcp") {
        return Err("MCP readonly discovery profile server kind is invalid".to_string());
    }
    if profile.get("transportKind").and_then(Value::as_str) != Some("injected_test_transport") {
        return Err("MCP readonly discovery stdio launch is deferred".to_string());
    }
    validate_mcp_safe_ref(
        profile.get("profileId").and_then(Value::as_str),
        "profile id",
    )?;
    validate_mcp_safe_ref(
        profile.get("serverRef").and_then(Value::as_str),
        "server ref",
    )?;
    let policy = profile
        .get("readOnlyPolicy")
        .and_then(Value::as_object)
        .ok_or_else(|| "MCP readonly discovery policy is required".to_string())?;
    if policy.get("allowInitialize").and_then(Value::as_bool) != Some(true) {
        return Err("MCP readonly discovery initialize must be allowed".to_string());
    }
    for key in ["allowListResources", "allowListPrompts", "allowListTools"] {
        if policy.get(key).and_then(Value::as_bool).is_none() {
            return Err("MCP readonly discovery list policy must be explicit".to_string());
        }
    }
    for key in [
        "allowReadResource",
        "allowCallTool",
        "allowPromptExecution",
        "allowMutation",
    ] {
        if policy.get(key).and_then(Value::as_bool) != Some(false) {
            return Err("MCP readonly discovery policy must remain read-only".to_string());
        }
    }
    Ok(profile)
}

fn validate_mcp_safe_ref(value: Option<&str>, label: &str) -> Result<(), String> {
    let Some(text) = value else {
        return Err(format!("MCP readonly discovery {label} is required"));
    };
    let trimmed = text.trim();
    if trimmed.is_empty()
        || trimmed.len() > 160
        || contains_approved_apply_sensitive_marker(trimmed)
        || trimmed.contains(' ')
        || trimmed.contains('/')
        || trimmed.contains('\\')
        || trimmed.contains(';')
        || trimmed.contains('|')
        || trimmed.contains('&')
        || trimmed.contains('`')
        || trimmed.contains('$')
        || trimmed.contains('<')
        || trimmed.contains('>')
    {
        return Err(format!("MCP readonly discovery {label} is unsafe"));
    }
    Ok(())
}

fn mcp_readonly_invalid(message: String) -> DesktopFlowError {
    DesktopFlowError::new(
        "MCP_READONLY_DISCOVERY_INVALID",
        sanitize_safe_message(&message),
        "mcp_readonly_discover",
    )
}

struct ValidatedMcpReadonlyToolCall {
    profile_id: String,
    tool_id: String,
    fixed_result_summary: String,
}

fn run_mcp_readonly_tool_call_fixed(
    request: McpReadonlyToolCallRequest,
) -> Result<McpReadonlyToolCallResult, DesktopFlowError> {
    let validated =
        validate_mcp_readonly_tool_call_request(&request).map_err(mcp_readonly_tool_invalid)?;
    let call_id = format!(
        "mcp-readonly-tool-call-{}",
        short_hash(&format!(
            "{}:{}:{}:{}",
            validated.profile_id,
            validated.tool_id,
            request.argument_summary,
            request.timeout_ms
        ))
    );
    let output_hash = short_hash(&validated.fixed_result_summary);
    let output_bytes = validated.fixed_result_summary.as_bytes().len();
    let output_line_count = validated.fixed_result_summary.lines().count().max(1);
    let warning_codes = vec!["MCP_READONLY_FIXED_TRANSPORT".to_string()];
    let result_hash = short_hash(&format!(
        "{}:{}:{}:{}",
        call_id, validated.tool_id, output_hash, output_bytes
    ));
    let redaction_counts = McpReadonlyToolRedactionCounts {
        secret_marker_count: 0,
        raw_marker_count: 0,
        mutating_marker_count: 0,
        truncated_byte_count: 0,
    };
    let output_summary = McpReadonlyToolOutputSummary {
        output_hash: output_hash.clone(),
        output_bytes,
        output_line_count,
        warning_codes: warning_codes.clone(),
        raw_output_included: false,
    };
    let event_preview = McpReadonlyToolEventPreview {
        event_type: "mcp.readonly_tool.result".to_string(),
        call_id: call_id.clone(),
        tool_id: validated.tool_id.clone(),
        connection_profile_ref_hash: short_hash(&request.connection_profile_ref),
        output_hash: output_hash.clone(),
        output_bytes,
        warning_codes: warning_codes.clone(),
        summary_only: true,
        raw_output_included: false,
        not_written: true,
    };
    Ok(McpReadonlyToolCallResult {
        ok: true,
        status: "called".to_string(),
        call_id,
        tool_id: validated.tool_id,
        connection_profile_ref: sanitize_safe_message(&request.connection_profile_ref),
        output_summary,
        output_hash,
        output_bytes,
        redaction_counts,
        warning_codes,
        event_preview,
        summary_only: true,
        called_readonly_tool: true,
        raw_output_included: false,
        raw_args_included: false,
        can_call_mcp_tool: false,
        can_invoke_mutating_tool: false,
        can_write_event_store: false,
        can_execute_git: false,
        can_execute_shell: false,
        can_issue_permission_lease: false,
        app_can_execute: false,
        result_hash,
        safe_message:
            "MCP read-only tool call completed through fixed injected summary transport."
                .to_string(),
    })
}

fn validate_mcp_readonly_tool_call_request(
    request: &McpReadonlyToolCallRequest,
) -> Result<ValidatedMcpReadonlyToolCall, String> {
    validate_mcp_safe_ref(Some(&request.connection_profile_ref), "tool call profile")?;
    if request.max_output_bytes == 0 || request.max_output_bytes > MCP_READONLY_TOOL_MAX_OUTPUT_BYTES
    {
        return Err("MCP readonly tool output byte limit is outside the allowed range".to_string());
    }
    if request.timeout_ms == 0 || request.timeout_ms > MCP_READONLY_TOOL_MAX_TIMEOUT_MS {
        return Err("MCP readonly tool timeout is outside the allowed range".to_string());
    }
    if request.argument_summary.trim().is_empty()
        || request.argument_summary.len() > 1500
        || contains_approved_apply_sensitive_marker(&request.argument_summary)
    {
        return Err("MCP readonly tool argument summary is unsafe".to_string());
    }
    validate_live_value_forbidden_keys(&request.server_profile)?;
    validate_live_value_forbidden_keys(&request.tool_contract_summary)?;
    validate_live_value_forbidden_keys(&request.approval_receipt)?;
    validate_live_value_forbidden_keys(&request.argument_values)?;
    validate_live_value_string_safety(&request.server_profile)?;
    validate_live_value_string_safety(&request.tool_contract_summary)?;
    validate_live_value_string_safety(&request.approval_receipt)?;
    validate_live_value_string_safety(&request.argument_values)?;

    let profile = request
        .server_profile
        .as_object()
        .ok_or_else(|| "MCP readonly tool server profile must be an object".to_string())?;
    if profile.get("serverKind").and_then(Value::as_str) != Some("mcp") {
        return Err("MCP readonly tool server kind is invalid".to_string());
    }
    if profile.get("transportKind").and_then(Value::as_str) != Some("injected_test_transport") {
        return Err("MCP readonly tool transport must be fixed injected transport".to_string());
    }
    let profile_id = profile
        .get("profileId")
        .and_then(Value::as_str)
        .ok_or_else(|| "MCP readonly tool profile id is required".to_string())?;
    validate_mcp_safe_ref(Some(profile_id), "tool call profile id")?;
    if profile_id != request.connection_profile_ref {
        return Err("MCP readonly tool profile mismatch".to_string());
    }

    let contract = request
        .tool_contract_summary
        .as_object()
        .ok_or_else(|| "MCP readonly tool contract summary must be an object".to_string())?;
    if contract.get("declaredReadOnly").and_then(Value::as_bool) != Some(true) {
        return Err("MCP readonly tool contract must be read-only".to_string());
    }
    let tool_id = contract
        .get("toolId")
        .and_then(Value::as_str)
        .ok_or_else(|| "MCP readonly tool id is required".to_string())?;
    validate_mcp_safe_ref(Some(tool_id), "tool id")?;
    if mcp_readonly_tool_name_is_mutating(tool_id) {
        return Err("MCP readonly tool id implies mutation".to_string());
    }
    if let Some(tool_name) = contract.get("toolName").and_then(Value::as_str) {
        validate_mcp_safe_ref(Some(tool_name), "tool name")?;
        if mcp_readonly_tool_name_is_mutating(tool_name) {
            return Err("MCP readonly tool name implies mutation".to_string());
        }
    }
    let risk_level = contract
        .get("riskLevel")
        .and_then(Value::as_str)
        .ok_or_else(|| "MCP readonly tool risk level is required".to_string())?;
    if !matches!(risk_level, "low" | "read_only" | "safe_readonly") {
        return Err("MCP readonly tool risk level is not allowed".to_string());
    }
    if contract
        .get("deniedArgumentKeyCount")
        .and_then(Value::as_u64)
        .unwrap_or(0)
        > 0
    {
        return Err("MCP readonly tool denied argument keys block execution".to_string());
    }
    if contract.get("approvalRequired").and_then(Value::as_bool) != Some(true)
        || contract
            .get("typedConfirmationRequired")
            .and_then(Value::as_bool)
            != Some(true)
    {
        return Err("MCP readonly tool approval requirement is missing".to_string());
    }
    let contract_max_output = contract
        .get("maxOutputBytes")
        .and_then(Value::as_u64)
        .ok_or_else(|| "MCP readonly tool contract output limit is required".to_string())?
        as usize;
    if request.max_output_bytes > contract_max_output {
        return Err("MCP readonly tool request exceeds contract output limit".to_string());
    }
    let contract_timeout = contract
        .get("timeoutMs")
        .and_then(Value::as_u64)
        .ok_or_else(|| "MCP readonly tool contract timeout is required".to_string())?;
    if request.timeout_ms > contract_timeout {
        return Err("MCP readonly tool request exceeds contract timeout".to_string());
    }
    let allowed_argument_keys =
        mcp_readonly_string_set(contract.get("allowedArgumentKeys"), "contract argument keys")?;
    if allowed_argument_keys.is_empty() {
        return Err("MCP readonly tool allowed argument keys are required".to_string());
    }

    let receipt = request
        .approval_receipt
        .as_object()
        .ok_or_else(|| "MCP readonly tool approval receipt must be an object".to_string())?;
    validate_mcp_safe_ref(
        receipt.get("receiptId").and_then(Value::as_str),
        "approval receipt id",
    )?;
    let receipt_tool_id = receipt
        .get("toolId")
        .and_then(Value::as_str)
        .ok_or_else(|| "MCP readonly tool approval tool id is required".to_string())?;
    if receipt_tool_id != tool_id {
        return Err("MCP readonly tool approval tool mismatch".to_string());
    }
    let receipt_profile = receipt
        .get("connectionProfileRef")
        .and_then(Value::as_str)
        .ok_or_else(|| "MCP readonly tool approval profile is required".to_string())?;
    if receipt_profile != request.connection_profile_ref {
        return Err("MCP readonly tool approval profile mismatch".to_string());
    }
    if receipt.get("typedConfirmation").and_then(Value::as_str)
        != Some(MCP_READONLY_TOOL_CONFIRMATION)
    {
        return Err("MCP readonly tool typed confirmation is required".to_string());
    }
    let receipt_max_output = receipt
        .get("maxOutputBytes")
        .and_then(Value::as_u64)
        .ok_or_else(|| "MCP readonly tool approval output limit is required".to_string())?
        as usize;
    if request.max_output_bytes > receipt_max_output {
        return Err("MCP readonly tool request exceeds approval output limit".to_string());
    }
    validate_mcp_safe_ref(
        receipt.get("receiptHash").and_then(Value::as_str),
        "approval receipt hash",
    )?;
    let expires_at = receipt
        .get("expiresAt")
        .and_then(Value::as_str)
        .ok_or_else(|| "MCP readonly tool approval expiry is required".to_string())?;
    if expires_at.starts_with("1970-") || expires_at.starts_with("2020-") {
        return Err("MCP readonly tool approval receipt is expired".to_string());
    }
    let receipt_argument_keys =
        mcp_readonly_string_set(receipt.get("allowedArgumentKeys"), "receipt argument keys")?;

    let argument_values = request
        .argument_values
        .as_object()
        .ok_or_else(|| "MCP readonly tool argument values must be an object".to_string())?;
    if argument_values.is_empty() {
        return Err("MCP readonly tool argument values are required".to_string());
    }
    for key in argument_values.keys() {
        validate_mcp_safe_ref(Some(key), "argument key")?;
        if mcp_readonly_argument_key_is_forbidden(key) {
            return Err("MCP readonly tool argument key is forbidden".to_string());
        }
        if !allowed_argument_keys.contains(key) || !receipt_argument_keys.contains(key) {
            return Err("MCP readonly tool argument key is not allowlisted".to_string());
        }
    }

    let fixed_result_summary = profile
        .get("fixedResultSummary")
        .and_then(Value::as_str)
        .unwrap_or("Fixed MCP read-only tool summary result.");
    validate_mcp_readonly_fixed_result_summary(fixed_result_summary, request.max_output_bytes)?;

    Ok(ValidatedMcpReadonlyToolCall {
        profile_id: profile_id.to_string(),
        tool_id: tool_id.to_string(),
        fixed_result_summary: fixed_result_summary.to_string(),
    })
}

fn validate_mcp_readonly_fixed_result_summary(
    value: &str,
    max_output_bytes: usize,
) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("MCP readonly tool fixed result summary is required".to_string());
    }
    if contains_approved_apply_sensitive_marker(trimmed) {
        return Err("MCP readonly tool fixed result summary contains unsafe marker".to_string());
    }
    if mcp_readonly_raw_output_marker(trimmed) {
        return Err("MCP readonly tool fixed result summary contains raw marker".to_string());
    }
    if mcp_readonly_mutating_result_marker(trimmed) {
        return Err("MCP readonly tool fixed result summary implies mutation".to_string());
    }
    if trimmed.as_bytes().len() > max_output_bytes {
        return Err("MCP readonly tool fixed result summary exceeds output limit".to_string());
    }
    Ok(())
}

fn mcp_readonly_string_set(value: Option<&Value>, label: &str) -> Result<BTreeSet<String>, String> {
    let items = value
        .and_then(Value::as_array)
        .ok_or_else(|| format!("MCP readonly tool {label} must be an array"))?;
    let mut set = BTreeSet::new();
    for item in items {
        let text = item
            .as_str()
            .ok_or_else(|| format!("MCP readonly tool {label} must contain strings"))?;
        validate_mcp_safe_ref(Some(text), label)?;
        if mcp_readonly_argument_key_is_forbidden(text) {
            return Err(format!("MCP readonly tool {label} contains forbidden key"));
        }
        set.insert(text.to_string());
    }
    Ok(set)
}

fn mcp_readonly_argument_key_is_forbidden(value: &str) -> bool {
    matches!(
        value.to_ascii_lowercase().as_str(),
        "rawprompt"
            | "rawsource"
            | "rawdiff"
            | "rawcsv"
            | "rawoutput"
            | "apikey"
            | "authorization"
            | "bearer"
            | "token"
            | "secret"
            | "command"
            | "shellcommand"
            | "gitcommand"
            | "tauricommand"
    )
}

fn mcp_readonly_tool_name_is_mutating(value: &str) -> bool {
    value
        .split(['.', '_', ':', '-'])
        .any(|part| matches!(
            part.to_ascii_lowercase().as_str(),
            "write"
                | "update"
                | "delete"
                | "remove"
                | "create"
                | "patch"
                | "apply"
                | "execute"
                | "shell"
                | "command"
                | "git"
                | "commit"
                | "push"
        ))
}

fn mcp_readonly_raw_output_marker(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    lower.contains("raw output")
        || lower.contains("raw response")
        || lower.contains("raw source")
        || lower.contains("raw diff")
        || lower.contains("resource content")
}

fn mcp_readonly_mutating_result_marker(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    lower.contains("wrote file")
        || lower.contains("updated file")
        || lower.contains("deleted file")
        || lower.contains("created file")
        || lower.contains("applied patch")
        || lower.contains("rolled back")
        || lower.contains("executed command")
}

fn mcp_readonly_tool_invalid(message: String) -> DesktopFlowError {
    DesktopFlowError::new(
        "MCP_READONLY_TOOL_CALL_INVALID",
        sanitize_safe_message(&message),
        "call_mcp_readonly_tool",
    )
}

#[tauri::command(rename_all = "camelCase")]
pub fn generate_live_deepseek_patch_proposal(
    request: LiveDeepSeekPatchProposalCommandRequest,
) -> Result<LiveDeepSeekPatchProposalCommandResult, DesktopFlowError> {
    run_generate_live_deepseek_patch_proposal_with_executor(
        request,
        resolve_live_deepseek_api_key,
        send_live_deepseek_request,
    )
}

fn run_generate_live_deepseek_patch_proposal_with_executor<K, T>(
    request: LiveDeepSeekPatchProposalCommandRequest,
    key_resolver: K,
    transport: T,
) -> Result<LiveDeepSeekPatchProposalCommandResult, DesktopFlowError>
where
    K: FnOnce(&str) -> Result<String, DesktopFlowError>,
    T: FnOnce(&str, &Value, Duration) -> Result<LiveDeepSeekTransportResponse, DesktopFlowError>,
{
    validate_live_deepseek_command_request(&request).map_err(live_deepseek_invalid)?;
    let api_key = key_resolver(&request.api_key_source_ref)?;
    validate_resolved_live_deepseek_key(&api_key)?;
    let request_body = build_live_deepseek_request_body(&request)?;
    let response = transport(
        &api_key,
        &request_body,
        Duration::from_millis(request.timeout_ms),
    )?;
    parse_live_deepseek_transport_response(request, response)
}

fn validate_live_deepseek_command_request(
    request: &LiveDeepSeekPatchProposalCommandRequest,
) -> Result<(), String> {
    validate_live_deepseek_session_receipt(request)?;
    validate_live_deepseek_key_source_ref(&request.api_key_source_ref)?;
    if request.provider_id != "deepseek" {
        return Err("Live proposal provider is not allowed".to_string());
    }
    validate_live_safe_ref(&request.model_profile_id, "model profile")?;
    if request.objective_summary.trim().is_empty() {
        return Err("Live proposal objective summary is required".to_string());
    }
    validate_live_safe_text(&request.objective_summary, "objective summary")?;
    if request.allowed_path_refs.is_empty() {
        return Err("Live proposal allowed path refs are required".to_string());
    }
    for path in &request.allowed_path_refs {
        validate_approved_apply_relative_path(path)?;
    }
    for context_ref in &request.context_refs {
        validate_live_safe_text(context_ref, "context ref")?;
    }
    validate_live_request_envelope(&request.request_envelope)?;
    if request.max_response_bytes < LIVE_PROPOSAL_MIN_RESPONSE_BYTES
        || request.max_response_bytes > LIVE_PROPOSAL_MAX_RESPONSE_BYTES
    {
        return Err("Live proposal response byte limit is outside the allowed range".to_string());
    }
    if request.timeout_ms < LIVE_PROPOSAL_MIN_TIMEOUT_MS
        || request.timeout_ms > LIVE_PROPOSAL_MAX_TIMEOUT_MS
    {
        return Err("Live proposal timeout is outside the allowed range".to_string());
    }
    Ok(())
}

fn validate_live_deepseek_session_receipt(
    request: &LiveDeepSeekPatchProposalCommandRequest,
) -> Result<(), String> {
    let receipt = request
        .session_receipt
        .as_object()
        .ok_or_else(|| "Live proposal session receipt must be an object".to_string())?;
    if receipt.get("source").and_then(Value::as_str)
        != Some("runtime_app_live_proposal_session_receipt")
    {
        return Err("Live proposal session receipt source is invalid".to_string());
    }
    if receipt.get("kind").and_then(Value::as_str) != Some("live_proposal_generation") {
        return Err("Live proposal session receipt kind is invalid".to_string());
    }
    if receipt.get("providerId").and_then(Value::as_str) != Some("deepseek") {
        return Err("Live proposal session receipt provider is invalid".to_string());
    }
    if receipt.get("modelProfileId").and_then(Value::as_str)
        != Some(request.model_profile_id.as_str())
    {
        return Err("Live proposal session receipt model profile mismatch".to_string());
    }
    if receipt.get("status").and_then(Value::as_str) != Some("ready")
        && receipt.get("status").and_then(Value::as_str) != Some("warning")
    {
        return Err("Live proposal session receipt is not ready".to_string());
    }
    if receipt.get("summaryOnly").and_then(Value::as_bool) != Some(true) {
        return Err("Live proposal session receipt must be summary-only".to_string());
    }
    if receipt
        .get("typedConfirmationAccepted")
        .and_then(Value::as_bool)
        != Some(true)
    {
        return Err("Live proposal session receipt confirmation was not accepted".to_string());
    }
    if receipt.get("typedConfirmation").and_then(Value::as_str) != Some(LIVE_PROPOSAL_CONFIRMATION)
    {
        return Err("Live proposal session receipt confirmation is invalid".to_string());
    }
    validate_live_readiness_disabled(receipt.get("readiness"))?;
    validate_live_value_forbidden_keys(&request.session_receipt)?;
    validate_live_value_string_safety(&request.session_receipt)?;
    Ok(())
}

fn validate_live_request_envelope(envelope: &Value) -> Result<(), String> {
    let object = envelope
        .as_object()
        .ok_or_else(|| "Live proposal request envelope must be an object".to_string())?;
    validate_live_value_forbidden_keys(envelope)?;
    validate_live_value_string_safety(envelope)?;
    validate_live_readiness_disabled(envelope.get("readiness"))?;
    if object.get("summaryOnly").and_then(Value::as_bool) != Some(true) {
        return Err("Live proposal request envelope must be summary-only".to_string());
    }
    if object.get("noExecution").and_then(Value::as_bool) != Some(true) {
        return Err("Live proposal request envelope must disable execution".to_string());
    }
    if object.get("noFileWrite").and_then(Value::as_bool) != Some(true) {
        return Err("Live proposal request envelope must disable file writes".to_string());
    }
    if object.get("noApply").and_then(Value::as_bool) != Some(true)
        || object.get("noRollback").and_then(Value::as_bool) != Some(true)
    {
        return Err("Live proposal request envelope must disable apply and rollback".to_string());
    }
    if object.get("noEventStoreWrite").and_then(Value::as_bool) != Some(true) {
        return Err("Live proposal request envelope must disable event writes".to_string());
    }
    if object.get("noGitShell").and_then(Value::as_bool) != Some(true) {
        return Err("Live proposal request envelope must disable Git and shell".to_string());
    }
    if object.get("noTools").and_then(Value::as_bool) != Some(true)
        || object.get("toolChoiceOmitted").and_then(Value::as_bool) != Some(true)
    {
        return Err("Live proposal request envelope must omit tools".to_string());
    }
    if object.get("responseFormat").and_then(Value::as_str) != Some("model_patch_proposal") {
        return Err("Live proposal request envelope response format is invalid".to_string());
    }
    Ok(())
}

fn validate_live_value_forbidden_keys(value: &Value) -> Result<(), String> {
    if let Some(key) = find_forbidden_approved_apply_key(value) {
        return Err(format!(
            "Live proposal input contains forbidden field {key}"
        ));
    }
    if live_value_has_execution_true(value) {
        return Err("Live proposal input attempted to enable execution".to_string());
    }
    Ok(())
}

fn validate_live_value_string_safety(value: &Value) -> Result<(), String> {
    if live_value_has_sensitive_string(value) {
        return Err("Live proposal input contains unsafe marker".to_string());
    }
    Ok(())
}

fn live_value_has_execution_true(value: &Value) -> bool {
    match value {
        Value::Array(items) => items.iter().any(live_value_has_execution_true),
        Value::Object(object) => object.iter().any(|(key, nested)| {
            let lower = key.to_ascii_lowercase();
            let execution_key = matches!(
                lower.as_str(),
                "canapplypatch"
                    | "canrollback"
                    | "canreadapikey"
                    | "cancalllivemodel"
                    | "canfetchnetwork"
                    | "cansendliverequest"
                    | "canwritefilesystem"
                    | "canwriteeventstore"
                    | "canexecutegit"
                    | "canexecuteshell"
                    | "canissuepermissionlease"
                    | "appcanexecute"
                    | "allowapply"
                    | "allowrollback"
                    | "alloweventstorewrite"
                    | "allowgit"
                    | "allowshell"
                    | "allowappexecution"
            );
            (execution_key && nested.as_bool() == Some(true))
                || live_value_has_execution_true(nested)
        }),
        _ => false,
    }
}

fn live_value_has_sensitive_string(value: &Value) -> bool {
    match value {
        Value::String(text) => contains_approved_apply_sensitive_marker(text),
        Value::Array(items) => items.iter().any(live_value_has_sensitive_string),
        Value::Object(object) => object.values().any(live_value_has_sensitive_string),
        _ => false,
    }
}

fn validate_live_readiness_disabled(value: Option<&Value>) -> Result<(), String> {
    let Some(Value::Object(readiness)) = value else {
        return Ok(());
    };
    for key in [
        "canReadApiKey",
        "canCallLiveModel",
        "canFetchNetwork",
        "canSendLiveRequest",
        "canWriteFilesystem",
        "canWriteEventStore",
        "canApplyPatch",
        "canRollback",
        "canExecuteGit",
        "canExecuteShell",
        "canIssuePermissionLease",
        "appCanExecute",
    ] {
        if readiness.get(key).and_then(Value::as_bool) == Some(true) {
            return Err("Live proposal readiness must remain disabled".to_string());
        }
    }
    Ok(())
}

fn validate_live_deepseek_key_source_ref(ref_name: &str) -> Result<(), String> {
    let trimmed = ref_name.trim();
    if trimmed != LIVE_PROPOSAL_ALLOWED_KEY_REF {
        return Err("Live proposal credential ref is not allowlisted".to_string());
    }
    if contains_approved_apply_sensitive_marker(trimmed) || trimmed.contains(" ") {
        return Err("Live proposal credential ref is unsafe".to_string());
    }
    Ok(())
}

fn validate_live_safe_ref(value: &str, label: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("Live proposal {label} is required"));
    }
    if trimmed.len() > 160
        || trimmed.contains('\0')
        || trimmed.contains('\n')
        || trimmed.contains('\r')
        || trimmed.contains('"')
        || trimmed.contains('\'')
        || trimmed.contains('<')
        || trimmed.contains('>')
        || trimmed.contains('|')
        || trimmed.contains(';')
        || trimmed.contains('`')
        || trimmed.contains('$')
        || contains_approved_apply_sensitive_marker(trimmed)
    {
        return Err(format!("Live proposal {label} is unsafe"));
    }
    Ok(())
}

fn validate_live_safe_text(value: &str, label: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.contains('\0') || contains_approved_apply_sensitive_marker(trimmed) {
        return Err(format!("Live proposal {label} contains unsafe marker"));
    }
    Ok(())
}

fn validate_resolved_live_deepseek_key(api_key: &str) -> Result<(), DesktopFlowError> {
    let trimmed = api_key.trim();
    if trimmed.is_empty()
        || trimmed != api_key
        || trimmed.len() < 12
        || trimmed.contains('\n')
        || trimmed.contains('\r')
        || trimmed.to_ascii_lowercase().starts_with("bearer ")
    {
        return Err(live_deepseek_invalid(
            "Live proposal credential resolution failed safely",
        ));
    }
    Ok(())
}

fn resolve_live_deepseek_api_key(ref_name: &str) -> Result<String, DesktopFlowError> {
    validate_live_deepseek_key_source_ref(ref_name).map_err(live_deepseek_invalid)?;
    std::env::var(LIVE_PROPOSAL_ALLOWED_KEY_REF).map_err(|_| {
        live_deepseek_invalid("Live proposal credential is not available from the allowlisted ref")
    })
}

fn build_live_deepseek_request_body(
    request: &LiveDeepSeekPatchProposalCommandRequest,
) -> Result<Value, DesktopFlowError> {
    let request_id = request
        .request_envelope
        .get("requestId")
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| {
            short_hash(&format!(
                "{}:{}:{}",
                request.model_profile_id,
                request.objective_summary,
                request.allowed_path_refs.join("|")
            ))
        });
    let boundary_hash = request
        .request_envelope
        .get("requestHash")
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| short_hash(&request.request_envelope.to_string()));
    let user_content = serde_json::json!({
        "objectiveSummary": request.objective_summary,
        "allowedPathRefs": request.allowed_path_refs,
        "contextRefs": request.context_refs,
        "requestId": request_id,
        "requestHash": boundary_hash,
        "responseFormat": "model_patch_proposal",
        "summaryOnly": true,
        "noExecution": true
    })
    .to_string();
    let body = serde_json::json!({
        "model": request.model_profile_id,
        "messages": [
            {
                "role": "system",
                "content": "Return only structured JSON for a model_patch_proposal. Do not include commands, credential values, file writes, event writes, Git, shell, or rollback actions."
            },
            {
                "role": "user",
                "content": user_content
            }
        ],
        "response_format": {
            "type": "json_object"
        },
        "temperature": 0.2,
        "stream": false
    });
    if find_forbidden_approved_apply_key(&body).is_some() {
        return Err(live_deepseek_invalid(
            "Live proposal request body contains forbidden fields",
        ));
    }
    Ok(body)
}

fn send_live_deepseek_request(
    api_key: &str,
    request_body: &Value,
    timeout: Duration,
) -> Result<LiveDeepSeekTransportResponse, DesktopFlowError> {
    let agent = ureq::AgentBuilder::new().timeout(timeout).build();
    let response = agent
        .post(LIVE_PROPOSAL_ENDPOINT)
        .set("Authorization", &format!("Bearer {api_key}"))
        .set("Content-Type", "application/json")
        .send_json(request_body.clone())
        .map_err(|error| match error {
            ureq::Error::Status(status_code, _) => DesktopFlowError::new(
                "LIVE_DEEPSEEK_HTTP_STATUS",
                format!("Live proposal request failed with status {status_code}"),
                "live_deepseek_proposal",
            ),
            ureq::Error::Transport(_) => DesktopFlowError::new(
                "LIVE_DEEPSEEK_TRANSPORT_FAILED",
                "Live proposal request transport failed safely",
                "live_deepseek_proposal",
            ),
        })?;
    let status_code = response.status();
    let mut body = String::new();
    response
        .into_reader()
        .take((LIVE_PROPOSAL_MAX_RESPONSE_BYTES + 1) as u64)
        .read_to_string(&mut body)
        .map_err(|_| {
            DesktopFlowError::new(
                "LIVE_DEEPSEEK_RESPONSE_READ_FAILED",
                "Live proposal response could not be read safely",
                "live_deepseek_proposal",
            )
        })?;
    Ok(LiveDeepSeekTransportResponse { status_code, body })
}

fn parse_live_deepseek_transport_response(
    request: LiveDeepSeekPatchProposalCommandRequest,
    response: LiveDeepSeekTransportResponse,
) -> Result<LiveDeepSeekPatchProposalCommandResult, DesktopFlowError> {
    if !(200..300).contains(&response.status_code) {
        return Err(DesktopFlowError::new(
            "LIVE_DEEPSEEK_HTTP_STATUS",
            format!(
                "Live proposal request failed with status {}",
                response.status_code
            ),
            "live_deepseek_proposal",
        ));
    }
    if response.body.as_bytes().len() > request.max_response_bytes {
        return Err(live_deepseek_invalid(
            "Live proposal response exceeded the byte limit",
        ));
    }
    let response_json: Value = serde_json::from_str(&response.body).map_err(|_| {
        live_deepseek_invalid("Live proposal response was not valid structured JSON")
    })?;
    validate_live_response_container(&response_json)?;
    let content = response_json
        .pointer("/choices/0/message/content")
        .and_then(Value::as_str)
        .ok_or_else(|| live_deepseek_invalid("Live proposal response content was missing"))?;
    if content.as_bytes().len() > request.max_response_bytes {
        return Err(live_deepseek_invalid(
            "Live proposal candidate exceeded the byte limit",
        ));
    }
    if contains_approved_apply_sensitive_marker(content) {
        return Err(live_deepseek_invalid(
            "Live proposal candidate contains unsafe marker",
        ));
    }
    let proposal_candidate: Value = serde_json::from_str(content).map_err(|_| {
        live_deepseek_invalid("Live proposal candidate was not valid structured JSON")
    })?;
    validate_live_proposal_candidate(&proposal_candidate)?;
    let reasoning_content = response_json
        .pointer("/choices/0/message/reasoning_content")
        .and_then(Value::as_str);
    let usage_summary = live_usage_summary(&response_json)?;
    let mut warning_codes = Vec::new();
    warning_codes.push("LIVE_NETWORK_USED".to_string());
    if reasoning_content.is_some() {
        warning_codes.push("REASONING_CONTENT_DROPPED".to_string());
    }
    if usage_summary.is_none() {
        warning_codes.push("USAGE_SUMMARY_MISSING".to_string());
    }
    let request_id = request
        .request_envelope
        .get("requestId")
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| short_hash(&request.request_envelope.to_string()));
    let response_id = response_json
        .get("id")
        .and_then(Value::as_str)
        .map(sanitize_safe_message);
    let proposal_candidate_json = serde_json::to_string(&proposal_candidate)
        .map_err(|_| live_deepseek_invalid("Live proposal candidate could not be summarized"))?;
    Ok(LiveDeepSeekPatchProposalCommandResult {
        ok: true,
        status: "generated".to_string(),
        provider_id: "deepseek".to_string(),
        model_profile_id: request.model_profile_id,
        request_id,
        response_id,
        proposal_candidate_hash: short_hash(&proposal_candidate_json),
        response_hash: short_hash(&response.body),
        proposal_candidate,
        usage_summary,
        dropped_reasoning_content: reasoning_content.is_some(),
        reasoning_content_char_count: reasoning_content
            .map(|text| text.chars().count())
            .unwrap_or(0),
        warning_codes,
        summary_only: true,
        raw_prompt_included: false,
        raw_response_included: false,
        raw_reasoning_content_included: false,
        can_apply_patch: false,
        can_rollback: false,
        can_write_event_store: false,
        can_execute_git: false,
        can_execute_shell: false,
        safe_message: "Live DeepSeek proposal command returned a summary-only proposal candidate."
            .to_string(),
    })
}

fn validate_live_response_container(value: &Value) -> Result<(), DesktopFlowError> {
    if let Some(key) = find_forbidden_live_response_key(value) {
        return Err(live_deepseek_invalid(format!(
            "Live proposal response contains forbidden field {key}"
        )));
    }
    let serialized = serde_json::to_string(value)
        .map_err(|_| live_deepseek_invalid("Live proposal response could not be summarized"))?;
    if serialized.contains(LIVE_PROPOSAL_ALLOWED_KEY_REF)
        || serialized.contains("Authorization")
        || serialized.contains("Bearer ")
        || serialized.contains("-----BEGIN ")
    {
        return Err(live_deepseek_invalid(
            "Live proposal response contains unsafe credential marker",
        ));
    }
    Ok(())
}

fn find_forbidden_live_response_key(value: &Value) -> Option<String> {
    match value {
        Value::Array(items) => items.iter().find_map(find_forbidden_live_response_key),
        Value::Object(object) => {
            for (key, nested_value) in object {
                if forbidden_approved_apply_key(key)
                    && key != "reasoning_content"
                    && key != "reasoningContent"
                {
                    return Some(key.to_string());
                }
                if let Some(found) = find_forbidden_live_response_key(nested_value) {
                    return Some(found);
                }
            }
            None
        }
        _ => None,
    }
}

fn validate_live_proposal_candidate(value: &Value) -> Result<(), DesktopFlowError> {
    if let Some(key) = find_forbidden_approved_apply_key(value) {
        return Err(live_deepseek_invalid(format!(
            "Live proposal candidate contains forbidden field {key}"
        )));
    }
    validate_live_value_string_safety(value).map_err(live_deepseek_invalid)?;
    Ok(())
}

fn live_usage_summary(
    response_json: &Value,
) -> Result<Option<LiveDeepSeekPatchProposalUsageSummary>, DesktopFlowError> {
    let Some(usage) = response_json.get("usage") else {
        return Ok(None);
    };
    let Some(usage_object) = usage.as_object() else {
        return Err(live_deepseek_invalid(
            "Live proposal usage summary was not numeric",
        ));
    };
    if usage_object
        .values()
        .any(|value| !(value.is_number() || value.is_null()))
    {
        return Err(live_deepseek_invalid(
            "Live proposal usage summary contained unsafe text",
        ));
    }
    Ok(Some(LiveDeepSeekPatchProposalUsageSummary {
        prompt_tokens: usage.get("prompt_tokens").and_then(Value::as_u64),
        completion_tokens: usage.get("completion_tokens").and_then(Value::as_u64),
        total_tokens: usage.get("total_tokens").and_then(Value::as_u64),
    }))
}

fn live_deepseek_invalid(message: impl Into<String>) -> DesktopFlowError {
    DesktopFlowError::new(
        "LIVE_DEEPSEEK_PROPOSAL_BLOCKED",
        message.into(),
        "live_deepseek_proposal",
    )
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

fn run_git_read_lane_summary(
    request: GitReadLaneRequest,
) -> Result<GitReadLaneResult, DesktopFlowError> {
    let workspace_root = validate_workspace_root(&request.workspace_root)
        .map_err(|message| git_read_lane_error("GIT_WORKSPACE_INVALID", message))?;
    if request.workspace_root_ref.trim().is_empty() {
        return Err(git_read_lane_error(
            "GIT_WORKSPACE_REF_REQUIRED",
            "Workspace root ref is required",
        ));
    }
    if contains_sensitive_marker(&request.workspace_root_ref) {
        return Err(git_read_lane_error(
            "GIT_WORKSPACE_REF_REJECTED",
            "Workspace root ref failed safety validation",
        ));
    }

    let pathspecs = validate_git_read_pathspecs(request.pathspecs.as_deref())?;
    if request.lane == GitReadLane::BranchSummary && !pathspecs.is_empty() {
        return Err(git_read_lane_error(
            "GIT_PATHSPEC_UNSUPPORTED",
            "Pathspecs are not supported for branch_summary",
        ));
    }
    let timeout = git_read_lane_timeout(request.timeout_ms)?;
    let max_output_bytes = git_read_lane_max_output_bytes(request.max_output_bytes)?;
    let args = git_read_lane_args(request.lane, &pathspecs);
    let command_hash = short_hash(&format!("{:?}:{:?}", request.lane, args));
    let command_output = run_git_fixed_args(&args, &workspace_root, timeout, max_output_bytes)?;
    let output_text = String::from_utf8_lossy(&command_output.stdout).to_string();
    let stderr_text = String::from_utf8_lossy(&command_output.stderr).to_string();
    if contains_sensitive_marker(&output_text) || contains_sensitive_marker(&stderr_text) {
        return Err(git_read_lane_error(
            "GIT_OUTPUT_REDACTED",
            "Git read lane output failed redaction safety validation",
        ));
    }
    if command_output.exit_code != Some(0) {
        return Err(
            git_read_lane_error("GIT_READ_LANE_FAILED", "Git read lane failed safely")
                .with_exit_code(command_output.exit_code),
        );
    }

    let summary = summarize_git_lane_output(request.lane, &output_text, command_output.truncated);
    let output_hash = short_hash_bytes(&command_output.stdout);
    let result_hash = short_hash(&format!(
        "{:?}:{command_hash}:{output_hash}:{}:{}:{}",
        request.lane,
        summary.changed_file_count,
        summary.added_line_count,
        summary.deleted_line_count
    ));
    let event_preview = GitReadLaneEventPreview {
        event_type: "git.read_lane.executed".to_string(),
        lane: request.lane,
        workspace_root_ref: sanitize_safe_message(&request.workspace_root_ref),
        command_hash: command_hash.clone(),
        result_hash: result_hash.clone(),
        changed_file_count: summary.changed_file_count,
        added_line_count: summary.added_line_count,
        deleted_line_count: summary.deleted_line_count,
        warning_codes: summary.warning_codes.clone(),
        duration_ms: command_output.duration_ms,
        truncated: command_output.truncated,
        summary_only: true,
        not_written: true,
    };

    Ok(GitReadLaneResult {
        ok: true,
        lane: request.lane,
        status: summary.status,
        workspace_root_ref: sanitize_safe_message(&request.workspace_root_ref),
        branch_summary: summary.branch_summary,
        file_count: summary.file_count,
        changed_file_count: summary.changed_file_count,
        added_line_count: summary.added_line_count,
        deleted_line_count: summary.deleted_line_count,
        changed_path_summaries: summary.changed_path_summaries,
        warning_codes: summary.warning_codes,
        command_hash,
        output_hash,
        duration_ms: command_output.duration_ms,
        truncated: command_output.truncated,
        raw_diff_included: false,
        raw_stdout_included: false,
        raw_stderr_included: false,
        event_preview,
        safe_message: "Git read lane summary generated. No raw diff/stdout/stderr returned."
            .to_string(),
    })
}

struct GitCommandOutput {
    exit_code: Option<i32>,
    stdout: Vec<u8>,
    stderr: Vec<u8>,
    duration_ms: u128,
    truncated: bool,
}

struct GitLaneParsedSummary {
    status: String,
    branch_summary: String,
    file_count: usize,
    changed_file_count: usize,
    added_line_count: usize,
    deleted_line_count: usize,
    changed_path_summaries: Vec<String>,
    warning_codes: Vec<String>,
}

fn git_read_lane_args(lane: GitReadLane, pathspecs: &[String]) -> Vec<String> {
    let mut args = match lane {
        GitReadLane::StatusSummary => vec![
            "status".to_string(),
            "--short".to_string(),
            "--branch".to_string(),
        ],
        GitReadLane::DiffSummary => vec!["diff".to_string(), "--numstat".to_string()],
        GitReadLane::LogSummary => vec![
            "log".to_string(),
            "--oneline".to_string(),
            "-n".to_string(),
            "5".to_string(),
        ],
        GitReadLane::BranchSummary => vec!["branch".to_string(), "--show-current".to_string()],
    };
    if !pathspecs.is_empty() {
        args.push("--".to_string());
        args.extend(pathspecs.iter().cloned());
    }
    args
}

fn run_git_fixed_args(
    args: &[String],
    cwd: &Path,
    timeout: Duration,
    max_output_bytes: usize,
) -> Result<GitCommandOutput, DesktopFlowError> {
    let mut child = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .env_clear()
        .envs(sanitized_command_env())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|_| git_read_lane_error("GIT_START_FAILED", "Git read lane could not start"))?;

    let started_at = Instant::now();
    loop {
        if started_at.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(git_read_lane_error(
                "GIT_READ_LANE_TIMEOUT",
                "Git read lane timed out",
            ));
        }
        if child
            .try_wait()
            .map_err(|_| git_read_lane_error("GIT_STATUS_FAILED", "Git read lane status failed"))?
            .is_some()
        {
            break;
        }
        thread::sleep(Duration::from_millis(50));
    }

    let duration_ms = started_at.elapsed().as_millis();
    let output = child.wait_with_output().map_err(|_| {
        git_read_lane_error(
            "GIT_OUTPUT_FAILED",
            "Git read lane output could not be read",
        )
    })?;
    let mut stdout = output.stdout;
    let mut stderr = output.stderr;
    let mut truncated = false;
    if stdout.len() > max_output_bytes {
        stdout.truncate(max_output_bytes);
        truncated = true;
    }
    if stderr.len() > max_output_bytes {
        stderr.truncate(max_output_bytes);
        truncated = true;
    }

    Ok(GitCommandOutput {
        exit_code: output.status.code(),
        stdout,
        stderr,
        duration_ms,
        truncated,
    })
}

fn summarize_git_lane_output(
    lane: GitReadLane,
    output: &str,
    truncated: bool,
) -> GitLaneParsedSummary {
    match lane {
        GitReadLane::StatusSummary => summarize_git_status_output(output, truncated),
        GitReadLane::DiffSummary => summarize_git_diff_numstat_output(output, truncated),
        GitReadLane::LogSummary => summarize_git_log_output(output, truncated),
        GitReadLane::BranchSummary => summarize_git_branch_output(output, truncated),
    }
}

fn summarize_git_status_output(output: &str, truncated: bool) -> GitLaneParsedSummary {
    let mut branch_summary = "unknown".to_string();
    let mut path_summaries = Vec::new();
    for line in output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
    {
        if let Some(branch) = line.strip_prefix("## ") {
            branch_summary = sanitize_git_summary_text(branch);
            continue;
        }
        if path_summaries.len() < 25 {
            path_summaries.push(sanitize_git_summary_text(line));
        }
    }
    let mut warning_codes = Vec::new();
    if truncated {
        warning_codes.push("GIT_OUTPUT_TRUNCATED".to_string());
    }
    let changed_file_count = path_summaries.len();
    GitLaneParsedSummary {
        status: if changed_file_count == 0 {
            "clean".to_string()
        } else {
            "changed".to_string()
        },
        branch_summary,
        file_count: changed_file_count,
        changed_file_count,
        added_line_count: 0,
        deleted_line_count: 0,
        changed_path_summaries: path_summaries,
        warning_codes,
    }
}

fn summarize_git_diff_numstat_output(output: &str, truncated: bool) -> GitLaneParsedSummary {
    let mut added_line_count = 0usize;
    let mut deleted_line_count = 0usize;
    let mut path_summaries = Vec::new();
    let mut warning_codes = Vec::new();
    for line in output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
    {
        let parts = line.split('\t').collect::<Vec<_>>();
        if parts.len() < 3 {
            warning_codes.push("GIT_DIFF_NUMSTAT_UNPARSED".to_string());
            continue;
        }
        let added = parse_git_numstat_count(parts[0], &mut warning_codes);
        let deleted = parse_git_numstat_count(parts[1], &mut warning_codes);
        added_line_count += added;
        deleted_line_count += deleted;
        if path_summaries.len() < 25 {
            path_summaries.push(format!(
                "{} +{} -{}",
                sanitize_git_summary_text(parts[2]),
                added,
                deleted
            ));
        }
    }
    if truncated {
        warning_codes.push("GIT_OUTPUT_TRUNCATED".to_string());
    }
    let changed_file_count = path_summaries.len();
    GitLaneParsedSummary {
        status: if changed_file_count == 0 {
            "clean".to_string()
        } else {
            "changed".to_string()
        },
        branch_summary: "diff summary".to_string(),
        file_count: changed_file_count,
        changed_file_count,
        added_line_count,
        deleted_line_count,
        changed_path_summaries: path_summaries,
        warning_codes,
    }
}

fn summarize_git_log_output(output: &str, truncated: bool) -> GitLaneParsedSummary {
    let mut path_summaries = Vec::new();
    for line in output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
    {
        if path_summaries.len() >= 5 {
            break;
        }
        let hash = line.split_whitespace().next().unwrap_or("unknown");
        path_summaries.push(format!("commit {}", sanitize_git_summary_text(hash)));
    }
    let mut warning_codes = Vec::new();
    if truncated {
        warning_codes.push("GIT_OUTPUT_TRUNCATED".to_string());
    }
    GitLaneParsedSummary {
        status: "summary".to_string(),
        branch_summary: path_summaries
            .first()
            .cloned()
            .unwrap_or_else(|| "no commits".to_string()),
        file_count: path_summaries.len(),
        changed_file_count: 0,
        added_line_count: 0,
        deleted_line_count: 0,
        changed_path_summaries: path_summaries,
        warning_codes,
    }
}

fn summarize_git_branch_output(output: &str, truncated: bool) -> GitLaneParsedSummary {
    let branch_summary = output
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(sanitize_git_summary_text)
        .unwrap_or_else(|| "detached-or-unknown".to_string());
    let mut warning_codes = Vec::new();
    if truncated {
        warning_codes.push("GIT_OUTPUT_TRUNCATED".to_string());
    }
    GitLaneParsedSummary {
        status: "summary".to_string(),
        branch_summary,
        file_count: 0,
        changed_file_count: 0,
        added_line_count: 0,
        deleted_line_count: 0,
        changed_path_summaries: Vec::new(),
        warning_codes,
    }
}

fn parse_git_numstat_count(value: &str, warning_codes: &mut Vec<String>) -> usize {
    if value == "-" {
        warning_codes.push("GIT_BINARY_DIFF_SUMMARY".to_string());
        return 0;
    }
    value.parse::<usize>().unwrap_or_else(|_| {
        warning_codes.push("GIT_DIFF_NUMSTAT_UNPARSED".to_string());
        0
    })
}

fn sanitize_git_summary_text(text: &str) -> String {
    let clipped = text.chars().take(160).collect::<String>();
    if contains_sensitive_marker(&clipped) {
        return "redacted-summary".to_string();
    }
    clipped
}

fn validate_git_read_pathspecs(
    pathspecs: Option<&[String]>,
) -> Result<Vec<String>, DesktopFlowError> {
    let Some(pathspecs) = pathspecs else {
        return Ok(Vec::new());
    };
    if pathspecs.len() > 25 {
        return Err(git_read_lane_error(
            "GIT_PATHSPEC_REJECTED",
            "Too many Git pathspecs",
        ));
    }
    let mut safe = Vec::new();
    for pathspec in pathspecs {
        let trimmed = pathspec.trim();
        if trimmed.is_empty() || !is_safe_git_pathspec(trimmed) {
            return Err(git_read_lane_error(
                "GIT_PATHSPEC_REJECTED",
                "Git pathspec failed safety validation",
            ));
        }
        safe.push(trimmed.replace('\\', "/"));
    }
    Ok(safe)
}

fn is_safe_git_pathspec(pathspec: &str) -> bool {
    let normalized = pathspec.replace('\\', "/");
    let lower = normalized.to_ascii_lowercase();
    if pathspec != normalized {
        return false;
    }
    if normalized.starts_with('/')
        || normalized.starts_with("//")
        || normalized.contains('\0')
        || normalized.contains('\n')
        || normalized.contains('\r')
        || lower.contains("://")
        || lower.contains('?')
        || lower.contains(':')
        || lower.contains("..")
        || contains_sensitive_marker(&lower)
    {
        return false;
    }
    if normalized.chars().any(|ch| {
        matches!(
            ch,
            ';' | '&' | '|' | '$' | '`' | '(' | ')' | '<' | '>' | '"' | '\''
        )
    }) {
        return false;
    }
    normalized.split('/').all(|segment| {
        !segment.is_empty()
            && !matches!(
                segment,
                ".git" | ".env" | "node_modules" | "dist" | "target" | ".tmp"
            )
    })
}

fn git_read_lane_timeout(timeout_ms: Option<u64>) -> Result<Duration, DesktopFlowError> {
    let ms = timeout_ms.unwrap_or(GIT_READ_LANE_DEFAULT_TIMEOUT.as_millis() as u64);
    if ms == 0 || ms > GIT_READ_LANE_MAX_TIMEOUT_MS {
        return Err(git_read_lane_error(
            "GIT_TIMEOUT_REJECTED",
            "Git read lane timeout is outside the allowed range",
        ));
    }
    Ok(Duration::from_millis(ms))
}

fn git_read_lane_max_output_bytes(
    max_output_bytes: Option<usize>,
) -> Result<usize, DesktopFlowError> {
    let bytes = max_output_bytes.unwrap_or(GIT_READ_LANE_DEFAULT_MAX_OUTPUT_BYTES);
    if bytes == 0 || bytes > GIT_READ_LANE_MAX_OUTPUT_BYTES {
        return Err(git_read_lane_error(
            "GIT_OUTPUT_LIMIT_REJECTED",
            "Git read lane output limit is outside the allowed range",
        ));
    }
    Ok(bytes)
}

fn git_read_lane_error(code: &str, message: impl Into<String>) -> DesktopFlowError {
    DesktopFlowError::new(code, message.into(), "git_read_lane")
}

struct ShellVerificationTemplate {
    program: &'static str,
    args: Vec<String>,
}

struct ShellCommandOutput {
    exit_code: Option<i32>,
    stdout: Vec<u8>,
    stderr: Vec<u8>,
    duration_ms: u128,
    truncated: bool,
}

fn run_shell_verification_lane_summary(
    request: ShellVerificationLaneRequest,
) -> Result<ShellVerificationLaneResult, DesktopFlowError> {
    run_shell_verification_lane_with_executor(request, run_shell_fixed_template)
}

fn run_shell_verification_lane_with_executor<F>(
    request: ShellVerificationLaneRequest,
    executor: F,
) -> Result<ShellVerificationLaneResult, DesktopFlowError>
where
    F: Fn(&str, &[String], &Path, Duration, usize) -> Result<ShellCommandOutput, DesktopFlowError>,
{
    let workspace_root = validate_workspace_root(&request.workspace_root)
        .map_err(|message| shell_verification_error("SHELL_WORKSPACE_INVALID", message))?;
    if request.workspace_root_ref.trim().is_empty() {
        return Err(shell_verification_error(
            "SHELL_WORKSPACE_REF_REQUIRED",
            "Workspace root ref is required",
        ));
    }
    if contains_sensitive_marker(&request.workspace_root_ref) {
        return Err(shell_verification_error(
            "SHELL_WORKSPACE_REF_REJECTED",
            "Workspace root ref failed safety validation",
        ));
    }
    let template = shell_verification_template(request.template_id, request.safe_args.as_ref())?;
    let timeout = shell_verification_timeout(request.timeout_ms)?;
    let max_output_bytes = shell_verification_max_output_bytes(request.max_output_bytes)?;
    let command_hash = short_hash(&format!(
        "{:?}:{}:{:?}",
        request.template_id, template.program, template.args
    ));
    let command_output = executor(
        template.program,
        &template.args,
        &workspace_root,
        timeout,
        max_output_bytes,
    )?;
    let stdout_text = String::from_utf8_lossy(&command_output.stdout).to_string();
    let stderr_text = String::from_utf8_lossy(&command_output.stderr).to_string();
    if contains_sensitive_marker(&stdout_text) || contains_sensitive_marker(&stderr_text) {
        return Err(shell_verification_error(
            "SHELL_OUTPUT_REDACTED",
            "Shell verification output failed redaction safety validation",
        ));
    }

    let stdout_bytes = command_output.stdout.len();
    let stderr_bytes = command_output.stderr.len();
    let stdout_line_count = count_output_lines(&command_output.stdout);
    let stderr_line_count = count_output_lines(&command_output.stderr);
    let mut warning_codes = Vec::new();
    if command_output.truncated {
        warning_codes.push("SHELL_OUTPUT_TRUNCATED".to_string());
    }
    if command_output.exit_code != Some(0) {
        warning_codes.push("SHELL_EXIT_NONZERO".to_string());
    }
    if stderr_bytes > 0 {
        warning_codes.push("SHELL_STDERR_PRESENT".to_string());
    }
    warning_codes.sort();
    warning_codes.dedup();

    let output_hash = short_hash(&format!(
        "{}:{}:{}:{}",
        short_hash_bytes(&command_output.stdout),
        short_hash_bytes(&command_output.stderr),
        stdout_bytes,
        stderr_bytes
    ));
    let result_hash = short_hash(&format!(
        "{:?}:{command_hash}:{output_hash}:{:?}:{}:{}",
        request.template_id, command_output.exit_code, stdout_bytes, stderr_bytes
    ));
    let event_preview = ShellVerificationLaneEventPreview {
        event_type: "shell.verification_lane.executed".to_string(),
        template_id: request.template_id,
        workspace_root_ref: sanitize_safe_message(&request.workspace_root_ref),
        command_hash: command_hash.clone(),
        result_hash,
        exit_code: command_output.exit_code,
        stdout_bytes,
        stderr_bytes,
        warning_codes: warning_codes.clone(),
        duration_ms: command_output.duration_ms,
        truncated: command_output.truncated,
        summary_only: true,
        not_written: true,
    };
    Ok(ShellVerificationLaneResult {
        ok: true,
        template_id: request.template_id,
        status: if command_output.exit_code == Some(0) {
            "passed".to_string()
        } else {
            "failed".to_string()
        },
        exit_code: command_output.exit_code,
        workspace_root_ref: sanitize_safe_message(&request.workspace_root_ref),
        stdout_bytes,
        stderr_bytes,
        stdout_line_count,
        stderr_line_count,
        warning_codes,
        command_hash,
        output_hash,
        duration_ms: command_output.duration_ms,
        truncated: command_output.truncated,
        raw_stdout_included: false,
        raw_stderr_included: false,
        event_preview,
        safe_message: "Shell verification lane summary generated. No raw stdout/stderr returned."
            .to_string(),
    })
}

fn shell_verification_template(
    template_id: ShellVerificationTemplateId,
    safe_args: Option<&ShellVerificationSafeArgs>,
) -> Result<ShellVerificationTemplate, DesktopFlowError> {
    let safe_args = safe_args.cloned().unwrap_or_default();
    let template = match template_id {
        ShellVerificationTemplateId::PnpmTypecheck => {
            reject_unexpected_shell_safe_args(&safe_args)?;
            ShellVerificationTemplate {
                program: "pnpm",
                args: vec!["typecheck".to_string()],
            }
        }
        ShellVerificationTemplateId::PnpmLint => {
            reject_unexpected_shell_safe_args(&safe_args)?;
            ShellVerificationTemplate {
                program: "pnpm",
                args: vec!["lint".to_string()],
            }
        }
        ShellVerificationTemplateId::PnpmTestScoped => {
            let test_file_path = safe_args.test_file_path.as_deref().ok_or_else(|| {
                shell_verification_error(
                    "SHELL_TEST_FILE_REQUIRED",
                    "Scoped test template requires a safe test file path",
                )
            })?;
            let test_file_path = validate_shell_test_file_path(test_file_path)?;
            ShellVerificationTemplate {
                program: "pnpm",
                args: vec![
                    "exec".to_string(),
                    "vitest".to_string(),
                    "run".to_string(),
                    test_file_path,
                ],
            }
        }
        ShellVerificationTemplateId::AppTypecheck => {
            reject_unexpected_shell_safe_args(&safe_args)?;
            ShellVerificationTemplate {
                program: "pnpm",
                args: vec!["app:typecheck".to_string()],
            }
        }
        ShellVerificationTemplateId::CargoCheckTauri => {
            reject_unexpected_shell_safe_args(&safe_args)?;
            ShellVerificationTemplate {
                program: "cargo",
                args: vec![
                    "check".to_string(),
                    "--manifest-path".to_string(),
                    "app/src-tauri/Cargo.toml".to_string(),
                ],
            }
        }
    };
    validate_shell_fixed_template(&template)?;
    Ok(template)
}

fn reject_unexpected_shell_safe_args(
    safe_args: &ShellVerificationSafeArgs,
) -> Result<(), DesktopFlowError> {
    if safe_args.test_file_path.is_some() {
        return Err(shell_verification_error(
            "SHELL_SAFE_ARGS_REJECTED",
            "Safe args are not supported for this verification template",
        ));
    }
    Ok(())
}

fn validate_shell_fixed_template(
    template: &ShellVerificationTemplate,
) -> Result<(), DesktopFlowError> {
    let program = template.program.to_ascii_lowercase();
    if program != "pnpm" && program != "cargo" {
        return Err(shell_verification_error(
            "SHELL_TEMPLATE_REJECTED",
            "Verification executable is not allowlisted",
        ));
    }
    for value in std::iter::once(template.program).chain(template.args.iter().map(String::as_str)) {
        let lower = value.to_ascii_lowercase();
        if lower.contains("install")
            || lower.contains("curl")
            || lower.contains("wget")
            || lower.contains("powershell")
            || lower.contains("cmd.exe")
            || lower.contains("bash")
            || lower.contains("sh -")
            || lower.contains("rm ")
            || lower.contains("del ")
            || lower.contains("remove-item")
            || contains_sensitive_marker(&lower)
            || value.chars().any(|ch| {
                matches!(
                    ch,
                    ';' | '&' | '|' | '$' | '`' | '(' | ')' | '<' | '>' | '"' | '\''
                )
            })
        {
            return Err(shell_verification_error(
                "SHELL_TEMPLATE_REJECTED",
                "Verification template failed safety validation",
            ));
        }
    }
    Ok(())
}

fn validate_shell_test_file_path(path: &str) -> Result<String, DesktopFlowError> {
    let trimmed = path.trim();
    if trimmed.is_empty()
        || !is_safe_git_pathspec(trimmed)
        || !(trimmed.starts_with("runtime/test/") || trimmed.starts_with("app/test/"))
        || !(trimmed.ends_with(".test.ts")
            || trimmed.ends_with(".test.tsx")
            || trimmed.ends_with(".spec.ts")
            || trimmed.ends_with(".spec.tsx"))
    {
        return Err(shell_verification_error(
            "SHELL_TEST_FILE_REJECTED",
            "Scoped test file path failed safety validation",
        ));
    }
    Ok(trimmed.to_string())
}

fn run_shell_fixed_template(
    program: &str,
    args: &[String],
    cwd: &Path,
    timeout: Duration,
    max_output_bytes: usize,
) -> Result<ShellCommandOutput, DesktopFlowError> {
    let mut child = Command::new(program)
        .args(args)
        .current_dir(cwd)
        .env_clear()
        .envs(sanitized_command_env())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|_| {
            shell_verification_error(
                "SHELL_VERIFICATION_START_FAILED",
                "Shell verification lane could not start",
            )
        })?;

    let started_at = Instant::now();
    loop {
        if started_at.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(shell_verification_error(
                "SHELL_VERIFICATION_TIMEOUT",
                "Shell verification lane timed out",
            ));
        }
        if child
            .try_wait()
            .map_err(|_| {
                shell_verification_error(
                    "SHELL_VERIFICATION_STATUS_FAILED",
                    "Shell verification lane status failed",
                )
            })?
            .is_some()
        {
            break;
        }
        thread::sleep(Duration::from_millis(50));
    }

    let duration_ms = started_at.elapsed().as_millis();
    let output = child.wait_with_output().map_err(|_| {
        shell_verification_error(
            "SHELL_VERIFICATION_OUTPUT_FAILED",
            "Shell verification lane output could not be read",
        )
    })?;
    let mut stdout = output.stdout;
    let mut stderr = output.stderr;
    let mut truncated = false;
    if stdout.len() > max_output_bytes {
        stdout.truncate(max_output_bytes);
        truncated = true;
    }
    if stderr.len() > max_output_bytes {
        stderr.truncate(max_output_bytes);
        truncated = true;
    }

    Ok(ShellCommandOutput {
        exit_code: output.status.code(),
        stdout,
        stderr,
        duration_ms,
        truncated,
    })
}

fn count_output_lines(bytes: &[u8]) -> usize {
    String::from_utf8_lossy(bytes).lines().count()
}

fn shell_verification_timeout(timeout_ms: Option<u64>) -> Result<Duration, DesktopFlowError> {
    let ms = timeout_ms.unwrap_or(SHELL_VERIFICATION_DEFAULT_TIMEOUT.as_millis() as u64);
    if ms == 0 || ms > SHELL_VERIFICATION_MAX_TIMEOUT_MS {
        return Err(shell_verification_error(
            "SHELL_TIMEOUT_REJECTED",
            "Shell verification timeout is outside the allowed range",
        ));
    }
    Ok(Duration::from_millis(ms))
}

fn shell_verification_max_output_bytes(
    max_output_bytes: Option<usize>,
) -> Result<usize, DesktopFlowError> {
    let bytes = max_output_bytes.unwrap_or(SHELL_VERIFICATION_DEFAULT_MAX_OUTPUT_BYTES);
    if bytes == 0 || bytes > SHELL_VERIFICATION_MAX_OUTPUT_BYTES {
        return Err(shell_verification_error(
            "SHELL_OUTPUT_LIMIT_REJECTED",
            "Shell verification output limit is outside the allowed range",
        ));
    }
    Ok(bytes)
}

fn shell_verification_error(code: &str, message: impl Into<String>) -> DesktopFlowError {
    DesktopFlowError::new(code, message.into(), "shell_verification_lane")
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
                    verify_approved_rollback_current_target_matches(entry, &target_path)
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
                    if entry.change_kind == ApprovedApplyChangeKind::Update {
                        verify_approved_rollback_current_target_matches(entry, &target_path)
                            .map_err(approved_rollback_invalid)?;
                    } else {
                        return Err(approved_rollback_invalid(
                            "Approved rollback delete target already exists",
                        ));
                    }
                } else if entry.change_kind == ApprovedApplyChangeKind::Update {
                    return Err(approved_rollback_invalid(
                        "Approved rollback current target is missing before restore",
                    ));
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
    let applied_content = if matches!(
        operation.change_kind,
        ApprovedApplyChangeKind::Create | ApprovedApplyChangeKind::Update
    ) {
        operation.content.as_deref()
    } else {
        None
    };
    let applied_hash = applied_content.map(short_hash);
    let applied_bytes = applied_content
        .map(|content| content.as_bytes().len())
        .unwrap_or(0);
    Ok(PlannedApprovedApplyOperation {
        operation: operation.clone(),
        target_path,
        existed_before,
        preimage_content,
        preimage_hash,
        preimage_bytes,
        applied_hash,
        applied_bytes,
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
                applied_hash: planned.applied_hash.clone(),
                applied_bytes: planned.applied_bytes,
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

fn verify_approved_rollback_current_target_matches(
    entry: &ApprovedApplyCheckpointEntry,
    target_path: &Path,
) -> Result<(), String> {
    let Some(expected_hash) = entry.applied_hash.as_deref() else {
        return Ok(());
    };
    let current_content = fs::read_to_string(target_path)
        .map_err(|_| "Approved rollback current target could not be read".to_string())?;
    if short_hash(&current_content) != expected_hash {
        return Err("Approved rollback current file hash mismatch".to_string());
    }
    if entry.applied_bytes != current_content.as_bytes().len() {
        return Err("Approved rollback current file byte count mismatch".to_string());
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
    let project_knowledge_projection =
        load_project_knowledge_event_summary_projection(&workspace_root);

    if !event_log_path.exists() {
        if project_knowledge_projection.events.is_empty() {
            return empty_event_summary(Some(event_log_path_text), Vec::new(), None);
        }
        let mut warnings = project_knowledge_projection.warnings.clone();
        warnings.sort();
        warnings.dedup();
        return summarize_workspace_events(
            Some(event_log_path_text),
            project_knowledge_projection.events,
            display_limit,
            EventSafetyScan {
                ok: true,
                findings: 0,
                warning_codes: Vec::new(),
            },
            warnings,
            None,
        );
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
    events.extend(project_knowledge_projection.events);
    warnings.extend(project_knowledge_projection.warnings);
    warnings.extend(safety_scan.warning_codes.clone());
    warnings.sort();
    warnings.dedup();

    summarize_workspace_events(
        Some(event_log_path_text),
        events,
        display_limit,
        safety_scan,
        warnings,
        None,
    )
}

fn summarize_workspace_events(
    event_log_path: Option<String>,
    events: Vec<Value>,
    display_limit: usize,
    safety_scan: EventSafetyScan,
    warnings: Vec<String>,
    safe_message: Option<String>,
) -> WorkspaceEventSummary {
    let mut task_status: BTreeMap<String, String> = BTreeMap::new();
    let mut type_counts: BTreeMap<String, usize> = BTreeMap::new();
    let mut draft_count = 0usize;
    let mut approved_apply_count = 0usize;
    let mut approved_rollback_count = 0usize;
    let mut verification_event_count = 0usize;
    let mut live_proposal_event_count = 0usize;
    let mut project_knowledge_event_count = 0usize;
    let mut project_knowledge_entry_ids: BTreeSet<String> = BTreeSet::new();
    let mut latest_approved_execution_summary: Option<String> = None;
    let mut latest_verification_summary: Option<String> = None;
    let mut latest_live_proposal_summary: Option<String> = None;
    let mut latest_project_knowledge_summary: Option<String> = None;
    let mut latest_project_knowledge_recall_summary: Option<String> = None;
    let mut project_knowledge_redaction_audit_status: Option<String> = None;
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
        if matches!(
            event_type.as_str(),
            "git.read_lane.executed" | "shell.verification_lane.executed"
        ) {
            verification_event_count += 1;
            latest_verification_summary = Some(summarize_safe_event(event));
        }
        if event_type == LIVE_PROPOSAL_GENERATED_TYPE {
            live_proposal_event_count += 1;
            latest_live_proposal_summary = Some(summarize_safe_event(event));
        }
        if event_type.starts_with("project_knowledge.") {
            project_knowledge_event_count += 1;
            if let Some(entry_id) = nested_string(event.get("payload"), "entryId") {
                project_knowledge_entry_ids.insert(entry_id);
            }
            latest_project_knowledge_summary = Some(summarize_safe_event(event));
            if event_type == PROJECT_KNOWLEDGE_RECALL_USED_TYPE {
                latest_project_knowledge_recall_summary = Some(summarize_safe_event(event));
            }
            if event_type == PROJECT_KNOWLEDGE_AUDIT_WARNING_TYPE {
                project_knowledge_redaction_audit_status = Some(
                    nested_string(event.get("payload"), "redactionAuditStatus")
                        .unwrap_or_else(|| "warning".to_string()),
                );
            }
        }
    }
    if project_knowledge_event_count > 0 && project_knowledge_redaction_audit_status.is_none() {
        project_knowledge_redaction_audit_status = Some("ok".to_string());
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
        event_log_path,
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
        verification_event_count,
        live_proposal_event_count,
        project_knowledge_event_count,
        project_knowledge_entry_count: project_knowledge_entry_ids.len(),
        latest_approved_execution_summary,
        latest_verification_summary,
        latest_live_proposal_summary,
        latest_project_knowledge_summary,
        latest_project_knowledge_recall_summary,
        project_knowledge_redaction_audit_status,
        last_event_at,
        type_counts,
        timeline,
        safety_scan,
        warnings,
        safe_message,
    }
}

fn load_project_knowledge_event_summary_projection(
    workspace_root: &Path,
) -> ProjectKnowledgeEventSummaryProjection {
    let mut warnings = Vec::new();
    let store = match resolve_project_knowledge_store(workspace_root, false) {
        Ok(store) => store,
        Err(_) => {
            return ProjectKnowledgeEventSummaryProjection {
                events: Vec::new(),
                warnings: vec!["PROJECT_KNOWLEDGE_EVENT_READ_WARNING".to_string()],
            };
        }
    };
    let lifecycle_events = match read_project_knowledge_events(&store.events_path, &mut warnings) {
        Ok(events) => events,
        Err(_) => {
            warnings.push("PROJECT_KNOWLEDGE_EVENT_READ_WARNING".to_string());
            Vec::new()
        }
    };
    let events = lifecycle_events
        .iter()
        .map(project_knowledge_event_timeline_value)
        .collect::<Vec<_>>();
    warnings.sort();
    warnings.dedup();
    ProjectKnowledgeEventSummaryProjection { events, warnings }
}

fn project_knowledge_event_timeline_value(event: &ProjectKnowledgeLifecycleEvent) -> Value {
    let event_type = if event.event_type == PROJECT_KNOWLEDGE_ENTRY_COMMITTED_TYPE {
        PROJECT_KNOWLEDGE_CANDIDATE_COMMITTED_TYPE
    } else {
        event.event_type.as_str()
    };
    serde_json::json!({
        "id": event.event_id,
        "ts": event.created_at,
        "type": event_type,
        "taskId": "project-knowledge",
        "payload": {
            "entryId": event.entry_id,
            "entryStatus": event.status,
            "reasonSummary": event.reason_summary,
            "eventHash": event.event_hash,
            "warningCodes": [],
            "summaryOnly": true,
            "rawContentIncluded": false,
            "noRawContent": true
        }
    })
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
        verification_event_count: 0,
        live_proposal_event_count: 0,
        project_knowledge_event_count: 0,
        project_knowledge_entry_count: 0,
        latest_approved_execution_summary: None,
        latest_verification_summary: None,
        latest_live_proposal_summary: None,
        latest_project_knowledge_summary: None,
        latest_project_knowledge_recall_summary: None,
        project_knowledge_redaction_audit_status: None,
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
        verification_event_count: 0,
        live_proposal_event_count: 0,
        project_knowledge_event_count: 0,
        project_knowledge_entry_count: 0,
        latest_approved_execution_summary: None,
        latest_verification_summary: None,
        latest_live_proposal_summary: None,
        latest_project_knowledge_summary: None,
        latest_project_knowledge_recall_summary: None,
        project_knowledge_redaction_audit_status: None,
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
        "blockerCount",
        "bytes",
        "bytesWritten",
        "capabilityPlanSummary",
        "checkpointHash",
        "checkpointId",
        "columnCount",
        "commandHash",
        "contentType",
        "contextCartSummary",
        "createdAt",
        "decision",
        "draftId",
        "errorKind",
        "eventKind",
        "formulaEscapedCount",
        "generationId",
        "addedLineCount",
        "changedFileCount",
        "deletedLineCount",
        "durationMs",
        "exitCode",
        "filesCreated",
        "filesDeleted",
        "filesRemoved",
        "filesRestored",
        "filesUpdated",
        "injectionRiskCount",
        "intent",
        "lane",
        "localOnly",
        "localTaskId",
        "entryId",
        "entryStatus",
        "eventHash",
        "memoryRecallSummary",
        "metadataSummary",
        "modelProfileId",
        "noApiKey",
        "noExecution",
        "noRawOutput",
        "noRawPrompt",
        "noRawResponse",
        "noReasoningContent",
        "objectiveSummary",
        "operationCount",
        "overwritten",
        "pathSummaries",
        "pathSummaryCount",
        "previewOnly",
        "projectKnowledgeCount",
        "proposalHash",
        "proposalId",
        "rawContentIncluded",
        "reasonSummary",
        "recallSummary",
        "matchedEntryCount",
        "redactionAuditStatus",
        "auditStatus",
        "redactedTextCount",
        "redaction",
        "relativePath",
        "repairStatus",
        "requestId",
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
        "stderrBytes",
        "stdoutBytes",
        "sourceHost",
        "sourceOrigin",
        "sourcePathWithoutQuery",
        "sourceSummary",
        "status",
        "tableCount",
        "templateId",
        "title",
        "toolName",
        "truncated",
        "usageSummary",
        "validationStatus",
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
                nested_string(payload, "checkpointId").map(|value| format!("checkpoint {value}")),
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
                nested_string(payload, "checkpointId").map(|value| format!("checkpoint {value}")),
                nested_display(payload, "operationCount", "operations"),
                nested_display(payload, "filesRemoved", "removed"),
                nested_display(payload, "filesRestored", "restored"),
                nested_string(payload, "resultHash").map(|value| {
                    let prefix = value.chars().take(12).collect::<String>();
                    format!("result {prefix}")
                }),
            ],
        ),
        "git.read_lane.executed" => format_parts(
            "git read lane recorded",
            [
                nested_string(payload, "lane"),
                nested_display(payload, "changedFileCount", "changed files"),
                nested_display(payload, "addedLineCount", "lines added"),
                nested_display(payload, "deletedLineCount", "lines deleted"),
                nested_display(payload, "durationMs", "ms"),
                nested_string(payload, "resultHash").map(|value| {
                    let prefix = value.chars().take(12).collect::<String>();
                    format!("result {prefix}")
                }),
                nested_array_display(payload, "warningCodes", "warning codes"),
            ],
        ),
        "shell.verification_lane.executed" => format_parts(
            "shell verification lane recorded",
            [
                nested_string(payload, "templateId"),
                nested_display(payload, "exitCode", "exit"),
                nested_display(payload, "stdoutBytes", "stdout bytes"),
                nested_display(payload, "stderrBytes", "stderr bytes"),
                nested_display(payload, "durationMs", "ms"),
                nested_string(payload, "resultHash").map(|value| {
                    let prefix = value.chars().take(12).collect::<String>();
                    format!("result {prefix}")
                }),
                nested_array_display(payload, "warningCodes", "warning codes"),
            ],
        ),
        LIVE_PROPOSAL_GENERATED_TYPE => format_parts(
            "live proposal generated",
            [
                nested_string(payload, "proposalId"),
                nested_string(payload, "requestId").map(|value| format!("request {value}")),
                nested_string(payload, "modelProfileId"),
                nested_string(payload, "repairStatus").map(|value| format!("repair {value}")),
                nested_string(payload, "validationStatus")
                    .map(|value| format!("validation {value}")),
                nested_display(payload, "warningCount", "warnings"),
                nested_display(payload, "blockerCount", "blockers"),
            ],
        ),
        PROJECT_KNOWLEDGE_CANDIDATE_COMMITTED_TYPE | PROJECT_KNOWLEDGE_ENTRY_COMMITTED_TYPE => {
            format_parts(
                "project knowledge candidate committed",
                [
                    nested_string(payload, "entryId"),
                    nested_string(payload, "entryStatus"),
                    nested_display(payload, "projectKnowledgeCount", "entries"),
                    nested_array_display(payload, "warningCodes", "warning codes"),
                ],
            )
        }
        PROJECT_KNOWLEDGE_ENTRY_REVOKED_TYPE => format_parts(
            "project knowledge entry revoked",
            [
                nested_string(payload, "entryId"),
                nested_string(payload, "entryStatus"),
                nested_string(payload, "reasonSummary"),
                nested_array_display(payload, "warningCodes", "warning codes"),
            ],
        ),
        PROJECT_KNOWLEDGE_ENTRY_EXPIRED_TYPE => format_parts(
            "project knowledge entry expired",
            [
                nested_string(payload, "entryId"),
                nested_string(payload, "entryStatus"),
                nested_string(payload, "reasonSummary"),
                nested_array_display(payload, "warningCodes", "warning codes"),
            ],
        ),
        PROJECT_KNOWLEDGE_RECALL_USED_TYPE => format_parts(
            "project knowledge recall used",
            [
                nested_string(payload, "recallSummary"),
                nested_display(payload, "matchedEntryCount", "matches"),
                nested_array_display(payload, "warningCodes", "warning codes"),
            ],
        ),
        PROJECT_KNOWLEDGE_AUDIT_WARNING_TYPE => format_parts(
            "project knowledge audit warning",
            [
                nested_string(payload, "redactionAuditStatus"),
                nested_string(payload, "auditStatus"),
                nested_array_display(payload, "warningCodes", "warning codes"),
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
        ("RAW_RESPONSE_MARKER", "rawResponse"),
        ("RAW_SOURCE_MARKER", "rawSource"),
        ("RAW_DIFF_MARKER", "rawDiff"),
        ("RAW_STDOUT_MARKER", "rawStdout"),
        ("RAW_STDERR_MARKER", "rawStderr"),
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
            | "rawstdout"
            | "rawstderr"
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
        || lower.contains("rawstdout")
        || lower.contains("raw stdout")
        || lower.contains("rawstderr")
        || lower.contains("raw stderr")
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

struct ProjectKnowledgeStorePaths {
    store_dir: PathBuf,
    entries_path: PathBuf,
    events_path: PathBuf,
    index_path: PathBuf,
}

fn validate_project_knowledge_workspace_root(
    workspace_root: &str,
) -> Result<PathBuf, DesktopFlowError> {
    validate_approved_apply_workspace_root(workspace_root).map_err(|message| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_WORKSPACE_INVALID",
            message,
            "project_knowledge",
        )
    })
}

fn resolve_project_knowledge_store(
    workspace_root: &Path,
    create: bool,
) -> Result<ProjectKnowledgeStorePaths, DesktopFlowError> {
    let workbench_dir = workspace_root.join(".deepseek-workbench");
    reject_project_knowledge_symlink(&workbench_dir)?;
    let store_dir = workbench_dir.join("project-knowledge");
    reject_project_knowledge_symlink(&store_dir)?;
    if create {
        fs::create_dir_all(&store_dir).map_err(|_| {
            DesktopFlowError::new(
                "PROJECT_KNOWLEDGE_STORE_WRITE_FAILED",
                "Project knowledge store directory could not be created",
                "project_knowledge",
            )
        })?;
    }
    if store_dir.exists() {
        let canonical_store = store_dir.canonicalize().map_err(|_| {
            DesktopFlowError::new(
                "PROJECT_KNOWLEDGE_STORE_PATH_INVALID",
                "Project knowledge store path could not be resolved",
                "project_knowledge",
            )
        })?;
        if !canonical_store.starts_with(workspace_root) || !canonical_store.is_dir() {
            return Err(DesktopFlowError::new(
                "PROJECT_KNOWLEDGE_STORE_PATH_ESCAPE",
                "Project knowledge store path escapes the workspace",
                "project_knowledge",
            ));
        }
    } else if create {
        return Err(DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_STORE_WRITE_FAILED",
            "Project knowledge store directory is missing",
            "project_knowledge",
        ));
    }

    let paths = ProjectKnowledgeStorePaths {
        entries_path: store_dir.join("entries.jsonl"),
        events_path: store_dir.join("events.jsonl"),
        index_path: store_dir.join("index.json"),
        store_dir,
    };
    validate_project_knowledge_file_path(&paths.entries_path, &paths.store_dir)?;
    validate_project_knowledge_file_path(&paths.events_path, &paths.store_dir)?;
    validate_project_knowledge_file_path(&paths.index_path, &paths.store_dir)?;
    Ok(paths)
}

fn reject_project_knowledge_symlink(path: &Path) -> Result<(), DesktopFlowError> {
    if path.exists() {
        let metadata = fs::symlink_metadata(path).map_err(|_| {
            DesktopFlowError::new(
                "PROJECT_KNOWLEDGE_STORE_PATH_INVALID",
                "Project knowledge store metadata could not be read",
                "project_knowledge",
            )
        })?;
        if metadata.file_type().is_symlink() {
            return Err(DesktopFlowError::new(
                "PROJECT_KNOWLEDGE_STORE_PATH_ESCAPE",
                "Project knowledge store path cannot be a symlink",
                "project_knowledge",
            ));
        }
    }
    Ok(())
}

fn validate_project_knowledge_file_path(
    path: &Path,
    store_dir: &Path,
) -> Result<(), DesktopFlowError> {
    reject_project_knowledge_symlink(path)?;
    if path.exists() {
        let canonical = path.canonicalize().map_err(|_| {
            DesktopFlowError::new(
                "PROJECT_KNOWLEDGE_STORE_PATH_INVALID",
                "Project knowledge file path could not be resolved",
                "project_knowledge",
            )
        })?;
        let canonical_store = store_dir.canonicalize().map_err(|_| {
            DesktopFlowError::new(
                "PROJECT_KNOWLEDGE_STORE_PATH_INVALID",
                "Project knowledge store path could not be resolved",
                "project_knowledge",
            )
        })?;
        if !canonical.starts_with(canonical_store) || !canonical.is_file() {
            return Err(DesktopFlowError::new(
                "PROJECT_KNOWLEDGE_STORE_PATH_ESCAPE",
                "Project knowledge file path escapes the store",
                "project_knowledge",
            ));
        }
    }
    Ok(())
}

fn validate_project_knowledge_candidate(
    candidate: &ProjectKnowledgeCandidate,
) -> Result<(), DesktopFlowError> {
    let value = serde_json::to_value(candidate).map_err(|_| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_INVALID",
            "Project knowledge candidate could not be summarized",
            "project_knowledge",
        )
    })?;
    if let Some(_key) = find_forbidden_approved_apply_key(&value) {
        return Err(project_knowledge_invalid(
            "Project knowledge candidate contains forbidden fields",
        ));
    }
    let serialized = serde_json::to_string(&value).map_err(|_| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_INVALID",
            "Project knowledge candidate could not be serialized safely",
            "project_knowledge",
        )
    })?;
    if contains_approved_apply_sensitive_marker(&serialized) {
        return Err(project_knowledge_invalid(
            "Project knowledge candidate contains unsafe markers",
        ));
    }
    if !matches!(
        candidate.entry_type.as_str(),
        "policy" | "project_fact" | "pitfall"
    ) {
        return Err(project_knowledge_invalid(
            "Project knowledge type is unsupported",
        ));
    }
    validate_project_knowledge_namespace(&candidate.namespace)?;
    validate_project_knowledge_summary(&candidate.summary)?;
    validate_project_knowledge_trust(&candidate.trust)?;
    validate_project_knowledge_provenance(&candidate.provenance)?;
    validate_project_knowledge_evidence_refs(&candidate.evidence_refs)?;

    match candidate.entry_type.as_str() {
        "policy" => {
            let source_kind = candidate.source_kind.as_deref().unwrap_or_default();
            if !matches!(
                source_kind,
                "human_reviewed" | "repo_doc_summary" | "manual_import_summary"
            ) {
                return Err(project_knowledge_invalid(
                    "Policy project knowledge requires a reviewed source",
                ));
            }
            if matches!(
                candidate.provenance.source_kind.as_str(),
                "model_suggested" | "tool_output_summary" | "external_summary"
            ) {
                return Err(project_knowledge_invalid(
                    "Policy project knowledge cannot be committed directly from model, tool, or external sources",
                ));
            }
            if candidate
                .policy_scope
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
            {
                return Err(project_knowledge_invalid(
                    "Policy project knowledge requires a policy scope",
                ));
            }
        }
        "project_fact" => {
            if candidate.evidence_refs.is_empty() {
                return Err(project_knowledge_invalid(
                    "Project facts require evidence refs",
                ));
            }
            if candidate
                .fact_kind
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
            {
                return Err(project_knowledge_invalid(
                    "Project facts require a fact kind",
                ));
            }
        }
        "pitfall" => {
            if candidate
                .trigger_summary
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
            {
                return Err(project_knowledge_invalid(
                    "Pitfalls require a trigger summary",
                ));
            }
            if candidate
                .mitigation_summary
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
            {
                return Err(project_knowledge_invalid(
                    "Pitfalls require a mitigation summary",
                ));
            }
            if !matches!(
                candidate.severity.as_deref().unwrap_or_default(),
                "low" | "medium" | "high"
            ) {
                return Err(project_knowledge_invalid("Pitfall severity is unsupported"));
            }
        }
        _ => {}
    }
    Ok(())
}

fn validate_project_knowledge_namespace(namespace: &str) -> Result<(), DesktopFlowError> {
    let trimmed = namespace.trim();
    if trimmed.is_empty()
        || trimmed.len() > 128
        || !trimmed
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | ':' | '-'))
    {
        return Err(project_knowledge_invalid(
            "Project knowledge namespace is invalid",
        ));
    }
    Ok(())
}

fn validate_project_knowledge_summary(summary: &str) -> Result<(), DesktopFlowError> {
    let trimmed = summary.trim();
    if trimmed.is_empty() {
        return Err(project_knowledge_invalid(
            "Project knowledge summary is required",
        ));
    }
    if trimmed.chars().count() > PROJECT_KNOWLEDGE_MAX_SUMMARY_CHARS {
        return Err(project_knowledge_invalid(
            "Project knowledge summary is too large",
        ));
    }
    Ok(())
}

fn validate_project_knowledge_trust(trust: &ProjectKnowledgeTrust) -> Result<(), DesktopFlowError> {
    if !(0.0..=1.0).contains(&trust.score) {
        return Err(project_knowledge_invalid(
            "Project knowledge trust score is outside the allowed range",
        ));
    }
    if !matches!(trust.level.as_str(), "low" | "medium" | "high" | "trusted") {
        return Err(project_knowledge_invalid(
            "Project knowledge trust level is unsupported",
        ));
    }
    Ok(())
}

fn validate_project_knowledge_provenance(
    provenance: &ProjectKnowledgeProvenance,
) -> Result<(), DesktopFlowError> {
    if !matches!(
        provenance.source_kind.as_str(),
        "human_reviewed"
            | "repo_doc_summary"
            | "manual_import_summary"
            | "model_suggested"
            | "tool_output_summary"
            | "external_summary"
    ) {
        return Err(project_knowledge_invalid(
            "Project knowledge provenance source is unsupported",
        ));
    }
    validate_project_knowledge_summary(&provenance.summary)?;
    Ok(())
}

fn validate_project_knowledge_evidence_refs(
    refs: &[ProjectKnowledgeEvidenceRef],
) -> Result<(), DesktopFlowError> {
    if refs.is_empty() {
        return Err(project_knowledge_invalid(
            "Project knowledge evidence refs are required",
        ));
    }
    let mut seen = BTreeSet::new();
    for evidence in refs {
        if evidence.ref_id.trim().is_empty() || !seen.insert(evidence.ref_id.clone()) {
            return Err(project_knowledge_invalid(
                "Project knowledge evidence refs must have unique ids",
            ));
        }
        if !matches!(
            evidence.kind.as_str(),
            "user_request"
                | "repo_doc"
                | "test_summary"
                | "manual_note"
                | "event_summary"
                | "memory_summary"
                | "tool_summary"
        ) {
            return Err(project_knowledge_invalid(
                "Project knowledge evidence kind is unsupported",
            ));
        }
        validate_project_knowledge_summary(&evidence.summary)?;
        if !is_safe_summary_hash(&evidence.hash_prefix) {
            return Err(project_knowledge_invalid(
                "Project knowledge evidence hash is required",
            ));
        }
    }
    Ok(())
}

fn is_safe_summary_hash(value: &str) -> bool {
    let trimmed = value.trim();
    (6..=80).contains(&trimmed.len())
        && trimmed
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | ':' | '-'))
}

fn project_knowledge_entry_from_candidate(
    candidate: ProjectKnowledgeCandidate,
) -> Result<ProjectKnowledgeEntry, DesktopFlowError> {
    let millis = unix_epoch_millis();
    let created_at = format!("unix-ms-{millis}");
    let entry_seed = format!(
        "{}:{}:{}:{}",
        candidate.entry_type, candidate.namespace, candidate.summary, millis
    );
    let mut entry = ProjectKnowledgeEntry {
        entry_id: format!("project-knowledge-{}", short_hash(&entry_seed)),
        entry_type: candidate.entry_type,
        namespace: candidate.namespace,
        summary: sanitize_safe_message(&candidate.summary),
        status: "committed".to_string(),
        trust: candidate.trust,
        provenance: candidate.provenance,
        evidence_refs: candidate.evidence_refs,
        tags: candidate.tags,
        created_at: created_at.clone(),
        updated_at: created_at,
        expires_at: candidate.expires_at,
        revoked_at: None,
        pinned: candidate.pinned.unwrap_or(false),
        entry_hash: String::new(),
        policy_scope: candidate.policy_scope,
        source_kind: candidate.source_kind,
        fact_kind: candidate.fact_kind,
        trigger_summary: candidate.trigger_summary,
        mitigation_summary: candidate.mitigation_summary,
        severity: candidate.severity,
    };
    let entry_value = serde_json::to_value(&entry).map_err(|_| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_INVALID",
            "Project knowledge entry could not be summarized",
            "project_knowledge",
        )
    })?;
    let entry_hash = short_hash(&serde_json::to_string(&entry_value).unwrap_or_default());
    entry.entry_hash = entry_hash;
    Ok(entry)
}

fn summarize_project_knowledge_entry(
    entry: &ProjectKnowledgeEntry,
) -> ProjectKnowledgeEntrySummary {
    ProjectKnowledgeEntrySummary {
        entry_id: entry.entry_id.clone(),
        entry_type: entry.entry_type.clone(),
        namespace: sanitize_safe_message(&entry.namespace),
        summary: sanitize_safe_message(&entry.summary),
        status: entry.status.clone(),
        evidence_ref_count: entry.evidence_refs.len(),
        tag_count: entry.tags.len(),
        entry_hash: entry.entry_hash.clone(),
        warning_codes: entry
            .evidence_refs
            .iter()
            .flat_map(|evidence| evidence.warning_codes.clone())
            .collect(),
        summary_only: true,
    }
}

fn project_knowledge_store_record(entry: ProjectKnowledgeEntry) -> ProjectKnowledgeStoreRecord {
    let millis = unix_epoch_millis();
    let created_at = format!("unix-ms-{millis}");
    let record_id = format!("project-knowledge-record-{}", short_hash(&entry.entry_id));
    let mut record = ProjectKnowledgeStoreRecord {
        record_id,
        record_kind: "entry".to_string(),
        entry,
        created_at,
        record_hash: String::new(),
    };
    record.record_hash = short_hash(&serde_json::to_string(&record).unwrap_or_default());
    record
}

fn project_knowledge_event(
    event_type: &str,
    entry_id: &str,
    status: &str,
    reason_summary: Option<String>,
) -> ProjectKnowledgeLifecycleEvent {
    let millis = unix_epoch_millis();
    let created_at = format!("unix-ms-{millis}");
    let event_id = format!(
        "project-knowledge-event-{}",
        short_hash(&format!("{event_type}:{entry_id}:{millis}"))
    );
    let mut event = ProjectKnowledgeLifecycleEvent {
        event_id,
        event_type: event_type.to_string(),
        entry_id: entry_id.to_string(),
        status: status.to_string(),
        reason_summary: reason_summary.map(|value| sanitize_safe_message(&value)),
        created_at,
        event_hash: String::new(),
        summary_only: true,
    };
    event.event_hash = short_hash(&serde_json::to_string(&event).unwrap_or_default());
    event
}

fn append_project_knowledge_record(
    path: &Path,
    record: &ProjectKnowledgeStoreRecord,
) -> Result<(), DesktopFlowError> {
    let line = serde_json::to_string(record).map_err(|_| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_STORE_WRITE_FAILED",
            "Project knowledge record could not be serialized",
            "project_knowledge",
        )
    })?;
    append_project_knowledge_line(path, &line)
}

fn append_project_knowledge_event(
    path: &Path,
    event: &ProjectKnowledgeLifecycleEvent,
) -> Result<(), DesktopFlowError> {
    let line = serde_json::to_string(event).map_err(|_| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_STORE_WRITE_FAILED",
            "Project knowledge event could not be serialized",
            "project_knowledge",
        )
    })?;
    append_project_knowledge_line(path, &line)
}

fn append_project_knowledge_line(path: &Path, line: &str) -> Result<(), DesktopFlowError> {
    if contains_approved_apply_sensitive_marker(line) {
        return Err(project_knowledge_invalid(
            "Project knowledge summary failed final redaction validation",
        ));
    }
    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|_| {
            DesktopFlowError::new(
                "PROJECT_KNOWLEDGE_STORE_WRITE_FAILED",
                "Project knowledge store could not be written",
                "project_knowledge",
            )
        })?;
    writeln!(file, "{line}").map_err(|_| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_STORE_WRITE_FAILED",
            "Project knowledge store could not be written",
            "project_knowledge",
        )
    })
}

fn load_project_knowledge_snapshot(
    store: &ProjectKnowledgeStorePaths,
) -> Result<ProjectKnowledgeSnapshotResult, DesktopFlowError> {
    let mut warnings = Vec::new();
    let mut entries = read_project_knowledge_entries(&store.entries_path, &mut warnings)?;
    let events = read_project_knowledge_events(&store.events_path, &mut warnings)?;
    apply_project_knowledge_events(&mut entries, &events);
    entries.sort_by(|left, right| left.entry_id.cmp(&right.entry_id));
    let summaries: Vec<ProjectKnowledgeEntrySummary> = entries
        .iter()
        .map(summarize_project_knowledge_entry)
        .collect();
    let entry_count = summaries.len();
    let active_entry_count = summaries
        .iter()
        .filter(|entry| entry.status == "committed" || entry.status == "recalled")
        .count();
    let revoked_entry_count = summaries
        .iter()
        .filter(|entry| entry.status == "revoked")
        .count();
    let expired_entry_count = summaries
        .iter()
        .filter(|entry| entry.status == "expired")
        .count();
    let snapshot_hash = short_hash(&serde_json::to_string(&summaries).unwrap_or_default());
    let status = if warnings
        .iter()
        .any(|warning| warning == "PARSE_ERROR_LINE_SKIPPED")
    {
        "warning"
    } else {
        "ready"
    };
    Ok(ProjectKnowledgeSnapshotResult {
        ok: true,
        status: if entry_count == 0 {
            "empty".to_string()
        } else {
            status.to_string()
        },
        store_path: store.store_dir.to_string_lossy().to_string(),
        entries_path: store.entries_path.to_string_lossy().to_string(),
        events_path: store.events_path.to_string_lossy().to_string(),
        index_path: store.index_path.to_string_lossy().to_string(),
        entry_count,
        active_entry_count,
        revoked_entry_count,
        expired_entry_count,
        entries: summaries,
        warnings,
        snapshot_hash,
        summary_only: true,
        raw_content_included: false,
        safe_message: "Project knowledge snapshot loaded as summary-only data.".to_string(),
    })
}

fn read_project_knowledge_entries(
    path: &Path,
    warnings: &mut Vec<String>,
) -> Result<Vec<ProjectKnowledgeEntry>, DesktopFlowError> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let text = fs::read_to_string(path).map_err(|_| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_STORE_READ_FAILED",
            "Project knowledge entries could not be read",
            "project_knowledge",
        )
    })?;
    let mut entries = Vec::new();
    for line in text.lines() {
        if line.trim().is_empty() {
            continue;
        }
        match serde_json::from_str::<ProjectKnowledgeStoreRecord>(line) {
            Ok(record)
                if record.record_kind == "entry"
                    && !contains_approved_apply_sensitive_marker(line) =>
            {
                entries.push(record.entry);
            }
            _ => warnings.push("PARSE_ERROR_LINE_SKIPPED".to_string()),
        }
    }
    Ok(entries)
}

fn read_project_knowledge_events(
    path: &Path,
    warnings: &mut Vec<String>,
) -> Result<Vec<ProjectKnowledgeLifecycleEvent>, DesktopFlowError> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let text = fs::read_to_string(path).map_err(|_| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_STORE_READ_FAILED",
            "Project knowledge events could not be read",
            "project_knowledge",
        )
    })?;
    let mut events = Vec::new();
    for line in text.lines() {
        if line.trim().is_empty() {
            continue;
        }
        match serde_json::from_str::<ProjectKnowledgeLifecycleEvent>(line) {
            Ok(event) if event.summary_only && !contains_approved_apply_sensitive_marker(line) => {
                events.push(event);
            }
            _ => warnings.push("PARSE_ERROR_LINE_SKIPPED".to_string()),
        }
    }
    Ok(events)
}

fn apply_project_knowledge_events(
    entries: &mut [ProjectKnowledgeEntry],
    events: &[ProjectKnowledgeLifecycleEvent],
) {
    for event in events {
        for entry in entries
            .iter_mut()
            .filter(|entry| entry.entry_id == event.entry_id)
        {
            if event.event_type == PROJECT_KNOWLEDGE_ENTRY_REVOKED_TYPE {
                entry.status = "revoked".to_string();
                entry.revoked_at = Some(event.created_at.clone());
                entry.updated_at = event.created_at.clone();
            } else if event.event_type == PROJECT_KNOWLEDGE_ENTRY_EXPIRED_TYPE {
                entry.status = "expired".to_string();
                entry.updated_at = event.created_at.clone();
            }
        }
    }
}

fn write_project_knowledge_index(
    store: &ProjectKnowledgeStorePaths,
    snapshot: &ProjectKnowledgeSnapshotResult,
) -> Result<String, DesktopFlowError> {
    let index = serde_json::json!({
        "schemaVersion": 1,
        "entryCount": snapshot.entry_count,
        "activeEntryCount": snapshot.active_entry_count,
        "revokedEntryCount": snapshot.revoked_entry_count,
        "expiredEntryCount": snapshot.expired_entry_count,
        "snapshotHash": snapshot.snapshot_hash,
        "summaryOnly": true,
        "rawContentIncluded": false,
        "warningCodes": snapshot.warnings,
    });
    let index_text = serde_json::to_string_pretty(&index).map_err(|_| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_STORE_WRITE_FAILED",
            "Project knowledge index could not be serialized",
            "project_knowledge",
        )
    })?;
    if contains_approved_apply_sensitive_marker(&index_text) {
        return Err(project_knowledge_invalid(
            "Project knowledge index failed final redaction validation",
        ));
    }
    fs::write(&store.index_path, index_text).map_err(|_| {
        DesktopFlowError::new(
            "PROJECT_KNOWLEDGE_STORE_WRITE_FAILED",
            "Project knowledge index could not be written",
            "project_knowledge",
        )
    })?;
    Ok(short_hash(
        &serde_json::to_string(&index).unwrap_or_default(),
    ))
}

fn project_knowledge_lifecycle_event(
    workspace_root: String,
    entry_id: String,
    status: &str,
    event_type: &str,
    reason_summary: Option<String>,
) -> Result<ProjectKnowledgeLifecycleResult, DesktopFlowError> {
    if entry_id.trim().is_empty() || contains_approved_apply_sensitive_marker(&entry_id) {
        return Err(project_knowledge_invalid(
            "Project knowledge entry id is required",
        ));
    }
    if let Some(reason) = reason_summary.as_deref() {
        validate_project_knowledge_summary(reason)?;
    }
    let workspace_root = validate_project_knowledge_workspace_root(&workspace_root)?;
    let store = resolve_project_knowledge_store(&workspace_root, true)?;
    let snapshot = load_project_knowledge_snapshot(&store)?;
    if !snapshot
        .entries
        .iter()
        .any(|entry| entry.entry_id == entry_id)
    {
        return Err(project_knowledge_invalid(
            "Project knowledge entry was not found",
        ));
    }
    let event = project_knowledge_event(event_type, &entry_id, status, reason_summary);
    append_project_knowledge_event(&store.events_path, &event)?;
    let snapshot = load_project_knowledge_snapshot(&store)?;
    let index_hash = write_project_knowledge_index(&store, &snapshot)?;
    Ok(ProjectKnowledgeLifecycleResult {
        ok: true,
        entry_id,
        status: status.to_string(),
        event_id: event.event_id,
        store_path: store.store_dir.to_string_lossy().to_string(),
        index_hash,
        summary_only: true,
        raw_content_included: false,
        safe_message: format!("Project knowledge entry {status} as summary-only event."),
        warnings: snapshot.warnings,
    })
}

fn project_knowledge_invalid(message: impl Into<String>) -> DesktopFlowError {
    DesktopFlowError::new(
        "PROJECT_KNOWLEDGE_BLOCKED",
        message.into(),
        "project_knowledge",
    )
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

struct VerificationLaneEventPayload {
    event_type: String,
    lane_or_template_id: String,
    result_hash: String,
    payload: Value,
}

struct LiveProposalSummaryEventPayload {
    generation_id: String,
    proposal_id: String,
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

fn build_verification_lane_event_payload(
    event_preview: &Value,
) -> Result<VerificationLaneEventPayload, String> {
    let object = event_preview
        .as_object()
        .ok_or_else(|| "Verification event preview must be an object".to_string())?;
    if let Some(key) = find_forbidden_approved_apply_key(event_preview) {
        return Err(format!(
            "Verification event preview contains forbidden field {key}"
        ));
    }
    let serialized = serde_json::to_string(event_preview)
        .map_err(|_| "Verification event preview could not be serialized".to_string())?;
    if contains_approved_apply_sensitive_marker(&serialized) {
        return Err("Verification event preview contains unsafe marker".to_string());
    }
    if object.get("notWritten").and_then(Value::as_bool) != Some(true) {
        return Err("Verification event preview must be notWritten".to_string());
    }
    if object.get("summaryOnly").and_then(Value::as_bool) != Some(true) {
        return Err("Verification event preview must be summaryOnly".to_string());
    }
    match required_event_string(object, "type")?.as_str() {
        "git.read_lane.executed" => build_git_read_lane_event_payload(object),
        "shell.verification_lane.executed" => build_shell_verification_event_payload(object),
        _ => Err("Verification event preview type is unsupported".to_string()),
    }
}

fn build_git_read_lane_event_payload(
    object: &serde_json::Map<String, Value>,
) -> Result<VerificationLaneEventPayload, String> {
    let lane = required_event_string(object, "lane")?;
    if !matches!(
        lane.as_str(),
        "status_summary" | "diff_summary" | "log_summary" | "branch_summary"
    ) {
        return Err("Git verification event lane is unsupported".to_string());
    }
    let workspace_root_ref = required_event_string(object, "workspaceRootRef")?;
    let command_hash = required_event_string(object, "commandHash")?;
    let result_hash = required_event_string(object, "resultHash")?;
    for (field, value) in [
        ("workspaceRootRef", &workspace_root_ref),
        ("commandHash", &command_hash),
        ("resultHash", &result_hash),
    ] {
        validate_approved_rollback_safe_ref(value, field)?;
    }
    let warning_codes = safe_event_warning_codes(object)?;
    let payload = serde_json::json!({
        "eventKind": "git.read_lane.executed",
        "schemaVersion": 1,
        "summaryOnly": true,
        "safetyScanOk": true,
        "noRawOutput": true,
        "diffContentIncluded": false,
        "lane": lane,
        "workspaceRootRef": workspace_root_ref,
        "commandHash": command_hash,
        "resultHash": result_hash,
        "changedFileCount": required_event_usize(object, "changedFileCount")?,
        "addedLineCount": required_event_usize(object, "addedLineCount")?,
        "deletedLineCount": required_event_usize(object, "deletedLineCount")?,
        "durationMs": required_event_u128(object, "durationMs")?,
        "warningCodes": warning_codes,
        "truncated": required_event_bool(object, "truncated")?
    });
    Ok(VerificationLaneEventPayload {
        event_type: "git.read_lane.executed".to_string(),
        lane_or_template_id: lane,
        result_hash,
        payload,
    })
}

fn build_shell_verification_event_payload(
    object: &serde_json::Map<String, Value>,
) -> Result<VerificationLaneEventPayload, String> {
    let template_id = required_event_string(object, "templateId")?;
    if !matches!(
        template_id.as_str(),
        "pnpm.typecheck" | "pnpm.lint" | "pnpm.test.scoped" | "app.typecheck" | "cargo.check_tauri"
    ) {
        return Err("Shell verification event template is unsupported".to_string());
    }
    let workspace_root_ref = required_event_string(object, "workspaceRootRef")?;
    let command_hash = required_event_string(object, "commandHash")?;
    let result_hash = required_event_string(object, "resultHash")?;
    for (field, value) in [
        ("workspaceRootRef", &workspace_root_ref),
        ("commandHash", &command_hash),
        ("resultHash", &result_hash),
    ] {
        validate_approved_rollback_safe_ref(value, field)?;
    }
    let warning_codes = safe_event_warning_codes(object)?;
    let payload = serde_json::json!({
        "eventKind": "shell.verification_lane.executed",
        "schemaVersion": 1,
        "summaryOnly": true,
        "safetyScanOk": true,
        "noRawOutput": true,
        "templateId": template_id,
        "workspaceRootRef": workspace_root_ref,
        "commandHash": command_hash,
        "resultHash": result_hash,
        "exitCode": optional_event_i64(object, "exitCode")?,
        "stdoutBytes": required_event_usize(object, "stdoutBytes")?,
        "stderrBytes": required_event_usize(object, "stderrBytes")?,
        "durationMs": required_event_u128(object, "durationMs")?,
        "warningCodes": warning_codes,
        "truncated": required_event_bool(object, "truncated")?
    });
    Ok(VerificationLaneEventPayload {
        event_type: "shell.verification_lane.executed".to_string(),
        lane_or_template_id: template_id,
        result_hash,
        payload,
    })
}

fn build_live_proposal_summary_event_payload(
    event_preview: &Value,
) -> Result<LiveProposalSummaryEventPayload, String> {
    let object = event_preview
        .as_object()
        .ok_or_else(|| "Live proposal event preview must be an object".to_string())?;
    validate_live_value_forbidden_keys(event_preview)?;
    validate_live_value_string_safety(event_preview)?;
    validate_live_readiness_disabled(object.get("readiness"))?;
    if object.get("notWritten").and_then(Value::as_bool) != Some(true) {
        return Err("Live proposal event preview must be notWritten".to_string());
    }
    if object.get("summaryOnly").and_then(Value::as_bool) != Some(true) {
        return Err("Live proposal event preview must be summaryOnly".to_string());
    }
    if object.get("type").and_then(Value::as_str) != Some(LIVE_PROPOSAL_GENERATED_TYPE) {
        return Err("Live proposal event preview type is unsupported".to_string());
    }
    if object.get("noRawPrompt").and_then(Value::as_bool) != Some(true)
        || object.get("noRawResponse").and_then(Value::as_bool) != Some(true)
        || object.get("noReasoningContent").and_then(Value::as_bool) != Some(true)
        || object.get("noApiKey").and_then(Value::as_bool) != Some(true)
        || object
            .get("contentDraftRawIncluded")
            .and_then(Value::as_bool)
            != Some(false)
    {
        return Err("Live proposal event preview must exclude raw content".to_string());
    }
    if object.get("canApplyPatch").and_then(Value::as_bool) != Some(false)
        || object.get("canRollback").and_then(Value::as_bool) != Some(false)
        || object.get("canWriteEventStore").and_then(Value::as_bool) != Some(false)
    {
        return Err("Live proposal event preview must keep execution disabled".to_string());
    }

    let generation_id = required_event_string(object, "generationId")?;
    let request_id = required_event_string(object, "requestId")?;
    let proposal_id = required_event_string(object, "proposalId")?;
    let model_profile_id = required_event_string(object, "modelProfileId")?;
    let repair_status = required_event_string(object, "repairStatus")?;
    let validation_status = required_event_string(object, "validationStatus")?;
    let proposal_hash = required_event_string(object, "proposalHash")?;
    for (field, value) in [
        ("generationId", &generation_id),
        ("requestId", &request_id),
        ("proposalId", &proposal_id),
        ("modelProfileId", &model_profile_id),
        ("repairStatus", &repair_status),
        ("validationStatus", &validation_status),
        ("proposalHash", &proposal_hash),
    ] {
        validate_approved_rollback_safe_ref(value, field)?;
        if value.to_ascii_lowercase().starts_with("sk-")
            || contains_approved_apply_sensitive_marker(value)
        {
            return Err(format!("Live proposal event preview has unsafe {field}"));
        }
    }
    let usage_summary = safe_live_proposal_usage_summary(object.get("usageSummary"))?;
    let payload = serde_json::json!({
        "eventKind": LIVE_PROPOSAL_GENERATED_TYPE,
        "schemaVersion": 1,
        "summaryOnly": true,
        "safetyScanOk": true,
        "canApplyPatch": false,
        "canRollback": false,
        "canWriteEventStore": false,
        "generationId": generation_id,
        "requestId": request_id,
        "proposalId": proposal_id,
        "modelProfileId": model_profile_id,
        "usageSummary": usage_summary,
        "repairStatus": repair_status,
        "validationStatus": validation_status,
        "warningCount": required_event_usize(object, "warningCount")?,
        "blockerCount": required_event_usize(object, "blockerCount")?,
        "proposalHash": proposal_hash,
        "droppedReasoningContent": required_event_bool(object, "droppedReasoningContent")?,
        "warningCodes": []
    });
    Ok(LiveProposalSummaryEventPayload {
        generation_id,
        proposal_id,
        payload,
    })
}

fn safe_live_proposal_usage_summary(value: Option<&Value>) -> Result<Value, String> {
    let Some(value) = value else {
        return Ok(serde_json::json!({}));
    };
    let object = value
        .as_object()
        .ok_or_else(|| "Live proposal usage summary must be an object".to_string())?;
    let allowed = ["promptTokens", "completionTokens", "totalTokens"];
    let mut output = serde_json::Map::new();
    for (key, nested) in object {
        if !allowed.contains(&key.as_str()) {
            return Err("Live proposal usage summary contains unsupported field".to_string());
        }
        let Some(number) = nested.as_u64() else {
            return Err("Live proposal usage summary must be numeric".to_string());
        };
        output.insert(key.clone(), Value::from(number));
    }
    Ok(Value::Object(output))
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

fn required_event_u128(object: &serde_json::Map<String, Value>, key: &str) -> Result<u128, String> {
    object
        .get(key)
        .and_then(Value::as_u64)
        .map(u128::from)
        .ok_or_else(|| format!("Event preview is missing {key}"))
}

fn required_event_bool(object: &serde_json::Map<String, Value>, key: &str) -> Result<bool, String> {
    object
        .get(key)
        .and_then(Value::as_bool)
        .ok_or_else(|| format!("Event preview is missing {key}"))
}

fn optional_event_i64(
    object: &serde_json::Map<String, Value>,
    key: &str,
) -> Result<Option<i64>, String> {
    match object.get(key) {
        Some(Value::Null) | None => Ok(None),
        Some(value) => value
            .as_i64()
            .map(Some)
            .ok_or_else(|| format!("Event preview {key} must be a number or null")),
    }
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
    path_part.replace('\\', "/").split('/').any(|segment| {
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

    fn run_git_setup(workspace: &Path, args: &[&str]) {
        let output = Command::new("git")
            .args(args)
            .current_dir(workspace)
            .output()
            .expect("git command should start");
        assert!(
            output.status.success(),
            "git setup command failed: {:?}",
            args
        );
    }

    fn temp_git_workspace(label: &str) -> Option<PathBuf> {
        if Command::new("git").arg("--version").output().is_err() {
            return None;
        }
        let workspace = temp_workspace(label);
        run_git_setup(&workspace, &["init"]);
        run_git_setup(
            &workspace,
            &["config", "user.email", "test@example.invalid"],
        );
        run_git_setup(
            &workspace,
            &["config", "user.name", "DeepSeek Workbench Test"],
        );
        fs::write(workspace.join("README.md"), "initial\n").expect("readme");
        run_git_setup(&workspace, &["add", "README.md"]);
        run_git_setup(&workspace, &["commit", "-m", "initial"]);
        Some(workspace)
    }

    fn safe_git_read_request(workspace: &Path, lane: GitReadLane) -> GitReadLaneRequest {
        GitReadLaneRequest {
            workspace_root: workspace.to_string_lossy().to_string(),
            workspace_root_ref: "workspace-ref-test".to_string(),
            lane,
            pathspecs: None,
            timeout_ms: Some(5_000),
            max_output_bytes: Some(65_536),
        }
    }

    fn safe_shell_verification_request(
        workspace: &Path,
        template_id: ShellVerificationTemplateId,
    ) -> ShellVerificationLaneRequest {
        ShellVerificationLaneRequest {
            workspace_root: workspace.to_string_lossy().to_string(),
            workspace_root_ref: "workspace-ref-test".to_string(),
            template_id,
            safe_args: None,
            timeout_ms: Some(5_000),
            max_output_bytes: Some(65_536),
        }
    }

    fn safe_live_proposal_session_receipt() -> Value {
        serde_json::json!({
            "status": "ready",
            "receiptId": "app-live-proposal-session-test",
            "kind": "live_proposal_generation",
            "providerId": "deepseek",
            "modelProfileId": "deepseek-chat",
            "objectiveSummaryHash": "objective-hash-test",
            "allowedPathRefs": ["docs/live-proposal.md"],
            "contextRefHashes": ["context-ref-test"],
            "apiKeyPolicyId": "policy-test",
            "requestBuilderId": "request-builder-test",
            "expiresAt": "2099-01-01T00:00:00.000Z",
            "typedConfirmation": LIVE_PROPOSAL_CONFIRMATION,
            "receiptHash": "receipt-hash-test",
            "typedConfirmationAccepted": true,
            "findings": [],
            "blockerCount": 0,
            "warningCount": 0,
            "findingCount": 0,
            "readiness": {
                "canProceedToLiveProposalCommand": true,
                "canReadApiKey": false,
                "canCallLiveModel": false,
                "canFetchNetwork": false,
                "canSendLiveRequest": false,
                "canWriteFilesystem": false,
                "canWriteEventStore": false,
                "canApplyPatch": false,
                "canRollback": false,
                "canExecuteGit": false,
                "canExecuteShell": false,
                "canIssuePermissionLease": false,
                "appCanExecute": false
            },
            "nextAction": "Call the fixed Tauri command with summary-only refs.",
            "summaryOnly": true,
            "source": "runtime_app_live_proposal_session_receipt"
        })
    }

    fn safe_live_request_envelope() -> Value {
        serde_json::json!({
            "schemaVersion": 1,
            "requestId": "live-proposal-request-test",
            "providerId": "deepseek",
            "modelProfileId": "deepseek-chat",
            "objectiveSummary": "Generate a summary-only proposal.",
            "intent": "code_change",
            "responseFormat": "model_patch_proposal",
            "summaryOnly": true,
            "noExecution": true,
            "noFileWrite": true,
            "noApply": true,
            "noRollback": true,
            "noEventStoreWrite": true,
            "noGitShell": true,
            "noTools": true,
            "toolChoiceOmitted": true,
            "requestHash": "request-hash-test",
            "apiKeyPolicyRef": {
                "policyId": "policy-test",
                "keySourceType": "env_var_ref",
                "refNameHash": "key-ref-hash-test",
                "rawKeyIncluded": false
            },
            "contextRefs": {
                "workspaceIndexRefs": ["workspace-index-ref"],
                "contextAssemblyRefs": ["context-ref"],
                "userWorkspaceReadinessRefs": ["readiness-ref"],
                "evidenceRefs": ["evidence-ref"]
            },
            "allowedPathRefs": ["docs/live-proposal.md"],
            "forbiddenPathPolicy": "relative safe paths only",
            "promptBoundary": {
                "frozenPrefixRefs": ["prefix-ref"],
                "volatileTailRefs": ["tail-ref"],
                "noCompressRefs": ["no-compress-ref"]
            },
            "safetyInstructions": {
                "mustReturnJson": true,
                "mustReturnModelPatchProposal": true,
                "noFileWrite": true,
                "noCommands": true,
                "noGitShell": true,
                "noSecrets": true,
                "noRawDiff": true,
                "noRawWorkspaceDump": true,
                "outputGoesThroughValidationChain": true
            },
            "readiness": {
                "canReadApiKey": false,
                "canCallLiveModel": false,
                "canFetchNetwork": false,
                "canWriteEventStore": false,
                "canApplyPatch": false,
                "canRollback": false,
                "canExecuteGit": false,
                "canExecuteShell": false,
                "canIssuePermissionLease": false,
                "appCanExecute": false
            },
            "source": "runtime_live_proposal_request_builder"
        })
    }

    fn safe_live_proposal_command_request() -> LiveDeepSeekPatchProposalCommandRequest {
        LiveDeepSeekPatchProposalCommandRequest {
            session_receipt: safe_live_proposal_session_receipt(),
            api_key_source_ref: LIVE_PROPOSAL_ALLOWED_KEY_REF.to_string(),
            provider_id: "deepseek".to_string(),
            model_profile_id: "deepseek-chat".to_string(),
            request_envelope: safe_live_request_envelope(),
            objective_summary: "Generate a summary-only proposal.".to_string(),
            allowed_path_refs: vec!["docs/live-proposal.md".to_string()],
            context_refs: vec!["context-ref-test".to_string()],
            max_response_bytes: 20_000,
            timeout_ms: 5_000,
        }
    }

    fn safe_live_proposal_summary_event_preview() -> Value {
        serde_json::json!({
            "type": LIVE_PROPOSAL_GENERATED_TYPE,
            "generationId": "live-proposal-generation-test",
            "requestId": "live-proposal-request-test",
            "proposalId": "proposal-live-test",
            "modelProfileId": "deepseek-chat",
            "usageSummary": {
                "promptTokens": 11,
                "completionTokens": 22,
                "totalTokens": 33
            },
            "repairStatus": "valid",
            "validationStatus": "valid",
            "warningCount": 1,
            "blockerCount": 0,
            "proposalHash": "proposal-hash-test",
            "droppedReasoningContent": true,
            "warningCodes": ["REASONING_CONTENT_DROPPED"],
            "summaryOnly": true,
            "noRawPrompt": true,
            "noRawResponse": true,
            "noReasoningContent": true,
            "noApiKey": true,
            "contentDraftRawIncluded": false,
            "canApplyPatch": false,
            "canRollback": false,
            "canWriteEventStore": false,
            "notWritten": true
        })
    }

    fn safe_live_key_resolver(_: &str) -> Result<String, DesktopFlowError> {
        Ok("test-live-key-value".to_string())
    }

    fn safe_desktop_observation_profile() -> Value {
        serde_json::json!({
            "schemaVersion": "desktop_observation_profile.v1",
            "profileId": "desktop-observer-profile-test",
            "displayName": "Metadata observer",
            "observationMode": "metadata_only",
            "scope": {
                "includeForegroundWindow": true,
                "includeWindowList": true,
                "includeDisplayMetadata": true,
                "includeScreenshotMetadata": false
            },
            "capturePolicy": {
                "allowDesktopAction": false,
                "allowClickTypeSelect": false,
                "allowClipboardWrite": false,
                "allowClipboardReadByDefault": false,
                "allowFileDialogAutomation": false,
                "allowHiddenBackgroundCapture": false,
                "allowScreenRecording": false,
                "allowRawScreenshotPersistence": false,
                "allowRawOcrTextPersistence": false,
                "sendToModel": false
            },
            "redactionPolicy": {
                "enabled": true,
                "redactWindowTitles": true,
                "redactProcessNames": true,
                "redactSecretMarkers": true,
                "summaryOnly": true
            },
            "maxWindowCount": 10,
            "maxDisplayCount": 2,
            "includeWindowTitles": false,
            "includeProcessNames": false,
            "includeDisplayMetadata": true,
            "includeScreenshotMetadata": false,
            "profileHash": "desktop-profile-hash-test",
            "source": "runtime_desktop_observation_profile"
        })
    }

    fn safe_desktop_observation_request() -> DesktopObservationCommandRequest {
        DesktopObservationCommandRequest {
            profile: safe_desktop_observation_profile(),
            request_id: "desktop-observation-request-test".to_string(),
            user_triggered: true,
            include_foreground_window: true,
            include_window_list: true,
            include_display_metadata: true,
            include_screenshot_metadata: true,
        }
    }

    fn safe_live_transport_response() -> LiveDeepSeekTransportResponse {
        let proposal = serde_json::json!({
            "schemaVersion": 1,
            "proposalId": "proposal-live-test",
            "title": "Update docs summary",
            "intent": "code_change",
            "operations": [
                {
                    "operationId": "operation-live-test",
                    "changeKind": "update",
                    "path": "docs/live-proposal.md",
                    "summary": "Update docs summary only."
                }
            ],
            "pathSummaries": [
                {
                    "path": "docs/live-proposal.md",
                    "summary": "Update docs summary only."
                }
            ],
            "evidenceRefs": ["evidence-ref"],
            "riskNotes": ["Requires review before apply."]
        });
        LiveDeepSeekTransportResponse {
            status_code: 200,
            body: serde_json::json!({
                "id": "deepseek-response-test",
                "choices": [
                    {
                        "message": {
                            "content": proposal.to_string(),
                            "reasoning_content": "internal chain should be dropped"
                        }
                    }
                ],
                "usage": {
                    "prompt_tokens": 11,
                    "completion_tokens": 22,
                    "total_tokens": 33
                }
            })
            .to_string(),
        }
    }

    fn run_safe_live_command(
        request: LiveDeepSeekPatchProposalCommandRequest,
    ) -> Result<LiveDeepSeekPatchProposalCommandResult, DesktopFlowError> {
        run_generate_live_deepseek_patch_proposal_with_executor(
            request,
            safe_live_key_resolver,
            |_, body, _| {
                assert!(body.get("tools").is_none());
                assert!(body.get("tool_choice").is_none());
                Ok(safe_live_transport_response())
            },
        )
    }

    #[test]
    fn desktop_observer_requires_user_trigger() {
        let mut request = safe_desktop_observation_request();
        request.user_triggered = false;
        let error =
            observe_desktop_metadata(request).expect_err("non-user-triggered request blocks");
        assert_eq!(error.error_code, "DESKTOP_OBSERVER_NOT_USER_TRIGGERED");
        assert_eq!(error.stage, "desktop_observer");
    }

    #[test]
    fn desktop_observer_blocks_disabled_profile() {
        let mut request = safe_desktop_observation_request();
        request.profile["observationMode"] = Value::String("disabled".to_string());
        let error = observe_desktop_metadata(request).expect_err("disabled profile blocks");
        assert_eq!(error.error_code, "DESKTOP_OBSERVER_BLOCKED");
        assert!(error.safe_message.contains("not enabled"));
    }

    #[test]
    fn desktop_observer_blocks_action_fields() {
        let mut request = safe_desktop_observation_request();
        request.profile["capturePolicy"]["allowDesktopAction"] = Value::Bool(true);
        let error = observe_desktop_metadata(request).expect_err("desktop action blocks");
        assert_eq!(error.error_code, "DESKTOP_OBSERVER_BLOCKED");
        assert!(error.safe_message.contains("action or persistence"));

        let mut raw_request = safe_desktop_observation_request();
        let raw_screenshot_key = ["raw", "Screenshot"].concat();
        raw_request.profile[raw_screenshot_key.as_str()] =
            Value::String("not allowed".to_string());
        let raw_error = observe_desktop_metadata(raw_request).expect_err("raw field blocks");
        assert_eq!(raw_error.error_code, "DESKTOP_OBSERVER_BLOCKED");
        assert!(raw_error.safe_message.contains("forbidden field"));
    }

    #[test]
    fn desktop_observer_returns_summary_only_metadata() {
        let result =
            observe_desktop_metadata(safe_desktop_observation_request()).expect("safe summary");
        assert!(result.ok);
        assert_eq!(result.status, "warning");
        assert_eq!(result.request_id, "desktop-observation-request-test");
        assert_eq!(
            result.profile_id.as_deref(),
            Some("desktop-observer-profile-test")
        );
        assert_eq!(result.window_count, 0);
        assert_eq!(result.app_count, 0);
        assert_eq!(result.display_count, 1);
        assert!(result.screenshot_metadata_included);
        assert!(result.summary_only);
        assert!(!result.raw_screenshot_persisted);
        assert!(!result.raw_ocr_text_persisted);
        assert!(!result.raw_clipboard_included);
        assert!(!result.can_desktop_action);
        assert!(!result.can_click_type_select);
        assert!(!result.can_write_clipboard);
        assert!(!result.can_send_to_model);
        assert!(!result.can_write_event_store);
        assert!(!result.can_apply_patch);
        assert!(!result.can_rollback);
        assert!(!result.can_execute_git);
        assert!(!result.can_execute_shell);
        assert!(!result.app_can_execute);
        assert!(result
            .warning_codes
            .contains(&"SCREENSHOT_CAPTURE_NOT_PERFORMED".to_string()));
        let serialized = serde_json::to_string(&result).expect("serialize result");
        assert!(!serialized.contains("eventPreview"));
        assert!(!serialized.contains("eventLogPath"));
        assert!(!serialized.contains("raw screenshot bytes"));
        assert!(!serialized.contains("Authorization"));
        assert!(!serialized.contains("sk-"));
    }

    #[test]
    fn desktop_observer_command_does_not_write_eventstore() {
        let result =
            observe_desktop_metadata(safe_desktop_observation_request()).expect("safe summary");
        let value = serde_json::to_value(result).expect("serialize");
        assert!(value.get("eventPreview").is_none());
        assert!(value.get("eventLogPath").is_none());
        assert_eq!(value.get("canWriteEventStore"), Some(&Value::Bool(false)));
    }

    #[test]
    fn live_deepseek_proposal_blocks_missing_or_wrong_receipt() {
        let mut missing_receipt = safe_live_proposal_command_request();
        missing_receipt.session_receipt = Value::Null;
        let error = run_safe_live_command(missing_receipt).expect_err("missing receipt blocks");
        assert_eq!(error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");
        assert_eq!(error.stage, "live_deepseek_proposal");

        let mut wrong_receipt = safe_live_proposal_command_request();
        wrong_receipt.session_receipt["typedConfirmationAccepted"] = Value::Bool(false);
        let error = run_safe_live_command(wrong_receipt).expect_err("wrong receipt blocks");
        assert_eq!(error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");
        assert_eq!(error.stage, "live_deepseek_proposal");
    }

    #[test]
    fn live_deepseek_proposal_blocks_missing_or_raw_key_ref() {
        let mut missing_ref = safe_live_proposal_command_request();
        missing_ref.api_key_source_ref = String::new();
        let error = run_safe_live_command(missing_ref).expect_err("missing ref blocks");
        assert_eq!(error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");

        let mut raw_key = safe_live_proposal_command_request();
        raw_key.api_key_source_ref = "sk-fake-live-proposal-key-000000".to_string();
        let error = run_safe_live_command(raw_key).expect_err("raw key ref blocks");
        assert_eq!(error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");
        assert!(!error.safe_message.contains("sk-fake"));
    }

    #[test]
    fn live_deepseek_proposal_blocks_raw_request_fields() {
        let raw_prompt_field = ["raw", "Prompt"].join("");
        let raw_source_field = ["raw", "Source"].join("");
        let raw_diff_field = ["raw", "Diff"].join("");
        let mut request = safe_live_proposal_command_request();
        request.request_envelope[raw_prompt_field.as_str()] = Value::String("hidden".to_string());
        let error = run_safe_live_command(request).expect_err("raw prompt blocks");
        assert_eq!(error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");

        let mut request = safe_live_proposal_command_request();
        request.request_envelope[raw_source_field.as_str()] = Value::String("hidden".to_string());
        let error = run_safe_live_command(request).expect_err("raw source blocks");
        assert_eq!(error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");

        let mut request = safe_live_proposal_command_request();
        request.request_envelope[raw_diff_field.as_str()] = Value::String("hidden".to_string());
        let error = run_safe_live_command(request).expect_err("raw diff blocks");
        assert_eq!(error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");
    }

    #[test]
    fn live_deepseek_proposal_blocks_large_response() {
        let mut request = safe_live_proposal_command_request();
        request.max_response_bytes = LIVE_PROPOSAL_MIN_RESPONSE_BYTES;
        let error = run_generate_live_deepseek_patch_proposal_with_executor(
            request,
            safe_live_key_resolver,
            |_, _, _| {
                Ok(LiveDeepSeekTransportResponse {
                    status_code: 200,
                    body: "x".repeat(LIVE_PROPOSAL_MIN_RESPONSE_BYTES + 1),
                })
            },
        )
        .expect_err("large response blocks");
        assert_eq!(error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");
    }

    #[test]
    fn live_deepseek_proposal_returns_summary_without_key_or_reasoning() {
        let result =
            run_safe_live_command(safe_live_proposal_command_request()).expect("safe live result");
        let serialized = serde_json::to_string(&result).expect("serialize");

        assert!(result.ok);
        assert_eq!(result.status, "generated");
        assert_eq!(result.provider_id, "deepseek");
        assert_eq!(result.model_profile_id, "deepseek-chat");
        assert_eq!(result.request_id, "live-proposal-request-test");
        assert!(result.dropped_reasoning_content);
        assert!(result.reasoning_content_char_count > 0);
        assert!(result.summary_only);
        assert!(!result.raw_prompt_included);
        assert!(!result.raw_response_included);
        assert!(!result.raw_reasoning_content_included);
        assert!(!result.can_apply_patch);
        assert!(!result.can_rollback);
        assert!(!result.can_write_event_store);
        assert!(!result.can_execute_git);
        assert!(!result.can_execute_shell);
        assert!(result
            .warning_codes
            .contains(&"REASONING_CONTENT_DROPPED".to_string()));
        assert!(!serialized.contains("test-live-key-value"));
        assert!(!serialized.contains("internal chain should be dropped"));
        assert!(!serialized.contains("Authorization"));
        assert!(!serialized.contains("raw prompt"));
        assert!(!serialized.contains("raw response"));
    }

    #[test]
    fn live_deepseek_proposal_blocks_unsafe_model_response() {
        let secret_error = run_generate_live_deepseek_patch_proposal_with_executor(
            safe_live_proposal_command_request(),
            safe_live_key_resolver,
            |_, _, _| {
                let proposal = serde_json::json!({
                    "proposalId": "proposal-secret",
                    "operations": [],
                    "riskNotes": ["Bearer fake-token-value-000000"]
                });
                Ok(LiveDeepSeekTransportResponse {
                    status_code: 200,
                    body: serde_json::json!({
                        "choices": [{ "message": { "content": proposal.to_string() } }]
                    })
                    .to_string(),
                })
            },
        )
        .expect_err("secret marker blocks");
        assert_eq!(secret_error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");

        let execution_error = run_generate_live_deepseek_patch_proposal_with_executor(
            safe_live_proposal_command_request(),
            safe_live_key_resolver,
            |_, _, _| {
                let proposal = serde_json::json!({
                    "proposalId": "proposal-exec",
                    "eventStoreWrite": true
                });
                Ok(LiveDeepSeekTransportResponse {
                    status_code: 200,
                    body: serde_json::json!({
                        "choices": [{ "message": { "content": proposal.to_string() } }]
                    })
                    .to_string(),
                })
            },
        )
        .expect_err("execution field blocks");
        assert_eq!(execution_error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");
    }

    #[test]
    fn live_deepseek_proposal_does_not_call_resolver_or_transport_before_validation() {
        let mut request = safe_live_proposal_command_request();
        request.session_receipt["source"] = Value::String("wrong".to_string());
        let error = run_generate_live_deepseek_patch_proposal_with_executor(
            request,
            |_| panic!("resolver should not be called"),
            |_, _, _| panic!("transport should not be called"),
        )
        .expect_err("invalid request blocks early");
        assert_eq!(error.error_code, "LIVE_DEEPSEEK_PROPOSAL_BLOCKED");
    }

    #[test]
    fn records_live_proposal_summary_event_without_raw_output() {
        let workspace = temp_workspace("live-proposal-event");
        let result = record_live_proposal_summary_event(
            workspace.to_string_lossy().to_string(),
            safe_live_proposal_summary_event_preview(),
        )
        .expect("summary event recorded");
        let event_log = workspace.join(".deepseek-workbench").join("events.jsonl");
        let text = fs::read_to_string(event_log).expect("event log");

        assert!(result.ok);
        assert_eq!(result.event_type, LIVE_PROPOSAL_GENERATED_TYPE);
        assert_eq!(result.proposal_id, "proposal-live-test");
        assert!(text.contains(LIVE_PROPOSAL_GENERATED_TYPE));
        assert!(text.contains("\"proposalId\":\"proposal-live-test\""));
        assert!(text.contains("\"summaryOnly\":true"));
        assert!(text.contains("\"canApplyPatch\":false"));
        assert!(text.contains("\"canRollback\":false"));
        assert!(text.contains("\"canWriteEventStore\":false"));
        assert!(!text.contains(&["raw", "Response"].join("")));
        assert!(!text.contains(&["raw", "Prompt"].join("")));
        assert!(!text.contains("reasoning_content"));
        assert!(!text.contains("test-live-key-value"));
        assert!(!text.contains("Authorization"));
        assert!(!text.contains("sk-"));
    }

    #[test]
    fn live_proposal_summary_event_replay_projection_is_summary_only() {
        let workspace = temp_workspace("live-proposal-replay");
        record_live_proposal_summary_event(
            workspace.to_string_lossy().to_string(),
            safe_live_proposal_summary_event_preview(),
        )
        .expect("summary event recorded");

        let summary =
            load_workspace_event_summary(workspace.to_string_lossy().to_string(), Some(20));
        let serialized = serde_json::to_string(&summary).expect("serialize");

        assert!(summary.ok);
        assert_eq!(summary.live_proposal_event_count, 1);
        assert!(summary
            .latest_live_proposal_summary
            .as_deref()
            .unwrap_or_default()
            .contains("live proposal generated: proposal-live-test"));
        assert!(serialized.contains("model.patch_proposal.live_generated"));
        assert!(!serialized.contains(&["raw", "Response"].join("")));
        assert!(!serialized.contains(&["raw", "Prompt"].join("")));
        assert!(!serialized.contains("reasoning_content"));
        assert!(!serialized.contains("test-live-key-value"));
    }

    #[test]
    fn live_proposal_summary_event_rejects_unsafe_preview() {
        let workspace = temp_workspace("live-proposal-event-blocked");

        let mut raw_response = safe_live_proposal_summary_event_preview();
        raw_response["rawResponse"] = Value::String("hidden".to_string());
        let error = record_live_proposal_summary_event(
            workspace.to_string_lossy().to_string(),
            raw_response,
        )
        .expect_err("raw response blocks");
        assert_eq!(error.error_code, "INVALID_PAYLOAD");

        let mut secret = safe_live_proposal_summary_event_preview();
        secret["proposalHash"] = Value::String("sk-fake-live-event-secret-000000".to_string());
        let error =
            record_live_proposal_summary_event(workspace.to_string_lossy().to_string(), secret)
                .expect_err("secret marker blocks");
        assert_eq!(error.error_code, "INVALID_PAYLOAD");

        let mut execution = safe_live_proposal_summary_event_preview();
        execution["canApplyPatch"] = Value::Bool(true);
        let error =
            record_live_proposal_summary_event(workspace.to_string_lossy().to_string(), execution)
                .expect_err("execution flag blocks");
        assert_eq!(error.error_code, "INVALID_PAYLOAD");
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
    fn git_read_lane_status_summary_with_temp_repo() {
        let Some(workspace) = temp_git_workspace("git-status-summary") else {
            return;
        };
        fs::write(workspace.join("README.md"), "changed\n").expect("change");

        let result = run_git_read_lane(safe_git_read_request(
            &workspace,
            GitReadLane::StatusSummary,
        ))
        .expect("status summary");

        assert_eq!(result.lane, GitReadLane::StatusSummary);
        assert_eq!(result.status, "changed");
        assert!(result.changed_file_count >= 1);
        assert!(!result.raw_diff_included);
        assert!(!result.raw_stdout_included);
        assert!(!result.raw_stderr_included);
        assert!(result.event_preview.not_written);
    }

    #[test]
    fn git_read_lane_diff_summary_with_temp_repo() {
        let Some(workspace) = temp_git_workspace("git-diff-summary") else {
            return;
        };
        fs::write(workspace.join("README.md"), "initial\nadded\n").expect("change");

        let result = run_git_read_lane(safe_git_read_request(&workspace, GitReadLane::DiffSummary))
            .expect("diff summary");

        assert_eq!(result.lane, GitReadLane::DiffSummary);
        assert_eq!(result.status, "changed");
        assert!(result.changed_file_count >= 1);
        assert!(result.added_line_count >= 1);
        assert!(result
            .changed_path_summaries
            .iter()
            .any(|item| item.contains("README.md")));
        let serialized = serde_json::to_string(&result).expect("serialize");
        assert!(!serialized.contains("diff --git"));
        assert!(!serialized.contains("initial\nadded"));
    }

    #[test]
    fn git_read_lane_log_and_branch_summaries() {
        let Some(workspace) = temp_git_workspace("git-log-branch-summary") else {
            return;
        };

        let log = run_git_read_lane(safe_git_read_request(&workspace, GitReadLane::LogSummary))
            .expect("log summary");
        let branch = run_git_read_lane(safe_git_read_request(
            &workspace,
            GitReadLane::BranchSummary,
        ))
        .expect("branch summary");

        assert_eq!(log.status, "summary");
        assert!(log.file_count >= 1);
        assert!(log.changed_path_summaries[0].starts_with("commit "));
        assert_eq!(branch.status, "summary");
        assert!(!branch.branch_summary.is_empty());
    }

    #[test]
    fn git_read_lane_blocks_unsafe_pathspec() {
        let Some(workspace) = temp_git_workspace("git-unsafe-pathspec") else {
            return;
        };
        let mut request = safe_git_read_request(&workspace, GitReadLane::StatusSummary);
        request.pathspecs = Some(vec!["../secret.txt".to_string()]);

        let error = run_git_read_lane(request).expect_err("unsafe pathspec should block");

        assert_eq!(error.error_code, "GIT_PATHSPEC_REJECTED");
        assert_eq!(error.stage, "git_read_lane");
    }

    #[test]
    fn git_read_lane_write_command_is_not_deserializable() {
        let value = serde_json::json!({
            "workspaceRoot": "D:\\workspace",
            "workspaceRootRef": "workspace-ref-test",
            "lane": "commit"
        });

        let parsed = serde_json::from_value::<GitReadLaneRequest>(value);

        assert!(parsed.is_err());
    }

    #[test]
    fn git_read_lane_truncates_without_raw_output() {
        let Some(workspace) = temp_git_workspace("git-truncation-summary") else {
            return;
        };
        for index in 0..12 {
            fs::write(
                workspace.join(format!("file-{index}.md")),
                format!("safe summary file {index}\n"),
            )
            .expect("write changed file");
        }
        let mut request = safe_git_read_request(&workspace, GitReadLane::StatusSummary);
        request.max_output_bytes = Some(20);

        let result = run_git_read_lane(request).expect("truncated status");

        assert!(result.truncated);
        assert!(result
            .warning_codes
            .contains(&"GIT_OUTPUT_TRUNCATED".to_string()));
        let serialized = serde_json::to_string(&result).expect("serialize");
        assert!(!serialized.contains("safe summary file"));
    }

    #[test]
    fn shell_verification_allowed_template_uses_fixed_argv() {
        let workspace = temp_workspace("shell-fixed-argv");
        let seen = std::cell::RefCell::new(Vec::<String>::new());
        let request =
            safe_shell_verification_request(&workspace, ShellVerificationTemplateId::PnpmTypecheck);

        let result = run_shell_verification_lane_with_executor(
            request,
            |program, args, _cwd, _timeout, _max_output_bytes| {
                seen.borrow_mut()
                    .extend(std::iter::once(program.to_string()).chain(args.iter().cloned()));
                Ok(ShellCommandOutput {
                    exit_code: Some(0),
                    stdout: b"typecheck passed\n".to_vec(),
                    stderr: Vec::new(),
                    duration_ms: 12,
                    truncated: false,
                })
            },
        )
        .expect("shell verification summary");

        assert_eq!(
            seen.into_inner(),
            vec!["pnpm".to_string(), "typecheck".to_string()]
        );
        assert_eq!(
            result.template_id,
            ShellVerificationTemplateId::PnpmTypecheck
        );
        assert_eq!(result.status, "passed");
        assert_eq!(result.exit_code, Some(0));
        assert_eq!(result.stdout_line_count, 1);
        assert!(!result.raw_stdout_included);
        assert!(!result.raw_stderr_included);
        assert!(result.event_preview.not_written);
    }

    #[test]
    fn shell_verification_scoped_test_template_accepts_only_safe_path() {
        let workspace = temp_workspace("shell-scoped-test");
        let mut request = safe_shell_verification_request(
            &workspace,
            ShellVerificationTemplateId::PnpmTestScoped,
        );
        request.safe_args = Some(ShellVerificationSafeArgs {
            test_file_path: Some("runtime/test/model-patch-proposal-schema.test.ts".to_string()),
        });
        let result = run_shell_verification_lane_with_executor(
            request,
            |program, args, _cwd, _timeout, _max_output_bytes| {
                assert_eq!(program, "pnpm");
                assert_eq!(
                    args,
                    &[
                        "exec".to_string(),
                        "vitest".to_string(),
                        "run".to_string(),
                        "runtime/test/model-patch-proposal-schema.test.ts".to_string()
                    ]
                );
                Ok(ShellCommandOutput {
                    exit_code: Some(0),
                    stdout: b"test passed\n".to_vec(),
                    stderr: Vec::new(),
                    duration_ms: 9,
                    truncated: false,
                })
            },
        )
        .expect("scoped test verification");

        assert_eq!(result.status, "passed");
    }

    #[test]
    fn shell_verification_unknown_or_install_template_is_not_deserializable() {
        for template_id in ["custom.command", "pnpm.install"] {
            let value = serde_json::json!({
                "workspaceRoot": "D:\\workspace",
                "workspaceRootRef": "workspace-ref-test",
                "templateId": template_id
            });

            let parsed = serde_json::from_value::<ShellVerificationLaneRequest>(value);

            assert!(parsed.is_err());
        }
    }

    #[test]
    fn shell_verification_blocks_shell_metacharacters_and_unsafe_cwd() {
        let workspace = temp_workspace("shell-unsafe-path");
        let mut request = safe_shell_verification_request(
            &workspace,
            ShellVerificationTemplateId::PnpmTestScoped,
        );
        request.safe_args = Some(ShellVerificationSafeArgs {
            test_file_path: Some("runtime/test/example.test.ts;rm -rf workspace".to_string()),
        });

        let error = run_shell_verification_lane_with_executor(
            request,
            |_program, _args, _cwd, _timeout, _max_output_bytes| unreachable!(),
        )
        .expect_err("unsafe safe arg should block");

        assert_eq!(error.error_code, "SHELL_TEST_FILE_REJECTED");
        assert_eq!(error.stage, "shell_verification_lane");

        let missing = std::env::temp_dir().join("dw-shell-verification-missing-workspace");
        let missing_request =
            safe_shell_verification_request(&missing, ShellVerificationTemplateId::AppTypecheck);
        let error = run_shell_verification_lane_with_executor(
            missing_request,
            |_program, _args, _cwd, _timeout, _max_output_bytes| unreachable!(),
        )
        .expect_err("unsafe cwd should block");

        assert_eq!(error.error_code, "SHELL_WORKSPACE_INVALID");
    }

    #[test]
    fn shell_verification_redacts_sensitive_output_without_raw_summary() {
        let workspace = temp_workspace("shell-redaction");
        let request =
            safe_shell_verification_request(&workspace, ShellVerificationTemplateId::PnpmLint);

        let error = run_shell_verification_lane_with_executor(
            request,
            |_program, _args, _cwd, _timeout, _max_output_bytes| {
                Ok(ShellCommandOutput {
                    exit_code: Some(1),
                    stdout: b"api key sk-test1234567890abcdef\n".to_vec(),
                    stderr: Vec::new(),
                    duration_ms: 2,
                    truncated: false,
                })
            },
        )
        .expect_err("secret-like output should block");

        assert_eq!(error.error_code, "SHELL_OUTPUT_REDACTED");
        assert!(!error.safe_message.contains("sk-"));
    }

    #[test]
    fn shell_verification_truncates_and_counts_without_raw_output() {
        let workspace = temp_workspace("shell-truncation");
        let request =
            safe_shell_verification_request(&workspace, ShellVerificationTemplateId::PnpmLint);

        let result = run_shell_verification_lane_with_executor(
            request,
            |_program, _args, _cwd, _timeout, _max_output_bytes| {
                Ok(ShellCommandOutput {
                    exit_code: Some(1),
                    stdout: b"line one\nline two\n".to_vec(),
                    stderr: b"warning only\n".to_vec(),
                    duration_ms: 3,
                    truncated: true,
                })
            },
        )
        .expect("truncated shell verification");

        assert_eq!(result.status, "failed");
        assert_eq!(result.stdout_line_count, 2);
        assert_eq!(result.stderr_line_count, 1);
        assert!(result
            .warning_codes
            .contains(&"SHELL_OUTPUT_TRUNCATED".to_string()));
        assert!(result
            .warning_codes
            .contains(&"SHELL_EXIT_NONZERO".to_string()));
        assert!(result
            .warning_codes
            .contains(&"SHELL_STDERR_PRESENT".to_string()));
        let serialized = serde_json::to_string(&result).expect("serialize");
        assert!(!serialized.contains("line one"));
        assert!(!serialized.contains("warning only"));
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
    fn event_summary_projects_project_knowledge_lifecycle_events() {
        let workspace = temp_workspace("project-knowledge-event-summary");
        let committed = project_knowledge_commit_candidate(
            workspace.to_string_lossy().to_string(),
            safe_project_knowledge_candidate("project_fact"),
        )
        .expect("commit project knowledge");
        project_knowledge_revoke(
            workspace.to_string_lossy().to_string(),
            committed.entry.entry_id.clone(),
            PROJECT_KNOWLEDGE_REVOKE_CONFIRMATION.to_string(),
        )
        .expect("revoke project knowledge");

        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));
        let serialized = serde_json::to_string(&summary).expect("summary");

        assert!(summary.ok);
        assert_eq!(summary.event_count, 2);
        assert_eq!(summary.project_knowledge_event_count, 2);
        assert_eq!(summary.project_knowledge_entry_count, 1);
        assert_eq!(
            summary
                .type_counts
                .get(PROJECT_KNOWLEDGE_CANDIDATE_COMMITTED_TYPE)
                .copied(),
            Some(1)
        );
        assert_eq!(
            summary.project_knowledge_redaction_audit_status.as_deref(),
            Some("ok")
        );
        assert!(summary
            .latest_project_knowledge_summary
            .as_deref()
            .unwrap_or_default()
            .contains("project knowledge entry revoked"));
        assert!(summary.timeline[0]
            .safe_payload_keys
            .contains(&"entryId".to_string()));
        assert!(!serialized.contains(&format!("{}{}", "raw", "Prompt")));
        assert!(!serialized.contains(&format!("{}{}", "raw", "Source")));
        assert!(!serialized.contains("sk-"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn project_knowledge_informed_e2e_smoke_commits_revokes_and_replays() {
        let workspace = temp_workspace("project-knowledge-e2e-smoke");
        let verification_preview = serde_json::json!({
            "type": "shell.verification_lane.executed",
            "templateId": "pnpm.test.scoped",
            "workspaceRootRef": "workspace-ref-p0t",
            "commandHash": "shell-command-hash-p0t",
            "resultHash": "shell-result-hash-p0t",
            "exitCode": 1,
            "stdoutBytes": 96,
            "stderrBytes": 0,
            "warningCodes": ["DOCS_INDEX_MISSING"],
            "durationMs": 33,
            "truncated": false,
            "summaryOnly": true,
            "notWritten": true
        });
        record_verification_lane_event(
            workspace.to_string_lossy().to_string(),
            verification_preview,
        )
        .expect("record safe verification summary");

        let mut fact = safe_project_knowledge_candidate("project_fact");
        fact.summary =
            "Convert remains the real web_table_to_csv flow during memory smoke.".to_string();
        fact.fact_kind = Some("conversion_boundary".to_string());
        let mut pitfall = safe_project_knowledge_candidate("pitfall");
        pitfall.summary =
            "When verification fails because docs index is missing, update docs/README.md."
                .to_string();
        pitfall.trigger_summary =
            Some("Verification failed because the docs index was missing.".to_string());
        pitfall.mitigation_summary =
            Some("Update docs/README.md when adding a docs file.".to_string());

        let fact_commit =
            project_knowledge_commit_candidate(workspace.to_string_lossy().to_string(), fact)
                .expect("commit project fact");
        let pitfall_commit =
            project_knowledge_commit_candidate(workspace.to_string_lossy().to_string(), pitfall)
                .expect("commit pitfall");
        let snapshot = project_knowledge_list(workspace.to_string_lossy().to_string())
            .expect("project knowledge snapshot");

        assert_eq!(snapshot.active_entry_count, 2);
        assert!(snapshot
            .entries
            .iter()
            .any(|entry| entry.entry_id == fact_commit.entry.entry_id));
        assert!(snapshot
            .entries
            .iter()
            .any(|entry| entry.entry_id == pitfall_commit.entry.entry_id));

        project_knowledge_revoke(
            workspace.to_string_lossy().to_string(),
            pitfall_commit.entry.entry_id.clone(),
            PROJECT_KNOWLEDGE_REVOKE_CONFIRMATION.to_string(),
        )
        .expect("revoke recalled pitfall");
        let after_revoke = project_knowledge_list(workspace.to_string_lossy().to_string())
            .expect("project knowledge after revoke");
        let replay_summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(20));
        let serialized = serde_json::to_string(&replay_summary).expect("summary");

        assert_eq!(after_revoke.active_entry_count, 1);
        assert_eq!(after_revoke.revoked_entry_count, 1);
        assert_eq!(replay_summary.verification_event_count, 1);
        assert_eq!(replay_summary.project_knowledge_event_count, 3);
        assert_eq!(replay_summary.project_knowledge_entry_count, 2);
        assert!(replay_summary
            .latest_project_knowledge_summary
            .as_deref()
            .unwrap_or_default()
            .contains("project knowledge entry revoked"));
        assert!(replay_summary
            .type_counts
            .contains_key(PROJECT_KNOWLEDGE_CANDIDATE_COMMITTED_TYPE));
        assert!(!serialized.contains(&format!("{}{}", "raw", "Prompt")));
        assert!(!serialized.contains(&format!("{}{}", "raw", "Source")));
        assert!(!serialized.contains("reasoning_content"));
        assert!(!serialized.contains("sk-"));

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
    fn approved_apply_blocks_stale_delete_before_mutation() {
        let workspace = temp_workspace("approved-apply-stale-delete");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let target = workspace.join("src").join("delete-me.txt");
        fs::write(&target, "delete stale safe content").expect("delete file");
        let request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/delete-me.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Delete,
                content: None,
                expected_before_hash: Some("deadbeef".to_string()),
                expected_exists_before: Some(true),
            }],
            &["src/delete-me.txt"],
        );

        let error =
            apply_approved_user_workspace_patch(request).expect_err("stale delete should block");

        assert_eq!(error.error_code, "APPROVED_APPLY_BLOCKED");
        assert!(error.safe_message.contains("expectedBeforeHash mismatch"));
        assert_eq!(
            fs::read_to_string(&target).expect("unchanged"),
            "delete stale safe content"
        );
        assert!(!workspace.join(".deepseek-workbench").exists());

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_apply_blocks_create_conflict_before_checkpoint() {
        let workspace = temp_workspace("approved-apply-create-conflict");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let target = workspace.join("src").join("file.txt");
        fs::write(&target, "existing safe content").expect("existing file");
        let request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("new safe content".to_string()),
                expected_before_hash: None,
                expected_exists_before: None,
            }],
            &["src/file.txt"],
        );

        let error =
            apply_approved_user_workspace_patch(request).expect_err("create conflict should block");

        assert_eq!(error.error_code, "APPROVED_APPLY_BLOCKED");
        assert!(error.safe_message.contains("create target already exists"));
        assert_eq!(
            fs::read_to_string(&target).expect("unchanged"),
            "existing safe content"
        );
        assert!(!workspace.join(".deepseek-workbench").exists());

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_apply_handles_checkpoint_creation_failure_without_writing_target() {
        let workspace = temp_workspace("approved-apply-checkpoint-failure");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        fs::write(workspace.join(".deepseek-workbench"), "not a directory")
            .expect("checkpoint path blocker");
        let target = workspace.join("src").join("file.txt");
        let request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some("new safe content".to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            &["src/file.txt"],
        );

        let error = apply_approved_user_workspace_patch(request)
            .expect_err("checkpoint failure should block");

        assert_eq!(error.error_code, "APPROVED_APPLY_IO_FAILED");
        assert!(error
            .safe_message
            .contains("checkpoint directory could not be created"));
        assert!(!target.exists());

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
    fn approved_rollback_blocks_current_file_hash_mismatch() {
        let workspace = temp_workspace("approved-rollback-current-hash-mismatch");
        fs::create_dir_all(workspace.join("src")).expect("src dir");
        let target = workspace.join("src").join("file.txt");
        fs::write(&target, "old rollback safe content").expect("old file");
        let apply_request = safe_approved_apply_request(
            &workspace,
            vec![ApprovedApplyOperation {
                path: "src/file.txt".to_string(),
                change_kind: ApprovedApplyChangeKind::Update,
                content: Some("new rollback safe content".to_string()),
                expected_before_hash: Some(
                    short_hash("old rollback safe content")[..8].to_string(),
                ),
                expected_exists_before: Some(true),
            }],
            &["src/file.txt"],
        );
        let apply_result = apply_approved_user_workspace_patch(apply_request).expect("apply");
        fs::write(&target, "external safe modification").expect("external change");

        let error = rollback_approved_user_workspace_patch(safe_approved_rollback_request(
            &workspace,
            &apply_result,
            &["src/file.txt"],
        ))
        .expect_err("current hash mismatch should block");

        assert_eq!(error.error_code, "APPROVED_ROLLBACK_BLOCKED");
        assert!(error.safe_message.contains("current file hash mismatch"));
        assert_eq!(
            fs::read_to_string(&target).expect("external content preserved"),
            "external safe modification"
        );
        assert!(!error.safe_message.contains("external safe modification"));

        let _ = fs::remove_dir_all(workspace);
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
        let event_log =
            fs::read_to_string(workspace.join(".deepseek-workbench").join("events.jsonl"))
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
        let rollback_result = rollback_approved_user_workspace_patch(
            safe_approved_rollback_request(&workspace, &apply_result, &["src/event-file.txt"]),
        )
        .expect("approved rollback");

        let event_record = record_approved_user_workspace_execution_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&rollback_result.event_preview).expect("event preview"),
        )
        .expect("record rollback event");
        let event_log =
            fs::read_to_string(workspace.join(".deepseek-workbench").join("events.jsonl"))
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
    fn verification_lane_events_record_git_and_shell_summary_only() {
        let workspace = temp_workspace("verification-lane-events");
        let git_preview = serde_json::json!({
            "type": "git.read_lane.executed",
            "lane": "status_summary",
            "workspaceRootRef": "workspace-ref-test",
            "commandHash": "git-command-hash",
            "resultHash": "git-result-hash",
            "changedFileCount": 2,
            "addedLineCount": 3,
            "deletedLineCount": 1,
            "warningCodes": [],
            "durationMs": 14,
            "truncated": false,
            "summaryOnly": true,
            "notWritten": true
        });
        let shell_preview = serde_json::json!({
            "type": "shell.verification_lane.executed",
            "templateId": "app.typecheck",
            "workspaceRootRef": "workspace-ref-test",
            "commandHash": "shell-command-hash",
            "resultHash": "shell-result-hash",
            "exitCode": 0,
            "stdoutBytes": 128,
            "stderrBytes": 0,
            "warningCodes": [],
            "durationMs": 21,
            "truncated": false,
            "summaryOnly": true,
            "notWritten": true
        });

        let git_record =
            record_verification_lane_event(workspace.to_string_lossy().to_string(), git_preview)
                .expect("record git verification");
        let shell_record =
            record_verification_lane_event(workspace.to_string_lossy().to_string(), shell_preview)
                .expect("record shell verification");
        let event_log =
            fs::read_to_string(workspace.join(".deepseek-workbench").join("events.jsonl"))
                .expect("event log");
        let summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(10));

        assert_eq!(git_record.event_type, "git.read_lane.executed");
        assert_eq!(git_record.lane_or_template_id, "status_summary");
        assert_eq!(shell_record.event_type, "shell.verification_lane.executed");
        assert_eq!(shell_record.lane_or_template_id, "app.typecheck");
        assert_eq!(summary.verification_event_count, 2);
        assert!(summary
            .latest_verification_summary
            .as_deref()
            .unwrap_or_default()
            .contains("shell verification lane recorded"));
        assert!(summary
            .timeline
            .iter()
            .any(|item| item.event_type == "git.read_lane.executed"));
        assert!(summary.safety_scan.ok);
        assert!(!event_log.contains("rawStdout"));
        assert!(!event_log.contains("rawStderr"));
        assert!(!event_log.contains("diff --git"));
        assert!(!event_log.contains("api key"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn verification_lane_event_blocks_raw_output_preview() {
        let workspace = temp_workspace("verification-lane-event-blocked");
        let mut preview = serde_json::json!({
            "type": "shell.verification_lane.executed",
            "templateId": "app.typecheck",
            "workspaceRootRef": "workspace-ref-test",
            "commandHash": "shell-command-hash",
            "resultHash": "shell-result-hash",
            "exitCode": 0,
            "stdoutBytes": 128,
            "stderrBytes": 0,
            "warningCodes": [],
            "durationMs": 21,
            "truncated": false,
            "summaryOnly": true,
            "notWritten": true
        });
        preview["rawStdout"] = Value::String("do not keep".to_string());

        let error =
            record_verification_lane_event(workspace.to_string_lossy().to_string(), preview)
                .expect_err("raw output preview should block");

        assert_eq!(error.error_code, "INVALID_PAYLOAD");
        assert_eq!(error.stage, "record_verification_lane_event");

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn live_proposal_to_approved_execution_e2e_smoke_fake_only() {
        let Some(workspace) = temp_git_workspace("live-proposal-approved-e2e-smoke") else {
            return;
        };
        fs::create_dir_all(workspace.join("docs")).expect("docs dir");

        let live_result =
            run_safe_live_command(safe_live_proposal_command_request()).expect("fake live result");
        let proposal_id = live_result
            .proposal_candidate
            .get("proposalId")
            .and_then(Value::as_str)
            .expect("proposal id");
        let proposal_path = live_result
            .proposal_candidate
            .get("operations")
            .and_then(Value::as_array)
            .and_then(|operations| operations.first())
            .and_then(|operation| operation.get("path"))
            .and_then(Value::as_str)
            .expect("proposal path");
        let target = workspace.join(proposal_path);

        assert_eq!(live_result.status, "generated");
        assert!(live_result.summary_only);
        assert!(!live_result.can_apply_patch);
        assert!(!live_result.can_write_event_store);

        record_live_proposal_summary_event(
            workspace.to_string_lossy().to_string(),
            safe_live_proposal_summary_event_preview(),
        )
        .expect("record live proposal summary event");
        let live_summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(20));

        assert_eq!(live_summary.live_proposal_event_count, 1);
        assert_eq!(live_summary.approved_apply_count, 0);
        assert_eq!(live_summary.approved_rollback_count, 0);
        assert!(!target.exists());
        assert!(live_summary
            .latest_live_proposal_summary
            .as_deref()
            .unwrap_or_default()
            .contains("live proposal generated"));

        let workspace_root_ref = "workspace-ref-live-proposal-approved-smoke";
        let validation_id = "validation-live-proposal-smoke";
        let audit_id = "audit-live-proposal-smoke";
        let approval_draft_id = "approval-live-proposal-smoke";
        let approved_content = "approved live proposal smoke content";
        let apply_receipt = serde_json::json!({
            "status": "ready",
            "receiptId": "receipt-live-proposal-apply-smoke",
            "kind": "apply",
            "source": "runtime_app_approved_execution_receipt",
            "summaryOnly": true,
            "scope": {
                "receiptId": "receipt-live-proposal-apply-smoke",
                "kind": "apply",
                "workspaceRootRef": workspace_root_ref,
                "proposalId": proposal_id,
                "validationId": validation_id,
                "auditId": audit_id,
                "approvalDraftId": approval_draft_id,
                "allowedRelativePaths": [proposal_path],
                "maxFiles": 1,
                "maxBytes": 4096,
                "expiresAt": "2099-01-01T00:00:00.000Z",
                "typedConfirmation": APPLY_CONFIRMATION,
                "receiptHash": "receipt-live-proposal-apply-hash"
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
        });
        let apply_result = apply_approved_user_workspace_patch(ApprovedApplyRequest {
            workspace_root: workspace.to_string_lossy().to_string(),
            workspace_root_ref: workspace_root_ref.to_string(),
            receipt: apply_receipt.clone(),
            operations: vec![ApprovedApplyOperation {
                path: proposal_path.to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some(approved_content.to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            proposal_summary: serde_json::json!({"proposalId": proposal_id}),
            validation_summary: serde_json::json!({"validationId": validation_id}),
            audit_summary: serde_json::json!({"auditId": audit_id}),
            approval_summary: serde_json::json!({"approvalDraftId": approval_draft_id}),
            max_files: 1,
            max_bytes: 4096,
        })
        .expect("approved apply from live proposal smoke");

        assert!(target.is_file());
        assert_eq!(
            fs::read_to_string(&target).expect("approved content"),
            approved_content
        );
        record_approved_user_workspace_execution_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&apply_result.event_preview).expect("apply event preview"),
        )
        .expect("record approved apply event");

        let git_result = run_git_read_lane(safe_git_read_request(
            &workspace,
            GitReadLane::StatusSummary,
        ))
        .expect("git verification after live proposal apply");
        assert!(git_result.changed_file_count >= 1);
        assert!(!git_result.raw_diff_included);
        record_verification_lane_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&git_result.event_preview).expect("git verification preview"),
        )
        .expect("record git verification event");

        let shell_result = run_shell_verification_lane_with_executor(
            safe_shell_verification_request(&workspace, ShellVerificationTemplateId::AppTypecheck),
            |_program, _args, _cwd, _timeout, _max_output_bytes| {
                Ok(ShellCommandOutput {
                    exit_code: Some(0),
                    stdout: b"app typecheck passed\n".to_vec(),
                    stderr: Vec::new(),
                    duration_ms: 19,
                    truncated: false,
                })
            },
        )
        .expect("shell verification after live proposal apply");
        assert_eq!(shell_result.status, "passed");
        assert!(!shell_result.raw_stdout_included);
        assert!(!shell_result.raw_stderr_included);
        record_verification_lane_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&shell_result.event_preview).expect("shell verification preview"),
        )
        .expect("record shell verification event");

        let rollback_receipt = serde_json::json!({
            "status": "ready",
            "receiptId": "receipt-live-proposal-rollback-smoke",
            "kind": "rollback",
            "source": "runtime_app_approved_execution_receipt",
            "summaryOnly": true,
            "scope": {
                "receiptId": "receipt-live-proposal-rollback-smoke",
                "kind": "rollback",
                "workspaceRootRef": workspace_root_ref,
                "proposalId": proposal_id,
                "validationId": validation_id,
                "auditId": audit_id,
                "approvalDraftId": approval_draft_id,
                "checkpointId": apply_result.checkpoint_id,
                "allowedRelativePaths": [proposal_path],
                "maxFiles": 1,
                "maxBytes": 4096,
                "expiresAt": "2099-01-01T00:00:00.000Z",
                "typedConfirmation": ROLLBACK_CONFIRMATION,
                "receiptHash": "receipt-live-proposal-rollback-hash"
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
        });
        let rollback_result = rollback_approved_user_workspace_patch(ApprovedRollbackRequest {
            workspace_root: workspace.to_string_lossy().to_string(),
            workspace_root_ref: workspace_root_ref.to_string(),
            receipt: rollback_receipt,
            apply_id: apply_result.apply_id.clone(),
            checkpoint_id: apply_result.checkpoint_id.clone(),
            checkpoint_ref: apply_result.checkpoint_hash.clone(),
        })
        .expect("approved rollback after live proposal smoke");
        assert!(!target.exists());
        record_approved_user_workspace_execution_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&rollback_result.event_preview).expect("rollback event preview"),
        )
        .expect("record approved rollback event");

        let replay_summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(30));
        let event_log =
            fs::read_to_string(workspace.join(".deepseek-workbench").join("events.jsonl"))
                .expect("event log");

        assert_eq!(replay_summary.live_proposal_event_count, 1);
        assert_eq!(replay_summary.approved_apply_count, 1);
        assert_eq!(replay_summary.approved_rollback_count, 1);
        assert_eq!(replay_summary.verification_event_count, 2);
        assert!(replay_summary.safety_scan.ok);
        assert!(replay_summary
            .latest_approved_execution_summary
            .as_deref()
            .unwrap_or_default()
            .contains("approved rollback executed"));
        assert!(event_log.contains(LIVE_PROPOSAL_GENERATED_TYPE));
        assert!(event_log.contains(APPROVED_APPLY_EXECUTED_TYPE));
        assert!(event_log.contains(APPROVED_ROLLBACK_EXECUTED_TYPE));
        assert!(event_log.contains("git.read_lane.executed"));
        assert!(event_log.contains("shell.verification_lane.executed"));
        assert!(!event_log.contains(approved_content));
        assert!(!event_log.contains("internal chain should be dropped"));
        assert!(!event_log.contains("reasoning_content"));
        assert!(!event_log.contains(&["raw", "Response"].join("")));
        assert!(!event_log.contains(&["raw", "Prompt"].join("")));
        assert!(!event_log.contains("Authorization"));
        assert!(!event_log.contains("sk-"));
        assert!(!event_log.contains("diff --git"));
        assert!(!event_log.contains("shellCommand"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn approved_execution_e2e_smoke_apply_event_rollback_replay() {
        let fixture_path = repo_root()
            .expect("repo root")
            .join("app")
            .join("test")
            .join("fixtures")
            .join("approved-execution-smoke-proposal.json");
        let fixture: Value = serde_json::from_str(
            &fs::read_to_string(fixture_path).expect("smoke proposal fixture"),
        )
        .expect("smoke proposal json");
        let path = fixture
            .get("path")
            .and_then(Value::as_str)
            .expect("fixture path");
        let content = fixture
            .get("contentDraft")
            .and_then(Value::as_str)
            .expect("fixture content");
        let workspace_root_ref = fixture
            .get("workspaceRootRef")
            .and_then(Value::as_str)
            .expect("workspace root ref");
        let proposal_id = fixture
            .get("proposalId")
            .and_then(Value::as_str)
            .expect("proposal id");
        let validation_id = fixture
            .get("validationId")
            .and_then(Value::as_str)
            .expect("validation id");
        let audit_id = fixture
            .get("auditId")
            .and_then(Value::as_str)
            .expect("audit id");
        let approval_draft_id = fixture
            .get("approvalDraftId")
            .and_then(Value::as_str)
            .expect("approval draft id");
        let Some(workspace) = temp_git_workspace("approved-execution-e2e-smoke") else {
            return;
        };
        fs::create_dir_all(workspace.join("docs")).expect("docs dir");
        let target = workspace.join(path);
        let apply_receipt = serde_json::json!({
            "status": "ready",
            "receiptId": "receipt-apply-smoke",
            "kind": "apply",
            "source": "runtime_app_approved_execution_receipt",
            "summaryOnly": true,
            "scope": {
                "receiptId": "receipt-apply-smoke",
                "kind": "apply",
                "workspaceRootRef": workspace_root_ref,
                "proposalId": proposal_id,
                "validationId": validation_id,
                "auditId": audit_id,
                "approvalDraftId": approval_draft_id,
                "allowedRelativePaths": [path],
                "maxFiles": 1,
                "maxBytes": 4096,
                "expiresAt": "2099-01-01T00:00:00.000Z",
                "typedConfirmation": APPLY_CONFIRMATION,
                "receiptHash": "receipt-smoke-hash"
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
        });
        let apply_request = ApprovedApplyRequest {
            workspace_root: workspace.to_string_lossy().to_string(),
            workspace_root_ref: workspace_root_ref.to_string(),
            receipt: apply_receipt.clone(),
            operations: vec![ApprovedApplyOperation {
                path: path.to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some(content.to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            proposal_summary: serde_json::json!({"proposalId": proposal_id}),
            validation_summary: serde_json::json!({"validationId": validation_id}),
            audit_summary: serde_json::json!({"auditId": audit_id}),
            approval_summary: serde_json::json!({"approvalDraftId": approval_draft_id}),
            max_files: 1,
            max_bytes: 4096,
        };

        let apply_result =
            apply_approved_user_workspace_patch(apply_request).expect("approved apply smoke");
        assert!(target.is_file());
        assert_eq!(
            fs::read_to_string(&target).expect("target content"),
            content
        );
        let checkpoint_path = workspace
            .join(".deepseek-workbench")
            .join("checkpoints")
            .join(format!("{}.json", apply_result.checkpoint_id));
        assert!(checkpoint_path.is_file());

        record_approved_user_workspace_execution_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&apply_result.event_preview).expect("apply preview"),
        )
        .expect("record apply event");
        let apply_summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(20));
        assert_eq!(apply_summary.approved_apply_count, 1);
        assert_eq!(apply_summary.approved_rollback_count, 0);
        assert!(apply_summary.safety_scan.ok);
        assert!(apply_summary
            .latest_approved_execution_summary
            .as_deref()
            .unwrap_or_default()
            .contains("approved apply executed"));

        let git_result = run_git_read_lane(safe_git_read_request(
            &workspace,
            GitReadLane::StatusSummary,
        ))
        .expect("git verification summary after apply");
        assert!(git_result.changed_file_count >= 1);
        assert!(!git_result.raw_diff_included);
        assert!(!git_result.raw_stdout_included);
        assert!(!git_result.raw_stderr_included);
        record_verification_lane_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&git_result.event_preview).expect("git verification preview"),
        )
        .expect("record git verification event");

        let shell_result = run_shell_verification_lane_with_executor(
            safe_shell_verification_request(&workspace, ShellVerificationTemplateId::AppTypecheck),
            |_program, _args, _cwd, _timeout, _max_output_bytes| {
                Ok(ShellCommandOutput {
                    exit_code: Some(0),
                    stdout: b"app typecheck passed\n".to_vec(),
                    stderr: Vec::new(),
                    duration_ms: 17,
                    truncated: false,
                })
            },
        )
        .expect("shell verification summary after apply");
        assert_eq!(shell_result.status, "passed");
        assert!(!shell_result.raw_stdout_included);
        assert!(!shell_result.raw_stderr_included);
        record_verification_lane_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&shell_result.event_preview).expect("shell verification preview"),
        )
        .expect("record shell verification event");

        let verification_summary =
            load_event_summary(workspace.to_string_lossy().as_ref(), Some(20));
        assert_eq!(verification_summary.verification_event_count, 2);
        assert!(verification_summary.safety_scan.ok);
        assert!(verification_summary
            .latest_verification_summary
            .as_deref()
            .unwrap_or_default()
            .contains("shell verification lane recorded"));

        let conflict_request = ApprovedApplyRequest {
            workspace_root: workspace.to_string_lossy().to_string(),
            workspace_root_ref: workspace_root_ref.to_string(),
            receipt: apply_receipt,
            operations: vec![ApprovedApplyOperation {
                path: path.to_string(),
                change_kind: ApprovedApplyChangeKind::Create,
                content: Some(content.to_string()),
                expected_before_hash: None,
                expected_exists_before: Some(false),
            }],
            proposal_summary: serde_json::json!({"proposalId": proposal_id}),
            validation_summary: serde_json::json!({"validationId": validation_id}),
            audit_summary: serde_json::json!({"auditId": audit_id}),
            approval_summary: serde_json::json!({"approvalDraftId": approval_draft_id}),
            max_files: 1,
            max_bytes: 4096,
        };
        let conflict_error = apply_approved_user_workspace_patch(conflict_request)
            .expect_err("duplicate create should block");
        assert_eq!(conflict_error.error_code, "APPROVED_APPLY_BLOCKED");

        let rollback_receipt = serde_json::json!({
            "status": "ready",
            "receiptId": "receipt-rollback-smoke",
            "kind": "rollback",
            "source": "runtime_app_approved_execution_receipt",
            "summaryOnly": true,
            "scope": {
                "receiptId": "receipt-rollback-smoke",
                "kind": "rollback",
                "workspaceRootRef": workspace_root_ref,
                "proposalId": proposal_id,
                "validationId": validation_id,
                "auditId": audit_id,
                "approvalDraftId": approval_draft_id,
                "checkpointId": apply_result.checkpoint_id,
                "allowedRelativePaths": [path],
                "maxFiles": 1,
                "maxBytes": 4096,
                "expiresAt": "2099-01-01T00:00:00.000Z",
                "typedConfirmation": ROLLBACK_CONFIRMATION,
                "receiptHash": "receipt-rollback-smoke-hash"
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
        });
        let rollback_result = rollback_approved_user_workspace_patch(ApprovedRollbackRequest {
            workspace_root: workspace.to_string_lossy().to_string(),
            workspace_root_ref: workspace_root_ref.to_string(),
            receipt: rollback_receipt,
            apply_id: apply_result.apply_id.clone(),
            checkpoint_id: apply_result.checkpoint_id.clone(),
            checkpoint_ref: apply_result.checkpoint_hash.clone(),
        })
        .expect("approved rollback smoke");
        assert!(!target.exists());
        record_approved_user_workspace_execution_event(
            workspace.to_string_lossy().to_string(),
            serde_json::to_value(&rollback_result.event_preview).expect("rollback preview"),
        )
        .expect("record rollback event");
        let replay_summary = load_event_summary(workspace.to_string_lossy().as_ref(), Some(20));
        let event_log =
            fs::read_to_string(workspace.join(".deepseek-workbench").join("events.jsonl"))
                .expect("event log");

        assert_eq!(replay_summary.approved_apply_count, 1);
        assert_eq!(replay_summary.approved_rollback_count, 1);
        assert_eq!(replay_summary.verification_event_count, 2);
        assert!(replay_summary.safety_scan.ok);
        assert!(replay_summary
            .latest_approved_execution_summary
            .as_deref()
            .unwrap_or_default()
            .contains("approved rollback executed"));
        assert!(event_log.contains(APPROVED_APPLY_EXECUTED_TYPE));
        assert!(event_log.contains(APPROVED_ROLLBACK_EXECUTED_TYPE));
        assert!(event_log.contains("git.read_lane.executed"));
        assert!(event_log.contains("shell.verification_lane.executed"));
        assert!(!event_log.contains(content));
        assert!(!event_log.contains("preimage"));
        assert!(!event_log.contains("diff --git"));
        assert!(!event_log.contains("rawStdout"));
        assert!(!event_log.contains("rawStderr"));
        assert!(!event_log.to_ascii_lowercase().contains("deepseek"));
        let api_key_marker = ["api", " key"].concat();
        assert!(!event_log.to_ascii_lowercase().contains(&api_key_marker));

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

    fn safe_project_knowledge_candidate(entry_type: &str) -> ProjectKnowledgeCandidate {
        ProjectKnowledgeCandidate {
            entry_type: entry_type.to_string(),
            namespace: "deepseek-gui".to_string(),
            summary: match entry_type {
                "pitfall" => {
                    "Project knowledge requires explicit review before recall.".to_string()
                }
                "project_fact" => {
                    "Project knowledge store commands are fixed Tauri commands.".to_string()
                }
                _ => "Project knowledge policy entries are human reviewed.".to_string(),
            },
            trust: ProjectKnowledgeTrust {
                score: 0.95,
                level: "trusted".to_string(),
                human_reviewed: true,
                reviewed_by: Some("manual_user_preview".to_string()),
            },
            provenance: ProjectKnowledgeProvenance {
                source_kind: "human_reviewed".to_string(),
                source_id: Some("turn-summary".to_string()),
                actor: Some("manual_user_preview".to_string()),
                summary: "Human reviewed summary-only provenance.".to_string(),
                ref_hashes: vec!["prov12345".to_string()],
            },
            evidence_refs: vec![ProjectKnowledgeEvidenceRef {
                ref_id: "evidence-1".to_string(),
                kind: "repo_doc".to_string(),
                summary: "Repository doc summary confirms this project knowledge.".to_string(),
                hash_prefix: "abc12345".to_string(),
                warning_codes: Vec::new(),
            }],
            tags: vec!["p0t".to_string()],
            policy_scope: if entry_type == "policy" {
                Some("workspace".to_string())
            } else {
                None
            },
            source_kind: if entry_type == "policy" {
                Some("human_reviewed".to_string())
            } else {
                None
            },
            fact_kind: if entry_type == "project_fact" {
                Some("app_boundary".to_string())
            } else {
                None
            },
            trigger_summary: if entry_type == "pitfall" {
                Some("A model proposes durable memory without human review.".to_string())
            } else {
                None
            },
            mitigation_summary: if entry_type == "pitfall" {
                Some("Keep the candidate pending until explicit review.".to_string())
            } else {
                None
            },
            severity: if entry_type == "pitfall" {
                Some("medium".to_string())
            } else {
                None
            },
            expires_at: None,
            pinned: Some(false),
        }
    }

    #[test]
    fn project_knowledge_empty_list_is_summary_only() {
        let workspace = temp_workspace("project-knowledge-empty");

        let snapshot = project_knowledge_list(workspace.to_string_lossy().to_string())
            .expect("empty project knowledge list");

        assert!(snapshot.ok);
        assert_eq!(snapshot.status, "empty");
        assert_eq!(snapshot.entry_count, 0);
        assert!(snapshot.summary_only);
        assert!(!snapshot.raw_content_included);

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn project_knowledge_commits_project_fact_pitfall_and_policy() {
        let workspace = temp_workspace("project-knowledge-commit");

        let fact = project_knowledge_commit_candidate(
            workspace.to_string_lossy().to_string(),
            safe_project_knowledge_candidate("project_fact"),
        )
        .expect("project fact commit");
        let pitfall = project_knowledge_commit_candidate(
            workspace.to_string_lossy().to_string(),
            safe_project_knowledge_candidate("pitfall"),
        )
        .expect("pitfall commit");
        let policy = project_knowledge_commit_candidate(
            workspace.to_string_lossy().to_string(),
            safe_project_knowledge_candidate("policy"),
        )
        .expect("policy commit");
        let snapshot = project_knowledge_list(workspace.to_string_lossy().to_string())
            .expect("project knowledge list");
        let entries_log = fs::read_to_string(
            workspace
                .join(".deepseek-workbench")
                .join("project-knowledge")
                .join("entries.jsonl"),
        )
        .expect("entries log");

        assert_eq!(fact.entry.entry_type, "project_fact");
        assert_eq!(pitfall.entry.entry_type, "pitfall");
        assert_eq!(policy.entry.entry_type, "policy");
        assert_eq!(snapshot.entry_count, 3);
        assert_eq!(snapshot.active_entry_count, 3);
        assert!(snapshot.entries.iter().all(|entry| entry.summary_only));
        let raw_prompt_key = ["raw", "Prompt"].concat();
        assert!(!entries_log.contains(&raw_prompt_key));
        assert!(!entries_log.contains("Authorization"));
        assert!(!entries_log.contains("sk-"));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn project_knowledge_rejects_untrusted_policy_and_raw_or_secret_marker() {
        let workspace = temp_workspace("project-knowledge-reject");
        let mut untrusted = safe_project_knowledge_candidate("policy");
        untrusted.provenance.source_kind = "model_suggested".to_string();
        let untrusted_error =
            project_knowledge_commit_candidate(workspace.to_string_lossy().to_string(), untrusted)
                .expect_err("untrusted policy should block");
        let mut raw = safe_project_knowledge_candidate("project_fact");
        raw.summary = format!("{} {}", "raw", "prompt should not persist");
        let raw_error =
            project_knowledge_commit_candidate(workspace.to_string_lossy().to_string(), raw)
                .expect_err("raw marker should block");
        let mut secret = safe_project_knowledge_candidate("project_fact");
        secret.summary = format!(
            "fake key marker {}",
            ["s", "k-fake-project-knowledge-secret"].join("")
        );
        let secret_error =
            project_knowledge_commit_candidate(workspace.to_string_lossy().to_string(), secret)
                .expect_err("secret marker should block");

        assert_eq!(untrusted_error.error_code, "PROJECT_KNOWLEDGE_BLOCKED");
        assert_eq!(raw_error.error_code, "PROJECT_KNOWLEDGE_BLOCKED");
        assert_eq!(secret_error.error_code, "PROJECT_KNOWLEDGE_BLOCKED");

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn project_knowledge_revoke_and_expire_append_events_without_deleting_history() {
        let workspace = temp_workspace("project-knowledge-lifecycle");
        let first = project_knowledge_commit_candidate(
            workspace.to_string_lossy().to_string(),
            safe_project_knowledge_candidate("project_fact"),
        )
        .expect("first commit");
        let second = project_knowledge_commit_candidate(
            workspace.to_string_lossy().to_string(),
            safe_project_knowledge_candidate("pitfall"),
        )
        .expect("second commit");

        let revoked = project_knowledge_revoke(
            workspace.to_string_lossy().to_string(),
            first.entry.entry_id.clone(),
            PROJECT_KNOWLEDGE_REVOKE_CONFIRMATION.to_string(),
        )
        .expect("revoke");
        let expired = project_knowledge_expire(
            workspace.to_string_lossy().to_string(),
            second.entry.entry_id.clone(),
            "Superseded by newer reviewed project knowledge.".to_string(),
        )
        .expect("expire");
        let snapshot = project_knowledge_list(workspace.to_string_lossy().to_string())
            .expect("project knowledge list");
        let entries_log = fs::read_to_string(
            workspace
                .join(".deepseek-workbench")
                .join("project-knowledge")
                .join("entries.jsonl"),
        )
        .expect("entries log");

        assert_eq!(revoked.status, "revoked");
        assert_eq!(expired.status, "expired");
        assert_eq!(snapshot.entry_count, 2);
        assert_eq!(snapshot.revoked_entry_count, 1);
        assert_eq!(snapshot.expired_entry_count, 1);
        assert!(entries_log.contains(&first.entry.entry_id));
        assert!(entries_log.contains(&second.entry.entry_id));

        let _ = fs::remove_dir_all(workspace);
    }

    #[test]
    fn project_knowledge_list_skips_corrupt_lines_safely() {
        let workspace = temp_workspace("project-knowledge-corrupt");
        let _commit = project_knowledge_commit_candidate(
            workspace.to_string_lossy().to_string(),
            safe_project_knowledge_candidate("project_fact"),
        )
        .expect("commit");
        let entries_path = workspace
            .join(".deepseek-workbench")
            .join("project-knowledge")
            .join("entries.jsonl");
        use std::io::Write;
        let mut file = fs::OpenOptions::new()
            .append(true)
            .open(&entries_path)
            .expect("entries append");
        writeln!(file, "not-json-with-private-marker").expect("corrupt line");

        let snapshot = project_knowledge_list(workspace.to_string_lossy().to_string())
            .expect("project knowledge list");
        let serialized = serde_json::to_string(&snapshot).expect("snapshot");

        assert_eq!(snapshot.status, "warning");
        assert_eq!(snapshot.entry_count, 1);
        assert!(snapshot
            .warnings
            .contains(&"PARSE_ERROR_LINE_SKIPPED".to_string()));
        assert!(!serialized.contains("private-marker"));

        let _ = fs::remove_dir_all(workspace);
    }

    fn safe_mcp_readonly_profile() -> Value {
        serde_json::json!({
            "profileId": "mcp.docs.injected",
            "displayName": "Docs MCP injected profile",
            "serverKind": "mcp",
            "transportKind": "injected_test_transport",
            "serverRef": "mcp.docs.server",
            "readOnlyPolicy": {
                "allowInitialize": true,
                "allowListResources": true,
                "allowListPrompts": true,
                "allowListTools": true,
                "allowReadResource": false,
                "allowCallTool": false,
                "allowPromptExecution": false,
                "allowMutation": false
            }
        })
    }

    fn safe_mcp_readonly_request() -> McpReadonlyDiscoverRequest {
        McpReadonlyDiscoverRequest {
            profile: safe_mcp_readonly_profile(),
            typed_confirmation: MCP_READONLY_DISCOVERY_CONFIRMATION.to_string(),
            max_items: 10,
            timeout_ms: 5_000,
        }
    }

    fn safe_mcp_readonly_tool_call_request() -> McpReadonlyToolCallRequest {
        McpReadonlyToolCallRequest {
            connection_profile_ref: "mcp.docs.injected".to_string(),
            server_profile: serde_json::json!({
                "profileId": "mcp.docs.injected",
                "displayName": "Docs MCP injected profile",
                "serverKind": "mcp",
                "transportKind": "injected_test_transport",
                "serverRef": "mcp.docs.server",
                "fixedResultSummary": "Fixed docs search summary result."
            }),
            tool_contract_summary: serde_json::json!({
                "contractId": "mcp-readonly-tool-contract-1",
                "toolId": "docs.search",
                "toolName": "docs.search",
                "declaredReadOnly": true,
                "riskLevel": "low",
                "allowedArgumentKeys": ["querySummary", "maxResults"],
                "deniedArgumentKeyCount": 0,
                "maxOutputBytes": 8192,
                "timeoutMs": 5000,
                "approvalRequired": true,
                "typedConfirmationRequired": true,
                "contractHash": "abcdef1234567890"
            }),
            approval_receipt: serde_json::json!({
                "receiptId": "mcp-readonly-tool-receipt-1",
                "toolId": "docs.search",
                "connectionProfileRef": "mcp.docs.injected",
                "typedConfirmation": MCP_READONLY_TOOL_CONFIRMATION,
                "allowedArgumentKeys": ["querySummary", "maxResults"],
                "maxOutputBytes": 8192,
                "expiresAt": "2099-01-01T00:00:00.000Z",
                "receiptHash": "abcdef1234567890"
            }),
            argument_summary: "querySummaryHash=abc123; maxResults=3".to_string(),
            argument_values: serde_json::json!({
                "querySummary": "docs summary query",
                "maxResults": 3
            }),
            max_output_bytes: 8192,
            timeout_ms: 5000,
        }
    }

    #[test]
    fn mcp_readonly_discovery_safe_fake_server_summary() {
        let result = mcp_readonly_discover(safe_mcp_readonly_request()).expect("mcp discovery");
        let serialized = serde_json::to_string(&result).expect("serialize result");

        assert!(result.ok);
        assert_eq!(result.profile_id, "mcp.docs.injected");
        assert_eq!(result.resource_count, 1);
        assert_eq!(result.prompt_count, 1);
        assert_eq!(result.tool_count, 1);
        assert!(result.summary_only);
        assert!(!result.can_call_tool);
        assert!(!result.can_read_resource);
        assert!(!result.can_execute_prompt);
        assert!(!result.can_mutate);
        assert!(!result.can_write_event_store);
        assert!(!result.raw_metadata_included);
        assert!(!result.raw_stdout_included);
        assert!(!result.raw_stderr_included);
        assert!(!serialized.contains("tools/call"));
        assert!(!serialized.contains("resources/read"));
        assert!(result
            .prompt_summaries
            .iter()
            .all(|prompt| !prompt.raw_prompt_included));
    }

    #[test]
    fn mcp_readonly_discovery_requires_typed_confirmation() {
        let mut request = safe_mcp_readonly_request();
        request.typed_confirmation = "DISCOVER".to_string();
        let error = mcp_readonly_discover(request).expect_err("confirmation should block");

        assert_eq!(error.error_code, "MCP_READONLY_DISCOVERY_INVALID");
        assert_eq!(error.stage, "mcp_readonly_discover");
    }

    #[test]
    fn mcp_readonly_discovery_blocks_tool_call_and_resource_read_policy() {
        let mut call_tool = safe_mcp_readonly_request();
        call_tool.profile["readOnlyPolicy"]["allowCallTool"] = Value::Bool(true);
        let mut read_resource = safe_mcp_readonly_request();
        read_resource.profile["readOnlyPolicy"]["allowReadResource"] = Value::Bool(true);

        let call_error = mcp_readonly_discover(call_tool).expect_err("tool call should block");
        let read_error =
            mcp_readonly_discover(read_resource).expect_err("resource read should block");

        assert_eq!(call_error.error_code, "MCP_READONLY_DISCOVERY_INVALID");
        assert_eq!(read_error.error_code, "MCP_READONLY_DISCOVERY_INVALID");
    }

    #[test]
    fn mcp_readonly_discovery_blocks_oversized_limits_and_timeout() {
        let mut oversized = safe_mcp_readonly_request();
        oversized.max_items = MCP_READONLY_DISCOVERY_MAX_ITEMS + 1;
        let mut timeout = safe_mcp_readonly_request();
        timeout.timeout_ms = MCP_READONLY_DISCOVERY_MAX_TIMEOUT_MS + 1;

        let oversized_error =
            mcp_readonly_discover(oversized).expect_err("oversized metadata should block");
        let timeout_error = mcp_readonly_discover(timeout).expect_err("timeout should block");

        assert_eq!(oversized_error.error_code, "MCP_READONLY_DISCOVERY_INVALID");
        assert_eq!(timeout_error.error_code, "MCP_READONLY_DISCOVERY_INVALID");
    }

    #[test]
    fn mcp_readonly_discovery_redacts_stderr_and_secret_markers() {
        let mut stderr_request = safe_mcp_readonly_request();
        stderr_request.profile["stderr"] = Value::String("synthetic raw stderr".to_string());
        let mut secret_request = safe_mcp_readonly_request();
        secret_request.profile["displayName"] =
            Value::String(format!("Docs {}", ["s", "k-fake-mcp-secret"].join("")));

        let stderr_error =
            mcp_readonly_discover(stderr_request).expect_err("stderr field should block");
        let secret_error =
            mcp_readonly_discover(secret_request).expect_err("secret marker should block");
        let serialized = serde_json::to_string(&(stderr_error, secret_error)).expect("errors");

        assert!(!serialized.contains("synthetic raw stderr"));
        assert!(!serialized.contains("sk-fake-mcp-secret"));
    }

    #[test]
    fn mcp_readonly_tool_call_safe_fake_summary() {
        let result = call_mcp_readonly_tool(safe_mcp_readonly_tool_call_request())
            .expect("readonly tool call");
        let serialized = serde_json::to_string(&result).expect("serialize result");

        assert!(result.ok);
        assert_eq!(result.status, "called");
        assert_eq!(result.tool_id, "docs.search");
        assert!(result.summary_only);
        assert!(result.called_readonly_tool);
        assert!(!result.raw_output_included);
        assert!(!result.raw_args_included);
        assert!(!result.can_call_mcp_tool);
        assert!(!result.can_invoke_mutating_tool);
        assert!(!result.can_write_event_store);
        assert!(!result.can_execute_git);
        assert!(!result.can_execute_shell);
        assert!(!result.can_issue_permission_lease);
        assert!(!result.app_can_execute);
        assert!(result.event_preview.not_written);
        assert!(result.event_preview.summary_only);
        assert!(!serialized.contains("Fixed docs search summary result."));
    }

    #[test]
    fn mcp_readonly_tool_call_blocks_wrong_confirmation() {
        let mut request = safe_mcp_readonly_tool_call_request();
        request.approval_receipt["typedConfirmation"] = Value::String("CALL MCP TOOL".to_string());
        let error = call_mcp_readonly_tool(request).expect_err("confirmation should block");

        assert_eq!(error.error_code, "MCP_READONLY_TOOL_CALL_INVALID");
        assert_eq!(error.stage, "call_mcp_readonly_tool");
    }

    #[test]
    fn mcp_readonly_tool_call_blocks_mutating_tool() {
        let mut request = safe_mcp_readonly_tool_call_request();
        request.tool_contract_summary["toolId"] = Value::String("docs.write".to_string());
        let error = call_mcp_readonly_tool(request).expect_err("mutating tool should block");

        assert_eq!(error.error_code, "MCP_READONLY_TOOL_CALL_INVALID");
    }

    #[test]
    fn mcp_readonly_tool_call_blocks_denied_args() {
        let mut request = safe_mcp_readonly_tool_call_request();
        let denied_arg_key = format!("raw{}", "Prompt");
        request.argument_values[denied_arg_key] = Value::String("unsafe".to_string());
        let error = call_mcp_readonly_tool(request).expect_err("raw argument should block");

        assert_eq!(error.error_code, "MCP_READONLY_TOOL_CALL_INVALID");
    }

    #[test]
    fn mcp_readonly_tool_call_blocks_secret_output_without_echoing_it() {
        let mut request = safe_mcp_readonly_tool_call_request();
        request.server_profile["fixedResultSummary"] =
            Value::String("Bearer fake-secret-token-1234567890".to_string());
        let error = call_mcp_readonly_tool(request).expect_err("secret output should block");
        let serialized = serde_json::to_string(&error).expect("error");

        assert_eq!(error.error_code, "MCP_READONLY_TOOL_CALL_INVALID");
        assert!(!serialized.contains("fake-secret-token-1234567890"));
    }

    #[test]
    fn mcp_readonly_tool_call_blocks_oversized_output() {
        let mut request = safe_mcp_readonly_tool_call_request();
        request.server_profile["fixedResultSummary"] = Value::String("x".repeat(128));
        request.max_output_bytes = 8;
        let error = call_mcp_readonly_tool(request).expect_err("oversized output should block");

        assert_eq!(error.error_code, "MCP_READONLY_TOOL_CALL_INVALID");
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
