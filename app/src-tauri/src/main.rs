mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::check_runner_preflight,
            commands::get_app_version,
            commands::apply_approved_user_workspace_patch,
            commands::rollback_approved_user_workspace_patch,
            commands::run_git_read_lane,
            commands::load_workspace_event_summary,
            commands::record_approved_user_workspace_execution_event,
            commands::record_control_run_draft_event,
            commands::run_web_table_to_csv_flow
        ])
        .run(tauri::generate_context!())
        .expect("failed to run DeepSeek Workbench desktop shell");
}
