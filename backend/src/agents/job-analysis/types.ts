import type { JobAnalysis } from '@ajh/shared';

export interface JobAnalysisInput {
  title: string;
  company: string | null;
  description: string;
  requirements: string | null;
  benefits: string | null;
  salary: string | null;
}

/** Summarizes a job and extracts required/preferred skills (spec §AI Features). */
export interface JobAnalysisAgent {
  readonly name: string;
  analyze(input: JobAnalysisInput): Promise<JobAnalysis>;
}
