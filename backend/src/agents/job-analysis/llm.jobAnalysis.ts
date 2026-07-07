import { z } from 'zod';
import type { JobAnalysis } from '@ajh/shared';
import type { AiClient } from '../../ai/index.js';
import { parseAiJson } from '../../ai/index.js';
import type { JobAnalysisAgent, JobAnalysisInput } from './types.js';

const schema = z.object({
  summary: z.string(),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  salary: z.string().nullish(),
});

const SYSTEM = `You analyze job postings. Return strict JSON with keys: summary (2-3 sentences), requiredSkills (string[]), preferredSkills (string[]), responsibilities (string[]), benefits (string[]), salary (string or null).
requiredSkills/preferredSkills must be CONCRETE technologies, tools, languages, or frameworks only (e.g. "Angular", "TypeScript", "AWS", "PostgreSQL") — each 1-3 words. Do NOT include soft skills, attitudes, equipment, or full sentences. Extract only what the posting states.`;

export class LlmJobAnalysisAgent implements JobAnalysisAgent {
  readonly name = 'llm-job-analysis';

  constructor(private readonly ai: AiClient) {}

  async analyze(input: JobAnalysisInput): Promise<JobAnalysis> {
    const raw = await this.ai.complete({
      json: true,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Title: ${input.title}\nCompany: ${input.company ?? 'n/a'}\nSalary: ${input.salary ?? 'n/a'}\nRequirements: ${input.requirements ?? 'n/a'}\nBenefits: ${input.benefits ?? 'n/a'}\n\nDescription:\n${input.description}\n\nReturn only the JSON object.`,
        },
      ],
    });
    const parsed = parseAiJson(raw, schema);
    // Defensive: keep only skill-like tokens (short, ≤4 words) so soft
    // requirements/sentences don't pollute the skills dictionary + analytics.
    const clean = (skills: string[]): string[] =>
      skills.filter((s) => s.length <= 30 && s.trim().split(/\s+/).length <= 4);
    return {
      ...parsed,
      requiredSkills: clean(parsed.requiredSkills),
      preferredSkills: clean(parsed.preferredSkills),
      salary: parsed.salary ?? input.salary,
    };
  }
}
