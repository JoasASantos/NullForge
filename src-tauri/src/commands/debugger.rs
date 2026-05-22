use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

pub struct DebuggerSession {
    pub child: CommandChild,
    pub binary: String,
}

pub struct DebuggerSessions(pub Mutex<HashMap<String, DebuggerSession>>);

#[tauri::command]
pub async fn debugger_start(
    app: AppHandle,
    session_id: String,
    binary_path: String,
    args: Vec<String>,
) -> Result<(), String> {
    // Spawn GDB with MI2 interpreter
    let (mut rx, mut child) = app
        .shell()
        .command("gdb")
        .args(["--interpreter=mi2", "--quiet", &binary_path])
        .spawn()
        .map_err(|e| e.to_string())?;

    // Send target exec + argument setup commands
    let args_str = args.join(" ");
    let init_cmds = if args_str.is_empty() {
        format!("-exec-arguments\n")
    } else {
        format!("-exec-arguments {args_str}\n")
    };
    child
        .write(init_cmds.as_bytes())
        .map_err(|e| e.to_string())?;

    // Store session
    let state: State<DebuggerSessions> = app.state();
    state.0.lock().unwrap().insert(
        session_id.clone(),
        DebuggerSession {
            child,
            binary: binary_path.clone(),
        },
    );

    // Spawn async reader for MI output
    let app_clone = app.clone();
    let sid = session_id.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            use tauri_plugin_shell::process::CommandEvent;
            match event {
                CommandEvent::Stdout(data) => {
                    let line = String::from_utf8_lossy(&data).to_string();
                    let _ = app_clone
                        .emit(&format!("debugger-output-{sid}"), line);
                }
                CommandEvent::Stderr(data) => {
                    let line = String::from_utf8_lossy(&data).to_string();
                    // Prefix stderr so UI can distinguish
                    let _ = app_clone
                        .emit(&format!("debugger-output-{sid}"), format!("&\"{line}\""));
                }
                CommandEvent::Terminated(status) => {
                    let code = status.code.unwrap_or(-1);
                    let _ = app_clone.emit(
                        &format!("debugger-output-{sid}"),
                        format!("*terminated,exit-code=\"{code}\""),
                    );
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn debugger_send_command(
    app: AppHandle,
    session_id: String,
    command: String,
) -> Result<(), String> {
    let state: State<DebuggerSessions> = app.state();
    let mut sessions = state.0.lock().unwrap();
    if let Some(session) = sessions.get_mut(&session_id) {
        let cmd = if command.ends_with('\n') {
            command
        } else {
            format!("{command}\n")
        };
        session
            .child
            .write(cmd.as_bytes())
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Debugger session '{}' not found", session_id))
    }
}

#[tauri::command]
pub async fn debugger_stop(app: AppHandle, session_id: String) -> Result<(), String> {
    let state: State<DebuggerSessions> = app.state();
    let mut sessions = state.0.lock().unwrap();
    if let Some(session) = sessions.remove(&session_id) {
        session.child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
