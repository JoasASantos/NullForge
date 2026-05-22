import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AIConfig, AIConversation, AIMessage, StreamCallbacks } from "./types";

/**
 * Stream a chat session via the Rust backend.
 * Returns an unlisten function — call it to clean up event listeners.
 */
export async function streamChat(
  sessionId: string,
  config: AIConfig,
  messages: AIMessage[],
  callbacks: StreamCallbacks
): Promise<() => void> {
  // Set up listeners before invoking so we don't miss early events
  const unlistenChunk = await listen<string>(`ai-chunk-${sessionId}`, (event) => {
    callbacks.onChunk(event.payload);
  });

  const unlistenDone = await listen<string>(`ai-done-${sessionId}`, (event) => {
    callbacks.onDone(event.payload);
    cleanup();
  });

  const unlistenError = await listen<string>(`ai-error-${sessionId}`, (event) => {
    callbacks.onError(event.payload);
    cleanup();
  });

  function cleanup() {
    unlistenChunk();
    unlistenDone();
    unlistenError();
  }

  // Fire the command — runs async in Rust, errors surface via events
  invoke<void>("ai_stream_chat", {
    sessionId,
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey ?? null,
    endpoint: config.endpoint ?? null,
    messages,
    systemPrompt: config.systemPrompt ?? null,
    maxTokens: config.maxTokens ?? null,
  }).catch((err: unknown) => {
    callbacks.onError(String(err));
    cleanup();
  });

  return cleanup;
}

export async function saveConversation(
  provider: string,
  model: string,
  messages: AIMessage[],
  projectId?: string
): Promise<string> {
  return invoke<string>("save_ai_conversation", {
    projectId: projectId ?? null,
    provider,
    model,
    messages,
  });
}

export async function loadConversations(projectId?: string): Promise<AIConversation[]> {
  return invoke<AIConversation[]>("get_ai_conversations", {
    projectId: projectId ?? null,
  });
}
