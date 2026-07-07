import type { Request, RequestHandler, Response } from 'express';
import type { ApiSuccess, ResumeDTO, ResumeProfileDTO } from '@ajh/shared';
import type { IResumeService } from '../services/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/errors.js';

const DEMO_USER_HEADER = 'x-user-id';

export function createResumeController(
  resumeService: IResumeService,
  resolveDemoUserId: () => Promise<string>,
): { upload: RequestHandler; getById: RequestHandler; getProfile: RequestHandler } {
  const upload = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError(
        'No file uploaded — send multipart/form-data with a "resume" field',
      );
    }
    const userId = req.header(DEMO_USER_HEADER) ?? (await resolveDemoUserId());

    const resume = await resumeService.upload({
      userId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
    });
    const body: ApiSuccess<ResumeDTO> = { ok: true, data: resume };
    res.status(201).json(body);
  });

  const getById = asyncHandler(async (req: Request, res: Response) => {
    const resume = await resumeService.getById(req.params.id as string);
    const body: ApiSuccess<ResumeDTO> = { ok: true, data: resume };
    res.status(200).json(body);
  });

  const getProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await resumeService.getProfile(req.params.id as string);
    const body: ApiSuccess<ResumeProfileDTO> = { ok: true, data: profile };
    res.status(200).json(body);
  });

  return { upload, getById, getProfile };
}
