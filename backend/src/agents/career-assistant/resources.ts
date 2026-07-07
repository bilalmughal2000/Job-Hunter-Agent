import { normalizeText } from '../../utils/text.js';

/** Curated learning resources for common skills; unknown skills get a search link. */
const RESOURCES: Record<string, { resource: string; url: string }> = {
  angular: { resource: 'Angular official tutorials', url: 'https://angular.dev/tutorials' },
  typescript: { resource: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/' },
  javascript: {
    resource: 'MDN JavaScript Guide',
    url: 'https://developer.mozilla.org/docs/Web/JavaScript',
  },
  rxjs: { resource: 'RxJS Guide', url: 'https://rxjs.dev/guide/overview' },
  ngrx: { resource: 'NgRx Store docs', url: 'https://ngrx.io/guide/store' },
  signals: { resource: 'Angular Signals guide', url: 'https://angular.dev/guide/signals' },
  react: { resource: 'React Learn', url: 'https://react.dev/learn' },
  css: { resource: 'MDN CSS', url: 'https://developer.mozilla.org/docs/Web/CSS' },
  scss: { resource: 'Sass documentation', url: 'https://sass-lang.com/documentation/' },
  tailwind: { resource: 'Tailwind CSS docs', url: 'https://tailwindcss.com/docs' },
  jest: { resource: 'Jest docs', url: 'https://jestjs.io/docs/getting-started' },
  cypress: { resource: 'Cypress docs', url: 'https://docs.cypress.io' },
  playwright: { resource: 'Playwright docs', url: 'https://playwright.dev/docs/intro' },
  'node.js': { resource: 'Node.js docs', url: 'https://nodejs.org/docs/latest/api/' },
  graphql: { resource: 'GraphQL learn', url: 'https://graphql.org/learn/' },
  docker: { resource: 'Docker get started', url: 'https://docs.docker.com/get-started/' },
  aws: { resource: 'AWS Skill Builder (free)', url: 'https://skillbuilder.aws/' },
  azure: { resource: 'Microsoft Learn — Azure', url: 'https://learn.microsoft.com/azure/' },
  accessibility: { resource: 'web.dev Accessibility', url: 'https://web.dev/learn/accessibility/' },
};

export function learningResourceFor(skill: string): {
  skill: string;
  resource: string;
  url: string;
} {
  const key = normalizeText(skill);
  const hit = RESOURCES[key] ?? Object.entries(RESOURCES).find(([k]) => key.includes(k))?.[1];
  if (hit) return { skill, ...hit };
  return {
    skill,
    resource: `Search: learn ${skill}`,
    url: `https://www.google.com/search?q=${encodeURIComponent('learn ' + skill)}`,
  };
}
