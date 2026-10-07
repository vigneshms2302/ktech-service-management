import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { getClient, getDatabasePath } from '../db/database.ts';
import { listLogFiles, logger } from './logger.ts';

export interface DiagnosticExportResult {
  success: boolean;
  archivePath?: string;
  archiveSizeBytes?: number;
  fileCount?: number;
  error?: string;
}

/**
 * Lightweight pure-Node.js ZIP generator using zlib.deflateRawSync.
 * Implements standard PKZIP (RFC 1952/APPNOTE) format without third-party dependencies.
 */
class SimpleZipArchive {
  private files: Array<{
    name: string;
    compressedData: Buffer;
    uncompressedData: Buffer;
    crc32: number;
    dosDate: number;
    dosTime: number;
  }> = [];

  private calculateCrc32(buf: Buffer): number {
    let crc = ~0;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return ~crc >>> 0;
  }

  public addBuffer(filename: string, content: Buffer): void {
    const cleanName = filename.replace(/\\/g, '/');
    const crc = this.calculateCrc32(content);
    const compressed = zlib.deflateRawSync(content, { level: 6 });

    // Current DOS Date / Time
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    this.files.push({
      name: cleanName,
      compressedData: compressed,
      uncompressedData: content,
      crc32: crc,
      dosDate,
      dosTime,
    });
  }

  public addString(filename: string, content: string): void {
    this.addBuffer(filename, Buffer.from(content, 'utf8'));
  }

  public addFile(zipPath: string, localFilePath: string): boolean {
    try {
      if (fs.existsSync(localFilePath)) {
        const buf = fs.readFileSync(localFilePath);
        this.addBuffer(zipPath, buf);
        return true;
      }
    } catch (err) {
      logger.warn('DiagnosticPackager', `Could not read file for zip: ${localFilePath}`, { error: String(err) });
    }
    return false;
  }

