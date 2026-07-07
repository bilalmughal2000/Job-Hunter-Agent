import { describe, expect, it, vi } from 'vitest';
import { ResumeFileFormat, ResumeParseStatus } from '@ajh/shared';
import { TextExtractionService } from '../src/agents/resume-application/extraction/index.js';
import type {
  OcrExtractor,
  TextExtractor,
} from '../src/agents/resume-application/extraction/index.js';
import { logger } from '../src/utils/logger.js';

const LONG_TEXT = 'Ayesha Khan is a senior Angular developer with many years of experience.';

function extractor(formats: ResumeFileFormat[], impl: () => Promise<string>): TextExtractor {
  return { formats, extractText: impl };
}

describe('TextExtractionService', () => {
  it('returns PARSED when the primary extractor yields enough text', async () => {
    const svc = new TextExtractionService(
      [extractor([ResumeFileFormat.TXT], () => Promise.resolve(LONG_TEXT))],
      logger,
    );
    const out = await svc.extract(Buffer.from('x'), ResumeFileFormat.TXT);
    expect(out.status).toBe(ResumeParseStatus.PARSED);
    expect(out.text).toBe(LONG_TEXT);
  });

  it('FAILED for an unsupported format', async () => {
    const svc = new TextExtractionService([], logger);
    const out = await svc.extract(Buffer.from('x'), ResumeFileFormat.PDF);
    expect(out.status).toBe(ResumeParseStatus.FAILED);
  });

  it('falls back to OCR for a PDF with too little text', async () => {
    const ocr: OcrExtractor = {
      isAvailable: () => true,
      extractText: vi.fn().mockResolvedValue(LONG_TEXT),
    };
    const svc = new TextExtractionService(
      [extractor([ResumeFileFormat.PDF], () => Promise.resolve('   '))],
      logger,
      ocr,
    );
    const out = await svc.extract(Buffer.from('scanned'), ResumeFileFormat.PDF);
    expect(out.status).toBe(ResumeParseStatus.OCR_FALLBACK);
    expect(ocr.extractText).toHaveBeenCalled();
  });

  it('flags MANUAL_REVIEW when the extractor throws and OCR is unavailable', async () => {
    const svc = new TextExtractionService(
      [extractor([ResumeFileFormat.PDF], () => Promise.reject(new Error('corrupt pdf')))],
      logger,
    );
    const out = await svc.extract(Buffer.from('bad'), ResumeFileFormat.PDF);
    expect(out.status).toBe(ResumeParseStatus.MANUAL_REVIEW);
    expect(out.error).toContain('corrupt pdf');
  });

  it('flags MANUAL_REVIEW when OCR also returns nothing', async () => {
    const ocr: OcrExtractor = { isAvailable: () => true, extractText: () => Promise.resolve('') };
    const svc = new TextExtractionService(
      [extractor([ResumeFileFormat.PDF], () => Promise.resolve(''))],
      logger,
      ocr,
    );
    const out = await svc.extract(Buffer.from('scanned'), ResumeFileFormat.PDF);
    expect(out.status).toBe(ResumeParseStatus.MANUAL_REVIEW);
  });

  it('does not attempt OCR for DOCX', async () => {
    const ocr: OcrExtractor = {
      isAvailable: () => true,
      extractText: vi.fn().mockResolvedValue(LONG_TEXT),
    };
    const svc = new TextExtractionService(
      [extractor([ResumeFileFormat.DOCX], () => Promise.resolve(''))],
      logger,
      ocr,
    );
    const out = await svc.extract(Buffer.from('x'), ResumeFileFormat.DOCX);
    expect(out.status).toBe(ResumeParseStatus.MANUAL_REVIEW);
    expect(ocr.extractText).not.toHaveBeenCalled();
  });
});
