import type { PrismaClient } from '@prisma/client';
import { toPrismaSource } from '../models/job.mapper.js';
import type { ISearchHistoryRepository, RecordSearchInput } from './types.js';

export class SearchHistoryRepository implements ISearchHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(input: RecordSearchInput): Promise<void> {
    await this.prisma.searchHistory.create({
      data: {
        userId: input.userId,
        criteria: input.criteria as object,
        source: input.source ? toPrismaSource(input.source) : null,
        resultsCount: input.resultsCount,
        newCount: input.newCount,
        durationMs: input.durationMs,
        error: input.error ?? null,
        triggeredBy: input.triggeredBy ?? 'MANUAL',
      },
    });
  }
}
