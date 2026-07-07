import { ResumeFileFormat } from '@ajh/shared';
import type { TextExtractor } from './types.js';

/**
 * PDF text extraction via pdf-parse v2. Imported dynamically so the (heavy)
 * pdfjs dependency loads only when a PDF is actually processed.
 */
export class PdfTextExtractor implements TextExtractor {
  readonly formats = [ResumeFileFormat.PDF];

  async extractText(buffer: Buffer): Promise<string> {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      // Drop pdf-parse's "-- N of M --" page separators.
      return result.text.replace(/^-- \d+ of \d+ --$/gm, '').trim();
    } finally {
      await parser.destroy();
    }
  }
}
