import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
  ApplicationStatus,
  WorkflowStage,
  type ApplicationDTO,
  type AuthResultDTO,
} from '@ajh/shared';
import { createApp } from '../src/app.js';
import type { AppContainer } from '../src/container.js';
import { signToken } from '../src/utils/jwt.js';

function appWith(over: Partial<Record<keyof AppContainer, unknown>>) {
  const base = {
    jobService: {},
    searchService: {},
    resumeService: {},
    jobAnalysisService: {},
    matchingService: {},
    applicationDocsService: {},
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

const token = signToken({ sub: 'u1', email: 'a@b.com', role: 'USER' });
const auth = { Authorization: `Bearer ${token}` };
const UUID = '11111111-1111-1111-1111-111111111111';

const sampleApp: ApplicationDTO = {
  id: 'a1',
  jobId: UUID,
  jobTitle: 'Frontend Angular Developer',
  company: 'Tkxel',
  resumeVersionId: null,
  coverLetterId: null,
  stage: WorkflowStage.JOB_FOUND,
  status: ApplicationStatus.SAVED,
  appliedDate: null,
  interviewDate: null,
  followUpDate: null,
  recruiterName: null,
  recruiterContact: null,
  notes: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('auth guard on /applications', () => {
  it('401s without a token', async () => {
    const res = await request(appWith({})).get('/api/v1/applications');
    expect(res.status).toBe(401);
  });

  it('401s with a bad token', async () => {
    const res = await request(appWith({}))
      .get('/api/v1/applications')
      .set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/applications', () => {
  it('creates an application for the authenticated user', async () => {
    const create = vi.fn().mockResolvedValue(sampleApp);
    const res = await request(appWith({ applicationService: { create } }))
      .post('/api/v1/applications')
      .set(auth)
      .send({ jobId: UUID });
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ jobId: UUID }));
  });

  it('400s on a missing jobId', async () => {
    const res = await request(appWith({})).post('/api/v1/applications').set(auth).send({});
    expect(res.status).toBe(400);
  });
});

describe('workflow endpoints', () => {
  it('advances an application', async () => {
    const advance = vi
      .fn()
      .mockResolvedValue({ ...sampleApp, stage: WorkflowStage.RESUME_MATCHED });
    const res = await request(appWith({ applicationService: { advance } }))
      .post(`/api/v1/applications/${UUID}/advance`)
      .set(auth)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.stage).toBe(WorkflowStage.RESUME_MATCHED);
    expect(advance).toHaveBeenCalledWith('u1', UUID, undefined);
  });

  it('updates status', async () => {
    const updateStatus = vi
      .fn()
      .mockResolvedValue({ ...sampleApp, status: ApplicationStatus.WITHDRAWN });
    const res = await request(appWith({ applicationService: { updateStatus } }))
      .put(`/api/v1/applications/${UUID}/status`)
      .set(auth)
      .send({ status: 'WITHDRAWN' });
    expect(res.status).toBe(200);
    expect(updateStatus).toHaveBeenCalledWith('u1', UUID, 'WITHDRAWN', undefined);
  });

  it('rejects an invalid status value with 400', async () => {
    const res = await request(appWith({}))
      .put(`/api/v1/applications/${UUID}/status`)
      .set(auth)
      .send({ status: 'NOT_A_STATUS' });
    expect(res.status).toBe(400);
  });
});

describe('auth endpoints', () => {
  it('registers a user (201)', async () => {
    const result: AuthResultDTO = {
      token: 'tok',
      user: { id: 'u1', email: 'a@b.com', name: null, role: 'USER' },
    };
    const register = vi.fn().mockResolvedValue(result);
    const res = await request(appWith({ authService: { register, login: vi.fn(), me: vi.fn() } }))
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBe('tok');
  });

  it('rejects a short password (400)', async () => {
    const res = await request(appWith({}))
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('GET /auth/me returns the user for a valid token', async () => {
    const me = vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', name: null, role: 'USER' });
    const res = await request(appWith({ authService: { me, register: vi.fn(), login: vi.fn() } }))
      .get('/api/v1/auth/me')
      .set(auth);
    expect(res.status).toBe(200);
    expect(me).toHaveBeenCalledWith('u1');
  });

  it('GET /auth/me 401s without a token', async () => {
    const res = await request(appWith({})).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
