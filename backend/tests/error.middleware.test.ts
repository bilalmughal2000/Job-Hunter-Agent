import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { errorHandler, notFoundHandler } from '../src/middlewares/error.middleware.js';
import { NotFoundError } from '../src/utils/errors.js';

function mockRes(): Response & { _status: number; _body: unknown } {
  const res = {
    _status: 0,
    _body: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: unknown) {
      this._body = body;
      return this;
    },
  };
  return res as unknown as Response & { _status: number; _body: unknown };
}

const noop = vi.fn() as unknown as NextFunction;

describe('notFoundHandler', () => {
  it('responds 404 with a structured envelope', () => {
    const req = { method: 'GET', originalUrl: '/nope' } as Request;
    const res = mockRes();
    notFoundHandler(req, res, noop);
    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});

describe('errorHandler', () => {
  it('translates AppError to its status/code', () => {
    const res = mockRes();
    errorHandler(new NotFoundError('missing'), {} as Request, res, noop);
    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'missing' },
    });
  });

  it('translates a ZodError to a 400 validation error', () => {
    const res = mockRes();
    const parsed = z.object({ name: z.string() }).safeParse({});
    errorHandler((parsed as { error: unknown }).error, {} as Request, res, noop);
    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
  });

  it('falls back to 500 for unknown errors', () => {
    const res = mockRes();
    errorHandler(new Error('kaboom'), {} as Request, res, noop);
    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
  });
});
