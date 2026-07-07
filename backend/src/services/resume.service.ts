import path from 'node:path';
import {
  ResumeFileFormat,
  ResumeParseStatus,
  type ResumeDTO,
  type ResumeProfileDTO,
} from '@ajh/shared';
import { ResumeParseStatus as PrismaResumeParseStatus } from '@prisma/client';
import type {
  StructuredExtractor,
  TextExtractionService,
} from '../agents/resume-application/extraction/index.js';
import { toResumeDTO, toResumeProfileDTO } from '../models/resume.mapper.js';
import type { IResumeRepository } from '../repositories/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import type { Logger } from '../utils/logger.js';
import type { Storage } from './storage.service.js';
import type { IResumeService, UploadResumeInput } from './types.js';

const FORMAT_BY_MIME: Record<string, ResumeFileFormat> = {
  'application/pdf': ResumeFileFormat.PDF,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ResumeFileFormat.DOCX,
  'text/plain': ResumeFileFormat.TXT,
  'application/rtf': ResumeFileFormat.RTF,
  'text/rtf': ResumeFileFormat.RTF,
};

const FORMAT_BY_EXT: Record<string, ResumeFileFormat> = {
  '.pdf': ResumeFileFormat.PDF,
  '.docx': ResumeFileFormat.DOCX,
  '.txt': ResumeFileFormat.TXT,
  '.rtf': ResumeFileFormat.RTF,
};

/** Map the shared parse-status enum to the Prisma one (identical members). */
const toPrismaStatus = (s: ResumeParseStatus): PrismaResumeParseStatus =>
  PrismaResumeParseStatus[s as keyof typeof PrismaResumeParseStatus];

export class ResumeService implements IResumeService {
  constructor(
    private readonly repo: IResumeRepository,
    private readonly storage: Storage,
    private readonly textExtraction: TextExtractionService,
    private readonly structured: StructuredExtractor,
    private readonly logger: Logger,
  ) {}

  static resolveFormat(originalName: string, mimeType: string): ResumeFileFormat | null {
    const ext = path.extname(originalName).toLowerCase();
    return FORMAT_BY_MIME[mimeType] ?? FORMAT_BY_EXT[ext] ?? null;
  }

  async upload(input: UploadResumeInput): Promise<ResumeDTO> {
    const format = ResumeService.resolveFormat(input.originalName, input.mimeType);
    if (!format) {
      throw new ValidationError(`Unsupported resume format: ${input.mimeType}`);
    }

    const ext = path.extname(input.originalName) || `.${format.toLowerCase()}`;
    const stored = await this.storage.save(input.buffer, ext);

    const resume = await this.repo.create({
      userId: input.userId,
      originalName: input.originalName,
      storagePath: stored.storagePath,
      mimeType: input.mimeType,
      format,
      sizeBytes: input.buffer.length,
      checksum: stored.checksum,
    });

    await this.process(resume.id, input.buffer, format);
    return this.getById(resume.id);
  }

  /** Text extraction → structured extraction → persistence, updating status. */
  private async process(resumeId: string, buffer: Buffer, format: ResumeFileFormat): Promise<void> {
    await this.repo.setStatus(resumeId, PrismaResumeParseStatus.PARSING);
    try {
      const outcome = await this.textExtraction.extract(buffer, format);

      if (
        outcome.status === ResumeParseStatus.FAILED ||
        outcome.status === ResumeParseStatus.MANUAL_REVIEW
      ) {
        await this.repo.setStatus(resumeId, toPrismaStatus(outcome.status), outcome.error);
        return;
      }

      const profile = await this.structured.extract(outcome.text);
      await this.repo.saveProfile(resumeId, profile, outcome.text);
      await this.repo.setStatus(resumeId, toPrismaStatus(outcome.status));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error({ resumeId, error }, 'resume processing failed');
      await this.repo.setStatus(resumeId, PrismaResumeParseStatus.FAILED, message);
    }
  }

  async getById(id: string): Promise<ResumeDTO> {
    const resume = await this.repo.findById(id);
    if (!resume) throw new NotFoundError(`Resume not found: ${id}`);
    return toResumeDTO(resume);
  }

  async getProfile(resumeId: string): Promise<ResumeProfileDTO> {
    const profile = await this.repo.findProfileByResumeId(resumeId);
    if (!profile) {
      throw new NotFoundError(`No structured profile for resume: ${resumeId}`);
    }
    return toResumeProfileDTO(profile);
  }
}
