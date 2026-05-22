use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

pub struct PtySession {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

pub struct ShellSessions(pub Mutex<HashMap<String, PtySession>>);

#[tauri::command]
pub async fn spawn_shell(
    app: AppHandle,
    session_id: String,
    shell: Option<String>,
) -> Result<(), String> {
    let pty_system = portable_pty::native_pty_system();
    let pair = pty_system
        .openpty(portable_pty::PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let shell_bin = shell.unwrap_or_else(|| {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    });

    let mut cmd = portable_pty::CommandBuilder::new(&shell_bin);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    let _child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    let state: State<ShellSessions> = app.state();
    state.0.lock().unwrap().insert(
        session_id.clone(),
        PtySession {
            master: pair.master,
            writer,
        },
    );

    // Stream PTY output to the frontend
    let app_clone = app.clone();
    let sid = session_id.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => {
                    let _ = app_clone.emit(&format!("shell-exit-{sid}"), 0i32);
                    break;
                }
                Ok(n) => {
                    let text = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit(&format!("shell-output-{sid}"), text);
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn write_to_shell(
    app: AppHandle,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let state: State<ShellSessions> = app.state();
    let mut sessions = state.0.lock().unwrap();
    if let Some(sess) = sessions.get_mut(&session_id) {
        sess.writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
    } else {
        return Err(format!("Session {} not found", session_id));
    }
    Ok(())
}

#[tauri::command]
pub async fn resize_shell(
    app: AppHandle,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let state: State<ShellSessions> = app.state();
    let mut sessions = state.0.lock().unwrap();
    if let Some(sess) = sessions.get_mut(&session_id) {
        sess.master
            .resize(portable_pty::PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn kill_shell(app: AppHandle, session_id: String) -> Result<(), String> {
    let state: State<ShellSessions> = app.state();
    let mut sessions = state.0.lock().unwrap();
    sessions.remove(&session_id);
    Ok(())
}

#[tauri::command]
pub async fn shell_run_command(command: String) -> Result<String, String> {
    let output = std::process::Command::new("/bin/sh")
        .arg("-c")
        .arg(&command)
        .output()
        .map_err(|e| format!("Failed to spawn: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        let combined = if stderr.is_empty() { stdout } else { format!("{}\n{}", stdout, stderr) };
        return Err(combined.trim().to_string());
    }

    Ok(stdout.trim().to_string())
}
