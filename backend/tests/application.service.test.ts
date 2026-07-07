import { describe, expect, it, vi } from 'vitest';
import { ApplicationStatus, WorkflowStage } from '@ajh/shared';
import { ApplicationService } from '../src/services/application.service.js';
import type {
  ApplicationWithRelations,
  IApplicationRepository,
} from '../src/repositories/application.repository.js';
import type { IJobRepository, IResumeRepository } from '../src/repositories/index.js';
import { NotFoundError, ValidationError } from '../src/utils/errors.js';

function app(over: Partial<ApplicationWithRelations> = {}): ApplicationWithRelations {
  return {
    id: 'a1',
    userId: 'u1',
    jobId: 'job1',
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
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    job: { id: 'job1', title: 'Frontend Angular Developer', company: { name: 'Tkxel' } },
    resumeVersion: null,
    coverLetter: null,
    events: [],
    ...over,
  } as unknown as ApplicationWithRelations;
}

function makeService(current: ApplicationWithRelations | null) {
  const transition = vi.fn(async (_id: string, data, event) =>
    app({ ...current!, ...data, events: [event] }),
  );
  const apps: IApplicationRepository = {
    create: vi.fn(async () => app()),
    findById: vi.fn().mockResolvedValue(current),
    listByUser: vi
      .fn()
      .mockResolvedValue({ items: current ? [current] : [], total: current ? 1 : 0 }),
    transition,
    update: vi.fn(async (_id: string, data) => app({ ...current!, ...data })),
  };
  const jobs = { findById: vi.fn().mockResolvedValue({ id: 'job1' }) } as unknown as IJobRepository;
  const resumes = {
    findLatestProfileForUser: vi.fn().mockResolvedValue(null),
  } as unknown as IResumeRepository;
  const svc = new ApplicationService(apps, jobs, resumes, () => new Date('2026-07-08T00:00:00Z'));
  return { svc, apps, transition };
}

describe('ApplicationService.create', () => {
  it('creates an application for an existing job', async () => {
    const { svc } = makeService(null);
    const dto = await svc.create('u1', { jobId: 'job1' });
    expect(dto.jobId).toBe('job1');
    expect(dto.stage).toBe(WorkflowStage.JOB_FOUND);
  });

  it('404s for a missing job', async () => {
    const { apps } = makeService(null);
    const jobs = { findById: vi.fn().mockResolvedValue(null) } as unknown as IJobRepository;
    const s2 = new ApplicationService(apps, jobs, {
      findLatestProfileForUser: vi.fn(),
    } as unknown as IResumeRepository);
    await expect(s2.create('u1', { jobId: 'nope' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('maps a unique-violation to a validation error', async () => {
    const { svc, apps } = makeService(null);
    (apps.create as ReturnType<typeof vi.fn>).mockRejectedValue({ code: 'P2002' });
    await expect(svc.create('u1', { jobId: 'job1' })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('ApplicationService.advance', () => {
  it('advances to the next stage', async () => {
    const { svc } = makeService(app({ stage: WorkflowStage.JOB_FOUND }));
    const dto = await svc.advance('u1', 'a1');
    expect(dto.stage).toBe(WorkflowStage.RESUME_MATCHED);
  });

  it('blocks PACKAGE_PREPARED without resume version + cover letter', async () => {
    const { svc } = makeService(
      app({ stage: WorkflowStage.COVER_LETTER_GENERATED, resumeVersionId: null }),
    );
    await expect(svc.advance('u1', 'a1')).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows PACKAGE_PREPARED once the package is attached', async () => {
    const { svc } = makeService(
      app({
        stage: WorkflowStage.COVER_LETTER_GENERATED,
        resumeVersionId: 'v1',
        coverLetterId: 'c1',
      }),
    );
    const dto = await svc.advance('u1', 'a1');
    expect(dto.stage).toBe(WorkflowStage.PACKAGE_PREPARED);
  });

  it('sets status SUBMITTED + appliedDate when reaching the SUBMITTED stage', async () => {
    const { svc } = makeService(app({ stage: WorkflowStage.USER_APPROVED }));
    const dto = await svc.advance('u1', 'a1');
    expect(dto.stage).toBe(WorkflowStage.SUBMITTED);
    expect(dto.status).toBe(ApplicationStatus.SUBMITTED);
    expect(dto.appliedDate).toBe('2026-07-08T00:00:00.000Z');
  });

  it("404s when the application isn't owned by the user", async () => {
    const { svc } = makeService(app({ userId: 'someone-else' }));
    await expect(svc.advance('u1', 'a1')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ApplicationService.updateStatus — approval gate (constraint #9)', () => {
  it('refuses SUBMITTED before USER_APPROVED', async () => {
    const { svc } = makeService(
      app({ stage: WorkflowStage.READY_FOR_REVIEW, status: ApplicationStatus.READY_FOR_REVIEW }),
    );
    await expect(svc.updateStatus('u1', 'a1', ApplicationStatus.SUBMITTED)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('allows SUBMITTED once approved', async () => {
    const { svc } = makeService(
      app({ stage: WorkflowStage.USER_APPROVED, status: ApplicationStatus.READY_FOR_REVIEW }),
    );
    const dto = await svc.updateStatus('u1', 'a1', ApplicationStatus.SUBMITTED);
    expect(dto.status).toBe(ApplicationStatus.SUBMITTED);
  });

  it('rejects an invalid status jump', async () => {
    const { svc } = makeService(app({ status: ApplicationStatus.SAVED }));
    await expect(
      svc.updateStatus('u1', 'a1', ApplicationStatus.OFFER_RECEIVED),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
