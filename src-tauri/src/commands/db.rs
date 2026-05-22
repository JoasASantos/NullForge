use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub target_arch: Option<String>,
    pub target_os: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Payload {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub platform: Option<String>,
    pub arch: Option<String>,
    pub encoding: Option<String>,
    pub tags: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Exploit {
    pub id: String,
    pub cve_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub cvss_score: Option<f64>,
    pub reliability: Option<String>,
    pub tags: Option<String>,
}

fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|d| d.join("nullforge.db"))
        .map_err(|e| format!("app_data_dir failed: {e}"))
}

#[tauri::command]
pub async fn get_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    let path = db_path(&app)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, description, target_arch, target_os, created_at FROM projects ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                target_arch: row.get(3)?,
                target_os: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_project(
    app: AppHandle,
    name: String,
    description: Option<String>,
    target_arch: Option<String>,
    target_os: Option<String>,
) -> Result<String, String> {
    let path = db_path(&app)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO projects (id, name, description, target_arch, target_os) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, name, description, target_arch, target_os],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub async fn get_payloads(
    app: AppHandle,
    category: Option<String>,
    platform: Option<String>,
    arch: Option<String>,
) -> Result<Vec<Payload>, String> {
    let path = db_path(&app)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let mut query = "SELECT id, name, description, category, platform, arch, encoding, tags FROM payloads WHERE 1=1".to_string();
    let mut values: Vec<String> = vec![];
    if let Some(c) = category {
        query.push_str(" AND category = ?");
        values.push(c);
    }
    if let Some(p) = platform {
        query.push_str(" AND platform = ?");
        values.push(p);
    }
    if let Some(a) = arch {
        query.push_str(" AND arch = ?");
        values.push(a);
    }
    query.push_str(" ORDER BY name LIMIT 200");
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Payload {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                category: row.get(3)?,
                platform: row.get(4)?,
                arch: row.get(5)?,
                encoding: row.get(6)?,
                tags: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_exploits(
    app: AppHandle,
    category: Option<String>,
    search: Option<String>,
) -> Result<Vec<Exploit>, String> {
    let path = db_path(&app)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let mut query = "SELECT id, cve_id, title, description, category, cvss_score, reliability, tags FROM exploits WHERE 1=1".to_string();
    let mut values: Vec<String> = vec![];
    if let Some(c) = category {
        query.push_str(" AND category = ?");
        values.push(c);
    }
    if let Some(s) = search {
        query.push_str(" AND (title LIKE ? OR cve_id LIKE ? OR description LIKE ?)");
        let like = format!("%{}%", s);
        values.push(like.clone());
        values.push(like.clone());
        values.push(like);
    }
    query.push_str(" ORDER BY cvss_score DESC LIMIT 200");
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Exploit {
                id: row.get(0)?,
                cve_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                category: row.get(4)?,
                cvss_score: row.get(5)?,
                reliability: row.get(6)?,
                tags: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ─── Local exploit file browser ───────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalExploitFile {
    pub path: String,
    pub name: String,
    pub os: String,
    pub kind: String,
    pub size: u64,
}

#[tauri::command]
pub async fn scan_exploits_dir(base_path: String) -> Result<Vec<LocalExploitFile>, String> {
    use std::path::Path;
    let base = Path::new(&base_path);
    if !base.exists() {
        return Ok(vec![]);
    }
    let mut files: Vec<LocalExploitFile> = Vec::new();
    fn walk(dir: &Path, base: &Path, files: &mut Vec<LocalExploitFile>) {
        let Ok(entries) = std::fs::read_dir(dir) else { return; };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                walk(&path, base, files);
            } else if path.extension().map(|e| e == "py").unwrap_or(false) {
                let rel = path.strip_prefix(base).unwrap_or(&path);
                let parts: Vec<&str> = rel.components()
                    .map(|c| c.as_os_str().to_str().unwrap_or(""))
                    .collect();
                let os   = parts.first().copied().unwrap_or("unknown").to_string();
                let kind = if parts.len() >= 2 { parts[1].to_string() } else { "unknown".to_string() };
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                files.push(LocalExploitFile { path: path.to_string_lossy().into_owned(), name, os, kind, size });
            }
        }
    }
    walk(base, base, &mut files);
    files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(files)
}

#[tauri::command]
pub async fn read_exploit_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read: {e}"))
}
