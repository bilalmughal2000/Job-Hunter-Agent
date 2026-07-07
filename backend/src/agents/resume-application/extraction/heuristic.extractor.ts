import {
  type ExtractedProfile,
  type ExtractedSkill,
  SkillType,
  type ExtractedExperience,
  type ExtractedEducation,
} from '@ajh/shared';
import type { StructuredExtractor } from './types.js';

/** Canonical section keys we bucket resume content into. */
type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'awards';

const SECTION_ALIASES: Record<SectionKey, string[]> = {
  summary: ['summary', 'professional summary', 'profile', 'objective', 'about', 'about me'],
  experience: [
    'experience',
    'work experience',
    'professional experience',
    'employment',
    'employment history',
    'work history',
  ],
  education: ['education', 'academic background', 'academics'],
  skills: ['skills', 'technical skills', 'core competencies', 'technologies', 'tech stack'],
  projects: ['projects', 'personal projects', 'selected projects', 'notable projects'],
  certifications: ['certifications', 'certificates', 'licenses', 'licenses & certifications'],
  languages: ['languages'],
  awards: ['awards', 'honors', 'achievements', 'awards & honors'],
};

const SOFT_SKILLS = new Set([
  'communication',
  'teamwork',
  'leadership',
  'problem solving',
  'problem-solving',
  'time management',
  'adaptability',
  'collaboration',
  'mentoring',
  'ownership',
  'critical thinking',
  'creativity',
]);

const BULLET = /^[\s•·▪◦*\-–—]+/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(?:(?:\+|00)\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?){2,4}\d{2,4}/;
// Non-global for single-match .test()/.exec() (avoids the stateful lastIndex
// footgun); the global variant is used only for .match() (find-all).
const URL_RE = /\bhttps?:\/\/[^\s)]+|\bwww\.[^\s)]+/i;
const URL_RE_G = /\bhttps?:\/\/[^\s)]+|\bwww\.[^\s)]+/gi;
const DATE_RANGE_RE =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\d{4})\s*(?:-|–|—|to)\s*(present|current|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?\d{4})/i;

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/** "Jan 2020" / "2020" → ISO "2020-01-01"; unparseable → null. */
function toIsoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const year = /\b(19|20)\d{2}\b/.exec(raw)?.[0];
  if (!year) return null;
  const monthKey = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i
    .exec(raw)?.[1]
    ?.toLowerCase();
  const month = monthKey ? MONTHS[monthKey] : '01';
  return `${year}-${month ?? '01'}-01`;
}

/**
 * Rule-based resume parser. Deterministic and dependency-free so it is fully
 * unit-testable and runs offline. The AI-backed StructuredExtractor (Phase 5)
 * implements the same interface and can replace/augment this.
 */
export class HeuristicStructuredExtractor implements StructuredExtractor {
  readonly name = 'heuristic';

  extract(rawText: string): Promise<ExtractedProfile> {
    const normalized = rawText.replace(/\r\n?/g, '\n');
    const lines = normalized.split('\n').map((l) => l.trim());
    const { preamble, sections } = this.partition(lines);

    const links = this.extractLinks(normalized);
    const profile: ExtractedProfile = {
      fullName: this.guessName(preamble),
      headline: null,
      summary: this.joinSection(sections.summary) || null,
      email: EMAIL_RE.exec(normalized)?.[0] ?? null,
      phone: this.extractPhone(preamble.join(' ')),
      location: null,
      ...links,
      skills: this.parseSkills(sections.skills),
      experiences: this.parseExperiences(sections.experience),
      projects: this.parseProjects(sections.projects),
      educations: this.parseEducation(sections.education),
      certifications: this.parseSimpleList(sections.certifications).map((name) => ({
        name,
        issuer: null,
        issueDate: null,
        expiryDate: null,
        credentialId: null,
        url: null,
      })),
      languages: this.parseLanguages(sections.languages),
      awards: this.parseSimpleList(sections.awards).map((title) => ({
        title,
        issuer: null,
        date: null,
        description: null,
      })),
    };
    return Promise.resolve(profile);
  }

