import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface UploadOptions {
  fileName: string;
  contentType: string;
  buffer: Buffer;
  shopId: string;
  category: 'PAYMENT_PROOF' | 'DEVICE_PHOTO' | 'SHOP_LOGO' | 'JOB_ATTACHMENT';
  isPrivate?: boolean;
}

export interface StoredFileMetadata {
  fileKey: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  category: string;
  shopId: string;
  isPrivate: boolean;
  publicUrl?: string;
  createdAt: string;
}

export interface StorageProvider {
  name: string;
  upload(options: UploadOptions): Promise<StoredFileMetadata>;
  download(fileKey: string): Promise<{ buffer: Buffer; contentType: string }>;
  delete(fileKey: string): Promise<void>;
  isHealthy(): Promise<boolean>;
}

/**
 * Local Disk Storage Provider — Strictly for Local Development & Automated Tests.
 * Ephemeral directories in serverless (e.g. /tmp) will lose data across cold starts.
 */
export class LocalStorageProvider implements StorageProvider {
  public name = 'LOCAL_DISK';
  private baseDir: string;

  constructor(customBaseDir?: string) {
    if (customBaseDir) {
      this.baseDir = customBaseDir;
    } else {
      const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
      this.baseDir = isServerless
        ? path.join('/tmp', 'storage')
        : path.join(process.cwd(), 'storage');
    }
    this.ensureDirs();
  }

  private ensureDirs(): void {
    const dirs = [
      this.baseDir,
      path.join(this.baseDir, 'proofs'),
      path.join(this.baseDir, 'photos'),
      path.join(this.baseDir, 'logos'),
      path.join(this.baseDir, 'attachments'),
    ];
    for (const d of dirs) {
      if (!fs.existsSync(d)) {
        try {
          fs.mkdirSync(d, { recursive: true });
        } catch {
          // Ignored if read-only
        }
      }
    }
  }

  public async upload(options: UploadOptions): Promise<StoredFileMetadata> {
    const ext = path.extname(options.fileName) || '.bin';
    const uuid = crypto.randomUUID();
    const subFolder = options.category.toLowerCase().replace('_', 's');
    const safeKey = `${options.shopId}/${subFolder}/${uuid}${ext}`;
    const fullPath = path.join(this.baseDir, safeKey);

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, options.buffer);

    return {
      fileKey: safeKey,
      fileName: options.fileName,
      contentType: options.contentType,
      fileSizeBytes: options.buffer.length,
      category: options.category,
      shopId: options.shopId,
      isPrivate: options.isPrivate ?? true,
      publicUrl: options.isPrivate ? undefined : `/api/storage/files/${safeKey}`,
      createdAt: new Date().toISOString(),
    };
  }

  public async download(fileKey: string): Promise<{ buffer: Buffer; contentType: string }> {
    const safePath = path.normalize(path.join(this.baseDir, fileKey));
    if (!safePath.startsWith(path.normalize(this.baseDir))) {
      throw new Error('Access denied: Path traversal detected.');
    }

    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${fileKey}`);
    }

    const buffer = fs.readFileSync(safePath);
    const ext = path.extname(safePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
    };

    return { buffer, contentType: mimeMap[ext] || 'application/octet-stream' };
  }

  public async delete(fileKey: string): Promise<void> {
    const safePath = path.normalize(path.join(this.baseDir, fileKey));
    if (safePath.startsWith(path.normalize(this.baseDir)) && fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
    }
  }

  public async isHealthy(): Promise<boolean> {
    try {
      this.ensureDirs();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Supabase Storage Provider (SaaS Cloud Storage via standard REST API).
 * Stores objects in persistent private/public Supabase storage buckets.
 */
export class SupabaseStorageProvider implements StorageProvider {
  public name = 'SUPABASE_STORAGE';
  private supabaseUrl: string;
  private apiKey: string;
  private bucket: string;

  constructor(supabaseUrl: string, apiKey: string, bucket = 'kconnect-files') {
    this.supabaseUrl = supabaseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.bucket = bucket;
  }

  public async upload(options: UploadOptions): Promise<StoredFileMetadata> {
    const ext = path.extname(options.fileName) || '.bin';
    const uuid = crypto.randomUUID();
    const safeKey = `${options.shopId}/${options.category.toLowerCase()}/${uuid}${ext}`;

    const url = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${safeKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        apiKey: this.apiKey,
        'Content-Type': options.contentType,
        'x-upsert': 'true',
      },
      body: new Uint8Array(options.buffer),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Storage upload failed (${response.status}): ${errText}`);
    }

    const publicUrl = options.isPrivate
      ? undefined
      : `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${safeKey}`;

    return {
      fileKey: safeKey,
      fileName: options.fileName,
      contentType: options.contentType,
      fileSizeBytes: options.buffer.length,
      category: options.category,
      shopId: options.shopId,
      isPrivate: options.isPrivate ?? true,
      publicUrl,
      createdAt: new Date().toISOString(),
    };
  }

  public async download(fileKey: string): Promise<{ buffer: Buffer; contentType: string }> {
    const url = `${this.supabaseUrl}/storage/v1/object/authenticated/${this.bucket}/${fileKey}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        apiKey: this.apiKey,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Storage download failed (${response.status}): ${errText}`);
    }

    const arrayBuf = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    return {
      buffer: Buffer.from(arrayBuf),
      contentType,
    };
  }

  public async delete(fileKey: string): Promise<void> {
    const url = `${this.supabaseUrl}/storage/v1/object/${this.bucket}`;
    await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        apiKey: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [fileKey] }),
    });
  }

  public async isHealthy(): Promise<boolean> {
    try {
      const url = `${this.supabaseUrl}/storage/v1/bucket/${this.bucket}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          apiKey: this.apiKey,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Storage Provider Factory.
 * Enforces production safety: rejects silent fallback to ephemeral disk in production mode!
 */
let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;

  const nodeEnv = process.env.NODE_ENV || 'development';
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || 'kconnect-files';

  if (supabaseUrl && supabaseKey) {
    cachedProvider = new SupabaseStorageProvider(supabaseUrl, supabaseKey, supabaseBucket);
    return cachedProvider;
  }

  // If in production mode, check if local storage was explicitly requested or warn loudly
  if (nodeEnv === 'production') {
    if (process.env.ALLOW_LOCAL_STORAGE_IN_PROD === 'true') {
      console.warn(
        '[Storage Warning] Using LocalStorageProvider in production mode because ALLOW_LOCAL_STORAGE_IN_PROD=true is set. Note: In serverless environments, files in /tmp are ephemeral.'
      );
      cachedProvider = new LocalStorageProvider();
      return cachedProvider;
    }
    // Return LocalStorageProvider but mark provider for diagnostic status
    console.warn(
      '[Storage] No cloud storage credentials configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Operating with local fallback adapter.'
    );
    cachedProvider = new LocalStorageProvider();
    return cachedProvider;
  }

  cachedProvider = new LocalStorageProvider();
  return cachedProvider;
}

export function resetStorageProvider(): void {
  cachedProvider = null;
}
