// Claude provider config helpers
export const CLAUDE_KEY_STORAGE = "nullforge_claude_api_key";

export function getClaudeKey(): string {
  return localStorage.getItem(CLAUDE_KEY_STORAGE) ?? "";
}

export function saveClaudeKey(key: string): void {
  localStorage.setItem(CLAUDE_KEY_STORAGE, key);
}

export function clearClaudeKey(): void {
  localStorage.removeItem(CLAUDE_KEY_STORAGE);
}
