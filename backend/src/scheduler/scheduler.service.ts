import cron, { type ScheduledTask } from 'node-cron';
import type { SearchQuery } from '@ajh/shared';
import type { PrismaClient } from '@prisma/client';
import { env } from '../config/index.js';
import type { IAnalyticsService, INotificationService, ISearchService } from '../services/index.js';
import type { Logger } from '../utils/logger.js';

export type SchedulerTask = 'search' | 'weekly';

/**
 * node-cron scheduler (spec §Scheduler): auto-search every 4h and weekly
 * reports, with manual execution. Disabled unless ENABLE_SCHEDULER=true so it
 * never runs in dev/CI/tests or across scaled instances by accident.
 */
export class SchedulerService {
  private readonly tasks: ScheduledTask[] = [];

  constructor(
    private readonly prisma: PrismaClient,
    private readonly search: ISearchService,
    private readonly notifications: INotificationService,
    private readonly analytics: IAnalyticsService,
    private readonly logger: Logger,
  ) {}

  start(): void {
    this.tasks.push(cron.schedule(env.SEARCH_CRON, () => void this.runSearch()));
    this.tasks.push(cron.schedule(env.WEEKLY_REPORT_CRON, () => void this.runWeeklyReports()));
    this.logger.info(
      { search: env.SEARCH_CRON, weekly: env.WEEKLY_REPORT_CRON },
      '⏰ scheduler started',
    );
  }

  stop(): void {
    for (const t of this.tasks) void t.stop();
    this.tasks.length = 0;
  }

  /** Run a task once, on demand (manual trigger). */
  async runTask(task: SchedulerTask): Promise<void> {
    if (task === 'search') return this.runSearch();
    return this.runWeeklyReports();
  }

  private async eachUser<T>(
    fn: (userId: string, prefs: PrefRow | null) => Promise<T>,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      include: { preferences: true },
    });
    for (const u of users) {
      try {
        await fn(u.id, u.preferences);
      } catch (error) {
        this.logger.error({ error, userId: u.id }, 'scheduler task failed for user');
      }
    }
  }

  private async runSearch(): Promise<void> {
    this.logger.info('scheduler: running job search for all users');
    await this.eachUser(async (userId, prefs) => {
      const query: SearchQuery = {
        keywords: prefs?.keywords?.length ? prefs.keywords : ['angular', 'frontend'],
        locations: prefs?.locations?.length ? prefs.locations : ['Lahore, Pakistan'],
        excludeKeywords: prefs?.excludeKeywords ?? [],
      };
      const summary = await this.search.run(userId, query);
      if (summary.newlyPersisted > 0) {
        await this.notifications.notify(userId, {
          subject: `🔎 ${summary.newlyPersisted} new job${summary.newlyPersisted === 1 ? '' : 's'} found`,
          body: `Your scheduled search found ${summary.newlyPersisted} new matching job(s). Open AI Job Hunter to review and apply.`,
        });
      }
    });
  }

  private async runWeeklyReports(): Promise<void> {
    this.logger.info('scheduler: generating weekly reports');
    await this.eachUser(async (userId, _prefs) => {
      const report = await this.analytics.generateWeeklyReport(userId);
      await this.notifications.notify(userId, {
        subject: '📊 Your weekly job report is ready',
        body: `This week: ${report.data.newJobs} new jobs, ${report.data.applications} applications. Top skills in demand: ${report.data.mostDemandedSkills
          .slice(0, 5)
          .map((s) => s.label)
          .join(', ')}.`,
      });
    });
  }
}

interface PrefRow {
  keywords: string[];
  excludeKeywords: string[];
  locations: string[];
}
