import type { Request } from 'express';

/**
 * Resolves the acting user for endpoints that predate auth. Prefers the
 * authenticated user (JWT via attachUser), then an explicit `x-user-id` header,
 * then the seeded demo user — so the app is usable before login exists while
 * honoring real auth once a token is sent.
 */
export async function resolveActingUser(
  req: Request,
  resolveDemoUserId: () => Promise<string>,
): Promise<string> {
  return req.user?.id ?? req.header('x-user-id') ?? (await resolveDemoUserId());
}
