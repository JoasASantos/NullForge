use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub font_size: u32,
    pub tab_size: u32,
    pub ai_provider: String,
    pub show_minimap: bool,
    pub auto_save: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "nullforge-dark".to_string(),
            font_size: 13,
            tab_size: 4,
            ai_provider: "claude".to_string(),
            show_minimap: true,
            auto_save: false,
        }
    }
}

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("settings.json");
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("settings.json");
    let text = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, text).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_app_info() -> serde_json::Value {
    serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "author": "Joas A Santos",
        "organization": "Null Forge",
        "license": "MIT",
    })
}

#[tauri::command]
pub async fn save_text_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("mkdir: {e}"))?;
    }
    std::fs::write(&path, content).map_err(|e| format!("write: {e}"))
}

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("read: {e}"))
}

#[tauri::command]
pub async fn show_save_dialog(default_name: String) -> Result<Option<String>, String> {
    // Return a default path in the user's home directory
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    Ok(Some(format!("{}/{}", home, default_name)))
}
