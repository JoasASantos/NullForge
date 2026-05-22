// OpenAI provider config helpers
export const OPENAI_KEY_STORAGE = "nullforge_openai_api_key";

export function getOpenAIKey(): string {
  return localStorage.getItem(OPENAI_KEY_STORAGE) ?? "";
}

export function saveOpenAIKey(key: string): void {
  localStorage.setItem(OPENAI_KEY_STORAGE, key);
}

export function clearOpenAIKey(): void {
  localStorage.removeItem(OPENAI_KEY_STORAGE);
}
