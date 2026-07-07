import type { Company, PrismaClient } from '@prisma/client';
import type { ICompanyRepository } from './types.js';

export class CompanyRepository implements ICompanyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertByNameLocation(name: string, location: string | null): Promise<Company> {
    // The compound unique [name, location] can't be used in `upsert` when
    // location is null (Prisma requires non-null unique inputs), so fall back
    // to a find-or-create in that case.
    if (location === null) {
      const existing = await this.prisma.company.findFirst({ where: { name, location: null } });
      return existing ?? this.prisma.company.create({ data: { name } });
    }

    return this.prisma.company.upsert({
      where: { name_location: { name, location } },
      update: {},
      create: { name, location },
    });
  }
}
