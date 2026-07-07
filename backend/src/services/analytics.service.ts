import type { AnalyticsDTO, CountItem, SkillDemandDTO, WeeklyReportDTO } from '@ajh/shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  averageSalaryLabel,
  bucketByDay,
  successRate,
  tallyTop,
} from '../agents/analytics/index.js';
import type { IAnalyticsService } from './types.js';

const INTERVIEW_STATUSES = ['INTERVIEW_SCHEDULED', 'TECHNICAL_TEST', 'FINAL_INTERVIEW'];

export class AnalyticsService implements IAnalyticsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getAnalytics(userId: string): Promise<AnalyticsDTO> {
    const since14 = new Date(this.now());
    since14.setUTCDate(since14.getUTCDate() - 13);

    const [totalJobs, bySource, companies, skills, salaryRows, recentJobs, appGroups, matchRows] =
      await Promise.all([
        this.prisma.job.count(),
        this.prisma.job.groupBy({ by: ['source'], _count: { _all: true } }),
        this.prisma.company.findMany({
          take: 8,
          orderBy: { jobs: { _count: 'desc' } },
          select: { name: true, _count: { select: { jobs: true } } },
        }),
        this.prisma.skill.findMany({
          take: 10,
          orderBy: { jobSkills: { _count: 'desc' } },
          select: { name: true, _count: { select: { jobSkills: true } } },
        }),
        this.prisma.job.findMany({ where: { salary: { not: null } }, select: { salary: true } }),
        this.prisma.job.findMany({
          where: { createdAt: { gte: since14 } },
          select: { createdAt: true },
        }),
        this.prisma.application.groupBy({
          by: ['status'],
          where: { userId },
          _count: { _all: true },
        }),
        this.prisma.matchResult.findMany({ where: { userId }, select: { missingSkills: true } }),
      ]);

    const byStatus: CountItem[] = appGroups.map((g) => ({ label: g.status, count: g._count._all }));
    const statusCount = (s: string): number => byStatus.find((b) => b.label === s)?.count ?? 0;
    const submitted = statusCount('SUBMITTED');
    const interviews = INTERVIEW_STATUSES.reduce((n, s) => n + statusCount(s), 0);
    const offers = statusCount('OFFER_RECEIVED');
    const rejections = statusCount('REJECTED');
    const total = byStatus.reduce((n, b) => n + b.count, 0);

    const skillGaps = tallyTop(matchRows.flatMap((m) => m.missingSkills));

    return {
      totalJobs,
      jobsBySource: bySource
        .map((s) => ({ label: s.source, count: s._count._all }))
        .sort((a, b) => b.count - a.count),
      topCompanies: companies
        .filter((c) => c._count.jobs > 0)
        .map((c) => ({ label: c.name, count: c._count.jobs })),
      mostDemandedSkills: skills
        .filter((s) => s._count.jobSkills > 0)
        .map((s) => ({ label: s.name, count: s._count.jobSkills })),
      averageSalary: averageSalaryLabel(salaryRows.map((r) => r.salary)),
      hiringTrend: bucketByDay(
        recentJobs.map((j) => j.createdAt),
        14,
        this.now(),
      ),
      applications: {
        total,
        byStatus,
        submitted,
        interviews,
        offers,
        rejections,
        successRate: successRate(offers, submitted),
      },
      skillGaps,
    };
  }

  async listSkills(): Promise<SkillDemandDTO[]> {
    const skills = await this.prisma.skill.findMany({
      orderBy: { jobSkills: { _count: 'desc' } },
      select: { name: true, type: true, _count: { select: { jobSkills: true } } },
    });
    return skills.map((s) => ({ name: s.name, type: s.type, demand: s._count.jobSkills }));
  }

  /** Monday 00:00 UTC of the current week. */
  private weekStart(): Date {
    const d = new Date(this.now());
    const day = (d.getUTCDay() + 6) % 7; // Mon=0
    d.setUTCDate(d.getUTCDate() - day);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  async generateWeeklyReport(userId: string): Promise<WeeklyReportDTO> {
    const weekStart = this.weekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const analytics = await this.getAnalytics(userId);
    const [newJobs, applications, avgMatch] = await Promise.all([
      this.prisma.job.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } }),
      this.prisma.application.count({
        where: { userId, createdAt: { gte: weekStart, lt: weekEnd } },
      }),
      this.prisma.matchResult.aggregate({ where: { userId }, _avg: { matchScore: true } }),
    ]);

    const data: WeeklyReportDTO['data'] = {
      topCompanies: analytics.topCompanies,
      mostDemandedSkills: analytics.mostDemandedSkills,
      averageSalary: analytics.averageSalary,
      newJobs,
      applications,
      interviewProbability: Math.round(avgMatch._avg.matchScore ?? 0),
      skillGaps: analytics.skillGaps,
    };

    const report = await this.prisma.weeklyReport.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: { data: data as unknown as Prisma.InputJsonValue, weekEnd },
      create: { userId, weekStart, weekEnd, data: data as unknown as Prisma.InputJsonValue },
    });

    return {
      id: report.id,
      weekStart: report.weekStart.toISOString(),
      weekEnd: report.weekEnd.toISOString(),
      data,
      createdAt: report.createdAt.toISOString(),
    };
  }

  async listReports(userId: string): Promise<WeeklyReportDTO[]> {
    const reports = await this.prisma.weeklyReport.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
      take: 12,
    });
    return reports.map((r) => ({
      id: r.id,
      weekStart: r.weekStart.toISOString(),
      weekEnd: r.weekEnd.toISOString(),
      data: r.data as unknown as WeeklyReportDTO['data'],
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
