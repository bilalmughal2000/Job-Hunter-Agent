/**
 * A pragmatic lexicon of tech skills for heuristic extraction from job text.
 * Not exhaustive — the LLM agents cover the long tail; this makes the offline
 * default useful for the frontend/Angular domain this app targets.
 */
export const SKILL_LEXICON: string[] = [
  'Angular',
  'AngularJS',
  'React',
  'React Native',
  'Vue',
  'Svelte',
  'Next.js',
  'Nuxt',
  'TypeScript',
  'JavaScript',
  'ES6',
  'RxJS',
  'NgRx',
  'Redux',
  'Signals',
  'Zustand',
  'HTML',
  'HTML5',
  'CSS',
  'CSS3',
  'SCSS',
  'SASS',
  'LESS',
  'Tailwind CSS',
  'Tailwind',
  'Bootstrap',
  'Angular Material',
  'Material UI',
  'Storybook',
  'Jest',
  'Jasmine',
  'Karma',
  'Cypress',
  'Playwright',
  'Vitest',
  'Testing Library',
  'Node.js',
  'Node',
  'Express',
  'NestJS',
  'REST',
  'REST APIs',
  'GraphQL',
  'WebSockets',
  'Git',
  'GitHub',
  'GitLab',
  'Webpack',
  'Vite',
  'Rollup',
  'Nx',
  'Babel',
  'ESLint',
  'Azure',
  'AWS',
  'GCP',
  'Docker',
  'Kubernetes',
  'CI/CD',
  'Jenkins',
  'GitHub Actions',
  'Figma',
  'Accessibility',
  'WCAG',
  'PWA',
  'Micro-frontends',
  'SSR',
  'i18n',
  'Agile',
  'Scrum',
  'Jira',
  'SQL',
  'PostgreSQL',
  'MongoDB',
  'Firebase',
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Return the lexicon skills that appear (word-boundary, case-insensitive) in
 * `text`, preserving the lexicon's canonical casing and de-duplicating.
 */
export function extractSkillsFromText(text: string, lexicon: string[] = SKILL_LEXICON): string[] {
  const found = new Map<string, string>();
  for (const skill of lexicon) {
    const pattern = new RegExp(`(?<![\\w])${escapeRegExp(skill)}(?![\\w])`, 'i');
    if (pattern.test(text) && !found.has(skill.toLowerCase())) {
      found.set(skill.toLowerCase(), skill);
    }
  }
  return [...found.values()];
}
