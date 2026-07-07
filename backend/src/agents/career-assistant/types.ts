import type { JobAnalysis, MatchResult, ResumeProfileDTO } from '@ajh/shared';
import type { MatchJob } from '../matching/index.js';

export interface CareerAssistInput {
  profile: ResumeProfileDTO;
  job: MatchJob;
  analysis: JobAnalysis;
  match: MatchResult;
}

/** The generative parts of the career assistant (the rest is computed). */
export interface GeneratedGuidance {
  companySummary: string;
  interviewQuestions: string[];
  resumeSuggestions: string[];
}

export interface CareerAssistantAgent {
  readonly name: string;
  generate(input: CareerAssistInput): Promise<GeneratedGuidance>;
}
