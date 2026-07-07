/**
 * Idempotent seed. Safe to run repeatedly (uses upserts).
 *   npm run prisma:seed --workspace=@ajh/backend
 */
import 'dotenv/config';
import {
  EmploymentType,
  JobSourceKind,
  JobStatus,
  PrismaClient,
  RemoteType,
  Role,
  SkillType,
} from '@prisma/client';

const prisma = new PrismaClient();

const JOB_SOURCES: { kind: JobSourceKind; displayName: string; baseUrl?: string }[] = [
  {
    kind: JobSourceKind.LINKEDIN,
    displayName: 'LinkedIn Jobs',
    baseUrl: 'https://www.linkedin.com/jobs',
  },
  { kind: JobSourceKind.INDEED, displayName: 'Indeed', baseUrl: 'https://pk.indeed.com' },
  { kind: JobSourceKind.ROZEE, displayName: 'Rozee.pk', baseUrl: 'https://www.rozee.pk' },
  { kind: JobSourceKind.MUSTAKBIL, displayName: 'Mustakbil', baseUrl: 'https://www.mustakbil.com' },
  { kind: JobSourceKind.WELLFOUND, displayName: 'Wellfound', baseUrl: 'https://wellfound.com' },
  { kind: JobSourceKind.GOOGLE_JOBS, displayName: 'Google Jobs' },
  { kind: JobSourceKind.GREENHOUSE, displayName: 'Greenhouse' },
  { kind: JobSourceKind.LEVER, displayName: 'Lever' },
  { kind: JobSourceKind.COMPANY_CAREER, displayName: 'Company Career Pages' },
  { kind: JobSourceKind.MANUAL, displayName: 'Manual Entry' },
];

const SKILLS: { name: string; type: SkillType }[] = [
  ...[
    'Angular',
    'TypeScript',
    'JavaScript',
    'RxJS',
    'Angular Material',
    'NgRx',
    'Signals',
    'HTML5',
    'CSS3',
    'SCSS',
    'Tailwind CSS',
    'Jest',
    'Karma',
    'Cypress',
    'Playwright',
    'Node.js',
    'REST APIs',
    'GraphQL',
    'Git',
    'Webpack',
    'Vite',
    'Azure',
    'AWS',
    'Docker',
    'CI/CD',
  ].map((name) => ({ name, type: SkillType.TECHNICAL })),
  ...['Communication', 'Teamwork', 'Problem Solving', 'Ownership', 'Mentoring'].map((name) => ({
    name,
    type: SkillType.SOFT,
  })),
];

async function main(): Promise<void> {
  // Job sources
  for (const s of JOB_SOURCES) {
    await prisma.jobSource.upsert({
      where: { kind: s.kind },
      update: { displayName: s.displayName, baseUrl: s.baseUrl ?? null },
      create: { kind: s.kind, displayName: s.displayName, baseUrl: s.baseUrl ?? null },
    });
  }

  // Canonical skills dictionary
  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: { type: skill.type },
      create: skill,
    });
  }

  // Demo user (password hashing wired up in Phase 6 — this is a placeholder hash).
  const demo = await prisma.user.upsert({
    where: { email: 'demo@jobhunter.local' },
    update: {},
    create: {
      email: 'demo@jobhunter.local',
      name: 'Demo Hunter',
      role: Role.ADMIN,
      passwordHash: 'SEED_PLACEHOLDER_set_via_registration_in_phase_6',
      preferences: {
        create: {
          keywords: ['Angular', 'Frontend', 'Frontend Developer'],
          excludeKeywords: ['PHP', 'WordPress'],
          locations: ['Lahore, Pakistan'],
          remoteTypes: [RemoteType.ON_SITE, RemoteType.HYBRID, RemoteType.REMOTE],
          minMatchScore: 70,
        },
      },
    },
  });

  // Demo company + jobs so the dashboard has something to render.
  const tkxel = await prisma.company.upsert({
    where: { name_location: { name: 'Tkxel', location: 'Lahore, Pakistan' } },
    update: {},
    create: {
      name: 'Tkxel',
      location: 'Lahore, Pakistan',
      website: 'https://www.tkxel.com',
      industry: 'Software',
    },
  });

  await prisma.job.upsert({
    where: { url: 'https://example.com/jobs/tkxel-angular-1' },
    update: {},
    create: {
      title: 'Frontend Angular Developer',
      companyId: tkxel.id,
      location: 'Lahore, Pakistan',
      country: 'Pakistan',
      salary: 'PKR 250,000 - 400,000',
      experience: '3+ years',
      employmentType: EmploymentType.FULL_TIME,
      remoteType: RemoteType.HYBRID,
      description:
        'We are looking for a Frontend Angular Developer with strong TypeScript and RxJS skills.',
      requirements: 'Angular, TypeScript, RxJS, Angular Material, REST APIs.',
      url: 'https://example.com/jobs/tkxel-angular-1',
      source: JobSourceKind.MANUAL,
      externalId: 'tkxel-angular-1',
      status: JobStatus.NEW,
      missingSkills: ['Azure'],
      matchScore: 92,
    },
  });

  const counts = {
    users: await prisma.user.count(),
    jobSources: await prisma.jobSource.count(),
    skills: await prisma.skill.count(),
    companies: await prisma.company.count(),
    jobs: await prisma.job.count(),
  };
  console.log('✅ Seed complete:', counts, `(demo user: ${demo.email})`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
