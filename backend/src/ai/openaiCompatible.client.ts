import { withRetry } from '../utils/retry.js';
import type { Logger } from '../utils/logger.js';
import type { AiClient, AiCompletionRequest } from './types.js';

export interface OpenAiCompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Chat client for any OpenAI-compatible `/chat/completions` endpoint. Works with
 * OpenAI, Groq, Gemini (OpenAI-compat), OpenRouter, Together, local Ollama, etc.
 * — differing only by baseUrl/model/key. Retries transient (5xx/network) errors.
 */
export class OpenAiCompatibleClient implements AiClient {
  readonly name: string;

  constructor(
    private readonly config: OpenAiCompatibleConfig,
    private readonly logger: Logger,
  ) {
    this.name = `openai-compatible(${config.model})`;
  }

  async complete(request: AiCompletionRequest): Promise<string> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const body = {
      model: this.config.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
      ...(request.json ? { response_format: { type: 'json_object' as const } } : {}),
    };

    return withRetry(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 30_000);
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          if (!res.ok) {
            const text = await res.text().catch(() => '');
            const error = new Error(`AI request failed: ${res.status} ${res.statusText} ${text}`);
            // Only retry server-side/rate-limit errors; 4xx (except 429) are terminal.
            (error as Error & { retryable?: boolean }).retryable =
              res.status >= 500 || res.status === 429;
            throw error;
          }

          const data = (await res.json()) as ChatCompletionResponse;
          const content = data.choices?.[0]?.message?.content;
          if (!content) throw new Error('AI response contained no content');
          return content;
        } finally {
          clearTimeout(timeout);
        }
      },
      {
        retries: 2,
        shouldRetry: (err) => (err as { retryable?: boolean })?.retryable !== false,
        onRetry: (err, attempt) => this.logger.warn({ err, attempt }, 'AI request retry'),
      },
    );
  }
}
