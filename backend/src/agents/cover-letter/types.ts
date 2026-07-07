import type { CoverLetterResult, ResumeProfileDTO } from '@ajh/shared';
import type { MatchJob } from '../matching/types.js';

export interface CoverLetterInput {
  profile: ResumeProfileDTO;
  job: MatchJob;
  /** Skills to emphasize (e.g. the candidate's job-relevant strengths). */
  emphasizeSkills?: string[];
}

/** Cover Letter Agent — personalized to company, job, and resume. */
export interface CoverLetterAgent {
  readonly name: string;
  generate(input: CoverLetterInput): Promise<CoverLetterResult>;
}
