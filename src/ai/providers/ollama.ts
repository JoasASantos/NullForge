// Ollama provider config helpers
export const OLLAMA_ENDPOINT_STORAGE = "nullforge_ollama_endpoint";
export const OLLAMA_DEFAULT_ENDPOINT = "http://localhost:11434";

export function getOllamaEndpoint(): string {
  return localStorage.getItem(OLLAMA_ENDPOINT_STORAGE) ?? OLLAMA_DEFAULT_ENDPOINT;
}

export function saveOllamaEndpoint(endpoint: string): void {
  localStorage.setItem(OLLAMA_ENDPOINT_STORAGE, endpoint);
}
