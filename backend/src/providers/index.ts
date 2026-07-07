import { JobSource } from '@ajh/shared';
import { ProviderRegistry } from './registry.js';
import { SampleProvider } from './sample.provider.js';
import { RemotiveProvider } from './remotive.provider.js';
import { CompliantStubProvider } from './stub.provider.js';
import type { ProviderContext } from './types.js';

export { ProviderRegistry } from './registry.js';
export { BaseProvider } from './base.provider.js';
export { SampleProvider } from './sample.provider.js';
export { RemotiveProvider } from './remotive.provider.js';
export { CompliantStubProvider } from './stub.provider.js';
export type { JobSourceProvider, ProviderContext } from './types.js';

/** Real sources that need a compliant integration (disabled until configured). */
const COMPLIANT_SOURCES: { source: JobSource; displayName: string }[] = [
  { source: JobSource.LINKEDIN, displayName: 'LinkedIn Jobs' },
  { source: JobSource.INDEED, displayName: 'Indeed' },
  { source: JobSource.ROZEE, displayName: 'Rozee.pk' },
  { source: JobSource.MUSTAKBIL, displayName: 'Mustakbil' },
  { source: JobSource.WELLFOUND, displayName: 'Wellfound' },
  { source: JobSource.GOOGLE_JOBS, displayName: 'Google Jobs' },
  { source: JobSource.GREENHOUSE, displayName: 'Greenhouse' },
  { source: JobSource.LEVER, displayName: 'Lever' },
  { source: JobSource.COMPANY_CAREER, displayName: 'Company Career Pages' },
];

/**
 * Builds the default registry:
 *  - RemotiveProvider — REAL, free, key-less live remote jobs (enabled).
 *  - SampleProvider — offline fixtures, useful for demos/tests (enabled).
 *  - a disabled compliant stub for every gated source (LinkedIn, Indeed, …).
 * Swap a stub for a real subclass once a ToS-compliant integration exists.
 */
export function buildDefaultRegistry(ctx: ProviderContext): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(new RemotiveProvider(ctx));
  registry.register(new SampleProvider(ctx));
  for (const cfg of COMPLIANT_SOURCES) {
    registry.register(new CompliantStubProvider(ctx, cfg));
  }
  return registry;
}
