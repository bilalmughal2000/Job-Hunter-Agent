import type { CoverLetterResult } from '@ajh/shared';
import type { AiClient } from '../../ai/index.js';
import { TemplateCoverLetterAgent } from './template.coverLetter.js';
import type { CoverLetterAgent, CoverLetterInput } from './types.js';

const SYSTEM = `You write concise, professional cover letters (250-350 words, 3-4 short paragraphs). Personalize to the company and role using ONLY facts from the candidate's profile. Do not invent experience or skills. Output plain text only — no markdown, no placeholders like [Company].`;

/** LLM cover letter, falling back to the template agent on any failure. */
export class LlmCoverLetterAgent implements CoverLetterAgent {
  readonly name = 'llm-cover-letter';
  private readonly fallback = new TemplateCoverLetterAgent();

  constructor(private readonly ai: AiClient) {}

  async generate(input: CoverLetterInput): Promise<CoverLetterResult> {
    try {
      const content = await this.ai.complete({
        temperature: 0.6,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Candidate: ${input.profile.fullName ?? 'Applicant'}\nSummary: ${input.profile.summary ?? 'n/a'}\nSkills: ${input.profile.skills.map((s) => s.name).join(', ')}\nMost recent role: ${input.profile.experiences[0]?.title ?? 'n/a'} at ${input.profile.experiences[0]?.company ?? 'n/a'}\n\nJob: ${input.job.title} at ${input.job.company ?? 'the company'}\nRequirements: ${input.job.requirements ?? input.job.description}\n\nWrite the cover letter.`,
          },
        ],
      });
      const trimmed = content.trim();
      if (!trimmed) return this.fallback.generate(input);
      return { content: trimmed, tone: 'professional' };
    } catch {
      return this.fallback.generate(input);
    }
  }
}
