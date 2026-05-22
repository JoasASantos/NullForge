use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;

// ── Manifest types ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginCommand {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginPanel {
    pub id: String,
    pub title: String,
    pub location: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginContributes {
    #[serde(default)]
    pub commands: Vec<PluginCommand>,
    #[serde(default)]
    pub panels: Vec<PluginPanel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub id: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub icon: Option<String>,
    pub license: Option<String>,
    pub repository: Option<String>,
    pub homepage: Option<String>,
    #[serde(default)]
    pub permissions: Vec<String>,
    #[serde(default)]
    pub contributes: PluginContributes,
    /// Deprecated: top-level enabled flag in the manifest (ignored in favour of prefs)
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginState {
    pub manifest: PluginManifest,
    pub enabled: bool,
    pub installed: bool,
    pub has_update: bool,
    pub plugin_dir: String,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Return the path to the user's plugin preferences JSON file.
/// File contains a `HashMap<String, bool>` (plugin_id → enabled).
fn prefs_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create app_data_dir: {e}"))?;
    Ok(dir.join("plugin_prefs.json"))
}

/// Read the prefs file. Returns an empty map if the file doesn't exist yet.
fn read_prefs(app: &AppHandle) -> Result<HashMap<String, bool>, String> {
    let path = prefs_path(app)?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| format!("read prefs: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("parse prefs: {e}"))
}

/// Write the prefs map back to disk.
fn write_prefs(app: &AppHandle, prefs: &HashMap<String, bool>) -> Result<(), String> {
    let path = prefs_path(app)?;
    let raw = serde_json::to_string_pretty(prefs).map_err(|e| format!("serialize prefs: {e}"))?;
    std::fs::write(&path, raw).map_err(|e| format!("write prefs: {e}"))
}

/// Collect plugin search directories: resource dir + app data dir (user-installed plugins).
fn plugin_search_dirs(app: &AppHandle) -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = Vec::new();

    if let Ok(res_dir) = app.path().resource_dir() {
        dirs.push(res_dir.join("plugins"));
    }
    if let Ok(data_dir) = app.path().app_data_dir() {
        dirs.push(data_dir.join("plugins"));
    }

    dirs
}

/// Parse a single plugin directory and return a `PluginState`, or `None` if no
/// valid `plugin.yml` is found.
fn load_plugin_from_dir(
    dir: &PathBuf,
    prefs: &HashMap<String, bool>,
) -> Option<PluginState> {
    let manifest_path = dir.join("plugin.yml");
    if !manifest_path.exists() {
        return None;
    }

    let raw = std::fs::read_to_string(&manifest_path).ok()?;
    let manifest: PluginManifest = serde_yaml::from_str(&raw).ok()?;

    // Enabled: prefs file takes precedence, then manifest default (true if absent)
    let enabled = *prefs
        .get(&manifest.id)
        .unwrap_or(&manifest.enabled.unwrap_or(true));

    Some(PluginState {
        enabled,
        installed: true,
        has_update: false,
        plugin_dir: dir.to_string_lossy().into_owned(),
        manifest,
    })
}

// ── Commands ──────────────────────────────────────────────────────────────────

/// List all installed plugins discovered from the plugins search paths.
#[tauri::command]
pub async fn plugins_list(app: AppHandle) -> Result<Vec<PluginState>, String> {
    let prefs = read_prefs(&app).unwrap_or_default();
    let search_dirs = plugin_search_dirs(&app);

    let mut plugins: Vec<PluginState> = Vec::new();
    // Track IDs to avoid duplicates if a plugin appears in both dirs.
    let mut seen_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

    for base_dir in &search_dirs {
        if !base_dir.exists() {
            continue;
        }

        // Walk one level deep — each immediate subdirectory is a candidate plugin dir.
        for entry in WalkDir::new(base_dir)
            .min_depth(1)
            .max_depth(1)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_dir())
        {
            let dir_path = entry.path().to_path_buf();
            if let Some(state) = load_plugin_from_dir(&dir_path, &prefs) {
                if seen_ids.insert(state.manifest.id.clone()) {
                    plugins.push(state);
                }
            }
        }
    }

    // Sort by plugin name for stable ordering.
    plugins.sort_by(|a, b| a.manifest.name.cmp(&b.manifest.name));

    Ok(plugins)
}

/// Enable or disable a plugin by ID. Persists the preference to disk.
#[tauri::command]
pub async fn plugin_set_enabled(
    app: AppHandle,
    plugin_id: String,
    enabled: bool,
) -> Result<(), String> {
    let mut prefs = read_prefs(&app).unwrap_or_default();
    prefs.insert(plugin_id, enabled);
    write_prefs(&app, &prefs)
}

/// Find and return the manifest for a given plugin ID.
#[tauri::command]
pub async fn plugin_get_manifest(
    app: AppHandle,
    plugin_id: String,
) -> Result<PluginManifest, String> {
    let prefs = read_prefs(&app).unwrap_or_default();
    let search_dirs = plugin_search_dirs(&app);

    for base_dir in &search_dirs {
        if !base_dir.exists() {
            continue;
        }
        for entry in WalkDir::new(base_dir)
            .min_depth(1)
            .max_depth(1)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_dir())
        {
            let dir_path = entry.path().to_path_buf();
            if let Some(state) = load_plugin_from_dir(&dir_path, &prefs) {
                if state.manifest.id == plugin_id {
                    return Ok(state.manifest);
                }
            }
        }
    }

    Err(format!("Plugin '{plugin_id}' not found"))
}
