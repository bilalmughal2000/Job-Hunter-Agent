import type { MatchResult } from '@ajh/shared';
import type { JobAnalysisAgent } from '../agents/job-analysis/index.js';
import type { MatchingAgent } from '../agents/matching/index.js';
import { toResumeProfileDTO } from '../models/resume.mapper.js';
import type {
  IJobRepository,
  IMatchResultRepository,
  IResumeRepository,
} from '../repositories/index.js';
import { NotFoundError } from '../utils/errors.js';
import { toJobAnalysisInput, toMatchJob } from './jobInput.js';
import type { IMatchingService } from './types.js';

export class MatchingService implements IMatchingService {
  constructor(
    private readonly agent: MatchingAgent,
    private readonly analysisAgent: JobAnalysisAgent,
    private readonly jobs: IJobRepository,
    private readonly resumes: IResumeRepository,
    private readonly matches: IMatchResultRepository,
  ) {}

  async match(userId: string, jobId: string, resumeId?: string): Promise<MatchResult> {
    const job = await this.jobs.findById(jobId);
    if (!job) throw new NotFoundError(`Job not found: ${jobId}`);

    const profileRow = resumeId
      ? await this.resumes.findProfileByResumeId(resumeId)
      : await this.resumes.findLatestProfileForUser(userId);
    if (!profileRow) {
      throw new NotFoundError('No resume profile found — upload and parse a resume first');
    }

    // Analyze the job in-memory to get required/preferred skills to match against.
    const analysis = await this.analysisAgent.analyze(toJobAnalysisInput(job));
    const result = await this.agent.match({
      profile: toResumeProfileDTO(profileRow),
      job: toMatchJob(job),
      analysis,
    });

    await this.matches.save({ userId, jobId, resumeProfileId: profileRow.id, result });
    return result;
  }
}
