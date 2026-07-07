import type { CareerAssistantDTO } from '@ajh/shared';
import type { JobAnalysisAgent } from '../agents/job-analysis/index.js';
import type { MatchingAgent } from '../agents/matching/index.js';
import { learningResourceFor } from '../agents/career-assistant/index.js';
import type { CareerAssistantAgent } from '../agents/career-assistant/index.js';
import { toResumeProfileDTO } from '../models/resume.mapper.js';
import type { IJobRepository, IResumeRepository } from '../repositories/index.js';
import { NotFoundError } from '../utils/errors.js';
import { toJobAnalysisInput, toMatchJob } from './jobInput.js';
import type { ICareerAssistantService } from './types.js';

export class CareerAssistantService implements ICareerAssistantService {
  constructor(
    private readonly matching: MatchingAgent,
    private readonly analysis: JobAnalysisAgent,
    private readonly assistant: CareerAssistantAgent,
    private readonly jobs: IJobRepository,
    private readonly resumes: IResumeRepository,
  ) {}

  async assist(userId: string, jobId: string): Promise<CareerAssistantDTO> {
    const job = await this.jobs.findById(jobId);
    if (!job) throw new NotFoundError(`Job not found: ${jobId}`);
    const profileRow = await this.resumes.findLatestProfileForUser(userId);
    if (!profileRow) {
      throw new NotFoundError('No resume profile found — upload and parse a resume first');
    }

    const profile = toResumeProfileDTO(profileRow);
    const matchJob = toMatchJob(job);
    const analysis = await this.analysis.analyze(toJobAnalysisInput(job));
    const match = await this.matching.match({ profile, job: matchJob, analysis });
    const guidance = await this.assistant.generate({ profile, job: matchJob, analysis, match });

    // ATS = share of required skills the candidate covers.
    const req = analysis.requiredSkills.length;
    const covered =
      req - match.missingSkills.filter((s) => analysis.requiredSkills.includes(s)).length;
    const atsScore = req > 0 ? Math.round((covered / req) * 100) : match.matchScore;

    // Similar jobs: other postings matching a keyword from this title.
    const keyword = job.title.split(/\s+/).find((w) => w.length > 4) ?? 'developer';
    const similar = await this.jobs.findMany({ keywords: keyword, pageSize: 6 });
    const similarJobs = similar.items
      .filter((j) => j.id !== job.id)
      .slice(0, 5)
      .map((j) => ({ id: j.id, title: j.title, company: j.company?.name ?? null }));

    return {
      interviewProbability: match.matchScore,
      atsScore,
      resumeSuggestions: guidance.resumeSuggestions,
      missingSkills: match.missingSkills,
      learningResources: match.missingSkills.slice(0, 6).map(learningResourceFor),
      expectedSalaryRange: job.salary ?? 'Not specified',
      interviewQuestions: guidance.interviewQuestions,
      companySummary: guidance.companySummary,
      similarJobs,
    };
  }
}
