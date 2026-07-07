import { ResumeFileFormat } from '@ajh/shared';
import type { TextExtractor } from './types.js';

/** DOCX text extraction via mammoth (raw text, styles discarded). */
export class DocxTextExtractor implements TextExtractor {
  readonly formats = [ResumeFileFormat.DOCX];

  async extractText(buffer: Buffer): Promise<string> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }
}
