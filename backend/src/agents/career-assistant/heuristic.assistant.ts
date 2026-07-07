import type { CareerAssistInput, CareerAssistantAgent, GeneratedGuidance } from './types.js';

/** Deterministic career guidance from the job + match (no AI). */
export class HeuristicCareerAssistant implements CareerAssistantAgent {
  readonly name = 'heuristic-assistant';

  generate(input: CareerAssistInput): Promise<GeneratedGuidance> {
    const { job, analysis, match } = input;
    const firstSentence = job.description.split(/(?<=[.!?])\s/)[0] ?? job.description;

    const companySummary =
      `${job.company ?? 'The company'} is hiring a ${job.title}. ${firstSentence}`.slice(0, 400);

    const skillsForQuestions = (
      analysis.requiredSkills.length ? analysis.requiredSkills : match.strongSkills
    ).slice(0, 5);
    const interviewQuestions = [
      ...skillsForQuestions.map((s) => `Walk me through a project where you used ${s}.`),
      'Describe a challenging bug you fixed and how you approached it.',
      'How do you keep your frontend work performant and accessible?',
    ];

    const resumeSuggestions: string[] = [];
    if (!input.profile.summary)
      resumeSuggestions.push('Add a concise professional summary at the top.');
    if (match.missingSkills.length > 0) {
      resumeSuggestions.push(
        `Emphasize any exposure to: ${match.missingSkills.join(', ')} (or plan to learn them).`,
      );
    }
    resumeSuggestions.push(
      `Mirror the job's keywords (${analysis.requiredSkills.slice(0, 6).join(', ')}) in your experience bullets.`,
      'Quantify impact in bullets (%, users, latency) where you can.',
    );

    return Promise.resolve({ companySummary, interviewQuestions, resumeSuggestions });
  }
}
