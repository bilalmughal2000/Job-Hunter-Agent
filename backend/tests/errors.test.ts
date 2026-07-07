import { describe, expect, it } from 'vitest';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../src/utils/errors.js';

describe('AppError hierarchy', () => {
  it('defaults to a 500 internal error', () => {
    const err = new AppError('boom');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it('honours explicit status/code/details', () => {
    const err = new AppError('nope', { statusCode: 418, code: 'TEAPOT', details: { x: 1 } });
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('TEAPOT');
    expect(err.details).toEqual({ x: 1 });
  });

  it.each([
    [new NotFoundError(), 404, 'NOT_FOUND'],
    [new ValidationError(), 400, 'VALIDATION_ERROR'],
    [new UnauthorizedError(), 401, 'UNAUTHORIZED'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
  ])('maps %s to the right status/code', (err, status, code) => {
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(status);
    expect(err.code).toBe(code);
  });
});
