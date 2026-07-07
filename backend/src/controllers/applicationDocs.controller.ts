import type { Request, RequestHandler, Response } from 'express';
import type { ApiSuccess, CoverLetterDTO, ResumeVersionDTO } from '@ajh/shared';
import type { IApplicationDocsService } from '../services/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const DEMO_USER_HEADER = 'x-user-id';

/** Customized resume versions + cover letters (Resume Optimizer / Cover Letter agents). */
export function createApplicationDocsController(
  docs: IApplicationDocsService,
  resolveDemoUserId: () => Promise<string>,
): {
  customize: RequestHandler;
  listVersions: RequestHandler;
  createCoverLetter: RequestHandler;
  editCoverLetter: RequestHandler;
} {
  const customize = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.header(DEMO_USER_HEADER) ?? (await resolveDemoUserId());
    const { jobId, resumeId } = req.body as { jobId: string; resumeId?: string };
    const data = await docs.customize(userId, jobId, resumeId);
    const body: ApiSuccess<ResumeVersionDTO> = { ok: true, data };
    res.status(201).json(body);
  });

  const listVersions = asyncHandler(async (req: Request, res: Response) => {
    const data = await docs.listVersions(req.params.jobId as string);
    const body: ApiSuccess<ResumeVersionDTO[]> = { ok: true, data };
    res.status(200).json(body);
  });

  const createCoverLetter = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.header(DEMO_USER_HEADER) ?? (await resolveDemoUserId());
    const { jobId, resumeVersionId } = req.body as { jobId: string; resumeVersionId: string };
    const data = await docs.generateCoverLetter(userId, jobId, resumeVersionId);
    const body: ApiSuccess<CoverLetterDTO> = { ok: true, data };
    res.status(201).json(body);
  });

  const editCoverLetter = asyncHandler(async (req: Request, res: Response) => {
    const { content } = req.body as { content: string };
    const data = await docs.editCoverLetter(req.params.id as string, content);
    const body: ApiSuccess<CoverLetterDTO> = { ok: true, data };
    res.status(200).json(body);
  });

  return { customize, listVersions, createCoverLetter, editCoverLetter };
}
