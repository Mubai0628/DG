use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopFlowResult {
    draft: DraftSummary,
    extraction: ExtractionSummary,
    events: EventSummary,
    replay_summary: ReplaySummary,
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
    source_host: String,
    source_path_without_query: String,
    table_id: String,
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
    event_count: u64,
    draft_count: u64,
    tasks: serde_json::Map<String, Value>,
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn run_web_table_to_csv_flow(
    workspace_root: String,
    payload_json: String,
    filename: Option<String>,
    allow_overwrite: Option<bool>,
) -> Result<DesktopFlowResult, String> {
    validate_workspace_root(&workspace_root)?;
    if let Some(name) = filename.as_deref() {
        validate_filename(name)?;
    }

    let payload: Value = serde_json::from_str(&payload_json)
        .map_err(|_| "Payload JSON is not valid JSON".to_string())?;
    validate_payload_shape(&payload)?;

    let repo_root = repo_root()?;
    let payload_path = write_temp_payload(&payload)?;

    let result = (|| {
        let build_args = vec![
            "--filter".to_string(),
            "@deepseek-workbench/runtime".to_string(),
            "build".to_string(),
        ];
        run_fixed_command(pnpm_command(), &build_args, &repo_root)?;

        let mut args = vec![
            app_runner_path(&repo_root).to_string_lossy().to_string(),
            "--workspace".to_string(),
            workspace_root,
            "--payload".to_string(),
            payload_path.to_string_lossy().to_string(),
        ];
        if let Some(name) = filename {
            args.push("--filename".to_string());
            args.push(name);
        }
        if allow_overwrite.unwrap_or(false) {
            args.push("--allow-overwrite".to_string());
        }

        let output = run_fixed_command(node_command(), &args, &repo_root)?;
        serde_json::from_str::<DesktopFlowResult>(&output)
            .map_err(|_| "Desktop flow returned an invalid summary".to_string())
    })();

    let _ = fs::remove_file(payload_path);
    result
}

fn validate_workspace_root(workspace_root: &str) -> Result<(), String> {
    if workspace_root.trim().is_empty() {
        return Err("Workspace root is required".to_string());
    }
    if !Path::new(workspace_root).is_dir() {
        return Err("Workspace root must exist and be a directory".to_string());
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
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .map(Path::to_path_buf)
        .ok_or_else(|| "Cannot resolve repository root".to_string())
}

fn app_runner_path(repo_root: &Path) -> PathBuf {
    repo_root.join("app").join("scripts").join("run-flow.mjs")
}

fn write_temp_payload(payload: &Value) -> Result<PathBuf, String> {
    let temp_dir = std::env::temp_dir().join("deepseek-workbench-desktop");
    fs::create_dir_all(&temp_dir).map_err(|_| "Cannot create temp payload directory".to_string())?;
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "Cannot create temp payload path".to_string())?
        .as_millis();
    let payload_path = temp_dir.join(format!("payload-{}-{}.json", std::process::id(), millis));
    fs::write(
        &payload_path,
        serde_json::to_string(payload).map_err(|_| "Cannot serialize payload".to_string())?,
    )
    .map_err(|_| "Cannot write temp payload".to_string())?;
    Ok(payload_path)
}

fn run_fixed_command<S>(program: S, args: &[String], cwd: &Path) -> Result<String, String>
where
    S: AsRef<OsStr>,
{
    let output = Command::new(program)
        .args(args)
        .current_dir(cwd)
        .env_remove(env_key(&["DEEPSEEK", "API", "KEY"]))
        .env_remove(env_key(&["OPENAI", "API", "KEY"]))
        .output()
        .map_err(|_| "Desktop flow command could not start".to_string())?;

    if !output.status.success() {
        return Err(safe_command_error(&output.stderr));
    }

    String::from_utf8(output.stdout).map_err(|_| "Desktop flow output is not UTF-8".to_string())
}

fn env_key(parts: &[&str]) -> String {
    parts.join("_")
}

fn pnpm_command() -> &'static str {
    if cfg!(windows) {
        "pnpm.cmd"
    } else {
        "pnpm"
    }
}

fn node_command() -> &'static str {
    if cfg!(windows) {
        "node.exe"
    } else {
        "node"
    }
}

fn safe_command_error(stderr: &[u8]) -> String {
    let message = String::from_utf8_lossy(stderr);
    let trimmed = message.trim();
    if trimmed.contains("Bearer ") || trimmed.contains("sk-") || trimmed.contains("Authorization") {
        return "Desktop flow failed with a redacted error".to_string();
    }
    if trimmed.is_empty() {
        return "Desktop flow failed".to_string();
    }
    trimmed.chars().take(400).collect()
}
