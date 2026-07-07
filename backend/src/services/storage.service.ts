import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface StoredFile {
  storagePath: string;
  checksum: string;
}

/**
 * File storage abstraction. `LocalStorage` writes under a base directory now;
 * an S3/GCS implementation can be dropped in behind this interface later.
 */
export interface Storage {
  save(buffer: Buffer, ext: string): Promise<StoredFile>;
  read(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
}

export class LocalStorage implements Storage {
  constructor(private readonly baseDir: string) {}

  async save(buffer: Buffer, ext: string): Promise<StoredFile> {
    await mkdir(this.baseDir, { recursive: true });
    const safeExt = ext.replace(/[^a-z0-9.]/gi, '').toLowerCase();
    const name = `${randomUUID()}${safeExt.startsWith('.') ? safeExt : `.${safeExt}`}`;
    const storagePath = path.join(this.baseDir, name);
    await writeFile(storagePath, buffer);
    const checksum = createHash('sha256').update(buffer).digest('hex');
    return { storagePath, checksum };
  }

  read(storagePath: string): Promise<Buffer> {
    return readFile(storagePath);
  }

  async delete(storagePath: string): Promise<void> {
    await unlink(storagePath).catch(() => undefined);
  }
}
