mod command_broker_classifier;
mod commands;
mod path_sensitivity;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::check_runner_preflight,
            commands::get_app_version,
            commands::apply_approved_user_workspace_patch,
            commands::rollback_approved_user_workspace_patch,
            commands::run_git_read_lane,
            commands::run_shell_verification_lane,
            commands::execute_command_broker_request,
            commands::read_workspace_file,
            commands::read_workspace_settings,
            commands::write_workspace_settings,
            commands::issue_permission_lease,
            commands::list_permission_leases,
            commands::revoke_permission_lease,
            commands::chat_deepseek_completion,
            commands::mcp_readonly_discover,
            commands::call_mcp_readonly_tool,
            commands::load_workspace_event_summary,
            commands::record_approved_user_workspace_execution_event,
            commands::record_control_run_draft_event,
            commands::record_verification_lane_event,
            commands::record_live_proposal_summary_event,
            commands::write_transcript_record,
            commands::list_transcript_records,
            commands::read_transcript_record_summary,
            commands::delete_transcript_record,
            commands::export_transcript_summary,
            commands::generate_live_deepseek_patch_proposal,
            commands::project_knowledge_list,
            commands::project_knowledge_commit_candidate,
            commands::project_knowledge_revoke,
            commands::project_knowledge_expire,
            commands::observe_desktop_metadata,
            commands::execute_approved_desktop_action,
            commands::execute_approved_expanded_desktop_action,
            commands::run_web_table_to_csv_flow
        ])
        .run(tauri::generate_context!())
        .expect("failed to run DeepSeek Workbench desktop shell");
}
