import type { AiClient, AiCompletionRequest } from './types.js';

/**
 * Deterministic AiClient for tests: returns queued/canned responses instead of
 * calling a network. Records requests so assertions can inspect prompts.
 */
export class StubAiClient implements AiClient {
  readonly name = 'stub';
  readonly requests: AiCompletionRequest[] = [];
  private readonly queue: string[];

  constructor(responses: string[] = []) {
    this.queue = [...responses];
  }

  complete(request: AiCompletionRequest): Promise<string> {
    this.requests.push(request);
    return Promise.resolve(this.queue.shift() ?? '{}');
  }
}
