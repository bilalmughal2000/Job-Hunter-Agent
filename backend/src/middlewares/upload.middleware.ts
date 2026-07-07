import path from 'node:path';
import multer from 'multer';
import type { RequestHandler } from 'express';
import { env } from '../config/index.js';
import { ValidationError } from '../utils/errors.js';

/** Accepted resume types (secure upload — spec §Security). */
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'text/rtf',
]);
const ALLOWED_EXT = new Set(['.pdf', '.docx', '.txt', '.rtf']);

/**
 * In-memory multer upload with mime + extension allow-listing and a size cap.
 * Files never touch disk here; the ResumeService hands the buffer to Storage,
 * which writes it under a uuid filename (no user-controlled paths).
 */
export function resumeUpload(): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXT.has(ext)) {
        cb(null, true);
      } else {
        cb(new ValidationError(`Unsupported file type: ${file.mimetype || ext || 'unknown'}`));
      }
    },
  });
  return upload.single('resume');
}
