import type { JobAnalysis } from '@ajh/shared';
import { extractSkillsFromText } from '../shared/lexicon.js';
import type { JobAnalysisAgent, JobAnalysisInput } from './types.js';

const PREFERRED_CUES = /(preferred|nice[ -]to[ -]have|plus|bonus|a plus|good to have|desirable)/i;
const BULLET = /^[\s•·▪◦*\-–—]+/;

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Deterministic job analysis — lexicon-based skill extraction + text heuristics. */
export class HeuristicJobAnalysisAgent implements JobAnalysisAgent {
  readonly name = 'heuristic-job-analysis';

  analyze(input: JobAnalysisInput): Promise<JobAnalysis> {
    const reqText = input.requirements ?? '';
    const allText = `${input.description}\n${reqText}`;

    // Bucket skills by fine-grained segment (line → sentence → clause) so a
    // segment cued as "preferred/nice-to-have" doesn't drag a whole line's
    // required skills with it.
    const segments = allText
      .split('\n')
      .flatMap((line) => line.split(/(?<=[.!?;])\s+/))
      .map((s) => s.trim())
      .filter(Boolean);

    const preferredText = segments.filter((s) => PREFERRED_CUES.test(s)).join('\n');
    const requiredText = segments.filter((s) => !PREFERRED_CUES.test(s)).join('\n');

    const preferredSkills = extractSkillsFromText(preferredText);
    const preferredSet = new Set(preferredSkills.map((s) => s.toLowerCase()));
    const requiredSkills = extractSkillsFromText(requiredText).filter(
      (s) => !preferredSet.has(s.toLowerCase()),
    );

    // `lines` retained for responsibilities/bullet extraction below.
    const lines = allText.split('\n');

    const responsibilities = lines
      .filter((l) => BULLET.test(l))
      .map((l) => l.replace(BULLET, '').trim())
      .filter(Boolean)
      .slice(0, 12);

    const benefits = (input.benefits ?? '')
      .split(/[,\n•·]+/)
      .map((b) => b.replace(BULLET, '').trim())
      .filter(Boolean);

    const summary = sentences(input.description).slice(0, 2).join(' ').slice(0, 300);

    return Promise.resolve({
      summary: summary || input.title,
      requiredSkills,
      preferredSkills,
      responsibilities,
      benefits,
      salary: input.salary,
    });
  }
}
