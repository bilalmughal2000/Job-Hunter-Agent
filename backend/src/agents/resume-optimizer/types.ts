import type { CustomizedResume, JobAnalysis, ResumeProfileDTO } from '@ajh/shared';
import type { MatchJob } from '../matching/types.js';

export interface OptimizeInput {
  profile: ResumeProfileDTO;
  job: MatchJob;
  analysis?: JobAnalysis;
}

/**
 * Resume Optimizer Agent. MUST preserve truth — reorders/emphasizes existing
 * content and optimizes ATS keywords the candidate already has; never invents
 * skills, experience, certifications, or education (spec constraint #7).
 */
export interface ResumeOptimizerAgent {
  readonly name: string;
  optimize(input: OptimizeInput): Promise<CustomizedResume>;
}
