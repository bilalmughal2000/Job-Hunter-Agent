import type { MatchResult } from '@ajh/shared';
import { candidateSkillSet, estimateYears, hasSkill, requiredYears } from '../shared/profile.js';
import type { MatchInput, MatchingAgent } from './types.js';

/**
 * Deterministic matcher: scores skill coverage of the job's required/preferred
 * skills against the candidate's profile, adjusted for the experience gap.
 * Needs no AI/key and is the default backend.
 */
export class HeuristicMatchingAgent implements MatchingAgent {
  readonly name = 'heuristic-matching';

  match(input: MatchInput): Promise<MatchResult> {
    const skills = candidateSkillSet(input.profile);
    const required = input.analysis?.requiredSkills ?? [];
    const preferred = input.analysis?.preferredSkills ?? [];

    const strong = [...new Set([...required, ...preferred])].filter((s) => hasSkill(skills, s));
    const missingSkills = required.filter((s) => !hasSkill(skills, s));
    const weakSkills = preferred.filter((s) => !hasSkill(skills, s));

    const reqCoverage = required.length
      ? required.filter((s) => hasSkill(skills, s)).length / required.length
      : 1;
    const prefCoverage = preferred.length
      ? preferred.filter((s) => hasSkill(skills, s)).length / preferred.length
      : 1;

    // Experience-gap adjustment.
    const have = estimateYears(input.profile);
    const need = requiredYears(input.job.experience ?? input.job.requirements);
    let experienceGap = 'Not specified';
    let expPenalty = 0;
    if (need !== null) {
      if (have >= need) experienceGap = `Meets requirement (${have}+ yrs vs ${need} required)`;
      else {
        experienceGap = `Short by ~${Math.round((need - have) * 10) / 10} yrs (${have} vs ${need})`;
        expPenalty = Math.min(20, (need - have) * 5);
      }
    }

    const base = 100 * (0.8 * reqCoverage + 0.2 * prefCoverage);
    const matchScore = Math.max(0, Math.min(100, Math.round(base - expPenalty)));

    const recommendation =
      matchScore >= 80
        ? 'Strong match — apply.'
        : matchScore >= 60
          ? 'Good match — worth applying, address the gaps.'
          : 'Stretch role — apply only if the missing skills are learnable quickly.';

    const explanation =
      `Matched ${strong.length} of ${required.length + preferred.length} target skills. ` +
      (missingSkills.length
        ? `Missing required: ${missingSkills.join(', ')}. `
        : 'No required-skill gaps. ') +
      experienceGap +
      '.';

    return Promise.resolve({
      matchScore,
      explanation,
      missingSkills,
      strongSkills: strong,
      weakSkills,
      experienceGap,
      recommendation,
      // Confident only when we actually had analyzed skills to compare against.
      confidenceScore: required.length || preferred.length ? 0.7 : 0.4,
    });
  }
}
