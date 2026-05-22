use futures_util::StreamExt;
use reqwest::Client;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};

fn db_path(app: &AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("nullforge.db")
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiConversation {
    pub id: String,
    pub project_id: Option<String>,
    pub provider: String,
    pub model: String,
    pub messages: String,
    pub created_at: String,
}

/// Stream AI response — emits events "ai-chunk-{session_id}", "ai-done-{session_id}", "ai-error-{session_id}"
#[tauri::command]
pub async fn ai_stream_chat(
    app: AppHandle,
    session_id: String,
    provider: String,
    model: String,
    api_key: Option<String>,
    endpoint: Option<String>,
    messages: Value,
    system_prompt: Option<String>,
    max_tokens: Option<u32>,
) -> Result<(), String> {
    let client = Client::new();
    let max_tok = max_tokens.unwrap_or(4096);

    match provider.as_str() {
        "claude" => {
            stream_claude(app, client, session_id, model, api_key, messages, system_prompt, max_tok).await
        }
        "openai" => {
            stream_openai(app, client, session_id, model, api_key, messages, system_prompt, max_tok).await
        }
        "ollama" => {
            let ep = endpoint.unwrap_or_else(|| "http://localhost:11434".to_string());
            stream_ollama(app, client, session_id, model, ep, messages, system_prompt, max_tok).await
        }
        _ => Err(format!("Unknown provider: {}", provider)),
    }
}

async fn stream_claude(
    app: AppHandle,
    client: Client,
    session_id: String,
    model: String,
    api_key: Option<String>,
    messages: Value,
    system_prompt: Option<String>,
    max_tokens: u32,
) -> Result<(), String> {
    let key = api_key.ok_or("Claude requires an API key")?;

    let mut body = json!({
        "model": model,
        "max_tokens": max_tokens,
        "stream": true,
        "messages": messages,
    });

    if let Some(sys) = system_prompt {
        body["system"] = json!(sys);
    }

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_body = resp.text().await.unwrap_or_default();
        let msg = format!("Claude API error {}: {}", status, err_body);
        let _ = app.emit(&format!("ai-error-{}", session_id), &msg);
        return Err(msg);
    }

    let mut stream = resp.bytes_stream();
    let mut full_text = String::new();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| e.to_string())?;
        buf.push_str(&String::from_utf8_lossy(&bytes));

        // Process complete SSE lines
        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].trim().to_string();
            buf = buf[pos + 1..].to_string();

            if let Some(data) = line.strip_prefix("data: ") {
                if data == "[DONE]" {
                    continue;
                }
                if let Ok(val) = serde_json::from_str::<Value>(data) {
                    if val.get("type").and_then(|t| t.as_str()) == Some("content_block_delta") {
                        if let Some(text) = val
                            .get("delta")
                            .and_then(|d| d.get("text"))
                            .and_then(|t| t.as_str())
                        {
                            full_text.push_str(text);
                            let _ = app.emit(&format!("ai-chunk-{}", session_id), text.to_string());
                        }
                    }
                }
            }
        }
    }

    let _ = app.emit(&format!("ai-done-{}", session_id), full_text);
    Ok(())
}

async fn stream_openai(
    app: AppHandle,
    client: Client,
    session_id: String,
    model: String,
    api_key: Option<String>,
    messages: Value,
    system_prompt: Option<String>,
    max_tokens: u32,
) -> Result<(), String> {
    let key = api_key.ok_or("OpenAI requires an API key")?;

    // Prepend system message if provided
    let msgs = if let Some(sys) = system_prompt {
        let mut arr = vec![json!({"role": "system", "content": sys})];
        if let Some(existing) = messages.as_array() {
            arr.extend(existing.clone());
        }
        json!(arr)
    } else {
        messages
    };

    let body = json!({
        "model": model,
        "max_tokens": max_tokens,
        "stream": true,
        "messages": msgs,
    });

    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_body = resp.text().await.unwrap_or_default();
        let msg = format!("OpenAI API error {}: {}", status, err_body);
        let _ = app.emit(&format!("ai-error-{}", session_id), &msg);
        return Err(msg);
    }

    let mut stream = resp.bytes_stream();
    let mut full_text = String::new();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| e.to_string())?;
        buf.push_str(&String::from_utf8_lossy(&bytes));

        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].trim().to_string();
            buf = buf[pos + 1..].to_string();

            if let Some(data) = line.strip_prefix("data: ") {
                if data == "[DONE]" {
                    continue;
                }
                if let Ok(val) = serde_json::from_str::<Value>(data) {
                    if let Some(content) = val
                        .get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("delta"))
                        .and_then(|d| d.get("content"))
                        .and_then(|t| t.as_str())
                    {
                        full_text.push_str(content);
                        let _ = app.emit(&format!("ai-chunk-{}", session_id), content.to_string());
                    }
                }
            }
        }
    }

    let _ = app.emit(&format!("ai-done-{}", session_id), full_text);
    Ok(())
}

