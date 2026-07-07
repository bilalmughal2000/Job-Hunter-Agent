import { describe, expect, it, vi } from 'vitest';
import type { Company, CoverLetter, Job, ResumeVersion } from '@prisma/client';
import {
  MatchingService,
  JobAnalysisService,
  ApplicationDocsService,
} from '../src/services/index.js';
import { HeuristicMatchingAgent } from '../src/agents/matching/index.js';
import { HeuristicJobAnalysisAgent } from '../src/agents/job-analysis/index.js';
import { HeuristicResumeOptimizer } from '../src/agents/resume-optimizer/index.js';
import { TemplateCoverLetterAgent } from '../src/agents/cover-letter/index.js';
import type { ResumeProfileWithChildren } from '../src/models/resume.mapper.js';
import { NotFoundError, ValidationError } from '../src/utils/errors.js';

const jobRow = {
  id: 'job1',
  title: 'Frontend Angular Developer',
  description: 'Angular and TypeScript role.',
  requirements: 'Angular, TypeScript required.',
  experience: '3+ years',
  benefits: null,
  salary: null,
  company: { name: 'Tkxel' } as Company,
} as unknown as Job & { company: Company };

const profileRow = {
  id: 'prof1',
  resumeId: 'r1',
  extractedAt: new Date('2026-07-01T00:00:00Z'),
  fullName: 'Ayesha Khan',
  summary: 'Frontend engineer',
  headline: null,
  email: null,
  phone: null,
  location: null,
  portfolioUrl: null,
  githubUrl: null,
  linkedinUrl: null,
  websiteUrl: null,
  skills: [{ name: 'Angular', type: 'TECHNICAL', level: null }],
  experiences: [],
  projects: [],
  educations: [],
  certifications: [],
  languages: [],
  awards: [],
} as unknown as ResumeProfileWithChildren;

describe('JobAnalysisService', () => {
  it('analyzes and persists the job analysis', async () => {
    const updateAnalysis = vi.fn().mockResolvedValue(undefined);
    const jobs = { findById: () => Promise.resolve(jobRow), updateAnalysis } as never;
    const svc = new JobAnalysisService(new HeuristicJobAnalysisAgent(), jobs);
    const analysis = await svc.analyze('job1');
    expect(analysis.requiredSkills).toContain('Angular');
    expect(updateAnalysis).toHaveBeenCalledWith(
      'job1',
      analysis.summary,
      analysis.requiredSkills,
      analysis.preferredSkills,
    );
  });

  it('404s for a missing job', async () => {
    const jobs = { findById: () => Promise.resolve(null), updateAnalysis: vi.fn() } as never;
    const svc = new JobAnalysisService(new HeuristicJobAnalysisAgent(), jobs);
    await expect(svc.analyze('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('MatchingService', () => {
  it('matches the primary resume and persists the result', async () => {
    const save = vi.fn().mockResolvedValue({});
    const jobs = { findById: () => Promise.resolve(jobRow) } as never;
    const resumes = {
      findProfileByResumeId: () => Promise.resolve(null),
      findLatestProfileForUser: () => Promise.resolve(profileRow),
    } as never;
    const svc = new MatchingService(
      new HeuristicMatchingAgent(),
      new HeuristicJobAnalysisAgent(),
      jobs,
      resumes,
      { save },
    );
    const result = await svc.match('user1', 'job1');
    expect(result.strongSkills).toContain('Angular');
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user1', jobId: 'job1', resumeProfileId: 'prof1' }),
    );
  });

  it('404s when the user has no resume profile', async () => {
    const jobs = { findById: () => Promise.resolve(jobRow) } as never;
    const resumes = {
      findProfileByResumeId: () => Promise.resolve(null),
      findLatestProfileForUser: () => Promise.resolve(null),
    } as never;
    const svc = new MatchingService(
      new HeuristicMatchingAgent(),
      new HeuristicJobAnalysisAgent(),
      jobs,
      resumes,
      { save: vi.fn() },
    );
    await expect(svc.match('user1', 'job1')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ApplicationDocsService', () => {
  function make() {
    const versionRow = {
      id: 'v1',
      jobId: 'job1',
      baseResumeId: 'r1',
      label: 'v1',
      content: {
        highlightedSkills: ['Angular'],
        summary: 's',
        experiences: [],
        keywords: ['Angular'],
        atsScore: 80,
      },
      atsScore: 80,
      version: 1,
      createdAt: new Date('2026-07-01T00:00:00Z'),
    } as unknown as ResumeVersion;
    const versions = {
      create: vi.fn().mockResolvedValue(versionRow),
      listByJob: vi.fn().mockResolvedValue([versionRow]),
      findById: vi.fn().mockResolvedValue(versionRow),
    };
    const coverRow = {
      id: 'c1',
      jobId: 'job1',
      resumeVersionId: 'v1',
      content: 'Dear Hiring Team',
      tone: 'professional',
      isEdited: false,
      version: 1,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-07-01T00:00:00Z'),
    } as unknown as CoverLetter;
    const coverLetters = {
      create: vi.fn().mockResolvedValue(coverRow),
      update: vi.fn().mockResolvedValue({ ...coverRow, content: 'Edited', isEdited: true }),
      findById: vi.fn(),
    };
    const jobs = { findById: () => Promise.resolve(jobRow) } as never;
    const resumes = {
      findProfileByResumeId: () => Promise.resolve(profileRow),
      findLatestProfileForUser: () => Promise.resolve(profileRow),
    } as never;
    const svc = new ApplicationDocsService(
      new HeuristicResumeOptimizer(),
      new TemplateCoverLetterAgent(),
      new HeuristicJobAnalysisAgent(),
      jobs,
      resumes,
      versions,
      coverLetters,
    );
    return { svc, versions, coverLetters };
  }

  it('customizes a resume into a version', async () => {
    const { svc, versions } = make();
    const dto = await svc.customize('user1', 'job1');
    expect(dto.id).toBe('v1');
    expect(dto.content.highlightedSkills).toContain('Angular');
    expect(versions.create).toHaveBeenCalled();
  });

  it('generates a cover letter for a version', async () => {
    const { svc, coverLetters } = make();
    const dto = await svc.generateCoverLetter('user1', 'job1', 'v1');
    expect(dto.content).toContain('Dear Hiring Team');
    expect(coverLetters.create).toHaveBeenCalled();
  });

  it('rejects a cover letter when the version belongs to another job', async () => {
    const { svc, versions } = make();
    versions.findById.mockResolvedValue({
      id: 'v1',
      jobId: 'OTHER',
      baseResumeId: 'r1',
      content: {},
    });
    await expect(svc.generateCoverLetter('user1', 'job1', 'v1')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('edits a cover letter', async () => {
    const { svc } = make();
    const dto = await svc.editCoverLetter('c1', 'Edited');
    expect(dto.content).toBe('Edited');
    expect(dto.isEdited).toBe(true);
  });
});
