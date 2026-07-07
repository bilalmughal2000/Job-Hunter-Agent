import { beforeAll, describe, expect, it } from 'vitest';
import { SkillType, type ExtractedProfile } from '@ajh/shared';
import { HeuristicStructuredExtractor } from '../src/agents/resume-application/extraction/index.js';
import { SAMPLE_RESUME_TEXT } from './fixtures/sample-resume.js';

describe('HeuristicStructuredExtractor', () => {
  const extractor = new HeuristicStructuredExtractor();
  let profile: ExtractedProfile;

  beforeAll(async () => {
    profile = await extractor.extract(SAMPLE_RESUME_TEXT);
  });

  it('extracts contact info', () => {
    expect(profile.fullName).toBe('Ayesha Khan');
    expect(profile.email).toBe('ayesha.khan@example.com');
    expect(profile.phone).toContain('92 300 1234567');
  });

  it('classifies and normalizes links', () => {
    expect(profile.githubUrl).toBe('https://github.com/ayeshak');
    expect(profile.linkedinUrl).toBe('https://linkedin.com/in/ayeshak');
    expect(profile.portfolioUrl).toBe('https://ayesha.dev');
  });

  it('captures the summary', () => {
    expect(profile.summary).toContain('Frontend engineer with 5 years');
  });

  it('extracts skills and classifies soft vs technical', () => {
    const names = profile.skills.map((s) => s.name);
    expect(names).toContain('Angular');
    expect(names).toContain('TypeScript');
    const comms = profile.skills.find((s) => s.name.toLowerCase() === 'communication');
    expect(comms?.type).toBe(SkillType.SOFT);
    const angular = profile.skills.find((s) => s.name === 'Angular');
    expect(angular?.type).toBe(SkillType.TECHNICAL);
  });

  it('parses experience with company, title, dates and current flag', () => {
    expect(profile.experiences.length).toBe(2);
    const [first, second] = profile.experiences;
    expect(first?.title).toBe('Senior Angular Developer');
    expect(first?.company).toBe('Tkxel');
    expect(first?.isCurrent).toBe(true);
    expect(first?.startDate).toBe('2021-01-01');
    expect(first?.highlights.length).toBe(2);
    expect(second?.company).toBe('Systems Limited');
    expect(second?.isCurrent).toBe(false);
    expect(second?.endDate).toBe('2021-01-01');
  });

  it('parses projects with technologies', () => {
    expect(profile.projects.length).toBe(1);
    expect(profile.projects[0]?.name).toBe('Portfolio Dashboard');
    expect(profile.projects[0]?.technologies).toEqual(['Angular', 'D3.js', 'RxJS']);
  });

  it('parses education', () => {
    expect(profile.educations.length).toBe(1);
    const ed = profile.educations[0];
    expect(ed?.institution).toContain('University of the Punjab');
    expect(ed?.degree).toContain('BSc');
    expect(ed?.grade).toBe('3.7');
  });

  it('parses certifications, languages, and awards', () => {
    expect(profile.certifications.map((c) => c.name)).toContain('Google Associate Cloud Engineer');
    const english = profile.languages.find((l) => l.name === 'English');
    expect(english?.proficiency).toBe('Fluent');
    expect(profile.awards[0]?.title).toContain('Employee of the Year');
  });

  it('handles empty input without throwing', async () => {
    const empty = await extractor.extract('');
    expect(empty.skills).toEqual([]);
    expect(empty.experiences).toEqual([]);
    expect(empty.fullName).toBeNull();
  });

  it('handles unstructured garbage input gracefully', async () => {
    const garbage = await extractor.extract('!!! ### $$$ \n 12345 \n ~~~~');
    expect(garbage.experiences).toEqual([]);
    expect(garbage.email).toBeNull();
  });
});
