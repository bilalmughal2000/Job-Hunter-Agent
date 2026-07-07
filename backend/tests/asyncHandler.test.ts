import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../src/utils/asyncHandler.js';

describe('asyncHandler', () => {
  const req = {} as Request;
  const res = {} as Response;

  it('forwards rejected promises to next()', async () => {
    const next = vi.fn() as unknown as NextFunction;
    const boom = new Error('async boom');

    asyncHandler(() => Promise.reject(boom))(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(next).toHaveBeenCalledWith(boom);
  });

  it('does not call next() when the handler resolves', async () => {
    const next = vi.fn() as unknown as NextFunction;

    asyncHandler(() => Promise.resolve('ok'))(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(next).not.toHaveBeenCalled();
  });
});
