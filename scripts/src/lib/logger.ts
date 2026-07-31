/**
 * Simple pipeline logger — writes to stdout with timestamps.
 * Keeps the scripts dependency-free from logging libs.
 */

function ts(): string {
  return new Date().toISOString();
}

export const log = {
  info: (msg: string, data?: Record<string, unknown>) =>
    console.log(JSON.stringify({ ts: ts(), level: 'INFO', msg, ...data })),
  warn: (msg: string, data?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ ts: ts(), level: 'WARN', msg, ...data })),
  error: (msg: string, data?: Record<string, unknown>) =>
    console.error(JSON.stringify({ ts: ts(), level: 'ERROR', msg, ...data })),
};
