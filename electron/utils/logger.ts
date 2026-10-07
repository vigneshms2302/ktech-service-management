import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getDatabasePath } from '../db/database.ts';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT' | 'EXCEPTION';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: Record<string, unknown>;
  stack?: string;
}

export interface LogFileInfo {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  lastModified: string;
  dateStr: string;
}

let logsDir = '';
let retentionDays = 7;
let isInitialized = false;

// Regex patterns to scrub sensitive data / PII before writing to logs
const SENSITIVE_PATTERNS = [
  /("?(?:password|passcode|pin|pinCode|secret|token|authTag|privateKey|authorization)"?\s*[:=]\s*)"([^"]+)"/gi,
  /("?(?:password|passcode|pin|pinCode|secret|token|authTag|privateKey|authorization)"?\s*[:=]\s*)'([^']+)'/gi,
  /("?(?:password|passcode|pin|pinCode|secret|token|authTag|privateKey|authorization)"?\s*[:=]\s*)([a-zA-Z0-9_\-!@#$%^&*]+)/gi,
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, // 16-digit credit cards
];

function sanitizeMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '$1"[REDACTED]"');
  }
  return sanitized;
}

/**
 * Resolves the directory where log files are stored.
 */
export function getLogsDirectory(): string {
  if (logsDir) return logsDir;

  try {
    const dbPath = getDatabasePath();
    const baseDir = path.dirname(path.dirname(dbPath));
    logsDir = path.join(baseDir, 'logs');
  } catch {
    logsDir = path.join(process.cwd(), 'data', 'logs');
  }

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  return logsDir;
}

/**
 * Sets custom retention days dynamically (e.g. from user settings or environment).
 */
export function setLogRetentionDays(days: number): void {
  if (days > 0) {
    retentionDays = days;
    cleanOldLogs();
  }
}

export function getLogRetentionDays(): number {
  return retentionDays;
}

/**
 * Cleans log files older than the configured retention threshold (default: 7 days).
 */
export function cleanOldLogs(): number {
  const dir = getLogsDirectory();
  const now = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith('.log')) continue;
      const filePath = path.join(dir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (err) {
        console.warn(`[Logger] Failed to delete old log file ${file}:`, err);
      }
    }
  } catch (err) {
    console.warn('[Logger] Error during log retention cleanup:', err);
  }

  return deletedCount;
}

/**
 * Appends a log line to the appropriate daily log file.
 */
function writeToLog(level: LogLevel, context: string, message: string, metadata?: Record<string, unknown>, stack?: string): void {
  try {
    const dir = getLogsDirectory();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const mainLogPath = path.join(dir, `ktech-${today}.log`);
    const errorLogPath = path.join(dir, `error-${today}.log`);

    const sanitizedMsg = sanitizeMessage(message);
    const sanitizedMeta = metadata ? sanitizeMessage(JSON.stringify(metadata)) : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message: sanitizedMsg,
      metadata: sanitizedMeta ? JSON.parse(sanitizedMeta) : undefined,
      stack: stack ? sanitizeMessage(stack) : undefined,
    };

    const formattedLine = `[${entry.timestamp}] [${entry.level.padEnd(9)}] [${entry.context}] ${entry.message}${
      entry.metadata ? ' ' + JSON.stringify(entry.metadata) : ''
    }${entry.stack ? '\n' + entry.stack : ''}\n`;

    fs.appendFileSync(mainLogPath, formattedLine, 'utf8');

    // Also write high-severity entries to dedicated error log file
    if (level === 'ERROR' || level === 'EXCEPTION') {
      fs.appendFileSync(errorLogPath, formattedLine, 'utf8');
    }

    // Echo to stdout in dev / test
    if (process.env.NODE_ENV !== 'production') {
      const color = level === 'ERROR' || level === 'EXCEPTION' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[36m';
      console.log(`${color}[${entry.level}] [${entry.context}]\x1b[0m ${entry.message}`);
    }
  } catch (err) {
    console.error('[Logger] Critical failure writing to log file:', err);
  }
}

export const logger = {
  debug: (context: string, message: string, metadata?: Record<string, unknown>) => {
    writeToLog('DEBUG', context, message, metadata);
  },
  info: (context: string, message: string, metadata?: Record<string, unknown>) => {
    writeToLog('INFO', context, message, metadata);
  },
  warn: (context: string, message: string, metadata?: Record<string, unknown>) => {
    writeToLog('WARN', context, message, metadata);
  },
  error: (context: string, message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
    const stack = error instanceof Error ? error.stack : undefined;
    const errorMsg = error instanceof Error ? `${message} | Error: ${error.message}` : message;
    writeToLog('ERROR', context, errorMsg, metadata, stack);
  },
  exception: (context: string, error: Error | unknown, customMessage?: string) => {
    const message = customMessage || (error instanceof Error ? error.message : String(error));
    const stack = error instanceof Error ? error.stack : undefined;
    writeToLog('EXCEPTION', context, `Unhandled Exception: ${message}`, undefined, stack);
  },
  audit: (context: string, action: string, userId: string | null, details?: Record<string, unknown>) => {
    writeToLog('AUDIT', context, `[AUDIT_TRAIL] User: ${userId || 'SYSTEM'} | Action: ${action}`, details);
  },
};

/**
 * Returns summary info of all available log files.
 */
export function listLogFiles(): LogFileInfo[] {
  const dir = getLogsDirectory();
  const results: LogFileInfo[] = [];

  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith('.log')) continue;
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/);
      results.push({
        fileName: file,
        filePath,
        sizeBytes: stats.size,
        lastModified: stats.mtime.toISOString(),
        dateStr: dateMatch ? dateMatch[0] : 'unknown',
      });
    }
  } catch (err) {
    logger.error('Logger', 'Failed to list log files', err);
  }

  return results.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}

/**
 * Reads recent logs with optional level filtering and line limits.
 */
export function readRecentLogs(options?: { level?: LogLevel; limit?: number; date?: string }): string[] {
  const dir = getLogsDirectory();
  const limit = options?.limit || 200;
  const dateStr = options?.date || new Date().toISOString().split('T')[0];
  const targetFile = path.join(dir, `ktech-${dateStr}.log`);

  if (!fs.existsSync(targetFile)) {
    return [];
  }

  try {
    const content = fs.readFileSync(targetFile, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    let filtered = lines;

    if (options?.level) {
      filtered = lines.filter((line) => line.includes(`[${options.level}`));
    }

    return filtered.slice(-limit);
  } catch (err) {
    logger.error('Logger', 'Failed reading recent logs', err);
    return [];
  }
}

/**
 * Initializes process-level exception listeners and automatic daily retention cleanup.
 */
export function initializeLogger(): void {
  if (isInitialized) return;
  isInitialized = true;

  getLogsDirectory();
  cleanOldLogs();

  // Run cleanup once every 24 hours
  setInterval(() => {
    cleanOldLogs();
  }, 24 * 60 * 60 * 1000);

  process.on('uncaughtException', (err: Error) => {
    logger.exception('Process/UncaughtException', err);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.exception('Process/UnhandledRejection', err);
  });

  logger.info('System/Bootstrap', `KTech Unified Logging Framework initialized (Retention: ${retentionDays} days, Host: ${os.hostname()}, Platform: ${process.platform})`);
}
