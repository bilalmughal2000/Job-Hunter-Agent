import { describe, expect, it } from 'vitest';
import { SkillType, type JobAnalysis, type ResumeProfileDTO } from '@ajh/shared';
import { HeuristicJobAnalysisAgent } from '../src/agents/job-analysis/index.js';
import {
  HeuristicResumeOptimizer,
  LlmResumeOptimizer,
} from '../src/agents/resume-optimizer/index.js';
import { TemplateCoverLetterAgent } from '../src/agents/cover-letter/index.js';
import { StubAiClient } from '../src/ai/index.js';

const profile: ResumeProfileDTO = {
  id: 'p1',
  resumeId: 'r1',
  extractedAt: '2026-07-01T00:00:00.000Z',
  fullName: 'Ayesha Khan',
  headline: null,
  summary: 'Frontend engineer with Angular expertise.',
  email: null,
  phone: null,
  location: null,
  portfolioUrl: null,
  githubUrl: null,
  linkedinUrl: null,
  websiteUrl: null,
  skills: [
    { name: 'Angular', type: SkillType.TECHNICAL, level: null },
    { name: 'TypeScript', type: SkillType.TECHNICAL, level: null },
    { name: 'CSS', type: SkillType.TECHNICAL, level: null },
  ],
  experiences: [
    {
      company: 'Tkxel',
      title: 'Senior Angular Developer',
      location: null,
      startDate: '2021-01-01T00:00:00.000Z',
      endDate: null,
      isCurrent: true,
      description: null,
      highlights: ['Migrated app to Angular 17', 'Improved CSS design system'],
    },
  ],
  projects: [],
  educations: [],
  certifications: [],
  languages: [],
  awards: [],
};

const job = {
  title: 'Frontend Angular Developer',
  company: 'Systems Limited',
  description: 'Build SPAs with Angular and TypeScript. Nice to have: NgRx.',
  requirements: 'Angular, TypeScript required. NgRx preferred.',
  experience: '3+ years',
};

describe('HeuristicJobAnalysisAgent', () => {
  it('extracts required and preferred skills and a summary', async () => {
    const agent = new HeuristicJobAnalysisAgent();
    const analysis = await agent.analyze({
      title: job.title,
      company: job.company,
      description: job.description,
      requirements: job.requirements,
      benefits: 'Health insurance, remote days',
      salary: 'PKR 400k',
    });
    expect(analysis.requiredSkills).toEqual(expect.arrayContaining(['Angular', 'TypeScript']));
    expect(analysis.preferredSkills).toContain('NgRx');
    // NgRx is preferred, so it must NOT also be listed as required.
    expect(analysis.requiredSkills).not.toContain('NgRx');
    expect(analysis.summary.length).toBeGreaterThan(0);
    expect(analysis.benefits).toContain('Health insurance');
  });
});

const analysis: JobAnalysis = {
  summary: 's',
  requiredSkills: ['Angular', 'TypeScript'],
  preferredSkills: ['NgRx'],
  responsibilities: [],
  benefits: [],
  salary: null,
};

describe('HeuristicResumeOptimizer', () => {
  it('reorders skills job-first and never invents skills', async () => {
    const agent = new HeuristicResumeOptimizer();
    const result = await agent.optimize({ profile, job, analysis });
    // Job-relevant skills come first.
    expect(result.highlightedSkills.slice(0, 2)).toEqual(
      expect.arrayContaining(['Angular', 'TypeScript']),
    );
    // Only real skills — no invented "NgRx" the candidate lacks.
    expect(result.highlightedSkills).not.toContain('NgRx');
    expect(result.keywords).toEqual(expect.arrayContaining(['Angular', 'TypeScript']));
    expect(result.atsScore).toBeGreaterThan(0);
  });

  it('orders relevant experience bullets first', async () => {
    const agent = new HeuristicResumeOptimizer();
    const result = await agent.optimize({ profile, job, analysis });
    expect(result.experiences[0]?.bullets[0]).toMatch(/Angular/);
  });
});

describe('LlmResumeOptimizer truthfulness guard', () => {
  it('drops highlighted skills the candidate does not actually have', async () => {
    const stub = new StubAiClient([
      JSON.stringify({
        summary: 'x',
        highlightedSkills: ['Angular', 'Rust', 'Go'], // Rust/Go are fabricated
        experiences: [],
        keywords: ['Angular', 'Kubernetes'], // Kubernetes fabricated
        atsScore: 80,
      }),
    ]);
    const agent = new LlmResumeOptimizer(stub);
    const result = await agent.optimize({ profile, job, analysis });
    expect(result.highlightedSkills).toContain('Angular');
    expect(result.highlightedSkills).not.toContain('Rust');
    expect(result.highlightedSkills).not.toContain('Go');
    expect(result.keywords).not.toContain('Kubernetes');
  });

  it('falls back to the heuristic optimizer on bad AI output', async () => {
    const agent = new LlmResumeOptimizer(new StubAiClient(['not json at all']));
    const result = await agent.optimize({ profile, job, analysis });
    expect(result.highlightedSkills.length).toBeGreaterThan(0);
  });
});

describe('TemplateCoverLetterAgent', () => {
  it('produces a personalized letter using only real profile data', async () => {
    const agent = new TemplateCoverLetterAgent();
    const { content, tone } = await agent.generate({
      profile,
      job,
      emphasizeSkills: ['Angular', 'TypeScript'],
    });
    expect(content).toContain('Systems Limited');
    expect(content).toContain('Frontend Angular Developer');
    expect(content).toContain('Ayesha Khan');
    expect(content).toContain('Angular');
    expect(tone).toBe('professional');
  });
});
