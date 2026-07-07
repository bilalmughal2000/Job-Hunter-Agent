import type { CoverLetterResult } from '@ajh/shared';
import type { CoverLetterAgent, CoverLetterInput } from './types.js';

/** Deterministic, professional template — no AI, no fabrication. */
export class TemplateCoverLetterAgent implements CoverLetterAgent {
  readonly name = 'template-cover-letter';

  generate(input: CoverLetterInput): Promise<CoverLetterResult> {
    const name = input.profile.fullName ?? 'The Applicant';
    const company = input.job.company ?? 'your company';
    const skills =
      (input.emphasizeSkills?.length
        ? input.emphasizeSkills
        : input.profile.skills.slice(0, 4).map((s) => s.name)
      )
        .slice(0, 4)
        .join(', ') || 'the required technologies';
    const highlight = input.profile.experiences[0]?.highlights[0];
    const currentRole = input.profile.experiences[0]?.title;

    const content = [
      `Dear Hiring Team at ${company},`,
      ``,
      `I am writing to apply for the ${input.job.title} position. ${
        currentRole ? `As a ${currentRole}, ` : ''
      }I bring hands-on experience with ${skills}, which align closely with the requirements of this role.`,
      ``,
      highlight
        ? `In my recent work, ${highlight.charAt(0).toLowerCase()}${highlight.slice(1)} I am confident I can bring the same impact to ${company}.`
        : `I am confident I can contribute meaningfully to ${company} from day one.`,
      ``,
      `${input.profile.summary ?? ''}`.trim(),
      ``,
      `Thank you for considering my application. I would welcome the opportunity to discuss how my background fits your team.`,
      ``,
      `Sincerely,`,
      name,
    ]
      .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
      .join('\n');

    return Promise.resolve({ content, tone: 'professional' });
  }
}
