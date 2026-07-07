import { z } from 'zod';
import type { CustomizedResume } from '@ajh/shared';
import type { AiClient } from '../../ai/index.js';
import { parseAiJson } from '../../ai/index.js';
import { HeuristicResumeOptimizer } from './heuristic.optimizer.js';
import type { OptimizeInput, ResumeOptimizerAgent } from './types.js';

const schema = z.object({
  summary: z.string(),
  highlightedSkills: z.array(z.string()).default([]),
  experiences: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        bullets: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  keywords: z.array(z.string()).default([]),
  atsScore: z.number().min(0).max(100).default(0),
});

const SYSTEM = `You are an ATS resume optimizer. Given a candidate's REAL profile and a target job, produce a tailored, ATS-friendly resume as strict JSON: { summary, highlightedSkills (string[]), experiences ([{company,title,bullets[]}]), keywords (string[]), atsScore (0-100) }.
CRITICAL RULES:
- NEVER invent skills, employers, titles, dates, certifications, or achievements.
- Only reorder, rephrase for clarity, and emphasize what is already present.
- keywords must be skills the candidate genuinely has.`;

/**
 * LLM optimizer. Guards the truthfulness constraint two ways: a strict system
 * prompt, and a post-check that drops any highlighted skill the candidate does
 * not actually list (falling back to the heuristic optimizer if the model
 * output is unusable).
 */
export class LlmResumeOptimizer implements ResumeOptimizerAgent {
  readonly name = 'llm-optimizer';
  private readonly fallback = new HeuristicResumeOptimizer();

  constructor(private readonly ai: AiClient) {}

  async optimize(input: OptimizeInput): Promise<CustomizedResume> {
    const realSkills = new Set(input.profile.skills.map((s) => s.name.toLowerCase()));
    const profileText = JSON.stringify({
      summary: input.profile.summary,
      skills: input.profile.skills.map((s) => s.name),
      experiences: input.profile.experiences.map((e) => ({
        company: e.company,
        title: e.title,
        highlights: e.highlights,
      })),
    });

    try {
      const raw = await this.ai.complete({
        json: true,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `CANDIDATE PROFILE (the only source of truth):\n${profileText}\n\nTARGET JOB:\nTitle: ${input.job.title}\nRequirements: ${input.job.requirements ?? 'n/a'}\nDescription: ${input.job.description}\n\nReturn only the JSON object.`,
          },
        ],
      });
      const parsed = parseAiJson(raw, schema);
      // Truthfulness guard: keep only skills/keywords the candidate really has.
      return {
        ...parsed,
        highlightedSkills: parsed.highlightedSkills.filter((s) => realSkills.has(s.toLowerCase())),
        keywords: parsed.keywords.filter((s) => realSkills.has(s.toLowerCase())),
      };
    } catch {
      return this.fallback.optimize(input);
    }
  }
}
