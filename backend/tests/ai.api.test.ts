import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { CoverLetterDTO, JobAnalysis, MatchResult, ResumeVersionDTO } from '@ajh/shared';
import { createApp } from '../src/app.js';
import type { AppContainer } from '../src/container.js';
import { NotFoundError } from '../src/utils/errors.js';

const UUID = '11111111-1111-1111-1111-111111111111';

function appWith(over: Partial<Record<keyof AppContainer, unknown>>) {
  const base = {
    jobService: { list: vi.fn(), getById: vi.fn(), persistNewJobs: vi.fn() },
    searchService: { run: vi.fn() },
    resumeService: { upload: vi.fn(), getById: vi.fn(), getProfile: vi.fn() },
    jobAnalysisService: { analyze: vi.fn() },
    matchingService: { match: vi.fn() },
    applicationDocsService: {
      customize: vi.fn(),
      listVersions: vi.fn().mockResolvedValue([]),
      generateCoverLetter: vi.fn(),
      editCoverLetter: vi.fn(),
    },
    applicationService: {
      create: vi.fn(),
      advance: vi.fn(),
      updateStatus: vi.fn(),
      update: vi.fn(),
      getPackage: vi.fn(),
      list: vi.fn(),
    },
    authService: { register: vi.fn(), login: vi.fn(), me: vi.fn() },
    resolveDemoUserId: () => Promise.resolve('demo-user'),
    ...over,
  } as unknown as AppContainer;
  return createApp(base);
}

describe('POST /api/v1/jobs/:id/analyze', () => {
  it('returns the analysis', async () => {
    const analysis: JobAnalysis = {
      summary: 'A role',
      requiredSkills: ['Angular'],
      preferredSkills: [],
      responsibilities: [],
      benefits: [],
      salary: null,
    };
    const analyze = vi.fn().mockResolvedValue(analysis);
    const res = await request(appWith({ jobAnalysisService: { analyze } })).post(
      `/api/v1/jobs/${UUID}/analyze`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.requiredSkills).toEqual(['Angular']);
    expect(analyze).toHaveBeenCalledWith(UUID);
  });

  it('400s on a non-uuid job id', async () => {
    const res = await request(appWith({})).post('/api/v1/jobs/not-uuid/analyze');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/jobs/:id/match', () => {
  it('matches with the demo user and optional resumeId', async () => {
    const result = { matchScore: 90 } as MatchResult;
    const match = vi.fn().mockResolvedValue(result);
    const res = await request(appWith({ matchingService: { match } }))
      .post(`/api/v1/jobs/${UUID}/match`)
      .send({ resumeId: UUID });
    expect(res.status).toBe(200);
    expect(res.body.data.matchScore).toBe(90);
    expect(match).toHaveBeenCalledWith('demo-user', UUID, UUID);
  });

  it('400s on an invalid resumeId in the body', async () => {
    const res = await request(appWith({}))
      .post(`/api/v1/jobs/${UUID}/match`)
      .send({ resumeId: 'nope' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/resume/customize', () => {
  it('creates a resume version (201)', async () => {
    const dto = { id: 'v1', jobId: UUID } as ResumeVersionDTO;
    const customize = vi.fn().mockResolvedValue(dto);
    const res = await request(
      appWith({
        applicationDocsService: {
          customize,
          listVersions: vi.fn(),
          generateCoverLetter: vi.fn(),
          editCoverLetter: vi.fn(),
        },
      }),
    )
      .post('/api/v1/resume/customize')
      .send({ jobId: UUID });
    expect(res.status).toBe(201);
    expect(customize).toHaveBeenCalledWith('demo-user', UUID, undefined);
  });

  it('400s when jobId is missing', async () => {
    const res = await request(appWith({})).post('/api/v1/resume/customize').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/resume/versions/:jobId', () => {
  it('lists versions for a job', async () => {
    const listVersions = vi.fn().mockResolvedValue([{ id: 'v1' }]);
    const res = await request(
      appWith({
        applicationDocsService: {
          customize: vi.fn(),
          listVersions,
          generateCoverLetter: vi.fn(),
          editCoverLetter: vi.fn(),
        },
      }),
    ).get(`/api/v1/resume/versions/${UUID}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('cover letters', () => {
  it('POST /api/v1/cover-letter creates one (201)', async () => {
    const dto = { id: 'c1', content: 'Dear team' } as CoverLetterDTO;
    const generateCoverLetter = vi.fn().mockResolvedValue(dto);
    const res = await request(
      appWith({
        applicationDocsService: {
          customize: vi.fn(),
          listVersions: vi.fn(),
          generateCoverLetter,
          editCoverLetter: vi.fn(),
        },
      }),
    )
      .post('/api/v1/cover-letter')
      .send({ jobId: UUID, resumeVersionId: UUID });
    expect(res.status).toBe(201);
    expect(generateCoverLetter).toHaveBeenCalledWith('demo-user', UUID, UUID);
  });

  it('PUT /api/v1/cover-letter/:id edits content', async () => {
    const dto = { id: UUID, content: 'Edited', isEdited: true } as CoverLetterDTO;
    const editCoverLetter = vi.fn().mockResolvedValue(dto);
    const res = await request(
      appWith({
        applicationDocsService: {
          customize: vi.fn(),
          listVersions: vi.fn(),
          generateCoverLetter: vi.fn(),
          editCoverLetter,
        },
      }),
    )
      .put(`/api/v1/cover-letter/${UUID}`)
      .send({ content: 'Edited' });
    expect(res.status).toBe(200);
    expect(editCoverLetter).toHaveBeenCalledWith(UUID, 'Edited');
  });

  it('404 maps through when the service throws NotFound', async () => {
    const editCoverLetter = vi.fn().mockRejectedValue(new NotFoundError('gone'));
    const res = await request(
      appWith({
        applicationDocsService: {
          customize: vi.fn(),
          listVersions: vi.fn(),
          generateCoverLetter: vi.fn(),
          editCoverLetter,
        },
      }),
    )
      .put(`/api/v1/cover-letter/${UUID}`)
      .send({ content: 'x' });
    expect(res.status).toBe(404);
  });
});
