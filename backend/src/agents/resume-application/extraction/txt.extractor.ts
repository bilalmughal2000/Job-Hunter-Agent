import { ResumeFileFormat } from '@ajh/shared';
import type { TextExtractor } from './types.js';

/** Plain-text / RTF-ish resumes. RTF control words are lightly stripped. */
export class TxtTextExtractor implements TextExtractor {
  readonly formats = [ResumeFileFormat.TXT, ResumeFileFormat.RTF];

  extractText(buffer: Buffer): Promise<string> {
    let text = buffer.toString('utf8');
    if (text.startsWith('{\\rtf')) {
      // Minimal RTF de-control: drop control words and braces.
      text = text
        .replace(/\\[a-z]+-?\d* ?/gi, ' ')
        .replace(/[{}]/g, '')
        .replace(/\s+/g, ' ');
    }
    return Promise.resolve(text.trim());
  }
}
