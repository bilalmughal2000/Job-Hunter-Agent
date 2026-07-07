import type { CoverLetterDTO, CustomizedResume, ResumeVersionDTO } from '@ajh/shared';
import type { JobAnalysisAgent } from '../agents/job-analysis/index.js';
import type { CoverLetterAgent } from '../agents/cover-letter/index.js';
import type { ResumeOptimizerAgent } from '../agents/resume-optimizer/index.js';
import { toCoverLetterDTO, toResumeVersionDTO } from '../models/aiDocs.mapper.js';
import { toResumeProfileDTO } from '../models/resume.mapper.js';
import type {
  ICoverLetterRepository,
  IJobRepository,
  IResumeRepository,
  IResumeVersionRepository,
} from '../repositories/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { toJobAnalysisInput, toMatchJob } from './jobInput.js';
import type { IApplicationDocsService } from './types.js';

export class ApplicationDocsService implements IApplicationDocsService {
  constructor(
    private readonly optimizer: ResumeOptimizerAgent,
    private readonly coverLetterAgent: CoverLetterAgent,
    private readonly analysisAgent: JobAnalysisAgent,
    private readonly jobs: IJobRepository,
    private readonly resumes: IResumeRepository,
    private readonly versions: IResumeVersionRepository,
    private readonly coverLetters: ICoverLetterRepository,
  ) {}

  async customize(userId: string, jobId: string, resumeId?: string): Promise<ResumeVersionDTO> {
    const job = await this.jobs.findById(jobId);
    if (!job) throw new NotFoundError(`Job not found: ${jobId}`);

    const profileRow = resumeId
      ? await this.resumes.findProfileByResumeId(resumeId)
      : await this.resumes.findLatestProfileForUser(userId);
    if (!profileRow) {
      throw new NotFoundError('No resume profile found — upload and parse a resume first');
    }

    const analysis = await this.analysisAgent.analyze(toJobAnalysisInput(job));
    const content = await this.optimizer.optimize({
      profile: toResumeProfileDTO(profileRow),
      job: toMatchJob(job),
      analysis,
    });

    const version = await this.versions.create({
      userId,
      baseResumeId: profileRow.resumeId,
      jobId,
      content,
      atsScore: content.atsScore,
    });
    return toResumeVersionDTO(version);
  }

  async listVersions(jobId: string): Promise<ResumeVersionDTO[]> {
    const versions = await this.versions.listByJob(jobId);
    return versions.map(toResumeVersionDTO);
  }

  async generateCoverLetter(
    userId: string,
    jobId: string,
    resumeVersionId: string,
  ): Promise<CoverLetterDTO> {
    const version = await this.versions.findById(resumeVersionId);
    if (!version) throw new NotFoundError(`Resume version not found: ${resumeVersionId}`);
    if (version.jobId !== jobId) {
      throw new ValidationError('Resume version does not belong to the given job');
    }

    const job = await this.jobs.findById(jobId);
    if (!job) throw new NotFoundError(`Job not found: ${jobId}`);

    const profileRow = await this.resumes.findProfileByResumeId(version.baseResumeId);
    if (!profileRow) throw new NotFoundError('Base resume profile not found');

    const highlighted = (version.content as unknown as CustomizedResume).highlightedSkills ?? [];
    const letter = await this.coverLetterAgent.generate({
      profile: toResumeProfileDTO(profileRow),
      job: toMatchJob(job),
      emphasizeSkills: highlighted.slice(0, 5),
    });

    const saved = await this.coverLetters.create({
      userId,
      jobId,
      resumeVersionId,
      content: letter.content,
      tone: letter.tone,
    });
    return toCoverLetterDTO(saved);
  }

  async editCoverLetter(id: string, content: string): Promise<CoverLetterDTO> {
    const updated = await this.coverLetters.update(id, content);
    if (!updated) throw new NotFoundError(`Cover letter not found: ${id}`);
    return toCoverLetterDTO(updated);
  }
}
