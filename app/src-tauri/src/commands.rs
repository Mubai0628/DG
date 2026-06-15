use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const MAX_PAYLOAD_BYTES: usize = 2_000_000;
const MAX_RUNNER_STDOUT_BYTES: usize = 65_536;
const RUNNER_TIMEOUT: Duration = Duration::from_secs(60);

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
    let workspace_root = validate_workspace_root(&workspace_root)?;
    validate_payload_size(&payload_json)?;
    if let Some(name) = filename.as_deref() {
        validate_filename(name)?;
    }

    let payload: Value = serde_json::from_str(&payload_json)
        .map_err(|_| "Payload JSON is not valid JSON".to_string())?;
    validate_payload_shape(&payload)?;

    let repo_root = repo_root()?;
    let payload_path = write_temp_payload(&payload)?;
    let runner_path = app_runner_path(&repo_root)?;

    let result = (|| {
        let build_args = vec![
            "--filter".to_string(),
            "@deepseek-workbench/runtime".to_string(),
            "build".to_string(),
        ];
        run_fixed_command(pnpm_command(), &build_args, &repo_root)?;

        let mut args = vec![
            runner_path.to_string_lossy().to_string(),
            "--workspace".to_string(),
            workspace_root.to_string_lossy().to_string(),
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
        validate_runner_stdout(&output)?;
        serde_json::from_str::<DesktopFlowResult>(&output)
            .map_err(|_| "Desktop flow returned an invalid summary".to_string())
    })();

    let _ = fs::remove_file(payload_path);
    result
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

fn run_fixed_command<S>(program: S, args: &[String], cwd: &Path) -> Result<String, String>
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
) -> Result<String, String>
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
        .map_err(|_| "Desktop flow command could not start".to_string())?;

    let started_at = Instant::now();
    loop {
        if started_at.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err("Desktop flow timed out".to_string());
        }
        if child
            .try_wait()
            .map_err(|_| "Desktop flow command status could not be read".to_string())?
            .is_some()
        {
            break;
        }
        thread::sleep(Duration::from_millis(50));
    }

    let output = child
        .wait_with_output()
        .map_err(|_| "Desktop flow command output could not be read".to_string())?;

    if !output.status.success() {
        return Err(safe_command_error(output.status.code(), &output.stderr));
    }

    let stdout = String::from_utf8(output.stdout)
        .map_err(|_| "Desktop flow output is not UTF-8".to_string())?;
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

fn validate_runner_stdout(stdout: &str) -> Result<(), String> {
    if stdout.as_bytes().len() > MAX_RUNNER_STDOUT_BYTES {
        return Err("Desktop flow returned too much output".to_string());
    }
    Ok(())
}

fn safe_command_error(exit_code: Option<i32>, _stderr: &[u8]) -> String {
    match exit_code {
        Some(code) => format!("Desktop flow failed with exit code {code}"),
        None => "Desktop flow failed".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
            format!("payload {{\"secret\":\"{secret}\"}}").as_bytes(),
        );

        assert_eq!(error, "Desktop flow failed with exit code 1");
        assert!(!error.contains(secret));
        assert!(!error.contains("payload"));
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
    fn timeout_returns_safe_error() {
        let root = repo_root().expect("repo root");
        let args = vec!["-e".to_string(), "setTimeout(() => {}, 3000);".to_string()];
        let error =
            run_fixed_command_with_timeout(node_command(), &args, &root, Duration::from_millis(50))
                .expect_err("timeout should fail safely");

        assert_eq!(error, "Desktop flow timed out");
    }
}
