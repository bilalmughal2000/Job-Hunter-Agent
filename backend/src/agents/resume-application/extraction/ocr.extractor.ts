import type { Logger } from '../../../utils/logger.js';
import type { OcrExtractor } from './types.js';

/**
 * OCR fallback via tesseract.js (pure WASM). Loaded lazily — the worker + the
 * language model are only initialized the first time OCR is actually needed.
 * Works on image bytes (PNG/JPG). Scanned-PDF OCR requires page rasterization,
 * which is a documented future enhancement; until then the dispatcher flags
 * such files for MANUAL_REVIEW.
 */
export class TesseractOcrExtractor implements OcrExtractor {
  constructor(
    private readonly logger: Logger,
    private readonly lang = 'eng',
  ) {}

  isAvailable(): boolean {
    return true;
  }

  async extractText(buffer: Buffer): Promise<string> {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker(this.lang);
    try {
      const { data } = await worker.recognize(buffer);
      return data.text.trim();
    } catch (error) {
      this.logger.warn({ error }, 'OCR recognition failed');
      return '';
    } finally {
      await worker.terminate();
    }
  }
}
