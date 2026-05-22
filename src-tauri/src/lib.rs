mod commands;
mod db;

use commands::debugger::DebuggerSessions;
use commands::shell::ShellSessions;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(ShellSessions(Mutex::new(HashMap::new())))
        .manage(DebuggerSessions(Mutex::new(HashMap::new())))
        .setup(|app| {
            if let Err(e) = db::init(app.handle()) {
                eprintln!("[NullForge] DB init failed: {e}");
                // Attempt recovery: delete any corrupt/incompatible DB and retry once
                if let Ok(data_dir) = app.path().app_data_dir() {
                    let db_path = data_dir.join("nullforge.db");
                    if db_path.exists() {
                        let _ = std::fs::remove_file(&db_path);
                        eprintln!("[NullForge] Deleted stale DB, retrying init...");
                    }
                }
                if let Err(e2) = db::init(app.handle()) {
                    eprintln!("[NullForge] DB init retry failed: {e2}");
                    // Continue without DB — commands will return errors gracefully
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Shell
            commands::shell::spawn_shell,
            commands::shell::write_to_shell,
            commands::shell::kill_shell,
            commands::shell::resize_shell,
            commands::shell::shell_run_command,
            // Database
            commands::db::get_projects,
            commands::db::create_project,
            commands::db::get_payloads,
            commands::db::get_exploits,
            commands::db::scan_exploits_dir,
            commands::db::read_exploit_file,
            // AI
            commands::ai::ai_stream_chat,
            commands::ai::save_ai_conversation,
            commands::ai::get_ai_conversations,
            // Debugger
            commands::debugger::debugger_start,
            commands::debugger::debugger_send_command,
            commands::debugger::debugger_stop,
            // Disassembler
            commands::disasm::disasm_load_binary,
            commands::disasm::disasm_range,
            commands::disasm::disasm_function,
            commands::disasm::disasm_shellcode,
            commands::disasm::disasm_find_gadgets,
            // Plugins
            commands::plugins::plugins_list,
            commands::plugins::plugin_set_enabled,
            commands::plugins::plugin_get_manifest,
            // Settings
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::get_app_info,
            commands::settings::save_text_file,
            commands::settings::read_text_file,
            commands::settings::show_save_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NullForge");
}