  /** Match a line to a section header, returning its canonical key if any. */
  private matchHeader(line: string): SectionKey | null {
    const cleaned = line
      .toLowerCase()
      .replace(/[:*#]+$/g, '')
      .replace(/^[#\s]+/, '')
      .trim();
    if (!cleaned || cleaned.split(/\s+/).length > 4) return null;
    for (const key of Object.keys(SECTION_ALIASES) as SectionKey[]) {
      if (SECTION_ALIASES[key].includes(cleaned)) return key;
    }
    return null;
  }

  private partition(lines: string[]): {
    preamble: string[];
    sections: Record<SectionKey, string[]>;
  } {
    const sections = {
      summary: [],
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      awards: [],
    } as Record<SectionKey, string[]>;
    const preamble: string[] = [];
    let current: SectionKey | null = null;

    for (const line of lines) {
      const header = this.matchHeader(line);
      if (header) {
        current = header;
        continue;
      }
      if (current) sections[current].push(line);
      else preamble.push(line);
    }
    return { preamble, sections };
  }

  private extractLinks(text: string): {
    githubUrl: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    websiteUrl: string | null;
  } {
    const urls = text.match(URL_RE_G) ?? [];
    const norm = (u: string) => (u.startsWith('http') ? u : `https://${u}`);
    let github: string | null = null;
    let linkedin: string | null = null;
    const others: string[] = [];
    for (const raw of urls) {
      const u = norm(raw.replace(/[.,;]+$/, ''));
      if (/github\.com/i.test(u)) github ??= u;
      else if (/linkedin\.com/i.test(u)) linkedin ??= u;
      else others.push(u);
    }
    return {
      githubUrl: github,
      linkedinUrl: linkedin,
      portfolioUrl: others[0] ?? null,
      websiteUrl: others[1] ?? null,
    };
  }

  private extractPhone(text: string): string | null {
    // Avoid matching a bare year; require at least 7 digits overall.
    const match = PHONE_RE.exec(text)?.[0]?.trim();
    if (!match) return null;
    const digits = match.replace(/\D/g, '');
    return digits.length >= 7 ? match : null;
  }

  private guessName(preamble: string[]): string | null {
    for (const line of preamble) {
      if (!line) continue;
      if (EMAIL_RE.test(line) || URL_RE.test(line) || /\d/.test(line)) continue;
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && /^[A-Za-z][A-Za-z.'-]*$/.test(words[0] ?? '')) {
        return line;
      }
    }
    return null;
  }

  private joinSection(lines: string[]): string {
    return lines.filter(Boolean).join(' ').trim();
  }

  private parseSkills(lines: string[]): ExtractedSkill[] {
    const tokens = lines
      .join('\n')
      .split(/[,|/;\n•·]+/)
      .map((s) => s.replace(BULLET, '').trim())
      .filter((s) => s.length > 0 && s.length <= 40);
    const seen = new Set<string>();
    const skills: ExtractedSkill[] = [];
    for (const token of tokens) {
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      skills.push({
        name: token,
        type: SOFT_SKILLS.has(key) ? SkillType.SOFT : SkillType.TECHNICAL,
      });
    }
    return skills;
  }

  /** Split a section into blocks separated by blank lines. */
  private blocks(lines: string[]): string[][] {
    const result: string[][] = [];
    let block: string[] = [];
    for (const line of lines) {
      if (line === '') {
        if (block.length) result.push(block);
        block = [];
      } else block.push(line);
    }
    if (block.length) result.push(block);
    return result;
  }

  private parseExperiences(lines: string[]): ExtractedExperience[] {
    return this.blocks(lines).map((block) => {
      const header = block[0] ?? '';
      const dateMatch = block.map((l) => DATE_RANGE_RE.exec(l)).find(Boolean) ?? null;
      const isCurrent = dateMatch ? /present|current/i.test(dateMatch[0]) : false;

      let title = header;
      let company = '';
      const atSplit = header.split(/\s+at\s+/i);
      if (atSplit.length === 2) {
        title = atSplit[0]!.trim();
        company = atSplit[1]!.trim();
      } else {
        const sep = header.split(/\s*[|–—-]\s*/);
        if (sep.length >= 2) {
          title = sep[0]!.trim();
          company = sep[1]!.trim();
        }
      }

      const highlights = block
        .slice(1)
        .filter((l) => BULLET.test(l))
        .map((l) => l.replace(BULLET, '').trim())
        .filter(Boolean);

      return {
        company: company || 'Unknown',
        title: title.replace(DATE_RANGE_RE, '').trim() || 'Unknown',
        location: null,
        startDate: toIsoDate(dateMatch?.[0]?.split(/-|–|—|to/i)[0]),
        endDate: isCurrent ? null : toIsoDate(dateMatch?.[0]?.split(/-|–|—|to/i)[1]),
        isCurrent,
        description: null,
        highlights,
      };
    });
  }

  private parseProjects(lines: string[]): ExtractedProfile['projects'] {
    return this.blocks(lines).map((block) => {
      const name = (block[0] ?? '')
        .replace(BULLET, '')
        .replace(/[:–—-].*$/, '')
        .trim();
      const url = URL_RE.exec(block.join(' '))?.[0] ?? null;
      const techLine = block.find((l) => /^(tech|technologies|stack)\s*:/i.test(l));
      const technologies = techLine
        ? techLine
            .replace(/^[^:]*:/, '')
            .split(/[,|/]+/)
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      return {
        name: name || 'Untitled project',
        description:
          block
            .slice(1)
            .filter((l) => !/^(tech|technologies|stack)\s*:/i.test(l))
            .join(' ')
            .trim() || null,
        url: url ? (url.startsWith('http') ? url : `https://${url}`) : null,
        technologies,
      };
    });
  }

  private parseEducation(lines: string[]): ExtractedEducation[] {
    return this.blocks(lines).map((block) => {
      const text = block.join(' ');
      const institution =
        block.find((l) => /university|college|institute|school|academy/i.test(l)) ?? block[0] ?? '';
      const degree =
        block.find((l) =>
          /bachelor|master|b\.?s\.?|m\.?s\.?|phd|ph\.?d|diploma|bsc|msc|be\b|mba/i.test(l),
        ) ?? null;
      const dateMatch = DATE_RANGE_RE.exec(text);
      return {
        institution: institution.trim() || 'Unknown',
        degree: degree?.trim() ?? null,
        fieldOfStudy: null,
        startDate: toIsoDate(dateMatch?.[0]?.split(/-|–|—|to/i)[0]),
        endDate: toIsoDate(dateMatch?.[0]?.split(/-|–|—|to/i)[1]),
        grade: /gpa|cgpa/i.exec(text) ? (text.match(/\d\.\d{1,2}/)?.[0] ?? null) : null,
      };
    });
  }

  private parseLanguages(lines: string[]): ExtractedProfile['languages'] {
    return lines
      .join('\n')
      .split(/[,\n•·]+/)
      .map((s) => s.replace(BULLET, '').trim())
      .filter(Boolean)
      .map((entry) => {
        const m = /^(.+?)\s*[($\-–—:]\s*(.+?)\)?$/.exec(entry);
        return m
          ? { name: m[1]!.trim(), proficiency: m[2]!.replace(/\)$/, '').trim() }
          : { name: entry, proficiency: null };
      });
  }

  private parseSimpleList(lines: string[]): string[] {
    return lines.map((l) => l.replace(BULLET, '').trim()).filter(Boolean);
  }
}
