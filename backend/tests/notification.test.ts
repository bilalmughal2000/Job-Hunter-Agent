import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';
import { NotificationService } from '../src/services/notification.service.js';
import {
  EmailChannel,
  InAppChannel,
  TelegramChannel,
  newJobAlert,
} from '../src/agents/notification/index.js';
import type { NotificationChannelSender } from '../src/agents/notification/index.js';
import type {
  CreateNotificationInput,
  INotificationRepository,
} from '../src/repositories/notification.repository.js';
import type { IUserRepository } from '../src/repositories/user.repository.js';
import { logger } from '../src/utils/logger.js';

describe('newJobAlert template (spec format)', () => {
  it('renders the 🔥 New Job alert', () => {
    const msg = newJobAlert({
      jobId: 'j1',
      title: 'Frontend Angular Developer',
      company: 'Tkxel',
      location: 'Lahore',
      matchScore: 95,
      missingSkills: ['Azure'],
      url: 'https://x/apply',
    });
    expect(msg.body).toContain('🔥 New Job');
    expect(msg.body).toContain('95% Match');
    expect(msg.body).toContain('Missing Skill: Azure');
    expect(msg.body).toContain('Apply: https://x/apply');
    expect(msg.jobId).toBe('j1');
  });
});

describe('channels', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('InApp is always configured', () => {
    expect(new InAppChannel().isConfigured()).toBe(true);
  });

  it('Telegram requires token + chat id', () => {
    expect(new TelegramChannel({}).isConfigured()).toBe(false);
    expect(new TelegramChannel({ token: 't', defaultChatId: '1' }).isConfigured()).toBe(true);
  });

  it('Telegram posts to the Bot API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('') });
    vi.stubGlobal('fetch', fetchMock);
    await new TelegramChannel({ token: 'abc', defaultChatId: '42' }).send(
      { subject: 'Hi', body: 'body' },
      {},
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botabc/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('Email requires host/user/password', () => {
    expect(new EmailChannel({}).isConfigured()).toBe(false);
    expect(new EmailChannel({ host: 'h', user: 'u', password: 'p' }).isConfigured()).toBe(true);
  });
});

function makeDeps(user: User | null = { id: 'u1', email: 'a@b.com' } as User) {
  const created: CreateNotificationInput[] = [];
  const repo: INotificationRepository = {
    create: (i) => {
      created.push(i);
      return Promise.resolve({ id: 'n' + created.length } as never);
    },
    listByUser: () => Promise.resolve({ items: [], total: 0 }),
  };
  const users: IUserRepository = {
    findById: () => Promise.resolve(user),
    findByEmail: () => Promise.resolve(null),
    create: () => Promise.resolve({} as User),
  };
  return { repo, users, created };
}

const okChannel = (): NotificationChannelSender => ({
  channel: 'IN_APP' as never,
  isConfigured: () => true,
  send: () => Promise.resolve(),
});

describe('NotificationService', () => {
  it('delivers via configured channels and persists each', async () => {
    const { repo, users, created } = makeDeps();
    const svc = new NotificationService([new InAppChannel()], repo, users, logger);
    const result = await svc.notify('u1', { subject: 's', body: 'b' });
    expect(result.delivered).toEqual([{ channel: 'IN_APP', status: 'SENT' }]);
    expect(created).toHaveLength(1);
    expect(created[0]?.status).toBe('SENT');
  });

  it('skips unconfigured channels', async () => {
    const { repo, users, created } = makeDeps();
    const svc = new NotificationService(
      [new InAppChannel(), new TelegramChannel({})], // telegram unconfigured
      repo,
      users,
      logger,
    );
    const result = await svc.notify('u1', { subject: 's', body: 'b' });
    expect(result.delivered.map((d) => d.channel)).toEqual(['IN_APP']);
    expect(created).toHaveLength(1);
  });

  it('records a FAILED delivery when a channel throws', async () => {
    const { repo, users, created } = makeDeps();
    const failing: NotificationChannelSender = {
      ...okChannel(),
      send: () => Promise.reject(new Error('boom')),
    };
    const svc = new NotificationService([failing], repo, users, logger);
    const result = await svc.notify('u1', { subject: 's', body: 'b' });
    expect(result.delivered[0]?.status).toBe('FAILED');
    expect(result.delivered[0]?.error).toContain('boom');
    expect(created[0]?.status).toBe('FAILED');
  });

  it('404s for an unknown user', async () => {
    const { repo, users } = makeDeps(null);
    const svc = new NotificationService([new InAppChannel()], repo, users, logger);
    await expect(svc.notify('ghost', { subject: 's', body: 'b' })).rejects.toThrow();
  });
});