async fn stream_ollama(
    app: AppHandle,
    client: Client,
    session_id: String,
    model: String,
    endpoint: String,
    messages: Value,
    system_prompt: Option<String>,
    _max_tokens: u32,
) -> Result<(), String> {
    // Prepend system message if provided
    let msgs = if let Some(sys) = system_prompt {
        let mut arr = vec![json!({"role": "system", "content": sys})];
        if let Some(existing) = messages.as_array() {
            arr.extend(existing.clone());
        }
        json!(arr)
    } else {
        messages
    };

    let url = format!("{}/api/chat", endpoint.trim_end_matches('/'));
    let body = json!({
        "model": model,
        "stream": true,
        "messages": msgs,
    });

    let resp = client
        .post(&url)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_body = resp.text().await.unwrap_or_default();
        let msg = format!("Ollama error {}: {}", status, err_body);
        let _ = app.emit(&format!("ai-error-{}", session_id), &msg);
        return Err(msg);
    }

    let mut stream = resp.bytes_stream();
    let mut full_text = String::new();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| e.to_string())?;
        buf.push_str(&String::from_utf8_lossy(&bytes));

        // Ollama streams NDJSON — split on newlines
        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].trim().to_string();
            buf = buf[pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }
            if let Ok(val) = serde_json::from_str::<Value>(&line) {
                let done = val.get("done").and_then(|d| d.as_bool()).unwrap_or(false);
                if let Some(content) = val
                    .get("message")
                    .and_then(|m| m.get("content"))
                    .and_then(|c| c.as_str())
                {
                    if !content.is_empty() {
                        full_text.push_str(content);
                        let _ = app.emit(&format!("ai-chunk-{}", session_id), content.to_string());
                    }
                }
                if done {
                    break;
                }
            }
        }
    }

    let _ = app.emit(&format!("ai-done-{}", session_id), full_text);
    Ok(())
}

/// Save conversation to SQLite — returns conversation id
#[tauri::command]
pub async fn save_ai_conversation(
    app: AppHandle,
    project_id: Option<String>,
    provider: String,
    model: String,
    messages: Value,
) -> Result<String, String> {
    let path = db_path(&app);
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let msgs_str = serde_json::to_string(&messages).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO ai_conversations (id, project_id, provider, model, messages) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, project_id, provider, model, msgs_str],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

/// Load conversations for a project (or all if project_id is None)
#[tauri::command]
pub async fn get_ai_conversations(
    app: AppHandle,
    project_id: Option<String>,
) -> Result<Value, String> {
    let path = db_path(&app);
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut rows_out: Vec<Value> = Vec::new();

    if let Some(pid) = project_id {
        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, provider, model, messages, created_at FROM ai_conversations WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 50",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![pid], |row| {
                Ok(AiConversation {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    provider: row.get(2)?,
                    model: row.get(3)?,
                    messages: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
        for row in rows {
            let conv = row.map_err(|e| e.to_string())?;
            let msgs: Value = serde_json::from_str(&conv.messages).unwrap_or(json!([]));
            rows_out.push(json!({
                "id": conv.id,
                "project_id": conv.project_id,
                "provider": conv.provider,
                "model": conv.model,
                "messages": msgs,
                "created_at": conv.created_at,
            }));
        }
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, provider, model, messages, created_at FROM ai_conversations ORDER BY created_at DESC LIMIT 50",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(AiConversation {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    provider: row.get(2)?,
                    model: row.get(3)?,
                    messages: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
        for row in rows {
            let conv = row.map_err(|e| e.to_string())?;
            let msgs: Value = serde_json::from_str(&conv.messages).unwrap_or(json!([]));
            rows_out.push(json!({
                "id": conv.id,
                "project_id": conv.project_id,
                "provider": conv.provider,
                "model": conv.model,
                "messages": msgs,
                "created_at": conv.created_at,
            }));
        }
    }

    Ok(json!(rows_out))
}
