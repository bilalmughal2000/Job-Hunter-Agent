import type { CustomizedResume } from '@ajh/shared';
import { normalizeText } from '../../utils/text.js';
import { extractSkillsFromText } from '../shared/lexicon.js';
import { estimateYears, hasSkill } from '../shared/profile.js';
import type { OptimizeInput, ResumeOptimizerAgent } from './types.js';

/**
 * Deterministic, truth-preserving optimizer. It only ever reorders and
 * emphasizes what is already in the candidate's profile.
 */
export class HeuristicResumeOptimizer implements ResumeOptimizerAgent {
  readonly name = 'heuristic-optimizer';

  optimize(input: OptimizeInput): Promise<CustomizedResume> {
    const jobText = `${input.job.title}\n${input.job.requirements ?? ''}\n${input.job.description}`;
    const target =
      input.analysis &&
      (input.analysis.requiredSkills.length || input.analysis.preferredSkills.length)
        ? [...input.analysis.requiredSkills, ...input.analysis.preferredSkills]
        : extractSkillsFromText(jobText);
    const targetNorm = target.map(normalizeText);

    const isRelevant = (name: string): boolean => {
      const n = normalizeText(name);
      return targetNorm.some((t) => t === n || t.includes(n) || n.includes(t));
    };

    // Reorder existing skills: job-relevant ones first (order preserved within groups).
    const relevant = input.profile.skills.filter((s) => isRelevant(s.name));
    const rest = input.profile.skills.filter((s) => !isRelevant(s.name));
    const highlightedSkills = [...relevant, ...rest].map((s) => s.name);

    // ATS keywords the candidate legitimately possesses.
    const keywords = target.filter((t) =>
      input.profile.skills.some((s) => hasSkill(new Set([normalizeText(s.name)]), t)),
    );

    // Reorder each experience's bullets: those mentioning target skills first.
    const experiences = input.profile.experiences.map((e) => {
      const bullets = [...e.highlights].sort((a, b) => score(b, targetNorm) - score(a, targetNorm));
      return { company: e.company, title: e.title, bullets };
    });

    const years = estimateYears(input.profile);
    const summary =
      input.profile.summary ??
      `${input.job.title} candidate with ${years > 0 ? `${years}+ years of ` : ''}experience in ${highlightedSkills.slice(0, 5).join(', ')}.`;

    const required = input.analysis?.requiredSkills ?? [];
    const atsScore = required.length
      ? Math.round(
          (required.filter((s) => hasSkill(new Set(highlightedSkills.map(normalizeText)), s))
            .length /
            required.length) *
            100,
        )
      : Math.min(100, 50 + keywords.length * 5);

    return Promise.resolve({ summary, highlightedSkills, experiences, keywords, atsScore });
  }
}

/** Bullets containing more target keywords sort higher. */
function score(text: string, targetNorm: string[]): number {
  const t = normalizeText(text);
  return targetNorm.reduce((acc, kw) => (kw && t.includes(kw) ? acc + 1 : acc), 0);
}
