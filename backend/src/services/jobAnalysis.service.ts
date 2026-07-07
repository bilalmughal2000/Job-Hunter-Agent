import type { JobAnalysis } from '@ajh/shared';
import type { JobAnalysisAgent } from '../agents/job-analysis/index.js';
import type { IJobRepository } from '../repositories/index.js';
import { NotFoundError } from '../utils/errors.js';
import { toJobAnalysisInput } from './jobInput.js';
import type { IJobAnalysisService } from './types.js';

export class JobAnalysisService implements IJobAnalysisService {
  constructor(
    private readonly agent: JobAnalysisAgent,
    private readonly jobs: IJobRepository,
  ) {}

  async analyze(jobId: string): Promise<JobAnalysis> {
    const job = await this.jobs.findById(jobId);
    if (!job) throw new NotFoundError(`Job not found: ${jobId}`);

    const analysis = await this.agent.analyze(toJobAnalysisInput(job));
    await this.jobs.updateAnalysis(
      jobId,
      analysis.summary,
      analysis.requiredSkills,
      analysis.preferredSkills,
    );
    return analysis;
  }
}
