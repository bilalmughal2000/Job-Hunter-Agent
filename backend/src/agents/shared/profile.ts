import type { ResumeProfileDTO } from '@ajh/shared';
import { normalizeText } from '../../utils/text.js';

/** Lowercased set of the candidate's skill names. */
export function candidateSkillSet(profile: ResumeProfileDTO): Set<string> {
  return new Set(profile.skills.map((s) => normalizeText(s.name)).filter(Boolean));
}

/** Rough total years of experience from parsed experience date ranges. */
export function estimateYears(profile: ResumeProfileDTO): number {
  let months = 0;
  for (const exp of profile.experiences) {
    if (!exp.startDate) continue;
    const start = new Date(exp.startDate).getTime();
    const end = exp.isCurrent || !exp.endDate ? Date.now() : new Date(exp.endDate).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      months += (end - start) / (1000 * 60 * 60 * 24 * 30.4);
    }
  }
  return Math.round((months / 12) * 10) / 10;
}

/** Parse a required-years figure from a free-text experience requirement. */
export function requiredYears(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = /(\d{1,2})\s*\+?\s*(?:years|yrs|year)/i.exec(text);
  return m?.[1] ? Number(m[1]) : null;
}

/** Case-insensitive membership: is `skill` present in the candidate set? */
export function hasSkill(set: Set<string>, skill: string): boolean {
  const n = normalizeText(skill);
  if (set.has(n)) return true;
  // Allow partial matches ("react" ⊂ "react native", "node" ⊂ "node.js").
  for (const s of set) {
    if (s.includes(n) || n.includes(s)) return true;
  }
  return false;
}
