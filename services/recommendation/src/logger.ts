/**
 * Minimal structured logger that emits JSON to stdout.
 *
 * CloudWatch Logs Insights can parse these natively.
 * Keep this dependency-free — no third-party logging libraries needed for MVP.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

let currentRequestId: string | undefined;

export function setRequestId(id: string): void {
  currentRequestId = id;
}

export function clearRequestId(): void {
  currentRequestId = undefined;
}

function log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    ...(currentRequestId ? { requestId: currentRequestId } : {}),
    ...fields,
  };
  console.log(JSON.stringify(entry));
}

export const logger = {
  info: (message: string, fields?: Record<string, unknown>) => log('INFO', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => log('WARN', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => log('ERROR', message, fields),
};
