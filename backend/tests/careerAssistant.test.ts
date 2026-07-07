import { describe, expect, it, vi } from 'vitest';
import { SkillType, type JobAnalysis, type MatchResult, type ResumeProfileDTO } from '@ajh/shared';
import {
  HeuristicCareerAssistant,
  learningResourceFor,
} from '../src/agents/career-assistant/index.js';
import { CareerAssistantService } from '../src/services/careerAssistant.service.js';
import type { JobAnalysisAgent } from '../src/agents/job-analysis/index.js';
import type { MatchingAgent } from '../src/agents/matching/index.js';
import type { IJobRepository, IResumeRepository } from '../src/repositories/index.js';
import type { ResumeProfileWithChildren } from '../src/models/resume.mapper.js';
import { NotFoundError } from '../src/utils/errors.js';

const profile: ResumeProfileDTO = {
  id: 'p1',
  resumeId: 'r1',
  extractedAt: '2026-07-01T00:00:00.000Z',
  fullName: 'Ayesha Khan',
  headline: null,
  summary: null,
  email: null,
  phone: null,
  location: null,
  portfolioUrl: null,
  githubUrl: null,
  linkedinUrl: null,
  websiteUrl: null,
  skills: [{ name: 'Angular', type: SkillType.TECHNICAL, level: null }],
  experiences: [],
  educations: [],
  certifications: [],
  languages: [],
  projects: [],
  awards: [],
};

const analysis: JobAnalysis = {
  summary: 's',
  requiredSkills: ['Angular', 'TypeScript', 'Azure'],
  preferredSkills: [],
  responsibilities: [],
  benefits: [],
  salary: null,
};
const match: MatchResult = {
  matchScore: 70,
  explanation: '',
  missingSkills: ['TypeScript', 'Azure'],
  strongSkills: ['Angular'],
  weakSkills: [],
  experienceGap: '',
  recommendation: '',
  confidenceScore: 0.7,
};

describe('learningResourceFor', () => {
  it('returns a curated resource for known skills', () => {
    expect(learningResourceFor('Angular').url).toContain('angular.dev');
  });
  it('falls back to a search link for unknown skills', () => {
    const r = learningResourceFor('COBOL');
    expect(r.url).toContain('google.com/search');
  });
});

describe('HeuristicCareerAssistant', () => {
  it('generates questions, summary, and truthful suggestions', async () => {
    const g = await new HeuristicCareerAssistant().generate({
      profile,
      job: {
        title: 'Angular Dev',
        company: 'Tkxel',
        description: 'Build apps.',
        requirements: null,
        experience: null,
      },
      analysis,
      match,
    });
    expect(g.interviewQuestions.length).toBeGreaterThan(3);
    expect(g.companySummary).toContain('Tkxel');
    expect(g.resumeSuggestions.some((s) => s.toLowerCase().includes('summary'))).toBe(true);
  });
});

describe('CareerAssistantService', () => {
  function make(withProfile = true) {
    const jobRow = {
      id: 'job1',
      title: 'Senior Angular Developer',
      description: 'Build Angular apps in Lahore.',
      requirements: 'Angular, TypeScript, Azure',
      experience: '3+ years',
      salary: 'PKR 400,000',
      company: { name: 'Tkxel' },
    } as never;
    const jobs = {
      findById: vi.fn().mockResolvedValue(jobRow),
      findMany: vi.fn().mockResolvedValue({
        items: [
          { id: 'job1', title: 'Senior Angular Developer', company: { name: 'Tkxel' } },
          { id: 'job2', title: 'Angular Engineer', company: { name: 'Systems' } },
        ],
        total: 2,
      }),
    } as unknown as IJobRepository;
    const profileRow = withProfile
      ? ({
          id: 'p1',
          resumeId: 'r1',
          extractedAt: new Date('2026-07-01T00:00:00Z'),
          skills: [{ name: 'Angular', type: 'TECHNICAL', level: null }],
          experiences: [],
          projects: [],
          educations: [],
          certifications: [],
          languages: [],
          awards: [],
        } as unknown as ResumeProfileWithChildren)
      : null;
    const resumes = {
      findLatestProfileForUser: vi.fn().mockResolvedValue(profileRow),
    } as unknown as IResumeRepository;
    const matching = { match: () => Promise.resolve(match) } as unknown as MatchingAgent;
    const analysisAgent = {
      analyze: () => Promise.resolve(analysis),
    } as unknown as JobAnalysisAgent;
    const svc = new CareerAssistantService(
      matching,
      analysisAgent,
      new HeuristicCareerAssistant(),
      jobs,
      resumes,
    );
    return { svc };
  }

  it('assembles the full career assistant DTO', async () => {
    const { svc } = make();
    const dto = await svc.assist('u1', 'job1');
    expect(dto.interviewProbability).toBe(70);
    expect(dto.missingSkills).toEqual(['TypeScript', 'Azure']);
    expect(dto.learningResources.length).toBe(2);
    expect(dto.expectedSalaryRange).toContain('PKR');
    expect(dto.similarJobs.some((j) => j.id === 'job2')).toBe(true);
    expect(dto.similarJobs.some((j) => j.id === 'job1')).toBe(false); // excludes self
    expect(dto.atsScore).toBeGreaterThanOrEqual(0);
  });

  it('404s without a resume profile', async () => {
    const { svc } = make(false);
    await expect(svc.assist('u1', 'job1')).rejects.toBeInstanceOf(NotFoundError);
  });
});
