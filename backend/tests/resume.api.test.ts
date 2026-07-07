import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { ResumeDTO, ResumeProfileDTO } from '@ajh/shared';
import { createApp } from '../src/app.js';
import type { AppContainer } from '../src/container.js';
import type { IJobService, IResumeService, ISearchService } from '../src/services/index.js';
import { NotFoundError, ValidationError } from '../src/utils/errors.js';

const rejectingJob: IJobService = {
  list: () => Promise.reject(new Error('n/a')),
  getById: () => Promise.reject(new NotFoundError('n/a')),
  persistNewJobs: () => Promise.resolve(0),
};
const rejectingSearch: ISearchService = { run: () => Promise.reject(new Error('n/a')) };

function appWith(resumeService: IResumeService) {
  const container: AppContainer = {
    jobService: rejectingJob,
    searchService: rejectingSearch,
    resumeService,
    resolveDemoUserId: () => Promise.resolve('demo-user'),
  };
  return createApp(container);
}

const dto: ResumeDTO = {
  id: '11111111-1111-1111-1111-111111111111',
  originalName: 'cv.txt',
  format: 'TXT' as ResumeDTO['format'],
  mimeType: 'text/plain',
  sizeBytes: 20,
  parseStatus: 'PARSED' as ResumeDTO['parseStatus'],
  parseError: null,
  isPrimary: true,
  uploadedAt: '2026-07-01T00:00:00.000Z',
  hasProfile: true,
};

describe('POST /api/v1/resume/upload', () => {
  it('accepts a .txt resume and returns 201 with the resume DTO', async () => {
    const upload = vi.fn().mockResolvedValue(dto);
    const svc: IResumeService = {
      upload,
      getById: () => Promise.reject(new NotFoundError('x')),
      getProfile: () => Promise.reject(new NotFoundError('x')),
    };
    const res = await request(appWith(svc))
      .post('/api/v1/resume/upload')
      .attach('resume', Buffer.from('Ayesha Khan\nAngular developer'), 'cv.txt');
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(dto.id);
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'demo-user',
        originalName: 'cv.txt',
        mimeType: 'text/plain',
      }),
    );
  });

  it('400s when no file is attached', async () => {
    const svc: IResumeService = {
      upload: () => Promise.reject(new ValidationError('should not reach')),
      getById: () => Promise.reject(new NotFoundError('x')),
      getProfile: () => Promise.reject(new NotFoundError('x')),
    };
    const res = await request(appWith(svc)).post('/api/v1/resume/upload');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a disallowed file type with 400', async () => {
    const svc: IResumeService = {
      upload: vi.fn(),
      getById: () => Promise.reject(new NotFoundError('x')),
      getProfile: () => Promise.reject(new NotFoundError('x')),
    };
    const res = await request(appWith(svc))
      .post('/api/v1/resume/upload')
      .attach('resume', Buffer.from('MZ...'), 'malware.exe');
    expect(res.status).toBe(400);
    expect(svc.upload).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/resume/:id and /profile', () => {
  it('400s on a non-uuid id', async () => {
    const svc: IResumeService = {
      upload: vi.fn(),
      getById: vi.fn(),
      getProfile: vi.fn(),
    };
    const res = await request(appWith(svc)).get('/api/v1/resume/not-a-uuid');
    expect(res.status).toBe(400);
  });

  it('returns the profile DTO', async () => {
    const profile = { id: 'p1', resumeId: dto.id, fullName: 'Ayesha Khan' } as ResumeProfileDTO;
    const svc: IResumeService = {
      upload: vi.fn(),
      getById: () => Promise.resolve(dto),
      getProfile: () => Promise.resolve(profile),
    };
    const res = await request(appWith(svc)).get(`/api/v1/resume/${dto.id}/profile`);
    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('Ayesha Khan');
  });
});
