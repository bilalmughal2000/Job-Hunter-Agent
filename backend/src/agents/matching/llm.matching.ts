import { z } from 'zod';
import type { MatchResult, ResumeProfileDTO } from '@ajh/shared';
import type { AiClient } from '../../ai/index.js';
import { parseAiJson } from '../../ai/index.js';
import type { MatchInput, MatchJob, MatchingAgent } from './types.js';

const matchSchema = z.object({
  matchScore: z.number().min(0).max(100),
  explanation: z.string(),
  missingSkills: z.array(z.string()).default([]),
  strongSkills: z.array(z.string()).default([]),
  weakSkills: z.array(z.string()).default([]),
  experienceGap: z.string().default('Not specified'),
  recommendation: z.string().default(''),
  confidenceScore: z.number().min(0).max(1).default(0.6),
});

const SYSTEM = `You are an expert technical recruiter. Compare a candidate's resume profile to a job and return a strict JSON object with keys: matchScore (0-100 integer), explanation, missingSkills (string[]), strongSkills (string[]), weakSkills (string[]), experienceGap, recommendation, confidenceScore (0-1). Base everything ONLY on the provided data. Do not invent candidate skills or experience.`;

function profileDigest(p: ResumeProfileDTO): string {
  const skills = p.skills.map((s) => s.name).join(', ');
  const exp = p.experiences
    .map((e) => `- ${e.title} @ ${e.company}${e.isCurrent ? ' (current)' : ''}`)
    .join('\n');
  return `Summary: ${p.summary ?? 'n/a'}\nSkills: ${skills}\nExperience:\n${exp || 'n/a'}`;
}

function jobDigest(j: MatchJob): string {
  return `Title: ${j.title}\nCompany: ${j.company ?? 'n/a'}\nExperience required: ${j.experience ?? 'n/a'}\nRequirements: ${j.requirements ?? 'n/a'}\nDescription: ${j.description}`;
}

/** LLM-backed matcher. Activated when an AI provider is configured. */
export class LlmMatchingAgent implements MatchingAgent {
  readonly name = 'llm-matching';

  constructor(private readonly ai: AiClient) {}

  async match(input: MatchInput): Promise<MatchResult> {
    const raw = await this.ai.complete({
      json: true,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `CANDIDATE PROFILE:\n${profileDigest(input.profile)}\n\nJOB:\n${jobDigest(input.job)}\n\nReturn only the JSON object.`,
        },
      ],
    });
    const parsed = parseAiJson(raw, matchSchema);
    return { ...parsed, matchScore: Math.round(parsed.matchScore) };
  }
}