  public generate(): Buffer {
    const localHeaders: Buffer[] = [];
    const centralHeaders: Buffer[] = [];
    let offset = 0;

    for (const file of this.files) {
      const filenameBuf = Buffer.from(file.name, 'utf8');

      // Local file header (30 bytes + name)
      const localHeader = Buffer.alloc(30 + filenameBuf.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // Signature
      localHeader.writeUInt16LE(20, 4); // Version needed (2.0)
      localHeader.writeUInt16LE(0, 6); // Flags
      localHeader.writeUInt16LE(8, 8); // Compression method (8 = Deflate)
      localHeader.writeUInt16LE(file.dosTime, 10);
      localHeader.writeUInt16LE(file.dosDate, 12);
      localHeader.writeUInt32LE(file.crc32, 14);
      localHeader.writeUInt32LE(file.compressedData.length, 18);
      localHeader.writeUInt32LE(file.uncompressedData.length, 22);
      localHeader.writeUInt16LE(filenameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28); // Extra field length
      filenameBuf.copy(localHeader, 30);

      localHeaders.push(localHeader, file.compressedData);

      // Central directory header (46 bytes + name)
      const centralHeader = Buffer.alloc(46 + filenameBuf.length);
      centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
      centralHeader.writeUInt16LE(20, 4); // Version made by
      centralHeader.writeUInt16LE(20, 6); // Version needed
      centralHeader.writeUInt16LE(0, 8); // Flags
      centralHeader.writeUInt16LE(8, 10); // Compression method (8 = Deflate)
      centralHeader.writeUInt16LE(file.dosTime, 12);
      centralHeader.writeUInt16LE(file.dosDate, 14);
      centralHeader.writeUInt32LE(file.crc32, 16);
      centralHeader.writeUInt32LE(file.compressedData.length, 20);
      centralHeader.writeUInt32LE(file.uncompressedData.length, 24);
      centralHeader.writeUInt16LE(filenameBuf.length, 28);
      centralHeader.writeUInt16LE(0, 30); // Extra field length
      centralHeader.writeUInt16LE(0, 32); // File comment length
      centralHeader.writeUInt16LE(0, 34); // Disk number start
      centralHeader.writeUInt16LE(0, 36); // Internal file attributes
      centralHeader.writeUInt32LE(0, 38); // External file attributes
      centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header
      filenameBuf.copy(centralHeader, 46);

      centralHeaders.push(centralHeader);

      offset += localHeader.length + file.compressedData.length;
    }

    const centralDirOffset = offset;
    const centralDirBuf = Buffer.concat(centralHeaders);

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // Signature
    eocd.writeUInt16LE(0, 4); // Disk number
    eocd.writeUInt16LE(0, 6); // Disk with central dir
    eocd.writeUInt16LE(this.files.length, 8); // Total entries disk
    eocd.writeUInt16LE(this.files.length, 10); // Total entries overall
    eocd.writeUInt32LE(centralDirBuf.length, 12); // Size of central dir
    eocd.writeUInt32LE(centralDirOffset, 16); // Offset of central dir
    eocd.writeUInt16LE(0, 20); // Comment length

    return Buffer.concat([...localHeaders, centralDirBuf, eocd]);
  }
}

/**
 * Queries database health and integrity metrics.
 */
export async function getDatabaseDiagnostics(): Promise<Record<string, unknown>> {
  try {
    const client = getClient();
    const integrityRes = await client.execute('PRAGMA integrity_check;');
    const quickCheckRes = await client.execute('PRAGMA quick_check;');
    const foreignKeysRes = await client.execute('PRAGMA foreign_key_check;');
    const pageCountRes = await client.execute('PRAGMA page_count;');
    const pageSizeRes = await client.execute('PRAGMA page_size;');

    const dbPath = getDatabasePath();
    const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

    // Count key metrics
    const jobsCount = await client.execute('SELECT COUNT(*) as c FROM service_jobs;');
    const custCount = await client.execute('SELECT COUNT(*) as c FROM customers;');
    const invCount = await client.execute('SELECT COUNT(*) as c FROM inventory_items;');
    const invTransCount = await client.execute('SELECT COUNT(*) as c FROM inventory_transactions;');
    const invoiceCount = await client.execute('SELECT COUNT(*) as c FROM invoices;');
    const auditCount = await client.execute('SELECT COUNT(*) as c FROM audit_logs;');

    return {
      status: 'HEALTHY',
      integrityCheck: integrityRes.rows,
      quickCheck: quickCheckRes.rows,
      foreignKeyViolations: foreignKeysRes.rows.length,
      pageSize: Number((pageSizeRes.rows[0] as Record<string, unknown>)?.page_size || 0),
      pageCount: Number((pageCountRes.rows[0] as Record<string, unknown>)?.page_count || 0),
      dbSizeBytes: dbSize,
      dbPath,
      tableRowCounts: {
        service_jobs: Number((jobsCount.rows[0] as Record<string, unknown>)?.c || 0),
        customers: Number((custCount.rows[0] as Record<string, unknown>)?.c || 0),
        inventory_items: Number((invCount.rows[0] as Record<string, unknown>)?.c || 0),
        inventory_transactions: Number((invTransCount.rows[0] as Record<string, unknown>)?.c || 0),
        invoices: Number((invoiceCount.rows[0] as Record<string, unknown>)?.c || 0),
        audit_logs: Number((auditCount.rows[0] as Record<string, unknown>)?.c || 0),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: 'DEGRADED',
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Packages 7-day logs, DB diagnostics, and system telemetry into a single zip bundle for troubleshooting.
 */
export async function createDiagnosticZipBundle(customOutputDir?: string): Promise<DiagnosticExportResult> {
  try {
    const zip = new SimpleZipArchive();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logs = listLogFiles();

    // 1. Add all active log files from logs directory
    let filesAdded = 0;
    for (const logInfo of logs) {
      if (zip.addFile(`logs/${logInfo.fileName}`, logInfo.filePath)) {
        filesAdded++;
      }
    }

    // 2. Add DB diagnostics and integrity metrics
    const dbDiagnostics = await getDatabaseDiagnostics();
    zip.addString('diagnostics/database_integrity_report.json', JSON.stringify(dbDiagnostics, null, 2));

    // 3. Add system and environment metadata (sanitized, no secrets)
    const systemMetadata = {
      app: {
        name: 'KTech Service Management',
        version: '1.1.0',
        environment: process.env.NODE_ENV || 'production',
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        osRelease: os.release(),
        hostname: os.hostname(),
        uptimeSeconds: os.uptime(),
        totalMemoryBytes: os.totalmem(),
        freeMemoryBytes: os.freemem(),
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        cpuCount: os.cpus().length,
        nodeVersion: process.version,
      },
      generatedAt: new Date().toISOString(),
    };
    zip.addString('diagnostics/system_environment.json', JSON.stringify(systemMetadata, null, 2));

    // 4. Generate the ZIP buffer
    const zipBuffer = zip.generate();

    // 5. Determine target export path
    let exportDir = customOutputDir;
    if (!exportDir) {
      const dbPath = getDatabasePath();
      const baseDir = path.dirname(path.dirname(dbPath));
      exportDir = path.join(baseDir, 'exports', 'diagnostics');
    }

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const archiveName = `ktech-diagnostics-${timestamp}.zip`;
    const archivePath = path.join(exportDir, archiveName);

    fs.writeFileSync(archivePath, zipBuffer);

    logger.info('Diagnostics', `Diagnostic archive bundle generated successfully at: ${archivePath} (${zipBuffer.length} bytes)`);

    return {
      success: true,
      archivePath,
      archiveSizeBytes: zipBuffer.length,
      fileCount: filesAdded + 2,
    };
  } catch (err) {
    logger.error('Diagnostics', 'Failed to generate diagnostic zip bundle', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
