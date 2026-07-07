import { describe, expect, it, vi } from 'vitest';
import type { Resume } from '@prisma/client';
import { ResumeFileFormat, ResumeParseStatus, type ExtractedProfile } from '@ajh/shared';
import { ResumeService } from '../src/services/index.js';
import type {
  StructuredExtractor,
  TextExtractionService,
} from '../src/agents/resume-application/extraction/index.js';
import type { IResumeRepository } from '../src/repositories/index.js';
import type { Storage } from '../src/services/storage.service.js';
import type { ResumeProfileWithChildren } from '../src/models/resume.mapper.js';
import { logger } from '../src/utils/logger.js';
import { ValidationError } from '../src/utils/errors.js';

const emptyProfile: ExtractedProfile = {
  skills: [],
  experiences: [],
  projects: [],
  educations: [],
  certifications: [],
  languages: [],
  awards: [],
};

function fakeStorage(): Storage {
  return {
    save: vi.fn().mockResolvedValue({ storagePath: '/tmp/x.txt', checksum: 'abc' }),
    read: vi.fn(),
    delete: vi.fn(),
  };
}

function makeRepo() {
  const statuses: { status: ResumeParseStatus; error?: string | null }[] = [];
  let saved: ExtractedProfile | null = null;
  const resumeRow = { id: 'r1', parseStatus: 'PENDING' } as unknown as Resume;
  const repo: IResumeRepository = {
    create: vi.fn().mockResolvedValue(resumeRow),
    setStatus: vi.fn((_id: string, status: ResumeParseStatus, error?: string | null) => {
      statuses.push({ status, error });
      return Promise.resolve();
    }),
    saveProfile: vi.fn((_id: string, profile: ExtractedProfile) => {
      saved = profile;
      return Promise.resolve();
    }),
    findById: vi.fn().mockResolvedValue({
      ...resumeRow,
      originalName: 'cv.txt',
      format: 'TXT',
      mimeType: 'text/plain',
      sizeBytes: 10,
      parseStatus: 'PARSED',
      parseError: null,
      isPrimary: true,
      uploadedAt: new Date('2026-07-01T00:00:00Z'),
      profile: { id: 'p1' },
    }),
    findProfileByResumeId: vi.fn(),
    findLatestProfileForUser: vi.fn(),
  };
  return { repo, statuses, getSaved: () => saved };
}

const heuristicStub = (profile: ExtractedProfile): StructuredExtractor => ({
  name: 'stub',
  extract: () => Promise.resolve(profile),
});

function service(
  repo: IResumeRepository,
  textOutcome: { text: string; status: ResumeParseStatus },
) {
  const textExtraction = {
    extract: vi.fn().mockResolvedValue(textOutcome),
  } as unknown as TextExtractionService;
  return new ResumeService(
    repo,
    fakeStorage(),
    textExtraction,
    heuristicStub(emptyProfile),
    logger,
  );
}

describe('ResumeService.resolveFormat', () => {
  it('resolves by mime then by extension', () => {
    expect(ResumeService.resolveFormat('cv.bin', 'application/pdf')).toBe(ResumeFileFormat.PDF);
    expect(ResumeService.resolveFormat('cv.docx', 'application/octet-stream')).toBe(
      ResumeFileFormat.DOCX,
    );
    expect(ResumeService.resolveFormat('cv.xyz', 'application/octet-stream')).toBeNull();
  });
});

describe('ResumeService.upload', () => {
  it('rejects an unsupported format', async () => {
    const { repo } = makeRepo();
    const svc = service(repo, { text: '', status: ResumeParseStatus.PARSED });
    await expect(
      svc.upload({
        userId: 'u1',
        originalName: 'cv.xyz',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('x'),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('persists a profile and marks PARSED on success', async () => {
    const { repo, statuses, getSaved } = makeRepo();
    const svc = service(repo, {
      text: 'lots of resume text here',
      status: ResumeParseStatus.PARSED,
    });
    await svc.upload({
      userId: 'u1',
      originalName: 'cv.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('x'),
    });
    expect(statuses.map((s) => s.status)).toEqual([
      ResumeParseStatus.PARSING,
      ResumeParseStatus.PARSED,
    ]);
    expect(getSaved()).not.toBeNull();
  });

  it('does NOT save a profile when text extraction flags MANUAL_REVIEW', async () => {
    const { repo, statuses } = makeRepo();
    const svc = service(repo, { text: '', status: ResumeParseStatus.MANUAL_REVIEW });
    await svc.upload({
      userId: 'u1',
      originalName: 'scan.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('x'),
    });
    expect(repo.saveProfile).not.toHaveBeenCalled();
    expect(statuses.at(-1)?.status).toBe(ResumeParseStatus.MANUAL_REVIEW);
  });

  it('marks FAILED if the structured extractor throws', async () => {
    const { repo, statuses } = makeRepo();
    const textExtraction = {
      extract: vi.fn().mockResolvedValue({ text: 'good text', status: ResumeParseStatus.PARSED }),
    } as unknown as TextExtractionService;
    const throwing: StructuredExtractor = {
      name: 'boom',
      extract: () => Promise.reject(new Error('extractor exploded')),
    };
    const svc = new ResumeService(repo, fakeStorage(), textExtraction, throwing, logger);
    await svc.upload({
      userId: 'u1',
      originalName: 'cv.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('x'),
    });
    expect(statuses.at(-1)?.status).toBe(ResumeParseStatus.FAILED);
    expect(statuses.at(-1)?.error).toContain('extractor exploded');
  });
});

describe('ResumeService.getProfile', () => {
  it('throws NotFound when there is no profile', async () => {
    const { repo } = makeRepo();
    (repo.findProfileByResumeId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const svc = service(repo, { text: '', status: ResumeParseStatus.PARSED });
    await expect(svc.getProfile('r1')).rejects.toThrow(/No structured profile/);
  });

  it('maps a stored profile to a DTO', async () => {
    const { repo } = makeRepo();
    const profileRow = {
      id: 'p1',
      resumeId: 'r1',
      extractedAt: new Date('2026-07-01T00:00:00Z'),
      fullName: 'Ayesha Khan',
      headline: null,
      summary: 'summary',
      email: 'a@b.com',
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
    (repo.findProfileByResumeId as ReturnType<typeof vi.fn>).mockResolvedValue(profileRow);
    const svc = service(repo, { text: '', status: ResumeParseStatus.PARSED });
    const dto = await svc.getProfile('r1');
    expect(dto.fullName).toBe('Ayesha Khan');
    expect(dto.skills[0]?.name).toBe('Angular');
    expect(dto.extractedAt).toBe('2026-07-01T00:00:00.000Z');
  });
});
