import { describe, expect, it } from 'vitest';
import { SkillType, type JobAnalysis, type ResumeProfileDTO } from '@ajh/shared';
import { HeuristicMatchingAgent, LlmMatchingAgent } from '../src/agents/matching/index.js';
import type { MatchInput } from '../src/agents/matching/index.js';
import { StubAiClient } from '../src/ai/index.js';

function profile(skills: string[], years = 5): ResumeProfileDTO {
  return {
    id: 'p1',
    resumeId: 'r1',
    extractedAt: '2026-07-01T00:00:00.000Z',
    fullName: 'Ayesha Khan',
    headline: null,
    summary: 'Frontend engineer',
    email: null,
    phone: null,
    location: null,
    portfolioUrl: null,
    githubUrl: null,
    linkedinUrl: null,
    websiteUrl: null,
    skills: skills.map((name) => ({ name, type: SkillType.TECHNICAL, level: null })),
    experiences: [
      {
        company: 'Tkxel',
        title: 'Senior Angular Developer',
        location: null,
        startDate: new Date(Date.now() - years * 365 * 24 * 3600 * 1000).toISOString(),
        endDate: null,
        isCurrent: true,
        description: null,
        highlights: ['Built Angular apps'],
      },
    ],
    projects: [],
    educations: [],
    certifications: [],
    languages: [],
    awards: [],
  };
}

const analysis = (required: string[], preferred: string[] = []): JobAnalysis => ({
  summary: 'A frontend role',
  requiredSkills: required,
  preferredSkills: preferred,
  responsibilities: [],
  benefits: [],
  salary: null,
});

const job: MatchInput['job'] = {
  title: 'Frontend Angular Developer',
  company: 'Tkxel',
  description: 'Angular role',
  requirements: 'Angular, TypeScript, RxJS. 4+ years.',
  experience: '4+ years',
};

describe('HeuristicMatchingAgent', () => {
  const agent = new HeuristicMatchingAgent();

  it('scores a strong candidate high with no missing skills', async () => {
    const result = await agent.match({
      profile: profile(['Angular', 'TypeScript', 'RxJS']),
      job,
      analysis: analysis(['Angular', 'TypeScript', 'RxJS']),
    });
    expect(result.matchScore).toBeGreaterThanOrEqual(90);
    expect(result.missingSkills).toEqual([]);
    expect(result.strongSkills).toEqual(expect.arrayContaining(['Angular', 'TypeScript', 'RxJS']));
    expect(result.recommendation).toMatch(/apply/i);
  });

  it('reports missing required skills and lowers the score', async () => {
    const result = await agent.match({
      profile: profile(['Angular']),
      job,
      analysis: analysis(['Angular', 'TypeScript', 'RxJS', 'NgRx']),
    });
    expect(result.missingSkills).toEqual(expect.arrayContaining(['TypeScript', 'RxJS', 'NgRx']));
    expect(result.matchScore).toBeLessThan(60);
  });

  it('penalizes an experience gap', async () => {
    const junior = await agent.match({
      profile: profile(['Angular', 'TypeScript', 'RxJS'], 1),
      job: { ...job, experience: '8+ years' },
      analysis: analysis(['Angular', 'TypeScript', 'RxJS']),
    });
    expect(junior.experienceGap).toMatch(/short/i);
    expect(junior.matchScore).toBeLessThan(100);
  });

  it('is lower-confidence without analysis', async () => {
    const result = await agent.match({ profile: profile(['Angular']), job });
    expect(result.confidenceScore).toBeLessThan(0.7);
  });
});

describe('LlmMatchingAgent', () => {
  it('parses a JSON match result from the AI client', async () => {
    const stub = new StubAiClient([
      JSON.stringify({
        matchScore: 88.6,
        explanation: 'Strong overlap',
        missingSkills: ['Azure'],
        strongSkills: ['Angular'],
        weakSkills: [],
        experienceGap: 'None',
        recommendation: 'Apply',
        confidenceScore: 0.9,
      }),
    ]);
    const agent = new LlmMatchingAgent(stub);
    const result = await agent.match({
      profile: profile(['Angular']),
      job,
      analysis: analysis(['Angular']),
    });
    expect(result.matchScore).toBe(89); // rounded
    expect(result.missingSkills).toEqual(['Azure']);
    expect(stub.requests[0]?.json).toBe(true);
  });

  it('tolerates a fenced ```json block', async () => {
    const stub = new StubAiClient(['```json\n{"matchScore":70,"explanation":"ok"}\n```']);
    const agent = new LlmMatchingAgent(stub);
    const result = await agent.match({ profile: profile([]), job });
    expect(result.matchScore).toBe(70);
    expect(result.missingSkills).toEqual([]);
  });
});
