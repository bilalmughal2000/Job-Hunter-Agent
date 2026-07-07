import { EmploymentType, JobSource, type NormalizedJob, RemoteType } from '@ajh/shared';

/**
 * Deterministic sample dataset backing the SampleProvider. It lets the whole
 * search → dedup → persist pipeline run end-to-end (and be tested) without
 * contacting any external site. Includes an intentional near-duplicate
 * (different source + URL, same role) to exercise the Deduplication Agent.
 */
export const SAMPLE_JOBS: NormalizedJob[] = [
  {
    title: 'Frontend Angular Developer',
    company: 'Tkxel',
    location: 'Lahore, Pakistan',
    country: 'Pakistan',
    salary: 'PKR 250,000 - 400,000',
    experience: '3+ years',
    employmentType: EmploymentType.FULL_TIME,
    remoteType: RemoteType.HYBRID,
    description:
      'Build rich SPAs with Angular, TypeScript and RxJS. Collaborate with backend teams over REST APIs.',
    requirements: 'Angular, TypeScript, RxJS, Angular Material, REST APIs',
    benefits: 'Health insurance, annual bonus',
    url: 'https://sample.jobs/tkxel/frontend-angular-1',
    source: JobSource.MANUAL,
    postedDate: '2026-07-05T00:00:00.000Z',
    externalId: 'sample-tkxel-1',
  },
  {
    // Near-duplicate of the above from a different source (dedup should catch it).
    title: 'Angular Frontend Developer',
    company: 'Tkxel',
    location: 'Lahore',
    country: 'Pakistan',
    salary: null,
    experience: '3 years',
    employmentType: EmploymentType.FULL_TIME,
    remoteType: RemoteType.HYBRID,
    description: 'Angular developer role building single-page applications with TypeScript.',
    requirements: 'Angular, TypeScript, RxJS',
    benefits: null,
    url: 'https://another-board.example/listing/999',
    source: JobSource.GOOGLE_JOBS,
    postedDate: '2026-07-04T00:00:00.000Z',
    externalId: 'gj-999',
  },
  {
    title: 'Senior Angular Engineer',
    company: 'Systems Limited',
    location: 'Lahore, Pakistan',
    country: 'Pakistan',
    salary: 'PKR 400,000 - 600,000',
    experience: '5+ years',
    employmentType: EmploymentType.FULL_TIME,
    remoteType: RemoteType.ON_SITE,
    description:
      'Lead frontend architecture for enterprise products using Angular, NgRx and Signals.',
    requirements: 'Angular, NgRx, Signals, TypeScript, leadership',
    benefits: 'Provident fund, medical',
    url: 'https://sample.jobs/systems/senior-angular-2',
    source: JobSource.MANUAL,
    postedDate: '2026-07-06T00:00:00.000Z',
    externalId: 'sample-systems-2',
  },
  {
    title: 'Remote React Developer',
    company: 'Arbisoft',
    location: 'Remote',
    country: 'Pakistan',
    salary: 'PKR 350,000 - 500,000',
    experience: '4+ years',
    employmentType: EmploymentType.FULL_TIME,
    remoteType: RemoteType.REMOTE,
    description: 'Build React applications for international clients. Not an Angular role.',
    requirements: 'React, Redux, TypeScript',
    benefits: 'Remote-first, learning budget',
    url: 'https://sample.jobs/arbisoft/react-3',
    source: JobSource.MANUAL,
    postedDate: '2026-07-03T00:00:00.000Z',
    externalId: 'sample-arbisoft-3',
  },
];
