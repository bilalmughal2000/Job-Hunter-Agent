import type { ExtractedProfile, ResumeFileFormat, ResumeParseStatus } from '@ajh/shared';

/** Extracts raw text from a resume file of one or more formats. */
export interface TextExtractor {
  readonly formats: ResumeFileFormat[];
  extractText(buffer: Buffer): Promise<string>;
}

/** OCR engine used as a fallback for scanned / image-based resumes. */
export interface OcrExtractor {
  isAvailable(): boolean;
  extractText(buffer: Buffer): Promise<string>;
}

/** Turns raw resume text into a structured profile (heuristic now, AI in Phase 5). */
export interface StructuredExtractor {
  readonly name: string;
  extract(rawText: string): Promise<ExtractedProfile>;
}

export interface TextExtractionOutcome {
  text: string;
  status: ResumeParseStatus;
  error?: string;
}
