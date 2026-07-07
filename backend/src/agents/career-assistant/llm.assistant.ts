import { z } from 'zod';
import type { AiClient } from '../../ai/index.js';
import { parseAiJson } from '../../ai/index.js';
import { HeuristicCareerAssistant } from './heuristic.assistant.js';
import type { CareerAssistInput, CareerAssistantAgent, GeneratedGuidance } from './types.js';

const schema = z.object({
  companySummary: z.string(),
  interviewQuestions: z.array(z.string()).default([]),
  resumeSuggestions: z.array(z.string()).default([]),
});

const SYSTEM = `You are a career coach. Given a candidate profile, a job, and their match, return strict JSON: { companySummary (2-3 sentences), interviewQuestions (5-8 likely questions), resumeSuggestions (3-6 concrete, truthful tips) }. Base everything on the provided data; do not fabricate facts about the candidate.`;

/** LLM career guidance; falls back to the heuristic agent on any failure. */
export class LlmCareerAssistant implements CareerAssistantAgent {
  readonly name = 'llm-assistant';
  private readonly fallback = new HeuristicCareerAssistant();

  constructor(private readonly ai: AiClient) {}

  async generate(input: CareerAssistInput): Promise<GeneratedGuidance> {
    try {
      const raw = await this.ai.complete({
        json: true,
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `CANDIDATE: ${input.profile.fullName ?? 'n/a'} — skills: ${input.profile.skills
              .map((s) => s.name)
              .join(
                ', ',
              )}\nMATCH: ${input.match.matchScore}%, missing: ${input.match.missingSkills.join(', ')}\nJOB: ${input.job.title} at ${input.job.company ?? 'n/a'}\nRequirements: ${input.job.requirements ?? input.job.description}\n\nReturn only the JSON object.`,
          },
        ],
      });
      const parsed = parseAiJson(raw, schema);
      if (parsed.interviewQuestions.length === 0) return this.fallback.generate(input);
      return parsed;
    } catch {
      return this.fallback.generate(input);
    }
  }
}
