mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::check_runner_preflight,
            commands::get_app_version,
            commands::load_workspace_event_summary,
            commands::record_control_run_draft_event,
            commands::run_web_table_to_csv_flow
        ])
        .run(tauri::generate_context!())
        .expect("failed to run DeepSeek Workbench desktop shell");
}
