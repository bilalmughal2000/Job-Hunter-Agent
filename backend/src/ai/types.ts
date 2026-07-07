export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Ask the model to emit strict JSON (uses the provider's json response_format). */
  json?: boolean;
}

/**
 * Provider-agnostic chat completion client. The only surface the LLM-backed
 * agents depend on, so any OpenAI-compatible backend (OpenAI, Groq, Gemini,
 * OpenRouter, local Ollama) — or a test stub — plugs in unchanged.
 */
export interface AiClient {
  readonly name: string;
  complete(request: AiCompletionRequest): Promise<string>;
}
