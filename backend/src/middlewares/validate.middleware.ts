import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

/**
 * Validates `req[source]` against a zod schema, replacing it with the parsed
 * (and coerced) value. Zod errors bubble to the central error middleware,
 * which renders them as a 400 VALIDATION_ERROR.
 */
export function validate(
  schema: ZodTypeAny,
  source: 'body' | 'query' | 'params' = 'body',
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[source]) as unknown;
    // req.query/params getters can be read-only in newer Express; stash the
    // parsed value where controllers read it from.
    if (source === 'query') {
      (req as Request & { validatedQuery?: unknown }).validatedQuery = parsed;
    } else {
      req[source] = parsed as never;
    }
    next();
  };
}

/** Typed accessor for a validated query set by `validate(schema, 'query')`. */
export function getValidatedQuery<T extends ZodTypeAny>(req: Request, _schema: T): z.infer<T> {
  return (req as Request & { validatedQuery: z.infer<T> }).validatedQuery;
}
