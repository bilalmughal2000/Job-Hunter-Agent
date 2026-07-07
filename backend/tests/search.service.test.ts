import { describe, expect, it, vi } from 'vitest';
import { JobSource, type SearchQuery } from '@ajh/shared';
import { SearchService } from '../src/services/index.js';
import type { SearchAgent, SearchAgentResult } from '../src/agents/search/index.js';
import type { IJobService } from '../src/services/index.js';
import type { ISearchHistoryRepository, RecordSearchInput } from '../src/repositories/index.js';
import { logger } from '../src/utils/logger.js';

const query: SearchQuery = { keywords: ['angular'] };

function makeAgent(result: SearchAgentResult | Error): SearchAgent {
  return {
    run: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)),
  } as unknown as SearchAgent;
}

describe('SearchService.run', () => {
  it('runs the agent, persists new jobs, and records history', async () => {
    const agentResult: SearchAgentResult = {
      jobs: [],
      totalFound: 5,
      duplicatesRemoved: 2,
      bySource: { [JobSource.MANUAL]: 5 },
      errors: [],
    };
    const persist = vi.fn().mockResolvedValue(3);
    const jobService = { persistNewJobs: persist } as unknown as IJobService;
    const records: RecordSearchInput[] = [];
    const history: ISearchHistoryRepository = {
      record: (i) => {
        records.push(i);
        return Promise.resolve();
      },
    };
    let clock = 1000;
    const service = new SearchService(makeAgent(agentResult), jobService, history, logger, () => {
      clock += 50;
      return clock;
    });

    const summary = await service.run('user-1', query);
    expect(summary.totalFound).toBe(5);
    expect(summary.newlyPersisted).toBe(3);
    expect(summary.durationMs).toBe(50);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ userId: 'user-1', resultsCount: 5, newCount: 3 });
  });

  it('records a failed run and rethrows', async () => {
    const jobService = { persistNewJobs: vi.fn() } as unknown as IJobService;
    const records: RecordSearchInput[] = [];
    const history: ISearchHistoryRepository = {
      record: (i) => {
        records.push(i);
        return Promise.resolve();
      },
    };
    const service = new SearchService(
      makeAgent(new Error('agent down')),
      jobService,
      history,
      logger,
    );

    await expect(service.run('user-1', query)).rejects.toThrow('agent down');
    expect(records).toHaveLength(1);
    expect(records[0]?.error).toContain('agent down');
  });
});
