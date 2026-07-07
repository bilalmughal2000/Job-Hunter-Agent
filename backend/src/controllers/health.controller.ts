import type { Request, Response } from 'express';
import type { ApiSuccess } from '@ajh/shared';
import { env } from '../config/index.js';

interface HealthPayload {
  status: 'ok';
  service: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

export const getHealth = (_req: Request, res: Response): void => {
  const body: ApiSuccess<HealthPayload> = {
    ok: true,
    data: {
      status: 'ok',
      service: 'ai-job-hunter-backend',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  };
  res.status(200).json(body);
};
