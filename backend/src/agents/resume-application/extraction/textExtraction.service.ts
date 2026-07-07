import { ResumeFileFormat, ResumeParseStatus } from '@ajh/shared';
import type { Logger } from '../../../utils/logger.js';
import type { OcrExtractor, TextExtractionOutcome, TextExtractor } from './types.js';

/** Below this many non-whitespace chars we assume extraction effectively failed. */
const MIN_USEFUL_CHARS = 40;

/**
 * Chooses a text extractor by format and applies the spec's fallback ladder:
 *   parse → (too little text or error) → OCR → (still nothing) → MANUAL_REVIEW.
 * OCR only helps image-bearing formats; DOCX/TXT failures go straight to review.
 */
export class TextExtractionService {
  private readonly byFormat = new Map<ResumeFileFormat, TextExtractor>();

  constructor(
    extractors: TextExtractor[],
    private readonly logger: Logger,
    private readonly ocr?: OcrExtractor,
  ) {
    for (const extractor of extractors) {
      for (const format of extractor.formats) this.byFormat.set(format, extractor);
    }
  }

  private static usefulLength(text: string): number {
    return text.replace(/\s/g, '').length;
  }

  private canOcr(format: ResumeFileFormat): boolean {
    return !!this.ocr?.isAvailable() && format === ResumeFileFormat.PDF;
  }

  async extract(buffer: Buffer, format: ResumeFileFormat): Promise<TextExtractionOutcome> {
    const extractor = this.byFormat.get(format);
    if (!extractor) {
      return { text: '', status: ResumeParseStatus.FAILED, error: `Unsupported format: ${format}` };
    }

    let primaryText = '';
    let primaryError: string | undefined;
    try {
      primaryText = await extractor.extractText(buffer);
    } catch (error) {
      primaryError = error instanceof Error ? error.message : String(error);
      this.logger.warn({ format, error }, 'primary text extraction failed');
    }

    if (TextExtractionService.usefulLength(primaryText) >= MIN_USEFUL_CHARS) {
      return { text: primaryText, status: ResumeParseStatus.PARSED };
    }

    // Primary extraction was empty/too short — try OCR where it can help.
    if (this.canOcr(format)) {
      try {
        const ocrText = await this.ocr!.extractText(buffer);
        if (TextExtractionService.usefulLength(ocrText) >= MIN_USEFUL_CHARS) {
          return { text: ocrText, status: ResumeParseStatus.OCR_FALLBACK };
        }
      } catch (error) {
        this.logger.warn({ format, error }, 'OCR fallback failed');
      }
    }

    // Couldn't get useful text — flag for manual review (keep any partial text).
    return {
      text: primaryText,
      status: ResumeParseStatus.MANUAL_REVIEW,
      error: primaryError ?? 'Insufficient text extracted; flagged for manual review',
    };
  }
}
