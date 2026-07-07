import type { JobAnalysis, MatchResult, ResumeProfileDTO } from '@ajh/shared';

/** The job fields an agent needs to reason about a match. */
export interface MatchJob {
  title: string;
  company: string | null;
  description: string;
  requirements: string | null;
  experience: string | null;
}

export interface MatchInput {
  profile: ResumeProfileDTO;
  job: MatchJob;
  /** Required/preferred skills if the job was already analyzed (Job Analysis Agent). */
  analysis?: JobAnalysis;
}

/** AI Matching Agent — independently swappable/testable (constraint #6). */
export interface MatchingAgent {
  readonly name: string;
  match(input: MatchInput): Promise<MatchResult>;
}
