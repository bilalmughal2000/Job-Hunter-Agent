import type { JobAnalysisInput } from '../agents/job-analysis/index.js';
import type { MatchJob } from '../agents/matching/index.js';
import type { JobWithCompany } from '../repositories/index.js';

export function toMatchJob(job: JobWithCompany): MatchJob {
  return {
    title: job.title,
    company: job.company?.name ?? null,
    description: job.description,
    requirements: job.requirements,
    experience: job.experience,
  };
}

export function toJobAnalysisInput(job: JobWithCompany): JobAnalysisInput {
  return {
    title: job.title,
    company: job.company?.name ?? null,
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
    salary: job.salary,
  };
}
